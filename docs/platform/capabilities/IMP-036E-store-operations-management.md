<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-036E",
  "title": "Store Operations Management",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "NOT_AUTHORIZED / NOT_STARTED",
  "implementationAuthorized": false,
  "founderUATRequired": true,
  "schemaChangeRequired": false,
  "lastReviewed": "2026-09-06",
  "bindingDecisions": ["D-358", "D-359", "D-372", "D-373"],
  "dependsOn": ["IMP-011", "IMP-014", "IMP-019", "IMP-029", "IMP-030", "IMP-035", "IMP-036B", "IMP-036D"]
}
-->

# IMP-036E — Store Operations Management

## Capability Architecture (ARCHITECTURE_LOCKED — IMPLEMENTATION NOT_AUTHORIZED)

This document is the **locked capability architecture** for IMP-036E. It is the sole CURRENT
capability-architecture authority for this slice. Supporting experience planning must not compete
with this lock.

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Lifecycle | `ARCHITECTURE_LOCKED` |
| Implementation | `NOT_AUTHORIZED` / `NOT_STARTED` |
| Implementation authorized | **NO** |
| Implementation complete | **NO** |
| Accepted | **NO** |
| Accepted product through | IMP-036D (unchanged) |
| Current product slice | IMP-036E |
| Pending acceptance | NONE |
| Next product slice | IMP-036F |
| Governance checkpoint | GTM-R110 / STATE-R108 |
| Founder UAT required for acceptance | **YES** |
| Schema change required | **NO** |
| New D-number | **NO** (`D-374` not created) |
| Global ARCH bump | **NO** (`ARCH-R19` preserved; `ARCH-R20` not created) |
| Decision register | DR-15 (unchanged) |

```text
IMP-036E: ARCHITECTURE_LOCKED
IMP-036E_ARCHITECTURE: LOCKED
IMP-036E_ARCHITECTURE_LOCKED: YES
IMP-036E_IMPLEMENTATION: NOT_AUTHORIZED / NOT_STARTED
IMP-036E_IMPLEMENTATION_AUTHORIZED: NO
IMP-036E_STARTED: NO
IMP-036E_IMPLEMENTATION_COMPLETE: NO
IMP-036E_ACCEPTED: NO
IMP-036E_FOUNDER_UAT_REQUIRED: YES
FOUNDER_UAT_REQUIRED: YES
FOUNDER_UAT_REQUIRED_FOR_ACCEPTANCE: YES
schema_change: NO
SCHEMA_CHANGE_REQUIRED: NO
provider_IO: NO
new_service: NO
new_queue: NO
new_broker: NO
new_auth_model: NO
NEW_PERMISSION: NO
NEW_ROLE: NO
NEW_SCOPE_MODEL: NO
D-374_CREATED: NO
D374_REQUIRED_FOR_IMP036E_LOCK: NO
ARCH_R20_REQUIRED_FOR_IMP036E_LOCK: NO
ARCH-R20_CREATED: NO
AUTHORIZATION IS NOT IMPLEMENTATION START: YES
IMPLEMENTATION_AUTHORIZED: NO
IMPLEMENTATION_STARTED: NO
```

Canonical authorities:

| Question | Authority |
|---|---|
| Why / Non-Goals | [`../VISION.md`](../VISION.md) |
| Binding decisions | [`../decision-register.md`](../decision-register.md) |
| Global architecture | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| IMP sequence / lifecycle | [`../ROADMAP.md`](../ROADMAP.md) |
| Accepted reality | [`../STATE.md`](../STATE.md) |
| This capability lock | **This document** |
| Supporting experience contract | [`../experience/enterprise-experience/IMP-036E-store-operations-management.md`](../experience/enterprise-experience/IMP-036E-store-operations-management.md) (SUPPORTING; must not override this lock) |

Layering (unchanged):

```text
UI → Operations/Admin Transport → Application Operations → Domain Authority → Persistence / Adapter
```

---

## 1. Purpose / product boundary

IMP-036E delivers a coherent Store Operations workspace over already accepted Outlet, Availability,
Operating, Serviceability, and Access Control authority.

Store IA remains:

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

It does **not** create:

- a second Store domain
- a second Assortment authority
- a second Access Control authority
- a second Serviceability authority
- Catalog/Menu identity
- new inventory authority
- new operational-state domain
- new geographic authority
- new deployable service

---

## 2. Preserved binding decisions

