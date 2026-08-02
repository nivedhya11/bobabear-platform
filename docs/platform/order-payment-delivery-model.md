---
Status: Canonical
Last updated: 2026-08-01
---

# BOBA Bear — Order, Payment, and Delivery Model

## Status

This document records **Locked** structural principles for how an order is created, priced,
paid for, and delivered, alongside **illustrative, non-final** state lists and a set of
explicitly **Open** provider decisions. No payment gateway, delivery provider, or database schema
is selected or created here.

## Outlet selection and cart boundary

Every direct order must belong to exactly one fulfilment outlet. The intended flow is:

```text
Customer selects address or location
                ↓
Platform determines serviceable outlets
                ↓
One outlet is selected
                ↓
Menu, pricing, and availability are resolved
                ↓
Customer builds the cart
```

**A V1 cart must not contain products from multiple outlets.** This is a structural rule, not a
temporary limitation, because outlets can differ in:

- Legal entity
- Inventory
- Prices
- Taxes
- Preparation times
- Delivery providers
- Fulfilment responsibility

A single-outlet cart keeps every one of these dimensions unambiguous for a given order. See
[`organization-outlet-access-model.md`](./organization-outlet-access-model.md) for the outlet
entity this selection is drawn from.

## Order ownership and historical snapshots

Each order must retain durable ownership and commercial context, including:

- Brand
- Organization
- Outlet
- Legal entity
- Territory
- Customer
- Sales channel
- Currency
- Price book
- Payment account
- Fulfilment type

Order **items** must retain snapshots of:

- Product names
- Variant names
- Add-ons
- Prices
- Discounts
- Taxes
- Packaging charges
- Delivery charges
- Customer instructions
- Outlet details
- Invoice-issuer details, where relevant

**Historical orders must not change when the live catalog, prices, outlet ownership, or legal
configuration changes.** An order is a record of what was agreed and charged at the time it was
placed, independent of later catalog or organizational changes.

## Payment and settlement foundation

The initial direct-payment model may be centrally controlled by BOBA Bear. **The platform must not
assume that all future franchise payments will always settle to one permanent account.** The data
model needs future abstractions around:

- Payment account
- Settlement beneficiary
- Operating organization
- Legal entity
- Payment provider
- Payment transaction
- Refund transaction

Possible future franchise settlement requirements include central collection, direct franchise
settlement, brand royalty, marketing contribution, technology fee, delivery deductions, and refund
allocation. **These franchise settlement features are Deferred and must not be implemented in
V1.** Their eventual shape is recorded as an open question in
[`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md), not designed here.

## Delivery model

- BOBA Bear will initially use third-party delivery partners such as Rapido or similar local
  services. **No specific delivery provider is selected in this documentation.**
- Delivery charges will normally be borne by the customer.
- BOBA Bear will launch serviceability city by city; **Dehradun is the initial operating market.**
- Initial serviceability may use configured localities, zones, distance bands, or pincodes. More
  advanced geospatial serviceability can be introduced later.
- BOBA Bear should own the delivery experience for direct orders — the customer's tracking and
  communication experience should be consistent regardless of which delivery partner actually
  fulfils a given order.
- The platform should remain independent of any single delivery provider — a provider-neutral
  delivery interface is required in the architecture (see
  [`architecture-foundation.md`](./architecture-foundation.md)), even though no provider is
  selected in this task.
- Manual rider booking or dispatch may be used before reliable delivery-provider APIs are
  available.
- **Exact live rider tracking should not be promised to customers unless a specific delivery
  provider is confirmed to support it.** Order tracking (see states below) is a platform
  guarantee; live GPS rider tracking is not, until a provider decision is made.

## Order, payment, and delivery states

Order state, payment state, and delivery state are modeled as **separate domains** — an order can,
for example, be "Paid" while its delivery is still "Awaiting assignment." The lists below are
**illustrative**, intended to communicate the shape of each state domain for planning purposes.
**They are not final implementation enums.** Exact state names, transitions, and allowed
state-machine paths remain subject to detailed domain design.

**Illustrative payment states:**
- Created
- Authorized
- Captured
- Failed
- Partially refunded
- Refunded

**Illustrative order states:**
- Draft
- Payment pending
- Paid
- Awaiting acceptance
- Accepted
- Rejected
- Preparing
- Ready for pickup
- Out for delivery
- Delivered
- Cancellation requested
- Cancelled

**Illustrative delivery states:**
- Not required
- Awaiting quote
- Awaiting assignment
- Assigned
- Picked up
- In transit
- Delivered
- Failed
- Cancelled

## Payment integrity principles

The following integrity requirements are **Locked** regardless of which payment gateway is
eventually selected:

- The browser must never directly declare an order paid; payment confirmation is not a
  client-trusted event.
- Payment verification must occur server-side.
- Payment-provider callbacks (webhooks) must be authenticated and idempotent.
- Pricing must be recalculated by trusted backend logic at checkout time, not trusted from
  client-submitted values.
- Duplicate payment or webhook events must not create duplicate orders.
- Payment state and order state must remain separate, related but independently trackable domains.
- Refunds must be permission-controlled (see the capability model in
  [`organization-outlet-access-model.md`](./organization-outlet-access-model.md)) and auditable
  (see [`architecture-foundation.md`](./architecture-foundation.md#audit-requirements)).
- The following scenarios must be handled explicitly, not left as undefined behavior: failed
  payment, successful payment with an operational failure afterward (for example, the outlet
  cannot fulfil the order), and duplicate callback delivery from the payment provider.

No payment gateway is selected in this document — see
[`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md).

## Related documents

- [`v1-product-scope.md`](./v1-product-scope.md) — the customer-facing checkout and tracking experience this model supports.
- [`organization-outlet-access-model.md`](./organization-outlet-access-model.md) — the outlet, organization, and legal-entity entities referenced in order ownership.
- [`operating-model.md`](./operating-model.md) — how order and delivery states are surfaced to kitchen and delivery staff in the Operations Console.
- [`architecture-foundation.md`](./architecture-foundation.md) — the relational data model and audit requirements underlying orders, payments, and refunds.
- [`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md) — payment gateway, delivery provider, and franchise settlement decisions that remain open.
- [`decision-register.md`](./decision-register.md) — structured record of the decisions summarized here.
