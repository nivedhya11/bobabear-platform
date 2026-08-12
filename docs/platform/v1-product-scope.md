---
Status: SUPPORTING
Current implementation sequence: docs/platform/ROADMAP.md
Accepted implementation state: docs/platform/STATE.md
Current product vision: docs/platform/VISION.md
Last updated: 2026-08-11
---

# BOBA Bear — V1 Product Scope

## Status

**SUPPORTING** product-intent documentation. It does **not** establish implementation status.

- Current implementation sequence → [`ROADMAP.md`](./ROADMAP.md)
- Accepted implementation state → [`STATE.md`](./STATE.md)
- CURRENT vision → [`VISION.md`](./VISION.md)
- CURRENT global architecture / transport → [`ARCHITECTURE.md`](./ARCHITECTURE.md) +
  [D-356](./decision-register.md)

This document records the boundary of the first sellable release ("V1") of the BOBA
Bear direct platform, and the capabilities that are **Deferred** beyond it. It assumes the business
rationale in [`product-vision.md`](./product-vision.md) / [`VISION.md`](./VISION.md). It does not define how V1 is fulfilled
operationally (see [`operating-model.md`](./operating-model.md)) or how the underlying domain model
is structured (see [`ARCHITECTURE.md`](./ARCHITECTURE.md) and supporting model docs).

Historical ADR references below may describe future or amended architecture. For CURRENT transport
policy, do not treat ADR-014 Route Handlers as the product HTTP host — see D-356. For CURRENT Order
lifecycle, prefer accepted IMP-023 states via STATE/D-357 over detailed kitchen workflow prose in
ADR-010.

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

Customers authenticate in V1 using an Indian mobile number and a one-time password (OTP); no
customer password, email, or social login is required. Customers may browse the menu and build a
temporary cart without authenticating, but authentication is required before final checkout and
before other protected account features. Workforce users authenticate through an invitation-only
flow using verified email, password, and mandatory TOTP multi-factor authentication. See
[ADR-004](./decisions/ADR-004-identity-authentication-sessions.md) for the full identity and
authentication decision.

The first sellable release must allow a customer to:

1. Browse the menu and build a temporary cart before authenticating, with the cart persisted
   server-side rather than only on the customer's device.
2. Create and access a customer account using mobile-number OTP authentication, required before
   final checkout.
3. Manually enter a structured delivery address, optionally assisted by device location, with a map
   pin as a supplement rather than a replacement for structured fields.
4. Confirm whether that address is serviceable, with the platform automatically resolving the single
   responsible outlet — customer choice among outlets is deferred.
5. Browse the categorized food menu.
6. View menu categories and product details.
7. Select variants.
8. Select required and optional structured modifier groups and add-ons.
9. See pricing changes caused by customization.
10. Add customized products to a single-outlet cart.
11. Review the cart, including any items affected by sold-out, temporarily unavailable, or
    outlet-paused state.
12. Be guided through an explicit choice, without silent merging, if an existing customer cart
    conflicts with an anonymous cart at login, or if an address change resolves to a different
    outlet.
13. See an authoritative cart and checkout price for product, variant, and modifier selections,
    packaging charge, delivery charge, applicable GST, automatic and coupon promotions where
    eligible, and the final payable amount, before payment initiation.
14. Have the cart authoritatively revalidated before completing checkout, with no silent
    substitution of any selection, and see and reconfirm a revised breakdown if any checkout value —
    including an expired serviceability decision, delivery quote, or pricing quote — changes before
    payment.
15. Give explicit final confirmation of the exact order summary before a pre-payment order is
    created and handed to payment.
16. Complete online payment through Cashfree Hosted Checkout, using UPI, a domestic credit card, a
    domestic debit card, or net banking.
17. See a clear "checking payment status" experience after returning from Hosted Checkout, rather
    than an immediately declared result, while the platform verifies payment server-side.
18. Retry payment against the same order where the payment attempt failed and the underlying
    order, price, and commercial context remain unchanged.
