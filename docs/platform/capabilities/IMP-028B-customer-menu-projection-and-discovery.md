<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-028B",
  "title": "Customer Menu Projection + Discovery",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "COMPLETE_AND_ACCEPTED",
  "implementationAuthorized": true,
  "lastReviewed": "2026-08-19",
  "bindingDecisions": ["D-356", "D-359", "D-360", "D-368", "D-369", "D-370"],
  "dependsOn": ["IMP-012", "IMP-013", "IMP-014", "IMP-015", "IMP-020", "IMP-021", "IMP-024", "IMP-025", "IMP-026C", "IMP-028A"]
}
-->

# IMP-028B — Customer Menu Projection + Discovery

## Capability Architecture (ARCHITECTURE_LOCKED)

This document is the **locked capability architecture** for IMP-028B — Customer Menu Projection +
Discovery. It locks the implementation architecture needed to satisfy canonical AC-01–AC-12 without
broadening the accepted capability boundary. Global architecture remains ARCH-R15. No new decision
is created (`D-371` unused). Binding **D-368** / ARCH-G19 remain the architectural authority for
the customer Menu read-projection TARGET.

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Implementation | `COMPLETE_AND_ACCEPTED` |
| Implementation authorized | **YES** |
| Implementation started | **YES** |
| Implementation complete | **YES** |
| Roadmap lifecycle | `COMPLETE_AND_ACCEPTED` |
| Acceptance | **YES**; `acceptedThrough` is IMP-028B; `pendingAcceptance` is NONE |
| Schema change required | **NO** |
| New commercial authority | **NO** |
| New decision | **NO** (`D-371` unused) |
| Customer Menu route | `GET /api/v1/menu` |
| Projection module | `src/server/customer-commerce/menu/project-customer-menu.ts` |
| DTO module | `src/shared/customer-menu/types.ts` (`CustomerMenuProjection`) |

This accepted capability did not implement D-369 / D-370, change global architecture, create
schema/migrations, or retarget IMP-029.

Supporting source (rationale retained; not competing product authority):

[`../experience/slices/customer-menu-projection-and-discovery.md`](../experience/slices/customer-menu-projection-and-discovery.md)

```text
DOMAIN: NONE (read model over existing authorities)
DATABASE: NONE
MIGRATION: NONE
NEW_COMMERCIAL_AUTHORITY: NONE
NEW_DECISION: NONE
D371_CREATED: NO
IMP029_RETARGETED: NO
IMPLEMENTATION_AUTHORIZED: YES
IMPLEMENTATION_STARTED: YES
IMPLEMENTATION_COMPLETE: YES
IMP-028B_ARCHITECTURE_LOCKED: YES
IMP-028B_IMPLEMENTATION_AUTHORIZED: YES
IMP-028B_IMPLEMENTATION_STARTED: YES
IMP-028B_IMPLEMENTATION_COMPLETE: YES
IMP-028B_ACCEPTED: YES
CANONICALIZED: YES
CUSTOMER_MENU_ROUTE: GET /api/v1/menu
NEW_SCHEMA_REQUIRED: NO
NEW_MIGRATION_REQUIRED: NO
STATIC_RUNTIME_MENU_AFTER_IMPLEMENTATION: SERVER_PROJECTION
AVAILABILITY_WITHOUT_AUTH_CONTEXT: OMIT
```

---

## 1. Governance Metadata

