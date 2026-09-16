<!-- governance-meta
{
  "status": "DRAFT",
  "authority": "PRODUCT_DEFINITION",
  "capability": "IMP-036G",
  "productDefinitionVersion": "PD-IMP-036G-DRAFT-1",
  "process": "PD-1",
  "verificationPolicy": "TEST-1",
  "lastReviewed": "2026-09-16",
  "productDefinitionGateExecution": "NOT_PERFORMED",
  "productDefinitionGateResult": "NOT_PERFORMED",
  "architectureFitExecution": "NOT_PERFORMED",
  "architectureFit": "NOT_PERFORMED",
  "architectureLocked": "NO",
  "implementationAuthorized": "NO",
  "implementationStarted": "NO",
  "impAccepted": "NO",
  "imp037Activated": "NO"
}
-->

# IMP-036G — Administration Console V2

## Product Definition (PRE-GATE DRAFT — Gate NOT_PERFORMED)

```text
PRE-GATE DRAFT: YES
PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED
Gate Result: NOT_PERFORMED
ARCHITECTURE_FIT_EXECUTION: NOT_PERFORMED
ARCHITECTURE_FIT_RESULT: NOT_PERFORMED
IMP036G_ARCHITECTURE_LOCKED: NO
IMP036G_IMPLEMENTATION_AUTHORIZED: NO
IMP036G_STARTED: NO
IMP036G_ACCEPTED: NO
IMP037_ACTIVATED: NO
Document status: DRAFT
PRODUCT_DEFINITION_VERSION: PD-IMP-036G-DRAFT-1
```

This artifact is a **PRE-GATE DRAFT** Product Definition for candidate `PD-IMP-036G-DRAFT-1`.
It defines intended user/business behaviour for IMP-036G within existing accepted authority
(IMP-035 / D-373 / ARCH-G25 and related CURRENT foundations). It does **not** claim Product
Definition Gate PASS, Architecture Fit PASS, architecture lock, implementation authorization,
IMP-036G acceptance, or IMP-037 activation.

```text
PRODUCT_DELIVERY_PROCESS_EFFECTIVE_FROM = IMP-036F
HISTORICAL_ACCEPTED_IMPS_REWRITTEN = NO
IMP036E_LIFECYCLE_CHANGED = NO
PD1_DID_NOT_ACTIVATE_IMP036F_AT_ADOPTION = YES
```

Lifecycle truth remains ROADMAP/STATE only (`GTM-R124` / `STATE-R122`): `IMP036G_ACTIVATED: YES`
as CURRENT product slice; formal ROADMAP lifecycle remains `PLANNED` /
`NOT_AUTHORIZED` / `NOT_STARTED`; `IMP036G_PRODUCT_DEFINITION: DRAFT` /
`PD-IMP-036G-DRAFT-1`; Product Definition Gate and Architecture Fit remain `NOT_PERFORMED`.
This draft is not approved and does not authorize implementation.

Supporting planning input (not this Product Definition):  
[`experience/enterprise-experience/IMP-036G-administration-console-v2.md`](../../experience/enterprise-experience/IMP-036G-administration-console-v2.md).

---

## 1. Identity / version / status

| Field | Definition |
|---|---|
| Capability / title | `IMP-036G — Administration Console V2` |
| Product Definition version / document status | `PD-IMP-036G-DRAFT-1`; **Document status: DRAFT**; **PRE-GATE DRAFT: YES** |
| Product owner / approval evidence | Founder / product governance human authority; **Product Definition Gate NOT_PERFORMED** — no approval evidence yet |
| Process / verification policy | `PD-1` / `TEST-1` |
| Canonical anchors | VISION-1; ROADMAP GTM-R124; STATE STATE-R122; ARCH-R19; DR-15; PD-1; TEST-1; PERSONA-1; GJ-1 |
| Repository candidate | Canonical path `/home/ajoshi/repos/boba-bear-platform`; branch `governance/imp036g-product-definition`; verified base `main` merge `e067febf113fe21eebe1c1a3f3be24cbe23dd1f8` / tree `8b8f7cd3068bf6dbcfd02055ae795da24c398dcd` (draft candidate HEAD will differ after this Product Definition commit) |
| Capability lifecycle / authorization | ROADMAP/STATE: `currentProductSlice = IMP-036G`; `IMP036G_ACTIVATED: YES`; formal lifecycle `PLANNED` / `NOT_AUTHORIZED` / `NOT_STARTED`; `IMP036G_PRODUCT_DEFINITION: DRAFT`; `IMP036G_PRODUCT_DEFINITION_VERSION: PD-IMP-036G-DRAFT-1`; `IMP036G_PRODUCT_DEFINITION_GATE: NOT_PERFORMED`; `IMP036G_ARCHITECTURE_FIT: NOT_PERFORMED`; `IMP036G_ARCHITECTURE_LOCKED: NO`; `IMP036G_IMPLEMENTATION_AUTHORIZED: NO`; `IMP036G_STARTED: NO`; `IMP036G_ACCEPTED: NO`; `IMP036G_FOUNDER_UAT_REQUIRED: YES`; `nextProductSlice = IMP-037` (**IMP037_ACTIVATED: NO**) |
| Relevant capability architecture / ADRs | Accepted IMP-035 capability [`capabilities/IMP-035-initial-administration-capabilities.md`](../../capabilities/IMP-035-initial-administration-capabilities.md); binding D-373; ARCH-G25 / ARCH-R19; Access Control + Organization domain authority; supporting plan [`IMP-036G-administration-console-v2.md`](../../experience/enterprise-experience/IMP-036G-administration-console-v2.md). **IMP-036G capability architecture: NOT_LOCKED / NOT_CREATED for Fit.** |
| Founder UAT applicability | `FOUNDER_UAT_REQUIRED = YES` — materially changes operator-visible administration experience (ROADMAP/STATE; enterprise-experience programme rule) |

Behaviour classification vocabulary used throughout:

```text
CURRENT_SUPPORTED
PLANNED_IMP036G
FOLLOW_UP
DEFERRED
NOT_SUPPORTED
ARCHITECTURE_FIT_REQUIRED
PRODUCT_DECISION_REQUIRED
UNRESOLVED_DECISION_REQUIRED
```

Expected posture for Architecture Fit planning (planning expectation only — **not** a Fit verdict):

```text
EXPECTED_NEW_SCHEMA: NO
EXPECTED_NEW_SERVICE: NO
EXPECTED_NEW_AUTH_MODEL: NO
EXPECTED_NEW_ROLE: NO
EXPECTED_NEW_PERMISSION: NO
EXPECTED_NEW_RBAC_SEMANTICS: NO
EXPECTED_NEW_API: NO
```

---

## 2. Business outcome

An authorized administrator can **understand administration scope**, **navigate the organization
hierarchy**, **manage supported workforce membership and existing role assignments safely**,
**inspect resulting effective permissions**, **investigate relevant audit history and operational
status**, and **understand the consequence of actions** — without needing API or domain-model
knowledge, and **without gaining authority beyond existing permissions**.

Observable success measure: one coherent administration job completes from context → hierarchy /
membership / access work → consequence-aware mutation → diagnostic inspection (permissions / audit /
safe operational status), within existing IMP-035 / D-373 transport and Access Control authority,
while preserving `GJ-PERMITTED-OUTLET-ACCESS` continuity.

Links VISION workforce administration / access-governance responsibility and enterprise Admin
separation from Customer and Operations.

---

## 3. Problem statement

**Who:** Brand/business administrators (`PERSONA-WORKFORCE-OPERATOR` job context) and, where
authorized, platform-level operators inspecting safe operational status
(`PERSONA-PLATFORM-OPERATOR` job context). **Persona ≠ role ≠ permission ≠ authorization.**

**Problem:** Accepted IMP-035 administration domain/API authority exists, but the workforce Admin
experience remains minimum-viable and fragmented. Operators cannot reliably complete one coherent
enterprise Admin job of “understand my scope → navigate hierarchy → manage memberships/roles safely
→ inspect consequence and investigate.”

**Evidence-backed CURRENT vs gap (VERIFIED runtime / accepted authority):**

| Area | Classification | Summary |
|---|---|---|
| Admin transport `/api/admin/v1/*` on operations process | `CURRENT_SUPPORTED` (IMP-035 / D-373 / ARCH-G25) | Brands/orgs/territories/legal-entities/outlets list/get/create/update; memberships create/list/get/transition; role-assignments grant/list/revoke; effective-permissions GET; audit-events GET |
| Soft lifecycle active/inactive; no DELETE | `CURRENT_SUPPORTED` | Soft lifecycle only; hard DELETE `NOT_SUPPORTED` |
| Membership transitions | `CURRENT_SUPPORTED` | `invited→active\|revoked\|expired`; `active→suspended\|revoked`; `suspended→active\|revoked`; `revoked`/`expired` terminal |
| System roles; delegation ceiling; self-elevation deny | `CURRENT_SUPPORTED` | System roles only; grant limited by actor ceiling; self-elevation denied |
| Admin UI | `CURRENT_SUPPORTED` PARTIAL | Hub links; brands list only; memberships list + detail transitions/grant/revoke; audit list; **NO** full hierarchy CRUD UI; **NO** create-membership UI; **NO** admin operational-status surface |
| Effective permissions GET | `CURRENT_SUPPORTED` with VERIFIED gap | Projects **calling actor** permissions at resource — **not** arbitrary subject principal (gap vs journey wording “inspect resulting effective permissions” for a managed member) |
| Audit list | `CURRENT_SUPPORTED` with limits | Authorized list capped at 200; event fields include actor/action/date; **NO** HTTP query filters for actor/action/date (`NOT_FOUND`) |
| Operational status | `CURRENT_SUPPORTED` Ops-side only | Only `GET /api/operations/v1/operational-status` (`order.read`); Admin must not become Ops dashboard; Open Operations navigation OK if separately authorized |
| Coherent Admin IA / consequence UX | `PLANNED_IMP036G` | Overview / Organization / Workforce / Access / Audit / System Operational Status as product IA (jobs/outcomes, not React lock) |

Do not treat current UI incompleteness or implementation quirks as desired end-state behaviour.

---

## 4. Primary personas

