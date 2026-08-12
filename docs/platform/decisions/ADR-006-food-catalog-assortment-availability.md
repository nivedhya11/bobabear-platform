---
Status: Accepted
Decision date: 2026-08-02
Last updated: 2026-08-02
---

# ADR-006: Food Catalog, Menu, Assortment, and Availability

## Status

Accepted

## Decision Date

2026-08-02

## Decision Owners

BOBA Bear founder and product leadership

## Context

[`architecture-foundation.md`](../architecture-foundation.md) lists Catalog and Availability as
distinct logical modules — "Products, categories, variants, and modifier structure" and "Outlet-level
stock, temporary unavailability, preparation time" respectively — and
[`organization-outlet-access-model.md`](../organization-outlet-access-model.md) locks the principle
that catalog data cascades brand → territory → organization → outlet, with brand-controlled data such
as product identity, name, description, photography, product standards, base recipe, modifier
structure, allergen information, and category held distinct from outlet-level configuration such as
in-stock state, temporary availability, preparation time, and operating hours. Neither document fixes
how a BOBA Bear food or beverage product is structured, how customer-facing customization is modeled,
how a canonical brand catalog becomes a customer-facing menu, how assortment is inherited and
narrowed across territory, organization, and outlet scopes, how operational availability is
represented and propagated, how the customer-facing effective menu is resolved, or how a cart and an
order relate to catalog state that can change after the cart was built.

