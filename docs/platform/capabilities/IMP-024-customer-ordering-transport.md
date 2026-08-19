<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-024",
  "title": "Customer Ordering Transport / API",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "COMPLETE_AND_ACCEPTED",
  "lastReviewed": "2026-08-13",
  "bindingDecisions": ["D-356", "D-359", "D-360", "D-357", "D-358"]
}
-->

# IMP-024 — Customer Ordering Transport / API

## Capability Architecture (ARCHITECTURE_LOCKED)

This document is the **locked capability architecture** for IMP-024. Architecture remains
`ARCHITECTURE_LOCKED`. Implementation is `COMPLETE_AND_ACCEPTED`.

> **Amendment (2026-08-13):** Current V1 production payment provider is **Razorpay**
> ([D-361](../decision-register.md)). Historical Cashfree productionization deferrals in this
> document now refer to IMP-026 Razorpay productionization. IMP-024 transport exclusions and
> accepted `/api/v1/*` inventory are unchanged. IMP-026 adds provider webhook ingress
> (`POST /api/integrations/payments/razorpay/webhook`) and provider-neutral client-evidence
> (`POST /api/v1/payments/{paymentId}/client-evidence`) under D-361; webhook acknowledgement /
> missing-Order recovery semantics are refined by **D-362**; acknowledgement timing / durable inbox
> are refined by **D-363**. Those routes are not retroactively part of IMP-024 acceptance.
>
> **Amendment (2026-08-18):** **[D-368](../decision-register.md)** is the TARGET architecture for a
> future customer Menu READ PROJECTION exposed through the existing `customer-commerce` `/api/v1/*`
> façade. Current IMP-024 “no public database-backed Menu transport” remains CURRENT implementation.
> D-368 does not implement a Menu endpoint, lock `GET /api/v1/menu` payload, or authorize a product
> slice. Future public Menu still requires an authorized future capability.

---

## 1. Capability Identity

| Field | Value |
|---|---|
| IMP | IMP-024 |
| Capability | Customer Ordering Transport / API |
| Roadmap lifecycle | `COMPLETE_AND_ACCEPTED` |
| Implementation | `COMPLETE_AND_ACCEPTED` |
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Accepted product through | IMP-024 — Customer Ordering Transport / API |
| Current product slice | `NONE` |

---

## 2. Canonical Authority

| Question | Authority |
|---|---|
| Why / Non-Goals | [`../VISION.md`](../VISION.md) |
| Binding decisions | [`../decision-register.md`](../decision-register.md) |
| Global architecture | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| IMP sequence / lifecycle | [`../ROADMAP.md`](../ROADMAP.md) |
| Accepted reality | [`../STATE.md`](../STATE.md) |
| This capability lock | **This document** |
| Agent rules | [`../../../AGENTS.md`](../../../AGENTS.md) |

Layering (unchanged):

```text
UI → Transport → Application Operations → Domain Authority → Persistence → Provider Adapter
```

Transport must never invent application/domain semantics.

---

## 3. Purpose

Expose accepted customer ordering application operations over a dedicated HTTP transport so a
static customer frontend can complete the owned ordering chain without dynamic Next.js execution.

Transport is a **thin façade**. Application modules remain the sole business authority.

---

## 4. Non-Goals

IMP-024 does **not** include:

- Customer Ordering UX (IMP-025)
- Database-backed public Menu transport
- Standalone Serviceability HTTP
- `cancelCheckout` / customer self-service cancellation
- `cancelPayment`
- Public `prepareCheckoutForPayment`
- Payment provider webhook / reconciliation as customer API
- Payment → Order recovery jobs as customer API
- Refunds (IMP-027), Invoice (IMP-028), Delivery (IMP-031+), Notifications (IMP-033+)
- Workforce / admin / Operations Console APIs (IMP-029+)
- Full observability platform (IMP-036)
- Next.js Route Handlers / `src/app/api` commerce
- Per-domain microservices
- Speculative queues, brokers, buses, workers, caches
- New DB schema merely because transport exists
- Generic IMP-007 idempotency wrapping for Cart / Checkout / Payment
- RFC 9457 Problem Details for commerce
- Loyalty / Rewards / coupon issuance / coupon discovery / promotion administration
- `/api/auth/*` public façades
- `createCart`
- `PAYMENT_NOT_RETRYABLE` (does not exist; must not be invented)

