<!-- governance-meta
{
  "status": "PRE_GATE_DRAFT",
  "authority": "PRODUCT_DEFINITION",
  "capability": "IMP-036I",
  "productDefinitionVersion": "PD-IMP-036I-DRAFT-1",
  "process": "PD-1",
  "verificationPolicy": "TEST-1",
  "lastReviewed": "2026-09-24",
  "productDefinitionGateExecution": "NOT_PERFORMED",
  "productDefinitionGateResult": "NOT_PERFORMED",
  "architectureFitExecution": "NOT_PERFORMED",
  "architectureFit": "NOT_PERFORMED",
  "architectureLocked": "NO",
  "implementationAuthorized": "NO",
  "implementationStarted": "NO",
  "implementationComplete": "NO",
  "impAccepted": "NO",
  "imp036iActivated": "YES",
  "imp036iProductDefinition": "PRE_GATE_DRAFT",
  "imp036iProductDefinitionGate": "NOT_PERFORMED",
  "imp036iArchitectureFit": "NOT_PERFORMED",
  "imp036iArchitectureLocked": "NO",
  "imp036iImplementationAuthorized": "NO",
  "imp036iStarted": "NO",
  "imp036iImplementationStarted": "NO",
  "imp036iImplementationComplete": "NO",
  "imp036iAccepted": "NO",
  "founderUatRequired": "YES",
  "founderUatStatus": "NOT_PERFORMED",
  "founderDecisionsTotal": 22,
  "founderDecisionsOpen": 15,
  "founderDecisionsResolvedByExistingAuthority": 7,
  "unresolvedProductDecisions": 15,
  "preGateDraft": "YES",
  "documentStatus": "PRE_GATE_DRAFT",
  "readyForProductDefinitionGate": "NO",
  "programPause": "D-377"
}
-->

# IMP-036I — Scheduled Fulfilment

## Product Definition (PRE-GATE DRAFT — Product Definition Gate NOT_PERFORMED)

```text
Document status: PRE-GATE DRAFT
PRODUCT_DEFINITION_VERSION: PD-IMP-036I-DRAFT-1
PRE-GATE DRAFT: YES
CAPABILITY: IMP-036I
TITLE: Scheduled Fulfilment
AUTHORITY: PRODUCT_DEFINITION
PROCESS: PD-1
VERIFICATION_POLICY: TEST-1

PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED
Gate Result: NOT_PERFORMED
IMP036I_PRODUCT_DEFINITION: PRE_GATE_DRAFT
IMP036I_PRODUCT_DEFINITION_GATE: NOT_PERFORMED
IMP036I_ARCHITECTURE_FIT: NOT_PERFORMED
IMP036I_ARCHITECTURE_LOCKED: NO
IMP036I_IMPLEMENTATION_AUTHORIZED: NO
IMP036I_STARTED: NO
IMP036I_IMPLEMENTATION_STARTED: NO
IMP036I_IMPLEMENTATION_COMPLETE: NO
IMP036I_ACCEPTED: NO
IMP036I_ACTIVATED: YES
FOUNDER_UAT_REQUIRED: YES
FOUNDER_UAT_STATUS: NOT_PERFORMED

ARCHITECTURE_FIT_EXECUTION: NOT_PERFORMED
ARCHITECTURE_FIT: NOT_PERFORMED
ARCHITECTURE_LOCKED: NO
IMPLEMENTATION_AUTHORIZED: NO
IMPLEMENTATION_STARTED: NO

PRODUCT_DECISIONS / FOUNDER_DECISIONS:
  founder_decisions_total: 22
  founder_decisions_open: 15
  founder_decisions_resolved_by_existing_authority: 7
  UNRESOLVED_MATERIAL_PRODUCT_DECISIONS: 15
  OPEN_FOUNDER_DECISIONS: 15 (FD-036I-01 … FD-036I-15)
  RESOLVED_BY_EXISTING_AUTHORITY: 7 (FD-036I-16 … FD-036I-22)

PRODUCT_DEFINITION_GATE_READY: NO — material Founder decisions remain OPEN;
  recommendations are not Gate authorization

stories: 16
acceptance_scenarios: 52
business_rules: 18
architecture_fit_questions: 19

Canonical tip AFTER this activation (write as CURRENT in this draft —
verify against ROADMAP/STATE; this Product Definition is NOT lifecycle authority):
  acceptedThrough = IMP-036H
  currentProductSlice = IMP-036I
  pendingAcceptance = NONE
  nextProductSlice = IMP-037
  IMP036I_ACTIVATED = YES
  IMP036I_PRODUCT_DEFINITION = PRE_GATE_DRAFT
  IMP036I_PRODUCT_DEFINITION_GATE = NOT_PERFORMED
  IMP036I_ARCHITECTURE_FIT = NOT_PERFORMED
  IMP036I_ARCHITECTURE_LOCKED = NO
  IMP036I_IMPLEMENTATION_AUTHORIZED = NO
  IMP036I_STARTED = NO
  IMP036I_IMPLEMENTATION_STARTED = NO
  IMP036I_IMPLEMENTATION_COMPLETE = NO
  IMP036I_ACCEPTED = NO
  ROADMAP = GTM-R148
  STATE = STATE-R146
  ARCHITECTURE = ARCH-R22
  decision-register = DR-20
  PROGRAM_PAUSE = D-377

Formal lifecycle for IMP-036I: PLANNED (activated for Product Definition only)
```

This artifact is the **PRE-GATE DRAFT** Product Definition candidate for
`PD-IMP-036I-DRAFT-1`. It persists product requirements for Scheduled Fulfilment
without executing the Product Definition Gate, Architecture Fit, architecture lock,
implementation authorization, implementation start, or IMP-036I acceptance.

```text
Founder decision OPEN recommendations
  !=
Founder decision RESOLVED
  !=
Product Definition Gate PASS
  !=
Architecture Fit PASS
  !=
architecture LOCKED
  !=
implementation AUTHORIZED
```

```text
IMP036I_ACTIVATED: YES
  (ROADMAP / STATE activation for Product Definition only)
  +
Product Definition: PRE_GATE_DRAFT
  !=
Product Definition Gate PASS
  !=
Architecture Fit PASS
```

```text
PRODUCT REQUIREMENT
  = what customer / workforce / commercial scheduled-fulfilment outcomes BOBA Bear
    promises and must prove

ARCHITECTURE CANDIDATE
  = hypothesized Fit mechanism within existing ADRs / ARCH-R22 — not locked; not authoritative

IMPLEMENTATION DETAIL
  = schema fields, API shapes, queues, cron, workers, UI components, transport paths —
    out of scope until Architecture Fit
```

This Product Definition defines **PRODUCT REQUIREMENTS** only. It does **not** invent or lock
Architecture Fit mechanisms. Architecture Fit handoff questions (§21) remain
`ARCHITECTURE_FIT_REQUIRED` and unanswered.

```text
PRODUCT_DELIVERY_PROCESS_EFFECTIVE_FROM = IMP-036F
HISTORICAL_ACCEPTED_IMPS_REWRITTEN = NO
IMP036E_LIFECYCLE_CHANGED = NO
PD1_DID_NOT_ACTIVATE_IMP036F_AT_ADOPTION = YES
```

### Program context (CURRENT tip — verify against ROADMAP/STATE)

Lifecycle truth remains ROADMAP/STATE only. CURRENT tip for this PRE-GATE draft
(this Product Definition is **not** lifecycle authority):

```text
acceptedThrough = IMP-036H
currentProductSlice = IMP-036I
pendingAcceptance = NONE
nextProductSlice = IMP-037

IMP036H: COMPLETE_AND_ACCEPTED
IMP036I_ACTIVATED: YES
IMP036I_PRODUCT_DEFINITION: PRE_GATE_DRAFT (PD-IMP-036I-DRAFT-1)
IMP036I_PRODUCT_DEFINITION_GATE: NOT_PERFORMED
IMP036I_ARCHITECTURE_FIT: NOT_PERFORMED
IMP036I_ARCHITECTURE_LOCKED: NO
IMP036I_IMPLEMENTATION_AUTHORIZED: NO
IMP036I_STARTED: NO
IMP036I_IMPLEMENTATION_STARTED: NO
IMP036I_IMPLEMENTATION_COMPLETE: NO
IMP036I_ACCEPTED: NO
Formal lifecycle: PLANNED (activated for Product Definition only)

IMP037: HOLD / BLOCKED_PROVIDER_ACCESS (historical progress preserved; not accepted)
IMP038: HOLD / IMPLEMENTATION_COMPLETE / NOT_ACCEPTED
       external assessment: DEFERRED_UNTIL_PRE_GTM_APPLICATION_SCOPE_STABILIZES
       frozen runtime dc6b19e6… remains historical evidence only
       GAP-EXT-ASSESS-001: NOT closed by this draft
IMP039: NOT_ACTIVATED / HOLD
IMP040: NOT_ACTIVATED / HOLD

PROGRAM_PAUSE_AUTHORITY = D-377
ROADMAP = GTM-R148
STATE = STATE-R146
ARCHITECTURE = ARCH-R22
decision-register = DR-20
```

Activation of IMP-036I for Product Definition does **not** resolve IMP-037/038, activate
IMP-039/040, close `GAP-EXT-ASSESS-001`, or authorize implementation.

---

## 1. Identity / version / status

| Field | Definition |
|---|---|
| Capability / title | `IMP-036I — Scheduled Fulfilment` (ROADMAP identity; activated for Product Definition only; formal lifecycle **PLANNED**) |
| Product Definition version / document status | `PD-IMP-036I-DRAFT-1`; **Document status: PRE-GATE DRAFT**; **PRE-GATE DRAFT: YES** |
| Product owner / approval evidence | Founder. Activation authorized for Product Definition only (2026-09-24). Material scheduling decisions FD-036I-01…15 remain **OPEN**. Product Definition Gate **NOT_PERFORMED**. |
| Process / verification policy | `PD-1` / `TEST-1` |
| Canonical anchors | VISION-1; ROADMAP GTM-R148; STATE STATE-R146; ARCH-R22; DR-20 (D-377, D-378); PD-1; TEST-1; PERSONA-1; GJ-1; accepted IMP-036H Product Definition `PD-IMP-036H-DRAFT-1` |
| Repository candidate | Canonical path `/home/ajoshi/repos/boba-bear-platform`; exact HEAD/tree recorded at activation/PR time — verify against CURRENT tip |
| Capability lifecycle / authorization | ROADMAP/STATE: `IMP036I_ACTIVATED: YES`; `currentProductSlice = IMP-036I`; formal lifecycle **PLANNED**; Product Definition **PRE_GATE_DRAFT**; Gate **NOT_PERFORMED**; Architecture Fit **NOT_PERFORMED**; architecture **NOT_LOCKED**; implementation **NOT_AUTHORIZED** / **NOT_STARTED**; `IMP036I_ACCEPTED: NO`; `pendingAcceptance = NONE`; `acceptedThrough = IMP-036H`; `nextProductSlice = IMP-037` |
| Relevant capability architecture / ADRs | Foundations: ADR-008; ADR-011; ADR-007; ADR-012; ADR-018 / D-378 (fulfilment mode); D-365 / D-366 / D-367 (financial documents); D-357; D-361–D-364 (payment/refund); D-377 (program pause). No IMP-036I capability lock yet. |
| Founder UAT applicability | `FOUNDER_UAT_REQUIRED = YES`; `FOUNDER_UAT_STATUS = NOT_PERFORMED` — materially changes customer checkout timing and workforce operational timing when implemented |

Behaviour classification vocabulary:

```text
CURRENT_SUPPORTED
PLANNED_IMP036I
FOLLOW_UP
DEFERRED
NOT_SUPPORTED
ARCHITECTURE_FIT_REQUIRED
ARCHITECTURE_CANDIDATE
FOUNDER_APPROVED_PRODUCT_REQUIREMENT
PRODUCT_DECISION_REQUIRED
UNRESOLVED_DECISION_REQUIRED
RESOLVED_BY_EXISTING_AUTHORITY
```

Architecture Fit hypotheses only (**ARCHITECTURE CANDIDATE** — not locked):

```text
NEW_SERVICE: unknown — Fit decides
NEW_AUTH_MODEL: NO
NEW_ROLE: NO
NEW_PERMISSION: unknown — Fit decides; do not invent by default
NEW_RBAC_MODEL: NO
SEPARATE_SCHEDULED_ORDER_AGGREGATE: NO (product requirement — Order remains Order)
NEW_ORDER_STATUS_FOR_SCHEDULED: unknown — flag as material if genuinely required; prefer timing metadata
SCHEMA_OR_DATA_CONTRACT_CHANGE: likely YES (Fit decides strategy)
QUEUES_CRON_WORKERS: Fit-owned — not product-locked here
D374_REQUIRED_FOR_LOCK: do not create automatically
ARCH_R22_REQUIRED: do not create automatically for Product Definition alone
```

Orthogonal product model (binding product identity for this draft):

```text
FULFILMENT_MODE:
  DELIVERY | PICKUP          ← inherited CURRENT_SUPPORTED from IMP-036H / D-378

FULFILMENT_TIMING:
  ASAP | SCHEDULED           ← PLANNED_IMP036I orthogonal axis

Combinations:
  DELIVERY + ASAP            ← CURRENT_SUPPORTED (must not regress)
  DELIVERY + SCHEDULED       ← PLANNED_IMP036I
  PICKUP + ASAP              ← CURRENT_SUPPORTED via IMP-036H (must not regress)
  PICKUP + SCHEDULED         ← PLANNED_IMP036I
```

Do **not** invent product concepts: `ScheduledOrder`, `PickupScheduledOrder`, `DeliveryScheduledOrder`.
Order remains Order. Do not invent a new Order status unless flagged as a material Founder decision.

---

## 2. Business outcome

Authenticated customers can choose whether an eligible BOBA Bear Order should be fulfilled
**ASAP** or at a **future supported time**, for both **Delivery** and **Pickup**, while preserving
the existing Order, Payment, Pickup, and Delivery product models.

Authorized workforce (Outlet Manager / Kitchen / Delivery Coordinator contexts under
`PERSONA-WORKFORCE-OPERATOR`) can see Scheduled Orders early enough to prepare, distinguish them
from ASAP Orders, and fulfil them under existing lifecycle outcomes without inventing a separate
Scheduled Order aggregate.

Observable success measures:

1. A customer completes Scheduled Pickup and Scheduled Delivery through payment → confirmation that
   clearly states mode + timing → later fulfilment under existing Order lifecycle.
2. ASAP Delivery and ASAP Pickup paths do not regress.
3. No Delivery aggregate is created or invoked for Scheduled Pickup; delivery fee is never charged
   for `fulfilmentMode = PICKUP` regardless of timing.
4. Scheduling itself does not invent cash/COD, a new financial-document type, or forced Maps/GPS
   for Pickup.
5. Times are presented in the selected outlet's local timezone.

