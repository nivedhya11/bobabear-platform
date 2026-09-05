---
Status: ARCHITECTURE_IN_PROGRESS EXPERIENCE CONTRACT
Capability: IMP-036D — Workforce & Franchise Operations Portal V2
Lifecycle: ARCHITECTURE_IN_PROGRESS
Architecture: NOT_LOCKED
Implementation: NOT_AUTHORIZED / NOT_STARTED
Founder UAT required: YES
IMP-036D_ARCHITECTURE_LOCKED: NO
IMP-036D_IMPLEMENTATION_AUTHORIZED: NO
IMP-036D_STARTED: NO
IMP-036D_IMPLEMENTATION_COMPLETE: NO
IMP-036D_ACCEPTED: NO
D-374_CREATED: NO
ARCH_R20_REQUIRED: NO
---

# IMP-036D — Workforce & Franchise Operations Portal V2

## Purpose, users, and problem

Turn the narrow Operations Console into a coherent daily workspace for store managers, kitchen,
delivery desk, support, finance, brand management, and other authorized workforce users. “Franchise”
is a business persona, not a new RBAC role.

## Architecture activation status (GTM-R103 / STATE-R101)

```text
IMP-036D_ARCHITECTURE_WORK_AUTHORIZED = YES
IMP-036D_ARCHITECTURE_IN_PROGRESS = YES
IMP-036D_ARCHITECTURE_LOCKED = NO
IMP-036D_IMPLEMENTATION_AUTHORIZED = NO
IMP-036D_STARTED = NO
IMP-036D_IMPLEMENTATION_COMPLETE = NO
IMP-036D_ACCEPTED = NO
IMP-036D_FOUNDER_UAT_REQUIRED = YES
```

Founder architecture decisions recorded at activation (not implementation authorization):

```text
IMP036D_PREPARATION_READINESS_DECISION = NO_NEW_V1_DOMAIN_STATE_REQUIRED
IMP036D_FINANCIAL_DOCUMENT_WORKFORCE_REVIEW = DEFERRED
IMP036D_NOTIFICATION_RESEND_WORKFORCE_TRANSPORT = APPROVED_FOR_ARCHITECTURE
D374_REQUIRED_FOR_NOTIFICATION_RESEND = NO
NEW_NOTIFICATION_PERMISSION = NO
NEW_NOTIFICATION_ROLE = NO
NEW_NOTIFICATION_SCOPE_MODEL = NO
IMP036D_REFUND_WORKFORCE_SUPPORT_INTENT = YES
IMP036D_REFUND_READ_PROJECTION_DESIRED = YES
IMP036D_REFUND_MUTATION_TRANSPORT_LOCKED = NO
IMP036D_REFUND_EXECUTION_TOPOLOGY = DECISION_REQUIRED
IMP036D_REFUND_TOPOLOGY_BLOCKS_ARCHITECTURE_LOCK = YES
FRANCHISE_IS_BUSINESS_PERSONA = YES
NEW_FRANCHISE_ROLE = NO
NEW_FRANCHISE_SCOPE_MODEL = NO
ARBITRARY_MULTI_OUTLET_FRANCHISE_RBAC = DEFERRED
```

- No new Order states (`PREPARING` / `READY` / equivalents). Accepted lifecycle remains
  `PLACED | ACCEPTED | FULFILLED | CANCELLED` (D-357 preserved).
- Financial Document workforce review is deferred from IMP-036D lock (no FD workforce permission,
  route, signing/admin authority, or certificate/key exposure).
- Notification resend architecture is approved in principle under existing D-372
  `/api/operations/v1/*` with resource-specific outlet authorization reusing `notification.resend`.
  Application-only `getEffectivePermissions(actor)` without a target resource is not sufficient for
  a public resend route. Not implemented by this activation.
- Refund support remains desired, but Refund mutation transport / provider-execution topology is
  unresolved and blocks architecture lock (D-361/D-364 PaymentProvider remains in
  `customer-commerce`; operations must not silently expand provider topology).
- Store Operations Management (assortment, availability, hours/schedules, serviceability,
  team/store-management expansion) remains IMP-036E.
- No D-374 / no ARCH-R20 at activation. No implementation authorization.

## Target outcomes and information architecture

```text
Today
Orders
Delivery
Store
Operational Status
```

**Today** summarizes only truthful accepted operational data: store status, orders needing action,
accepted orders, delivery actions, and operational issues. It does not invent analytics.

**Orders** provides an actionable queue with useful filters/groupings, order age, amount,
fulfilment/delivery type, detail, and existing lifecycle commands. Order detail organizes order
identity, customer fulfilment/delivery details, line items, payment/refund status, Delivery, relevant
financial-document/read context, and allowed actions/recovery around operator work. Where accepted
authority and effective permissions permit, that includes refund action/recovery (subject to
topology resolution), existing Order cancellation, notification resend (subject to resource-scoped
authorization), and relevant Delivery recovery. Planning does not invent the API or transport; the
IMP-036D architecture gate must map each control to accepted commands/transports and may propose
only a properly authorized bounded workforce transport gap.

