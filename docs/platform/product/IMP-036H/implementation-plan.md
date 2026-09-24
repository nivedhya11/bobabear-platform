<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "IMPLEMENTATION_PLAN",
  "capability": "IMP-036H",
  "productDefinition": "PD-IMP-036H-DRAFT-1",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementationAuthorized": true,
  "implementationStarted": true,
  "planVersion": "IMP036H-PLAN-1",
  "lastReviewed": "2026-09-24",
  "bindingDecisions": ["D-378", "ADR-018", "ARCH-G28"],
  "migrationId": "0044_imp036h_fulfilment_mode_pickup"
}
-->

# IMP-036H — Implementation Authorization Execution Plan

```text
PLAN_VERSION = IMP036H-PLAN-1
CAPABILITY = IMP-036H — Customer Pickup / Takeaway
PRODUCT_DEFINITION = PD-IMP-036H-DRAFT-1 (APPROVED; Gate PASS)
ARCHITECTURE = LOCKED (D-378 / ADR-018 / ARCH-R22 / ARCH-G28)
CAPABILITY_ARCHITECTURE = docs/platform/capabilities/IMP-036H-customer-pickup-takeaway.md
IMPLEMENTATION_AUTHORIZED = YES
IMPLEMENTATION_STARTED = YES
IMPLEMENTATION_COMPLETE = NO
IMP036H_ACCEPTED = NO
RED_DECISIONS_REQUIRED = NONE
MIGRATION_ID = 0044_imp036h_fulfilment_mode_pickup
```

This plan is the executable implementation inventory for IMP-036H. Implementation has
**STARTED** (GTM-R145 / STATE-R143). It does **not** claim implementation complete, accept
the IMP, or activate IMP-036I.

Locked architecture must not be reopened. Any material need to violate the locked
boundaries below is `RED_DECISION_REQUIRED`.

---

## 0. Locked invariants (do not redesign)

```text
FulfilmentMode = DELIVERY | PICKUP
ASAP only (no scheduled fulfilment schema — IMP-036I)
Checkout owns mutable fulfilment intent
Checkout Snapshot owns immutable fulfilment truth
Order lifecycle unchanged (accept / fulfil / cancel)
No PickupOrder
No new role / permission / deployable service / auth model
Reuse order.fulfil for Pickup handover
Pickup bypasses Delivery; fail-closed at createDelivery
Pickup has no delivery charge (structural omit)
OutletPickupProfile owns customer-facing pickup configuration
Historical Delivery records / snapshots backfill to DELIVERY
Financial Document corrected Option A (nullable Pickup recipients)
No Maps / Places / serviceability on normal Pickup path
```

---

## 1. Verified starting authority

```text
MAIN_HEAD (authorization base): 3ca2084a880b89701f42a98ad2abc248853c38e1
MAIN_TREE: 23bd8b2cd3e36cc47edeed41d28a617c170c442d
ROADMAP tip before this tranche: GTM-R143
STATE tip before this tranche: STATE-R141
DECISION_REGISTER: DR-20
ARCHITECTURE: ARCH-R22
D-378: CURRENT
ADR-018: Accepted
ARCH-G28: CURRENT
Latest drizzle migration: 0043_imp038_auth_abuse_turnstile
Next migration identity: 0044_imp036h_fulfilment_mode_pickup
```

---

## 2. Recommended PR decomposition

Keep `main` green after every merge. Default Delivery behaviour must remain valid whenever
`fulfilment_mode` defaults / backfills to `DELIVERY`.

| Tranche | Title | Mergeable alone? | Depends on |
|---|---|---|---|
| **IMP-036H-A** | Schema + Domain Foundation | YES | — |
| **IMP-036H-B** | Pickup Eligibility + Checkout Commercial Core | YES | A |
| **IMP-036H-C** | Payment / Order / Delivery / Financial Boundaries | YES | B |
| **IMP-036H-D** | Customer Pickup Experience | YES | C |
| **IMP-036H-E** | Operations Experience | YES (parallel with D after C) | C |
| **IMP-036H-F** | Integration / Regression / Evidence | YES | D + E |

**Merge guidance:** Do **not** merge B into A (schema reviewability). Do **not** ship D before C
(payment/FD/Delivery fail-closed must exist before customer can pay Pickup). Merge D∥E only after C.
Do **not** split A into separate “domain types” vs “migration” PRs — temporary invalid architecture.