| Persona ID | Responsibility / goal in this slice | Context / evidence |
|---|---|---|
| `PERSONA-WORKFORCE-OPERATOR` (primary) | Brand/business admin jobs: understand Admin context, navigate hierarchy, maintain supported org resources, manage workforce memberships and role assignments safely, inspect permissions/audit within authorized scope | [personas.md](../personas.md); VISION brand/outlet administration responsibility; IMP-035. **Persona ≠ role ≠ permission ≠ authorization.** |
| `PERSONA-PLATFORM-OPERATOR` (secondary) | Platform-level admin/ops status inspection where authorized: safe operational-status inspection and hand-off to Operations without converting Admin into an Ops dashboard | [personas.md](../personas.md); VISION platform operability; IMP-036 observability / operations transport. **Persona ≠ role ≠ permission ≠ authorization.** |

No new persona is created. Actual authorization authority is listed in §14.

---

## 5. Current-state journey

| Journey ID / evidence | Entry / preconditions | Activities today | Existing outcome / gap |
|---|---|---|---|
| Partial Admin hub (IMP-035 UI) | Authorized workforce session with Admin portal entry | Open `/workforce/admin/` hub → Resources (brands list only) / Memberships list+detail (activate/suspend/revoke; grant/revoke role; caller-scoped effective permissions display) / Access audit list; Commercial hub is separate IMP-036F surface | Domain/API largely `CURRENT_SUPPORTED`; coherent hierarchy CRUD, create-membership UI, consequence confirmation, subject-principal diagnostics, Admin operational status, and full IA **missing / PARTIAL** |
| `JOURNEY-PERMITTED-OUTLET-ACCESS` / `GJ-PERMITTED-OUTLET-ACCESS` (`CURRENT`) | Authorized administrator; existing workforce identity; membership + role within delegation ceiling | Manage membership / role assignment → member reaches permitted applications/resources; unauthorized scopes remain denied | Continuity must be **protected** by IMP-036G; no invitation delivery promised |
| Operations operational status (Ops transport) | Authorized Ops session with `order.read` | `GET /api/operations/v1/operational-status` | Exists on Ops; **not** Admin-owned dashboard |

---

## 6. Desired-state journey

| Journey ID | Entry / context | Ordered activities | Success / downstream outcome | Alternate / recovery paths |
|---|---|---|---|---|
| `JOURNEY-G-ADMIN-CONTEXT` | Authorized Admin session; existing permissions only | 1 Enter Admin → 2 Understand signed-in identity and capability-visible scope → 3 Orient via Overview / IA → 4 Navigate to Organization / Workforce / Access / Audit / System | Operator understands what Admin can do in their scope without API knowledge | Unauthorized → sign-in; limited capabilities → clear empty/limited messaging; recovery after session expiry |
| `JOURNEY-G-ACCESS-MANAGEMENT` (must protect `GJ-PERMITTED-OUTLET-ACCESS`) | Authorized Admin; target membership in scope | 1 Locate membership → 2 Create/maintain membership within legal transitions → 3 Grant/revoke system roles within ceiling → 4 Confirm consequence → 5 Inspect effective permissions (see §25 subject-principal question) → 6 Member retains/gains permitted outlet access continuity | Safe access governance without privilege escalation beyond actor authority; Golden Journey continuity preserved | Illegal transition reject; ceiling/self-elevation/cross-scope deny; stale membership/assignment; cancel confirmation; no invitation delivery |
| `JOURNEY-G-ADMIN-INVESTIGATION` | Authorized Admin (and platform ops inspection where authorized) | 1 Browse hierarchy context → 2 Review audit history → 3 Inspect safe operational status → 4 Optionally Open Operations if separately authorized | Investigation completes with truthful projections; Admin remains distinct from Ops | Unauthorized audit/status; capped list; filter disposition per §25; Ops hand-off without Admin dashboard bleed |

Central product concept:

> As an authorized administrator, I can understand my administration scope, navigate organization
> hierarchy, manage supported memberships and role assignments safely with clear consequence, inspect
> permissions and audit/operational status I am allowed to see, and hand off to Operations when needed
> — without API knowledge and without gaining authority I do not already have.

---

## 7. Story map

| Business outcome | Persona | Journey | Activity | Story IDs | Slice classification |
|---|---|---|---|---|---|
| Coherent Admin Console V2 | `PERSONA-WORKFORCE-OPERATOR` | `JOURNEY-G-ADMIN-CONTEXT` | Understand administration context | `US-IMP-036G-001` | `V1_ACCEPTANCE_SLICE` |
| Coherent Admin Console V2 | `PERSONA-WORKFORCE-OPERATOR` | `JOURNEY-G-ADMIN-CONTEXT` / investigation | Browse organization hierarchy | `US-IMP-036G-002` | `V1_ACCEPTANCE_SLICE` |
| Coherent Admin Console V2 | `PERSONA-WORKFORCE-OPERATOR` | `JOURNEY-G-ACCESS-MANAGEMENT` | Maintain supported organization resources | `US-IMP-036G-003` | `V1_ACCEPTANCE_SLICE` |
| Coherent Admin Console V2 | `PERSONA-WORKFORCE-OPERATOR` | `JOURNEY-G-ACCESS-MANAGEMENT` | Manage workforce memberships | `US-IMP-036G-004` | `V1_ACCEPTANCE_SLICE` |
| Coherent Admin Console V2 | `PERSONA-WORKFORCE-OPERATOR` | `JOURNEY-G-ACCESS-MANAGEMENT` | Manage existing role assignments safely | `US-IMP-036G-005` | `V1_ACCEPTANCE_SLICE` |
| Coherent Admin Console V2 | `PERSONA-WORKFORCE-OPERATOR` | `JOURNEY-G-ACCESS-MANAGEMENT` / investigation | Inspect effective permissions | `US-IMP-036G-006` | `V1_ACCEPTANCE_SLICE` (subject-principal diagnostic = §25) |
| Coherent Admin Console V2 | `PERSONA-WORKFORCE-OPERATOR` | `JOURNEY-G-ADMIN-INVESTIGATION` | Investigate access audit history | `US-IMP-036G-007` | `V1_ACCEPTANCE_SLICE` (filter mechanism = §25) |
| Coherent Admin Console V2 | `PERSONA-WORKFORCE-OPERATOR` + `PERSONA-PLATFORM-OPERATOR` | `JOURNEY-G-ADMIN-INVESTIGATION` | Inspect safe operational status; hand off to Operations | `US-IMP-036G-008` | `V1_ACCEPTANCE_SLICE` |
| Overview summary cards lacking safe projections | — | Overview | Derived KPI cards without existing list projections | — | `FOLLOW_UP` / `ARCHITECTURE_FIT_REQUIRED` (§25) |
| Invitation delivery system | — | Access | Email/SMS invitation delivery | — | `DEFERRED` / `NOT_SUPPORTED` for V1 |
| Custom roles / permission editor | — | Access | Arbitrary RBAC authoring | — | `NOT_SUPPORTED` |

---

## 8. Acceptance slice

| Slice | Mandatory story IDs | Mandatory AC IDs | Required Golden Journeys | Observable acceptance boundary |
|---|---|---|---|---|
| `V1_ACCEPTANCE_SLICE` | `US-IMP-036G-001` … `US-IMP-036G-008` | All ACs marked `Mandatory in acceptance slice: YES` in §10 (excluding those classified FOLLOW_UP / blocked by §25) | `GJ-PERMITTED-OUTLET-ACCESS` continuity (protect; do not re-accept invitation delivery) | Authorized admin completes coherent Admin context + hierarchy browse/maintain + membership/role safety + permission/audit/ops inspection within existing authority |
| `FOLLOW_UP` | Overview cards without existing projections; optional polish beyond V1 | As defined when projections proven | N/A unless GJ impacted | Not silently required for V1 |
| `DEFERRED` | Invitation delivery; analytics; custom roles; hard-delete; new API/schema/service/auth | N/A | N/A | Explicit non-goals / future gates |

Every identified possibility also receives disposition in §§22–25:
`SUPPORTED_NOW`, `EXPLICITLY_DEFERRED`, `NOT_SUPPORTED_BY_DESIGN`, or
`UNRESOLVED_DECISION_REQUIRED`.

---

## 9. User stories

### US-IMP-036G-001 — Understand administration context

```text
Story ID: US-IMP-036G-001
As a PERSONA-WORKFORCE-OPERATOR (Brand/business admin job context)
I want to understand my administration context and visible capabilities
so that I know what I can administer without API/domain knowledge.

Journey / activity: JOURNEY-G-ADMIN-CONTEXT — enter Admin and orient
Preconditions: Workforce session eligible for Admin portal; existing permissions only
Acceptance scenarios: AC-IMP-036G-001-01 … 001-08
Business rules: BR-IMP-036G-001, BR-IMP-036G-002, BR-IMP-036G-020
UX states: loading; ready; unauthorized; limited-capability; error/recovery
Permission / resource context: Admin session projection; capability-gated navigation; no invented permissions
Error / recovery: sign-in required; session expiry return; non-disclosing unauthorized
Dependencies: IMP-035 session transport; IMP-036A portal foundation
Explicit non-goals: Ops dashboard; commercial duplication; customer-account admin
Data implications: session/capability projection only; no new schema
Security implications: no client-supplied authority; no privilege gain via UI
Architecture fit / applicable invariants: D-373; ARCH-G25; EXPECTED_NEW_*: NO
Open material decisions: Overview summary cards without safe projections → §25 item 2
Readiness: NOT_READY_FOR_IMPLEMENTATION (Product Definition Gate NOT_PERFORMED; Architecture Fit NOT_PERFORMED; §25 open)
```

### US-IMP-036G-002 — Browse organization hierarchy

```text
Story ID: US-IMP-036G-002
As a PERSONA-WORKFORCE-OPERATOR
I want to browse Brands, Organizations, Territories, Legal Entities, and Outlets in hierarchy context
so that I can locate the correct resource scope for administration work.

Journey / activity: JOURNEY-G-ADMIN-CONTEXT / JOURNEY-G-ADMIN-INVESTIGATION — hierarchy browse
Preconditions: Authorized resource read permissions for visible types
Acceptance scenarios: AC-IMP-036G-002-01 … 002-09
Business rules: BR-IMP-036G-003, BR-IMP-036G-004
UX states: loading; empty; ready list/detail; forbidden; not-found/stale; error/retry
Permission / resource context: brand.read / organization.read / territory.read / legal_entity.read / outlet.read (existing)
Error / recovery: 403/non-disclosing 404; retry on network; revisit reload
Dependencies: IMP-035 resource list/get APIs (CURRENT_SUPPORTED)
Explicit non-goals: inventing hierarchy levels; customer presentation of hierarchy
Data implications: existing Organization resource projections
Security implications: scope filtering server-side; no forged scope
Architecture fit / applicable invariants: D-373 collections authorize-first
Open material decisions: NONE for browse itself
Readiness: NOT_READY_FOR_IMPLEMENTATION (gates not performed)
```

