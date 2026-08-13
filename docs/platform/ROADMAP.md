<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "IMPLEMENTATION_SEQUENCE",
  "roadmapVersion": "GTM-R10",
  "acceptedThrough": "IMP-025",
  "currentProductSlice": "NONE",
  "nextProductSlice": "IMP-026",
  "gtmBoundary": "IMP-040",
  "lastReviewed": "2026-08-13",
  "supersedes": "GTM-R9"
}
-->

# BOBA Bear — Implementation Roadmap

## 1. Roadmap Rules

- Accepted IMP identity is **permanently immutable**. Do not reinterpret or renumber accepted
  history (IMP-001 → IMP-025 and IMP-005A).
- No other document may independently redefine IMP numbering.
- Only one product slice is normally active.
- A deferred capability cannot be assigned or promoted by an implementation agent.
- Roadmap changes require a `roadmapVersion` change.
- Prefer suffix insertion or explicit versioned remapping rather than silently recycling a
  previously published IMP meaning.
- Future planned mappings must not be silently reused for another capability.
- Coding-agent completion is not acceptance. Acceptance is recorded in [`STATE.md`](./STATE.md).
- After `COMPLETE_AND_ACCEPTED`, a separate reconciliation must update STATE / ROADMAP / acceptance
  records (and DECISION-REGISTER / ARCHITECTURE when durable decisions or global architecture
  change) before the next slice begins.

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

IMP-024 locked artifact:

[`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md)

IMP-025 locked artifact:

[`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md)

IMP-026 locked artifact:

[`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md)

## 2. Current Position

```text
Accepted Through:     IMP-025 — Customer Ordering UX
Current Product Slice: NONE
Next Product Slice:    IMP-026 — Razorpay Productionization & Payment GTM Readiness
Public GTM Boundary:   IMP-040 — Launch Validation & Cutover
```

IMP-024 architecture remains **ARCHITECTURE_LOCKED**. IMP-024 implementation is
**COMPLETE_AND_ACCEPTED**. IMP-025 architecture remains **ARCHITECTURE_LOCKED**. IMP-025
implementation is **COMPLETE_AND_ACCEPTED**. `acceptedThrough` is IMP-025. IMP-026 architecture is
**ARCHITECTURE_LOCKED**. IMP-026 implementation remains `NOT STARTED` and is **not** authorized by
this architecture lock. Current V1 payment provider is **Razorpay** (**D-361**), substituting the
previously published Cashfree IMP-026 meaning without changing the slice number. Razorpay webhook
acknowledgement / missing-Order recovery is **D-362** (amends D-361 ack/post-payment effect only).
Webhook acknowledgement timing / durable inbox / asynchronous Payment processing is **D-363**
(amends D-362 acknowledgement timing only).

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

## 4. Current Product Slice

```text
NONE
```

Next product slice:

```text
IMP-026 — Razorpay Productionization & Payment GTM Readiness
Lifecycle: ARCHITECTURE_LOCKED / NOT STARTED
Architecture: locked
```

Independent acceptance of IMP-025 is recorded. Do not start IMP-026 implementation.
Implementation of IMP-026 is not authorized by this architecture lock.

IMP-024 architecture remains locked at
[`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md).

IMP-025 architecture remains locked at
[`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md).

IMP-026 architecture is locked at
[`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md).

## 5. Future GTM Slices

Remaining numbered product slices to public GTM: **15** (IMP-026 → IMP-040).