| Field | Value |
|---|---|
| IMP | IMP-028B |
| Capability | Customer Menu Projection + Discovery |
| Roadmap lifecycle | `COMPLETE_AND_ACCEPTED` |
| Implementation | `AUTHORIZED` / `STARTED` / `COMPLETE` |
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Accepted product through | IMP-028B — Customer Menu Projection + Discovery |
| Current product slice | NONE |
| Pending acceptance | NONE |
| Next product slice | IMP-029 — Operations Console API (unchanged; not this capability) |
| Public GTM boundary | IMP-040 |
| Placement | after accepted IMP-028A; before planned IMP-029 |
| Binding decisions consumed | D-356, D-359, D-360 (transport/static frontend); **D-368** / ARCH-G19 TARGET serving authority; D-369 / D-370 remain CURRENT and **unimplemented** by this capability |
| New decision | **NO** (next free ID remains `D-371`) |
| Global architecture | ARCH-R15 unchanged |
| Decision register | DR-12 unchanged |
| Supporting canonicalization | `CANONICALIZED_AS = IMP-028B` |

Canonical authorities:

| Question | Authority |
|---|---|
| Why / Non-Goals | [`../VISION.md`](../VISION.md) |
| Sequence / lifecycle | [`../ROADMAP.md`](../ROADMAP.md) |
| Accepted reality | [`../STATE.md`](../STATE.md) |
| Durable global architecture | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| Binding decisions | [`../decision-register.md`](../decision-register.md) |
| Customer Menu TARGET | D-368 / ARCH-G19 |
| Food Direct UX Foundation | [`IMP-028A-food-direct-ux-foundation.md`](./IMP-028A-food-direct-ux-foundation.md) |
| Supporting Capability B definition | [`../experience/slices/customer-menu-projection-and-discovery.md`](../experience/slices/customer-menu-projection-and-discovery.md) |
| This capability | **This document** |

Layering (unchanged):

```text
UI → Transport → Application Operations → Domain Authority → Persistence → Provider Adapter
```

IMP-028B owns the **customer-facing Menu read projection and category/product discovery outcome**.
It must not become commercial truth.

---

## 2. Capability Purpose

Deliver the first server-backed BOBA Direct customer Menu under D-368 by projecting existing
authoritative Menu/catalog/pricing data into the customer commerce surface and improving
category-based discovery while preserving all existing commercial authority boundaries.

Customer outcome:

A customer can browse a truthful, easier-to-navigate BOBA Direct Menu whose categories, products,
and display price are projected from existing authorities and can add products to the existing Cart
without the Menu becoming commercial truth.

---

## 3. Canonical Architecture Boundary

Preserve D-368 / ARCH-G19 exactly in substance.

Customer Menu Projection is a **READ MODEL** over existing:

- catalog / product authority;
- Menu graph authority;
- pricing authority;
- assortment / availability authority where context exists;
- modifier authority when real content exists;
- bundle authority when real content exists.

It **MUST NOT** become:

- Catalog identity authority;
- Product/MenuItem authority;
- Pricing authority;
- Availability authority;
- inventory authority;
- Promotion authority;
- Cart authority;
- Checkout authority;
- Checkout Snapshot authority;
- Payment authority;
- Order authority.

Persist:

```text
Menu display price
≠ sealed payable amount

Menu display availability
≠ new availability decision

Frontend Menu projection
≠ final commercial truth
```

Checkout continues to revalidate and creates authoritative payable truth.

---

## 4. Exact In-Scope

### A. Server-backed customer Menu projection

A customer-facing read projection composed from existing canonical commerce authorities.

Expected inputs, where currently supported:

- existing Menu sections/categories;
- existing Menu entries;
- existing catalog products/variants;
- existing effective display fields;
- existing pricing authority for **DISPLAY** price;
- existing assortment/availability authority when authoritative context exists;
- existing modifier/bundle graph only when actual authoritative content exists.

Do not invent missing modifier content. Capability B **does not** expose modifier/customization
fields in the locked customer DTO because live Direct import currently has no modifier content and
customization is reserved for family C / D-369.

### B. Customer-commerce serving

Serve the projection using the existing customer-commerce `/api/v1/*` façade (D-356 / D-359 /
D-360).

Locked route: **`GET /api/v1/menu`**.

### C. `/order` runtime migration

Move `/order` from transitional static runtime storefront delivery toward consuming the
server-backed projection as its long-term Menu serving path.

