# Revenue Recommendations — Product Discovery

```text
STATUS: DISCOVERY_ONLY
AUTHORITY: NON_AUTHORITATIVE_PRODUCT_DISCOVERY
ROADMAP_IDENTITY: NONE
ACTIVATED: NO
PRODUCT_DEFINITION: NOT_CREATED
PRODUCT_DEFINITION_GATE: NOT_PERFORMED
ARCHITECTURE_FIT: NOT_PERFORMED
IMPLEMENTATION_AUTHORIZED: NO

FOUNDER_DISCOVERY_DIRECTION: APPROVED_FOR_DISCOVERY
FOUNDER_DISCOVERY_DIRECTION_RECORDED: 2026-09-26
FOUNDER_DISCOVERY_DECISIONS: RRD-01 through RRD-08 — APPROVED / RECORDED
FOUNDER_DISCOVERY_DECISIONS_RECORDED: 2026-09-26
RECORDED_AS: FOUNDER_APPROVED_DISCOVERY_DIRECTION
OPEN_FOUNDER_DISCOVERY_DECISIONS: 0
OPEN_ARCHITECTURE_QUESTIONS: see §22 — intentionally open
OPEN_DISCOVERY_QUESTIONS: founder questions resolved in §21; architecture questions remain in §22

WORKING_CAPABILITY_NAME: Revenue Recommendations
CANDIDATE_WORKING_LABEL: "IMP-036K" — CANDIDATE / WORKING LABEL / NOT GOVERNANCE IDENTITY

PROCESS_PHASES_IN_SCOPE: ANCHOR → DISCOVER → STORY_MAP
PROCESS_PHASES_EXPLICITLY_OUT: PRODUCT_DEFINITION_GATE | ARCHITECTURE_FIT | IMPLEMENTATION

PARALLEL_TO: IMP-036I — Scheduled Fulfilment
RUNTIME_SEMANTIC_DRIFT: NONE — documentation only
```

```text
FOUNDER_APPROVED_DISCOVERY_DIRECTION
  ≠
FORMAL_PRODUCT_DEFINITION_APPROVAL
  ≠
ROADMAP_IDENTITY / ACTIVATION / GATE / FIT / IMPLEMENTATION_AUTHORIZED
```

RRD-01 through RRD-08 are recorded as `FOUNDER_APPROVED_DISCOVERY_DIRECTION` only.
They are not Product Definition approval, Product Definition Gate approval, Architecture Fit,
an architecture lock, ROADMAP allocation, formal IMP identity, or implementation authorization.

Founder discovery completeness is not Product Definition completeness and is not architecture
readiness. `OPEN_FOUNDER_DISCOVERY_DECISIONS: 0` does not mean `OPEN_ARCHITECTURE_QUESTIONS: 0`.

`"IMP-036K"` is a **candidate / working label only**. It is not allocated, not activated,
not ROADMAP identity, and does not reserve sequence authority. Formal promotion may remap it.

This document is **isolated discovery**. Revenue Recommendations discovery does not amend
VISION, ROADMAP, STATE, ARCHITECTURE, decision-register, PRODUCT-DELIVERY, TESTING,
accepted Product Definitions, capability architectures, or active IMP-036I artifacts.

Companion story map:
[`revenue-recommendations-story-map.md`](./revenue-recommendations-story-map.md).

Separate parked discovery, left unchanged:
[`offers-deals-campaigns.md`](./offers-deals-campaigns.md).

---

## 0. Anchor provenance (read-only)

Verified against clean `origin/main` at the moment this discovery branch was created.
No earlier SHA was assumed, because IMP-036I work was merging in parallel.

| Authority | Version / position (VERIFIED from `origin/main`) |
|---|---|
| Repository | `nivedhya11/bobabear-platform` / local `/home/ajoshi/repos/boba-bear-platform` |
| Branch base | `main` @ `c71047a17630ccb35afe7d49b18a234ce9fc6039` |
| Tree | `cd06ddd4f87abfee15df25c07c052c2a5265f5f6` |
| VISION | VISION-1 |
| ROADMAP | GTM-R159 — `acceptedThrough=IMP-036H`, `currentProductSlice=IMP-036I`, `nextProductSlice=IMP-037`, `gtmBoundary=IMP-040` |
| STATE | STATE-R157 — same lifecycle position; `pendingAcceptance=NONE`; IMP-036I `IMPLEMENTATION_IN_PROGRESS` |
| ARCHITECTURE | ARCH-R23 |
| Decision register | DR-21 |
| Product delivery | PD-1 |
| Testing | TEST-1 |
| Active slice | IMP-036I — Scheduled Fulfilment (do not interfere) |
| Held slices | IMP-037 / IMP-038 holds are unchanged by this discovery |
| Precedent | `docs/platform/discovery/offers-deals-campaigns.md` (structural precedent only) |

