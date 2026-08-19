<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "DECISION_AUTHORITY",
  "decisionRegisterVersion": "DR-12",
  "lastReviewed": "2026-08-18"
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
- New decisions continue after the highest CURRENT/AMENDED register ID: next ID **D-371**.
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
| D-368 | Customer Menu Read Projection Authority: the BOBA Direct customer Menu is a server-backed customer-facing READ PROJECTION / STOREFRONT PROJECTION composed from existing authoritative commerce data; accepted IMP-028B implements it in place of static `ordering-catalog.json` storefront delivery without retroactively invalidating accepted IMP-025 implementation; CUSTOMER MENU PROJECTION is a read model and is NOT Catalog identity, Product/MenuItem, Pricing, Availability, inventory, Promotion, Cart, Checkout, Checkout Snapshot, Payment, or Order authority and must not become a duplicate source of truth; DISPLAY PRICE on Menu ≠ sealed payable amount; DISPLAY AVAILABILITY = projection of current authoritative availability, not a new availability decision; existing Checkout authority continues to revalidate before purchase and produces the authoritative Checkout Snapshot; no frontend-projected Menu value becomes final commercial truth merely because the Menu projection returned it; the Menu projection is exposed through the existing customer-commerce `/api/v1/*` façade (D-356 / D-359 / D-360) without D-368 locking an exact HTTP payload; D-368 itself did not authorize implementation, activate IMP-029, create a new IMP, or decide Menu UX/layout, category navigation, Most Ordered ranking, search, personalization, Offers auto-apply, Drop authority, Rewards, Culture, Wear, Favorites, Order Again, cart merge/logout, paid-modifier defaults, special instructions, new pricing policy, or new serviceability policy | Customer Menu / Storefront Projection | CURRENT | This register + [`ARCHITECTURE.md`](./ARCHITECTURE.md) + IMP-025 amendment notice in [`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md) | IMP-025 future-facing exclusion of a public Menu API and lock of static customer catalog delivery as long-term serving architecture only (accepted IMP-025 implementation, catalog identity/import, catalog/menu schema, product identity, pricing, Cart rules, Checkout Snapshot rules, and other accepted IMP-025 behavior unrelated to Menu read delivery remain) | — | ARCH-G01, ARCH-G05, ARCH-G11, ARCH-G19, D-356, D-359, D-360, ADR-006 effective-menu / checkout revalidation, accepted IMP-012–016 / IMP-020–021 |
| D-369 | Customer Paid Modifier Explicit Selection Authority: for BOBA Direct customer commerce, a modifier selection that causes a positive incremental charge MUST NOT become customer purchase intent solely because it is configured as a catalog/default selection; POSITIVE_PRICE_MODIFIER = a `catalog_modifier_group_options` selection whose corresponding `price_book_modifier_prices.price_delta_paise` (or equivalent repository-native option pricing) is greater than 0, i.e. whose selection increases the current configured-item price relative to the otherwise applicable base/standard configuration (examples when represented as modifier selections: Extra Boba +₹30, Extra Cheese +₹30, Extra Patty +₹60, Large +₹40); a positive-price modifier requires an explicit customer selection in the current purchase interaction before that modifier may be added to or retained as customer purchase intent; catalog metadata, a frontend render default, backend `default_quantity` (or equivalent catalog default), an import default, a previous customer's preference, and a saved/reordered configuration are insufficient unless a future authorized capability's current-interaction/revalidation semantics explicitly preserve/select that paid choice (D-369 does not design Saved Configuration or Order Again); a zero-price standard/preparation option MAY be preselected where it represents the normal/default product configuration and MUST remain customer-visible when the customization surface is present (D-369 does not require every zero-cost choice to have a default and does not lock exact UX); if a required modifier group (`catalog_variant_modifier_groups.min_total_quantity` ≥ 1 or equivalent) has a zero-price standard option, that option MAY be visibly preselected; if a required group has no zero-price/default configuration and every available customer choice creates an incremental charge, the customer must explicitly choose an option before the configured item can be added/updated — do not silently choose one paid option to satisfy min-selection constraints; a paid option MAY be recommended, visually highlighted, labeled popular, or surfaced first where separate product/UX policy allows, but recommendation MUST NOT equal selection; zero-price removal/preparation preferences do not violate the paid-selection rule (D-369 does not create a removal domain type, introduce negative modifier pricing, or decide whether removal changes price beyond existing authority); Cart remains customer purchase intent and Checkout Snapshot remains authoritative payable commercial truth; D-369 governs whether paid modifier intent may legitimately enter Cart and does not make Cart final pricing authority; Checkout continues to revalidate product, modifier validity, availability, pricing, promotions, tax, and charges under existing accepted authority and may reject invalid/stale intent but must not silently add a paid modifier the customer did not select; unavailable paid modifier → reject/require resolution, not replace with another paid modifier or silently add an alternative (ADR-006 no-silent-substitution remains CURRENT; D-369 does not duplicate that authority); current schema may technically permit positive `price_delta_paise` + positive `default_quantity` — D-369 does not change schema; a future authorized customer-customization implementation must ensure such catalog configuration cannot silently create paid customer intent, without prescribing schema constraint, import validation, API validation, or UI-only validation as the sole mechanism; live imported catalog currently has `expected_zeros.modifier_groups: 0` so D-369 has no immediate customer-transaction migration or compatibility effect; does not authorize implementation, activate IMP-029, create a new IMP, or decide exact modifier-group schema, typed SIZE/SWEETNESS/ICE enums, customization UI, product-detail route, special instructions, bundles/combos, Most Ordered, Menu API / D-368 implementation, cart merge/logout, Order Again, Saved Configuration / My Usual, Favorites, Offers auto-apply, Drops, Rewards, Culture, Wear, discount policy, refund policy, or pricing formulas | Customer Commerce / Food Modifiers / Purchase Intent | CURRENT | This register + [`ARCHITECTURE.md`](./ARCHITECTURE.md) + ADR-006 CURRENT-read notice | Competing readings that catalog `default_quantity` (or equivalent), frontend render defaults, import defaults, previous-customer preference, or saved/reordered configuration may silently create paid customer purchase intent | — | ARCH-G05, ARCH-G11, ARCH-G20, ADR-006 modifier structure / no-silent-substitution / checkout revalidation, accepted IMP-012–014 / IMP-020–021 |
| D-370 | Cart Identity Transition Authority: for BOBA Direct customer commerce, Cart remains mutable customer purchase intent and is NOT final Pricing, Availability, Checkout, Checkout Snapshot, Payment, or Order authority; D-370 governs Cart ownership transition and purchase-intent preservation only; when a browser has an active guest/anonymous Cart and the authenticated customer also has an existing active customer-owned Cart, BOBA MUST reconcile the two purchase-intent sets into merged/reconciled customer-owned purchase intent rather than silently choosing one and discarding the other; policies equivalent to guest-always-wins, customer-always-wins, newest-always-wins, or largest-cart-wins are FORBIDDEN where the losing Cart contains purchase intent that is silently discarded; no Cart may be destructively discarded solely because authentication changed; if one Cart is empty, normal ownership transfer/reuse does not violate this rule; existing configured-line identity remains (same MenuItem/variant + same current configured selection identity = equivalent configured Cart line); equivalent configured lines MAY combine quantity where existing domain rules permit; different configured selections MUST remain distinct purchase intent (example: Honey Dew Regular / Less Sweet is not equivalent to Honey Dew Large / Extra Boba); D-370 does not create a new configured-line identity algorithm; if both purchase-intent sets cannot be reconciled into a valid customer Cart without violating existing Cart invariants or losing intent, the system MUST NOT silently discard or silently rewrite customer intent — the transition must surface/record a resolvable conflict under a future authorized UX, or fail reconciliation safely while preserving source purchase intent; a failed reconciliation must not leave one source Cart partially destroyed merely because part of the merge succeeded (failure atomicity at policy level; exact transaction/DB mechanism not locked); merged Cart remains purchase intent and merge itself does NOT guarantee availability, final price, offer eligibility, delivery/serviceability, or payable total; existing evaluation/Checkout authority continues to revalidate; D-370 must not turn Cart merge into a commercial-quote operation; after successful guest→customer reconciliation the resulting Cart is CUSTOMER OWNED and the former anonymous/guest credential/token MUST NOT remain authority for reading or mutating that customer-owned Cart (exact token invalidation/storage mechanism not locked); D-370 binds transition semantics, not an exact HTTP endpoint or React moment — a future authorized implementation may reconcile immediately after successful authentication or before authenticated commerce continues, provided the customer is not presented with an ambiguous state where one Cart has silently disappeared; reconciliation is NOT locked to Checkout only; sign-out MUST NOT delete the customer's durable active Cart merely because the customer session ended; the customer-owned Cart remains associated with the customer under normal Cart lifecycle/expiry rules; after sign-out the browser MUST lose authority to read or mutate that customer-owned Cart; post-logout browser commerce context = ANONYMOUS / GUEST and MUST NOT expose the previous customer's Cart, Cart contents, customer-owned Cart identifier or authority, or customer-only profile/address/order data; a new anonymous Cart may be created or resumed only according to valid anonymous Cart authority; do NOT copy the customer's Cart into an anonymous Cart as a logout side effect; when the same customer later authenticates, their existing valid customer-owned Cart may be resumed/reconciled according to current Cart lifecycle rules — D-370 does NOT establish indefinite persistence; if Customer A signs out and Customer B later signs in on the same browser, Customer B MUST NOT receive authority to Customer A's Cart; any anonymous Cart created after Customer A signed out belongs to the anonymous browser context and may later be reconciled only with the legitimately authenticated customer's Cart according to D-370; a browser credential that previously referenced guest purchase intent must not act as a backdoor to a Cart after that Cart becomes customer-owned; logout must not leave browser-accessible customer Cart authority; D-370 does not prescribe localStorage vs sessionStorage, cookie vs header, exact token rotation, or exact token deletion unless existing architecture already requires a specific mechanism; existing Cart revision/concurrency authority is preserved and must not be weakened; if reconciliation races with another Cart mutation, the future implementation must use existing/new authorized concurrency semantics to avoid silent lost purchase intent (algorithm not designed here); does not authorize implementation, activate IMP-029, create a new IMP, or decide exact merge API/algorithm/HTTP payload, exact UI copy, merge dialog design, Cart expiry duration, multi-device Cart synchronization UX, Menu projection implementation, customization implementation, D-369 enforcement mechanism, Saved Configuration / My Usual, Order Again, Favorites, Offers auto-apply, Drop authority, Rewards, Culture, Wear, Checkout pricing, Payment, Refund, or customer account deletion/retention policy | Customer Commerce / Cart Ownership / Authentication Transition | CURRENT | This register + [`ARCHITECTURE.md`](./ARCHITECTURE.md) + IMP-025 amendment notice in [`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md) + ADR-008 CURRENT-read notice | IMP-025 / IMP-026C future-facing lock of guest→customer identity transition exclusively at Checkout; KEEP_GUEST / KEEP_CUSTOMER as whole-cart silent winner; ADR-008 future-facing readings that would permit silently discarding one Cart's purchase intent solely because authentication changed | — | ARCH-G09, ARCH-G11, ARCH-G21, ADR-004 anonymous-cart identity, ADR-008 cart ownership after authentication (qualified), accepted IMP-009 / IMP-020 / IMP-021 / IMP-025 / IMP-026C |

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
RFV/CN without changing RefundStatutoryDecision authority; does not supersede D-365 or D-366). DR-10
registers **D-368** Customer Menu Read Projection Authority as the TARGET customer Menu serving
architecture (server-backed storefront READ PROJECTION over existing commerce authorities). D-368
supersedes only IMP-025’s future-facing public-Menu-API exclusion / static-catalog long-term serving
lock; it does not invalidate accepted IMP-025 implementation and does not create a new commercial
authority. DR-11 registers **D-369** Customer Paid Modifier Explicit Selection Authority as CURRENT
business-commerce policy: a positive-price modifier must not become customer purchase intent solely
because it is a catalog/default selection. D-369 does not change modifier schema, Cart/Checkout
Snapshot/pricing authority, or authorize customization implementation. DR-12 registers **D-370**
Cart Identity Transition Authority as CURRENT purchase-intent and privacy policy for anonymous →
authenticated and authenticated → signed-out Cart ownership transitions. D-370 does not change Cart
commercial authority, Checkout Snapshot, XOR ownership, configured-line identity, or revision
concurrency, and does not authorize Cart-merge implementation. ADR inventory status for
CURRENT binding reads:

