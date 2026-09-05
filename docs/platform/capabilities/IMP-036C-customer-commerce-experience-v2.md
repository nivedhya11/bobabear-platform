<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-036C",
  "title": "Customer Commerce Experience V2",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "COMPLETE_AND_ACCEPTED",
  "implementationAuthorized": true,
  "lastReviewed": "2026-09-05",
  "bindingDecisions": ["D-118", "D-368", "D-369", "D-370", "D-371"],
  "dependsOn": ["IMP-036A", "IMP-036B", "IMP-025", "IMP-028B", "IMP-028C", "IMP-021", "IMP-022", "IMP-023"]
}
-->

# IMP-036C — Customer Commerce Experience V2

## Capability Architecture (ARCHITECTURE_LOCKED — COMPLETE_AND_ACCEPTED)

Mature accepted BOBA Direct commerce into a coherent end-to-end customer ordering experience. This
slice is **experience composition and presentation** over existing domain authorities — not a new
commerce platform.

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Lifecycle | `COMPLETE_AND_ACCEPTED` |
| Implementation | `AUTHORIZED` / `STARTED` / `COMPLETE` |
| Implementation authorized | **YES** |
| Implementation complete | **YES** |
| Accepted | **YES** |
| Accepted product through | IMP-036C |
| Current product slice | NONE |
| Pending acceptance | NONE |
| Next product slice | IMP-036D |
| Governance checkpoint | GTM-R102 / STATE-R100 |
| Founder UAT required for acceptance | **YES** |
| Founder UAT | **PASS** |

```text
IMP-036C: COMPLETE_AND_ACCEPTED
IMP-036C_ARCHITECTURE: LOCKED
IMP-036C_ARCHITECTURE_LOCKED: YES
IMP-036C_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-036C_IMPLEMENTATION_AUTHORIZED: YES
IMP-036C_STARTED: YES
IMP-036C_IMPLEMENTATION_COMPLETE: YES
IMP-036C_ACCEPTED: YES
FOUNDER_UAT_REQUIRED: YES
FOUNDER_UAT_REQUIRED_FOR_ACCEPTANCE: YES
IMP-036C_FOUNDER_UAT_REQUIRED: YES
IMP-036C_FOUNDER_UAT: PASS
IMP036C_FOUNDER_UAT: PASS
IMP036C_FORMAL_ACCEPTANCE: ACCEPTED
FOUNDER_UAT: PASS
IMP036C_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP036C_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP036C_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP036C_ACCEPTED_MAIN_SHA: 0ec83ba5b7b03387dcefbd478807faefc3499d6b
IMP036C_ACCEPTED_TREE: 778723aaf8ee363d337f4887455c13f68e1385bc
IMP036C_ACCEPTED_CANDIDATE: 0ec83ba5b7b03387dcefbd478807faefc3499d6b
IMP036C_DIRECT_MAIN_PROCESS_EXCEPTION: RECONCILED
IMP036C_DIRECT_MAIN_EXCEPTION_SHA: 13835d285f53186c9ed89dc1ed0d11e30be75cca
IMP036C_PROCESS_EXCEPTION_OUTSTANDING: NO
STANDARDIZED_CUSTOMER_DELIVERY_FEE: YES
schema_change: YES
provider_IO: NO
new_service: NO
new_queue: NO
new_auth_model: NO
new_roles: NO
new_permissions: NO
EXISTING_DOMAIN_AUTHORITIES_REUSED: YES
TRANSPORT_SCHEMA_CHANGE: NONE
DEFERRED_CUSTOMER_FAILED_PAYMENT_HISTORY: YES
```

## 1. Purpose

Deliver enterprise-class customer commerce UX for the full journey:

```text
Landing → location context → Menu → category/search → product/customization
→ Cart → authentication when required → delivery/address → review → payment
→ confirmation → order history/detail/tracking
```

## 2. Preserved authorities (reuse only)

