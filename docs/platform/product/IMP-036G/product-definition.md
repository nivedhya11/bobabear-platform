<!-- governance-meta
{
  "status": "APPROVED",
  "authority": "PRODUCT_DEFINITION",
  "capability": "IMP-036G",
  "productDefinitionVersion": "PD-IMP-036G-DRAFT-2",
  "process": "PD-1",
  "verificationPolicy": "TEST-1",
  "lastReviewed": "2026-09-18",
  "productDefinitionGateExecution": "PERFORMED",
  "productDefinitionGateResult": "PASS",
  "architectureFitExecution": "PERFORMED",
  "architectureFit": "PASS",
  "architectureLocked": "YES",
  "implementationAuthorized": "YES",
  "implementationStarted": "YES",
  "implementationComplete": "YES",
  "impAccepted": "YES",
  "imp037Activated": "NO"
}
-->

# IMP-036G — Administration Console V2

## Product Definition (APPROVED — Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; COMPLETE_AND_ACCEPTED)

```text
Document status: APPROVED
PRODUCT_DEFINITION_VERSION: PD-IMP-036G-DRAFT-2
PRE-GATE DRAFT: NO
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
ARCHITECTURE_FIT_EXECUTION: PERFORMED
ARCHITECTURE_FIT_RESULT: PASS
ARCHITECTURE_FIT: PASS
IMP036G_ARCHITECTURE_FIT: PASS
IMP036G_ARCHITECTURE_LOCKED: YES
IMP036G_IMPLEMENTATION_AUTHORIZED: YES
IMP036G_STARTED: YES
IMP036G_IMPLEMENTATION_COMPLETE: YES
IMP036G_ACCEPTED: YES
IMP036G_FOUNDER_UAT: PASS
IMP037_ACTIVATED: NO
```

This artifact is the **gate-passed Product Definition** for candidate `PD-IMP-036G-DRAFT-2`
(supersedes predecessor draft `PD-IMP-036G-DRAFT-1` after Founder product decisions of 2026-09-16).
Product Definition Gate = PASS. It defines intended user/business behaviour for IMP-036G within
existing accepted authority (IMP-035 / D-373 / ARCH-G25 and related CURRENT foundations). It
records Architecture Fit PASS and architecture LOCKED. Formal acceptance is recorded at
GTM-R130 / STATE-R128 (`IMP036G_ACCEPTED: YES`; `IMP036G_FOUNDER_UAT: PASS`). Acceptance does
**not** activate IMP-037.

```text
PRODUCT_DELIVERY_PROCESS_EFFECTIVE_FROM = IMP-036F
HISTORICAL_ACCEPTED_IMPS_REWRITTEN = NO
IMP036E_LIFECYCLE_CHANGED = NO
PD1_DID_NOT_ACTIVATE_IMP036F_AT_ADOPTION = YES
```

Lifecycle truth remains ROADMAP/STATE only (`GTM-R130` / `STATE-R128`): `IMP036G_ACTIVATED: YES`;
formal ROADMAP lifecycle is `COMPLETE_AND_ACCEPTED` (`IMP036G_IMPLEMENTATION_AUTHORIZED: YES`;
`IMP036G_STARTED: YES`; `IMP036G_IMPLEMENTATION_COMPLETE: YES`; `IMP036G_ACCEPTED: YES`;
`IMP036G_FOUNDER_UAT: PASS`); `IMP036G_PRODUCT_DEFINITION: APPROVED` / `PD-IMP-036G-DRAFT-2`;
`IMP036G_PRODUCT_DEFINITION_GATE: PASS`; Architecture Fit = `PASS`;
`IMP036G_ARCHITECTURE_LOCKED: YES`; `currentProductSlice = NONE`; `pendingAcceptance = NONE`;
`nextProductSlice = IMP-037` (**IMP037_ACTIVATED: NO**). Accepted UAT candidate `fbf690a67cda51bd6bbc1bad4a9d26f574c4286e` / tree
`84b6a502fcec646cb5a65f3257f19b85c64f49e1`. Manual technical validation PASS remains implementation provenance
(see `tests/administration/imp036g-manual-validation.md`).

Supporting planning input (not this Product Definition):
[`experience/enterprise-experience/IMP-036G-administration-console-v2.md`](../../experience/enterprise-experience/IMP-036G-administration-console-v2.md).

Locked capability architecture (technical authority for Fit mechanisms):
[`capabilities/IMP-036G-administration-console-v2.md`](../../capabilities/IMP-036G-administration-console-v2.md).

---

## 1. Identity / version / status

| Field | Definition |
|---|---|
| Capability / title | `IMP-036G — Administration Console V2` |
| Product Definition version / document status | `PD-IMP-036G-DRAFT-2`; **Document status: APPROVED**; **PRE-GATE DRAFT: NO** |
| Product owner / approval evidence | Founder / product governance human authority; Product Definition Gate **PASS** on 2026-09-16 after independent pre-gate review **PASS** of exact candidate head `1fe1737d8f05d6069b2073d9faf1142d21b91970` / tree `25412cbadf224ef709687fe067f2427784a414cc` (gate-persistence commit is a subsequent revision and is **not** the evaluated artifact) |
| Process / verification policy | `PD-1` / `TEST-1` |
| Canonical anchors | VISION-1; ROADMAP GTM-R130; STATE STATE-R128; ARCH-R19; DR-15; PD-1; TEST-1; PERSONA-1; GJ-1 |
| Repository candidate | Gate-evaluated candidate: canonical path `/home/ajoshi/repos/boba-bear-platform`; branch `governance/imp036g-resolve-product-decisions`; **GATE_EVALUATED_HEAD** `1fe1737d8f05d6069b2073d9faf1142d21b91970`; **GATE_EVALUATED_TREE** `25412cbadf224ef709687fe067f2427784a414cc`; **GATE_EVALUATED_WORKING_TREE_FINGERPRINT** `123f56202a347db48d4ed14e0792d418edd6ac98165af2470af938c3e84f357e` (content-sensitive; reconstructed from clean exact gate-evaluated HEAD/tree via `npm run working-tree:fingerprint`). Draft-creation/base provenance (not the gate-evaluated candidate): verified base `main` merge `475d0c46598c2bf512570469354b69a3d75b7817` / tree `4ee7687b0d77027caa67d6672eadc390c7c916f8`. CURRENT_PR_HEAD / GATE_PERSISTENCE_COMMITS differ from the gate-evaluated candidate and are **not** the artifact that received Gate PASS. |
| Capability lifecycle / authorization | ROADMAP/STATE: `COMPLETE_AND_ACCEPTED`; `IMP036G_ACTIVATED: YES`; `currentProductSlice = NONE`; `pendingAcceptance = NONE`; `IMP036G_PRODUCT_DEFINITION: APPROVED`; `IMP036G_PRODUCT_DEFINITION_VERSION: PD-IMP-036G-DRAFT-2`; `IMP036G_PRODUCT_DEFINITION_GATE: PASS`; `IMP036G_ARCHITECTURE_FIT: PASS`; `IMP036G_ARCHITECTURE_LOCKED: YES`; `IMP036G_IMPLEMENTATION_AUTHORIZED: YES`; `IMP036G_STARTED: YES`; `IMP036G_IMPLEMENTATION_COMPLETE: YES`; `IMP036G_ACCEPTED: YES`; `IMP036G_FOUNDER_UAT_REQUIRED: YES`; `IMP036G_FOUNDER_UAT: PASS`; `nextProductSlice = IMP-037` (**IMP037_ACTIVATED: NO**) |
| Relevant capability architecture / ADRs | Locked IMP-036G capability [`capabilities/IMP-036G-administration-console-v2.md`](../../capabilities/IMP-036G-administration-console-v2.md) (`ARCHITECTURE_LOCKED`); accepted IMP-035 capability [`capabilities/IMP-035-initial-administration-capabilities.md`](../../capabilities/IMP-035-initial-administration-capabilities.md); binding D-373; ARCH-G25 / ARCH-R19; Access Control + Organization domain authority; supporting plan [`IMP-036G-administration-console-v2.md`](../../experience/enterprise-experience/IMP-036G-administration-console-v2.md) (SUPPORTING only). |
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

Architecture Fit classification (resolved by locked capability architecture — not a competing
technical authority). Non-goals preserved: custom roles; permission editor; arbitrary grants; new
tenancy/auth; new roles/permissions; new service; customer-account admin; secrets console;
commercial duplication; Ops duplication; analytics programme; workforce-dashboard consolidation;
hard delete; four-eyes; generic review-token engine.

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

Technical mechanisms are owned by
[`capabilities/IMP-036G-administration-console-v2.md`](../../capabilities/IMP-036G-administration-console-v2.md).

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

## 3. Problem statement (Pre-IMP-036G baseline / historical)

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
| Admin collection projection cap | `CURRENT_SUPPORTED` with limits (gap vs PLANNED) | Authorized Admin list projections for **brands, organizations, territories, legal entities, outlets, memberships, and audit events** apply `LIST_LIMIT = 200` via authorize-first filtering (`filterByPermission`). **No** general server pagination/search/filter transport verified for these collections today. Role-assignment list is per-membership (not this global cap). **PLANNED_IMP036G must provide scalable discoverability beyond 200** (Founder decision §25 item 6); ≤200 is **not** an accepted V1 boundary |
| Organization resource update concurrency | `CURRENT_SUPPORTED` with gap (gap vs PLANNED) | Update-by-ID only today; **no** revision/CAS/expected-timestamp conflict contract (`NOT_FOUND`). Concurrent edits may be last-writer-wins **today**. **PLANNED_IMP036G must detect stale writes** — no silent LWW as target (Founder decision §25 item 7) |
| Admin UI | `CURRENT_SUPPORTED` PARTIAL | Hub links; brands list only; memberships list + detail transitions/grant/revoke; audit list; **NO** full hierarchy CRUD UI; **NO** create-membership UI; **NO** admin operational-status surface |
| Effective permissions GET | `CURRENT_SUPPORTED` with VERIFIED gap | Projects **calling actor** permissions at resource today — **not** arbitrary subject principal. Caller-scoped is CURRENT fact only; **PLANNED_IMP036G must inspect managed member (subject-principal) effective permissions** (Founder decision §25 item 1) |
| Audit list | `CURRENT_SUPPORTED` with limits (gap vs PLANNED) | Authorized list capped at 200 today (same `LIST_LIMIT` mechanism); event fields include actor/action/date; **NO** HTTP query filters for actor/action/date (`NOT_FOUND`) today. **PLANNED_IMP036G must support server-side actor/action/date-range filters** over the authoritative eligible set (Founder decision §25 item 3) |
| Operational status | `CURRENT_SUPPORTED` Ops-side only | Only `GET /api/operations/v1/operational-status` (`order.read`); Admin must not become Ops dashboard; Open Operations navigation OK if separately authorized |
| Coherent Admin IA / consequence UX | `PLANNED_IMP036G` | Overview / Organization / Workforce / Access / Audit / System Operational Status as product IA (jobs/outcomes, not React lock) |

