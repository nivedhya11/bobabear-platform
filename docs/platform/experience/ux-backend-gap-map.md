---
Status: SUPPORTING PRODUCT / EXPERIENCE MATERIAL
Authority: NONE — dated audit snapshot, not acceptance and not CURRENT architecture
Audit date: 2026-08-18
Source checkpoint: HEAD ddca0c319a5e80b2cfe38a2c32481b636277010e
Governance: VISION-1 / GTM-R30 / STATE-R28 / ARCH-R12 / DR-9 at audit time
Later status: D-368 CURRENT; D-369 CURRENT; D-370 CURRENT; GTM-R39 / STATE-R37 / ARCH-R15 / DR-12; acceptedThrough = IMP-028A; currentProductSlice = IMP-028B; CUSTOMER_MENU_TARGET = BINDING VIA D-368; PAID_MODIFIER_EXPLICIT_SELECTION = BINDING VIA D-369; CART_IDENTITY_TRANSITION = BINDING VIA D-370; FOOD_DIRECT_CAPABILITY_B = CANONICALIZED_AS = IMP-028B; IMP028B_CANONICALIZED = YES; IMP028B_IMPLEMENTATION_AUTHORIZED = YES; IMP028B_IMPLEMENTATION_STARTED = NO
acceptedThrough: IMP-028
currentProductSlice: NONE
---

# UX / backend gap map (2026-08-18)

**SUPPORTING SNAPSHOT.** This persists the completed read-only repository audit dated
**2026-08-18**. Working Direct UX is an **evaluation lens**, not repository authority.

This map must not rewrite Checkout Snapshot, Payment, Order, Refund, Financial Document, or
SignatureArtifact authority. It is not IMP-029 and not a VISION amendment. **D-368** was later
created as Customer Menu Read Projection Authority. **D-370** was later created as Cart Identity
Transition Authority. Findings
are **not repaired** by this documentation task.

Later supporting trace (2026-08-19; does **not** rewrite this 2026-08-18 audit): Capability B
Customer Menu Projection + Discovery is persisted as SUPPORTING / DEFINED_FOR_REVIEW in
[`slices/customer-menu-projection-and-discovery.md`](./slices/customer-menu-projection-and-discovery.md)
(`CANONICALIZED_AS = IMP-028B`; architecture `ARCHITECTURE_LOCKED`; implementation authorized / not started).

Dispositions: `KEEP` | `FIX` | `REDESIGN` | `MISSING` | `DEFER`.

## Executive summary

The accepted product already supports a real owned food order:

```text
static Menu at `/order`
→ server Cart
→ OTP at checkout
→ address / serviceability
→ Checkout Snapshot
→ Razorpay
→ BOBA Order
→ history / documents
```

That chain is **KEEP** as commercial authority.

The working Direct UX is a different product shape: one brand world, **Menu** as the catalog,
**Order Now** as CTA, **My BOBA** as relationship space, configured food items, and Home as
discovery rather than a second catalog. Against that lens the current site is still a **marketing
issue plus a functional ordering app**, with competing words (**Order / Order now / Orders / Menu**)
and a confirmed **session-blind header**.

Three clusters matter first:

1. **FIX now, no domain change** — `Nav` always shows “Sign in” after a successful OTP. Payment
   recovery is weaker after checkout remount than IMP-026C specified.
2. **REDESIGN, mostly frontend** — Home, nav, terminology, Menu layout, product cards, address-book
   placement.
3. **MISSING as customer product** — customization UX (schema exists, live import is empty), Order
   Again, My BOBA, customer Offers surface, Favorites.

Do **not** reopen Checkout Snapshot, Payment, Order, Refund, Financial Document, or
SignatureArtifact to deliver this UX.

Existing-defect → future family mapping (planning lock; not repaired here) is in **FIX** below and
in [`food-direct-product-architecture-lock.md`](./food-direct-product-architecture-lock.md).

## Gap matrix

