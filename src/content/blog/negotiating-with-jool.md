---
title: "Negotiating with Jool"
description: "Getting a fixed IPv6-to-IPv4 mapping out of Jool's stateful NAT64 - which doesn't actually support one."
date: "Aug 23, 2026"
tags: ["Networking", "Linux", "Infrastructure"]
---

[Last post](/blog/betting-on-nat64-over-a-proxy) was the plan: `nftables` for IPv4, Jool's EAMT for IPv6 — one v6 address mapped straight to the one v4 backend, no address embedding needed since the VM only ever publishes one known address. Clean on paper. Lasted about as long as it took to type the first command.

The IPv4 half went exactly as planned — DNAT in, masquerade out:

```
iifname $WAN_IF tcp dport 443 dnat to $DEST_IP:443
oifname $WAN_IF ct status dnat tcp dport 443 masquerade to :1024-32767
```

### Why pool6 came into the picture

The plan was `jool -i <instance> eamt add <v6> <v4>` — a one-liner. Except EAM turned out to be a SIIT-only feature.

```
Unexpected token: 'eamt'
Available options: instance stats global pool4 bib session file
```

Jool's own docs backed this up. SIIT has two ways to pick a mapping: EAMT (explicit v4↔v6 pairs) or `pool6`/RFC 6052 embedding as a fallback — SIIT tries EAMT first. Stateful NAT64 is a different thing entirely: NAPT with IPv6 as the "private" side, tracked via dynamic BIB/session tables so many v6 clients can share one v4 identity by port — the part I actually needed, since there's no spare IPv4 to hand out one-per-client. The docs only ever mention EAMT under SIIT, never under stateful NAT64. Not a missing package, not a version thing — SIIT gets fixed 1:1 mapping, stateful NAT64 gets NAPT + `pool6`, and "fixed mapping with NAPT" just isn't a combination either mode offers.

The fallback is `pool6` embedding: any address in a `/96` gets its low 32 bits read as an embedded IPv4 destination. That's how the backend's address ends up encoded in the range at all — not a design choice, the only mechanism stateful NAT64 actually offers.

### Where the IPv6 nftables rules come from

`pool6` being a whole `/96` is the problem: it makes every address in that range a valid destination, which turns the box into a general-purpose NAT64 relay to anywhere — not what I wanted.

- A **guard** rule, sitting in front of Jool, that drops anything addressed into `pool6`.
- A **rewrite** pair, because the address that has to survive the guard (the box's real published address) isn't the same as the address Jool needs to see (the `pool6`-embedded one) — so something has to translate between them, in both directions, before Jool ever gets involved.

### A brief detour into eBPF

At this point I had a small breakdown and started typing out the problem from scratch, no Jool: v6 to v4, no userspace, `nftables` can't cross address families, so what's actually left — write the translation in eBPF myself?

Working through why Jool felt wrong here is what talked me out of it. Jool isn't built to be a termination point for one route — it's built to run at the edge of a network that's gone IPv6-only internally, translating for arbitrary internal traffic headed arbitrarily outward. That's the ISP or datacenter picture: SIIT and NAPT/NAT64 aren't "proxy modes," they're what you run at that boundary. SIIT's "stateless" doesn't mean connectionless — it means a static 1:1 mapping, one v6 address always resolves to one v4 address, no session tracking needed because the mapping never changes. NAPT is the other end of that: ordinary NAT behavior, many v6 hosts sharing one v4 identity via ports. Neither RFC, and neither of Jool's modes, was written with "one relay, one fixed backend" in mind — that's a narrower shape than either was designed to solve, which is exactly the shape of every problem I kept hitting.

Writing it in eBPF wouldn't have removed that mismatch, though — it would've meant reimplementing everything Jool already does correctly (RFC 7915 header translation, checksum recomputation, ICMP mapping, session state) just to bolt the same one-destination restriction on top by hand regardless. The restriction was always going to be extra scaffolding sitting in front of whatever did the translation.

### The bugs were all silent

Back to Jool, then, with nftables slapped in front of it.

Every failure past this point had the same shape — no error, no log line, just a connection that hangs. Three of them, stacked:

1. **`nat`-type chains have a hard floor.** `type nat hook prerouting priority -350` — rejected outright, nat chains can't go below `-200`. Had to pull Jool's actual hook priority from source to find a number that satisfied the kernel and still ran ahead of it:

   ```c
   // src/mod/common/xlator.c, NICMx/Jool
   { .hook = hook_ipv6, .pf = PF_INET6, .hooknum = NF_INET_PRE_ROUTING,
     .priority = NF_IP6_PRI_NAT_DST + 25 },
   ```

   `-100 + 25 = -75`. Not a guess after that.

2. **IPv6 needs brackets.** `dnat to $ADDR:443` with an unbracketed v6 address doesn't read as "address, port" — colons are already the v6 separator, so `nft` parsed the whole thing as one raw 8-hextet address, quietly landing outside the `pool6` range entirely. `[$ADDR]:443` fixed it, and that fix is what got the first v4 SYN actually reaching the backend. What turned out not to matter was the statement it was attached to — `dnat` itself got dropped a bug later, once nat-type chains left the picture entirely.

3. **`nat` is conntrack-based, and Jool's replies never touch conntrack.** Jool sends translated packets out via `dst_output()`, which skips the hook where a normal connection would get tracked. My `snat` rule had no tracked connection to attach the translation to, so it silently did nothing — every reply left with the internal, never-meant-to-be-public address as its source. Switched to a plain `ip6 saddr set $ADDR` in a `filter`-type chain instead: unconditional, no conntrack required.

### And then curl broke on the box itself

IPv6 was working. Then `curl -4` from the VM itself started hanging, and nothing in the `nftables` ruleset explained it — because `nftables` wasn't the problem.

A Jool netfilter instance registers two hooks, not one: v6 and v4, both on prerouting. The v4 hook exists to catch NAT64 return traffic, and it runs on every incoming v4 packet unconditionally, checking only its own session table — no awareness of the kernel's socket layer at all. The box's ephemeral port range still overlapped the band reserved for Jool's outbound NAT (the non-overlapping ranges from the plan, just not applied yet), so a reply to my own local `curl` landed in Jool's hook first, matched no session, and vanished. Fixed with one sysctl — `ip_local_port_range=1024 32767` to move local traffic out of Jool's `32768-65535`.

### Where it landed

Two independent relays sitting side by side on one box, sharing a destination and the disjoint port ranges from the plan — so none of the three consumers (real listening services, host + masquerade, Jool's NAPT) can ever collide. An extra nftables table standing in for a feature that didn't exist. Deliberately not a general NAT64 relay — no open `pool6`, no arbitrary destinations, just the one route I actually needed, built the long way around.

on GitHub: [sku0x20/nistaran](https://github.com/sku0x20/nistaran).

---

**Sources**

- [NICMx/Jool source](https://github.com/NICMx/Jool) — hook priorities, `pool4`/`pool6` CLI behavior
- [Introduction to SIIT and Stateful NAT64](https://www.jool.mx/en/intro-xlat.html) — Jool docs
- [`jool pool4 add` flags](https://www.jool.mx/en/usr-flags-pool4.html) — Jool docs