---

## 3. Migration plan (IMP-036H-A)

### Identity

```text
drizzle/0044_imp036h_fulfilment_mode_pickup.sql
journal idx: 44
seal: npm run db:migrations:seal
verify: npm run db:migrations:check && npm run db:schema:check
```

### Schema shape (explicit Snapshot columns — locked preference)

**`app.checkouts`**

| Column | Type / notes |
|---|---|
| `fulfilment_mode` | `text NOT NULL` default `'DELIVERY'`; CHECK `IN ('DELIVERY','PICKUP')`; backfill DELIVERY |
| `pickup_outlet_id` | `uuid NULL` FK → `outlets.id` |

Checkout CHECKs:

```text
DELIVERY → pickup_outlet_id IS NULL
PICKUP → pickup_outlet_id MAY be NULL while DRAFT
         (required by domain before READY / prepare-for-payment; do NOT force DB NOT NULL on early DRAFT)
```

**`app.checkout_snapshots`**

| Column | Notes |
|---|---|
| `fulfilment_mode` | `NOT NULL`; backfill `'DELIVERY'` |
| Delivery destination columns | Remain; become NULL-able under PICKUP CHECK |
| `serviceability_evaluated_at` | NULL under PICKUP; NOT NULL under DELIVERY |
| `pickup_display_name`, `pickup_address_line_1`, `pickup_address_line_2`, `pickup_locality`, `pickup_city`, `pickup_state_code`, `pickup_postal_code`, `pickup_instructions`, `pickup_latitude`, `pickup_longitude` | Explicit Snapshot fields (preferred over 1:1 child) |

Snapshot CHECKs:

```text
DELIVERY:
  destination fields required (existing NOT NULL semantics via CHECK)
  serviceability_evaluated_at NOT NULL
  all pickup_* NULL

PICKUP:
  destination fields NULL
  serviceability_evaluated_at NULL
  selected_outlet_id NOT NULL
  pickup location commitment required (display_name, address_line_1, city, state_code, postal_code, instructions)
```

**`app.outlet_pickup_profiles`** (1:1 Outlet)

```text
outlet_id PK/FK
enabled boolean NOT NULL DEFAULT false
display_name, address_line_1, address_line_2?, locality?, city, state_code, postal_code
latitude?, longitude?
instructions
revision int NOT NULL
created_at / updated_at
```

Default: no profile or `enabled=false` → Pickup unavailable.

### Historical backfill

```text
ALL existing checkouts.fulfilment_mode = DELIVERY
ALL existing checkout_snapshots.fulfilment_mode = DELIVERY
destination / selectedOutletId / Deliveries / Orders unchanged
```

### Proof

```text
empty DB → migrate latest
previous schema (0043) → 0044
historical Delivery fixture Snapshot remains DELIVERY with destination intact
Postgres IT for CHECKs (reject illegal mode shapes)
```

---

## 4. Change inventory (file/module level)

### 4.1 SCHEMA

| Change | Current | Required | Authority | Dep | Risk | Proof |
|---|---|---|---|---|---|---|
| Migration `0044_imp036h_fulfilment_mode_pickup` | Delivery-only checkout/snapshot | Mode columns + profile + CHECKs + backfill | AF-036H-13 / D-378 | — | R2 | empty→latest; 0043→0044; fixture preserve |
| Drizzle `src/platform/database/schema/checkout.ts` | No mode / pickup fields | Map new columns + CHECKs | AF-036H-01…04 | migration | R2 | schema check |
| New schema module or `organizations`/`checkout` for `outlet_pickup_profiles` | Absent | 1:1 profile table | AF-036H-04 | migration | R2 | IT |
| `drizzle/migration-integrity.json` + journal | through 0043 | Seal 0044 | ARCH-G13 | migration | R1 | `db:migrations:check` |

### 4.2 DOMAIN / SHARED

