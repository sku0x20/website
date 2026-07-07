# Open Source Contributions — External Repos

## Merged

### quarkusio/quarkus — Docs contribution (Oct 2024)
`https://github.com/quarkusio/quarkus/pull/43873`

Added a section to `getting-started-testing.adoc` on mixing `QuarkusTest` and `QuarkusIntegrationTest`. Filed in response to two open issues (#43796, #43804). **Merged.**

Context: found a gap in Quarkus docs while evaluating it for work (before building stopgap). Fixed the docs rather than just moving on.

---

### pidario/openssl-ca — Config fix (Jun 2023)
`https://github.com/pidario/openssl-ca/pull/1`

Fixed missing `s` in `copy_extensions` config name in CA_default section — without it, OpenSSL CA doesn't copy extensions from the CSR. **Merged.**

Context: found this while building the Go TLS server with custom CA + CRL support for eGlu.

---

### Hexworks/zircon — Bug fix (Aug 2020)
`https://github.com/Hexworks/zircon/pull/322`

Fixed `MouseEventType.MOUSE_WHEEL_ROTATED_UP` and added mouse event handlers in `ScrollBarExample.kt`. **Merged.**

Zircon is a Kotlin terminal game UI library. Early career contribution.

---

## Open

### unmeshjoshi/replicate — Build fix (Nov 2024)
`https://github.com/unmeshjoshi/replicate/pull/5`

Pass UTF-8 encoding to Gradle JVM to fix `unmappable character` compile errors on Windows. Still open.

Context: `replicate` is Unmesh Joshi's distributed systems teaching repo (Patterns of Distributed Systems). He was studying this — ties to his interest in distributed systems and DDIA.

---

### google-developer-training/advanced-android-testing — Fix (Jun 2021)
`https://github.com/google-developer-training/advanced-android-testing/pull/260`

Fix for issue #174 in Google's Android testing codelab. Still open (codelab repos often have stale PRs).

Early career — during Android learning phase.

---

## Notes

- Small number but all are real fixes/contributions (not trivial typos, except the `copy_extensions` one which is actually a config correctness issue)
- The Quarkus docs PR is the most notable — contributing to a major OSS framework's official docs
- The `replicate` connection to Unmesh Joshi / Patterns of Distributed Systems is worth noting — shows active engagement with the distributed systems learning community
