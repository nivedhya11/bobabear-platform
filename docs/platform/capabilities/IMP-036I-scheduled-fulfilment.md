<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-036I",
  "title": "Scheduled Fulfilment",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "architectureFit": "PASS",
  "architectureFitResult": "PASS",
  "architectureFitExecution": "PERFORMED",
  "implementation": "IMPLEMENTATION_IN_PROGRESS",
  "implementationAuthorized": true,
  "implementationStarted": true,
  "implementationComplete": false,
  "impAccepted": false,
  "schemaChangeRequired": true,
  "migrationRequired": true,
  "founderUatRequired": true,
  "founderUat": "NOT_PERFORMED",
  "lastReviewed": "2026-09-25",
  "productDefinition": "PD-IMP-036I-DRAFT-4",
  "productDefinitionGate": "PASS",
  "bindingDecisions": ["D-379", "ADR-019", "D-380", "ADR-020"],
  "architectureRevision": "ARCH-R23",
  "invariant": "ARCH-G29",
  "deliveryFinalityInvariant": "ARCH-G30",
  "amends": ["D-378"],
  "bindingFoundations": ["ADR-005", "ADR-007", "ADR-008", "ADR-011", "ADR-012", "ADR-018", "D-357", "D-359", "D-360", "D-365", "D-372", "D-373", "D-377", "D-378", "D-379", "D-380", "ARCH-R23", "ARCH-G28", "ARCH-G29", "ARCH-G30"],
  "dependsOn": ["IMP-021", "IMP-023", "IMP-024", "IMP-028", "IMP-029", "IMP-030", "IMP-031", "IMP-032", "IMP-033", "IMP-036B", "IMP-036C", "IMP-036D", "IMP-036E", "IMP-036H"],
  "architectureBase": "ARCH-R23",
  "independentArchitectureFitReview": "PASS",
  "independentArchitectureFitReviewId": "5312653831"
}
-->

# IMP-036I — Scheduled Fulfilment

## Capability Architecture — ARCHITECTURE_LOCKED

This document is the **locked capability architecture** for IMP-036I against approved
**`PD-IMP-036I-DRAFT-4`** (Product Definition Gate **PASS**; independent review `5307761142`).
Independent Architecture Fit review **PASS** (`5312653831`) evaluated candidate HEAD
`42e854b931e216fadc64b479371cebca4c38d17e` / tree
`279e0e1b0e8f52c96cfd12fc89b329f73281e38f` / fingerprint
`b65f40b9e568a6d0188f1d031f41db3a072cb3b4683d2d966c2a994283575068`.
Human architecture lock approval **2026-09-25**. Explicit human implementation authorization
**2026-09-25** (`IMPLEMENTATION_AUTHORIZED` / `STARTED`). Tranche 1 runtime foundations have started.
Execution plan: [`../product/IMP-036I/implementation-plan.md`](../product/IMP-036I/implementation-plan.md).

```text
STATUS = IMPLEMENTATION_IN_PROGRESS
AUTHORITY = CAPABILITY_ARCHITECTURE
PRODUCT_DEFINITION = PD-IMP-036I-DRAFT-4
PRODUCT_DEFINITION_GATE = PASS
ARCHITECTURE_FIT_EXECUTION = PERFORMED
ARCHITECTURE_FIT_RESULT = PASS
ARCHITECTURE_FIT = PASS
ARCHITECTURE_LOCK = LOCKED
IMPLEMENTATION_AUTHORIZED = YES
IMPLEMENTATION_STARTED = YES
IMPLEMENTATION_COMPLETE = NO
IMP_ACCEPTED = NO

INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PASS
INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID = 5312653831
ARCHITECTURE_FIT_EVALUATED_HEAD = 42e854b931e216fadc64b479371cebca4c38d17e
ARCHITECTURE_FIT_EVALUATED_TREE = 279e0e1b0e8f52c96cfd12fc89b329f73281e38f
ARCHITECTURE_FIT_EVALUATED_WORKING_TREE_FINGERPRINT = b65f40b9e568a6d0188f1d031f41db3a072cb3b4683d2d966c2a994283575068

AF_TOTAL = 19
AF_RESOLVED = 19
AF_OPEN = 0
OPEN_ARCHITECTURE_QUESTIONS = NONE
RED_DECISIONS_REQUIRED = NONE

SCHEMA_CHANGE_REQUIRED = YES
MIGRATION_REQUIRED = YES
NEW_DEPLOYABLE_SERVICE = NO
NEW_CONTAINER = NO
NEW_QUEUE = NO
NEW_BROKER = NO
NEW_EXTERNAL_PROVIDER = NO
NEW_AUTH_REALM = NO
NEW_ROLE = NO
NEW_PERMISSION = NO

D379_STATUS = CURRENT
ADR019_STATUS = Accepted
D380_STATUS = CURRENT
ADR020_STATUS = Accepted
CURRENT_ARCHITECTURE = ARCH-R23
CURRENT_DECISION_REGISTER = DR-21
ARCH_G29_STATUS = CURRENT
ARCH_G30_STATUS = CURRENT
CURRENT_D378 = AMENDED (ASAP-only / no-scheduled-schema clauses only; mode remainder binding)
CURRENT_ADR018 = AMENDED (accepted Pickup/Delivery mode remainder preserved)
CURRENT_ARCH_G28 = CURRENT (mode axis; timing axis is ARCH-G29 / D-379)
CURRENT_IMP031 = ARCHITECTURE_LOCKED (CURRENT; successful-completion replacement clarified by D-380 CURRENT)
HUMAN_ARCHITECTURE_DIRECTION_D380 = APPROVED_2026-09-25
INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID = 5312653831
PRE_EXISTING_DELIVERY_CONFORMANCE_DEBT = CLOSED
PRE_EXISTING_DELIVERY_CONFORMANCE_DEBT_CORRECTION_AUTHORIZED = YES
PRE_EXISTING_DELIVERY_CONFORMANCE_DEBT_RUNTIME_FIXED = YES

IMP036I_ARCHITECTURE_FIT = PASS
IMP036I_ARCHITECTURE_LOCKED = YES
IMP036I_IMPLEMENTATION_AUTHORIZED = YES
IMP036I_IMPLEMENTATION_STARTED = YES
```

Architecture lock itself did **not** create migrations, deploy, perform Founder UAT, or accept IMP-036I. Tranche 1 later persisted migration `0045`. Implementation remains **NOT_COMPLETE** and unaccepted.
Historical independent Fit STOP reviews (`5309072645`, `5309240283`,
`5309972440`) remain historical; they are not current blockers.

| Field | Value |
|---|---|
| Architecture lock | `LOCKED` / `YES` |
| Formal ROADMAP lifecycle | `IMPLEMENTATION_IN_PROGRESS` (`IMP036I_ACTIVATED: YES`) |
| Product Definition | `PD-IMP-036I-DRAFT-4` **APPROVED**; Gate **PASS** |
| Canonical Architecture Fit | **PASS** (independent review `5312653831`) |
| Implementation | **AUTHORIZED** / **STARTED** / **NOT_COMPLETE** |
| Schema change / migration | **YES** (authorized for tranche 1; not executed by authorization persistence) |
| Binding D-number (timing) | **D-379** (`CURRENT`) |
| Binding ADR (timing) | **ADR-019** (`Accepted`) |
| Binding D-number (Delivery finality) | **D-380** (`CURRENT`; human direction APPROVED 2026-09-25) |
| Binding ADR (Delivery finality) | **ADR-020** (`Accepted`) |
| Global architecture | **ARCH-R23** / **ARCH-G29** + **ARCH-G30** (`CURRENT`) |
| D-378 relationship | **AMENDED** by D-379 only for ASAP-only / no-scheduled-schema reservation; mode remainder binding |
| Delivery replacement relationship | IMP-031 remains CURRENT/LOCKED; D-380 clarifies successful-completion finality prospectively; does not supersede IMP-031 wholesale |
| New permission / role / auth / deployable | **NO** |
| Founder UAT required (future acceptance) | **YES** |

---

## 1. Authority / status

Verified starting authority for this candidate (original Fit authoring tip; remediation preserves
governance markers and does not advance ROADMAP/STATE):

```text
Repository: /home/ajoshi/repos/boba-bear-platform
Remote: nivedhya11/bobabear-platform
origin/main HEAD (Fit STOP review baseline): 9f5f5e686c9648620b0e4cf60526138db4c1e79a
origin/main tree: 2913d6f94e8c7c20ecf0f2bc13acc67215122373
WORKING_TREE_FINGERPRINT (clean tip at STOP baseline): 291af7815f68b5d2148dea55b5de8690833a0578ba418ea1051d503a3c04d48a
VISION = VISION-1
ROADMAP = GTM-R153
STATE = STATE-R151
ARCHITECTURE = ARCH-R22
DECISION REGISTER = DR-20
PRODUCT DELIVERY = PD-1
TESTING = TEST-1
PERSONA = PERSONA-1
GOLDEN JOURNEYS = GJ-1
Product Definition = docs/platform/product/IMP-036I/product-definition.md (APPROVED)
Product Definition Gate evidence = independent review 5307761142
Independent Architecture Fit review (STOP): 5309072645
Independent Architecture Fit review (STOP #2 reminder ordering): 5309240283
Independent Architecture Fit review (STOP #3 Delivery completion gate): PR #262 thread 4097747389
Independent Architecture Fit review (STOP #4 Delivery authority / lineage): 5309837751
  (PR #263 threads 4097911250 / 4097911261)
Independent Architecture Fit review (STOP #5 Delivery replacement authority conflict): 5309972440
  (PR #264 finding 4098211380)
Human architecture direction D-380 APPROVED: 2026-09-25
acceptedThrough = IMP-036H
currentProductSlice = IMP-036I
nextProductSlice = IMP-037
pendingAcceptance = NONE
PROGRAM_PAUSE = PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED
PROGRAM_PAUSE_AUTHORITY = D-377
```

