---
Status: SUPPORTING
Current architecture: docs/platform/ARCHITECTURE.md
Current domain authority: Cart → Checkout Snapshot → Payment → Order (see ARCHITECTURE.md / STATE.md)
Last updated: 2026-08-11
---

# BOBA Bear — Order, Payment, and Delivery Model

## Status

**SUPPORTING.** Where older domain assumptions conflict with accepted current architecture, prefer
[`ARCHITECTURE.md`](./ARCHITECTURE.md) and [`STATE.md`](./STATE.md). This document is not IMP/status
authority.

Accepted current domain chain:

```text
Cart → Checkout → Payment → Order
```

Detailed kitchen fulfilment and Delivery remain future/deferred per ROADMAP. Historical prose below
may retain illustrative state lists; they are not competing CURRENT enums for accepted Order
lifecycle (`PLACED` \| `ACCEPTED` \| `FULFILLED` \| `CANCELLED`).

This document records structural principles for how an order is created, priced, paid for, and
delivered, alongside illustrative historical notes and open provider decisions. Historical ADR
linkages in the body remain provenance; CURRENT domain authority and Order lifecycle come from
ARCHITECTURE / STATE / D-357.

## Authentication boundary

Final checkout requires an authenticated customer identity; a customer may browse and build a cart
anonymously, but checkout and payment initiation require the customer to have authenticated per
[ADR-004](./decisions/ADR-004-identity-authentication-sessions.md). Payment initiation must be
associated with the authenticated customer and the validated checkout context, not with an anonymous
cart alone. **Staff access to an order is scope-based**: a staff member may act on an order only when
an active role assignment's scope covers that order's outlet, territory, organization, or brand, per
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md); cross-outlet order access is
denied unless a broader assignment explicitly permits it. **Customer access to an order is
ownership-based**: a customer may access only orders they placed. Knowing an order identifier is
never sufficient on its own — protected order tracking must verify that the requesting party is
either the order's owning customer or a staff member with the appropriate authorized scope, or use a
future secure guest-token model. The presence of a valid session alone does not authorize refund,
order, or delivery operations — those actions require the appropriate permission from the Access
Control model described in
[`organization-outlet-access-model.md`](./organization-outlet-access-model.md) and fixed in full by
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md). Refund approval specifically
requires the `refund.approve` permission at a covering scope and, for sensitive cases, step-up
authentication per
[ADR-004](./decisions/ADR-004-identity-authentication-sessions.md#step-up-authentication). This
document does not restate the underlying identity, authentication, session, or authorization
implementation — see [ADR-004](./decisions/ADR-004-identity-authentication-sessions.md) and
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md) for those decisions in full.

## Outlet selection and cart boundary