| Module | Current | Required | Authority | Dep | Risk | Proof |
|---|---|---|---|---|---|---|
| `src/shared/checkout/types.ts` | `CheckoutSnapshot.destination` required; no mode | Discriminated / mode-conditional Snapshot; `fulfilmentMode`; nullable destination on PICKUP; pickup location fields | AF-036H-01/02/03 | A | R2 | unit |
| `src/shared/checkout/constants.ts` | Destination/serviceability errors only | Add `PICKUP_NOT_AVAILABLE`, `PICKUP_OUTLET_NOT_ELIGIBLE`, `PICKUP_OUTLET_REQUIRED`; reuse `CHECKOUT_CONFLICT`, `CHECKOUT_REPRICED`, `CHECKOUT_STATE_CONFLICT`, `CHECKOUT_INVALID_INPUT` | AF-036H-05 | A | R2 | unit |
| `src/shared/checkout/parse-input.ts` | Destination-only | Parse fulfilment selection input | AF-036H-06 | A/B | R2 | unit |
| `src/shared/checkout/canonicalize.ts` | `destinationsEqual` only | Mode-aware structural equality incl. pickup location | AF-036H-03 | A | R2 | unit |
| `src/shared/order/types.ts` | `destination` required on detail | Mode + optional destination; pickup projection fields | AF-036H-10 | A/C | R2 | unit |
| `src/lib/customer-commerce/types.ts` | Delivery-shaped snapshot | Mirror shared mode-aware types | AF-036H-10 | A | R2 | unit |
| `src/shared/financial-document/types.ts` | Recipients already nullable | No type change required | AF-036H-12 | — | R1 | existing |

**Note:** `src/shared/organization/*` and `src/shared/availability/*` do **not** exist. Use
`src/platform/database/schema/organizations.ts` + `src/shared/assortment/*` +
`src/server/assortment/resolve-operating.ts`.

### 4.3 PERSISTENCE

| Module | Current | Required | Authority | Dep | Risk | Proof |
|---|---|---|---|---|---|---|
| `src/server/checkout/repository.ts` | `commitReadySnapshot` requires destination; `mapDestinationFromSnapshot` always builds dest | Mode-aware load/commit/map; pickup fields; `pickup_outlet_id` | AF-036H-01…03 | A | R2 | Postgres IT |
| New OutletPickupProfile repository | Absent | CRUD + revision + scope | AF-036H-04 | A | R2 | Postgres IT |

### 4.4 APPLICATION — Checkout / eligibility / pricing

| Module | Current | Required | Authority | Dep | Risk | Proof |
|---|---|---|---|---|---|---|
| `src/server/checkout/evaluate.ts` | Destination mandatory; always serviceability | Branch on mode; PICKUP skips dest + serviceability; requires eligible `pickupOutletId` | AF-036H-02/05/07 | B | R2 | HTTP/Postgres IT |
| `src/server/checkout/prepare.ts` | Same as evaluate | Same branching; final gate before payment bind | AF-036H-05/07 | B | R2 | IT |
| `src/server/checkout/snapshot.ts` `buildSnapshotCandidate` | Requires destination | Mode-conditional candidate; seal pickup location from profile at READY | AF-036H-03 | B | R2 | unit/IT |
| `src/server/checkout/destination.ts` | Set/clear destination | Preserve for DELIVERY; reject destination mutations that conflict with PICKUP active mode; mode switch invalidates READY | AF-036H-02 | B | R2 | IT |
| New `src/server/checkout/fulfilment.ts` (or equivalent) | Absent | Set fulfilment mode + pickup outlet with `expectedCheckoutRevision`; bump revision; invalidate READY | AF-036H-06 | B | R2 | IT |
| New pickup eligibility application ops | Absent | Compose: outlet.active + profile.enabled + `resolveOperating` accepting + assortment/availability for cart | AF-036H-05 | B | R2 | unit/IT |
| `src/server/checkout/adapters/serviceability.ts` | Always used | Invoked **only** for DELIVERY | AF-036H-02 | B | R2 | IT |
| `src/server/checkout/adapters/pricing.ts` `buildCheckoutCommercialResult` | Applies delivery when `destination` **or** falls through to price-book delivery | **Structural omit** of delivery charge when `fulfilmentMode === PICKUP` (do not use `else if (deliveryDef)` arm) | AF-036H-07 | B | R2 | unit + IT AC-008…011 |
| `src/server/checkout/compare-snapshots.ts` | Assumes destination | Mode-aware compare | AF-036H-07 | B | R2 | unit |
| `src/server/assortment/resolve-operating.ts` | Reusable | Reuse as-is for accepting / paused / suspended / closed_by_schedule | AF-036H-05 | B | R1 | existing + eligibility IT |
| Assortment/availability adapters | Reusable | Reuse `collectAssortmentAvailabilityProblems` with selected pickup outlet | AF-036H-05 | B | R1 | IT |

