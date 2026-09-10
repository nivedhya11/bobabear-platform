<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-036F",
  "title": "Catalog, Menu, Pricing & Promotions Management",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "architectureFitResult": "PASS",
  "implementation": "NOT_AUTHORIZED / NOT_STARTED",
  "implementationAuthorized": false,
  "implementationStarted": false,
  "impAccepted": false,
  "founderUATRequired": true,
  "schemaChangeRequired": true,
  "lastReviewed": "2026-09-10",
  "productDefinition": "PD-IMP-036F-DRAFT-1",
  "bindingDecisions": ["ADR-005", "ADR-006", "ADR-007", "ADR-008", "D-358", "D-368", "D-372", "D-373"],
  "dependsOn": ["IMP-011", "IMP-014", "IMP-015", "IMP-019", "IMP-028B", "IMP-029", "IMP-030", "IMP-035", "IMP-036A", "IMP-036C", "IMP-036D", "IMP-036E"]
}
-->

# IMP-036F — Catalog, Menu, Pricing & Promotions Management

## Capability Architecture — ARCHITECTURE_LOCKED / IMPLEMENTATION NOT AUTHORIZED

This document is the **locked capability architecture** for IMP-036F. It began as an Architecture
Fit candidate, received independent Architecture Fit PASS, and is now the sole CURRENT
capability-architecture authority for this slice. Supporting experience planning must not compete
with this lock.

```text
ARCHITECTURE_FIT = PASS
IMP036F_ARCHITECTURE_LOCKED = YES
ARCHITECTURE_LOCKED = YES
IMPLEMENTATION_AUTHORIZED = NO
IMPLEMENTATION_STARTED = NO
IMP036F_ACCEPTED = NO
IMP036G_ACTIVATED = NO
CANONICAL_ROADMAP_STATE = GTM-R119 / STATE-R117
PRODUCT_DEFINITION = PD-IMP-036F-DRAFT-1 APPROVED (Gate PASS; Architecture Fit PASS; architecture locked)
```

Architecture lock does **not** authorize implementation, schema migration execution, merge,
deployment, Founder UAT, or IMP acceptance. Implementation authorization remains a separate later
gate.

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Formal ROADMAP lifecycle | `ARCHITECTURE_LOCKED` / `NOT_AUTHORIZED` / `NOT_STARTED` (`IMP036F_ACTIVATED: YES`) |
| Product Definition | `PD-IMP-036F-DRAFT-1` **APPROVED**; Product Definition Gate **PASS** |
| Architecture Fit | **PASS** (performed; locked) |
| Implementation | **NOT_AUTHORIZED** / **NOT_STARTED** |
| Schema change required (architecture conclusion) | **YES** (not authorized to execute) |
| New D-number | **NO** (`D374_REQUIRED_FOR_IMP036F_LOCK = NO`) |
| Global ARCH bump | **NO** (`ARCH_R20_REQUIRED_FOR_IMP036F_LOCK = NO`) |
| New permission / role / auth model / deployable | **NO** |
| Founder UAT required (future acceptance) | **YES** |

### Architecture lock provenance

```text
ARCHITECTURE_FIT = PASS
ARCHITECTURE_REVIEWED_CANDIDATE_HEAD = 9ae06d6267e997223b1995124540974215ee17fd
ARCHITECTURE_REVIEWED_CANDIDATE_TREE = 55adb287bb0eb77240a6becdc16fed2d504ba144
INDEPENDENT_ARCHITECTURE_REVIEW = 5169723968
INDEPENDENT_ARCHITECTURE_REVIEW_RESULT = PASS
EXACT_HEAD_CI_RUN = 34501448266
EXACT_HEAD_CI_RESULT = SUCCESS
ARCHITECTURE_LOCK_DATE = 2026-09-10
```

The independently reviewed Architecture Fit candidate is specifically head `9ae06d62…` / tree
`55adb287…`. This lock-persistence revision is a subsequent governance commit and is **not** the
artifact reviewed by `5169723968`.

---

## 1. Authority / status

Verified base for the reviewed Architecture Fit candidate investigation (preserved):

```text
Repository: /home/ajoshi/repos/boba-bear-platform
origin/main HEAD: 1f59333d1a3bfe0dfecde908245306e2edacd834
origin/main tree: 284800a71a20d27c01b9c0cec7cadb45bb5d059b
VISION = VISION-1
ROADMAP (at candidate review) = GTM-R118
STATE (at candidate review) = STATE-R116
ROADMAP (after lock persistence) = GTM-R119
STATE (after lock persistence) = STATE-R117
ARCHITECTURE = ARCH-R19
DECISION REGISTER = DR-15
PRODUCT DELIVERY = PD-1
TESTING = TEST-1
PERSONA = PERSONA-1
GOLDEN JOURNEYS = GJ-1
Product Definition = docs/platform/product/IMP-036F/product-definition.md (APPROVED)
```

Canonical ARCH-R19 / DR-15 / PD-1 / TEST-1 / VISION-1 remain unchanged. Supporting plan remains
non-authoritative:
`docs/platform/experience/enterprise-experience/IMP-036F-catalog-menu-pricing-promotions.md`.

Historical note: this artifact began as an Architecture Fit candidate with architectureLock
NOT_LOCKED and CAPABILITY_ARCHITECTURE_CANDIDATE authority during pre-lock review. After
independent review `5169723968` PASS, lock persistence converts it to CURRENT
CAPABILITY_ARCHITECTURE with ARCHITECTURE_LOCKED.

---

## 2. Purpose and approved Product Definition reference

Support the approved IMP-036F business outcome without inventing product behaviour:

> Authorized Brand commercial operator completes one coherent job: introduce/maintain offering →
> organize Menu → decide Assortment → configure Pricing / Promotions / delivery tariff → review
> consequence → deliberately publish/effect → verify customer truth → diagnose sellability.

Preserve all `DISC-F-001` … `DISC-F-011` and all mandatory ACs in `PD-IMP-036F-DRAFT-1`.

`product_semantics_changed = NO`

---

## 3. Preserved global invariants

| Invariant | Preservation |
|---|---|
| ARCH-G01 / D-359 | Static Next.js export; no dynamic Next business APIs / Server Actions / Route Handlers as authority |
| ARCH-G02 / ARCH-G14 | No new deployable service, queue, or broker |
| ARCH-G03/G04/G08/G23/G25 | Trusted workforce principal; deny-by-default; no caller-forged scope/roles |
| ARCH-G05 | Immutable Checkout / order monetary + catalog snapshots |
| ARCH-G09 | Material commercial writes must not silently last-write-wins |
| ARCH-G11 | Browser never authoritative for money/eligibility/auth |
| ARCH-G13 | PostgreSQL authoritative persistence |
| ARCH-G19 / D-368 | Customer Menu is READ projection only |
| D-372 | Workforce business ops on `/api/operations/v1/*` |
| D-373 | Admin on `/api/admin/v1/*` same operations process |
| ADR-005 | Permission keys + resource scope; no role-name bypass |
| ADR-006 | Catalog / Menu / Assortment / Availability / Pricing remain distinct; draft→publish intent |
| ADR-007 | Pricing owns money; INR/paise; promotions lifecycle as CURRENT |
| ADR-008 | Cart intent vs Checkout Snapshot payable truth |
| IMP-036E Founder-A | Assortment Brand authority; Store Assortment manage surface = NO |
| Topology | Static Next → Nginx → existing Node façades → Application → Domain → PostgreSQL |

```text
NEW_SERVICE_REQUIRED = NO
NEW_AUTH_MODEL_REQUIRED = NO
NEW_COMMERCIAL_MICROSERVICE = NO
SECOND_PRICING_OR_CATALOG_AUTHORITY = NO
```

---

## 4. Architecture-fit verdict

```text
ARCHITECTURE_FIT = PASS
ARCHITECTURE_FIT_CANDIDATE_RESULT = PASS
IMP036F_ARCHITECTURE_LOCKED = YES
```

PASS means: every mandatory V1 story has a technically viable fit under existing global architecture;
permission/resource mapping is resolved (including delivery tariff); Catalog publication uses one
locked `ENTITY_CONTENT_REVISION` model covering the full customer-affecting Catalog/modifier graph;
Menu publication uses atomic effective-revision switch (no in-place ACTIVE graph authoring) while
preserving stable Menu / section / placement logical identities; consequence review is version-bound
to effect for Catalog, Menu, Pricing, Promotion, and Coupon; PriceBook aggregate revision includes
child monetary rows; Promotion Benefit/Targets participate in Promotion aggregate revision; Coupon
lifecycle concurrency is explicit; all 64 mandatory Product Definition ACs are traced; material
commercial writes have precise concurrency contracts; persistence/audit consequences are explicit;
implementation boundaries are precise enough for independent review.

Independent Architecture Fit review `5169723968` accepted this Fit. Canonical lock is now persisted
at GTM-R119 / STATE-R117. PASS + lock still does **not** mean implementation authorization or
acceptance.

---

## 5. Domain-authority map

| Concern | Authority owner | Notes |
|---|---|---|
| Product / Variant / Modifier structure | Catalog | Brand; ADR-006 |
| Menu sections/entries/display/one-active Menu | Menu | Brand; `publishMenuRevision` atomic effective switch |
| Assortment include/exclude | Assortment | Brand; IMP-036E preserved |
| Availability / pause / hours | Assortment/Operating | Outlet; Store Operations (IMP-036E) — inspect context only in F commercial journey |
| Variant / modifier / charge money | Pricing | Brand; ADR-007 |
| Customer delivery tariff (bands / free threshold) | **Pricing** (business) | Stored on serviceability config row; auth = `pricing.*` Brand |
| Geographic eligibility / distance policy | Serviceability | Outlet; not customer price |
| Promotions / Coupons | Promotions | Brand; existing lifecycles |
| Tax / Charges definitions | Pricing (tax/charges) | V1 **read/inspect only** |
| Customer Menu / orderability display | D-368 projection | Read model over authorities |
| Consequence review / diagnosis | Composition reads | Non-authoritative projections |