Historical Fit STOP remediation (preserved; not a current open blocker) repaired the candidate for
Blockers A / B / B1 / B2 / B3 + §28 traceability; STOP #2 reminder co-stage ordering with
`OUT_FOR_DELIVERY` at rank 40; STOP #3 authoritative Delivery `DELIVERED` send-time gate independent
of notification rank-50 catch-up; STOP #4 / #5 Delivery completion authority. **D-380 / ADR-020
CURRENT** resolves IMP-031 “authoritatively inactive” ambiguity for successful completion: no
post-`DELIVERED` normal replacement; no unique “lineage tip” dependency; deterministic
`EXISTS DELIVERED` suppression; `PRE_EXISTING_DELIVERY_CONFORMANCE_DEBT` for runtime
DELIVERED-predecessor acceptance remains an implementation conformance obligation.
AF-036I-13 and AF-036I-16 are **accepted Architecture Fit authority** against CURRENT D-380.
Independent Architecture Fit review `5312653831` = **PASS**. Architecture remains **LOCKED**.
Implementation is **AUTHORIZED** / **STARTED** / **NOT_COMPLETE** (`IMPLEMENTATION_IN_PROGRESS`).
This document does not mark IMP-036I complete or accepted.

Canonical ROADMAP/STATE tip markers after implementation authorization:

```text
IMP036I_PRODUCT_DEFINITION: APPROVED
IMP036I_PRODUCT_DEFINITION_GATE: PASS
IMP036I_ARCHITECTURE_FIT: PASS
IMP036I_ARCHITECTURE_LOCKED: YES
IMP036I_IMPLEMENTATION_AUTHORIZED: YES
IMP036I_STARTED: YES
IMP036I_IMPLEMENTATION_STARTED: YES
IMP036I_IMPLEMENTATION_COMPLETE: NO
IMP036I_ACCEPTED: NO
IMP-036I formal lifecycle: IMPLEMENTATION_IN_PROGRESS
PROGRAM_PAUSE_AUTHORITY: D-377
```

`product_semantics_changed = NO` relative to approved `PD-IMP-036I-DRAFT-4`.

Traceability vocabulary:

```text
FD-036I-01 … FD-036I-22
BR-036I-001 … BR-036I-019
AC-036I-001 … AC-036I-066
US-036I-001 … US-036I-016
AF-036I-01 … AF-036I-19
```

---

## 2. Purpose and approved Product Definition reference

Satisfy `PD-IMP-036I-DRAFT-4` business outcome:

> Authenticated customers choose ASAP or SCHEDULED fulfilment timing for Delivery and Pickup as an
> orthogonal axis to fulfilment mode; purchase seals immutable timing promise + cancellation cutoff;
> Ops sees Scheduled Orders immediately with derived due cues; Scheduled Delivery remains
> operator-approved under IMP-032; one proactive reminder uses existing notification outbox —
> without ScheduledOrder aggregates, new Order lifecycle statuses, slot capacity engines, automatic
> Delivery booking, new deployable schedulers, or new roles/permissions.

---

## 3. Preserved global invariants

| Invariant / decision | Preservation |
|---|---|
| ARCH-G01 / D-359 / D-360 | Static Next export; customer-commerce `/api/v1/*`; no Next Route Handlers as authority |
| ARCH-G02 / ARCH-G14 | No new deployable service, queue, or broker |
| ARCH-G05 | Immutable Checkout Snapshot remains purchased commercial + timing truth |
| ARCH-G07 / D-357 | Order lifecycle PLACED \| ACCEPTED \| FULFILLED \| CANCELLED unchanged; no SCHEDULED/READY/DUE/LATE statuses |
| ARCH-G09 | Optimistic Checkout revision; no silent last-write-wins on timing mutations |
| ARCH-G11 | Browser never authoritative for eligibility / cutoff / money / authorization |
| ARCH-G13 | PostgreSQL authoritative persistence; forward-only migrations |
| ARCH-G23 / D-372 | Workforce ops on `/api/operations/v1/*` |
| ARCH-G24 / ADR-011 / IMP-031 | Delivery remains provider-neutral; never created for PICKUP |
| ARCH-G25 / D-373 | Admin on `/api/admin/v1/*` |
| ARCH-G26 / ARCH-G27 / D-375 | Pilot topology + IMP-038 controls; no new CSP host for scheduling |
| ARCH-G28 / D-378 / ADR-018 | Mode DELIVERY \| PICKUP ownership + Pickup fail-closed preserved; ASAP-only reservation amended only by proposed D-379 after lock |
| ADR-005 | Permission keys + server-derived scope; no role-name bypass; **no new permission** |
| ADR-007 | Pricing owns charges/tax/promotions; scheduling does not reprice purchased commerce |
| ADR-008 | Cart intent vs Checkout Snapshot payable truth; serviceability remains Delivery-gated |
| ADR-012 / IMP-033 | Notification platform; reminder extends notification-owned outbox event family only |
| D-365…D-367 | Financial Document / refund statutory / signing authorities unchanged |
| D-364 | Refund foundation unchanged |
| IMP-032 | `MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY`; operator-approved dispatch; no auto booking |
| D-377 | Program pause / IMP-037/038 hold preserved |

---

## 4. Locked global decision (AF-036I-19)

### 4.1 Does IMP-036I require a new durable architecture decision?

**YES.**

**Reason (VERIFIED at Fit):** ARCH-G28 / D-378 locked mode architecture as ASAP-only and reserved
scheduled-fulfilment schema to IMP-036I. Scheduling therefore could not silently mutate D-378; it
required an orthogonal timing decision. After this lock, D-379 amends only those clauses. D-378
remains binding for mode.

### 4.2 Locked artifacts

| Artifact | Status | Lock action |
|---|---|---|
| **D-379** — Scheduled Fulfilment Timing + Future Execution Boundary | **CURRENT** | Promoted after independent Fit PASS `5312653831` + this lock |
| **ADR-019** — Scheduled Fulfilment Timing and Execution Boundary | **Accepted** | Accepted with D-379 |
| **D-380** — Delivery Successful-Completion Finality + Replacement Boundary | **CURRENT** (human direction APPROVED 2026-09-25) | Promoted after independent Fit PASS + this lock |
| **ADR-020** — Delivery Successful-Completion Finality and Replacement Boundary | **Accepted** | Accepted with D-380 |
| **ARCH-G29** | **CURRENT** | Recorded in ARCHITECTURE.md |
| **ARCH-G30** | **CURRENT** | Recorded in ARCHITECTURE.md |
| **ARCH-R23** | **CURRENT** | Advanced ARCH-R22 → ARCH-R23 |
| **DR-21** | **CURRENT** | Lock-persistence decision-register revision |

### 4.3 D-378 / IMP-031 amendment relationships

```text
D-378:
  AMENDED by D-379 only for the ASAP-only / scheduled-schema reservation clauses.
  Continues to govern:
    DELIVERY | PICKUP mode
    Pickup Delivery fail-closed boundary
    selected Outlet authority
    Pickup destination/privacy boundary
    Pickup delivery-charge boundary

D-379:
  CURRENT.
  Governs orthogonal timing axis: ASAP | SCHEDULED
  Owns Snapshot timing sealing, eligibility composition boundary, reminder execution boundary,
  future-closure minimal model, lead-time / cancellation-policy persistence split.
  Consumes D-380 Delivery successful-completion truth for Scheduled Delivery reminder eligibility.
  Does NOT redefine Delivery replacement semantics.

D-380:
  CURRENT.
  Clarifies/amends IMP-031 “authoritatively inactive” replacement interpretation for
  successful-completion finality only.
  Does NOT supersede IMP-031 wholesale, Delivery lifecycle, one-active rule, stable request
  identity, booking ambiguity, failure/cancellation, return progression, IMP-032, or Order lifecycle.
  Durable Delivery-domain rule applicable beyond Scheduled Fulfilment.

ARCH-G28:
  Fulfilment mode is orthogonal to fulfilment timing;
  Scheduled timing is governed by D-379 / ARCH-G29.
  PICKUP still creates no Delivery aggregate.

ARCH-G30:
  Delivery.status = DELIVERED is durable successful execution truth.
  A normal replacement Delivery cannot supersede it.
  Correction requires separately authorized history-preserving authority.
  Consumers such as Scheduled reminder eligibility may rely on committed DELIVERED completion
  truth without waiting for notification or Order coordination catch-up.
```

### 4.4 Authority conflict reconciliation (STOP #5 → D-380 CURRENT)

```text
CONFLICT (truthfully recorded; not silently rewritten):

CURRENT locked IMP-031:
  new/replacement Delivery after prior booking is “authoritatively inactive”
  → ambiguous because DELIVERED is terminal/inactive yet successful

ADR-011 (HISTORICAL / future-binding intent — not CURRENT decision authority):
  replacement only after cancelled or confirmed failed;
  provider switching after pickup prohibited

Current runtime createDelivery (VERIFIED):
  accepts DELIVERED | FAILED | CANCELLED as terminal predecessors

HUMAN_ARCHITECTURE_DIRECTION APPROVED_2026-09-25 → D-380 / ADR-020 CURRENT:
  DELIVERED = successful completion → no normal replacement
  FAILED / CANCELLED replacement = existing accepted prerequisites only (no expansion)
  incorrect DELIVERED = separately authorized history-preserving correction (outside IMP-036I)
  reminder: EXISTS DELIVERED → suppress; no lineage tip required
  createDelivery DELIVERED-predecessor acceptance = PRE_EXISTING_DELIVERY_CONFORMANCE_DEBT
```