---

## 5. Applicable ARCH-G Invariants

All of ARCH-G01–ARCH-G14 apply. Especially material:

| ID | Relevance |
|---|---|
| ARCH-G01 | Static public customer web |
| ARCH-G02 | Domain capability ≠ automatic deployable service |
| ARCH-G03 | Raw user IDs ≠ authentication authority |
| ARCH-G04 | Distinct customer / workforce trust |
| ARCH-G05–G07 | Checkout / Payment / Order authority chain |
| ARCH-G08 | Caller-supplied IDs cannot manufacture scope |
| ARCH-G09 | Explicit concurrency where correctness requires it |
| ARCH-G11 | Browser ≠ commercial authority |
| ARCH-G12 | No opportunistic deferred capabilities |
| ARCH-G13 | PostgreSQL authoritative persistence |
| ARCH-G14 | No speculative infrastructure |

---

## 6. Applicable CURRENT Decisions

| ID | Role for IMP-024 |
|---|---|
| **D-356** (AMENDED by D-359) | Static frontend + dynamic transport outside Next remains binding |
| **D-359** (CURRENT) | Exact IMP-024 topology: one `customer-commerce` `node:http` façade |
| **D-360** (CURRENT) | `/api/v1/*` commerce convention, error envelope, Payment JSON idempotency |
| **D-357** (CURRENT) | Order lifecycle vocabulary (customer reads) |
| **D-358** (CURRENT) | Role inventory ownership (workforce unrelated to customer transport) |

---

## 7. Runtime Topology

Canonical topology ([D-359](../decision-register.md)):

```text
Static Next.js customer frontend (output: "export")
        ↓
      Nginx
        ↓
   /api/v1/*  →  customer-commerce:8083 (node:http thin façade)
        ↓
accepted application operations
```

| Concern | Canonical value |
|---|---|
| Service name | `customer-commerce` |
| Internal port | `8083` |
| Env var | `CUSTOMER_COMMERCE_SERVICE_PORT` (default `8083`) |
| Public browser port | none new (Nginx `:8080` only) |
| customer-auth | remains separate (`:8081`) |
| workforce-auth | remains separate (`:8082`) |

Accepted Compose runtime includes `customer-commerce` (internal `:8083`) behind Nginx `/api/v1/*`.
Architecture lock did not invent extra services; implementation added exactly this one façade.

Forbidden:

- Next.js Route Handlers for commerce
- Per-domain microservices
- Speculative queue/broker/bus/worker/cache
- New schema solely for transport

---

## 8. Authentication / Trust Boundary

Public auth façades (unchanged):

```text
/api/customer-auth/*
/api/workforce-auth/*
```

Do **not** introduce `/api/auth/*` as a public browser path.

Commerce trust chain:

```text
Browser (same-origin Cookie)
→ Nginx /api/v1/*
→ customer-commerce
→ resolveTrustedCustomerAuthIdentity(runtime, { headers })
→ TrustedCustomerAuthIdentity
→ CustomerActor
→ application operation
```

Rules:

- Prefer existing same-origin session/cookie trust (`boba-customer.session_token`)
- No second browser authentication/token system
- Caller-supplied customer/user IDs cannot manufacture authority
- Customer and workforce trust remain separate
- Guest Cart credential is **not** authentication (see §16)

---

## 9. Public Ingress

Accepted Nginx ownership:

```text
/api/customer-auth/*   → customer-auth:8081
/api/workforce-auth/*  → workforce-auth:8082
/api/v1/*              → customer-commerce:8083
```

Commerce public prefix: `/api/v1/*` — **not** `/api/v1/customer/*` ([D-360](../decision-register.md)).

Auth service `/health/*` and Better Auth internal `/api/auth/*` surfaces remain unproxied.

---

## 10. Public Customer Operation Inventory

