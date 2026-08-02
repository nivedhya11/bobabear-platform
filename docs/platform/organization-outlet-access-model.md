---
Status: Canonical
Last updated: 2026-08-01
---

# BOBA Bear — Organization, Outlet, and Access Model

## Status

This document records the **Locked** principle that the platform is multi-organization and
multi-outlet by foundation, the **Locked** conceptual entities that support it, and the **Locked**
approach to authorization (permission-based, scoped membership). The specific V1 configuration
described near the end of this document is **Provisional** in its business-record details (legal
entity, exact organizational naming) and **Locked** in its structural shape. No database schema is
defined here — see [`architecture-foundation.md`](./architecture-foundation.md).

## Guiding principle

> Build multi-organization and multi-outlet into the domain foundation, while launching with a
> simple single-corporate-organization and single-outlet experience.

BOBA Bear will initially operate primarily through COCO (Company-Owned, Company-Operated) outlets.
Later, BOBA Bear intends to expand through a franchise operating model comparable to large,
multi-outlet quick-service-restaurant brands. The platform must support that future without
requiring a foundational redesign — which is why the entities below exist even though V1 uses only
the simplest configuration of them.

## Core entities

### Brand

Represents BOBA Bear's brand-level identity and policy — the top of the hierarchy. Brand-level
decisions (product standards, brand-wide promotions authority, and similar) apply across every
organization and outlet operating under the BOBA Bear name.

### Organization

Represents an operating organization — an entity that runs one or more outlets under the BOBA Bear
brand. Possible organization types include:

- Brand owner
- Corporate operator
- Master franchisee
- Area developer
- Franchisee
- Regional operator

Organizations support parent-child relationships (for example, a master franchisee with
franchisee organizations beneath it). Not every market is assumed to use every level of this
hierarchy — a small market may have only a corporate operating organization and no franchise layer
at all.

### Legal entity

Represents the legal and financial entity responsible for matters such as invoicing, taxes,
payment receipt, contractual obligations, and settlement responsibility. **Legal entity and
operating organization are deliberately separate concepts** — an operating organization runs the
business day to day, while a legal entity bears the legal and financial responsibility, and the two
are not always the same party (for example, in some franchise structures). They must not be merged
into a single concept in the data model.

### Territory

Represents geographic or commercial operating rights — for example, the right to operate under the
BOBA Bear brand within a defined city or region. **A territory is not necessarily the same as an
outlet's delivery service area**; a territory is a commercial/operating-rights concept, while a
service area is an operational serviceability boundary tied to a specific outlet's fulfilment
capability (see [`order-payment-delivery-model.md`](./order-payment-delivery-model.md)).

### Outlet

Represents a physical store, kitchen, kiosk, or fulfilment location. Possible outlet types include:

- COCO
- Franchise-operated
- Cloud kitchen
- Dine-in
- Express
- Kiosk

