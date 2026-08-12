---
Status: AMENDED
Governance status: AMENDED
Amended by: D-358 (docs/platform/decision-register.md)
Decision date: 2026-08-02
Last updated: 2026-08-11
---

# ADR-005: Organization, Outlet, and Business Authorization

## Status

**AMENDED** (2026-08-11) by **[D-358](../decision-register.md)**.

Scoped RBAC, permission-key checks, and deny-by-default authorization remain binding. Historical
prose in this ADR referring to **six** V1 system roles is not a competing current-state authority.
Current accepted role inventory is owned by [`STATE.md`](../STATE.md) and code (presently **seven**
system roles). Do not “fix” historical role-count wording by erasing it; prefer STATE for
inventory.

## Decision Date

2026-08-02

## Decision Owners

BOBA Bear founder and product leadership

## Context

[`organization-outlet-access-model.md`](../organization-outlet-access-model.md) already locks the
principle that BOBA Bear is multi-organization and multi-outlet by foundation, that authorization
must be permission-based rather than role-name-based, and that customer identity is owned by the
BOBA Bear brand rather than by any outlet or franchisee. [ADR-004](./ADR-004-identity-authentication-sessions.md)
fixed the identity, authentication, session, and recovery architecture, and explicitly separated
authentication ("who is this person, and is their session valid") from business authorization
("what may this person do"), naming the Access Control module as the owner of the latter without
resolving its internal design.