---

## 6. Transport topology

```text
Static Next.js workforce UI
  → Nginx
  → operations process (existing)
       ├── /api/admin/v1/*          Brand commercial authoring (IMP-036F writes + commercial reads)
       ├── /api/operations/v1/*     Store operational (IMP-036E; Availability/hours/serviceability geo)
       └── (no new /api/commercial/*)
  → Application operations / administration use-cases
  → Domain modules (catalog, menu, assortment, pricing, promotions, serviceability storage helpers)
  → PostgreSQL

Customer verification:
  → /api/v1/* customer-commerce façade (existing Menu/pricing/checkout evaluation)
```

### Transport classification

| Concern | Classification | Façade |
|---|---|---|
| Catalog Product/Variant/Modifier association | `ADMIN_FACADE` | `/api/admin/v1/*` |
| Menu organization / publish | `ADMIN_FACADE` | `/api/admin/v1/*` |
| Brand Assortment mutation | `ADMIN_FACADE` | `/api/admin/v1/*` |
| Pricing price-book authoring / activate | `ADMIN_FACADE` | `/api/admin/v1/*` |
| Promotions / Coupons manage / activate | `ADMIN_FACADE` | `/api/admin/v1/*` |
| Delivery tariff read/mutate | `ADMIN_FACADE` | `/api/admin/v1/*` (Pricing auth) |
| Tax/Charges inspection reads | `ADMIN_FACADE` | `/api/admin/v1/*` |
| Consequence / diagnosis / commercial audit composition | `ADMIN_FACADE` | `/api/admin/v1/*` |
| Store Assortment read / Availability / operating / geo serviceability | `OPERATIONS_FACADE` | existing `/api/operations/v1/outlets/{id}/…` |
| Customer Menu / checkout evaluation | `NO_NEW_TRANSPORT` | existing `/api/v1/*` |

```text
commercial_write_facade = /api/admin/v1/*
store_operational_facade = /api/operations/v1/*
customer_verification_facade = /api/v1/*
new_facade_created = NO
new_process_created = NO
```

Rationale (semantic, not UI location): Brand commercial configuration was deferred by IMP-035 to
Admin (`D-373`). Outlet-operational Availability/hours/geo remain Operations (`D-372`, IMP-036E).
Customer consequence remains customer-commerce reads (`D-368`).

---

## 7. Trust / session boundary

Reuse IMP-010 / D-372 / D-373 workforce session → principal. No new auth realm or session model.

```text
Browser permission chips = navigation only
Server authorize(permission, resource) = authoritative
Caller-supplied brandId = never proof of authorization
Outlet-selected commercial Brand action:
  request outletId → load Outlet server-side → derive Brand → authorize Brand → mutate
```

CSRF/Origin mutation protection remains as accepted for Admin/Operations mutations.

---

## 8. Authorization / resource matrix

Verified source: `src/shared/access-control/catalog.ts` (`PERMISSION_KEYS`, `PERMISSION_TARGET_KIND`).

| Permission | Target kind |
|---|---|
| `catalog.read` / `catalog.manage` | brand |
| `menu.read` / `menu.manage` | brand |
| `assortment.read` / `assortment.manage` / `assortment.audit.read` | brand |
| `availability.*` | outlet |
| `pricing.read` / `pricing.manage` / `pricing.audit.read` | brand |
| `charges.read` / `charges.manage` | brand |
| `tax.read` / `tax.manage` | brand |
| `promotions.read` / `promotions.manage` / `promotions.activate` / `promotions.audit.read` | brand |
| `coupons.read` / `coupons.manage` | brand |
| `serviceability.read` / `serviceability.manage` | outlet |

### Story / action → permission → resource

| Story / action class | Permission | Authorization resource |
|---|---|---|
| US-001 inspect commercial offering | `catalog.read`, `menu.read`, `assortment.read`, `pricing.read`, `promotions.read` (+ `availability.read` / `serviceability.read` for outlet context where needed) | Brand (and Outlet for outlet-targeted context reads) |
| US-002/003/004 Catalog draft/edit/associate/lifecycle | `catalog.manage` | Brand |
| US-005 Menu organize / display / activate | `menu.manage` | Brand |
| US-006 Brand Assortment mutate | `assortment.manage` | Brand |
| US-007 Pricing author/activate | `pricing.manage` (+ `pricing.read` for inspect) | Brand |
| US-008 Promotion/Coupon author | `promotions.manage` / `coupons.manage`; activate: `promotions.activate` where required | Brand |
| US-009 Delivery tariff read | `pricing.read` | Brand derived from Outlet |
| US-009 Delivery tariff mutate | `pricing.manage` | Brand derived from Outlet |
| US-010 Consequence review | read permissions for affected domains; no separate permission | composed Brand (+Outlet) reads |
| US-011 Publish/effect | domain manage (+ activate where Pricing/Promotion) | Brand |
| US-012 Customer verify | no workforce write; uses customer façade; workforce may hold commercial read | Brand/outlet context only |
| US-013 Diagnosis | partial authorized reads; fail closed on missing authority | per contributing domain |
| US-014 Media view | covered by `menu.read` / `catalog.read` of existing `imagePath` | Brand |
| US-015 Device experience | UI only; same server auth | n/a |
| US-016 Tax/Charges inspect | `tax.read` / `charges.read` | Brand |

```text
Outlet_Manager_Brand_Assortment_manage = NO
STORE_ASSORTMENT_MANAGE_SURFACE = NO
serviceability_manage_authorizes_tariff = NO
NEW_PERMISSION_REQUIRED = NO
```

Known catalog inconsistency (IMP-036E): `outlet_manager` lists `assortment.manage` /
`pricing.manage` with exact outlet mapping, but target kinds remain **brand**. Exact outlet
assignment does **not** grant Brand authority. Architecture Fit must not treat catalog listing as
effective Brand Assortment/Pricing authority.

V1 does **not** architecture-lock ordinary commercial workflow use of `charges.manage` /
`tax.manage`.

---

## 9. Catalog publication / revision architecture

### ADR-006 preservation

ADR-006 binding intent:

```text
Edit draft → Validate catalog structure → Publish → Create/activate effective revision
→ Customer Menu resolves new effective truth
```

Exact revision storage was left open by ADR-006. This candidate **locks one** capability-local
persistence/publication model without amending ADR-006 and without changing global invariants.

```text
ADR006_preserved = YES
architecture_gap_resolved = YES (candidate design; not implemented)
CATALOG_PUBLICATION_MODEL = ENTITY_CONTENT_REVISION
CATALOG_PUBLICATION_MODEL_ALTERNATIVES_OPEN = NO
```

### Locked model: `ENTITY_CONTENT_REVISION`

```text
WHAT_IS_VERSIONED =
  Product content
  Variant content
  Modifier Group content
  Modifier Option content
  Group↔Option binding content (quantities, position)
  Variant↔Modifier Group binding content (totals, position)
  (lifecycle transitions remain Catalog lifecycle commands; customer-affecting effect of
   activate/retire on these entities participates in the same publication envelope when the
   change would alter customer-visible/orderable graph — see field inventory)

WHERE_DRAFT_CONTENT_RESIDES =
  Catalog-owned non-effective ENTITY_CONTENT_REVISION store keyed by stable entity/binding id
  + content_revision.
  Draft-lifecycle primary rows may continue in-row authoring until first customer-effective
  publication.
  ACTIVE customer/structure-affecting fields are NEVER mutated in place on the effective row.

STABLE_IDENTITY =
  Product / Variant / ModifierGroup / ModifierOption / binding row identities remain stable
  across publications. No identity churn. No second Catalog authority. No superseding-row
  model that replaces stable entity ids.

HOW_ONE_EFFECTIVE_GRAPH_IS_SELECTED =
  Exactly one effective content revision per stable Catalog entity/binding is customer-visible.
  Customer projection and checkout revalidation resolve effective content only.

HOW_PUBLISH_IS_ATOMIC =
  publishCatalogContentChange (Application/Admin deliberate command) runs in one DB transaction:
    validate complete product graph (Product + Variants + Modifier Groups/Options + bindings)
    → CAS expectedContentRevision / publish envelope revision
    → switch effective revision pointers for all entities in the publish envelope
    → write Catalog mutation/publish audit
  Half-published graphs are impossible after commit failure (transaction abort).

HOW_STALE_PUBLISH_IS_REJECTED =
  EXPECTED_VERSION_REQUIRED = YES
  mismatch → deterministic conflict (no silent LWW)

HOW_CUSTOMER_PROJECTION_RESOLVES_EFFECTIVE_CONTENT =
  D-368 live read of one effective Menu + ACTIVE Catalog entities’ effective content revisions
  at request time (no second customer commercial projection store)

HOW_CHECKOUT_ORDER_SNAPSHOTS_REMAIN_IMMUTABLE =
  Checkout/Order catalog snapshots remain immutable historical payloads; later effective
  revision switches do not rewrite sealed snapshots (ARCH-G05)
```

Rejected alternatives (not left to implementation):

```text
REJECTED_CATALOG_MODEL_CHOICE = superseding-row identity churn
REJECTED_CATALOG_MODEL_CHOICE = “draft overlay OR superseding draft publish path” as open OR
REJECTED_CATALOG_MODEL_CHOICE = ACTIVE in-place customer/structure-affecting writes
```

### ACTIVE mutable field inventory (VERIFIED)

