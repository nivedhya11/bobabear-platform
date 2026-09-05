---
Status: ARCHITECTURE_LOCKED SUPPORTING EXPERIENCE CONTRACT
Capability: IMP-036D — Workforce & Franchise Operations Portal V2
Lifecycle: ARCHITECTURE_LOCKED
Architecture: ARCHITECTURE_LOCKED
Implementation: AUTHORIZED / NOT_STARTED
Founder UAT required: YES
IMP-036D_ARCHITECTURE_LOCKED: YES
IMP-036D_IMPLEMENTATION_AUTHORIZED: YES
IMP-036D_STARTED: NO
IMP-036D_IMPLEMENTATION_COMPLETE: NO
IMP-036D_ACCEPTED: NO
Authority: SUPPORTING EXPERIENCE CONTRACT — locked capability architecture at
  docs/platform/capabilities/IMP-036D-workforce-franchise-operations-v2.md is CURRENT authority
D-374_CREATED: NO
ARCH_R20_REQUIRED: NO
---

# IMP-036D — Workforce & Franchise Operations Portal V2

## Purpose, users, and problem

Turn the narrow Operations Console into a coherent daily workspace for store managers, kitchen,
delivery desk, support, finance, brand management, and other authorized workforce users. “Franchise”
is a business persona, not a new RBAC role.

This document is a **SUPPORTING** experience contract. It must not compete with or override the
locked capability architecture at
[`../../capabilities/IMP-036D-workforce-franchise-operations-v2.md`](../../capabilities/IMP-036D-workforce-franchise-operations-v2.md).

## Architecture lock status (GTM-R105 / STATE-R103)

```text
IMP-036D_ARCHITECTURE_WORK_AUTHORIZED = YES
IMP-036D_ARCHITECTURE_LOCKED = YES
IMP-036D_IMPLEMENTATION_AUTHORIZED = YES
IMP-036D_STARTED = NO
IMP-036D_IMPLEMENTATION_COMPLETE = NO
IMP-036D_ACCEPTED = NO
IMP-036D_FOUNDER_UAT_REQUIRED = YES
```

Founder implementation authorization recorded at GTM-R105 / STATE-R103. Authorization does not
start implementation.

