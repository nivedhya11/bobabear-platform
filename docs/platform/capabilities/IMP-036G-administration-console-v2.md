<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-036G",
  "title": "Administration Console V2",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "architectureFitResult": "PASS",
  "implementation": "AUTHORIZED / STARTED / COMPLETE",
  "implementationAuthorized": true,
  "implementationStarted": true,
  "implementationComplete": true,
  "impAccepted": false,
  "founderUATRequired": true,
  "schemaChangeRequired": true,
  "lastReviewed": "2026-09-18",
  "productDefinition": "PD-IMP-036G-DRAFT-2",
  "bindingDecisions": ["ADR-005", "D-358", "D-372", "D-373"],
  "dependsOn": ["IMP-011", "IMP-010", "IMP-029", "IMP-030", "IMP-035", "IMP-036", "IMP-036A", "IMP-036D", "IMP-036F"]
}
-->

# IMP-036G — Administration Console V2

## Capability Architecture — ARCHITECTURE_LOCKED / IMPLEMENTATION AUTHORIZED / STARTED / COMPLETE

This document is the **locked capability architecture** for IMP-036G. It received Architecture Fit
**PASS** and is the sole CURRENT capability-architecture authority for this slice. Implementation is
**AUTHORIZED**, **STARTED**, and **COMPLETE** at GTM-R129 / STATE-R127
(`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`); that completion does **not** accept the IMP, perform
Founder UAT, or activate IMP-037.

Supporting experience planning must not compete with this lock:
[`docs/platform/experience/enterprise-experience/IMP-036G-administration-console-v2.md`](../experience/enterprise-experience/IMP-036G-administration-console-v2.md)
(SUPPORTING only).

