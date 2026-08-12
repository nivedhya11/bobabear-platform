---
Status: Accepted
Decision date: 2026-08-02
Last updated: 2026-08-02
---

# ADR-008: Serviceability, Cart, and Checkout

## Status

Accepted

## Decision Date

2026-08-02

## Decision Owners

BOBA Bear founder and product leadership

## Context

[ADR-004](./ADR-004-identity-authentication-sessions.md) fixed the identity, authentication, and
session architecture and established that customers may browse and build a temporary cart
anonymously, but that authentication is required before final checkout, and that anonymous-cart
identity belongs to the Cart module rather than to Better Auth or the Identity module.
[ADR-005](./ADR-005-organization-outlet-authorization.md) fixed customer authorization on the basis
of resource ownership. [ADR-006](./ADR-006-food-catalog-assortment-availability.md) fixed the food
catalog, assortment, and availability model, including the requirement that checkout authoritatively
revalidate catalog and availability state and never silently substitute a cart selection.
[ADR-007](./ADR-007-pricing-tax-charges-promotions.md) fixed the Pricing module, including immutable
pricing quotes, quote revalidation, and immutable order monetary snapshots.
[`order-payment-delivery-model.md`](../order-payment-delivery-model.md) locked the principle that a
V1 cart must belong to exactly one outlet and that historical orders retain immutable snapshots, but
left open how a customer's location becomes a resolved, serviceable outlet; how a cart is owned,
versioned, and merged across anonymous and authenticated states; how a checkout session coordinates
address confirmation, serviceability, cart revalidation, delivery and pricing quotes, and customer
confirmation; and how a pre-payment order is created idempotently before payment is handed to the
Payments module.