| Decision | Preservation |
|---|---|
| **D-358** | Existing system-role inventory / STATE ownership remains authoritative. No new Store role. |
| **D-359** | Static Next.js export + external Node transport. No dynamic Next.js business routes. |
| **D-372** | Store operational configuration uses bounded `/api/operations/v1/*` extensions. Server-derived workforce principal only. |
| **D-373** | Store Team / Access reuses `/api/admin/v1/*` on the same operations process. No duplicate Team Operations façade. |

Also preserved without new D-numbers: accepted IMP-011 Access Control, IMP-014 Assortment /
Availability / Operating authority, IMP-019 / IMP-036B Serviceability
(`OUTLET_DISTANCE_SERVICEABILITY_V1`), IMP-029 / IMP-030 Operations Console, IMP-035 Admin, and
IMP-036D workforce composition.

```text
D374_REQUIRED_FOR_IMP036E_LOCK = NO
D-374_CREATED = NO
ARCH_R20_REQUIRED_FOR_IMP036E_LOCK = NO
ARCH-R20_CREATED = NO
```

Do not invent a new D-number merely to restate this capability-local lock.

---

## 3. Founder-A Assortment boundary (locked)

Founder explicitly selected Option A.

```text
IMP036E_ASSORTMENT_AUTHORITY = BRAND
OUTLET_MANAGER_OUTLET_SCOPE_ASSORTMENT_MANAGE = NO
OUTLET_MANAGER_OUTLET_SCOPE_ASSORTMENT_READ_AS_BRAND_AUTHORITY = NO
OUTLET_EFFECTIVE_ASSORTMENT_PRESENTATION = AUTHORIZED_READ_OR_ESCALATE
IMP036E_ASSORTMENT_WORKFORCE_TRANSPORT = READ_ONLY_OPERATIONS_PROJECTION
IMP036E_ASSORTMENT_MANAGE_TRANSPORT = NO
ASSORTMENT_ROUTE_RESOURCE_LOCATOR = OUTLET
ASSORTMENT_AUTHORIZATION_RESOURCE = BRAND_DERIVED_FROM_OUTLET
ASSORTMENT_READ_PERMISSION = assortment.read
ASSORTMENT_MANAGE_ROUTE_IMP036E = NO
CALLER_BRAND_AUTHORITY = NONE
CALLER_OUTLET_SCOPE_IS_NOT_ASSORTMENT_AUTHORITY = YES
NEW_ASSORTMENT_PERMISSION = NO
NEW_ASSORTMENT_ROLE = NO
NEW_ASSORTMENT_SCOPE_MODEL = NO
IMP036E_RBAC_CATALOG_RECONCILIATION_FOLLOW_UP = YES
IMP036E_LOCK_BLOCKED_BY_CATALOG_RECONCILIATION = NO
```

Existing:

```text
assortment.read
assortment.manage
```

remain Brand-targeted. IMP-036E MUST NOT remap these permissions.

An Outlet-scoped exact `OUTLET_MANAGER` assignment does **not** acquire Brand Assortment authority
merely because the Store UI exists, because a global session permission union contains the key, or
because Outlet-scoped effective permissions include the key.

Store Assortment UI locality:

- selected resource for UI = Outlet
- authorization resource = Brand derived server-side from selected Outlet

Authorized Assortment Store transport is **read-only** under the existing D-372 Operations façade:

```text
GET /api/operations/v1/outlets/{outletId}/assortment
```

Authorization model:

```text
request outletId
→ load authoritative Outlet server-side
→ derive authoritative Brand from Outlet
→ require existing assortment.read against Brand
→ call/reuse existing Assortment read authority
→ return safe effective-assortment projection
```

No caller-supplied brand authorization, permission, role, scope, or authorized flag may become
authority. The route exists for Store UX locality only. It does **not** change Assortment Brand
authority.

The projection may expose only what is needed to truthfully show the effective Assortment for the
selected Outlet and may reuse/join safe display identity needed by Store UI. It MUST NOT:

- become Catalog/Menu identity authority
- create outlet-scoped Assortment authority
- expose Assortment manage to Outlet Manager
- bypass `requireAssortmentRead`
- call internal `authorize:false` from the HTTP boundary
- create a new permission, role, or scope model
- change existing narrowing rules
- create persistence

If the actor does not satisfy Brand `assortment.read`, return normal scope-safe denied/not-found
behavior according to existing Operations error conventions. The UI may then render the Founder-A
escalation / read-unavailable state.

