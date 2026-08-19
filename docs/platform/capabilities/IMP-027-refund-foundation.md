<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-027",
  "title": "Refund Foundation",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "COMPLETE_AND_ACCEPTED",
  "implementationAuthorized": true,
  "lastReviewed": "2026-08-18",
  "bindingDecisions": ["D-356", "D-357", "D-358", "D-359", "D-360", "D-361", "D-362", "D-363", "D-364"],
  "dependsOn": ["IMP-022", "IMP-023", "IMP-024", "IMP-026"],
  "schemaChangeRequired": true
}
-->

# IMP-027 — Refund Foundation

## Capability Architecture (ARCHITECTURE_LOCKED)

This document is the **locked capability architecture** for IMP-027 — Refund Foundation.

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Implementation | `COMPLETE_AND_ACCEPTED` |
| Implementation authorized | **YES** |
| Acceptance | **COMPLETE_AND_ACCEPTED**; `acceptedThrough = IMP-027`; `pendingAcceptance = IMP-026C` |
| Schema change required | **YES** (Refund persistence; permission catalog; provider adapter extension) |
| Binding decision | **D-364** |

Architecture remains locked. Implementation is complete and independently accepted. Refund scope
remains bounded by this artifact and **D-364**. Do not reinterpret this acceptance as acceptance of
IMP-026C, IMP-028, or later slices.

---

## 1. Governance Metadata

| Field | Value |
|---|---|
| IMP | IMP-027 |
| Capability | Refund Foundation |
| Roadmap lifecycle | `COMPLETE_AND_ACCEPTED` |
| Implementation | `COMPLETE_AND_ACCEPTED` |
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Accepted product through | IMP-027 — Refund Foundation |
| Current product slice | IMP-028 |
| Pending acceptance | IMP-026C |
| Next related slices | IMP-028 Invoice / Tax Receipt / Credit Note; IMP-029 Operations Console API; IMP-030 Operations Console UI |
| Consumes | Accepted IMP-022 Payment, IMP-023 Order, IMP-024 transport; IMP-026 Razorpay adapter + durable webhook inbox (pending acceptance) |
| Binding decisions | D-361 (provider), D-362 (Order recovery), D-363 (durable inbox), **D-364** (Refund foundation) |
| Canonical artifact path | `docs/platform/capabilities/IMP-027-refund-foundation.md` |

Canonical authorities:

| Question | Authority |
|---|---|
| Why / Non-Goals | [`../VISION.md`](../VISION.md) |
| Binding decisions | [`../decision-register.md`](../decision-register.md) |
| Global architecture | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| IMP sequence / lifecycle | [`../ROADMAP.md`](../ROADMAP.md) |
| Accepted reality | [`../STATE.md`](../STATE.md) |
| Payment/provider lock consumed | [`IMP-026-razorpay-productionization.md`](./IMP-026-razorpay-productionization.md) |
| This capability lock | **This document** |
| Agent rules | [`../../../AGENTS.md`](../../../AGENTS.md) |

Layering (unchanged):

```text
UI → Transport → Application Operations → Domain Authority → Persistence → Provider Adapter
```

---

## 2. Capability Purpose

Give BOBA a durable, provider-aware, idempotent financial **Refund** model for returning money from
an already successful Payment.

Core principle:

```text
ORIGINAL COLLECTION TRUTH
≠
REFUND TRUTH
```

Existing Payment success remains historical collection truth. A later refund must **not** rewrite a
successfully captured BOBA Payment into failure / cancelled / refunded as though collection never
occurred.

Expected conceptual relationship:

```text
Checkout Snapshot
→ Payment SUCCEEDED
→ Order

and independently:

Payment SUCCEEDED
→ zero or more Refunds
```

A Refund is a financial reversal lifecycle related to the successful Payment, not a replacement
Payment lifecycle state.

---

## 3. External Provider Constraints

Independently verified from current official Razorpay documentation (2026-08-14). Treated as
provider constraints reconciled into this lock.

### 3.1 Eligibility

Razorpay refund initiation applies to **captured** payments.

### 3.2 Full / partial / multiple

Razorpay supports full refund, partial refund, and multiple partial refunds when cumulative refund
amount does not exceed captured amount. A partially refunded Razorpay Payment can remain provider
status `captured`. Only complete refunding causes provider Payment to become fully `refunded`.

**Therefore BOBA must not infer Refund completion solely from provider Payment status.**

### 3.3 Refund API

```text
POST /v1/payments/:id/refund
```

### 3.4 Provider idempotency

Razorpay supports refund idempotency via header `X-Refund-Idempotency`. Same request may safely be
retried with the same key. A different payload with the same key is invalid.

### 3.5 Provider Refund states

Relevant provider Refund entity states include: `pending`, `processed`, `failed`.

**Do not copy these enums directly into BOBA domain authority.** Map them into the BOBA lifecycle
defined below.

