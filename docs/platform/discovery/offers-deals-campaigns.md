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

WORKING_CAPABILITY_NAME: Offers, Deals & Campaigns
CANDIDATE_WORKING_LABEL: "IMP-036J" — CANDIDATE / WORKING LABEL / NOT GOVERNANCE IDENTITY
  (must never be presented as allocated, activated, planned in ROADMAP, or authorized)

PROCESS_PHASES_IN_SCOPE: ANCHOR → DISCOVER → STORY_MAP
PROCESS_PHASES_EXPLICITLY_OUT: PRODUCT_DEFINITION_GATE | ARCHITECTURE_FIT | IMPLEMENTATION

PARALLEL_TO: IMP-036I — Scheduled Fulfilment (active Product Definition slice; do not interfere)
RUNTIME_SEMANTIC_DRIFT: NONE (documentation only)
```

This document is **isolated discovery**. It does not amend VISION, ROADMAP, STATE,
ARCHITECTURE, decision-register, PRODUCT-DELIVERY, TESTING, accepted Product Definitions,
capability architectures, or IMP-036I artifacts. Companion story map:
[`offers-deals-campaigns-story-map.md`](./offers-deals-campaigns-story-map.md).

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

## 2. Working vocabulary (candidate — not locked)

| Term | Working meaning | Repository evidence |
|---|---|---|
| **DEAL** | Customer-browsable and directly purchasable value proposition. | **NOT_SUPPORTED** as commerce entity. Catalog has `productKind=bundle` + bundle groups/options schema (**VERIFIED** ADR-006 + `catalog.ts`); customer Menu projection / Deals browse **NOT_FOUND**. Whether Deal = Catalog bundle, Menu placement, Pricing construct, or new aggregate is **Architecture Fit**. |
| **OFFER** | Conditional commercial benefit applied to an eligible customer/cart/order. | **NOT_SUPPORTED** as named entity. Closest CURRENT authority is **Promotion** (automatic or coupon-triggered). Customer “Offers” page **ABSENT** (experience gap map / EXP-WD-028). |
| **COUPON** | Code/token that may activate an Offer. Not every Offer requires a Coupon. | **CURRENT_SUPPORTED** (`promotion_coupons`, trigger `coupon`, cart API `POST /api/v1/cart/coupon`). Customer coupon entry UI **NOT_SUPPORTED**. |
| **PROMOTION** | Existing BOBA Bear internal commercial/money authority (IMP-016 / ADR-007 / IMP-036F). | **CURRENT_SUPPORTED**. Do **not** redefine Promotion as the whole customer-facing sales-growth concept. |
| **CAMPAIGN** | Sales initiative coordinating Deals and/or Offers, timing, merchandising, objectives, measurement. | **NOT_SUPPORTED** as domain entity. Marketing “campaign” language exists in experience docs only. |
| **DROP** | BOBA brand / newness / scarcity concept. May participate in a Campaign; is **not** a discount engine. | **PARTIALLY_SUPPORTED** as static marketing (`/#drops`, `SignatureDrops`); BrandDrop commerce authority **NOT_SUPPORTED** (food-direct lock). |

**Boundary hypothesis (discovery only):**

```text
Campaign
   ↓
Deal / Offer
   ↓
existing Promotion / Coupon / Pricing / Catalog / Menu authorities
   ↓
Checkout evaluation / commercial snapshot
```

Hard discovery constraints:

- Do **not** create a second pricing engine.
- Do **not** create a second promotion engine.
- Do **not** assume Deal must be a new aggregate (Fit question).

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
| Class | **V1_CANDIDATE** as fulfilment-scoped Offer **or** Deal eligibility; depends on ODC-07 |
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

**Candidate Deal component availability principle (not locked):**

- If a **mandatory** Deal component has no eligible selection → Deal unavailable.
- If a choice group still has another valid selection → customer may switch.
- Never silently substitute after customer selection/payment (ADR-006 already locks this).

---

## 5. Offer benefit taxonomy

