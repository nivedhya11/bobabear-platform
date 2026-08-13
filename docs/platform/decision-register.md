<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "DECISION_AUTHORITY",
  "decisionRegisterVersion": "DR-4",
  "lastReviewed": "2026-08-13"
}
-->

# BOBA Bear — Decision Register

## 1. Register Rules

This register owns **which decisions are binding** and their supersession/amendment relationships.
Detailed rationale and history remain in ADRs and supporting documents.

### Decision statuses (exact)

| Status | Meaning |
|---|---|
| PROPOSED | Draft; not binding |
| CURRENT | Fully binding |
| AMENDED | Still relevant, but binding force is qualified by an explicit amendment |
| SUPERSEDED | No longer binding; retained for history |
| HISTORICAL | Preserved context; not a competing current authority |
| REJECTED | Explicitly not chosen |

Only **CURRENT** decisions are fully binding. **AMENDED** decisions must identify the amendment.
**SUPERSEDED** records remain historical.

### ID rules

- Decision IDs use immutable `D-xxx` identities.
- Historical product/architecture rows in
  [`decision-register-historical.md`](./decision-register-historical.md) (D-001–D-355) remain
  interpretable history under that **HISTORICAL** document. They are not independently CURRENT
  sequencing or transport authority.
- New decisions continue after the highest CURRENT/AMENDED register ID: next ID **D-363**.
- ADR files keep `ADR-xxx` identities. This register references them in the Record column.
  Mapping ADR-014 ↔ D-014 is **not** used here because historical `decision-register-historical.md`
  already assigned D-014 to a different decision (Next.js evolution-in-place).
- Canonical pathname is exactly `docs/platform/decision-register.md` (lowercase; portable across
  case-sensitive and case-insensitive filesystems). Historical inventory uses the distinct name
  `decision-register-historical.md` so both files can coexist on case-insensitive volumes (a prior
  uppercase `DECISION-REGISTER.md` expectation was filesystem-dependent and is not used).

### ADR preservation

Do not rewrite old ADR bodies as though earlier decisions never happened. Use status metadata and
notices; keep history interpretable.

## 2. Current Global Decisions

