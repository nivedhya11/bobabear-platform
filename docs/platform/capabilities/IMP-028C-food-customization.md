<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-028C",
  "title": "Food Customization",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "IMPLEMENTATION_IN_PROGRESS",
  "implementationAuthorized": true,
  "lastReviewed": "2026-08-19",
  "bindingDecisions": ["D-368", "D-369", "D-370"],
  "dependsOn": ["IMP-012", "IMP-013", "IMP-014", "IMP-015", "IMP-020", "IMP-021", "IMP-024", "IMP-025", "IMP-026C", "IMP-028A", "IMP-028B"]
}
-->

# IMP-028C — Food Customization

## Capability Architecture (ARCHITECTURE_LOCKED)

This locked capability connects existing Catalog, Pricing, Customer Menu, Cart, Checkout, and
Checkout Snapshot authorities to customer customization. It creates no new customization authority,
decision, persistence, schema, migration, or runtime topology. Global architecture remains ARCH-R15;
D-371 remains unused.

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Implementation | `AUTHORIZED` / `STARTED` |
| Implementation authorized | **YES** |
| Implementation started / complete / accepted | **NO** / **NO** / **NO** |
| Schema / migration / new authority | **NO** / **NO** / **NO** |
| Founder UAT required at acceptance | **YES** |

```text
IMP-028C_ARCHITECTURE_LOCKED: YES
IMP-028C_IMPLEMENTATION_AUTHORIZED: YES
IMP-028C_IMPLEMENTATION_STARTED: YES
IMP-028C_IMPLEMENTATION_COMPLETE: NO
IMP-028C_ACCEPTED: NO
NEW_SCHEMA_REQUIRED: NO
NEW_MIGRATION_REQUIRED: NO
NEW_PERSISTENCE_AUTHORITY: NO
NEW_DECISION: NO
D371_CREATED: NO
IMP029_RETARGETED: NO
```

## 1. Governance Metadata

| Field | Value |
|---|---|
| IMP / placement | IMP-028C; after accepted IMP-028B and before planned IMP-029 |
| Current / next slice | IMP-028C / IMP-029 — Operations Console API (unchanged and unauthorized) |
| Acceptance position | `acceptedThrough = IMP-028B`; `pendingAcceptance = NONE` |
| Binding decisions | D-368, **D-369**, D-370 |
| Global architecture / decision register | ARCH-R15 / DR-12 unchanged |

Canonical authorities remain [`../VISION.md`](../VISION.md), [`../ROADMAP.md`](../ROADMAP.md),
[`../STATE.md`](../STATE.md), [`../ARCHITECTURE.md`](../ARCHITECTURE.md), and
[`../decision-register.md`](../decision-register.md). IMP-028B remains accepted and is not reopened.

## 2. Capability Purpose and Boundary

```text
Catalog / Pricing authorities
        ↓
Customer Menu read/storefront projection
        ↓
customer customization interaction
        ↓
configured Cart purchase intent
        ↓
Cart / Checkout evaluation
        ↓
Checkout Snapshot payable truth
```

Customization discovery for applicable variants extends the D-368 Customer Menu projection; no
second modifier-discovery or customer-catalog authority is allowed. Catalog remains authoritative
for modifier groups/options, variant bindings, required/optional semantics, group and option min/max,
defaults, ordering, and lifecycle. Pricing remains authoritative for base variant price, modifier
price delta, and configured commercial pricing. Displayed modifier prices are presentation only.

Configured selections use the existing Cart purchase-intent representation:

```text
variantId
quantity
modifiers
bundleSelections
```

Cart/Checkout evaluation and Checkout Snapshot remain commercial validation and payable truth. No
second customization Cart model, persistence authority, or duplicate customer Catalog model is
permitted.

## 3. Mandatory D-369 Invariant

D-369 is CURRENT and mandatory:

```text
positive-price catalog default
!=
automatically selected Cart modifier
```