| Benefit | Customer gets | Qualification (typical) | Customer appearance | Engine today | Extension likely? |
|---|---|---|---|---|---|
| Percentage off | % off qualifying merchandise/order | Min basket / targets / window | Badge + savings line | CURRENT_SUPPORTED | Admin UI completeness |
| Flat ₹ off | Fixed paise off | Min basket / targets | Savings line | CURRENT_SUPPORTED | Admin UI completeness |
| Fixed promotional price | Item/Deal sold at set price | Assortment + Deal/item | Deal/item price | NOT_SUPPORTED | **Likely** (Pricing or new benefit) — Fit |
| Free menu item | Complementary item | Qualifier items / min spend | Free line / cart gift | NOT_SUPPORTED as non-BOGO | **Likely** or model via BOGO |
| Buy X Get Y | Reward units | Qualifier qty | BOGO messaging | CURRENT_SUPPORTED (engine) | Admin UI + customer messaging |
| Free delivery | ₹0 delivery charge | Min subtotal / mode | Progress + unlocked copy | PARTIALLY (threshold / charge target) | Named Offer UX; policy Fit |
| Reduced delivery fee | Partial delivery discount | Same | Savings on delivery line | PARTIALLY (`charge` target) | Product clarity vs tariff |
| Future physical merchandise reward | Non-food reward | Campaign rules | Claim / post-order | NOT_SUPPORTED | **DEFERRED** — conceptual compatibility only; no inventory/fulfilment in V1 |

---

## 6. Offer eligibility taxonomy

| Dimension | Candidates | V1 / follow-up / deferred |
|---|---|---|
| **TIME** start/end | Absolute window on Promotion | **V1_CANDIDATE** (exists) |
| **TIME** day-of-week / daypart | Happy hour | **FOLLOW_UP** |
| **SCOPE** Brand / Outlet | Promotion scope | **V1_CANDIDATE** (exists) |
| **SCOPE** Product / Variant | Targets | **V1_CANDIDATE** (exists) |
| **SCOPE** Menu/category | Category target | **FOLLOW_UP** (not in engine) |
| **SCOPE** Deal | Offer applies only with Deal | **FOLLOW_UP** / decision ODC-07 — Deal identity Fit |
| **BASKET** min subtotal | Exists | **V1_CANDIDATE** |
| **BASKET** qualifying item/qty | Targets + min qty | **V1_CANDIDATE** |
| **FULFILMENT** DELIVERY / PICKUP | Not first-class promo field today | **V1_CANDIDATE** product need; **UNKNOWN_REQUIRES_FIT** mechanics |
| **FULFILMENT** ASAP / SCHEDULED | Depends on IMP-036I | **FOLLOW_UP** until 036I product lock |
| **CUSTOMER** authenticated | Limited coupon identity | **V1_CANDIDATE** |
| **CUSTOMER** first order | Not in engine | **V1_CANDIDATE** product desire; extension **likely** |
| **CUSTOMER** transaction count | Not in engine | **FOLLOW_UP** |
| **CUSTOMER** advanced segments | RFM, propensity, etc. | **DEFERRED** (explicit) |
| **LIMITS** max discount | % benefits | **V1_CANDIDATE** |
| **LIMITS** per-customer / global coupon redemptions | Exists on coupons | **V1_CANDIDATE** |
| **LIMITS** per-day / campaign caps | Partial / absent | **FOLLOW_UP** |
| **LIMITS** promotion-level (non-coupon) caps | Absent | **FOLLOW_UP** / Fit |

---

## 7. Activation

### Candidate V1

| Mode | Meaning | Repo today |
|---|---|---|
| **AUTOMATIC OFFER** | Eligible → evaluated and may auto-apply | CURRENT_SUPPORTED (engine) |
| **COUPON-ACTIVATED OFFER** | Code activates Offer/Promotion | CURRENT_SUPPORTED (API); UI NOT_SUPPORTED |

Do **not** equate Offer with Coupon.

### Future activation (not V1)

| Mode | Notes |
|---|---|
| Claimable offer | Customer claims into wallet/list before cart |
| Targeted offer | Push/assigned without public browse |
| Campaign-link offer | Deep link / QR attaches Offer |
| Loyalty-triggered offer | Points/tier gates — **DEFERRED** with loyalty |

---

## 8. Campaign model (discovery)

Campaign is explored as a **first-class business/operations concept**, not necessarily a monetary
authority.

### Candidate attributes (product level)

name; optional public title; business objective; start/end; Outlet/Brand scope; attached Deals;
attached Offers; merchandising hooks; redemption controls; reporting.

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

## 9. Stacking discovery (material — not approved)

### Incentive classes (candidates)

| Class | Meaning |
|---|---|
| DEAL_BUILT_IN_VALUE | Merchandise price already reflects Deal |
| ITEM_OFFER | Line-level Promotion |
| ORDER_OFFER | Basket-level Promotion |
| DELIVERY_OFFER | Delivery charge reduction / free delivery |
| COUPON | Code-activated Promotion |

### Candidate V1 policy (DISCOVERY_RECOMMENDATION_ONLY)