Founder-decision persistence was applied on clean `origin/main`
`a57aa24a525e39832276e60f439c1417654cdfa4` (tree
`07679d5ee4b03c8cdd44c54c60baab23c8b5b30c`), the merged PR #282 Revenue Recommendations
discovery checkpoint. The table above remains the provenance of the original discovery branch.
This update does not amend ROADMAP or STATE.

Epistemic vocabulary: `VERIFIED` | `INFERRED` | `ASSUMED` | `UNVERIFIED` | `NOT_FOUND` | `CONFLICT`.

Current-state note (search of existing product wording, not a new authority):

- A Revenue Recommendations capability is **NOT_FOUND** on this base.
- IMP-028B menu discovery left a new ranking / recommendation authority **outside** that slice.
- ARCH-G20 (D-369): a positive-price modifier must not become purchase intent merely because it is marked default; **recommendation is not selection**; Cart remains purchase intent; Checkout Snapshot remains payable truth.
- Pricing, Promotion, assortment, availability, and fulfilment eligibility remain existing commerce authorities.
- `SignatureDrops` / `/#drops` is static marketing presentation, not BrandDrop commerce authority (**VERIFIED** in food-direct experience docs).
- Offers / Deals / Campaigns remains a **separate** non-authoritative discovery. It is not a dependency and is not activated by this document.

---

## 1. Relationship to Offers / Deals / Campaigns

Revenue Recommendations is a **separate capability** from
[`offers-deals-campaigns.md`](./offers-deals-campaigns.md).

```text
Offers / Deals / Campaigns
  = commercial incentive, merchandising, promotion / orchestration capability

Revenue Recommendations
  = contextual candidate selection, ranking, and presentation capability
```

Revenue Recommendations must **not** become:

- a Pricing authority
- a Promotion authority
- an Offer engine
- a Campaign engine
- a discount creator
- a second commerce eligibility authority

It may later **consume** existing product or commercial metadata only when that metadata is
supplied by its authoritative capability:

- Limited Drop
- Campaign membership
- existing Offer threshold information
- merchandising priority

No duplicated money engine. Threshold-completion copy that implies a discount, free item, or
free delivery is Offers / Promotions behaviour and is **not** created here.

RRD-01 through RRD-08 do not introduce a dependency or an activation between Revenue
Recommendations and Offers / Deals / Campaigns. Revenue Recommendations may later consume
authoritative metadata. It does not become a second Offer or Promotion engine.

---

## 2. Primary product outcome

Increase incremental contribution and average order value (AOV) at low-friction moments in the
ordering journey, while protecting conversion, customer trust, and existing commerce correctness.

Success priority:

1. Incremental contribution / gross profit
2. Incremental AOV
3. Recommendation attach rate
4. Conversion must not materially deteriorate

Do not optimize merely for recommendation clicks.

---

## 3. Working vocabulary (discovery only)

| Term | Discovery meaning |
|---|---|
| **Recommendation** | A ranked, eligible candidate presented in a named placement. Presentation is not purchase intent. |
| **Placement** | A journey surface that may render a recommendation set. |
| **Strategy** | Why a candidate was considered (complement, upsell, cart gap, commercial priority, limited drop, popular). |
| **Relationship** | An operator- or catalog-informed link (`COMPLEMENTS`, `UPSELLS_TO`, `PAIR_WITH`, `ADD_ON`, `ALTERNATIVE`) from a source product or category to a target. Not a generic `related_products` bucket. |
| **Eligibility** | Hard commerce filters applied **before** ranking. Existing assortment, availability, pricing, and fulfilment authorities remain the source of commerce truth. |
| **DIRECT_ADD** | Customer add that existing commerce rules already allow without further configuration. |
| **REQUIRES_CONFIGURATION** | Candidate opens or reuses the existing customization flow. |
| **Recommendation-assisted purchase** | V1 candidate definition in §17. View-through is not this definition. |