`src/data/ordering-catalog.json` may remain only where legitimately needed for
transition/import/test support after implementation.

It must not remain the long-term customer-serving source after IMP-028B acceptance.

### D. Category discovery

Provide direct, accessible customer navigation across authoritative Menu categories/sections.

Lock the **outcome**, not exact visual treatment.

Do **not** lock sticky vs non-sticky, horizontal vs vertical, exact animation, exact layout, or
breakpoint behavior unless an existing accessibility/UX invariant already requires it.

Sticky category navigation is a **candidate**, not a product-law requirement.

### E. Product discovery

Render projected existing legitimate product facts such as:

- effective name;
- description;
- image;
- category;
- display price;

without inventing new commercial facts.

### F. Existing Cart entry

Preserve existing Add / quantity behavior through existing Cart authority using canonical
product/variant identity.

IMP-028B **consumes** Cart authority. It does **not** replace Cart authority.

### G. IMP-028A UX preservation

Preserve:

- Menu → `/order`
- Order Now
- Cart
- customer chrome
- Sign In / My BOBA state
- terminology
- responsive/accessibility shell

---

## 5. Locked Projection Composition

Verified current implementation facts (read-only; 2026-08-19):

```text
CURRENT /order runtime = server-backed Customer Menu Projection
customer Menu API = served at GET /api/v1/menu
server Menu graph = exists for workforce/internal use (src/server/catalog/menu/*) and is not customer-serving
pricing authority = existing IMP-015 (resolveOutletVariantPrice / Brand→Territory→Organization→Outlet)
availability authority = existing IMP-014 (outlet-scoped)
Cart authority = existing IMP-020 /api/v1/cart*
```

Composition lock:

Customer Menu Projection is an **application/service-layer READ composition** inside
`customer-commerce`. It is **not** a new domain, table, cache, or materialized projection store.

Locked module:

```text
src/server/customer-commerce/menu/project-customer-menu.ts
```

The composition:

1. Accepts `brandId` (required) and optional `outletId`.
2. Loads the **exactly one** `active` Menu for that brand from existing `menus` / sections /
   entries. Fail closed if zero or more than one active Menu exists. This encodes the current V1
   Direct single-active-menu operating invariant; it does **not** create a multi-menu selector
   policy.
3. Joins active Menu entries to existing catalog products and each product’s unique active default
   variant (existing IMP-012 active-product graph rule).
4. Applies existing `effectiveEntryDisplay` (entry override vs product name/description).
5. Projects **display price** from existing IMP-015 authority (see §8).
6. Projects **availability** only when `outletId` is a legitimate existing outlet identity (see §9).

Do **not**:

- call workforce-authorized `getMenuGraph` with a fabricated workforce actor;
- introduce a second Product/MenuItem/Pricing/Availability model;
- persist the projection;
- add schema or migrations.

Existing workforce Menu commands/reads remain workforce-only.

---

## 6. Locked Customer-Commerce Transport

```text
CUSTOMER_MENU_ROUTE = GET /api/v1/menu
```

This path is already reserved on the customer-commerce façade as a 404 stub. IMP-028B replaces
**exact** `GET /api/v1/menu` with the read projection. Other `/api/v1/menu/*` paths remain 404.
Non-GET methods on `/api/v1/menu` remain not allowed / not found as implementation-local HTTP
hygiene; no Menu write API.

Query:

| Param | Required | Meaning |
|---|---|---|
| `brandId` | **YES** | Same customer-commerce brand query convention as `GET /api/v1/cart` |
| `outletId` | NO | Used only when the caller already has an authoritative outlet UUID |

Auth: **public browse**. No customer session and no guest-cart token are required to read the Menu.
Cart mutations remain on existing Cart APIs.

Envelope (D-360):

```text
success: { ok: true, menu: CustomerMenuProjection }
failure: { ok: false, code, requestId }
```

