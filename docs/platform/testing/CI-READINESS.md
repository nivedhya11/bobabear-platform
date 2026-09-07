# CI readiness evidence (Session 3B1)

```text
STATUS: SUPPORTING ENGINEERING EVIDENCE
Authority: docs/platform/TESTING.md (TEST-1)
```

## Purpose

Record Session 3B1 reproduction, classification, and repair of Session 3A
baseline blockers so `npm run test` and `npm run test:scripts` can be treated
honestly as mandatory CI candidates. This document does **not** modify TEST-1
authority, ROADMAP/STATE lifecycle, or Founder UAT.

```text
FOUNDER_UAT = NOT_PERFORMED (separate gate; unchanged)
IMP036E_ACCEPTED = NO
IMP036F_ACTIVATED = NO
```

## Session 3A baseline reference

Historical failures remain recorded in [`BASELINE.md`](./BASELINE.md) at the
Session 3A candidate lineage (parent of this repair). Do not rewrite that
baseline to appear green.

Gap analysis context: [`CI-GAP-ANALYSIS.md`](./CI-GAP-ANALYSIS.md).

## Session 3B1 base identity

```text
BRANCH = chore/ci-readiness-repair-and-plan
BASE_SHA = 5cb3262d8b482cffea811556c9564a2932e53ab1
BASE_TREE = 726713980e750369517ae4eb064a2dd1520fb012
```

## Failure classification and repair

| ID | Failing command / surface | Observed | Authoritative behaviour | Root cause | Correction | After |
|---|---|---|---|---|---|---|
| A | `npm run test` — `OperationsDeliveryPanel.test.tsx` | Asserted stale copy `"External booking may now be attempted"` | Current panel copy: begin-manual-booking instruction + unresolved outcome copy; must not invite a fresh external attempt before begin | `STALE_TEST` | Assert current source strings; forbid old copy | PASS |
| B | `npm run test` — `OperationsOrderDetailShell.test.ts` | `ENOENT` on `src/app/workforce/operations/orders/detail/page.tsx` | Canonical route under `src/app/workforce/(portal)/operations/orders/detail/page.tsx`; href `/workforce/operations/orders/detail` | `STALE_TEST` | Point shell test at `(portal)` route | PASS |
| C | `npm run test` — Operations order detail / refund panel | Unhandled rejections on `result.ok` when mocks returned `undefined` | Production clients return shaped `{ ok, ... }` results; tests must mock that shape | `TEST_HARNESS_DEFECT` | Shared `mock-operations-refunds.ts` refs used by both suites | PASS |
| D | `npm run test:scripts` — `audit-customer-phone-auth.test.mjs` | File-level exit 1 despite helper subtests | Audit must detect login app path / CLI main guard correctly | `AUDIT_TOOLING_DEFECT` | Align `LOGIN_APP_DIR`, main-guard so import does not set `exitCode` | PASS |
| E | `npm run test:scripts` — `audit-persistence.test.mjs` | File-level exit 1 despite helper subtests | Allowlist must cover current admin/ops/workforce-auth and IMP-036C fixtures; ignore `import type` | `AUDIT_TOOLING_DEFECT` | Allowlist + type-import ignore + main-guard; tests updated | PASS |
| F | `npm run test` intermittent AccountShell / Nav / location | Cross-file `vi.mock` pollution under `isolate: false` + `mockReset` | Components use real chrome-session/client or per-file location doubles | `TEST_HARNESS_DEFECT` | Set `isolate: true` in `vitest.config.mts`; remove addresses chrome-session stub; `importActual` client mocks; CustomerLogin chrome-session `importActual` | PASS (3/3 consecutive full-suite runs) |
| G | `npm run test:coverage` | Suite flakes + Rolldown/V8 remap warnings on auth mains | Coverage provider V8; include `src/**/*.{ts,tsx}` | `COVERAGE_TOOLING_DEFECT` (residual) | No dependency upgrade in 3B1; metrics recorded when green | PASS intermittent (2/3); see metrics |

No `PRODUCT_DEFECT` requiring production source change was confirmed for the Session 3A blockers.

## Broad suite results (post-repair)

| Command | Result | Notes |
|---|---|---|
| `npm run test` | PASS | 174 files / 1437 tests; 3 consecutive green runs with `isolate: true`; no unhandled rejection warnings attributable to the repaired suites |
| `npm run test:scripts` | PASS | 549 pass / 0 fail |
| `npm run test:coverage` | INTERMITTENT | 2/3 green in Session 3B1 sample; one flake in `StoreShell.test.tsx` under coverage instrumentation |

E2E / database suites were **not** executed in Session 3B1.

## Coverage baseline (when green)

Captured from a green `npm run test:coverage` run after repairs:

```text
provider = v8
include = src/**/*.{ts,tsx} (vitest.config.mts exclusions unchanged)
statements = 29.21% (8814/30165)
branches = 26.71% (6038/22605)
functions = 33% (1751/5305)
lines = 29.79% (8354/28041)
output = coverage/ (do not stage)
```

Sample directory branch rates from the same report (not exhaustive; no fabrication):

| Area | Statements | Branches | Notes |
|---|---|---|---|
| `src/server/cart` | 0% | 0% | Broad unit suite does not exercise DB cart server |
| `src/server/order` | 3.39% | 0% | Primarily proven under database configs |
| `src/server/refund` | 1.33% | 1.68% | Same |
| `src/shared/cart` | 10.59% | 3.8% | |
| `src/shared/order` | 21.87% | 12.88% | |
| `src/shared/refund` | 52.04% | 28.16% | |

TEST-1 ≥90% branch target for **new** critical logic remains prospective. Session 3B1 does **not** enforce a coverage threshold.

Rolldown parse warnings on customer-auth / workforce-auth `main.ts` entrypoints may still appear; those paths remain outside meaningful unit coverage scope.

## Unresolved items

1. Coverage job not yet reliably green under instrumentation (residual flake + tooling warnings) → `SESSION_3B2_COVERAGE_JOB_READY = NO` until a consecutive green sample or separately authorized tooling work.
2. Workflow implementation deferred to Session 3B2 (see [`CI-JOB-CONTRACT.md`](./CI-JOB-CONTRACT.md)).
3. Branch protection / required-check GitHub settings remain founder-authorized separately.

## Explicit non-claims

- Does not claim E2E, database, concurrency, or Golden Journey suites passed.
- Does not claim Founder UAT.
- Does not modify TEST-1, VISION, ROADMAP, STATE, ARCHITECTURE, or the decision register.
