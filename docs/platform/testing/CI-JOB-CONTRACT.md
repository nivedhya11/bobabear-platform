# CI job contract (Session 3B1 → Session 3B2)

```text
STATUS: SUPPORTING ENGINEERING IMPLEMENTATION CONTRACT
Authority: docs/platform/TESTING.md (TEST-1)
```

Implementation contract for Session 3B2 workflow wiring. **Not** a new policy.
**Does not** authorize `.github/workflows/**` edits, branch protection changes,
dependency upgrades, or Founder staging use.

Every implement-now job below lists **exact** executable commands. Session 3B2
must translate these into workflow YAML without making another product or
testing-design choice.

```text
COVERAGE_INITIAL_3B2 = NOT_WIRED
COVERAGE_BLOCKING = NO
SESSION_3B2_COVERAGE_JOB_READY = NO
BRANCH_PROTECTION = UNCHANGED / separately authorized
```

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

| Cadence | Blocking (should) | Not wired in initial 3B2 |
|---|---|---|
| PR | `quality`, `unit-component`, `scripts`, `commerce-core`, `security-smoke`, `build` | Coverage |
| Main push | All PR blocking jobs + `database-foundation`, `database-commerce`, `security-matrix`, `domain-extended`, `http-surfaces`, `audits` | Coverage |
| Nightly verification (`schedule` `0 2 * * *` or `workflow_dispatch`) | Exact E2E / concurrency / recovery jobs listed below | `golden-journey-evidence` job; IMP-036B location precert beyond `test:e2e:location-selector-layout` |

**No silent retry** of failed verification jobs. Flakes must be fixed or
explicitly quarantined under TEST-1 policy — not hidden by workflow `retry`.

---

## PR — fast / risk-focused

Trigger: `pull_request`  
Cadence: every PR

### JOB `quality`

```text
JOB_ID = quality
TRIGGER = pull_request
EXACT_COMMANDS =
  npm run typecheck
  npm run lint
  npm run project:consistency
  npm run governance:fingerprint
  npm run env:hygiene
  npm run testing:inventory:check
DB_REQUIREMENT = NO
BROWSER_REQUIREMENT = NO
COST = FAST
BLOCKING_SEMANTICS = YES
ARTIFACTS = logs
FAILURE_BEHAVIOR = fail job; no silent retry
DISPOSITION = IMPLEMENT_IN_3B2
```

### JOB `unit-component`

```text
JOB_ID = unit-component
TRIGGER = pull_request
EXACT_COMMANDS =
  npm run test
DB_REQUIREMENT = NO
BROWSER_REQUIREMENT = NO
COST = MEDIUM
BLOCKING_SEMANTICS = YES
ARTIFACTS = Vitest JSON/report if configured
FAILURE_BEHAVIOR = fail job; no silent retry
DISPOSITION = IMPLEMENT_IN_3B2
```

### JOB `scripts`

```text
JOB_ID = scripts
TRIGGER = pull_request
EXACT_COMMANDS =
  npm run test:scripts
DB_REQUIREMENT = NO
BROWSER_REQUIREMENT = NO
COST = FAST
BLOCKING_SEMANTICS = YES
ARTIFACTS = logs
FAILURE_BEHAVIOR = fail job; no silent retry
DISPOSITION = IMPLEMENT_IN_3B2
```

### JOB `commerce-core`

Exact commands currently proven by `.github/workflows/ci.yml` for the commerce
smoke surface (package scripts plus the two customer-menu Vitest invocations
that are not yet wrapped as package scripts):

```text
JOB_ID = commerce-core
TRIGGER = pull_request
EXACT_COMMANDS =
  npm run test:catalog-imp028c-modifiers
  npm run test:catalog
  npm run test:cart
  npm run test:customer-commerce:http
  node scripts/run-vitest.mjs run src/server/customer-commerce/menu/project-customer-menu.test.ts
  node scripts/run-vitest.mjs run --config vitest.database.config.mts tests/database/customer-menu-modifier-projection.integration.test.ts
DB_REQUIREMENT = YES
BROWSER_REQUIREMENT = NO
COST = MEDIUM
BLOCKING_SEMANTICS = YES
ARTIFACTS = logs
FAILURE_BEHAVIOR = fail job; no silent retry
DISPOSITION = IMPLEMENT_IN_3B2
```

### JOB `security-smoke`

Locked choice for initial 3B2 (no alternative left for the implementer):

