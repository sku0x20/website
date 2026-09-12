# Curriculum Vitae — Siddhant Kumar Upmanyu

## 2022 — Sole Backend Ownership & Production Modernization

> **Operating Reality & Scope:**  
> I joined as the sole dedicated backend engineer. The only other backend contributor was a founding engineer splitting focus across Android and backend systems. There was no backend team to lean on, no deployment pipeline, and years of legacy infrastructure. I stepped into immediate, end-to-end ownership of backend architecture, delivery pipelines, and production reliability.

### Zero-Downtime Blue-Green Deploys & Automated Delivery

* **The Reality on the Ground:**  
  Production deployments were completely manual and caused downtime. The founding engineer manually SFTP’d Jetty WAR files onto bare-metal/cloud instances, killed the running Jetty process, and booted the new one—leaving IoT hubs and mobile apps hanging during restarts. There was no CI/CD pipeline in place.

* **Automating Delivery First:**  
  Before fixing the deployment swap, I eliminated manual build artifacts. I engineered an automated CI/CD pipeline on Bitbucket Pipelines: code pushes triggered automated builds, which notified a custom webhook daemon on the target server to pull the verified artifact and orchestrate the rollout.

* **The Switching Challenge (Userspace vs. Network Layer):**  
  Application-level proxies or load balancers added memory overhead and latency on resource-constrained single-server setups. I researched cutting over traffic at the Linux kernel level using `iptables` NAT port redirection.

* **The Edge Case & Solution:**  
  A basic DNAT rule in `PREROUTING` worked for external hub traffic but failed for local health checks and loopback requests. Furthermore, existing stateful connections didn't immediately shift. I solved this by:
  1. Directing incoming traffic via `PREROUTING` and internal/loopback traffic via `OUTPUT` chains.
  2. Booting the secondary Jetty instance on an alternate port and validating its health.
  3. Swapping the port redirection rules and explicitly flushing the `conntrack` state table for immediate cut-over without lingering stale connections.
  4. Gracefully draining and terminating the old process.

* **The Outcome:**  
  Shifted the company from manual, downtime-heavy deployments to push-to-deploy, zero-downtime releases.

### IoT Hub Load Simulation & The C10K Awakening

* **The Mandate:**  
  Tasked with building a hub simulator/load-testing harness that would replay production hub traffic logs against the backend to evaluate server resilience under load.

* **The Flawed Assumption & Immediate Bottleneck:**  
  The conventional instinct was a thread-per-simulated-device model replaying recorded log streams. I recognized early on that this was fundamentally unscalable: simulating hundreds or thousands of concurrent IoT hubs using standard synchronous blocking sockets (`java.net.Socket`) rapidly exhausted JVM thread stacks and OS file descriptors. The simulator fell over long before the server did.

* **The Research & Concurrency Epiphany:**  
  This was my first deep collision with the C10K problem and socket multiplexing. I dove into:
  - **Java NIO (`Selector`, `SocketChannel`)**: Understanding how a single OS thread could multiplex I/O across hundreds of connections rather than blocking 1:1 on reads/writes.
  - **Emerging Concurrency Paradigms**: Researching Go’s M:N runtime scheduler, goroutines, and early preview builds of Project Loom (virtual threads), realizing the massive overhead of 1MB kernel thread stacks for idle IoT connections.

* **The Long-Term Impact:**  
  While the log-replay harness exposed the limits of synthetic replay testing, it permanently shifted my mental model away from naive synchronous blocking architectures. It planted the architectural seeds for everything that followed: async event loops, custom binary protocols, and years later, building on Project Loom and Helidon SE.

### Spring 4 to Spring Boot 2.7.5 Migration: Unlocking TDD

* **The Problem:**  
  The core backend was locked into a legacy Spring 4 codebase (circa 2018–2019). The configuration was tangled, manual, and slow to bootstrap. Crucially, writing fast, isolated automated tests and practicing Test-Driven Development (TDD) was virtually impossible under the legacy test harness and bean configuration.

* **The Leap & Research:**  
  Rather than an incremental patch to Spring 5, I spearheaded a direct leap to Spring Boot 2.7.5 (the latest release at the time). Doing this in the pre-AI era meant manually untangling years of accumulated tech debt:
  - Eliminating sprawling legacy XML/Java configuration in favor of Spring Boot auto-configuration and sensible defaults.
  - Resolving deep transitive dependency incompatibilities, deprecated APIs, and altered bean lifecycle semantics.
  - Overhauling database connection pooling, embedded servlet container management, and configuration profiles.

