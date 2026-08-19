---
Status: FOUNDER_ACCEPTED
CANONICALIZED_AS: IMP-028A
Authority: SUPPORTING rationale/history — canonical product authority is docs/platform/capabilities/IMP-028A-food-direct-ux-foundation.md
Canonical vision: docs/platform/VISION.md
Canonical sequence: docs/platform/ROADMAP.md
Canonical accepted state: docs/platform/STATE.md
Canonical architecture: docs/platform/ARCHITECTURE.md
Canonical decisions: docs/platform/decision-register.md
Canonical capability: docs/platform/capabilities/IMP-028A-food-direct-ux-foundation.md
Planning lock: docs/platform/experience/food-direct-product-architecture-lock.md
Preserved: 2026-08-18
Canonicalized: 2026-08-18
Source checkpoint: HEAD ddca0c319a5e80b2cfe38a2c32481b636277010e
Governance at definition: VISION-1 / GTM-R33 / STATE-R31 / ARCH-R15 / DR-12
Governance at canonicalization: VISION-1 / GTM-R34 / STATE-R32 / ARCH-R15 / DR-12
Governance at implementation authorization: VISION-1 / GTM-R35 / STATE-R33 / ARCH-R15 / DR-12
Governance at implementation complete pending acceptance: VISION-1 / GTM-R36 / STATE-R34 / ARCH-R15 / DR-12
Governance at independent acceptance: VISION-1 / GTM-R37 / STATE-R35 / ARCH-R15 / DR-12
acceptedThrough: IMP-028A
currentProductSlice: NONE
pendingAcceptance: NONE
IMP-029: PLANNED / NOT_STARTED / NOT_AUTHORIZED
IMPLEMENTATION_AUTHORIZED: YES
IMPLEMENTATION_STARTED: YES
IMPLEMENTATION_COMPLETE: YES
INDEPENDENTLY_ACCEPTED: YES
NEXT_FREE_DECISION: D-371 (unused by this slice)
---

# Food Direct — Capability A: UX Foundation

```text
SLICE_NAME =
  FOOD_DIRECT_UX_FOUNDATION

FOUNDER_ACCEPTED =
  YES

CANONICALIZED_AS =
  IMP-028A

SLICE_STATUS =
  FOUNDER_ACCEPTED
  CANONICALIZED_AS = IMP-028A
  SUPPORTING RATIONALE RETAINED
  CANONICAL PRODUCT AUTHORITY =
    docs/platform/capabilities/IMP-028A-food-direct-ux-foundation.md
  IMPLEMENTATION COMPLETE
  INDEPENDENTLY_ACCEPTED

HARD_DEPENDENCY_D368 = NO
HARD_DEPENDENCY_D369 = NO
HARD_DEPENDENCY_D370 = NO
NEW_BACKEND_REQUIRED = NO
ROUTE_CHANGE_REQUIRED = NO
NEW_DECISION_REQUIRED = NO
D371_CREATED = NO
```

This artifact retains founder-accepted supporting rationale for Food Direct capability A. Canonical
product authority after GTM-R34 is
[`../../capabilities/IMP-028A-food-direct-ux-foundation.md`](../../capabilities/IMP-028A-food-direct-ux-foundation.md)
(`CANONICALIZED_AS = IMP-028A`). This supporting file does **not** start implementation or
create `D-371`.

Parent lock: [`../food-direct-product-architecture-lock.md`](../food-direct-product-architecture-lock.md).

Verified dependency (parent lock, not this slice): **B SHOULD_PRECEDE_FOR_BACKEND → C-UI**.
Capability A has **no** dependency on B or C implementation.

---

## 1. Purpose

Create a coherent, session-aware, responsive customer-commerce **shell** so a customer always
understands:

- where to browse Food (**Menu**);
- whether they are signed in;
- where their **Cart** is;
- where customer relationship features live (**My BOBA** concept);
- what terminology BOBA uses;
- how to move from brand discovery into commerce (**Order Now**).

This capability improves navigation and trust **without** changing underlying commerce authority
(Catalog, Pricing, Availability, Cart aggregate, Checkout Snapshot, Payment, Order, Refund,
Financial Document).

---

## 2. Customer problem

The accepted product already completes an owned Food order. The customer-facing shell does not
match that reality.

Verified current experience:

- Global chrome always says **Sign in** after a successful OTP session.
- Sign Out exists only on `/login` after the customer is already signed in.
- Marketing chrome and commerce chrome are two different products (`NAV_LINKS` vs
  `COMMERCE_NAV_LINKS`).