| ADR | Title | Register status | Notes |
|---|---|---|---|
| ADR-001 | DigitalOcean platform | CURRENT | Cloud hosting foundation |
| ADR-002 | Environments / CI-CD / release | CURRENT | Environment and release model |
| ADR-003 | Modular monolith Node/TS | AMENDED | Module boundaries remain; HTTP host reading constrained by D-356 / D-359 |
| ADR-004 | Identity / authentication / sessions | CURRENT | Distinct customer/workforce trust; see accepted IMP-008–010 refinements in STATE |
| ADR-005 | Organization / outlet authorization | AMENDED | Scoped RBAC CURRENT; role-count inventory → D-358 / STATE |
| ADR-006 | Catalog / assortment / availability | CURRENT | Read with accepted IMP-012–014 separations; **D-368** is TARGET customer Menu storefront read-projection serving architecture and does not create a new catalog, pricing, or availability authority; **D-369** binds explicit customer selection for positive-price modifier purchase intent without changing modifier schema or duplicating ADR-006 no-silent-substitution |
| ADR-007 | Pricing / tax / charges / promotions | CURRENT | Invoice/credit-note **intent** CURRENT; Financial Document authority locked by **D-365** / IMP-028 capability artifact; refund statutory-reversal decision authority locked by **D-366**; statutory signing / signed artifact authority locked by **D-367** (architecture locked; implementation authorized / started / in progress; not accepted) |
| ADR-008 | Serviceability / cart / checkout | AMENDED | Domain foundations CURRENT where aligned with accepted IMP-018–021; superseded details yield to STATE; **D-370** binds guest→customer compatible purchase-intent merge and logout customer-cart isolation without invalidating the accepted Cart aggregate |
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
| ADR-008 | Accepted IMP-018–021 + **D-370** | Prefer STATE/accepted code for cart/checkout/serviceability specifics that drifted from early ADR prose. **D-370** qualifies future-facing silent whole-cart winner and Checkout-only identity-transition readings; accepted Cart aggregate / XOR / configured-line identity / revision concurrency remain. |
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
| IMP-025 future-facing “no public Menu API” / static `ordering-catalog.json` as long-term customer catalog delivery | Long-term customer Menu serving/read-boundary only (accepted IMP-028B implements D-368; accepted IMP-025 implementation remains otherwise intact) | **D-368** |
| IMP-025 / IMP-026C future-facing lock of guest→customer claim/reconcile exclusively at Checkout; KEEP_GUEST / KEEP_CUSTOMER as whole-cart silent winner; ADR-008 readings that would silently discard one Cart’s purchase intent solely because authentication changed | Future-facing identity-transition timing and silent whole-cart winner policy only (accepted Cart aggregate, guest XOR customer ownership, configured-line identity, revision concurrency, coupon-conflict KEEP_GUEST / KEEP_CUSTOMER as coupon-resolution implementation, and accepted IMP-025 / IMP-026C checkout claim/reconcile implementation remain CURRENT until an authorized future capability implements D-370) | **D-370** |

