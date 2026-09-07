<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "ACCEPTED_STATE",
  "stateVersion": "STATE-R112",
  "acceptedThrough": "IMP-036D",
  "currentProductSlice": "IMP-036E",
  "nextProductSlice": "IMP-036F",
  "pendingAcceptance": "IMP-036E",
  "governanceHealth": "ALIGNED",
  "lastReviewed": "2026-09-07"
}
-->

# BOBA Bear — Accepted State

Coding-agent completion does **not** equal acceptance. This document is the independently accepted
current-reality authority.

Historical STATE evidence through STATE-R111 is preserved byte-for-byte in
[`history/STATE-STATE-R111-pre-compression.md`](./history/STATE-STATE-R111-pre-compression.md).
Do not infer current lifecycle from that snapshot.

## 1. Accepted Position

```text
Accepted Through:          IMP-036D — Workforce & Franchise Operations Portal V2
Accepted Inserted Slice:   IMP-005A — Dockerized local application runtime; IMP-026C — Pilot Customer-Commerce UX Hardening; IMP-028A — Food Direct UX Foundation; IMP-028B — Customer Menu Projection + Discovery; IMP-028C — Food Customization; IMP-028D — Desktop Ordering Continuity
Accepted Range:            IMP-001 → IMP-036D (including IMP-005A and IMP-026C)
```

## 2. Current Work Position

```text
Current Product Implementation: IMP-036E — Store Operations Management
Pending Acceptance:             IMP-036E
Current Product Slice:          IMP-036E — Store Operations Management
Next Product Slice:             IMP-036F — Catalog, Menu, Pricing & Promotions Management
Current Governance Activity:    IMP-036E IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE;
                              Founder UAT required / not yet performed;
                              IMP-036D COMPLETE_AND_ACCEPTED;
                              IMP-036F/G and IMP-037 remain PLANNED / NOT_ACTIVATED /
                              NOT_AUTHORIZED / NOT_STARTED.
Governance Health:              ALIGNED
```

```text
IMP-036D:                 COMPLETE_AND_ACCEPTED
IMP-036D_ARCHITECTURE_LOCKED: YES
IMP-036D_ACCEPTED:        YES
IMP-036D_FOUNDER_UAT:     PASS
IMP-036E:                 IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
IMP-036E_ARCHITECTURE:    LOCKED
IMP-036E_ARCHITECTURE_LOCKED: YES
IMP-036E_IMPLEMENTATION:  AUTHORIZED / STARTED / COMPLETE
IMP-036E_IMPLEMENTATION_AUTHORIZED: YES
IMP-036E_STARTED:         YES
IMP-036E_IMPLEMENTATION_COMPLETE: YES
IMP-036E_ACCEPTED:        NO
IMP-036E_FOUNDER_UAT_REQUIRED: YES
IMP-036E_FOUNDER_UAT:     NOT_STARTED
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
IMP-036F:                 PLANNED / NOT_ACTIVATED / NOT_AUTHORIZED / NOT_STARTED
IMP036F_ACTIVATED:        NO
```

Locked capability architecture:
[`capabilities/IMP-036E-store-operations-management.md`](./capabilities/IMP-036E-store-operations-management.md).
Architecture versions remain ARCH-R19 / DR-15. Detailed accepted-slice marker inventories for
IMP-024…IMP-036D remain in the historical STATE snapshot and capability/acceptance artifacts.

## 3. Accepted Technical Inventory

Independently verified from repository evidence on 2026-08-18 (authority path
`/home/ajoshi/repos/boba-bear-website-acceptance`), including IMP-026, IMP-027, IMP-028, and
IMP-028A independent acceptance.
Speculative values are forbidden here.

