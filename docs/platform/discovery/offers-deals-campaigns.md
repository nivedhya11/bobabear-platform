# Offers, Deals & Campaigns — Product Discovery

```text
STATUS: DISCOVERY_ONLY
AUTHORITY: NON_AUTHORITATIVE_PRODUCT_DISCOVERY
ROADMAP_IDENTITY: NONE
ACTIVATED: NO
PRODUCT_DEFINITION: NOT_CREATED
PRODUCT_DEFINITION_GATE: NOT_PERFORMED
ARCHITECTURE_FIT: NOT_PERFORMED
IMPLEMENTATION_AUTHORIZED: NO

FOUNDER_DISCOVERY_DIRECTION: APPROVED
FOUNDER_DISCOVERY_DECISION_DATE: 2026-09-24
FOUNDER_DISCOVERY_DECISIONS: ODC-01..ODC-14
OPEN_FOUNDER_DISCOVERY_DECISIONS: 0
ODC_TOTAL: 14
FOUNDER_APPROVED_DISCOVERY_DIRECTION: 14
OPEN_DISCOVERY_DECISIONS: 0

WORKING_CAPABILITY_NAME: Offers, Deals & Campaigns
CANDIDATE_WORKING_LABEL: "IMP-036J" — CANDIDATE / WORKING LABEL / NOT GOVERNANCE IDENTITY
  (must never be presented as allocated, activated, planned in ROADMAP, or authorized)

PROCESS_PHASES_IN_SCOPE: ANCHOR → DISCOVER → STORY_MAP
PROCESS_PHASES_EXPLICITLY_OUT: PRODUCT_DEFINITION_GATE | ARCHITECTURE_FIT | IMPLEMENTATION

PARALLEL_TO: IMP-036I — Scheduled Fulfilment (active Product Definition slice; do not interfere)
RUNTIME_SEMANTIC_DRIFT: NONE (documentation only)
```

```text
FOUNDER_APPROVED_DISCOVERY_DIRECTION
  ≠
FORMAL_PRODUCT_DEFINITION_APPROVAL
  ≠
ROADMAP_IDENTITY / ACTIVATION / GATE / FIT / IMPLEMENTATION_AUTHORIZED
```

This document is **isolated discovery**. It does not amend VISION, ROADMAP, STATE,
ARCHITECTURE, decision-register, PRODUCT-DELIVERY, TESTING, accepted Product Definitions,
capability architectures, or IMP-036I artifacts. Companion story map:
[`offers-deals-campaigns-story-map.md`](./offers-deals-campaigns-story-map.md).

Founder approved discovery recommendations **ODC-01…ODC-14** on **2026-09-24**. That
approval records product direction for a future slice only. It does **not** assign IMP
identity, activate the capability, create or approve a Product Definition, pass a Gate,
perform Architecture Fit, or authorize implementation.

---

## 0. Anchor provenance (read-only)

Verified against **clean `main`** tip at discovery start (dirty local IMP-036I working-tree
edits were present but **not** used as authority):

| Authority | Version / position (VERIFIED from `main`) |
|---|---|
| Repository | `nivedhya11/bobabear-platform` / local `/home/ajoshi/repos/boba-bear-platform` |
| Branch base | `main` @ `afaecc2d42cf2b0b8428ee750a37d64285a371fe` |
| VISION | VISION-1 |
| ROADMAP | GTM-R148 — `acceptedThrough=IMP-036H`, `currentProductSlice=IMP-036I`, `nextProductSlice=IMP-037` |
| STATE | STATE-R146 — same lifecycle position; IMP-036I PRE-GATE DRAFT only |
| ARCHITECTURE | ARCH-R22 |
| Decision register | DR-20 |
| Product delivery | PD-1 |
| Testing | TEST-1 |
| Relevant accepted slice | IMP-036F COMPLETE_AND_ACCEPTED (Catalog, Menu, Pricing & Promotions Management) |
| Pricing / promotions ADR | ADR-007 CURRENT (intent + accepted IMP-015/016 implementation; aspirational gaps called out below) |
| Catalog / bundles ADR | ADR-006 CURRENT (standard products + bundles; silent substitution prohibited) |

Epistemic vocabulary: `VERIFIED` | `INFERRED` | `ASSUMED` | `UNVERIFIED` | `NOT_FOUND` | `CONFLICT`.

---

## 1. Founder / competitor observations (McDelivery-informed)

**Copyright notice:** No McDonald's screenshots, brand assets, or copyrighted imagery are
copied into this repository. Observations only.

### Observed competitor distinction (NOT copied product requirements)

| Competitor concept | Observed behaviour | BOBA working map |
|---|---|---|
| **DEAL** | Customer-browsable / purchasable value proposition; behaves like merchandise; own title / image / composition / price; direct Add-to-cart; may be customisable. Examples: combo, meal for two, multi-item fixed-price deal, discounted item/combination. | Candidate **Deal** |
| **OFFER** | Conditional customer/order benefit. Examples: flat discount, free delivery, free menu item, minimum-order qualification, transaction-count qualification, per-user usage limits, coupon-code activation. | Candidate **Offer** (often backed by existing **Promotion** / **Coupon**) |

These are competitor observations that inform discovery vocabulary. They are **not** locked
Product Definition and **not** a mandate to clone McDelivery IA.

---

## 2. Working vocabulary (Founder-approved discovery direction)

Status: `FOUNDER_APPROVED_DISCOVERY_DIRECTION` (2026-09-24). Not formal Product Definition.
Do **not** collapse Deal and Offer into one generic Promotion concept.

