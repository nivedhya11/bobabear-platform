---
Status: SUPPORTING — IMP-038 security evidence index
Authority: docs/platform/capabilities/IMP-038-security-privacy-hardening.md §15–§16
Compliance claim: NONE
---

# Security evidence index

Index of repository Secure SDLC controls, Acceptance Pack scaffolding, and origin-trust
design/lab contracts for IMP-038. This folder does **not** claim DPDP / CERT-In / PCI /
OWASP / ASVS certification or IMP-038 acceptance.

## Acceptance Pack (Tranche E)

Primary entry: [`acceptance-pack/INDEX.md`](./acceptance-pack/INDEX.md)

| Artifact | Path |
|---|---|
| Pack index (US-024 / §16.1) | [`acceptance-pack/INDEX.md`](./acceptance-pack/INDEX.md) |
| Control → evidence map | [`acceptance-pack/control-evidence-map.md`](./acceptance-pack/control-evidence-map.md) |
| Gap register | [`acceptance-pack/gap-register.md`](./acceptance-pack/gap-register.md) |
| Exception register (pointer) | [`acceptance-pack/exception-register.md`](./acceptance-pack/exception-register.md) |
| Threat model T-01…T-25 | [`acceptance-pack/threat-model.md`](./acceptance-pack/threat-model.md) |
| ASVS 5.0.0 matrix | [`acceptance-pack/asvs-5.0.0-matrix.md`](./acceptance-pack/asvs-5.0.0-matrix.md) |
| DPDP / CERT-In / PCI matrices | `acceptance-pack/*-matrix.md` |
| Vendor / script register | [`acceptance-pack/vendor-processor-client-script-register.md`](./acceptance-pack/vendor-processor-client-script-register.md) |
| Evidence maps (CSP, auth, BOLA, abuse, payment, SDLC) | `acceptance-pack/*-evidence.md` |
| Incident response | [`acceptance-pack/incident-response.md`](./acceptance-pack/incident-response.md) |
| Legal review topics (9) | [`acceptance-pack/legal-review-topics.md`](./acceptance-pack/legal-review-topics.md) |

## Origin trust (Tranche F — design/lab only)

| Artifact | Path |
|---|---|
| Overview | [`origin-trust/README.md`](./origin-trust/README.md) |
| Nginx / AOP / firewall / real_ip contracts | [`origin-trust/`](./origin-trust/) |
| IMP-039 handoff checklist | [`origin-trust/imp039-handoff-checklist.md`](./origin-trust/imp039-handoff-checklist.md) |
| Lab verify script | `npm run origin-trust:verify` → `scripts/origin-trust/verify-contracts.mjs` |

```text
PRODUCTION_REALIZATION_PENDING: YES (owner IMP-039)
IMP039_ACTIVATED: NO
```

## Secure SDLC (Tranche D)

| Control | Gate | Evidence / entrypoint |
|---|---|---|
| SAST | CodeQL (`javascript-typescript`) | `.github/workflows/codeql.yml` |
| SCA | `npm audit` High+ fail-closed | `npm run audit:npm-sca` → `scripts/audit-npm-sca.mjs` |
| Secrets | gitleaks (pinned OSS binary) | `npm run audit:secrets` → `scripts/run-gitleaks.mjs` |
| Containers | Trivy production **image** scan (CRITICAL+HIGH), pinned binary | `npm run audit:container` → `scripts/run-trivy.mjs` (not GitHub Action) |
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
npm run audit:container
npm run audit:security-sdlc
npm run origin-trust:verify
```

Container scanning uses a **pinned Trivy OSS binary** (`scripts/run-trivy.mjs`) to
**build and scan V1 production runtime images** (including base/OS layers), rather than
`aquasecurity/trivy-action`, after 2026 Actions tag-compromise advisories. CI is the durable gate.