```text
ASSORTMENT_MANAGE_ROUTE_IMP036E = NO
IMP036E_ASSORTMENT_MANAGE_TRANSPORT = NO
```

Do **not** invent a Store Assortment manage mutation route (no POST/PATCH/DELETE Assortment Store
route under IMP-036E).

Known catalog inconsistency: `OUTLET_MANAGER` currently contains `assortment.read` /
`assortment.manage` mappings even though exact Outlet scope cannot satisfy Brand-targeted
Assortment authority. Runtime fails closed. Catalog reconciliation is a non-blocking follow-up and
must not alter the permission catalog in this lock PR.

---

## 4. Store Overview — locked

```text
IMP036E_STORE_OVERVIEW = PERMISSION_GATED_COMPOSITION
```

Do **not** create one unconstrained mega DTO.

Overview is composed from authorized projections:

| Concern | Authority |
|---|---|
| Outlet identity/context | existing Admin Outlet authority |
| Operating profile/effective state | existing IMP-014 authority |
| Hours/schedule | existing IMP-014 authority |
| Serviceability distance configuration | existing IMP-019 / IMP-036B authority |
| Availability summary/list | bounded projection over existing IMP-014 authority |
| Team | existing IMP-035 Admin authority where authorized |
| Assortment | Founder-A Brand authority only |

Browser composition is preferred across permission-separated responses.

No invented KPI. No staffing KPI. No persisted dashboard state. No persisted warning state. No
persisted effective-status copy. If a derived warning can be computed truthfully from current
accepted facts it is a presentation/projection only.

---

## 5. Availability — locked

Reuse:

```text
getVariantAvailability
setVariantAvailability
getModifierOptionAvailability
setModifierOptionAvailability
```

States remain exactly:

```text
available
temporarily_unavailable
sold_out
```

No new availability state.

Default when no row: effective `available`.

`temporarily_unavailable`: `unavailableUntil` may be future or null for indefinite.

Expired temporary unavailability: effective `available`.

Permissions:

```text
availability.read
availability.manage
```

Target: Outlet.

Audit remains existing:

```text
availability.variant_changed
availability.modifier_option_changed
```

Concurrency remains current: last-write-wins. **NO** new `expectedRevision` model.

```text
IMP036E_BULK_AVAILABILITY = DEFERRED
```

Do not claim N client writes are an atomic bulk operation.

Store V1 supports coherent operational management of Variant availability and Modifier-option
availability. A bounded Operations read projection may join safe identifying/display metadata needed
to make the availability UI usable. That projection does **not** create Catalog management
authority.

---

## 6. Operating Status — locked

Do **not** use:

```text
GET /api/operations/v1/operational-status
```

as Outlet operating state. That route remains service/runtime health.

Reuse:

```text
findOutletOperatingProfile
resolveOutletOperatingState
pauseOutlet
resumeOutlet
suspendOutlet
unsuspendOutlet
```

Persisted control states remain:

```text
accepting
paused
suspended
```

Effective state may include:

```text
accepting
paused
suspended
closed_by_schedule
```

according to existing authority.

Permissions:

```text
outlet.operating_state.read
outlet.operating_state.pause
outlet.operating_state.suspend
```

Target: Outlet.

UI and HTTP mutation visibility MUST be effective-permission-derived.

Current mapping:

- `OUTLET_MANAGER`: pause/resume authority where effective; **NO** suspend/unsuspend authority
  merely by role
- Brand/Platform actors may have suspend permission where effective
- Never role-name bypass

---

## 7. Hours — locked

Reuse:

```text
configureOutletOperatingProfile
findOutletOperatingProfile
replaceOutletOperatingSchedule
listOutletOperatingIntervals
validateOperatingSchedule
```

Timezone: valid IANA timezone.

Schedule representation:

```text
dayOfWeek = 0..6
startMinute = 0..1439
endMinute = 1..1440
start < end
same-day intervals may not overlap
no single-row cross-midnight interval
```

Overnight hours are represented by intervals split across adjacent days.

Closed day: absence of intervals for that day within an otherwise valid non-empty weekly schedule.
No new closed-day flag.

Empty complete schedule remains invalid under current authority.

Operating profile must exist before schedule replacement.

Schedule replacement remains atomic under existing transaction semantics and existing audit.

Permissions:

```text
outlet.operating_schedule.read
outlet.operating_schedule.manage
```

Target: Outlet.

---

## 8. Serviceability — locked

```text
SERVICEABILITY_MODEL = OUTLET_DISTANCE_SERVICEABILITY_V1
SERVICEABILITY_COORDINATE_AUTHORITY = YES
SERVICEABILITY_POSTAL_PIN_RUNTIME_AUTHORITY = NO
SERVICEABILITY_POSTAL_PIN_METADATA_ONLY = YES
SERVICEABILITY_MAP_IS_PROJECTION_ONLY = YES
IMP036E_SERVICEABILITY_ROUTING_PRIORITY_UI = HIDDEN_PREREQUISITE
IMP036E_SERVICEABILITY_MAP = OPTIONAL_PROJECTION_ONLY
```

Reuse:

```text
getOutletServiceabilityConfiguration
setOutletServiceabilityDistancePolicy
```

Existing routing-priority authority remains unchanged.

Legacy PIN functions may remain in repository but MUST NOT become current runtime geographic
authority.

Distance policy:

```text
serviceOriginLatitude
serviceOriginLongitude
maxServiceDistanceMeters
```

Permissions:

```text
serviceability.read
serviceability.manage
```

Target: Outlet.

Concurrency remains: `expectedRevision`, row/config locking, revision increment, canonical no-op
without revision/audit increment.

Routing priority is **NOT** a primary Store Operations editor in V1. If distance configuration
cannot be changed because the underlying canonical Serviceability configuration/routing prerequisite
has not been established: fail safely / present escalation or configuration-required state. Do **not**
silently manufacture routing configuration.

A map is **NOT** required for IMP-036E V1 acceptance. Do not pull IMP-038 Maps/privacy hardening into
this slice.

---

## 9. Team / Access — locked

Reuse accepted IMP-035 / D-373 authority.

Store Team UI remains allowed to use `/api/admin/v1/*` even though it is presented within Store IA.

Do **not** create duplicate `/api/operations/v1/team/*` authority merely for route symmetry.

Reuse:

```text
GET /api/admin/v1/session
GET/POST /api/admin/v1/memberships
GET /api/admin/v1/memberships/{id}
POST /api/admin/v1/memberships/{id}/transition
GET/POST /api/admin/v1/memberships/{id}/role-assignments
POST /api/admin/v1/role-assignments/{id}/revoke
GET /api/admin/v1/effective-permissions
GET /api/admin/v1/audit-events
```

Preserve:

- server-derived principal
- scope authorization
- delegation ceiling
- privilege-escalation denial
- last-platform-admin safety
- cross-scope denial
- caller-forged authority rejection
- no role-name bypass

Outlet filtering: current authorized list may be narrowed in the client safely because it already
contains only authorized resources. However `LIST_LIMIT=200` creates a correctness risk for
wide-scope actors. Architecture permits a bounded server-side UX filter such as an outlet narrowing
query under `/api/admin/v1/memberships` provided:

- filtering occurs after/beside authorization, never instead of authorization
- supplied `outletId` is a filter, not authority
- server derives/validates target Outlet
- no sibling resource is leaked
- no new permission or scope model is created

Classify this as a projection/transport refinement, not RBAC redesign.

---

## 10. Transport — locked

Preserve D-372 and D-373 separation.

Operations process continues to host both existing façades, but they remain distinct trust/product
surfaces.

| Concern | Transport |
|---|---|
| Availability / Operating Status / Hours / Serviceability | bounded `/api/operations/v1/*` extensions |
| Assortment | READ-ONLY bounded Operations projection; Brand authorization derived from Outlet |
| Team / Access | existing `/api/admin/v1/*` |
| Outlet hierarchy identity/context | existing Admin resource authority |

No new deployable service. No new HTTP-to-HTTP internal delegation. No new RPC. No queue. No broker.
No dynamic Next.js business routes.

Capability-local bounded Operations transport extension follows accepted IMP-036D precedent and does
**not** require D-374.

### Minimum Operations transport shape

Use Outlet as the resource locator:

```text
/api/operations/v1/outlets/{outletId}/...
```

Authorized route families:

**Availability**

- GET/POST bounded Variant availability operations
- GET/POST bounded Modifier Option availability operations
- GET bounded availability list/projection where required by Store UI

**Assortment (read-only)**

