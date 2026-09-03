---
title: "Hunting for a UDP Load Balancer"
description: 'Going looking for a managed L4 load balancer that speaks UDP, coming away empty-handed from GCP, Cloudflare, and everyone else, and ending up less sure what "load balancer" even means.'
date: "Aug 19, 2026"
tags: ["Networking", "Cloud"]
---

Our infra is bad. Not "we'll get to it next sprint" bad — full legacy energy, despite being all of ten years old. Part of the charm: our VPC isn't dual-stack, and some routers, after a restart, decide IPv4 just isn't for them anymore and come back IPv6-only. This is happening on Airtel, of all places. And honestly? I'm a little impressed. I did not expect India's networks to be this far ahead on IPv6 — truly, we love a plot twist.

Explaining this to users, though? Now that's where the real fun begins. It only hits a small slice of them, and that slice splits into two annoying camps. Explain the IPv4/IPv6 situation to the non-technical ones and they just go "yeah, but YouTube works, Insta works" and move on — they don't care. The technical ones are worse: they actually understand it, and then judge us for it. What kind of tech startup doesn't have IPv6 support when the rest of the world's already there?

Fine, I thought. Let's slap a load balancer in front of this and call it a day. Ha. Cute. I wish it were that simple. GCP's global load balancer doesn't do L4 routing — no UDP, no raw TCP passthrough — which feels like a fairly basic ask for a load balancer, but sure, who am I to question Google's product decisions. The regional ones do support TCP and UDP, except they're passthrough-only, meaning they don't terminate the connection, meaning they can't bridge an IPv6 client to an IPv4 backend — which, again, is the entire reason I'm here.

Then I found hope: Cloudflare Spectrum. It looked genuinely great — TCP, UDP, SSH, Minecraft, the whole buffet. I thought, finally, a single-click fix, my suffering ends here. Turns out custom TCP/UDP support is Enterprise-plan only, and even then it's a paid add-on on top of Enterprise. Like, come on. Just let me pay you normally.

At that point I figured surely some smaller player does this well — I really didn't want to stand up a VPC, spin up a VM, and hand-roll the packet forwarding myself, that's too much infra to babysit for what should be a solved problem. But no. Turns out basically nobody does UDP load balancing. Vultr doesn't support UDP, full stop. Akamai, via Linode's NodeBalancers, does have UDP — in beta, API-only, premium-tier-only, so basically three asterisks deep. Cool cool cool, very normal amount of asterisks.

So, running my own VM it is. Since that's happening no matter what, I'm at least shopping around for the least miserable version of it. DigitalOcean droplets, a Vultr VM, AWS Lightsail — which kindly hides the VPC from me like a considerate friend — and an Akamai/Linode VM are all in the running, mainly because I am, at this point, allergic to VPCs.

Still need to actually do the research instead of vibing my way to a decision. What I want: decent Terraform/OpenTofu support, and cheap. I'll mostly be running out of Mumbai, where everyone's converged on roughly the same ~$5/month, because apparently that's the going rate for my problems. We'll see who wins.

What actually runs inside that VM — haproxy, nginx, or something lower-level and more likely to ruin my week — is a problem for future me. Next post, probably. No promises, I've made poorer ones before.

Also — yes, I know, passthrough is actually fine, and what I want isn't strictly a "load balancer." But at this point I genuinely don't know what that word means anymore. Some terminate, some pass through. Some are global, some regional. Some speak one protocol, some speak three. Some insist the backend live in the same VPC, some are happy to forward anywhere. It's less a product category and more a vibe. So, `¯\_(ツ)_/¯`.

---

**Sources**

- [Global external passthrough Network Load Balancer overview](https://docs.cloud.google.com/load-balancing/docs/network/global-networklb-architecture) — Google Cloud
- [Passthrough Network Load Balancer overview](https://docs.cloud.google.com/load-balancing/docs/passthrough-network-load-balancer) — Google Cloud
- [Cloudflare Spectrum docs](https://developers.cloudflare.com/spectrum/)
- [What protocols do Vultr Load Balancers support?](https://docs.vultr.com/support/products/load-balancer/what-protocols-do-vultr-load-balancers-support)
- [NodeBalancers UDP support (BETA)](https://techdocs.akamai.com/linode-api/changelog/nodebalancers-udp-support) — Akamai/Linode changelog
