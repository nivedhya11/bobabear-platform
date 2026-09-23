---
Status: Proposed
Decision date: 2026-09-23
Last updated: 2026-09-23
Decision ID: D-378 (PROPOSED — not CURRENT)
Amends: none (layers on ADR-008 serviceability/cart/checkout; ADR-007 pricing; ADR-011 delivery; D-357 order lifecycle; D-365 financial documents; D-372 operations transport)
Amended by: none
---

# ADR-018: Customer Fulfilment Mode and Pickup Boundary

## Status

**Proposed** (2026-09-23). Register identity **[D-378](../decision-register.md)** is **PROPOSED** only.
Global architecture tip remains **ARCH-R21**. Proposed invariant **ARCH-G28** and architecture
revision **ARCH-R22** are recorded in this ADR and the IMP-036H Architecture Fit candidate; they
are **not** CURRENT until independent Architecture Fit review PASS and authorized lock persistence.

```text
D-378_STATUS: PROPOSED
ARCH-R22_STATUS: PROPOSED_LOCK_DELTA (not applied to ARCHITECTURE.md meta)
ARCH-G28_STATUS: PROPOSED
IMP036H_ARCHITECTURE_LOCKED: NO
IMP036H_IMPLEMENTATION_AUTHORIZED: NO
```

Capability Fit candidate:

[`../capabilities/IMP-036H-customer-pickup-takeaway.md`](../capabilities/IMP-036H-customer-pickup-takeaway.md)

## Context

`PD-IMP-036H-DRAFT-1` (APPROVED; Product Definition Gate PASS) requires ASAP Customer Pickup /
Takeaway as a peer to Delivery without a separate PickupOrder, new Order lifecycle, new payment
model, new Delivery model, new auth realm, new deployable service, new queue/worker, new role, or
new permission. Scheduled fulfilment remains exclusive to IMP-036I.

Verified CURRENT tip at Fit candidate authoring:

```text
ROADMAP = GTM-R142
STATE = STATE-R140
ARCHITECTURE = ARCH-R21
DECISION_REGISTER = DR-19
MAIN_HEAD = 3f1a5bf6b84e48752d586b58f475d73b5413cc04
```

Evidence constraints from repository inspection (Fit candidate):

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

Proposed global invariant **ARCH-G28**:

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

- Schema migration required (forward-only; no `drizzle-kit push`).
- Financial Document issuance adapters must become fulfilment-mode aware without inventing a fake
  Delivery destination (see Fit AF-036H-12).
- Notification wording for Delivery-only semantic types must remain Delivery-gated.

### Deferred

- Scheduled fulfilment timing persistence → IMP-036I.
- Pickup OTP / PIN / QR / signature / PickupProof → NOT_SUPPORTED for IMP-036H (FD-036H-23).
- Kitchen PREPARING / READY_FOR_PICKUP statuses → deferred (FD-036H-11).

## Non-decisions

This Proposed ADR does **not**:

- authorize IMP-036H implementation or schema execution
- lock ARCH-R22 / ARCH-G28 as CURRENT
- activate IMP-036I / IMP-039 / IMP-040
- accept or reopen IMP-037 / IMP-038
- invent GST / legal place-of-supply claims beyond mapping sealed commercial facts into existing
  Financial Document command fields

## References

- Product Definition: [`../product/IMP-036H/product-definition.md`](../product/IMP-036H/product-definition.md)
- Capability Fit candidate: [`../capabilities/IMP-036H-customer-pickup-takeaway.md`](../capabilities/IMP-036H-customer-pickup-takeaway.md)
- ADR-007, ADR-008, ADR-011; D-357, D-365, D-372, D-377
