---
Status: SUPPORTING PRODUCT / EXPERIENCE MATERIAL
Authority: NONE — working target journey; does not invent backend authority
Canonical vision: docs/platform/VISION.md
Preserved: 2026-08-18
Audit: 2026-08-18 repository gap map
---

# Target Food customer journey

**SUPPORTING.** This is the working target FOOD journey for BOBA Direct. It does not invent new
backend authority. Dispositions evaluate current repository facts against this working target.

Capability boundaries, MVP vs later, and sequencing live in
[`food-direct-product-architecture-lock.md`](./food-direct-product-architecture-lock.md). That lock
does not change this journey; it classifies which stages are MVP (through My BOBA Foundation) vs
later (Order Again operation).

VISION-1 already names a shorter conceptual chain (`Menu / discovery → Cart → authentication →
Address → Serviceability → Checkout → Payment → confirmation → history`). This working target adds
customization, My BOBA, and Order Again as **planning**. Those additions are not current accepted
product promises.

## Target sequence

```text
HOME
→ MENU
→ PRODUCT
→ CUSTOMIZE
→ CART
→ AUTHENTICATION
→ ADDRESS
→ SERVICEABILITY
→ CHECKOUT
→ PAYMENT
→ CONFIRMATION
→ ORDER STATUS
→ MY ORDERS
→ ORDER AGAIN / MY BOBA
```

Current implemented path (audit 2026-08-18):

```text
HOME `/`
→ MENU `/order`   (labeled Order / Order now in places)
→ PRODUCT / CUSTOMIZE   ABSENT
→ CART `/order/cart/`
→ AUTHENTICATION `/login`   (required at checkout, not to browse)
→ ADDRESS   checkout destination
→ SERVICEABILITY   hard gate on checkout evaluate
→ CHECKOUT `/order/checkout/`
→ PAYMENT   PaymentPanel + `/order/payment/`
→ CONFIRMATION `/order/confirmation/?orderId=`
→ ORDER STATUS   D-357 labels
→ MY ORDERS `/order/orders/`
→ ORDER AGAIN / MY BOBA   ABSENT
```

My BOBA Foundation (initial): Active Order, My Orders, Saved Addresses, Profile, Sign Out.
Order Again is a **separate later capability** (historical Order → new current Cart intent; never
replay Checkout Snapshot). See the planning lock §11.

## Stages

### HOME

| Field | Working record |
|---|---|
| Customer intent | Discover the brand world, get hungry, enter Food commerce |
| Intended experience | Brand discovery + appetite + campaign + conversion entry. Not a second full ordering catalog. |
| Current repository authority | Static marketing page. No commerce service. `src/app/page.tsx`; `Hero`, `SignatureDrops`, `TheBar` / `ThePlates` / `TheSweet` + `src/data/menu.json`; `MerchDrop`; `Artists`; `AccessCTA` |
| Disposition | **REDESIGN** |

Home currently duplicates a marketing menu with hardcoded prices and no cart/auth. Sellable truth
belongs on Menu.

### MENU

| Field | Working record |
|---|---|
| Customer intent | Find something to order now |
| Intended experience | Stable Food catalog destination. Category navigation derived from authoritative Menu sections so customers are not forced to traverse the entire Menu sequentially. Make the next Add obvious. Sticky/horizontal category chrome is a **candidate** visual pattern, not first-B product law. |
| Current repository authority | IMP-025 static `src/data/ordering-catalog.json` on `/order` (TRANSITIONAL CURRENT delivery). TARGET serving architecture is **D-368** (server-backed READ PROJECTION). No Menu endpoint implemented. Cart APIs for add. `menu_sections` / `menu_entries` exist in DB for identity. `OrderingCatalogClient` |
| Disposition | **REDESIGN** (layout). Serving TARGET = **BINDING VIA D-368**. |

Layout redesign remains WORKING and does not itself implement D-368. D-368 does not lock Menu UX.
The Food Direct planning lock keeps visual discovery and D-368 serving in **one family B**;
acceptance of B requires projection serving, not long-term static catalog serving.

