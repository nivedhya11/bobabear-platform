<!-- governance-meta
{
  "status": "ARCHITECTURE_FIT_CANDIDATE",
  "authority": "CAPABILITY_ARCHITECTURE_CANDIDATE",
  "capability": "IMP-036I",
  "title": "Scheduled Fulfilment",
  "architectureLock": "NOT_LOCKED",
  "architectureFitCandidateStatus": "CANDIDATE_READY_FOR_INDEPENDENT_REVIEW",
  "architectureFitCandidateResult": "NOT_DECLARED",
  "architectureFitExecution": "NOT_PERFORMED",
  "architectureFitResult": "NOT_PERFORMED",
  "implementation": "NOT_AUTHORIZED / NOT_STARTED",
  "implementationAuthorized": false,
  "implementationStarted": false,
  "implementationComplete": false,
  "impAccepted": false,
  "schemaChangeRequired": true,
  "migrationRequired": true,
  "founderUatRequired": true,
  "lastReviewed": "2026-09-25",
  "productDefinition": "PD-IMP-036I-DRAFT-4",
  "productDefinitionGate": "PASS",
  "proposedBindingDecisions": ["D-379", "ADR-019"],
  "proposedArchitectureRevision": "ARCH-R23",
  "proposedInvariant": "ARCH-G29",
  "amendsOnLock": ["D-378"],
  "bindingFoundations": ["ADR-005", "ADR-007", "ADR-008", "ADR-011", "ADR-012", "ADR-018", "D-357", "D-359", "D-360", "D-365", "D-372", "D-373", "D-377", "D-378", "ARCH-R22", "ARCH-G28"],
  "dependsOn": ["IMP-021", "IMP-023", "IMP-024", "IMP-028", "IMP-029", "IMP-030", "IMP-031", "IMP-032", "IMP-033", "IMP-036B", "IMP-036C", "IMP-036D", "IMP-036E", "IMP-036H"],
  "architectureBase": "ARCH-R22"
}
-->

# IMP-036I — Scheduled Fulfilment

## Capability Architecture — ARCHITECTURE FIT CANDIDATE / NOT LOCKED

This document is an **Architecture Fit review candidate** for IMP-036I against approved
**`PD-IMP-036I-DRAFT-4`** (Product Definition Gate **PASS**; independent review `5307761142`).
It is **not** the canonically locked capability architecture. It does **not** self-declare
Architecture Fit PASS.

```text
STATUS = ARCHITECTURE_FIT_CANDIDATE
AUTHORITY = CAPABILITY_ARCHITECTURE_CANDIDATE
PRODUCT_DEFINITION = PD-IMP-036I-DRAFT-4
PRODUCT_DEFINITION_GATE = PASS
ARCHITECTURE_FIT_EXECUTION = NOT_PERFORMED
ARCHITECTURE_FIT_RESULT = NOT_PERFORMED
ARCHITECTURE_FIT = NOT_PERFORMED
ARCHITECTURE_LOCK = NOT_LOCKED
IMPLEMENTATION_AUTHORIZED = NO
IMPLEMENTATION_STARTED = NO
IMPLEMENTATION_COMPLETE = NO
IMP_ACCEPTED = NO

ARCHITECTURE_FIT_CANDIDATE = YES
ARCHITECTURE_CANDIDATE_READY_FOR_REVIEW = YES
ARCHITECTURE_FIT_CANDIDATE_STATUS = CANDIDATE_READY_FOR_INDEPENDENT_REVIEW
ARCHITECTURE_FIT_CANDIDATE_RESULT = NOT_DECLARED

AF_TOTAL = 19
AF_RESOLVED_IN_CANDIDATE = 19
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

D379_REQUIRED_FOR_LOCK = YES
D379_STATUS = PROPOSED
ADR019_STATUS = Proposed
ARCH_R23_REQUIRED_FOR_LOCK = YES
ARCH_G29_REQUIRED_FOR_LOCK = YES
CURRENT_ARCHITECTURE = ARCH-R22
CURRENT_DECISION_REGISTER = DR-20
CURRENT_D378 = CURRENT (ASAP-only / no-scheduled-schema clauses to be amended by D-379 only after lock)
CURRENT_ADR018 = Accepted
CURRENT_ARCH_G28 = CURRENT

RESOLVED_IN_ARCHITECTURE_CANDIDATE != ARCHITECTURE_FIT_PASS
```