| Term | Approved discovery meaning | Repository evidence |
|---|---|---|
| **DEAL** | Customer-browsable and directly purchasable value proposition. May include customer title, image, composition, choices/customisation, Deal price, truthful reference/value comparison, and direct Add-to-cart. | **NOT_SUPPORTED** as commerce entity. Catalog has `productKind=bundle` + bundle groups/options schema (**VERIFIED** ADR-006 + `catalog.ts`); customer Menu projection / Deals browse **NOT_FOUND**. Prefer reuse of Catalog bundle / Menu / Pricing unless Fit proves insufficient. Whether Deal needs a new aggregate is **Architecture Fit**. |
| **OFFER** | Conditional commercial benefit applied to an eligible customer, cart, or order. | **NOT_SUPPORTED** as named entity. Closest CURRENT authority is **Promotion** (automatic or coupon-triggered). Customer “Offers” page **ABSENT** (experience gap map / EXP-WD-028). |
| **COUPON** | Activation mechanism for an Offer. Coupon ≠ Offer. Not every Offer requires a code. | **CURRENT_SUPPORTED** (`promotion_coupons`, trigger `coupon`, cart API `POST /api/v1/cart/coupon`). Customer coupon entry UI **NOT_SUPPORTED**. |
| **PROMOTION** | Existing BOBA Bear internal monetary/commercial authority (IMP-016 / ADR-007 / IMP-036F). | **CURRENT_SUPPORTED**. Remains the money authority; not redefined as the whole customer-facing sales-growth vocabulary. |
| **CAMPAIGN** | First-class **business / operator** concept. V1 intent: lightweight orchestration of Deals, Offers, timing, scope, merchandising, objective, redemption visibility, and measurement. Must **not** become a second Pricing authority, Promotion engine, or Checkout evaluator. | **NOT_SUPPORTED** as domain entity. Whether Campaign needs durable domain identity or can remain orchestration metadata is **Architecture Fit**. |
| **DROP** | BOBA brand / newness / scarcity concept. May participate in a Campaign; is **not** a discount engine. | **PARTIALLY_SUPPORTED** as static marketing (`/#drops`, `SignatureDrops`); BrandDrop commerce authority **NOT_SUPPORTED** (food-direct lock). |

**Boundary (Founder-approved direction):**

```text
Campaign (orchestration — not money authority)
   ↓
Deal / Offer
   ↓
existing Promotion / Coupon / Pricing / Catalog / Menu authorities
   ↓
Checkout evaluation / commercial snapshot
```

Hard discovery constraints (approved):

- Do **not** create a second pricing / monetary engine (`NO_SECOND_MONEY_ENGINE`).
- Do **not** create a second promotion engine.
- Do **not** pre-decide a new Deal aggregate (Fit question).
- Do **not** silently substitute Deal components.

---

## 3. Current-state capability matrix

Classification keys: `CURRENT_SUPPORTED` | `PARTIALLY_SUPPORTED` | `NOT_SUPPORTED` |
`UNKNOWN_REQUIRES_FIT`.

### 3.1 Promotion / Coupon engine (IMP-016)

| Capability | Classification | Evidence (summary) |
|---|---|---|
| Promotion lifecycle `draft \| active \| retired` | CURRENT_SUPPORTED | `PROMOTION_STATUSES`; IMP-036F §13 forbids inventing SCHEDULED/ENDED campaign states for CURRENT lock |
| Coupon lifecycle `draft \| active \| disabled \| retired` | CURRENT_SUPPORTED | `COUPON_STATUSES` + `coupon-lifecycle.ts` |
| Trigger: automatic | CURRENT_SUPPORTED | `PROMOTION_TRIGGER_TYPES` |
| Trigger: coupon | CURRENT_SUPPORTED | coupon activation requires parent promo `triggerType=coupon` + `active` |
| Benefit: `%` discount | CURRENT_SUPPORTED | `percentage_discount` + `maximum_discount_paise` cap |
| Benefit: flat ₹ discount | CURRENT_SUPPORTED | `fixed_amount_discount` |
| Benefit: Buy X Get Y / BOGO | CURRENT_SUPPORTED | `buy_x_get_y` (engine); admin UI authoring **PARTIALLY** (UI lacks BOGO) |
| Benefit: free menu item (non-BOGO) | NOT_SUPPORTED | No dedicated benefit type (**NOT_FOUND**) |
| Benefit: fixed promotional item/combo price | NOT_SUPPORTED | ADR-007 aspirational; no benefit type (**NOT_FOUND**) |
| Benefit: named free delivery | PARTIALLY_SUPPORTED | Serviceability threshold `free_delivery_subtotal_threshold_paise` (**VERIFIED**, not a promo benefit); optional `charge` target discounts (**VERIFIED** path) — named `free_delivery` benefit **NOT_FOUND** |
| Targets: product / variant / all_merchandise / charge | CURRENT_SUPPORTED | `PROMOTION_TARGET_TYPES` |
| Targets: category / menu section | NOT_SUPPORTED | **NOT_FOUND** (ADR-007 mentions categories; code does not) |
| Qualifier vs benefit target roles | CURRENT_SUPPORTED | `qualifier` / `benefit` |
| Scope: brand / territory / organization / outlet | CURRENT_SUPPORTED | `PROMOTION_SCOPE_TYPES` + brand policy gate |
| Time window `starts_at` / `ends_at` | CURRENT_SUPPORTED | Half-open effectiveness; not a lifecycle state |
| Day-of-week / daypart recurrence | NOT_SUPPORTED | **NOT_FOUND** |
| Minimum qualifying amount | CURRENT_SUPPORTED | `minimum_qualifying_amount_paise` |
| Minimum item quantity | CURRENT_SUPPORTED | `minimum_item_quantity` |
| Max discount (percentage) | PARTIALLY_SUPPORTED | On `%` benefits; BOGO forbids max field |
| Stacking `exclusive \| combinable` | CURRENT_SUPPORTED | Unified candidate model; BOGO must be exclusive |
| Best automatic selection | CURRENT_SUPPORTED | Lowest post-tax grand total → highest discount → priority → startsAt → id (`select.ts`) |
| Coupon redemption limits (global / per-customer) | CURRENT_SUPPORTED | On coupons; payment-bound claims `RESERVED/CONSUMED/RELEASED` |
| Promotion-level redemption caps | NOT_SUPPORTED | Limits are coupon-scoped (**VERIFIED** gap vs ADR-007) |
| First-order / order-count eligibility | NOT_SUPPORTED | **NOT_FOUND** in promotions evaluators |
| Authenticated customer required for limited coupons | CURRENT_SUPPORTED | `CUSTOMER_IDENTITY_REQUIRED` outcome |
| Checkout snapshot promo effects | CURRENT_SUPPORTED | `checkout_snapshot_promotion_effects`; immutable (ARCH-G05) |
| Audit + aggregate revision CAS | CURRENT_SUPPORTED | `promotion_audit_events`; Promotion/Coupon revision CAS (IMP-036F) |