Independent Fit STOP `5309972440` / finding `4098211380` remains historical. D-380 / ADR-020 are
**CURRENT** / **Accepted** after independent Architecture Fit PASS `5312653831`. AF-036I-13 /
AF-036I-16 are accepted Architecture Fit authority against CURRENT D-380.
`RED_DECISIONS_REQUIRED = NONE`. `ARCHITECTURE_FIT = PASS`.

### 4.5 ARCH-G29 (CURRENT)

> Checkout owns mutable pre-payment fulfilment timing intent. Checkout Snapshot owns immutable
> purchased fulfilment timing truth. `FULFILMENT_TIMING = ASAP | SCHEDULED`. For SCHEDULED, the
> Snapshot seals sufficient immutable facts to preserve the customer promise, including scheduled
> window start, scheduled window end, Outlet timezone identity used for that promise, and effective
> cancellation-cutoff minutes for that purchased Order. Order references/projects Snapshot timing
> truth. Do not create ScheduledOrder / PickupScheduledOrder / DeliveryScheduledOrder aggregates.
> Do not create Order statuses SCHEDULED / READY / DUE / LATE / OVERDUE (derived/presentation cues
> only). Scheduled timing remains orthogonal to `FULFILMENT_MODE = DELIVERY | PICKUP` (ARCH-G28 /
> D-378).

### 4.6 ARCH-G30 (CURRENT)

> Delivery.status = DELIVERED is durable successful execution truth. A normal replacement Delivery
> cannot supersede it. Correction requires separately authorized history-preserving authority.
> Consumers such as Scheduled reminder eligibility may rely on committed DELIVERED completion truth
> without waiting for notification or Order coordination catch-up.

**AF-036I-19: RESOLVED** (D-379 / ADR-019 / ARCH-G29 + D-380 / ADR-020 / ARCH-G30 / ARCH-R23 CURRENT)

---

## 5. Repository evidence baseline (investigation)

| Area | Evidence | Label |
|---|---|---|
| Mutable Checkout | `app.checkouts`: `revision`, `status`, `fulfilment_mode`, `pickup_outlet_id`, `active_snapshot_id` (`drizzle/0015_checkout.sql`, `0044_imp036h_fulfilment_mode_pickup.sql`, `src/platform/database/schema/checkout.ts`) | VERIFIED |
| Checkout Snapshot | `app.checkout_snapshots`: immutable mode + commercial + mode-shape fields; Order FK `checkout_snapshot_id` (`drizzle/0017_order.sql`) | VERIFIED |
| Payment prepare | `prepareCheckoutForPayment` (`src/server/checkout/prepare.ts`); READY invalidation via `invalidateReadyToDraft`; Payment binds Snapshot id | VERIFIED |
| Order cancel | `cancelOrder` mode-agnostic; no sealed cutoff today (`src/server/order/lifecycle.ts`) | VERIFIED |
| Projections | Customer/Workforce expose `fulfilmentMode` + pickup/destination; no timing fields (`src/server/order/projections.ts`) | VERIFIED |
| IMP-036H | Locked ASAP Pickup; OutletPickupProfile; no Delivery on PICKUP; scheduling deferred (`capabilities/IMP-036H-…`) | VERIFIED |
| Operating hours | `outlet_operating_profiles.timezone` + `control_state`; weekly `outlet_operating_intervals` (`drizzle/0008_…`) | VERIFIED |
| Date-specific closure / holiday tables | Repo search | **NOT_FOUND** |
| Lead-time / cancellation-cutoff config | Schema/runtime | **NOT_FOUND** (product-only today) |
| IMP-032 | `MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY`; operator-approved; no auto dispatch/queue/provider API | VERIFIED |
| Outbox | `app.outbox_events.available_at`; `claimOutboxBatch` SKIP LOCKED; `NotificationOutboxProcessor` owns notification event types and marks unknown types published untouched | VERIFIED |
| Permissions | `brand.update`; `outlet.update`; `outlet.operating_schedule.read` / `outlet.operating_schedule.manage` (`src/shared/access-control/catalog.ts`) | VERIFIED |
| Highest migration | `0044_imp036h_fulfilment_mode_pickup` | VERIFIED |
| D-378 PROPOSED-without-DR-bump precedent | DR-19 Fit candidate reservation | VERIFIED |

---

## 6. Mutable Checkout timing (AF-036I-01)

### Resolution

Extend mutable Checkout (same aggregate; **no** ScheduledCheckout) with authoritative:

```text
fulfilment_timing = ASAP | SCHEDULED   (DEFAULT ASAP; historical-compatible)
```

For `SCHEDULED`, Checkout also carries the customer-selected future window needed to re-evaluate
before payment:

```text
scheduled_window_start_at  timestamptz NULL
scheduled_window_end_at    timestamptz NULL
```

Invariants:

| Timing | Required fields |
|---|---|
| ASAP | scheduled window fields NULL |
| SCHEDULED | valid selected window required before READY / payment bind |

Changing mode, timing, selected Outlet (where relevant), destination (where relevant), or scheduled
window advances Checkout `revision` and invalidates READY Snapshot via existing
`bumpCheckoutAfterFulfilmentMutation` / `invalidateReadyToDraft` authority — **no second checkout
state machine**.

Transport selection keys (if any) are non-authoritative display aids only.

**AF-036I-01: RESOLVED**

---

## 7. Immutable Snapshot timing (AF-036I-02)

### Resolution

Checkout Snapshot owns immutable paid timing truth (preferred SQL names follow existing snake_case):

```text
fulfilment_timing                         text NOT NULL  CHECK (ASAP|SCHEDULED)
scheduled_window_start_at                timestamptz NULL
scheduled_window_end_at                  timestamptz NULL
scheduled_timezone                       text NULL      -- sealed IANA identity
scheduled_cancellation_cutoff_minutes    integer NULL
```

DB CHECK (conceptual):

```text
ASAP      → all scheduled_* fields NULL
SCHEDULED → start/end/timezone/cutoff_minutes all NOT NULL;
            end > start; cutoff_minutes BETWEEN 0 AND 240
```

Order does **not** duplicate mutable timing authority. Customer/Ops projections read Snapshot via
existing `orders.checkout_snapshot_id`.

Do **not** reconstruct a historic promise from current Brand policy, Outlet hours, timezone, lead
time, or cancellation config after purchase (FD-036I-09 sealing).

**AF-036I-02: RESOLVED**

---

## 8. Slot representation (AF-036I-03)

### Resolution

Product requires discrete 30-minute windows and **NO V1 SLOT CAPACITY ENGINE** (FD-036I-01/04).

Therefore:

```text
NO first-class Slot aggregate
NO slot inventory table
NO slot reservation / capacity row / ownership state
NO last-seat allocator
```

A customer-visible “slot” is a **deterministic eligible time window** computed server-side.

Persist the selected immutable window as UTC `timestamptz` instants **plus sealed IANA timezone**.

**Why UTC + IANA:** local-time-only persistence is ambiguous across DST transitions and timezone
config changes. Sealed timezone preserves Outlet-local presentation and cutoff semantics without
trusting browser timezone.

Transport-only selection keys may exist; they must not become business authority.

**AF-036I-03: RESOLVED**

---

## 9. Eligible future time computation (AF-036I-04)

### Resolution

One **server-authoritative** eligibility composition. Browser never manufactures eligible times.
Customer API returns windows derived server-side.

V1 inputs (match Product Definition):

1. Outlet lifecycle active
2. Mode eligibility (Pickup profile / Delivery destination+serviceability)
3. Selected/derived Outlet
4. Merchandise fulfilable (assortment/availability)
5. Future operating schedule (weekly intervals in Outlet timezone)
6. Known future closure/exception (minimal model — §10)
7. Per-mode minimum lead time (Outlet scheduling profile — §11)
8. TODAY + TOMORROW horizon in Outlet local calendar
9. 30-minute window size (product constant)

Explicitly **excluded**: orders-per-slot, kitchen workload, labour, predictive capacity, driver
capacity, capacity reservation, AI prep prediction.

**AF-036I-04: RESOLVED**

---

## 10. Store hours / future operating truth (AF-036I-05)

### Reuse IMP-036E (VERIFIED)

- `outlet_operating_profiles.timezone` (valid IANA)
- weekly `outlet_operating_intervals` (`day_of_week`, `start_minute`, `end_minute`)
- overnight split representation already accepted

Scheduled windows must fit applicable future operating intervals.

### Temporary PAUSED ≠ future closed

Founder rule: current temporary `control_state = paused` does **not** project across TODAY/TOMORROW
as “future unavailable forever.” Durable facts that may invalidate future eligibility:

- Outlet inactive / suspended
- Mode disabled
- Known future closure (date exception)

### Minimal future-closure model (NOT_FOUND today → introduce bounded)

Because AC-036I-040 requires known future closure truth and no date-exception table exists:

```text
app.outlet_operating_date_exceptions
  id uuid PK
  outlet_id uuid FK UNIQUE(outlet_id, local_date)
  local_date date NOT NULL          -- Outlet local calendar date
  exception_kind text NOT NULL CHECK ('CLOSED_FULL_DAY')
  note text NULL
  revision bigint NOT NULL
  created_at / updated_at
```

Constraints:

- Outlet-scoped; local-date based; server-authoritative
- Authorized through existing `outlet.operating_schedule.manage`
- No capacity / labour / shift / recurring holiday engine

Eligibility: if `local_date` for a candidate window has `CLOSED_FULL_DAY`, exclude all windows that
day. Distinct from current `paused` control state.

**AF-036I-05: RESOLVED** (minimal closure model; no RED — product requires it; semantics bounded)

---

## 11. Scheduling configuration (AF-036I-06)

### Product constants (not operator-expandable in V1)

```text
slot_duration = 30 minutes
horizon = TODAY + TOMORROW
```

### Cancellation policy (Brand-level — BR-036I-019)

```text
app.brand_scheduled_fulfilment_policies
  brand_id PK FK → brands
  pickup_cancellation_cutoff_minutes   int NOT NULL  CHECK 0..240  DEFAULT 30
  delivery_cancellation_cutoff_minutes int NOT NULL  CHECK 0..240  DEFAULT 60
  revision bigint NOT NULL
  updated_at / created_at
```

Authorization: existing **`brand.update`** via `/api/admin/v1/brands/{brandId}` (D-373).
No Outlet override in V1.

Column DEFAULT values match Founder-locked product defaults (Pickup **30** / Delivery **60**).
Those column defaults apply only when a policy row is **inserted**. They do **not** by themselves
define behaviour for Brands that still have **no row**.

#### Missing-row authority (authoritative server behaviour)

```text
ABSENT ROW = EFFECTIVE PRODUCT DEFAULTS

For a Brand with no explicit policy row:
  effectivePickupCancellationCutoffMinutes   = 30
  effectiveDeliveryCancellationCutoffMinutes = 60
  effectivePolicyRevision                    = 0
  source                                     = PRODUCT_DEFAULT
```

This is **authoritative server behaviour**, not a browser fallback and not an
implementation-defined convenience.

Admin Brand read projection MUST return these effective values even when no physical policy row
exists (so operators always see the commercially active terms).

An absent row must **never** mean:

```text
unknown
null
Scheduled unavailable
0 minutes
implementation-defined fallback
```

Eager policy-row creation at Brand create time is **not** required unless a future implementation
discovers a repository convention that materially makes eagerness safer. Absent-row effective
defaults are the locked Fit resolution.

#### First explicit update / concurrency

```text
First explicit update:
  expectedRevision = 0
  → atomically INSERT policy row
  → persisted revision = 1

Concurrent first updates:
  unique Brand PK + expectedRevision semantics → only one INSERT wins;
  loser receives the normal stale / concurrency response.

Subsequent updates:
  normal expectedRevision CAS against the persisted row.
```

#### Snapshot sealing and pre-payment stale comparison

Snapshot sealing always consumes the **resolved effective numeric** mode-specific cutoff (30/60 when
absent; otherwise the persisted row values). Do not seal null / unknown / “row missing”.

Pre-payment stale-policy comparison (AF-036I-09 / §13) compares **effective business terms**, not
mere physical row existence:

```text
missing row (effective 30/60)
→ later INSERT of the same 30/60
does NOT by itself constitute changed customer terms.

If the effective mode-specific cutoff minutes change:
stale checkout reconfirm remains required.
```

### Lead-time operational profile (Outlet-level)

Product delegates per-mode minimum lead-time values to operational config without hard-coding
minutes in the Product Definition.

```text
app.outlet_scheduling_profiles
  outlet_id PK FK → outlets
  pickup_min_lead_minutes   int NOT NULL CHECK > 0
  delivery_min_lead_minutes int NOT NULL CHECK > 0
  revision bigint NOT NULL
  updated_at / created_at
```

Authorization: existing **`outlet.operating_schedule.manage`** (and read via
`outlet.operating_schedule.read`) on `/api/operations/v1/outlets/{outletId}/…`.

**Choice rationale:** Brand owns commercial cancellation policy (product-locked Brand scope). Lead
times are Outlet operational facts adjacent to hours/closures (IMP-036E schedule authority). No
speculative multi-level config hierarchy. Fail closed: if scheduling profile absent/invalid for the
selected mode, Scheduled eligibility returns no windows / unavailable for that mode. Brand
cancellation policy does **not** fail closed on absent row — it resolves to product defaults above.
Lead-time profile remains fail-closed when absent.

**AF-036I-06: RESOLVED** — NEW_PERMISSION = NO; missing-row = EFFECTIVE PRODUCT DEFAULTS

---

## 12. Capacity and concurrency (AF-036I-07 / AF-036I-08)

### AF-036I-07

```text
V1 capacity representation = N/A BY PRODUCT DECISION
```

No capacity engine.

### AF-036I-08

```text
last-slot contention = N/A BY PRODUCT DECISION
```

No capacity reservation / finite slot inventory.

Ordinary concurrency **still required**:

- Checkout revision / READY invalidation
- Brand policy revision (stale checkout must not silently bind)
- Outlet scheduling profile / future-closure revision
- Payment binding to immutable Snapshot
- Order cancellation
- Notification outbox lease / dedup
- Delivery request identity (IMP-031/032)

**AF-036I-07: RESOLVED** · **AF-036I-08: RESOLVED**

---

## 13. Pre-payment revalidation (AF-036I-09)

Reuse current Checkout revision + READY Snapshot invalidation + `prepareCheckoutForPayment` +
payment-bound immutable Snapshot. No second checkout state machine.

Immediately before payment bind, revalidate:

1. fulfilment mode
2. fulfilment timing
3. selected Outlet
4. destination/serviceability (Delivery) / Pickup profile (Pickup)
5. merchandise fulfilability
6. future schedule / closure
7. lead time
8. horizon
9. selected window still eligible
10. **current Brand cancellation policy effective terms** (FD-036I-09 / §11)

Compare the effective mode-specific cutoff the customer reviewed against the current effective
policy (absent row → product defaults 30/60; present row → persisted values). Physical row
existence alone is not a stale signal: inserting a first row that preserves the same effective
30/60 does **not** require reconfirm. If the effective cutoff minutes changed since customer
review: stale checkout MUST NOT silently bind — return refreshed terms and require customer
reconfirmation.

Once payment is bound to a valid Snapshot: Snapshot timing + cutoff are immutable for that Payment
attempt. Success → Order projects Snapshot. Failed/expired/abandoned attempt requiring new attempt →
re-evaluate current policy before new bind.

**AF-036I-09: RESOLVED**

---

## 14. Purchased cancellation authority (FD-036I-09 / BR-036I-019)

For SCHEDULED Orders:

```text
cutoff_instant = sealed scheduled_window_start_at − sealed_cancellation_cutoff_minutes
```

Path:

```text
load Order → load bound Checkout Snapshot
→ ASAP: preserve existing cancellation semantics
→ SCHEDULED: compare server now vs immutable cutoff
   BEFORE → may continue if otherwise eligible
   AT OR AFTER → reject self-service cancel with recovery guidance
```

No fee / penalty / fuzzy cutoff. Later Brand config changes never mutate purchased eligibility.
Do not persist a second mutable Order cancellation-policy authority.

---

## 15. Future action mechanism (AF-036I-10)

Do **not** assume Scheduled means a new scheduler service.

| Future behaviour | Classification | Mechanism |
|---|---|---|
| A. Customer reminder (~30 min before window) | Genuine timed side effect | Notification-owned outbox intent with `available_at` + full semantic contract (§19) |
| B. Pickup readiness / due cue | Derived presentation | Ops projection from Snapshot timing + now |
| C. Delivery dispatch | Operator-approved manual | Existing IMP-032 path; timing informs priority only |

Not required: new deployable scheduler, Redis, Kafka, RabbitMQ, workflow engine, general delayed-job
platform, new generic queue.

**Do not** turn `app.outbox_events` into a generic Scheduled business-action bus (notification
processor publishes unknown event types untouched — unsafe for non-notification actions).

Reminder future-expiry must use the **semantic-specific** window-start boundary defined in §19
(Blocker B1). Do **not** globally raise
`NOTIFICATION_TRANSACTIONAL_MAX_AGE_MS` (24h) for all notification semantics.

**AF-036I-10: RESOLVED**

---

## 16. Scheduled Pickup prep release (AF-036I-11)

Product: Scheduled Orders visible immediately; workforce may accept early.

```text
NO persisted “release” event
NO READY_FOR_PICKUP status
NO hidden kitchen lifecycle
NO delayed visibility
```

Scheduled Pickup appears immediately in existing Ops projections with timing, window, mode, and
derived Due soon / Overdue cues calculated from immutable Snapshot timing + current time.
Prioritization is projection behavior, not a state transition. Query ordering/indexes allowed;
must not create competing business truth.

**AF-036I-11: RESOLVED**

---

## 17. Scheduled Delivery execution (AF-036I-12 / AF-036I-14)

Preserve IMP-032:

```text
MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY
automatic dispatch = NO
polling worker = NO
queue = NO
provider API automation = NO
operator-approved dispatch = YES
```

Architecture:

```text
Order visible immediately
→ Ops / Delivery Coordinator sees arrival/fulfilment window + derived due cues
→ authorized operator initiates existing Delivery arrangement at appropriate operational time
→ IMP-031 / IMP-032 stable Delivery request / booking safety remains authoritative
```

Scheduled timing informs customer promise, Ops priority, dispatch target context, and recovery
diagnosis. It does **not** create a second Delivery lifecycle or auto-book on a timer.

If Delivery can no longer meet the promise: surface recovery; do not silently move Scheduled window;
do not falsely claim original promise remains achievable; use existing cancel/refund + new Order
product path.