Independent Architecture Fit review is required. Formal Architecture Fit PASS + lock persistence are
separate authorized governance tasks. This candidate does **not** authorize implementation, schema
migration execution, merge as lock, deployment, Founder UAT, or IMP acceptance.

| Field | Value |
|---|---|
| Architecture lock | `NOT_LOCKED` (candidate only) |
| Formal ROADMAP lifecycle | `PLANNED` (`IMP036I_ACTIVATED: YES`) |
| Product Definition | `PD-IMP-036I-DRAFT-4` **APPROVED**; Gate **PASS** |
| Canonical Architecture Fit (ROADMAP/STATE/PD) | Still `NOT_PERFORMED` until lock persistence |
| Candidate readiness | **CANDIDATE_READY_FOR_INDEPENDENT_REVIEW** |
| Candidate Fit PASS claim | **NOT_DECLARED** |
| Implementation | **NOT_AUTHORIZED** / **NOT_STARTED** |
| Schema change / migration | **YES** (design only; not authorized to execute) |
| Proposed D-number | **D-379** (`PROPOSED`; not CURRENT) |
| Proposed ADR | **ADR-019** (`Proposed`) |
| Proposed global ARCH bump | **ARCH-R23** / **ARCH-G29** (proposed lock delta; ARCHITECTURE.md tip remains ARCH-R22) |
| D-378 relationship | Remains CURRENT for mode; **proposed future amendment** by D-379 only for ASAP-only / no-scheduled-schema reservation |
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
acceptedThrough = IMP-036H
currentProductSlice = IMP-036I
nextProductSlice = IMP-037
pendingAcceptance = NONE
PROGRAM_PAUSE = PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED
PROGRAM_PAUSE_AUTHORITY = D-377
```

This remediation repairs the existing Fit candidate only (Blockers A / B / B1 / B2 / B3 + §28
traceability; STOP #2 reminder co-stage ordering with `OUT_FOR_DELIVERY` at rank 40; STOP #3
authoritative Delivery `DELIVERED` send-time gate independent of notification rank-50 catch-up).
It does **not** claim Architecture Fit PASS, lock architecture, promote D-379, accept ADR-019,
create ARCH-R23, or authorize implementation.

Canonical ROADMAP/STATE tip markers remain unchanged by this candidate:

```text
IMP036I_PRODUCT_DEFINITION: APPROVED
IMP036I_PRODUCT_DEFINITION_GATE: PASS
IMP036I_ARCHITECTURE_FIT: NOT_PERFORMED
IMP036I_ARCHITECTURE_LOCKED: NO
IMP036I_IMPLEMENTATION_AUTHORIZED: NO
IMP036I_STARTED: NO
IMP036I_IMPLEMENTATION_STARTED: NO
IMP036I_IMPLEMENTATION_COMPLETE: NO
IMP036I_ACCEPTED: NO
IMP-036I formal lifecycle: PLANNED
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

## 4. Proposed global decision (AF-036I-19)

### 4.1 Does IMP-036I require a new durable architecture decision?

**YES.**

**Reason (VERIFIED):** ARCH-G28 / D-378 intentionally lock current mode architecture as ASAP-only and
prohibit speculative scheduled-fulfilment schema under IMP-036H
(`docs/platform/ARCHITECTURE.md` ARCH-G28; D-378 CURRENT; IMP-036H AF-036H-14). Scheduling therefore
cannot silently mutate D-378; it requires an orthogonal timing decision.

### 4.2 Proposed artifacts (NOT CURRENT)

| Artifact | Status in this candidate | Future lock action |
|---|---|---|
| **D-379** — Scheduled Fulfilment Timing + Future Execution Boundary | **PROPOSED** | Promote CURRENT after independent Fit PASS + lock persistence |
| **ADR-019** — Scheduled Fulfilment Timing and Execution Boundary | **Proposed** | Accept with D-379 |
| **ARCH-G29** | **PROPOSED LOCK DELTA** | Add to ARCHITECTURE.md |
| **ARCH-R23** | **PROPOSED future lock** | Advance ARCH-R22 → ARCH-R23 |
| **DR-21** | **NOT created now** | Future lock-persistence revision only |

### 4.3 D-378 amendment relationship (future lock only)

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
  CURRENT only after independent Fit PASS + lock persistence.
  Governs orthogonal timing axis: ASAP | SCHEDULED
  Owns Snapshot timing sealing, eligibility composition boundary, reminder execution boundary,
  future-closure minimal model, lead-time / cancellation-policy persistence split.