Every direct order must belong to exactly one fulfilment outlet. **Serviceability — whether a
location can be served — is a distinct decision from delivery quoting — which delivery option,
provider cost, and customer charge apply**; the two must never be treated as one result, per
[ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md#serviceability-and-delivery-quoting-separation).
The Checkout module resolves the responsible outlet using the Serviceability module's explicit
service zones and deterministic resolution rules, never a client-supplied outlet identifier, per
[ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md#deterministic-outlet-resolution). The
intended flow is:

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

A single-outlet cart keeps every one of these dimensions unambiguous for a given order. The cart
itself is a server-side authoritative resource, protected by optimistic concurrency and idempotent
mutation, per
[ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md#server-side-authoritative-cart); if an
address change resolves to a different outlet, the cart must not silently migrate — existing lines
require revalidation and explicit customer confirmation, per
[ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md#single-outlet-cart). See
[`organization-outlet-access-model.md`](./organization-outlet-access-model.md) for the outlet
entity this selection is drawn from.

## Cart selections and catalog revalidation

Cart selections reference stable catalog identifiers — product, variant, modifier group, modifier
option, and bundle-component identifiers — not display names or slugs, per
[ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md#stable-internal-identifiers).
Checkout must authoritatively revalidate product, variant, modifier, assortment, menu-schedule,
outlet, and availability state immediately before order creation; a cart built earlier is not a
guarantee that every selection remains valid. Invalid or no-longer-available selections block
checkout. The platform must not silently substitute a product, variant, modifier option, bundle
component, quantity, or outlet — the affected cart item must be identified to the customer, who must
review and confirm any replacement or removal before checkout can proceed. See
[ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md#cart-references-and-revalidation)
for the full cart-revalidation and no-silent-substitution decision.

## Checkout confirmation and pre-payment order creation

Checkout is the cross-module orchestrator that coordinates address confirmation, serviceability,
cart and catalog revalidation, delivery and pricing quotes, and promotion reservation before any
order is created, per
[ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md#checkout-module-responsibility).
Serviceability decisions, delivery quotes, pricing quotes, promotion reservations, and the checkout
session itself are all time-limited; none is a permanent guarantee, and checkout must use the
earliest relevant expiry when deciding whether payment may begin, per
[ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md#expiring-decisions-and-quotes).
Immediately before order creation, the customer must see and explicitly confirm the exact final
checkout summary — items, address, outlet, charges, discounts, tax, and total — bound to specific
cart, address, outlet, serviceability, delivery-quote, and pricing-quote revisions; any material
change invalidates that confirmation, per
[ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md#explicit-customer-confirmation).

Checkout then creates exactly one **pre-payment order**, in a `PENDING_PAYMENT` state, before the
Payments module initiates payment with the provider. The pre-payment order is not treated as a paid
order and is not visible to normal kitchen operations until payment is confirmed; kitchen processing
must not begin while payment is pending, and payment failure or expiry must not create a
kitchen-visible order. Late or ambiguous payment success must enter explicit review rather than being
silently accepted or silently discarded. Checkout creation, checkout confirmation, pre-payment order
creation, and payment initiation are each idempotent, and all required internal state — including a
transactional outbox event — is committed in one database transaction before any external
payment-provider call. Over HTTP, this idempotency is expressed through the `Idempotency-Key` and
`ETag`/`If-Match` conventions fixed by
[ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md#idempotency). See
[ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md#pre-payment-order-creation) for the
full pre-payment-order, idempotency, and transactional-boundary decision. Detailed payment execution
and payment-provider behaviour remain for a future ARCH-09 decision.

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
placed, independent of later catalog or organizational changes. The immutable delivery-address
snapshot and the full pre-payment order snapshot are fixed by
[ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md#pre-payment-order-snapshot); a later
edit to a saved address must never change a historical order's address snapshot, per
[ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md#immutable-delivery-address-snapshots).
The full content of an order's
immutable catalog snapshot — product, variant, modifier, and bundle identifiers and labels, dietary
and allergen information where required, and catalog and menu revision — is fixed by
[ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md#immutable-order-catalog-snapshots).
Pricing, discount, tax, packaging, and delivery-charge snapshot content is fixed by
[ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#immutable-order-monetary-snapshots),
not by this document or by ADR-006. Cart totals are estimates only: an authoritative, immutable
pricing quote is issued and revalidated before payment initiation, and payment must never begin
against a stale or unconfirmed total — if the payable amount changes before payment, the customer
must see and confirm the revised breakdown, per
[ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#quote-revalidation-and-customer-confirmation).

## Payment and settlement foundation

BOBA Bear uses **Cashfree Payment Gateway with Cashfree Hosted Checkout** as the V1 payment
provider, integrated behind a provider-neutral Payments module so that Checkout, Orders, Pricing,
Customers, Operations, Delivery, Notifications, and Audit never depend on Cashfree-specific concepts
directly. A payment account is resolved from the order's selling legal entity and outlet, never
selected by the browser or customer. Browser return is not proof of payment: payment success
requires a verified Cashfree webhook or an authenticated server-to-server status query, and a
pending-payment order remains outside kitchen workflow until that verified evidence exists. Multiple
payment attempts may exist under one payment intent; the first verified successful payment activates
the order, a second successful charge enters duplicate-success review, and a late successful payment
is never discarded — it either safely activates an order that remains fulfillable or enters review.
Payment success and settlement are separate: an order may proceed to kitchen work on verified
payment success without waiting for settlement. Cancellation before an accepted payment success may
expire or cancel the payment; cancellation after accepted success requires the separate refund
workflow, which reuses the original order's price, discount, and tax allocations and supports full
and partial refunds. Payment and refund reconciliation are mandatory, not optional. Provider
commercial approval, launch-readiness validation, and Cashfree's production approval remain launch
prerequisites, not resolved by this documentation. See
[ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md) for the full decision.

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

- BOBA Bear uses a **provider-neutral Delivery module** supporting API-integrated,
  business-dashboard, and controlled manual-local-provider operating modes. **No production delivery
  provider is selected in this documentation.** Rapido is the first commercial-validation candidate,
  not an approved integration; a public Rapido delivery API is not assumed, and Dehradun coverage,
  food-delivery suitability, and commercial terms all require direct validation. See
  [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md) for the full decision.
- A **checkout delivery quote does not dispatch a courier booking.** Actual dispatch occurs only
  after verified payment success and outlet acceptance, using preparation-aware timing, per
  [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#checkout-quote-versus-actual-dispatch).
- Delivery charges will normally be borne by the customer.
- The customer delivery charge and the delivery-provider cost are separate, explicitly tracked
  values; any merchant-funded subsidy between the two is explicit and auditable, never concealed as
  if the provider cost equaled the customer charge, per
  [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#delivery-charge-and-provider-cost).
  Provider cost is reconciled against the customer charge on a separate schedule and never rewrites
  it, per
  [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#delivery-cost-reconciliation).
- BOBA Bear will launch serviceability city by city; **Dehradun is the initial operating market.**
- Initial serviceability may use configured localities, zones, distance bands, or pincodes. More
  advanced geospatial serviceability can be introduced later.
- BOBA Bear should own the delivery experience for direct orders — the customer's tracking and
  communication experience should be consistent regardless of which delivery partner actually
  fulfils a given order, using the normalized delivery lifecycle and safe tracking projection fixed
  by
  [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#normalized-delivery-lifecycle).
- Delivery staff receive only the customer information necessary to complete delivery — delivery
  address, delivery contact number, delivery instructions, and relevant order details — not a
  customer's full profile, payment history, or unrelated order history, per
  [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#customer-data-minimization).
- The platform remains independent of any single delivery provider — provider-specific concepts stay
  inside infrastructure adapters, and business modules must not import a provider SDK directly, per
  [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#provider-neutral-delivery-interface).
- Controlled manual rider or business-dashboard dispatch is a supported operating mode, not a
  workaround, and may be used before, alongside, or instead of a reliable delivery-provider API.
- Pickup requires verification beyond the public order number, and delivery confirmation normally
  requires an accepted proof-of-delivery method rather than an unverified courier action, per
  [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#pickup-verification) and
  [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#delivery-confirmation).
- **Exact live rider tracking should not be promised to customers unless a specific delivery
  provider is confirmed to support it.** Order tracking (see states below) is a platform
  guarantee; live GPS rider tracking is not, until a provider decision is made.

## Order, payment, and delivery states

Order state, payment state, and delivery state are modeled as **separate domains** — an order can,
for example, be "Paid" while its delivery is still "Awaiting assignment." The lists below are
**illustrative**, intended to communicate the shape of each state domain for planning purposes.
**They are not final implementation enums.** Exact state names, transitions, and allowed
state-machine paths remain subject to detailed domain design. The commercial order lifecycle and the
fulfilment lifecycle are now fixed in concept — though not in exact enum naming — by
[ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md#commercial-order-lifecycle) and
[ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md#fulfilment-lifecycle); a paid
order only becomes visible to kitchen operations after verified payment success releases it into an
`AWAITING_ACCEPTANCE` fulfilment state, and V1 requires explicit manual outlet acceptance before
preparation begins.

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
  [`organization-outlet-access-model.md`](./organization-outlet-access-model.md) and the full
  delegation and approval-authority rules in
  [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#v1-system-roles)) and
  auditable (see [`architecture-foundation.md`](./architecture-foundation.md#audit-requirements)).
- Refunds must reuse the original order's price, discount, and tax allocations rather than
  recalculating them under current policy, per
  [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#cancellation-and-refund-allocation);
  the original order's monetary breakdown is never rewritten, per
  [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#original-order-immutability).
- The following scenarios must be handled explicitly, not left as undefined behavior: failed
  payment, successful payment with an operational failure afterward (for example, the outlet
  cannot fulfil the order), and duplicate callback delivery from the payment provider.
- Payment retries and duplicate or replayed provider callbacks must not duplicate a promotion
  redemption, consistent with the atomic reservation/redemption model in
  [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#atomic-promotion-redemption).
- BOBA Bear direct-order and aggregator-order financial calculations remain separate: the Pricing
  module calculates direct-order totals only and does not recalculate aggregator-channel totals,
  which remain within the Petpooja and aggregator commercial flow, per
  [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#aggregator-order-boundary).

These principles are fixed in full, with a concrete provider, domain model, and lifecycle, by
[ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md); this document summarizes
rather than repeats that decision.

## Post-payment fulfilment, cancellation, and tracking

Once a payment is verified, the order is released to Operations through a durable transactional
outbox event — a pending, failed, expired, mismatched, or under-review payment never releases the
order, and the same payment event never releases an order twice. From there, kitchen processing
follows explicit forward-only transitions (accepted, preparing, ready for handoff, handed off,
fulfilled), enforced through versioned, idempotent operational commands rather than casual state
edits; a paid rejection before acceptance begins cancellation and refund handling rather than directly
affecting refund state. Cancellation request, cancellation decision, and refund state remain three
separate, related dimensions, never one combined field. Customer-facing order tracking is always a
derived, safe projection of internal state, never a direct exposure of internal payment, fulfilment,
or delivery detail. For a delivery order, commercial completion normally requires verified delivery
completion, not kitchen readiness alone. Every order's commercial, fulfilment, cancellation, refund,
and tracking history remains immutable regardless of later catalog, pricing, or organizational change.
Every committed order, payment, delivery, and refund state transition emits a domain event; customer
communication about that transition is an **asynchronous side effect** of the event, produced by the
Notifications module through the transactional outbox, never inside the same transaction as the
state change itself, per
[ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#transactional-outbox-boundary).
A WhatsApp (or other channel) delivery failure never alters the underlying order, payment, delivery,
or refund state — customer-facing tracking in the PWA remains authoritative regardless of whether a
given message ever reaches the customer, per
[ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#deliveryread-status-boundary).
Stale intermediate notifications (for example, a queued "preparing" message after "delivered" has
already been communicated) are suppressed rather than sent out of order, per
[ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#semantic-ordering). Payment
review, delivery failure, cancellation, and refund updates may generate a customer-action or
support-facing notification, but notifications never collect payment credentials — payment always
happens inside Cashfree Hosted Checkout, per
[ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md#hosted-checkout-boundary).
An inbound WhatsApp cancellation message remains a cancellation *request*, proceeding through the
same cancellation-request/decision workflow as any other channel, per
[ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md#cancellation-request-and-decision)
and
[ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#cancellation-request-boundary).
Duplicate domain events — a replayed payment webhook, a replayed delivery callback, or a retried
worker execution — must never duplicate a customer message, extending the webhook- and
event-idempotency requirements already locked in
[ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md#webhook-idempotency-and-ordering)
and
[ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#duplicate-and-out-of-order-events)
to notification deduplication, per
[ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#deduplication). The full
lifecycle, Operations Console boundary, operational command model, exception model, and audit
requirements behind this summary are fixed by
[ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md); detailed delivery-state
progression, provider abstraction, dispatch timing, and delivery-cost reconciliation are fixed by
[ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md); the full notifications,
WhatsApp, and assisted-commerce architecture summarized in this section is fixed by
[ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md).

## Durability and persistence boundary

The integrity properties described above depend on where state is stored and when it becomes
durable. The following are **Locked** by
[ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md):

- Order, payment, and delivery state changes are committed as PostgreSQL transactions. A state
  change that has not committed has not happened, and partial state is never observable.
- Order, payment, and delivery events are published through the transactional outbox, written in the
  same transaction as the state change they describe, per
  [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#transactional-outbox-persistence).
  An event is therefore never lost when its state change succeeds, and never emitted when it fails.
- Provider-event records are owned by the module that integrates with the provider — Payments,
  Delivery, and Notifications each keep their own — rather than pooled into one shared table, per
  [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#provider-event-storage).
- Idempotency is persisted durably in the database rather than held in application memory or a
  cache, so a retried checkout, payment callback, or dispatch request resolves to the original
  outcome even across process restarts, per
  [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#shared-idempotency-persistence).
- The business transaction commits before any external provider is called. Payment-provider and
  delivery-provider calls are made only after committed state exists, never inside an open
  transaction.
- Immutable financial and operational snapshots — the order's monetary breakdown, catalog snapshot,
  and state-transition history — remain in PostgreSQL as append-only records; a correction adds a new
  record rather than rewriting an existing one.

## Related documents

- [`v1-product-scope.md`](./v1-product-scope.md) — the customer-facing checkout and tracking experience this model supports.
- [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md) — the PostgreSQL and Drizzle persistence decision behind the transactional state changes, transactional outbox, module-owned provider-event records, durable idempotency, and immutable snapshots summarized above.
- [ADR-004](./decisions/ADR-004-identity-authentication-sessions.md) — the customer authentication and session decision that final checkout, payment initiation, and protected order tracking depend on.
- [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md) — the scope-based staff order access, ownership-based customer order access, refund-permission, and data-minimization decision this document builds on.
- [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md) — the catalog, assortment, and availability decision behind cart-selection identifiers, checkout revalidation, no-silent-substitution, and order catalog-snapshot content.
- [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md) — the pricing, tax, charge, and promotion decision behind immutable pricing quotes, delivery-charge/provider-cost separation, discount and refund allocation, and order monetary-snapshot content.
- [ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md) — the serviceability, service-zone, outlet-resolution, cart, anonymous-cart, checkout-orchestration, quote-expiry, customer-confirmation, pre-payment-order, idempotency, and transactional-boundary decision this document's outlet-selection, cart-boundary, and pre-payment-order sections summarize.
- [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md) — the payment-provider selection, payment-intent and payment-attempt lifecycle, webhook, refund, and reconciliation decision this document's payment-and-settlement-foundation and payment-integrity-principles sections summarize.
- [ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md) — the direct-order lifecycle, fulfilment workflow, outlet acceptance, Operations Console, cancellation, exception, and customer-tracking decision this document's post-payment fulfilment, cancellation, and tracking section summarizes.
- [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md) — the delivery-provider abstraction, operating-mode, dispatch, courier-assignment, pickup-verification, proof-of-delivery, return, and delivery-cost-reconciliation decision this document's delivery-model section summarizes.
- [ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md) — the notifications, WhatsApp, and assisted-commerce decision this document's post-payment fulfilment, cancellation, and tracking section summarizes, including the notifications-as-side-effect, deduplication, and cancellation-request boundaries.
- [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md) — the HTTP API, `Idempotency-Key`, `ETag`/`If-Match`, and provider-webhook-boundary decision this document's checkout-idempotency and payment-integrity summaries are expressed through over HTTP.
- [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md) — the configuration and secrets decision behind the Cashfree and delivery-provider credential references this document's payment-and-settlement and delivery-model sections depend on, and behind the checkout/payment/delivery kill switches that stop new initiation without abandoning an order already in the states described above.
- [`organization-outlet-access-model.md`](./organization-outlet-access-model.md) — the outlet, organization, and legal-entity entities referenced in order ownership.
- [`operating-model.md`](./operating-model.md) — how order and delivery states are surfaced to kitchen and delivery staff in the Operations Console.
- [`architecture-foundation.md`](./architecture-foundation.md) — the relational data model and audit requirements underlying orders, payments, and refunds.
- [`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md) — delivery provider and franchise settlement decisions that remain open.
- [`decision-register.md`](./decision-register.md) — structured record of the decisions summarized here.
