# Curriculum Vitae — Siddhant Kumar Upmanyu

**Current Title:** Senior Systems Architect  
**Career Progression:** Software Engineer (2022–2024) → Senior Software Engineer (2024–2026) → Senior Systems Architect (Apr 2026–Present)  
**Links:** [sku20.dev](https://www.sku20.dev/) · [GitHub](https://github.com/sku0x20) · [LinkedIn](https://www.linkedin.com/in/sku20) · [Zenodo](https://doi.org/10.5281/zenodo.21717242)

---

## Platform Architecture & Technical Scope

* **Platform Architecture & Technical Ownership:**  
  Direct the end-to-end technical strategy and engineering roadmap for the platform. Autonomously drive system architecture: identifying foundational risks, conducting R&D spikes, making core infrastructure decisions, and executing zero-downtime database and platform migrations on live production traffic.
* **Infrastructure & Platform Governance:**  
  Hold administrative and architectural responsibility across the operational footprint: corporate domain and DNS governance (GoDaddy), Google Cloud Organization Administration (IAM policies, VPC topologies, and project lifecycles), on-prem staging bare metal, and production compute clusters.
* **Cloud FinOps & Infrastructure Economics:**  
  Directly responsible for infrastructure capacity planning and cloud spend. Analyzed historical utilization to structure a 3-year Google Cloud Committed Use Discount (CUD) that slashed compute costs; currently driving next-gen hardware migrations (legacy N1 to modern N4 instances) to maximize throughput per cloud dollar.
* **Cross-Team Technical Standards:**  
  Define and maintain platform data contracts, binary IoT transport protocols, kernel-level traffic routing, and architectural boundaries—authoring the technical specifications that firmware, hardware, mobile, and backend teams implement against.

---

## 2022 — Software Engineer | Sole Backend Ownership & Production Modernization

> **Operating Reality & Scope:**  
> I joined as Software Engineer and sole dedicated backend engineer. The only other backend contributor was a founding engineer splitting focus across Android and backend systems. There was no backend team to lean on, no deployment pipeline, and years of legacy infrastructure. I stepped into immediate, end-to-end ownership of backend architecture, delivery pipelines, and production reliability.

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
  Transformed an untestable legacy monolith into a modernized, maintainable platform where TDD became a first-class citizen across the team—cutting the new release over live onto production traffic via the kernel blue-green pipeline with zero downtime.

### Apple HomeKit Integration Spike: Protocol Forensics & HAP Bridging

* **The Exploration:**  
  Investigated bridging proprietary smart home devices natively into the Apple HomeKit ecosystem to evaluate local iOS control without cloud hops.
* **The Research & Implementation:**  
  Forked and adapted an open-source Java implementation of Apple's HomeKit Accessory Protocol (HAP). Deep-dived into the low-level mechanics: local mDNS/Bonjour discovery, cryptographic pairing exchanges (SRP and Curve25519), session encryption, and mapping custom device states to Apple's strict accessory characteristic schemas.
* **The Retrospective & Takeaway:**  
  While the spike was ultimately shelved due to hardware and commercial constraints, it provided early, invaluable exposure to strict protocol specifications, cryptographic handshakes, and local-first device networking.


## 2023 — Software Engineer | Inherited Firestorm & Production SRE Hardening

> **Operating Reality & Expanded Custody:**  
> In January 2023, the founding engineer departed, leaving me as the sole custodian of the entire backend, the production virtual machines, and cloud infrastructure. With no safety net, I was immediately thrust into heavy SRE firefighting—tackling cascading outages, resource starvation, and kernel bottlenecks while keeping feature development alive.

### Linux Systems Forensics: Surviving File Descriptor Depletion & I/O Starvation

* **The Crisis (SSH Lockouts & Degraded State):**  
  The production VM suffered recurring catastrophic failures where the backend hung in a degraded state, unable to allocate new threads or accept connections. In the worst cases, OS-level file descriptor depletion locked out incoming SSH sessions entirely, forcing emergency hard VM restarts.
* **The Root Cause & Diagnostics:**  
  Used a systematic systems profiling toolkit (`sar -b -dp`, `vmstat -w -t -d`, `iotop -b -a`, and `pidstat`) to untangle a compounded failure mode:
  1. *Log Flooding & I/O Wait Bottlenecks:* Uncontrolled log dumps were thrashing the disk, creating massive `iowait` states that starved worker threads of CPU execution.
  2. *Process Limit Inheritance Forensics:* Diagnosed that shell `ulimit` changes and `/etc/security/limits.conf` (PAM) were completely bypassed by daemons spawned via `systemd` or SSH sessions.
* **The Remediation:**  
  - Reconfigured `systemd` service unit limits (`LimitNOFILE=262144`), executed clean daemon reloads (`systemctl daemon-reload`), and verified live kernel process tables using `prlimit`.
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

### Platform Expansion: Multi-Hub Automations & Ecosystem Integrations

* **The Balancing Act:**  
  Alongside infrastructure firefighting, maintained product delivery: designed and shipped backend support for new IoT device types and cleaned up legacy API contracts.
* **Multi-Hub Automation Engine:**  
  Extended the core scene and rule automation engine to support **multi-hub environments**—handling nested scene fragments for large command payloads, multi-hub scene sync, and reliable scheduled execution.
* **Third-Party Ecosystem Integrations:**  
  Engineered and stabilized cloud-to-cloud voice integrations across **Google Home** and **Amazon Alexa** (OAuth flows, payload serialization correctness, and real-time device action handlers).

### Critical Production State-Sync Remediation (Cloud & Hub Data Divergence)

* **The Inherited Time Bomb:**  
  Discovered a severe, months-old bug originating from legacy code in the scene and rule synchronization engine between the cloud backend and IoT hubs. Flawed ID generation and state mapping caused silent divergence—rules configured in the mobile app were corrupting or failing to trigger reliably on physical hubs.
* **The High-Stakes Fix:**  
  Because thousands of active homes were running corrupted IDs, a naive code fix wasn't enough. I had to:
  1. Diagnose and rewrite the synchronization logic to guarantee deterministic ID mapping and conflict resolution.
  2. Author, test, and execute zero-downtime live production migration and state-reconciliation scripts across thousands of active homes without breaking customer automations or dropping hub connections.

### Architecture Research & Extreme Programming (XP) Foundations

* **Questioning Scalability Paradigms:**  
  Faced with scaling the single-server monolith, I conducted deep architectural research into horizontal scalability patterns: evaluating message brokers (Kafka vs. lightweight queues) for event streaming, and exploring container orchestration (Kubernetes) to understand trade-offs before jumping on hype trains.
* **Deepening Software Craftsmanship:**  
  Beyond frameworks, I immersed myself in Extreme Programming (XP) philosophies and London-style TDD. Working solo, I realized TDD was my only real safety net against regressions. I began restructuring code for true testability—isolating side effects, enforcing strict domain boundaries, and cultivating clean code practices.

### Cloud FinOps & Infrastructure Economics: 3-Year Committed Use Discount (CUD)

* **Direct Economic Ownership:**  
  With the founding engineer's exit, cloud cost management became my direct responsibility, reporting spend forecasts directly to the CEO. Unreserved on-demand VM billing was inflating monthly operational burn.
* **The Strategy & Commitment:**  
  - Conducted workload utilization analysis across CPU, memory, and networking to establish true minimum baseline requirements vs. variable peaks.
  - Negotiated and committed to a **3-year Google Cloud Committed Use Discount (CUD)** on core compute instances—locking in aggressive cost reductions for the company while guaranteeing production compute availability over a multi-year horizon.

## 2024 — Promoted to Senior Software Engineer | Security Hardening, Deep Profiling & Resilience

> **Operating Reality & High-Stakes Ownership:**  
> By 2024, my ownership spanned from daily database forensics and bug fixes to core infrastructure reliability. I transitioned from surviving production fires to proactively eliminating security vulnerabilities, profiling JVM runtime internals, and hardening automated recovery mechanisms.

### Zero-Trust Internal Tooling: `hlogger` (Go, mTLS & Custom PKI)

* **The Security Flaw:**  
  Firmware and hardware engineers frequently required real-time device communication logs to debug edge-case firmware behavior. Historically, this was solved by handing out direct SSH access to production Linux instances—a massive security risk and audit failure.
* **The Solution (`hlogger`):**  
  Built a secure, audited client-server diagnostic tool in Go using Mutual TLS (mTLS) to replace raw SSH access:
  - **PKI Architecture:** Designed a complete certificate hierarchy from scratch—Root CA, Intermediate CA, and per-developer client certificates with Certificate Revocation List (CRL) support.
  - **Auditing & Containment:** The server daemon enforced strict mutual authentication, logged all incoming commands and access timestamps, and streamed filtered device logs back to the client CLI without exposing an interactive shell.

### Production Network Recovery & Deployment Hardening

* **Incident Triage:**  
  Diagnosed and resolved a critical production network outage triggered by an interrupted `iptables` cutover state under high lag, directing real-time connection state recovery and restoring traffic routing under high pressure.
* **System Hardening & Idempotency Overhaul:**  
  Overhauled deployment tooling from scratch to eliminate race conditions and partial state corruption:
  - Made blue-green traffic cutovers strictly idempotent with atomic kernel routing table transactions.
  - Implemented automated pre-flight health checks verifying socket availability and connection drains prior to kernel routing mutation.
  - Built automatic fallback rules returning traffic to the active pool if cutovers fail mid-flight.

### JVM Deep Profiling & Garbage Collection Engineering

* **The Bottleneck:**  
  As device density grew, the Spring Boot backend began experiencing intermittent latency spikes and CPU churn during peak traffic windows.
* **Profiling & Forensics:**  
  Moved beyond guessing by instrumenting the runtime with **`async-profiler`**, **Java Mission Control (JMC)**, and **VisualVM**, generating flame graphs under live traffic:
  - Identified per-packet object allocation churn as a primary driver of young-gen GC pressure.
  - Mitigated churn using pooled buffers and `ThreadLocal` allocations for hot execution paths.
  - Tuned JVM garbage collection and memory geometry: pinned heap boundaries (`-Xms` = `-Xmx` at 4GB) to avoid OS page allocation latency and selected low-latency GC profiles to stabilize tail latency.
* **Hot-Path Zero-Allocation Formatting:**  
  Identified severe CPU hotspots within the core binary packet decoding loop driven by legacy `String.format` invocations; refactored hot paths to Java 17’s zero-allocation `HexFormat` and bitwise bit-shifting, drastically cutting per-packet CPU overhead.
* **Redis Client Architecture & Connection Forensics:**  
  Audited platform caching and Pub/Sub infrastructure: evaluated Redis client drivers (Jedis vs. Lettuce) to transition toward non-blocking asynchronous I/O, and debugged silent "ghost connection" leaks and poisoned connection pool states where hung socket connections cascaded into application timeouts.

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

### Device Provisioning Rewrite & Hardware Replacement Operations (Late 2024 – Early 2025)

* **The Problem:**  
  The legacy onboarding flow was heavily coupled with the monolith, prone to timeouts, and lacked clear assertion boundaries during WiFi pairing and node commissioning.
* **The Architecture & Rewrite:**  
  - Extracted and overhauled the provisioning logic: implemented robust node validation assertions and completely rewrote the WiFi onboarding state machine.
  - Designed and built the replacement flow for failed hardware nodes—allowing users and field technicians to swap defective physical devices seamlessly without losing room mappings, scenes, or automation rules.

### Consumer-Driven Contract Testing Spike: Pact (2024–2025)

* **The Architectural Exploration:**  
  Investigated **Consumer-Driven Contract Testing (Pact)** across 2024 and 2025 to establish bulletproof API safety between the cloud backend and the firmware delivery / OTA subsystem.
* **The Spike:**  
  Researched automated contract verification pipelines (`publish pact` → `can-i-deploy` → `release`), evaluating contract testing as an architectural safeguard to eliminate integration regressions before new firmware builds hit production.

## 2025 — Senior Software Engineer | Production Observability, Modern Infra & High-Performance Pipelines

> **Operating Reality & Architectural Transition:**  
> In 2025, the research from late 2024 materialized into production infrastructure. I moved the company away from single-node disk-dependent operations toward dedicated observability, declarative infrastructure, and purpose-built ingestion pipelines.

### Production Observability Rollout: Grafana & Loki (Retiring `hlogger`)

* **The Evolution:**  
  Having stabilized access security in 2024 with `hlogger`, the next step was eliminating disk logging entirely in favor of a centralized, real-time observability platform.
* **The Architectural Philosophy:**  
  Clarified a fundamental distinction often conflated: *"Is the service up?"* (external blackbox probes) vs. *"Why is the service struggling?"* (internal contextual metrics). While simple uptime checkers only see binary up/down states, real SRE requires correlating synthetic probes directly with internal resource pressure and traces.
* **The Implementation:**  
  - Provisioned and hardened a dedicated, isolated observability VM separate from production.
  - Deployed and tuned **Grafana**, **Loki**, and **Mimir** fed by **Alloy** (running Blackbox HTTP/TCP probes alongside database and application metrics exporters)—consolidating fragmented tools into a single, unified telemetry pipeline.
  - Managed all host configurations, scrape targets, log retention policies, and dashboards in a git-tracked directory—implementing a pragmatic GitOps / Infrastructure-as-Code (IaC) workflow where updates were deployed via version-controlled pulls rather than ad-hoc server mutations.
* **The Outcome:**  
  Gracefully retired `hlogger` and raw disk log dumping. The entire engineering organization (firmware, backend, mobile) gained instant, indexed query capabilities over real-time system logs without touching production hosts.

### High-Volume Telemetry Migration: ClickHouse, Delta+ZSTD Codecs & GCS Offloading

* **The Production Disk & Inode Crisis:**  
  The production VM was facing recurring disk exhaustion from years of accumulated device health telemetry and high-churn activity logs. The legacy storage architecture had a severe filesystem flaw: files were saved across deeply nested two-letter directory trees (`/aa/bb/cc/...`), causing catastrophic filesystem **inode bloat** where directory metadata consumed massive disk space and degraded I/O throughput.
* **The Migration & Codec Engineering:**  
  Having evaluated ClickHouse in late 2024, I engineered a zero-downtime live migration pipeline to ingest and archive multi-year historical telemetry out of the bloated filesystem into ClickHouse while live device streams continued uninterrupted:
  - **Optimized Partition-Level Backfilling & Restore:** Rather than running slow, memory-intensive `INSERT INTO` queries that would contend with live production traffic, engineered a partition-level restore and backfilling pipeline to populate historical data with zero system degradation.
  - **Schema & Codec Tuning:** Modeled columnar schemas (`device_health`, `pal_2024` activity logs, and `crm_logs`) with tight data types: `FixedString(23/29)`, `LowCardinality(String)`, and paired **Delta encoding** on sequential timestamps/metrics with **ZSTD compression**.
  - **Compression Breakthrough:** Slashed storage footprint by **over 95%**—compressing `device_health` telemetry from **17 GB down to just 300 MB** on disk, and overall raw files from ~100 GB to under 6 GB.
  - **Sparse Index Locality:** Designed composite primary keys ordered from low to high cardinality (`PRIMARY KEY (place_id, toStartOfDay(captured_at))`), maximizing block locality so ClickHouse's Generic Search Algorithm (GSA) skipped irrelevant blocks during range scans.
  - **Partition Backup & Restore Management:** Devised and owned end-to-end ClickHouse administration, engineering a partition-optimized backup and disaster recovery restore strategy (archiving and restoring yearly partitions to Google Cloud Storage) with zero operational downtime.
* **The Outcome:**  
  Purged legacy nested directory trees from the production VM, permanently reclaiming tens of gigabytes of disk space and eliminating inode exhaustion while retaining sub-second analytical queries over historical data with zero downtime throughout the entire migration.

### Ending "Testing in Production": On-Prem Staging Environment & Parity

* **The Dangerous Status Quo:**  
  Historically, the company had no staging environment. New backend changes, schema updates, and bug fixes were deployed and tested directly against live production systems—leading to high deployment churn, customer-facing bugs, and constant emergency hotfixes.
* **The Architecture:**  
  Configured a dedicated server within the office network behind a static public IP:
  - Mirrored production topology locally: configured the backend, databases, and dependencies to replicate production runtime conditions.
  - Established a strict deployment lifecycle: all new features, refactors, and migrations were promoted and verified on this staging environment before receiving a production release ticket.
* **The Impact:**  
  Dramatically reduced production redeployments and hotfixes. Edge cases were caught during staging verification, giving the team a safe sandbox for experimental features and stabilizing the release cycle.

### Decoupled Data Architecture: Go + gRPC Device Health Service (Encapsulating ClickHouse)

* **The Architectural Decision:**  
  While ClickHouse was the right engine for high-frequency device health telemetry, I refused to tightly couple the main Kotlin/Spring Boot monolith with ClickHouse drivers and analytical query logic.
* **The Solution:**  
  - Architected and built a standalone, lightweight **Go microservice** to own all ClickHouse interactions.
  - Implemented a binary **gRPC interface** between the main backend monolith and the Go health service—avoiding HTTP/JSON overhead and establishing a strict Protocol Buffers contract.
  - Deployed this service onto the dedicated auxiliary VM, completely isolating analytical ingestion workloads from transactional smart home traffic.

### SNode Architecture & The Git-Based Knowledge Base Revolution

* **The Architectural Challenge (Virtual Node Abstraction):**  
  The platform needed a way to aggregate disjoint physical hardware devices into unified logical entities—allowing users to club multiple independent hardware nodes (e.g., grouping multiple separate dimmers) into a single composite **Virtual Node** (a subtype of SNode) that behaves as one unified device. This triggered intense architectural debates between firmware, mobile, and cloud teams over state propagation, protocol contracts, and edge-case execution.
* **Architectural Leadership & Protocol Design:**  
  As the backend custodian, I was a primary technical decision-maker defining how SNodes would behave:
  - Designed the UDP protocol behavior, packet structure, retry semantics, and hardware constraint models.
  - Authored the backend implementation completely from scratch using a polymorphic type hierarchy, execute-only configurations, and strict validation to ensure disparate physical nodes acted cohesively.
* **Establishing the Company Knowledge Base:**  
  Prior to this, the company had zero centralized architectural documentation—everything lived in heads or scattered chats. I spearheaded and instituted a **Git-based Knowledge Base**: a version-controlled repository of technical specifications, protocol definitions, and API contracts that firmware and app engineers reviewed and built against before implementing features.

### Continuous Latency Optimization & Cloud Proactive Health Checks

* Shaved latency across core platform endpoints by eliminating redundant database queries and optimizing payload serialization.
* Reconfigured Google Cloud Monitoring with automated uptime checks and synthetic probes against backend health endpoints, enabling proactive alerting before customers or mobile apps detected latency spikes.

### Multi-Tier Rate Limiting & High-Ingestion Telemetry R&D

* **Defense in Depth (Nginx + Bucket4j):**  
  Protected the platform from traffic bombardment and abusive retry loops:
  - Configured reverse-proxy rate limiting in **Nginx** to throttle excessive requests at the network perimeter (returning HTTP 429).
  - Implemented token-bucket application rate limiting using **Bucket4j** inside the gRPC Activity Log service, ensuring fair scheduling and shielding internal database pools from client spikes.
* **Tackling Telemetry Cardinality: VictoriaMetrics & VictoriaLogs R&D:**  
  While Grafana Loki and Mimir served initial needs, they suffered from severe **high-cardinality bottlenecks**—in IoT environments with thousands of unique device IDs and dynamic event tags, label explosion causes excessive memory consumption, index bloat, and query degradation. I deployed and benchmarked **VictoriaMetrics** and **VictoriaLogs** on the staging setup to evaluate their cardinality-agnostic architecture, achieving significantly faster queries and vastly lower memory overhead under high-volume IoT log streams.

### Cloud-to-Cloud Integration: Yale Smart Locks (2025)

* **The Expansion:**  
  Integrated Yale smart locks natively into the cloud platform alongside existing voice assistants:
  - Designed and implemented the cloud-to-cloud integration with Yale’s OAuth backend.
  - Handled device state synchronization, access filtering, and real-time push notifications for remote lock and unlock events.

### Technical Recruitment & Engineering Standards (Late 2025 – 2026)

* **Hiring Framework & Rubric:**  
  Partnered with HR to establish the company's first structured technical Job Description and candidate evaluation rubric for backend systems.
* **Interviewing & Team Building:**  
  Designed practical coding assessments evaluating core systems thinking and TDD discipline, conducted engineering interviews, and successfully hired an engineer into the team.

## 2026 — Promoted to Senior Systems Architect | Declarative Cloud, Kernel Networking & Toolmaker

> **Operating Reality & Architectural Leadership:**  
> In April 2026, I was promoted to **Senior Systems Architect**. My mandate covers platform architecture, cloud infrastructure, kernel networking, and long-term technical strategy across IoT firmware, mobile interfaces, and distributed backends.

### Organization Administration & Compute Lifecycle: DNS & Compute (N1 → N4)

* **Administrative & Platform Governance:**  
  Manage foundational platform resources as Google Cloud Organization Administrator (IAM policies, project topologies, VPC networks, firewall rules) and administrator for corporate DNS zone files and domains via GoDaddy.
* **Compute Lifecycle & Next-Gen Hardware Migration (N1 → N4):**  
  As the 2023 3-year CUD agreement approached completion, I led the technical evaluation and capacity planning to migrate core production workloads from legacy Google Cloud N1 instances to next-generation **N4 machine types**—benchmarking instructions-per-cycle (IPC) gains, memory throughput, and optimizing cost-per-workload.

### Feature Flags Engine & Controlled Rollouts (2026)

* **The Problem:**  
  Releasing high-impact changes across cloud APIs and mobile/firmware devices carried high blast radii if unexpected edge cases emerged in the field.
* **The Solution:**  
  Engineered an internal, lightweight **feature flags system** directly into the backend:
  - Enabled dynamic runtime evaluation, percentage-based rollouts, and instant kill-switches.
  - Allowed firmware and mobile teams to dark-launch new capabilities and gate risky protocol features without requiring backend code redeployments.

### 100% Declarative Infrastructure for Marketing Website (Non-Core): Terraform / OpenTofu (Cloud Run & Cloud SQL)

* **The Scope & Isolation:**  
  Non-core public marketing website. The company's public marketing site was previously hosted on manually configured virtual machines, lacking clean isolation from core platform resources and declarative reproducibility.
* **The Solution:**  
  Decoupled the marketing site completely from core backend infrastructure into its own isolated Google Cloud project driven 100% by **Terraform / OpenTofu IaC**:
  - Executed a zero-downtime DNS and workload cutover, containerizing and migrating the marketing website onto serverless **Google Cloud Run** paired with managed **Google Cloud SQL (PostgreSQL)**.
  - Codified 100% of the project infrastructure in **Terraform / OpenTofu**—VPC networking, service accounts, IAM bindings, secrets, and database instances are fully declarative with zero manual cloud console mutations, ensuring marketing workloads have zero blast radius on core IoT backend systems.

### Bare-Metal Homelab & Cloud-Native Engineering (Proxmox, K8s, Nomad)

* **Preparing for Platform Containerization:**  
  To chart the company's future migration from single-server VMs to orchestrated containers, I built an on-prem bare-metal testbed running **Proxmox VE**:
  - Automated repeatable VM provisioning using `cloud-init` / `user-data` scripts.
  - Bootstrapped and benchmarked **Kubernetes clusters** from scratch—exploring **CNI** (Container Network Interface), **CSI** (Container Storage Interface), and **Pod Identities** (workload identity federation).
  - Evaluated **HashiCorp Nomad vs. Kubernetes (EKS)** to make a data-backed recommendation on operational complexity vs. ecosystem maturity for our IoT platform.

### Concurrency Overhaul: Dynamic IoT-Aware ThreadPool vs. ForkJoinPool

* **The Bottleneck:**  
  Default JVM concurrency models (like standard `ForkJoinPool` or fixed thread pools) struggled with the bursty nature of IoT packet bursts, either wasting memory on idle threads or inducing packet drops during sudden surges.
* **The Implementation:**  
  Replaced the legacy pool with a custom, load-adaptive **dynamic ThreadPool** that dynamically scales worker capacity in response to real-time incoming packet velocity and queue saturation.
* **Eliminating Technical Debt:**  
  Audited and pruned legacy architecture: eliminated obsolete dynamic TCP port provisioning flows, stripped redundant in-memory state tracking, and streamlined protocol paths.

### Low-Level Kernel Networking & Edge Protocol Translation

* **In-Kernel NAT64 & Dual-Stack Routing (Jool + `nftables`):**  
  Addressed a critical network partition where cellular IoT clients operated exclusively over IPv6 while backend systems ran on IPv4:
  - Ruled out enterprise services (Cloudflare Spectrum) and userspace reverse proxies (Nginx/HAProxy), which would drain CPU credits on burstable instances through double socket buffers and context switching.
  - Engineered an in-kernel translation gateway: deployed the **Jool** Linux kernel module for stateful NAT64 (RFC 7915) via Explicit Address Mapping Tables (EAMT) alongside `nftables` DNAT.
  - Partitioned non-overlapping source port ranges between Jool and `nftables` on the shared public IPv4 to eliminate port allocation collisions.
* **Kernel-Level Packet Reflection & Dynamic Rate-Limiting:**  
  - Offloaded UDP NAT traversal echo responses directly into the Linux kernel using `nftables` packet reflection at prerouting priority (`notrack`), bypassing userspace round-trips entirely.
  - Implemented kernel-level DDoS/abuse protection using `nftables` dynamic sets (`limit rate over 10/second burst 20 packets` at prerouting priority -301) to drop traffic sweeps before socket allocation.
* **Academic Preprint (Zenodo):**  
  Authored and published [*Connection-Agnostic Presence Tracking for Stateless Distributed Backends*](https://doi.org/10.5281/zenodo.21717242):
  - Formulated a Redis-based architecture using sorted sets scored by expiration deadlines and throttled batch writes to track IoT device online/offline transitions across stateless backends with mathematically bounded detection latency.

### Open-Source Toolmaking: Maven Central & Go Generics

* **`stopgap` (Microservice Framework on Maven Central):**  
  Synthesized years of backend lessons into a published microservice framework built on **Helidon SE (Nima) + Project Loom** virtual threads. Features compile-time dependency injection via **KSP** (zero runtime reflection) and a comprehensive three-tier testing model. Published to Maven Central at `dev.sku20.stopgap:*:2.8.0`.
* **`assertgo` (Go Generics Assertion Library):**  
  Deprecated the older `assertG` in favor of a complete rewrite leveraging modern Go generics—providing a fluent, type-safe, zero-dependency testing library for the Go community.

### Zero-Downtime Storage Architecture: Decoupling In-DB Payloads to Google Cloud Storage (GCS)

* **The Architecture Challenge:**  
  Legacy systems stored raw binary image payloads (Base64) directly inside primary MongoDB collections, degrading transactional throughput, ballooning nightly backup archives, and polluting WiredTiger cache memory with heavy document pages.
* **Multi-Phase Rollout & Dual-Write Strategy:**  
  Conceived, planned, and orchestrated a zero-downtime, multi-stage migration lifecycle coordinating mobile clients and backend services:
  - **Phased Dual-Write Rollout:** Designed dual-write API contracts and introduced a document-level guardrail flag (`imageMigrated`) to allow legacy mobile clients to update metadata without accidentally overwriting migrated GCS links with stale Base64 data.
  - **Asynchronous Backfill & Caching:** Engineered an asynchronous extraction pipeline to stream decoded blobs to GCS with automatic stream MIME sniffing and immutable HTTP caching headers (`Cache-Control: public, max-age=31536000, immutable`), handling corrupted legacy payloads with clean asset fallbacks.
  - **Graceful Cutover & Database Purge:** Maintained backward-compatibility across a 2–3 day mobile rollout buffer (~99% adoption), then executed a second deployment deprecating legacy Base64 endpoints and running MongoDB `$unset` operations to purge all legacy blobs and migration flags.
* **The Measurable Outcome:**  
  Zero customer downtime across live production. Reduced primary database size by **54x** (3.6 GB &rarr; 67 MB, cutting backup sizes by 98%), shrank runtime server memory footprint by **89%** (4.6 GB &rarr; ~500 MB), and eliminated Base64 encoding overhead across all entities.


### Production Database Administration (MongoDB): Schema Refactoring & Compound Index Optimization

* **The Challenge (Sustained Heavy-Load Production):**  
  As IoT write velocity and active homes surged, the primary production MongoDB cluster faced elevated disk I/O and memory pressure in the WiredTiger cache caused by legacy schema anti-patterns and accumulated index sprawl.
* **Query Plan Audits & Index Hygiene:**  
  Profiled live production query traffic using `explain` execution stats and slow query logs. Audited and pruned redundant, low-selectivity, and duplicate indexes that were imposing heavy write overhead on high-frequency IoT inserts and wasting working-set RAM.
* **Compound Key Engineering & Schema Optimization:**  
  - Engineered selective compound indexes applying strict key ordering (Equality, Sort, Range — ESR pattern), ensuring high-frequency queries were satisfied entirely within index trees and eliminating expensive collection scans and in-memory sorts.
  - Refactored legacy document schemas to curb unbounded growth and eliminate fragmented on-disk document allocations.

---

## Open-Source Systems & Research Projects

* **[stopgap](https://github.com/sku0x20/stopgap) (Kotlin · Published to Maven Central):**  
  Modern microservice framework built on **Helidon SE (Nima) + Project Loom** virtual threads. Features compile-time dependency injection via **KSP** (eliminating runtime reflection overhead) and an integrated three-tier testing harness (unit &rarr; in-process integration server &rarr; Docker E2E via Testcontainers). Published at `dev.sku20.stopgap:*:2.8.0`.
* **[assertgo](https://github.com/sku0x20/assertgo) (Go):**  
  Type-safe testing assertion library built with modern Go generics. Provides a fluent API, chainable negation (`Not()`), custom matchers, and zero external dependencies.
* **[relay](https://github.com/sku0x20/relay) (Zig):**  
  Low-level TCP server implemented in pure Zig with a test-driven approach. Explores raw POSIX socket descriptors, manual memory management without libc runtime dependencies, port binding (`SO_REUSEADDR`), and preventing broken-pipe crashes (`SIGPIPE` suppression via `MSG_NOSIGNAL`).
* **[hrh](https://github.com/sku0x20/hrh) — Helm Release Helper (Rust):**  
  Engineered during Kubernetes orchestration research to enable lean, declarative Helm releases without the bloat of heavy operators. Reads declarative YAML declarations and executes `helm upgrade --install` with diff previews and atomic rollback guarantees. Available via `cargo install`.
* **[avoid](https://github.com/sku0x20/avoid) (Shell / Linux):**  
  Minimal, purpose-built Linux distribution based on Void Linux for server recovery and lean headless appliances. Builds and publishes bootable `.img.gz` and `.qcow2` images via automated GitHub Actions pipelines.
* **[c_oop](https://github.com/sku0x20/c_oop) (C):**  
  Deep systems spike exploring Object-Oriented Programming and London-style TDD in pure C (written entirely pre-AI). Implements struct polymorphism via function-pointer interface tables, heap-allocated lifecycle constructors, and isolated unit test harnesses.

---

## Technical Thought Leadership & Forensic Systems Writing

Authored 20+ in-depth technical post-mortems and distributed systems essays published at **[sku20.dev/blog](https://www.sku20.dev/blog)**, including:
* **Kernel Networking & Edge Routing:** *Betting on NAT64 Over a Proxy*, *Negotiating with Jool*, *Low-Level UDP Echo Server for NAT Traversal via nftables*, and *Zero-Downtime Deployments with iptables*.
* **Concurrency & JVM Internals:** *The 100ms Password*, *Java Exceptions Swallowed: The ThreadPool Trap*, *ThreadLocal Optimizations and Project Loom*, and *Optimizing Hex Formatting: String.format to Java 17 HexFormat*.
* **Distributed Systems & Database Reliability:** *Decoupling Blobs: A Zero-Downtime Migration from MongoDB to GCS*, *The Ghost Connection: Poisoned Redis Pub/Sub Connection Pools*, *Rate-Limiting: Flow Control vs. Quota Control*, and *Hunting for a UDP Load Balancer*.

---

## Publications & Preprints

* **[Connection-Agnostic Presence Tracking for Stateless Distributed Backends](https://doi.org/10.5281/zenodo.21717242)**  
  *Preprint · Zenodo (v1.3.0)*  
  Formulates a Redis-based architecture for real-time presence tracking across distributed, stateless backend nodes. Employs sorted sets scored by expiration deadlines, throttled batch synchronization, and asymmetric fault-tolerance guarantees ensuring offline transitions are never lost while mathematically bounding worst-case detection latency.

---

## Education

* **Bachelor of Computer Applications (BCA)**  
  *2019 – 2022*

---

## Technical Competencies

* **Languages:** Kotlin, Java, Go, Rust, Zig, C, Shell, SQL
* **Frameworks & Architecture:** Spring Boot, Helidon SE (Nima), Project Loom, gRPC, Protocol Buffers, REST
* **Cloud & Infrastructure:** Linux (Debian, Ubuntu), Google Cloud (Cloud Run, Cloud SQL, GCS, VPC), AWS (EKS), Terraform, Docker, Proxmox VE, GitHub Actions, Bitbucket Pipelines
* **Databases & Storage:** ClickHouse, MongoDB, PostgreSQL, Redis
* **Observability & SRE:** Grafana, Loki, Prometheus, VictoriaMetrics, VictoriaLogs, `async-profiler`, JMC, VisualVM, Flame Graphs, `sar`, `vmstat`, `iotop`
* **Networking & Protocols:** Socket programming (TCP/UDP), `iptables`, `nftables`, NAT traversal / hole-punching, mTLS & PKI (Root/Intermediate CA, CRL)
* **Testing & Methodology:** Extreme Programming (XP), London-Style TDD, Consumer-Driven Contract Testing (Pact), Testcontainers, Test Slices














