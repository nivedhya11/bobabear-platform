# Revenue Recommendations — Story Map (Discovery)

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

WORKING_CAPABILITY_NAME: Revenue Recommendations
CANDIDATE_WORKING_LABEL: "IMP-036K" — CANDIDATE / WORKING LABEL / NOT GOVERNANCE IDENTITY

"IMP-036K" is not allocated, not activated, not ROADMAP identity, and does not reserve
sequence authority. It may be remapped during formal roadmap promotion.

STORY_IDS: RR-BO-* and RR-US-* are discovery-only and may be remapped later
AC_IDS: NOT CREATED (no AC-IMP-* )
ACCEPTANCE_EXAMPLES: labelled DISCOVERY_ACCEPTANCE_EXAMPLE only

PROCESS_PHASES_IN_SCOPE: ANCHOR → DISCOVER → STORY_MAP
PROCESS_PHASES_EXPLICITLY_OUT: PRODUCT_DEFINITION_GATE | ARCHITECTURE_FIT | IMPLEMENTATION
PARALLEL_TO: IMP-036I — Scheduled Fulfilment
RUNTIME_SEMANTIC_DRIFT: NONE — documentation only
Companion discovery: revenue-recommendations.md
```

```text
FOUNDER_APPROVED_DISCOVERY_DIRECTION ≠ FORMAL_PRODUCT_DEFINITION_APPROVAL
```

This story map does not amend VISION, ROADMAP, STATE, ARCHITECTURE, decision-register,
PRODUCT-DELIVERY, TESTING, accepted Product Definitions, capability architectures, or active
IMP-036I artifacts. Offers / Deals / Campaigns discovery remains a separate parked document.

Hierarchy:

```text
BUSINESS OUTCOME → PERSONA → JOURNEY → ACTIVITY → CANDIDATE STORY
```

Classifications:

`V1_CANDIDATE` | `FOLLOW_UP` | `DEFERRED` | `NOT_SUPPORTED_BY_DESIGN` | `UNRESOLVED_DECISION_REQUIRED`

Personas reused from [`docs/platform/product/personas.md`](../product/personas.md) only:

- `PERSONA-CUSTOMER` — Customer
- `PERSONA-WORKFORCE-OPERATOR` in the existing commercial / admin configuration context
  (IMP-036F commercial workspace is the grounded job evidence)

No recommendation-specific role, permission, or persona is invented. A persona grants no access.

---

## 1. Business outcomes (candidate)

| ID | Outcome | Priority note |
|---|---|---|
| RR-BO-01 | Increase incremental contribution / gross profit from recommendation-assisted adds | Success priority 1 |
| RR-BO-02 | Increase incremental AOV | Success priority 2 |
| RR-BO-03 | Recommendation attach rate (add from a shown recommendation that can survive to purchase) | Success priority 3. Not click optimization. |
| RR-BO-04 | Conversion, cart completion, and payment completion do not materially deteriorate | Guardrail. Wins over click or attach theatrics. |
| RR-BO-05 | Customer trust: truthful copy, explicit add, no dark patterns | Constraint on every journey |
| RR-BO-06 | Operators can define and enable or disable relationships with existing commercial administration | No new workforce role |
| RR-BO-07 | Recommendation performance is measurable, including V1 assisted-purchase attribution | Analytics is mandatory candidate scope |

---

## 2. Customer journeys

### Journey A — Product complementary recommendation

**Outcome:** RR-BO-01 / RR-BO-02 · **Persona:** Customer · **Placement:** `PRODUCT_DETAIL` · **Strategy:** `COMPLEMENTARY`

| Activity | Story ID | Story | Class |
|---|---|---|---|
| See complements | RR-US-001 | As a customer on a product, I can see eligible complementary products that go with this item. | V1_CANDIDATE |
| Truthful copy | RR-US-002 | As a customer, complementary copy says something like "Goes great with this" and does not claim frequently-bought-together. | V1_CANDIDATE |
| Skip | RR-US-003 | As a customer, I can ignore complements and continue with the current product. | V1_CANDIDATE |

**DISCOVERY_ACCEPTANCE_EXAMPLE (A):** On an eligible product, the customer sees one complementary item that is purchasable for the current outlet, and can leave without adding it.

---

### Journey B — Variant / product upsell

**Outcome:** RR-BO-02 · **Persona:** Customer · **Placement:** `CUSTOMIZATION` or product · **Strategy:** `UPSELL`

| Activity | Story ID | Story | Class |
|---|---|---|---|
| See variant step-up | RR-US-010 | As a customer, I can see an eligible variant upgrade (for example 350ml to 500ml, or single to double) expressed through the existing product. | V1_CANDIDATE |
| Explicit choice | RR-US-011 | As a customer, the upgrade changes my selection only after I choose it. | V1_CANDIDATE |
| Not a fake cross-sell | RR-US-012 | As a customer, a variant upgrade is not presented as an unrelated second product. | V1_CANDIDATE |

**Depends on:** existing product / customization authority. No parallel customization engine.

---

### Journey C — Modifier upsell

**Outcome:** RR-BO-02 · **Persona:** Customer · **Placement:** `CUSTOMIZATION` · **Strategy:** `UPSELL` or `ADD_ON`

| Activity | Story ID | Story | Class |
|---|---|---|---|
| See valid add-on | RR-US-020 | As a customer, I can see a valid modifier add-on (for example cheese or loaded) that existing customization allows. | V1_CANDIDATE |
| No paid preselect | RR-US-021 | As a customer, a paid modifier is not preselected by the recommendation. | NOT_SUPPORTED_BY_DESIGN to violate |
| Reuse flow | RR-US-022 | As a customer, choosing the add-on uses the existing customization interaction. | V1_CANDIDATE |

**DISCOVERY_ACCEPTANCE_EXAMPLE (C):** A paid modifier suggestion is visible and unselected until the customer chooses it. ARCH-G20 remains the customization constraint.

---

### Journey D — Cart "Complete your order"

**Outcome:** RR-BO-01 / RR-BO-03 · **Persona:** Customer · **Placement:** `CART` (primary) · **Strategy:** `CART_GAP` or `COMPLEMENTARY`

| Activity | Story ID | Story | Class |
|---|---|---|---|
| See completion set | RR-US-030 | As a customer with items in cart, I can see a "Complete your order" set of eligible suggestions. | V1_CANDIDATE |
| Continue without them | RR-US-031 | As a customer, I can proceed toward checkout without accepting any suggestion. | V1_CANDIDATE |
| Checkout not blocked | RR-US-032 | As a customer, missing or failed suggestions never block checkout. | V1_CANDIDATE |

**DISCOVERY_ACCEPTANCE_EXAMPLE (D):** Cart shows a completion suggestion. Checkout stays available if the customer adds nothing.

---

### Journey E — Cart category-gap recommendation

**Outcome:** RR-BO-01 · **Persona:** Customer · **Placement:** `CART` · **Strategy:** `CART_GAP`

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Burger + fries, no drink | RR-US-040 | As a customer with a main and a side and no beverage, I can see an eligible beverage suggestion. | V1_CANDIDATE |
| Boba only | RR-US-041 | As a customer with only a drink, I can see an eligible food attach suggestion. | V1_CANDIDATE |
| Composition-aware | RR-US-042 | As a customer, suggestions account for categories already in the cart and do not push an exact duplicate that adds nothing. | V1_CANDIDATE |
| Quantity-aware groups | RR-US-043 | As a customer with several mains and too few drinks, the platform infers group quantity and sizes the beverage suggestion. | FOLLOW_UP |

Advanced quantity inference is not first-release mandatory behaviour.

---

### Journey F — Limited Drop recommendation

**Outcome:** RR-BO-01 / RR-BO-05 · **Persona:** Customer · **Strategy:** `LIMITED_DROP`

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Surface an eligible Drop | RR-US-050 | As a customer, I can see an eligible Limited Drop in an allowed placement, with copy such as "Try the latest Drop". | V1_CANDIDATE |
| Ineligible Drop hidden | RR-US-051 | As a customer, a Drop outside my outlet, assortment, or fulfilment context is not offered as if I could buy it. | V1_CANDIDATE |
| Drop is not a discount | RR-US-052 | As a customer, a Drop recommendation does not invent a price cut or promotion. | NOT_SUPPORTED_BY_DESIGN to violate |

Drop facts, if used, come from the Drop's own authority. Static `/#drops` marketing is not that authority.