### 3.6 Provider refund webhook events

Current Razorpay refund webhook events include:

- `refund.created`
- `refund.processed`
- `refund.failed`
- `refund.speed_changed`

### 3.7 Refund speed

Razorpay exposes normal and optimum/instant-related behavior. BOBA V1 locks **normal** only
(see §25 / Refund Speed Policy). `refund.speed_changed` is **not** in the V1 supported event set.

---

## 4. Existing Payment / Order Authority

Verified repository truth consumed by this architecture (not reopened):

| Fact | Verified authority |
|---|---|
| Payment statuses | `OPEN` \| `PROCESSING` \| `SUCCEEDED` \| `SUPERSEDED` \| `CANCELLED` \| `EXPIRED` |
| No Payment `REFUNDED` state | VERIFIED |
| Payment Attempt statuses | `CREATED` \| `PENDING` \| `INDETERMINATE` \| `SUCCEEDED` \| `FAILED` \| `CANCELLED` |
| Provider references | `app.payment_provider_references` (`razorpay_order_id`, `razorpay_payment_id`, `razorpay_receipt`) |
| Observations | `app.payment_provider_observations` |
| Webhook inbox | `app.payment_provider_event_inbox` (D-363) |
| Webhook path | `POST /api/integrations/payments/razorpay/webhook` on `customer-commerce` |
| `payment.refunded` webhook | Ignored today (`UNSUPPORTED` / `EVENT_IGNORED` after durable ack) |
| Query-time `refunded` | Recorded as `ANOMALY` (`RAZORPAY_REFUNDED_NON_SUCCESS`); does not regress `SUCCEEDED` |
| Order lifecycle | `PLACED` \| `ACCEPTED` \| `FULFILLED` \| `CANCELLED` (D-357); cancel does not refund |
| Checkout Snapshot | Immutable commercial truth |
| PaymentProvider port | `createExecution`, `queryExecution`, optional `cancelExecution`, `verifyWebhook`, optional `verifyClientEvidence` — **no refund methods today** |
| Concurrency | `FOR UPDATE` row locks; Checkout → Payment → Attempt lock order; never hold locks across provider I/O |
| Runtime | Refund must not invent a new deployable service (ARCH-G02 / ARCH-G14) |
| Workforce | No `payment.*` / `refund.*` permission keys today; role `support_refund_operator` exists with `order.read` / `order.cancel` only |

Binding preserved semantics from IMP-026 / ROADMAP / STATE:

> A Payment that reached BOBA success from provider `captured` remains successful original
> collection truth even if the provider later reports a refund.

---

## 5. Refund Domain Authority

| Question | Lock |
|---|---|
| Is Refund a first-class domain aggregate? | **YES** |
| What owns refund identity? | Refund aggregate (`app.refunds.id`) |
| What owns requested amount? | Refund aggregate (`amount_paise`) — immutable after ACCEPTED |
| What owns provider refund identity? | `app.refund_provider_references` (+ Refund columns for primary provider refund id) |
| What owns Refund lifecycle? | Refund aggregate (`status`) |
| What owns cumulative refunded amount? | **Derived** from Refund rows under Payment lock (not a denormalized Payment status rewrite) |
| How does Refund reference Payment? | Required FK `payment_id` → `app.payments.id` |
| How does Refund reference Order/Checkout? | Optional denormalized convenience FKs (`order_id`, `checkout_id`, `checkout_snapshot_id`) for IMP-028 / ops projection; **not** ownership; never mutate those domains |
| Can one Payment have multiple Refund records? | **YES** |
| What facts are immutable? | Refund id; payment_id; amount_paise; currency; provider; provider_idempotency_key; initiating actor; created_at; reason (after ACCEPTED) |

**Rejected alternatives:**

- Burying refund history in Payment JSON metadata — **REJECTED** (ARCH-G14; loses partial history).
- Encoding refund as Payment status `REFUNDED` — **REJECTED** (corrupts collection truth).
- Treating refund as another Payment Attempt — **REJECTED** (Attempt is collection execution, not reversal).

Authority map:

```text
Payment  = original collection authority
Refund   = separate durable financial reversal authority
Order    = business fulfilment lifecycle authority (unchanged by Refund)
Checkout Snapshot = immutable commercial truth (unchanged by Refund)
```

---

## 6. Refund Aggregate

Canonical aggregate: **Refund**.

Minimum conceptual fields:

| Field | Notes |
|---|---|
| `id` | UUID; BOBA Refund ID |
| `payment_id` | Required FK; Payment must be `SUCCEEDED` at initiation |
| `checkout_id` / `checkout_snapshot_id` / `order_id` | Optional convenience references captured at initiation |
| `amount_paise` | Positive integer; immutable after ACCEPTED |
| `currency` | Must equal Payment/Checkout Snapshot currency (`INR` V1) |
| `status` | BOBA lifecycle (§7) |
| `provider` | e.g. `razorpay` |
| `provider_idempotency_key` | Durable; deterministic from Refund id (§12) |
| `provider_refund_id` | Nullable until known; also stored in references table |
| `provider_payment_id` | Razorpay `pay_…` used for create; must match Payment reference |
| `provider_status_code` | Last observed provider status (`pending` / `processed` / `failed`) — observation aid, not BOBA authority |
| `failure_code` / `failure_reason` | Nullable; provider failure details |
| `acquirer_reference` | Nullable ARN/RRN/UTR when safely available |
| `reason` | Mandatory internal operator reason (§29) |
| `operator_note` | Optional internal note; never sent to provider by default |
| `initiated_by_actor_kind` / `initiated_by_actor_id` | Workforce actor identity |
| `authorized_permission` | Permission key used at initiation |
| timestamps | `created_at`, `updated_at`, `accepted_at`, `pending_at`, `indeterminate_at`, `processed_at`, `failed_at` |

**Refund Attempt table:** **NOT REQUIRED** for V1. One BOBA Refund maps to one logical provider refund
request with idempotent retry. Extra attempt abstraction is deferred unless a concrete lifecycle
need appears.

Supporting tables:

| Table | Role |
|---|---|
| `app.refunds` | Canonical Refund authority |
| `app.refund_provider_references` | Durable provider identities (`razorpay_refund_id`, `razorpay_payment_id`, …) |
| `app.refund_provider_observations` | Normalized provider observations (sync / webhook / query / reconciliation) |

Do not make mutable provider payload JSON the only refund authority.

---

## 7. Refund Lifecycle

BOBA-owned statuses (exact):

```text
ACCEPTED
PENDING
INDETERMINATE
PROCESSED
FAILED
```

| Status | Meaning |
|---|---|
| `ACCEPTED` | Locally accepted refund request; amount **reserved**; provider create may be in flight or not yet started |
| `PENDING` | Provider has acknowledged a Refund and reports non-terminal processing (`pending` or equivalent) |
| `INDETERMINATE` | Provider create/query outcome is uncertain; same provider idempotency key must be reused |
| `PROCESSED` | Terminal success; money returned for this Refund amount |
| `FAILED` | Terminal definitive provider/business failure; reservation released |

Distinction locked:

```text
REQUEST CREATION (ACCEPTED)
≠
PROVIDER PROCESSING (PENDING / INDETERMINATE)
≠
FINAL REFUND COMPLETION (PROCESSED)
```

Provider API acceptance alone does **not** make a Refund `PROCESSED`.

Provider mapping (normalization, not domain copy):

| Provider Refund status | BOBA effect |
|---|---|
| `pending` | Ensure at least `PENDING` (not `PROCESSED`) |
| `processed` | May establish `PROCESSED` |
| `failed` | May establish `FAILED` |

---

## 8. Amount / Balance Invariants

Canonical concepts (per Payment):

| Concept | Definition |
|---|---|
| `capturedAmount` | Checkout Snapshot `grand_total_paise` for the SUCCEEDED Payment (collection amount) |
| `successfulRefundedAmount` | Sum of `amount_paise` over Refunds in `PROCESSED` |
| `reservedRefundAmount` | Sum of `amount_paise` over Refunds in `ACCEPTED` \| `PENDING` \| `INDETERMINATE` |
| `remainingRefundableAmount` | `capturedAmount - successfulRefundedAmount - reservedRefundAmount` |

Invariant (mandatory):

```text
successfulRefundedAmount + reservedRefundAmount ≤ capturedAmount
remainingRefundableAmount ≥ 0
```

Rules:

1. On transition into `ACCEPTED`, reserve `amount_paise` only if `amount_paise ≤ remainingRefundableAmount` under Payment row lock.
2. Non-terminal statuses continue to reserve.
3. `PROCESSED` converts reservation into successful refunded amount (still counted once).
4. `FAILED` releases reservation.
5. Frontend validation is never sufficient; DB transaction + Payment lock enforce the invariant.
6. Fully refunded Payment (`remainingRefundableAmount = 0` and no non-terminal rows) rejects further Refund creation.

---

## 9. Full / Partial / Multiple Partial Refund Rules

| Mode | IMP-027 data model |
|---|---|
| FULL | **YES** |
| PARTIAL | **YES** |
| MULTIPLE_PARTIAL | **YES** |

Implementation must not prevent partial/multiple support. “Payment refunded” is a **derived view**
only when `successfulRefundedAmount == capturedAmount`. Never infer full refund completion from a
single Refund row unless that row’s processed amount equals captured amount **and** no other
non-terminal/processed rows contradict.

---

## 10. Provider Abstraction

**Decision: Option A — extend `PaymentProvider` with optional refund capabilities.**

Rationale:

- V1 has a single Razorpay adapter behind one port (D-361).
- Same credentials, HTTP client, webhook verification, and runtime composition already live on
  `PaymentProvider`.
