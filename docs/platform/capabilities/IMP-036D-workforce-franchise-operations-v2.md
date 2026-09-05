<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-036D",
  "title": "Workforce & Franchise Operations Portal V2",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "AUTHORIZED / NOT_STARTED",
  "implementationAuthorized": true,
  "founderUATRequired": true,
  "schemaChangeRequired": false,
  "lastReviewed": "2026-09-05",
  "bindingDecisions": ["D-357", "D-358", "D-359", "D-361", "D-364", "D-372"],
  "dependsOn": ["IMP-010", "IMP-011", "IMP-023", "IMP-024", "IMP-027", "IMP-029", "IMP-030", "IMP-031", "IMP-032", "IMP-033", "IMP-034", "IMP-035", "IMP-036", "IMP-036A"]
}
-->

# IMP-036D — Workforce & Franchise Operations Portal V2

## Capability Architecture (ARCHITECTURE_LOCKED — IMPLEMENTATION AUTHORIZED / NOT_STARTED)

This document is the **locked capability architecture** for IMP-036D. It is the sole CURRENT
capability-architecture authority for this slice. Supporting experience planning must not compete
with this lock.

Founder implementation authorization recorded at GTM-R105 / STATE-R103. Authorization does not
start implementation.

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Lifecycle | `ARCHITECTURE_LOCKED` |
| Implementation | `AUTHORIZED` / `NOT_STARTED` |
| Implementation authorized | **YES** |
| Implementation complete | **NO** |
| Accepted | **NO** |
| Accepted product through | IMP-036C (unchanged) |
| Current product slice | IMP-036D |
| Pending acceptance | NONE |
| Next product slice | IMP-036E |
| Governance checkpoint | GTM-R105 / STATE-R103 |
| Founder UAT required for acceptance | **YES** |
| Schema change required | **NO** |
| New D-number | **NO** (`D-374` not created) |
| Global ARCH bump | **NO** (`ARCH-R19` preserved; `ARCH-R20` not created) |

```text
IMP-036D: ARCHITECTURE_LOCKED
IMP-036D_ARCHITECTURE: LOCKED
IMP-036D_ARCHITECTURE_LOCKED: YES
IMP-036D_IMPLEMENTATION: AUTHORIZED / NOT_STARTED
IMP-036D_IMPLEMENTATION_AUTHORIZED: YES
IMP-036D_STARTED: NO
IMP-036D_IMPLEMENTATION_COMPLETE: NO
IMP-036D_ACCEPTED: NO
IMP-036D_FOUNDER_UAT_REQUIRED: YES
FOUNDER_UAT_REQUIRED: YES
FOUNDER_UAT_REQUIRED_FOR_ACCEPTANCE: YES
schema_change: NO
SCHEMA_CHANGE_REQUIRED: NO
provider_IO: NO (Operations process)
new_service: NO
new_queue: NO
new_broker: NO
new_auth_model: NO
new_roles: NO
new_permissions: NO
new_scope_model: NO
NEW_PAYMENT_PROVIDER_COMPOSITION: NO
NEW_REFUND_PROVIDER_COMPOSITION: NO
NEW_RAZORPAY_SECRET_BOUNDARY: NO
D-374_CREATED: NO
D374_REQUIRED: NO
ARCH_R20_REQUIRED: NO
IMP036D_REFUND_EXECUTION_TOPOLOGY: RESOLVED_AND_LOCKED
IMP036D_REFUND_TOPOLOGY_BLOCKS_ARCHITECTURE_LOCK: NO
IMP036D_REFUND_MUTATION_TRANSPORT_LOCKED: YES
IMP036D_PREPARATION_READINESS_DECISION: NO_NEW_V1_DOMAIN_STATE_REQUIRED
IMP036D_FINANCIAL_DOCUMENT_WORKFORCE_REVIEW: DEFERRED
IMP036D_NOTIFICATION_RESEND_WORKFORCE_TRANSPORT: APPROVED_FOR_ARCHITECTURE
FRANCHISE_IS_BUSINESS_PERSONA: YES
NEW_FRANCHISE_ROLE: NO
NEW_FRANCHISE_PERMISSION: NO
NEW_FRANCHISE_SCOPE_MODEL: NO
ARBITRARY_MULTI_OUTLET_FRANCHISE_RBAC: DEFERRED
AUTHORIZATION IS NOT IMPLEMENTATION START: YES
IMPLEMENTATION_AUTHORIZED: YES
IMPLEMENTATION_STARTED: NO
```