BOBA Bear's food and beverage catalog includes boba drinks, Korean street-food plates, and desserts,
each potentially offered in multiple variants (for example cup sizes) and customized through
structured modifiers (sugar level, ice level, add-ons). The brand intends to launch with a single
Dehradun outlet and a single active menu, while building toward multiple territories, organizations,
outlets, menus, and eventually franchise-operated assortment narrowing, without a foundational
catalog redesign. [`v1-product-scope.md`](../v1-product-scope.md) requires that customers browse
categorized menu content, select variants and add-ons, receive outlet-specific availability
information, and have every selection authoritatively revalidated before checkout completes. This ADR
resolves the food-catalog domain model, the separation between catalog, menu, assortment, and
availability, the product and variant model, modifier and bundle structure, the draft-and-publish and
lifecycle model, dietary and allergen and media metadata ownership, assortment inheritance,
operational availability and outlet-ordering pause, effective-menu resolution, cart revalidation, and
order catalog snapshots, so that the Catalog and Availability modules named in
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#initial-module-boundaries) can be implemented
against a fixed domain foundation rather than ad hoc, per-change decisions. Pricing is a distinct
concern, owned by the Pricing module referenced in
[`organization-outlet-access-model.md`](../organization-outlet-access-model.md#pricing-foundation),
and remains outside this decision — it is fixed in full by
[ADR-007](./ADR-007-pricing-tax-charges-promotions.md).

## Decision Summary

BOBA Bear will own one canonical, brand-level food and beverage catalog. Catalog, menu, assortment,
availability, and pricing are five distinct concerns and must never be merged into one generic
product-status field: **catalog** defines what a BOBA Bear product is; **menu** defines how catalog
products are presented to customers; **assortment** defines whether a catalog product is permitted to
be offered at a territory, organization, or outlet scope; **availability** defines whether an
otherwise valid and permitted item can be ordered operationally at a specific outlet and time; and
**pricing** defines monetary values, governed separately by the Pricing module and fixed in full by
[ADR-007](./ADR-007-pricing-tax-charges-promotions.md). A product being active in the brand catalog does not automatically make it orderable at every
outlet — the effective customer menu is the intersection of the published menu, active catalog
entities, inherited assortment, outlet availability, active schedule, and visibility policy.

Every orderable product has at least one variant, including an internal default variant for products
with no customer-visible choice. Every catalog entity uses a stable internal identifier, independent
of display name, slug, or any external system identifier. Products, variants, modifier groups, and
modifier options follow a `DRAFT` → `ACTIVE` → `RETIRED` lifecycle, changes become customer-visible
only through an explicit draft-and-publish workflow, and historically referenced catalog entities are
never hard deleted. Customer customization uses structured modifier groups and options, validated
authoritatively on the server; free-text customer instructions are a separate, non-authoritative
concern. Standard products and bundles are both supported; nested bundles are rejected for V1.
Dietary, allergen, and media metadata belong to the Catalog module and are brand-controlled. Downstream
assortment scopes may narrow but never broaden an upstream exclusion, using `INHERIT`, `INCLUDED`, and
`EXCLUDED` decision states. Operational availability, outlet-wide ordering pause, and visibility are
each distinct from catalog lifecycle and from assortment. The same effective-menu resolution logic
serves every customer channel. Checkout always authoritatively revalidates catalog, assortment,
availability, modifier, bundle, and outlet state; silent substitution is prohibited; and every order
retains an immutable catalog snapshot independent of later catalog changes.

This is an accepted, final decision for BOBA Bear's food-catalog, menu, assortment, and availability
domain model — not a recommendation or a provisional option. It fixes domain boundaries, lifecycle,
inheritance, and revalidation rules; it does not fix the catalog database schema, the exact stable
identifier format, the exact revision or publication storage model, media-processing implementation,
search implementation, localization implementation, or pricing — see
[Explicit Non-Decisions](#explicit-non-decisions).

## Catalog, Menu, Assortment, Availability, and Pricing Separation

BOBA Bear's food-catalog domain resolves a customer-facing menu through a fixed hierarchy:

```text
Canonical brand catalog
        ↓
Published menu
        ↓
Territory assortment
        ↓
Organization assortment
        ↓
Outlet assortment
        ↓
Current operational availability
        ↓
Effective customer menu
```

A product being active in the brand catalog does not automatically make it orderable at every outlet.
Five concerns remain distinct and must not collapse into a single status field:

**Catalog** defines what a BOBA Bear product is: product identity, name and description,
classification, variants, modifier groups, modifier options, bundle composition, kitchen-facing
labels, dietary and allergen metadata, media references, product lifecycle, and brand-controlled
standards.

**Menu** defines how catalog products are presented to customers: menu identity, customer-facing
sections, product placement, display ordering, featured placement, sales context, active schedule,
publication state, and revision.

**Assortment** defines whether a catalog product is permitted to be offered at a territory,
organization, or outlet scope.

**Availability** defines whether an otherwise valid and permitted item can be ordered operationally at
a specific outlet and time.

**Pricing** defines monetary values and calculations, and remains outside this decision, governed by
the Pricing module and fixed in full by
[ADR-007](./ADR-007-pricing-tax-charges-promotions.md). ADR-006 defines product and customization
identity; ADR-007 defines authoritative prices, discounts, charges, tax, and monetary snapshots.
Catalog records do not own authoritative prices.

## Brand-Owned Canonical Catalog

The BOBA Bear brand owns canonical food and beverage product definitions. Brand-controlled information
includes product identity, product name, product description, category, product images and media
metadata, variant structure, modifier structure, customer-facing dietary information, customer-facing
allergen information, kitchen-facing labels, brand standards, override permissions or field-locking
policy, and product lifecycle. This extends the brand-controlled catalog data already locked in
[`organization-outlet-access-model.md`](../organization-outlet-access-model.md#catalog-inheritance).

For V1: authorized brand staff create and modify canonical products; outlet staff do not independently
create BOBA Bear products; franchise organizations do not redefine canonical product identity or
brand standards; outlet managers control operational availability within their authorized outlet
scope; territory or organization assortment authority exists only where explicitly delegated; and
future local-product proposals may be introduced later but require brand approval.

## Categories and Menu Sections

Categories and menu sections remain separate. A **category** is a stable product classification (for
example, boba drinks, refreshers, burgers, wraps, Korean street food, desserts). A **menu section** is
a customer-facing merchandising or presentation placement (for example, bestsellers, the bar, the
plates, sweet side, limited drop, combos). A product may belong to one primary category, appear in
multiple menu sections, appear in different sections in different menus, and be removed from one
section without changing its category. Merchandising must not redefine a product's canonical
classification.

## Product and Variant Model

A **product** represents the customer-recognizable item (for example, Taro Boba, Double Cheese Double
Patty Burger, Korean Chicken Wrap). A **variant** represents the orderable form of that product (for
example, Taro Boba in 350 ml and 500 ml).

**Every orderable product must have at least one variant.** A product with no visible customer choice
still receives an internal default variant, which may remain hidden in the customer interface (for
example, Double Cheese Double Patty Burger → Standard). The variant is the atomic catalog unit for
cart selection, availability, pricing reference, kitchen preparation, order snapshots, future POS
mapping, and future channel integrations. Ordering logic must not branch separately for products with
and without customer-visible variants.

## Stable Internal Identifiers

Every catalog entity — product, variant, category, modifier group, modifier option, menu, menu
section, product placement, bundle, bundle component group, bundle component, media asset, and
publication revision — uses a stable internal identifier. Display names are not identifiers; URL slugs
are not identifiers; identifiers are not reused; product or variant renaming does not change product
or variant identity; retired records remain identifiable in historical orders; and external system
identifiers (Petpooja, aggregator, payment, delivery, or future POS identifiers) must be stored through
separate mappings and must never become BOBA Bear primary identifiers. The exact identifier format
remains open.

## Product Lifecycle

Products, variants, modifier groups, and modifier options support a lifecycle:

```text
DRAFT
ACTIVE
RETIRED
```

**Draft** — editable, not customer-visible, not orderable, may be previewed by authorized staff.
**Active** — eligible for publication, eligible for assortment, potentially orderable when all other
rules pass. **Retired** — cannot be added to new menus, carts, bundles, or modifier configurations, but
remains available for historical orders, refunds, audit, and reporting, and must not be hard deleted
when historically referenced.

Operational unavailability must not be represented by retiring the catalog entity — see
[Operational Availability](#operational-availability).

## Draft and Publication Workflow

Catalog changes must not become customer-visible solely because an underlying record changed. BOBA
Bear uses a draft-and-publish model:

```text
Edit draft
    ↓
Validate catalog structure
    ↓
Publish
    ↓
Create or activate an effective revision
    ↓
Customer menu resolves the new revision
```

Publication validation should eventually include: active products have at least one active variant;
required modifier groups have valid selectable options; modifier applicability references valid
variants; minimum selections do not exceed maximum selections; option quantity limits are valid;
bundle components reference valid variants; bundle references are non-circular; retired entities are
not newly referenced; required customer-facing content is present; and required media rules are
satisfied where configured. Menu sections and placements must reference valid entities. The exact
revision-storage and publication implementation remains open.

## Menu Publication

BOBA Bear supports one or more menus by selling context. A menu may conceptually include a stable
identity, name, scope, sales channel or context, schedule, sections, product placements, publication
state, and revision. Menu publication states may include:

```text
DRAFT
SCHEDULED
ACTIVE
ARCHIVED
```

V1 may use one active direct-order menu for Dehradun. The model must support future breakfast menus,
late-night menus, dine-in menus, delivery menus, city-specific menus, outlet-specific menus,
limited-time menus, and drop menus. Exact channel-specific menu behaviour remains open.

## Modifier Groups and Modifier Options

Customer customization uses structured modifier groups (for example, sugar level, ice level, extra
add-ons). A modifier group should eventually support a stable identifier, customer-facing name,
kitchen-facing label, required or optional status, minimum selections, maximum selections, display
order, default selection where applicable, maximum quantity per option, product applicability, variant
applicability, and lifecycle state. A modifier option should eventually support a stable identifier,
customer-facing label, kitchen-facing label, lifecycle state, operational availability, maximum
quantity, dietary metadata where relevant, allergen metadata where relevant, and a pricing reference
owned by the Pricing module. Authoritative monetary values must not be placed inside the Catalog
module's approved ownership boundary.

## Modifier Validation

The following rules are locked: structured modifier selections are the source of truth for
customization; required groups must satisfy minimum selection rules; selection count must not exceed
the configured maximum; repeatable options must define a quantity limit; modifier groups may apply to
all variants or a defined subset; modifier options may be operationally unavailable by outlet; required
groups with no valid available choices make the product unorderable; every customer selection must be
revalidated by authoritative server logic; client-side validation is for usability only; client-
calculated modifier validity is never authoritative; and invalid or unavailable modifier selections
must block checkout.

## No Arbitrary Conditional Modifier Scripting in V1

V1 must not support a generic expression or scripting language for customization rules (for example, a
rule such as "if size is 500 ml and sugar is 25%, enable option X unless outlet Y..."). Explicit
applicability relationships are used instead — a modifier group applies to specific variants, a
modifier option applies only to a specific variant, a modifier option is unavailable at a specific
outlet, a modifier group requires one selection, a modifier group allows no more than a fixed number of
selections. This keeps customization explainable, testable, and auditable.

## Free-Text Customer Instructions

Free-text customer instructions are separate from structured modifiers (for example, "pack sauce
separately," "call on arrival," "avoid excessive ice where operationally possible"). Free text must not
alter price, must not replace required structured selections, and must not be interpreted as a
guaranteed ingredient removal. Kitchen-critical customization must use structured modifiers.
Instructions require configurable length limits, must be snapshotted into the order, and may be
disabled or restricted for selected products. Unsafe or abusive content handling remains an
implementation concern.

## Standard Products and Bundles

The catalog supports two product structures:

```text
STANDARD
BUNDLE
```

A **standard product** contains one or more variants and zero or more modifier groups. A **bundle**
represents a combo or meal composed of component groups (for example, a burger meal requiring a chosen
burger, chosen fries, and chosen drink). A bundle component group may conceptually define allowed
products or variants, minimum selections, maximum selections, required or optional state, a default
component, modifier eligibility, and quantity limits.

**Bundle safeguards:** a bundle must not reference itself; circular bundle references are prohibited;
nested bundles are rejected for V1; required component groups must contain at least one valid choice;
bundle components must resolve to valid variants; if a required component has no available choice, the
bundle is unorderable; and bundle price and upgrade calculations belong to the Pricing module.

Configurable bundles may be implemented after launch if the launch menu does not require them; the
domain direction is approved, but configurable bundle support for the initial launch is **provisional**
and dependent on the confirmed launch menu.

## Food and Merchandise Separation

This decision governs the food and beverage catalog only. Food and merchandise must not be forced into
one fulfilment domain. Merchandise may later reuse selected concepts such as product identity, variant,
presentation media, and publication, but merchandise has different stock semantics, shipping, returns,
tax treatment, fulfilment lifecycle, order timing, and checkout requirements. A separate merchandise
domain remains the approved future direction, consistent with
[`v1-product-scope.md`](../v1-product-scope.md#merchandise-and-gated-drops).

## Dietary and Allergen Information

The food catalog supports customer-facing metadata such as vegetarian, non-vegetarian, vegan where
verified, contains dairy, contains nuts, contains gluten, spice level, allergen declarations, and
serving description. Dietary and allergen claims come from authorized brand data; outlet staff must
not independently change brand allergen declarations; brand-level changes require audit; and
customer-facing allergen information must be included in order snapshots where legally or
operationally required. Ingredient-level inventory and recipe consumption, and a full
nutrition-calculation engine, remain outside V1. The exact compliance-review and approval workflow
remains open.

## Product Media

Catalog media metadata belongs to the Catalog module. File content is stored in DigitalOcean Spaces
under [ADR-001](./ADR-001-digitalocean-platform.md). A product may support a primary image, gallery
images, video, alternative text, display order, publication status, asset revision, and an
object-storage reference. Database records store media metadata and object references; provider-
specific public URLs must not become permanent domain identifiers; product-image changes do not alter
product identity; missing required media may block publication where configured; and media changes
require appropriate authorization and audit. Exact image processing, transformation, CDN, upload, and
moderation behaviour remain open.

## Assortment Inheritance

An active brand product is not automatically orderable at every outlet:

```text
Brand product is active
        ↓
Territory permits or excludes it
        ↓
Organization inherits or excludes it
        ↓
Outlet inherits or excludes it
        ↓
Operational availability permits ordering
```

**Narrowing rule:** downstream scopes may narrow inherited assortment but must not broaden it beyond an
upstream exclusion. A territory cannot enable a product that is inactive or retired at brand level; an
organization cannot enable a product excluded by the territory; an outlet cannot enable a product
excluded by its organization; an outlet may exclude a product permitted by all parent scopes; a
brand-level withdrawal disables the product across all descendant scopes; and franchise organizations
cannot override locked brand exclusions.

For the initial Dehradun COCO outlet:

```text
BOBA Bear brand catalog
        ↓
Dehradun territory assortment
        ↓
Corporate organization inheritance
        ↓
Initial outlet inheritance
        ↓
Outlet operational availability
```

The first release may contain few or no explicit assortment overrides. The inheritance foundation must
still exist conceptually to avoid later redesign.

## Assortment Decision States

A scoped assortment decision supports:

```text
INHERIT
INCLUDED
EXCLUDED
```

`INHERIT` uses the effective decision from the parent scope. `INCLUDED` explicitly includes where
upstream scopes permit it. `EXCLUDED` explicitly prevents offering at this scope and its affected
descendants. Absence of an explicit override normally behaves as inheritance. The effective assortment
resolver should eventually return the final inclusion result, the determining scope, and a reason or
decision path — important for support, franchise, and catalog administration. The exact persistence
representation remains open.

## Operational Availability

Availability is separate from catalog lifecycle, menu publication, assortment, and pricing.
Conceptual availability states are:

```text
AVAILABLE
TEMPORARILY_UNAVAILABLE
SOLD_OUT
```

Availability may apply to an entire outlet, a product, a variant, a modifier option, or a bundle
component. An availability change should eventually capture a target entity, outlet, availability
state, reason, effective timestamp, optional resume timestamp, actor or source, correlation
identifier, and audit context (for example: 500 ml cups are unavailable; extra cheese is sold out; a
burger is temporarily unavailable; a required bundle drink is unavailable; the outlet has paused new
orders).

## Outlet-Wide Ordering State

An outlet can pause direct ordering without changing each product individually. Conceptual
outlet-ordering states include:

```text
ACCEPTING_ORDERS
TEMPORARILY_PAUSED
CLOSED_BY_SCHEDULE
SUSPENDED
```

Possible reasons include kitchen overload, equipment failure, staff shortage, delivery disruption, and
emergency closure. Outlet pause affects all direct ordering for that outlet; administrative access may
remain available; customer-facing messaging must remain safe and understandable; suspension may be
imposed at a broader organizational or platform level; and resume behaviour must be auditable. Exact
pause, expiry, and recovery workflow remains open.

## Visibility and Orderability

Visibility and orderability are separate outcomes. An effective menu item may be:

```text
VISIBLE_AND_ORDERABLE
VISIBLE_UNAVAILABLE
HIDDEN
```

A sold-out bestseller may remain visible with a sold-out state; a retired product is hidden from
active menus; a territory-excluded product is hidden; a future item may be visible as coming soon but
not orderable; and a temporarily unavailable product may remain visible depending on menu policy. The
publication and visibility policy determines whether unavailable items remain visible. The exact
policy configuration remains open.

## Effective-Menu Resolution

The customer-facing menu is resolved for a specific context, conceptually taking brand, territory,
organization, outlet, current time, sales context, and customer eligibility where applicable as input:

```text
Published menu
    ∩ active catalog entities
    ∩ inherited assortment
    ∩ outlet availability
    ∩ active schedule
    ∩ visibility policy
    =
Effective customer menu
```

The result should eventually include an effective menu revision, catalog revision, outlet context,
product and variant visibility, current modifier validity, current availability information, and a
safe reason or display state where relevant. The same effective-menu service must support the BOBA
Bear PWA, WhatsApp-assisted ordering, and future native Android, iOS, and other direct customer
channels. Channel presentation may differ, but product, variant, modifier, and availability rules must
remain consistent.

## Availability Propagation

Operational availability changes (product sold out, variant unavailable, modifier option unavailable,
outlet paused, bundle component unavailable) must take effect quickly. The customer experience may
later use polling, cache invalidation, Server-Sent Events, WebSockets, or another approved realtime
approach; the exact communication method remains open. Regardless of interface freshness, checkout
must always revalidate authoritative catalog, assortment, menu schedule, modifier, bundle, outlet, and
availability state.

## Cart References and Revalidation

A cart stores customer selections, not a permanent guarantee of availability or validity. A cart item
should conceptually reference a product identifier, variant identifier, selected modifier-group and
modifier-option identifiers, modifier quantities, bundle selections where applicable, quantity,
observed catalog revision, observed menu revision, and outlet identifier.

Before final checkout, the platform must validate that: the product remains active; the variant
remains active; the product remains published; the product remains in effective assortment; the
product remains available; the variant remains available; selected modifier groups remain applicable;
selected modifier options remain active and available; required modifier groups remain satisfiable;
minimum and maximum rules remain satisfied; bundle components remain valid and available; the menu
schedule remains active; the outlet remains the selected fulfilment outlet; and the outlet remains
capable of accepting orders.

## No Silent Cart Substitution

The platform must not silently substitute a product, variant, modifier option, bundle component,
quantity, outlet, customer instruction, or product structure. When selections are no longer valid, the
affected cart item must be clearly identified, the customer must be informed, the customer must review
and confirm any replacement or removal, and checkout must remain blocked until the required correction
is complete. This rule protects customer intent and order accuracy.

## Immutable Order Catalog Snapshots

At order creation, the Orders module must store immutable catalog snapshots. Snapshot content should
eventually include the product internal identifier, product code where applicable, product display
name, product type, variant identifier, variant display label, modifier-group identifiers and labels,
modifier-option identifiers and labels, selected option quantities, bundle component identifiers and
labels, kitchen-facing labels, customer instructions, dietary and allergen information where required,
catalog revision, menu revision, outlet context, and relevant presentation metadata where necessary
for support. Later catalog changes must not alter historical order meaning. Pricing, discount, tax,
packaging, and delivery-charge snapshots are governed by
[ADR-007](./ADR-007-pricing-tax-charges-promotions.md#immutable-order-monetary-snapshots), consistent with the order-snapshot
principle already locked in
[`order-payment-delivery-model.md`](../order-payment-delivery-model.md#order-ownership-and-historical-snapshots).

## Catalog-Administration Authority

**Brand Catalog Manager** may be permitted to create product drafts, edit canonical product content,
manage variants, manage modifier groups and options, manage bundle composition, manage menu
presentation, manage product media, maintain dietary and allergen data, publish catalog and menu
revisions, and retire catalog entities.

**Territory or organization administrator** may, where explicitly delegated, include or exclude
brand-approved products, manage permitted local assortment, manage permitted local menu placement, and
view effective catalog-resolution explanations. Must not change locked brand product standards.

**Outlet Manager** may be permitted to mark products, variants, and modifier options unavailable,
resume availability, pause and resume outlet ordering, view effective assortment, and report catalog
issues. Must not independently redefine canonical product identity or modifier structure. This is
consistent with the Outlet Manager scope already locked in
[ADR-005](./ADR-005-organization-outlet-authorization.md#v1-system-roles).

## Catalog and Availability Audit Requirements

Audit events are required for: product creation; product publication; product retirement; variant
creation; variant activation or retirement; modifier-group creation or change; modifier-option
creation or change; bundle composition change; menu publication; menu archival; assortment inclusion;
assortment exclusion; product availability change; variant availability change; modifier-option
availability change; outlet ordering pause; outlet ordering resume; dietary or allergen change;
product-media change; and bulk catalog operation. Audit context should conceptually capture actor,
actor scope, target, before state, after state, reason where required, effective time, and correlation
identifier, extending the general audit requirement already locked in
[`architecture-foundation.md`](../architecture-foundation.md#audit-requirements).

## Catalog Integrity Requirements

The approved integrity requirements include: active products have at least one active variant; stable
identifiers are unique; display names and slugs are not identities; required modifier groups have
valid selectable options; minimum selections do not exceed maximum selections; option quantity limits
are valid; modifier applicability references valid variants; bundle references do not form cycles;
nested bundles are prohibited in V1; retired entities cannot be newly selected; published menus cannot
reference invalid entities; downstream assortment cannot broaden an upstream exclusion; historical
referenced records are not hard deleted; required bundle groups must remain satisfiable; required
modifier groups must remain satisfiable; and checkout cannot rely on stale client catalog state. These
requirements must later be covered by domain tests, integration tests, database constraints where
appropriate, and architecture tests where applicable, per
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#testing-structure).

## Consequences

### Positive

- A single canonical brand catalog with explicit assortment and availability layers lets BOBA Bear
  launch a single-outlet Dehradun menu while supporting future multi-territory, multi-organization,
  and franchise-narrowed assortment without a foundational redesign.
- Separating catalog, menu, assortment, availability, and pricing prevents a generic product-status
  field from becoming an unmanageable source of ambiguity as more outlets and menus are added.
- Mandatory default variants and stable internal identifiers keep cart, order, and future POS or
  channel integrations consistent regardless of whether a product exposes customer-visible choice.
- A shared effective-menu resolution service keeps the PWA and WhatsApp channels consistent without
  duplicating catalog, assortment, or availability logic per channel.
- Mandatory checkout revalidation and the no-silent-substitution rule protect customer intent and
  order accuracy even as availability changes quickly after a cart is built.
- Immutable order catalog snapshots keep historical orders stable regardless of later catalog,
  assortment, or menu changes.

### Trade-offs accepted

- The draft-and-publish, assortment-inheritance, and availability layers add domain complexity beyond
  a single flat product list, accepted because a single-outlet launch must not require a later
  foundational catalog rewrite once more outlets or territories exist.
- Rejecting arbitrary modifier scripting and nested bundles in V1 limits customization flexibility in
  exchange for explainable, testable, and auditable customization rules.
- Requiring authoritative server-side revalidation before checkout adds a mandatory validation step to
  every order, accepted to prevent stale-cart or stale-availability defects from reaching payment.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| A generic product-status field is used instead of separate catalog, menu, assortment, and availability concepts | This ADR locks the five-concern separation and prohibits merging them, per [Catalog, Menu, Assortment, Availability, and Pricing Separation](#catalog-menu-assortment-availability-and-pricing-separation) |
| A product without a variant breaks cart, pricing, or kitchen logic that assumes a variant always exists | Every orderable product requires at least one variant, including a hidden default variant, per [Product and Variant Model](#product-and-variant-model) |
| Stale client-side catalog or availability state allows an invalid item to reach checkout | Mandatory authoritative checkout revalidation across catalog, assortment, availability, modifier, bundle, and outlet state, per [Cart References and Revalidation](#cart-references-and-revalidation) |
| A cart item is silently changed or removed without customer awareness | The no-silent-substitution rule requires explicit customer review and confirmation before any replacement or removal, per [No Silent Cart Substitution](#no-silent-cart-substitution) |
| A later catalog change alters the meaning of a historical order | Immutable order catalog snapshots are mandatory at order creation, per [Immutable Order Catalog Snapshots](#immutable-order-catalog-snapshots) |
| A franchise or outlet broadens assortment beyond what a parent scope permits | The narrowing rule prohibits downstream scopes from broadening an upstream exclusion, per [Assortment Inheritance](#assortment-inheritance) |
| Arbitrary modifier scripting becomes unauditable or unexplainable as rules accumulate | Explicit applicability relationships are required instead of a scripting language, per [No Arbitrary Conditional Modifier Scripting in V1](#no-arbitrary-conditional-modifier-scripting-in-v1) |

## Explicit Non-Decisions

This decision does not resolve the following, which remain **Open** or **Provisional** and must not be
treated as answered by this ADR:

- Exact catalog database schema
- Exact table names
- Exact stable identifier format
- Exact catalog-revision representation
- Exact publication-storage model
- Exact draft-copy strategy
- Exact menu-scheduling granularity
- Exact channel-specific menu behaviour
- Exact assortment persistence structure
- Exact effective-menu caching
- Exact cache-invalidation approach
- Exact availability-propagation technology
- Exact media-upload process
- Exact image-processing pipeline
- Exact CDN behaviour
- Exact product-search technology
- Exact slug policy
- Exact allergen approval workflow
- Exact dietary compliance-review workflow
- Exact free-text instruction limits
- Exact unsafe-content handling
- Exact bundle-upgrade pricing
- Whether configurable bundles are required in the initial launch (**Provisional**, dependent on the
  confirmed launch menu)
- Exact local-product proposal workflow
- Exact menu preview workflow
- Exact publication approval workflow
- Exact localization implementation
- Exact visibility-policy configuration
- Pricing architecture in full (governed separately by [ADR-007](./ADR-007-pricing-tax-charges-promotions.md))

## Rejected and Deferred Alternatives

- **Outlet-owned independent product definitions** — rejected for BOBA Bear canonical food products.
- **Franchise ability to broaden excluded assortment** — rejected.
- **Product records without variants** — rejected for orderable products.
- **Display name or slug as primary identity** — rejected.
- **Hard deletion of historical catalog entities** — rejected.
- **Free-text instructions as the primary customization model** — rejected.
- **Arbitrary modifier scripting** — rejected for V1.
- **Nested bundles** — rejected for V1.
- **Food and merchandise forced into one fulfilment catalog** — rejected.
- **Ingredient inventory and recipe accounting** — deferred.
- **Advanced localization and search** — deferred or open.

## Cross-Reference: ADR-008 Cart and Checkout Revalidation

This ADR governs product, assortment, and availability validation — what a product is, and whether it
is permitted and operationally available. [ADR-008](./ADR-008-serviceability-cart-checkout.md)
governs cart and checkout revalidation — when and how those rules are re-checked against a customer's
cart during checkout orchestration. Cart presence does not reserve product availability, per
[No Cart-Stage Reservation](./ADR-008-serviceability-cart-checkout.md#no-cart-stage-reservation);
checkout must revalidate catalog and availability before order creation, per
[ADR-008](./ADR-008-serviceability-cart-checkout.md#checkout-orchestration-sequence), extending this
ADR's [Cart References and Revalidation](#cart-references-and-revalidation) and
[No Silent Cart Substitution](#no-silent-cart-substitution) sections rather than replacing them.

## Cross-Reference: ADR-010 Post-Payment Availability Changes

Outlet-wide pause and operational availability changes fixed by this ADR affect new orders; they do
not erase an existing paid order's obligations. When a confirmed order can no longer be fulfilled as
agreed because a product, variant, or modifier option becomes unavailable after payment, the outlet
does not silently substitute — the situation is handled through
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#no-silent-substitution)'s rejection,
exception, cancellation, or customer-resolution workflow, never by this ADR's availability model
alone.

## Cross-Reference: ADR-013 Catalog Persistence Conventions

The catalog schema items listed under [Explicit Non-Decisions](#explicit-non-decisions) — the exact
catalog database schema, table names, revision and publication storage model, and assortment
persistence structure — remain open. They are now constrained, however, by the general persistence
conventions fixed in
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#naming-conventions): Catalog and
Availability each own their tables and repositories, identifiers, timestamps, and business-state
columns follow the platform-wide storage conventions, and any catalog schema change ships as a
reviewed migration. ADR-013 does not fix the catalog data model; it fixes the conventions that model
must be expressed in.

## Related Canonical Documents

- [`architecture-foundation.md`](../architecture-foundation.md) — the Catalog and Availability module
  references and audit requirements this decision implements in detail.
- [ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md) — the persistence decision that
  fixes the storage conventions the still-open catalog schema must follow, per the cross-reference
  above.
- [`organization-outlet-access-model.md`](../organization-outlet-access-model.md) — the brand,
  territory, organization, and outlet catalog-inheritance principle this decision fully specifies for
  food and beverage products.
- [ADR-001](./ADR-001-digitalocean-platform.md) — the DigitalOcean Spaces object storage this
  decision's product-media metadata references.
- [ADR-003](./ADR-003-modular-monolith-node-typescript.md) — the module boundaries and dependency
  rules the Catalog and Availability modules must follow.
- [ADR-005](./ADR-005-organization-outlet-authorization.md) — the Brand Catalog Manager, Outlet
  Manager, and delegated-administration authority this decision's catalog-administration section
  builds on.
- [ADR-007](./ADR-007-pricing-tax-charges-promotions.md) — the pricing, tax, charge, and promotion
  decision that fixes authoritative monetary values, discounts, and order monetary snapshots this
  decision explicitly excludes from Catalog ownership.
- [`order-payment-delivery-model.md`](../order-payment-delivery-model.md) — the cart, checkout, and
  order-snapshot principles this decision extends with catalog-specific revalidation and snapshot
  content.
- [ADR-008](./ADR-008-serviceability-cart-checkout.md) — the cart, checkout-orchestration, and
  pre-payment-order decision that revalidates the catalog and availability rules fixed by this ADR
  during checkout, per the cross-reference above.
- [`v1-product-scope.md`](../v1-product-scope.md) — the V1 customer-facing menu, variant, modifier,
  and availability experience this decision must support.
- [ADR-010](./ADR-010-order-lifecycle-operations-console.md) — the post-payment rejection, exception,
  and no-silent-substitution decision that governs unavailability discovered after payment, per the
  cross-reference above.
- [`roadmap-and-open-decisions.md`](../roadmap-and-open-decisions.md) — the open decisions this ADR
  does not resolve.
- [`decision-register.md`](../decision-register.md) — the structured register entries this ADR locks.
- [`README.md`](../README.md) — the canonical documentation index and update protocol.
