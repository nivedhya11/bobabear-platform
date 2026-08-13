<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-026",
  "title": "Razorpay Productionization & Payment GTM Readiness",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "NOT_STARTED",
  "implementationAuthorized": false,
  "lastReviewed": "2026-08-13",
  "bindingDecisions": ["D-356", "D-357", "D-358", "D-359", "D-360", "D-361", "D-362"],
  "dependsOn": ["IMP-024", "IMP-025"],
  "supersedesProviderDecisions": ["D-161", "D-162"]
}
-->

# IMP-026 — Razorpay Productionization & Payment GTM Readiness

## Capability Architecture (ARCHITECTURE_LOCKED)

This document is the **locked capability architecture** for IMP-026 — Razorpay Productionization &
Payment GTM Readiness.

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Implementation | `NOT_STARTED` |
| Implementation authorized | **NO** |
| Acceptance | not started; `acceptedThrough` remains IMP-025 |
| Schema change required | **NO** |

Architecture is locked. Implementation is **not** started and is **not** authorized by this lock.

This is an explicit approved provider substitution: historical Cashfree V1 provider/surface
selection (**D-161**, **D-162**) is superseded for current authority by **D-361**. **D-362** amends
D-361 only for webhook acknowledgement / post-payment Order recovery semantics; D-361 remains
CURRENT for provider selection. Slice number **IMP-026** is unchanged.

---

## 1. Capability Identity

| Field | Value |
|---|---|
| IMP | IMP-026 |
| Capability | Razorpay Productionization & Payment GTM Readiness |
| Roadmap lifecycle | `ARCHITECTURE_LOCKED` |
| Implementation | `NOT_STARTED` |
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Accepted product through | IMP-025 — Customer Ordering UX |
| Current product slice | `NONE` |
| Next product slice | IMP-026 |
| Consumes | Accepted IMP-001→IMP-025 foundations, especially IMP-022 Payment, IMP-023 Order, IMP-024 transport, IMP-025 provider-neutral UX |
| Next related slices | IMP-027 Refund; later Invoice / Ops / Delivery / Notifications |
| Binding provider decision | **D-361** |
| Binding webhook / recovery decision | **D-362** (amends D-361 acknowledgement / post-payment Order effect only) |
| Historical provider decisions | **D-161** / **D-162** (superseded for current V1 provider/surface authority) |

---

## 2. Canonical Authority

| Question | Authority |
|---|---|
| Why / Non-Goals | [`../VISION.md`](../VISION.md) |
| Binding decisions | [`../decision-register.md`](../decision-register.md) |
| Global architecture | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| IMP sequence / lifecycle | [`../ROADMAP.md`](../ROADMAP.md) |
| Accepted reality | [`../STATE.md`](../STATE.md) |
| Transport contracts consumed | [`IMP-024-customer-ordering-transport.md`](./IMP-024-customer-ordering-transport.md) |
| Customer UX contracts consumed | [`IMP-025-customer-ordering-ux.md`](./IMP-025-customer-ordering-ux.md) |
| Provider-neutral Payment ADR | [`../decisions/ADR-009-payments-webhooks-refunds-reconciliation.md`](../decisions/ADR-009-payments-webhooks-refunds-reconciliation.md) (Cashfree selection superseded by D-361; webhook acknowledgement / post-payment Order recovery refined by D-362; provider-neutral remainder remains) |
| This capability lock | **This document** |
| Agent rules | [`../../../AGENTS.md`](../../../AGENTS.md) |

Layering (unchanged):

```text
UI → Transport → Application Operations → Domain Authority → Persistence → Provider Adapter
```

IMP-026 owns the **Razorpay adapter**, production composition, webhook ingress, client-evidence
application operation, and GTM readiness of the existing Payment port. It must not invent a second
Payment domain, Order authority, or deployable service.

---

## 3. Purpose

Make production payment collection GTM-ready by composing **Razorpay** behind the accepted
`PaymentProvider` port, using **Razorpay Standard Checkout** as the customer collection surface,
while preserving provider-neutral Payment / Order authority.

Conceptual outcome:

```text
Accepted Checkout snapshot
→ BOBA Bear Payment + Attempt (existing idempotency)
→ Razorpay provider execution / Order (adapter)
→ razorpay_standard_checkout clientAction (browser-safe)
→ Razorpay Standard Checkout (browser adapter)
→ POST /api/v1/payments/{paymentId}/client-evidence
→ server-side verification + existing Payment transitions
→ webhook / query / reconciliation as durable evidence
```

Razorpay webhook acknowledgement (**D-362**):

```text
verified webhook
→ durable Payment transition
→ HTTP 2xx
→ Order materialization outside provider-ack critical path
   (existing tryMaterializeOrderAfterPaymentCompletion)

If Payment success exists but Order is absent:
→ recoverMissingOrdersBatch
→ exactly one Order
```

