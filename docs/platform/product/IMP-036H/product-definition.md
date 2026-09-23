<!-- governance-meta
{
  "status": "PRE_GATE_DRAFT",
  "authority": "PRODUCT_DEFINITION",
  "capability": "IMP-036H",
  "productDefinitionVersion": "PD-IMP-036H-DRAFT-1",
  "process": "PD-1",
  "verificationPolicy": "TEST-1",
  "lastReviewed": "2026-09-23",
  "productDefinitionGateExecution": "NOT_PERFORMED",
  "productDefinitionGateResult": "NOT_PERFORMED",
  "architectureFitExecution": "NOT_PERFORMED",
  "architectureFit": "NOT_PERFORMED",
  "architectureLocked": "NO",
  "implementationAuthorized": "NO",
  "implementationStarted": "NO",
  "impAccepted": "NO",
  "imp036hActivated": "YES",
  "imp036iActivated": "NO",
  "founderUatRequired": "YES",
  "founderUatStatus": "NOT_PERFORMED",
  "founderDecisions": 21,
  "unresolvedProductDecisions": 0,
  "readyForProductDefinitionGate": "YES",
  "preGateDraft": "YES",
  "documentStatus": "DRAFT_READY_FOR_GATE"
}
-->

# IMP-036H — Customer Pickup / Takeaway

## Product Definition (PRE-GATE DRAFT — Product Definition Gate NOT_PERFORMED)

```text
Document status: PRE-GATE DRAFT / DRAFT_READY_FOR_GATE
PRODUCT_DEFINITION_VERSION: PD-IMP-036H-DRAFT-1
PRE-GATE DRAFT: YES
CAPABILITY: IMP-036H
TITLE: Customer Pickup / Takeaway
AUTHORITY: PRODUCT_DEFINITION
PROCESS: PD-1
VERIFICATION_POLICY: TEST-1

PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED
Gate Result: NOT_PERFORMED
ARCHITECTURE_FIT_EXECUTION: NOT_PERFORMED
ARCHITECTURE_FIT: NOT_PERFORMED
ARCHITECTURE_LOCKED: NO
IMP036H_ACTIVATED: YES
IMPLEMENTATION_AUTHORIZED: NO
IMPLEMENTATION_STARTED: NO
IMP036H_ACCEPTED: NO
IMP036I_ACTIVATED: NO
FOUNDER_UAT_REQUIRED: YES
FOUNDER_UAT_STATUS: NOT_PERFORMED

PRODUCT_DECISIONS: 21
FOUNDER_DECISIONS: 21 (FD-036H-01 … FD-036H-21)
UNRESOLVED_MATERIAL_PRODUCT_DECISIONS: 0
UNRESOLVED_PRODUCT_DECISIONS: 0
OPEN_FOUNDER_DECISIONS: 0
READY_FOR_PRODUCT_DEFINITION_GATE: YES

FOUNDER_APPROVAL_PROVENANCE:
  DATE: 2026-09-23
  AUTHORITY: Founder
  CONFIRMATION: Founder-authorized pre-GTM insertion + resolved product decisions
                FD-036H-01…21 in the IMP-036H Product Definition + governance
                activation mandate (Cursor session)

stories: 9
acceptance_scenarios: 31
business_rules: 12
```

This artifact is the **gate-ready PRE-GATE Product Definition candidate** for
`PD-IMP-036H-DRAFT-1`, with Founder product decisions FD-036H-01…21 resolved. It persists
Founder-approved pickup / takeaway product requirements without executing the Product Definition
Gate, Architecture Fit, architecture lock, implementation authorization, schema/API design, or
Founder UAT.

```text
Founder decision resolution
  !=
Product Definition Gate PASS
```

```text
IMP036H_ACTIVATED: YES
  (ROADMAP / STATE activation authority)
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
PRODUCT REQUIREMENT
  = what customer / workforce / commercial pickup outcomes BOBA Bear promises and must prove

ARCHITECTURE CANDIDATE
  = hypothesized Fit mechanism within existing ADRs / ARCH-R21 — not locked; not authoritative

IMPLEMENTATION DETAIL
  = schema fields, API shapes, UI components, transport paths — out of scope for this draft
```

This Product Definition defines **PRODUCT REQUIREMENTS** only. It does **not** invent or lock
Architecture Fit mechanisms. Architecture Fit handoff questions (§21 / Appendix A) remain open.

```text
PRODUCT_DELIVERY_PROCESS_EFFECTIVE_FROM = IMP-036F
HISTORICAL_ACCEPTED_IMPS_REWRITTEN = NO
IMP036E_LIFECYCLE_CHANGED = NO
PD1_DID_NOT_ACTIVATE_IMP036F_AT_ADOPTION = YES
```

### Program context (CURRENT tip targets — verify against ROADMAP/STATE)

Lifecycle truth remains ROADMAP/STATE only. Intended CURRENT tip for this activation tranche
(persisted by companion governance PR; this Product Definition is **not** lifecycle authority):

```text
acceptedThrough = IMP-036G
currentProductSlice = IMP-036H
IMP036H_ACTIVATED: YES
IMP036H_PRODUCT_DEFINITION: DRAFT_READY_FOR_GATE (PD-IMP-036H-DRAFT-1)
IMP036H_PRODUCT_DEFINITION_GATE: NOT_PERFORMED
IMP036H_ARCHITECTURE_FIT: NOT_PERFORMED
IMP036H_ARCHITECTURE_LOCKED: NO
IMP036H_IMPLEMENTATION_AUTHORIZED: NO
IMP036H_IMPLEMENTATION_STARTED: NO
IMP036H_ACCEPTED: NO

IMP036I: PLANNED / NOT_ACTIVATED
IMP037: HOLD / BLOCKED_PROVIDER_ACCESS (historical progress preserved; not accepted)
IMP038: HOLD / IMPLEMENTATION_COMPLETE / NOT_ACCEPTED
       external assessment: DEFERRED_UNTIL_PRE_GTM_APPLICATION_SCOPE_STABILIZES
       frozen runtime dc6b19e6… remains historical evidence only
       GAP-EXT-ASSESS-001: NOT closed by this draft
IMP039: NOT_ACTIVATED / HOLD
IMP040: NOT_ACTIVATED / HOLD

D-377: program pause / pre-GTM insertion authority (DR-19 target)
Canonical anchors for this draft: VISION-1; ROADMAP GTM-R141; STATE STATE-R139;
ARCHITECTURE ARCH-R21; decision-register DR-19 (D-377); PD-1; TEST-1; PERSONA-1; GJ-1
```

Presence of this PRE-GATE draft does **not** claim Product Definition Gate PASS, Architecture Fit
PASS, architecture lock, implementation authorization, or IMP acceptance.

---

## 1. Identity / version / status

| Field | Definition |
|---|---|
| Capability / title | `IMP-036H — Customer Pickup / Takeaway` (ROADMAP identity; activated product slice; Product Definition still PRE-GATE DRAFT) |
| Product Definition version / document status | `PD-IMP-036H-DRAFT-1`; **Document status: PRE-GATE DRAFT / DRAFT_READY_FOR_GATE**; **PRE-GATE DRAFT: YES** |
| Product owner / approval evidence | Founder. FD-036H-01…21 resolved 2026-09-23 via Founder-authorized pre-GTM Product Definition + governance activation mandate. Product Definition Gate **NOT_PERFORMED**. |
| Process / verification policy | `PD-1` / `TEST-1` |
| Canonical anchors | VISION-1; ROADMAP GTM-R141; STATE STATE-R139; ARCH-R21; DR-19 (D-377); PD-1; TEST-1; PERSONA-1; GJ-1 |
| Repository candidate | Activation draft on branch `governance/imp036h-product-definition-activation`; verified base `main` HEAD `c1540f61dcb39a67226ff3a17170c7391d20c019` (pre-PR base). Final HEAD / tree / content-sensitive fingerprint will differ after this PR lands — treat those as post-merge authority, not this draft's fixed candidate identity. Canonical path `/home/ajoshi/repos/boba-bear-platform`. |
| Capability lifecycle / authorization | ROADMAP/STATE (target): `IMP036H_ACTIVATED: YES`; `currentProductSlice = IMP-036H`; Product Definition `DRAFT_READY_FOR_GATE`; Gate **NOT_PERFORMED**; Architecture Fit **NOT_PERFORMED**; architecture **NOT_LOCKED**; implementation **NOT_AUTHORIZED** / **NOT_STARTED**; `IMP036H_ACCEPTED: NO`. |
| Relevant capability architecture / ADRs | No locked IMP-036H capability architecture yet. Binding foundations (reference only): ADR-008 serviceability/cart/checkout; ADR-011 delivery providers/dispatch/fulfilment; ADR-007 tax/GST; ADR-012 notifications; accepted IMP-036B/C/D order/payment/delivery commerce; ARCH-R21. **Architecture Fit must produce the locked capability artifact before implementation.** |
| Founder UAT applicability | `FOUNDER_UAT_REQUIRED = YES`; `FOUNDER_UAT_STATUS = NOT_PERFORMED` — materially changes customer checkout/fulfilment and workforce handover (customer-visible Pickup path + Ops fulfilment). |

Behaviour classification vocabulary:

```text
CURRENT_SUPPORTED
PLANNED_IMP036H
FOLLOW_UP
DEFERRED
NOT_SUPPORTED
ARCHITECTURE_FIT_REQUIRED
ARCHITECTURE_CANDIDATE
FOUNDER_APPROVED_PRODUCT_REQUIREMENT
PRODUCT_DECISION_REQUIRED
UNRESOLVED_DECISION_REQUIRED
```