### 3.2 Catalog / Menu / Pricing / Assortment / Availability

| Capability | Classification | Notes |
|---|---|---|
| Catalog bundle / combo composition | PARTIALLY_SUPPORTED | Schema + ADR-006 direction **VERIFIED**; configurable bundle customer journey / Deal browse **NOT_FOUND** as sales surface; nested bundles rejected V1 |
| Menu projection display price | CURRENT_SUPPORTED | IMP-028B; **no** promo strike/savings fields on projection (**VERIFIED**) |
| Assortment / availability | CURRENT_SUPPORTED | Silent substitution prohibited (ADR-006) — aligns with Deal component principle |
| Price books / Pricing authority | CURRENT_SUPPORTED | ADR-007 / IMP-015 / IMP-036F |
| Delivery tariff + free-delivery threshold | CURRENT_SUPPORTED | Separate from Promotion benefit types |
| Commercial workspace (admin) | PARTIALLY_SUPPORTED | IMP-036F `/workforce/admin/commercial` Promotions & coupons; thinner UI than full engine |

### 3.3 Customer surfaces

| Surface | Classification | Notes |
|---|---|---|
| Auto-applied discount at checkout/order money | PARTIALLY_SUPPORTED | “Discount” line when `promotionDiscountPaise > 0` |
| Coupon entry UI | NOT_SUPPORTED | API exists; CartClient has no field |
| Offers browse / Offers for You / My BOBA offers | NOT_SUPPORTED | Explicitly deferred in food-direct UX foundation |
| Deals navigation / Deals hub | NOT_SUPPORTED | Nav = Menu \| Drops only |
| Cart progress messaging (“Add ₹X more…”) | NOT_SUPPORTED | **NOT_FOUND** |
| Drops marketing section | PARTIALLY_SUPPORTED | Static brand teaser, not commerce authority |

### 3.4 Campaign / Deal domain

| Capability | Classification |
|---|---|
| Campaign aggregate / lifecycle / objectives / reporting | NOT_SUPPORTED |
| Deal aggregate / Deal merchandising / Deal Add-to-cart journey | NOT_SUPPORTED |
| Offer projection over Promotion | NOT_SUPPORTED (product concept only) |

---

## 4. Deal taxonomy (discovery)

For each: customer value, example, choices, pricing expectation, availability, discovery,
Add-to-cart, customisation, V1/follow-up, material questions. **No schema design.**

### 4.1 Fixed-price combo

| | |
|---|---|
| Customer value | Predictable meal price lower than à-la-carte sum |
| Example | Burger + fries + drink for ₹299 |
| Required choices | Usually fixed SKUs or one choice per component group |
| Pricing | Single Deal price (reference = sum of component list prices) |
| Availability | Unavailable if any **mandatory** component has zero eligible selections |
| Discovery | Deals hub / Menu section / Home rail |
| Add-to-cart | One cart line representing the Deal (or composed lines — Fit) |
| Customisation | Component modifiers where Catalog allows |
| Class | **V1_CANDIDATE** |
| Questions | Catalog bundle vs new Deal identity? Where does Deal price live (Price book vs promo vs bundle price)? |

### 4.2 Meal for One

| | |
|---|---|
| Customer value | Personal meal convenience |
| Example | “Solo box” with one entrée + one side + drink |
| Class | **V1_CANDIDATE** (specialisation of fixed/choice combo) |
| Questions | Merchandising label only, or distinct Deal type? |

### 4.3 Meal for Two / Group

| | |
|---|---|
| Customer value | Shared value; higher AOV |
| Example | Two burgers + large fries + two drinks |
| Class | **V1_CANDIDATE** (composition + merchandising) |
| Questions | Serving-size copy vs true multi-diner constraints? |

### 4.4 Multi-item Deal

| | |
|---|---|
| Customer value | Bundle of several items at Deal price |
| Example | 6-piece + 2 dips |
| Class | **V1_CANDIDATE** |
| Questions | Distinct from BOGO Offer? |

### 4.5 Mix-and-match Deal

| | |
|---|---|
| Customer value | Flexibility within a price band |
| Example | Any 2 from selected list for ₹249 |
| Class | **FOLLOW_UP** (pricing + eligibility complexity) |
| Questions | Pricing authority for “any N from set”? |

### 4.6 Choice-based combo (group A + group B)

| | |
|---|---|
| Customer value | Guided customisation within Deal |
| Example | Choose 1 burger from A, 1 drink from B |
| Required choices | Min/max per component group (ADR-006 bundle groups) |
| Class | **V1_CANDIDATE** — aligns with existing Catalog bundle model (**VERIFIED** direction) |
| Questions | Is CURRENT Catalog admin + customer configure journey enough for V1 Deal UX? |

### 4.7 Limited Deal

| | |
|---|---|
| Customer value | Scarcity / urgency |
| Example | Weekend-only deal; quantity-capped |
| Class | **FOLLOW_UP** for quantity caps; time window may reuse promo/Deal schedule in V1 |
| Questions | Scarcity as Assortment/Availability vs Campaign redemption? |

### 4.8 Pickup Deal

| | |
|---|---|
| Customer value | Incentive to shift fulfilment mode |
| Example | Extra side free on Pickup |
| Class | **V1_CANDIDATE** as fulfilment-scoped Offer **or** Deal eligibility (ODC-06/07 approved) |
| Questions | Deal-only-on-Pickup vs Offer on Pickup cart? IMP-036H pickup continuity exists. |

### 4.9 Scheduled-order Deal

| | |
|---|---|
| Customer value | Plan ahead; off-peak fill |
| Example | Schedule tomorrow 1pm, unlock lunch Deal |
| Class | **FOLLOW_UP** / coordinate with **IMP-036I** (do not invent Scheduled Fulfilment here) |
| Questions | Eligibility on promised fulfilment time vs order-placed time? |

### 4.10 Drop-linked Deal