```text
JOB_ID = security-smoke
TRIGGER = pull_request
EXACT_COMMANDS =
  npm run test:access-control
  npm run test:checkout-security
DB_REQUIREMENT = YES
BROWSER_REQUIREMENT = NO
COST = MEDIUM
BLOCKING_SEMANTICS = YES
ARTIFACTS = logs
FAILURE_BEHAVIOR = fail job; no silent retry
DISPOSITION = IMPLEMENT_IN_3B2
WHY =
  access-control covers TEST-1 authorization risk without an expensive matrix;
  checkout-security covers payment-adjacent checkout trust boundaries already
  exercised under vitest.database.config.mts; payment-security remains on MAIN
  security-matrix to avoid duplicate expensive PR matrix.
```

### JOB `build`

```text
JOB_ID = build
TRIGGER = pull_request
EXACT_COMMANDS =
  npm run build
ENV =
  NEXT_PUBLIC_SITE_URL=https://thebobabear.in
DB_REQUIREMENT = NO
BROWSER_REQUIREMENT = NO
COST = MEDIUM
BLOCKING_SEMANTICS = YES
ARTIFACTS = .next not required as artifact
FAILURE_BEHAVIOR = fail job; no silent retry
DISPOSITION = IMPLEMENT_IN_3B2
```

### Coverage on PR

```text
COVERAGE_INITIAL_3B2 = NOT_WIRED
COVERAGE_BLOCKING = NO
SESSION_3B2_COVERAGE_JOB_READY = NO
DISPOSITION = DEFERRED_AFTER_COVERAGE_STABILITY
```

Do **not** define an initial PR workflow job that executes `npm run test:coverage`.
Do **not** create an intentionally flaky informational coverage job.

Future publication model (deferred design only; not wired in initial 3B2):

- GitHub Actions job summary with aggregate percentages
- `coverage/` artifact upload
- no threshold until separately authorized

### Playwright on PR

```text
JOB_ID = playwright-pr
DISPOSITION = NOT_WIRED_IN_INITIAL_3B2
REASON = TEST-1 risk-focused PR model; full Golden Journey browser matrix stays nightly
```

---

## MAIN — comprehensive integrated candidate

Trigger: `push` to `main`  
Cadence: every main push  

Includes all PR-equivalent blocking jobs (`quality`, `unit-component`,
`scripts`, `commerce-core`, `security-smoke`, `build`) with the same
`EXACT_COMMANDS` as above, plus:

### JOB `database-foundation`

```text
JOB_ID = database-foundation
TRIGGER = push to main
EXACT_COMMANDS =
  npm run test:database:persistence
  npm run test:database:outbox-idempotency
  npm run test:database:auth-foundation
DB_REQUIREMENT = YES
BROWSER_REQUIREMENT = NO
COST = EXPENSIVE
BLOCKING_SEMANTICS = YES
ARTIFACTS = logs
FAILURE_BEHAVIOR = fail job; no silent retry
DISPOSITION = IMPLEMENT_IN_3B2
```

### JOB `database-commerce`

```text
JOB_ID = database-commerce
TRIGGER = push to main
EXACT_COMMANDS =
  npm run test:database:cart
  npm run test:database:checkout
  npm run test:database:payment
  npm run test:database:order
  npm run test:database:serviceability
  npm run test:database:catalog
DB_REQUIREMENT = YES
BROWSER_REQUIREMENT = NO
COST = EXPENSIVE
BLOCKING_SEMANTICS = YES
ARTIFACTS = logs
FAILURE_BEHAVIOR = fail job; no silent retry
DISPOSITION = IMPLEMENT_IN_3B2
```

### JOB `security-matrix`

```text
JOB_ID = security-matrix
TRIGGER = push to main
EXACT_COMMANDS =
  npm run test:access-control
  npm run test:database:access-control
  npm run test:payment-security
  npm run test:checkout-security
  npm run test:serviceability-security
DB_REQUIREMENT = YES
BROWSER_REQUIREMENT = NO
COST = EXPENSIVE
BLOCKING_SEMANTICS = YES
ARTIFACTS = logs
FAILURE_BEHAVIOR = fail job; no silent retry
DISPOSITION = IMPLEMENT_IN_3B2
```

### JOB `domain-extended`

```text
JOB_ID = domain-extended
TRIGGER = push to main
EXACT_COMMANDS =
  npm run test:checkout
  npm run test:payment
  npm run test:order
  npm run test:serviceability
  npm run test:assortment-availability
  npm run test:pricing-tax
  npm run test:promotions
DB_REQUIREMENT = YES
  (test:checkout, test:payment, test:order, test:serviceability,
   test:assortment-availability, and test:pricing-tax invoke
   vitest.database.config.mts; test:promotions does not, but the job still
   requires DB for the other commands)
BROWSER_REQUIREMENT = NO
COST = EXPENSIVE
BLOCKING_SEMANTICS = YES
ARTIFACTS = logs
FAILURE_BEHAVIOR = fail job; no silent retry
DISPOSITION = IMPLEMENT_IN_3B2
```