| Area | Application operation | HTTP |
|---|---|---|
| Profile | `getOwnCustomerProfile` | `GET /api/v1/me/profile` |
| Profile | `createOwnCustomerProfile` | `POST /api/v1/me/profile` |
| Profile | `updateOwnCustomerProfile` | `PATCH /api/v1/me/profile` |
| Profile | `deleteOwnCustomerProfile` | `DELETE /api/v1/me/profile` |
| Address | `listOwnAddresses` | `GET /api/v1/me/addresses` |
| Address | `getOwnAddress` | `GET /api/v1/me/addresses/{addressId}` |
| Address | `createOwnAddress` | `POST /api/v1/me/addresses` |
| Address | `updateOwnAddress` | `PATCH /api/v1/me/addresses/{addressId}` |
| Address | `deleteOwnAddress` | `DELETE /api/v1/me/addresses/{addressId}` |
| Address | `setDefaultOwnAddress` | `POST /api/v1/me/addresses/{addressId}/default` |
| Address | `clearDefaultOwnAddress` | `DELETE /api/v1/me/addresses/default` |
| Cart | `getActiveCart` | `GET /api/v1/cart` |
| Cart | `addCartLine` | `POST /api/v1/cart/lines` |
| Cart | `setCartLineQuantity` | `PATCH /api/v1/cart/lines/{cartLineId}/quantity` |
| Cart | `updateCartLineConfiguration` | `PUT /api/v1/cart/lines/{cartLineId}/configuration` |
| Cart | `removeCartLine` | `POST /api/v1/cart/lines/{cartLineId}/remove` |
| Cart | `clearCart` | `POST /api/v1/cart/clear` |
| Cart | `applyCartCoupon` | `POST /api/v1/cart/coupon` |
| Cart | `removeCartCoupon` | `POST /api/v1/cart/coupon/remove` |
| Cart | `evaluateCart` | `POST /api/v1/cart/evaluate` |
| Cart | `claimGuestCart` | `POST /api/v1/cart/claim` |
| Cart | `reconcileGuestCartWithCustomer` | `POST /api/v1/cart/reconcile` |
| Checkout | `getActiveCheckout` | `GET /api/v1/checkouts/active` |
| Checkout | `startCheckout` | `POST /api/v1/checkouts` |
| Checkout | `setCheckoutDestination` | `PUT /api/v1/checkouts/{checkoutId}/destination` |
| Checkout | `clearCheckoutDestination` | `POST /api/v1/checkouts/{checkoutId}/destination/clear` |
| Checkout | `evaluateCheckout` | `POST /api/v1/checkouts/{checkoutId}/evaluate` |
| Payment | `completeZeroPayableCheckout` | `POST /api/v1/checkouts/{checkoutId}/complete-zero-payable` |
| Payment | `startPayment` | `POST /api/v1/payments` |
| Payment | `retryPayment` | `POST /api/v1/payments/{paymentId}/retry` |
| Payment | `getPayment` | `GET /api/v1/payments/{paymentId}` |
| Payment | `getPaymentState` | `GET /api/v1/payments/{paymentId}/state` |
| Order | `listCustomerOrders` | `GET /api/v1/orders` |
| Order | `getCustomerOrder` | `GET /api/v1/orders/{orderId}` |

---

## 11. Explicitly Internal / Non-Exposed Operations

Must **not** be customer HTTP routes:

| Operation | Reason |
|---|---|
| `createCart` | Does not exist; forbidden |
| `prepareCheckoutForPayment` | Internal Payment handoff only |
| `cancelCheckout` | Deferred (customer self-service cancellation deferred) |
| `cancelPayment` | Deferred from initial IMP-024 |
| `finalizeCartAfterOrderMaterialization` | Internal Order path |
| `materializeOrderForCompletedCheckout` / `recoverMissingOrdersBatch` | System recovery, not customer API |
| Provider webhook / reconcile / supersede Payment ops | Provider / internal |
| `getMenuGraph` / `findMenu*` | Workforce / internal — not customer Menu authority |
| Workforce Order lifecycle | Ops Console (future) |
| Serviceability administration | Workforce |
| Standalone `evaluateServiceability` HTTP | Deferred |

---

## 12. Profile Contract

Authority: `CustomerActor` only; no caller-supplied customerId.