None of the documents above fix how a customer-provided delivery address is owned and structured; how
BOBA Bear determines whether a location can be served and which outlet is responsible; how explicit
service zones are configured, authorized, and resolved; how a cart is persisted, versioned, and
protected against concurrent or duplicate mutation; how an anonymous cart is reconciled with an
authenticated customer's existing cart; how a checkout session orchestrates the modules above without
duplicating their rules; how serviceability decisions, delivery quotes, and pricing quotes expire; how
explicit customer confirmation is bound to an exact set of revisions; how a pre-payment order is
created before external payment initiation; or how checkout and pre-payment order creation remain
idempotent and transactionally sound. This ADR resolves the customer-address, serviceability,
service-zone, outlet-resolution, fulfilment-type, cart, anonymous-cart, checkout-session,
quote-expiry, customer-confirmation, pre-payment-order, idempotency, concurrency, and
transactional-boundary architecture so that the Serviceability, Cart, Checkout, and Order modules
named in [ADR-003](./ADR-003-modular-monolith-node-typescript.md#initial-module-boundaries) can be
implemented against a fixed foundation rather than ad hoc, per-change decisions. Detailed payment
execution and payment-provider behaviour remain the subject of a future ARCH-09 decision.

## Decision Summary

BOBA Bear will govern the path from a customer's location to a paid order under one principle: a
customer may browse and build a cart before authentication, but an order may proceed to payment only
after BOBA Bear has resolved an eligible outlet, confirmed a serviceable delivery address, revalidated
the cart, obtained valid delivery and pricing quotes, received explicit customer confirmation, and
created one idempotent pre-payment order. No stale client state may authorize payment initiation.

Customer delivery addresses are owned by the Customers module as structured records with coordinates,
always support manual entry, and require customer confirmation of the resolved delivery location
before checkout; a saved-address edit never mutates a historical order's immutable address snapshot.
Serviceability and outlet resolution are owned by the Serviceability module and use explicitly
configured, authorized service zones (polygon or radius) with coordinate-based final validation;
postal code and locality support only early guidance, search, and fallback. Outlet resolution is
deterministic and, in V1, fully automatic — customer choice among eligible outlets is deferred.
Serviceability decisions are time-limited and are never a permanent fulfilment guarantee, and are kept
distinct from delivery quoting. Fulfilment type is modeled as `DELIVERY` or `PICKUP`, with only
`DELIVERY` enabled at launch.

Carts are server-side authoritative resources, owned by the Cart module. Anonymous customers may build
a cart behind an opaque, protected access token that grants no account authority; after authentication,
an anonymous cart may attach automatically only when no conflicting customer cart exists, and silent
cross-outlet or conflicting-cart merging is prohibited. Every cart belongs to exactly one outlet. Cart
mutations use optimistic concurrency (a version check) and idempotent operation identifiers, and
adding an item never reserves inventory, kitchen capacity, delivery capacity, price, or promotion
redemption.

The Checkout module is the cross-module orchestrator, coordinating Customers, Serviceability, Cart,
Catalog, Availability, Pricing, Delivery, Orders, Payments, and Access Control without duplicating
their owned rules. A checkout session has an explicit lifecycle, authoritatively revalidates every
input before payment, surfaces actionable validation findings, locks the cart on customer confirmation,
and treats serviceability decisions, delivery quotes, pricing quotes, promotion reservations, and the
checkout session itself as time-limited. Any material change invalidates prior customer confirmation.
Immediately before order creation, the customer must see and confirm the exact final checkout summary,
bound to specific cart, address, outlet, serviceability, delivery-quote, pricing-quote, and
promotion-reservation revisions. Checkout then creates exactly one pre-payment order, in
`PENDING_PAYMENT` state, carrying an immutable snapshot sufficient for kitchen, delivery, support,
refund, and audit purposes, before handing the order to the Payments module. Pending-payment orders
are never kitchen-visible, never fulfilled revenue, and remain auditable regardless of payment outcome.

Checkout creation, checkout confirmation, pre-payment order creation, and payment initiation are all
idempotent. All required internal state is committed in one PostgreSQL transaction, including a
transactional outbox event, before any external payment-provider call; provider calls never occur
inside that transaction.

This is an accepted, final decision for BOBA Bear's serviceability, cart, and checkout domain
architecture — not a recommendation or a provisional option. It fixes domain boundaries, the
serviceability and outlet-resolution model, cart ownership and concurrency rules, the checkout
orchestration sequence and lifecycle, the customer-confirmation and pre-payment-order boundary, and
the idempotency and transactional-boundary requirements. It does not fix the geocoding or map
provider, the exact service-zone persistence model, exact cart, quote, or checkout lifetimes, the
same-outlet merge experience, or detailed payment execution — see
[Explicit Non-Decisions](#explicit-non-decisions).

## Governing Checkout Principle

> A customer may browse and build a cart before authentication, but an order may proceed to payment
> only after BOBA Bear has resolved an eligible outlet, confirmed a serviceable delivery address,
> revalidated the cart, obtained valid delivery and pricing quotes, received explicit customer
> confirmation, and created one idempotent pre-payment order.

```text
Customer location
        ↓
Serviceability and outlet resolution
        ↓
Single-outlet cart
        ↓
Authenticated checkout
        ↓
Catalog and availability revalidation
        ↓
Pricing and delivery quotes
        ↓
Customer confirmation
        ↓
Pre-payment order
        ↓
Payments module
```

No stale client state may authorize payment initiation.

## Domain Responsibility Separation

The following concepts remain distinct and must not be merged:

**Address** — a customer-provided delivery location, owned by the Customers module.

**Serviceability** — whether BOBA Bear can fulfil an order to a location, owned by the
Serviceability module.

**Outlet resolution** — selection of the eligible outlet responsible for fulfilment, owned by the
Serviceability module.

**Cart** — the customer's current intended selections, owned by the Cart module.

**Checkout session** — the coordination of address confirmation, serviceability, cart validation,
delivery quoting, pricing, promotions, customer confirmation, and pre-payment order creation, owned
by the Checkout module.

**Order** — the immutable confirmed commercial intent created before external payment initiation,
owned by the Orders module.

**Payment attempt** — a payment execution attempt against the pre-payment order, owned by the
Payments module.

**Delivery quote** — delivery-provider and customer delivery-charge context, owned by the Delivery
module, with pricing integration governed by
[ADR-007](./ADR-007-pricing-tax-charges-promotions.md).

The Cart module must not become responsible for serviceability, outlet selection, delivery-provider
logic, authoritative pricing, payment processing, order lifecycle, or refunds.

## Customer-Address Ownership

Customer delivery addresses belong to the **Customers module**. A saved address conceptually
contains: a stable identifier, customer identifier, address label (for example Home or Work),
recipient name, recipient contact number, address line 1, address line 2, landmark, locality, city,
state, postal code, country, latitude, longitude, geocoding-provider reference, geocoding confidence
or quality metadata, delivery instructions, customer-confirmation timestamp, lifecycle state, and
creation and update timestamps. India is the initial country context. The exact geocoding provider
remains open.

## Address-Entry Rules

The following rules are locked:

- Manual structured address entry is always available.
- Device location may assist but is never mandatory.
- A map pin may supplement structured address fields.
- Customer-provided meaningful address text must be preserved.
- Geocoding must not silently replace the customer's address with materially different text.
- The customer must confirm the resolved delivery location before checkout.
- A saved-address update must not mutate historical orders.
- Coordinates are sensitive customer data and must not appear unnecessarily in logs.
- An alternate delivery recipient may be recorded but does not gain access to the customer account;
  the authenticated BOBA Bear customer remains the order's owner.
- Locality or postal-code checks may be available before authentication.
- Final delivery checkout requires a confirmed address and resolved location.

## Address Lifecycle

Saved addresses support at least:

```text
ACTIVE
ARCHIVED
```

**Active** — available for future customer selection. **Archived** — removed from normal future
selection while remaining available where required for audit or historical reference. Archiving a
saved address must not alter orders that previously used it. Account deletion, address anonymization,
and address-retention rules remain governed by a later privacy and data-retention architecture slice,
consistent with [ADR-004](./ADR-004-identity-authentication-sessions.md#identity-lifecycle).

## Immutable Delivery-Address Snapshots

At pre-payment order creation, the platform stores an immutable delivery-address snapshot sufficient
for kitchen and dispatch operations, delivery-provider requests, customer support, refund or dispute
review, operational audit, and historical order interpretation. The snapshot conceptually contains:
recipient name, delivery contact number, address lines, landmark, locality, city, state, postal code,
country, coordinates where operationally required, delivery instructions, service-zone reference,
address-validation metadata, the original saved-address identifier, and the customer-confirmation
timestamp. Later customer edits to the saved address must not change the order snapshot, consistent
with the order-snapshot principle already locked in
[`order-payment-delivery-model.md`](../order-payment-delivery-model.md#order-ownership-and-historical-snapshots).

## Serviceability Model

Serviceability, owned by the **Serviceability module**, determines whether a location can be served,
which outlet is responsible, which service zone determined the decision, and whether the decision is
currently valid. Conceptual input includes customer location, current time, fulfilment type, active
outlets, service zones, outlet operating state, territory constraints, and delivery capability.
Conceptual output includes serviceability status, selected outlet, determining service zone, decision
reason, decision revision, and decision expiry. Serviceability must use authoritative server-side
data; the client must never authorize an outlet merely by sending an outlet identifier.

## Explicit Service Zones

The Serviceability module supports explicitly configured outlet service zones. A service zone
conceptually contains: a stable identifier, outlet, territory, name, geographic definition, priority,
supported fulfilment type, active schedule, lifecycle, delivery-pricing reference, effective start and
end, revision, and audit metadata. Geographic definitions support at least:

```text
POLYGON
RADIUS
```

A **polygon** defines an explicitly configured geographic boundary; a **radius** defines a configured
distance around a fixed point. Postal code and locality may support early customer guidance, search,
prefiltering, and operational fallback, but when confirmed coordinates are available, postal code or
locality alone must not be the sole authoritative mechanism.

## Service-Zone Authority

A service zone must belong to an outlet, remain within that outlet's permitted territory and
operating context, be created or modified only by authorized staff, be effective-dated or
revision-controlled where needed, and be audited. A franchise or outlet administrator must not create
service zones beyond delegated geographic authority, consistent with the franchise-isolation and
delegation-limit principles already locked in
[ADR-005](./ADR-005-organization-outlet-authorization.md#delegated-administration).

```text
Brand and territory policy
        ↓
Authorized outlet service zone
        ↓
Customer coordinates
        ↓
Serviceability decision
```

## Initial Dehradun Serviceability Model

V1 operates one active Dehradun fulfilment outlet with one or more explicitly configured delivery
zones, manual zone priority, delivery-only fulfilment, postal-code and locality support for early
guidance, coordinate-based final serviceability validation, and authorized operational fallback
where required. Pickup remains part of the domain model but is not enabled for initial launch.

## Deterministic Outlet Resolution

When multiple outlets can serve the same address, resolution is deterministic, following this
precedence:

```text
1. Outlet and zone are active
2. Zone covers the customer location
3. Outlet supports the requested fulfilment type
4. Configured zone priority
5. Outlet operational eligibility
6. Shortest relevant distance or delivery estimate
7. Stable identifier as final tie-breaker
```

The resolver returns the selected outlet, eligible alternatives where operationally useful, the
determining service zone, the determining rule, the service-zone revision, an internal reason code,
and a customer-safe result. V1 automatically selects the responsible outlet; customer outlet choice is
deferred.

## Serviceability Outcomes

Conceptual serviceability outcomes include:

```text
SERVICEABLE
ADDRESS_UNRESOLVED
OUTSIDE_SERVICE_AREA
NO_ACTIVE_OUTLET
OUTLET_CLOSED
OUTLET_PAUSED
DELIVERY_UNAVAILABLE
FULFILMENT_TYPE_UNAVAILABLE
```

Customer-facing messages must remain understandable and must not expose sensitive internal
operational data; internal diagnostics may retain detailed resolution context.

## Time-Limited Serviceability Decisions

Serviceability decisions are time-sensitive and must be revalidated when the customer changes
address, moves the map pin, or changes fulfilment type; before an authoritative checkout quote; before
payment initiation; after relevant outlet-state changes; after service-zone changes; and when the
decision expires. A previous serviceability result is not a permanent fulfilment guarantee. The exact
serviceability-decision validity duration remains open.

## Serviceability and Delivery-Quoting Separation

Serviceability answers "can this location be served, and which outlet is responsible?" Delivery
quoting answers "which delivery option, provider cost, customer charge, and delivery estimate apply?"

```text
Serviceable outlet
        ↓
Delivery request context
        ↓
Delivery quote
```

A location may be geographically serviceable while a delivery quote is temporarily unavailable.
Checkout must not treat these as the same result.

## Fulfilment Types

The domain foundation supports:

```text
DELIVERY
PICKUP
```

`DELIVERY` is enabled at initial launch; `PICKUP` is disabled unless separately approved. Cart and
checkout must carry an explicit fulfilment type and must not assume delivery permanently in the
domain model. Pickup scheduling, instructions, customer arrival, and operational handling remain
deferred.

## Server-Side Authoritative Cart

The authoritative cart is persisted server-side, owned by the **Cart module**. Client-side state may
cache or display cart information but is not authoritative. A cart conceptually contains: a stable
cart identifier, customer identifier where authenticated, anonymous-cart access reference where
unauthenticated, sales channel, selected outlet, fulfilment type, cart lines, version number,
lifecycle state, creation timestamp, last-activity timestamp, expiry, observed catalog revision, and
observed menu revision. A cart stores customer intent; it does not guarantee current price, product
availability, modifier availability, promotion eligibility, delivery availability, tax treatment, or
kitchen capacity.

## Anonymous Carts

Anonymous customers may build a cart before authentication, consistent with
[ADR-004](./ADR-004-identity-authentication-sessions.md#anonymous-customer-activity). The approved
model uses an opaque anonymous-cart identifier, a signed and protected browser token, server-side cart
persistence, expiring access, and no customer-account authority. The anonymous-cart token is not an
authentication credential, must not grant access to customer-account data, must be protected against
tampering, must not reveal internal identifiers unnecessarily, must be rotatable or replaceable, must
not appear in plaintext logs, and must be limited to the anonymous-cart resource. The exact token,
cookie, signing, and expiry implementation remains open.

## Cart Ownership After Authentication

After successful customer authentication:

- **No existing customer cart** — the active anonymous cart may be attached to the authenticated
  customer.
- **Existing customer cart for the same outlet** — the platform must not silently increase quantities
  or merge conflicting intent; the customer must choose or explicitly confirm the merge.
- **Existing customer cart for another outlet** — the platform must not merge automatically; the
  customer must choose which cart to continue with, and the other cart may be marked abandoned or
  retained temporarily.

The exact same-outlet merge interaction remains open. Silent cross-outlet cart merging is prohibited.

## Single-Outlet Cart

Every cart belongs to one outlet; a cart must never contain products from multiple outlets, extending
the single-outlet cart rule already locked in
[`order-payment-delivery-model.md`](../order-payment-delivery-model.md#outlet-selection-and-cart-boundary).
Once the first orderable item is added, the cart is tied to the resolved outlet, future additions must
resolve to the same outlet, and menu, assortment, availability, pricing, and serviceability context
derive from that outlet. If an address change resolves to another outlet, the cart must not silently
change outlet: existing lines must be revalidated against the new outlet, the customer must be
informed that the fulfilment outlet changed, and any copied or migrated cart requires explicit
customer confirmation. The exact cart-transfer interface remains open.

## Cart Lines

A cart line conceptually contains: a stable line identifier, product identifier, variant identifier,
modifier-group selections, modifier-option identifiers, modifier quantities, bundle selections where
applicable, quantity, customer instructions, observed catalog revision, observed menu revision,
estimated display pricing where useful, and creation and update timestamps. Two cart lines may be
merged only when their complete customer intent is equivalent — product, variant, modifier
selections, modifier quantities, bundle selections, and customer instructions must all match. The
backend determines equivalence.

## Cart Lifecycle

Carts support at least:

```text
ACTIVE
LOCKED
CONVERTED
ABANDONED
EXPIRED
```

**Active** — the customer may modify the cart. **Locked** — the cart version is being used by a
confirmed checkout or payment-initiation flow. **Converted** — the cart created an order and cannot
be reused. **Abandoned** — the customer replaced or stopped using the cart. **Expired** — the cart
exceeded the configured inactivity period. Exact anonymous and authenticated cart-expiry periods
remain open.

## Optimistic Cart Concurrency

Cart mutations use optimistic concurrency. Every mutation loads the current cart and version, receives
the client's expected cart version, applies the change only when versions match, increments the
version, and returns the new authoritative cart. A stale mutation fails with a conflict requiring
refresh. This protects against multiple browser tabs, slow-network retries, duplicate clicks,
simultaneous quantity changes, checkout racing with cart edits, and simultaneous mobile and desktop
use.

## Idempotent Cart Mutations

Retrying one intended cart operation must not accidentally execute it twice. Cart mutations accept a
client-generated operation identifier. The platform must recognize repeated execution of the same
logical mutation, return the original result for an identical replay, reject reuse with a materially
different payload, and avoid duplicate item additions or duplicate quantity changes. Optimistic
concurrency and idempotency remain separate controls: versioning prevents stale conflicting updates,
while idempotency prevents duplicate execution. The exact idempotency-retention period remains open.

## No Cart-Stage Reservation

Adding an item to a cart does not reserve product availability, variant availability, modifier
availability, ingredient stock, kitchen capacity, delivery capacity, promotion redemption, price, or
tax treatment. The cart represents intent only. Limited-promotion reservation may occur during
checkout under [ADR-007](./ADR-007-pricing-tax-charges-promotions.md#atomic-promotion-redemption).
Ingredient-level reservation remains outside V1.

## Checkout-Module Responsibility

The **Checkout module** is the cross-module orchestrator. A checkout session conceptually contains: a
stable identifier, customer, cart identifier and cart version, outlet, fulfilment type, confirmed
address, serviceability decision, delivery quote, pricing quote, promotion reservations, validation
findings, customer-confirmation state, lifecycle state, expiry, idempotency context, and creation and
update timestamps. Checkout must not duplicate rules owned by Customers, Catalog, Availability,
Serviceability, Pricing, Delivery, Orders, Payments, or Access Control — it coordinates those modules.

## Checkout Lifecycle

Checkout sessions support a lifecycle conceptually equivalent to:

```text
CREATED
REQUIRES_CUSTOMER_ACTION
READY_FOR_CONFIRMATION
CONFIRMED
PAYMENT_PENDING
COMPLETED
EXPIRED
CANCELLED
```

**Created** — checkout exists but validation is incomplete. **Requires customer action** — the
customer must correct address, cart, availability, promotion, quote, or other validation problems.
**Ready for confirmation** — all authoritative decisions and quotes are currently valid. **Confirmed**
— the customer accepted the exact final checkout summary. **Payment pending** — a pre-payment order
and payment attempt context exist. **Completed** — payment succeeded and the checkout converted
successfully. **Expired** — one or more critical decisions or quotes expired. **Cancelled** — the
customer or platform terminated the checkout. Exact state naming may be refined during
implementation, but this lifecycle separation is locked.

## Checkout Orchestration Sequence

```text
1. Require authenticated customer
2. Load active cart using expected cart version
3. Confirm customer identity and account state
4. Confirm fulfilment type
5. Confirm delivery address
6. Resolve serviceability and responsible outlet
7. Confirm cart outlet matches responsible outlet
8. Revalidate catalog, menu, assortment, and availability
9. Revalidate variants, modifiers, bundles, and instructions
10. Resolve authoritative prices
11. Resolve promotions and reserve limited redemptions
12. Resolve delivery quote and customer delivery charge
13. Calculate tax and issue immutable pricing quote
14. Present final items, address, outlet, charges, discounts, tax, and total
15. Obtain explicit customer confirmation
16. Revalidate cart version and all critical expiries
17. Create one pre-payment order idempotently
18. Hand the pre-payment order to the Payments module
```

A failure or expiry at any step must block progression. Checkout must not silently continue using
stale values.

## Checkout Validation Findings

Checkout returns actionable findings rather than one generic failure. Conceptual reason codes
include:

```text
ADDRESS_CONFIRMATION_REQUIRED
ADDRESS_NOT_SERVICEABLE
OUTLET_CHANGED
OUTLET_NOT_ACCEPTING_ORDERS
PRODUCT_UNAVAILABLE
VARIANT_UNAVAILABLE
MODIFIER_UNAVAILABLE
BUNDLE_SELECTION_INVALID
CART_VERSION_CHANGED
PRICE_CHANGED
PROMOTION_UNAVAILABLE
PROMOTION_RESERVATION_EXPIRED
DELIVERY_QUOTE_EXPIRED
SERVICEABILITY_EXPIRED
CHECKOUT_EXPIRED
CUSTOMER_CONFIRMATION_REQUIRED
```

Customer-facing responses must explain required action without exposing sensitive internal details.

## Cart Locking After Confirmation

When the customer confirms checkout, the platform records the exact cart version, locks the cart
against conflicting mutation, confirms serviceability remains valid, confirms the delivery quote
remains valid, confirms the pricing quote remains valid, confirms promotion reservations remain valid,
and ensures payment cannot begin from another cart version. If the customer returns to edit the cart,
the existing checkout confirmation becomes invalid, the cart may be unlocked under a controlled
transition, affected quotes and promotion reservations must be released or expire, and checkout
validation must restart. A concurrent cart edit must not silently alter a confirmed checkout.

## Immutable Pricing-Quote Boundary

The Pricing module owns the immutable authoritative pricing quote under
[ADR-007](./ADR-007-pricing-tax-charges-promotions.md#immutable-pricing-quotes). Checkout may
request the quote, store its reference, verify its validity, present its breakdown, require customer
confirmation, and pass it to Orders and Payments. Checkout must not modify quote lines. A changed
cart, outlet, address, promotion, delivery quote, tax policy, or price policy requires a new quote.

## Expiring Decisions and Quotes

Serviceability decisions, delivery quotes, pricing quotes, promotion reservations, checkout sessions,
and payment attempts are all time-sensitive and each must have an explicit expiry or validity policy.
Checkout must use the earliest relevant expiry when deciding whether payment may begin. No quote or
decision may be treated as permanently valid. Exact validity periods remain open.

## Explicit Customer Confirmation

Immediately before pre-payment order creation, the customer must see and confirm: fulfilment type,
responsible outlet or safe fulfilment context, delivery address, recipient and contact details,
ordered products, variants, modifiers, bundle selections, quantities, customer instructions, items
subtotal, discounts, packaging charge, delivery charge, applicable tax, final payable amount, and
important availability or delivery notices. Customer confirmation is tied to the exact cart
identifier, cart version, checkout identifier, address snapshot, outlet, serviceability decision,
delivery quote, pricing quote, and promotion reservations. Any material change invalidates the
confirmation.

## Pre-Payment Order Creation

The Order record is created before external payment is initiated, representing confirmed commercial
intent. It provides the stable internal reference required for payment attempts, payment-provider
idempotency, webhook reconciliation, promotion-reservation binding, customer support, payment-timeout
handling, duplicate-request prevention, and audit. The initial conceptual state is:

```text
PENDING_PAYMENT
```

The pre-payment order must not enter normal kitchen workflow, must not be treated as a paid order,
must not count as fulfilled revenue, and must remain auditable if payment fails or expires.

## Pre-Payment Order Snapshot

The pre-payment order must snapshot: customer identity, customer profile reference, brand,
organization, territory, outlet, selling legal entity, fulfilment type, delivery-address snapshot,
serviceability decision, service-zone identity and revision, catalog snapshot, menu revision, variant
and modifier selections, pricing and tax snapshot, delivery-quote reference, promotion identities and
reservations, customer-confirmation timestamp, checkout identifier, cart identifier and version,
idempotency context, calculation-engine version, and correlation identifier. This extends the
immutable-snapshot principle already locked in
[`order-payment-delivery-model.md`](../order-payment-delivery-model.md#order-ownership-and-historical-snapshots),
[ADR-006](./ADR-006-food-catalog-assortment-availability.md#immutable-order-catalog-snapshots), and
[ADR-007](./ADR-007-pricing-tax-charges-promotions.md#immutable-order-monetary-snapshots). A payment
callback must be reconcilable without rebuilding the checkout from mutable current data.

## Payment-Related Order Boundary

Conceptual pre-payment outcomes include:

```text
PENDING_PAYMENT
PAYMENT_CONFIRMED
PAYMENT_FAILED
PAYMENT_EXPIRED
PAYMENT_REVIEW_REQUIRED
```

Detailed payment and order state machines remain for a future ARCH-09 payment-execution decision and
a future order-lifecycle decision. This ADR locks the following boundaries: kitchen processing must
not begin while payment is pending; payment failure must not create a kitchen-visible order; payment
expiry must not automatically create a second order; late or ambiguous payment success must enter
explicit review; the original pre-payment order remains auditable; retry behaviour must reuse or
deliberately supersede the appropriate order/payment context; and duplicate requests must not create
duplicate orders.

## Checkout and Order Idempotency

Checkout creation, checkout confirmation, pre-payment order creation, and payment initiation request
must all be idempotent. An idempotency record conceptually contains: an idempotency key, customer or
actor, operation type, request fingerprint, resource created, result status, original response
reference, creation timestamp, and expiry or retention timestamp. Keys are scoped to customer and
operation; reuse with the same request returns the original result; reuse with a materially different
payload fails; concurrent use creates no more than one result; provider idempotency derives from
stable internal operation references; and idempotency records must not contain payment credentials or
secrets. The exact key format and retention duration remain open.

## Internal Transaction Boundary Before Provider Call

All required internal state must be committed before the external payment-provider call. The internal
PostgreSQL transaction should include, where applicable: final checkout confirmation, the pre-payment
order, immutable order snapshots, promotion-reservation linkage, the payment-attempt request or
placeholder, the idempotency result, and a transactional outbox event.

```text
PostgreSQL transaction
├── finalize checkout confirmation
├── create pre-payment order
├── create payment-attempt request
├── bind promotion reservations
├── save idempotency result
└── save outbox event
        ↓
commit
        ↓
Payments module calls provider idempotently
```

External provider calls must not occur inside a long-running PostgreSQL transaction, extending the
transactional-outbox requirement already locked in
[`architecture-foundation.md`](../architecture-foundation.md#transactional-outbox) and
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#transactional-outbox). The exact synchronous,
worker-assisted, or hybrid payment-initiation mechanism remains for a future ARCH-09 decision.

## Failed, Cancelled, or Abandoned Checkout

When a checkout expires or is cancelled, the platform must unlock the cart where safe, release or
expire promotion reservations, allow delivery quotes to expire or cancel them where supported, avoid
creating a kitchen-visible order, preserve unpaid pre-payment orders as auditable records, allow the
customer to restart from the latest valid cart state, avoid retrying payment indefinitely, and avoid
reusing expired quotes. Exact cleanup and archival schedules remain open.

## Material Changes During Checkout

A change to any of the following invalidates customer confirmation: delivery address, map pin,
recipient contact, fulfilment type, outlet, product, variant, modifier, modifier quantity, bundle
selection, cart quantity, customer instruction, promotion, delivery option, customer delivery charge,
or pricing quote. The customer must then receive new serviceability validation, new outlet resolution
where needed, a new delivery quote where needed, a new pricing quote, and new final confirmation.

## Customer and Support Access

Customers may access only their own saved addresses, active carts, checkout sessions, pre-payment
orders, and completed orders. Anonymous cart access requires possession of the protected anonymous-cart
token. Support access to a customer cart or checkout requires explicit permission, appropriate scope,
operational reason, audit where sensitive, and customer-data minimization, consistent with
[ADR-005](./ADR-005-organization-outlet-authorization.md#support-access). Support personnel must not
silently modify the customer cart, confirm checkout, change the delivery address, or initiate payment.
An assisted-ordering or WhatsApp-assisted checkout capability requires a separate explicit policy.

## Audit Requirements

Audit or security events are required for: saved-address creation; saved-address archival; material
saved-address change; service-zone creation; service-zone change; service-zone activation or
retirement; outlet-resolution override; manual serviceability override; cart ownership transfer;
cross-outlet cart migration; checkout confirmation; checkout cancellation; checkout expiry where
operationally relevant; pre-payment order creation; idempotency conflict; manual delivery-charge
override; sensitive support access; payment-review transition; exceptional cart unlock; and
exceptional promotion-reservation release. Audit context should conceptually include actor, actor
type, customer, cart, checkout, order, outlet, service zone, address target where appropriate, before
and after metadata, reason, correlation identifier, and timestamp, extending the general audit
requirement already locked in
[`architecture-foundation.md`](../architecture-foundation.md#audit-requirements). Precise
customer-address information must be minimized in ordinary application logs.

## Testing Requirements

**Unit tests** must eventually cover: point-in-polygon resolution; radius-zone resolution;
zone-priority tie-breaking; deterministic outlet resolution; single-outlet cart enforcement;
cart-line equivalence; cart-version conflict; idempotent cart mutation replay; checkout lifecycle;
confirmation invalidation; serviceability expiry; delivery-quote expiry; pricing-quote expiry;
idempotency-key payload mismatch; and pre-payment-order uniqueness.

**Integration tests** must eventually cover: a serviceable Dehradun address resolves to the correct
outlet; an address outside all zones is rejected; a suspended outlet is not selected; overlapping
zones resolve deterministically; a client cannot force an unauthorized outlet; an anonymous cart
attaches after login when no conflict exists; a same-outlet conflict is not silently merged;
cross-outlet carts are not silently merged; an address change does not silently migrate the outlet; a
cart edit invalidates checkout confirmation; checkout revalidates catalog and availability; expired
serviceability blocks payment; an expired delivery quote blocks payment; an expired pricing quote
blocks payment; duplicate checkout confirmation creates one order; duplicate payment initiation
creates one payment context; the pre-payment order is hidden from kitchen operations; a historical
address snapshot remains unchanged after saved-address edits; and promotion reservations are not
duplicated through retries.

**Concurrency and invariant tests** must establish: a cart cannot be converted twice; one idempotency
key creates at most one order; one confirmed cart version creates at most one active pre-payment order
unless explicitly superseded; a stale cart mutation cannot overwrite a newer version; payment
initiation cannot use a different cart version from customer confirmation; cross-outlet lines never
coexist in one cart; one customer cannot access another customer's cart or checkout; provider calls do
not occur before internal transaction commit; and duplicate requests do not duplicate promotion
reservations.

The exact test libraries remain governed by
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#testing-structure).

## Consequences

### Positive

- A single governing checkout principle keeps address confirmation, serviceability, cart
  revalidation, quoting, and confirmation ordered consistently regardless of channel.
- Explicit service zones and deterministic outlet resolution let BOBA Bear launch a single Dehradun
  outlet while supporting future multi-outlet resolution without a foundational redesign.
- Server-side authoritative carts with optimistic concurrency and idempotent mutations prevent
  duplicate or conflicting cart state across tabs, devices, and retries.
- A pre-payment order created before external payment initiation gives BOBA Bear a stable internal
  reference for idempotency, reconciliation, and audit regardless of payment outcome.
- Committing all required internal state in one transaction before any provider call, backed by a
  transactional outbox, prevents lost side effects and duplicate orders.

### Trade-offs accepted

- Explicit service zones, cart versioning, and checkout orchestration add domain complexity beyond a
  single-request checkout, accepted because a single-outlet launch must not require a later
  foundational rewrite once more outlets and zones exist.
- Rejecting silent cart merging and silent outlet migration in favor of explicit customer confirmation
  adds friction at login and address-change time, accepted to protect customer intent and order
  accuracy.
- Requiring one committed internal transaction before every provider call adds implementation
  discipline, accepted to guarantee no payment attempt begins without durable internal state.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| A client-supplied outlet identifier is trusted as authoritative | Outlet resolution must use authoritative server-side data; the client never authorizes an outlet by sending an identifier, per [Serviceability Model](#serviceability-model) |
| An anonymous or authenticated cart accumulates products from more than one outlet | Single-outlet cart enforcement blocks cross-outlet lines at the first orderable item, per [Single-Outlet Cart](#single-outlet-cart) |
| Concurrent cart edits from multiple tabs or devices silently overwrite each other | Optimistic concurrency requires a matching expected version before any mutation, per [Optimistic Cart Concurrency](#optimistic-cart-concurrency) |
| A retried cart mutation or checkout confirmation executes twice | Idempotent operation identifiers recognize replay and reject materially different reuse, per [Idempotent Cart Mutations](#idempotent-cart-mutations) and [Checkout and Order Idempotency](#checkout-and-order-idempotency) |
| A stale serviceability decision, delivery quote, or pricing quote authorizes payment | Checkout must use the earliest relevant expiry and revalidate before payment, per [Expiring Decisions and Quotes](#expiring-decisions-and-quotes) |
| Payment is initiated without durable internal state, risking a lost order on provider failure | All required internal state, including a transactional outbox event, commits in one transaction before any provider call, per [Internal Transaction Boundary Before Provider Call](#internal-transaction-boundary-before-provider-call) |
| A pending-payment order becomes visible to kitchen operations before payment is confirmed | Pending-payment orders must not enter kitchen workflow or count as fulfilled revenue, per [Pre-Payment Order Creation](#pre-payment-order-creation) |
| An anonymous cart silently merges into a conflicting authenticated customer cart | Same-outlet and cross-outlet merge conflicts require explicit customer choice; silent merging is prohibited, per [Cart Ownership After Authentication](#cart-ownership-after-authentication) |

## Explicit Non-Decisions

This decision does not resolve the following, which remain **Open** or **Deferred** and must not be
treated as answered by this ADR:

- Geocoding provider
- Map provider
- Geocoding confidence threshold
- Address-autocomplete provider
- Exact address-validation workflow
- Exact service-zone database representation
- Exact polygon-processing library
- Exact distance-calculation method
- Exact serviceability-decision lifetime
- Exact serviceability fallback process
- Exact manual override process
- Exact cart-expiry duration
- Separate anonymous and authenticated cart-expiry values
- Anonymous-cart token format
- Anonymous-cart cookie configuration
- Same-outlet cart merge user experience
- Cart-transfer user experience
- Exact cart-lock implementation
- Exact idempotency-key format
- Exact idempotency retention
- Exact checkout-state names
- Exact checkout expiry
- Exact delivery-quote lifetime
- Exact pricing-quote lifetime
- Exact promotion-reservation lifetime
- Exact provider-call execution model
- Exact payment state machine
- Exact order state machine
- Exact cleanup schedule
- Exact abandoned-cart retention
- Exact pickup-launch timing
- Exact assisted-commerce policy
- Exact support intervention workflow

## Rejected and Deferred Alternatives

- **Client-only authoritative cart** — rejected.
- **Client-submitted outlet as authoritative** — rejected.
- **Multi-outlet cart** — rejected for V1.
- **Silent cross-outlet cart merge** — rejected.
- **Cart-stage inventory or kitchen-capacity reservation** — rejected for V1.
- **Permanent serviceability result** — rejected.
- **Serviceability and delivery quote treated as one decision** — rejected.
- **Payment initiation before internal order creation** — rejected.
- **Provider call inside the database transaction** — rejected.
- **Kitchen visibility before payment confirmation** — rejected.
- **Guest checkout without authentication** — rejected for V1.
- **Customer outlet choice** — deferred.
- **Pickup launch** — deferred.
- **Assisted WhatsApp checkout** — deferred.

## Cross-Reference: ADR-009 Payment Execution

This ADR governs pre-payment order creation — checkout orchestration, cart and catalog
revalidation, quoting, customer confirmation, and the creation of exactly one idempotent
`PENDING_PAYMENT` order before it is handed to the Payments module.
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md) governs what happens next: Cashfree
provider-order creation after this ADR's internal transaction commits, Hosted Checkout, webhook
verification, and payment-state transitions. Provider calls occur only after the internal commit
required by this ADR, per
[Internal Transaction Boundary Before Provider Call](#internal-transaction-boundary-before-provider-call);
a pre-payment order created under this ADR remains outside kitchen workflow until
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#sources-of-payment-truth) confirms
verified payment; and a late or ambiguous payment outcome for an order created under this ADR is
resolved using [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#late-payment-success)'s
review handling rather than this ADR's own (deferred) payment-related order boundary in
[Payment-Related Order Boundary](#payment-related-order-boundary).

## Cross-Reference: ADR-010 Post-Payment Fulfilment

This ADR creates the pre-payment order and hands it to Payments for execution under
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md). What happens once that payment is
verified — outlet release, manual acceptance, kitchen workflow, cancellation, and the Operations
Console — is governed by
[ADR-010](./ADR-010-order-lifecycle-operations-console.md), not by this ADR. A pre-payment order
created under this ADR remains hidden from Operations until
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#payment-release-into-operations) releases
it.

## Cross-Reference: ADR-011 Delivery Dispatch

The delivery quote requested during checkout under this ADR is a time-limited estimate only — it does
not create or dispatch a courier booking. The outlet and address snapshot this ADR creates at
pre-payment order creation, per [Pre-Payment Order Snapshot](#pre-payment-order-snapshot), become the
delivery inputs that
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#checkout-quote-versus-actual-dispatch)
uses once payment is verified and the outlet accepts the order; actual dispatch occurs only then, not
at checkout. A later provider-cost change reconciled under
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#delivery-cost-reconciliation) never
alters the customer delivery-charge quote this ADR and
[ADR-007](./ADR-007-pricing-tax-charges-promotions.md#delivery-quotes) fix.

## Cross-Reference: ADR-013 Cart and Checkout Persistence

[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#optimistic-concurrency) fixes the
database implementation behind this ADR's concurrency and idempotency requirements. Cart and
checkout aggregates carry a `version` column and are updated with optimistic concurrency, where an
update affecting zero rows is a conflict rather than a silent no-op. Checkout confirmation is a
single database transaction: pre-payment order creation, the idempotency record, and the outbox
event commit together or not at all, per
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#transaction-abstraction) and
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#shared-idempotency-persistence). No
external provider is called inside that transaction — payment-provider and delivery-provider calls
happen only after the business transaction has committed, per
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#transactional-outbox-persistence).

## Related Canonical Documents

- [`architecture-foundation.md`](../architecture-foundation.md) — the modular-monolith principle,
  transactional outbox, and Serviceability/Cart/Checkout module references this decision implements
  in detail.
- [ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md) — the persistence decision that
  fixes the optimistic-concurrency, transaction, idempotency, and outbox implementation behind this
  ADR's cart and checkout model, per the cross-reference above.
- [`order-payment-delivery-model.md`](../order-payment-delivery-model.md) — the single-outlet cart,
  order-snapshot, and payment-integrity principles this decision extends with serviceability, cart,
  and checkout-orchestration detail.
- [ADR-003](./ADR-003-modular-monolith-node-typescript.md) — the module boundaries, dependency rules,
  and transactional-outbox model this decision's Serviceability, Cart, and Checkout modules must
  follow.
- [ADR-004](./ADR-004-identity-authentication-sessions.md) — the anonymous-browsing and
  mandatory-authentication-before-checkout decision this ADR's cart and checkout boundary builds on.
- [ADR-005](./ADR-005-organization-outlet-authorization.md) — the customer-ownership authorization,
  service-zone delegation, and support-access decision this ADR's access and audit sections build on.
- [ADR-006](./ADR-006-food-catalog-assortment-availability.md) — the catalog and availability
  revalidation, no-silent-substitution, and immutable catalog-snapshot decision this ADR's checkout
  orchestration and pre-payment-order snapshot extend.
- [ADR-007](./ADR-007-pricing-tax-charges-promotions.md) — the immutable pricing quote, quote
  revalidation, and immutable monetary-snapshot decision this ADR's checkout orchestration and
  pre-payment-order snapshot extend.
- [`v1-product-scope.md`](../v1-product-scope.md) — the V1 customer experience this decision's
  address, serviceability, cart, and checkout model must support.
- [`operating-model.md`](../operating-model.md) — how pending-payment orders and outlet resolution
  are reflected in day-to-day kitchen operations.
- [`organization-outlet-access-model.md`](../organization-outlet-access-model.md) — the outlet,
  territory, and organization entities service zones and outlet resolution are drawn from.
- [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md) — the payment-provider,
  payment-execution, webhook, refund, and reconciliation decision built on top of the pre-payment
  order this ADR creates, per the cross-reference above.
- [ADR-010](./ADR-010-order-lifecycle-operations-console.md) — the post-payment order lifecycle and
  Operations Console decision built on top of the pre-payment order this ADR creates, per the
  cross-reference above.
- [ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md) — the delivery-provider abstraction
  and dispatch decision that uses this ADR's checkout delivery quote and pre-payment order snapshot as
  its dispatch input, per the cross-reference above.
- [ADR-014](./ADR-014-http-api-route-handlers-contracts.md) — the HTTP API decision that exposes this
  ADR's cart optimistic-concurrency and checkout idempotency over HTTP through `ETag`/`If-Match` and
  `Idempotency-Key`.
- [`roadmap-and-open-decisions.md`](../roadmap-and-open-decisions.md) — the open decisions this ADR
  does not resolve.
- [`decision-register.md`](../decision-register.md) — the structured register entries this ADR locks.
- [`README.md`](../README.md) — the canonical documentation index and update protocol.