| | |
|---|---|
| Customer value | Brand heat + commercial conversion |
| Example | Signature Drop item in a limited combo |
| Class | **FOLLOW_UP** — Drop remains brand concept; linking is Campaign merchandising |
| Questions | Avoid making Drop a pricing authority (existing lock). |

**Deal component availability (FOUNDER_APPROVED_DISCOVERY_DIRECTION — ODC-12):**

- If a **mandatory** Deal component has no eligible selection → Deal = unavailable.
- If a configured choice group still contains another valid option → customer may **explicitly**
  choose another eligible option.
- Never silently substitute before payment, after selection, or after payment.
- Preserve Catalog / Assortment / Availability truth (ADR-006 alignment).

---

## 5. Offer benefit taxonomy

| Benefit | Customer gets | Qualification (typical) | Customer appearance | Engine today | V1 direction (Founder) |
|---|---|---|---|---|---|
| Percentage off | % off qualifying merchandise/order | Min basket / targets / window | Badge + savings line | CURRENT_SUPPORTED | **V1** — admin UI completeness |
| Flat ₹ off | Fixed paise off | Min basket / targets | Savings line | CURRENT_SUPPORTED | **V1** — admin UI completeness |
| Fixed promotional price | Item/Deal sold at set price | Assortment + Deal/item | Deal/item price | NOT_SUPPORTED | Prefer **Deal / Pricing** treatment; do not invent parallel Offer benefit unless Fit proves Promotion representation required |
| Free menu item | Complementary item | Qualifier items / min spend | Free line / cart gift | NOT_SUPPORTED as non-BOGO | **V1** where safely expressible through approved commercial authority (BOGO or Fit-justified extension) |
| Buy X Get Y | Reward units | Qualifier qty | BOGO messaging | CURRENT_SUPPORTED (engine) | **V1** — admin UI + customer messaging |
| Free delivery | ₹0 delivery charge | Min subtotal / mode / campaign | Progress + unlocked copy | PARTIALLY (threshold / charge target) | **V1** temporary/campaign incentive via Offer/Promotion; standing threshold stays tariff (see §11.1) |
| Reduced delivery fee | Partial delivery discount | Same | Savings on delivery line | PARTIALLY (`charge` target) | Covered by delivery-incentive class under stacking policy |
| Future physical merchandise reward | Non-food reward | Campaign rules | Claim / post-order | NOT_SUPPORTED | **DEFERRED** — conceptual compatibility (ODC-14); no inventory/fulfilment in V1 |

---

## 6. Offer eligibility taxonomy

Founder-approved V1 eligibility direction (ODC-06). Exact query/concurrency mechanics = Fit.

| Dimension | Candidates | V1 / follow-up / deferred |
|---|---|---|
| **TIME** start/end | Absolute window on Promotion | **V1_CANDIDATE** (exists) |
| **TIME** day-of-week / daypart | Happy hour | **FOLLOW_UP** (not required by Founder V1 direction) |
| **SCOPE** Brand / Outlet | Promotion scope | **V1_CANDIDATE** (exists) |
| **SCOPE** Product / Variant | Targets | **V1_CANDIDATE** (exists) |
| **SCOPE** Menu/category | Category target | **FOLLOW_UP** (not in engine; not required by Founder V1) |
| **SCOPE** Deal compatibility | Offer applies with Deal only when explicitly compatible | **V1** product policy (ODC-07); representation = Fit |
| **BASKET** min subtotal | Exists | **V1_CANDIDATE** |
| **BASKET** qualifying item/qty | Targets + min qty | **V1_CANDIDATE** |
| **FULFILMENT** DELIVERY / PICKUP | Not first-class promo field today | **V1_CANDIDATE** (ODC-06); mechanics = Fit |
| **FULFILMENT** ASAP / SCHEDULED | Depends on IMP-036I | Inherit final accepted IMP-036I model when applicable — **do not independently define Scheduled semantics here** |
| **CUSTOMER** authenticated | Limited coupon identity | **V1_CANDIDATE** — all authenticated customers may be targeted |
| **CUSTOMER** first order | Not in engine | **V1_CANDIDATE** — see approved definition below |
| **CUSTOMER** transaction count | Not in engine | **FOLLOW_UP** |
| **CUSTOMER** advanced segments | RFM, propensity, etc. | **DEFERRED** (explicit) |
| **LIMITS** max discount | % benefits | **V1_CANDIDATE** (ODC-11) |
| **LIMITS** per-customer / global coupon redemptions | Exists on coupons | **V1_CANDIDATE** — reuse where they fit |
| **LIMITS** per-customer / global **Offer** redemption caps | Absent at promotion level today | **V1_CANDIDATE** product desire (ODC-11); concurrency-safe global Offer limits = Fit |
| **LIMITS** per-day / campaign monetary budget / pacing | Partial / absent | **FOLLOW_UP** unless a future Product Definition proves V1 necessity |

### First-order definition (FOUNDER_APPROVED_DISCOVERY_DIRECTION — ODC-06)

```text
A customer is first-order eligible only when there is no previous successfully purchased
direct BOBA Bear Order for that authenticated customer identity.

- Failed / abandoned payment attempts do NOT consume first-order status.
- A later cancellation/refund of a successfully purchased Order does NOT restore
  first-order eligibility.

Architecture Fit must determine exact authoritative query and concurrency mechanics.
```

---

## 7. Activation

### Founder-approved V1 (ODC-04)

| Mode | Meaning | Repo today |
|---|---|---|
| **AUTOMATIC OFFER** | Eligible → evaluated and may auto-apply | CURRENT_SUPPORTED (engine) |
| **COUPON-ACTIVATED OFFER** | Code activates Offer/Promotion | CURRENT_SUPPORTED (API); UI NOT_SUPPORTED |

Coupon ≠ Offer. Not every Offer requires a code.

### Follow-up activation (not Founder-approved for V1)

| Mode | Notes |
|---|---|
| Claimable offer | Customer claims into wallet/list before cart |
| Targeted offer | Push/assigned without public browse |
| Campaign-link offer | Deep link / QR attaches Offer |
| Loyalty-triggered offer | Points/tier gates — **DEFERRED** with loyalty |

