---
Status: AMENDED
Governance status: AMENDED
Amended by: D-357 (docs/platform/decision-register.md)
Decision date: 2026-08-02
Last updated: 2026-08-11
---

# ADR-010: Order Lifecycle and Operations Console

## Status

**AMENDED** (2026-08-11) by **[D-357](../decision-register.md)**.

Accepted IMP-023 Order lifecycle authority is:

```text
PLACED | ACCEPTED | FULFILLED | CANCELLED
```

Detailed kitchen workflow states in this ADR (for example `PREPARING`, `READY`) describe deferred
detailed fulfilment / future Operations Console design. They are **not** the accepted current Order
lifecycle and must not be treated as CURRENT Order domain authority. Operations Console API/UI are
future ROADMAP slices (IMP-029 / IMP-030). Historical ADR body retained for provenance.

## Decision Date

2026-08-02

## Decision Owners

BOBA Bear founder and product leadership

## Context

[ADR-008](./ADR-008-serviceability-cart-checkout.md) fixed checkout orchestration and established
that Checkout creates exactly one idempotent pre-payment order, in a `PENDING_PAYMENT` state, never
kitchen-visible, before handing the order to the Payments module.
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md) fixed the payment-intent and
payment-attempt lifecycle, the sources-of-payment-truth precedence, webhook idempotency, and the
refund domain model, and established that a verified payment success makes an order eligible for
kitchen workflow without waiting for settlement. [`operating-model.md`](../operating-model.md)
described the dual-system kitchen reality and sketched an illustrative initial Operations Console
scope. [`order-payment-delivery-model.md`](../order-payment-delivery-model.md) recorded illustrative,
non-final order and delivery state lists and locked payment-integrity principles without fixing the
fulfilment-state machine itself. None of these documents fix how a verified payment release becomes
outlet-visible kitchen work, how outlet staff accept or reject a paid order, how kitchen preparation
progresses to delivery handoff and completion, how cancellations and refunds relate to fulfilment
state, how operational exceptions are represented, how the Operations Console is scoped and secured
by role, how operational commands are made concurrency-safe and idempotent, how customers see safe
order-tracking information, or what must be audited across this workflow.

This ADR resolves the commercial and fulfilment state separation, the payment-to-operations release
mechanism, manual outlet acceptance, rejection before acceptance, the no-silent-substitution rule for
confirmed orders, forward-only fulfilment progression and correction commands, the V1 Operations
Console boundary and role-minimized views, the operational command model with optimistic concurrency
and idempotency, operational timers and escalation, preparation estimates, deterministic queue
ordering, outlet-pause behaviour toward existing obligations, cancellation request versus decision,
the customer cancellation and outlet cancellation foundations, cancellation/refund separation,
first-class operational exceptions and their lifecycle, the customer-visible tracking projection, the
public order number, the append-only order event timeline, the notifications boundary, the realtime
Operations Console boundary, offline behaviour, delivery-driven completion, historical immutability,
and the operational audit and metrics requirements — so that the Order, Operations, and Delivery
modules referenced in
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#initial-module-boundaries) can be implemented
against a fixed foundation rather than ad hoc, per-change decisions.

This ADR is a documentation-only architecture decision. It does not add Order, Operations, Delivery,
or Notifications module code, state-machine code, operational command handlers, APIs, Route Handlers,
Operations Console UI, realtime transport, database tables, migrations, or tests.

## Decision Summary

> A direct order becomes operational only after verified payment success. The Operations Console
> then manages outlet acceptance, preparation, readiness, delivery handoff, fulfilment exceptions,
> and completion through explicit, authorized, idempotent, and auditable state transitions.

```text
Pre-payment order
        ↓
Verified payment success
        ↓
Awaiting outlet acceptance
        ↓
Accepted
        ↓
Preparing
        ↓
Ready for handoff
        ↓
Handed to delivery
        ↓
Delivered
        ↓
Completed
```

An order whose payment state is pending, failed, expired, mismatched, cancelled, or under review must
never enter the normal kitchen queue. Commercial order state, payment state, fulfilment state,
delivery state, cancellation request and decision, refund state, and the customer-visible tracking
projection are kept as separate, independently owned dimensions rather than one overloaded status
field. V1 uses manual outlet acceptance for every paid order; automatic acceptance is deferred.
Rejection is available only before acceptance, requires a structured reason, and routes a paid order
into cancellation and refund handling. No staff action may silently substitute a confirmed order's
product, variant, modifier, quantity, instruction, address, or fulfilment outlet. Normal fulfilment
progression is forward-only; backward movement requires a dedicated, audited correction command, not
casual mutation. The V1 Operations Console is a fulfilment console, not a full point-of-sale system,
with role-minimized outlet-scoped views. Every operational command carries trusted context — order,
expected version, expected state, idempotency key, actor, and reason where required — and is enforced
through optimistic concurrency and idempotent replay. Operational timers derive from persisted
timestamps and escalate rather than silently cancel on breach. Queue ordering is deterministic.
Outlet pause blocks new orders but preserves existing paid-order obligations. Cancellation request is
separate from cancellation decision, and cancellation state is separate from refund state.
Operational exceptions are first-class, auditable records with their own lifecycle. Customers see
only a safe, derived tracking projection, never raw internal state, addressed through a public order
number that is never itself an access credential. An append-only order event timeline supports audit,
tracking, and reconciliation alongside PostgreSQL's authoritative current state. Notifications are
emitted only after a state transition commits, through the transactional outbox. Realtime Console
transport is a non-authoritative convenience; PostgreSQL and versioned mutation remain authoritative.
Delivery completion normally drives commercial order completion. Historical order, fulfilment,
cancellation, refund, exception, and tracking data remain immutable regardless of later catalog,
pricing, or organizational change.