---

### Journey G — Commercial-priority recommendation

**Outcome:** RR-BO-06 · **Persona:** Customer (effect) · **Strategy:** `COMMERCIAL_PRIORITY`

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Priority among eligible items | RR-US-060 | As a customer, when several items are eligible, merchandising priority can change their order. | V1_CANDIDATE |
| No eligibility bypass | RR-US-061 | As a customer, a high-priority item that is inactive, unavailable, or out of assortment is not shown as purchasable. | NOT_SUPPORTED_BY_DESIGN to violate |

---

### Journey H — Direct-add recommendation

**Outcome:** RR-BO-03 · **Persona:** Customer · **Mode:** `DIRECT_ADD`

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Direct add when allowed | RR-US-070 | As a customer, I can add a recommendation in one action only when existing commerce rules already allow that mutation. | V1_CANDIDATE |
| Explicit action | RR-US-071 | As a customer, nothing is added until I use the add action. | NOT_SUPPORTED_BY_DESIGN to violate |
| Revalidation | RR-US-072 | As a customer, the add is revalidated by existing cart rules at click time. | V1_CANDIDATE |

**DISCOVERY_ACCEPTANCE_EXAMPLE (H):** A directly addable eligible item appears in cart only after the customer chooses Add, and the line uses ordinary cart semantics.

