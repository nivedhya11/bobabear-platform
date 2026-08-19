<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-026C",
  "title": "Pilot Customer-Commerce UX Hardening",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
  "implementationAuthorized": true,
  "lastReviewed": "2026-08-14",
  "bindingDecisions": ["D-356", "D-357", "D-358", "D-359", "D-360", "D-361", "D-362", "D-363"],
  "dependsOn": ["IMP-019", "IMP-020", "IMP-021", "IMP-022", "IMP-023", "IMP-024", "IMP-025", "IMP-026"]
}
-->

# IMP-026C — Pilot Customer-Commerce UX Hardening

## Capability Architecture (ARCHITECTURE_LOCKED)

This document is the **locked capability architecture** for IMP-026C — Pilot Customer-Commerce UX
Hardening.

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Implementation | `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` |
| Implementation authorized | **YES** |
| Acceptance | not claimed; `acceptedThrough` is IMP-027; `pendingAcceptance` = IMP-026C |
| Pending acceptance (current formal gate) | IMP-026C (`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`) |
| Schema change required | **NO** |
| New API / transport / domain | **NO** |

Architecture remains locked. IMP-026C implementation is complete pending acceptance under current
repository governance. Do not claim formal acceptance of IMP-026C. Do not activate IMP-029.

```text
DOMAIN: NONE
DATABASE: NONE
MIGRATION: NONE
SERVER_API: NONE
PAYMENT_PROVIDER: NONE
ORDER_MODEL: NONE
```

Intended change classes only:

```text
UI_PRESENTATION
CLIENT_STATE_MAPPING
ACCESSIBILITY
TEST_ONLY
```

---

## 1. Governance Metadata

| Field | Value |
|---|---|
| IMP | IMP-026C |
| Capability | Pilot Customer-Commerce UX Hardening |
| Roadmap lifecycle | `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` |
| Implementation | `AUTHORIZED` / `COMPLETE` |
| Accepted product through | IMP-027 — Refund Foundation |
| Current product slice | IMP-028 |
| Pending acceptance | IMP-026C — Pilot Customer-Commerce UX Hardening |
| Public GTM boundary | IMP-040 |
| Binding decisions consumed | D-356, D-357, D-358, D-359, D-360, D-361, D-362, D-363 |
| New decision | **NO** (current next free ID is `D-368`) |
| Global architecture | ARCH-R12 unchanged |
| Decision register | DR-9 unchanged |
| IMP-026 external webhook gate | `SATISFIED` (IMP-026 accepted) |

Canonical authorities:

| Question | Authority |
|---|---|
| Why / Non-Goals | [`../VISION.md`](../VISION.md) |
| Sequence / lifecycle | [`../ROADMAP.md`](../ROADMAP.md) |
| Accepted reality | [`../STATE.md`](../STATE.md) |
| Durable global architecture | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| Binding decisions | [`../decision-register.md`](../decision-register.md) |
| Customer UX baseline | [`IMP-025-customer-ordering-ux.md`](./IMP-025-customer-ordering-ux.md) |
| Payment provider / recovery | [`IMP-026-razorpay-productionization.md`](./IMP-026-razorpay-productionization.md) |
| This lock | **This document** |

Layering (unchanged):

```text
UI → Transport → Application Operations → Domain Authority → Persistence → Provider Adapter
```

IMP-026C owns **UI presentation, client-state mapping, and accessibility** over existing
authorities. It must not invent application/domain semantics.

---

## 2. Capability Purpose

Harden the existing owned BOBA Direct customer-commerce journey so a first-time mobile customer can
complete it without assistance.

This is UX hardening over accepted/current commerce authorities. It is **not** a new commerce
domain, **not** a backend redesign, and **not** a replacement for IMP-025.

---

## 3. Product Outcome

A first-time mobile customer can confidently complete:

```text
Controlled direct entry
→ Menu
→ Add
→ Sticky cart
→ Cart
→ OTP when required
→ Address / destination
→ Serviceability (existing IMP-019 via Cart/Checkout evaluation)
→ Checkout
→ Razorpay
→ Payment verification
→ Order confirmation
→ Order detail / history
→ Contextual support
```

“Confidently” means: truthful delivery-area orientation, obvious Add/quantity, accurate cart
feedback, visible authoritative charges before pay, payment states that never treat browser
Razorpay callbacks as success, confirmation only after a real BOBA Order, and a public-orderNumber
support action.

---

## 4. Existing Authority / Dependencies

Preserve the accepted chain:

```text
Cart                → mutable shopping intent
Checkout Snapshot   → immutable accepted commercial transaction
Payment             → original financial collection truth
Order               → post-purchase business lifecycle truth
```

Order lifecycle remains exactly **D-357**:

```text
PLACED | ACCEPTED | FULFILLED | CANCELLED
```

Do not create `PREPARING`, `READY`, or `OUT_FOR_DELIVERY`. UI state is never domain truth.

### Consumed accepted / current surfaces (VERIFIED)