BOBA Bear's domain model anticipates corporate-operated outlets, franchise outlets, parent-child
organizations, parent-child territories, and a future master-franchise structure. Staff roles range
from brand-wide administration to single-outlet kitchen operation, and must never grant more access
than their assigned scope permits — in particular, one franchise organization must never be able to
reach another franchise organization's orders, staff, or customer data. Customers require a
completely different authorization basis, grounded in resource ownership rather than workforce
membership. Support and platform-administration access require narrow, auditable, and
time-bounded controls rather than standing unrestricted access. This ADR resolves the authorization
model, scope structure, workforce membership and role-assignment model, permission model, V1 system
roles, delegation rules, franchise-isolation rules, customer-authorization rules,
data-minimization rules, and the auditing and observability requirements needed to implement the
Access Control module referenced in [ADR-004](./ADR-004-identity-authentication-sessions.md#separation-of-authentication-and-business-authorization)
and in [`organization-outlet-access-model.md`](../organization-outlet-access-model.md#user-membership-role-and-permission-model).

## Decision Summary

BOBA Bear will use **scoped role-based access control with policy conditions and deny-by-default
authorization**. An authorization decision requires an active authenticated identity, an active
workforce membership, an active scoped role assignment, the specific required permission, a scope
that covers the target resource, and satisfaction of any applicable resource, security-assurance,
business-state, delegation, and monetary or operational conditions. If an action is not explicitly
permitted by this combination, it is denied.

Authorization is owned entirely by the **Access Control module**, never by Better Auth's own
organization or role functionality, consistent with [ADR-004](./ADR-004-identity-authentication-sessions.md#what-better-auth-must-not-become-the-source-of-truth-for).
Supported authorization scopes are **platform, brand, organization, territory, and outlet**.
Permission inheritance flows **downward only** — brand to organization/territory to outlet — and
only where both the role assignment and the specific permission allow it; inheritance never moves
upward, sideways to a sibling organization, or across brands. Workforce membership (the employment
or affiliation relationship) is modeled separately from role assignment (the specific role held at a
specific scope), so one person may hold several role assignments concurrently. Permissions use
stable, namespaced identifiers (for example `catalog.availability.manage`), and application code must
check permissions, never role names. V1 exposes six centrally maintained system roles — Brand
Administrator, Outlet Manager, Kitchen Operator, Delivery Coordinator, Support and Refund Operator,
and Finance Viewer — combined under an **allow-only permission-union model**; custom, franchise-created
roles and generic user-configurable deny roles are both rejected for V1. Delegated administration can
never grant more authority than the assigner holds, and self-elevation is prohibited. Franchise
organizations are isolated from one another's orders, staff, customers, and configuration. Customers
are authorized by resource ownership, not workforce role, and customer identity remains owned by the
BOBA Bear brand regardless of which outlet or franchise fulfilled a given order. Staff-facing data
must be minimized to the field-level detail a given role actually requires. Break-glass platform
access and support access are both narrowly scoped, time-limited, and audited; standing unrestricted
support access is rejected. Service identities (background workers, webhook processors, future POS
devices) are separate authorization principals from human workforce members.

This is an accepted, final decision for BOBA Bear's business-authorization architecture — not a
recommendation or a provisional option. It fixes the authorization model, scope types, inheritance
rules, membership/role-assignment separation, permission model, V1 role set, delegation constraints,
franchise-isolation requirements, customer-authorization basis, data-minimization principle, and
auditing requirements. It does not fix the authorization database schema, the exact permission
catalog, the exact refund or monetary delegation limits, the exact cache and invalidation
implementation, the exact break-glass or support-access workflow, or several other implementation
details — see [Explicit Non-Decisions](#explicit-non-decisions).

## Authorization Model

Authorization combines an active authenticated identity, an active workforce membership, an active
scoped role assignment, the required permission, the applicable authorization scope, resource
ownership and hierarchy, authentication assurance, business-state conditions, delegation limits, and
monetary or operational limits where applicable:

```text
Authorization decision
    =
Active identity
    +
Active membership
    +
Assigned role
    +
Required permission
    +
Applicable scope
    +
Resource and security conditions
```

If an action is not explicitly permitted, it must be denied. This deny-by-default posture applies
uniformly across every module listed in
[`architecture-foundation.md`](../architecture-foundation.md#modular-monolith).

## Authentication and Authorization Separation

Authentication remains governed by [ADR-004](./ADR-004-identity-authentication-sessions.md).
Authorization is owned by the Access Control module:

```text
Better Auth / Identity module
    Who is this person?
    Is their session valid?
    Did they complete MFA or step-up authentication?

Access Control module
    Which active memberships and assignments exist?
    Which permissions apply?
    At which scope?
    May the person act on this resource now?
```

A valid session alone does not authorize outlet access, staff administration, order mutation,
refund approval, catalog changes, pricing changes, customer-data access, finance access, or
franchise access. Authentication-framework roles or organization plugins must not become the source
of truth for BOBA Bear business authorization, consistent with
[ADR-004](./ADR-004-identity-authentication-sessions.md#what-better-auth-must-not-become-the-source-of-truth-for).

## Organizational Hierarchy

The platform supports a configurable hierarchy:

```text
Platform
└── Brand
    ├── Corporate operating organization
    │   ├── Territory
    │   │   ├── COCO outlet
    │   │   └── COCO outlet
    │
    └── Franchise hierarchy
        ├── Master franchisee
        │   └── Regional franchise organization
        │       └── Franchisee organization
        │           ├── Franchise outlet
        │           └── Franchise outlet
```

Not every market or implementation uses every level. The model supports corporate-operated outlets,
franchise-operated outlets, parent-child organizations, parent-child territories, multiple outlets
under one organization, multiple organizations under one brand, and future master-franchise
structures, extending the multi-organization foundation already locked in
[`organization-outlet-access-model.md`](../organization-outlet-access-model.md#guiding-principle).

## Distinct Domain Concepts

The following concepts remain distinct and must not be merged:

**Brand** — BOBA Bear's brand identity and brand-level policies.

**Organization** — an operating or commercial organization (brand owner, corporate operator, master
franchisee, area developer, regional operator, franchisee). Organizations support parent-child
relationships.

**Legal entity** — the entity responsible for invoicing, tax registration, contractual obligations,
payment receipt, and settlement responsibility. A legal entity is a protected business resource, not
a general authorization scope shortcut — see
[`organization-outlet-access-model.md`](../organization-outlet-access-model.md#legal-entity) for why
legal entity and operating organization must not be merged.

**Territory** — geographic or commercial operating rights. Territories may support parent-child
relationships.

**Outlet** — a physical kitchen, store, kiosk, or fulfilment location. Every outlet should eventually
reference brand, operating organization, legal entity, territory, outlet type, physical location,
and operational status.

## Authorization Scopes

Supported scope types are:

```text
PLATFORM
BRAND
ORGANIZATION
TERRITORY
OUTLET
```

Every role assignment must have an explicit scope type and scope identifier.

**Platform scope** is reserved for narrowly controlled technical platform administration, support,
and audit capabilities, and must not automatically grant unrestricted customer-data access.

**Brand scope** may apply to the BOBA Bear brand and explicitly permitted descendant organizations,
territories, and outlets.

**Organization scope** may apply to one organization and explicitly permitted descendant
organizations and outlets.

**Territory scope** may apply to one territory, its permitted descendant territories, and associated
outlets.

**Outlet scope** applies only to the specified outlet.

Legal entities are authorized resources accessed through explicit permissions and trusted
relationships; they must not act as unrestricted hierarchy scopes.

## Scope Inheritance

Permissions may inherit downward only when both the role assignment permits inheritance and the
specific permission is defined as inheritable:

```text
Brand
    ↓
Organizations and territories
    ↓
Outlets
```

Inheritance must never move upward to a parent scope, sideways to a sibling organization, sideways
to another franchisee, into an unrelated territory, or into another brand. For example: a Brand
Administrator may administer permitted descendant BOBA Bear outlets; a Franchise Administrator may
administer permitted outlets belonging to that franchise organization; a Regional Manager may access
outlets in the assigned territory; an Outlet Manager may access only assigned outlets. The exact
storage representation for inheritance remains open — see
[Explicit Non-Decisions](#explicit-non-decisions).

## Workforce Membership and Role Assignment

Workforce membership is a separate relationship from role assignment:

```text
Human identity
    ↓
Workforce membership
    ├── Affiliated or employing organization
    ├── Membership status
    ├── Start date
    └── End date
            ↓
Role assignment
    ├── Role
    ├── Scope type
    ├── Scope identifier
    ├── Validity period
    ├── Inheritance setting
    └── Assignment metadata
```

One person may hold several assignments — for example, a Brand Catalog Manager at brand scope, an
Outlet Manager at Outlet A, and a Finance Viewer at Organization B, all at once. A role definition
must not permanently contain a specific outlet, organization, or user identifier.

### Workforce membership states

Workforce membership supports at least:

```text
INVITED
ACTIVE
SUSPENDED
REVOKED
EXPIRED
```

- **Invited** — invitation exists, but onboarding and authentication requirements are incomplete.
- **Active** — membership may contribute permissions through active role assignments.
- **Suspended** — temporarily blocks all permissions contributed by the membership; applicable
  sessions must be re-evaluated or revoked.
- **Revoked** — the business relationship has ended.
- **Expired** — a time-limited membership is no longer valid.

Only active memberships may contribute authorization.

## Role Definitions and Assignments

A **role definition** is a named, BOBA Bear-maintained bundle of permissions (for example, Brand
Administrator, Outlet Manager, Kitchen Operator, Delivery Coordinator, Support and Refund Operator,
Finance Viewer). A **role assignment** connects one active workforce membership, one role
definition, one explicit scope, one validity period, and assignment metadata — for example, Kitchen
Operator at the Dehradun outlet.

V1 uses centrally maintained BOBA Bear system roles. Custom franchise-created roles are deferred.
Generic user-configurable deny roles are rejected for V1.

## Permission Model

Permissions use stable, namespaced identifiers, for example:

```text
organization.view
organization.manage
outlet.view
outlet.manage
outlet.operating_status.manage
staff.view
staff.invite
staff.role.assign
staff.membership.suspend
catalog.product.view
catalog.product.manage
catalog.availability.manage
pricing.view
pricing.manage
pricing.override
order.view
order.accept
order.reject
order.prepare
order.mark_ready
order.cancel
delivery.view
delivery.assign
delivery.update
refund.request
refund.approve
finance.payment.view
finance.report.view
customer.support.view
customer.contact
audit.view
```

Application code must check permissions, not role names:

```text
// Incorrect
if role === "OUTLET_MANAGER"

// Approved
authorize(actor, "catalog.availability.manage", outlet)
```

The exact permission catalog remains subject to implementation and later domain refinement.

## V1 System Roles

**Brand Administrator** (brand scope) may manage permitted organizations and outlets, invite and
manage workforce users, manage brand catalog and configuration, view direct-order operations, access
permitted audit history, and manage brand-level settings. High-risk actions still require step-up
authentication per [ADR-004](./ADR-004-identity-authentication-sessions.md#step-up-authentication).

**Outlet Manager** (one or more explicitly assigned outlets) may manage outlet operations and
availability, view and manage direct orders, coordinate staff within delegated authority, coordinate
delivery, and perform permitted operational actions. Must not automatically control other outlets,
brand ownership, legal entities, payment accounts, unlimited refunds, or franchise agreements. Outlet
Manager control over product, variant, and modifier-option availability, and outlet-ordering pause, is
governed in full by [ADR-006](./ADR-006-food-catalog-assortment-availability.md#catalog-administration-authority);
canonical product and modifier identity remain brand-controlled and outside this role's authority.

**Kitchen Operator** (assigned outlet) may view incoming kitchen orders, accept or reject orders
where permitted, mark orders preparing or ready, and view necessary preparation instructions. Must
not automatically access staff administration, pricing administration, finance reports, refund
approval, or other outlets.

**Delivery Coordinator** (assigned outlet or territory) may view delivery-required orders, assign or
record riders, update delivery status, and view customer contact and address data required for
delivery. Customer data must be minimized to operational need.

**Support and Refund Operator** (assigned brand, organization, territory, or outlet) may search
permitted orders, view necessary customer and payment context, contact customers, request
cancellation, request refunds, and approve refunds only within explicitly configured authority.
Exact refund limits and approval thresholds remain open.

**Finance Viewer** (assigned brand, organization, territory, or outlet) may view payment reports,
view settlement-relevant data, and export explicitly permitted financial reports. This role is
read-only and must not automatically grant order mutation, customer-support actions, refund
authority, or full customer profile access.

**Platform Super Administrator** is reserved for technical administration and emergency recovery and
must not be used for routine BOBA Bear operations.

## Permission Evaluation Sequence

Authorization must conceptually evaluate, in order: authenticate identity; confirm identity is
active; confirm required MFA or step-up assurance; resolve active workforce memberships; resolve
active role assignments; confirm required permission; confirm assignment scope covers resource
scope; apply hierarchy and inheritance rules; apply resource and business-policy conditions; record
sensitive authorization context; execute the use case.

Sensitive use cases should receive an actor context containing identity, session assurance,
memberships, role assignments, resolved scopes, permissions, and a correlation identifier. The
client must never be trusted to provide authoritative role, permission, organization, territory,
outlet, membership, delegation, or authorization-decision data.

## Permission-Combination Rules

V1 uses an **allow-only permission-union model**. A user may receive the union of permissions from
active assignments when at least one active assignment grants the permission, the assignment scope
covers the resource, required security assurance is satisfied, and resource and business policies
allow the action:

```text
Active assignment grants permission
        +
Scope covers resource
        +
Security and business policies pass
        =
Allowed
```

Access may still be denied because identity is inactive, membership is inactive, assignment is
expired, scope does not cover the resource, organization or outlet is suspended, MFA is incomplete,
step-up authentication is missing, monetary authority is exceeded, or business state prohibits the
action. Generic deny-role conflict resolution is not introduced in V1.

## Delegated Administration

A manager must never delegate more authority than they possess. A role assignment is permitted only
when: the assigner has the required staff-assignment permission; the assigner possesses all
delegated permissions or has explicit delegation authority; the target scope is the same as or a
descendant of the assigner's scope; the role is permitted at the target scope type; the assignment
does not exceed the assigner's validity period; required step-up authentication is complete; and the
action is audited.

A franchise administrator must not: grant brand-wide access; grant access to another franchise
organization; create a platform administrator; grant undelegated permissions; modify locked system
roles; elevate their own authority; assign a parent or sibling scope; or remove the final required
administrator without an approved replacement process. Custom role creation remains deferred.

## Franchise Data Isolation

A franchise organization may access only data required to operate its assigned scope. A franchise
organization must not access another franchise organization's orders, revenue, payment data, staff,
customer information, delivery data, configuration, reports, audit history, price overrides, or
operational metrics. Brand-level staff may access franchise information only when their active
permissions and scopes authorize it. Franchise ownership does not imply ownership of BOBA Bear
customer identity, complete customer history, customer activity outside the franchise's assigned
orders, or brand-wide loyalty or drop eligibility. Customer identity remains owned by the BOBA Bear
brand, consistent with
[`organization-outlet-access-model.md`](../organization-outlet-access-model.md#customer-ownership).

## Customer Authorization

Customers do not use workforce roles. Customer authorization is based on an active authenticated
identity, a linked customer profile, resource ownership, order relationship, and explicit
customer-facing policy. Customers may access only their own profile, addresses, cart, checkout
sessions, orders, customer-visible payment information, refund status, delivery tracking, and
communication preferences. A customer must not gain access merely by knowing an order number.
Protected order tracking must verify customer ownership or use a future secure guest-token model; the
exact guest-tracking authorization model remains open.

## Customer-Data Minimization

Staff response models must expose only the customer information required for the authorized task.
Kitchen Operator may need customer first or display name, ordered items, preparation instructions,
and necessary order context, but should not automatically receive full payment history, full address
history, complete customer profile, or unrelated order history. Delivery Coordinator may need
delivery address, delivery contact number, delivery instructions, and relevant order details. Finance
Viewer should not automatically receive full delivery address, delivery instructions, full customer
profile, or unrelated contact data. Support Operator may receive the information required to resolve
an assigned order or support issue. The architecture must permit field-level data minimization
through authorized DTOs; the exact DTO implementation remains open.

## Organization and Outlet States

The authorization model must consider organization and outlet operational state.

Conceptual organization states: `DRAFT`, `ACTIVE`, `SUSPENDED`, `TERMINATED`.

Conceptual outlet states: `DRAFT`, `ONBOARDING`, `ACTIVE`, `TEMPORARILY_CLOSED`, `SUSPENDED`,
`CLOSED`.

A suspended organization cannot accept or fulfil new direct orders. A suspended outlet cannot
receive new orders. A temporarily closed outlet may remain administratively accessible. Limited read
access may remain available for reconciliation where explicitly permitted. Termination revokes
routine operational access while preserving required records. Exact state transitions remain open.

## Repository and Data-Scoping Rules

Relevant business records must carry sufficient ownership context, which may include brand
identifier, organization identifier, territory identifier, outlet identifier, legal-entity
identifier, and customer identifier, depending on the owning module. Not every table requires every
scope identifier; the owning module must define the minimum authoritative ownership context.

Staff-facing repositories must require trusted scope or authorization context. Cross-outlet data
must not be returned by default. Client-supplied resource identifiers must be re-resolved on the
server. Query filters must be derived from trusted memberships and assignments. Cross-scope joins
must preserve authorization boundaries. Bulk export requires explicit permission. Sensitive exports
must be audited. Cross-module direct access to Access Control persistence is prohibited.
Application-use-case authorization and scoped repositories are the primary V1 enforcement layers,
consistent with the module dependency rules in
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#dependency-rules).

## PostgreSQL Row-Level Security Position

PostgreSQL Row-Level Security is not mandatory for all V1 data. It is deferred as selective
defense-in-depth hardening for high-risk data sets, not rejected permanently. The primary V1 model is
central Access Control authorization, application-use-case enforcement, scoped repositories, trusted
server-side resource resolution, and integration and isolation tests.

## Role and Membership Change Propagation

Authorization changes must take effect promptly. Events such as membership suspension, membership
revocation, role removal, critical permission removal, outlet assignment removal, organization
assignment removal, and territory assignment removal must trigger, where applicable, session
re-evaluation, authorization-cache invalidation, session revocation, audit recording, and removal
from active operational views. Long-lived tokens must not preserve removed authority. The exact
cache and invalidation implementation remains open.

## Break-Glass Access

Emergency platform access must use a controlled break-glass process, available to very few platform
administrators, requiring mandatory MFA, mandatory step-up authentication, a required reason,
time-limited elevation, automatic expiry, an immutable audit event, notification to designated
leadership, and post-use review. Break-glass access is intended for production incidents,
administrative lockout recovery, security investigation, and critical data-recovery operations. It
must not be used for routine support, catalog management, refund work, or outlet administration. The
exact approval and technical implementation remain open.

## Support Access

Platform support personnel must not receive standing unrestricted production access. Support access
should be permission-scoped, organization or outlet-scoped where practical, time-limited for
sensitive access, read-only by default, purpose-bound, and audited. Standing unrestricted support
access is rejected. Customer impersonation is not approved as a general support capability; any
future customer-impersonation feature requires a separate architecture and security decision.

## Service Identities

Service identities are separate authorization principals from human workforce members — for example,
a background worker, payment webhook processor, WhatsApp callback handler, delivery-provider
callback handler, scheduled reconciliation job, future POS device, or future aggregator adapter. A
service identity must have an explicit purpose, a narrow permission bundle, an applicable scope,
credential rotation, revocation capability, and audit attribution. Service identities must not
receive human workforce roles. The exact service-credential technology remains open under
[ADR-004](./ADR-004-identity-authentication-sessions.md#service-identities) and future integration
design.

## Audit Requirements

Audit events are mandatory for: workforce invitation; membership activation; membership suspension;
membership revocation; role assignment; role removal; permission-bundle change; delegation attempt;
failed privilege-escalation attempt; break-glass activation; break-glass expiry; sensitive support
access; high-risk authorization denial; franchise access-boundary change; territory assignment
change; outlet assignment change; bulk data export; and sensitive customer-data access where
required. An audit record should conceptually capture actor, actor type, action, target, scope,
permission, authorization decision, reason, timestamp, correlation identifier, and before/after
metadata where applicable.

## Authorization Observability

Authorization failures should produce safe, structured internal reason codes, for example:
`IDENTITY_INACTIVE`, `MEMBERSHIP_INACTIVE`, `ASSIGNMENT_EXPIRED`, `PERMISSION_MISSING`,
`SCOPE_MISMATCH`, `MFA_REQUIRED`, `STEP_UP_REQUIRED`, `RESOURCE_STATE_PROHIBITS_ACTION`,
`DELEGATION_EXCEEDS_AUTHORITY`, `ORGANIZATION_SUSPENDED`, `OUTLET_SUSPENDED`. External client
responses must not expose sensitive hierarchy or permission information. Internal logs and audit
records may retain more detail where secure and necessary.

## Central Access Control Boundary

The Access Control module should expose a central internal authorization interface conceptually
similar to:

```text
authorize({
  actor,
  permission,
  resource,
  context
})
```

Application modules must use this central boundary. They must not independently reimplement scope
traversal, role resolution, permission union, delegation checks, membership-state logic, franchise
isolation, or step-up rules. The exact API signature, policy syntax, schema, and caching remain
implementation decisions. A third-party policy engine is not required for V1; typed Node.js/TypeScript
application policies are sufficient for the initial platform.

## Testing Requirements

**Unit tests** must cover: role grants required permission; missing permission is denied; inactive
membership is denied; expired assignment is denied; scope mismatch is denied; step-up requirement is
enforced; delegation cannot exceed assigner authority; self-elevation is denied; suspended
organization or outlet affects access.

**Integration tests** must cover: Franchise A cannot access Franchise B; Outlet A staff cannot
access Outlet B; Brand role can access permitted descendants; Organization role cannot access parent
organization; Organization role cannot access sibling organization; Territory role resolves only
permitted outlets; removed role stops access; suspended outlet blocks operational actions; customer
accesses only their own order; Finance Viewer receives minimized customer data; Kitchen Operator does
not receive unauthorized finance data.

**Architecture tests** must enforce: application modules use the central Access Control API; Route
Handlers do not contain final permission logic; UI components are not the final authorization layer;
cross-module deep imports into Access Control internals are prohibited; direct access to
authorization persistence is prohibited.

The exact testing framework remains open under
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#testing-structure).

## Cross-Reference: ADR-009 Payment Account and Refund Authority

Payment-account and refund access are permission-scoped resources under this ADR's authorization
model: a Support and Refund Operator may request a refund, while approval within configured monetary
authority requires the distinct authority already described in
[V1 System Roles](#v1-system-roles) above, and payment-account administration is kept separate from
refund authority where practical, per
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#payment-administration-authority).
Payment webhooks, reconciliation jobs, and other automated payment processing run as **service
identities**, per [Service Identities](#service-identities) above — they are never granted human
workforce roles and never impersonate a customer or workforce member, consistent with
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#webhook-signature-verification-and-acceptance).

## Consequences

### Positive

- Scoped RBAC with policy conditions and deny-by-default authorization gives BOBA Bear a single,
  consistent authorization model that scales from a single-outlet V1 to a multi-brand,
  multi-franchise future without a foundational redesign.
- Separating workforce membership from role assignment lets one person hold multiple concurrent
  assignments across scopes without contorting a single-role user model.
- Permission-based checks, rather than role-name checks, keep application code stable as roles are
  refined or new roles are introduced later.
- Downward-only inheritance and explicit franchise isolation prevent an entire category of
  cross-organization data leakage as the franchise model grows.
- Central Access Control boundary keeps authorization logic out of Route Handlers and UI components,
  consistent with the module dependency rules already locked in
  [ADR-003](./ADR-003-modular-monolith-node-typescript.md).

### Trade-offs accepted

- V1 system roles are less flexible than custom, franchise-configurable roles; franchise
  organizations cannot tailor their own role definitions until custom roles are built.
- An allow-only permission-union model defers more nuanced deny-role conflict resolution; this is
  accepted as sufficient for V1's centrally maintained role set.
- Deferring PostgreSQL Row-Level Security means the application layer is the sole enforcement point
  for V1; this is accepted in favor of applying RLS selectively, only where later risk assessment
  justifies the added operational complexity.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| A franchise administrator delegates more authority than they hold | Delegation rules require the assigner to possess all delegated permissions and restrict target scope to the assigner's own scope or its descendants, per [Delegated Administration](#delegated-administration) |
| A compromised or over-broad role assignment exposes another franchise's data | Downward-only inheritance and explicit franchise-isolation rules, verified by mandatory integration tests, per [Franchise Data Isolation](#franchise-data-isolation) and [Testing Requirements](#testing-requirements) |
| A removed role or suspended membership continues granting access via a stale session | Mandatory session re-evaluation and authorization-cache invalidation on membership or role change, per [Role and Membership Change Propagation](#role-and-membership-change-propagation) |
| Support staff use standing access for unauthorized customer-data viewing | Support access is permission-scoped, time-limited, read-only by default, and audited; standing unrestricted access is rejected, per [Support Access](#support-access) |
| Break-glass access is used for routine work instead of emergencies | Break-glass requires mandatory MFA, step-up authentication, a recorded reason, automatic expiry, and leadership notification, per [Break-Glass Access](#break-glass-access) |
| A staff-facing DTO leaks customer data beyond operational need | Field-level data minimization is a required architectural capability per role, per [Customer-Data Minimization](#customer-data-minimization) |

## Explicit Non-Decisions

This decision does not resolve the following, which remain **Open** or **Deferred** and must not be
treated as answered by this ADR:

- Exact authorization database schema
- Exact table names
- Exact hierarchy-storage model
- Exact scope-inheritance representation
- Exact permission catalog
- Exact role-permission assignments
- Exact authorization-cache implementation
- Exact cache-invalidation mechanism
- Exact refund approval limits
- Exact monetary delegation limits
- Exact guest-order tracking model
- Exact break-glass approval workflow
- Exact break-glass technical implementation
- Exact support-access approval process
- Exact field-level DTO definitions
- Exact organization-state transitions
- Exact outlet-state transitions
- Exact selective PostgreSQL RLS usage
- Exact service-identity credential mechanism
- Exact authorization error mapping
- Exact audit-retention policy
- Exact franchise pricing authority
- Exact franchise promotion authority
- Exact brand override powers
- Exact franchise finance visibility
- Custom role timing
- Customer impersonation design

## Rejected or Deferred Alternatives

- **Authentication-framework roles as business authority** — rejected; Better Auth's own
  organization or role functionality is not used as BOBA Bear's business-authorization model.
- **Role-name checks in application code** — rejected; application code must check permissions.
- **Generic user-configurable deny roles** — rejected for V1.
- **Custom franchise-created roles** — deferred, not rejected.
- **Separate authorization logic in every module** — rejected; the central Access Control boundary
  is mandatory.
- **Standing unrestricted platform-support access** — rejected.
- **General customer impersonation** — not approved; requires a separate future decision.
- **Mandatory PostgreSQL Row-Level Security for every table** — not selected for V1; selective
  future use remains permitted.
- **A third-party policy engine** — not required for V1; typed Node.js/TypeScript application
  policies are sufficient.

## Cross-Reference: ADR-010 Operational Commands

Order acceptance, rejection, cancellation, workflow correction, priority change, and manual completion
are operational commands scoped and permission-gated under this ADR's authorization model. Correction
commands and manual completion require elevated, explicitly permissioned authority beyond routine
kitchen operation. Customer data surfaced in the Operations Console is minimized by role exactly as
required by [Customer-Data Minimization](#customer-data-minimization) below, and every exception,
cancellation, and correction action is audited. The full operational command model, exception
lifecycle, and Operations Console role views built on this authorization foundation are fixed by
[ADR-010](./ADR-010-order-lifecycle-operations-console.md).

## Cross-Reference: ADR-011 Delivery Authorization

Delivery data — recipient contact, delivery address, courier identity, and rider contact — is
role-minimized under [Customer-Data Minimization](#customer-data-minimization) above. Provider
selection, courier assignment, delivery manual completion, and provider-cost approval each require a
scoped permission under this ADR's authorization model, distinct from routine order-view access, per
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#administrative-authority). Rider contact
information and customer delivery-contact data are sensitive and must be minimized and masked where
supported, per
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#courier-contact-and-masking). Delivery
provider-webhook processors run as **service identities** under
[Service Identities](#service-identities) above — they process provider callbacks without
impersonating a human workforce member or a customer.

## Cross-Reference: ADR-013 Persistence Controls

[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#repository-rules) keeps this ADR's
authorization model primary at the persistence layer. Application use-case authorization and scoped
repositories that resolve outlet, organization, and customer scope from trusted server context remain
the primary V1 data-boundary mechanism. PostgreSQL Row-Level Security remains deferred as a selective
defence-in-depth option and is not introduced as an alternative authorization layer, per
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#row-level-security-position).
Database constraints and database roles complement authorization by preventing structurally invalid
or over-privileged writes, but they never express business permission rules and never substitute for
the permission checks fixed here, per
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#database-constraints). Cross-module
repository access remains restricted: a module reaches another module's data only through that
module's application contract.

## Related Canonical Documents

- [`organization-outlet-access-model.md`](../organization-outlet-access-model.md) — the brand,
  organization, legal-entity, territory, and outlet entities, and the membership and role model this
  decision fully specifies.
- [ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md) — the persistence decision that
  fixes scoped-repository rules, database constraints and roles, and the deferred, selective
  Row-Level Security position supporting this ADR's authorization model, per the cross-reference
  above.
- [`architecture-foundation.md`](../architecture-foundation.md) — the modular-monolith principle,
  Access Control module reference, and audit requirements this decision implements in detail.
- [ADR-003](./ADR-003-modular-monolith-node-typescript.md) — the module boundaries and dependency
  rules the central Access Control boundary must follow.
- [ADR-004](./ADR-004-identity-authentication-sessions.md) — the identity, authentication, session,
  and step-up authentication decision this authorization model builds on; authentication and
  business authorization remain strictly separate.
- [ADR-006](./ADR-006-food-catalog-assortment-availability.md) — the food-catalog, assortment, and
  availability decision that Brand Catalog Manager, territory/organization administrator, and Outlet
  Manager catalog-administration authority is fixed by.
- [`order-payment-delivery-model.md`](../order-payment-delivery-model.md) — the order, payment, and
  refund operations governed by the permissions and roles defined here.
- [`operating-model.md`](../operating-model.md) — how outlet-scoped roles are used day to day in the
  Operations Console.
- [`v1-product-scope.md`](../v1-product-scope.md) — the V1 release scope this authorization model
  must support.
- [ADR-014](./ADR-014-http-api-route-handlers-contracts.md) — the HTTP API decision that resolves
  actor identity, membership, and scope at the HTTP boundary and never trusts a client-supplied
  scope, per the authorization model fixed here.
- [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md) — the payment-account, refund
  authority, and service-identity webhook-processing decision built on top of this ADR's permission
  and scope model, per the cross-reference above.
- [ADR-010](./ADR-010-order-lifecycle-operations-console.md) — the operational-command, exception,
  and Operations Console role-view decision built on top of this ADR's scoped, permission-based
  authorization model, per the cross-reference above.
- [ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md) — the delivery-provider abstraction,
  provider-selection, courier-assignment, and delivery-administrative-authority decision built on top
  of this ADR's scoped, permission-based authorization and data-minimization model, per the
  cross-reference above.
- [ADR-015](./ADR-015-configuration-secrets-feature-flags.md) — the configuration and secrets
  decision that reuses this ADR's permission-based authorization model for configuration, feature-
  flag, and kill-switch administration, and confirms feature flags never substitute for the
  authorization checks fixed here.
- [`roadmap-and-open-decisions.md`](../roadmap-and-open-decisions.md) — the open decisions this ADR
  does not resolve.
- [`decision-register.md`](../decision-register.md) — the structured register entries this ADR
  locks.
- [`README.md`](../README.md) — the canonical documentation index and update protocol.