- Competing labels (**Order** / **Order now** / **Orders** / **Menu**) describe overlapping
  concepts.
- There is no global Cart entry outside `/order`.
- Home Hero still converts toward Access Drop / in-page marketing menu, while `/order` is the
  live catalog.
- Privacy copy still describes ordering as off-site Zomato / Swiggy / WhatsApp.

The customer cannot tell, from the shell, that BOBA Direct is the owned commerce experience.

---

## 3. Exact in-scope

Capability A **may** change only customer-facing chrome, terminology, Home shell/discovery
conversion, stale Direct-contradicting copy, and session-aware presentation over **existing**
client APIs.

| In-scope work | Boundary |
|---|---|
| Unify global navigation into one Food Direct chrome | Same `Nav` on Home, `/login`, `/privacy`, and `/order*` |
| Session-aware chrome via existing `fetchCustomerSession` | No auth-domain change |
| Customer-accessible Sign Out in chrome via existing `signOutCustomer` | Invokes IMP-009 operation only; does **not** implement D-370 Cart isolation |
| Terminology lock on customer-facing labels | Route paths unchanged |
| Home shell: BOBA identity + Food-first **Order Now** → current Menu (`/order`) | Editorial/campaign sections may remain; no D-368 projection |
| Stop treating Home `#bar` / `menu.json` as the customer **Menu** destination | Marketing chapters may remain editorial/non-orderable |
| Global Cart **entry** to `/order/cart/` | No invented count badge |
| Preserve accepted IMP-026C mobile sticky Cart on ordering surfaces | Do not replace Cart domain behavior |
| My BOBA **concept** in logged-in chrome | No hub, Profile, Rewards, Favorites, or Order Again |
| Drops as static campaign destination (`/#drops`) | Not BrandDrop authority |
| Omit Offers from primary nav | No fake Offers store |
| Remove Wear/Culture (`Merch`, `Artists`) from **primary** nav | Home editorial teasers may remain |
| Correct customer-facing copy that claims ordering happens off-site | Privacy + equivalent on-page SEO/copy; not a legal-policy rewrite |
| Responsive global chrome at supported widths | No Menu/product transaction redesign |
| Accessibility of chrome (keyboard, focus, semantic nav, loading state) | No new compliance certification |

---

## 4. Exact non-goals

Capability A **must not** include:

```text
D-368 Menu API / read projection implementation
Menu category redesign
product-card redesign (ordering catalog cards)
Food customization / Customize surface
modifier content / import
D-369 enforcement
D-370 Cart reconciliation / logout Cart isolation
payment recovery
checkout changes
confirmation changes
Saved Address CRUD redesign
full My BOBA hub
Order Again
Favorites
My Usual
Rewards
Offers engine changes
Offers customer browse page
real BrandDrop commerce
Wear commerce
Culture commerce
new authentication method
new customer identity model
new DB schema
new migration
route-path rename for aesthetics
new customer HTTP resource
fake primary-nav destinations
count badge without a trustworthy chrome-wide data source
```

Sign Out in A is **chrome invocation of the existing IMP-009 operation**. It is not D-370
implementation. Acceptance of A must not claim D-370 is implemented.

---

## 5. Current defect inventory

Inspection of `/home/ajoshi/repos/boba-bear-website-acceptance` at
`ddca0c319a5e80b2cfe38a2c32481b636277010e` (working tree present; product source not modified by
this task).

