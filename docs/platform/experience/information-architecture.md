---
Status: SUPPORTING PRODUCT / EXPERIENCE MATERIAL
Authority: NONE — working information architecture, not CURRENT route/transport authority
Canonical transport: D-356 / D-359 / IMP-024
Preserved: 2026-08-18
---

# Working information architecture

**SUPPORTING.** This records the working Home / Menu / navigation / My BOBA / discovery layout.
Transport topology remains D-356 / D-359. This pack does not add Next.js Route Handlers, SSR, or
implement a Menu endpoint. Customer Menu serving TARGET is later binding via **D-368** (server-backed
READ PROJECTION). CURRENT delivery remains IMP-025 static `ordering-catalog.json`. Layout in this
document remains WORKING.

## Home vs Menu

| Surface | Working role |
|---|---|
| **Home** | brand discovery + appetite + campaign + conversion entry |
| **Menu** | primary Food commerce discovery/catalog surface |

Home should **not** duplicate the full ordering catalog.

Current collision (audit 2026-08-18): `/` already has a marketing menu (`TheBar` / `ThePlates` /
`TheSweet` + `src/data/menu.json` with hardcoded prices) **and** `/order` is the live catalog from
`ordering-catalog.json`. Target: editorial/campaign on Home; sellable catalog only on Menu.

## Working global navigation

### Logged out

```text
Menu | Drops | Offers | Sign In | Cart
```

### Logged in

```text
Menu | Drops | Offers | Hi <customer> / My BOBA | Cart
```

Sign Out lives inside My BOBA, not as a competing global destination.

Current chrome (`src/components/Nav.tsx`):

- Marketing: Drops / Menu (`#bar`) / Merch / Artists / Order
- Commerce: Home / Menu / Orders
- Always “Sign in” (session never read in Nav)
- No global Cart in marketing nav; commerce uses header Cart / mobile `StickyCartBar` on `/order`

Disposition: **REDESIGN** + session **FIX**. Offers destination is currently **MISSING** (family H;
not Food Direct MVP). Drops exist as a Home hash teaser, not a commerce entity. UX Foundation may
redesign static Drop presentation on Home without creating BrandDrop authority. Do not ship Offers
or Wear/Culture as fake live destinations in the first chrome slice. See
[`food-direct-product-architecture-lock.md`](./food-direct-product-architecture-lock.md).

## My BOBA working hierarchy

Full working tree (relationship north star; not all MVP):

```text
My BOBA
├── Order Again          ← later capability G; not initial Foundation
├── My Orders
├── Saved Addresses
├── Favorites            ← defer (family J)
├── Rewards              ← defer / VISION V1 non-goal
├── Profile
└── Sign Out
```

**Initial My BOBA Foundation** (Food Direct MVP; planning lock §11):

```text
My BOBA
├── Active Order
├── My Orders
├── Saved Addresses
├── Profile
└── Sign Out
```

Working priority for the relationship surface:

1. Active Order
2. Order Again (later; not initial Foundation)
3. My Orders
4. Saved Addresses
5. Favorites (defer)
6. Rewards (defer)
7. Profile / preferences

Only capabilities currently supported by repository facts should be described as existing:

| Item | Repository fact (2026-08-18) | Working status |
|---|---|---|
| Active Order | Order list/detail exist; no hub “active” split | KEEP fragments; REDESIGN placement |
| Order Again | Absent as operation | MISSING |
| My Orders | `/order/orders/` list + detail + financial PDFs | KEEP capability; REDESIGN name/placement |
| Saved Addresses | Full CRUD API; checkout partial UI | REDESIGN book UI |
| Favorites | No schema/API/UI | DEFER |
| Rewards | VISION/ROADMAP deferred; `marketingOptIn` forbidden | DEFER |
| Profile | `/api/v1/me/profile` exists; no customer UI | MISSING UI |
| Sign Out | Only on `/login` signed-in screen | FIX chrome |

My BOBA = relationship + commerce convenience. It is **not** a profile-settings-first
administration portal.

## Menu discovery layout

Working visual candidate (historical planning; **not** first-B product law):

### Target desktop

```text
sticky categories
+ product content area
+ persistent Cart
```

### Target mobile

```text
sticky / horizontal categories
+ product feed
+ persistent bottom Cart state
```

The bounded Capability B definition persists the **category-navigation outcome** (customers can
navigate canonical Menu sections directly) and does **not** lock sticky vs non-sticky, horizontal
vs vertical, exact animation, exact layout, or breakpoint behavior.
See [`slices/customer-menu-projection-and-discovery.md`](./slices/customer-menu-projection-and-discovery.md)
(`SUPPORTING`; `CANONICALIZED_AS = IMP-028B`) and
[`../capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](../capabilities/IMP-028B-customer-menu-projection-and-discovery.md).

Current: `/order` is a long page stacking all `menu_sections` headings. Mobile already has
`StickyCartBar` on `/order` only. Desktop uses a header Cart CTA, not a persistent tray. No sticky
category rail.

Disposition: **REDESIGN** (layout). `menu_sections` already exist (`schema/menu.ts`); no new
category domain is required for current data. Visual discovery and D-368 serving are **one family
B** in the planning lock; B acceptance requires projection serving, not long-term static catalog
serving.

## Working discovery categories

Examples discussed (not a locked taxonomy; not schema enums):

```text
Most Ordered
Boba
Burgers
Wraps
Refreshers
Sides
Combos
```

**Most Ordered** must eventually be based on real commerce evidence if presented as a factual
popularity claim. A decorative “popular” label without evidence is a content defect.

## Product-card grammar

```text
image
product name
short sensory description
display / current price
limited useful tags
Add or Customize CTA
```

Internal SKU / modifier terminology must not leak into customer presentation.

Current `/order` cards are add/qty rows; tags unused; availability not shown. Disposition:
**REDESIGN**.

First bounded Capability B may project image, effective display name, customer description, display
price, and category from existing legitimate authorities. `new` / `signature` / `bestseller` tags
and Customize CTA remain outside first B unless already legitimate non-ranking display content.
See [`slices/customer-menu-projection-and-discovery.md`](./slices/customer-menu-projection-and-discovery.md).

## Customization surface (IA, not schema)

Working UX model:

```text
MenuItem
→ Food Modifier Groups
→ Options
```

Conceptual UX group types discussed: SIZE, SWEETNESS, ICE, EXTRAS, REMOVALS.

Those names are **not** new schema enums. Do not add typed group kinds without a later decision.
See [`ux-authority-principles.md`](./ux-authority-principles.md) and
[`open-questions.md`](./open-questions.md).

No current customer customize route. Disposition: **MISSING**.

## Routes (working vs current)

| Working customer destination | Current route fact | Note |
|---|---|---|
| Home | `/` | REDESIGN content role |
| Menu | `/order` | REDESIGN IA/label; KEEP as catalog host unless a later slice relocates it |
| Cart | `/order/cart/` | KEEP |
| Sign In | `/login` | KEEP + FIX chrome |
| Checkout | `/order/checkout/` | KEEP |
| Payment return | `/order/payment/` | FIX copy/recovery |
| Confirmation | `/order/confirmation/` | FIX projection |
| My Orders | `/order/orders/` (+ detail) | REDESIGN placement/name |
| My BOBA | **NOT_FOUND** | MISSING |
| Offers | **NOT_FOUND** | MISSING (engine exists) |
| Drops (destination) | Home `#drops` teaser | REDESIGN as campaign, not store |
| Product / Customize | **NOT_FOUND** | MISSING |

This table does not freeze future URLs. It records the working IA against the 2026-08-18 inventory.
