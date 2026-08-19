---
Status: FOUNDER-APPROVED PRODUCT-ARCHITECTURE PLANNING LOCK
Authority: SUPPORTING — planning lock; family A canonicalized as IMP-028A; family B canonicalized as IMP-028B (architecture ARCHITECTURE_LOCKED; implementation AUTHORIZED / NOT_STARTED)
Canonical vision: docs/platform/VISION.md
Canonical sequence: docs/platform/ROADMAP.md
Canonical accepted state: docs/platform/STATE.md
Canonical architecture: docs/platform/ARCHITECTURE.md
Canonical decisions: docs/platform/decision-register.md
Preserved: 2026-08-18
Source checkpoint: HEAD ddca0c319a5e80b2cfe38a2c32481b636277010e
Governance at lock: VISION-1 / GTM-R33 / STATE-R31 / ARCH-R15 / DR-12
acceptedThrough: IMP-028A
currentProductSlice: IMP-028B (IMPLEMENTATION_AUTHORIZED / NOT_STARTED; architecture ARCHITECTURE_LOCKED)
pendingAcceptance: NONE
IMP-029: PLANNED / NOT_STARTED / NOT_AUTHORIZED
Family A canonicalized as: IMP-028A
Family B canonicalized as: IMP-028B
Capability B supporting definition: SUPPORTING / CANONICALIZED_AS = IMP-028B
NEXT_FREE_DECISION: D-371 (unused by this lock)
---

# Food Direct — Product-Architecture Planning Lock

```text
LOCK_STATUS =
  FOUNDER-APPROVED PRODUCT-ARCHITECTURE PLANNING LOCK
  SUPPORTING
  NOT CURRENT ROADMAP ACTIVATION
  NOT IMPLEMENTATION AUTHORIZATION

D368_INTEGRATED = YES
D369_INTEGRATED = YES
D370_INTEGRATED = YES
NEW_DECISION_CREATED = NO
D371_CREATED = NO
NEW_IMP_CREATED = NO
CANONICALIZED_AS_B = IMP-028B
IMP028B_CANONICALIZED = YES
IMP028B_IMPLEMENTATION_AUTHORIZED = YES
ROADMAP_ACTIVATED = YES (IMP-028B IMPLEMENTATION_AUTHORIZED / NOT_STARTED)
CURRENT_PRODUCT_SLICE_CHANGED = YES (IMP-028B)
IMP029_STARTED = NO
```

This document consolidates completed BOBA Direct UX research, the 2026-08-18 repository gap audit,
supporting experience material, and independently accepted **D-368 / D-369 / D-370** into one
Food-commerce product-architecture lock suitable for **later** capability slicing.

It does **not** implement product, create `D-371`, create or activate an IMP, change
`acceptedThrough`, change `currentProductSlice`, or rewrite CURRENT architecture.

Food is the implementation focus. Wear, Culture, and Rewards remain outside this Food Direct
implementation architecture except as non-functional future-compatibility (nav/copy must not
implement those commercial domains).

---

## 0. Authority boundary

| Question | Authority |
|---|---|
| Why / Non-Goals | [`../VISION.md`](../VISION.md) VISION-1 |
| IMP identity / sequence | [`../ROADMAP.md`](../ROADMAP.md) GTM-R33 |
| Accepted inventory | [`../STATE.md`](../STATE.md) STATE-R31 |
| Durable global architecture | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) ARCH-R15 |
| Binding decisions | [`../decision-register.md`](../decision-register.md) DR-12 |
| This lock | SUPPORTING planning target for Food Direct only |

Binding decisions this lock **preserves and does not reopen**:

| ID | Title | Status in this lock |
|---|---|---|
| **D-368** | Customer Menu Read Projection Authority | CURRENT — TARGET serving architecture |
| **D-369** | Customer Paid Modifier Explicit Selection Authority | CURRENT — paid-intent policy |
| **D-370** | Cart Identity Transition Authority | CURRENT — guest→customer merge + logout isolation |

Next free CURRENT decision remains **D-371**. This lock does not consume it.

---

## 1. Target Food Direct architecture

### 1.1 Customer journey (planning target)

```text
HOME
→ MENU
→ PRODUCT
→ CUSTOMIZE
→ CART
→ AUTH
→ ADDRESS
→ SERVICEABILITY
→ CHECKOUT
→ PAYMENT
→ CONFIRMATION
→ ORDER STATUS
→ MY ORDERS
→ MY BOBA / ORDER AGAIN
```

Food is the only commercial path this lock targets. Order Again is part of the **target journey**
and a **later capability family**, not part of initial My BOBA Foundation.

### 1.2 Global chrome (working target, locked for Food Direct planning)

**Logged out**

```text
Menu | Drops | Offers | Sign In | Cart
```

**Logged in**

```text
Menu | Drops | Offers | Hi <customer> / My BOBA | Cart
```

Terminology (one customer concept → one customer-facing term):

```text
Menu | Order Now | My Orders | My BOBA | Cart | Sign In | Order Again | Saved Addresses
```

| Surface | Locked role |
|---|---|
| **Home** | Brand / discovery / conversion entry. Not a second sellable catalog. |
| **Menu** | Food commerce catalog / discovery. TARGET serving = D-368 read projection. |
| **My BOBA** | Customer relationship + commerce convenience. Not a settings-first admin portal. |
| **Drops** | Campaign / release presentation. Not BrandDrop commercial authority. |
| **Offers** | Customer projection over existing Promotion authority. Not a second price engine. |

Do **not** turn Wear or Culture into implemented nav destinations merely because they exist in
brand strategy. Drops and Offers may appear as chrome labels; they must not fake live commerce
destinations before their families exist (see §5 and §8).

### 1.3 Layering that must not be reopened

```text
UI
→ Transport (static export + customer-commerce /api/v1/* ; D-356 / D-359 / D-360)
→ Application operations
→ Domain authority
→ Persistence
→ Provider adapter
```