```text
one primary merchandise/order incentive
+
one compatible delivery incentive
Deal compatibility explicitly declared
```

### Example analysis

| Combo | Risk / note |
|---|---|
| Deal + free delivery | Usually desired; delivery class separate |
| Deal + %-off coupon | Margin risk if Deal already discounted — needs explicit compatibility |
| Item discount + order discount | Engine combinable path exists; product may want stricter V1 |
| Automatic + entered coupon | Today: submitted coupon participates in selection; outcomes include `VALID_BUT_NOT_SELECTED` |
| Two automatic offers | Engine may combinable-stack or exclusive-compete — product may want “one primary” |
| BOGO + flat order discount | BOGO forced exclusive today — conflicts with naive stack |

**Margin risks:** double-dipping Deal built-in value + order %; delivery threshold + delivery promo
charge discount; unlimited combinable stacks.

**Status:** stacking policy **not approved**. Founder decisions ODC-07…ODC-10.

---

## 10. Best-offer discovery (Founder decision)

When multiple automatic Offers qualify:

| Option | Notes |
|---|---|
| A Customer chooses | High trust; more UI; abuse of confusion risk |
| B Highest monetary saving | Close to CURRENT engine (grand-total optimisation) |
| C Configured priority | Operator control; may not maximise customer saving |
| D Compatibility + priority system | Flexible; complex |

Entered Coupon vs automatic:

| Option | Notes |
|---|---|
| Replace automatic | Simple mental model |
| Stack | Margin risk |
| Reject if worse | Protects customer but surprising |
| Customer chooses | Transparent; UI cost |

**Keep OPEN until Founder resolves ODC-09 / ODC-10.** Note: CURRENT code already auto-selects
best candidate set by post-tax total — changing this is product+Fit consequential.

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

Stacking / Deal behaviour that changes explainable money requires future Product Definition
decisions before Fit.

---

## 12. Limit / abuse control

### V1-oriented controls (many partially exist)

minimum order value; max discount; per-customer use; global redemption; coupon use count;
start/end windows.

### Later concerns (do not scope advanced anti-fraud platform into V1)

fraud/abuse; multi-account abuse; budget caps; budget pacing; per-day soft caps beyond coupon
model.

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

## 14. Measurement

### Candidate V1 metrics

Deal impressions / ATC / purchases; Offer eligibility / application / redemption; Orders; Gross
sales; Discount spend; Net sales after discount; AOV; Units; Fulfilment mode; New vs returning.

Campaign aggregates of the above.

```text
NO causal "incremental revenue" claim in V1 unless measurement design supports it.
Advanced experimentation / control groups = FOLLOW_UP.
```

Analytics events must not become commercial truth (snapshot remains authority).

---

## 15. V1 candidate (challenged against repository)

### Recommended narrow V1 (discovery recommendation)

| Area | Candidate |
|---|---|
| **DEALS** | Fixed-price combo; choice-based combo; multi-item Deal — **prefer composing Catalog bundle + Pricing + Menu merchandising** before new aggregate |
| **OFFERS** | % off; flat ₹; BOGO; free delivery (threshold and/or charge-target clarity); free menu item only if expressible via BOGO or explicit extension |
| **ELIGIBILITY** | Date/time window; Outlet/Brand scope; product/variant; min basket; authenticated + coupon limits; first-order **if** Founder accepts engine extension |
| **ACTIVATION** | Automatic + Coupon |
| **CONTROLS** | Max discount; customer/global coupon caps; stacking/compatibility policy (Founder) |
| **CAMPAIGN** | Lightweight orchestration (objective, timing, grouping, merchandising, reporting) — **not** second money engine |
| **CUSTOMER** | Deals discovery + cart/checkout Offer messaging + coupon field |
| **MEASUREMENT** | Core sales/redemption metrics only |

### Challenge from repository evidence (prefer smaller if Founder agrees)

1. **Engine already covers** automatic + coupon + % / flat / BOGO + min spend + windows + scope +
   exclusive/combinable selection + snapshot + redemption claims.
2. **Largest product gaps** are customer merchandising (Deals/Offers UI), coupon field, progress
   messaging, Campaign ops concept, fulfilment-scoped rules, first-order eligibility, and Deal
   composition UX — not a greenfield promo engine.
3. **Admin UI lag:** BOGO / charge targets / stacking / windows / min-spend may be API-complete but
   commercially hard to operate — V1 may be “complete PromotionsEditor” before new domain nouns.
4. **Free delivery** already has a tariff-threshold path; inventing a parallel free-delivery promo
   without policy Fit risks double logic.
