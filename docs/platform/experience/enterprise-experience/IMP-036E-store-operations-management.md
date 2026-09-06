---
Status: ARCHITECTURE_IN_PROGRESS EXPERIENCE CONTRACT
Capability: IMP-036E — Store Operations Management
Lifecycle: ARCHITECTURE_IN_PROGRESS
Architecture: NOT_LOCKED
Implementation: NOT_AUTHORIZED / NOT_STARTED
Founder UAT required: YES
IMP-036E_ARCHITECTURE_WORK_AUTHORIZED: YES
IMP-036E_ARCHITECTURE_LOCKED: NO
IMP-036E_IMPLEMENTATION_AUTHORIZED: NO
IMP-036E_STARTED: NO
IMP-036E_IMPLEMENTATION_COMPLETE: NO
IMP-036E_ACCEPTED: NO
IMP-036E_FOUNDER_UAT_REQUIRED: YES
D374_CREATED: NO
ARCH_R20_CREATED: NO
---

# IMP-036E — Store Operations Management

## Purpose, users, and problem

Give authorized outlet managers and operators one coherent management workspace over existing
outlet-scoped operational capabilities. Current controls are fragmented and do not clearly separate
assortment, availability, operating status, hours, and Serviceability.

## Architecture activation status (GTM-R109 / STATE-R107)

```text
IMP-036E_ARCHITECTURE_WORK_AUTHORIZED = YES
IMP-036E_ARCHITECTURE_LOCKED = NO
IMP-036E_IMPLEMENTATION_AUTHORIZED = NO
IMP-036E_STARTED = NO
IMP-036E_IMPLEMENTATION_COMPLETE = NO
IMP-036E_ACCEPTED = NO
IMP-036E_FOUNDER_UAT_REQUIRED = YES
D374_CREATED = NO
ARCH_R20_CREATED = NO
```

This document remains a working architecture/experience input. It is **not** a locked capability
architecture. Architecture analysis is authorized; architecture lock, implementation authorization,
implementation start, D-374, and ARCH-R20 are **not** authorized by this activation.

## Serviceability authority alignment (accepted IMP-036B — not a new decision)

Stale planning language that treated Serviceability as PIN/postal-code authoritative is corrected to
align with already accepted IMP-036B authority. This is source alignment, not a new Serviceability
decision.

```text
SERVICEABILITY_MODEL = OUTLET_DISTANCE_SERVICEABILITY_V1
SERVICEABILITY_COORDINATE_AUTHORITY = YES
SERVICEABILITY_POSTAL_PIN_RUNTIME_AUTHORITY = NO
SERVICEABILITY_POSTAL_PIN_METADATA_ONLY = YES
SERVICEABILITY_MAP_IS_PROJECTION_ONLY = YES
```

Accepted runtime semantics preserved:

- precise coordinates are geographic authority
- outlet service origin coordinates + maximum service distance form the distance policy
- server-side geographic distance determines geographic eligibility
- PIN/postal code is address metadata only
- legacy PIN tables are not runtime Serviceability authority
- a Store map, if later approved, may visualize configuration/evidence but MUST NOT become geographic
  authority

Do not introduce polygons, geofences-as-authority, Google/Routes/PostGIS as Serviceability authority,
or PIN fallback authority. Exact transport/UI mutation architecture for distance-policy management
remains open for the architecture gate.

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
- **Serviceability:** manage accepted `OUTLET_DISTANCE_SERVICEABILITY_V1` distance policy (service
  origin coordinates + maximum service distance) within permission and scope; postal/PIN remains
  metadata only; any future map is a projection, never geographic authority.
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
6. Inspect/manage accepted distance-policy Serviceability (coordinates + max distance) within
   permission and scope; do not treat PIN/postal code as runtime Serviceability truth.
7. Review outlet Team members and administer permitted membership/access changes within the
   manager's effective outlet scope and delegation ceiling.

## Reused authority and implications

Reuse accepted Brand/Outlet hierarchy, workforce session, effective permissions/scope, Catalog/Menu,
assortment/availability, outlet operating state, schedules, and Serviceability
(`OUTLET_DISTANCE_SERVICEABILITY_V1`). Existing transports and schemas are expected to remain
authoritative; a future architecture gate must inventory actual commands/projections before promising
UI. This plan adds no endpoints, bulk semantics, persistence, geospatial policy, roles, or
permissions.

