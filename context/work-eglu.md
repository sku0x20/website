# Work Context — eGlu Smart Homes (WiZNSystems)

## The Product

Smart home automation platform — lighting control, device scenes/rules, mobile apps, IoT hubs and nodes.

**Hardware:**
- Hubs — WiFi-connected central controllers in homes
- Nodes — smart devices (lights, switches, DALI dimmers)
- A newer special node type (significant product line)
- Repeaters — mesh network extenders
- Smart lock integration (cloud-to-cloud)

**Software stack:**
- Main cloud backend (Kotlin + Spring Boot)
- gRPC inter-service layer (Kotlin)
- Device health service (Go + ClickHouse)
- OTA firmware delivery service (Kotlin + SolidJS)

**Third-party integrations:** Google Home, Alexa, Yale smart locks

---

## Contribution Scale

~5,000+ commits across org repos. Primary backend engineer and architect.

- Main backend: 4,395 commits, 70+ PRs merged
- Deployment configs: 238 commits
- gRPC service: 208 commits, 16 PRs
- Device health service: 100 commits
- API contracts (internal knowledgebase): 30 PRs

---

## Technical Domains Owned

### 1. Hub Communication Protocol
Custom binary protocol over UDP/TCP between IoT hubs and cloud. NAT hole punching. Hub online/offline state machine with race condition handling. Connection tracking.

### 2. Scene & Rule Engine
Multi-hub scene automation: nested scene fragments, scene sync, local loop creation, access control. IFTTT-style rules, cloud scheduling for advanced rules.

### 3. Device Provisioning
Full refactor extracted from monolith. Hub setup, node validation, WiFi flow rewrite, replacement flow for failed nodes, DALI sub-type handling.

### 4. New Node Type (SNode)
Designed and built the new smart node product line end-to-end: polymorphic type hierarchy, execute-only settings, retry logic, feature mapping.

### 5. Security & Auth
OAuth, security chain refactoring, TLS client auth with custom CA + certificate revocation list. Special accounts management.

### 6. Third-party Integrations
- **Google Home**: SYNC response, device actions, serialization correctness
- **Alexa**: notification processor
- **Yale**: cloud-to-cloud integration, filtering, notifications, OAuth backend

### 7. Performance & Reliability
- ThreadPool wrapper with structured error handling
- Redis client evaluation and migration
- Rate limiting
- Hub connection threading fixes
- Rule log optimization

### 8. Data & Observability
- Go service for device health metrics in ClickHouse (YAML config, CLI, E2E tests)
- Feature flags system
- Activity log migration to ClickHouse (planned)
- Loki HA (planned)

### 9. API Contract Design
Authors API contracts for the entire platform — scene/rule contracts, provisioning, OTA, repeater APIs, feature flags, app status, smart lock c2c, favourites, managed rules. App and firmware teams depend on these specs before building.

### 10. Deployment & Infra
Production and staging deployment configs. Shell-based deploy automation. GitHub release management.

---

## Product Domain Knowledge

- **DALI** — Digital Addressable Lighting Interface (building automation lighting protocol)
- **IoT mesh networking** — hub-repeater topology, mesh signal propagation
- **Smart home protocols** — custom binary over UDP, HTTP REST, gRPC
- **Home automation patterns** — Scenes, Rules, Favourites, Room/Place hierarchy

---

## Engineering Leadership Signals

Files and tracks his own architectural improvement issues:
- Protocol correctness improvements
- Data migrations (disk → ClickHouse)
- Simplifications (removing unnecessary state tracking, simplifying flows)
- Infra work (HA logging, SMS gateway)
- Technical debt tracking

Doesn't just execute tasks — identifies and drives systemic improvements.
