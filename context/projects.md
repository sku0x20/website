# Projects — sku0x20

## Active / Significant

### stopgap (Kotlin, ~872 commits, Maven Central)
`github.com/sku0x20/stopgap`

High-performance Kotlin microservice framework built on Helidon SE (Nima) 4.x + Project Loom.

Key aspects:
- **ir (Instance Registry):** Custom DI system with KSP compile-time codegen — no runtime reflection.
- **helidon-extensions:** Routing annotations, KSP codegen for routes, param binding, serde layer.
- **helidon-test:** JUnit 5 extensions for integration and E2E testing (spins real webserver in-process, or Docker for E2E).
- **gradle-plugin:** Wires the full build pipeline.
- Published to Maven Central: `dev.sku20.stopgap:*:2.8.0`
- Virtual thread native. Blocking handlers on Loom threads — no async mess.

This is the most serious/mature open-source project. Shows: framework design, KSP codegen, testing architecture, DI without magic.

---

### assertgo (Go, ~285 commits in 2026)
`github.com/sku0x20/assertgo`

Second iteration assertion library for Go. Typed, fluent, generics-based.

```go
T(t).Assert("hello").EqualTo("hello")
T(t).AssertInt(10).GreaterThan(5)
T(t).AssertSlice([]int{1,2,3}).ContainsAll([]int{1,3})
T(t).AssertType(42).Is[int]()  // generics
```
Has CI. Supersedes assertG.

---

### assertG (Go, ~202 commits)
`github.com/sku0x20/assertG`

First iteration. Fluent AssertJ-style assertions for Go. Slice support, custom comparators. Still used/maintained.

---

### relay (Zig, ~112 commits)
`github.com/sku0x20/relay`

TCP server implementation in Zig. Low-level socket programming, raw memory management. TDD approach. Exploring: MSG_NOSIGNAL, SIGPIPE handling, port binding.

Shows: systems programming mindset, willingness to go down to metal.

---

### hrh (Rust, ~58 commits)
`github.com/sku0x20/hrh`

Helm Release Helper — CLI tool (Rust) that reads a YAML Helm release declaration and invokes `helm upgrade --install`. v1.4.0.

Features: diff mode (`--diff`), `--atomic` flag, chart versioning, relative valuesFile resolution, DEBUG logging.

Install via `cargo install`. Shows: Rust CLI development, practical DevOps tooling.

---

### avoid (Shell, ~140 commits)
`github.com/sku0x20/avoid`

Custom minimal Linux distro based on Void Linux. Targets servers, build machines, live recovery disks.

Releases: `avoid.img.gz` (raw disk, dd to USB/Ventoy) and `avoid.qcow2` (QEMU/KVM). Build scripts included.

Shows: deep Linux knowledge, from-scratch OS configuration, bootloader/disk image tooling.

---

### virtualization (HCL, ~249 commits)
`github.com/sku0x20/virtualization`

VM provisioning configs. Includes minimal-linux lab (linked to avoid). QEMU/KVM focused.

---

### c_oop (C, ~150 commits)
`github.com/sku0x20/c_oop`

OOP in pure C — London-style TDD in C. Explores polymorphism via interfaces, LSP compliance, struct-based objects with method pointers, heap-allocated objects with constructors and free methods. v5.0.0, has CI.

Shows: first principles understanding of OOP, discipline beyond language features.

---

### k8s-config (HCL, ~89 commits)
`github.com/sku0x20/k8s-config`

Production Kubernetes manifests and IaC (Terraform/HCL).

---

### terraform-configs (HCL, ~225 commits)
`github.com/sku0x20/terraform-configs`

Infrastructure as Code — Terraform configurations for cloud infra.

---

### eGlu.tech blog (Astro/JS, ~204 commits in 2026)
`github.com/eGlu-tech/eGlu-tech.github.io`

Personal/company blog. Built with Astro, "Vanilla Web" philosophy — no Tailwind, no heavy frameworks, standard Web APIs + Vanilla CSS. Dark stone + amber aesthetic. Technical writing.

---

### llcc (TypeScript/Bun, ~31 commits)
`github.com/sku0x20/llcc`

Lat/lon → country code microservice. Dockerized, uses Bun runtime.

---

### gRunner (Go, ~49 commits)
`github.com/sku0x20/gRunner`

Task runner tool in Go.

---

### fake-server-js (JavaScript, ~26 commits)
`github.com/sku0x20/fake-server-js`

Flexible mock server for JS testing.

---

## Older / Learning Repos

- **go-spikes** — Go experiments
- **zig-spikes** — Zig experiments  
- **aws-workshop** (Shell, ~150 commits in 2025) — AWS learning
- **flutter_spike_state_management** (Dart/C++, 216 commits in 2023) — Flutter state management deep-dive
- **sudoku** (Rust, 2023) — Rust learning project
- **openssl-ca** (Python, 2023) — PKI/TLS exploration
- **request-generator** (Kotlin, 2022) — KSP annotation processor for HTTP request classes
- **grpc-protocol_buffers** (Kotlin, 2022) — gRPC/Protobuf learning
- **MapAny-kotlinx-serialization** (Kotlin) — kotlinx.serialization extension
- **observability-configs** (Kotlin) — Prometheus/Loki/Grafana setup
- **no-libc** (C) — bare-metal C without stdlib
- **meson-c-template** (C) — C project template using Meson build system