Architecture Fit hypotheses only (**ARCHITECTURE CANDIDATE** — not locked):

```text
NEW_SERVICE: likely NO
NEW_AUTH_MODEL: NO
NEW_ROLE: NO
NEW_PERMISSION: NO (assumption: reuse order.fulfil — Fit must verify; escalate if false)
NEW_RBAC_MODEL: NO
SEPARATE_PICKUP_ORDER_AGGREGATE: NO (product requirement)
PICKUP_USES_DELIVERY_AGGREGATE: NO (product requirement — fail closed)
IMP036H_SCHEDULED_FULFILMENT: NO
SCHEMA_OR_DATA_CONTRACT_CHANGE: likely YES (Fit decides strategy)
MIGRATION_REQUIRED: Fit decides
D374_REQUIRED_FOR_LOCK: do not create automatically
ARCH_R22_REQUIRED: do not create automatically for Product Definition alone
```

---

## 2. Business outcome

Authenticated customers can place a direct BOBA Bear order for **Pickup** (take away from an enabled
BOBA Bear outlet / cloud kitchen) as an equal peer to **Delivery**, without delivery address, GPS,
Maps, PIN/serviceability destination, or delivery fee — and without inventing cash/COD, scheduling,
or a separate Pickup Order aggregate.

Authorized workforce can distinguish Pickup vs Delivery on the Ops list, inspect pickup-relevant
detail (without rider/delivery chrome), accept the Order under existing lifecycle, and complete
handover as **Handed to customer / Mark as picked up** → existing Order `FULFILLED`.

Observable success measures:

1. A customer completes Journey B (single-outlet ASAP Pickup) or Journey C (multi-outlet select)
   through payment → confirmation that clearly states Pickup → later FULFILLED via workforce handover.
2. Journey A (existing Delivery) does not regress (`GJ-FIRST-ORDER` delivery path remains green).
3. No Delivery aggregate is created or invoked for Pickup Orders; delivery fee is never charged for
   `fulfilmentMode = PICKUP`.
4. Privacy: Pickup customers are not forced through Maps / delivery geolocation / delivery address.

Links VISION owned direct-order commerce, customer convenience near cloud kitchens, delivery-cost
avoidance, and reduced third-party marketplace dependence — without claiming public GTM readiness.

---

## 3. Problem statement

**Who:** `PERSONA-CUSTOMER` (primary) and `PERSONA-WORKFORCE-OPERATOR` (Ops fulfilment).

**Problem:** BOBA Bear direct ordering today is delivery-centric. Customers who live close enough to
collect from an enabled outlet still face delivery fees, destination/serviceability friction, and/or
marketplace economics — even when pickup would better serve them and BOBA Bear.

**Verified CURRENT baseline (delivery-focused; pickup not customer-enabled):**

| Area | Classification | Summary |
|---|---|---|
| Customer Menu → Cart → authenticated checkout → Delivery destination → serviceability → pay → Order | `CURRENT_SUPPORTED` | Accepted IMP-036B/C commerce; `GJ-FIRST-ORDER` delivery path |
| Delivery aggregate / provider workflow for DELIVERY Orders | `CURRENT_SUPPORTED` | ADR-011 / accepted delivery foundations |
| Workforce Ops list / accept / fulfil / cancel for Delivery Orders | `CURRENT_SUPPORTED` | Accepted IMP-036D Ops |
| Customer-facing Pickup fulfilment choice | `PLANNED_IMP036H` | Domain mentions of pickup historically disabled / launch-deferred — not a customer V1 promise until this slice |
| ASAP Pickup without delivery address / fee | `PLANNED_IMP036H` | FD-036H-01…08 |
| Scheduled Pickup / Delivery | `DEFERRED` | IMP-036I reservation only |
| Cash / COD / pay-at-counter | `NOT_SUPPORTED` | FD-036H-03 |

Do not treat historical ADR notes that “pickup remains in the domain model but disabled at launch”
as accepted customer Pickup behaviour.

---

## 4. Primary personas

| Persona ID | Responsibility / goal in this slice | Context / evidence |
|---|---|---|
| `PERSONA-CUSTOMER` (primary) | Choose Pickup or Delivery; complete authenticated ASAP checkout for the chosen mode; understand pickup location / instructions / commercial total; receive fulfilment-aware confirmation and history | [personas.md](../personas.md) PERSONA-1; VISION direct-order customer; IMP-036B/C. **Persona ≠ role ≠ permission ≠ authorization.** |
| `PERSONA-WORKFORCE-OPERATOR` (primary Ops) | Identify Pickup vs Delivery; accept Pickup Orders; hand over to customer → FULFILLED; avoid meaningless delivery/rider controls on Pickup | [personas.md](../personas.md); IMP-036D Ops. **Persona ≠ role ≠ permission ≠ authorization.** |

No new persona. Authorization authority is §14 (`order.fulfil` reuse is an **ARCHITECTURE CANDIDATE** pending Fit verification per FD-036H-14).

---

## 5. Current-state journey

| Journey ID / evidence | Entry / preconditions | Activities today | Existing outcome / gap |
|---|---|---|---|
| `JOURNEY-FIRST-ORDER` / `GJ-FIRST-ORDER` (Delivery) | Guest→auth customer; cart; serviceable destination | Browse → Cart → Sign in → Checkout → Delivery destination → serviceability → review → pay → Order → delivery workflow → FULFILLED | `CURRENT_SUPPORTED` delivery path; **must not regress** |
| Ops Delivery fulfilment | Authorized Ops with order permissions | List Orders → open → accept → dispatch/delivery controls → fulfil | `CURRENT_SUPPORTED` for Delivery; **no Pickup badge / handover language** |
| Customer Pickup choice | N/A today as enabled V1 path | N/A | Gap: no customer Pickup fulfilment peer to Delivery |

---

## 6. Desired-state journey

| Journey ID | Entry / context | Ordered activities | Success / downstream outcome | Alternate / recovery paths |
|---|---|---|---|---|
| `JOURNEY-H-A-DELIVERY` (protect) | Authenticated checkout; Delivery chosen | Browse → Cart → Sign in → Checkout → Choose Delivery → destination → serviceability → commercial review → payment → Order → delivery workflow → FULFILLED | Existing Delivery success; no Pickup regression | Existing payment recovery / cancellation / serviceability failures |
| `JOURNEY-H-B-SINGLE-PICKUP` | Exactly one eligible pickup outlet | Browse → Cart → Sign in → Checkout → Choose Pickup → AUTO_SELECT outlet → show location/instructions → validate merchandise/commercial (no delivery fee; packaging applies) → payment → Order placed → workforce accept → customer arrives → handover → FULFILLED | Pickup Order without Delivery aggregate | Ineligible merchandise; payment failure; cancel/refund |
| `JOURNEY-H-C-MULTI-PICKUP` | Multiple eligible pickup outlets | Choose Pickup → list eligible outlets → customer selects → validate cart at selected outlet → review → pay | Selected outlet visible pre-payment; immutable on paid snapshot | Outlet cannot fulfil → recoverable (other outlet / modify cart / switch to Delivery if valid); **no silent switch** |
| `JOURNEY-H-D-UNAVAILABLE` | Selected outlet cannot fulfil cart item(s) | Attempt continue / pay | Recoverable outcome; no silent item removal | Choose another outlet; modify cart; switch to Delivery if valid |
| `JOURNEY-H-E-DELIVERY-TO-PICKUP` | Pre-payment; was Delivery | Switch to Pickup | Delivery-only inputs stop affecting commercial result; delivery fee disappears; pickup outlet path applies | Eligibility failures as B/C/D |
| `JOURNEY-H-F-PICKUP-TO-DELIVERY` | Pre-payment; was Pickup | Switch to Delivery | Must complete destination/serviceability before payment | Serviceability deny / destination required |
| `JOURNEY-H-G-PAYMENT-PENDING` | Payment already pending / bound to immutable snapshot | Attempt fulfilment-mode mutation | Mutation that would invalidate bound payment fails safely; recovery coherent with existing payment authority | Cancel/recover payment per existing rules; start new order if authorized |
| `JOURNEY-H-OPS-LIST` | Authorized Ops | Open Ops Order list | Every Order badges DELIVERY or PICKUP | Unauthorized → deny |
| `JOURNEY-H-OPS-PICKUP-DETAIL` | Authorized Ops; Pickup Order | Open detail | Shows order #, authorized customer info, items, fulfilment=Pickup, pickup outlet, payment state, lifecycle controls; **no** rider booking / provider / tracking / delivery proof | Unauthorized → deny |
| `JOURNEY-H-OPS-HANDOVER` | Authorized Ops; ACCEPTED Pickup Order | Handed to customer / Mark as picked up | Order → FULFILLED; audit/provenance preserved; no fake Delivery completion | Unauthorized cannot fulfil; Delivery Orders keep existing path |

Central product concept:

> As a customer, I can choose Pickup or Delivery before paying; for Pickup I collect from an enabled
> BOBA Bear outlet without delivery address or delivery fee. As Ops, I can see Pickup clearly and
> mark the Order fulfilled when I hand it to the customer.

---

## 7. Story map