| Area | Current state | Repository evidence | Target (working) | Disposition | Class | Backend change? | New D likely? |
|---|---|---|---|---|---|---|---|
| Brand / Home | Editorial issue; marketing menu with hardcoded ₹ from `menu.json`; no cart/auth | `src/app/page.tsx`; `TheBar` / `ThePlates` / `TheSweet`; `src/data/menu.json` | Lifestyle discovery + appetite + conversion into MENU | REDESIGN | UX_REDESIGN | No | Possibly (pillars vs VISION-1) |
| Navigation | Dual chrome: marketing hashes vs commerce Home/Menu/Orders; always Sign in; no Cart in global marketing nav | `src/components/Nav.tsx` `NAV_LINKS` / `COMMERCE_NAV_LINKS` | Menu \| Drops \| Offers \| Sign In or Hi/My BOBA \| Cart | REDESIGN | UX_REDESIGN | No | Possibly |
| Terminology | Order + Order now + Orders + Menu all live; no My BOBA / My Orders | `Nav.tsx`; `OrderingCatalogClient`; `OrderHistoryClient` | One customer-facing name per concept | REDESIGN | CONTENT_TERMINOLOGY | No | No |
| Menu | `/order` long-page static catalog; no search; menu prices labeled non-authoritative | `src/app/order/page.tsx`; IMP-025 §8; `src/server/customer-commerce/http/router.ts` (`/api/v1/menu` 404 CURRENT) | Stable catalog destination; sticky cats + feed + persistent cart | REDESIGN | UX_REDESIGN | Layout no; live projection TARGET is D-368 | Serving TARGET BINDING VIA D-368; layout still WORKING |
| Categories | `menu_sections` exist; ordering UI stacks all headings | `src/platform/database/schema/menu.ts`; `OrderingCatalogClient` | Sticky/horizontal category navigation | REDESIGN | UX_REDESIGN | No for current data | No |
| Product Cards | Add/qty rows; tags unused on `/order`; availability not shown | `OrderingCatalogClient.tsx`; IMP-026C no invented availability flag | Appetizing cards with price, availability, tags, Customize path | REDESIGN | UX_REDESIGN | Partial if live availability | No |
| Customization | Schema supports groups/options; live import has zero modifiers; no customer UI | `schema/catalog.ts`; `catalog_modifier_*`; live import `expected_zeros.modifier_groups: 0`; ADR-006 | MenuItem → modifier groups → options | MISSING | MISSING_CAPABILITY | Yes — populate graph + UI; typed kinds optional | Paid-default policy BINDING VIA D-369; implementation still missing |
| Bundles | Bundle schema/cart/checkout exist; combos imported as ordinary products | `catalog_bundle_*`; import `source-inventory.ts` | Bundles not flattened into modifiers | MISSING | MISSING_CAPABILITY | Content/graph, not new topology | Possibly |
| Cart | Server carts/lines; guest XOR customer; intent-only; claim at checkout | IMP-020; `schema/cart.ts`; `CheckoutClient` | Purchase intent, not commercial authority | KEEP | UX_DEFECT (claim timing) | No for authority | Merge/logout policy BINDING VIA D-370; implementation still missing |
| Authentication | Phone OTP; HttpOnly cookie; one customer-auth realm | IMP-009; `src/lib/customer-auth/client.ts` | Sign in when required; owned identity | KEEP | INVENTORY_ONLY | No | No |
| Session / Header | Nav never reads session; always Sign in after OTP success | `Nav.tsx`; `fetchCustomerSession` unused there; login/checkout/orders do call it | Logged-in chrome: Hi / My BOBA; Sign out in My BOBA | FIX | PRODUCT_DEFECT | No | No |
| Customer Profile | `customer_profiles` + `/api/v1/me/profile`; no customer UI; phone auth-owned | IMP-017; `schema/customer-profiles.ts` | Durable profile ≠ auth ≠ historical order truth | MISSING | MISSING_CAPABILITY (UI) | UI over existing API | Possibly (email/comms) |
| Saved Addresses | Full CRUD API; checkout select/create only; no label/edit/delete UI | IMP-018; `CheckoutClient`; `src/server/customer-addresses/addresses.ts` | Address book in My BOBA; checkout copy remains snapshot | REDESIGN | UX_REDESIGN | No for CRUD | No |
| Serviceability | PIN evaluator; hard gate at checkout; no Delivery Promise domain | IMP-019; `evaluate.ts`; IMP-026C | Can we fulfil here? separate from when | KEEP | UX_REDESIGN (placement) | No for coverage | No |
| Checkout | CheckoutSnapshot is sealed commercial authority; 15m TTL | IMP-021; ARCH-G05; `schema/checkout.ts` | Snapshot remains payable truth | KEEP | INVENTORY_ONLY | **Do not reopen** | Possibly (validity/copy) |
| Offers | Promotion engine + cart coupon API; no Offers page or coupon field | IMP-016; `promotions.ts`; no frontend coupon wrapper | Customer-facing offers without becoming price authority in UI | MISSING | MISSING_CAPABILITY | UI; auto-apply policy open | Yes |
| Payment UX | Callback ≠ success; Don't pay again yet; recovery not restored on checkout remount | D-361; `PaymentPanel.tsx`; `PaymentReturnClient.tsx`; IMP-026C matrix | CONFIRMING / SUCCESS / DEFINITE FAILURE / INDETERMINATE; Do not pay again | FIX | UX_DEFECT | **Do not reopen D-361** | No |
| Confirmation | Real Order + `orderNumber`; heading always Order confirmed; modifiers not shown | `OrderConfirmationClient.tsx` | Paid order facts from snapshot/order; no invented ETA | FIX | UX_DEFECT | No | No |
| Order Status | D-357 labels only; no fake kitchen/ETA | `order-status.ts`; D-357 | Project existing states; do not add domain states for UX | KEEP | INVENTORY_ONLY | No | No |
| My Orders | `/order/orders/` owned list+detail; FDs on detail; no active/historical split | `OrderHistoryClient`; `OrderFinancialDocuments` | Historical purchases inside My BOBA as My Orders | REDESIGN | CONTENT_TERMINOLOGY | No | No |
| Order Again | Absent. Must not replay old snapshot | ROADMAP “when capability exists” | Historical order → current cart intent → revalidate | MISSING | MISSING_CAPABILITY | Yes — new application op | Possibly |
| My BOBA | No hub. Fragments: `/login`, `/order/orders`, checkout addresses | no `/account`; `/login` only | Relationship + commerce convenience, not admin portal | MISSING | MISSING_CAPABILITY | Mostly UI over existing APIs | Possibly |
| Favorites | No schema/API/UI | IMP-026C out of scope | MenuItem affinity, not a usual configuration | DEFER | FUTURE_ENHANCEMENT | Yes later | Yes later |
| Rewards | VISION/ROADMAP deferred; `marketingOptIn` forbidden | VISION §7–8; ROADMAP deferred | Future retention | DEFER | FUTURE_ENHANCEMENT | Yes later | Yes later |
| Drops | Hardcoded SignatureDrops teaser; not a commerce entity | `src/components/SignatureDrops.tsx`; no catalog flag | Campaign mechanism; not price/inventory/checkout authority | REDESIGN | FUTURE_LIFESTYLE_CAPABILITY | Yes for real drops | Yes |
| Culture | Artists teaser only | `src/components/Artists.tsx` | Lifestyle pillar, separate domain | DEFER | FUTURE_LIFESTYLE_CAPABILITY | Yes later | Yes later |
| Wear | MerchDrop static tiles; store opens soon | `src/components/MerchDrop.tsx` | Separate commercial authority from Food | DEFER | FUTURE_LIFESTYLE_CAPABILITY | Yes later | Yes later |