| Authority | Use |
|---|---|
| D-368 Menu projection | Menu read, categories, display price |
| D-369 Paid modifiers | Customization dialog |
| D-370 Cart identity transition | Guest/authenticated cart |
| D-371 Cart unit sequence | Quantity ordering |
| IMP-021 Checkout | Destination, evaluate, snapshot |
| IMP-022 Payment | Razorpay, idempotency, recovery |
| IMP-023 Order | Materialization from checkout snapshot |
| IMP-036B Location/Serviceability | Deliver-to, coordinate serviceability |
| Customer-commerce transport | `/api/v1/*` wrappers — no new public contracts |

**No new provider, queue, service, auth model, or lifecycle states.**

## 3. Customer delivery fee (BOBA-owned)

```text
STANDARDIZED_CUSTOMER_DELIVERY_FEE = YES
```

- Customer delivery charge is BOBA-owned and server-authoritative at checkout evaluation.
- Distance uses the same Haversine geodesic algorithm as IMP-036B outlet-distance serviceability.
- Configurable per-outlet distance bands live on `outlet_serviceability_configs.delivery_fee_bands`
  (JSON array: `maxDistanceMeters`, `amountPaise`). Optional
  `free_delivery_subtotal_threshold_paise` on the same row.
- When bands are absent, checkout falls back to brand `price_book_charge_prices` delivery row.
- Resolved amount flows through existing `buildDirectPricingQuote` → `checkout_snapshot_charges`
  → order `checkout_snapshot_id` commercial truth (D-118 / D-132).
- Provider execution cost remains in Delivery domain (`delivery_provider_costs`) and never
  rewrites customer delivery charge.

Exact band ₹ values and free-delivery thresholds are **business configuration**, not code constants.

## 4. UX architecture

- **Menu:** location strip, search, category navigation, availability badges, customization cues,
  loading/retry, mobile sticky cart + desktop sidebar continuity.
- **Cart:** line clarity, evaluation problems, serviceability note, estimated subtotal semantics.
- **Checkout:** logical Delivery → Review → Payment on one route; shared map-first address flow;
  server-side serviceability re-evaluation at evaluate; item review + monetary summary before
  payment; checkout backward navigation with stale checkout/cart revision reconciliation;
  authoritative monetary snapshot presentation.
- **Payment:** Razorpay Standard Checkout; Razorpay-owned payment-method selection (BOBA
  payment-method selector absent); existing PaymentPanel recovery semantics; no duplicate order
  intent. Authoritative FAILED+OPEN may retry the same immutable checkout **or** explicitly Start
  a new order (see §8). Failed/dismissed/unresolved payment recovery includes server-side Razorpay
  secondary reconciliation and previous-payment / current-cart separation.
- **Confirmation / Orders:** monetary summary from snapshot projection; D-357 status timeline only;
  current vs past order grouping; safe delivery projection; Orders/history/detail/tracking within
  existing scope.

## 5. Schema change (bounded)

Migration `0036_outlet_delivery_fee_policy.sql` adds optional delivery-fee policy columns to
`outlet_serviceability_configs`. No new commercial tables; checkout/order charge snapshot tables
unchanged.

## 6. Non-goals

Loyalty, rewards, subscriptions, favorites, AI recommendations, chat, new providers, kitchen
preparation lifecycle, Routes API, live courier quote pass-through, invented analytics.

## 7. Regression boundary

IMP-036B location selector, session tokens, Back refresh, map stability, coordinate
serviceability, and saved-address behavior must not regress where 036C composition touches those
surfaces. Already accepted IMP-036B location history is not rewritten by this acceptance.

## 8. Founder decision — failed-payment new-order continuity (capability-local)

Product locks for authoritative Payment Attempt `FAILED` with Payment `OPEN` (presentation only;
no new Payment/Checkout lifecycle, transport endpoint, or Order materialization):