| Business outcome | Persona | Journey | Activity | Story IDs | Slice classification |
|---|---|---|---|---|---|
| Fulfilment choice | `PERSONA-CUSTOMER` | A/B/E/F | Choose Delivery or Pickup (ASAP only) | `US-036H-001` | `V1_ACCEPTANCE_SLICE` |
| Outlet selection | `PERSONA-CUSTOMER` | B/C/D | Auto-select or select eligible pickup outlet; recoverable mismatch | `US-036H-002` | `V1_ACCEPTANCE_SLICE` |
| Commercial rules | `PERSONA-CUSTOMER` | B/C/E | No delivery fee; packaging/tax/promotions via existing authorities | `US-036H-003` | `V1_ACCEPTANCE_SLICE` |
| Payment | `PERSONA-CUSTOMER` | B/C | Online payment / zero-payable where already authorized; Order materializes once | `US-036H-004` | `V1_ACCEPTANCE_SLICE` |
| Confirmation & history | `PERSONA-CUSTOMER` | B/C | Pre-pay confirmation + post-order Pickup clarity; no delivery tracking | `US-036H-005` | `V1_ACCEPTANCE_SLICE` |
| Workforce handover | `PERSONA-WORKFORCE-OPERATOR` | Ops list/detail/handover | Badge, pickup detail, accept, hand over → FULFILLED | `US-036H-006` | `V1_ACCEPTANCE_SLICE` |
| Notifications | `PERSONA-CUSTOMER` (+ Ops side-effects) | B + lifecycle | Fulfilment-aware messaging; no rider/delivery language for Pickup | `US-036H-007` | `V1_ACCEPTANCE_SLICE` |
| Mode switching | `PERSONA-CUSTOMER` | E/F | Pre-payment Delivery↔Pickup recalculation / destination requirements | `US-036H-008` | `V1_ACCEPTANCE_SLICE` |
| Payment-pending mutation safety | `PERSONA-CUSTOMER` | G | Block unsafe fulfilment mutation once payment bound; coherent recovery | `US-036H-009` | `V1_ACCEPTANCE_SLICE` |
| Scheduled fulfilment | — | — | ASAP/SCHEDULED timing | — | `DEFERRED` → IMP-036I |
| Cash/COD/curbside/OTP/no-show penalties | — | — | — | — | `NOT_SUPPORTED` |

---

## 8. Acceptance slice

| Slice | Mandatory story IDs | Mandatory AC IDs | Required Golden Journeys | Observable acceptance boundary |
|---|---|---|---|---|
| `V1_ACCEPTANCE_SLICE` | `US-036H-001` … `US-036H-009` | `AC-036H-001` … `AC-036H-031` (all mandatory YES unless noted) | `GJ-FIRST-ORDER` extended for Pickup path; Delivery path must not regress; `GJ-PAYMENT-RECOVERY` continuity where payment pending; `GJ-CANCELLATION-REFUND` continuity | Customer completes ASAP Pickup (single or multi outlet) with correct commercial/privacy/confirmation outcomes; Ops hands over to FULFILLED; Delivery remains green; no Delivery aggregate for Pickup |
| `FOLLOW_UP` | Pickup UX polish beyond mandatory clarity; optional coordinates display if Fit justifies | As defined later | N/A unless GJ impacted | Not silently required for V1 |
| `DEFERRED` | Scheduled Pickup/Delivery (IMP-036I); kitchen prep statuses; OTP/QR proof; no-show penalties; pickup-specific discounts | N/A | N/A | Explicit non-goals / future Product Definition |

Disposition vocabulary for §§22–25: `SUPPORTED_NOW`, `EXPLICITLY_DEFERRED`,
`NOT_SUPPORTED_BY_DESIGN`, `UNRESOLVED_DECISION_REQUIRED` (**active unresolved count = 0**).

---

## 9. User stories

### US-036H-001 — Fulfilment choice (Delivery + Pickup, ASAP)

```text
Story ID: US-036H-001
As a PERSONA-CUSTOMER
I want to choose Delivery or Pickup during authenticated checkout
so that I can collect from BOBA Bear when delivery is unnecessary.

Journey / activity: JOURNEY-H-A / JOURNEY-H-B; fulfilment mode selection
Preconditions: Authenticated customer; non-empty cart; checkout entered
Acceptance scenarios: AC-036H-001, AC-036H-002, AC-036H-021, AC-036H-022, AC-036H-031
Business rules: BR-036H-001, BR-036H-002, BR-036H-012
UX states: Fulfilment choice ready; loading; validation (no eligible pickup); error/recovery
Permission / resource context: Existing customer checkout identity; no new role
Error / recovery: If Pickup unavailable (no eligible outlet), clear messaging; Delivery remains available where valid
Dependencies: Accepted IMP-036B/C checkout; FD-036H-01, FD-036H-02, FD-036H-17, FD-036H-21
Explicit non-goals: Scheduling UI; cash; calling Pickup a form of Delivery
Data implications: Order exposes fulfilment mode (product requirement). Durable placement = Architecture Fit
Security implications: Preserve authenticated checkout; no anonymous Pickup
Architecture fit / applicable invariants: ARCHITECTURE_FIT_REQUIRED — where mode lives; checkout conditional destination
Open material decisions: NONE (FD-036H-01, 02, 17, 21)
Readiness: READY for Product Definition Gate; NOT_READY_FOR_IMPLEMENTATION until Fit/lock + authorization
```

### US-036H-002 — Pickup outlet selection & eligibility

```text
Story ID: US-036H-002
As a PERSONA-CUSTOMER
I want the correct eligible pickup outlet auto-selected or selectable
so that I know where to collect and merchandise can actually be fulfilled there.

Journey / activity: JOURNEY-H-B / C / D
Preconditions: Pickup chosen; one or more eligible pickup-enabled active outlets
Acceptance scenarios: AC-036H-003, AC-036H-004, AC-036H-005, AC-036H-006, AC-036H-007
Business rules: BR-036H-006, BR-036H-007, BR-036H-011
UX states: Auto-selected display; multi-select list; outlet-cannot-fulfil recoverable; stale/ineligible outlet
Permission / resource context: Customer checkout; outlet eligibility is server-authoritative
Error / recovery: Inactive/pickup-disabled excluded; cannot-fulfil → choose other outlet / modify cart / switch to Delivery if valid; no silent outlet switch; no silent item removal
Dependencies: FD-036H-05, FD-036H-06, FD-036H-16; outlet profile/config authority (Fit)
Explicit non-goals: Curbside; lockers; drive-through; forced Maps selection
Data implications: Selected outlet visible pre-payment; immutable for paid commercial snapshot (product requirement)
Security implications: Do not expose unauthorized outlet internals beyond customer-facing pickup info
Architecture fit / applicable invariants: Eligibility representation; outlet profile boundary; bind to snapshot/order
Open material decisions: NONE
Readiness: READY for PD Gate; NOT_READY_FOR_IMPLEMENTATION until Fit/lock + authorization
```

### US-036H-003 — Commercial rules (fee, packaging, tax, promotions)

```text
Story ID: US-036H-003
As a PERSONA-CUSTOMER
I want Pickup commercial totals to exclude delivery fee while preserving packaging/tax/promotions
so that pricing remains truthful and fair.

Journey / activity: JOURNEY-H-B / C / E commercial review
Preconditions: Pickup selected; commercial snapshot evaluated
Acceptance scenarios: AC-036H-008, AC-036H-009, AC-036H-010, AC-036H-011
Business rules: BR-036H-003, BR-036H-009
UX states: Review with explicit absence of delivery fee; packaging line where applicable
Permission / resource context: Existing commercial authorities
Error / recovery: If commercial evaluation fails, recoverable using existing checkout error patterns
Dependencies: FD-036H-07, FD-036H-08, FD-036H-09; ADR-007 / pricing / promotions authorities
Explicit non-goals: Separate pickup pricing engine; V1 pickup-specific discounts
Data implications: Commercial snapshot must encode fulfilment-aware charges without inventing new pricing domain
Security implications: No client-trusted fee suppression — server-authoritative commercial truth
Architecture fit / applicable invariants: Structural exclusion of delivery charges for Pickup
Open material decisions: NONE
Readiness: READY for PD Gate; NOT_READY_FOR_IMPLEMENTATION until Fit/lock + authorization
```

### US-036H-004 — Pickup payment & Order materialization

```text
Story ID: US-036H-004
As a PERSONA-CUSTOMER
I want to pay online for Pickup (or zero-payable where already authorized)
so that my Order is created once without Delivery provider involvement.

Journey / activity: JOURNEY-H-B / C payment → placed
Preconditions: Valid Pickup commercial snapshot; online payment authority
Acceptance scenarios: AC-036H-012, AC-036H-013, AC-036H-014, AC-036H-015, AC-036H-016, AC-036H-028
Business rules: BR-036H-008, BR-036H-009, BR-036H-010
UX states: Payment pending; success; failure/retry per existing GJ-PAYMENT-RECOVERY
Permission / resource context: Existing payment permissions/identity
Error / recovery: Existing payment failure/retry; never invent cash/COD path
Dependencies: FD-036H-03, FD-036H-10, FD-036H-13; Razorpay/payment foundations
Explicit non-goals: Cash on pickup; pay at counter; COD; new payment provider
Data implications: Single Order with fulfilment mode; no PickupOrder aggregate; no Delivery aggregate for Pickup
Security implications: Existing payment trust boundaries; fail closed if Delivery invoked for Pickup
Architecture fit / applicable invariants: Delivery fail-closed; Order identity; financial documents correctness
Open material decisions: NONE
Readiness: READY for PD Gate; NOT_READY_FOR_IMPLEMENTATION until Fit/lock + authorization
```

### US-036H-005 — Pre-pay confirmation & post-order Pickup clarity

