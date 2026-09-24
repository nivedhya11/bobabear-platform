<!-- governance-meta
{
  "status": "DRAFT_READY_FOR_GATE",
  "authority": "PRODUCT_DEFINITION",
  "capability": "IMP-036I",
  "productDefinitionVersion": "PD-IMP-036I-DRAFT-3",
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
  "imp036iProductDefinition": "DRAFT_READY_FOR_GATE",
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
  "founderDecisionsOpen": 0,
  "founderDecisionsResolvedByExistingAuthority": 7,
  "unresolvedProductDecisions": 0,
  "preGateDraft": "NO",
  "documentStatus": "DRAFT_READY_FOR_GATE",
  "readyForProductDefinitionGate": "YES",
  "programPause": "D-377"
}
-->

# IMP-036I — Scheduled Fulfilment

## Product Definition (DRAFT READY FOR GATE — Product Definition Gate NOT_PERFORMED)

```text
Document status: DRAFT_READY_FOR_GATE
PRODUCT_DEFINITION_VERSION: PD-IMP-036I-DRAFT-3
PRE-GATE DRAFT: NO
CAPABILITY: IMP-036I
TITLE: Scheduled Fulfilment
AUTHORITY: PRODUCT_DEFINITION
PROCESS: PD-1
VERIFICATION_POLICY: TEST-1

PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED
Gate Result: NOT_PERFORMED
IMP036I_PRODUCT_DEFINITION: DRAFT_READY_FOR_GATE
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
  founder_decisions_open: 0
  founder_decisions_resolved_by_existing_authority: 7
  founder_decisions_resolved_by_founder: 15 (FD-036I-01 … FD-036I-15)
  UNRESOLVED_MATERIAL_PRODUCT_DECISIONS: 0
  OPEN_FOUNDER_DECISIONS: 0
  RESOLVED_BY_EXISTING_AUTHORITY: 7 (FD-036I-16 … FD-036I-22)
  FOUNDER_RESOLVED_DATE: 2026-09-24
  FD-036I-09_AMENDMENT: Founder-approved binding V1 cancellation-cutoff defaults/range/scope
    + per-Order sealing / checkout revalidation (amended 2026-09-24)

PRODUCT_DEFINITION_GATE_READY: YES — Founder FD-036I-01…15 resolved 2026-09-24
  (including FD-036I-09 sealing amendment); Product Definition Gate remains NOT_PERFORMED
  for CURRENT DRAFT-3 (not Gate PASS / not APPROVED)

stories: 16
acceptance_scenarios: 66
business_rules: 19
architecture_fit_questions: 19

Canonical tip AFTER DRAFT-2 Gate STOP remediation / DRAFT-3 gate-ready tip (write as CURRENT
in this draft — verify against ROADMAP/STATE; this Product Definition is NOT lifecycle authority):
  acceptedThrough = IMP-036H
  currentProductSlice = IMP-036I
  pendingAcceptance = NONE
  nextProductSlice = IMP-037
  IMP036I_ACTIVATED = YES
  IMP036I_PRODUCT_DEFINITION = DRAFT_READY_FOR_GATE
  IMP036I_PRODUCT_DEFINITION_GATE = NOT_PERFORMED
  IMP036I_ARCHITECTURE_FIT = NOT_PERFORMED
  IMP036I_ARCHITECTURE_LOCKED = NO
  IMP036I_IMPLEMENTATION_AUTHORIZED = NO
  IMP036I_STARTED = NO
  IMP036I_IMPLEMENTATION_STARTED = NO
  IMP036I_IMPLEMENTATION_COMPLETE = NO
  IMP036I_ACCEPTED = NO
  ROADMAP = GTM-R151
  STATE = STATE-R149
  ARCHITECTURE = ARCH-R22
  decision-register = DR-20
  PROGRAM_PAUSE = D-377

Formal lifecycle for IMP-036I: PLANNED (activated for Product Definition only)
```

This artifact is the **DRAFT READY FOR GATE** Product Definition candidate for
`PD-IMP-036I-DRAFT-3`. Founder decisions FD-036I-01…15 are resolved (2026-09-24),
including the Founder-approved FD-036I-09 amendment binding V1 cancellation-cutoff
defaults, range, Brand-level scope, **per-Order sealing**, and **pre-payment checkout
revalidation**. It persists product requirements for Scheduled Fulfilment without
executing the Product Definition Gate against CURRENT DRAFT-3, Architecture Fit,
architecture lock, implementation authorization, implementation start, or IMP-036I
acceptance.

```text
Founder decision RESOLVED
  !=
Product Definition Gate PASS
  !=
Architecture Fit PASS
  !=
architecture LOCKED
  !=
implementation AUTHORIZED
  !=
APPROVED
```

```text
IMP036I_ACTIVATED: YES
  (ROADMAP / STATE activation for Product Definition only)
  +
Product Definition: DRAFT_READY_FOR_GATE
  !=
Product Definition Gate PASS
  !=
Architecture Fit PASS
  !=
APPROVED
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

Lifecycle truth remains ROADMAP/STATE only. CURRENT tip for this DRAFT_READY_FOR_GATE draft
(this Product Definition is **not** lifecycle authority):

```text
acceptedThrough = IMP-036H
currentProductSlice = IMP-036I
pendingAcceptance = NONE
nextProductSlice = IMP-037

IMP036H: COMPLETE_AND_ACCEPTED
IMP036I_ACTIVATED: YES
IMP036I_PRODUCT_DEFINITION: DRAFT_READY_FOR_GATE (PD-IMP-036I-DRAFT-3)
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
ROADMAP = GTM-R151
STATE = STATE-R149
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
| Product Definition version / document status | `PD-IMP-036I-DRAFT-3`; **Document status: DRAFT READY FOR GATE**; **PRE-GATE DRAFT: NO**; **READY_FOR_PRODUCT_DEFINITION_GATE: YES** |
| Product owner / approval evidence | Founder. Activation authorized for Product Definition only. Founder decisions FD-036I-01…15 **RESOLVED** 2026-09-24 (including FD-036I-09 sealing amendment). Product Definition Gate for CURRENT DRAFT-3 **NOT_PERFORMED** (not APPROVED / not Gate PASS). Historical DRAFT-1 Gate = **STOP**; historical DRAFT-2 Gate = **STOP** (see §1.1). |
| Process / verification policy | `PD-1` / `TEST-1` |
| Canonical anchors | VISION-1; ROADMAP GTM-R151; STATE STATE-R149; ARCH-R22; DR-20 (D-377, D-378); PD-1; TEST-1; PERSONA-1; GJ-1; accepted IMP-036H Product Definition `PD-IMP-036H-DRAFT-1`; Founder FD-036I-01…15 resolution 2026-09-24; FD-036I-09 sealing amendment 2026-09-24 |
| Repository candidate | Canonical path `/home/ajoshi/repos/boba-bear-platform`; exact HEAD/tree recorded at activation/PR time — verify against CURRENT tip |
| Capability lifecycle / authorization | ROADMAP/STATE: `IMP036I_ACTIVATED: YES`; `currentProductSlice = IMP-036I`; formal lifecycle **PLANNED**; Product Definition **DRAFT_READY_FOR_GATE** (`PD-IMP-036I-DRAFT-3`); Gate for CURRENT DRAFT-3 **NOT_PERFORMED**; Architecture Fit **NOT_PERFORMED**; architecture **NOT_LOCKED**; implementation **NOT_AUTHORIZED** / **NOT_STARTED**; `IMP036I_ACCEPTED: NO`; `pendingAcceptance = NONE`; `acceptedThrough = IMP-036H`; `nextProductSlice = IMP-037` |
| Relevant capability architecture / ADRs | Foundations: ADR-008; ADR-011; ADR-007; ADR-012; ADR-018 / D-378 (fulfilment mode); D-365 / D-366 / D-367 (financial documents); D-357; D-361–D-364 (payment/refund); D-377 (program pause). No IMP-036I capability lock yet. |
| Founder UAT applicability | `FOUNDER_UAT_REQUIRED = YES`; `FOUNDER_UAT_STATUS = NOT_PERFORMED` — materially changes customer checkout timing and workforce operational timing when implemented |

### 1.1 Draft history — Product Definition Gate

CURRENT candidate is `PD-IMP-036I-DRAFT-3`. Gate execution against CURRENT DRAFT-3 is
**NOT_PERFORMED**. Do **not** treat DRAFT-1 or DRAFT-2 as Gate PASS. Historical blocks
below are bounded evidence only — they must not contaminate CURRENT status evaluation.

#### Historical — `PD-IMP-036I-DRAFT-1` (Gate STOP)

<!-- historical-gate-evidence:begin PD-IMP-036I-DRAFT-1 -->
```text
PRODUCT_DEFINITION_VERSION: PD-IMP-036I-DRAFT-1
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: STOP
Evidence: PR review 5305796113
Candidate HEAD: b0dd82c053520cd888b469666e1dc0c3a08dff4d
Candidate TREE: d4c5e1f862a95f96bd79fb07ee50bba439967161
WORKING_TREE_FINGERPRINT: 55327c21df1e41ba330061ea658732d408a8c735682e02ed7f651269a7877f7f

STOP findings (DRAFT-1):
  1. Cancellation cutoff policy incomplete (FD-036I-09 lacked binding V1 defaults,
     allowed range, Brand-level scope, and deterministic boundary semantics)
  2. Draft-ready consistency insufficiently strict (separate scripts work; not remediated
     by this Product Definition content alone)

DRAFT-1 is historical STOP evidence only — not PASS, not APPROVED, not CURRENT.
Remediation into PD-IMP-036I-DRAFT-2 (later also STOPPED) persisted Founder-approved
FD-036I-09 defaults/range/scope (BR-036I-019).
```
<!-- historical-gate-evidence:end PD-IMP-036I-DRAFT-1 -->

#### Historical — `PD-IMP-036I-DRAFT-2` (Gate STOP)

<!-- historical-gate-evidence:begin PD-IMP-036I-DRAFT-2 -->
```text
PRODUCT_DEFINITION_VERSION: PD-IMP-036I-DRAFT-2
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: STOP
Evidence: PR review 5306341697
Candidate HEAD / main: 421fc76869812384df2018b9ffae86de4c33cdc3
Candidate TREE: ba33220c06beede81af9fe15ea053df01e470503
WORKING_TREE_FINGERPRINT: eeeed322c8bbe799c7fc245553d5585210108b797226ded9a84f105d0d3ef8fd

STOP findings (DRAFT-2):
  A. Product: existing paid Scheduled Orders did not define whether later Brand cutoff
     changes retroactively alter cancellation eligibility
  B. Consistency: historical DRAFT-1 removal truncated content after the historical heading
  C. Consistency: version check accepted DRAFT-2 when only one Product Definition version
     authority agreed

DRAFT-2 is historical STOP evidence only — not PASS, not APPROVED, not CURRENT.
Remediation into PD-IMP-036I-DRAFT-3 seals per-Order cancellation cutoff from the
payment-bound Checkout Snapshot and requires stale-checkout revalidation (FD-036I-09 /
BR-036I-019 amended 2026-09-24).
```
<!-- historical-gate-evidence:end PD-IMP-036I-DRAFT-2 -->

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
| Cash / COD / pay-at-counter / pay-later deposits | `NOT_SUPPORTED` | FD-036I-06 PAY NOW; cash/COD remain prohibited by FD-036H-03 / FD-036I-16 |

