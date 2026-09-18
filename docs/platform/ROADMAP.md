<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "IMPLEMENTATION_SEQUENCE",
  "roadmapVersion": "GTM-R130",
  "acceptedThrough": "IMP-036G",
  "currentProductSlice": "NONE",
  "nextProductSlice": "IMP-037",
  "gtmBoundary": "IMP-040",
  "lastReviewed": "2026-09-18",
  "supersedes": "GTM-R129"
}
-->

# BOBA Bear — Implementation Roadmap

## 1. Roadmap Rules

- Accepted IMP identity is **permanently immutable**. Do not reinterpret or renumber accepted
  history (IMP-001 → IMP-025 and IMP-005A).
- No other document may independently redefine IMP numbering.
- Formal ROADMAP ledger IMP identifiers use `IMP-\d+[A-Z]?` (numeric id with optional single
  uppercase inserted suffix). Examples: `IMP-001`, `IMP-005A`, `IMP-026C`. Multi-letter,
  lowercase, hyphenated, or underscore forms are not formal ledger ids.
- Only one product slice is normally active.
- A deferred capability cannot be assigned or promoted by an implementation agent.
- Roadmap changes require a `roadmapVersion` change.
- Prefer suffix insertion or explicit versioned remapping rather than silently recycling a
  previously published IMP meaning.
- Future planned mappings must not be silently reused for another capability.
- Coding-agent completion is not acceptance. Acceptance is recorded in [`STATE.md`](./STATE.md).
- After `COMPLETE_AND_ACCEPTED`, a separate reconciliation must update STATE / ROADMAP / acceptance
  records (and DECISION-REGISTER / ARCHITECTURE when durable decisions or global architecture
  change) before the next slice begins: **ACCEPT → RECONCILE → ADVANCE**.
- The historical IMP-026 → IMP-028 controlled-continuation exception (GTM-R15 onward) is **CLOSED**.
  It does **not** generalize to future slices. Current lifecycle is determined only by CURRENT
  metadata and CURRENT position fields in this document and [`STATE.md`](./STATE.md).
- Historical GTM-R15…GTM-R113 exception narration, candidate/failure detail, and revision prose are
  preserved byte-for-byte in
  [`history/ROADMAP-GTM-R113-pre-compression.md`](./history/ROADMAP-GTM-R113-pre-compression.md).
  Do not infer current position from that snapshot.

### Slice lifecycle states

Exact vocabulary:

```text
PLANNED
ARCHITECTURE_IN_PROGRESS
ARCHITECTURE_LOCKED
IMPLEMENTATION_IN_PROGRESS
IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
COMPLETE_AND_ACCEPTED
BLOCKED
SUPERSEDED
```

```text
IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
≠
COMPLETE_AND_ACCEPTED
```

`pendingAcceptance` identifies the oldest unresolved formal acceptance gate in the contiguous
product sequence. Formal acceptance remains contiguous. Do not retarget `pendingAcceptance` to a
later slice, clear it, or create a pending-acceptance array without an explicit CURRENT roadmap
revision.

```text
ARCHITECTURE_LOCKED
≠
IMPLEMENTATION_IN_PROGRESS
```

### Capability architecture persistence (IMP-024 onward)

Every substantial future IMP must persist its complete locked capability architecture in the
repository before implementation begins. Historical accepted slices may lack governance-era
architecture artifacts; that gap does not downgrade their accepted implementation status.

Canonical capability-architecture directory:

```text
docs/platform/capabilities/
```

Immediately prior accepted locked artifact (IMP-036G; `COMPLETE_AND_ACCEPTED`):

[`capabilities/IMP-036G-administration-console-v2.md`](./capabilities/IMP-036G-administration-console-v2.md)

Prior accepted locked artifact (IMP-036F; `COMPLETE_AND_ACCEPTED`):

[`capabilities/IMP-036F-catalog-menu-pricing-promotions-management.md`](./capabilities/IMP-036F-catalog-menu-pricing-promotions-management.md)

Earlier accepted locked artifact (IMP-036E; `COMPLETE_AND_ACCEPTED`):

[`capabilities/IMP-036E-store-operations-management.md`](./capabilities/IMP-036E-store-operations-management.md)

Earlier accepted locked artifact (IMP-036D; `COMPLETE_AND_ACCEPTED`):

[`capabilities/IMP-036D-workforce-franchise-operations-v2.md`](./capabilities/IMP-036D-workforce-franchise-operations-v2.md)

Earlier accepted capability artifacts remain under `capabilities/` and in the historical ROADMAP
snapshot. `ARCHITECTURE_LOCKED` remains the retained lock vocabulary for accepted capabilities.

## 2. Current Position

```text
Accepted Through:     IMP-036G — Administration Console V2
Current Product Slice: NONE
Next Product Slice:    IMP-037 — Backup, Restore & Migration Readiness
Pending Acceptance:    NONE
Public GTM Boundary:   IMP-040 — Launch Validation & Cutover
```

