<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "DECISION_AUTHORITY",
  "decisionRegisterVersion": "DR-9",
  "lastReviewed": "2026-08-17"
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
- New decisions continue after the highest CURRENT/AMENDED register ID: next ID **D-368**.
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
| D-361 | Razorpay is the V1 production payment provider and Razorpay Standard Checkout is the V1 customer payment collection surface; Razorpay operates behind the existing `PaymentProvider` port inside `customer-commerce` (no Razorpay-specific Payment domain, no new service, no second payment state machine, no new Order materialization); browser Checkout success is not independently authoritative financial truth; webhook ingress is `POST /api/integrations/payments/razorpay/webhook` on `customer-commerce` (not `/api/v1/*`, not a customer API, not a Next.js Route Handler); provider-neutral client evidence is `POST /api/v1/payments/{paymentId}/client-evidence`; `clientAction` kind `razorpay_standard_checkout` carries only browser-safe Checkout initialization; Refund remains IMP-027; webhook acknowledgement / post-payment Order effect semantics are refined by **D-362** / **D-363** without changing provider selection | Payment / Provider / IMP-026 | CURRENT | This register + [`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md) | **D-161** (current V1 provider selection) and **D-162** (current V1 collection-surface selection); Cashfree-specific provider-selection / Hosted Checkout reading of ADR-009 | — (webhook acknowledgement / post-payment Order effect refined by **D-362**; acknowledgement timing / durable inbox further refined by **D-363**; D-361 remains CURRENT for provider selection) | ARCH-G06, ARCH-G10, ARCH-G11, accepted IMP-022 Payment domain, IMP-026 architecture |
| D-362 | Razorpay Order materialization (`tryMaterializeOrderAfterPaymentCompletion`) stays outside the provider-ack critical path; missing-Order after Payment success is an explicitly recoverable GTM state recovered via existing `recoverMissingOrdersBatch` (or exact current equivalent); no new deployable worker/service, queue, or broker; automatic scheduled recovery/reconciliation runners are not required by this decision; `queryExecution` / `reconcilePaymentAttempt` remain secondary provider-state recovery, not webhook replacement; duplicate delivery remains safe through existing first-success / provider-event / Order uniqueness authority; webhook acknowledgement timing and durable inbox/schema are refined by **D-363** without superseding this decision wholesale | Payment / Webhook / Recovery / IMP-026 | CURRENT | This register + [`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md) | — (amends **D-361** webhook acknowledgement / post-payment Order effect semantics only; does not supersede D-361) | — (webhook acknowledgement timing / durable inbox refined by **D-363**; D-362 remains CURRENT for Order materialization outside provider-ack path, missing-Order recovery, secondary reconciliation, and no new deployable service) | ARCH-G06, ARCH-G07, ARCH-G14, accepted IMP-022/IMP-023, IMP-026 webhook/recovery |
| D-363 | Razorpay durable webhook inbox and asynchronous provider-event processing: verified webhook evidence is durably inserted into dedicated Postgres `payment_provider_event_inbox` (not `payment_provider_observations`) before HTTP 2xx; acknowledgement does not wait for `applyProviderEvidence`, Payment locking/transitions, provider reconciliation, or Order materialization; inbox is claimed/processed asynchronously by existing `customer-commerce` (no new deployable service, queue, or broker); one BOBA Bear Payment Attempt = one Razorpay Order; Razorpay Standard Checkout internal retry is disabled; BOBA `retryPayment` owns retry; only Razorpay captured financial state is authoritative Payment success (authorized remains non-success/pending); automatic capture is the IMP-026 collection model; deterministic unique provider receipt from Attempt/execution identity; uncertain Razorpay Order-create recovers existing provider Order before recreate; Refund remains IMP-027; Payment/provider ingress schema change required (one future migration) | Payment / Webhook / Inbox / IMP-026 | CURRENT | This register + [`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md) | — (amends **D-362** webhook acknowledgement timing only; does not supersede D-362 wholesale) | — | ARCH-G06, ARCH-G07, ARCH-G13, ARCH-G14, accepted IMP-022/IMP-023, IMP-026 webhook durability |
| D-364 | Refund Foundation: Refund is a first-class durable financial-reversal aggregate independent of Payment lifecycle status; Payment `SUCCEEDED` remains original collection truth after partial/full refund; full/partial/multiple partial refunds are supported with reservation invariant `successfulRefundedAmount + reservedRefundAmount ≤ capturedAmount` under Payment row lock; provider refund capabilities extend existing `PaymentProvider` (no separate Refund microservice); durable provider refund idempotency key is deterministic from BOBA Refund ID (`X-Refund-Idempotency`); refund webhooks reuse `POST /api/integrations/payments/razorpay/webhook` + `payment_provider_event_inbox` under D-363 ack discipline with refund correlation via provider refund id (not payment-order-only); V1 speed = normal only; no customer Refund API; Ops Console transport/UI deferred to IMP-029/030; no invoice/credit-note generation (IMP-028); no automatic Order status rewrite; schema change required at implementation | Refund / Payment / IMP-027 | CURRENT | This register + [`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md) | Competing readings that rewrite Payment success on refund, bury refunds in Payment metadata, infer refund completion from provider Payment status alone, or require a new Refund deployable service | — | ARCH-G02, ARCH-G05, ARCH-G06, ARCH-G07, ARCH-G09, ARCH-G10, ARCH-G13, ARCH-G14, ARCH-G15, D-361, D-362, D-363 |
| D-365 | Financial Document Authority and Immutable Issuance Model: IMP-028 introduces a first-class immutable Financial Document authority as the sole BOBA authority for issued statutory/financial documents; consumes but does not rewrite Checkout Snapshot, Payment, Refund, Order, or effective Issuer/Tax Profile; conditional statutory classes are TAX_INVOICE, BILL_OF_SUPPLY, RECEIPT_VOUCHER, REFUND_VOUCHER, CREDIT_NOTE (no statutory TAX_RECEIPT — roadmap “Tax Receipt” is customer experience/projection); Section 34 CREDIT_NOTE requires prior TAX INVOICE(S) only (not “Tax Invoice or Bill of Supply”); BoS-only automatic Credit Note prohibited / fail-closed; supports advance Receipt→Tax Invoice / Refund Voucher and invoice-at-payment→Credit Note as issuance-policy variants without selecting final production tax policy; Refund lifecycle (D-364) unchanged and must not encode document semantics; issuance seals issuer/tax facts and fails closed on incomplete configuration; owns concurrency-safe statutory numbering/idempotency (ORD-* and provider ids are not GST numbers); rendering is projection; B2C boundary retained (no B2B customer GSTIN capture); production GST/policy facts remain unresolved configuration gates | Financial Document / Tax / IMP-028 | CURRENT | This register + [`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md) | Competing readings that bury statutory documents in Checkout/Payment/Refund/Order, invent TAX_RECEIPT as a statutory type, treat BoS-only supply as Section 34 Credit Note precondition, hard-code production GST facts, or treat PDF bytes as sole document truth | — (refund statutory-reversal decision authority layered by **D-366**; D-365 remains CURRENT for issued Financial Document immutability and statutory classes) | ARCH-G05, ARCH-G06, ARCH-G07, ARCH-G13, ARCH-G14, ARCH-G15, ARCH-G16, D-364, ADR-007 invoice intent |
| D-366 | Refund Statutory Reversal Decision Authority: first-class durable `RefundStatutoryDecision` (exactly one per Refund) layers on D-364 Refund money truth and D-365 issued Financial Document immutability without superseding either; on Refund → PROCESSED create/ensure PENDING decision (refund success never depends on statutory decision/FD issuance); lifecycle PENDING → BRANCH_FINALIZED → ISSUED (or PENDING → BRANCH_FINALIZED(NO_STATUTORY_DOCUMENT)); final dispositions REFUND_VOUCHER \| CREDIT_NOTE \| NO_STATUTORY_DOCUMENT are write-once; REFUND_VOUCHER requires PROCESSED + exact prior RECEIPT_VOUCHER + durable no-supply (`Order.status=CANCELLED` on exact graph currently) + no applicable TAX_INVOICE + sealed source/allocation; pre-Order automatic RFV remains FAIL_CLOSED; CREDIT_NOTE requires PROCESSED + exact prior TAX_INVOICE + structured Section-34 qualification + sealed source/allocation (BoS-only automatic CN remains prohibited); no generic proportional allocator; logical issuance identity `refund:<refundId>:STATUTORY_REVERSAL` for both RFV/CN; NO_STATUTORY_DOCUMENT requires structured operator decision with positive cited authority (never inferred from absence/config/recovery gaps); statutory `issueAt` sealed only at successful FD issuance atomically with decision `issuedAt` (not `Refund.processedAt` / not classification time); D-362-style branch-aware recovery consumes sealed decision and never recalculates a FINALIZED branch; forward-only persistence migration required at implementation (not created by this decision) | Refund / Financial Document / Statutory Reversal / IMP-028 | CURRENT | This register + [`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md) | Competing readings that infer RFV from missing Tax Invoice, encode document semantics in Refund status, invent pre-Order no-supply, use generic partial allocators, backdate statutory issueAt from Refund.processedAt, or treat missing evidence/config as NO_STATUTORY_DOCUMENT | — | ARCH-G05, ARCH-G06, ARCH-G07, ARCH-G13, ARCH-G14, ARCH-G15, ARCH-G16, ARCH-G17, D-362, D-364, D-365 |
| D-367 | Statutory Financial Document Signing and Signed Artifact Authority: layers on **D-365** issued Financial Document immutability and applies to Financial Documents eventually issued under **D-366** without changing RefundStatutoryDecision branch authority; BOBA product policy treats signature/digital signature as required for RECEIPT_VOUCHER, REFUND_VOUCHER, and CREDIT_NOTE (**CONSERVATIVE_PRODUCT_POLICY**); TAX_INVOICE Rule-46 electronic-invoice exception applicability to BOBA current generated PDF remains **UNRESOLVED_RULE46_EXCEPTION** while BOBA requires TAX_INVOICE signing through the same SignatureArtifact mechanism (**REQUIRED_BY_BOBA_PRODUCT_POLICY**, not **GST_REQUIRES_TI_SIGNATURE**); insufficient visual substitutes include typed supplier name, “Authorised Signatory” text, pasted/scanned/facsimile signature images, and system-generated footers (**BOBA_COMPLIANCE_PRODUCT_POLICY**, not independent categorical GST invalidity proof); Document Signer Certificate must not be sole authority for supplier/authorised-representative signature (**DOCUMENT_SIGNER_AS_SOLE_SIGNATURE_AUTHORITY: PROHIBITED**); initial operating model **ATTENDED_ASYNC_SIGNING** (commercial event → FD facts/number seal → SignatureArtifact PENDING → attended signing → durable exact-byte artifact → SIGNED → customer signed-PDF download; Payment/Order truth never rolls back for signing pending/failure); `FinancialDocument.status=ISSUED` seals statutory facts/number/issueAt only (**SEALED_FACTS_AND_NUMBER**); **STATUTORY_ARTIFACT_READY** iff `SignatureArtifact.status=SIGNED` without mutating FD status; `issueAt` and `signedAt` are separate actual facts (never backdated/rewritten); effective-dated **AuthorisedSignerProfile** concept distinct from IssuerProfile; signature custody prohibits BOBA server retaining employee/personal subscriber private keys for automation, shared employee/personal DSC, unattended PIN/token bypass, and Document Signer as authorised-signatory substitute; exactly one SignatureArtifact authority per signing-required FD (PENDING → SIGNED; FAILED_RETRYABLE/REJECTED allowed; success immutable); signed PDF exact bytes durably preserved with content hash and no overwrite; vendor-neutral immutable artifact storage (`putImmutable`/`getExact`/hash verify/no overwrite/retention); customer signed-PDF download denied until SIGNED; signing failure must not renumber or create competing successful artifacts; Payment SUCCEEDED→RECEIPT_VOUCHER and Order FULFILLED→TAX_INVOICE workflows remain independent; Receipt Voucher operational target same business-day signing cycle (**OPERATIONAL_COMPLIANCE_POLICY**, not **STATUTORY_MAXIMUM_DELAY**); long-term verification prefers PAdES-compatible PDF-embedded CMS/PKCS#7 with LTV baseline and LTA/timestamp where deployment supports (not claimed as GST-mandated); HTML remains informational projection not durable signed artifact; forward-only persistence required for AuthorisedSignerProfile, SignatureArtifact, storage refs/hash/evidence (migration not created by this decision); production activation requires explicit deployment gates (signer identity, organisational authority, permitted mechanism, CA/ESP/provider, custody, immutable store, verification config) | Financial Document / Signing / Statutory Artifact / IMP-028 | CURRENT | This register + [`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md) | Competing readings that treat visual/footer substitutes as sufficient statutory signing, use Document Signer Certificate as sole authorised-signatory authority, conflate FD ISSUED with signed artifact readiness, backdate signedAt to issueAt, roll back Payment/Order on signing failure, allocate second statutory numbers on sign retry, or claim unattended authorised-signatory signing is currently proven | — (layers on **D-365**; applies to D-366-issued RFV/CN without changing RefundStatutoryDecision authority; **D-366** remains CURRENT) | ARCH-G05, ARCH-G06, ARCH-G07, ARCH-G13, ARCH-G14, ARCH-G16, ARCH-G17, ARCH-G18, D-365, D-366 |