| Concern | Existing symbol / path |
|---|---|
| Menu page | `src/app/order/page.tsx` → `OrderingCatalogClient` |
| Static catalog | `src/data/ordering-catalog.json`, `OrderingCatalogItem` |
| Cart page | `src/app/order/cart/page.tsx` → `CartClient` |
| Cart APIs | `getActiveCart`, `addCartLine`, `setCartLineQuantity`, `removeCartLine`, `clearCart`, `evaluateCart` in `src/lib/customer-commerce/cart.ts` |
| Guest token | `src/lib/customer-commerce/guest-token.ts` (`sessionStorage`) |
| Checkout page | `src/app/order/checkout/page.tsx` → `CheckoutClient` |
| Checkout APIs | `startCheckout`, `setCheckoutDestination`, `evaluateCheckout` in `src/lib/customer-commerce/checkout.ts` |
| Snapshot wire type | `CommerceCheckoutSnapshot` (`src/lib/customer-commerce/types.ts`); domain charge shape `CheckoutSnapshotCharge.chargeCode` = `"packaging" \| "delivery"` |
| Serviceability | IMP-019 `evaluateServiceability` (PIN-only; coordinates never affect coverage) via Cart evaluate / Checkout evaluate |
| Auth | `fetchCustomerSession`, `loginUrlWithReturn`, `CustomerLoginClient` |
| Claim / reconcile | `claimGuestCart`, `reconcileGuestCart`, `ReconcileConflictDialog` |
| Payment UI | `PaymentPanel` |
| Payment APIs | `startPayment`, `retryPayment`, `getPaymentState`, `submitPaymentClientEvidence`, `completeZeroPayableCheckout` |
| Razorpay browser | `loadRazorpayCheckoutScript`, `openRazorpayStandardCheckout`, `parseRazorpayStandardCheckoutAction` |
| Confirmation | `src/app/order/confirmation/page.tsx` → `OrderConfirmationClient` |
| History / detail | `OrderHistoryClient`, `OrderDetailClient` |
| Order reads | `listCustomerOrders`, `getCustomerOrder` |
| Order status labels | `orderStatusLabel` / `CUSTOMER_ORDER_STATUSES` |
| Site contact | `CONTACT` in `src/lib/site.ts` |
| Operating-area copy source | `BUSINESS.locality` / `BUSINESS.hoursDisplay` / `BUSINESS.postalCode` in `src/lib/site.ts` |
| Nav | `Nav` in `src/app/layout.tsx` |
| Error copy | `commerceErrorCopy` |
| Money display | `formatPaise`, `formatRupees` (display helpers, not authority) |

Checkout remains the **hard** serviceability gate (`evaluateCheckout` → `CHECKOUT_NOT_SERVICEABLE` /
`CHECKOUT_SERVICEABILITY_TEMPORARILY_UNAVAILABLE` / `CHECKOUT_SERVICEABILITY_INDETERMINATE`).

There is **no** standalone pre-cart Serviceability HTTP API (IMP-025 exclusion; preserved).

---

## 5. Current Journey

VERIFIED current path (IMP-025 UX + IMP-026 Razorpay client):

```text
/order (OrderingCatalogClient)
  guest getActiveCart / addCartLine / setCartLineQuantity / removeCartLine
  header Cart CTA with line count; no sticky bar; no Deliver To control
→ /order/cart/ (CartClient)
  evaluateCart({ brandId }) without location → typically REQUIRES_FULFILMENT_CONTEXT
  Checkout CTA → fetchCustomerSession
→ unauthenticated: /login?returnTo=/order/checkout/
→ /order/checkout/ (CheckoutClient)
  claimGuestCart / reconcileGuestCart
  destination form (saved / one-time; PIN required on destination)
  evaluateCheckout (hard serviceability + commercial snapshot)
  PaymentPanel: subtotal / discount / tax / grand total (charges[] not itemized)
  startPayment → razorpay_standard_checkout → Checkout.js
  handler → submitPaymentClientEvidence → getPaymentState poll
  Razorpay handler is not treated as success (existing PaymentPanel tests)
→ waitForCustomerOrder via listCustomerOrders
→ /order/confirmation/?orderId=…
→ /order/orders/ and /order/orders/detail/?orderId=…
```

Material UX gaps this slice hardens (presentation only):

- no early Deliver To / operating-area orientation;
- Add control lacks an accessible name that includes the product;
- quantity `sm` controls are 32px (`Button` size `sm` = `h-8`);
- no mobile sticky cart;
- Cart evaluation copy is operator-ish (`evaluation.status` raw);
- checkout does not itemize `packaging` / `delivery` from `snapshot.charges`;
- Pay CTA does not display `grandTotalPaise`;
- `PaymentPanel` local `checking` screen collapses PROCESSING / PENDING / INDETERMINATE;
- INDETERMINATE copy does not explicitly forbid paying again;
- confirmation/detail lack contextual support using `orderNumber`;
- marketing `Nav` (`Drops` / `Menu` / `Merch` / `Artists` / `Order`) is used on ordering routes.

---

## 6. Target Journey

```text
Controlled direct entry (`/` or `/order`)
→ Menu (`OrderingCatalogClient` on `/order`)
   Deliver To orientation from BUSINESS + optional PIN context
   product identity / presentation price / Add / quantity
   mobile sticky cart when CommerceCart.lines.length > 0
→ Cart (`CartClient` on `/order/cart/`)
→ OTP only if checkout requires it (`loginUrlWithReturn("/order/checkout/")`)
   guest cart credential survives (`sessionStorage` via guest-token helper)
→ Checkout destination (`CheckoutClient`)
→ evaluateCheckout (IMP-019 via checkout adapter) — hard gate
→ PaymentPanel with itemized snapshot + Pay amount = grandTotalPaise
→ Razorpay Standard Checkout (`clientAction` kind razorpay_standard_checkout)
→ getPaymentState / client-evidence — never browser-authoritative success
→ Order confirmation requires GET /api/v1/orders/{orderId} (or list item) real Order
→ Order detail / history (D-357 labels only)
→ “Need help with this order?” using CONTACT + public orderNumber
```

Do not add features merely to enrich this diagram.

---

## 7. UX Architecture Principles

1. **Projection, not authority.** Browser maps existing Cart / Checkout / Payment / Order /
   Serviceability results. It does not create a second truth.
2. **Fail closed when unsure.** Unproven serviceability is not claimed as deliverable. Unresolved
   Payment is not success and is not a prompt to pay again.
3. **Checkout Snapshot is the only payable commercial truth.** Catalog `presentationPriceRupees`
   and sticky-cart estimates are discovery presentation.
4. **Razorpay browser events are not Payment success.** `authorized` is not BOBA success.
   Provider-backed `captured` (via existing Payment application) is success (**D-361** / **D-363**).
