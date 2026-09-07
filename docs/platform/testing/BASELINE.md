# TEST-1 verification baseline (Session 3A)

```text
STATUS: SUPPORTING ENGINEERING EVIDENCE
Authority: docs/platform/TESTING.md (TEST-1)
Golden Journey registry input: docs/platform/product/golden-journeys.md (GJ-1)
NOT acceptance authority. NOT Product Definition. NOT CI restructuring.
```

## Baseline identity

| Field | Value |
|---|---|
| DATE | 2026-09-07 |
| BASE_MAIN_SHA | `258f7b3b6cebe432865f65b149ca41febae379e9` |
| BASE_MAIN_TREE | `8f5978e847afd9bf0760760750a9bf774e092bdc` |
| BRANCH (session work) | `chore/test1-baseline-and-traceability` |
| Inventory snapshot | [`test-inventory.json`](./test-inventory.json) |
| Inventory tool | `scripts/testing-inventory.mjs` |

```text
TEST PRESENCE != TEST PASS
TEST PASS != ACCEPTANCE SCENARIO COVERAGE
HIGH COVERAGE != BEHAVIOURAL COMPLETENESS
GOLDEN JOURNEY REGISTRY STATUS != CURRENT EXECUTION EVIDENCE
AUTOMATED EVIDENCE != FOUNDER UAT
PRE-PD-1 ACCEPTED IMP != RETROACTIVE STORY/AC REQUIREMENT
```

Lifecycle at baseline (unchanged):

```text
acceptedThrough = IMP-036D
currentProductSlice = IMP-036E
pendingAcceptance = IMP-036E
nextProductSlice = IMP-036F
IMP036E_ACCEPTED = NO
FOUNDER_UAT = NOT_PERFORMED
IMP036F_ACTIVATED = NO
```

## Observed structural inventory

Derived from `node scripts/testing-inventory.mjs` / `docs/platform/testing/test-inventory.json`
on the baseline candidate (tracked paths via `git ls-files`).

| Category | Count |
|---|---|
| Executable test/spec files | 346 |
| `src/**/*.test.*` | 127 |
| `tests/**` executable test/spec | 185 |
| `scripts/**/*.test.mjs` | 34 |
| Playwright specs (`tests/e2e/*.spec.ts`) | 11 |
| Vitest configs | 2 (`vitest.config.mts`, `vitest.database.config.mts`) |
| Playwright configs | 6 |
| Package `test*` commands (excl. e2e/coverage) | 77 |
| Package `audit:*` commands | 23 |
| Package `test:e2e*` commands | 8 |
| Package coverage commands | 1 (`test:coverage`) |
| CI workflow validation steps (ci.yml + deploy.yml) | 18 |
| Protected evidence tracked files (not executable tests) | inventoried under `protectedEvidenceTrackedFiles` |
| Archive / generated reports | excluded from executable classification |

Excluded from executable classification (by design):

- `coverage/**`, Playwright report/result dirs, `.next/**`, `out/**`, `node_modules/**`
- `archive/**`
- protected evidence prefixes `test-results-customer-ordering/**`, `test-results-location-selector-layout/**`

## A. TEST-1 layer baseline

Classifications cite concrete repository evidence. Heuristic path tags in
`test-inventory.json` are diagnostic aids only; layer strength below is human-reviewed.

