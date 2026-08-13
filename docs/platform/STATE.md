<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "ACCEPTED_STATE",
  "stateVersion": "STATE-R8",
  "acceptedThrough": "IMP-025",
  "currentProductSlice": "NONE",
  "nextProductSlice": "IMP-026",
  "pendingAcceptance": "NONE",
  "governanceHealth": "ALIGNED",
  "lastReviewed": "2026-08-13"
}
-->

# BOBA Bear — Accepted State

Coding-agent completion does **not** equal acceptance. This document is the independently accepted
current-reality authority.

## 1. Accepted Position

```text
Accepted Through:          IMP-025 — Customer Ordering UX
Accepted Inserted Slice:   IMP-005A — Dockerized local application runtime
Accepted Range:            IMP-001 → IMP-025 (including IMP-005A)
```

## 2. Current Work Position

```text
Current Product Implementation: NONE
Pending Acceptance:             NONE
Next Product Slice:             IMP-026 — Razorpay Productionization & Payment GTM Readiness
Current Governance Activity:    IMP-026 ARCHITECTURE_LOCKED (implementation NOT_STARTED)
Governance Health:              ALIGNED
```

```text
IMP-024 architecture:     ARCHITECTURE_LOCKED
IMP-024 implementation:   COMPLETE_AND_ACCEPTED
IMP-025 architecture:     ARCHITECTURE_LOCKED
IMP-025 implementation:   COMPLETE_AND_ACCEPTED
IMP-026 architecture:     ARCHITECTURE_LOCKED
IMP-026 implementation:   NOT_STARTED
```

Capability architecture:

[`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md)

[`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md)