---

## 4. Primary personas

| Persona ID | Responsibility / goal in this slice | Context / evidence |
|---|---|---|
| `PERSONA-CUSTOMER` (primary) | Choose ASAP or Scheduled; select eligible future slot; complete authenticated checkout; understand confirmation/history; cancel before cutoff (no self-service reschedule) | [personas.md](../personas.md) PERSONA-1; VISION direct-order customer; IMP-036B/C/H |
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
> I select a supported future slot in the outlet's local timezone, pay online now against a sealed
> commercial result, and see clear confirmation and history.
> As Ops, I can see Scheduled Orders early, know when they are due, and fulfil Pickup or Delivery
> under the existing Order lifecycle without a separate Scheduled Order type.

| Journey ID | Entry / context | Ordered activities | Success / downstream outcome | Alternate / recovery paths |
|---|---|---|---|---|
| `JOURNEY-I-A-ASAP-DELIVERY` (protect) | Auth checkout; Delivery + ASAP | Existing Delivery ASAP path | No Scheduled regression | Existing payment/serviceability recovery |
| `JOURNEY-I-B-ASAP-PICKUP` (protect) | Auth checkout; Pickup + ASAP | Existing ASAP Pickup path (IMP-036H) | No Scheduled regression | Existing outlet/eligibility recovery |
| `JOURNEY-I-C-SCHED-PICKUP` | Pickup + Scheduled | Choose Scheduled → browse eligible TODAY/TOMORROW slots → select → review (outlet + timing + sealed commercials, no delivery fee) → PAY NOW → confirmation → Ops see due window → handover → FULFILLED | Scheduled Pickup Order without Delivery aggregate | No times; time unavailable; cancel before cutoff (no self-service reschedule); late/early per FD-036I-13 |
| `JOURNEY-I-D-SCHED-DELIVERY` | Delivery + Scheduled | Choose Scheduled → destination/serviceability → eligible TODAY/TOMORROW slots → select → review (destination + arrival/fulfilment window + sealed commercials) → PAY NOW → confirmation → Ops/Delivery Coordinator act relative to arrival promise → delivery fulfilment | Scheduled Delivery under existing Delivery path | Serviceability fail; no times; provider unavailable near slot; recovery per FD-036I-10 (notify + cancel/refund + new Order) |
| `JOURNEY-I-E-NO-TIMES` | Scheduled chosen; zero eligible times | Attempt continue | Clear unavailable; ASAP may remain if valid; no invented time | Switch to ASAP; change mode; modify cart; exit |
| `JOURNEY-I-F-TIMING-MODE-SWITCH` | Pre-payment | Switch ASAP↔Scheduled and/or Delivery↔Pickup | Full revalidation + commercial recalculation | Incomplete destination after switch to Delivery; eligibility failures |
| `JOURNEY-I-G-PREPAY-INVALID` | Selected time becomes invalid before pay | Attempt pay | Block pay; recoverable; no silent substitution of time/outlet/items/mode | Choose another time; ASAP; cancel checkout |
| `JOURNEY-I-H-POSTPAY-UNAVAILABLE` | Paid Scheduled Order; future becomes unhonourable | System/ops detect unavailability | Customer recovery per FD-036I-10: notify + cancel/refund + allow new Order; no silent rewrite of promise | No in-place reschedule; Ops may assist cancel/refund + separate replacement |
| `JOURNEY-I-OPS-LIST` | Authorized Ops | Open Ops list | Every Order badges mode + timing (ASAP vs Scheduled + due window when Scheduled) | Unauthorized deny |
| `JOURNEY-I-OPS-SCHED-DETAIL` | Scheduled Order | Open detail | Shows mode, timing promise, outlet/destination as applicable; Pickup without rider chrome; Delivery without inventing Pickup fields | Unauthorized deny |
| `JOURNEY-I-OPS-PICKUP-HANDOVER` | Scheduled Pickup ACCEPTED | Handed to customer / Mark as picked up | → FULFILLED; IMP-036H verification model (no OTP/QR/PIN) | Early/late policy per FD-036I-13 |
| `JOURNEY-I-OPS-DELIVERY-EXEC` | Scheduled Delivery | Delivery Coordinator / Ops initiates delivery relative to promised window | Existing Delivery fulfilment outcomes | Provider cannot book → recovery per FD-036I-14 / FD-036I-10 |

### Customer promise — Scheduled (product level)

| Concern | Product promise (mechanism = Fit) |
|---|---|
| How customer chooses Scheduled | Explicit timing choice peer to ASAP during authenticated checkout after (or with) fulfilment mode; clear labels ASAP vs Scheduled |
| Dates/times presentation | Eligible discrete fulfilment slots in **outlet local timezone** (e.g. 6:00–6:30 PM); TODAY + TOMORROW horizon; not server-TZ raw; slot representation = Architecture Fit |
| What makes a time selectable | Outlet active + known future schedule eligibility + mode eligibility (Pickup enabled / Delivery serviceable) + merchandise fulfilable + per-mode min lead + within TODAY/TOMORROW horizon + not closed by known future exception — **NOT** per-slot capacity (FD-036I-04 NO capacity engine in V1) |
| No times available | Clear empty state; do not invent slots; ASAP and/or other mode may remain if valid |
| Review | Mode, timing promise (Delivery = arrival/fulfilment window), outlet or destination, sealed commercials, packaging, delivery fee only when Delivery |
| Payment | Online **PAY NOW** (FD-036I-06); preserve Razorpay, payment before Order materialization, zero-payable where applicable; no cash/COD/pay later/deposit/partial |
| Confirmation | States Scheduled + mode + timing + location/destination summary |
| History/detail | Distinguishes ASAP vs Scheduled; shows timing promise; Pickup has no delivery tracking |
| Cancellation | Binding V1 cutoff (FD-036I-09 / BR-036I-019): SCHEDULED PICKUP default **30 minutes** before selected slot start; SCHEDULED DELIVERY default **60 minutes** before selected slot start; Brand-level config per fulfilment mode (Pickup minutes / Delivery minutes independently); allowed range **0–240** inclusive; V1 Outlet override **NO**; cutoff instant = `slot_start − sealed_cutoff_minutes` (outlet local-time semantics). **Sealing:** for every successfully purchased Scheduled Order, the effective cutoff minutes are sealed from the payment-bound Checkout Snapshot (Brand + fulfilment mode policy evaluated for that Snapshot) and are **immutable** for that Order — later Brand config changes MUST NOT shorten, extend, grant, remove, or otherwise alter that Order’s self-service cancellation right; later Brand changes affect future eligible purchase attempts only. **Checkout revalidation:** before a payment attempt becomes bound to a Checkout Snapshot, currently effective cancellation policy must be revalidated; if Brand/mode cutoff changed since the customer last reviewed checkout, stale checkout must not silently continue — updated terms must be shown and reconfirmed. Once payment-bound, that Snapshot’s cutoff is immutable for that attempt; success → Order inherits sealed value; fail/expire/abandon → next payment attempt re-evaluates current Brand/mode policy. Self-service cancel allowed **ONLY BEFORE** sealed cutoff (and otherwise eligible); **AT OR AFTER** cutoff denied with support/Outlet recovery guidance; V1 **NO** cancellation/penalty fee; **0 minutes** = cancel allowed before slot start, unavailable at/after slot start; no fuzzy/grace in cancellation cutoff (does **not** change FD-036I-13 early/late Pickup grace). **Customer-facing terms:** before purchase, checkout must communicate the applicable cancellation cutoff meaningfully (e.g. “Free cancellation until 5:30 PM” or equivalent derived from selected slot + effective cutoff); exact copy/design = UX Fit. Deterministic product evidence only (not hard-coded system values): Pickup slot 18:00–18:30 → cutoff 17:30; Delivery same slot → cutoff 17:00 under defaults. Architecture Fit owns storage/admin/snapshot/CAS/retry mechanism and **must not** change this business outcome. |
| Reschedule | **NO** customer self-service rescheduling in V1 (FD-036I-08); another time → cancel (if permitted) + new Order |
| Time becomes unavailable | Pre-pay: block + recover; post-pay: notify + cancel/refund + allow new Order; no silent substitution (FD-036I-10) |
| Reminders | Confirmation required; one proactive pre-fulfilment reminder (~30 min before window; skip if ordered inside reminder window); mode-aware wording (FD-036I-11) |
| Late fulfilment | Grace-oriented (FD-036I-13): EARLY window remains promise / may hand over early if ready + IMP-036H verification; LATE no automatic no-show cancel/fee; Delivery late uses existing + arrival promise honesty |
| Pickup vs Delivery differences | Pickup: outlet collect, no destination/fee/Delivery aggregate, IMP-036H handover. Delivery: destination + serviceability, Delivery path, customer-facing promise = ARRIVAL/FULFILMENT WINDOW (FD-036I-05) |

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
| Cancel / no self-service reschedule | `PERSONA-CUSTOMER` | H + cancel | Cancel before cutoff; no self-service reschedule | `US-036I-011` | `V1_ACCEPTANCE_SLICE` |
| Post-payment unavailability | `PERSONA-CUSTOMER` + Ops | H | Notify + cancel/refund + new Order; no silent rewrite | `US-036I-012` | `V1_ACCEPTANCE_SLICE` |
| Mobile scheduled ordering | `PERSONA-CUSTOMER` | C/D | Mobile-usable date/time selection | `US-036I-013` | `V1_ACCEPTANCE_SLICE` |
| Accessible date/time selection | `PERSONA-CUSTOMER` | C/D | Keyboard/SR/error association | `US-036I-014` | `V1_ACCEPTANCE_SLICE` |
| Commercial + payment sealing | `PERSONA-CUSTOMER` | C/D | PAY NOW; commercials sealed at purchase | `US-036I-015` | `V1_ACCEPTANCE_SLICE` |
| Platform/config operability | `PERSONA-PLATFORM-OPERATOR` / workforce config context | Config | Scheduling eligibility inputs + Brand-level Pickup/Delivery cancellation cutoffs (0–240; no Outlet override V1) operable without inventing RBAC | `US-036I-016` | `V1_ACCEPTANCE_SLICE` (bounded) |
| Recurring / subscriptions / catering | — | — | — | — | `NOT_SUPPORTED` |
| Cash/COD / pay-later deposits | — | — | — | — | `NOT_SUPPORTED` (FD-036I-06 PAY NOW) |