Links VISION owned direct-order convenience (pre-order for a known visit/arrival) without claiming
public GTM readiness. Program pause **D-377** remains authoritative.

---

## 3. Problem statement

**Who:** `PERSONA-CUSTOMER` (primary); `PERSONA-WORKFORCE-OPERATOR` (Ops fulfilment contexts:
Outlet Manager, Kitchen, Delivery Coordinator); `PERSONA-PLATFORM-OPERATOR` where scheduling
configuration/operability requires platform controls.

**Problem:** BOBA Bear direct ordering today supports ASAP Delivery and ASAP Pickup only.
Customers who know when they will arrive (or when they want food delivered) cannot reserve a
future fulfilment time on the same Order model — forcing either inconvenience or marketplace
alternatives.

**Verified CURRENT baseline vs PLANNED:**

| Area | Classification | Summary |
|---|---|---|
| Customer Menu → Cart → authenticated checkout → Delivery ASAP → pay → Order → delivery fulfil | `CURRENT_SUPPORTED` | Accepted delivery path; must not regress |
| Customer ASAP Pickup (outlet select, no delivery fee/aggregate, handover → FULFILLED) | `CURRENT_SUPPORTED` | Accepted IMP-036H; must not regress |
| FULFILMENT_MODE DELIVERY \| PICKUP | `CURRENT_SUPPORTED` | D-378 / ADR-018 / IMP-036H |
| Online payment only; no cash/COD | `CURRENT_SUPPORTED` | FD-036H-03; accepted payment foundations |
| Financial documents D-365 / D-366 / D-367 | `CURRENT_SUPPORTED` | Continuity required |
| Customer-facing FULFILMENT_TIMING ASAP \| SCHEDULED | `PLANNED_IMP036I` | This Product Definition |
| Scheduled Pickup / Scheduled Delivery | `PLANNED_IMP036I` | Orthogonal to mode |
| Recurring / subscriptions / catering | `NOT_SUPPORTED` | §24 |
| Cash / COD / pay-at-counter / pay-later deposits | `NOT_SUPPORTED` unless Founder changes | FD-036I-06 OPEN (pay-now recommended); cash remains prohibited by FD-036H-03 |

---

## 4. Primary personas

| Persona ID | Responsibility / goal in this slice | Context / evidence |
|---|---|---|
| `PERSONA-CUSTOMER` (primary) | Choose ASAP or Scheduled; select eligible future time; complete authenticated checkout; understand confirmation/history; cancel/reschedule per Founder policy | [personas.md](../personas.md) PERSONA-1; VISION direct-order customer; IMP-036B/C/H |
| `PERSONA-WORKFORCE-OPERATOR` (primary Ops) | See Scheduled Orders early; badge mode+timing; prepare/accept/handover Pickup; coordinate Delivery execution relative to promised window | Workforce **contexts** (not new persona IDs): Outlet Manager, Kitchen Operator, Delivery Coordinator. Persona ≠ role ≠ permission |
| `PERSONA-PLATFORM-OPERATOR` | Where scheduling configuration / operability visibility is required (health, correlation, safe investigation) — not a new RBAC model | PERSONA-1; IMP-036 observability foundations |

No new persona IDs. Authorization authority is §14. Do not invent roles named “Scheduler Admin.”

---

## 5. Current-state journey

| Journey ID / evidence | Entry / preconditions | Activities today | Existing outcome / gap |
|---|---|---|---|
| `JOURNEY-FIRST-ORDER` / `GJ-FIRST-ORDER` (Delivery ASAP) | Guest→auth; cart; serviceable destination | Browse → Cart → Sign in → Checkout → Delivery → destination → pay → Order → delivery → FULFILLED | `CURRENT_SUPPORTED`; **must not regress** |
| `JOURNEY-H-B/C` ASAP Pickup | Auth checkout; Pickup chosen | Outlet select → commercial (no delivery fee) → pay → Ops handover → FULFILLED | `CURRENT_SUPPORTED` via IMP-036H; **must not regress** |
| Ops ASAP Fulfilment | Authorized Ops | List → accept → Pickup handover or Delivery controls → fulfil | `CURRENT_SUPPORTED`; **no Scheduled badge / due window** |
| Customer Scheduled choice | N/A as enabled V1 path | N/A | Gap: no ASAP vs Scheduled timing peer |

---

## 6. Desired-state journey

Central product concept:

> As a customer, I can choose ASAP or Scheduled for Delivery or Pickup before paying; for Scheduled
> I select a supported future time in the outlet's local timezone, pay online against a sealed
> commercial result (subject to Founder confirmation), and see clear confirmation and history.
> As Ops, I can see Scheduled Orders early, know when they are due, and fulfil Pickup or Delivery
> under the existing Order lifecycle without a separate Scheduled Order type.

| Journey ID | Entry / context | Ordered activities | Success / downstream outcome | Alternate / recovery paths |
|---|---|---|---|---|
| `JOURNEY-I-A-ASAP-DELIVERY` (protect) | Auth checkout; Delivery + ASAP | Existing Delivery ASAP path | No Scheduled regression | Existing payment/serviceability recovery |
| `JOURNEY-I-B-ASAP-PICKUP` (protect) | Auth checkout; Pickup + ASAP | Existing ASAP Pickup path (IMP-036H) | No Scheduled regression | Existing outlet/eligibility recovery |
| `JOURNEY-I-C-SCHED-PICKUP` | Pickup + Scheduled | Choose Scheduled → browse eligible dates/times → select → review (outlet + timing + commercials, no delivery fee) → pay → confirmation → Ops see due window → handover → FULFILLED | Scheduled Pickup Order without Delivery aggregate | No times; time unavailable; cancel/reschedule per FD; late/early per FD-036I-13 |
| `JOURNEY-I-D-SCHED-DELIVERY` | Delivery + Scheduled | Choose Scheduled → destination/serviceability → eligible times → select → review (destination + timing + commercials) → pay → confirmation → Ops/Delivery Coordinator act relative to promise → delivery fulfilment | Scheduled Delivery under existing Delivery path | Serviceability fail; no times; provider unavailable near slot; recovery per FD-036I-10 |
| `JOURNEY-I-E-NO-TIMES` | Scheduled chosen; zero eligible times | Attempt continue | Clear unavailable; ASAP may remain if valid; no invented time | Switch to ASAP; change mode; modify cart; exit |
| `JOURNEY-I-F-TIMING-MODE-SWITCH` | Pre-payment | Switch ASAP↔Scheduled and/or Delivery↔Pickup | Full revalidation + commercial recalculation | Incomplete destination after switch to Delivery; eligibility failures |
| `JOURNEY-I-G-PREPAY-INVALID` | Selected time becomes invalid before pay | Attempt pay | Block pay; recoverable; no silent substitution of time/outlet/items/mode | Choose another time; ASAP; cancel checkout |
| `JOURNEY-I-H-POSTPAY-UNAVAILABLE` | Paid Scheduled Order; future becomes unhonourable | System/ops detect unavailability | Customer recovery per FD-036I-10; no silent rewrite of promise | Contact / reschedule / cancel+refund classes |
| `JOURNEY-I-OPS-LIST` | Authorized Ops | Open Ops list | Every Order badges mode + timing (ASAP vs Scheduled + due window when Scheduled) | Unauthorized deny |
| `JOURNEY-I-OPS-SCHED-DETAIL` | Scheduled Order | Open detail | Shows mode, timing promise, outlet/destination as applicable; Pickup without rider chrome; Delivery without inventing Pickup fields | Unauthorized deny |
| `JOURNEY-I-OPS-PICKUP-HANDOVER` | Scheduled Pickup ACCEPTED | Handed to customer / Mark as picked up | → FULFILLED; IMP-036H verification model (no OTP/QR/PIN) | Early/late policy per FD-036I-13 |
| `JOURNEY-I-OPS-DELIVERY-EXEC` | Scheduled Delivery | Delivery Coordinator / Ops initiates delivery relative to promised window | Existing Delivery fulfilment outcomes | Provider cannot book → recovery per FD-036I-14 / FD-036I-10 |

### Customer promise — Scheduled (product level)

| Concern | Product promise (mechanism = Fit) |
|---|---|
| How customer chooses Scheduled | Explicit timing choice peer to ASAP during authenticated checkout after (or with) fulfilment mode; clear labels ASAP vs Scheduled |
| Dates/times presentation | Eligible future dates/times in **outlet local timezone**; understandable date + time (or slot window) labels; not server-TZ raw |
| What makes a time selectable | Outlet active + known future schedule eligibility + mode eligibility (Pickup enabled / Delivery serviceable) + merchandise fulfilable + min lead + within horizon + capacity if V1 includes it (FD-036I-04) + not closed by known future exception |
| No times available | Clear empty state; do not invent slots; ASAP and/or other mode may remain if valid |
| Review | Mode, timing promise, outlet or destination, commercials, packaging, delivery fee only when Delivery |
| Payment | Online; pay-now vs pay-later = FD-036I-06 (**OPEN**, recommend pay now); no cash/COD |
| Confirmation | States Scheduled + mode + timing + location/destination summary |
| History/detail | Distinguishes ASAP vs Scheduled; shows timing promise; Pickup has no delivery tracking |
| Cancellation | Existing refund authority continuity; cutoff = FD-036I-09 OPEN |
| Reschedule | FD-036I-08 OPEN (self-service YES/NO); if NO, define recovery path |
| Time becomes unavailable | Pre-pay: block + recover; post-pay: FD-036I-10 OPEN |
| Reminders | Confirmation required; proactive reminder = FD-036I-11 OPEN |
| Late fulfilment | Customer-visible recovery honesty; Pickup late/early = FD-036I-13; Delivery late uses existing + promise semantics |
| Pickup vs Delivery differences | Pickup: outlet collect, no destination/fee/Delivery aggregate, IMP-036H handover. Delivery: destination + serviceability, Delivery path, customer-facing promise class = FD-036I-05 |

---

## 7. Story map

| Business outcome | Persona | Journey | Activity | Story IDs | Slice classification |
|---|---|---|---|---|---|
| Timing choice | `PERSONA-CUSTOMER` | C/D/F | Choose ASAP or Scheduled | `US-036I-001` | `V1_ACCEPTANCE_SLICE` |
| Schedule Pickup | `PERSONA-CUSTOMER` | C | Select Pickup + Scheduled time | `US-036I-002` | `V1_ACCEPTANCE_SLICE` |
| Schedule Delivery | `PERSONA-CUSTOMER` | D | Select Delivery + Scheduled time | `US-036I-003` | `V1_ACCEPTANCE_SLICE` |
| No available times | `PERSONA-CUSTOMER` | E | Empty/unavailable recovery | `US-036I-004` | `V1_ACCEPTANCE_SLICE` |
| Pre-pay mode/timing switch | `PERSONA-CUSTOMER` | F | ASAP↔Scheduled and mode switches | `US-036I-005` | `V1_ACCEPTANCE_SLICE` |
| Pre-pay invalidation | `PERSONA-CUSTOMER` | G | Time/outlet/merch invalid before pay | `US-036I-006` | `V1_ACCEPTANCE_SLICE` |
| Post-purchase clarity | `PERSONA-CUSTOMER` | C/D | Confirmation + history/detail | `US-036I-007` | `V1_ACCEPTANCE_SLICE` |
| Workforce visibility | `PERSONA-WORKFORCE-OPERATOR` | Ops list/detail | Badge, sort/due, detail | `US-036I-008` | `V1_ACCEPTANCE_SLICE` |
| Scheduled Pickup handover | `PERSONA-WORKFORCE-OPERATOR` (Outlet/Kitchen) | Ops handover | Accept + hand over → FULFILLED | `US-036I-009` | `V1_ACCEPTANCE_SLICE` |
| Scheduled Delivery execution | `PERSONA-WORKFORCE-OPERATOR` (Delivery Coordinator) | Ops delivery | Execute relative to promise | `US-036I-010` | `V1_ACCEPTANCE_SLICE` |
| Cancel / reschedule outcome | `PERSONA-CUSTOMER` | H + cancel | Cancel/reschedule per policy | `US-036I-011` | `V1_ACCEPTANCE_SLICE` (policy OPEN) |
| Post-payment unavailability | `PERSONA-CUSTOMER` + Ops | H | Recovery without silent rewrite | `US-036I-012` | `V1_ACCEPTANCE_SLICE` (policy OPEN) |
| Mobile scheduled ordering | `PERSONA-CUSTOMER` | C/D | Mobile-usable date/time selection | `US-036I-013` | `V1_ACCEPTANCE_SLICE` |
| Accessible date/time selection | `PERSONA-CUSTOMER` | C/D | Keyboard/SR/error association | `US-036I-014` | `V1_ACCEPTANCE_SLICE` |
| Commercial + payment sealing | `PERSONA-CUSTOMER` | C/D | Pay online; sealed commercials (OPEN confirm) | `US-036I-015` | `V1_ACCEPTANCE_SLICE` |
| Platform/config operability | `PERSONA-PLATFORM-OPERATOR` / workforce config context | Config | Scheduling eligibility inputs visible/operable without inventing RBAC | `US-036I-016` | `V1_ACCEPTANCE_SLICE` (bounded) |
| Recurring / subscriptions / catering | — | — | — | — | `NOT_SUPPORTED` |
| Cash/COD / pay-later deposits | — | — | — | — | `NOT_SUPPORTED` / OPEN only for pay-now vs pay-later |

---

## 8. Acceptance slice

| Slice | Mandatory story IDs | Mandatory AC IDs | Required Golden Journeys | Observable acceptance boundary |
|---|---|---|---|---|
| `V1_ACCEPTANCE_SLICE` | `US-036I-001` … `US-036I-016` | `AC-036I-001` … `AC-036I-052` (all mandatory YES unless noted; some outcomes gated on OPEN FDs must be proven once Founder resolves) | `GJ-FIRST-ORDER` ASAP Delivery + ASAP Pickup non-regression; Scheduled Pickup + Scheduled Delivery extensions; `GJ-PAYMENT-RECOVERY`; `GJ-CANCELLATION-REFUND` continuity | Customer completes Scheduled Pickup and Scheduled Delivery with correct mode×timing×commercial/privacy outcomes; Ops fulfils both; ASAP remains green; no Delivery aggregate for Scheduled Pickup |
| `FOLLOW_UP` | Capacity advanced models; UX polish beyond mandatory clarity; optional calendar flourishes | As defined later | N/A unless GJ impacted | Not silently required for V1 |
| `DEFERRED` | Recurring; subscriptions; catering; labour/driver shift scheduling; AI prep prediction | N/A | N/A | Explicit non-goals |

Disposition vocabulary for §§22–25: `SUPPORTED_NOW`, `EXPLICITLY_DEFERRED`,
`NOT_SUPPORTED_BY_DESIGN`, `UNRESOLVED_DECISION_REQUIRED` (**active unresolved count = 15**).

---

## 9. User stories

