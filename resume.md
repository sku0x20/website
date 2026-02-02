# Siddhant
**Backend & Infrastructure Engineer**
[sku20.dev](https://www.sku20.dev/) | [github.com/sku0x20](https://github.com/sku0x20) | [siddhantkumarupmanyu@gmail.com] | +91 8383056329

---

### **Professional Summary**
**Backend & Infrastructure Architect** with 4 years of experience as the **Sole Technical Lead** for end-to-end cloud systems. Expert in **Self-Driven Research & Execution**—independently evaluating, architecting, and implementing complex migrations (Spring 4→Boot 2.7, Disk→ClickHouse) without senior guidance. Deep expertise in **Linux Internals**, **GCP Cost Optimization**, and **System Stability**. Proven track record of reducing storage costs by **98%** and engineering custom zero-downtime solutions when standard tools didn't fit the constraints.

---

### **Experience**

**Backend & Infrastructure Engineer** | **WiZNSystems**
*March 2022 – Present*

*Served as the **Sole Backend & Infrastructure Lead**, managing the complete lifecycle of product development, cloud deployment, and system reliability.*

**Infrastructure & DevOps**
*   **Zero-Downtime Deployments:** Engineered a custom blue-green deployment strategy using **iptables** to manage traffic routing, ensuring 100% uptime during releases without a load balancer.
*   **Performance & Network Tuning:** Optimized system throughput by tuning **TCP/UDP kernel parameters** and `ulimits`, ensuring stability for data-intensive workloads.
*   **CI/CD Pipeline:** Built and maintained GitHub Actions pipelines for automated testing, building, and deployment, significantly reducing release friction.
*   **Infrastructure Modernization (In Progress):** Currently architecting a migration from Docker Compose to **AWS EKS** (Managed Kubernetes) and **Terraform** to improve scalability and reproducibility. Evaluated HashiCorp Nomad prior to selecting EKS.
*   **Linux Administration:** Deepened system stability by tuning kernel parameters (`ulimits`) and performing advanced performance analysis using `sar`, `strace`, `tcpdump`, `vmstat`, and `iotop`. Successfully performed major OS upgrades (Debian/Ubuntu) in live production environments.

**Backend Architecture & Performance**
*   **Legacy Modernization (TDD Driven):** Led the migration of the core monolithic backend from Spring 4 to **Spring Boot 2.7+**, refactoring legacy code into modular, testable components with **100% test-driven development (TDD)** to ensure zero regressions.
*   **Data Optimization & ClickHouse Migration:** Architected a high-performance binary data migration to **ClickHouse**, utilizing specialized codecs and schema optimization to achieve massive storage reductions across production datasets:
    *   **Dataset A:** Reduced from **90GB to 1.1GB** (98.7% reduction).
    *   **Dataset B:** Reduced from **25GB to 650MB** (97.4% reduction).
*   **Observability & Log Management:** Migrated legacy disk-based logging to **Loki**, significantly reducing **disk I/O pressure** and improving searchability via Grafana. Implemented comprehensive monitoring with **Prometheus**, drastically reducing mean-time-to-recovery (MTTR).
*   **Security:** Currently redesigning the entire Authentication and Authorization framework to meet modern security standards, utilizing TDD to validate complex permission logic.

---

### **Key Projects & Open Source**

*   **assertG** ([github.com/sku0x20/assertG](https://github.com/sku0x20/assertG)): A lightweight, fluent assertion library for **Go**, developed to enable **AssertJ-style testing patterns** in the Go ecosystem.
*   **Relay** ([github.com/sku0x20/relay](https://github.com/sku0x20/relay)): High-performance networking experiments using **Zig**, focusing on low-level memory management and speed, validated through rigorous unit testing.
*   **Stopgap** ([github.com/sku0x20/stopgap](https://github.com/sku0x20/stopgap)): Exploration of **Java Virtual Threads** (Project Loom) to improve concurrency models in high-throughput applications.
*   **K8s & Terraform Configs**: Public repositories demonstrating best-practices for Infrastructure as Code and Kubernetes manifest management.

---

### **Technical Skills**

*   **Languages:** Kotlin, Java (Spring Boot), Go, Shell Scripting, Zig (Experimental), Python.
*   **Infrastructure:** Kubernetes (EKS), Docker, Terraform, Shell Scripting, Linux (Debian/Ubuntu).
*   **Databases:** ClickHouse (High Performance), PostgreSQL, MongoDB, Redis.
*   **Observability:** Grafana, Loki, Prometheus, vmstat, iotop.
*   **Methodologies:** **TDD (Test Driven Development)**, Clean Architecture, Actively Exploring **DDD (Domain Driven Design)**, CI/CD, GitOps.


