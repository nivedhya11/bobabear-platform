---
Status: PLANNED CAPABILITY CONTRACT
Capability: IMP-036D — Workforce & Franchise Operations Portal V2
Lifecycle: PLANNED / NOT_ACTIVATED
Architecture: NOT_LOCKED
Implementation: NOT_AUTHORIZED / NOT_STARTED
Founder UAT required: YES
---

# IMP-036D — Workforce & Franchise Operations Portal V2

## Purpose, users, and problem

Turn the narrow Operations Console into a coherent daily workspace for store managers, kitchen,
delivery desk, support, finance, brand management, and other authorized workforce users. “Franchise”
is a business persona, not a new RBAC role.

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
authority and effective permissions permit, that includes refund action/recovery, existing Order
cancellation, notification resend, and relevant Delivery recovery. Planning does not invent the API
or transport; the IMP-036D architecture gate must map each control to accepted commands/transports
and may propose only a properly authorized bounded workforce transport gap.

**Delivery** integrates accepted booking/coordination/recovery projections. **Operational Status**
uses the accepted IMP-036 workforce-safe projection and excludes engineering secrets.

## Primary workflows

1. Enter the authorized outlet/brand context and see only permitted destinations/actions.
2. Identify and open work needing attention from Today or the Orders queue.
3. Inspect an Order and execute only accepted lifecycle commands.
4. Coordinate or recover Delivery through accepted states and commands.
5. Perform permitted support recovery—refund, cancellation, notification resend, and relevant
   financial-document review—without creating a second lifecycle or authority.
6. Inspect safe operational health and use correlation identifiers for support escalation.

## Reused authority and implications

Reuse accepted workforce session/principal, existing roles, effective permission/scope, Order
`PLACED | ACCEPTED | FULFILLED | CANCELLED`, Operations transport under `/api/operations/v1/*`,
Delivery authority, and IMP-036 operational-status projection. Navigation derives from effective
permissions, never hard-coded role names. Existing operations APIs are expected to be composed rather
than replaced; no transport/schema/provider change is authorized by this plan.

Existing permission gates include `order.read`, `order.cancel`, `payment.refund`,
`payment.refund.read`, `notification.resend`, and applicable `delivery.*` keys. Their current
server-derived scope remains authoritative; this plan creates no permission or role.

IMP-036D architecture must assess whether accepted Order and Delivery authority can truthfully
support the required kitchen/store operating workflow. It must not fabricate UI-only
`PREPARING`, `READY`, or equivalent states and must not silently extend Order. If enterprise
workflow requires preparation/readiness state that is not canonically represented, the architecture
status is `DECISION_REQUIRED` and must determine whether that truth belongs in the existing Order
lifecycle, a separate preparation/fulfilment authority, or is unnecessary for BOBA V1. This is a
deferred product/domain architecture assessment, not implementation authorization.

Direct URL/API authorization remains authoritative. Customer and payment data is minimized by task
and permission. Arbitrary multi-outlet franchise administration without brand-wide authority is a
deferred RBAC question; this slice creates no `franchise_owner`, role, permission, or scope model.

## Responsive, accessibility, and state requirements

Desktop/tablet-first, dense but scannable, with mobile support for operationally sensible urgent
tasks. Target WCAG 2.2 AA with keyboard queues, semantic tables or equivalent small-screen lists,
visible focus, announced state changes, and non-color status cues.

Cover loading, no work, errors/retry, session expiry, denied/non-disclosing absent resources, stale
Order/Delivery state, concurrent command conflict, pending/success/failure, unavailable actions,
destructive or high-risk confirmation, and safe IMP-036 correlation.

## Enterprise UX comprehension (PLANNED)

```text
ENTERPRISE_UX_IS_TASK_ORIENTED = YES
```

Operations, order, delivery, support, and refund workflows must be comprehensible without domain or
API architecture knowledge. Require plain-language page purpose, a clear primary task, human-readable
names/context rather than opaque IDs, understandable Brand/Outlet/Scope, progressive disclosure,
useful empty states with a next action, explained mutation consequences, task-oriented navigation,
user-language loading/error/recovery, and no raw JSON or internal lifecycle/provider terminology as
normal UX. This amendment does not activate IMP-036D.

## Major acceptance criteria

- Workforce pages contain no customer promotional chrome or customer SEO presentation.
- Today and queues show only accepted operational truth, not fabricated KPIs.
- Order/Delivery actions preserve lifecycle, permission, scope, idempotency, and concurrency rules.
- Existing support/refund/cancellation/notification/financial-document capabilities appear only
  when accepted authority, permission, and scope permit them.
- Architecture records a truthful preparation/readiness assessment and raises `DECISION_REQUIRED`
  if current authority cannot support the required workflow.
- Each persona receives a coherent permission-driven workspace and direct URLs remain secure.
- Operational Status is useful without leaking secret engineering diagnostics.
- Responsive/accessibility/recovery and exact-candidate Founder UAT checks pass.

## Dependencies, non-goals, and deferred decisions

Depends on IMP-036A, accepted IMP-027–036 support/financial/operations/delivery/notification
capabilities, and precedes IMP-036E/F. Non-goals: implementing a new Order, preparation, or Delivery
lifecycle in planning; invented analytics; new RBAC; arbitrary multi-outlet scope; provider
integration; schema; service; or final design. Any proven projection or domain-authority gap is
deferred to architecture lock and the required preparation/readiness assessment.

Figma is not required initially; later visual amendments cannot redefine lifecycle, permission,
scope, or operational truth.