## Frontend inventory (evidence)

Deploy: static Next export (`next.config.ts` `output: "export"`). One layout
(`src/app/layout.tsx`) wraps Ticker + Nav + Footer. Commerce HTTP is Nginx → `customer-commerce`
`/api/v1/*` and `customer-auth`.

| Route / component | Current purpose | Current UX | Backend/API | Disposition | Evidence |
|---|---|---|---|---|---|
| `/` `Home` | Editorial landing | Hero, manifesto, drops, marketing menu, merch, artists, access | None (`menu.json`) | REDESIGN | `src/app/page.tsx` |
| `Hero` | Brand + CTA | Access Drop / Explore Menu | None | REDESIGN | `src/components/Hero.tsx` |
| `SignatureDrops` | Drop teaser | One hardcoded “Purple Rain Drop” `soon` | None | REDESIGN | `SignatureDrops.tsx` |
| `TheBar` / `ThePlates` / `TheSweet` | Marketing menu | Hardcoded ₹; **not orderable** | None | REDESIGN | those components + `menu.json` |
| `MerchDrop` | Wear teaser | Series 01; Notify Me | None | DEFER | `MerchDrop.tsx` |
| `Artists` | Culture teaser | “Something’s coming.” | None | DEFER | `Artists.tsx` |
| `AccessCTA` | Conversion | Order with Boba Bear → `/order` | None | KEEP (entry) / REDESIGN copy | `AccessCTA.tsx` |
| `Nav` | Global chrome | Dual link sets; always Sign in | **None** | FIX + REDESIGN | `src/components/Nav.tsx` |
| `/order` `OrderingCatalogClient` | Live Menu | Long-page add-to-cart; optional PIN | `GET/POST /api/v1/cart*` | REDESIGN | `OrderingCatalogClient.tsx` |
| Product / customize | — | **NOT_FOUND** | `updateCartLineConfiguration` unused live | MISSING | no route |
| `/order/cart/` `CartClient` | Review intent | Qty, remove, clear; checkout requires auth | cart APIs + `GET /api/customer-auth/session` | KEEP | `CartClient.tsx` |
| `StickyCartBar` | Mobile cart state | Bottom bar on `/order` only | cart count | KEEP / REDESIGN if global | `StickyCartBar.tsx` |
| `/login` `CustomerLoginClient` | OTP | Sign In / Sign out only here | `/api/customer-auth/*` | KEEP + FIX chrome | `CustomerLoginClient.tsx` |
| `/order/checkout/` `CheckoutClient` | Destination + evaluate + pay | Saved / new / one-time | cart claim/reconcile, checkouts, `/me/addresses` | KEEP | `CheckoutClient.tsx` |
| `PaymentPanel` | Pay | Snapshot `grandTotalPaise`; Razorpay Standard Checkout | `/api/v1/payments*` | FIX recovery/copy | `PaymentPanel.tsx` |
| `/order/payment/` | Provider return | “Checking payment…” weaker than in-panel | payment state + orders | FIX | `PaymentReturnClient.tsx` |
| `/order/confirmation/` | Post-pay | Order number, D-357 status, lines | `GET /api/v1/orders/:id` | FIX | `OrderConfirmationClient.tsx` |
| `/order/orders/` | History | Newest-first list | `GET /api/v1/orders` | REDESIGN placement | `OrderHistoryClient.tsx` |
| `/order/orders/detail/` | Detail + FDs | Lines, destination, PDF when issued | orders + financial-documents | KEEP | `OrderDetailClient.tsx` |
| Account / My BOBA / Offers / Drops destination | — | **NOT_FOUND** | profile API unused by UI | MISSING | `src/app/**` |
| `/privacy` | Legal | Stale “ordering off-site” copy | None | FIX (copy) | `src/app/privacy/page.tsx` |

