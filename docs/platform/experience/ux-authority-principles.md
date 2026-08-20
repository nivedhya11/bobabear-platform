---
Status: SUPPORTING PRODUCT / EXPERIENCE MATERIAL
Authority: NONE as new architecture — restates CURRENT domain authority for UX planning
Canonical architecture: docs/platform/ARCHITECTURE.md
Canonical decisions: docs/platform/decision-register.md
Preserved: 2026-08-18
---

# UX-facing authority principles

**SUPPORTING.** This document restates CURRENT commercial/identity authority so UX planning cannot
accidentally compete with it. New UX must project these authorities. It must not reopen them.

Where a row is WORKING, it is a planning rule for a future Food Direct UX slice — not a new
`D-xxx` beyond **D-370**, not a new ARCH-G beyond **ARCH-G21**, and not a schema change.

**D-368 / ARCH-G19** (CURRENT): customer Menu serving TARGET is a storefront READ PROJECTION over
existing catalog/menu, pricing, assortment/availability, modifier, and bundle authorities. Display
price ≠ sealed payable amount. Display availability is not a new availability decision. Checkout
Snapshot remains authoritative payable truth. Implementation is not authorized by D-368.

**D-369 / ARCH-G20** (CURRENT): a positive-price modifier must not become customer purchase intent
solely because it is a catalog/default selection. Explicit current-interaction selection is
required. Zero-price standard defaults MAY be visibly preselected. Recommendation is not selection.
Implementation is not authorized by D-369.

**D-370 / ARCH-G21** (CURRENT): guest→customer compatible purchase-intent merge is required; silent
whole-cart winner selection is forbidden; sign-out isolates the browser from the customer Cart
without deleting it. Cart remains purchase intent. Checkout Snapshot remains authoritative payable
truth. Implementation is not authorized by D-370.

## Layering (EXISTING_AUTHORITY_REFERENCE)

```text
UI → Transport → Application Operations → Domain Authority → Persistence → Provider Adapter
```

IMP-025 already owns the **UI** layer for customer ordering and must not invent application/domain
semantics. This pack does not amend that lock.

Relevant invariants: ARCH-G01, ARCH-G05, ARCH-G06, ARCH-G07, ARCH-G10, ARCH-G11, ARCH-G12.

## Cart vs Checkout Snapshot

| Concept | Authority | Status |
|---|---|---|
| **Cart** | customer purchase intent | EXISTING_AUTHORITY_REFERENCE — IMP-020, ARCH-G11 |
| **Checkout Snapshot** | authoritative commercial offer / payable truth | EXISTING_AUTHORITY_REFERENCE — IMP-021, ARCH-G05 |

Working UX principles (do not become competing pricing authority):

- Guest browse/add supported.
- Cart must survive the authentication journey.
- Identical configured lines may merge where repository identity rules allow.
- Materially different configured items remain separate.
- Stale Cart should be revalidated.
- Revalidation should expose resolvable conflicts.
- No silent product/option substitution.
- Cart may show projections/estimates but must not become competing final pricing authority.
- Guest→customer compatible purchase-intent merge and logout customer-cart isolation are
  **BINDING VIA D-370**.

OPEN remaining (not resolved here): none for merge/logout policy. Exact merge API/UX remains
implementation-not-authorized.

## Authentication vs profile vs history

| Question | Authority | Status |
|---|---|---|
| Who are you? | Authentication (phone OTP; customer-auth session) | EXISTING_AUTHORITY_REFERENCE — IMP-009, ARCH-G03/G04 |
| What current information do we know about you? | Customer Profile | EXISTING_AUTHORITY_REFERENCE — IMP-017; `/api/v1/me/profile` |
| What was true at purchase? | Historical Checkout Snapshot / Order / issued Financial Document | EXISTING_AUTHORITY_REFERENCE — ARCH-G05, ARCH-G16 |

Current profile/address edits **must not** rewrite historical transactions.

Repository audit: Profile API exists; no Profile UI. Saved Address CRUD backend exists; current
Checkout exposes only part of the customer experience (select/create, not the full book).

## Saved Addresses

Working role: customer convenience / reusable fulfilment destination.

**Default Address:** convenience default, not invisible fulfilment commitment.

Address and delivery instructions are semantically different concepts. Delivery instructions are
currently ABSENT (IMP-026C non-goal) and remain OPEN if ever introduced.