---

## 8. Acceptance slice

| Slice | Mandatory story IDs | Mandatory AC IDs | Required Golden Journeys | Observable acceptance boundary |
|---|---|---|---|---|
| `V1_ACCEPTANCE_SLICE` | `US-036I-001` … `US-036I-016` | `AC-036I-001` … `AC-036I-066` (all mandatory YES; Founder FD-036I-01…15 resolved incl. FD-036I-09 sealing amendment) | `GJ-FIRST-ORDER` ASAP Delivery + ASAP Pickup non-regression; Scheduled Pickup + Scheduled Delivery extensions; `GJ-PAYMENT-RECOVERY`; `GJ-CANCELLATION-REFUND` continuity | Customer completes Scheduled Pickup and Scheduled Delivery with correct mode×timing×commercial/privacy outcomes; Ops fulfils both; ASAP remains green; no Delivery aggregate for Scheduled Pickup; Brand cancellation-cutoff policy + per-Order sealing proven per BR-036I-019 |
| `FOLLOW_UP` | Capacity advanced models; UX polish beyond mandatory clarity; optional calendar flourishes | As defined later | N/A unless GJ impacted | Not silently required for V1 |
| `DEFERRED` | Recurring; subscriptions; catering; labour/driver shift scheduling; AI prep prediction | N/A | N/A | Explicit non-goals |

Disposition vocabulary for §§22–25: `SUPPORTED_NOW`, `EXPLICITLY_DEFERRED`,
`NOT_SUPPORTED_BY_DESIGN`, `UNRESOLVED_DECISION_REQUIRED` (**active unresolved count = 0**).

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
Dependencies: Accepted IMP-036B/C/H checkout; FD-036I-01…04 RESOLVED (discrete slots; TODAY+TOMORROW; per-mode lead; no capacity)
Explicit non-goals: Recurring schedules; inventing ScheduledOrder
Data implications: Order exposes fulfilment timing (product requirement). Durable placement = Architecture Fit
Security implications: Preserve authenticated checkout; no anonymous Scheduled
Architecture fit / applicable invariants: ARCHITECTURE_FIT_REQUIRED — where timing lives in Checkout/Snapshot; slot representation = Fit
Open material decisions: NONE
Readiness: READY for Product Definition Gate (product decisions resolved); NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + authorization
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
Dependencies: IMP-036H Pickup rules; FD-036I-01…05, FD-036I-13, FD-036I-15 RESOLVED
Explicit non-goals: OTP/QR/PIN; Delivery aggregate; inventing pickup destination as delivery address
Data implications: Paid snapshot binds mode=PICKUP + timing + outlet immutably (product requirement)
Security implications: Privacy minimization — no forced delivery address/GPS/Maps for Scheduled Pickup
Architecture fit / applicable invariants: Timing bind to snapshot; outlet profile; eligibility computation
Open material decisions: NONE
Readiness: READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + authorization
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
UX states: Destination + date/time; review shows ARRIVAL/FULFILMENT WINDOW wording (FD-036I-05)
Permission / resource context: Existing Delivery destination authority
Error / recovery: Unserviceable; no times; future serviceability deny; recoverable
Dependencies: ADR-011 / accepted Delivery; FD-036I-05, FD-036I-14 RESOLVED
Explicit non-goals: Customer-selected driver; multi-stop; marketplace surge
Data implications: Paid snapshot binds mode=DELIVERY + timing + destination; Delivery path retained
Security implications: Existing destination PII rules; no extra scheduling PII
Architecture fit / applicable invariants: Future serviceability evaluation; dispatch backward from arrival = Fit
Open material decisions: NONE
Readiness: READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + authorization
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
Dependencies: FD-036I-02, FD-036I-03, FD-036I-04, FD-036I-15 RESOLVED
Explicit non-goals: Silent fallback to a hidden default slot; capacity-based empty reasons in V1
Data implications: N/A durable Order until payment
Security implications: Do not leak internal closure reasons beyond customer-safe messaging
Architecture fit / applicable invariants: Eligibility composition = Fit (no V1 capacity engine)
Open material decisions: NONE
Readiness: READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + authorization
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
Dependencies: IMP-036H mode-switch rules; FD-036I-07 commercials sealed at purchase (pre-pay switches recalculate)
Explicit non-goals: Post-payment silent mode/timing rewrite
Data implications: Delivery-only information must not affect Pickup commercial result after switch
Security implications: Server re-evaluation required
Architecture fit / applicable invariants: Conditional destination + timing without corrupting history
Open material decisions: NONE
Readiness: READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + authorization
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
Dependencies: Payment-pending mutation safety foundations; FD-036I-04 NO capacity engine (no last-slot capacity races to design)
Explicit non-goals: Inventing a new payment recovery model; per-slot capacity contention
Data implications: Revalidate before payment bind
Security implications: Prevent commercial/timing tampering
Architecture fit / applicable invariants: Pre-payment revalidation (eligibility without capacity gating)
Open material decisions: NONE
Readiness: READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + authorization
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
Dependencies: FD-036I-05 (Delivery ARRIVAL/FULFILMENT WINDOW wording); IMP-036H Pickup display fields
Explicit non-goals: Rider ETA chrome on Pickup; inventing new Order status labels as lifecycle states
Data implications: Customer-facing timing promise must be projectable
Security implications: Do not expose unauthorized Ops internals
Architecture fit / applicable invariants: Fulfilment-aware + timing-aware projections
Open material decisions: NONE
Readiness: READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + authorization
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
UX states: List badge (mode + Scheduled + due); detail ready; derived cues Scheduled / Due soon / Overdue (not new Order statuses)
Permission / resource context: Existing Ops order permissions; no new role by default
Error / recovery: Unauthorized deny
Dependencies: FD-036I-12 RESOLVED — visible immediately after purchase; may acknowledge/accept before window; lifecycle PLACED→ACCEPTED→FULFILLED|CANCELLED
Explicit non-goals: Inventing SCHEDULED/READY/DUE/LATE Order statuses
Data implications: Timing metadata / derived operational presentation (product requirement)
Security implications: Server-enforced authorization; BOLA/scope deny
Architecture fit / applicable invariants: Projection extensions; operational release mechanics = Fit
Open material decisions: NONE
Readiness: READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + authorization
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
Dependencies: FD-036H-12/23 inheritance; FD-036I-13 RESOLVED (grace-oriented early/late; no V1 no-show fee)
Explicit non-goals: New PickupProof; PREPARING/READY_FOR_PICKUP; OTP/QR/PIN/gov ID
Data implications: Handover → existing FULFILLED; audit preserved
Security implications: Authorization server-enforced
Architecture fit / applicable invariants: Confirm order.fulfil coverage; prep-release mechanism = Fit
Open material decisions: NONE
Readiness: READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + authorization
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
Dependencies: ADR-011; FD-036I-05, FD-036I-14 RESOLVED (outcome-first; begin early enough for arrival window)
Explicit non-goals: Driver shift scheduling; customer-selected driver; PD-prescribed cron/ETA algorithm
Data implications: Delivery aggregate only for Delivery Orders
Security implications: Existing provider credential boundaries
Architecture fit / applicable invariants: Dispatch/booking timing mechanism = Fit; failure → FD-036I-10 recovery
Open material decisions: NONE
Readiness: READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + authorization
```

### US-036I-011 — Customer cancellation (no self-service reschedule)

```text
Story ID: US-036I-011
As a PERSONA-CUSTOMER
I want clear cancellation outcomes for Scheduled Orders (no self-service reschedule)
So that I can cancel when still eligible under my Order’s sealed cutoff, or understand
  when self-service is closed
Preconditions: Paid Scheduled Order; relative to that Order’s sealed cancellation cutoff
  (FD-036I-09 / BR-036I-019: sealed from payment-bound Checkout Snapshot; Pickup default 30 /
  Delivery default 60; 0–240; outlet local time; later Brand changes do not mutate this Order)
Acceptance scenarios: AC-036I-039, AC-036I-045, AC-036I-046, AC-036I-053, AC-036I-054,
  AC-036I-055, AC-036I-059, AC-036I-060, AC-036I-061, AC-036I-062, AC-036I-063
Business rules: BR-036I-018, BR-036I-019
UX states: Cancel confirm; cutoff denied (at/after) + support/Outlet recovery guidance;
  no self-service reschedule path
Permission / resource context: Existing cancellation/refund permissions
Error / recovery: AT OR AFTER sealed cutoff → clear deny + support/Outlet recovery guidance;
  V1 NO cancellation/penalty fee; no fuzzy/grace on cancellation cutoff
Dependencies: FD-036I-08 NO self-service reschedule; FD-036I-09 cutoff RESOLVED (sealing
  amendment); FD-036H-18 continuity; D-364 refunds; BR-036I-019
Out of scope: In-place reschedule; change-slot mutation; commercial reprice of paid Order;
  schedule history engine; no-show penalties; cancellation fee; changing FD-036I-13 grace;
  retroactive Brand cutoff mutation of purchased Orders
Data implications: Product requires sealed per-Order cutoff minutes as commercial/fulfilment
  policy truth; storage/representation = Architecture Fit (must not change BR-036I-019)
Open material decisions: NONE
Readiness: READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + authorization
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
UX states: Notification of problem; cancel/refund + new-Order recovery (FD-036I-10)
Permission / resource context: Customer + authorized Ops recovery actions under existing authorities
Error / recovery: Notify + cancel/refund under existing authority + allow NEW Order; no silent substitution; no in-place reschedule
Dependencies: FD-036I-10 RESOLVED
Explicit non-goals: Silent outlet/items/mode/time/slot change; in-place reschedule engine
Data implications: Preserve original promise/audit history; replacement is a separate Order if customer chooses
Security implications: Do not expose unnecessary internal ops notes to unauthorized parties
Architecture fit / applicable invariants: Detection + notification + recovery workflows = Fit
Open material decisions: NONE
Readiness: READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + authorization
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
Open material decisions: NONE
Readiness: READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + authorization
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
Open material decisions: NONE (FD-036I-01 discrete slots — control shape = Fit; a11y outcomes remain)
Readiness: READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + authorization
```

### US-036I-015 — Commercial sealing and online payment for Scheduled

```text
Story ID: US-036I-015
As a PERSONA-CUSTOMER
I want to pay online for a Scheduled Order against confirmed commercial and cancellation terms
so that prices/fees and my cancellation cutoff do not silently change after I reviewed them
  or after purchase, and cash/COD is never offered.