## 6. Rejected Decisions

No new REJECTED entries are introduced by DR-2. Historical rejections inside ADRs remain in those
ADR bodies.

## 7. Decision Change Log

### DR-12 — 2026-08-18

- Registered **D-370**: Cart Identity Transition Authority.
- Locked: when an active guest/anonymous Cart and an active customer-owned Cart both exist, BOBA
  MUST reconcile compatible purchase intent into a customer-owned Cart rather than silently choosing
  a winner; guest-always-wins / customer-always-wins / newest-always-wins / largest-cart-wins are
  forbidden where the losing Cart’s intent would be silently discarded; empty-Cart ownership
  transfer/reuse is allowed; existing configured-line identity is preserved (equivalent lines MAY
  combine quantity; different configurations remain distinct); failed reconciliation must not
  silently discard intent and must not leave a source Cart partially destroyed; merge is not a
  commercial-quote operation; Checkout Snapshot remains authoritative payable truth after existing
  revalidation; after success the former guest credential is not authority over the customer Cart;
  reconciliation is not locked to Checkout only; sign-out must not delete the customer Cart but must
  end browser authority over it; post-logout context is anonymous and must not expose or copy the
  previous customer’s Cart; Customer B on the same browser must not receive Customer A’s Cart;
  concurrency/revision authority is preserved.