### 4.5 APPLICATION — Payment

| Module | Current | Required | Authority | Dep | Risk | Proof |
|---|---|---|---|---|---|---|
| `src/server/payment/operations.ts` `startPayment` / `completeZeroPayableCheckout` / `retryPayment` | Calls prepare (Delivery-shaped) | No payment-domain destination reads; rely on mode-aware prepare | AF-036H-07; payment ADRs | C | R2 | IT AC-012/013 |
| Razorpay provider / webhook / inbox | No destination deref | Unchanged once snapshot seals | D-361/362/363 | C | R1 | regression |
| `src/server/payment/after-payment-succeeded.ts` + order materialize hook | Materialize without destination | Unchanged | D-357 | C | R1 | IT |
| `src/server/order/recovery.ts` | Missing-Order recovery | Unchanged aggregate path | D-362 | C | R1 | regression |

**Payment paths that assume destination today:** only via `prepareCheckoutForPayment` / evaluate — fix at checkout boundary.

### 4.6 APPLICATION — Order

| Module | Current | Required | Authority | Dep | Risk | Proof |
|---|---|---|---|---|---|---|
| `src/server/order/materialize.ts` | No destination | Unchanged aggregate | AF-036H-09; AC-014 | C | R1 | IT |
| `src/server/order/projections.ts` `destinationFromSnapshot` | Assumes non-null dest | Mode-aware; pickup projection; destination null for PICKUP | AF-036H-10 | C | R2 | unit/IT |
| `src/server/order/customer-reads.ts` / `workforce-reads.ts` | Destination required | Project `fulfilmentMode` + pickup location; Delivery projection null for Pickup | AF-036H-10 | C | R2 | HTTP IT |
| `src/server/order/lifecycle.ts` accept/fulfil/cancel | Unchanged commands | Reuse `fulfilOrder` for handover; copy may differ in UI only | AF-036H-09 | C/E | R2 | IT AC-018…020 |

### 4.7 DELIVERY_GUARD

| Module | Current | Required | Authority | Dep | Risk | Proof |
|---|---|---|---|---|---|---|
| **`src/server/delivery/operations.ts` `createDelivery`** | Status + uniqueness only | Lock Order → Snapshot → `fulfilmentMode`; reject `PICKUP` before insert; zero provider I/O | AF-036H-08 | C | R2 | HTTP IT AC-015/016 |
| `src/server/delivery/workforce.ts` `arrangeDelivery` | Calls createDelivery | Covered by createDelivery guard | AF-036H-08 | C | R1 | same |
| Other create paths | **NONE in production** (verified) | Keep single choke point | AF-036H-08 | — | R1 | grep + test |

**Authoritative guard:** `createDelivery` only. Do not rely on Ops UI hiding.

### 4.8 FINANCIAL_DOCUMENT

| Module | Current | Required | Authority | Dep | Risk | Proof |
|---|---|---|---|---|---|---|
| `src/server/financial-document/receipt-voucher-from-payment.ts` | `destination.recipient*` | DELIVERY preserve; PICKUP → all three recipients `null`; no customer lookup; no pickup-address substitution | AF-036H-12 Option A | C | R2 | IT AC-028 |
| `src/server/financial-document/tax-invoice-from-order.ts` | Same | Same | AF-036H-12 | C | R2 | IT |
| Refund statutory paths | Inherit prior FD recipients | Unchanged inherit semantics | D-366 | C | R1 | refund regression |
| Place of supply | Destination state or issuer profile | Keep D-365 issuer/profile policy when recipients null | D-365 | C | R2 | IT |

### 4.9 NOTIFICATION

| Module | Current | Required | Authority | Dep | Risk | Proof |
|---|---|---|---|---|---|---|
| `ORDER_RECEIVED` / `PAYMENT_CONFIRMED` / `ORDER_ACCEPTED` / `ORDER_CANCELLED` | Fire for all | Keep; fulfilment-aware wording where templates exist | AF-036H-11 | C | R1 | AC-029 |
| `OUT_FOR_DELIVERY` / `DELIVERED` | From Delivery lifecycle only | Must not fire for Pickup (satisfied if createDelivery fail-closed) | AF-036H-11 | C | R2 | AC-029 + Delivery guard IT |
| Do **not** expand Meta WhatsApp / new semantics beyond implemented foundation | — | Scope capped | AF-036H-11 | — | — | — |

