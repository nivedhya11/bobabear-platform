<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "IMPLEMENTATION_SEQUENCE",
  "roadmapVersion": "GTM-R114",
  "acceptedThrough": "IMP-036D",
  "currentProductSlice": "IMP-036E",
  "nextProductSlice": "IMP-036F",
  "gtmBoundary": "IMP-040",
  "lastReviewed": "2026-09-07",
  "supersedes": "GTM-R113"
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

Current product-slice locked artifact (IMP-036E; architecture **ARCHITECTURE_LOCKED**;
implementation **AUTHORIZED** / **STARTED** / **COMPLETE**; lifecycle
**IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE**):

[`capabilities/IMP-036E-store-operations-management.md`](./capabilities/IMP-036E-store-operations-management.md)

Immediately prior accepted locked artifact (IMP-036D; `COMPLETE_AND_ACCEPTED`):

[`capabilities/IMP-036D-workforce-franchise-operations-v2.md`](./capabilities/IMP-036D-workforce-franchise-operations-v2.md)

Earlier accepted capability artifacts remain under `capabilities/` and in the historical ROADMAP
snapshot. `ARCHITECTURE_LOCKED` remains the retained lock vocabulary for accepted capabilities.

## 2. Current Position

```text
Accepted Through:     IMP-036D — Workforce & Franchise Operations Portal V2
Current Product Slice: IMP-036E — Store Operations Management
Next Product Slice:    IMP-036F — Catalog, Menu, Pricing & Promotions Management
Pending Acceptance:    IMP-036E
Public GTM Boundary:   IMP-040 — Launch Validation & Cutover
```

```text
IMP-036E: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
IMP-036E_ARCHITECTURE: LOCKED
IMP-036E_ARCHITECTURE_LOCKED: YES
IMP-036E_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-036E_IMPLEMENTATION_AUTHORIZED: YES
IMP-036E_STARTED: YES
IMP-036E_IMPLEMENTATION_COMPLETE: YES
IMP-036E_ACCEPTED: NO
IMP-036E_FOUNDER_UAT_REQUIRED: YES
IMP-036E_FOUNDER_UAT: NOT_STARTED / NOT_PERFORMED
FOUNDER_STAGING_DEPLOYMENT: PERFORMED
FOUNDER_STAGING_STATUS: READY_FOR_FOUNDER_UAT
FOUNDER_STAGING_CANDIDATE_SHA: e9821271a29ae35ba6c921008b976cd2e8d15c50
FOUNDER_STAGING_CANDIDATE_TREE: 8259d30f662e6668f2208788f2e95faaea831384
IMP036E_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_036E_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP036E_IMPLEMENTATION_MERGE_SHA: 0ebb5e937cd7ac14bb3e39e9d1d494e32c9d2739
IMP036E_IMPLEMENTATION_TREE: 0def59ce9bcab4575a7b43b7c3c07c85ac575428
IMP036E_REVIEWED_CANDIDATE_HEAD: b2ffaa5bc2b5c6f58ff5241c226b583160132837
IMP036E_REVIEWED_CANDIDATE_TREE: 0def59ce9bcab4575a7b43b7c3c07c85ac575428
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
IMP-036F: PLANNED / NOT_ACTIVATED / NOT_AUTHORIZED / NOT_STARTED
IMP-036D: COMPLETE_AND_ACCEPTED
IMP-036D_ARCHITECTURE_LOCKED: YES
IMP-036D_ACCEPTED: YES
IMP-036D_FOUNDER_UAT: PASS
```

Completion is **not** acceptance. Locked capability architecture:
[`capabilities/IMP-036E-store-operations-management.md`](./capabilities/IMP-036E-store-operations-management.md).
Preferred Store Assortment read route:
`GET /api/operations/v1/outlets/{outletId}/assortment`. ARCH-R19 and DR-15 remain unchanged.
GitHub Pages is not Founder staging/UAT evidence. Founder staging deployment was performed
(`FOUNDER_STAGING_DEPLOYMENT: PERFORMED`; `FOUNDER_STAGING_STATUS: READY_FOR_FOUNDER_UAT`;
candidate SHA `e9821271a29ae35ba6c921008b976cd2e8d15c50` / tree
`8259d30f662e6668f2208788f2e95faaea831384`). Founder UAT remains `NOT_STARTED` /
`NOT_PERFORMED`. Later governance-only commits after that candidate are not the deployed
Founder-UAT product candidate. Does **not** activate IMP-036F.

