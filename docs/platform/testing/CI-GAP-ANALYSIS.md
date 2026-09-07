# CI gap analysis vs TEST-1 (Session 3A)

```text
STATUS: SUPPORTING ENGINEERING EVIDENCE
Authority: docs/platform/TESTING.md (TEST-1)
Operational CI facts: .github/workflows/**
Release/env model: docs/platform/decisions/ADR-002-environments-ci-cd-release-model.md
NOT an authorization to edit workflows in Session 3A.
```

## Current CI fact summary

| Workflow | Role today |
|---|---|
| `.github/workflows/ci.yml` | Single `validate` job: typecheck, lint, **selected** catalog/cart/menu/HTTP tests, 3 script tests, project consistency, governance fingerprint, tooling Docker build, production build |
| `.github/workflows/deploy.yml` | GitHub Pages static export deploy on `main` — not verification matrix |

There is **no** nightly/release verification workflow, **no** coverage upload/gate, **no** Playwright job, **no** flake quarantine workflow, and **no** TEST-1 layer labels on jobs.

TEST-1 cadence table remains a **TARGET** until Session 3 implements it.

## Layer-by-layer gap matrix

| Layer | CURRENT CI | EXISTING EXECUTABLE TESTS | GAP TYPE | Disposition |
|---|---|---|---|---|
| 1 Unit | PARTIAL (almost none of default `npm run test`) | YES | CI_WIRING_GAP | SESSION_3B |
| 2 Component | NO | YES | CI_WIRING_GAP | SESSION_3B |
| 3 Domain/use-case | PARTIAL (catalog/cart only) | YES | CI_WIRING_GAP | SESSION_3B |
| 4 Integration | PARTIAL (customer-commerce HTTP + one menu DB integration) | YES | CI_WIRING_GAP | SESSION_3B |
| 5 Database integration | PARTIAL (one menu modifier projection + catalog/cart DB paths) | YES | CI_WIRING_GAP / ENVIRONMENT_GAP | SESSION_3B |
| 6 HTTP/API contract | PARTIAL (`test:customer-commerce:http`) | YES | CI_WIRING_GAP | SESSION_3B |
| 7 Authorization/security | NO | YES | CI_WIRING_GAP | SESSION_3B |
| 8 Concurrency | NO | YES | CI_WIRING_GAP / ENVIRONMENT_GAP | SESSION_3B (PR when touched; else MAIN/NIGHTLY) |
| 9 Recovery/idempotency | NO | YES | CI_WIRING_GAP | SESSION_3B / SESSION_3C |
| 10 Accessibility | NO | NO | ACCESSIBILITY_GAP / TEST_EVIDENCE_GAP | SESSION_3C / FUTURE_PRODUCT_DEFINITION |
| 11 E2E browser/UI | NO | YES | CI_WIRING_GAP / ENVIRONMENT_GAP | SESSION_3B (smoke) / SESSION_3C (breadth) |
| 12 Golden Journey regression | NO | PARTIAL | GOLDEN_JOURNEY_GAP / TRACEABILITY_GAP | SESSION_3C / JOURNEY_GAP_AUDIT |
| 13 Founder UAT | NO (manual) | MANUAL_GATE | NONE_IDENTIFIED (automation must not replace) | NO_CHANGE |
| Coverage visibility | NO | Tooling exists (`test:coverage`) but baseline run FAILED | COVERAGE_VISIBILITY_GAP | SESSION_3B (report only; no threshold enforcement without separate auth) |
| Flake policy enforcement | NO | Policy text only in TEST-1 | FLAKE_POLICY_GAP | SESSION_3B (document + no silent retry as proof) |

## Session 3B recommendations (NON-AUTHORIZING)

Prefer **reusing existing package commands**. Prefer **parallel bounded jobs** over one opaque 90-minute monolith where it improves isolation.

### Proposed PR CI (fast / risk-focused)

Mandatory keep (already valuable):

- `npm run typecheck`
- `npm run lint`
- `npm run project:consistency`
- `npm run governance:fingerprint`
- `npm run build` (or a cheaper compile-equivalent if later authorized; today build is the production check)

Add / expand (reuse commands; wire only in a future authorized workflow edit):

| Job (proposed name) | Commands | Rationale |
|---|---|---|
| `unit-component` | `npm run test` | Closes largest CI_WIRING_GAP for layers 1–2. **Blocked today** by failing baseline unit suite — fix under separate authorization before making mandatory. |
| `scripts` | `npm run test:scripts` | Broader than the 3 script files currently singled out. **Blocked today** by 2 failing audit script tests. |
| `commerce-core` | keep `test:catalog*`, `test:cart`, `test:customer-commerce:http`, menu projection steps | Retain as mandatory PR commerce smoke. |
| `security-smoke` | `npm run test:access-control` + one representative `test:*-security` (payment or checkout) | Layer 7 visibility without full matrix on every PR. |
| `inventory-check` | `npm run testing:inventory:check` | Prevents silent inventory drift after Session 3A. |

PR should **not** require full Playwright Golden Journey matrix or all concurrency suites unless the PR touches those surfaces (risk-focused exception per TEST-1).