* **The Core Motivation & Transformation:**  
  The primary driver wasn't just "shiny new framework"—it was developer velocity and correctness. Moving to modern Spring Boot unlocked modern test slices (`@SpringBootTest`, `@WebMvcTest`, lightweight context caching) and test infrastructure.

* **The Outcome:**  
  Transformed an untestable legacy monolith into a modernized, maintainable platform where TDD became a first-class citizen across the team.

### Apple HomeKit Integration Spike: Protocol Forensics & HAP Bridging

* **The Exploration:**  
  Investigated bridging proprietary smart home devices natively into the Apple HomeKit ecosystem to evaluate local iOS control without cloud hops.
* **The Research & Implementation:**  
  Forked and adapted an open-source Java implementation of Apple's HomeKit Accessory Protocol (HAP). Deep-dived into the low-level mechanics: local mDNS/Bonjour discovery, cryptographic pairing exchanges (SRP and Curve25519), session encryption, and mapping custom device states to Apple's strict accessory characteristic schemas.
* **The Retrospective & Takeaway:**  
  While the spike was ultimately shelved due to hardware and commercial constraints, it provided early, invaluable exposure to strict protocol specifications, cryptographic handshakes, and local-first device networking.


## 2023 — Inherited Firestorm & Production SRE Hardening

> **Operating Reality & Expanded Custody:**  
> In January 2023, the founding engineer departed, leaving me as the sole custodian of the entire backend, the production virtual machines, and cloud infrastructure. With no safety net, I was immediately thrust into heavy SRE firefighting—tackling cascading outages, resource starvation, and kernel bottlenecks while keeping feature development alive.

### Linux Systems Forensics: Surviving File Descriptor Depletion & I/O Starvation

* **The Crisis (SSH Lockouts & Degraded State):**  
  The production VM suffered recurring catastrophic failures where the backend hung in a degraded state, unable to allocate new threads or accept connections. In the worst cases, OS-level file descriptor depletion locked out incoming SSH sessions entirely, forcing emergency hard VM restarts.
* **The Root Cause & Diagnostics:**  
  Using `iotop`, `vmstat`, and `sar`, I diagnosed two compounding bottlenecks:
  1. *Log Flooding & Disk I/O Saturation:* Uncontrolled log dumps were thrashing the disk, creating massive I/O wait times that stalled thread execution.
  2. *Systemd vs. User Limits:* Simply bumping `ulimit` or `rlimit` in shells didn't persist for daemon processes governed by systemd unit limits (`LimitNOFILE`).
* **The Remediation:**  
  - Fixed systemd service unit limits to allow the backend process to scale its open file table properly.
  - Tuned OS disk buffers and leveraged Linux process scheduling: assigned CPU priority with `nice` and prioritized disk I/O queues using `ionice` so core backend traffic was never starved by background disk writes.
  - Tuned kernel TCP and UDP buffer parameters and untangled messy, inefficient Nginx reverse proxy configurations.

### Database Connection Pool Forensics (MongoDB)

* **The Problem:**  
  The backend suffered intermittent database timeouts caused by MongoDB connection pool exhaustion.
* **The Investigation & Fix:**  
  Monitored active connection counts across services to trace the source of the leak. Identified a misconfigured internal auxiliary service that opened direct database connections on requests without returning them to the shared pool. Reconfigured the service to use pooled connection lifecycles, immediately stabilizing MongoDB cluster connections.

### Delivery Infrastructure: Bitbucket to GitHub Actions Migration

* **The Migration:**  
  The company decided to migrate its entire VCS footprint from Bitbucket to GitHub.
* **The Implementation:**  
  Re-architected and ported all build, test, and release pipelines to GitHub Actions. Maintained the automated webhook-based zero-downtime deployment mechanism on the production servers without introducing service interruptions during the transition.

### Platform Continuity: New Device APIs & Ecosystem Integrations

* **The Balancing Act:**  
  Alongside infrastructure firefighting, maintained product delivery: designed and shipped backend support for new IoT device types, cleaned up legacy API contracts, and stabilized third-party voice integrations (Google Home and Amazon Alexa).

### Critical Production State-Sync Remediation (Cloud & Hub Data Divergence)

* **The Inherited Time Bomb:**  
  Discovered a severe, months-old bug originating from legacy code in the scene and rule synchronization engine between the cloud backend and IoT hubs. Flawed ID generation and state mapping caused silent divergence—rules configured in the mobile app were corrupting or failing to trigger reliably on physical hubs.
