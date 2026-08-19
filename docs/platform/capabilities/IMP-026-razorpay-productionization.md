<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-026",
  "title": "Razorpay Productionization & Payment GTM Readiness",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "COMPLETE_AND_ACCEPTED",
  "implementationAuthorized": true,
  "lastReviewed": "2026-08-18",
  "bindingDecisions": ["D-356", "D-357", "D-358", "D-359", "D-360", "D-361", "D-362", "D-363"],
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
| Implementation | `COMPLETE_AND_ACCEPTED` |
| Implementation authorized | **YES** (IMP-026A + IMP-026B coding-agent work complete; independently accepted) |
| Acceptance | **COMPLETE_AND_ACCEPTED** |
| Completion | independently accepted; `acceptedThrough = IMP-026` |
| External webhook gate | `SATISFIED` (`IMP026_EXTERNAL_ACCEPTANCE_EVIDENCE: ACCEPTED`) |
| Schema change required | **YES** (Payment/provider ingress; `payment_provider_event_inbox` during IMP-026A) |

Architecture remains locked. IMP-026 is independently accepted (`COMPLETE_AND_ACCEPTED`). Do not
start IMP-027 from this artifact without separate authorization consistent with ROADMAP/STATE.

This is an explicit approved provider substitution: historical Cashfree V1 provider/surface
selection (**D-161**, **D-162**) is superseded for current authority by **D-361**. **D-362** amends
D-361 for post-payment Order effect / missing-Order recovery. **D-363** amends D-362 only for
webhook acknowledgement timing / durable inbox / asynchronous Payment processing. D-361 remains
CURRENT for provider selection. D-362 remains CURRENT for Order materialization outside the
provider-ack path, missing-Order recovery, secondary reconciliation, and no new deployable service.
Slice number **IMP-026** is unchanged.

---

## 1. Capability Identity

| Field | Value |
|---|---|
| IMP | IMP-026 |
| Capability | Razorpay Productionization & Payment GTM Readiness |
| Roadmap lifecycle | `COMPLETE_AND_ACCEPTED` |
| Implementation | `COMPLETE_AND_ACCEPTED` |
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Accepted product through | IMP-026 — Razorpay Productionization & Payment GTM Readiness |
| Current product slice | `NONE` |
| Consumes | Accepted IMP-001→IMP-025 foundations, especially IMP-022 Payment, IMP-023 Order, IMP-024 transport, IMP-025 provider-neutral UX |
| Next related slices | IMP-026C pilot UX hardening; IMP-027 Refund; later Invoice / Ops / Delivery / Notifications |
| Binding provider decision | **D-361** |
| Binding webhook / recovery decision | **D-362** (amends D-361 post-payment Order effect / missing-Order recovery; acknowledgement timing further amended by D-363) |
| Binding webhook durability decision | **D-363** (amends D-362 acknowledgement timing only; durable inbox + asynchronous Payment processing) |
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
| Provider-neutral Payment ADR | [`../decisions/ADR-009-payments-webhooks-refunds-reconciliation.md`](../decisions/ADR-009-payments-webhooks-refunds-reconciliation.md) (Cashfree selection superseded by D-361; post-payment Order recovery refined by D-362; webhook acknowledgement timing / durable inbox refined by D-363; provider-neutral remainder remains) |
| This capability lock | **This document** |
| Agent rules | [`../../../AGENTS.md`](../../../AGENTS.md) |

Layering (unchanged):

```text
UI → Transport → Application Operations → Domain Authority → Persistence → Provider Adapter
```

IMP-026 owns the **Razorpay adapter**, production composition, webhook ingress, durable webhook
inbox, client-evidence application operation, and GTM readiness of the existing Payment port. It
must not invent a second Payment domain, Order authority, or deployable service.

---

## 3. Purpose

Make production payment collection GTM-ready by composing **Razorpay** behind the accepted
`PaymentProvider` port, using **Razorpay Standard Checkout** as the customer collection surface,
while preserving provider-neutral Payment / Order authority.

Conceptual outcome:

```text
Accepted Checkout snapshot
→ BOBA Bear Payment + Attempt (existing idempotency)
→ Razorpay provider execution / Order (adapter; one Attempt = one Razorpay Order)
→ razorpay_standard_checkout clientAction (browser-safe; provider internal retry disabled)
→ Razorpay Standard Checkout (browser adapter)
→ POST /api/v1/payments/{paymentId}/client-evidence
→ server-side verification + existing Payment transitions
→ webhook / query / reconciliation as durable evidence
```