5. **One active payment action.** PROCESSING, PENDING, and INDETERMINATE disable a second Pay /
   retry. Retry only when existing `retryPayment` semantics permit it (`Payment.status === "OPEN"`
   and no unresolved Attempt).
6. **Confirmation requires a BOBA Order.** Payment SUCCEEDED with delayed Order is a waiting state,
   not confirmation.
7. **Public identifiers only in customer copy.** `orderNumber` yes; Payment UUID / Razorpay ids no.
8. **Accessibility is acceptance,** not polish.
9. **No stolen future scope.** Refund, delivery, notifications, ops console, search, inventory, and
   kitchen states remain later IMPs / deferred.

---

## 8. Screen / Surface Architecture

Existing routes are unchanged. No new page is required. No new API route.

| Surface | Route / host | IMP-026C work |
|---|---|---|
| Marketing home | `/` | Unchanged marketing `Nav`; commerce CTA already includes `/order` |
| Menu | `/order` | Deliver To orientation; product/Add/unavailable; sticky cart (mobile); commerce nav |
| Cart | `/order/cart/` | Clear line/qty/amount/next; optional PIN-backed `evaluateCart` copy; no sticky duplicate |
| Login | `/login` | Unchanged OTP; keep `returnTo` |
| Checkout destination + payment | `/order/checkout/` | Itemized snapshot; payment state matrix; a11y |
| Confirmation | `/order/confirmation/` | Reassurance + support; public `orderNumber` |
| History | `/order/orders/` | D-357 only; commerce nav |
| Detail | `/order/orders/detail/` | Basket / destination / support |
| Payment return (existing) | `/order/payment/` (`PaymentReturnClient`) | Preserve; do not treat return URL as success |

Sticky cart is **not** a route. It is presentation over `CommerceCart` on `/order` (and may appear
on other pre-checkout ordering surfaces if the same cart client state is already loaded). It must
not appear on checkout, payment, confirmation, or order reads.

---

## 9. State Model and Projection Rules

No new domain enums. Customer-facing names below are **projections**.

### 9.1 Cart projection

| UI fact | Source |
|---|---|
| Empty / non-empty | `CommerceCart.lines.length` |
| Item count | `Σ CommerceCart.lines[].quantity` |
| Line identity | `line.variantId` → `OrderingCatalogItem` |
| Quantity mutation | `setCartLineQuantity` / `removeCartLine` (`expectedRevision`) |
| Unavailable add | transport `CART_ITEM_NOT_ORDERABLE` (and evaluation `LINE_VARIANT_UNAVAILABLE`) |

Cart persistence stores intent only (no price). Sticky/cart “value” before Checkout Snapshot is a
**presentation estimate**: `Σ OrderingCatalogItem.presentationPriceRupees × quantity` for lines
whose variant exists in the static catalog, labeled as menu prices. It is not payable truth.

### 9.2 Serviceability projection

See §10. Live IMP-019 states are reached only through existing evaluate APIs.

### 9.3 Checkout / payable projection

| UI fact | Source |
|---|---|
| Ready to pay | `CommerceCheckout.status === "READY_FOR_PAYMENT"` and `activeSnapshot` |
| Subtotal | `snapshot.prePromotionSubtotalPaise` |
| Discount | `snapshot.promotionDiscountPaise` |
| Packaging | `snapshot.charges[]` where `chargeCode === "packaging"` (amount `amountPaise`) |
| Delivery charge | `snapshot.charges[]` where `chargeCode === "delivery"` |
| Tax | `snapshot.taxPaise`; optional breakdown `snapshot.taxComponents[]` (`taxType`, `taxAmountPaise`) |
| Grand total / Pay amount | `snapshot.grandTotalPaise` |
| Zero-payable | `isZeroPayableTotal(snapshot.grandTotalPaise)` → `completeZeroPayableCheckout` |

Client TypeScript may narrow `CommerceCheckoutSnapshot.charges` / `taxComponents` from `unknown[]`
to the existing domain wire shape. That is CLIENT_STATE_MAPPING, not a new transport contract.
Missing charge rows display as omitted lines, not invented ₹0 fees. `chargesPaise` remains the
authoritative charges total even if a row is absent.

Do not recompute payable totals in the browser as new truth. `formatPaise` is display only.

### 9.4 Payment projection (no new Payment states)

Authoritative:

| Field | Existing values |
|---|---|
| `CommercePayment.status` | `OPEN` \| `PROCESSING` \| `SUCCEEDED` \| `SUPERSEDED` \| `CANCELLED` \| `EXPIRED` |
| `CommercePaymentAttempt.status` | `CREATED` \| `PENDING` \| `INDETERMINATE` \| `SUCCEEDED` \| `FAILED` \| `CANCELLED` |
| Transport | `getPaymentState`, start/retry results, `submitPaymentClientEvidence` |

`PaymentPanel` local screens (`idle`, `starting`, `loading_checkout`, `checkout_open`, `checking`,
`retryable`, `error`) are client UX modes. They must map onto the matrix in §13 rather than
collapse PROCESSING / INDETERMINATE into one undifferentiated “Checking payment…”.

### 9.5 Order projection

| UI fact | Source |
|---|---|
| Confirmed | `CommerceOrderDetail` / `CommerceOrderSummary` from order APIs |
| Public id | `orderNumber` |
| Status label | `orderStatusLabel` over D-357 only |
| Basket / destination / total | `order.lines`, `order.destination`, `order.money.grandTotalMinor` |

---

## 10. Serviceability UX Contract

IMP-019 remains the only evaluation authority. Geographic model is **PIN / postal code**.
`evaluateServiceability` accepts coordinates but **never uses them for coverage** (`void
parsed.location.coordinates` in `src/server/serviceability/evaluate.ts`). Do not infer coverage
from GPS.

### 10.1 Where evaluation happens