| ID | Title | Scope | Status | Record | Supersedes | Superseded By | Governs |
|---|---|---|---|---|---|---|---|
| D-356 | Public frontend remains static Next.js export; dynamic ordering/business transport lives outside dynamic Next.js execution | Global / Transport | AMENDED | This register + ADR-014 historical body | ADR-014 Route-Handler-as-canonical HTTP boundary (and related CURRENT readings of D-015/D-051 that required Route Handlers as the product HTTP host) | — (amended by **D-359** for exact IMP-024 topology) | ARCH-G01, ARCH-G02 |
| D-357 | Accepted Order lifecycle is PLACED \| ACCEPTED \| FULFILLED \| CANCELLED; detailed kitchen states (e.g. PREPARING, READY) are deferred detailed fulfilment, not current Order authority | Order / Fulfilment | CURRENT | This register + ADR-010 historical body | Competing CURRENT reading of ADR-010 kitchen workflow as accepted Order lifecycle | — | ARCH-G07, IMP-023 accepted state, deferred detailed fulfilment |
| D-358 | Current accepted system-role inventory is owned by STATE/code (presently 7 roles); ADR-005/D-020 historical “six roles” prose is not a competing current-state authority | Access Control / Inventory | CURRENT | This register + ADR-005 historical body | Competing CURRENT-state reading of ADR-005 role count | — | STATE technical inventory |
| D-359 | IMP-024 customer-commerce topology: one dedicated `customer-commerce` `node:http` thin transport façade behind Nginx `/api/v1/*` on internal port 8083; static Next export retained; `customer-auth` / `workforce-auth` remain separate; no Route Handlers; no per-domain microservices; no speculative infra/schema merely for transport | Global / Transport / IMP-024 | CURRENT | This register + [`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md) | Undecided topology clause of D-356 | — | ARCH-G01, ARCH-G02, ARCH-G14, IMP-024 architecture |
| D-360 | Customer commerce public API convention: `/api/v1/*` (not `/api/v1/customer/*`); auth prefixes `/api/customer-auth/*` and `/api/workforce-auth/*` unchanged; routes map accepted application operations outward without manufacturing domain authority; base error `{ ok:false, code, requestId }`; domain codes authoritative; no `PAYMENT_NOT_RETRYABLE`; Problem Details not selected for IMP-024; Payment idempotency is JSON `idempotencyKey` and Payment-specific | Transport / API / IMP-024 | CURRENT | This register + [`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md) | Competing CURRENT readings that would restore Route-Handler host or Problem Details as IMP-024 commerce envelope | — | IMP-024 public contract |
| D-361 | Razorpay is the V1 production payment provider and Razorpay Standard Checkout is the V1 customer payment collection surface; Razorpay operates behind the existing `PaymentProvider` port inside `customer-commerce` (no Razorpay-specific Payment domain, no new service, no second payment state machine, no new Order materialization); browser Checkout success is not independently authoritative financial truth; webhook ingress is `POST /api/integrations/payments/razorpay/webhook` on `customer-commerce` (not `/api/v1/*`, not a customer API, not a Next.js Route Handler); provider-neutral client evidence is `POST /api/v1/payments/{paymentId}/client-evidence`; `clientAction` kind `razorpay_standard_checkout` carries only browser-safe Checkout initialization; Refund remains IMP-027; webhook acknowledgement / post-payment Order effect semantics are refined by **D-362** without changing provider selection | Payment / Provider / IMP-026 | CURRENT | This register + [`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md) | **D-161** (current V1 provider selection) and **D-162** (current V1 collection-surface selection); Cashfree-specific provider-selection / Hosted Checkout reading of ADR-009 | — (webhook acknowledgement / post-payment Order effect refined by **D-362**; D-361 remains CURRENT for provider selection) | ARCH-G06, ARCH-G10, ARCH-G11, accepted IMP-022 Payment domain, IMP-026 architecture |
| D-362 | Razorpay webhook acknowledgement occurs only after verified Payment evidence is durably accepted/applied; `tryMaterializeOrderAfterPaymentCompletion` is not part of the provider-ack critical path; missing-Order after Payment success is an explicitly recoverable GTM state recovered via existing `recoverMissingOrdersBatch` (or exact current equivalent); no new Payment webhook inbox, deployable worker/service, queue/broker, or Payment schema; automatic scheduled recovery/reconciliation runners are not required by this decision; `queryExecution` / `reconcilePaymentAttempt` remain secondary provider-state recovery, not webhook replacement; duplicate delivery remains safe through existing first-success / provider-event / Order uniqueness authority | Payment / Webhook / Recovery / IMP-026 | CURRENT | This register + [`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md) | — (amends **D-361** webhook acknowledgement / post-payment Order effect semantics only; does not supersede D-361) | — | ARCH-G06, ARCH-G07, ARCH-G14, accepted IMP-022/IMP-023, IMP-026 webhook/recovery |

## 3. Current Capability / Cross-Capability Decisions

Initial DR-1 register focused on decisions required to remove authority ambiguity. DR-2 adds IMP-024
transport CURRENT decisions (D-359, D-360) and amends D-356. DR-3 registers **D-361** Razorpay as
the current V1 production payment provider / Standard Checkout surface, superseding D-161 / D-162
for current provider authority while retaining provider-neutral Payment architecture. DR-4 registers
**D-362**, which amends D-361 only for Razorpay webhook acknowledgement and post-payment Order
recovery semantics; D-361 remains CURRENT for provider selection. ADR inventory status for CURRENT
binding reads:

| ADR | Title | Register status | Notes |
|---|---|---|---|
| ADR-001 | DigitalOcean platform | CURRENT | Cloud hosting foundation |
| ADR-002 | Environments / CI-CD / release | CURRENT | Environment and release model |
| ADR-003 | Modular monolith Node/TS | AMENDED | Module boundaries remain; HTTP host reading constrained by D-356 / D-359 |
| ADR-004 | Identity / authentication / sessions | CURRENT | Distinct customer/workforce trust; see accepted IMP-008–010 refinements in STATE |
| ADR-005 | Organization / outlet authorization | AMENDED | Scoped RBAC CURRENT; role-count inventory → D-358 / STATE |
| ADR-006 | Catalog / assortment / availability | CURRENT | Read with accepted IMP-012–014 separations |
| ADR-007 | Pricing / tax / charges / promotions | CURRENT | Invoice/credit-note **intent** CURRENT; implementation = ROADMAP IMP-028 (not complete) |
| ADR-008 | Serviceability / cart / checkout | AMENDED | Domain foundations CURRENT where aligned with accepted IMP-018–021; superseded details yield to STATE |
| ADR-009 | Payments / webhooks / refunds | AMENDED | Provider-neutral Payment domain CURRENT via IMP-022; Cashfree V1 provider/Hosted Checkout selection superseded by **D-361** (Razorpay / Razorpay Standard Checkout); Razorpay webhook acknowledgement / post-payment Order recovery refined by **D-362**; Razorpay productionization = IMP-026; Refund implementation = IMP-027 |
| ADR-010 | Order lifecycle / operations console | AMENDED | High-level Order ownership CURRENT via D-357 + IMP-023; detailed kitchen workflow and Operations Console implementation are future / deferred |
| ADR-011 | Delivery providers | HISTORICAL / future-binding intent | Not implemented; ROADMAP IMP-031+ |
| ADR-012 | Notifications / WhatsApp | HISTORICAL / future-binding intent | Not implemented; ROADMAP IMP-033+ |
| ADR-013 | PostgreSQL / Drizzle / persistence | CURRENT | Persistence foundation |
| ADR-014 | HTTP API / Route Handlers / contracts | SUPERSEDED (canonical HTTP=Route Handlers) | Historical body preserved; superseded by D-356 for transport host; IMP-024 commerce contract refined by D-359 / D-360 without restoring Route Handlers |
| ADR-015 | Configuration / secrets / feature flags | CURRENT | Config boundary; accepted via IMP-003 |

Where repository evidence was insufficient to assert a finer semantic split inside an ADR without
guessing, status is limited to the rows above rather than inventing a full taxonomy.

## 4. Amended Decisions

| ID / Record | Amendment | Binding remainder |
|---|---|---|
| ADR-003 | D-356 / D-359 | Modular monolith and module boundaries remain; Route Handler as product HTTP host does not; IMP-024 host is `customer-commerce` |
| ADR-005 | D-358 | Scoped RBAC model remains; current role **count** is STATE/code. |
| ADR-008 | Accepted IMP-018–021 | Prefer STATE/accepted code for cart/checkout/serviceability specifics that drifted from early ADR prose. |
| ADR-009 | **D-361** + **D-362** + ROADMAP IMP-026/027 + accepted IMP-022 | Payment domain foundation accepted; Cashfree V1 provider/surface selection superseded for current authority; Razorpay GTM (IMP-026) architecture locked / not started; webhook acknowledgement / missing-Order recovery locked by D-362; Refund not accepted as done. |
| ADR-010 | D-357 | Order post-purchase lifecycle ownership remains; detailed PREPARING/READY kitchen machine is not accepted current Order lifecycle. |
| **D-356** | **D-359** | Static public Next.js export + dynamic transport outside dynamic Next.js remain binding. Exact IMP-024 topology (service/port/proxy) is decided by D-359, not left undecided. |
| **D-361** webhook-ack / post-payment Order effect | **D-362** | D-361 remains CURRENT for Razorpay provider selection, Standard Checkout, `PaymentProvider` adapter, client evidence, webhook path/host, configuration boundary, and no new service. D-362 governs acknowledgement-after-durable-Payment-acceptance, Order materialization outside the provider-ack path, and missing-Order recovery via `recoverMissingOrdersBatch`. |

## 5. Superseded Decisions

| Record | What was superseded | Superseded by |
|---|---|---|
| ADR-014 “Next.js Route Handlers are the canonical HTTP boundary” | Route Handlers as CURRENT product HTTP host for dynamic commerce | D-356 (host) + D-359 (IMP-024 topology) |
| GTM-R1 future IMP meanings in `implementation-roadmap.md` | Future slice numbering / GTM=IMP-035 | [`ROADMAP.md`](./ROADMAP.md) GTM-R2+ |
| Historical **D-161** Cashfree V1 primary payment provider | Current V1 production payment-provider authority | **D-361** |
| Historical **D-162** Cashfree Hosted Checkout V1 collection surface | Current V1 customer payment-collection-surface authority | **D-361** |

## 6. Rejected Decisions

No new REJECTED entries are introduced by DR-2. Historical rejections inside ADRs remain in those
ADR bodies.

## 7. Decision Change Log

### DR-4 — 2026-08-13

- Registered **D-362**: Razorpay webhook acknowledgement and post-payment Order recovery boundary.
- D-362 amends **D-361** only for webhook acknowledgement / post-payment Order effect semantics.
  D-361 remains CURRENT for Razorpay provider selection, Standard Checkout, adapter, client
  evidence, webhook path/host, configuration, and no new service. D-356–D-360 unchanged.
- Locked: HTTP 2xx only after verified Payment evidence is durably accepted/applied; Order
  materialization (`tryMaterializeOrderAfterPaymentCompletion`) is outside the provider-ack
  critical path; missing-Order after Payment success is a GTM-recoverable state via existing
  `recoverMissingOrdersBatch`; no new inbox, worker/service, queue/broker, or Payment schema;
  automatic scheduled recovery/reconciliation runners are not required by D-362;
  `queryExecution` / `reconcilePaymentAttempt` remain secondary provider-state recovery.
- Updated locked capability architecture
  [`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md).
- Next free decision ID advanced to **D-363**.
- Refund remains IMP-027. IMP-026 implementation is not authorized by this decision.

### DR-3 — 2026-08-13

- Registered **D-361**: Razorpay is the V1 production payment provider and Razorpay Standard
  Checkout is the V1 customer payment collection surface.
- Superseded historical **D-161** / **D-162** for current V1 provider / collection-surface
  authority. Original Cashfree selection text remains historical; it is not rewritten as though
  Cashfree was never selected.
- Amended ADR-009 Cashfree provider-selection / Hosted Checkout reading; provider-neutral Payment,
  webhook/query/provider-evidence, and refund-intent remainder remain.
- Linked locked capability architecture
  [`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md).
- D-356–D-360 unchanged. Next free decision ID advanced to **D-362**.
- Refund remains IMP-027. IMP-026 implementation is not authorized by this decision.

### DR-2 — 2026-08-12

- Registered **D-359** IMP-024 `customer-commerce` topology; amended D-356 undecided-topology clause.
- Registered **D-360** customer commerce `/api/v1/*` public API convention and error/idempotency wire rules.
- Linked locked capability architecture
  [`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md).
- Next free decision ID advanced to **D-361**.

### DR-1 — 2026-08-11

- Installed CURRENT decision-authority document.
- Registered D-356 static frontend + external dynamic transport; superseded ADR-014 Route-Handler
  host claim.
- Registered D-357 Order lifecycle clarification relative to ADR-010.
- Registered D-358 role-inventory ownership relative to ADR-005 historical six-role prose.
- Clarified ADR-007 invoice intent remains architectural; implementation maps to IMP-028.
- Declared historical [`decision-register-historical.md`](./decision-register-historical.md) as
  HISTORICAL supporting inventory (D-001–D-355), not competing CURRENT transport/roadmap authority.
- Canonical register path locked to lowercase `decision-register.md`; historical inventory remains
  `decision-register-historical.md` (avoids the prior case-only `DECISION-REGISTER.md` collision on
  case-insensitive filesystems).

## 8. Authority Boundaries

| Question | Authority |
|---|---|
| Which decisions are binding now | **This document (`decision-register.md`)** |
| Detailed rationale / history | ADRs under [`decisions/`](./decisions/) |
| Historical D-001–D-355 inventory | [`decision-register-historical.md`](./decision-register-historical.md) (HISTORICAL) |
| Global architecture summary | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| IMP-024 capability architecture | [`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md) |
| IMP-025 capability architecture | [`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md) |
| IMP-026 capability architecture | [`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md) |
| IMP sequence | [`ROADMAP.md`](./ROADMAP.md) |
| Accepted inventory | [`STATE.md`](./STATE.md) |