```text
IMP-036F: COMPLETE_AND_ACCEPTED
IMP-036F_ARCHITECTURE: LOCKED
IMP036F_ARCHITECTURE_LOCKED: YES
IMP036F_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP036F_IMPLEMENTATION_AUTHORIZED: YES
IMP036F_STARTED: YES
IMP036F_IMPLEMENTATION_COMPLETE: YES
IMP036F_ACCEPTED: YES
IMP036F_FOUNDER_UAT_REQUIRED: YES
IMP036F_FOUNDER_UAT: PASS
IMP036F_FORMAL_ACCEPTANCE: ACCEPTED
IMP036F_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP036F_PRODUCT_DEFINITION: APPROVED
IMP036F_PRODUCT_DEFINITION_GATE: PASS
IMP036F_ARCHITECTURE_FIT: PASS
IMP036F_ACTIVATED: YES
IMP036F_ACCEPTED_MAIN_SHA: 91d0b5e5e5815da6bf0bb325a3c6ab884dc06652
IMP036F_ACCEPTED_TREE: ab41fc7f2bf6d0a52c3ea6c2b69ed331ca9540cf
IMP036F_ACCEPTED_CANDIDATE: 91d0b5e5e5815da6bf0bb325a3c6ab884dc06652
IMP036F_FOUNDER_UAT_CANDIDATE_BRANCH: main
IMP036F_FOUNDER_UAT_CANDIDATE_HEAD: 91d0b5e5e5815da6bf0bb325a3c6ab884dc06652
IMP036F_FOUNDER_UAT_CANDIDATE_TREE: ab41fc7f2bf6d0a52c3ea6c2b69ed331ca9540cf
IMP036F_FOUNDER_UAT_CANDIDATE_FINGERPRINT: c689630cb9a4d002fda3376f949a1f324015776d392abfd2abde7b6f5b91f973
IMP036F_FOUNDER_UAT_DECISION_DATE: 2026-09-15
IMP036F_FOUNDER_UAT_ACCEPTANCE_AUTHORITY: Founder
IMP036F_EXACT_MAIN_CI: 34991901136
IMP036F_EXACT_MAIN_CI_RESULT: SUCCESS
IMP036F_F6A_PR: 149
IMP036F_F6A_REVIEWED_HEAD: 429923f182d22d960052f5ca840bc367d4fd9078
IMP036F_F6A_MERGE_MAIN: 611d6e7707f561c581118873d58214e92faf75bb
IMP036F_F6B_PR: 150
IMP036F_F6B_REVIEWED_HEAD: 240cb4ee20cd468280198304e96efecb7ecaf895
IMP036F_F6B_INDEPENDENT_REVIEW: 5210814689
IMP036F_F6B_MERGE: 07f15d5a2eab1a86d7a9412622554db4b0117f49
IMP036F_POST_MERGE_AUDIT_PR: 151
IMP036F_POST_MERGE_AUDIT_REVIEWED_HEAD: b95fe1d1cd20290bcd92f82b072258d7d9ec7bce
IMP036F_POST_MERGE_AUDIT_INDEPENDENT_REVIEW: 5212370227
IMP036F_POST_MERGE_AUDIT_MERGE: 91d0b5e5e5815da6bf0bb325a3c6ab884dc06652
IMP036F_CRITICAL_POST_MERGE_PERSISTENCE_AUDIT: PASS
FOUNDER_STAGING_PROJECT: boba-staging
FOUNDER_STAGING_CANDIDATE_MATCH: YES
FOUNDER_STAGING_STATUS: FOUNDER_UAT_COMPLETE
FOUNDER_STAGING_UAT_ROUTE: /workforce/admin/commercial
IMP-036E: COMPLETE_AND_ACCEPTED
IMP-036E_ARCHITECTURE: LOCKED
IMP-036E_ARCHITECTURE_LOCKED: YES
IMP-036E_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-036E_IMPLEMENTATION_AUTHORIZED: YES
IMP-036E_STARTED: YES
IMP-036E_IMPLEMENTATION_COMPLETE: YES
IMP-036E_ACCEPTED: YES
IMP-036E_FOUNDER_UAT_REQUIRED: YES
IMP-036E_FOUNDER_UAT: PASS
IMP036E_FOUNDER_UAT: PASS
IMP036E_FORMAL_ACCEPTANCE: ACCEPTED
IMP036E_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP036E_ACCEPTED_MAIN_SHA: 05c534bac3d077f5ab89928495568bb63faf78df
IMP036E_ACCEPTED_TREE: 55b28977ee9860c2c07cb25f751c9f48ef4a2aa6
IMP036E_ACCEPTED_CANDIDATE: 05c534bac3d077f5ab89928495568bb63faf78df
IMP036E_FOUNDER_UAT_CANDIDATE_REPOSITORY: /home/ajoshi/repos/boba-bear-platform
IMP036E_FOUNDER_UAT_CANDIDATE_BRANCH: main
IMP036E_FOUNDER_UAT_CANDIDATE_HEAD: 05c534bac3d077f5ab89928495568bb63faf78df
IMP036E_FOUNDER_UAT_CANDIDATE_TREE: 55b28977ee9860c2c07cb25f751c9f48ef4a2aa6
IMP036E_FOUNDER_UAT_CANDIDATE_FINGERPRINT: 1a97d3a4c80394804e19398e4f3684067aefb0d42a01a7899e8777d1a07cb289
IMP036E_FOUNDER_UAT_DECISION_DATE: 2026-09-10
IMP036E_FOUNDER_UAT_ACCEPTANCE_AUTHORITY: Founder
IMP036E_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_036E_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP036E_IMPLEMENTATION_MERGE_SHA: 0ebb5e937cd7ac14bb3e39e9d1d494e32c9d2739
IMP036E_IMPLEMENTATION_TREE: 0def59ce9bcab4575a7b43b7c3c07c85ac575428
IMP036E_REVIEWED_CANDIDATE_HEAD: b2ffaa5bc2b5c6f58ff5241c226b583160132837
IMP036E_REVIEWED_CANDIDATE_TREE: 0def59ce9bcab4575a7b43b7c3c07c85ac575428
FOUNDER_STAGING_INTERMEDIATE_CANDIDATE_SHA: e9821271a29ae35ba6c921008b976cd2e8d15c50
FOUNDER_STAGING_INTERMEDIATE_CANDIDATE_TREE: 8259d30f662e6668f2208788f2e95faaea831384
IMP036E_ASSORTMENT_AUTHORITY: BRAND
OUTLET_MANAGER_OUTLET_SCOPE_ASSORTMENT_MANAGE: NO
OUTLET_EFFECTIVE_ASSORTMENT_PRESENTATION: AUTHORIZED_READ_OR_ESCALATE
IMP036E_ASSORTMENT_WORKFORCE_TRANSPORT: READ_ONLY_OPERATIONS_PROJECTION
ASSORTMENT_AUTHORIZATION_RESOURCE: BRAND_DERIVED_FROM_OUTLET
ASSORTMENT_MANAGE_ROUTE_IMP036E: NO
IMP036E_BULK_AVAILABILITY: DEFERRED
SERVICEABILITY_MODEL: OUTLET_DISTANCE_SERVICEABILITY_V1
SERVICEABILITY_COORDINATE_AUTHORITY: YES
SERVICEABILITY_POSTAL_PIN_RUNTIME_AUTHORITY: NO
SERVICEABILITY_MAP_IS_PROJECTION_ONLY: YES
IMP036E_SERVICEABILITY_ROUTING_PRIORITY_UI: HIDDEN_PREREQUISITE
IMP036E_SESSION_CAPABILITY_PROJECTION_EXTENSION: EXISTING_PERMISSION_KEYS_ONLY
IMP036E_GLOBAL_SESSION_CAPS_ARE_RESOURCE_AUTHORITY: NO
IMP036E_GLOBAL_SESSION_CAPS_PURPOSE: COARSE_NAVIGATION_ONLY
IMP036E_RESOURCE_SCOPED_CONTROL_VISIBILITY: REQUIRED
IMP036E_SERVER_AUTHORIZATION_REMAINS_AUTHORITATIVE: YES
SCHEMA_CHANGE_REQUIRED: NO
NEW_PERMISSION: NO
NEW_ROLE: NO
NEW_SCOPE_MODEL: NO
D374_REQUIRED_FOR_IMP036E_LOCK: NO
D-374_CREATED: NO
ARCH_R20_REQUIRED_FOR_IMP036E_LOCK: NO
ARCH_R20_CREATED: NO
IMP-036G: COMPLETE_AND_ACCEPTED
IMP036G_ACTIVATED: YES
IMP036G_PRODUCT_DEFINITION: APPROVED
IMP036G_PRODUCT_DEFINITION_VERSION: PD-IMP-036G-DRAFT-2
IMP036G_PRODUCT_DECISIONS: RESOLVED
IMP036G_PRODUCT_DECISION_COUNT: 7
IMP036G_PRODUCT_DECISION_AUTHORITY: Founder
IMP036G_PRODUCT_DECISION_DATE: 2026-09-16
IMP036G_PRODUCT_DEFINITION_GATE: PASS
IMP036G_ARCHITECTURE_FIT: PASS
IMP036G_ARCHITECTURE_LOCKED: YES
IMP036G_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP036G_IMPLEMENTATION_AUTHORIZED: YES
IMP036G_STARTED: YES
IMP036G_IMPLEMENTATION_COMPLETE: YES
IMP-036G_IMPLEMENTATION_COMPLETE: YES
IMP036G_ACCEPTED: YES
IMP036G_FOUNDER_UAT_REQUIRED: YES
IMP036G_FOUNDER_UAT: PASS
IMP036G_FORMAL_ACCEPTANCE: ACCEPTED
IMP036G_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP036G_INDEPENDENT_TECHNICAL_ACCEPTANCE: PASS
IMP036G_ACCEPTED_MAIN_SHA: fbf690a67cda51bd6bbc1bad4a9d26f574c4286e
IMP036G_ACCEPTED_TREE: 84b6a502fcec646cb5a65f3257f19b85c64f49e1
IMP036G_ACCEPTED_CANDIDATE: fbf690a67cda51bd6bbc1bad4a9d26f574c4286e
IMP036G_FOUNDER_UAT_CANDIDATE_BRANCH: main
IMP036G_FOUNDER_UAT_CANDIDATE_HEAD: fbf690a67cda51bd6bbc1bad4a9d26f574c4286e
IMP036G_FOUNDER_UAT_CANDIDATE_TREE: 84b6a502fcec646cb5a65f3257f19b85c64f49e1
IMP036G_FOUNDER_UAT_CANDIDATE_FINGERPRINT: 9f472ce6e1ccaa2fe914006c846fb3018d668b718f569b6d0cb4fa64c3013f9b
IMP036G_FOUNDER_UAT_DECISION_DATE: 2026-09-18
IMP036G_FOUNDER_UAT_ACCEPTANCE_AUTHORITY: Founder
IMP036G_EXACT_MAIN_CI: 35366698302
IMP036G_EXACT_MAIN_CI_RESULT: SUCCESS
IMP036G_IMPLEMENTATION_EXACT_MAIN_CI: 35214215500
IMP036G_IMPLEMENTATION_EXACT_MAIN_CI_RESULT: SUCCESS
IMP036G_MANUAL_TECHNICAL_VALIDATION: PASS
IMP036G_MANUAL_VALIDATION_CANDIDATE_SHA: c35c9eab6a30ec6ce745cefd75c523181326f360
IMP036G_MANUAL_VALIDATION_CANDIDATE_TREE: 266fe3b07811f6942e76cac155d58ba07daabe56
IMP036G_MANUAL_VALIDATION_DATE: 2026-09-18
IMP036G_MANUAL_VALIDATION_TESTER: Ashutosh
IMP036G_MANUAL_VALIDATION_DEFECTS: NONE
IMP036G_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_036G_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP036G_IMPLEMENTATION_MERGE_SHA: c35c9eab6a30ec6ce745cefd75c523181326f360
IMP036G_IMPLEMENTATION_TREE: 266fe3b07811f6942e76cac155d58ba07daabe56
IMP036G_REVIEWED_CANDIDATE_HEAD: 7a013155a98529d4527e7b6c0358642e5cd9d806
IMP036G_REVIEWED_CANDIDATE_TREE: 266fe3b07811f6942e76cac155d58ba07daabe56
IMP036G_PR_159: 159
IMP036G_PR_159_REVIEWED_HEAD: 7a013155a98529d4527e7b6c0358642e5cd9d806
IMP036G_PR_159_MERGE: c35c9eab6a30ec6ce745cefd75c523181326f360
IMP036G_PR_161_MERGE: 9994dc47
IMP036G_PR_163: 163
IMP036G_PR_163_REVIEWED_HEAD: da4bd82d
IMP036G_PR_163_MERGE: 2beec2aa
IMP036G_PR_164: 164
IMP036G_PR_164_REVIEWED_HEAD: 9cf5f790
IMP036G_PR_164_INDEPENDENT_REVIEW: 5249475938
IMP036G_PR_164_MERGE: 7ec7e51a
IMP036G_PR_165: 165
IMP036G_PR_165_REVIEWED_HEAD: de82fbf5
IMP036G_PR_165_INDEPENDENT_REVIEW: 5249952268
IMP036G_PR_165_MERGE: fbf690a67cda51bd6bbc1bad4a9d26f574c4286e
FOUNDER_STAGING_PROJECT: boba-staging
IMP036G_FOUNDER_STAGING_CANDIDATE_MATCH: YES
IMP036G_FOUNDER_STAGING_BASELINE_STATE: COMPLETE_COMPATIBLE
IMP036G_FOUNDER_STAGING_BOOTSTRAP_ACTION: PRESERVE
IMP036G_FOUNDER_STAGING_RUNNING_SHA: fbf690a67cda51bd6bbc1bad4a9d26f574c4286e
IMP036G_FOUNDER_STAGING_STATUS: FOUNDER_UAT_COMPLETE
IMP036G_FOUNDER_STAGING_UAT_ROUTE: /workforce/admin/
IMP-037: PLANNED / NOT_ACTIVATED / NOT_AUTHORIZED / NOT_STARTED
IMP037_ACTIVATED: NO
IMP-036D: COMPLETE_AND_ACCEPTED
IMP-036D_ARCHITECTURE_LOCKED: YES
IMP-036D_ACCEPTED: YES
IMP-036D_FOUNDER_UAT: PASS
```

