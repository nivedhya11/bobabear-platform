<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "GLOBAL_ARCHITECTURE",
  "architectureVersion": "ARCH-R7",
  "lastReviewed": "2026-08-13"
}
-->

# BOBA Bear — Global Architecture

## 1. Architecture Scope

This document describes **current durable global technical architecture** for the BOBA Bear
direct-order platform. It does not own IMP numbering ([`ROADMAP.md`](./ROADMAP.md)), accepted
inventory ([`STATE.md`](./STATE.md)), product Non-Goals ([`VISION.md`](./VISION.md)), or the full
decision rationale store ([`decision-register.md`](./decision-register.md) + ADRs).

## 2. System Context

BOBA Bear is evolving a marketing website into an owned direct-ordering platform. Aggregators remain
an external channel. Petpooja remains outside the direct platform. The platform owns customer
identity, commerce domains, workforce access control, and operational workflows for direct orders.

## 3. Deployment Model

Current durable public-web rule:

```text
Public web: Next.js static export → Nginx
```

Dynamic commerce requirements must **not** implicitly introduce Next.js Route Handlers,
`src/app/api` business APIs, Server Actions, SSR, or dynamic Next.js server execution unless a
future human-approved architecture decision explicitly supersedes this model.

Locked global separation ([D-356](./decision-register.md), amended by
[D-359](./decision-register.md)):

```text
static public frontend
+
dynamic backend transport outside dynamic Next.js execution
```

IMP-024 customer transport topology is **decided** ([D-359](./decision-register.md)):

```text
Static Next.js export → Nginx
  /api/customer-auth/*  → customer-auth:8081
  /api/workforce-auth/* → workforce-auth:8082
  /api/v1/*             → customer-commerce:8083  (thin node:http façade)
```

