---
Status: CURRENT
Governance status: CURRENT
Implementation note: Invoice/credit-note intent maps to ROADMAP IMP-028 (not implemented)
Decision date: 2026-08-02
Last updated: 2026-08-11
---

# ADR-007: Pricing, Tax, Charges, and Promotions

## Status

**CURRENT** for pricing, tax, charges, and promotions architectural intent, read together with
accepted IMP-015 / IMP-016 implementation in [`STATE.md`](../STATE.md).

Invoice / tax receipt / credit-note **architecture intent** in this ADR remains valid and is
roadmapped as **IMP-028** in [`ROADMAP.md`](../ROADMAP.md). That future linkage is **not**
implementation completion.

## Decision Date

2026-08-02

## Decision Owners

BOBA Bear founder and product leadership

## Context

[`architecture-foundation.md`](../architecture-foundation.md) lists Pricing as a distinct logical
module and explicitly defers it — "Price books and price resolution (deferred in full to ARCH-07)" —
and [`organization-outlet-access-model.md`](../organization-outlet-access-model.md#pricing-foundation)
locks the principle that pricing is modeled through price books, not a single permanent price
attached to a product, so that city, territory, organization, outlet, channel, and promotional
pricing can be added without restructuring how price attaches to a product.
[`order-payment-delivery-model.md`](../order-payment-delivery-model.md) locks that historical orders
must not change when live catalog, prices, or organizational configuration changes later, but leaves
pricing, discount, tax, packaging, and delivery-charge snapshot content to this future decision.
[ADR-006](./ADR-006-food-catalog-assortment-availability.md) fixes the food catalog, variant,
modifier, bundle, and availability model and explicitly excludes authoritative monetary values from
the Catalog module's ownership, deferring price resolution, bundle-upgrade pricing, and all pricing
architecture to this ADR.

None of the documents above fix how a specific outlet, legal entity, customer, channel, cart,
delivery context, and point in time resolve to an authoritative price; how currency and monetary
values are represented and calculated without floating-point error; how taxes, packaging charges,
delivery charges, and promotions are modeled and combined into a final payable amount; how India
Goods and Services Tax (GST) treatment is configured without being hard-coded as permanent business
logic; how discounts are allocated across order lines; how a pricing quote becomes immutable and is
validated before payment; or how historical order monetary data remains stable when pricing, tax, or
promotion policy later changes. This ADR resolves the Pricing module's domain model, currency and
monetary representation, price books and their hierarchy, effective-price resolution, tax-inclusion
modes and the effective-dated tax-policy model, the provisional initial GST profile, packaging and
delivery charges, the V1 explicit-charge policy, the deterministic calculation order, the promotion
model and its compatibility and funding rules, atomic promotion redemption, immutable pricing quotes
and quote revalidation, the explainable monetary breakdown, deterministic discount allocation and
rounding, immutable order monetary snapshots, cancellation and refund allocation, the invoice
boundary, and the aggregator-order boundary, so that the Pricing module referenced in
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#initial-module-boundaries) can be
implemented against a fixed domain foundation rather than ad hoc, per-change decisions.

BOBA Bear's initial direct-order launch is a single Dehradun cloud-kitchen outlet selling restaurant
food and beverages. Indian GST treatment for restaurant services, packaging, and delivery carries
real legal and financial consequence and is not fully settled at the time of this decision. This ADR
therefore draws a firm boundary between approved platform architecture, a provisional tax
configuration adopted so implementation can proceed, and final legal, GST, invoicing, and accounting
determinations that still require validation against official sources and professional advice before
commercial launch. Nothing in this ADR constitutes legal or tax advice, and the platform must never
hard-code a tax assumption as permanent business logic.

## Regulatory and Validation Boundary

This ADR distinguishes three categories of content, and no reader should collapse them:

1. **Approved platform architecture** — the Pricing module's domain model, monetary representation,
   price-book and tax-policy structures, calculation order, promotion model, quote lifecycle,
   discount allocation, rounding approach, and snapshot and audit requirements. These are Locked
   architectural decisions.
2. **Provisional tax configuration** — a specific, currently assumed GST rate and treatment for
   BOBA Bear's initial restaurant-service supply, adopted so that the approved architecture above can
   be implemented and tested. This configuration is not a final legal conclusion.
3. **Final legal, GST, invoicing, and accounting determinations** — the confirmed GST classification,
   registration, legal entity, place of supply, invoice treatment, input-tax-credit treatment, and
   accountant or GST-adviser approval required before commercial launch. These remain open and are
   explicitly out of scope for this ADR to resolve.

BOBA Bear's initial direct cloud-kitchen restaurant-service configuration is provisionally expected
to use 5% GST without input tax credit, subject to validation against current official GST sources,
BOBA Bear's GST registration, legal entity, place of supply, invoice model, and accountant or
GST-adviser approval before commercial launch. This is a provisional working configuration, not a
final legal conclusion, and must not be treated as legal or tax advice.

Restaurant orders supplied through notified third-party e-commerce operators (aggregators) follow a
separate statutory and commercial flow from BOBA Bear's own direct orders; BOBA Bear direct-order and
aggregator-order financial calculations remain separate, consistent with the
[Aggregator-Order Boundary](#aggregator-order-boundary) below. Packaging charges, delivery charges,
merchandise, and any future charge type must each receive its own approved tax category — the
platform must never assume that every charge automatically carries restaurant-service tax treatment.
Changes in law or in approved tax treatment must be handled through new effective-dated tax-policy
revisions, never by rewriting historical orders.

Where this ADR or any implementation built on it needs to reference external tax authority, it must
cite only official Central Board of Indirect Taxes and Customs (CBIC) or official GST sources by
name, generically — never blogs, vendor articles, or unofficial summaries — and must not fabricate
specific URLs or citations.

## Decision Summary

BOBA Bear will own a **Pricing module**, distinct from Catalog, that determines the authoritative
monetary result for a specific outlet, legal entity, customer, channel, cart, delivery context, and
date/time:

```text
Catalog selection
    + Effective price book
    + Applicable explicit charges
    + Eligible promotions
    + Approved tax policy
    + Delivery quote
    =
Authoritative pricing quote
```

Catalog entities never own authoritative monetary values, consistent with the boundary already
locked in [ADR-006](./ADR-006-food-catalog-assortment-availability.md#modifier-groups-and-modifier-options).
The same Pricing module serves the BOBA Bear customer PWA, WhatsApp-assisted ordering, future native
apps, the Operations Console, a future counter POS, customer-support recalculation, refund
allocation, and financial reconciliation.

The initial platform currency is Indian Rupees (INR). Currency is recorded on every price entry,
quote, order, payment, refund, credit, invoice input, delivery quote, and reconciliation record.
Final authoritative monetary values persist as integer minor units (paise); intermediate monetary
calculations use decimal arithmetic; JavaScript binary floating-point arithmetic must never be used
for authoritative monetary calculations.

Pricing is expressed through effective-dated, lifecycle-managed **price books**, arranged in a brand
→ territory → organization → outlet hierarchy with explicit override, lock, floor, and ceiling
policy. Prices resolve deterministically for a given scope, outlet, channel, and date/time, in either
tax-exclusive or tax-inclusive mode, against effective-dated **tax policies** that keep GST rates and
classifications out of hard-coded application logic. Packaging charges and delivery charges are
explicit, separately tracked monetary lines, distinct from delivery-provider cost and any
merchant-funded subsidy. V1 supports only a fixed set of explicit charge types and no generic
platform or convenience fee. A versioned, deterministic calculation order combines catalog prices,
promotions, packaging, delivery, and tax into a final payable total, with deterministic discount
allocation and rounding. A structured **promotion model** supports automatic and coupon-based
discounts with explicit compatibility rules and atomic redemption. Checkout produces an **immutable
pricing quote**, revalidated before payment, and every order retains an **immutable monetary
snapshot** that later pricing, tax, or promotion changes must never alter. Cancellations and refunds
reuse the original order's price, discount, and tax allocations. BOBA Bear's own Pricing module
governs direct orders only — aggregator-channel monetary calculations remain outside its scope.

This is an accepted, final decision for BOBA Bear's pricing, tax, charge, and promotion domain
architecture — not a recommendation or a provisional option, except where a specific item is
explicitly marked provisional or open below. It fixes the Pricing module's domain boundaries,
monetary representation, price-book and tax-policy structure, calculation order, promotion model,
quote lifecycle, discount-allocation approach, and snapshot and audit requirements. It does not fix
the exact decimal-arithmetic library, rounding mode, final GST classification or rate, packaging or
delivery tax category, exact packaging amount, exact delivery-pricing policy, payment provider, or
several other implementation and legal details — see
[Explicit Non-Decisions](#explicit-non-decisions).

## Pricing-Module Boundary

The **Catalog module**, fixed by [ADR-006](./ADR-006-food-catalog-assortment-availability.md),
defines what is sold — product identity, variants, modifier structure, bundle composition, and
media. The **Pricing module** determines the authoritative monetary result for a specific outlet,
legal entity, customer, channel, cart, delivery context, date/time, and promotion context. Catalog
entities may reference a price by identifier; they must not own an authoritative monetary value.

The Pricing module is the single source of authoritative monetary calculation for BOBA Bear direct
orders, and the same module and calculation logic must support:

- The BOBA Bear customer PWA
- WhatsApp-assisted ordering
- Future native customer applications
- The Operations Console
- A future counter point-of-sale system
- Customer-support recalculation and quote explanation
- Refund allocation
- Financial reconciliation

A channel-specific or duplicated pricing implementation is rejected — every channel must call the
same Pricing module boundary, consistent with the shared effective-menu principle already locked in
[ADR-006](./ADR-006-food-catalog-assortment-availability.md#effective-menu-resolution).

## Currency and Monetary Representation

The initial platform currency is **INR**. Currency must be recorded on every price entry, pricing
quote, order, payment, refund, credit, invoice input, delivery quote, and reconciliation record —
currency is never implied or defaulted silently.

Final authoritative monetary values persist as **integer minor units** — paise for INR, where ₹1.00
equals 100 paise. A monetary value is conceptually shaped as:

```text
{ currency: "INR", minorUnits: 14900 }   // ₹149.00
```

Intermediate monetary calculations — percentage discounts, tax calculations, proportional
allocations, tax-inclusive extraction, tax-exclusive addition, rounding, and residual distribution —
must use a decimal-arithmetic implementation. **JavaScript binary floating-point arithmetic must
never be used for authoritative monetary calculations.** The exact decimal-arithmetic library remains
open.

The following monetary invariants are mandatory:

- Amounts are never parsed from formatted display strings.
- Negative base prices are prohibited.
- Discounts and credits are explicit adjustments, never negative base prices.
- An order's payable total must never fall below zero.
- A line discount must never exceed the eligible value of that line.
- A refund must never exceed the captured-and-unrefunded amount.
- Currency mismatches must fail clearly rather than silently coercing.
- Calculation order and rounding policy are versioned.
- Identical inputs and an identical policy revision must produce identical results.

## Separate Monetary Concepts

The following monetary concepts are distinct and must not be collapsed into a generic fee,
adjustment, or total field:

| Concept | Meaning |
|---|---|
| List price | Reference or advertised price |
| Selling price | Effective price before applicable adjustments |
| Modifier adjustment | Monetary change caused by customization |
| Bundle adjustment | Monetary change caused by bundle or upgrade selection |
| Item discount | Discount allocated directly to an item line |
| Order discount | Discount allocated across eligible order lines |
| Packaging charge | Explicit charge for packaging |
| Delivery charge | Amount charged to the customer |
| Delivery-provider cost | Expected or actual amount payable to the delivery provider |
| Delivery subsidy | Amount absorbed by BOBA Bear or another funding owner |
| Taxable value | Value on which an approved tax component is calculated |
| Tax | Statutory amount under an approved tax policy |
| Refund | Return of captured customer funds |
| Commercial credit | A separate financial adjustment that is not necessarily a refund |
| Provider fee | Payment or delivery-provider cost borne by BOBA Bear |

## Price Books

Pricing is expressed through **effective-dated price books**. A price book conceptually carries a
stable identifier, name, currency, owning scope, applicable sales channel or context, tax-inclusion
mode, lifecycle state, effective start, effective end, publication revision, price entries, and audit
metadata. A price book's lifecycle is:

```text
DRAFT
SCHEDULED
ACTIVE
ARCHIVED
```

A draft price book must never affect customers. An archived price book must remain identifiable for
historical support and audit even after it stops being active, consistent with the no-hard-deletion
principle already locked for catalog entities in
[ADR-006](./ADR-006-food-catalog-assortment-availability.md#product-lifecycle).

## Price-Book Hierarchy

Price books follow a brand → territory → organization → outlet hierarchy, mirroring the
organizational hierarchy already locked in
[`organization-outlet-access-model.md`](../organization-outlet-access-model.md#core-entities):

```text
Brand price book
        ↓
Territory price book
        ↓
Organization price book
        ↓
Outlet price book
```

A more specific, authorized entry may override an inherited entry only where brand policy permits it.
Brand price policy must be able to express: a locked price, a prohibition on downstream override, an
allowed minimum price, an allowed maximum price, an approval requirement, a delegated scope, and
effective dates. Unlike catalog assortment, where a downstream scope may only narrow, an authorized
downstream price may be **either higher or lower** than the inherited price when the brand policy
explicitly permits it.

For the initial Dehradun launch: BOBA Bear owns the baseline direct-order price book; Dehradun uses
one direct-order price book; the corporate operating organization inherits the approved price book;
the initial outlet inherits the approved price book; and outlet-level price editing is disabled by
default.

## Price Entries

Price entries apply to a product variant, a modifier option, a bundle, a bundle-component upgrade, an
approved packaging-charge definition, or another future approved charge definition. A price entry
conceptually carries a target identifier, amount, currency, tax-inclusion mode, effective period,
source price book, override status, publication revision, approval metadata, and audit metadata. A
required priced entity becomes **unorderable** when no valid effective price can be resolved for it.
Prices must never be derived from display text, product names, URL parameters, client-calculated
totals, historical order snapshots, or external-provider identifiers.

## Effective-Price Resolution

Effective-price resolution is deterministic:

```text
Published active price books
    ∩ applicable scope
    ∩ applicable outlet
    ∩ applicable channel
    ∩ effective date/time
    ∩ authorized override policy
    =
Effective price
```

The resolver must eventually return the effective amount, currency, determining price book, price-
book revision, scope and override path, tax-inclusion mode, and an administrative explanation.
Resolution must be deterministic; if two entries of equal precedence conflict, publication or
activation of the conflicting entry must **fail**, rather than the resolver silently and
unpredictably selecting one.

## Tax Inclusion Modes

Two tax-inclusion modes are supported:

- **TAX_EXCLUSIVE** — tax is added to the configured pre-tax value.
- **TAX_INCLUSIVE** — the configured value includes applicable tax, extracted using the approved tax
  policy.

The initial customer-facing display policy (whether prices are shown tax-inclusive or tax-exclusive)
remains open. Regardless of display mode, the authoritative calculation must explicitly represent
taxable value, CGST, SGST/UTGST, IGST where applicable, other approved tax components, and the gross
line total. The complete customer-payable amount must be presented to the customer before payment
initiation.

## Tax-Policy Model

Tax treatment is expressed through **effective-dated tax policies**, kept out of hard-coded
application logic. A tax policy conceptually carries a stable identifier, jurisdiction, supply
classification, tax category, rate components, tax-inclusion mode, effective start and end,
rounding treatment, invoice-treatment metadata, input-tax-credit treatment metadata, approval
reference, policy version, publication state, and audit metadata. Potential tax categories include
restaurant service, packaging charge, delivery service, merchandise, and other future supplies. The
exact categories and classifications require official-source and accountant validation and are not
finalized by this ADR.

## Provisional Restaurant-Service Profile

The platform must support a provisional configuration conceptually equivalent to: **restaurant
service — CGST 2.5%, SGST 2.5%, total 5%** — together with associated provisional no-input-tax-credit
treatment metadata, as described in [Regulatory and Validation Boundary](#regulatory-and-validation-boundary)
above. This provisional profile is **not production-approved** until launch-readiness validation
confirms: the selling legal entity, GST registration, outlet state, place of supply, direct-order
supply structure, restaurant-service classification, invoice treatment, input-tax-credit treatment,
current official rules, and accountant or GST-adviser approval. A future tax-policy revision must
never alter historical orders — see
[Immutable Order Monetary Snapshots](#immutable-order-monetary-snapshots) and
[Original-Order Immutability](#original-order-immutability) below.

## Legal-Entity and Tax Context

Pricing and tax calculation must resolve the selling context from trusted server-side data: brand,
outlet, operating organization, selling legal entity, GST registration, outlet location, place of
supply, customer delivery location where relevant, sales channel, order type, and effective
date/time. The outlet's assigned legal entity determines the supplier and invoice context for a
given order, consistent with the legal-entity concept already locked in
[`organization-outlet-access-model.md`](../organization-outlet-access-model.md#legal-entity). The
platform must not calculate tax using only a single global brand-level rate. Future franchise outlets
may carry different legal entities, GST registrations, states, place-of-supply outcomes, invoice
sequences, payment ownership, and settlement ownership, and tax calculation must accommodate that
variation rather than assuming brand-wide uniformity.

## Packaging Charges

Packaging charges are explicit monetary lines, never hidden inside a generic platform fee. V1 uses a
simple, explicitly configured method with an approved rule basis: per order, per item, per quantity,
per product category, per product or variant, or per packaging group — arbitrary packaging-formula
scripting is rejected for V1. A packaging line conceptually carries a charge definition, quantity or
basis, customer charge, currency, tax category, taxable value, tax components, final amount, discount
allocation where permitted, pricing-policy revision, and audit source. The exact V1 packaging amount
and its tax treatment remain open.

## Delivery Charge and Provider Cost

The platform must maintain three separate values: the **customer delivery charge**, the
**delivery-provider cost**, and any **merchant-funded subsidy or markup**. The customer delivery
charge may equal the provider quote, be capped, be subsidized, be waived, be set through a
delivery-zone rule, or be set through an authorized manual fallback. The delivery-provider cost is
the expected or final amount owed to the delivery provider. For example: a provider cost of ₹70 with a
customer charge of ₹50 implies a subsidy of ₹20. Any subsidy must be explicit and auditable. The
platform must never alter or conceal the provider cost to make it appear equal to the customer
charge.

## Delivery Quotes

A delivery quote conceptually carries a provider, pickup outlet, delivery destination, provider cost,
customer delivery charge, merchant subsidy or markup, currency, distance or delivery-zone context,
quote timestamp, quote expiry, provider quote reference, tax treatment, and pricing-policy revision.
The customer delivery charge must be snapshotted into the order at checkout; the provider's final
cost may later differ and is reconciled separately, consistent with the delivery-model principles
already locked in
[`order-payment-delivery-model.md`](../order-payment-delivery-model.md#delivery-model). The exact
delivery-pricing algorithm is deferred to a future Delivery architecture slice.

## V1 Explicit-Charge Policy

Initial direct-order checkout supports only: product amounts, variant amounts, modifier adjustments,
bundle adjustments where implemented, packaging charge, delivery charge, and applicable tax. A
generic platform, convenience, or service fee must **not** be introduced without a separate founder
decision. The architecture may support additional charge types later, but inactive charge types must
not appear in V1 checkout. Tips, small-order fees, subscription charges, wallet fees, and stored-value
fees are deferred.

## Calculation Order

The authoritative checkout calculation follows a fixed, versioned order:

```text
1. Resolve product, variant, and modifier prices
2. Calculate item pre-discount amounts
3. Apply eligible item-level promotions
4. Calculate bundle adjustments
5. Calculate eligible order-level discounts
6. Allocate order-level discount across eligible lines
7. Calculate packaging charge
8. Apply packaging-specific discount where permitted
9. Resolve customer delivery charge
10. Apply delivery-specific promotion where permitted
11. Determine taxable values by tax category
12. Calculate tax components
13. Apply deterministic rounding and residual allocation
14. Calculate final payable total
```

A future change to this calculation order requires a new calculation-engine version, regression
tests, pricing evidence, and compatibility analysis, and must never recalculate historical orders.

## Promotion Model

A promotion conceptually carries a stable identifier, name, promotion type, funding owner, owning
scope, applicable outlets, applicable sales channel, eligible customers, eligible products/variants/
categories, start and end time, minimum order value, maximum discount, overall usage limit,
per-customer usage limit, compatibility and stacking policy, priority, lifecycle, revision, and audit
metadata. A promotion's lifecycle is:

```text
DRAFT
SCHEDULED
ACTIVE
PAUSED
EXPIRED
ARCHIVED
```

## Supported Promotion Structures

V1 supports: percentage item discount, fixed item discount, fixed promotional item price, percentage
order discount, fixed order discount, bundle or combo price, delivery-charge discount, free delivery,
customer-specific eligibility, first-order eligibility, and future gated or drop-based eligibility.
Every discount must have deterministic allocation to affected monetary lines. Arbitrary promotion
scripting or a generic expression language is rejected for V1, consistent with the rejection of
arbitrary modifier scripting already locked in
[ADR-006](./ADR-006-food-catalog-assortment-availability.md#no-arbitrary-conditional-modifier-scripting-in-v1).

## Automatic and Coupon Promotions

An **automatic promotion** applies when its configured eligibility conditions are met — for example a
launch offer, happy-hour pricing, a product-specific discount, or a first-order discount. A **coupon
promotion** requires a customer-provided code; the code references a promotion identity but must not
itself contain pricing logic:

```text
Coupon code → Promotion identity → Eligibility validation → Discount calculation
```

A coupon may be disabled without changing the pricing engine.

## Promotion Compatibility

V1 uses explicit compatibility rules. Approved defaults: only one order-level coupon may apply at a
time; two order-level coupons do not stack; automatic item promotions may coexist with an order-level
promotion only when explicitly configured as compatible; delivery promotions are evaluated separately
from item and order discounts; bundle pricing is not automatically compatible with every item
promotion; and promotion application order must never depend on database-return order. When several
mutually exclusive automatic promotions qualify, the engine selects the most beneficial valid
customer result, unless an explicitly configured higher-priority brand policy governs the choice. The
exact launch compatibility matrix remains open.

## Promotion Funding and Authority

A promotion may be created or funded by the BOBA Bear brand, the corporate operating organization, a
territory, a franchise organization, or an outlet. A promotion must record its creator, approver,
funding owner, applicable scope, discount liability, and budget or redemption limits where
applicable. A downstream organization must not create a promotion that applies outside its authorized
scope, overrides locked brand pricing, exceeds its delegated discount authority, produces a price
below an approved floor, uses customer data outside its permitted scope, commits brand funding
without authority, or affects another franchise organization — consistent with the franchise-isolation
principle already locked in
[ADR-005](./ADR-005-organization-outlet-authorization.md#franchise-data-isolation). The exact
franchise promotion authority remains open.

## Atomic Promotion Redemption

The platform must prevent: two checkouts consuming the final redemption of a limited promotion; one
customer exceeding their usage limit through concurrent requests; reuse of a single-use coupon;
duplicate redemption through payment retries; and multiple redemptions from duplicated payment
callbacks. A promotion redemption conceptually moves through:

```text
RESERVED → REDEEMED / RELEASED / CANCELLED
```

A redemption may be reserved during checkout or payment initiation; failed or expired payment flows
release the reservation under an approved policy. The exact reservation timeout remains open.

## Discount and Tax Boundary

Pre-supply discounts applied during authoritative checkout must be determined before order creation,
validated against eligibility, allocated to eligible lines, recorded in the immutable order snapshot,
reflected in taxable value per the approved tax policy, and included in the invoice-input breakdown.
Post-order goodwill credits must not be inserted retrospectively into the original pricing quote. A
post-order adjustment may require a refund, a commercial credit, a credit note, a tax adjustment, or
no tax-liability adjustment at all — which one applies depends on the approved reason and statutory
conditions, and the exact policy requires official-source and accountant validation.

## Immutable Pricing Quotes

Cart totals are estimates until an authoritative pricing quote is issued. A pricing quote conceptually
carries a quote identifier, customer identifier, outlet identifier, selling legal entity, currency,
cart revision, catalog revision, menu revision, price-book identity and revision, tax-policy identity
and revision, promotion identities and revisions, promotion-redemption reservations, delivery-quote
reference, detailed monetary lines, final payable total, creation timestamp, valid-until timestamp,
and calculation-engine version. An issued pricing quote must be **immutable**. The exact
quote-validity period remains open.

## Quote Revalidation and Customer Confirmation

Before payment, the platform must, in sequence: revalidate the cart; revalidate catalog and
availability, per
[ADR-006](./ADR-006-food-catalog-assortment-availability.md#cart-references-and-revalidation);
recalculate and validate the authoritative quote; confirm effective prices remain valid; confirm the
tax policy remains active; confirm promotions remain available; confirm promotion reservations remain
valid; confirm the delivery quote remains valid; present the final payable amount; obtain customer
confirmation; and create the order and payment context idempotently. If the final amount differs from
what the customer previously saw, payment must not begin silently — the revised breakdown must be
displayed and the customer must confirm the revised total, extending the no-silent-substitution
principle already locked in
[ADR-006](./ADR-006-food-catalog-assortment-availability.md#no-silent-cart-substitution) to monetary
terms.

## Monetary Breakdown

The customer-facing monetary breakdown must be explainable:

```text
Items subtotal
+ Modifier adjustments
+ Bundle adjustments
- Item discounts
- Order-level discount allocations
+ Packaging charge
- Packaging discount
+ Customer delivery charge
- Delivery discount
+ Applicable taxes
= Grand total
```

The operational record separately exposes delivery-provider cost, merchant-funded delivery subsidy,
promotion funding allocation, and payment-provider fee after payment. Operational costs do not
automatically form part of the customer-payable total.

## Discount Allocation

Order-level discounts must be allocated deterministically across eligible lines — required for tax
calculation, partial cancellation, partial refund, financial reporting, promotion funding, future
credit-note support, and future franchise settlement. Allocation uses proportional allocation based
on eligible pre-discount line value, and must: use decimal arithmetic; persist the final allocation in
paise; allocate the entire discount; leave no unexplained residual; allocate residual paise using a
stable, deterministic rule; and produce the same allocation for the same inputs and engine version.
The exact residual-order rule remains open.

## Rounding

Rounding must be deterministic: high-precision decimal intermediate values, an explicit rounding
mode, defined rounding boundaries, final persisted paise, deterministic residual allocation, and no
hidden rounding difference. Customer invoice calculations and statutory return-level rounding remain
separate concepts from checkout rounding. The exact rounding mode requires implementation and tax
review and is not selected by this ADR.

## Immutable Order Monetary Snapshots

At order creation, the Orders module must store an immutable monetary snapshot including: currency,
product/variant prices, modifier adjustments, bundle adjustments, quantities, gross line amounts,
item discounts, order-level discount allocations, packaging charge, packaging discount, customer
delivery charge, delivery discount, delivery subsidy where relevant, taxable values, tax categories,
tax rates, CGST, SGST/UTGST, IGST where applicable, other approved tax components, line totals, grand
total, price-book identities and revisions, tax-policy identity and revision, promotion identities
and revisions, delivery-quote reference, calculation-engine version, selling legal entity,
GST-registration context, and invoice context. This extends the order-snapshot principle already
locked in
[`order-payment-delivery-model.md`](../order-payment-delivery-model.md#order-ownership-and-historical-snapshots)
and [ADR-006](./ADR-006-food-catalog-assortment-availability.md#immutable-order-catalog-snapshots)
with the pricing, discount, tax, packaging, and delivery-charge content those decisions deferred to
this ADR. Future price, promotion, charge, or tax changes must never alter this snapshot.

## Original-Order Immutability

After order creation, the platform must not: rewrite the original monetary breakdown; mutate original
item or modifier prices; remove original discounts; replace the tax snapshot; recalculate history
using current policies; or overwrite the original delivery charge. Later financial activity is
represented through separate records: payment, payment reversal, cancellation adjustment, refund,
commercial credit, credit note, delivery-cost reconciliation, and settlement adjustment.

## Cancellation and Refund Allocation

A refund record conceptually carries the original order, original payment, refund reason, refunded
items or charges, gross refund amount, tax allocation, discount allocation, packaging allocation
where relevant, delivery allocation where relevant, refund transaction, provider reference, actor,
authorization or approval, and audit context. The refund engine must prevent: a refund above the
captured amount; duplicate refund processing; refunding an already fully refunded line; a refund
without authorization; loss of the original tax allocation; and loss of the original discount
allocation. The exact cancellation policy, refund limits, approval thresholds, and delivery-refund
rules remain open. The order-level cancellation request/decision workflow and the principle that
cancellation state and refund state are always kept separate are fixed by
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#cancellation-and-refund-separation); this
ADR governs only the monetary allocation a refund reuses, not the cancellation workflow around it.

## Invoice and Credit-Note Boundary

The Pricing module produces the monetary and tax snapshot required for invoicing. A future Invoice
capability owns invoice-number generation, tax-invoice document generation, supplier details,
customer details where required, invoice issue timestamp, document retention, credit-note numbering,
invoice-cancellation workflow, and document rendering. This ADR does not determine the exact
invoice-number sequence, the exact credit-note workflow, the exact document template, or the exact
invoice-storage format. The pricing snapshot must contain enough historical data to generate
compliant documents without consulting current pricing or tax policies.

## Aggregator-Order Boundary

BOBA Bear's Pricing module owns BOBA Bear direct-order calculations only. It must not recalculate
historical customer totals for Zomato, Swiggy, Toing, or other aggregator channels — those remain
within the Petpooja and aggregator commercial and tax flow under the operating model already locked
in [`operating-model.md`](../operating-model.md#the-dual-system-reality). Future aggregator ingestion
may store an externally calculated customer order total, tax data, discount funding, commission,
platform fees, and settlement data — labelled as externally calculated, never recomputed by the
direct Pricing module.

## Administration Authority

**Brand Pricing Administrator** (eventually) may create price-book drafts, set baseline, modifier, and
bundle prices, define price locks, floors, and ceilings, publish price books, create brand
promotions, define promotion compatibility, and review effective-price resolution.

**Territory or Organization Administrator** (where delegated) may apply permitted regional prices,
create scoped promotions, configure permitted packaging charges, propose price overrides, and view
effective-price explanations.

**Outlet Manager** (V1) may view effective prices, report pricing errors, and control availability —
must not change customer prices unless explicitly granted a future pricing permission, consistent
with the Outlet Manager scope already locked in
[ADR-005](./ADR-005-organization-outlet-authorization.md#v1-system-roles) and
[ADR-006](./ADR-006-food-catalog-assortment-availability.md#catalog-administration-authority).

**Finance/Tax Administrator** (eventually) may maintain approved tax-policy drafts, activate approved
tax-policy revisions, review monetary reconciliation, and review invoice and credit-note inputs.
Tax-policy activation requires stronger control than routine availability changes; the exact approval
separation remains open.

## Audit Requirements

Audit events are required for: price-book creation; price change; price-book publication; price
override; price-lock change; floor or ceiling change; tax-policy creation; tax-policy activation;
packaging-charge change; delivery-pricing rule change; promotion creation, activation, pause, or
expiry; promotion-compatibility change; coupon creation or disablement; redemption-limit change;
manual quote override; manual delivery-charge adjustment; refund calculation or adjustment; and
monetary export. Audit context should conceptually capture actor, scope, target, before and after
values, currency, reason, approval, effective time, and correlation identifier, extending the general
audit requirement already locked in
[`architecture-foundation.md`](../architecture-foundation.md#audit-requirements). Sensitive payment
credentials must never appear in audit records.

## Testing Requirements

**Unit tests** must cover: price-book precedence; locked prices; price floors and ceilings; modifier-
price calculation; bundle-price calculation; tax-exclusive and tax-inclusive calculation; percentage
discount caps; fixed discount limits; promotion compatibility; promotion priority; discount
allocation; residual-paise allocation; quote expiry; refund upper bounds; and calculation determinism.

**Integration tests** must cover: territory and outlet price resolution; a franchise cannot edit
another franchise's prices; checkout uses the active price-book revision; effective-dated tax-policy
transition; limited coupon concurrent redemption; a failed payment releases a promotion reservation;
delivery subsidy remains separate from provider cost; historical orders remain unchanged after price
or tax changes; a partial refund uses the original allocations; and a duplicate payment callback does
not duplicate a promotion redemption.

**Invariant and property tests** must cover: the final total is never negative; a discount never
exceeds the eligible value; a refund never exceeds the captured-and-unrefunded amount; the sum of line
totals equals the order total; the sum of allocated discounts equals the discount total; the sum of
tax components equals the tax total; identical inputs and revisions produce identical results;
currency remains consistent; and no residual paise is lost.

The exact testing libraries remain governed by
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#testing-structure).

## Consequences

### Positive

- Separating Pricing from Catalog lets BOBA Bear evolve prices, promotions, packaging, delivery
  charges, and tax treatment independently of product identity, without requiring a Catalog redesign.
- Integer-paise persistence with decimal intermediate arithmetic removes an entire category of
  floating-point rounding defects from every monetary calculation.
- Effective-dated price books and tax policies let BOBA Bear correct or evolve pricing and tax
  treatment going forward without rewriting historical orders.
- A single shared Pricing module keeps the PWA, WhatsApp, future native apps, the Operations Console,
  a future counter POS, support recalculation, refund allocation, and reconciliation consistent
  without duplicated pricing logic per channel.
- Immutable pricing quotes and immutable order monetary snapshots protect customers and BOBA Bear
  from silent, unexplained total changes and keep historical financial records stable.
- Explicitly separating customer delivery charge from delivery-provider cost, and discount from tax,
  keeps subsidy, promotion funding, and tax liability visible and auditable rather than hidden inside
  a single number.

### Trade-offs accepted

- Effective-dated price books, tax policies, and versioned calculation order add domain complexity
  beyond a single flat price list, accepted because a single-outlet launch must not require a later
  foundational pricing rewrite once more outlets, territories, or franchise pricing exist.
- Rejecting arbitrary promotion scripting and a generic platform fee in V1 limits short-term
  commercial flexibility in exchange for an explainable, testable, and auditable pricing engine.
- Treating the initial 5% GST profile as explicitly provisional, rather than encoding it as a
  permanent constant, requires a launch-readiness validation step before commercial launch, accepted
  because a wrong or unvalidated hard-coded tax assumption carries real legal and financial risk.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| A hard-coded GST rate becomes permanent business logic before legal validation | The provisional restaurant-service profile is explicitly marked not production-approved until launch-readiness validation, per [Provisional Restaurant-Service Profile](#provisional-restaurant-service-profile) |
| JavaScript floating-point arithmetic silently corrupts monetary totals | Integer-paise persistence and mandatory decimal intermediate arithmetic are locked, per [Currency and Monetary Representation](#currency-and-monetary-representation) |
| A later price, tax, or promotion change alters a historical order's total | Immutable order monetary snapshots and original-order immutability are mandatory, per [Immutable Order Monetary Snapshots](#immutable-order-monetary-snapshots) and [Original-Order Immutability](#original-order-immutability) |
| Delivery-provider cost is concealed or altered to match the customer delivery charge | Customer delivery charge, delivery-provider cost, and subsidy are locked as three separate, explicit values, per [Delivery Charge and Provider Cost](#delivery-charge-and-provider-cost) |
| A promotion is redeemed twice through concurrent checkouts or duplicate payment callbacks | Atomic RESERVED/REDEEMED/RELEASED/CANCELLED redemption states are mandatory, per [Atomic Promotion Redemption](#atomic-promotion-redemption) |
| A customer is charged silently after the price they saw changes before payment | Quote revalidation requires explicit customer confirmation of any revised total before payment begins, per [Quote Revalidation and Customer Confirmation](#quote-revalidation-and-customer-confirmation) |
| A generic platform or convenience fee is introduced without founder approval | The V1 explicit-charge policy fixes the allowed charge set and rejects a generic fee without a separate founder decision, per [V1 Explicit-Charge Policy](#v1-explicit-charge-policy) |
| BOBA Bear's Pricing module incorrectly recalculates aggregator-order totals | The aggregator-order boundary confines the Pricing module to direct orders only, per [Aggregator-Order Boundary](#aggregator-order-boundary) |

## Explicit Non-Decisions

This decision does not resolve the following, which remain **Open** or **Provisional** and must not
be treated as answered by this ADR:

- Exact decimal-arithmetic library
- Exact rounding mode
- Exact rounding boundaries
- Exact residual-paise allocation order
- Exact customer-facing tax display policy
- Final GST classification
- Final GST rate
- Final input-tax-credit treatment
- Packaging-charge tax category
- Delivery-charge tax category
- Merchandise tax categories
- Exact V1 packaging amount
- Exact packaging calculation basis
- Exact delivery-pricing policy
- Exact delivery subsidy policy
- Exact price-book database schema
- Exact price-publication implementation
- Exact quote-validity period
- Exact promotion-reservation timeout
- Exact launch promotion compatibility matrix
- Exact franchise pricing authority
- Exact franchise promotion authority
- Exact discount floors and ceilings
- Exact tax-policy approval workflow
- Exact invoice-number sequence
- Exact invoice template
- Exact credit-note workflow
- Exact cancellation policy
- Exact refund eligibility
- Exact refund limits and approval thresholds
- Exact delivery-refund policy
- Payment provider
- Accountant or GST adviser selection
- Accounting-system integration
- Gift-card, wallet, loyalty, tip, and small-order-fee timing

## Rejected and Deferred Alternatives

- **Prices stored as catalog-owned display fields** — rejected as the authoritative pricing model.
- **JavaScript floating-point arithmetic for money** — rejected.
- **A hard-coded GST rate in application logic** — rejected.
- **One global tax setting without legal-entity context** — rejected.
- **Delivery charge treated as identical to provider cost** — rejected.
- **A hidden packaging charge or generic platform fee** — rejected for V1.
- **Rewriting historical order totals after a policy change** — rejected.
- **Coupon codes containing embedded pricing logic** — rejected.
- **Arbitrary promotion scripting** — rejected for V1.
- **A generic outlet price override without delegated authority** — rejected.
- **Gift cards, wallet, loyalty, tips, and small-order fees** — deferred.

## Cross-Reference: ADR-008 Quote Orchestration and Pre-Payment Order Creation

This ADR governs the immutable pricing quote and immutable delivery-charge quote themselves — how an
authoritative monetary result is calculated, made immutable, and snapshotted.
[ADR-008](./ADR-008-serviceability-cart-checkout.md) governs quote orchestration — when a quote is
requested, how its expiry is tracked alongside serviceability and delivery-quote expiry, how customer
confirmation is bound to an exact quote revision, and how a pre-payment order is created once
confirmation is obtained, per
[ADR-008](./ADR-008-serviceability-cart-checkout.md#immutable-pricing-quote-boundary). Checkout does
not modify Pricing-owned quote lines; a changed checkout context — cart, outlet, address, promotion,
delivery quote, tax policy, or price policy — requires a new quote, extending this ADR's
[Quote Revalidation and Customer Confirmation](#quote-revalidation-and-customer-confirmation) section
rather than replacing it.

## Cross-Reference: ADR-009 Payment Collection, Refunds, and Reconciliation

This ADR governs immutable monetary snapshots and refundable allocations — the authoritative price,
discount, tax, packaging, and delivery-charge breakdown captured at order creation, and the
allocations a refund must reuse.
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md) governs payment collection,
verification, refund submission, and reconciliation built on top of that snapshot: refunds must
reference this ADR's original allocations under
[Cancellation and Refund Allocation](#cancellation-and-refund-allocation) rather than recalculating
them, and Cashfree provider settlement — reconciled under
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#settlement-records) — never rewrites
this ADR's original order pricing, consistent with
[Original-Order Immutability](#original-order-immutability).

## Cross-Reference: ADR-011 Delivery-Provider Cost Reconciliation

This ADR owns the customer delivery-charge snapshot and the merchant-subsidy value described in
[Delivery Charge and Provider Cost](#delivery-charge-and-provider-cost).
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#provider-cost-and-customer-charge-separation)
owns the estimated and final delivery-provider cost, and reconciles it against this ADR's customer
charge on a separate schedule; any subsidy remains explicit under this ADR. Provider cancellation
and return costs are reconciled by
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#delivery-cost-reconciliation) as
distinct values from the customer delivery charge. A provider-cost change must never rewrite the
customer delivery charge this ADR fixes.

## Cross-Reference: ADR-013 Monetary Persistence

[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#monetary-persistence) fixes how the
monetary model decided here is physically stored. Final monetary amounts persist as integer paise in
`bigint` columns, never as floating-point types. Rates and intermediate precision values — tax rates,
percentage discounts, and similar — persist as `numeric`. Financial invariants such as non-negative
amounts, allocation totals, and currency consistency are enforced by PostgreSQL constraints rather
than by application validation alone, per
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#database-constraints). Historical
monetary snapshots remain immutable at the storage layer: a correction creates a new record rather
than overwriting the original. ADR-013 governs physical persistence only; this ADR remains
authoritative for how monetary values are calculated and composed.

## Related Canonical Documents

- [`architecture-foundation.md`](../architecture-foundation.md) — the Pricing module reference and
  audit requirements this decision implements in detail.
- [ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md) — the persistence decision that
  fixes integer-paise storage, `numeric` rate storage, and the database constraints protecting this
  ADR's monetary model, per the cross-reference above.
- [`organization-outlet-access-model.md`](../organization-outlet-access-model.md) — the price-book
  concept and brand/territory/organization/outlet hierarchy this decision fully specifies.
- [`order-payment-delivery-model.md`](../order-payment-delivery-model.md) — the order-snapshot and
  refund-permission principles this decision extends with monetary snapshot and allocation content.
- [ADR-003](./ADR-003-modular-monolith-node-typescript.md) — the module boundaries and dependency
  rules the Pricing module must follow.
- [ADR-005](./ADR-005-organization-outlet-authorization.md) — the permission, delegation, and
  franchise-isolation model this decision's administration-authority section builds on.
- [ADR-006](./ADR-006-food-catalog-assortment-availability.md) — the food-catalog, variant, modifier,
  and bundle decision this ADR provides authoritative pricing for; catalog records do not own
  authoritative prices.
- [`v1-product-scope.md`](../v1-product-scope.md) — the V1 checkout, tax, packaging, delivery-fee,
  and discount experience this decision must support.
- [`operating-model.md`](../operating-model.md) — the dual-system operating reality behind the
  aggregator-order boundary.
- [ADR-008](./ADR-008-serviceability-cart-checkout.md) — the checkout-orchestration, quote-expiry,
  customer-confirmation, and pre-payment-order decision that orchestrates the immutable pricing quote
  fixed by this ADR, per the cross-reference above.
- [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md) — the payment-collection, refund,
  and reconciliation decision that reuses this ADR's immutable monetary snapshot and refund
  allocations, per the cross-reference above.
- [ADR-010](./ADR-010-order-lifecycle-operations-console.md) — the cancellation-request/decision
  workflow and cancellation/refund state-separation decision built around the refund allocation this
  ADR fixes, per the cross-reference above.
- [ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md) — the delivery-provider abstraction
  and cost-reconciliation decision that reconciles delivery-provider cost against this ADR's customer
  delivery charge, per the cross-reference above.
- [`roadmap-and-open-decisions.md`](../roadmap-and-open-decisions.md) — the open decisions this ADR
  does not resolve.
- [`decision-register.md`](../decision-register.md) — the structured register entries this ADR locks.
- [`README.md`](../README.md) — the canonical documentation index and update protocol.