* **The High-Stakes Fix:**  
  Because thousands of active homes were running corrupted IDs, a naive code fix wasn't enough. I had to:
  1. Diagnose and rewrite the synchronization logic to guarantee deterministic ID mapping and conflict resolution.
  2. Author, test, and execute production migration scripts to repair corrupted database records on the cloud while reconciling state across remote hubs over the air—without breaking active customer automations.

### Architecture Research & Extreme Programming (XP) Foundations

* **Questioning Scalability Paradigms:**  
  Faced with scaling the single-server monolith, I conducted deep architectural research into horizontal scalability patterns: evaluating message brokers (Kafka vs. lightweight queues) for event streaming, and exploring container orchestration (Kubernetes) to understand trade-offs before jumping on hype trains.
* **Deepening Software Craftsmanship:**  
  Beyond frameworks, I immersed myself in Extreme Programming (XP) philosophies and London-style TDD. Working solo, I realized TDD was my only real safety net against regressions. I began restructuring code for true testability—isolating side effects, enforcing strict domain boundaries, and cultivating clean code practices.

## 2024 — Security Hardening, Deep Profiling & Hard-Won Resilience

> **Operating Reality & High-Stakes Ownership:**  
> By 2024, my ownership spanned from daily database forensics and bug fixes to core infrastructure reliability. I transitioned from surviving production fires to proactively eliminating security vulnerabilities, profiling JVM runtime internals, and hardening automated recovery mechanisms.

### Zero-Trust Internal Tooling: `hlogger` (Go, mTLS & Custom PKI)

* **The Security Flaw:**  
  Firmware and hardware engineers frequently required real-time device communication logs to debug edge-case firmware behavior. Historically, this was solved by handing out direct SSH access to production Linux instances—a massive security risk and audit failure.
* **The Solution (`hlogger`):**  
  Built a secure, audited client-server diagnostic tool in Go using Mutual TLS (mTLS) to replace raw SSH access:
  - **PKI Architecture:** Designed a complete certificate hierarchy from scratch—Root CA, Intermediate CA, and per-developer client certificates with Certificate Revocation List (CRL) support.
  - **Auditing & Containment:** The server daemon enforced strict mutual authentication, logged all incoming commands and access timestamps, and streamed filtered device logs back to the client CLI without exposing an interactive shell.

### Production Resilience & The "Hospital Bed" Recovery Incident

* **The Vulnerability:**  
  While I had automated blue-green cutovers, the scripts still required operational discipline. In mid-2024, while I was hospitalized, a team member triggered a deployment swap during high lag, corrupting the `iptables` cutover state and taking down production.
* **Triage from a Hospital Bed:**  
  With a 1–2 hour downtime looming, the CEO got on a video call directly from my hospital room, aiming a camera at the engineer's terminal. I walked them through flushing corrupted routing rules, re-synchronizing connection state, and executing a clean cut-over to restore traffic.
* **The Remediation:**  
  The moment I recovered, I overhauled the swap tooling to be strictly idempotent, self-healing, and guarded with sanity checks—ensuring an errant command could never leave routing tables half-swapped or wedged again.

### JVM Deep Profiling & Garbage Collection Engineering

* **The Bottleneck:**  
  As device density grew, the Spring Boot backend began experiencing intermittent latency spikes and CPU churn during peak traffic windows.
* **Profiling & Forensics:**  
  Moved beyond guessing by instrumenting the runtime with **`async-profiler`**, **Java Mission Control (JMC)**, and **VisualVM**, generating flame graphs under live traffic:
  - Identified per-packet object allocation churn as a primary driver of young-gen GC pressure.
  - Mitigated churn using pooled buffers and `ThreadLocal` allocations for hot execution paths.
  - Tuned JVM garbage collection and memory geometry: pinned heap boundaries (`-Xms` = `-Xmx` at 4GB) to avoid OS page allocation latency and selected low-latency GC profiles to stabilize tail latency.

### The Observability & High-Ingestion Data Odyssey: Discovering ClickHouse

* **The Data Bottleneck (Dumping to Disk):**  
  IoT devices were continuously streaming high-frequency telemetry (voltage fluctuations, wattage, power state changes) alongside application logs. Everything was being dumped onto raw disk files on the VM—unsearchable, saturating I/O bandwidth, and risking disk exhaustion.