### 4.10 TRANSPORT — Customer API

Repository-native routes (match `/api/v1/checkouts/{id}/destination` style):

| Method | Path | Body / notes |
|---|---|---|
| `GET` | `/api/v1/checkouts/{checkoutId}/pickup-options` | Eligible outlets only; no internal hierarchy / legal-entity / serviceability dump |
| `POST` | `/api/v1/checkouts/{checkoutId}/fulfilment` | `expectedCheckoutRevision`, `fulfilmentMode`, `pickupOutletId?` |

Wire in `src/server/customer-commerce/http/router.ts` + `src/lib/customer-commerce/checkout.ts`.

**Error vocabulary**

| Situation | Code |
|---|---|
| No eligible outlets / Pickup disabled | `PICKUP_NOT_AVAILABLE` |
| Selected outlet not eligible | `PICKUP_OUTLET_NOT_ELIGIBLE` |
| PICKUP without outlet when required | `PICKUP_OUTLET_REQUIRED` |
| Revision mismatch | `CHECKOUT_CONFLICT` (reuse) |
| Commercial change after switch | `CHECKOUT_REPRICED` (reuse) |
| Payment-pending mutation | `CHECKOUT_STATE_CONFLICT` (reuse) |
| Bad body | `CHECKOUT_INVALID_INPUT` (reuse) |

### 4.11 TRANSPORT — Operations API

| Method | Path | Auth |
|---|---|---|
| `GET` | `/api/operations/v1/outlets/{outletId}/pickup-profile` | `outlet.read` |
| `PUT`/`POST` | `/api/operations/v1/outlets/{outletId}/pickup-profile` | `outlet.update` + `expectedRevision` |

Place beside existing store routes in `src/server/operations/http/store-routes.ts` +
`src/lib/operations/store.ts`. Audit via existing store audit patterns. **No new permission.**

### 4.12 CUSTOMER_UI

| Surface | File(s) | Required |
|---|---|---|
| Checkout shell | `CheckoutClient.tsx` | Delivery \| Pickup selector before destination step; rename step “Delivery” → fulfilment-aware |
| Destination | `CheckoutDestinationFlow.tsx` + Maps stack | **Only** when DELIVERY |
| Pickup outlet | new sibling component in same step | AUTO_SELECT (1) / CUSTOMER_SELECT (N) / empty unavailable |
| Review | `CheckoutClient` review + money summary | Pickup location + instructions; no delivery fee line |
| Payment / recovery | `PaymentPanel.tsx`, recovery views | Works with Pickup snapshot (no dest prefill required) |
| Confirmation / history / detail | `OrderConfirmationClient`, `OrderHistoryClient`, `OrderDetailClient` | Show Pickup; suppress Delivery tracking |
| Maps | `CustomerDeliveryAddressFlow`, `LocationSelector`, etc. | Must not be invoked on Pickup happy path (AC-030) |

### 4.13 OPERATIONS_UI

| Surface | File(s) | Required |
|---|---|---|
| Pickup Profile | New Store Ops subnav under `/workforce/operations/store/` | Manage profile fields; defaults OFF |
| Order list | `OperationsOrderListClient.tsx` | DELIVERY \| PICKUP badge |
| Order detail | `OperationsOrderDetailClient.tsx` | Pickup location; suppress `OperationsDeliveryPanel` for Pickup |
| Handover | Fulfil control / confirm dialog | Copy “Handed to customer” / “Mark as picked up”; still `order.fulfil`; mismatch safety AC-039/040 |
| Admin outlets | Admin identity PATCH | **Do not** put Pickup Profile on Admin name/status PATCH |

### 4.14 TEST

See §6 AC matrix. Add focused suites under existing `tests/` layouts:
checkout domain/IT, pickup eligibility, delivery guard, FD adapters, customer HTTP, ops store,
browser E2E for Delivery regression + Pickup golden journey, a11y component/browser for AC-041/042.

### 4.15 GOVERNANCE

This authorization tranche only. Implementation start is a separate tip.

---

## 5. Tranche scopes (executable)

### IMP-036H-A — Schema + Domain Foundation