**GTM-R130** records formal IMP-036G acceptance after Founder UAT PASS on 2026-09-18 for the exact
accepted UAT product candidate `fbf690a67cda51bd6bbc1bad4a9d26f574c4286e` / tree
`84b6a502fcec646cb5a65f3257f19b85c64f49e1` (fingerprint
`9f472ce6e1ccaa2fe914006c846fb3018d668b718f569b6d0cb4fa64c3013f9b`; Founder authority;
decision date 2026-09-18). Exact-main CI run `35366698302` SUCCESS on that accepted merge SHA.
Locked capability architecture:
[`capabilities/IMP-036G-administration-console-v2.md`](./capabilities/IMP-036G-administration-console-v2.md).
Product Definition remains `PD-IMP-036G-DRAFT-2` (APPROVED; Gate PASS; Architecture Fit PASS).
ARCH-R19 and DR-15 remain unchanged. `acceptedThrough` advances to IMP-036G;
`currentProductSlice = NONE`; `pendingAcceptance = NONE`; `nextProductSlice` remains IMP-037
(`PLANNED` / `NOT_ACTIVATED` / `NOT_AUTHORIZED` / `NOT_STARTED`; `IMP037_ACTIVATED: NO`).
This governance reconciliation is **not** a new product UAT candidate and does **not** activate
IMP-037. ADVANCE / activation of IMP-037 is a separate Founder-authorized task.

Implementation / review provenance for IMP-036G remains distinct from the accepted UAT candidate:
implementation merge `c35c9eab6a30ec6ce745cefd75c523181326f360` / tree `266fe3b07811f6942e76cac155d58ba07daabe56`; reviewed candidate HEAD
`7a013155a98529d4527e7b6c0358642e5cd9d806` / tree `266fe3b07811f6942e76cac155d58ba07daabe56` (PR #159); implementation exact-main CI `35214215500` SUCCESS
(preserved as `IMP036G_IMPLEMENTATION_EXACT_MAIN_CI`). Subsequent independent review merges
include PR #161 (`9994dc47…`), PR #163 (`2beec2aa…`), PR #164 (review `5249475938`; merge
`7ec7e51a…`), and PR #165 (review `5249952268`; accepted merge `fbf690a67cda51bd6bbc1bad4a9d26f574c4286e`).
Manual technical validation PASS on implementation candidate `c35c9eab6a30ec6ce745cefd75c523181326f360` / tree `266fe3b07811f6942e76cac155d58ba07daabe56`
(tester Ashutosh; 2026-09-18; defects NONE). Independent technical acceptance: PASS.
Founder staging project `boba-staging` recorded G-scoped `CANDIDATE_MATCH: YES`, baseline
`COMPLETE_COMPATIBLE`, bootstrap `PRESERVE`, running SHA `fbf690a67cda51bd6bbc1bad4a9d26f574c4286e`, UAT route
`/workforce/admin/`. Formal Founder acceptance: `ACCEPT IMP-036G`.

Historical GTM-R129 / STATE-R127 state: IMP-036G was `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`
with `IMP036G_ACCEPTED: NO` and `IMP036G_FOUNDER_UAT: NOT_PERFORMED` pending Founder UAT.


IMP-036F remains `COMPLETE_AND_ACCEPTED`. Concise acceptance identity remains UAT candidate
`91d0b5e5e5815da6bf0bb325a3c6ab884dc06652` / tree `ab41fc7f2bf6d0a52c3ea6c2b69ed331ca9540cf`.

IMP-036E remains `COMPLETE_AND_ACCEPTED`. Concise acceptance identity remains UAT candidate
`05c534bac3d077f5ab89928495568bb63faf78df` / tree `55b28977ee9860c2c07cb25f751c9f48ef4a2aa6`.
Preferred Store Assortment read route:
`GET /api/operations/v1/outlets/{outletId}/assortment`.

IMP-036D remains `COMPLETE_AND_ACCEPTED`. Concise acceptance identity: UAT candidate HEAD
`a6ff612c65e0d58409017b2935e0da16cffa9530` / tree `6580497091525c3ddd892aa44aafd63ef1132d35`
(GTM-R108). Detailed candidate/failure/reconciliation evidence remains in
[`history/ROADMAP-GTM-R113-pre-compression.md`](./history/ROADMAP-GTM-R113-pre-compression.md) and
[`capabilities/IMP-036D-workforce-franchise-operations-v2.md`](./capabilities/IMP-036D-workforce-franchise-operations-v2.md).

## 3. Accepted Slices

| IMP | Capability | Lifecycle |
|---|---|---|
| IMP-001 | Behaviour-preserving `src/` migration | COMPLETE_AND_ACCEPTED |
| IMP-002 | Test and quality-tooling foundation | COMPLETE_AND_ACCEPTED |
| IMP-003 | Configuration and startup foundation | COMPLETE_AND_ACCEPTED |
| IMP-004 | PostgreSQL + Drizzle foundation | COMPLETE_AND_ACCEPTED |
| IMP-005 | Database test and migration validation | COMPLETE_AND_ACCEPTED |
| IMP-005A | Dockerized local application runtime | COMPLETE_AND_ACCEPTED |
| IMP-006 | Shared persistence primitives | COMPLETE_AND_ACCEPTED |
| IMP-007 | Transactional outbox and idempotency foundation | COMPLETE_AND_ACCEPTED |
| IMP-008 | Better Auth persistence and sessions | COMPLETE_AND_ACCEPTED |
| IMP-009 | Customer phone OTP authentication | COMPLETE_AND_ACCEPTED |
| IMP-010 | Workforce authentication + MFA | COMPLETE_AND_ACCEPTED |
| IMP-011 | Organization / Territory / Outlet / scoped RBAC | COMPLETE_AND_ACCEPTED |
| IMP-012 | Canonical catalog | COMPLETE_AND_ACCEPTED |
| IMP-013 | Existing menu import + menu presentation | COMPLETE_AND_ACCEPTED |
| IMP-014 | Assortment + operational availability | COMPLETE_AND_ACCEPTED |
| IMP-015 | Pricing, charges and GST/tax engine | COMPLETE_AND_ACCEPTED |
| IMP-016 | Promotions | COMPLETE_AND_ACCEPTED |
| IMP-017 | Customer Profiles | COMPLETE_AND_ACCEPTED |
| IMP-018 | Saved Customer Addresses | COMPLETE_AND_ACCEPTED |
| IMP-019 | Serviceability | COMPLETE_AND_ACCEPTED |
| IMP-020 | Cart | COMPLETE_AND_ACCEPTED |
| IMP-021 | Checkout | COMPLETE_AND_ACCEPTED |
| IMP-022 | Payment | COMPLETE_AND_ACCEPTED |
| IMP-023 | Order | COMPLETE_AND_ACCEPTED |
| IMP-024 | Customer Ordering Transport / API | COMPLETE_AND_ACCEPTED |
| IMP-025 | Customer Ordering UX | COMPLETE_AND_ACCEPTED |
| IMP-026 | Razorpay Productionization & Payment GTM Readiness | COMPLETE_AND_ACCEPTED |
| IMP-026C | Pilot Customer-Commerce UX Hardening | COMPLETE_AND_ACCEPTED |
| IMP-027 | Refund Foundation | COMPLETE_AND_ACCEPTED |
| IMP-028 | Invoice / Tax Receipt / Credit Note | COMPLETE_AND_ACCEPTED |
| IMP-028A | Food Direct UX Foundation | COMPLETE_AND_ACCEPTED |
| IMP-028B | Customer Menu Projection + Discovery | COMPLETE_AND_ACCEPTED |
| IMP-028C | Food Customization | COMPLETE_AND_ACCEPTED |
| IMP-028D | Desktop Ordering Continuity | COMPLETE_AND_ACCEPTED |
| IMP-029 | Operations Console API | COMPLETE_AND_ACCEPTED |
| IMP-030 | Operations Console UI | COMPLETE_AND_ACCEPTED |
| IMP-031 | Provider-Neutral Delivery Foundation | COMPLETE_AND_ACCEPTED |
| IMP-032 | Dehradun Delivery Operating Mode | COMPLETE_AND_ACCEPTED |
| IMP-033 | Notification Foundation | COMPLETE_AND_ACCEPTED |
| IMP-034 | Meta WhatsApp Cloud API Adapter | COMPLETE_AND_ACCEPTED |
| IMP-035 | Initial Administration Capabilities | COMPLETE_AND_ACCEPTED |
| IMP-036 | Observability & Operational Controls | COMPLETE_AND_ACCEPTED |
| IMP-036A | Multi-Portal Experience Foundation | COMPLETE_AND_ACCEPTED |
| IMP-036B | Customer Account, Onboarding, Address & Location Experience | COMPLETE_AND_ACCEPTED |
| IMP-036C | Customer Commerce Experience V2 | COMPLETE_AND_ACCEPTED |
| IMP-036D | Workforce & Franchise Operations Portal V2 | COMPLETE_AND_ACCEPTED |
| IMP-036E | Store Operations Management | COMPLETE_AND_ACCEPTED |
| IMP-036F | Catalog, Menu, Pricing & Promotions Management | COMPLETE_AND_ACCEPTED |
| IMP-036G | Administration Console V2 | COMPLETE_AND_ACCEPTED |