---

## 4. Product Boundary

### 4.1 Included (IMP-026 owns)

1. Razorpay as the V1 production payment provider (**D-361**)
2. Razorpay Standard Checkout as the V1 customer collection surface
3. Razorpay adapter behind existing `PaymentProvider`
4. Provider identity mapping onto existing Payment persistence
5. Optional `PaymentProvider.verifyClientEvidence` capability
6. Authenticated customer client-evidence application operation
7. Provider-neutral `POST /api/v1/payments/{paymentId}/client-evidence`
8. `clientAction` kind `razorpay_standard_checkout`
9. Isolated Razorpay browser Checkout adapter (not generic Payment UX rewrite)
10. Checkout.js loading as provider integration code, not Payment authority
11. `POST /api/integrations/payments/razorpay/webhook` hosted by `customer-commerce`
12. Webhook signature verification before any Payment transition
13. **D-362** webhook acknowledgement only after durable Payment acceptance/application
14. Order materialization outside the Razorpay provider-ack critical path
15. Missing-Order recovery via existing `recoverMissingOrdersBatch` (operationally invokable + proven)
16. Productionization of existing `queryExecution` / `reconcilePaymentAttempt` for Razorpay
17. Fail-closed Razorpay runtime composition into existing `customer-commerce`
18. Server-only Razorpay configuration / secrets architecture
19. Preservation of D-360 / Payment initiation idempotency
20. GTM acceptance architecture (tests specified, not implemented here)

### 4.2 Explicitly excluded

- Razorpay production code in this architecture-lock task
- New Payment domain / microservice / second payment state machine
- New Order materialization logic or duplicate Order path
- Payment schema change
- Next.js Route Handlers / `src/app/api` commerce or webhook host
- New deployable service
- `NEXT_PUBLIC_*` Razorpay secrets or extra public-config mechanism for Key ID
- Speculative queue / worker / scheduler solely for IMP-026
- Kafka / RabbitMQ / Redis queue / SQS / another Compose service for IMP-026
- New Payment webhook inbox table (`payment_provider_observations` is not an inbox)
- Payment schema change
- Permanent scheduled missing-Order recovery loop/service automatically required by D-362
- Refund initiation, refund webhook workflow, customer refund UX, refund reconciliation — **IMP-027**
- Multi-provider payment orchestration
- International payments / EMI / BNPL / COD
- Redesign of IMP-025 generic customer ordering UX
- IMP-027 scope change

### 4.3 Deferred / later-roadmap ownership

| Concern | Owner |
|---|---|
| Refund | IMP-027 |
| Invoice / tax receipt / credit note | IMP-028 |
| Operations Console API / UI | IMP-029 / IMP-030 |
| Delivery | IMP-031+ |
| Notifications / WhatsApp | IMP-033+ |
| Scheduled reconciliation worker / operational automation | separate future work if not required for GTM acceptance; not required merely by D-362 |
| Permanent scheduled missing-Order recovery runner | not automatically required by D-362; raise separately only if implementation later proves recovery cannot be operated safely without one |
| Customer self-service cancellation | DEFERRED_UNSCHEDULED |
| Multi-provider / intl / EMI / BNPL / COD | DEFERRED_UNSCHEDULED |

---

## 5. Applicable Binding Decisions and ADRs

### Binding decisions (CURRENT / AMENDED)

| ID | Relevance to IMP-026 |
|---|---|
| **D-361** | Razorpay is V1 production provider; Razorpay Standard Checkout is V1 collection surface |
| **D-362** | Webhook 2xx only after durable Payment acceptance; Order materialization outside provider-ack path; missing-Order recovery via `recoverMissingOrdersBatch`; no new inbox/worker/schema |
| **D-356** | Public frontend remains static Next.js export; no dynamic Next.js commerce/webhook host |
| **D-357** | Order lifecycle vocabulary unchanged |
| **D-358** | System-role inventory ownership unchanged |
| **D-359** | Same `customer-commerce` process; no new service |
| **D-360** | `/api/v1/*` customer contract + Payment JSON `idempotencyKey` preserved |

**D-356–D-360 are unchanged.** D-361 remains CURRENT for provider selection. D-362 amends D-361
only for webhook acknowledgement / post-payment Order effect. D-161 / D-162 remain historical
Cashfree selection; they are not current V1 provider/surface authority.

### Applicable ADRs (read with register supersession)