**In:** migration 0044; Drizzle mappings; shared FulfilmentMode + mode-conditional Snapshot types;
OutletPickupProfile persistence + repository; checkout repository mappers; domain/unit + Postgres IT;
historical DELIVERY backfill proof.

**Out:** customer/ops UI; payment; Delivery guard behaviour beyond schema; evaluate branching.

**Main green rule:** default mode DELIVERY preserves all existing runtime behaviour.

### IMP-036H-B — Pickup Eligibility + Checkout Commercial Core

**In:** eligibility composition; pickup-options + fulfilment mutation APIs (can land here or with D
transport; prefer HTTP here so commercial core is testable without UI); evaluate/prepare branching;
pricing structural no-delivery-charge; snapshot seal of pickup location; revision/READY invalidation;
stale snapshot / repriced paths.

**Out:** customer UX polish; Ops profile UI; FD/Delivery guard (C).

### IMP-036H-C — Payment / Order / Delivery / Financial Boundaries

**In:** payment prepare compatibility; Order projections; `createDelivery` fail-closed;
Receipt Voucher + Tax Invoice Option A; notification gating proof; refund statutory regression;
customer/ops order read APIs projecting mode.

**Out:** full customer/ops interactive UX (D/E).

### IMP-036H-D — Customer Pickup Experience

**In:** selector; outlet selection; zero-eligible UX; review; pay; confirmation; history/detail;
mode switching; mobile; AC-041 a11y; prove no Maps on Pickup path.

### IMP-036H-E — Operations Experience

**In:** Pickup Profile management UI+API if not fully in B/C; list badge; detail; hide Delivery
chrome; handover copy on fulfil; AC-042 a11y; audit/scope.

### IMP-036H-F — Integration / Regression / Evidence

**In:** all 42 ACs owned; Delivery golden journey green; Pickup golden journey; payments;
zero-payable; refunds; FD; notifications; security/BOLA; migration; browser E2E; a11y evidence pack.
Produces implementation-complete evidence candidate. **Does not** self-accept IMP-036H or run
Founder UAT.

---

## 6. Acceptance traceability (AC-036H-001 … 042)

| AC | Summary | Primary proof owner | Automation class |
|---|---|---|---|
| 001 | Delivery golden journey unchanged | F (+ existing E2E) | BROWSER_E2E |
| 002 | Pickup golden journey ASAP E2E | F | BROWSER_E2E |
| 003 | Single outlet AUTO_SELECT | B/D | HTTP_IT + COMPONENT |
| 004 | Multi outlet CUSTOMER_SELECT | B/D | HTTP_IT + COMPONENT |
| 005 | Pickup-disabled excluded | B | POSTGRES_IT / HTTP_IT |
| 006 | Inactive outlet excluded | B | POSTGRES_IT / HTTP_IT |
| 007 | Cart not fulfilable → recoverable | B/D | HTTP_IT + COMPONENT |
| 008 | No delivery fee | B | UNIT + POSTGRES_IT |
| 009 | Packaging still applies | B | UNIT + POSTGRES_IT |
| 010 | Taxes correct | B | POSTGRES_IT |
| 011 | Coupons/promos semantics | B | POSTGRES_IT |
| 012 | Online payment succeeds | C/F | HTTP_IT + BROWSER_E2E |
| 013 | Zero-payable Pickup | C | HTTP_IT / POSTGRES_IT |
| 014 | Order materializes once / no PickupOrder | C | POSTGRES_IT |
| 015 | No Delivery aggregate | C | POSTGRES_IT |
| 016 | Delivery create rejected | C | HTTP_IT |
| 017 | Ops list badge | E | COMPONENT / HTTP_IT |
| 018 | Ops accept Pickup | E/C | HTTP_IT |
| 019 | Handover fulfil → FULFILLED | E/C | HTTP_IT |
| 020 | Unauthorized fulfil denied | E/C | HTTP_IT |
| 021 | Pre-pay confirmation Pickup facts | D | COMPONENT / BROWSER_E2E |
| 022 | Customer history/detail Pickup | D/C | HTTP_IT + COMPONENT |
| 023 | No Delivery tracking for Pickup | D/C | HTTP_IT + COMPONENT |
| 024 | Delivery→Pickup recalculates | B/D | HTTP_IT |
| 025 | Pickup→Delivery needs destination | B/D | HTTP_IT |
| 026 | Mutation after payment-pending fails | B/C | HTTP_IT |
| 027 | Cancel/refund; no no-show penalty | C/F | HTTP_IT / POSTGRES_IT |
| 028 | Financial documents correct | C | POSTGRES_IT |
| 029 | Notifications Pickup-aware | C | UNIT / POSTGRES_IT |
| 030 | No Maps/location APIs on Pickup | D | COMPONENT + BROWSER_E2E |
| 031 | Existing Delivery E2E green | F | BROWSER_E2E |
| 032 | Zero eligible → unavailable UX | B/D | HTTP_IT + COMPONENT |
| 033 | Eligible = active+enabled+accepting+cart | B | POSTGRES_IT / HTTP_IT |
| 034 | Paused excludes | B | POSTGRES_IT |
| 035 | Suspended excludes | B | POSTGRES_IT |
| 036 | closed_by_schedule excludes | B | POSTGRES_IT |
| 037 | Leaves accepting before pay | B/C | HTTP_IT |
| 038 | Merchandise unavailable before pay | B/C | HTTP_IT |
| 039 | V1 handover = order confirmation match | E | HTTP_IT + COMPONENT |
| 040 | Handover mismatch must not fulfil other Order | E/C | HTTP_IT |
| 041 | Customer fulfilment a11y | D/F | ACCESSIBILITY |
| 042 | Workforce handover a11y | E/F | ACCESSIBILITY |