| Moment | API | Hardness |
|---|---|---|
| Pre-cart / no cart | **None** | Orientation only |
| Cart exists + PIN known | `POST /api/v1/cart/evaluate` (`evaluateCart`) with `location.postalCode` | Advisory projection |
| Checkout destination set | `POST /api/v1/checkouts/{checkoutId}/evaluate` | **Hard gate** |

`evaluateCart` without location returns `REQUIRES_FULFILMENT_CONTEXT` and must not be presented as
SERVICEABLE / NOT_SERVICEABLE.

Do not create an empty cart solely to evaluate. Do not add a standalone Serviceability API.

### 10.2 Early “Deliver To” orientation

Pre-cart UI may show truthful **fixed operating-area context** from existing `BUSINESS`:

- locality: Dehradun (`BUSINESS.locality`);
- hours: `BUSINESS.hoursDisplay`;
- example PIN is **not** a live coverage claim (`BUSINESS.postalCode` must not be labeled
  “we deliver here” as if evaluated).

Copy intent: we operate in Dehradun; exact PIN is confirmed at checkout.

Optional PIN field on menu/cart is client context only (React state and/or `sessionStorage`
presentation helper). It is not Cart/Checkout/Address persistence.

### 10.3 Serviceability matrix

| Existing authoritative state / context | Customer-facing meaning | Allowed action |
|---|---|---|
| No PIN / location (`location` absent; cart evaluate `REQUIRES_FULFILMENT_CONTEXT` or evaluate not called) | Operating-area orientation only. Delivery not yet confirmed. | Browse / Add / open Cart. Enter PIN (optional). Continue to checkout. **Forbidden:** claim “we deliver to you”. |
| PIN known, cart missing, or evaluate not yet called | Location noted; not yet evaluated. | Same as above. Copy: we’ll confirm this PIN at checkout. **Forbidden:** SERVICEABLE badge. |
| Cart evaluate `COMPLETE` (implies IMP-019 `SERVICEABLE`) | Looks deliverable for this PIN; checkout still confirms. | Continue. **Forbidden:** ETA / capacity. |
| Cart evaluate `SERVICEABILITY_NOT_SERVICEABLE` or checkout `CHECKOUT_NOT_SERVICEABLE` | We don’t deliver to that PIN / address yet. | Change PIN/address; keep browsing. **Forbidden:** Pay. |
| Cart evaluate `SERVICEABILITY_TEMPORARILY_UNAVAILABLE` or checkout `CHECKOUT_SERVICEABILITY_TEMPORARILY_UNAVAILABLE` | Delivery isn’t available right now. | Retry later; change address. **Forbidden:** fake hours/ETA as authority. |
| Cart evaluate `SERVICEABILITY_INDETERMINATE` / `EVALUATION_INDETERMINATE` or checkout `CHECKOUT_SERVICEABILITY_INDETERMINATE` / `CHECKOUT_DEPENDENCY_INDETERMINATE` | Couldn’t confirm delivery. | Retry evaluate; contact support only as generic CONTACT (no orderNumber yet). **Forbidden:** treat as deliverable. |
| Checkout evaluate success (`READY_FOR_PAYMENT` + snapshot) | Address is serviceable under IMP-019 for this checkout. | Pay using snapshot totals. |
| Checkout hard rejection (codes above) | Checkout cannot proceed on this destination. | Fix destination or return to cart. **Forbidden:** open Razorpay. |

Customer-facing names SERVICEABLE / NOT_SERVICEABLE / TEMPORARILY_UNAVAILABLE / INDETERMINATE are
labels over those existing statuses/codes. Do not add a UI enum to the domain.

No ETA. No capacity language. No live GPS.

---

## 11. Product / Add / Cart Contract

### 11.1 Product / Add

Reuse `OrderingCatalogClient` + `OrderingCatalogItem` (name, description, image, presentation
price, `variantId`). Current imported menu does not require modifiers.

| Control | Behavior |
|---|---|
| Identity | `item.name` (+ description as supporting text) |
| Price | `formatRupees(item.presentationPriceRupees)` labeled as menu/presentation |
| Add | `addCartLine` quantity 1, or `setCartLineQuantity` existing+1 |
| Quantity | existing `−` / count / `+` bound to Cart revision |
| Unavailable | disable Add and show `commerceErrorCopy("CART_ITEM_NOT_ORDERABLE")` (or line problem after evaluate). Static catalog has **no** availability flag — do not invent one. |

Do not add modifiers, recommendations, cross-sell, quantitative stock, or fake scarcity.

### 11.2 Mobile sticky cart

| Rule | Detail |
|---|---|
| Visibility | Only when `CommerceCart` is non-null and `lines.length > 0` |
| Count | `Σ line.quantity` from Cart |
| Value | presentation estimate (§9.1), not payable |
| Updates | after every successful add/qty/remove |
| Action | opens existing `/order/cart/` |
| Empty | unmount / hide |
| Authority | presentation only; never a second Cart |

### 11.3 Desktop equivalent

At `md` and above (existing ordering breakpoint), **no bottom sticky bar**. The existing header
Cart CTA on `OrderingCatalogClient` is the responsive equivalent and must show the same count (and
may show the same presentation estimate). Do not run two competing cart launches.

### 11.4 Cart page

`CartClient` must answer: what was added, how many, current presentation amount, what is next
(Checkout). Reuse Cart APIs. No new persistence. No P0 cross-sell.

Checkout CTA remains: `fetchCustomerSession` → login return-to `/order/checkout/` or navigate to
checkout. Guest Add stays unauthenticated.

---

## 12. Checkout Transparency Contract

Present only snapshot fields. Payment CTA amount **must equal** `snapshot.grandTotalPaise`
(`formatPaise`).

Required visible rows when values exist:

| Row | Field |
|---|---|
| Subtotal | `prePromotionSubtotalPaise` |
| Discount | `promotionDiscountPaise` (omit or show ₹0.00 only if snapshot has the field; do not invent discounts) |
| Packaging | charge row `packaging` |
| Delivery | charge row `delivery` |
| Tax | `taxPaise` and/or `taxComponents` |
| Total payable | `grandTotalPaise` |