## 4. Current Product Slice

No active product slice (`currentProductSlice = NONE`; `pendingAcceptance = NONE`).

IMP-036G — Administration Console V2 is `COMPLETE_AND_ACCEPTED` with architecture
`ARCHITECTURE_LOCKED` and implementation `AUTHORIZED` / `STARTED` / `COMPLETE`
(`IMP036G_ARCHITECTURE_LOCKED: YES`; `IMP036G_IMPLEMENTATION_AUTHORIZED: YES`;
`IMP036G_STARTED: YES`; `IMP036G_IMPLEMENTATION_COMPLETE: YES`; `IMP036G_ACCEPTED: YES`;
`IMP036G_FOUNDER_UAT: PASS`; Product Definition `PD-IMP-036G-DRAFT-2` APPROVED / Gate PASS /
Architecture Fit PASS). Locked capability architecture (latest accepted):
[`capabilities/IMP-036G-administration-console-v2.md`](./capabilities/IMP-036G-administration-console-v2.md).
Supporting experience contract is historical after acceptance:
[`experience/enterprise-experience/IMP-036G-administration-console-v2.md`](./experience/enterprise-experience/IMP-036G-administration-console-v2.md).
Per-IMP Product Definition remains:
[`product/IMP-036G/product-definition.md`](./product/IMP-036G/product-definition.md).
Accepted UAT product candidate remains `fbf690a67cda51bd6bbc1bad4a9d26f574c4286e` / tree
`84b6a502fcec646cb5a65f3257f19b85c64f49e1`. ARCH-R19 and DR-15 remain unchanged;
`SCHEMA_CHANGE_REQUIRED: YES` remains the architecture conclusion recorded for IMP-036G;
`NEW_PERMISSION: NO`; `NEW_ROLE: NO`; `NEW_SCOPE_MODEL: NO`;
`D374_REQUIRED_FOR_LOCK: NO`; `ARCH_R20_REQUIRED: NO`;
`D-374_CREATED: NO`; `ARCH_R20_CREATED: NO`.

Next product slice remains IMP-037 — Backup, Restore & Migration Readiness
(`PLANNED` / `NOT_ACTIVATED` / `NOT_AUTHORIZED` / `NOT_STARTED`; `IMP037_ACTIVATED: NO`).
ADVANCE / activation of IMP-037 is a separate Founder-authorized task and is **not** performed by
this acceptance reconciliation.

IMP-036F — Catalog, Menu, Pricing & Promotions Management remains `COMPLETE_AND_ACCEPTED` with
architecture `ARCHITECTURE_LOCKED` and implementation `AUTHORIZED` / `STARTED` / `COMPLETE`
(`IMP036F_ARCHITECTURE_LOCKED: YES`; `IMP036F_IMPLEMENTATION_AUTHORIZED: YES`;
`IMP036F_STARTED: YES`; `IMP036F_IMPLEMENTATION_COMPLETE: YES`; `IMP036F_ACCEPTED: YES`;
`IMP036F_FOUNDER_UAT: PASS`; Product Definition `PD-IMP-036F-DRAFT-1` APPROVED / Gate PASS /
Architecture Fit PASS). Locked capability architecture:
[`capabilities/IMP-036F-catalog-menu-pricing-promotions-management.md`](./capabilities/IMP-036F-catalog-menu-pricing-promotions-management.md).
Supporting experience contract is historical after acceptance:
[`experience/enterprise-experience/IMP-036F-catalog-menu-pricing-promotions.md`](./experience/enterprise-experience/IMP-036F-catalog-menu-pricing-promotions.md).
Per-IMP Product Definition remains:
[`product/IMP-036F/product-definition.md`](./product/IMP-036F/product-definition.md).
Accepted UAT product candidate remains `91d0b5e5e5815da6bf0bb325a3c6ab884dc06652` / tree
`ab41fc7f2bf6d0a52c3ea6c2b69ed331ca9540cf`.

IMP-036E — Store Operations Management remains `COMPLETE_AND_ACCEPTED` with architecture
`ARCHITECTURE_LOCKED` and implementation `AUTHORIZED` / `STARTED` / `COMPLETE`
(`IMP-036E_ARCHITECTURE_LOCKED: YES`; `IMP-036E_IMPLEMENTATION_AUTHORIZED: YES`;
`IMP-036E_STARTED: YES`; `IMP-036E_IMPLEMENTATION_COMPLETE: YES`; `IMP-036E_ACCEPTED: YES`;
`IMP-036E_FOUNDER_UAT: PASS`). Locked capability architecture:
[`capabilities/IMP-036E-store-operations-management.md`](./capabilities/IMP-036E-store-operations-management.md).
Supporting experience contract is historical after acceptance:
[`experience/enterprise-experience/IMP-036E-store-operations-management.md`](./experience/enterprise-experience/IMP-036E-store-operations-management.md).
Founder Option A locks Assortment as Brand authority (`IMP036E_ASSORTMENT_AUTHORITY: BRAND`).
Serviceability remains `OUTLET_DISTANCE_SERVICEABILITY_V1`
(`SERVICEABILITY_COORDINATE_AUTHORITY: YES`; `SERVICEABILITY_POSTAL_PIN_RUNTIME_AUTHORITY: NO`;
`SERVICEABILITY_MAP_IS_PROJECTION_ONLY: YES`;
`IMP036E_SERVICEABILITY_ROUTING_PRIORITY_UI: HIDDEN_PREREQUISITE`). Global session capability
booleans are coarse navigation only (`IMP036E_GLOBAL_SESSION_CAPS_ARE_RESOURCE_AUTHORITY: NO`;
`IMP036E_GLOBAL_SESSION_CAPS_PURPOSE: COARSE_NAVIGATION_ONLY`;
`IMP036E_RESOURCE_SCOPED_CONTROL_VISIBILITY: REQUIRED`;
`IMP036E_SERVER_AUTHORIZATION_REMAINS_AUTHORITATIVE: YES`).

IMP-036D — Workforce & Franchise Operations Portal V2 remains `COMPLETE_AND_ACCEPTED`
(`IMP-036D_ACCEPTED: YES`; `IMP-036D_FOUNDER_UAT: PASS`). Locked capability architecture:
[`capabilities/IMP-036D-workforce-franchise-operations-v2.md`](./capabilities/IMP-036D-workforce-franchise-operations-v2.md).
Historical acceptance evidence remains in the pre-compression ROADMAP snapshot.


## 5. Future GTM Slices

Remaining numeric GTM range IMP-037 → IMP-040: **4** IMP numbers. Enterprise Experience suffix
slices IMP-036A–G are inserted before IMP-037 without consuming or renaming existing numeric
identities. Accepted inserted slices IMP-026C and IMP-028A–D remain in the accepted ledger and are
not future identities. Historical Food Direct insertion narration remains in
[`history/ROADMAP-GTM-R113-pre-compression.md`](./history/ROADMAP-GTM-R113-pre-compression.md).