Thin façade only: `src/server/customer-commerce/http/router.ts` maps the GET to the projection
module. No second service. No Next.js Route Handler. No SSR authority. `/order` remains a static
export page and fetches the Menu at runtime through `src/lib/customer-commerce`.

Locked client module (to be added at implementation):

```text
src/lib/customer-commerce/menu.ts
```

The static `/order` page may continue to know the proven Direct `brandId` already present in the
accepted import/catalog identity as **request context**, not as Menu authority.

---

## 7. Locked Response / DTO Boundary

Locked types live in:

```text
src/shared/customer-menu/types.ts
CUSTOMER_MENU_DTO = CustomerMenuProjection
```

Minimum read model:

```text
CustomerMenuSection
  id
  parentSectionId | null
  name
  position

CustomerMenuItem
  productId
  variantId
  sectionId
  name                  // effective display name
  description           // effective display description; may be null
  imagePath             // entry imagePath when present; otherwise omit/null; no remote URL invention
  displayPricePaise     // integer paise JSON number; DISPLAY only
  currency              // "INR"
  availability          // OPTIONAL; omit entire field when no authoritative outlet context

CustomerMenuProjection
  brandId
  menuId
  name
  sections[]
  items[]
```

Do **not** include:

- payable totals, tax, promotions, charges;
- modifier/bundle customization graphs;
- ranking/tags/`bestseller` as factual claims;
- import `sourceKey` as a required customer field;
- workforce lifecycle internals beyond what identity/display requires;
- inventory, ETA, serviceability, or Delivery Promise.

`availability`, when present, is a display projection of existing IMP-014 effective state
(`available` | `sold_out` | `temporarily_unavailable`) and is **not** orderability authority.

---

## 8. Display Price Architecture

Menu display price comes from existing IMP-015 pricing authority and remains **DISPLAY /
PROJECTION DATA**.

Existing Direct-commerce selection rule (already implemented in `resolveOutletVariantPrice`):

```text
Brand → Territory → Organization → Outlet
Most-specific permitted value wins
Missing lower scope = inherit Brand baseline
salesChannel = direct
currency = INR
```

Locked application of that **existing** rule:

| Authoritative outlet context | Display price |
|---|---|
| `outletId` present and valid | existing `resolveOutletVariantPrice` (full hierarchy) |
| `outletId` absent | Brand-scope active Direct INR price-book baseline for the variant (inherit; no Territory/Organization/Outlet override because those scopes have no context) |

This is **not** a new pricing policy. Brand baseline is already required by IMP-015; lower scopes
are optional overrides. Checkout Snapshot remains payable truth and continues to revalidate.

Fail closed if Brand baseline is missing (`PRICE_MISSING`). Do not fall back to
`ordering-catalog.json` `presentationPriceRupees` as production display-price authority.

Display price **MUST NOT** be treated as:

- Checkout Snapshot;
- payable total;
- tax truth;
- promotion-final truth.

---

## 9. Availability Architecture

```text
AVAILABILITY_WITHOUT_AUTH_CONTEXT = OMIT
```

If an authoritative outlet UUID is supplied as existing context, project IMP-014 effective variant
availability (`resolveOutletVariantAvailability` / equivalent existing read).

If it does not exist, **omit** `availability` from each item. Do **not**:

- invent an anonymous default outlet;
- infer outlet from delivery PIN, localStorage, or browser geo;
- infer serviceability;
- invent stock, inventory, or ETA.

Current `/order` Deliver-To PIN is **serviceability/cart-evaluation context**, not outlet
identity. First-slice `/order` therefore omits availability until a later authorized capability
supplies a legitimate outlet context.

Availability is never mandatory on the DTO.

---

## 10. Static Catalog Transition

```text
STATIC_RUNTIME_MENU_AFTER_IMPLEMENTATION = SERVER_PROJECTION
```

Locked cutover:

1. Implement `GET /api/v1/menu` projection.
2. Change `/order` so `OrderingCatalogClient` (or its successor view) loads the Menu from
   `GET /api/v1/menu` at runtime. Static export forbids SSR/Route-Handler Menu authority.
3. Stop using `src/data/ordering-catalog.json` as the `/order` runtime catalog source.

`ordering-catalog.json` / `build-ordering-catalog.ts` may remain as:

- import/generator artifact;
- parity/test fixture;

A temporary client adapter from `CustomerMenuProjection` onto the current
`OrderingCatalogClient` props is allowed **during implementation only**. Acceptance of IMP-028B
must not leave static JSON as the long-term production Menu runtime source. Any transitional
adapter must be removed or reduced to DTO-native rendering before acceptance.

Do not keep a production runtime fallback to JSON after acceptance.

---

## 11. Category Discovery Architecture

AC-06 outcome lock:

- categories/sections come from canonical active Menu sections (`menu_sections`), including parent
  relationship when present;
- customers can navigate directly to a category (in-page targets / equivalent accessible control);
- the full sequential Menu remains usable without brittle JS-only exclusive state;
- navigation works on supported responsive viewports;
- accessibility semantics of headings/landmarks/focus are preserved.

Exact sticky behavior, horizontal vs vertical chrome, and visual styling remain implementation
detail. No Search, filtering, sorting, Most Ordered, or ranking.

---

## 12. Cart Integration Preservation

Menu projection supplies `productId` + `variantId` needed by existing Cart add/quantity.

Existing flow continues:

```text
src/lib/customer-commerce/cart.ts
→ POST /api/v1/cart/lines
→ IMP-020 Cart authority
```

Do not redesign Cart schema, Cart API, merge, logout, or Checkout. Do not implement D-370.

---

## 13. D-369 / Customization Boundary

Capability B may read only existing legitimate catalog/menu fields needed for cards.

Do **not** implement:

- customization UI;
- modifier-selection flows;
- paid-default enforcement;
- modifier content creation.

D-369 remains CURRENT and reserved for Capability C. Even if modifier rows later exist in
persistence, B must not expand into C-UI.

D-370 remains CURRENT and unimplemented.

---

## 14. Availability Boundary (canonical)

Menu-level availability is **OPTIONAL display projection**.

If an authoritative existing outlet/operating context exists:

availability may be projected from current IMP-014 authority.

If no authoritative context exists:

the Menu must omit the availability claim.

IMP-028B must **NOT**:

- invent availability;
- infer serviceability;
- choose an arbitrary outlet;
- introduce stock/inventory semantics;
- introduce ETA;
- create Delivery Promise authority;
- create new serviceability policy.

This is a scope rule, not a D-371 decision.

---

## 15. Explicit Non-Goals

IMP-028B must **not** include:

```text
Search
filtering
sorting
Most Ordered / factual popularity ranking
recommendations
personalization
full PDP redesign
Food Customize UI
D-369 implementation
paid-modifier selection enforcement
modifier-content invention/import where content is absent
D-370 Cart merge
D-370 logout Cart reconciliation
Offers UX / auto-apply
real BrandDrop commerce
Favorites
My Usual
Rewards
Order Again
full My BOBA hub
Wear commerce
Culture commerce
new inventory/stock authority
ETA / Delivery Promise
new Pricing authority
new Availability authority
new serviceability policy
DB schema
migrations
speculative cache/persistence authority
IMP-029 changes
D-371 creation
```

Do not allow `bestseller` or similar content to become factual ranking authority.

Existing JSON badges/tags such as `new`, `signature`, `bestseller` are **OUTSIDE** this first
bounded capability unless they are already legitimate display content and their meaning is
non-factual/non-ranking.

Do not activate Food Direct families C–J. Do not retarget IMP-029. Do not steal Operations Console,
Delivery, Notification, or remaining GTM IMP-030 → IMP-040 scope.

---

## 16. Dependencies