Pay / Complete order label must include that same total (zero-payable uses Complete order, no
Razorpay).

No surprise mandatory fee after Razorpay opens. If `clientAction` `amountPaise` is present, it may
be compared to `grandTotalPaise` as a fail-closed display guard; mismatch → error copy, do not
recalculate a new payable.

---

## 13. Payment UX Contract

Use existing Payment / Attempt / `getPaymentState` / poll / `retryPayment` / client-evidence only.
Do not modify IMP-026 provider/retry architecture. Do not create Payment states.

Binding rules:

- Razorpay Checkout.js handler is **not** Payment success;
- provider `authorized` is **not** BOBA success;
- provider-backed `captured` applied by existing Payment application is success;
- browser cannot make Payment authoritative (`ARCH-G10`, `ARCH-G11`);
- unresolved Payment must tell the customer **not to pay again**;
- no second active Pay/retry while PROCESSING, PENDING, CREATED (in-flight), or INDETERMINATE;
- retry only via `retryPayment` when `Payment.status === "OPEN"` and no unresolved Attempt
  (existing `PAYMENT_ALREADY_PROCESSING` / `PAYMENT_UNRESOLVED_ATTEMPT` / `PAYMENT_TERMINAL`);
- after `startPayment`, Checkout.js load failure must **not** call `startPayment` again.

### 13.1 Payment UX state matrix

| Authoritative condition | Source of truth | Customer message intent | Primary action | Secondary action | Pay again allowed? |
|---|---|---|---|---|---|
| Ready to pay | Checkout `READY_FOR_PAYMENT` + snapshot; no Payment, or Payment `OPEN` with no unresolved Attempt | Amount due is snapshot total. Ready when you are. | Pay `{formatPaise(grandTotalPaise)}` → `startPayment` | Back to cart | Yes (single start) |
| Launching Razorpay | After `startPayment` / `retryPayment` `clientAction.kind === razorpay_standard_checkout`; `loadRazorpayCheckoutScript` in flight | Loading payment checkout… | None (busy) | None | **No** |
| Razorpay modal open | `openRazorpayStandardCheckout` opened; Attempt typically `PENDING`; Payment `PROCESSING` | Complete payment in the checkout window. Do not start another payment. | Wait | None | **No** |
| Provider callback received / verification underway | Handler fired → `submitPaymentClientEvidence`; then `getPaymentState` | Confirming payment with Boba Bear… Not paid-successfully yet. Do not pay again. | Wait / poll | None | **No** |
| Payment `PROCESSING` | `payment.status === "PROCESSING"` | Payment is in progress. Do not pay again. | Poll `getPaymentState` | Support via CONTACT without claiming orderNumber unless Order exists | **No** |
| Attempt `PENDING` | `attempt.status === "PENDING"` | Waiting for payment confirmation. Do not pay again. | Poll | Same | **No** |
| Attempt `INDETERMINATE` | `attempt.status === "INDETERMINATE"` and/or `PAYMENT_PROVIDER_INDETERMINATE` | We can’t confirm this payment yet. **Do not pay again.** We’ll update this page. | Poll `getPaymentState` | CONTACT (no second Pay) | **No** |
| Definitive failure (non-retryable) | Payment `EXPIRED` / `CANCELLED` / `SUPERSEDED`, or `PAYMENT_TERMINAL` / `PAYMENT_EXPIRED` | This payment can no longer continue. | Return to checkout/cart as copy allows | Support | **No** (not against this Payment) |
| Safe retry | Attempt `FAILED` and Payment `OPEN`; no unresolved Attempt | That attempt didn’t complete. You can try once more when ready. | `retryPayment` | Back to cart | **Yes**, only `retryPayment` |
| Payment `SUCCEEDED`, Order not yet listed | `payment.status === "SUCCEEDED"` or checkout `COMPLETED`; `listCustomerOrders` / `getCustomerOrder` empty | Payment succeeded. Your order is being confirmed — don’t pay again. Check this page / order history shortly. | Poll order reads | Order history | **No** |
| Order available | `CommerceOrderDetail` / summary | Order confirmed. | Confirmation / detail | Support with `orderNumber` | **No** |
| Razorpay modal dismissal | `onDismiss` then `getPaymentState` | Payment window closed. Not confirmed. | If Payment `OPEN` and no unresolved Attempt: continue (idle/retryable). If PROCESSING/INDETERMINATE: wait, don’t pay again. | None | Only if state matrix row for OPEN+no unresolved |
| Checkout.js load failure | `loadRazorpayCheckoutScript` reject **after** start/retry already created Payment/Attempt | Checkout couldn’t load. Check connection. Do not start a new payment. | Retry **script load / reopen** against existing `clientAction` or refresh `getPaymentState` | Support | **No new `startPayment`**. Reopen allowed if Payment still `OPEN`/`PROCESSING` with existing Attempt per getPaymentState |

Zero-payable: `completeZeroPayableCheckout` only; never Razorpay.

`PaymentPanel` must hide or disable Pay/retry whenever Pay again = No. Dynamic status uses live
region semantics (§17).

---

## 14. Confirmation / Order Contract

Confirmation requires a real BOBA Order from `getCustomerOrder` / `listCustomerOrders`.

Present at minimum:

- public `orderNumber`;
- `orderStatusLabel(status)` (D-357 only);
- basket (`order.lines`);
- total (`order.money.grandTotalMinor`);
- destination already on `CommerceOrderDestination`;
- reassurance that the order is with Boba Bear;
- support action (§15).

Do **not** expose: Payment UUID, Razorpay payment id, Razorpay order id, provider internals,
internal checkout ids.

