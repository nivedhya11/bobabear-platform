# CI job contract (Session 3B1 → Session 3B2)

```text
STATUS: SUPPORTING ENGINEERING IMPLEMENTATION CONTRACT
Authority: docs/platform/TESTING.md (TEST-1)
```

Implementation contract for Session 3B2 workflow wiring. **Not** a new policy.
**Does not** authorize `.github/workflows/**` edits, branch protection changes,
dependency upgrades, or Founder staging use.

Commands below are proven `package.json` / repository scripts only.

## Current workflow facts (pre-3B2)

| Workflow | Role |
|---|---|
| `.github/workflows/ci.yml` | Single `validate` job on `pull_request` + `push` to `main` / `imp-**` |
| `.github/workflows/deploy.yml` | GitHub Pages static export on `main` — **not** verification CI |

## PostgreSQL in CI (resolved)

Reuse the existing database-test model; do not invent a second stack.

| Item | Decision |
|---|---|
| Approach | GitHub Actions job runs the same Vitest database config that uses **Testcontainers** (`tests/database/global-setup.ts` → `tests/database/support/test-container.ts`) |
| Image | `postgres:18.4-trixie` (`POSTGRES_TEST_IMAGE`); setup asserts server version starts with `18.4` |
| Credentials | Container-generated admin connection string provided via Vitest `provide`/`inject` — non-secret ephemeral CI values; never Founder staging credentials |
| Readiness | Global setup queries `SHOW server_version` before tests proceed; failure fails the job |
| Bootstrap / migrations | Existing database suite helpers / migrations as already used by `npm run test:database*` |
| Isolation | One disposable container per Vitest database run; stop on teardown (including failure) |
| Host requirements | Docker-compatible runtime on the Actions runner (same as local Testcontainers expectation) |
| Founder staging | **NO** — never |

## Required-check semantics (contract only)

Branch protection remains a **separate** founder action. This contract only
states which jobs **should** be treated as blocking once wired and green.

| Cadence | Blocking (should) | Informative |
|---|---|---|
| PR | `quality`, `unit-component`, `scripts`, `commerce-core`, `security-smoke`, `build` | `inventory-check` may be blocking once stable; coverage **not** blocking in 3B2 |
| Main push | All PR blocking jobs + `database-foundation`, `database-commerce`, `security-matrix`, `domain-extended`, `http-surfaces`, `audits` | `coverage-report` informative |
| Nightly / release | Expensive E2E / concurrency / recovery / GJ evidence jobs | Summaries / artifacts |

**No silent retry** of failed verification jobs. Flakes must be fixed or
explicitly quarantined under TEST-1 policy — not hidden by workflow `retry`.

---

## PR — fast / risk-focused

Trigger: `pull_request`  
Cadence: every PR

| Job ID | Name | Commands | TEST-1 layers | DB | Browser | Cost | Blocking | Artifacts | Failure |
|---|---|---|---|---|---|---|---|---|---|
| `quality` | Quality gates | `npm run typecheck`; `npm run lint`; `npm run project:consistency`; `npm run governance:fingerprint`; `npm run env:hygiene`; `npm run testing:inventory:check` | tooling / inventory | NO | NO | FAST | YES | logs | fail job; no silent retry |
| `unit-component` | Unit + component | `npm run test` | 1–2 | NO | NO | MEDIUM | YES | Vitest JSON/report if configured | fail job |
| `scripts` | Script / audit unit tests | `npm run test:scripts` | tooling audits | NO | NO | FAST | YES | logs | fail job |
| `commerce-core` | Commerce smoke | `npm run test:catalog-imp028c-modifiers`; `npm run test:catalog`; `npm run test:cart`; `npm run test:customer-commerce:http`; customer menu projection unit + `vitest.database.config.mts` customer-menu-modifier projection (retain current `ci.yml` steps) | 3–6 (subset) | YES (subset) | NO | MEDIUM | YES | logs | fail job |
| `security-smoke` | Security smoke | `npm run test:access-control`; `npm run test:checkout-security` **or** `npm run test:payment-security` (pick one representative in 3B2 wiring) | 7 | YES for `*-security` | NO | MEDIUM | YES | logs | fail job |
| `build` | Production build | `npm run build` (with existing CI `NEXT_PUBLIC_SITE_URL`) | build integrity | NO | NO | MEDIUM | YES | `.next` not required as artifact | fail job |
| `coverage-report` | Coverage visibility | `npm run test:coverage` | coverage visibility | NO | NO | MEDIUM | **NO** (3B2) | `coverage/` artifact + job summary percentages; **no threshold** | informative fail allowed until `SESSION_3B2_COVERAGE_JOB_READY` |

### Playwright on PR

```text
playwright_pr = NONE initially
```

TEST-1 risk-focused PR model: do not run the full Golden Journey browser matrix
on every PR. Add a PR browser smoke later only with separate authorization and
a proven cheap command.

---

## MAIN — comprehensive integrated candidate

Trigger: `push` to `main`  
Cadence: every main push  
Includes: all PR-equivalent blocking jobs, plus:

| Job ID | Name | Commands | TEST-1 layers | DB | Browser | Cost | Blocking | Artifacts | Failure |
|---|---|---|---|---|---|---|---|---|---|
| `database-foundation` | Database foundation | `npm run test:database:persistence`; `npm run test:database:outbox-idempotency`; `npm run test:database:auth-foundation` | 5, 9 | YES | NO | EXPENSIVE | YES | logs | fail job |
| `database-commerce` | Database commerce | `npm run test:database:cart`; `npm run test:database:checkout`; `npm run test:database:payment`; `npm run test:database:order`; `npm run test:database:serviceability`; `npm run test:database:catalog` | 5 | YES | NO | EXPENSIVE | YES | logs | fail job |
| `security-matrix` | Security matrix | `npm run test:access-control`; `npm run test:database:access-control`; `npm run test:payment-security`; `npm run test:checkout-security`; `npm run test:serviceability-security` | 7 | YES | NO | EXPENSIVE | YES | logs | fail job |
| `domain-extended` | Domain extended | `npm run test:checkout`; `npm run test:payment`; `npm run test:order`; `npm run test:serviceability`; `npm run test:assortment-availability`; `npm run test:pricing-tax`; `npm run test:promotions` | 3–5 | YES | NO | EXPENSIVE | YES | logs | fail job |
| `http-surfaces` | HTTP surfaces | `npm run test:customer-auth:http`; `npm run test:workforce-auth:http`; `npm run test:administration` | 6 | YES | NO | MEDIUM | YES | logs | fail job |
| `audits` | Static audits | Selected `npm run audit:*` subset already covered by `npm run check` / CI taste in 3B2 (at minimum persistence + customer-phone-auth after 3B1 repair) | tooling | NO | NO | FAST | YES | logs | fail job |
| `coverage-report` | Coverage report | `npm run test:coverage` | coverage | NO | NO | MEDIUM | NO | GitHub Actions artifact + job summary | informative |

### Playwright on main

```text
playwright_main = OPTIONAL smoke only if a single cheap proven command is chosen in 3B2;
default = NONE (full browser matrix stays nightly)
```

---

## NIGHTLY / RELEASE — expensive proof

Trigger: `schedule` (nightly) and/or explicit release workflow  
Cadence: nightly + pre-release

| Job ID | Name | Commands | TEST-1 layers | DB | Browser | Cost | Blocking for release? | Artifacts | Failure |
|---|---|---|---|---|---|---|---|---|---|
| `e2e-customer-ordering` | E2E customer ordering | `npm run test:e2e:customer-ordering` | 11–12 | YES (via e2e runners) | YES | EXPENSIVE | YES for release evidence | `test-results-customer-ordering/**` (preserve; do not destroy) | fail job; no silent retry |
| `e2e-customer-auth` | E2E customer auth | `npm run test:e2e:customer-auth` | 11 | YES | YES | EXPENSIVE | YES for release | playwright/test-results as produced | fail job |
| `e2e-workforce-auth` | E2E workforce auth | `npm run test:e2e:workforce-auth` | 11 | YES | YES | EXPENSIVE | YES for release | as produced | fail job |
| `e2e-operations-lifecycle` | E2E operations lifecycle | `npm run test:e2e:operations-lifecycle` | 11 | as required by runner | YES | EXPENSIVE | YES for release | as produced | fail job |
| `e2e-location-serviceability` | E2E location / serviceability | `npm run test:e2e:location-selector-layout` (+ IMP-036B precert via existing runners/configs when applicable) | 11–12 | as required | YES | EXPENSIVE | YES for release | `test-results-location-selector-layout/**` | fail job |
| `concurrency-matrix` | Concurrency matrix | `npm run test:payment-concurrency`; `npm run test:checkout-concurrency`; `npm run test:cart-concurrency`; `npm run test:order-concurrency`; `npm run test:serviceability-concurrency`; `npm run test:customer-address-concurrency` | 8 | YES | NO | EXPENSIVE | YES for release | logs | fail job |
| `recovery-matrix` | Recovery / idempotency | `npm run test:payment-idempotency`; `npm run test:order-crash`; payment reconciliation / webhook suites already in package scripts | 9 | YES | NO | EXPENSIVE | YES for release | logs | fail job |
| `golden-journey-evidence` | Golden journey evidence map | Documented mapping of the above E2E jobs to GJ IDs (artifact/report); does **not** replace Founder UAT | 12 | — | — | FAST (report) | informative + release checklist | markdown/JSON summary | fail if mapping incomplete |

```text
playwright_nightly = FULL expensive browser / GJ coverage via jobs above
founder_staging_used = NO
```

---

## Coverage publication (3B2)

Prefer first-party GitHub evidence:

- Job summary with aggregate statements / branches / functions / lines
- Workflow artifact upload of `coverage/` (lcov/html/json as produced)

No third-party coverage service required for initial TEST-1 visibility.
No coverage threshold fail in 3B2 unless separately authorized.

## Pages deploy separation

```text
deploy.yml = GitHub Pages deployment only
NOT verification CI
NOT Founder staging
NOT Founder UAT
```

Do not couple TEST-1 acceptance or required checks to Pages success.

## Session 3B2 readiness flags (as of Session 3B1 close)

```text
SESSION_3B2_READY = YES
  (npm run test PASS; npm run test:scripts PASS; contract locked; PG approach resolved)

SESSION_3B2_COVERAGE_JOB_READY = NO
  (coverage metrics obtainable when green, but not yet consecutive-stable under
   instrumentation; keep coverage informative until repaired or separately authorized)

unit_component_blocking = YES (once wired)
scripts_blocking = YES (once wired)
coverage_blocking = NO
branch_protection_changed = NO
```