## 3. Current Capability / Cross-Capability Decisions

Initial DR-1 register focused on decisions required to remove authority ambiguity. DR-2 adds IMP-024
transport CURRENT decisions (D-359, D-360) and amends D-356. DR-3 registers **D-361** Razorpay as
the current V1 production payment provider / Standard Checkout surface, superseding D-161 / D-162
for current provider authority while retaining provider-neutral Payment architecture. DR-4 registers
**D-362**, which amends D-361 only for Razorpay webhook acknowledgement and post-payment Order
recovery semantics; D-361 remains CURRENT for provider selection. DR-5 registers **D-363**, which
amends D-362 only for Razorpay webhook acknowledgement timing / durable inbox / asynchronous
Payment processing; D-362 remains CURRENT for Order materialization outside the provider-ack path,
missing-Order recovery, secondary reconciliation, and no new deployable service. DR-6 registers
**D-364** Refund Foundation for IMP-027. DR-7 registers **D-365** Financial Document Authority and
Immutable Issuance Model for IMP-028. DR-8 registers **D-366** Refund Statutory Reversal Decision
Authority as a new binding layer on D-364 + D-365 for IMP-028 refund statutory reversal (does not
supersede D-364 or D-365). DR-9 registers **D-367** Statutory Financial Document Signing and Signed
Artifact Authority as a new binding layer on D-365 for IMP-028 signing (applies to D-366-issued
RFV/CN without changing RefundStatutoryDecision authority; does not supersede D-365 or D-366). ADR
inventory status for CURRENT binding reads:

| ADR | Title | Register status | Notes |
|---|---|---|---|
| ADR-001 | DigitalOcean platform | CURRENT | Cloud hosting foundation |
| ADR-002 | Environments / CI-CD / release | CURRENT | Environment and release model |
| ADR-003 | Modular monolith Node/TS | AMENDED | Module boundaries remain; HTTP host reading constrained by D-356 / D-359 |
| ADR-004 | Identity / authentication / sessions | CURRENT | Distinct customer/workforce trust; see accepted IMP-008–010 refinements in STATE |
| ADR-005 | Organization / outlet authorization | AMENDED | Scoped RBAC CURRENT; role-count inventory → D-358 / STATE |
| ADR-006 | Catalog / assortment / availability | CURRENT | Read with accepted IMP-012–014 separations |
| ADR-007 | Pricing / tax / charges / promotions | CURRENT | Invoice/credit-note **intent** CURRENT; Financial Document authority locked by **D-365** / IMP-028 capability artifact; refund statutory-reversal decision authority locked by **D-366**; statutory signing / signed artifact authority locked by **D-367** (architecture locked; implementation authorized / started / in progress; not accepted) |
| ADR-008 | Serviceability / cart / checkout | AMENDED | Domain foundations CURRENT where aligned with accepted IMP-018–021; superseded details yield to STATE |
| ADR-009 | Payments / webhooks / refunds | AMENDED | Provider-neutral Payment domain CURRENT via IMP-022; Cashfree V1 provider/Hosted Checkout selection superseded by **D-361** (Razorpay / Razorpay Standard Checkout); Razorpay webhook acknowledgement / post-payment Order recovery refined by **D-362**; webhook acknowledgement timing / durable inbox refined by **D-363**; Refund Foundation architecture locked by **D-364** / IMP-027 capability artifact; Financial Document architecture locked by **D-365** / IMP-028; refund statutory-reversal decision authority locked by **D-366**; statutory signing / signed artifact authority locked by **D-367** (implementation authorized / started / in progress; not accepted); Razorpay productionization = IMP-026 |
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
| ADR-009 | **D-361** + **D-362** + **D-363** + **D-364** + **D-365** + **D-366** + **D-367** + ROADMAP IMP-026/027/028 + accepted IMP-022 | Payment domain foundation accepted; Cashfree V1 provider/surface selection superseded for current authority; Razorpay GTM (IMP-026) architecture locked / pending acceptance; webhook acknowledgement / missing-Order recovery locked by D-362; durable webhook inbox / asynchronous Payment processing locked by D-363; Refund Foundation architecture locked by D-364; Financial Document architecture locked by D-365; refund statutory-reversal decision authority locked by D-366; statutory signing / signed artifact authority locked by D-367 (implementation authorized / started / in progress / not accepted). |
| ADR-010 | D-357 | Order post-purchase lifecycle ownership remains; detailed PREPARING/READY kitchen machine is not accepted current Order lifecycle. |
| **D-356** | **D-359** | Static public Next.js export + dynamic transport outside dynamic Next.js remain binding. Exact IMP-024 topology (service/port/proxy) is decided by D-359, not left undecided. |
| **D-361** webhook-ack / post-payment Order effect | **D-362** | D-361 remains CURRENT for Razorpay provider selection, Standard Checkout, `PaymentProvider` adapter, client evidence, webhook path/host, configuration boundary, and no new service. D-362 governs Order materialization outside the provider-ack path and missing-Order recovery via `recoverMissingOrdersBatch`. Webhook acknowledgement timing is further amended by **D-363**. |
| **D-362** webhook acknowledgement timing | **D-363** | D-362 remains CURRENT for Order materialization outside the provider-ack path, missing-Order recovery via `recoverMissingOrdersBatch`, secondary reconciliation (`queryExecution` / `reconcilePaymentAttempt`), and no new deployable service. D-363 governs durable webhook inbox insert before HTTP 2xx and asynchronous Payment processing inside `customer-commerce`. |

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