Founder-approved locked decisions:

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
IMP036D_REFUND_MUTATION_TRANSPORT_LOCKED = YES
IMP036D_REFUND_EXECUTION_TOPOLOGY = RESOLVED_AND_LOCKED
IMP036D_REFUND_TOPOLOGY_BLOCKS_ARCHITECTURE_LOCK = NO
FRANCHISE_IS_BUSINESS_PERSONA = YES
NEW_FRANCHISE_ROLE = NO
NEW_FRANCHISE_SCOPE_MODEL = NO
ARBITRARY_MULTI_OUTLET_FRANCHISE_RBAC = DEFERRED
SCHEMA_CHANGE_REQUIRED = NO
```

Refund topology (resolved):

```text
REFUND_WORKFORCE_TRANSPORT = OPERATIONS_PROCESS
REFUND_PROVIDER_EXECUTION = CUSTOMER_COMMERCE
REFUND_DURABLE_HANDOFF = REFUND_AGGREGATE_ACCEPTED_ROW
OPERATIONS_RAZORPAY_IO = NO
OPERATIONS_PAYMENT_PROVIDER = NO
INTERNAL_HTTP_DELEGATION = NO
NEW_RPC = NO
NEW_QUEUE = NO
NEW_SERVICE = NO
REFUND_HTTP_IDEMPOTENCY = CLIENT_STABLE_REFUND_REQUEST_UUID_AS_REFUND_ID
MANUAL_PROVIDER_RECONCILE_ROUTE = NO
```

Exact workforce Refund routes:

```text
GET  /api/operations/v1/orders/{orderId}/refunds
POST /api/operations/v1/orders/{orderId}/refunds
```

Exact workforce Notification routes:

```text
GET  /api/operations/v1/orders/{orderId}/notifications
POST /api/operations/v1/orders/{orderId}/notifications/{notificationRequestId}/resend
```

- No new Order states (`PREPARING` / `READY` / equivalents). Accepted lifecycle remains
  `PLACED | ACCEPTED | FULFILLED | CANCELLED` (D-357 preserved).
- Financial Document workforce review is deferred (no FD workforce permission, route, signing/admin
  authority, or certificate/key exposure).
- Notification resend is locked under existing D-372 `/api/operations/v1/*` with resource-specific
  outlet authorization reusing `notification.resend`. Application-only
  `getEffectivePermissions(actor)` without a target resource is not sufficient for a public resend
  route.
- Refund support is locked: Operations provider-free reservation creates Refund `ACCEPTED`; existing
  customer-commerce `RefundReconciliationProcessor` remains canonical provider executor; D-361/D-364
  PaymentProvider boundary preserved.
- Store Operations Management (assortment, availability, hours/schedules, serviceability,
  team/store-management expansion) remains IMP-036E.
- No D-374 / no ARCH-R20. Implementation is **AUTHORIZED** / **NOT_STARTED**.

## Target outcomes and information architecture

```text
Today
Orders
Delivery
Store
Operational Status
```

**Today** summarizes only truthful accepted operational data: store status, orders needing action,
accepted orders, delivery actions, and operational issues. It does not invent analytics. No new
`/today` aggregate API is authorized.

**Orders** provides an actionable queue with useful filters/groupings, order age, amount,
fulfilment/delivery type, detail, and existing lifecycle commands. Order detail may compose separate
Refund / Notification / Delivery projections. Refund and cancellation remain distinct actions.

**Delivery** integrates accepted booking/coordination/recovery projections. **Operational Status**
uses the accepted IMP-036 workforce-safe projection and excludes engineering secrets.

**Store** is read-only operational context in IMP-036D; management remains IMP-036E.

## Primary workflows

1. Enter the authorized outlet/brand context and see only permitted destinations/actions.
2. Identify and open work needing attention from Today or the Orders queue.
3. Inspect an Order and execute only accepted lifecycle commands.
4. Coordinate or recover Delivery through accepted states and commands.
5. Perform permitted support recovery—refund reservation, cancellation, notification resend—without
   creating a second lifecycle or authority. FD workforce review remains deferred.
6. Inspect safe operational health and use correlation identifiers for support escalation.

## Reused authority and implications

Reuse accepted workforce session/principal, existing roles, effective permission/scope, Order
`PLACED | ACCEPTED | FULFILLED | CANCELLED`, Operations transport under `/api/operations/v1/*`,
Delivery authority, Refund D-364, Notification D-372, and IMP-036 operational-status projection.
Navigation derives from effective permissions, never hard-coded role names.

Existing permission gates include `order.read`, `order.cancel`, `payment.refund`,
`payment.refund.read`, `notification.resend`, and applicable `delivery.*` keys. Their current
server-derived scope remains authoritative; this contract creates no permission or role.

Preparation/readiness: V1 workflow may truthfully operate through existing Order + Delivery
authorities without durable detailed kitchen preparation/readiness states. Do not fabricate UI-only
`PREPARING`, `READY`, or equivalent states.

## Delivery economics visibility

Workforce operations must keep three authorities separate:

| Authority | Question |
|---|---|
| Serviceability | Can BOBA deliver here? |
| Customer delivery fee | What BOBA charged the customer |
| Provider cost | What courier execution actually cost BOBA |

IMP-036D may surface, for authorized workforce users only:

- customer delivery charge
- estimated / booked / final provider cost
- delivery subsidy/contribution variance (presentation only; integer paise)

Provider cost must never be exposed to customers. Current Dehradun mode remains
`MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY`.

## Responsive, accessibility, and state requirements

Desktop/tablet-first, dense but scannable, with mobile support for operationally sensible urgent
tasks. Target WCAG 2.2 AA with keyboard queues, semantic tables or equivalent small-screen lists,
visible focus, announced state changes, and non-color status cues.

Cover loading, no work, errors/retry, session expiry, denied/non-disclosing absent resources, stale
Order/Delivery state, concurrent command conflict, Refund ACCEPTED/PENDING/INDETERMINATE/PROCESSED/
FAILED, Refund exact replay and idempotency conflict, Notification resend unavailable/suppression/
success/failure, pending/success/failure, unavailable actions, destructive or high-risk confirmation,
and safe IMP-036 correlation.

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

## Major acceptance criteria (future implementation)

- Workforce pages contain no customer promotional chrome or customer SEO presentation.
- Today and queues show only accepted operational truth, not fabricated KPIs.
- Order/Delivery actions preserve lifecycle, permission, scope, idempotency, and concurrency rules.
- Support/refund/cancellation/notification capabilities appear only when accepted authority,
  permission, and scope permit them; FD workforce review remains deferred.
- Preparation/readiness uses no new V1 Order states.
- Each persona receives a coherent permission-driven workspace and direct URLs remain secure.
- Operational Status is useful without leaking secret engineering diagnostics.
- Responsive/accessibility/recovery and exact-candidate Founder UAT checks pass.
- Implementation remains unauthorized until a separate Founder implementation authorization.

## Dependencies, non-goals, and deferred decisions

Depends on IMP-036A, accepted IMP-027–036 support/financial/operations/delivery/notification
capabilities, and precedes IMP-036E/F. Non-goals: implementing a new Order, preparation, or Delivery
lifecycle; invented analytics; new RBAC; arbitrary multi-outlet scope; provider integration into
Operations; schema; service; implementation without separate authorization. Store Operations
Management remains IMP-036E.

Figma is not required initially; later visual amendments cannot redefine lifecycle, permission,
scope, or operational truth.