---

## 8. Campaign model (FOUNDER_APPROVED_DISCOVERY_DIRECTION — ODC-02)

Campaign is a **first-class business / operator concept**. V1 intent: **lightweight
orchestration only**.

Campaign may coordinate: Deals; Offers; timing; scope; merchandising; objective; redemption
visibility; measurement.

Campaign must **not** become: a second Pricing authority; a second Promotion engine; a second
Checkout evaluator.

Architecture Fit later determines whether Campaign needs durable domain identity or can remain
orchestration metadata.

### Candidate attributes (product level)

name; optional public title; business objective; start/end; Outlet/Brand scope; attached Deals;
attached Offers; merchandising hooks; redemption visibility; reporting.

### Candidate objectives (metadata — not pricing math)

`ACQUISITION` | `CONVERSION` | `AOV` | `PRODUCT_TRIAL` | `OFF_PEAK_DEMAND` |
`FULFILMENT_SHIFT` | `FREQUENCY` | `RETENTION`

### Candidate lifecycle

`DRAFT` → `SCHEDULED` → `ACTIVE` → `PAUSED` → `ENDED` (possibly `CANCELLED`)

**CURRENT Promotion/Coupon supply:** only `draft/active/retired` (+ coupon `disabled`). IMP-036F
explicitly rejects inventing campaign lifecycle variants onto Promotion. Implication: Campaign
lifecycle is likely **orchestration metadata** wrapping existing promo windows — **Fit question**,
not assumed.

---

## 9. Stacking (FOUNDER_APPROVED_DISCOVERY_DIRECTION — ODC-07 / ODC-08)

### Incentive classes (candidates)

| Class | Meaning |
|---|---|
| DEAL_BUILT_IN_VALUE | Merchandise price already reflects Deal |
| ITEM_OFFER | Line-level Promotion |
| ORDER_OFFER | Basket-level Promotion |
| DELIVERY_OFFER | Delivery charge reduction / free delivery |
| COUPON | Code-activated Promotion |

### Approved V1 product policy

```text
maximum:
  ONE primary merchandise/order Offer
  +
  ONE compatible delivery incentive
subject to Deal compatibility.

Deals are NOT automatically stackable with merchandise/order Offers.
Default posture: Deal built-in value + delivery incentive may be compatible.
Additional Deal + Offer combinations require explicit compatibility.
No silent deep-discount stacking.
```

Exact representation is Architecture Fit–owned. Existing engine `exclusive` / `combinable`
mechanics are **implementation authority only** and must be reconciled to this product policy
during Fit. Do **not** rewrite runtime behaviour in discovery.

### Example analysis (product intent)

| Combo | Approved posture |
|---|---|
| Deal + Free Delivery | Potentially valid (delivery class separate; default compatible) |
| Order-level ₹100 off + 20% order discount | Not simultaneously applied by default |
| BOGO + another merchandise discount | Not simultaneous unless later explicitly supported |
| Deal + %-off coupon | Requires explicit compatibility (margin risk) |
| Automatic + entered coupon | Compete for best compatible value (ODC-10) — not silent stack of incompatibles |

**Margin risks still Fit-owned to prevent:** double-dipping Deal built-in value + order %;
delivery threshold + delivery promo charge discount; unlimited combinable stacks.

---

## 10. Best-offer policy (FOUNDER_APPROVED_DISCOVERY_DIRECTION — ODC-09 / ODC-10)

### Multiple automatic Offers (ODC-09)

When multiple compatible automatic Offers qualify:

```text
Select the deterministic Offer producing the best customer monetary outcome /
lowest payable total.
Preserve deterministic tie-breaking.
```

CURRENT `select.ts` behaviour appears directionally aligned, but runtime behaviour is **not**
itself Founder product authority. Future Product Definition must make the outcome explainable to
the customer. Do not rewrite runtime in discovery.

### Entered Coupon vs automatic Offer (ODC-10)

An entered Coupon **competes** with the applicable automatic Offer.

```text
The customer must NOT become worse off merely because they entered a coupon.
V1 desired outcome: best compatible value wins.

- If automatic Offer is better than entered Coupon:
  retain/apply the better outcome + explain that the automatic Offer gives the better saving.
- If Coupon is better:
  Coupon-backed Offer wins.

Do NOT silently stack incompatible Coupon + automatic benefits.
```

Detailed UX and evaluator mapping belong to Product Definition / Architecture Fit.

---

## 11. Commercial / checkout truth (product requirements exploration)

Preserve Pricing + Checkout Snapshot authority. No tax/legal claims.

| Topic | Discovery need |
|---|---|
| Reference price | Show truthful “was” without false MRP claims |
| Deal price | Authoritative payable for Deal composition |
| Offer / coupon / delivery savings | Explainable breakdown |
| “You saved” | Sum of truthful components; never invent |
| Tax / packaging | Remain Pricing/tax-policy owned |
| Payment-bound snapshot | Immutable; promo effects already snapshotted |
| Refunds | Reuse original allocations (ADR-007) |

### 11.1 Truthful reference price / savings (approved discovery principle)

```text
TRUTHFUL_SAVINGS_REQUIRED = YES
No deceptive reference-price presentation.
```

Deal strike-through price, reference price, percentage saved, and “You saved” **must** derive
from authoritative commercial truth. Operators must **not** be allowed to enter arbitrary
fictional “was ₹499” solely to manufacture a larger apparent discount.

Candidate reference basis (exact policy = Product Definition + Fit):

- authoritative sum of normal component prices
- authoritative prior/current price basis
- other legally/product-approved basis

### 11.2 Free delivery authority split (approved product distinction)

| Kind | Authority | Example |
|---|---|---|
| **STANDING FREE-DELIVERY POLICY** | Delivery Tariff | Free delivery for all qualifying orders above a configured threshold as normal delivery pricing policy |
| **TEMPORARY / CAMPAIGN FREE-DELIVERY INCENTIVE** | Offer / Promotion | Free delivery this weekend; free delivery using coupon; free delivery for first order |

