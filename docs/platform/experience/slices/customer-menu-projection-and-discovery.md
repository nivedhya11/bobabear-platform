---
Status: SUPPORTING / CANONICALIZED_AS = IMP-028B
CANDIDATE_CANONICAL_ID: IMP-028B
CANONICALIZED_AS: IMP-028B
Authority: SUPPORTING — rationale retained; canonical product authority is docs/platform/capabilities/IMP-028B-customer-menu-projection-and-discovery.md
Canonical vision: docs/platform/VISION.md
Canonical sequence: docs/platform/ROADMAP.md
Canonical accepted state: docs/platform/STATE.md
Canonical architecture: docs/platform/ARCHITECTURE.md
Canonical decisions: docs/platform/decision-register.md
Canonical capability: docs/platform/capabilities/IMP-028B-customer-menu-projection-and-discovery.md
Planning lock: docs/platform/experience/food-direct-product-architecture-lock.md
Preserved: 2026-08-19
Canonicalized: 2026-08-19
Source checkpoint: HEAD ddca0c319a5e80b2cfe38a2c32481b636277010e
Governance at definition: VISION-1 / GTM-R37 / STATE-R35 / ARCH-R15 / DR-12
Governance at canonicalization: VISION-1 / GTM-R38 / STATE-R36 / ARCH-R15 / DR-12
acceptedThrough: IMP-028A
currentProductSlice: IMP-028B
pendingAcceptance: NONE
nextProductSlice: IMP-029
IMP-029: PLANNED / NOT_STARTED / NOT_AUTHORIZED
IMPLEMENTATION_AUTHORIZED: YES
IMPLEMENTATION_STARTED: NO
FOUNDER_ACCEPTED: NO
CANONICALIZED: YES
ARCHITECTURE_LOCKED: YES
NEXT_FREE_DECISION: D-371 (unused by this slice)
D371_REQUIRED_FOR_CAPABILITY_B_DEFINITION: NO
D371_REQUIRED_FOR_BOUNDED_CAPABILITY_B_IMPLEMENTATION: NO
Governance at architecture lock: VISION-1 / GTM-R39 / STATE-R37 / ARCH-R15 / DR-12
---

# Food Direct — Capability B: Customer Menu Projection + Discovery

```text
SLICE_NAME =
  CUSTOMER_MENU_PROJECTION_AND_DISCOVERY

FOOD_DIRECT_CAPABILITY_FAMILY =
  B

WORKING_NAME =
  Customer Menu Projection + Discovery

CANDIDATE_CANONICAL_ID =
  IMP-028B

CANONICALIZED_AS =
  IMP-028B

SLICE_STATUS =
  SUPPORTING
  CANONICALIZED_AS = IMP-028B
  NOT IMPLEMENTATION_STARTED
  NOT ACCEPTED
  NOT FOUNDER_ACCEPTED
  ARCHITECTURE_LOCKED
  IMPLEMENTATION_AUTHORIZED

IMP-028B IS CANONICAL. IMPLEMENTATION IS AUTHORIZED AND NOT STARTED.

HARD_DEPENDENCY_D368 = YES (TARGET serving authority; implementation not authorized by this file)
HARD_DEPENDENCY_D369 = NO (deferred to family C)
HARD_DEPENDENCY_D370 = NO (deferred to family D)
NEW_DATABASE_SCHEMA_REQUIRED = NO
NEW_MIGRATION_REQUIRED = NO
NEW_COMMERCIAL_AUTHORITY_REQUIRED = NO
NEW_DECISION_REQUIRED = NO
D371_CREATED = NO
D371_REQUIRED_FOR_CAPABILITY_B_DEFINITION = NO
D371_REQUIRED_FOR_BOUNDED_CAPABILITY_B_IMPLEMENTATION = NO
```

This artifact retains the founder/ChatGPT-reviewed working definition for Food Direct capability
family **B** as **SUPPORTING** rationale. GTM-R38 / STATE-R36 canonicalized it as **IMP-028B**.
GTM-R39 / STATE-R37 lock architecture and authorize implementation without starting it.
Canonical product authority:

[`../../capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](../../capabilities/IMP-028B-customer-menu-projection-and-discovery.md)

This file does **not**:

- start IMP-028B implementation;
- consume `D-371`;
- change `acceptedThrough` or `pendingAcceptance`;
- activate or alter IMP-029;
- change D-368 / D-369 / D-370.

Parent lock: [`../food-direct-product-architecture-lock.md`](../food-direct-product-architecture-lock.md).

Verified dependency (parent lock, preserved here): **B SHOULD_PRECEDE_FOR_BACKEND → C-UI**.
C-CONTENT may progress independently. C-UI has a SOFT dependency on content.

---

## 1. Customer outcome

A customer can browse a truthful, easier-to-navigate **BOBA Direct Menu** whose categories,
products, and display price are projected from existing commerce authorities and can add a product
to the existing Cart without the Menu becoming commercial truth.

Availability may be displayed only when the system already possesses an authoritative existing
context required to calculate it.

When such context does not exist, Capability B must **not** invent:

- availability;
- outlet;
- serviceability;
- stock;
- inventory;
- ETA;
- delivery promise.

---

## 2. Problem statement

The accepted `/order` experience is presently served from the transitional static:

```text
src/data/ordering-catalog.json
```

It is not server-backed at runtime.

**D-368** establishes the TARGET customer Menu architecture as a server-backed customer-facing
**READ PROJECTION / STOREFRONT PROJECTION** over existing commerce authorities.

Therefore the current static serving model cannot remain the long-term Menu serving authority.

Accepted IMP-025 is **not** defective or invalid. Its static implementation remains:

```text
TRANSITIONAL CURRENT
```

until an authorized capability replaces it.

Latest read-only discovery (supporting; not a STATE rewrite):

```text
CURRENT_MENU_DATA_SOURCE_TYPE = STATIC
CURRENT_MENU_SERVER_BACKED = NO
SERVER_PROJECTION_REQUIRED = YES
NEW_DATABASE_SCHEMA_REQUIRED = NO
NEW_MIGRATION_REQUIRED = NO
NEW_COMMERCIAL_AUTHORITY_REQUIRED = NO
```

---

## 3. Binding D-368 / ARCH-G19 boundary

Preserve D-368 / ARCH-G19 exactly in substance.

Customer Menu Projection is a **READ MODEL** over existing:

- catalog / product authority;
- Menu graph authority;
- pricing authority;
- assortment / availability authority;
- modifier authority when data exists;
- bundle authority when data exists.

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

Frontend-projected Menu data
≠ final commercial truth
```

Checkout continues to revalidate and creates authoritative payable truth.

---

## 4. Candidate in-scope boundary

Reviewed candidate scope for Capability B. Canonical IMP-028B scope lives in
[`../../capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](../../capabilities/IMP-028B-customer-menu-projection-and-discovery.md).
This supporting file preserves the reviewed boundary.

### A. Customer Menu read projection

A server-backed customer Menu projection composed from existing authoritative commerce data.

Expected inputs, where currently supported:

- existing Menu sections/categories;
- existing Menu entries;
- existing catalog products/variants;
- existing effective display fields;
- existing pricing authority for **DISPLAY** price;
- existing assortment/availability authority when authoritative context exists;
- existing modifier/bundle graph only when actual authoritative content exists.

Do not invent missing modifier content.

### B. Customer-commerce serving

Expose the projection through the existing customer-commerce `/api/v1/*` transport authority
(D-356 / D-359 / D-360).

Do **not** lock the exact HTTP path or payload in this product definition.

`GET /api/v1/menu` may be recorded only as an **implementation candidate**.

### C. `/order` runtime consumption

Move `/order` toward consuming the server-backed projection rather than `ordering-catalog.json` as
long-term storefront runtime delivery.

Static data may remain:

- import inventory;
- fixture;
- generator input;
- transitional adapter;

where genuinely needed.

It must not remain the long-term customer-serving source after Capability B acceptance.

### D. Category discovery

Improve the current forced long-page Menu traversal by giving customers direct, accessible category
navigation derived from authoritative Menu sections.

Persist the **outcome**, not a rigid visual implementation.

Do **not** lock:

- sticky vs non-sticky;
- horizontal vs vertical;
- exact animation;
- exact layout;
- breakpoint behavior;

unless an existing accessibility/UX invariant already requires it.

Sticky category navigation is a **candidate**, not a product-law requirement.

### E. Product discovery

Preserve/enhance existing product cards using projected facts.

The B boundary may include:

- image;
- effective customer display name;
- customer description;
- display price;
- category;
- existing legitimate static/product content;

only where sourced from existing legitimate authorities/content.

### F. Cart entry

Preserve existing:

```text
Add
quantity
Cart
```

behavior using existing Cart APIs and canonical product/variant identity.

Capability B **consumes** Cart authority. It does **not** replace Cart authority.

### G. IMP-028A UX

Preserve:

- Menu → `/order`
- Order Now
- global Cart
- Sign In / My BOBA chrome
- customer terminology
- responsive/accessibility shell

---

## 5. Availability scope

Availability is **OPTIONAL DISPLAY PROJECTION** in the first Capability B slice.

If an authoritative existing outlet/operating context is available through the existing customer
journey, Menu may display projected availability derived from IMP-014 authority.

If no authoritative context exists:

- omit the availability claim;
- do not invent Available/Unavailable;
- do not choose an arbitrary outlet;
- do not create a new location-selection policy;
- do not infer serviceability;
- do not introduce inventory semantics.

This keeps the slice inside D-368 / IMP-014 / IMP-026C authority.

Future question (does **not** block this bounded definition; does **not** consume D-371):

How and when an anonymous customer acquires the appropriate outlet/service context for Menu-level
availability may require later product/backend treatment.

---

## 6. Explicit non-goals

```text
Search
filtering
sorting
Most Ordered / factual popularity ranking
recommendations
personalization
full product-detail/PDP redesign
Food Customize UI
D-369 paid-modifier implementation
modifier-content creation/import where content does not exist
D-370 Cart merge
D-370 logout Cart transition
Offers customer UX
Offers auto-apply
real BrandDrop commerce authority
Favorites
My Usual
Rewards
Order Again
full My BOBA hub
Wear commerce
Culture commerce
new inventory domain
stock authority
ETA / Delivery Promise domain
new Pricing authority/policy
new Availability authority/policy
new serviceability policy
DB schema
migrations
speculative cache/persistence authority
IMP-029 changes
D-371 creation
```

Existing JSON badges/tags such as `new`, `signature`, `bestseller` are **OUTSIDE** this first
bounded B unless they are already legitimate display content and their meaning is
non-factual/non-ranking.

In particular, `bestseller` must not become a factual “Most Ordered” claim without future
authority.

---

## 7. Dependencies

Canonical/current dependencies:

| Authority | Role for B |
|---|---|
| IMP-012 | Catalog / product / variant authority |
| IMP-013 | Menu graph / sections / entries |
| IMP-014 | Assortment / operational availability |
| IMP-015 | Pricing |
| IMP-020 | Cart |
| IMP-021 | Checkout Snapshot / payable revalidation |
| IMP-024 | Customer-commerce `/api/v1/*` façade |
| IMP-025 | Customer ordering identity/parity/current transitional catalog |
| IMP-026C | No invented availability; presentation price ≠ payable truth; sticky Cart/pilot UX preservation |
| IMP-028A | Food Direct chrome and Menu terminology |
| D-368 / ARCH-G19 | Customer Menu read-projection TARGET authority |

Also preserve:

| ID | Status | Implementation |
|---|---|---|
| D-369 | CURRENT | NOT_AUTHORIZED; deferred to Food Customization (family C) |
| D-370 | CURRENT | NOT_AUTHORIZED; deferred to Cart/session hardening (family D) |

---

## 8. Food Direct dependency order

Preserve exactly:

```text
B Menu Projection
SHOULD_PRECEDE_FOR_BACKEND
→ C-UI Customization

C-CONTENT may progress independently.
C-UI has SOFT dependency on content.
```

Do not reverse this relationship.

Rationale: C-UI should consume the B Menu projection rather than introduce a second customer
storefront read model.

---

## 9. Deferred to capability C

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

## 10. Deferred to later Food Direct capabilities

Preserve the existing family architecture. Do not pull these into B:

| Family | Name |
|---|---|
| D | Cart / Session Hardening |
| E | Checkout / Payment UX Hardening |
| F | My BOBA Foundation |
| G | Order Again |
| H | Offers |
| I | Real Drops |
| J | Favorites / My Usual |

---

## 11. Proposed acceptance surface

These are the reviewed proposed acceptance criteria. Canonical IMP-028B ACs are **AC-01 through
AC-12** in
[`../../capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](../../capabilities/IMP-028B-customer-menu-projection-and-discovery.md).
This supporting file preserves the original AC-B01–AC-B12 wording as provenance.

### AC-B01 — SERVER-BACKED MENU

Customer Menu runtime serving uses the D-368 server-backed customer read projection through the
existing customer-commerce façade.

### AC-B02 — CANONICAL IDENTITY

Customer-visible categories/products derive from existing Menu/catalog authorities.

No frontend-created commercial identity.

### AC-B03 — TRANSITIONAL STATIC SERVING RETIRED

`ordering-catalog.json` is no longer the long-term `/order` storefront runtime source after B
acceptance.

It may remain only for legitimate transitional/import/test purposes.

### AC-B04 — DISPLAY PRICE INTEGRITY

Customer Menu display price derives from existing pricing authority.

It remains display/projection information.

Checkout Snapshot remains final payable truth.

### AC-B05 — AVAILABILITY INTEGRITY

Availability is displayed only when derived from existing authoritative availability + context.

No availability is invented when authoritative context is absent.

### AC-B06 — CATEGORY DISCOVERY

Customers can navigate Menu categories directly using category structure derived from canonical
Menu sections instead of being forced to traverse the entire Menu sequentially.

### AC-B07 — EXISTING CART AUTHORITY

Add and quantity operations continue through existing Cart authority using canonical
product/variant identity.

### AC-B08 — IMP-028A UX PRESERVED

Menu destination, Order Now, Cart, chrome, terminology, responsiveness and accessibility do not
regress.

### AC-B09 — COMMERCIAL AUTHORITY PRESERVED

Customer Menu Projection does not become:

Pricing, Availability, Cart, Checkout Snapshot, Payment, or Order authority.

### AC-B10 — NO D-369 / D-370 LEAKAGE

No Food customization/paid-modifier implementation is introduced.

No Cart identity merge/logout reconciliation is introduced.

### AC-B11 — NO NEW PERSISTENCE AUTHORITY

Capability B requires no new DB schema or migration merely to provide the customer Menu
projection.

### AC-B12 — DEFERRED DISCOVERY REMAINS DEFERRED

Search, ranking, personalization, Offers and later-family capability behavior are not introduced.

Do **not** treat these supporting AC-B labels as a second competing AC set. Canonical IDs are
AC-01 through AC-12.

---

## 12. Open implementation questions

OPEN / IMPLEMENTATION-BOUNDARY questions. They are **not** decision blockers and do **not**
require D-371.

1. **Exact customer Menu HTTP endpoint and response DTO.**
   D-368 permits the `/api/v1/*` façade but does not lock the payload.

2. **Runtime projection composition strategy.**
   Direct query vs service-layer composition vs transitional adapter must follow existing
   architecture and implementation evidence.

3. **Availability context.**
   Which existing outlet/operating context can be legitimately used before the customer supplies a
   destination? First slice may omit availability when context is absent.

4. **Exact category navigation visual pattern.**
   Sticky category navigation is a candidate, not a product-law requirement.

5. **Static transition mechanism.**
   Determine whether runtime switches directly or uses a temporary adapter while preserving
   accepted parity.

6. **Existing unused content tags/badges.**
   Keep outside first B unless proven legitimate and non-ranking.

Do not convert implementation questions into D-371 decisions without a genuine binding
architecture/policy gap.

---

## 13. D-371 trace

```text
D371_REQUIRED_FOR_CAPABILITY_B_DEFINITION = NO
D371_REQUIRED_FOR_BOUNDED_CAPABILITY_B_IMPLEMENTATION = NO
D-371 = UNUSED
```

D-368 / ARCH-G19 already settle:

- server-backed read projection;
- source-of-truth boundary;
- static transition target;
- display-price semantics;
- display-availability semantics;
- customer-commerce façade family.

Do **not** create D-371.

Potential future issues that **MAY** require a new binding decision only if brought into scope:

- factual Most Ordered/ranking authority;
- a new ranking/recommendation authority;
- Menu becoming a price or availability decision;
- new inventory semantics;
- new delivery-promise/ETA authority.

Those are explicitly outside Capability B.

---

## 14. Candidate canonical ID trace

```text
CANDIDATE_CANONICAL_ID = IMP-028B
CANONICALIZED_AS = IMP-028B
IMP-028B IS CANONICAL. IMPLEMENTATION IS AUTHORIZED AND NOT STARTED.
```

Basis:

- IMP suffix grammar supports `IMP-\d+[A-Z]?`;
- IMP-028A is established precedent;
- IMP-029 is already Operations Console API;
- IMP-030 through IMP-040 have existing published meanings;
- IMP-028B was unused before GTM-R38.

Canonical capability:
[`../../capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](../../capabilities/IMP-028B-customer-menu-projection-and-discovery.md).

---

## 15. Explicit non-activation

```text
PRODUCT_SLICE_ACTIVATED = YES (GTM-R38; currentProductSlice = IMP-028B)
IMP028B_CANONICALIZED = YES
IMP028B_ARCHITECTURE_LOCKED = YES
IMP028B_IMPLEMENTATION_AUTHORIZED = YES
IMP028B_IMPLEMENTATION_STARTED = YES
IMP028B_IMPLEMENTATION_COMPLETE = YES
IMP028B_ACCEPTED = NO
IMP029_STARTED = NO
IMP029_RETARGETED = NO
D371_CREATED = NO
ACCEPTED_THROUGH_CHANGED = NO
PENDING_ACCEPTANCE_CHANGED = NO
```

IMP-029 remains Operations Console API, `PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`.

---

## Provenance

Founder/ChatGPT-reviewed working definition persisted 2026-08-19 into SUPPORTING Food Direct
product/experience architecture. Canonicalized 2026-08-19 as IMP-028B (GTM-R38 / STATE-R36).
Architecture locked and implementation authorized 2026-08-19 (GTM-R39 / STATE-R37) without starting
implementation. Parent lock, family map, D-368 /
ARCH-G19, accepted IMP-012–016 / IMP-020–021 / IMP-024 / IMP-025 / IMP-026C / IMP-028A, and
latest read-only Capability B discovery.

Checkpoint: `/home/ajoshi/repos/boba-bear-website-acceptance` at
`ddca0c319a5e80b2cfe38a2c32481b636277010e` on 2026-08-19.

```text
CAPABILITY_B_SUPPORTING_STATUS = SUPPORTING / CANONICALIZED_AS = IMP-028B
CANDIDATE_CANONICAL_ID = IMP-028B
CANONICALIZED_AS = IMP-028B
IMP028B_CANONICALIZED = YES
IMP028B_ARCHITECTURE_LOCKED = YES
IMP028B_IMPLEMENTATION_AUTHORIZED = YES
IMP028B_IMPLEMENTATION_STARTED = YES
IMP028B_IMPLEMENTATION_COMPLETE = YES
IMP028B_ACCEPTED = NO
IMP029_STARTED = NO
D371_CREATED = NO
```
