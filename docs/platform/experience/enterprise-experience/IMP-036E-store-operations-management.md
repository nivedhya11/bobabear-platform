---
Status: ARCHITECTURE_LOCKED SUPPORTING EXPERIENCE CONTRACT
Capability: IMP-036E — Store Operations Management
Lifecycle: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
Architecture: LOCKED
Implementation: AUTHORIZED / STARTED / COMPLETE
Founder UAT required: YES
Founder UAT: NOT_STARTED
IMP-036E_ARCHITECTURE_WORK_AUTHORIZED: YES
IMP-036E_ARCHITECTURE_LOCKED: YES
IMP-036E_IMPLEMENTATION_AUTHORIZED: YES
IMP-036E_STARTED: YES
IMP-036E_IMPLEMENTATION_COMPLETE: YES
IMP-036E_ACCEPTED: NO
IMP-036E_FOUNDER_UAT_REQUIRED: YES
pendingAcceptance = IMP-036E
Authority: SUPPORTING EXPERIENCE CONTRACT — locked capability architecture at
  docs/platform/capabilities/IMP-036E-store-operations-management.md is CURRENT authority
D374_CREATED: NO
D-374_CREATED: NO
ARCH_R20_CREATED: NO
ARCH_R20_REQUIRED: NO
---

# IMP-036E — Store Operations Management

## Purpose, users, and problem

Give authorized outlet managers and operators one coherent management workspace over existing
outlet-scoped operational capabilities. Current controls are fragmented and do not clearly separate
assortment, availability, operating status, hours, and Serviceability.

This document is a **SUPPORTING** experience contract. It must not compete with or override the
locked capability architecture at
[`../../capabilities/IMP-036E-store-operations-management.md`](../../capabilities/IMP-036E-store-operations-management.md).
The capability artifact is the sole CURRENT IMP-036E capability architecture authority.

## Architecture lock status (GTM-R113 / STATE-R111)

```text
IMP-036E_ARCHITECTURE_WORK_AUTHORIZED = YES
IMP-036E_ARCHITECTURE_LOCKED = YES
IMP-036E_IMPLEMENTATION_AUTHORIZED = YES
IMP-036E_STARTED = YES
IMP-036E_IMPLEMENTATION_COMPLETE = YES
IMP-036E_ACCEPTED = NO
IMP-036E_FOUNDER_UAT_REQUIRED = YES
IMP-036E_FOUNDER_UAT = NOT_STARTED
pendingAcceptance = IMP-036E
D374_CREATED = NO
D-374_CREATED = NO
ARCH_R20_CREATED = NO
ARCH_R20_REQUIRED = NO
```

Implementation complete pending acceptance recorded at GTM-R113 / STATE-R111. Completion is not
acceptance. Founder UAT remains required and has not been performed.

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
IMP036E_SERVICEABILITY_ROUTING_PRIORITY_UI = HIDDEN_PREREQUISITE
IMP036E_SERVICEABILITY_MAP = OPTIONAL_PROJECTION_ONLY
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
or PIN fallback authority. Routing-priority Store editor remains hidden/prerequisite in V1. Map is
optional projection only and not required for V1 acceptance.

## Founder boundary — Assortment authorization (capability-local; not D-374)

Resolved architecture-gate stop: preserve Brand Assortment authority. This is Founder policy for
IMP-036E architecture work. It does **not** create `D-374`, bump `ARCH-R20`, remap permissions,
add permissions, or change scope semantics.