- Supersedes only future-facing silent whole-cart winner selection and delayed identity-transition
  semantics that lock guest→customer reconciliation exclusively to Checkout. Does not invalidate
  the accepted Cart aggregate, XOR ownership, configured-line identity, revision concurrency,
  coupon-conflict KEEP_GUEST / KEEP_CUSTOMER as coupon-resolution implementation, or
  Cart / Checkout Snapshot / Payment / Order authority.
- Global architecture → ARCH-R15 (ARCH-G21 Cart identity transition).
- Next free decision ID advanced to **D-371**.
- Does not authorize implementation, activate IMP-029, create a new IMP, implement Cart merge,
  change authentication, change browser storage, or decide merge API/UX, Cart expiry, multi-device
  sync, Menu projection, customization, D-369 enforcement, Saved Configuration, Order Again,
  Favorites, Offers auto-apply, Drops, Rewards, Culture, Wear, Checkout pricing, Payment, Refund,
  or customer deletion/retention.

### DR-11 — 2026-08-18

- Registered **D-369**: Customer Paid Modifier Explicit Selection Authority.
- Locked: a modifier selection that causes a positive incremental charge (`price_delta_paise > 0`
  or equivalent) MUST NOT become customer purchase intent solely because it is a catalog/default
  selection; explicit customer selection in the current purchase interaction is required; catalog
  metadata, frontend render defaults, `default_quantity`, import defaults, previous-customer
  preference, and saved/reordered configuration are insufficient unless a future authorized
  capability’s current-interaction/revalidation semantics explicitly preserve/select that paid
  choice; zero-price standard/preparation options MAY be visibly preselected; required all-paid
  groups must not silently auto-select a paid option; recommendation is not selection; Cart remains
  purchase intent; Checkout Snapshot remains authoritative payable truth; Checkout must not silently
  add a paid modifier the customer did not select; ADR-006 no-silent-substitution remains CURRENT
  (unavailable paid modifier → reject/require resolution, not silent paid replacement); schema may
  still represent positive `price_delta_paise` + positive `default_quantity` — D-369 does not change
  schema and leaves enforcement location to a future authorized customization capability; live
  import currently has `modifier_groups: 0`.