| ID | Issue | Classification | Status | Evidence |
|---|---|---|---|---|
| **A1** | Global Nav remains “Sign in” after successful OTP/session | PRODUCT_DEFECT | **CONFIRMED** | `src/components/Nav.tsx` hardcodes `href="/login"` + label `Sign in` (desktop ~L297–307, mobile drawer ~L494–504). `fetchCustomerSession` is **not** imported or called. Session **is** used by `CustomerLoginClient`, `CheckoutClient`, `CartClient`, `OrderHistoryClient`, `OrderDetailClient`, `OrderConfirmationClient`, `PaymentReturnClient`. |
| **A2** | No customer Sign Out affordance in global shell | PRODUCT_DEFECT | **CONFIRMED** | Sign Out exists only on `/login` signed-in screen (`CustomerLoginClient.tsx` `handleSignOut` → `signOutCustomer()`, ~L269–312). `Nav.tsx` has no Sign Out control. |
| **A3** | Competing terminology: Order / Order now / Orders / Menu | CONTENT_TERMINOLOGY | **CONFIRMED** | Marketing nav label `Order` → `/order` (`Nav.tsx` `NAV_LINKS`). Commerce nav `Menu` → `/order` and `Orders` → `/order/orders/`. Right-slot also always shows `Orders` + `Order now`. `/order` metadata title `"Order"`; H1 `"Order with Boba Bear"` (`src/app/order/page.tsx`, `OrderingCatalogClient.tsx`). History H1 `"Your orders"` (`OrderHistoryClient.tsx`). |
| **A4** | No coherent global Cart affordance | PRODUCT_DEFECT | **CONFIRMED** | `Nav.tsx` has no Cart link. Cart entry exists on `/order` page header (`hidden md:inline-flex`) and IMP-026C `StickyCartBar` (`md:hidden`, non-empty only). `/login`, `/`, `/privacy` have no Cart chrome. |
| **A5** | Home and customer-commerce shell feel like separate experiences / dual chrome | PRODUCT_DEFECT | **CONFIRMED** | `Nav.tsx` `onCommerceRoute = pathname.startsWith("/order")` swaps `NAV_LINKS` (Drops / Menu `#bar` / Merch / Artists / Order) vs `COMMERCE_NAV_LINKS` (Home / Menu / Orders). Layout still mounts the same `Ticker` + `Nav` + `Footer` (`src/app/layout.tsx`). |
| **A6** | Privacy / customer-facing copy still describes off-site ordering | CONTENT_TERMINOLOGY / PRODUCT_DEFECT | **CONFIRMED** | `src/app/privacy/page.tsx` heading “Ordering on Zomato, Swiggy & WhatsApp” (~L113–120) and file comment (~L4–8). Hero sr-only: “Order on Zomato, Swiggy or WhatsApp.” (`Hero.tsx` ~L175–178). JSON-LD `potentialAction.OrderAction` targets WhatsApp (`layout.tsx` ~L142–151); `hasMenu` is `${SITE_URL}/#bar`. |
| **A7** | Responsive global-header crowding / overlap risk | PRODUCT_DEFECT | **CONFIRMED** | Mobile header (`lg:hidden`, i.e. &lt;1024px): hamburger + theme (32px) left, absolutely centered wordmark, `Button size="sm"` (`h-8`) “Order now” right, bar `h-14` (`Nav.tsx` ~L317–365). Centered logo can overlap side groups at narrow widths. Nav mobile breakpoint (`lg` / 1024) differs from IMP-026C sticky-cart `md` / 768 — preserve sticky cart; do not invent a second transaction-control breakpoint. |

Related findings **not** claimed as A defects to repair:

| Finding | Status | Why |
|---|---|---|
| Guest→customer Cart merge only at Checkout | **PRE_EXISTING_BUT_OUT_OF_SCOPE** | Family D / D-370 |
| “Keep which cart?” coupon-conflict copy | **PRE_EXISTING_BUT_OUT_OF_SCOPE** | Family D |
| Payment remount recovery / confirmation copy | **PRE_EXISTING_BUT_OUT_OF_SCOPE** | Family E |
| Home `TheBar` / `ThePlates` / `TheSweet` hardcoded `menu.json` prices as editorial | **PRE_EXISTING_BUT_OUT_OF_SCOPE** for card redesign; **in-scope** only to stop treating them as the Menu destination | Family B owns catalog/card redesign; A owns destination/CTA |
| Offers customer page missing | **PRE_EXISTING_BUT_OUT_OF_SCOPE** | Family H |
| Profile / address-book hub missing | **PRE_EXISTING_BUT_OUT_OF_SCOPE** | Family F |
| Sticky cart on `/order` | **SUPERSEDED** as an A defect | Accepted IMP-026C; A preserves it |

---

## 6. Authority reuse

No new domain authority. Target: **NEW_BACKEND_REQUIRED = NONE**.

| Target | Reuse | Class |
|---|---|---|
| Customer authentication / session | IMP-009; `GET /api/customer-auth/session`; `src/lib/customer-auth/client.ts` `fetchCustomerSession` | **EXISTING_API** / **MINOR_CLIENT_INTEGRATION** |
| Sign Out | IMP-009; `POST /api/customer-auth/sign-out`; `signOutCustomer()` | **EXISTING_API** / **MINOR_CLIENT_INTEGRATION** |
| Sign In destination | `/login` `CustomerLoginClient` (accepted) | **UX_ONLY** (chrome link) |
| Cart navigation | `/order/cart/`; IMP-020 Cart; IMP-025/026C `CartClient` | **UX_ONLY** for chrome entry |
| Cart count in chrome | `getActiveCart` exists, but guest XOR customer identity is unresolved until D-370; Home/privacy do not currently load Cart | **Do not render a count badge in A** |
| Menu destination | Current `/order` static `ordering-catalog.json` (IMP-025 TRANSITIONAL CURRENT) | **UX_ONLY** (label + nav target) |
| My Orders destination | `/order/orders/`; `GET /api/v1/orders`; IMP-023 | **UX_ONLY** (label + placement under My BOBA) |
| Display name “Hi \<first name\>” | Session contract is `{ authenticated, user: { id } }` only (`src/shared/customer-auth/contracts.ts`). Profile `givenName` exists on optional IMP-017 `/api/v1/me/profile`, not on session, and is not guaranteed to exist after OTP. | **Do not use in A** (would be extra profile fetch + missing-profile fallback). Family F. |
| Drops | Home `SignatureDrops` `id="drops"` | **UX_ONLY** (hash destination) |
| Offers | IMP-016 engine exists; no customer page | **DEFER** — omit from primary nav |
| Privacy copy | Static page | **UX_ONLY** / CONTENT |