Do not design schema in this document. Architecture Fit owns persistence representation.

---

## 4. Placements

### V1_CANDIDATE

| Placement | Role |
|---|---|
| `PRODUCT_DETAIL` | Complementary products and truthful variant context while the customer is already configuring intent |
| `CUSTOMIZATION` | Variant and modifier upsells that reuse existing customization authority |
| `CART` | **Primary placement.** Complete-your-order and category-gap recommendations against current cart composition. Requires at least one cart line (RRD-06). |

### FOLLOW_UP / later

| Placement | Why later |
|---|---|
| `MENU_DISCOVERY` | Browse-ranking can change how customers find the assortment. Keep it out of the first candidate so Menu remains assortment discovery, not a recommendation authority. |
| `CHECKOUT` | **Not V1 by default.** Payment conversion must be protected. |
| `POST_PURCHASE` | After the order is sealed. Useful later; not required to prove ordering-journey attach. |

### V1 cardinality and default copy (RRD-02)

Maximum means an upper bound, not a quota. Showing 0, 1, 2, or any count below the maximum is
valid. Do not pad the set with weak or ineligible recommendations. Recommendations remain
secondary to the primary commerce journey.

| Placement | Maximum visible | Default heading | Composition |
|---|---|---|---|
| `PRODUCT_DETAIL` | 3 candidates | Goes great with this | — |
| `CUSTOMIZATION` | 3 recommendations total | Make it yours | maximum 1 variant upgrade and maximum 2 valid add-ons |
| `CART` | 4 candidates | Complete your order | at least one cart line required (RRD-06) |

Canonical record: §21 RRD-02 and RRD-06.

---

## 5. Strategies

### V1 candidate strategies

| Strategy | Discovery intent | Constraint |
|---|---|---|
| `COMPLEMENTARY` | Product that fits with the current product or cart | Eligible complementary relationship or category rule |
| `UPSELL` | Higher variant, or a valid paid option, on the current product | Reuse existing product / customization authority. Not a fake unrelated cross-sell. |
| `CART_GAP` | A missing category given what is already in the cart | First-class V1. See §8. |
| `COMMERCIAL_PRIORITY` | Operator merchandising priority among **already eligible** candidates | Priority never bypasses eligibility |
| `LIMITED_DROP` | Surface an eligible Limited Drop | Drop metadata comes from its own authority. A Drop is not a discount. |
| `POPULAR` | Conditional V1 strategy. Not a launch dependency. Customer-facing Popular uses the RRD-01 evidence rule only. | If evidence is insufficient, do not display "Popular"; use neutral copy. False Popular claims are NOT_SUPPORTED_BY_DESIGN. |

### Future / follow-up strategies (not V1)

| Strategy | Class |
|---|---|
| `FREQUENTLY_BOUGHT_TOGETHER` | FOLLOW_UP — forbidden as customer copy until real co-purchase semantics exist |
| `TRENDING` | FOLLOW_UP — forbidden as customer copy until a real trend definition exists |
| `PERSONALIZED` | FOLLOW_UP — forbidden as "Recommended for you" until real personalization exists |
| `REORDER` | FOLLOW_UP |
| `THRESHOLD_COMPLETION` | FOLLOW_UP — may consume Offer-threshold facts later; must not create the Offer |

---

## 6. Product boundaries

### May

- identify relevant eligible products, modifiers, and variants
- rank eligible candidates
- fill category gaps
- expose Limited Drops
- respect authorized merchandising priority
- surface variant and modifier upsells
- recommend complementary products
- measure recommendation performance

### Must not

- make unavailable products purchasable
- override assortment
- override pricing
- override availability
- override fulfilment eligibility
- create discounts
- create promotions
- silently mutate carts
- silently change variants
- preselect paid modifiers
- block checkout if recommendations fail

Existing commerce authorities remain authoritative. A recommendation never becomes the source
of commerce truth.

---

## 7. Recommendation eligibility

Candidate pipeline:

```text
context
  → candidate generation
  → hard eligibility filtering
  → deduplication
  → ranking
  → presentation
```

**Hard filtering precedes ranking.**

Candidate exclusion examples:

- inactive
- unavailable
- not in the effective assortment
- not purchasable for the current Outlet
- invalid for the current fulfilment context (Delivery / Pickup / Scheduled, when that context exists)
- exact duplicate where a duplicate makes no sense
- incompatible configuration
- expired or disabled merchandising relationship

Context inputs are owned by existing capabilities (selected Outlet, fulfilment mode, scheduled
context from IMP-036I once accepted, cart contents, product customization state). This discovery
does not redefine those authorities.

---

## 8. Candidate relationship model

Discovery vocabulary distinguishes:

| Relationship | Meaning in discovery |
|---|---|
| `COMPLEMENTS` | Fits alongside the source |
| `UPSELLS_TO` | A step up within the same product authority (variant or valid configuration) |
| `PAIR_WITH` | Intentionally paired items |
| `ADD_ON` | An add-on that existing customization or product rules allow |
| `ALTERNATIVE` | A substitute the customer may choose explicitly; never a silent swap |

Do not collapse these into generic `related_products`.

Support discovery consideration for:

- `PRODUCT → PRODUCT`
- `CATEGORY → CATEGORY`
- product-specific overrides

How a category rule resolves to concrete products is an Architecture Fit question. No schema here.

---

## 9. Cart intelligence

`CART_GAP` is a first-class V1 candidate behaviour. V1 uses **category presence / absence
only** (RRD-07). The engine should understand existing cart composition at that level.

V1 candidate examples:

| Cart composition | Eligible gap |
|---|---|
| Main + side, no beverage | Beverage recommendation |
| Beverage-only cart | Food recommendation |
| Main, no complementary side | Side recommendation |

V1 does not infer number of diners, group size, "too few drinks", quantity balancing,
per-person beverage need, or family or group composition. Quantity-aware group inference
remains **FOLLOW_UP**. Story RR-US-043 stays FOLLOW_UP.

V1 Cart recommendation placement requires at least one cart line (RRD-06). An empty cart does
not render Revenue Recommendations in the Cart placement. Existing empty-cart and
menu-discovery UX stays. Cart recommendations must not become a replacement Menu discovery
feed. `MENU_DISCOVERY` remains FOLLOW_UP.

---

## 10. Upsell boundary

Variant and modifier upsell must reuse existing product and customization authority
(IMP-028C and ARCH-G20 direction).

Examples:

- 350ml → 500ml
- single → double patty
- regular → cheese / loaded option
- a valid modifier add-on

A variant upgrade is **not** modeled as an unrelated cross-sell product merely to make
recommendations easier. There is no parallel customization engine.

Paid modifier preselection remains forbidden. Zero-price standard defaults stay governed by
existing customization rules, not by this capability.

---

## 11. Direct add

| Mode | Discovery rule |
|---|---|
| `DIRECT_ADD` | Only when existing commerce rules already permit that cart mutation without further choices |
| `REQUIRES_CONFIGURATION` | Opens or reuses the existing customization flow |

No new cart mutation authority. Recommendation add attempts reuse current Cart semantics and
revalidate at add time. Display of a candidate does not reserve stock, price, or eligibility.

---

## 12. Merchandising

V1 candidate operator needs, inside **existing** commercial / admin workforce responsibility
(`PERSONA-WORKFORCE-OPERATOR` commercial configuration; IMP-036F workspace is the evidence that
this persona already administers commercial configuration). This discovery does **not** invent a
recommendation-specific role, permission, or workforce identity.

An operator may need to:

- define a recommendation relationship
- set source product or category
- set target product or category
- set relationship type
- set relative priority
- set eligible placement(s)
- set active or disabled
- set an optional effective period
- apply a Limited Drop or other commercial boost **among eligible candidates**

Architecture Fit must determine whether existing commercial administration authority can be
reused. Commercial priority can affect ranking and can **never** bypass eligibility.

---

## 13. Ranking

V1 direction: **deterministic / rule-based**. No machine-learning requirement.

Candidate ranking may consider, only after hard eligibility:

- relevance
- missing-category value
- commercial priority
- Limited Drop status
- popularity **when evidence exists**
- price-context fit
- contribution / margin signal

Exact scoring weights are **not** product semantics and must not be persisted as such.

Desired business optimization direction:

```text
expected incremental contribution ≈ purchase likelihood × contribution margin
```

Relevance and eligibility remain constraints. Margin awareness is a ranking direction. It does
not grant this capability money authority, cost authority, or the right to show ineligible items
because they are more profitable.