## Backend authority map

| Concept | Status | Evidence |
|---|---|---|
| Catalog | EXISTS | `schema/catalog.ts`; `src/server/catalog/` |
| Menu Item | EXISTS as `menu_entries` | `schema/menu.ts` |
| Category | EXISTS as `menu_sections` | `schema/menu.ts` |
| Pricing | EXISTS | `schema/pricing.ts`; `buildDirectPricingQuote` |
| Availability | EXISTS | `schema/assortment.ts` |
| Modifier / customization | EXISTS (unused by live import) | `catalog_modifier_*`; ADR-006; import `expected_zeros.modifier_groups: 0` |
| Bundle / combo | EXISTS (unused by live import) | `catalog_bundle_*`; cart/snapshot selection tables |
| CommerceCart | EXISTS (`carts` / `cart_lines`) | IMP-020; `schema/cart.ts` |
| Authentication | EXISTS | Better Auth customer; cookie `boba-customer.session_token` |
| Customer identity | EXISTS | `customer_auth_users.id` |
| Customer profile | EXISTS (no customer UI) | IMP-017; `/api/v1/me/profile` |
| Customer address | EXISTS (checkout-partial UI) | IMP-018; `/api/v1/me/addresses` |
| Serviceability | EXISTS | IMP-019; PIN list |
| Promotion | EXISTS (no customer Offers UX) | IMP-016; `POST /api/v1/cart/coupon` |
| Checkout | EXISTS | IMP-021 |
| Checkout Snapshot | EXISTS — historical commercial authority | ARCH-G05; `checkout_snapshots` |
| Payment | EXISTS | IMP-022 / D-361–D-363 |
| Order | EXISTS | IMP-023; D-357 |
| Refund | EXISTS (no customer refund API/UI) | D-364; IMP-027 |
| FinancialDocument | EXISTS (customer PDF on owned order) | D-365; IMP-028 |
| SignatureArtifact | EXISTS (download fail-closed until SIGNED) | D-367 |
| Drops | ABSENT as domain; static frontend only | `SignatureDrops.tsx` |
| Favorites | ABSENT | no schema/API |
| Rewards | DEFERRED | VISION / ROADMAP |

## KEEP

- Cart as purchase intent — no outlet/price/tax on cart rows; snapshot is payable truth (IMP-020/021, ARCH-G05, ARCH-G11).
- Guest XOR authenticated cart, revision concurrency, identical-config merge / distinct-config coexistence.
- Phone OTP + cookie session as the only customer identity authority (ARCH-G03/G04).
- Checkout Snapshot sealing of lines, modifiers, promotions, tax, fees, destination copy.
- Serviceability PIN coverage separate from delivery fee and from any ETA/capacity claim.
- Payment: browser callback is evidence only (D-361); in-panel INDETERMINATE/PROCESSING disables Pay.
- Order lifecycle D-357 projected — no fake kitchen states.
- Refund / FD / SignatureArtifact accepted authorities; customer sees issued PDFs fail-closed until signed.
- Static public frontend + `/api/v1/*` façade (D-356/D-359/D-360, ARCH-G01).