Historical pre-acceptance baseline: do not treat pre-IMP-036G UI incompleteness or implementation quirks as desired end-state behaviour.

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
| `JOURNEY-G-ACCESS-MANAGEMENT` (must protect `GJ-PERMITTED-OUTLET-ACCESS`) | Authorized Admin; target membership in scope | 1 Locate membership → 2 Create/maintain membership within legal transitions (including Expire invited→expired) → 3 Grant/revoke system roles within ceiling → 4 Confirm consequence → 5 Inspect **managed subject** effective permissions (server-authoritative; caller must not be mislabeled as member) → 6 Member retains/gains permitted outlet access continuity | Safe access governance without privilege escalation beyond actor authority; Golden Journey continuity preserved | Illegal transition reject; ceiling/self-elevation/cross-scope deny; stale membership/assignment; cancel confirmation; no invitation delivery |
| `JOURNEY-G-ADMIN-INVESTIGATION` | Authorized Admin (and platform ops inspection where authorized) | 1 Browse hierarchy context with scalable discoverability → 2 Review audit history with server-side actor/action/date filters → 3 Inspect safe operational status → 4 Optionally Open Operations if separately authorized | Investigation completes with truthful projections; Admin remains distinct from Ops | Unauthorized audit/status; empty/end/error/retry; Ops hand-off without Admin dashboard bleed |

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
| Coherent Admin Console V2 | `PERSONA-WORKFORCE-OPERATOR` | `JOURNEY-G-ACCESS-MANAGEMENT` / investigation | Inspect managed-subject effective permissions | `US-IMP-036G-006` | `V1_ACCEPTANCE_SLICE` (subject-principal mandatory; Fit chooses transport) |
| Coherent Admin Console V2 | `PERSONA-WORKFORCE-OPERATOR` | `JOURNEY-G-ADMIN-INVESTIGATION` | Investigate access audit history with server-side filters | `US-IMP-036G-007` | `V1_ACCEPTANCE_SLICE` (server-side actor/action/date filters mandatory) |
| Coherent Admin Console V2 | `PERSONA-WORKFORCE-OPERATOR` + `PERSONA-PLATFORM-OPERATOR` | `JOURNEY-G-ADMIN-INVESTIGATION` | Inspect safe operational status; hand off to Operations | `US-IMP-036G-008` | `V1_ACCEPTANCE_SLICE` |
| Useful Admin Overview from authoritative domains | `PERSONA-WORKFORCE-OPERATOR` | `JOURNEY-G-ADMIN-CONTEXT` | Truthful org/hierarchy/outlet context; membership attention; recent access changes; safe operational health | `US-IMP-036G-001` | `V1_ACCEPTANCE_SLICE` (mandatory Overview; no invented analytics KPI; Fit may reuse/introduce bounded projection) |
| Invitation delivery system | — | Access | Email/SMS invitation delivery | — | `DEFERRED` / `NOT_SUPPORTED` for V1 |
| Custom roles / permission editor | — | Access | Arbitrary RBAC authoring | — | `NOT_SUPPORTED` |

---

## 8. Acceptance slice

| Slice | Mandatory story IDs | Mandatory AC IDs | Required Golden Journeys | Observable acceptance boundary |
|---|---|---|---|---|
| `V1_ACCEPTANCE_SLICE` | `US-IMP-036G-001` … `US-IMP-036G-008` | All ACs marked `Mandatory in acceptance slice: YES` in §10 | `GJ-PERMITTED-OUTLET-ACCESS` continuity (protect; do not re-accept invitation delivery) | Authorized admin completes coherent Admin context (useful Overview) + scalable hierarchy browse/maintain with stale-write protection + membership/role safety (including Expire) + subject-principal permission diagnostic + server-filtered audit/ops inspection within existing authority |
| `FOLLOW_UP` | Optional polish beyond V1 mandatory journeys (not Overview mandatory content; not the seven Founder-resolved behaviours) | As defined later | N/A unless GJ impacted | Not silently required for V1 |
| `DEFERRED` | Invitation delivery; analytics programme; custom roles; hard-delete; customer-account admin; secrets console; commercial/Ops duplication; four-eyes | N/A | N/A | Explicit non-goals / future gates |

Every identified possibility also receives disposition in §§22–25:
`SUPPORTED_NOW`, `EXPLICITLY_DEFERRED`, `NOT_SUPPORTED_BY_DESIGN`, or
`UNRESOLVED_DECISION_REQUIRED` (classification vocabulary retained; **active count = 0** after Founder decisions of 2026-09-16 — see §25).

---

## 9. User stories

### US-IMP-036G-001 — Understand administration context

```text
Story ID: US-IMP-036G-001
As a PERSONA-WORKFORCE-OPERATOR (Brand/business admin job context)
I want to understand my administration context, visible capabilities, and useful authoritative Overview
so that I know what I can administer and what needs attention without API/domain knowledge.

Journey / activity: JOURNEY-G-ADMIN-CONTEXT — enter Admin and orient
Preconditions: Workforce session eligible for Admin portal; existing permissions only
Acceptance scenarios: AC-IMP-036G-001-01 … 001-08
Business rules: BR-IMP-036G-001, BR-IMP-036G-002, BR-IMP-036G-020
UX states: loading; ready Overview with truthful operational context; unauthorized; limited-capability; error/recovery
Permission / resource context: Admin session projection; capability-gated navigation; Overview from authoritative existing domains only; no invented permissions or analytics KPI store
Error / recovery: sign-in required; session expiry return; non-disclosing unauthorized
Dependencies: IMP-035 session transport; IMP-036A portal foundation; Fit may reuse or introduce bounded Overview projection
Explicit non-goals: Ops dashboard; commercial duplication; customer-account admin; analytics programme; inventing KPI truth
Data implications: session/capability + authoritative domain projections for Overview; no second truth store
Security implications: no client-supplied authority; no privilege gain via UI
Architecture fit / applicable invariants: D-373; ARCH-G25; Resolved by locked IMP-036G capability architecture — `ADMIN_OVERVIEW = BOUNDED_ADMIN_OVERVIEW_COMPOSITION_PROJECTION`
Open material decisions: NONE for Overview mandatory content (Founder-resolved §25 item 2); mechanism locked
Readiness: COMPLETE_AND_ACCEPTED (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED / COMPLETE at GTM-R130 / STATE-R128)
```

### US-IMP-036G-002 — Browse organization hierarchy

```text
Story ID: US-IMP-036G-002
As a PERSONA-WORKFORCE-OPERATOR
I want to browse Brands, Organizations, Territories, Legal Entities, and Outlets in hierarchy context with scalable discoverability
so that I can locate the correct resource scope for administration work even when more than 200 authorized items exist.

Journey / activity: JOURNEY-G-ADMIN-CONTEXT / JOURNEY-G-ADMIN-INVESTIGATION — hierarchy browse
Preconditions: Authorized resource read permissions for visible types
Acceptance scenarios: AC-IMP-036G-002-01 … 002-11
Business rules: BR-IMP-036G-003, BR-IMP-036G-004, BR-IMP-036G-026
UX states: loading; empty; ready list/detail; end-of-results; search/filter active; forbidden; not-found/stale; error/retry
Permission / resource context: brand.read / organization.read / territory.read / legal_entity.read / outlet.read (existing); CURRENT LIST_LIMIT=200 is a gap to fix — PLANNED scalable discoverability (pagination and/or search/filter)
Error / recovery: 403/non-disclosing 404; retry on network; revisit reload; never imply exhaustive when more authorized items exist; navigating must not broaden authority
Dependencies: IMP-035 resource list/get APIs (CURRENT_SUPPORTED); Fit may require API extension for discoverability
Explicit non-goals: inventing hierarchy levels; customer presentation of hierarchy; inventing unauthorized inventory
Data implications: existing Organization resource projections; Fit determines pagination/search/filter/index contract
Security implications: scope filtering server-side on every result; no forged scope; no foreign leak
Architecture fit / applicable invariants: D-373 collections authorize-first; Resolved by locked IMP-036G capability architecture — `AUTHORIZED_SET_CURSOR_CONTINUATION`
Open material decisions: NONE for product requirement (Founder-resolved §25 item 6); mechanism locked
Readiness: COMPLETE_AND_ACCEPTED (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED / COMPLETE at GTM-R130 / STATE-R128)
```

### US-IMP-036G-003 — Maintain supported organization resources

```text
Story ID: US-IMP-036G-003
As a PERSONA-WORKFORCE-OPERATOR
I want to create/update and set active/inactive on supported organization resources with stale-write protection
so that hierarchy remains accurate without hard-delete risk or silent overwrite.

Journey / activity: JOURNEY-G-ACCESS-MANAGEMENT — maintain org resources
Preconditions: Authorized manage permissions for resource type/scope
Acceptance scenarios: AC-IMP-036G-003-01 … 003-10
Business rules: BR-IMP-036G-005, BR-IMP-036G-006, BR-IMP-036G-007, BR-IMP-036G-021, BR-IMP-036G-027
UX states: form ready; validation failure; pending mutation; success; confirmation for deactivate; forbidden; conflict (stale write); reload/review/retry
Permission / resource context: existing create/update commands as starting point; soft lifecycle; CURRENT update-by-ID LWW is a gap — PLANNED server-enforced concurrency
Error / recovery: validation messages; cancel confirmation; retry; no silent success; understandable conflict → reload/review/retry; client timestamp alone insufficient
Dependencies: IMP-035 resource create/update (CURRENT_SUPPORTED); Fit may require API/data-contract/schema for concurrency
Explicit non-goals: DELETE/hard-delete; new resource types; commercial resource authoring here; silent last-writer-wins as V1 target
Data implications: soft active/inactive; Fit determines revision/CAS/precondition contract if required
Security implications: consequence confirmation for deactivate; server denies unauthorized; server enforces concurrency
Architecture fit / applicable invariants: Resolved by locked IMP-036G capability architecture — `SERVER_ISSUED_REVISION_CAS` (additive revision; future migration)
Open material decisions: NONE for product requirement (Founder-resolved §25 item 7); mechanism locked
Readiness: COMPLETE_AND_ACCEPTED (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED / COMPLETE at GTM-R130 / STATE-R128)
```