| IMP | Capability | Lifecycle |
|---|---|---|
| IMP-026 | Razorpay Productionization & Payment GTM Readiness | ARCHITECTURE_LOCKED |
| IMP-027 | Refund Foundation | PLANNED |
| IMP-028 | Invoice / Tax Receipt / Credit Note | PLANNED |
| IMP-029 | Operations Console API | PLANNED |
| IMP-030 | Operations Console UI | PLANNED |
| IMP-031 | Provider-Neutral Delivery Foundation | PLANNED |
| IMP-032 | Dehradun Delivery Operating Mode | PLANNED |
| IMP-033 | Notification Foundation | PLANNED |
| IMP-034 | Meta WhatsApp Cloud API Adapter | PLANNED |
| IMP-035 | Initial Administration Capabilities | PLANNED |
| IMP-036 | Observability & Operational Controls | PLANNED |
| IMP-037 | Backup, Restore & Migration Readiness | PLANNED |
| IMP-038 | Security & Privacy Hardening | PLANNED |
| IMP-039 | Production Infrastructure & Release Pipeline | PLANNED |
| IMP-040 | Launch Validation & Cutover | PLANNED |

IMP-025 architecture remains **ARCHITECTURE_LOCKED**. Implementation is
**COMPLETE_AND_ACCEPTED**. IMP-026 architecture is **ARCHITECTURE_LOCKED**. IMP-026
implementation remains `NOT STARTED`.

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

### GTM-R10 — 2026-08-13

- Recorded **D-363**: Razorpay durable webhook inbox and asynchronous provider-event processing.
  Amends D-362 only for webhook acknowledgement timing. D-362 remains CURRENT for Order
  materialization outside the provider-ack path, missing-Order recovery, secondary reconciliation,
  and no new deployable service. D-361 remains CURRENT for Razorpay provider selection / Standard
  Checkout.
- Updated locked IMP-026 capability architecture
  ([`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md))
  for durable inbox insert before HTTP 2xx, asynchronous Payment processing inside
  `customer-commerce`, one Attempt = one Razorpay Order, Checkout internal retry disabled, captured
  required for success, automatic capture, and deterministic provider receipt /
  recover-before-recreate.
- IMP-026 lifecycle remains `ARCHITECTURE_LOCKED`. Implementation remains `NOT STARTED` and is
  **not** authorized by this architecture lock.
- `acceptedThrough` remains IMP-025; `currentProductSlice` remains `NONE`; `pendingAcceptance`
  remains `NONE`; `nextProductSlice` remains IMP-026. Do not advance to IMP-027.

### GTM-R9 — 2026-08-13

- Recorded **D-362**: Razorpay webhook acknowledgement and post-payment Order recovery boundary.
  Amends D-361 only for webhook acknowledgement / post-payment Order effect semantics. D-361 remains
  CURRENT for Razorpay provider selection / Standard Checkout.
- Updated locked IMP-026 capability architecture
  ([`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md))
  for acknowledgement-after-durable-Payment, Order materialization outside provider-ack path, and
  missing-Order recovery via existing `recoverMissingOrdersBatch`.
- IMP-026 lifecycle remains `ARCHITECTURE_LOCKED`. Implementation remains `NOT STARTED` and is
  **not** authorized by this architecture lock.
- `acceptedThrough` remains IMP-025; `currentProductSlice` remains `NONE`; `pendingAcceptance`
  remains `NONE`; `nextProductSlice` remains IMP-026. Do not advance to IMP-027.

### GTM-R8 — 2026-08-13

- Explicit approved provider substitution: retitled IMP-026 from
  `Cashfree Productionization & Payment GTM Readiness` to
  **`IMP-026 — Razorpay Productionization & Payment GTM Readiness`**. Slice number unchanged.