Canonical authorities:

| Question | Authority |
|---|---|
| Why / Non-Goals | [`../VISION.md`](../VISION.md) |
| Binding decisions | [`../decision-register.md`](../decision-register.md) |
| Global architecture | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| IMP sequence / lifecycle | [`../ROADMAP.md`](../ROADMAP.md) |
| Accepted reality | [`../STATE.md`](../STATE.md) |
| This capability lock | **This document** |
| Supporting experience contract | [`../experience/enterprise-experience/IMP-036D-workforce-franchise-operations-v2.md`](../experience/enterprise-experience/IMP-036D-workforce-franchise-operations-v2.md) (SUPPORTING; must not override this lock) |

Layering (unchanged):

```text
UI → Operations/Admin Transport → Application Operations → Domain Authority → Persistence / Adapter
```

---

## 1. Purpose

Turn the narrow Operations Console into a coherent daily workforce workspace for store managers,
kitchen, delivery desk, support, finance, brand management, and other authorized workforce users.

“Franchise” is a **business persona**, not a new RBAC role, permission, or scope model.

This slice is **experience composition + bounded Operations transport extensions** over accepted
Order, Delivery, Refund, Notification, and Operational Status authorities. It does **not** create a
new commerce, payment, refund, delivery, notification, or financial-document domain.

---

## 2. Preserved binding decisions

| Decision | Preservation |
|---|---|
| **D-357** | Order lifecycle remains `PLACED \| ACCEPTED \| FULFILLED \| CANCELLED`. No PREPARING/READY/PACKED/KITCHEN_READY durable states. |
| **D-358** | Existing system-role inventory / STATE ownership remains authoritative. No new franchise role. |
| **D-359** | Static Next.js export + external Node transport. No dynamic Next.js business routes. |
| **D-361** | Razorpay remains V1 production PaymentProvider inside `customer-commerce`. Operations must not host Razorpay secrets, PaymentProvider, or Razorpay I/O. |
| **D-364** | Refund lifecycle and money/provider truth unchanged: `ACCEPTED \| PENDING \| INDETERMINATE \| PROCESSED \| FAILED`. |
| **D-372** | Workforce business operations use `/api/operations/v1/*`. Server-derived workforce principal only. |

Also preserved without new D-numbers: D-365 / D-366 / D-367 Financial Document authority (workforce
FD review remains **DEFERRED** for this slice).

```text
D-374_REQUIRED = NO
ARCH-R20_REQUIRED = NO
```

Do not invent a new D-number merely to restate this capability-local lock.

---

## 3. Refund provider-execution topology (Founder-approved lock)

Prior architecture blocker is **resolved**.

```text
REFUND_WORKFORCE_TRANSPORT = OPERATIONS_PROCESS
REFUND_PROVIDER_EXECUTION = CUSTOMER_COMMERCE
REFUND_DURABLE_HANDOFF = REFUND_AGGREGATE_ACCEPTED_ROW
OPERATIONS_RAZORPAY_IO = NO
OPERATIONS_PAYMENT_PROVIDER = NO
OPERATIONS_RAZORPAY_SECRETS = NO
INTERNAL_HTTP_DELEGATION = NO
NEW_RPC = NO
NEW_QUEUE = NO
NEW_BROKER = NO
NEW_SERVICE = NO
CUSTOMER_COMMERCE_REFUND_RECONCILER = REUSE
REFUND_PROVIDER_IDENTITY = SERVER_DERIVED_FROM_ACCEPTED_PAYMENT_REFERENCE
CALLER_PROVIDER_AUTHORITY = NONE
MANUAL_PROVIDER_RECONCILE_ROUTE = NO
REFUND_HTTP_IDEMPOTENCY = CLIENT_STABLE_REFUND_REQUEST_UUID_AS_REFUND_ID
```

Core model:

```text
Workforce Browser
  ↓
/api/operations/v1/*
  ↓
Operations process
  ↓
workforce authentication
  ↓
server-derived Order → Payment → Outlet
  ↓
resource-scoped authorization
  ↓
local Refund reservation
  ↓
Refund = ACCEPTED
  ↓
PostgreSQL
  ↓
existing customer-commerce RefundReconciliationProcessor
  ↓
existing PaymentProvider
  ↓
Razorpay
```

The Refund aggregate itself is the durable handoff. Do **not** add a second handoff mechanism
(queue, RPC, internal HTTP, outbox event dedicated to refund handoff, or duplicate provider port).