| ADR | Status for IMP-026 | Note |
|---|---|---|
| ADR-003 | AMENDED | Modular monolith; host constrained by D-356 / D-359 |
| ADR-009 | AMENDED | Cashfree provider/surface selection superseded by D-361; webhook acknowledgement / post-payment Order recovery refined by D-362; provider-neutral Payment, webhook/query/evidence, refund intent remain |
| ADR-014 | SUPERSEDED for HTTP host | Must not restore Route Handlers; webhook is not a Next.js Route Handler |
| ADR-015 | CURRENT foundations | Typed `BOBA_BEAR_*` config; no `NEXT_PUBLIC_*` secrets |

Relevant global invariants: **ARCH-G02**, **ARCH-G06**, **ARCH-G07**, **ARCH-G10**, **ARCH-G11**,
**ARCH-G12**, **ARCH-G14**.

Relevant Non-Goals: not a speculative microservice platform; domain ≠ deployable service; V1 does
not require multi-provider payment orchestration; no opportunistic deferred capabilities.

---

## 6. Provider Adapter

Lock a Razorpay adapter behind existing:

```text
src/server/payment/provider/types.ts
PaymentProvider
```

The future adapter must implement the existing relevant provider operations:

| Operation | IMP-026 requirement |
|---|---|
| `createExecution` | Required — create Razorpay provider execution/order |
| `queryExecution` | Required — authoritative recovery / reconciliation |
| `verifyWebhook` | Required — signed webhook verification |
| `cancelExecution` | Optional — only if existing Payment semantics require it (currently unused by Payment operations) |

Domain retry continues to create a new Attempt and invoke provider execution according to accepted
Payment behavior. Do **not** create a Razorpay-specific retry state machine.

Reuse existing generic persistence where sufficient:

- `providerExecutionIdentity`
- `payment_provider_references`
- `payment_provider_observations`
- provider event IDs (`providerEventId` dedup)
- existing initiation idempotency (`payment_initiation_idempotency`, D-360)

```text
SCHEMA_CHANGE_REQUIRED: NO
```

Verified against current Payment schema (`src/platform/database/schema/payment.ts`): five existing
Payment tables already persist execution identity, provider references, observations
(`sync` \| `webhook` \| `query` \| `reconciliation`), and initiation idempotency. Razorpay Order ID,
Payment ID, and webhook event ID fit existing reference/observation columns. Client-evidence
verification must use an existing `observationSource` (application-path verification records as
`sync`; subsequent recovery uses `query` / `webhook` / `reconciliation`). Do **not** add a fifth
observation source or Razorpay-specific tables.

If implementation later proves an unavoidable schema requirement, stop and report the conflict
rather than silently adding it.

---

## 7. Razorpay Provider Identity Mapping

Conceptual mapping only (not implemented here):

| Identity | Authority |
|---|---|
| Internal Payment ID | BOBA Bear |
| Internal Attempt ID | BOBA Bear |
| Razorpay Order ID | Provider execution / reference identity (`providerExecutionIdentity` and/or `payment_provider_references`) |
| Razorpay Payment ID | Provider reference (`payment_provider_references`) |
| Razorpay webhook event ID | Provider event identity for deduplication (`providerEventId`) |
| Sync / webhook / query / reconciliation evidence | Existing `payment_provider_observations` |

Do **not** create parallel Razorpay-specific Payment tables.

Exact `referenceKind` strings are implementation-level so long as they remain provider-scoped,
non-empty, unique per `(provider, referenceKind, referenceValue)`, and do not leak into generic
Payment/Order domain types.

---

## 8. Provider Contract Extension — Client Evidence

Lock an optional provider-neutral provider capability on the existing `PaymentProvider` port,
named to match repository convention:

```text
verifyClientEvidence(input) → NormalizedProviderEvidence
```

Conceptual input (exact TypeScript shape is implementation-level, names should follow existing
`PaymentProviderVerify*` convention):

```text
PaymentProviderVerifyClientEvidenceInput
  paymentId
  attemptId
  providerExecutionIdentity
  kind
  payload
```

Requirements:

1. Receive sealed/provider-scoped evidence from the Payment **application** boundary, not from
   arbitrary frontend code acting as transition authority.
2. Delegate provider-specific signature interpretation to the Razorpay adapter.
3. Produce the existing `NormalizedProviderEvidence` shape.
4. Fail closed on invalid signature, unknown kind, mismatched provider execution identity, or
   malformed payload.
5. Must not allow the browser to choose Payment outcome.

The production Razorpay adapter **must** implement `verifyClientEvidence`. Providers that only
return redirect `clientAction` may omit it until needed; invoking it when unsupported fails closed.
`disabledPaymentProvider` remains fail-closed. Exact TypeScript optionality (`?` vs required on the
shared port) is implementation-level.

Do **not** implement the interface in this architecture lock.

---

## 9. Client-Evidence Application Operation

Lock a Payment application operation for authenticated customer evidence submission.

Canonical public route:

```text
POST /api/v1/payments/{paymentId}/client-evidence
```

Host: existing `customer-commerce` (D-359). Convention: D-360 `/api/v1/*` customer API — **not** an
integration webhook.

Application operation must:

1. Establish the authenticated customer owns / is authorized for the Payment (existing customer
   trust + Payment ownership; no caller-supplied `userId` authority).
2. Load authoritative Payment / Attempt / provider context.
3. Pass provider client evidence to the configured provider via `verifyClientEvidence`.
4. Verify provider evidence server-side.
5. Apply evidence only through existing Payment transition authority.
6. Query / reconcile provider state when necessary before treating Payment as financially successful.
7. Reuse existing Order materialization after authoritative success:
   `tryMaterializeOrderAfterPaymentCompletion` (or exact current equivalent). Client-evidence is a
   customer API, not the Razorpay provider-ack path; D-362 does not forbid awaiting materialization
   here for UX. The Razorpay webhook acknowledgement path must not await it (**D-362**).

Do **not** create Order materialization inside the HTTP handler.

Do **not** let HTTP/browser payload directly choose Payment outcome.

Do **not** use `payment_initiation_idempotency` for this operation (it is not initiation). Duplicate
evidence submission must be safe through existing first-success-wins / provider-event dedup /
transition idempotency.

Suggested application name (implementation-level if a mechanical synonym is required):
`submitPaymentClientEvidence`.

This route is an **IMP-026** addition. It is not retroactively part of accepted IMP-024 inventory.

---

## 10. Client-Evidence Wire Contract

Keep the customer HTTP contract provider-neutral. Smallest generic structure compatible with
existing `{ kind, payload }` conventions:

```json
{
  "kind": "<provider client evidence kind>",
  "payload": {
    "...": "..."
  }
}
```

For Razorpay Standard Checkout, the future adapter is expected to interpret provider-returned
values such as:

- provider payment ID
- provider order ID
- provider signature

Do **not** require generic Payment transport or generic Payment UX to understand Razorpay field
semantics.

Locked validation (architecture level):

| Rule | Requirement |
|---|---|
| Auth | Authenticated customer session; Payment ownership required; unknown/other-customer Payment → existing `PAYMENT_NOT_FOUND` style non-enumeration |
| Content-Type | `application/json` (existing customer-commerce JSON reader) |
| Body size | Existing `MAX_JSON_BODY_BYTES` (64 KiB) |
| Shape | JSON object; only top-level fields `kind` and `payload` |
| `kind` | Required non-empty string; bounded length; Razorpay adapter expected kind: `razorpay_standard_checkout` |
| `payload` | Required object; string values only (compatible with existing `clientAction.payload` `Record<string, string>` convention); bounded key count and value length; no nested objects/arrays |
| Trust | Supplying signature fields does **not** make the browser response trusted financial state |

Exact Razorpay callback field names inside `payload` are adapter-private. Implementation must pin
them against current official Razorpay documentation at build time, not against this document as an
unversioned SDK dump.

Error envelope remains D-360 `{ ok:false, code, requestId }`. Do not invent `PAYMENT_NOT_RETRYABLE`.
Invalid signature / unverified evidence must not transition Payment to success.

Do **not** implement the route in this lock.

---

## 11. `clientAction` Extension

Current IMP-025 UX understands redirect behavior only. Lock an additional accepted action:

```text
kind = "razorpay_standard_checkout"
```

The action is server-generated and browser-safe. It is an **integration instruction**, not Payment
authority.

Minimum conceptual payload (all string values, no secrets):

| Field | Purpose |
|---|---|
| Razorpay Key ID | Browser-safe identifier supplied **only** through this server-generated action |
| Razorpay provider Order ID | Checkout execution identity |
| Amount (paise) | Authoritative Checkout/Payment snapshot amount |
| Currency | Authoritative currency (`INR`) |
| Internal Payment ID | Needed for subsequent BOBA Bear client-evidence submission |
| Optional safe display / prefill | Only where already supported by accepted customer data (name / contact); never invent PII |

Must **never** appear in `clientAction`:

- Razorpay Key Secret
- Razorpay Webhook Secret
- internal security credentials
- merchant administrative credentials
- webhook headers

Generic Payment UX continues to start / check / retry / succeed / fail / continue to Order.
Razorpay-specific interpretation of this action belongs only in the Razorpay browser adapter.

Existing `redirect` `clientAction` remains valid for non-Razorpay/test providers.

---

## 12. Frontend Integration Boundary

Lock a dedicated Razorpay browser-integration adapter rather than embedding provider-specific code
throughout generic ordering components.