```text
Story ID: US-036H-005
As a PERSONA-CUSTOMER
I want clear Pickup confirmation before payment and on order detail/history
so that I know where and how to collect, without delivery tracking noise.

Journey / activity: Confirmation + history
Preconditions: Pickup path with selected outlet
Acceptance scenarios: AC-036H-021, AC-036H-022, AC-036H-023, AC-036H-030
Business rules: BR-036H-004, BR-036H-011
UX states: Pre-pay confirmation ready; confirmation success; history/detail Pickup label
Permission / resource context: Customer owns own order projections
Error / recovery: Missing required pickup display fields → block pay with clear reason (product requirement)
Dependencies: FD-036H-15, FD-036H-16, FD-036H-20
Explicit non-goals: Forcing Maps/geo for placement; rider ETA
Data implications: Customer-facing pickup info: display name, address, city/state/postal, instructions; coordinates optional
Security implications: Privacy minimization — no forced delivery address/GPS/Maps for Pickup
Architecture fit / applicable invariants: Projection/fulfilment-aware customer views; optional coordinates policy
Open material decisions: NONE
Readiness: READY for PD Gate; NOT_READY_FOR_IMPLEMENTATION until Fit/lock + authorization
```

### US-036H-006 — Workforce Pickup badge, detail, handover

```text
Story ID: US-036H-006
As a PERSONA-WORKFORCE-OPERATOR
I want Pickup Orders clearly badged, detailed without delivery chrome, and handable to the customer
so that Ops can fulfil Pickup under the existing Order lifecycle.

Journey / activity: JOURNEY-H-OPS-LIST / DETAIL / HANDOVER
Preconditions: Authorized Ops session; Pickup Order in eligible lifecycle state
Acceptance scenarios: AC-036H-017, AC-036H-018, AC-036H-019, AC-036H-020
Business rules: BR-036H-010, BR-036H-008
UX states: List badge; detail ready; handover confirmation; unauthorized deny; success FULFILLED
Permission / resource context: Reuse existing order.fulfil if Fit confirms; no new role by default (FD-036H-14)
Error / recovery: Unauthorized cannot fulfil; Delivery Orders retain existing fulfilment UX
Dependencies: FD-036H-11, FD-036H-12, FD-036H-13, FD-036H-14; IMP-036D Ops
Explicit non-goals: PREPARING/READY_FOR_PICKUP statuses; fake Delivery completion; rider booking on Pickup
Data implications: Handover → existing FULFILLED; audit/provenance preserved
Security implications: Authorization must be server-enforced; negative AC for unauthorized fulfil
Architecture fit / applicable invariants: Confirm order.fulfil coverage; Ops projections fulfilment-aware
Open material decisions: NONE (permission reuse is Fit verification, not open product choice)
Readiness: READY for PD Gate; NOT_READY_FOR_IMPLEMENTATION until Fit/lock + authorization
```

### US-036H-007 — Fulfilment-aware notifications

```text
Story ID: US-036H-007
As a PERSONA-CUSTOMER
I want notifications that use Pickup language when my Order is Pickup
so that I am not told a rider is coming or shown delivery tracking.

Journey / activity: Lifecycle notifications
Preconditions: Pickup Order exists; notification events fire under existing ADR-012 authority
Acceptance scenarios: AC-036H-029
Business rules: BR-036H-009
UX states: N/A UI matrix primary; notification content outcomes
Permission / resource context: Existing notification recipient rules
Error / recovery: Prefer omit delivery-specific content over incorrect wording
Dependencies: FD-036H-19; ADR-012
Explicit non-goals: New notification platform; rider tracking for Pickup
Data implications: Content must be fulfilment-aware; mechanism = Fit
Security implications: Do not leak unnecessary location/provider data
Architecture fit / applicable invariants: How notifications distinguish modes
Open material decisions: NONE
Readiness: READY for PD Gate; NOT_READY_FOR_IMPLEMENTATION until Fit/lock + authorization
```

### US-036H-008 — Pre-payment fulfilment mode switching

```text
Story ID: US-036H-008
As a PERSONA-CUSTOMER
I want to switch between Delivery and Pickup before payment
so that my commercial and destination requirements stay coherent.

Journey / activity: JOURNEY-H-E / F
Preconditions: Pre-payment checkout; not payment-bound immutably
Acceptance scenarios: AC-036H-024, AC-036H-025
Business rules: BR-036H-002, BR-036H-003, BR-036H-004, BR-036H-005
UX states: Mode switch recalculating; destination required after switch to Delivery; fee removed after switch to Pickup
Permission / resource context: Customer checkout
Error / recovery: Incomplete Delivery destination blocks pay; Pickup eligibility failures as US-036H-002
Dependencies: FD-036H-04, FD-036H-07
Explicit non-goals: Post-payment silent mode rewrite
Data implications: Delivery-only information must not affect Pickup commercial result after switch
Security implications: Server re-evaluation required — no client-only fee hide
Architecture fit / applicable invariants: Conditional destination without corrupting delivery history
Open material decisions: NONE
Readiness: READY for PD Gate; NOT_READY_FOR_IMPLEMENTATION until Fit/lock + authorization
```

### US-036H-009 — Payment-pending mutation safety

```text
Story ID: US-036H-009
As a PERSONA-CUSTOMER
I want fulfilment-mode changes blocked (or safely recovered) once payment is pending/bound
so that I do not pay against a stale commercial snapshot.

Journey / activity: JOURNEY-H-G
Preconditions: Payment pending or bound to immutable commercial snapshot
Acceptance scenarios: AC-036H-026, AC-036H-027
Business rules: BR-036H-007, BR-036H-009
UX states: Mutation denied with clear reason; recovery aligned to existing payment cancel/retry/new-order authority
Permission / resource context: Existing payment authority first-class
Error / recovery: Fail safely; do not invalidate bound payment by silent mode mutation; use existing recovery paths
Dependencies: FD-036H-18 (cancel/refund continuity); D-361–D-363 payment foundations; GJ-PAYMENT-RECOVERY
Explicit non-goals: Inventing a new payment recovery model
Data implications: Paid snapshot outlet/mode immutability
Security implications: Prevent commercial tampering after payment bind
Architecture fit / applicable invariants: Align with existing immutable snapshot / payment concurrency authority
Open material decisions: NONE
Readiness: READY for PD Gate; NOT_READY_FOR_IMPLEMENTATION until Fit/lock + authorization
```

---

## 10. Acceptance scenarios

```text
AC-036H-001 — Delivery golden journey unchanged
Story: US-036H-001
Given an authenticated customer with a valid Delivery destination and serviceability
When they complete checkout choosing Delivery through payment and fulfilment
Then the existing Delivery Order path succeeds end-to-end
And Pickup-specific UI does not break or alter Delivery commercial/destination requirements
Mandatory in acceptance slice: YES
```

```text
AC-036H-002 — Pickup golden journey (ASAP)
Story: US-036H-001 / US-036H-004 / US-036H-006
Given an authenticated customer and at least one eligible pickup outlet that can fulfil the cart
When they choose Pickup, confirm location/commercials, pay online, Ops accepts, and Ops hands over
Then an Order is placed with fulfilment mode Pickup and later becomes FULFILLED
And no Delivery aggregate/provider workflow is used
Mandatory in acceptance slice: YES
```

```text
AC-036H-003 — Single pickup outlet auto-selection
Story: US-036H-002
Given exactly one eligible pickup-enabled active outlet
When the customer chooses Pickup
Then that outlet is AUTO_SELECTED and visible before payment
And the customer is not forced through a meaningless empty selector
Mandatory in acceptance slice: YES
```

```text
AC-036H-004 — Multiple pickup outlet selection
Story: US-036H-002
Given multiple eligible pickup-enabled active outlets
When the customer chooses Pickup
Then they must CUSTOMER_SELECT an outlet before payment
And the selected outlet is shown in confirmation
Mandatory in acceptance slice: YES
```

```text
AC-036H-005 — Pickup-disabled outlet excluded
Story: US-036H-002
Given an outlet that is active but pickup-disabled
When eligible pickup outlets are listed/auto-selected
Then that outlet is not offered for Pickup
Mandatory in acceptance slice: YES
```

```text
AC-036H-006 — Inactive outlet excluded
Story: US-036H-002
Given an outlet that is inactive
When eligible pickup outlets are listed/auto-selected
Then that outlet is not offered for Pickup
Mandatory in acceptance slice: YES
```

```text
AC-036H-007 — Selected outlet cannot fulfil a cart item
Story: US-036H-002
Given a selected pickup outlet that cannot fulfil one or more cart items
When the customer attempts to continue toward payment
Then they receive a recoverable outcome (other outlet / modify cart / switch to Delivery if valid)
And merchandise is not silently removed
And another outlet is not silently substituted after customer confirmation
Mandatory in acceptance slice: YES
```

```text
AC-036H-008 — Pickup has no delivery fee
Story: US-036H-003
Given fulfilment mode Pickup on the commercial snapshot
When totals are evaluated
Then delivery fee is absent / zero as a business invariant
And absence of delivery address does not invent a default delivery fee
Mandatory in acceptance slice: YES
```

```text
AC-036H-009 — Pickup still has valid packaging charge
Story: US-036H-003
Given existing packaging-charge policy would apply to the order
When Pickup commercial totals are evaluated
Then packaging charge still applies under existing policy
And no pickup-specific packaging discount is introduced by IMP-036H
Mandatory in acceptance slice: YES
```