### US-036I-001 — Choose Scheduled vs ASAP

```text
Story ID: US-036I-001
As a PERSONA-CUSTOMER
I want to choose ASAP or Scheduled during authenticated checkout
so that I can reserve a future fulfilment time when ASAP is inconvenient.

Journey / activity: JOURNEY-I-C / D / F; timing selection
Preconditions: Authenticated customer; non-empty cart; checkout entered; fulfilment mode chosen or choosable
Acceptance scenarios: AC-036I-001, AC-036I-002, AC-036I-003, AC-036I-020, AC-036I-021
Business rules: BR-036I-001, BR-036I-002, BR-036I-003
UX states: Timing choice ready; loading eligibility; Scheduled path; ASAP path
Permission / resource context: Existing customer checkout identity; no new role
Error / recovery: If Scheduled unavailable for current mode/cart, clear messaging; ASAP remains where valid
Dependencies: Accepted IMP-036B/C/H checkout; FD-036I-01…04 OPEN for model details
Explicit non-goals: Recurring schedules; inventing ScheduledOrder
Data implications: Order exposes fulfilment timing (product requirement). Durable placement = Architecture Fit
Security implications: Preserve authenticated checkout; no anonymous Scheduled
Architecture fit / applicable invariants: ARCHITECTURE_FIT_REQUIRED — where timing lives in Checkout/Snapshot
Open material decisions: FD-036I-01, FD-036I-02, FD-036I-03, FD-036I-04
Readiness: NOT_READY for Product Definition Gate until OPEN FDs resolved; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + authorization
```

### US-036I-002 — Schedule Pickup

```text
Story ID: US-036I-002
As a PERSONA-CUSTOMER
I want to schedule Pickup at an eligible outlet for a supported future time
so that I can collect when I arrive without paying a delivery fee.

Journey / activity: JOURNEY-I-C
Preconditions: Pickup chosen; Scheduled chosen; eligible pickup outlet path (IMP-036H rules)
Acceptance scenarios: AC-036I-004, AC-036I-005, AC-036I-006, AC-036I-007, AC-036I-022, AC-036I-023, AC-036I-040, AC-036I-048
Business rules: BR-036I-004, BR-036I-005, BR-036I-006, BR-036I-012
UX states: Date/time picker; selected timing review; Pickup location + instructions + timing
Permission / resource context: Customer checkout; outlet eligibility server-authoritative
Error / recovery: No times; outlet cannot fulfil; operating/future closure exclusions; no silent outlet/time switch
Dependencies: IMP-036H Pickup rules; FD-036I-01…05, FD-036I-13, FD-036I-15 OPEN where applicable
Explicit non-goals: OTP/QR/PIN; Delivery aggregate; inventing pickup destination as delivery address
Data implications: Paid snapshot binds mode=PICKUP + timing + outlet immutably (product requirement)
Security implications: Privacy minimization — no forced delivery address/GPS/Maps for Scheduled Pickup
Architecture fit / applicable invariants: Timing bind to snapshot; outlet profile; eligibility computation
Open material decisions: FD-036I-01, FD-036I-02, FD-036I-03, FD-036I-13, FD-036I-15
Readiness: Gate-blocked on OPEN FDs; NOT_READY_FOR_IMPLEMENTATION
```

### US-036I-003 — Schedule Delivery

```text
Story ID: US-036I-003
As a PERSONA-CUSTOMER
I want to schedule Delivery to a serviceable destination for a supported future time
so that food arrives when I need it.

Journey / activity: JOURNEY-I-D
Preconditions: Delivery chosen; Scheduled chosen; valid destination/serviceability path
Acceptance scenarios: AC-036I-008, AC-036I-009, AC-036I-010, AC-036I-024, AC-036I-025, AC-036I-041, AC-036I-049
Business rules: BR-036I-004, BR-036I-005, BR-036I-007, BR-036I-013
UX states: Destination + date/time; review shows promise class wording per FD-036I-05 once resolved
Permission / resource context: Existing Delivery destination authority
Error / recovery: Unserviceable; no times; future serviceability deny; recoverable
Dependencies: ADR-011 / accepted Delivery; FD-036I-05, FD-036I-14 OPEN
Explicit non-goals: Customer-selected driver; multi-stop; marketplace surge
Data implications: Paid snapshot binds mode=DELIVERY + timing + destination; Delivery path retained
Security implications: Existing destination PII rules; no extra scheduling PII
Architecture fit / applicable invariants: Future serviceability evaluation; dispatch timing mechanism = Fit
Open material decisions: FD-036I-01, FD-036I-05, FD-036I-14
Readiness: Gate-blocked on OPEN FDs; NOT_READY_FOR_IMPLEMENTATION
```

### US-036I-004 — No available future times

```text
Story ID: US-036I-004
As a PERSONA-CUSTOMER
I want a clear outcome when no Scheduled times are available
so that I am not shown invented or false promises.

Journey / activity: JOURNEY-I-E
Preconditions: Scheduled chosen; eligibility yields zero times
Acceptance scenarios: AC-036I-011, AC-036I-012, AC-036I-026
Business rules: BR-036I-005, BR-036I-008
UX states: Empty/unavailable Scheduled; actions toward ASAP / other mode / cart
Permission / resource context: Customer checkout
Error / recovery: Switch to ASAP if valid; change mode; modify cart; exit — never invent a time
Dependencies: FD-036I-02, FD-036I-03, FD-036I-04, FD-036I-15
Explicit non-goals: Silent fallback to a hidden default slot
Data implications: N/A durable Order until payment
Security implications: Do not leak internal closure reasons beyond customer-safe messaging
Architecture fit / applicable invariants: Eligibility computation
Open material decisions: FD-036I-02, FD-036I-03, FD-036I-04, FD-036I-15
Readiness: Gate-blocked on OPEN FDs; NOT_READY_FOR_IMPLEMENTATION
```

### US-036I-005 — Pre-payment timing and mode switching

```text
Story ID: US-036I-005
As a PERSONA-CUSTOMER
I want to switch ASAP↔Scheduled and Delivery↔Pickup before payment
so that commercials and eligibility stay coherent.

Journey / activity: JOURNEY-I-F
Preconditions: Pre-payment checkout; not payment-bound immutably
Acceptance scenarios: AC-036I-013, AC-036I-014, AC-036I-015, AC-036I-027, AC-036I-028
Business rules: BR-036I-002, BR-036I-003, BR-036I-009
UX states: Recalculating; destination required after switch to Delivery; timing cleared/revalidated after switches
Permission / resource context: Customer checkout
Error / recovery: Incomplete Delivery destination blocks pay; Scheduled eligibility failures as US-036I-004
Dependencies: IMP-036H mode-switch rules; FD-036I-07 commercial sealing context
Explicit non-goals: Post-payment silent mode/timing rewrite
Data implications: Delivery-only information must not affect Pickup commercial result after switch
Security implications: Server re-evaluation required
Architecture fit / applicable invariants: Conditional destination + timing without corrupting history
Open material decisions: FD-036I-07 (commercial implications of switch before pay)
Readiness: Gate-blocked where OPEN; NOT_READY_FOR_IMPLEMENTATION
```

### US-036I-006 — Scheduled time invalid before payment

```text
Story ID: US-036I-006
As a PERSONA-CUSTOMER
I want payment blocked if my selected future time becomes unavailable before I pay
so that I do not purchase a false promise.

Journey / activity: JOURNEY-I-G
Preconditions: Scheduled time previously selected; eligibility changed before pay
Acceptance scenarios: AC-036I-016, AC-036I-017, AC-036I-029, AC-036I-030
Business rules: BR-036I-008, BR-036I-010
UX states: Revalidation failure; choose another time / ASAP / recover
Permission / resource context: Customer checkout; server-authoritative eligibility
Error / recovery: No silent time/outlet/item/mode substitution
Dependencies: Payment-pending mutation safety foundations; FD-036I-04 if capacity race
Explicit non-goals: Inventing a new payment recovery model
Data implications: Revalidate before payment bind
Security implications: Prevent commercial/timing tampering
Architecture fit / applicable invariants: Pre-payment revalidation; last-slot concurrency if capacity
Open material decisions: FD-036I-04
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

### US-036I-007 — View scheduled order after purchase

```text
Story ID: US-036I-007
As a PERSONA-CUSTOMER
I want confirmation and order history/detail to show Scheduled mode and timing clearly
so that I know when and how my Order will be fulfilled.

Journey / activity: Confirmation + history
Preconditions: Paid Scheduled Order owned by customer
Acceptance scenarios: AC-036I-018, AC-036I-019, AC-036I-031, AC-036I-050
Business rules: BR-036I-011, BR-036I-012, BR-036I-013
UX states: Confirmation success; history row; detail with timing in outlet local TZ
Permission / resource context: Customer owns own order projections
Error / recovery: Missing required display fields is a product defect relative to confirmation requirements
Dependencies: FD-036I-05 (Delivery promise wording); IMP-036H Pickup display fields
Explicit non-goals: Rider ETA chrome on Pickup; inventing new Order status labels as lifecycle states
Data implications: Customer-facing timing promise must be projectable
Security implications: Do not expose unauthorized Ops internals
Architecture fit / applicable invariants: Fulfilment-aware + timing-aware projections
Open material decisions: FD-036I-05 (wording class)
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

### US-036I-008 — Workforce sees and prioritizes scheduled orders

```text
Story ID: US-036I-008
As a PERSONA-WORKFORCE-OPERATOR
I want Scheduled Orders clearly badged with due timing and visible before they are due
so that Outlet Manager / Kitchen / Delivery Coordinator contexts can prepare.

Journey / activity: JOURNEY-I-OPS-LIST / DETAIL
Preconditions: Authorized Ops session; Scheduled Orders exist
Acceptance scenarios: AC-036I-032, AC-036I-033, AC-036I-034, AC-036I-042
Business rules: BR-036I-014, BR-036I-015
UX states: List badge (mode + Scheduled + due); detail ready; due-soon / overdue presentation (derived, not new status unless FD proves need)
Permission / resource context: Existing Ops order permissions; no new role by default
Error / recovery: Unauthorized deny
Dependencies: FD-036I-12 OPEN (visibility/actionability/release)
Explicit non-goals: Inventing SCHEDULED/READY/DUE/LATE Order statuses without Founder proof of need
Data implications: Timing metadata / derived operational presentation (product requirement)
Security implications: Server-enforced authorization; BOLA/scope deny
Architecture fit / applicable invariants: Projection extensions; operational release mechanism = Fit
Open material decisions: FD-036I-12
Readiness: Gate-blocked on FD-036I-12; NOT_READY_FOR_IMPLEMENTATION
```

### US-036I-009 — Workforce fulfils Scheduled Pickup

```text
Story ID: US-036I-009
As a PERSONA-WORKFORCE-OPERATOR (Outlet Manager / Kitchen context)
I want to accept and hand over Scheduled Pickup Orders under the existing Order lifecycle
so that customers collect without OTP/QR/PIN and without Delivery chrome.

Journey / activity: JOURNEY-I-OPS-PICKUP-HANDOVER
Preconditions: Authorized Ops; Scheduled Pickup in eligible lifecycle state
Acceptance scenarios: AC-036I-035, AC-036I-036, AC-036I-043, AC-036I-048
Business rules: BR-036I-006, BR-036I-012, BR-036I-016
UX states: Accept; handover confirm; FULFILLED success; early/late handling per FD-036I-13
Permission / resource context: Reuse existing order.fulfil if Fit confirms (IMP-036H precedent)
Error / recovery: Unauthorized cannot fulfil; mismatch → do not fulfil wrong Order
Dependencies: FD-036H-12/23 inheritance; FD-036I-13 OPEN
Explicit non-goals: New PickupProof; PREPARING/READY_FOR_PICKUP unless Founder changes lifecycle
Data implications: Handover → existing FULFILLED; audit preserved
Security implications: Authorization server-enforced
Architecture fit / applicable invariants: Confirm order.fulfil coverage; prep-release mechanism = Fit
Open material decisions: FD-036I-12, FD-036I-13
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

### US-036I-010 — Delivery Coordinator executes Scheduled Delivery

```text
Story ID: US-036I-010
As a PERSONA-WORKFORCE-OPERATOR (Delivery Coordinator context)
I want Scheduled Delivery execution to begin relative to the customer promise
so that arrival/fulfilment expectations can be met without inventing a new Order type.

Journey / activity: JOURNEY-I-OPS-DELIVERY-EXEC
Preconditions: Authorized Ops/Delivery context; Scheduled Delivery Order
Acceptance scenarios: AC-036I-037, AC-036I-038, AC-036I-044, AC-036I-049
Business rules: BR-036I-007, BR-036I-013, BR-036I-017
UX states: Due window visible; initiate delivery; provider fail recovery
Permission / resource context: Existing Delivery Ops authority
Error / recovery: Provider cannot book → customer recovery class per FD-036I-10/14; no silent promise rewrite
Dependencies: ADR-011; FD-036I-05, FD-036I-14 OPEN
Explicit non-goals: Driver shift scheduling; customer-selected driver
Data implications: Delivery aggregate only for Delivery Orders
Security implications: Existing provider credential boundaries
Architecture fit / applicable invariants: When/how delivery booking is triggered = Fit
Open material decisions: FD-036I-05, FD-036I-14
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

### US-036I-011 — Customer cancellation / reschedule outcome

```text
Story ID: US-036I-011
As a PERSONA-CUSTOMER
I want clear cancellation (and reschedule if supported) outcomes for Scheduled Orders
so that I can change plans without hidden fees or silent commercial mutations.

Journey / activity: Cancel / reschedule
Preconditions: Paid Scheduled Order; within/outside cutoff per policy
Acceptance scenarios: AC-036I-039, AC-036I-045, AC-036I-046
Business rules: BR-036I-018
UX states: Cancel confirm; cutoff denied; reschedule path if YES; refund continuity messaging
Permission / resource context: Existing cancellation/refund permissions
Error / recovery: After cutoff → clear deny + support/ops path; no invented cancellation fee without Founder decision
Dependencies: FD-036I-08, FD-036I-09 OPEN; FD-036H-18 continuity; D-364 refunds
Explicit non-goals: Complex modification engine by default; no-show penalties without Founder decision
Data implications: Refund/financial docs remain D-365/366/367
Security implications: Customer may cancel only own Orders
Architecture fit / applicable invariants: Align to existing cancel/refund concurrency
Open material decisions: FD-036I-08, FD-036I-09
Readiness: Gate-blocked; NOT_READY_FOR_IMPLEMENTATION
```

### US-036I-012 — Post-payment future-unavailability recovery