| Method | Path | Success |
|---|---|---|
| GET | `/api/v1/me/profile` | `200` — `{ ok: true, profile: CustomerProfile \| null }` |
| POST | `/api/v1/me/profile` | `201` — profile body fields per `createOwnCustomerProfile` |
| PATCH | `/api/v1/me/profile` | `200` — update fields |
| DELETE | `/api/v1/me/profile` | `204` No Content |

---

## 13. Address Contract

Authority: `CustomerActor` only. No Serviceability state on Address.

| Method | Path | Success |
|---|---|---|
| GET | `/api/v1/me/addresses` | `200` list |
| GET | `/api/v1/me/addresses/{addressId}` | `200` |
| POST | `/api/v1/me/addresses` | `201` |
| PATCH | `/api/v1/me/addresses/{addressId}` | `200` |
| DELETE | `/api/v1/me/addresses/{addressId}` | `204` |
| POST | `/api/v1/me/addresses/{addressId}/default` | `200` |
| DELETE | `/api/v1/me/addresses/default` | `204` |

Inputs mirror accepted create/update field sets (`makeDefault` only on create).

---

## 14. Cart Lifecycle

- No explicit `createCart`.
- `getActiveCart` is a non-materializing read (`Cart | null`).
- First material `addCartLine` lazily creates the Cart.
- Guest Cart support in scope; claim/reconcile in scope.
- Optimistic `expectedRevision` rules unchanged.
- `evaluateCart` does **not** accept `expectedRevision`.
- No generic IMP-007 idempotency on Cart.

---

## 15. Cart HTTP Contract

Exact routes:

```text
GET   /api/v1/cart
POST  /api/v1/cart/lines
PATCH /api/v1/cart/lines/{cartLineId}/quantity
PUT   /api/v1/cart/lines/{cartLineId}/configuration
POST  /api/v1/cart/lines/{cartLineId}/remove
POST  /api/v1/cart/clear
POST  /api/v1/cart/coupon
POST  /api/v1/cart/coupon/remove
POST  /api/v1/cart/evaluate
POST  /api/v1/cart/claim
POST  /api/v1/cart/reconcile
```

### brandId

- No `/brands/{brandId}/...` hierarchy.
- Query `?brandId=` on applicable reads (at minimum `GET /api/v1/cart`).
- Request body `brandId` where accepted mutations / claim / reconcile require it.
- Do not invent a default brand.

### Revision

- JSON application fields only (`expectedRevision`, `expectedGuestRevision`, `expectedCustomerRevision`).
- No `If-Match` / ETag.
- No revision query encoding.
- No DELETE bodies (line remove and coupon remove use POST).

### evaluateCart

- `POST /api/v1/cart/evaluate`
- Body may include optional `location` only; **no** invented revision.

### Valid absence

```json
{ "ok": true, "cart": null }
```

HTTP `200`.

---

## 16. Guest Cart Authority

Canonical guest Cart credential header:

```text
X-Boba-Guest-Cart-Token
```

Rules:

- Guest Cart authority only — **not** customer authentication
- Not placed in URL/query
- Not duplicated in JSON body for CartAccess carriage
- Value redacted/omitted from logs
- Authenticated customer authority still comes from trusted session
- First guest `addCartLine` may return `guestToken` in the application result; client stores it and sends the header thereafter
- `claimGuestCart` / `reconcileGuestCartWithCustomer` require CustomerActor **and** accept `guestToken` in the application input object (existing application fields)

---

## 17. Checkout Lifecycle

Public operations: `getActiveCheckout`, `startCheckout`, `setCheckoutDestination`,
`clearCheckoutDestination`, `evaluateCheckout`.

- `startCheckout` accepts `{ cartId }` only
- Source Cart revision is server-captured (`sourceCartRevision`)
- Destination remains a separate operation
- `prepareCheckoutForPayment` remains **internal**
- `cancelCheckout` is **not** exposed

---

## 18. Checkout HTTP Contract