---

### Journey I — Recommendation requiring customization

**Outcome:** RR-BO-03 · **Persona:** Customer · **Mode:** `REQUIRES_CONFIGURATION`

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Open existing flow | RR-US-080 | As a customer, a recommendation that needs choices opens or reuses the existing customization flow. | V1_CANDIDATE |
| No implied configuration | RR-US-081 | As a customer, required choices are not silently filled, and paid modifiers are not preselected. | V1_CANDIDATE |
| Add after valid configuration | RR-US-082 | As a customer, I add only after the existing flow accepts the configuration. | V1_CANDIDATE |

---

### Journey J — Candidate becomes unavailable

**Outcome:** RR-BO-04 / RR-BO-05 · **Persona:** Customer

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Drop from set | RR-US-090 | As a customer, a candidate that becomes inactive, unavailable, or outside assortment disappears from new recommendation sets. | V1_CANDIDATE |
| Add rejected | RR-US-091 | As a customer, if I try to add a candidate that is no longer purchasable, existing cart validation rejects it with a recoverable explanation. | V1_CANDIDATE |
| Ordering continues | RR-US-092 | As a customer, that rejection does not block the rest of cart or checkout. | V1_CANDIDATE |

---

### Journey K — Recommendation system unavailable or fails

**Outcome:** RR-BO-04 · **Persona:** Customer

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Fail open | RR-US-100 | As a customer, if recommendation generation or ranking fails, the recommendation module disappears or falls back. | V1_CANDIDATE |
| Primary journey intact | RR-US-101 | As a customer, Menu, Product, Cart, and Checkout remain usable. | V1_CANDIDATE |
| No checkout block | RR-US-102 | As a customer, I am never prevented from paying because recommendations failed. | NOT_SUPPORTED_BY_DESIGN to violate |

**DISCOVERY_ACCEPTANCE_EXAMPLE (K):** With recommendations forced unavailable, the customer can still review cart and continue to checkout.

Candidate architecture-fit invariant only: recommendation failure must not block primary commerce.

---

### Journey L — Customer removes a recommended item

**Outcome:** RR-BO-04 / RR-BO-07 · **Persona:** Customer

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Remove line | RR-US-110 | As a customer, I can remove a line I added from a recommendation using ordinary cart removal. | V1_CANDIDATE |
| Totals follow cart | RR-US-111 | As a customer, removal updates cart through existing cart rules. | V1_CANDIDATE |
| Removal measured | RR-US-112 | As a customer action, removal can emit `RECOMMENDATION_REMOVED`. | V1_CANDIDATE |
| Session suppression | RR-US-113 | As a customer, removing an item hides that same recommendation for the rest of the session. | UNRESOLVED_DECISION_REQUIRED |

---

### Journey M — Recommendation analytics and attribution

**Outcome:** RR-BO-07 · **Persona:** Customer action, measured for the business

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Render and impression | RR-US-120 | When a set renders, the platform can record set render and per-item impression with placement, strategy, rank, and correlation ids. | V1_CANDIDATE |
| Click and add | RR-US-121 | Click, add attempt, and successful add are distinguishable events. | V1_CANDIDATE |
| Assisted purchase | RR-US-122 | A purchased item counts as recommendation-assisted only when it was presented, added through the recommendation action, and survives onto the purchased Order. | V1_CANDIDATE |
| View-through | RR-US-123 | A purchase counts as assisted merely because the item was seen. | FOLLOW_UP |
| Persistence design | RR-US-124 | Analytics storage shape is specified as product semantics in discovery. | ARCHITECTURE_FIT_REQUIRED — not a story commitment |

**DISCOVERY_ACCEPTANCE_EXAMPLE (M):** Customer adds from cart recommendations and completes purchase with that line still present. The item is recommendation-assisted. A different item they noticed but added from Menu is not, in V1.

---

### Journey Q — Fulfilment-context-aware eligibility