**AF-036I-12: RESOLVED** · **AF-036I-14: RESOLVED**

---

## 18. Retries / idempotency (AF-036I-13)

Reuse accepted authorities:

| Domain | Authority |
|---|---|
| Checkout | revision / stale-write protection |
| Payment | Payment idempotency + immutable bound Snapshot |
| Delivery | IMP-031 stable request fingerprint / one-active-booking; IMP-032 `BOOKING_OUTCOME_UNKNOWN` |
| Notification | outbox lease / retry / dedup (`domainEventRef` + dedup UNIQUE) |

### Reminder intent atomicity / dedup

Reminder intent creation MUST be atomic with successful Scheduled Order materialization wherever
existing notification-outbox conventions allow (same commit / same transactional outbox write path
as other Order-domain notification intents).

A committed Scheduled Order must **not** depend on a later best-effort process merely to remember
that its reminder exists.

At-least-once recovery converges through:

```text
stable domainEventRef = order:<orderId>:scheduled_fulfilment_reminder
  (or repository-native deterministic equivalent under notificationDomainEventRef)
existing Notification dedup
existing outbox / idempotency authority
```

Exactly one logical reminder per Order. No duplicate reminder. No generic “schedule retry” state.
No duplicate Delivery booking, Order, or silent timing mutation.

Co-stage reminder / progress ordering (AF-036I-16): `SCHEDULED_FULFILMENT_REMINDER` and
`OUT_FOR_DELIVERY` share rank 40 under the existing strict-greater-than staleness model. Either may
dispatch in either order without creating a schedule-retry state, a second logical reminder, or a
staleness-driven suppression of the other. Dedup remains `domainEventRef`-scoped (one reminder per
Order); Delivery progress notifications remain their own semantic identities.

Delivery completion vs notification catch-up (AF-036I-13 / AF-036I-16): reminder send-time
eligibility for Scheduled Delivery MUST also read authoritative Delivery-domain execution truth.
Under CURRENT **D-380 / ADR-020 Accepted** (successful-completion finality),
`Delivery.status = DELIVERED` is durable successful Delivery execution truth and cannot be
superseded by a normal replacement Delivery. Suppression uses deterministic `EXISTS` of an
authoritative `DELIVERED` fact for the exact Order — **not** selection of a unique “current lineage
tip.” The `DELIVERED` notification semantic is secondary communication. Rank-50 staleness remains
valid protection but is **not** the sole delivered-state gate. No Notification request/attempt row
is required before suppression can recognise actual Delivery completion. See §19 Blocker B2.
D-379 does not redefine Delivery replacement; it consumes D-380 completion truth.

If the Order is materialized **within** the reminder window (authoritative purchase /
Order-materialization timing vs immutable Scheduled window start):

```text
do not enqueue the proactive upcoming reminder
```

**AF-036I-13: RESOLVED** (against CURRENT D-380; Architecture Fit PASS)

---

## 19. Proactive reminder (AF-036I-16)

Product: exactly one proactive reminder ≈30 minutes before window start (`AC-036I-044`; story
authority `US-036I-007` / `US-036I-010`). Suppress when Order was purchased inside the reminder
window. No standalone Reminder story.

### Orthogonal communication (not a Delivery lifecycle transition)

`SCHEDULED_FULFILMENT_REMINDER` is **not** a Delivery lifecycle transition. It is a time-bound
transactional communication tied to the immutable Scheduled fulfilment promise (Checkout Snapshot
window). Purpose remains `ORDER_UPDATES` (not `DELIVERY_UPDATES`) because the same reminder semantic
applies to Scheduled Pickup (no Delivery event required) and Scheduled Delivery.

For Scheduled Delivery, `OUT_FOR_DELIVERY` and the Scheduled reminder may legitimately **both**
occur, in either order:

```text
Example A (early dispatch):
  T-45  OUT_FOR_DELIVERY
  T-30  SCHEDULED_FULFILMENT_REMINDER
  → both valid

Example B (reminder first):
  T-30  SCHEDULED_FULFILMENT_REMINDER
  T-20  OUT_FOR_DELIVERY
  → both valid
```

Do not special-case browser/UI behaviour. Do not change existing global notification ordering
semantics merely for IMP-036I beyond the intentional co-stage rank below.

### Notification semantic contract (required)

Verified CURRENT ranks (`src/shared/notifications/constants.ts`
`NOTIFICATION_SEMANTIC_ORDER_RANKS`):

```text
ORDER_RECEIVED      = 10
PAYMENT_CONFIRMED   = 20
ORDER_ACCEPTED      = 30
OUT_FOR_DELIVERY    = 40
DELIVERED           = 50
ORDER_CANCELLED     = 60
```

Locked IMP-036I addition (co-stage with Delivery progress):

```text
NotificationSemanticType: SCHEDULED_FULFILMENT_REMINDER
Purpose:                ORDER_UPDATES
Recommended order rank: 40
```

Candidate rank table after Fit remediation:

```text
ORDER_RECEIVED                 = 10
PAYMENT_CONFIRMED              = 20
ORDER_ACCEPTED                 = 30
SCHEDULED_FULFILMENT_REMINDER  = 40
OUT_FOR_DELIVERY               = 40
DELIVERED                      = 50
ORDER_CANCELLED                = 60
```

**Equal rank 40 is INTENTIONAL.** Accepted CURRENT staleness
(`isStaleSemantic` / `SUPERSEDED_BY_LATER_SEMANTIC`) suppresses only when an already-dispatched
semantic has a **strictly higher** rank. Therefore:

```text
ORDER_ACCEPTED (30)
  → never suppresses reminder (40)

OUT_FOR_DELIVERY (40) already sent
  → MUST NOT suppress reminder (40)

Reminder (40) already sent
  → MUST NOT suppress later OUT_FOR_DELIVERY (40)

DELIVERED (50)
  → may suppress reminder not yet sent (staleness protection)

ORDER_CANCELLED (60)
  → may suppress reminder not yet sent
```

Rank **50 is necessary but not sufficient** as the delivered-state gate. Repository runtime truth
(`confirmDeliveryWithFulfilCoordination` → `recordProofAndDeliver` then separately
`tryFulfilEligibleOrder`) permits a durable transient state:

```text
Delivery.status = DELIVERED
Order.status    = ACCEPTED
DELIVERED notification semantic not yet processed / no attempt row yet
```

Notification staleness only considers semantic types with existing message-attempt rows. Therefore
a due Scheduled reminder MUST also be suppressed by the authoritative Delivery completion gate in
§19 Blocker B2 — independent of whether rank-50 staleness has fired.

A prior rank-35 placement is **rejected**: early `OUT_FOR_DELIVERY` (40) would suppress the
mandatory reminder and violate `AC-036I-044`. Co-staging at 40 preserves the existing
strict-greater-than staleness model without inventing a reminder-specific UI or ordering exception
path.

```text
Purpose = ORDER_UPDATES
```

(not `DELIVERY_UPDATES`) because the reminder applies to both Scheduled Pickup and Scheduled
Delivery under one semantic identity.

```text
Outbox event type (notification-owned family only):
  notification.domain.scheduled_fulfilment_reminder

Stable domainEventRef:
  order:<orderId>:scheduled_fulfilment_reminder
  (or repository-native deterministic equivalent)

Exactly one logical reminder per Order.
No generic Scheduled-business event family.
No new notification provider.
```

Extend `NOTIFICATION_SEMANTIC_TYPES`, `NOTIFICATION_SEMANTIC_ORDER_RANKS`,
`NOTIFICATION_SEMANTIC_PURPOSES`, `NOTIFICATION_OUTBOX_EVENT_TYPES`, and the template registry
under existing IMP-033 / IMP-034 authority. Exact customer copy / Meta template identifier remains
implementation / deployment detail.

### Intent production

On successful Scheduled Order materialization (atomic with Order commit where conventions allow):

```text
reminder_due_at ≈ scheduled_window_start_at − 30 minutes

IF authoritative order_materialized_at < reminder_due_at:
  enqueue exactly one notification-owned
    notification.domain.scheduled_fulfilment_reminder
  available_at = reminder_due_at
  domainEventRef = order:<orderId>:scheduled_fulfilment_reminder
ELSE:
  do not enqueue the proactive upcoming reminder
```

### Blocker B1 — semantic-specific future expiry (24h conflict)

CURRENT foundation (`createNotificationRequestFromDomainEvent` → `notificationExpiryFor(occurredAt)`)
uses global transactional max age = **24 hours** from `payload.occurredAt`
(`NOTIFICATION_TRANSACTIONAL_MAX_AGE_MS`).

Therefore an Order placed early TODAY with a Scheduled window TOMORROW evening can have
`reminder_due_at` **> 24h after** Order / domain-event creation. Under the generic rule, the future
outbox row would become claimable and then be discarded as expired — which is incompatible with the
approved customer promise.

**Locked resolution (semantic-specific; do not globally raise max age):**

```text
For SCHEDULED_FULFILMENT_REMINDER:
  the immutable Scheduled window start is the expiry boundary.

  Reminder is valid only while:
    reminder_due_at <= now < scheduled_window_start_at

  Must be suppressed / expired once:
    now >= scheduled_window_start_at

  The generic 24-hour-from-domain-event rule MUST NOT cause a valid scheduled reminder
  to expire before its intended due time.
```

Architecture may implement this through a semantic-specific expiry calculation (or equivalent
repository-native mechanism) when creating / evaluating the notification request. Outcome locked;
exact code structure may follow existing notification conventions.