How margin or contribution is safely projected, without leaking a second pricing or cost
authority into the customer journey, is Architecture Fit.

---

## 14. Explicit non-goals (no ML / data-science platform in V1)

These are not V1. They may be future Fit or product work only:

- machine-learning ranking
- collaborative filtering
- LLM recommendations
- embeddings
- vector database
- external recommendation SaaS
- feature store
- multi-armed bandits
- psychographic customer profiling
- cross-session personalization

A large experimentation platform is not required in V1. Control / holdout measurement should be
**DESIGN_READY** (see §18) without building that platform.

---

## 15. Customer trust

Discovery constraints:

- never silently add recommended products
- no paid add-on preselection
- recommendations never block checkout
- no fake urgency
- no false personalization claims
- no false "frequently bought together"
- no false "trending"
- no dark patterns

Customer-facing wording must be truthful.

Default placement headings (RRD-02):

- Product detail: Goes great with this
- Customization: Make it yours
- Cart: Complete your order

Other truthful candidate copy, where the underlying fact is true:

- Try the latest Drop
- Limited Drop
- You might also like (neutral copy; not a Popular claim)

When an eligible candidate is both `LIMITED_DROP` and `COMMERCIAL_PRIORITY`, customer-facing
semantics use `LIMITED_DROP` (RRD-05). Commercial priority stays internal ranking metadata and
is never a customer-facing reason. Do not show "Commercial Priority", "High Margin",
"Promoted because we want to sell this", or an equivalent internal merchandising rationale.
Commercial priority may affect ordering only inside the already-eligible set.

Claims that require actual supporting data or semantics before use:

- Frequently bought together
- Recommended for you
- Trending
- Popular (conditional V1 only under RRD-01; otherwise use neutral copy and do not display "Popular")

### Removal suppression (RRD-03)

When the customer adds an item through a recommendation and later removes that cart line,
suppress that exact recommendation candidate from recommendation placements for the remainder
of the active cart or session.

Suppression does not make the item unavailable, does not prevent manual Menu or Product
discovery, does not prevent a manual add, and does not modify assortment or catalog truth.
A new cart or session may recommend it again.

Session-storage representation is not defined here. It remains an Architecture Fit question.

---

## 16. Failure model

Recommendations are commerce enhancement only.

If recommendation generation or ranking fails:

- primary Menu, Product, Cart, and Checkout remain usable
- the recommendation module may disappear or fall back
- ordering continues

Fail-open for **commerce**. A failed recommendation is not a failed order.

Record as a **candidate** architecture-fit invariant (not a lock):

```text
CANDIDATE_ARCHITECTURE_FIT_INVARIANT:
  recommendation failure must not block Menu, Product, Cart, or Checkout
```

A candidate that becomes ineligible between display and add is excluded or rejected by existing
cart validation. That rejection explains the item. It does not take down checkout.

---

## 17. Analytics and attribution

Analytics is **mandatory V1 candidate scope**. Do not prescribe analytics persistence
architecture here.

### Discovery event vocabulary

| Event | Meaning |
|---|---|
| `RECOMMENDATION_SET_RENDERED` | A set was produced for a placement |
| `RECOMMENDATION_IMPRESSION` | A specific candidate was shown |
| `RECOMMENDATION_CLICKED` | The customer activated a candidate |
| `RECOMMENDATION_ADD_ATTEMPTED` | An add was attempted from the recommendation |
| `RECOMMENDATION_ADDED` | The add succeeded through existing cart rules |
| `RECOMMENDATION_REMOVED` | The customer removed a previously recommended line |
| `RECOMMENDED_ITEM_PURCHASED` | The recommendation-assisted item is on the purchased Order |

### Candidate event context

- `recommendationSetId`
- `placement`
- `strategy`
- `itemId`
- `rank`
- cart / session correlation
- timestamp
- eventual Order correlation

### V1 recommendation-assisted purchase

A purchased item is recommendation-assisted when all of the following are true:

1. the recommendation was presented
2. the customer used the recommendation add action
3. that recommended item survives into the purchased Order

**View-through attribution is FOLLOW_UP.** Seeing a recommendation without using the add action
is not V1 assisted revenue.

### Attribution continuity after edits (RRD-08)

Recommendation-assisted attribution survives:

- quantity changes
- valid modifier or customization changes

