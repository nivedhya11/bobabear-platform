---
Status: Accepted
Decision date: 2026-08-02
Last updated: 2026-08-02
---

# ADR-011: Delivery Providers, Dispatch, and Fulfilment

## Status

Accepted

## Decision Date

2026-08-02

## Decision Owners

BOBA Bear founder and product leadership

## Context

[`order-payment-delivery-model.md`](../order-payment-delivery-model.md) locked the principle that
BOBA Bear will use third-party delivery partners, that no specific delivery provider is selected,
that the customer delivery charge and delivery-provider cost are separate values, and that a
provider-neutral delivery interface is required — without fixing the Delivery module's domain model.
[ADR-007](./ADR-007-pricing-tax-charges-promotions.md) fixed the customer delivery charge, delivery
quote, and delivery-provider cost as distinct monetary concepts, deferring the delivery-pricing
algorithm to a future Delivery architecture slice. [ADR-008](./ADR-008-serviceability-cart-checkout.md)
fixed serviceability and outlet resolution as distinct from delivery quoting, and fixed that a
checkout delivery quote is not itself a courier booking. [ADR-010](./ADR-010-order-lifecycle-operations-console.md)
fixed the commercial and fulfilment lifecycles, the payment-release mechanism into operations, the
coordinated handoff point between Operations and Delivery, and the principle that delivery
completion normally drives commercial order completion — while explicitly deferring detailed
delivery-state progression to "a future ARCH-11 decision." None of these documents fix how BOBA Bear
selects and abstracts delivery providers, how dispatch timing relates to payment and outlet
acceptance, how a delivery request is created idempotently, how courier assignment and pickup
verification work, how proof of delivery is captured, how delivery failures and returns are handled,
how provider costs are reconciled against customer charges, or what must be audited across delivery
fulfilment.

This ADR resolves the delivery-provider abstraction, delivery operating modes, provider-validation
order, the Delivery module's domain boundary, the provider-neutral delivery interface,
delivery-account ownership, the separation of delivery quote/request/booking/assignment/event/proof/
return/cost-reconciliation concepts, the relationship between the checkout delivery quote and actual
dispatch, dispatch timing and dispatch-policy, the normalized delivery lifecycle, provider-status
normalization, delivery-request idempotency and provider-timeout recovery, provider selection and
switching, courier assignment and reassignment, pickup verification, the coordinated handoff
workflow, package-handoff data, proof of delivery, the delivery OTP, delivery confirmation and manual
confirmation, delivery-driven commercial completion, customer-visible tracking and live location,
provider callbacks and durable provider events, duplicate and out-of-order event handling, delivery
cancellation, delivery failure, the customer-unavailable workflow, the return workflow, returned-food
handling, delivery exceptions, the controlled manual dispatch workflow, approved local-rider records,
provider-cost and customer-charge separation, delivery-cost reconciliation, manual cost entry,
provider claims, customer-data minimization, courier-contact masking, credential controls,
administrative authority, delivery timers, the notifications boundary, provider-outage behaviour,
and audit and metrics requirements — so that the Delivery module referenced in
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#initial-module-boundaries) and
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#fulfilment-lifecycle) can be implemented
against a fixed foundation rather than ad hoc, per-change decisions.

This ADR is a documentation-only architecture decision. It does not add Delivery module code,
provider adapters, dispatch-policy code, pickup-code generation, delivery OTP code,
proof-of-delivery code, live tracking, Operations Console delivery UI, manual-rider UI,
cost-reconciliation jobs, database tables, migrations, provider credentials, or tests. It does not
select a final delivery provider, negotiate commercial terms, or resolve any operational decision
that requires launch validation.

## Provider-Selection and Launch-Validation Boundary

This ADR distinguishes two categories of content, and no reader should collapse them:

1. **Approved platform architecture** — the provider-neutral Delivery module's domain model,
   operating modes, dispatch timing, normalized lifecycle, idempotency and recovery rules, courier
   and pickup model, proof-of-delivery model, cost-reconciliation model, and audit requirements.
   These are Locked architectural decisions, independent of which delivery provider is ultimately
   used in Dehradun.
2. **Provider validation and selection** — which specific provider or providers BOBA Bear
   commercially and technically validates and ultimately uses in Dehradun. This remains entirely
   open and is explicitly out of scope for this ADR to resolve.

**Rapido is the first commercial-validation candidate, not an approved integration.** A public Rapido
delivery API is not assumed to exist. No provider is production-approved for Dehradun as of this
decision. Rapido's Dehradun coverage, food-delivery suitability, business-account availability, API
availability, dashboard-booking capability, support model, service levels, and commercial terms all
require direct validation before any commercial commitment. The same validation requirement applies
to any other candidate — Uber Direct, Borzo, Porter, or another provider — considered later. This
ADR must not be read as selecting Rapido, or any other named provider, as BOBA Bear's production
delivery partner. Provider-specific implementation details (API contracts, callback formats,
signature schemes, credential names) are pinned during a future implementation slice, not by this
ADR.

## Decision Summary

> BOBA Bear uses a provider-neutral Delivery module that supports API-integrated providers,
> business-dashboard providers, and controlled manual local providers. The production provider for
> Dehradun will be selected only after commercial, operational, coverage, support, and technical
> validation.

```text
Order accepted by outlet
        ↓
Preparation-aware dispatch policy
        ↓
Delivery request created (idempotent)
        ↓
Provider booking or manual assignment
        ↓
Courier assignment
        ↓
Pickup verification and handoff
        ↓
Delivery progression (normalized lifecycle)
        ↓
Proof of delivery
        ↓
Delivery completion → commercial completion
```

The Delivery module owns delivery accounts, provider adapters, delivery quotes, dispatch policies,
delivery requests, provider bookings, courier assignments, pickup verification, package handoff,
delivery progression, proof of delivery, delivery failures, returns, provider events,
provider-cost reconciliation, and delivery claims — kept distinct from saved customer addresses,
serviceability, the customer delivery charge, food preparation, payment collection, customer
identity, and commercial order lifecycle, which remain owned by Customers, Serviceability, Pricing,
Operations, Payments, Identity, and Orders respectively. A checkout delivery quote under
[ADR-007](./ADR-007-pricing-tax-charges-promotions.md) and
[ADR-008](./ADR-008-serviceability-cart-checkout.md) never itself creates or dispatches a courier
booking; actual dispatch occurs only after verified payment success and outlet acceptance, using
preparation-aware timing. Delivery requests are idempotent and recover safely from provider timeouts
without duplicate bookings. Provider-specific statuses are normalized by provider adapters into one
BOBA Bear delivery lifecycle. An order has at most one active delivery booking by default, and
provider switching after courier assignment is an operational exception; after pickup it is
prohibited. Pickup requires verification beyond the public order number, and Operations/Delivery
handoff is coordinated in one transaction. Proof of delivery is provider-neutral, preferring a
customer OTP or provider PIN, with manual confirmation reserved as an exceptional path. Delivery
confirmation normally drives commercial order completion. Customer-visible tracking is a safe,
derived projection. Provider callbacks are durable, idempotent, and reconciled against duplicate,
delayed, and out-of-order delivery. Delivery cancellation is separate from commercial order
cancellation; delivery failure and returns use explicit resolution workflows; returned food does not
automatically return to saleable stock. Provider cost is tracked separately from the customer
delivery charge and reconciled on its own schedule. Customer and rider data shared with providers is
minimized, and provider credentials follow the same environment-isolation and secrets discipline
already locked for other providers.