| Metric | Verified value | How verified |
|---|---|---|
| Latest migration | `0029_refund_statutory_issuance_allocation` | `drizzle/meta/_journal.json` entry tag; `drizzle/0029_refund_statutory_issuance_allocation.sql` present |
| Migration count | `30` | Count of accepted migrations through IMP-028 (0000–0029) |
| Application tables | `108` | Count of `appSchema.table(` declarations under `src/platform/database/schema/` bounded to accepted IMP-028 schema |
| Workforce permissions | `57` | `PERMISSION_KEYS.length` in `src/shared/access-control/catalog.ts` |
| System roles | `7` | `ROLE_KEYS.length` in `src/shared/access-control/catalog.ts` |
| Default Docker services | `5` | Compose services without `profiles: ["tools"]`: `postgres`, `app`, `customer-auth`, `workforce-auth`, `customer-commerce` |
| Order-owned tables | `1` | `orders` in `src/platform/database/schema/order.ts` |
| Order snapshot/history tables | `0` | No additional Order snapshot/event tables in schema |
| IMP-023 new production runtime dependencies | `0` | No Order-domain production dependency addition beyond prior accepted baseline |
| IMP-026 new production runtime dependencies | `0` | Razorpay adapter behind existing `PaymentProvider`; no new deployable service |
| Payment provider event inbox table | `1` | `payment_provider_event_inbox` in `src/platform/database/schema/payment.ts` |
| Public web mode | Next.js static export → Nginx | `next.config.ts` `output: "export"`; `docker/nginx/nginx.conf`; no production `src/app/api` commerce tree |
| IMP-024 architecture artifact | present | `docs/platform/capabilities/IMP-024-customer-ordering-transport.md` |
| IMP-024 runtime Compose service | present | `customer-commerce` internal `:8083`; Nginx `/api/v1/*` (D-359) |
| IMP-025 architecture artifact | present | `docs/platform/capabilities/IMP-025-customer-ordering-ux.md` |
| IMP-025 static ordering catalog | present | `src/data/ordering-catalog.json` deterministic projection from existing-menu-v1; retained for legitimate transitional/import/test purposes, not the customer storefront runtime source |
| IMP-026 architecture artifact | present | `docs/platform/capabilities/IMP-026-razorpay-productionization.md` |
| IMP-026 payment inbox migration | `0018_payment_provider_event_inbox` | `drizzle/0018_payment_provider_event_inbox.sql` present in accepted journal |
| IMP-026C architecture artifact | present | `docs/platform/capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md` |
| IMP-027 architecture artifact | present | `docs/platform/capabilities/IMP-027-refund-foundation.md` |
| IMP-027 refund migration | `0019_refund` | `drizzle/0019_refund.sql` present in accepted journal |
| IMP-028 architecture artifact | present | `docs/platform/capabilities/IMP-028-invoice-tax-receipt-credit-note.md` |
| IMP-028 financial-document / statutory migrations | `0020`–`0029` | Journal tags `0020_financial_document` through `0029_refund_statutory_issuance_allocation` |
| IMP-028A architecture artifact | present | `docs/platform/capabilities/IMP-028A-food-direct-ux-foundation.md` |
| IMP-028B canonical capability artifact | present | `docs/platform/capabilities/IMP-028B-customer-menu-projection-and-discovery.md` |

Default Docker topology (accepted runtime inventory):

```text
postgres
app
customer-auth
workforce-auth
customer-commerce
```

Accepted IMP-024 transport (D-359):

```text
customer-commerce   (internal :8083; Nginx /api/v1/*)
```

Domain authority chain (accepted):

```text
Cart → Checkout → Payment → Order
(+ Refund; + Financial Document / RefundStatutoryDecision / SignatureArtifact)
```

| Domain | Authority |
|---|---|
| Cart | Mutable shopping intent |
| Checkout Snapshot | Immutable accepted commercial transaction |
| Payment | Original financial collection truth |
| Order | Post-purchase business lifecycle truth (`PLACED` \| `ACCEPTED` \| `FULFILLED` \| `CANCELLED`) |
| Refund | Financial reversal truth for returned funds (D-364) |
| Financial Document | Immutable issued statutory / financial-document truth (D-365) |
| RefundStatutoryDecision | Durable statutory-reversal classification for a PROCESSED Refund (D-366) |
| SignatureArtifact | Durable signature state and exact-byte signed statutory artifact (D-367) |
| Customer Menu Projection | CURRENT storefront READ MODEL (D-368); implemented and accepted under IMP-028B; not a new commercial authority |
| Customer paid-modifier purchase intent | CURRENT policy (D-369); positive-price modifier requires explicit current-interaction selection; implementation authorized only for IMP-028C; live import `modifier_groups: 0` |
| Cart identity transition | CURRENT policy (D-370); guest→customer compatible merge and logout customer-cart isolation; implementation not authorized |
## 4. Accepted Capability Ledger

| IMP | Capability | Status |
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

## 5. Acceptance Position