| Entity | Mutable field / binding (ACTIVE allowed today) | Customer display | Customization / defaults | Quantity / cardinality | Orderability / checkout | Classification |
|---|---|---|---|---|---|---|
| Product | `name` | YES (Menu `effectiveEntryDisplay` fallback) | NO | NO | Indirect (identity display) | **CUSTOMER_AFFECTING** |
| Product | `description` | YES (display fallback) | NO | NO | Indirect | **CUSTOMER_AFFECTING** |
| Variant | `name` | YES | YES (label) | NO | Indirect | **CUSTOMER_AFFECTING** |
| Variant | `description` | Possible | Possible | NO | Indirect | **CUSTOMER_AFFECTING** |
| Variant | `isDefault` | Indirect | YES | NO | YES (`pickDefaultActiveVariant`) | **CUSTOMER_AFFECTING** |
| Variant | `isSelectorVisible` | Not used by D-368 projector today | Validation / eligibility | NO | Possible | **STRUCTURE_AFFECTING** |
| Modifier Group | `name` | YES (`loadCustomerMenuModifiersByVariantId`) | YES (group label) | NO | Indirect | **CUSTOMER_AFFECTING** |
| Modifier Group | `description` | Possible | Possible | NO | Indirect | **CUSTOMER_AFFECTING** |
| Modifier Option | `name` | YES | YES (option label) | NO | Indirect (labels/checkout labels) | **CUSTOMER_AFFECTING** |
| Modifier Option | `description` | Possible | Possible | NO | Indirect | **CUSTOMER_AFFECTING** |
| Group↔Option binding | `minQuantity` / `maxQuantity` | YES (projected) | YES | **YES** | Structure for valid customization | **CUSTOMER_AFFECTING** + **STRUCTURE_AFFECTING** |
| Group↔Option binding | `defaultQuantity` | YES (defaults) | **YES** | YES | Default behaviour | **CUSTOMER_AFFECTING** |
| Group↔Option binding | `position` | YES (order) | Presentation | NO | Indirect | **CUSTOMER_AFFECTING** |
| Group↔Option binding | lifecycle activate/retire | Omits non-active from projection | YES | YES | Orderability of option | **STRUCTURE_AFFECTING** |
| Variant↔Modifier Group | `minTotalQuantity` / `maxTotalQuantity` | YES | YES | **YES** | Valid customization totals | **CUSTOMER_AFFECTING** + **STRUCTURE_AFFECTING** |
| Variant↔Modifier Group | `position` | YES | Presentation | NO | Indirect | **CUSTOMER_AFFECTING** |
| Variant↔Modifier Group | lifecycle activate/retire | Omits non-active groups | YES | YES | Orderability of group | **STRUCTURE_AFFECTING** |

Immutable after create (VERIFIED): Product/Variant `code`, kind, brand/product linkage; binding
pair uniqueness constraints remain.

```text
ACTIVE_CUSTOMER_OR_STRUCTURE_AFFECTING_CATALOG_MUTATION → DIRECT_IN_PLACE_WRITE = REJECT

PUBLICATION_ENVELOPE =
  PRODUCT
  VARIANT
  MODIFIER_GROUP
  MODIFIER_OPTION
  GROUP_OPTION_BINDING
  VARIANT_MODIFIER_GROUP_BINDING
```

Harmless metadata fields are not invented here. Every ACTIVE-mutable field above is classified from
verified downstream impact (customer Menu modifier loader, product/variant display, checkout
merchandise/label paths). Fields with no verified customer/structure impact are not listed as
publication-gated solely by assumption.

### Write paths that bypass ADR-006 publication semantics (VERIFIED)

1. `updateProduct` — ACTIVE `name`/`description` (`src/server/catalog/products.ts`)
2. `updateVariant` — ACTIVE `name`/`description`/`isDefault`/`isSelectorVisible`
3. `updateModifierGroup` — ACTIVE `name`/`description` (`src/server/catalog/modifiers.ts`)
4. `updateModifierOption` — ACTIVE `name`/`description`
5. `updateModifierGroupOption` — ACTIVE `minQuantity`/`maxQuantity`/`defaultQuantity`/`position`
6. `updateVariantModifierGroup` — ACTIVE `minTotalQuantity`/`maxTotalQuantity`/`position`
7. Lifecycle activate/retire on modifier groups/options/bindings can change customer-visible
   orderability immediately when rows flip to/from `active` without a Catalog publish envelope
8. No catalog content `ENTITY_CONTENT_REVISION` store / publish command / catalog mutation audit
9. Menu activation exists, but Catalog ACTIVE in-place edits do not require Catalog republish
10. Bootstrap/import paths (`imp028c-modifiers/bootstrap.ts`, `menu-import/importer.ts`) are not
    ordinary commercial write APIs; Fit does not authorize them as V1 commercial bypasses
11. No Admin HTTP façade today (domain callable without publication gate wrapper)

### Chosen compliant architecture (locked)

```text
CATALOG_REVISION_STRATEGY = ENTITY_CONTENT_REVISION
ACTIVE_CUSTOMER_AFFECTING_FIELD_GATE = YES
VALIDATE_THEN_PUBLISH_COMMAND = publishCatalogContentChange
CATALOG_MUTATION_AUDIT = YES (new append-only audit)

SCHEMA_CHANGE_REQUIRED = YES
MIGRATION_REQUIRED = YES (architecture conclusion only; not authorized now)

PUBLICATION_COMMAND_BOUNDARY =
  Application/Admin:
    validateCatalogPublication(completeProductGraph)
    publishCatalogContentChange(expectedContentRevision, …)
  Domain:
    refuse ACTIVE in-place mutation of CUSTOMER_AFFECTING / STRUCTURE_AFFECTING fields
      listed in the inventory (including modifier graph)
    apply publication by atomically switching effective ENTITY_CONTENT_REVISION pointers
      for the publish envelope inside one transaction

CUSTOMER_PROJECTION_REVISION_SOURCE =
  D-368 live read of one effective Menu + effective Catalog content revisions
  (no second customer commercial projection store)

HISTORICAL_REFERENCE_BEHAVIOR =
  Checkout/order catalog snapshots remain immutable; do not rewrite history

CONCURRENCY_MODEL =
  contentRevision / publish-envelope revision on Catalog entities and revision store
  EXPECTED_VERSION_REQUIRED = YES on draft revision saves that participate in publication
    and on publishCatalogContentChange
  CONDITIONAL_WRITE = UPDATE … WHERE id = ? AND content_revision = expected
  STALE_RESULT = deterministic conflict
  ATOMIC_BOUNDARY = publishCatalogContentChange transaction
```

```text
GLOBAL_ARCHITECTURE_DECISION_REQUIRED = NO
ADR_006_AMENDMENT_REQUIRED = NO
SECOND_CATALOG_AUTHORITY = NO
```

---

## 10. Menu authoring architecture

Current schema (`menus`, `menu_sections`, `menu_entries`): lifecycle draft|active|retired;
`position`; entry `displayName` / `displayDescription` / `imagePath`.

**VERIFIED gap:** `activateMenu` only transitions the selected Menu `draft → active` and does **not**
atomically retire/supersede another active Menu (`src/server/catalog/menu/menus.ts`). Customer load
requires exactly one active Menu (`loadActiveMenuForBrand`) and fails if zero or many. Newly proposed
update/reorder/display commands must not make ACTIVE graph edits customer-visible immediately.

```text
ACTIVE_MENU_GRAPH_IN_PLACE_AUTHORING = NO

MENU_AUTHORING =
  edits occur against non-customer-visible draft/revision state only

MENU_PUBLISH =
  validate complete draft graph
  → consequence review already completed at product/application layer
  → atomic publication transaction
  → exactly one effective active Menu/revision after commit

CUSTOMER_MENU =
  never observes two active effective Menus
  never observes half-published graph
  never observes draft reorder/display changes

STALE_PUBLISH = deterministic conflict
```

### Locked Menu publication strategy

```text
MENU_REVISION_STRATEGY =
  STABLE_MENU_IDENTITY
  + VERSIONED_MENU_GRAPH / MENU_REVISION
  + ATOMIC_EFFECTIVE_REVISION_SWITCH

STABLE_MENU_IDENTITY = YES
STABLE_MENU_SECTION_LOGICAL_IDENTITY = YES
STABLE_MENU_ENTRY_PLACEMENT_LOGICAL_IDENTITY = YES

MENU_LOGICAL_IDENTITY_VS_REVISION_ROW =
  Physical MENU_REVISION / revision-row identifiers MAY be distinct from logical identities.
  Editing or reordering a section does not create a new logical section identity.
  Editing, moving, or display-overriding a placement does not create a new logical placement identity.
  Publishing a new Menu revision does not churn logical section or placement IDs solely because a
  new revision is published.
  Retire/remove followed by genuinely creating a new section/placement MAY create a new logical
  identity under normal Menu domain rules (ADR-006 identifiers are not reused).

ADR-006_STABLE_INTERNAL_IDENTIFIERS = PRESERVED for menu, menu section, and product placement

MENU_DRAFT_STORAGE =
  Menu-owned non-effective MENU_REVISION graph (sections, entries, positions, display overrides)
  keyed by stable menuId + menuRevision, preserving stable logical section and placement identities
  across revision rows.
  Material update/reorder/display commands write only to non-effective revision state.

MENU_PUBLICATION_COMMAND = publishMenuRevision
  Deliberate Brand Menu cutover command.
  Current activateMenu (activate-selected-only; no atomic supersede) is NOT sufficient and is NOT
  reused as-is.
  publishMenuRevision redesigns the publication contract:
    1. validate complete draft graph (assertMenuGraphReady family)
    2. require expectedMenuRevision (CAS)
    3. atomically switch Brand effective (menuId, menuRevision) pointer / exclusive effective state
    4. guarantee exactly one effective Menu/revision for the Brand after commit
    5. write Menu publication audit
  First customer cutover and subsequent republication both use publishMenuRevision.
  activateMenu must not remain an independent unsafe public path that can create a second active
  Menu; it is subsumed/replaced by publishMenuRevision for V1 commercial publication.

MENU_EFFECTIVE_POINTER_OR_STATE =
  Brand → exactly one effective (menuId, menuRevision)
  Customer projection resolves that single effective graph only

MENU_ATOMICITY =
  One DB transaction for publish; no half-published graph; never two effective Menus

MENU_CONCURRENCY =
  EXPECTED_VERSION_REQUIRED = YES
  CONDITIONAL_WRITE = revision CAS on draft material edits and on publishMenuRevision
  STALE_RESULT = deterministic conflict
  ATOMIC_BOUNDARY = publishMenuRevision transaction

MENU_AUDIT =
  Menu mutation/publish audit events (add; currently MUTATION_AUDIT_GAP)

SCHEMA_CHANGE_REQUIRED = YES
  (MENU_REVISION storage + Brand effective pointer / exclusive effective state;
   exact table/column names are implementation detail; semantics above are locked)
```