| # | Layer | Classification | Concrete evidence (non-exhaustive) | Notes |
|---|---|---|---|---|
| 1 | Unit | **STRONG_EXISTING_EVIDENCE** | `src/**/*.test.ts` (platform/config, pricing/money, auth helpers, persistence helpers); `tests/access-control/*.test.ts`; `tests/promotions/**`; `tests/menu-parity/**`; `tests/pricing-parity/**`; `scripts/**/*.test.mjs`; `npm run test` / `npm run test:scripts` | Large DB-free unit surface under `vitest.config.mts`. |
| 2 | Component | **EXISTING_EVIDENCE** | `src/components/**/*.test.tsx`; `src/app/**/*.test.tsx`; `tests/administration/*.test.tsx`; `tests/workforce-hub/**`; `tests/imp-036b/**`; `tests/imp-036c/**` | jsdom / Testing Library; not real-browser proof. |
| 3 | Domain/use-case | **STRONG_EXISTING_EVIDENCE** | `tests/cart/cart.domain.test.ts`; `tests/checkout/checkout.domain.test.ts`; `tests/order/**`; `tests/payment/**`; `tests/serviceability/domain.test.ts`; `tests/catalog/domain.service.test.ts`; `tests/assortment-availability/**`; `src/server/**/*.test.ts`; `src/shared/**/*.test.ts` | Broad domain suites; many require DB via `vitest.database.config.mts`. |
| 4 | Integration | **STRONG_EXISTING_EVIDENCE** | `tests/*-auth-integration/**`; `tests/customer-commerce/*.integration.test.ts`; `tests/operations/*.integration.test.ts`; `tests/administration/*integration*`; module-boundary suites under `tests/` | Controlled substitutes declared in fixtures (e.g. fake payment provider). |
| 5 | Database integration | **STRONG_EXISTING_EVIDENCE** | `tests/database/**/*.integration.test.ts`; `vitest.database.config.mts`; `npm run test:database*` | Real PostgreSQL intended; Session 3A inventoried structurally, did not orchestrate full DB suite. |
| 6 | HTTP/API contract | **EXISTING_EVIDENCE** | `tests/customer-auth/http.integration.test.ts`; `tests/customer-commerce/http.integration.test.ts`; `tests/workforce-auth/http.integration.test.ts`; `tests/administration/admin-http.integration.test.ts`; `tests/operations/*-http.integration.test.ts`; `npm run test:customer-commerce:http` | Present and partially wired into current CI. |
| 7 | Authorization/security | **STRONG_EXISTING_EVIDENCE** | `tests/access-control/**`; `tests/database/access-control.integration.test.ts`; `tests/*-security/**` (cart/checkout/order/payment/serviceability/customer-address/profile); `tests/imp-036b/maps-security.test.ts`; `npm run audit:access-control` | Explicit allow/deny / IDOR suites exist; most **not** in current CI. |
| 8 | Concurrency | **EXISTING_EVIDENCE** | `tests/cart-concurrency/**`; `tests/checkout-concurrency/**`; `tests/order-concurrency/**`; `tests/payment-concurrency/**`; `tests/refund-concurrency/**`; `tests/serviceability-concurrency/**`; `tests/customer-address-concurrency/**`; `tests/delivery-concurrency/**` | Dedicated race suites exist; **not** in current CI. |
| 9 | Recovery/idempotency | **EXISTING_EVIDENCE** | `tests/payment-idempotency/**`; `tests/database/idempotency.integration.test.ts`; `tests/database/outbox*.integration.test.ts`; `tests/order-crash/**`; `tests/payment-reconciliation/**`; `tests/refund-webhook/**`; `src/components/ordering/*recovery*.test.*`; `npm run audit:outbox-idempotency` | Present; **not** systematically in current CI. |
| 10 | Accessibility | **NO_IDENTIFIED_EVIDENCE** | No dedicated a11y runner, axe dependency, or accessibility test suite found under tracked paths. Incidental ARIA usage in components is not TEST-1 layer proof. | Gap for Session 3C / Product Definitions. |
| 11 | E2E browser/UI | **EXISTING_EVIDENCE** | `tests/e2e/*.spec.ts` (11 specs); Playwright configs; `npm run test:e2e*`; `scripts/e2e/run-*.mjs` | Real-browser suites exist; **none** execute in current `.github/workflows/ci.yml`. |
| 12 | Golden Journey regression | **PARTIAL_EVIDENCE** | Related E2E/domain suites map to some GJ rows below; no dedicated `GJ-*` tagged regression harness or CI job. Registry status ≠ execution evidence. | See Golden Journey table. |
| 13 | Founder UAT | **MANUAL_GATE** | Policy in TEST-1 / `AGENTS.md`; IMP-036E Founder UAT `NOT_PERFORMED`. Automated suites cannot supply founder verdict. | Not applicable as automated baseline. |