Do **not** create duplicate calculation logic. Architecture Fit must resolve how temporary
free-delivery Offer effects interact with the existing tariff threshold and charge-target
promotion path. Customer must receive **one coherent delivery-charge result**.

Stacking / Deal behaviour that changes explainable money requires future Product Definition
before Fit implements.

---

## 12. Limit / abuse control (FOUNDER_APPROVED_DISCOVERY_DIRECTION — ODC-11)

### V1 controls

- max discount where applicable
- per-customer redemption cap
- global Offer redemption cap
- reuse existing coupon global/per-customer limits where they fit

Architecture Fit must determine concurrency-safe global Offer limits.

### FOLLOW_UP (unless Product Definition later proves V1 necessity)

- campaign-level monetary budget
- budget pacing
- advanced per-day control

### Explicitly not V1 platform scope

fraud/abuse platform; multi-account abuse machinery beyond existing redemption claims.

---

## 13. Merchandising (discovery IA — not implementation)

### Customer surfaces

Home; Menu; Drops; Deals; Product/detail; Cart; Checkout; My BOBA / Offers for You.

### Candidate Deals navigation

```text
Deals
  For One
  For Two
  Combos
  Under ₹X
  Pickup Deals
  Limited Deals
```

Exact IA is discovery-only.

### Messaging elements