```text
INVARIANT:
  normal notification semantics retain current 24h max-age policy
  SCHEDULED_FULFILMENT_REMINDER receives bounded semantic-specific future expiry
  No reminder after the fulfilment window has begun
```

### Blocker B2 — send-time eligibility

Immediately before sending `SCHEDULED_FULFILMENT_REMINDER`, re-read authoritative:

```text
Order
Checkout Snapshot
and, for FULFILMENT_MODE = DELIVERY only:
  authoritative Delivery truth for that exact Order
```

Suppress the reminder (do **not** mutate Order state; do **not** cancel/refund from Notifications)
if any of:

```text
Order = CANCELLED
OR Order = FULFILLED
OR now >= scheduled_window_start_at
OR Order / Snapshot missing or inconsistent
OR Order is not SCHEDULED
OR for FULFILMENT_MODE = DELIVERY:
     an authoritative Delivery for the exact Order has execution status DELIVERED
```

#### Delivery is the business fact; notification is secondary

```text
Delivery.status = DELIVERED
  = authoritative Delivery-domain successful-completion truth (D-380 CURRENT / ADR-020 Accepted;
    IMP-031 remains CURRENT foundation; D-380 clarifies successful finality)

Notification semantic DELIVERED
  = customer communication derived from that committed truth
```

The reminder eligibility decision MUST never depend on notification processing catching up before
recognising that delivery has already occurred. Therefore:

```text
DELIVERED rank 50 remains valid staleness protection
BUT rank 50 is NOT the sole delivered-state gate
No Notification request/attempt row is required before reminder suppression
  can recognise actual Delivery completion
```

Verified race (repository runtime): `confirmDeliveryWithFulfilCoordination` first executes
`recordProofAndDeliver` (durably sets `Delivery.status = DELIVERED` and enqueues the `DELIVERED`
notification intent) and only afterward separately calls `tryFulfilEligibleOrder`. A legitimate
transient state therefore exists where Delivery is already `DELIVERED`, Order is still `ACCEPTED`,
and the `DELIVERED` notification has not yet been processed. A due Scheduled reminder MUST NOT send
in that state.

#### Mode boundary (D-378 / ARCH-G28)

```text
PICKUP:
  do NOT create or query a Delivery aggregate merely for reminder logic
  Pickup does not use Delivery
  Pickup reminder suppression continues via:
    Order = FULFILLED | CANCELLED | window started | other existing send-time gates

DELIVERY:
  reminder send gate MAY read existing Delivery domain truth
  Notifications remains read-only with respect to Delivery
  Notifications MUST NOT:
    mutate Delivery
    fulfil Order
    retry fulfil coordination
    cancel Order
    refund Payment
    create a Delivery
```

#### Delivery completion gate (D-380 CURRENT successful-completion finality; no lineage-tip dependency)

Do not lock an unnecessary repository function name. Architecture requirement: immediately before
sending `SCHEDULED_FULFILMENT_REMINDER` for `FULFILMENT_MODE = DELIVERY`, the server must determine
whether the exact Order has an authoritative committed Delivery-domain fact
`Delivery.status = DELIVERED`, using the existing Delivery persistence/domain boundary or a narrow
read helper implemented later.

Do **not** trust: browser status, notification status, Ops projection text, or cached UI state.

**D-380 Delivery contract (CURRENT; human-approved 2026-09-25; ADR-020 Accepted):**

```text
DELIVERED = durable successful Delivery execution truth
  (not merely “inactive” for replacement purposes under IMP-031 wording)

A normal replacement MUST NOT follow DELIVERED.

FAILED / CANCELLED replacement remains permitted ONLY where existing accepted Delivery
architecture and operational prerequisites already allow it.
D-380 does NOT manufacture a blanket “always replaceable after FAILED/CANCELLED” rule.
D-380 does NOT override post-pickup failure / return / support rules.
D-380 does NOT invent a courier-switch path after pickup.

IMP-031 remains CURRENT / ARCHITECTURE_LOCKED for Delivery foundation.
D-380 CURRENT clarifies/amends successful-completion finality. The amendment is applied by this lock.
ADR-011 remains HISTORICAL / future-binding intent — not rewritten as CURRENT.

Until a separately authorized Delivery correction authority explicitly defines how a committed
DELIVERED fact becomes non-authoritative for customer fulfilment purposes, a committed
authoritative DELIVERED fact remains sufficient to suppress an “upcoming fulfilment” reminder.
Do not speculate about correction schema in this candidate.
IMP-036I does NOT invent that correction mechanism.
```

**Deterministic reminder completion rule (independent of lineage tip):**

```text
IF EXISTS authoritative Delivery for the exact Order
   with execution status DELIVERED
THEN:
  suppress Scheduled reminder
```

This remains true even if:

```text
Order is still ACCEPTED
DELIVERED notification not yet processed
no notification-attempt row exists
fulfil coordination has not yet updated Order
```

This rule is independent of:

```text
Order fulfil-coordination catch-up
DELIVERED notification processing
notification request rows
notification attempt rows
current Ops projection
browser state
unique Delivery lineage tip
createdAt / latest-row ordering
highest revision across Deliveries
caller-selected current Delivery
new current_delivery_id pointer
```

Notification rank 50 remains secondary communication staleness only.

Do **not** invent unique-successor, latest-row-wins, `createdAt` ordering authority, highest
revision across Deliveries, caller-selected current Delivery, or a new `current_delivery_id`
pointer merely to solve the reminder gate. Persistence does **not** currently guarantee a unique
lineage tip; the reminder gate must not depend on that assumption.

**Competing / nonconformant Delivery history (safe reminder behaviour):**

Because runtime may already have produced histories inconsistent with future D-380, Scheduled
reminder eligibility remains conservative. The reminder path remains **read-only** and MUST NOT
repair Delivery history itself. No repair logic.

| Case | Delivery history | Reminder completion gate |
|---|---|---|
| A | No Delivery records | Does **not** suppress |
| B | `BOOKED` only / `PICKED_UP` only and no `DELIVERED` fact | Does **not** suppress |
| C | `FAILED` and/or `CANCELLED` history only | Does **not** suppress |
| D | Any authoritative `DELIVERED` fact for exact Order | **Suppresses** |
| E | `DELIVERED` plus a later active Delivery (nonconformant under D-380) | **Suppresses**; emit/support diagnostic; `DELIVERED` is never treated as irrelevant |
| F | `DELIVERED` plus later `FAILED`/`CANCELLED` | **Suppresses**; diagnostic as appropriate |
| G | Multiple `DELIVERED` records | **Suppresses**; diagnostic may surface duplicate/nonconformant history |

**PRE_EXISTING_DELIVERY_CONFORMANCE_DEBT (runtime is not architecture precedent for D-380):**

Repository inspection of current `src/server/delivery/operations.ts` shows `createDelivery` permits
`prior.status === DELIVERED` when creating a new Delivery. Under CURRENT D-380
this is **nonconformant**. Classification:

```text
PRE_EXISTING_DELIVERY_CONFORMANCE_DEBT
```

Do **not** pretend current runtime never allowed a `DELIVERED` predecessor. Do **not** fix runtime
in this architecture-lock persistence. Do **not** create migration. Do **not** modify existing Delivery data.
Do **not** reinterpret historical rows.

```text
DELIVERY_CONFORMANCE_OBLIGATION (future implementation; not Fit / not Founder decision):
  Current createDelivery behavior permits a DELIVERED predecessor.
  Before IMP-036I acceptance, authorized implementation must reject normal create/replacement
  Delivery after DELIVERED according to D-380.
  FAILED / CANCELLED replacement where existing prerequisites are satisfied remains preserved.
  Post-pickup FAILED does not gain an unauthorized provider-switch path from D-380.
  Do not implement in this Architecture Fit docs task.
```

Bounded suppression outcome (locked): reminder is not sent because the Order is no longer reminder-
eligible. Exact enum spelling may be implementation-local (for example
`ORDER_NO_LONGER_REMINDER_ELIGIBLE`) if existing Notification suppression conventions permit adding
or mapping to an equivalent reason; the **suppression outcome** is locked.

Existing notification ordering / staleness (`SUPERSEDED_BY_LATER_SEMANTIC`) and consent /
preference rules remain applicable. Co-stage rank 40 does **not** bypass send-time gates, expiry,
consent/preference, domainEventRef dedup, or the authoritative Delivery completion gate.

### Blocker B3 — reminder content / template

`AC-036I-044` requires:

```text
Pickup:   location + window
Delivery: arrival / fulfilment window
```

Reminder content is derived from the **immutable Checkout Snapshot**, including:

```text
fulfilmentMode
scheduled window (start/end)
sealed Outlet timezone
Pickup display / location context where Pickup
```

No mutable current Outlet profile may rewrite the purchased promise. Do not put customer PII into
new scheduling persistence. Notification template registry gains the new semantic under existing
IMP-033 / IMP-034 authority. Exact customer copy / Meta template id = implementation / deployment
detail. No new notification provider.

### Architecture proof expectations (later implementation tranches)

No runtime tests are required in this Architecture Fit remediation. Future authorized
implementation MUST prove:

```text
A. Order ACCEPTED
   no DELIVERED Delivery
   → reminder may remain eligible
     (also: ORDER_ACCEPTED rank 30 does not suppress rank 40)

B. OUT_FOR_DELIVERY notification already sent
   Delivery not DELIVERED
   → reminder remains eligible (equal rank 40; either-order Example A)

C. Reminder already sent
   then OUT_FOR_DELIVERY
   → OUT_FOR_DELIVERY remains eligible (equal rank 40; either-order Example B)

D. Delivery.status = DELIVERED
   Order.status = ACCEPTED
   DELIVERED notification NOT processed (no attempt row yet)
   → reminder SUPPRESSED (authoritative EXISTS DELIVERED completion gate;
      NOT solely via rank-50 staleness)

E. Delivery.status = DELIVERED
   Order later becomes FULFILLED
   → reminder SUPPRESSED (Delivery completion gate and/or Order = FULFILLED)

F. DELIVERED notification already dispatched
   → normal rank-50 staleness independently also suppresses
     (secondary; does not replace proof D)

G. Delivery.status = PICKED_UP only
   → completion gate alone does NOT suppress

H. Delivery.status = BOOKED only
   → completion gate alone does NOT suppress

I. FAILED / CANCELLED Delivery history only
   → completion gate alone does NOT suppress

J. DELIVERED plus later active Delivery due nonconformant runtime history
   → reminder SUPPRESSED + diagnostic;
     delivered fact is never treated as irrelevant

K. DELIVERED plus later FAILED/CANCELLED nonconformant history
   → reminder SUPPRESSED + diagnostic as appropriate

L. Pickup Order FULFILLED
   → reminder suppressed without Delivery lookup

M. Order CANCELLED
   → reminder suppressed

N. Window start reached
   → reminder suppressed (send-time / semantic-specific expiry)

O. Order purchased inside reminder window
   → reminder never enqueued

P. createDelivery / normal replacement with prior DELIVERED
   → rejected (D-380 conformance)

Q. prior FAILED where existing replacement prerequisites are satisfied
   → existing permitted replacement behavior preserved

R. prior CANCELLED where existing replacement prerequisites are satisfied
   → existing permitted replacement behavior preserved

S. post-pickup FAILED
   → D-380 does not manufacture an unauthorized provider-switch path;
     existing failure/return/support authority remains

T. committed DELIVERED + failed Order fulfil-coordination
   → no new normal Delivery replacement;
     reminder suppressed;
     coordination/support recovery remains separate

U. incorrect DELIVERED fact
   → no silent backward transition;
     requires separately authorized correction mechanism
```

No runtime tests are required in this Architecture Fit remediation. Proofs P–U are future
implementation obligations under D-380; not executed here.

**AF-036I-16: RESOLVED** (against CURRENT D-380; Architecture Fit PASS)

---

## 20. Customer / workforce projections (AF-036I-15)

### Customer

Include: `fulfilmentTiming`; Scheduled window where applicable; Outlet-local presentation context;
mode; Pickup location / Delivery destination as mode requires; cancellation availability /
customer-safe cutoff messaging as applicable.

### Workforce

Include: mode; ASAP vs Scheduled; window; derived due / due-soon / overdue cue; normal Order
lifecycle; mode-specific controls.

Do **not** persist Due soon / Overdue status. Order remains PLACED | ACCEPTED | FULFILLED |
CANCELLED. Historical ASAP Orders render without fake scheduled values.

**AF-036I-15: RESOLVED**

---

## 21. Financial / commercial continuity

Scheduling changes no financial-document type. Preserve D-365 / D-366 / D-367 / D-364 / D-378
Pickup/Delivery commercial boundary. Scheduled timing does not reprice purchased commerce after
payment. Do not put scheduled window into recipient address or other statutory recipient fields.
No new legal claim.

---

## 22. Migration + historical ASAP (AF-036I-17 / AF-036I-18)

Schema change expected. Forward-only migration (next after `0044_…`; exact number at implementation).
No migration created by this candidate.

Compatibility:

| Entity | Migration behaviour |
|---|---|
| Existing Checkouts | `fulfilment_timing → ASAP`; scheduled fields NULL |
| Existing Checkout Snapshots | `fulfilment_timing → ASAP`; scheduled fields NULL |
| Existing Orders | unchanged (project Snapshot) |
| Existing Brands | **no eager** `brand_scheduled_fulfilment_policies` backfill required; absent row → effective product defaults 30/60 / revision 0 (§11) |
| Existing Outlets | lead-time profile absent → Scheduled eligibility fail-closed for that Outlet/mode until configured |
| Existing Deliveries / Pickup / FDs | unchanged |

Prefer DB CHECK constraints (ASAP ↔ null scheduled fields; SCHEDULED ↔ required sealed facts).
Do not add Scheduled fields to Order merely for backfill convenience.

Brand policy table introduction must **not** leave missing-row behaviour undefined: effective
product defaults (§11) are the compatibility contract for AF-036I-17 / AF-036I-18. Column DEFAULT
on INSERT is not a substitute for absent-row resolution.

Later implementation migration proof requirements:

- empty DB → latest
- previous schema → latest
- historical Delivery ASAP fixture preserved
- historical Pickup ASAP fixture preserved
- Brand without policy row resolves effective 30/60 for sealing / admin read / stale comparison

**AF-036I-17: RESOLVED** · **AF-036I-18: RESOLVED**

---

## 23. Customer transport

Preserve D-359 / D-360. Semantic operations (exact route names implementation-final under D-360):

1. Read eligible future fulfilment windows for current Checkout
2. Set/update fulfilment timing + selected Scheduled window using expected Checkout revision
3. Evaluate / re-evaluate checkout
4. Prepare payment through existing path

Server authoritative for eligibility. No Next Route Handlers. No new customer deployable service.

---

## 24. Workforce / Admin transport

Preserve D-372 / D-373.

| Concern | Transport | Permission |
|---|---|---|
| Outlet scheduling profile + future closures | `/api/operations/v1/*` | `outlet.operating_schedule.manage` (read: `.read`) |
| Brand cancellation policy | `/api/admin/v1/*` Brand update | `brand.update` |

No HTTP-to-HTTP internal delegation. No new service. No role-name bypass. Caller-supplied
Brand/Outlet scope is never authority.

---

## 25. Observability / supportability

Architecture-level support evidence (no new business authority):

- ASAP vs Scheduled; Pickup vs Delivery; window
- Reminder due/sent/suppressed via existing notification/outbox evidence
- Delivery manual execution state
- Cancellation cutoff failure reason
- Pre-payment stale-window / policy invalidation reason

Reuse existing correlation/log/notification/Order evidence. Do not persist derived warning states
solely for dashboard display.

---

## 26. Security / privacy

Preserve IMP-038 controls. No additional customer PII required by scheduling. Scheduled Pickup still
must not force delivery address / GPS / Maps / coordinates. Timing fields are not authorization.
Browser-provided window / timezone / Outlet / cutoff / policy revision must be revalidated
server-side. Do not trust caller-provided cutoff minutes. No new CSP host/provider.

```text
NEW_ROLE = NO
NEW_PERMISSION = NO
NEW_AUTH_MODEL = NO
NEW_PII = NO
NEW_EXTERNAL_PROVIDER = NO
```

---

## 27. Architecture Fit matrix (AF-036I-01 … 19)

| ID | Question (PD §21) | Repository evidence | Candidate resolution | Authority preserved | Section | RED |
|---|---|---|---|---|---|---|
| AF-036I-01 | Where does fulfilment timing live in mutable Checkout? | `app.checkouts` revision/mode | Checkout `fulfilment_timing` + scheduled window fields; no ScheduledCheckout | ARCH-G09 / D-378 mode | §6 | NO |
| AF-036I-02 | What immutable timing truth belongs in Snapshot? | Snapshot owns mode/commercial | Seal timing + window UTC + IANA tz + cutoff minutes | ARCH-G05 / FD-036I-09 | §7 | NO |
| AF-036I-03 | Timestamp vs slot aggregate? | No slot tables; FD-036I-01/04 | No Slot aggregate; persist UTC window + sealed tz | Product no-capacity | §8 | NO |
| AF-036I-04 | How are future eligible times computed? | evaluate/prepare patterns | Server composition §9 inputs; browser never authoritative | ARCH-G11 | §9 | NO |
| AF-036I-05 | How does Store Hours participate? | IMP-036E hours; no holiday table | Reuse hours; minimal `outlet_operating_date_exceptions`; PAUSED ≠ future closed | IMP-036E | §10 | NO |
| AF-036I-06 | Scheduling config/profile per Outlet? | No lead/cutoff schema; `brand.update` / schedule perms | Brand cancellation policy with **ABSENT ROW = EFFECTIVE PRODUCT DEFAULTS** (30/60, revision 0) + admin effective projection + first-update INSERT CAS; Outlet lead-time profile fail-closed | ADR-005 | §11 | NO |
| AF-036I-07 | Capacity representation? | Product NO capacity | N/A BY PRODUCT DECISION | FD-036I-04 | §12 | NO |
| AF-036I-08 | Last-slot concurrency? | No inventory | N/A capacity race; ordinary concurrency retained | ARCH-G09 | §12 | NO |
| AF-036I-09 | Pre-payment revalidation? | `prepareCheckoutForPayment` | Extend prepare path; stale **effective** policy terms block bind (row existence alone ≠ change) | Payment bind | §13 | NO |
| AF-036I-10 | Future action trigger? | Outbox `available_at`; notification processor; 24h max-age | Reminder only via notification outbox; semantic-specific window-start expiry (no global 24h raise); no generic scheduler | ADR-012 / ARCH-G14 | §15 / §19 | NO |
| AF-036I-11 | Scheduled Pickup prep release? | Ops projections; D-357 | Immediate visibility; derived cues; no release state | D-357 | §16 | NO |
| AF-036I-12 | Scheduled Delivery booking begin? | IMP-032 manual | Operator-approved existing Delivery path; no auto-book | IMP-032 / ADR-011 | §17 | NO |
| AF-036I-13 | Retries/idempotency? | Checkout/Payment/Delivery/outbox; `confirmDeliveryWithFulfilCoordination` race; `createDelivery` permits DELIVERED predecessor (conformance debt vs D-380) | Existing idempotency preserved; atomic reminder intent; stable domainEventRef dedup; no schedule-retry state; co-stage rank 40; reminder Delivery completion = read-only EXISTS DELIVERED gate; **D-380 CURRENT** defines DELIVERED successful finality; runtime DELIVERED-predecessor acceptance = PRE_EXISTING_DELIVERY_CONFORMANCE_DEBT (reject before IMP-036I acceptance; not implemented here) | existing / IMP-031 CURRENT + D-380 CURRENT | §18 / §19 B2 | NO |
| AF-036I-14 | Scheduling ↔ Delivery coordination? | IMP-031/032 | Timing informs priority; no second Delivery lifecycle | ADR-011 / IMP-031 | §17 | NO |
| AF-036I-15 | Order/workforce projections? | `projections.ts` | Extend with timing + derived cues; ASAP history clean | D-357 | §20 | NO |
| AF-036I-16 | Notifications scheduled? | Notification semantic ranks/purposes/24h expiry; outbox family; Delivery DELIVERED before Order FULFILLED race | Full `SCHEDULED_FULFILMENT_REMINDER` contract; send gate consumes **D-380** Delivery successful-completion truth (`EXISTS DELIVERED`); no lineage-tip; rank-40 co-stage; rank-50 secondary; Snapshot content; either-order + nonconformant-history + proofs A–O + replacement proofs P–U | ADR-012 / D-379 CURRENT + D-380 CURRENT | §19 | NO |
| AF-036I-17 | Migrations/backfills for ASAP? | Migration 0044 tip | Forward-only; ASAP defaults; CHECK constraints; Brand policy absent-row defaults (no eager backfill required) | ARCH-G13 | §22 | NO |
| AF-036I-18 | Historical ASAP representation? | Existing rows mode-only | Timing ASAP + null scheduled fields; Order unchanged; Brand policy effective defaults when absent | D-378 | §22 | NO |
| AF-036I-19 | New D/ADR/ARCH? | D-378 ASAP reservation; IMP-031 inactive-wording ambiguity | D-379 + ADR-019 + ARCH-G29 **and** D-380 + ADR-020 + ARCH-G30; shared ARCH-R23 CURRENT | D-378 AMENDED; IMP-031 clarified by D-380 CURRENT | §4 | NO |