- A separate `RefundProvider` interface would duplicate composition without multi-provider need
  (multi-provider orchestration remains deferred).

Required optional methods (conceptual):

```text
createRefund(input) → NormalizedRefundEvidence
queryRefund(input) → NormalizedRefundEvidence
```

Existing `verifyWebhook` is extended to normalize refund events into refund evidence (or a
discriminated evidence family) without placing Razorpay-specific truth in domain services.

Fake/disabled providers must fail closed for refund methods in staging/production when Refund is
enabled.

Domain services speak only normalized evidence + BOBA Refund authority.

---

## 11. Razorpay Adapter Contract

| Concern | Contract |
|---|---|
| Create | `POST /v1/payments/{razorpay_payment_id}/refund` with amount, currency; header `X-Refund-Idempotency` |
| Speed | Always `normal` (or omit speed such that provider default is normal); never expose optimum/instant |
| Query | Fetch provider Refund by provider refund id (and/or list-by-payment recovery path if needed for uncertain create) |
| Normalize | Map provider status → BOBA evidence outcome; never auto-apply as Payment success/failure |
| Identity | Persist `razorpay_refund_id`, reuse Payment’s `razorpay_payment_id` |
| Notes | Do not send internal operator notes/PII to Razorpay notes by default |
| Secrets | Key Secret / webhook secret remain server-only |
| Non-goals | No EMI/BNPL/COD-specific refund paths; no dashboard-refund auto-import beyond reconciliation observation |

`payment.refunded` (Payment entity webhook) remains **non-authoritative** for Refund completion.
Refund authority comes from Refund entity evidence (`refund.*` events / refund query), not from
Payment status alone.

---

## 12. Provider Idempotency