### US-IMP-036G-003 — Maintain supported organization resources

```text
Story ID: US-IMP-036G-003
As a PERSONA-WORKFORCE-OPERATOR
I want to create/update and set active/inactive on supported organization resources
so that hierarchy remains accurate without hard-delete risk.

Journey / activity: JOURNEY-G-ACCESS-MANAGEMENT — maintain org resources
Preconditions: Authorized manage permissions for resource type/scope
Acceptance scenarios: AC-IMP-036G-003-01 … 003-10
Business rules: BR-IMP-036G-005, BR-IMP-036G-006, BR-IMP-036G-007, BR-IMP-036G-021
UX states: form ready; validation failure; pending mutation; success; confirmation for deactivate; forbidden; conflict/stale
Permission / resource context: existing create/update commands only; soft lifecycle
Error / recovery: validation messages; cancel confirmation; retry; no silent success
Dependencies: IMP-035 resource create/update (CURRENT_SUPPORTED); UI today PARTIAL (brands list only)
Explicit non-goals: DELETE/hard-delete; new resource types; commercial resource authoring here
Data implications: soft active/inactive; no schema invention expected
Security implications: consequence confirmation for deactivate; server denies unauthorized
Architecture fit / applicable invariants: EXPECTED_NEW_API/SCHEMA: NO
Open material decisions: NONE material beyond Fit confirmation of UI mapping
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

### US-IMP-036G-004 — Manage workforce memberships

```text
Story ID: US-IMP-036G-004
As a PERSONA-WORKFORCE-OPERATOR
I want to create and transition workforce memberships through legal lifecycle states only
so that access governance is safe and understandable.

Journey / activity: JOURNEY-G-ACCESS-MANAGEMENT — memberships (protects GJ-PERMITTED-OUTLET-ACCESS)
Preconditions: access.membership.read / manage as applicable; target identity exists; scope authorized
Acceptance scenarios: AC-IMP-036G-004-01 … 004-12
Business rules: BR-IMP-036G-008, BR-IMP-036G-009, BR-IMP-036G-010, BR-IMP-036G-021
UX states: list/detail; create form; transition confirmation; illegal transition unavailable/rejected; terminal states
Permission / resource context: existing membership APIs; create UI currently missing (PLANNED_IMP036G)
Error / recovery: illegal transition reject; self-create deny if existing; stale membership; cancel
Dependencies: IMP-035 membership create/list/get/transition; GJ-PERMITTED-OUTLET-ACCESS
Explicit non-goals: invitation delivery system; customer-account admin; inventing statuses
Data implications: invited|active|suspended|revoked|expired; no hard-delete
Security implications: consequence confirmation for suspend/revoke; no authority beyond actor
Architecture fit / applicable invariants: EXPECTED_NEW_*: NO
Open material decisions: Whether V1 exposes invited→expired affordance (§25 item 5)
Readiness: NOT_READY_FOR_IMPLEMENTATION (§25 item 5)
```

### US-IMP-036G-005 — Manage existing role assignments safely

```text
Story ID: US-IMP-036G-005
As a PERSONA-WORKFORCE-OPERATOR
I want to grant and revoke existing system roles within my delegation ceiling
so that members receive permitted access without privilege escalation.

Journey / activity: JOURNEY-G-ACCESS-MANAGEMENT — role assignments (protects GJ-PERMITTED-OUTLET-ACCESS)
Preconditions: access.role_assignment read/manage; membership in scope; system role keys only
Acceptance scenarios: AC-IMP-036G-005-01 … 005-11
Business rules: BR-IMP-036G-011, BR-IMP-036G-012, BR-IMP-036G-013, BR-IMP-036G-021
UX states: assignment list; grant picker; revoke confirmation; denied (ceiling/self/cross-scope/stale)
Permission / resource context: existing grant/list/revoke; system roles only
Error / recovery: clear denial reasons without leaking unauthorized targets; cancel confirmation
Dependencies: IMP-035 role-assignment APIs; Access Control delegation ceiling
Explicit non-goals: custom roles; permission editor; arbitrary grants; four-eyes approval
Data implications: existing assignment records; revoke soft semantics as CURRENT
Security implications: self-elevation deny; ceiling enforce; consequence confirmation
Architecture fit / applicable invariants: EXPECTED_NEW_ROLE/PERMISSION/RBAC: NO
Open material decisions: NONE for core ceiling semantics (CURRENT_SUPPORTED)
Readiness: NOT_READY_FOR_IMPLEMENTATION (gates not performed)
```

### US-IMP-036G-006 — Inspect effective permissions

```text
Story ID: US-IMP-036G-006
As a PERSONA-WORKFORCE-OPERATOR
I want to inspect effective permissions in resource context as a read/diagnostic aid
so that I can understand access consequence after membership/role changes.

Journey / activity: JOURNEY-G-ACCESS-MANAGEMENT / investigation — effective permissions
Preconditions: access.effective_permissions.read; resource identifiers for projection
Acceptance scenarios: AC-IMP-036G-006-01 … 006-08
Business rules: BR-IMP-036G-014, BR-IMP-036G-015
UX states: loading; ready projection; empty permissions; forbidden; invalid resource query
Permission / resource context: CURRENT API projects CALLING ACTOR at resource (VERIFIED)
Error / recovery: invalid resource query; unauthorized resource
Dependencies: GET /api/admin/v1/effective-permissions (CURRENT_SUPPORTED)
Explicit non-goals: permission editor; inventing grants from diagnostic UI
Data implications: read-only projection; no persistence mutation
Security implications: must not become covert privilege escalation; subject-principal API would be NEW API
Architecture fit / applicable invariants: EXPECTED_NEW_API: NO conflicts with subject-principal API
Open material decisions: §25 item 1 — caller-scoped sufficient for V1 vs subject-principal required
Readiness: NOT_READY_FOR_IMPLEMENTATION (§25 item 1 = UNRESOLVED_DECISION_REQUIRED / ARCHITECTURE_FIT_REQUIRED)
```

### US-IMP-036G-007 — Investigate access audit history

```text
Story ID: US-IMP-036G-007
As a PERSONA-WORKFORCE-OPERATOR
I want to investigate relevant access audit events
so that I can explain who changed memberships/roles/resources within my authorized view.

Journey / activity: JOURNEY-G-ADMIN-INVESTIGATION — audit
Preconditions: access.audit.read
Acceptance scenarios: AC-IMP-036G-007-01 … 007-09
Business rules: BR-IMP-036G-016, BR-IMP-036G-017
UX states: loading; empty; ready list; capped-list notice; forbidden; error/retry
Permission / resource context: authorized audit list capped 200; fields actor/action/date exist on events; HTTP filters NOT_FOUND
Error / recovery: retry; clear empty; do not invent unauthorized events
Dependencies: GET /api/admin/v1/audit-events (CURRENT_SUPPORTED)
Explicit non-goals: analytics; secrets; rewriting audit; Ops log platform
Data implications: append-only read; no new audit store expected
Security implications: minimize sensitive disclosure; scope filter server-side
Architecture fit / applicable invariants: EXPECTED_NEW_API: NO vs server query filters question
Open material decisions: §25 item 3 — client-side filter of authorized list vs server query filters
Readiness: NOT_READY_FOR_IMPLEMENTATION (§25 item 3)
```

### US-IMP-036G-008 — Inspect safe operational status and hand off to Operations

```text
Story ID: US-IMP-036G-008
As a PERSONA-WORKFORCE-OPERATOR or PERSONA-PLATFORM-OPERATOR (where authorized)
I want to inspect safe operational status from Admin and open Operations when separately authorized
so that I can investigate operational health without turning Admin into an Ops dashboard.

Journey / activity: JOURNEY-G-ADMIN-INVESTIGATION — System Operational Status
Preconditions: Existing Ops operational-status authority where used; Admin navigation only if permitted
Acceptance scenarios: AC-IMP-036G-008-01 … 008-08
Business rules: BR-IMP-036G-018, BR-IMP-036G-019
UX states: loading; ready safe projection; unauthorized; Open Operations available/unavailable; error
Permission / resource context: ONLY GET /api/operations/v1/operational-status (order.read) exists today; Admin must not duplicate Ops workflows
Error / recovery: unauthorized message; hand-off link only when authorized; no fabricated health truth
Dependencies: IMP-036 Ops transport; separate Ops authorization
Explicit non-goals: Ops workflow duplication; Admin-as-dashboard; inventing Admin-only status authority
Data implications: reuse existing Ops projection; no new status store
Security implications: no secrets; no privilege broaden via status UI
Architecture fit / applicable invariants: Admin≠Ops boundary (D-373 vs D-372); EXPECTED_NEW_API: NO
Open material decisions: NONE material if reuse Ops endpoint + navigation; Fit confirms composition
Readiness: NOT_READY_FOR_IMPLEMENTATION (gates not performed)
```

---

## 10. Acceptance scenarios

### US-IMP-036G-001

```text
AC-IMP-036G-001-01 — Enter Admin overview when authorized
Story: US-IMP-036G-001
Given an eligible workforce session with Admin portal access
When the person opens Administration
Then they see Overview / IA orientation in plain language (not raw API vocabulary as primary UX)
And navigation reflects capability-visible areas only
Mandatory in acceptance slice: YES

AC-IMP-036G-001-02 — Signed-in identity visible
Story: US-IMP-036G-001
Given an authorized Admin session
When Overview loads
Then a human-readable signed-in label/identity context is visible
And client-supplied role/permission objects are not treated as authority
Mandatory in acceptance slice: YES

AC-IMP-036G-001-03 — Capability-limited navigation
Story: US-IMP-036G-001
Given a session lacking membership and audit read capabilities
When Overview loads
Then the person sees limited-scope messaging
And unavailable areas are not presented as actionable primary tasks
Mandatory in acceptance slice: YES

AC-IMP-036G-001-04 — Unauthorized session
Story: US-IMP-036G-001
Given no valid workforce session
When Administration is requested
Then sign-in is required
And no admin data is disclosed
Mandatory in acceptance slice: YES