IMP-036D remains `COMPLETE_AND_ACCEPTED`. Concise acceptance identity: UAT candidate HEAD
`a6ff612c65e0d58409017b2935e0da16cffa9530` / tree `6580497091525c3ddd892aa44aafd63ef1132d35`
(GTM-R108). Detailed candidate/failure/reconciliation evidence remains in
[`history/ROADMAP-GTM-R113-pre-compression.md`](./history/ROADMAP-GTM-R113-pre-compression.md) and
[`capabilities/IMP-036D-workforce-franchise-operations-v2.md`](./capabilities/IMP-036D-workforce-franchise-operations-v2.md).

**GTM-R114** is `CANONICAL_AUTHORITY_CONTEXT_COMPRESSION_ONLY`. It does **not** mean product
acceptance, slice activation, architecture progression, implementation authorization, deployment,
or a new product decision. `acceptedThrough` / `currentProductSlice` / `pendingAcceptance` /
`nextProductSlice` are unchanged from GTM-R113.

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

## 4. Current Product Slice

IMP-036E — Store Operations Management is `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` with
architecture `ARCHITECTURE_LOCKED` and implementation `AUTHORIZED` / `STARTED` / `COMPLETE`
(`IMP-036E_ARCHITECTURE_LOCKED: YES`; `IMP-036E_IMPLEMENTATION_AUTHORIZED: YES`;
`IMP-036E_STARTED: YES`; `IMP-036E_IMPLEMENTATION_COMPLETE: YES`; `IMP-036E_ACCEPTED: NO`).
Completion is **not** acceptance. Founder UAT remains required and has not been performed
(`IMP-036E_FOUNDER_UAT_REQUIRED: YES`; `IMP-036E_FOUNDER_UAT: NOT_STARTED`). Locked capability
architecture:
[`capabilities/IMP-036E-store-operations-management.md`](./capabilities/IMP-036E-store-operations-management.md).
Supporting experience contract:
[`experience/enterprise-experience/IMP-036E-store-operations-management.md`](./experience/enterprise-experience/IMP-036E-store-operations-management.md)
(SUPPORTING; must not override the capability lock). Founder Option A locks Assortment as Brand
authority (`IMP036E_ASSORTMENT_AUTHORITY: BRAND`). Serviceability remains
`OUTLET_DISTANCE_SERVICEABILITY_V1` (`SERVICEABILITY_COORDINATE_AUTHORITY: YES`;
`SERVICEABILITY_POSTAL_PIN_RUNTIME_AUTHORITY: NO`; `SERVICEABILITY_MAP_IS_PROJECTION_ONLY: YES`;
`IMP036E_SERVICEABILITY_ROUTING_PRIORITY_UI: HIDDEN_PREREQUISITE`). Global session capability
booleans are coarse navigation only (`IMP036E_GLOBAL_SESSION_CAPS_ARE_RESOURCE_AUTHORITY: NO`;
`IMP036E_GLOBAL_SESSION_CAPS_PURPOSE: COARSE_NAVIGATION_ONLY`;
`IMP036E_RESOURCE_SCOPED_CONTROL_VISIBILITY: REQUIRED`;
`IMP036E_SERVER_AUTHORIZATION_REMAINS_AUTHORITATIVE: YES`). `acceptedThrough` remains IMP-036D;
`pendingAcceptance` is IMP-036E; `nextProductSlice` is IMP-036F (`PLANNED` / `NOT_ACTIVATED` /
`NOT_AUTHORIZED` / `NOT_STARTED`). ARCH-R19 and DR-15 remain unchanged;
`SCHEMA_CHANGE_REQUIRED: NO`; `NEW_PERMISSION: NO`; `NEW_ROLE: NO`; `NEW_SCOPE_MODEL: NO`;
`D374_REQUIRED_FOR_IMP036E_LOCK: NO`; `D-374_CREATED: NO`; `ARCH_R20_REQUIRED_FOR_IMP036E_LOCK: NO`;
`ARCH_R20_CREATED: NO`.

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
| IMP-036E | Store Operations Management | IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE |
| IMP-036F | Catalog, Menu, Pricing & Promotions Management | PLANNED / NOT_ACTIVATED / NOT_AUTHORIZED / NOT_STARTED |
| IMP-036G | Administration Console V2 | PLANNED / NOT_ACTIVATED / NOT_AUTHORIZED / NOT_STARTED |
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
IMP-036A → IMP-036D: COMPLETE_AND_ACCEPTED
IMP-036E: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
IMP-036F → IMP-036G: PLANNED / NOT_ACTIVATED / NOT_AUTHORIZED / NOT_STARTED
FOUNDER_UAT_REQUIRED: YES for each Enterprise Experience slice
```

Programme contracts for remaining planned slices:

- [IMP-036F — Catalog, Menu, Pricing & Promotions Management](./experience/enterprise-experience/IMP-036F-catalog-menu-pricing-promotions.md)
- [IMP-036G — Administration Console V2](./experience/enterprise-experience/IMP-036G-administration-console-v2.md)

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