Classification notes:

- Session-aware chrome is **not** UX_ONLY: it must call the existing session API. It is **not** a
  new backend.
- Sign Out in chrome is **not** D-370. D-370 logout isolation (browser loses Cart authority;
  customer Cart not deleted; Customer B must not receive Customer A’s Cart) remains family D.
- ARCH-G01 / D-356 / D-359 / D-360 remain: static public frontend + `/api/v1/*` and
  `/api/customer-auth/*`. No Route Handlers.

---

## 7. Routes / surfaces

**ROUTE_CHANGE = NONE.** Do not rename paths for aesthetics. Customer-facing labels are independent
of path.

| Path | Current customer label / role | A target label / role | Change |
|---|---|---|---|
| `/` | Home / brand issue | Home: brand discovery + campaign + conversion entry | Shell/CTA only |
| `/order` | Title “Order”; H1 “Order with Boba Bear” | Customer label **Menu**; conversion CTA **Order Now** still targets this path | Labels |
| `/order/cart/` | Cart page | **Cart** | Global entry added; page behavior unchanged |
| `/order/orders/` | Nav “Orders”; H1 “Your orders” | **My Orders** | Labels + chrome placement |
| `/order/orders/detail/` | Order detail | Unchanged path; not a primary-nav item | NO_CHANGE_EXPECTED for A chrome |
| `/order/checkout/` | Checkout | Unchanged | NO_CHANGE_EXPECTED |
| `/order/payment/` | Payment return | Unchanged | NO_CHANGE_EXPECTED |
| `/order/confirmation/` | Confirmation | Unchanged | NO_CHANGE_EXPECTED |
| `/login` | Sign In | **Sign In** | Keep; Sign Out remains available here **and** in chrome |
| `/privacy` | Privacy Policy | Same route; Direct-accurate copy | Copy |
| `/workforce/login` | Workforce | Out of customer chrome | NO_CHANGE_EXPECTED |
| **no** `/my-boba` | Missing | **Do not add in A** | ROUTE_CHANGE = NONE |
| **no** `/offers` | Missing | **Do not add in A** | omit from nav |
| **no** `/drops` | Home hash `#drops` | Keep hash; no fake Drop store | STATIC_CAMPAIGN_DESTINATION |

Surfaces A is expected to touch: `Nav`, Home Hero/conversion, Privacy copy, catalog/history
customer-facing titles, AccessCTA primary CTA label. Surfaces A must not redesign: ordering
product rows, StickyCartBar behavior, Checkout/Payment/Confirmation, Cart domain.

---

## 8. UX behavior

### 8.1 First-slice primary navigation (repository-grounded)

Ideal lock chrome includes Offers and “Hi \<customer\>”. First-slice **must not invent dead
destinations** or display names the session does not expose.

**Logged out**

```text
Menu | Drops | Sign In | Cart
[+ Order Now conversion CTA]
```

**Logged in**

```text
Menu | Drops | My BOBA | Cart
[+ Order Now conversion CTA]
```

| Item | First-slice representation | Class |
|---|---|---|
| **Menu** | Real destination `/order` | REAL_DESTINATION |
| **Drops** | `/#drops` (Home `SignatureDrops`; from other routes `/%23` is unnecessary — existing pattern is `/#drops`) | STATIC_CAMPAIGN_DESTINATION |
| **Offers** | **Omit** from primary nav | MISSING_CAPABILITY / DEFER_FROM_PRIMARY_NAV (family H) |
| **Sign In** | `/login` when anonymous | REAL_DESTINATION |
| **My BOBA** | Accessible disclosure/menu in chrome (not a new route): **My Orders** → `/order/orders/`; **Sign Out** → `signOutCustomer()` | Concept for later F; no hub |
| **Cart** | `/order/cart/` always, empty or not | REAL_DESTINATION; **no count badge** |
| **Order Now** | CTA, not a peer catalog name; `/order` | REAL_DESTINATION |
| **Merch / Artists** | Remove from primary nav | DEFER Wear/Culture; Home teasers may remain |

