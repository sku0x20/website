---
title: "The Ghost Connection II: The Poisoned Pool"
description: "Right after fixing the infamous conntrack -F bug, deployments started throwing 408s and 503s. Here is how conntrack took the fall for a desynchronized Redis buffer and a poisoned connection pool."
date: "Sep 4, 2026"
tags: ["Redis", "Networking", "Infrastructure", "Java"]
---

In [The Ghost Connection](/blog/ghost-connection-redis-pubsub), I thought I had finally put our post-deployment Redis outages to rest. The culprit had seemed obvious: our traffic-swap script ran `conntrack -F`, wiping the entire connection-tracking table and silently severing idle Redis pub/sub connections.

The fix was supposed to be simple: stop flushing everything with `-F` and selectively delete only the swapped ports.

I made the change and deployed it. The traffic swapped. New incoming connections were accepted. And then things got much worse.

## The Meltdown

Almost immediately after the swap, Nginx logs lit up with `408 Request Timeout` and `503 Service Unavailable`. In the backend, calls to Redis were failing with corrupted data and invalid value exceptions.

I rushed to Grafana to check our Loki logs and see what was exploding—and Loki refused to load anything. 

That single failed query warped my entire perception of the incident. If Redis calls were failing *and* Grafana couldn't fetch logs from Loki, there was only one conclusion: **all outbound connections from the box were broken**. 

And what had I just changed in the deployment script? Conntrack. 

I became completely convinced that my new conntrack command had corrupted the kernel's outbound tracking tables.

## The Panic and the Emergency Fallback

I checked whether selective deletion had caused connection table exhaustion:
```bash
sysctl net.netfilter.nf_conntrack_count net.netfilter.nf_conntrack_max
```
Only ~8,000 entries out of a 100,000+ limit. Not even close.

With requests dropping and no visibility, everything was falling apart. In pure desperation, I reverted to our old blunt hammer: flushed the entire conntrack table (`conntrack -F`) and restarted the process.

Honestly, at that point, I was crying. Nothing made sense, every assumption was crumbling, and I found myself asking why FL wasn't here. Being alone during a live production outage while the floor collapses beneath you is a special kind of hell.

Flushing conntrack and bouncing the process temporarily brought the system back up, which felt like confirmation: *See? Flushing conntrack fixed it! Conntrack must be the culprit!*

Except it was completely wrong. 

When I dug into the Loki logs after the dust settled, the reason Grafana had failed had nothing to do with networking. The sheer volume of crash stacktraces had blown past Loki's maximum gRPC message size:

```text
read-1 | level=error caller=scheduler_processor.go:254 msg="error notifying frontend about finished query" err="rpc error: code = ResourceExhausted desc = grpc: received message larger than max (5897077 vs. 4194304)"
```

Loki hadn't lost connectivity; it was choking on a 5.8 MB response payload. And when I tested selective conntrack deletion manually against the backend TCP tuple:
```bash
conntrack -D -p tcp --orig-port-dst 8080
```
It deleted the entry cleanly, traffic moved, and the process didn't drop a single packet. 

Outbound networking was completely fine. We had been chasing a ghost.

## The Realization: Sockets vs. Streams

If TCP had broken at the network layer, sockets would have died loudly: RST packets, broken pipes, or connection refused errors.

Instead, the backend was throwing application-level absurdities:
- Jedis throwing `ClassCastException` (e.g., `Long cannot be cast to byte[]`).
- Application code throwing `IndexOutOfBoundsException` when trying to slice mangled string payloads returned from Redis.
- Stalled requests causing Nginx to give up (408/503), leaving the backend holding a `ClientAbortException`.

This wasn't a broken socket. It was a **desynchronized protocol stream**.

## How the Pool Got Poisoned

In the previous post, I had introduced a watchdog heartbeat: if pub/sub events stopped arriving, force-restart the Spring listener container to reconnect.

That recovery mechanism turned out to be the trigger for a horrifying 25-minute live incident:

```text
13:16:43 — Heartbeat missed, container restarted
13:19:46 — Heartbeat missed, container restarted
13:21:50 — Heartbeat missed, container restarted
13:24:01 — Heartbeat missed, container restarted
...
13:35:00 — Heartbeat missed
[13:39:31 — Fresh process restart]
```