```text
GET  /api/v1/checkouts/active
POST /api/v1/checkouts
PUT  /api/v1/checkouts/{checkoutId}/destination
POST /api/v1/checkouts/{checkoutId}/destination/clear
POST /api/v1/checkouts/{checkoutId}/evaluate
POST /api/v1/checkouts/{checkoutId}/complete-zero-payable
```

### Active Checkout absence

```json
{ "ok": true, "checkout": null }
```

HTTP `200`. Query may pass `cartId` and/or `checkoutId` (≥1) per application input.

### Start Checkout

Request: `{ "cartId": "..." }` only. Success: **`200`** for both newly created and soft-reused
Checkout (no invented created/reused transport flag).

### Destination / Evaluate

Preserve `expectedCheckoutRevision` in JSON body. Evaluate maps only to `evaluateCheckout`.

---

## 19. Payment Contract

```text
POST /api/v1/payments
POST /api/v1/payments/{paymentId}/retry
GET  /api/v1/payments/{paymentId}
GET  /api/v1/payments/{paymentId}/state
```

Zero-payable:

```text
POST /api/v1/checkouts/{checkoutId}/complete-zero-payable
```

### Required application fields

**startPayment:** `checkoutId`, `expectedCheckoutRevision`, `paymentMethodIntent`, `idempotencyKey`

**retryPayment:** `paymentId`, `expectedCheckoutRevision`, `paymentMethodIntent`, `idempotencyKey`

**completeZeroPayableCheckout:** `checkoutId`, `expectedCheckoutRevision`, `idempotencyKey` —
MUST NOT accept `paymentMethodIntent`

Do not manufacture defaults. Do not expose `cancelPayment` or provider/recovery APIs.

Preserve exact domain codes including:

```text
PAYMENT_TERMINAL
PAYMENT_ALREADY_PROCESSING
PAYMENT_EXPIRED
PAYMENT_IDEMPOTENCY_CONFLICT
PAYMENT_NOT_FOUND
```

Forbidden vocabulary: `PAYMENT_NOT_RETRYABLE`.

---

## 20. Payment Idempotency

- Payment-specific initiation idempotency only (`app.payment_initiation_idempotency`)
- Wire representation: JSON body field `idempotencyKey`
- Do **not** use `Idempotency-Key` header in initial IMP-024
- Do **not** wrap Payment (or Cart/Checkout) in generic IMP-007 idempotency

---

## 21. Zero-Payable Flow

- Distinct customer operation `completeZeroPayableCheckout`
- Not a fake Payment method / fake Payment row / synthetic provider
- Preserves `NO_PAYMENT_REQUIRED` Order payment satisfaction
- Reuses existing Payment → Order best-effort materialization / recovery semantics
  (recovery remains non-customer API)

---

## 22. Customer Order Reads

```text
GET /api/v1/orders
GET /api/v1/orders/{orderId}
```

- List accepts accepted `cursor` / `limit` query inputs
- Detail key is UUID `orderId`
- Ownership denial → `ORDER_NOT_FOUND` (non-enumerating)
- States: `PLACED` | `ACCEPTED` | `FULFILLED` | `CANCELLED` ([D-357](../decision-register.md))

---

## 23. Menu Boundary

Initial IMP-024 has **no** public database-backed Menu transport.

- `getMenuGraph` remains workforce-only (`menu.read`)
- Internal `findMenu*` are not customer authority
- Current customer Menu source remains `src/data/menu.json` for this capability’s original lock;
  accepted IMP-025 storefront delivery is `src/data/ordering-catalog.json`
- **D-368** is the TARGET serving architecture for a future customer Menu read projection through
  this same `/api/v1/*` façade; D-368 does not implement that projection or lock an HTTP payload
- Future public DB Menu still requires an authorized future capability; D-368 is the architecture
  decision, not implementation authorization

---

## 24. Serviceability Boundary

- Standalone Serviceability HTTP is **deferred**
- Existing authority continues through Cart `evaluateCart` and Checkout `evaluateCheckout`
- Do not persist/invent Serviceability state on Address

---

## 25. Coupon Boundary

Included:

```text
applyCartCoupon   → POST /api/v1/cart/coupon
removeCartCoupon  → POST /api/v1/cart/coupon/remove
```

