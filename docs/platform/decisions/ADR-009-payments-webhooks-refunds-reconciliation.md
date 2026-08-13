---
Status: AMENDED
Governance status: AMENDED
Cashfree V1 provider / Hosted Checkout selection superseded by: D-361
Provider-neutral Payment architecture: REMAINS CURRENT (accepted IMP-022)
Decision date: 2026-08-02
Last updated: 2026-08-13
---

# ADR-009: Payments, Webhooks, Refunds, and Reconciliation

## Status

**AMENDED** (2026-08-13).

- **Cashfree Payment Gateway / Cashfree Hosted Checkout as current V1 provider and collection
  surface** is **SUPERSEDED** by **[D-361](../decision-register.md)**: Razorpay is the V1 production
  payment provider and Razorpay Standard Checkout is the V1 customer payment collection surface.
  Razorpay-specific production architecture is governed by D-361 and
  [`../capabilities/IMP-026-razorpay-productionization.md`](../capabilities/IMP-026-razorpay-productionization.md).
  **[D-362](../decision-register.md)** amends D-361 only for Razorpay webhook acknowledgement
  (HTTP 2xx after durable Payment acceptance; Order materialization outside provider-ack path;
  missing-Order recovery via existing `recoverMissingOrdersBatch`). D-361 remains CURRENT for
  provider selection.
- **Provider-neutral Payment domain**, webhook / query / provider-evidence principles, refund domain
  intent, and reconciliation requirements in this ADR **remain accepted** where aligned with
  accepted IMP-022 and later CURRENT decisions. They are not rewritten as though Razorpay was always
  selected.
- Refund implementation remains **IMP-027**. IMP-026 current meaning is Razorpay productionization &
  Payment GTM readiness, not Cashfree.

This ADR body is preserved as historical rationale for the original Cashfree selection and the
provider-neutral Payment architecture. Do not read Cashfree-specific provider-selection prose below
as current V1 provider authority.

## Decision Date

2026-08-02

## Decision Owners

BOBA Bear founder and product leadership

## Context

[ADR-008](./ADR-008-serviceability-cart-checkout.md) fixed the checkout-orchestration architecture
and established that Checkout creates exactly one idempotent pre-payment order, in a
`PENDING_PAYMENT` state, before handing the order to the Payments module — with all required
internal state, including a transactional outbox event, committed in one PostgreSQL transaction
before any external payment-provider call — and explicitly deferred detailed payment execution and
payment-provider behaviour to this ADR.
[ADR-007](./ADR-007-pricing-tax-charges-promotions.md) fixed the immutable pricing quote and
immutable order monetary snapshot that a payment must collect against, and the principle that
refunds reuse the original order's price, discount, and tax allocations rather than recalculating
them under current policy.
[`order-payment-delivery-model.md`](../order-payment-delivery-model.md) locked payment-integrity
principles — server-side verification, idempotent webhooks, no client-trusted "paid" state, and
separate payment/order state domains — without selecting a payment gateway or fixing the payment,
webhook, refund, or reconciliation architecture in detail.
[ADR-005](./ADR-005-organization-outlet-authorization.md) fixed refund approval as a scoped,
permission-gated action, and [ADR-004](./ADR-004-identity-authentication-sessions.md) fixed
step-up authentication for sensitive actions and the boundary between human and service identities.

