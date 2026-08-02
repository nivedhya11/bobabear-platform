---
Status: Canonical
Last updated: 2026-08-01
---

# BOBA Bear — Architecture Foundation

## Status

This document records **Locked** architectural principles that apply to all future platform work.
It deliberately stops short of prescribing specific technologies, providers, schemas, or
migrations — those remain **Open** (see [`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md))
or are out of scope for documentation-only work. Nothing in this document should be read as
selecting a hosting provider, database product, or cloud platform.

## Simple but scalable

The platform should remain:

- Economical to run.
- Operationally simple for a small team.
- Friendly to sequential, agentic development — i.e., buildable and extensible in coherent,
  reviewable increments rather than requiring large coordinated rewrites.
- Scalable across outlets and cities without a foundational redesign.
- Preferably hosted with transactional data and core services located in India, given the
  business's current market and likely regulatory expectations.

No cloud provider, hosting platform, or database product is selected in this document. A final
choice is an **Open** decision — see [`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md)
and the [decision register](./decision-register.md). Nothing elsewhere in the repository
constitutes an approved selection either.

## Modular monolith

The initial architecture should be a **modular monolith** rather than a microservices
architecture. A single deployable application, backed by a single primary relational database, is
expected to be sufficient through V1 and well beyond it. Microservices and container-orchestration
platforms (for example, Kubernetes) are explicitly **Deferred** — see
[`v1-product-scope.md`](./v1-product-scope.md).

"Modular monolith" means the codebase enforces clear internal module boundaries even though it
deploys as one unit. Expected logical modules include:

| Module | Responsibility |
|---|---|
| Identity | Authentication and identity for customers, staff, and service accounts |
| Customer profile | Customer account data, saved addresses, preferences |
| Organization | Brand, organization, legal-entity, and territory records |
| Outlet | Outlet records, configuration, and operational status |
| Catalog | Products, categories, variants, and modifier structure |
| Pricing | Price books and price resolution |
| Availability | Outlet-level stock, temporary unavailability, preparation time |
| Cart | Cart contents and cart-level pricing resolution |
| Checkout | Order assembly, tax/fee calculation, and submission |
| Payment | Payment initiation, verification, and refund handling |
| Order | Order records, order state, and order history |
| Kitchen operations | Direct-order fulfilment workflow (the Operations Console) |
| Delivery | Delivery assignment, state tracking, and provider abstraction |
| Notification | Customer- and staff-facing notifications, including WhatsApp |
| Administration | Staff, role, and permission management |
| Audit | Durable audit events for sensitive actions |
| Integration adapters | Boundaries around external systems (payment providers, delivery providers, WhatsApp, and any future aggregator-facing integration) |

These module boundaries are a design requirement even for a single-application, single-database
deployment. They exist so that a future move toward independently deployable services — if ever
needed — would follow existing seams rather than requiring a rewrite. No decision to eventually
split these modules into separate services has been made; the boundaries exist for maintainability
and optionality, not as a roadmap commitment.

## Evolution of the existing application

The current Next.js 16 / React 19 / TypeScript / Tailwind CSS v4 / Framer Motion application and
its design system should evolve in place where practical, rather than being discarded and rebuilt.
The marketing content, visual language, and component patterns already shipped represent real,
validated product investment.

The current deployment model — a fully static export (`output: "export"` in `next.config.ts`)
published to GitHub Pages — cannot host the transactional platform described in this documentation
set: it has no server runtime, no database connectivity, and no capacity for authenticated,
stateful requests. The deployment architecture will need to change to support customer accounts,
carts, checkout, payments, and order management. **This document does not prescribe what that
future deployment architecture is.** Hosting platform, runtime, and database product remain open —
see [`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md).

## Relational transactional data model

The platform should use a relational transactional data model appropriate for the entities this
documentation set describes, including customers, organizations, outlets, menus, modifiers, carts,
orders, payments, refunds, deliveries, permissions, and audit events. A relational model is
expected to give the strongest guarantees for the referential integrity, transactional
consistency, and auditability that order and payment data require.

**No database schema or migration is created as part of this documentation set.** Entity and
relationship descriptions in [`organization-outlet-access-model.md`](./organization-outlet-access-model.md)
and [`order-payment-delivery-model.md`](./order-payment-delivery-model.md) describe the conceptual
model to be built from, not a finalized schema.

## Audit requirements

Sensitive actions across the platform must produce durable audit events. This applies across
every module in the table above, not only to order and payment handling. Examples of actions that
must be auditable:

- Product changed
- Price changed
- Product disabled
- Outlet settings changed
- Order rejected
- Order cancelled
- Refund requested
- Refund approved
- Delivery reassigned
- Staff invited
- Role changed
- Permission changed
- Organization changed
- Outlet ownership changed
- Service area changed
- Franchise configuration changed

An audit event should conceptually capture:

- Actor
- Action
- Scope
- Target
- Previous value
- New value
- Timestamp
- Reason
- Correlation or request identifier

Audit logging is part of the V1 platform-foundation scope — see
[`v1-product-scope.md`](./v1-product-scope.md) — even though the actions it must cover expand as
later phases (multi-outlet, franchise) are built.

## Related documents

- [`v1-product-scope.md`](./v1-product-scope.md) — the release scope these principles must support.
- [`organization-outlet-access-model.md`](./organization-outlet-access-model.md) — the entities and access model built on the relational data model described here.
- [`order-payment-delivery-model.md`](./order-payment-delivery-model.md) — the order, payment, and delivery entities and integrity requirements.
- [`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md) — hosting, database, and provider choices that remain open.
- [`decision-register.md`](./decision-register.md) — structured record of the architectural decisions summarized here.
