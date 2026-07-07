# LinkedIn Profile — sku20

## Current

**Name:** Siddhant Kumar Upmanyu
**Title:** Senior Systems Architect | Backend & Infrastructure | Distributed Systems
**Company:** eGlu Smart Homes (legal: WiZNSystems — same org)
**Location:** Bengaluru, Karnataka, India
**Open to work:** Yes (recruiters only) — Bengaluru +3 more, On-site/Hybrid/Remote

## About (verbatim)

> Focused on the intersection of high-integrity logic and scalable infrastructure.
> My thinking is rooted in Clean Architecture and SOLID principles, ensuring that complex systems remain modular, performant, and maintainable.
>
> Core Focus:
> - System Design: Building the "source of truth" for backend services and API contracts.
> - Infrastructure as Code: Designing resilient cloud platforms on GCP/AWS.
> - Performance Engineering: Deep-dive optimizations at the OS, network, and database layers.
>
> I believe a real technical architecture isn't just a diagram; it's a forensic commitment to system integrity.

## Experience

### Senior Systems Architect | eGlu Smart Homes | Apr 2026 – Present
Full-time, On-site, Bengaluru

- Architectural Design: Lead design and technical specification for unified backend and cloud infrastructure stack
- Core Systems Engineering: Architecting mission-critical backend systems using SOLID principles and Clean Architecture
- Platform Engineering: Designing and managing scalable cloud environments on GCP/AWS for high availability
- Performance Optimization: Engineering low-level optimizations at OS and network layers, kernel-level configs, DB tuning
- Contract Design: Authoring technical blueprints and data contracts defining performance, scalability and security standards

Skills: Distributed Systems, System Architecture, +8

### Software Engineer / Backend & Infrastructure Engineer | eGlu Smart Homes | Mar 2022 – May 2026
Full-time, On-site, Bengaluru (4 yrs 3 mos)

Raw bullets from LinkedIn (more candid than resume):
- Migrated Spring 4 JDK 8 backend to Spring Boot 2.7.5 with JDK 17; migrated core codebase from Java to Kotlin
- Worked with iptables to enable Zero Downtime (Blue-Green) deployments; built GitHub Actions CD pipelines
- Tuned OS parameters for optimized UDP/TCP handling; Linux sysadmin
- Analyzed applications with async-profiler, JFR; optimized hot paths; tuned JVM GC
- Designed & developed protocols for new smart home products over HTTP, UDP, gRPC
- Reduced GCP cost via bucket Object Lifecycle management, removing unnecessary alerts, etc.
- Migrated IoT data from raw files to ClickHouse — reduced space from 100GB to 6GB via data type and compression tuning; wrote Go gRPC wrapper with limits and control parameters
- Wrote Go TLS server and client for reading raw text logs — with TLS client authentication, custom CA certificate validation, and CRL (certificate revocation list) support
- Migrated application logs from raw files to Loki/Grafana
- Handling overall deployments: backend services, ClickHouse, Loki, Grafana
- Extracting big ball of mud monolith to microservices; every new code TDD'd
- Researched Nomad as orchestrator alternative before selecting EKS

Skills: Go, Java, +17–18 skills listed

## Skills (LinkedIn)

Industry Knowledge: Performance Engineering, Systems Design, Scalability, System Architecture, Software Architecture, Cloud Infrastructure, Network Architecture

Tools & Technologies: Nginx, Loki, Infrastructure

## eGlu.tech Blog Posts

Active technical writer. All posts from 2026. Experience-driven, first-person, opinionated.

| Date | Post | Impressions |
|------|------|-------------|
| Jun 15 | Rate-limiting: Token Bucket (flow control) vs Fixed Window (quota control) | 69 |
| Jun 9 | Avoid — A Void Linux Distribution | 52 |
| May 17 | Optimizing Hex Formatting — `String.format` bottleneck → Java 17 `HexFormat` | — |
| Apr 18 | How Smart is AI? — feature flags experiment, AI as glorified search | 170 |
| Apr 16 | AI, Agents and the Refactoring Loop | 97 |
| Apr 6 | Zero-Downtime Deployments with iptables | **831** |
| Mar 29 | ThreadLocal Optimizations and Project Loom | 456 |
| Mar 22 | Java Exceptions Swallowed: The ThreadPool Trap | **750** |
| Mar 17 | Low-Level UDP Echo Server for NAT Traversal — userspace → nftables kernel path | — |
| Feb 28 | Choosing Blog CMS | — |

### Blog Topics

- **Production incidents**: ThreadPool silently swallowing exceptions, CPU spikes from object allocations, NAT traversal with ISP blocking heartbeats
- **Kernel/OS level**: iptables blue-green deploy (conntrack flush, OUTPUT chain), nftables for UDP reflection, eBPF awareness
- **JVM internals**: async-profiler vs JFR, flame graphs, ThreadLocal, Project Loom / Scoped Values trade-offs
- **Opinionated minimalism**: Void Linux, "no magic" philosophy, specialized tools over generic (`HexFormat` vs `String.format`)
- **Conceptual clarity**: Rate-limiting is two orthogonal ideas (flow control vs quota control) most engineers conflate
- **AI evaluation**: honest assessments — useful for research, not a designer, risks atrophying reasoning skills

### Writing Voice

- Detective/narrative structure: mysterious problem → failed attempts → root cause → robust fix
- "I got tired of X, so I built Y" — built from real frustration, not theory
- Acknowledges uncertainty honestly: "I felt a bit unsafe with eBPF", "discovered this the hard way"
- Opinionated on trade-offs: "adding another hop introduces latency I wasn't willing to take"
- "a forensic commitment to system integrity" — strong self-framing
- Conversational but technically precise — explains the gotcha, not just the happy path
- Humor used deliberately: "Because there are no threads. lol."