---

## 4. Refund authority and state

Exact D-364 lifecycle remains:

```text
ACCEPTED
PENDING
INDETERMINATE
PROCESSED
FAILED
```

No new Refund state.

`ACCEPTED` remains truthful durable meaning:

- BOBA has locally authorized and reserved the Refund
- the Refund counts against remaining refundable balance
- provider execution may not yet have started
- provider acknowledgement/completion is **NOT** implied

If customer-commerce / Razorpay execution is temporarily unavailable:

- Refund may remain `ACCEPTED`
- reservation remains authoritative
- existing customer-commerce reconciliation retries when its canonical executor resumes
- do **not** release reservation merely because execution is asynchronous
- do **not** manufacture `FAILED`
- do **not** create another Refund automatically

Payment remains `SUCCEEDED`. Refund never rewrites Payment collection truth. Refund never
automatically rewrites Order status. Order cancellation and Refund remain independent commands.

---

## 5. Refund workforce API contract

Exact new Operations transport routes:

```text
GET  /api/operations/v1/orders/{orderId}/refunds
POST /api/operations/v1/orders/{orderId}/refunds
```

Do **not** add a public workforce provider-reconcile route. Do **not** expose underlying
`reconcileRefund` provider operation as normal workforce HTTP.

### 5.1 GET refunds

Purpose: return authorized Refund support context for one Order.

Server derives:

```text
orderId → Order → Payment → Checkout Snapshot → Outlet
```

Permission: `payment.refund.read`  
Authorization: resource-specific against authoritative server-derived Outlet.

Caller must **not** supply as authority: `outletId`, `paymentId`, provider identity, provider payment
id, scope, role, or authorization result.

Safe projection may include:

- refundId, amount, currency, BOBA Refund status
- reason / operator note where appropriate for authorized workforce
- created/accepted/pending/processed/failed timestamps where relevant
- current Refund balance: captured amount, processed refunded amount, reserved amount, remaining
  refundable amount, fully refunded
- safe recovery/status context

Must **not** expose: raw provider payload, provider secrets, webhook secrets, access credentials,
internal stack traces. Provider references/codes are not normal UX unless explicitly necessary for
safe support correlation.

### 5.2 POST refund

Purpose: authorize and durably reserve a new BOBA Refund.

Conceptual request body:

```text
refundRequestId   # UUID — client-stable idempotency / Refund aggregate identity
amountPaise       # positive integer paise
reason            # required; existing normalization/length rules
operatorNote?     # optional; existing normalization/length rules
```

Exact JSON validation must be strict.

`refundRequestId`:

- UUID generated once by client for one logical Refund command
- idempotency identity only
- becomes / deterministically identifies the BOBA Refund aggregate identity
- conveys **NO** authorization and **NO** outlet/payment/provider authority

Path `orderId` is the business locator only.

Server **MUST**:

1. derive Payment from accepted Order/Payment authority
2. derive Outlet from canonical Order/Checkout facts
3. derive provider payment reference from accepted durable Payment provider references
4. require `payment.refund` resource-specific against authoritative Outlet
5. fail closed on missing/ambiguous authoritative provider Payment reference

For V1 / D-361 the valid production provider is Razorpay, but the caller never selects provider.
No global permission-union check is sufficient by itself.

### 5.3 Provider-free reservation operation

The Operations process **MUST NOT** call the current provider-calling `requestRefund` path in a way
that requires a PaymentProvider.

Implementation may refactor the Refund application layer to separate:

```text
authorize + validate + reserve Refund
```

from:

```text
provider execute / reconcile
```

provided D-364 invariants remain unchanged.

Provider-free workforce reservation must:

1. authenticate workforce principal
2. parse/normalize command
3. resolve authoritative Order → Payment → Outlet
4. require `payment.refund`
5. verify Payment `SUCCEEDED`
6. lock Payment
7. lock relevant Refund rows using existing D-364 lock discipline
8. compute remaining refundable amount
9. handle command idempotency
10. create exactly one Refund `ACCEPTED`
11. persist Refund id, Payment/Checkout/Order references, amount/currency, provider identity derived
    from accepted Payment reference, provider Payment reference, deterministic provider idempotency
    key (`refundProviderIdempotencyKey(refundId)`), reason/note, workforce initiator, authorized
    permission
12. commit
13. return current Refund projection
14. perform **ZERO** Razorpay I/O