```text
generic PaymentPanel
    ↓
provider-neutral clientAction
    ↓
Razorpay Standard Checkout browser adapter
    ↓
provider callback evidence
    ↓
POST /api/v1/payments/{paymentId}/client-evidence
    ↓
generic Payment application
```

| Layer | Responsibility |
|---|---|
| Generic Payment UX (IMP-025 retained) | start; checking; retry; success; failure; Order continuation |
| Razorpay browser adapter (IMP-026) | collection surface + translating provider callback data into generic client-evidence submission |

Do **not** redesign IMP-025 customer ordering UX. Generic components must not import Razorpay SDKs
or encode Razorpay field semantics.

---

## 13. Checkout.js Loading Boundary

Razorpay's browser Checkout surface is **provider integration code**, not a new application
framework.

- Do not require a new npm state-management framework.
- Do not make external Checkout script availability authoritative Payment state.
- If the browser integration script cannot load: UX may surface a provider-unavailable / retry
  condition; backend Payment truth remains unchanged.
- Script load failure must not call Payment transitions and must not fabricate client evidence.

No implementation in this lock.

---

## 14. Webhook Ingress

Canonical external path:

```text
POST /api/integrations/payments/razorpay/webhook
```

Hosted by existing **`customer-commerce`** through Nginx.

This path is:

- not part of `/api/v1/*`
- not a customer API
- not implemented using Next.js Route Handlers
- not a new service

### 14.1 Provider acknowledgement critical path (**D-362**)

```text
POST /api/integrations/payments/razorpay/webhook
→ customer-commerce
→ preserve raw body
→ PaymentProvider.verifyWebhook
→ sealed verified provider event
→ resolve Payment Attempt
→ applyProviderEvidence / existing Payment transitions
→ durable Payment transaction commit
→ HTTP 2xx acknowledgement
```

```text
raw-body verification
→ durable Payment evidence application
→ HTTP 2xx
```

The provider acknowledgement must occur **only after** verified Payment evidence has been durably
accepted/applied.

- Do **not** acknowledge an unverified webhook.
- Do **not** acknowledge before durable Payment acceptance merely to improve latency.
- Duplicate delivery remains safe through existing provider-event identity/deduplication, Payment
  transition rules, first-success semantics, and Order uniqueness/materialization guarantees.
- Do **not** introduce a second event-processing state machine.
- Out-of-order provider evidence must be tolerated by existing transition/reconciliation authority
  and must not regress successful Payment truth.

Additional ingress requirements:

- preserve raw request body for signature verification
- pass relevant headers to the Razorpay adapter
- provider adapter verifies webhook signature (`verifyWebhook`)
- unverified event cannot reach Payment transition logic
- verified evidence goes through existing verified-provider-event / application pipeline
- bounded raw-body size; fail closed on oversized/malformed input after safe rejection semantics
  compatible with provider retry

Do **not** place webhook under `/api/v1/*`.

Do **not** create a Next.js Route Handler.

Do **not** create a webhook microservice.

Nginx routing of this integration path is an IMP-026 **implementation** concern after a separate
implementation authorization, not part of this lock.

### 14.2 Post-ack effect — Order materialization

```text
verified webhook
→ durable Payment transition
→ HTTP 2xx
→ Order materialization outside provider-ack critical path
```

```text
tryMaterializeOrderAfterPaymentCompletion
```

is **not** awaited as part of the Razorpay webhook acknowledgement critical path.

Preserve:

- existing Order materialization logic
- existing Payment state machine
- existing Checkout/Order authority

Do **not** create Razorpay-specific Order creation.

Current accepted `processVerifiedProviderEvent` awaits Payment persistence/transitions and then
awaits Order materialization. IMP-026 Razorpay webhook implementation must not keep Order
materialization on the provider-ack critical path. Client-evidence and reconciliation paths may
still invoke existing materialization after Payment success; those are not provider acknowledgements.

### 14.3 No new inbox / worker / schema

```text
New queue/broker:                 NO
New deployable worker service:    NO
New Payment webhook inbox table:  NO
Payment schema change:            NO
```

Do **not** require Kafka, RabbitMQ, Redis queue, SQS, or another Compose service for IMP-026.

Existing Postgres / Payment transition authority remains sufficient for the Payment webhook itself.
`payment_provider_observations` is **not** an inbox and must not be used as one.

Automatic scheduling is **not** part of this architecture lock. Do not invent speculative recurring
infrastructure. IMP-026 must provide a production-operable missing-Order recovery invocation
mechanism and runbook. A permanent scheduled recovery loop/service is **not** automatically required
by D-362. If implementation later proves recovery cannot be operated safely without an automatic
runner, that must be raised separately rather than silently added.

### 14.4 Unknown-attempt webhook behavior

Verified current processor behavior: `processVerifiedProviderEvent` returns `null` for an unknown
provider execution identity and persists no observation.

