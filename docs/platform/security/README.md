---
Status: SUPPORTING — IMP-038 Secure SDLC evidence index
Authority: docs/platform/capabilities/IMP-038-security-privacy-hardening.md §15
Compliance claim: NONE
---

# Security evidence index

Index of repository Secure SDLC controls and exception handling for IMP-038 §15.
This folder does **not** claim DPDP / CERT-In / PCI / OWASP / ASVS certification.

## Controls → evidence

| Control | Gate | Evidence / entrypoint |
|---|---|---|
| SAST | CodeQL (`javascript-typescript`) | `.github/workflows/codeql.yml` |
| SCA | `npm audit` High+ fail-closed | `npm run audit:npm-sca` → `scripts/audit-npm-sca.mjs` |
| Secrets | gitleaks (pinned OSS binary) | `npm run audit:secrets` → `scripts/run-gitleaks.mjs` |
| Containers | Trivy fs scan (CRITICAL+HIGH) | `.github/workflows/ci.yml` job `security-sdlc` |
| Actions pinning | Commit SHA pins | Comments in `.github/workflows/*.yml` |
| Dependency updates | Dependabot weekly | `.github/dependabot.yml` |
| Exceptions | Founder-authorized, expiring | [`vulnerability-exception-register.md`](./vulnerability-exception-register.md) |

## CI wiring

| Workflow / job | Trigger |
|---|---|
| `codeql.yml` / `analyze` | `pull_request`, `push` to `main` |
| `ci.yml` / `security-sdlc` | `pull_request`, `push` to `main` (container path-filtered on PR) |

See [`../testing/CI-JOB-CONTRACT.md`](../testing/CI-JOB-CONTRACT.md) for the job contract.

## Local commands

```bash
npm run audit:npm-sca
npm run audit:secrets
npm run audit:security-sdlc
```

Container scanning runs in CI via Trivy (filesystem). Local Trivy is optional when the
CLI is installed; CI is the durable gate.