```text
IMP036E_ASSORTMENT_AUTHORITY = BRAND
ASSORTMENT_PERMISSION_TARGET_KIND = brand
ASSORTMENT_READ_PERMISSION = assortment.read
ASSORTMENT_MANAGE_PERMISSION = assortment.manage
OUTLET_MANAGER_OUTLET_SCOPE_ASSORTMENT_MANAGE = NO
OUTLET_MANAGER_OUTLET_SCOPE_ASSORTMENT_READ_AS_BRAND_AUTHORITY = NO
OUTLET_SCOPED_OUTLET_MANAGER_GAIN_ASSORTMENT_MANAGE_VIA_IMP036E = NO
OUTLET_EFFECTIVE_ASSORTMENT_PRESENTATION = AUTHORIZED_READ_OR_ESCALATE
IMP036E_ASSORTMENT_WORKFORCE_TRANSPORT = READ_ONLY_OPERATIONS_PROJECTION
IMP036E_ASSORTMENT_MANAGE_TRANSPORT = NO
ASSORTMENT_ROUTE_RESOURCE_LOCATOR = OUTLET
ASSORTMENT_AUTHORIZATION_RESOURCE = BRAND_DERIVED_FROM_OUTLET
ASSORTMENT_MANAGE_ROUTE_IMP036E = NO
CALLER_BRAND_AUTHORITY = NONE
CALLER_OUTLET_SCOPE_IS_NOT_ASSORTMENT_AUTHORITY = YES
SILENT_PERMISSION_REMAP = NO
NEW_PERMISSION = NO
NEW_ASSORTMENT_PERMISSION = NO
NEW_ASSORTMENT_ROLE = NO
NEW_ASSORTMENT_SCOPE_MODEL = NO
NEW_SCOPE_SEMANTICS = NO
IMP036E_RBAC_CATALOG_RECONCILIATION_FOLLOW_UP = YES
IMP036E_LOCK_BLOCKED_BY_CATALOG_RECONCILIATION = NO
D374_CREATED_FOR_THIS_BOUNDARY = NO
ARCH_R20_CREATED_FOR_THIS_BOUNDARY = NO
```

Binding implications for Store Operations architecture:

- `assortment.read` / `assortment.manage` remain Brand-targeted authority under existing Access
  Control (`PERMISSION_TARGET_KIND` and `requireAssortmentRead` / `requireAssortmentManage`).
- An outlet-scoped `OUTLET_MANAGER` does **not** gain Assortment management authority through
  IMP-036E. Existing role-mapping inventory that lists those keys on `outlet_manager` with
  `exact` inheritance is **not** reinterpreted as outlet Assortment authority and must not be
  silently remapped.
- Store Assortment experience: effective Assortment may be loaded through the authorized read-only
  Operations projection `GET /api/operations/v1/outlets/{outletId}/assortment` (Outlet locator →
  server-derived Brand authorization via `assortment.read`). There is **no** Store Assortment manage
  route. Unauthorized actors receive escalation / read-unavailable UX (no fake manage affordance;
  no client-side permission invention).
- Availability and operating controls remain outlet-local under existing `availability.*` and
  `outlet.operating_*` permissions.
- Catalog/Menu identity remains distinct from Assortment; IMP-036E must not conflate them.

## Permission UX (global caps ≠ resource authority)

```text
IMP036E_GLOBAL_SESSION_CAPS_ARE_RESOURCE_AUTHORITY = NO
IMP036E_GLOBAL_SESSION_CAPS_PURPOSE = COARSE_NAVIGATION_ONLY
IMP036E_RESOURCE_SCOPED_CONTROL_VISIBILITY = REQUIRED
IMP036E_SERVER_AUTHORIZATION_REMAINS_AUTHORITATIVE = YES
IMP036E_SESSION_CAPABILITY_PROJECTION_EXTENSION = EXISTING_PERMISSION_KEYS_ONLY
```

- Global portal/session capability booleans are coarse navigation hints only.
- Enabled controls for a selected Outlet require resource-scoped permission evaluation.
- Assortment visibility is Brand-authorized (Brand derived from selected Outlet), not inferred from
  global session caps or Outlet effective-permission unions.
- No role-name inference. Server authorization remains authoritative.

## Locked architecture conclusions (summary)

```text
IMP036E_STORE_OVERVIEW = PERMISSION_GATED_COMPOSITION
IMP036E_BULK_AVAILABILITY = DEFERRED
IMP036E_SESSION_CAPABILITY_PROJECTION_EXTENSION = EXISTING_PERMISSION_KEYS_ONLY
IMP036E_GLOBAL_SESSION_CAPS_ARE_RESOURCE_AUTHORITY = NO
IMP036E_GLOBAL_SESSION_CAPS_PURPOSE = COARSE_NAVIGATION_ONLY
IMP036E_RESOURCE_SCOPED_CONTROL_VISIBILITY = REQUIRED
IMP036E_SERVER_AUTHORIZATION_REMAINS_AUTHORITATIVE = YES
IMP036E_ASSORTMENT_WORKFORCE_TRANSPORT = READ_ONLY_OPERATIONS_PROJECTION
ASSORTMENT_AUTHORIZATION_RESOURCE = BRAND_DERIVED_FROM_OUTLET
ASSORTMENT_MANAGE_ROUTE_IMP036E = NO
SCHEMA_CHANGE_REQUIRED = NO
NEW_PERMISSION = NO
NEW_ROLE = NO
NEW_SCOPE_MODEL = NO
D374_REQUIRED_FOR_IMP036E_LOCK = NO
D-374_CREATED = NO
ARCH_R20_REQUIRED_FOR_IMP036E_LOCK = NO
```