```text
FAILED_PAYMENT_RETRY_SAME_CHECKOUT = YES
FAILED_PAYMENT_START_NEW_ORDER = YES
START_NEW_ORDER_CLEARS_ACTIVE_CART = YES
START_NEW_ORDER_CLEARS_BROWSER_PAYMENT_RECOVERY = YES
FAILED_CHECKOUT_REMAINS_IMMUTABLE_HISTORY = YES
UNRESOLVED_PAYMENT_BLOCKS_NEW_ORDER = YES
UNRESOLVED_PAYMENT_BLOCKS_SECOND_PAYMENT = YES
FAILED_PAYMENT_IS_ORDER = NO
FAILED_PAYMENT_CUSTOMER_HISTORY = DEFERRED
DEFERRED_CUSTOMER_FAILED_PAYMENT_HISTORY = YES
```

| Action | Behavior |
|---|---|
| Try payment again | Existing `retryPayment` against the same previous Checkout and immutable commercial snapshot |
| Start a new order | Existing `clearCart` once → `clearPaymentRecovery` → navigate `/order/`; historical Checkout A + Payment A retained server-side; later `startCheckout` supersedes stale READY via existing cart-revision rules |
| Unresolved (CREATED / PENDING / PROCESSING / INDETERMINATE) | No Start a new order, no Try payment again, no new Pay — customer remains on Checking your payment / previous payment |
| Success | Unchanged: Payment SUCCEEDED → Checkout COMPLETED → Order materialization → existing cart finalization (`finalize-after-order` semantics preserved) |

Failed payment is **not** an Order. Customer-visible failed-payment history (desired My BOBA:
successful commerce via Order; failed commerce attempt via Checkout + Payment history) is
**deferred** because existing public customer order transport is Orders-only. No new public
customer transport endpoint is introduced; no future IMP owner is assigned here.

## 9. Deferred Maps hardening (IMP-038 — RECORD ONLY)

Owner remains **IMP-038 — Security & Privacy Hardening** (PLANNED only; not activated by this
acceptance). Future direction preserved from IMP-036B §6.1:

```text
ANONYMOUS_GOOGLE_LOCATION_IO = NO
ANONYMOUS_DEFAULT_LOCATION = Dehradun
AUTH_REQUIRED_TO_CHANGE_DELIVERY_LOCATION = YES
AUTH_REQUIRED_FOR_MAPS_JS = YES
AUTH_REQUIRED_FOR_PLACES_AUTOCOMPLETE = YES
AUTH_REQUIRED_FOR_REVERSE_GEOCODE = YES
AUTH_REQUIRED_TO_ADD_SAVED_ADDRESS = YES
```

Do **not** implement this behavior under IMP-036C. IMP-038 remains `PLANNED` only.

## 10. Acceptance / UAT history

```text
IMP036C_ACCEPTED_CANDIDATE = 0ec83ba5b7b03387dcefbd478807faefc3499d6b
IMP036C_FOUNDER_UAT = PASS
IMP036C_LIFECYCLE = COMPLETE_AND_ACCEPTED
IMP036C_ACCEPTED = YES
```

Historical (not rewritten as PASS / not accepted):

| Candidate | Role |
|---|---|
| `abe19d578521165df8b8c0888cf6fbd41f91b930` family | Earlier Founder UAT failure during IMP-036C journey |
| `13835d285f53186c9ed89dc1ed0d11e30be75cca` | Direct-main process exception / intermediate UAT candidate; reconciled; not accepted |
| `16e8b8223aa7bb25b759402e69e2f934a1a844fe` | Explicit Founder UAT FAIL (legacy address deletion, validation UX, stale checkout, payment UX/back-navigation, pricing presentation/recovery) |
| Intermediate repair merges before `0ec83ba5…` | Non-accepted repair candidates only |
| `0ec83ba5b7b03387dcefbd478807faefc3499d6b` | Sole Founder-accepted IMP-036C product candidate |

Docs/governance reconciliation after the product SHA is governance provenance only and is **not**
a new product UAT candidate.