Full route/error/operability contracts live in
[`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md)
([D-360](./decision-register.md)). The accepted Compose runtime includes `customer-commerce`
(internal `:8083`) behind Nginx `/api/v1/*`.

IMP-026 payment integration uses the **same** `customer-commerce` process ([D-361](./decision-register.md)).
No new deployable service. Razorpay runs behind the existing `PaymentProvider` port.

```text
POST /api/integrations/payments/razorpay/webhook  → customer-commerce
POST /api/v1/payments/{paymentId}/client-evidence → customer-commerce  (authenticated customer API)
```

`/api/integrations/*` is not part of `/api/v1/*` and is not a customer API. Nginx will route the
Razorpay webhook path to `customer-commerce`. Client-evidence remains inside the D-360 `/api/v1/*`
customer convention. Neither path is a Next.js Route Handler.

Razorpay webhook acknowledgement ([D-362](./decision-register.md)) occurs only after verified
Payment evidence is durably accepted/applied. Order materialization is a post-ack effect, not part
of the provider-ack critical path. Missing-Order after Payment success is recovered via existing
`recoverMissingOrdersBatch`. No new Payment inbox, worker/service, queue/broker, or Payment schema.

Local default runtime uses Docker Desktop Compose. Staging/production cloud topology remains governed
by ADR-001 / ADR-002 and future production slices; those details must not contradict the static
public frontend rule above without an explicit superseding decision.

## 4. Runtime Topology

Verified default Compose services today (no `tools` profile; accepted inventory):

```text
postgres
app                 (Nginx serving static export)
customer-auth       (standalone Node HTTP service)
workforce-auth      (standalone Node HTTP service)
customer-commerce   (standalone Node HTTP transport façade; internal :8083)
```

Durable rule:

> A new domain capability does not automatically require a new deployable service.

IMP-024 added **one** transport façade by explicit decision (D-359), not one service per
domain. Do not imply speculative `refund-service`, `order-service`, `delivery-service`, or
`notification-service` units without explicit architecture.

Tooling services (`migrate`, `db-check`, bootstrap CLIs, etc.) use the Compose `tools` profile and
are not default runtime.

## 5. Domain Authority Map

**Single-authority principle:** every material business fact should have one canonical authority.
Other domains may reference or project it but must not establish competing mutable truth.

| Domain | Owns | Notes |
|---|---|---|
| Cart | Mutable shopping intent | Not commercial finality |
| Checkout Snapshot | Immutable accepted commercial transaction | Historical purchased commerce derives from this |
| Payment | Original financial collection truth | Provider observations are not automatic Payment truth |
| Order | Post-purchase business lifecycle | Accepted lifecycle: `PLACED` \| `ACCEPTED` \| `FULFILLED` \| `CANCELLED` |
| Refund | FUTURE / NOT_IMPLEMENTED | Roadmapped as IMP-027 |
| Delivery | FUTURE / NOT_IMPLEMENTED | Roadmapped as IMP-031+ |
| Notification | FUTURE / NOT_IMPLEMENTED | Roadmapped as IMP-033+ |
| Invoice / Credit Note | FUTURE / NOT_IMPLEMENTED | Architectural intent in ADR-007; implementation IMP-028 |

Accepted chain:

```text
Cart → Checkout → Payment → Order
```

## 6. Authentication and Trust

- Raw user IDs are not authentication authority.
- Customer and workforce trust remain distinct realms (separate secrets, sessions, tables).
- Caller-provided `userId` / `authorized=true` / `scopeApproved=true` cannot manufacture authority.
- Trusted server-side authentication/session resolution establishes actor authority.
- Better Auth is identity/session infrastructure; business authorization is separate.

## 7. Authorization and Scope

- Deny by default.
- Capability authorization before sensitive workforce operations (`requireAuthorization` /
  permission keys).
- Scope derives from trusted server-side relationships, not caller-supplied brand/outlet/customer
  identifiers.
- Privileged roles obtain authority through RBAC, never hard-coded role-name bypasses.
- IDOR-resistant, non-enumerating behavior where required.
- Current accepted inventory: **55** permissions, **7** system roles ([`STATE.md`](./STATE.md)).

## 8. Persistence and Data Integrity

- PostgreSQL is authoritative persistent state.
- Prefer DB constraints for structural truths (UNIQUE / FK / composite FK / CHECK / protective
  deletes) where appropriate.
- Do not duplicate mutable authority merely to manufacture local checks.
- Preserve immutable historical transaction truth (especially Checkout snapshots and payment
  provenance).
- Business tables live in the `app` schema via `appSchema.table(...)`.
- Migrations are committed SQL; never `drizzle-kit push`; never auto-migrate on web startup.

## 9. Concurrency / Idempotency / Recovery

**Concurrency**

- Concurrency is explicitly architected where business correctness depends on it.
- No silent last-write-wins for material state.
- Stale writes fail deterministically where optimistic concurrency applies (`expectedRevision`
  patterns).
- Database serialization/constraints are preferred where appropriate.
- Race claims require genuinely concurrent tests.
- No single global locking mechanism is prescribed.

**Idempotency**

> Use the smallest mechanism that correctly provides idempotency. Prefer natural identity /
> uniqueness where sufficient. Do not introduce generic idempotency infrastructure speculatively.

Provider operations may still require explicit idempotency when architecture demands it. Shared
outbox/idempotency primitives exist; they are not a mandate to wrap every write.

**Crash / recovery**

> Production-critical transitions must define relevant crash-before-commit,
> crash-after-commit/response-loss, retry, and recovery semantics.

Durable upstream authority is not rolled back merely because a downstream recoverable
materialization fails (example: Payment success remains authoritative if Order materialization is
best-effort/recoverable). Razorpay webhook acknowledgement ([D-362](./decision-register.md)) follows
durable Payment acceptance; Order materialization stays outside that ack path; missing-Order gaps
are recovered via existing `recoverMissingOrdersBatch`.

## 10. External Integration Principles

- Provider observations do not automatically become core domain authority.
- Payment-provider state does not automatically define Payment truth. Current V1 production
  provider is **Razorpay** ([D-361](./decision-register.md)); historical Cashfree selection
  (D-161 / D-162) is not current provider authority.
- Delivery provider state does not automatically redefine Order truth.
- WhatsApp delivery state does not become Order truth.
- Keep business-domain authority provider-neutral where the business concept exists independently.
- Do not invent abstraction layers where unnecessary.

## 11. Frontend / Transport Boundary

Layer separation:

```text
UI
→ Transport
→ Application Operations
→ Domain Authority
→ Persistence
→ Provider Adapter
```

Examples:

```text
Cart domain ≠ Cart API ≠ Cart UI
Order domain ≠ Operations API ≠ Operations UI
```

The browser must not become authoritative for pricing, tax, promotion eligibility, payment truth,
authorization, or Order lifecycle.

Current public site remains static. Customer/workforce auth already use standalone Node HTTP
services proxied by Nginx for specific prefixes. Customer commerce transport is locked as the
dedicated `customer-commerce` Node HTTP service behind `/api/v1/*` ([D-359](./decision-register.md),
[D-360](./decision-register.md)); route detail lives in the IMP-024 capability architecture.
Dynamic commerce must remain outside dynamic Next.js execution unless superseded by decision.

## 12. Security Principles

- Secrets never in client bundles without explicit allowlist + review.
- No logging of secrets, connection strings, OTPs, raw PII where hashed digests are required.
- Fail closed in staging/production for unsafe adapters / missing production providers.
- CSRF/origin checks and rate limits belong at transport boundaries as architecture requires.
- Audit sensitive workforce and commercial mutations.

## 13. Deferred Architectural Boundaries

| Boundary | Status |
|---|---|
| Quantitative Inventory Authority | DEFERRED / NOT_DEFINED |
| Detailed Kitchen Fulfilment | DEFERRED / NOT_DEFINED |
| Refund | FUTURE / NOT_IMPLEMENTED |
| Delivery | FUTURE / NOT_IMPLEMENTED |
| Notification | FUTURE / NOT_IMPLEMENTED |
| Invoice / Credit Note document engine | FUTURE / NOT_IMPLEMENTED |
| Exact IMP-024 transport topology | DECIDED — D-359 (`customer-commerce:8083` behind `/api/v1/*`); capability architecture locked; Compose wiring accepted with IMP-024 |
| IMP-025 Customer Ordering UX | ARCHITECTURE_LOCKED — capability architecture [`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md); static export + `/api/v1/*` client UX; implementation COMPLETE_AND_ACCEPTED |
| IMP-026 Razorpay productionization | ARCHITECTURE_LOCKED — capability architecture [`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md); Razorpay behind existing `PaymentProvider` in `customer-commerce` (D-361); webhook ack after durable Payment / missing-Order recovery via `recoverMissingOrdersBatch` (D-362); implementation NOT_STARTED |

`NOT_DEFINED` / `NOT_IMPLEMENTED` ≠ `PROHIBITED_FOREVER`.

## 14. Global Architecture Invariants

| ID | Invariant |
|---|---|
| ARCH-G01 | Public customer web remains static unless explicitly superseded. |
| ARCH-G02 | A domain capability does not automatically imply a deployable service. |
| ARCH-G03 | Raw user identifiers are not authentication authority. |
| ARCH-G04 | Customer and workforce trust remain distinct. |
| ARCH-G05 | Historical purchased commerce derives from immutable Checkout Snapshot. |
| ARCH-G06 | Payment owns original collection truth. |
| ARCH-G07 | Order owns post-purchase business lifecycle truth. |
| ARCH-G08 | Caller-supplied identifiers cannot manufacture authorization scope. |
| ARCH-G09 | Business-critical concurrency must be explicitly designed. |
| ARCH-G10 | Provider state does not automatically become domain authority. |
| ARCH-G11 | Browser logic cannot become authoritative commercial/business truth. |
| ARCH-G12 | Deferred capabilities may not be introduced opportunistically. |
| ARCH-G13 | PostgreSQL is the authoritative persistent store for platform business state. |
| ARCH-G14 | Future possibility is not sufficient justification for present infrastructure (no speculative microservices, queues, workers, generic event buses, workflow engines, duplicate commercial snapshot hierarchies, or escape-hatch metadata stores). |

## 15. Decision References

| Topic | Binding record |
|---|---|
| Static frontend + external dynamic transport | [D-356](./decision-register.md) (AMENDED), supersedes ADR-014 Route-Handler-as-canonical HTTP |
| IMP-024 customer-commerce topology | [D-359](./decision-register.md); capability lock [`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md) |
| IMP-024 `/api/v1/*` commerce API convention | [D-360](./decision-register.md) |
| IMP-025 Customer Ordering UX | Capability lock [`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md) (COMPLETE_AND_ACCEPTED) |
| V1 production payment provider / collection surface | [D-361](./decision-register.md) (Razorpay / Razorpay Standard Checkout); capability lock [`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md) |
| Razorpay webhook acknowledgement / post-payment Order recovery | [D-362](./decision-register.md) (amends D-361 ack/post-payment effect only; D-361 remains CURRENT for provider selection) |
| Order high-level lifecycle vs deferred kitchen detail | [D-357](./decision-register.md), amends ADR-010 reading |
| Role inventory ownership | [D-358](./decision-register.md); current count in STATE |
| Invoice architecture intent | ADR-007 (implementation = IMP-028 on ROADMAP) |
| Persistence / outbox | ADR-013 |
| Auth foundations | ADR-004; accepted implementation IMP-008–010 |
| Modular monolith | ADR-003 (read with D-356 / D-359 transport amendment) |

## 16. Authority Boundaries

| Question | Authority |
|---|---|
| Current durable global architecture | **This document (`ARCHITECTURE.md`)** |
| Decision status / supersession | [`decision-register.md`](./decision-register.md) |
| Detailed rationale/history | ADRs under [`decisions/`](./decisions/) |
| IMP sequence | [`ROADMAP.md`](./ROADMAP.md) |
| Accepted inventory | [`STATE.md`](./STATE.md) |