### DR-9 — 2026-08-17

- Registered **D-367**: Statutory Financial Document Signing and Signed Artifact Authority for
  IMP-028.
- Layers on **D-365** (issued Financial Document immutability unchanged); applies to Financial
  Documents eventually issued under **D-366** without changing RefundStatutoryDecision branch
  authority; does not supersede **D-365** or **D-366**.
- Locked: BOBA signing product policy for RECEIPT_VOUCHER / REFUND_VOUCHER / CREDIT_NOTE;
  TAX_INVOICE signing required by BOBA product policy with Rule-46 applicability unresolved;
  insufficient visual/footer substitutes; Document Signer Certificate prohibited as sole
  authorised-signatory authority; **ATTENDED_ASYNC_SIGNING** operating model; FD `ISSUED` semantics
  vs **STATUTORY_ARTIFACT_READY**; separate `issueAt` / `signedAt`; **AuthorisedSignerProfile**
  concept; signature custody boundaries; exactly one **SignatureArtifact** authority per
  signing-required FD; durable exact-byte signed artifact + vendor-neutral immutable storage;
  customer unsigned statutory PDF download denied; signing failure recovery without renumber;
  Payment/Order workflow independence; Receipt Voucher same-business-day operational signing target;
  long-term verification baseline; HTML projection not signed artifact; forward-only persistence
  required at implementation (migration not created by this decision); production deployment gates
  explicit and unresolved.