### Proposed MAIN CI (comprehensive integrated candidate)

In addition to PR jobs:

| Job | Commands | Rationale |
|---|---|---|
| `database-foundation` | `npm run test:database:persistence`; `test:database:outbox-idempotency`; `test:database:auth-foundation` | Layer 5/9 foundations |
| `database-commerce` | `test:database:cart`; `checkout`; `payment`; `order`; `serviceability`; `catalog` | Commerce durability |
| `security-matrix` | all `test:*-security` + `test:access-control` + `test:database:access-control` | Layer 7 |
| `domain-extended` | `test:checkout`; `test:payment`; `test:order`; `test:serviceability`; `test:assortment-availability`; `test:pricing-tax`; `test:promotions` | Close domain CI gaps |
| `http-surfaces` | `test:customer-auth:http`; `test:workforce-auth:http`; `test:administration` | Layer 6 breadth |
| `audits` | selected `audit:*` from `npm run check` (or staged subsets) | Static invariant audits |
| `coverage-report` | `npm run test:coverage` | Visibility only — **no threshold fail** until separately authorized; requires unit suite green first |

### Proposed NIGHTLY / RELEASE CI

| Job | Commands | Rationale |
|---|---|---|
| `e2e-customer-ordering` | `npm run test:e2e:customer-ordering` | GJ-FIRST-ORDER / GJ-PAYMENT-RECOVERY browser evidence |
| `e2e-customer-auth` | `npm run test:e2e:customer-auth` | Auth browser |
| `e2e-workforce-auth` | `npm run test:e2e:workforce-auth` | Workforce auth browser |
| `e2e-operations-lifecycle` | `npm run test:e2e:operations-lifecycle` | Cancel/fulfil continuum |
| `e2e-location-serviceability` | `test:e2e:location-selector-layout` + IMP-036B precert spec via existing runners/configs | GJ-ADDRESS-SERVICEABILITY browser |
| `concurrency-matrix` | all `test:*-concurrency` | Layer 8 expensive proof |
| `recovery-matrix` | `test:payment-idempotency`; `test:order-crash`; reconciliation/webhook suites | Layer 9 |
| `golden-journey-bundle` | Explicit documented mapping of the above E2E jobs to GJ IDs (report artifact) | Layer 12 — still not Founder UAT |

### Blocking design questions for Session 3B (do not invent answers here)

1. How is ephemeral PostgreSQL provisioned in GitHub Actions for `vitest.database.config.mts` suites (service container image pin, credentials, migrate step)?
2. Which jobs are **required checks** on `main` vs informative (branch protection is a separate founder authorization)?
3. Should `npm run test` become mandatory before or after repairing the known failing operations component tests?
4. Playwright browser install + build cost: PR smoke subset vs nightly-only?
5. Is coverage upload (Codecov/GH summary) desired without thresholds?
6. Deploy workflow vs verification workflow separation — keep Pages deploy non-blocking for TEST-1?

## Session 3C recommendations (behavioural evidence still needed)

Do **not** implement these in Session 3A. Identify gaps:

| Gap | Why it matters | Suggested direction |
|---|---|---|
| Golden Journey E2E tagged harness | Layer 12; registry ≠ execution | Named specs/jobs per GJ; artifacts + candidate identity |
| Cross-capability operator→customer continuity | GJ-AVAILABILITY, STORE-PAUSE-RESUME, TRADING-HOURS | Browser journeys after IMP-036E acceptance/UAT |
| IMP-036F product/menu launch | GJ-PRODUCT-MENU-LAUNCH PLANNED | FUTURE_PRODUCT_DEFINITION after activation |
| Keyboard / focus / accessibility | Layer 10 empty | axe + interaction keyboard paths in E2E; AC-driven |
| Mobile/responsive E2E breadth | TEST-1 E2E expectations | Expand beyond the few viewport cases already present |
| Concurrency under CI | Suites exist, never scheduled | Nightly matrix with real overlap |
| Recovery/idempotency under CI | Suites + partial E2E exist | Main/nightly wiring + flake discipline |
| Security allow/deny browser proofs | Strong API/domain deny tests; thin browser | Targeted E2E deny cases for portals |
| Story→AC→test traceability rows | Starts IMP-036F | Product Definition Gate artifacts |
| Journey Gap Audit | Required before public GTM / IMP-040 | JOURNEY_GAP_AUDIT (not Session 3A) |
| Repair baseline unit/audit failures | Blocks honest coverage + mandatory `npm run test` in CI | Separate authorized fix slice |

## Traceability reminder

```text
Story ID → AC ID / GJ ID → behaviour/risk → layers → executable check → exact candidate/result/artifact
```

No IMP-036F story/AC identifiers are created here.

## What Session 3B can do without rediscovery

Use:

- [`test-inventory.json`](./test-inventory.json) for paths, package commands, workflow steps
- [`BASELINE.md`](./BASELINE.md) for layer/GJ/risk judgments and coverage failure facts
- This file for job packaging and dispositions

Do **not** treat this document as workflow authorization. Session 3A did not modify `.github/workflows/**`.