Supporting Capability B definition (SUPPORTING; `CANONICALIZED_AS = IMP-028B`; architecture
`ARCHITECTURE_LOCKED`; implementation **authorized** / **not started**):
[`slices/customer-menu-projection-and-discovery.md`](./slices/customer-menu-projection-and-discovery.md).
Canonical product authority:
[`../capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](../capabilities/IMP-028B-customer-menu-projection-and-discovery.md).
First B treats availability as optional display projection: omit the claim when no authoritative
outlet/operating context exists. Do not invent availability, outlet, serviceability, stock,
inventory, ETA, or delivery promise.

### PRODUCT

| Field | Working record |
|---|---|
| Customer intent | Understand the item (sensory, price, constraints) before adding or customizing |
| Intended experience | Appetizing product content: image, name, short sensory description, display/current price, limited useful tags, Add or Customize. No internal SKU leak. |
| Current repository authority | Catalog variants exist (`schema/catalog.ts`). `/order` shows add/qty rows; no dedicated PDP route. Tags unused on `/order`. Availability not shown (IMP-026C forbids invented availability flags). |
| Disposition | **REDESIGN** (card/PDP presentation) |

### CUSTOMIZE

| Field | Working record |
|---|---|
| Customer intent | Configure this item the way I want it, with paid extras explicit |
| Intended experience | MenuItem → Food Modifier Groups → Options. Backend defines available customization. |
| Current repository authority | Generic groups/options/min-max/defaults/non-negative deltas exist (`schema/catalog.ts`, `catalog_modifier_*`, ADR-006). Live import `modifier_groups: 0`. No customer UI. `updateCartLineConfiguration` unused by live catalog. Paid-modifier explicit selection is **BINDING VIA D-369** (policy; implementation not authorized). |
| Disposition | **MISSING** |

Conceptual UX group types discussed (SIZE / SWEETNESS / ICE / EXTRAS / REMOVALS) are examples, not
schema enums. Typed kinds remain OPEN.

### CART

| Field | Working record |
|---|---|
| Customer intent | Review current purchase intent and proceed |
| Intended experience | Guest browse/add supported. Cart survives authentication. Identical configured lines may merge where identity rules allow; materially different configs stay separate. Stale Cart revalidated with resolvable conflicts. No silent substitution. Projections/estimates allowed; Cart is not final pricing authority. |
| Current repository authority | IMP-020; `schema/cart.ts`; `carts` / `cart_lines`; guest XOR customer; claim/reconcile at checkout (`CheckoutClient`). `CartClient`, `StickyCartBar` |
| Disposition | **KEEP** authority; **FIX** claim-timing / session chrome as UX defects (policy now **BINDING VIA D-370**) |

Anonymous → authenticated compatible merge and logout customer-cart isolation are
**BINDING VIA D-370**. Accepted checkout claim/reconcile remains CURRENT implementation until an
authorized future capability implements D-370.

### AUTHENTICATION

| Field | Working record |
|---|---|
| Customer intent | Prove who I am when the journey requires it |
| Intended experience | Sign In when required (checkout and protected account). Browse/add without auth. Chrome reflects session. |
| Current repository authority | IMP-009; phone OTP; HttpOnly cookie; `customer-auth`; `fetchCustomerSession` used by login/checkout/orders/cart, **not** by `Nav.tsx` |
| Disposition | **KEEP** identity model; **FIX** session-blind header |

Authentication answers “Who are you?” It is not Customer Profile.

### ADDRESS

| Field | Working record |
|---|---|
| Customer intent | Tell BOBA where to fulfil this purchase |
| Intended experience | Saved Addresses as reusable convenience destinations. Default Address is a convenience default, not an invisible fulfilment commitment. Checkout copies destination into the snapshot; later profile edits do not rewrite history. Address ≠ delivery instructions. |
| Current repository authority | IMP-018; `customer_addresses`; `/api/v1/me/addresses` full CRUD. Checkout UI select/create only (`CheckoutClient`). No label/edit/delete book UI. |
| Disposition | **REDESIGN** (address-book placement/UI); CRUD backend **KEEP** |

### SERVICEABILITY

| Field | Working record |
|---|---|
| Customer intent | Know whether BOBA can fulfil here |
| Intended experience | Serviceability = can we fulfil here? Delivery Promise = when can we fulfil here? Do not conflate. Browsing should not require full auth/address; lightweight service context may improve Menu; exact destination becomes authoritative at Checkout. |
| Current repository authority | IMP-019 PIN evaluator; hard gate at checkout evaluate; statuses SERVICEABLE / NOT_SERVICEABLE / TEMPORARILY_UNAVAILABLE / INDETERMINATE. No Delivery Promise domain. IMP-026C forbids fake ETA/capacity. |
| Disposition | **KEEP** coverage authority; placement/progressive-location UX may **REDESIGN** |

Do not invent new serviceability or pricing rules.

### CHECKOUT

| Field | Working record |
|---|---|
| Customer intent | See the payable offer and commit |
| Intended experience | Checkout Snapshot is the authoritative payable commercial truth. Address/service context changes trigger revalidation. Cart estimates must not compete. |
| Current repository authority | IMP-021; ARCH-G05; `checkout_snapshots`; 15m TTL implementation. `CheckoutClient` |
| Disposition | **KEEP** |

Checkout validity/expiry customer policy remains OPEN. Do not reopen snapshot authority.

### PAYMENT

| Field | Working record |
|---|---|
| Customer intent | Pay the sealed offer, or know why not |
| Intended experience | Razorpay browser callback ≠ Payment success. Unresolved / INDETERMINATE → Do not pay again. Customer-facing projections: CONFIRMING / SUCCESS / DEFINITE FAILURE / INDETERMINATE. Do not create new Payment domain states for UX. |
| Current repository authority | D-361–D-363; IMP-022/026; `PaymentPanel`; `PaymentReturnClient`; `submitPaymentClientEvidence` is evidence only |
| Disposition | **KEEP** authority; **FIX** recovery/copy defects |

Audit FIX findings (not repaired here): weaker recovery on checkout remount; weaker return-page
uncertainty copy; “Don't pay again yet.” vs target “Do not pay again.”

### CONFIRMATION

| Field | Working record |
|---|---|
| Customer intent | Know that BOBA accepted a real order |
| Intended experience | Confirmation requires a real BOBA Order. Public `orderNumber` is the customer/support reference. Paid facts from snapshot/order. No invented ETA. |
| Current repository authority | D-362 materialization; `GET /api/v1/orders/:id`; `OrderConfirmationClient` |
| Disposition | **FIX** |

Audit FIX findings: heading may overstate confirmation; newest-order selection can be used instead
of checkout-bound Order (`waitForCustomerOrder` / `items[0]`); modifiers not rendered even though
sealed data exists.

### ORDER STATUS

| Field | Working record |
|---|---|
| Customer intent | Know where this order is in BOBA’s lifecycle |
| Intended experience | Project existing D-357 states. Do not add kitchen/ETA domain states for UX. |
| Current repository authority | D-357 PLACED \| ACCEPTED \| FULFILLED \| CANCELLED; `order-status.ts` |
| Disposition | **KEEP** |

### MY ORDERS

| Field | Working record |
|---|---|
| Customer intent | Find a past purchase |
| Intended experience | Historical purchases named **My Orders**, inside My BOBA — not a peer of Menu named “Orders”. |
| Current repository authority | IMP-023 customer reads; `GET /api/v1/orders`; `OrderHistoryClient` / `OrderDetailClient`; financial documents on detail (IMP-028) |
| Disposition | **REDESIGN** (placement/terminology); list/detail capability **KEEP** |

### ORDER AGAIN / MY BOBA

| Field | Working record |
|---|---|
| Customer intent | Repeat a usual purchase; manage the relationship |
| Intended experience | My BOBA = relationship + commerce convenience. Initial Foundation = Active Order, My Orders, Saved Addresses, Profile, Sign Out. Order Again uses a historical Order to create **new current purchase intent**, then revalidates. Must not replay an old Checkout Snapshot as current commercial truth. Order Again is a **separate later capability**. |
| Current repository authority | No hub. Fragments: `/login`, `/order/orders/`, checkout addresses. Profile API exists unused by UI. No Order Again operation. Favorites/Rewards absent/deferred. |
| Disposition | **MISSING** hub (family F, MVP); **MISSING** Order Again (family G, later); Favorites/Rewards **DEFER** |

See [`information-architecture.md`](./information-architecture.md) and
[`food-direct-product-architecture-lock.md`](./food-direct-product-architecture-lock.md).