- `GET /api/operations/v1/outlets/{outletId}/assortment`
- Outlet is the route resource locator only
- Brand authorization is derived server-side from the Outlet
- permission: existing `assortment.read`
- **NO** POST/PATCH/DELETE Assortment Store route (`ASSORTMENT_MANAGE_ROUTE_IMP036E = NO`)

**Operating state**

- GET current/effective state
- POST pause
- POST resume
- POST suspend
- POST unsuspend

**Operating profile / Hours**

- GET operating profile
- POST configure/update operating profile
- GET operating schedule
- POST replace operating schedule

**Serviceability**

- GET Store-safe distance Serviceability configuration
- POST distance-policy mutation

Exact child naming/payload DTO shape for non-Assortment families may be finalized during
implementation only if it does not alter these locked semantics. Assortment Store route spelling is
locked as above.

DO NOT expose provider/internal authority fields.

DO NOT expose legacy PIN mutations through IMP-036E Store transport.

DO NOT expose `routingPriority` mutation as Store V1 control.

All mutations:

- trusted workforce session
- server-derived principal
- trusted Origin protection
- strict body parsing
- target Outlet loaded server-side
- existing domain permission check
- existing domain command
- safe error mapping

Caller-provided `outletId` is a resource locator only, never proof of scope.

---

## 11. Session / capability projection — locked

Existing session capability projection omits Store permission keys.

```text
IMP036E_SESSION_CAPABILITY_PROJECTION_EXTENSION = EXISTING_PERMISSION_KEYS_ONLY
IMP036E_GLOBAL_SESSION_CAPS_ARE_RESOURCE_AUTHORITY = NO
IMP036E_GLOBAL_SESSION_CAPS_PURPOSE = COARSE_NAVIGATION_ONLY
IMP036E_RESOURCE_SCOPED_CONTROL_VISIBILITY = REQUIRED
IMP036E_SERVER_AUTHORIZATION_REMAINS_AUTHORITATIVE = YES
```

`getAdminSession` → `getEffectivePermissions(actor)` with **no** resource yields a union of
permission keys across all effective grants. Therefore a boolean such as
`capabilities["assortment.manage"] = true` does **not** prove authorization against the selected
Store's Brand (or any selected Outlet).

Existing permission keys may be added to the global/session capability projection for **coarse
navigation only**:

```text
outlet.read
availability.read
availability.manage
outlet.operating_state.read
outlet.operating_state.pause
outlet.operating_state.suspend
outlet.operating_schedule.read
outlet.operating_schedule.manage
serviceability.read
serviceability.manage
assortment.read
assortment.manage
access.membership.read
access.membership.manage
access.role_assignment.read
access.role_assignment.grant
access.role_assignment.revoke
access.effective_permissions.read
access.audit.read
```

Global/session capability booleans may be used for:

- coarse portal/navigation discovery
- avoiding obviously irrelevant navigation
- non-security UX hints

They MUST NOT be used as sole authority for:

- showing enabled mutation controls for the selected Outlet
- showing Assortment manage/read capability for the selected Brand
- executing a mutation
- deciding access to selected-resource data

### Resource-scoped Store capability visibility

Selected-resource control visibility **requires** resource-scoped permission evaluation using
existing permission keys and existing authorization machinery only. Do **not** create new RBAC.

For selected Outlet operational controls, resource-scoped capability state must be derived against
the authoritative selected Outlet for:

```text
availability.read / availability.manage
outlet.operating_state.read / pause / suspend
outlet.operating_schedule.read / manage
serviceability.read / serviceability.manage
```

Assortment must be evaluated separately against the authoritative Brand derived from the selected
Outlet using:

```text
assortment.read
assortment.manage
```

Therefore:

```text
global session assortment.read/manage ≠ selected Store Assortment authority
Outlet effective permissions ≠ Brand Assortment authority
```

The Store UI must not infer Assortment authority from either. It must use a Brand-specific
authorization / effective-permission result, or the actual authorized Assortment read response.

Implementation may satisfy selected-resource capability visibility by reusing
`GET /api/admin/v1/effective-permissions` where appropriate (that route already accepts a
`ProtectedResource` and uses resource-scoped `getEffectivePermissions`), or by adding an equivalent
bounded Store capability projection under existing Operations authority if necessary for Store
composition. Architecture must preserve resource-specific server authorization and MUST NOT create a
second authorization engine, new permissions, or new scope semantics. Exact frontend request
sequencing is not over-locked.