Journey / activity: Payment → Order materialization
Preconditions: Valid Scheduled commercial snapshot; online payment authority; applicable
  cancellation cutoff communicated before purchase
Acceptance scenarios: AC-036I-020, AC-036I-021, AC-036I-022, AC-036I-023, AC-036I-024,
  AC-036I-025, AC-036I-030, AC-036I-064, AC-036I-065, AC-036I-066
Business rules: BR-036I-009, BR-036I-010, BR-036I-016, BR-036I-017, BR-036I-019
UX states: Payment pending; success; failure/retry per GJ-PAYMENT-RECOVERY; stale cancellation
  terms require reconfirm before new payment-bound attempt
Permission / resource context: Existing payment identity
Error / recovery: Existing payment failure/retry; never invent cash/COD/deposit/partial;
  Brand cutoff change before payment binding → show updated terms and require reconfirm
Dependencies: FD-036H-03 inheritance; FD-036I-06 PAY NOW; FD-036I-07 commercials sealed at
  purchase; FD-036I-09 sealing / checkout revalidation
Explicit non-goals: Pay later; COD; pay at pickup; deposit; partial payment; new payment
  provider; new financial document type; silently binding changed cancellation terms
Data implications: Single Order; D-365/366/367 continuity; Checkout Snapshot commercial
  authority preserved; sealed cancellation cutoff minutes inherited on successful payment
Security implications: Server-authoritative commercials and cancellation policy;
  payment-bound immutability
Architecture fit / applicable invariants: Snapshot timing/cutoff fields; financial adapters
  remain D-365 compliant; revalidation/CAS/retry mechanism = Fit (must not change product
  outcome)
Open material decisions: NONE
Readiness: READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + authorization
```

### US-036I-016 — Scheduling configuration / platform operability boundary

```text
Story ID: US-036I-016
As a PERSONA-PLATFORM-OPERATOR (and workforce config context under PERSONA-WORKFORCE-OPERATOR)
I want scheduling eligibility inputs (hours, closures, mode enablement) and Brand-level
Scheduled cancellation cutoffs for Pickup and Delivery to remain operable
so that Scheduled availability and self-service cancel windows reflect real commercial/
operations policy without inventing a new RBAC model or Outlet override in V1.

Journey / activity: Config / operability
Preconditions: Authorized actors under existing Brand/platform commercial/operations admin
  context (no new role)
Acceptance scenarios: AC-036I-034, AC-036I-042, AC-036I-053, AC-036I-054, AC-036I-056,
  AC-036I-057, AC-036I-058, AC-036I-059, AC-036I-060, AC-036I-061, AC-036I-062, AC-036I-063
Business rules: BR-036I-005, BR-036I-015, BR-036I-019
UX states: Existing outlet/hours/operating controls remain authoritative inputs to eligibility;
  Brand-level Pickup cancellation cutoff minutes and Delivery cancellation cutoff minutes
  configurable independently within 0–240 inclusive (defaults 30 / 60); later Brand changes
  affect future purchases only — not already-purchased Orders
Permission / resource context: Existing Brand/platform commercial/operations admin permissions;
  no new role; V1 Outlet override of cancellation cutoff = NO
Error / recovery: Unauthorized deny; invalid cutoff (<0 or >240) rejected clearly
Dependencies: IMP-035 / outlet profile / operating-state foundations; FD-036I-02, FD-036I-04,
  FD-036I-09 (sealing amendment), FD-036I-15 RESOLVED; BR-036I-019
Explicit non-goals: New “Scheduler Admin” role; labour scheduling product; V1 capacity engine;
  V1 Outlet-level cancellation-cutoff override; inventing cutoff values outside 0–240;
  retroactive mutation of purchased Order cancellation rights
Data implications: Product requires eligibility inputs + Brand per-mode cutoff minutes for
  future purchases; purchased Orders retain sealed cutoff; temporary PAUSED ≠ auto-delete
  future slots; storage/admin surface = Fit (must not change BR-036I-019 business policy)
Security implications: No client-trusted eligibility or cutoff
Architecture fit / applicable invariants: Eligibility composition, cutoff storage/admin surface/
  RBAC/validation/runtime enforcement = Fit; business policy remains BR-036I-019
Open material decisions: NONE
Readiness: READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + authorization
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
Then the wording states ARRIVAL / FULFILMENT WINDOW (customer expects delivery arrival) per FD-036I-05
And the customer is not shown kitchen-ready, dispatch-start, or rider-assignment as the customer-facing promise
Mandatory in acceptance slice: YES
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
Given Scheduled selection under per-mode minimum lead-time configuration (FD-036I-03; PICKUP vs DELIVERY may differ; values = operational config, not hard-coded in PD)
When eligible times are listed
Then times inside the forbidden lead window are not selectable
Mandatory in acceptance slice: YES
```

```text
AC-036I-027 — Maximum horizon excludes beyond-horizon dates
Story: US-036I-005
Given Scheduled selection under TODAY + TOMORROW horizon (outlet local calendar; same for Pickup and Delivery) per FD-036I-02
When eligible dates are listed
Then dates beyond tomorrow are not selectable (no multi-day beyond tomorrow; no arbitrary calendar beyond tomorrow)
Mandatory in acceptance slice: YES
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
Then EARLY: window remains the promise (no early-readiness guarantee); workforce may hand over early if ready and IMP-036H verification succeeds
And LATE: no automatic no-show cancel/fee/penalty; Order remains governed by existing fulfil/cancel; customer may be directed to contact outlet
And handover remains confirmation/order number + authorized customer verification → order.fulfil (no OTP/QR/PIN/gov ID) per FD-036I-13
Mandatory in acceptance slice: YES
```

```text
AC-036I-037 — Scheduled Delivery execution aligns to promise
Story: US-036I-010
Given a Scheduled Delivery Order approaching its ARRIVAL/FULFILMENT WINDOW (FD-036I-05)
When Delivery Coordinator / Ops initiates delivery execution
Then execution begins early enough to target that arrival/fulfilment window (FD-036I-14 outcome-first)
And if booking/execution cannot meet the promise, surface Ops/customer recovery per FD-036I-10 without silently moving the Scheduled time or claiming the original promise is still achievable
And mechanism (cron/queue/worker/ETA algorithm/exact dispatch calc) remains Architecture Fit-owned
Mandatory in acceptance slice: YES
```

```text
AC-036I-038 — Delivery provider cannot book near Scheduled window
Story: US-036I-010
Given Scheduled Delivery where provider booking cannot be completed in time
When Ops/system detects the failure
Then notify + cancel/refund under existing authority + allow NEW Order against currently valid options (FD-036I-10/14)
And do not silently change outlet/items/mode/time/slot or claim the original promise remains achievable
Mandatory in acceptance slice: YES
```

```text
AC-036I-039 — Customer cancellation before cutoff succeeds when eligible
Story: US-036I-011
Given a paid Scheduled Order whose current time (outlet local) is BEFORE the sealed
  cancellation cutoff instant for that Order (FD-036I-09 / BR-036I-019;
  cutoff = slot_start − sealed_cutoff_minutes for that Order’s fulfilment mode)
When the customer cancels and the Order is otherwise eligible under existing cancel/refund authority
Then cancellation proceeds under existing cancel/refund authority
And V1 applies NO cancellation/penalty fee
Mandatory in acceptance slice: YES
```

```text
AC-036I-040 — Future closure removes future slot eligibility without inventing “PAUSED forever”
Story: US-036I-002 / US-036I-004
Given a known future closure/exception for an outlet on date D
When the customer browses Scheduled times for date D
Then affected times are not selectable
And a temporary current PAUSED state does not automatically delete otherwise-valid future slots; future eligibility reflects known future truth (hours, closures, inactive/suspended outlet, mode enablement, lead, horizon, merchandise) — current pause ≠ “unavailable tomorrow” (FD-036I-15)
Mandatory in acceptance slice: YES
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
Given FD-036I-04 NO explicit per-slot capacity engine in V1
When customers select Scheduled times
Then eligibility may use outlet/activity, future hours/closures, mode, merchandise, lead time, and horizon — NOT orders-per-slot, kitchen workload, labour, or predictive capacity
And there is no slot reservation/contention design and no last-slot capacity races to design for V1; capacity = FOLLOW_UP
Mandatory in acceptance slice: YES
```

```text
AC-036I-043 — No new Order status invented without Founder decision
Story: US-036I-009
Given a Scheduled Order in Ops or customer surfaces
When lifecycle state is presented
Then existing PLACED→ACCEPTED→FULFILLED|CANCELLED semantics remain
And due/overdue/Scheduled are presentation/derived timing cues only — not SCHEDULED/READY/DUE/LATE Order statuses (FD-036I-12)
Mandatory in acceptance slice: YES
```

```text
AC-036I-044 — Notifications are fulfilment-mode and timing aware
Story: US-036I-007 / US-036I-010
Given Scheduled Order lifecycle notification events under ADR-012 authority
When notifications are sent
Then content is mode-aware (Pickup: location+window; Delivery: arrival/fulfilment window) and timing-aware (Scheduled vs ASAP)
And V1 includes one proactive pre-fulfilment reminder (~30 minutes before window begins) per FD-036I-11
And if the Order was placed inside the reminder window, do not send a redundant upcoming reminder immediately after confirmation
And no new messaging provider is introduced (Fit owns scheduling/retry)
Mandatory in acceptance slice: YES
```

```text
AC-036I-045 — Reschedule outcome matches Founder policy
Story: US-036I-011
Given FD-036I-08 NO customer self-service rescheduling in V1
When a customer wants a different Scheduled time
Then there is no in-place reschedule / change-slot mutation / commercial reprice of the paid Order
And the path is cancel (if permitted) + place a new Order against currently valid options
Mandatory in acceptance slice: YES
```

```text
AC-036I-046 — Cancellation after cutoff denied with recovery guidance
Story: US-036I-011
Given a Scheduled Order whose current time (outlet local) is AFTER the cancellation cutoff
  instant (FD-036I-09 / BR-036I-019)
When the customer attempts self-service cancel
Then the attempt is denied with clear messaging plus support/Outlet recovery guidance
And V1 applies NO cancellation/penalty fee
And no fuzzy/grace period is applied to the cancellation cutoff (FD-036I-13 early/late Pickup
  grace is unchanged and separate)
Mandatory in acceptance slice: YES
```

```text
AC-036I-047 — Post-payment unavailability: no silent substitutions
Story: US-036I-012
Given a paid Scheduled Order whose future fulfilment becomes impossible
When recovery begins
Then notify the customer + cancel/refund under existing authority + allow a NEW Order against currently valid options (FD-036I-10)
And outlet, items, mode, and Scheduled time/slot are not silently changed; no in-place reschedule
And original promise/audit history is preserved; Ops may assist but recovery remains cancel/refund original + separate replacement if customer chooses
Mandatory in acceptance slice: YES
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
Given FD-036I-06 PAY NOW
When a customer places a Scheduled Order
Then payment is online now before Order materialization (Razorpay preserved; zero-payable where applicable)
And pay later / COD / pay at pickup / deposit / partial payment are not offered
Mandatory in acceptance slice: YES
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