AC-IMP-036G-001-05 — Navigate to Organization / Workforce / Access / Audit / System
Story: US-IMP-036G-001
Given authorized capabilities for those areas
When the person uses Admin IA navigation
Then they can reach Organization, Workforce Memberships, Access, Audit, and System Operational Status destinations
And Commercial surfaces remain separate (not merged into Admin V2 acceptance of Ops/Customer)
Mandatory in acceptance slice: YES

AC-IMP-036G-001-06 — Overview cards only from safe existing projections
Story: US-IMP-036G-001
Given Overview is shown
When summary cards are considered
Then cards without safe existing list/projections are not invented as KPI truth stores
And such cards are FOLLOW_UP / Architecture Fit (§25 item 2) rather than fabricated V1 truth
Mandatory in acceptance slice: YES (negative / boundary)

AC-IMP-036G-001-07 — Session expiry recovery
Story: US-IMP-036G-001
Given an Admin session that expires during use
When the person continues
Then they are guided to re-authenticate
And prior privileged UI does not continue to mutate successfully without auth
Mandatory in acceptance slice: YES

AC-IMP-036G-001-08 — No authority gain via Overview
Story: US-IMP-036G-001
Given any Admin Overview presentation
When the person inspects available actions
Then no action grants permissions beyond existing server authority
Mandatory in acceptance slice: YES
```

### US-IMP-036G-002

```text
AC-IMP-036G-002-01 — Browse Brands in scope
Story: US-IMP-036G-002
Given brand.read in scope
When the person opens Organization → Brands
Then authorized brands list with human-readable names/codes/status
Mandatory in acceptance slice: YES

AC-IMP-036G-002-02 — Browse Organizations in hierarchy context
Story: US-IMP-036G-002
Given organization.read
When Organizations are browsed
Then items appear with parent Brand context understandable without opaque-ID-only UX as the primary label
Mandatory in acceptance slice: YES

AC-IMP-036G-002-03 — Browse Territories
Story: US-IMP-036G-002
Given territory.read
When Territories are browsed
Then authorized territories are listed with Brand context
Mandatory in acceptance slice: YES

AC-IMP-036G-002-04 — Browse Legal Entities
Story: US-IMP-036G-002
Given legal_entity.read
When Legal Entities are browsed
Then authorized legal entities are listed with Brand/Organization context
Mandatory in acceptance slice: YES

AC-IMP-036G-002-05 — Browse Outlets
Story: US-IMP-036G-002
Given outlet.read
When Outlets are browsed
Then authorized outlets are listed with Brand/Organization/Territory context
Mandatory in acceptance slice: YES

AC-IMP-036G-002-06 — Empty hierarchy for type
Story: US-IMP-036G-002
Given authorized read but zero visible resources
When the list loads
Then an empty state explains no resources in scope and offers a safe next action if create is authorized
Mandatory in acceptance slice: YES

AC-IMP-036G-002-07 — Forbidden resource type
Story: US-IMP-036G-002
Given missing read permission for a type
When that type is requested (UI or direct URL)
Then access is denied without disclosing unauthorized inventory
Mandatory in acceptance slice: YES

AC-IMP-036G-002-08 — Stale / not-found resource detail
Story: US-IMP-036G-002
Given a previously visible resource id that is gone or out of scope
When detail is opened
Then not-found/stale handling occurs without cross-scope leakage
Mandatory in acceptance slice: YES

AC-IMP-036G-002-09 — Reload preserves truthful browse
Story: US-IMP-036G-002
Given a hierarchy list was loaded
When the person reloads
Then the list re-fetches authorized CURRENT projections
Mandatory in acceptance slice: YES
```

### US-IMP-036G-003

```text
AC-IMP-036G-003-01 — Create supported Brand when authorized
Story: US-IMP-036G-003
Given brand manage authority
When the person creates a Brand with valid fields
Then the Brand is created via existing Admin API
And appears in subsequent authorized browse
Mandatory in acceptance slice: YES

AC-IMP-036G-003-02 — Update supported organization resource
Story: US-IMP-036G-003
Given update authority on a visible Organization/Territory/Legal Entity/Outlet/Brand
When the person updates allowed fields
Then changes persist through existing update API
And reload shows updated values
Mandatory in acceptance slice: YES

AC-IMP-036G-003-03 — Activate resource
Story: US-IMP-036G-003
Given an inactive resource and manage authority
When the person sets active
Then status becomes active through soft lifecycle
Mandatory in acceptance slice: YES

AC-IMP-036G-003-04 — Deactivate resource with consequence confirmation
Story: US-IMP-036G-003
Given an active resource and manage authority
When the person chooses deactivate
Then confirmation shows explicit target, scope, and plain-language consequence
And Cancel leaves state unchanged
And Confirm deactivates via soft lifecycle
Mandatory in acceptance slice: YES

AC-IMP-036G-003-05 — Hard DELETE not available
Story: US-IMP-036G-003
Given any organization resource surface
When the person looks for delete
Then hard DELETE is not offered
And any attempted delete path remains NOT_SUPPORTED
Mandatory in acceptance slice: YES

AC-IMP-036G-003-06 — Validation failure on create/update
Story: US-IMP-036G-003
Given invalid required fields
When submit occurs
Then validation failure is announced accessibly
And no partial unauthorized write succeeds
Mandatory in acceptance slice: YES

AC-IMP-036G-003-07 — Unauthorized create/update denied
Story: US-IMP-036G-003
Given lacking manage permission
When create/update is attempted (UI or direct)
Then server denies
And UI does not claim success
Mandatory in acceptance slice: YES

AC-IMP-036G-003-08 — Cross-scope resource mutation denied
Story: US-IMP-036G-003
Given a resource outside actor scope
When mutation is attempted
Then denial occurs without disclosing unauthorized resource details beyond safe not-found/forbidden patterns
Mandatory in acceptance slice: YES

AC-IMP-036G-003-09 — Concurrent/stale update conflict handling
Story: US-IMP-036G-003
Given the resource changed since the form was loaded (where CURRENT conflict semantics exist)
When save is attempted
Then the person receives recoverable conflict/stale feedback rather than silent overwrite beyond existing authority
Mandatory in acceptance slice: YES

AC-IMP-036G-003-10 — Success feedback after maintain
Story: US-IMP-036G-003
Given a successful create/update/lifecycle change
When the mutation completes
Then success feedback is visible
And subsequent browse/detail reflects the change
Mandatory in acceptance slice: YES
```

### US-IMP-036G-004

```text
AC-IMP-036G-004-01 — List memberships in scope
Story: US-IMP-036G-004
Given access.membership.read
When Memberships is opened
Then authorized memberships list with member label, scope, and status
Mandatory in acceptance slice: YES

AC-IMP-036G-004-02 — Create membership UI (was missing)
Story: US-IMP-036G-004
Given membership manage authority and a valid existing workforce identity reference
When the person creates a membership at an authorized scope
Then membership is created via existing POST /memberships
And appears in list/detail
Mandatory in acceptance slice: YES

AC-IMP-036G-004-03 — Legal transition invited → active
Story: US-IMP-036G-004
Given membership status invited and manage authority
When Activate is confirmed
Then status becomes active
Mandatory in acceptance slice: YES

AC-IMP-036G-004-04 — Legal transition invited → revoked
Story: US-IMP-036G-004
Given invited membership
When Revoke is confirmed with consequence copy
Then status becomes revoked (terminal)
Mandatory in acceptance slice: YES

AC-IMP-036G-004-05 — Legal transition invited → expired (API supported; UI affordance = §25)
Story: US-IMP-036G-004
Given invited membership and API support for expired
When Expire is used IF V1 exposes the affordance
Then status becomes expired (terminal)
And if V1 does not expose Expire, document disposition per §25 item 5 without claiming CURRENT UI already has it
Mandatory in acceptance slice: YES (path disposition depends on §25 item 5)

AC-IMP-036G-004-06 — Legal transition active → suspended
Story: US-IMP-036G-004
Given active membership
When Suspend is confirmed with consequence
Then status becomes suspended
Mandatory in acceptance slice: YES

AC-IMP-036G-004-07 — Legal transition active → revoked
Story: US-IMP-036G-004
Given active membership
When Revoke is confirmed with consequence
Then status becomes revoked (terminal)
Mandatory in acceptance slice: YES

AC-IMP-036G-004-08 — Legal transition suspended → active
Story: US-IMP-036G-004
Given suspended membership
When Activate is confirmed
Then status becomes active
Mandatory in acceptance slice: YES

AC-IMP-036G-004-09 — Legal transition suspended → revoked
Story: US-IMP-036G-004
Given suspended membership
When Revoke is confirmed
Then status becomes revoked (terminal)
Mandatory in acceptance slice: YES

AC-IMP-036G-004-10 — Illegal transitions rejected
Story: US-IMP-036G-004
Given revoked or expired membership (terminal) OR any illegal from→to pair
When an illegal transition is attempted
Then the action is unavailable and/or server rejects
And status remains unchanged
Mandatory in acceptance slice: YES

AC-IMP-036G-004-11 — Self-membership create deny (existing rule)
Story: US-IMP-036G-004
Given actor attempts to create a membership for themselves where CURRENT deny applies
When create is submitted
Then the action is denied
Mandatory in acceptance slice: YES

AC-IMP-036G-004-12 — Membership mutation protects GJ continuity boundary
Story: US-IMP-036G-004
Given a permitted outlet-access member under GJ-PERMITTED-OUTLET-ACCESS
When an authorized admin completes a legal membership/role change within ceiling
Then permitted access continuity remains coherent for the accepted Golden Journey
And unauthorized scopes remain denied
And no invitation delivery is required or promised
Mandatory in acceptance slice: YES
```

### US-IMP-036G-005

```text
AC-IMP-036G-005-01 — List role assignments for membership
Story: US-IMP-036G-005
Given access.role_assignment.read and membership in scope
When detail Access section loads
Then current assignments show role key and revoked state clearly
Mandatory in acceptance slice: YES

AC-IMP-036G-005-02 — Grant system role within ceiling
Story: US-IMP-036G-005
Given manage authority and a system role allowed at membership scope within actor ceiling
When Grant is confirmed with explicit target/scope/consequence
Then assignment is created
Mandatory in acceptance slice: YES

AC-IMP-036G-005-03 — Revoke role with consequence confirmation
Story: US-IMP-036G-005
Given an active assignment and manage authority
When Revoke is chosen
Then confirmation shows target, role, scope, plain-language consequence
And Cancel leaves assignment unchanged
And Confirm revokes
Mandatory in acceptance slice: YES