- Overview is permission-gated composition across authorized projections (no mega DTO, no invented
  KPI, no persisted dashboard/warning/effective-status state).
- Availability reuses existing variant/modifier-option commands and states; bulk availability is
  deferred.
- Operating Status reuses IMP-014 outlet operating commands — not service health
  `/operational-status`.
- Hours reuse existing operating profile/schedule authority (IANA timezone; day intervals; closed
  day = absence of intervals).
- Serviceability remains `OUTLET_DISTANCE_SERVICEABILITY_V1`; Store V1 hides routing-priority editor.
- Team / Access reuse `/api/admin/v1/*` (D-373); Store operational config uses bounded
  `/api/operations/v1/outlets/{outletId}/...` (D-372), including read-only Assortment projection.
- Session capability projection may add existing permission keys for coarse navigation only; global
  booleans are not selected-resource authority; selected-resource control visibility is required.
- No schema change; no new permission/role/scope; no D-374; no ARCH-R20.
- Implementation is **AUTHORIZED** / **STARTED** / **COMPLETE** pending acceptance
  (`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`). Completion is **not** acceptance. Founder UAT
  remains required and has **not** been performed. IMP-036F remains unactivated.

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
  supports it, unavailable items, and serviceability/operational warnings — permission-gated
  composition only.
- **Availability:** efficient item search/filter and individual mutation; bulk behavior deferred
  (`IMP036E_BULK_AVAILABILITY = DEFERRED`).
- **Assortment:** present what an outlet offers as distinct from canonical Catalog/Menu identity;
  load effective Assortment through authorized read-only Operations projection when Brand
  `assortment.read` is satisfied; mutations remain Brand-permissioned and there is no Store
  Assortment manage route (no outlet-scoped Assortment manage via IMP-036E).
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
3. Where authorized, review effective Assortment context via the read-only Operations projection
   without changing Catalog identity; otherwise show read-only/escalation (no Assortment manage
   for outlet-scoped OUTLET_MANAGER; no Store Assortment manage route).
4. Execute a permitted operating-status transition with consequence confirmation.
5. Edit/validate weekly hours and closed days.
6. Inspect/manage accepted distance-policy Serviceability (coordinates + max distance) within
   permission and scope; do not treat PIN/postal code as runtime Serviceability truth.
7. Review outlet Team members and administer permitted membership/access changes within the
   manager's effective outlet scope and delegation ceiling.

## Reused authority and implications

Reuse accepted Brand/Outlet hierarchy, workforce session, effective permissions/scope, Catalog/Menu,
assortment/availability, outlet operating state, schedules, and Serviceability
(`OUTLET_DISTANCE_SERVICEABILITY_V1`). Existing transports and schemas remain authoritative under the
locked capability architecture. This plan adds no bulk semantics, geospatial policy, roles, or
permissions beyond locked bounded Operations transport extensions.

Repository-native administration exists before IMP-036E UI (`setOutletServiceabilityDistancePolicy`,
`npm run serviceability:set-distance-policy`). Lock decides Store operational config uses bounded
Operations transport and Team continues on Admin façade.

IMP-036G may expose the same canonical access authority through richer hierarchy-wide governance
workflows; IMP-036E does not duplicate or supersede it.

## Delivery settings ownership (aligned to accepted IMP-036B)

IMP-036E may provide task-oriented Store Operations UI for delivery configuration using the same
Serviceability authority accepted in IMP-036B:

- outlet delivery enabled/disabled (via existing operating/Serviceability authorities)
- service origin coordinates (geographic authority)
- maximum service distance
- temporary delivery controls where accepted authority supports them
- postal/PIN as address metadata only (never runtime Serviceability authority)

Routing-priority Store editor remains `HIDDEN_PREREQUISITE` in V1.

## Responsive, accessibility, and state requirements

Desktop/tablet-first with mobile usability for status and availability tasks. Target WCAG 2.2 AA:
keyboard-operable tables/forms, semantic validation, focus-managed confirmation, announced mutation
results, and non-color status indicators.

Cover loading, no assortment/coverage, errors/retry, 401, scope-safe 403/404, stale outlet state,
concurrent schedule/availability/status changes, pending/success/failure, unavailable transitions,
and destructive/high-impact confirmation. Use safe IMP-036 correlation where applicable.

## Enterprise UX comprehension

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
  presented as distinct accepted concepts; Assortment manage remains Brand-targeted and is not
  granted to outlet-scoped OUTLET_MANAGER through IMP-036E.
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
domain, hierarchy-wide Admin replacement, analytics, or global architecture bump. Bulk availability,
Assortment outlet-scope remapping, routing-priority Store editor, and required Serviceability map
remain deferred/not-in-V1. IMP-036G remains the richer hierarchy-wide Administration Console slice.

Figma is not required initially; visual refinements may not change outlet, permission, mutation, or
Serviceability semantics.

## Founder-approved UAT-readiness visual direction (presentation only)

```text
THEME_COUNT = 1
PRIMARY_THEME = DARK
LIGHT_THEME = REMOVED / NOT_SUPPORTED
SYSTEM_THEME_SWITCHING = NO
USER_THEME_TOGGLE = NO
FOUNDER_APPROVED_UAT_READINESS_VISUAL_DIRECTION = DARK_ONLY
```

## Customer commerce cohesion (IMP-036E remediation; not acceptance)

Store Operations mutations that affect existing customer orderability must converge through
the same accepted domain authorities at the next authoritative customer evaluation. This is
not a new domain authority and does not activate IMP-036F.

```text
WORKFORCE_MUTATION → EXISTING_DOMAIN_AUTHORITY → CUSTOMER_READ/EVALUATION → TRUTHFUL_CUSTOMER_EXPERIENCE
SELECTED_OUTLET = SERVER_DERIVED_FROM_SERVICEABILITY
CALLER_SELECTED_OUTLET_ID = NOT_GEOGRAPHIC_AUTHORITY
REALTIME_PUSH_GUARANTEE = NO
TEAM_ACCESS_CUSTOMER_COUPLING = NO
STORE_OVERVIEW_AUTOMATIC_CUSTOMER_MUTATION = NO
```

- When delivery coordinates exist, customer Menu projection uses `selectedOutletId` returned
  by server Serviceability evaluation — never a browser-stored outlet default.
- Variant availability, assortment exclusions, and modifier availability/feasibility compose
  into outlet-aware Menu display using existing IMP-014 / IMP-028B / IMP-028C projection
  semantics.
- Operating status and service radius changes surface through fresh Serviceability and cart/
  checkout re-evaluation; bounded refresh on location change and page focus is sufficient.
- Team / Access and presentation-only Overview facts remain workforce-only unless an existing
  accepted authority already requires customer effect.

BOBA Bear’s Night Forest dark theme (Firefly Green primary interactions, Saffron Gold accents,
Boba Cream text) is the **only currently supported runtime theme** for the product, including Store
Operations and shared customer/enterprise chrome.

This is **presentation / experience policy only**. It does **not** change domain behaviour, RBAC,
Assortment authority, Serviceability authority, financial/payment semantics, persistence,
API contracts, schema, or IMP lifecycle acceptance. It does **not** activate IMP-036F and does
**not** constitute Founder UAT.

Light mode and system-preference theme negotiation are not part of current product behaviour.
Historical ordering design-lock language that preferred Boba Cream / light as a default visual
target (IMP-028D RC1) is superseded for **current runtime theme policy** by this Founder-approved
dark-only direction. Cream/light brand palette values may still exist as static brand scales; they
are not a second theme mode.

Agents must not reintroduce light/system theme switching, theme toggles, or dual semantic token
modes without a new explicit Founder/product decision.