| Concept | Authority | Food Direct rule |
|---|---|---|
| Customer Menu Projection | D-368 / ARCH-G19 | Read model only. Not Catalog, Pricing, Availability, Cart, Checkout, Payment, or Order. |
| Display price | Projection of current pricing | ≠ sealed payable amount |
| Display availability | Projection of current assortment/availability | Not a new availability decision |
| Cart | IMP-020 / ARCH-G11 | Mutable purchase intent |
| Checkout Snapshot | IMP-021 / ARCH-G05 | Authoritative payable commercial truth |
| Payment | IMP-022 / D-361–D-363 | Browser callback ≠ success |
| Order | IMP-023 / D-357 | Post-purchase lifecycle; public `orderNumber` |
| Refund / FD / Signature | IMP-027 / IMP-028 / D-364–D-367 | Untouched; no customer refund API |

### 1.4 Implementation consequences of D-368 / D-369 / D-370 (no implementation invented)

**D-368 — Customer Menu Read Projection**

- Long-term customer Menu is a server-backed storefront **READ PROJECTION** over existing Catalog /
  Menu, Pricing, Assortment/Availability, modifier graph, and bundle graph.
- Accepted IMP-025 static `ordering-catalog.json` remains **TRANSITIONAL CURRENT** delivery until an
  authorized future capability replaces it.
- Future exposure is through existing `customer-commerce` `/api/v1/*`. Exact JSON is **not** locked.
  `GET /api/v1/menu` is an implementation candidate only.
- Checkout continues to revalidate. No Menu-projected value becomes final commercial truth.

**D-369 — Paid modifier explicit selection**

- A positive-price modifier (`price_delta_paise > 0` or equivalent) must not enter purchase intent
  solely as a catalog/default/`default_quantity`/import/previous-preference selection.
- Explicit current-interaction selection is required.
- Zero-price standard/preparation defaults MAY be visibly preselected and MUST remain visible when
  Customize is present.
- Required all-paid groups must not silently auto-select a paid option. Recommendation ≠ selection.
- Schema may still represent `default_quantity` + positive delta. D-369 does not change schema.
  Enforcement location is left to a future authorized customization capability.
- Live import currently has `modifier_groups: 0` — no immediate transaction-migration effect.

**D-370 — Cart identity transition**

- When an active guest Cart and an active customer Cart both exist, compatible purchase intent MUST
  be merged into a customer-owned Cart. Silent whole-cart winners are forbidden.
- Equivalent configured lines MAY combine quantity under existing identity rules; different
  configurations remain distinct.
- Failed merge must not silently discard or partially destroy source intent.
- Merge is not a commercial quote. Checkout Snapshot remains payable truth after existing
  revalidation.
- Reconciliation is **not** locked to Checkout only.
- After success, the former guest credential is not authority over the customer Cart.
- Sign-out must not delete the customer Cart; the browser becomes anonymous and must not expose or
  copy that Cart. Customer B must not receive Customer A’s Cart.
- Coupon-conflict `KEEP_GUEST` / `KEEP_CUSTOMER` as **coupon-resolution implementation** remains.
  Customer copy that presents that conflict as “Keep which cart?” is a UX defect (family D).
- Accepted checkout claim/reconcile remains CURRENT until an authorized future capability
  implements D-370.

---

## 2. Authority reuse map

Do not create duplicate domains. Every Food Direct family reuses accepted authorities.

| Family | Must reuse | Must not become |
|---|---|---|
| **A. Food Direct UX Foundation** | IMP-009 session; IMP-025/026C chrome/shell; existing `Nav` / layout | New auth realm; Menu commercial authority |
| **B. Customer Menu Projection + Discovery** | ADR-006; IMP-012 Catalog; IMP-013 menu sections/entries; IMP-014 assortment/availability; IMP-015 pricing; modifier/bundle graphs; **D-368** / ARCH-G19; D-356/D-359/D-360 façade | Catalog identity; Pricing; Availability decision; Promotion; Cart; Checkout Snapshot |
| **C. Food Customization** | ADR-006 generic groups/options; IMP-012–014; IMP-015 modifier prices; IMP-020 configured Cart lines; IMP-021 snapshot-sealed selected options; **D-369** / ARCH-G20 | Typed SIZE/SWEETNESS/ICE schema; negative-price removal domain; silent substitution; competing price authority |
| **D. Cart + Customer Session Hardening** | IMP-009; IMP-020 Cart aggregate / XOR / configured-line identity / revision concurrency; IMP-021 claim/reconcile (CURRENT until replaced); IMP-025/026C checkout claim timing; **D-370** / ARCH-G21; ADR-004 guest identity; ADR-008 qualified by D-370 | New Cart aggregate; whole-cart silent winner; Checkout Snapshot; Payment |
| **E. Checkout / Payment Experience Hardening** | IMP-019 serviceability; IMP-021 snapshot; IMP-022 / D-361–D-363 Payment; IMP-023 / D-357 Order; IMP-026C recovery/copy matrix | New Payment states; new Order states; new Checkout authority |
| **F. My BOBA Foundation** | IMP-009 Sign Out; IMP-017 Customer Profile API; IMP-018 Saved Addresses API; IMP-023 My Orders + detail; IMP-028 customer FD PDF fail-closed | Rewards; Favorites; Order Again operation; Wear; Culture |
| **G. Order Again** | IMP-023 historical Order (read); IMP-020 new current Cart intent; D-368 current Menu/config/availability; IMP-015 current pricing; IMP-021 revalidation; ARCH-G05 | Replay of historical Checkout Snapshot as current commercial truth |
| **H. Offers Experience** | IMP-016 Promotion engine; `POST /api/v1/cart/coupon`; ADR-007 | UI as price authority; auto-apply unless a later CURRENT decision says so |
| **I. Food Drops / Campaign** | Existing static Home campaign presentation | BrandDrop as catalog/price/inventory/checkout authority |
| **J. Favorites / My Usual** | None today (ABSENT) | Conflation with Order Again or Cart |