AC-IMP-036G-005-04 — Delegation ceiling deny
Story: US-IMP-036G-005
Given a role above actor ceiling
When Grant is attempted
Then server denies
And UI reports denial without granting
Mandatory in acceptance slice: YES

AC-IMP-036G-005-05 — Self-elevation deny
Story: US-IMP-036G-005
Given actor attempts to grant elevating role to self where CURRENT deny applies
When Grant is attempted
Then denial occurs
Mandatory in acceptance slice: YES

AC-IMP-036G-005-06 — Cross-scope grant deny
Story: US-IMP-036G-005
Given membership outside actor scope
When grant/revoke is attempted
Then denial/not-found safe handling occurs
Mandatory in acceptance slice: YES

AC-IMP-036G-005-07 — Role not allowed at membership scope
Story: US-IMP-036G-005
Given a system role incompatible with membership scopeType
When Grant is attempted
Then denial occurs (CURRENT scope allow-list)
Mandatory in acceptance slice: YES

AC-IMP-036G-005-08 — Custom / arbitrary role not supported
Story: US-IMP-036G-005
Given Admin Access UI
When choosing a role
Then only existing system roles are offered
And custom role / permission-editor paths are absent
Mandatory in acceptance slice: YES

AC-IMP-036G-005-09 — Stale assignment revoke
Story: US-IMP-036G-005
Given assignment already revoked or missing
When revoke is attempted
Then safe stale/not-found handling occurs without false success
Mandatory in acceptance slice: YES

AC-IMP-036G-005-10 — No second-approval / four-eyes workflow
Story: US-IMP-036G-005
Given grant/revoke/suspend/deactivate flows
When confirmation is shown
Then confirm/cancel is single-actor confirmation only
And no review-token / four-eyes workflow is introduced
Mandatory in acceptance slice: YES

AC-IMP-036G-005-11 — Success feedback after grant/revoke
Story: US-IMP-036G-005
Given successful grant or revoke
When mutation completes
Then success feedback is shown and assignment list refreshes truthfully
Mandatory in acceptance slice: YES
```

### US-IMP-036G-006

```text
AC-IMP-036G-006-01 — Inspect calling-actor effective permissions at resource
Story: US-IMP-036G-006
Given access.effective_permissions.read and a valid resource context
When Effective Permissions is opened
Then permissions projected for the CALLING ACTOR at that resource are shown (CURRENT_SUPPORTED)
Mandatory in acceptance slice: YES

AC-IMP-036G-006-02 — Empty permission projection
Story: US-IMP-036G-006
Given authorized read but no effective permissions at resource
When projection loads
Then empty diagnostic state is clear (not an error)
Mandatory in acceptance slice: YES

AC-IMP-036G-006-03 — Unauthorized effective-permissions resource
Story: US-IMP-036G-006
Given lacking permission or resource out of scope
When GET effective-permissions is attempted
Then denial occurs without leaking unauthorized permission sets
Mandatory in acceptance slice: YES

AC-IMP-036G-006-04 — Invalid resource query rejected
Story: US-IMP-036G-006
Given malformed resourceType/ids
When diagnostic is requested
Then invalid request is shown; no invented projection
Mandatory in acceptance slice: YES

AC-IMP-036G-006-05 — Diagnostic is read-only
Story: US-IMP-036G-006
Given Effective Permissions surface
When the person interacts
Then no grant/edit of arbitrary permissions is possible from this diagnostic
Mandatory in acceptance slice: YES

AC-IMP-036G-006-06 — Subject-principal diagnostic disposition
Story: US-IMP-036G-006
Given journey wording that implies inspecting a managed member’s effective permissions
When V1 scope is evaluated
Then either (a) caller-scoped projection is accepted as V1 sufficient, OR (b) subject-principal diagnostic is required
And (b) conflicts with EXPECTED_NEW_API: NO and is UNRESOLVED / ARCHITECTURE_FIT_REQUIRED (§25 item 1)
And this AC must not silently assume a new subject API
Mandatory in acceptance slice: YES (disposition gate; not an invented API)

AC-IMP-036G-006-07 — Post-grant caller re-inspect
Story: US-IMP-036G-006
Given actor granted a role within ceiling
When actor re-inspects effective permissions at resource (caller projection)
Then projection remains truthful for the caller (does not claim subject principal unless §25 resolves otherwise)
Mandatory in acceptance slice: YES

AC-IMP-036G-006-08 — Reload diagnostic
Story: US-IMP-036G-006
Given a prior projection
When reload occurs
Then projection re-fetches CURRENT caller-scoped permissions
Mandatory in acceptance slice: YES
```

### US-IMP-036G-007

```text
AC-IMP-036G-007-01 — List authorized audit events
Story: US-IMP-036G-007
Given access.audit.read
When Audit opens
Then authorized events show understandable actor/action/target/time fields from existing event shape
Mandatory in acceptance slice: YES

AC-IMP-036G-007-02 — Empty audit
Story: US-IMP-036G-007
Given authorized read and no visible events
When Audit loads
Then empty state is shown with safe next-step guidance
Mandatory in acceptance slice: YES

AC-IMP-036G-007-03 — Authorized list cap 200
Story: US-IMP-036G-007
Given more than 200 authorized matching events exist
When list loads
Then results respect CURRENT authorized list cap (200)
And UI does not claim completeness beyond that cap without disclosure
Mandatory in acceptance slice: YES

AC-IMP-036G-007-04 — Unauthorized audit denied
Story: US-IMP-036G-007
Given lacking access.audit.read
When Audit is requested
Then denial occurs without event disclosure
Mandatory in acceptance slice: YES

AC-IMP-036G-007-05 — No HTTP query filters today
Story: US-IMP-036G-007
Given CURRENT audit GET
When actor/action/date filter query params are considered
Then HTTP server query filters are NOT_FOUND
And V1 filtering disposition is client-side of authorized list OR requires product/architecture decision (§25 item 3)
Mandatory in acceptance slice: YES (boundary)

AC-IMP-036G-007-06 — Client-side filter of authorized list (if chosen)
Story: US-IMP-036G-007
Given V1 chooses client-side filter over the authorized capped list
When the person filters by actor/action/date locally
Then only already-authorized returned events are narrowed
And no new server API is implied
Mandatory in acceptance slice: YES if that disposition is selected; else N/A with §25

AC-IMP-036G-007-07 — Server query filters (if required) blocked by EXPECTED_NEW_API:NO
Story: US-IMP-036G-007
Given product requires true server-side filtered queries beyond CURRENT
When Architecture Fit evaluates
Then this is ARCHITECTURE_FIT_REQUIRED / conflicts EXPECTED_NEW_API: NO unless authority changes
Mandatory in acceptance slice: NO (FOLLOW_UP / decision) — recorded so V1 does not invent API

AC-IMP-036G-007-08 — Audit append-only (no rewrite UI)
Story: US-IMP-036G-007
Given Audit surface
When the person interacts
Then no edit/delete of audit history is offered
Mandatory in acceptance slice: YES

AC-IMP-036G-007-09 — Network error recovery on audit
Story: US-IMP-036G-007
Given audit fetch fails transiently
When retry is used
Then list can recover without fabricating events
Mandatory in acceptance slice: YES
```

### US-IMP-036G-008

```text
AC-IMP-036G-008-01 — Inspect safe operational status when authorized
Story: US-IMP-036G-008
Given the person is authorized for existing operational-status read (Ops transport)
When System → Operational Status is opened from Admin IA
Then a safe status projection from existing GET /api/operations/v1/operational-status is shown
And Admin does not invent a second status authority
Mandatory in acceptance slice: YES

AC-IMP-036G-008-02 — Unauthorized operational status
Story: US-IMP-036G-008
Given lacking order.read / Ops status authority
When status is requested
Then denial/unavailable is clear
And no fabricated healthy/unhealthy truth is shown
Mandatory in acceptance slice: YES

AC-IMP-036G-008-03 — Admin is not Ops dashboard
Story: US-IMP-036G-008
Given Admin System Operational Status
When the person reviews available actions
Then Ops workflows (fulfilment, kitchen, delivery ops tasks) are not duplicated inside Admin
Mandatory in acceptance slice: YES

AC-IMP-036G-008-04 — Open Operations navigation when separately authorized
Story: US-IMP-036G-008
Given the person is separately authorized for Operations portal entry
When Open Operations is used
Then navigation hand-off to Operations occurs
And Admin session does not auto-grant Ops permissions
Mandatory in acceptance slice: YES

AC-IMP-036G-008-05 — Open Operations unavailable when not authorized
Story: US-IMP-036G-008
Given no Ops portal authorization
When System status is viewed
Then Open Operations is absent or non-actionable with clear messaging
Mandatory in acceptance slice: YES

AC-IMP-036G-008-06 — No secrets in status projection
Story: US-IMP-036G-008
Given operational status is visible
When content is inspected
Then secrets/credentials/provider keys are not displayed
Mandatory in acceptance slice: YES

AC-IMP-036G-008-07 — Status reload
Story: US-IMP-036G-008
Given a prior status view
When reload occurs
Then status re-fetches CURRENT Ops projection
Mandatory in acceptance slice: YES