This is an accepted, final decision for BOBA Bear's direct-order lifecycle and Operations Console
architecture — not a recommendation or a provisional option, except where a specific item is
explicitly marked provisional or open below. It fixes the state-dimension separation, the payment
release mechanism, manual acceptance, rejection, no-silent-substitution, forward-only progression and
correction commands, the Console boundary and role-minimized views, the command model with
concurrency and idempotency, timers and escalation, queue ordering, outlet-pause behaviour,
cancellation request/decision and cancellation/refund separation, the exception model, customer
tracking, the public order number, the append-only timeline, the notifications and realtime
boundaries, delivery-driven completion, historical immutability, and the audit and metrics
requirements. It does not fix exact enum names, exact timer thresholds, exact cancellation and refund
policy detail, exact preparation-estimate algorithms, exact public order-number format, exact realtime
transport, exact notification templates and cadence, or exact manual-completion authority — see
[Explicit Non-Decisions](#explicit-non-decisions).

## Separate State Dimensions

A direct order's overall condition is never modeled through one overloaded status field. The
following dimensions are separately owned and independently transition:

| Dimension | Primary owner |
| --- | --- |
| Commercial order state | Orders |
| Payment state | Payments |
| Fulfilment state | Operations |
| Delivery state | Delivery |
| Cancellation request and decision | Orders and Operations |
| Refund state | Payments |
| Customer-visible tracking projection | Orders and Notifications |

Payment state must never overwrite fulfilment state. Cancellation state must never overwrite refund
state. Delivery state must never be inferred from kitchen state alone. Customer tracking must be a
safe derived projection, never a direct exposure of internal state. Each owning module controls its
own state transitions; other modules read through that module's application interface, consistent
with the module-ownership and dependency rules already locked in
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#database-ownership).

## Commercial Order Lifecycle

The commercial order lifecycle is conceptually equivalent to:

```text
PENDING_PAYMENT
CONFIRMED
CANCELLATION_PENDING
CANCELLED
COMPLETED
REVIEW_REQUIRED
```

**Pending payment** — created before external payment under
[ADR-008](./ADR-008-serviceability-cart-checkout.md#pre-payment-order-creation); not visible to the
normal kitchen workflow; not treated as confirmed revenue or accepted fulfilment. **Confirmed** —
entered only after verified payment acceptance under
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#sources-of-payment-truth); eligible
for outlet fulfilment release. **Cancellation pending** — a cancellation request or decision workflow
exists; fulfilment, refund, approval, or customer communication may still be incomplete.
**Cancelled** — the order will no longer be fulfilled; refund state remains separate. **Completed** —
required fulfilment and delivery completion have occurred. **Review required** — the order cannot
safely progress automatically because of payment, fulfilment, customer, delivery, or data
inconsistency. Exact persistence and enum naming may be refined during implementation; this state
separation is locked.

## Fulfilment Lifecycle

The fulfilment lifecycle is conceptually equivalent to:

```text
NOT_RELEASED
AWAITING_ACCEPTANCE
ACCEPTED
PREPARING
READY_FOR_HANDOFF
HANDED_OFF
FULFILLED
REJECTED
CANCELLED
EXCEPTION
```

**Not released** — used while payment is pending, failed, expired, mismatched, or under review.
**Awaiting acceptance** — verified payment succeeded and the order is visible in the outlet's
incoming queue. **Accepted** — the outlet committed to fulfil the order. **Preparing** — kitchen
preparation started. **Ready for handoff** — preparation and packaging completed. **Handed off** —
the order was handed to the assigned rider or delivery workflow. **Fulfilled** — delivery or future
pickup fulfilment completed. **Rejected** — the outlet rejected the paid order before acceptance.
**Cancelled** — operational fulfilment was cancelled. **Exception** — normal progression is blocked
and requires operational attention. Detailed delivery-specific progression remains owned by the
Delivery module, per [ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md).

## Payment Release into Operations

When a payment is accepted:

```text
Payments commits the accepted payment transition
        ↓
Payments creates a transactional outbox event
        ↓
Orders confirms the commercial order
        ↓
Operations creates or activates the fulfilment workflow
        ↓
Fulfilment enters AWAITING_ACCEPTANCE
        ↓
Order becomes visible to the correct outlet
        ↓
Operational timers begin
        ↓
Customer tracking may show the order was received
        ↓
Notification work is queued after the transaction commits
```

The same payment event must never release the order twice. Duplicate provider events must never
create duplicate fulfilment workflows, extending the webhook-idempotency requirement already locked in
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#webhook-idempotency-and-ordering).
Outlet resolution for release must come from the immutable order snapshot fixed by
[ADR-008](./ADR-008-serviceability-cart-checkout.md#pre-payment-order-creation), never re-derived from
live serviceability data at release time. Cross-outlet release is prohibited. Payment review or
mismatch, per
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#mismatch-handling), must block
release.

## Manual Outlet Acceptance

V1 uses manual outlet acceptance. A Kitchen Operator or Outlet Manager holding the required
permission must explicitly accept every paid order. Acceptance confirms that the outlet is
operational, the order can be fulfilled, required products and modifiers remain operationally
available, and the outlet accepts responsibility for preparation. Acceptance must be authorized,
outlet-scoped, idempotent, version-checked, actor-attributed, timestamped, and audited, consistent
with the [Operational Command Model](#operational-command-model) below. Automatic acceptance is
deferred.

## Rejection Before Acceptance

A paid order may be rejected only while awaiting acceptance, using a structured reason such as:

```text
ITEM_UNAVAILABLE
KITCHEN_CAPACITY
OUTLET_OPERATIONAL_ISSUE
EQUIPMENT_FAILURE
DELIVERY_UNAVAILABLE
ADDRESS_OR_SERVICEABILITY_ISSUE
DUPLICATE_OR_INVALID_ORDER
OTHER_REVIEWED_REASON
```

A structured reason is mandatory; optional free-text detail may supplement it. Rejection stops normal
fulfilment progression, and the customer must be notified. A paid rejection enters cancellation and
refund handling, per [Cancellation and Refund Separation](#cancellation-and-refund-separation) below;
rejection must never directly mark a refund successful. Rejection metrics and reason data must be
retained. Rejection after acceptance is not the normal workflow — it becomes cancellation or exception
handling instead. Exact automatic-refund behaviour after rejection remains open.

## No Silent Substitution

Outlet or support staff must never silently change a confirmed order's product, variant, modifier,
modifier quantity, bundle component, quantity, customer instruction, delivery address, or fulfilment
outlet, extending the no-silent-substitution principle already locked for cart and checkout selections
in [ADR-006](./ADR-006-food-catalog-assortment-availability.md#cart-references-and-revalidation) and
[ADR-008](./ADR-008-serviceability-cart-checkout.md). When a confirmed order cannot be fulfilled as
agreed, the outlet must raise an operational exception, contact the customer where policy permits,
obtain explicit agreement for any supported change, represent financial consequences only through
approved pricing, cancellation, or refund workflows, and preserve the original order snapshot. V1 may
prefer cancellation and reorder over complex post-payment order modification; the exact post-payment
modification policy remains open.

## Forward Fulfilment Progression

Normal fulfilment progression is forward-only:

```text
AWAITING_ACCEPTANCE
        ↓
ACCEPTED
        ↓
PREPARING
        ↓
READY_FOR_HANDOFF
        ↓
HANDED_OFF
        ↓
FULFILLED
```

Ordinary users must not skip required stages. Each command must validate the expected current state
and use the authoritative server-side order version, per [Optimistic Concurrency](#optimistic-concurrency)
below. State changes must be recorded with timestamps, and customer-visible projections must update
only after committed transitions. Limited shortcuts may exist only when operationally necessary,
explicitly permissioned, reasoned, and audited; exact shortcuts are not defined by this decision.

## Correction-Command Policy

Routine mutations such as `READY_FOR_HANDOFF → PREPARING`, `HANDED_OFF → READY_FOR_HANDOFF`, or
`FULFILLED → PREPARING` are prohibited. Corrections require a dedicated administrative correction
command, whose record conceptually includes order, previous state, corrected state, reason, actor,
permission and scope, approval where required, timestamp, correlation identifier, and related timeline
event. Historical transition events must remain intact; a correction must never overwrite historical
timestamps to make it appear that the original transition never occurred.

## Operations Console Boundary

The V1 Operations Console is a fulfilment console, not a complete point-of-sale system. It provides
outlet-scoped views conceptually equivalent to:

```text
Incoming
Accepted
Preparing
Ready
Handoff
Exceptions
Completed
Cancelled
```

The Console should eventually support a new-order alert, accept, reject, start preparation, mark
ready, record handoff, viewing operational customer instructions, viewing permitted delivery context,
raising an exception, requesting cancellation, viewing operational timers, viewing safe payment
status, viewing the order timeline, and viewing refund status where operationally relevant. The
Console must not become the V1 system for general accounting, franchise settlement, full catalog
administration, full pricing administration, tax configuration, customer-account administration,
aggregator-order management, or a full counter point-of-sale system, consistent with
[`operating-model.md`](../operating-model.md#initial-operations-console).

## Role-Minimized Console Views

**Kitchen Operator** may see the public order number, products, variants, modifiers, quantities,
kitchen instructions, order age, preparation state, and the applicable preparation estimate. A Kitchen
Operator should not automatically see the full customer profile, full address, full payment details,
refund authority, financial reports, or other outlets' orders. **Outlet Manager** may additionally
reject eligible orders, manage operational exceptions, request or decide permitted cancellations,
perform limited correction commands, pause outlet ordering, review delays and breached timers, and
reprioritize with permission and reason. **Delivery Coordinator** may see ready and handed-off orders,
delivery recipient details required for fulfilment, address, contact number, delivery instructions,
and delivery-provider state. **Support and Refund Operator** may see only authorized commercial
context, payment status, cancellation context, refund status, and customer-contact information needed
for support. This role-minimization extends the data-minimization principle already locked in
[ADR-005](./ADR-005-organization-outlet-authorization.md#customer-data-minimization).

## Operational Command Model

Every operational command carries trusted context conceptually equivalent to:

```text
{
  orderId,
  expectedVersion,
  expectedState,
  idempotencyKey,
  actor,
  reasonWhereRequired
}
```

Commands include accept order, reject order, start preparation, mark ready, record handoff, complete
fulfilment, request cancellation, decide cancellation, raise exception, acknowledge exception, resolve
exception, correct workflow state, and change priority. A command must fail safely when the order
version is stale, the expected state no longer matches, the order belongs to another outlet, the
actor lacks permission, payment is not accepted, cancellation blocks progression, an unresolved
blocking exception exists, or the operation was already executed.

## Optimistic Concurrency

Operational mutations use optimistic concurrency: read the authoritative version, receive the
expected version, validate the expected state, apply the transition only if valid, increment the
version, and return the authoritative result. A stale command must not overwrite a newer state. This
protects against two workers accepting simultaneously, multiple browser tabs, repeated button clicks,
slow network retries, Console refreshes, worker-and-manager actions racing, and delivery handoff
racing with cancellation — extending the optimistic-concurrency principle already locked for cart
mutation in
[ADR-008](./ADR-008-serviceability-cart-checkout.md#optimistic-cart-concurrency).

## Command Idempotency

Idempotency is required for accept, reject, start preparing, mark ready, record handoff, complete
fulfilment, request cancellation, decide cancellation, raise exception, resolve exception, and correct
workflow state. Replaying the same command returns the original result; reusing a key with materially
different input fails; one command key creates at most one business effect. Duplicate commands must
not duplicate timeline events, notifications, audit records, refund requests, delivery handoff, or
metrics.

## Operational Timers

Timers must derive from persisted timestamps, never a browser-only countdown. The domain should
support calculation of time awaiting acceptance, time from acceptance to preparation, preparation
duration, time ready while awaiting handoff, handoff-to-delivery duration, delivery duration, total
fulfilment duration, and total order duration. Potential threshold types include:

```text
ACCEPTANCE_WARNING
ACCEPTANCE_BREACH
PREPARATION_WARNING
PREPARATION_BREACH
READY_HANDOFF_WARNING
READY_HANDOFF_BREACH
DELIVERY_DELAY_WARNING
DELIVERY_DELAY_BREACH
```

Exact threshold durations remain open.

## Timer Escalation

A timer breach normally raises an operational alert, increases queue priority where policy permits,
creates or updates an exception, notifies the responsible role, produces a metric, and becomes visible
to the Outlet Manager. A timer breach must never silently reject the order, cancel the order, trigger
a refund, change the delivery state, or rewrite the promised estimate. Any automated cancellation or
refund policy tied to a timer breach requires a separate, future approved decision.

## Preparation Estimates

An order may hold an operational preparation estimate, initially sourced from outlet default, product
or category preparation settings, current outlet operational estimate, or authorized staff
adjustment. Estimate changes must be timestamped; customer-visible estimates should be conservative;
the order should retain the estimate shown at relevant stages; estimate changes must not rewrite
previous timeline information; and authorized manual changes require a reason where they materially
affect the customer. AI-driven prediction is deferred; the exact estimation algorithm remains open.

## Queue Ordering

Default queue ordering is deterministic, using the recommended precedence: explicit operational
priority, committed delivery or fulfilment deadline, verified payment or confirmation timestamp, and a
stable order identifier as tie-breaker. Queue order must not depend on nondeterministic
database-return order, and realtime arrival order is not authoritative. Manual reprioritization
requires permission and a structured reason, and priority changes are audited. V1 must not use
untracked drag-and-drop ordering. Scheduled-order queueing remains deferred.

## Outlet Pause and Existing Orders

An outlet-wide pause prevents new checkout completion after authoritative revalidation, per
[ADR-008](./ADR-008-serviceability-cart-checkout.md#serviceability-outcomes), but does not erase
existing obligations. When an outlet pauses: existing paid orders remain visible; staff must accept,
reject, cancel, or resolve each order explicitly; active preparation continues unless an exception
prevents it; the pause reason is visible to authorized staff; pending checkouts revalidate outlet
state; and new orders must not be accepted after the pause becomes effective. An outlet suspension may
require managerial or platform review and may further restrict normal operational actions.

## Cancellation Request and Decision

Cancellation request and cancellation decision are kept separate. A **cancellation request** may
originate from the customer, outlet staff, support, delivery operations, or a system-detected
exception, and conceptually records requester, requester type, reason, free-text detail where
permitted, requested timestamp, commercial order state, fulfilment state, delivery state, approval
requirement, and current resolution state. A **cancellation decision** determines whether fulfilment
stops, whether customer communication is required, whether refund review begins, whether delivery
cancellation is required, and whether preparation cost or operational evidence is retained. A request
must never directly rewrite order state without policy evaluation.

## Customer Cancellation Foundation

Before payment success, the customer may abandon checkout and no operational cancellation is
required. After payment but before outlet acceptance, the customer may request cancellation, and
automatic approval may be introduced under a future configured policy; exact eligibility remains open.
After outlet acceptance, cancellation is not automatically guaranteed, because operational review is
required once preparation may have started. After handoff, cancellation becomes a delivery or support
exception rather than a normal pre-fulfilment cancellation.

## Outlet Cancellation Foundation

Outlet staff may request cancellation for structured reasons such as:

```text
ITEM_UNAVAILABLE_AFTER_ACCEPTANCE
KITCHEN_FAILURE
SAFETY_OR_QUALITY_CONCERN
OUTLET_EMERGENCY
CUSTOMER_UNREACHABLE
DELIVERY_FAILURE
ADDRESS_FAILURE
OTHER_APPROVED_REASON
```

A structured reason is mandatory. Cancellation after preparation begins may require Outlet Manager
authority. Refund handling remains separate. Customer notification is required. Ingredient or stock
adjustments are not automatically handled in V1. Reporting must distinguish customer-caused,
outlet-caused, delivery-caused, payment-caused, and platform-caused cancellations.

## Cancellation and Refund Separation

```text
Order cancellation state
≠
Refund state
```

Valid combinations include cancelled with refund pending, cancelled with refund processing, cancelled
with full refund successful, cancelled with partial refund successful, cancelled with no refund,
completed with partial refund, completed with refund review, and cancellation pending with no refund
submitted yet. Operations and customer tracking must display cancellation and refund as separate
dimensions. Refund mechanics remain governed by
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#refund-architecture).

## First-Class Operational Exceptions

Operational exceptions are represented as first-class records, conceptually containing a stable
identifier, order, exception type, severity, source, current owner, lifecycle state, description,
customer impact, operational deadline, blocking or non-blocking status, resolution, related payment,
refund, cancellation, or delivery references, and audit metadata. Fulfilment status must not be
overloaded with every exceptional condition.

## Exception Lifecycle

The exception lifecycle is conceptually equivalent to:

```text
OPEN
ACKNOWLEDGED
IN_PROGRESS
RESOLVED
CLOSED
```

**Open** — the exception was created and awaits acknowledgement. **Acknowledged** — a responsible
user or team accepted ownership. **In progress** — resolution work is ongoing. **Resolved** — a
resolution outcome was recorded. **Closed** — required follow-up and documentation completed. An
exception may remain recorded after the order progresses; resolved exceptions must not be silently
deleted.

## Initial Exception Types

The domain foundation supports at least:

```text
ACCEPTANCE_DELAY
PREPARATION_DELAY
ITEM_UNAVAILABLE
OUTLET_OPERATIONAL_FAILURE
CUSTOMER_UNREACHABLE
ADDRESS_PROBLEM
DELIVERY_PROVIDER_UNAVAILABLE
RIDER_DELAY
PAYMENT_REVIEW
DUPLICATE_PAYMENT
CANCELLATION_REVIEW
REFUND_REVIEW
SYSTEM_PROCESSING_FAILURE
```

Exact severity levels and blocking rules remain open.

## Exception Escalation

Exception handling should support an assigned owner, severity, operational deadline, escalation
level, notifications, manager review, resolution reason, and customer-impact classification.
Resolution should state whether the exception was resolved, superseded, accepted as operational risk,
converted to cancellation, converted to refund review, converted to delivery review, or converted to
payment review. The platform must not silently close an exception merely because the order later
changes state.

## Customer-Visible Tracking Projection

Customer tracking is derived from internal payment, commercial, fulfilment, delivery, cancellation,
and refund state. Recommended customer-visible statuses:

```text
PAYMENT_BEING_CONFIRMED
ORDER_RECEIVED
ORDER_ACCEPTED
PREPARING
READY_FOR_DELIVERY
OUT_FOR_DELIVERY
DELIVERED
CANCELLATION_IN_PROGRESS
CANCELLED
PAYMENT_OR_ORDER_UNDER_REVIEW
```

These are safe customer-facing projections, not the authoritative internal state model.

## Customer Tracking Rules

Customer tracking must be available only to the authenticated order owner, consistent with the
ownership-based customer-authorization principle already locked in
[ADR-005](./ADR-005-organization-outlet-authorization.md#customer-authorization). It requires a
separately approved secure guest token for any future guest tracking; shows meaningful timestamps;
shows safe preparation and delivery estimates; shows cancellation and refund information separately
where relevant; avoids exposing staff identities, fraud, risk, provider, or internal exception
diagnostics, or internal notes; remains accessible from order history; uses a safe public order
reference; and preserves historical status information. Knowing an order number must never grant
access.

## Public Order Number

Every confirmed order should have an internal stable identifier and a human-friendly public order
number. The public order number is not an authorization credential; may be shown to customer,
kitchen, delivery personnel, and support; must be stable; must be unique within an approved numbering
context; must not expose database identifiers unnecessarily; must not be confused with invoice
numbering, per
[ADR-007](./ADR-007-pricing-tax-charges-promotions.md#invoice-and-credit-note-boundary); and must not
be the only identifier used for internal reconciliation. Exact format and sequence remain open.

## Append-Only Timeline

An append-only operational timeline is maintained, with potential event types including:

```text
PAYMENT_CONFIRMED
ORDER_RELEASED_TO_OUTLET
ORDER_ACCEPTED
ORDER_REJECTED
PREPARATION_STARTED
ORDER_READY
ORDER_HANDED_OFF
DELIVERY_STARTED
ORDER_DELIVERED
CANCELLATION_REQUESTED
CANCELLATION_APPROVED
ORDER_CANCELLED
REFUND_REQUESTED
EXCEPTION_OPENED
EXCEPTION_ACKNOWLEDGED
EXCEPTION_RESOLVED
WORKFLOW_CORRECTED
```

Each event conceptually records event type, order, outlet, actor or service identity, timestamp,
previous state, resulting state, reason, correlation identifier, source command or provider event,
and the customer-visible projection where applicable. The event timeline supports audit, customer
tracking, operations history, support, metrics, and reconciliation. This does not require full event
sourcing: PostgreSQL current state remains authoritative alongside the append-only timeline.

## Notifications Boundary

Operations and Orders emit committed domain events; the Notifications module decides how to
communicate through WhatsApp, email, in-app updates, or future push notifications. Potential
notification triggers include payment confirmed, order received, order accepted, preparation started,
order ready, handoff or out for delivery, delivered, rejected, cancellation update, refund update,
customer action required, and material delay. A state transition commits before notification;
notification work uses the transactional outbox, already locked in
[`architecture-foundation.md`](../architecture-foundation.md#transactional-outbox); notification
delivery is retryable; notification failure does not roll back the order transition; duplicate events
must not create uncontrolled duplicate messages; and notification content must use safe
customer-facing projections. Exact channels, templates, language, and cadence remain for a later
Notifications architecture slice.

## Realtime Operations Console Updates

The Operations Console should receive order changes quickly, using a V1 transport such as short
polling, Server-Sent Events, or WebSockets — the exact mechanism remains open. Regardless of
transport: PostgreSQL remains authoritative; mutations use version checks; reconnect loads the full
authoritative queue; missed messages are recovered through refresh or resynchronization; in-memory
delivery is not the sole record; realtime events must not authorize transitions; and client-side queue
state must not overwrite server state.

## Audio and Visual Alerts

The Console may support a new-order sound, incoming-order visual indicator, acceptance warning,
preparation warning, exception warning, and ready-order handoff warning. Browser audio may require
explicit staff enablement; alert acknowledgement is not order acceptance; missing or blocked audio
must not hide the order; refresh must recover the authoritative queue; and alerts remain
user-experience aids, not business-state transitions. Exact sounds and alert configuration remain
open.

## Offline Behaviour

Full offline order processing is not part of V1. When the Console loses connectivity: show an
explicit disconnected state; do not treat local actions as final; do not permit unverified order
acceptance or completion; preserve unsent user intent only where safe; resynchronize from the server
after reconnect; reapply a command only with idempotency and version checks; and reject stale queued
commands that no longer apply. Offline point-of-sale-style operation is deferred.

## Delivery-Driven Completion

For delivery orders, commercial completion normally depends on verified Delivery-module completion:

```text
Fulfilment HANDED_OFF
        +
Delivery DELIVERED
        =
Commercial order COMPLETED
```

Kitchen readiness alone does not complete a delivery order; handoff alone does not prove delivery;
settlement is not required for order completion, per
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#payment-success-and-settlement-separation).
Staff must not routinely mark orders delivered merely to clear a queue. Manual completion requires
explicit permission, reason, and audit, and delivery reconciliation may still be required after manual
completion. Exact manual completion authority remains open.

## Historical Immutability

Historical orders must retain the commercial order snapshot; customer and address snapshot; catalog
snapshot, per
[ADR-006](./ADR-006-food-catalog-assortment-availability.md#immutable-order-catalog-snapshots); the
monetary and tax snapshot, per
[ADR-007](./ADR-007-pricing-tax-charges-promotions.md#immutable-order-monetary-snapshots); payment
records; the fulfilment timeline; delivery records; cancellation requests and decisions; refund
records; exceptions; the customer-visible tracking timeline; and audit events. Historical order
meaning must not be rebuilt from current catalog, price books, tax policies, customer address, outlet
configuration, role assignments, or notification templates. Retention and anonymization remain for the
privacy architecture slice.

## Operational Audit Requirements

Audit events are mandatory for order acceptance, order rejection, preparation start, mark ready,
handoff, fulfilment completion, manual priority change, workflow correction, cancellation request,
cancellation decision, exception creation, exception acknowledgement, exception assignment, exception
resolution, manual completion, sensitive customer-contact action, sensitive delivery-data access where
required, outlet pause affecting active orders, and operational state override. Each audit record
conceptually includes actor, actor type, role and scope, order, outlet, command, previous state,
resulting state, reason, approval where required, timestamp, and correlation identifier, extending the
general audit requirement already locked in
[`architecture-foundation.md`](../architecture-foundation.md#audit-requirements).

## Operational Metrics

Track at least paid orders released; acceptance rate; rejection rate; acceptance duration;
preparation duration; ready-to-handoff duration; delivery duration; total fulfilment duration;
cancellation rate; cancellation reason; refund-linked cancellation rate; exception count;
exception-resolution duration; delayed-order count; duplicate-command count; state-conflict count;
workflow-correction count; and outlet-pause duration. Reporting must distinguish customer-caused,
outlet-caused, delivery-caused, and payment-caused cancellation, and payment-caused and
platform-caused exceptions. Exact reporting implementation remains open.

## Required Future Tests

**Unit tests** must eventually cover valid fulfilment transitions; invalid backward transitions;
payment-release eligibility; acceptance eligibility; rejection eligibility; mandatory rejection
reason; cancellation-request lifecycle; cancellation/refund separation; customer-tracking projection;
timer calculation; queue priority; order-completion derivation; exception lifecycle;
correction-command requirements; and role-minimized response projection.

**Integration tests** must eventually cover verified payment releasing one order to the correct
outlet; a payment-pending order not being kitchen-visible; a review-required payment not being
kitchen-visible; a duplicate payment event not duplicating fulfilment; Outlet A staff being unable to
access Outlet B orders; two users accepting simultaneously producing one acceptance; a duplicate
accept command producing one effect; a rejected paid order entering the cancellation/refund workflow;
a preparing order being unable to use the pre-acceptance rejection path; a ready order recording an
immutable transition time; a customer seeing only safe tracking projections; the historical timeline
surviving catalog and pricing changes; Console reconnect reloading authoritative state; a notification
event being created only after state commit; an outlet pause blocking new orders while preserving
existing obligations; and refund state not overwriting cancellation state.

**Concurrency and invariant tests** must establish that one order is accepted at most once; one
command idempotency key produces one effect; state version increases on every mutation; a stale
transition cannot overwrite current state; a payment-pending order never enters preparation; a
payment-review order never enters preparation; a cancelled order cannot re-enter normal preparation; a
completed order cannot return to active workflow without a correction command; a customer cannot track
another customer's order; cross-outlet mutation is prohibited; refund state cannot mutate fulfilment
history; duplicate domain events do not duplicate notifications; and manual completion requires
explicit authority.

The exact test frameworks remain governed by
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#testing-structure).

## Explicitly Deferred Capabilities

Outside V1: automatic order acceptance; a full restaurant point-of-sale system; counter billing; cash
orders; dine-in tables; pickup launch; scheduled orders; kitchen display hardware integration;
ticket-printer integration; recipe and ingredient consumption; automated kitchen-capacity scheduling;
AI preparation estimates; multi-station kitchen routing; customer self-service paid-order
modification; automatic substitution; complex partial-order fulfilment; offline order processing; a
rider mobile application; customer-support impersonation; aggregator orders in the BOBA Bear
Operations Console; and a unified Petpooja/direct-order kitchen queue.

## Consequences

### Positive

- Separating commercial, payment, fulfilment, delivery, cancellation, and refund state prevents one
  overloaded status field from becoming an unauditable, ambiguous source of truth as the platform
  grows toward multiple outlets and a franchise model.
- Manual outlet acceptance and mandatory structured rejection reasons give BOBA Bear an operationally
  safe starting point before investing in automatic acceptance, which is deferred rather than
  rejected.
- Forward-only progression with a dedicated, audited correction command preserves an honest
  operational history instead of allowing routine backward edits to erase what actually happened.
- First-class operational exceptions and an append-only timeline give operations, support, and future
  audits a durable record independent of whatever the order's current state happens to be.
- Treating customer tracking as a derived, safe projection lets BOBA Bear evolve internal fulfilment
  detail without ever risking exposing internal diagnostics, staff identity, or ambiguous state to a
  customer.

### Trade-offs accepted

- Separate state dimensions, an operational command model with concurrency and idempotency
  requirements, first-class exceptions, and an append-only timeline add implementation complexity
  beyond a single mutable order-status column, accepted because a single-outlet V1 launch must not
  require a later foundational rewrite once multiple outlets, franchise operations, or automatic
  acceptance are introduced.
- Manual acceptance and conservative rejection/cancellation handling add outlet staff workload
  compared to automatic acceptance, accepted to keep V1 operationally safe before real-world
  fulfilment failure patterns are understood.
- A fulfilment-focused V1 Console, rather than a full point-of-sale system, means several
  operationally useful capabilities (counter billing, aggregator-order visibility, full accounting)
  remain deferred rather than delivered at launch.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| A pending or under-review payment order becomes kitchen-visible | Fulfilment enters `NOT_RELEASED` and release only occurs on verified payment success, per [Payment Release into Operations](#payment-release-into-operations) |
| A duplicate payment event releases the same order twice | Release is idempotent against the payment event, extending [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#webhook-idempotency-and-ordering) |
| Staff silently substitute a confirmed order's items, address, or outlet | No-silent-substitution is locked; changes require an exception, customer agreement, and preserved original snapshot, per [No Silent Substitution](#no-silent-substitution) |
| Casual backward state mutation erases what actually happened | Normal progression is forward-only; corrections require a dedicated, audited correction command, per [Correction-Command Policy](#correction-command-policy) |
| Two staff members or duplicate clicks cause a double acceptance or double transition | Optimistic concurrency and command idempotency enforce one effect per version and per command key, per [Optimistic Concurrency](#optimistic-concurrency) and [Command Idempotency](#command-idempotency) |
| A timer breach silently cancels or refunds an order | Timer breach raises an alert and exception rather than an automatic cancellation or refund, per [Timer Escalation](#timer-escalation) |
| A customer sees raw internal state, staff identity, or exception diagnostics | Customer tracking is a safe derived projection only, per [Customer-Visible Tracking Projection](#customer-visible-tracking-projection) and [Customer Tracking Rules](#customer-tracking-rules) |
| A public order number is used to access another customer's order | The public order number is never an access credential; tracking requires ownership or a future secure guest token, per [Public Order Number](#public-order-number) |
| Realtime Console updates are treated as authoritative | Realtime transport is a non-authoritative convenience; PostgreSQL and version checks remain authoritative, per [Realtime Operations Console Updates](#realtime-operations-console-updates) |
| An outlet pause is used to abandon existing paid orders | Pause blocks only new orders; existing paid orders remain visible and require explicit resolution, per [Outlet Pause and Existing Orders](#outlet-pause-and-existing-orders) |

## Explicit Non-Decisions

This decision does not resolve the following, which remain **Open** and must not be treated as
answered by this ADR:

- Exact order-state enum names
- Exact fulfilment-state enum names
- Exact acceptance-warning duration
- Exact acceptance-breach duration
- Exact preparation-warning duration
- Exact preparation-breach duration
- Exact ready-to-handoff thresholds
- Exact customer cancellation window
- Exact automatic cancellation policy
- Exact automatic refund after rejection
- Exact post-payment order-modification policy
- Exact preparation-estimate algorithm
- Exact priority values
- Exact public order-number format
- Exact public order-number sequence scope
- Exact realtime transport
- Exact alert sounds
- Exact notification templates
- Exact notification cadence
- Exact exception severity levels
- Exact blocking-exception rules
- Exact manual completion authority
- Exact correction-command approvals
- Exact operational reporting implementation
- Exact order-retention policy
- Exact anonymization policy

## Rejected and Deferred Alternatives

- **One overloaded order-status field** — rejected.
- **Kitchen visibility before payment acceptance** — rejected.
- **Automatic order acceptance** — deferred.
- **Silent product substitution** — rejected.
- **Routine backward state mutation** — rejected.
- **Browser-only operational timers** — rejected.
- **Timer breach automatically cancelling an order** — rejected.
- **Untracked manual queue reordering** — rejected.
- **Cancellation and refund represented as one state** — rejected.
- **Internal status exposed directly to customers** — rejected.
- **Public order number used as authorization** — rejected.
- **Realtime messages as authoritative state** — rejected.
- **Offline order processing** — deferred.
- **Full point-of-sale and aggregator queue inside the V1 Console** — deferred.

## Cross-Reference: ADR-011 Delivery Providers, Dispatch, and Fulfilment

This ADR fixes the coordinated handoff point (`HANDED_OFF` and `PICKED_UP`) and the principle that
delivery completion normally drives commercial order completion, but defers detailed delivery-state
progression, provider abstraction, dispatch timing, courier assignment, pickup verification, and
delivery-cost reconciliation to a future decision, per
[Fulfilment Lifecycle](#fulfilment-lifecycle) and
[Delivery-Driven Completion](#delivery-driven-completion) above.
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md) is that decision: it governs courier
assignment and delivery progression, while this ADR continues to govern fulfilment readiness and
operational handoff. Delivery exceptions use this ADR's first-class exception model, per
[First-Class Operational Exceptions](#first-class-operational-exceptions), rather than a separate
delivery-exception system.

## Cross-Reference: ADR-013 Order and Operations Persistence

[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#optimistic-concurrency) fixes the
persistence implementation behind this ADR's operational model. Mutable operational aggregates —
orders and their fulfilment state — carry a `version` column and are updated with optimistic
concurrency, so two Console operators acting simultaneously cannot silently overwrite each other.
Order events and audit history are append-only: a correction adds a new record and never rewrites an
existing one, per
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#audit-persistence). An operational
state change and the outbox events it triggers are written in the same transaction, so a state
change is never visible without its downstream notification and dispatch effects being durably
recorded, per
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#transaction-abstraction).

## Related Canonical Documents

- [`architecture-foundation.md`](../architecture-foundation.md) — the modular-monolith principle,
  transactional outbox, Order and Kitchen operations module references, and general audit requirement
  this decision implements in detail.
- [ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md) — the persistence decision that
  fixes optimistic concurrency, append-only order and audit history, and atomic state-plus-outbox
  writes for this ADR, per the cross-reference above.
- [`order-payment-delivery-model.md`](../order-payment-delivery-model.md) — the illustrative order and
  delivery states and payment-integrity principles this decision replaces with a fixed fulfilment
  lifecycle and Operations Console architecture.
- [`operating-model.md`](../operating-model.md) — the dual-system kitchen reality and initial
  Operations Console scope this decision fixes in full detail.
- [ADR-003](./ADR-003-modular-monolith-node-typescript.md) — the module boundaries, dependency rules,
  and transactional-outbox model the Order, Operations, Delivery, and Notification modules must
  follow.
- [ADR-005](./ADR-005-organization-outlet-authorization.md) — the scoped, permission-based
  authorization, data-minimization, and audit decision this ADR's role-minimized Console views and
  operational command model build on.
- [ADR-006](./ADR-006-food-catalog-assortment-availability.md) — the no-silent-substitution and
  immutable catalog-snapshot decision this ADR extends to confirmed, paid orders.
- [ADR-007](./ADR-007-pricing-tax-charges-promotions.md) — the immutable pricing quote, order monetary
  snapshot, and refund-allocation decision this ADR's cancellation/refund separation builds on.
- [ADR-008](./ADR-008-serviceability-cart-checkout.md) — the pre-payment order, outlet-resolution, and
  immutable order-snapshot decision this ADR's payment-release mechanism completes.
- [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md) — the verified-payment,
  sources-of-payment-truth, and refund-lifecycle decision this ADR's payment-release and
  cancellation/refund-separation sections build on.
- [ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md) — the delivery-provider abstraction,
  dispatch, courier-assignment, pickup-verification, and delivery-cost-reconciliation decision built
  on top of the coordinated handoff and delivery-driven-completion points this ADR fixes, per the
  cross-reference above.
- [`v1-product-scope.md`](../v1-product-scope.md) — the V1 order-tracking, cancellation, and
  Operations Console experience this decision must support.
- [`organization-outlet-access-model.md`](../organization-outlet-access-model.md) — the role and
  permission model the Console's role-minimized views are drawn from.
- [ADR-014](./ADR-014-http-api-route-handlers-contracts.md) — the HTTP API decision that exposes this
  ADR's operational-command optimistic concurrency and idempotent replay over HTTP through
  `ETag`/`If-Match` and `Idempotency-Key`.
- [`roadmap-and-open-decisions.md`](../roadmap-and-open-decisions.md) — the open decisions this ADR
  does not resolve.
- [`decision-register.md`](../decision-register.md) — the structured register entries this ADR locks.
- [`README.md`](../README.md) — the canonical documentation index and update protocol.
