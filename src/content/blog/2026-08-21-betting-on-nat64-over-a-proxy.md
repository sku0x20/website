---
title: "Betting on NAT64 Over a Proxy"
description: "A $5 shared vCPU, and a backend that only speaks IPv4 while a chunk of my users apparently don't."
date: "Aug 21, 2026"
tags: ["Networking", "Infrastructure", "Cloud"]
---

Went with Vultr, Mumbai, [last post](/blog/shopping-for-a-vm) — what actually runs on it is a separate decision, and almost none of it survived contact with the real tools once I started building.

The ask, restated: one VM, reachable over both IPv4 and IPv6, relaying to a backend that lives on a completely separate network. One backend — no fleet, no load balancing, no "which backend" decision to make or remember. The original plan was Cloudflare Spectrum, [covered two posts back](/blog/hunting-for-a-udp-load-balancer): Enterprise-only, sold as an add-on, not disclosed on the pricing page. Hence the VM.

### Proxy or kernel

First real decision, and the one everything else depends on: nginx or haproxy on the VM, or something lower-level. Get this wrong on a $5 shared vCPU and the failure mode isn't graceful — it's CPU credits draining until the instance throttles itself, with nothing left to debug but a box that's slow for reasons that don't show up in any log.

A userspace proxy terminates the client's connection and opens a second, separate one to the backend — two sockets, two buffers, a userspace copy per packet, a context switch on top. Sustained proxying is close to the worst-case pattern for a burstable instance.

Kernel-level forwarding skips both sockets — a table lookup and a header rewrite per packet, no buffers, no userspace round-trip. A conntrack entry costs a few hundred bytes; a proxy's socket buffers cost low kilobytes each, times two. That difference is the whole reason a $5 box can plausibly survive this.

### The toolchain

For IPv4-to-IPv4: `nftables`, over legacy `iptables` (atomic rule application, cleaner syntax) and over IPVS (built for load-balancing across backends — irrelevant with exactly one).

For IPv6-to-IPv4: `nftables` can't do this at all — it only translates within a family. That's protocol translation, RFC 7915 territory, which meant a NAT64 implementation. Picked Jool over Tayga: Tayga is userspace, routes through a TUN device (kernel↔userspace crossing on every packet, the exact overhead just ruled out above), and is stateless by design — meaning a full IPv4 pool instead of sharing the one address I have. Jool is also still actively maintained; Tayga effectively isn't.

Stateless NAT64 (SIIT) needs a 1:1 IPv6-to-IPv4 mapping, no address sharing — not viable with one public IPv4. Stateful NAT64 lets many IPv6 clients share that one address by multiplexing on source port, the same principle as any home router's NAT. That does mean a session table — state — but every commercial NAT/LB device keeps one internally too; it's not overhead being avoided so much as overhead everyone already pays.

The plan for the actual v6-to-v4 mapping was Jool's EAMT — Explicit Address Mapping Table, a direct fixed pairing: this one IPv6 address means this one IPv4 backend. `jool -i <instance> eamt add <v6> <v4>`. Closest thing to the DNAT rule already planned for the v4 side, and since the VM publishes one known address rather than a whole prefix, embedding felt unnecessary — didn't work as expected, more on that next post.

One more thing flagged early: since both Jool and nftables would independently hand out source ports on the same VM IPv4 toward the same backend, they needed non-overlapping ranges up front, or replies would eventually land in the wrong place. Static ranges, configured once, no runtime coordination.

### Sizing

Guessing wrong here means the whole kernel-vs-proxy argument was moot — if the traffic profile actually needed more than one shared vCPU could give, none of this matters and I'm back to renting something bigger. So: TCP sessions run long, roughly 10 minutes average — setup cost amortizes, steady-state forwarding is flat cost regardless of length. UDP is the noisier case: low-rate constant traffic, worst case around 5 packets/sec per source, maybe ten sources per IP. Kernel forwarding capacity is normally counted in the tens of thousands of packets/sec per core even with double translation overhead — this workload isn't close. Looks like the usual burstable-vCPU risk (fine for bursty, bad for sustained) doesn't apply here.

### What didn't make the cut

IPVS/keepalived and Google Seesaw solve multi-backend failover, which doesn't exist here.
PROXY protocol tags the backend-side connection with the real client IP, but doesn't touch the actual connection-count problem — still two sockets per flow, just with better headers.

And then there's the commercial ADC tier, which I looked at mostly out of curiosity about what this "should" cost. F5 BIG-IP: hardware appliances from $15K into the $200K+ range, or a virtual edition starting in the low thousands per year before add-on modules. HAProxy Enterprise: $995-$4,995 per instance per year for what is, underneath, still the userspace proxy already ruled out above. Kemp LoadMaster $2,000-$10,000 depending on tier. All of it priced for someone routing real production load across a fleet, not one VM relaying to one backend.

### The name

Settled on Nistaran for the repo — निस्तारण, Sanskrit for crossing over, deliverance. All this endeavor for moving a packet across an address family it can't natively cross, and it's also what the project is: the way out after Spectrum's paywall closed the easy path.

Plan in hand, weekend still mostly ahead of me. Next post is actually building it.