```text
AC-036H-010 — Pickup taxes correct
Story: US-036H-003
Given existing GST/tax authorities
When Pickup commercial totals are evaluated
Then tax remains correct under existing authorities
And Pickup does not invent a separate tax engine
Mandatory in acceptance slice: YES
```

```text
AC-036H-011 — Pickup coupon/promotions preserve existing semantics
Story: US-036H-003
Given an applicable existing coupon/promotion
When applied on a Pickup checkout
Then existing promotion semantics are preserved
And V1 does not require pickup-specific promotions
Mandatory in acceptance slice: YES
```

```text
AC-036H-012 — Pickup payment succeeds
Story: US-036H-004
Given a valid payable Pickup snapshot
When the customer completes online payment successfully
Then payment succeeds under existing payment authority
And cash/COD/pay-at-counter are not offered
Mandatory in acceptance slice: YES
```

```text
AC-036H-013 — Zero-payable Pickup remains valid where existing rules permit
Story: US-036H-004
Given existing commercial rules produce a zero-payable total
When the customer completes Pickup checkout
Then zero-payable semantics remain valid where already authorized
And no cash collection workflow is introduced
Mandatory in acceptance slice: YES
```

```text
AC-036H-014 — Pickup Order materializes once / idempotently
Story: US-036H-004
Given a successful Pickup payment / placement attempt that may retry
When Order creation is observed
Then exactly one Order materializes for the successful placement (idempotent under existing authority)
And there is no separate PickupOrder aggregate
Mandatory in acceptance slice: YES
```

```text
AC-036H-015 — No Delivery aggregate created for Pickup
Story: US-036H-004
Given a successfully placed Pickup Order
When Delivery aggregates/workflows are inspected
Then none are created/requested/booked for that Order
Mandatory in acceptance slice: YES
```

```text
AC-036H-016 — Attempt to create Delivery for Pickup is rejected
Story: US-036H-004 / US-036H-006
Given a Pickup Order
When any actor/system attempts to invoke Delivery create/book/dispatch for it
Then the attempt fails safely / is rejected
And Delivery Orders remain unaffected
Mandatory in acceptance slice: YES
```

```text
AC-036H-017 — Workforce sees Pickup badge
Story: US-036H-006
Given authorized Ops viewing the Order list containing Delivery and Pickup Orders
When the list renders
Then every Order clearly identifies DELIVERY or PICKUP
Mandatory in acceptance slice: YES
```

```text
AC-036H-018 — Workforce can accept Pickup Order
Story: US-036H-006
Given an authorized operator and a PLACED Pickup Order
When they accept the Order under existing lifecycle
Then the Order becomes ACCEPTED
And no new PREPARING/READY_FOR_PICKUP status is required
Mandatory in acceptance slice: YES
```

```text
AC-036H-019 — Authorized workforce can hand over / fulfil Pickup Order
Story: US-036H-006
Given an ACCEPTED Pickup Order and an authorized operator
When they choose Handed to customer / Mark as picked up
Then the Order becomes FULFILLED
And audit/provenance is preserved
And this is not a fake Delivery completion
Mandatory in acceptance slice: YES
```

```text
AC-036H-020 — Unauthorized workforce cannot fulfil
Story: US-036H-006
Given an operator lacking fulfil authority for the Order resource
When they attempt Pickup handover / fulfil
Then the action is denied
And the Order lifecycle is unchanged
Mandatory in acceptance slice: YES
```

```text
AC-036H-021 — Customer confirmation clearly says Pickup
Story: US-036H-005
Given a customer on pre-payment Pickup confirmation
When confirmation is shown
Then it includes Pickup mode, selected location, customer-facing address/location, relevant instructions, commercial total, and explicit absence of delivery fee
Mandatory in acceptance slice: YES
```

```text
AC-036H-022 — Customer order history/detail shows Pickup
Story: US-036H-005
Given a placed Pickup Order owned by the customer
When they open confirmation/history/detail
Then fulfilment is clearly Pickup / take away from BOBA Bear
Mandatory in acceptance slice: YES
```

```text
AC-036H-023 — Delivery-specific tracking absent for Pickup
Story: US-036H-005 / US-036H-007
Given a Pickup Order in customer or Ops views
When tracking/delivery-provider surfaces are considered
Then rider/delivery tracking and delivery-proof controls are absent / not meaningful for Pickup
Mandatory in acceptance slice: YES
```

```text
AC-036H-024 — Delivery → Pickup before payment recalculates correctly
Story: US-036H-008
Given a pre-payment checkout currently on Delivery with a destination and delivery fee
When the customer switches to Pickup and completes eligible outlet selection
Then delivery fee disappears and delivery-only information no longer affects the Pickup commercial result
Mandatory in acceptance slice: YES
```

```text
AC-036H-025 — Pickup → Delivery before payment requires destination
Story: US-036H-008
Given a pre-payment checkout currently on Pickup
When the customer switches to Delivery
Then they must complete existing delivery-destination/serviceability before payment
And Delivery commercial rules apply
Mandatory in acceptance slice: YES
```

```text
AC-036H-026 — Mutation after payment pending fails safely / recovery coherent
Story: US-036H-009
Given payment is pending or bound to an immutable commercial snapshot
When the customer attempts a fulfilment-mode mutation that would invalidate that snapshot
Then the mutation is blocked or fails safely
And recovery follows existing payment/cancel/retry/new-order authority without silent rewrite
Mandatory in acceptance slice: YES
```

```text
AC-036H-027 — Cancellation/refund remains correct
Story: US-036H-009
Given a Pickup Order under existing cancellation/refund eligibility
When authorized cancellation and/or refund actions occur
Then existing cancellation/payment/refund authorities apply
And no V1 no-show financial penalty is applied
Mandatory in acceptance slice: YES
```

```text
AC-036H-028 — Financial-document issuance remains correct after fulfilment
Story: US-036H-004
Given a Pickup Order that reaches FULFILLED under existing financial-document rules
When financial documents are issued/inspected
Then issuance remains correct under existing authorities
And Pickup does not invent a separate financial-document model
Mandatory in acceptance slice: YES
```

```text
AC-036H-029 — Notifications use correct fulfilment wording
Story: US-036H-007
Given notification events for a Pickup Order
When customer-visible notification content is produced
Then wording is Pickup-aware
And it does not claim a rider is arriving or that delivery is on the way
Mandatory in acceptance slice: YES
```

```text
AC-036H-030 — Pickup does not invoke Maps/location APIs during normal journey
Story: US-036H-005
Given a customer completing a normal ASAP Pickup journey
When destination/Maps/geolocation steps would apply for Delivery
Then Pickup does not force Google Maps, delivery geolocation, delivery address creation, or delivery-serviceability checks
Mandatory in acceptance slice: YES
```

```text
AC-036H-031 — Existing delivery E2E remains green
Story: US-036H-001
Given the accepted Delivery E2E / GJ-FIRST-ORDER delivery proof suite
When IMP-036H Pickup is introduced
Then existing Delivery E2E remains green (no regression)
Mandatory in acceptance slice: YES
```

### Planned proof matrix (TEST-1)

| Story / AC ID | Required behaviour / risk | Applicable test layers | Planned proof | Actual evidence / candidate / result |
|---|---|---|---|---|
| AC-036H-001, 031 | Delivery non-regression | E2E / Golden Journey | Existing Delivery E2E + GJ-FIRST-ORDER delivery path | Planned only — NOT_PERFORMED |
| AC-036H-002…007 | Pickup path + outlet eligibility | Domain + API + E2E | New Pickup journey proofs after implementation authorization | Planned only |
| AC-036H-008…011 | Commercial invariants | Domain / commercial unit + checkout integration | Fee absence; packaging/tax/promo continuity | Planned only |
| AC-036H-012…016, 028 | Payment / Order / Delivery fail-closed / financial docs | Payment + Order + negative Delivery | Idempotent place; no Delivery aggregate; reject Delivery invoke | Planned only |
| AC-036H-017…020 | Ops badge/detail/handover + authz negative | Ops API/UI + authorization | Positive handover; unauthorized deny | Planned only |
| AC-036H-021…023, 029, 030 | Confirmation, privacy, notifications | E2E + notification content assertions | Pickup language; no Maps force; no rider copy | Planned only |
| AC-036H-024…027 | Mode switch + payment-pending safety + cancel/refund | Checkout concurrency + payment recovery | Switch recalcs; pending mutation fail-closed; refund continuity | Planned only |

Planned is **not** proven. Evidence populates after authorized implementation under TEST-1 (no silent-retry-as-pass).

---

## 11. Business rules