Do not keep marketing `Order` as a peer of `Menu`. Do not keep `Orders` as a peer of `Menu`.

### 8.2 Session-aware chrome

Required outcomes:

```text
logged out            → Sign In visible; My BOBA / Sign Out not presented as authenticated
successful OTP        → chrome reflects authenticated state without full browser restart
logged in             → My BOBA affordance (disclosure with My Orders + Sign Out)
sign out              → chrome immediately returns to anonymous (Sign In)
```

Implementation class: **UX + EXISTING API INTEGRATION**.

Session source: `GET /api/customer-auth/session` via `fetchCustomerSession()`. Authenticated body
is `{ authenticated: true, user: { id } }` only. Treat `user.id` as opaque (ARCH-G03); never
display it.

Loading: while session is unknown, do not flash a **wrong customer** identity. Anonymous-safe
pending chrome is allowed (Sign In may appear until session resolves). Do not show My BOBA until
`authenticated === true` is verified.

After Sign Out, call existing `signOutCustomer()` then set chrome to anonymous. Do not claim the
guest/customer Cart was isolated (D-370 / family D).

### 8.3 My BOBA placeholder (recommendation)

Full hub is family F. Safest A behavior from repository evidence:

**Recommended: Option C + bounded disclosure (not a new route).**

- Do **not** create `/my-boba` / `/account`.
- Do **not** link My BOBA solely to My Orders (that hides Sign Out and overloads history as the
  account).
- Logged-in label: **My BOBA** (not “Hi \<first name\>”).
- Control opens an accessible menu: My Orders, Sign Out.
- No Profile / Saved Addresses / Rewards / Favorites / Order Again.

This establishes the global identity concept F will later host.

### 8.4 Home boundary

Home role: **brand discovery + current campaign + conversion entry**. Not a second sellable
catalog.

Minimum A target:

- Clear BOBA identity (existing wordmark / Hero may stay).
- Primary Food conversion CTA labeled **Order Now** → `/order`.
- Coherent chrome (same nav model as commerce routes).
- No contradictory ordering terminology in chrome/CTAs.

Hero today: primary “Access Drop” → `#access`; secondary “Explore Menu” → `#bar` (`Hero.tsx`).
A should make **Order Now → `/order`** the primary commerce CTA. Access/campaign may remain
secondary. Aggregator doors in `AccessCTA` may remain as **secondary** channels (VISION: aggregators
continue); they must not be presented as the primary Direct order path. Relabel AccessCTA primary
control **Order Now** (currently “Order with Boba Bear”).

`TheBar` / `ThePlates` / `TheSweet` + `src/data/menu.json` remain editorial/non-orderable in A.
They must not be the primary **Menu** destination. Card/price redesign is family B, not A.

Do **not** implement D-368 Menu projection.

### 8.5 Global Cart

- Desktop chrome: Cart link to `/order/cart/`.
- Mobile: Cart in the existing drawer (header already crowded — A7). Do not replace IMP-026C
  sticky Cart on `/order`.
- Empty Cart: still a real destination (existing empty-cart copy on `CartClient`).
- Count badge: **not in A**. Trustworthy count exists on `/order` because that page already
  loaded Cart. Global chrome-wide count would call `getActiveCart` on every surface and would mix
  guest vs customer identity until D-370. That is not a trustworthy first-slice badge.

### 8.6 Privacy / stale copy

Correct customer-facing claims that ordering happens only off-site. In scope:

- Privacy section currently titled around Zomato / Swiggy / WhatsApp.
- Hero sr-only aggregator-as-primary-order copy.
- JSON-LD `OrderAction` / `hasMenu` if they still assert WhatsApp / `#bar` as the order/menu
  action (copy/schema alignment with Direct; not a new privacy statute).

Out of scope: customer deletion/retention policy (OQ-005), new legal framework, Terms page.

### 8.7 Responsive / accessibility

Preserve IMP-026C:

- supported mobile widths below Tailwind `md` (768px) on ordering surfaces;
- no horizontal overflow of **transaction** controls;
- sticky Cart when `itemCount > 0` on `/order` (`StickyCartBar.tsx`).

A may improve global chrome responsiveness (A7 overlap of centered logo vs Order Now). Do not
redesign Menu/product transaction components (family B/C).

