---
Status: SUPPORTING — Secure SDLC evidence (Tranche D)
Authority: capability §15; US-IMP-038-006
Compliance claim: NONE
---

# Secure SDLC evidence

Parent index: [`../README.md`](../README.md)

| Control | Gate / entrypoint | Evidence |
|---|---|---|
| SAST | CodeQL `javascript-typescript` | `.github/workflows/codeql.yml` |
| SCA | `npm audit` High+ fail-closed | `npm run audit:npm-sca` → `scripts/audit-npm-sca.mjs` |
| Secrets | gitleaks (pinned OSS binary) | `npm run audit:secrets` → `scripts/run-gitleaks.mjs` |
| Containers | Trivy **production image** scan CRITICAL+HIGH (pinned binary; `--ignore-unfixed`; `.trivyignore`) | `npm run audit:container` → `scripts/run-trivy.mjs`; CI `security-sdlc` |
| Combined local | SCA + secrets | `npm run audit:security-sdlc` |
| Actions pinning | Commit SHA pins | Comments / pins in `.github/workflows/*.yml` |
| Dependency updates | Dependabot weekly | `.github/dependabot.yml` |
| Exceptions | Founder-authorized, expiring | [`../vulnerability-exception-register.md`](../vulnerability-exception-register.md) |
| Domain audits | Existing mutation/config/authz audits | `scripts/audit-*.mjs` (auth, access-control, payment, …) |
| CI contract | Job wiring | [`../../testing/CI-JOB-CONTRACT.md`](../../testing/CI-JOB-CONTRACT.md) |

```text
UNRESOLVED_CRITICAL_AT_ACCEPTANCE: ZERO
KNOWN_EXPLOITABLE_HIGH: NO_SILENT_ACCEPTANCE
INDEPENDENT_EXTERNAL_ASSESSMENT: REQUIRED (separate — GAP-EXT-ASSESS-001)
```