Repository-native administration exists before IMP-036E UI (`setOutletServiceabilityDistancePolicy`,
`npm run serviceability:set-distance-policy`). Activation does not invent Store APIs or decide
whether workforce/admin HTTP transport already covers distance-policy mutation.

IMP-036G may expose the same canonical access authority through richer hierarchy-wide governance
workflows; IMP-036E does not duplicate or supersede it.

## Delivery settings ownership (aligned to accepted IMP-036B)

IMP-036E may eventually provide task-oriented Store Operations UI for delivery configuration using
the same Serviceability authority accepted in IMP-036B:

- outlet delivery enabled/disabled (via existing operating/Serviceability authorities)
- service origin coordinates (geographic authority)
- maximum service distance
- temporary delivery controls where accepted authority supports them
- postal/PIN as address metadata only (never runtime Serviceability authority)

Exact mutation transport and UI architecture remain open for the architecture gate.

## Open architecture work (authorized for analysis; not locked)

Architecture work must inventory actual repository authority for:

A. Store Overview projections / outlet identity / operating state / schedules / warnings
B. Availability commands, transport, concurrency, audit, and whether safe bulk mutation exists
C. Assortment membership authority vs Catalog/Menu identity
D. Operating-status transitions and permission gates
E. Hours schedule aggregate/schema, validation, timezone, closed-day semantics
F. Serviceability distance-policy read/write authority and existing transports (no PIN runtime
   authority)
G. Team / Access reuse of IMP-035 membership, role assignment, effective permissions, audit,
   delegation ceiling, and privilege-escalation protections
H. Which UI capabilities can reuse `/api/operations/v1/*` and `/api/admin/v1/*` vs bounded new
   routes under existing authority (do not create routes at activation)
I. Schema inventory first — do not lock `SCHEMA_CHANGE_REQUIRED` at activation without conclusive
   repository evidence
J. RBAC reuse — do not create a Store Manager role or new permissions at activation

## Responsive, accessibility, and state requirements

Desktop/tablet-first with mobile usability for status and availability tasks. Target WCAG 2.2 AA:
keyboard-operable tables/forms, semantic validation, focus-managed confirmation, announced mutation
results, and non-color status indicators.

Cover loading, no assortment/coverage, errors/retry, 401, scope-safe 403/404, stale outlet state,
concurrent schedule/availability/status changes, pending/success/failure, unavailable transitions,
and destructive/high-impact confirmation. Use safe IMP-036 correlation where applicable.

## Enterprise UX comprehension (ARCHITECTURE_IN_PROGRESS)

```text
ENTERPRISE_UX_IS_TASK_ORIENTED = YES
```

Store operations plus outlet Team and Access must be comprehensible without domain or API
architecture knowledge. Require plain-language purpose, a clear primary task, human-readable
names/context rather than opaque IDs, understandable outlet/scope, progressive disclosure, useful
empty states with a next action, explained mutation consequences, task-oriented navigation, and
user-language loading/error/recovery.

## Major acceptance criteria

- Outlet context and permission/scope are always visible and server-enforced.
- Assortment, availability, Catalog/Menu identity, hours, operating status, and Serviceability are
  presented as distinct accepted concepts.
- Mutations preserve accepted validation/concurrency/audit behavior and recover from stale state.
- Serviceability remains `OUTLET_DISTANCE_SERVICEABILITY_V1` with coordinates authoritative;
  postal/PIN is metadata only; no map implies coverage truth.
- Authorized outlet/franchise managers can administer only their outlet workforce through existing
  membership, assignment, effective-permission, and audit authority.
- Responsive/accessibility/recovery and exact-candidate Founder UAT checks pass.

## Dependencies, non-goals, and deferred decisions

Depends on IMP-036A/D and accepted outlet/commerce/serviceability/IMP-035 access authority.
Non-goals: new outlet lifecycle, bulk mutation without existing authority, geospatial polygons,
PIN-based Serviceability, provider choice, schema, new permissions/roles, a duplicate access-control
domain, hierarchy-wide Admin replacement, analytics, implementation, UI/API coding, DB migration,
new decision number, or global architecture bump. Exact commands and any transport gaps are deferred
to the architecture gate. IMP-036G remains the richer hierarchy-wide Administration Console slice.

Figma is not required initially; visual refinements may not change outlet, permission, mutation, or
Serviceability semantics.