- Locked IMP-026 capability architecture
  ([`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md)).
- Set IMP-026 lifecycle to `ARCHITECTURE_LOCKED`. Implementation remains `NOT STARTED` and is
  **not** authorized by this architecture lock.
- `acceptedThrough` remains IMP-025; `currentProductSlice` remains `NONE`; `pendingAcceptance`
  remains `NONE`; `nextProductSlice` remains IMP-026.
- Current V1 payment provider/surface authority is **D-361** (Razorpay / Razorpay Standard
  Checkout), superseding D-161 / D-162 for current authority. Do not advance to IMP-027.

### GTM-R7 — 2026-08-13

- Independent acceptance of IMP-025 — Customer Ordering UX
  (`COMPLETE_AND_ACCEPTED`). Architecture remains `ARCHITECTURE_LOCKED`.
- Set `acceptedThrough = IMP-025`; `currentProductSlice = NONE`;
  `nextProductSlice = IMP-026`.
- IMP-026 remains `PLANNED / NOT STARTED`. Implementation of IMP-026 is not authorized
  by this reconciliation.

### GTM-R6 — 2026-08-13

- Recorded IMP-025 coding-agent implementation complete
  (`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`). Architecture remains
  `ARCHITECTURE_LOCKED`.
- Set `currentProductSlice = IMP-025`; `nextProductSlice` remains IMP-025;
  `acceptedThrough` remains IMP-024.
- Independent acceptance of IMP-025 is **not** claimed. Do not start IMP-026.

### GTM-R5 — 2026-08-13

- Locked IMP-025 capability architecture
  ([`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md)).
- Set IMP-025 lifecycle to `ARCHITECTURE_LOCKED`.
- `acceptedThrough` remains IMP-024; `currentProductSlice` remains `NONE`;
  `nextProductSlice` remains IMP-025.
- IMP-025 implementation remains `NOT STARTED` and is **not** authorized by architecture lock.

### GTM-R4 — 2026-08-12

- Independent acceptance of IMP-024 — Customer Ordering Transport / API
  (`COMPLETE_AND_ACCEPTED`). Architecture remains `ARCHITECTURE_LOCKED`.
- Set `acceptedThrough = IMP-024`; `currentProductSlice = NONE`;
  `nextProductSlice = IMP-025`.
- IMP-025 remains `PLANNED / NOT STARTED`. Implementation of IMP-025 is not authorized
  by this reconciliation.

### GTM-R3 — 2026-08-12

- Locked IMP-024 capability architecture
  ([`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md)).
- Set IMP-024 lifecycle to `ARCHITECTURE_LOCKED`, then activated `IMPLEMENTATION_IN_PROGRESS`
  under separate implementation authorization (architecture lock retained), then recorded
  `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` after coding-agent implementation evidence.
- Set `currentProductSlice = IMP-024`; `acceptedThrough` remains IMP-023.
- Recorded CURRENT decisions D-359 / D-360 (see [`decision-register.md`](./decision-register.md)).

### GTM-R2 — 2026-08-11

- Preserved accepted IMP-001→IMP-023 identities.
- Preserved IMP-005A.
- Superseded older future-roadmap numbering (GTM-R1 / `implementation-roadmap.md`).
- Added Customer Ordering Transport / API as IMP-024.
- Added Customer Ordering UX as IMP-025.
- Separated Cashfree productionization from the Payment domain (IMP-026).
- Moved Refund to its own future capability (IMP-027).
- Added Invoice / Tax Receipt / Credit Note (IMP-028).
- Separated Order domain from Operations Console API/UI (IMP-029 / IMP-030).
- Moved public GTM boundary from IMP-035 to IMP-040.
- Reassigned IMP-035 to Initial Administration Capabilities.

### GTM-R1 — 2026-08-03

- Original approved sequential implementation roadmap (`implementation-roadmap.md`). Historical
  only.

## 10. Authority Boundaries

| Question | Authority |
|---|---|
| IMP identity / sequence / GTM boundary | **This document (`ROADMAP.md`)** |
| Accepted reality | [`STATE.md`](./STATE.md) |
| Product purpose / Non-Goals | [`VISION.md`](./VISION.md) |
| Durable architecture | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| Binding decisions | [`decision-register.md`](./decision-register.md) |
| IMP-024 capability architecture | [`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md) |
| IMP-025 capability architecture | [`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md) |
| IMP-026 capability architecture | [`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md) |

Operating lifecycle:

```text
ANCHOR → GATE → EXECUTE → PROVE → ACCEPT → RECONCILE → ADVANCE
```
