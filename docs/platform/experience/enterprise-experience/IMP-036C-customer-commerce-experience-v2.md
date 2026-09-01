---
Status: PLANNED CAPABILITY CONTRACT
Capability: IMP-036C — Customer Commerce Experience V2
Lifecycle: PLANNED / NOT_ACTIVATED
Architecture: NOT_LOCKED
Implementation: NOT_AUTHORIZED / NOT_STARTED
Founder UAT required: YES
---

# IMP-036C — Customer Commerce Experience V2

## Purpose, users, and problem

Mature accepted BOBA Direct commerce into a coherent end-to-end ordering experience for guest and
authenticated customers. Existing capability is functional but its discovery, Cart, Checkout,
payment recovery, confirmation, and Orders journeys need clearer continuity and recovery.

## Target outcomes and information architecture

```text
Landing → location context → Menu → category/search → product/customization
→ Cart → authentication when required → delivery/address → review → payment
→ confirmation → order history/detail/tracking
```

- **Menu:** location indicator, search, categories, product cards, price/availability/customization
  cues, add/quantity actions, sold-out/loading/error/retry, and mobile/desktop Cart continuity.
- **Cart:** configuration clarity, quantity/edit/remove, estimated-subtotal semantics,
  unavailable-item recovery, stale/conflict handling, and checkout continuation.
- **Checkout:** a clear logical Delivery → Order → Price → Payment → Place order journey; multiple
  routes are not required solely for aesthetics.
- **Payment recovery:** customer-close, failure, processing, provider success pending BOBA
  confirmation, duplicate submission, network recovery, and final confirmation.
- **Orders:** current/past grouping, customer-readable timeline, and safe Delivery projection with no
  internal provider or domain-status leakage.

## Primary workflows

1. Establish location context and browse/search the authoritative Menu projection.
2. Inspect a product, make explicit paid-modifier choices, and add/update customer intent.
3. Reconcile guest/authenticated Cart identity through accepted Cart rules.
4. Review delivery, item, price, and payment facts before one idempotent order submission.
5. Recover safely from indeterminate payment/network outcomes without creating duplicate intent.
6. View confirmation and later Orders/detail/tracking projections.

## Reused authority and implications

Reuse D-368 Menu read projection, D-369 explicit paid-modifier selection, D-370 Cart identity
transition, D-371 Cart unit sequence, accepted Checkout/Payment/Order/Delivery authorities, and the
existing customer-commerce transport. Canonical commercial truth, availability, pricing, Cart
identity, idempotency, and BOBA-confirmed payment/order state remain authoritative.

Expected transport/schema changes are `NONE` when existing accepted endpoints and projections are
sufficient. Any identified gap must be documented at architecture lock; this plan does not invent an
endpoint, response field, persistence state, provider behavior, or lifecycle. Authorization remains
the accepted customer/guest boundary; customer projections must minimize internal data.

## Responsive, accessibility, and state requirements

Mobile-first with persistent but non-obstructive Cart continuity and suitable desktop treatment.
Target WCAG 2.2 AA: keyboard-operable discovery/customization, announced price/quantity changes,
semantic form errors, focus-managed recovery, and no color-only state communication.

Cover loading, empty Menu/Orders, sold out/unavailable, retry, 401, safe 403/404, stale Cart,
concurrent quantity mutation, pending/success/failure, duplicate submit, payment ambiguity, and
network recovery. Correlation support may use accepted IMP-036 mechanisms without leaking secrets.

## Major acceptance criteria

- A customer can understand and complete the entire journey without losing location or Cart context.
- Displayed Menu, customization, availability, and monetary facts preserve canonical authorities.
- Failure/reload/duplicate actions do not create silent Cart or order divergence.
- Payment ambiguity is represented honestly until BOBA confirms the outcome.
- Orders and Delivery presentation is customer-safe and comprehensible.
- Mobile, keyboard, screen-reader, responsive, and exact-candidate Founder UAT checks pass.

## Dependencies, non-goals, and deferred decisions

Depends on IMP-036A/B and accepted Direct capabilities. IMP-036B supplies the coherent customer
account, address, location-evidence, and Serviceability experience on which this mature commerce
flow depends. Non-goals: loyalty, rewards, subscriptions,
favorites, AI recommendations, autonomous reorder semantics, marketing personalization, chat, new
provider selection, new lifecycle states, or invented analytics. Route/component composition and
any proven transport gap are deferred to architecture lock.

Figma is not required initially. Later approved visual refinements remain bounded unless they add
business, API, provider, authorization, or lifecycle semantics.

## Customer delivery fee ownership (planned amendment — IMP-036B correction)

```text
STANDARDIZED_CUSTOMER_DELIVERY_FEE = YES
```

IMP-036C explicitly owns BOBA-standardized customer-facing delivery pricing:

- Customer sees a predictable BOBA-owned delivery charge before payment.
- Fee is computed server-authoritatively from configured BOBA policy (may use distance bands).
- Fee participates in canonical cart/checkout totals and is snapshotted into commercial order truth.
- Customer pays BOBA once, including delivery charge.
- Provider execution cost remains internal and never rewrites historical customer delivery charge.
- BOBA may absorb provider-cost variance (subsidy/contribution reporting only).
- Live/dynamic courier quote pass-through is forbidden as customer pricing.

Exact distance bands, ₹ values, and free-delivery thresholds remain business configuration, not
code constants. This amendment does not activate IMP-036C.
