# Siddhant — Engineering Profile

## Identity

Backend & Infrastructure Engineer. 4+ years, sole backend/infra lead at WiZNSystems (March 2022–present).

Username: sku0x20. Site: sku20.dev. Email: siddhantkumarupmanyu@gmail.com

## Core Philosophy

- **TDD first** — London style. Tests against interface, testing behavior, mocks as DRYed fakes. Deep commitment, not a trend.
- **Minimal dependencies** — Helidon SE over Spring Boot, Vanilla JS over React, Void Linux over Ubuntu.
- **First principles** — Writes OOP in C to understand the pattern, builds TCP servers in Zig, makes a custom Linux distro.
- **Quality over cleverness** — Readable, clear, simple. Dislikes magic (reflection, hidden containers, framework bloat).
- **Practical tools** — Builds things that scratch real itches: hrh (Helm helper), assertG/assertgo (Go testing), fake-server-js.

## Language Fluency

| Language | Level |
|----------|-------|
| Kotlin | Primary (work, stopgap) |
| Java | Primary (work, Spring migration) |
| Go | Strong (assertG, assertgo, gRunner, data pipeline) |
| Rust | Growing (hrh CLI, sudoku) |
| Zig | Experimental/Learning (relay TCP server, zig-spikes) |
| C | Deep concepts (c_oop, no-libc, meson-c-template) |
| Shell | Practical (avoid build scripts, CI/CD) |
| Python | Scripting |
| TypeScript/JS | Used when needed (llcc, fake-server-js, website) |

## Infrastructure & Ops

- Kubernetes (EKS), Terraform, Docker, Helm (hrh tool), GitHub Actions CI/CD
- Linux admin: Debian/Ubuntu, kernel tuning (sar, strace, tcpdump, vmstat, iotop), live OS upgrades
- Blue-green deploys via iptables
- Observability: Loki, Prometheus, Grafana
- Cloud: AWS (EKS, workshops), GCP (storage lifecycle, snapshots)

## Databases

- ClickHouse (deep expertise — binary migration, codec optimization, 95%+ storage reduction)
- MongoDB (production standalone → replica set migration planned)
- PostgreSQL, Redis

## Work Highlights (WiZNSystems)

- ClickHouse migration: 90GB→3.7GB and 25GB→780MB (rewrote ingestion in Go)
- Spring 4→Spring Boot 2.7+ migration, 100% TDD
- gRPC microservices decoupled from monolith
- JVM profiling: async-profiler, JMC, VisualVM, Flame Graphs — reduced latency via ThreadLocal, GC tuning
- Loki migration for logging, Prometheus for monitoring
- Blue-green zero-downtime deploys with iptables
- EKS migration in progress (evaluated Nomad first)
- Auth/authz redesign in progress
- Tech recruitment lead, coding challenges at github.com/sku0x20/recruitment