### US-IMP-036G-004 — Manage workforce memberships

```text
Story ID: US-IMP-036G-004
As a PERSONA-WORKFORCE-OPERATOR
I want to create and transition workforce memberships through legal lifecycle states only (including Expire for invited→expired) with scalable membership discoverability
so that access governance is safe and understandable.

Journey / activity: JOURNEY-G-ACCESS-MANAGEMENT — memberships (protects GJ-PERMITTED-OUTLET-ACCESS)
Preconditions: access.membership.read / manage as applicable; target identity exists; scope authorized
Acceptance scenarios: AC-IMP-036G-004-01 … 004-12
Business rules: BR-IMP-036G-008, BR-IMP-036G-009, BR-IMP-036G-010, BR-IMP-036G-021, BR-IMP-036G-026
UX states: list/detail; create form; transition confirmation (including Expire vs Revoke distinction); illegal transition unavailable/rejected; terminal states; loading/empty/end/error for large collections
Permission / resource context: existing membership APIs (CURRENT LIST_LIMIT=200 gap); create UI currently missing (PLANNED_IMP036G); Expire mandatory V1
Error / recovery: illegal transition reject; self-create deny if existing; stale membership; cancel; scalable discoverability without implying exhaustive when more exist
Dependencies: IMP-035 membership create/list/get/transition; GJ-PERMITTED-OUTLET-ACCESS; Fit may require discoverability transport
Explicit non-goals: invitation delivery system; customer-account admin; inventing statuses
Data implications: invited|active|suspended|revoked|expired; no hard-delete; Fit determines membership list discoverability contract
Security implications: consequence confirmation for suspend/revoke/expire; distinguish Expire vs Revoke; no authority beyond actor
Architecture fit / applicable invariants: Resolved by locked IMP-036G capability architecture — membership lists use `AUTHORIZED_SET_CURSOR_CONTINUATION`; Expire maps to existing invited→expired (architecture change NONE)
Open material decisions: NONE for Expire or membership scale (Founder-resolved §25 items 5–6)
Readiness: COMPLETE_AND_ACCEPTED (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED / COMPLETE at GTM-R130 / STATE-R128)
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
Architecture fit / applicable invariants: NEW_ROLE/PERMISSION/RBAC_SEMANTICS_EXPECTED: NO
Open material decisions: NONE for core ceiling semantics (CURRENT_SUPPORTED)
Readiness: COMPLETE_AND_ACCEPTED (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED / COMPLETE at GTM-R130 / STATE-R128)
```

### US-IMP-036G-006 — Inspect effective permissions

```text
Story ID: US-IMP-036G-006
As a PERSONA-WORKFORCE-OPERATOR
I want to inspect a managed member’s effective permissions in resource context as a read/diagnostic aid
so that I can understand access consequence after membership/role changes for that subject.

Journey / activity: JOURNEY-G-ACCESS-MANAGEMENT / investigation — effective permissions
Preconditions: access.effective_permissions.read; subject membership/principal and resource identifiers for projection; caller authorized
Acceptance scenarios: AC-IMP-036G-006-01 … 006-08
Business rules: BR-IMP-036G-014, BR-IMP-036G-015
UX states: loading; ready subject projection; empty permissions; forbidden; invalid resource/subject query; post-role-change refresh
Permission / resource context: CURRENT API projects CALLING ACTOR at resource (VERIFIED gap); PLANNED must project managed subject effective permissions (server-authoritative)
Error / recovery: invalid resource/subject query; unauthorized resource/subject; no foreign leak
Dependencies: CURRENT GET /api/admin/v1/effective-permissions as starting point; Fit chooses extend endpoint / new Admin projection / other
Explicit non-goals: permission editor; inventing grants from diagnostic UI; treating caller-only as sufficient V1 desired state
Data implications: read-only projection; no persistence mutation from diagnostic
Security implications: must not become covert privilege escalation or permission editor; caller authz enforced; no foreign leak; caller must not be mislabeled as member
Architecture fit / applicable invariants: Resolved by locked IMP-036G capability architecture — `MANAGED_SUBJECT_DIAGNOSTIC = EXTEND_EXISTING_ADMIN_EFFECTIVE_PERMISSIONS_READ`
Open material decisions: NONE for product requirement (Founder-resolved §25 item 1); mechanism locked
Readiness: COMPLETE_AND_ACCEPTED (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED / COMPLETE at GTM-R130 / STATE-R128)
```

### US-IMP-036G-007 — Investigate access audit history