ARCH-G28 future wording (NOT applied now):
  Fulfilment mode is orthogonal to fulfilment timing;
  Scheduled timing is governed by D-379 / ARCH-G29.
```

### 4.4 Proposed ARCH-G29 (PROPOSED LOCK DELTA — not CURRENT)

> Checkout owns mutable pre-payment fulfilment timing intent. Checkout Snapshot owns immutable
> purchased fulfilment timing truth. `FULFILMENT_TIMING = ASAP | SCHEDULED`. For SCHEDULED, the
> Snapshot seals sufficient immutable facts to preserve the customer promise, including scheduled
> window start, scheduled window end, Outlet timezone identity used for that promise, and effective
> cancellation-cutoff minutes for that purchased Order. Order references/projects Snapshot timing
> truth. Do not create ScheduledOrder / PickupScheduledOrder / DeliveryScheduledOrder aggregates.
> Do not create Order statuses SCHEDULED / READY / DUE / LATE / OVERDUE (derived/presentation cues
> only). Scheduled timing remains orthogonal to `FULFILMENT_MODE = DELIVERY | PICKUP` (ARCH-G28 /
> D-378).

**AF-036I-19: RESOLVED** (D-379 / ADR-019 / ARCH-G29 / ARCH-R23 proposed; not CURRENT)

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
`Delivery.status = DELIVERED` is the business fact; the `DELIVERED` notification semantic is
secondary communication. Rank-50 staleness remains valid protection but is **not** the sole
delivered-state gate. No Notification request/attempt row is required before suppression can
recognise actual Delivery completion. See §19 Blocker B2.

If the Order is materialized **within** the reminder window (authoritative purchase /
Order-materialization timing vs immutable Scheduled window start):

```text
do not enqueue the proactive upcoming reminder
```

**AF-036I-13: RESOLVED**

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
  = authoritative Delivery-domain execution truth (IMP-031 / IMP-032)

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

#### Delivery lookup semantics (no new aggregate)

Do not lock an unnecessary repository function name. Architecture requirement: server-side reminder
eligibility must be able to determine whether the exact Order has authoritative Delivery execution
truth indicating `DELIVERED`, using the existing Delivery persistence/domain boundary or a narrow
read helper implemented later.

Do **not** trust: browser status, notification status, Ops projection text, or cached UI state.

**Multi-Delivery selection rule (VERIFIED under IMP-031 / IMP-032):**

An Order may legally have a prior terminal Delivery (including `DELIVERED`) followed by a replacement
Delivery via `priorDeliveryId` after the prior is authoritatively terminal
(`DELIVERED` | `FAILED` | `CANCELLED`). At most one active Delivery exists per Order
(`REQUESTED` | `BOOKING_OUTCOME_UNKNOWN` | `BOOKED` | `PICKED_UP`).

```text
Authoritative selection for the Delivery completion gate:
  IF an active Delivery exists for the Order:
    that Delivery is current authoritative
    active statuses are never DELIVERED
    → Delivery completion gate does NOT suppress
      (even if a priorDeliveryId-linked ancestor was DELIVERED)
  ELSE:
    the current lineage tip is authoritative
    (terminal Delivery for the Order with no active successor;
     repository-native equivalent under IMP-031 one-active + priorDeliveryId lineage)
    → suppress only if that tip has execution status DELIVERED
```

Do not suppress solely because a prior irrelevant terminal `DELIVERED` record exists while a later
replacement Delivery is active or terminal non-`DELIVERED`. Do not invent a new Delivery aggregate
or lifecycle.

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
A. ORDER_ACCEPTED sent
   → reminder remains eligible (rank 30 does not suppress rank 40)

B. OUT_FOR_DELIVERY sent before reminder due
   → reminder remains eligible (equal rank 40; either-order Example A)

C. Reminder sent before OUT_FOR_DELIVERY
   → later OUT_FOR_DELIVERY remains eligible (equal rank 40; either-order Example B)

D. Delivery.status = DELIVERED
   Order.status = ACCEPTED
   DELIVERED notification NOT processed (no attempt row yet)
   → reminder SUPPRESSED (authoritative Delivery completion gate;
      NOT solely via rank-50 staleness)

E. Delivery.status = DELIVERED
   Order later becomes FULFILLED
   → reminder SUPPRESSED (Delivery completion gate and/or Order = FULFILLED)

F. DELIVERED semantic already dispatched
   → normal rank-50 staleness also suppresses reminder
     (secondary; does not replace proof D)

G. Delivery status = PICKED_UP
   Order still active
   window not started
   → Delivery completion gate alone does NOT suppress reminder

H. Delivery status = BOOKED
   Order still active
   → Delivery completion gate does NOT suppress reminder

I. Pickup Order
   → no Delivery lookup required
   FULFILLED Order suppresses reminder

J. Order CANCELLED
   → reminder suppressed

K. Window start reached
   → reminder suppressed (send-time / semantic-specific expiry)

L. Order purchased inside reminder window
   → reminder was never enqueued
```