5. **Fulfilment-mode and scheduled eligibility** should wait for IMP-036I product lock where they
   touch promised time.
6. **Category targeting and daypart** are FOLLOW_UP, not required to prove Deal+Offer GTM value.

**Revised discovery bias:** V1 = *customer-visible Offers/Deals merchandising + coupon UX +
Campaign orchestration metadata + Founder stacking policy*, reusing IMP-016/036F money authority;
defer new Deal aggregate unless Fit proves Catalog bundle insufficient.

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

---

## 17. Founder decision register (discovery)

All statuses: `OPEN` / `DISCOVERY_RECOMMENDATION_ONLY`. No Founder approval recorded.

### ODC-01 — Deal vs Offer semantic boundary

- **Question:** Adopt Deal = purchasable merchandise proposition; Offer = conditional benefit?
- **Why it matters:** Vocabulary drives IA, admin model, and whether Deal is Catalog vs Promo.
- **Options:** (A) Adopt as stated (B) Collapse both into Promotion (C) Deal-only merchandising label
- **Recommended:** A
- **Trade-offs:** A clarifies customer language; risks inventing nouns without aggregates.
- **Dependencies:** ODC-03, architecture Fit
- **If deferred:** Ambiguous PRD language; duplicated concepts

### ODC-02 — Campaign first-class business concept?

- **Question:** Is Campaign a first-class ops object (orchestration) in V1?
- **Options:** (A) Yes, lightweight (B) Name-only grouping in admin (C) Defer entirely
- **Recommended:** A lightweight orchestration (no money authority)
- **Trade-offs:** Ops clarity vs build cost; IMP-036F warns against promo lifecycle invention
- **Dependencies:** ODC-13
- **If deferred:** Operators manage bare Promotions/Coupons only

### ODC-03 — Deal composition: fixed + customer-choice combos?

- **Question:** V1 Deals include fixed-price and choice-based combos?
- **Options:** (A) Both (B) Fixed only (C) Merchandising of existing products only
- **Recommended:** A, preferentially via Catalog bundle model
- **Trade-offs:** Choice UX cost; ADR-006 already points this direction
- **Dependencies:** Catalog/Menu readiness; Pricing for bundle price
- **If deferred:** Offers-only growth; weaker “meal” merchandising

### ODC-04 — Offer activation: automatic + Coupon?

- **Question:** Confirm both activation modes for V1?
- **Options:** (A) Both (B) Automatic only (C) Coupon only
- **Recommended:** A (matches CURRENT engine)
- **Trade-offs:** Coupon UI still missing
- **Dependencies:** Customer coupon field story
- **If deferred:** Leaves half of IMP-016 dark to customers

### ODC-05 — V1 benefit types

- **Question:** Which benefits are in V1?
- **Options:** subsets of % / flat / BOGO / free item / free delivery / fixed promo price
- **Recommended:** % , flat , BOGO , free delivery (clarify threshold vs promo); fixed promo price
  only if Deal price owned by Pricing; free item via BOGO unless extension justified
- **Trade-offs:** Over-scoping benefits delays merchandising value
- **Dependencies:** ODC-03, delivery policy Fit
- **If deferred:** Narrower growth toolkit

### ODC-06 — V1 customer eligibility / targeting

- **Question:** Include first-order and fulfilment-mode in V1?
- **Options:** (A) Windows+scope+basket+auth/limits only (B) + first-order (C) + fulfilment mode
  (D) B+C
- **Recommended:** A + first-order if high Founder priority; fulfilment-mode after IMP-036I clarity
- **Trade-offs:** Engine extension vs waiting
- **Dependencies:** IMP-036I for scheduled; identity for first-order
- **If deferred:** Weaker acquisition offers

### ODC-07 — Deal compatibility with Offers

- **Question:** Can Offers apply on carts containing Deals? Declarative matrix?
- **Options:** (A) Never (B) Delivery-only (C) Explicit per-Campaign/Deal flags (D) Full stack
- **Recommended:** C with default cautious (delivery-compatible)
- **Trade-offs:** Margin vs conversion
- **Dependencies:** ODC-08
- **If deferred:** Ambiguous checkout behaviour

### ODC-08 — Stacking model

- **Question:** Adopt “one primary merchandise/order + one delivery” for V1?
- **Options:** (A) That policy (B) Keep CURRENT exclusive/combinable engine as-is (C) Customer
  chooses
- **Recommended:** A as product policy **if** it can map cleanly onto existing engine without a
  second evaluator — else B until Fit proves mapping