A positive-price modifier requires explicit customer selection in the current interaction before it
enters configured Cart intent. A visible zero-price default may preselect where existing Catalog
semantics permit it. Implementation must not generically set `selectedQuantity` from
`catalog.defaultQuantity` without applying this invariant.

## 4. Exact MVP Scope

1. Customer Menu modifier discovery for applicable variants, preserving canonical modifier-group and
   modifier-option identities.
2. Existing required/optional, group min/max, option min/max, default quantity, display ordering,
   lifecycle, and constraint-represented single/multi-select behavior.
3. Customer-visible modifier price deltas from Pricing and customization before configured Add to Cart.
4. D-369 explicit paid-intent behavior and the existing configured Cart representation/API.
5. Customer-visible selected configuration sufficient to understand the configured Cart line.
6. Existing server-side Cart/Checkout validation as authority.
7. Canonical customization content sufficient for exact-candidate founder UAT.

## 5. Explicit Non-Goals

IMP-029; new D-370 policy work; guest/customer Cart reconciliation redesign; bundle/combo customer
UX unless canonical content proves it mandatory; special instructions; Search; Filters; Sorting;
Most Ordered; Offers; Favorites; My Usual; Order Again; personalization; new promotion, inventory,
pricing, product/catalog, Cart, or Checkout authority; client-owned payable pricing; schema changes;
migrations; unrelated UX redesign; and deferred Food capability families. Existing bundle-aware
backend infrastructure remains intact.

## 6. Persistence and Content Stop Gates

No persistence, schema, or migration is authorized. If implementation proves one necessary:

```text
STOP_IMPLEMENTATION = NEW_PERSISTENCE_AUTHORITY_REQUIRED
```

Live imported Menu content has no meaningful modifiers. Founder UAT customization content must come
from a legitimate existing catalog/content authority through a supported content, import, or seed
mechanism. Frontend-only modifier fixtures, customer-only static modifier JSON, parallel customer
catalog authority, and legacy static customer Menu runtime authority are prohibited. If the canonical
content path cannot represent needed content:

```text
STOP_IMPLEMENTATION = CUSTOMIZATION_CONTENT_AUTHORITY_GAP
```

Return evidence to ChatGPT in either stop case.

## 7. Acceptance Contract

| ID | Requirement |
|---|---|
| AC01 | Applicable Menu variants expose server-backed customization through the existing Customer Menu projection. |
| AC02 | Modifier group/option identities originate from existing Catalog; no duplicate customer identity model. |
| AC03 | Required/optional, min/max, defaults, ordering, and lifecycle preserve existing Catalog semantics. |
| AC04 | D-369: positive-price modifiers need explicit current-interaction selection; paid defaults cannot silently become intent; permitted visible zero-price defaults may preselect. |
| AC05 | Customer-visible modifier deltas come from Pricing and remain presentation-only. |
| AC06 | Configured add/update uses existing Cart contracts; no parallel customization persistence. |
| AC07 | The interaction prevents obvious invalid states using discoverable canonical constraints; server validation remains authoritative. |
| AC08 | Selected configuration remains sufficiently visible to understand the configured Cart item. |
| AC09 | Discovery remains in D-368 Customer Menu projection; a contradictory structural need is a STOP for ChatGPT review. |
| AC10 | Existing catalog/pricing/Cart/Checkout models are reused; any persistence requirement is a mandatory stop. |
| AC11 | D-370 policy remains out of scope; configured-line reconciliation must not regress. |
| AC12 | A representative acceptance Menu item receives modifiers through a legitimate canonical content path; no frontend-only demo authority. |
| AC13 | IMP-028A/B and Menu, pricing, Cart, Checkout, payment, order, financial, and deferred-capability boundaries do not regress. |
| AC14 | Lifecycle: implementation → technical validation → independent acceptance → exact fingerprint → fresh exact-candidate Docker deployment → founder/user UAT → UAT PASS → canonical reconciliation. |