### JOB `http-surfaces`

```text
JOB_ID = http-surfaces
TRIGGER = push to main
EXACT_COMMANDS =
  npm run test:customer-auth:http
  npm run test:workforce-auth:http
  npm run test:administration
DB_REQUIREMENT = YES
  (customer-auth:http and workforce-auth:http use vitest.database.config.mts;
   test:administration runs tests/administration then
   npm run test:database:administration via vitest.database.config.mts)
BROWSER_REQUIREMENT = NO
COST = MEDIUM
BLOCKING_SEMANTICS = YES
ARTIFACTS = logs
FAILURE_BEHAVIOR = fail job; no silent retry
DISPOSITION = IMPLEMENT_IN_3B2
```

### JOB `audits`

Current `.github/workflows/ci.yml` does not run any `npm run audit:*` command.
Initial 3B2 therefore locks only the post-3B1 repaired audits:

```text
JOB_ID = audits
TRIGGER = push to main
EXACT_COMMANDS =
  npm run audit:persistence
  npm run audit:customer-phone-auth
DB_REQUIREMENT = NO
BROWSER_REQUIREMENT = NO
COST = FAST
BLOCKING_SEMANTICS = YES
ARTIFACTS = logs
FAILURE_BEHAVIOR = fail job; no silent retry
DISPOSITION = IMPLEMENT_IN_3B2
```

Additional `audit:*` commands from `npm run check` remain
`DEFERRED_TO_SESSION_3C` unless separately authorized.

### Coverage on MAIN

```text
COVERAGE_INITIAL_3B2 = NOT_WIRED
COVERAGE_BLOCKING = NO
DISPOSITION = DEFERRED_AFTER_COVERAGE_STABILITY
```

### Playwright on MAIN

```text
JOB_ID = playwright-main
DISPOSITION = NOT_WIRED_IN_INITIAL_3B2
REASON = full browser matrix stays nightly
```

---

## NIGHTLY VERIFICATION — expensive proof

```text
WORKFLOW_PURPOSE = expensive TEST-1 verification only

GITHUB_ACTIONS_TRIGGERS =
  schedule:
    cron: "0 2 * * *"
  workflow_dispatch:

NIGHTLY_CRON = 0 2 * * *
MANUAL_TRIGGER = workflow_dispatch

Interpretation:
  - scheduled verification runs every day at 02:00 UTC
  - manual workflow_dispatch may be used for explicit pre-release/release
    evidence runs
  - workflow_dispatch is VERIFICATION ONLY
  - it does not deploy staging or production
  - it does not create a Git tag
  - it does not constitute production-release approval

NOT used for this workflow in initial 3B2:
  release:
  push tags:
  pull_request:

Do NOT couple this workflow to deploy.yml.
```

`BLOCKING_SEMANTICS = YES for release evidence` means the manually/scheduled
verification result may be required as evidence before a separately authorized
release process. It does **not** mean these jobs themselves create a release,
deploy production, deploy staging, create tags, change environments, or approve
release promotion. ADR-002 production-release controls remain separate.

### JOB `e2e-customer-ordering`

```text
JOB_ID = e2e-customer-ordering
TRIGGER =
  workflow schedule "0 2 * * *"
  OR manual workflow_dispatch
EXACT_COMMANDS =
  npm run test:e2e:customer-ordering
DB_REQUIREMENT = YES
BROWSER_REQUIREMENT = YES
COST = EXPENSIVE
BLOCKING_SEMANTICS = YES for release evidence
ARTIFACTS = test-results-customer-ordering/** (preserve; do not destroy)
FAILURE_BEHAVIOR = fail job; no silent retry
DISPOSITION = IMPLEMENT_IN_3B2
```

### JOB `e2e-customer-auth`

```text
JOB_ID = e2e-customer-auth
TRIGGER =
  workflow schedule "0 2 * * *"
  OR manual workflow_dispatch
EXACT_COMMANDS =
  npm run test:e2e:customer-auth
DB_REQUIREMENT = YES
BROWSER_REQUIREMENT = YES
COST = EXPENSIVE
BLOCKING_SEMANTICS = YES for release evidence
ARTIFACTS = playwright/test-results as produced
FAILURE_BEHAVIOR = fail job; no silent retry
DISPOSITION = IMPLEMENT_IN_3B2
```

### JOB `e2e-workforce-auth`