```text
Story ID: US-036I-012
As a PERSONA-CUSTOMER
I want an honest recovery if my paid Scheduled Order cannot be honoured later
so that BOBA Bear never silently changes outlet, items, mode, or time.

Journey / activity: JOURNEY-I-H
Preconditions: Paid Scheduled Order; future eligibility broken (closure, merch, Pickup disabled, Delivery impossible)
Acceptance scenarios: AC-036I-047, AC-036I-051
Business rules: BR-036I-008, BR-036I-010, BR-036I-018
UX states: Notification of problem; recovery options class per FD-036I-10
Permission / resource context: Customer + authorized Ops recovery actions under existing authorities
Error / recovery: Contact / reschedule / cancel+refund classes — Founder chooses; no silent substitution
Dependencies: FD-036I-10 OPEN
Explicit non-goals: Silent outlet switch; silent item removal; silent mode/time rewrite
Data implications: Preserve audit of original promise vs recovery outcome
Security implications: Do not expose unnecessary internal ops notes to unauthorized parties
Architecture fit / applicable invariants: Detection + notification + recovery workflows = Fit
Open material decisions: FD-036I-10
Readiness: Gate-blocked; NOT_READY_FOR_IMPLEMENTATION
```

### US-036I-013 — Mobile scheduled ordering

```text
Story ID: US-036I-013
As a PERSONA-CUSTOMER
I want Scheduled date/time selection to work on supported mobile viewports
so that I can pre-order from my phone.

Journey / activity: JOURNEY-I-C / D on mobile
Preconditions: Supported mobile viewport; Scheduled path
Acceptance scenarios: AC-036I-052
Business rules: BR-036I-011
UX states: Mobile date/time selection usable; review/pay reachable
Permission / resource context: Customer checkout
Error / recovery: Same product recoveries as desktop
Dependencies: Existing mobile checkout support
Explicit non-goals: Native-app-only scheduling
Data implications: None beyond other stories
Security implications: Same as checkout
Architecture fit / applicable invariants: UX mechanism not locked
Open material decisions: NONE beyond shared OPEN FDs
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

### US-036I-014 — Accessible date/time selection

```text
Story ID: US-036I-014
As a PERSONA-CUSTOMER
I want Scheduled date/time selection to be keyboard and screen-reader accessible
so that I can choose a time without relying on colour or pointer-only UI.

Journey / activity: Date/time selection accessibility
Preconditions: Scheduled path presented
Acceptance scenarios: AC-036I-052 (shared with mobile a11y assertions), AC-036I-021
Business rules: BR-036I-011
UX states: Focusable controls; programmatic selected state; error association
Permission / resource context: Customer checkout
Error / recovery: Errors announced/associated; not colour-only
Dependencies: §18; TEST-1 a11y proof expectations
Explicit non-goals: Locking a specific calendar library/component
Data implications: N/A
Security implications: N/A
Architecture fit / applicable invariants: Component choice = implementation; outcomes = product
Open material decisions: NONE product-policy; FD-036I-01 affects control shape (slot list vs time picker) but a11y outcomes remain
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

### US-036I-015 — Commercial sealing and online payment for Scheduled

```text
Story ID: US-036I-015
As a PERSONA-CUSTOMER
I want to pay online for a Scheduled Order against a confirmed commercial result
so that prices/fees do not silently change after purchase, and cash/COD is never offered.

Journey / activity: Payment → Order materialization
Preconditions: Valid Scheduled commercial snapshot; online payment authority
Acceptance scenarios: AC-036I-020, AC-036I-021, AC-036I-022, AC-036I-023, AC-036I-024, AC-036I-025, AC-036I-030
Business rules: BR-036I-009, BR-036I-010, BR-036I-016, BR-036I-017
UX states: Payment pending; success; failure/retry per GJ-PAYMENT-RECOVERY
Permission / resource context: Existing payment identity
Error / recovery: Existing payment failure/retry; never invent cash/COD/deposit/partial
Dependencies: FD-036H-03 inheritance; FD-036I-06 OPEN (pay now recommended); FD-036I-07 OPEN (sealing recommended)
Explicit non-goals: Pay later deposits; COD; new payment provider; new financial document type
Data implications: Single Order; D-365/366/367 continuity; Checkout Snapshot sealing inheritance recommended
Security implications: Server-authoritative commercials; payment-bound immutability
Architecture fit / applicable invariants: Snapshot timing fields; financial adapters remain D-365 compliant
Open material decisions: FD-036I-06, FD-036I-07
Readiness: Gate-blocked on OPEN pay/seal confirmations; NOT_READY_FOR_IMPLEMENTATION
```

### US-036I-016 — Scheduling configuration / platform operability boundary

