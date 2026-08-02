---
Status: Canonical
Last updated: 2026-08-01
---

# BOBA Bear — Roadmap and Open Decisions

## Status

This document records the **Provisional** phased direction for evolving beyond V1, and the
complete, **explicitly Open** list of decisions this documentation set does not resolve. Phases
described below express direction, not committed release dates or approved scope for any phase
beyond V1.

## Future point-of-sale evolution

The Operations Console introduced in [`operating-model.md`](./operating-model.md) is intended to
grow, over time, into a fuller operations and point-of-sale platform. The stages below describe the
intended direction of that growth. **They are not committed release dates**, and no phase beyond
Stage 1 is approved scope for current work.

**Stage 1 — Direct-order operations** *(this is V1 — see [`v1-product-scope.md`](./v1-product-scope.md))*
- Web and WhatsApp orders
- Kitchen status
- Payments and refunds
- Delivery assignment

**Stage 2 — Kitchen management**
- Kitchen display system
- Preparation stations
- Timers
- Printer integration
- Order prioritization
- Product availability controls

**Stage 3 — Counter POS**
- Walk-in billing
- Cash and UPI payments
- Receipts
- Cashier workflows
- Shift management

**Stage 4 — Unified restaurant platform**
- Aggregator integrations
- Inventory
- Recipes and ingredient consumption
- Procurement
- Reporting
- Accounting exports
- Multi-outlet management
- Franchise operations

## Open decisions

The following decisions are unresolved. They are listed here rather than silently defaulted, and
each has a corresponding row in [`decision-register.md`](./decision-register.md). None of them
should be treated as answered by omission elsewhere in this documentation set or in the
repository's existing code.

1. **Final hosting and cloud platform** — no provider is selected; see
   [`architecture-foundation.md`](./architecture-foundation.md).
2. **Exact India region and data-location requirements** — beyond the general preference for
   India-located transactional data and services.
3. **Authentication and OTP provider** — for customer sign-in and phone verification.
4. **Payment gateway** — for direct online payment.
5. **Delivery-provider strategy** — which partner(s), and how multiple partners might be
   supported.
6. **Availability of delivery-provider APIs** — whether a chosen partner supports programmatic
   assignment and tracking, which determines how much can be automated versus handled manually at
   launch.
7. **Initial serviceability method** — configured localities, zones, distance bands, or pincodes;
   the exact mechanism for Dehradun is not yet chosen.
8. **Exact cancellation policy** — under what conditions a customer or outlet may cancel, and up
   to what order state.
9. **Exact refund policy** — timelines, partial-refund handling, and approval requirements beyond
   the structural principles in [`order-payment-delivery-model.md`](./order-payment-delivery-model.md).
10. **Tax and invoicing requirements** — applicable tax treatment and invoice format for direct
    orders.
11. **Legal entity configuration** — the confirmed legal entity (or entities) responsible for
    direct-order invoicing, tax, and settlement; see the note in
    [`organization-outlet-access-model.md`](./organization-outlet-access-model.md#v1-organizational-configuration).
12. **Payment settlement owner** — which legal entity or account direct-order payments settle to.
13. **Customer-support workflow** — channel, staffing model, and escalation path for direct-order
    support.
14. **Exact WhatsApp capability at launch** — the precise set of assisted-ordering and
    notification capabilities available in WhatsApp for V1, versus later conversational ordering.
15. **Shared-cart policy for future food, merchandise, and drops** — whether and how a cart may
    ever span categories; see [`v1-product-scope.md`](./v1-product-scope.md#merchandise-and-gated-drops).
16. **Future point-of-sale milestones** — firm scope and timing for Stages 2–4 above.
17. **Native mobile-app timing** — when Android and iOS applications move from Deferred to
    scoped work.
18. **Multi-city rollout sequence** — which city follows Dehradun, and on what basis.
19. **Franchise settlement model** — how franchise payment settlement, royalty, and deductions
    will work; see [`order-payment-delivery-model.md`](./order-payment-delivery-model.md#payment-and-settlement-foundation).
20. **Franchise pricing authority** — the exact limits of what a franchise organization may price
    independently versus what the brand or territory locks.
21. **Franchise customer-data access** — the precise boundary of customer information a
    franchisee may access beyond what is required to fulfil its own orders; see
    [`organization-outlet-access-model.md`](./organization-outlet-access-model.md#customer-ownership).
22. **Brand-versus-franchise promotion authority** — who may create promotions or discounts at
    each organizational level.

## How to use this list

An open decision should be resolved by:

1. Recording the decision in [`decision-register.md`](./decision-register.md) with status
   **Locked** (or **Provisional**, if it is a working assumption rather than a firm commitment).
2. Updating the relevant canonical document(s) to reflect the resolved decision.
3. Removing the corresponding item from the open-decisions list above, or marking it resolved with
   a pointer to the decision register row.

This follows the [documentation update protocol](./README.md#documentation-update-protocol) in the
index document.

## Related documents

- [`v1-product-scope.md`](./v1-product-scope.md) — the release scope these open decisions do not block, because V1 does not depend on resolving most of them.
- [`operating-model.md`](./operating-model.md) — Stage 1 in operational detail.
- [`organization-outlet-access-model.md`](./organization-outlet-access-model.md) — the franchise-related open decisions in structural context.
- [`order-payment-delivery-model.md`](./order-payment-delivery-model.md) — the payment- and delivery-provider open decisions in structural context.
- [`decision-register.md`](./decision-register.md) — the structured, dated record of every decision referenced above.
