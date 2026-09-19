# Siddhant Kumar Upmanyu
**Senior Systems & Infrastructure Engineer · Distributed Systems & Platform**  
Bengaluru, India · [siddhantkumarupmanyu@gmail.com](mailto:siddhantkumarupmanyu@gmail.com)  
[sku20.dev](https://www.sku20.dev/) · [GitHub: sku0x20](https://github.com/sku0x20) · [LinkedIn: sku20](https://www.linkedin.com/in/sku20) · [Zenodo Preprint](https://doi.org/10.5281/zenodo.21717242)

---

## Profile Summary
Senior Systems & Infrastructure Engineer with deep specialization in Linux kernel networking (`nftables`, NAT64, raw sockets), high-throughput telemetry storage (ClickHouse), and JVM runtime optimization. Sole technical owner of cloud infrastructure and core platform architecture for a production IoT smart home ecosystem. Published distributed systems author ([Zenodo](https://doi.org/10.5281/zenodo.21717242)) and open-source framework maintainer ([stopgap](https://github.com/sku0x20/stopgap)).

---

## Technical Competencies
* **Languages:** Kotlin, Java, Go, Rust, Zig, C, Shell scripting (Bash/POSIX), SQL
* **Kernel & Systems Networking:** Linux kernel (`nftables`, `iptables`), in-kernel NAT64 (`Jool`), TCP/UDP socket programming, mTLS with custom PKI (CA/CRL), packet reflection, conntrack table tuning
* **Distributed Platforms & Storage:** ClickHouse (columnar modeling, Delta/ZSTD codecs), Redis, PostgreSQL, MongoDB, gRPC, Protocol Buffers, REST APIs
* **Cloud & Infrastructure:** Google Cloud (Organization Admin, Cloud Run, Cloud SQL, VPC, GCS, IAM), AWS, Terraform / OpenTofu IaC, Docker, Proxmox VE (bare metal), GitHub Actions, Linux administration (Debian, Ubuntu)
* **Observability & SRE:** Grafana, Loki, Mimir, Alloy, VictoriaMetrics, VictoriaLogs, `async-profiler`, JMC, VisualVM, Linux performance tools (`sar`, `vmstat`, `iotop`, `pidstat`)
* **Methodology:** Extreme Programming (XP), London-Style TDD, Consumer-Driven Contract Testing (Pact), Testcontainers

---

## Professional Experience

### eGlu Smart Homes (WiZNSystems) — Bengaluru, India
*IoT Smart Home & Commercial Automation Platform*  
**Senior Systems Architect** (Apr 2026 – Present)  
**Senior Software Engineer** (2024 – 2026)  
**Software Engineer** (2022 – 2024)

#### Systems Architecture & Kernel Networking
* **In-Kernel Dual-Stack NAT64 (`Jool` + `nftables`):** Resolved an edge network partition where cellular IoT hubs operated strictly over IPv6 while backend services were IPv4. Bypassed userspace proxies to protect CPU credits; deployed the `Jool` kernel module with Explicit Address Mapping Tables (EAMT) alongside `nftables` DNAT to cleanly partition source port ranges on a shared public IPv4.
* **Prerouting Packet Reflection & Dynamic Abuse Mitigation:** Offloaded UDP NAT traversal echo responses directly into the Linux kernel using `nftables` packet reflection (`notrack`) at prerouting priority, avoiding userspace context switches. Implemented kernel-level DDoS mitigation via `nftables` dynamic sets (`limit rate over 10/second burst 20 packets` at prerouting priority -301) dropping sweeps before socket allocation.
* **Zero-Downtime Kernel Switching:** Designed zero-downtime deployment pipelines using `iptables` DNAT cutovers across both `PREROUTING` and `OUTPUT` chains, explicitly flushing the `conntrack` state table to switch backend traffic without dropping active connections. Hardened recovery scripts after triaging a corrupted iptables routing table live during an emergency deployment incident.
* **Academic Preprint Publication (Zenodo):** Authored and published [*Connection-Agnostic Presence Tracking for Stateless Distributed Backends*](https://doi.org/10.5281/zenodo.21717242), formulating a Redis sorted-set architecture with expiration deadlines and throttled batch writes to track IoT device state with mathematically bounded latency.

#### High-Throughput Telemetry & Storage Systems
* **ClickHouse Ingestion Engine (95%+ Compression):** Resolved a filesystem inode exhaustion crisis caused by nested directory log dumps. Designed high-throughput columnar ClickHouse schemas (`FixedString`, `LowCardinality`, Delta + ZSTD codecs, sparse composite primary keys), slashing telemetry footprint by 95%+ (compressing `device_health` telemetry from 17 GB down to 300 MB on disk). Executed zero-downtime partition-level backfilling and restore operations without slow `INSERT INTO` batches, and devised partition-level disaster recovery backup and restore policies.
* **Decoupled Ingestion Microservice:** Engineered an auxiliary Go microservice communicating via binary gRPC with strict Protocol Buffers contracts to encapsulate ClickHouse, shielding the primary Kotlin/Spring Boot monolith from database driver coupling.
* **Zero-Downtime Storage Architecture:** Architected and orchestrated an end-to-end multi-phase data migration decoupling binary Base64 image blobs from primary MongoDB collections to GCS with zero downtime; designed dual-write API contracts with document guardrails (`imageMigrated`), executed an asynchronous backfill pipeline with immutable GCS caching headers, coordinated backward-compatible mobile rollouts, and purged legacy blobs via `$unset`, slashing database storage by 54x (3.6 GB to 67 MB) and runtime memory by 89% (4.6 GB to 500 MB).
* **Production MongoDB DBA & Index Engineering:** Acted as hands-on DBA across heavy-load production MongoDB clusters. Audited slow query logs and execution plans (`explain`), pruned redundant/overlapping indexes to reclaim WiredTiger cache memory and reduce write amplification, refactored hot document schemas, and engineered selective compound indexes (strict Equality-Sort-Range ordering) to eliminate collection scans and in-memory sorts under sustained IoT write traffic.

#### Concurrency, Runtime & JVM Performance
* **Dynamic IoT-Aware ThreadPool:** Overhauled JVM thread management under bursty IoT packet waves by replacing default thread pools with an adaptive dynamic ThreadPool that scales worker threads based on real-time packet velocity and queue depth.
* **Deep JVM Profiling & Zero-Allocation Hot Paths:** Instrumented live production systems with `async-profiler` and JMC flame graphs. Mitigated allocation churn with buffer pooling and `ThreadLocal` storage; refactored critical packet decoding loops from `String.format` to Java 17 `HexFormat` and bitwise arithmetic, eliminating hot-path CPU bottlenecks. Pinned heap boundaries (`-Xms = -Xmx` at 4GB) and tuned GC for low pause times.
* **Redis Connection Pool Forensics:** Diagnosed and eliminated silent "ghost connections" and thread pool poisoning in Redis Pub/Sub drivers (Lettuce vs. Jedis) that caused cascading application timeouts under transient network partitions.

#### Platform Engineering, Governance & Cloud FinOps
* **Organizational Cloud Custody & FinOps:** Sole custodian of Google Cloud Organization IAM, VPCs, and GoDaddy DNS zone files. Analyzed multi-year resource utilization to execute a 3-year Google Cloud Committed Use Discount (CUD) on compute instances; currently leading workload evaluation for migrating production workloads from legacy N1 to modern N4 machine types.
* **Production Observability Stack:** Replaced legacy ad-hoc disk logging and custom diagnostic tooling with an enterprise observability stack: Grafana, Loki, and Mimir fed by Alloy with blackbox HTTP/TCP probes, managed under git-tracked configuration (pragmatic GitOps).
* **Zero-Trust Diagnostic Tooling (`hlogger`):** Built a secure client-server log inspection utility in Go using Mutual TLS (mTLS) with a custom PKI hierarchy (Root CA, Intermediate CA, client certificates, CRL), eliminating unauthenticated engineer SSH access to production instances.
* **On-Prem Staging Parity & Bare-Metal Homelab:** Built a dedicated on-prem staging environment replicating production network topology, terminating "testing in production." Configured a Proxmox VE bare-metal cluster to evaluate container orchestration (Kubernetes CNI/CSI, HashiCorp Nomad) for future platform containerization.
* **Declarative Marketing Infrastructure:** Decoupled the public marketing website completely from core backend infrastructure into its own isolated GCP project, codifying 100% of Cloud Run, Cloud SQL (PostgreSQL), networking, and IAM via Terraform / OpenTofu.
* **Platform Automation & Integrations:** Extended scene/rule automation engines for multi-hub environments (fragment handling, cross-hub synchronization); built cloud-to-cloud OAuth integrations for Yale smart locks, Google Home, and Alexa; rewrote hardware device provisioning flows and replacement operations for failed nodes.
* **Technical Hiring:** Formulated backend engineering evaluation rubrics and practical TDD assessments; interviewed and hired software engineering talent for the platform.

---

## Open-Source Systems & Research Projects
* **[stopgap](https://github.com/sku0x20/stopgap) (Kotlin · Maven Central `2.8.0`):** Modern microservice framework built on Helidon SE (Nima) + Project Loom virtual threads with compile-time dependency injection via KSP and integrated three-tier testing harness.
* **[assertgo](https://github.com/sku0x20/assertgo) (Go):** Type-safe testing assertion library leveraging modern Go generics with fluent assertion APIs and zero external dependencies.
* **[relay](https://github.com/sku0x20/relay) (Zig):** Low-level TCP server implemented in pure Zig using raw POSIX socket descriptors, manual memory management, and `SIGPIPE` suppression without libc dependencies.
* **[hrh](https://github.com/sku0x20/hrh) (Rust):** Helm Release Helper CLI tool engineered to automate declarative Helm deployments with diff previews and atomic rollback guarantees.
* **[avoid](https://github.com/sku0x20/avoid) (Shell / Linux):** Minimal, bootable Linux distribution based on Void Linux engineered for server disaster recovery and lightweight headless appliances.

---

## Technical Thought Leadership & Writing
Authored 20+ forensic post-mortems and distributed systems analyses published at [sku20.dev/blog](https://www.sku20.dev/blog):
* *Betting on NAT64 Over a Proxy* · *Negotiating with Jool* · *Zero-Downtime Deployments with iptables*
* *The 100ms Password* · *Java Exceptions Swallowed: The ThreadPool Trap* · *ThreadLocal Optimizations and Project Loom*
* *Decoupling Blobs: A Zero-Downtime Migration from MongoDB to GCS* · *The Ghost Connection: Poisoned Redis Pub/Sub Connection Pools*

---

## Education
* **Bachelor of Computer Applications (BCA)** — 2019 – 2022
