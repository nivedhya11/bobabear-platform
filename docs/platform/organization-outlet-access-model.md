---
Status: SUPPORTING
Current authorization: ADR-005 (AMENDED by D-358) + STATE role inventory
Last updated: 2026-08-11
---

# BOBA Bear — Organization, Outlet, and Access Model

## Status

**SUPPORTING.** Prefer [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`STATE.md`](./STATE.md), and
[`decision-register.md`](./decision-register.md) for CURRENT binding reads. Current accepted system
role **count** is owned by STATE/code (presently seven), not historical six-role prose.

This document records the principle that the platform is multi-organization and multi-outlet by
foundation, the conceptual entities that support it, and permission-based scoped membership.

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

Authentication and business authorization are separate concerns. A single human authentication
identity — issued and verified by the Identity module — may carry both a customer profile and one
or more workforce memberships at the same time; BOBA Bear does not create a separate identity merely
because one person has both relationships. Staff authorization itself comes entirely from the scoped
memberships and permissions described below, owned by the Access Control module, not from Better
Auth's own organization or role functionality, which is not used as BOBA Bear's business-authority
model. See [ADR-004](./decisions/ADR-004-identity-authentication-sessions.md) for the full identity
and authentication architecture; this document describes only the business-authorization model built
on top of it.

Workforce access is invitation-only, and shared workforce accounts — shared usernames, shared
passwords, or shared kitchen logins — are prohibited; every staff action must remain attributable to
an individual identity. When a membership is removed or a critical permission changes, the affected
identity's sessions must be re-evaluated or revoked so that authorization reflects current
membership state rather than a stale session. The exact mechanics of session re-evaluation and
revocation are defined in [ADR-004](./decisions/ADR-004-identity-authentication-sessions.md); the
exact access-control implementation, policy-evaluation engine, and permission-storage design remain
governed by a future authorization-focused architecture decision.

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