Candidate chrome a11y (project conventions already in `Nav.tsx` drawer: Escape, focus trap,
`aria-expanded`, `role="dialog"`):

- keyboard access to Sign In / My BOBA / Cart / Menu / Drops / Order Now;
- visible focus (`focus-ring`);
- semantic `nav` with stable accessible names;
- accessible open/close for My BOBA disclosure and mobile drawer;
- usable tap targets for chrome controls (avoid `Button size="sm"` / `h-8` as the only Cart or
  Sign In hit target on supported mobile);
- session loading must not expose another customer’s identity.

No formal WCAG certification is required.

---

## 9. Acceptance-outcome candidates

Not numbered as final ACs. Objectively testable. A passing A **must not** be read as D-370 / D-368
/ D-369 done.

1. Logged-out customer sees chrome **Sign In** (and not My BOBA as an authenticated identity).
2. After successful OTP on `/login` (with or without `returnTo`), global chrome reflects
   authenticated state **without** a full browser restart; stale “Sign in” is gone.
3. Authenticated customer can Sign Out from global chrome (My BOBA disclosure or equivalent),
   not only by rediscovering `/login`.
4. After Sign Out, chrome returns to anonymous (Sign In visible; My BOBA authenticated state
   gone) on the same page load / next paint of chrome.
5. Primary Food catalog destination is labeled **Menu** and goes to current `/order`.
6. Home primary commerce CTA is labeled **Order Now** and reaches `/order`.
7. Historical purchase destination is labeled **My Orders** (not a peer named “Orders”) and goes
   to `/order/orders/`.
8. Cart has a consistent global entry to `/order/cart/` on desktop chrome and in mobile
   navigation; empty Cart is still a real destination.
9. No dead primary-nav destination: no Offers, no Wear/Culture commerce dest, no fake My BOBA
   hub, no Drops store pretending inventory/checkout authority.
10. Supported mobile viewport: navigation usable without horizontal overflow of chrome/transaction
    controls; IMP-026C sticky Cart on `/order` still appears when the Cart is non-empty.
11. Privacy and equivalent customer-facing copy no longer claim that placing an order happens
    off-site on Zomato / Swiggy / WhatsApp as the current model.
12. No Pricing / Cart aggregate / Checkout Snapshot / Payment / Order / Refund / Financial
    Document authority, schema, or migration changes. D-368 / D-369 / D-370 remain unimplemented.

Negative: A does not require a Cart count badge, “Hi \<name\>”, Offers nav, or `/my-boba` route.

---

## 10. Test strategy

Do **not** implement tests in this task. Candidate layers for a later authorized implementation:

### UNIT / COMPONENT

- Session-aware Nav: unauthenticated / authenticated / pending / after sign-out.
- My BOBA disclosure open/close, keyboard, Escape, `aria-expanded`.
- Terminology rendering: Menu, Order Now, My Orders, Sign In, Cart, My BOBA.
- Mobile drawer includes Cart and does not include Offers / Merch / Artists as live commerce.
- Mock `fetchCustomerSession` / `signOutCustomer` (no real OTP).

### INTEGRATION

- Sign-in session cookie → chrome authenticated (client + stubbed or real `/api/customer-auth/session`).
- Sign-out POST → chrome anonymous.
- Order Now / Menu → `/order`.
- Cart chrome → `/order/cart/`.
- My Orders → `/order/orders/` (existing auth redirect if logged out remains).

Real backend/session required where cookie round-trip is the point (customer-auth service). Chrome
unit tests should mock the client façade.

### E2E

- Logged-out desktop: Home → Order Now → Menu (`/order`); chrome Sign In + Cart + Menu + Drops.
- Logged-in desktop: OTP success → chrome My BOBA (not Sign In); My Orders reachable; Sign Out
  returns Sign In.
- Mobile supported viewport: drawer usable; no dead Offers; no horizontal overflow of chrome.
- Sticky cart regression on `/order` after add-to-cart (existing IMP-026C e2e).

### REGRESSION

- IMP-026C sticky Cart still works (`tests/e2e/customer-ordering.spec.ts` / catalog component
  tests).
- Existing ordering flow still reachable: `/order` → cart → checkout → pay.
- Customer-auth e2e (`tests/e2e/customer-auth.spec.ts`) still passes; extend for chrome, do not
  weaken OTP contracts.
- Workforce login chrome unchanged.

---

## 11. Likely implementation inventory

Read-only classification. Do not edit in this task.

