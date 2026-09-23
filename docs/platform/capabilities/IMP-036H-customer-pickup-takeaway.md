<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-036H",
  "title": "Customer Pickup / Takeaway",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "architectureFit": "PASS",
  "architectureFitResult": "PASS",
  "architectureFitExecution": "PERFORMED",
  "implementation": "AUTHORIZED / NOT_STARTED",
  "implementationAuthorized": true,
  "implementationStarted": false,
  "impAccepted": false,
  "schemaChangeRequired": true,
  "migrationRequired": true,
  "founderUatRequired": true,
  "lastReviewed": "2026-09-24",
  "productDefinition": "PD-IMP-036H-DRAFT-1",
  "bindingDecisions": ["D-378", "ADR-018", "D-357", "D-359", "D-360", "D-365", "D-372", "D-377", "ADR-005", "ADR-007", "ADR-008", "ADR-011", "ADR-012"],
  "dependsOn": ["IMP-021", "IMP-023", "IMP-024", "IMP-028", "IMP-029", "IMP-030", "IMP-031", "IMP-033", "IMP-036B", "IMP-036C", "IMP-036D", "IMP-036E"],
  "architectureBase": "ARCH-R22"
}
-->

# IMP-036H — Customer Pickup / Takeaway

## Capability Architecture — ARCHITECTURE_LOCKED

This document is the **locked capability architecture** for IMP-036H. It records Architecture Fit
PASS against **ARCH-R22 / D-378 / ADR-018 / ARCH-G28** for ASAP Customer Pickup / Takeaway.