Accepted capabilities that remain **untouched as commercial/domain authority** by this lock:

```text
IMP-009  Customer phone OTP
IMP-012  Canonical catalog
IMP-013  Menu import / presentation identity
IMP-014  Assortment + operational availability
IMP-015  Pricing / charges / GST
IMP-016  Promotions engine
IMP-017  Customer Profiles (API)
IMP-018  Saved Customer Addresses (API)
IMP-019  Serviceability
IMP-020  Cart aggregate
IMP-021  Checkout / Checkout Snapshot
IMP-022  Payment
IMP-023  Order
IMP-024  Customer-commerce transport
IMP-025  Customer Ordering UX (accepted implementation CURRENT; future-facing Menu serving
         superseded only by D-368; future-facing Checkout-only identity transition
         superseded only by D-370)
IMP-026  Razorpay productionization
IMP-026C Pilot UX hardening (accepted; known residual UX defects classified below, not repaired)
IMP-027  Refund Foundation (no customer Refund API)
IMP-028  Invoice / Tax Receipt / Credit Note
```

---

## 3. Capability boundaries

Planning families below are **not** IMP IDs and are **not** ROADMAP sequence. Relative order is
planning guidance only.

### A. Food Direct UX Foundation

Supporting slice definition (FOUNDER REVIEW CANDIDATE; **not** CURRENT capability; **no IMP**;
**implementation not authorized**):
[`slices/food-direct-ux-foundation.md`](./slices/food-direct-ux-foundation.md).

**Likely scope**

- Home role (brand/discovery/conversion; stop competing hardcoded `menu.json` catalog)
- Global navigation and terminology
- Session-aware header (`fetchCustomerSession` in chrome)
- Sign In vs Hi \<customer\> / My BOBA entry
- Global Cart presence
- Sign Out reachable from chrome via My BOBA entry (full hub may wait for F)
- Stale customer-facing copy cleanup (including Privacy off-site ordering)
- Base responsive shell
- Static Drops as Home/campaign presentation only (not BrandDrop authority)
- Offers chrome: label allowed; live Offers destination is family H — do not ship a fake store

**Must not**

- Introduce Menu backend authority
- Implement D-368 / D-369 / D-370
- Implement Wear / Culture / Rewards destinations

**Existing defects in this family**

| Defect | Class |
|---|---|
| Session-blind global “Sign in” after successful login | PRODUCT_DEFECT → A |
| Sign out absent from global chrome | PRODUCT_DEFECT → A (entry); F owns My BOBA Sign Out placement |
| Stale Privacy copy describing off-site ordering | CONTENT → A |

### B. Customer Menu Projection + Discovery

Supporting slice definition (**SUPPORTING**; `CANONICALIZED_AS = IMP-028B`; architecture
`ARCHITECTURE_LOCKED`; **implementation authorized / not started**):
[`slices/customer-menu-projection-and-discovery.md`](./slices/customer-menu-projection-and-discovery.md).

