---
title: "The Ghost Connection: How conntrack -F Broke Redis Pub/Sub"
description: "A four-year debugging saga into why Redis pub/sub silently stopped working after every deployment — and how a flushed conntrack table was the real culprit."
date: "Aug 13, 2026"
tags: ["Redis", "Networking", "Infrastructure"]
---

After four years, I finally found out why Redis pub/sub stops working after every deployment.

## The Symptom

Users started complaining that devices weren't going offline. It was a "once in a blue moon" kind of issue, so I assumed it was Redis — keys not expiring properly. Redis has known sampling issues, and expiry can be unreliable at the margins; I'd even written [a paper about it](https://doi.org/10.5281/zenodo.21717242).

## First Fixes, Same Problem

Around the same time, I upgraded Redis and switched from using Jedis directly to Spring's message container indirection, as part of an ongoing effort to refactor legacy code. The issue became more consistent after that — I can't say for certain which change did it, maybe both did. After every deployment, pub/sub would work for a while, then quietly stop.

As an immediate fix, I added code that would stop and restart the Spring message container after six minutes. Deployments took a hardcoded four minutes back then (now it's dynamic based on health checks, usually around 30 seconds). It was a bad hack, but it worked.

## Why I Stopped Looking

The bug only showed up in production — never in pre-prod. The biggest difference between the two environments was that pre-prod ran via Docker, and prod ran a fat JAR.

I'd seen cases where Spring Boot's classloader got bean ordering wrong and threw `NoSuchBeanDefinitionException`, even when the same code worked fine elsewhere. That, plus the unusually long boot time, was enough to make me suspect classloading and move on.

Slowly, I refactored the deployment. I moved away from the fat JAR: a build now ships as a zip, which gets unzipped and then run with `java -jar`, letting the JVM load the other jars straight off the manifest classpath. The fat JAR, by contrast, unzips itself at runtime and loads its nested jars through Spring Boot's own classloader — that's the indirection I was trying to get rid of.

## A Refactor Surfaces the Old Hack

The six-minute restart hack stayed in the code and kept working — until, refactoring the Redis code for consistency last week, I noticed it sitting there. Assuming it was a leftover classloading workaround, I removed it. I was suspicious, but I let it go.

## The Ghost Connection

With the hack gone, the symptom came right back. I checked the backend logs: the app received expiry events, then just stopped — silently. No exceptions. Redis's logs were empty too. No clue there either.

I checked Redis's client connection list, and the pub/sub connection (Redis drivers use a separate connection for pub/sub) was missing. I considered whether it had been dropped over buffer issues — Redis maintains an outgoing buffer per client and drops clients that don't drain it fast enough — but Redis had never actually dropped it for buffer fill-up.

The real clue was the *absence* of exceptions. If the TCP connection had dropped, Jedis and Spring would reconnect automatically, and I'd see it in the logs. From the process's point of view, the connection was still alive. It was a **ghost connection**.

TCP is connection-oriented, but whether a connection is actually alive is only known when you try to send a packet over it. Pub/sub connections are long-lived and mostly idle — a subscriber only receives, it never writes — so the client has no way to detect a broken connection unless it's explicitly probing. TCP keepalive could do that, but Spring and most client libraries typically don't expose a way to tune the interval — it's left to the OS default, usually a couple of hours, far too long to be useful here.

So from Redis's point of view, the connection was gone and got cleaned up. From the client's point of view, nothing ever told it the connection was dead.

As an immediate fix, I added a heartbeat: every minute, check whether expiry events are still coming through. The logs confirmed it — the heartbeat would find the broken connection and force a reconnect. But *why* the connection kept going dark in the first place was still a mystery.

## Root Cause: conntrack -F

I suspected the deployment's traffic-swap script. The deployment flow is: boot the new instance, wait for it to be healthy, switch traffic over via iptables, then terminate the old instance. `iptables` and `conntrack` handle the actual traffic switch — I wrote about the mechanics of that swap in [Zero-Downtime Deployments with Iptables](/blog/zero-downtime-iptables).

I gave the swap script to Claude, and it flagged the same thing I'd suspected: `conntrack -F` flushes *all* connection-tracking entries system-wide, not just the ones for the port being swapped. Every deployment was silently killing every tracked connection on the box — pub/sub included.

The fix was to scope the flush to only the ports actually being swapped.

![What conntrack -F did to the pub/sub connection](/assets/ghost-connection-timeline.svg)

## Why GET/SET Kept Working

One loose end: if the connection was being torn down, why did regular Redis commands keep working through every deployment? Because Jedis, via Spring, uses a **separate connection for pub/sub** from the one used for regular commands like GET and SET. Only the pub/sub connection was ever left in this ghost state — the command connection just reconnected on the next request, same as any other TCP client.