badge; headline; image; saving; terms; expiry; progress (“Add ₹82 more to unlock free delivery”;
“You've unlocked ₹100 off”).

---

## 14. Measurement (FOUNDER_APPROVED_DISCOVERY_DIRECTION — ODC-13)

### V1 — descriptive measurement only

Candidate metrics:

- Deal views; Deal add-to-cart; Deal purchases
- Offer eligibility; Offer application; Offer redemption
- Orders; Gross sales; Discount spend; Net sales after discount; AOV; Units sold
- Fulfilment mode; New vs returning customer

Campaign aggregates may summarize these.

```text
Do NOT call sales:
  incremental revenue | causal lift | incremental orders
unless future experimentation methodology proves causality.

Advanced experimentation = FOLLOW_UP.
```

Analytics events must not become commercial truth (snapshot remains authority).

---

## 15. Founder-directed V1 candidate

Status: `FOUNDER_APPROVED_DISCOVERY_DIRECTION` (2026-09-24). Still discovery-only —
**not** Product Definition, Gate, Fit, or implementation authorization.

| Area | Founder-directed V1 candidate |
|---|---|
| **DEALS** | Fixed combo; choice-based combo; multi-item Deal (meal for one/two as merchandising specialisations). Prefer reuse/composition of Catalog bundle + Menu + Pricing unless Fit proves insufficient. Do not pre-decide a new Deal aggregate. |
| **OFFERS** | Percentage discount; flat ₹ discount; BOGO / Buy X Get Y; free menu item where safely expressible through approved commercial authority; free-delivery incentive (Offer/Promotion path). Fixed promotional price → prefer Deal/Pricing treatment. |
| **ELIGIBILITY** | Existing time window; Brand/Outlet; product/variant; min basket; authenticated customer; first order (approved definition); fulfilment mode `DELIVERY \| PICKUP`; redemption limits. Scheduled timing inherits accepted IMP-036I model when applicable. |
| **ACTIVATION** | Automatic + Coupon |
| **CONTROLS** | Max discount; per-customer cap; global Offer cap; approved stacking (one primary + compatible delivery); Deal compatibility |
| **CAMPAIGN** | Lightweight first-class business concept: objective, schedule, scope, Deal/Offer grouping, merchandising, descriptive reporting — not a second money engine |
| **CUSTOMER EXPERIENCE** | Deals discovery; Deal configuration; coupon field; auto-Offer messaging; threshold progress; truthful savings; conflict / best-offer explanation |
| **ADMIN** | Complete commercially relevant gaps in PromotionsEditor; Campaign management; Deal composition/configuration; Offer configuration; consequence preview; diagnosis |
| **MEASUREMENT** | Descriptive only |

### Remains FOLLOW_UP (not silently expanded into V1)

daypart recurrence; category targeting; mix-and-match Deal; My BOBA / Offers for You;
Campaign landing page; claimable/targeted/loyalty activation; campaign monetary budget /
pacing / advanced per-day control; advanced experimentation.

### Challenge from repository evidence (still valid)

1. **Engine already covers** automatic + coupon + % / flat / BOGO + min spend + windows + scope +
   exclusive/combinable selection + snapshot + redemption claims.
2. **Largest product gaps** are customer merchandising (Deals/Offers UI), coupon field, progress
   messaging, Campaign ops concept, fulfilment-scoped rules, first-order eligibility, and Deal
   composition UX — not a greenfield promo engine.
3. **Admin UI lag:** BOGO / charge targets / stacking / windows / min-spend may be API-complete but
   commercially hard to operate — V1 includes completing PromotionsEditor gaps.
4. **Free delivery** already has a tariff-threshold path; temporary incentives must Fit against it
   without duplicate calculation logic (§11.2).
5. **Scheduled eligibility** must inherit IMP-036I — do not invent Scheduled semantics here.
6. **Category targeting and daypart** remain FOLLOW_UP.

---

## 16. Explicit deferrals

| Item | Rationale | Revisit when |
|---|---|---|
| Loyalty points / tiers | Separate relationship economy | Loyalty Product Definition |
| Wallet / cashback balance | New monetary liability | Payments/ledger authority |
| Gift cards | Stored value | Payments |
| Referrals | Growth loop + abuse | Growth slice |
| Membership / subscription pricing | Recurring commercial model | Membership PD |
| Advanced customer segmentation | Not V1 targeting | CRM maturity |
| Win-back automation | Journey automation | CRM |
| AI offer optimisation | Model risk + opacity | After measurement baseline |
| Dynamic personalized pricing | Fairness / margin / legal | Explicit Founder + legal |
| Surge pricing | Brand + regulatory risk | Explicit Founder |
| Affiliate / influencer attribution platform | Full attribution stack | Growth |
| Marketing automation journeys | Multi-stage CRM | CRM |
| Budget pacing | Media-style spend control | After campaign reporting |
| Physical merchandise inventory/fulfilment | Ops complexity | Merch commerce |
| Advanced experimentation / causal lift | Needs design | After V1 metrics |
| Daypart recurrence | Engine gap; ops complexity | FOLLOW_UP Offer eligibility |
| Category targets | Engine gap | FOLLOW_UP |
| Mix-and-match Deal | Pricing + eligibility complexity | FOLLOW_UP |
| My BOBA / Offers for You | Not required by Founder V1 direction | FOLLOW_UP |
| Campaign landing page | Public campaign surface | FOLLOW_UP |
| Claimable / targeted activation | Beyond automatic + coupon | FOLLOW_UP |

---

## 17. Founder decision register (discovery)

```text
ODC_TOTAL = 14
FOUNDER_APPROVED_DISCOVERY_DIRECTION = 14
OPEN_DISCOVERY_DECISIONS = 0
DECISION_DATE = 2026-09-24
AUTHORITY = Founder

FOUNDER_APPROVED_DISCOVERY_DIRECTION
  ≠
FORMAL_PRODUCT_DEFINITION_APPROVAL

No canonical decision-register D-number is created by this discovery.
```

All statuses below: `FOUNDER_APPROVED_DISCOVERY_DIRECTION`.

### ODC-01 — Deal vs Offer semantic boundary

- **Status:** `FOUNDER_APPROVED_DISCOVERY_DIRECTION` (2026-09-24, Founder)
- **Approved direction:** Deal = customer-browsable and directly purchasable value proposition
  (title, image, composition, choices, Deal price, truthful reference comparison, direct ATC).
  Offer = conditional commercial benefit on eligible customer/cart/order. Do **not** collapse into
  one generic Promotion. Promotion remains internal monetary authority. Coupon remains Offer
  activation mechanism.
- **Dependencies:** ODC-03; Architecture Fit for Deal identity

### ODC-02 — Campaign first-class business concept

- **Status:** `FOUNDER_APPROVED_DISCOVERY_DIRECTION` (2026-09-24, Founder)
- **Approved direction:** Campaign is a first-class business/operator concept. V1 = lightweight
  orchestration only (Deals, Offers, timing, scope, merchandising, objective, redemption
  visibility, measurement). Must not become second Pricing / Promotion / Checkout evaluator.
  Durable domain vs orchestration metadata = Fit.
- **Dependencies:** ODC-13

### ODC-03 — Deal composition

- **Status:** `FOUNDER_APPROVED_DISCOVERY_DIRECTION` (2026-09-24, Founder)
- **Approved direction:** V1 includes fixed Deals + customer-choice Deals (fixed combo, meal for
  one/two, multi-item Deal, choice-based combo). Prefer reuse of Catalog bundle / Menu / Pricing.
  Do not pre-decide a new Deal aggregate.
- **Dependencies:** Catalog/Menu readiness; Pricing; Fit

### ODC-04 — Offer activation

- **Status:** `FOUNDER_APPROVED_DISCOVERY_DIRECTION` (2026-09-24, Founder)
- **Approved direction:** V1 supports AUTOMATIC OFFER + COUPON-ACTIVATED OFFER. Coupon ≠ Offer.
  Not every Offer requires a code. Claimable / targeted / loyalty activation = follow-up unless
  separately approved later.
- **Dependencies:** Customer coupon field story

### ODC-05 — V1 benefit types

- **Status:** `FOUNDER_APPROVED_DISCOVERY_DIRECTION` (2026-09-24, Founder)
- **Approved direction:** percentage discount; flat ₹ discount; BOGO / Buy X Get Y; free menu item
  where safely expressible through approved commercial authority; free delivery (temporary/
  campaign incentive). Fixed promotional price → prefer Deal/Pricing. Do not invent a second
  monetary engine.
- **Dependencies:** ODC-03; delivery policy Fit (§11.2)

### ODC-06 — V1 customer eligibility / targeting

- **Status:** `FOUNDER_APPROVED_DISCOVERY_DIRECTION` (2026-09-24, Founder)
- **Approved direction:** V1 may include all authenticated customers; first-order eligibility
  (approved definition in §6); existing redemption/usage limits; fulfilment-mode eligibility
  `DELIVERY | PICKUP`. Scheduled timing eligibility inherits final accepted IMP-036I model —
  do not independently define Scheduled semantics here. First-order query/concurrency = Fit.
- **Dependencies:** IMP-036I acceptance for scheduled; identity for first-order

### ODC-07 — Deal + Offer compatibility

- **Status:** `FOUNDER_APPROVED_DISCOVERY_DIRECTION` (2026-09-24, Founder)
- **Approved direction:** Deals are not automatically stackable with merchandise/order Offers.
  Default: Deal built-in value + delivery incentive may be compatible. Additional combinations
  require explicit compatibility. No silent deep-discount stacking. Exact representation = Fit.
- **Dependencies:** ODC-08

### ODC-08 — Stacking model

- **Status:** `FOUNDER_APPROVED_DISCOVERY_DIRECTION` (2026-09-24, Founder)
- **Approved direction:** V1 maximum = one primary merchandise/order Offer + one compatible
  delivery incentive, subject to Deal compatibility. Examples: Deal + Free Delivery potentially
  valid; two merchandise discounts not simultaneous by default; BOGO + another merchandise
  discount not simultaneous unless later explicitly supported. Engine exclusive/combinable
  mechanics reconcile to this product policy at Fit — do not rewrite runtime in discovery.
- **Dependencies:** Fit; ODC-09/10

### ODC-09 — Multiple automatic Offers / best-offer policy

- **Status:** `FOUNDER_APPROVED_DISCOVERY_DIRECTION` (2026-09-24, Founder)
- **Approved direction:** When multiple compatible automatic Offers qualify, select the
  deterministic Offer producing the best customer monetary outcome / lowest payable total.
  Preserve deterministic tie-breaking. `select.ts` appears directionally aligned but is not
  Founder product authority. Future Product Definition must make outcome explainable.
- **Dependencies:** Explainability in Product Definition / Fit

### ODC-10 — Entered Coupon vs automatic Offer

- **Status:** `FOUNDER_APPROVED_DISCOVERY_DIRECTION` (2026-09-24, Founder)
- **Approved direction:** Entered Coupon competes with applicable automatic Offer. Customer must
  not become worse off merely for entering a coupon. Best compatible value wins. If automatic is
  better: retain it and explain. If Coupon is better: Coupon-backed Offer wins. Do not silently
  stack incompatible Coupon + automatic benefits. UX/evaluator mapping = PD / Fit.
- **Dependencies:** ODC-08/09; coupon UI

### ODC-11 — Redemption / max-discount limits

- **Status:** `FOUNDER_APPROVED_DISCOVERY_DIRECTION` (2026-09-24, Founder)
- **Approved direction:** V1 controls = max discount where applicable; per-customer redemption
  cap; global Offer redemption cap. Reuse existing coupon global/per-customer limits where they
  fit. Campaign-level monetary budget, budget pacing, advanced per-day control = FOLLOW_UP
  unless PD later proves V1 necessity. Concurrency-safe global Offer limits = Fit.
- **Dependencies:** Payment redemption claims; Fit for global Offer caps

### ODC-12 — Unavailable Deal component behaviour

- **Status:** `FOUNDER_APPROVED_DISCOVERY_DIRECTION` (2026-09-24, Founder)
- **Approved direction:** Mandatory component with no eligible selection → Deal unavailable. If
  choice group still has a valid option → customer may explicitly choose it. Never silently
  substitute before/after selection or after payment. Preserve Catalog / Assortment /
  Availability truth.
- **Dependencies:** Assortment/Availability; ADR-006

### ODC-13 — V1 campaign measurement

- **Status:** `FOUNDER_APPROVED_DISCOVERY_DIRECTION` (2026-09-24, Founder)
- **Approved direction:** Descriptive measurement only (Deal views/ATC/purchases; Offer
  eligibility/application/redemption; Orders; Gross/Net sales; Discount spend; AOV; Units;
  Fulfilment mode; New vs returning; Campaign aggregates). Do not claim incremental revenue /
  causal lift / incremental orders without proven experimentation methodology. Advanced
  experimentation = FOLLOW_UP.
- **Dependencies:** Event taxonomy Fit

### ODC-14 — Physical merchandise future compatibility

- **Status:** `FOUNDER_APPROVED_DISCOVERY_DIRECTION` (2026-09-24, Founder)
- **Approved direction:** Maintain future conceptual compatibility for `FREE_MERCHANDISE` reward
  (e.g. stickers, collectibles, apparel). V1 explicitly excludes merchandise inventory, stock
  reservation, fulfilment, shipping, warehouse logic. Future separate capability required.
- **Dependencies:** Future merch commerce

---

## 18. Future Architecture Fit questions (questions only — all OPEN)

Do not answer Fit-owned questions here. Founder decisions refine the questions; they do not
close them. `ANSWERED = 0`.

1. Can the current Catalog bundle model satisfy fixed and choice-based Deals for V1?
2. Where does authoritative Deal price live (Price book vs promotion vs bundle price)?
3. How is truthful reference price derived and persisted without allowing fictional “was” prices?
4. Can existing Promotion benefits represent all Founder-approved V1 Offer types (including free
   menu item where safely expressible)?
5. How do temporary free-delivery Offers interact with the existing tariff threshold and
   charge-target promotion path so the customer receives one coherent delivery charge?
6. How does one-primary + compatible-delivery stacking map onto the current evaluator without a
   second money engine?
7. How is Coupon-vs-automatic best-compatible-value explained without divergent money calculation?
8. How are global Offer caps concurrency-safe beyond existing coupon claim rows?
9. How is first-order eligibility evaluated atomically / safely / privately against order history?
10. How does fulfilment-mode eligibility (`DELIVERY | PICKUP`) extend Promotion safely?
11. After IMP-036I acceptance, how does Scheduled timing eligibility participate without
    duplicating scheduling authority?
12. How are Campaign and Promotion lifecycles related without inventing illegal promo states?
13. Can Campaign remain orchestration metadata rather than durable monetary domain authority?
14. How do scheduled Campaign dates interact with outlet timezone?
15. How are analytics events recorded without becoming commercial truth?
16. How are existing Checkout Snapshots extended for Deal identity without losing immutability?
17. How should Admin commercial workspace evolve without breaking IMP-036F coherence?
18. How do Mix-and-match Deals (FOLLOW_UP) price under ADR-007 calculation order if ever scoped?
19. How is Deal compatibility with Offers represented declaratively for operators?
20. How is best-offer selection deterministic, explainable, and reconciled if product policy and
    CURRENT `select.ts` diverge?

---

## 19. Workforce / commercial journeys (discovery)

Preserve IMP-036F coherent commercial management. Do **not** invent personas/roles/permissions.

Candidate operator journeys: Create Campaign; create/configure Deal; create Offer; attach existing
Promotion/Coupon; choose scope/eligibility/limits/stacking; schedule; preview customer consequence
(reuse consequence review); activate/pause; observe health; end; review results; diagnose
ineligibility.

Likely permission reuse: `promotions.*` / `coupons.*` / `pricing.*` / `catalog.*` / `menu.*`
(exact binding = Fit / PD later).

---

## 20. Safety / concurrency with IMP-036I

- This discovery adds **only** isolated files under `docs/platform/discovery/`.
- No ROADMAP/STATE/ARCHITECTURE/decision-register/VISION/PRODUCT-DELIVERY/TESTING edits.
- No IMP-036I Product Definition or capability edits.
- No runtime/schema/test/CI changes.
- If `main` moves under IMP-036I work: rebase this docs branch safely; on governance conflict →
  **STOP**.

---

## 21. Recommended next action

```text
FOUNDER_DISCOVERY_DIRECTION = APPROVED (ODC-01..ODC-14, 2026-09-24)
OPEN_FOUNDER_DISCOVERY_DECISIONS = 0

Continue discovery safely in parallel with IMP-036I.
Do NOT assign formal IMP identity.
Do NOT activate the capability.
Do NOT create Product Definition.
Do NOT perform Product Definition Gate.
Do NOT perform Architecture Fit.
Do NOT implement.

Create formal Product Definition only when ROADMAP assigns and activates a future slice.
```