| Approved action | Current command | Fit |
|---|---|---|
| Create section | `createMenuSection` | REUSE into draft/revision graph |
| Rename/update section | **NOT_FOUND** | ADD_BOUNDED_DOMAIN_COMMAND `updateMenuSection` (**draft/revision only**) |
| Reorder section | **NOT_FOUND** (position at create only) | ADD_BOUNDED_DOMAIN_COMMAND `reorderMenuSections` (**draft/revision only**) |
| Add entry | `createMenuEntry` | REUSE into draft/revision graph |
| Remove entry | `retireMenuEntry` | REUSE against draft/revision; customer effect only after publish |
| Move entry / reorder | **NOT_FOUND** | ADD_BOUNDED_DOMAIN_COMMAND `reorderMenuEntries` / `moveMenuEntry` (**draft/revision only**) |
| Display name/description override | set at create only | ADD_BOUNDED_DOMAIN_COMMAND `updateMenuEntryDisplay` (**draft/revision only**) |
| Visibility/lifecycle within revision | activate/retire section/entry inside draft graph | REUSE/adapt inside non-effective revision |
| Deliberate publication/effect | current `activateMenu` insufficient | **ADD_BOUNDED_DOMAIN_COMMAND `publishMenuRevision`** (atomic effective switch) |
| Read graph | `getMenuGraph` | REUSE (+ distinguish draft vs effective reads) |

```text
MENU_SCHEMA_CHANGE_REQUIRED = YES (revision graph + effective pointer; ordering/display columns reused conceptually)
ONE_ACTIVE_MENU_BOUNDARY = PRESERVE and enforce at publication write time (not only at customer load)
```

---

## 11. Assortment architecture

```text
ASSORTMENT_AUTHORITY = BRAND
ASSORTMENT_MANAGE_PERMISSION = assortment.manage
OUTLET_MANAGER_BRAND_ASSORTMENT_AUTHORITY = NO
STORE_ASSORTMENT_MANAGE_SURFACE = NO
```

Reuse domain: `includeBrandVariant`, `exclude*AtScope`, `retireAssortmentRule`
(`src/server/assortment/rules.ts`) with `requireAssortmentManage(brandId)`.

IMP-036F exposes Brand Assortment mutation on **Admin** commercial workspace only.
IMP-036E Store `GET …/assortment` remains read-only Operations projection.

Audit: existing `assortment_availability_audit_events` — `EXISTING_AUDIT_SUFFICIENT` for mutations;
Admin may add read projection.

Concurrency: current upserts lack revision — Fit requires locked `expectedRuleRevision` CAS on
material Assortment mutations (explicit revision column; not `updatedAt`-only alternative; no
generic idempotency framework).

```text
ASSORTMENT_CONCURRENCY =
  EXPECTED_VERSION_REQUIRED = YES
  CONDITIONAL_WRITE = expectedRuleRevision CAS
  STALE_RESULT = deterministic conflict
  ATOMIC_BOUNDARY = Assortment mutation statement/transaction

ASSORTMENT_REVIEW_EFFECT_BINDING = REQUIRED

previewCommercialConsequence:
  for consequential Assortment mutation
  → returns authoritative expectedRuleRevision

include / exclude / retire Assortment mutation:
  → requires reviewed expectedRuleRevision
  → conditionally verifies current rule state/revision
  → mismatch = deterministic conflict
  → no mutation
  → operator must reload and review again
```

Preserve: Assortment authority = Brand; Outlet Manager Brand Assortment manage = NO;
Store Assortment mutation surface = NO.

---

## 12. Pricing architecture

Preserve ADR-007: Pricing owns money; INR minor units; effective-dated price books; Catalog never
owns monetary values; Checkout snapshots immutable.

| Concern | Current | Fit |
|---|---|---|
| Brand baseline Variant price | `createDraftPriceBook`, `attachDraftVariantPrice`, `activatePriceBook` | REUSE + Admin transport |
| Modifier price attach | schema + resolvers exist; first-class `attachDraftModifierPrice` **NOT_FOUND** (bootstrap/tests) | ADD_BOUNDED_DOMAIN_COMMAND |
| Charge price attach | schema exists; admin command **NOT_FOUND** | NOT in ordinary V1 manage workflow; inspect via `charges.read` |
| Activation | `activatePriceBook` overlap-only (VERIFIED; no reviewed-revision input) | REUSE + ADD `expectedPriceBookRevision` from consequence review; overlap remains additional |
| Read/explain | resolve* helpers | ADD_READ_PROJECTION for commercial UI |
| Concurrency | draft-only writes; child attaches have no book revision; activate overlap is not a stale-review guard | PRICE_BOOK_AGGREGATE_REVISION on every material draft mutation and on activate |

```text
PRICE_BOOK_AGGREGATE_REVISION = REQUIRED

PRICE_BOOK_AGGREGATE_COVERS =
  price-book mutable configuration
  + Variant price attachments/changes
  + Modifier price attachments/changes
  + any other V1 draft monetary row included in the activation candidate

EVERY material draft mutation (including child monetary-row attach/change):
  requires expectedPriceBookRevision
  conditionally succeeds
  increments the PriceBook aggregate revision

activatePriceBook:
  requires expectedPriceBookRevision captured by consequence review
  verifies it in the activation transaction
  mismatch → deterministic conflict / no activation

PRICE_BOOK_OVERLAP_VALIDATION = ADDITIONALLY REQUIRED
PRICE_BOOK_OVERLAP_IS_STALE_REVIEW_GUARD = NO

PRICING_SCHEMA_CHANGE_REQUIRED = NO for baseline Variant books; YES for explicit PriceBook aggregate
  revision column covering child monetary rows (ARCH-G09; locked — not optional)
PRICING_COMMAND_GAPS = attachDraftModifierPrice (+ Admin wrappers); commercial explanation reads;
  expectedPriceBookRevision on existing attach/activate commands
PRICING_READ_PROJECTION = Admin commercial pricing inspect/explain composing resolve* + book status
PRICING_CONCURRENCY =
  EXPECTED_VERSION_REQUIRED = YES on Pricing draft graph mutations and on activatePriceBook
  EXPECTED = reviewed PriceBook aggregate revision
  CONDITIONAL_WRITE = aggregate revision CAS
  STALE_RESULT = deterministic conflict / no effect
  ATOMIC_BOUNDARY = draft mutation statement/tx; activatePriceBook activation transaction
```

No second pricing formula; no frontend pricing authority; no new scheduling model.

---

## 13. Promotion / Coupon architecture

Preserve CURRENT lifecycles exactly:

```text
Promotion: draft | active | retired
Coupon: draft | active | disabled | retired
```

Do **not** invent SCHEDULED / ENDED / campaign variants.

Reuse: `create/update/deletePromotionDraft`, `setPromotionBenefit`, `setPromotionTargets`,
`activatePromotion`, `retirePromotion`, coupon draft/activate/disable/enable/retire, policy update,
`insertPromotionAuditEvent`.

Gaps: Admin HTTP wrappers + commercial list/detail/audit read projections. Evaluation engine
unchanged.

VERIFIED current activation/concurrency (not a stale-review guard):

```text
activatePromotion:
  accepts no expected revision / reviewed fingerprint from the caller
  computes configurationFingerprint from the configuration present at activation
  stores that fingerprint as immutable/effective configuration provenance
  CURRENT_FINGERPRINT_IS_STALE_REVIEW_GUARD = NO

Coupon commands (updateCouponDraft, activateCoupon, disableCoupon, enableCoupon, retireCoupon):
  accept no expected Coupon revision
  have no configuration-fingerprint stale-review protection
```

Locked semantic mechanism (numeric aggregate revision; not an open fingerprint-vs-revision choice):

```text
PROMOTION_AGGREGATE_REVISION = REQUIRED

PROMOTION_AGGREGATE_COVERS =
  Promotion draft fields
  + Benefit
  + Qualifier targets
  + Benefit targets
  + all other mutable V1 configuration that determines activation result

EVERY material Promotion draft mutation (including setPromotionBenefit / setPromotionTargets):
  requires expectedPromotionRevision
  conditionally succeeds
  increments the Promotion aggregate revision

activatePromotion:
  requires expectedPromotionRevision captured by consequence review
  verifies it conditionally in the activation transaction before effect
  mismatch → deterministic conflict / no activation

retirePromotion (consequential lifecycle):
  requires expectedPromotionRevision from consequence review
  mismatch → deterministic conflict / no effect

configurationFingerprint:
  MAY remain immutable/effective configuration provenance after successful activation
  MUST NOT be described as the current concurrency / stale-review guard
  MUST NOT be compared as a reviewed-configuration input unless a future lock explicitly makes it
  the activation predicate (this candidate does not; PROMOTION_AGGREGATE_REVISION is locked)

PROMOTION_REVISION_VS_REVIEWED_FINGERPRINT_OPEN_CHOICE = CLOSED

COUPON_REVISION = REQUIRED
  Covers material Coupon configuration and lifecycle state.
  At minimum: draft update, activate, disable, enable, retire.

EVERY such consequential Coupon command:
  requires expectedCouponRevision (reviewedCouponRevision from consequence review when the
  transition is consequence-reviewed)
  conditionally succeeds against the current authoritative Coupon revision/state predicate
  mismatch → deterministic conflict / no effect
  successful material mutation increments Coupon revision

COUPON_LIFECYCLE = UNCHANGED (draft | active | disabled | retired)
NEW_COUPON_LIFECYCLE = NO
```