* **The Manual Research Journey (Pre-AI Evaluation):**  
  Without AI shortcuts, I manually dissected the distributed logging and analytical database ecosystem:
  - *Operational Logging:* Evaluated the Elastic Stack (ELK) vs. OpenSearch vs. the **Grafana Stack (Loki + Prometheus + Grafana)**. I recognized the architectural difference between indexing full log text (Elastic) vs. indexing only metadata labels (Loki), which fit our resource constraints far better.
  - *High-Ingestion Time-Series Telemetry:* Researched Apache Druid, Hadoop (evaluating why map-reduce batch architectures were wrong for our real-time IoT needs), and Timescale.
* **The ClickHouse Breakthrough & Modern Telemetry:**  
  By late 2024, I identified **ClickHouse** as the ideal engine for our IoT write-heavy workload—its columnar storage, vectorized execution, and aggressive compression algorithms were tailor-made for high-throughput device state. I also explored **Vector** for pipeline routing and **OpenTelemetry (OTel)**, clarifying the conceptual boundary between unstructured logs, structured metrics, and time-series telemetry.

### Stepping Into the Engineering Community

* Attended the inaugural **Apache Kafka meetup in Bangalore** (the first official Kafka event in India)—my first developer conference—deepening my understanding of distributed log streams and event brokers.
* Later attended tech events hosted by **Thoughtworks** in Bangalore, exchanging ideas with engineers solving high-scale distributed systems problems.

## 2025 — Production Observability, Modern Infra & High-Performance Pipelines

> **Operating Reality & Architectural Transition:**  
> In 2025, the research from late 2024 materialized into production infrastructure. I moved the company away from single-node disk-dependent operations toward dedicated observability, declarative infrastructure, and purpose-built ingestion pipelines.

### Production Observability Rollout: Grafana & Loki (Retiring `hlogger`)

* **The Evolution:**  
  Having stabilized access security in 2024 with `hlogger`, the next step was eliminating disk logging entirely in favor of a centralized, real-time observability platform.
* **The Implementation:**  
  - Provisioned and hardened a dedicated, isolated observability VM separate from production.
  - Deployed and tuned **Grafana** and **Loki** to ingest application and device logs centrally.
  - Managed all host configurations, scrape targets, log retention policies, and dashboards in a git-tracked directory—implementing a pragmatic GitOps / Infrastructure-as-Code (IaC) workflow where updates were deployed via version-controlled pulls rather than ad-hoc server mutations.
* **The Outcome:**  
  Gracefully retired `hlogger` and raw disk log dumping. The entire engineering organization (firmware, backend, mobile) gained instant, indexed query capabilities over real-time system logs without touching production hosts.

### High-Volume Telemetry Migration: ClickHouse, Delta+ZSTD Codecs & GCS Offloading

* **The Production Disk & Inode Crisis:**  
  The production VM was facing recurring disk exhaustion from years of accumulated device health telemetry and high-churn activity logs. The legacy storage architecture had a severe filesystem flaw: files were saved across deeply nested two-letter directory trees (`/aa/bb/cc/...`), causing catastrophic filesystem **inode bloat** where directory metadata consumed massive disk space and degraded I/O throughput.
* **The Migration & Codec Engineering:**  
  Having evaluated ClickHouse in late 2024, I designed a pipeline to ingest and archive multi-year historical telemetry out of the bloated filesystem into ClickHouse:
  - **Schema & Codec Tuning:** Designed columnar schemas leveraging specialized compression: combined **Delta encoding** (for monotonically increasing timestamps and sequential device metrics) with **ZSTD (Zstandard)**, achieving an astonishing **95%+ storage reduction** (e.g., compressing ~90 GB down to ~3.7 GB).
  - **Cold Storage Tiering:** Integrated ClickHouse storage policies to offload and archive compressed tables to Google Cloud Storage (GCS).
* **The Outcome:**  
  Purged legacy nested directory trees from the production VM, permanently reclaiming tens of gigabytes of disk space and eliminating inode exhaustion while retaining lightning-fast analytical queries over historical data.

### Ending "Testing in Production": On-Prem Staging Environment & Parity

* **The Dangerous Status Quo:**  
  Historically, the company had no staging environment. New backend changes, schema updates, and bug fixes were deployed and tested directly against live production systems—leading to high deployment churn, customer-facing bugs, and constant emergency hotfixes.
* **The Architecture:**  
  Configured a dedicated server within the office network behind a static public IP:
  - Mirrored production topology locally: configured the backend, databases, and dependencies to replicate production runtime conditions.
  - Established a strict deployment lifecycle: all new features, refactors, and migrations were promoted and verified on this staging environment before receiving a production release ticket.
* **The Impact:**  
  Dramatically reduced production redeployments and hotfixes. Edge cases were caught during staging verification, giving the team a safe sandbox for experimental features and stabilizing the release cycle.