`FOUNDER_UAT_REQUIRED = YES`. Cursor completion is not canonical acceptance; only the founder/user
may declare UAT PASS or FAIL.

## 8. Implementation Constraints

Implementation has started under the existing authorization. Preserve D-368 as sole customer Menu
discovery authority and D-370 as the existing configured-line/reconciliation boundary. D-371 must
not be allocated, reserved, drafted, or consumed. A genuine unresolved binding-authority problem is
a STOP for ChatGPT review.

## 9. Business and Domain Model Lock

### Reusable modifier authority and Variant binding

A Modifier Group is a reusable, first-class Catalog authority. It must not be copied under a
customer Menu item, Product, Variant, Combo, or Bundle component. A group such as `BURGER_ADDONS`
may be bound through the existing Variant ↔ Modifier Group authority to Burger A, Burger B, and
Burger C without copying the group or its options. Customer Menu is only a projection of that
authority.

The Variant ↔ Modifier Group binding determines applicability, group min/max, required semantics,
ordering, lifecycle, and the Variant-specific modifier-pricing identity. Modifier Group identity
and Modifier Option membership remain reusable through existing Catalog relationships. No second
customer-specific binding authority is permitted.

Free and paid options use the same modifier model. A resolved price delta of `0` is included/free/no
surcharge; a price delta greater than `0` is paid customization. Do not introduce a fundamental
Catalog `isPaid` flag solely for customer presentation; existing Pricing remains authoritative.

### Bundle composition and component inheritance

```text
Bundle Variant
  → Bundle Group / slot
  → Bundle Group Option
  → canonical component Variant
```

`Choose Main`, `Choose Side`, and `Choose Drink` are Bundle composition choices, not Modifier
Groups or generic add-ons. When a canonical Variant is selected as a Bundle component, it retains
its ordinary Modifier Group bindings. The same Burger Add-ons therefore apply to a standalone
Burger and a Burger selected through a Combo slot; standalone, combo, and meal copies are forbidden.
Existing nested Cart/modifier support remains authoritative.

### Pricing and promotion separation

```text
COMBO_MEMBERSHIP_CHANGES_MODIFIER_PRICE = NO
CONFIGURED_BUNDLE_PRICE = bundle/base commercial price
                        + bundle option adjustments
                        + selected modifier deltas
```

A paid modifier has the same normal price on a standalone component and in a Combo. For example,
Extra Cheese remains `+₹25`, not `+₹15` because its Burger is in a Combo. A bundle/package discount
applies to the bundle/base commercial price and does not automatically discount paid modifier
deltas: a ₹299 Combo plus +₹25 Extra Cheese totals ₹324.

Bundle-option upgrades and modifier adjustments are separate authorities: a `Large Coke +₹20` in
`Choose Drink` is bundle-option pricing, while `Extra Cheese +₹25` on Burger is modifier pricing.
Do not collapse them into generic add-ons.

Free Extra Cheese, a percentage topping discount, or a free topping with a promotional meal must
come from an explicit future Promotion/commercial rule. It must not arise implicitly because the
parent is a Combo. Combo-specific modifier price overrides are a current non-goal. Combo-specific
group/option enablement, min/max, option min/max, and position overrides are deferred/non-core.
The core model does not require any of them; a future explicit requirement must return to
architecture/governance review.

```text
NEW_BINDING_DECISION_REQUIRED_FOR_CORE_MODEL = NO
D-371 = UNUSED
```

### Customer Menu and Cart configuration direction

D-368 remains the sole customer storefront projection. Today it projects top-level Variant
modifiers. Future Combo projection must extend the same façade:

```text
Bundle → Bundle Groups / slots → Bundle options → component Variant → component Variant modifier groups
```