Unknown Order status strings must not be mapped to kitchen/delivery vocabulary (`orderStatusLabel`
already returns the raw string; IMP-026C must not add PREPARING/READY/OUT_FOR_DELIVERY labels).

---

## 15. Contextual Support Contract

P0 is a simple **external contact** action, not a support domain.

On confirmation and order detail (when `orderNumber` exists):

```text
Need help with this order?
```

Prefill public `orderNumber` into the external message. Reuse `CONTACT`:

- preferred: WhatsApp `https://wa.me/` using `CONTACT.phoneE164` digits + URL-encoded text that
  includes the `orderNumber` (do not reuse the marketing “Catch the Drop” `CONTACT.whatsapp` text
  for order help);
- fallback: `mailto:CONTACT.email` with subject/body containing `orderNumber`, and/or
  `tel:CONTACT.phoneE164`.

Do **not** create: support-case domain, ticketing, CRM, staff queue, automated WhatsApp messaging,
or notification workflow.

Without an Order, support is generic CONTACT only (no fake orderNumber).

---

## 16. Mobile Navigation

Preserve a small commerce navigation on `/order*` routes. Recommended P0 destinations (existing
routes only):

| Label | href | Notes |
|---|---|---|
| HOME | `/` | Marketing home |
| MENU | `/order` | Ordering catalog |
| ORDERS | `/order/orders/` | Requires customer auth (existing gate) |

Cart remains transactional sticky UI (mobile) / header CTA (desktop), **not** a permanent nav
destination.

`SEARCH` must **not** be added as empty navigation. Search implementation is outside this slice.

Evidence: current `Nav` `NAV_LINKS` are marketing hash links plus `/order`. Conditional commerce
links by `usePathname()` starting with `/order` is the repository-native mapping. Do not add
routes. Do not implement a second app shell.

---

## 17. Accessibility Contract

Acceptance-level, not optional polish.

| Requirement | Locked behavior |
|---|---|
| Keyboard | Add, `+`, `−`, Cart, Checkout, Pay, retry, support, destination submit are reachable and operable |
| Names | Accessible names include product context for Add / `+` / `−` (extend existing `aria-label={`Increase ${item.name}`}` pattern to Add). Cart control names “Cart, N items”. Pay names include amount. Retry / support are named, not icon-only |
| Quantity | Visible count plus accessible text that includes product name; announce changes (`aria-live="polite"` on the quantity status) |
| Payment status | PROCESSING / INDETERMINATE / checking / load failure / dismissal are exposed via `role="status"` or `aria-live="polite"` (assertive only for definitive failure `role="alert"`). Not color-only |
| Focus | After blocking failures and after returning from Razorpay dismiss, restore focus to the primary safe control (`payButtonRef` pattern already in `PaymentPanel`) |
| Color | Status always has text, not color alone |
| Tap targets | Primary transaction controls ≥ 44×44 CSS px at supported mobile widths. Do not leave `Button size="sm"` (`h-8`) as the only Add/qty hit target on mobile |
| Hidden primary action | Sticky cart / Pay must remain visible and not covered by Nav/Footer at supported mobile widths |

Reuse existing `id="main-content"`, `role="alert"` error pattern, `CustomerLoginClient` `aria-live`
status line, and `Nav` drawer focus trap — do not regress them.

---

## 18. Responsive Behavior

| Width | Behavior |
|---|---|
| Supported mobile | Existing ordering `px-5` layout; primary journey usable without horizontal scroll of transaction controls. Bottom sticky cart when non-empty on `/order`. Commerce nav in `Nav` |
| `md` and up | No bottom sticky; header Cart CTA equivalent. Same journey |

Supported mobile widths = the widths already targeted by ordering layout (`< md`, Tailwind `md`
= 768px). Do not introduce a new breakpoint system.

Footer/Nav from `src/app/layout.tsx` remain; sticky cart must clear them (padding / z-index
presentation only).

No PWA / service worker (IMP-025 exclusion preserved).

---

## 19. Error / Recovery Matrix

| Situation | Existing source of truth | Customer message | Allowed action | Forbidden action |
|---|---|---|---|---|
| Empty cart | `!cart \|\| lines.length === 0` | Cart is empty; browse the menu | Link `/order` | Checkout / Pay / sticky cart |
| Item unavailable | `CART_ITEM_NOT_ORDERABLE` or evaluate `LINE_VARIANT_UNAVAILABLE` | That item can’t be ordered right now | Other items; remove line if present | Fake in-stock Add |
| Quantity zero / remove | qty `< 1` → `removeCartLine` | Line removed; sticky hides if cart empty | Continue shopping | Persist qty 0 lines |
| Auth / OTP failure | `CustomerLoginClient` notices; `CUSTOMER_AUTH_REQUIRED` | Existing OTP copy / sign in to continue checkout | Retry OTP; return-to checkout | Force auth to browse/Add |
| Location missing | no PIN; evaluate `REQUIRES_FULFILMENT_CONTEXT` | We’ll confirm delivery at checkout | Enter PIN; continue | Claim live coverage |
| Serviceability fail | `SERVICEABILITY_NOT_SERVICEABLE` / `CHECKOUT_NOT_SERVICEABLE` | We don’t deliver to that address yet | Change PIN/address | Pay |
| Serviceability indeterminate | `*_INDETERMINATE` codes | Couldn’t confirm delivery. Try again shortly | Retry evaluate | Pay / ETA |
| Checkout evaluation failure | `evaluateCheckout` not ok (`commerceErrorCopy`) | Existing checkout error copy | Fix destination / cart | Open Razorpay |
| Razorpay script load failure | `loadRazorpayCheckoutScript` catch | Checkout couldn’t load. Check connection | Retry load/reopen; `getPaymentState` | New `startPayment` |
| Razorpay modal dismissal | `onDismiss` + `getPaymentState` | Window closed; not confirmed | Continue per Payment row | Confirmation / Order |
| Provider failure signal | `onProviderFailure` + `getPaymentState` | Attempt didn’t complete; checking status | Follow Payment matrix | Browser-declared FAILED |
| Payment processing | `payment.status === "PROCESSING"` | In progress. Don’t pay again | Poll | Second Pay |
| Payment indeterminate | Attempt `INDETERMINATE` / `PAYMENT_PROVIDER_INDETERMINATE` | Still confirming. **Don’t pay again.** | Poll; CONTACT | Retry Pay |
| Definitive payment failure | EXPIRED / CANCELLED / SUPERSEDED / `PAYMENT_TERMINAL` | Can no longer continue | Cart/checkout restart if contracts allow | Retry this Payment |
| Retryable payment | Attempt `FAILED` + Payment `OPEN` | Try payment again | `retryPayment` | Parallel startPayment |
| Payment success / delayed Order | Payment `SUCCEEDED`; no Order yet | Payment succeeded; order being confirmed; don’t pay again | Poll orders; history | Confirmation page as if Order exists |
| Confirmed Order | `CommerceOrderDetail` | Confirmed + `orderNumber` + D-357 status | Detail / history / support | Pay again |
| Support request | `CONTACT` + `orderNumber` | Need help with this order? | External WhatsApp/email/tel | Ticketing / WhatsApp automation |

