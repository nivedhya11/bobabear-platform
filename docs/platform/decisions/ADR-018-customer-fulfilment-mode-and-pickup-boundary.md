---
Status: Accepted
Decision date: 2026-09-23
Last updated: 2026-09-25
Decision ID: D-378
Amends: none (layers on ADR-008 serviceability/cart/checkout; ADR-007 pricing; ADR-011 delivery; D-357 order lifecycle; D-365 financial documents; D-372 operations transport)
Amended by: D-379 / ADR-019 (ASAP-only and no-scheduled-schema clauses only)
---

# ADR-018: Customer Fulfilment Mode and Pickup Boundary

## Amendment notice (2026-09-25)

**D-378 / ADR-018** is amended by **D-379 / ADR-019** only for the ASAP-only and no-scheduled-schema
clauses. The remaining Pickup/Delivery mode boundary stays binding: `DELIVERY | PICKUP` mode
authority, Pickup fail-closed Delivery boundary, selected Pickup Outlet authority, Pickup
destination/privacy boundary, Pickup delivery-charge boundary, Financial Document Option A, and no
Delivery aggregate for Pickup. Fulfilment mode is orthogonal to fulfilment timing. This notice does
not rewrite the accepted Pickup history below as though Scheduled timing had always existed.

```text
D-378_STATUS: AMENDED
ADR018_STATUS: AMENDED
ARCH-G28_STATUS: CURRENT
AMENDED_BY: D-379 / ADR-019
AMENDMENT_SCOPE: ASAP-only / no-scheduled-schema clauses only
```

## Status

**Accepted** (2026-09-24). Binding CURRENT decision **[D-378](../decision-register.md)**.
Global architecture tip is **ARCH-R22** (**ARCH-G28**). IMP-036H Architecture Fit = **PASS**;
architecture = **LOCKED**. Implementation remains **NOT AUTHORIZED**.

```text
D-378_STATUS: CURRENT
ARCH-R22_STATUS: CURRENT
ARCH-G28_STATUS: CURRENT
IMP036H_ARCHITECTURE_FIT: PASS
IMP036H_ARCHITECTURE_LOCKED: YES
IMP036H_IMPLEMENTATION_AUTHORIZED: NO
```

Locked capability architecture:

[`../capabilities/IMP-036H-customer-pickup-takeaway.md`](../capabilities/IMP-036H-customer-pickup-takeaway.md)

Independent Architecture Fit evidence (exact evaluated candidate):

```text
FIT_EVALUATED_HEAD: aab814c238c499367ee921e9f8ffb03ff7b1b373
FIT_EVALUATED_TREE: 93d4e83d4a73c61c9439bcaae2799920fcca46db
FIT_EVALUATED_FINGERPRINT: 74b1254f22c9131a6e073522cf9310f264866e442cc074775ad5f4b214f0e51e
INDEPENDENT_ARCHITECTURE_FIT: PASS
INDEPENDENT_ARCHITECTURE_FIT_EVIDENCE: PR #239 review 5295149318
```

Historical Fit-candidate authoring tip (pre-lock): GTM-R142 / STATE-R140 / ARCH-R21 / DR-19.

## Context

`PD-IMP-036H-DRAFT-1` (APPROVED; Product Definition Gate PASS) requires ASAP Customer Pickup /
Takeaway as a peer to Delivery without a separate PickupOrder, new Order lifecycle, new payment
model, new Delivery model, new auth realm, new deployable service, new queue/worker, new role, or
new permission. Scheduled fulfilment remains exclusive to IMP-036I.

Verified repository evidence at Fit candidate authoring (retained):

- Checkout Snapshot destination fields and `serviceabilityEvaluatedAt` are Delivery-shaped NOT NULL
  (`drizzle/0015_checkout.sql`).
- Commercial evaluation can apply a configured Delivery charge even without a destination
  (`src/server/checkout/adapters/pricing.ts`).
- `createDelivery` does not currently read fulfilment mode from Checkout Snapshot
  (`src/server/delivery/operations.ts`).