```text
PROMOTION_CONCURRENCY =
  EXPECTED_VERSION_REQUIRED = YES on Promotion draft aggregate mutations and on activatePromotion
  EXPECTED = reviewed Promotion aggregate revision
  CONDITIONAL_WRITE = aggregate revision CAS
  STALE_RESULT = deterministic conflict / no effect
  ATOMIC_BOUNDARY = draft mutation statement/tx; activatePromotion activation transaction

COUPON_CONCURRENCY =
  EXPECTED_VERSION_REQUIRED = YES on material Coupon configuration/lifecycle commands
  EXPECTED = Coupon revision
  CONDITIONAL_WRITE = Coupon revision / state-predicate CAS
  STALE_RESULT = deterministic conflict / no effect
  ATOMIC_BOUNDARY = Coupon mutation / lifecycle transaction
```

---

## 14. Delivery tariff architecture

Approved separation (`DISC-F-008`): Delivery Tariff ≠ Serviceability ≠ provider cost.

VERIFIED storage: `outlet_serviceability_configs.delivery_fee_bands`,
`free_delivery_subtotal_threshold_paise` (IMP-036C). Pricing
`resolveCustomerDeliveryCharge` consumes those fields; provider cost remains Delivery domain.

VERIFIED gap: `updateServiceabilityConfig` does **not** write tariff columns; no mutation API.

### Authorization resolution (`ARCHITECTURE_FIT_AUTHORIZATION_GAP`)

```text
DELIVERY_TARIFF_AUTHORITY = PRICING
DELIVERY_TARIFF_AUTHORIZATION = pricing.read / pricing.manage
AUTHORIZATION_RESOURCE = Brand derived server-side from Outlet
SERVICEABILITY_MANAGE_AUTHORIZES_TARIFF_PRICE = NO
NEW_PERMISSION_REQUIRED = NO
```

```text
expectedTariffConfigRevision =
  architecture name for the authoritative serviceability-config row revision
  (same physical revision authority already locked for the Pricing-owned tariff write;
   NOT a second tariff revision authority)

Tariff READ:
  selected outletId → load Outlet → derive Brand → requirePricingRead(Brand) → read tariff fields

Tariff MUTATION:
  selected outletId → load Outlet → derive Brand → requirePricingManage(Brand)
  → mutate only delivery_fee_bands + free_delivery_subtotal_threshold_paise
  → require expectedTariffConfigRevision (serviceability-config row revision CAS)
  → write pricing-owned audit event (and bump config revision)

TARIFF_REVIEW_EFFECT_BINDING = REQUIRED

previewCommercialConsequence:
  for consequential tariff mutation
  → returns authoritative expectedTariffConfigRevision

tariff mutation:
  → requires the reviewed expectedTariffConfigRevision
  → verifies it inside the tariff mutation + audit transaction
  → mismatch = deterministic conflict
  → prior tariff remains unchanged
  → operator must reload and review again
```

Do **not** use `requireOutletPricingManage` / outlet-targeted `pricing.manage` as Brand proof.
Do **not** authorize via `serviceability.manage` merely because columns co-reside.
Do **not** create a second tariff revision authority.

Persistence locality ≠ business authority.

Command fit: `ADD_BOUNDED_APPLICATION_OPERATION` + domain helper under Pricing (writes serviceability
tariff columns through a narrow repository API). Extend repository to accept tariff fields;
keep geo distance-policy commands on Serviceability/Operations unchanged.

---

## 15. Tax / Charges inspection boundary

```text
V1 = charges.read / tax.read inspection/context only
charges.manage / tax.manage = NOT architecture-locked for ordinary IMP-036F commercial workflow
```

Admin read projections for applicable charge/tax context beside Pricing consequence. No general
tax/charge administration product in F.

---

## 16. Media boundary

```text
MANDATORY_V1 = view existing Menu-entry imagePath (and equivalent references)
MEDIA_MUTATION = FOLLOW_UP (DISC-F-010) — AC-IMP-036F-014-02 Mandatory = NO
UPLOAD_NOT_OFFERED_V1 = YES (AC-IMP-036F-014-03)
NO upload platform / object storage / CDN / scanning / registry locked here
NO upload transport / domain / persistence architecture in IMP-036F V1
V1_UI_CAPABILITY_BOUNDARY = inspect/view references only; upload control absent
```

---

## 17. Consequence-review composition

```text
CONSEQUENCE_REVIEW_EFFECT_BINDING = REQUIRED
NEW_WORKFLOW_ENGINE = NO
GENERIC_WORKFLOW_TOKEN_SERVICE = NO
PERSISTED_INDEPENDENT_CONSEQUENCE_STORE = NO
CONSEQUENCE_IS_SOURCE_OF_TRUTH = NO
REVISION_FINGERPRINT_IS_SECOND_COMMERCIAL_AUTHORITY = NO
```

The configuration the operator reviews is the configuration that is subsequently effected. Reuse each
domain’s bounded revision mechanism. This candidate locks reviewed-revision→effect binding for every
consequential commercial domain (Catalog, Menu, Assortment, Pricing, Promotion, Coupon, delivery
tariff); it does not use a reviewed-configuration fingerprint as the effect predicate.

```text
existing authoritative domain state
+ proposed bounded mutation/draft
→ non-authoritative consequence/validation projection that also returns the authoritative
  expected revision(s) required by that specific effect
→ operator confirmation
→ authoritative domain mutation/publish that consumes those expected revisions
```

Compose: entity identity; Brand/outlet scope; current vs proposed; timing/effective state;
customer-visible implication; price/promotion/tariff consequence; authoritative expected
revision(s) for the subsequent effect.

Application operation: `previewCommercialConsequence` (read/validate only; no persistent consequence
store) before publish/effect commands.

```text
previewCommercialConsequence result:
  - human-readable consequence
  - relevant current/effective truth
  - proposed truth
  - authoritative expected revision(s) required by that specific effect
    (expectedContentRevision / expectedMenuRevision / expectedRuleRevision /
     expectedPriceBookRevision / expectedPromotionRevision / expectedCouponRevision /
     expectedTariffConfigRevision as applicable — only revisions relevant to the
     specific pending effect)

Effect / publish:
  - consumes those expected revisions from the reviewed preview/read state
  - does not trust browser-authored revision values unrelated to authoritative preview/read state
  - server conditionally verifies each expected revision against current authoritative
    draft/configuration inside the effect transaction
  - mismatch = deterministic conflict
  - no effect occurs
  - operator must reload/review the changed consequence
```

Domain reuse (no generic token service):

| Effect | Reviewed expected value | Current VERIFIED gap |
|---|---|---|
| `publishCatalogContentChange` | expectedContentRevision | Fit already locks envelope + entity revision CAS |
| `publishMenuRevision` | expectedMenuRevision | Fit already locks menuRevision CAS |
| Assortment include/exclude/retire | expectedRuleRevision | Fit already locks rule revision CAS; consequence preview must return it |
| `activatePriceBook` | expectedPriceBookRevision | overlap-only today; overlap is additional, not the stale-review guard |
| `activatePromotion` | expectedPromotionRevision | fingerprint computed at activation is provenance, not a stale-review guard |
| Coupon activate/disable/enable/retire (and draft update when consequence-reviewed) | expectedCouponRevision | no configuration fingerprint / revision predicate today |
| Delivery tariff mutate | expectedTariffConfigRevision | serviceability config `revision` already locked for tariff write; preview must return it as `expectedTariffConfigRevision` |


---

## 18. Customer verification

```text
WORKFORCE_MUTATION → authoritative domain → existing customer read/evaluation → truthful UX
REALTIME_PUSH_GUARANTEE = NO
SECOND_CUSTOMER_COMMERCIAL_PROJECTION = NO
```

Verification uses existing D-368 Menu projection, Pricing resolution, and Checkout evaluation where
needed (`/api/v1/*`). Workforce UI may deep-link or call the same authoritative customer reads
through a thin Admin “verification” orchestrator that does not invent alternate truth.

---

## 19. Sellability diagnosis

US-013 comprehension only:

```text
DIAGNOSIS_IS_SOURCE_OF_TRUTH = NO
NEW_SELLABILITY_DOMAIN = NO
NEW_RULE_ENGINE = NO
UNDERLYING_AUTHORITIES_REMAIN_AUTHORITATIVE = YES
PARTIAL_AUTHORIZED_RESULT_SUPPORTED = YES
CROSS_SCOPE_LEAKAGE = NO
```

Compose authorized signals: Catalog lifecycle/publication; Menu placement/activation; Brand
Assortment; Outlet Availability; price completeness/effectiveness; promotion applicability where
authorized; outlet operating status/hours; Serviceability when location-dependent.

Missing authority → `unavailable_to_inspect` / `insufficient_authorized_context` / support
escalation — never leak hidden resource data.

---

## 20. Audit composition

| Domain | Classification | Notes |
|---|---|---|
| Catalog mutation/publish | `MUTATION_AUDIT_GAP` | Add catalog mutation audit covering Product/Variant/Modifier graph publish envelope |
| Menu mutation/publish | `MUTATION_AUDIT_GAP` | Add menu mutation audit events including `publishMenuRevision` |
| Assortment | `EXISTING_AUDIT_SUFFICIENT` (+ read projection) | Existing assortment audit |
| Pricing price books | `EXISTING_AUDIT_NEEDS_READ_PROJECTION` | `pricing_tax_audit_events` |
| Promotions/Coupons | `EXISTING_AUDIT_SUFFICIENT` (+ read projection) | `promotion_audit_events` |
| Delivery tariff | `MUTATION_AUDIT_GAP` | No mutation path today; add pricing-owned tariff audit (may reference serviceability revision) |