Never hold DB locks across provider I/O.

---

## 6. Refund HTTP command idempotency

Provider idempotency alone is insufficient for HTTP response-loss replay.

```text
REFUND_HTTP_IDEMPOTENCY =
CLIENT_STABLE_REFUND_REQUEST_UUID_AS_REFUND_ID
```

Existing provider key remains `refundProviderIdempotencyKey(refundId)`.

No new generic idempotency table. No schema migration merely for command replay.

Within the Payment/Refund transaction:

- If `refundRequestId` does not exist: proceed with normal balance validation; create Refund exactly
  once.
- If `refundRequestId` already exists: authorize access first, then compare immutable command
  identity.

Exact replay requires matching at minimum:

- same Refund id / refundRequestId
- same authoritative Payment
- same Order relationship
- same amount
- same currency
- same normalized reason
- same normalized operatorNote
- same initiating workforce actor

Exact match → return current existing Refund (do not reserve again; do not create a second provider
request).

Same request UUID reused with different immutable facts or actor → `REFUND_IDEMPOTENCY_CONFLICT`
(safe conflict response). Do **not** leak the pre-existing Refund to an unauthorized actor.

Concurrent duplicate submissions with the same UUID must converge on one Refund. Refund primary-key
uniqueness plus transaction handling must resolve races safely.

---

## 7. Refund provider execution

Existing customer-commerce remains provider executor.

Reuse:

- `RefundReconciliationProcessor`
- accepted D-364 logic

The processor already operates against non-terminal Refunds including `ACCEPTED`. For an ACCEPTED
Refund without provider refund identity it may execute/recover `createRefund` / `queryRefund` using
the accepted PaymentProvider and durable provider idempotency key.

Do **not**:

- move PaymentProvider to Operations
- duplicate Razorpay composition or credentials
- add a second refund provider port
- add internal REST/RPC between services
- add a new queue or worker deployment

Existing webhook and inbox authority remains unchanged.

---

## 8. Notification workforce support

Bounded Notification support under D-372.

```text
GET  /api/operations/v1/orders/{orderId}/notifications
POST /api/operations/v1/orders/{orderId}/notifications/{notificationRequestId}/resend
```

No generic Notification administration API, inbound conversation console, message composer, or
arbitrary free-text outbound communication. No new Notification permission.

Permission remains `notification.resend`.

### 8.1 GET notifications

Because no separate `notification.read` permission exists, this support projection is visible only
to actors possessing applicable resource-scoped `notification.resend` authority.

Server derives `orderId → Order → Outlet`, requires `notification.resend` against that Outlet, and
returns only notification requests associated with that Order.

A repository query may be added during implementation to list notification requests by authoritative
`orderId`. Do not expose notification records for unrelated Orders/customers.

Safe projection may contain: notificationRequestId, semantic type (translated/presented), channel,
safe status, attempt count, relevant timestamps, safe review/suppression reason needed for recovery,
whether resend is currently allowed.

Do not expose: raw provider payload, provider credentials, customer phone number unnecessarily,
template secrets, internal provider request bodies.

### 8.2 Resend

Body: `{ reason }`.

Required checks, in order:

1. trusted same-origin mutation protection
2. workforce session → principal
3. resolve Order
4. derive authoritative Outlet
5. resolve NotificationRequest
6. require NotificationRequest.orderId == path orderId
7. require resource-specific `notification.resend` against Outlet
8. invoke existing resend authority
9. preserve existing consent, staleness, template, attempt-ceiling, dedup/retry rules

Application-level global/effective-permission check must **not** be the sole resource authorization
for public transport; it may remain defense-in-depth after resource-specific authorization.

Existing manual resend valid source states remain authoritative. Do not invent new resendable states.

### 8.3 Notification provider composition

Operations already hosts the accepted Notification processor/provider composition. Implementation
should share the existing configured Notification channel registry/provider adapter between:

- Operations `NotificationOutboxProcessor`
- manual resend HTTP operation

Do not instantiate competing provider authority. Do not create new Meta credentials/config topology.
Provider result must be whatever the adapter actually reports. No fabricated success.

---

## 9. Order / support workflow

Preserve exact Order lifecycle:

```text
PLACED | ACCEPTED | FULFILLED | CANCELLED
```

The workforce flow may physically prepare an accepted Order without inventing database lifecycle
truth.

Order mutation routes remain existing accepted contracts:

```text
POST /api/operations/v1/orders/{orderId}/accept
POST /api/operations/v1/orders/{orderId}/fulfil
POST /api/operations/v1/orders/{orderId}/cancel
```

Existing concurrency/revision authority remains unchanged.

Cancellation does **NOT** automatically trigger Refund. UI must present cancellation and Refund as
distinct consequences/actions. When both are appropriate: explain consequences in human language,
require existing permissions independently, never silently couple them.

```text
IMP036D_PREPARATION_READINESS_DECISION = NO_NEW_V1_DOMAIN_STATE_REQUIRED
```

---

## 10. Delivery

Reuse accepted IMP-031/032 Delivery authority and existing Operations Delivery transport.

Do not create a new Delivery lifecycle. Current mode remains
`MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY`.

No automatic dispatch, COD, named new courier/provider integration, new provider API, new Delivery
service, or queue/broker.

Delivery page/workflows must use accepted commands and projections. All existing Delivery permission
and concurrency rules remain authoritative. No hard-coded role checks.

---

## 11. Delivery economics

Keep separate:

```text
Serviceability
Customer delivery fee
Provider execution cost
```

Workforce presentation may show, when the actor is authorized for the underlying facts:

- customer delivery charge
- estimated / booked / final provider cost where accepted truth exists
- calculated delivery subsidy/contribution variance

Variance is presentation only:

```text
customer delivery charge - applicable provider cost
```

Use integer paise. Do **not** persist variance as a new financial authority. Provider cost remains
workforce-only. Do **not** expose provider cost to customers. Do **not** add permission merely so
every persona can see it. If an existing role lacks the relevant accepted permission, hide the
data/action.

---

## 12. Target information architecture

```text
Today
Orders
Delivery
Store
Operational Status
```

Permission/scope-derived navigation only. Never hard-code menus by role name.

Suggested static-export-compatible routes:

```text
/workforce/operations/
/workforce/operations/orders/
/workforce/operations/orders/detail/?orderId=<uuid>
/workforce/operations/delivery/
/workforce/operations/store/
/workforce/operations/status/
```

Exact implementation must preserve the static Next.js export constraint. No dynamic server-side
Next.js route. No browser business authority. No client-generated authorization.

### 12.1 Today

Today is an operational composition, not a new domain authority. Show only truthful accepted facts
such as: Orders needing action; accepted/open operational work; delivery actions/recovery requiring
attention; current safe operational status; outlet/store context if authorized.

No invented revenue, conversion, SLA, average preparation time, profitability, provider score,
artificial urgency score, or performance KPI.

No new `/today` aggregate API is authorized by this lock. Prefer composing accepted Order collection,
per-Order Delivery projection, Operational Status, and accepted store/outlet context.

If implementation discovers a genuinely required aggregate API for correctness rather than
convenience/performance: **STOP** and seek architecture amendment.

### 12.2 Orders

Primary actionable queue. Reuse accepted Order collection/search/detail. May improve presentation
through filters, grouping, age, amount, fulfilment/delivery context, and permission-aware actions.
Do not change Order domain meaning. Order detail may compose separate Refund / Notification /
Delivery projections rather than bloating Order authority.

### 12.3 Delivery

Task-oriented workspace over existing Delivery authority. Do not manufacture a second Delivery
aggregate or bulk lifecycle. Use accepted Order collection plus accepted per-Order Delivery
read/actions.

### 12.4 Store

Store in IMP-036D is **read-only operational context**. It may show accepted authorized Brand/Outlet
identity, current outlet context, accepted current operating facts that already have read authority,
and links/navigation to separately authorized existing administration surfaces where appropriate.

IMP-036D Store **MUST NOT** steal IMP-036E. No new management of assortment, availability, operating
hours/schedules, serviceability, broader store configuration, or team/store-management expansion.

If a useful Store fact lacks accepted read transport, omit/defer it rather than invent IMP-036E
management API.

### 12.5 Operational Status

Reuse:

```text
GET /api/operations/v1/operational-status
```

No second observability API. No engineering secrets. No raw process/env configuration.

---

## 13. Financial Document boundary

```text
IMP036D_FINANCIAL_DOCUMENT_WORKFORCE_REVIEW = DEFERRED
```

No Financial Document workforce permission, FD workforce application authority, FD Operations route,
signing UI, certificate/key exposure, or tax-compliance admin workflow.

Existing D-365 / D-366 / D-367 authority remains unchanged. Do not create a fake read capability
merely because Order detail has a “financial” section.

---