when the same underlying recommended product / cart-line identity remains.

Attribution does not survive:

- the customer removes the recommended line and later manually adds the item
- replacement with a different product
- manual recreation that is not initiated from a recommendation action

If the customer later re-adds the product using a recommendation action, that creates a new
recommendation-assisted lineage.

Do not prescribe an analytics storage schema. Architecture Fit owns technical correlation
mechanics. Examples in the companion story map follow this continuity rule.

---

## 18. Metrics

### Business

- Recommendation attach rate
- Incremental AOV
- Incremental contribution
- Recommendation-assisted revenue

### Guardrails

- Checkout conversion
- Cart abandonment
- Recommendation removal rate
- Payment completion
- Time-to-checkout

### Diagnostics

- Impressions
- CTR
- Add rate
- Purchase-through rate
- Rank performance
- Placement performance
- Strategy performance

Control / holdout measurement should be DESIGN_READY so incremental contribution is not confused
with customers who would have bought the item anyway. A large experimentation platform is not a
V1 requirement.

V1 direction (RRD-04): design-ready for a **10% session-level recommendation holdout**.
Assignment is stable for the active ordering session or cart, approximately 10% holdout, and
the remaining sessions may receive recommendations. Holdout customers see no recommendation
modules and receive no special customer-facing message. Holdout changes recommendation
presentation only. It must not change catalog or menu eligibility, product availability, prices,
offers, promotions, fulfilment, cart behavior, checkout, payment, or customer entitlements.

The experiment assignment mechanism remains `ARCHITECTURE_FIT_REQUIRED`. RR-US-320 stays
design-ready with that mechanism unresolved. RR-US-321 records the customer-visible holdout
direction as `V1_CANDIDATE / FOUNDER_DIRECTION_RESOLVED`.

---

## 19. Founder discovery direction (already agreed — not a gate)

Recorded only as discovery direction on **2026-09-26**. This list does **not** approve a Product
Definition, allocate ROADMAP identity, lock architecture, or authorize implementation.

Approved working direction:

- Revenue Recommendations as the capability name
- revenue / AOV / contribution objective, in the priority in §2
- deterministic V1 rather than ML
- product detail, customization, and cart as V1 candidate placements
- cart as the primary surface
- server-authoritative eligibility
- existing commerce truth reused
- no silent add
- no checkout blocking
- no recommendation-created discount
- margin-aware ranking direction
- Limited Drop strategy
- merchandising controls
- mandatory analytics
- no false personalization, frequently-bought-together, or trending claims

The eight founder questions that remained after that direction are recorded in §21 as RRD-01
through RRD-08 (`FOUNDER_APPROVED_DISCOVERY_DIRECTION`). `OPEN_FOUNDER_DISCOVERY_DECISIONS: 0`.
Architecture Fit questions in §22 stay open. This completeness is not Product Definition
completeness and is not architecture readiness.

---

## 20. Relationship to the active program

- **IMP-036I remains the active Product slice** (Scheduled Fulfilment, `IMPLEMENTATION_IN_PROGRESS`).
- This discovery does not change `acceptedThrough` (`IMP-036H`).
- IMP-037 / IMP-038 holds are not changed.
- Public GTM boundary (`IMP-040`) is not changed.
- Offers / Deals / Campaigns discovery remains independently parked.
- No candidate discovery label, including `"IMP-036K"`, changes formal sequencing.
- `RUNTIME_SEMANTIC_DRIFT: NONE` — documentation only.

---

## 21. Founder discovery decisions

```text
FOUNDER_DISCOVERY_DECISIONS: RRD-01 through RRD-08
STATUS_OF_DECISIONS: APPROVED / RECORDED
RECORDED_AS: FOUNDER_APPROVED_DISCOVERY_DIRECTION
RECORDED: 2026-09-26
OPEN_FOUNDER_DISCOVERY_DECISIONS: 0
```

Founder approved all eight discovery decisions. They replace the eight open founder/product
questions previously listed here. They constrain future Architecture Fit. They do not answer
it. Architecture questions remain in §22.

These decisions are not Product Definition approval, Product Definition Gate approval,
Architecture Fit, an architecture lock, ROADMAP allocation, formal IMP identity, or
implementation authorization.

### RRD-01 — POPULAR evidence and claim threshold

`POPULAR` remains a conditional V1 strategy. `POPULAR` is not a launch dependency.