- Does not supersede ADR-006 modifier structure, Cart/Checkout Snapshot/pricing authority, or
  D-368 Menu serving TARGET.
- Global architecture → ARCH-R14 (ARCH-G20 positive-price modifier explicit selection).
- Next free decision ID advanced to **D-370**.
- Does not authorize implementation, activate IMP-029, create a new IMP, populate modifier data,
  build customization UI, or decide typed modifier kinds, Saved Configuration, Order Again, cart
  merge/logout, Offers auto-apply, Drops, Rewards, Culture, Wear, discount, refund, or pricing
  formulas.

### DR-10 — 2026-08-18

- Registered **D-368**: Customer Menu Read Projection Authority.
- Locked: long-term BOBA Direct customer Menu is a server-backed customer-facing READ PROJECTION /
  STOREFRONT PROJECTION over existing catalog/menu, pricing, assortment/availability, modifier, and
  bundle authorities; static `ordering-catalog.json` remains TRANSITIONAL CURRENT storefront delivery
  until an authorized future capability replaces it; D-368 does not invalidate accepted IMP-025
  implementation; Menu projection is not a new commercial authority; display price ≠ sealed payable
  amount; display availability is a projection of current authoritative availability; Checkout
  Snapshot remains authoritative payable truth after existing Checkout revalidation; transport remains
  static frontend + `customer-commerce` `/api/v1/*` (D-356 / D-359 / D-360) without locking an exact
  Menu HTTP payload.
- Supersedes only IMP-025’s future-facing public-Menu-API exclusion / static-catalog long-term serving
  lock. Does not supersede catalog identity/import, accepted parity, catalog/menu schema, product
  identity, pricing, Cart, Checkout Snapshot, Payment, Order, or other accepted IMP-025 behavior
  unrelated to Menu read delivery.
- Global architecture → ARCH-R13 (ARCH-G19 Customer Menu Projection is not commercial authority).
- Next free decision ID advanced to **D-369**.
- Does not authorize implementation, create a Menu endpoint, activate IMP-029, create a new IMP, or
  decide Menu UX, search, Most Ordered, personalization, Offers, Drops, Rewards, Culture, Wear,
  Favorites, Order Again, cart merge/logout, paid-modifier defaults, special instructions, new pricing
  policy, or new serviceability policy.

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