Under the accepted IMP-026 provider-order creation architecture, Razorpay execution identity is
created from an existing BOBA Bear Attempt (`createExecution` after Attempt exists). A verified
webhook whose provider execution cannot be correlated is therefore **abnormal**, not the expected
steady-state path. It is still a required safe-failure case.

The production webhook handler must:

- distinguish an authenticated/verified webhook whose provider execution cannot yet be correlated
- not corrupt Payment state
- provide sufficient logging/operational evidence for investigation/reconciliation
- not leak secrets or provider payloads
- rely on provider query / reconciliation where appropriate
- not invent an inbox schema or persist uncorrelated events into Payment tables as fake acceptance

Unknown execution is **not** durable Payment acceptance. Do **not** HTTP 2xx as if Payment evidence
was applied. Exact non-success status is implementation-level, compatible with provider retry and
operational investigation, without creating Payment rows or observations that imply acceptance.

Unsupported / non-collection event types (including refund) must not enter Payment transitions.
Refund remains **IMP-027**. Exact ignore/ack behavior for non-collection events is
implementation-level provided it does not corrupt Payment, does not create an inbox, and does not
treat them as durable Payment acceptance.

Do **not** implement this handler in this lock.

---

## 15. Webhook Financial Authority

Locked distinction:

### Browser callback

Fast UX signal requiring server verification. Not independently authoritative financial truth.

### Verified client evidence

Authenticated customer submission of provider-returned browser evidence. Server verifies via
`verifyClientEvidence`. Immediate confirmation **input** only after verification. Observation source
for this application path: existing `sync`.

### Webhook

Asynchronous signed provider evidence. Observation source: existing `webhook`. Provider
acknowledgement (**D-362**) follows durable Payment application only. Order materialization is a
**post-ack effect**, not part of acknowledgement.

### Provider query / reconciliation

Authoritative recovery when browser/webhook state is incomplete or uncertain. Observation sources:
existing `query` / `reconciliation`. Secondary to normal webhook ingestion; not the primary webhook
durability mechanism.

All provider evidence must normalize through existing Payment transition machinery.

No single browser callback directly creates an Order.

Existing `tryMaterializeOrderAfterPaymentCompletion` (or exact current equivalent) remains the
Order materialization path. On the Razorpay webhook path it runs **outside** provider
acknowledgement (**D-362**).

Browser Checkout success is **not** independently authoritative. The browser must not directly
promote BOBA Bear Payment state.

---

## 16. Missing-Order Recovery (**D-362**)

A process can fail after durable Payment success but before Order materialization completes. That
gap is an **explicitly recoverable GTM state**, not an acceptable silent loss.

Recovery authority (existing; do not invent a second algorithm):

```text
src/server/order/recovery.ts
recoverMissingOrdersBatch
```

or its exact current equivalent.

```text
Payment success committed
+
Order absent
→ recoverMissingOrdersBatch
→ exactly one Order
```

IMP-026 implementation / GTM acceptance must make missing-Order recovery **operationally invokable
and proven**:

- detect Payment / Checkout success with missing Order
- invoke existing Order recovery
- idempotently materialize the missing Order
- prove duplicate invocation does not create duplicate Orders

Implementation must provide a production-operable invocation mechanism and runbook without a new
deployable service. A Compose `tools`-profile CLI or equivalent operator entrypoint that calls
existing `recoverMissingOrdersBatch` is allowed. A new default runtime service, queue, or broker is
forbidden. A permanent scheduled recovery loop/service is **not** automatically required by D-362.

---

## 17. Reconciliation Boundary

Reuse existing:

```text
queryExecution
reconcilePaymentAttempt
```

IMP-026 must productionize reconciliation capability for Razorpay.

Reconciliation:

- does **not** replace normal webhook ingestion
- is **not** the primary webhook durability mechanism
- scheduled reconciliation infrastructure is **not** required merely by D-362

Do **not** introduce speculative queue/worker infrastructure solely for IMP-026 unless existing
repository architecture already requires it.

Distinguish:

| Responsibility | Authority |
|---|---|
| Provider acknowledgement critical path | verified webhook → durable Payment → HTTP 2xx (**D-362**) |
| Post-ack effect | Order materialization outside provider-ack path |
| Missing-Order recovery | `recoverMissingOrdersBatch` |
| Provider-state recovery | `queryExecution` / `reconcilePaymentAttempt` |

| Now (IMP-026 GTM) | Later (not automatic) |
|---|---|
| Callable reconciliation capability required now (`reconcilePaymentAttempt` + `queryExecution` against Razorpay) | Speculative scheduled worker / operational automation — separate if not required for GTM acceptance; not required merely by D-362 |

