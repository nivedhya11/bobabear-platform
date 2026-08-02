---
Status: Canonical
Last updated: 2026-08-01
---

# BOBA Bear — V1 Product Scope

## Status

This document records the **Locked** boundary of the first sellable release ("V1") of the BOBA
Bear direct platform, and the capabilities that are **Deferred** beyond it. It assumes the business
rationale in [`product-vision.md`](./product-vision.md). It does not define how V1 is fulfilled
operationally (see [`operating-model.md`](./operating-model.md)) or how the underlying domain model
is structured (see [`architecture-foundation.md`](./architecture-foundation.md) and
[`organization-outlet-access-model.md`](./organization-outlet-access-model.md)).

## What V1 is

V1 is the first release of the BOBA Bear direct platform that a customer can use to place a real,
paid food order directly with BOBA Bear, for a single outlet in Dehradun, without using an
aggregator. V1 is primarily a **food-ordering** release. It is not a complete restaurant
point-of-sale system, not a multi-category commerce platform, and not a franchise-ready operating
system — those are later phases, described in
[`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md).

## Customer channels

**Initial channels (V1):**

- A mobile-first BOBA Bear PWA (Progressive Web App) — the primary direct ordering surface.
- WhatsApp-assisted ordering and communication.

**Later channels (Deferred):**

- Native Android application.
- Native iOS application.
- More advanced conversational WhatsApp ordering (beyond assisted ordering and notifications).

WhatsApp is a channel into the same BOBA Bear catalog, cart, pricing, payment, and order services
used by the PWA. WhatsApp must not become a separate commerce system with its own catalog, pricing,
or order records.

## Required customer experience

The first sellable release must allow a customer to:

1. Create and access a customer account.
2. Select or provide a delivery address.
3. Confirm whether that address is serviceable.
4. Browse the food menu.
5. View menu categories and product details.
6. Select variants.
7. Select required and optional add-ons.
8. See pricing changes caused by customization.
9. Add customized products to a cart.
10. Review the cart.
11. See taxes, packaging charges, delivery fees, discounts, and the final payable amount.
12. Complete online payment.
13. Receive order confirmation.
14. Track order progress.
15. View relevant previous orders.
16. Receive important order communication through WhatsApp.

Full detail on how a single order carries this information through cart, checkout, and fulfilment
is recorded in [`order-payment-delivery-model.md`](./order-payment-delivery-model.md).

## Merchandise and gated drops

Food is the launch commerce category. Merchandise is introduced later. Limited drops are gated —
available only to customers who meet defined eligibility conditions — and are introduced later as
well. Customer identity, activity, and eligibility are owned by BOBA Bear regardless of category.

The current direction, not yet fully resolved in detail, is:

- Food uses the food-ordering flow described in this document.
- Merchandise will likely require a separate fulfilment and checkout domain from food (different
  inventory, packaging, shipping or pickup logistics, and tax treatment).
- A future **food drop** may use the food cart.
- A future **merchandise drop** may use a merchandise cart.
- Customer identity and drop eligibility remain shared across categories regardless of which cart
  is used.

**The exact cross-category cart policy — whether food and merchandise (or a food drop and a
merchandise drop) can ever share a single cart and checkout — remains an open decision.** V1 does
not need to resolve it, because V1 does not include merchandise or gated-drop checkout at all. See
[`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md).

## V1 scope by area

### Customer experience

- Customer account
- Address management
- Serviceability check
- Menu browsing
- Variants and add-ons
- Cart
- Pricing (taxes, packaging, delivery fee, discounts, final total)
- Checkout
- Online payment
- Order confirmation
- Order tracking
- Order history
- WhatsApp notifications

### Operations

- Direct-order queue
- Kitchen acceptance
- Preparation workflow
- Product availability control
- Delivery coordination
- Cancellation
- Refund operations
- Operational alerts
- Basic reporting
- Staff access
- Audit history

Detail on how these are fulfilled is recorded in [`operating-model.md`](./operating-model.md).

### Platform foundation

- Brand, organization, territory, and outlet concepts
- Legal-entity abstraction
- Scoped memberships (user assignments at a defined scope, not a single global role)
- Permission-based authorization
- Catalog inheritance (brand → territory → organization → outlet)
- Price books
- Single-outlet carts (an order belongs to exactly one outlet)
- Order snapshots (an order retains the commercial details in effect at the time it was placed)
- Payment-account abstraction
- Audit logging

These foundation concepts exist in V1 in minimal, single-outlet form, but the underlying model is
built so they extend to multiple outlets and organizations without a foundational redesign. See
[`organization-outlet-access-model.md`](./organization-outlet-access-model.md).

## Explicitly deferred capabilities

The following are outside the first sellable release unless a later Locked decision in the
[decision register](./decision-register.md) explicitly changes that:

- Native Android application
- Native iOS application
- Merchandise checkout
- A universal food-and-merchandise cart
- An advanced gated-drop engine
- A full loyalty programme
- A referral programme
- Subscription meals
- AI-driven recommendations
- Full conversational WhatsApp ordering
- Live rider GPS tracking without confirmed delivery-provider support
- Multiple payment gateways
- A full restaurant point-of-sale system
- Counter billing
- Cash drawer management
- Dine-in table management
- Shift settlement
- Ingredient-level inventory
- Procurement
- Recipe costing
- Aggregator order reconciliation
- Accounting-system integration
- Franchise onboarding
- Franchise contracts
- Royalty calculation
- Franchise settlements
- Brand compliance inspections
- Franchise document management
- Master-franchise operations
- Kubernetes-based infrastructure
- A microservices architecture

Deferred does not mean rejected. Each of these may become part of a future phase; see
[`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md) for the intended sequence.

## Related documents

- [`product-vision.md`](./product-vision.md) — why this platform is being built, and terminology used above.
- [`operating-model.md`](./operating-model.md) — how V1's operations scope is fulfilled day to day.
- [`order-payment-delivery-model.md`](./order-payment-delivery-model.md) — how a single order carries the pricing and fulfilment detail listed above.
- [`architecture-foundation.md`](./architecture-foundation.md) — the technical principles V1 must be built on.
- [`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md) — what follows V1, and the cross-category cart policy and other open questions.
- [`decision-register.md`](./decision-register.md) — structured record of the V1-scope decision and related items.
