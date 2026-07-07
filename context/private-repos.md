# Private Work Projects — Context

## OTA Firmware Delivery System (Kotlin + SolidJS)

Full-stack firmware management system for IoT devices.

**Backend (Kotlin):**
- Device registry, firmware upload/management, cloud storage bucket management, firmware-to-device mapping
- Three-tier testing: unit → integration (real DB) → E2E (full lifecycle)
- Typed exception hierarchy

**Frontend (SolidJS + Playwright + Vitest):**
- SolidJS (not React) — consistent with minimal/no-magic philosophy
- Playwright for E2E, Vitest for unit/component
- Uses fake-server-js (own library) for mock server in tests
- Consumer-Driven Contract Tests with Pact

**Consumer-Driven Contract Testing (Pact):**
Full CI pipeline: consumer builds and publishes pact → `can-i-deploy` check → release → mark deployed. Provider verifies against deployed consumer pact version. Enterprise-level testing discipline.

**CI/CD:** GitHub Actions, PR-based workflow, fast-forward merges only, separate release pipelines per service.

**What this reveals:**
- Does full-stack when needed
- Consumer-Driven Contract Testing is real workflow, not just knowledge
- Evaluated Quarkus for this before building stopgap

## Other

- **bookmarks**: Personal browser bookmark sync utility. Not professional context.
- **animated-chat**: Animated chat UI prototype (2023). Audio messages, SCSS. Frontend experiment.