A future scheduler can remain separate. GTM acceptance must prove recovery is possible by invoking
existing reconciliation, not that a new worker platform exists. Reconciliation may still invoke
existing Order materialization after Payment success; that is provider-state recovery, not webhook
acknowledgement.

---

## 18. Runtime Composition

Production Razorpay adapter must ultimately be composed into the existing `customer-commerce`
runtime.

Current production behavior (`src/server/customer-commerce/main.ts`) does not inject a provider and
therefore defaults to `disabledPaymentProvider`.

IMP-026 future implementation must replace the production-disabled composition with validated
Razorpay composition when production configuration selects/enables it.

Do **not** create another deployment/service.

No canonical payment-provider selector env name exists today (unlike `CUSTOMER_OTP_PROVIDER`).
Do **not** invent a cross-platform configuration standard in this docs task.

Lock instead:

- explicit, fail-closed Razorpay enablement
- `disabledPaymentProvider` remains available for environments where payment provider is
  intentionally disabled
- staging/production must not silently fall back to disabled/fake provider when Razorpay is expected
- E2E fake provider (`e2e-fake-main.ts` / `PAYMENT_FAKE_PROVIDER`) cannot become the production
  provider

Exact selector-name / composition-function naming is **implementation-level**, not an unresolved
provider decision.

---

## 19. Configuration Architecture

Extend the canonical `BOBA_BEAR_*` configuration architecture conceptually:

```text
BOBA_BEAR_RAZORPAY_KEY_ID
BOBA_BEAR_RAZORPAY_KEY_SECRET
BOBA_BEAR_RAZORPAY_WEBHOOK_SECRET
```

These names are compatible with the established `BOBA_BEAR_*` convention. Reuse existing
`BOBA_BEAR_ENV` (or exact repository-equivalent) for runtime environment/mode.

| Name | Boundary |
|---|---|
| `BOBA_BEAR_RAZORPAY_KEY_ID` | Server-configured. Safe to expose to the browser **only** through server-generated `razorpay_standard_checkout` `clientAction`. No `NEXT_PUBLIC_*`. No extra public-config mechanism. |
| `BOBA_BEAR_RAZORPAY_KEY_SECRET` | Server only. Never logged. Never sent to browser. No insecure default. |
| `BOBA_BEAR_RAZORPAY_WEBHOOK_SECRET` | Server only. Distinct webhook verification purpose. Never sent to browser. No insecure default. |
| `BOBA_BEAR_ENV` | Existing environment authority. |

Production/staging must fail closed if Razorpay is enabled/expected but required secrets are
missing or invalid.

Do **not** put real credentials into repository files.

Do **not** add these keys to production config code or `.env.example` in this architecture lock;
example/template placeholders are added by the implementation slice that first loads them, per
existing just-in-time provider-variable convention.

---

## 20. Payment Idempotency

Preserve **D-360** and accepted BOBA Bear Payment initiation idempotency.

Razorpay provider-order creation must be driven from accepted Payment attempt/execution identity.

IMP-026 must **not** replace BOBA Bear idempotency with browser/provider-only idempotency.

```text
customer logical payment action
→ BOBA Bear idempotency (JSON idempotencyKey / payment_initiation_idempotency)
→ Payment Attempt
→ provider execution/order creation (Razorpay Order)
```

Provider retries/reconciliation must not accidentally produce duplicate BOBA Bear payment truth.
Existing first-success-wins, provider-event dedup, and unique `providerExecutionIdentity` /
reference constraints remain the duplicate-truth controls.

---

## 21. Refund Boundary

```text
Refund = IMP-027
```

IMP-026 may capture provider identifiers necessary for later refund work because they are naturally
part of Payment evidence (Razorpay Payment ID / Order ID / references).

IMP-026 must **not** implement:

- refund initiation
- refund webhook workflow
- customer refund UX
- refund reconciliation

unless already unavoidable for Payment integrity, in which case stop and report the conflict.

D-361 must not pull Refund implementation into IMP-026.

---

## 22. GTM Readiness / Acceptance Architecture

Future implementation/acceptance must prove at minimum the following. **Do not implement these
tests in this lock.**

### Configuration

- test/sandbox credentials validated
- production configuration validation exists
- missing/invalid required configuration fails closed
- secrets never reach browser/logs

### Provider creation

- BOBA Bear Payment creates correct Razorpay provider execution/order
- amount/currency comes from authoritative Checkout/Payment snapshot
- provider references persist

### Browser collection

- Standard Checkout action launches using server-generated safe data
- callback evidence is submitted to BOBA Bear
- browser success alone cannot mutate Payment truth

### Signature verification

- valid client evidence accepted
- invalid client signature rejected
- authoritative stored provider Order identity used during verification

### Webhook acknowledgement (**D-362**)