| Rule | Lock |
|---|---|
| BOBA owns durable idempotency identity | `provider_idempotency_key` on Refund |
| Derivation | **Deterministic** from BOBA Refund ID: `boba_rfnd_<refundUuidWithoutHyphens>` |
| Stored | Persist the key on the Refund row at ACCEPTED (reproducible; not randomly regenerated) |
| Retry | Same logical Refund always reuses the same key |
| New Refund | New Refund id → new key (partial #2 never reuses partial #1) |
| Provider header | Razorpay `X-Refund-Idempotency` = stored key |
| Same key + same payload | Safe |
| Same key + different payload | Invalid; must not occur because amount/currency are immutable after ACCEPTED |

---

## 13. Uncertain-Create Recovery

Case:

```text
BOBA sends refund create
→ network uncertain
→ BOBA does not know whether Razorpay created it
```

Locked recovery discipline (parallel to IMP-026 uncertain Order-create, not conflated with it):

1. Mark Refund `INDETERMINATE` (reservation retained).
2. **Do not** create a second Refund row for the same logical request.
3. Retry `createRefund` with the **same** `X-Refund-Idempotency` key.
4. If useful, `queryRefund` / list-by-payment to recover provider refund identity matching amount +
   idempotency/time window.
5. Persist recovered `razorpay_refund_id` uniquely.
6. Apply normalized status monotonically.
7. Prevent double-refund via unique provider refund id + reserved-balance invariant + idempotency key.

---

## 14. Provider Identity / References

Durable storage (minimum):

| Identity | Storage |
|---|---|
| BOBA Refund ID | `refunds.id` |
| Provider name | `refunds.provider` |
| Razorpay Refund ID | `refund_provider_references` kind `razorpay_refund_id` + denormalized nullable column |
| Razorpay Payment ID | reference kind `razorpay_payment_id` |
| Provider idempotency identity | `refunds.provider_idempotency_key` |
| Amount / currency | `refunds.amount_paise` / `currency` |
| Provider status | observation + nullable `provider_status_code` |
| Provider timestamps | observations |
| ARN/RRN/UTR | nullable `acquirer_reference` when safely present |
| Failure code/reason | nullable fields + observation |

Unique constraints (implementation must enforce):

- `(provider, reference_kind, reference_value)` unique for refund references
- `provider_idempotency_key` unique
- Refund id PK

---

## 15. Refund Webhook Architecture

**Reuse** existing Razorpay webhook ingress. Do **not** create a second public Razorpay webhook
endpoint.

| Concern | Lock |
|---|---|
| Endpoint | `POST /api/integrations/payments/razorpay/webhook` |
| Signature verification | Existing Razorpay HMAC verification |
| Durable inbox | Same `app.payment_provider_event_inbox` |
| Ack timing | D-363 invariant: raw body → verify → durable insert → 2xx → async process |
| Refund processing | Must **not** delay provider acknowledgement |
| Runtime | Existing `customer-commerce` inbox processor loop |

Supported Refund event set (V1):

```text
refund.created
refund.processed
refund.failed
```

Excluded (V1):

```text
refund.speed_changed
```

Inbox evidence model must discriminate payment vs refund event families so processors route
correctly without delaying ack.

---

## 16. Webhook Correlation

Payment-event correlation via Razorpay Order id is **insufficient** for partial Refunds.

Refund correlation order (locked):

1. Provider Refund ID → `refund_provider_references` / `refunds.provider_refund_id`
2. Else provider Payment ID + unambiguous match to a non-terminal BOBA Refund (amount/status aids);
   if multiple candidates remain ambiguous → unknown correlation / retry / poison policy analogous
   to Payment inbox `UNKNOWN_CORRELATION`
3. Never force refund events through Payment Attempt `payexec_` / order-id-only paths as sole key

Multiple Refunds against one Payment remain distinguishable by provider refund id and BOBA Refund
id.

---

## 17. Durable Inbox / Async Processing

Provider webhook delivery remains at-least-once.

Dedup:

```text
(provider, provider_event_id)
```

unique in inbox (existing). Duplicate insert is a no-op; ack remains 2xx.

Async processor:

1. Claim inbox row (`FOR UPDATE SKIP LOCKED`)
2. If refund family → `applyRefundProviderEvidence`
3. If payment family → existing Payment apply path
4. Mark processed / retry / poison per existing inbox semantics

Refund application must not perform long provider I/O while holding Payment/Refund locks beyond the
established Payment pattern (lock → decide → commit; provider I/O outside locks where possible).

---

## 18. Provider Observation Model

`app.refund_provider_observations` records normalized evidence:

| Field concept | Notes |
|---|---|
| `refund_id` | FK |
| `observation_source` | `sync` \| `webhook` \| `query` \| `reconciliation` |
| `provider_event_id` | Nullable; unique with provider when present |
| `normalized_outcome` | Refund-specific outcomes (e.g. `PENDING`, `PROCESSED`, `FAILED`, `INDETERMINATE`, `ANOMALY`, `UNSUPPORTED`) |
| `provider_status_code` | Raw provider status aid |
| `observed_amount_paise` / currency | Evidence only |
| `payload_digest` | Safe hash; no secrets |
| `reconciliation_anomaly` | Optional anomaly code |
| `observed_at` | |

Observations supplement; they do not replace Refund aggregate authority.

---

## 19. Refund Reconciliation

Webhooks alone are not sufficient.

Capabilities:

- Query single provider Refund by provider refund id
- Reconcile `PENDING` / `INDETERMINATE` Refunds
- Recover missed webhooks
- Detect provider state drift
- Never regress terminal `PROCESSED`

Runtime:

| Mechanism | Lock |
|---|---|
| Opportunistic reconcile | After uncertain create / before retry |
| Existing customer-commerce loop | Extend inbox processor and/or a small in-process batch tick inside `customer-commerce` (same pattern as Payment inbox poll) |
| Explicit batch/CLI | Optional tools-profile CLI (like `order:recover-missing`) for operator recovery — **not** a new deployable worker |
| New microservice / broker / standalone Refund worker | **FORBIDDEN** |

Automatic scheduled cloud workers are not required by this decision (consistent with D-362 stance).

---

## 20. State Transition / Terminality Rules

Allowed transitions:

```text
ACCEPTED → PENDING | INDETERMINATE | PROCESSED | FAILED
PENDING → PROCESSED | FAILED | INDETERMINATE
INDETERMINATE → PENDING | PROCESSED | FAILED
PROCESSED → (none)
FAILED → PROCESSED   # only via authoritative same-provider-refund-id processed evidence
```

Rules:

1. `PROCESSED` never regresses to any other status.
2. Out-of-order / duplicate `refund.processed` is idempotent no-op once `PROCESSED`.
3. `FAILED` is normally terminal; promotion `FAILED → PROCESSED` is allowed **only** when the same
   durable provider refund id authoritatively reports `processed` (money returned). Amount is then
   counted in `successfulRefundedAmount` under Payment lock; if cumulative would exceed captured
   amount → record `ANOMALY`, do not silently invent additional refundable balance.
4. Provider contradictory evidence (e.g. `failed` after `PROCESSED`) is recorded as observation
   anomaly; BOBA `PROCESSED` stands.
5. Query-before-webhook and webhook-before-API-response-persistence are both safe: first durable
   apply wins; later duplicate evidence is idempotent.
6. Never silently overwrite contradictions without observation/anomaly audit.

---

## 21. Concurrency Model

Example:

```text
captured = ₹1,000
processed = ₹200
two simultaneous requests: ₹500 and ₹500
→ both must not be allowed if exposure would become ₹1,200
```

Locked algorithm for `requestRefund`:

1. Begin DB transaction.
2. `SELECT … FOR UPDATE` on `app.payments` (and related Refund rows for that Payment as needed).
3. Verify Payment `SUCCEEDED` and provider `razorpay_payment_id` present.
4. Compute `remainingRefundableAmount` from Refund rows.
5. Reject if `amount_paise > remainingRefundableAmount` or `amount_paise <= 0`.
6. Insert Refund `ACCEPTED` (reservation established).
7. Commit.
8. Provider I/O **outside** the reservation transaction (same discipline as Payment: never hold
   locks across provider I/O).
9. Apply provider result in a subsequent transaction with Refund + Payment locks; monotonic
   transition; on `FAILED` release reservation.

Two concurrent creators serialize on the Payment row lock; the second sees the first reservation.

Retry of the **same** Refund after uncertainty does not create a second reservation.

---

## 22. Payment Interaction

| Rule | Lock |
|---|---|
| Payment remains `SUCCEEDED` after partial or full Refund | **YES** |
| Add Payment status `REFUNDED` | **NO** |
| Derived views allowed | `successfulRefundedAmount`, `remainingRefundableAmount`, `fullyRefunded` |
| `payment.refunded` Payment webhook | Non-authoritative for Refund completion; may be ignored or observed as anomaly aid only |
| Query-time provider Payment `refunded` | Must not regress Payment `SUCCEEDED` |

---

## 23. Order Interaction

| Rule | Lock |
|---|---|
| Refund automatically changes Order status | **NO** |
| New Order states | **NO** |
| Customer self-service cancellation → refund | **DEFERRED** (not IMP-027) |
| Operator cancel/refund coupling | Deferred to Operations Console work (IMP-029/030+); not automatic in foundation |

A financial refund may exist while Order remains `PLACED` / `ACCEPTED` / `FULFILLED` / `CANCELLED`
per Order domain rules.

---

## 24. Checkout Interaction

Checkout Snapshot remains immutable commercial truth. Refund must never rewrite:

- subtotal
- discount
- tax
- charges
- grandTotal

Refund references original financial facts as needed; it is subsequent reversal, not re-pricing.

---

## 25. IMP-028 Financial Document Boundary

| Concern | Owner |
|---|---|
| Invoice / Tax Receipt / Credit Note generation | **IMP-028** |
| Refund amount, completion timestamp, payment/order/checkout relationship | **IMP-027** exposes durable facts |
| Partial vs cumulative returned amount | **IMP-027** derived from Refund rows |
| Provider refund reference | **IMP-027** persists; IMP-028 may cite |

IMP-027 must **not** generate tax invoices, tax receipts, or credit notes.

---

## 26. Operations / IMP-029 Boundary

| Surface | IMP-027 | IMP-029 / IMP-030 |
|---|---|---|
| Refund domain / persistence | YES | consumes |
| Application operation `requestRefund` / `getRefund` / `reconcileRefund` | YES | exposes via Ops Console API/UI |
| Provider adapter + webhook/reconciliation | YES | — |
| Authorization-ready command boundary | YES | transport auth wiring |
| Customer HTTP API | NO | NO |
| Operations Console HTTP API | **NO** (deferred) | YES (IMP-029) |
| Operations Console UI | NO | YES (IMP-030) |

**No customer endpoint.**

**No Ops Console HTTP route in IMP-027.** Foundation is testable via domain/application service
integration tests and optional tools-profile CLI for recovery. Stealing IMP-029 transport scope is
forbidden.

Initiation authority V1: **workforce operator** with explicit permission (not customer; not
automatic cancel).

---

## 27. Authorization / Audit

| Concern | Lock |
|---|---|
| Initiating actor | Workforce actor only |
| New permission keys | `payment.refund` (initiate) and `payment.refund.read` (read) |
| Role mapping (implementation) | Grant `payment.refund` + `payment.refund.read` to `support_refund_operator`, `brand_admin`, `platform_super_admin`; grant `payment.refund.read` to `finance_viewer`; do not grant customer-facing roles |
| Approval workflow / dual control | **DEFERRED** (not V1 foundation) |
| Scope | Outlet/org scoped via existing access-control resource model tied to Order/Payment outlet relationship |
| Audit | Persist actor id/kind, permission, reason, timestamps; use existing access-control audit patterns where applicable |
| Reason | **Mandatory** internal reason |
| Deny by default | YES |

Do not implement Operations Console role UI in IMP-027. Permission catalog/schema updates belong to
IMP-027 implementation when authorized.

---

## 28. Security / Privacy

| Rule | Lock |
|---|---|
| Razorpay Key Secret server-only | YES |
| Webhook secret server-only | YES |
| No provider secrets in browser | YES |
| No customer ability to call refund operation | YES |
| No sensitive raw provider payload exposure to clients | YES |
| Safe logging (no secrets / minimize PII) | YES |
| Financial operation auditability | YES |
| Fail closed | Refund provider calls fail closed when provider disabled/misconfigured |

---

## 29. Runtime Topology

```text
existing customer-commerce
+ PostgreSQL
+ Razorpay API
```

No new microservice, Kafka/RabbitMQ, standalone Refund worker, or Refund-only deployment.

Refund domain modules live beside Payment under the modular monolith; HTTP ingress for webhooks
remains on `customer-commerce`.

---

## 30. Error / Recovery Matrix

| Case | BOBA state | Provider action | Reservation | Retry? | Operator-visible | Audit |
|---|---|---|---|---|---|---|
| Payment not SUCCEEDED / not captured-backed | Reject create | None | None | No | Definitive reject | Record denied attempt if useful |
| No Razorpay payment reference | Reject create | None | None | No | Definitive reject | Yes |
| amount ≤ 0 | Reject | None | None | No | Validation error | Optional |
| amount > remaining refundable | Reject | None | None | No | Over-refund reject | Yes |
| Simultaneous partials oversubscribe | Second waits on Payment lock; then reject if insufficient | None for rejected | Only accepted rows reserve | No for rejected | One succeeds / one rejects | Yes |
| Provider 4xx definitive reject | `FAILED` | None further | Release | No (new Refund needed for new intent) | Failed | Yes |
| Provider timeout / uncertain | `INDETERMINATE` | Later retry same key / query | Retain | Yes same Refund | Indeterminate | Yes |
| Provider 409 idempotency-in-progress | Stay/move `PENDING` or `INDETERMINATE` | Query/retry same key | Retain | Yes | Pending | Yes |
| Provider 5xx | `INDETERMINATE` | Retry/query same key | Retain | Yes | Indeterminate | Yes |
| Provider Refund `pending` | `PENDING` | Wait / reconcile | Retain | Reconcile yes | Pending (not complete) | Yes |
| Provider Refund `processed` | `PROCESSED` | None | Convert to successful | No | Processed | Yes |
| Provider Refund `failed` | `FAILED` | None | Release | No | Failed | Yes |
| Webhook before API response persistence | Apply by provider refund id when correlatable; later API persist merges | — | Per apply rules | — | Consistent eventual | Observation |
| Duplicate webhook | No-op | — | Unchanged | — | Unchanged | Observation dedup |
| Out-of-order webhook | Monotonic apply; no PROCESSED regress | — | Per rules | — | Terminal stands | Anomaly if contradiction |
| Unknown provider Refund ID | Inbox unknown correlation / poison path | — | Unchanged | Limited retry | Ops poison review | Yes |
| Reconcile finds processed | → `PROCESSED` | — | Convert | — | Processed | Yes |
| Reconcile finds failed | → `FAILED` | — | Release | — | Failed | Yes |
| Contradictory evidence | Keep terminal + anomaly observation | — | Unchanged for PROCESSED | — | Anomaly flag | Yes |
| Already fully refunded | Reject create | None | None | No | Reject | Yes |
| Retry after uncertainty | Same Refund / same key | create/query | Retain until terminal | Yes | Pending/indeterminate→terminal | Yes |

Customer-visible outcome: **none required in IMP-027** (backend foundation). Operators see results
via future Ops Console / CLI / service responses.

---

## 31. Acceptance Criteria

| ID | Criterion |
|---|---|
| RF-AC01 | Refund has its own durable authority distinct from Payment |
| RF-AC02 | Only eligible successful/captured provider-backed Payments may be refunded |
| RF-AC03 | Payment remains `SUCCEEDED` after any Refund |
| RF-AC04 | Full refunds supported by the data model |
| RF-AC05 | Partial refunds supported by the data model |
| RF-AC06 | Multiple partial refunds cannot cumulatively exceed captured amount |
| RF-AC07 | Concurrent Refund creation cannot oversubscribe refundable balance |
| RF-AC08 | One logical Refund has one durable provider idempotency identity |
| RF-AC09 | Uncertain provider create can be safely retried without double-refund |
| RF-AC10 | Provider Refund identity is persisted |
| RF-AC11 | Provider `pending` is not BOBA completed Refund |
| RF-AC12 | Provider `processed` can establish completed Refund |
| RF-AC13 | Provider definitive failure releases refundable reservation |
| RF-AC14 | Duplicate webhook does not double-apply refunded amount |
| RF-AC15 | Out-of-order webhook cannot regress terminal financial truth |
| RF-AC16 | Missed webhook can be recovered by provider reconciliation |
| RF-AC17 | Order lifecycle is not automatically rewritten by Refund |
| RF-AC18 | Checkout Snapshot remains immutable |
| RF-AC19 | No credit note/invoice generation occurs in IMP-027 |
| RF-AC20 | No customer self-service Refund API exists |
| RF-AC21 | Operations Console UI/API scope is not stolen from IMP-029/030 |
| RF-AC22 | Provider credentials remain server-only |
| RF-AC23 | Refund action is auditable |
| RF-AC24 | No new deployable service/broker is required |
| RF-AC25 | V1 refund speed is normal-only; `refund.speed_changed` not required |
| RF-AC26 | Permission keys `payment.refund` / `payment.refund.read` gate initiation/read |
| RF-AC27 | Cumulative refunded amount derives from canonical Refund rows, not webhook counters |

---

## 32. Required Test Scenarios

Define now; **do not implement** until implementation authorization.

| ID | Scenario |
|---|---|
| RF-01 | Full refund |
| RF-02 | Partial refund |
| RF-03 | Multiple partial refunds |
| RF-04 | Over-refund rejection |
| RF-05 | Concurrent over-refund prevention |
| RF-06 | Payment remains SUCCEEDED |
| RF-07 | Provider pending |
| RF-08 | Provider processed |
| RF-09 | Provider failed |
| RF-10 | Idempotent retry same BOBA Refund |
| RF-11 | New Refund gets new idempotency identity |
| RF-12 | Uncertain create recovery |
| RF-13 | Duplicate webhook |
| RF-14 | Out-of-order webhook |
| RF-15 | Webhook before provider-create response persistence |
| RF-16 | Missed webhook reconciliation |
| RF-17 | Unknown correlation |
| RF-18 | Fully refunded Payment rejects further Refund |
| RF-19 | Order unchanged |
| RF-20 | Checkout unchanged |
| RF-21 | No customer refund endpoint |
| RF-22 | Authorization/audit |
| RF-23 | Provider secret safety |
| RF-24 | Migration/schema constraints |
| RF-25 | Runtime/no-new-service verification |

Likely layers:

- domain
- repository / PostgreSQL
- provider adapter
- HTTP / webhook
- integration
- Docker / runtime
- architecture / governance

---

## 33. Explicit Non-Goals

- customer self-service cancellation
- customer self-service refund
- automated refund-on-cancel
- Operations Console API beyond foundation boundary (IMP-029)
- Operations Console UI (IMP-030)
- invoice generation
- tax receipt generation
- credit-note generation
- chargebacks / disputes
- multi-provider refund orchestration
- international payment-specific refund expansion
- EMI-specific refund workflows
- BNPL-specific refund workflows
- COD refunds
- payout/credit mechanisms unrelated to original Payment
- wallet / store credit
- loyalty compensation
- manual bank transfer refunds
- new microservice
- external message broker
- Payment status `REFUNDED`
- automatic Order cancellation on Refund
- optimum/instant refund speed as operator option
- customer-facing refund UX requirement in IMP-027
- dual-control refund approval workflow (deferred)

---

## 34. Architecture Invariants

| ID | Invariant |
|---|---|
| RF-I01 | Refund is first-class durable authority independent of Payment lifecycle status |
| RF-I02 | Payment `SUCCEEDED` remains collection truth after Refund |
| RF-I03 | `successfulRefundedAmount + reservedRefundAmount ≤ capturedAmount` |
| RF-I04 | One BOBA Refund ↔ one provider idempotency key |
| RF-I05 | Provider Payment status alone does not complete Refund |
| RF-I06 | Webhook ack follows D-363 durable-inbox discipline for refund events |
| RF-I07 | No second public Razorpay webhook endpoint |
| RF-I08 | No new deployable Refund service/worker/broker |
| RF-I09 | No customer Refund HTTP API |
| RF-I10 | Ops Console transport/UI deferred to IMP-029/030 |
| RF-I11 | Checkout Snapshot immutable under Refund |
| RF-I12 | Order status not auto-mutated by Refund |
| RF-I13 | IMP-028 owns financial documents; IMP-027 owns refund facts only |
| RF-I14 | V1 refund speed = normal only |
| RF-I15 | Terminal `PROCESSED` never regresses |

Global architecture additions:

- Domain map: Refund moves from `FUTURE / NOT_IMPLEMENTED` to **designed / ARCHITECTURE_LOCKED**
  (implementation still unauthorized).
- **ARCH-G15**: Refund owns financial reversal truth for returned funds; it must not rewrite
  Payment original collection truth.

---

## 35. Open Questions

```text
(none)
```

All material questions required for architecture lock were resolved, and implementation is now
independently accepted.

---

## Appendix A — Reason / Notes Policy

| Field | Policy |
|---|---|
| Internal reason | Mandatory; normalized trimmed text; max 500 chars |
| Operator note | Optional; internal only; max 1000 chars |
| Provider notes | Not used as canonical audit; do not send internal operational/PII content by default |

---

## Appendix B — Customer-Facing Refund UX

IMP-027 is **backend-only** foundation. No customer self-service initiation. Read-only customer
projection of refund state is **deferred** to a later customer UX decision/slice unless ROADMAP
explicitly assigns it. Do not expand IMP-027 scope for customer refund UI.

---

## Appendix C — Schema Change Required (Implementation Phase)

Historical implementation added committed SQL migration(s) for Refund tables / constraints /
permission keys. This reconciliation does **not** add migrations.

```text
REFUND_SCHEMA_IMPLEMENTED: YES
REFUND_MIGRATION_ADDED: YES (historical implementation; unchanged by this reconciliation)
```