AC-IMP-036G-008-08 — Error recovery on status fetch
Story: US-IMP-036G-008
Given Ops status fetch fails
When retry is offered
Then recovery does not claim Admin-owned status authority
Mandatory in acceptance slice: YES
```

### Evidence matrix (planned proof only)

| Story / AC ID | Required behaviour / risk | Applicable test layers | Planned proof | Actual evidence / candidate / result |
|---|---|---|---|---|
| US-001 / AC-001-* | Admin context, IA, authz boundaries | unit/component + integration + E2E as applicable (TEST-1) | Planned Admin overview/navigation suite | `NOT_EXECUTED` / pending implementation |
| US-002 / AC-002-* | Hierarchy browse, empty/forbidden/stale | integration + E2E | Planned hierarchy browse suite | `NOT_EXECUTED` / pending implementation |
| US-003 / AC-003-* | Create/update/active-inactive; no delete; confirm deactivate | integration + E2E + a11y for dialogs | Planned resource maintain suite | `NOT_EXECUTED` / pending implementation |
| US-004 / AC-004-* | Membership legal/illegal transitions; create UI; GJ continuity | integration + E2E; GJ regression | Planned membership suite + GJ-PERMITTED-OUTLET-ACCESS continuity | `NOT_EXECUTED` / pending implementation |
| US-005 / AC-005-* | Grant/revoke; ceiling; self-elevation; cross-scope; confirm | integration + negative security + E2E | Planned role-assignment suite | `NOT_EXECUTED` / pending implementation |
| US-006 / AC-006-* | Caller effective permissions; subject-principal disposition | integration; Fit decision evidence | Planned diagnostic suite (caller); subject path blocked pending §25 | `NOT_EXECUTED` / pending implementation |
| US-007 / AC-007-* | Audit list/cap/filter disposition | integration + E2E | Planned audit suite | `NOT_EXECUTED` / pending implementation |
| US-008 / AC-008-* | Ops status reuse; Admin≠Ops; Open Operations | integration + E2E authz | Planned status/hand-off suite | `NOT_EXECUTED` / pending implementation |

Every mandatory AC needs passing evidence under TEST-1 after implementation authorization. Planned proof is **not** proven.

---

## 11. Business rules

| Rule ID | User/business rule | Authority / rationale | Story / AC IDs |
|---|---|---|---|
| `BR-IMP-036G-001` | Admin UI must not require API/domain knowledge for primary tasks; plain-language labels and hierarchy context | Product outcome; enterprise UX plan | US-001; AC-001-01 |
| `BR-IMP-036G-002` | Navigation and actions are capability-gated; hidden UI never substitutes for server authorization | D-373; ARCH-G25 | US-001; AC-001-03/08 |
| `BR-IMP-036G-003` | Hierarchy browse uses existing resource projections only | IMP-035 CURRENT_SUPPORTED | US-002 |
| `BR-IMP-036G-004` | Cross-scope resource disclosure is forbidden | D-373 authorize-first collections | US-002 AC-002-07/08; US-003 AC-003-08 |
| `BR-IMP-036G-005` | Organization resources support create/update and soft active/inactive only | IMP-035; no DELETE | US-003 |
| `BR-IMP-036G-006` | Hard DELETE is NOT_SUPPORTED | IMP-035 / non-goal | AC-003-05 |
| `BR-IMP-036G-007` | Deactivate requires consequence confirmation (target, scope, plain language, confirm/cancel) | Product safety | AC-003-04; BR-021 |
| `BR-IMP-036G-008` | Membership statuses are invited\|active\|suspended\|revoked\|expired only | IMP-035 CURRENT | US-004 |
| `BR-IMP-036G-009` | Only legal transitions are permitted; terminal revoked/expired have no further transitions | IMP-035 CURRENT | AC-004-03…010 |
| `BR-IMP-036G-010` | Invitation delivery is out of scope; create membership assumes existing identity reference paths CURRENT supports | GJ registry; non-goal | AC-004-02/12 |
| `BR-IMP-036G-011` | Only existing system roles may be granted | IMP-035; EXPECTED_NEW_ROLE: NO | AC-005-02/08 |
| `BR-IMP-036G-012` | Delegation ceiling and self-elevation denies are enforced server-side and reflected in UX | Access Control CURRENT | AC-005-04/05 |
| `BR-IMP-036G-013` | No four-eyes / second-approval / review-token workflow | Product non-goal | AC-005-10 |
| `BR-IMP-036G-014` | Effective-permissions diagnostic is read-only | IMP-035 | AC-006-05 |
| `BR-IMP-036G-015` | CURRENT effective-permissions projects calling actor; subject-principal requires decision (§25) | VERIFIED runtime gap | AC-006-01/06 |
| `BR-IMP-036G-016` | Audit is append-only authorized list; cap 200 | IMP-035 LIST_LIMIT behaviour | AC-007-01/03/08 |
| `BR-IMP-036G-017` | HTTP audit query filters are NOT_FOUND; V1 filter mechanism is a decision (§25 item 3) | VERIFIED | AC-007-05…07 |
| `BR-IMP-036G-018` | Admin must not become Operations dashboard; Open Operations is navigation only if separately authorized | D-373 vs Ops; plan | US-008 |
| `BR-IMP-036G-019` | Operational status reuses existing Ops endpoint authority; no Admin-invented health store | CURRENT Ops API | AC-008-01/03 |
| `BR-IMP-036G-020` | Overview cards without safe existing projections are FOLLOW_UP / Fit — do not invent KPI truth | Product planning | AC-001-06; §25 item 2 |
| `BR-IMP-036G-021` | High-consequence actions (suspend/revoke membership, grant/revoke role, deactivate resource) require explicit confirmation with target, scope, consequence, confirm/cancel | Product safety | US-003/004/005 |
| `BR-IMP-036G-022` | EXPECTED_NEW_SCHEMA/SERVICE/AUTH_MODEL/ROLE/PERMISSION/RBAC_SEMANTICS/API = NO for this slice planning posture | Supporting plan + PD posture | §§1, 21, 25 |
| `BR-IMP-036G-023` | Desktop-first; tablet/mobile readable/navigable/safe; full complex authoring parity on small mobile NOT mandatory V1 | Responsive policy | §18; §25 item 4 |
| `BR-IMP-036G-024` | Accessibility intent WCAG 2.2 AA with observable keyboard/focus/label/announcement requirements | A11y policy | §18 |
| `BR-IMP-036G-025` | Persona labels never authorize actions | PERSONA-1 | §4, §14 |

Unresolved material rules remain in §25.

---

## 12. Journey Completeness Matrix

| Journey dimension | Behaviour / applicability or N/A reason | Story / AC references |
|---|---|---|
| ENTRY | Admin portal entry with session eligibility | AC-001-01/04 |
| DISCOVERY | IA navigation to Organization/Workforce/Access/Audit/System | AC-001-05 |
| CONTEXT | Signed-in identity + capability-visible scope | AC-001-02/03 |
| EMPTY / FIRST USE | Empty hierarchy/memberships/audit; limited capabilities | AC-001-03; AC-002-06; AC-004-01; AC-007-02 |
| HAPPY PATH | Browse → maintain → membership/role → inspect → audit/status | US-001…008 happy ACs |
| ALTERNATE VALID PATHS | Activate vs suspend vs revoke; Open Operations hand-off; caller permission inspect | US-004/005/006/008 |
| VALIDATION FAILURE | Invalid resource/membership fields | AC-003-06; AC-006-04 |
| AUTHORIZATION | Capability gates; ceiling; self-elevation; cross-scope | AC-001-08; AC-003-07/08; AC-005-04…06; AC-007-04; AC-008-02 |
| NOT FOUND / STALE REFERENCE | Missing resource/membership/assignment | AC-002-08; AC-003-09; AC-005-09 |
| SERVER / NETWORK ERROR | Fetch/mutation failure with retry | AC-001-07; AC-007-09; AC-008-08 |
| RECOVERY | Re-auth; retry; cancel confirmation; reload | AC-001-07; AC-003-04 cancel; AC-005-03 cancel |
| CONCURRENCY | Stale update/assignment; no invented locking beyond CURRENT | AC-003-09; AC-005-09 |
| DESTRUCTIVE ACTION | Suspend/revoke/deactivate/grant-revoke with confirmation (not hard-delete) | BR-021; AC-003-04; AC-004-04/06/07; AC-005-03 |
| SUCCESS FEEDBACK | Visible success + refreshed projections | AC-003-10; AC-005-11 |
| DOWNSTREAM EFFECT | GJ-PERMITTED-OUTLET-ACCESS continuity; no invitation delivery | AC-004-12 |
| REVISIT / RELOAD | Re-fetch authorized truth | AC-002-09; AC-006-08; AC-008-07 |
| RESPONSIVE / MOBILE | Desktop-full V1; tablet/mobile safe; small-mobile mutation parity residual §25 item 4 | §18 |
| ACCESSIBILITY | WCAG 2.2 AA intent observables | §18; confirmation dialogs announced |

---

## 13. UX state matrix

| Surface / state | Entry condition | Visible feedback / available actions | Focus / keyboard behaviour | Next / recovery state | AC ID or N/A reason |
|---|---|---|---|---|---|
| Overview / loading | Admin entry | Loading label | Focus on main landmark | ready / unauthorized / error | AC-001-01 |
| Overview / ready | Session OK | IA links; identity; limited messaging if needed | Tab through nav links | navigate destinations | AC-001-02/03/05 |
| Overview / unauthorized | No session | Sign-in CTA | Focus sign-in | login → return | AC-001-04 |
| Hierarchy list / empty | Read OK, 0 items | Empty + next action if create allowed | Focus empty guidance | create or leave | AC-002-06 |
| Hierarchy list / forbidden | Missing read | Non-disclosing denial | Focus message | leave / request access offline | AC-002-07 |
| Resource form / validation | Invalid submit | Field errors announced | Focus first error | correct → resubmit | AC-003-06 |
| Resource / deactivate confirm | Deactivate chosen | Target/scope/consequence; Confirm/Cancel | Focus dialog; Esc = cancel | confirm → success; cancel → prior | AC-003-04 |
| Memberships list / ready | membership.read | Rows to detail; create if authorized | Keyboard list nav | detail/create | AC-004-01/02 |
| Membership / transition confirm | Suspend/Revoke(/Expire) | Consequence confirm | Dialog focus trap | success or cancel | AC-004-04…09 |
| Membership / illegal transition | Terminal or illegal | Action hidden or denied | N/A | remain terminal | AC-004-10 |
| Role grant / deny | Ceiling/self/cross-scope | Denial message | Focus error | choose allowed role or stop | AC-005-04…07 |
| Role revoke confirm | Revoke chosen | Consequence confirm | Dialog a11y | success/cancel | AC-005-03 |
| Effective permissions / ready | authorized | Permission list or empty | Readable list/semantics | reload | AC-006-01/02 |
| Audit / capped | >200 authorized | Cap disclosure | Focus list | local filter if disposition allows | AC-007-03/06 |
| Ops status / unauthorized | missing order.read | Unavailable | Focus message | Open Ops absent | AC-008-02/05 |
| Ops status / ready | authorized | Safe status + optional Open Operations | Keyboard actions | Ops hand-off | AC-008-01/04 |
| Pending mutation | In-flight POST | Pending/disabled duplicate submit | Focus pending control | success/failure | cross-cutting |
| Server error | Fetch/mutation fail | Error + retry | Focus retry | recover | AC-007-09; AC-008-08 |

---

## 14. Permissions / resource context

| Action | Existing identity / permission authority | Resource context / server-derived scope | Allowed / denied / cross-scope variants | AC IDs |
|---|---|---|---|---|
| Enter Admin / session | Workforce session; Admin portal | Server session projection | Auth required; no client authority | AC-001-04 |
| Browse Brands | `brand.read` | Authorized brands | Deny outside scope | AC-002-01/07 |
| Browse Orgs/Territories/LE/Outlets | `organization.read` / `territory.read` / `legal_entity.read` / `outlet.read` | Hierarchy ids server-derived | Deny cross-scope | AC-002-02…05/07 |
| Create/update/lifecycle resources | Existing manage permissions per type (IMP-035) | Scoped resource | Deny unauthorized; no DELETE | US-003 |
| List/create/transition memberships | `access.membership.read` / manage (IMP-035) | Membership scope resource | Legal transitions only; self-create deny where CURRENT | US-004 |
| List/grant/revoke roles | `access.role_assignment.read` / manage | Membership resource + role allow-list | Ceiling; self-elevation; scope allow-list | US-005 |
| Effective permissions | `access.effective_permissions.read` | Resource query; **caller principal** CURRENT | Subject principal = §25 | US-006 |
| Audit list | `access.audit.read` | Authorized events; cap 200 | No HTTP filters CURRENT | US-007 |
| Operational status | Ops `order.read` via `/api/operations/v1/operational-status` | Ops transport | Admin≠Ops; Open Ops if separately authorized | US-008 |

Persona labels do **not** authorize. Unknown material authority → stop for decision gate.

---

## 15. Data implications

- **Existing data authority only:** Organization resources, Access memberships, role assignments,
  effective-permission computation, access audit events, Ops operational-status projection.
- **Inputs/outputs:** Admin UI reads/writes exclusively through existing `/api/admin/v1/*` (and Ops
  status GET where authorized). No new persistence authority expected (`EXPECTED_NEW_SCHEMA: NO`).
- **Lifecycle:** Soft active/inactive for resources; membership invited/active/suspended/revoked/expired;
  role revoke soft semantics as CURRENT; audit append-only.
- **Reload:** All lists/details re-fetch authorized CURRENT projections.
- **Immutable/historical:** Audit events are not editable via Admin.
- **Migration:** None expected for V1 product behaviour if Fit confirms UI-only composition.
- Architecture Fit must confirm mapping; do not invent tables, services, or tenancy models.

---

## 16. Security/privacy

- Trust boundary: workforce session → Admin transport (D-373) distinct from Customer and Ops transports.
- Client-supplied role/permission/membership/scope objects are never authority.
- Positive ACs: authorized happy paths within scope.
- Negative ACs: unauthorized, cross-scope, ceiling exceed, self-elevation, illegal transitions, hard-delete absence, secrets absence in status.
- Sensitive principal/access/audit data minimized; non-disclosing 404/403 patterns for out-of-scope.
- Subject-principal effective-permissions API would expand diagnostic surface and conflicts
  `EXPECTED_NEW_API: NO` until decided (§25 item 1).
- No secrets management, credential display, or provider-key administration in this slice.

---

## 17. Concurrency/recovery

- Overlapping mutations: rely on existing server authorization and CURRENT conflict/stale semantics;
  UI shows recoverable errors; no invented distributed lock service.
- Duplicate submits: pending mutation disables duplicate confirm where applicable.
- Stale membership/assignment/resource: safe not-found/conflict handling (ACs above).
- Partial failure: no false success; retry explicit.
- Interruption/revisit: reload re-fetches truth; confirmation cancel is non-destructive.
- Session expiry: re-auth required before further privileged mutation.
- N/A: new idempotency keys / queue semantics — not in scope (`EXPECTED_NEW_*: NO`).

---

## 18. Accessibility / responsive expectations

**Responsive**

- Desktop-first; full V1 authoring journeys on desktop.
- Tablet/mobile: readable, navigable, safe inspection; primary tasks reachable where practical.
- Small-mobile full parity for every high-consequence mutation is **NOT mandatory V1**; residual
  product question if inspection-first fallback is acceptable (§25 item 4).

**Accessibility (WCAG 2.2 AA intent; observable)**

- Keyboard access to hierarchy, tables/lists, dialogs, and primary actions.
- Visible focus; semantic headings/landmarks; labeled form controls.
- Confirmation dialogs announce target/consequence; Esc cancels.
- Status/lifecycle not by color alone.
- Validation and mutation results announced to assistive tech.
- Evidence: manual keyboard + AT sampling under TEST-1; automated scan alone insufficient.

---

## 19. Observability / supportability

- Users identify failures via Admin error/empty/unauthorized states and safe correlation already
  supported by platform patterns (no new observability platform).
- Audit trail (US-007) is the primary Admin support artifact for access changes.
- Operational status (US-008) supports hand-off; deeper Ops investigation remains Operations.
- Privacy: do not dump secrets or unauthorized principal inventories into support UI.
- N/A for new metrics backends / analytics products (non-goal).

---

## 20. Golden Journeys affected

| GJ ID / registry status | Affected steps / downstream behaviour | Mandatory for this acceptance? | Related story / AC IDs | Required proof / actual evidence |
|---|---|---|---|---|
| `GJ-PERMITTED-OUTLET-ACCESS` / `JOURNEY-PERMITTED-OUTLET-ACCESS` / `CURRENT` | Admin-side membership + role assignment continuity within delegation ceiling; other scopes remain denied; **no invitation delivery** | YES — protect continuity (do not break); do not re-litigate invitation delivery | US-004, US-005; AC-004-12; AC-005-02/03 | Planned real-browser continuity proof under TEST-1; actual evidence `NOT_EXECUTED` / pending implementation |
| Other GJs (FIRST-ORDER, PRODUCT-MENU-LAUNCH, etc.) | Not primary Admin V2 acceptance; commercial Admin surfaces remain separate | NO as IMP-036G mandatory acceptance | N/A | Regression only if shared shell risk proven |

---

## 21. Dependencies

| Dependency | Authority / verified state | Required before which story or gate? | Unresolved impact |
|---|---|---|---|
| IMP-035 Admin API + Access Control | `COMPLETE_AND_ACCEPTED` CURRENT_SUPPORTED | All stories | NONE for core transport |
| D-373 / ARCH-G25 | CURRENT binding | All stories | NONE |
| IMP-036A portal foundation | Accepted | Entry/shell | NONE |
| Ops operational-status endpoint | CURRENT Ops API | US-008 | NONE if reused; Fit confirms Admin composition |
| Product Definition Gate | NOT_PERFORMED | Before Architecture Fit / implementation | Blocks READY |
| Architecture Fit / lock | NOT_PERFORMED / NOT_LOCKED | Before implementation authorization | Blocks READY; §25 items |
| §25 unresolved decisions | Open | US-004 expire; US-006 subject; US-007 filters; Overview cards; small-mobile | `UNRESOLVED_DECISION_REQUIRED` |
| IMP-037 | `nextProductSlice`; **IMP037_ACTIVATED: NO** | N/A — must not activate | NONE |

---

## 22. Supported now

| Behaviour | Existing verified or V1 acceptance commitment? | Story / AC IDs / source |
|---|---|---|
| `/api/admin/v1/*` resource CRUD (soft lifecycle), memberships, role assignments, effective-permissions GET, audit GET | Existing verified CURRENT_SUPPORTED | IMP-035 / D-373; §3 |
| Membership legal transition matrix (API) | Existing verified | §3; US-004 |
| System roles; ceiling; self-elevation deny | Existing verified | US-005 |
| Partial Admin UI (hub, brands list, membership detail transitions/grant/revoke, audit list) | Existing verified PARTIAL | §3 |
| Ops `GET /api/operations/v1/operational-status` | Existing verified (Ops) | US-008 |
| Coherent Admin IA + full hierarchy CRUD UI + create membership UI + consequence UX + Admin status hand-off | V1 acceptance commitment (`PLANNED_IMP036G`) — not yet implemented/accepted | US-001…008 |
| Caller-scoped effective permissions diagnostic | Existing verified; V1 must include at minimum | US-006 |
| GJ-PERMITTED-OUTLET-ACCESS continuity protection | Existing CURRENT GJ; V1 must not break | AC-004-12 |

Proposed V1 UI behaviour is not accepted until canonical gates pass.

---

## 23. Explicitly deferred

| `EXPLICITLY_DEFERRED` behaviour | FOLLOW_UP or DEFERRED | Reason / consequence | Revisit dependency / decision owner |
|---|---|---|---|
| Overview summary cards lacking safe existing projections | FOLLOW_UP | Do not invent KPI truth stores | Architecture Fit / product owner (§25 item 2) |
| Server-side audit query filters beyond CURRENT | FOLLOW_UP / decision | HTTP filters NOT_FOUND; EXPECTED_NEW_API: NO | Product + Architecture (§25 item 3) |
| Subject-principal effective-permissions API | FOLLOW_UP / decision | Conflicts EXPECTED_NEW_API: NO | Product + Architecture (§25 item 1) |
| Invitation delivery (email/SMS) system | DEFERRED | Not promised by GJ; non-goal | Future capability decision |
| Analytics / BI on Admin | DEFERRED | Non-goal | Future |
| Full small-mobile authoring parity for all high-consequence mutations | DEFERRED / residual question | Desktop-first policy; §25 item 4 | Product owner |
| Custom visual redesign requiring Figma-first | DEFERRED | Plan: Figma not required initially | Design later without redefining authority |

---

## 24. Not supported by design

| `NOT_SUPPORTED_BY_DESIGN` behaviour | Reason / authority | User-visible boundary / relevant AC |
|---|---|---|
| Custom roles / permission editor / arbitrary grants | Non-goal; EXPECTED_NEW_ROLE/PERMISSION/RBAC: NO | AC-005-08 |
| Hard DELETE of organization resources | IMP-035 soft lifecycle only | AC-003-05 |
| Customer-account administration in this slice | Non-goal | Explicit absence from IA |
| Secrets / credential / provider-key admin | Non-goal | AC-008-06 |
| Commercial Catalog/Menu/Pricing duplication as IMP-036G acceptance | Separate IMP-036F surfaces | AC-001-05 boundary |
| Ops workflow duplication / Admin-as-workforce-dashboard | Admin≠Ops | AC-008-03 |
| New service / auth model / tenancy / schema / API as planned posture | EXPECTED_NEW_*: NO | §1; §25 |
| Four-eyes / second approval / review tokens | Non-goal | AC-005-10 |
| Treating persona as authorization | PERSONA-1 | BR-025 |

---

## 25. Unresolved / decision required

| `UNRESOLVED_DECISION_REQUIRED` item | Material user/business impact | Decision owner / evidence needed | Affected stories / gate |
|---|---|---|---|
| **1. US-006 subject-principal vs caller-scoped effective permissions** — CURRENT API projects calling actor only (VERIFIED). Journey wording implies inspecting resulting permissions for a managed member. Requiring subject-principal diagnostic implies new API and conflicts `EXPECTED_NEW_API: NO`. Is caller-scoped projection sufficient for V1? | Determines whether V1 diagnostic meets access-management consequence job or needs API/authority change | Founder/product + Architecture Fit; runtime evidence of `adminGetEffectivePermissions` using `actor: principal` | US-006; AC-006-06; **UNRESOLVED_DECISION_REQUIRED** / **ARCHITECTURE_FIT_REQUIRED** — STOP affected work until resolved |
| **2. Overview summary cards without existing list projections** — Cards for hierarchy counts, membership attention, recent access changes, health need safe existing projections; inventing derived KPI authority is forbidden | Affects Overview usefulness vs honesty | Product + Architecture Fit; inventory which list projections already exist | US-001; AC-001-06; BR-020; **Architecture Fit / FOLLOW_UP** for cards lacking projections |
| **3. Audit V1 filtering** — Event fields include actor/action/date; HTTP query filters NOT_FOUND; list capped 200. Client-side filter of authorized list vs need for server query filters? | Affects investigation usability and whether NEW API is demanded | Product + Architecture; evidence of CURRENT audit GET | US-007; AC-007-05…07; **product/architecture question** under EXPECTED_NEW_API: NO |
| **4. Small-mobile high-consequence mutations** — Desktop-first says full V1 on desktop; is inspection-first fallback acceptable on small mobile for every suspend/revoke/grant/deactivate, or must every high-consequence mutation work on small mobile? | Affects responsive acceptance boundary | Product owner; if not fully settled by desktop-first direction, residual product question | §18; BR-023; **residual product question** |
| **5. Expire membership affordance** — API supports `invited→expired`; current UI has Activate/Suspend/Revoke only (no Expire control). Does V1 expose Expire? | Affects completeness of membership lifecycle UX vs CURRENT UI gap | Product owner; API evidence CURRENT; UI evidence PARTIAL | US-004; AC-004-05; **product choice** |

```text
UNRESOLVED_COUNT = 5
PRODUCT_DEFINITION_GATE cannot PASS while material unresolved decisions remain.
Gate Result remains NOT_PERFORMED for this draft (gate not executed).
Do NOT treat unresolved items as ASSUMED implementation choices.
```

---

## 26. Definition of Ready

| Story ID | Applicable fields complete / evidence | Open material decisions | Readiness / blocker |
|---|---|---|---|
| `US-IMP-036G-001` | §9 fields defined; ACs defined | §25 item 2 (Overview cards) | `NOT_READY_FOR_IMPLEMENTATION` |
| `US-IMP-036G-002` | §9 fields defined; ACs defined | NONE material | `NOT_READY_FOR_IMPLEMENTATION` (gates not performed / Fit not locked) |
| `US-IMP-036G-003` | §9 fields defined; ACs defined | NONE material beyond Fit mapping | `NOT_READY_FOR_IMPLEMENTATION` |
| `US-IMP-036G-004` | §9 fields defined; ACs defined | §25 item 5 (Expire affordance) | `NOT_READY_FOR_IMPLEMENTATION` |
| `US-IMP-036G-005` | §9 fields defined; ACs defined | NONE material for ceiling semantics | `NOT_READY_FOR_IMPLEMENTATION` |
| `US-IMP-036G-006` | §9 fields defined; ACs defined | §25 item 1 (subject vs caller) | `NOT_READY_FOR_IMPLEMENTATION` |
| `US-IMP-036G-007` | §9 fields defined; ACs defined | §25 item 3 (audit filters) | `NOT_READY_FOR_IMPLEMENTATION` |
| `US-IMP-036G-008` | §9 fields defined; ACs defined | NONE material if Ops reuse confirmed in Fit | `NOT_READY_FOR_IMPLEMENTATION` |

Open material decisions ≠ NONE for the slice overall → stories are **not** READY for implementation.
Product Definition Gate NOT_PERFORMED; Architecture Fit NOT_PERFORMED; architecture NOT_LOCKED;
implementation NOT_AUTHORIZED. `STORY_COMPLETE != IMP_ACCEPTED` (and neither has started).

---

## 27. Product Definition Gate

```text
PRE-GATE DRAFT: YES
PRODUCT_DEFINITION_GATE_EXECUTION = NOT_PERFORMED
Gate Result: NOT_PERFORMED

ACTUAL PRODUCT_DEFINITION_GATE EXECUTION:
Gate Result: NOT_PERFORMED
(No PASS or STOP evaluation has occurred. NOT_PERFORMED is not a third verdict; it means no evaluation.)
```

```text
PRODUCT_DEFINITION_GATE

Capability: IMP-036G — Administration Console V2
Product Definition Version: PD-IMP-036G-DRAFT-1
Document status: DRAFT
Business Outcome: Defined (authorized admin coherent Admin Console V2 within existing authority)
Primary Personas: PERSONA-WORKFORCE-OPERATOR (primary); PERSONA-PLATFORM-OPERATOR (secondary)
Journeys Defined: YES — current partial Admin + desired JOURNEY-G-ADMIN-CONTEXT / JOURNEY-G-ACCESS-MANAGEMENT / JOURNEY-G-ADMIN-INVESTIGATION
Story Map Complete: YES (US-IMP-036G-001 … 008)
Acceptance Slice Defined: YES (V1_ACCEPTANCE_SLICE + FOLLOW_UP/DEFERRED dispositions)
Happy Paths Defined: YES
Alternate Paths Defined: YES
Empty / First-Use States Defined: YES
Error / Recovery Paths Defined: YES
Authorization Variants Defined: YES (capability, ceiling, self-elevation, cross-scope)
Cross-Scope Scenarios Defined: YES
Concurrency Considered: YES (stale/conflict within CURRENT; no new concurrency service)
Destructive Actions Defined: YES (consequence confirmation; no hard-delete; no four-eyes)
UX State Matrix Complete: YES
Accessibility Considered: YES (WCAG 2.2 AA intent)
Responsive Considered: YES (desktop-first; §25 item 4 residual)
Golden Journeys Identified: YES — GJ-PERMITTED-OUTLET-ACCESS continuity (CURRENT; protect)
Explicit Deferrals Recorded: YES
Unresolved Product Decisions: YES — five §25 items (subject-principal EP; Overview cards; audit filters; small-mobile mutations; expire affordance)
Architecture Conflicts: NONE claimed as resolved; Fit NOT_PERFORMED; EXPECTED_NEW_*: NO posture recorded; subject-principal and server audit filters flagged ARCHITECTURE_FIT_REQUIRED if demanded
Architecture Fit Inputs (planning; not verdicts):
- Map all V1 UI mutations to existing /api/admin/v1/* commands only
- Confirm Admin operational status composition via existing Ops GET without Admin≠Ops bleed
- Resolve §25 items 1–5 before claiming definition completeness for PASS
- EXPECTED_NEW_SCHEMA/SERVICE/AUTH_MODEL/ROLE/PERMISSION/RBAC_SEMANTICS/API: NO
PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED
Gate Result: NOT_PERFORMED
```

```text
ARCHITECTURE_FIT_EXECUTION: NOT_PERFORMED
ARCHITECTURE_FIT_RESULT: NOT_PERFORMED
ARCHITECTURE_FIT: NOT_PERFORMED
IMP036G_ARCHITECTURE_LOCKED: NO
IMP036G_IMPLEMENTATION_AUTHORIZED: NO
IMP036G_STARTED: NO
IMP036G_ACCEPTED: NO
IMP037_ACTIVATED: NO

CANONICAL_ANCHORS = VISION-1; GTM-R124; STATE-R122; ARCH-R19; DR-15; PD-1; TEST-1; PERSONA-1; GJ-1
REPOSITORY_CANDIDATE_BASE_MAIN_MERGE = e067febf113fe21eebe1c1a3f3be24cbe23dd1f8
REPOSITORY_CANDIDATE_BASE_TREE = 8b8f7cd3068bf6dbcfd02055ae795da24c398dcd
BRANCH = governance/imp036g-product-definition
NOTE = draft candidate HEAD will differ after this Product Definition commit
```

This draft does **not** authorize Architecture Fit PASS, architecture lock, implementation,
acceptance, Founder UAT, or IMP-037 activation.

---

## Appendix A — IA (jobs/outcomes; not React lock)

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

Overview cards without safe existing projections = FOLLOW_UP / Architecture Fit question — do not
invent truth stores.

---

## Appendix B — CURRENT vs PLANNED evidence summary

| Capability | CURRENT_SUPPORTED (IMP-035/D-373) | PLANNED_IMP036G |
|---|---|---|
| Admin HTTP transport | `/api/admin/v1/*` on operations process | Coherent product IA consuming same transport |
| Resources | list/get/create/update; soft active/inactive; no DELETE | Full hierarchy CRUD UI (today brands list only) |
| Memberships | create/list/get/transition legal matrix | Create UI + consequence UX; Expire affordance = §25 |
| Role assignments | grant/list/revoke; system roles; ceiling; self-elevation deny | Safer consequence UX; same semantics |
| Effective permissions | GET caller-at-resource | Diagnostic UX; subject-principal = §25 |
| Audit | GET authorized list cap 200; no HTTP filters | Investigation UX; filter disposition = §25 |
| Operational status | Ops GET only | Admin System status + Open Operations hand-off |
| Admin UI | PARTIAL hub | V1 coherent console |

---

## Appendix C — Counts (draft inventory)

| Item | Count |
|---|---|
| Desired journeys | 3 (`JOURNEY-G-ADMIN-CONTEXT`, `JOURNEY-G-ACCESS-MANAGEMENT`, `JOURNEY-G-ADMIN-INVESTIGATION`) |
| User stories | 8 (`US-IMP-036G-001` … `008`) |
| V1 acceptance stories | 8 |
| Acceptance scenarios (defined) | 75 |
| Business rules | 25 (`BR-IMP-036G-001` … `025`) |
| §25 unresolved items | 5 |

Evidence for all ACs: `NOT_EXECUTED` / pending implementation. Gate Result: **NOT_PERFORMED**.