```text
acceptedThrough: IMP-036D
pendingAcceptance: IMP-036E
currentProductSlice: IMP-036E
nextProductSlice: IMP-036F — Catalog, Menu, Pricing & Promotions Management
IMP-036D: COMPLETE_AND_ACCEPTED
IMP-036D_ACCEPTED: YES
IMP-036D_FOUNDER_UAT: PASS
IMP-036E: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
IMP-036E_ARCHITECTURE: LOCKED
IMP-036E_ARCHITECTURE_LOCKED: YES
IMP-036E_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-036E_IMPLEMENTATION_AUTHORIZED: YES
IMP-036E_STARTED: YES
IMP-036E_IMPLEMENTATION_COMPLETE: YES
IMP-036E_ACCEPTED: NO
IMP-036E_FOUNDER_UAT_REQUIRED: YES
IMP-036E_FOUNDER_UAT: NOT_STARTED
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
IMP-036F: PLANNED / NOT_ACTIVATED / NOT_AUTHORIZED / NOT_STARTED
IMP036F_ACTIVATED: NO
architectureVersion: ARCH-R19
decisionRegisterVersion: DR-15
```

Detailed per-accepted-IMP marker inventories, SHA/tree/UAT histories, and closed progression
narratives remain in
[`history/STATE-STATE-R111-pre-compression.md`](./history/STATE-STATE-R111-pre-compression.md)
and the corresponding capability / acceptance artifacts.

## 6. Known Governance Conflicts

No current unresolved governance conflicts. `governanceHealth = ALIGNED`.

Closed historical conflicts and prior STATE-Rxx progression narratives remain in
[`history/STATE-STATE-R111-pre-compression.md`](./history/STATE-STATE-R111-pre-compression.md).

## 7. Acceptance Provenance

Accepted product through IMP-036D is independently accepted. Detailed per-slice evidence remains in
repository tests, audits, Docker runtime proof, capability artifacts, and
[`history/STATE-STATE-R111-pre-compression.md`](./history/STATE-STATE-R111-pre-compression.md).

IMP-036E remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-036E_ACCEPTED: NO`; Founder UAT
`NOT_STARTED` / `NOT_PERFORMED`). Implementation evidence and independent implementation review
references required for acceptance remain recorded above and in
[`capabilities/IMP-036E-store-operations-management.md`](./capabilities/IMP-036E-store-operations-management.md).

## 8. Explicitly Not Yet Accepted

- IMP-036E — Store Operations Management (`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; Founder UAT required / not performed)
- IMP-036F — Catalog, Menu, Pricing & Promotions Management (`PLANNED` / `NOT_ACTIVATED`)
- IMP-036G — Administration Console V2 (`PLANNED` / `NOT_ACTIVATED`)
- IMP-037 — Backup, Restore & Migration Readiness
- IMP-038 — Security & Privacy Hardening
- IMP-039 — Production Infrastructure & Release Pipeline
- IMP-040 — Launch Validation & Cutover

## 9. Authority Boundaries

| Question | Authority |
|---|---|
| What is independently accepted now | **This document (`STATE.md`)** |
| What comes next / IMP meanings | [`ROADMAP.md`](./ROADMAP.md) |
| Historical STATE evidence | [`history/STATE-STATE-R111-pre-compression.md`](./history/STATE-STATE-R111-pre-compression.md) |
| Why / Non-Goals | [`VISION.md`](./VISION.md) |
| Durable architecture | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| Binding decision status | [`decision-register.md`](./decision-register.md) |
| IMP-036E locked capability architecture | [`capabilities/IMP-036E-store-operations-management.md`](./capabilities/IMP-036E-store-operations-management.md) |
| IMP-036D locked capability architecture | [`capabilities/IMP-036D-workforce-franchise-operations-v2.md`](./capabilities/IMP-036D-workforce-franchise-operations-v2.md) |

Agents may propose a STATE delta in their report. Only independent acceptance updates this file's
accepted position and may promote `governanceHealth` to `ALIGNED`.

## 10. STATE-R112 record

```text
STATE-R112 = CANONICAL_AUTHORITY_CONTEXT_COMPRESSION_ONLY
source snapshot exact: YES (blob 748c3b615fe9b93f91ff573f88548223b9ba1d0d)
source commit: 33a226a18e4e9428c07233990d026541418f0860
acceptance change: NO
acceptedThrough: IMP-036D (unchanged)
pendingAcceptance: IMP-036E (unchanged)
currentProductSlice: IMP-036E (unchanged)
nextProductSlice: IMP-036F (unchanged)
IMP-036E_ACCEPTED: NO
IMP036F_ACTIVATED: NO
```