## B. Current CI inclusion

Source of truth: `.github/workflows/ci.yml` and `.github/workflows/deploy.yml`
(also mirrored in `test-inventory.json` → `ciWorkflows`).

### Runs on PR / push to `main` / `imp-**` (`ci.yml`)

| Step family | Command / action |
|---|---|
| Install | `npm ci` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Selected DB/catalog/cart suites | `npm run test:catalog-imp028c-modifiers`; `npm run test:catalog`; `npm run test:cart` |
| Customer-commerce HTTP | `npm run test:customer-commerce:http` |
| Menu projection unit | `node scripts/run-vitest.mjs run src/server/customer-commerce/menu/project-customer-menu.test.ts` |
| Menu modifier projection DB integration | `vitest.database.config.mts` + `tests/database/customer-menu-modifier-projection.integration.test.ts` |
| Selected script tests | `scripts/docker-tool-command-wiring.test.mjs`; `scripts/environment/staging.test.mjs`; `scripts/project-consistency.test.mjs` |
| Governance | `npm run project:consistency`; `npm run governance:fingerprint` |
| Docker tooling image | `docker build --target tooling` |
| Production build | `npm run build` |

### Exists but not executed by current CI (high-signal families)

| Family | Example commands / paths | Gap type |
|---|---|---|
| Default Vitest unit/component suite | `npm run test` (`vitest.config.mts`) | CI_WIRING_GAP |
| Coverage | `npm run test:coverage` | COVERAGE_VISIBILITY_GAP |
| Script test umbrella | `npm run test:scripts` (only 3 script files run in CI) | CI_WIRING_GAP |
| Most database suites | `npm run test:database`, `test:database:payment`, `test:database:order`, … | CI_WIRING_GAP / ENVIRONMENT_GAP |
| Security suites | `test:*-security`, `test:access-control` | CI_WIRING_GAP |
| Concurrency suites | `test:*-concurrency` | CI_WIRING_GAP |
| Recovery/idempotency | `test:payment-idempotency`, `test:order-crash`, `test:database:outbox-idempotency` | CI_WIRING_GAP |
| Checkout/payment/order domain | `test:checkout`, `test:payment*`, `test:order*` | CI_WIRING_GAP |
| Serviceability / assortment / promotions / pricing | corresponding `test:*` / `audit:*` | CI_WIRING_GAP |
| Administration / workforce HTTP | `test:administration`, `test:workforce-auth:http` | CI_WIRING_GAP |
| Store operations (IMP-036E) | `tests/operations/store-http.integration.test.ts`; `src/components/operations/store/StoreShell.test.tsx` | CI_WIRING_GAP |
| All Playwright E2E | `test:e2e*` | CI_WIRING_GAP / ENVIRONMENT_GAP |
| Full `npm run check` audit chain | `audit:*`, `auth:schema:check`, `db:*:check` | CI_WIRING_GAP |
| Nightly / release / flake quarantine policy jobs | **NONE_IDENTIFIED** in workflows | FLAKE_POLICY_GAP / GOLDEN_JOURNEY_GAP |
| Accessibility automation | **NONE_IDENTIFIED** | ACCESSIBILITY_GAP |

`deploy.yml` builds and publishes GitHub Pages only; it is not TEST-1 verification CI.

Inventory heuristic: ~18 executable files currently CI-included vs ~327 not (path/command matching); treat as approximate — exact step list above is authoritative.

## C. Critical risk coverage

