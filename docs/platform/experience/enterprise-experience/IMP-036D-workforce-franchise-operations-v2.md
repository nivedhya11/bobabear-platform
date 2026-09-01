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
identity, customer fulfilment/delivery details, line items, payment context, Delivery, and allowed
actions/recovery around operator work.

**Delivery** integrates accepted booking/coordination/recovery projections. **Operational Status**
uses the accepted IMP-036 workforce-safe projection and excludes engineering secrets.

## Primary workflows

1. Enter the authorized outlet/brand context and see only permitted destinations/actions.
2. Identify and open work needing attention from Today or the Orders queue.
3. Inspect an Order and execute only accepted lifecycle commands.
4. Coordinate or recover Delivery through accepted states and commands.
5. Inspect safe operational health and use correlation identifiers for support escalation.

## Reused authority and implications

Reuse accepted workforce session/principal, existing roles, effective permission/scope, Order
`PLACED | ACCEPTED | FULFILLED | CANCELLED`, Operations transport under `/api/operations/v1/*`,
Delivery authority, and IMP-036 operational-status projection. Navigation derives from effective
permissions, never hard-coded role names. Existing operations APIs are expected to be composed rather
than replaced; no transport/schema/provider change is authorized by this plan.

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

## Major acceptance criteria

- Workforce pages contain no customer promotional chrome or customer SEO presentation.
- Today and queues show only accepted operational truth, not fabricated KPIs.
- Order/Delivery actions preserve lifecycle, permission, scope, idempotency, and concurrency rules.
- Each persona receives a coherent permission-driven workspace and direct URLs remain secure.
- Operational Status is useful without leaking secret engineering diagnostics.
- Responsive/accessibility/recovery and exact-candidate Founder UAT checks pass.

## Dependencies, non-goals, and deferred decisions

Depends on IMP-036A, accepted IMP-029/030/031/032/036, and precedes IMP-036E/F. Non-goals: new Order
states such as PREPARING/READY, new Delivery lifecycle, invented analytics, new RBAC, arbitrary
multi-outlet scope, provider integration, schema, service, or final design. Any proven projection gap
is deferred to architecture lock.

Figma is not required initially; later visual amendments cannot redefine lifecycle, permission,
scope, or operational truth.