This is an accepted, final decision for BOBA Bear's delivery-provider abstraction, dispatch, and
fulfilment architecture — not a recommendation or a provisional option, except where a specific item
is explicitly marked provisional or open below. It fixes the Delivery module's domain boundaries,
operating modes, dispatch timing principle, normalized lifecycle, idempotency and recovery model,
courier and pickup-verification model, proof-of-delivery model, cancellation/failure/return model,
cost-separation and reconciliation model, and audit requirements. It does not fix the final Dehradun
provider, Rapido's availability or capability, exact dispatch lead time, exact pickup-verification
method, exact proof-of-delivery policy, exact delivery-OTP parameters, exact customer-unavailable and
return policy detail, exact cost-variance tolerances, or exact provider-claim workflows — see
[Explicit Non-Decisions](#explicit-non-decisions).

## Delivery Operating Modes

The Delivery module supports three operating modes, none of which is a workaround for the others:

```text
API_INTEGRATED
BUSINESS_DASHBOARD
MANUAL_LOCAL_PROVIDER
```

**`API_INTEGRATED`** — BOBA Bear may request a provider quote, create a provider booking, receive
courier assignment, receive signed callbacks, query status, cancel where supported, and reconcile
final cost programmatically.

**`BUSINESS_DASHBOARD`** — authorized staff create the booking using a provider-approved portal or
application; BOBA Bear records the resulting provider, external reference, cost, courier details,
delivery status, proof, exceptions, and reconciliation data.

**`MANUAL_LOCAL_PROVIDER`** — authorized staff assign an approved local delivery business or rider;
BOBA Bear remains the source of truth for assignment, handoff, delivery progression, proof, return,
cost, and audit.

`MANUAL_LOCAL_PROVIDER` is a controlled, supported mode — not an undocumented workaround — and uses
the same normalized lifecycle, audit, and cost-reconciliation requirements as the other two modes.

## Provider-Validation Order

The recommended commercial-validation order is:

```text
1. Rapido business delivery partnership
2. Other commercially available API or dashboard providers in Dehradun
3. Approved local delivery businesses or riders
4. A future BOBA Bear-managed delivery fleet
```

For Rapido and any later candidate, validation should cover Dehradun service availability,
food-delivery suitability, business-account availability, API availability, dashboard booking, quote
capability, delivery creation, courier assignment, status callbacks, status querying, proof of
delivery, pickup verification, cancellation, return handling, claims process,
customer-support escalation, commercial rates, taxes and invoices, settlement or billing data,
data-processing terms, service-level expectations, and provider outage handling. The final provider
decision remains open.

## Delivery-Module Boundary

The Delivery module owns:

```text
Delivery accounts
Provider adapters
Delivery quotes
Dispatch policies
Delivery requests
Provider bookings
Courier assignments
Pickup verification
Package handoff
Delivery progression
Proof of delivery
Delivery failures
Returns
Provider events
Provider-cost reconciliation
Delivery claims
```

It does not own:

```text
Saved customer addresses          → Customers
Serviceability zones              → Serviceability
Outlet resolution                 → Serviceability
Customer delivery charge          → Pricing
Food preparation and readiness    → Operations
Payment collection                → Payments
Refund calculation                → Payments / Pricing
Customer identity                 → Identity
Commercial order lifecycle        → Orders
```

Approved ownership relationships:

```text
Customers
    → owns saved addresses

Serviceability
    → selects the fulfilment outlet

Pricing
    → owns the customer delivery charge

Operations
    → owns preparation, readiness, and operational handoff

Delivery
    → owns dispatch, courier, and delivery execution

Orders
    → owns commercial order completion
```

## Provider-Neutral Delivery Interface

The Delivery module exposes provider-neutral capabilities conceptually similar to:

```text
requestDeliveryQuote()
createDeliveryRequest()
fetchDeliveryStatus()
cancelDelivery()
verifyProviderEvent()
acceptProviderEvent()
processProviderEvent()
assignManualCourier()
recordCourierArrival()
confirmPickup()
confirmDelivery()
requestReturn()
confirmReturn()
reconcileDeliveryCost()
```

Exact function names and signatures remain open. Provider-specific concepts must remain inside
infrastructure adapters and provider-reference records; business modules must not import a Rapido,
Uber, Borzo, Porter, or other provider SDK directly, consistent with the module dependency rules
already locked in [ADR-003](./ADR-003-modular-monolith-node-typescript.md#dependency-rules).

## Delivery-Account Ownership

A delivery account belongs to the applicable operating context:

```text
Outlet
    ↓
Operating organization or legal entity
    ↓
Delivery account
    ↓
Provider credentials or business account
```

For the initial COCO outlet, the architecture must support one or more approved Dehradun delivery
accounts, outlet-specific pickup configuration, legal-entity and billing context, a provider support
contact, separate staging and production credentials where an API exists, separate staging and
production callback endpoints, and separate provider environments where supported. Future franchise
outlets may use different providers, contracts, business accounts, credentials, billing ownership,
cost ownership, support arrangements, and service-level agreements. **The customer or browser must
never select the delivery account.**

## Separate Delivery Concepts

The following records are kept distinct and must not be combined into one delivery-status record:

**Delivery quote** — a time-limited estimate of provider availability, estimated provider cost, the
customer delivery-charge reference, estimated pickup and delivery times, and provider or dispatch
mode.

**Delivery request** — BOBA Bear's internal request to fulfil one order's delivery.

**Provider booking** — the external provider's booking or delivery record.

**Courier assignment** — the current courier responsible for fulfilment.

**Delivery event** — a provider callback, a provider status-query result, a manual operational
update, or a system-generated delivery event.

**Proof of pickup** — evidence that the correct prepared order was handed to the correct courier.

**Proof of delivery** — evidence that the order reached the customer or an approved recipient.

**Return** — the reverse movement of an undelivered order.

**Cost reconciliation** — the comparison between quoted, booked, final, cancellation, and return
costs.

## Checkout Quote Versus Actual Dispatch

The delivery quote used during checkout under [ADR-007](./ADR-007-pricing-tax-charges-promotions.md#delivery-quotes)
and [ADR-008](./ADR-008-serviceability-cart-checkout.md#serviceability-and-delivery-quoting-separation)
must not itself create or dispatch a courier booking. Approved sequence:

```text
Checkout delivery quote
        ↓
Customer delivery charge confirmed
        ↓
Verified payment success
        ↓
Outlet accepts order
        ↓
Preparation estimate established
        ↓
Delivery request created
```

The customer delivery charge is snapshotted at order creation. Provider cost may change later;
provider-cost changes do not rewrite the customer delivery charge, extending
[ADR-007](./ADR-007-pricing-tax-charges-promotions.md#delivery-charge-and-provider-cost). Checkout
quote expiry and actual booking remain separate concerns. A rejected order, per
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#rejection-before-acceptance), must not
create a provider booking.

## Dispatch Timing

A real delivery request must not be created before verified payment success, outlet acceptance, a
confirmed outlet, a confirmed delivery-address snapshot, valid delivery context, and an operational
preparation estimate. The recommended V1 approach is:

> Create the delivery request after outlet acceptance, using the expected ready time and a
> provider-specific lead time intended to align courier arrival with food readiness.

This reduces courier waiting, food waiting after preparation, premature provider cancellation,
provider cost for orders the outlet rejects, and duplicate dispatch work. For providers that cannot
accept future pickup timing, dispatch may occur closer to `READY_FOR_HANDOFF`. Exact lead time
remains open.

## Dispatch-Policy Model

Dispatch strategy must be configurable by outlet, provider, time of day, estimated preparation
duration, delivery distance, service zone, provider availability, provider health, and operational
override. Conceptual strategies:

```text
DISPATCH_AFTER_ACCEPTANCE
DISPATCH_BEFORE_READY
DISPATCH_WHEN_READY
MANUAL_DISPATCH
```

The V1 policy foundation requires: no dispatch before verified payment; no dispatch before outlet
acceptance; no booking for a rejected order; preparation-aware timing; manual override for
authorized Outlet Managers or Delivery Coordinators; provider-specific policy support; and explicit
audit for exceptional dispatch changes.

## Normalized Delivery Lifecycle

The Delivery module supports a lifecycle conceptually equivalent to:

```text
NOT_REQUESTED
REQUEST_PENDING
SEARCHING_FOR_COURIER
COURIER_ASSIGNED
COURIER_EN_ROUTE_TO_PICKUP
COURIER_AT_PICKUP
PICKED_UP
IN_TRANSIT
COURIER_AT_DROPOFF
DELIVERED
DELIVERY_FAILED
RETURN_REQUESTED
RETURN_ACCEPTED
RETURNING
RETURNED
RETURN_FAILED
CANCELLED
REVIEW_REQUIRED
```

**Not requested** — no dispatch work has started. **Request pending** — an internal request exists,
but provider booking or manual assignment is incomplete. **Searching for courier** — a provider
accepted the request and is finding a courier. **Courier assigned** — a courier has been assigned.
**Courier en route to pickup** — the courier is travelling to the outlet. **Courier at pickup** — the
courier has reached or is near the outlet. **Picked up** — verified package handoff occurred. **In
transit** — the order is moving to the customer. **Courier at dropoff** — the courier reached the
delivery location. **Delivered** — accepted proof confirms delivery. **Delivery failed** — the
delivery attempt failed and requires resolution. **Return states** — the controlled return of an
undelivered order. **Cancelled** — the delivery request was cancelled before successful completion.
**Review required** — provider and BOBA Bear states are inconsistent, ambiguous, duplicated,
mismatched, or unsafe to apply automatically. Exact enum naming may be refined during
implementation; this state separation is locked.

## Provider-Status Normalization

Providers use different status models. Provider adapters must map provider-specific statuses into
BOBA Bear normalized delivery states:

```text
Provider-specific status
        ↓
Provider adapter
        ↓
Normalized BOBA Bear delivery state
```

Provider status text must not drive business logic directly. The original provider status must be
retained for support. An unknown status must remain pending or enter review safely. Invalid backward
transitions must be rejected or reviewed. Mapping rules must be versioned and tested. Manual-provider
status updates must use the same normalized lifecycle.

## Delivery-Request Idempotency

Delivery-request creation must be idempotent. A delivery request should have a stable internal
identifier, a stable provider-safe reference, a stable idempotency key where supported, an immutable
request fingerprint, a provider account, an order reference, an outlet, a delivery-address snapshot,
a retry-safe provider operation, and a recovery status. A timeout must not automatically create
another booking. Replaying an identical request returns the original result. Reusing an idempotency
key with different delivery input fails. Duplicate request events must not create two couriers.
Provider references must not contain unnecessary sensitive customer data.

## Provider-Timeout Recovery

When provider booking creation times out: do not assume success; do not assume failure; search or
query using the stable provider reference where supported; retry with the same idempotency key where
supported; reconcile the resulting booking; create a replacement booking only after confirming the
earlier booking did not succeed or was explicitly cancelled. This prevents duplicate bookings,
duplicate couriers, duplicate provider charges, conflicting delivery tracking, and unreconciled
delivery requests. Exact retry timing remains open.

## Provider Selection

Provider selection occurs through dispatch policy and trusted configuration, using conceptual inputs
of outlet, delivery address, service zone, current time, preparation estimate, approved providers,
provider availability, expected cost, expected pickup time, provider health, and operational policy.
V1 does not require dynamic multi-provider cost optimization. The recommended initial approach is one
primary configured provider or provider mode per outlet, one approved fallback mode, authorized
manual provider selection where necessary, no uncontrolled provider selection by the customer, and no
automatic bidding across providers.

## One Active Booking by Default

An order must have at most one active delivery booking by default. A replacement workflow may exist
only when the previous booking is cancelled or confirmed failed, provider cancellation outcome is
known or under review, any provider cost is recorded, the replacement reason is recorded, a new
booking is explicitly created, and audit is retained. The platform must never silently create two
active couriers for one order.

## Provider Switching

**Before provider booking** — the dispatch policy may choose another approved provider. **After
booking but before courier assignment** — switching requires an explicit cancellation request,
provider cancellation confirmation or reconciliation, provider fee recording where applicable, a new
delivery booking, and audit. **After courier assignment** — switching is an operational exception.
**After pickup** — provider switching is prohibited; the workflow must instead use delivery failure,
return, customer-support resolution, or a provider claim.

## Courier Assignment

A provider courier assignment should conceptually contain the delivery request, provider, provider
courier identifier, display name where supplied, masked contact where supported, vehicle category,
vehicle number where justified, assignment timestamp, estimated pickup, provider tracking reference,
assignment source, lifecycle state, and audit metadata. A manually assigned courier should contain an
approved provider or rider record, rider name, contact number, vehicle details where required, the
assignment actor, agreed cost, assignment timestamp, and verification or approval status. Rider data
must be minimized and retained only for operational, legal, support, and audit needs.

## Courier Reassignment

Provider-side courier reassignment may occur before pickup. The platform must update the current
assignment, preserve previous assignment history, avoid creating a second delivery, record assignment
timestamps, update customer-safe tracking where appropriate, notify operations where needed, and
retain the provider event. Reassignment after verified pickup must enter review unless it is an
explicitly supported provider workflow.

## Pickup Verification

The public order number alone is not sufficient proof that a courier is permitted to collect an
order, extending the public-order-number boundary already locked in
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#public-order-number). The recommended V1
model is a short-lived numeric pickup code, bound to the delivery request, bound to the current
courier assignment where possible, visible only to authorized outlet staff and the approved courier
workflow, single-use, invalidated after pickup, reissued when courier assignment changes, and
excluded from plaintext logs. Potential future methods include a QR code, a barcode, provider-native
pickup verification, and device-based confirmation. Exact implementation remains open.

## Coordinated Handoff

Before confirming pickup: the order fulfilment state is `READY_FOR_HANDOFF`; the delivery request has
an active courier assignment; courier or provider identity is verified; a pickup code or another
approved verification passes; package count is confirmed; required packaging condition is checked;
tamper evidence is checked where applicable; outlet staff confirms handoff; Operations fulfilment
becomes `HANDED_OFF`; Delivery becomes `PICKED_UP`; timeline, audit, and outbox events are created;
and customer notification occurs after commit. Operations and Delivery transitions should occur in
one coordinated internal transaction where they belong to the same handoff command, consistent with
the coordinated-handoff point already anticipated in
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#delivery-driven-completion).

## Package-Handoff Data

Package handoff should conceptually capture the order, delivery request, courier assignment, package
count, packaging condition, tamper-seal reference where used, pickup-verification method, the outlet
staff actor, pickup timestamp, provider event or manual source, an optional operational note, and a
correlation identifier. Exact tamper-seal implementation remains open.

## Provider-Neutral Proof of Delivery

The Delivery module supports configurable proof-of-delivery methods:

```text
CUSTOMER_OTP
PROVIDER_PIN
PHOTO
SIGNATURE
BARCODE
PROVIDER_CONFIRMED_DELIVERY
AUTHORIZED_MANUAL_CONFIRMATION
```

The recommended V1 preference is, in order: a customer delivery OTP or provider PIN;
provider-confirmed proof; authorized manual confirmation for exceptional local delivery. Photo proof
is not mandatory for every normal residential food delivery unless required by provider policy,
delivery risk, or a future business decision.

## Delivery OTP

A BOBA Bear-controlled delivery OTP, if implemented, must be separate from the login OTP fixed by
[ADR-004](./ADR-004-identity-authentication-sessions.md#customer-authentication),
delivery-specific, order-specific, short-lived, single-use, stored securely, excluded from logs,
shared only with the authenticated customer or confirmed recipient, invalidated after successful
delivery, protected by attempt limits, and regenerated only through an authorized process where
needed. Exact OTP length, expiry, resend, and fallback remain open.

## Delivery Confirmation

Delivery may transition to `DELIVERED` only through an accepted confirmation path: a verified
provider-delivered event with accepted proof; a valid customer delivery OTP; a valid provider PIN; an
accepted provider proof-of-delivery record; or an authorized manual confirmation with a required
reason and evidence. A courier-side "delivered" action is not automatically sufficient unless it
satisfies the configured provider-trust and proof policy.

## Manual Confirmation

Manual delivery confirmation is an exception path requiring Delivery Coordinator or Outlet Manager
permission, a structured reason, a courier or provider reference, customer-contact evidence where
required, a timestamp, audit, and manager approval where policy requires it. Possible reasons:

```text
PROVIDER_CALLBACK_MISSING
CUSTOMER_CONFIRMED_RECEIPT
LOCAL_RIDER_COMPLETED
PROVIDER_SYSTEM_UNAVAILABLE
OTHER_APPROVED_REASON
```

Manual completion must not be used merely to clear an ageing queue.

## Delivery-Driven Commercial Completion

Approved relationship:

```text
Delivery DELIVERED
        ↓
Operations FULFILLED
        ↓
Commercial order COMPLETED
```

Completion must be idempotent. Duplicate provider events must not complete an order twice. Handoff
alone does not complete the delivery order. Courier assignment does not complete the order.
Settlement is not required for commercial completion, per
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#payment-success-and-settlement-separation).
Refund or provider-cost review may remain open after completion. This is consistent with, and gives
full detail to, the delivery-driven completion boundary already locked in
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#delivery-driven-completion).

## Customer-Visible Delivery Tracking

Customer delivery tracking uses safe projected states such as:

```text
FINDING_DELIVERY_PARTNER
DELIVERY_PARTNER_ASSIGNED
PARTNER_REACHING_OUTLET
ORDER_PICKED_UP
OUT_FOR_DELIVERY
ARRIVING_SOON
DELIVERED
DELIVERY_DELAYED
DELIVERY_ISSUE
```

These extend the customer-visible tracking projection already locked in
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#customer-visible-tracking-projection). The
platform must not expose raw provider status codes, provider credentials, courier private
information, full assignment history, internal support notes, provider disputes, or fraud or risk
details.

## Live Location

Where a provider supplies live tracking, BOBA Bear may display a provider-hosted tracking link, a
BOBA Bear tracking projection, approximate courier position, or estimated arrival. Location sharing
ends after delivery or cancellation and must not be retained indefinitely. A customer may view only
their own active delivery. Staff access is permission-scoped. Provider location is not itself
authoritative for state transitions. Missing live updates must not lose the authoritative delivery
record. Courier location data must be treated as sensitive operational data. Exact implementation
remains open.

## Provider Callbacks and Webhooks

API-integrated provider callbacks must be HTTPS, environment-specific, signature-verified where
supported, durably persisted, deduplicated, safe for duplicate delivery, safe for delayed delivery,
safe for out-of-order delivery, transactionally processed, and reconciled through provider queries
where needed. The platform must not assume every provider supports callbacks. Business-dashboard and
manual-provider modes therefore use authorized staff commands, provider references, status
reconciliation, and audit.

## Durable Provider-Event Records

A delivery provider event should conceptually contain an internal event identifier, provider,
delivery account, environment, provider event identity, provider booking identity, provider courier
identity where relevant, event category, provider status, normalized status, signature-verification
result, received timestamp, provider timestamp, processing state, processing-attempt count, related
delivery request, a payload-retention reference where approved, and a correlation identifier. Exact
event-payload retention and encryption remain open.

## Provider-Event Processing Transaction

Approved conceptual processing flow:

```text
PostgreSQL transaction
├── insert or resolve provider event
├── deduplicate event
├── lock delivery request
├── validate provider account and booking reference
├── normalize provider status
├── validate state transition
├── update courier assignment where applicable
├── update delivery state
├── coordinate order completion where applicable
├── create audit event
└── create transactional outbox events
        ↓
commit
        ↓
customer and staff notifications
```

Provider-event handlers must not send customer messages or mutate unrelated external systems before
commit, extending the transactional-outbox requirement already locked in
[`architecture-foundation.md`](../architecture-foundation.md#transactional-outbox) and
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#transactional-outbox).

## Duplicate and Out-of-Order Events

Provider events may be duplicated, delayed, missing, out of order, replayed, or received after
manual correction. Terminal `DELIVERED` cannot be reversed by an older event. Duplicate pickup does
not repeat handoff. Duplicate delivered events do not repeat completion. Unknown transitions remain
pending or enter review. Provider-event history remains available for support. Reconciliation may
repair missing events. Duplicate events must not duplicate notifications, timeline entries, metrics,
claims, returns, or completion.

## Delivery Cancellation

Delivery cancellation and commercial order cancellation remain separate, extending
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#cancellation-and-refund-separation).

**Before provider booking** — no provider cancellation is required. **After provider booking but
before courier assignment** — cancel the provider booking where supported. **After assignment but
before pickup** — cancellation may incur a provider fee. **After pickup** — normal delivery
cancellation is unavailable; the workflow becomes delivery failure, return, customer-support
resolution, provider claim, or disposal only under an approved exceptional process. Provider
cancellation cost must not automatically become a customer charge.

## Delivery Failure

A failed delivery should capture a structured reason such as:

```text
CUSTOMER_UNAVAILABLE
CUSTOMER_REFUSED
ADDRESS_NOT_FOUND
ADDRESS_INCORRECT
UNSAFE_DELIVERY_LOCATION
COURIER_FAILURE
VEHICLE_FAILURE
PACKAGE_DAMAGED
PROVIDER_CANCELLED
OUTLET_REQUESTED_RETURN
SYSTEM_OR_PROVIDER_ERROR
OTHER_REVIEWED_REASON
```

A failed delivery must not automatically become delivered, commercially cancelled, refunded,
returned, or completed. It must enter an explicit resolution workflow.

## Customer-Unavailable Workflow

The V1 policy foundation: a courier or provider attempts approved customer contact; the contact
attempt is recorded where available; a limited waiting period applies; a second attempt may occur
where operationally reasonable; delivery becomes failed when the customer remains unavailable; a
return decision is created; customer communication is issued; refund eligibility is decided
separately; provider and return costs are recorded. Exact number of attempts, waiting duration, and
refund treatment remain open.

## Return Workflow

Every delivery request must include an approved return location, normally the originating outlet, and
uses a lifecycle conceptually equivalent to:

```text
RETURN_REQUESTED
RETURN_ACCEPTED
RETURNING
RETURNED
RETURN_FAILED
RETURN_REVIEW_REQUIRED
```

A return should conceptually record the original delivery request, return reason, return
destination, provider, courier assignment, return cost, returned package condition, outlet receipt,
return timestamps, customer impact, refund or support linkage, and audit metadata.

## Returned-Food Handling

Returned food must not automatically return to saleable stock. The outlet must record an outcome such
as:

```text
DISPOSED
QUALITY_REVIEW
SAFE_INTERNAL_HANDLING
OTHER_APPROVED_OUTCOME
```

Ingredient inventory and wastage accounting remain outside V1. The return outcome still requires an
actor, reason, timestamp, order and delivery link, audit, and an operational metric.

## Delivery Exceptions

Delivery exceptions use [ADR-010](./ADR-010-order-lifecycle-operations-console.md#first-class-operational-exceptions)'s
first-class exception model. Initial delivery exception types should include:

```text
NO_COURIER_AVAILABLE
COURIER_ASSIGNMENT_DELAY
COURIER_LATE_TO_PICKUP
COURIER_REASSIGNED
COURIER_NO_SHOW
PROVIDER_OUTAGE
PICKUP_VERIFICATION_FAILED
PACKAGE_HANDOFF_DISPUTE
DELIVERY_DELAY
CUSTOMER_UNAVAILABLE
ADDRESS_PROBLEM
PROOF_OF_DELIVERY_MISSING
RETURN_REQUIRED
RETURN_DELAY
DELIVERY_COST_MISMATCH
PROVIDER_STATE_MISMATCH
```

A blocking exception must prevent unsafe progression. Exact severities and escalation thresholds
remain open.

## Controlled Manual Dispatch Workflow

For a manual or business-dashboard provider: a Delivery Coordinator selects an approved provider
mode; records quote or agreed cost; creates the external booking where applicable; records the
external booking reference; records courier assignment when available; records courier arrival;
verifies pickup; records package handoff; tracks delivery progression; captures proof or customer
confirmation; confirms delivery through an authorized command; and reconciles final provider cost.
Manual status updates must be authorized, outlet-scoped, versioned, idempotent, reasoned where
exceptional, and audited.

## Approved Local-Rider Controls

A manually assigned rider must belong to one of: an approved delivery business, an approved
contracted rider, or a future authorized BOBA Bear delivery workforce. Arbitrary unverified rider
entry for each order without an approved provider or rider record is not permitted. An approved
rider or provider record should conceptually include a stable identifier, provider or business, rider
identity, verification status, contact information, active status, applicable outlets, approval or
contract reference, emergency contact where permitted, and creation and update audit. Exact KYC and
onboarding responsibility remain open.

## Provider Cost and Customer Charge Separation

[ADR-007](./ADR-007-pricing-tax-charges-promotions.md#delivery-charge-and-provider-cost) remains
authoritative:

```text
Customer delivery charge
≠
Estimated provider cost
≠
Final provider cost
```

The delivery request must retain the checkout delivery-quote reference, the customer delivery-charge
snapshot, estimated provider cost, booked provider cost, final provider cost, merchant subsidy,
provider cancellation charge, return charge, additional provider adjustment, currency, and a provider
invoice, receipt, or statement reference. Provider-cost changes must not rewrite the customer's
original delivery charge.

## Delivery-Cost Reconciliation

Reconciliation should compare quoted provider cost, booked provider cost, final provider cost,
cancellation cost, return cost, taxes, provider invoice, provider statement or settlement record,
customer delivery charge, merchant subsidy, and manual cost adjustments. Conceptual outcomes:

```text
MATCHED
EXPECTED_VARIANCE
UNEXPECTED_VARIANCE
MISSING_PROVIDER_RECORD
DUPLICATE_PROVIDER_CHARGE
REVIEW_REQUIRED
```

Exact tolerance values remain open.

## Manual Cost Entry

Manual provider-cost entry requires provider, delivery request, amount, currency, cost basis, actor,
external receipt or reference where available, reason, approval above a configured threshold, and
audit. A later cost correction must create an adjustment history; the original cost must not be
invisibly overwritten.

## Provider Claims

The Delivery module supports provider claims involving lost order, damaged order, failed delivery,
courier misconduct, incorrect charge, duplicate charge, missing proof, delayed delivery, or return
dispute. A claim should conceptually contain provider, delivery request, claim type, evidence,
requested amount, provider case reference, lifecycle state, outcome, financial adjustment, claim
deadline, and audit metadata. Exact provider-specific claim workflows and deadlines remain open and
must be captured during provider validation.

## Customer-Data Minimization

Only delivery-required customer data is shared with providers: recipient name, delivery contact,
delivery address, coordinates, landmark, delivery instructions, package count, a safe order
reference, return location, and pickup contact — never a complete customer profile, unrelated
addresses, order history, payment credentials, marketing profile, limited-drop eligibility, internal
support notes, or full item pricing unless operationally required, extending the data-minimization
principle already locked in
[ADR-005](./ADR-005-organization-outlet-authorization.md#customer-data-minimization). Provider data
sharing must be governed by contract, privacy policy, and approved retention rules.

## Courier Contact and Masking

Provider-supported masked contact is preferred. Where direct contact is necessary: share only the
delivery contact required for active fulfilment; limit staff access; restrict use to the active
delivery; stop displaying it after the operational need ends; audit sensitive access where
appropriate; and never expose alternate customer records. Exact masking and retention rules remain
open.

## Credential Controls

Delivery-provider API credentials and webhook secrets must be separate for staging and production,
stored as DigitalOcean runtime secrets, bound to the correct delivery account, server-side only,
rotatable, revocable, excluded from logs, excluded from client bundles, validated at startup, and
protected through least-privilege access, extending the secrets-model requirements already locked in
[ADR-002](./ADR-002-environments-ci-cd-release-model.md#secrets-model). Business-dashboard accounts
should use controlled business credentials rather than shared personal accounts where supported.
Exact provider credential names and rotation runbooks remain implementation decisions.

## Administrative Authority

**Kitchen Operator** may view an assigned courier summary, verify pickup, and record package handoff.
Must not select arbitrary providers, change provider cost, mark delivery complete, view unrelated
customer information, or access another outlet's delivery.

**Delivery Coordinator** may create or recover delivery requests, select an approved fallback
provider, assign an approved local courier, view necessary customer delivery data, record manual
progression, manage delivery exceptions, request a return, and reconcile routine delivery references.

**Outlet Manager** may override dispatch strategy within authority, approve an exceptional provider
switch, approve manual completion where delegated, review delays, approve cost variance within
authority, and manage blocking delivery exceptions.

**Finance Administrator** may review provider invoices, reconcile delivery costs, review duplicate or
unexpected charges, and review claims and financial adjustments.

**Platform Administrator** may manage technical integration. Technical access must not automatically
grant delivery-cost approval or routine manual completion authority. This extends the
role-minimization and scoped-permission model already locked in
[ADR-005](./ADR-005-organization-outlet-authorization.md#v1-system-roles).

## Delivery Timers

Track at least acceptance-to-dispatch duration, courier-search duration, courier-assignment
duration, courier travel to outlet, courier waiting at outlet, ready-to-pickup delay,
pickup-to-dropoff duration, customer waiting duration, return duration, and total provider duration.
Potential thresholds:

```text
COURIER_ASSIGNMENT_WARNING
COURIER_ASSIGNMENT_BREACH
COURIER_PICKUP_WARNING
COURIER_PICKUP_BREACH
CUSTOMER_DELIVERY_WARNING
CUSTOMER_DELIVERY_BREACH
RETURN_WARNING
RETURN_BREACH
```

A timer breach should raise an exception, create an escalation, update metrics, and notify
responsible operations roles. It must not silently mark delivery failed, delivery complete, order
cancelled, or refund successful, consistent with the timer-escalation principle already locked in
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#timer-escalation). Exact durations remain
open.

## Notifications Boundary

Delivery emits committed domain events. The Notifications module may communicate finding delivery
partner, courier assigned, courier reaching outlet, order picked up, out for delivery, arriving soon,
delivered, delivery delayed, customer action required, delivery failed, return initiated, and refund
or support follow-up. Provider callback processing commits before notification. Notification failure
does not roll back delivery state. Duplicate provider events must not create uncontrolled duplicate
messages. Provider-generated SMS or calls may coexist. Provider communication does not replace BOBA
Bear's authoritative delivery tracking, extending the notifications boundary already locked in
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#notifications-boundary). Exact templates
and cadence remain for the Notifications architecture slice.

## Provider-Outage Behaviour

When the primary provider is unavailable: do not create uncontrolled duplicate bookings; preserve the
prepared-order state; raise a delivery exception; attempt only an already approved fallback mode;
inform the customer when delay becomes material; record provider cancellation cost where applicable;
do not silently change the customer delivery charge; use the approved commercial cancellation process
if fulfilment ultimately fails; and reconcile uncertain provider calls. A fallback provider or manual
mode must already be approved and configured before use.

## Audit Requirements

Audit events are required for: delivery-quote selection; delivery-request creation; provider booking;
provider switch; courier assignment; courier reassignment; pickup-verification attempt; pickup
confirmation; package handoff; manual status update; delivery confirmation; manual completion;
delivery cancellation; delivery failure; return request; return acceptance; return completion;
provider-cost entry; provider-cost correction; cost reconciliation; provider claim; sensitive
customer-data access; delivery-account configuration change; and provider credential rotation. Audit
context should conceptually include actor or service identity, customer where relevant, order,
outlet, delivery request, provider, courier assignment, previous state, resulting state, amount where
relevant, reason, approval, correlation identifier, and timestamp, extending the general audit
requirement already locked in
[`architecture-foundation.md`](../architecture-foundation.md#audit-requirements).

## Metrics and Alerts

Track at least quote success rate, delivery-request success rate, courier assignment rate,
courier-search duration, assignment duration, courier arrival duration, courier waiting duration,
pickup duration, delivery duration, delivered rate, failed-delivery rate, return rate, provider
cancellation rate, customer-unavailable rate, provider-cost variance, manual-dispatch rate,
manual-completion rate, missing-proof rate, callback delay, provider-state mismatch count, and
duplicate-booking count. Alert on no courier availability, provider API outage, callback failure,
assignment backlog, excessive courier wait, delivery delay, missing proof, return delay, duplicate
booking, unexpected cost variance, reconciliation backlog, and provider-state mismatch. The exact
observability provider remains open.

## Testing Requirements

**Unit tests** must eventually cover: provider-status normalization; valid delivery transitions;
invalid backward transitions; dispatch-policy selection; delivery-request idempotency;
provider-switch eligibility; pickup-code validation; delivery OTP validation; proof-of-delivery
acceptance; manual-completion authority; return-state transitions; delivery-cost reconciliation;
customer tracking projection; and provider-failure normalization.

**Integration tests** must eventually cover: a paid and accepted order creates one delivery request;
a rejected order creates no delivery request; a provider timeout does not create a duplicate booking;
courier assignment updates the correct outlet order; courier reassignment preserves history; pickup
requires valid verification; handoff updates Operations and Delivery consistently; a duplicate pickup
callback produces one effect; a valid signed callback is accepted; an invalid callback is rejected; an
out-of-order event does not reverse a delivered state; a delivered event completes the commercial
order once; a manual local-rider flow completes through authorized commands; a failed delivery enters
explicit resolution; a return reaches the configured return outlet; returned food is not restored to
saleable stock automatically; provider cost does not rewrite the customer delivery charge; emergency
manual completion is audited; and a staging callback cannot affect production.

**Concurrency and invariant tests** must establish: one order has at most one active delivery booking
unless a replacement workflow is explicit; one delivery-request idempotency key creates one booking;
one courier pickup creates one handoff; one delivered event creates one completion; an order cannot be
delivered before pickup; a cancelled delivery cannot become active without a new request; a returned
order cannot remain customer-delivered; a customer cannot view another customer's courier tracking;
provider cost may change without mutating the customer-charge snapshot; duplicate events do not
duplicate notifications, metrics, handoff, or completion; provider switching after pickup is
prohibited; and cross-outlet delivery mutation is prohibited.

The exact testing framework remains governed by
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#testing-structure).

## Explicitly Deferred Capabilities

Outside V1: dynamic multi-provider bidding; automatic cheapest-provider selection; customer provider
selection; customer rider tipping; cash collection; cash on delivery; a rider mobile application; a
BOBA Bear-owned fleet management system; rider payroll; a full driver KYC platform; route
optimization; multi-drop delivery; batched orders; scheduled delivery; customer rescheduling after
pickup; mandatory photo proof for every order; automated provider claims; advanced delivery-fraud
detection; delivery-insurance automation; cross-outlet rider pooling; and offline delivery
progression.

## Consequences

### Positive

- A provider-neutral Delivery module with three approved operating modes lets BOBA Bear launch
  Dehradun delivery through whichever combination of API, dashboard, or controlled manual dispatch
  actually proves available, without committing to an unvalidated provider or rewriting the domain
  model once a provider is confirmed.
- Separating delivery quote, request, provider booking, courier assignment, proof, return, and cost
  reconciliation into distinct records prevents an overloaded delivery-status field from becoming
  unauditable as more providers and outlets are added.
- Idempotent delivery-request creation and explicit provider-timeout recovery prevent duplicate
  bookings, duplicate couriers, and duplicate provider charges regardless of which provider is used.
- Preparation-aware dispatch timing, tied to verified payment and outlet acceptance, reduces courier
  waiting, food waiting, and provider cost for orders that are ultimately rejected.
- Pickup verification, coordinated Operations/Delivery handoff, and provider-neutral proof of
  delivery close the gap between "an order was accepted" and "the order was actually and verifiably
  delivered," which the public order number alone cannot provide.
- Separating customer delivery charge from provider cost, with mandatory reconciliation, prevents a
  provider-cost change from silently altering what the customer was charged or hiding a
  merchant-funded subsidy.

### Trade-offs accepted

- Supporting three operating modes, a normalized lifecycle, idempotent requests, and durable provider
  events adds implementation complexity beyond a single delivery-status field, accepted because
  Dehradun's actual provider capability is not yet known and the architecture must not assume API
  availability that may not exist.
- Controlled manual dispatch and manual proof-of-delivery confirmation add outlet and delivery-staff
  workload compared to a fully automated flow, accepted as the realistic fallback until a validated
  provider relationship exists.
- Deferring dynamic multi-provider bidding, automatic cheapest-provider selection, and a rider mobile
  application keeps V1 scoped to what a single validated provider or manual fallback actually
  requires, rather than building capability for a provider ecosystem BOBA Bear has not yet validated.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| A provider is treated as production-approved before commercial and technical validation completes | Rapido and every other candidate are explicitly non-approved until validated, per [Provider-Selection and Launch-Validation Boundary](#provider-selection-and-launch-validation-boundary) |
| A checkout delivery quote is mistaken for an actual courier booking | Checkout quote and actual dispatch are explicitly separated, with dispatch gated on verified payment and outlet acceptance, per [Checkout Quote Versus Actual Dispatch](#checkout-quote-versus-actual-dispatch) |
| A provider timeout creates a duplicate booking, courier, or charge | Provider-timeout recovery requires confirming the earlier booking's outcome before creating a replacement, per [Provider-Timeout Recovery](#provider-timeout-recovery) |
| Two active couriers are assigned to one order | One active booking is enforced by default, with an explicit, audited replacement workflow only, per [One Active Booking by Default](#one-active-booking-by-default) |
| A courier collects an order using only the public order number | Pickup verification requires a bound, single-use code or another approved method, per [Pickup Verification](#pickup-verification) |
| A provider "delivered" callback is trusted without proof | Delivery confirmation requires an accepted proof method under the configured provider-trust and proof policy, per [Delivery Confirmation](#delivery-confirmation) |
| A duplicate or out-of-order provider event reverses a delivered order or repeats completion | Terminal `DELIVERED` cannot be reversed by an older event, and completion is idempotent, per [Duplicate and Out-of-Order Events](#duplicate-and-out-of-order-events) and [Delivery-Driven Commercial Completion](#delivery-driven-commercial-completion) |
| Provider cost silently rewrites the customer delivery charge | Provider cost and customer delivery charge are locked as separate values that reconciliation compares but never overwrites each other, per [Provider Cost and Customer Charge Separation](#provider-cost-and-customer-charge-separation) |
| Returned food is placed back into saleable stock without review | An explicit return outcome (disposed, quality review, safe internal handling, or another approved outcome) is required, per [Returned-Food Handling](#returned-food-handling) |
| A provider outage triggers uncontrolled duplicate bookings across multiple providers | Only an already-approved fallback mode may be attempted, and uncertain provider calls are reconciled rather than retried blindly, per [Provider-Outage Behaviour](#provider-outage-behaviour) |

## Explicit Non-Decisions

This decision does not resolve the following, which remain **Open** and must not be treated as
answered by this ADR:

- Final Dehradun delivery provider
- Rapido partnership availability
- Rapido API availability
- Food-delivery suitability of any candidate provider
- Provider commercial rates
- Provider support model
- Provider service-level commitments
- Exact provider API version
- Exact callback contract
- Exact signature-verification model
- Exact delivery-account schema
- Exact dispatch lead time
- Exact automatic-versus-manual dispatch policy by provider
- Exact provider-selection fallback order
- Exact pickup-verification method
- Exact pickup-code length and expiry
- Exact proof-of-delivery policy
- Exact delivery-OTP length and expiry
- Exact manual-completion approval
- Exact customer-unavailable contact attempts
- Exact waiting duration
- Exact return policy
- Exact disposal and quality-review procedure
- Exact provider-cost variance tolerance
- Exact manual-cost approval threshold
- Exact provider-claim workflow
- Exact callback-payload retention
- Exact rider-data retention
- Exact live-location implementation
- Exact credential rotation procedure
- Exact observability provider
- Exact delivery timers
- Exact provider-outage escalation policy

## Rejected and Deferred Alternatives

- **Hard-coding Rapido as the production provider without validation** — rejected.
- **Assuming a public Rapido API exists** — rejected.
- **Direct provider SDK usage across business modules** — rejected.
- **Checkout quote dispatching a courier** — rejected.
- **Dispatch before payment or outlet acceptance** — rejected.
- **Duplicate provider booking after an uncertain timeout** — rejected.
- **Multiple active courier bookings by default** — rejected.
- **Public order number as pickup authorization** — rejected.
- **Provider callback as unverified authority** — rejected.
- **Courier-delivered click without proof policy** — rejected.
- **Delivery cancellation treated as commercial cancellation** — rejected.
- **Returned food restored to saleable stock automatically** — rejected.
- **Provider cost overwriting customer delivery charge** — rejected.
- **Dynamic multi-provider bidding** — deferred.
- **Customer provider selection** — deferred.
- **BOBA Bear-owned fleet and rider application** — deferred.

## Cross-Reference: ADR-013 Delivery Persistence

[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#shared-idempotency-persistence)
fixes how delivery state is stored. Delivery requests use the shared database idempotency record and
versioned delivery aggregates, so a retried dispatch never creates a second delivery job against a
provider. Delivery provider events are a Delivery-owned table following the shared provider-event
convention, unique per provider, provider account, and environment, per
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#provider-event-storage). Handoff
state changes and the outbox events they emit commit atomically, so a handoff is never recorded
without its downstream effects. Delivery-provider costs are stored using the approved monetary
representation — integer paise for final amounts — per
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#monetary-persistence).

## Related Canonical Documents

- [`architecture-foundation.md`](../architecture-foundation.md) — the modular-monolith principle,
  transactional outbox, Delivery module reference, and general audit requirement this decision
  implements in detail.
- [ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md) — the persistence decision that
  fixes delivery idempotency, versioning, provider-event storage, and provider-cost storage for this
  ADR, per the cross-reference above.
- [`order-payment-delivery-model.md`](../order-payment-delivery-model.md) — the delivery model,
  delivery-charge/provider-cost separation, and illustrative delivery-state list this decision
  replaces with a fixed provider-abstraction, dispatch, and fulfilment architecture.
- [`operating-model.md`](../operating-model.md) — the day-to-day delivery-coordination reality this
  decision fixes in full detail.
- [ADR-003](./ADR-003-modular-monolith-node-typescript.md) — the module boundaries, dependency
  rules, and transactional-outbox model the Delivery module must follow.
- [ADR-005](./ADR-005-organization-outlet-authorization.md) — the scoped, permission-based
  authorization, data-minimization, and audit decision this ADR's administrative-authority and
  customer-data-minimization sections build on.
- [ADR-007](./ADR-007-pricing-tax-charges-promotions.md) — the customer delivery-charge, delivery
  quote, and delivery-provider-cost separation decision this ADR's cost-reconciliation model
  extends.
- [ADR-008](./ADR-008-serviceability-cart-checkout.md) — the checkout delivery-quote and
  serviceability-versus-delivery-quoting separation decision this ADR's checkout-quote-versus-dispatch
  section builds on.
- [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md) — the verified-payment,
  settlement-separation, and refund decision this ADR's dispatch-timing and delivery-driven-completion
  sections depend on.
- [ADR-010](./ADR-010-order-lifecycle-operations-console.md) — the commercial and fulfilment
  lifecycle, payment-release, coordinated-handoff, and delivery-driven-completion decision this ADR
  completes with full delivery-provider, dispatch, and fulfilment detail.
- [`v1-product-scope.md`](../v1-product-scope.md) — the V1 delivery-tracking, courier-assignment, and
  proof-of-delivery experience this decision must support.
- [`organization-outlet-access-model.md`](../organization-outlet-access-model.md) — the outlet,
  organization, and legal-entity entities delivery-account ownership is drawn from.
- [ADR-014](./ADR-014-http-api-route-handlers-contracts.md) — the HTTP API decision whose
  provider-webhook boundary this ADR's provider-callback and provider-event ingestion sections are
  exposed through.
- [ADR-015](./ADR-015-configuration-secrets-feature-flags.md) — the configuration and secrets
  decision that fixes how delivery-provider credentials are classified, referenced, and rotated, and
  how the delivery kill switch stops new bookings without abandoning active deliveries.
- [`roadmap-and-open-decisions.md`](../roadmap-and-open-decisions.md) — the open decisions this ADR
  does not resolve.
- [`decision-register.md`](../decision-register.md) — the structured register entries this ADR locks.
- [`README.md`](../README.md) — the canonical documentation index and update protocol.