| Path | Class | Why |
|---|---|---|
| `src/components/Nav.tsx` | **EXPECTED_CHANGE** | Dual chrome, session-blind Sign in, no Cart, no Sign Out, terminology, A7 |
| `src/components/Hero.tsx` | **EXPECTED_CHANGE** | Order Now CTA; sr-only aggregator-as-order copy |
| `src/components/AccessCTA.tsx` | **EXPECTED_CHANGE** | Primary CTA label Order Now; aggregators remain secondary |
| `src/app/privacy/page.tsx` | **EXPECTED_CHANGE** | Off-site ordering section |
| `src/app/layout.tsx` | **POSSIBLE_CHANGE** | JSON-LD `hasMenu` / `OrderAction` still aggregator/hash |
| `src/app/page.tsx` | **POSSIBLE_CHANGE** | Only if Home composition must change for shell/CTA; prefer Hero/AccessCTA |
| `src/app/order/page.tsx` | **EXPECTED_CHANGE** | Metadata title currently “Order” |
| `src/components/ordering/OrderingCatalogClient.tsx` | **EXPECTED_CHANGE** | Customer H1/copy “Order with Boba Bear” → Menu terminology; **do not** redesign cards/Add/sticky cart |
| `src/components/ordering/OrderHistoryClient.tsx` | **EXPECTED_CHANGE** | “Your orders” / “Orders” → My Orders |
| `src/app/order/orders/page.tsx` | **EXPECTED_CHANGE** | Metadata “Your orders” |
| `src/components/Footer.tsx` | **POSSIBLE_CHANGE** | “The Menu” chapter hashes vs `/order`; not primary nav |
| `src/components/Ticker.tsx` | **NO_CHANGE_EXPECTED** | Brand strip |
| `src/components/TheBar.tsx` / `ThePlates.tsx` / `TheSweet.tsx` / `MenuCard.tsx` | **NO_CHANGE_EXPECTED** | Editorial; not A card redesign |
| `src/components/SignatureDrops.tsx` | **NO_CHANGE_EXPECTED** | Static campaign; nav points at `#drops` |
| `src/components/MerchDrop.tsx` / `Artists.tsx` | **NO_CHANGE_EXPECTED** | Remove from primary nav only |
| `src/components/ordering/StickyCartBar.tsx` | **NO_CHANGE_EXPECTED** | Preserve IMP-026C |
| `src/components/ordering/CartClient.tsx` | **NO_CHANGE_EXPECTED** | Cart domain/page |
| `src/lib/customer-auth/client.ts` | **NO_CHANGE_EXPECTED** | Reuse as-is |
| `src/shared/customer-auth/contracts.ts` | **NO_CHANGE_EXPECTED** | Session still id-only |
| `src/lib/customer-commerce/cart.ts` | **NO_CHANGE_EXPECTED** | No global count in A |
| `src/app/login/CustomerLoginClient.tsx` | **POSSIBLE_CHANGE** | Keep Sign Out here; chrome must also sign out |
| `src/components/Nav.test.tsx` (new) | **EXPECTED_CHANGE** (new test file when implemented) | Session/terminology |
| `tests/e2e/customer-auth.spec.ts` | **EXPECTED_CHANGE** when implemented | Chrome after OTP / sign out |
| `tests/e2e/customer-ordering.spec.ts` | **POSSIBLE_CHANGE** when implemented | Sticky cart regression; nav labels |
| `src/server/**` | **NO_CHANGE_EXPECTED** | |
| `drizzle/**` | **NO_CHANGE_EXPECTED** | |

---

## 12. Dependencies

```text
HARD dependency on D-368 implementation = NO
HARD dependency on D-369 implementation = NO
HARD dependency on D-370 implementation = NO

A SHOULD_PRECEDE_FOR_UX:
  B Menu projection / discovery
  D Cart / session (D-370)
  E Checkout / payment UX
  F My BOBA Foundation   (HARD from A → F in the parent lock)

A is NOT responsible for B, C, D, E, or F implementation.
A has no dependency on B or C implementation.
B SHOULD_PRECEDE_FOR_BACKEND → C-UI (parent lock; not an A dependency).
```

IMP-029 remains Operations Console API, `PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`. This slice
does not retarget it.

---

## 13. Risks

| Area | Rating | Note |
|---|---|---|
| AUTH_SESSION | **MEDIUM** | Must integrate existing session without changing IMP-009; avoid identity flicker; static-export client fetch only |
| ROUTING | **LOW** | No path renames |
| RESPONSIVE | **MEDIUM** | A7 header crowding; Nav uses `lg` while sticky cart uses `md`; must not break IMP-026C |
| REGRESSION | **MEDIUM** | Ordering journey and customer-auth e2e must remain green |
| BACKEND | **LOW** | None expected |