Not included: Loyalty, Rewards, coupon issuance, coupon discovery, promotion administration,
reward balances. Cart/Checkout/pricing remain authoritative for eligibility/commercial result.

---

## 26. Success Response Contract

### Headers (customer commerce responses)

```text
X-Request-ID
Cache-Control: no-store
```

### Valid optional reads (absence)

HTTP `200` + explicit null — **not** 404/204:

```json
{ "ok": true, "profile": null }
{ "ok": true, "cart": null }
{ "ok": true, "checkout": null }
```

### Non-void success

```json
{ "ok": true, "<operation-specific field>": … }
```

Preserve application output structure (cart, checkout, snapshot, payment, state, order, items…).

### Void success

Accepted `void` outputs → **`204 No Content`**. Do not manufacture `{ "ok": true }` for void.

### Create successes

Profile/Address create → **`201`**. Checkout start → **`200`** (including soft-reuse).

---

## 27. Error / Ownership Contract

Base envelope ([D-360](../decision-register.md)):

```json
{
  "ok": false,
  "code": "<accepted application/domain code>",
  "requestId": "<request id>"
}
```

Optional metadata **only** when provided by accepted application/domain errors:

```text
field
resolutionOptions
```

Forbidden generic fields: `message`, `details`, `reason`, `debug`, `stack`, `retryable`,
`resourceId`, `customerId`.

Ownership denials remain non-enumerating (`*_NOT_FOUND` / profile access-denied mapped as 404).
Do not invent `PAYMENT_NOT_RETRYABLE` or `retryable: false` equivalents.

---

## 28. HTTP Status Matrix

| Status | Codes / meaning |
|---|---|
| **401** | `CUSTOMER_AUTH_REQUIRED` |
| **404** | Ownership-concealed or missing resources, including applicable `CART_NOT_FOUND`, `CART_LINE_NOT_FOUND`, `CHECKOUT_NOT_FOUND`, `PAYMENT_NOT_FOUND`, `ORDER_NOT_FOUND`, `CUSTOMER_ADDRESS_NOT_FOUND`, `CUSTOMER_PROFILE_ACCESS_DENIED`, `CART_COUPON_UNKNOWN`, `CUSTOMER_PROFILE_NOT_FOUND` |
| **410** | `CART_EXPIRED`, `CHECKOUT_EXPIRED`, `PAYMENT_EXPIRED` |
| **409** | Revision/state/idempotency/business-precondition conflicts, including applicable `CART_CONFLICT`, `CART_RECONCILIATION_CONFLICT`, Checkout conflict/state/cart-changed/repriced/destination/empty and commercial evaluate failures that block transition, Payment conflict/state/processing/terminal/unresolved/idempotency/checkout-not-ready/promo-capacity/zero-payable/negative, `CUSTOMER_PROFILE_ALREADY_EXISTS` |
| **422** | `CART_ITEM_NOT_ORDERABLE` |
| **400** | Malformed/invalid input: Cart/Checkout/Payment invalid input & unsupported method; Order request/cursor invalid; Profile/Address validation codes; `CART_CONFIGURATION_INVALID` |
| **503** | `CART_DEPENDENCY_UNAVAILABLE`, `CHECKOUT_DEPENDENCY_INDETERMINATE` |
| **500** | `CART_POLICY_INVALID`, `PAYMENT_POLICY_INVALID`, `INTERNAL_ERROR`, other unhandled/policy failures without raw exception leakage |

Do not collapse distinct codes into one alias.

---

## 29. Concurrency / Revision Matrix

| Capability | Mechanism |
|---|---|
| Cart mutations | `expectedRevision` (required when cart exists; forbidden when inventing create) |
| Cart evaluate | no revision input |
| Guest claim/reconcile | `expectedGuestRevision` / `expectedCustomerRevision` |
| Checkout mutations / evaluate | `expectedCheckoutRevision` |
| Payment start/retry/zero | `expectedCheckoutRevision` + Payment-specific `idempotencyKey` |
| Profile / Address | no revision OCC; natural uniqueness / no-ops |
| Order reads | n/a |

No `If-Match`. No generic transport idempotency.

---

## 30. Serialization Contract