This session projection change does **not** grant permission, modify role mappings, replace
`authorize()`, or create new RBAC authority. Server authorization always re-checks the exact
protected resource and remains authoritative.

---

## 12. Schema — locked

```text
SCHEMA_CHANGE_REQUIRED = NO
```

Existing durable authority is sufficient:

```text
outlets
assortment_rules
outlet_variant_availability
outlet_modifier_option_availability
outlet_operating_profiles
outlet_operating_intervals
assortment_availability_audit_events
outlet_serviceability_configs
outlet_serviceability_pins
outlet_serviceability_audit_events
access_memberships
access_role_assignments
existing Access audit tables
```

No missing durable fact exists for IMP-036E V1.

Do **not** persist Store dashboard state, derived warning state, effective operating state
projection, permission snapshots, Team projection, or map state merely for UI convenience.

---

## 13. RBAC — locked

```text
NEW_PERMISSION = NO
NEW_ROLE = NO
NEW_SCOPE_MODEL = NO
```

Existing permission catalog remains authority. Store experience must be effective-permission-driven.

Important current behavior:

| Persona | Store V1 expectation |
|---|---|
| `platform_super_admin` | all accepted Store capabilities |
| `brand_admin` | broad Store capability according to existing mappings |
| `outlet_manager` | `outlet.read`; availability read/manage; operating state read/pause; **NO** suspend merely by role; schedule read/manage; serviceability read/manage; existing `access.*` according to accepted catalog; Assortment Brand-target mismatch fails closed |
| `kitchen_operator` | bounded existing Availability/Operating reads/mutations only |
| `delivery_coordinator` | read-oriented Store operational context according to accepted permissions |
| `support_refund_operator` | read-oriented context according to accepted permissions |
| `finance_viewer` | limited existing Store reads |

Do not redesign persona mappings in this slice.

---

## 14. D-374 / ARCH-R20 — locked conclusion

Inventory found no new global semantic.

```text
D374_REQUIRED_FOR_IMP036E_LOCK = NO
D-374_CREATED = NO
ARCH_R20_REQUIRED_FOR_IMP036E_LOCK = NO
ARCH-R20_CREATED = NO
```

Reasons:

- existing domain authorities reused
- existing schema reused
- existing permission keys reused
- existing role/scope model reused
- D-372 Operations façade extended capability-locally (including Assortment read-only projection)
- D-373 Admin façade reused
- Founder A preserves accepted Assortment Brand authority
- Assortment Store route authorizes Brand derived from Outlet via existing `assortment.read`
- session changes are projection only; global caps are coarse navigation, not resource authority
- selected-resource control visibility reuses existing resource-scoped authorization
- Store Overview is composition only
- corrective amendment prevents false UX authority rather than creating new RBAC

Do not create a D-number merely to restate these capability-local decisions.

---

## 15. Explicit deferrals / non-goals

```text
IMP036E_BULK_AVAILABILITY = DEFERRED
New Assortment permission/scope model = DEFERRED / NOT_AUTHORIZED
RBAC catalog cleanup = FOLLOW_UP / NON_BLOCKING
Routing-priority Store editor = NOT_IN_V1
Serviceability map = OPTIONAL / NOT_REQUIRED
Arbitrary multi-outlet franchise RBAC = NOT_AUTHORIZED
New Catalog/Menu identity = NOT_AUTHORIZED
New inventory domain = NOT_AUTHORIZED
New geofence/polygon authority = NOT_AUTHORIZED
PIN runtime Serviceability = PROHIBITED
New Store microservice = PROHIBITED
```

Relevant VISION Non-Goals preserved: not a speculative microservice platform; a domain capability
does not automatically require a deployable service; deferred capabilities may not be implemented
opportunistically.

Relevant ARCH-G invariants preserved: ARCH-G14 (no speculative infra), ARCH-G23 (D-372 Operations
façade), ARCH-G25 (D-373 Admin façade).

---

## 16. Implementation posture

```text
IMP-036E_IMPLEMENTATION_AUTHORIZED: NO
IMP-036E_STARTED: NO
IMP-036E_IMPLEMENTATION_COMPLETE: NO
IMP-036E_ACCEPTED: NO
IMP-036F: PLANNED / NOT_ACTIVATED / NOT_AUTHORIZED / NOT_STARTED
```

Architecture lock is **not** implementation authorization and is **not** IMP-036F activation.