| Rule ID | User/business rule | Authority / rationale | Story / AC IDs |
|---|---|---|---|
| `BR-036H-001` | Every checkout/order has exactly one authoritative fulfilment mode. | FD-036H-01, FD-036H-10 | US-036H-001; AC-036H-001/002 |
| `BR-036H-002` | PICKUP and DELIVERY are mutually exclusive for one paid snapshot. | FD-036H-01; BR mutual exclusion | US-036H-001/008; AC-036H-024/025 |
| `BR-036H-003` | PICKUP must not incur a delivery charge (business invariant). | FD-036H-07 | US-036H-003; AC-036H-008/024 |
| `BR-036H-004` | PICKUP must not require a delivery destination. | FD-036H-04, FD-036H-20 | US-036H-005; AC-036H-030 |
| `BR-036H-005` | DELIVERY continues to require valid delivery destination/serviceability. | Existing ADR-008 / IMP-036B/C; FD-036H-04 | US-036H-001/008; AC-036H-001/025 |
| `BR-036H-006` | PICKUP requires a valid enabled pickup outlet. | FD-036H-05, FD-036H-06 | US-036H-002; AC-036H-003…006 |
| `BR-036H-007` | The selected pickup outlet is immutable for the paid commercial snapshot. | FD-036H-06; payment immutability foundations | US-036H-002/009; AC-036H-014/026 |
| `BR-036H-008` | Pickup Orders never invoke Delivery-provider execution. | FD-036H-13 | US-036H-004/006; AC-036H-015/016 |
| `BR-036H-009` | Existing commercial/payment/order truth remains authoritative. | FD-036H-09, FD-036H-18 | US-036H-003/004/009; AC-036H-010…013/027/028 |
| `BR-036H-010` | Pickup handover completes the existing Order lifecycle; no separate Pickup Order. | FD-036H-10…12 | US-036H-006; AC-036H-014/018/019 |
| `BR-036H-011` | No unnecessary delivery-location data is required for Pickup. | FD-036H-20 | US-036H-005; AC-036H-030 |
| `BR-036H-012` | Scheduled fulfilment is not part of IMP-036H (`IMP036H_SCHEDULED_FULFILMENT: NO`). | FD-036H-02, FD-036H-21; IMP-036I reservation | US-036H-001; non-goals |

---

## 12. Journey Completeness Matrix

Applies primarily to `JOURNEY-H-B` / `JOURNEY-H-C` (Pickup). Delivery Journey A inherits existing completeness and must not regress.

| Journey dimension | Behaviour / applicability or N/A reason | Story / AC references |
|---|---|---|
| ENTRY | Authenticated customer enters checkout from cart | US-036H-001; AC-036H-002 |
| DISCOVERY | Fulfilment choice presents Delivery + Pickup (customer term Pickup; supporting “Take away from BOBA Bear”) | US-036H-001; FD-036H-01 |
| CONTEXT | Selected mode + outlet + commercials shown before pay | US-036H-002/003/005; AC-036H-021 |
| EMPTY / FIRST USE | No eligible pickup outlet → clear empty/unavailable; Delivery may remain | US-036H-001/002 |
| HAPPY PATH | Single-outlet AUTO_SELECT or multi-select → pay → Ops accept → handover → FULFILLED | AC-036H-002…004/012/018/019 |
| ALTERNATE VALID PATHS | Mode switch E/F; zero-payable; multi-outlet | AC-036H-013/024/025 |
| VALIDATION FAILURE | Outlet cannot fulfil; packaging/tax/promo evaluation failures use existing patterns | AC-036H-007 |
| AUTHORIZATION | Customer owns checkout; Ops fulfil requires authority; unauthorized deny | AC-036H-020 |
| NOT FOUND / STALE REFERENCE | Stale outlet / ineligible after change → recoverable; no silent switch | AC-036H-005…007/026 |
| SERVER / NETWORK ERROR | Existing checkout/payment error/retry patterns | US-036H-004; GJ-PAYMENT-RECOVERY |
| RECOVERY | Other outlet / modify cart / switch mode / payment retry / cancel | AC-036H-007/026/027 |
| CONCURRENCY | Payment-pending mutation safety; paid snapshot immutability | AC-036H-026; US-036H-009 |
| DESTRUCTIVE ACTION | Cancellation/refund under existing authority; no V1 no-show penalty | AC-036H-027 |
| SUCCESS FEEDBACK | Confirmation + history show Pickup; Ops badge/detail | AC-036H-017/021/022 |
| DOWNSTREAM EFFECT | No Delivery aggregate; fulfilment-aware notifications; financial docs correct | AC-036H-015/016/028/029 |
| REVISIT / RELOAD | Reload preserves authoritative mode/outlet/payment state | US-036H-005/009 |
| RESPONSIVE / MOBILE | Checkout + Ops usable on supported mobile/desktop viewports | §18 |
| ACCESSIBILITY | Labels for mode, outlet, handover controls; focus on errors | §18 |

Workforce journeys (list/detail/handover) share AUTHORIZATION, SUCCESS FEEDBACK, DOWNSTREAM EFFECT rows via AC-036H-017…020.

---

## 13. UX state matrix

| Surface / state | Entry condition | Visible feedback / available actions | Focus / keyboard behaviour | Next / recovery state | AC ID or N/A reason |
|---|---|---|---|---|---|
| Checkout / fulfilment choice ready | Checkout loaded | Delivery and Pickup options; Pickup supporting text allowed | Focusable choice controls | Selected mode path | AC-036H-001/002 |
| Checkout / fulfilment choice loading | Evaluating eligibility | Loading indicator; no premature pay | Focus retained / announced busy | Ready or empty/error | N/A pattern |
| Checkout / no eligible pickup | Zero eligible outlets | Clear unavailable messaging; Delivery if valid | Focus error/help | Stay or choose Delivery | US-036H-001 |
| Pickup outlet AUTO_SELECT | Exactly one eligible | Selected outlet + instructions visible | Focus continues to review | Review/pay | AC-036H-003 |
| Pickup outlet select | Multiple eligible | List/select required before pay | Keyboard-selectable list | Review/pay | AC-036H-004 |
| Outlet cannot fulfil | Validation fail | Recoverable options; no silent remove | Focus error + actions | Other outlet / cart / Delivery | AC-036H-007 |
| Commercial review Pickup | Snapshot ready | Total; packaging; explicit no delivery fee | Focus review CTA | Payment | AC-036H-008/009/021 |
| Payment pending | Payment started | Existing pending UX; mode mutation blocked | Focus status | Success / fail / recover | AC-036H-012/026 |
| Payment success / confirmation | Order placed | Pickup confirmation language | Focus confirmation | History/detail | AC-036H-021/022 |
| Customer history Pickup | Order owned | Pickup label; no delivery tracking | Focus order row/detail | Detail | AC-036H-022/023 |
| Ops list badge | Authorized Ops | DELIVERY / PICKUP badge per Order | Focusable rows | Detail | AC-036H-017 |
| Ops Pickup detail | Pickup Order | Required fields; no rider/provider/tracking/proof | Focus lifecycle actions | Accept / handover | AC-036H-018 |
| Ops handover confirm | ACCEPTED Pickup | Handed to customer / Mark as picked up | Confirm control focusable | FULFILLED success | AC-036H-019 |
| Ops unauthorized | Missing permission | Deny; no state change | Focus deny message | Exit / other orders | AC-036H-020 |
| Server/network error | Transport fail | Existing retry messaging | Focus retry | Prior ready state | Existing patterns |
| Mode switch recalculating | Pre-pay switch | Temporary recalculating; then updated commercials | Announce update | Coherent mode path | AC-036H-024/025 |

---

## 14. Permissions / resource context

| Action | Existing identity / permission authority | Resource context / server-derived scope | Allowed / denied / cross-scope variants | AC IDs |
|---|---|---|---|---|
| Choose fulfilment mode / pay Pickup | Existing customer authenticated checkout identity | Customer-owned cart/checkout | Anonymous checkout NOT_SUPPORTED for Pickup | AC-036H-012; FD-036H-17 |
| Ops accept Pickup Order | Existing Ops order accept authority | Order resource in operator scope | Cross-scope deny per existing Ops rules | AC-036H-018 |
| Ops handover / fulfil Pickup | **ARCHITECTURE CANDIDATE:** reuse `order.fulfill` if Fit confirms against CURRENT access-control authority; **no new role** by default (FD-036H-14). If a new permission is genuinely necessary → escalate (Architecture/Product), do not invent in implementation | Order resource in operator scope | Unauthorized deny (negative AC) | AC-036H-019/020 |
| Invoke Delivery on Pickup Order | Must fail closed for all actors | Pickup Order | Always denied for Pickup | AC-036H-016 |
| Cancel / refund | Existing cancellation/refund permissions | Existing resource rules | No V1 no-show penalty path | AC-036H-027 |

Do not derive authorization from persona labels. Fit verification of `order.fulfill` is mandatory before implementation claims “no new permission.”

---

## 15. Data implications

**PRODUCT REQUIREMENTS (not schema):**

- A BOBA Bear Order remains an Order; it must expose fulfilment mode (no `PickupOrder` / `TakeawayOrder`).
- Paid commercial snapshot binds selected pickup outlet immutably.
- Pickup must not create/use a Delivery aggregate.
- Customer-facing pickup information required for enabled outlets: display name; address; city/state/postal; pickup instructions. Coordinates optional for navigation — not required merely to place a pickup order unless Fit demonstrates justified product need.
- Do not treat serviceability-origin coordinates as automatically equivalent to customer-facing pickup information.
- Historical Delivery Orders remain Delivery; migration/backward-compatibility strategy = Architecture Fit.
- `IMP036H_SCHEDULED_FULFILMENT: NO` — model may be extensible for IMP-036I but must not implement speculative scheduling fields without need.

**ARCHITECTURE CANDIDATES / Fit-owned:** durable storage of fulfilment mode; outlet eligibility representation; snapshot evolution/migration; projection shapes. **IMPLEMENTATION DETAIL:** table/column/API field names — out of scope here.

---

## 16. Security/privacy

| Requirement | Classification | Notes |
|---|---|---|
| Authenticated customer checkout preserved | PRODUCT REQUIREMENT | FD-036H-17 |
| Privacy minimization for Pickup — no forced Maps/geo/delivery address/serviceability | PRODUCT REQUIREMENT | FD-036H-20; AC-036H-030 |
| Server-authoritative commercials / eligibility / authorization | PRODUCT REQUIREMENT | Negative trust on client fee suppression |
| Ops sees only already-authorized customer information | PRODUCT REQUIREMENT | No new PII expansion claimed |
| Delivery fail-closed for Pickup | PRODUCT REQUIREMENT | FD-036H-13 |
| New auth realm / new role by default | NOT_SUPPORTED | FD-036H-14 |