```text
Story ID: US-036I-016
As a PERSONA-PLATFORM-OPERATOR (and workforce config context under PERSONA-WORKFORCE-OPERATOR)
I want scheduling eligibility inputs (hours, closures, mode enablement) to remain operable
so that Scheduled availability reflects real outlet reality without inventing a new RBAC model.

Journey / activity: Config / operability
Preconditions: Authorized actors under existing admin/ops authorities
Acceptance scenarios: AC-036I-034, AC-036I-042
Business rules: BR-036I-005, BR-036I-015
UX states: Existing outlet/hours/operating controls remain authoritative inputs to eligibility
Permission / resource context: Existing outlet/admin permissions; no new role by default
Error / recovery: Unauthorized deny
Dependencies: IMP-035 / outlet profile / operating-state foundations; FD-036I-02, FD-036I-15
Explicit non-goals: New “Scheduler Admin” role; labour scheduling product
Data implications: Product requires eligibility inputs; storage = Fit
Security implications: No client-trusted eligibility
Architecture fit / applicable invariants: Whether a scheduling profile is required per outlet = Fit
Open material decisions: FD-036I-02, FD-036I-04, FD-036I-15
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

---

## 10. Acceptance scenarios

```text
AC-036I-001 — ASAP Delivery golden journey unchanged
Story: US-036I-001
Given an authenticated customer with a valid Delivery destination and serviceability
When they complete checkout choosing Delivery + ASAP through payment and fulfilment
Then the Order follows the existing ASAP Delivery path without Scheduled requirements
And no Scheduled-only fields are required to place the Order
Mandatory in acceptance slice: YES
```

```text
AC-036I-002 — ASAP Pickup golden journey unchanged
Story: US-036I-001
Given an authenticated customer on an eligible ASAP Pickup path (IMP-036H)
When they complete checkout choosing Pickup + ASAP through payment and handover fulfilment
Then the Order follows the existing ASAP Pickup path without Scheduled requirements
And Pickup still incurs no delivery fee and creates no Delivery aggregate
Mandatory in acceptance slice: YES
```

```text
AC-036I-003 — Customer can choose Scheduled timing
Story: US-036I-001
Given an authenticated customer in checkout with a fulfilment mode selected
When Scheduled timing is offered and the customer selects Scheduled
Then the customer is prompted to select an eligible future fulfilment time
And ASAP remains available as an alternative where valid
Mandatory in acceptance slice: YES
```

```text
AC-036I-004 — Scheduled Pickup golden journey (happy path)
Story: US-036I-002
Given Pickup + Scheduled with at least one eligible future time and eligible outlet
When the customer selects a time, reviews, pays online, and Ops later hands over
Then a single Order exists with fulfilmentMode=PICKUP and fulfilmentTiming=SCHEDULED
And confirmation/history show Pickup + timing in outlet local timezone
And Ops handover reaches FULFILLED under existing lifecycle without OTP/QR/PIN
Mandatory in acceptance slice: YES
```

```text
AC-036I-005 — Scheduled Pickup shows outlet location and timing on review
Story: US-036I-002
Given Pickup + Scheduled with a selected outlet and time
When the customer reaches pre-pay review
Then review shows Pickup, outlet display name/address/instructions, selected timing, packaging where applicable, and no delivery fee
Mandatory in acceptance slice: YES
```

```text
AC-036I-006 — Scheduled Pickup never creates Delivery aggregate
Story: US-036I-002
Given a paid Scheduled Pickup Order
When fulfilment executes
Then no Delivery aggregate is created or invoked
And Delivery-provider execution is fail-closed for that Order
Mandatory in acceptance slice: YES
```

```text
AC-036I-007 — Scheduled Pickup packaging and tax/promo continuity
Story: US-036I-002 / US-036I-015
Given Pickup + Scheduled commercial evaluation
When totals are shown and paid
Then packaging rules from IMP-036H still apply
And existing tax/promotions authorities remain authoritative
And no separate Scheduled pricing engine is invented
Mandatory in acceptance slice: YES
```

```text
AC-036I-008 — Scheduled Delivery golden journey (happy path)
Story: US-036I-003
Given Delivery + Scheduled with serviceable destination and eligible future time
When the customer selects a time, reviews, pays online, and Delivery later fulfils
Then a single Order exists with fulfilmentMode=DELIVERY and fulfilmentTiming=SCHEDULED
And confirmation/history show Delivery + timing promise
And Delivery path (not Pickup handover) is used
Mandatory in acceptance slice: YES
```

```text
AC-036I-009 — Scheduled Delivery requires destination/serviceability
Story: US-036I-003
Given Delivery + Scheduled without a valid destination/serviceability
When the customer attempts to continue to payment
Then payment is blocked until destination/serviceability is satisfied
Mandatory in acceptance slice: YES
```

```text
AC-036I-010 — Scheduled Delivery customer-facing promise class is explicit
Story: US-036I-003
Given Delivery + Scheduled with a selected time
When review/confirmation present the timing
Then the wording matches the Founder-resolved promise class (arrival vs kitchen-ready vs dispatch) from FD-036I-05
And the class is not left ambiguous in customer-facing copy
Mandatory in acceptance slice: YES (blocked until FD-036I-05 resolved)
```

```text
AC-036I-011 — No eligible Scheduled times — clear empty state
Story: US-036I-004
Given Scheduled chosen and eligibility yields zero times
When the customer views timing selection
Then a clear unavailable/empty state is shown
And no invented time is offered
Mandatory in acceptance slice: YES
```

```text
AC-036I-012 — No times — ASAP may remain available
Story: US-036I-004
Given Scheduled has zero eligible times but ASAP is valid for the mode
When the empty Scheduled state is shown
Then the customer can switch to ASAP (or exit/change cart/mode) as recoverable actions
Mandatory in acceptance slice: YES
```

```text
AC-036I-013 — Switch ASAP Delivery → Scheduled Delivery pre-pay
Story: US-036I-005
Given Delivery + ASAP pre-payment
When the customer switches to Scheduled
Then eligible times are evaluated and required before pay
And destination/serviceability remain required
Mandatory in acceptance slice: YES
```

```text
AC-036I-014 — Switch Scheduled Pickup → ASAP Pickup pre-pay
Story: US-036I-005
Given Pickup + Scheduled with a selected time pre-payment
When the customer switches to ASAP
Then Scheduled time is cleared from the commercial path
And ASAP Pickup eligibility/commercial rules apply
Mandatory in acceptance slice: YES
```

```text
AC-036I-015 — Switch Scheduled Delivery → Scheduled Pickup pre-pay
Story: US-036I-005
Given Delivery + Scheduled pre-payment
When the customer switches to Pickup + Scheduled
Then delivery destination stops affecting commercial result
And delivery fee disappears
And pickup outlet + Scheduled eligibility apply
And no silent retention of delivery-only charges
Mandatory in acceptance slice: YES
```

```text
AC-036I-016 — Selected time becomes unavailable before payment
Story: US-036I-006
Given a previously selected Scheduled time that later fails eligibility
When the customer attempts to pay
Then payment is blocked with a clear reason
And the customer may choose another time / ASAP / recover
And the system does not silently substitute another time
Mandatory in acceptance slice: YES
```

```text
AC-036I-017 — Merchandise becomes unfulfilable before payment on Scheduled
Story: US-036I-006
Given Scheduled selected and a cart item becomes unfulfilable at the outlet before pay
When the customer attempts to continue/pay
Then payment is blocked
And no silent item removal or outlet substitution occurs
Mandatory in acceptance slice: YES
```

```text
AC-036I-018 — Confirmation states Scheduled clearly
Story: US-036I-007
Given a successfully paid Scheduled Order
When confirmation is shown
Then it states fulfilment mode and Scheduled timing in outlet local timezone
Mandatory in acceptance slice: YES
```

```text
AC-036I-019 — History/detail distinguish ASAP vs Scheduled
Story: US-036I-007
Given the customer owns both ASAP and Scheduled Orders
When viewing history/detail
Then each Order is distinguishable by timing (ASAP vs Scheduled + promise)
And Scheduled Pickup detail does not show delivery tracking chrome
Mandatory in acceptance slice: YES
```

```text
AC-036I-020 — Online payment only for Scheduled (no cash/COD)
Story: US-036I-015
Given a valid Scheduled checkout ready to pay
When payment options are presented
Then only online payment (and zero-payable where already authorized) is offered
And cash on delivery / pay at pickup / COD / deposit / partial payment are not offered
Mandatory in acceptance slice: YES
```

```text
AC-036I-021 — Timing choice accessibility basics
Story: US-036I-014
Given timing choice controls are shown
When operated by keyboard
Then ASAP/Scheduled controls are reachable, named, and expose selected state programmatically
Mandatory in acceptance slice: YES
```

```text
AC-036I-022 — Scheduled Pickup commercial: no delivery fee
Story: US-036I-002 / US-036I-015
Given Pickup + Scheduled review
When totals are displayed
Then delivery fee is absent / zero as business invariant
Mandatory in acceptance slice: YES
```

```text
AC-036I-023 — Scheduled Pickup Order remains a single Order
Story: US-036I-002 / US-036I-015
Given successful Scheduled Pickup payment
When Order materializes
Then exactly one Order is created (idempotent retries do not duplicate)
And no ScheduledOrder / PickupScheduledOrder aggregate exists
Mandatory in acceptance slice: YES
```

```text
AC-036I-024 — Scheduled Delivery commercial includes delivery fee rules as applicable
Story: US-036I-003 / US-036I-015
Given Delivery + Scheduled review with applicable delivery charges under existing authority
When totals are displayed
Then delivery charges follow existing Delivery commercial authority (not Pickup exclusion)
Mandatory in acceptance slice: YES
```

```text
AC-036I-025 — Scheduled Delivery Order remains a single Order
Story: US-036I-003 / US-036I-015
Given successful Scheduled Delivery payment
When Order materializes
Then exactly one Order is created
And Delivery execution path remains available for that Order
Mandatory in acceptance slice: YES
```

```text
AC-036I-026 — Minimum lead time excludes too-soon times
Story: US-036I-004
Given Scheduled selection under a minimum lead-time policy (FD-036I-03 once resolved)
When eligible times are listed
Then times earlier than the minimum lead are not selectable
Mandatory in acceptance slice: YES (policy detail blocked until FD-036I-03)
```

```text
AC-036I-027 — Maximum horizon excludes beyond-horizon dates
Story: US-036I-005
Given Scheduled selection under a horizon policy (FD-036I-02 once resolved)
When eligible dates are listed
Then dates beyond the horizon are not selectable
Mandatory in acceptance slice: YES (policy detail blocked until FD-036I-02)
```

```text
AC-036I-028 — Switch Scheduled Pickup → Scheduled Delivery requires destination
Story: US-036I-005
Given Pickup + Scheduled pre-payment
When the customer switches to Delivery + Scheduled
Then a valid destination/serviceability is required before payment
Mandatory in acceptance slice: YES
```

```text
AC-036I-029 — Payment-pending blocks unsafe timing mutation
Story: US-036I-006 / US-036I-015
Given payment pending/bound to an immutable commercial snapshot including timing
When the customer attempts to change Scheduled time or mode in a way that would invalidate the snapshot
Then the mutation fails safely with clear recovery aligned to existing payment authority
Mandatory in acceptance slice: YES
```

```text
AC-036I-030 — Financial documents continuity (no new FD type)
Story: US-036I-015
Given a paid Scheduled Order that issues financial documents / refunds under existing flows
When documents are issued or refund statutory decisions occur
Then D-365 / D-366 / D-367 remain authoritative
And scheduling does not invent a new financial-document type
Mandatory in acceptance slice: YES
```

```text
AC-036I-031 — Timezone presentation uses outlet local timezone
Story: US-036I-007
Given a Scheduled Order for an outlet with a known local timezone
When confirmation/history/detail/Ops detail show timing
Then times are presented in that outlet local timezone (not raw server timezone)
Mandatory in acceptance slice: YES
```

```text
AC-036I-032 — Ops list badges mode and Scheduled timing
Story: US-036I-008
Given authorized Ops viewing the Order list containing ASAP and Scheduled Orders
When the list renders
Then each Order is badged with fulfilment mode and ASAP vs Scheduled
And Scheduled rows expose due/window information sufficient to prioritize
Mandatory in acceptance slice: YES
```

```text
AC-036I-033 — Ops Scheduled detail shows required fields
Story: US-036I-008
Given authorized Ops open a Scheduled Pickup Order detail
When detail renders
Then it shows order identity, authorized customer info, items, mode=Pickup, timing promise, pickup outlet, payment/lifecycle controls
And it does not show rider booking / provider tracking / delivery proof controls
Mandatory in acceptance slice: YES
```

```text
AC-036I-034 — Unauthorized Ops cannot fulfil Scheduled Orders (BOLA/scope)
Story: US-036I-008
Given a workforce actor lacking fulfil authority or outside resource scope
When they attempt Scheduled handover or Delivery fulfil actions
Then the action is denied and no lifecycle change occurs
Mandatory in acceptance slice: YES
```

```text
AC-036I-035 — Scheduled Pickup handover → FULFILLED
Story: US-036I-009
Given an ACCEPTED Scheduled Pickup Order and matching customer order confirmation
When Ops completes Handed to customer / Mark as picked up
Then Order becomes FULFILLED under existing lifecycle
And verification does not require OTP/QR/PIN/government ID
Mandatory in acceptance slice: YES
```

```text
AC-036I-036 — Scheduled Pickup early/late policy is followed
Story: US-036I-009
Given a customer arrives early or late relative to the Scheduled Pickup promise
When Ops handles collection
Then behaviour matches Founder-resolved FD-036I-13 policy
And the system does not invent penalties unless Founder authorizes them
Mandatory in acceptance slice: YES (blocked until FD-036I-13)
```

```text
AC-036I-037 — Scheduled Delivery execution aligns to promise
Story: US-036I-010
Given a Scheduled Delivery Order approaching its promised window
When Delivery Coordinator / Ops initiates delivery execution
Then initiation is conceptually timed to meet the customer-facing promise class (FD-036I-05/14)
And customer-visible progress uses Delivery language (not Pickup handover)
Mandatory in acceptance slice: YES (detail blocked until FD-036I-14)
```

```text
AC-036I-038 — Delivery provider cannot book near Scheduled window
Story: US-036I-010
Given Scheduled Delivery where provider booking cannot be completed in time
When Ops/system detects the failure
Then customer recovery follows FD-036I-10/14 classes without silently changing the original promise
Mandatory in acceptance slice: YES (blocked until FD-036I-10/14)
```

```text
AC-036I-039 — Customer cancellation before cutoff
Story: US-036I-011
Given a paid Scheduled Order within the Founder-resolved cancellation cutoff (FD-036I-09)
When the customer cancels
Then cancellation/refund proceeds under existing refund authority
And no cancellation fee is charged unless Founder explicitly authorizes one
Mandatory in acceptance slice: YES (cutoff detail blocked until FD-036I-09)
```

```text
AC-036I-040 — Future closure removes future slot eligibility without inventing “PAUSED forever”
Story: US-036I-002 / US-036I-004
Given a known future closure/exception for an outlet on date D
When the customer browses Scheduled times for date D
Then times covered by that future closure are not selectable
And a temporary current PAUSED state does not by itself erase unrelated future dates’ eligibility (FD-036I-15)
Mandatory in acceptance slice: YES (blocked until FD-036I-15)
```

```text
AC-036I-041 — Operating hours constrain selectable Scheduled times
Story: US-036I-003
Given outlet scheduled operating hours
When eligible Scheduled times are computed for customer selection
Then times outside known accepting operating hours for that mode are not selectable
Mandatory in acceptance slice: YES
```

```text
AC-036I-042 — Capacity behaviour matches V1 Founder choice
Story: US-036I-008 / US-036I-004
Given FD-036I-04 resolved (no capacity vs per-slot capacity)
When the last available capacity is exhausted (if capacity exists) or when capacity is not in V1
Then customer outcomes match the resolved policy (either no capacity gating, or clear full-slot unavailable)
And last-slot races do not double-sell beyond policy
Mandatory in acceptance slice: YES (blocked until FD-036I-04)
```

```text
AC-036I-043 — No new Order status invented without Founder decision
Story: US-036I-009
Given Scheduled Pickup/Delivery Orders in Ops
When lifecycle is displayed/acted
Then existing PLACED→ACCEPTED→FULFILLED|CANCELLED semantics remain unless a material FD authorizes a new status
And due/overdue are presentation/derived timing cues, not silently new statuses
Mandatory in acceptance slice: YES
```

```text
AC-036I-044 — Notifications are fulfilment-mode and timing aware
Story: US-036I-007 / US-036I-010
Given Scheduled Order lifecycle notification events under ADR-012 authority
When notifications are sent
Then copy reflects mode (Pickup vs Delivery) and Scheduled timing appropriately
And Pickup notifications do not claim a rider is arriving
And proactive reminder presence matches FD-036I-11 once resolved
Mandatory in acceptance slice: YES (reminder timing blocked until FD-036I-11)
```

```text
AC-036I-045 — Reschedule outcome matches Founder policy
Story: US-036I-011
Given FD-036I-08 resolved
When a customer requests a time change
Then either self-service reschedule works within cutoff/rules, or the product offers the defined non-self-service recovery (e.g. cancel + new order) without inventing a complex modification engine
Mandatory in acceptance slice: YES (blocked until FD-036I-08)
```

```text
AC-036I-046 — Cancellation after cutoff denied clearly
Story: US-036I-011
Given a Scheduled Order past the Founder-resolved cancellation cutoff
When the customer attempts self-service cancel
Then the action is denied with clear messaging and a support/ops path
Mandatory in acceptance slice: YES (blocked until FD-036I-09)
```

```text
AC-036I-047 — Post-payment unavailability: no silent substitutions
Story: US-036I-012
Given a paid Scheduled Order whose future fulfilment becomes impossible
When recovery begins
Then the system does not silently change outlet, remove items, change mode, or change timing
And customer-visible recovery matches FD-036I-10
Mandatory in acceptance slice: YES (blocked until FD-036I-10)
```

```text
AC-036I-048 — Scheduled Pickup privacy: no forced delivery address/GPS/Maps
Story: US-036I-002
Given Pickup + Scheduled checkout
When completing selection through payment
Then the customer is not forced through delivery destination, GPS, Maps, or PIN/serviceability destination flows
Mandatory in acceptance slice: YES
```

```text
AC-036I-049 — Program pause regression: activation does not accept IMP-037/038
Story: US-036I-010
Given PROGRAM_PAUSE D-377 and held IMP-037/038
When IMP-036I Product Definition work proceeds
Then this slice does not claim IMP-037/038 accepted, does not activate IMP-039/040, and does not close GAP-EXT-ASSESS-001
Mandatory in acceptance slice: YES (governance/product boundary proof)
```

```text
AC-036I-050 — Refund continuity for Scheduled Orders
Story: US-036I-011 / US-036I-015
Given a cancellable paid Scheduled Order refunded under existing authority
When refund completes
Then money/refund truth remains D-364 authoritative and statutory layers remain D-366/D-367
And scheduling adds no independent refund invention
Mandatory in acceptance slice: YES
```

```text
AC-036I-051 — Pay-now vs pay-later matches Founder resolution
Story: US-036I-015
Given FD-036I-06 resolved
When a customer places a Scheduled Order
Then payment timing matches the resolved policy (recommended: pay now before Order materialization)
And pay-later/deposit paths remain absent unless explicitly authorized
Mandatory in acceptance slice: YES (blocked until FD-036I-06)
```

```text
AC-036I-052 — Mobile + accessible Scheduled date/time selection
Story: US-036I-013 / US-036I-014
Given Scheduled date/time selection on a supported mobile viewport
When the customer selects a date/time using keyboard and assistive technology patterns
Then controls are reachable with visible focus, accessible names, programmatic selected state, and programmatically associated errors
And colour is not the sole indicator of selection/error
And calendar-style UX (if used) meets these outcomes without locking a specific library
Mandatory in acceptance slice: YES
```

### Planned proof matrix (TEST-1)

| Story / AC ID | Required behaviour / risk | Applicable test layers | Planned proof | Actual evidence / candidate / result |
|---|---|---|---|---|
| AC-036I-001, 002 | ASAP non-regression | E2E / Golden Journey | Existing Delivery + Pickup ASAP E2E | Planned only — NOT_PERFORMED |
| AC-036I-004…010 | Scheduled Pickup/Delivery happy paths | Domain + API + E2E | New Scheduled journeys after implementation authorization | Planned only |
| AC-036I-011…017, 026…029 | Empty/switch/revalidation/races | Domain + checkout concurrency | Eligibility + mutation safety | Planned only |
| AC-036I-018…025, 030, 050, 051 | Confirmation, payment, commercials, FD continuity | Payment + Order + financial | Pay-now; D-365 continuity; no cash | Planned only |
| AC-036I-031…038, 042…044 | Ops + notifications + timezone | Ops API/UI + notification assertions | Badge/detail/handover/delivery timing | Planned only |
| AC-036I-039, 045…047 | Cancel/reschedule/post-pay recovery | E2E + refund continuity | After FD resolution | Planned only |
| AC-036I-048…049 | Privacy + program pause boundary | Negative + governance assertions | Pickup privacy; pause preserved | Planned only |
| AC-036I-021, 052 | Accessibility + mobile | Component/a11y + real-browser interactive proof | Keyboard/SR/mobile; scan alone insufficient | Planned only |

Planned is **not** proven. Evidence populates after Founder FD resolution → Gate → Fit/lock → authorized implementation under TEST-1 (no silent-retry-as-pass).

---

## 11. Business rules

| Rule ID | User/business rule | Authority / rationale | Story / AC IDs |
|---|---|---|---|
| `BR-036I-001` | Every checkout/order has exactly one authoritative fulfilment mode and one authoritative fulfilment timing. | Product identity; IMP-036H mode inheritance | US-036I-001; AC-036I-001…003 |
| `BR-036I-002` | FULFILMENT_MODE and FULFILMENT_TIMING are orthogonal; all four combinations are conceptually valid when eligibility allows. | Product identity | US-036I-001/005; AC-036I-013…015 |
| `BR-036I-003` | ASAP behaviour must not regress when Scheduled is introduced. | Accepted Delivery + IMP-036H | US-036I-001; AC-036I-001/002 |
| `BR-036I-004` | Scheduled requires an eligible future fulfilment time before payment. | PLANNED_IMP036I | US-036I-002/003; AC-036I-004/008 |
| `BR-036I-005` | Selectable times must respect outlet activity, known future schedule eligibility, mode eligibility, merchandise fulfilability, min lead, horizon, and capacity-if-in-V1. | FD-036I-02…04, FD-036I-15 OPEN detail | US-036I-004; AC-036I-011/026/027/040/041 |
| `BR-036I-006` | Scheduled Pickup preserves IMP-036H invariants: outlet bind, no destination, no delivery fee, no Delivery aggregate, packaging retained, order.fulfil handover, no OTP/QR/PIN. | FD-036H-04/07/08/13/23; FD-036I-16…20 | US-036I-002/009; AC-036I-005…007/035/048 |
| `BR-036I-007` | Scheduled Delivery preserves accepted Delivery destination/serviceability and Delivery execution path. | ADR-011 | US-036I-003/010; AC-036I-008/009/037 |
| `BR-036I-008` | No silent substitution of outlet, items, mode, or Scheduled time. | Product safety principle | US-036I-006/012; AC-036I-016/017/047 |
| `BR-036I-009` | Existing commercial/payment/order truth remains authoritative; scheduling does not invent a parallel pricing engine. | FD-036H-09; FD-036I-07 OPEN confirm | US-036I-015; AC-036I-007/022/024 |
| `BR-036I-010` | Payment-bound commercial snapshot (including mode+timing+outlet/destination) is immutable; unsafe mutations fail closed. | Accepted checkout/payment foundations; FD-036I-07 | US-036I-006/015; AC-036I-029 |
| `BR-036I-011` | Scheduled times are presented in the selected outlet's local timezone. | Product timezone rule | US-036I-007/013/014; AC-036I-031/052 |
| `BR-036I-012` | Order remains Order — no ScheduledOrder / PickupScheduledOrder / DeliveryScheduledOrder. | Product identity; FD-036I-17 | US-036I-002/007; AC-036I-023 |
| `BR-036I-013` | Customer-facing Scheduled Delivery timing promise must be explicitly classified (arrival vs kitchen-ready vs dispatch) once FD-036I-05 resolves. | FD-036I-05 OPEN | US-036I-003; AC-036I-010 |
| `BR-036I-014` | Scheduled Orders are visible to authorized workforce before due, with mode+timing badge. | FD-036I-12 OPEN detail | US-036I-008; AC-036I-032/033 |
| `BR-036I-015` | Prefer derived timing presentation over inventing new Order statuses unless Founder proves lifecycle need. | Product identity | US-036I-008/009; AC-036I-043 |
| `BR-036I-016` | Online payment only; no cash/COD/pay-at-counter for Scheduled. | FD-036H-03; FD-036I-16 | US-036I-015; AC-036I-020 |
| `BR-036I-017` | Scheduling does not create a new financial-document type; D-365/366/367 continuity required. | FD-036I-21 | US-036I-015; AC-036I-030/050 |
| `BR-036I-018` | Cancellation/reschedule/post-pay recovery follow Founder-resolved FD-036I-08/09/10; existing refund authority remains money truth. | FD-036I-08…10 OPEN; D-364 | US-036I-011/012; AC-036I-039/045…047 |

---

## 12. Journey Completeness Matrix

Applies primarily to `JOURNEY-I-C` / `JOURNEY-I-D` (Scheduled). ASAP journeys inherit existing completeness and must not regress.

| Journey dimension | Behaviour / applicability or N/A reason | Story / AC references |
|---|---|---|
| ENTRY | Authenticated customer enters checkout from cart | US-036I-001; AC-036I-003 |
| DISCOVERY | Timing choice presents ASAP + Scheduled; mode remains Delivery/Pickup peer | US-036I-001 |
| CONTEXT | Selected mode + timing + outlet/destination + commercials shown before pay | US-036I-002/003/007; AC-036I-005 |
| EMPTY / FIRST USE | Zero eligible times → clear empty; ASAP may remain; no invented time | US-036I-004; AC-036I-011/012 |
| HAPPY PATH | Select time → pay → Ops prepare → Pickup handover or Delivery fulfil → FULFILLED | AC-036I-004/008/035/037 |
| ALTERNATE VALID PATHS | Mode/timing switches; zero-payable; multi-outlet Pickup | AC-036I-013…015/028 |
| VALIDATION FAILURE | Lead/horizon/hours/closure/capacity/merch/serviceability failures | AC-036I-016/017/026/027/040/041 |
| AUTHORIZATION | Customer owns checkout; Ops fulfil requires authority; unauthorized deny | AC-036I-034 |
| NOT FOUND / STALE REFERENCE | Stale time/outlet after change → recoverable; no silent switch | AC-036I-016/029/047 |
| SERVER / NETWORK ERROR | Existing checkout/payment error/retry patterns | US-036I-015; GJ-PAYMENT-RECOVERY |
| RECOVERY | Other time / ASAP / mode switch / cancel+refund / FD-036I-10 classes | AC-036I-012/016/039/047 |
| CONCURRENCY | Payment-pending mutation safety; last-slot capacity races if in V1 | AC-036I-029/042 |
| DESTRUCTIVE ACTION | Cancellation/refund under existing authority; cutoff per FD-036I-09 | AC-036I-039/046/050 |
| SUCCESS FEEDBACK | Confirmation + history show Scheduled; Ops badge/detail | AC-036I-018/019/032 |
| DOWNSTREAM EFFECT | No Delivery aggregate for Pickup; notifications mode+timing aware; FD continuity | AC-036I-006/030/044 |
| REVISIT / RELOAD | Reload preserves authoritative mode/timing/payment state | US-036I-007/015 |
| RESPONSIVE / MOBILE | Checkout usable on supported mobile/desktop | §18; AC-036I-052 |
| ACCESSIBILITY | Labels for timing, date/time, errors; keyboard + programmatic selected/error state | §18; AC-036I-021/052 |

Workforce journeys share AUTHORIZATION, SUCCESS FEEDBACK, DOWNSTREAM EFFECT via AC-036I-032…038.

---

## 13. UX state matrix

| Surface / state | Entry condition | Visible feedback / available actions | Focus / keyboard behaviour | Next / recovery state | AC ID or N/A reason |
|---|---|---|---|---|---|
| Checkout / timing choice ready | Checkout loaded; mode known or choosable | ASAP and Scheduled options | Focusable choice controls; selected state programmatic | Selected timing path | AC-036I-003/021 |
| Checkout / timing loading | Evaluating eligibility | Loading; no premature pay | Busy announced | Ready or empty/error | N/A pattern |
| Checkout / no eligible times | Zero times | Clear unavailable; ASAP/mode/cart actions | Focus error/help | Stay or recover | AC-036I-011/012 |
| Date/time selection | Scheduled chosen; times exist | Selectable dates/times in outlet TZ | Keyboard-selectable; SR labels | Review | AC-036I-004/008/052 |
| Review Scheduled Pickup | Snapshot ready | Mode, outlet, timing, packaging, no delivery fee | Focus review CTA | Payment | AC-036I-005/022 |
| Review Scheduled Delivery | Snapshot ready | Mode, destination, timing promise class, fees | Focus review CTA | Payment | AC-036I-009/010/024 |
| Payment pending | Payment started | Existing pending UX; timing mutation blocked | Focus status | Success / fail / recover | AC-036I-020/029 |
| Payment success / confirmation | Order placed | Scheduled confirmation language + TZ | Focus confirmation | History/detail | AC-036I-018 |
| Customer history Scheduled | Order owned | Scheduled label + timing; Pickup without tracking | Focus row/detail | Detail | AC-036I-019 |
| Ops list badge | Authorized Ops | Mode + ASAP/Scheduled + due | Focusable rows | Detail | AC-036I-032 |
| Ops Scheduled detail | Scheduled Order | Required fields; mode-appropriate chrome | Focus lifecycle actions | Accept / handover / delivery | AC-036I-033 |
| Ops handover confirm | ACCEPTED Scheduled Pickup | Handed to customer / Mark as picked up | Confirm focusable + feedback | FULFILLED | AC-036I-035 |
| Ops unauthorized | Missing permission | Deny; no state change | Focus deny | Exit | AC-036I-034 |
| Cancel / cutoff denied | Past cutoff | Clear deny + support path | Focus message | Stay / contact | AC-036I-046 |
| Post-pay unavailability | Future broken | Honest recovery options (FD-036I-10) | Focus recovery | Reschedule/cancel/contact classes | AC-036I-047 |
| Server/network error | Transport fail | Existing retry messaging | Focus retry | Prior ready | Existing patterns |
| Mode/timing switch recalculating | Pre-pay switch | Temporary recalculating; updated eligibility/commercials | Announce update | Coherent path | AC-036I-013…015 |

---

## 14. Permissions / resource context

| Action | Existing identity / permission authority | Resource context / server-derived scope | Allowed / denied / cross-scope variants | AC IDs |
|---|---|---|---|---|
| Choose timing / pay Scheduled | Existing customer authenticated checkout identity | Customer-owned cart/checkout | Anonymous checkout NOT_SUPPORTED for Scheduled | AC-036I-020 |
| Ops accept Scheduled Order | Existing Ops order accept authority | Order resource in operator scope | Cross-scope deny | AC-036I-033 |
| Ops Pickup handover / fulfil | **ARCHITECTURE CANDIDATE:** reuse `order.fulfil` if Fit confirms (IMP-036H precedent); no new role by default | Order in operator scope | Unauthorized deny | AC-036I-035/034 |
| Ops Delivery fulfil Scheduled | Existing Delivery Ops authority | Delivery Order in scope | Unauthorized deny | AC-036I-037/034 |
| Invoke Delivery on Scheduled Pickup | Must fail closed | Pickup Order | Always denied for Pickup | AC-036I-006 |
| Cancel / refund / reschedule | Existing cancellation/refund permissions; reschedule if FD-036I-08 YES | Existing resource rules | Own-order only; cutoff deny | AC-036I-039/045/046 |
| Configure hours/closures affecting eligibility | Existing outlet/admin authorities | Outlet resource scope | Unauthorized deny; no new Scheduler Admin role | AC-036I-042/040 |

Do not derive authorization from persona labels. Fit verification of permission reuse is mandatory before implementation claims “no new permission.”

---

## 15. Data implications

**PRODUCT REQUIREMENTS (not schema):**

- A BOBA Bear Order remains an Order; it must expose fulfilment mode **and** fulfilment timing (no `ScheduledOrder` / `PickupScheduledOrder` / `DeliveryScheduledOrder`).
- Paid commercial snapshot binds selected mode, timing promise, and outlet (Pickup) or destination (Delivery) immutably.
- Scheduled Pickup must not create/use a Delivery aggregate.
- Customer-facing timing must be presentable in outlet local timezone.
- Scheduling eligibility depends on product inputs such as outlet activity, known future schedule/hours/exceptions, mode enablement, merchandise fulfilability, min lead, horizon, and capacity-if-included — **storage/computation = Architecture Fit**.
- Historical ASAP Orders remain ASAP; migration/backward-compatibility strategy = Architecture Fit.
- Do not invent speculative queue/cron/worker schemas in this draft.
- Conceptual future Fit terms such as `scheduledFor` / `slotId` are **not** Founder decisions and are not locked here.

**ARCHITECTURE CANDIDATES / Fit-owned:** durable storage of timing; slot vs timestamp representation; eligibility engine; capacity representation; snapshot evolution/migration; projection shapes; notification scheduling; operational release triggers. **IMPLEMENTATION DETAIL:** table/column/API/queue/cron names — out of scope here.

---

## 16. Security/privacy

| Requirement | Classification | Notes |
|---|---|---|
| Authenticated customer checkout preserved | PRODUCT REQUIREMENT | Inherited FD-036H-17 |
| Scheduling does not require new customer PII (no DOB, government ID, new contact details, location history) | PRODUCT REQUIREMENT | §28 Founder mandate |
| Privacy minimization for Scheduled Pickup — no forced Maps/geo/delivery address/serviceability | PRODUCT REQUIREMENT | AC-036I-048; FD-036H-20 inheritance |
| Scheduled Delivery continues existing destination authority only | PRODUCT REQUIREMENT | No extra scheduling PII |
| Server-authoritative commercials / eligibility / authorization | PRODUCT REQUIREMENT | Negative trust on client |
| Ops sees only already-authorized customer information | PRODUCT REQUIREMENT | No PII expansion claimed |
| Delivery fail-closed for Scheduled Pickup | PRODUCT REQUIREMENT | FD-036H-13 / FD-036I-20 |
| BOLA / cross-scope fulfil deny | PRODUCT REQUIREMENT | AC-036I-034 |
| New auth realm / new role by default | NOT_SUPPORTED | Escalate if Fit proves need |

Unresolved security **product** decisions beyond shared OPEN FDs: **NONE**. Mechanism choices remain Fit.

---

## 17. Concurrency/recovery

| Scenario | Required observable outcome | Authority link |
|---|---|---|
| Pre-payment mode/timing switch | Recalculate; coherent destination/fee/timing requirements | US-036I-005; AC-036I-013…015 |
| Selected time invalid before pay | Block pay; recoverable; no silent substitution | US-036I-006; AC-036I-016 |
| Payment pending / bound snapshot | Timing/mode mutation that invalidates snapshot fails safely | AC-036I-029; GJ-PAYMENT-RECOVERY |
| Last available slot race (if capacity in V1) | No double-sell beyond FD-036I-04 policy | AC-036I-042 |
| Duplicate placement retries | Idempotent single Order | AC-036I-023/025 |
| Outlet/merch/hours change after selection (pre-pay) | Payment blocked; recoverable | AC-036I-017/040/041 |
| Payment succeeds but scheduling cannot be honoured | Recovery class per FD-036I-10; no false guarantee | US-036I-012 |
| Post-payment closure / unavailability | No silent rewrite; FD-036I-10 | AC-036I-047 |
| Ops late / customer early-late Pickup | FD-036I-13 policy | AC-036I-036 |
| Provider unavailable near Scheduled Delivery | FD-036I-14 / FD-036I-10 | AC-036I-038 |
| Cancellation/refund | Existing authorities; cutoff FD-036I-09 | AC-036I-039/050 |

Do not invent new retry/idempotency semantics; align to accepted payment/order concurrency authority. Exact mechanisms = Architecture Fit.

---

## 18. Accessibility/responsive expectations

- Supported contexts: existing customer checkout and Ops surfaces on mobile and desktop viewports already targeted by IMP-036B/C/D/H.
- ASAP/Scheduled timing choice, date/time selection, confirmation summaries, cancel/reschedule controls, and Ops handover/delivery controls must be keyboard reachable with visible focus and accessible names.
- Selected date/time state must be communicated programmatically (AC-036I-021/052).
- Error/recovery messages (no times; time unavailable; cutoff deny; payment-pending mutation denied) must be programmatically associated or announced appropriately and must not rely solely on colour.
- If a calendar-style UX is used, this Product Definition requires the **user outcomes** above and does **not** lock a specific calendar library or component.
- TEST-1 planned proof requires component/accessibility assertions **and** real-browser interactive accessibility proof where material. Automated a11y scanning alone does **not** prove the experience (AC-036I-052).

---

## 19. Observability/supportability / analytics

### Supportability

- Ops must identify ASAP vs Scheduled and Delivery vs Pickup at list and detail.
- Support/refund investigation uses existing Order/payment/audit evidence; Scheduled must remain distinguishable.
- Do not require delivery-provider diagnostics for Scheduled Pickup Orders.
- Platform operability retains correlation/logs under existing controls (`PERSONA-PLATFORM-OPERATOR`).

### Analytics requirements (PRODUCT REQUIREMENT — metrics intent; not implementation mechanism)

At minimum, product analytics must be able to report:

```text
orders_by_fulfilment_mode
orders_by_fulfilment_timing
asap_vs_scheduled_mix
pickup_vs_delivery_mix_within_scheduled
scheduled_selected_date_or_window_distribution
scheduled_cancellation_rate
scheduled_reschedule_rate (if self-service exists)
scheduled_fulfilled_on_time_rate
scheduled_fulfilled_late_rate
scheduled_time_unavailability_rejection_reasons
```

Do not invent financial values. Do not introduce tracking PII. Collection/storage/dashboard tooling = Architecture Fit / later analytics capability — not locked here.

---

## 20. Golden Journeys affected

| GJ ID / registry status | Affected steps / downstream behaviour | Mandatory for this acceptance? | Related story / AC IDs | Required proof / actual evidence |
|---|---|---|---|---|
| `GJ-FIRST-ORDER` / CURRENT | **Protect** ASAP Delivery; **extend** for Scheduled Delivery; **protect** ASAP Pickup; **extend** for Scheduled Pickup | YES | AC-036I-001/002/004/008 | Real-browser proof after implementation; result NOT_PERFORMED |
| `GJ-PAYMENT-RECOVERY` / CURRENT | Continuity when payment pending during Scheduled; mutation safety | YES (continuity) | AC-036I-029 | Planned continuity proof |
| `GJ-CANCELLATION-REFUND` / CURRENT | Continuity for Scheduled Orders; cutoff/reschedule policies once resolved | YES (continuity) | AC-036I-039/050 | Planned continuity proof |
| `GJ-ADDRESS-SERVICEABILITY` / CURRENT | Delivery path unchanged for ASAP; Scheduled Delivery still requires serviceability; Scheduled Pickup must not force address | YES | AC-036I-009/048 | Planned |
| `GJ-RETURNING-ORDER` / PARTIAL | May later use Scheduled; no new Order Again semantics in IMP-036I | NO | — | N/A for V1 mandatory |
| Other GJs | No intentional change | NO unless regression risk found | — | Protect if touched |

Registry status is not a test verdict.

---

## 21. Dependencies

| Dependency | Authority / verified state | Required before which story or gate? | Unresolved impact |
|---|---|---|---|
| ROADMAP/STATE activation IMP-036I (PD only) + program pause D-377 | GTM-R148 / STATE-R146 expected tip | SATISFIED for drafting this PD | Gate/Fit/impl still blocked |
| Accepted commerce foundations through IMP-036H | COMPLETE_AND_ACCEPTED through IMP-036H | All stories | NONE for ASAP baselines |
| Founder resolution of FD-036I-01…15 | OPEN | Before Product Definition Gate | Gate NOT ready |
| Product Definition Gate PASS | NOT_PERFORMED | Before Architecture Fit | Blocked |
| Architecture Fit PASS + locked capability | NOT_PERFORMED | Before implementation authorization | Blocked |
| Implementation authorization | NO | Before code/schema | Blocked |
| IMP-037/038/039/040 | HOLD / NOT_ACTIVATED as program context | Must not be accepted/activated by this draft | Preserve freeze; D-377 |

### Architecture Fit handoff questions (explicitly NOT solved here)

All marked **`ARCHITECTURE_FIT_REQUIRED`**. Do **not** answer in Product Definition.

1. Where does fulfilment timing live in mutable Checkout? — `ARCHITECTURE_FIT_REQUIRED`
2. What immutable timing truth belongs in Checkout Snapshot? — `ARCHITECTURE_FIT_REQUIRED`
3. Exact timestamp vs slot aggregate/identifier representation? — `ARCHITECTURE_FIT_REQUIRED`
4. How are future eligible times computed? — `ARCHITECTURE_FIT_REQUIRED`
5. How does Store Hours participate in eligibility? — `ARCHITECTURE_FIT_REQUIRED`
6. Is a scheduling configuration/profile required per Outlet? — `ARCHITECTURE_FIT_REQUIRED`
7. How is capacity represented if product includes it? — `ARCHITECTURE_FIT_REQUIRED`
8. How is concurrency controlled for the last available slot? — `ARCHITECTURE_FIT_REQUIRED`
9. How is pre-payment revalidation performed? — `ARCHITECTURE_FIT_REQUIRED`
10. How is a future action triggered safely (without locking queues/cron/workers here)? — `ARCHITECTURE_FIT_REQUIRED`
11. What mechanism releases Scheduled Pickup prep? — `ARCHITECTURE_FIT_REQUIRED`
12. What mechanism begins Scheduled Delivery booking? — `ARCHITECTURE_FIT_REQUIRED`
13. How are retries/idempotency handled for scheduling side-effects? — `ARCHITECTURE_FIT_REQUIRED`
14. How does scheduling interact with Delivery coordination (ADR-011)? — `ARCHITECTURE_FIT_REQUIRED`
15. How are order/workforce projections extended for timing? — `ARCHITECTURE_FIT_REQUIRED`
16. How are notifications scheduled (ADR-012)? — `ARCHITECTURE_FIT_REQUIRED`
17. What migrations/backfills are needed for historical ASAP Orders? — `ARCHITECTURE_FIT_REQUIRED`
18. How are historical ASAP Orders represented after timing is introduced? — `ARCHITECTURE_FIT_REQUIRED`
19. What new durable architecture decisions (D-number / ADR / ARCH revision), if any, are required? — `ARCHITECTURE_FIT_REQUIRED`

---

## 22. Supported now

| Behaviour | Existing verified or V1 acceptance commitment? | Story / AC IDs / source |
|---|---|---|
| Authenticated Delivery ASAP checkout → pay → Order → delivery fulfil | `CURRENT_SUPPORTED` (must not regress) | AC-036I-001; GJ-FIRST-ORDER |
| Authenticated Pickup ASAP → pay → handover → FULFILLED | `CURRENT_SUPPORTED` (must not regress) | AC-036I-002; IMP-036H |
| Ops Delivery + Pickup ASAP list/accept/fulfil/cancel | `CURRENT_SUPPORTED` | IMP-036D/H |
| Online payment only; no cash/COD | `CURRENT_SUPPORTED` | FD-036H-03; AC-036I-020 |
| FULFILMENT_MODE DELIVERY \| PICKUP | `CURRENT_SUPPORTED` | D-378 / IMP-036H |
| ASAP \| SCHEDULED timing choice | `PLANNED_IMP036I` V1 commitment | US-036I-001…016; AC-036I-003+ |
| Scheduled Pickup / Scheduled Delivery | `PLANNED_IMP036I` | US-036I-002/003 |

Proposed PLANNED behaviour is not accepted until Founder FDs resolve, gates pass, and IMP acceptance occurs.

---

## 23. Explicitly deferred

| `EXPLICITLY_DEFERRED` behaviour | FOLLOW_UP or DEFERRED | Reason / consequence | Revisit dependency / decision owner |
|---|---|---|---|
| Advanced workload/capacity forecasting | DEFERRED / FOLLOW_UP | FD-036I-04 may choose no capacity or simple capacity only | Founder |
| Kitchen preparation lifecycle statuses (PREPARING, READY_FOR_PICKUP, etc.) | DEFERRED | Prefer derived timing unless Founder proves need | Founder |
| Pickup OTP/QR proof | DEFERRED / NOT_SUPPORTED for V1 | IMP-036H default remains | Future decision |
| Customer no-show automatic penalties | DEFERRED | Tied to FD-036I-13 | Founder |
| External calendar integrations | DEFERRED | Out of V1 | Founder |
| AI prep-time prediction / dynamic surge | DEFERRED | Non-goals | Founder |
| Driver shift / kitchen labour scheduling | DEFERRED | Non-goals | Founder |
| Rich analytics dashboards | FOLLOW_UP | Metrics intent only in §19 | Analytics capability |

---

## 24. Not supported by design

| `NOT_SUPPORTED_BY_DESIGN` behaviour | Reason / authority | User-visible boundary / relevant AC |
|---|---|---|
| Recurring orders / subscriptions | Founder out-of-scope | Not offered |
| Catering / event / bulk-order planning | Founder out-of-scope | Not offered |
| Cash on delivery / pay at pickup / COD / deposits / partial payment | FD-036H-03; FD-036I-16; FD-036I-06 unless Founder authorizes pay-later | AC-036I-020 |
| ScheduledOrder / PickupScheduledOrder / DeliveryScheduledOrder aggregates | Product identity; FD-036I-17 | AC-036I-023 |
| Delivery aggregate for Scheduled Pickup | FD-036H-13; FD-036I-20 | AC-036I-006 |
| Calling Scheduled Pickup a form of Delivery | IMP-036H mode peer | AC-036I-005/033 |
| New role by default for scheduling | Permission reuse first | AC-036I-034 |
| Curbside / drive-through / dine-in / lockers | Non-goals | Not offered |
| Customer-selected delivery driver / multi-stop / cross-outlet split | Non-goals | Not offered |
| New payment provider / auth realm / loyalty system | Non-goals | Unchanged |
| New financial-document type for scheduling | D-365/366/367; FD-036I-21 | AC-036I-030 |
| Silent outlet/item/mode/time substitution | BR-036I-008 | AC-036I-016/047 |
| Inventing SCHEDULED/READY/DUE/LATE Order statuses without Founder proof | BR-036I-015 | AC-036I-043 |
| Resolving IMP-037/038 or activating IMP-039/040 via this slice | D-377; AC-036I-049 | Program pause preserved |

---

## 25. Unresolved / FOUNDER DECISIONS REQUIRED

| `UNRESOLVED_DECISION_REQUIRED` item | Material user/business impact | Decision owner / evidence needed | Affected stories / gate |
|---|---|---|---|
| FD-036I-01…15 (see cards below) | Scheduling model, horizon, lead, capacity, promise, pay, seal, reschedule, cancel, recovery, reminder, ops release, late/early, dispatch, paused-vs-future | Founder | Product Definition Gate blocked |

```text
UNRESOLVED_MATERIAL_PRODUCT_DECISIONS: 15
READY_FOR_PRODUCT_DEFINITION_GATE: NO
```

Architecture Fit questions (§21) are **mechanism** questions, not unresolved product decisions.

### Founder decisions register — OPEN material decisions

#### FD-036I-01 — Slot vs exact-time vs hybrid

```text
ID: FD-036I-01
Status: OPEN
question: Should customer-facing Scheduled times be discrete slots, exact customer-selected times, or a hybrid?
why it matters: Defines the entire selection UX, eligibility density, Ops due presentation, and concurrency semantics.
options:
  A) Discrete fulfilment slots (e.g. 6:00–6:30 PM, 6:30–7:00 PM)
  B) Exact customer-selected fulfilment time (e.g. 6:15 PM)
  C) Hybrid (e.g. pick a date + choose from slot list; or exact time snapped to slots)