Independent Architecture Fit review = **PASS** (PR #239 review `5295149318`). Implementation is
**AUTHORIZED** and **NOT STARTED**. Authorization does **not** start implementation, execute
schema migration, Founder UAT, or IMP acceptance. Historical architecture-lock tip was
GTM-R143 / STATE-R141.

```text
ARCHITECTURE_FIT = PASS
ARCHITECTURE_FIT_EXECUTION = PERFORMED
ARCHITECTURE_FIT_RESULT = PASS
IMP036H_ARCHITECTURE_FIT = PASS
IMP036H_ARCHITECTURE_LOCKED = YES
ARCHITECTURE_LOCKED = YES
INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PASS
INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID = 5295149318
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_HEAD = aab814c238c499367ee921e9f8ffb03ff7b1b373
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_TREE = 93d4e83d4a73c61c9439bcaae2799920fcca46db
ARCHITECTURE_FIT_EVALUATED_HEAD = aab814c238c499367ee921e9f8ffb03ff7b1b373
ARCHITECTURE_FIT_EVALUATED_TREE = 93d4e83d4a73c61c9439bcaae2799920fcca46db
ARCHITECTURE_FIT_EVALUATED_WORKING_TREE_FINGERPRINT = 74b1254f22c9131a6e073522cf9310f264866e442cc074775ad5f4b214f0e51e
IMPLEMENTATION_AUTHORIZED = YES
IMPLEMENTATION_STARTED = NO
IMP036H_IMPLEMENTATION_AUTHORIZED = YES
IMP036H_STARTED = NO
IMP036H_IMPLEMENTATION_STARTED = NO
IMP036H_ACCEPTED = NO
IMP036I_ACTIVATED = NO
PRODUCT_DEFINITION = PD-IMP-036H-DRAFT-1 APPROVED
PRODUCT_DEFINITION_GATE = PASS
D-378_CREATED = YES
D378_STATUS = CURRENT
ADR018_STATUS = Accepted
ARCH_R22_CREATED = YES
ARCH_G28_CREATED = YES
SCHEMA_CHANGE_REQUIRED = YES
MIGRATION_REQUIRED = YES
SCHEMA_MIGRATION_EXECUTION = AUTHORIZED_NOT_EXECUTED
OPEN_ARCHITECTURE_QUESTIONS = NONE
RED_DECISIONS_REQUIRED = NONE
AF-036H-01 … AF-036H-14 = RESOLVED (AF-036H-12 = corrected Option A)
CANONICAL_ROADMAP_STATE = GTM-R144 / STATE-R142
```

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Formal ROADMAP lifecycle | `ARCHITECTURE_LOCKED` (`IMP036H_ACTIVATED: YES`) |
| Product Definition | `PD-IMP-036H-DRAFT-1` **APPROVED**; Gate **PASS** |
| Architecture Fit | **PASS** (independent review PR #239 / `5295149318`) |
| Implementation | **AUTHORIZED** / **NOT_STARTED** |
| Schema change / migration | **YES** (design locked; migration execution **AUTHORIZED_NOT_EXECUTED** — not yet created) |
| Binding D-number | **D-378** (`CURRENT`) |
| Binding ADR | **ADR-018** (`Accepted`) |
| Global ARCH | **ARCH-R22** / **ARCH-G28** |
| New permission / role / auth model / deployable | **NO** |
| Founder UAT required (future acceptance) | **YES** |

---

## 1. Authority / status

Verified implementation-authorization tip target:

```text
Repository: /home/ajoshi/repos/boba-bear-platform
Remote: nivedhya11/bobabear-platform
VISION = VISION-1
ROADMAP = GTM-R144
STATE = STATE-R142
ARCHITECTURE = ARCH-R22
DECISION REGISTER = DR-20
PRODUCT DELIVERY = PD-1
TESTING = TEST-1
PERSONA = PERSONA-1
GOLDEN JOURNEYS = GJ-1
Product Definition = docs/platform/product/IMP-036H/product-definition.md (APPROVED)
Product Definition Gate evidence = PR#238 comment 5797812536
Independent Architecture Fit evidence = PR #239 review 5295149318
Implementation plan = docs/platform/product/IMP-036H/implementation-plan.md
```

Exact Fit-evaluated candidate (independent PASS; preserved unchanged at authorization):

```text
FIT_EVALUATED_HEAD = aab814c238c499367ee921e9f8ffb03ff7b1b373
FIT_EVALUATED_TREE = 93d4e83d4a73c61c9439bcaae2799920fcca46db
FIT_EVALUATED_FINGERPRINT = 74b1254f22c9131a6e073522cf9310f264866e442cc074775ad5f4b214f0e51e
```

Canonical ROADMAP/STATE tip markers after implementation authorization:

```text
IMP036H_ARCHITECTURE_FIT: PASS
IMP036H_ARCHITECTURE_LOCKED: YES
IMP036H_IMPLEMENTATION_AUTHORIZED: YES
IMP036H_STARTED: NO
IMP036H_IMPLEMENTATION_STARTED: NO
IMP036H_IMPLEMENTATION_COMPLETE: NO
IMP036H_ACCEPTED: NO
PROGRAM_PAUSE_AUTHORITY: D-377
```

Historical architecture-lock tip (pre-authorization; superseded): GTM-R143 / STATE-R141.
Historical Fit-candidate tip (pre-lock; superseded): GTM-R142 / STATE-R140 / ARCH-R21 / DR-19
(D-378 was PROPOSED / ADR-018 Proposed at that tip only).
---

## 2. Purpose and approved Product Definition reference

Satisfy `PD-IMP-036H-DRAFT-1` business outcome:

> Authenticated customers place ASAP Pickup orders as an equal peer to Delivery without delivery
> address, GPS/Maps, serviceability destination, or delivery fee; authorized workforce distinguishes
> Pickup, shows pickup-relevant detail, accepts under existing Order lifecycle, and completes
> handover via existing Order fulfil → FULFILLED — without PickupOrder, Delivery aggregate for
> Pickup, new role/permission, or scheduled fulfilment.

Traceability vocabulary used throughout:

```text
FD-036H-01 … FD-036H-23
BR-036H-001 … BR-036H-013
AC-036H-001 … AC-036H-042
US-036H-001 … US-036H-009
AF-036H-01 … AF-036H-14
```

`product_semantics_changed = NO` relative to the approved Product Definition.

---

## 3. Preserved global invariants

| Invariant / decision | Preservation |
|---|---|
| ARCH-G01 / D-359 / D-360 | Static Next export; customer-commerce `/api/v1/*`; no Next Route Handlers as authority |
| ARCH-G02 / ARCH-G14 | No new deployable service, queue, or broker |
| ARCH-G05 | Immutable Checkout Snapshot remains purchased commercial truth |
| ARCH-G07 / D-357 | Order lifecycle PLACED \| ACCEPTED \| FULFILLED \| CANCELLED unchanged |
| ARCH-G09 | Optimistic Checkout revision; no silent last-write-wins on fulfilment mutations |
| ARCH-G11 | Browser never authoritative for money / eligibility / authorization |
| ARCH-G13 | PostgreSQL authoritative persistence; forward-only migrations |
| ARCH-G23 / D-372 | Workforce ops on `/api/operations/v1/*` |
| ARCH-G24 | Delivery remains provider-neutral Delivery authority — never created for PICKUP |
| ARCH-G26 / ARCH-G27 | Pilot topology + IMP-038 controls preserved; no new CSP host for Pickup normal path |
| ADR-005 | Permission keys + server-derived scope; no role-name bypass |
| ADR-007 | Pricing owns charges/tax/promotions; no Pickup pricing engine |
| ADR-008 | Cart intent vs Checkout Snapshot payable truth |
| ADR-011 | Delivery dispatch/fulfilment — fail closed when Snapshot.fulfilmentMode = PICKUP |
| ADR-012 / IMP-033 | Notification platform unchanged; fulfilment-aware wording only |
| D-365…D-367 | Financial Document / refund statutory / signing authorities unchanged |
| D-377 | Program pause / IMP-037/038 hold preserved |

```text
NEW_DEPLOYABLE_SERVICE: NO
NEW_CONTAINER: NO
NEW_QUEUE: NO
NEW_BROKER: NO
NEW_EXTERNAL_PROVIDER: NO
NEW_AUTH_REALM: NO
NEW_ROLE: NO
NEW_PERMISSION: NO
SCHEMA_CHANGE_REQUIRED: YES
MIGRATION_REQUIRED: YES
```

---

## 4. Architecture-fit verdict (locked)

```text
ARCHITECTURE_FIT_CANDIDATE_STATUS = SUPERSEDED_BY_LOCK (historical Fit candidate only)
ARCHITECTURE_FIT = PASS
ARCHITECTURE_FIT_EXECUTION = PERFORMED
ARCHITECTURE_FIT_RESULT = PASS
IMP036H_ARCHITECTURE_LOCKED = YES
INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PASS
INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID = 5295149318
```

All fourteen Product Definition Fit questions are **RESOLVED** (AF-036H-12 = corrected Option A).
`OPEN_ARCHITECTURE_QUESTIONS: NONE`. `RED_DECISIONS_REQUIRED: NONE`.

---

## 5. Binding global decision (D-378 / ARCH-G28 / ARCH-R22)

### 5.1 Decision identity

```text
D-378 — Checkout Fulfilment Mode + Pickup Execution Boundary
STATUS: CURRENT
ADR-018 — Customer Fulfilment Mode and Pickup Boundary (Status: Proposed)
ARCH-G28 — proposed invariant text (below)
ARCH-R22 — proposed architecture revision on lock persistence only
```

### 5.2 Proposed ARCH-G28 (semantic authority)

> Checkout Snapshot owns the immutable fulfilment commitment for a purchased order. `DELIVERY` and
> `PICKUP` are mutually exclusive modes. DELIVERY requires delivery destination/serviceability and
> may create Delivery execution. PICKUP binds an eligible selected Outlet, requires no customer
> delivery destination/serviceability, and must never create or invoke a Delivery aggregate.

### 5.3 Why a new global decision is required

IMP-036H changes a cross-domain invariant (Checkout / Pricing / Order / Delivery / Ops / FD
issuance adapters). That exceeds capability-local mechanism selection under ARCH-R21 alone
(contrast IMP-036F, which required no new D/ARCH). Lock persistence (separate task) must advance
`ARCH-R21 → ARCH-R22` and promote D-378 / ADR-018 / ARCH-G28 to CURRENT.

This candidate **does not** mutate `ARCHITECTURE.md` `architectureVersion` meta (must remain
ARCH-R21 while tip is GTM-R142 / STATE-R140 Product Definition Gate PASS).

---

## 6. Durable fulfilment authority (AF-036H-01)

```text
FulfilmentMode = DELIVERY | PICKUP
Exactly one authoritative fulfilment mode per Checkout
```

| Lifecycle stage | Owner | Notes |
|---|---|---|
| Mutable / pre-payment intent | `Checkout` | `checkouts.fulfilment_mode`; default backfill `DELIVERY` |
| Immutable paid / purchased truth | `Checkout Snapshot` | `checkout_snapshots.fulfilment_mode NOT NULL` |
| Order | References `checkoutSnapshotId` | Projects mode from Snapshot; **no** competing mutable `orders.fulfilment_mode` |

Authority: FD-036H-01, FD-036H-10; BR-036H-001; AC-036H-014.

**AF-036H-01: RESOLVED**

---

## 7. Pickup outlet selection (AF-036H-06)

Preserve existing Snapshot field `selectedOutletId` as the **single** immutable selected-outlet
commitment for both modes:

| Mode | `selectedOutletId` meaning |
|---|---|
| DELIVERY | Serviceability-selected outlet |
| PICKUP | Customer-selected or AUTO_SELECTED eligible pickup outlet |

Mutable Pickup intent on Checkout:

```text
checkouts.pickup_outlet_id NULLABLE
```

Invariant:

```text
DELIVERY → pickup_outlet_id IS NULL
PICKUP   → pickup_outlet_id required before evaluate / prepare-for-payment
```

On READY Snapshot seal for PICKUP: copy `pickup_outlet_id` → Snapshot `selectedOutletId` and seal
pickup-location fields (§9). Do **not** create a second selected-outlet authority.

Evidence for preferred shape vs alternate child table: Checkout already owns one-to-one destination
child (`checkout_delivery_destinations`); a nullable FK on `checkouts` mirrors that simplicity for
mutable selection without inventing a second outlet-id column on Snapshot.

Authority: FD-036H-05, FD-036H-06; AC-036H-003/004.

**AF-036H-06: RESOLVED**

---

## 8. Conditional delivery destination (AF-036H-02)

Preserve `checkout_delivery_destinations` as Delivery destination authority only.

| Mode | Destination requirement |
|---|---|
| DELIVERY | Required for evaluate / payment |
| PICKUP | Not required; must not participate in outlet selection, serviceability, commercial evaluation, Snapshot pickup truth, or delivery charge |

Draft convenience:

```text
A previously entered Delivery destination MAY remain as non-authoritative DRAFT convenience
while fulfilmentMode = PICKUP.
PICKUP SNAPSHOT MUST NOT SEAL DELIVERY DESTINATION DATA.
Customer must never be forced to create/provide destination for Pickup.
retained draft convenience data != active Pickup commercial/fulfilment truth
```

Authority: FD-036H-04, FD-036H-20; AC-036H-025/030; BR-036H-004/005.

**AF-036H-02: RESOLVED**

---

## 9. Checkout Snapshot evolution + immutable pickup location (AF-036H-03)

### 9.1 Required Snapshot column

```text
checkout_snapshots.fulfilment_mode NOT NULL
Historical migration: all existing snapshots → DELIVERY
```

### 9.2 Mode-conditional structure (prefer DB CHECK)

**DELIVERY snapshot**

```text
delivery destination fields = required (existing columns remain NOT NULL under DELIVERY check)
serviceabilityEvaluatedAt = required
pickup location fields = absent / NULL
```

**PICKUP snapshot**

```text
delivery destination fields = absent / NULL (relax NOT NULL under PICKUP check)
serviceabilityEvaluatedAt = null
pickup location commitment = required
selectedOutletId = required
```

Do **not** preserve a fake kitchen address inside Delivery destination columns for Pickup.
Do **not** invent `PICKUP_ADDRESS` destination kind.

### 9.3 Explicit Pickup snapshot fields (preferred persistence)

Owned by `checkout_snapshots` (or a 1:1 Snapshot child with identical lifecycle if CHECK clarity
requires it). Preferred: **explicit columns on Snapshot** for strongest simple invariants:

```text
pickup_display_name
pickup_address_line_1
pickup_address_line_2?
pickup_locality?
pickup_city
pickup_state_code
pickup_postal_code
pickup_instructions
pickup_latitude?
pickup_longitude?
```

These are immutable purchased facts. Do **not** reconstruct historical pickup instructions from the
mutable OutletPickupProfile.

Authority: FD-036H-15, FD-036H-16; AC-036H-021/022; BR-036H-008.

**AF-036H-03: RESOLVED**

---

## 10. OutletPickupProfile (AF-036H-04)

Bounded mutable configuration authority — **not** a new Outlet domain.

```text
OutletPickupProfile
  outletId (1:1)
  enabled
  displayName
  addressLine1
  addressLine2?
  locality?
  city
  stateCode
  postalCode
  latitude? / longitude?   (OPTIONAL — not required to place Pickup)
  instructions
  revision
  createdAt / updatedAt
```

Rules:

```text
No profile OR enabled = false → PICKUP_NOT_AVAILABLE
Default fail-safe: Pickup is NOT automatically enabled merely because an Outlet exists
Do NOT reuse serviceOriginLatitude / serviceOriginLongitude as customer-facing pickup authority
```

### Authorization

```text
READ:   outlet.read
MANAGE: outlet.update
```

Server-derived Outlet scope. No `pickup.manage`. No new role. Transport:
`/api/operations/v1/*` (D-372). Optimistic concurrency via `expectedRevision`. Audit via existing
audit patterns.

Authority: FD-036H-16, FD-036H-14; AC-036H-005/006.

**AF-036H-04: RESOLVED**

---

## 11. ASAP Pickup eligibility (AF-036H-05)

Server-authoritative. An Outlet is eligible iff **all** are true:

```text
Outlet lifecycle = active
OutletPickupProfile exists AND enabled = true
effective Outlet operating state = accepting
selected Cart merchandise is fulfilable at that Outlet
```

Reuse accepted Outlet / operating-state / Assortment / Availability / Catalog authorities.
Do **not** invent `pickup_open` / `pickup_available` / `pickup_inventory`.

| Operating state | Eligibility |
|---|---|
| paused | NOT_ELIGIBLE |
| suspended | NOT_ELIGIBLE |
| closed_by_schedule | NOT_ELIGIBLE |
| accepting | eligible if other gates pass |

Selection UX:

```text
exactly one eligible → AUTO_SELECT allowed
multiple → customer chooses
zero → Pickup unavailable; payment cannot proceed for Pickup
```

No silent outlet substitution / silent merchandise removal.

Authority: FD-036H-05, FD-036H-06, FD-036H-22; AC-036H-003…007, 032…038; BR-036H-006/007/011.

**AF-036H-05: RESOLVED**

---

## 12. Evaluation branching

Current `evaluateCheckout` is Delivery-only. Architecture requires explicit mode branch.

### DELIVERY (preserve)

```text
require delivery destination
→ resolveCheckoutServiceability
→ selected Outlet
→ validate merchandise
→ commercial evaluation including Delivery policy
→ immutable Delivery snapshot
```

### PICKUP

```text
require selected Pickup outlet (pickup_outlet_id)
→ validate Outlet active
→ validate Pickup Profile enabled
→ resolve effective operating state = accepting
→ validate merchandise at selected Outlet
→ commercial evaluation with Pickup semantics (no delivery charge)
→ immutable Pickup snapshot (pickup fields; no sealed destination)
```

```text
PICKUP MUST NOT call resolveCheckoutServiceability
PICKUP MUST NOT call Maps/geocoding for normal checkout
```

---

## 13. Payment-preparation revalidation

Preserve `prepareCheckoutForPayment` fresh revalidation architecture.

For Pickup, revalidate immediately before Payment bind:

```text
fulfilment mode unchanged
selected pickup outlet unchanged
outlet active
Pickup Profile enabled
effective operating state = accepting
merchandise still fulfilable
commercial result still equivalent
```

On material change:

```text
invalidate READY snapshot → DRAFT
CHECKOUT_REPRICED / equivalent recoverable outcome
customer reconfirms
```

Payment-pending: no fulfilment-mode / outlet mutation after payment bind (FD-036H-18 path;
AC-036H-026).

---

## 14. Commercial architecture (AF-036H-07)

Commercial evaluation must receive authoritative `fulfilmentMode`.

| Mode | Charges |
|---|---|
| DELIVERY | packaging rules + delivery charge resolution + existing tax/promotions |
| PICKUP | packaging rules + **NO delivery charge definition applied** + existing tax/promotions |

For Pickup, delivery charge is **structurally absent** — not calculated-then-hidden, not
discounted to zero, not UI-suppressed.

Evidence of current defect to fix at implementation:

```text
src/server/checkout/adapters/pricing.ts
  else if (deliveryDef) { resolvedDeliveryPaise = deliveryDef.amountPaise; }
```

Authority: FD-036H-07/08/09; BR-036H-003/009; AC-036H-008…011.

**AF-036H-07: RESOLVED**

---

## 15. Order architecture

Do **not** modify Order into a Pickup-specific aggregate. Preserve:

```text
PLACED → ACCEPTED → FULFILLED | CANCELLED
```

Order continues to reference `checkoutSnapshotId`. Fulfilment mode is projected from immutable
Snapshot. No pre-emptive `orders.fulfilment_mode` duplicate. Later query performance may use
projection/index architecture without inventing competing authority.

Authority: FD-036H-10/11; AC-036H-014; D-357.

---

## 16. Pickup handover (AF-036H-09)

Reuse existing `order.fulfil` / `fulfilOrder`.

Verified CURRENT catalog (`src/shared/access-control/catalog.ts`, `drizzle/0017_order.sql`):

```text
order.fulfil exists
granted to: platform_super_admin, brand_admin, outlet_manager, kitchen_operator, delivery_coordinator
target kind: outlet
```

Pickup workforce flow:

```text
Order = ACCEPTED
fulfilmentMode = PICKUP (from Snapshot)
authorized order.fulfil actor
customer/order match performed operationally (FD-036H-23)
→ fulfilOrder
→ FULFILLED
```

No PickupProof / OTP / PIN / QR / signature / government-ID. Audit = normal Order fulfil
provenance. No new permission.

**AF-036H-09: RESOLVED**

---

## 17. Delivery fail-closed (AF-036H-08)

Central Delivery creation/request authority (`createDelivery` and workforce Delivery entrypoints)
must verify:

```text
Order → bound Checkout Snapshot → fulfilmentMode
if PICKUP → reject Delivery request/create/dispatch
```

This check belongs at the authoritative Delivery application boundary, not UI hiding.
Once no Delivery exists, booking/assignment/provider flows remain unavailable.
Do not create a fake `DELIVERED` event for Pickup. Delivery Orders remain untouched.

Authority: FD-036H-13; AC-036H-015/016; ARCH-G24 + proposed ARCH-G28.

**AF-036H-08: RESOLVED**

---

## 18. Customer / workforce projections (AF-036H-10)

### Customer

Common: `fulfilmentMode` + selected outlet identity/display context.

| Mode | Projection |
|---|---|
| DELIVERY | destination / tracking as currently authorized; `pickupLocation` absent |
| PICKUP | pickup location snapshot + instructions; delivery tracking absent; Delivery projection absent |

Historical DELIVERY backfill must render exactly as before.

### Workforce (Ops)

List: `DELIVERY | PICKUP` badge.

Pickup detail: Order identity, authorized customer data, items, selected Pickup outlet, immutable
pickup location/instructions, payment state where existing projection permits, Order lifecycle
controls.

Hide / do not expose for Pickup: rider booking, provider assignment, delivery tracking, delivery
proof, delivery completion controls. Authorization is Delivery API fail-closed (§17), not UI-only.

Authority: FD-036H-11/12/15; AC-036H-017…023, 039/040/042.

**AF-036H-10: RESOLVED**

---

## 19. Customer-safe Pickup outlet projection + Checkout selection API

Customer-commerce remains transport authority (`/api/v1/*`). Recommended semantic operations
(exact paths follow D-360 conventions at implementation):

```text
GET  Pickup options for this Checkout / current Cart
     → outlet identity, display name, customer-facing address, instructions,
       optional coordinates, eligibility/selection info

SET  Checkout fulfilment selection
     expectedCheckoutRevision
     mode
     pickupOutletId where PICKUP
```

Mutations use existing Checkout revision/concurrency. Do not expose organization/legal-entity
internals, workforce data, routing internals, serviceability configuration, or audit metadata.

---

## 20. Notifications (AF-036H-11)

Where IMP-033 emits customer Order lifecycle messages, derive wording from `fulfilmentMode`.

Verified CURRENT semantic types include Delivery-specific events
(`deliveryOutForDelivery`, `deliveryDelivered` in `src/server/notifications/outbox-events.ts`).

```text
PICKUP MUST NOT emit: rider arriving / out for delivery / delivery tracking
```

No new notification platform. If notification implementation remains partial/deferred for some
events, preserve existing authority and define required projection/event semantics only.

Authority: FD-036H-19; AC-036H-029; ADR-012 / IMP-033.

**AF-036H-11: RESOLVED**

---

## 21. Financial Document compatibility (AF-036H-12)

### Evidence

D-365 Financial Document model:

- Issued FD stores optional `recipient_display_name`, `recipient_phone_e164`, `recipient_address`,
  `place_of_supply_state_code` (nullable in `drizzle/0020_financial_document.sql`).
- FD consumes Checkout Snapshot commercial lines; does not rewrite Snapshot.
- ARCH-G16 / D-365: issued documents must not be reconstructed from mutable current customer
  profile, catalog, tax configuration, Payment state, Refund state, or Order state.

Current adapters (`tax-invoice-from-order.ts`, `receipt-voucher-from-payment.ts`) read
`snapshot.destination` for recipient particulars (Delivery-shaped coupling). Place-of-supply
already falls back to issuer profile `stateCode` when destination state is not a GST 2-digit
code — restaurant performance location remains the practical seal path under existing accepted
issuer/profile policy.

Checkout/Order ownership currently seals `customerAuthUserId` but does **not** seal immutable
customer name, phone, or recipient address for Pickup. Mutable `customer_auth_users` / customer
profile must never be queried at Receipt Voucher or Tax Invoice issuance to manufacture recipient
particulars.

### Verdict: Option A (corrected)

```text
A. Existing financial-document model supports Pickup without a Delivery destination.
   Optional recipient particulars remain structurally nullable; no new FD aggregate or statutory
   type is required.
```

```text
NO_NEW_LEGAL_CLAIM
nullable under current architecture
  !=
legal conclusion that recipient particulars can never be required
```

Existing D-365 fail-closed principle remains: if an applicable statutory/document policy requires
a fact that cannot be produced from authoritative sealed data, issuance fails closed rather than
inventing that fact. IMP-036H merely avoids inventing recipient facts.

### Mode-aware mapping (implementation-time; not legal advice)

#### DELIVERY (preserve — no regression)

| FD command field | Source |
|---|---|
| recipientDisplayName | sealed Delivery destination `recipientName` |
| recipientPhoneE164 | sealed Delivery destination `recipientPhone` |
| recipientAddress | sealed Delivery destination address |
| placeOfSupplyStateCode | existing accepted D-365 / issuer-profile logic |

#### PICKUP (IMP-036H V1)

| FD command field | Source |
|---|---|
| recipientDisplayName | `null` unless a genuinely immutable recipient fact already exists in the purchased Snapshot under separate accepted authority |
| recipientPhoneE164 | `null` (same rule) |
| recipientAddress | `null` (same rule) |
| placeOfSupplyStateCode | existing D-365 issuer/profile policy (no fake Delivery destination) |

```text
Do NOT obtain recipient fields from mutable current customer-auth / customer profile / other
mutable customer state at issuance.
Do NOT use OutletPickupProfile address, Pickup Snapshot location, selected Outlet address, or
serviceability origin as recipientAddress.
Do NOT invent a fake customer Delivery destination solely to satisfy a renderer or validator.
Do NOT introduce speculative immutable purchaser name / phone / email / billing-address Snapshot
fields solely to make FD recipient fields non-null (FD-036H-20 data minimization; recipient
fields are structurally optional; IMP-036H does not require new customer billing/recipient data).
Prefer absence over speculative PII persistence.
```

Pickup-location facts remain independently sealed on Checkout Snapshot for fulfilment, customer
confirmation, Order projection, Ops projection, and historical pickup instructions. They are
**not** Financial Document recipient-address authority.

If later legal review, product requirement, B2B/GST customer requirement, or document policy
requires Pickup recipient particulars, that must be separately authorized and the necessary
immutable customer facts must be sealed before issuance — never reconstructed from mutable
current customer state.

### Issuance paths covered

**Receipt Voucher** (`Payment SUCCEEDED` → `RECEIPT_VOUCHER`):

- May issue before an Order exists.
- Pickup mapping depends only on Payment + Checkout + Checkout Snapshot + effective
  issuer/profile authority — never on Order presence.
- When `snapshot.fulfilmentMode = PICKUP`: recipient fields `null` as above;
  `placeOfSupplyStateCode` = existing issuer/profile policy; no Pickup-location substitution.

**Tax Invoice** (`Order FULFILLED` → `TAX_INVOICE`):

- When `snapshot.fulfilmentMode = PICKUP`: recipient fields `null` as above;
  `placeOfSupplyStateCode` = existing issuer/profile policy.
- Do not load current customer name/phone to populate issued immutable document truth.

### Refund / statutory reversal continuity

IMP-036H does **not** alter D-366 `RefundStatutoryDecision`, D-367 `SignatureArtifact`, Refund
Voucher, Credit Note, or existing immutable prior-document semantics. Where those paths inherit
recipient facts from an existing Financial Document, preserve existing authority. No
Pickup-specific reversal semantics.

```text
Payment / tax / issuer truth unchanged (D-365).
Refund statutory / signing authorities unchanged (D-366 / D-367).
```

Not Option B — no genuine immutable D-365 dependency on Delivery destination columns; dependency
is adapter coupling, remediated by fulfilment-aware issuance adapters under corrected Option A.

**AF-036H-12: RESOLVED — corrected Option A** (no RED)

---

## 22. Migration strategy (AF-036H-13)

Committed forward-only SQL migration required. No `drizzle-kit push`.

Requirements:

```text
existing checkouts / snapshots / orders remain valid
all historical checkout snapshots backfill fulfilmentMode = DELIVERY
historical destination data unchanged
historical selectedOutletId unchanged
historical Orders unchanged
historical Deliveries unchanged
```

Expected shape:

```text
add Checkout fulfilment_mode (+ default/backfill DELIVERY)
add checkouts.pickup_outlet_id NULLABLE + mode CHECKs
add Snapshot fulfilment_mode NOT NULL (+ backfill DELIVERY)
make Delivery-only Snapshot fields conditional via CHECKs
add immutable Pickup-location Snapshot fields
add OutletPickupProfile persistence + revision
```

Later migration proof (implementation tranche):

```text
empty database → latest
previous schema → new schema
historical Delivery fixture preserved
```

**AF-036H-13: RESOLVED**

---

## 23. Scheduling boundary (AF-036H-14)

Do **not** introduce during IMP-036H:

```text
fulfilment_timing / scheduled_for / slot_id / slot_capacity / lead_time / dispatch_at
```

`FulfilmentMode` is orthogonal to future timing. Timing persistence belongs exclusively to
**IMP-036I**. No speculative schema.

Authority: FD-036H-02, FD-036H-21; BR-036H-012.

**AF-036H-14: RESOLVED**

---

## 24. Concurrency

Preserve Checkout revision authority. Changing fulfilment mode, selected Pickup outlet, or
delivery destination (where applicable) invalidates READY commercial Snapshot as necessary and
advances Checkout revision. Payment pending/completed: no fulfilment mutation. Pickup Profile
updates use `expectedRevision`. Prepare-for-payment is the final current-truth check before
Payment bind.

---

## 25. Security / privacy

Preserve IMP-038 controls. Pickup normal path requires no customer GPS, Google Maps, Places,
delivery coordinates, or Delivery-provider call. No new CSP host. Optional Pickup Profile
coordinates are business location data. Existing authentication, CSRF/origin, abuse protection,
and authorization remain authoritative. No additional personal-data collection for handover
(FD-036H-20/23).

---

## 26. Deployment / runtime impact

```text
NEW_DEPLOYABLE_SERVICE: NO
NEW_CONTAINER: NO
NEW_QUEUE: NO
NEW_BROKER: NO
NEW_EXTERNAL_PROVIDER: NO
NEW_AUTH_REALM: NO
NEW_ROLE: NO
NEW_PERMISSION: NO
SCHEMA_CHANGE_REQUIRED: YES
MIGRATION_REQUIRED: YES
```

Transports unchanged:

```text
customer-commerce /api/v1/*
operations /api/operations/v1/*
```

No DigitalOcean access required for Architecture Fit or later application implementation/testing.

---

## 27. Architecture Fit matrix (AF-036H-01 … 14)

| ID | Question | Result | Section |
|---|---|---|---|
| AF-036H-01 | durable fulfilment-mode ownership | **RESOLVED** | §6 |
| AF-036H-02 | conditional destination | **RESOLVED** | §8 |
| AF-036H-03 | migration/snapshot evolution | **RESOLVED** | §9 |
| AF-036H-04 | Pickup Profile authority | **RESOLVED** | §10 |
| AF-036H-05 | Pickup eligibility | **RESOLVED** | §11 |
| AF-036H-06 | selected outlet binding | **RESOLVED** | §7 |
| AF-036H-07 | structural no-delivery-charge Pickup pricing | **RESOLVED** | §14 |
| AF-036H-08 | Delivery fail-closed | **RESOLVED** | §17 |
| AF-036H-09 | order.fulfil reuse | **RESOLVED** | §16 |
| AF-036H-10 | customer/workforce projections | **RESOLVED** | §18 |
| AF-036H-11 | notification semantics | **RESOLVED** | §20 |
| AF-036H-12 | Financial Document compatibility | **RESOLVED — corrected Option A** | §21 |
| AF-036H-13 | historical backward compatibility | **RESOLVED** | §22 |
| AF-036H-14 | IMP-036I extensibility without speculative scheduling | **RESOLVED** | §23 |

```text
HIDDEN_TODO: NONE
RED_DECISIONS_REQUIRED: NONE
OPEN_ARCHITECTURE_QUESTIONS: NONE
```

---

## 28. D-number / global ARCH decision test

```text
D378_REQUIRED_FOR_IMP036H_LOCK = YES
ARCH_R22_REQUIRED_FOR_IMP036H_LOCK = YES
ARCH_G28_REQUIRED_FOR_IMP036H_LOCK = YES
ADR018_REQUIRED_FOR_IMP036H_LOCK = YES

D-378 = CURRENT
ADR-018 = Accepted
ARCH-R22 = CURRENT
ARCH-G28 = CURRENT
```

Rationale: cross-domain fulfilment-mode invariant spanning Checkout, Pricing, Snapshot, Delivery
fail-closed, Ops projections, and FD issuance adapters. Not expressible as capability-local
mechanism under ARCH-R21 alone.

---

## 29. Historical pre-R144 / GTM-R143 provenance — applied architecture-lock delta

Persisted at tip **GTM-R143 / STATE-R141**:

```text
ROADMAP: GTM-R142 → GTM-R143
STATE: STATE-R140 → STATE-R141
ARCHITECTURE: ARCH-R21 → ARCH-R22 (add ARCH-G28)
DECISION_REGISTER: DR-19 → DR-20; D-378 PROPOSED → CURRENT
ADR-018: Proposed → Accepted
This capability: DRAFT / CANDIDATE → CURRENT / ARCHITECTURE_LOCKED

IMP036H_PRODUCT_DEFINITION = APPROVED
IMP036H_PRODUCT_DEFINITION_GATE = PASS
IMP036H_ARCHITECTURE_FIT = PASS
IMP036H_ARCHITECTURE_LOCKED = YES
IMP036H_IMPLEMENTATION_AUTHORIZED = NO
IMP036H_STARTED = NO
IMP036H_ACCEPTED = NO

PROGRAM_PAUSE preserved (D-377)
IMP037 HOLD / BLOCKED_PROVIDER_ACCESS preserved
IMP038 HOLD / IMPLEMENTATION_COMPLETE / NOT_ACCEPTED preserved
IMP036I PLANNED / NOT_ACTIVATED preserved
IMP039 / IMP040 NOT_ACTIVATED preserved
```

Architecture lock does **not** authorize implementation.

---

## 30. Program pause (unchanged)

```text
IMP037: HOLD / BLOCKED_PROVIDER_ACCESS
IMP038: HOLD / IMPLEMENTATION_COMPLETE / NOT_ACCEPTED
        external assessment deferred; frozen runtime evidence untouched
IMP036I: PLANNED / NOT_ACTIVATED
IMP039: NOT_ACTIVATED
IMP040: NOT_ACTIVATED
PROGRAM_PAUSE_AUTHORITY: D-377
```

---

## 31. Historical pre-R144 / GTM-R143 provenance — explicit implementation unauthorized statement

```text
IMPLEMENTATION_AUTHORIZED = NO
IMPLEMENTATION_STARTED = NO
SCHEMA_MIGRATION_EXECUTION = NOT_AUTHORIZED
APPLICATION_CODE_IMPLEMENTATION = NOT_AUTHORIZED
DEPLOYMENT = NOT_AUTHORIZED
FOUNDER_UAT = NOT_AUTHORIZED
IMP_ACCEPTANCE = NOT_AUTHORIZED
```

All schema/API/command shapes above are **architecture design only** until a separate
implementation-authorization tranche.

---


## 33. Applied implementation-authorization delta

Persisted at tip **GTM-R144 / STATE-R142**:

```text
ROADMAP: GTM-R143 → GTM-R144
STATE: STATE-R141 → STATE-R142
ARCHITECTURE: ARCH-R22 unchanged
DECISION_REGISTER: DR-20 unchanged; D-378 remains CURRENT
ADR-018: Accepted (unchanged)
ARCH-G28: CURRENT (unchanged)

IMP036H_PRODUCT_DEFINITION = APPROVED
IMP036H_PRODUCT_DEFINITION_GATE = PASS
IMP036H_ARCHITECTURE_FIT = PASS
IMP036H_ARCHITECTURE_LOCKED = YES
IMP036H_IMPLEMENTATION_AUTHORIZED = YES
IMP036H_STARTED = NO
IMP036H_IMPLEMENTATION_STARTED = NO
IMP036H_IMPLEMENTATION_COMPLETE = NO
IMP036H_ACCEPTED = NO
SCHEMA_MIGRATION_EXECUTION = AUTHORIZED_NOT_EXECUTED

PROGRAM_PAUSE preserved (D-377)
IMP037 HOLD / BLOCKED_PROVIDER_ACCESS preserved
IMP038 HOLD / IMPLEMENTATION_COMPLETE / NOT_ACCEPTED preserved
IMP036I PLANNED / NOT_ACTIVATED preserved
IMP039 / IMP040 NOT_ACTIVATED preserved
```

Authorization does **not** start implementation. Execution plan:
[`../product/IMP-036H/implementation-plan.md`](../product/IMP-036H/implementation-plan.md).

---

## 32. Open architecture questions

```text
OPEN_ARCHITECTURE_QUESTIONS: NONE
RED_DECISIONS_REQUIRED: NONE
AF-036H-01 … AF-036H-14: all RESOLVED (AF-036H-12 = corrected Option A)
INDEPENDENT_ARCHITECTURE_FIT: PASS (PR #239 review 5295149318)
ARCHITECTURE_FIT_PASS / LOCK: PERSISTED
IMPLEMENTATION_AUTHORIZATION: NOT_CLAIMED
```