```text
AF_TOTAL = 19
AF_RESOLVED = 19
AF_OPEN = 0
OPEN_ARCHITECTURE_QUESTIONS = NONE
RED_DECISIONS_REQUIRED = NONE
ARCHITECTURE_FIT = PASS
IMP036I_ARCHITECTURE_LOCKED = YES
```

---

## 28. Traceability (minimum required)

Approved Product Definition story meanings (do not invent a standalone Reminder story):

| Story | Meaning |
|---|---|
| US-036I-001 | Timing choice / ASAP non-regression |
| US-036I-002 | Scheduled Pickup |
| US-036I-003 | Scheduled Delivery |
| US-036I-004 | No available future times |
| US-036I-005 | Pre-payment mode/timing switching |
| US-036I-006 | Pre-payment Scheduled invalidation |
| US-036I-007 | Customer post-purchase Scheduled clarity |
| US-036I-008 | Workforce visibility/prioritization |
| US-036I-009 | Scheduled Pickup handover |
| US-036I-010 | Scheduled Delivery execution |
| US-036I-011 | Cancellation / no self-service reschedule |
| US-036I-012 | Post-payment unavailability recovery |
| US-036I-013 | Mobile Scheduled ordering |
| US-036I-014 | Accessible Scheduled selection |
| US-036I-015 | Commercial sealing + online payment |
| US-036I-016 | Scheduling configuration / operability |

| Theme | Stories | ACs | BRs / FDs / AF |
|---|---|---|---|
| Timing choice / ASAP non-regression | US-036I-001 | AC-036I-001 / AC-036I-002 (+ timing choice ACs) | FD-036I-01/02/07; AF-17/18 |
| Scheduled Pickup | US-036I-002 | AC-036I-004…007,040,048 | FD-036I-13/15/20; D-378 |
| Scheduled Delivery | US-036I-003 | AC-036I Delivery set | FD-036I-05/14; IMP-032 |
| No available future times | US-036I-004 | AC-036I-026,040 | FD-036I-03/04; AF-04/05/06 |
| Pre-payment mode/timing switching | US-036I-005 | AC-036I mode-switch | FD-036I-07; AF-01/09 |
| Pre-payment Scheduled invalidation | US-036I-006 | AC-036I stale/policy | FD-036I-09; AF-09 |
| Customer post-purchase Scheduled clarity | US-036I-007 | AC-036I customer display; **AC-036I-044** (reminder jointly) | AF-15 / AF-16 |
| Workforce visibility/prioritization | US-036I-008 | AC-036I Ops cues | AF-11/15; BR-036I-015 |
| Scheduled Pickup handover | US-036I-009 | AC-036I handover | IMP-036H; AF-11 |
| Scheduled Delivery execution | US-036I-010 | AC-036I Delivery ops; **AC-036I-044** (reminder jointly) | AF-12/14/16; IMP-032 |
| Cancellation / no self-service reschedule | US-036I-011 | AC-036I-058+ | FD-036I-09; BR-036I-019 |
| Post-payment unavailability recovery | US-036I-012 | AC-036I recovery | FD-036I-10/08 |
| Mobile Scheduled ordering | US-036I-013 | AC-036I mobile | FD-036I-13; customer transport |
| Accessible Scheduled selection | US-036I-014 | AC-036I a11y | customer transport / selection UX |
| Commercial sealing + online payment | US-036I-015 | AC-036I pay-now | FD-036I-06/09; AF-02/09 |
| Scheduling configuration / operability | US-036I-016 | AC-036I config | AF-06; BR-036I-019 |

Reminder cross-cut (not a standalone story):

```text
AC-036I-044 → story authority = US-036I-007 / US-036I-010
AF-036I-16 / §19
```

ASAP regression cross-cut:

```text
AC-036I-001 / AC-036I-002 → story authority = US-036I-001
AF-036I-17 / AF-036I-18
```

Approved Product Definition semantics are **not** modified by this candidate.

---

## 29. Persistence candidate summary

| Store | Candidate |
|---|---|
| Checkout | `fulfilment_timing`; optional scheduled window start/end |
| Checkout Snapshot | `fulfilment_timing`; window start/end; `scheduled_timezone`; `scheduled_cancellation_cutoff_minutes` + CHECKs |
| Brand scheduling policy | `brand_scheduled_fulfilment_policies`; **absent row → effective 30/60 / revision 0** |
| Outlet scheduling profile | `outlet_scheduling_profiles` (per-mode min lead; fail-closed if absent) |
| Future closure | `outlet_operating_date_exceptions` (`CLOSED_FULL_DAY`) |
| Order | no timing authority columns; project Snapshot |
| Delivery | unchanged aggregate; no auto-timer booking |
| Notification | extend owned semantic + outbox event types; `available_at` + semantic-specific reminder expiry |

---

## 30. Execution candidate summary

| Concern | Candidate |
|---|---|
| Pickup release | NONE (immediate visibility + derived cues) |
| Delivery dispatch | Manual IMP-032 operator-approved |
| Reminder | `SCHEDULED_FULFILMENT_REMINDER` semantic contract; co-stage rank 40 with `OUT_FOR_DELIVERY`; atomic intent; window-start expiry; send-time eligibility including deterministic `EXISTS Delivery.status = DELIVERED` gate (Delivery mode; read-only; no lineage-tip; consumes D-380 CURRENT; conformance debt recorded); Snapshot-derived content |

---

## 31. Runtime topology

```text
NEW_DEPLOYABLE_SERVICE = NO
NEW_CONTAINER = NO
NEW_QUEUE = NO
NEW_BROKER = NO
GENERIC_SCHEDULER = NO
NEW_EXTERNAL_PROVIDER = NO
```

---

## 32. Explicit non-claims

Tranche 1 persistence and domain foundations have started. This capability architecture does **not**
change locked semantics, and this implementation-start record does **not**:

- complete IMP-036I implementation
- change approved Product Definition semantics
- resolve IMP-037/038 or activate IMP-039/040
- accept IMP-036I or perform Founder UAT
- rewrite historical Delivery rows or add a DELIVERED correction workflow

`PRE_EXISTING_DELIVERY_CONFORMANCE_DEBT` is CLOSED by the Tranche 1 runtime correction.
Incorrect committed `DELIVERED` history remains outside IMP-036I.

```text
IMP036I_ARCHITECTURE_FIT = PASS
IMP036I_ARCHITECTURE_LOCKED = YES
IMP036I_IMPLEMENTATION_AUTHORIZED = YES
IMP036I_IMPLEMENTATION_STARTED = YES
D379_STATUS = CURRENT
D380_STATUS = CURRENT
ADR019_STATUS = Accepted
ADR020_STATUS = Accepted
CURRENT_ARCHITECTURE = ARCH-R23
ARCH_G29_STATUS = CURRENT
ARCH_G30_STATUS = CURRENT
PRE_EXISTING_DELIVERY_CONFORMANCE_DEBT = CLOSED
```

---

## 33. Recommended next action

Independent verification of IMP-036I Implementation Tranche 1. Do not start Tranche 2 until that
verification passes. Execution plan:
[`../product/IMP-036I/implementation-plan.md`](../product/IMP-036I/implementation-plan.md).
Do not treat this architecture document as implementation or acceptance authority.