**Outcome:** RR-BO-04 · **Persona:** Customer

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Outlet and mode | RR-US-130 | As a customer, I am not recommended items that are not purchasable for my current Outlet or fulfilment context (Delivery, Pickup, or Scheduled when that context applies). | V1_CANDIDATE |
| Context change | RR-US-131 | As a customer, if I change outlet or fulfilment context, the next recommendation set is re-filtered. Already-added cart lines remain subject to existing cart and checkout revalidation, not to a new recommendation authority. | V1_CANDIDATE |

Scheduled context participates only through IMP-036I's own eligibility once that slice defines it. This discovery does not change IMP-036I.

---

### Journey R — Future Offers / Deals / Campaigns metadata

**Outcome:** RR-BO-01 · **Persona:** Customer

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Consume supplied metadata | RR-US-140 | As a customer, ranking may later consider Limited Drop, Campaign membership, or Offer-threshold facts when those capabilities supply them. | FOLLOW_UP |
| No second engine | RR-US-141 | As a customer, recommendations do not create discounts, coupons, deals, or campaigns. | NOT_SUPPORTED_BY_DESIGN to violate |
| Threshold completion | RR-US-142 | As a customer, I see "add ₹X more to unlock …" created by this capability. | FOLLOW_UP and owned by Offers if it promises a commercial benefit. See Journey T. |

Offers / Deals / Campaigns discovery stays independently parked. No dependency is activated.

---

### Journey S — Future behavioural recommendations

**Outcome:** RR-BO-05 · **Persona:** Customer

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Frequently bought together | RR-US-150 | Customer-facing frequently-bought-together. | FOLLOW_UP until real co-purchase semantics exist; false claim is NOT_SUPPORTED_BY_DESIGN |
| Trending | RR-US-151 | Customer-facing trending. | FOLLOW_UP until a real trend definition exists; false claim is NOT_SUPPORTED_BY_DESIGN |
| Personalized / reorder | RR-US-152 | "Recommended for you" or reorder suggestions. | FOLLOW_UP |
| ML platform | RR-US-153 | Machine-learning ranking, collaborative filtering, LLM recommendations, embeddings, vector search, external recommendation SaaS, feature store, bandits, psychographic profiling, or cross-session personalization. | DEFERRED |

---

### Journey T — Future threshold-completion recommendation

**Outcome:** RR-BO-01 · **Persona:** Customer · **Strategy:** `THRESHOLD_COMPLETION`

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Suggest items toward a real threshold | RR-US-160 | As a customer, I might later see eligible items that help reach a threshold an Offer authority already computed. | FOLLOW_UP |
| Recommendation invents the offer | RR-US-161 | As a customer, the recommendation capability creates or prices the threshold benefit. | NOT_SUPPORTED_BY_DESIGN |

---

### Later placements (not journeys above, still required scope)

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Menu discovery ranking | RR-US-170 | As a customer, Menu browse order is driven by this capability. | FOLLOW_UP (`MENU_DISCOVERY`) |
| Checkout placement | RR-US-171 | As a customer, I see recommendations on checkout. | FOLLOW_UP. Not V1 by default; payment conversion is protected. |
| Post-purchase | RR-US-172 | As a customer, I see recommendations after purchase. | FOLLOW_UP (`POST_PURCHASE`) |

---

## 3. Workforce journeys

**Persona:** `PERSONA-WORKFORCE-OPERATOR` (existing commercial / admin configuration).  
**Outcome:** RR-BO-06  
No new role.

### Journey N — Admin defines a relationship

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Define relationship | RR-US-200 | As an operator, I can define a recommendation relationship with source product or category, target product or category, and relationship type. | V1_CANDIDATE |
| Placement and priority | RR-US-201 | As an operator, I can set relative priority, eligible placements, and an optional effective period. | V1_CANDIDATE |
| Limited Drop / commercial boost | RR-US-202 | As an operator, I can mark an eligible relationship for Limited Drop or commercial boost without bypassing eligibility. | V1_CANDIDATE |
| Which permission | RR-US-203 | Which existing permission administers this is decided in discovery. | ARCHITECTURE_FIT_REQUIRED |

### Journey O — Admin activates or disables a relationship

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Activate | RR-US-210 | As an operator, I can activate a relationship so it may be selected when eligible. | V1_CANDIDATE |
| Disable | RR-US-211 | As an operator, I can disable a relationship so new sets stop using it. | V1_CANDIDATE |
| Disable is not a cart wipe | RR-US-212 | As an operator, disabling a relationship does not silently remove lines the customer already added. | V1_CANDIDATE |