```text
Story ID: US-IMP-036G-007
As a PERSONA-WORKFORCE-OPERATOR
I want to investigate relevant access audit events with server-side filters and scalable discoverability
so that I can explain who changed memberships/roles/resources within my authorized view beyond the first 200 events.

Journey / activity: JOURNEY-G-ADMIN-INVESTIGATION — audit
Preconditions: access.audit.read
Acceptance scenarios: AC-IMP-036G-007-01 … 007-04; 007-06; 007-08; 007-09 (IDs 007-05 and 007-07 intentionally unused)
Business rules: BR-IMP-036G-016, BR-IMP-036G-017
UX states: loading; empty; ready list; end-of-results; filter active; forbidden; error/retry
Permission / resource context: CURRENT authorized list capped 200 with HTTP actor/action/date query filters NOT_FOUND is a baseline gap (see §3 Audit list; BR-017); PLANNED MUST support server-side actor/action/date-range filters over the authoritative eligible set + scalable discoverability — client-side filtering of only the first 200 results is NOT accepted V1
Error / recovery: retry; clear empty; do not invent unauthorized events; navigating filters must not broaden authority
Dependencies: GET /api/admin/v1/audit-events (CURRENT_SUPPORTED); Architecture Fit may require query-contract/index work (Fit dependency/artifact — not a runtime Acceptance Criterion)
Explicit non-goals: analytics; secrets; rewriting audit; Ops log platform; client-only filter of first 200 as accepted V1
Data implications: append-only read; no new audit store expected; Architecture Fit determines minimum filter/query/index contract (no endpoint shapes, SQL, index design, page-size constants, or implementation mechanics invented here)
Security implications: minimize sensitive disclosure; authz/scope preserved on every filtered result
Architecture fit / applicable invariants: Resolved by locked IMP-036G capability architecture — server-side actor/action/date-time filters over eligible set before page projection; `AUTHORIZED_SET_CURSOR_CONTINUATION`; `SCHEMA_CHANGE_FOR_AUDIT_FILTERING = NO`; index only if evidence requires. Technical detail lives in the capability architecture.
Open material decisions: NONE for product requirement (Founder-resolved §25 items 3 and 6); mechanism locked
Readiness: COMPLETE_AND_ACCEPTED (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED / COMPLETE at GTM-R130 / STATE-R128)
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
Explicit non-goals: Ops workflow duplication; Admin-as-dashboard; inventing Admin-only status authority; analytics programme
Data implications: reuse existing Ops projection; no new status store
Security implications: no secrets; no privilege broaden via status UI
Architecture fit / applicable invariants: Admin≠Ops boundary (D-373 vs D-372); Resolved by locked IMP-036G capability architecture — reuse `GET /api/operations/v1/operational-status` directly; no Admin health API
Open material decisions: NONE; composition locked (Overview + direct Ops read; Open Operations = navigation only)
Readiness: COMPLETE_AND_ACCEPTED (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED / COMPLETE at GTM-R130 / STATE-R128)
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

AC-IMP-036G-001-06 — Useful authoritative Admin Overview (mandatory)
Story: US-IMP-036G-001
Given Overview is shown
When the person orients
Then Overview MUST provide truthful useful operational context drawn from authoritative existing domains: org/hierarchy/outlet context; membership lifecycle attention; recent access changes; relevant safe operational health
And Overview MUST NOT invent analytics/KPI programmes, a second truth store, or Ops-dashboard duplication (Admin≠Ops)
And Resolved by locked IMP-036G capability architecture — bounded Admin Overview composition projection under `/api/admin/v1/*`
And unsupported mandatory Overview content MUST NOT be disposed as FOLLOW_UP — it is V1 mandatory
Mandatory in acceptance slice: YES

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
And scalable discoverability (server pagination and/or search/filter) is available when more authorized brands exist than a single page
And the UI does not claim the visible page is exhaustive when more authorized brands exist
Mandatory in acceptance slice: YES

AC-IMP-036G-002-02 — Browse Organizations in hierarchy context
Story: US-IMP-036G-002
Given organization.read
When Organizations are browsed
Then authorized organizations appear with parent Brand context understandable without opaque-ID-only UX as the primary label
And scalable discoverability applies when more authorized organizations exist
And the UI does not claim complete discoverability of every authorized organization from a single truncated page
Mandatory in acceptance slice: YES

AC-IMP-036G-002-03 — Browse Territories
Story: US-IMP-036G-002
Given territory.read
When Territories are browsed
Then authorized territories are listed with Brand context
And scalable discoverability applies when more authorized territories exist
Mandatory in acceptance slice: YES

AC-IMP-036G-002-04 — Browse Legal Entities
Story: US-IMP-036G-002
Given legal_entity.read
When Legal Entities are browsed
Then authorized legal entities are listed with Brand/Organization context
And scalable discoverability applies when more authorized legal entities exist
Mandatory in acceptance slice: YES

AC-IMP-036G-002-05 — Browse Outlets
Story: US-IMP-036G-002
Given outlet.read
When Outlets are browsed
Then authorized outlets are listed with Brand/Organization/Territory context
And scalable discoverability applies when more authorized outlets exist
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
Then the list re-fetches authorized projections for the current discoverability page/query
And authz and scope are preserved (navigating does not broaden authority)
Mandatory in acceptance slice: YES

AC-IMP-036G-002-10 — No exhaustive implication when more authorized items exist
Story: US-IMP-036G-002
Given more authorized brands, organizations, territories, legal entities, outlets, or memberships exist than are shown in the current result page
When the Admin list is displayed
Then the UI does not imply the visible result is exhaustive of all authorized resources
And loading / empty / end-of-results / error states are observable and truthful
And CURRENT LIST_LIMIT=200 without further discoverability is a gap to fix — ≤200 is NOT an accepted V1 boundary
Mandatory in acceptance slice: YES

AC-IMP-036G-002-11 — Observable large-result discoverability
Story: US-IMP-036G-002
Given a large authorized hierarchy collection (more items than a single result page)
When the person uses server pagination and/or search/filter
Then they can discover authorized items beyond the first page
And every returned result remains authorize-first with no foreign leak
And Fit chooses cursor/offset/page size/search/indexes without inventing endpoint shapes in this Product Definition
Mandatory in acceptance slice: YES
```

### US-IMP-036G-003

```text
AC-IMP-036G-003-01 — Create supported Brand when authorized
Story: US-IMP-036G-003
Given brand manage authority
When the person creates a Brand with valid fields
Then the Brand is created via Admin API
And appears in subsequent authorized browse (discoverable via scalable hierarchy browse)
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

AC-IMP-036G-003-09 — Stale-write protection for hierarchy edits (mandatory)
Story: US-IMP-036G-003
Given a Brand/Organization/Territory/Legal Entity/Outlet changed after the form was loaded
When the administrator submits an update
Then the server MUST detect the stale write (no silent last-writer-wins as V1 target)
And the person sees an understandable conflict
And reload / review / retry is available
And client timestamp alone is insufficient — server enforces concurrency
And Architecture Fit chooses revision/CAS/precondition (may require API/data-contract/schema — Fit evaluates)
And CURRENT update-by-ID LWW remains a truthful CURRENT gap to fix, not desired V1 behaviour
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
AC-IMP-036G-004-01 — List memberships in scope with scalable discoverability
Story: US-IMP-036G-004
Given access.membership.read
When Memberships is opened
Then authorized memberships list with member label, scope, and status
And scalable discoverability (server pagination and/or search/filter) applies when more authorized memberships exist
And the UI does not imply exhaustive discovery from a truncated page (CURRENT LIST_LIMIT=200 is a gap to fix)
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

AC-IMP-036G-004-05 — Legal transition invited → expired (Expire mandatory)
Story: US-IMP-036G-004
Given invited membership and manage authority
When authorized Expire is confirmed with explicit target, scope, and consequence
Then status becomes expired (terminal)
And Expire is distinguished from Revoke in copy and outcome
And illegal transitions remain unavailable
And the expired status is durable after reload
And CURRENT UI lacking Expire is a gap to fix — Expire is mandatory V1, not optional
Mandatory in acceptance slice: YES

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
AC-IMP-036G-006-01 — Inspect managed-subject effective permissions at resource (mandatory)
Story: US-IMP-036G-006
Given access.effective_permissions.read, an authorized managed membership/subject, and a valid resource context
When Effective Permissions is opened for that managed member
Then server-authoritative effective permissions for the **subject principal** are shown with an explicit human-readable subject identity
And the caller is not mislabeled as the member
And caller authz is enforced; no foreign leak
And CURRENT caller-only projection is a VERIFIED gap to fix — caller-scoped alone is NOT sufficient desired V1 state
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

AC-IMP-036G-006-06 — Subject-principal diagnostic requirements (Founder-resolved)
Story: US-IMP-036G-006
Given a managed membership in scope
When subject effective permissions are inspected
Then the diagnostic is READ ONLY (not a permission editor)
And Architecture Fit chooses transport (extend existing endpoint / new Admin projection / other)
And EXPECTED_NEW_API: NO is no longer a hard constraint for this gap — Fit determines minimum required API extension if any
Mandatory in acceptance slice: YES

AC-IMP-036G-006-07 — Post-role-change subject re-inspect
Story: US-IMP-036G-006
Given actor granted or revoked a role for a managed member within ceiling
When the actor re-inspects effective permissions for that subject at resource
Then the projection shows the resulting subject permissions after the change
And remains truthful and server-authoritative for the subject (not a caller-only substitute)
Mandatory in acceptance slice: YES

AC-IMP-036G-006-08 — Reload subject diagnostic
Story: US-IMP-036G-006
Given a prior subject projection
When reload occurs
Then projection re-fetches server-authoritative subject-principal permissions for the same explicit subject
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

AC-IMP-036G-007-03 — Audit scale beyond first 200 (mandatory discoverability)
Story: US-IMP-036G-007
Given more than 200 authorized matching events exist
When Audit is used
Then the person can discover authorized events beyond the first 200 via scalable discoverability (server pagination and/or continued filtered query)
And the UI does not claim completeness from a truncated first page
And CURRENT LIST_LIMIT=200 without further discoverability is a gap to fix — not accepted V1
Mandatory in acceptance slice: YES

AC-IMP-036G-007-04 — Unauthorized audit denied
Story: US-IMP-036G-007
Given lacking access.audit.read
When Audit is requested
Then denial occurs without event disclosure
Mandatory in acceptance slice: YES

(Note: AC-IMP-036G-007-05 and AC-IMP-036G-007-07 are intentionally unused.
Former CURRENT no-HTTP-filters baseline gap and Architecture Fit query-contract boundary remain in
§3 Audit list, BR-IMP-036G-017, and US-IMP-036G-007 Architecture Fit / dependency / data fields —
not as mandatory runtime Acceptance Criteria.)

AC-IMP-036G-007-06 — Server-side audit filters mandatory
Story: US-IMP-036G-007
Given access.audit.read and authorized eligible events
When the person filters by actor, action, and/or date/time range
Then filtering is server-side over the authoritative eligible set (not merely client-side narrowing of the first 200)
And authz, scope, append-only, no mutation, human-readable fields, and empty/error/retry behaviours are preserved
And navigating filters must not broaden authority
Mandatory in acceptance slice: YES

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

### Evidence matrix (repository proof + Founder UAT remainder)

| Story / AC ID | Required behaviour / risk | Applicable test layers | Planned proof | Actual evidence / candidate / result |
|---|---|---|---|---|
| US-001 / AC-001-* | Admin context, useful Overview, IA, authz boundaries | unit/component + integration + E2E as applicable (TEST-1) | Admin overview/navigation suite including authoritative Overview context | `VERIFIED` — see `tests/administration/imp036g-ac-evidence.md` (merge `c35c9eab…` / tree `266fe3b0…`) |
| US-002 / AC-002-* | Hierarchy browse; scalable discoverability beyond 200; empty/forbidden/stale | integration + E2E | Hierarchy browse + large-result discoverability suite | `VERIFIED` — `imp036g-ac-evidence.md` |
| US-003 / AC-003-* | Create/update/active-inactive; no delete; confirm deactivate; stale-write protection | integration + E2E + a11y for dialogs + concurrency conflict | Resource maintain suite including conflict/reload/retry | `VERIFIED` — `imp036g-ac-evidence.md` (automated dialog a11y) + manual technical validation PASS (`imp036g-manual-validation.md`) |
| US-004 / AC-004-* | Membership legal/illegal transitions including Expire; create UI; discoverability; GJ continuity | integration + E2E; GJ regression | Membership suite + GJ-PERMITTED-OUTLET-ACCESS continuity | `VERIFIED` — `imp036g-ac-evidence.md` |
| US-005 / AC-005-* | Grant/revoke; ceiling; self-elevation; cross-scope; confirm | integration + negative security + E2E | Role-assignment suite | `VERIFIED` — `imp036g-ac-evidence.md` |
| US-006 / AC-006-* | Managed-subject effective permissions; read-only; post-role-change refresh | integration + E2E; Fit transport evidence | Subject-principal diagnostic suite | `VERIFIED` — `imp036g-ac-evidence.md` |
| US-007 / AC-007-01/02/03/04/06/08/09 | Authorized audit listing; empty; discoverability beyond 200; authz denial; server-side actor/action/date-range filters; append-only/no-rewrite; network/retry | integration + E2E | Audit filter + discoverability suite (runtime target ACs only). Architecture Fit query-contract/index evidence is a Fit dependency/artifact — not a mandatory runtime AC. | `VERIFIED` — `imp036g-ac-evidence.md` (AC-007-05/07 unused) |
| US-008 / AC-008-* | Ops status reuse; Admin≠Ops; Open Operations | integration + E2E authz | Status/hand-off suite | `VERIFIED` — `imp036g-ac-evidence.md` |

Repository mandatory AC evidence is complete (`PARTIAL`/`UAT_REQUIRED`/`UNVERIFIED` = 0 in
`imp036g-ac-evidence.md`). Manual technical validation required for implementation completion =
PASS (`tests/administration/imp036g-manual-validation.md`; candidate
`c35c9eab6a30ec6ce745cefd75c523181326f360` / tree `266fe3b07811f6942e76cac155d58ba07daabe56`;
2026-09-18; tester Ashutosh; defects NONE). Founder UAT is complete and recorded as **PASS**
(decision date 2026-09-18; Founder authority; accepted UAT candidate
`fbf690a67cda51bd6bbc1bad4a9d26f574c4286e` / tree `84b6a502fcec646cb5a65f3257f19b85c64f49e1`).

---

## 11. Business rules

| Rule ID | User/business rule | Authority / rationale | Story / AC IDs |
|---|---|---|---|
| `BR-IMP-036G-001` | Admin UI must not require API/domain knowledge for primary tasks; plain-language labels and hierarchy context | Product outcome; enterprise UX plan | US-001; AC-001-01 |
| `BR-IMP-036G-002` | Navigation and actions are capability-gated; hidden UI never substitutes for server authorization | D-373; ARCH-G25 | US-001; AC-001-03/08 |
| `BR-IMP-036G-003` | Hierarchy browse uses authorize-first resource projections; MUST provide scalable discoverability beyond CURRENT LIST_LIMIT=200; MUST NOT imply exhaustive when more authorized items exist | IMP-035 CURRENT gap; Founder decision §25 item 6 | US-002; AC-002-10/11 |
| `BR-IMP-036G-004` | Cross-scope resource disclosure is forbidden | D-373 authorize-first collections | US-002 AC-002-07/08; US-003 AC-003-08 |
| `BR-IMP-036G-005` | Organization resources support create/update and soft active/inactive only | IMP-035; no DELETE | US-003 |
| `BR-IMP-036G-006` | Hard DELETE is NOT_SUPPORTED | IMP-035 / non-goal | AC-003-05 |
| `BR-IMP-036G-007` | Deactivate requires consequence confirmation (target, scope, plain language, confirm/cancel) | Product safety | AC-003-04; BR-021 |
| `BR-IMP-036G-008` | Membership statuses are invited\|active\|suspended\|revoked\|expired only | IMP-035 CURRENT | US-004 |
| `BR-IMP-036G-009` | Only legal transitions are permitted; terminal revoked/expired have no further transitions | IMP-035 CURRENT | AC-004-03…010 |
| `BR-IMP-036G-010` | Invitation delivery is out of scope; create membership assumes existing identity reference paths CURRENT supports | GJ registry; non-goal | AC-004-02/12 |
| `BR-IMP-036G-011` | Only existing system roles may be granted | IMP-035; NEW_ROLE_EXPECTED: NO | AC-005-02/08 |
| `BR-IMP-036G-012` | Delegation ceiling and self-elevation denies are enforced server-side and reflected in UX | Access Control CURRENT | AC-005-04/05 |
| `BR-IMP-036G-013` | No four-eyes / second-approval / review-token workflow | Product non-goal | AC-005-10 |
| `BR-IMP-036G-014` | Effective-permissions diagnostic is read-only | IMP-035 | AC-006-05 |
| `BR-IMP-036G-015` | CURRENT effective-permissions projects calling actor (gap); PLANNED MUST inspect managed-subject effective permissions (server-authoritative; read-only; caller authz; no foreign leak; caller not mislabeled as member) | VERIFIED runtime gap; Founder decision §25 item 1 | AC-006-01/06/07/08 |
| `BR-IMP-036G-016` | Audit is append-only authorized list; CURRENT cap 200 is a gap; PLANNED scalable discoverability beyond 200 | IMP-035 LIST_LIMIT behaviour; Founder decision §25 item 6 | AC-007-01/03/08 |
| `BR-IMP-036G-017` | CURRENT HTTP audit query filters are NOT_FOUND (gap); PLANNED MUST support server-side actor/action/date-range filters over authoritative eligible set — client-only of first 200 is NOT accepted V1 | VERIFIED CURRENT; Founder decision §25 item 3 | AC-007-06; §3 Audit list (CURRENT gap); US-007 Fit/dependency fields |
| `BR-IMP-036G-018` | Admin must not become Operations dashboard; Open Operations is navigation only if separately authorized | D-373 vs Ops; plan | US-008 |
| `BR-IMP-036G-019` | Operational status reuses existing Ops endpoint authority; no Admin-invented health store | CURRENT Ops API | AC-008-01/03 |
| `BR-IMP-036G-020` | Admin Overview MUST provide truthful useful operational context from authoritative existing domains (org/hierarchy/outlet; membership lifecycle attention; recent access changes; safe operational health); MUST NOT invent analytics KPI / second truth store; unsupported mandatory Overview MUST NOT be FOLLOW_UP | Founder decision §25 item 2 | AC-001-06 |
| `BR-IMP-036G-021` | High-consequence actions (suspend/revoke/expire membership, grant/revoke role, deactivate resource) require explicit confirmation with target, scope, consequence, confirm/cancel; Expire distinguished from Revoke | Product safety; Founder decision §25 item 5 | US-003/004/005 |
| `BR-IMP-036G-022` | Architecture classification: NEW_SERVICE/AUTH_MODEL/ROLE/PERMISSION/RBAC_SEMANTICS = NO; API_EXTENSION_REQUIRED = YES; SCHEMA_OR_DATA_CONTRACT_CHANGE = YES (locked capability architecture) | Founder decisions §25; Fit PASS / lock | §§1, 21, 25 |
| `BR-IMP-036G-023` | Desktop may be richer layout; small-mobile MUST safely perform mandatory V1 high-consequence actions (suspend/revoke membership; expire invited; grant/revoke role; deactivate org resource) with same safety requirements (explicit target/scope/consequence/confirm/cancel/a11y/focus/states); functional parity for mandatory journeys, not identical layout; inspection-first-only is NOT accepted V1 | Founder decision §25 item 4; §18 | §18; US-003/004/005 |
| `BR-IMP-036G-024` | Accessibility intent WCAG 2.2 AA with observable keyboard/focus/label/announcement requirements | A11y policy | §18 |
| `BR-IMP-036G-025` | Persona labels never authorize actions | PERSONA-1 | §4, §14 |
| `BR-IMP-036G-026` | CURRENT Admin collection projections for brands, organizations, territories, legal entities, outlets, memberships, and audit events are capped at LIST_LIMIT=200 (gap); PLANNED MUST provide scalable discoverability (server pagination and/or search/filter); ≤200 is NOT an accepted V1 boundary; every result authorize-first; navigating must not broaden authority | VERIFIED CURRENT; Founder decision §25 item 6 | AC-002-10/11; AC-004-01; AC-007-03 |
| `BR-IMP-036G-027` | CURRENT organization resource updates are update-by-ID without revision/CAS (LWW gap); PLANNED MUST detect stale writes with understandable conflict and reload/review/retry; no silent LWW as V1 target; server enforces concurrency; Fit chooses revision/CAS/precondition | VERIFIED CURRENT; Founder decision §25 item 7 | AC-003-09 |

Product decisions for these rules are RESOLVED in §25 (`UNRESOLVED_COUNT = 0`). Architecture Fit = PASS; architecture LOCKED; implementation is AUTHORIZED / STARTED / COMPLETE (`COMPLETE_AND_ACCEPTED`).

---

## 12. Journey Completeness Matrix

| Journey dimension | Behaviour / applicability or N/A reason | Story / AC references |
|---|---|---|
| ENTRY | Admin portal entry with session eligibility | AC-001-01/04 |
| DISCOVERY | IA navigation to Organization/Workforce/Access/Audit/System | AC-001-05 |
| CONTEXT | Signed-in identity + capability-visible scope | AC-001-02/03 |
| EMPTY / FIRST USE | Empty hierarchy/memberships/audit; limited capabilities | AC-001-03; AC-002-06; AC-004-01; AC-007-02 |
| HAPPY PATH | Browse → maintain → membership/role → inspect → audit/status | US-001…008 happy ACs |
| ALTERNATE VALID PATHS | Activate vs suspend vs revoke vs expire; Open Operations hand-off; subject permission inspect | US-004/005/006/008 |
| VALIDATION FAILURE | Invalid resource/membership fields | AC-003-06; AC-006-04 |
| AUTHORIZATION | Capability gates; ceiling; self-elevation; cross-scope | AC-001-08; AC-003-07/08; AC-005-04…06; AC-007-04; AC-008-02 |
| NOT FOUND / STALE REFERENCE | Missing resource/membership/assignment | AC-002-08; AC-005-09 |
| SERVER / NETWORK ERROR | Fetch/mutation failure with retry | AC-001-07; AC-007-09; AC-008-08 |
| RECOVERY | Re-auth; retry; cancel confirmation; reload; conflict reload/review/retry | AC-001-07; AC-003-04 cancel; AC-003-09; AC-005-03 cancel |
| CONCURRENCY | Resource stale-write detection mandatory (no silent LWW); CURRENT LWW is gap; assignment stale/not-found within CURRENT | AC-003-09; AC-005-09; BR-027 |
| DESTRUCTIVE ACTION | Suspend/revoke/expire/deactivate/grant-revoke with confirmation (not hard-delete); Expire≠Revoke | BR-021; AC-003-04; AC-004-04/05/06/07; AC-005-03 |
| SUCCESS FEEDBACK | Visible success + refreshed projections (including subject EP after role change) | AC-003-10; AC-005-11; AC-006-07 |
| DOWNSTREAM EFFECT | GJ-PERMITTED-OUTLET-ACCESS continuity; no invitation delivery | AC-004-12 |
| REVISIT / RELOAD | Re-fetch authorized truth for current discoverability page/query and subject diagnostic | AC-002-09/10/11; AC-006-08; AC-008-07 |
| COLLECTION SCALE | Scalable discoverability beyond 200 mandatory for hierarchy/memberships/audit; ≤200 not accepted V1 | AC-002-10/11; AC-004-01; AC-007-03; BR-026 |
| RESPONSIVE / MOBILE | Desktop may be richer; small-mobile functional parity for mandatory high-consequence V1 actions | §18; BR-023 |
| ACCESSIBILITY | WCAG 2.2 AA intent observables | §18; confirmation dialogs announced |

---

## 13. UX state matrix

| Surface / state | Entry condition | Visible feedback / available actions | Focus / keyboard behaviour | Next / recovery state | AC ID or N/A reason |
|---|---|---|---|---|---|
| Overview / loading | Admin entry | Loading label | Focus on main landmark | ready / unauthorized / error | AC-001-01 |
| Overview / ready | Session OK | IA links; identity; useful authoritative Overview context; limited messaging if needed | Tab through nav links | navigate destinations | AC-001-02/03/05/06 |
| Overview / unauthorized | No session | Sign-in CTA | Focus sign-in | login → return | AC-001-04 |
| Hierarchy list / empty | Read OK, 0 items | Empty + next action if create allowed | Focus empty guidance | create or leave | AC-002-06 |
| Hierarchy list / large result | More authorized items than one page | Pagination and/or search/filter; no exhaustive implication | Focus list + discoverability controls | next page / refine query / leave | AC-002-10/11 |
| Hierarchy list / forbidden | Missing read | Non-disclosing denial | Focus message | leave / request access offline | AC-002-07 |
| Resource form / validation | Invalid submit | Field errors announced | Focus first error | correct → resubmit | AC-003-06 |
| Resource / deactivate confirm | Deactivate chosen | Target/scope/consequence; Confirm/Cancel | Focus dialog; Esc = cancel | confirm → success; cancel → prior | AC-003-04 |
| Resource / stale-write conflict | Resource changed since load | Understandable conflict; no silent overwrite | Focus conflict guidance | reload/review/retry | AC-003-09 |
| Memberships list / ready | membership.read | Rows to detail; create if authorized; scalable discoverability | Keyboard list nav | detail/create/search/page | AC-004-01/02; AC-002-11 |
| Membership / transition confirm | Suspend/Revoke/Expire | Consequence confirm; Expire≠Revoke | Dialog focus trap | success or cancel | AC-004-04…09 |
| Membership / illegal transition | Terminal or illegal | Action hidden or denied | N/A | remain terminal | AC-004-10 |
| Role grant / deny | Ceiling/self/cross-scope | Denial message | Focus error | choose allowed role or stop | AC-005-04…07 |
| Role revoke confirm | Revoke chosen | Consequence confirm | Dialog a11y | success/cancel | AC-005-03 |
| Effective permissions / ready | authorized subject | Explicit human-readable subject; subject permission list or empty | Readable list/semantics | reload / post-role-change refresh | AC-006-01/02/07/08 |
| Audit / filtered large set | Filters and/or >200 authorized | Server-side actor/action/date filters; scalable discoverability; empty/end/error | Focus list + filters | refine / page / retry | AC-007-03/06 |
| Ops status / unauthorized | missing order.read | Unavailable | Focus message | Open Ops absent | AC-008-02/05 |
| Ops status / ready | authorized | Safe status + optional Open Operations | Keyboard actions | Ops hand-off | AC-008-01/04 |
| Pending mutation | In-flight POST | Pending/disabled duplicate submit | Focus pending control | success/failure | cross-cutting |
| Server error | Fetch/mutation fail | Error + retry | Focus retry | recover | AC-007-09; AC-008-08 |

---

## 14. Permissions / resource context

| Action | Existing identity / permission authority | Resource context / server-derived scope | Allowed / denied / cross-scope variants | AC IDs |
|---|---|---|---|---|
| Enter Admin / session | Workforce session; Admin portal | Server session projection | Auth required; no client authority | AC-001-04 |
| Browse Brands | `brand.read` | Authorized brands; scalable discoverability (CURRENT LIST_LIMIT=200 is gap) | Deny outside scope; every result authorize-first | AC-002-01/07/10/11 |
| Browse Orgs/Territories/LE/Outlets | `organization.read` / `territory.read` / `legal_entity.read` / `outlet.read` | Hierarchy ids server-derived; scalable discoverability | Deny cross-scope; every result authorize-first | AC-002-02…05/07/10/11 |
| Create/update/lifecycle resources | Existing manage permissions per type (IMP-035) | Scoped resource; CURRENT update-by-ID LWW is gap; PLANNED stale-write protection | Deny unauthorized; no DELETE; conflict → reload/review/retry | US-003; AC-003-09 |
| List/create/transition memberships | `access.membership.read` / manage (IMP-035) | Membership scope resource; scalable discoverability; Expire mandatory | Legal transitions only including Expire; self-create deny where CURRENT | US-004 |
| List/grant/revoke roles | `access.role_assignment.read` / manage | Membership resource + role allow-list | Ceiling; self-elevation; scope allow-list | US-005 |
| Effective permissions | `access.effective_permissions.read` | Resource + **managed subject** principal (CURRENT caller-only is gap) | Caller authz; no foreign leak; read-only diagnostic | US-006 |
| Audit list | `access.audit.read` | Authorized events; server-side actor/action/date filters; scale beyond 200 | Preserve authz/scope; CURRENT no HTTP filters is gap | US-007 |
| Operational status | Ops `order.read` via `/api/operations/v1/operational-status` | Ops transport | Admin≠Ops; Open Ops if separately authorized | US-008 |

Persona labels do **not** authorize. Unknown material authority → stop for decision gate.

---

## 15. Data implications

- **Existing data authority only:** Organization resources, Access memberships, role assignments,
  effective-permission computation, access audit events, Ops operational-status projection.
- **Inputs/outputs:** Admin UI reads/writes through `/api/admin/v1/*` (and Ops status GET where
  authorized). Resolved by locked IMP-036G capability architecture: API extensions and additive
  hierarchy revision schema are required for eventual implementation (`API_EXTENSION_REQUIRED: YES`;
  `SCHEMA_OR_DATA_CONTRACT_CHANGE: YES`). Exact transport/DTO/CAS field spelling lives in the
  capability architecture — not invented here.
- **Lifecycle:** Soft active/inactive for resources; membership invited/active/suspended/revoked/expired
  (Expire affordance mandatory); role revoke soft semantics as CURRENT; audit append-only.
- **Reload:** All lists/details re-fetch authorized projections for the current query/page/subject.
- **Immutable/historical:** Audit events are not editable via Admin.
- **Concurrency:** Hierarchy resource updates use locked `SERVER_ISSUED_REVISION_CAS` (capability
  architecture).
- **Migration:** Additive hierarchy revision migration is required for eventual implementation
  (`MIGRATION_REQUIRED: YES`; `DESTRUCTIVE_MIGRATION_REQUIRED: NO`) and is **not** created by this
  Product Definition / architecture-lock persistence. Audit filtering requires no schema change.
- Mapping is locked within existing Admin/Ops authority; do not invent tables, services, or tenancy
  models. `NEW_SERVICE: NO`.

---

## 16. Security/privacy

- Trust boundary: workforce session → Admin transport (D-373) distinct from Customer and Ops transports.
- Client-supplied role/permission/membership/scope objects are never authority.
- Positive ACs: authorized happy paths within scope.
- Negative ACs: unauthorized, cross-scope, ceiling exceed, self-elevation, illegal transitions, hard-delete absence, secrets absence in status.
- Sensitive principal/access/audit data minimized; non-disclosing 404/403 patterns for out-of-scope.
- Subject-principal effective-permissions diagnostic is mandatory and expands diagnostic surface;
  caller authz must be enforced; no foreign leak; READ ONLY; caller must not be mislabeled as member.
  Resolved by locked IMP-036G capability architecture —
  `EXTEND_EXISTING_ADMIN_EFFECTIVE_PERMISSIONS_READ`.
- Scalable discoverability and server-side audit filters must authorize every result and must not
  broaden authority via navigation.
- No secrets management, credential display, or provider-key administration in this slice.

---

## 17. Concurrency/recovery

- Overlapping organization-resource mutations: CURRENT semantics are ordinary update-by-ID
  without revision/CAS/expected-timestamp conflict detection (VERIFIED) — this is a **gap**.
  **PLANNED_IMP036G MUST detect stale writes** for Brand/Org/Territory/Legal Entity/Outlet updates:
  no silent last-writer-wins as V1 target; understandable conflict; reload/review/retry; server
  enforces concurrency; client timestamp alone insufficient. Resolved by locked IMP-036G
  capability architecture — `SERVER_ISSUED_REVISION_CAS` (additive revision; future migration).
  Do not invent CAS field names here beyond that lock.
- Membership/role assignment overlapping mutations: rely on existing server authorization and
  CURRENT not-found/deny semantics; UI shows recoverable errors; no invented distributed lock service.
- Duplicate submits: pending mutation disables duplicate confirm where applicable.
- Stale membership/assignment/resource references: safe not-found/forbidden handling (ACs above);
  hierarchy resource concurrent-edit path is AC-003-09 (mandatory stale-write protection).
- Partial failure: no false success; retry explicit.
- Interruption/revisit: reload re-fetches truth; confirmation cancel is non-destructive.
- Session expiry: re-auth required before further privileged mutation.

---

## 18. Accessibility / responsive expectations

**Responsive**

- Desktop may use a richer layout; V1 authoring journeys complete on desktop.
- Tablet/mobile: readable, navigable, and safe.
- Small-mobile **MUST** safely perform mandatory V1 high-consequence actions with functional parity
  (not identical layout): suspend/revoke membership; expire invited; grant/revoke role; deactivate
  org resource. Same safety requirements apply: explicit target/scope/consequence/confirm/cancel,
  a11y/focus/states. Inspection-first-only fallback is **NOT** accepted V1 (Founder decision §25
  item 4 / BR-023).

**Accessibility (WCAG 2.2 AA intent; observable)**

- Keyboard access to hierarchy, tables/lists, dialogs, and primary actions (including small-mobile
  high-consequence confirmations).
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
| `GJ-PERMITTED-OUTLET-ACCESS` / `JOURNEY-PERMITTED-OUTLET-ACCESS` / `CURRENT` | Admin-side membership + role assignment continuity within delegation ceiling; other scopes remain denied; **no invitation delivery** | YES — protect continuity (do not break); do not re-litigate invitation delivery | US-004, US-005; AC-004-12; AC-005-02/03 | Repository continuity proof `VERIFIED` (AC-004-12 in `imp036g-ac-evidence.md`); Founder interactive sampling for GJ continuity was covered under IMP-036G Founder UAT PASS |
| Other GJs (FIRST-ORDER, PRODUCT-MENU-LAUNCH, etc.) | Not primary Admin V2 acceptance; commercial Admin surfaces remain separate | NO as IMP-036G mandatory acceptance | N/A | Regression only if shared shell risk proven |

---

## 21. Dependencies

| Dependency | Authority / verified state | Required before which story or gate? | Unresolved impact |
|---|---|---|---|
| IMP-035 Admin API + Access Control | `COMPLETE_AND_ACCEPTED` CURRENT_SUPPORTED | All stories | NONE for core transport |
| D-373 / ARCH-G25 | CURRENT binding | All stories | NONE |
| IMP-036A portal foundation | Accepted | Entry/shell | NONE |
| Ops operational-status endpoint | CURRENT Ops API | US-008 | NONE — locked: direct Ops reuse; no Admin health API |
| Product Definition Gate | PASS / PERFORMED | Satisfied | NONE — gate complete |
| Architecture Fit / lock | PASS / LOCKED | Satisfied; implementation AUTHORIZED / STARTED / COMPLETE at GTM-R130 / STATE-R128 | NONE for Fit/lock — formal acceptance recorded (`IMP036G_ACCEPTED: YES`; `IMP036G_FOUNDER_UAT: PASS`) |
| §25 Founder product decisions | RESOLVED 2026-09-16 (`UNRESOLVED_COUNT = 0`) | Binding product requirements for US-001…007 / §18 | Mechanisms locked in capability architecture — not unresolved product decisions |
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
| Coherent Admin IA + useful Overview + full hierarchy CRUD UI + create membership UI + consequence UX + Admin status hand-off | V1 acceptance commitment (`PLANNED_IMP036G`) — implemented and COMPLETE_AND_ACCEPTED (Founder UAT PASS) | US-001…008 |
| Scalable discoverability beyond LIST_LIMIT=200 for brands/orgs/territories/legal entities/outlets/memberships/audit | V1 acceptance commitment (`PLANNED_IMP036G`); CURRENT ≤200 is gap | US-002/004/007; BR-026 |
| Server-side audit actor/action/date-range filters | V1 acceptance commitment (`PLANNED_IMP036G`); CURRENT no HTTP filters is gap | US-007; BR-017 |
| Managed-subject effective permissions diagnostic | V1 acceptance commitment (`PLANNED_IMP036G`); CURRENT caller-only is gap | US-006; BR-015 |
| Expire invited→expired affordance | V1 acceptance commitment (`PLANNED_IMP036G`); CURRENT UI gap | AC-004-05 |
| Stale-write protection on hierarchy resource updates | V1 acceptance commitment (`PLANNED_IMP036G`); CURRENT LWW is gap | AC-003-09; BR-027 |
| Small-mobile safe high-consequence mandatory actions | V1 acceptance commitment (`PLANNED_IMP036G`) | §18; BR-023 |
| Caller-scoped effective permissions (CURRENT transport) | Existing verified CURRENT fact only — not sufficient desired V1 state alone | §3; US-006 |
| GJ-PERMITTED-OUTLET-ACCESS continuity protection | Existing CURRENT GJ; V1 must not break | AC-004-12 |

Historical note: proposed V1 UI behaviour was not accepted until canonical gates passed.

---

## 23. Explicitly deferred

| `EXPLICITLY_DEFERRED` behaviour | FOLLOW_UP or DEFERRED | Reason / consequence | Revisit dependency / decision owner |
|---|---|---|---|
| Invitation delivery (email/SMS) system | DEFERRED | Not promised by GJ; non-goal | Future capability decision |
| Analytics / BI / analytics programme on Admin | DEFERRED | Non-goal (Overview must use authoritative domain context, not invent KPI programmes) | Future |
| Custom visual redesign requiring Figma-first | DEFERRED | Plan: Figma not required initially | Design later without redefining authority |
| Identical small-mobile layout parity with desktop | DEFERRED | Functional parity for mandatory high-consequence journeys is V1; identical layout is not | Product / design later |
| Workforce-dashboard consolidation / Admin-as-Ops | DEFERRED / NOT_SUPPORTED | Non-goal; Admin≠Ops | Architecture / product |

Note: Subject-principal EP, useful Overview, server-side audit filters, small-mobile high-consequence
actions, Expire, discoverability beyond 200, and stale-write protection are **not** deferred —
they are Founder-resolved mandatory IMP-036G V1 requirements (§25).

---

## 24. Not supported by design

| `NOT_SUPPORTED_BY_DESIGN` behaviour | Reason / authority | User-visible boundary / relevant AC |
|---|---|---|
| Custom roles / permission editor / arbitrary grants | Non-goal; NEW_ROLE/PERMISSION/RBAC_SEMANTICS_EXPECTED: NO | AC-005-08 |
| Hard DELETE of organization resources | IMP-035 soft lifecycle only | AC-003-05 |
| Customer-account administration in this slice | Non-goal | Explicit absence from IA |
| Secrets / credential / provider-key admin | Non-goal | AC-008-06 |
| Commercial Catalog/Menu/Pricing duplication as IMP-036G acceptance | Separate IMP-036F surfaces | AC-001-05 boundary |
| Ops workflow duplication / Admin-as-workforce-dashboard | Admin≠Ops | AC-008-03 |
| New service / auth model / tenancy as default planned posture | NEW_SERVICE/AUTH_MODEL_EXPECTED: NO (unless Fit escalates) | §1; §25 |
| Custom roles / new permissions / new RBAC semantics as default | NEW_ROLE/PERMISSION/RBAC_SEMANTICS_EXPECTED: NO (unless Fit escalates) | AC-005-08; §1 |
| Four-eyes / second approval / review tokens | Non-goal | AC-005-10 |
| Treating persona as authorization | PERSONA-1 | BR-025 |
| Silent last-writer-wins as V1 desired concurrency | Rejected by Founder decision §25 item 7 | AC-003-09 |
| ≤200 collection cap as accepted V1 boundary | Rejected by Founder decision §25 item 6 | BR-026 |
| Client-only audit filter of first 200 as accepted V1 | Rejected by Founder decision §25 item 3 | BR-017 |
| Caller-scoped EP alone as sufficient V1 desired state | Rejected by Founder decision §25 item 1 | BR-015 |
| Inspection-first-only small-mobile for mandatory high-consequence actions | Rejected by Founder decision §25 item 4 | BR-023 |

---

## 25. Founder Product Decisions — RESOLVED

Decision date: **2026-09-16**. Authority: **Founder**. These seven formerly unresolved §25 gaps are
resolved **inside IMP-036G** as binding product requirements (not deferred as V1 limitations).
CURRENT runtime/transport facts remain truthful as gaps to fix. Technical mechanisms are now locked
in [`capabilities/IMP-036G-administration-console-v2.md`](../../capabilities/IMP-036G-administration-console-v2.md).
This section remains product-oriented and does not duplicate the full architecture contract.

| # | Decision | Outcome (binding PLANNED_IMP036G) | Story / AC impact | Architecture implication (resolved by locked capability architecture) |
|---|---|---|---|---|
| **1** | Subject-principal effective permissions | MUST inspect managed member’s effective permissions (server-authoritative; explicit human-readable subject; caller authz enforced; no foreign leak; READ ONLY diagnostic; not a permission editor; after role change show resulting subject permissions; caller must not be mislabeled as member). Caller-only is CURRENT fact, **not** sufficient desired V1 state. | US-006; AC-006-01/06/07/08; BR-015 | Resolved by locked IMP-036G capability architecture — `EXTEND_EXISTING_ADMIN_EFFECTIVE_PERMISSIONS_READ`. |
| **2** | Useful authoritative Admin Overview | MUST provide truthful useful operational context: org/hierarchy/outlet context; membership lifecycle attention; recent access changes; relevant safe operational health — from authoritative existing domains; no second truth store; no invented analytics/KPI; not analytics programme; Admin≠Ops. Unsupported mandatory Overview content MUST NOT be disposed as FOLLOW_UP. | US-001; AC-001-06; BR-020 | Resolved by locked IMP-036G capability architecture — `BOUNDED_ADMIN_OVERVIEW_COMPOSITION_PROJECTION`. |
| **3** | Server-side audit filtering | MUST support server-side filters: actor, action, date/time range over authoritative eligible set (not just first 200 client-side). Preserve authz, scope, append-only, no mutation, human-readable, empty/error/retry. Client-only of first 200 is **not** accepted V1. CURRENT no HTTP query filters remains documented as baseline gap (§3; BR-017), not as a post-implementation Acceptance Criterion. | US-007; AC-007-06; BR-017 | Resolved by locked IMP-036G capability architecture — server-side filters + authorized-set cursor continuation; no audit schema change; index only if evidence requires. |
| **4** | Small-mobile high-consequence actions | MUST safely perform on small-mobile: suspend/revoke membership; expire invited; grant/revoke role; deactivate org resource. Same safety requirements (explicit target/scope/consequence/confirm/cancel/a11y/focus/states). Desktop may be richer layout; mobile needs functional parity for mandatory V1 journeys (not identical layout). Inspection-first-only is **not** accepted V1. | §18; BR-023; US-003/004/005 | Resolved by locked IMP-036G capability architecture — UI composition over existing mutation APIs; no new backend authority. |
| **5** | Expire membership | MUST expose authorized Expire for invited→expired. Terminal; consequence confirm; distinguish Expire vs Revoke; illegal transitions unavailable; durable after reload. AC-004-05 is mandatory (not conditional). | US-004; AC-004-05; BR-021 | Resolved by locked IMP-036G capability architecture — existing invited→expired; architecture change NONE; distinct Expire affordance. |
| **6** | Collection discoverability beyond 200 | MUST provide scalable discoverability (server pagination and/or search/filter) for brands/orgs/territories/legal entities/outlets/memberships/audit. No UI implying exhaustive when more exist; authz every result; no foreign leak; loading/empty/end/error; navigating must not broaden authority. ≤200 is **rejected** as accepted V1 boundary. | US-002/004/007; AC-002-10/11; AC-004-01; AC-007-03; BR-026 | Resolved by locked IMP-036G capability architecture — `AUTHORIZED_SET_CURSOR_CONTINUATION`. |
| **7** | Stale-write protection for hierarchy edits | Brand/Org/Territory/Legal Entity/Outlet updates MUST detect stale writes; no silent LWW; understandable conflict; reload/review/retry. Server enforces concurrency; client timestamp alone insufficient. Silent LWW is **not** V1 target. | US-003; AC-003-09; BR-027; §17 | Resolved by locked IMP-036G capability architecture — `SERVER_ISSUED_REVISION_CAS` (additive; future migration). |

```text
UNRESOLVED_COUNT = 0
PRODUCT_DECISIONS: RESOLVED
PRODUCT_DECISION_COUNT: 7
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
ARCHITECTURE_FIT_EXECUTION: PERFORMED
ARCHITECTURE_FIT_RESULT: PASS
ARCHITECTURE_FIT: PASS
IMP036G_ARCHITECTURE_LOCKED: YES
Stories are COMPLETE_AND_ACCEPTED
(Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED / COMPLETE).
UNRESOLVED_DECISION_REQUIRED remains classification vocabulary only; active count = 0.
```

---

## 26. Definition of Ready

| Story ID | Applicable fields complete / evidence | Open material product decisions | Readiness / blocker |
|---|---|---|---|
| `US-IMP-036G-001` | §9 fields defined; ACs defined; Overview mandatory (Founder-resolved) | NONE (product) | `COMPLETE_AND_ACCEPTED` — Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED / COMPLETE |
| `US-IMP-036G-002` | §9 fields defined; ACs defined; discoverability beyond 200 mandatory | NONE (product) | `COMPLETE_AND_ACCEPTED` — Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED / COMPLETE |
| `US-IMP-036G-003` | §9 fields defined; ACs defined; stale-write protection mandatory | NONE (product) | `COMPLETE_AND_ACCEPTED` — Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED / COMPLETE |
| `US-IMP-036G-004` | §9 fields defined; ACs defined; Expire + membership discoverability mandatory | NONE (product) | `COMPLETE_AND_ACCEPTED` — Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED / COMPLETE |
| `US-IMP-036G-005` | §9 fields defined; ACs defined | NONE material for ceiling semantics | `COMPLETE_AND_ACCEPTED` — Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED / COMPLETE |
| `US-IMP-036G-006` | §9 fields defined; ACs defined; subject-principal EP mandatory | NONE (product) | `COMPLETE_AND_ACCEPTED` — Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED / COMPLETE |
| `US-IMP-036G-007` | §9 fields defined; ACs defined; server-side filters + audit scale mandatory | NONE (product) | `COMPLETE_AND_ACCEPTED` — Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED / COMPLETE |
| `US-IMP-036G-008` | §9 fields defined; ACs defined | NONE material if Ops reuse confirmed in Fit | `COMPLETE_AND_ACCEPTED` — Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED / COMPLETE |

Product decisions for the former seven §25 gaps are **RESOLVED**. Product Definition Gate = **PASS**.
Architecture Fit = **PASS**; architecture = **LOCKED**. Implementation is **AUTHORIZED**,
**STARTED**, and **COMPLETE** at GTM-R130 / STATE-R128
(`COMPLETE_AND_ACCEPTED`). Stories were READY for implementation at the
GTM-R128 / STATE-R126 start predecessor tip.
`STORY_COMPLETE != IMP_ACCEPTED`: story-level completion does not accept IMP-036G.

---

## 27. Product Definition Gate

```text
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
```

Product Definition Gate execution was performed on 2026-09-16 against exact candidate
`PD-IMP-036G-DRAFT-2`. Human Founder / product governance authority authorized Gate Result = PASS
after independent pre-gate review returned `PRE_GATE_REVIEW: PASS` /
`PRODUCT_DEFINITION_GATE_READY: YES` for the exact evaluated candidate below. No fabricated
GitHub review ID, PR number, or CI run ID is recorded for this gate persistence revision.

```text
GATE_EVALUATED_HEAD = 1fe1737d8f05d6069b2073d9faf1142d21b91970
GATE_EVALUATED_TREE = 25412cbadf224ef709687fe067f2427784a414cc
GATE_EVALUATED_WORKING_TREE_FINGERPRINT = 123f56202a347db48d4ed14e0792d418edd6ac98165af2470af938c3e84f357e
GATE_PERSISTENCE_COMMIT = subsequent commit after this gate-pass persistence revision
  (this persistence revision is NOT the artifact evaluated by the gate)
CURRENT_PR_HEAD / GATE_PERSISTENCE_COMMITS = later persistence/correction commits on the PR branch;
  they are NOT the candidate that received Product Definition Gate PASS
Gate date: 2026-09-16
Product approval authority: Founder / product governance human authority
Independent pre-gate review: PASS
Product Definition Gate result: PASS
```

```text
PRODUCT_DEFINITION_GATE

Capability: IMP-036G — Administration Console V2
Product Definition Version: PD-IMP-036G-DRAFT-2
Document status: APPROVED
Business Outcome: Defined (authorized admin coherent Admin Console V2 within existing authority; Founder-resolved stronger V1 behaviours)
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
Concurrency Considered: YES (CURRENT LWW recorded as gap; PLANNED stale-write protection mandatory; mechanism locked as SERVER_ISSUED_REVISION_CAS)
Destructive Actions Defined: YES (consequence confirmation including Expire; no hard-delete; no four-eyes)
UX State Matrix Complete: YES
Accessibility Considered: YES (WCAG 2.2 AA intent)
Responsive Considered: YES (desktop richer layout OK; small-mobile functional parity for mandatory high-consequence actions)
Golden Journeys Identified: YES — GJ-PERMITTED-OUTLET-ACCESS continuity (CURRENT; protect)
Explicit Deferrals Recorded: YES
Unresolved Product Decisions: NO — UNRESOLVED_COUNT = 0; PRODUCT_DECISIONS: RESOLVED (7 Founder decisions 2026-09-16)
Architecture Conflicts: NONE — Architecture Fit PASS; capability architecture LOCKED within ARCH-R19 / D-373; D-374 / ARCH-R20 not required
Architecture Fit result (persisted):
- Managed-subject EP: EXTEND_EXISTING_ADMIN_EFFECTIVE_PERMISSIONS_READ
- Overview: BOUNDED_ADMIN_OVERVIEW_COMPOSITION_PROJECTION
- Audit filters: server-side actor/action/date-time over eligible set; no audit schema change
- Discoverability: AUTHORIZED_SET_CURSOR_CONTINUATION
- Stale-write: SERVER_ISSUED_REVISION_CAS (additive future migration)
- Ops health: reuse GET /api/operations/v1/operational-status; no Admin health API
- Expire / mobile: existing authority + UI composition
- Preserve non-goals: custom roles; permission editor; arbitrary grants; new tenancy/auth; new roles/permissions; new service; customer-account admin; secrets console; commercial duplication; Ops duplication; analytics programme; workforce-dashboard consolidation; hard delete; four-eyes; generic review-token engine
- NEW_SERVICE/AUTH_MODEL/ROLE/PERMISSION/RBAC_SEMANTICS: NO; API_EXTENSION_REQUIRED: YES; SCHEMA_OR_DATA_CONTRACT_CHANGE: YES
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
```

```text
ARCHITECTURE_FIT_EXECUTION: PERFORMED
ARCHITECTURE_FIT_RESULT: PASS
ARCHITECTURE_FIT: PASS
IMP036G_ARCHITECTURE_LOCKED: YES
IMP036G_IMPLEMENTATION_AUTHORIZED: YES
IMP036G_STARTED: YES
IMP036G_IMPLEMENTATION_COMPLETE: YES
IMP036G_ACCEPTED: YES
IMP037_ACTIVATED: NO

ARCHITECTURE_FIT_EVALUATED_HEAD = 386a245cde223d87c19742753130113b21b4bb2f
ARCHITECTURE_FIT_EVALUATED_TREE = c4ef07bbd00bbbb964a9551b1d04d2fe140170b3
ARCHITECTURE_FIT_EVALUATED_WORKING_TREE_FINGERPRINT = e8eb68ebf06aea7ab50305f8e8700d450f9c5e9fd1ae24c91d4d81cfd157eb2c
ARCHITECTURE_FIT_DATE = 2026-09-17
INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PASS
ARCHITECTURE_LOCK_PERSISTENCE_COMMIT = subsequent governance commit (NOT the Fit-evaluated candidate)

CANONICAL_ANCHORS = VISION-1; GTM-R130; STATE-R128; ARCH-R19; DR-15; PD-1; TEST-1; PERSONA-1; GJ-1
ARCHITECTURE_LOCK_RECORDED_AT = GTM-R127 / STATE-R125 (historical predecessor tip)
IMPLEMENTATION_AUTHORIZATION_AND_START_RECORDED_AT = GTM-R128 / STATE-R126 (historical predecessor tip)
IMPLEMENTATION_COMPLETE_RECORDED_AT = GTM-R130 / STATE-R128
GATE_EVALUATED_HEAD = 1fe1737d8f05d6069b2073d9faf1142d21b91970
GATE_EVALUATED_TREE = 25412cbadf224ef709687fe067f2427784a414cc
GATE_EVALUATED_WORKING_TREE_FINGERPRINT = 123f56202a347db48d4ed14e0792d418edd6ac98165af2470af938c3e84f357e
GATE_PERSISTENCE_COMMIT = subsequent commit after gate-pass persistence revision
  (historical gate provenance; not the Architecture Fit candidate)
PREDECESSOR_DRAFT = PD-IMP-036G-DRAFT-1
```

Product Definition Gate PASS and Architecture Fit PASS / architecture LOCKED do **not** authorize
acceptance, Founder UAT, or IMP-037 activation. Implementation completion is recorded at
GTM-R130 / STATE-R128 and is **not** formal acceptance.

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

Overview MUST provide useful authoritative operational context (Founder-resolved §25 item 2) —
do not invent analytics KPI / second truth stores; Fit may reuse or introduce bounded projection.

---

## Appendix B — CURRENT vs PLANNED evidence summary

| Capability | CURRENT_SUPPORTED (IMP-035/D-373) | PLANNED_IMP036G |
|---|---|---|
| Admin HTTP transport | `/api/admin/v1/*` on operations process | Coherent product IA; Fit may extend API minimum required for resolved gaps |
| Resources | list/get/create/update; soft active/inactive; no DELETE; LIST_LIMIT=200; update-by-ID no CAS (LWW) | Full hierarchy CRUD UI; scalable discoverability beyond 200; stale-write protection (no silent LWW) |
| Memberships | create/list/get/transition legal matrix; LIST_LIMIT=200; UI lacks Expire | Create UI + consequence UX; **Expire mandatory**; scalable membership discoverability |
| Role assignments | grant/list/revoke; system roles; ceiling; self-elevation deny | Safer consequence UX; same semantics; small-mobile functional parity |
| Effective permissions | GET caller-at-resource only | **Managed-subject** diagnostic mandatory (Fit chooses transport) |
| Audit | GET authorized list cap 200; no HTTP filters | Server-side actor/action/date filters + scale beyond 200 |
| Overview | PARTIAL / missing useful operational context | Useful authoritative Overview mandatory |
| Operational status | Ops GET only | Admin System status + Open Operations hand-off; may feed Overview safe health |
| Admin UI | PARTIAL hub | V1 coherent console; small-mobile high-consequence functional parity |

---

## Appendix C — Counts (gate-passed inventory)

| Item | Count |
|---|---|
| Desired journeys | 3 (`JOURNEY-G-ADMIN-CONTEXT`, `JOURNEY-G-ACCESS-MANAGEMENT`, `JOURNEY-G-ADMIN-INVESTIGATION`) |
| User stories | 8 (`US-IMP-036G-001` … `008`) |
| V1 acceptance stories | 8 |
| Acceptance scenarios (defined) | 75 (includes AC-002-11; AC-007-05 and AC-007-07 intentionally unused) |
| Business rules | 27 (`BR-IMP-036G-001` … `027`) |
| §25 Founder product decisions (RESOLVED) | 7 |
| §25 unresolved items (active) | 0 |

Evidence for repository-testable mandatory ACs: `COMPLETE` per
`tests/administration/imp036g-ac-evidence.md` (`PARTIAL`/`UAT_REQUIRED`/`UNVERIFIED` = 0).
Manual technical validation required for implementation completion = PASS. Founder UAT:
**PASS** at GTM-R130 / STATE-R128 (`IMP036G_FORMAL_ACCEPTANCE: ACCEPTED`). Gate Result: **PASS**.
Architecture Fit: **PASS**; architecture: **LOCKED**; implementation: **AUTHORIZED** / **STARTED** /
**COMPLETE** (`COMPLETE_AND_ACCEPTED`;
`IMP036G_FOUNDER_UAT: PASS`). Predecessor draft: `PD-IMP-036G-DRAFT-1`.
