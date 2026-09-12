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


