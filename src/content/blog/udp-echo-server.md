---
title: "A Low-Level UDP Echo Server for NAT Traversal"
description: "Exploring XDP, iptables, and nftables to build a high-performance UDP echo server in the Linux kernel."
date: "Mar 17, 2026"
tags: ["Networking", "Linux"]
---

A common challenge with UDP-based systems is navigating **NAT (Network Address Translation)**. While IPv6 is designed to
solve this by giving every device a globally reachable address, for now, we still have to contend with NAT's
limitations.

Until a router establishes a NAT mapping, incoming packets cannot be forwarded to a device inside a private subnet. To
make this work, packets must first originate from the *inside*.

I didn't want to get bogged down in the complexities of full NAT traversal, especially for P2P-style communication. Up
until now, I had a simple workaround: client devices sent "junk" UDP packets to the server every 8 seconds to keep the
mapping alive.

Recently, however, some ISPs (especially Jio) started blocking these outbound "heartbeats." Interestingly, we found that
if the server actually *responds* to these packets, the connection remains stable.

But there's a catch: handling these responses in a userspace process adds significant overhead. To solve this
scalability problem, I started looking into tools provided by the Linux kernel.

## The Evolution of the Solution

### 1. iptables

`iptables` is the legacy filtering and processing tool in the Linux kernel. I was already using it to drop certain NAT
packets before they even hit the connection tracking (`conntrack`) system. However, `iptables` is quite limited when it
comes to "reflecting" packets back; it just isn't designed for that level of manipulation.

### 2. eBPF / XDP (eXpress Data Path)

XDP runs directly in the network driver (or even on the NIC hardware), processing packets before the kernel even
allocates an `sk_buff` (socket buffer).

By "reflecting" the packet at the lowest possible layer, we can avoid the entire overhead of the Linux networking stack,
context switching to user-space, and memory copying. I experimented with a small C-based eBPF program that:

- Swaps the Source/Destination MAC addresses.
- Swaps the Source/Destination IPs.
- Returns `XDP_TX` to transmit the packet back out the same interface.

The downside? It's *too* low-level. You have to manually calculate checksums for Ethernet, IP, and UDP headers. I felt a
bit unsafe working at that level for this specific task.

### 3. nftables

`nftables` is the modern alternative to `iptables`. It's safer than XDP because the kernel handles low-level memory
safety, but it's much faster than a user-space process because the packet stays entirely within the kernel.

I found `nftables` much easier to maintain. You can organize your logic into chains and rules within `.nft` script
files. After some research, I determined that the `prerouting` hook at the IP level (before `conntrack`) was the ideal
place for the reflection logic.

## The "Trial and Error" Reality

Documentation for these essential low-level tools is surprisingly sparse. I couldn't find many clear resources, so it
took a lot of trial and error with the scripts until things finally clicked.

One important note: since this is a stateless reflection, certain values (like the source IP to reflect from) currently
need to be hardcoded. While I could maintain a dynamic map, it started to look like what conntrack is doing: maintaining
the source-destination mappings. I was hoping to dynamically extract the source IP from the interface itself, but
haven't found a clean way to do that yet.

## The Implementation

You can find the final `nftables` configuration in this Gist:
[UDP Echo Server via nftables](https://gist.github.com/sku0x20/6d0c93595d949c1c1cac3dd4d2155da6)

## References

- [Netfilter Hooks Diagram](https://people.netfilter.org/pablo/nf-hooks.png)

---

*Originally published on [eglu.tech](https://eglu.tech/blog/udp-echo-server).*