```text
JOB_ID = e2e-workforce-auth
TRIGGER =
  workflow schedule "0 2 * * *"
  OR manual workflow_dispatch
EXACT_COMMANDS =
  npm run test:e2e:workforce-auth
DB_REQUIREMENT = YES
BROWSER_REQUIREMENT = YES
COST = EXPENSIVE
BLOCKING_SEMANTICS = YES for release evidence
ARTIFACTS = as produced by the runner
FAILURE_BEHAVIOR = fail job; no silent retry
DISPOSITION = IMPLEMENT_IN_3B2
```

### JOB `e2e-operations-lifecycle`

```text
JOB_ID = e2e-operations-lifecycle
TRIGGER =
  workflow schedule "0 2 * * *"
  OR manual workflow_dispatch
EXACT_COMMANDS =
  npm run test:e2e:operations-lifecycle
DB_REQUIREMENT = YES
BROWSER_REQUIREMENT = YES
COST = EXPENSIVE
BLOCKING_SEMANTICS = YES for release evidence
ARTIFACTS = as produced by the runner
FAILURE_BEHAVIOR = fail job; no silent retry
DISPOSITION = IMPLEMENT_IN_3B2
```

### JOB `e2e-location-serviceability`

```text
JOB_ID = e2e-location-serviceability
TRIGGER =
  workflow schedule "0 2 * * *"
  OR manual workflow_dispatch
EXACT_COMMANDS =
  npm run test:e2e:location-selector-layout
DB_REQUIREMENT = YES
BROWSER_REQUIREMENT = YES
COST = EXPENSIVE
BLOCKING_SEMANTICS = YES for release evidence
ARTIFACTS = test-results-location-selector-layout/**
FAILURE_BEHAVIOR = fail job; no silent retry
DISPOSITION = IMPLEMENT_IN_3B2
```

Additional IMP-036B location/serviceability precert beyond
`npm run test:e2e:location-selector-layout` =

```text
DEFERRED_TO_SESSION_3C
```

### JOB `concurrency-matrix`

```text
JOB_ID = concurrency-matrix
TRIGGER =
  workflow schedule "0 2 * * *"
  OR manual workflow_dispatch
EXACT_COMMANDS =
  npm run test:payment-concurrency
  npm run test:checkout-concurrency
  npm run test:cart-concurrency
  npm run test:order-concurrency
  npm run test:serviceability-concurrency
  npm run test:customer-address-concurrency
DB_REQUIREMENT = YES
BROWSER_REQUIREMENT = NO
COST = EXPENSIVE
BLOCKING_SEMANTICS = YES for release evidence
ARTIFACTS = logs
FAILURE_BEHAVIOR = fail job; no silent retry
DISPOSITION = IMPLEMENT_IN_3B2
```

### JOB `recovery-matrix`

```text
JOB_ID = recovery-matrix
TRIGGER =
  workflow schedule "0 2 * * *"
  OR manual workflow_dispatch
EXACT_COMMANDS =
  npm run test:payment-idempotency
  npm run test:order-crash
  npm run test:payment-reconciliation
DB_REQUIREMENT = YES
BROWSER_REQUIREMENT = NO
COST = EXPENSIVE
BLOCKING_SEMANTICS = YES for release evidence
ARTIFACTS = logs
FAILURE_BEHAVIOR = fail job; no silent retry
DISPOSITION = IMPLEMENT_IN_3B2
```

Dedicated payment-webhook recovery suites without an exact existing package
command =

```text
DEFERRED_TO_SESSION_3C
```

### JOB `golden-journey-evidence`

```text
JOB_ID = golden-journey-evidence
DISPOSITION = DEFERRED_TO_SESSION_3C
REASON =
  TEST-1/GJ traceability exists, but automated Golden Journey evidence
  aggregation is not yet an executable repository command. Nightly E2E jobs
  above may still provide evidence for mapped journeys; they do not become a
  synthetic golden-journey-evidence workflow job until a real mechanism exists.
```

```text
playwright_nightly = FULL expensive browser coverage via the e2e-* jobs above
founder_staging_used = NO
```

---

## Pages deploy separation

```text
deploy.yml = GitHub Pages deployment only
NOT verification CI
NOT Founder staging
NOT Founder UAT
```

Do not couple TEST-1 acceptance or required checks to Pages success.

## Session 3B2 readiness flags (as of Session 3B1 corrective close)

```text
SESSION_3B2_READY = YES
  (npm run test PASS; npm run test:scripts PASS; contract locked; PG approach resolved)

SESSION_3B2_COVERAGE_JOB_READY = NO
  (coverage remains INTERMITTENT; keep coverage NOT_WIRED in initial 3B2)

unit_component_blocking = YES (once wired)
scripts_blocking = YES (once wired)
coverage_blocking = NO
coverage_initial_3b2 = NOT_WIRED
branch_protection_changed = NO
```