| Risk area | Tests identified | TEST-1 layers represented | Important missing layers | CI inclusion | Coverage measurement |
|---|---|---|---|---|---|
| Authentication | `tests/customer-auth/**`; `tests/workforce-auth/**`; `tests/database/*auth*`; `tests/e2e/customer-auth.spec.ts`; `tests/e2e/workforce-auth.spec.ts`; `audit:auth-foundation`; `audit:customer-phone-auth`; `audit:workforce-auth` | 1,3,4,5,6,7,11 | Dedicated a11y; GJ-tagged continuity | PARTIAL (none of these in ci.yml except governance-adjacent script tests) | UNAVAILABLE (coverage run failed; see §Coverage) |
| Authorization / cross-resource denial | `tests/access-control/**`; `tests/*-security/**`; `tests/database/access-control.integration.test.ts`; admin UI/transport security tests | 1,3,4,5,7 | E2E cross-portal deny journeys | NO in ci.yml | UNAVAILABLE |
| Catalog | `tests/catalog/**`; `tests/database/catalog.integration.test.ts`; `tests/ordering-catalog/**`; `audit:catalog`; CI runs `test:catalog*` | 1,3,5 | GJ product/menu launch (IMP-036F planned) | YES (selected) | UNAVAILABLE |
| Assortment / availability | `tests/assortment-availability/**`; `tests/database/assortment-availability.integration.test.ts`; store availability UI tests in `StoreShell.test.tsx` | 2,3,5 | Cross-capability customer E2E after operator change; IMP-036E acceptance outstanding | NO | UNAVAILABLE |
| Serviceability | `tests/serviceability/**`; `tests/database/serviceability.integration.test.ts`; `tests/e2e/imp-036b-uat-precert.spec.ts`; location selector E2E; `audit:serviceability` | 3,5,7,8,11 | Store distance-policy edit continuity pending IMP-036E UAT | NO | UNAVAILABLE |
| Pricing / tax | `tests/pricing-tax/**`; `tests/pricing-parity/**`; `tests/database/pricing-tax.integration.test.ts`; `audit:pricing-tax` | 1,3,5 | Browser money-display a11y | NO | UNAVAILABLE |
| Promotions | `tests/promotions/**`; `tests/promotion-*`; `tests/payment-promotions/**`; `tests/database/promotions*.integration.test.ts`; `audit:promotions` | 1,3,5 | Full GJ promotion continuity | NO | UNAVAILABLE |
| Cart | `tests/cart/**`; `tests/cart-*`; `tests/database/cart.integration.test.ts`; `audit:cart`; CI `test:cart` | 3,4,5,7,8 | — | YES (domain/DB cart suite) | UNAVAILABLE |
| Checkout | `tests/checkout/**`; `tests/checkout-*`; `tests/database/checkout.integration.test.ts`; `audit:checkout`; E2E customer-ordering | 3,4,5,7,8,11 | CI wiring for domain/security/concurrency | NO (E2E/domain not in CI) | UNAVAILABLE |
| Payment | `tests/payment/**`; `tests/payment-*`; `tests/database/payment.integration.test.ts`; Razorpay mock E2E; `audit:payment` | 3,4,5,7,8,9,11 | CI wiring; real-provider sandbox cadence | NO | UNAVAILABLE |
| Order | `tests/order/**`; `tests/order-*`; `tests/database/order.integration.test.ts`; ops lifecycle E2E; `audit:order` | 3,4,5,7,8,9,11 | CI wiring | NO | UNAVAILABLE |
| Cancellation | Ops lifecycle E2E cancel path; order domain/security suites; IMP-036D capability tests under operations/order | 3,5,7,11 | Dedicated customer self-serve cancel (deferred by VISION); GJ continuity CI | NO | UNAVAILABLE |
| Refund | `tests/refund-*`; `tests/database/refund*.integration.test.ts`; `OperationsRefundPanel` component tests; ops refunds HTTP | 2,3,5,7,8,9 | CI wiring; browser refund journey | NO | UNAVAILABLE |
| Financial documents | `tests/database/financial-document*.integration.test.ts`; `src/shared/financial-document/**/*.test.ts`; customer commerce financial-document HTTP | 1,3,5,6 | Browser presentation E2E; CI wiring | NO | UNAVAILABLE |
| Concurrency-sensitive logic | Dedicated `*-concurrency` suites listed in layer 8 | 8 (+ DB) | CI / nightly cadence | NO | UNAVAILABLE |
| Recovery / idempotency | Layer 9 suites + payment recovery E2E cases in `customer-ordering.spec.ts` | 9,11 | CI / nightly GJ job | NO | UNAVAILABLE |
| Workforce operations | `tests/operations/**`; `tests/e2e/operations-lifecycle.spec.ts`; `tests/e2e/workforce-auth.spec.ts`; administration suites; store shell tests | 2,3,5,6,7,11 | Store ops Founder UAT; CI wiring | NO | UNAVAILABLE |

