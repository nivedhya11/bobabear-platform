<!-- governance-meta
{
  "status": "APPROVED",
  "authority": "PRODUCT_DEFINITION",
  "capability": "IMP-036F",
  "productDefinitionVersion": "PD-IMP-036F-DRAFT-1",
  "process": "PD-1",
  "verificationPolicy": "TEST-1",
  "lastReviewed": "2026-09-10",
  "productDefinitionGateExecution": "PERFORMED",
  "architectureFit": "PASS",
  "architectureFitExecution": "PERFORMED",
  "architectureLocked": "YES",
  "implementationAuthorized": "YES",
  "implementationStarted": "YES",
  "impAccepted": "NO",
  "imp036gActivated": "NO"
}
-->

# IMP-036F — Catalog, Menu, Pricing & Promotions Management

## Product Definition (APPROVED — Product Definition Gate PASS; Architecture Fit PASS / architecture locked)

```text
Document status: APPROVED
PRODUCT_DEFINITION_VERSION: PD-IMP-036F-DRAFT-1
PRE-GATE DRAFT: NO
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
ARCHITECTURE_FIT_EXECUTION: PERFORMED
ARCHITECTURE_FIT_RESULT: PASS
ARCHITECTURE_FIT: PASS
IMP036F_ARCHITECTURE_LOCKED: YES
IMP036F_IMPLEMENTATION_AUTHORIZED: YES
IMP036F_STARTED: YES
IMP036F_ACCEPTED: NO
IMP036G_ACTIVATED: NO
```

This artifact is the **gate-passed Product Definition** for candidate `PD-IMP-036F-DRAFT-1`.
Product Definition Gate = PASS. Architecture Fit = PASS; capability architecture is locked.
Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119.
Start does **not** complete or accept IMP-036F, or activate IMP-036G.

```text
PRODUCT_DELIVERY_PROCESS_EFFECTIVE_FROM = IMP-036F
HISTORICAL_ACCEPTED_IMPS_REWRITTEN = NO
IMP036E_LIFECYCLE_CHANGED = NO
PD1_DID_NOT_ACTIVATE_IMP036F_AT_ADOPTION = YES
```

Founder-approved discovery decisions encoded: `DISC-F-001` … `DISC-F-011` (approved product
direction; not unresolved proposals).

---

## 1. Identity / version / status