Razorpay webhook acknowledgement (**D-363**, amends D-362 timing):

```text
verified webhook
→ durable webhook inbox insert
→ HTTP 2xx
→ asynchronous Payment evidence processing from inbox
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
12. Webhook signature verification before durable inbox acceptance
13. **D-363** webhook acknowledgement only after durable inbox insert (not after Payment transition)
14. Asynchronous inbox processing inside existing `customer-commerce` (no new deployable service)
15. Order materialization outside the Razorpay provider-ack critical path (**D-362**)
16. Missing-Order recovery via existing `recoverMissingOrdersBatch` (operationally invokable + proven)
17. Productionization of existing `queryExecution` / `reconcilePaymentAttempt` for Razorpay
18. One BOBA Bear Payment Attempt = one Razorpay Order; BOBA `retryPayment` owns retry
19. Razorpay Standard Checkout internal retry disabled
20. Automatic capture as the IMP-026 collection model; captured required for authoritative success
21. Deterministic provider receipt / recover-before-recreate on uncertain Order create
22. Fail-closed Razorpay runtime composition into existing `customer-commerce`
23. Server-only Razorpay configuration / secrets architecture
24. Preservation of D-360 / Payment initiation idempotency
25. Payment/provider ingress schema change: dedicated `payment_provider_event_inbox` (one future migration)
26. GTM acceptance architecture (tests specified, not implemented here)

### 4.2 Explicitly excluded

- Razorpay production code in this architecture-lock task
- New Payment domain / microservice / second payment state machine
- New Order materialization logic or duplicate Order path
- Next.js Route Handlers / `src/app/api` commerce or webhook host
- New deployable service
- `NEXT_PUBLIC_*` Razorpay secrets or extra public-config mechanism for Key ID
- Kafka / RabbitMQ / Redis queue / SQS / another Compose service / generic worker framework
- Overloading `payment_provider_observations` with inbox semantics
- Razorpay-specific Order-correlation table (use existing generic provider reference persistence)
- Permanent scheduled missing-Order recovery loop/service automatically required by D-362
- Refund initiation, refund webhook workflow, customer refund UX, refund reconciliation — **IMP-027**
- Multi-provider payment orchestration
- International payments / EMI / BNPL / COD
- Redesign of IMP-025 generic customer ordering UX
- IMP-027 scope change

The dedicated Postgres webhook inbox and in-process claim/process loop are **not** a new
infrastructure platform. They are the minimum durable ingress mechanism for Razorpay provider
events inside existing `customer-commerce`.

### 4.3 Deferred / later-roadmap ownership

| Concern | Owner |
|---|---|
| Refund | IMP-027 |
| Invoice / tax receipt / credit note | IMP-028 |
| Operations Console API / UI | IMP-029 / IMP-030 |
| Delivery | IMP-031+ |
| Notifications / WhatsApp | IMP-033+ |
| Scheduled reconciliation worker / operational automation | separate future work if not required for GTM acceptance; not required merely by D-362 / D-363 |
| Permanent scheduled missing-Order recovery runner | not automatically required by D-362; raise separately only if implementation later proves recovery cannot be operated safely without one |
| Customer self-service cancellation | DEFERRED_UNSCHEDULED |
| Multi-provider / intl / EMI / BNPL / COD | DEFERRED_UNSCHEDULED |

---

## 5. Applicable Binding Decisions and ADRs

### Binding decisions (CURRENT / AMENDED)

| ID | Relevance to IMP-026 |
|---|---|
| **D-361** | Razorpay is V1 production provider; Razorpay Standard Checkout is V1 collection surface |
| **D-362** | Order materialization outside provider-ack path; missing-Order recovery via `recoverMissingOrdersBatch`; secondary reconciliation; no new deployable service |
| **D-363** | Durable webhook inbox before HTTP 2xx; asynchronous Payment processing inside `customer-commerce`; one Attempt = one Razorpay Order; Checkout internal retry disabled; captured required for success; automatic capture; deterministic receipt / recover-before-recreate; Payment/provider ingress schema change |
| **D-356** | Public frontend remains static Next.js export; no dynamic Next.js commerce/webhook host |
| **D-357** | Order lifecycle vocabulary unchanged |
| **D-358** | System-role inventory ownership unchanged |
| **D-359** | Same `customer-commerce` process; no new service |
| **D-360** | `/api/v1/*` customer contract + Payment JSON `idempotencyKey` preserved |

**D-356–D-360 are unchanged.** D-361 remains CURRENT for provider selection. D-362 remains CURRENT
for post-ack Order effect / missing-Order recovery / secondary reconciliation / no new deployable
service. D-363 amends D-362 only for webhook acknowledgement timing. D-161 / D-162 remain historical
Cashfree selection; they are not current V1 provider/surface authority.

### Applicable ADRs (read with register supersession)

| ADR | Status for IMP-026 | Note |
|---|---|---|
| ADR-003 | AMENDED | Modular monolith; host constrained by D-356 / D-359 |
| ADR-009 | AMENDED | Cashfree provider/surface selection superseded by D-361; post-payment Order recovery refined by D-362; webhook acknowledgement timing / durable inbox refined by D-363; provider-neutral Payment, webhook/query/evidence, refund intent remain |
| ADR-014 | SUPERSEDED for HTTP host | Must not restore Route Handlers; webhook is not a Next.js Route Handler |
| ADR-015 | CURRENT foundations | Typed `BOBA_BEAR_*` config; no `NEXT_PUBLIC_*` secrets |

Relevant global invariants: **ARCH-G02**, **ARCH-G06**, **ARCH-G07**, **ARCH-G10**, **ARCH-G11**,
**ARCH-G12**, **ARCH-G13**, **ARCH-G14**.

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
| `createExecution` | Required — create/resolve Razorpay provider execution/order for the BOBA Attempt |
| `queryExecution` | Required — authoritative recovery / reconciliation |
| `verifyWebhook` | Required — signed webhook verification |
| `cancelExecution` | Optional — only if existing Payment semantics require it (currently unused by Payment operations) |

Domain retry continues to create a new Attempt and invoke provider execution according to accepted
Payment behavior. Do **not** create a Razorpay-specific retry state machine. Do **not** reuse a
failed/terminal Razorpay Order as a new BOBA Bear Attempt.

Reuse existing generic persistence where sufficient:

- `providerExecutionIdentity`
- `payment_provider_references`
- `payment_provider_observations` (applied provider evidence / audit — **not** an inbox)
- provider event IDs (`providerEventId` dedup after application)
- existing initiation idempotency (`payment_initiation_idempotency`, D-360)

Dedicated durable ingress (D-363; **not** `payment_provider_observations`):

```text
payment_provider_event_inbox
= received / pending processing authority
```

```text
payment_provider_observations
= existing applied provider evidence / audit authority
```

Do **not** overload `payment_provider_observations` with inbox semantics.

```text
SCHEMA_CHANGE_REQUIRED: YES
Payment/provider ingress schema change: YES
```

One future migration is expected during IMP-026 implementation to persist
`payment_provider_event_inbox`. Do **not** create that migration in this architecture lock.
Do **not** add a Razorpay-specific Order-correlation table. Razorpay Order ID, Payment ID, and
webhook event ID continue to fit existing reference/observation columns after application.
Client-evidence verification must use an existing `observationSource` (application-path
verification records as `sync`; subsequent recovery uses `query` / `webhook` / `reconciliation`).
Do **not** add a fifth observation source.

---

## 7. Razorpay Provider Identity Mapping

Conceptual mapping only (not implemented here):

| Identity | Authority |
|---|---|
| Internal Payment ID | BOBA Bear |
| Internal Attempt ID | BOBA Bear |
| Razorpay Order ID | Provider execution / reference identity (`providerExecutionIdentity` and/or `payment_provider_references`) |
| Razorpay Payment ID | Provider reference (`payment_provider_references`) |
| Deterministic provider receipt | Derived from stable BOBA Attempt / execution identity; used to create/recover Razorpay Order |
| Razorpay webhook event ID | Provider event identity for inbox uniqueness and later application dedup (`providerEventId`) |
| Received / pending provider event | `payment_provider_event_inbox` |
| Sync / webhook / query / reconciliation evidence after application | Existing `payment_provider_observations` |

Do **not** create parallel Razorpay-specific Payment tables solely for Order correlation.

Exact `referenceKind` strings are implementation-level so long as they remain provider-scoped,
non-empty, unique per `(provider, referenceKind, referenceValue)`, and do not leak into generic
Payment/Order domain types.

### 7.1 One BOBA Attempt = one Razorpay Order

```text
one BOBA Bear Payment Attempt
=
one Razorpay Order
```

The BOBA Bear Attempt remains internal authority. The Razorpay Order is provider execution
identity/reference.

BOBA Bear `retryPayment` remains the retry authority. When BOBA Bear creates a new Payment Attempt,
the Razorpay adapter creates/resolves a new provider Order for that Attempt.

Do **not** reuse a failed/terminal Razorpay Order as a new BOBA Bear Attempt.

### 7.2 Disable Razorpay internal Checkout retry

Lock:

```text
Razorpay Standard Checkout retry.enabled = false
```

or the exact Razorpay-equivalent future integration configuration.

Reason: BOBA Bear owns Payment retry semantics. The provider collection surface must not
independently create repeated provider payment attempts under one BOBA Bear terminal Attempt in a
way that conflicts with existing Payment transitions.

Future user retry flow:

```text
failed BOBA Attempt
→ BOBA Bear retryPayment
→ new Attempt
→ new Razorpay Order
→ new Standard Checkout action
```

Do **not** implement this setting in this architecture lock.

### 7.3 Razorpay financial-state mapping

Lock the minimum provider-state interpretation. Do **not** create new BOBA Bear Payment states
solely to mirror Razorpay. The existing Payment state machine remains authoritative.

| Razorpay state | BOBA Bear interpretation |
|---|---|
| created / order-created | non-success |
| payment authorized | non-success / pending provider evidence |
| payment captured | authoritative provider-success evidence |
| payment failed | provider definitive non-success according to existing Payment transition rules |
| refund-related provider states | must **not** regress an already successful Payment; Refund ownership remains IMP-027 |

Do **not** add Refund implementation.

### 7.4 Automatic capture

Automatic capture is the intended IMP-026 Razorpay collection model.

Future provider-order creation must request/configure automatic capture using the
provider-supported mechanism selected during implementation.

BOBA Bear Order materialization must occur only after authoritative captured-success evidence.
Do **not** treat mere authorization as sufficient for Order fulfillment/materialization.

No capture implementation in this architecture lock.

### 7.5 Deterministic provider Order identity / recovery

The Razorpay adapter must create a provider Order using a deterministic, unique provider-safe
receipt derived from stable BOBA Bear execution/Attempt identity.

Requirements:

- same BOBA Attempt always derives the same provider receipt identity
- receipt must satisfy provider length/format requirements
- receipt generation must be deterministic and tested
- provider execution/reference persistence remains in existing generic Payment reference tables

If Razorpay Order creation returns an uncertain network result:

do **NOT** blindly create another Razorpay Order.

The adapter must first attempt to recover/find the provider Order associated with the deterministic
receipt or other locked provider correlation mechanism.

Only if authoritative provider evidence establishes no existing provider execution may creation
safely continue.

Do **not** add a Razorpay-specific table solely for Order correlation. Existing generic provider
reference persistence remains the durable reference authority after creation/recovery.

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
   customer API, not the Razorpay provider-ack path; D-362 / D-363 do not forbid awaiting
   materialization here for UX. The Razorpay webhook acknowledgement path must not await it.

Do **not** create Order materialization inside the HTTP handler.

Do **not** let HTTP/browser payload directly choose Payment outcome.

Do **not** use `payment_initiation_idempotency` for this operation (it is not initiation). Duplicate
evidence submission must be safe through existing first-success-wins / provider-event dedup /
transition idempotency.

Suggested application name (implementation-level if a mechanical synonym is required):
`submitPaymentClientEvidence`.

This route is an **IMP-026** addition. It is not retroactively part of accepted IMP-024 inventory.
D-361 client-evidence architecture remains unchanged: browser callback evidence is authenticated
customer evidence, server-verified, and not independently authoritative.

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
authority. D-361 Standard Checkout `clientAction` remains unchanged.

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

### 14.1 Provider acknowledgement critical path (**D-363**)

```text
POST /api/integrations/payments/razorpay/webhook
→ customer-commerce
→ preserve exact raw request body
→ verify Razorpay webhook signature
→ normalize/seal verified provider evidence
→ durably insert verified event/evidence into payment_provider_event_inbox
→ HTTP 2xx
```

```text
raw-body verification
→ durable webhook inbox
→ HTTP 2xx
→ asynchronous Payment transition
```

The HTTP request must **not** wait for:

- `applyProviderEvidence`
- Payment row locking / transitions
- provider reconciliation
- Order materialization

Do **not** acknowledge an event whose signature failed.

Do **not** return successful acknowledgement unless the verified event has been durably accepted
into the inbox or is already known as a durable duplicate.

Former D-362 acknowledgement concept (verified evidence → apply Payment transition → HTTP 2xx) is
**replaced for Razorpay** by D-363. D-362 remains CURRENT for Order materialization outside the
provider-ack path, missing-Order recovery, secondary reconciliation, and no new deployable service.

Additional ingress requirements:

- preserve exact raw request body for signature verification
- pass relevant headers to the Razorpay adapter
- provider adapter verifies webhook signature (`verifyWebhook`)
- unverified event cannot reach inbox acceptance or Payment transition logic
- bounded raw-body size; fail closed on oversized/malformed input after safe rejection semantics
  compatible with provider retry

Do **not** place webhook under `/api/v1/*`.

Do **not** create a Next.js Route Handler.

Do **not** create a webhook microservice.

Nginx routing of this integration path is an IMP-026 **implementation** concern after a separate
implementation authorization, not part of this lock.

### 14.2 Durable webhook inbox

Lock a dedicated Postgres-backed inbound provider-event inbox.

This is **not** `payment_provider_observations`.

Conceptual responsibilities (do not prescribe more columns than necessary):

- durable received-event storage
- provider identity
- provider event ID
- verified replayable normalized evidence, or sufficient verified source material to reconstruct it safely
- processing lifecycle / state
- processing attempts
- received timestamp
- processed / completed timestamp
- last safe error metadata where needed
- duplicate protection

Lock uniqueness for Razorpay provider event identity, conceptually:

```text
(provider, providerEventId)
```

| Store | Authority |
|---|---|
| `payment_provider_event_inbox` | received / pending processing authority |
| `payment_provider_observations` | existing applied provider evidence / audit authority |

```text
Payment/provider ingress schema change: YES
New deployable service:                 NO
New queue / broker:                     NO
Background processing host:             customer-commerce
```

One future migration is expected during implementation. Do **not** create it in this lock.

### 14.3 Processing topology

The durable inbox is processed asynchronously by the existing **`customer-commerce`** runtime.
No new deployable service.

Lock a small background claim/process loop owned by the existing `customer-commerce` process.

Conceptual flow:

```text
durable inbox row
→ claim
→ existing Payment provider-event application path
→ applyProviderEvidence
→ existing Payment state machine
→ mark inbox event processed
```

On authoritative Payment success:

```text
→ existing Order materialization
```

If Order materialization fails after successful Payment:

```text
→ existing recoverMissingOrdersBatch remains recovery authority
```

Do **not** create another Payment state machine.

Do **not** create Razorpay-specific Order creation.

### 14.4 Crash semantics

| Failure point | Guarantee |
|---|---|
| Crash before durable inbox insert | No successful HTTP acknowledgement. Provider may redeliver. |
| Crash after durable inbox insert but before HTTP 2xx | Provider may redeliver. Unique `(provider, providerEventId)` makes redelivery safe. |
| Crash after HTTP 2xx but before Payment processing | Inbox event remains pending and must be processable after `customer-commerce` restart. |
| Crash after Payment success but before Order materialization | `recoverMissingOrdersBatch` remains the canonical Order-gap recovery mechanism. |

No acknowledged verified webhook may depend solely on volatile in-memory work.

### 14.5 Claim / retry behavior

Do **not** design a general-purpose queue platform. Lock only the minimum background-processing
semantics needed for this payment-provider webhook inbox:

- bounded batch claiming
- safe concurrent claim semantics using existing Postgres conventions where possible
- processing retry after transient failure
- terminal / poison-event operational visibility
- duplicate event safety
- restart recovery

Do **not** create:

- Redis
- Kafka
- RabbitMQ
- SQS
- another Compose service
- a generic cross-platform worker framework

This is a payment-provider webhook inbox, not a new infrastructure platform.

### 14.6 Unknown / uncorrelated provider events

The inbox architecture must handle a verified Razorpay event even when immediate BOBA Bear
Payment/Attempt correlation is unavailable.

The event must **not** be silently lost simply because the provider execution cannot yet be
correlated.

```text
verified webhook
→ durable inbox
→ HTTP 2xx
→ processor attempts correlation
→ unresolved correlation remains visible / retryable or operationally actionable
→ provider query / reconciliation may assist recovery
```

Do **not** invent Payment state.

Do **not** leak raw provider payloads or secrets in operational logs.

Unsupported / non-collection event types (including refund) must not enter Payment transitions.
Refund remains **IMP-027**. Verified non-collection events may be durably inbox'd so they are not
silently lost; they must not regress successful Payment. Exact terminal/ignore handling after
durable capture is implementation-level provided it does not corrupt Payment.

### 14.7 Post-ack effect — Order materialization (**D-362**)

```text
verified webhook
→ durable inbox
→ HTTP 2xx
→ asynchronous Payment transition
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

Client-evidence and reconciliation paths may still invoke existing materialization after Payment
success; those are not provider acknowledgements.

### 14.8 D-362 relationship

D-362 remains CURRENT for:

- Order materialization outside provider webhook critical path
- missing-Order recovery
- reconciliation as secondary provider-state recovery
- no new deployable service

D-363 amends D-362 specifically for webhook acknowledgement timing. Do **not** supersede D-362
wholesale.

---

## 15. Webhook Financial Authority

Locked distinction:

### Browser callback

Fast UX signal requiring server verification. Not independently authoritative financial truth.

### Verified client evidence

Authenticated customer submission of provider-returned browser evidence. Server verifies via
`verifyClientEvidence`. Immediate confirmation **input** only after verification. Observation source
for this application path: existing `sync`. After client evidence verification, authoritative
provider state may be confirmed/query-reconciled before Payment success is established. D-361
client-evidence boundary remains unchanged.

### Webhook

Asynchronous signed provider evidence. Observation source after application: existing `webhook`.
Provider acknowledgement (**D-363**) follows durable inbox insert only. Payment transition is
asynchronous from the webhook HTTP request. Order materialization is a **post-ack effect**, not
part of acknowledgement (**D-362**).

### Provider query / reconciliation

Authoritative recovery when browser/webhook state is incomplete or uncertain. Observation sources:
existing `query` / `reconciliation`. Secondary to normal webhook ingestion and the durable inbox;
not a replacement for either.

All provider evidence must normalize through existing Payment transition machinery.

No single browser callback directly creates an Order.

Existing `tryMaterializeOrderAfterPaymentCompletion` (or exact current equivalent) remains the
Order materialization path. On the Razorpay webhook path it runs **outside** provider
acknowledgement (**D-362** / **D-363**) and only after authoritative captured-success evidence.

Browser Checkout success is **not** independently authoritative. The browser must not directly
promote BOBA Bear Payment state. Authorized Razorpay state is **not** authoritative success.

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

The new inbox does **not** replace Order-gap recovery.

IMP-026 implementation / GTM acceptance must make missing-Order recovery **operationally invokable
and proven**:

- detect Payment / Checkout success with missing Order
- invoke existing Order recovery
- idempotently materialize the missing Order
- prove duplicate invocation does not create duplicate Orders
- operational runbook

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
- does **not** replace the durable inbox
- is **not** the primary webhook durability mechanism
- scheduled reconciliation infrastructure is **not** required merely by D-362 / D-363

Reconciliation may recover:

- missed provider state
- uncertain browser flow
- uncertain webhook outcome

Do **not** introduce speculative queue/worker infrastructure solely for IMP-026 unless existing
repository architecture already requires it. The inbox claim/process loop inside
`customer-commerce` is not a reconciliation worker platform.

Distinguish:

| Responsibility | Authority |
|---|---|
| Provider acknowledgement critical path | verified webhook → durable inbox → HTTP 2xx (**D-363**) |
| Asynchronous Payment processing | inbox claim/process loop inside `customer-commerce` |
| Post-ack effect | Order materialization outside provider-ack path (**D-362**) |
| Missing-Order recovery | `recoverMissingOrdersBatch` |
| Provider-state recovery | `queryExecution` / `reconcilePaymentAttempt` |

| Now (IMP-026 GTM) | Later (not automatic) |
|---|---|
| Callable reconciliation capability required now (`reconcilePaymentAttempt` + `queryExecution` against Razorpay) | Speculative scheduled worker / operational automation — separate if not required for GTM acceptance; not required merely by D-362 / D-363 |

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

Because the inbox processor lives inside `customer-commerce`, architecture requires safe service
lifecycle behavior:

- processor starts with `customer-commerce` only when Razorpay provider processing is
  enabled/configured
- graceful shutdown stops claiming new events
- already-claimed work is handled according to repository-safe shutdown semantics
- restart can recover pending/abandoned inbox work
- fake E2E provider (`e2e-fake-main.ts` / `PAYMENT_FAKE_PROVIDER`) cannot silently activate this as
  production Razorpay behavior

Do **not** implement runtime hooks in this architecture lock.

No canonical payment-provider selector env name exists today (unlike `CUSTOMER_OTP_PROVIDER`).
Do **not** invent a cross-platform configuration standard in this docs task.

Lock instead:

- explicit, fail-closed Razorpay enablement
- `disabledPaymentProvider` remains available for environments where payment provider is
  intentionally disabled
- staging/production must not silently fall back to disabled/fake provider when Razorpay is expected
- E2E fake provider cannot become the production provider

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

Preserve the existing Razorpay configuration contract from D-361. No new external broker
configuration. The inbox uses existing Postgres persistence.

If an implementation-level claim interval / batch size needs configuration later, prefer safe
internal defaults unless repository authority requires configurable values. Do **not** create
speculative configuration proliferation in this architecture lock.

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
→ provider execution/order creation (Razorpay Order; deterministic receipt)
```

Provider retries/reconciliation must not accidentally produce duplicate BOBA Bear payment truth.
Existing first-success-wins, provider-event dedup, inbox uniqueness `(provider, providerEventId)`,
and unique `providerExecutionIdentity` / reference constraints remain the duplicate-truth controls.

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

Refund-related provider states must **not** regress an already successful Payment.

D-361 / D-363 must not pull Refund implementation into IMP-026.

---

## 22. GTM Readiness / Acceptance Architecture

Future implementation/acceptance must prove at minimum the following. **Do not implement these
tests in this lock.**

### Configuration

- test/sandbox credentials validated
- production configuration validation exists
- missing/invalid required configuration fails closed
- secrets never reach browser/logs

### Provider creation / Attempt identity

- one BOBA Payment Attempt maps to one Razorpay Order
- deterministic receipt / correlation proven
- uncertain Order creation recovers existing provider Order rather than blindly duplicating
- BOBA retry creates a new Attempt / provider Order
- amount/currency comes from authoritative Checkout/Payment snapshot
- provider references persist in existing generic tables

### Razorpay Checkout retry

- provider internal retry disabled (`retry.enabled = false` or Razorpay-equivalent)
- BOBA retry flow remains authoritative

### Capture

- authorized does not create authoritative success
- captured does
- automatic capture configured/verified
- Order materializes only after captured-success evidence

### Browser collection

- Standard Checkout action launches using server-generated safe data
- callback evidence is submitted to BOBA Bear
- browser success alone cannot mutate Payment truth

### Signature verification

- valid client evidence accepted
- invalid client signature rejected
- authoritative stored provider Order identity used during verification

### Ingress (**D-363**)

- valid raw-body webhook signature accepted
- invalid signature rejected (no successful acknowledgement)
- durable inbox insert occurs before HTTP 2xx
- duplicate provider event produces no duplicate pending event

### Crash / durability (**D-363**)

- crash after inbox insert but before Payment processing does not lose the event
- restart processes pending inbox event
- processor retry works after transient failure
- poison / terminal processing failure is operationally visible

### Payment processing

- one inbox event applies through existing Payment transitions
- duplicate processing cannot duplicate successful state
- out-of-order events cannot regress successful Payment

### Browser / webhook ordering

Prove:

- client evidence before webhook
- webhook before client evidence
- duplicate webhook
- delayed webhook
- provider query after uncertain flow

### Reconciliation / provider-state recovery

- provider query can recover authoritative state when webhook/browser path is uncertain
- recovery reuses Payment transitions
- successful recovery reuses existing Order materialization
- reconciliation does not replace normal webhook ingestion or the durable inbox

### Payment lifecycle

Test at least:

- successful Payment
- customer cancellation/drop-off
- Payment failure
- retryable flow as supported (`retryPayment` → new Attempt → new Razorpay Order)
- browser return uncertainty
- delayed/missed webhook recovery
- duplicate webhook
- webhook before/after browser callback

### Order integrity / missing-Order recovery (**D-362**)

```text
Payment success committed
+
Order absent
→ recoverMissingOrdersBatch
→ exactly one Order
```

- Order materializes only after authoritative successful Payment (captured)
- duplicate provider evidence cannot duplicate Order
- crash after Payment success / before Order materialization is recoverable
- recovery invocation, idempotency, repeated invocation, no duplicate Order, operational runbook

### Runtime

- production `customer-commerce` uses Razorpay only when correctly configured
- E2E fake provider cannot become production provider / cannot silently activate production Razorpay inbox processing
- no new deployable service
- `customer-commerce` restart processes outstanding webhook inbox work
- Nginx webhook path routes correctly
- customer `/api/v1` contract remains intact

### Operational recovery

Document how an operator can invoke missing-Order recovery in production without introducing a new
deployable service (tools-profile / operator entrypoint + runbook calling existing
`recoverMissingOrdersBatch`). A permanent scheduled recovery loop is not automatically required.

---

## 23. Locked Runtime Topology

```text
Payment provider:                 Razorpay
Provider host:                    existing customer-commerce composition
Webhook host:                     customer-commerce
Webhook path:                     POST /api/integrations/payments/razorpay/webhook
Webhook ack:                      after durable inbox insert (D-363)
Payment transition:               asynchronous from webhook HTTP request
Post-ack effect:                  Order materialization outside provider-ack path (D-362)
Missing-Order recovery:           recoverMissingOrdersBatch
Provider-state recovery:          queryExecution / reconcilePaymentAttempt
Webhook inbox:                    Postgres payment_provider_event_inbox
Payment/provider ingress schema:  YES (one future migration)
One BOBA Attempt = one Razorpay Order: YES
Razorpay internal Checkout retry: DISABLED
Captured required for success:    YES
Automatic capture:                YES (IMP-026 intended model)
Client-evidence path:             POST /api/v1/payments/{paymentId}/client-evidence
Client action:                    razorpay_standard_checkout
New deployable service:           NO
New queue / broker:               NO
Background processing host:       customer-commerce
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
Implementation:   COMPLETE_AND_ACCEPTED
Authorized now:   YES (accepted)
Acceptance:       COMPLETE_AND_ACCEPTED
External gate:    IMP-026_EXTERNAL_WEBHOOK_GATE: SATISFIED
```

IMP-026 is independently accepted. Do not start IMP-027 from this artifact.

---

## 25. Independent Acceptance Evidence (IMP-026 external webhook gate)

```text
IMP026_EXTERNAL_WEBHOOK_GATE: SATISFIED
IMP026_EXTERNAL_ACCEPTANCE_EVIDENCE: ACCEPTED
Razorpay mode: TEST
Public webhook endpoint: POST https://cradling-unenvied-sapling.ngrok-free.dev/api/integrations/payments/razorpay/webhook
BOBA Checkout ID: 7f53816c-e72c-41b6-800f-fe38d97b1e1f
BOBA Payment ID: 5c93bb80-5f52-458f-a8a1-eae356d28956
BOBA Order: ORD-3ZGDJVFQRXHB
Razorpay Order: order_TR8lqo2solrrHR
Razorpay Payment: pay_TR8m5IrbnKkFN1
Razorpay events (HTTP 200): TR8mAZTG4riBtP payment.authorized; TR8mBaitTRKpLl payment.captured; TR8mC6zOM2E2p2 order.paid
Final BOBA state: Payment SUCCEEDED; Checkout COMPLETED; Order PLACED
Signature validation: PASS
Invalid-signature fail-closed: PASS (HTTP 400; no inbox/commercial side effect)
Exact signed-event replay: PASS (one durable inbox identity; no duplicate Payment; no duplicate commercial effect)
Automated tests: test:payment-razorpay 32/32 PASS; razorpay.http.integration 4/4 PASS
No real money. No Live Mode. No public database exposure.
```

---

## 26. Authority Boundaries

| Question | Authority |
|---|---|
| IMP-026 Razorpay / GTM capability architecture | **This document** |
| Current V1 provider / collection surface | D-361 |
| Razorpay post-payment Order effect / missing-Order recovery | D-362 (amends D-361 ack/post-payment effect; acknowledgement timing further amended by D-363) |
| Razorpay durable webhook inbox / asynchronous Payment processing | D-363 (amends D-362 acknowledgement timing only) |
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