recommended option: A — discrete slots (simpler capacity, clearer Ops windows, common QSR pattern)
trade-offs: A is less precise for customer; B is flexible but harder for kitchen/dispatch batches; C adds complexity.
impact if deferred: Product Definition Gate cannot pass; date/time UX and many ACs remain ambiguous.
Note: Conceptual Fit terms scheduledFor/slotId are NOT themselves a Founder decision.
```

#### FD-036I-02 — Scheduling horizon

```text
ID: FD-036I-02
Status: OPEN
question: How far ahead may customers schedule, and may Pickup/Delivery/outlet differ?
why it matters: Bounds inventory of selectable dates and outlet planning load.
options:
  A) Same day only
  B) Same day + next day
  C) Rolling N days (Founder picks N)
  D) Calendar-based configurable horizon (possibly per outlet / per mode)
recommended option: B for V1 simplicity, with same horizon for Pickup and Delivery unless outlet config later justified
trade-offs: A too tight for many customers; C/D more flexible but needs config ownership clarity.
impact if deferred: AC-036I-027 and eligibility empty-states cannot be finalized.
Also address: earliest possible scheduled time; latest bookable date; outlet-configurable horizon YES/NO.
```

#### FD-036I-03 — Minimum lead-time model

```text
ID: FD-036I-03
Status: OPEN
question: What minimum lead time makes a future time selectable for Pickup vs Delivery?
why it matters: Prevents impossible “schedule for 5 minutes from now” promises.
options:
  A) Single fixed lead time for all Scheduled Orders
  B) Per-mode lead time (Pickup prep vs Delivery prep+dispatch)
  C) Per-outlet configuration
  D) Other simple product rule defined by Founder
