---
title: "Zero-Downtime Deployments with Iptables"
description: "A technical walkthrough of achieving zero-downtime deployments using iptables and conntrack for a performance-critical backend."
date: "Apr 6, 2026"
tag: "Infrastructure"
---

A backend that takes time to boot is a backend that causes downtime. In a real-time system, even a few seconds of unavailability can lead to missed packets, failed requests, and a poor user experience.

Our backend used to take about 4 minutes to boot. After some heavy optimizations, we've brought that down to 30 seconds—but 30 seconds is still 30 seconds too long. Initially, we mitigated this by deploying only at night to minimize disturbance. However, that wasn't a sustainable solution. I needed true zero-downtime deployments.

### The Deployment Workflow

Today, our flow is relatively simple. A manually triggered GitHub Action runs tests, builds the project, and creates a release. This release triggers a webhook on our server, which pulls the new image and executes a custom `swap.sh` script.

The script manages two sets of internal ports. We keep track of the currently active set in a `mapped.txt` file. The idea is to map an external port (e.g., 1000) to one of two internal ports (1001 or 1002) depending on which version is currently live.

Here’s how the `swap.sh` script works:

1. **Trigger:** The webhook receives the signal.
2. **Download:** Pull the latest image from the GitHub release.
3. **Symlink:** Update the symlink to point to the new image.
4. **Identify:** Read `mapped.txt` to determine which port set is active.
5. **Provision:** Initialize variables for the new and old ports.
6. **Launch:** Start the new container on the new ports.
7. **Health Check:** Wait for the new instance to pass a health check.
8. **Swap:** Redirect external traffic to the new ports using `iptables`.
9. **Cleanup:** Send a termination signal to the old instance.

### Why Iptables?

When it comes to swapping traffic, I could have used a standard proxy like Nginx or HAProxy. However, for a performance-critical system, every millisecond counts. Adding another hop introduces latency.

Interestingly, Kubernetes used its own proxy for traffic redirection for a long time before switching to `iptables` for better performance. Nowadays, there are even faster options like eBPF and advanced CNIs, but `iptables` remains a solid, battle-tested choice for this scale.

#### The Traffic Swap Commands

To add the new mapping:
```bash
iptables -A PREROUTING -t nat -p udp -m udp --dport ${EXTERNAL_PORTS[0]} -j DNAT --to-destination :${NEW_MAPPING[0]}
```

To delete the old mapping:
```bash
iptables -D PREROUTING -t nat -p udp -m udp --dport ${EXTERNAL_PORTS[0]} -j DNAT --to-destination :${CURRENT_MAPPING[0]}
```

### The "Sticky Connection" Problem: Conntrack

A major hurdle I encountered was that `iptables` only routes *new* connections. Existing connections remain pinned to the old ports because of how NAT works.

Linux uses a system called `conntrack` (connection tracking) to map source tuples to destination tuples. To ensure all traffic immediately moves to the new instance, we must flush the tracking table:

```bash
conntrack -F
```

I discovered this necessity the hard way—by watching packets drop during a swap until I realized the stateful nature of the existing flows.

### Internal Routing and the OUTPUT Chain

Another quirk appeared with our Nginx configuration. Nginx always points to `8080` as its upstream. However, the `PREROUTING` chain doesn't capture packets generated internally on the same machine.

To handle these internally routed packets, you must also apply the rules to the `OUTPUT` chain. Additionally, you need to ensure internal forwarding is enabled:

```bash
sudo sysctl -w net.ipv4.ip_forward=1
```

If things don't work as expected, you can always use `tcpdump` to capture packets or `ss` to check for dropped packets. That’s how I finally figured out the `conntrack` issue—the packets were being dropped.

### Closing Thoughts

Some might consider `iptables` a legacy tool, and I've certainly thought about moving to `nftables`. But as the saying goes: "If it isn't broken, don't fix it." It works exceptionally well for our current needs.

**Why not K8s or Docker Swarm?**
I researched Docker’s native capabilities, but they often default to "stop then start" rather than true blue-green or rolling updates without extra complexity. As for Kubernetes, it’s a massive ecosystem. While I’m currently exploring Helm, operators, and cloud integrations (AWS/GCP), it felt like overkill when I started this project. Sometimes, a well-placed `iptables` rule is all you really need.

---

*Originally published on [eglu.tech](https://eglu.tech/blog/zero-downtime-iptables).*
