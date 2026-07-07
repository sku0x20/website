# Siddhant Kumar Upmanyu

**Senior Systems Architect**
[sku20.dev](https://www.sku20.dev) · [github.com/sku0x20](https://github.com/sku0x20) · [eglu.tech](https://eglu.tech) · siddhantkumarupmanyu@gmail.com · +91 8383056329

---

4+ years of full ownership over backend and cloud infrastructure at an IoT smart home company. I design at the protocol level when needed — custom binary over UDP, kernel-level traffic routing, nftables packet reflection. I publish the tools I build: a Kotlin microservice framework on Maven Central, a Go assertion library, a Helm CLI in Rust, a custom Linux distro. TDD is non-negotiable across every language and every project.

---

## Experience

### eGlu Smart Homes (WiZNSystems)

**Senior Systems Architect** · Apr 2026 – Present
**Backend & Infrastructure Engineer** · Mar 2022 – Mar 2026

*Bengaluru, India · 4+ years*

---

**Architecture & API Design**

- Own the API contract suite for the entire platform — 30+ specs covering device provisioning, scene/rule automation, OTA, smart lock integrations, and real-time device status. App and firmware teams build against these before a line of code is written.
- Lead technical specification for the unified backend and cloud infrastructure stack, security standards, and data contracts.

**IoT Protocol & Real-time Systems**

- Designed and implemented the custom binary protocol (UDP/TCP) between IoT hubs and cloud — packet handling, NAT hole punching, hub online/offline state machine, connection tracking, race condition handling.
- Pushed network work to the kernel when needed: nftables UDP echo server for NAT traversal (packet reflection without userspace), IP rate limiting via per-source dynamic sets at prerouting priority.
- Tuned kernel parameters for high-throughput IoT workloads: socket buffers, IP forwarding, connection tracking table size.

**Platform & Automation Engine**

- Built the scene and rule automation engine: multi-hub scenes, nested fragment handling for large payloads, scene sync, IFTTT-style cloud rules, scheduling.
- Built the device provisioning system from scratch (extracted from monolith): hub setup, node validation, WiFi flow rewrite, replacement flow for failed nodes.
- Integrated Google Home, Alexa, and Yale smart locks (cloud-to-cloud) into the platform.
- Built a feature flags system for controlled rollouts.
- Introduced Consumer-Driven Contract Testing (Pact) for firmware delivery APIs — full CI pipeline: publish pact → can-i-deploy → release → mark deployed.

**Performance Engineering**

- ClickHouse migration: rewrote core ingestion pipeline in Go, achieved **95%+ storage reduction** (90 GB → 3.7 GB, 25 GB → 780 MB) via schema design and specialized codecs.
- JVM profiling with async-profiler and flame graphs — eliminated CPU spikes from per-packet object allocations using ThreadLocal; tuned GC for throughput.
- Zero-downtime blue-green deploys via iptables: flushed conntrack for immediate cut-over, applied rules to both PREROUTING and OUTPUT chains for internal routing.
- Implemented structured ThreadPool error handling after debugging silently swallowed exceptions in async paths (no logs, no traces — the bug that inspired [the blog post](https://eglu.tech/blog/java-exceptions-swallowed)).

**Infrastructure & Reliability**

- Migrated disk-based logging to Loki; built Prometheus + Grafana monitoring — significantly reduced MTTR.
- Architected EKS migration using Terraform; evaluated HashiCorp Nomad first, selected EKS.
- Implemented TLS client authentication with a custom CA and certificate revocation list (CRL) in Go.
- Maintained production Linux systems: kernel tuning, live Debian/Ubuntu upgrades, `tcpdump`, `strace`, `sar`, `iotop`.
- Built and maintained GitHub Actions CI/CD pipelines for automated testing, building, and deployment.

**Codebase & Quality**

- Migrated core monolith (Spring 4 / Java) to Spring Boot 2.7+ / Kotlin — 100% TDD throughout to prevent regressions.
- Decoupled monolith into gRPC microservices.
- Led technical recruitment: designed coding challenges, conducted interviews.

---

## Open Source

**[stopgap](https://github.com/sku0x20/stopgap)** · Kotlin · Maven Central
Microservice framework on Helidon SE (Nima) + Project Loom. Custom compile-time DI via KSP — no runtime reflection. Three-tier testing: unit → in-process integration server → Docker E2E via Testcontainers. Gradle plugin that wires the full build pipeline. Published at `dev.sku20.stopgap:*:2.8.0`.

**[assertgo](https://github.com/sku0x20/assertgo)** · Go
Type-safe assertion library with generics. Fluent API, chainable `Not()`, custom matchers, zero dependencies. v1.0.0.

**[hrh](https://github.com/sku0x20/hrh)** · Rust
Helm Release Helper — reads a YAML release declaration, invokes `helm upgrade --install`. Diff mode, `--atomic` rollback, chart versioning. Installable via `cargo install`.

**[avoid](https://github.com/sku0x20/avoid)** · Shell
Minimal Linux distribution based on Void Linux, built for servers and recovery disks. Ships `.img.gz` and `.qcow2` images via GitHub Actions releases.

**[c_oop](https://github.com/sku0x20/c_oop)** · C
OOP and London-style TDD in pure C. Polymorphism via interface structs, heap-allocated objects with constructors. v5.0.0, CI.

---

## Technical Writing

Writing at **[eglu.tech](https://eglu.tech)** about production engineering, JVM internals, and systems design.

*Zero-Downtime Deployments with Iptables* · *Java Exceptions Swallowed: The ThreadPool Trap* · *ThreadLocal Optimizations and Project Loom* · *A Low-Level UDP Echo Server for NAT Traversal* · *What is Rate Limiting?* · *Optimizing Hex Formatting* · *Avoid — A Void Linux Distribution*

---

## Skills

**Languages:** Kotlin, Java, Go, Rust, Zig, C, Shell
**Backend:** Spring Boot, Helidon SE, gRPC, Protocol Buffers
**Infrastructure:** Kubernetes (EKS), Terraform, Docker, GitHub Actions, Linux (Debian/Ubuntu)
**Databases:** ClickHouse, MongoDB, PostgreSQL, Redis
**Observability:** Loki, Prometheus, Grafana, async-profiler, JMC, VisualVM, Flame Graphs
**Testing:** TDD (London style), Pact (Consumer-Driven Contracts), Playwright, Testcontainers
**Networking:** TCP/UDP socket programming, iptables, nftables, NAT traversal

---

## Reading

- *Patterns of Enterprise Application Architecture* · *Pattern-Oriented Software Architecture Vol. 1*
- *Clean Code* · *Agile Software Development: Principles, Patterns, and Practices*
- *Test-Driven Development by Example* · *Growing Object-Oriented Software, Guided by Tests*
- *Computer Networking: A Top-Down Approach* · *Designing Data-Intensive Applications* (reading) · *Elixir in Action* (reading)

**Readlist:** *Domain-Driven Design* · *Extreme Programming Explained*