- Capability architecture updated at
  [`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md).
- Global architecture → ARCH-R12 (ARCH-G18 SignatureArtifact / signed artifact authority).
- Compliance status recorded: `FD_NON_SIGNATURE_COMPLIANCE_CORRECTION: COMPLETE`;
  `SIGNATURE_COMPLIANCE: GAP`; `PRE_EXISTING_IMP028_COMPLIANCE_DEFECT: YES`.
- Next free decision ID advanced to **D-368**.
- Does not implement signing, create migration, choose vendor, accept IMP-026/IMP-026C/IMP-027/
  IMP-028, mark IMP-028 complete, implement D-366, or start IMP-029.

### DR-8 — 2026-08-16

- Registered **D-366**: Refund Statutory Reversal Decision Authority for IMP-028.
- Layers on **D-364** (Refund money/provider truth unchanged) and **D-365** (issued Financial
  Document immutability unchanged); does not supersede either.
- Locked: first-class durable `RefundStatutoryDecision` (1:1 with Refund); create/ensure PENDING
  when Refund becomes PROCESSED; refund success independent of statutory decision/FD issuance;
  lifecycle PENDING → BRANCH_FINALIZED → ISSUED (or BRANCH_FINALIZED with
  NO_STATUTORY_DOCUMENT); final dispositions REFUND_VOUCHER | CREDIT_NOTE |
  NO_STATUTORY_DOCUMENT are write-once; positive RFV/CN finalization gates; current automatic
  durable no-supply = `Order.status=CANCELLED` on exact commercial graph; pre-Order automatic RFV
  FAIL_CLOSED; structured Section-34 qualification; no generic proportional allocator; logical
  issuance identity `refund:<refundId>:STATUTORY_REVERSAL`; Option-D statutory issueAt at
  successful FD issuance; D-362-style branch-aware recovery; forward-only persistence migration
  required at implementation (not created by this decision).
- Capability architecture updated at
  [`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md).