| IMP | Capability | Lifecycle |
|---|---|---|
| IMP-036A | Multi-Portal Experience Foundation | COMPLETE_AND_ACCEPTED |
| IMP-036B | Customer Account, Onboarding, Address & Location Experience | COMPLETE_AND_ACCEPTED |
| IMP-036C | Customer Commerce Experience V2 | COMPLETE_AND_ACCEPTED |
| IMP-036D | Workforce & Franchise Operations Portal V2 | COMPLETE_AND_ACCEPTED |
| IMP-036E | Store Operations Management | COMPLETE_AND_ACCEPTED |
| IMP-036F | Catalog, Menu, Pricing & Promotions Management | COMPLETE_AND_ACCEPTED |
| IMP-036G | Administration Console V2 | COMPLETE_AND_ACCEPTED |
| IMP-037 | Backup, Restore & Migration Readiness | PLANNED |
| IMP-038 | Security & Privacy Hardening | PLANNED |
| IMP-039 | Production Infrastructure & Release Pipeline | PLANNED |
| IMP-040 | Launch Validation & Cutover | PLANNED |

### 5.0E Enterprise Experience Programme — IMP-036A → IMP-036G

The [Enterprise Experience Programme](./experience/enterprise-experience/README.md) defines supporting
UX/workflow contracts (not locked capability architecture). Required order remains
IMP-036A → B → C → D → E → F → G → IMP-037.

```text
FIGMA_REQUIRED_FOR_INITIAL_IMPLEMENTATION: NO
IMP-036A → IMP-036G: COMPLETE_AND_ACCEPTED
IMP-037: PLANNED / NOT_ACTIVATED / NOT_AUTHORIZED / NOT_STARTED (IMP037_ACTIVATED: NO)
FOUNDER_UAT_REQUIRED: YES for each Enterprise Experience slice
```

Programme contracts for remaining planned slices are historical after IMP-036G acceptance (see
[`experience/enterprise-experience/`](./experience/enterprise-experience/)).

## 6. Deferred / Unscheduled Capabilities

Status: `DEFERRED_UNSCHEDULED` — no IMP number assigned.

- Customer self-service cancellation
- Quantitative Inventory Reservation
- Detailed Kitchen Fulfilment
- Loyalty / Rewards
- Multi-provider Payments
- International Payments
- EMI
- BNPL
- COD

Future possibility does not authorize present implementation.
## 7. GTM Boundary

```text
Public GTM boundary = IMP-040 — Launch Validation & Cutover
```

Vision outcome definition remains in [`VISION.md`](./VISION.md). This roadmap is the only document
that maps that outcome onto the current numbered GTM boundary.

Strategic channel model (does not change VISION-1): Zomato / Swiggy = acquisition + convenience +
volume; BOBA Direct = owned relationship + retention + brand + direct-order economics. Primary
commercial objective for BOBA Direct: profitable repeat direct orders. GTM commercial-control
measurement and controlled-pilot governance remain planning requirements only — not authorization to
implement analytics infrastructure now. Detailed GTM measurement / pilot prose remains in
[`history/ROADMAP-GTM-R113-pre-compression.md`](./history/ROADMAP-GTM-R113-pre-compression.md).

## 8. Historical Roadmap Notice

[`implementation-roadmap.md`](./implementation-roadmap.md) is **SUPERSEDED** historical roadmap
version **GTM-R1**. It must not be used for current implementation sequencing.

Historical GTM-R1 meanings that are **not** current:

| Historical GTM-R1 ID | Historical meaning (do not use) | Current GTM-R2/R3 meaning |
|---|---|---|
| IMP-021 | Cashfree payment adapter | Checkout |
| IMP-022 | Payment webhooks and verification | Payment |
| IMP-023 | Refund foundation | Order |
| IMP-024 | Order lifecycle and Operations Console API | Customer Ordering Transport / API |
| IMP-035 | Launch validation and cutover | Initial Administration Capabilities |

Current public GTM boundary is **IMP-040**, not IMP-035.

## 9. Roadmap Change Log

Historical revision evidence for GTM-R1…GTM-R113 is preserved byte-for-byte in
[`history/ROADMAP-GTM-R113-pre-compression.md`](./history/ROADMAP-GTM-R113-pre-compression.md).

### GTM-R130 — 2026-09-18

- Formal acceptance of IMP-036G — Administration Console V2 after Founder UAT PASS.
- Accepted UAT product candidate remains `fbf690a67cda51bd6bbc1bad4a9d26f574c4286e` / tree
  `84b6a502fcec646cb5a65f3257f19b85c64f49e1` (fingerprint
  `9f472ce6e1ccaa2fe914006c846fb3018d668b718f569b6d0cb4fa64c3013f9b`; exact-main CI
  `35366698302` SUCCESS). Governance reconciliation is not a new product candidate.
- Advances `acceptedThrough = IMP-036G`; sets `currentProductSlice = NONE` and
  `pendingAcceptance = NONE`; preserves `nextProductSlice = IMP-037`.
- Records `IMP-036G: COMPLETE_AND_ACCEPTED`; `IMP036G_ACCEPTED: YES`; `IMP036G_FOUNDER_UAT: PASS`;
  `IMP036G_FORMAL_ACCEPTANCE: ACCEPTED`; `IMP036G_IMPLEMENTATION_COMPLETE: YES`;
  `IMP036G_INDEPENDENT_TECHNICAL_ACCEPTANCE: PASS`.