```text
AC-036I-053 — Scheduled Pickup cancellation-cutoff default is 30 minutes
Story: US-036I-011 / US-036I-016
Given Brand cancellation-cutoff configuration at V1 defaults (FD-036I-09 / BR-036I-019)
When evaluating a SCHEDULED PICKUP Order with selected slot start 18:00 (outlet local)
  (product evidence example: slot 18:00–18:30)
Then the cancellation cutoff instant is 17:30 outlet local (30 minutes before slot start)
And this example is product evidence of the default — not a hard-coded system value locked in Fit
Mandatory in acceptance slice: YES
```

```text
AC-036I-054 — Scheduled Delivery cancellation-cutoff default is 60 minutes
Story: US-036I-011 / US-036I-016
Given Brand cancellation-cutoff configuration at V1 defaults (FD-036I-09 / BR-036I-019)
When evaluating a SCHEDULED DELIVERY Order with selected slot start 18:00 (outlet local)
  (product evidence example: slot 18:00–18:30)
Then the cancellation cutoff instant is 17:00 outlet local (60 minutes before slot start)
And this example is product evidence of the default — not a hard-coded system value locked in Fit
Mandatory in acceptance slice: YES
```

```text
AC-036I-055 — Exact cancellation-cutoff boundary denies self-service cancel
Story: US-036I-011
Given a paid Scheduled Order at the exact cancellation cutoff instant
  (current time == slot_start − configured minutes; outlet local; FD-036I-09 / BR-036I-019)
When the customer attempts self-service cancel
Then the attempt is denied (AT OR AFTER cutoff) with clear messaging plus support/Outlet
  recovery guidance
And V1 applies NO cancellation/penalty fee
Mandatory in acceptance slice: YES
```

```text
AC-036I-056 — Brand configures Pickup and Delivery cutoffs independently (0–240)
Story: US-036I-016
Given an authorized Brand/platform commercial/operations admin context (existing authorities;
  no new role)
When configuring Scheduled cancellation cutoffs
Then Pickup cancellation cutoff minutes and Delivery cancellation cutoff minutes are
  configurable independently at Brand scope within 0–240 inclusive
And changing one mode’s value does not force the other mode’s value
Mandatory in acceptance slice: YES
```

```text
AC-036I-057 — Invalid cancellation-cutoff values are rejected clearly
Story: US-036I-016
Given an authorized actor attempting to set Brand Pickup or Delivery cancellation cutoff minutes
When the value is less than 0 or greater than 240
Then the configuration change is rejected with a clear validation message
And the previously valid Brand cutoff for that mode remains unchanged
Mandatory in acceptance slice: YES
```

```text
AC-036I-058 — V1 has no Outlet override of cancellation cutoff
Story: US-036I-016
Given Brand-level Pickup and Delivery cancellation cutoff configuration (FD-036I-09 / BR-036I-019)
When an Outlet-scoped configuration path is considered for cancellation cutoff in V1
Then no Outlet override of Brand cancellation-cutoff minutes is offered or applied
And cutoff evaluation uses Brand per-mode values only
Mandatory in acceptance slice: YES
```

```text
AC-036I-059 — Zero-minute cancellation-cutoff semantics
Story: US-036I-011 / US-036I-016
Given Brand cancellation cutoff minutes for a fulfilment mode configured to 0
When a customer attempts self-service cancel on a Scheduled Order of that mode
  whose sealed cutoff minutes are 0
Then cancel is allowed only while current time (outlet local) is BEFORE selected slot start
And at or after slot start, self-service cancel is denied with support/Outlet recovery guidance
And V1 applies NO cancellation/penalty fee
And later Brand changes to a non-zero cutoff do not alter this Order’s sealed 0-minute policy
Mandatory in acceptance slice: YES
```

```text
AC-036I-060 — Existing Pickup Order unaffected by later Brand cutoff increase
Story: US-036I-011 / US-036I-016
Given a successfully purchased Scheduled Pickup Order whose sealed cancellation cutoff is 30
When Brand Pickup cancellation cutoff later changes to 60
Then that existing Order remains governed by sealed cutoff 30
And self-service cancellation eligibility continues to use slot_start − 30
And the Brand change does not grant additional cancellation time for that Order
Mandatory in acceptance slice: YES
```

```text
AC-036I-061 — Existing Pickup Order unaffected by later Brand cutoff decrease
Story: US-036I-011 / US-036I-016
Given a successfully purchased Scheduled Pickup Order whose sealed cancellation cutoff is 60
When Brand Pickup cancellation cutoff later changes to 30
Then that existing Order remains governed by sealed cutoff 60
And self-service cancellation eligibility continues to use slot_start − 60
And the Brand change does not shorten or remove that Order’s cancellation right
Mandatory in acceptance slice: YES
```

```text
AC-036I-062 — Existing Delivery Order sealed against later Brand cutoff change
Story: US-036I-011 / US-036I-016
Given a successfully purchased Scheduled Delivery Order whose sealed cancellation cutoff is 60
When Brand Delivery cancellation cutoff later changes to any other valid value in 0–240
Then that existing Order remains governed by sealed cutoff 60
And later Brand Delivery cutoff changes affect future purchases only
Mandatory in acceptance slice: YES
```

```text
AC-036I-063 — New Order after Brand cutoff change uses newly effective value
Story: US-036I-011 / US-036I-016
Given Brand Pickup cancellation cutoff changes from 30 to 60 (or Delivery 60 to another valid value)
When a customer later successfully purchases a new Scheduled Order under that mode
Then the new Order’s sealed cancellation cutoff is the newly effective Brand/mode value
And previously purchased Orders retain their previously sealed values
Mandatory in acceptance slice: YES
```

```text
AC-036I-064 — Stale checkout cannot silently bind changed cancellation terms
Story: US-036I-015
Given a customer reviewed checkout cancellation terms under cutoff X for the selected mode
And Brand/mode cutoff later changes to Y before any payment-bound Checkout Snapshot exists
When the customer proceeds toward payment
Then the stale checkout must not silently continue under cutoff X
And updated cancellation terms derived from Y must be shown
And the customer must reconfirm before a new payment-bound attempt proceeds
Mandatory in acceptance slice: YES
```

```text
AC-036I-065 — Payment-bound attempt retains sealed cutoff despite concurrent Brand change
Story: US-036I-015
Given a payment attempt is already bound to a valid Checkout Snapshot with effective cutoff X
And Brand/mode cutoff later changes to Y while that payment attempt remains active
When that payment attempt succeeds
Then the resulting Order inherits sealed cutoff X
And Y does not apply to that Order
Mandatory in acceptance slice: YES
```