**AF-036I-16: RESOLVED**

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
| AF-036I-13 | Retries/idempotency? | Checkout/Payment/Delivery/outbox; `confirmDeliveryWithFulfilCoordination` race | Reuse accepted authorities; atomic reminder intent with Order materialization; stable domainEventRef dedup; no schedule-retry state; co-stage rank 40 with OUT_FOR_DELIVERY does not invent retry/suppression of the peer semantic; Delivery `DELIVERED` truth suppresses reminder before fulfil-coordination / notification catch-up (read-only Delivery gate) | existing / IMP-031 | §18 / §19 B2 | NO |
| AF-036I-14 | Scheduling ↔ Delivery coordination? | IMP-031/032 | Timing informs priority; no second Delivery lifecycle | ADR-011 | §17 | NO |
| AF-036I-15 | Order/workforce projections? | `projections.ts` | Extend with timing + derived cues; ASAP history clean | D-357 | §20 | NO |
| AF-036I-16 | Notifications scheduled? | Notification semantic ranks/purposes/24h expiry; outbox family; Delivery DELIVERED before Order FULFILLED race | Full `SCHEDULED_FULFILMENT_REMINDER` contract (type/purpose/co-stage rank 40 with OUT_FOR_DELIVERY/ref/expiry/send-gate including authoritative Delivery DELIVERED gate independent of rank-50 catch-up/Snapshot content; either-order + race proof expectations A–L) | ADR-012 / ADR-011 | §19 | NO |
| AF-036I-17 | Migrations/backfills for ASAP? | Migration 0044 tip | Forward-only; ASAP defaults; CHECK constraints; Brand policy absent-row defaults (no eager backfill required) | ARCH-G13 | §22 | NO |
| AF-036I-18 | Historical ASAP representation? | Existing rows mode-only | Timing ASAP + null scheduled fields; Order unchanged; Brand policy effective defaults when absent | D-378 | §22 | NO |
| AF-036I-19 | New D/ADR/ARCH? | D-378 ASAP reservation | D-379 PROPOSED + ADR-019 Proposed + ARCH-G29/R23 proposed | D-378 amend-on-lock | §4 | NO |

```text
AF_TOTAL = 19
AF_RESOLVED_IN_CANDIDATE = 19
AF_OPEN = 0
OPEN_ARCHITECTURE_QUESTIONS = NONE
RED_DECISIONS_REQUIRED = NONE
ARCHITECTURE_CANDIDATE_READY_FOR_REVIEW = YES
ARCHITECTURE_FIT = NOT_PERFORMED
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
| Reminder | `SCHEDULED_FULFILMENT_REMINDER` semantic contract; co-stage rank 40 with `OUT_FOR_DELIVERY`; atomic intent; window-start expiry; send-time eligibility including authoritative Delivery `DELIVERED` gate (Delivery mode; read-only); Snapshot-derived content |

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

This candidate does **not**:

- claim Architecture Fit PASS
- lock architecture
- promote D-379 to CURRENT
- accept ADR-019
- create ARCH-R23 / apply ARCH-G29 to ARCHITECTURE.md
- authorize implementation or create migrations
- advance ROADMAP / STATE lifecycle
- modify approved Product Definition semantics
- resolve IMP-037/038 or activate IMP-039/040

```text
IMP036I_ARCHITECTURE_FIT = NOT_PERFORMED
IMP036I_ARCHITECTURE_LOCKED = NO
IMP036I_IMPLEMENTATION_AUTHORIZED = NO
```

---

## 33. Recommended next action

Independent Architecture Fit review of the exact merged candidate.
Do **not** lock architecture until that review returns PASS.
