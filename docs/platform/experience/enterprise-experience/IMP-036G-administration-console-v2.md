---
Status: SUPPORTING planning/product-experience input (not PD-1 Product Definition; not architecture authority)
Capability: IMP-036G — Administration Console V2
Current product slice: YES (see ROADMAP/STATE; IMP036G_ACTIVATED: YES)
Formal ROADMAP lifecycle: IMPLEMENTATION_IN_PROGRESS
Product Definition: APPROVED / Gate PASS
  PD-IMP-036G-DRAFT-2
  Founder product decisions: RESOLVED (7/7; 2026-09-16)
Architecture Fit: PASS
Architecture: LOCKED
Implementation: AUTHORIZED / STARTED
Founder UAT required: YES
Capability architecture authority:
  docs/platform/capabilities/IMP-036G-administration-console-v2.md
---

# IMP-036G — Administration Console V2

## Purpose, users, and problem

Turn accepted IMP-035 administration capabilities into a coherent enterprise administration product
for platform and brand administrators. The existing experience is minimum viable and needs clearer
hierarchy, access workflow safety, auditability, and separation from Customer and Operations.

Canonical intended behaviour is owned by the Product Definition
[`product/IMP-036G/product-definition.md`](../../product/IMP-036G/product-definition.md)
(`PD-IMP-036G-DRAFT-2`). This file is supporting planning input only and must not contradict that
Product Definition.

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

- **Overview:** truthful useful operational context covering organization/hierarchy or outlet
  context, membership-lifecycle attention, recent access changes, and relevant safe operational
  health — derived from authoritative existing domains (mandatory for IMP-036G; not deferred).
- **Organization:** hierarchy visualization, list/detail, create/update with stale-write protection,
  scalable discoverability beyond the historical 200-item projection cap, and safe lifecycle
  controls where IMP-035 authority provides them.
- **Memberships:** accepted invited/active/suspended/revoked/expired presentation and transitions,
  including an authorized **Expire** affordance for eligible invited memberships; scalable
  discoverability beyond 200.
- **Role assignments:** accepted system roles, explicit scope, safe grant/revoke; no arbitrary
  permission editor.
- **Effective permissions:** diagnostic that inspects authoritative effective permissions for a
  **managed subject/principal** (not caller-only as sufficient desired state); read-only; not a
  permission editor.
- **Audit:** server-side actor, action, and date/time-range investigation filtering over the
  authoritative eligible set, with scalable discoverability beyond 200; append-only.

Administration stays distinct from Operations. An authorized “Open Operations” affordance is
permitted as navigation; Admin does not become an all-purpose workforce dashboard.

## Primary workflows

1. Enter an authorized administration scope and understand current organization context via a useful
   Overview.
2. Browse hierarchy (including records beyond the first 200) and execute accepted create/update/
   lifecycle actions safely, with stale-write protection on hierarchy edits.
3. Review and transition memberships through accepted states, including Expire for invited.
4. Grant/revoke an accepted role at an explicit scope and inspect the managed member’s resulting
   effective permissions.
5. Investigate relevant audit events with server-side actor/action/date filters and safe
   operational status.
6. On small-mobile viewport, safely perform mandatory high-consequence V1 actions (suspend/revoke/
   expire membership; grant/revoke role; deactivate supported organization resource) with
   functional parity for those journeys (layout need not match desktop).

## Reused authority and implications

Reuse D-373, ARCH-G25, accepted IMP-035 `/api/admin/v1/*` transport, workforce principal/session,
system roles, resource hierarchy, membership/assignment/permission projections, audit, and IMP-036
operational status. The operations process may remain the host, but Admin and Operations retain
distinct transport and experience boundaries.

Architecture Fit result (supporting summary only — technical authority is the locked capability
architecture):

```text
NEW_SERVICE: NO
NEW_AUTH_MODEL: NO
NEW_ROLE: NO
NEW_PERMISSION: NO
NEW_RBAC_SEMANTICS: NO
API_EXTENSION_REQUIRED: YES
SCHEMA_OR_DATA_CONTRACT_CHANGE: YES
MIGRATION_REQUIRED: YES
DESTRUCTIVE_MIGRATION_REQUIRED: NO
D374_REQUIRED_FOR_LOCK: NO
ARCH_R20_REQUIRED: NO
```