```text
AC-036I-066 — Failed or expired payment attempt re-evaluates current cutoff
Story: US-036I-015
Given a payment attempt bound with cutoff X fails, expires, is abandoned, or otherwise requires
  a new payment attempt
And Brand/mode cutoff is now Y
When the customer starts a new payment attempt
Then current Brand/mode policy must be re-evaluated
And the customer must see/confirm terms under Y before a new payment-bound attempt proceeds
And a subsequent successful Order seals Y (not the prior failed attempt’s X)
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
| AC-036I-039, 045…047, 053…055, 059…066 | Cancel/no-reschedule/post-pay recovery + cutoff defaults/boundary/zero/sealing/checkout revalidation | E2E + refund continuity | Sealed cutoff + cancel+new Order + notify/refund + stale-checkout reconfirm | Planned only |
| AC-036I-048…049 | Privacy + program pause boundary | Negative + governance assertions | Pickup privacy; pause preserved | Planned only |
| AC-036I-021, 052 | Accessibility + mobile | Component/a11y + real-browser interactive proof | Keyboard/SR/mobile; scan alone insufficient | Planned only |
| AC-036I-056…058 | Brand cutoff config scope/range/no Outlet override | Domain + admin/config assertions | Independent 0–240; reject invalid; Brand-only V1 | Planned only |

Planned is **not** proven. Evidence populates after Product Definition Gate → Fit/lock → authorized implementation under TEST-1 (no silent-retry-as-pass). Founder FD-036I-01…15 are already resolved.

---

## 11. Business rules

| Rule ID | User/business rule | Authority / rationale | Story / AC IDs |
|---|---|---|---|
| `BR-036I-001` | Every checkout/order has exactly one authoritative fulfilment mode and one authoritative fulfilment timing. | Product identity; IMP-036H mode inheritance | US-036I-001; AC-036I-001…003 |
| `BR-036I-002` | FULFILMENT_MODE and FULFILMENT_TIMING are orthogonal; all four combinations are conceptually valid when eligibility allows. | Product identity | US-036I-001/005; AC-036I-013…015 |
| `BR-036I-003` | ASAP behaviour must not regress when Scheduled is introduced. | Accepted Delivery + IMP-036H | US-036I-001; AC-036I-001/002 |
| `BR-036I-004` | Scheduled requires an eligible future fulfilment time before payment. | PLANNED_IMP036I | US-036I-002/003; AC-036I-004/008 |
| `BR-036I-005` | Selectable times must respect outlet activity, known future schedule eligibility, mode eligibility, merchandise fulfilability, per-mode min lead, and TODAY+TOMORROW horizon — **not** per-slot capacity in V1. Temporary current PAUSED does not auto-delete otherwise-valid future slots. | FD-036I-02…04, FD-036I-15 RESOLVED | US-036I-004; AC-036I-011/026/027/040/041/042 |
| `BR-036I-006` | Scheduled Pickup preserves IMP-036H invariants: outlet bind, no destination, no delivery fee, no Delivery aggregate, packaging retained, order.fulfil handover, no OTP/QR/PIN. | FD-036H-04/07/08/13/23; FD-036I-16…20 | US-036I-002/009; AC-036I-005…007/035/048 |
| `BR-036I-007` | Scheduled Delivery preserves accepted Delivery destination/serviceability and Delivery execution path. | ADR-011 | US-036I-003/010; AC-036I-008/009/037 |
| `BR-036I-008` | No silent substitution of outlet, items, mode, or Scheduled time. | Product safety principle | US-036I-006/012; AC-036I-016/017/047 |
| `BR-036I-009` | Commercials sealed at purchase (item pricing, promotions, tax, packaging, delivery charge); future changes do not silently reprice; Checkout Snapshot commercial authority preserved; scheduling does not invent a parallel pricing engine. | FD-036H-09; FD-036I-07 RESOLVED | US-036I-015; AC-036I-007/022/024 |
| `BR-036I-010` | Payment-bound commercial snapshot (including mode+timing+outlet/destination) is immutable; unsafe mutations fail closed. | Accepted checkout/payment foundations; FD-036I-07 | US-036I-006/015; AC-036I-029 |
| `BR-036I-011` | Scheduled times are presented in the selected outlet's local timezone. | Product timezone rule | US-036I-007/013/014; AC-036I-031/052 |
| `BR-036I-012` | Order remains Order — no ScheduledOrder / PickupScheduledOrder / DeliveryScheduledOrder. | Product identity; FD-036I-17 | US-036I-002/007; AC-036I-023 |
| `BR-036I-013` | Customer-facing Scheduled Delivery timing promise is ARRIVAL / FULFILMENT WINDOW (not kitchen-ready, dispatch-start, or rider-assignment); customer copy must reflect this. | FD-036I-05 RESOLVED | US-036I-003; AC-036I-010 |
| `BR-036I-014` | Scheduled Orders are visible to authorized workforce immediately after purchase; may acknowledge/accept before window; derived cues Scheduled / Due soon / Overdue — not new Order statuses; lifecycle remains PLACED→ACCEPTED→FULFILLED|CANCELLED. | FD-036I-12 RESOLVED | US-036I-008; AC-036I-032/033/043 |
| `BR-036I-015` | Use derived timing presentation (Scheduled / Due soon / Overdue); do not invent SCHEDULED/READY/DUE/LATE Order statuses (FD-036I-12). | Product identity; FD-036I-12 | US-036I-008/009; AC-036I-043 |
| `BR-036I-016` | Online payment only; no cash/COD/pay-at-counter for Scheduled. | FD-036H-03; FD-036I-16 | US-036I-015; AC-036I-020 |
| `BR-036I-017` | Scheduling does not create a new financial-document type; D-365/366/367 continuity required. | FD-036I-21 | US-036I-015; AC-036I-030/050 |
| `BR-036I-018` | No self-service reschedule (cancel if permitted + new Order); cancellation eligibility uses BR-036I-019 cutoff policy (no V1 fee); post-pay unhonourable → notify + cancel/refund + allow new Order; no silent substitution. Existing refund authority remains money truth. | FD-036I-08…10 RESOLVED; D-364; BR-036I-019 | US-036I-011/012; AC-036I-039/045…047/053…055/059 |
| `BR-036I-019` | **BR-SCHEDULED-CANCELLATION-CUTOFF.** V1 binding policy (FD-036I-09 amended 2026-09-24): SCHEDULED PICKUP default cutoff **30** minutes before selected slot start; SCHEDULED DELIVERY default **60** minutes before selected slot start. Config scope = **Brand-level**; dimension = **per fulfilment mode** (Pickup / Delivery independently). Allowed range **0–240** inclusive. V1 Outlet override = **NO**. No new role; config owned by existing Brand/platform commercial/operations admin context. Cutoff instant = `slot_start − sealed_cutoff_minutes`; **outlet local-time** semantics. Self-service cancel allowed **ONLY BEFORE** sealed cutoff (and otherwise eligible); **AT OR AFTER** cutoff denied with support/Outlet recovery guidance. V1 **NO** cancellation/penalty fee. **0 minutes** = cancel allowed before slot start; unavailable at/after slot start. No fuzzy/grace in cancellation cutoff; does **not** change FD-036I-13 early/late Pickup grace. **Sealing:** effective cutoff minutes for a purchased Scheduled Order are sealed from the payment-bound Checkout Snapshot (Brand + fulfilment mode policy evaluated for that Snapshot) and become immutable commercial/fulfilment policy truth for that Order. Later Brand configuration changes MUST affect future eligible purchase attempts only and MUST NOT shorten, extend, grant, remove, or otherwise alter the self-service cancellation right of an already-purchased Scheduled Order. **Checkout revalidation:** before a payment attempt becomes bound to a Checkout Snapshot, currently effective cancellation policy must be revalidated; if Brand/mode cutoff changed since the customer last reviewed checkout, stale checkout must not silently continue — updated terms must be shown and reconfirmed. Once payment-bound, that Snapshot’s cutoff is immutable for that attempt; success → Order inherits sealed value; fail/expire/abandon → next payment attempt re-evaluates current Brand/mode policy. **Customer-facing terms:** before purchase, checkout must communicate the applicable cancellation cutoff meaningfully (exact copy/design = UX Fit). Product evidence examples (not hard-coded system values): Pickup slot 18:00–18:30 → cutoff 17:30 under default; Delivery same slot → cutoff 17:00 under default. Architecture Fit owns storage/admin surface/snapshot/CAS/retry/RBAC/validation/runtime enforcement and **must not** change this business outcome. | FD-036I-09 amended 2026-09-24 | US-036I-011/015/016; AC-036I-039/046/053…066 |

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
| VALIDATION FAILURE | Lead/horizon/hours/closure/merch/serviceability failures (no V1 capacity gating) | AC-036I-016/017/026/027/040/041/042 |
| AUTHORIZATION | Customer owns checkout; Ops fulfil requires authority; unauthorized deny | AC-036I-034 |
| NOT FOUND / STALE REFERENCE | Stale time/outlet after change → recoverable; no silent switch | AC-036I-016/029/047 |
| SERVER / NETWORK ERROR | Existing checkout/payment error/retry patterns | US-036I-015; GJ-PAYMENT-RECOVERY |
| RECOVERY | Other time / ASAP / mode switch / cancel+refund when BEFORE cutoff / notify+cancel+refund+new Order (FD-036I-10); AT OR AFTER cutoff → clear deny + support/Outlet; no self-service reschedule | AC-036I-012/016/039/045/046/047/055/059 |
| CONCURRENCY | Payment-pending mutation safety; no last-slot capacity races in V1 (FD-036I-04) | AC-036I-029/042 |
| DESTRUCTIVE ACTION | Cancellation/refund under existing authority; Brand per-mode cutoff per FD-036I-09 / BR-036I-019 (defaults Pickup 30 / Delivery 60; AT OR AFTER denied); no V1 cancel fee | AC-036I-039/046/050/053…059 |
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
| Cancel / cutoff denied | At or after cutoff (incl. exact boundary) | Clear deny + support/Outlet path | Focus message | Stay / contact | AC-036I-046/055/059 |
| Brand cutoff config | Authorized Brand admin context | Independent Pickup/Delivery minutes 0–240; reject invalid; no Outlet override V1 | Focusable config controls | Saved / validation error | AC-036I-053/054/056…058 |
| Post-pay unavailability | Future broken | Notify + cancel/refund + new Order (FD-036I-10) | Focus recovery | Cancel/refund + separate replacement | AC-036I-047 |
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
| Cancel / refund (no self-service reschedule) | Existing cancellation/refund permissions; no self-service reschedule (FD-036I-08); cutoff BR-036I-019 | Existing resource rules | Own-order only; before-cutoff allow when eligible; AT OR AFTER deny | AC-036I-039/045/046/055/059 |
| Configure hours/closures affecting eligibility | Existing outlet/admin authorities | Outlet resource scope | Unauthorized deny; no new Scheduler Admin role | AC-036I-042/040 |
| Configure Brand cancellation cutoffs (Pickup/Delivery) | Existing Brand/platform commercial/operations admin context (no new role) | Brand scope; per fulfilment mode | Independent 0–240; invalid rejected; V1 no Outlet override | AC-036I-053/054/056…058 |

Do not derive authorization from persona labels. Fit verification of permission reuse is mandatory before implementation claims “no new permission.”

---

## 15. Data implications

**PRODUCT REQUIREMENTS (not schema):**

- A BOBA Bear Order remains an Order; it must expose fulfilment mode **and** fulfilment timing (no `ScheduledOrder` / `PickupScheduledOrder` / `DeliveryScheduledOrder`).
- Paid commercial snapshot binds selected mode, timing promise, and outlet (Pickup) or destination (Delivery) immutably.
- Scheduled Pickup must not create/use a Delivery aggregate.
- Customer-facing timing must be presentable in outlet local timezone.
- Scheduling eligibility depends on product inputs such as outlet activity, known future schedule/hours/exceptions, mode enablement, merchandise fulfilability, per-mode min lead, and TODAY+TOMORROW horizon — **not** per-slot capacity in V1 — **storage/computation = Architecture Fit**.
- Brand-level Scheduled cancellation cutoff minutes (Pickup and Delivery independently; defaults 30 / 60; range 0–240; no Outlet override V1) are a **PRODUCT REQUIREMENT** per BR-036I-019; durable storage/admin surface = Architecture Fit and must not change the business policy.
- Historical ASAP Orders remain ASAP; migration/backward-compatibility strategy = Architecture Fit.
- Do not invent speculative queue/cron/worker schemas in this draft.
- Conceptual future Fit terms such as `scheduledFor` / `slotId` are **not** Founder decisions and are not locked here.

**ARCHITECTURE CANDIDATES / Fit-owned:** durable storage of timing; slot representation; eligibility composition; lead/horizon config placement; Brand cancellation-cutoff storage/admin surface/RBAC/validation/runtime enforcement (business policy = BR-036I-019 — Fit must not change it); snapshot evolution/migration; projection shapes; notification scheduling/retry; operational release triggers; dispatch backward from arrival. Capacity representation is FOLLOW_UP (not V1). **IMPLEMENTATION DETAIL:** table/column/API/queue/cron names — out of scope here.

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

Unresolved security **product** decisions: **NONE**. Mechanism choices remain Fit.

---

## 17. Concurrency/recovery

| Scenario | Required observable outcome | Authority link |
|---|---|---|
| Pre-payment mode/timing switch | Recalculate; coherent destination/fee/timing requirements | US-036I-005; AC-036I-013…015 |
| Selected time invalid before pay | Block pay; recoverable; no silent substitution | US-036I-006; AC-036I-016 |
| Payment pending / bound snapshot | Timing/mode mutation that invalidates snapshot fails safely | AC-036I-029; GJ-PAYMENT-RECOVERY |
| Last available slot capacity race | N/A in V1 — no per-slot capacity engine (FD-036I-04); no reservation/contention design | AC-036I-042 |
| Duplicate placement retries | Idempotent single Order | AC-036I-023/025 |
| Outlet/merch/hours change after selection (pre-pay) | Payment blocked; recoverable | AC-036I-017/040/041 |
| Payment succeeds but scheduling cannot be honoured | Notify + cancel/refund + allow new Order (FD-036I-10); no false guarantee | US-036I-012 |
| Post-payment closure / unavailability | No silent rewrite; FD-036I-10 | AC-036I-047 |
| Ops late / customer early-late Pickup | FD-036I-13 policy | AC-036I-036 |
| Provider unavailable near Scheduled Delivery | FD-036I-14 / FD-036I-10 | AC-036I-038 |
| Cancellation/refund | Existing authorities; cutoff FD-036I-09 / BR-036I-019 (before allow when eligible; AT OR AFTER deny) | AC-036I-039/046/050/053…059 |

Do not invent new retry/idempotency semantics; align to accepted payment/order concurrency authority. Exact mechanisms = Architecture Fit.

---

## 18. Accessibility/responsive expectations

- Supported contexts: existing customer checkout and Ops surfaces on mobile and desktop viewports already targeted by IMP-036B/C/D/H.
- ASAP/Scheduled timing choice, date/time selection, confirmation summaries, cancel controls (no self-service reschedule), and Ops handover/delivery controls must be keyboard reachable with visible focus and accessible names.
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
scheduled_reschedule_rate (N/A for V1 — no self-service reschedule; FD-036I-08)
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
| `GJ-CANCELLATION-REFUND` / CURRENT | Continuity for Scheduled Orders; Brand per-mode cutoff + cancel (no self-service reschedule); defaults Pickup 30 / Delivery 60 | YES (continuity) | AC-036I-039/045/046/050/053…059 | Planned continuity proof |
| `GJ-ADDRESS-SERVICEABILITY` / CURRENT | Delivery path unchanged for ASAP; Scheduled Delivery still requires serviceability; Scheduled Pickup must not force address | YES | AC-036I-009/048 | Planned |
| `GJ-RETURNING-ORDER` / PARTIAL | May later use Scheduled; no new Order Again semantics in IMP-036I | NO | — | N/A for V1 mandatory |
| Other GJs | No intentional change | NO unless regression risk found | — | Protect if touched |

Registry status is not a test verdict.

---

## 21. Dependencies

| Dependency | Authority / verified state | Required before which story or gate? | Unresolved impact |
|---|---|---|---|
| ROADMAP/STATE activation IMP-036I (PD only) + program pause D-377 | GTM-R151 / STATE-R149 expected tip | SATISFIED for drafting this PD | Fit/impl still blocked; Gate ready to be performed |
| Accepted commerce foundations through IMP-036H | COMPLETE_AND_ACCEPTED through IMP-036H | All stories | NONE for ASAP baselines |
| Founder resolution of FD-036I-01…15 | RESOLVED 2026-09-24 | Before Product Definition Gate | SATISFIED — Gate ready (NOT_PERFORMED) |
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
7. How is capacity represented if product includes it? — `ARCHITECTURE_FIT_REQUIRED` (product: NO capacity engine in V1 / FOLLOW_UP; Fit records N/A or deferral)
8. How is concurrency controlled for the last available slot? — `ARCHITECTURE_FIT_REQUIRED` (product: no V1 capacity races to design)
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

Proposed PLANNED behaviour is not accepted until Product Definition Gate PASS, Architecture Fit/lock, implementation authorization, and IMP acceptance occur. Founder FD-036I-01…15 are resolved.

---

## 23. Explicitly deferred

| `EXPLICITLY_DEFERRED` behaviour | FOLLOW_UP or DEFERRED | Reason / consequence | Revisit dependency / decision owner |
|---|---|---|---|
| Explicit per-slot capacity engine / workload/capacity forecasting | FOLLOW_UP (FD-036I-04) | V1 has NO capacity engine; eligibility excludes orders-per-slot/kitchen/labour/predictive capacity | Founder / future slice |
| Kitchen preparation lifecycle statuses (PREPARING, READY_FOR_PICKUP, etc.) | DEFERRED | Prefer derived timing unless Founder proves need | Founder |
| Pickup OTP/QR proof | DEFERRED / NOT_SUPPORTED for V1 | IMP-036H default remains | Future decision |
| Customer no-show automatic cancel/fee/penalties | DEFERRED | Consistent with FD-036I-13 grace-oriented LATE (no automatic no-show cancel/fee in V1) | Founder |
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
| Cash on delivery / pay at pickup / COD / deposits / partial payment / pay later | FD-036H-03; FD-036I-16; FD-036I-06 PAY NOW | AC-036I-020/051 |
| ScheduledOrder / PickupScheduledOrder / DeliveryScheduledOrder aggregates | Product identity; FD-036I-17 | AC-036I-023 |
| Delivery aggregate for Scheduled Pickup | FD-036H-13; FD-036I-20 | AC-036I-006 |
| Calling Scheduled Pickup a form of Delivery | IMP-036H mode peer | AC-036I-005/033 |
| New role by default for scheduling | Permission reuse first | AC-036I-034 |
| Curbside / drive-through / dine-in / lockers | Non-goals | Not offered |
| Customer-selected delivery driver / multi-stop / cross-outlet split | Non-goals | Not offered |
| New payment provider / auth realm / loyalty system | Non-goals | Unchanged |
| New financial-document type for scheduling | D-365/366/367; FD-036I-21 | AC-036I-030 |
| Silent outlet/item/mode/time substitution | BR-036I-008; FD-036I-10 | AC-036I-016/047 |
| Customer self-service rescheduling / in-place change-slot | FD-036I-08 | AC-036I-045 |
| Outlet override of Brand cancellation cutoff (V1) | FD-036I-09 / BR-036I-019 | AC-036I-058 |
| Inventing SCHEDULED/READY/DUE/LATE Order statuses | BR-036I-015; FD-036I-12 | AC-036I-043 |
| Resolving IMP-037/038 or activating IMP-039/040 via this slice | D-377; AC-036I-049 | Program pause preserved |

---

## 25. Founder decisions register (resolved)

| `UNRESOLVED_DECISION_REQUIRED` item | Material user/business impact | Decision owner / evidence needed | Affected stories / gate |
|---|---|---|---|
| NONE | — | All FD-036I-01…22 resolved (15 Founder + 7 existing authority) | Product Definition Gate ready (NOT_PERFORMED) |

```text
UNRESOLVED_MATERIAL_PRODUCT_DECISIONS: 0
OPEN_FOUNDER_DECISIONS: 0
FOUNDER_RESOLVED: 15 (FD-036I-01 … FD-036I-15) — 2026-09-24
RESOLVED_BY_EXISTING_AUTHORITY: 7 (FD-036I-16 … FD-036I-22)
READY_FOR_PRODUCT_DEFINITION_GATE: YES
PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED
Gate Result: NOT_PERFORMED
```

Architecture Fit questions (§21) are **mechanism** questions, not unresolved product decisions. They remain unanswered (`ARCHITECTURE_FIT_REQUIRED`).

### Founder decisions register — RESOLVED (Founder, 2026-09-24)

#### FD-036I-01 — Slot vs exact-time vs hybrid

```text
ID: FD-036I-01
Status: RESOLVED — Founder
Date: 2026-09-24
Resolution: Discrete fulfilment slots; V1 30-minute windows (e.g. 6:00–6:30 PM); same for Pickup+Scheduled and Delivery+Scheduled; no exact-minute; no hybrid.
Slot representation = Architecture Fit.
```

#### FD-036I-02 — Scheduling horizon

```text
ID: FD-036I-02
Status: RESOLVED — Founder
Date: 2026-09-24
Resolution: Horizon TODAY + TOMORROW (outlet local calendar); same for Pickup and Delivery; no multi-day beyond tomorrow; no arbitrary calendar beyond tomorrow.
Internal config OK only if it does not expand V1 customer promise without authority.
```

#### FD-036I-03 — Minimum lead-time model

```text
ID: FD-036I-03
Status: RESOLVED — Founder
Date: 2026-09-24
Resolution: Per-mode lead time (PICKUP vs DELIVERY may differ). Do NOT hard-code immutable minute values in PD. Values = operational configuration. Fit owns where/how configured.
```

#### FD-036I-04 — Capacity in V1

```text
ID: FD-036I-04
Status: RESOLVED — Founder
Date: 2026-09-24
Resolution: NO explicit per-slot capacity engine in V1. Eligibility may use outlet/activity, future hours/closures, mode, merchandise, lead time, horizon — NOT orders-per-slot, kitchen workload, labour, predictive capacity. Capacity = FOLLOW_UP. No slot reservation/contention design for V1.
```

#### FD-036I-05 — Customer-facing Scheduled Delivery promise class

```text
ID: FD-036I-05
Status: RESOLVED — Founder
Date: 2026-09-24
Resolution: Scheduled Delivery window = ARRIVAL / FULFILMENT WINDOW (customer expects delivery arrival). NOT kitchen-ready, dispatch-start, or rider-assignment. Customer copy must reflect this. Fit owns dispatch backward from arrival.
```

#### FD-036I-06 — Pay now vs pay later

```text
ID: FD-036I-06
Status: RESOLVED — Founder
Date: 2026-09-24
Resolution: PAY NOW. Preserve Razorpay, payment before Order materialization, zero-payable where applicable. No pay later / COD / pay at pickup / deposit / partial payment.
```

#### FD-036I-07 — Commercial sealing at purchase

```text
ID: FD-036I-07
Status: RESOLVED — Founder
Date: 2026-09-24
Resolution: YES — commercials sealed at purchase (item pricing, promotions, tax, packaging, delivery charge). Future changes do not silently reprice. Preserve Checkout Snapshot commercial authority. No new legal/tax claim.
```

#### FD-036I-08 — Self-service rescheduling

```text
ID: FD-036I-08
Status: RESOLVED — Founder
Date: 2026-09-24
Resolution: NO customer self-service rescheduling in V1. NO in-place reschedule engine. Want another time → cancel (if permitted) + new Order. No change-slot mutation, commercial reprice of paid Order, schedule history engine. Rescheduling = future capability.
```

#### FD-036I-09 — Cancellation cutoff

```text
ID: FD-036I-09
Status: RESOLVED — Founder (amended 2026-09-24)
Date: 2026-09-24
Resolution (binding V1 product policy — BR-036I-019):
  SCHEDULED PICKUP default cancellation cutoff: 30 minutes before selected slot start.
  SCHEDULED DELIVERY default cancellation cutoff: 60 minutes before selected slot start.
  Config scope: Brand-level; dimension: per fulfilment mode
    (Pickup cancellation cutoff minutes; Delivery cancellation cutoff minutes — independent).
  Allowed range: 0–240 minutes inclusive.
  V1 Outlet override: NO.
  No new role; config owned by existing Brand/platform commercial/operations admin context.
  Cutoff instant = slot_start − sealed_cutoff_minutes; outlet local-time semantics.
  Self-service cancel allowed ONLY BEFORE sealed cutoff (and otherwise eligible).
  AT OR AFTER cutoff: deny self-service clearly + support/Outlet recovery guidance.
  V1: NO cancellation/penalty fee. NO penalty.
  0 minutes = cancel allowed before slot start; unavailable at/after slot start.
  No fuzzy/grace in cancellation cutoff; does NOT change FD-036I-13 early/late Pickup grace.

  ORDER POLICY SEALING (Founder-approved 2026-09-24):
    For every successfully purchased Scheduled Order, the cancellation cutoff policy
    applicable to that Order is SEALED and immutable.
    The effective cutoff value is the authoritative Brand + fulfilment mode cancellation
    cutoff evaluated for the payment-bound Checkout Snapshot that produces the successful Order.
    For the resulting Order, those effective cutoff minutes become immutable
    commercial/fulfilment policy truth.
    Later Brand configuration changes MUST affect future eligible purchase attempts only.
    They MUST NOT retroactively shorten, extend, grant, remove, or otherwise alter the
    self-service cancellation right of an already-purchased Scheduled Order.
    Example: Pickup Order A purchased with Pickup cutoff 30; later Brand changes Pickup to 60;
    Order A remains 30; later Order B purchased after the change uses 60.

  CHECKOUT / PAYMENT RACE (product behaviour):
    Before a payment attempt becomes bound to a Checkout Snapshot, currently effective
    cancellation policy must be revalidated.
    If Brand/mode cutoff changed since the customer last reviewed checkout, the stale
    checkout must not silently continue — updated terms must be shown and reconfirmed.
    Once a payment attempt is bound to a valid Checkout Snapshot, that Snapshot’s effective
    cancellation cutoff is immutable for that payment attempt.
    Success → Order inherits sealed value.
    Fail / expire / abandon / otherwise requires a new payment attempt → next payment attempt
    must re-evaluate current Brand/mode policy.

  CUSTOMER-FACING TERMS:
    Before purchase, the customer must be able to understand the applicable Scheduled
    cancellation rule. Checkout must communicate the applicable cancellation cutoff
    meaningfully (e.g. “Free cancellation until 5:30 PM” or equivalent derived from selected
    slot + effective cutoff). Exact UI copy/design = implementation/UX Fit.
    If policy changes before binding, updated terms must be surfaced before reconfirm.

  Product evidence examples (not hard-coded system values):
    Pickup slot 18:00–18:30 → cutoff 17:30 under default 30;
    Delivery same slot → cutoff 17:00 under default 60.
  Architecture Fit owns transaction boundaries / storage field / snapshot representation /
    CAS/revision / API representation / retry implementation and MUST NOT change this
    product outcome.