**IMP-036H-F candidate evidence:** see
[`evidence-candidate.md`](./evidence-candidate.md) (`IMPLEMENTATION_COMPLETE_CANDIDATE` only;
does not advance ROADMAP/STATE acceptance flags).


```text
total_ac: 42
automated_primary: 42 (Founder UAT supplements interactive judgment; does not substitute AC proof)
founder_uat_supplement: YES (IMP036H_FOUNDER_UAT_REQUIRED)
uncovered: 0
```

Manual Founder UAT remains required for final acceptance after independent technical acceptance; it
does not replace the automation owners above.

---

## 7. Regression scope

| Journey / area | Strategy |
|---|---|
| Existing Customer Delivery Order | Keep fixture + browser E2E green (AC-001/031) |
| New Customer Pickup Order | New golden journey (AC-002) |
| Customer auth | Existing auth gates on new checkout routes |
| Payment + recovery | start/retry/webhook/zero-payable on both modes |
| Order recovery | missing-Order batch unchanged |
| Refund + statutory FD | Delivery unchanged; Pickup inherits Option A nulls |
| Financial Document | Dual-mode issuance tests |
| Ops Order lifecycle | accept/fulfil/cancel both modes |
| Store Operations | Pickup Profile + existing operating/assortment regression |
| Delivery execution | Delivery-only paths unchanged; Pickup blocked at createDelivery |

---

## 8. Security requirements

```text
Preserve: customer ownership; workforce outlet scope; CSRF/origin; rate limits; step-up;
         payment signature/webhook; PII minimization; audit
Pickup-options MUST NOT be: outlet enumeration oracle; internal hierarchy leak; cross-brand leak
No new CSP hosts
BOLA/scope tests on pickup-profile + fulfilment routes
```

---

## 9. Program pause (unchanged)

```text
IMP037: HOLD / BLOCKED_PROVIDER_ACCESS
IMP038: HOLD / IMPLEMENTATION_COMPLETE / NOT_ACCEPTED; external assessment deferred; frozen evidence preserved
IMP036I: PLANNED / NOT_ACTIVATED
IMP039: NOT_ACTIVATED
IMP040: NOT_ACTIVATED
```

IMP-036H implementation does not require DigitalOcean.

---

## 10. Open implementation questions (non-RED)

```text
1. Exact Store Ops subnav label/copy for Pickup Profile (non-binding UX; fit under existing store shell).
2. Whether fulfilment HTTP lands fully in tranche B vs thin transport stub in B + UI in D
   (prefer full HTTP in B for commercial proof).
3. Notification template string updates limited to already-implemented empty-variable foundation
   vs copy-only ops until adapter variables exist — stay within AF-036H-11; do not invent new channels.
```

```text
RED_DECISIONS_REQUIRED = NONE
```

---

## 11. Recommended next action

```text
Begin IMP-036H-A from exact merged main after this authorization tip,
using migration identity 0044_imp036h_fulfilment_mode_pickup and this plan.
Do not begin Founder UAT. Do not accept IMP-036H.
```