[`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md)

`acceptedThrough` is IMP-025. IMP-025 architecture remains locked; IMP-025 implementation is
**COMPLETE_AND_ACCEPTED**. IMP-026 architecture is **ARCHITECTURE_LOCKED**. IMP-026 implementation
is `NOT_STARTED` and is **not** authorized by this architecture lock. Current V1 payment provider
is **Razorpay** (**D-361**). Razorpay webhook acknowledgement / missing-Order recovery is
**D-362**.

`governanceHealth = ALIGNED` records independent acceptance through IMP-025.
Implementation agents must not self-promote this field or start IMP-026 implementation.

## 3. Accepted Technical Inventory

Independently verified from repository evidence on 2026-08-12 (authority path
`/mnt/c/repos/boba-bear-website`), including IMP-024 independent re-acceptance.
Speculative values are forbidden here.

| Metric | Verified value | How verified |
|---|---|---|
| Latest migration | `0017_order` | `drizzle/meta/_journal.json` last entry tag; `drizzle/0017_order.sql` present |
| Migration count | `18` | Count of `drizzle/*.sql` files and journal entries (0000–0017) |
| Application tables | `92` | Count of `appSchema.table(` declarations under `src/platform/database/schema/` |
| Workforce permissions | `55` | `PERMISSION_KEYS.length` in `src/shared/access-control/catalog.ts` |
| System roles | `7` | `ROLE_KEYS.length` in `src/shared/access-control/catalog.ts` |
| Default Docker services | `5` | Compose services without `profiles: ["tools"]`: `postgres`, `app`, `customer-auth`, `workforce-auth`, `customer-commerce` |
| Order-owned tables | `1` | `orders` in `src/platform/database/schema/order.ts` |
| Order snapshot/history tables | `0` | No additional Order snapshot/event tables in schema |
| IMP-023 new production runtime dependencies | `0` | No Order-domain production dependency addition beyond prior accepted baseline |
| Public web mode | Next.js static export → Nginx | `next.config.ts` `output: "export"`; `docker/nginx/nginx.conf`; no production `src/app/api` commerce tree |
| IMP-024 architecture artifact | present | `docs/platform/capabilities/IMP-024-customer-ordering-transport.md` |
| IMP-024 runtime Compose service | present | `customer-commerce` internal `:8083`; Nginx `/api/v1/*` (D-359) |
| IMP-025 architecture artifact | present | `docs/platform/capabilities/IMP-025-customer-ordering-ux.md` |
| IMP-025 static ordering catalog | present | `src/data/ordering-catalog.json` deterministic projection from existing-menu-v1 |

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
```

| Domain | Authority |
|---|---|
| Cart | Mutable shopping intent |
| Checkout Snapshot | Immutable accepted commercial transaction |
| Payment | Original financial collection truth |
| Order | Post-purchase business lifecycle truth (`PLACED` \| `ACCEPTED` \| `FULFILLED` \| `CANCELLED`) |

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

## 5. Pending Acceptance

```text
NONE
```

## 6. Known Governance Conflicts

Governance installation conflicts identified at STATE-R1 publication are closed by independent
acceptance:

- Competing historical roadmap meanings in `implementation-roadmap.md` (GTM-R1) — marked
  SUPERSEDED by [`ROADMAP.md`](./ROADMAP.md).
- ADR-014 Route-Handler-as-canonical HTTP boundary — superseded for CURRENT transport policy by
  [`decision-register.md`](./decision-register.md) decision **D-356**, with IMP-024 topology
  decided by **D-359**.
- ADR-010 detailed kitchen states vs accepted IMP-023 Order lifecycle — clarified by **D-357**.
- Historical role-count prose (six roles) vs accepted inventory (seven) — clarified by **D-358**;
  current inventory is owned by this STATE document and code.

STATE-R8 records **D-362** (Razorpay webhook acknowledgement / post-payment Order recovery) as an
amendment of D-361 ack/post-payment effect only, without changing IMP-026 lifecycle or
`acceptedThrough`. D-361 remains CURRENT for provider selection.
STATE-R7 records IMP-026 architecture lock (`ARCHITECTURE_LOCKED`) with implementation
`NOT_STARTED`, and the approved V1 provider substitution to Razorpay (**D-361**) without starting
IMP-026 implementation or advancing `acceptedThrough`.
STATE-R6 records independent acceptance of IMP-025 (`COMPLETE_AND_ACCEPTED`).
STATE-R5 recorded IMP-025 coding-agent implementation complete
(`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`) without independent acceptance.
STATE-R4 recorded IMP-025 architecture lock (`ARCHITECTURE_LOCKED`) without starting IMP-025
implementation. STATE-R3 recorded independent acceptance of IMP-024 (`COMPLETE_AND_ACCEPTED`)
without activating IMP-025.

`governanceHealth = ALIGNED`. These items remain historical/supersession records, not open
governance conflicts.

## 7. Acceptance Provenance

Accepted product through IMP-025 is the independently accepted implementation baseline encoded by
this reconciliation. Detailed per-slice evidence remains in repository tests, audits, Docker
runtime proof, and historical implementation artifacts. This STATE snapshot records independent
acceptance of IMP-025 (`COMPLETE_AND_ACCEPTED`).

Independent IMP-025 acceptance (COMPLETE_AND_ACCEPTED) on 2026-08-13. Pre-acceptance
governance fingerprint:

```text
a1041d036d3636ab0cc64615805f02f6317838a545c8fbe463a0d7afac786e4e
```

Post-acceptance fingerprint is regenerated by `npm run governance:fingerprint` after this STATE
update and supersedes the pre-acceptance value for ongoing governance identity.

## 8. Explicitly Not Yet Accepted

Supporting primitives do not equal capability completion. Not yet accepted as product capabilities:

- Razorpay Productionization & Payment GTM Readiness
- Refund
- Invoice / Tax Receipt / Credit Note
- Operations Console API
- Operations Console UI
- Delivery
- Notifications
- WhatsApp
- Initial Administration
- Observability GTM completion
- Backup / Restore GTM completion
- Security / Privacy final hardening
- Production Infrastructure
- Launch Validation

## 9. Authority Boundaries

| Question | Authority |
|---|---|
| What is independently accepted now | **This document (`STATE.md`)** |
| What comes next / IMP meanings | [`ROADMAP.md`](./ROADMAP.md) |
| Why / Non-Goals | [`VISION.md`](./VISION.md) |
| Durable architecture | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| Binding decision status | [`decision-register.md`](./decision-register.md) |
| IMP-024 locked capability architecture | [`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md) |
| IMP-025 locked capability architecture | [`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md) |
| IMP-026 locked capability architecture | [`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md) |

Agents may propose a STATE delta in their report. Only independent acceptance updates this file's
accepted position and may promote `governanceHealth` to `ALIGNED`.