Unresolved security product decisions: **NONE**. Mechanism choices remain Fit.

---

## 17. Concurrency/recovery

| Scenario | Required observable outcome | Authority link |
|---|---|---|
| Pre-payment mode switch | Recalculate; coherent destination/fee requirements | US-036H-008; AC-036H-024/025 |
| Payment pending / bound snapshot | Fulfilment mutation that invalidates snapshot fails safely; recovery via existing payment authority | US-036H-009; AC-036H-026; GJ-PAYMENT-RECOVERY |
| Duplicate placement retries | Idempotent single Order | AC-036H-014 |
| Outlet becomes ineligible after selection (pre-pay) | Recoverable; no silent switch | AC-036H-007 |
| Partial payment failure | Existing retry/fail paths | GJ-PAYMENT-RECOVERY |
| Cancellation/refund | Existing authorities; no no-show penalties | AC-036H-027; FD-036H-18 |

Do not invent new retry/idempotency semantics; align to accepted payment/order concurrency authority. Exact mechanisms = Architecture Fit.

---

## 18. Accessibility/responsive expectations

- Supported contexts: existing customer checkout and Ops surfaces on mobile and desktop viewports already targeted by IMP-036B/C/D.
- Fulfilment mode choice, outlet selection, confirmation summaries, and Ops handover controls must be keyboard reachable with visible focus and accessible names.
- Error/recovery messages (no eligible outlet; cannot fulfil; payment-pending mutation denied) must be programmatically associated with controls.
- Do not rely solely on automated a11y scans; include interactive scenarios in proof where material (TEST-1).

---

## 19. Observability/supportability / analytics

### Supportability

- Ops must identify Pickup vs Delivery at list and detail.
- Support/refund investigation uses existing Order/payment/audit evidence; Pickup must remain distinguishable.
- Do not require delivery-provider diagnostics for Pickup Orders.

### Analytics requirements (PRODUCT REQUIREMENT — metrics intent; not implementation mechanism)

At minimum, product analytics must be able to report:

```text
orders_by_fulfilment_mode
pickup_share_of_direct_orders
pickup_conversion_rate
pickup_average_order_value
pickup_cancellation_rate
repeat_pickup_customer_rate
delivery_to_pickup_switch_rate
pickup_to_delivery_switch_rate
```

Where cost data exists later (not invented here), useful business reporting may include:

```text
estimated_delivery_cost_avoided
```

Do not invent financial values. Collection/storage/dashboard tooling = Architecture Fit / later analytics capability — not locked here.

---

## 20. Golden Journeys affected

| GJ ID / registry status | Affected steps / downstream behaviour | Mandatory for this acceptance? | Related story / AC IDs | Required proof / actual evidence |
|---|---|---|---|---|
| `GJ-FIRST-ORDER` / CURRENT | **Extend** for Pickup ASAP path; **Delivery path must not regress** | YES | AC-036H-001/002/031 | Real-browser proof after implementation; result NOT_PERFORMED |
| `GJ-PAYMENT-RECOVERY` / CURRENT | Continuity when payment pending during Pickup; mutation safety | YES (continuity) | AC-036H-026 | Planned continuity proof |
| `GJ-CANCELLATION-REFUND` / CURRENT | Continuity for Pickup Orders; no new penalty model | YES (continuity) | AC-036H-027 | Planned continuity proof |
| `GJ-ADDRESS-SERVICEABILITY` / CURRENT | Delivery path unchanged; Pickup must not force address/serviceability | YES (negative for Pickup) | AC-036H-025/030 | Planned |
| `GJ-RETURNING-ORDER` / PARTIAL | May later use Pickup; no new Order Again semantics in IMP-036H | NO | — | N/A for V1 mandatory |
| Other GJs | No intentional change | NO unless regression risk found | — | Protect if touched |

Registry status is not a test verdict.

---

## 21. Dependencies

| Dependency | Authority / verified state | Required before which story or gate? | Unresolved impact |
|---|---|---|---|
| ROADMAP/STATE activation IMP-036H + program pause D-377 | GTM-R141 / STATE-R139 / DR-19 targets | This draft assumes activation markers exist or land with companion governance PR | Companion governance must not claim Gate PASS |
| Accepted commerce foundations IMP-036B/C/D | COMPLETE_AND_ACCEPTED through IMP-036G commercial/ops bases | All stories | NONE |
| Product Definition Gate PASS | NOT_PERFORMED | Before Architecture Fit | Gate not yet run |
| Architecture Fit PASS + locked capability | NOT_PERFORMED | Before implementation authorization | Fit questions 1–14 open (Appendix A) |
| Implementation authorization | NO | Before code/schema | NONE until authorized |
| IMP-036I Scheduled Fulfilment | PLANNED only | Not required for IMP-036H V1 | DEFERRED |
| IMP-037/038/039/040 | HOLD / NOT_ACTIVATED as program context | Must not be accepted/activated by this draft | Preserve freeze; do not claim GAP-EXT-ASSESS-001 closed |

### Architecture Fit handoff questions (explicitly NOT solved here)

1. Where should fulfilment mode live durably?
2. How should checkout destination become conditional without corrupting accepted delivery history?
3. What schema migration strategy safely evolves immutable snapshots?
4. What is the authoritative pickup-outlet profile/configuration boundary?
5. How is pickup eligibility represented?
6. How does selected pickup outlet bind to snapshot/order?
7. How are delivery charges excluded structurally for pickup?
8. How does Delivery fail closed for pickup Orders?
9. Can `order.fulfill` be reused without new permissions?
10. How do customer/workforce projections become fulfilment-aware?
11. How should notifications distinguish pickup/delivery?
12. How do financial documents remain correct?
13. How do existing snapshots/orders migrate or remain backward-compatible?
14. How does the model stay extensible for IMP-036I without prematurely implementing scheduling?

---

## 22. Supported now

| Behaviour | Existing verified or V1 acceptance commitment? | Story / AC IDs / source |
|---|---|---|
| Authenticated Delivery checkout → pay → Order → delivery fulfil | `CURRENT_SUPPORTED` (must not regress) | AC-036H-001/031; GJ-FIRST-ORDER |
| Ops Delivery list/accept/fulfil/cancel | `CURRENT_SUPPORTED` | IMP-036D |
| ASAP Pickup peer fulfilment mode | `PLANNED_IMP036H` V1 commitment | US-036H-001…009; AC-036H-002+ |
| Online payment only for Pickup | `PLANNED_IMP036H` | FD-036H-03; AC-036H-012 |
| No delivery fee for Pickup | `PLANNED_IMP036H` invariant | BR-036H-003; AC-036H-008 |
| Handover → existing FULFILLED | `PLANNED_IMP036H` | FD-036H-12; AC-036H-019 |

Proposed PLANNED behaviour is not accepted until gates pass.

---

## 23. Explicitly deferred

| `EXPLICITLY_DEFERRED` behaviour | FOLLOW_UP or DEFERRED | Reason / consequence | Revisit dependency / decision owner |
|---|---|---|---|
| Scheduled Pickup | DEFERRED | IMP-036I | Founder / IMP-036I Product Definition |
| Scheduled Delivery | DEFERRED | IMP-036I | Founder / IMP-036I Product Definition |
| Time-slot capacity / pre-order for tomorrow | DEFERRED | IMP-036I | Founder |
| Kitchen preparation lifecycle statuses (PREPARING, READY_FOR_PICKUP, etc.) | DEFERRED | Future kitchen/fulfilment capability | Founder |
| Pickup OTP/QR proof | DEFERRED / NOT_SUPPORTED for V1 | Out of V1 non-goals | Future decision |
| Customer no-show penalties / auto no-show cancel | DEFERRED / NOT_SUPPORTED for V1 | FD-036H-18 | Future decision |
| Pickup-specific discounts | DEFERRED | FD-036H-09 | Future commercial capability |
| Optional map/coordinates navigation aids | FOLLOW_UP | Coordinates optional; not required to place | Fit + UX follow-up |
| `estimated_delivery_cost_avoided` reporting | FOLLOW_UP | Requires later cost data; do not invent | Analytics / finance |

---

## 24. Not supported by design

| `NOT_SUPPORTED_BY_DESIGN` behaviour | Reason / authority | User-visible boundary / relevant AC |
|---|---|---|
| Cash on pickup / pay at counter / COD | FD-036H-03 | Not offered; AC-036H-012 |
| Calling Pickup a form of Delivery | FD-036H-01 | Distinct mode; AC-036H-017/022 |
| Separate PickupOrder aggregate | FD-036H-10 | Order exposes mode; AC-036H-014 |
| Delivery aggregate for Pickup | FD-036H-13 | Fail closed; AC-036H-015/016 |
| New role by default for Pickup | FD-036H-14 | Reuse or escalate |
| Curbside / drive-through / dine-in / table / QR table / lockers | Non-goals | Not offered |
| New payment provider / auth realm / loyalty system | Non-goals | Unchanged |
| Delivery provider redesign | Non-goals | Delivery path preserved |
| Scheduled fulfilment in IMP-036H | FD-036H-21; BR-036H-012 | No schedule UI; ASAP only |
| Silent outlet switch / silent merchandise removal | FD-036H-06 | AC-036H-007 |
| Rider arriving / delivery tracking for Pickup | FD-036H-19 | AC-036H-023/029 |
| Forced Maps/geo/delivery address for Pickup | FD-036H-20 | AC-036H-030 |