| Authority | Role for IMP-028B |
|---|---|
| IMP-012 | Catalog / product / variant authority |
| IMP-013 | Menu graph / sections / entries |
| IMP-014 | Assortment / operational availability |
| IMP-015 | Pricing |
| IMP-020 | Cart |
| IMP-021 | Checkout Snapshot / payable truth |
| IMP-024 | Customer-commerce `/api/v1/*` façade |
| IMP-025 | Ordering identity/parity + current transitional storefront delivery |
| IMP-026C | No invented availability; presentation ≠ payable; sticky Cart/pilot UX |
| IMP-028A | Food Direct chrome / terminology |
| D-368 / ARCH-G19 | Customer Menu read projection TARGET |

Also preserve:

| ID | Status | Implementation |
|---|---|---|
| D-369 | CURRENT | NOT_AUTHORIZED; deferred to Food Customization (family C) |
| D-370 | CURRENT | NOT_AUTHORIZED; deferred to Cart/session hardening (family D) |

---

## 17. B → C Dependency

Preserve exactly:

```text
B Menu Projection
SHOULD_PRECEDE_FOR_BACKEND
→ C-UI Customization

C-CONTENT may progress independently.
C-UI has SOFT dependency on content.
```

Do not reverse this relationship.

Reason: C-UI should consume the B customer Menu projection rather than introduce a second
storefront read model.

Deferred from B to C:

- Food customization surface;
- modifier-group interaction;
- modifier choice UX;
- enforcement implementation for D-369 explicit paid-choice behavior;
- modifier content activation/import where needed;
- PDP/customization entry pattern if later selected.

B may project modifier/bundle data only if authoritative data already exists.

B must not implement customization merely because the projection can expose it.

---

## 18. Acceptance Criteria

Promote the reviewed proposed ACs into canonical IMP-028B acceptance criteria. A passing IMP-028B
**must not** be read as D-369 / D-370 done.

| ID | Criterion |
|---|---|
| **AC-01** | **SERVER-BACKED MENU.** Customer Menu runtime serving uses the D-368 server-backed customer read projection through the existing customer-commerce façade. |
| **AC-02** | **CANONICAL IDENTITY.** Customer-visible categories/products derive from existing Menu/catalog authorities. No frontend-created commercial identity. |
| **AC-03** | **TRANSITIONAL STATIC SERVING RETIRED.** `ordering-catalog.json` is no longer the long-term `/order` storefront runtime source after IMP-028B acceptance. It may remain only for legitimate transitional/import/test purposes. |
| **AC-04** | **DISPLAY PRICE INTEGRITY.** Customer Menu display price derives from existing pricing authority. It remains display/projection information. Checkout Snapshot remains final payable truth. |
| **AC-05** | **AVAILABILITY INTEGRITY.** Availability is displayed only when derived from existing authoritative availability + context. No availability is invented when authoritative context is absent. |
| **AC-06** | **CATEGORY DISCOVERY.** Customers can navigate Menu categories directly using category structure derived from canonical Menu sections rather than being forced to traverse the entire Menu sequentially. |
| **AC-07** | **EXISTING CART AUTHORITY.** Add and quantity operations continue through existing Cart authority using canonical product/variant identity. |
| **AC-08** | **IMP-028A UX PRESERVED.** Menu destination, Order Now, Cart, customer chrome, terminology, responsiveness and accessibility do not regress. |
| **AC-09** | **COMMERCIAL AUTHORITY PRESERVED.** Customer Menu Projection does not become Pricing, Availability, Cart, Checkout Snapshot, Payment, or Order authority. |
| **AC-10** | **NO D-369 / D-370 LEAKAGE.** No Food customization / paid-modifier implementation is introduced. No Cart identity merge/logout reconciliation is introduced. |
| **AC-11** | **NO NEW PERSISTENCE AUTHORITY.** IMP-028B requires no new DB schema or migration merely to provide the customer Menu projection. |
| **AC-12** | **DEFERRED DISCOVERY REMAINS DEFERRED.** Search, ranking, personalization, Offers and later-family capability behavior are not introduced. |