- invalid signature never reaches Payment transitions and is not acknowledged as accepted
- valid signature reaches durable Payment acceptance before HTTP 2xx
- Order materialization does **not** delay webhook acknowledgement
- duplicate delivery remains idempotent (provider-event dedup + first-success + Order uniqueness)
- out-of-order provider evidence cannot regress successful Payment truth
- raw-body verification proven

### Crash-gap / missing-Order recovery (**D-362**)

Prove:

```text
Payment success committed
+
Order absent
→ recoverMissingOrdersBatch
→ exactly one Order
```

Repeated recovery remains idempotent (no duplicate Orders).

### Webhook + browser ordering

Test:

- browser client evidence before webhook
- webhook before browser evidence
- duplicate webhook
- delayed webhook
- provider query after uncertain webhook/browser state

### Reconciliation / provider-state recovery

- provider query can recover authoritative state when webhook/browser path is uncertain
- recovery reuses Payment transitions
- successful recovery reuses existing Order materialization
- reconciliation does not replace normal webhook ingestion

### Payment lifecycle

Test at least:

- successful Payment
- customer cancellation/drop-off
- Payment failure
- retryable flow as supported
- browser return uncertainty
- delayed/missed webhook recovery
- duplicate webhook
- webhook before/after browser callback

### Order integrity

- Order materializes only after authoritative successful Payment
- duplicate provider evidence cannot duplicate Order
- crash after Payment success / before Order materialization is recoverable via
  `recoverMissingOrdersBatch`

### Operational recovery

Document how an operator can invoke missing-Order recovery in production without introducing a new
deployable service (tools-profile / operator entrypoint + runbook calling existing
`recoverMissingOrdersBatch`). A permanent scheduled recovery loop is not automatically required.

### Runtime

- production `customer-commerce` uses Razorpay only when correctly configured
- E2E fake provider cannot become production provider
- Nginx webhook path routes correctly
- customer `/api/v1` contract remains intact

---

## 23. Locked Runtime Topology

```text
Payment provider:           Razorpay
Provider host:              existing customer-commerce composition
Webhook host:               customer-commerce
Webhook path:               POST /api/integrations/payments/razorpay/webhook
Webhook ack:                after durable Payment acceptance (D-362)
Post-ack effect:            Order materialization outside provider-ack path
Missing-Order recovery:     recoverMissingOrdersBatch
Client-evidence path:       POST /api/v1/payments/{paymentId}/client-evidence
Client action:              razorpay_standard_checkout
New deployable service:     NO
New Payment inbox:          NO
New worker service:         NO
Payment schema change:      NO
```

```text
Static Next.js export → Nginx
  /api/customer-auth/*                              → customer-auth:8081
  /api/workforce-auth/*                             → workforce-auth:8082
  /api/v1/*                                         → customer-commerce:8083
  /api/integrations/payments/razorpay/webhook       → customer-commerce:8083
```

---

## 24. Implementation Authorization

```text
Architecture:     ARCHITECTURE_LOCKED
Implementation:   NOT_STARTED
Authorized now:   NO
```

Implementation is authorized only when **all** are true:

1. This capability architecture remains CURRENT and `ARCHITECTURE_LOCKED`
2. D-361 remains CURRENT for provider selection; D-362 remains CURRENT for webhook acknowledgement /
   missing-Order recovery; D-356–D-360 unchanged; D-161/D-162 remain superseded for current provider
   authority
3. `ARCHITECTURE.md` / `ROADMAP.md` / `STATE.md` agree architecture is locked and a **separate**
   coding-agent implementation authorization prompt has been issued
4. `npm run project:consistency` passes

This document remains the implementation contract. It does not self-accept the product and does not
authorize Razorpay production code.

---

## 25. Authority Boundaries

| Question | Authority |
|---|---|
| IMP-026 Razorpay / GTM capability architecture | **This document** |
| Current V1 provider / collection surface | D-361 |
| Razorpay webhook acknowledgement / post-payment Order recovery | D-362 (amends D-361 ack/post-payment effect only) |
| Historical Cashfree provider / Hosted Checkout selection | D-161 / D-162 (superseded for current authority) |
| Provider-neutral Payment domain | Accepted IMP-022 + ADR-009 remainder |
| Customer `/api/v1/*` convention | D-360 + IMP-024 |
| Customer ordering UX | IMP-025 (provider-neutral; Razorpay browser adapter added here without UX redesign) |
| Order lifecycle vocabulary | D-357 |
| Static public frontend rule | D-356 |
| Global durable architecture | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| Acceptance / inventory | [`../STATE.md`](../STATE.md) |
| Sequence | [`../ROADMAP.md`](../ROADMAP.md) |
| Refund | IMP-027 |