---

## 25. Unresolved / decision required

| `UNRESOLVED_DECISION_REQUIRED` item | Material user/business impact | Decision owner / evidence needed | Affected stories / gate |
|---|---|---|---|
| NONE | — | All FD-036H-01…21 resolved | — |

```text
UNRESOLVED_MATERIAL_PRODUCT_DECISIONS: 0
READY_FOR_PRODUCT_DEFINITION_GATE: YES
```

Architecture Fit questions (§21) are **mechanism** questions, not unresolved product decisions.

### Founder decisions register (resolved)

| FD ID | Decision summary | Status |
|---|---|---|
| FD-036H-01 | DELIVERY + PICKUP; customer term “Pickup”; supporting text “Take away from BOBA Bear”; not a form of delivery | RESOLVED |
| FD-036H-02 | ASAP only; scheduling deferred to IMP-036I | RESOLVED |
| FD-036H-03 | Online payment only; no cash/COD/pay-at-counter | RESOLVED |
| FD-036H-04 | Pickup does not require delivery address/GPS/Maps/PIN | RESOLVED |
| FD-036H-05 | AUTO_SELECT if one eligible; CUSTOMER_SELECTS if multiple; visible before payment | RESOLVED |
| FD-036H-06 | Inactive/pickup-disabled cannot accept; merchandise must be fulfillable; no silent outlet switch | RESOLVED |
| FD-036H-07 | PICKUP never charged delivery fee (business invariant) | RESOLVED |
| FD-036H-08 | Packaging charge still applies | RESOLVED |
| FD-036H-09 | Existing pricing/tax/promotions authorities; no separate pricing engine | RESOLVED |
| FD-036H-10 | No separate PickupOrder; Order exposes fulfilment mode | RESOLVED |
| FD-036H-11 | Existing PLACED→ACCEPTED→FULFILLED\|CANCELLED; no PREPARING/READY_FOR_PICKUP etc. | RESOLVED |
| FD-036H-12 | Handover = Handed to customer / Mark as picked up → FULFILLED; no fake Delivery completion | RESOLVED |
| FD-036H-13 | Pickup must not create/use Delivery aggregate | RESOLVED |
| FD-036H-14 | No new role; reuse order.fulfill if Architecture Fit confirms | RESOLVED (Fit verification remaining) |
| FD-036H-15 | Pre-payment confirmation requirements (mode, location, instructions, total, no delivery fee) | RESOLVED |
| FD-036H-16 | Pickup location info: display name, address, city/state/postal, instructions; coordinates optional | RESOLVED |
| FD-036H-17 | Authenticated customer checkout preserved | RESOLVED |
| FD-036H-18 | Existing cancellation/refund; no no-show penalties in V1 | RESOLVED |
| FD-036H-19 | Fulfilment-aware notifications; no rider/delivery tracking for Pickup | RESOLVED |
| FD-036H-20 | Privacy minimization — no forced Maps/geo/delivery address for Pickup | RESOLVED |
| FD-036H-21 | Scheduling readiness: extensible but `IMP036H_SCHEDULED_FULFILMENT: NO` | RESOLVED |

---

## 26. Definition of Ready

| Story ID | Applicable fields complete / evidence | Open material decisions | Readiness / blocker |
|---|---|---|---|
| US-036H-001 | §9 complete; ACs/BRs linked | NONE | READY for PD Gate; NOT_READY_FOR_IMPLEMENTATION until Fit/lock + auth |
| US-036H-002 | §9 complete | NONE | READY for PD Gate; NOT_READY_FOR_IMPLEMENTATION until Fit/lock + auth |
| US-036H-003 | §9 complete | NONE | READY for PD Gate; NOT_READY_FOR_IMPLEMENTATION until Fit/lock + auth |
| US-036H-004 | §9 complete | NONE | READY for PD Gate; NOT_READY_FOR_IMPLEMENTATION until Fit/lock + auth |
| US-036H-005 | §9 complete | NONE | READY for PD Gate; NOT_READY_FOR_IMPLEMENTATION until Fit/lock + auth |
| US-036H-006 | §9 complete; permission reuse Fit-verified later | NONE (product); Fit verification pending | READY for PD Gate; NOT_READY_FOR_IMPLEMENTATION until Fit/lock + auth |
| US-036H-007 | §9 complete | NONE | READY for PD Gate; NOT_READY_FOR_IMPLEMENTATION until Fit/lock + auth |
| US-036H-008 | §9 complete | NONE | READY for PD Gate; NOT_READY_FOR_IMPLEMENTATION until Fit/lock + auth |
| US-036H-009 | §9 complete | NONE | READY for PD Gate; NOT_READY_FOR_IMPLEMENTATION until Fit/lock + auth |

`STORY_COMPLETE != IMP_ACCEPTED`. Product Definition Gate precedes Architecture Fit/lock; final implementation readiness requires Fit + authorization.

---

## 27. Product Definition Gate

```text
PRE-GATE DRAFT:
PRODUCT_DEFINITION_GATE_EXECUTION = NOT_PERFORMED
Gate Result: NOT_PERFORMED

ACTUAL PRODUCT_DEFINITION_GATE EXECUTION:
Gate Result: (not executed — do not claim PASS or STOP)
```

```text
PRODUCT_DEFINITION_GATE

Capability: IMP-036H — Customer Pickup / Takeaway
Product Definition Version: PD-IMP-036H-DRAFT-1
Business Outcome: Defined (§2)
Primary Personas: PERSONA-CUSTOMER; PERSONA-WORKFORCE-OPERATOR (§4)
Journeys Defined: A–G customer + Ops list/detail/handover (§6)
Story Map Complete: YES (§7) — US-036H-001…009
Acceptance Slice Defined: YES (§8)
Happy Paths Defined: YES (A/B/C + Ops handover)
Alternate Paths Defined: YES (D/E/F/G + eligibility recovery)
Empty / First-Use States Defined: YES (§12–13)
Error / Recovery Paths Defined: YES
Authorization Variants Defined: YES (§14; AC-036H-020)
Cross-Scope Scenarios Defined: YES (Ops scope deny; Delivery fail-closed on Pickup)
Concurrency Considered: YES (§17; AC-036H-026)
Destructive Actions Defined: YES (cancel/refund; no no-show penalty)
UX State Matrix Complete: YES (§13)
Accessibility Considered: YES (§18)
Golden Journeys Identified: YES (§20) — GJ-FIRST-ORDER extend + delivery non-regression
Explicit Deferrals Recorded: YES (§23–24) including IMP-036I
Unresolved Product Decisions: 0
Architecture Conflicts: NONE identified at product layer; Fit questions handed off
PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED
Gate Result: NOT_PERFORMED
```

`NOT_PERFORMED` is not a third gate verdict; it means no evaluation has occurred.
`READY_FOR_PRODUCT_DEFINITION_GATE: YES` means this draft is prepared for an independent gate —
**not** that the gate has passed.

---

## Appendix A — IMP-036I reservation (high-level only)

```text
IMP-036I — Scheduled Fulfilment
Lifecycle: PLANNED / NOT_ACTIVATED
IMP036I_ACTIVATED: NO
```

High-level orthogonal product boundary only (not designed here):

```text
FULFILMENT_TIMING:
  ASAP
  SCHEDULED

FULFILMENT_MODE:
  DELIVERY
  PICKUP
```

IMP-036H V1 exposes ASAP only. Do **not** define inside IMP-036H: slot duration; scheduling
horizon; capacity; dispatch timing; lead time; cancellation cutoff. Those belong to IMP-036I
Product Definition.

---

## Appendix B — Explicit non-goals (IMP-036H)

```text
scheduled pickup
scheduled delivery
time-slot capacity
pre-order for tomorrow
cash/pay-at-counter
COD
curbside pickup
drive-through
dine-in
table service
QR table ordering
pickup lockers
pickup OTP/QR proof
customer no-show penalties
automatic no-show cancellation
pickup-specific discounts
new kitchen preparation lifecycle
READY_FOR_PICKUP status
delivery provider redesign
new payment provider
new authentication realm
new loyalty system
new roles by default
```

---

## Appendix C — Program pause / assessment posture (context only)

```text
acceptedThrough: IMP-036G
IMP037: HOLD / BLOCKED_PROVIDER_ACCESS
IMP038: HOLD / IMPLEMENTATION_COMPLETE / NOT_ACCEPTED
IMP038_EXTERNAL_ASSESSMENT: DEFERRED_UNTIL_PRE_GTM_APPLICATION_SCOPE_STABILIZES
IMP038_FROZEN_RUNTIME_HEAD: dc6b19e6f88d4084e424d927e6467c374596fb0a
  (historical evidence only; do not deploy this PD onto that runtime as assessment proof)
GAP-EXT-ASSESS-001: NOT closed by this draft
IMP039: NOT_ACTIVATED / HOLD
IMP040: NOT_ACTIVATED / HOLD
D-377: program pause / pre-GTM insertion authority (DR-19)
```

This Product Definition does not accept IMP-037/038, activate IMP-039/040, or reopen IMP-038
implementation.

---

## Appendix D — Classification reminder

```text
PRODUCT REQUIREMENT     — binding user/business promise in this draft (subject to Gate)
ARCHITECTURE CANDIDATE  — Fit hypothesis; not locked
IMPLEMENTATION DETAIL   — forbidden inventiveness in this artifact (schema/API/UI widgets)
```
