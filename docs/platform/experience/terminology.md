---
Status: SUPPORTING PRODUCT / EXPERIENCE MATERIAL
Authority: NONE — working customer-facing terminology, not domain vocabulary rewrite
Canonical architecture: docs/platform/ARCHITECTURE.md
Preserved: 2026-08-18
---

# Working customer-facing terminology

**SUPPORTING.** This is a working customer-language standard. It does **not** rewrite backend /
domain vocabulary. Domain names (Cart, Checkout Snapshot, Payment, Order, Refund, Financial
Document) remain owned by CURRENT architecture and accepted foundations.

## Principle

```text
ONE CUSTOMER CONCEPT
→ ONE CANONICAL CUSTOMER-FACING TERM.
```

Do not present two global-navigation labels for the same concept. Do not use near-duplicate labels
that collide during scanning.

## Working customer-facing terms

| Customer concept | Canonical customer-facing term | Must not be labeled as |
|---|---|---|
| Catalog destination | **Menu** | Order (as a destination name) |
| Conversion CTA | **Order Now** | Menu; Order (as a peer destination) |
| Historical purchases | **My Orders** | Orders (as a peer of Menu); Order |
| Account / relationship area | **My BOBA** | Account; Profile (as the hub name) |
| Current purchase | **Cart** | Bag; Basket; Order |
| Repeat historical purchase | **Order Again** | Reorder as a competing global nav item |
| Customization action | **Customize** | Modifiers; SKU options; variant config |
| Saved delivery destinations | **Saved Addresses** | Address book as a competing public name |
| Authentication action | **Sign In** | Login (acceptable as route; not the chrome label) |

Internal SKU / modifier / snapshot terminology must not leak into customer presentation.

## Superseded working alternative

Using **Order** and **Orders** as peer global-navigation destinations was considered and
**rejected**.

Rationale: the labels are too similar during scanning. Current repository chrome still exhibits
this collision (`Order` on the marketing nav to `/order`; `Orders` on commerce nav to
`/order/orders/`; `Order now` as CTA). See [`ux-backend-gap-map.md`](./ux-backend-gap-map.md)
Terminology / Navigation rows.

Status: `SUPERSEDED_WORKING_ALTERNATIVE`.

Working replacement:

```text
Menu          = catalog destination
Order Now     = conversion CTA
My Orders     = historical purchases, inside My BOBA
```

## Domain vocabulary that must not be renamed for UX

These remain CURRENT backend/domain terms. UX may project them; UX must not invent synonyms that
compete as authority:

| Domain term | Customer-facing projection (working) |
|---|---|
| Cart | Cart |
| Checkout Snapshot | not named to customers; shown as payable totals |
| Payment | Pay / payment status projections |
| Order | confirmation and My Orders facts; public `orderNumber` |
| menu_sections | category labels on Menu |
| catalog_modifier_* | Customize options |
| customer_profiles | Profile inside My BOBA |
| customer_addresses | Saved Addresses |

## Current repository collisions (audit 2026-08-18)

Evidence, not repaired by this pack:

- Marketing nav: Drops / Menu (`#bar`) / Merch / Artists / **Order** (`/order`) — `src/components/Nav.tsx` `NAV_LINKS`
- Commerce nav: Home / Menu (`/order`) / **Orders** (`/order/orders/`) — `COMMERCE_NAV_LINKS`
- CTA copy: **Order now** / “Order with Boba Bear”
- No customer-facing **My BOBA** or **My Orders** label

Disposition vs working standard: **REDESIGN** (content/terminology). No domain rename required.