```text
COMMERCIAL_ACTIVITY_SCREEN = authorized composed reads
MUTABLE_COMMERCIAL_AUDIT_AUTHORITY = NO
```

Schema required for Catalog/Menu/tariff audit gaps (architecture conclusion).

---

## 21. Concurrency / idempotency / recovery

Material commercial writes have locked semantic concurrency contracts. Architecture-significant
alternatives (optional revision vs `updatedAt` CAS; overlay vs supersede) are **not** left open.

| Action | CURRENT_CONCURRENCY | FIT_DECISION | EXPECTED_VERSION_REQUIRED | CONDITIONAL_WRITE | ATOMIC_BOUNDARY | STALE_WRITE_RESULT | DB_CONSTRAINT_REQUIRED | IDEMPOTENCY_REQUIRED |
|---|---|---|---|---|---|---|---|---|
| Catalog draft revision save (incl. modifier graph) | LWW / none | ENTITY_CONTENT_REVISION draft store + CAS | YES | revision CAS | draft revision write | deterministic conflict | YES (revision > 0) | NO |
| Catalog publish | none | `publishCatalogContentChange` | YES | envelope + entity revision CAS | publish transaction (full envelope) | deterministic conflict | YES | NO |
| Menu draft organize (update/reorder/display) | LWW / missing cmds | non-effective MENU_REVISION only | YES | menuRevision CAS | draft revision write | deterministic conflict | YES | NO |
| Menu publish | `activateMenu` non-atomic | `publishMenuRevision` atomic effective switch | YES | effective-pointer + menuRevision CAS | publishMenuRevision transaction | deterministic conflict | YES | NO |
| Assortment mutation | Upsert LWW | `expectedRuleRevision` CAS | YES | rule revision CAS | mutation statement/tx | deterministic conflict | YES (unique+revision) | NO |
| Pricing draft graph (book + Variant/Modifier/other V1 draft monetary rows) | Draft gate; child attaches have no book revision | PRICE_BOOK_AGGREGATE_REVISION CAS | YES | expectedPriceBookRevision | draft mutation statement/tx | deterministic conflict | YES | NO |
| Pricing activate | overlap only (VERIFIED; not a stale-review guard) | overlap + reviewed PriceBook aggregate revision CAS | YES | EXPECTED = reviewed PriceBook aggregate revision | activation transaction | deterministic conflict | existing overlap + revision | NO |
| Promotion draft aggregate (fields + Benefit + qualifier/benefit targets) | Draft gate | PROMOTION_AGGREGATE_REVISION CAS | YES | expectedPromotionRevision | draft mutation statement/tx | deterministic conflict | YES | NO |
| Promotion activate | computes/stores `configurationFingerprint` at activation (VERIFIED; not a stale-review guard) | reviewed Promotion aggregate revision CAS; fingerprint remains effective provenance | YES | EXPECTED = reviewed Promotion aggregate revision | activation transaction | deterministic conflict | YES | NO |
| Coupon material edit / lifecycle (draft update, activate, disable, enable, retire) | lifecycle/state only; no configuration fingerprint (VERIFIED) | COUPON_REVISION CAS | YES | EXPECTED = Coupon revision | mutation/lifecycle transaction | deterministic conflict | YES | NO |
| Delivery tariff edit | Config revision unused for tariff | reuse serviceability `revision` as `expectedTariffConfigRevision` | YES | `expectedTariffConfigRevision` CAS | tariff mutate + audit | deterministic conflict | YES (existing) | NO |

No generic idempotency framework required for V1 Fit.

```text
CONCURRENCY_CONTRACTS_PRECISE = YES
OPTIONAL_REVISION_LANGUAGE = REMOVED
REVISION_OR_UPDATED_AT_OPEN_CHOICE = NO
CONSEQUENCE_REVIEW_EFFECT_BINDING = REQUIRED
PRICE_BOOK_OVERLAP_IS_STALE_REVIEW_GUARD = NO
PROMOTION_CONFIGURATION_FINGERPRINT_IS_STALE_REVIEW_GUARD = NO
PROMOTION_REVISION_VS_REVIEWED_FINGERPRINT_OPEN_CHOICE = CLOSED
```

---

## 22. Persistence / schema impact

| Concern | Existing storage | Required change | Why | Authority owner | Migration required | Historical compatibility |
|---|---|---|---|---|---|---|
| Catalog ENTITY_CONTENT_REVISION | primary Product/Variant/Modifier rows only | Non-effective revision store + effective pointers for Product, Variant, Modifier Group, Modifier Option, Group↔Option binding, Variant↔Modifier Group binding; refuse ACTIVE in-place customer/structure writes | ADR-006 + locked publication model | Catalog | YES | Stable IDs; snapshots preserved |
| Catalog content concurrency | none / LWW `updatedAt` | `content_revision` / envelope revision with CAS | ARCH-G09 | Catalog | YES | Backfill revision=1 |
| Catalog audit | none | New audit events table | Durable attribution | Catalog | YES | Append-only |
| Menu VERSIONED_MENU_GRAPH | `menus` / sections / entries lifecycle only | MENU_REVISION draft graph + Brand effective (menuId, menuRevision) pointer; `publishMenuRevision`; physical revision-row IDs MAY be distinct from logical identities | Atomic one-effective Menu; no ACTIVE in-place authoring | Menu | YES | Stable menuId; stable logical section and placement IDs across revisions (edit/reorder/move/display-override/publish must not churn logical IDs); retire/remove then genuinely create MAY mint a new logical identity |
| Menu audit | none | New audit events | Attribution | Menu | YES | Append-only |
| Assortment concurrency | `assortment_rules` | Explicit rule revision + CAS | ARCH-G09 | Assortment | YES | Compatible |
| Pricing modifier attach | `price_book_modifier_prices` | Command surface (schema may suffice) | V1 modifier price authoring | Pricing | NO if table sufficient | Compatible |
| Pricing aggregate concurrency | `price_books` + child monetary rows | Explicit PriceBook aggregate revision covering book config and all V1 draft monetary rows; CAS on every material draft mutation and on `activatePriceBook` | Stale-review/effect binding; ARCH-G09; overlap remains additional | Pricing | YES | Compatible |
| Promotion aggregate concurrency | `promotions` + benefits + targets | Explicit Promotion aggregate revision covering draft fields, Benefit, qualifier/benefit targets, and other mutable V1 activation-determining configuration; CAS on draft mutations and on `activatePromotion` | Stale-review/effect binding; ARCH-G09 | Promotions | YES | Compatible; `configurationFingerprint` remains effective provenance, not the stale-review guard |
| Coupon concurrency | `promotion_coupons` | Explicit Coupon revision + CAS on material draft update and activate/disable/enable/retire | Stale-review/lifecycle binding; ARCH-G09 | Promotions | YES | Compatible; lifecycle unchanged |
| Delivery tariff fields | serviceability config columns | Write path + audit; no new tariff tables | Reuse accepted storage | Pricing (auth) / physical row shared | NO new columns; YES audit | Compatible |
| Media / tax manage | existing | none for V1 mutate/upload | Boundaries | — | NO | — |

Strong preference: reuse tables for identity; revision stores are Catalog/Menu-owned content, not a
second commercial authority; no tables solely for UI composition.

```text
CATALOG_PUBLICATION_MODEL_SELECTED = ENTITY_CONTENT_REVISION
MENU_PUBLICATION_MODEL_SELECTED = STABLE_MENU_IDENTITY + STABLE_MENU_SECTION_LOGICAL_IDENTITY + STABLE_MENU_ENTRY_PLACEMENT_LOGICAL_IDENTITY + VERSIONED_MENU_GRAPH + ATOMIC_EFFECTIVE_REVISION_SWITCH
SCHEMA_CHANGE_REQUIRED = YES
```

---

## 23. Module / command placement

```text
src/server/administration/          thin Admin use-cases / commercial orchestration (extend)
src/server/operations/http/admin-*  /api/admin/v1/* transport wrappers
src/server/catalog/                 domain + publication gate + audit
src/server/catalog/menu/            menu update/reorder + audit + revision
src/server/assortment/              Brand manage reuse + concurrency
src/server/pricing/                 price books + tariff command + audit
src/server/promotions/              reuse
src/server/serviceability/          narrow tariff field write helper only (called by Pricing)
src/app/workforce/(administration)/admin/commercial/   static commercial workspace UI
src/lib/administration/             Admin HTTP client extensions
```

Store Operations UI/routes unchanged for Assortment manage (remain absent).

### Implementation work classification (design only)

