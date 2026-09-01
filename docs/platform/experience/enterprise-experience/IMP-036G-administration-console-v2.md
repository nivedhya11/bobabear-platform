---
Status: PLANNED CAPABILITY CONTRACT
Capability: IMP-036G — Administration Console V2
Lifecycle: PLANNED / NOT_ACTIVATED
Architecture: NOT_LOCKED
Implementation: NOT_AUTHORIZED / NOT_STARTED
Founder UAT required: YES
---

# IMP-036G — Administration Console V2

## Purpose, users, and problem

Turn accepted IMP-035 administration capabilities into a coherent enterprise administration product
for platform and brand administrators. The existing experience is minimum viable and needs clearer
hierarchy, access workflow safety, auditability, and separation from Customer and Operations.

## Target outcomes and information architecture

```text
Overview
Organization
├── Brands
├── Organizations
├── Territories
├── Legal Entities
└── Outlets
Workforce
└── Memberships
Access
├── Role Assignments
└── Effective Permissions
Audit
System
└── Operational Status
```

- **Overview:** hierarchy/outlet summary, membership-lifecycle attention, recent access changes, and
  relevant operational health using accepted projections.
- **Organization:** hierarchy visualization, list/detail, create/update, and safe lifecycle controls
  only where IMP-035 authority provides them.
- **Memberships:** accepted invited/active/suspended/revoked/expired presentation and transitions.
- **Role assignments:** accepted system roles, explicit scope, safe grant/revoke; no arbitrary
  permission editor.
- **Effective permissions:** diagnostic principal/resource/scope/permission projection.
- **Audit:** actor, action, resource, scope, and date filters where accepted data supports them.

Administration stays distinct from Operations. An authorized “Open Operations” affordance is
permitted as navigation; Admin does not become an all-purpose workforce dashboard.

## Primary workflows

1. Enter an authorized administration scope and understand current organization context.
2. Browse hierarchy and execute accepted create/update/lifecycle actions safely.
3. Review and transition memberships through accepted states.
4. Grant/revoke an accepted role at an explicit scope and inspect resulting effective permissions.
5. Investigate relevant audit events and safe operational status.

## Reused authority and implications

Reuse D-373, ARCH-G25, accepted IMP-035 `/api/admin/v1/*` transport, workforce principal/session,
system roles, resource hierarchy, membership/assignment/permission projections, audit, and IMP-036
operational status. The operations process may remain the host, but Admin and Operations retain
distinct transport and experience boundaries.

Expected schema/new service/new auth/new role/new permission are `NO`; no API is added by this plan.
Every later control must map to accepted permission and scope. Hidden controls never substitute for
server-side and direct-URL authorization. Sensitive principal/access/audit data is minimized.

## Responsive, accessibility, and state requirements

Desktop-first with graceful tablet/mobile fallback. Target WCAG 2.2 AA with keyboard hierarchy/data
navigation, semantic tables or alternate lists, visible focus, accessible drawers/dialogs,
announced validation/mutation results, and non-color lifecycle/status communication.

Cover loading, empty hierarchy/membership/audit, errors/retry, session expiry, scope-safe
403/non-disclosing 404, stale/concurrent lifecycle or assignment changes, pending/success/failure,
unavailable actions, and explicit confirmation for privilege/lifecycle consequences. Use safe
IMP-036 correlation without disclosing system secrets.

## Major acceptance criteria

- Administration has a distinct shell and IA with no customer presentation.
- Hierarchy, memberships, assignments, effective permissions, and audit reflect accepted authority.
- Role grants/revokes show scope and consequence and reject stale/unauthorized mutation safely.
- No arbitrary permission editor, implicit superuser behavior, or Operations authority bleed exists.
- Operational status is safe for the authorized audience.
- Responsive/accessibility/recovery and exact-candidate Founder UAT checks pass.

## Dependencies, non-goals, and deferred decisions

Depends on IMP-036A, accepted IMP-035/036, and mature enterprise primitives from IMP-036D–F.
Non-goals: new hierarchy/RBAC/lifecycle semantics, new roles/permissions, arbitrary permission
editing, schema/service/provider changes, workforce-dashboard consolidation, or analytics. Any proven
transport/projection gap is deferred to architecture lock.

Figma is not required initially; later visual refinement may not redefine hierarchy, membership,
RBAC, audit, API, or system authority.
