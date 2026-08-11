---
title: "Avoid - A Void Linux Distribution"
description: "Creating a minimalist, server-oriented Linux distribution based on Void Linux to escape the bloat of systemd and unnecessary firmware."
date: "Jun 9, 2026"
tag: "Systems"
---

I wanted a minimal system that I could use for build machines and occasional recovery. It was frustratingly difficult to find something that fit the bill; every distribution I tested felt bloated. Even "server" variants often came with more than I needed.

## The Quest for Minimalism

After trying several options, I eventually settled on Void Linux. I had considered Debian, but systemd felt too heavy for my tastes. Once you experience true minimalism, it's hard to go back. I even tried Devuan (a systemd-free fork of Debian), but it didn't feel quite right—there was too much "magic" happening behind the scenes.

I also experimented with OpenSUSE Tumbleweed, specifically the QEMU image. While relatively small, something still felt "off"—likely the presence of systemd again.

## Why Void?

So, I decided to build a custom distribution based on Void. The primary issue with standard Void is that it’s geared toward desktop users. It includes many unnecessary firmware blobs for things like Wi-Fi and sound that have no place on a server or build box.

While I haven't gone as far as building a custom kernel yet (the modules remain for now), I've stripped out most of the unnecessary packages.

What I love about Void is the tooling. `xchroot` in particular makes the setup process incredibly smooth. The package management isn't convoluted; it's easy to query dependencies, list files, and understand what's happening on your system. Void follows a philosophy of minimalism that resonates with me, but it lacked a dedicated server-first implementation.

The documentation is also a breath of fresh air: clean, straightforward, and centralized, unlike many other distros where information is scattered across fragmented wikis.

## Building "Avoid"

In keeping with the minimalist theme, I avoided using their high-level tools like `mklive`. Instead, I took a hands-on approach with a custom build script. Honestly, it's much simpler and gives me total control over the environment.

The process involved the usual suspects: sparse files, zerofilling, and the standard `chroot` installation routine.

Currently, the releases are automated via GitHub Actions. It was tricky to get the pipeline stable, but it's fully functional now. I'm providing a `.qcow2` image that's ready to boot.

## Results and Next Steps

I’m really pleased with the performance. The system boots incredibly fast, consumes only about 300MB of RAM, and runs a very small number of processes. I've also included some minimalistic defaults for Zsh (the default user shell), and `sh` is symlinked to `dash` for speed.

The next step is to create a container image and use that to build the distribution itself. For now, I’m very happy with the result.

Check out the project here: [github.com/sku0x20/avoid](https://github.com/sku0x20/avoid)

---

*Originally published on [eglu.tech](https://eglu.tech/blog/avoid-linux).*