Canonical product authority:
[`../capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](../capabilities/IMP-028B-customer-menu-projection-and-discovery.md).

Implements **D-368** under the locked IMP-028B capability. This planning lock does not start that
implementation.

**Likely scope** (aligned to the persisted B definition)

- Customer Menu read projection over existing commerce authorities
- Customer-commerce serving through existing `/api/v1/*` (exact path/payload not locked; `GET /api/v1/menu` is an implementation candidate only)
- `/order` runtime consumption of the projection rather than long-term `ordering-catalog.json` serving
- Category projection (`menu_sections`) and category-discovery **outcome** (direct navigation; visual pattern not locked)
- Product-card projection from existing legitimate display facts
- Display price projection
- Optional availability display projection when authoritative context exists; omit the claim when it does not
- Modifier/bundle projection only when actual authoritative content exists (do not invent missing modifier content)
- Cart entry via existing Cart APIs and canonical product/variant identity
- Preserve accepted IMP-028A chrome, Menu terminology, Order Now, Cart, responsiveness, accessibility

**Preserve:** Menu read model ≠ commercial authority.

**Split decision (locked)**

D-368 implementation and visual Menu discovery belong in **one capability family (B)**.

Repository evidence: sticky categories and card grammar can render from the transitional static
catalog, but truthful display price / display availability / live modifier-group presence are the
TARGET Menu and require the D-368 projection. A separately accepted “pretty static catalog” slice
would still be transitional serving and would likely be rewritten when the projection lands.

Internal workstreams inside B (not separate accepted families):

```text
B-PROJECTION  API_READ_MODEL over existing authorities (D-368)
B-DISCOVERY   UX consume of that projection (layout, cards, category navigation, persistent Cart)
```

Visual scaffolding may use a presentation adapter (transitional static catalog as a temporary
adapter). **Acceptance of B requires customer Menu serving from the D-368 projection**, not from
static JSON as long-term delivery.

Sticky vs non-sticky / horizontal vs vertical category chrome is a **candidate visual pattern**,
not a first-B product-law requirement. Persist the category-navigation outcome.

Do not add Most Ordered unless factual ranking authority exists (OPEN; not in first B).
Availability is optional display projection in first B: do not invent Available/Unavailable,
outlet, serviceability, stock, inventory, ETA, or delivery promise when authoritative context is
absent.

### C. Food Customization

**Likely scope**

- Populate/use current modifier graph (content/import)
- Product Customize surface
- Required/optional modifier groups
- Visible zero-price defaults (D-369)
- Explicit paid modifier selection (D-369)
- Configured Cart lines (existing IMP-020)
- Option availability
- Historical selected-option display (sealed snapshot/order already has modifiers)

**Must not** invent typed SIZE / SWEETNESS / ICE schema unless a later CURRENT decision requires it
(OQ-011 remains OPEN and non-blocking).

**Split decision (locked)**

Modifier **data/content activation** and **Customize UI** are separate workstreams inside C:

```text
C-CONTENT   CATALOG_CONTENT / IMPORT_DATA  (independent of UI; live import currently 0 groups)
C-UI        APPLICATION_OPERATION + UI     (D-369 enforcement; uses existing Cart configuration)
```

B **SHOULD_PRECEDE_FOR_BACKEND** → C-UI (storefront reads of groups/options
should come from the D-368 projection, not a second competing Menu read). C-UI
**SHOULD FOLLOW B** for backend/storefront serving. Content import may start
before B. Empty Customize UI without content is not customer-valuable and is not a separate
accepted family.

### D. Cart + Customer Session Hardening

Implements **D-370** and identity-transition defects.

**Likely scope**

- Guest → customer reconciliation timing (not Checkout-only)
- Compatible intent merge
- Conflict UX (including honest coupon-conflict copy)
- Post-merge guest authority removal
- Logout isolation
- Session-aware customer commerce state
- Misleading “Keep which cart?” copy (domain conflict is coupon-only today)
- Concurrency / recovery evidence under existing Cart revision rules

**Preserve** the existing Cart aggregate, XOR ownership, configured-line identity, and revision
concurrency.

**Existing defects in this family**

| Defect | Class |
|---|---|
| Guest-cart transition occurs only around Checkout | UX_DEFECT / policy gap vs D-370 → D |
| Misleading “Keep which cart?” copy where conflict is coupon-only | CONTENT / UX_DEFECT → D |

### E. Checkout / Payment Experience Hardening

**Likely scope**

- Payment recovery after Checkout remount
- INDETERMINATE messaging (“Do not pay again”)
- Checkout-bound Order resolution (not newest Order)
- Confirmation truthfulness (do not overstate “Order confirmed”)
- Configured-line / sealed-modifier display in confirmation and order detail
- Customer-resolvable checkout conflicts **if current backend already supports them**

**Must not** reopen Payment / Order / Checkout Snapshot authority.

**Existing defects in this family**

| Defect | Class |
|---|---|
| Payment recovery not restored correctly on Checkout remount | UX_DEFECT → E |
| Weaker payment-return uncertainty copy | UX_DEFECT → E |
| Confirmation heading can overstate “Order confirmed” | UX_DEFECT → E |
| Order wait can select newest Order rather than checkout-bound Order | UX_DEFECT → E |
| Sealed modifiers exist but are not rendered in customer Order views | UX_DEFECT → E (API already returns modifiers; C not required to render history) |

### F. My BOBA Foundation

**Likely scope (initial)**

- My BOBA hub / relationship shell
- Existing Customer Profile API UI
- Saved Address management UI (label/edit/delete over IMP-018)
- My Orders placement (not a peer of Menu named “Orders”)
- Active Order presentation (projection of existing list/detail; no new Order states)
- Sign Out

**Must not** include Rewards, Favorites, My Usual, Wear, Culture, or Order Again **operation**.

### G. Order Again

Separate backend/customer capability:

```text
historical Order
→ new current Cart intent
→ current Menu / configuration / availability / pricing revalidation
```

Never replay historical Checkout Snapshot as current commercial truth (ARCH-G05).

**Locked:** Order Again remains **separate** from My BOBA Foundation. The hub may later host the
entry point; the operation is G.

### H. Offers Experience

Existing Promotion authority exists; customer Offers surface does not.

**Minimum later Food scope (locked)**

- Browse/list customer-visible existing promotions (projection, not price authority)
- Optional coupon entry using existing `POST /api/v1/cart/coupon`
- Must not become competing price authority in UI

`BEST_AVAILABLE_OFFER_AUTO_APPLICATION` remains **OPEN**. It is **out of minimum H** and does not
block Food Direct MVP.

### I. Food Drops / Campaign Experience

Keep separate from core Menu implementation.

- Current static Drop presentation may be redesigned (Home/campaign) **without** creating BrandDrop
  authority — that redesign may land with A.
- Real scheduled/data-backed Drop capability remains later unless explicitly required for core Food
  Direct (it is **not** required for MVP).

### J. Favorites / My Usual

**DEFER** unless later dependency evidence requires earlier treatment.

Keep distinct:

```text
Favorite            = product affinity
Saved Configuration / My Usual = preferred configuration template
Order Again         = historical Order → new current intent
```

---

## 4. Dependency graph

Not a forced linear chain. Edges are typed.

```text
A  Food Direct UX Foundation
│
├── HARD → F  My BOBA Foundation (chrome / My BOBA entry)
├── SHOULD_PRECEDE_FOR_UX → B, D, E (session-true chrome before those surfaces feel coherent)
│
B  Customer Menu Projection + Discovery
│
├── SHOULD_PRECEDE_FOR_BACKEND → C-UI  (Customize should read D-368 projection, not a second Menu)
├── HARD → G  (Order Again revalidates against current Menu/availability/pricing)
│
C-CONTENT  modifier/bundle import   INDEPENDENT of A/B (catalog data)
C-UI       Customize surface        SOFT on C-CONTENT (empty otherwise); SHOULD FOLLOW B for backend/storefront serving
│
├── SOFT → G  (Order Again of configured items needs current configuration validity)
│
D  Cart + Session Hardening         INDEPENDENT of B/C for identity-transition
│                                    SHOULD_PRECEDE_FOR_UX before authenticated Menu/Checkout if
│                                    sign-in happens earlier than Checkout
│                                    HARD → G (new current Cart intent must obey D-370)
│
E  Checkout / Payment Hardening     INDEPENDENT of B/C
│                                    SOFT on C for richer configured-line copy on NEW orders;
│                                    historical sealed-modifier render does NOT depend on C
│
F  My BOBA Foundation               HARD on A; INDEPENDENT of B/C for Profile / Addresses / My Orders
│                                    SOFT on E for truthful active-order / confirmation entry
│
G  Order Again                      HARD on B + D + historical Order (IMP-023)
│                                    SOFT on C (configured reorder) and F (hub placement)
│
H  Offers Experience                INDEPENDENT; SHOULD_PRECEDE_FOR_UX only if A ships Offers as a
│                                    live destination rather than a later label
│
I  Food Drops (real authority)      INDEPENDENT of core Food; static campaign ⊂ A
J  Favorites / My Usual             DEFER; INDEPENDENT
```

| Pair | Type |
|---|---|
| A → B visual chrome | SHOULD_PRECEDE_FOR_UX |
| A → D/E session chrome | SHOULD_PRECEDE_FOR_UX |
| A → F | HARD |
| B-PROJECTION → B-DISCOVERY acceptance | HARD (same family) |
| B → C-UI | SHOULD_PRECEDE_FOR_BACKEND |
| C-CONTENT → C-UI | SOFT (empty Customize is not valuable) |
| D vs B | INDEPENDENT |
| D vs C | INDEPENDENT (Cart already supports configured lines) |
| E vs B/C | INDEPENDENT (sealed modifiers already on Order API) |
| F vs B/C | INDEPENDENT |
| B+D → G | HARD |
| C → G | SOFT |
| H, I-real, J vs MVP core | INDEPENDENT / DEFER |

---

## 5. UX-only vs backend map

| Target | Classes |
|---|---|
| Home role, terminology, session-aware header, global Cart chrome, Privacy copy | `UX_ONLY` `NO_DB_CHANGE_EXPECTED` |
| Sign Out in chrome / My BOBA | `UX_ONLY` over existing IMP-009 `DOMAIN_POLICY_ALREADY_EXISTS` |
| Sticky category / card layout (consume only) | `UX_ONLY` |
| D-368 customer Menu projection | `API_READ_MODEL` `DOMAIN_POLICY_ALREADY_EXISTS` (D-368) `NO_DB_CHANGE_EXPECTED` |
| Frontend leave static ordering-catalog as serving | `API_READ_MODEL` + `UX_ONLY` consume |
| Modifier/bundle content activation | `CONTENT_DATA_REQUIRED` `IMPORT_DATA` `NO_DB_CHANGE_EXPECTED` (schema exists) |
| Customize UI + D-369 enforcement | `UI` `APPLICATION_OPERATION` `DOMAIN_POLICY_ALREADY_EXISTS` (D-369) |
| Configured Cart lines | `DOMAIN_POLICY_ALREADY_EXISTS` (IMP-020) |
| Historical selected-option display | `UX_ONLY` over existing sealed snapshot/order modifiers |
| D-370 merge / logout isolation | `APPLICATION_OPERATION` `DOMAIN_POLICY_ALREADY_EXISTS` (D-370) `NO_DB_CHANGE_EXPECTED` |
| “Keep which cart?” copy | `UX_ONLY` (coupon-resolution already exists) |
| Payment remount recovery / INDETERMINATE copy | `UX_ONLY` `DOMAIN_POLICY_ALREADY_EXISTS` (D-361–D-362, IMP-026C) |
| Checkout-bound Order resolution | `UX_ONLY` / client mapping over existing Payment↔Order (must not pick `items[0]` blindly) |
| Confirmation heading truthfulness | `UX_ONLY` |
| Profile / Saved Address / My Orders UI | `UX_ONLY` over existing APIs `NO_DB_CHANGE_EXPECTED` |
| Order Again | `APPLICATION_OPERATION` `DOMAIN_CAPABILITY_REQUIRED` (new op, not new commercial domain) |
| Offers browse / coupon field | `UX_ONLY` over IMP-016; auto-apply = OPEN |
| Static Drop redesign | `UX_ONLY` |
| Real BrandDrop | `DOMAIN_CAPABILITY_REQUIRED` `DB_CHANGE_LIKELY` — deferred |
| Favorites / My Usual | `DOMAIN_CAPABILITY_REQUIRED` `DB_CHANGE_LIKELY` — deferred |
| Rewards / Wear / Culture commerce | `DOMAIN_CAPABILITY_REQUIRED` — deferred / VISION non-goal for Rewards V1 |

---

## 6. DB / migration expectations

Do not design migrations in this lock.

| Family | DB_CHANGE | Note |
|---|---|---|
| A UX Foundation | `NONE_EXPECTED` | Chrome/copy/Home |
| B Menu projection | `NONE_EXPECTED` | Read model over existing tables; new endpoint ≠ new schema |
| C Customization | `NONE_EXPECTED` | Schema exists; content/import activation; D-369 does not change schema |
| D Cart / session | `NONE_EXPECTED` | Existing Cart model sufficient for D-370 policy |
| E Checkout / payment UX | `NONE_EXPECTED` | Recovery/copy/order-binding are client/application mapping |
| F My BOBA Foundation | `NONE_EXPECTED` | APIs exist |
| G Order Again | `NONE_EXPECTED` | Historical Order → current Cart via existing line/config operations; no snapshot replay. `UNKNOWN` only if a later slice wants a dedicated reorder audit record — do not assume that |
| H Offers | `NONE_EXPECTED` | Engine exists |
| I static Drops | `NONE_EXPECTED` | |
| I real Drops | `LIKELY` | New entity if scheduled/data-backed — not MVP |
| J Favorites / My Usual | `LIKELY` | Future persistence |
| Rewards | `LIKELY` | Future new domain |

A new HTTP read endpoint does **not** imply a migration.

---

## 7. MVP Food Direct boundary

Minimum coherent Food Direct target:

```text
INCLUDED
  coherent Home / Nav terminology
  session-aware chrome
  Menu discovery served by D-368 projection
  real customization (content + UI + D-369)
  Cart identity continuity (D-370)
  existing Checkout / Payment / Order truth (hardened UX, not reopened)
  My Orders
  Saved Addresses / Profile convenience
  Sign Out

POSTPONED WITHOUT HARMING THE CORE JOURNEY
  Favorites
  Rewards
  My Usual
  real Drops authority
  Offers auto-apply
  Offers browse surface (chrome may omit live destination)
  Culture
  Wear
  Order Again (target journey later; not required to complete first paid Food order)
  special instructions
  Most Ordered ranking
  typed modifier-group schema
```

MVP families: **A, B, C, D, E, F**.

G, H, I-real, J are outside MVP. Static Drop presentation on Home may ship with A.

---

## 8. Deferred / out of scope

Keep explicitly deferred (do not leak into Food Direct MVP):

```text
Rewards / loyalty
Wear commerce
Culture commerce
cross-pillar BrandDrop authority
customer self-service refunds (D-364 V1 forbid)
multi-provider payment
COD / EMI / BNPL
fake kitchen-state expansion (PREPARING / READY / OUT_FOR_DELIVERY)
GPS rider tracking
advanced AI personalization
quantitative inventory unless future authority requires it
customer data deletion/retention legal policy
delivery instructions as a new domain
Search as empty nav
fake scarcity / fake ETA / fake popularity
hidden charges / silent paid defaults / silent substitutions
```

---

## 9. Customer Menu read model (conceptual; JSON not locked)

Because D-368 is binding, first Food UX needs this **conceptual** projection. Exact payload is not
locked.

### Required for first implementation

| Concept | Role |
|---|---|
| MenuItem / variant identity | Cart add/configure identity (existing catalog/menu ids) |
| Category identity + display name + order | Sticky category UX from `menu_sections` |
| Name | Product card / Customize |
| Description | Short sensory copy; omit if empty — do not invent |
| Images | Card/PDP presentation; omit gracefully if missing |
| Display price | Current pricing projection; labeled as display, not sealed payable |
| Display availability | Projection of current authoritative availability; not a new decision |
| Modifier groups / options | Storefront + Customize entry (min/max, required, price-delta sign for D-369) |
| Bundle/combo projection | Only where bundles are distinct products in the graph — do not flatten into modifiers |

Service context: browsing must not require full auth/address. Lightweight PIN/service overlay MAY
improve display availability later; exact destination remains authoritative at Checkout (IMP-019).
First B may project availability only when an already-authoritative operational/outlet context
exists. If no such context exists, first B **omits** the availability claim rather than inventing
Available/Unavailable, choosing an arbitrary outlet, inferring serviceability, or introducing
inventory / ETA / Delivery Promise semantics.

### Future enrichment (not first B)

| Concept | Gate |
|---|---|
| Display tags | Content exists and is customer-useful |
| Most Ordered / popularity | Factual ranking authority — OPEN; do not ship as a claim without it |
| Search | Not empty nav; later |
| Personalization | Deferred |
| Drop/campaign badges as commerce truth | Forbidden without I-real + underlying domain |

DISPLAY PRICE ≠ sealed payable amount. DISPLAY AVAILABILITY ≠ availability decision.

---

## 10. Customization content strategy

Current live import has **zero** modifier groups/options. Planning approach:

```text
1. C-CONTENT  Activate real Food customization data through existing catalog/import path.
              Do not invent live modifiers in this lock. Examples in D-369 remain examples.
2. C-UI       Customize surface consumes current graph via D-368 projection (preferred) or,
              if temporarily needed, existing Cart configuration operations — without creating
              a second Menu authority.
3. D-369      Enforce explicit paid selection in the current interaction.
4. Cart       Persist configured lines via existing IMP-020 operations.
5. Checkout   Seal selected options into Checkout Snapshot (already exists).
6. History    Render sealed modifiers on confirmation / My Orders (family E can do this before C).
```

| Work | Class |
|---|---|
| Populate groups/options/prices | `CATALOG_CONTENT` `IMPORT_DATA` |
| Customize surface | `UI` |
| Add/update configured line | `CART_CONFIGURATION` (exists) |
| Seal at checkout | `CHECKOUT_SEALING` (exists) |
| Show past selections | `HISTORICAL_DISPLAY` (data exists; UI missing) |

Do not populate data in this task. Do not invent actual menu modifiers beyond illustrative examples
already used in D-369.

---

## 11. My BOBA boundary

**Initial (family F)**

```text
Active Order
My Orders
Saved Addresses
Profile
Sign Out
```

**Later**

```text
Order Again          → family G (separate capability)
Favorites            → family J (defer)
My Usual             → family J (defer)
Rewards              → deferred / VISION V1 non-goal
Culture participation → deferred
Wear purchases       → deferred
```

Order Again is **not** included in initial My BOBA Foundation. Do not show a dead Order Again
control that pretends the capability exists.

---

## 12. Candidate acceptance outcomes

These are **candidate future acceptance criteria only**. No AC numbers. No IMP.

### A. Food Direct UX Foundation

- Customer signs in → global chrome immediately reflects customer identity (not “Sign in”).
- Logged-out chrome shows Sign In; logged-in chrome shows Hi \<customer\> / My BOBA and Cart.
- Customer-facing catalog destination is named **Menu**; historical purchases are **My Orders**, not
  a peer labeled “Orders”.
- Home does not present a second sellable catalog with competing hardcoded prices.
- Privacy / stale copy no longer describes off-site ordering as the current model.
- Primary journey remains usable at supported mobile widths without horizontal overflow of
  transaction controls.

### B. Customer Menu Projection + Discovery

Proposed acceptance criteria for the bounded B definition are recorded in
[`slices/customer-menu-projection-and-discovery.md`](./slices/customer-menu-projection-and-discovery.md)
as **PROPOSED_ACCEPTANCE_CRITERIA** (AC-B01–AC-B12). They are **not** canonical ACs.

Summary of that proposed surface:

- Customer Menu runtime serving uses the D-368 server-backed read projection through the existing
  customer-commerce façade; `ordering-catalog.json` is not the long-term `/order` serving source
  after B acceptance.
- Customer-visible categories/products derive from existing Menu/catalog authorities.
- Display price is projection of existing pricing authority, not sealed payable truth.
- Availability is displayed only when derived from existing authoritative availability + context;
  omit the claim when context is absent.
- Customers can navigate Menu categories directly from canonical Menu sections (visual pattern
  not locked).
- Add/quantity continue through existing Cart authority.
- IMP-028A chrome/terminology/accessibility do not regress.
- Menu projection does not become Pricing, Availability, Cart, Checkout Snapshot, Payment, or
  Order authority; no D-369/D-370 leakage; no new schema/migration; deferred discovery remains
  deferred.

### C. Food Customization

- Customer can configure a live item from current modifier groups/options.
- Customer selects a positive-price Extra Boba (or equivalent) → charge enters intent only after
  explicit current-interaction action (D-369).
- Zero-price standard defaults, when used, remain visible.
- Required all-paid groups do not silently pick a paid option.
- Material substitutions do not happen silently (ADR-006).
- Historical orders keep sealed selected options even if current catalog later changes.

### D. Cart + Customer Session Hardening

- Customer has guest Cart + customer Cart → compatible intent survives authentication (D-370).
- Different configurations remain distinct lines.
- Failed merge does not silently discard or partially destroy source intent.
- After merge, former guest credential cannot read/mutate the customer Cart.
- Sign-out does not delete the customer Cart and does not leave browser authority over it.
- Customer B on the same browser does not receive Customer A’s Cart.
- Coupon-only conflict is not described as choosing which whole cart to keep.

### E. Checkout / Payment Experience Hardening

- Customer refreshes unresolved Payment → does not regain an unsafe Pay action.
- INDETERMINATE / still-checking copy tells the customer not to pay again.
- Confirmation requires a real BOBA Order and does not overstate “Order confirmed” when status is
  not actually placed/confirmed.
- Post-pay wait binds to the checkout/payment Order, not an unrelated newest Order.
- Sealed modifiers appear on confirmation and order detail when present on the Order/snapshot.

### F. My BOBA Foundation

- Signed-in customer can open My BOBA and reach My Orders, Saved Addresses, Profile, and Sign Out.
- Saved Address edits do not rewrite historical Checkout Snapshot destinations.
- Active Order is a projection of existing Order list/detail, not a new lifecycle.

### G. Order Again (later)

- Order Again creates **new current** Cart intent from a historical Order.
- Current Menu/configuration/availability/pricing are revalidated; old snapshot is not payable truth.

### H / I / J

- Offers UI does not become price authority.
- Static Drops do not claim inventory/checkout authority.
- Favorites remain absent until J is authorized.

---

## 13. Non-functional UX requirements (carry forward)

From accepted IMP-026C / VISION correctness principles. Not new compliance standards.

```text
Supported mobile width behavior (existing ordering layout; Tailwind md = 768px)
No horizontal overflow of transaction controls
Keyboard operability of Add / qty / Cart / Checkout / Pay / retry
Visible focus; restore focus after blocking payment failure / Razorpay dismiss
Meaningful loading / error / empty states
Accessible names including product context; status not color-only
Primary tap targets remain usable on supported mobile
No fake scarcity
No fake ETA / capacity
No fake popularity claims
No hidden charges
No silent paid defaults (D-369)
No silent substitutions (ADR-006)
Refresh / recovery safety (Payment INDETERMINATE; Cart revision concurrency)
Responsive desktop/mobile Menu behavior (family B)
Static public frontend + /api/v1/* façade unchanged (ARCH-G01)
```

Recommendations (not CURRENT unless already required): do not add empty Search nav; do not invent
a second breakpoint system.

---

## 14. Remaining open decisions (no D-371)

After D-368 / D-369 / D-370, **no remaining CURRENT-decision gap blocks Food Direct MVP slicing**
(families A–F). Exact merge API/UX, Menu JSON, and Customize layout are implementation under those
decisions, not new `D-xxx` identities.

| Item | Classification | Notes |
|---|---|---|
| Offers auto-apply (`BEST_AVAILABLE_OFFER_AUTO_APPLICATION`) | `DOES_NOT_BLOCK_FOOD_MVP` / `BLOCKS_LATER_SLICE` only if auto-apply is added to H | Minimum H excludes it; remains OPEN |
| Real Drop / BrandDrop authority (OQ-014) | `DOES_NOT_BLOCK_FOOD_MVP` / `BLOCKS_LATER_SLICE` for I-real | Static Drops ⊂ A |
| Special instructions (OQ-012) | `DOES_NOT_BLOCK_FOOD_MVP` | ABSENT; never paid entitlement if later added |
| Public popularity / Most Ordered | `DOES_NOT_BLOCK_FOOD_MVP` | Do not ship as a factual claim without authority |
| Order Again edge-case conflict UX beyond historical→current-intent | `DOES_NOT_BLOCK_FOOD_MVP` / `BLOCKS_LATER_SLICE` for G | Principle already locked (EXP-WD-027 / ARCH-G05) |
| My Usual / Saved Configuration timing (OQ-007) | `DEFERRED` | Family J |
| Customer deletion / retention (OQ-005) | `DOES_NOT_BLOCK_FOOD_MVP` | |
| Typed modifier kinds (OQ-011) | `DOES_NOT_BLOCK_FOOD_MVP` | Generic groups exist |
| Checkout TTL customer copy (OQ-004) | `DOES_NOT_BLOCK_FOOD_MVP` | 15m is current implementation; copy may describe it without a new D-xxx |
| Email / comms preferences | `DOES_NOT_BLOCK_FOOD_MVP` | `marketingOptIn` forbidden in current profile contract |
| Delivery instructions | `DOES_NOT_BLOCK_FOOD_MVP` | IMP-026C non-goal; ABSENT |
| Customer self-service refund | `DEFERRED` | D-364 V1 forbid |
| Reward model / Wear / Culture exact capability | `DEFERRED` | |

`BLOCKS_FIRST_SLICE` = **none**. First Food Direct slice is A and needs no new CURRENT decision.

---

## 15. Recommended implementation sequence

No IMP numbers. Avoid one giant “UX overhaul” slice.

| Step | Capability | Why now | Customer value | Backend impact | Dependencies | Risk | Likely size |
|---|---|---|---|---|---|---|---|
| 1 | **Food Direct UX Foundation** | Session-blind chrome and terminology collide today; no domain change | Trust + findability; Sign In/My BOBA/Cart make sense | None | None | Low (UI/copy) | **SMALL** |
| 2 | **Cart + Customer Session Hardening** | D-370 is CURRENT policy; guest intent still waits until Checkout; logout isolation unimplemented | Intent survives login; privacy after Sign Out | `APPLICATION_OPERATION` on existing Cart; no new aggregate | SHOULD_PRECEDE_FOR_UX: 1 | Medium (concurrency / merge conflict UX) | **MEDIUM** |
| 3 | **Checkout / Payment Experience Hardening** | Residual IMP-026C defects; independent of Menu | Safe Pay/refresh; truthful confirmation | Client mapping over existing Payment/Order | SHOULD_PRECEDE_FOR_UX: 1; INDEPENDENT of 2/4 | Medium (Order-binding correctness) | **SMALL** |
| 4 | **Customer Menu Projection + Discovery** | D-368 TARGET; static catalog cannot show live availability truthfully | Real Menu; faster find-and-add | `API_READ_MODEL` only | SHOULD_PRECEDE_FOR_UX: 1 | Medium (must not become commercial authority) | **MEDIUM** |
| 5 | **Food Customization** | Schema exists; live import empty; D-369 unbound in product | Configured drinks/food with honest paid extras | Content/import + UI + existing Cart config | SHOULD_PRECEDE_FOR_BACKEND: 4; C-CONTENT may start earlier | Medium (content + D-369 enforcement location) | **MEDIUM** |
| 6 | **My BOBA Foundation** | APIs exist; no hub; Orders mislabeled as peer nav | Repeat convenience; Sign Out; addresses | UI over existing APIs | HARD: 1 | Low | **MEDIUM** |
| 7 | **Order Again** | Repeat revenue after core journey is true | One-tap start of a **current** cart | New application op; revalidate through Cart/Checkout | HARD: 4+2; SOFT: 5+6 | Medium (must not replay snapshots) | **MEDIUM** |
| 8 | **Offers Experience** | Engine exists; no customer surface | See/apply offers without a second price engine | UI; coupon API exists | INDEPENDENT; auto-apply OPEN | Low if browse-only | **SMALL** |
| 9 | **Food Drops (static already in 1; real later)** | Campaign without fake commerce | Editorial drops | Real = new domain later | INDEPENDENT | High if BrandDrop absorbs authority | static **SMALL** / real **LARGE** |
| — | **Favorites / My Usual** | No core-journey dependency | Affinity / templates | New persistence | DEFER | — | later |

Steps 2 and 3 may proceed **in parallel** after 1. Step 4 may proceed in parallel with 2 and 3.
Step 5 should follow 4 for customer UI. Step 6 may proceed in parallel with 4/5 after 1.

---

## 16. Sequencing recommendation (summary)

```text
MVP
  1 A UX Foundation
  2 D Cart/session (D-370)     ║  3 E Checkout/payment UX
  4 B Menu projection (D-368)
  5 C Customization (D-369)
  6 F My BOBA Foundation

LATER
  7 G Order Again
  8 H Offers (no auto-apply)
  9 I real Drops (decision still OPEN)
  J Favorites / My Usual
```

IMP-029 remains Operations Console API, `PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`. This lock
does not retarget it.

---

## 17. Explicit non-activation

```text
PRODUCT_SLICE_ACTIVATED = YES (IMP-028A COMPLETE_AND_ACCEPTED; IMP-028B IMPLEMENTATION_AUTHORIZED / NOT_STARTED)
FAMILY_A_CANONICALIZED_AS = IMP-028A
FAMILY_B_CANONICALIZED_AS = IMP-028B
FOOD_DIRECT_CAPABILITY_B = CANONICALIZED_AS = IMP-028B
CANONICALIZED_AS_B = IMP-028B
IMP028B_CANONICALIZED = YES
IMP028B_IMPLEMENTATION_AUTHORIZED = YES
IMP028B_IMPLEMENTATION_STARTED = NO
IMP028B_IMPLEMENTATION_COMPLETE = NO
IMP028B_ACCEPTED = NO
IMP029_STARTED = NO
IMP029_RETARGETED = NO
D371_CREATED = NO
CURRENT_ARCHITECTURE_RESTATED_ONLY_BY_THIS_LOCK = NO
WEAR_IMPLEMENTATION_AUTHORIZED = NO
CULTURE_IMPLEMENTATION_AUTHORIZED = NO
REWARDS_IMPLEMENTATION_AUTHORIZED = NO
FOOD_DIRECT_IMPLEMENTATION_AUTHORIZED = NO
IMP-028A_IMPLEMENTATION_AUTHORIZED = YES
IMP-028A_IMPLEMENTATION_STARTED = YES
IMP-028A_IMPLEMENTATION_COMPLETE = YES
IMP-028A_ACCEPTED = YES
```

---

## 18. Provenance

Read-only consolidation of:

- [`README.md`](./README.md) experience pack
- [`direct-ux-north-star.md`](./direct-ux-north-star.md)
- [`customer-journey.md`](./customer-journey.md)
- [`information-architecture.md`](./information-architecture.md)
- [`terminology.md`](./terminology.md)
- [`ux-backend-gap-map.md`](./ux-backend-gap-map.md)
- [`capability-families.md`](./capability-families.md)
- [`working-decisions.md`](./working-decisions.md)
- [`open-questions.md`](./open-questions.md)
- [`ux-authority-principles.md`](./ux-authority-principles.md)
- CURRENT D-368 / D-369 / D-370, ARCH-G19 / G20 / G21
- Accepted IMP-009–IMP-028 inventory in STATE-R31

Checkpoint: `/home/ajoshi/repos/boba-bear-website-acceptance` at
`ddca0c319a5e80b2cfe38a2c32481b636277010e` on 2026-08-18.