- **Trade-offs:** Product simplicity vs engine rewrite risk
- **Dependencies:** Fit; ODC-09/10
- **If deferred:** Operators confused; margin leaks

### ODC-09 — Multiple automatic Offers / best-offer policy

- **Question:** Keep monetary best-total selection, or change?
- **Options:** A choose / B highest saving / C priority / D hybrid
- **Recommended:** B (aligns with CURRENT `select.ts`) unless Founder wants transparency UX (A)
- **Trade-offs:** Changing selection is R2 money behaviour
- **Dependencies:** Explainability requirements
- **If deferred:** Default remains CURRENT engine behaviour

### ODC-10 — Entered Coupon vs automatic Offer

- **Question:** Interaction policy when both present?
- **Options:** replace / stack / reject-if-worse / customer chooses
- **Recommended:** Customer-visible outcome consistent with engine selection; prefer **replace or
  choose** over silent stack for V1 clarity
- **Trade-offs:** vs CURRENT candidate model
- **Dependencies:** ODC-08/09; coupon UI
- **If deferred:** Surprising totals

### ODC-11 — Redemption / max-discount limits

- **Question:** Are coupon-level caps + % max discount enough for V1?
- **Options:** (A) Yes (B) Add promotion-level and campaign caps (C) Add per-day caps
- **Recommended:** A for V1; B as FOLLOW_UP
- **Trade-offs:** Abuse residual
- **Dependencies:** Payment redemption claims (exist)
- **If deferred:** OK short-term with monitoring

### ODC-12 — Unavailable Deal component behaviour

- **Question:** Confirm mandatory-unavailable → Deal unavailable; no silent substitute?
- **Options:** (A) Confirm ADR-006 alignment (B) Allow substitute with consent (C) Partial Deal
- **Recommended:** A
- **Trade-offs:** Fewer orderable Deals during stockouts
- **Dependencies:** Assortment/Availability
- **If deferred:** Risk of silent substitution regressions

### ODC-13 — V1 campaign measurement

- **Question:** Accept descriptive metrics only (no causal lift)?
- **Options:** (A) Descriptive only (B) Require experimentation
- **Recommended:** A
- **Trade-offs:** Weaker ROI narrative
- **Dependencies:** Event taxonomy Fit
- **If deferred:** Still need basic redemption counters

### ODC-14 — Physical merchandise future compatibility

- **Question:** Keep conceptual hook only (no V1 inventory)?
- **Options:** (A) Conceptual compatibility only (B) Scope merch fulfilment
- **Recommended:** A
- **Trade-offs:** None material for food GTM
- **Dependencies:** Future merch commerce
- **If deferred:** N/A — already deferred

---

## 18. Future Architecture Fit questions (questions only)

Do not answer Fit-owned questions here except by stating CURRENT verified behaviour.

1. Does Deal require new domain identity or compose existing Menu/Catalog bundle?
2. How does choice-based Deal pricing fit Pricing authority (bundle price vs promotion vs both)?
3. Can existing Promotion benefits represent all V1 Offer types Founder selects?
4. How should named free-delivery Offers relate to serviceability free-delivery thresholds?
5. How are automatic Offers selected/evaluated if product policy diverges from CURRENT
   `select.ts`?
6. Where do promotion-level and campaign-level redemption limits live if added?
7. How are global limits concurrency-safe beyond existing coupon claim rows?
8. How does Deal value / reference price remain truthful in Menu projection and snapshots?
9. How is stacking evaluated deterministically under a “one primary + delivery” product policy?
10. How is best-offer selection deterministic and explainable to customers?
11. How are Campaign and Promotion lifecycles related without inventing promo states?
12. Can Campaign remain orchestration rather than monetary authority?
13. How do scheduled Campaign dates interact with outlet timezone?
14. How does Scheduled Fulfilment (IMP-036I) affect Offer eligibility (order time vs promised time)?
15. How are analytics events recorded without becoming commercial truth?
16. How are existing Checkout Snapshots extended for Deal identity without losing immutability?
17. How does fulfilment-mode eligibility attach without forking the promotion evaluator?
18. How does first-order eligibility join customer order history safely and privately?
19. How should Admin commercial workspace evolve without breaking IMP-036F coherence?
20. How do Mix-and-match Deals price under ADR-007 calculation order?

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

Founder reviews discovery decisions **ODC-01…ODC-14** while IMP-036I continues independently.

Do **not** assign formal IMP identity. Do **not** activate another slice. Do **not** create Product
Definition. Do **not** perform Architecture Fit. Do **not** implement runtime behaviour.