---

## 20. Security / Privacy Boundary

- Guest cart token remains `sessionStorage` only (`guest-token.ts`); not auth.
- Customer OTP/session remains IMP-009 / `customer-auth`; no second auth system.
- `returnTo` remains same-origin (`parseSafeReturnPath`).
- Do not put Payment UUIDs, Razorpay ids, or guest tokens in support prefill, URLs beyond existing
  `orderId` query, or analytics.
- Support prefill is public `orderNumber` plus non-sensitive “need help” text.
- Razorpay `clientAction` must still reject secret-bearing payloads (`parseRazorpayStandardCheckoutAction`).
- Static export + `/api/v1/*` façade unchanged (**D-356**, **D-359**, **D-360**).
- No new cookies, no localStorage of payment recovery beyond existing
  `rememberPaymentRecovery` helper already used by `PaymentPanel`.

---

## 21. Explicit Non-Goals

IMP-026C must **not** include:

- persisted delivery instructions;
- new Checkout note field;
- new address-note abuse;
- JSON metadata workaround;
- new API route;
- new transport contract;
- new DB column/table;
- migration;
- standalone pre-cart Serviceability API;
- ETA;
- delivery capacity;
- GPS tracking;
- driver workflow;
- Search implementation;
- recommendations;
- cross-sell engine;
- Bestseller automation;
- new catalog/modifier semantics;
- quantitative inventory;
- fake scarcity;
- `PREPARING` / `READY` / `OUT_FOR_DELIVERY`;
- detailed Kitchen Fulfilment;
- Refund;
- self-service cancellation;
- Operations Console;
- Delivery implementation;
- Notifications;
- WhatsApp automation;
- support-case domain;
- loyalty/rewards;
- favourites;
- referrals;
- personalization;
- scheduled orders;
- analytics implementation.

Do not steal scope from IMP-027 → IMP-040. Do not accept IMP-026. Do not claim payment production
readiness or Live Mode.

---

## 22. Implementation Boundaries

Likely surfaces (do not edit in this architecture task):

| Surface | Class |
|---|---|
| `OrderingCatalogClient` | UI_PRESENTATION, ACCESSIBILITY, CLIENT_STATE_MAPPING (PIN context, sticky) |
| Sticky cart (new presentational component hosted by catalog, or inline) | UI_PRESENTATION, CLIENT_STATE_MAPPING, ACCESSIBILITY |
| `CartClient` | UI_PRESENTATION, ACCESSIBILITY |
| `CheckoutClient` | UI_PRESENTATION |
| `PaymentPanel` | UI_PRESENTATION, CLIENT_STATE_MAPPING, ACCESSIBILITY |
| `error-copy.ts` | UI_PRESENTATION (copy for **existing** codes only, e.g. `PAYMENT_UNRESOLVED_ATTEMPT`) |
| `CommerceCheckoutSnapshot` charge/tax narrowing in `types.ts` | CLIENT_STATE_MAPPING |
| `OrderConfirmationClient` / `OrderDetailClient` / `OrderHistoryClient` | UI_PRESENTATION, ACCESSIBILITY |
| `Nav.tsx` commerce destinations on `/order*` | UI_PRESENTATION, ACCESSIBILITY |
| Support link helper using `CONTACT` + `orderNumber` | UI_PRESENTATION |
| Unit/component/E2E tests listed in §24 | TEST_ONLY |

```text
DOMAIN: NONE
DATABASE: NONE
MIGRATION: NONE
SERVER_API: NONE
PAYMENT_PROVIDER: NONE
ORDER_MODEL: NONE
```

If implementation discovers that an approved P0 requirement needs server/domain/API/DB change:
**ARCHITECTURE_SCOPE_CONFLICT** — stop; do not expand IMP-026C silently.

---

## 23. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-01 | No new domain authority, API route, transport contract, DB column/table, or migration |
| AC-02 | Customer can browse and Add without authentication unless already in an authenticated session; auth remains at checkout |
| AC-03 | Existing quantity controls remain the only quantity authority (`setCartLineQuantity` / `removeCartLine`) |
| AC-04 | Sticky cart reflects current `CommerceCart` count (and presentation estimate) and hides when empty |
| AC-05 | No unproven serviceability claim (no SERVICEABLE without Cart/Checkout evaluate evidence) |
| AC-06 | No fake ETA or capacity language |
| AC-07 | Authoritative charges visible before payment (snapshot subtotal, discount, packaging, delivery, tax as present, grand total) |
| AC-08 | Pay CTA total equals `snapshot.grandTotalPaise` |
| AC-09 | Razorpay callback / handler alone never confirms an Order |
| AC-10 | PROCESSING / PENDING / INDETERMINATE prevent a second Pay/retry |
| AC-11 | INDETERMINATE explicitly tells the customer not to pay again |
| AC-12 | Retry only through `retryPayment` when Payment is `OPEN` with no unresolved Attempt |
| AC-13 | Confirmation requires a real BOBA Order (`getCustomerOrder` / list) |
| AC-14 | Support uses public `orderNumber` only (no Payment/Razorpay ids) |
| AC-15 | No new Order lifecycle states; D-357 only |
| AC-16 | Primary transaction controls meet §17 accessibility behavior |
| AC-17 | Primary journey works at supported mobile widths (§18) |
| AC-18 | No empty Search nav destination |
| AC-19 | IMP-026 external webhook gate is `SATISFIED`; this slice does not claim payment GTM acceptance beyond IMP-026 |