1. Shared/application types and projections are authoritative.
2. Reuse existing shared serializers/projections where available.
3. **Wire JSON:** any `bigint` exposed through commerce JSON is serialized as a **base-10 decimal string**.
4. Never convert `bigint` to JavaScript `Number`.
5. Do not invent ETag / If-Match / opaque revision tokens / aesthetic reshaping.

### Mechanically verified repository revision representations

| Surface | Type in repository | Wire JSON |
|---|---|---|
| Cart aggregate `revision` | `bigint` (`src/shared/cart/types.ts`) | decimal string |
| Cart `expectedRevision` application parse | requires `typeof === "bigint"` (`parseExpectedRevision`) | decimal string on wire; transport converts to `bigint` before application parse |
| Checkout aggregate `revision` / `sourceCartRevision` | `bigint` | decimal string |
| Checkout `expectedCheckoutRevision` parse | requires positive `bigint` (`parseExpectedCheckoutRevision`) | decimal string on wire; transport converts to `bigint` before application parse |
| Payment `expectedCheckoutRevision` parse | accepts `bigint` \| positive int `number` \| digit `string` | prefer decimal string; Payment parse already accepts digit strings |
| Payment result `checkoutRevision` | `bigint` | decimal string |
| Customer Order projection `revision` | already `string` in customer projections | string (unchanged) |

Preserve accepted field names: `expectedRevision`, `expectedCheckoutRevision`,
`expectedGuestRevision`, `expectedCustomerRevision`.

UUIDs, enums, timestamps, money (integer paise), and other commercial values preserve accepted
shared/projection representation.

---

## 31. Minimum Operability

Parity with auth runtimes:

- Request correlation id
- Response header `X-Request-ID`
- Safe structured logs (allowlisted fields only)
- No secrets / session tokens / OTP / payment secrets / raw PII in logs
- Guest token values redacted
- `GET /health/live`
- `GET /health/ready`

Full observability remains **IMP-036**. No metrics/tracing platforms or observability persistence
in IMP-024. Payment → Order recovery may log safe operational outcomes without inventing lifecycle
states or customer recovery APIs.

---

## 32. Infrastructure / Schema Boundaries

- No new DB schema for transport alone
- No migrations in architecture lock
- No speculative queues/brokers/buses/workers/caches
- Compose/Nginx/Dockerfile binding of `customer-commerce` is an **implementation** concern after
  a separate authorization prompt

---

## 33. Deferred / Out-of-Scope Capabilities

Deferred or later IMPs (non-exhaustive): Menu public DB API; standalone Serviceability HTTP;
`cancelCheckout` / customer cancellation; `cancelPayment`; Refund; Invoice; Delivery;
Notifications; Ops Console; Razorpay productionization (IMP-026; historically published as Cashfree
productionization); Observability GTM; IMP-025 UX.

---

## 34. Implementation Gate

Implementation is authorized when **all** are true:

1. This capability architecture remains CURRENT and `ARCHITECTURE_LOCKED`
2. D-359 and D-360 remain CURRENT; D-356 AMENDED by D-359
3. `ARCHITECTURE.md` / `ROADMAP.md` / `STATE.md` agree that architecture is locked and
   implementation is active (`IMPLEMENTATION_IN_PROGRESS`) under authorization
4. `npm run project:consistency` passes
5. A **separate** coding-agent implementation authorization prompt has been issued

This document remains the implementation contract; it does not self-accept the product.

---

## 35. Acceptance Boundaries

Coding-agent completion ≠ acceptance. Independent acceptance remains recorded in `STATE.md` after
implementation evidence. Architecture lock does not change accepted product through IMP-023.

---

## Approved architecture coverage (AR-01–AR-23)

This artifact faithfully records human-approved AR-01 through AR-23 covering Cart lifecycle,
Checkout exposure, Payment contract/errors, Menu deferral, coupons, zero-payable, auth trust,
runtime topology, persistence gate, operability, Profile/Address/Serviceability, `/api/v1/*`
namespace, brandId/guest-token transport, Cart/Checkout/Payment/Profile/Address/Order routes,
error/status matrix, runtime identity, capability path, and JSON serialization authority.