Do not create competing customer catalog authorities such as `/api/v1/bundles`,
`/api/v1/combo-customization`, or `/api/v1/addons`. Customer Bundle projection is future work.

Configured Cart identity includes configuration, not `variantId` alone:

```text
Cart Line
  variantId
  modifiers[]
  bundleSelections[]
    bundleGroupOptionId
    quantity
    modifiers[]
```

This applies to standalone modifiers, Bundle component selections, nested Bundle modifiers, and
D-370 reconciliation. D-369 remains unchanged: a positive-price default is not new customer
purchase intent; paid modifiers require explicit current-interaction selection. On edit, persisted
paid selections are already explicit intent and may be restored as initial state.

## 10. Future Management, Content, and Validation Boundaries

Future platform direction is a reusable Modifier Library (groups, options, and membership),
multi-Variant binding assignment, and a Bundle Builder (slots, permitted canonical component
Variants, and bundle-option adjustments). Component Variants retain ordinary Modifier Group
bindings. Admin UI, bulk assignment, and Bundle Builder management are out of scope.

`existing-menu-v1` currently imports neither modifier nor Bundle structures, and live Menu content
has none. Future import/content work must use reusable references—define group G once and bind
Variants A/B/C to it—not copied per-Product modifiers. Import schema is not designed here.

Existing nested-Bundle Cart structural validation verifies ownership, but Cart-mutation min/max and
cardinality enforcement is not complete. Before customer-facing Bundle customization releases, a
separate validation-boundary assessment must determine required enforcement across Cart mutation,
Cart evaluation, and Checkout evaluation. This lock creates no new policy or implementation.

## 11. Implementation Progress and Remaining Roadmap

| Slice | Status / locked scope |
|---|---|
| Slice 1 — Customer Menu Modifier Projection | `TECHNICALLY_ACCEPTED`: canonical group/option identities, constraints, display pricing, and D-369 discovery boundary. |
| Slice 2 — Customer Customization Interaction + Configured Add-to-Cart | `TECHNICALLY_ACCEPTED`: semantic independent-acceptance checks, focused test/build/typecheck, and database Cart/HTTP/Menu suites passed for the same candidate; a later Testcontainers hang had no candidate change or defect evidence. |
| Slice 3 — Configured Cart Presentation + Edit Configuration | One atomic implementation slice: use D-368 Menu presentation instead of static `ordering-catalog.json`; show modifiers and configured totals; retain concrete `cartLineId`; type client customization from canonical shared Cart types; forward modifiers and preserved `bundleSelections` through existing update transport; reuse edit interaction; restore persisted paid choices; preserve full configuration. |
| Slice 4 — Canonical modifier content / content-authoring readiness | Before founder UAT, at least one representative product must receive modifiers through a legitimate Catalog/content authority—never frontend-only demo authority. |

Slice 3 safety rule: Cart-line configuration `PUT` has full-replacement semantics. Omitting
`bundleSelections` clears them, so a modifier-only edit must preserve and forward existing
`bundleSelections`; it must not assume a partial patch. This remains required even while Bundle UX
is outside Slice 3.

Persisted modifier identities can become absent from the current Customer Menu after Catalog
lifecycle/availability changes. Cart and Checkout evaluation invalidate unavailable/invalid
configuration. Edit UI must not silently drop, substitute, or rewrite an unknown/stale persisted
selection; it must preserve intent and expose/require resolution. A policy choice beyond that
invariant is a STOP for ChatGPT review, not an automatic D-371 allocation.

Remaining separation:

- Future/separate: Customer Bundle projection and Bundle customization UX.
- Future platform work: modifier/Bundle import, Modifier Library UI, bulk Variant assignment, and
  Bundle Builder management UI.
- Deferred pending a new product requirement: Combo-context modifier pricing or constraint
  overrides.

AC01–AC14 remain unchanged. IMP-028C remains `IMPLEMENTATION_IN_PROGRESS`, incomplete, and
unaccepted.