| Area | Classification |
|---|---|
| Catalog create/activate/retire/read | REUSE_EXISTING_COMMAND + ADD_TRANSPORT_WRAPPER |
| Catalog ACTIVE field gate + ENTITY_CONTENT_REVISION + publish envelope (Product/Variant/Modifier graph) | ADD_BOUNDED_DOMAIN_COMMAND + SCHEMA_SUPPORT_REQUIRED |
| Menu create/read/graph | REUSE_EXISTING_COMMAND + ADD_TRANSPORT_WRAPPER |
| Menu update/reorder/display (draft/revision only) | ADD_BOUNDED_DOMAIN_COMMAND + ADD_TRANSPORT_WRAPPER |
| Menu `publishMenuRevision` (atomic effective switch; replace unsafe activateMenu publication path) | ADD_BOUNDED_DOMAIN_COMMAND + SCHEMA_SUPPORT_REQUIRED |
| Assortment Brand mutate | REUSE_EXISTING_COMMAND + ADD_TRANSPORT_WRAPPER |
| Pricing variant books | REUSE_EXISTING_COMMAND + ADD_TRANSPORT_WRAPPER + SCHEMA_SUPPORT_REQUIRED (PriceBook aggregate revision on attach/activate) |
| Pricing modifier attach | ADD_BOUNDED_DOMAIN_COMMAND + ADD_TRANSPORT_WRAPPER |
| Promotions | REUSE_EXISTING_COMMAND + ADD_TRANSPORT_WRAPPER + SCHEMA_SUPPORT_REQUIRED (Promotion aggregate revision on draft mutations and activate; `configurationFingerprint` provenance unchanged) |
| Coupons | REUSE_EXISTING_COMMAND + ADD_TRANSPORT_WRAPPER + SCHEMA_SUPPORT_REQUIRED (Coupon revision on draft update and activate/disable/enable/retire; lifecycle unchanged) |
| Delivery tariff | ADD_BOUNDED_APPLICATION_OPERATION + ADD_BOUNDED_DOMAIN_COMMAND + ADD_TRANSPORT_WRAPPER |
| Consequence / diagnosis / verification compose | ADD_READ_PROJECTION (+ application preview ops) |
| Tax/Charges inspect | ADD_READ_PROJECTION |
| Media view (no upload) | ADD_READ_PROJECTION (fields already stored); UI negative: upload absent |
| Customer Menu path | NO_IMPLEMENTATION_CHANGE to authority (regression only; benefits from atomic Menu publish) |

---

## 24. Story / AC traceability

### Mechanical mandatory AC audit (PD-IMP-036F-DRAFT-1)

```text
MANDATORY_AC_TOTAL_FROM_PD = 64
NONMANDATORY_ACS_IDENTIFIED = 1 (AC-IMP-036F-014-02 — FOLLOW_UP / Mandatory = NO)
MANDATORY_AC_MAPPED = 64
MISSING_MANDATORY_ACS = NONE
mandatory_ACs_mapped = YES
```

| Story | Mandatory ACs (exact) | Architecture mapping (permission / resource / transport / op / evidence intent) |
|---|---|---|
| US-001 | 001-01, 001-02, 001-03, 001-04 | Multi-authority Admin commercial inspect projection; deny-by-default mutation affordances; stale/not-found without implying customer truth; no cross-scope leak |
| US-002 | 002-01, 002-02, 002-03, 002-04, 002-05 | Catalog draft create/edit; ENTITY_CONTENT_REVISION; expectedContentRevision conflicts; validation blocks publish; a11y UI |
| US-003 | 003-01, 003-02, 003-03 | Modifier association via Catalog commands under `catalog.manage` @ Brand; missing prerequisite validation; **AC-IMP-036F-003-03** Unauthorized modifier association → `catalog.manage` @ Brand resource, server-side denial, no mutation, negative authorization proof (Admin transport) |
| US-004 | 004-01, 004-02, 004-03 | Legal Catalog lifecycle only; illegal transition rejected; no hard delete; customer/structure-affecting activate/retire participates in publication envelope rules |
| US-005 | 005-01, 005-02, 005-03, 005-04, 005-05 | Menu draft/revision organize + display; `publishMenuRevision` preserves one effective Menu and stable section/placement logical IDs; invalid refs fail; tablet authoring |
| US-006 | 006-01, 006-02, 006-03, 006-04 | Brand Assortment `assortment.manage`; Outlet Manager cannot gain Brand authority; unauthorized denial; Store Assortment manage = NO |
| US-007 | 007-01, 007-02, 007-03, 007-04, 007-05 | Pricing books + modifier price attach under PRICE_BOOK_AGGREGATE_REVISION; invalid money rejected; diagnosis honesty; Checkout snapshot authority unchanged; activate requires reviewed expectedPriceBookRevision |
| US-008 | 008-01, 008-02, 008-03, 008-04, 008-05 | Existing Promotion/Coupon lifecycles only; Promotion aggregate revision covers Benefit/Targets; Coupon revision on material edit/lifecycle; validation; unauthorized denial; no invented states |
| US-009 | 009-01, 009-02, 009-03, 009-04, 009-05 | Pricing-owned tariff via `pricing.read`/`pricing.manage` Brand←Outlet; provider cost separate; unauthorized denial; not `serviceability.manage` |
| US-010 | 010-01, 010-02, 010-03, 010-04 | Non-authoritative consequence preview before publish; preview returns authoritative expected revision(s) for the subsequent effect including Assortment `expectedRuleRevision` and tariff `expectedTariffConfigRevision` when those domains are consequential; cancel leaves draft; no four-eyes; draft vs effective explicit |
| US-011 | 011-01, 011-02, 011-03, 011-04, 011-05 | `publishCatalogContentChange` / `publishMenuRevision` / Assortment include/exclude/retire / pricing&promo/coupon / delivery-tariff effect after validate; each consumes reviewed expected revision (`expectedRuleRevision` / `expectedTariffConfigRevision` included); auth denial; verifiable resulting effective state; no-op when unchanged; stale mismatch = conflict / no effect / re-review |
| US-012 | 012-01, 012-02, 012-03, 012-04 | Verify via existing `/api/v1/*` customer reads; no realtime push requirement; partial consequence honesty; do not trust edit form alone |
| US-013 | 013-01, 013-02, 013-03, 013-04, 013-05 | Non-authoritative diagnosis composition across Catalog/Menu/Assortment/Availability/Pricing/Promo/hours/serviceability |
| US-014 | 014-01, 014-03 | **AC-IMP-036F-014-01:** view existing media references; **AC-IMP-036F-014-03:** Upload not offered as V1 capability — V1 UI capability boundary, no upload/storage/CDN action, no upload transport/domain/persistence architecture, UI/E2E negative evidence. (**AC-IMP-036F-014-02** non-mandatory FOLLOW_UP — not counted in mandatory map) |
| US-015 | 015-01, 015-02, 015-03 | Desktop/tablet full authoring; mobile inspection/context only; no mandatory mobile commercial mutations |
| US-016 | 016-01, 016-02 | Tax/Charges read inspection only; no general tax/charge administration in V1 commercial workflow |

### Story fit summary

| Story ID | Mandatory ACs | Domain authority | Permission/resource | UI surface | Transport | Application/domain operation | Persistence | Concurrency | Customer consequence | Audit | Security notes | Fit | Ready after future lock |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| US-001 | 001-01…04 | Multi-read composition | catalog/menu/assortment/pricing/promotions read; outlet context reads | Commercial overview | Admin | commercial offering inspect projection | none | n/a | none direct | composed reads | no cross-scope leak | PASS | YES |
| US-002 | 002-01…05 | Catalog | catalog.manage @ Brand | Product/Variant authoring | Admin | create/update draft revision; publish gate | ENTITY_CONTENT_REVISION + audit | expectedContentRevision | none until publish | catalog audit | ACTIVE field gate | PASS | YES |
| US-003 | 003-01…03 | Catalog modifiers | catalog.manage @ Brand | Modifier association | Admin | associate cmds under publication rules + transport | revision store (bindings in envelope) | expectedContentRevision | after publish | catalog audit | **003-03 deny + no mutation**; no Modifier Library | PASS | YES |
| US-004 | 004-01…03 | Catalog | catalog.manage @ Brand | Lifecycle actions | Admin | activate/retire + publication envelope when customer/structure-affecting | revision | expectedContentRevision | on effective publish | catalog audit | draft≠live | PASS | YES |
| US-005 | 005-01…05 | Menu | menu.manage @ Brand | Menu flow | Admin | draft/revision update/reorder/display + `publishMenuRevision` | MENU_REVISION + effective pointer | expectedMenuRevision | on publish only | menu audit | one-effective Menu; no ACTIVE in-place authoring; stable section/placement logical IDs | PASS | YES |
| US-006 | 006-01…04 | Assortment | assortment.manage @ Brand | Assortment commercial | Admin | include/exclude/retire | rule CAS | expectedRuleRevision | eligibility | assortment audit | no Store manage | PASS | YES |
| US-007 | 007-01…05 | Pricing | pricing.manage @ Brand | Pricing | Admin | price book cmds + modifier attach | PriceBook aggregate revision | expectedPriceBookRevision on draft graph mutations and activate; overlap additional | price resolve | pricing audit | Catalog≠money | PASS | YES |
| US-008 | 008-01…05 | Promotions | promotions/coupons.* @ Brand | Promotions | Admin | existing promo/coupon cmds | Promotion aggregate revision; Coupon revision | expectedPromotionRevision / expectedCouponRevision on draft and effect | evaluation | promotion audit | no invented states; fingerprint is provenance | PASS | YES |
| US-009 | 009-01…05 | Pricing tariff | pricing.read/manage @ Brand←Outlet | Tariff | Admin | new tariff read/mutate ops | reuse columns + audit | expectedTariffConfigRevision (serviceability-config row) | delivery charge resolve | pricing tariff audit | not serviceability.manage | PASS | YES |
| US-010 | 010-01…04 | Composition | domain reads | Consequence | Admin | previewCommercialConsequence | none authoritative | preview returns expected revisions for effect incl. Assortment expectedRuleRevision + tariff expectedTariffConfigRevision; not a write CAS | none until confirm | n/a | non-authoritative | PASS | YES |
| US-011 | 011-01…05 | Catalog/Menu/Assortment/Pricing/Promo/tariff | manage/activate | Publish | Admin | `publishCatalogContentChange` / `publishMenuRevision` / Assortment mutate / domain activate / tariff mutate after preview | as above | expectedContentRevision / expectedMenuRevision / expectedRuleRevision / expectedPriceBookRevision / expectedPromotionRevision / expectedCouponRevision / expectedTariffConfigRevision | D-368/pricing effective truth | domain audits | deliberate only; atomic Catalog+Menu publish; stale review = conflict | PASS | YES |
| US-012 | 012-01…04 | Customer reads | commercial read context | Verification | Admin orchestrates `/api/v1` | existing customer Menu/price/checkout | none | n/a | truthful UX | n/a | no second projection | PASS | YES |
| US-013 | 013-01…05 | Multi-read | partial reads | Diagnosis | Admin | diagnoseSellability composition | none | n/a | explanation only | n/a | fail closed | PASS | YES |
| US-014 | 014-01 + 014-03 (014-02 FOLLOW_UP) | Menu/Catalog refs | read | Media inspect | Admin | read imagePath; **upload absent** | none | n/a | none | n/a | no upload/storage/CDN architecture | PASS | YES (view + upload-absent) |
| US-015 | 015-01…03 | UI | same auth | Desktop author; mobile inspect | static UI | n/a | none | n/a | n/a | n/a | mobile no mandatory mutate | PASS | YES |
| US-016 | 016-01…02 | Tax/Charges | tax.read/charges.read | Inspect context | Admin | read projections | none | n/a | context only | existing pricing/tax audit read | no manage lock | PASS | YES |