- Financial Document issuance adapters currently read `snapshot.destination` for recipient
  particulars; place-of-supply already falls back to issuer profile state when destination state is
  not a GST 2-digit code (`src/server/financial-document/tax-invoice-from-order.ts`).
- `order.fulfil` exists in the access catalog and is granted to `platform_super_admin`,
  `brand_admin`, `outlet_manager`, `kitchen_operator`, and `delivery_coordinator`.

## Decision Summary

```text
FULFILMENT_MODE = DELIVERY | PICKUP
IMP036H_TIMING = ASAP only (IMP-036I owns scheduling)

Mutable pre-payment intent: Checkout (fulfilmentMode + pickupOutletId when PICKUP)
Immutable paid truth: Checkout Snapshot (fulfilmentMode + mode-conditional sealed facts)
Order: references Checkout Snapshot; does not duplicate mutable fulfilmentMode authority

DELIVERY:
  requires destination + serviceability
  may create Delivery execution

PICKUP:
  binds eligible selected Outlet via selectedOutletId
  requires no customer delivery destination/serviceability
  must never create or invoke a Delivery aggregate
  commercial evaluation must not apply delivery charge definitions
```

Binding global invariant **ARCH-G28**:

> Checkout Snapshot owns the immutable fulfilment commitment for a purchased order. `DELIVERY` and
> `PICKUP` are mutually exclusive modes. DELIVERY requires delivery destination/serviceability and
> may create Delivery execution. PICKUP binds an eligible selected Outlet, requires no customer
> delivery destination/serviceability, and must never create or invoke a Delivery aggregate.

## Consequences

### Positive

- Single Order aggregate and existing lifecycle remain authoritative (D-357).
- Pickup location truth is sealed on Snapshot; mutable OutletPickupProfile cannot rewrite history.
- Delivery fail-closed is enforceable at `createDelivery` / Delivery application boundary.
- Structural no-delivery-charge Pickup pricing closes the current “delivery def without destination”
  commercial hole.
- No new deployable service, role, permission, auth realm, or queue.

### Negative / accepted constraints

- Schema migration required (forward-only; no `drizzle-kit push`). Migration is **not** executed by
  architecture lock alone.
- Financial Document issuance adapters must become fulfilment-mode aware (AF-036H-12).
- Notification wording for Delivery-only semantic types must remain Delivery-gated.

### Financial Document consequence (AF-036H-12 — corrected Option A)

PICKUP Financial Document issuance is fulfilment-aware.

It must not:

- require a fake Delivery destination;
- query mutable customer identity to reconstruct recipient facts;
- classify Pickup location as recipient/customer address.

Optional recipient fields remain absent (`null`) unless backed by immutable accepted recipient
authority already sealed on the purchased Snapshot. DELIVERY continues to map recipient facts from
the sealed Delivery destination. Place-of-supply continues under existing issuer/profile policy.
`NO_NEW_LEGAL_CLAIM` — nullable ≠ a legal conclusion that recipient particulars can never be
required; D-365 fail-closed remains if a required sealed fact cannot be produced.
D-366 / D-367 remain unchanged.

### Deferred

- Scheduled fulfilment timing persistence → IMP-036I.
- Pickup OTP / PIN / QR / signature / PickupProof → NOT_SUPPORTED for IMP-036H (FD-036H-23).
- Kitchen PREPARING / READY_FOR_PICKUP statuses → deferred (FD-036H-11).

## Non-decisions

This Accepted ADR does **not**:

- authorize IMP-036H implementation or schema execution
- activate IMP-036I / IMP-039 / IMP-040
- accept or reopen IMP-037 / IMP-038
- invent GST / legal place-of-supply or recipient-particular claims beyond mapping sealed
  commercial facts into existing Financial Document command fields (`NO_NEW_LEGAL_CLAIM`)

## References

- Product Definition: [`../product/IMP-036H/product-definition.md`](../product/IMP-036H/product-definition.md)
- Locked capability: [`../capabilities/IMP-036H-customer-pickup-takeaway.md`](../capabilities/IMP-036H-customer-pickup-takeaway.md)
- ADR-007, ADR-008, ADR-011; D-357, D-365, D-372, D-377, D-378