19. Receive order confirmation with an explainable order breakdown once payment is verified.
20. Track order progress — received, outlet-accepted, preparing, delivery-partner search or
    assignment status, courier assigned, order picked up, out for delivery, arriving soon, delivered,
    delivery-delayed, and delivery-issue states — through a safe, derived tracking projection rather
    than raw internal status, with cancellation and refund status shown as separate, clearly
    distinguished information where applicable. Where safely available, tracking may show a
    provider-hosted or BOBA Bear delivery-tracking view and safe courier details (for example a
    masked contact and vehicle category), per
    [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#customer-visible-delivery-tracking).
    Delivery is confirmed through an accepted proof-of-delivery method — a customer delivery OTP, a
    provider PIN, provider-confirmed proof, or an authorized manual confirmation for exceptional
    local delivery — rather than an unverified courier action, per
    [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#provider-neutral-proof-of-delivery).
    A controlled manual delivery fallback remains available when no API-integrated or
    business-dashboard provider is active for a given order, per
    [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#delivery-operating-modes).
21. View relevant previous orders, including payment and refund status where applicable, with
    ambiguous or under-review payments communicated safely rather than silently resolved either
    way.
22. Receive important order communication through WhatsApp — payment-confirmation, order-acceptance
    and preparation updates, delivery updates, cancellation updates, and refund-status updates — sent
    only after the underlying order event has committed, from BOBA Bear's single brand-owned WhatsApp
    number, with safe links back to the PWA rather than sensitive detail inline. Customers may also
    initiate WhatsApp support for their own order, with in-app PWA tracking remaining the
    authoritative fallback whenever a WhatsApp message cannot be delivered. Communication preferences
    and marketing opt-in are kept separate from transactional order and delivery messages, per
    [ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md).

Full detail on manual outlet acceptance, the kitchen fulfilment workflow, cancellation handling, the
customer-visible tracking projection, and the Operations Console this experience depends on is fixed
by [ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md).

Full detail on how a payment is processed, verified, retried, expired, and refunded is fixed by
[ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md).

Full detail on how these prices, charges, taxes, and promotions are calculated, made immutable, and
snapshotted into the order is fixed by
[ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md).

Full detail on how a single order carries this information through cart, checkout, and fulfilment
is recorded in [`order-payment-delivery-model.md`](./order-payment-delivery-model.md). The full food
catalog, variant, modifier, assortment, and availability model this experience depends on is fixed
by [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md). The full address,
serviceability, outlet-resolution, cart, anonymous-cart, checkout-orchestration, and pre-payment-order
model this experience depends on is fixed by
[ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md).

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
- Variants, required and optional structured modifier groups, and add-ons
- Outlet-specific availability, including sold-out and temporarily unavailable states
- Cart, with authoritative revalidation and no silent substitution before checkout
- Authoritative pricing (product, variant, and modifier prices; packaging charge; delivery charge;
  applicable GST; automatic and coupon promotions; explainable final payable total; reconfirmation
  when the payable total changes before payment)
- Checkout
- Online payment through Cashfree Hosted Checkout (UPI, domestic credit card, domestic debit card,
  net banking), with payment-processing status, eligible payment retry, and refund-status
  visibility
- Order confirmation
- Order tracking
- Order history
- WhatsApp notifications

### Operations

- Direct-order queue, released only after verified payment success
- Manual kitchen acceptance and structured pre-acceptance rejection
- Preparation workflow, with forward-only progression and audited correction commands
- Product, variant, and modifier-option availability control
- Outlet-wide ordering pause and resume, preserving existing paid-order obligations
- Delivery coordination through a provider-neutral Delivery module (API-integrated, business-dashboard, or controlled manual local provider) and delivery-driven completion, per [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md)
- Cancellation request and decision, kept separate from refund status
- Refund operations
- Operational timers, exceptions, and alerts
- Basic reporting
- Role-minimized staff access
- Append-only order timeline and audit history

Detail on how these are fulfilled is recorded in [`operating-model.md`](./operating-model.md) and
fixed in full by [ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md).

### Platform foundation

- Brand, organization, territory, and outlet concepts
- Legal-entity abstraction
- Scoped memberships (user assignments at a defined scope, not a single global role)
- Permission-based authorization
- V1 system roles: Brand Administrator, Outlet Manager, Kitchen Operator, Delivery Coordinator,
  Support/Refund Operator, and Finance Viewer — centrally maintained by BOBA Bear; custom roles are
  not part of V1
- Invitation-only workforce access, with outlet-scoped operational access for outlet-level roles
- Minimized customer-data exposure to staff, limited to what each role's task requires
- Catalog inheritance (brand → territory → organization → outlet)
- Price books
- Single-outlet carts (an order belongs to exactly one outlet)
- Order snapshots (an order retains the commercial details in effect at the time it was placed)
- Payment-account abstraction
- Audit logging
- Durable, database-backed state for every order, payment, delivery, and refund, so a confirmed
  action survives a process restart or a provider outage
- Reliable asynchronous processing of notifications, dispatch, and callback handling, with automatic
  retries that do not duplicate customer-visible effects
- Centralized, typed runtime configuration and secret handling, with non-secret operational
  configuration and feature-flag/kill-switch overrides in PostgreSQL, per
  [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md)

These foundation concepts exist in V1 in minimal, single-outlet form, but the underlying model is
built so they extend to multiple outlets and organizations without a foundational redesign. See
[`organization-outlet-access-model.md`](./organization-outlet-access-model.md) and
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md) for the full authorization
model.

## Explicitly deferred capabilities

The following are outside the first sellable release unless a later Locked decision in the
[decision register](./decision-register.md) explicitly changes that:

- Automatic order acceptance, per
  [ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md#manual-outlet-acceptance)
- Aggregator orders inside the BOBA Bear Operations Console, per
  [ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md#operations-console-boundary)
- Customer self-service paid-order modification and automatic substitution, per
  [ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md#no-silent-substitution)
- Offline order processing, per
  [ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md#offline-behaviour)
- Native Android application
- Native iOS application
- Customer passwords as a normal V1 authentication method
- Social login (Google, Apple, Facebook, or other)
- Workforce passkeys
- Merchandise checkout
- A universal food-and-merchandise cart
- An advanced gated-drop engine
- A full loyalty programme
- A referral programme
- Subscription meals
- A generic convenience or service fee, per
  [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#v1-explicit-charge-policy)
- Tips
- Wallet balances and stored-value accounts
- Gift cards
- Loyalty points
- Multi-currency checkout
- AI-driven recommendations
- Full conversational WhatsApp ordering
- Live rider GPS tracking without confirmed delivery-provider support
- Customer selection of the delivery provider or delivery mode
- Customer rider tipping
- Cash collection on delivery
- Multi-drop or batched delivery
- Scheduled delivery
- A rider mobile application
- Route optimization
- Dynamic multi-provider delivery bidding
- A second payment gateway or automatic provider routing
- International cards, EMI, Buy Now Pay Later, recurring payments, saved cards, and stored-value or
  wallet-based payment, per
  [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md#v1-payment-methods)
- Cash on delivery and pay at counter, per
  [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md#v1-payment-methods)
- A full restaurant point-of-sale system, per
  [ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md#operations-console-boundary)
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
- Custom, franchise-created authorization roles
- Guest checkout without authentication, per
  [ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md#rejected-and-deferred-alternatives)
- Customer selection between multiple eligible outlets
- Pickup launch (pickup remains part of the domain model, disabled at launch)
- Scheduled or group ordering
- Cross-outlet carts or cross-outlet checkout
- Full conversational ordering over WhatsApp (building or modifying a cart through chat), per
  [ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#assisted-commerce-boundary)
- AI autonomous checkout initiated from WhatsApp, per
  [ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#assisted-commerce-boundary)
- Payment credentials (card numbers, CVV, UPI PIN, net-banking password, OTP) requested or accepted
  in WhatsApp, per
  [ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#payment-credential-prohibition)
- Autonomous cancellation approval from an inbound WhatsApp message, per
  [ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#cancellation-request-boundary)
- Autonomous refund approval triggered by messaging or AI classification, per
  [ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#inbound-message-classification)
- WhatsApp marketing-message automation, per
  [ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#marketing-boundary)
- Abandoned-cart WhatsApp campaigns, per
  [ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#rejected-and-deferred-alternatives)
- Native push notifications, per
  [ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#supported-channels)
- Multiple outlet-level or franchise-level WhatsApp numbers, per
  [ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#brand-owned-messaging-identity)

Deferred does not mean rejected. Each of these may become part of a future phase; see
[`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md) for the intended sequence.

## Related documents

- [`product-vision.md`](./product-vision.md) — why this platform is being built, and terminology used above.
- [ADR-004](./decisions/ADR-004-identity-authentication-sessions.md) — the customer mobile-OTP and workforce invitation/MFA authentication decision this scope depends on.
- [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md) — the V1 system-role, scoped-authorization, and data-minimization decision this scope depends on.
- [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md) — the food-catalog, variant, modifier, assortment, and availability decision the customer menu and cart experience in this scope depends on.
- [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md) — the pricing, tax, charge, and promotion decision the authoritative checkout price, GST, packaging charge, delivery charge, and promotion experience in this scope depends on.
- [ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md) — the address, serviceability, outlet-resolution, cart, anonymous-cart, checkout-orchestration, and pre-payment-order decision the address-entry, serviceability, cart, and checkout-confirmation experience in this scope depends on.
- [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md) — the Cashfree Hosted Checkout, payment-verification, retry, and refund decision the online-payment experience in this scope depends on.
- [ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md) — the post-payment order lifecycle, outlet-acceptance, cancellation, customer-tracking, and Operations Console decision the order-tracking and operations scope in this document depends on.
- [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md) — the delivery-provider abstraction, dispatch, courier-assignment, pickup-verification, and proof-of-delivery decision the delivery-tracking and manual-delivery-fallback scope in this document depends on.
- [ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md) — the notifications, WhatsApp, and assisted-commerce decision the WhatsApp-notification, customer-support, and communication-preference scope in this document depends on, including what V1 explicitly does not include.
- [`operating-model.md`](./operating-model.md) — how V1's operations scope is fulfilled day to day.
- [`order-payment-delivery-model.md`](./order-payment-delivery-model.md) — how a single order carries the pricing and fulfilment detail listed above.
- [`architecture-foundation.md`](./architecture-foundation.md) — the technical principles V1 must be built on.
- [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md) — the persistence decision behind the durable state and reliable asynchronous processing listed as platform-foundation capabilities above.
- [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md) — the HTTP API, Route Handler, validation, and error-contract decision every customer- and operations-facing capability in this scope is delivered through.
- [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md) — the configuration, secrets, operational-configuration, and feature-flag/kill-switch decision the platform-foundation configuration capability above depends on.
- [`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md) — what follows V1, and the cross-category cart policy and other open questions.
- [`decision-register.md`](./decision-register.md) — structured record of the V1-scope decision and related items.
