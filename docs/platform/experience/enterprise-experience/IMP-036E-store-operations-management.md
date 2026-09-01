---
Status: PLANNED CAPABILITY CONTRACT
Capability: IMP-036E — Store Operations Management
Lifecycle: PLANNED / NOT_ACTIVATED
Architecture: NOT_LOCKED
Implementation: NOT_AUTHORIZED / NOT_STARTED
Founder UAT required: YES
---

# IMP-036E — Store Operations Management

## Purpose, users, and problem

Give authorized outlet managers and operators one coherent management workspace over existing
outlet-scoped operational capabilities. Current controls are fragmented and do not clearly separate
assortment, availability, operating status, hours, and Serviceability.

## Target outcomes and information architecture

```text
Store
├── Overview
├── Availability
├── Assortment
├── Operating Status
├── Hours
├── Serviceability
└── Team
    ├── Members
    └── Access
```

- **Overview:** selected outlet identity/context, operating state, next opening when existing data
  supports it, unavailable items, and serviceability/operational warnings.
- **Availability:** efficient item search/filter and individual mutation; bulk behavior only when
  accepted authority safely supports it.
- **Assortment:** make what an outlet offers distinct from canonical Catalog/Menu identity.
- **Operating Status:** open/pause/resume or equivalent only where accepted authority provides the
  transition; high-risk actions remain permission constrained.
- **Hours:** weekly schedule editing, validation, and closed-day treatment over existing schedule
  authority.
- **Serviceability:** manage accepted PIN/postal-code coverage; any future map is a projection, never
  polygon/geospatial authority.
- **Team:** outlet-scoped membership, access, effective-permission, and audit workflows only where
  existing IMP-035/RBAC authority permits. Reuse `access.membership.*`,
  `access.role_assignment.*`, `access.effective_permissions.*`, and `access.audit.read` with current
  trusted scope, delegation-ceiling, and privilege-escalation protections. This is a focused Store
  experience over canonical Access Control authority, not a second access-control domain.

## Primary workflows

1. Select an authorized outlet context and inspect its operational summary.
2. Find an item and change availability with visible pending/result/conflict handling.
3. Review assortment membership without changing Catalog identity.
4. Execute a permitted operating-status transition with consequence confirmation.
5. Edit/validate weekly hours and closed days.
6. Inspect/manage PIN-authoritative Serviceability within permission and scope.
7. Review outlet Team members and administer permitted membership/access changes within the
   manager's effective outlet scope and delegation ceiling.

## Reused authority and implications

Reuse accepted Brand/Outlet hierarchy, workforce session, effective permissions/scope, Catalog/Menu,
assortment/availability, outlet operating state, schedules, and Serviceability. Existing transports
and schemas are expected to remain authoritative; a future architecture gate must inventory actual
commands/projections before promising UI. This plan adds no endpoints, bulk semantics, persistence,
geospatial policy, roles, or permissions.

IMP-036G may expose the same canonical access authority through richer hierarchy-wide governance
workflows; IMP-036E does not duplicate or supersede it.

## Delivery settings ownership (planned amendment — IMP-036B correction)

IMP-036E will provide task-oriented Store Operations UI for delivery configuration using the same
Serviceability authority created in IMP-036B:

- outlet delivery enabled/disabled (via existing operating/Serviceability authorities)
- service origin coordinates
- maximum service distance
- temporary delivery controls where accepted authority supports them

Repository-native administration exists before IMP-036E UI (`setOutletServiceabilityDistancePolicy`,
`npm run serviceability:set-distance-policy`). This amendment does not activate IMP-036E.

## Responsive, accessibility, and state requirements

Desktop/tablet-first with mobile usability for status and availability tasks. Target WCAG 2.2 AA:
keyboard-operable tables/forms, semantic validation, focus-managed confirmation, announced mutation
results, and non-color status indicators.

Cover loading, no assortment/coverage, errors/retry, 401, scope-safe 403/404, stale outlet state,
concurrent schedule/availability/status changes, pending/success/failure, unavailable transitions,
and destructive/high-impact confirmation. Use safe IMP-036 correlation where applicable.

## Enterprise UX comprehension (PLANNED)

```text
ENTERPRISE_UX_IS_TASK_ORIENTED = YES
```

Store operations plus outlet Team and Access must be comprehensible without domain or API
architecture knowledge. Require plain-language purpose, a clear primary task, human-readable
names/context rather than opaque IDs, understandable outlet/scope, progressive disclosure, useful
empty states with a next action, explained mutation consequences, task-oriented navigation, and
user-language loading/error/recovery. This amendment does not activate IMP-036E.

## Major acceptance criteria

- Outlet context and permission/scope are always visible and server-enforced.
- Assortment, availability, Catalog/Menu identity, hours, operating status, and Serviceability are
  presented as distinct accepted concepts.
- Mutations preserve accepted validation/concurrency/audit behavior and recover from stale state.
- Serviceability stays PIN-authoritative; no map implies coverage truth.
- Authorized outlet/franchise managers can administer only their outlet workforce through existing
  membership, assignment, effective-permission, and audit authority.
- Responsive/accessibility/recovery and exact-candidate Founder UAT checks pass.

## Dependencies, non-goals, and deferred decisions

Depends on IMP-036A/D and accepted outlet/commerce/serviceability/IMP-035 access authority.
Non-goals: new outlet lifecycle, bulk mutation without existing authority, geospatial polygons,
provider choice, schema, new permissions/roles, a duplicate access-control domain, hierarchy-wide
Admin replacement, or analytics. Exact commands and any transport gaps are deferred to the
architecture gate.

Figma is not required initially; visual refinements may not change outlet, permission, mutation, or
Serviceability semantics.
