---
Status: SUPPORTING PRODUCT / EXPERIENCE MATERIAL
Authority: NONE — working product principles, not CURRENT VISION
Canonical vision: docs/platform/VISION.md
Preserved: 2026-08-18
---

# Direct UX north star

**SUPPORTING.** These are working product principles for BOBA Direct. They are not CURRENT canonical
authority and they do not amend VISION-1.

## Food-commerce north star

```text
BOBA Direct should make the next best purchase decision obvious.
```

Intended Food-commerce outcomes:

Reduce:

- time to first Add
- menu scrolling
- checkout abandonment
- unnecessary decisions per order

Increase:

- add-to-cart rate
- cart value
- attach rate
- checkout completion
- repeat ordering
- reorder rate
- limited-drop conversion

## Brand-belonging north star

```text
BOBA Bear should create a world people want to belong to.
```

This is the higher-level brand intent. Food commerce is how that world is entered and paid for
today. Wear and Culture may later express belonging; they are not implementation-authorized here.

The two north stars are complementary, not competing:

| Layer | Working intent |
|---|---|
| Brand | a world people want to belong to |
| Food Direct UX | make the next best purchase decision obvious |

A lifestyle Home that does not convert, or a Menu that converts but feels like an unrelated
ordering app, would both miss the working target.

## Implications for surfaces (working)

- **Home** is brand discovery + appetite + campaign + conversion entry — not a second full catalog.
- **Menu** is the primary Food commerce discovery/catalog surface.
- **Order Now** is the conversion CTA, not a destination name competing with Menu.
- **My BOBA** is relationship + commerce convenience, not a settings-first admin portal.
- **Drops** are campaign/release presentation; they must not fake commerce authority.

Detail lives in [`information-architecture.md`](./information-architecture.md),
[`customer-journey.md`](./customer-journey.md), and [`terminology.md`](./terminology.md).

## What this does not change

Accepted commercial truth remains server-authoritative:

- Cart = purchase intent
- Checkout Snapshot = payable commercial offer
- Payment owns collection truth; browser callback is not success
- Order owns post-purchase lifecycle
- UI may project; UI must not compete as a second authority

See [`ux-authority-principles.md`](./ux-authority-principles.md).

Food Direct capability boundaries and MVP vs deferred scope:
[`food-direct-product-architecture-lock.md`](./food-direct-product-architecture-lock.md).