Customer-facing popularity evaluation uses:

- trailing 30 days
- successfully purchased BOBA Bear direct Orders
- selected Outlet scope

Minimum evidence: at least 30 purchased Orders in the relevant Outlet scope.

When sufficient evidence exists, only the top 3 eligible products by purchased unit count
within the relevant category may receive Popular treatment.

If evidence is insufficient:

- do not display "Popular"
- use neutral recommendation copy instead
- the recommendation capability may otherwise continue normally

Do not define database query or schema mechanics here. Architecture Fit owns implementation
mechanics.

Story map: RR-US-302 is `V1_CANDIDATE / FOUNDER_DIRECTION_RESOLVED`. False Popular claims
remain `NOT_SUPPORTED_BY_DESIGN`.

### RRD-02 — V1 recommendation cardinality and default copy

| Placement | Maximum visible | Default heading | Normal composition |
|---|---|---|---|
| `PRODUCT_DETAIL` | 3 candidates | Goes great with this | — |
| `CUSTOMIZATION` | 3 recommendations total | Make it yours | maximum 1 variant upgrade; maximum 2 valid add-ons |
| `CART` | 4 candidates | Complete your order | — |

Maximum means an upper bound, not a quota. Showing 0, 1, 2, or fewer than the maximum is
valid. Do not require padding with weak or ineligible recommendations. Recommendations remain
secondary to the primary commerce journey.

### RRD-03 — customer removal suppression

When the customer adds an item through a recommendation and subsequently removes that cart
line, suppress that exact recommendation candidate from recommendation placements for the
remainder of the active cart or session.

This suppression:

- does not make the item unavailable
- does not prevent manual Menu or Product discovery
- does not prevent a manual add
- does not modify assortment or catalog truth

A new cart or session may recommend it again.

Do not define persistence or session-storage architecture here.

Story map: RR-US-113 is `V1_CANDIDATE / FOUNDER_DIRECTION_RESOLVED`.

### RRD-04 — V1 incrementality measurement direction

V1 must be `DESIGN_READY` for a 10% session-level recommendation holdout.

Assignment direction:

- stable for the active ordering session or cart
- approximately 10% holdout
- remaining sessions may receive recommendations

Holdout customers simply see no recommendation modules. They receive no special
customer-facing message.

Holdout must not change:

- catalog or menu eligibility
- product availability
- prices
- offers
- promotions
- fulfilment
- cart behavior
- checkout
- payment
- customer entitlements

Holdout affects recommendation presentation only.

The experiment assignment mechanism remains `ARCHITECTURE_FIT_REQUIRED`.

Story map: RR-US-321 is `V1_CANDIDATE / FOUNDER_DIRECTION_RESOLVED`. RR-US-320 remains
design-ready, with its implementation mechanism unresolved for Architecture Fit.

### RRD-05 — customer-visible label collision rule

When an eligible candidate is both `LIMITED_DROP` and `COMMERCIAL_PRIORITY`, customer-facing
semantics use `LIMITED_DROP`.

Commercial priority:

- remains internal ranking metadata
- is never shown as a customer-facing reason or copy

Customer-facing candidate copy may use "Limited Drop" or "Try the latest Drop" where truthful.

Do not show:

- "Commercial Priority"
- "High Margin"
- "Promoted because we want to sell this"
- or an equivalent internal merchandising rationale

Commercial priority may affect ordering only inside the already-eligible set.

### RRD-06 — empty-cart behavior

V1 Cart recommendation placement requires at least one cart line.

For an empty cart, do not render Revenue Recommendations in the Cart placement.

Preserve the existing empty-cart and menu-discovery UX.

Revenue Recommendations must not turn V1 Cart recommendations into a replacement Menu
discovery feed. `MENU_DISCOVERY` remains `FOLLOW_UP`.

### RRD-07 — V1 cart-gap scope

V1 `CART_GAP` uses category presence or absence only.

Candidate examples:

- main + side + no beverage → eligible beverage recommendation
- beverage-only cart → eligible food recommendation
- main + no complementary side → eligible side recommendation

V1 explicitly does not infer:

- number of diners
- group size
- "too few drinks"
- quantity balancing
- per-person beverage need
- family or group composition

Quantity-aware group inference remains `FOLLOW_UP`. RR-US-043 stays `FOLLOW_UP`.