At 13:16, the first heartbeat was missed. Two minutes later, core features like storing device hub IPs started crashing on corrupted Redis data. 

Here is the chain reaction that unfolded:

1. **Missed Heartbeat:** The watchdog missed an expected heartbeat and called `container.stop()`.
2. **Returned to the Pool:** Crucially, Spring's message listener container didn't destroy the raw TCP socket on close—it returned the connection back to the shared Jedis connection pool.
3. **The In-Flight Message:** An in-flight pub/sub message arrived right around the shutdown boundary. With no listener active, the unread bytes sat inside the socket's read buffer. The connection was now a poisoned landmine in the shared pool.
4. **Stream Desync:** Another worker thread borrowed this "clean" connection to run a standard command (like `GET`). It sent its query, but Jedis read the stale message bytes sitting in the buffer instead of its own response.
5. **The Infection Loop:** When the watchdog called `container.start()` to resubscribe, it borrowed a connection from that same pool and choked:
   ```text
   ERROR 13:24:11.183 : Unexpected error occurred in scheduled task
   java.lang.IllegalStateException: Subscription registration timeout exceeded.
   ```
6. Because registration failed, the next heartbeat never arrived, triggering another restart and poisoning yet another connection on a predictable 1-to-2 minute loop.

```
1. Heartbeat misses  ───>  container.stop()
                                    │
2. Socket returned to SHARED pool   │ (raw TCP connection kept alive)
                                    ▼
3. In-flight push arrives:                  [ Stale Message Bytes ]
                                            (Bytes sit unread in buffer)
                                    │
4. Connection is POISONED ◄─────────┘
                                    │
5. Worker thread borrows it:
      Thread: [ Send GET key ]
      Socket: [ Reads leftover message bytes! ]
                                    │
                                    ▼
      💥 ClassCastException, IndexOutOfBoundsException, and 408/503 timeouts
```

The watchdog added to fix the ghost connection had turned into a scheduled infection engine.

## The Remedies

To stop the cascading failure, I made fixes at both the connection pool and deployment levels:

### 1. `testOnBorrow = true`
Enabling validation on borrow ensures Jedis pings each connection before lending it to a worker:

```kotlin
val poolConfig = GenericObjectPoolConfig<Any>()
poolConfig.testOnBorrow = true
```

If the buffer has unread bytes or the connection is desynchronized, validation fails immediately. The poisoned socket is destroyed, and a fresh connection is allocated.

### 2. Verbose Watchdog Telemetry
Rather than blindly restarting the container, the watchdog now carries full telemetry:
- Publishes a self-ping every minute carrying an incrementing sequence number and timestamp, logging round-trip latency.
- If a heartbeat is missed, it captures a Redis `CLIENT LIST` snapshot before touching the container, logging connection states and idle times at the exact moment of failure.
- Container `.stop()` and `.start()` calls are timed and guarded in strict try-catches.

### 3. Surgical Conntrack Deletion
Instead of broad port deletions, our deployment swap now matches both the external destination port and the retiring instance's reply port:

```bash
conntrack -D -p tcp --orig-port-dst 8080 --reply-port-src $OLD_PROCESS_PORT
```

This severs only the flows belonging to the old process without touching active traffic.

## Looking Back

During a 25-minute production outage, existential questions always creep in: *Should we ditch hand-rolled deployment scripts altogether? Should we re-architect everything to be completely stateless?*

Those are valid long-term goals, but they wouldn't have explained what happened here. When you run custom blue-green deployments with iptables, confirmation bias is ruthless. When Loki failed at the exact same moment as Redis, it was easy to blame conntrack for breaking the world.

In reality, two independent things broke at once: Loki hit a query payload limit, and Redis suffered a protocol-level buffer desynchronization.

With `testOnBorrow` active, watchdog snapshots enabled, and surgical conntrack matching in place, the next deployment went through without a hitch. 

Sometimes the ghost in your system isn't in the kernel tables at all—it's waiting in an unread socket buffer.