## Golden Journey evidence mapping (GJ-1)

Registry status is copied from GJ-1. Evidence characterization is about **identifiable automated artifacts**, not pass claims.

| Journey | Registry status | Relevant executable evidence | Evidence characterization | Browser evidence | Runs in current CI | Known boundary |
|---|---|---|---|---|---|---|
| `GJ-FIRST-ORDER` | CURRENT | `tests/e2e/customer-ordering.spec.ts` (guest→pay→history); customer-commerce HTTP; cart/checkout/payment/order DB suites; menu projection tests | **PARTIAL** (strong related suites; no GJ-tagged CI regression job; Session 3A did not re-run E2E) | YES | NO | Accepted customer path continuity; not public-GTM readiness |
| `GJ-RETURNING-ORDER` | PARTIAL | Account/history/address suites (`tests/imp-036b/**`, customer profile/address DB); ordering E2E does not prove separate Order Again shortcut | **PARTIAL** | PARTIAL | NO | Order Again operation not accepted; must revalidate, never replay Checkout Snapshot |
| `GJ-AVAILABILITY` | PARTIAL | Assortment/availability domain+DB; `StoreShell.test.tsx` availability mutations; customer menu projection | **PARTIAL** | NO (no cross-actor E2E identified) | NO | IMP-036E acceptance outstanding; Founder UAT not performed |
| `GJ-PRODUCT-MENU-LAUNCH` | PLANNED | **NONE for formal story/AC** — IMP-036F not activated | **NONE_IDENTIFIED** (planning contract only) | NO | NO | `IMP-036F` PLANNED / NOT_ACTIVATED; formal story/AC evidence NOT YET DEFINED — do not create |
| `GJ-STORE-PAUSE-RESUME` | PARTIAL | `tests/assortment-availability/operating-state.test.ts`; store pause/resume UI in `StoreShell.test.tsx`; serviceability domain | **PARTIAL** | NO | NO | IMP-036E UI requires outstanding Founder UAT / acceptance |
| `GJ-PERMITTED-OUTLET-ACCESS` | CURRENT | Administration suites (`tests/administration/**`); access-control suites; workforce hub tests; workforce-auth E2E | **PARTIAL** | PARTIAL (auth E2E; not full admin membership→outlet deny matrix in browser) | NO | Accepted Administration/portal navigation; no invitation provisioning promise |
| `GJ-PAYMENT-RECOVERY` | CURRENT | `tests/e2e/customer-ordering.spec.ts` dismiss/failure/retry cases; `tests/payment-idempotency/**`; payment recovery presentation unit tests; payment security/reconciliation | **STRONG** relative to other journeys (dedicated browser recovery cases exist) | YES | NO | Authoritative Payment/Order truth; failed-payment history deferred |
| `GJ-CANCELLATION-REFUND` | CURRENT | `tests/e2e/operations-lifecycle.spec.ts` (Accept/Fulfil/Cancel); refund DB/application/concurrency/webhook suites; Operations refund panel tests | **PARTIAL** | PARTIAL (cancel in E2E; refund browser continuity thinner) | NO | Cancellation never silently triggers Refund; customer self-serve cancel/refund out of scope |
| `GJ-TRADING-HOURS` | PARTIAL | Store hours validation in `StoreShell.test.tsx`; assortment operating-state; serviceability evaluation | **PARTIAL** | NO | NO | IMP-036E workspace acceptance outstanding |
| `GJ-ADDRESS-SERVICEABILITY` | PARTIAL | IMP-036B/C tests; `tests/e2e/imp-036b-uat-precert.spec.ts`; location selector E2E; serviceability DB/security/concurrency; store serviceability client (IMP-036E unaccepted) | **PARTIAL** | YES (customer side) | NO | Store distance-policy editing continuity depends on unaccepted IMP-036E |