### RRD-08 — recommendation-assisted attribution continuity

Recommendation-assisted attribution survives quantity changes and valid modifier or
customization changes when the same underlying recommended product or cart-line identity
remains.

Attribution does not survive:

- the customer removes the recommended line and later manually adds the item
- replacement with a different product
- manual recreation that is not initiated from a recommendation action

If the customer later re-adds the product using a recommendation action, that creates a new
recommendation-assisted lineage.

Do not prescribe an analytics storage schema. Architecture Fit owns technical correlation
mechanics. Discovery analytics examples follow this rule.

### What remains open

```text
OPEN_FOUNDER_DISCOVERY_DECISIONS: 0
OPEN_ARCHITECTURE_QUESTIONS: NOT ZERO — see §22
PRODUCT_DEFINITION: NOT_CREATED
ARCHITECTURE_FIT: NOT_PERFORMED
```

---

## 22. Architecture Fit questions

Mark: **ARCHITECTURE_FIT_REQUIRED**. Do not treat any answer below as locked architecture.
This section enumerates questions only.

Founder decisions RRD-01 through RRD-08 constrain future Architecture Fit. They do not answer
it. `OPEN_FOUNDER_DISCOVERY_DECISIONS: 0` does not close this section.

1. Do recommendations need a durable Recommendation aggregate?
2. Are relationships catalog metadata, a separate domain, or merchandising configuration?
3. How should category-level rules resolve to products?
4. Where does ranking execute?
5. What latency and failure boundary protects primary commerce?
6. What existing permissions can administer recommendations?
7. How is margin / contribution information safely projected without leaking money authority?
8. How are impression and attribution events persisted?
9. How are recommendation experiments assigned? The 10% session-level holdout policy is recorded in RRD-04. The assignment mechanism remains open.
10. How does cart mutation reuse existing APIs?
11. How does selected Outlet / Delivery / Pickup / Scheduled context feed eligibility?
12. How would future Campaign or Offer metadata become a ranking signal without coupling domains?
13. How is the Founder-directed `POPULAR` evidence rule (RRD-01) computed and applied, and what future evidence mechanics apply before frequently-bought-together or personalized claims? The product threshold direction is recorded. Query, storage, and ranking mechanics remain Architecture Fit.
14. What concurrency and revalidation is required between recommendation display and add?
15. Does V1 require any new schema at all?
16. How is customer removal suppression (RRD-03) represented for the active cart or session?

---

## 23. Safety with parallel work

- Create only `docs/platform/discovery/revenue-recommendations.md` and
  `docs/platform/discovery/revenue-recommendations-story-map.md`.
- Do not modify ROADMAP, STATE, ARCHITECTURE, decision-register, PRODUCT-DELIVERY, TESTING,
  IMP-036I artifacts, Offers discovery files, runtime, schema, migrations, tests, CI, or
  `package.json`.
- If repository mechanics require editing another file, stop.
- If `main` moves under IMP-036I work, incorporate `main` only when the diff remains these two
  new paths. On a governance or path conflict, stop.
- Founder-decision persistence (RRD-01 through RRD-08) updates only these two existing discovery
  files. It does not activate the capability and does not change any other path.

---

## 24. Recommended next action

```text
STATUS = DISCOVERY_ONLY
ROADMAP_IDENTITY = NONE
ACTIVATED = NO
PRODUCT_DEFINITION = NOT_CREATED
PRODUCT_DEFINITION_GATE = NOT_PERFORMED
ARCHITECTURE_FIT = NOT_PERFORMED
IMPLEMENTATION_AUTHORIZED = NO
CANDIDATE_WORKING_LABEL = "IMP-036K" — NOT GOVERNANCE IDENTITY

FOUNDER_DISCOVERY_DECISIONS = RRD-01 through RRD-08 APPROVED / RECORDED
OPEN_FOUNDER_DISCOVERY_DECISIONS = 0
OPEN_ARCHITECTURE_QUESTIONS = remain intentionally open (§22)

Revenue Recommendations discovery is Founder-decision complete.
Keep it parked until formal Product Definition / program sequencing is authorized.

Do NOT assign formal IMP identity.
Do NOT activate the capability.
Do NOT create a Product Definition.
Do NOT perform Product Definition Gate.
Do NOT perform Architecture Fit.
Do NOT implement.
```