---

## 24. Required Test Scenarios

Define only. **Do not implement in this architecture task.**

| ID | Scenario | Likely existing suite to extend |
|---|---|---|
| UX-01 | Menu → Add → sticky cart appears with count | new `OrderingCatalogClient` component test; `tests/e2e/customer-ordering.spec.ts` |
| UX-02 | Quantity updates sticky cart count/estimate | catalog/cart component tests |
| UX-03 | Empty cart removes sticky cart | catalog component test |
| UX-04 | Cart → auth → checkout continuity (`returnTo`, guest token, claim/reconcile) | `tests/e2e/customer-ordering.spec.ts`; `src/lib/customer-auth/return-to*.test.ts`; `CheckoutClient.destination.test.tsx` |
| UX-05 | Serviceability truth/copy for matrix rows | `CartClient` / catalog tests with mocked `evaluateCart`; checkout destination test for `CHECKOUT_NOT_SERVICEABLE` |
| UX-06 | Checkout fee itemization (packaging/delivery/tax from snapshot) | `PaymentPanel.test.tsx` |
| UX-07 | Pay amount equals grand total | `PaymentPanel.test.tsx` |
| UX-08 | Checkout.js load failure does not `startPayment` twice | `PaymentPanel.test.tsx` (existing script-load case) |
| UX-09 | Razorpay dismissal does not confirm Order | existing E2E + `PaymentPanel.test.tsx` dismiss case |
| UX-10 | PROCESSING blocks second Pay | `PaymentPanel.test.tsx` |
| UX-11 | INDETERMINATE says don’t pay again | `PaymentPanel.test.tsx`; `error-copy` if copy lives there |
| UX-12 | Retryable FAILED+OPEN permits `retryPayment` only | existing PaymentPanel retry test |
| UX-13 | Payment SUCCEEDED resolves exactly one Order (poll; no duplicate pay) | E2E guest complete path; PaymentPanel order-wait case |
| UX-14 | Confirmation shows public `orderNumber` | `OrderConfirmation` / detail tests |
| UX-15 | Support prefill uses `orderNumber` only | confirmation/detail component tests |
| UX-16 | Accepted Order states only (D-357) | `order-status.test.ts`; detail/history tests |
| UX-17 | a11y names/keyboard for Add/qty/cart/pay/support | component tests + E2E a11y smoke if present |
| UX-18 | Dynamic payment status via live region | `PaymentPanel.test.tsx` |
| UX-19 | Responsive mobile journey (sticky vs header; tap targets) | E2E viewport assertion and/or component class assertions |
| UX-20 | No new API/domain/database (static scan / consistency) | `scripts/project-consistency.mjs`; architecture review of diff |

Do not redundantly re-run full IMP-026 provider/webhook matrices as IMP-026C UX tests.

---

## 25. Architecture Invariants

1. Cart → Checkout Snapshot → Payment → Order authority is unchanged.
2. IMP-019 is the only serviceability evaluator; Checkout evaluate is the hard gate.
3. Coordinates never become coverage authority.
4. Catalog presentation prices never become payable truth.
5. Sticky cart is not a Cart domain.
6. Browser Razorpay events never become Payment or Order truth.
7. `authorized` ≠ success; `captured` via Payment application = success.
8. Unresolved Payment ⇒ no second payment action + don’t-pay-again copy.
9. Confirmation ⇒ real Order with public `orderNumber`.
10. Order vocabulary = D-357 only.
11. No new API, schema, migration, service, or decision D-364.
12. Static export + `customer-commerce` `/api/v1/*` topology unchanged.
13. IMP-026 external webhook gate is SATISFIED under accepted IMP-026 authority.
14. IMP-026C implementation is authorized and complete pending formal acceptance.

---

## 26. Dependencies / Future IMP Boundaries

| Dependency | Role |
|---|---|
| IMP-019 | Serviceability evaluation |
| IMP-020 / IMP-024 Cart APIs | Intent + evaluate |
| IMP-021 / IMP-024 Checkout | Destination + snapshot |
| IMP-022 / IMP-024 / IMP-026 Payment | Collection, Razorpay, retry, state |
| IMP-023 / IMP-024 Order | Confirmation / history / detail |
| IMP-025 | Baseline UX routes/components |
| IMP-009 | OTP |

| Future / excluded owner |
|---|
| IMP-026 acceptance / public HTTPS webhook | Remains IMP-026; not this slice |
| IMP-027 Refund |
| IMP-028 Invoice |
| IMP-029 / IMP-030 Ops Console |
| IMP-031+ Delivery |
| IMP-033+ Notifications / WhatsApp automation |
| Search, recommendations, Bestsellers | Unscheduled / later strategy; not IMP-026C |
| Self-service cancellation, kitchen states, inventory | DEFERRED_UNSCHEDULED |

---

## 27. Open Questions

None. Architecture is locked.

---

## Implementation Authorization

```text
Architecture:     ARCHITECTURE_LOCKED
Implementation:   IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
Authorized now:   YES
```

Implementation authorization and evidence are already recorded. Formal acceptance of IMP-026C is
still not claimed.