## 14. RBAC / franchise boundary

```text
FRANCHISE_IS_BUSINESS_PERSONA = YES
NEW_FRANCHISE_ROLE = NO
NEW_FRANCHISE_PERMISSION = NO
NEW_FRANCHISE_SCOPE_MODEL = NO
ARBITRARY_MULTI_OUTLET_FRANCHISE_RBAC = DEFERRED
```

Existing system roles remain authoritative. Navigation derives from effective permission and
effective scope. Direct URL/API authorization remains server-side. No client role-name
authorization. No generic “franchise owner” role.

---

## 15. Security / privacy

Mandatory:

- trusted-origin protection on Operations mutations
- workforce session resolved server-side
- deny-by-default
- no caller-manufactured scope
- resource-specific authorization
- server-derived Outlet for Refund/Notification
- no Razorpay secrets in Operations/browser
- no WhatsApp secrets in browser
- no customer phone/address exposure beyond operational necessity
- no raw provider payloads
- no browser persistence of sensitive Order/support data
- safe non-disclosing error semantics
- safe request/correlation identifiers
- no secret values in logs

Refund UUID / idempotency identity is not authorization. Notification request ID is not
authorization. Order ID is not authorization.

---

## 16. UX / accessibility

Enterprise workforce UX principles:

- desktop/tablet-first; sensible mobile urgent workflows
- WCAG 2.2 AA target
- keyboard-operable queues/actions; visible focus
- non-color-only status indicators
- semantic tables or accessible responsive equivalents
- announced mutation/state changes
- plain-language page purposes; clear primary actions
- human-readable Brand/Outlet/Order context
- progressive disclosure; useful empty states
- understandable destructive-action confirmation
- no raw JSON; no provider/domain jargon as default user copy

Example presentation (without changing authority): `INDETERMINATE` may be shown as
“Refund status is being verified”.

---

## 17. Required experience states

Architecture must account for:

- loading; empty/no work; read failure + retry; expired session
- access denied / non-disclosing absence
- stale Order; concurrent Order conflict
- stale Delivery; Delivery command pending/failure
- Refund ACCEPTED / PENDING / INDETERMINATE / PROCESSED / FAILED
- Refund exact replay; Refund idempotency conflict
- Notification resend unavailable / policy suppression / success / failure-review-required
- operational-status unavailable
- destructive-action confirmation

Do not create new domain states solely to support visual states.

---

## 18. Frontend authority

Static Next.js export remains. Dynamic data comes only from accepted external Node transport.

```text
UI → Operations/Admin Transport → Application Operations → Domain Authority → Persistence / Adapter
```

Browser must not:

- calculate authoritative refundable balance
- manufacture provider state
- assume cancellation means refund
- persist authoritative delivery state
- infer permissions from role names
- fabricate preparation/readiness states

After successful mutations: refetch authoritative projections.

---

## 19. Schema / infrastructure lock

```text
SCHEMA_CHANGE_REQUIRED = NO
NEW_SERVICE = NO
NEW_QUEUE = NO
NEW_BROKER = NO
NEW_AUTH_MODEL = NO
NEW_ROLE = NO
NEW_PERMISSION = NO
NEW_SCOPE_MODEL = NO
NEW_PAYMENT_PROVIDER_COMPOSITION = NO
NEW_REFUND_PROVIDER_COMPOSITION = NO
NEW_RAZORPAY_SECRET_BOUNDARY = NO
```

Using client-supplied stable Refund UUID as Refund aggregate identity requires no schema migration.

If implementation later proves a migration is genuinely unavoidable: **STOP** and seek architecture
amendment. Do not silently change this lock.

---

## 20. Non-goals

- Starting product implementation without separate Founder implementation-start authorization
- Financial Document workforce review / signing / tax-compliance admin
- IMP-036E store operations management
- New Order preparation/readiness durable states
- New roles, permissions, or franchise scope model
- Moving PaymentProvider / Razorpay secrets into Operations
- New service, queue, broker, RPC, or internal HTTP handoff
- Invented analytics / KPI dashboards
- Customer-facing provider cost exposure
- D-374 / ARCH-R20

---

## 21. Acceptance posture (future)

When separately authorized and implemented, Founder UAT is **required** before
`COMPLETE_AND_ACCEPTED` because this slice materially changes workforce-visible operations,
refund/support recovery, and delivery/order daily workflows.

This architecture lock does **not** authorize implementation, start implementation, complete
implementation, or accept the product slice.