These criteria are canonical for implementation / acceptance. This lock authorizes implementation
and does **not** implement them.

---

## 19. Locked Implementation Inventory (planning guidance)

Carry forward as planning guidance, **not** binding source ownership. Do not edit these files in
this authorization.

| Path | Class |
|---|---|
| `src/server/customer-commerce/menu/project-customer-menu.ts` | EXPECTED_NEW |
| `src/shared/customer-menu/types.ts` | EXPECTED_NEW |
| `src/lib/customer-commerce/menu.ts` | EXPECTED_NEW |
| `src/server/customer-commerce/http/router.ts` | EXPECTED_CHANGE (replace GET `/api/v1/menu` 404 stub) |
| `src/app/order/page.tsx` | EXPECTED_CHANGE (stop runtime JSON catalog injection) |
| `src/components/ordering/OrderingCatalogClient.tsx` | EXPECTED_CHANGE (consume projection; category navigation) |
| `src/lib/customer-commerce/index.ts` | POSSIBLE_CHANGE (re-export) |
| `src/data/ordering-catalog.json` | NO_RUNTIME_AUTHORITY after cutover; may remain fixture/generator |
| `src/server/catalog/ordering-catalog/build-ordering-catalog.ts` | NO_CHANGE_EXPECTED as runtime storefront authority |
| `src/server/catalog/menu/*` workforce commands | NO_CHANGE_EXPECTED except optional reuse of `effectiveEntryDisplay` |
| `src/server/pricing/**` | NO_NEW_POLICY; may be called from the composition |
| `src/server/assortment/**` | NO_NEW_POLICY; optional outlet-scoped display only |
| `src/server/cart/**` | NO_CHANGE_EXPECTED |
| `drizzle/**` | NO_CHANGE_EXPECTED |

---

## 20. D-371 Trace

```text
D371_CREATED = NO
D371_REQUIRED = NO
D-371 = UNUSED
```

D-368 / ARCH-G19 already settle:

- server-backed read projection;
- source-of-truth boundary;
- static transition target;
- display-price semantics;
- display-availability semantics;
- customer-commerce façade family.

Route path, DTO shape, query composition, category-navigation component structure, Brand-baseline
display when outlet context is absent (existing IMP-015 inherit rule), fail-closed single-active-menu
selection, and transitional adapter **do not** require D-371.

Do **not** create D-371.

---

## Formal Acceptance

GTM-R42 records formal acceptance after already-passing independent technical acceptance and founder
UAT PASS for the exact accepted candidate.

```text
Architecture:     ARCHITECTURE_LOCKED
Authorized:       YES
Started:          YES
Complete:         YES
Accepted:         YES
```

```text
IMP-028B_IMPLEMENTATION_AUTHORIZED: YES
+
IMP-028B_IMPLEMENTATION_STARTED: YES
+
IMP-028B_IMPLEMENTATION_COMPLETE: YES
+
IMP-028B_ACCEPTED: YES
=
COMPLETE_AND_ACCEPTED
```

```text
FOUNDER_UAT_REQUIRED: YES
FOUNDER_UAT: PASS
FOUNDER_UAT_COMPLETE: YES
FOUNDER_UAT_CANDIDATE_REPOSITORY: /home/ajoshi/repos/boba-bear-platform
FOUNDER_UAT_CANDIDATE_BRANCH: main
FOUNDER_UAT_CANDIDATE_HEAD: ddca0c319a5e80b2cfe38a2c32481b636277010e
FOUNDER_UAT_CANDIDATE_FINGERPRINT: 1b6be793b4825bb8bd8df57dd47164148b0e68df9a674b12f417e97b5497ecc7
```

Acceptance does not authorize or start IMP-029, implement D-369 / D-370, create `D-371`, or
activate Food Direct families C–J.