None of the documents above select a payment provider, fix the payment-intent and payment-attempt
domain model, fix how a Cashfree provider order is created after internal commit, fix how a
provider-call timeout is safely recovered without duplicate charges, fix how a webhook is verified
and durably ingested exactly once, fix how a duplicate, late, or mismatched payment success is
handled, fix the refund domain model and its idempotency, fix how settlement and dispute events are
ingested and reconciled, or fix the credential, data-minimization, administrative-authority, audit,
and observability requirements around all of the above. This ADR resolves the payment-provider
selection and launch-validation boundary, the V1 payment-method set, the immediate-capture model,
payment-account ownership, the provider-neutral Payments-module boundary, the payment-intent and
payment-attempt domain model and lifecycles, provider-order creation timing and timeout recovery,
the Hosted Checkout and browser-result boundary, the sources-of-payment-truth precedence, webhook
endpoints and signature verification, durable and idempotent webhook ingestion, the
webhook-processing transaction, first-success-wins and duplicate-success review, mismatch handling,
the customer return experience, retry and expiry rules, late-success handling, status polling and
scheduled reconciliation, the payment/settlement separation, the refund domain model and lifecycle,
refund validation and idempotency, refund reconciliation, automatic-versus-manual refund policy,
emergency dashboard-refund handling, dispute ingestion, failure normalization, provider-outage
behaviour, credential controls, data minimization, administrative authority, audit requirements,
operational metrics and alerts, and required future test coverage — so that the Payments module
referenced in [ADR-003](./ADR-003-modular-monolith-node-typescript.md#initial-module-boundaries) can
be implemented against a fixed foundation rather than ad hoc, per-change decisions.

This ADR is a documentation-only architecture decision. It does not install Cashfree, create
payment routes or webhooks, modify checkout code, add refund APIs, or configure provider
credentials.

## Provider-Selection and Launch-Validation Boundary

This ADR distinguishes three categories of content, and no reader should collapse them:

1. **Approved platform architecture** — the Payments module's domain model, payment-intent and
   payment-attempt lifecycles, provider-order creation and timeout-recovery model, webhook
   ingestion and idempotency rules, sources-of-payment-truth precedence, refund domain model and
   lifecycle, reconciliation requirements, credential controls, and audit and observability
   requirements. These are Locked architectural decisions and apply regardless of which payment
   provider is in use.
2. **Approved V1 payment provider** — **Cashfree Payment Gateway with Cashfree Hosted Checkout**,
   selected as the primary provider for V1 subject to the launch-readiness validation conditions
   below. Cashfree is not yet production-approved by this ADR alone.
3. **Provider-implementation detail** — Cashfree API versions, SDK usage, exact request/response
   shapes, and other detail that may change over time with Cashfree's own product evolution. This
   detail must remain implementation-pinned against current official Cashfree documentation at
   build time, not permanently embedded in this ADR as an unversioned assumption.

Where this ADR records Cashfree capabilities or implementation assumptions — Hosted Checkout,
server-side provider-order creation, payment-session creation, idempotency-key support, payment-order
status queries, multiple payment attempts, payment webhook verification, duplicate webhook delivery,
refund creation and status, settlement events, dispute events, and sandbox/production separation —
those assumptions must be verified against current official Cashfree documentation at
implementation time, not against blogs, community posts, unofficial tutorials, AI-generated
summaries, or third-party payment-comparison pages. This ADR records the resulting architecture
decisions; it does not reproduce provider documentation.

## Decision Summary

> **Governance note (2026-08-13):** The Cashfree V1 provider / Hosted Checkout selection in this
> summary is **SUPERSEDED** by [D-361](../decision-register.md). Preserve the text below as
> historical rationale. Current V1 provider is **Razorpay** with **Razorpay Standard Checkout**.
> Provider-neutral Payments-module boundary, verified server-side evidence, webhook/query
> precedence, and refund-intent remainder remain binding.

BOBA Bear will use **Cashfree Payment Gateway with Cashfree Hosted Checkout** as the primary V1
payment provider, integrated behind a **provider-neutral Payments module** so that Checkout, Orders,
Pricing, Customers, Operations, Delivery, Notifications, and Audit never depend on Cashfree-specific
concepts directly:

```text
BOBA Bear pre-payment order
        ↓
Payments module
        ↓
Cashfree infrastructure adapter
        ↓
Cashfree provider order and payment session
        ↓
Cashfree Hosted Checkout
        ↓
Verified webhook or authenticated server status query
        ↓
BOBA Bear payment-state transition
```

Cashfree is approved for V1 subject to launch-readiness validation — merchant onboarding, legal-entity
verification, GST and bank-account verification, sandbox behaviour, production-domain approval,
Hosted Checkout behaviour, webhook delivery, signature verification, refund capability, settlement
reporting, support responsiveness, commercial pricing, contract terms, data-processing terms,
transaction success rates, and production reconciliation capability. These are launch-validation
requirements, not completed by this documentation slice. If Cashfree cannot meet launch
requirements, this provider-neutral architecture permits a future replacement provider through a
separate approved decision, without redesigning any of the modules listed above.

V1 enables UPI, domestic credit cards, domestic debit cards, and net banking; wallets may be enabled
later through provider configuration after business review; international cards, EMI, cardless EMI,
Buy Now Pay Later, recurring mandates, subscriptions, saved cards, cash on delivery, pay at counter,
BOBA Bear wallet balance, stored-value accounts, and offline payment acceptance are disabled or
deferred. V1 uses **immediate capture** — a verified successful payment is required before an order
becomes eligible for kitchen workflow; separate authorization/capture, delayed capture, manual
capture, and card pre-authorization are deferred. A payment account belongs to a selling legal
entity, resolved from trusted server-side outlet and legal-entity context, never selected by the
browser or customer; the initial COCO launch uses one BOBA Bear selling legal entity, one production
Cashfree merchant account, one separate sandbox/test environment, and separate staging/production
credentials and webhook endpoints and secrets.

The Payments module tracks three separate internal record types: a **payment intent** (the amount
BOBA Bear intends to collect for one immutable pre-payment order, normally one per order), a
**provider order** (the Cashfree-side order or session container, one per payment intent), and one
or more **payment attempts** (one per customer attempt to pay). A payment intent moves through a
lifecycle from `CREATED` through session creation, customer action, processing, and a terminal state
of `SUCCEEDED`, `FAILED`, `EXPIRED`, `CANCELLED`, or `REVIEW_REQUIRED`. Provider-order creation
occurs only after the internal PostgreSQL transaction backing checkout confirmation has committed,
never inside that transaction; the web request attempts provider-order creation synchronously for a
responsive customer journey, with the transactional outbox and a recovery worker providing durable
recovery on timeout, crash, or lost response — using the same internal payment intent, the same
provider-safe order reference, and the same provider idempotency key, never creating a duplicate
provider order merely because an earlier response was uncertain.

The browser never receives Cashfree secrets and never determines payment success on its own: browser
redirects, Hosted Checkout client results, and query-string status are customer-experience signals
only. Payment success requires verified server-side evidence, in this order of precedence: a
verified and accepted Cashfree webhook; an authenticated server-to-server Cashfree status query;
settlement or reconciliation evidence; with browser return used only as a trigger for server
verification. Webhook endpoints use HTTPS, verify the Cashfree signature before accepting an event,
persist a durable provider-event record, deduplicate repeated events, and process business effects
transactionally and idempotently — one provider payment ID is processed at most once for each
relevant terminal transition, and duplicate, out-of-order, or delayed events must never duplicate
order activation, promotion redemption, notification, refund, audit event, or kitchen release. The
first valid verified successful payment for a payment intent is the accepted payment; a second
successful charge enters `DUPLICATE_SUCCESS_REVIEW`; amount, currency, account, or environment
mismatches enter `REVIEW_REQUIRED` and must not activate kitchen processing. Late successful payments
are never discarded — they either safely activate an order that remains fulfillable, or enter review.
Authenticated status polling and scheduled reconciliation (frequent for pending payments, daily for
completeness) recover from delayed webhooks, timed-out provider calls, and processing failures.
Payment success and settlement are separate: an order may proceed to kitchen work on verified payment
success without waiting for settlement, and settlement mismatches create finance reconciliation work
rather than rewriting the original payment outcome.

Refunds exist as BOBA Bear internal domain records — requested, subject to approval policy, submitted
to Cashfree idempotently, tracked asynchronously, reconciled, and communicated to the customer —
supporting full refunds, partial refunds, and multiple partial refunds that never exceed the
remaining refundable amount, and always reusing the original order's price, discount, and tax
allocations under [ADR-007](./ADR-007-pricing-tax-charges-promotions.md#cancellation-and-refund-allocation)
rather than recalculating them. Cancellation before an accepted payment success may expire or cancel
the payment intent; cancellation after accepted success requires the separate refund workflow.
Emergency Cashfree-dashboard refunds are detected, reconciled, linked, audited, and reflected in
customer status. Disputes and chargebacks are durably ingested, linked, and routed to operations or
finance review; automated evidence submission and dispute-response management are deferred. Provider
failures are normalized into safe internal categories with the original provider code retained
internally; customer messaging never exposes raw provider diagnostics. Credentials are separate for
staging and production, stored as encrypted DigitalOcean runtime secrets, excluded from logs and
client bundles, and independently rotatable for payment and webhook secrets. Payment data is
minimized to what order confirmation, refund, reconciliation, support, financial reporting,
security, audit, and settlement matching require — full card numbers, CVV, UPI PINs, net-banking
passwords, and other sensitive authentication data are never stored or logged. Audit events are
required across the payment, refund, settlement, and dispute lifecycle, and operational metrics and
alerts must cover payment success rate, webhook health, review backlog, refund health, and
settlement mismatches.

This is an accepted, final decision for BOBA Bear's payment-provider, payment-execution,
webhook, refund, and reconciliation domain architecture — not a recommendation or a provisional
option, except where a specific item is explicitly marked provisional or open below. It fixes the
V1 provider selection and launch-validation boundary, the Payments-module domain boundaries, the
payment-intent and payment-attempt lifecycles, the provider-order creation and timeout-recovery
model, the sources-of-payment-truth precedence, the webhook ingestion and idempotency model, the
refund domain model and lifecycle, and the credential, data-minimization, audit, and observability
requirements. It does not fix the exact Cashfree API version, exact payment or refund expiry
durations, exact reconciliation cadence, exact automatic-refund rules, exact refund approval limits,
or several other implementation and commercial details — see
[Explicit Non-Decisions](#explicit-non-decisions).

## Approved Conceptual Flow

```text
BOBA Bear pre-payment order
        ↓
Payments module
        ↓
Cashfree infrastructure adapter
        ↓
Cashfree provider order and payment session
        ↓
Cashfree Hosted Checkout
        ↓
Verified webhook or authenticated server status query
        ↓
BOBA Bear payment-state transition
```

Cashfree is approved for V1 subject to the launch-readiness validation conditions in
[Production-Approval Conditions](#production-approval-conditions) below. The architecture must
remain provider-neutral at the application boundary — Checkout, Orders, Pricing, Customers,
Operations, Delivery, Notifications, and Audit must not require redesign if a future provider is
introduced. A second payment provider is not implemented in V1 merely for speculative redundancy.

## Production-Approval Conditions

Cashfree becomes production-approved only after BOBA Bear validates: merchant onboarding for the
selling legal entity; legal-entity verification; GST and bank-account verification where required;
supported approved payment methods; sandbox behaviour; production-domain approval; Hosted Checkout
behaviour; webhook delivery; signature verification; refund capability; settlement reporting;
support responsiveness; commercial pricing; contract terms; data-processing terms; actual
transaction success rates; and production reconciliation capability. These are launch-validation
requirements, not completed by this documentation slice. If Cashfree cannot meet launch
requirements, the provider-neutral architecture permits a future replacement provider through a
separate approved decision.

## V1 Payment Methods

Enabled initially: `UPI`, `DOMESTIC_CREDIT_CARD`, `DOMESTIC_DEBIT_CARD`, `NET_BANKING`. Wallets may
be enabled later through provider configuration after business review. Disabled or deferred for V1:
international cards, EMI, cardless EMI, Buy Now Pay Later, recurring mandates, subscription
payments, saved cards, cash on delivery, pay at counter, BOBA Bear wallet balance, stored-value
accounts, and offline payment acceptance. The customer interface must expose only approved methods.
Provider support for a method does not automatically make it a BOBA Bear product requirement.

## Immediate-Capture Model

V1 uses immediate capture:

```text
Customer completes payment
        ↓
Provider confirms successful payment
        ↓
BOBA Bear accepts verified payment
        ↓
Order becomes eligible for kitchen workflow
```

Separate authorization and capture, delayed capture, manual capture, and card pre-authorization are
not introduced in V1; they remain deferred unless a future business process requires them.

## Payment-Account Ownership

A payment-provider account belongs to a selling legal entity:

```text
Outlet
    ↓
Selling legal entity
    ↓
Payment account
    ↓
Cashfree merchant credentials
```

For the initial COCO launch: one BOBA Bear selling legal entity, one production Cashfree merchant
account, one separate sandbox or test environment, separate staging and production credentials, and
separate staging and production webhook endpoints and secrets. Future franchise outlets may use
different legal entities, merchant accounts, bank accounts, settlement ownership, credentials, and
refund authority, consistent with the legal-entity concept already locked in
[`organization-outlet-access-model.md`](../organization-outlet-access-model.md#legal-entity). The
payment account must be resolved from trusted server-side outlet and legal-entity context; the
browser or customer must never select the merchant account.

## Provider-Neutral Payments Boundary

The Payments module exposes provider-neutral application capabilities conceptually similar to:

```text
createPaymentSession()
fetchPaymentStatus()
verifyWebhook()
acceptProviderEvent()
processPaymentEvent()
initiateRefund()
fetchRefundStatus()
reconcilePayment()
reconcileRefund()
ingestSettlement()
ingestDispute()
```

Exact function names and API shapes remain open. Provider-specific concepts — Cashfree order ID,
payment-session ID, Cashfree payment ID, Cashfree refund ID, Cashfree webhook signature, and
Cashfree event payloads — belong inside the Cashfree infrastructure adapter, provider-reference
records, and provider-event records. Application modules must not import Cashfree SDKs directly,
consistent with the module dependency rules already locked in
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#dependency-rules).

## Payment Concepts

The following record types remain distinct and must not be merged:

**Payment intent** — the amount BOBA Bear intends to collect for one immutable pre-payment order.
Conceptual fields: internal identifier, BOBA Bear order, payment account, amount, currency,
customer, provider, lifecycle state, creation time, expiry, accepted successful attempt, and audit
metadata. There is normally one payment intent per immutable pre-payment order, consistent with the
pre-payment order fixed by
[ADR-008](./ADR-008-serviceability-cart-checkout.md#pre-payment-order-creation).

**Provider order** — the Cashfree-side order or session container. One BOBA Bear payment intent maps
to one Cashfree provider order.

**Payment attempt** — one customer attempt to pay. Multiple payment attempts may exist under one
payment intent and provider order.

**Provider event** — an inbound webhook or another durable provider-observed status event.

**Refund** — one internal request to return funds from an accepted successful payment.

**Settlement** — the later movement of provider-held funds to the selling legal entity's bank
account. Payment success and settlement are separate concepts.

## Payment-Intent Lifecycle

The Payments module supports a lifecycle conceptually equivalent to:

```text
CREATED
SESSION_CREATION_PENDING
CUSTOMER_ACTION_REQUIRED
PROCESSING
SUCCEEDED
FAILED
EXPIRED
CANCELLED
REVIEW_REQUIRED
```

**Created** — internal intent exists, but provider session creation has not completed.
**Session creation pending** — provider-order or payment-session creation is running or awaiting
recovery. **Customer action required** — Hosted Checkout may be opened by the customer.
**Processing** — a payment attempt exists, but final provider outcome is not yet known.
**Succeeded** — one verified provider payment has been accepted as the payment for the order.
**Failed** — the current attempt failed and no accepted success exists; a retry may remain possible
while the intent is valid. **Expired** — the payment window ended without an accepted success.
**Cancelled** — the payment flow was deliberately ended before success. **Review required** — the
result is late, conflicting, mismatched, duplicated, ambiguous, or operationally unsafe to apply
automatically. Exact state names may be refined during implementation, but this lifecycle
separation is locked.

## Payment-Attempt Lifecycle

Each customer payment attempt is represented separately, supporting a lifecycle conceptually
equivalent to:

```text
INITIATED
PENDING
SUCCEEDED
FAILED
USER_DROPPED
EXPIRED
REVIEW_REQUIRED
```

A payment attempt conceptually records: internal attempt identifier, payment intent, provider
payment identifier, provider order identifier, amount, currency, payment-method category, provider
status, normalized internal status, provider failure code, safe support message, creation time,
completion time, related provider events, and correlation identifier. A failed attempt must not
automatically fail the complete payment intent while another valid attempt may still succeed.

## Provider-Order Creation Timing

Provider-order creation occurs only after [ADR-008](./ADR-008-serviceability-cart-checkout.md) has
committed: checkout confirmation, the pre-payment order, immutable order snapshots, the
payment-intent request, idempotency context, and a transactional outbox event. Approved sequence:

```text
Internal PostgreSQL transaction commits
        ↓
Resolve payment account
        ↓
Create Cashfree provider order
        ↓
Persist provider references
        ↓
Return hosted-checkout payment session
```

External Cashfree calls must never occur inside the long-running order-creation PostgreSQL
transaction, extending the transactional-outbox and internal-transaction-boundary requirements
already locked in
[`architecture-foundation.md`](../architecture-foundation.md#transactional-outbox) and
[ADR-008](./ADR-008-serviceability-cart-checkout.md#internal-transaction-boundary-before-provider-call).

## Provider-Order Creation Requirements

After the internal commit: resolve the payment account from the order's selling legal entity;
confirm order amount and INR currency; build a stable provider-safe order reference; create the
Cashfree provider order server-side; use a stable idempotency key; persist the provider order ID;
persist the payment-session reference; return only the required hosted-checkout information; open
Cashfree Hosted Checkout. Provider-order references must be unique, remain stable across retries,
avoid sensitive customer data, avoid phone numbers or email addresses, be traceable to the internal
payment intent, and not depend on a public sequential order number as a security mechanism.

## Synchronous Creation with Durable Recovery

V1 uses this provider-call model:

```text
Internal transaction commits
        ↓
Web request attempts provider-order creation synchronously
        ↓
Success
    → persist session and return checkout data

Timeout or transient failure
    → transactional-outbox recovery
    → query or retry provider safely
```

The synchronous call supports a responsive customer journey. The outbox and worker provide durable
recovery when: the web process crashes; the Cashfree request times out; the provider returns
transient failure; the provider response is lost; database persistence after provider response is
interrupted; the customer closes the browser; or network connectivity fails. The recovery worker
must use the same internal payment intent, the same provider-safe order reference, and the same
provider idempotency key. It must not create a new provider order merely because the previous
response was uncertain.

## Timeout Recovery

When a provider request times out: do not assume success; do not assume failure; query provider
status using the stable provider reference where supported; retry using the same idempotency key
where appropriate; store the reconciled result; create a replacement provider order only after
confirming the earlier operation did not succeed and cannot safely be reused. This prevents duplicate
provider orders, duplicate payment sessions, duplicate customer charges, and unreconciled provider
resources. The exact retry schedule remains open.

## Hosted Checkout Boundary

The browser may receive only the provider information required to open Hosted Checkout, such as
public environment configuration, the payment-session reference, a return URL, and safe order-display
context. The browser must never receive the Cashfree secret key, webhook secret, refund credentials,
merchant administrative credentials, internal payment-account resolution, or provider credential
metadata. BOBA Bear must never store or log full card numbers, CVV, UPI PIN, net-banking password,
raw payment credentials, or other sensitive payment-authentication data. Saved payment instruments
are not part of V1.

## Browser-Result Boundary

Browser redirects, Hosted Checkout client results, browser success messages, query-string status,
client-side callbacks, and client-side promise resolution are customer-experience signals only. They
must not directly mark a payment or order as successful. After browser return, the BOBA Bear UI
should display a state such as "Checking payment status…" and fetch current payment state from the
BOBA Bear backend. Payment success requires verified server-side evidence.

## Sources of Payment Truth

Precedence:

```text
1. Verified and accepted Cashfree webhook
2. Authenticated server-to-server Cashfree status query
3. Settlement or reconciliation evidence
4. Browser return only as a trigger for server verification
```

Before accepting payment success, BOBA Bear must verify: correct environment; correct payment
account; known provider order; known provider payment; matching BOBA Bear payment intent; matching
internal order; matching amount; matching currency; provider-success state; that the payment has not
already been consumed; that the order has not already accepted another successful payment; and that
no security or legal-entity mismatch exists.

## Webhook Endpoints

Separate webhook endpoints and secrets are used for staging and production. Staging events must
never affect production records; production events must never be accepted through staging
configuration. The architecture may use separate logical webhook routes or handlers for payment
events, refund events, settlement events, and dispute events. Exact route paths remain open.

## Webhook Signature Verification and Acceptance

Every webhook endpoint must: use HTTPS; preserve the raw request body where signature verification
requires it; verify the Cashfree signature before accepting the event; apply timestamp or replay
protection where supported; resolve the payment account and environment; reject invalid signatures;
persist a durable provider-event record; deduplicate repeated events; return a timely success
response after durable acceptance; process broader business effects asynchronously where practical;
and avoid direct external side effects before database commit. Webhook secrets must not appear in
logs.

## Durable Provider-Event Record

A provider-event record conceptually includes: internal identifier, provider, payment account,
environment, provider event identity, provider payment identity where applicable, provider order
identity, event category, event type, signature-verification result, received time, provider event
time, processing state, processing attempts, related payment or refund, safe normalized metadata,
payload retention reference where approved, and correlation identifier. Exact payload-retention and
encryption rules remain open for the privacy architecture.

## Webhook Idempotency and Ordering

Webhook handling must assume duplicate delivery, retry delivery, out-of-order delivery, delayed
delivery, multiple failed attempts, multiple payment attempts under one provider order, payment-event
arrival after browser return, and refund-event replay. Rules: one provider payment ID is processed at
most once for each relevant terminal transition; a duplicate event returns success without repeating
business effects; pending or failed events must not activate the order; only verified success may
confirm payment; out-of-order events must not reverse an accepted terminal success; duplicate webhook
processing must not duplicate order activation, promotion redemption, notification, refund, audit
event, or kitchen release.

## Webhook-Processing Transaction

After signature verification, a payment event is processed transactionally. Approved conceptual
flow:

```text
PostgreSQL transaction
├── insert or resolve provider event
├── deduplicate provider payment ID
├── lock payment intent
├── validate account, order, amount and currency
├── create or update payment attempt
├── transition payment intent
├── transition payment-related order state where allowed
├── consume promotion reservation where applicable
├── record audit event
└── create transactional outbox events
        ↓
commit
        ↓
notifications, operations and kitchen events run asynchronously
```

The webhook processor must not call WhatsApp, the delivery provider, an email provider, kitchen
integrations, or external analytics before the payment-state transaction commits, extending the
transactional-outbox requirement already locked in
[`architecture-foundation.md`](../architecture-foundation.md#transactional-outbox).

## First-Success-Wins

For one payment intent, the first valid verified successful payment becomes the accepted payment;
repeated events for that provider payment remain idempotent. A later successful event from another
provider payment ID is not automatically accepted as additional revenue; a second successful charge
enters `DUPLICATE_SUCCESS_REVIEW`. Excess payment must be reconciled, and refund must be considered
where appropriate. The exact automatic-refund policy for duplicate success remains open.

## Mismatch Handling

A provider-success event must enter `REVIEW_REQUIRED` and must not activate kitchen processing when
amount differs, currency differs, payment account differs, provider order is unknown, provider
payment is already linked elsewhere, payment intent was superseded, the order belongs to another
legal entity, the event belongs to another environment, provider identifiers are inconsistent,
internal order amount cannot be reconciled, or another payment has already been accepted. Mismatch
cases require durable evidence, operations or finance visibility, reconciliation, audit,
customer-safe messaging, and refund where required.

## Customer Return Experience

After Hosted Checkout returns, the customer experience supports: **confirmed success** (payment
successful, BOBA Bear order number, current order status, tracking entry point); **processing**
(payment is being verified, customer should not retry immediately, automatic status refresh, safe
ability to leave and return); **confirmed failure** (payment failed, no accepted charge is
confirmed, retry option where the payment intent remains valid); **review required** (payment is
being checked, customer should not initiate repeated payments, support reference, no promise of
order acceptance until resolution). Customer messages must not expose raw provider diagnostics.

## Payment Retry Policy

A failed attempt may be retried against the same payment intent when order amount, currency, outlet,
and selling legal entity are unchanged; the checkout commercial snapshot remains valid; no successful
payment exists; the intent has not expired; the order has not been cancelled or superseded; and the
outlet can still accept the order. A retry may create another provider payment attempt under the
same Cashfree provider order. A new pre-payment order and payment intent are required when the cart,
amount, currency, outlet, or legal entity changes; the fulfilment context changes materially; the
previous order is cancelled or superseded; or the original commercial snapshot is no longer valid.

## Payment Expiry

Payment expiry must be coordinated with checkout expiry, pricing-quote expiry, delivery-quote
expiry, Cashfree provider-order validity, promotion reservations, outlet operating state, and the
kitchen operating window, consistent with the expiring-decisions model already locked in
[ADR-008](./ADR-008-serviceability-cart-checkout.md#expiring-decisions-and-quotes). When a payment
intent expires: do not accept new customer attempts through the expired session; mark the
pre-payment order as payment-expired; release applicable promotion reservations; preserve the
payment and order records; allow the customer to start a new checkout where appropriate; do not
silently create a replacement order. The exact payment-expiry duration remains open.

## Late Payment Success

A successful provider event may arrive after BOBA Bear marked the payment expired or cancelled. It
must never be discarded. A **potentially acceptable late success** may activate the original order
only if all approved conditions still pass — no replacement order exists, no other payment
succeeded, the original commercial snapshot remains applicable, the outlet can still fulfil, kitchen
acceptance remains operationally safe, and the late-success acceptance window permits it. An
**unsafe or ambiguous late success** moves the payment and order to `PAYMENT_REVIEW_REQUIRED`: do
not release to kitchen; notify operations or support; reconcile provider evidence; decide fulfilment
or refund under approved policy; communicate clearly with the customer; preserve audit evidence. The
exact late-success grace period remains open.

## Status Polling and Recovery

Authenticated server-to-server status queries are used as recovery and verification when the
customer returns before the webhook, the webhook is delayed, provider-order creation timed out, a
payment remains pending unusually long, event processing failed, operations requests verification,
or scheduled reconciliation finds inconsistency. Polling must use backoff, have a maximum active
duration, avoid excessive provider traffic, stop at a terminal state, and hand unresolved cases to
scheduled reconciliation or review. Polling must not replace webhook ingestion as the only normal
mechanism.

## Scheduled Payment Reconciliation

A background reconciliation process detects: payment intents pending beyond expected time;
pre-payment orders without terminal payment outcome; provider-paid orders not paid internally;
internally paid orders lacking provider confirmation; duplicate successful attempts; amount,
currency, or payment-account mismatches; missing webhooks; failed event processing; and stale review
cases. Reconciliation outcomes may include automatic safe correction, review-case creation, alert,
audit event, refund request, or operations notification. V1 includes frequent pending-payment
reconciliation and daily completeness reconciliation. The exact cadence remains open.

## Payment Success and Settlement Separation

```text
Verified payment success
        ↓
Order may enter kitchen workflow
        ↓
Provider settlement occurs later
        ↓
Finance reconciliation
```

Do not wait for settlement before kitchen processing. Do not treat pending settlement as payment
failure. Settlement mismatch does not rewrite original payment success. Settlement issues create
finance reconciliation work.

## Settlement Records

A settlement record conceptually contains: provider, payment account, settlement identifier,
bank-account reference, gross payment amount, refund adjustments, provider fees, tax on provider
fees, other adjustments, net settlement, settlement date, settlement status, provider event or
report reference, reconciliation state, and audit metadata. Full accounting and general-ledger
integration remain deferred. The platform must still retain enough settlement data to detect missing
settlement, short settlement, duplicate settlement, unexpected refund adjustment, unexpected provider
fee, and bank-account mismatch. The exact settlement-import mechanism remains open.

## Order Cancellation and Payment Cancellation

**Before accepted payment success**, order cancellation may cancel or expire the payment intent,
prevent new payment attempts, release promotion reservations, preserve late-success handling,
attempt provider-session expiry where supported, and keep all records auditable. **After accepted
payment success**, payment cannot simply be marked cancelled; order cancellation may result in a
full refund, a partial refund, no refund, or refund review, depending on approved order and
cancellation policy. Exact order-cancellation eligibility remains for a future ARCH-10 decision.

## Refund Architecture

Refunds exist as BOBA Bear internal domain records before provider submission. Approved flow:

```text
Authorized refund request
        ↓
Validate original payment and refundable balance
        ↓
Apply approval policy
        ↓
Create immutable refund record
        ↓
Submit to Cashfree idempotently
        ↓
Track asynchronous provider result
        ↓
Reconcile
        ↓
Notify customer
```

V1 supports full refund, partial refund, and multiple partial refunds. The sum of successful and
processing refunds must not exceed the remaining refundable amount.

## Refund Lifecycle

Refunds support a lifecycle conceptually equivalent to:

```text
REQUESTED
APPROVAL_REQUIRED
APPROVED
SUBMISSION_PENDING
SUBMITTED
PROCESSING
SUCCEEDED
FAILED
CANCELLED
REVIEW_REQUIRED
```

**Requested** — a business workflow requested a refund. **Approval required** — the refund exceeds
actor authority or automatic-policy authority. **Approved** — the refund is authorized but not yet
submitted. **Submission pending** — durable provider-submission work exists. **Submitted** —
provider accepted the refund request. **Processing** — final provider outcome is pending.
**Succeeded** — provider confirmed refund success. **Failed** — provider confirmed failure.
**Cancelled** — the refund was cancelled before completion where permitted. **Review required** —
provider and internal states are ambiguous or inconsistent.

## Refund Validation

Before provider submission, validate: the original payment succeeded; the payment belongs to the
expected legal entity and payment account; the refund amount is positive; currency matches; the
refund does not exceed the remaining refundable amount; target lines are not already fully refunded;
the original pricing snapshot and discount/tax allocation exist; the actor has refund permission;
step-up authentication is complete where required; the monetary approval threshold is satisfied; a
stable idempotency key exists; the refund reason is recorded; and audit context exists. A refund must
not rewrite the original order, original pricing snapshot, original payment, original tax record, or
original discount record, consistent with
[ADR-007](./ADR-007-pricing-tax-charges-promotions.md#original-order-immutability).

## Refund Idempotency

Each internal refund uses one stable provider idempotency key. Retrying the same refund uses the
same key; reuse with a different amount or purpose fails; timeout triggers a status query or
same-key retry; a replacement refund requires a new internal refund record; one provider refund
result is applied once internally. Duplicate refund events must not duplicate customer credit,
refund record, notification, audit event, or monetary allocation. The exact idempotency-key format
remains open.

## Refund Destination and Customer Status

Refunds normally return to the original payment method through Cashfree. Customer-facing refund
states distinguish: refund requested; refund awaiting approval; refund submitted; refund processing;
refund successful; refund failed; bank credit pending after provider success. Immediate bank credit
must not be promised when the provider has only accepted the refund request. The exact displayed SLA
must be validated against current provider and payment-method guidance at implementation time.

## Refund Reconciliation

Refund reconciliation must handle: provider-submission timeout; processing beyond expected duration;
missing refund webhook; amount or currency mismatch; provider failure; customer non-receipt report;
unexpected settlement adjustment; emergency dashboard refund. Store provider references where
available, such as provider refund ID, provider payment ID, provider order ID, ARN or RRN, provider
status, provider failure code, and provider timestamps.

## Automatic Versus Manual Refunds

V1 begins conservatively. Potential future automatic-refund cases include verified duplicate
payment, late success after non-fulfillable expiry, and payment succeeded but order cannot be
accepted before kitchen release. For V1: create a review case where policy is unresolved; apply
approved refund authority; submit through the same Refund module; preserve allocations and audit;
avoid uncontrolled automatic refunds. Exact automatic-refund rules remain open.

## Emergency Dashboard Refunds

Once API-driven refunds are active, manual refunds through the Cashfree dashboard are
emergency-only. Dashboard-only refunds can bypass BOBA Bear refund authorization, original-line
allocation, tax allocation, customer notification, audit, and support workflow. Any emergency
dashboard refund must be detected, imported or reconciled, linked to the original payment and order,
audited, reflected in customer status, and included in settlement reconciliation.

## Disputes and Chargebacks

The platform durably ingests dispute and chargeback events. V1 supports at least provider-event
storage, payment linkage, order linkage, review status, evidence reference, operations or finance
notification, and audit. Full automated evidence submission and dispute-response management are
deferred.

## Payment-Failure Normalization

Provider failures are normalized into safe internal categories such as:

```text
CUSTOMER_CANCELLED
CUSTOMER_DROPPED
INSUFFICIENT_FUNDS
AUTHENTICATION_FAILED
BANK_DECLINED
PROVIDER_UNAVAILABLE
NETWORK_TIMEOUT
SESSION_EXPIRED
RISK_REJECTED
UNKNOWN_FAILURE
```

The original provider code is stored for support and reconciliation. Customer-facing messaging must
not expose raw provider payloads, fraud rules, provider secrets, stack traces, internal account
identifiers, or sensitive bank diagnostics.

## Provider-Outage Behaviour

When Cashfree is unavailable: do not mark payments successful; do not release orders to the
kitchen; do not repeatedly create provider orders; preserve the cart and checkout where still valid;
show payment temporarily unavailable; allow safe retry after recovery; reconcile uncertain calls;
alert operations when thresholds are crossed; avoid uncontrolled failover to an untested provider.
Dynamic multi-provider routing is deferred. A second provider must not be activated during an
incident unless it was already integrated, tested, approved, and operationally ready.

## Credential and Webhook-Secret Controls

Cashfree credentials must be separate for staging and production, stored as encrypted DigitalOcean
runtime secrets, bound to the correct payment account, available only to server-side infrastructure,
rotatable, revocable, excluded from logs, excluded from client bundles, validated during startup, and
protected by least-privilege access controls, consistent with the secrets model already locked in
[ADR-002](./ADR-002-environments-ci-cd-release-model.md#secrets-model). Webhook secrets must be
independently rotatable. Secret rotation should support a controlled overlap period where required
by the provider's process. The exact Cashfree credential names and rotation runbook remain
implementation decisions.

## Payment-Data Minimization

Store only payment information required for order confirmation, refund, reconciliation, customer
support, financial reporting, security, audit, and settlement matching. Potential stored data
includes payment-method category, provider payment ID, provider order ID, amount, currency, status,
limited masked instrument metadata where justified, bank or UPI reference where operationally
required, failure code, provider timestamps, refund references, and settlement references. Do not
store full card numbers, CVV, UPI PIN, net-banking password, raw payment credentials, or sensitive
authentication data. Exact retention and masking rules remain for the privacy architecture slice.

## Payment Administration Authority

**Customer** may initiate payment for their own confirmed order, retry an eligible failed payment,
and view their own payment and refund status. **Support Operator** may, within scope, view
normalized payment state, view safe failure context, request reconciliation, and request refund.
**Refund Approver** may approve refunds within configured monetary authority. **Finance
Administrator** may review provider reconciliation, settlements, mismatches, and refunds, and export
authorized financial records. **Platform Administrator** may manage technical integration and
emergency recovery. Technical access must not automatically grant routine refund authority; payment-
credential access and refund authority remain separate where practical, consistent with the
permission-based, deny-by-default authorization model already locked in
[ADR-005](./ADR-005-organization-outlet-authorization.md#authorization-model).

## Audit Requirements

Audit events are required for: payment-intent creation; provider-order creation; payment-session
creation; payment-attempt creation; payment success; payment failure; payment expiry; late success;
duplicate success; payment mismatch; review transition; manual reconciliation; order activation from
payment; refund request; refund approval; refund submission; refund success; refund failure;
emergency dashboard refund; settlement mismatch; dispute creation; payment-account configuration
change; credential rotation; webhook-signature failure threshold; and manual payment-state override
where ever permitted. Audit context should conceptually include actor or service identity, customer,
order, payment intent, payment attempt, refund, provider references, amount, currency, previous
state, new state, reason, approval, correlation identifier, and timestamp, extending the general
audit requirement already locked in
[`architecture-foundation.md`](../architecture-foundation.md#audit-requirements). Credentials and
sensitive payment data must never appear in audit records.

## Operational Metrics and Alerts

Track at least: payment-session creation success rate; payment success rate; success rate by
payment method; provider API latency; provider API error rate; payment pending duration; webhook
delivery lag; webhook-signature failures; duplicate webhook count; pending reconciliation count;
late-success count; duplicate-success count; amount-mismatch count; refund success rate; refund
processing duration; settlement mismatch count; review backlog. Alert on: sustained provider-order
creation failure; Hosted Checkout failure; webhook absence; webhook-processing backlog;
signature-failure spike; stuck pending payments; stuck refunds; duplicate-success incidents;
increasing review queue; settlement mismatch; reconciliation backlog. The exact observability
provider remains open.

## Required Future Tests

**Unit tests** must eventually cover: payment-intent state transitions; payment-attempt state
normalization; first-success-wins; duplicate-success review; amount mismatch; currency mismatch;
payment-account mismatch; duplicate webhook handling; out-of-order event handling; payment expiry;
late-success decision; refundable-balance calculation; refund approval threshold; refund state
transitions; provider-error normalization; and settlement/payment-state separation.

**Integration tests** must eventually cover: Cashfree sandbox order creation; stable idempotency-key
replay; hosted-checkout session creation; signed webhook verification; invalid signature rejection;
duplicate webhook replay; multiple failed attempts followed by success; browser return before
webhook; provider-status reconciliation; provider-order timeout recovery; one accepted payment
activates one order; pending order remains hidden from kitchen; amount mismatch does not activate
order; full refund; partial refund; multiple partial refunds within captured amount; refund-event
replay; emergency dashboard-refund reconciliation; settlement-event ingestion; dispute-event
ingestion; and staging events cannot affect production.

**Concurrency and invariant tests** must establish: one payment intent accepts at most one
successful payment; one provider payment ID is processed at most once; duplicate events do not
duplicate order activation; duplicate events do not duplicate promotion redemption; duplicate events
do not duplicate refunds; refund total never exceeds captured amount; pending-payment order cannot
become kitchen-visible; provider timeout does not create a second provider order; late payment is
never discarded; mismatched payment cannot activate an order; one refund idempotency key creates at
most one provider refund; settlement status does not rewrite payment success; production credentials
are never used by staging.

The exact test frameworks remain governed by
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#testing-structure).

## Explicitly Deferred Capabilities

Outside V1: second payment provider; automatic provider routing; cash on delivery; pay at counter;
international cards; saved cards; network tokenization; EMI; Buy Now Pay Later; recurring payments;
subscription billing; wallet; gift cards; loyalty balance; split settlement; franchise settlement;
marketplace payment orchestration; payment links as the standard PWA checkout; pre-authorization and
delayed capture; automatic chargeback evidence submission; automatic refund for every late payment;
offline payment acceptance.

## Consequences

### Positive

- A provider-neutral Payments-module boundary lets BOBA Bear adopt Cashfree now while keeping the
  option to replace it later without redesigning Checkout, Orders, Pricing, Customers, Operations,
  Delivery, Notifications, or Audit.
- Separating payment intent, provider order, and payment attempt lets multiple customer attempts
  exist safely under one order without prematurely failing the whole payment or losing attempt
  history.
- Requiring verified server-side evidence — webhook or authenticated status query — before
  accepting payment success removes an entire category of client-trusted-"paid" fraud and
  inconsistent-state risk.
- Committing internal state before any provider call, combined with idempotent provider-order and
  refund operations, prevents duplicate charges and duplicate provider resources on timeout or
  retry.
- Treating payment success and settlement as separate concepts lets the kitchen begin work promptly
  while finance reconciliation happens on its own schedule.

### Trade-offs accepted

- A provider-neutral abstraction, separate payment-intent/provider-order/payment-attempt records,
  and mandatory webhook/reconciliation infrastructure add implementation complexity beyond calling
  Cashfree directly from checkout, accepted because a single-outlet V1 launch must not require a
  later foundational rewrite once a second provider or franchise settlement exists.
- Conservative V1 automatic-refund and duplicate-success policy (review-first rather than
  auto-resolve) adds manual operations work at launch, accepted to avoid uncontrolled automatic
  refunds before real-world failure patterns are understood.
- Treating Cashfree as approved-for-V1-subject-to-validation, rather than production-approved
  outright, requires a distinct launch-readiness validation step before commercial launch.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| A client-trusted browser result marks an order as paid | Payment success requires verified webhook or authenticated server status query, never browser state, per [Sources of Payment Truth](#sources-of-payment-truth) |
| A provider-call timeout causes a duplicate provider order or duplicate charge | Timeout recovery queries provider status and reuses the same idempotency key rather than blindly retrying, per [Timeout Recovery](#timeout-recovery) |
| A duplicate or replayed webhook duplicates order activation, refund, or notification | Durable, deduplicated provider-event records and a transactional webhook-processing flow enforce first-success-wins, per [Webhook Idempotency and Ordering](#webhook-idempotency-and-ordering) and [Webhook-Processing Transaction](#webhook-processing-transaction) |
| A late or ambiguous payment success is silently discarded or silently accepted | Late success either activates the order under strict conditions or enters `PAYMENT_REVIEW_REQUIRED`, per [Late Payment Success](#late-payment-success) |
| A mismatched amount, currency, or account activates kitchen work | Mismatch cases are forced into `REVIEW_REQUIRED` and blocked from kitchen release, per [Mismatch Handling](#mismatch-handling) |
| A refund is submitted twice or exceeds the refundable balance | Stable refund idempotency keys and refundable-balance validation before submission, per [Refund Idempotency](#refund-idempotency) and [Refund Validation](#refund-validation) |
| An emergency Cashfree-dashboard refund bypasses BOBA Bear's audit and allocation | Emergency dashboard refunds must be detected, imported, linked, audited, and reconciled, per [Emergency Dashboard Refunds](#emergency-dashboard-refunds) |
| Staging credentials or webhook events affect production payment records | Separate staging/production credentials, webhook endpoints, and secrets, verified by required integration tests, per [Credential and Webhook-Secret Controls](#credential-and-webhook-secret-controls) |

## Explicit Non-Decisions

This decision does not resolve the following, which remain **Open** or require launch validation,
and must not be treated as answered by this ADR:

- Exact Cashfree API version
- Exact Cashfree SDK usage
- Exact REST-client implementation
- Exact provider-order expiry
- Exact BOBA Bear payment-intent expiry
- Exact late-success grace period
- Exact automatic-refund cases
- Exact duplicate-success refund timing
- Exact refund approval limits
- Exact refund approval roles
- Exact refund SLA messaging
- Exact reconciliation cadence
- Exact polling backoff
- Exact maximum polling duration
- Exact settlement-import method
- Exact dispute workflow
- Exact webhook payload-retention period
- Exact payment-data retention
- Exact masked-instrument fields
- Exact credential rotation procedure
- Exact provider commercial pricing
- Exact provider contract terms
- Exact provider support acceptance criteria
- Exact success-rate launch threshold
- Exact fallback-provider decision
- Exact operations review workflow
- Exact observability provider
- Exact manual payment override policy

## Rejected and Deferred Alternatives

- **Client-trusted "paid" state** — rejected.
- **Payment success determined solely from browser redirect** — rejected.
- **Provider calls inside the internal order-creation transaction** — rejected.
- **Creating a new provider order after every timeout, regardless of uncertainty** — rejected.
- **Discarding late payment success** — rejected.
- **Silently accepting a second successful charge as additional revenue** — rejected.
- **Recalculating refund amounts under current pricing/tax policy** — rejected.
- **Treating Cashfree-dashboard refunds as authoritative without reconciliation** — rejected.
- **Waiting for settlement before releasing an order to the kitchen** — rejected.
- **A second payment provider for V1 redundancy** — deferred.
- **Automatic refunds for every late-success or duplicate-success case** — deferred for V1.
- **Automated dispute-evidence submission** — deferred.
- **Saved payment instruments** — deferred.
- **Separate authorization and capture** — deferred.

## Cross-Reference: Release Into Outlet Operations

This ADR governs the accepted payment itself — the payment-intent and payment-attempt lifecycle,
webhook verification, sources-of-payment-truth precedence, and refund architecture. It does not
govern what happens once a payment is accepted: release into the outlet's fulfilment queue, manual
outlet acceptance, kitchen workflow, and the Operations Console are fixed by
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#payment-release-into-operations). Verified
payment success does not directly execute kitchen work — Operations only creates or activates the
fulfilment workflow after Orders confirms the commercial order inside the same committed transaction
boundary described above, never before it. Duplicate provider events must never duplicate the
fulfilment workflow, extending this ADR's webhook-idempotency requirement to the release step. A
payment in `REVIEW_REQUIRED`, or any payment state other than a verified success, blocks kitchen
release entirely, per
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#payment-release-into-operations).

## Cross-Reference: ADR-013 Payment Persistence

[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#provider-event-storage) fixes the
persistence mechanics behind this ADR. Payment and refund records are PostgreSQL-backed, and the
durable provider-event record required here is a Payments-owned table following the shared
provider-event convention, unique per provider, provider account, and environment — not a shared
platform-wide event table. Payment-success processing relies on database constraints, explicit row
locks, and the shared idempotency record as the final concurrency authority, so that duplicate
webhook deliveries and concurrent verification attempts produce one effect, per
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#shared-idempotency-persistence).
Payment side effects — outlet release, notifications, and dispatch — are emitted through the
transactional outbox rather than called inline, per
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#transactional-outbox-persistence).

## Related Canonical Documents

- [`architecture-foundation.md`](../architecture-foundation.md) — the modular-monolith principle,
  transactional outbox, and Payments module reference this decision implements in detail.
- [ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md) — the persistence decision that
  fixes payment, refund, provider-event, idempotency, and outbox storage for this ADR, per the
  cross-reference above.
- [`order-payment-delivery-model.md`](../order-payment-delivery-model.md) — the payment-integrity
  principles, illustrative payment states, and payment/settlement foundation this decision extends
  with a concrete provider, domain model, and lifecycle.
- [ADR-003](./ADR-003-modular-monolith-node-typescript.md) — the module boundaries, dependency
  rules, and transactional-outbox model the Payments module must follow.
- [ADR-004](./ADR-004-identity-authentication-sessions.md) — the customer-authentication and
  step-up authentication decision that payment initiation and refund approval depend on, and the
  service-identity boundary webhook processors operate under.
- [ADR-005](./ADR-005-organization-outlet-authorization.md) — the scoped, permission-based refund
  approval and payment-account access decision this ADR's administration-authority section builds
  on.
- [ADR-007](./ADR-007-pricing-tax-charges-promotions.md) — the immutable pricing quote, immutable
  order monetary snapshot, and refund-allocation decision this ADR's refund architecture reuses
  rather than recalculates.
- [ADR-008](./ADR-008-serviceability-cart-checkout.md) — the checkout-orchestration,
  pre-payment-order, idempotency, and transactional-boundary decision this ADR's provider-order
  creation and payment-execution model completes.
- [ADR-010](./ADR-010-order-lifecycle-operations-console.md) — the direct-order lifecycle and
  Operations Console decision that governs what happens after this ADR's verified payment success,
  including outlet release, manual acceptance, and kitchen workflow.
- [`v1-product-scope.md`](../v1-product-scope.md) — the V1 checkout and payment experience this
  decision must support.
- [`operating-model.md`](../operating-model.md) — how verified payment, review cases, and refunds
  are reflected in day-to-day kitchen and support operations.
- [`organization-outlet-access-model.md`](../organization-outlet-access-model.md) — the legal-entity
  and permission model payment-account resolution and refund authority are drawn from.
- [ADR-014](./ADR-014-http-api-route-handlers-contracts.md) — the HTTP API decision whose
  provider-webhook boundary and browser-result-signal rules this ADR's Cashfree webhook ingestion and
  browser-return-boundary sections are exposed through.
- [ADR-015](./ADR-015-configuration-secrets-feature-flags.md) — the configuration and secrets
  decision that fixes how Cashfree credentials are classified, referenced, and rotated, and how the
  payment kill switch stops new payment sessions without stopping webhook ingestion or
  reconciliation.
- [`roadmap-and-open-decisions.md`](../roadmap-and-open-decisions.md) — the open decisions this ADR
  does not resolve.
- [`decision-register.md`](../decision-register.md) — the structured register entries this ADR
  locks.
- [`README.md`](../README.md) — the canonical documentation index and update protocol.