```

#### FD-036I-10 — Post-payment unavailable-order recovery

```text
ID: FD-036I-10
Status: RESOLVED — Founder
Date: 2026-09-24
Resolution: If paid Scheduled Order cannot be honoured: NOTIFY + CANCEL/REFUND under existing authority + allow NEW Order against currently valid options. Do NOT silently change outlet/items/mode/time/slot. No in-place reschedule. Ops may assist but recovery = cancel/refund original + separate replacement if customer chooses. Preserve original promise/audit history.
```

#### FD-036I-11 — Proactive reminder

```text
ID: FD-036I-11
Status: RESOLVED — Founder
Date: 2026-09-24
Resolution: YES — one proactive pre-fulfilment reminder. Default ~30 minutes before window begins. If Order placed inside reminder window: do not send redundant upcoming reminder immediately after confirmation. Mode-aware wording (Pickup: location+window; Delivery: arrival/fulfilment window). No new messaging provider. Fit owns scheduling/retry.
```

#### FD-036I-12 — Operational release / actionability

```text
ID: FD-036I-12
Status: RESOLVED — Founder
Date: 2026-09-24
Resolution: Visible to authorized workforce immediately after purchase; may acknowledge/accept before window. Derived cues: Scheduled / Due soon / Overdue — NOT new Order statuses. No SCHEDULED/READY/DUE/LATE statuses. Prep/Delivery initiation become due based on Scheduled timing policy. Fit owns release mechanics. Lifecycle remains PLACED→ACCEPTED→FULFILLED|CANCELLED.
```

#### FD-036I-13 — Late/early Pickup policy

```text
ID: FD-036I-13
Status: RESOLVED — Founder
Date: 2026-09-24
Resolution: Grace-oriented. EARLY: window remains promise; no early-readiness guarantee; workforce may hand over early if ready + IMP-036H verification succeeds. LATE: no automatic no-show cancel/fee/penalty; Order governed by existing fulfil/cancel; may direct customer to contact outlet. Preserve IMP-036H handover (confirmation/order number + authorized customer verification → order.fulfil). No OTP/QR/PIN/gov ID.
```

#### FD-036I-14 — Delivery dispatch timing model

```text
ID: FD-036I-14
Status: RESOLVED — Founder
Date: 2026-09-24
Resolution: Outcome-first: Delivery execution must begin early enough to target ARRIVAL/FULFILMENT window. PD does NOT prescribe cron/queue/worker/ETA algorithm/exact dispatch calc — Fit owns. If booking/execution cannot meet promise: surface to Ops/customer recovery + follow FD-036I-10. Do NOT silently move Scheduled time or claim original promise still achievable.
```

#### FD-036I-15 — Current PAUSED vs future slot eligibility

```text
ID: FD-036I-15
Status: RESOLVED — Founder
Date: 2026-09-24
Resolution: Distinguish temporary PAUSED now from known future slot eligibility. Temporary pause does NOT automatically delete otherwise-valid future slots. Future eligibility reflects known future truth (hours, closures, inactive/suspended outlet, mode enablement, lead, horizon, merchandise). Current pause ≠ "unavailable tomorrow." Fit owns eligibility composition.
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