The initial implementation may expose only the outlet types currently needed (a single COCO cloud
kitchen — see [V1 organizational configuration](#v1-organizational-configuration) below) without
implementing support for every type listed above.

## Outlet ownership model

An outlet should eventually reference each of the following, rather than a single generic
"owner" field:

```text
brand
operating organization
legal entity
territory
outlet type
physical location
service areas
operating hours
payment configuration
fulfilment configuration
operational status
```

Distinct ownership, operating, payment, and legal relationships must be modeled explicitly.
Ambiguous, generic ownership fields that collapse these distinct relationships into one should be
avoided, because they would make correct multi-organization and franchise behavior difficult to
express later.

## User, membership, role, and permission model

A person may hold multiple assignments at different scopes at the same time, and must not be
limited to a single, permanent, global role. For example, the same person might be a Brand
Administrator and, independently, the Outlet Manager of one specific outlet.

```text
User
└── Membership
    ├── Role
    ├── Scope type
    └── Scope identifier
```

Possible scope types:

- Platform
- Brand
- Organization
- Territory
- Outlet

### Permission-based authorization

Application authorization must be based on **permissions (capabilities)**, not hard-coded
role-name checks. Roles are bundles of permissions; the application checks for a permission, not
for a specific role name. This keeps role definitions changeable without requiring changes to
application logic. Example capabilities:

```text
catalog.product.view
catalog.product.manage
catalog.price.override
catalog.availability.manage
order.view
order.accept
order.prepare
order.cancel
refund.request
refund.approve
delivery.manage
outlet.manage
staff.invite
finance.report.view
audit.view
```

## Role families

The following role families describe the intended long-term shape of staff access. **Not all of
these are exposed in V1** — see the V1 role subset below.

**Platform**
- Platform Super Administrator
- Platform Support
- Platform Auditor

**Brand**
- Brand Owner
- Brand Administrator
- Brand Operations Head
- Brand Finance Manager
- Brand Catalog Manager
- Brand Marketing Manager
- Brand Customer Support
- Brand Auditor

**Territory or region**
- Regional Manager
- Area Operations Manager
- Territory Catalog Manager
- Territory Finance Viewer

**Franchise organization**
- Franchise Owner
- Franchise Administrator
- Franchise Operations Manager
- Franchise Finance Manager
- Franchise Auditor

**Outlet**
- Outlet Manager
- Shift Manager
- Kitchen Operator
- Delivery Coordinator
- Customer Support Operator
- Refund Approver
- Cashier
- Inventory Operator

**External identities** (kept separate from staff roles):
- Customer
- Delivery rider
- Delivery provider system
- Payment provider
- Aggregator integration
- Service account

### V1 role subset

For V1, the exposed role set is limited to:

- Brand Administrator
- Outlet Manager
- Kitchen Operator
- Delivery Coordinator
- Support or Refund Operator
- Finance Viewer

All other role families listed above are **Deferred**, not rejected — the permission model is
designed so that additional roles can be introduced later as bundles of existing capabilities
without restructuring the authorization system.

## Data-access boundaries

- Brand administrators can access assigned brand-wide data according to their permissions.
- Franchise organizations must not access another franchisee's orders, revenue, staff, customers,
  or internal configuration.
- Outlet staff should access only their assigned outlets.
- Customers should access only their own profiles, addresses, carts, payments, and orders.
- **Backend authorization must enforce these boundaries.** Interface visibility alone — hiding a
  button or a menu item — is not sufficient; the server-side authorization layer must independently
  enforce every boundary above.
- Database-level isolation should be considered as an additional safeguard where practical.
- Sensitive cross-organization actions must be audited (see
  [`architecture-foundation.md`](./architecture-foundation.md#audit-requirements)).

## Customer ownership

Customer identity belongs to the **BOBA Bear brand**, not to one outlet or one franchisee. A
customer should be able to:

- Order from different BOBA Bear outlets.
- Retain one BOBA Bear account.
- Maintain shared addresses and preferences across outlets.
- Build brand-level loyalty history (once loyalty exists — see
  [`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md)).
- Qualify for gated drops based on brand-level activity.
- View applicable order history across outlets they have ordered from.

A franchisee or outlet should receive only the customer information required to fulfil and support
its own assigned orders. **The platform must not automatically expose the complete BOBA Bear
customer database to franchise organizations.**

## Catalog inheritance

The catalog is expected to cascade through the organizational hierarchy:

```text
Brand catalog
    ↓
Territory or market configuration
    ↓
Organization configuration
    ↓
Outlet assortment and availability
```

**Brand-controlled data** (locked brand rules; not freely overridable below the brand level):
- Product identity
- Name
- Description
- Photography
- Product standards
- Base recipe
- Modifier structure
- Allergen information
- Category

**Territory or market configuration:**
- Regional assortment
- Taxes and charges
- Regional price books
- Regional promotions
- Market-specific compliance information

**Organization configuration:**
- Permitted pricing (within brand and territory limits)
- Local promotions
- Operational defaults
- Allowed assortment

**Outlet configuration:**
- In-stock or out-of-stock state
- Temporary availability
- Preparation time
- Operating hours
- Fulfilment methods
- Permitted outlet-level pricing (within limits set above)

**Not every field is overridable at every level.** BOBA Bear must be able to lock brand standards
(for example, product identity and recipe) so that a territory, organization, or outlet cannot
alter them, while still allowing appropriate local control over price, availability, and
operational detail.

## Pricing foundation

Pricing should be modeled through **price books**, not a single permanent price attached directly
to a product, so that the model can support:

- City-specific pricing
- Territory pricing
- Organization pricing
- Outlet pricing
- Delivery-channel pricing
- Dine-in pricing
- Promotional pricing
- Franchise pricing boundaries

**The first release may use a single Dehradun price book.** No complex pricing engine is
implemented as part of this documentation set or is required for V1; the price-book concept exists
so that later multi-city and multi-organization pricing does not require restructuring how price is
attached to a product.

## V1 organizational configuration

The initial logical hierarchy, without inventing unconfirmed legal or business-record detail:

```text
Platform
└── Brand: BOBA Bear
    └── Corporate operating organization
        └── Territory: Dehradun
            └── Initial BOBA Bear outlet
```

This structure is **Locked** as the shape of the V1 configuration. The following details are
explicitly **not** inferred here and require confirmation against actual business records before
being encoded anywhere as authoritative:

- The final legal entity name and its exact relationship to the corporate operating organization.
- Tax registration detail.
- The payment settlement owner of record.
- Any contractual structure beyond what is already recorded in the repository's site metadata
  (`lib/site.ts` currently records "Nivedhya11 Hospitality Private Limited" as the registered legal
  entity operating the BOBA Bear brand for the purpose of website metadata; this is existing
  repository evidence, not a confirmed platform-level legal-entity configuration, and should be
  verified against business records before being treated as such).

## Related documents

- [`architecture-foundation.md`](./architecture-foundation.md) — the relational data model and audit requirements these entities are built on.
- [`order-payment-delivery-model.md`](./order-payment-delivery-model.md) — how outlet selection constrains a single order's cart.
- [`operating-model.md`](./operating-model.md) — how outlet-scoped roles (Outlet Manager, Kitchen Operator, Delivery Coordinator) are used day to day.
- [`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md) — franchise settlement, pricing authority, and customer-data-access questions that remain open.
- [`decision-register.md`](./decision-register.md) — structured record of the decisions summarized here.
