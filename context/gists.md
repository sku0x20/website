# GitHub Gists — Context

Working notes, spikes, and reference scripts. Shows the research and prototyping behind the actual work.

## Technical Gists

**nftable udp echo server** (Mar 2026)
The actual nftables code behind the blog post and relay project. v1 and v2 iterations — v2 uses a dynamic map for stateless address swapping. Prerouting hook at priority -300, notrack for performance.

**ipratelimit** (Mar 2026)
Production nftables rate limiting: per-source-IP rate limiting using dynamic sets with timeout, `limit rate over 10/second burst 20 packets`, applied at prerouting priority -301. Real kernel-level rate limiter, not application-layer.

**profiling-commands.txt** (May 2026)
His actual production profiling workflow:
- `sar -b -dp`, `vmstat -w -t -d`, `iotop -b -a`, `pidstat -t -u/-d` — system-level I/O and CPU profiling
- `asprof start -e cpu -o jfr` — async-profiler with JFR output
This is the toolchain behind the JVM profiling blog posts.

**observability notes** (May 2026)
Architectural thinking on observability stack design. Distinguishes "is the service up?" (external probe) vs "why is it struggling?" (internal metrics). Evaluates Uptime Kuma vs Grafana + Blackbox Exporter + Alloy + Mimir. Concludes one stack (Grafana-native) eliminates the separate uptime tool. Shows design-decision level thinking, not just tool usage.

**lambda reflection generic** (Sep 2025)
Java spike for extracting generic type arguments from a lambda interface via reflection (`ParameterizedType`, `getActualTypeArguments`). Early exploration for stopgap's instance registry — how to get the concrete type `T` from an `InstanceCreator<T>` at runtime.

**changing limits in Linux** (Jan 2025)
Deep notes on Linux process limits: ulimit, prlimit, pam, sshd config, systemd unit files, setrlimit syscall, Go's internal setrlimit call. The kind of notes written while debugging a real production limit issue.

**io wait vs cpu** (Nov 2023)
Research links on Linux CPU stats (iowait vs idle, load average, does iowait consume CPU). Written during performance investigation work.

## Other

- **intellij-tips.txt** — IntelliJ keyboard shortcut mastery (context actions, structural search/replace, data flow analysis, postfix completion)
- **spring breakpoints** — Spring/Spring Security debugging entry points (`DispatcherServlet`, `FrameworkServlet`, `SecurityAutoConfiguration`)
- **Arduino morse code spike** — Embedded/IoT experiment
- **Understanding UTF-8 in C** (2020) — Low-level character encoding in C
- **qemu commands / qemu-bridge** — QEMU/virtualization reference (ties to avoid and virtualization repos)
- **browser notepad** — `data:text/html` notepad utility

## What This Reveals

- Gists are his working memory — research, spikes, toolchain notes
- The nftables gists are the actual code from the blog posts (written before posting)
- He spikes in isolation before building (lambda reflection → stopgap IR)
- Profiling commands gist = production-grade Linux + JVM debugging toolkit committed to muscle memory
- The observability notes show architectural decision-making process, not just implementation