- Global architecture → ARCH-R11 (ARCH-G17 RefundStatutoryDecision authority).
- Next free decision ID advanced to **D-367**.
- Does not implement refund statutory reversal, create the migration, accept IMP-026/IMP-026C/
  IMP-027/IMP-028, mark IMP-028 complete, fix pre-existing IMP-028 compliance defects, or start
  IMP-029.

### DR-7 — 2026-08-15

- Registered **D-365**: Financial Document Authority and Immutable Issuance Model for IMP-028.
- Locked: Financial Document as first-class immutable issued statutory/financial-document
  authority; consumes Checkout Snapshot / Payment / Refund / Order / effective Issuer-Tax Profile
  without rewriting them; conditional statutory classes TAX_INVOICE, BILL_OF_SUPPLY,
  RECEIPT_VOUCHER, REFUND_VOUCHER, CREDIT_NOTE; no statutory TAX_RECEIPT; Section 34 Credit Note
  requires prior Tax Invoice(s) only; BoS-only automatic Credit Note prohibited / fail-closed;
  advance and invoice-at-payment issuance-policy variants without selecting final production tax
  policy; D-364 Refund lifecycle unchanged; issuance seals issuer/tax facts and fails closed on
  incomplete configuration; concurrency-safe numbering/idempotency; rendering is projection; B2C
  boundary retained; production GST/policy facts remain unresolved configuration gates.
- Capability architecture locked at
  [`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md).
- Global architecture → ARCH-R10 (Financial Document domain + ARCH-G16).
- Next free decision ID advanced to **D-366**.
- Does not authorize IMP-028 implementation, accept IMP-026/IMP-026C/IMP-027, or start IMP-029.

### DR-6 — 2026-08-14

- Registered **D-364**: Refund Foundation for IMP-027.
- Locked: Refund as first-class durable aggregate independent of Payment status; Payment
  `SUCCEEDED` remains collection truth; full/partial/multiple partial refunds with reservation
  invariant; `PaymentProvider` refund extension; deterministic provider idempotency;
  reuse D-363 webhook inbox/endpoint with refund-id correlation; normal speed only; no customer
  Refund API; Ops Console deferred to IMP-029/030; IMP-028 owns financial documents; no automatic
  Order rewrite; schema change required at implementation.
- Capability architecture locked at
  [`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md).
- Next free decision ID advanced to **D-365**.
- Does not authorize IMP-027 implementation, accept IMP-026/IMP-026C, or start IMP-028.

### DR-5 — 2026-08-13

- Registered **D-363**: Razorpay durable webhook inbox and asynchronous provider-event processing.
- D-363 amends **D-362** only for webhook acknowledgement timing. D-362 remains CURRENT for Order
  materialization outside the provider-ack path, missing-Order recovery via
  `recoverMissingOrdersBatch`, secondary reconciliation, and no new deployable service. D-361
  remains CURRENT for Razorpay provider selection. D-356–D-360 unchanged.
- Locked: HTTP 2xx only after verified provider evidence is durably accepted into dedicated
  Postgres `payment_provider_event_inbox` (or already known as a durable duplicate); acknowledgement
  does not wait for Payment locking/transitions, `applyProviderEvidence`, reconciliation, or Order
  materialization; inbox processing is a small claim/process loop inside existing
  `customer-commerce`; one BOBA Attempt = one Razorpay Order; Razorpay Checkout internal retry
  disabled; only captured financial state is authoritative success; automatic capture; deterministic
  provider receipt with recover-before-recreate on uncertain Order create; Payment/provider ingress
  schema change required (one future migration; not created by this decision).
- Updated locked capability architecture
  [`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md).
- Next free decision ID advanced to **D-364**.
- Refund remains IMP-027. IMP-026 implementation is not authorized by this decision.

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
| IMP-027 capability architecture | [`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md) |
| IMP-028 capability architecture | [`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md) |
| IMP sequence | [`ROADMAP.md`](./ROADMAP.md) |
| Accepted inventory | [`STATE.md`](./STATE.md) |
