<!-- governance-meta
{
  "status": "DRAFT",
  "authority": "CAPABILITY_ARCHITECTURE_CANDIDATE",
  "capability": "IMP-036F",
  "title": "Catalog, Menu, Pricing & Promotions Management",
  "architectureLock": "NOT_LOCKED",
  "architectureFitCandidateResult": "PASS",
  "implementation": "NOT_AUTHORIZED / NOT_STARTED",
  "implementationAuthorized": false,
  "implementationStarted": false,
  "impAccepted": false,
  "schemaChangeRequired": true,
  "lastReviewed": "2026-09-10",
  "productDefinition": "PD-IMP-036F-DRAFT-1",
  "bindingDecisions": ["ADR-005", "ADR-006", "ADR-007", "ADR-008", "D-358", "D-368", "D-372", "D-373"],
  "dependsOn": ["IMP-011", "IMP-014", "IMP-015", "IMP-019", "IMP-028B", "IMP-029", "IMP-030", "IMP-035", "IMP-036A", "IMP-036C", "IMP-036D", "IMP-036E"]
}
-->

# IMP-036F — Catalog, Menu, Pricing & Promotions Management

## Capability Architecture — ARCHITECTURE FIT CANDIDATE / NOT LOCKED

This document is an **Architecture Fit review candidate** for IMP-036F. It is **not** the
canonically locked capability architecture.

```text
ARCHITECTURE_FIT_CANDIDATE_RESULT = PASS
CANDIDATE_STATUS = ARCHITECTURE_FIT_CANDIDATE / INDEPENDENT_REVIEW_REQUIRED
IMP036F_ARCHITECTURE_LOCKED = NO
ARCHITECTURE_LOCKED = NO
IMPLEMENTATION_AUTHORIZED = NO
IMPLEMENTATION_STARTED = NO
IMP036F_ACCEPTED = NO
IMP036G_ACTIVATED = NO
CANONICAL_ROADMAP_STATE_CLAIM = UNCHANGED (GTM-R118 / STATE-R116)
PRODUCT_DEFINITION = PD-IMP-036F-DRAFT-1 APPROVED (Gate PASS; ARCHITECTURE_FIT remains NOT_PERFORMED in PD/ROADMAP/STATE until separate lock persistence)
```

Independent Architecture Fit review is required. Separate explicit human authorization is required
before any architecture-lock / governance persistence. This candidate does **not** authorize
implementation, schema migration execution, merge, deployment, Founder UAT, or IMP acceptance.

| Field | Value |
|---|---|
| Architecture lock | `NOT_LOCKED` (candidate only) |
| Formal ROADMAP lifecycle | `PLANNED` / `NOT_AUTHORIZED` / `NOT_STARTED` (`IMP036F_ACTIVATED: YES`) |
| Product Definition | `PD-IMP-036F-DRAFT-1` **APPROVED**; Product Definition Gate **PASS** |
| Canonical Architecture Fit (ROADMAP/STATE/PD) | Still `NOT_PERFORMED` until lock persistence |
| Candidate Fit result | **PASS** |
| Implementation | **NOT_AUTHORIZED** / **NOT_STARTED** |
| Schema change required (architecture conclusion) | **YES** (not authorized to execute) |
| New D-number | **NO** (`D374_REQUIRED_FOR_IMP036F_LOCK = NO`) |
| Global ARCH bump | **NO** (`ARCH_R20_REQUIRED_FOR_IMP036F_LOCK = NO`) |
| New permission / role / auth model / deployable | **NO** |
| Founder UAT required (future acceptance) | **YES** |

---

## 1. Authority / status

Verified base for this candidate investigation:

```text
Repository: /home/ajoshi/repos/boba-bear-platform
origin/main HEAD: 1f59333d1a3bfe0dfecde908245306e2edacd834
origin/main tree: 284800a71a20d27c01b9c0cec7cadb45bb5d059b
VISION = VISION-1
ROADMAP = GTM-R118
STATE = STATE-R116
ARCHITECTURE = ARCH-R19
DECISION REGISTER = DR-15
PRODUCT DELIVERY = PD-1
TESTING = TEST-1
PERSONA = PERSONA-1
GOLDEN JOURNEYS = GJ-1
Product Definition = docs/platform/product/IMP-036F/product-definition.md (APPROVED)
```

Canonical authorities unchanged by this candidate. Supporting plan remains non-authoritative:
`docs/platform/experience/enterprise-experience/IMP-036F-catalog-menu-pricing-promotions.md`.

