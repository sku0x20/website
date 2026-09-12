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