Totals: 15 Founder-resolved + 7 existing authority = 22. No material OPEN Founder decisions remain.

---

## 26. Definition of Ready

| Story ID | Applicable fields complete / evidence | Open material decisions | Readiness / blocker |
|---|---|---|---|
| US-036I-001 | §9 complete; ACs/BRs linked | NONE | READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + auth |
| US-036I-002 | §9 complete | NONE | READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + auth |
| US-036I-003 | §9 complete | NONE | READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + auth |
| US-036I-004 | §9 complete | NONE | READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + auth |
| US-036I-005 | §9 complete | NONE | READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + auth |
| US-036I-006 | §9 complete | NONE | READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + auth |
| US-036I-007 | §9 complete | NONE | READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + auth |
| US-036I-008 | §9 complete | NONE | READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + auth |
| US-036I-009 | §9 complete | NONE | READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + auth |
| US-036I-010 | §9 complete | NONE | READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + auth |
| US-036I-011 | §9 complete | NONE | READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + auth |
| US-036I-012 | §9 complete | NONE | READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + auth |
| US-036I-013 | §9 complete | NONE | READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + auth |
| US-036I-014 | §9 complete | NONE | READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + auth |
| US-036I-015 | §9 complete | NONE | READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + auth |
| US-036I-016 | §9 complete | NONE | READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Gate + Fit/lock + auth |

`STORY_COMPLETE != IMP_ACCEPTED`. Stories are READY for Product Definition Gate (product decisions resolved). Product Definition Gate precedes Architecture Fit/lock; final implementation readiness requires Gate PASS + Fit + authorization. This draft is **DRAFT_READY_FOR_GATE** — Gate remains **NOT_PERFORMED** (not APPROVED / not Gate PASS).

---

## 27. Product Definition Gate

```text
Document status: DRAFT_READY_FOR_GATE
PRE-GATE DRAFT: NO
PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED
Gate Result: NOT_PERFORMED
IMP036I_PRODUCT_DEFINITION: DRAFT_READY_FOR_GATE
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
Product Definition Version: PD-IMP-036I-DRAFT-3
Business Outcome: Defined (§2)
Primary Personas: PERSONA-CUSTOMER; PERSONA-WORKFORCE-OPERATOR (Outlet Manager / Kitchen / Delivery Coordinator contexts); PERSONA-PLATFORM-OPERATOR where config needs it (§4)
Journeys Defined: ASAP protect + Scheduled Pickup/Delivery + switches + Ops (§6)
Story Map Complete: YES (§7) — US-036I-001…016
Acceptance Slice Defined: YES (§8) — AC-036I-001…066
Happy Paths Defined: YES (Scheduled Pickup + Scheduled Delivery)
Alternate Paths Defined: YES (empty times, switches, pre-pay invalid, post-pay recovery, sealing)
Empty / First-Use States Defined: YES (§12–13)
Error / Recovery Paths Defined: YES (incl. Brand cutoff AT OR AFTER deny + support/Outlet recovery; stale checkout reconfirm)
Authorization Variants Defined: YES (§14; AC-036I-034; Brand cutoff config AC-036I-056…058)
Cross-Scope Scenarios Defined: YES (Ops scope deny; Delivery fail-closed on Pickup)
Concurrency Considered: YES (§17; payment-bound vs Brand change; failed-attempt re-evaluation)
Destructive Actions Defined: YES (cancel/refund; no self-service reschedule — cancel + new Order; BR-036I-019 sealing)
UX State Matrix Complete: YES (§13)
Accessibility Considered: YES (§18; AC-036I-021/052 mandatory)
Golden Journeys Identified: YES (§20)
Explicit Deferrals Recorded: YES (§23–24)
Unresolved Product Decisions: 0 (FD-036I-01…15 Founder-resolved 2026-09-24 incl. FD-036I-09 sealing amendment; FD-036I-16…22 existing authority)
Architecture Conflicts: NONE identified at product layer; Fit questions handed off unanswered
PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED
Gate Result: NOT_PERFORMED
READY_FOR_PRODUCT_DEFINITION_GATE: YES
```

Product Definition Gate is ready to be performed independently against CURRENT
`PD-IMP-036I-DRAFT-3`. Historical `PD-IMP-036I-DRAFT-1` Gate Result was **STOP**
(review `5305796113`) and historical `PD-IMP-036I-DRAFT-2` Gate Result was **STOP**
(review `5306341697`) — §1.1 — not PASS. Gate PASS on DRAFT-3 would still not perform
Architecture Fit, lock architecture, authorize implementation, or accept IMP-036I. This
draft does **not** claim APPROVED or Gate PASS.

```text
CURRENT tip anchors (this draft): GTM-R151 / STATE-R149
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
PRODUCT REQUIREMENT     — binding user/business promise in this draft (subject to Gate)
ARCHITECTURE CANDIDATE  — Fit hypothesis; not locked
IMPLEMENTATION DETAIL   — forbidden inventiveness in this artifact (schema/API/queues/cron/workers/UI widgets)
ARCHITECTURE_FIT_REQUIRED — mechanism question handed to Fit; unanswered here
RESOLVED — Founder      — Founder FD-036I-01…15 resolved 2026-09-24
RESOLVED_BY_EXISTING_AUTHORITY — continuity proven by repository; not a new Founder pick (FD-036I-16…22)
OPEN                    — no longer applies to FD-036I-01…15; reserved vocabulary for any future OPEN items
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