Representation convention: historical capability drafts use
`"architectureLock": "NOT_LOCKED"` under `docs/platform/capabilities/` during pre-lock review
(IMP-031/032 fixtures). This candidate follows that safe pre-lock representation and does **not**
claim `ARCHITECTURE_LOCKED`.

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
ARCHITECTURE_FIT_CANDIDATE_RESULT = PASS
```

PASS means: every mandatory V1 story has a technically viable fit under existing global architecture;
permission/resource mapping is resolved (including delivery tariff); Catalog publication conformance
gap has a bounded revision strategy; persistence/concurrency/audit consequences are explicit;
implementation boundaries are precise enough for independent review.

PASS does **not** mean canonical lock, implementation authorization, or acceptance.

Unresolved for later lock persistence only: ROADMAP/STATE/PD markers (`ARCHITECTURE_FIT`
performed/locked) — report-only in §29.

---

## 5. Domain-authority map

| Concern | Authority owner | Notes |
|---|---|---|
| Product / Variant / Modifier structure | Catalog | Brand; ADR-006 |
| Menu sections/entries/display/one-active Menu | Menu | Brand; activation is publication gate |
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
| Menu organization / activate | `ADMIN_FACADE` | `/api/admin/v1/*` |
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

Exact revision storage was left open by ADR-006. This candidate fills that implementation
non-decision without amending ADR-006 and without changing global invariants.

```text
ADR006_preserved = YES
architecture_gap_resolved = YES (candidate design; not implemented)
```

### ACTIVE mutable field inventory (VERIFIED)

| Entity | Mutable field (ACTIVE allowed today) | Customer display | Default variant | Price resolution | Modifier/customization | Orderability / checkout | Classification |
|---|---|---|---|---|---|---|---|
| Product | `name` | YES (via Menu `effectiveEntryDisplay` fallback) | NO | NO | NO | Indirect (identity display) | **CUSTOMER_AFFECTING** |
| Product | `description` | YES (display fallback) | NO | NO | NO | Indirect | **CUSTOMER_AFFECTING** |
| Variant | `name` | YES (selector/customization surfaces) | NO | NO | YES (label) | Indirect | **CUSTOMER_AFFECTING** |
| Variant | `description` | Possible | NO | NO | Possible | Indirect | **CUSTOMER_AFFECTING** |
| Variant | `isDefault` | Indirect | **YES** (`pickDefaultActiveVariant`) | Indirect (which variant priced) | YES | YES | **CUSTOMER_AFFECTING** |
| Variant | `isSelectorVisible` | Not used by D-368 projector | NO | NO | Validation / eligibility composition | Possible (validation rules) | **STRUCTURE_AFFECTING** (treat as publication-gated) |

Immutable after create (VERIFIED): Product/Variant `code`, kind, brand/product linkage.

### Write paths that bypass ADR-006 publication semantics (VERIFIED)

1. `updateProduct` allows ACTIVE `name`/`description` (`src/server/catalog/products.ts`)
2. `updateVariant` allows ACTIVE `name`/`description`/`isDefault`/`isSelectorVisible`
3. No catalog content `revision` / publish command / catalog mutation audit module
4. Menu activation exists, but Catalog ACTIVE in-place edits do not require Menu republish
5. No Admin HTTP façade today (domain callable without publication gate wrapper)

### Chosen minimum compliant architecture

```text
CATALOG_REVISION_STRATEGY =
  ENTITY_CONTENT_REVISION
  + ACTIVE_CUSTOMER_AFFECTING_FIELD_GATE
  + VALIDATE_THEN_PUBLISH_COMMAND
  + CATALOG_MUTATION_AUDIT

SCHEMA_CHANGE_REQUIRED = YES
MIGRATION_REQUIRED = YES (architecture conclusion only; not authorized now)

PUBLICATION_COMMAND_BOUNDARY =
  Application/Admin:
    validateCatalogPublication(productOrGraph)
    publishCatalogContentChange(expectedRevision, …)
  Domain:
    refuse ACTIVE in-place mutation of CUSTOMER_AFFECTING / STRUCTURE_AFFECTING fields
    apply publication transactionally to active rows OR draft→activate with contentRevision bump

CUSTOMER_PROJECTION_REVISION_SOURCE =
  D-368 live read of one active Menu + active Catalog entities at request time
  (no second customer commercial projection store)

HISTORICAL_REFERENCE_BEHAVIOR =
  Checkout/order catalog snapshots remain immutable; do not rewrite history

CONCURRENCY_MODEL =
  contentRevision bigint on catalog_products / catalog_variants (and publish envelope)
  expectedContentRevision required on publish and on draft saves that will become publishable
  stale → deterministic conflict (no silent LWW)
```

Bounded mechanism (capability-local; fills ADR-006 open choice):

1. Add `content_revision` (bigint, >0) to `catalog_products` and `catalog_variants`.
2. Draft lifecycle retains free mutation of draft-mutable fields with `expectedContentRevision`.
3. While `lifecycleStatus = active`, domain `update*` **rejects** customer/structure-affecting field
   changes; those require a **publishable draft change-set** (preferred: edit-as-draft overlay /
   superseding draft revision row owned by Catalog) then `publishCatalogContentChange`.
4. Publish validates structure (`assert`/`validate` family already in catalog), bumps revision,
   writes audit, then customer reads observe new active values via D-368.
5. Stable Product/Variant IDs preserved; no identity churn for historical snapshots.
6. Menu remains separate publication gate (one active Menu + section/entry activation).

```text
GLOBAL_ARCHITECTURE_DECISION_REQUIRED = NO
ADR_006_AMENDMENT_REQUIRED = NO
```

---

## 10. Menu authoring architecture

Current schema (`menus`, `menu_sections`, `menu_entries`): lifecycle draft|active|retired;
`position`; entry `displayName` / `displayDescription` / `imagePath`.

| Approved action | Current command | Fit |
|---|---|---|
| Create section | `createMenuSection` | REUSE |
| Rename/update section | **NOT_FOUND** | ADD_BOUNDED_DOMAIN_COMMAND `updateMenuSection` |
| Reorder section | **NOT_FOUND** (position at create only) | ADD_BOUNDED_DOMAIN_COMMAND `reorderMenuSections` |
| Add entry | `createMenuEntry` | REUSE |
| Remove entry | `retireMenuEntry` | REUSE (retire = remove from active graph) |
| Move entry / reorder | **NOT_FOUND** | ADD_BOUNDED_DOMAIN_COMMAND `reorderMenuEntries` / `moveMenuEntry` |
| Display name/description override | set at create only | ADD_BOUNDED_DOMAIN_COMMAND `updateMenuEntryDisplay` |
| Visibility/lifecycle | activate/retire section/entry/menu | REUSE |
| Deliberate publication/effect | `activateMenu` (+ section/entry activate); one-active-Menu enforced in customer load | REUSE + Admin wrapper; no new Menu lifecycle states |
| Read graph | `getMenuGraph` | REUSE |

```text
MENU_SCHEMA_CHANGE_REQUIRED = NO for ordering/display fields (reuse existing columns)
MENU_REVISION_CONCURRENCY = ADD contentRevision on menus (or section graph revision) for material edits/publish
ONE_ACTIVE_MENU_BOUNDARY = PRESERVE (customer projector)
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

Concurrency: current upserts lack revision — Fit requires `expectedRuleRevision` or equivalent
conflict detection on material Assortment mutations (bounded; no generic idempotency framework).

---

## 12. Pricing architecture

Preserve ADR-007: Pricing owns money; INR minor units; effective-dated price books; Catalog never
owns monetary values; Checkout snapshots immutable.

| Concern | Current | Fit |
|---|---|---|
| Brand baseline Variant price | `createDraftPriceBook`, `attachDraftVariantPrice`, `activatePriceBook` | REUSE + Admin transport |
| Modifier price attach | schema + resolvers exist; first-class `attachDraftModifierPrice` **NOT_FOUND** (bootstrap/tests) | ADD_BOUNDED_DOMAIN_COMMAND |
| Charge price attach | schema exists; admin command **NOT_FOUND** | NOT in ordinary V1 manage workflow; inspect via `charges.read` |
| Activation | `activatePriceBook` with overlap conflict | REUSE |
| Read/explain | resolve* helpers | ADD_READ_PROJECTION for commercial UI |
| Concurrency | draft-only writes; activate overlap | ADD expectedRevision on draft price-book edits if concurrent draft authors; activate remains conflict-checked |

```text
PRICING_SCHEMA_CHANGE_REQUIRED = NO for baseline Variant books; YES only if draft book revision column added for stale draft recovery (preferred YES for ARCH-G09 on concurrent draft edits)
PRICING_COMMAND_GAPS = attachDraftModifierPrice (+ Admin wrappers); commercial explanation reads
PRICING_READ_PROJECTION = Admin commercial pricing inspect/explain composing resolve* + book status
PRICING_CONCURRENCY = draft gate + activate overlap + expectedRevision on draft mutations
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

Concurrency: draft-gated edits; activation fingerprint — add `expectedRevision` on draft update
where product ACs require stale recovery (bounded column or updatedAt/version compare).

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
Tariff READ:
  selected outletId → load Outlet → derive Brand → requirePricingRead(Brand) → read tariff fields

Tariff MUTATION:
  selected outletId → load Outlet → derive Brand → requirePricingManage(Brand)
  → mutate only delivery_fee_bands + free_delivery_subtotal_threshold_paise
  → require expectedRevision on serviceability config row
  → write pricing-owned audit event (and bump config revision)
```

Do **not** use `requireOutletPricingManage` / outlet-targeted `pricing.manage` as Brand proof.
Do **not** authorize via `serviceability.manage` merely because columns co-reside.

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
MEDIA_MUTATION = FOLLOW_UP (DISC-F-010)
NO upload platform / object storage / CDN / scanning / registry locked here
```

---

## 17. Consequence-review composition

```text
existing authoritative domain state
+ proposed bounded mutation/draft
→ non-authoritative consequence/validation projection
→ operator confirmation
→ authoritative domain mutation/publish
```

Compose: entity identity; Brand/outlet scope; current vs proposed; timing/effective state;
customer-visible implication; price/promotion/tariff consequence.

```text
CONSEQUENCE_IS_SOURCE_OF_TRUTH = NO
NEW_WORKFLOW_ENGINE = NO
PERSISTED_INDEPENDENT_CONSEQUENCE_STORE = NO
```

Application operation: `previewCommercialConsequence` (read/validate only) before publish commands.

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
| Catalog mutation/publish | `MUTATION_AUDIT_GAP` | Add catalog mutation audit table/events |
| Menu mutation/publish | `MUTATION_AUDIT_GAP` | Add menu mutation audit events |
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

| Action | CURRENT_CONCURRENCY | FIT_DECISION | EXPECTED_REVISION_REQUIRED | DB_CONSTRAINT_REQUIRED | IDEMPOTENCY_REQUIRED | STALE_WRITE_RESULT |
|---|---|---|---|---|---|---|
| Catalog draft/edit/publish | LWW / none | Add contentRevision + gate ACTIVE fields | YES | YES (revision > 0; conditional update) | NO (unless transport retries use request keys later) | Conflict / reload |
| Menu organize/publish | LWW on missing updates | Add menu/graph revision on material commands | YES | YES | NO | Conflict / reload |
| Assortment mutation | Upsert LWW | Add rule revision or compare-and-set | YES | Preferred unique+revision | NO | Conflict / reload |
| Pricing draft/activate | Draft gate + activate overlap | Keep activate conflict; add draft expectedRevision | YES on draft edits | Preferred | Activate already conflict-checked | Conflict |
| Promotion/Coupon edit/activate | Draft gate + activate fingerprint | Add expectedRevision on draft updates | YES | Preferred | NO | Conflict / reload |
| Delivery tariff edit | Config revision exists; unused for tariff writes | Reuse serviceability `revision` + `expectedRevision` | YES | YES (existing) | NO | Conflict / reload |

No generic idempotency framework required for V1 Fit.

---

## 22. Persistence / schema impact

| Concern | Existing storage | Required change | Why | Authority owner | Migration required | Historical compatibility |
|---|---|---|---|---|---|---|
| Catalog content concurrency | `catalog_products` / `catalog_variants` | Add `content_revision`; tighten ACTIVE update rules | ADR-006 + ARCH-G09 | Catalog | YES | Backfill revision=1; IDs stable |
| Catalog publish draft overlay | lifecycle draft\|active only | Bounded draft change-set / overlay OR superseding draft publish path | Close ACTIVE in-place customer-affecting edits | Catalog | YES | Preserve snapshots |
| Catalog audit | none | New audit events table | Durable attribution | Catalog | YES | Append-only |
| Menu update/reorder | columns exist | Commands only; add `content_revision` on `menus` | Stale recovery | Menu | YES (revision col) | Backfill |
| Menu audit | none | New audit events | Attribution | Menu | YES | Append-only |
| Assortment concurrency | `assortment_rules` | Revision/CAS | ARCH-G09 | Assortment | YES preferred | Compatible |
| Pricing modifier attach | `price_book_modifier_prices` | Command surface (schema may suffice) | V1 modifier price authoring | Pricing | NO if table sufficient | Compatible |
| Pricing draft concurrency | `price_books` | Optional revision | Stale draft AC | Pricing | YES preferred | Compatible |
| Promotion draft concurrency | `promotions` / coupons | Optional revision | Stale draft AC | Promotions | YES preferred | Compatible |
| Delivery tariff fields | serviceability config columns | Write path + audit; no new tariff tables | Reuse accepted storage | Pricing (auth) / physical row shared | NO new columns; YES audit | Compatible |
| Media / tax manage | existing | none for V1 mutate | Boundaries | — | NO | — |

Strong preference: reuse tables; no duplicate mutable authorities; no tables solely for UI composition.

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
| Catalog ACTIVE field gate + publish + revision | ADD_BOUNDED_DOMAIN_COMMAND + SCHEMA_SUPPORT_REQUIRED |
| Menu create/activate/retire/graph | REUSE_EXISTING_COMMAND + ADD_TRANSPORT_WRAPPER |
| Menu update/reorder/display | ADD_BOUNDED_DOMAIN_COMMAND + ADD_TRANSPORT_WRAPPER |
| Assortment Brand mutate | REUSE_EXISTING_COMMAND + ADD_TRANSPORT_WRAPPER |
| Pricing variant books | REUSE_EXISTING_COMMAND + ADD_TRANSPORT_WRAPPER |
| Pricing modifier attach | ADD_BOUNDED_DOMAIN_COMMAND + ADD_TRANSPORT_WRAPPER |
| Promotions/Coupons | REUSE_EXISTING_COMMAND + ADD_TRANSPORT_WRAPPER |
| Delivery tariff | ADD_BOUNDED_APPLICATION_OPERATION + ADD_BOUNDED_DOMAIN_COMMAND + ADD_TRANSPORT_WRAPPER |
| Consequence / diagnosis / verification compose | ADD_READ_PROJECTION (+ application preview ops) |
| Tax/Charges inspect | ADD_READ_PROJECTION |
| Media view | ADD_READ_PROJECTION (fields already stored) |
| Customer Menu path | NO_IMPLEMENTATION_CHANGE to authority (regression only) |

---

## 24. Story / AC traceability

| Story ID | Mandatory ACs | Domain authority | Permission/resource | UI surface | Transport | Application/domain operation | Persistence | Concurrency | Customer consequence | Audit | Security notes | Fit | Ready after future lock |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| US-001 | 001-01…04 | Multi-read composition | catalog/menu/assortment/pricing/promotions read; outlet context reads | Commercial overview | Admin | commercial offering inspect projection | none | n/a | none direct | composed reads | no cross-scope leak | PASS | YES |
| US-002 | 002-01…05 | Catalog | catalog.manage @ Brand | Product/Variant authoring | Admin | create/update draft; publish gate | revision+audit | expectedRevision | none until publish | catalog audit | ACTIVE field gate | PASS | YES |
| US-003 | 003-01…02 | Catalog modifiers | catalog.manage @ Brand | Modifier association | Admin | existing modifier associate cmds + transport | none new tables | revision | after publish | catalog audit | no Modifier Library | PASS | YES |
| US-004 | 004-* lifecycle | Catalog | catalog.manage @ Brand | Lifecycle actions | Admin | activate/retire + publish rules | revision | expectedRevision | on activate | catalog audit | draft≠live | PASS | YES |
| US-005 | 005-* | Menu | menu.manage @ Brand | Menu flow | Admin | create + new update/reorder + activate | menu revision | expectedRevision | on Menu activate | menu audit | one-active Menu | PASS | YES |
| US-006 | 006-* | Assortment | assortment.manage @ Brand | Assortment commercial | Admin | include/exclude/retire | rule CAS | expectedRevision | eligibility | assortment audit | no Store manage | PASS | YES |
| US-007 | 007-* | Pricing | pricing.manage @ Brand | Pricing | Admin | price book cmds + modifier attach | optional revision | draft+activate | price resolve | pricing audit | Catalog≠money | PASS | YES |
| US-008 | 008-* | Promotions | promotions/coupons.* @ Brand | Promotions | Admin | existing promo/coupon cmds | optional revision | draft+activate | evaluation | promotion audit | no invented states | PASS | YES |
| US-009 | 009-* | Pricing tariff | pricing.read/manage @ Brand←Outlet | Tariff | Admin | new tariff read/mutate ops | reuse columns + audit | serviceability revision | delivery charge resolve | pricing tariff audit | not serviceability.manage | PASS | YES |
| US-010 | 010-* | Composition | domain reads | Consequence | Admin | previewCommercialConsequence | none authoritative | n/a | none until confirm | n/a | non-authoritative | PASS | YES |
| US-011 | 011-* | Catalog/Menu/Pricing/Promo | manage/activate | Publish | Admin | domain publish/activate after preview | as above | expectedRevision | D-368/pricing | domain audits | deliberate only | PASS | YES |
| US-012 | 012-* | Customer reads | commercial read context | Verification | Admin orchestrates `/api/v1` | existing customer Menu/price/checkout | none | n/a | truthful UX | n/a | no second projection | PASS | YES |
| US-013 | 013-* | Multi-read | partial reads | Diagnosis | Admin | diagnoseSellability composition | none | n/a | explanation only | n/a | fail closed | PASS | YES |
| US-014 | 014-01 view; 014-02 FOLLOW_UP | Menu/Catalog refs | read | Media inspect | Admin | read imagePath | none | n/a | none | n/a | no upload | PASS | YES (view) |
| US-015 | 015-* | UI | same auth | Desktop author; mobile inspect | static UI | n/a | none | n/a | n/a | n/a | mobile no mandatory mutate | PASS | YES |
| US-016 | 016-* | Tax/Charges | tax.read/charges.read | Inspect context | Admin | read projections | none | n/a | context only | existing pricing/tax audit read | no manage lock | PASS | YES |

```text
stories_mapped = 16
mandatory_ACs_mapped = YES (including tariff authorization resolution for US-009)
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
| Independent Architecture Fit review | REQUIRED (next gate) |
| Canonical lock persistence (ROADMAP/STATE/PD/capability lock markers) | NOT AUTHORIZED here |
| Exact Admin route path spelling / page split | Implementation detail after lock |
| Catalog draft overlay table vs in-row draft supersede mechanics | Bounded implementation choice under §9 strategy (same publication semantics) |
| Whether Assortment/Pricing/Promotion revision columns are strictly additive vs compare-and-set on `updated_at` | Prefer explicit revision columns; either must satisfy ARCH-G09 |
| AC-014-02 media mutation | FOLLOW_UP (approved) |

No `PRODUCT_DECISION_REQUIRED` and no `PRODUCT_ARCHITECTURE_CONFLICT` identified.

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

## 29. Proposed architecture-lock delta (REPORT ONLY — DO NOT PERSIST)

If independent review accepts this candidate, a **separate** authorized governance task may persist
approximately:

```text
ROADMAP: future GTM-R119 candidate
STATE: future STATE-R117 candidate

IMP036F_PRODUCT_DEFINITION = APPROVED
IMP036F_PRODUCT_DEFINITION_GATE = PASS
IMP036F_ARCHITECTURE_LOCKED = YES
IMP036F_IMPLEMENTATION_AUTHORIZED = NO
IMP036F_STARTED = NO
IMP036F_ACCEPTED = NO
IMP036G_ACTIVATED = NO
```

Exact version numbers follow repository convention at persistence time. This candidate does **not**
edit ROADMAP/STATE/PD/ARCHITECTURE/decision-register.

On lock persistence, this file’s `architectureLock` would become `ARCHITECTURE_LOCKED` under that
separate authorization — **not** performed here.

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
- Catalog ACTIVE updates: `src/server/catalog/products.ts`, `variants.ts`
- Menu commands: `src/server/catalog/menu/*`
- Assortment: `src/server/assortment/rules.ts`
- Pricing: `src/server/pricing/price-books.ts`, `resolve-delivery-charge.ts`
- Promotions: `src/server/promotions/*`
- Tariff columns without write path: `src/platform/database/schema/serviceability.ts`;
  `updateServiceabilityConfig` omits tariff fields
- Customer Menu: `src/server/customer-commerce/menu/project-customer-menu.ts` (`pickDefaultActiveVariant`)

---

## End matter

```text
ARCHITECTURE_FIT_CANDIDATE_RESULT = PASS
IMP036F_ARCHITECTURE_LOCKED = NO
IMPLEMENTATION_AUTHORIZED = NO
IMPLEMENTATION_STARTED = NO
NEXT_GATE = Independent review of this Architecture Fit candidate
THEN = Separate human authorization for architecture-lock persistence
STOP = Do not merge as lock; do not authorize implementation from this candidate alone
```