recommended option: B — per-mode lead time (Pickup shorter; Delivery includes dispatch buffer conceptually)
trade-offs: A simplest but inaccurate; C most flexible but needs admin UX; do not encode implementation formulas here.
impact if deferred: AC-036I-026 blocked.
```

#### FD-036I-04 — Capacity in V1

```text
ID: FD-036I-04
Status: OPEN
question: Is per-slot/order capacity part of IMP-036I V1?
why it matters: Determines oversell risk and eligibility empty reasons.
options:
  A) No explicit per-slot capacity in V1 (hours/lead/horizon only)
  B) Configurable order capacity per slot
  C) Advanced workload/capacity model
recommended option: A for V1 (avoid premature complexity); revisit before heavy GTM load
trade-offs: A risks operational overload; B adds config + concurrency; C out of scope.
impact if deferred: AC-036I-042 and last-slot races undefined.
```

#### FD-036I-05 — Customer-facing Scheduled Delivery promise class

```text
ID: FD-036I-05
Status: OPEN
question: What does the displayed Scheduled Delivery time/window mean to the customer?
why it matters: Ambiguity creates false promises and wrong Ops dispatch behaviour.
options:
  A) Expected delivery-arrival / fulfilment window (customer-facing arrival)
  B) Kitchen-ready time
  C) Dispatch-start time
recommended option: A — customer-facing ARRIVAL / FULFILMENT window
trade-offs: A matches customer language; B/C are ops-centric and confuse customers unless carefully translated.
impact if deferred: AC-036I-010 blocked; Delivery Coordinator timing ambiguous.
```

#### FD-036I-06 — Pay now vs pay later

```text
ID: FD-036I-06
Status: OPEN
question: Must Scheduled Orders be paid online now, or may payment occur later?
why it matters: Changes checkout, Order materialization, no-show economics, and refund patterns.
options:
  A) Pay now (online before Order materialization) — preserves accepted checkout/payment
  B) Pay later (not recommended without explicit new payment model)
recommended option: A — PAY NOW
trade-offs: A aligns with FD-036H-03 and Razorpay/snapshot model; B invents deposits/collections risk.
impact if deferred: AC-036I-051 blocked.
Note: Cash/COD remain prohibited by existing authority regardless (FD-036I-16).
```

#### FD-036I-07 — Commercial sealing at purchase

```text
ID: FD-036I-07
Status: OPEN
question: Are item prices, promotions, tax, packaging, and delivery charges sealed at Scheduled purchase?
why it matters: Customers need certainty; future menu/promo changes must not silently reprice paid Orders.
options:
  A) YES — seal at purchase (consistent with accepted Checkout Snapshot immutability)
  B) NO — allow later reprice (not recommended; breaks payment truth)
recommended option: A — YES seal at purchase (RECOMMENDED inheritance from Checkout Snapshot; still needs Founder confirmation for scheduled context)
trade-offs: A may lock promos that later change; B creates disputes and payment mismatch.
impact if deferred: Commercial ACs and refund baselines remain soft.
Do not make legal/tax claims beyond D-365/ADR-007 authority.
```

#### FD-036I-08 — Self-service rescheduling

```text
ID: FD-036I-08
Status: OPEN
question: Does V1 include customer self-service rescheduling of Scheduled Orders?
why it matters: Support load vs product complexity.
options:
  A) YES — self-service within cutoff to eligible replacement times (define commercial effects + change limits)
  B) NO — customer cancels (if allowed) and places a new order; Ops-assisted change only
recommended option: B for deliberately small V1 (cancel + new order), unless Founder prioritizes convenience
trade-offs: A better UX, more edge cases; B simpler, more friction.
impact if deferred: AC-036I-045 blocked.
```

#### FD-036I-09 — Cancellation cutoff

```text
ID: FD-036I-09
Status: OPEN
question: Until when may a customer self-service cancel a Scheduled Order, and does Pickup differ from Delivery?
why it matters: Kitchen/dispatch waste vs customer flexibility; refund expectations.
options:
  A) Cancel anytime until selected time
  B) Cancel until a fixed cutoff before the promise (possibly per mode)
  C) Cancel until operational preparation/release begins (FD-036I-12 linkage)
  D) Other Founder rule (including fees — only if explicit)
recommended option: B — cutoff before promise, possibly stricter for Delivery than Pickup
trade-offs: A maximizes flexibility but wastes prep; C couples to ops release semantics.
impact if deferred: AC-036I-039/046 blocked.
Existing refund money truth remains D-364; no cancellation fee without explicit Founder authorization.
```

#### FD-036I-10 — Post-payment unavailable-order recovery

```text
ID: FD-036I-10
Status: OPEN
question: If a paid Scheduled Order cannot be honoured later, what customer recovery is allowed?
why it matters: Trust, refunds, Ops playbooks; forbids silent substitutions.
options:
  A) Contact customer + offer reschedule (if supported) or cancel+refund
  B) Auto-cancel+refund when unhonourable
  C) Ops-only recovery with mandatory customer notification
  D) Combination policy defined by Founder