**Delivery** integrates accepted booking/coordination/recovery projections. **Operational Status**
uses the accepted IMP-036 workforce-safe projection and excludes engineering secrets.

## Primary workflows

1. Enter the authorized outlet/brand context and see only permitted destinations/actions.
2. Identify and open work needing attention from Today or the Orders queue.
3. Inspect an Order and execute only accepted lifecycle commands.
4. Coordinate or recover Delivery through accepted states and commands.
5. Perform permitted support recovery—refund (topology permitting), cancellation, notification
   resend, and relevant financial-document read context—without creating a second lifecycle or
   authority. FD workforce review remains deferred.
6. Inspect safe operational health and use correlation identifiers for support escalation.

## Reused authority and implications

Reuse accepted workforce session/principal, existing roles, effective permission/scope, Order
`PLACED | ACCEPTED | FULFILLED | CANCELLED`, Operations transport under `/api/operations/v1/*`,
Delivery authority, and IMP-036 operational-status projection. Navigation derives from effective
permissions, never hard-coded role names. Existing operations APIs are expected to be composed rather
than replaced; no transport/schema/provider change is authorized by this plan or by architecture
activation.

Existing permission gates include `order.read`, `order.cancel`, `payment.refund`,
`payment.refund.read`, `notification.resend`, and applicable `delivery.*` keys. Their current
server-derived scope remains authoritative; this plan creates no permission or role.

Preparation/readiness: V1 workflow may truthfully operate through existing Order + Delivery
authorities without durable detailed kitchen preparation/readiness states. Detailed kitchen
fulfilment remains deferred. Do not fabricate UI-only `PREPARING`, `READY`, or equivalent states.

Direct URL/API authorization remains authoritative. Customer and payment data is minimized by task
and permission. Arbitrary multi-outlet franchise administration without brand-wide authority is a
deferred RBAC question; this slice creates no `franchise_owner`, role, permission, or scope model.

## Delivery economics visibility (planned amendment — IMP-036B correction)

Workforce operations must keep three authorities separate:

| Authority | Question |
|---|---|
| Serviceability | Can BOBA deliver here? |
| Customer delivery fee | What BOBA charged the customer |
| Provider cost | What courier execution actually cost BOBA |

IMP-036D will surface, for authorized workforce users only:

- customer delivery charge
- estimated / booked / final provider cost
- delivery subsidy/contribution variance

Any eventual delivery subsidy/contribution display must be a calculated presentation over accepted
facts, not a new mutable financial authority. Provider cost must never be exposed to customers.
Current Dehradun mode remains `MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY` (no automatic dispatch,
COD, new provider API, or new Delivery lifecycle).

## Responsive, accessibility, and state requirements

Desktop/tablet-first, dense but scannable, with mobile support for operationally sensible urgent
tasks. Target WCAG 2.2 AA with keyboard queues, semantic tables or equivalent small-screen lists,
visible focus, announced state changes, and non-color status cues.

Cover loading, no work, errors/retry, session expiry, denied/non-disclosing absent resources, stale
Order/Delivery state, concurrent command conflict, pending/success/failure, unavailable actions,
destructive or high-risk confirmation, and safe IMP-036 correlation.

## Enterprise UX comprehension

```text
ENTERPRISE_UX_IS_TASK_ORIENTED = YES
```

Operations, order, delivery, support, and refund workflows must be comprehensible without domain or
API architecture knowledge. Require plain-language page purpose, a clear primary task, human-readable
names/context rather than opaque IDs, understandable Brand/Outlet/Scope, progressive disclosure,
useful empty states with a next action, explained mutation consequences, task-oriented navigation,
user-language loading/error/recovery, and no raw JSON or internal lifecycle/provider terminology as
normal UX. No customer promotional chrome in workforce UI.

## Major acceptance criteria

- Workforce pages contain no customer promotional chrome or customer SEO presentation.
- Today and queues show only accepted operational truth, not fabricated KPIs (no invented revenue,
  conversion, SLA, average preparation time, profitability, or provider-performance analytics).
- Order/Delivery actions preserve lifecycle, permission, scope, idempotency, and concurrency rules.
- Support/refund/cancellation/notification capabilities appear only when accepted authority,
  permission, and scope permit them; FD workforce review remains deferred.
- Preparation/readiness uses no new V1 Order states.
- Each persona receives a coherent permission-driven workspace and direct URLs remain secure.
- Operational Status is useful without leaking secret engineering diagnostics.
- Responsive/accessibility/recovery and exact-candidate Founder UAT checks pass.
- Architecture lock must not proceed while Refund execution topology remains `DECISION_REQUIRED`.

## Dependencies, non-goals, and deferred decisions

Depends on IMP-036A, accepted IMP-027–036 support/financial/operations/delivery/notification
capabilities, and precedes IMP-036E/F. Non-goals: implementing a new Order, preparation, or Delivery
lifecycle; invented analytics; new RBAC; arbitrary multi-outlet scope; provider integration; schema;
service; final design; architecture lock; implementation. Store Operations Management remains
IMP-036E. Refund topology resolution is a required subsequent architecture task before lock.

Figma is not required initially; later visual amendments cannot redefine lifecycle, permission,
scope, or operational truth.