```text
ARCHITECTURE_FIT = PASS
ARCHITECTURE_FIT_EXECUTION = PERFORMED
ARCHITECTURE_FIT_RESULT = PASS
IMP036G_ARCHITECTURE_LOCKED = YES
ARCHITECTURE_LOCKED = YES
IMPLEMENTATION_AUTHORIZED = YES
IMPLEMENTATION_STARTED = YES
IMPLEMENTATION_COMPLETE = YES
IMP036G_IMPLEMENTATION_AUTHORIZED = YES
IMP036G_STARTED = YES
IMP036G_IMPLEMENTATION_COMPLETE = YES
IMP036G_ACCEPTED = NO
IMP036G_FOUNDER_UAT_REQUIRED = YES
IMP036G_FOUNDER_UAT = NOT_PERFORMED
IMP036G_MANUAL_TECHNICAL_VALIDATION = PASS
IMP036G_MANUAL_VALIDATION_CANDIDATE_SHA = c35c9eab6a30ec6ce745cefd75c523181326f360
IMP036G_MANUAL_VALIDATION_CANDIDATE_TREE = 266fe3b07811f6942e76cac155d58ba07daabe56
IMP036G_MANUAL_VALIDATION_DATE = 2026-09-18
IMP036G_MANUAL_VALIDATION_TESTER = Ashutosh
IMP036G_MANUAL_VALIDATION_DEFECTS = NONE
IMP037_ACTIVATED = NO
CANONICAL_ROADMAP_STATE = GTM-R129 / STATE-R127
PRODUCT_DEFINITION = PD-IMP-036G-DRAFT-2 APPROVED (Gate PASS; Architecture Fit PASS; architecture LOCKED)
AUTHORIZED + STARTED + COMPLETE = IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE (not accepted)
IMP-036G: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
IMP036G_IMPLEMENTATION_MERGE_SHA = c35c9eab6a30ec6ce745cefd75c523181326f360
IMP036G_IMPLEMENTATION_TREE = 266fe3b07811f6942e76cac155d58ba07daabe56
IMP036G_REVIEWED_CANDIDATE_HEAD = 7a013155a98529d4527e7b6c0358642e5cd9d806
IMP036G_REVIEWED_CANDIDATE_TREE = 266fe3b07811f6942e76cac155d58ba07daabe56
IMP036G_EXACT_MAIN_CI = 35214215500
IMP036G_EXACT_MAIN_CI_RESULT = SUCCESS
IMP036G_IMPLEMENTATION_EVIDENCE = COMPLETE
IMP_036G_INDEPENDENT_IMPLEMENTATION_REVIEW = PASS
```

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Formal ROADMAP lifecycle | `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`AUTHORIZED` / `STARTED` / `COMPLETE`) |
| Product Definition | `PD-IMP-036G-DRAFT-2` **APPROVED**; Product Definition Gate **PASS** |
| Architecture Fit | **PASS** (performed; locked) |
| Implementation | **AUTHORIZED** / **STARTED** / **COMPLETE** (not accepted) |
| Accepted | **NO** |
| Founder UAT required | **YES** |
| Founder UAT | **NOT_PERFORMED** |
| Schema change required (architecture conclusion) | **YES** (additive hierarchy revision CAS — implemented under this lock) |
| New D-number | **NO** (`D374_REQUIRED_FOR_LOCK = NO`) |
| Global ARCH bump | **NO** (`ARCH_R20_REQUIRED = NO`) |
| New permission / role / auth model / deployable | **NO** |
| API extension required | **YES** |
| Migration required | **YES** (forward-only additive) |

```text
FITS_WITHIN_ARCH_R19: YES
FITS_WITHIN_D373: YES
D374_REQUIRED_FOR_LOCK: NO
D-374_CREATED: NO
ARCH_R20_REQUIRED: NO
ARCH_R20_CREATED: NO
NEW_SERVICE: NO
NEW_AUTH_MODEL: NO
NEW_ROLE: NO
NEW_PERMISSION: NO
NEW_RBAC_SEMANTICS: NO
API_EXTENSION_REQUIRED: YES
SCHEMA_OR_DATA_CONTRACT_CHANGE: YES
MIGRATION_REQUIRED: YES (future implementation of additive hierarchy revisions — NOT created by this lock)
DESTRUCTIVE_MIGRATION_REQUIRED: NO
INDEX_CHANGE: MAY_BE_REQUIRED only when supported by query-plan/performance evidence
```

---

## 1. Authority / status

This artifact is CURRENT `CAPABILITY_ARCHITECTURE` for IMP-036G with `architectureLock =
ARCHITECTURE_LOCKED`. It supersedes any Architecture Fit candidate posture for this slice.

Verified Architecture Fit evaluated candidate (provenance for Fit only):

```text
Repository: /home/ajoshi/repos/boba-bear-platform
ARCHITECTURE_FIT_EVALUATED_BRANCH = main
ARCHITECTURE_FIT_EVALUATED_HEAD = 386a245cde223d87c19742753130113b21b4bb2f
ARCHITECTURE_FIT_EVALUATED_TREE = c4ef07bbd00bbbb964a9551b1d04d2fe140170b3
ARCHITECTURE_FIT_EVALUATED_WORKING_TREE_FINGERPRINT = e8eb68ebf06aea7ab50305f8e8700d450f9c5e9fd1ae24c91d4d81cfd157eb2c
ARCHITECTURE_FIT_DATE = 2026-09-17
INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PASS
```

The persistence commit that records this lock is a **subsequent governance commit** and is **NOT**
the Fit-evaluated candidate above. Do not treat lock-persistence HEAD/tree/fingerprint as the Fit
review candidate.

Canonical anchors for CURRENT lock + implementation-completion authority (GTM-R129 / STATE-R127;
architecture lock itself was persisted at the historical GTM-R127 / STATE-R125 predecessor tip;
implementation authorization/start at GTM-R128 / STATE-R126):

```text
VISION = VISION-1
ROADMAP = GTM-R129
STATE = STATE-R127
ARCHITECTURE = ARCH-R19
DECISION REGISTER = DR-15
PRODUCT DELIVERY = PD-1
TESTING = TEST-1
PERSONA = PERSONA-1
GOLDEN JOURNEYS = GJ-1
Product Definition = docs/platform/product/IMP-036G/product-definition.md (APPROVED; PD-IMP-036G-DRAFT-2)
Binding decisions = ADR-005, D-358, D-372, D-373
Depends on = IMP-011, IMP-010, IMP-029, IMP-030, IMP-035, IMP-036, IMP-036A, IMP-036D, IMP-036F
```

```text
IMP036G_ARCHITECTURE_LOCKED = YES
IMP036G_IMPLEMENTATION_AUTHORIZED = YES
IMP036G_STARTED = YES
IMP036G_IMPLEMENTATION_COMPLETE = YES
IMP036G_ACCEPTED = NO
IMP037_ACTIVATED = NO
```

---

## 2. Purpose and Product Definition reference

Support the approved IMP-036G business outcome without inventing product behaviour:

> An authorized administrator can understand administration scope, navigate the organization
> hierarchy, manage supported workforce membership and existing role assignments safely, inspect
> resulting effective permissions, investigate relevant audit history and operational status, and
> understand the consequence of actions — without needing API or domain-model knowledge, and without
> gaining authority beyond existing permissions.

Canonical product behaviour authority:

- [`docs/platform/product/IMP-036G/product-definition.md`](../product/IMP-036G/product-definition.md)
  — `PD-IMP-036G-DRAFT-2` **APPROVED** (Product Definition Gate **PASS**)

Supporting planning input only (non-authoritative vs this lock and vs Product Definition):

- [`docs/platform/experience/enterprise-experience/IMP-036G-administration-console-v2.md`](../experience/enterprise-experience/IMP-036G-administration-console-v2.md)

Preserve all Founder-resolved product requirements in `PD-IMP-036G-DRAFT-2` (§25 items 1–7) and all
mandatory acceptance scenarios for `US-IMP-036G-001` … `US-IMP-036G-008`.

```text
product_semantics_changed = NO
PRODUCT_DEFINITION = PD-IMP-036G-DRAFT-2
PRODUCT_DEFINITION_GATE = PASS
ARCHITECTURE_FIT = PASS
ARCHITECTURE_LOCKED = YES
IMPLEMENTATION_AUTHORIZED = YES
```

---

## 3. Preserved global invariants

IMP-036G extends the coherent Admin Console product surface over **existing** authorities. It does
**not** create a second authority plane.

| Invariant / authority | Preservation |
|---|---|
| Static Next.js export → Nginx | ARCH-G01 / D-359; no dynamic Next business APIs / Server Actions / Route Handlers as authority |
| `/api/admin/v1/*` → existing operations process | D-373 / ARCH-G25; Admin façade on same process as Ops |
| `/api/operations/v1/*` → existing Ops API | D-372; Ops operational-status and Ops workflows remain Ops-owned |
| Existing workforce auth / session | IMP-010 / D-372; `boba-workforce.session_token`; no new auth realm |
| Trusted `WorkforcePrincipal` | Server-resolved principal only; deny-by-default |
| Organization domain | Existing Brand / Organization / Territory / Legal Entity / Outlet authority |
| Access Control | Existing membership, role-assignment, permission catalog, authorize(), access-audit |
| Membership / role-assignment / permission catalog / access-audit | IMP-011 / ADR-005 / D-358; no redesign |
| Ops operational-status | Existing `GET /api/operations/v1/operational-status`; Admin does not own Ops truth |
| ARCH-G03 / G04 / G08 / G23 / G25 | No caller-forged role, permission, membership, organization, territory, outlet, scope, principal, or authorized boolean |
| ARCH-G09 (material writes) | Hierarchy resource updates use server-issued revision CAS; no silent LWW as V1 target |
| ARCH-G11 | Browser never authoritative for authz / membership / grants |
| ARCH-G13 | PostgreSQL authoritative persistence |
| ADR-005 | Permission keys + resource scope; no role-name bypass |
| D-358 | Seven system roles; inventory remains STATE/code |
| D-373 Admin trust boundary | Dedicated Admin transport; same operations process; no second deployable |
| D-372 Ops hand-off / status | Ops façade remains Ops; Admin may navigate / compose reads only where authorized |

```text
NO_SECOND_AUTHORITY = YES
NO_NEW_DEPLOYABLE = YES
NO_NEW_AUTH = YES
NO_CALLER_FORGED_ROLE = YES
NO_CALLER_FORGED_PERMISSION = YES
NO_CALLER_FORGED_MEMBERSHIP = YES
NO_CALLER_FORGED_ORGANIZATION = YES
NO_CALLER_FORGED_TERRITORY = YES
NO_CALLER_FORGED_OUTLET = YES
NO_CALLER_FORGED_SCOPE = YES
NO_CALLER_FORGED_PRINCIPAL = YES
NO_CALLER_FORGED_AUTHORIZED_BOOLEAN = YES
ADMIN_NE_OPS = YES
```

---

## 4. Architecture Fit verdict and provenance

```text
ARCHITECTURE_FIT = PASS
ARCHITECTURE_FIT_EXECUTION = PERFORMED
ARCHITECTURE_FIT_RESULT = PASS
IMP036G_ARCHITECTURE_LOCKED = YES
```

**PASS** means: every mandatory V1 story (`US-IMP-036G-001` … `008`) has a technically viable fit
under ARCH-R19 / D-373 without a new service, auth model, role, permission, or RBAC semantics change;
minimum API extensions and the additive hierarchy revision CAS data contract are locked; Overview,
Ops status reuse, authorized-set cursor continuation, managed-subject effective-permission
diagnostic, audit filtering, Expire mapping, and mobile high-consequence parity are resolved with
**no** mutually exclusive open architecture alternatives; Founder UAT remains required after future
implementation + independent technical acceptance + UAT deployment.

### Fit provenance (exact)

```text
ARCHITECTURE_FIT_EVALUATED_BRANCH = main
ARCHITECTURE_FIT_EVALUATED_HEAD = 386a245cde223d87c19742753130113b21b4bb2f
ARCHITECTURE_FIT_EVALUATED_TREE = c4ef07bbd00bbbb964a9551b1d04d2fe140170b3
ARCHITECTURE_FIT_EVALUATED_WORKING_TREE_FINGERPRINT = e8eb68ebf06aea7ab50305f8e8700d450f9c5e9fd1ae24c91d4d81cfd157eb2c
ARCHITECTURE_FIT_DATE = 2026-09-17
INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PASS
```

The persistence commit that records this architecture lock is a **subsequent governance commit** and
is **NOT** the Fit-evaluated candidate (`386a245c…` / tree `c4ef07bb…` /
fingerprint `e8eb68eb…`).

```text
ARCHITECTURE_LOCKED != IMPLEMENTATION_AUTHORIZED
Architecture lock alone did not authorize implementation; authorization and start are recorded separately at GTM-R128 / STATE-R126.
```

---

## 5. Domain authority map

| Concern | Authority owner | Notes |
|---|---|---|
| Brand / Organization / Territory / Legal Entity / Outlet structure + soft lifecycle | Organization | Existing commands; Admin façade authorizes then delegates |
| Hierarchy resource concurrency | Organization + Admin use-cases | `SERVER_ISSUED_REVISION_CAS` (locked; additive schema in future impl) |
| Workforce membership lifecycle | Access Control | Existing transitions including `invited→expired` |
| Role assignment grant / revoke | Access Control | System roles; delegation ceiling; self-elevation deny |
| Effective permissions evaluation | Access Control | Existing grant evaluation; managed-subject diagnostic extends Admin read only |
| Access Control audit (append-only) | Access Control | Existing write path; Admin read + filter extension |
| Permission catalog / system roles | Access Control / ADR-005 / D-358 | No editor; no custom roles |
| Admin Overview composition | Administration composition projection | Bounded read composition; not a new domain of truth |
| Operational status | Operations (Ops API) | `GET /api/operations/v1/operational-status`; auth `order.read` |
| Workforce session / principal | Workforce auth (IMP-010 / D-372) | Unchanged |
| Customer commerce / Catalog / Menu / Pricing | Separate domains (IMP-036F etc.) | Out of IMP-036G acceptance |
| Store operations workflows | Operations (IMP-036E / D-372) | Admin≠Ops; navigation hand-off only |

```text
SECOND_ACCESS_CONTROL_AUTHORITY = NO
SECOND_ORGANIZATION_AUTHORITY = NO
ADMIN_OVERVIEW_AS_KPI_STORE = NO
ADMIN_OPERATIONAL_STATUS_AUTHORITY = NO
```

---

## 6. Locked module placement (reuse existing admin/ops modules; no new service)

Reuse and extend existing Administration / Access Control / Organization / Operations modules. No
new deployable process, microservice, queue, or broker.

```text
src/server/administration/                 Authorized admin use-cases (Overview composition;
                                           managed-subject EP diagnostic; collection continuation
                                           orchestration; hierarchy CAS update coordination)
src/server/access-control/                 Existing mutations + authorized list/read helpers;
                                           audit filter-before-page; membership transitions
src/server/organization/                   Existing resource commands + future additive revision CAS
src/server/operations/http/admin-*.ts      Thin /api/admin/v1/* transport on operations process
src/server/operations/http/…               Existing Ops operational-status transport (unchanged owner)
docker/nginx/nginx.conf                    Proxy /api/admin/v1/ and /api/operations/v1/ → operations
src/app/workforce/admin/                   Static export Admin UI shells (IA composition)
src/components/administration/             Client UI (consequence UX; mobile high-consequence)
src/lib/administration/                    Same-origin admin HTTP client
```

```text
NEW_SERVICE = NO
NEW_PROCESS = NO
NEW_QUEUE = NO
MODULE_PLACEMENT = EXTEND_EXISTING_ADMIN_OPS_MODULES
```

Exact file names for new thin handlers remain implementation detail within this placement; transport
namespace remains `/api/admin/v1/*` (and Ops reuse for operational-status).

---

## 7. Transport topology

```text
Static Next.js workforce Admin UI
  → Nginx
  → operations process (existing; no new deployable)
       ├── /api/admin/v1/*              Admin façade (D-373)
       │     ├── hierarchy CRUD + revision CAS updates
       │     ├── memberships / role-assignments
       │     ├── managed-subject effective-permissions diagnostic
       │     ├── audit events (filtered + cursor continuation)
       │     └── bounded Admin Overview composition projection
       └── /api/operations/v1/*         Ops façade (D-372)
             └── GET …/operational-status   (reuse; order.read)
  → Application administration / access-control / organization / operations use-cases
  → Domain modules
  → PostgreSQL
```

| Concern | Classification | Façade |
|---|---|---|
| Hierarchy browse/create/update (CAS) | `ADMIN_FACADE` | `/api/admin/v1/*` |
| Memberships / role assignments | `ADMIN_FACADE` | `/api/admin/v1/*` |
| Managed-subject effective permissions | `ADMIN_FACADE` | `/api/admin/v1/*` (extend existing Admin EP read) |
| Access audit list + filters + continuation | `ADMIN_FACADE` | `/api/admin/v1/*` |
| Admin Overview composition | `ADMIN_FACADE` | `/api/admin/v1/*` |
| Operational status | `OPERATIONS_FACADE` | existing `GET /api/operations/v1/operational-status` |
| Open Operations | `NAVIGATION_ONLY` | UI route to Ops; not an Admin API |
| Customer / commercial APIs | `OUT_OF_SCOPE` | unchanged |

```text
new_facade_created = NO
new_process_created = NO
DO_NOT_CREATE_/api/admin/v1/operational-status = YES
API_EXTENSION_REQUIRED = YES
```

---

## 8. Trust / session boundary

Reuse IMP-010 / D-372 / D-373 workforce session → trusted `WorkforcePrincipal`. No new auth realm,
session cookie, or principal minting path.

```text
Browser capability chips / nav = convenience only
Server authorize(permission, resource) = authoritative
Caller-supplied role / permission / membership / organization / territory / outlet / scope /
  principal / authorized boolean = NEVER authority
CSRF / Origin mutation protection = preserved for Admin mutations (same model as operations)
```

Managed-subject diagnostic does **not** impersonate the subject and does **not** replace the caller
principal. The caller remains the authenticated `WorkforcePrincipal` for every request.

```text
NEW_AUTH_MODEL = NO
IMPERSONATION = NO
ACT_AS = NO
```

---

## 9. Authorization and resource-context invariants

| Rule | Locked posture |
|---|---|
| Deny by default | Existing Access Control semantics |
| Permission keys | Existing catalog only (`NEW_PERMISSION = NO`) |
| System roles | D-358 inventory only (`NEW_ROLE = NO`) |
| Delegation ceiling / self-elevation deny | Preserved on grant/revoke |
| Resource context | Server-loaded from trusted ids; never client-asserted scope proof |
| Collection emission | Authorize eligible set **before** bounded page emission |
| Cross-scope | Non-disclosing deny / not-found; no foreign leak |
| UI hiding | Convenience only; never security boundary |

### Story-class → permission reuse (no new keys)

| Action class | Permission(s) | Notes |
|---|---|---|
| Hierarchy read / list | existing `brand.*` / `organization.*` / `territory.*` / `legal_entity.*` / `outlet.*` read | Cursor continuation must not broaden |
| Hierarchy create / update | existing manage permissions | Update requires `expectedRevision` (CAS) |
| Membership read / manage / transition | `access.membership.read` / `access.membership.manage` | Expire uses existing transition |
| Role assignment read / grant / revoke | `access.role_assignment.*` | Ceiling + self-elevation preserved |
| Managed-subject EP diagnostic | `access.effective_permissions.read` **and** authority to resolve/read managed membership (reuse `access.membership.read`) | See §13 |
| Audit read + filters | `access.audit.read` | Filters narrow only |
| Ops operational-status | `order.read` (Ops) | Lack → unavailable/unauthorized; not Admin-invented health |
| Overview composition | Compose only from domains the caller can already authorize | No Overview-only permission |

```text
NEW_PERMISSION = NO
NEW_ROLE = NO
NEW_RBAC_SEMANTICS = NO
```

---

## 10. Admin Overview composition

```text
ADMIN_OVERVIEW = BOUNDED_ADMIN_OVERVIEW_COMPOSITION_PROJECTION
TRANSPORT = /api/admin/v1/*
```

Overview is a **bounded composition projection** under the Admin façade. It composes:

- organization / hierarchy / outlet context the caller is authorized to see;
- membership lifecycle attention from authoritative Access Control membership state;
- recent access changes from authoritative Access Control audit (authorized subset);
- relevant safe operational health only by composing authorized Ops operational-status read where
  the caller holds `order.read` (or truthful unavailable/unauthorized when lacking).

Locked prohibitions:

```text
NO_ANALYTICS_AUTHORITY = YES
NO_KPI_STORE = YES
NO_DUPLICATE_TRUTHS = YES
NO_FIRST_200_FALSE_SUMMARY = YES
NO_OPS_DASHBOARD_BLEED = YES
NO_OVERVIEW_PERMISSION_INVENTION = YES
```

Overview must not imply exhaustiveness when continuation would be required for underlying
collections. It must not invent metrics programmes or a second persistence truth store. Layout /
IA presentation is product UX; Overview does not create backend authority beyond composed reads.

---

## 11. Operational-status reuse / Operations hand-off

```text
KEEP = GET /api/operations/v1/operational-status
DO_NOT_CREATE = /api/admin/v1/operational-status
OPS_AUTH = order.read
OPEN_OPERATIONS = NAVIGATION_ONLY
```

| Rule | Locked posture |
|---|---|
| Status authority | Ops API only |
| Admin duplicate endpoint | **Forbidden** |
| UI composition | Admin UI may compose Overview + direct Ops read |
| Missing `order.read` | Unavailable / unauthorized (truthful); no fabricated healthy status |
| Open Operations | Navigation to Ops surfaces only; not an Admin workflow engine |
| Admin≠Ops | Admin must not become Ops dashboard or workforce-dashboard consolidation |

D-372 Ops hand-off/status semantics are preserved. IMP-036G may surface safe status inspection and
hand-off; it does not relocate Ops authority into Admin.

---

## 12. Collection cursor continuation

```text
COLLECTION_CONTINUATION_MODEL = AUTHORIZED_SET_CURSOR_CONTINUATION
APPLIES_TO = brands, organizations, territories, legal entities, outlets, memberships, audit events
```

Locked contract:

| Requirement | Rule |
|---|---|
| Cursor | Opaque server-issued traversal locator only |
| Page | Server-bounded page size |
| Ordering | Stable deterministic total ordering |
| Reachability | All authorized rows reachable across continuations |
| More / end | Explicit more-available or end indication |
| Auth ordering | Authorize / determine eligible set **before** emission |
| Forbidden anti-pattern | **NEVER** `DB LIMIT` then authorize/filter then return a partial page that **skips** authorized rows |
| Search | Optional narrowing within authorized set; must not broaden authority |
| Exhaustiveness UX | UI must not imply “all results” when more exist |

```text
REJECTED_CONTINUATION_MODEL = LIMIT_THEN_AUTHORIZE_PARTIAL_PAGE
HISTORICAL_LIST_LIMIT_200_AS_V1_BOUNDARY = REJECTED
```

Role-assignment list remains per-membership (not this global collection continuation surface),
consistent with accepted IMP-035 shape unless a future authorized change says otherwise.

---

## 13. Managed-subject effective-permission diagnostic

```text
MANAGED_SUBJECT_DIAGNOSTIC = EXTEND_EXISTING_ADMIN_EFFECTIVE_PERMISSIONS_READ
```

Locked behaviour:

1. Caller remains the authenticated trusted `WorkforcePrincipal` (not replaced).
2. Managed subject is **not** impersonated (`NOT_AN_ACT_AS`).
3. Trusted subject locator: client supplies `membershipId` only as a locator.
4. Server loads membership → derives trusted `workforceUserId` + scope from persistence.
5. Authorize caller (`access.effective_permissions.read` **and** authority to resolve/read the
   managed membership; reuse `access.membership.read`).
6. Evaluate **existing** effective grants for the managed subject at the authorized resource context.
7. Return a **read-only** projection that makes the managed subject explicit (human-readable; caller
   must not be mislabeled as the member).

```text
NEW_PERMISSION = NO
NEW_ROLE = NO
READ_ONLY = YES
NOT_AN_ACT_AS = YES
NOT_A_PERMISSION_EDITOR = YES
NO_CLIENT_CREATED_PRINCIPAL = YES
NO_CLIENT_CREATED_GRANTS = YES
NO_CLIENT_CREATED_ROLES = YES
NO_CLIENT_CREATED_PERMISSION_LIST = YES
NO_CLIENT_CREATED_AUTHORIZED_ASSERTION = YES
CROSS_SCOPE = NON_DISCLOSING_DENY
```

Caller-scoped-only EP (CURRENT IMP-035 behaviour) is insufficient as the V1 desired diagnostic and
is superseded for IMP-036G acceptance by this managed-subject extension. Transport remains Admin
`/api/admin/v1/*` as an extension of the existing effective-permissions read — not a new auth model.

---

## 14. Audit filtering

Access Control audit remains **append-only**. IMP-036G extends the existing Admin audit read:

| Requirement | Locked posture |
|---|---|
| Auth | `access.audit.read` |
| Filters | Server-side actor, action, and date-time range |
| Filter application | Over the authoritative eligible set **before** final bounded page |
| Narrowing | Filters may narrow; never broaden |
| Per-event authz | Every returned event’s resource/scope must be authorized |
| Continuation | `AUTHORIZED_SET_CURSOR_CONTINUATION` applies |
| Mutation | No audit mutation / rewrite / delete via Admin |

```text
SCHEMA_CHANGE_FOR_AUDIT_FILTERING = NO
EXISTING_FILTER_COLUMNS = actor_workforce_user_id, action, occurred_at
INDEX_CHANGE = MAY_BE_REQUIRED only with query-plan/performance evidence
NO_PRE_AUTHORIZED_ACTION_INDEX = YES
```

Client-only filtering of a first-200 page is **rejected** as V1 architecture.

---

## 15. Membership Expire mapping

```text
EXPIRE_MAPPING = EXISTING_INVITED_TO_EXPIRED_TRANSITION
ARCHITECTURE_CHANGE = NONE
```

| Item | Locked posture |
|---|---|
| State machine | Existing `invited→expired` only |
| New membership state | **NO** |
| New command type / table / permission | **NO** |
| UI | Distinct safe **Expire** affordance (not conflated with Revoke) |
| Safety | Consequence confirmation (target / scope / outcome); Cancel non-destructive |
| Terminality | `expired` remains terminal per existing Access Control |

Architecture change for Expire is **NONE**. Product V1 requires the UI affordance over existing
authority.

---

## 16. Hierarchy revision / CAS

```text
HIERARCHY_CONCURRENCY_MODEL = SERVER_ISSUED_REVISION_CAS
APPLIES_TO = Brand, Organization, Territory, Legal Entity, Outlet
```

Locked contract (future implementation; **not** implemented by this lock artifact):

| Element | Rule |
|---|---|
| Revision field | Additive revision on each hierarchy row |
| Read | Returns current `revision` |
| Update | Requires caller `expectedRevision` |
| Persist | `WHERE id AND revision = expectedRevision`; success increments revision atomically |
| Mismatch | Deterministic stale-write conflict |
| Client timestamp | **Not** concurrency authority |
| `updated_at` | Informational only |
| Conflict UX | Reload / review / retry; **never** silent overwrite |
| Conflict handling reuse | Reuse existing Admin conflict handling patterns |

```text
SCHEMA_CHANGE = YES
MIGRATION_REQUIRED = YES
MIGRATION_KIND = FORWARD_ONLY_ADDITIVE
DESTRUCTIVE_MIGRATION_REQUIRED = NO
NEW_INDEX_REQUIRED_FOR_CAS = NO
DO_NOT_IMPLEMENT_MIGRATION_IN_THIS_ARTIFACT = YES
```

Historical update-by-ID last-writer-wins is a documented CURRENT gap and is **rejected** as V1
target semantics.

---

## 17. Responsive / mobile and accessibility

IMP-036G does **not** adopt IMP-036F inspection-only mobile policy for mandatory high-consequence
Admin actions.

Mandatory high-consequence actions must be **functional on small-mobile** (functional parity, not
identical layout):

- suspend / revoke / expire membership;
- grant / revoke role;
- deactivate organization resource.

Same safety requirements as desktop for those actions:

```text
explicit target / scope / consequence
Confirm / Cancel
focus management
keyboard access
assistive announcement
pending / success / error / recovery states
```

```text
NO_NEW_BACKEND_AUTHORITY_FROM_LAYOUT = YES
INSPECTION_ONLY_MOBILE_FOR_HIGH_CONSEQUENCE = REJECTED
WCAG_22_AA_INTENT = YES
```

Layout changes create no new permissions, roles, or domain authority.

---

## 18. Persistence / schema / migration implications

| Area | Schema / migration posture |
|---|---|
| Hierarchy revision CAS | **YES** — additive revision column(s) on Brand / Organization / Territory / Legal Entity / Outlet rows in **future** implementation |
| Audit filtering | **NO** schema change (`SCHEMA_CHANGE_FOR_AUDIT_FILTERING = NO`) |
| Membership Expire | **NO** schema change |
| Managed-subject EP | **NO** new grant/principal tables |
| Overview | **NO** KPI / analytics store |
| Operational status | **NO** Admin-side status table |
| Cursor continuation | Opaque cursors derived from stable ordering keys; no separate “page token store” required by architecture |
| Destructive migration | **NO** |
| Migration created by this lock | **NO** — lock records requirement only |

```text
SCHEMA_OR_DATA_CONTRACT_CHANGE = YES
MIGRATION_REQUIRED = YES (future implementation of additive hierarchy revisions — NOT created by this lock)
DESTRUCTIVE_MIGRATION_REQUIRED = NO
```

---

## 19. Index / performance posture

```text
INDEX_CHANGE = MAY_BE_REQUIRED only when supported by query-plan/performance evidence
NEW_INDEX_REQUIRED_FOR_CAS = NO
NO_PRE_AUTHORIZED_ACTION_INDEX = YES
```

| Surface | Posture |
|---|---|
| Audit actor / action / occurred_at filters | Index only with evidence; do not invent a pre-authorized action index |
| Authorized-set continuation | Prefer authorize-eligible then keyset/cursor over limit-then-filter |
| Overview | Bounded composition; must not become unbounded analytics scan |
| CAS updates | Primary-key + revision predicate; no new CAS index mandated |

Performance work must not weaken authorize-before-emission or invent denormalized “authorized
result caches” as a second authority.

---

## 20. Error / recovery semantics

| Class | Locked semantics |
|---|---|
| Unauthenticated | Sign-in required; no privileged mutation |
| Unauthorized / cross-scope | Non-disclosing 403/404 patterns; no foreign inventory leak |
| Illegal membership transition | Reject; affordance unavailable or explicit error |
| Ceiling / self-elevation | Deny; no partial grant |
| Stale hierarchy write (CAS mismatch) | Deterministic conflict; reload/review/retry; no silent LWW |
| Stale membership / assignment reference | Safe not-found / forbidden; recoverable |
| Ops status lacking `order.read` | Unavailable / unauthorized — not fabricated health |
| Collection continuation errors | Explicit error/retry; no false end-of-list |
| Duplicate submit | Pending disables duplicate confirm where applicable |
| Session expiry mid-flow | Re-auth before further privileged mutation |
| Partial failure | No false success |

Admin conflict handling patterns are reused for hierarchy CAS conflicts.

---

## 21. Required behavioural / security / concurrency tests (TEST-1)

Future implementation evidence under TEST-1 must cover at least:

| Area | Required proof classes |
|---|---|
| Managed-subject EP | Authorized subject projection; caller not mislabeled; missing EP/membership auth deny; cross-scope non-disclosing; read-only (no grant side-effect); not act-as |
| Collection continuation | All authorized rows reachable; no limit-then-authorize skip; opaque cursor; more/end; search narrows only; no authority broaden via navigation |
| Audit | Server-side actor/action/date-range filters before page; auth every event; append-only preserved; empty/error/retry |
| Stale writes | Concurrent hierarchy update CAS mismatch; no silent overwrite; retry after reload |
| Overview | Authoritative composition only; no KPI store; no first-200 false exhaustive summary; no auth gain |
| Ops health | Reuse Ops endpoint; no `/api/admin/v1/operational-status`; lack `order.read` → unavailable/unauthorized; Open Operations = navigation only |
| Expire | `invited→expired` only; distinct from Revoke; consequence confirm; illegal transitions blocked |
| Mobile | Small-mobile functional high-consequence paths with same safety states |
| Golden Journey | Protect `GJ-PERMITTED-OUTLET-ACCESS` continuity (membership + role within ceiling; unauthorized scopes remain denied; no invitation delivery claim) |

```text
SILENT_RETRY_AS_PROOF = FORBIDDEN
PRESERVE_INITIAL_FAILURE = YES
GJ_PERMITTED_OUTLET_ACCESS = PROTECT
```

---

## 22. Story / AC traceability (US-001 … 008)

| Story | Architecture lock coverage | Primary sections |
|---|---|---|
| `US-IMP-036G-001` — Admin context / Overview | Bounded Overview composition; capability-gated IA; no auth gain | §§7–10, 11, 17 |
| `US-IMP-036G-002` — Browse hierarchy | Authorized-set cursor continuation for hierarchy collections | §§9, 12 |
| `US-IMP-036G-003` — Maintain org resources | Soft lifecycle; server-issued revision CAS; mobile deactivate | §§15–17, 16, 18 |
| `US-IMP-036G-004` — Memberships | Existing transitions + Expire UI; membership continuation | §§12, 15, 17 |
| `US-IMP-036G-005` — Role assignments | Existing grant/revoke; ceiling; self-elevation deny; mobile | §§9, 17 |
| `US-IMP-036G-006` — Managed-subject EP | Extend Admin EP read; subject locator; read-only diagnostic | §13 |
| `US-IMP-036G-007` — Audit investigation | Server-side filters + continuation; append-only | §§12, 14 |
| `US-IMP-036G-008` — Ops status / hand-off | Reuse Ops GET; no Admin status API; navigation only | §11 |

All ACs marked mandatory in `PD-IMP-036G-DRAFT-2` remain binding product acceptance criteria.
Architecture lock chooses mechanisms; it does not weaken mandatory ACs.

```text
STORY_COMPLETE != IMP_ACCEPTED
STORIES_IMPLEMENTED = COMPLETE (implementation AUTHORIZED / STARTED / COMPLETE; not accepted; Founder UAT NOT_PERFORMED)
```

---

## 23. Golden Journey protection

| Journey | Posture |
|---|---|
| `GJ-PERMITTED-OUTLET-ACCESS` / `JOURNEY-PERMITTED-OUTLET-ACCESS` | **Protect continuity** — membership + system role assignment within delegation ceiling; unauthorized scopes remain denied |
| Invitation delivery | **Not** re-accepted; remains deferred / not supported for V1 |
| Other GJs (customer ordering, commercial publish, etc.) | Not primary IMP-036G acceptance; regression only if shared shell risk proven |

IMP-036G must not break permitted-outlet access continuity while improving Admin safety and
discoverability.

---

## 24. Explicit non-goals

| Non-goal | Posture |
|---|---|
| Custom roles / permission editor / arbitrary grants | `NOT_SUPPORTED` |
| New tenancy / auth model / deployable service | `NOT_SUPPORTED` |
| New roles / permissions / RBAC semantics | `NOT_SUPPORTED` (`NEW_* = NO`) |
| Customer-account administration | `NOT_SUPPORTED` |
| Secrets / credential / provider-key console | `NOT_SUPPORTED` |
| Commercial Catalog/Menu/Pricing duplication as IMP-036G | Out of slice (IMP-036F surfaces) |
| Ops workflow duplication / Admin-as-Ops dashboard | `NOT_SUPPORTED` (`ADMIN_NE_OPS`) |
| Analytics / BI / KPI programme / second truth store | `NOT_SUPPORTED` |
| Workforce-dashboard consolidation | `NOT_SUPPORTED` |
| Hard DELETE of organization resources | `NOT_SUPPORTED` (soft lifecycle only) |
| Four-eyes / second approval / review-token engine | `NOT_SUPPORTED` |
| `/api/admin/v1/operational-status` | `NOT_SUPPORTED` |
| Impersonation / act-as for EP diagnostic | `NOT_SUPPORTED` |
| Silent last-writer-wins hierarchy updates | Rejected as V1 target |
| ≤200 collection cap as accepted V1 boundary | Rejected |
| Client-only audit filter of first 200 | Rejected |
| IMP-036F inspection-only mobile policy for high-consequence Admin actions | Rejected |
| Acceptance / Founder UAT verdict / IMP-037 activation via this artifact | **Not authorized** |

---

## 25. D-374 / ARCH-R20 decision test (NOT required / NOT created)

Architecture Fit evaluated whether IMP-036G requires a new binding D-number or global ARCH revision.

```text
FITS_WITHIN_ARCH_R19: YES
FITS_WITHIN_D373: YES
D374_REQUIRED_FOR_LOCK: NO
D-374_CREATED: NO
ARCH_R20_REQUIRED: NO
ARCH_R20_CREATED: NO
```

**Rationale:** Admin remains on existing operations process under D-373; Ops status remains under
D-372; Access Control / Organization / ADR-005 / D-358 semantics are extended only by Admin
transport/composition, authorized-set continuation, managed-subject diagnostic read, audit query
filters, and additive hierarchy revision CAS — none of which require amending global ARCH-R19
invariants or creating D-374.

```text
NEW_SERVICE: NO
NEW_AUTH_MODEL: NO
NEW_ROLE: NO
NEW_PERMISSION: NO
NEW_RBAC_SEMANTICS: NO
```

---

## 26. Founder UAT requirement

```text
IMP036G_FOUNDER_UAT_REQUIRED = YES
IMP036G_FOUNDER_UAT = NOT_PERFORMED
```

Founder UAT is required because IMP-036G materially changes operator-visible administration
behaviour (coherent Admin Console V2, hierarchy/membership/access safety, diagnostics, audit, and
status hand-off).

Founder UAT may occur **only after**:

1. the authorized implementation is completed for the acceptance candidate (recorded at
   GTM-R129 / STATE-R127);
2. independent technical acceptance passes for that exact candidate;
3. UAT deployment is performed from the exact independently accepted candidate (canonical repository,
   branch/HEAD/tree/fingerprint rules per AGENTS.md Founder UAT gate).

```text
FOUNDER_UAT_BEFORE_IMPLEMENTATION_COMPLETE = FORBIDDEN
SELF_DECLARED_FOUNDER_UAT_PASS = FORBIDDEN
```

This capability artifact does **not** perform, schedule, or satisfy Founder UAT.

---

## 27. Implementation completion boundary

```text
ARCHITECTURE_LOCKED = YES
IMPLEMENTATION_AUTHORIZED = YES
IMPLEMENTATION_STARTED = YES
IMPLEMENTATION_COMPLETE = YES
IMP036G_IMPLEMENTATION_AUTHORIZED = YES
IMP036G_STARTED = YES
IMP036G_IMPLEMENTATION_COMPLETE = YES
IMP036G_ACCEPTED = NO
IMP037_ACTIVATED = NO
AUTHORIZED + STARTED + COMPLETE = IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE (not accepted)
IMP036G_IMPLEMENTATION_MERGE_SHA = c35c9eab6a30ec6ce745cefd75c523181326f360
IMP036G_IMPLEMENTATION_TREE = 266fe3b07811f6942e76cac155d58ba07daabe56
IMP036G_REVIEWED_CANDIDATE_HEAD = 7a013155a98529d4527e7b6c0358642e5cd9d806
IMP036G_REVIEWED_CANDIDATE_TREE = 266fe3b07811f6942e76cac155d58ba07daabe56
IMP036G_EXACT_MAIN_CI = 35214215500
IMP036G_EXACT_MAIN_CI_RESULT = SUCCESS
IMP036G_IMPLEMENTATION_EVIDENCE = COMPLETE
IMP_036G_INDEPENDENT_IMPLEMENTATION_REVIEW = PASS
CANONICAL_ROADMAP_STATE = GTM-R129 / STATE-R127
```

| Action | Covered by CURRENT ROADMAP/STATE completion (GTM-R129 / STATE-R127)? |
|---|---|
| Persist locked capability architecture | YES (governance artifact) |
| Implement runtime code / migrations / UI within this lock | YES — completed under prior authorization |
| Claim `IMPLEMENTATION_COMPLETE` | **YES** — evidenced; pending acceptance |
| Accept IMP-036G | **NO** |
| Activate IMP-037 | **NO** |
| Founder UAT | **NO** / `NOT_PERFORMED` |

No unresolved mutually exclusive architecture alternatives remain open for V1 lock. Future
acceptance must follow this lock; mechanism invention that contradicts locked models
(`AUTHORIZED_SET_CURSOR_CONTINUATION`, `EXTEND_EXISTING_ADMIN_EFFECTIVE_PERMISSIONS_READ`,
`SERVER_ISSUED_REVISION_CAS`, Ops status reuse, Expire mapping) is out of bounds without a new Fit.

---

## 28. Historical GTM-R128 / GTM-R127 provenance (superseded predecessor tips; not CURRENT lifecycle)

Historical GTM-R128 / STATE-R126 recorded implementation authorization and start. Historical
GTM-R127 / STATE-R125 recorded Architecture Fit PASS / lock. Preserved for provenance only.
CURRENT lifecycle is `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` at GTM-R129 / STATE-R127
(see §1 and §27).

```text
ARCHITECTURE_FIT = PASS
ARCHITECTURE_FIT_EXECUTION = PERFORMED
ARCHITECTURE_FIT_RESULT = PASS
ARCHITECTURE_FIT_EVALUATED_BRANCH = main
ARCHITECTURE_FIT_EVALUATED_HEAD = 386a245cde223d87c19742753130113b21b4bb2f
ARCHITECTURE_FIT_EVALUATED_TREE = c4ef07bbd00bbbb964a9551b1d04d2fe140170b3
ARCHITECTURE_FIT_EVALUATED_WORKING_TREE_FINGERPRINT = e8eb68ebf06aea7ab50305f8e8700d450f9c5e9fd1ae24c91d4d81cfd157eb2c
ARCHITECTURE_FIT_DATE = 2026-09-17
INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PASS
IMP036G_ARCHITECTURE_LOCKED = YES
ARCHITECTURE_LOCKED = YES
CANONICAL_ROADMAP_STATE = GTM-R127 / STATE-R125
PRODUCT_DEFINITION = PD-IMP-036G-DRAFT-2 APPROVED (Gate PASS; Architecture Fit PASS; architecture LOCKED)
IMPLEMENTATION_AUTHORIZED = NO
IMPLEMENTATION_STARTED = NO
IMP036G_ACCEPTED = NO
IMP036G_FOUNDER_UAT = NOT_PERFORMED
IMP037_ACTIVATED = NO
```

The persistence commit that records this lock is a **subsequent governance commit** and is **NOT**
the Fit-evaluated candidate (`386a245cde223d87c19742753130113b21b4bb2f` /
tree `c4ef07bbd00bbbb964a9551b1d04d2fe140170b3` /
fingerprint `e8eb68ebf06aea7ab50305f8e8700d450f9c5e9fd1ae24c91d4d81cfd157eb2c`).

```text
ARCHITECTURE_LOCKED != IMPLEMENTATION_AUTHORIZED
Historical lock tip did not authorize implementation; authorization/start followed at GTM-R128 /
STATE-R126; completion recorded at GTM-R129 / STATE-R127.
```

---

## End matter

| Marker | Value |
|---|---|
| Capability | IMP-036G — Administration Console V2 |
| Authority | `CAPABILITY_ARCHITECTURE` |
| Status | `CURRENT` |
| Architecture | `ARCHITECTURE_LOCKED` |
| Implementation | `AUTHORIZED` / `STARTED` / `COMPLETE` (not accepted) |
| Product Definition | `PD-IMP-036G-DRAFT-2` |
| Binding decisions | ADR-005, D-358, D-372, D-373 |
| Open mutually exclusive architecture alternatives | **NONE** |