recommended option: D — notify customer; prefer reschedule if FD-036I-08 allows else cancel+refund; never silent rewrite
trade-offs: Auto-cancel is blunt; contact-only may be slow without staffing.
impact if deferred: AC-036I-047/038 blocked.
Principles: NO silent outlet/item/mode/time substitution.
```

#### FD-036I-11 — Proactive reminder

```text
ID: FD-036I-11
Status: OPEN
question: Does V1 include a proactive pre-fulfilment reminder notification for Scheduled Orders?
why it matters: Reduces no-shows; adds notification volume and timing policy.
options:
  A) YES — conceptual reminder before the promise (Founder picks lead, e.g. “about 1 hour before”)
  B) NO — confirmation + lifecycle notifications only
recommended option: A — YES simple reminder for V1
trade-offs: A improves show-rate; B simpler. Do not invent a new messaging provider (ADR-012).
impact if deferred: AC-036I-044 reminder clause blocked.
```

#### FD-036I-12 — Operational release / actionability

```text
ID: FD-036I-12
Status: OPEN
question: When do Scheduled Orders become actionable for workforce, and is there an operational release/prep concept?
why it matters: Kitchen/Delivery Coordinator workflow; risk of inventing new Order statuses.
options:
  A) Visible early; actionable from PLACED/ACCEPTED under existing controls; due-soon is presentation only
  B) Visible early; becomes actionable only after an operational release relative to the promise
  C) Requires new lifecycle statuses (SCHEDULED/READY/DUE/LATE) — only if Founder proves need
recommended option: A or B with derived timing cues; avoid C unless evidence requires it
trade-offs: A simplest; B clearer prep gates; C expands lifecycle surface area.
impact if deferred: US-036I-008/009 Ops behaviour blocked.
Prefer timing metadata / derived operational state at product level.
```

#### FD-036I-13 — Late/early Pickup policy

```text
ID: FD-036I-13
Status: OPEN
question: What happens if a customer arrives early or late for Scheduled Pickup, and can they collect after the window?
why it matters: Food quality, Ops fairness, no-show handling.
options:
  A) Early OK within reason; late collect allowed until close / fixed grace; then Ops-assisted
  B) Strict window only; outside window requires Ops exception
  C) Include no-show cancel/penalty policy (only with explicit Founder authorization)
recommended option: A — grace-oriented without V1 penalties (aligns with FD-036H-18 no no-show penalties)
trade-offs: A flexible; B rigid; C needs careful fairness/legal review.
impact if deferred: AC-036I-036 blocked.
Handover verification remains IMP-036H model (no OTP/QR/PIN).
```

#### FD-036I-14 — Delivery dispatch timing model

```text
ID: FD-036I-14
Status: OPEN
question: Relative to the customer promise, when should Delivery execution begin, and what if provider cannot book?
why it matters: Meeting arrival promises; Ops/provider coordination.
options:
  A) Fixed product dispatch lead before promise window
  B) Configurable dispatch lead (outlet/brand)
  C) Consider provider ETA dynamically (more complex)
  D) Founder-defined simple rule combining A/B
recommended option: A or D — initiate sufficiently before arrival window; escalate to FD-036I-10 if provider cannot book
trade-offs: C is powerful but Fit-heavy; A may over/under buffer.
impact if deferred: AC-036I-037/038 blocked.
Mechanism (queue/cron/worker) remains Fit-owned — product states outcome only.
```

#### FD-036I-15 — Current PAUSED vs future slot eligibility

```text
ID: FD-036I-15
Status: OPEN
question: How should temporary current operating PAUSED relate to eligibility of future Scheduled times?
why it matters: A pause now must not incorrectly erase tomorrow’s valid slots; future closures must still remove affected times.
options:
  A) Current PAUSED blocks ASAP and near-term only; future dates use known schedule/exceptions independently
  B) Current PAUSED blocks all Scheduled booking until resumed
  C) Configurable policy per outlet
recommended option: A — distinguish current operating state from known future schedule eligibility
trade-offs: A matches customer expectation; B is safer operationally but over-blocks; C needs admin clarity.
impact if deferred: AC-036I-040 blocked.
Do not design storage for exceptions here.
```

### Founder decisions register — RESOLVED_BY_EXISTING_AUTHORITY

These are **not** newly invented RESOLVED Founder picks for scheduling; they are continuity items already proven by repository authority. Status vocabulary: `RESOLVED_BY_EXISTING_AUTHORITY`.

| FD ID | Decision summary | Status | Existing authority |
|---|---|---|---|
| FD-036I-16 | Online payment only; no cash/COD/pay-at-counter for Scheduled | `RESOLVED_BY_EXISTING_AUTHORITY` | FD-036H-03; accepted checkout/payment |
| FD-036I-17 | Order remains Order; no ScheduledOrder / PickupScheduledOrder / DeliveryScheduledOrder | `RESOLVED_BY_EXISTING_AUTHORITY` | FD-036H-10; IMP-036H product identity; ROADMAP orthogonal model |
| FD-036I-18 | FULFILMENT_MODE remains DELIVERY \| PICKUP peer modes | `RESOLVED_BY_EXISTING_AUTHORITY` | IMP-036H; D-378 / ADR-018 |
| FD-036I-19 | Packaging charge still applies for Pickup (including Scheduled Pickup) | `RESOLVED_BY_EXISTING_AUTHORITY` | FD-036H-08 |
| FD-036I-20 | Scheduled Pickup must not create/use Delivery aggregate; no delivery fee | `RESOLVED_BY_EXISTING_AUTHORITY` | FD-036H-07; FD-036H-13 |
| FD-036I-21 | No new financial-document type; D-365 / D-366 / D-367 continuity | `RESOLVED_BY_EXISTING_AUTHORITY` | DR-20 financial document authorities |
| FD-036I-22 | Program pause D-377 remains authoritative; IMP-037/038 holds preserved | `RESOLVED_BY_EXISTING_AUTHORITY` | D-377; ROADMAP/STATE holds |

Pay-now (FD-036I-06) and commercial sealing (FD-036I-07) remain **OPEN** with recommendations despite strong inheritance signals — Founder confirmation required for scheduled context.

---

## 26. Definition of Ready

| Story ID | Applicable fields complete / evidence | Open material decisions | Readiness / blocker |
|---|---|---|---|
| US-036I-001 | §9 complete; ACs/BRs linked | FD-036I-01…04 | NOT_READY for Gate |
| US-036I-002 | §9 complete | FD-036I-01…03, 13, 15 | NOT_READY for Gate |
| US-036I-003 | §9 complete | FD-036I-01, 05, 14 | NOT_READY for Gate |
| US-036I-004 | §9 complete | FD-036I-02…04, 15 | NOT_READY for Gate |
| US-036I-005 | §9 complete | FD-036I-07 (commercial switch implications) | NOT_READY for Gate |
| US-036I-006 | §9 complete | FD-036I-04 | NOT_READY for Gate |
| US-036I-007 | §9 complete | FD-036I-05 wording | NOT_READY for Gate |
| US-036I-008 | §9 complete | FD-036I-12 | NOT_READY for Gate |
| US-036I-009 | §9 complete | FD-036I-12, 13 | NOT_READY for Gate |
| US-036I-010 | §9 complete | FD-036I-05, 14 | NOT_READY for Gate |
| US-036I-011 | §9 complete | FD-036I-08, 09 | NOT_READY for Gate |
| US-036I-012 | §9 complete | FD-036I-10 | NOT_READY for Gate |
| US-036I-013 | §9 complete | Shared OPEN FDs only | NOT_READY for Gate (shared) |
| US-036I-014 | §9 complete | Shared OPEN FDs only | NOT_READY for Gate (shared) |
| US-036I-015 | §9 complete | FD-036I-06, 07 | NOT_READY for Gate |
| US-036I-016 | §9 complete | FD-036I-02, 04, 15 | NOT_READY for Gate |

`STORY_COMPLETE != IMP_ACCEPTED`. Product Definition Gate precedes Architecture Fit/lock; final implementation readiness requires Gate PASS + Fit + authorization. This PRE-GATE draft is **not** Gate-ready while FD-036I-01…15 remain OPEN.

---

## 27. Product Definition Gate

```text
Document status: PRE-GATE DRAFT
PRE-GATE DRAFT: YES
PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED
Gate Result: NOT_PERFORMED
IMP036I_PRODUCT_DEFINITION: PRE_GATE_DRAFT
IMP036I_PRODUCT_DEFINITION_GATE: NOT_PERFORMED
IMP036I_ARCHITECTURE_FIT: NOT_PERFORMED
IMP036I_ARCHITECTURE_LOCKED: NO
IMP036I_IMPLEMENTATION_AUTHORIZED: NO
IMP036I_STARTED: NO
IMP036I_ACCEPTED: NO
FOUNDER_UAT_STATUS: NOT_PERFORMED
```

```text
PRODUCT_DEFINITION_GATE

Capability: IMP-036I — Scheduled Fulfilment
Product Definition Version: PD-IMP-036I-DRAFT-1
Business Outcome: Defined (§2)
Primary Personas: PERSONA-CUSTOMER; PERSONA-WORKFORCE-OPERATOR (Outlet Manager / Kitchen / Delivery Coordinator contexts); PERSONA-PLATFORM-OPERATOR where config needs it (§4)
Journeys Defined: ASAP protect + Scheduled Pickup/Delivery + switches + Ops (§6)
Story Map Complete: YES (§7) — US-036I-001…016
Acceptance Slice Defined: YES (§8)
Happy Paths Defined: YES (Scheduled Pickup + Scheduled Delivery)
Alternate Paths Defined: YES (empty times, switches, pre-pay invalid, post-pay recovery)
Empty / First-Use States Defined: YES (§12–13)
Error / Recovery Paths Defined: YES
Authorization Variants Defined: YES (§14; AC-036I-034)
Cross-Scope Scenarios Defined: YES (Ops scope deny; Delivery fail-closed on Pickup)
Concurrency Considered: YES (§17)
Destructive Actions Defined: YES (cancel/refund; reschedule policy OPEN)
UX State Matrix Complete: YES (§13)
Accessibility Considered: YES (§18; AC-036I-021/052 mandatory)
Golden Journeys Identified: YES (§20)
Explicit Deferrals Recorded: YES (§23–24)
Unresolved Product Decisions: 15 (FD-036I-01…15 OPEN)
Architecture Conflicts: NONE identified at product layer; Fit questions handed off unanswered
PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED
Gate Result: NOT_PERFORMED
READY_FOR_PRODUCT_DEFINITION_GATE: NO
```

Product Definition Gate must **not** be executed until Founder resolves FD-036I-01…15 (or explicitly defers specific items out of V1 with recorded consequence). Gate PASS would still not perform Architecture Fit, lock architecture, authorize implementation, or accept IMP-036I.

```text
CURRENT tip anchors (this draft): GTM-R148 / STATE-R146
acceptedThrough = IMP-036H
currentProductSlice = IMP-036I
pendingAcceptance = NONE
nextProductSlice = IMP-037
PROGRAM_PAUSE = D-377
```

---

## Appendix A — Explicit non-goals (IMP-036I)

```text
recurring orders
subscriptions
catering / event ordering
bulk-order planning
driver shift scheduling
kitchen labour scheduling
advanced forecast engine
AI prep-time prediction
dynamic marketplace surge pricing
customer-selected delivery driver
multi-stop orders
cross-outlet split orders
scheduled cash payment / COD / pay-at-counter
deposit / partial payment (unless Founder later authorizes)
external calendar integrations
ScheduledOrder / PickupScheduledOrder / DeliveryScheduledOrder aggregates
new financial-document type
new authentication realm
new loyalty system
new roles by default
OTP/QR/PIN Pickup proof (unless Founder changes IMP-036H)
silent outlet / item / mode / time substitution
resolving IMP-037 / IMP-038
activating IMP-039 / IMP-040
closing GAP-EXT-ASSESS-001
locking schema / APIs / queues / cron / workers / DB design in this draft
```

---

## Appendix B — Program pause / assessment posture (context only)

```text
PROGRAM_PAUSE_AUTHORITY = D-377
acceptedThrough: IMP-036H
currentProductSlice: IMP-036I
pendingAcceptance: NONE
nextProductSlice: IMP-037

IMP037: HOLD / BLOCKED_PROVIDER_ACCESS
IMP037_IMPLEMENTATION_COMPLETE: NO
IMP037_ACCEPTED: NO

IMP038: HOLD / IMPLEMENTATION_COMPLETE / NOT_ACCEPTED
IMP038_EXTERNAL_ASSESSMENT: DEFERRED_UNTIL_PRE_GTM_APPLICATION_SCOPE_STABILIZES
IMP038_FROZEN_RUNTIME_HEAD: dc6b19e6f88d4084e424d927e6467c374596fb0a
  (historical evidence only; do not deploy this PD onto that runtime as assessment proof)
GAP-EXT-ASSESS-001: NOT closed by this draft

IMP039: NOT_ACTIVATED / HOLD
IMP040: NOT_ACTIVATED / HOLD
```

Activation of IMP-036I for Product Definition does not accept IMP-037/038, activate IMP-039/040, or reopen IMP-038 implementation.

---

## Appendix C — Classification reminder

```text
PRODUCT REQUIREMENT     — binding user/business promise in this draft (subject to Gate; OPEN FDs excepted)
ARCHITECTURE CANDIDATE  — Fit hypothesis; not locked
IMPLEMENTATION DETAIL   — forbidden inventiveness in this artifact (schema/API/queues/cron/workers/UI widgets)
ARCHITECTURE_FIT_REQUIRED — mechanism question handed to Fit; unanswered here
RESOLVED_BY_EXISTING_AUTHORITY — continuity proven by repository; not a new Founder pick
OPEN                    — recommendation allowed; Gate blocked until Founder resolves
```

---

## Appendix D — Inherited ASAP / Pickup / Delivery continuity checklist

```text
Preserve ASAP Delivery path (non-regression)
Preserve ASAP Pickup path (IMP-036H non-regression)
Preserve FULFILMENT_MODE = DELIVERY | PICKUP
Preserve online payment only (FD-036H-03)
Preserve packaging for Pickup (FD-036H-08)
Preserve no Delivery aggregate / no delivery fee for Pickup (FD-036H-07/13)
Preserve order.fulfil handover model without OTP/QR/PIN (FD-036H-12/23)
Preserve D-365 / D-366 / D-367 financial document continuity
Preserve D-377 program pause
Present Scheduled times in outlet local timezone
Order remains Order — timing is orthogonal metadata/commitment, not a new aggregate
```