```text
stories_mapped = 16
mandatory_ACs_mapped = YES
MANDATORY_AC_TOTAL_FROM_PD = 64
MANDATORY_AC_MAPPED = 64
MISSING_MANDATORY_ACS = NONE
NONMANDATORY_ACS_IDENTIFIED = 1 (AC-IMP-036F-014-02)
unfit_stories = NONE
stories_ready_after_future_lock = US-001…016 (AC-014-02 remains FOLLOW_UP)
stories_still_blocked_after_candidate = NONE for Fit; implementation remains unauthorized
implementation_authorized_for_any_story = NO
```

---

## 25. Golden Journey / test implications

Mandatory eventual acceptance journey: `GJ-PRODUCT-MENU-LAUNCH`

Architecture supports proof path:

```text
authorized commercial configuration
→ Catalog/Menu/Assortment/Pricing/Promotion/tariff truth
→ deliberate publish/effect
→ customer Menu/orderability consequence
```

Supporting regressions (not re-accepted as F): `GJ-FIRST-ORDER`, `GJ-AVAILABILITY`,
`GJ-ADDRESS-SERVICEABILITY`.

```text
registry_changed = NO
```

TEST-1 evidence (post-implementation, not this task): domain + Admin HTTP allow/deny + DB +
concurrency races + E2E commercial journey + negative auth + Founder UAT on exact candidate.

---

## 26. Non-goals

- Canonical architecture lock / ROADMAP/STATE advancement in this artifact
- Implementation authorization or start
- New deployable service, queue, auth realm, or `/api/commercial/*` façade
- New permissions/roles/scope model
- Outlet Manager Brand Assortment authority; Store Assortment manage surface
- Second Catalog/Menu/Pricing/Assortment/Promotion authority
- Media upload platform; media-reference mutation (FOLLOW_UP)
- General tax/charge administration product
- Modifier Library / Bundle Builder product
- Invented Promotion lifecycle states
- Realtime customer push
- Complex mobile commercial authoring
- Amending ADR-006/007/008 or creating D-374 / ARCH-R20

---

## 27. Unresolved items

| Item | Status |
|---|---|
| Independent Architecture Fit review | **COMPLETE** — PASS (`5169723968` on reviewed candidate `9ae06d62…`) |
| Canonical lock persistence (ROADMAP/STATE/PD/capability lock markers) | **COMPLETE** — GTM-R119 / STATE-R117 |
| Explicit implementation authorization | NOT AUTHORIZED (next human gate after merge/reconciliation) |
| Exact Admin route path spelling / page split | Implementation detail after implementation authorization |
| Exact SQL migration filenames / non-semantic column spellings for revision stores | Implementation detail under locked ENTITY_CONTENT_REVISION + MENU_REVISION semantics |
| AC-014-02 media mutation | FOLLOW_UP (approved; non-mandatory) |

```text
CATALOG_DRAFT_OVERLAY_VS_SUPERSEDE_OPEN_CHOICE = CLOSED (ENTITY_CONTENT_REVISION locked)
MENU_ACTIVATEMENU_REUSE_AS_PUBLICATION = CLOSED (publishMenuRevision locked)
PROMOTION_REVISION_VS_REVIEWED_FINGERPRINT_OPEN_CHOICE = CLOSED (PROMOTION_AGGREGATE_REVISION locked)
PRICE_BOOK_OVERLAP_IS_STALE_REVIEW_GUARD = NO
PRODUCT_DECISION_REQUIRED = NO
PRODUCT_ARCHITECTURE_CONFLICT = NO
GLOBAL_ARCHITECTURE_CONFLICT = NO
CONSEQUENCE_REVIEW_EFFECT_BINDING = REQUIRED
```

---

## 28. D-number / global ARCH decision test

```text
D374_REQUIRED_FOR_IMP036F_LOCK = NO
ARCH_R20_REQUIRED_FOR_IMP036F_LOCK = NO
```

Rationale: Fit reuses ARCH-R19 topology, D-372/D-373 façades, existing permission catalog and Brand
target kinds, existing domain modules, and fills ADR-006’s explicit revision-storage non-decision
plus a Pricing-authorized tariff write path without new global authority.

No new durable cross-capability decision required for lock.

---

## 29. Architecture-lock persistence record

Independent Architecture Fit PASS and architecture-lock persistence are recorded as:

```text
ROADMAP = GTM-R119
STATE = STATE-R117

IMP036F_PRODUCT_DEFINITION = APPROVED
IMP036F_PRODUCT_DEFINITION_GATE = PASS
IMP036F_ARCHITECTURE_FIT = PASS
IMP036F_ARCHITECTURE_LOCKED = YES
IMP036F_IMPLEMENTATION_AUTHORIZED = NO
IMP036F_STARTED = NO
IMP036F_ACCEPTED = NO
IMP036G_ACTIVATED = NO

ARCHITECTURE_REVIEWED_CANDIDATE_HEAD = 9ae06d6267e997223b1995124540974215ee17fd
ARCHITECTURE_REVIEWED_CANDIDATE_TREE = 55adb287bb0eb77240a6becdc16fed2d504ba144
INDEPENDENT_ARCHITECTURE_REVIEW = 5169723968
EXACT_HEAD_CI_RUN = 34501448266
```

This file’s `architectureLock` is now `ARCHITECTURE_LOCKED`. No schema migration or application
implementation occurred in this persistence. ARCH-R19 / DR-15 preserved; D-374 / ARCH-R20 not
created.

---

## 30. Explicit implementation unauthorized statement

```text
IMPLEMENTATION_AUTHORIZED = NO
IMPLEMENTATION_STARTED = NO
SCHEMA_MIGRATION_EXECUTION = NOT_AUTHORIZED
APPLICATION_CODE_IMPLEMENTATION = NOT_AUTHORIZED
MERGE = NOT_AUTHORIZED
DEPLOYMENT = NOT_AUTHORIZED
FOUNDER_UAT = NOT_AUTHORIZED
IMP_ACCEPTANCE = NOT_AUTHORIZED
```

All schema/API/command changes above are **architecture design only**.

---

## UI architecture (static commercial workspace)

Preserve static export and IMP-036A/D/E shell patterns. Task-oriented Brand commercial workspace
under workforce Administration (semantic Admin façade), not six disconnected domain dashboards:

- commercial overview
- Product/Variant flow
- Menu flow
- Assortment (Brand mutation)
- Pricing
- Promotions/Coupons
- delivery tariff
- consequence review
- customer verification
- sellability diagnosis

Mobile: inspection/context only (DISC-F-011). Desktop/tablet: full authoring.

UI grouping must not redefine domain authority.

---

## Evidence anchors (VERIFIED code/schema)

- Permissions: `src/shared/access-control/catalog.ts`
- Admin routes (no commercial handlers today): `src/server/operations/http/admin-routes.ts`
- Store Operations: `src/server/operations/http/store-routes.ts`
- Catalog ACTIVE Product/Variant updates: `src/server/catalog/products.ts`, `variants.ts`
- Catalog ACTIVE Modifier graph updates: `src/server/catalog/modifiers.ts`
- Menu commands (non-atomic `activateMenu`): `src/server/catalog/menu/*`
- Assortment: `src/server/assortment/rules.ts`
- Pricing: `src/server/pricing/price-books.ts`, `resolve-delivery-charge.ts`
- Promotions: `src/server/promotions/*`
- Tariff columns without write path: `src/platform/database/schema/serviceability.ts`;
  `updateServiceabilityConfig` omits tariff fields
- Customer Menu one-active enforcement: `src/server/customer-commerce/menu/project-customer-menu.ts`
- Customer modifier projection: `src/server/customer-commerce/menu/load-customer-menu-modifiers.ts`
- Checkout merchandise revalidation: `src/server/checkout/adapters/catalog.ts`

---

## End matter

```text
IMP-036F: ARCHITECTURE_LOCKED
IMP-036F_ARCHITECTURE: LOCKED
IMP-036F_ARCHITECTURE_LOCKED: YES
ARCHITECTURE_FIT = PASS
ARCHITECTURE_FIT_CANDIDATE_RESULT = PASS
IMPLEMENTATION_AUTHORIZED = NO
IMPLEMENTATION_STARTED = NO
IMP036F_IMPLEMENTATION_AUTHORIZED = NO
IMP036F_STARTED = NO
IMP036F_ACCEPTED = NO
IMP036G_ACTIVATED = NO
SCHEMA_CHANGE_REQUIRED = YES
D374_REQUIRED_FOR_IMP036F_LOCK = NO
ARCH_R20_REQUIRED_FOR_IMP036F_LOCK = NO
NEXT_GATE = Independent review of Architecture Lock / GTM-R119 / STATE-R117 persistence
THEN = Separate explicit human authorization before merge; implementation authorization remains later
STOP = Do not authorize or start implementation from architecture lock alone
```