### Journey P — Margin / commercial ranking without eligibility override

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Rank eligible set | RR-US-220 | As an operator, commercial priority and contribution signal can change rank inside the eligible set. | V1_CANDIDATE |
| Eligibility wins | RR-US-221 | As an operator, I cannot use margin or priority to recommend an ineligible item. | NOT_SUPPORTED_BY_DESIGN to violate |
| Weights are not product law | RR-US-222 | Exact numeric weights are not a customer or operator contract in discovery. | V1_CANDIDATE direction |
| Margin projection | RR-US-223 | How contribution is read without a second money authority. | ARCHITECTURE_FIT_REQUIRED |

---

## 4. Cross-cutting constraints

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Server-authoritative eligibility | RR-US-300 | Eligibility is decided on the server from existing commerce truth, not by the client inventing purchasability. | V1_CANDIDATE |
| Deterministic ranking | RR-US-301 | V1 ranking is rule-based. | V1_CANDIDATE |
| Popular only with a basis | RR-US-302 | Customer-facing "Popular" requires a defined popularity basis. | UNRESOLVED_DECISION_REQUIRED until that basis is chosen; false Popular is NOT_SUPPORTED_BY_DESIGN |
| No silent cart mutation | RR-US-310 | The platform never silently adds a recommended product, changes a variant, or preselects a paid modifier. | NOT_SUPPORTED_BY_DESIGN to violate |
| No recommendation discount | RR-US-311 | This capability does not create a discount, promotion, offer, or campaign. | NOT_SUPPORTED_BY_DESIGN to violate |
| Safe copy | RR-US-312 | Default copy stays within truthful phrases (Complete your order, Goes great with this, Try the latest Drop, You might also like). | V1_CANDIDATE |
| Holdout design | RR-US-320 | Incrementality can be measured with a control or holdout without a large experimentation platform. | DESIGN_READY / V1_CANDIDATE direction; assignment mechanism is ARCHITECTURE_FIT_REQUIRED |
| Holdout customer policy | RR-US-321 | Which customers may see an empty recommendation set for measurement. | UNRESOLVED_DECISION_REQUIRED |
| Checkout recommendations | RR-US-322 | Checkout is a V1 placement. | NOT_SUPPORTED_BY_DESIGN as a V1 default (`FOLLOW_UP` only) |

---

## 5. Candidate story inventory summary

| Class | Stories |
|---|---|
| V1_CANDIDATE | RR-US-001, 002, 003, 010, 011, 012, 020, 022, 030, 031, 032, 040, 041, 042, 050, 051, 060, 070, 072, 080, 081, 082, 090, 091, 092, 100, 101, 110, 111, 112, 120, 121, 122, 130, 131, 200, 201, 202, 210, 211, 212, 220, 222, 300, 301, 312 |
| FOLLOW_UP | RR-US-043, 123, 140, 150, 151, 152, 160, 170, 171, 172 |
| DEFERRED | RR-US-153 |
| UNRESOLVED_DECISION_REQUIRED | RR-US-113, 302, 321 |
| NOT_SUPPORTED_BY_DESIGN | Violations of RR-US-021, 052, 061, 071, 102, 141, 150/151 false claims, 161, 221, 310, 311; checkout-as-V1-default (RR-US-322) |
| ARCHITECTURE_FIT_REQUIRED (not product stories) | RR-US-124, 203, 223; experiment assignment inside RR-US-320 |

Counts are discovery estimates. Product Definition may remap them.
`OPEN` product questions also live in the companion discovery §21 (copy per placement, empty-cart behaviour, label collision between Drop and commercial priority, attribution after later edits).

---

## 6. Explicit non-goals for this story map

- Formal `AC-IMP-*` identifiers or accepted acceptance criteria
- Treating `DISCOVERY_ACCEPTANCE_EXAMPLE` as a formal acceptance scenario
- Product Definition Gate evidence
- Architecture Fit answers
- Schema, ranking weights, or analytics persistence
- Runtime implementation
- Roadmap identity for `"IMP-036K"`
- A recommendation-specific workforce role
- Interference with IMP-036I stories
- Edits to Offers / Deals / Campaigns discovery

---

## 7. Recommended next action

```text
STATUS = DISCOVERY_ONLY
Continue Revenue Recommendations discovery / prepare a formal Product Definition
only when program sequencing permits.

Do NOT allocate, activate, or treat "IMP-036K" as governance identity.
Do NOT change acceptedThrough, IMP-036I, IMP-037/038 holds, or the IMP-040 GTM boundary.
```