Split further only if implementation tries to (a) fetch Profile for greeting, (b) globalize Cart
count under unresolved D-370 identity, or (c) rebuild Home food chapters as a live catalog.
Those would be out of A, not a reason to split A’s chrome/copy core.

Default: **keep A as one coherent slice**.

---

## 14. Size

**SIZE = SMALL**

Chrome + terminology + Home conversion CTA + Privacy/stale copy + session client integration.
No schema, no new API, no Menu projection, no Cart merge.

Scope creep to MEDIUM if Home `menu.json` chapters are rewritten as a second catalog. That rewrite
is **out of A**.

---

## 15. Unresolved questions

Do not manufacture questions. None require `D-371`.

| Question | Recommendation locked for this slice | Class |
|---|---|---|
| Logged-in chrome: “Hi \<first name\>” vs “My BOBA” | Use **My BOBA**. Session has no display-safe name (`user.id` only). Profile `givenName` is optional and not on the session contract. | **CAN_DECIDE_DURING_IMPLEMENTATION** (default above). “Hi \<name\>” → **DEFER_TO_FUTURE_CAPABILITY** (F) |
| My BOBA destination before hub exists | No new route; disclosure with My Orders + Sign Out | **CAN_DECIDE_DURING_IMPLEMENTATION** (default above). Hub → **DEFER_TO_FUTURE_CAPABILITY** (F) |
| Offers / Drops in first primary nav | Drops = `/#drops` static campaign. Offers = **omit** | **CAN_DECIDE_DURING_IMPLEMENTATION** (default above). Offers page → **DEFER_TO_FUTURE_CAPABILITY** (H) |
| Session display-safe name? | **No** on current session API | Not an activation blocker if My BOBA is used |
| Cart count in chrome? | **No badge** in A | **CAN_DECIDE_DURING_IMPLEMENTATION** (default above). Trustworthy global count → **DEFER_TO_FUTURE_CAPABILITY** (D, after D-370) |

**BLOCKS_ACTIVATION = none.**

No architectural gap requiring `D-371`. Parent lock already recorded `BLOCKS_FIRST_SLICE = none`.

---

## 16. Readiness recommendation

```text
FOUNDER_ACCEPTED = YES
CANONICALIZED_AS = IMP-028A
READY_FOR_FOUNDER_REVIEW = YES
READY_FOR_CANONICAL_ACTIVATION = YES (completed; canonical authority is IMP-028A)
IMPLEMENTATION_AUTHORIZED = YES
IMPLEMENTATION_STARTED = YES
IMPLEMENTATION_COMPLETE = YES
INDEPENDENTLY_ACCEPTED = YES
SPLIT_REQUIRED = NO
NEW_DECISION_REQUIRED = NO
```

Capability A is canonicalized as **IMP-028A — Food Direct UX Foundation**. Implementation is
**complete pending independent acceptance**. Formal acceptance is **not** claimed.

---

## Provenance

Read-only inspection of:

- `src/components/Nav.tsx`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/privacy/page.tsx`
- `src/components/Hero.tsx`, `Ticker.tsx`, `Footer.tsx`, `AccessCTA.tsx`, `SignatureDrops.tsx`
- `src/app/login/CustomerLoginClient.tsx`, `src/lib/customer-auth/client.ts`,
  `src/shared/customer-auth/contracts.ts`
- `src/app/order/**`, `OrderingCatalogClient.tsx`, `StickyCartBar.tsx`, `CartClient.tsx`,
  `OrderHistoryClient.tsx`
- IMP-009 session/sign-out; IMP-024 façade; IMP-025 ordering UX; IMP-026C sticky cart / mobile
- Supporting experience pack + founder-approved Food Direct product-architecture lock

Checkpoint: `/home/ajoshi/repos/boba-bear-website-acceptance` at
`ddca0c319a5e80b2cfe38a2c32481b636277010e` on 2026-08-18.

```text
PRODUCT_SLICE_ACTIVATED = YES (IMP-028A COMPLETE_AND_ACCEPTED; currentProductSlice NONE)
CANONICALIZED_AS = IMP-028A
IMP029_STARTED = NO
IMP029_RETARGETED = NO
D371_CREATED = NO
FOOD_DIRECT_IMPLEMENTATION_AUTHORIZED = NO
IMP-028A_IMPLEMENTATION_AUTHORIZED = YES
IMP-028A_IMPLEMENTATION_STARTED = YES
IMP-028A_IMPLEMENTATION_COMPLETE = YES
IMP-028A_ACCEPTED = YES
```
