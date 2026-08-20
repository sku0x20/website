---
title: "Shopping for a VM"
description: "Continuing the UDP load balancer saga by shopping for a VM"
date: "Aug 20, 2026"
tags: ["Cloud", "Infrastructure", "VM"]
---

Last time, I said everyone in Mumbai had converged on roughly the same ~$5/month. Hmm, let's actually validate that.

Shortlist: DigitalOcean, Vultr, Linode. You'll notice AWS Lightsail isn't on it, despite technically being in the running last post. I've already got things running on AWS, and AWS has been quietly cosplaying as legacy GCP for a while now — I don't need a second place to break my head over IAM policies and mystery quotas. And it's not like they're doing me a favor by existing. So, cut.

Now, time to find something that actually works for me. First problem: figuring out what any of this really costs is a minefield of astricks. Some providers bill storage separately, some bundle it in, egress rates differ, and there's always a regional markup lurking somewhere nobody bothered to write down. I thought it'd just be a problem with one of the big three. Apparently not. It's astricks everywhere.

And the annoying part is, even after digging through all that, I still wasn't satisfied — so I had Claude go dig up the real numbers for me. Should be simple. Except half these providers 403 anything that isn't a browser. Vultr, looking at you. Wild move for companies that won't shut up about being "AI-ready," then block the first AI agent that actually tries to read their pricing page. Straight discrimination, honestly — no docs, no pricing page, just raw JSON off an endpoint if you're lucky, missing every bit of styling and context a human gets for free.

So I scolded Claude into digging further, and it turns out `DO's $6/mo tier is "Regular": first-gen-or-older Xeon/EPYC, plain SSD, no NVMe. No upgrade path off that at the 1GB tier either — Premium only shows up once you're paying for a bigger box.` I don't fully know what all of that buys me in practice, but I know I don't want the version without it. Full picture, cheapest first:

| Provider        | Plan             | Specs                                     | Hardware                               | Price | India regions            |
| --------------- | ---------------- | ----------------------------------------- | -------------------------------------- | ----- | ------------------------ |
| Vultr           | Cloud Compute    | 1GB / 1 shared vCPU / 25GB                | prev-gen Intel, regular SSD            | $5/mo | Bangalore, Mumbai, Delhi |
| Linode (Akamai) | Nanode 1GB       | 1GB / 1 shared vCPU / 25GB                | NVMe (third-party sourced)             | $5/mo | Mumbai, Bengaluru        |
| DigitalOcean    | Basic Droplet    | 1GB / 1 shared vCPU / 25GB                | old Xeon/EPYC, plain SSD, no NVMe path | $6/mo | Bengaluru only           |
| Vultr           | High Frequency   | 1GB / 1 shared vCPU / 32GB                | current-gen, NVMe                      | $6/mo | Bangalore, Mumbai, Delhi |
| Vultr           | High Performance | 1GB / 1 shared vCPU / 25GB, 2TB bandwidth | current-gen, NVMe                      | $6/mo | Bangalore, Mumbai, Delhi |

So: the ~$5 figure held up fine — Vultr and Linode both land there in Mumbai. DigitalOcean's the one that's out of the picture entirely: priciest, most region-locked, and stuck on last-gen hardware even at $6/mo. Between Linode and Vultr it's close: Linode's NVMe claim is third-party-sourced, Vultr's is confirmed straight from their own API.

Btw, somewhere in here the container idea showed up, but not the way you'd think — it wasn't "VM vs. managed container," it was "I have another service that needs a home." I run a little country-lookup thing that's currently sitting on Render, and Render has been comically unreliable lately. Not even properly down, just flaky enough that whenever literally anything breaks, the app teams' reflex is "ohh, country finder's probably down" — even though it hasn't actually gone down in months. It's just the designated scapegoat now. So since I'm already standing up a VM for the load balancer, may as well run that container on it too and let Render's reputation recover on its own time.

Next up: actually picking one of these and spinning it up, then — for real this time — whatever runs inside it: haproxy, nginx, or something dumber.

---

**Sources**

- [Droplet Pricing](https://www.digitalocean.com/pricing/droplets) — DigitalOcean
- [Choosing the Right CPU Droplet Plan](https://docs.digitalocean.com/products/droplets/concepts/choosing-a-plan/) — DigitalOcean, confirms Basic Droplets are shared CPU, and Regular vs. Premium CPU/disk differences
- [Shared CPU Compute Instances](https://techdocs.akamai.com/cloud-computing/docs/shared-cpu-compute-instances) — Akamai/Linode
- [Akamai Cloud Pricing — Asia Pacific](https://www.akamai.com/cloud/pricing/asia-pacific) — Akamai/Linode
- [Vultr Pricing](https://www.vultr.com/pricing/) — 403s every bot
- [Vultr Plans API](https://api.vultr.com/v2/plans) — the actual source of truth, no login required, includes High Frequency/High Performance plans
- [Vultr Regions API](https://api.vultr.com/v2/regions) — confirms `blr`/`bom`/`del` are Bangalore/Mumbai/Delhi NCR
- [Is Pricing the Same in All Vultr Data Center Locations?](https://docs.vultr.com/support/platform/billing/is-pricing-the-same-in-all-data-center-locations) — Vultr