## Coverage baseline

| Field | Value |
|---|---|
| Command | `npm run test:coverage` → `node scripts/run-vitest.mjs coverage` |
| Provider / config | Vitest V8; `vitest.config.mts` → `coverage.include = src/**/*.{ts,tsx}` with listed excludes |
| Result | **BASELINE_FAILED** |
| Aggregate statements/branches/functions/lines | **NOT_OBTAINED** — coverage report not produced |
| Artifact location | `coverage/` not created (gitignored; run aborted before usable summary) |
| generated_output_staged | NO |

Failure facts (exact, Session 3A run on baseline tree):

1. **2 failing tests** under default Vitest include:
   - `src/components/operations/OperationsDeliveryPanel.test.tsx` — assertion expects copy `External booking may now be attempted` (source drifted).
   - `src/components/operations/OperationsOrderDetailShell.test.ts` — `ENOENT` for `src/app/workforce/operations/orders/detail/page.tsx`.
2. Additional **unhandled rejections** during `OperationsOrderDetailClient` / refund panel interaction (`result.ok` on undefined).
3. Coverage provider also emitted **Rolldown parse errors** while remapping uncovered files (secondary; suite already failing).

Per session rules: product tests were **not** modified to obtain a percentage. TEST-1’s ≥90% branch target remains **prospective** for new critical logic from IMP-036F; it is **not** retroactively imposed on the existing platform.

Critical-domain branch % from coverage data: **NONE_IDENTIFIED** (no report).

### Related execution baseline (non-staging)

| Command | Result | Notes |
|---|---|---|
| `npm run test` | FAIL | 4 files / 9 tests failed (includes DeliveryPanel, OrderDetailShell, RefundPanel cases). Pre-existing vs this session; not fixed (out of authorization). |
| `npm run test:scripts` | FAIL | 548 pass / 2 fail: `scripts/audit-customer-phone-auth.test.mjs`, `scripts/audit-persistence.test.mjs` (file-level exit 1 while helper subtests largely pass). Pre-existing; not fixed. |
| `node --test scripts/testing-inventory.test.mjs` | PASS | New tooling |
| `node scripts/testing-inventory.mjs --check` | PASS | Snapshot matches |

Database / broad E2E orchestration: **not executed** in Session 3A (structural inventory only; cadence deferred to 3B/3C).

## Future IMP-036F+ traceability model (mechanism only)

Required mapping shape from TEST-1 (do not invent IMP-036F rows yet):

| Story ID | AC ID / GJ ID | Behaviour / risk | Applicable layers or N/A | Executable test/check | Exact candidate / result / artifact |
|---|---|---|---|---|---|
| `US-<IMP>-NNN` | `AC-<IMP>-NNN-NN` / `GJ-...` | Observable outcome | Selected layers | Command + path | SHA / tree / fingerprint / exit / evidence path |

```text
IMP036F_PRODUCT_DEFINITION = NOT_CREATED
IMP036F_STORIES = NOT_CREATED
IMP036F_ACCEPTANCE_SCENARIOS = NOT_CREATED
IMP036F_ACTIVATED = NO
```

Session 3A establishes inventory + baseline + gap analysis only.

## OUT_OF_SCOPE_OBSERVATION

Default Vitest suite and two audit script tests fail on the authorized baseline SHA without this session’s changes. Repair requires a separately authorized product/test fix and is outside Session 3A scope.