Authorization uses **scoped role-based access control with policy conditions and deny-by-default
authorization**: an action is authorized only when an active identity, active membership, active
scoped role assignment, the required permission, and a scope covering the resource all hold, together
with any applicable resource, security-assurance, and business-state conditions. If an action is not
explicitly permitted, it is denied. Permissions may inherit **downward only** — brand to
organization/territory to outlet — never upward, sideways to a sibling organization, or across
brands, and only where both the role assignment and the specific permission allow it. Workforce
membership (the employment or affiliation relationship) is modeled separately from role assignment
(a specific role held at a specific scope), so one person may hold several role assignments
concurrently without being limited to a single global role. The complete authorization model,
including scope-inheritance mechanics, delegation limits, franchise isolation, customer
authorization, data minimization, and audit requirements, is fixed by
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md).

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
without restructuring the authorization system. These six roles are centrally maintained BOBA
Bear system roles; custom, franchise-created roles and generic user-configurable deny roles are
both rejected for V1. See [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#v1-system-roles)
for each role's full scope and permitted actions, and
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#delegated-administration) for the
delegation limits that apply when one of these roles assigns another.

## Data-access boundaries

- Brand administrators can access assigned brand-wide data according to their permissions.
- Franchise organizations must not access another franchisee's orders, revenue, staff, customers,
  or internal configuration.
- Outlet staff should access only their assigned outlets.
- Customers should access only their own profiles, addresses, carts, payments, and orders.
- **Backend authorization must enforce these boundaries.** Interface visibility alone — hiding a
  button or a menu item — is not sufficient; the server-side authorization layer must independently
  enforce every boundary above.
- Database-level isolation should be considered as an additional safeguard where practical; selective
  PostgreSQL Row-Level Security is deferred, not rejected, as future defense-in-depth — see
  [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#postgresql-row-level-security-position).
- At the HTTP boundary, actor identity, membership, role, and scope are always resolved server-side
  for every protected request; a client-supplied actor, outlet, organization, or scope value carried
  in a request path, query, header, or body is never authoritative, per
  [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md#actor-and-authentication-context).
- Sensitive cross-organization actions must be audited (see
  [`architecture-foundation.md`](./architecture-foundation.md#audit-requirements)).

Franchise sibling isolation is a structural requirement, not an operational preference: one
franchise organization must never access another franchise organization's orders, revenue, payment
data, staff, customers, delivery data, configuration, reports, audit history, price overrides, or
operational metrics. See
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#franchise-data-isolation) for the
full franchise-isolation and required-testing detail.

Staff-facing data must additionally be minimized to the field-level detail a given role actually
requires (for example, a Kitchen Operator needs a customer's display name and order items, not their
full payment history) — see
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#customer-data-minimization).

Platform support personnel do not receive standing unrestricted production access, and emergency
platform access uses a controlled, audited break-glass process reserved for incidents, lockout
recovery, and security investigation — never for routine operations. Service identities (background
workers, webhook processors, future POS devices) are separate authorization principals from human
workforce members and never receive workforce roles. See
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#support-access),
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#break-glass-access), and
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#service-identities) for the full
requirements.

How these boundaries are enforced at the persistence layer is fixed by
[ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#repository-rules):

- Scoped repositories are the enforcement mechanism. Every query that reads or writes outlet-,
  organization-, or customer-owned data resolves its scope from trusted server-side context and
  applies it as an explicit predicate — the scope is never taken from a client-supplied value.
- Database roles are an infrastructure control, not a business-authorization control. The separation
  between runtime, migration, read-only, and administrative database roles limits what the platform's
  own processes may do; it does not express which staff member may cancel which order. Business
  authorization remains the permission model defined in this document.
- Cross-module direct writes remain prohibited. A module never writes another module's tables; it
  calls that module's application contract, which applies the owning module's authorization rules.
- PostgreSQL Row-Level Security remains deferred and, if adopted, selective — a defence-in-depth
  layer beneath application authorization rather than a replacement for it, per
  [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#row-level-security-position).
- Runtime and migration database access use separate roles and separate connections. The runtime role
  cannot alter schema, and the migration role is not used to serve customer or staff traffic.

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

Customers do not use workforce roles at all. Customer authorization is based on resource ownership —
an authenticated customer may access only their own profile, addresses, cart, checkout sessions,
orders, payment information, refund status, delivery tracking, and communication preferences; knowing
an order number is never sufficient on its own. See
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#customer-authorization) for the
full customer-authorization model.

## Catalog inheritance

Brand staff own canonical BOBA Bear product definitions; territory and organization assortment
authority is delegated and scoped rather than assumed, downstream scopes may narrow but must not
broaden inherited assortment, and Outlet Managers control operational availability rather than
canonical product identity — see [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md)
for the full catalog, menu, assortment, and availability decision this section summarizes. Franchise
organizations cannot redefine locked brand standards, consistent with the franchise-isolation
principle in [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#franchise-data-isolation).
Assortment and availability actions require permissions and audit, per
[ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md#catalog-and-availability-audit-requirements);
exact permission names remain subject to the final permission catalog referenced in
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#explicit-non-decisions).

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

## Serviceability, cart, and checkout access

Service-zone creation and modification are scope-controlled, permission-gated actions: an outlet or
franchise administrator cannot define a service zone beyond its delegated territory, extending the
delegated-administration limits already locked in
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#delegated-administration). Manual
serviceability override — bypassing the platform's normal outlet-resolution result — requires
explicit permission and is audited, not a routine operational action. Outlet resolution for a
customer order always uses trusted server-side service-zone and outlet data; a client-supplied outlet
identifier is never authoritative. Customers access only their own carts and checkout sessions,
consistent with the customer-authorization and resource-ownership principle already locked in
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#customer-authorization); support
access to a customer's cart or checkout requires explicit permission, appropriate scope, and audit,
consistent with [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#support-access).
The full service-zone authority, outlet-resolution, and cart/checkout access model is fixed by
[ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md); the exact service-zone and
cart/checkout permission catalog remains subject to the final permission catalog referenced in
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#explicit-non-decisions).

## Delivery access

Delivery accounts are scoped to the applicable outlet, operating organization, or legal entity — the
customer or browser never selects a delivery account or delivery provider, per
[ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#delivery-account-ownership).
Provider selection is itself permission-controlled: choosing among approved delivery providers or
dispatch modes for an outlet requires the appropriate scoped authority, not general staff access.
Manual courier assignment is restricted to an approved delivery business, an approved contracted
rider, or a future authorized BOBA Bear delivery workforce — arbitrary unverified rider entry is not
permitted, per
[ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#approved-local-rider-controls).
Pickup verification is performed only by authorized outlet staff, consistent with the
role-minimization principle already locked in
[ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md#role-minimized-console-views).
Delivery completion and manual delivery confirmation each require an explicit, scoped permission
distinct from routine kitchen or delivery-coordination access, per
[ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#manual-confirmation). Delivery
provider-cost entry and cost-variance approval are separate authorities from routine dispatch work,
and Finance access to delivery-cost reconciliation remains separate from operational dispatch
authority, consistent with the Finance Viewer role already locked in
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#v1-system-roles). Cross-outlet
delivery access remains prohibited unless a broader role assignment explicitly permits it, per the
scope-based authorization principle already locked in
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#authorization-model). Exact
delivery permission names and cost-approval thresholds remain open, per
[ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#explicit-non-decisions).

## Notifications and WhatsApp access

Provider-account management for the brand-owned WhatsApp messaging identity — credential rotation,
webhook configuration, and template-registry administration — is a permission-controlled Platform
Administrator activity, kept separate from routine support-response authority, per
[ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#administrative-authority)
and
[ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#provider-credentials-and-configuration).
A Support Operator may respond within an assigned conversation and request a cancellation, but never
approve a cancellation, refund, or payment action merely through a WhatsApp reply, consistent with
the scoped, permission-based authorization model already locked in
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#authorization-model). A future
Marketing Administrator role governing marketing-consent-driven campaigns is distinct from, and has
no authority over, transactional-notification content, templates, or the assisted-commerce boundary,
per
[ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#marketing-boundary).
Consent override is prohibited without new customer-sourced evidence — no staff member, regardless of
scope, may silently re-enable a customer's withdrawn consent, per
[ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#consent-evidence). Exact
notification and messaging permission names remain open, per
[ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#explicit-non-decisions).

## Kitchen and order operations access

Kitchen and order operations are outlet-scoped: a Kitchen Operator, Delivery Coordinator, or Outlet
Manager may act only on orders whose fulfilment outlet is covered by their active role assignment,
consistent with the scope-based authorization principle already locked in
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#authorization-model). Order
acceptance, rejection, cancellation request and decision, workflow correction, priority change, and
manual completion each require an explicit permission and produce an audit event; holding a valid
Operations Console session is never sufficient on its own. Kitchen Operator access to customer and
order data is minimized to what preparation requires — order items, quantities, modifiers, kitchen
instructions, and order age — while an Outlet Manager holds broader operational authority, including
exception management, permitted cancellation decisions, and limited correction commands. A Delivery
Coordinator sees only the delivery-relevant recipient details required for fulfilment. Cross-outlet
order access remains prohibited unless a broader role assignment explicitly permits it, and holding
technical platform access does not itself grant operational or refund authority. The full role-scoped
Operations Console command model, exception handling, and audit requirements are fixed by
[ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md); exact permission names and
monetary thresholds remain open, per
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#explicit-non-decisions).

## Payment and refund access

A payment account is resolved from the order's outlet and its selling legal entity, exactly as
legal entity is already modeled as a distinct concept from operating organization above; the
customer never selects or influences which payment account or merchant credentials a payment uses.
Refund request and refund approval are separate, scope-gated permissions — a Support/Refund Operator
may request a refund, but approval within configured monetary authority is a distinct capability,
consistent with the V1 role scope already locked in
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#v1-system-roles). Administration
of payment-provider credentials is kept separate from refund authority where practical: holding
technical or platform-administration access does not itself grant routine refund approval. Finance
reconciliation of payments, refunds, and settlements is permission-scoped like any other finance
capability, consistent with the Finance Viewer role already locked above. Franchise organizations'
access to payment and refund data is limited to their own authorized legal entities and outlets,
consistent with the franchise-isolation principle already locked in
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#franchise-data-isolation); a
future franchise may hold its own payment account, merchant credentials, and refund authority
distinct from BOBA Bear's corporate configuration. The exact monetary limits for refund approval
remain open. The full payment-provider, payment-account resolution, refund-authority, and
reconciliation-permission decision is fixed by
[ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md).

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

Pricing and promotion authority is permission- and scope-based, following the same scoped
authorization principle used elsewhere in this document: brand-level price locks, floors, and
ceilings constrain what any downstream scope may set; outlet-level price editing is disabled by
default; and a franchise organization must not price outside its explicitly delegated scope,
consistent with franchise isolation, per
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#franchise-data-isolation). Any
promotion must record an explicit funding owner, and refund authority is a separate permission from
general order-management authority. Tax-policy activation requires its own dedicated authority,
distinct from routine pricing or availability changes. The full price-book hierarchy, override
policy, tax-policy model, and promotion-funding rules are fixed by
[ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md); the exact pricing and refund
permission catalog and monetary delegation limits remain open, per
[ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#explicit-non-decisions).

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

- [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md) — the full authorization architecture: scope inheritance, membership and role-assignment mechanics, delegation limits, franchise isolation, customer authorization, data minimization, break-glass and support-access controls, service identities, and audit requirements.
- [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md) — the full food-catalog, menu, assortment, and availability decision this document's catalog-inheritance summary is built on.
- [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md) — the full pricing, tax, charge, and promotion decision this document's pricing-foundation summary is built on.
- [ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md) — the full serviceability, service-zone-authority, outlet-resolution, and cart/checkout-access decision this document's serviceability, cart, and checkout access summary is built on.
- [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md) — the full payment-provider, payment-account resolution, refund-authority, and reconciliation-permission decision this document's payment and refund access summary is built on.
- [ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md) — the full order-lifecycle, outlet-acceptance, operational-command, and audit decision this document's kitchen and order operations access summary is built on.
- [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md) — the full delivery-provider abstraction, delivery-account ownership, courier-assignment, pickup-verification, and administrative-authority decision this document's delivery access summary is built on.
- [ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md) — the full notifications, WhatsApp, and assisted-commerce decision this document's notifications and WhatsApp access summary is built on, including provider-account administration, consent-override prohibition, and the separation of marketing from transactional support authority.
- [`architecture-foundation.md`](./architecture-foundation.md) — the relational data model and audit requirements these entities are built on.
- [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md) — the PostgreSQL and Drizzle persistence decision behind scoped repositories, the separation of database roles from business authorization, the cross-module write prohibition, and the deferred, selective Row-Level Security position summarized above.
- [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md) — the HTTP API and Route Handler decision behind the server-side actor, scope, and authorization resolution boundary summarized above.
- [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md) — the configuration and secrets decision confirming that technical platform administration (managing configuration, feature flags, and kill switches) never automatically grants the business authorization summarized above, and that feature-flag scope resolution follows this document's organization and outlet boundaries.
- [ADR-004](./decisions/ADR-004-identity-authentication-sessions.md) — the identity and authentication architecture that authorization in this document builds on; authentication and business authorization are kept strictly separate.
- [`order-payment-delivery-model.md`](./order-payment-delivery-model.md) — how outlet selection constrains a single order's cart.
- [`operating-model.md`](./operating-model.md) — how outlet-scoped roles (Outlet Manager, Kitchen Operator, Delivery Coordinator) are used day to day.
- [`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md) — franchise settlement, pricing authority, and customer-data-access questions that remain open.
- [`decision-register.md`](./decision-register.md) — structured record of the decisions summarized here.