Technical mechanisms (managed-subject EP, Overview projection, Ops status reuse, audit filters,
authorized-set cursor continuation, hierarchy revision/CAS, Expire mapping, mobile parity) are
locked in
[`docs/platform/capabilities/IMP-036G-administration-console-v2.md`](../../capabilities/IMP-036G-administration-console-v2.md).
This experience document must not compete with that lock. Hidden controls never substitute for
server-side and direct-URL authorization. Sensitive principal/access/audit data is minimized.
Architecture lock does not authorize implementation.

## Responsive, accessibility, and state requirements

Desktop may provide the richer administration layout. Small-mobile MUST support safe functional
parity for mandatory high-consequence V1 actions listed above. Target WCAG 2.2 AA with keyboard
hierarchy/data navigation, semantic tables or alternate lists, visible focus, accessible
drawers/dialogs, announced validation/mutation results, and non-color lifecycle/status
communication.

Cover loading, empty hierarchy/membership/audit, end-of-collection / more-results states, errors/
retry, session expiry, scope-safe 403/non-disclosing 404, stale-write conflict recovery with
reload/review/retry, pending/success/failure, unavailable actions, and explicit confirmation for
privilege/lifecycle consequences. Use safe IMP-036 correlation without disclosing system secrets.

## Enterprise UX comprehension (PLANNED)

```text
ENTERPRISE_UX_IS_TASK_ORIENTED = YES
```

Organization hierarchy, Resources, Memberships, Roles, Effective Permissions, and Audit require
understandable terminology, hierarchy context, and safe guided workflows. Users must not need domain
or API architecture knowledge. Require plain-language purpose, a clear primary task, human-readable
names/context rather than opaque IDs, understandable Brand/Outlet/Scope, progressive disclosure,
useful empty states with a next action, explained privilege/lifecycle consequences, and no raw JSON
as normal UX. This planned amendment does not redefine activation; CURRENT activation is owned by ROADMAP/STATE.

## Major acceptance criteria

- Administration has a distinct shell and IA with no customer presentation.
- Hierarchy, memberships, assignments, managed-subject effective permissions, and audit reflect
  accepted authority and Founder-resolved IMP-036G product requirements.
- Role grants/revokes show scope and consequence and reject stale/unauthorized mutation safely.
- Hierarchy updates detect stale writes (no silent last-writer-wins as V1 target).
- Collections support discoverability beyond the historical 200-item cap; Audit supports server-side
  actor/action/date filters.
- Expire is available for eligible invited memberships.
- No arbitrary permission editor, implicit superuser behavior, or Operations authority bleed exists.
- Operational status is safe for the authorized audience.
- Responsive/accessibility/recovery and exact-candidate Founder UAT checks pass.

## Dependencies, non-goals, and deferred decisions

Depends on IMP-036A, accepted IMP-035/036, and mature enterprise primitives from IMP-036D–F.
Non-goals: custom roles; arbitrary permission editor/grants; new tenancy/auth model; new roles/
permissions unless Architecture Fit discovers an unavoidable requirement and escalates; new
deployable service unless Fit escalates; customer-account administration; secrets/provider
credential console; commercial-management duplication; Operations workflow duplication; analytics
programme; workforce-dashboard consolidation; hard delete of hierarchy resources; four-eyes
approval; generic review-token/workflow engine.

Founder product decisions (2026-09-16) expanded IMP-036G only enough to complete the seven
administration outcomes above. Technical mechanism selection is recorded in the locked capability
architecture. Product Definition Gate = PASS; Architecture Fit = PASS; Architecture: LOCKED;
implementation AUTHORIZED / STARTED (GTM-R128 / STATE-R126; not complete; not accepted).

Figma is not required initially; later visual refinement may not redefine hierarchy, membership,
RBAC, audit, API, or system authority.
