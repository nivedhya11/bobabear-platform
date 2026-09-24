# Offers, Deals & Campaigns — Story Map (Discovery)

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

WORKING_CAPABILITY_NAME: Offers, Deals & Campaigns
CANDIDATE_WORKING_LABEL: "IMP-036J" — CANDIDATE / WORKING LABEL / NOT GOVERNANCE IDENTITY

STORY_IDS: ODC-US-* are discovery-only and may be remapped later
AC_IDS: NOT CREATED (no AC-IMP-* yet)
ACCEPTANCE_EXAMPLES: labelled DISCOVERY_ACCEPTANCE_EXAMPLE only

PROCESS: ANCHOR → DISCOVER → STORY_MAP (this artifact)
PARALLEL_TO: IMP-036I — do not interfere
Companion discovery: offers-deals-campaigns.md
```

```text
FOUNDER_APPROVED_DISCOVERY_DIRECTION ≠ FORMAL_PRODUCT_DEFINITION_APPROVAL
```

Hierarchy used:

```text
BUSINESS OUTCOME → PERSONA → JOURNEY → ACTIVITY → CANDIDATE STORY
```

Story classifications:

`V1_CANDIDATE` | `FOLLOW_UP` | `DEFERRED` | `NOT_SUPPORTED_BY_DESIGN` | `UNRESOLVED_DECISION_REQUIRED`

Personas reused from existing product docs (not invented): **Customer**, **Admin commercial
operator** (workforce administration). No new roles/permissions.

---

## 1. Business outcomes (candidate)

| ID | Outcome | Notes |
|---|---|---|
| ODC-BO-01 | Increase direct-order conversion via browsable Deals | Merchandising |
| ODC-BO-02 | Increase AOV via combos / multi-item Deals | Deal composition |
| ODC-BO-03 | Acquire first-time direct customers via Offers | Eligibility ODC-06 approved |
| ODC-BO-04 | Shift fulfilment mode (Pickup / scheduled) via incentives | Coordinate with IMP-036H/I |
| ODC-BO-05 | Make Promotions/Coupons operable and explainable end-to-end | Close UX gap on existing engine |
| ODC-BO-06 | Coordinate sales initiatives as Campaigns with measurable redemption | Orchestration, not second money engine |
| ODC-BO-07 | Protect margin via explicit stacking / limits / truthful savings | ODC-07…11 approved |

---

## 2. Story map — Customer journeys

### Journey A — Discover a Deal

**Outcome:** ODC-BO-01 · **Persona:** Customer

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Enter from Home / Menu / Deals | ODC-US-001 | As a customer, I can open a Deals discovery surface from primary navigation or Home. | V1_CANDIDATE |
| Browse Deal collections | ODC-US-002 | As a customer, I can browse Deals grouped by For One / For Two / Combos / Under ₹X / Pickup / Limited (IA discovery-only). | V1_CANDIDATE |
| Empty state | ODC-US-003 | As a customer, when no Deals are available for my outlet/fulfilment context, I see a clear empty state and path back to Menu. | V1_CANDIDATE |
| Inspect Deal card | ODC-US-004 | As a customer, I can see Deal title, image, Deal price, reference/savings cue, and key terms/expiry without leaving the list. | V1_CANDIDATE |
| Mobile / a11y | ODC-US-005 | As a customer, Deal discovery is usable on mobile and exposes accessible names/prices (not image-only). | V1_CANDIDATE |

**DISCOVERY_ACCEPTANCE_EXAMPLE (A):** Customer at a serviceable outlet opens Deals, sees at least one active Deal card with price, and can navigate to configure it.

---

### Journey B — Configure a Deal

**Outcome:** ODC-BO-02 · **Persona:** Customer

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Open Deal detail | ODC-US-010 | As a customer, I can open a Deal and see required component groups and choices. | V1_CANDIDATE |
| Make required choices | ODC-US-011 | As a customer, I must complete each required choice group before Add is enabled. | V1_CANDIDATE |
| Switch unavailable choice | ODC-US-012 | As a customer, if a selected choice becomes unavailable, I can pick another eligible choice in that group (no silent substitute). | V1_CANDIDATE |
| Customisation | ODC-US-013 | As a customer, I can apply allowed modifiers on Deal components where Catalog permits. | V1_CANDIDATE |
| Validation failure | ODC-US-014 | As a customer, incomplete or invalid configurations show recoverable errors. | V1_CANDIDATE |

**Depends on:** ODC-03, ODC-12 · Catalog bundle readiness (Fit).

---

### Journey C — Add Deal to cart

**Outcome:** ODC-BO-02 · **Persona:** Customer

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Add configured Deal | ODC-US-020 | As a customer, I can add a validly configured Deal to cart in one action. | V1_CANDIDATE |
| See Deal in cart | ODC-US-021 | As a customer, cart shows the Deal as a coherent line (or clearly grouped components) with Deal price. | V1_CANDIDATE |
| Deal unavailable at add | ODC-US-022 | As a customer, if the Deal became unavailable, Add fails with explanation and recovery to Menu/Deals. | V1_CANDIDATE |
| Stale configuration | ODC-US-023 | As a customer, stale Deal configuration is revalidated before payment (no silent accept). | V1_CANDIDATE |

---

### Journey D — Receive automatic Offer

**Outcome:** ODC-BO-05 · **Persona:** Customer

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Eligible auto-apply | ODC-US-030 | As a customer, when my cart meets an automatic Offer, the benefit is applied without a code. | V1_CANDIDATE |
| See applied Offer | ODC-US-031 | As a customer, I can see that an Offer was applied and what I saved. | V1_CANDIDATE |
| Not eligible yet | ODC-US-032 | As a customer, I can understand why an automatic Offer is not yet applied (e.g. min basket). | V1_CANDIDATE |
| Expired / not effective | ODC-US-033 | As a customer, expired Offers are not applied; messaging does not promise them. | V1_CANDIDATE |

**Note:** Engine auto-evaluation **CURRENT_SUPPORTED**; customer messaging **PARTIALLY_SUPPORTED**.

---

### Journey E — Enter Coupon

**Outcome:** ODC-BO-05 · **Persona:** Customer

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Enter code | ODC-US-040 | As a customer, I can enter a coupon code on cart or checkout. | V1_CANDIDATE |
| Applied | ODC-US-041 | As a customer, a valid coupon shows APPLIED state and savings. | V1_CANDIDATE |
| Invalid | ODC-US-042 | As a customer, invalid/expired/inapplicable codes show clear recoverable errors. | V1_CANDIDATE |
| Identity required | ODC-US-043 | As a customer, when redemption requires sign-in, I am guided to authenticate and retry. | V1_CANDIDATE |
| Remove code | ODC-US-044 | As a customer, I can remove an entered coupon and totals recompute. | V1_CANDIDATE |

**DISCOVERY_ACCEPTANCE_EXAMPLE (E):** Authenticated customer enters a valid active coupon; checkout money summary shows Discount; removing code removes discount.

---

### Journey F — Become eligible after increasing basket

**Outcome:** ODC-BO-01/05 · **Persona:** Customer

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Progress messaging | ODC-US-050 | As a customer, I see progress toward unlocking an Offer (e.g. “Add ₹82 more to unlock free delivery”). | V1_CANDIDATE |
| Unlock confirmation | ODC-US-051 | As a customer, when I cross the threshold, I see unlocked confirmation and updated totals. | V1_CANDIDATE |
| Fall below again | ODC-US-052 | As a customer, if I remove items and fall below, the Offer is removed with clear messaging. | V1_CANDIDATE |

---

### Journey G — See savings before payment

**Outcome:** ODC-BO-07 · **Persona:** Customer

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Pre-pay breakdown | ODC-US-060 | As a customer, before payment I see Deal price, Offer savings, coupon savings, delivery savings, and payable total as truthful lines. | V1_CANDIDATE |
| “You saved” | ODC-US-061 | As a customer, any “You saved” figure equals the sum of explainable components (never invented). | V1_CANDIDATE |
| Terms access | ODC-US-062 | As a customer, I can open short terms for the applied Offer/Deal. | FOLLOW_UP |

---

### Journey H — Offer becomes invalid before payment

**Outcome:** ODC-BO-07 · **Persona:** Customer

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Revalidation failure | ODC-US-070 | As a customer, if an Offer becomes invalid before payment, checkout blocks with recoverable explanation. | V1_CANDIDATE |
| Recovery | ODC-US-071 | As a customer, I can remove the coupon / adjust cart / continue without that Offer. | V1_CANDIDATE |
| No stale paid total | ODC-US-072 | As a customer, I cannot pay a total that still assumes an invalid Offer. | V1_CANDIDATE |

---

### Journey I — Deal becomes unavailable

**Outcome:** ODC-BO-02 · **Persona:** Customer

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Cart invalidation | ODC-US-080 | As a customer, if a Deal in cart becomes unavailable, I am told which Deal/component failed. | V1_CANDIDATE |
| Recovery | ODC-US-081 | As a customer, I can remove the Deal or reconfigure with eligible choices. | V1_CANDIDATE |
| No silent substitute | ODC-US-082 | As a customer, the platform never silently substitutes a Deal component after my selection. | V1_CANDIDATE |

---

### Journey J — Use first-order Offer

**Outcome:** ODC-BO-03 · **Persona:** Customer

| Activity | Story ID | Story | Class |
|---|---|---|---|
| First-order eligible | ODC-US-090 | As a first-time direct customer, I can receive a first-order Offer when authenticated and eligible. | V1_CANDIDATE |
| Returning blocked | ODC-US-091 | As a returning customer, I cannot redeem a first-order-only Offer. | V1_CANDIDATE |
| Definition of first order | ODC-US-092 | First-order eligibility uses the Founder-approved discovery definition: no previous successfully purchased direct BOBA Bear Order for that authenticated customer identity; failed/abandoned payments do not consume status; later cancel/refund of a successful Order does not restore it. Exact query/concurrency = Fit. | V1_CANDIDATE |

**Depends on:** ODC-06 (approved direction; engine gap today remains Fit-owned).

---

### Journey K — Free-delivery Offer

**Outcome:** ODC-BO-04/05 · **Persona:** Customer

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Discover free delivery | ODC-US-100 | As a customer, I can discover free-delivery incentives and their conditions. | V1_CANDIDATE |
| Threshold progress | ODC-US-101 | As a customer, I see progress toward free delivery when applicable. | V1_CANDIDATE |
| Applied on delivery mode | ODC-US-102 | As a customer on Delivery, free delivery appears as ₹0 delivery or explicit delivery savings when earned. | V1_CANDIDATE |
| Pickup interaction | ODC-US-103 | As a customer on Pickup, delivery Offers do not incorrectly apply. | V1_CANDIDATE |

**Depends on:** delivery threshold vs promo charge-target Fit; ODC-05.

---

### Journey L — Offer exhausted / usage limit reached

**Outcome:** ODC-BO-07 · **Persona:** Customer

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Global exhausted | ODC-US-110 | As a customer, when global redemptions are exhausted, I see an exhausted state (not a generic invalid). | V1_CANDIDATE |
| Per-customer cap | ODC-US-111 | As a customer who hit my personal cap, I cannot re-apply that Offer. | V1_CANDIDATE |
| Concurrent race | ODC-US-112 | Competing checkouts cannot both consume the last redemption (payment-bound claims). | V1_CANDIDATE |

---

### Journey M — Checkout with compatible Deal + Offer

**Outcome:** ODC-BO-07 · **Persona:** Customer

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Compatible pair | ODC-US-120 | As a customer, when Deal+Offer are compatible, both intended benefits appear in the sealed snapshot. | V1_CANDIDATE |
| Confirmation | ODC-US-121 | As a customer, order confirmation retains the same savings explanation. | V1_CANDIDATE |
| Order history | ODC-US-122 | As a customer, order detail shows historical discount without live re-evaluation. | V1_CANDIDATE |

**Depends on:** ODC-07/08.

---

### Journey N — Checkout where incentives conflict

**Outcome:** ODC-BO-07 · **Persona:** Customer

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Conflict resolution | ODC-US-130 | As a customer, when incentives conflict, I see which benefit applied and why the other did not, following approved stacking (one primary merchandise/order Offer + one compatible delivery incentive, subject to Deal compatibility) and best-value selection. | V1_CANDIDATE |
| Coupon vs automatic | ODC-US-131 | As a customer, an entered Coupon competes with the applicable automatic Offer; best compatible value wins; I am not made worse off merely by entering a coupon; incompatible Coupon + automatic benefits are never silently stacked. | V1_CANDIDATE |
| Cannot stack disallowed pair | ODC-US-132 | As a customer, disallowed stacks never silently deepen discount. | V1_CANDIDATE |

---

### Journey O — View available Offers in My BOBA

**Outcome:** ODC-BO-05 · **Persona:** Customer

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Offers for You | ODC-US-140 | As an authenticated customer, I can view Offers available to me under My BOBA / Offers. | FOLLOW_UP |
| Empty / signed-out | ODC-US-141 | As a guest, I see sign-in CTA rather than a fake personalised list. | FOLLOW_UP |
| Navigate to redeem | ODC-US-142 | As a customer, I can move from an Offer detail into Menu/cart with context. | FOLLOW_UP |

**Note:** Remains FOLLOW_UP — Founder-approved V1 does not require My BOBA / Offers for You when cart messaging, Deals discovery, and coupon field ship first.

---

### Journey P — Campaign / Drop discovery

**Outcome:** ODC-BO-06 · **Persona:** Customer

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Campaign landing | ODC-US-150 | As a customer, I can open a public campaign surface that lists participating Deals/Offers. | FOLLOW_UP |
| Drop participation | ODC-US-151 | As a customer, I can discover Drop-linked merchandising without Drop becoming a discount engine. | FOLLOW_UP |
| Ended campaign | ODC-US-152 | As a customer, ended campaigns do not present actionable add/apply controls. | FOLLOW_UP |

---

## 3. Story map — Workforce / commercial journeys

**Persona:** Admin commercial operator (existing IMP-036F commercial workspace).  
**Outcome:** ODC-BO-05/06/07

| Journey | Activity | Story ID | Story | Class |
|---|---|---|---|---|
| Create Campaign | Draft | ODC-US-200 | As an operator, I can create a Campaign with name, objective, window, and Brand/Outlet scope. | V1_CANDIDATE |
| Create Campaign | Attach | ODC-US-201 | As an operator, I can attach existing Deals and/or Offers (Promotions/Coupons) to a Campaign. | V1_CANDIDATE |
| Create / configure Deal | Compose | ODC-US-210 | As an operator, I can configure fixed and choice-based Deal composition for sale. | V1_CANDIDATE |
| Create / configure Deal | Price | ODC-US-211 | As an operator, I can set Deal price under Pricing authority and preview customer consequence. | V1_CANDIDATE |
| Create Offer | Author | ODC-US-220 | As an operator, I can create an Offer backed by Promotion benefit types approved for V1. | V1_CANDIDATE |
| Attach Promotion/Coupon | Reuse | ODC-US-221 | As an operator, I can attach an existing Promotion/Coupon rather than re-authoring money rules. | V1_CANDIDATE |
| Choose scope | Scope | ODC-US-230 | As an operator, I can set Brand/Outlet (and product/variant) scope consistently with IMP-036F. | V1_CANDIDATE |
| Choose eligibility | Rules | ODC-US-231 | As an operator, I can configure time window, min basket, and V1 customer eligibility fields. | V1_CANDIDATE |
| Configure limits | Caps | ODC-US-232 | As an operator, I can set max discount and coupon redemption caps. | V1_CANDIDATE |
| Configure stacking | Policy | ODC-US-233 | As an operator, I can declare Deal/Offer compatibility and stacking consistent with approved V1 policy: one primary merchandise/order Offer + one compatible delivery incentive, subject to Deal compatibility. Exact engine mapping = Fit. | V1_CANDIDATE |
| Schedule Campaign | Schedule | ODC-US-240 | As an operator, I can schedule Campaign start/end without inventing illegal Promotion states. | V1_CANDIDATE |
| Preview consequence | Review | ODC-US-241 | As an operator, I must preview customer commercial consequence before activate/effect (IMP-036F pattern). | V1_CANDIDATE |
| Activate / pause | Lifecycle | ODC-US-250 | As an operator, I can activate or pause a Campaign and understand child Offer/Deal effect. | V1_CANDIDATE |
| Observe health | Monitor | ODC-US-260 | As an operator, I can see redemptions, discount spend, and simple health signals. | V1_CANDIDATE |
| End Campaign | End | ODC-US-270 | As an operator, I can end a Campaign so customer surfaces stop offering it. | V1_CANDIDATE |
| Review results | Report | ODC-US-280 | As an operator, I can review descriptive Campaign metrics (no causal lift claim). | V1_CANDIDATE |
| Diagnose ineligibility | Support | ODC-US-290 | As an operator, I can diagnose why a customer/order was not eligible (reason codes). | V1_CANDIDATE |
| Complete PromotionsEditor | Parity | ODC-US-300 | As an operator, I can author BOGO, charge targets, stacking, windows, and min-spend already supported by the engine but thin in UI. | V1_CANDIDATE |

Unauthorized access remains denied via existing permissions — no new persona invention.

---

## 4. Cross-cutting activities (all applicable journeys)

| Activity | Story ID | Story | Class |
|---|---|---|---|
| Payment seal | ODC-US-400 | Applied Deal/Offer effects are sealed into the checkout snapshot and do not mutate later. | V1_CANDIDATE |
| Refund allocation | ODC-US-401 | Refunds reuse original discount allocations (ADR-007). | V1_CANDIDATE |
| Accessibility | ODC-US-410 | Savings and errors are available to assistive tech, not colour-only. | V1_CANDIDATE |
| Mobile continuity | ODC-US-411 | Deals/Offers flows work on mobile viewport continuous with food-direct UX. | V1_CANDIDATE |
| No second money engine | ODC-US-420 | Implementation must reuse Pricing/Promotion authorities (Fit constraint mirrored as story intent). | NOT_SUPPORTED_BY_DESIGN to violate |
| Loyalty / wallet / referrals | ODC-US-500 | Loyalty points, wallet cashback, gift cards, referrals. | DEFERRED |
| AI optimisation / surge / personalised pricing | ODC-US-510 | AI offer optimisation, surge, dynamic personalised pricing. | DEFERRED |
| Physical merch fulfilment | ODC-US-520 | Physical merchandise inventory and fulfilment as Offer reward. | DEFERRED |
| Causal incrementality | ODC-US-530 | Causal incremental revenue measurement / experimentation platform. | FOLLOW_UP |
| Scheduled Deal eligibility | ODC-US-540 | Deals/Offers keyed to scheduled fulfilment slots. | FOLLOW_UP (after IMP-036I) |

---

## 5. Candidate story inventory summary

| Class | Count (approx.) |
|---|---|
| V1_CANDIDATE | ~72 |
| FOLLOW_UP | ~10 |
| DEFERRED | ~4 |
| UNRESOLVED_DECISION_REQUIRED | 0 |
| NOT_SUPPORTED_BY_DESIGN | 1 (second money engine) |

Exact counts are discovery estimates; remapping at Product Definition time is expected.
Founder decisions ODC-01…14 resolved product questions previously marked
`UNRESOLVED_DECISION_REQUIRED` (ODC-US-092, ODC-US-130, ODC-US-131, ODC-US-233).

---

## 6. Mapping to Founder decisions

| Decision | Status | Primarily unblocks |
|---|---|---|
| ODC-01 | FOUNDER_APPROVED_DISCOVERY_DIRECTION | Journeys A–C vocabulary; admin Deal vs Offer |
| ODC-02 | FOUNDER_APPROVED_DISCOVERY_DIRECTION | ODC-US-200…280 Campaign ops |
| ODC-03 | FOUNDER_APPROVED_DISCOVERY_DIRECTION | Journeys B–C, ODC-US-210 |
| ODC-04 | FOUNDER_APPROVED_DISCOVERY_DIRECTION | Journeys D–E |
| ODC-05 | FOUNDER_APPROVED_DISCOVERY_DIRECTION | Journeys D/K + Offer authoring |
| ODC-06 | FOUNDER_APPROVED_DISCOVERY_DIRECTION | Journey J + eligibility stories |
| ODC-07/08 | FOUNDER_APPROVED_DISCOVERY_DIRECTION | Journeys M–N; ODC-US-233 |
| ODC-09/10 | FOUNDER_APPROVED_DISCOVERY_DIRECTION | Journey N |
| ODC-11 | FOUNDER_APPROVED_DISCOVERY_DIRECTION | Journey L |
| ODC-12 | FOUNDER_APPROVED_DISCOVERY_DIRECTION | Journeys B/I |
| ODC-13 | FOUNDER_APPROVED_DISCOVERY_DIRECTION | ODC-US-260/280 |
| ODC-14 | FOUNDER_APPROVED_DISCOVERY_DIRECTION | ODC-US-520 deferred confirmation |

```text
OPEN_FOUNDER_DISCOVERY_DECISIONS = 0
UNRESOLVED_DECISION_REQUIRED stories remaining = 0
```

---

## 7. Explicit non-goals for this story map

- Formal IMP story IDs / AC-IMP scenarios
- Conversion of DISCOVERY_ACCEPTANCE_EXAMPLE into formal acceptance criteria
- Product Definition Gate evidence
- Architecture Fit answers
- Runtime implementation
- Roadmap identity allocation (including any use of “IMP-036J” as governance identity)
- Interference with IMP-036I Scheduled Fulfilment stories

---

## 8. Recommended next action

```text
FOUNDER_DISCOVERY_DIRECTION = APPROVED (ODC-01..ODC-14, 2026-09-24)

Continue discovery safely in parallel with IMP-036I.
Do NOT create formal Product Definition until ROADMAP assigns and activates a future slice.
Do NOT perform Product Definition Gate / Architecture Fit / implementation.
```