## FIX (not repaired by this pack)

| Finding | Class | Evidence | Future family |
|---|---|---|---|
| After successful sign-in, header still shows **Sign in** | PRODUCT_DEFECT | `Nav.tsx` never calls `fetchCustomerSession` | **A** UX Foundation |
| No Sign out in chrome | PRODUCT_DEFECT / UX | Sign out only on `/login` signed-in screen | **A** chrome entry; **F** My BOBA Sign Out |
| Guest cart not claimed until checkout | UX_DEFECT | `CheckoutClient` claim/reconcile; catalog/cart do not; policy BINDING VIA D-370 (implementation not authorized) | **D** Cart/session |
| Checkout remount does not restore payment recovery | UX_DEFECT | `readPaymentRecovery()` used on `/order/payment/`, not checkout remount | **E** Checkout/payment UX |
| Return page copy weaker than in-panel | UX_DEFECT | `PaymentReturnClient`: “Checking payment…” without don’t-pay-again | **E** |
| IMP-026C asked “Do not pay again.” Live copy is “Don't pay again yet.” | UX_DEFECT | `PaymentPanel.tsx`, `error-copy.ts` | **E** |
| Confirmation H1 always “Order confirmed” | UX_DEFECT | even if status is not PLACED | **E** |
| Order wait can pick newest order, not checkout-bound | UX_DEFECT | `waitForCustomerOrder` uses `items[0]` | **E** |
| Sealed modifiers on API, not rendered | UX_DEFECT | `CommerceOrderLine.modifiers` unused in confirmation/detail | **E** (history render; does not require C) |
| Privacy still describes off-site ordering | CONTENT | `src/app/privacy/page.tsx` | **A** |
| “Keep which cart?” copy where domain conflict is coupon-only | CONTENT / UX_DEFECT | `ReconcileConflictDialog.tsx`; `claim.ts` coupon KEEP_GUEST / KEEP_CUSTOMER | **D** |

## REDESIGN / MISSING / DEFER

See the matrix above. Highest-leverage **MISSING** customer capabilities: customization surface
(schema exists, live import empty), Order Again, My BOBA hub, Offers browse/coupon field, Profile
UI.

**DEFER:** Rewards/loyalty; Wear commerce; Culture commerce; cross-pillar BrandDrop engine;
Favorites / My Usual; customer self-service refunds; kitchen states / ETA / quantitative inventory;
COD/EMI/BNPL. Public Menu serving TARGET is now **D-368**; CURRENT delivery remains the static
catalog until an authorized future capability replaces it. D-368 does not implement the endpoint.

## Frontend → backend trace (compressed)

```text
HOME → static page → menu.json / hardcoded DROPS → no commerce service
MENU `/order` → static ordering-catalog.json (TRANSITIONAL CURRENT; TARGET D-368) → menu_entries for Cart identity
ADD TO CART → POST /api/v1/cart/lines → cart/operations.ts addCartLine
AUTH → /api/customer-auth/* → customer_auth_users / sessions
PROFILE API only → /api/v1/me/profile → customer_profiles → UI NONE
ADDRESSES → /api/v1/me/addresses → customer_addresses (UI list+create)
CHECKOUT → /api/v1/checkouts → checkout_snapshots
PAYMENT → /api/v1/payments + webhook inbox → payments / attempts
ORDER → GET /api/v1/orders[/:id] → orders bound to snapshot
FD → GET /api/v1/orders/:id/financial-documents → fail-closed until SIGNED
DROPS / OFFERS / FAVORITES / ORDER AGAIN / MY BOBA → static or ABSENT
```

## What can move without reopening accepted authority

**UX without domain change:** Home/nav/terminology, Menu layout, session-aware header, address-book
UI, payment recovery copy, confirmation/status projection, My Orders placement, Offers browse over
existing promotions, profile UI over `/api/v1/me/profile`.

**New capability or policy:** live modifier/bundle catalog content, Order Again application
operation, Favorites persistence, BrandDrop entity,
best-offer auto-application. Paid-default rule is **BINDING VIA D-369** (policy only;
customization implementation remains missing). Cart identity transition is **BINDING VIA D-370**
(policy only; merge implementation remains missing).

Provenance: read-only audit of `/home/ajoshi/repos/boba-bear-website-acceptance` at
`ddca0c319a5e80b2cfe38a2c32481b636277010e` on 2026-08-18. Working-tree fingerprint at audit time:
`ade017ac3c73bd1730b175e884a59c573baf4b098f297fdfc00cc24ab4179a75`.
