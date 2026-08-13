---
title: "WHAT is Ratelimiting??"
description: "Deciphering rate limiting without using the word rate limit."
date: "Jun 15, 2026"
tags: ["Systems", "Networking"]
---

Rate-limiting, just like other buzzwords. The tech industry picks up words, throws them around, and somewhere the original meaning gets lost.

I do feel rate-limit has multiple meanings inherently. But the docs and references that use it rarely make it evident which one they mean.

So I'll try to break it down today, without using the word rate-limit. Mostly.

There are 2 things:

1. Flow Control
2. Quota Control

## Flow Control

Flow control goes back to the 80s when networking was starting out. People wrote theses and papers on managing the flow of packets. How a router should behave, what its queue size should be, when to drop. It evolved into the field of [network calculus](https://en.wikipedia.org/wiki/Network_calculus). That's a whole rabbit hole. Let's focus on what's relevant.

Flow control means controlling the flow. Packets, requests, whatever. Deciding when to accept, when to drop, and how to handle bursts.

Let's think in terms of requests.

Take an example: 5 req/s with a burst of 10. What does that mean?

Before we can answer that, let's understand the standard algorithm used for flow control: the Token Bucket.

The idea is simple. There's a bucket with tokens, and tokens are added at a fixed rate. For 5 req/s, that's 5 tokens per second.
When a request arrives, it takes a token out of the bucket. Now we got 4 tokens left, 4 more requests can be accepted. No tokens? Request is dropped.

The token bucket is continuous, so it provides spacing by default.
Filling at 5 req/s means one token every 1000/5 = 200ms.
Once the burst is exhausted, requests have to be 200ms apart.

What about burst?

Burst serves 2 purposes: the initial number of tokens the bucket starts with, and the cap.

With r = 5 req/s and b = 10, it accepts a burst of 10 requests up front.

If we don't cap the max tokens, they grow to infinity. A device could wait 10s, build up 5 × 10 = 50 tokens, then fire 50 requests at once. That blows the limit entirely.

So we cap the max tokens, and that cap is the burst directly.
If burst = 0, nothing works. Has to be at least `1` to achieve 5 req/s with no burst.
Most implementations handle this with `max(1, burst)`.

So: 5 req/s, b = 10. 10 requests burst immediately, then 200ms apart. Or wait, fill up, burst again.

Token Bucket has been formalized in multiple RFCs and used across older protocols.

You might also see the Leaky Bucket (counter). Just a mirror image of the same algorithm.
Same capacity = burst, but instead of removing a token, you add to a counter. Exceed capacity, reject.

```
# Token Bucket
now          = current_time()
tokens       = min(b, tokens + r × (now - last_updated))
last_updated = now

if tokens >= 1:
    tokens -= 1
    accept
else:
    reject
```

```
# Leaky Bucket (counter)
now          = current_time()
counter      = max(0, counter - r × (now - last_updated))
last_updated = now

if counter < b:
    counter += 1
    accept
else:
    reject
```

Leaky Bucket also has a queue implementation. Requires memory to buffer requests, used to streamline otherwise chaotic flow.
Even if requests come within 1ms of each other, the downstream sees a steady 5 req/s. Requests queue up, a bg job drains them at the fixed rate.
I don't like it unless it's required. Extra memory, extra complexity.

## Quota Control

When a cloud provider says 10 req/min, 10 downloads/day, or 10 logins/10min, what they're enforcing is a quota. They don't care about flow control. And TB can't properly enforce these limits.

With TB at 5 req/s and b = 10, I can send 10 requests in the first 10ms, wait 200ms, and send more. It can't enforce a hard quota. It's not built for that.

For quotas, you need a window. Windows are discrete, not continuous.

![Token Bucket vs Fixed Window](/assets/rate-limiting-comparison.svg)

Hard to go further without a concrete impl. Let's take the basic fixed window:

```
# Fixed Window (Redis)
now   = current_time()
key   = "rl:{user}:{floor(now / 60)}"   # new key every minute

count = INCR key
if count == 1: EXPIRE key 60            # TTL = window size

if count > limit: REJECT
```

So when I say 10 logins/min, all 10 attempts can happen in the first 10 seconds. No flow control. But within that minute, only 10 are allowed. That's the quota.

It's a staircase. The counter climbs, hits the limit, resets at the window boundary.

Fixed window means waiting until the next window to retry. Simple to implement, easy to distribute.

There's a known edge case though. At the window boundary, someone could send 10 requests in the last second of minute 1 and 10 more in the first second of minute 2. 20 requests in ~2 seconds, double the quota. That's the boundary burst problem.

Rolling windows, or more precisely the sliding window log, solve it by tracking exact timestamps of every request. Perfectly accurate, no boundary burst, but O(n) memory per user. Doesn't scale well.

Cloudflare tried solving the scale problem with a sliding window counter. Two fixed window counters plus weighted math. O(1) memory, not exact, but close enough. [How we built rate limiting capable of scaling to millions of domains](https://blog.cloudflare.com/counting-things-a-lot-of-different-things/).

Can rolling windows replace TB entirely? No. Even the sliding window log still lets you fire all 10 requests in the first millisecond. No spacing. They're all `count-based`. How many in this period? TB is `rate-based`. How long since the last one? The token drip rate enforces the gap. No window algorithm can do that. Different job.

In-process TB impls are continuous because tokens are calculated lazily. What if we ran a bg job to refill them instead, say once per second? TB becomes a fixed window. Continuity is lost, spacing too. The more continuous the refill, the better the spacing. In routers and hardware, TB fills at every clock cycle. Still a staircase, but so fast it's practically a line.

TB is easy in-process but hard to distribute. It requires shared, continuously-updated state. Tokens and last_updated need to be in sync across nodes. Fixed Window is easy there, a single atomic INCR in Redis is enough.

Nginx, HAProxy, and most proxies use TB for traffic shaping. Cloud APIs (AWS, Stripe, Twilio) use windows for quota. But underneath, they're running TB too for flow control. Two layers, two purposes.

Use flow control to stop your services from blowing up under heavy load.
Use quota to enforce limits. Usually business requirements, directly or indirectly. OTP attempts, download caps, login throttling.

## tldr;

Decide what you want: flow control or quota.
- Token Bucket → flow control, which IMO fits the definition of rate limit more cleanly.
- Window → quota control.

## References

- [RFC 1363 — A Proposed Flow Specification](https://datatracker.ietf.org/doc/html/rfc1363)
- [RFC 2475 — An Architecture for Differentiated Services](https://www.rfc-editor.org/rfc/rfc2475)
- [RFC 2697 — A Single Rate Three Color Marker](https://www.rfc-editor.org/rfc/rfc2697)
- [RFC 2698 — A Two Rate Three Color Marker](https://www.rfc-editor.org/rfc/rfc2698)
- [GCRA — Generic Cell Rate Algorithm (ATM)](https://en.wikipedia.org/wiki/Generic_cell_rate_algorithm)
- [Network Calculus — A Theory of Deterministic Queuing Systems](https://leboudec.github.io/netcal/latex/netCalBook.pdf)

---

*Originally published on [eglu.tech](https://eglu.tech/blog/what-is-ratelimiting).*