Checkout destination copy is snapshot truth at set time.

## Serviceability vs Delivery Promise

| Concept | Meaning | Status |
|---|---|---|
| **Serviceability** | Can BOBA fulfil here? | EXISTING_AUTHORITY_REFERENCE — IMP-019 |
| **Delivery Promise** | When can BOBA fulfil here? | NOT_FOUND as a domain; IMP-026C forbids fake ETA/capacity |

Do not conflate them. Do not invent new price/tax/serviceability rules for UX.

Working progressive-location strategy (WORKING, not a new serviceability engine):

- browsing should not require full authentication/address;
- lightweight service context may improve Menu;
- exact destination becomes authoritative during Checkout;
- address/service context changes trigger revalidation.

## Customization

Repository audit fact: generic modifier/bundle backend structures already exist, but the current
live catalog import contains **no modifier groups** and there is **no customer customization
surface**.

Working UX model:

```text
MenuItem → Food Modifier Groups → Options
```

Conceptual UX group types discussed: SIZE, SWEETNESS, ICE, EXTRAS, REMOVALS. Do **not** turn those
example names into new schema enums without a later decision.

Working rules:

- backend defines available customization;
- paid extras require explicit customer action (**BINDING VIA D-369**);
- visible zero-cost standard defaults may be useful and must remain visible when the customization
  surface is present (**BINDING VIA D-369**);
- paid-default prohibition is CURRENT via D-369 (schema may still represent `default_quantity` +
  positive `price_delta_paise`; D-369 does not change schema);
- free-text instructions must never create paid entitlement if later introduced;
- ingredient removal does not imply price reduction;
- material substitutions must never happen silently;
- bundle/combo components should not be semantically flattened into modifiers when they are
  separate products;
- current catalog changes must not rewrite historical purchase configuration.

Silent substitution prohibition is already CURRENT in ADR-006. Paid-default prohibition is
**BINDING VIA D-369**.

## Payment, confirmation, identifiers

EXISTING_AUTHORITY_REFERENCE:

- Razorpay browser callback **!=** Payment success authority (D-361, ARCH-G06, ARCH-G10).
- Unresolved / INDETERMINATE → Do not pay again.
- Order confirmation requires a real BOBA Order (D-362, ARCH-G07).
- Public `orderNumber` is the customer/support reference.

Target customer-facing payment projections (WORKING presentation; not new Payment domain states):

```text
CONFIRMING
SUCCESS
DEFINITE FAILURE
INDETERMINATE
```

Do not create new Payment domain states simply for UX.

## My BOBA / Order Again / affinity

Working distinctions (not new schema):

| Concept | Meaning |
|---|---|
| Favorite | product affinity |
| Saved Configuration / My Usual | preferred configuration template |
| Order Again | historical Order used to create **NEW** current purchase intent |

Order Again must **not** replay an old Checkout Snapshot as current commercial truth.

Favorites and Rewards remain future where the repository says they are absent/deferred.

## Drops (working architecture candidate)

BrandDrop MUST NOT automatically become pricing, inventory, checkout, Food Menu, Wear SKU, or
Culture participation authority. Underlying domains remain authoritative.

This is a WORKING architecture candidate. It is **not** `D-368` (D-368 is Customer Menu Read
Projection Authority), **not** `D-369` (D-369 is Customer Paid Modifier Explicit Selection
Authority), and **not** `D-370` (D-370 is Cart Identity Transition Authority).

## What UX must not reopen

Do not redesign these as if they were UI-owned:

- Checkout Snapshot sealing (ARCH-G05)
- Payment original collection truth (ARCH-G06, D-361–D-363)
- Order lifecycle D-357
- Refund money truth (D-364, ARCH-G15)
- issued Financial Document immutability (D-365, ARCH-G16)
- RefundStatutoryDecision (D-366, ARCH-G17)
- SignatureArtifact / signed-PDF fail-closed download (D-367, ARCH-G18)
- static public frontend + `/api/v1/*` façade (D-356 / D-359 / D-360, ARCH-G01)
- Customer Menu Projection is not commercial authority (D-368, ARCH-G19)
- Cart identity transition (D-370, ARCH-G21)

Food Direct planning lock (SUPPORTING, not CURRENT architecture):
[`food-direct-product-architecture-lock.md`](./food-direct-product-architecture-lock.md).
