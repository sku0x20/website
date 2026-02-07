# Siddhant
**Backend & Infrastructure Engineer**
[sku20.dev](https://www.sku20.dev/) | [github.com/sku0x20](https://github.com/sku0x20) | [siddhantkumarupmanyu@gmail.com] | +91 8383056329

---

### **Professional Summary**
**Backend & Infrastructure Engineer** focused on solving complex technical challenges with practical, reliable solutions. I bring 4 years of experience taking full ownership of backend and cloud systems, from **architectural research** to **production troubleshooting**. Passionate about **emerging data technologies** and **data-intensive workloads**. Proven track record of leveraging new technologies (ClickHouse, EKS) to drive efficiency, including a **95%+ reduction** in storage costs. I am now seeking to join a collaborative engineering team where I can contribute my **hands-on problem-solving approach** while **learning from senior mentorship** and solving problems at scale.

---

### **Experience**

**Backend & Infrastructure Engineer** | **WiZNSystems**
*March 2022 – Present*

*Served as the **Sole Backend & Infrastructure Lead**, managing the complete lifecycle of product development, cloud deployment, and system reliability.*

**Cross-Functional Leadership & Collaboration**
*   **Mentorship & Hiring:** Lead the technical recruitment process, designing comprehensive **coding challenges** ([github.com/sku0x20/recruitment](https://github.com/sku0x20/recruitment)). Provide **cross-team mentorship** and architectural guidance to developers across the organization, ensuring consistency in system design and best practices.
*   **Product Partnership:** Collaborate daily with **Product Managers** to refine requirements, explain technical constraints, and propose architectural alternatives to meet business goals.
*   **API Design & Integration:** Designed and implemented highly scalable REST/gRPC APIs in close collaboration with **Frontend and App Developers**, ensuring optimal data flow and handling technical trade-offs across multiple client platforms.

**Infrastructure & DevOps**
*   **Zero-Downtime Deployments:** Implemented a practical blue-green deployment strategy using **iptables** to manage traffic routing, ensuring 100% uptime during releases without complex load balancer setups.
*   **Network Engineering:** Understanding of **TCP/UDP protocols** and networking fundamentals, gained through developing and maintaining products operating on raw network sockets. Optimized system throughput by tuning kernel parameters.
*   **CI/CD Pipeline:** Built and maintained GitHub Actions pipelines for automated testing, building, and deployment, significantly reducing release friction.
*   **Infrastructure Modernization (In Progress):** Refactoring legacy codebase while adding features and **architecting scalable systems** using **AWS EKS**, **Kafka**, and **Terraform**. Prototyped HashiCorp Nomad prior to selecting EKS.
*   **Linux Troubleshooting:** Maintained system stability by tuning kernel parameters and diagnosing production issues using standard Linux tools like `sar`, `strace`, `tcpdump`, `vmstat`, and `iotop`. Successfully performed major OS upgrades (Debian/Ubuntu) in live production environments.

**Backend Architecture & Performance**
*   **JVM Performance & Profiling:** Leveraged **async-profiler, JMC, VisualVM, and IntelliJ Profiler** to identify and optimize hot code paths via **Flame Graphs**. Reduced latency and improved throughput by implementing **ThreadLocal** for costly initializations, optimizing caching strategies, and reducing unneeded code on hot paths.
*   **Memory & Latency Optimization:** Analyzed **allocation profile data** to minimize object allocations and tuned JVM parameters (GC, heap, stack) to optimize performance. Utilized **wall-clock profiling** to eliminate latency bottlenecks in high-concurrency scenarios.
*   **Microservices & gRPC:** Decoupled legacy monolithic components into independent microservices, utilizing **gRPC** for high-performance inter-service communication.
*   **Legacy Modernization (TDD Driven):** Refactored and migrated the core monolithic backend from Spring 4 to **Spring Boot 2.7+**, breaking down legacy code into modular components using **100% test-driven development (TDD)** to prevent regressions.
*   **Data Optimization & ClickHouse Migration:** Designed and executed a binary data migration to **ClickHouse**, rewriting core data ingestion services from Kotlin to **Go** to maximize throughput and efficiency. Utilized specialized codecs and schema optimization to achieve massive storage reductions across production datasets:
    *   **Dataset A:** Reduced from **90GB to 3.7GB** (95.8% reduction).
    *   **Dataset B:** Reduced from **25GB to 780MB** (96.8% reduction).
*   **Observability & Log Management:** Migrated legacy disk-based logging to **Loki**, significantly reducing **disk I/O pressure** and improving searchability via Grafana. Implemented comprehensive monitoring with **Prometheus**, drastically reducing mean-time-to-recovery (MTTR).
*   **Security:** Currently redesigning the Authentication and Authorization framework to meet modern security standards, utilizing TDD to validate complex permission logic.

**Independent Technical Leadership**
*   **Research & Decision Making:** Responsible for evaluating and selecting technical solutions suited for the company's scale. Evaluated and rejected **Kafka** as overkill; prototyped **HashiCorp Nomad** before selecting **EKS**; independently drove the adoption of **ClickHouse** for analytics.
*   **GCP Cost & Storage Optimization:** Reduced cloud spend by implementing lifecycle policies for storage buckets (Standard vs. Coldline/Archive) and configuring automated disk snapshots for disaster recovery.
*   **Database Management:** Managed production **MongoDB** (currently standalone), planning a zero-downtime migration to a **Replica Set** for high availability.

---

### **Key Projects & Open Source**

*   **assertG** ([github.com/sku0x20/assertG](https://github.com/sku0x20/assertG)): A lightweight, fluent assertion library for **Go**, developed to enable **AssertJ-style testing patterns** in the Go ecosystem.
*   **Relay** ([github.com/sku0x20/relay](https://github.com/sku0x20/relay)): High-performance networking experiments using **Zig**, focusing on low-level memory management and speed, validated through rigorous unit testing.
*   **Stopgap** ([github.com/sku0x20/stopgap](https://github.com/sku0x20/stopgap)): A **fully TDD-developed** microservice kotlin template built with **Helidon SE** and Virtual Threads. Selected Helidon SE after evaluating Quarkus/Micronaut to achieve maximum control and simplicity, bypassing Netty for a lightweight, high-performance architecture.
*   **K8s & Terraform Configs**: Public repositories demonstrating best-practices for Infrastructure as Code and Kubernetes manifest management.

---

### **Technical Skills**

*   **Languages:** Kotlin, Java, Go, Shell Scripting, Zig (Experimental), Python.
*   **Infrastructure:** Kubernetes (EKS), Docker, Terraform, Kafka (Researching), Shell Scripting, Linux (Debian/Ubuntu).
*   **Databases:** ClickHouse (High Performance), PostgreSQL, MongoDB, Redis.
*   **Observability & Profiling:** Grafana, Loki, Prometheus, **async-profiler**, **JMC**, **VisualVM**, **IntelliJ Profiler**, Flame Graphs.
*   **Networking & RPC:** **gRPC**, Protocol Buffers, TCP/UDP, Socket Programming.
*   **Methodologies:** **TDD**, Clean Architecture, CI/CD, GitOps, Microservices. Actively Researching **High-Performance Data Systems** (ScyllaDB, VictoriaMetrics, TigerBeetle).

---

### **Education & Continuous Learning**

* **Computer Science & Engineering** | Undergraduate Coursework
* **Independent Research & Self-Directed Learning:** Deeply self-motivated learner with a relentless curiosity for
  systems engineering. Continuously mastering new technologies and paradigms (Go, Zig, Distributed Systems) through
  deep-dives into documentation, RFCs, and hands-on experimentation.