- Preserves Product Definition `PD-IMP-036G-DRAFT-2` (Gate PASS; Architecture Fit PASS).
- Preserves implementation / review provenance separately from the accepted UAT candidate
  (implementation merge `c35c9eab6a30ec6ce745cefd75c523181326f360` / tree `266fe3b07811f6942e76cac155d58ba07daabe56`; reviewed HEAD `7a013155a98529d4527e7b6c0358642e5cd9d806`;
  implementation CI `35214215500` as `IMP036G_IMPLEMENTATION_EXACT_MAIN_CI`; PRs #159/#161/#163/#164/#165).
- Preserves IMP-036F acceptance evidence unchanged.
- IMP-037 remains `PLANNED` / `NOT_ACTIVATED` / `NOT_AUTHORIZED` / `NOT_STARTED`
  (`IMP037_ACTIVATED: NO`). No ADVANCE.
- ARCH-R19 / DR-15 / D-374 / ARCH-R20 unchanged (no new binding semantics).
- Supersedes GTM-R129.

### GTM-R129 — 2026-09-18

- Records IMP-036G implementation complete pending independent acceptance after exact implementation
  merge (`c35c9eab6a30ec6ce745cefd75c523181326f360`; tree
  `266fe3b07811f6942e76cac155d58ba07daabe56`), independent implementation review PASS on reviewed
  product candidate `7a013155a98529d4527e7b6c0358642e5cd9d806` (same tree; PR #159), and successful
  exact-main CI (`workflow: CI`; run `35214215500`; head_sha
  `c35c9eab6a30ec6ce745cefd75c523181326f360`; result SUCCESS).
- IMP-036G lifecycle becomes `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Architecture remains
  `ARCHITECTURE_LOCKED` (`IMP036G_ARCHITECTURE_LOCKED: YES`); implementation becomes
  `AUTHORIZED` / `STARTED` / `COMPLETE` (`IMP036G_IMPLEMENTATION_AUTHORIZED: YES`;
  `IMP036G_STARTED: YES`; `IMP036G_IMPLEMENTATION_COMPLETE: YES`; `IMP036G_ACCEPTED: NO`).
- Sets `pendingAcceptance = IMP-036G`. Preserves `acceptedThrough = IMP-036F`;
  `currentProductSlice` remains IMP-036G; `nextProductSlice` remains IMP-037 (`PLANNED` /
  `NOT_ACTIVATED` / `NOT_AUTHORIZED` / `NOT_STARTED`; `IMP037_ACTIVATED: NO`).
- Completion is **not** acceptance. Does **not** activate, authorize, or start IMP-037. Does
  **not** claim Founder UAT PASS (`IMP036G_FOUNDER_UAT_REQUIRED: YES`;
  `IMP036G_FOUNDER_UAT: NOT_PERFORMED`). Does **not** claim formal IMP acceptance
  (`IMP036G_ACCEPTED: NO`). Independent technical acceptance for UAT deployment remains
  `READY` (next pre-deployment gate). Manual technical validation required for implementation
  completion = PASS (`IMP036G_MANUAL_TECHNICAL_VALIDATION: PASS`; candidate
  `c35c9eab6a30ec6ce745cefd75c523181326f360` / tree `266fe3b07811f6942e76cac155d58ba07daabe56`;
  tester Ashutosh; date 2026-09-18; defects NONE). Founder UAT remains a separate later
  interactive human gate and is still `NOT_PERFORMED`.
- Evidence markers: `IMP036G_IMPLEMENTATION_EVIDENCE: COMPLETE`;
  `IMP_036G_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS`;
  `IMP036G_IMPLEMENTATION_MERGE_SHA: c35c9eab6a30ec6ce745cefd75c523181326f360`;
  `IMP036G_IMPLEMENTATION_TREE: 266fe3b07811f6942e76cac155d58ba07daabe56`;
  `IMP036G_REVIEWED_CANDIDATE_HEAD: 7a013155a98529d4527e7b6c0358642e5cd9d806`;
  `IMP036G_REVIEWED_CANDIDATE_TREE: 266fe3b07811f6942e76cac155d58ba07daabe56`;
  `IMP036G_EXACT_MAIN_CI: 35214215500`; `IMP036G_EXACT_MAIN_CI_RESULT: SUCCESS`.
- Preserves Product Definition Gate PASS / Architecture Fit PASS / architecture LOCKED for
  `PD-IMP-036G-DRAFT-2`. ARCH-R19 / DR-15 / PD-1 / TEST-1 / VISION-1 unchanged. No D-374 /
  ARCH-R20.
- Supersedes GTM-R128; the GTM-R128 implementation-start checkpoint remains historical tip
  predecessor at GTM-R128 / STATE-R126.

### GTM-R128 — 2026-09-17

- Persist explicit human implementation authorization **and** implementation start for IMP-036G as a
  bounded autonomous implementation sprint (`IMP036G_IMPLEMENTATION_AUTHORIZED: YES`;
  `IMP036G_STARTED: YES`).
- Sets formal IMP-036G ROADMAP lifecycle to `IMPLEMENTATION_IN_PROGRESS` and Current Product
  Implementation to `IMP-036G`.
- Preserves `acceptedThrough = IMP-036F`; `currentProductSlice = IMP-036G`;
  `pendingAcceptance = NONE`; `nextProductSlice = IMP-037`.
- Preserves `IMP036G_ARCHITECTURE_LOCKED: YES`, `IMP036G_ARCHITECTURE_FIT: PASS`, and Product
  Definition Gate PASS for `PD-IMP-036G-DRAFT-2`.
- Does **not** claim `IMPLEMENTATION_COMPLETE`, accept IMP-036G (`IMP036G_ACCEPTED: NO`), perform
  Founder UAT (`IMP036G_FOUNDER_UAT: NOT_PERFORMED`; `IMP036G_FOUNDER_UAT_REQUIRED: YES`), create
  D-374, create ARCH-R20, or activate IMP-037 (`IMP037_ACTIVATED: NO`).
- ARCH-R19 / DR-15 / PD-1 / TEST-1 / VISION-1 unchanged.
- Supersedes GTM-R127; the GTM-R127 architecture-lock checkpoint remains historical tip predecessor
  at GTM-R127 / STATE-R125.

### GTM-R127 — 2026-09-17

- Persist independently reviewed Architecture Fit PASS and lock IMP-036G capability architecture
  (`IMP036G_ARCHITECTURE_FIT: PASS`; `IMP036G_ARCHITECTURE_LOCKED: YES`).
- Fit-evaluated candidate: branch `main` head `386a245cde223d87c19742753130113b21b4bb2f` / tree
  `c4ef07bbd00bbbb964a9551b1d04d2fe140170b3` / fingerprint
  `e8eb68ebf06aea7ab50305f8e8700d450f9c5e9fd1ae24c91d4d81cfd157eb2c`; Fit date 2026-09-17;
  `INDEPENDENT_ARCHITECTURE_FIT_REVIEW: PASS`. Lock-persistence commit is not the evaluated artifact.
- Adds locked capability architecture
  [`capabilities/IMP-036G-administration-console-v2.md`](./capabilities/IMP-036G-administration-console-v2.md).
- Advances formal IMP-036G ROADMAP lifecycle to `ARCHITECTURE_LOCKED` while preserving
  `IMP036G_IMPLEMENTATION_AUTHORIZED: NO`; `IMP036G_STARTED: NO`; `IMP036G_ACCEPTED: NO`;
  `IMP036G_FOUNDER_UAT_REQUIRED: YES`; `IMP037_ACTIVATED: NO`.
- Preserves Product Definition Gate PASS for `PD-IMP-036G-DRAFT-2` and `acceptedThrough = IMP-036F`.
- Current Product Implementation remains `NONE`. Current governance activity: IMP-036G Architecture
  Fit PASS / capability architecture LOCKED; implementation authorization NOT_GRANTED.
- Does **not** authorize/start implementation, accept IMP-036G, perform Founder UAT, create D-374,
  create ARCH-R20, or activate IMP-037.
- ARCH-R19 / DR-15 / PD-1 / TEST-1 / VISION-1 unchanged.
- Supersedes GTM-R126.

### GTM-R126 — 2026-09-16

- Persist independently executed Product Definition Gate PASS for IMP-036G candidate
  `PD-IMP-036G-DRAFT-2` (`IMP036G_PRODUCT_DEFINITION: APPROVED`;
  `IMP036G_PRODUCT_DEFINITION_GATE: PASS`).
- Gate-evaluated candidate head `1fe1737d8f05d6069b2073d9faf1142d21b91970` / tree
  `25412cbadf224ef709687fe067f2427784a414cc`; gate date 2026-09-16; Founder / product governance
  human authority authorized PASS after independent pre-gate review PASS. Post-gate persistence
  commit is not the evaluated artifact.
- Preserves `acceptedThrough = IMP-036F`; `currentProductSlice = IMP-036G`;
  `pendingAcceptance = NONE`; `nextProductSlice = IMP-037`.
- Preserves `IMP036G_ACTIVATED: YES` while formal IMP-036G ROADMAP lifecycle remains `PLANNED`
  (`IMP036G_ARCHITECTURE_LOCKED: NO`; `IMP036G_IMPLEMENTATION_AUTHORIZED: NO`;
  `IMP036G_STARTED: NO`; `IMP036G_ACCEPTED: NO`; `IMP036G_FOUNDER_UAT_REQUIRED: YES`;
  `IMP036G_PRODUCT_DECISIONS: RESOLVED`; `IMP036G_PRODUCT_DECISION_COUNT: 7`).
- Preserves `IMP036G_ARCHITECTURE_FIT: NOT_PERFORMED`.
- Does **not** perform Architecture Fit, lock architecture, authorize/start implementation, accept
  IMP-036G, activate IMP-037, or authorize merge. Next phase = Architecture Fit (separate auth).
- ARCH-R19 / DR-15 / PD-1 / TEST-1 / VISION-1 unchanged.
- Supersedes GTM-R125.

### GTM-R125 — 2026-09-16

- Records IMP-036G Product Definition DRAFT-2 (`PD-IMP-036G-DRAFT-2`) after Founder product
  decisions resolve all seven formerly unresolved IMP-036G product gaps inside IMP-036G
  (subject-principal effective permissions; useful Overview; server-side audit filters;
  small-mobile high-consequence actions; Expire membership; scalable collection discoverability;
  hierarchy stale-write protection). Base main
  `475d0c46598c2bf512570469354b69a3d75b7817` / tree `4ee7687b0d77027caa67d6672eadc390c7c916f8`.
- Sets `IMP036G_PRODUCT_DEFINITION_VERSION: PD-IMP-036G-DRAFT-2`;
  `IMP036G_PRODUCT_DECISIONS: RESOLVED`; `IMP036G_PRODUCT_DECISION_COUNT: 7`;
  `IMP036G_PRODUCT_DECISION_AUTHORITY: Founder`; `IMP036G_PRODUCT_DECISION_DATE: 2026-09-16`.
- Preserves `acceptedThrough = IMP-036F`; `currentProductSlice = IMP-036G`;
  `pendingAcceptance = NONE`; `nextProductSlice = IMP-037`.
- Preserves `IMP036G_PRODUCT_DEFINITION: DRAFT`; `IMP036G_PRODUCT_DEFINITION_GATE: NOT_PERFORMED`;
  `IMP036G_ARCHITECTURE_FIT: NOT_PERFORMED`; `IMP036G_ACTIVATED: YES` while formal IMP-036G
  ROADMAP lifecycle remains `PLANNED` (`IMP036G_ARCHITECTURE_LOCKED: NO`;
  `IMP036G_IMPLEMENTATION_AUTHORIZED: NO`; `IMP036G_STARTED: NO`; `IMP036G_ACCEPTED: NO`;
  `IMP036G_FOUNDER_UAT_REQUIRED: YES`).
- Does **not** execute Product Definition Gate, perform Architecture Fit, lock architecture,
  authorize/start implementation, accept IMP-036G, or activate IMP-037.
- ARCH-R19 / DR-15 / PD-1 / TEST-1 / VISION-1 unchanged.
- Supersedes GTM-R124.

### GTM-R124 — 2026-09-16

- Records IMP-036G pre-gate Product Definition draft `PD-IMP-036G-DRAFT-1` after ANCHOR → DISCOVER
  → STORY_MAP on activated IMP-036G (GTM-R123 / STATE-R121; base main
  `e067febf113fe21eebe1c1a3f3be24cbe23dd1f8`).
- Preserves `acceptedThrough = IMP-036F`; `currentProductSlice = IMP-036G`;
  `pendingAcceptance = NONE`; `nextProductSlice = IMP-037`.
- Sets `IMP036G_PRODUCT_DEFINITION: DRAFT`; `IMP036G_PRODUCT_DEFINITION_VERSION: PD-IMP-036G-DRAFT-1`;
  `IMP036G_PRODUCT_DEFINITION_GATE: NOT_PERFORMED`; `IMP036G_ARCHITECTURE_FIT: NOT_PERFORMED`.
- Preserves `IMP036G_ACTIVATED: YES` while formal IMP-036G ROADMAP lifecycle remains `PLANNED`
  (`IMP036G_ARCHITECTURE_LOCKED: NO`; `IMP036G_IMPLEMENTATION_AUTHORIZED: NO`;
  `IMP036G_STARTED: NO`; `IMP036G_ACCEPTED: NO`; `IMP036G_FOUNDER_UAT_REQUIRED: YES`).
- Does **not** execute Product Definition Gate, perform Architecture Fit, lock architecture,
  authorize/start implementation, accept IMP-036G, or activate IMP-037.
- ARCH-R19 / DR-15 / PD-1 / TEST-1 / VISION-1 unchanged.
- Supersedes GTM-R123.

### GTM-R123 — 2026-09-16

- ADVANCE / activate IMP-036G — Administration Console V2 as CURRENT product slice after accepted
  and reconciled IMP-036F (GTM-R122 / STATE-R120; base main
  `5417cb5b53e5aa64f1841604b9ef96cfc37327de`).
- Sets `currentProductSlice = IMP-036G`; `pendingAcceptance = NONE`; `nextProductSlice = IMP-037`.
- Preserves `acceptedThrough = IMP-036F`; IMP-036F remains `COMPLETE_AND_ACCEPTED`.
- Records `IMP036G_ACTIVATED: YES` while formal IMP-036G ROADMAP lifecycle remains `PLANNED`
  (`IMP036G_ARCHITECTURE_LOCKED: NO`; `IMP036G_IMPLEMENTATION_AUTHORIZED: NO`;
  `IMP036G_STARTED: NO`; `IMP036G_ACCEPTED: NO`; `IMP036G_PRODUCT_DEFINITION: NOT_CREATED`;
  `IMP036G_FOUNDER_UAT_REQUIRED: YES`).
- PD-1 applies prospectively; does **not** create Product Definition, pass Product Definition Gate,
  lock architecture, authorize/start implementation, or activate IMP-037.
- ARCH-R19 / DR-15 / PD-1 / TEST-1 / VISION-1 unchanged.
- Supersedes GTM-R122.

### GTM-R122 — 2026-09-15

- Formal acceptance of IMP-036F — Catalog, Menu, Pricing & Promotions Management after Founder UAT
  PASS.
- Accepted UAT product candidate remains `91d0b5e5e5815da6bf0bb325a3c6ab884dc06652` / tree
  `ab41fc7f2bf6d0a52c3ea6c2b69ed331ca9540cf` (fingerprint
  `c689630cb9a4d002fda3376f949a1f324015776d392abfd2abde7b6f5b91f973`; exact-main CI
  `34991901136` SUCCESS). Governance reconciliation is not a new product candidate.
- Advances `acceptedThrough = IMP-036F`; sets `currentProductSlice = NONE` and
  `pendingAcceptance = NONE`; preserves `nextProductSlice = IMP-036G`.
- Records `IMP-036F: COMPLETE_AND_ACCEPTED`; `IMP036F_ACCEPTED: YES`; `IMP036F_FOUNDER_UAT: PASS`;
  `IMP036F_FORMAL_ACCEPTANCE: ACCEPTED`; `IMP036F_IMPLEMENTATION_COMPLETE: YES`.
- Preserves Product Definition `PD-IMP-036F-DRAFT-1` (Gate PASS; Architecture Fit PASS).
- Preserves F6A/F6B/post-merge audit PR provenance and critical post-merge persistence audit PASS.
- Preserves IMP-036E acceptance evidence unchanged.
- IMP-036G remains `PLANNED` / `NOT_ACTIVATED` / `NOT_AUTHORIZED` / `NOT_STARTED`
  (`IMP036G_ACTIVATED: NO`). No ADVANCE.
- ARCH-R19 / DR-15 / D-374 / ARCH-R20 unchanged (no new binding semantics).
- Supersedes GTM-R121.

### GTM-R121 — 2026-09-11

- Persist IMP-036F implementation start after Founder/human execution authorization for workstream
  F1 (catalog ENTITY_CONTENT_REVISION publication model).
- Sets formal IMP-036F ROADMAP lifecycle to `IMPLEMENTATION_IN_PROGRESS`
  (`IMP036F_IMPLEMENTATION_AUTHORIZED: YES`; `IMP036F_STARTED: YES`).
- Preserves `acceptedThrough = IMP-036E`; `currentProductSlice = IMP-036F`;
  `pendingAcceptance = NONE`; `nextProductSlice = IMP-036G`.
- Does **not** claim IMPLEMENTATION_COMPLETE or ACCEPTED. Does **not** activate IMP-036G.
- Schema migration `0037_hesitant_scorpion` and catalog revision domain work accompany this start.
- Supersedes GTM-R120 authorization-only tip checkpoint; authorization remains historical at
  GTM-R120 / STATE-R118.

### GTM-R120 — 2026-09-10

- Persist IMP-036F implementation authorization after Implementation Authorization Gate PASS
  (PR #141 issue comment `5622858455`).
- Authorization applies to locked Product Definition `PD-IMP-036F-DRAFT-1` (APPROVED / Gate PASS)
  and locked capability architecture
  [`capabilities/IMP-036F-catalog-menu-pricing-promotions-management.md`](./capabilities/IMP-036F-catalog-menu-pricing-promotions-management.md).
- Sets formal IMP-036F ROADMAP lifecycle to `ARCHITECTURE_LOCKED` / `AUTHORIZED` / `NOT_STARTED`
  (`IMP036F_IMPLEMENTATION_AUTHORIZED: YES`; `IMP036F_STARTED: NO`).
- Preserves `acceptedThrough = IMP-036E`; `currentProductSlice = IMP-036F`;
  `pendingAcceptance = NONE`; `nextProductSlice = IMP-036G`.
- Preserves `IMP036F_ACTIVATED: YES`; `IMP036F_PRODUCT_DEFINITION: APPROVED`;
  `IMP036F_PRODUCT_DEFINITION_GATE: PASS`; `IMP036F_ARCHITECTURE_FIT: PASS`;
  `IMP036F_ARCHITECTURE_LOCKED: YES`; `IMP036F_ACCEPTED: NO`; `IMP036F_FOUNDER_UAT_REQUIRED: YES`;
  `IMP036G_ACTIVATED: NO`.
- No implementation accompanies GTM-R120. Schema design remains locked; migration execution has not
  started. IMP-036F not accepted. IMP-036G not activated. D-374 remains absent/not required;
  ARCH-R20 remains absent/not required; ARCH-R19 / DR-15 preserved.
- Does **not** start implementation, accept IMP-036F, activate IMP-036G, or authorize merge.
  `AUTHORIZED` + `NOT_STARTED` ≠ `IMPLEMENTATION_IN_PROGRESS`. Next gate = explicit implementation
  start / execution authorization (after merge/reconciliation).
- VISION-1 / PD-1 / TEST-1 unchanged.
- Supersedes GTM-R119.

### GTM-R119 — 2026-09-10

- Persist independently reviewed IMP-036F Architecture Fit PASS and lock capability architecture.
- Reviewed Architecture Fit candidate head `9ae06d6267e997223b1995124540974215ee17fd` / tree
  `55adb287bb0eb77240a6becdc16fed2d504ba144`; independent review `5169723968` PASS; exact-head CI
  run `34501448266` SUCCESS. Lock date 2026-09-10.
- Locked capability artifact:
  [`capabilities/IMP-036F-catalog-menu-pricing-promotions-management.md`](./capabilities/IMP-036F-catalog-menu-pricing-promotions-management.md).
- Sets formal IMP-036F ROADMAP lifecycle to `ARCHITECTURE_LOCKED` / `NOT_AUTHORIZED` / `NOT_STARTED`
  (`IMP036F_ARCHITECTURE_FIT: PASS`; `IMP036F_ARCHITECTURE_LOCKED: YES`).
- Preserves `acceptedThrough = IMP-036E`; `currentProductSlice = IMP-036F`;
  `pendingAcceptance = NONE`; `nextProductSlice = IMP-036G`.
- Preserves `IMP036F_ACTIVATED: YES`; `IMP036F_PRODUCT_DEFINITION: APPROVED`;
  `IMP036F_PRODUCT_DEFINITION_GATE: PASS`; `IMP036F_IMPLEMENTATION_AUTHORIZED: NO`;
  `IMP036F_STARTED: NO`; `IMP036F_ACCEPTED: NO`; `IMP036F_FOUNDER_UAT_REQUIRED: YES`;
  `IMP036G_ACTIVATED: NO`.
- Architecture Fit performed and PASS. Capability architecture locked. Implementation remains
  NOT_AUTHORIZED / NOT_STARTED. No schema migration or implementation occurred. IMP-036F not
  accepted. IMP-036G not activated. D-374 not required/not created; ARCH-R20 not required/not
  created; ARCH-R19 / DR-15 preserved.
- Does **not** authorize/start implementation, accept IMP-036F, activate IMP-036G, or authorize
  merge. Next gate = explicit implementation authorization (after merge/reconciliation).
- VISION-1 / PD-1 / TEST-1 unchanged.
- Supersedes GTM-R118.

### GTM-R118 — 2026-09-10

- Persist independently executed Product Definition Gate PASS for IMP-036F candidate
  `PD-IMP-036F-DRAFT-1` (`IMP036F_PRODUCT_DEFINITION: APPROVED`;
  `IMP036F_PRODUCT_DEFINITION_GATE: PASS`).
- Gate-evaluated content SHA `014e0f935f193f54718d6afd5e7991508088f9bc`; durable PR #140 review
  `5166877450`; gate date 2026-09-10. Post-gate persistence commit is not the evaluated artifact.
- Preserves `acceptedThrough = IMP-036E`; `currentProductSlice = IMP-036F`;
  `pendingAcceptance = NONE`; `nextProductSlice = IMP-036G`.
- Preserves `IMP036F_ACTIVATED: YES` while formal IMP-036F ROADMAP lifecycle remains `PLANNED`
  (`IMP036F_ARCHITECTURE_LOCKED: NO`; `IMP036F_IMPLEMENTATION_AUTHORIZED: NO`;
  `IMP036F_STARTED: NO`; `IMP036F_ACCEPTED: NO`; `IMP036F_FOUNDER_UAT_REQUIRED: YES`).
- Does **not** perform Architecture Fit, lock architecture, authorize/start implementation, accept
  IMP-036F, activate IMP-036G, or authorize merge. Next phase = Architecture Fit (separate auth).
- ARCH-R19 / DR-15 / PD-1 / TEST-1 / VISION-1 unchanged.
- Supersedes GTM-R117.

### GTM-R117 — 2026-09-10

- Post-discovery governance advance for IMP-036F: authorize STORY_MAP + Product Definition drafting
  after DISCOVER (`IMP036F_PRODUCT_DEFINITION: DRAFT_AUTHORIZED`;
  `IMP036F_PRODUCT_DEFINITION_GATE: NOT_PERFORMED`).
- Preserves `acceptedThrough = IMP-036E`; `currentProductSlice = IMP-036F`;
  `pendingAcceptance = NONE`; `nextProductSlice = IMP-036G`.
- Preserves `IMP036F_ACTIVATED: YES` while formal IMP-036F ROADMAP lifecycle remains `PLANNED`
  (`IMP036F_ARCHITECTURE_LOCKED: NO`; `IMP036F_IMPLEMENTATION_AUTHORIZED: NO`;
  `IMP036F_STARTED: NO`; `IMP036F_ACCEPTED: NO`; `IMP036F_FOUNDER_UAT_REQUIRED: YES`).
- Does **not** create a Product Definition on canonical main, pass Product Definition Gate, lock
  architecture, authorize/start implementation, or activate IMP-036G.
- ARCH-R19 / DR-15 / PD-1 / TEST-1 / VISION-1 unchanged (PD-1 lastReviewed clarification only for
  pre-gate draft semantics).
- Supersedes GTM-R116.

### GTM-R116 — 2026-09-10

- ADVANCE / activate IMP-036F — Catalog, Menu, Pricing & Promotions Management as CURRENT product
  slice after accepted and reconciled IMP-036E (GTM-R115 / STATE-R113; base main
  `4c0ec4ffd9d614c9854b3d8747ebc566bdd713fc`).
- Sets `currentProductSlice = IMP-036F`; `pendingAcceptance = NONE`; `nextProductSlice = IMP-036G`.
- Preserves `acceptedThrough = IMP-036E`; IMP-036E remains `COMPLETE_AND_ACCEPTED`.
- Records `IMP036F_ACTIVATED: YES` while formal IMP-036F ROADMAP lifecycle remains `PLANNED`
  (`IMP036F_ARCHITECTURE_LOCKED: NO`; `IMP036F_IMPLEMENTATION_AUTHORIZED: NO`;
  `IMP036F_STARTED: NO`; `IMP036F_ACCEPTED: NO`; `IMP036F_PRODUCT_DEFINITION: NOT_CREATED`;
  `IMP036F_FOUNDER_UAT_REQUIRED: YES`).
- PD-1 applies prospectively; does **not** create Product Definition, pass Product Definition Gate,
  lock architecture, authorize/start implementation, or activate IMP-036G.
- ARCH-R19 / DR-15 / PD-1 / TEST-1 / VISION-1 unchanged.
- Supersedes GTM-R115.

### GTM-R115 — 2026-09-10

- Formal acceptance of IMP-036E — Store Operations Management after Founder UAT PASS.
- Accepted UAT product candidate remains `05c534bac3d077f5ab89928495568bb63faf78df` / tree
  `55b28977ee9860c2c07cb25f751c9f48ef4a2aa6` (PR #135). Governance reconciliation is not a new
  product candidate.
- Advances `acceptedThrough = IMP-036E`; sets `currentProductSlice = NONE` and
  `pendingAcceptance = NONE`; preserves `nextProductSlice = IMP-036F`.
- Records `IMP-036E: COMPLETE_AND_ACCEPTED`; `IMP-036E_ACCEPTED: YES`; `IMP-036E_FOUNDER_UAT: PASS`;
  `IMP036E_FORMAL_ACCEPTANCE: ACCEPTED`; `IMP036E_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED`.
- Preserves implementation/review SHAs distinct from the accepted UAT candidate.
- Preserves intermediate Founder-staging candidate `e9821271…` as historical staging evidence only.
- Preserves initial paused-state Serviceability observation and post-Resume recovery PASS on the
  same accepted candidate.
- IMP-036F remains `PLANNED` / `NOT_ACTIVATED` / `NOT_AUTHORIZED` / `NOT_STARTED`
  (`IMP036F_ACTIVATED: NO`). No ADVANCE.
- ARCH-R19 / DR-15 / D-374 / ARCH-R20 unchanged (no new binding semantics).
- Supersedes GTM-R114.

### GTM-R114 — 2026-09-07

- `CANONICAL_AUTHORITY_CONTEXT_COMPRESSION_ONLY`.
- Creates exact historical snapshot
  [`history/ROADMAP-GTM-R113-pre-compression.md`](./history/ROADMAP-GTM-R113-pre-compression.md)
  from source commit `33a226a18e4e9428c07233990d026541418f0860` (blob
  `35a58c93095713c173f0b1e455125bd6854a34b8`).
- Compresses CURRENT ROADMAP hot context. No product lifecycle change.
- Preserves `acceptedThrough = IMP-036D`; `currentProductSlice = IMP-036E`;
  `pendingAcceptance = IMP-036E`; `nextProductSlice = IMP-036F`.
- IMP-036E remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` / `IMP-036E_ACCEPTED: NO` /
  Founder UAT `NOT_STARTED`.
- IMP-036F remains `PLANNED` / `NOT_ACTIVATED` / `NOT_AUTHORIZED` / `NOT_STARTED`.
- Supersedes GTM-R113 for CURRENT authority presentation only.

## 10. Authority Boundaries

| Question | Authority |
|---|---|
| IMP identity / sequence / GTM boundary | **This document (`ROADMAP.md`)** |
| Accepted reality | [`STATE.md`](./STATE.md) |
| Historical ROADMAP evidence | [`history/ROADMAP-GTM-R113-pre-compression.md`](./history/ROADMAP-GTM-R113-pre-compression.md) |
| Product purpose / Non-Goals | [`VISION.md`](./VISION.md) |
| Durable architecture | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| Binding decisions | [`decision-register.md`](./decision-register.md) |
| IMP-036E capability architecture | [`capabilities/IMP-036E-store-operations-management.md`](./capabilities/IMP-036E-store-operations-management.md) |
| IMP-036D capability architecture | [`capabilities/IMP-036D-workforce-franchise-operations-v2.md`](./capabilities/IMP-036D-workforce-franchise-operations-v2.md) |

Operating lifecycle:

```text
ANCHOR → GATE → EXECUTE → PROVE → ACCEPT → RECONCILE → ADVANCE
```

The CLOSED IMP-026 → IMP-028 continuation exception does not apply automatically to unrelated
future slices. Current lifecycle is owned by CURRENT metadata above.