| Field | Definition |
|---|---|
| Capability / title | `IMP-036F — Catalog, Menu, Pricing & Promotions Management` |
| Product Definition version / document status | `PD-IMP-036F-DRAFT-1`; **Document status: APPROVED** |
| Product owner / approval evidence | Founder product direction via DISCOVER (`DISC-F-001`…`011`); Product Definition Gate **PASS** on 2026-09-10 (PR #140 review `5166877450`; gate-evaluated content SHA `014e0f935f193f54718d6afd5e7991508088f9bc`) |
| Process / verification policy | `PD-1` / `TEST-1` |
| Canonical anchors | VISION-1; ROADMAP GTM-R121; STATE STATE-R119; ARCH-R19; DR-15; PD-1; TEST-1; PERSONA-1; GJ-1 |
| Repository candidate | Canonical path `/home/ajoshi/repos/boba-bear-platform`; verified base `main` HEAD `1f59333d1a3bfe0dfecde908245306e2edacd834`; tree `284800a71a20d27c01b9c0cec7cadb45bb5d059b`; Product Definition Gate-evaluated PR head `014e0f935f193f54718d6afd5e7991508088f9bc`; Architecture Fit reviewed candidate head `9ae06d6267e997223b1995124540974215ee17fd` / tree `55adb287bb0eb77240a6becdc16fed2d504ba144` (independent review `5169723968`); architecture-lock persistence is a subsequent PR #141 commit |
| Capability lifecycle / authorization | ROADMAP/STATE: `IMPLEMENTATION_IN_PROGRESS`; `IMP036F_ACTIVATED: YES`; `IMP036F_PRODUCT_DEFINITION: APPROVED`; `IMP036F_PRODUCT_DEFINITION_GATE: PASS`; `IMP036F_ARCHITECTURE_FIT: PASS`; `IMP036F_ARCHITECTURE_LOCKED: YES`; implementation **authorized** / **started**; `IMP036F_ACCEPTED: NO`; `FOUNDER_UAT_REQUIRED: YES` |
| Relevant capability architecture / ADRs | Locked capability architecture [`capabilities/IMP-036F-catalog-menu-pricing-promotions-management.md`](../../capabilities/IMP-036F-catalog-menu-pricing-promotions-management.md); supporting plan [`experience/enterprise-experience/IMP-036F-catalog-menu-pricing-promotions.md`](../../experience/enterprise-experience/IMP-036F-catalog-menu-pricing-promotions.md); binding ADR-006, ADR-007, ADR-008 (as amended by accepted STATE / D-368–D-370); historical locks D-085…D-100, D-102, D-108–D-111, D-118, D-122–D-127, D-137–D-144 where applicable; accepted IMP-036E Store Assortment boundary |
| Founder UAT applicability | `FOUNDER_UAT_REQUIRED = YES` — materially changes operator commercial configuration and resulting customer discovery/orderability truth (ROADMAP/STATE) |

Behaviour classification vocabulary used throughout:

```text
CURRENT_SUPPORTED
PLANNED_IMP036F
DEFERRED
NOT_SUPPORTED
ARCHITECTURE_FIT_REQUIRED
PRODUCT_DECISION_REQUIRED
```

---

## 2. Business outcome

**Bounded end-to-end commercial management** for an authorized Brand commercial operator
(`DISC-F-001`):

An authorized operator can introduce or maintain an offering, present it accurately, price it
correctly, make it sellable in intended outlets, understand what prevents it from selling,
deliberately publish customer-visible change, and verify the resulting customer truth.

Observable success measure: one coherent commercial job completes from inspect → configure →
consequence review → deliberate publish/effect → authoritative customer verification, without
collapsing Catalog, Menu, Assortment, Availability, Pricing, Promotions, Serviceability, Delivery
Tariff, or Tax/Charges ownership.

Links VISION workforce commercial-configuration responsibility and owned direct-order Menu truth.

---

## 3. Problem statement

**Who:** Brand commercial operators (`PERSONA-WORKFORCE-OPERATOR` job context) and, as consequence
recipients, customers (`PERSONA-CUSTOMER`).

**Problem:** Commercial authorities largely exist as domain capabilities, but workforce management
experiences are fragmented or missing. Operators cannot reliably complete one coherent job of
“make this offering correctly sellable and verify customer truth.”

**Evidence-backed friction (CURRENT):**

| Area | Evidence class | Summary |
|---|---|---|
| Catalog workforce authoring | CURRENT_SUPPORTED domain; workforce UX gap | Catalog manage commands exist; coherent workforce Catalog management experience is missing |
| Menu organization/editing | CURRENT_SUPPORTED domain + customer projection; workforce UX gap | Menu commands and customer Menu projection exist; workforce Menu curation journey is incomplete/fragmented |
| Brand Assortment mutation | CURRENT_SUPPORTED domain; workforce UX gap | Brand Assortment authority exists; Store Assortment remains read/understand/escalate (IMP-036E); Brand end-to-end Assortment commercial flow is incomplete |
| Pricing authoring | CURRENT_SUPPORTED domain; workforce UX gap | Pricing manage / price books exist; coherent commercial pricing authoring UX is fragmented |
| Promotions/Coupons | CURRENT_SUPPORTED domain; workforce UX gap | Promotion/coupon manage exists; coherent campaign-management journey is missing |
| Delivery tariff | CURRENT_SUPPORTED calc/storage; workforce UX gap | Distance bands / free-delivery threshold accepted (IMP-036C); coherent workforce tariff management journey missing. Authorization mapping resolved by Architecture Fit (`pricing.read` / `pricing.manage` @ Brand derived from Outlet); implementation is authorized but has not started. |
| Consequence / audit | Distributed | Commercial audit/review evidence is distributed rather than a coherent operator consequence review |
| Media | CURRENT_SUPPORTED reference storage on Menu entries (`imagePath`); NOT_SUPPORTED platform; mutation workflow UNVERIFIED | Existing Menu-entry `imagePath` references may be viewed where present; no verified safe workforce select/change workflow for V1. Upload/storage/scanning/CDN platform is not required (DISC-F-010). Media-reference mutation is FOLLOW_UP under DISC-F-010 until a safe existing path is proven. |
| Catalog publication conformance | Architecture decision RESOLVED (locked `ENTITY_CONTENT_REVISION`); Implementation conformance work NOT YET IMPLEMENTED (authorized; not started) | ADR-006 requires draft→validate→publish→effective revision. Pre-Fit CURRENT runtime permitted customer-visible or customer-evaluation-affecting ACTIVE Product/Variant mutations without that publication boundary. Known examples: ACTIVE Product name/description; ACTIVE Variant default-selection (`isDefault`, via `updateVariant` + `pickDefaultActiveVariant` in customer Menu projection). Originally identified at Product Definition Gate as `ARCHITECTURE_FIT_CONFORMANCE_GAP`; later resolved by locked Catalog publication architecture. Runtime conformance remains pending implementation execution (authorized; not started). Do not claim every mutable Variant field (e.g. `isSelectorVisible`) necessarily changes customer projection unless verified. |

Do not treat implementation quirks as desired product behaviour.

---

## 4. Primary personas

| Persona ID | Responsibility / goal in this slice | Context / evidence |
|---|---|---|
| `PERSONA-WORKFORCE-OPERATOR` (primary) | Authorized Brand commercial operator: introduce/maintain offerings, organize presentation, configure assortment/price/promotion/delivery tariff, review consequence, publish deliberately, verify and diagnose sellability | [personas.md](../personas.md); VISION brand/outlet commercial configuration responsibility. **Persona ≠ role ≠ permission ≠ authorization.** |
| `PERSONA-CUSTOMER` (secondary consequence) | Discover truthful Menu offerings, understand price/orderability, complete purchase against authoritative evaluation | [personas.md](../personas.md); D-368 Menu projection; IMP-036E cross-portal truth pattern |

No new persona is created for the specialized commercial job.

---

## 5. Current-state journey

| Journey ID / evidence | Entry / preconditions | Activities today | Existing outcome / gap |
|---|---|---|---|
| Fragmented commercial ops (evidence across Catalog/Menu/Pricing/Promotions/Assortment domains + IMP-036E Store) | Authorized workforce session; Brand or Store scope depending on capability | Inspect Store Assortment/Availability (IMP-036E); mutate Availability/pause within Store scope; commercial Catalog/Menu/Pricing/Promotion/tariff mutation largely via incomplete or non-coherent surfaces / domain-only paths | Domain truth partially exists; coherent Brand commercial end-to-end job is **not** a CURRENT supported workforce journey |
| `JOURNEY-FIRST-ORDER` / `GJ-FIRST-ORDER` (CURRENT) | Customer discovery entry | Discover Menu → customize → cart → checkout → pay | Customer commerce CURRENT; depends on commercial configuration truth produced upstream |
| `JOURNEY-PRODUCT-MENU-LAUNCH` / `GJ-PRODUCT-MENU-LAUNCH` (PLANNED) | Intended commercial launch path | Not an accepted CURRENT workforce journey | Remains PLANNED; this Product Definition drafts the acceptance slice candidate |

Cross-portal accepted pattern (IMP-036E; preserve):

```text
WORKFORCE_MUTATION
→ EXISTING_DOMAIN_AUTHORITY
→ CUSTOMER_READ / EVALUATION
→ TRUTHFUL_CUSTOMER_EXPERIENCE

REALTIME_PUSH_GUARANTEE = NO
```

---

## 6. Desired-state journey

| Journey ID | Entry / context | Ordered activities | Success / downstream outcome | Alternate / recovery paths |
|---|---|---|---|---|
| `JOURNEY-PRODUCT-MENU-LAUNCH` (desired; still registry-PLANNED until accepted) | Authorized Brand commercial operator; Brand resource scope; existing domain authorities available | 1 Understand offering → 2 Introduce/maintain Product/Variant → 3 Configure Menu presentation → 4 Decide Assortment → 5 Configure price → 6 Configure promotion/coupon where needed → 7 Configure delivery tariff where relevant → 8 Review consequence → 9 Deliberately publish/effect → 10 Verify customer truth → 11 Diagnose sellability blockers | Offering is accurately presented, correctly priced, sellable in intended outlets, customer truth verifiable via authoritative read/evaluation | Validation failure; authorization denial; stale/conflict; draft vs published/effective; missing prerequisite; partial downstream consequence; recover/retry after correction; mobile limited to inspection/context only (no mandatory commercial mutations) |

Central product concept (`DISC-F-001`):

> As an authorized commercial operator, I can introduce or maintain an offering, organize how
> customers see it, configure where it sells and at what price/promotion, publish the
> customer-visible change deliberately, and verify the resulting customer experience.

Domain authorities remain distinct while the workflow is coherent:

```text
CATALOG | MENU | ASSORTMENT | AVAILABILITY | PRICING | PROMOTIONS
SERVICEABILITY | DELIVERY TARIFF | TAX / CHARGES
```

---

## 7. Story map

| Business outcome | Persona | Journey | Activity | Story IDs | Slice classification |
|---|---|---|---|---|---|
| Coherent commercial management | `PERSONA-WORKFORCE-OPERATOR` | `JOURNEY-PRODUCT-MENU-LAUNCH` | A1 Understand current commercial offering | `US-IMP-036F-001` | `V1_ACCEPTANCE_SLICE` |
| Coherent commercial management | `PERSONA-WORKFORCE-OPERATOR` | `JOURNEY-PRODUCT-MENU-LAUNCH` | A2 Introduce or maintain Product/Variant | `US-IMP-036F-002`, `US-IMP-036F-003`, `US-IMP-036F-004` | `V1_ACCEPTANCE_SLICE` |
| Coherent commercial management | `PERSONA-WORKFORCE-OPERATOR` | `JOURNEY-PRODUCT-MENU-LAUNCH` | A3 Configure customer presentation (Menu) | `US-IMP-036F-005` | `V1_ACCEPTANCE_SLICE` |
| Coherent commercial management | `PERSONA-WORKFORCE-OPERATOR` | `JOURNEY-PRODUCT-MENU-LAUNCH` | A4 Decide intended outlet Assortment | `US-IMP-036F-006` | `V1_ACCEPTANCE_SLICE` |
| Coherent commercial management | `PERSONA-WORKFORCE-OPERATOR` | `JOURNEY-PRODUCT-MENU-LAUNCH` | A5 Configure commercial price | `US-IMP-036F-007` | `V1_ACCEPTANCE_SLICE` |
| Coherent commercial management | `PERSONA-WORKFORCE-OPERATOR` | `JOURNEY-PRODUCT-MENU-LAUNCH` | A6 Configure applicable promotion/coupon | `US-IMP-036F-008` | `V1_ACCEPTANCE_SLICE` |
| Coherent commercial management | `PERSONA-WORKFORCE-OPERATOR` | `JOURNEY-PRODUCT-MENU-LAUNCH` | A7 Configure customer delivery tariff | `US-IMP-036F-009` | `V1_ACCEPTANCE_SLICE` |
| Coherent commercial management | `PERSONA-WORKFORCE-OPERATOR` | `JOURNEY-PRODUCT-MENU-LAUNCH` | A8 Review consequence | `US-IMP-036F-010` | `V1_ACCEPTANCE_SLICE` |
| Coherent commercial management | `PERSONA-WORKFORCE-OPERATOR` | `JOURNEY-PRODUCT-MENU-LAUNCH` | A9 Deliberately publish/effect customer-visible change | `US-IMP-036F-011` | `V1_ACCEPTANCE_SLICE` |
| Coherent commercial management | `PERSONA-WORKFORCE-OPERATOR` (+ `PERSONA-CUSTOMER` consequence) | `JOURNEY-PRODUCT-MENU-LAUNCH` | A10 Verify resulting customer discovery/ordering consequence | `US-IMP-036F-012` | `V1_ACCEPTANCE_SLICE` |
| Coherent commercial management | `PERSONA-WORKFORCE-OPERATOR` | `JOURNEY-PRODUCT-MENU-LAUNCH` | A11 Diagnose why something cannot currently be sold | `US-IMP-036F-013` | `V1_ACCEPTANCE_SLICE` |
| Coherent commercial management | `PERSONA-WORKFORCE-OPERATOR` | `JOURNEY-PRODUCT-MENU-LAUNCH` | Cross-cutting: media references | `US-IMP-036F-014` | `V1_ACCEPTANCE_SLICE` |
| Coherent commercial management | `PERSONA-WORKFORCE-OPERATOR` | `JOURNEY-PRODUCT-MENU-LAUNCH` | Cross-cutting: device experience | `US-IMP-036F-015` | `V1_ACCEPTANCE_SLICE` |
| Coherent commercial management | `PERSONA-WORKFORCE-OPERATOR` | `JOURNEY-PRODUCT-MENU-LAUNCH` | Cross-cutting: tax/charges inspection context | `US-IMP-036F-016` | `V1_ACCEPTANCE_SLICE` |

### Activity detail (authority / failures / deferrals)

| Activity | User job | Authority boundary | Important failure/recovery | Explicitly deferred |
|---|---|---|---|---|
| A1 Understand | See current Product/Variant/Menu/Assortment/price/promotion/tariff context without conflating authorities | Read across existing authorities; no mutation | Empty catalog; authorization denied; stale reference | Advanced analytics dashboards |
| A2 Introduce/maintain | Create/edit Product/Variant; lifecycle; associate existing modifiers | Catalog (`DISC-F-002`); ADR-006 draft/publish intent for customer-visible change | Validation failure; lifecycle denial; concurrent edit | Full Modifier Library; Bundle Builder |
| A3 Presentation | Section/category placement, order, visibility, display overrides where supported | Menu; one active customer Menu boundary; no new Menu lifecycle (`DISC-F-003`) | Invalid placement; unpublished draft | Multi-menu merchandising platform |
| A4 Assortment | Decide which intended outlets may offer a Variant | Brand Assortment; ≠ Availability; Outlet Manager does not gain Brand Assortment authority (`DISC-F-004`) | Scope denial; conflicting inheritance | Bulk Assortment campaigns without separate approval |
| A5 Price | Baseline Product/Variant (+ applicable modifier price concepts) with existing scope/timing | Pricing; Catalog never owns money (`DISC-F-005`); no new scheduling model | Incomplete price; invalid amount; conflict | Redefining checkout snapshot authority |
| A6 Promotion/coupon | Author/operate existing Promotions/Coupons | Promotions; preserve ADR-007 lifecycle (`DISC-F-007`) | Ineligible config; lifecycle denial | Campaign-media platform; invented states |
| A7 Delivery tariff | Configure customer delivery-price policy (bands / free-delivery rules already supported) | Delivery Tariff ≠ Serviceability ≠ provider cost (`DISC-F-008`) | Authorization gap; invalid bands | New tariff model; provider-cost merge |
| A8 Consequence review | Before consequential mutation/publish, understand change/scope/timing/visibility (`DISC-F-009`) | Composition across authorities; not a new truth source | Missing consequence fields; proceed blocked until review satisfied where required | Four-eyes approval; realtime push |
| A9 Publish/effect | Deliberate customer-visible effect; draft≠live mutation (`DISC-F-002`, ADR-006) | Catalog publication intent; existing Menu/Pricing/Promotion effect semantics | Validation gate fail; conflict; unauthorized | Active-record live mutation as desired behaviour |
| A10 Verify | Confirm customer truth via authoritative downstream read/evaluation | Customer projection/evaluation; `REALTIME_PUSH_GUARANTEE = NO` | Temporary stale read; retry/refresh | Websocket push guarantee |
| A11 Diagnose | Distinguish why an offering cannot sell | Comprehension over existing authorities; no new decision engine | Ambiguous/partial signals; escalate with context | Consolidated new backend decision service as product invention |

---

## 8. Acceptance slice

| Slice | Mandatory story IDs | Mandatory AC IDs | Required Golden Journeys | Observable acceptance boundary |
|---|---|---|---|---|
| `V1_ACCEPTANCE_SLICE` | `US-IMP-036F-001` … `US-IMP-036F-016` | All ACs marked `Mandatory in acceptance slice: YES` below (64 mandatory; AC-014-02 = NO / FOLLOW_UP) | **Mandatory for IMP-036F acceptance:** `GJ-PRODUCT-MENU-LAUNCH`; **supporting CURRENT deps (not re-accepted as F):** `GJ-FIRST-ORDER`, `GJ-AVAILABILITY`, `GJ-ADDRESS-SERVICEABILITY` | Authorized Brand commercial operator completes coherent inspect→configure→review→publish/effect→verify/diagnose job within existing authorities and V1 bounds |
| `FOLLOW_UP` | Advanced Modifier Library UX; Bundle Builder; richer audit composition UX if Architecture Fit requires phased delivery; media-reference select/change once a safe existing path is verified (DISC-F-010); any future simple mobile commercial mutations (none selected in this Product Definition) | TBD after Architecture Fit / later product gate or Product Definition revision | May affect `GJ-PRODUCT-MENU-LAUNCH` depth | Not silently required for V1 |
| `DEFERRED` | Media upload/storage/scanning/CDN; tax/charge administration product; role/permission editor; four-eyes; realtime push; new lifecycles/scheduling; generic bulk semantics; full complex mobile commercial authoring; IMP-036G console expansion | N/A | Not part of IMP-036F acceptance | Explicit non-goals |

Mandatory Golden Journey for eventual IMP-036F acceptance (finalized at Product Definition Gate PASS):
`GJ-PRODUCT-MENU-LAUNCH`. Registry status remains `PLANNED` (not CURRENT; not journey-test PASS).

---

## 9. User stories

```text
Story ID: US-IMP-036F-001
As a PERSONA-WORKFORCE-OPERATOR (Brand commercial operator job context)
I want to inspect the current commercial offering across Catalog, Menu, Assortment, Pricing,
Promotions, and delivery tariff context without conflating those authorities
so that I understand what is true before I change anything.

Journey / activity: JOURNEY-PRODUCT-MENU-LAUNCH / A1
Preconditions: Authenticated workforce session; Brand-authorized commercial read scope for the
entities inspected; existing domain data may be empty or populated.
Acceptance scenarios: AC-IMP-036F-001-01 … 001-04
Business rules: BR-IMP-036F-001, BR-IMP-036F-002
UX states: loading, empty, ready, authorization denied, not-found/stale, recoverable error
Permission / resource context: Existing server-side commercial read permissions/scopes only; no new
permission. Visibility ≠ authorization.
Error / recovery: Denied actions explain lack of authority without leaking cross-scope data; retry
after session/scope correction.
Dependencies: Accepted Catalog/Menu/Assortment/Pricing/Promotion/Serviceability read authorities
Explicit non-goals: Analytics product; Store Overview as commercial mutation surface
Data implications: Operator must not treat editable form state as customer truth; inspection reads
authoritative domain state only.
Security implications: Cross-Brand/outlet leakage forbidden; denial must not disclose out-of-scope
entities.
Architecture fit / applicable invariants: D-085 separations; D-368 projection ≠ authority
Open material decisions: NONE
Device applicability: Desktop/tablet full inspection; mobile inspection/context supported
Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119.
```

```text
Story ID: US-IMP-036F-002
As a PERSONA-WORKFORCE-OPERATOR (Brand commercial operator)
I want to create and edit Products and Variants as commercial drafts
so that I can introduce or maintain offerings without immediately changing customer-visible truth.

Journey / activity: JOURNEY-PRODUCT-MENU-LAUNCH / A2
Preconditions: Brand Catalog mutation authority; required identity/commercial fields satisfiable
Acceptance scenarios: AC-IMP-036F-002-01 … 002-05
Business rules: BR-IMP-036F-003, BR-IMP-036F-004, BR-IMP-036F-005
UX states: draft changed, validation error, stale/conflict, success pending confirmation
Permission / resource context: Existing Catalog manage authority; server-enforced
Error / recovery: Validation lists correctable issues; conflict requires reload/reconcile
Dependencies: ADR-006 Product/Variant model; D-087
Explicit non-goals: Desired behaviour is not active-record live customer mutation; full Bundle Builder
Data implications: Draft edits remain non-customer-visible until deliberate publish/effect path;
ACTIVE live mutation of customer-affecting Product/Variant fields is a conformance gap to close, not
desired behaviour.
Security implications: Server-side authorization; audit attribution expected via existing /
Architecture-Fit-approved path
Architecture fit / applicable invariants: Architecture decision RESOLVED by locked Catalog
ENTITY_CONTENT_REVISION; Implementation conformance work NOT YET IMPLEMENTED — AUTHORIZED / NOT_STARTED for
customer-visible or customer-evaluation-affecting ACTIVE Product/Variant mutations vs ADR-006
(known examples: ACTIVE Product name/description; ACTIVE Variant `isDefault` default-selection).
Originally identified at Product Definition Gate as ARCHITECTURE_FIT_CONFORMANCE_GAP; later
resolved by locked capability architecture.
Open material decisions: NONE (Founder intent ADR-006 preserved; architecture locked)
Device applicability: Desktop/tablet authoring required for V1; mobile inspection/context only
(no mandatory commercial mutations)
Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119.
```

```text
Story ID: US-IMP-036F-003
As a PERSONA-WORKFORCE-OPERATOR
I want to associate Products/Variants with existing supported modifier structures where needed
so that customers can customize offerings already modeled in Catalog.

Journey / activity: JOURNEY-PRODUCT-MENU-LAUNCH / A2
Preconditions: Existing modifier groups/options available; Catalog mutation authority
Acceptance scenarios: AC-IMP-036F-003-01 … 003-03
Business rules: BR-IMP-036F-006
UX states: domain prerequisite missing, validation error, ready
Permission / resource context: Existing Catalog authority only
Error / recovery: Missing modifier prerequisite blocks association with actionable message
Dependencies: ADR-006 modifier model; D-369 remains binding for customer paid-modifier selection
Explicit non-goals: Full advanced Modifier Library product; inventing typed modifier kinds
Data implications: Associations persist under existing Catalog modifier tables; no new modifier
identity invented here
Security implications: Server-side Catalog authorization; no client-asserted association authority
Architecture fit / applicable invariants: ADR-006 modifier association surfaces; D-369 preserved for
customer paid-modifier selection
Open material decisions: NONE
Device applicability: Desktop/tablet authoring; mobile inspection/context only
Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119.
```

```text
Story ID: US-IMP-036F-004
As a PERSONA-WORKFORCE-OPERATOR
I want to apply existing Product/Variant lifecycle transitions deliberately
so that offerings move through supported commercial states without hard-deleting history.

Journey / activity: JOURNEY-PRODUCT-MENU-LAUNCH / A2
Preconditions: Entity exists; transition permitted by existing lifecycle authority
Acceptance scenarios: AC-IMP-036F-004-01 … 004-03
Business rules: BR-IMP-036F-003, BR-IMP-036F-007
UX states: confirmation for consequential transition, authorization denied, recovery
Permission / resource context: Existing Catalog lifecycle authority
Error / recovery: Illegal transition rejected with reason; no silent skip
Dependencies: ADR-006 / D-089 DRAFT/ACTIVE/RETIRED; no hard-delete of historical entities
Explicit non-goals: New Catalog lifecycle states
Data implications: Lifecycle stamps/history remain queryable; no hard-delete of historically
referenced entities
Security implications: Consequential transitions require authorized actor and attributable audit via
existing / fit-approved path
Architecture fit / applicable invariants: ADR-006 / D-089 lifecycle; confirmation + audit composition
Open material decisions: NONE
Device applicability: Desktop/tablet for consequential lifecycle transitions; mobile
inspection/context only
Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119.
```

```text
Story ID: US-IMP-036F-005
As a PERSONA-WORKFORCE-OPERATOR
I want to organize the customer Menu (sections/categories, ordering, placement, visibility, and
supported display overrides)
so that customers see the intended presentation of sellable offerings.

Journey / activity: JOURNEY-PRODUCT-MENU-LAUNCH / A3
Preconditions: Catalog entities eligible for placement; Menu mutation authority; preserve one active
customer Menu boundary
Acceptance scenarios: AC-IMP-036F-005-01 … 005-05
Business rules: BR-IMP-036F-008, BR-IMP-036F-009
UX states: draft changed, validation error, empty sections, publish confirmation where applicable
Permission / resource context: Existing Menu manage authority; no new Menu lifecycle invented
Error / recovery: Invalid references rejected; reorder conflicts recoverable
Dependencies: ADR-006 Menu vs Category (D-086); customer Menu projection D-368
Explicit non-goals: Multi-active customer menus; inventing unsupported publication states
Data implications: Menu placement/order/visibility persist under existing Menu authority; display
overrides do not redefine Catalog identity
Security implications: Server-side Menu authorization; no cross-Brand Menu leakage
Architecture fit / applicable invariants: D-086 Menu≠Category; D-368 projection; one active customer
Menu boundary
Open material decisions: NONE
Device applicability: Desktop/tablet authoring; mobile inspection/context only
Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119.
```

```text
Story ID: US-IMP-036F-006
As a PERSONA-WORKFORCE-OPERATOR
I want to set Brand Assortment so intended outlets may offer a Variant
so that sellability intent is explicit and separate from operational Availability.

Journey / activity: JOURNEY-PRODUCT-MENU-LAUNCH / A4
Preconditions: Brand Assortment authority; Variant exists; outlet(s) in Brand scope
Acceptance scenarios: AC-IMP-036F-006-01 … 006-04
Business rules: BR-IMP-036F-010, BR-IMP-036F-011
UX states: consequence (outlet scope), authorization denied, success feedback
Permission / resource context: Brand Assortment only. Outlet Manager Store Assortment remains
read/understand/escalate (IMP-036E); no new Brand Assortment grant to Outlet Manager.
Error / recovery: Cross-scope denial; conflicting assortment state requires explicit correction
Dependencies: D-094 inheritance; D-095/D-096/D-100; IMP-036E accepted Store behaviour
Explicit non-goals: Collapsing Assortment with Availability; Store Overview auto-mutation
Data implications: Assortment intent remains distinct from Availability records; inheritance rules
unchanged
Security implications: Brand Assortment mutation denied outside Brand authority; OM cannot obtain
Brand Assortment mutation via this slice
Architecture fit / applicable invariants: D-094–D-096/D-100; IMP-036E Store Assortment boundary
Open material decisions: NONE
Device applicability: Desktop/tablet Brand Assortment authoring; mobile inspection/context only
Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119.
```

```text
Story ID: US-IMP-036F-007
As a PERSONA-WORKFORCE-OPERATOR
I want to configure Brand baseline Product/Variant pricing and applicable modifier price concepts
using existing scope/effective-timing semantics
so that customer display and checkout evaluation resolve correct commercial amounts.

Journey / activity: JOURNEY-PRODUCT-MENU-LAUNCH / A5
Preconditions: Pricing manage authority; Catalog entities exist; currency unambiguous
Acceptance scenarios: AC-IMP-036F-007-01 … 007-05
Business rules: BR-IMP-036F-012, BR-IMP-036F-013
UX states: validation error (amount/currency), draft vs effective, stale/conflict, confirmation
Permission / resource context: Existing Pricing authority; Catalog does not own money (D-102)
Error / recovery: Invalid/incomplete pricing blocks effect; conflict recoverable after reload
Dependencies: ADR-007 price books / modifier prices; existing effective timing only
Explicit non-goals: New scheduling model; redefining checkout price-snapshot authority
Data implications: Monetary values currency-aware; checkout/order snapshots remain immutable after
transaction; Catalog does not persist authoritative money
Security implications: Pricing mutation server-authorized; no client-asserted monetary authority
Architecture fit / applicable invariants: D-102 Catalog≠money; ADR-007 price books / timing;
workforce pricing authoring surface composition
Open material decisions: NONE
Device applicability: Desktop/tablet pricing authoring; mobile inspection/context only
Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119.
```

```text
Story ID: US-IMP-036F-008
As a PERSONA-WORKFORCE-OPERATOR
I want to author and operate existing supported Promotions and Coupons through their existing
lifecycle semantics
so that promotional eligibility and benefits are intentional and auditable.

Journey / activity: JOURNEY-PRODUCT-MENU-LAUNCH / A6
Preconditions: Promotions/Coupons manage authority; eligible catalog/pricing context as required
Acceptance scenarios: AC-IMP-036F-008-01 … 008-05
Business rules: BR-IMP-036F-014
UX states: draft/lifecycle confirmation, validation failure, authorization denied, success
Permission / resource context: Existing promotions/coupons permissions only
Error / recovery: Invalid eligibility rejected; disabled coupon does not rewrite pricing engine
Dependencies: ADR-007 promotion/coupon model (D-122–D-127); preserve existing lifecycle
Explicit non-goals: Invented lifecycle labels; campaign-media platform; arbitrary scripting
Data implications: Promotions/Coupons persist under existing promotional authority; coupons do not
embed separate pricing logic
Security implications: Server-side promotions/coupons authorization; no invented permission
Architecture fit / applicable invariants: ADR-007 / D-122–D-127 lifecycle fidelity; coherent
workforce promotion authoring surface
Open material decisions: NONE
Device applicability: Desktop/tablet authoring; mobile inspection/context only
Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119.
```

```text
Story ID: US-IMP-036F-009
As a PERSONA-WORKFORCE-OPERATOR
I want to configure customer delivery tariff using existing distance-band and free-delivery concepts
so that customer delivery price policy is deliberate commercial monetary configuration.

Journey / activity: JOURNEY-PRODUCT-MENU-LAUNCH / A7
Preconditions: Locked capability architecture maps tariff authorization/command path; authorized
commercial actor for the target outlet/resource; existing IMP-036C tariff concepts available as
configuration targets.
(Pre-Fit provenance: originally identified at Product Definition Gate as
ARCHITECTURE_FIT_AUTHORIZATION_GAP; later resolved by locked capability architecture.)
Acceptance scenarios: AC-IMP-036F-009-01 … 009-05
Business rules: BR-IMP-036F-015, BR-IMP-036F-016
UX states: validation error, authorization denied, confirmation, success
Permission / resource context:
DELIVERY_TARIFF_AUTHORITY = PRICING
Tariff read: pricing.read @ Brand derived server-side from Outlet
Tariff mutation: pricing.manage @ Brand derived server-side from Outlet
SERVICEABILITY_MANAGE_AUTHORIZES_TARIFF_PRICE = NO
NEW_PERMISSION_REQUIRED = NO
Architecture Fit status: RESOLVED / PASS / LOCKED
Error / recovery: Invalid bands/thresholds rejected; unauthorized mutation denied without changing
prior tariff; Serviceability settings remain separately editable
Dependencies: IMP-036C delivery fee bands / free-delivery threshold; D-118; D-143;
locked Pricing tariff permission/command mapping
Explicit non-goals: New tariff model; merging provider cost; collapsing with Serviceability;
inventing a new permission
Data implications: Customer delivery-price policy persists under existing tariff storage; provider
cost and Serviceability data remain separate authorities
Security implications: Server-authoritative allow/deny on pricing.manage path; cross-scope
information must not leak on denial
Architecture fit / applicable invariants: D-118; D-143; DISC-F-008 separations;
DELIVERY_TARIFF_AUTHORITY = PRICING; Architecture Fit status RESOLVED / PASS / LOCKED
Open material decisions: NONE (authorization mechanism locked; not a new Founder product choice)
Device applicability: Desktop/tablet tariff authoring; mobile inspection/context only
Classification: PLANNED_IMP036F; tariff auth mapping locked (pricing.manage @ Brand←Outlet)
Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119.
```

```text
Story ID: US-IMP-036F-010
As a PERSONA-WORKFORCE-OPERATOR
I want a consequence review before consequential commercial mutation/publish
so that I understand what will change for Brand/outlet scope, timing, money, and customer visibility.

Journey / activity: JOURNEY-PRODUCT-MENU-LAUNCH / A8
Preconditions: Pending consequential change drafted; operator authorized to attempt the action
Acceptance scenarios: AC-IMP-036F-010-01 … 010-04
Business rules: BR-IMP-036F-017
UX states: consequence summary ready; missing prerequisite; confirmation; cancel/back
Permission / resource context: Same as underlying mutation; review is not a second approver
Error / recovery: Incomplete consequence review blocks publish where required; cancel leaves draft
Dependencies: Composition across authorities without new source of truth
Explicit non-goals: Four-eyes approval; guaranteed instant customer push
Data implications: Consequence review is presentation/composition over existing authorities; it does
not create a new commercial truth store
Security implications: Consequence presentation must not leak entities outside authorized scope
Architecture fit / applicable invariants: Consequence/verification composition without inventing a
false single source of truth (ARCHITECTURE_FIT_REQUIRED for composition mechanism)
Open material decisions: NONE
Device applicability: Desktop/tablet for consequential review/publish path; mobile
inspection/context only
Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119.
```

```text
Story ID: US-IMP-036F-011
As a PERSONA-WORKFORCE-OPERATOR
I want to deliberately publish/effect customer-visible commercial change after validation
so that customers resolve new effective truth only through intentional publication/effect.

Journey / activity: JOURNEY-PRODUCT-MENU-LAUNCH / A9
Preconditions: Draft changes validated; consequence review completed where required; authority present
Acceptance scenarios: AC-IMP-036F-011-01 … 011-05
Business rules: BR-IMP-036F-004, BR-IMP-036F-005, BR-IMP-036F-018
UX states: validate; publish/effective confirmation; success with verifiable resulting state; conflict
Permission / resource context: Existing domain publish/effect authorities only
Error / recovery: Validation failure lists issues; conflict requires reconcile; unauthorized denied
Dependencies: ADR-006 draft→validate→publish→effective revision intent; existing Menu/Pricing/
Promotion effect semantics
Explicit non-goals: Treating live ACTIVE Product/Variant field mutation as desired product behaviour
Data implications: Effective/published commercial truth must be distinguishable from draft; customer
resolves effective revision only after deliberate publish/effect
Security implications: Publish/effect server-authorized; unauthorized attempt leaves customer truth
unchanged
Architecture fit / applicable invariants: ADR-006 publication boundary; Architecture decision
RESOLVED by locked Catalog ENTITY_CONTENT_REVISION; Implementation conformance work NOT YET
IMPLEMENTED — AUTHORIZED / NOT_STARTED for customer-visible or customer-evaluation-affecting ACTIVE
Product/Variant mutations (known examples: ACTIVE Product name/description; ACTIVE Variant
`isDefault`). Originally identified at Product Definition Gate as ARCHITECTURE_FIT_CONFORMANCE_GAP;
later resolved by locked capability architecture.
Open material decisions: NONE
Device applicability: Desktop/tablet publish/effect; mobile inspection/context only
Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119.
```

```text
Story ID: US-IMP-036F-012
As a PERSONA-WORKFORCE-OPERATOR
I want to verify resulting customer discovery/orderability after publish/effect
so that I confirm authoritative customer truth rather than trusting the edit form.

Journey / activity: JOURNEY-PRODUCT-MENU-LAUNCH / A10
Preconditions: Publish/effect succeeded or no-op documented; operator can access verification path
Acceptance scenarios: AC-IMP-036F-012-01 … 012-04
Business rules: BR-IMP-036F-019
UX states: verification loading; verified match; partial downstream consequence; retry
Permission / resource context: Read of customer projection/evaluation and/or authorized verification
views; no requirement for realtime push
Error / recovery: If verification read is temporarily inconsistent, retry/refresh is valid; do not
promise websocket propagation
Dependencies: D-368; IMP-036E REALTIME_PUSH_GUARANTEE = NO; GJ-FIRST-ORDER continuity
Explicit non-goals: Realtime customer push guarantee
Data implications: Verification uses authoritative downstream read/evaluation; form state is not
customer truth
Security implications: Verification paths must respect authorized outlet/customer evaluation scope
Architecture fit / applicable invariants: D-368 Menu projection; verification composition across
authorities; REALTIME_PUSH_GUARANTEE = NO
Open material decisions: NONE
Device applicability: Desktop/tablet verification workflow; mobile may support inspection/context
verification reads where operable, without requiring full authoring
Secondary persona consequence: PERSONA-CUSTOMER experiences truthful Menu/order evaluation
Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119.
```

```text
Story ID: US-IMP-036F-013
As a PERSONA-WORKFORCE-OPERATOR
I want a user-facing diagnosis of why an offering cannot currently be sold
so that I can distinguish Catalog/Menu/Assortment/Availability/Pricing/Promotion/hours/Serviceability
and other authoritative constraints without guessing.

Journey / activity: JOURNEY-PRODUCT-MENU-LAUNCH / A11
Preconditions: Target Product/Variant/outlet(/customer location where relevant) identifiable
Acceptance scenarios: AC-IMP-036F-013-01 … 013-05
Business rules: BR-IMP-036F-020
UX states: diagnosis ready; partial signals; domain prerequisite missing; support escalation context
Permission / resource context: Existing read authorities composed for comprehension
Error / recovery: Unknown/unsupported signal labeled honestly; escalate with entity/scope references
Dependencies: Existing authorities (D-097 effective menu composition concepts, Availability, etc.)
Explicit non-goals: Inventing a new consolidated backend decision engine as product mechanism
Data implications: Diagnosis composes existing authoritative signals; does not invent new sellability
truth
Security implications: Diagnosis must not leak out-of-scope Brand/outlet entities
Architecture fit / applicable invariants: How existing authorities supply diagnosis truth
(ARCHITECTURE_FIT_REQUIRED for diagnosis composition); D-097 concepts
Open material decisions: NONE
Device applicability: Desktop/tablet diagnosis; mobile inspection/context diagnosis supported where
operable
Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119.
```

```text
Story ID: US-IMP-036F-014
As a PERSONA-WORKFORCE-OPERATOR
I want to view existing media references on offerings where present
so that customer presentation context is visible during commercial inspection without requiring a
media platform or inventing an unverified select/change workflow.

Journey / activity: Cross-cutting (A1/A2/A3 inspection context)
Preconditions: An offering may already carry a supported media reference (e.g. Menu-entry
`imagePath` populated by prior import/create paths)
Acceptance scenarios: AC-IMP-036F-014-01 … 014-03
Business rules: BR-IMP-036F-021
UX states: ready; empty media; unsupported mutation/upload affordances not offered as available
Permission / resource context: Existing read visibility of stored media references only for V1
mandatory acceptance; no new media permission
Error / recovery: Unsupported upload or unverified select/change paths are not offered as if
available
Dependencies: Existing Menu-entry `imagePath` reference storage; D-093 brand-owned metadata intent;
DISC-F-010
Explicit non-goals: Upload pipeline; storage service; scanning; transformation; CDN management;
invention of asset registry; mandatory media-reference mutation in this V1 slice
Data implications: V1 inspects existing reference values only; does not require new media schema.
Local Menu-entry `imagePath` exists as CURRENT storage, but no safe workforce select/change
workflow is verified for V1 acceptance.
Security implications: Do not expose upload/CDN management surfaces; reference display must respect
authorized commercial scope
Architecture fit / applicable invariants: DISC-F-010 bound; no asset infrastructure invented;
optional later mapping of any verified existing select/change path is FOLLOW_UP
Open material decisions: NONE (deferring unverified media-reference mutation is authorized by
DISC-F-010; no new Founder decision required)
Device applicability: Desktop/tablet/mobile inspection of existing references as context
Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119.
```

```text
Story ID: US-IMP-036F-015
As a PERSONA-WORKFORCE-OPERATOR
I want full commercial authoring on desktop and tablet, with mobile limited to inspection/context
so that complex V1 authoring is not blocked by mobile constraints and the V1 device boundary is
objectively testable.

Journey / activity: Cross-cutting device experience
Preconditions: Supported viewport contexts (desktop, tablet, mobile)
Acceptance scenarios: AC-IMP-036F-015-01 … 015-03
Business rules: BR-IMP-036F-022
UX states: mobile non-mutation limitation messaging; desktop/tablet ready authoring
Permission / resource context: Unchanged from underlying stories; device does not grant authority
Error / recovery: N/A beyond clear mobile non-mutation boundary messaging when commercial mutation
is attempted on mobile
Dependencies: DISC-F-011 (approved; not reopened)
Explicit non-goals: Full complex mobile commercial authoring as V1 acceptance requirement; any
mobile commercial mutation as mandatory V1 behaviour
Data implications: N/A — device boundary does not change commercial data authorities
Security implications: N/A — device viewport does not alter authorization; server authority unchanged
Architecture fit / applicable invariants: N/A beyond responsive presentation of existing surfaces;
no architecture topology change
Open material decisions: NONE — this Product Definition selects no simple mobile mutation actions.
V1 boundary:

DESKTOP / TABLET: full IMP-036F V1 commercial authoring
MOBILE: inspection / context only required for V1
MOBILE COMMERCIAL MUTATIONS: none mandatory in this Product Definition

Any future simple mobile mutation requires explicit selection plus story/AC coverage through a later
Product Definition revision or separately authorized follow-up.
Device applicability: Desktop and tablet mandatory for full V1 authoring; mobile mandatory for
inspection/context support (not “unsupported”)
Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119.
```

```text
Story ID: US-IMP-036F-016
As a PERSONA-WORKFORCE-OPERATOR
I want inspection/context for Tax/Charges where relevant to commercial understanding
so that I do not confuse ordinary commercial workflow with general tax/charge administration.

Journey / activity: Cross-cutting commercial context
Preconditions: Existing tax/charge configuration may be present
Acceptance scenarios: AC-IMP-036F-016-01 … 016-02
Business rules: BR-IMP-036F-023
UX states: inspection ready; administration actions not offered as V1 commercial workflow
Permission / resource context: Existing read visibility only for V1 commercial journey
Error / recovery: N/A — administration is out of V1 commercial workflow rather than an error path
Dependencies: ADR-007 Tax/Charges authority remains separate (DISC-F-006)
Explicit non-goals: General tax administration; general charge administration in ordinary commercial
workflow
Data implications: Tax/Charges remain separate authority data; V1 does not mutate tax/charge
administration records as part of the commercial journey
Security implications: Inspection must not escalate into unauthorized tax/charge administration
Architecture fit / applicable invariants: DISC-F-006 / ADR-007 Tax/Charges separation from ordinary
commercial workflow
Open material decisions: NONE
Device applicability: Desktop/tablet/mobile inspection/context as applicable
Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119.
```

---

## 10. Acceptance scenarios

```text
AC-IMP-036F-001-01 — Inspect coherent commercial overview
Story: US-IMP-036F-001
Given an authorized Brand commercial operator and at least one Product/Variant in scope
When the operator opens commercial inspection for that offering
Then Catalog, Menu placement, Assortment intent, Availability (as operational context), Pricing,
Promotions, and delivery-tariff context are distinguishable
And no authority is presented as owning another authority’s truth
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-001-02 — Empty commercial catalog
Story: US-IMP-036F-001
Given authorized scope with no Products
When the operator enters Catalog inspection
Then an empty state explains that no offerings exist and offers a next action to introduce one (if authorized)
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-001-03 — Authorization denied on inspect mutation affordance
Story: US-IMP-036F-001
Given a workforce actor without Brand commercial mutation authority
When the actor views commercial surfaces available to their scope
Then mutation actions are unavailable or denied server-side
And denial does not leak out-of-scope Brand/outlet data
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-001-04 — Stale reference
Story: US-IMP-036F-001
Given an operator holds a reference to a Product/Variant that no longer exists or is out of scope
When they attempt to inspect it
Then the experience reports not-found/stale without implying customer truth
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-002-01 — Create Product/Variant draft
Story: US-IMP-036F-002
Given Brand Catalog authority
When the operator creates a Product with at least one Variant using valid inputs
Then the offering exists as non-customer-visible draft/commercial work pending deliberate publish/effect
And customer Menu projection does not newly expose it solely because the record was saved
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-002-02 — Edit Product/Variant draft fields
Story: US-IMP-036F-002
Given a draft Product/Variant
When the operator changes name/description/structure fields and saves draft
Then draft state reflects changes
And customer-visible effective truth is unchanged until publish/effect
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-002-03 — Validation failure on Product/Variant
Story: US-IMP-036F-002
Given invalid or incomplete required commercial structure
When the operator attempts to save or validate
Then field-associated validation errors appear and no publish/effect occurs
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-002-04 — Concurrent/stale edit conflict
Story: US-IMP-036F-002
Given another authorized change updated the same entity
When the operator attempts to save a stale draft
Then a conflict/stale state is shown and recovery requires reload/reconcile
And silent overwrite does not occur
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-002-05 — Accessibility of authoring form
Story: US-IMP-036F-002
Given desktop/tablet authoring
When the operator completes create/edit using keyboard only
Then focus order is operable, labels are meaningful, and errors are programmatically associated
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-003-01 — Associate existing modifier structure
Story: US-IMP-036F-003
Given existing supported modifier groups/options
When the operator associates them to a Product/Variant where supported
Then the association is recorded for subsequent validation/publish paths
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-003-02 — Missing modifier prerequisite
Story: US-IMP-036F-003
Given no usable existing modifier structures
When the operator seeks to associate modifiers
Then the UI explains the prerequisite without inventing a full Modifier Library product
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-003-03 — Unauthorized modifier association
Story: US-IMP-036F-003
Given lacking Catalog mutation authority
When association is attempted
Then server-side denial occurs
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-004-01 — Legal lifecycle transition
Story: US-IMP-036F-004
Given a Product/Variant in a state that permits a supported transition
When the operator confirms the transition
Then the new lifecycle state is visible and historically referenced entities remain queryable
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-004-02 — Illegal lifecycle transition
Story: US-IMP-036F-004
Given a disallowed transition
When the operator attempts it
Then the action is rejected with an understandable reason
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-004-03 — No hard delete
Story: US-IMP-036F-004
Given a historically referenced catalog entity
When the operator seeks to remove it
Then hard-delete is not offered as the supported path; retirement/history-preserving behaviour applies
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-005-01 — Place item in Menu section and reorder
Story: US-IMP-036F-005
Given eligible Catalog items and Menu authority
When the operator places items into sections and reorders them
Then customer presentation order/placement reflects the intended Menu organization after effect
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-005-02 — Visibility / display override
Story: US-IMP-036F-005
Given supported display override fields
When the operator sets visibility or customer-facing display overrides
Then overrides apply only through supported Menu semantics and do not redefine Catalog identity
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-005-03 — Preserve one active customer Menu boundary
Story: US-IMP-036F-005
Given the existing customer boundary of one active Menu
When the operator manages Menu organization
Then the experience does not invent multiple simultaneous active customer Menus
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-005-04 — Invalid Menu reference
Story: US-IMP-036F-005
Given a placement referencing an invalid/retired entity
When validate/effect is attempted
Then validation fails and customer presentation is unchanged
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-005-05 — Tablet Menu authoring
Story: US-IMP-036F-005
Given a tablet viewport
When the operator reorders and places items
Then the workflow remains operable without requiring desktop-only chrome
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-006-01 — Include Variant in intended outlet Assortment
Story: US-IMP-036F-006
Given Brand Assortment authority and a Variant
When the operator includes the Variant for intended outlet(s)
Then Assortment intent shows those outlets as permitted/intended offerers
And Availability remains a separate operational concern
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-006-02 — Exclude / narrow Assortment
Story: US-IMP-036F-006
Given existing Assortment inheritance/rules
When the operator excludes or narrows a Variant for an outlet within supported model
Then the outlet is no longer intended to offer it, independent of Availability toggles
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-006-03 — Outlet Manager cannot gain Brand Assortment authority
Story: US-IMP-036F-006
Given an Outlet Manager within accepted IMP-036E Store scope
When Assortment is viewed in Store context
Then behaviour remains read/understand/escalate
And Brand Assortment mutation is not granted by this Product Definition
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-006-04 — Unauthorized Brand Assortment mutation
Story: US-IMP-036F-006
Given an actor without Brand Assortment authority
When mutation is attempted
Then server-side denial occurs
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-007-01 — Set baseline Variant price
Story: US-IMP-036F-007
Given Pricing authority and a Variant
When the operator sets a valid currency-aware baseline price under existing scope/timing semantics
Then the configured commercial price is available to authoritative evaluation after effect
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-007-02 — Modifier price concept where supported
Story: US-IMP-036F-007
Given supported modifier price entries
When the operator configures an applicable modifier price delta
Then amounts are explicit and currency-aware
And D-369 customer explicit-selection rules remain unchanged
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-007-03 — Invalid monetary input
Story: US-IMP-036F-007
Given non-numeric, negative-where-disallowed, or currency-ambiguous input
When save/effect is attempted
Then validation fails with associated errors and no monetary effect occurs
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-007-04 — Incomplete pricing blocks sellability diagnosis honesty
Story: US-IMP-036F-007
Given a Variant missing effective price completeness required to sell
When diagnosis or publish validation runs
Then pricing incompleteness is visible as a blocker where authoritative
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-007-05 — Checkout snapshot authority unchanged
Story: US-IMP-036F-007
Given a completed historical checkout/order
When commercial prices later change
Then immutable checkout/order snapshots remain authoritative for that transaction
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-008-01 — Author Promotion in existing lifecycle
Story: US-IMP-036F-008
Given Promotions authority
When the operator creates/edits a Promotion using a supported structure and valid lifecycle transition
Then the Promotion follows existing ADR-007 lifecycle semantics only
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-008-02 — Operate Coupon against Promotion identity
Story: US-IMP-036F-008
Given a Promotion and Coupons authority
When the operator creates or disables a Coupon code referencing that Promotion
Then coupon operation does not embed separate pricing logic
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-008-03 — Validation failure on eligibility
Story: US-IMP-036F-008
Given incompatible/invalid eligibility configuration
When save/activate is attempted
Then validation fails and customer promotional truth is unchanged
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-008-04 — Unauthorized promotion mutation
Story: US-IMP-036F-008
Given lacking promotions authority
When mutation is attempted
Then server-side denial occurs
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-008-05 — No invented lifecycle labels
Story: US-IMP-036F-008
Given the promotions management experience
When lifecycle is displayed/acted upon
Then only existing authoritative states are used (no newly invented scheduled/ended product labels)
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-009-01 — Configure distance-band delivery fees
Story: US-IMP-036F-009
Given Architecture Fit has mapped an existing valid authorization/command path for tariff mutation
And an authorized commercial actor operates on an in-scope outlet
When the operator sets supported distance bands and fee values through that authoritative path
Then customer delivery-price policy reflects those bands after effect
And Serviceability distance/eligibility configuration remains a separate concern
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-009-02 — Configure free-delivery threshold/rule already supported
Story: US-IMP-036F-009
Given Architecture Fit has mapped the authoritative tariff mutation path
And supported free-delivery threshold configuration is available
When an authorized operator sets or clears the threshold
Then checkout evaluation uses the configured commercial rule after effect
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-009-03 — Invalid tariff configuration
Story: US-IMP-036F-009
Given overlapping/unordered bands or invalid monetary values
When save is attempted
Then validation fails and prior tariff remains in force
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-009-04 — Provider cost remains separate
Story: US-IMP-036F-009
Given delivery tariff configuration UI
When the operator configures customer delivery price
Then provider/carrier operating cost is not presented as the same field or merged authority
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-009-05 — Unauthorized tariff mutation denied
Story: US-IMP-036F-009
Given Architecture Fit has established the authoritative tariff mutation path
And the workforce actor lacks the required authority for the target resource
When tariff mutation is attempted
Then the server-authoritative operation is denied
And the prior tariff remains unchanged
And cross-scope information is not leaked
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-010-01 — Consequence review before publish
Story: US-IMP-036F-010
Given a consequential Catalog/Menu/Assortment/Pricing/Promotion/tariff change ready to effect
When the operator proceeds to publish/effect
Then a consequence review shows relevant Brand/outlet/Product/Variant/Menu/money/timing/visibility
dimensions that apply (only relevant dimensions)
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-010-02 — Cancel leaves draft intact
Story: US-IMP-036F-010
Given consequence review is open
When the operator cancels
Then no publish/effect occurs and draft work remains available
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-010-03 — No second-human approver required
Story: US-IMP-036F-010
Given a single authorized operator
When consequence review and publish proceed
Then four-eyes approval is not required by V1
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-010-04 — Draft vs published/effective explicit
Story: US-IMP-036F-010
Given mixed draft and effective state
When consequence review is shown
Then draft versus published/effective status is explicit
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-011-01 — Validate then publish Catalog customer-visible change
Story: US-IMP-036F-011
Given draft Catalog changes
When the operator validates structure and deliberately publishes/effects
Then customer-visible Catalog truth updates only through the intended
EDIT DRAFT → VALIDATE → PUBLISH → CREATE/ACTIVATE EFFECTIVE REVISION → CUSTOMER RESOLVES path
And active-record live mutation is not the desired product behaviour
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-011-02 — Validation failure blocks publish
Story: US-IMP-036F-011
Given structurally invalid draft Catalog/Menu references
When publish is attempted
Then publish is blocked with actionable validation errors
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-011-03 — Authorization denied on publish
Story: US-IMP-036F-011
Given lacking publish/effect authority
When publish is attempted
Then server-side denial occurs and customer truth is unchanged
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-011-04 — Successful publish has verifiable resulting state
Story: US-IMP-036F-011
Given a successful publish/effect
When the operator views resulting state
Then effective/published state is visible and attributable through appropriate audit authority
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-011-05 — No-op when unchanged
Story: US-IMP-036F-011
Given no material draft differences from effective truth
When publish is attempted
Then the experience reports no-op/unchanged rather than fabricating a new customer effect
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-012-01 — Verify customer Menu projection after effect
Story: US-IMP-036F-012
Given a published/effected customer-visible change
When the operator verifies via authoritative customer read/evaluation
Then observed customer presentation/orderability matches intended effect for in-scope outlet context
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-012-02 — Verification does not require realtime push
Story: US-IMP-036F-012
Given a successful effect
When verification is performed via subsequent authoritative read
Then success does not depend on websocket/realtime push
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-012-03 — Partial downstream consequence
Story: US-IMP-036F-012
Given an effect that updates some but not all dependent surfaces immediately as composed
When verification runs
Then partial consequence is explained without inventing a false single source of truth
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-012-04 — Operator must not trust edit form alone
Story: US-IMP-036F-012
Given the edit form still shows local values
When verification is required
Then customer truth is confirmed from authoritative downstream read/evaluation, not form state alone
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-013-01 — Diagnose Catalog lifecycle blocker
Story: US-IMP-036F-013
Given a Variant not sellable because of Product/Variant lifecycle
When the operator runs diagnosis for an outlet context
Then lifecycle is identified as a cause distinct from Menu/Assortment/Availability
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-013-02 — Diagnose Menu vs Assortment vs Availability
Story: US-IMP-036F-013
Given distinct blockers in Menu presentation, Brand Assortment, and operational Availability
When diagnosis runs
Then each cause is distinguishable in plain language
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-013-03 — Diagnose pricing incompleteness and promotion non-applicability
Story: US-IMP-036F-013
Given missing effective price and a non-applicable promotion
When diagnosis runs
Then pricing completeness and promotion applicability are separate signals
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-013-04 — Diagnose outlet hours / Serviceability where relevant
Story: US-IMP-036F-013
Given outlet closed by hours or location not serviceable
When diagnosis includes those dimensions (location-dependent where applicable)
Then operating status/hours and Serviceability are shown as distinct from Assortment and tariff
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-013-05 — Unavailable / sold-out operational state
Story: US-IMP-036F-013
Given an otherwise eligible Variant marked unavailable/sold-out operationally
When diagnosis runs
Then Availability is cited without implying Catalog retirement or Assortment exclusion
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-014-01 — View existing media reference
Story: US-IMP-036F-014
Given an offering with an existing supported media reference
When the operator inspects it
Then the reference is visible for commercial presentation context
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-014-02 — Media-reference mutation not mandatory in V1
Story: US-IMP-036F-014
Given no verified safe workforce select/change workflow for existing media references
(Menu-entry `imagePath` storage exists; create/import can populate it; workforce select/change UX
is not verified)
When V1 commercial acceptance is evaluated
Then media-reference mutation is not a mandatory V1 acceptance requirement
And viewing existing references (AC-014-01) remains sufficient commercial presentation context
And media-reference select/change remains FOLLOW_UP under DISC-F-010 until a safe existing path is
proven in a later Product Definition revision
And the end-to-end commercial V1 journey remains coherent without mutation because imagery is not
required to introduce, price, assort, publish, or verify sellability
Mandatory in acceptance slice: NO (FOLLOW_UP / DISC-F-010 boundary)
```

```text
AC-IMP-036F-014-03 — Upload not offered as V1 capability
Story: US-IMP-036F-014
Given no media upload platform in V1
When the operator looks for upload/storage/CDN management
Then those actions are not presented as available V1 commercial capabilities
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-015-01 — Desktop full authoring
Story: US-IMP-036F-015
Given a desktop viewport
When the operator performs the V1 commercial journey
Then full authoring activities A2–A9 are operable
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-015-02 — Tablet full authoring
Story: US-IMP-036F-015
Given a tablet viewport
When the operator performs commercial authoring
Then core authoring remains operable
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-015-03 — Mobile inspection / context only
Story: US-IMP-036F-015
Given a mobile viewport
When the operator opens commercial management
Then inspection/context is available
And no commercial mutation actions are mandatory or required for V1 acceptance
And complex full authoring is not a V1 acceptance requirement on mobile
And mobile is not treated as unsupported — inspection/context remains supported product intent
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-016-01 — Tax/Charges inspection context
Story: US-IMP-036F-016
Given existing tax/charge configuration relevant to understanding price truth
When the operator inspects commercial context
Then tax/charge information may appear as context
Mandatory in acceptance slice: YES
```

```text
AC-IMP-036F-016-02 — No general tax/charge administration in V1 commercial workflow
Story: US-IMP-036F-016
Given the ordinary IMP-036F commercial workflow
When the operator seeks general tax or charge administration
Then that administration is not required as part of V1 commercial acceptance
Mandatory in acceptance slice: YES
```

| Story / AC ID | Required behaviour / risk | Applicable test layers | Planned proof | Actual evidence / candidate / result |
|---|---|---|---|---|
| US-IMP-036F-001 / AC-001-* | Inspection integrity; auth denial; empty/stale | unit/integration + real-browser where UI | Planned after implementation execution | Not executed (implementation authorized / not started) |
| US-IMP-036F-002…004 / AC-002…004-* | Catalog draft/lifecycle/modifiers; ADR-006 intent | domain + UI + E2E | Planned | Not executed |
| US-IMP-036F-005 / AC-005-* | Menu organization; one active Menu | UI + customer projection verification | Planned | Not executed |
| US-IMP-036F-006 / AC-006-* | Brand Assortment; OM boundary | domain + UI + IMP-036E regression | Planned | Not executed |
| US-IMP-036F-007 / AC-007-* | Pricing; snapshot immutability | domain monetary + UI | Planned | Not executed |
| US-IMP-036F-008 / AC-008-* | Promotions/Coupons lifecycle fidelity | domain + UI | Planned | Not executed |
| US-IMP-036F-009 / AC-009-* | Delivery tariff; separation; locked pricing.manage auth allow/deny | domain + UI after implementation execution | Planned; Fit mapping resolved; implementation authorized / not started | Not executed |
| US-IMP-036F-010…012 / AC-010…012-* | Consequence, publish, verify; no realtime push | UI + customer read E2E | Planned; Founder UAT later | Not executed |
| US-IMP-036F-013 / AC-013-* | Sellability diagnosis composition | UI + composed reads | Planned | Not executed |
| US-IMP-036F-014…016 / AC-014…016-* | Media view bounds (mutation FOLLOW_UP); device inspection-only; tax inspection | UI responsive/a11y | Planned | Not executed |

---

## 11. Business rules

| Rule ID | User/business rule | Authority / rationale | Story / AC IDs |
|---|---|---|---|
| `BR-IMP-036F-001` | Catalog, Menu, Assortment, Availability, Pricing, Promotions, Serviceability, Delivery Tariff, and Tax/Charges remain distinct authorities even inside one workflow | D-085; DISC-F-001; domain model | US-001, US-013 |
| `BR-IMP-036F-002` | Visibility of an action is not authorization; server-side/domain authorization is authoritative | D-358/D-372/D-373; PERSONA ≠ PERMISSION | US-001, all mutation stories |
| `BR-IMP-036F-003` | Products/Variants follow existing DRAFT/ACTIVE/RETIRED lifecycle; no hard-delete of historical entities | ADR-006; D-089 | US-002, US-004 |
| `BR-IMP-036F-004` | Customer-visible Catalog change requires EDIT DRAFT → VALIDATE → PUBLISH → EFFECTIVE REVISION → customer resolve; not active-record live mutation as desired behaviour | ADR-006; DISC-F-002; D-089 | US-002, US-011 |
| `BR-IMP-036F-005` | Pre-implementation runtime customer-visible or customer-evaluation-affecting ACTIVE Product/Variant mutations without ADR-006 draft→validate→publish→effective revision were originally identified at Product Definition Gate as an `ARCHITECTURE_FIT_CONFORMANCE_GAP` (not Founder product intent and not an ADR-006 amendment). Architecture decision is RESOLVED by locked Catalog `ENTITY_CONTENT_REVISION`; Implementation conformance work remains NOT YET IMPLEMENTED; implementation is AUTHORIZED / NOT_STARTED. Known examples: ACTIVE Product name/description; ACTIVE Variant default-selection (`isDefault`). Do not claim every mutable Variant field necessarily changes customer projection unless verified. | Evidence vs ADR-006 (`updateProduct` / `updateVariant` / Menu projection); locked capability architecture | US-002, US-011 |
| `BR-IMP-036F-006` | V1 associates existing modifier structures only; no full Modifier Library / Bundle Builder requirement | DISC-F-002 | US-003 |
| `BR-IMP-036F-007` | Consequential lifecycle transitions require confirmation and attribution/audit via appropriate authority | DISC-F-009; ADR-006 audit intent | US-004, US-010 |
| `BR-IMP-036F-008` | Menu organizes presentation; Category ≠ Menu section | D-086; DISC-F-003 | US-005 |
| `BR-IMP-036F-009` | Preserve one active customer Menu boundary; do not invent a new Menu lifecycle in IMP-036F | DISC-F-003; existing customer boundary | US-005 |
| `BR-IMP-036F-010` | Assortment = what outlet offers; Availability = whether presently orderable; do not collapse | D-095/D-096; DISC-F-004 | US-006, US-013 |
| `BR-IMP-036F-011` | Outlet Manager does not gain Brand Assortment authority; Store Assortment remains read/understand/escalate | IMP-036E; D-100; DISC-F-004 | US-006 |
| `BR-IMP-036F-012` | Pricing owns monetary configuration; Catalog never owns authoritative money | D-102; ADR-007; DISC-F-005 | US-007 |
| `BR-IMP-036F-013` | Use existing scope/effective-timing only; no new scheduling model; checkout snapshots remain immutable after transaction | ADR-007; DISC-F-005 | US-007 |
| `BR-IMP-036F-014` | Promotions/Coupons use existing supported structures and lifecycle only; no campaign-media platform | ADR-007; DISC-F-007 | US-008 |
| `BR-IMP-036F-015` | Delivery tariff is customer delivery-price policy; Serviceability and provider cost stay separate | D-118; D-143; DISC-F-008 | US-009 |
| `BR-IMP-036F-016` | V1 tariff limited to existing accepted concepts (distance bands / free-delivery rules); no new tariff model; no new permission invented here | IMP-036C; DISC-F-008 | US-009 |
| `BR-IMP-036F-017` | Consequence review is mandatory before consequential mutation/publish; no four-eyes requirement in V1 | DISC-F-009 | US-010 |
| `BR-IMP-036F-018` | Publish/effect success must yield a verifiable resulting state | DISC-F-009 | US-011, US-012 |
| `BR-IMP-036F-019` | Customer verification uses authoritative downstream read/evaluation; `REALTIME_PUSH_GUARANTEE = NO` | IMP-036E; D-368 | US-012 |
| `BR-IMP-036F-020` | Sellability diagnosis must distinguish relevant authoritative causes without inventing a new decision engine | DISC-F-001; D-097 concepts | US-013 |
| `BR-IMP-036F-021` | Media V1 mandatory = view/inspect existing references where present; media-reference select/change is FOLLOW_UP until a safe existing workflow is verified; no upload/storage/scanning/CDN/asset registry | DISC-F-010 | US-014; AC-014-01 YES; AC-014-02 NO |
| `BR-IMP-036F-022` | Full authoring target = desktop/tablet; mobile = inspection/context only for V1; no mobile commercial mutations are mandatory in this Product Definition | DISC-F-011 | US-015 |
| `BR-IMP-036F-023` | Tax/Charges: inspection/context only in V1 commercial workflow; no general administration product | DISC-F-006 | US-016 |

---

## 12. Journey Completeness Matrix

Journey: `JOURNEY-PRODUCT-MENU-LAUNCH` (desired V1)

| Journey dimension | Behaviour / applicability or N/A reason | Story / AC references |
|---|---|---|
| ENTRY | Authorized workforce enters Brand commercial management | US-001; AC-001-01 |
| DISCOVERY | Locate Product/Variant/Menu/Assortment/price/promotion/tariff context | US-001; US-013 |
| CONTEXT | Brand/outlet/entity scope explicit; authorities labeled | US-001; US-010 |
| EMPTY / FIRST USE | Empty Catalog/Menu/Promotion sets with next action | AC-001-02; US-008 empty via validation paths |
| HAPPY PATH | End-to-end introduce/maintain → present → assort → price → promote/tariff → review → publish → verify | US-002…012 |
| ALTERNATE VALID PATHS | Maintain existing offering; promotion-only change; tariff-only change; diagnosis-only | US-008, US-009, US-013 |
| VALIDATION FAILURE | Field-associated errors; publish blocked | AC-002-03, AC-005-04, AC-007-03, AC-008-03, AC-009-03, AC-011-02 |
| AUTHORIZATION | Server-side denial; OM Assortment boundary; post-fit tariff allow/deny | AC-001-03, AC-006-03/04, AC-009-01/05, AC-011-03 |
| NOT FOUND / STALE REFERENCE | Stale entity handling | AC-001-04, AC-002-04 |
| SERVER / NETWORK ERROR | Recoverable error with retry; distinguish domain rejection where practical | UX matrix; US-001 |
| RECOVERY | Correct validation; reload after conflict; retry verification | AC-002-04, AC-012-02 |
| CONCURRENCY | Stale/conflict on concurrent commercial edits | AC-002-04 |
| DESTRUCTIVE ACTION | Lifecycle retire / consequential publish confirmation (not hard-delete) | US-004, US-010, US-011 |
| SUCCESS FEEDBACK | Verifiable effective state after publish/effect | AC-011-04, US-012 |
| DOWNSTREAM EFFECT | Customer Menu/orderability via authoritative evaluation | US-012; GJ-FIRST-ORDER dependency |
| REVISIT / RELOAD | Reload shows authoritative state; form state not sole truth | AC-012-04 |
| RESPONSIVE / MOBILE | Desktop/tablet full V1 commercial authoring; mobile inspection/context only (no mandatory mobile commercial mutations) | US-015 |
| ACCESSIBILITY | Keyboard, focus, labels, error association, non-color-only | AC-002-05; §18 |

---

## 13. UX state matrix

Enterprise task-oriented language. No invented domain lifecycle states for UI convenience.

| Surface / state | Entry condition | Visible feedback / available actions | Focus / keyboard behaviour | Next / recovery state | AC ID or N/A reason |
|---|---|---|---|---|---|
| Commercial hub / loading | Fetch in progress | Progress indicator; actions deferred | Focus preserved on container | ready / empty / error | AC-001-01 |
| Commercial hub / empty | No offerings in scope | Explains emptiness; CTA to create if authorized | CTA focusable | create draft | AC-001-02 |
| Commercial hub / ready | Data loaded | Inspect + authorized actions | Landmark navigation | activity surfaces | AC-001-01 |
| Authoring / draft changed | Local unsaved or saved draft differs from effective | Draft badge; save/validate/publish affordances as authorized | Focus to first changed field on restore | validate / publish / discard | AC-002-02, AC-010-04 |
| Authoring / validation error | Invalid structure/money/eligibility | Errors associated to fields; publish disabled | Move focus to first error | correct → revalidate | AC-002-03, AC-007-03 |
| Any / authorization denied | Server denies | Clear denial; no cross-scope leak | Focus to safe summary | exit / request access out of band | AC-001-03 |
| Publish / confirmation | Consequence review satisfied | Confirm/cancel; lists relevant consequences | Confirm not default-destructive without review | success / cancel | AC-010-01, AC-011-01 |
| Publish / success | Effect committed | Verifiable resulting state + verify CTA | Focus to success summary | verification | AC-011-04 |
| Any / stale/conflict | Concurrent update detected | Conflict message; reload/reconcile | Focus to reload | ready with fresh data | AC-002-04 |
| Diagnosis / domain prerequisite missing | Needed authority data absent | Explains missing prerequisite | Focus to guidance | resolve prerequisite | AC-003-02 |
| Verification / partial downstream consequence | Some reads lag or subset updated | Partial consequence explained; retry | Focus to retry | verified / escalate | AC-012-03 |
| Diagnosis / unavailable/sold-out | Availability blocks orderability | Availability cited distinctly | Focus to availability context / escalate | correct availability via proper authority | AC-013-05 |
| Checkout context / no serviceability | Location not serviceable | Serviceability distinct from tariff | N/A for tariff editor | adjust Serviceability separately | AC-013-04 |
| Any / recoverable error | Transport/system failure | Retry; distinguish from domain rejection where practical | Focus to retry | ready | Journey matrix |
| Any / non-recoverable / support escalation | Unrecoverable domain/system fault | Support reference with entity/scope context | Focus to copyable reference | escalate | US-013 |
| Mobile / inspection-context boundary | Mobile viewport on commercial management | Explains desktop/tablet authoring requirement; inspection/context remains; no mandatory mobile commercial mutations | Focus to inspection | desktop/tablet for mutations | AC-015-03 |

---

## 14. Permissions / resource context

| Action | Existing identity / permission authority | Resource context / server-derived scope | Allowed / denied / cross-scope variants | AC IDs |
|---|---|---|---|---|
| Inspect commercial offering | Existing Catalog/Menu/Assortment/Pricing/Promotion/Serviceability read permissions as applicable | Brand/outlet server-derived scope | Deny cross-Brand leakage | AC-001-03 |
| Mutate Catalog draft / lifecycle / modifiers | Existing `catalog.manage` (or equivalent accepted Catalog mutation authority) | Brand Catalog scope | Deny without authority | AC-002-*, AC-003-*, AC-004-* |
| Mutate Menu organization | Existing Menu manage authority | Brand Menu scope; one active customer Menu boundary | Deny without authority | AC-005-* |
| Mutate Brand Assortment | Existing Brand Assortment authority | Brand → outlet assortment scope | Outlet Manager Store Assortment remains non-mutating Brand authority | AC-006-03/04 |
| Mutate Pricing | Existing Pricing manage / price-book authority | Brand pricing scope; existing effective timing | Deny without authority | AC-007-* |
| Mutate Promotions/Coupons | Existing promotions/coupons manage authority | Brand promotional scope | Deny without authority | AC-008-* |
| Mutate delivery tariff | `pricing.manage` (`DELIVERY_TARIFF_AUTHORITY = PRICING`; `NEW_PERMISSION_REQUIRED = NO`) | Brand derived server-side from Outlet | authorized allow (AC-009-01); unauthorized deny without changing prior tariff or leaking cross-scope data (AC-009-05). `serviceability.manage` does not authorize tariff price (`SERVICEABILITY_MANAGE_AUTHORIZES_TARIFF_PRICE = NO`). | AC-009-01, AC-009-05 |
| Publish/effect customer-visible change | Existing publish/effect authorities per domain | Same as underlying entity scope | Visibility ≠ authorization | AC-011-03 |
| Verify customer truth | Authorized verification via customer read/evaluation paths | Outlet/customer evaluation context | No realtime push requirement | AC-012-* |
| Role/permission editor | N/A — not in IMP-036F | N/A | NOT_SUPPORTED | §24 |

Product-level authorization boundaries:

- Only authorized commercial staff may mutate Brand commercial truth.
- Server-side/domain authorization remains authoritative.
- No arbitrary role/permission editor.
- No new role or permission invented in this draft.
- Delivery-tariff mutation mapping originally identified at Product Definition Gate as
  `ARCHITECTURE_FIT_AUTHORIZATION_GAP` is later resolved by locked capability architecture
  (`pricing.manage` @ Brand derived from Outlet; Architecture Fit PASS / locked).

---

## 15. Data implications

- Reuse existing Catalog, Menu, Assortment, Availability, Pricing, Promotions, Serviceability, and
  delivery-fee policy data authorities; **do not invent schema in Product Definition**.
- Monetary values must be unambiguous and currency-aware.
- Scope and effective timing must be explicit using existing semantics only.
- Operator must not infer customer truth solely from editable form state.
- Immutable checkout/order snapshots remain authoritative after transaction.
- Customer verification must come from authoritative downstream read/evaluation.
- Consequential change should be attributable/auditable through existing or Architecture-Fit-approved
  audit authority; if audit stores are fragmented, coherent **presentation** is a product need and
  composition mechanism is Architecture Fit (`ARCHITECTURE_FIT_REQUIRED` for audit composition).
- Reload must show authoritative persisted state.

---

## 16. Security/privacy

- Trust boundary: workforce session ≠ customer session; Brand commercial data is not public Menu API.
- Permissions enforced server-side; UI hiding is insufficient.
- Cross-Brand and unauthorized cross-outlet disclosure is forbidden.
- Consequence review and diagnosis must avoid leaking entities outside authorized scope.
- Negative ACs: unauthorized mutation/publish denied; OM cannot obtain Brand Assortment mutation via
  this slice; tariff mutation cannot proceed by inventing a client-only permission.
- No secrets or provider credentials in commercial UX.

---

## 17. Concurrency/recovery

- Concurrent edits on the same commercial entity produce stale/conflict; silent overwrite forbidden.
- Publish after invalidation requires re-validate.
- Partial failure: no false “customer updated” success if authoritative effect did not commit.
- Interruption/revisit: drafts remain drafts; effective truth unchanged until deliberate effect.
- Verification retry after effect is valid because `REALTIME_PUSH_GUARANTEE = NO`.
- Do not invent new retry/idempotency semantics beyond existing domain authority; Architecture Fit
  confirms command idempotency where needed.

---

## 18. Accessibility/responsive expectations

Desktop/tablet full workflows must meet reasonable product acceptance expectations:

- Keyboard operability for tables/forms/dialogs
- Visible focus
- Meaningful labels
- Error association to fields
- Non-color-only state communication (draft/effective/denied/unavailable)
- Accessible confirmation/warning semantics for consequential publish
- Usable table/form navigation

Mobile: inspection/context only for V1; no mandatory commercial mutations (`DISC-F-011`). Mobile remains supported for inspection/context — not “unsupported.”

Do not prescribe frontend libraries. Automated scans alone are insufficient proof (TEST-1).

---

## 19. Observability/supportability

User/support outcomes (not telemetry architecture):

- Consequential failures give actionable operator feedback.
- Domain rejection distinguishable from transport/system failure where practical.
- Operator can identify affected entity/scope (Brand, outlet, Product/Variant, Menu placement, etc.).
- Successful publish/effect has verifiable resulting state.
- Support escalation preserves enough reference/context to investigate.
- Audit presentation may compose distributed stores; mechanism is Architecture Fit.

---

## 20. Golden Journeys affected

GJ-1 remains descriptive supporting authority; **not mutated** by this Product Definition.

| GJ ID / registry status | Affected steps / downstream behaviour | Mandatory for this acceptance? | Related story / AC IDs | Required proof / actual evidence |
|---|---|---|---|---|
| `GJ-PRODUCT-MENU-LAUNCH` / `PLANNED` | Core commercial configure → Menu/outlet context → customer discovery/orderability | **YES — mandatory for IMP-036F acceptance** (finalized at Product Definition Gate PASS; registry remains PLANNED) | US-001…013 | Real-browser + Founder UAT after implementation; not CURRENT yet |
| `GJ-FIRST-ORDER` / `CURRENT` | Customer discover→pay continuity depends on truthful commercial config | Supporting/current dependency (do not re-accept F as replacing it) | US-012 | Regression under TEST-1 when F lands |
| `GJ-AVAILABILITY` / `CURRENT` | Diagnosis distinguishes Availability; F must not collapse Assortment/Availability | Supporting/current dependency | US-006, US-013 | Regression |
| `GJ-ADDRESS-SERVICEABILITY` / `CURRENT` | Serviceability ≠ delivery tariff; diagnosis may include serviceability | Supporting/current dependency | US-009, US-013 | Regression |
| `GJ-STORE-PAUSE-RESUME` / `CURRENT` | Outlet operating status may appear in diagnosis; not a commercial mutation surface | Not part of IMP-036F acceptance (supporting awareness) | US-013 | Existing |
| `GJ-TRADING-HOURS` / `CURRENT` | Hours may appear in diagnosis | Not part of IMP-036F acceptance | US-013 | Existing |
| `GJ-RETURNING-ORDER` / `PARTIAL` | Not required for F acceptance | No | — | N/A |
| `GJ-PERMITTED-OUTLET-ACCESS` / `CURRENT` | Authz prerequisite environment | Supporting dependency only | §14 | Existing |
| `GJ-PAYMENT-RECOVERY` / `CURRENT` | Unaffected | No | — | N/A |
| `GJ-CANCELLATION-REFUND` / `CURRENT` | Unaffected | No | — | N/A |

Do not silently convert `GJ-PRODUCT-MENU-LAUNCH` from `PLANNED` to `CURRENT` in this task.

---

## 21. Dependencies

| Dependency | Authority / verified state | Required before which story or gate? | Unresolved impact |
|---|---|---|---|
| Accepted Catalog/Menu/Assortment/Availability domains | ADR-006; accepted IMPs | All V1 stories | NONE for product intent; workforce UX gap remains |
| Accepted Pricing/Promotions | ADR-007 | US-007, US-008 | NONE for product intent |
| Accepted delivery fee storage/calc | IMP-036C | US-009 | Fit mapping resolved; implementation work authorized but not started |
| Accepted IMP-036E Store Assortment boundary | STATE / capability docs | US-006 | NONE — preserve |
| Customer Menu projection | D-368 / IMP-028B | US-012 | Architecture decision RESOLVED (locked ENTITY_CONTENT_REVISION); Implementation conformance work NOT YET IMPLEMENTED (authorized; not started) for customer-affecting ACTIVE Product/Variant live mutations (incl. Product name/description; Variant `isDefault`) |
| Product Definition Gate | PD-1 | Before Architecture Fit | PERFORMED — PASS (2026-09-10; PR #140 review `5166877450`) |
| Architecture Fit | PD-1 phase | Before implementation readiness | PERFORMED / PASS — locked capability architecture |
| Implementation authorization | ROADMAP/STATE | Before coding | YES / PERFORMED / AUTHORIZED |

---

## 22. Supported now

| Behaviour | Existing verified or V1 acceptance commitment? | Story / AC IDs / source |
|---|---|---|
| Domain Catalog/Menu/Assortment/Availability model | CURRENT_SUPPORTED (domain) | ADR-006 |
| Customer Menu projection / ordering | CURRENT_SUPPORTED | D-368; GJ-FIRST-ORDER |
| Brand Assortment authority; Store Assortment read path | CURRENT_SUPPORTED (IMP-036E Store read) | US-006 preserves |
| Pricing/Promotion domain manage capabilities | CURRENT_SUPPORTED (domain) | ADR-007 |
| Delivery fee bands / free-delivery threshold calculation/storage | CURRENT_SUPPORTED | IMP-036C |
| Coherent Brand commercial workforce end-to-end journey | PLANNED_IMP036F (this draft) | US-001…016 |
| ADR-006 draft/publish customer-visible Catalog intent | PLANNED_IMP036F product intent; Architecture decision RESOLVED; CURRENT runtime non-conforming until Implementation conformance work is authorized/implemented | BR-005; locked Catalog ENTITY_CONTENT_REVISION |

---

## 23. Explicitly deferred

| `EXPLICITLY_DEFERRED` behaviour | FOLLOW_UP or DEFERRED | Reason / consequence | Revisit dependency / decision owner |
|---|---|---|---|
| Full advanced Modifier Library | DEFERRED | Not required to complete approved commercial journey | Future product gate |
| Bundle Builder | DEFERRED | Same | Future product gate |
| Media upload/storage/scanning/CDN platform | DEFERRED | DISC-F-010 | Architecture/product decision if ever required |
| Media-reference select/change via workforce UX | FOLLOW_UP | No verified safe select/change workflow for V1; Menu-entry `imagePath` storage/create-import exists | Later PD revision after path verification; DISC-F-010 |
| General tax administration product | DEFERRED | DISC-F-006 | Separate capability |
| General charge administration in ordinary commercial workflow | DEFERRED | DISC-F-006 | Separate capability |
| Full complex mobile commercial authoring | DEFERRED | DISC-F-011 | Future UX decision |
| Any simple mobile commercial mutation | FOLLOW_UP | None selected in this Product Definition | Later PD revision with explicit action + AC coverage |
| Four-eyes / second-approver workflow | DEFERRED | DISC-F-009 | Explicit future authorization |
| Realtime customer push | DEFERRED | IMP-036E guarantee = NO | Explicit future authorization |
| New generic bulk-operation semantics | DEFERRED | Non-goal unless separately approved | Founder/product |
| Richer phased audit composition UX beyond V1 coherence need | FOLLOW_UP | May phase after Architecture Fit | Architecture Fit + later PD |

---

## 24. Not supported by design

| `NOT_SUPPORTED_BY_DESIGN` behaviour | Reason / authority | User-visible boundary / relevant AC |
|---|---|---|
| Arbitrary role/permission editor | Non-goal | Not offered |
| New role or new permission invented in Product Definition | Non-goal; auth gaps → Architecture Fit | AC-009-05 |
| New Catalog/Menu lifecycle | DISC-F-002/003; ADR-006 existing only | US-004, US-005 |
| New Promotion/Coupon lifecycle labels | DISC-F-007; ADR-007 existing only | AC-008-05 |
| New scheduling model | DISC-F-005 | US-007 |
| Active-record live mutation as desired Catalog customer-visible behaviour | ADR-006; DISC-F-002 | AC-011-01 |
| Collapse Assortment ↔ Availability | DISC-F-004 | AC-006-01, AC-013-02 |
| Collapse Serviceability ↔ Delivery Tariff | DISC-F-008 | AC-009-01 |
| Merge provider cost into customer delivery tariff | DISC-F-008; D-118 | AC-009-04 |
| Store Overview as automatic commercial mutation surface | IMP-036E pattern | US-006 |
| New API/schema implied by this Product Definition | Non-goal | Architecture Fit evaluates necessity later |
| Implementation authorization via this draft | ROADMAP/STATE | Lifecycle authorization owned by ROADMAP/STATE (YES at GTM-R120; not started) |
| IMP-036G activation | ROADMAP/STATE | `IMP036G_ACTIVATED: NO` |

---

## 25. Unresolved / decision required

| `UNRESOLVED_DECISION_REQUIRED` item | Material user/business impact | Decision owner / evidence needed | Affected stories / gate |
|---|---|---|---|
| NONE | DISC-F-001…011 encode approved Founder direction; Architecture Fit PASS mapped all mandatory ACs; no open material product decisions remain | N/A | Product Definition Gate PASS; Architecture Fit PASS / architecture locked |

Originally identified Architecture Fit inputs (Product Definition Gate era; **resolved** by locked
capability architecture
[`capabilities/IMP-036F-catalog-menu-pricing-promotions-management.md`](../../capabilities/IMP-036F-catalog-menu-pricing-promotions-management.md)):

1. `ARCHITECTURE_FIT_CONFORMANCE_GAP` (ADR-006 ACTIVE Product/Variant customer-affecting mutations) → **resolved** by locked Catalog `ENTITY_CONTENT_REVISION` publication architecture.
2. `ARCHITECTURE_FIT_AUTHORIZATION_GAP` (delivery-tariff mutation permission/command mapping) → **resolved** as Pricing authority / Brand derived from Outlet; `pricing.read` / `pricing.manage`.
3. Missing coherent workforce authoring command surfaces → **resolved** (Admin façade commercial write composition).
4. Consequence/verification composition → **resolved** (`CONSEQUENCE_REVIEW_EFFECT_BINDING = REQUIRED` with per-domain expected-revision bindings).
5. Audit presentation/composition → **resolved** (distributed existing audit composition; no independent consequence store).
6. Diagnosis composition → **resolved** (non-authoritative composition over existing authorities).
7. Existing API/domain command gaps required by approved stories → **resolved** as architecture design only (implementation authorized / not started).
8. `ARCHITECTURE_FIT = NOT_PERFORMED` → **resolved**; `ARCHITECTURE_FIT_EXECUTION: PERFORMED`; `ARCHITECTURE_FIT_RESULT: PASS`.

```text
stories = 16
mandatory ACs = 64
missing mandatory ACs = NONE
open material product decisions = NONE
story readiness = READY
implementation authorization = YES; implementation started = NO
```

### Unassigned IMP-036E UX observations (not attached to IMP-036F)

These remain **UNASSIGNED** and are **not** IMP-036F V1 stories:

1. Customer messaging distinction between temporary pause/closure and geographic non-serviceability.
2. Earlier customer sold-out/unavailable feedback in the customer journey.

`pause_vs_serviceability_attached_to_F: NO`  
`early_sold_out_feedback_attached_to_F: NO`

---

## 26. Definition of Ready

| Story ID | Applicable template fields complete / evidence | Open material decisions | Readiness / blocker |
|---|---|---|---|
| US-IMP-036F-001 | YES — all §9 template fields present (incl. N/A where justified) | NONE | Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119. |
| US-IMP-036F-002 | YES | NONE | Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119. |
| US-IMP-036F-003 | YES | NONE | Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119. |
| US-IMP-036F-004 | YES | NONE | Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119. |
| US-IMP-036F-005 | YES | NONE | Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119. |
| US-IMP-036F-006 | YES | NONE | Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119. |
| US-IMP-036F-007 | YES | NONE | Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119. |
| US-IMP-036F-008 | YES | NONE | Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119. |
| US-IMP-036F-009 | YES | NONE | Readiness: READY — Architecture Fit PASS / architecture locked (tariff auth gap resolved). Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119. |
| US-IMP-036F-010 | YES | NONE | Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119. |
| US-IMP-036F-011 | YES | NONE | Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119. |
| US-IMP-036F-012 | YES | NONE | Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119. |
| US-IMP-036F-013 | YES | NONE | Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119. |
| US-IMP-036F-014 | YES | NONE | Readiness: READY — Architecture Fit PASS / architecture locked; media mutation FOLLOW_UP. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119. |
| US-IMP-036F-015 | YES | NONE | Readiness: READY — Architecture Fit PASS / architecture locked; mobile mutations none mandatory. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119. |
| US-IMP-036F-016 | YES | NONE | Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization was granted at GTM-R120 / STATE-R118; implementation start is recorded at GTM-R121 / STATE-R119. |

Product-definition template fields are complete for all 16 stories above. Story `READY` means Product
Definition + Architecture Fit/lock readiness only.

`READY` stories at GTM-R120 have implementation authorization granted; implementation has not started.
`AUTHORIZED` + `NOT_STARTED` ≠ `IMPLEMENTATION_IN_PROGRESS`. Explicit implementation start remains a separate gate
and is **not** granted by this Product Definition revision.

`STORY_COMPLETE != IMP_ACCEPTED`.

---

## 27. Product Definition Gate

```text
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
```

Product Definition Gate execution was performed on 2026-09-10 against exact candidate
`PD-IMP-036F-DRAFT-1`. Durable gate-verdict evidence is PR #140 COMMENT review `5166877450`
(`PRODUCT_DEFINITION_GATE — PASS`). An attempted GitHub APPROVE review was rejected only because
the connected GitHub identity owns PR #140; that platform limitation is not a failed gate.

```text
GATE-EVALUATED CONTENT SHA = 014e0f935f193f54718d6afd5e7991508088f9bc
POST-GATE PERSISTENCE SHA = subsequent PR #140 head after this gate-pass persistence commit
  (this persistence revision is NOT the artifact evaluated by the gate)
Gate date: 2026-09-10
PR: #140
Durable gate review record: 5166877450
Product Definition Gate result: PASS
```

```text
PRODUCT_DEFINITION_GATE

Capability: IMP-036F — Catalog, Menu, Pricing & Promotions Management
Product Definition Version: PD-IMP-036F-DRAFT-1
Document status: APPROVED
Business Outcome: Defined (bounded end-to-end commercial management; DISC-F-001)
Primary Personas: PERSONA-WORKFORCE-OPERATOR (primary); PERSONA-CUSTOMER (secondary consequence)
Journeys Defined: YES (current fragmented + desired JOURNEY-PRODUCT-MENU-LAUNCH)
Story Map Complete: YES (A1–A11 + cross-cutting)
Acceptance Slice Defined: YES (US-IMP-036F-001…016)
Happy Paths Defined: YES
Alternate Paths Defined: YES
Empty / First-Use States Defined: YES
Error / Recovery Paths Defined: YES
Authorization Variants Defined: YES (including OM Assortment boundary + tariff auth gap classification)
Cross-Scope Scenarios Defined: YES
Concurrency Considered: YES
Destructive Actions Defined: YES (consequential publish/lifecycle; no hard-delete)
UX State Matrix Complete: YES
Accessibility Considered: YES
Golden Journeys Identified: YES
Mandatory Golden Journey for IMP-036F acceptance: GJ-PRODUCT-MENU-LAUNCH (registry remains PLANNED)
Supporting CURRENT Golden Journey dependencies (not re-accepted as IMP-036F):
  GJ-FIRST-ORDER; GJ-AVAILABILITY; GJ-ADDRESS-SERVICEABILITY
Explicit Deferrals Recorded: YES
Unresolved Product Decisions: NONE (DISC-F-001…011 encoded; Architecture Fit gaps recorded separately)
Architecture Conflicts: NONE IDENTIFIED AT PRODUCT-DEFINITION LEVEL
Architecture Fit Inputs (originally identified at Product Definition Gate; later resolved by locked capability architecture):
- ARCHITECTURE_FIT_CONFORMANCE_GAP (customer-visible / customer-evaluation-affecting ACTIVE Product/Variant mutations vs ADR-006; known examples Product name/description and Variant `isDefault`) — **resolved** by locked Catalog ENTITY_CONTENT_REVISION
- ARCHITECTURE_FIT_AUTHORIZATION_GAP (delivery tariff mutation permission/command mapping) — **resolved** as Pricing / Brand-from-Outlet
- Missing coherent workforce authoring command surfaces — **resolved**
- Consequence/verification composition — **resolved**
- Audit composition — **resolved**
- Diagnosis composition — **resolved**
- ARCHITECTURE_FIT = NOT_PERFORMED (at gate time) — **resolved**; ARCHITECTURE_FIT_EXECUTION: PERFORMED; ARCHITECTURE_FIT_RESULT: PASS
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
```

```text
ARCHITECTURE_FIT_EXECUTION: PERFORMED
ARCHITECTURE_FIT_RESULT: PASS
ARCHITECTURE_FIT: PASS
IMP036F_ARCHITECTURE_LOCKED: YES
IMP036F_IMPLEMENTATION_AUTHORIZED: YES
IMP036F_STARTED: NO
IMP036F_ACCEPTED: NO
IMP036G_ACTIVATED: NO

ARCHITECTURE_FIT_REVIEWED_CANDIDATE_HEAD = 9ae06d6267e997223b1995124540974215ee17fd
ARCHITECTURE_FIT_REVIEWED_CANDIDATE_TREE = 55adb287bb0eb77240a6becdc16fed2d504ba144
INDEPENDENT_ARCHITECTURE_REVIEW = 5169723968
INDEPENDENT_ARCHITECTURE_REVIEW_RESULT = PASS
LOCKED_CAPABILITY_ARCHITECTURE = docs/platform/capabilities/IMP-036F-catalog-menu-pricing-promotions-management.md
CANONICAL_ANCHORS = GTM-R121 / STATE-R119
```

Next gate after canonical merge/reconciliation: **explicit implementation start / execution
authorization** (separate human gate). Implementation authorization at GTM-R121 / STATE-R119 does
**not** start implementation, accept IMP-036F, or activate IMP-036G.
---

## Appendix A — Founder decisions encoding checklist

| Decision | Encoded? | Where |
|---|---|---|
| DISC-F-001 Primary outcome | YES | §2, §6, story map |
| DISC-F-002 Catalog/modifiers | YES | US-002…004; BR-003…006 |
| DISC-F-003 Menu | YES | US-005; BR-008/009 |
| DISC-F-004 Assortment | YES | US-006; BR-010/011 |
| DISC-F-005 Pricing | YES | US-007; BR-012/013 |
| DISC-F-006 Charges/tax | YES | US-016; BR-023 |
| DISC-F-007 Promotions | YES | US-008; BR-014 |
| DISC-F-008 Delivery tariff | YES | US-009; BR-015/016 |
| DISC-F-009 Consequence review | YES | US-010…012; BR-017…019 |
| DISC-F-010 Media | YES | US-014; BR-021 |
| DISC-F-011 Device experience | YES | US-015; BR-022 |

`all_approved_decisions_encoded: YES`  
`new_material_product_decisions_required: NO`

---

## Appendix B — Counts (draft inventory)

| Item | Count |
|---|---|
| Story map activities | 11 (+ 3 cross-cutting story groups) |
| User stories | 16 |
| V1 acceptance stories | 16 |
| Acceptance scenarios (total defined) | 65 |
| Mandatory in V1 acceptance slice | 64 (AC-IMP-036F-014-02 = NO / FOLLOW_UP) |
| Business rules | 23 |

V1 still proves one coherent bounded commercial job (inspect → configure → review → publish/effect → verify/diagnose) within existing authorities. Media-reference mutation and mobile commercial mutations are not required to prove that job.
