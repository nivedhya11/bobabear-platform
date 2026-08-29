<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "GLOBAL_ARCHITECTURE",
  "architectureVersion": "ARCH-R18",
  "lastReviewed": "2026-08-29"
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
  /api/operations/v1/*  → Operations Console API (dedicated workforce-business façade; D-372)
```

The Operations Console API boundary is architecture-locked for IMP-029 but is not implemented or
deployed. Its port/process/container details remain unselected and are not implied by this topology.

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

Razorpay webhook acknowledgement ([D-363](./decision-register.md), amending [D-362](./decision-register.md)
timing) occurs only after verified provider evidence is durably accepted into Postgres
`payment_provider_event_inbox`. HTTP 2xx does not wait for Payment locking/transitions or Order
materialization. Inbox processing is a small claim/process loop inside existing `customer-commerce`.
Order materialization remains a post-ack effect ([D-362](./decision-register.md)). Missing-Order
after Payment success is recovered via existing `recoverMissingOrdersBatch`. No new deployable
service, queue, or broker. Payment/provider ingress schema change is required (one future
migration). Refund Foundation ([D-364](./decision-register.md)) reuses the same webhook endpoint and
durable inbox for `refund.created` / `refund.processed` / `refund.failed` without a second public
Razorpay webhook route; Refund implementation remains unauthorized until separately authorized.

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
| Payment | Original financial collection truth | Provider observations are not automatic Payment truth; remains `SUCCEEDED` after Refund |
| Order | Post-purchase business lifecycle | Accepted lifecycle: `PLACED` \| `ACCEPTED` \| `FULFILLED` \| `CANCELLED` |
| Refund | Financial reversal truth for returned funds | First-class aggregate (IMP-027 ARCHITECTURE_LOCKED; implementation COMPLETE_AND_ACCEPTED); does not rewrite Payment collection truth ([D-364](./decision-register.md)) |
| RefundStatutoryDecision | Durable statutory-reversal classification for a PROCESSED Refund | First-class aggregate under IMP-028 ([D-366](./decision-register.md)); does not rewrite Refund money truth or mutate issued Financial Documents |
| Financial Document | Immutable issued statutory / financial-document truth | First-class aggregate (IMP-028 ARCHITECTURE_LOCKED; implementation COMPLETE_AND_ACCEPTED); consumes Checkout/Payment/Refund/Order/Issuer-Tax Profile without rewriting them ([D-365](./decision-register.md)) |
| SignatureArtifact | Durable signature state and exact-byte signed statutory artifact authority | First-class aggregate under IMP-028 ([D-367](./decision-register.md)); exactly one authority per signing-required Financial Document; does not rewrite Financial Document sealed issuance facts or Payment/Order commercial truth |
| Customer Menu Projection | Customer-facing storefront **READ MODEL** composed from existing catalog/menu, pricing, assortment/availability, modifier, and bundle authorities | CURRENT serving architecture ([D-368](./decision-register.md)); implemented and accepted under IMP-028B; not a new commercial authority |
| Operations | Preparation, readiness, workforce action, and operational handoff facts | Delivery references confirmed Operations facts; it does not replace their authority |
| Delivery | Provider-neutral dispatch and delivery-execution truth, including delivery proof, failure/return, and provider-cost reconciliation facts | First-class domain; capability architecture LOCKED under IMP-031; implementation AUTHORIZED / NOT_STARTED; does not rewrite Order lifecycle or historical customer delivery charge |
| Notification | FUTURE / NOT_IMPLEMENTED | Roadmapped as IMP-033+ |

Accepted chain:

```text
Cart → Checkout → Payment → Order
```

Refund relationship (independent reversal):

```text
Payment SUCCEEDED → zero or more Refunds
```

Financial Document relationship (issued statutory truth):

```text
Checkout Snapshot + Payment + Refund? + Order? + effective Issuer/Tax Profile
→ Financial Document (immutable issued facts / number / issueAt)
→ SignatureArtifact (when BOBA signing required: PENDING → SIGNED)
→ Rendering (projection)
→ Customer signed-PDF download (only after SignatureArtifact SIGNED)
```

Statutory signing (D-367; ATTENDED_ASYNC manual signed-PDF MVP documented in the capability
artifact; unattended DSC/eSign/HSM deferred; formal IMP-028 is COMPLETE_AND_ACCEPTED):

```text
Payment SUCCEEDED / Order FULFILLED / D-366 RFV|CN branch
→ FinancialDocument ISSUED (facts + number + issueAt sealed)
→ SignatureArtifact PENDING
→ attended signing action
→ durable exact-byte signed artifact + SIGNED
→ STATUTORY_ARTIFACT_READY
```

Payment and Order truth must never roll back because signing is pending or fails.

Refund statutory reversal decision (D-366; RefundStatutoryDecision / issuance-allocation / RFV-CN
issuance documented in the capability artifact; formal IMP-028 is COMPLETE_AND_ACCEPTED):

```text
Refund PROCESSED
→ RefundStatutoryDecision (PENDING → BRANCH_FINALIZED → ISSUED?)
→ REFUND_VOUCHER | CREDIT_NOTE | NO_STATUTORY_DOCUMENT
```

Refund money truth (D-364) and issued Financial Document immutability (D-365) remain unchanged.

Delivery relationship (ARCH-R18; capability architecture `ARCHITECTURE_LOCKED`):

```text
Payment / Order / Serviceability / Operations prerequisites
→ Delivery request
→ provider-neutral booking and execution truth
→ proof, failure/return, and provider-cost reconciliation facts
→ authorized downstream Order/Refund/Operations workflows (never direct authority rewrite)
```

Order remains sole commercial lifecycle authority. Operations remains preparation/readiness and
operational-handoff authority. Delivery references those confirmed facts and owns only neutral
dispatch/delivery-execution truth. The historical customer delivery charge sealed by
Pricing/Checkout remains separate from estimated, booked, final, cancellation, return, or adjusted
provider delivery cost.

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
best-effort/recoverable). Razorpay webhook acknowledgement ([D-363](./decision-register.md)) follows
durable inbox insert; Payment transition is asynchronous from the webhook HTTP request; Order
materialization stays outside that ack path ([D-362](./decision-register.md)); missing-Order gaps
are recovered via existing `recoverMissingOrdersBatch`.

Delivery request/booking identity must suppress duplicate logical dispatch and prevent more than one
active booking unless a prior booking has been explicitly reconciled inactive. An ambiguous external
booking result requires recovery by stable identity before replacement; it must not trigger a blind
duplicate request. Repeated, delayed, or out-of-order provider observations must be processed safely.

## 10. External Integration Principles

- Provider observations do not automatically become core domain authority.
- Payment-provider state does not automatically define Payment truth. Current V1 production
  provider is **Razorpay** ([D-361](./decision-register.md)); historical Cashfree selection
  (D-161 / D-162) is not current provider authority.
- Delivery provider state does not automatically redefine Delivery or Order truth. Provider
  observations require normalization, validation, idempotent processing, and recoverable handling
  before they may affect provider-neutral Delivery truth.
- Provider-specific contracts remain inside adapters and evidence boundaries; they must not leak into
  provider-neutral Delivery business authority.
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

Operations Console API ([D-372](./decision-register.md)): IMP-029 owns a dedicated dynamic Node
workforce-business façade at `/api/operations/v1/*`, separate from customer `/api/v1/*` and public
workforce-auth `/api/workforce-auth/*`. It reuses the existing workforce authentication/session
authority through a trusted server-side session-to-principal boundary, then calls existing Order
application operations and permission/scope authorization. It is not a second authentication
system, Order authority, or role-name bypass, and it does not require an internal HTTP hop to
`workforce-auth`. Cookie-authenticated state-changing requests preserve trusted-Origin and
cross-site-request rejection consistent with workforce-auth. No dynamic Next.js execution becomes
business API authority. Implementation is not authorized by this architecture record.

The browser must not become authoritative for pricing, tax, promotion eligibility, payment truth,
authorization, or Order lifecycle.

Customer Menu serving ([D-368](./decision-register.md)): IMP-028B serves the customer Menu from a
server-backed read projection through the existing
`customer-commerce` `/api/v1/*` façade. That projection may expose current/display price and
availability for discovery. Display price is not the sealed payable amount. Display availability is
not a new availability decision. Checkout Snapshot remains authoritative payable commercial truth
after existing Checkout revalidation. D-368 does not lock an exact Menu HTTP payload. The accepted
IMP-028B implementation provides `GET /api/v1/menu`; the IMP-025 generated static
`ordering-catalog.json` artifact is no longer the customer storefront runtime source.

Paid modifier purchase intent ([D-369](./decision-register.md)): a modifier option whose
selection increases the current configured-item price (`price_delta_paise > 0` or equivalent)
MUST NOT become customer purchase intent solely because catalog, import, or frontend metadata
marks it as a default. Explicit customer selection in the current purchase interaction is
required. Zero-price standard/preparation defaults MAY be visibly preselected. Recommendation is
not selection. Cart remains purchase intent; Checkout Snapshot remains authoritative payable
truth. D-369 does not change pricing formulas, modifier schema, or Checkout revalidation
authority, and does not authorize customization implementation.

Cart identity transition ([D-370](./decision-register.md)): when an active guest/anonymous Cart and
an active customer-owned Cart both exist, BOBA must reconcile compatible purchase intent into a
customer-owned Cart rather than silently discarding one set of intent. Failed reconciliation must
not silently discard or partially destroy source intent. After success, the former guest credential
is not authority over that customer Cart. Sign-out must not delete the customer Cart, but the
browser must lose authority over it and become an anonymous commerce context. D-370 does not change
Cart commercial authority, Checkout Snapshot, XOR ownership, configured-line identity, or revision
concurrency, and does not authorize merge implementation.

Cart unit sequence ([D-371](./decision-register.md)): the Cart remains a coalesced configured-line
aggregate. A durable internal active unit-sequence record exists for every represented unit and has
an immutable server-issued order. The record is removal-order authority only; Cart lines remain
customer/business quantity representation and product-card counts remain their projection. Under
the existing Cart transaction, the server selects the latest active record for a requested
`variantId` when product-level decrement is requested. The sequence is not public browser state and
does not change Cart configuration identity, D-369 intent, D-370 transition, or Checkout Snapshot
authority.

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
| Refund | ARCHITECTURE_LOCKED — capability architecture [`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md); binding **D-364**; implementation COMPLETE_AND_ACCEPTED |
| Delivery | ARCHITECTURE_LOCKED — durable provider-neutral authority established by ARCH-R18; capability architecture [`capabilities/IMP-031-provider-neutral-delivery-foundation.md`](./capabilities/IMP-031-provider-neutral-delivery-foundation.md) is `ARCHITECTURE_LOCKED`; implementation AUTHORIZED / NOT_STARTED; provider/operating-mode choices deferred to IMP-032+ |
| Notification | FUTURE / NOT_IMPLEMENTED |
| Invoice / Credit Note / Financial Document | ARCHITECTURE_LOCKED — capability architecture [`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md); binding **D-365** / **D-366** / **D-367**; Financial Document is immutable issued statutory authority; RefundStatutoryDecision governs refund statutory reversal; SignatureArtifact governs signed statutory artifact readiness; implementation COMPLETE_AND_ACCEPTED |
| Exact IMP-024 transport topology | DECIDED — D-359 (`customer-commerce:8083` behind `/api/v1/*`); capability architecture locked; Compose wiring accepted with IMP-024 |
| IMP-025 Customer Ordering UX | ARCHITECTURE_LOCKED — capability architecture [`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md); static export + `/api/v1/*` client UX; implementation COMPLETE_AND_ACCEPTED; its former static `ordering-catalog.json` long-term Menu-serving lock was superseded by **D-368** and implemented by accepted IMP-028B |
| IMP-026 Razorpay productionization | ARCHITECTURE_LOCKED — capability architecture [`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md); Razorpay behind existing `PaymentProvider` in `customer-commerce` (D-361); webhook ack after durable inbox (D-363); missing-Order recovery via `recoverMissingOrdersBatch` (D-362); implementation COMPLETE_AND_ACCEPTED |
| IMP-027 Refund Foundation | ARCHITECTURE_LOCKED — capability architecture [`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md); Refund aggregate independent of Payment status (D-364); implementation COMPLETE_AND_ACCEPTED |
| IMP-028 Invoice / Tax Receipt / Credit Note | ARCHITECTURE_LOCKED — capability architecture [`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md); Financial Document authority (D-365); RefundStatutoryDecision authority (D-366); SignatureArtifact / signed artifact authority (D-367); ARCH-G16 / ARCH-G17 / ARCH-G18; implementation COMPLETE_AND_ACCEPTED |
| Customer Menu storefront serving | CURRENT — **D-368** server-backed customer Menu READ PROJECTION through existing `customer-commerce` `/api/v1/*`; implemented and accepted under IMP-028B |
| Customer paid-modifier purchase intent | CURRENT policy — **D-369** explicit customer selection required for positive-price modifier options entering Cart; zero-price standard defaults MAY be visibly preselected; implementation NOT_AUTHORIZED by D-369 |
| Cart identity transition | CURRENT policy — **D-370** guest→customer compatible purchase-intent merge and authenticated→signed-out customer-cart isolation; silent whole-cart winner forbidden; implementation NOT_AUTHORIZED by D-370 |
| Durable Cart unit sequence | CURRENT policy — **D-371** durable internal per-unit add ordering for server-owned product-level decrement; implementation bounded by IMP-028D RC3 |

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
| ARCH-G15 | Refund owns financial reversal truth for returned funds; it must not rewrite Payment original collection truth. |
| ARCH-G16 | Once a statutory Financial Document is issued, its sealed commercial, tax, issuer, recipient, numbering, and authority-linkage facts are immutable historical document truth and must not be reconstructed from mutable current catalog, customer profile, tax configuration, legal-entity configuration, Payment state, Refund state, or Order state. |
| ARCH-G17 | RefundStatutoryDecision owns durable statutory-reversal classification for a PROCESSED Refund; it must not rewrite Refund money/provider truth (ARCH-G15 / D-364) and must not mutate issued Financial Documents (ARCH-G16 / D-365). |
| ARCH-G18 | SignatureArtifact owns durable signature state and exact-byte signed statutory artifact authority for Financial Documents requiring BOBA signing (D-367); it must not rewrite Financial Document sealed issuance facts (ARCH-G16 / D-365), RefundStatutoryDecision branch authority (ARCH-G17 / D-366), or Payment/Order commercial truth; `FinancialDocument.status=ISSUED` does not imply signed artifact readiness — **STATUTORY_ARTIFACT_READY** iff `SignatureArtifact.status=SIGNED`. |
| ARCH-G19 | Customer Menu Projection is a storefront READ MODEL over existing catalog/menu, pricing, assortment/availability, modifier, and bundle authorities (D-368); it must not become Catalog identity, Product/MenuItem, Pricing, Availability, inventory, Promotion, Cart, Checkout Snapshot, Payment, or Order authority; Menu display price is not sealed payable truth; Menu display availability is not a new availability decision. |
| ARCH-G20 | A modifier option whose selection increases the current configured-item price relative to the otherwise applicable base/standard configuration (positive `price_delta_paise` or equivalent) MUST NOT become customer purchase intent solely because catalog, import, or frontend metadata marks it as a default (D-369); explicit customer selection in the current purchase interaction is required; zero-price standard/preparation defaults MAY be visibly preselected; recommendation is not selection; Cart remains purchase intent; Checkout Snapshot remains authoritative payable truth. |
| ARCH-G21 | Cart identity transition (D-370): an active guest Cart and an active customer Cart MUST be reconciled into customer-owned purchase intent without silent winner selection; failed reconciliation MUST NOT silently discard or partially destroy source intent; after success the former guest credential is not authority over that customer Cart; sign-out MUST NOT delete the customer Cart but MUST end browser authority over it; post-logout browser context is anonymous and MUST NOT expose or copy the previous customer’s Cart; Customer B on the same browser MUST NOT receive Customer A’s Cart; Cart remains purchase intent; Checkout Snapshot remains authoritative payable truth. |
| ARCH-G22 | Durable Cart unit sequence (D-371): every active coalesced Cart-line unit MUST have exactly one durable server-authoritative unit-sequence record, so active-record count per line equals line quantity transactionally. Product-level decrement MUST atomically select and consume the latest active record for the requested base product and decrement that record’s line under existing Cart concurrency authority; browser/client order is never removal authority. During D-370 identity transition, immutable ordinals and their line relationship MUST move/reconcile atomically without renumbering history. |
| ARCH-G23 | Operations Console API (D-372): workforce business operations MUST use the dedicated `/api/operations/v1/*` trust surface, never customer `/api/v1/*` or the public workforce-auth router. A workforce principal MUST be constructed only from a server-validated workforce session and server-loaded eligible identity; caller-supplied roles, permissions, memberships, scopes, organization/outlet/territory authority, pre-authorized flags, or principal-shaped objects are not authority. Existing permission-and-server-derived-scope authorization and existing Order application/domain authority remain binding. |
| ARCH-G24 | Delivery is the first-class provider-neutral authority for dispatch and delivery-execution truth. Order remains sole commercial lifecycle authority; Operations retains preparation/readiness and operational-handoff authority; Pricing/Checkout historical customer delivery charge remains distinct from Delivery provider cost. Provider observations are evidence, not automatic Delivery or Order truth, and must be normalized, validated, processed idempotently, and handled recoverably. Stable Delivery request/booking identity MUST suppress duplicate logical dispatch, ambiguous external booking outcomes MUST be reconciled before replacement rather than blindly retried, and at most one active booking may exist unless the prior booking has been explicitly reconciled inactive. Provider-specific contracts MUST remain in adapters/evidence boundaries. |

## 15. Decision References

| Topic | Binding record |
|---|---|
| Static frontend + external dynamic transport | [D-356](./decision-register.md) (AMENDED), supersedes ADR-014 Route-Handler-as-canonical HTTP |
| IMP-024 customer-commerce topology | [D-359](./decision-register.md); capability lock [`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md) |
| IMP-024 `/api/v1/*` commerce API convention | [D-360](./decision-register.md) |
| IMP-025 Customer Ordering UX | Capability lock [`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md) (COMPLETE_AND_ACCEPTED); long-term Menu serving TARGET [D-368](./decision-register.md) |
| Customer Menu Read Projection Authority | [D-368](./decision-register.md) (CURRENT serving architecture; implemented and accepted under IMP-028B) |
| Customer Paid Modifier Explicit Selection Authority | [D-369](./decision-register.md) (CURRENT business-commerce policy; positive-price modifier requires explicit current-interaction selection before entering Cart purchase intent; zero-price standard defaults MAY be visibly preselected; Cart/Checkout Snapshot/pricing authority unchanged; implementation not authorized by this decision) |
| Cart Identity Transition Authority | [D-370](./decision-register.md) (CURRENT purchase-intent and privacy policy; guest→customer compatible merge required; silent whole-cart winner forbidden; logout isolates the browser from the customer Cart without deleting it; Cart/Checkout Snapshot/pricing/Payment authority unchanged; implementation not authorized by this decision) |
| Durable Cart Unit Sequence Authority | [D-371](./decision-register.md) (CURRENT internal Cart removal-order authority; coalesced lines and Cart quantity remain authoritative customer purchase intent) |
| Operations Console API workforce-business transport | [D-372](./decision-register.md) (CURRENT architecture lock for dedicated `/api/operations/v1/*`; existing workforce session/principal, permission/scope, and Order authorities remain binding; IMP-029 implementation is not authorized) |
| Provider-Neutral Delivery Foundation | ARCH-R18 / ARCH-G24; capability architecture [`capabilities/IMP-031-provider-neutral-delivery-foundation.md`](./capabilities/IMP-031-provider-neutral-delivery-foundation.md) (`ARCHITECTURE_LOCKED`; implementation AUTHORIZED / NOT_STARTED); no new CURRENT decision |
| V1 production payment provider / collection surface | [D-361](./decision-register.md) (Razorpay / Razorpay Standard Checkout); capability lock [`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md) |
| Razorpay webhook acknowledgement / post-payment Order recovery | [D-362](./decision-register.md) (amends D-361 ack/post-payment effect only; D-361 remains CURRENT for provider selection; acknowledgement timing further amended by D-363) |
| Razorpay durable webhook inbox / asynchronous Payment processing | [D-363](./decision-register.md) (amends D-362 acknowledgement timing only; D-362 remains CURRENT for Order materialization outside provider-ack path, missing-Order recovery, secondary reconciliation, and no new deployable service) |
| Refund Foundation | [D-364](./decision-register.md); capability lock [`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md) (ARCHITECTURE_LOCKED; implementation COMPLETE_AND_ACCEPTED) |
| Financial Document Authority | [D-365](./decision-register.md); capability lock [`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md) (ARCHITECTURE_LOCKED; implementation COMPLETE_AND_ACCEPTED) |
| Refund Statutory Reversal Decision Authority | [D-366](./decision-register.md); capability lock [`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md) (CURRENT binding; refund statutory reversal accepted under the locked IMP-028 capability) |
| Statutory Financial Document Signing / Signed Artifact Authority | [D-367](./decision-register.md); capability lock [`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md) (CURRENT binding; ATTENDED_ASYNC manual signed-PDF MVP accepted; unattended signing remains deferred) |
| Order high-level lifecycle vs deferred kitchen detail | [D-357](./decision-register.md), amends ADR-010 reading |
| Role inventory ownership | [D-358](./decision-register.md); current count in STATE |
| Invoice architecture intent | ADR-007 (implementation = IMP-028; authority locked by D-365 / D-366 / D-367) |
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
