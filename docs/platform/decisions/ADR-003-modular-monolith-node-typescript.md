---
Status: Accepted
Decision date: 2026-08-02
Last updated: 2026-08-02
---

# ADR-003: Modular Monolith on Node.js and TypeScript

## Status

Accepted

## Decision Date

2026-08-02

## Decision Owners

BOBA Bear founder and product leadership

## Context

[ADR-001](./ADR-001-digitalocean-platform.md) established DigitalOcean as the platform's cloud
foundation and named "the Next.js modular monolith and background worker" as the workload running
on DigitalOcean App Platform. [ADR-002](./ADR-002-environments-ci-cd-release-model.md) established
the environment, CI/CD, release, migration, secrets, and rollback model around that same workload,
including that "the web application and background worker deploy from the same image." Neither ADR
fixed the backend programming language, the repository strategy, the internal module boundaries, or
the concrete web/worker process model — they assumed a single application and worker built from one
codebase without specifying what that codebase is written in or how it is internally organized.

[`architecture-foundation.md`](../architecture-foundation.md) separately locked "modular monolith"
as the architectural style and listed expected logical modules, but left the implementation
language, the exact source-tree structure, cross-module dependency rules, and the mechanics of
asynchronous and transactional reliability open. BOBA Bear is evolving from a statically exported
Next.js marketing site into a transactional platform covering customer accounts, ordering, payments,
outlet operations, and a Kitchen Operations Console. That evolution requires firm answers to: what
language and runtime the application and worker are written in, how many repositories and deployable
units exist, how the codebase is organized into modules, how those modules may depend on one another,
how asynchronous work is made reliable, and how the existing marketing site migrates into that
structure — so that implementation work can proceed against a fixed foundation rather than ad hoc,
per-change decisions.

## Decision Summary

BOBA Bear will build the platform as a **modular monolith**: one Git repository, one primary
package, one Next.js application, one TypeScript application codebase, one OCI image, one web
process, one background-worker process, and one PostgreSQL database, with business logic internally
separated into clearly owned modules. The backend language and runtime are **Node.js** and
**TypeScript**, with **Node.js 24 LTS** as the initial production runtime line. The existing Next.js
application remains the host for all customer- and staff-facing surfaces and HTTP APIs; Route
Handlers are thin transport adapters that delegate to application use cases, which enforce
authorization and orchestrate domain rules and database transactions. The codebase is organized into
domain, application, infrastructure, and UI layers per module, with a mandatory dependency direction,
a transactional outbox for durable asynchronous work, and idempotent handling of inbound external
events. Microservices, a separate Java or Go backend, a separate NestJS service, and a separate API
repository are explicitly not selected for V1.

This is an accepted, final decision for BOBA Bear's application architecture, repository strategy,
and backend language — not a recommendation or a provisional option. It fixes structure and
direction; it does not select an ORM, migration framework, runtime-validation library, queue
technology, dependency-injection approach, architecture-enforcement tool, or test frameworks — see
[Explicit Non-Decisions](#explicit-non-decisions).

## Backend Language and Runtime

BOBA Bear will use **Node.js** with **TypeScript** as the sole backend language and runtime, and
**Node.js 24 LTS** as the initial production runtime line. Node.js 24 LTS must eventually be pinned
consistently across local development, CI, the OCI image, staging, and production. The exact patch
version is an implementation detail for a later coding slice.

### Why Node.js and TypeScript fit the existing platform

- The shipped marketing site is already a Next.js, React, and TypeScript application; a Node.js and
  TypeScript backend shares language, tooling, type definitions, and developer expertise with the
  code that already exists, rather than introducing a second language boundary.
- ADR-001 and ADR-002 already describe "the Next.js modular monolith and background worker" as a
  single Node.js-hostable workload; Node.js and TypeScript are the only choice that lets the web
  process and worker process share one codebase, one dependency tree, and one build without a
  cross-language integration layer.
- A single-language codebase keeps the platform approachable for a small team and for sequential,
  agentic development, consistent with the "simple but scalable" principle in
  [`architecture-foundation.md`](../architecture-foundation.md#simple-but-scalable).
- TypeScript's static typing supports the DTO and contract boundaries this ADR requires (see
  [DTO and API Boundaries](#dto-and-api-boundaries)) without a separate schema-definition language.

### Rejected for V1

- A separate Java backend
- A separate Go backend
- A separate NestJS backend service
- A separate API repository
- A separately deployed backend service

Java, Go, or independently deployed services may be considered later only when a specific workload,
scale requirement, or organizational need justifies extraction. This ADR does not evaluate those
languages or frameworks in detail; it records only that they are not selected for V1.

## Repository Strategy

The repository remains a **single-package repository** for V1. BOBA Bear will not introduce
monorepo workspaces, independently versioned internal packages, separate frontend and backend
repositories, separate customer, admin, or kitchen applications, or permanent service-specific
repositories. A monorepo may be reconsidered later when BOBA Bear has genuinely separate clients or
independently released applications, such as native Android or iOS applications.

## Target Source Structure

The following is the approved target organization of the repository. It documents intended
structure; this ADR does not create it.

```text
.
├── src/
│   ├── app/
│   │   ├── (marketing)/
│   │   ├── (customer)/
│   │   ├── (operations)/
│   │   └── api/
│   │
│   ├── components/
│   │   ├── ui/
│   │   └── marketing/
│   │
│   ├── modules/
│   │   └── <module-name>/
│   │       ├── domain/
│   │       ├── application/
│   │       ├── infrastructure/
│   │       ├── ui/
│   │       └── index.ts
│   │
│   ├── shared/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── ui/
│   │
│   ├── config/
│   └── worker/
│
├── db/
│   ├── migrations/
│   └── seeds/
│
├── tests/
│   ├── architecture/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
│
├── public/
├── infra/
├── docs/
├── scripts/
└── configuration files
```

The exact ORM, migration framework, queue library, test framework, and dependency-injection approach
remain open (see [Explicit Non-Decisions](#explicit-non-decisions)).

## Application Surfaces

One Next.js application hosts three logical route surfaces, organized as route groups. Route groups
are an organizational mechanism only — they do not provide authorization; sensitive access must be
enforced through server-side use cases and authorization policies.

| Route group | Purpose | Examples |
| --- | --- | --- |
| `src/app/(marketing)/` | Public marketing pages | Homepage, brand content, public menu discovery, merchandise teasers, drop teasers, artist collaborations |
| `src/app/(customer)/` | Customer-facing commerce | Serviceability, menu, product customization, cart, checkout, customer account, addresses, order history, order tracking |
| `src/app/(operations)/` | Staff-facing operations | Kitchen Operations Console, order queue, catalog administration, availability management, delivery coordination, refund operations, staff administration, finance views |

Route Handlers under `src/app/api/` act only as **thin HTTP transport adapters**. A Route Handler
may parse the HTTP request, resolve authentication context, validate transport-level input, invoke
an application use case, and translate the result into an HTTP response. A Route Handler must not
contain core business logic. Business rules must not be implemented directly in React components,
Next.js pages, Route Handlers, Server Actions, middleware, or database adapters:

```text
HTTP request
        ↓
Thin Next.js Route Handler
        ↓
Authentication and runtime validation
        ↓
Application use case
        ↓
Domain rules and database transaction
        ↓
Explicit API response model
```

## Module Structure

A module may contain `domain/`, `application/`, `infrastructure/`, `ui/`, and `index.ts`. Not every
directory must be created in every module until needed.

- **Domain layer** — entities, value objects, aggregate rules, state transitions, domain policies,
  and domain events. Must not import React, Next.js, Route Handler APIs, database clients, or any
  external provider SDK (DigitalOcean, payment, WhatsApp, OTP, delivery, object storage).
- **Application layer** — use cases, commands, queries, input/output DTOs, authorization
  requirements, repository interfaces, provider interfaces, transaction orchestration, and
  idempotency orchestration (for example: `AddCustomizedItemToCart`, `CreateCheckout`,
  `ProcessPaymentEvent`, `AcceptOrder`, `MarkOrderPreparing`, `AssignDelivery`, `ApproveRefund`).
- **Infrastructure layer** — implementations of application and domain ports: PostgreSQL
  repositories, payment-provider adapters, OTP-provider adapters, object-storage adapters, WhatsApp
  adapters, delivery-provider adapters, clock and identifier implementations, and queue
  implementations.
- **UI layer** — feature-specific components (product customization form, cart summary, kitchen
  order card, refund approval dialog, outlet availability control). Reusable design-system
  primitives remain under `src/components/ui/`.

Each module exposes its supported public API through `src/modules/<module-name>/index.ts`. Other
modules must not deep-import internal files.

## Initial Module Boundaries

| Module | Owns |
| --- | --- |
| Identity | Authentication identities, login/logout, sessions, verification challenges, authentication-provider abstraction. Does not own customer profile data or workforce authorization. |
| Customers | Brand-level customer profile, contact details, saved addresses, preferences, communication consent, customer account lifecycle. Customer identity remains owned by the BOBA Bear brand, not an outlet or franchisee. |
| Organizations | Brand, organization hierarchy, legal entities, territories, outlets, outlet ownership, outlet operators, operating hours, outlet operational status. |
| Access Control | Staff memberships, scoped roles, permissions, authorization policies, platform/brand/organization/territory/outlet scope evaluation. Kept separate from Identity. |
| Catalog | Categories, products, variants, modifier groups, modifier options, bundles, menu publication, product media, brand catalog definitions, catalog lifecycle. Domain behaviour fixed by [ADR-006](./ADR-006-food-catalog-assortment-availability.md). |
| Pricing | Price books, product/variant/modifier prices, taxes, packaging charges, discounts, promotion calculations, pricing snapshots. Promotions may become a separate module later if justified. Fixed in full by [ADR-007](./ADR-007-pricing-tax-charges-promotions.md). |
| Availability | Territory/organization/outlet assortment inheritance, operational availability, outlet-ordering pause, effective-menu resolution, sellability rules. Not a full ingredient-inventory module in V1. Domain behaviour fixed by [ADR-006](./ADR-006-food-catalog-assortment-availability.md). |
| Serviceability | Customer-location eligibility, service zones, locality/pincode/distance rules, outlet selection, delivery-fee input data, serviceability decisions. Domain behaviour fixed by [ADR-008](./ADR-008-serviceability-cart-checkout.md). |
| Cart | Active carts, single-outlet cart enforcement, cart items, selected variants and modifiers, quantities, cart expiration, cart validation state. Trusted totals are calculated through Pricing. Domain behaviour fixed by [ADR-008](./ADR-008-serviceability-cart-checkout.md). |
| Checkout | Checkout session, address confirmation, serviceability revalidation, cart revalidation, final pricing request, order-creation coordination, payment-initiation coordination, idempotency. Orchestrates other modules and must not duplicate their rules. Domain behaviour fixed by [ADR-008](./ADR-008-serviceability-cart-checkout.md). |
| Payments | Payment attempts, payment-provider abstraction, payment events, payment state, webhook idempotency, refund transactions, payment reconciliation. Does not own kitchen or delivery state. |
| Orders | Direct order aggregate, immutable commercial snapshots, commercial order lifecycle, cancellation requests, the public order number, the append-only order event timeline, customer-visible order history. Domain behaviour fixed by [ADR-010](./ADR-010-order-lifecycle-operations-console.md). |
| Operations | Kitchen acceptance/rejection, fulfilment lifecycle, preparation workflow and timing, ready-for-handoff and handoff workflow, the Operations Console, operational commands, timers, and operational exception handling. Foundation of a future POS, not a complete POS in V1. Domain behaviour fixed by [ADR-010](./ADR-010-order-lifecycle-operations-console.md). |
| Delivery | Delivery requirement, delivery quote, delivery assignment, delivery-provider abstraction, delivery status, tracking information, manual-dispatch fallback. Kept distinct from Operations' fulfilment state, per [ADR-010](./ADR-010-order-lifecycle-operations-console.md). |
| Notifications | Notification requests, template selection, delivery attempts, WhatsApp/SMS/email adapter boundaries, retry state, customer communication history. Communicates business outcomes but does not decide them; triggered only by committed domain events, per [ADR-010](./ADR-010-order-lifecycle-operations-console.md#notifications-boundary). |
| Audit | Sensitive action history — actor, scope, target, before/after metadata, reason, correlation identifier, audit access. |

### Future modules

The following are documented as future modules, not V1 scaffolding, and no empty directories or
placeholder code are created for them: Loyalty, gated drops, merchandise, Counter POS, dine-in,
ingredient inventory, recipes, procurement, shift management, aggregator integrations, reporting and
analytics, franchise onboarding, franchise contracts, franchise settlements, royalty calculations,
compliance inspections, and training and certification.

## Dependency Rules

```text
UI and transport adapters
        ↓
Application use cases
        ↓
Domain rules

Infrastructure adapters
        ↑
implement application or domain ports
```

Mandatory rules:

- `src/app/` may call module public APIs. Modules must never import from `src/app/`.
- Domain code may import only its own module and minimal stable shared-domain primitives, and must
  not import infrastructure.
- Application code may import its own domain and declared ports.
- Infrastructure implements ports declared by application or domain.
- UI code must not access PostgreSQL directly. React components must not contain core business
  rules. Client components must never import privileged server modules.
- Cross-module imports must use the target module's public `index.ts`; deep imports are prohibited.
- Circular module dependencies are prohibited.
- Generic dumping grounds such as broad `utils`, `helpers`, or `services` directories are prohibited.
  Shared code under `src/shared/` must be genuinely cross-module and stable.

Automated architecture enforcement is required; the exact lint or testing tool remains open.

## Cross-Module Coordination

**Synchronous** coordination uses direct application-service calls for operations requiring
immediate consistency, coordinated by a higher-level orchestrator, for example:

```text
Checkout
├── reads Cart
├── validates Serviceability
├── requests trusted Pricing
├── creates Order
└── initiates Payment
```

Modules must not form circular call relationships.

**Asynchronous** processing is used for WhatsApp/SMS/email notifications, delivery-provider retries,
payment reconciliation, operational alerts, analytics, and non-critical provider synchronization.
The exact queue technology remains open.

## Transactional Outbox

The platform must use a **transactional outbox pattern** for durable asynchronous work:

```text
Business transaction
    ├── saves business state
    └── saves outbox event
            ↓
       transaction commits
            ↓
       Node.js worker processes event
            ↓
       external side effect
```

This is mandatory to protect against scenarios such as a payment captured but its order event lost,
an order accepted but the customer notification not queued, a refund recorded but the provider
request not retried, or a delivery request lost after a process restart. The exact polling, queue,
scheduling, and retry technologies remain open. The specific requirement that checkout confirmation,
pre-payment order creation, and payment-initiation state commit in one transaction with an outbox
event before any external payment-provider call is fixed in full by
[ADR-008](./ADR-008-serviceability-cart-checkout.md#internal-transaction-boundary-before-provider-call).

## Inbound-Event Idempotency

External callbacks — payment webhook events, WhatsApp callbacks, delivery-provider events, and
OTP-provider callbacks where applicable — must be persisted and processed idempotently. Duplicate
callbacks must not create duplicate orders, capture payment twice, issue duplicate refunds, repeat
status transitions, or send uncontrolled duplicate notifications. The exact inbox or event-record
implementation remains open.

## Database Ownership

One physical PostgreSQL database backs the modular monolith. Each table or logical data set has one
owning module; only the owning module writes its data, and other modules use the owner's application
API. Cross-module direct writes are prohibited. Foreign keys across module-owned data are permitted
when needed, and database transactions may span modules when one atomic business operation requires
it — coordinated by an application-level orchestrator. Table ownership must be documented. Reporting
may later use read models, views, or projections. Separate PostgreSQL schemas per module remain an
open implementation choice, not an architectural requirement.

## DTO and API Boundaries

Domain entities must not be returned directly from Route Handlers, Server Actions, public APIs,
background-job payloads, or provider adapters. Explicit commands, queries, DTOs, API request models,
API response models, and integration-event schemas are used instead, so the boundary can support
future Android and iOS applications, WhatsApp ordering, delivery integrations, franchise
integrations, and aggregator integrations. The exact public API style and versioning remain open.

## Authorization Boundary

Authorization is enforced at the application-use-case boundary; route protection and hidden UI
controls are not sufficient. Sensitive use cases (for example `AcceptOrder`, `ApproveRefund`,
`ChangeOutletPrice`, `InviteStaff`, `DisableProduct`) receive an actor context containing,
conceptually, actor identity, membership, scope, permissions, and a correlation identifier. Exact
authentication and authorization implementations remain for later architecture decisions.

## Testing Structure

- **Unit tests** — alongside or near module domain and application code; cover domain rules, state
  transitions, pricing rules, authorization decisions, runtime validation, and idempotency logic.
- **Integration tests** (`tests/integration/`) — against a real temporary PostgreSQL instance;
  cover repositories, migrations, transactions, module coordination, the transactional outbox, and
  database constraints.
- **Architecture tests** (`tests/architecture/`) — enforce no domain-to-infrastructure imports, no
  module-to-`src/app/` imports, no cross-module deep imports, no prohibited circular dependencies,
  and no client-side imports of server-only modules.
- **End-to-end tests** (`tests/e2e/`) — cover critical journeys such as customer ordering, payment
  callback simulation, kitchen acceptance, order tracking, refund workflows, outlet isolation, and
  (later) franchise data isolation.

The exact unit, integration, and end-to-end testing libraries remain open.

## Migration from the Current Static Application

The existing repository migrates as follows:

| Current location | Target location |
| --- | --- |
| `app/` | `src/app/` |
| Shared UI primitives | `src/components/ui/` |
| Marketing sections | `src/components/marketing/` |
| Feature-specific components | The relevant module's `ui/` directory |
| Generic stable shared code | Appropriate `src/shared/` area |
| Static menu data | Temporary source until catalog migration |
| `public/` | Remains at repository root |
| `docs/` | Remains at repository root |
| `infra/` | Remains at repository root |
| `scripts/` | Remains at repository root |

## Approved Implementation Sequence

1. **Behaviour-preserving repository migration** — move the application into `src/`, preserve
   current behaviour, establish route groups, organize shared and marketing components, add
   aliases and server/client boundaries. Do not add transactional features.
2. **Architecture enforcement foundation** — add module public-entry conventions, architecture
   tests or lint enforcement, configuration-validation structure, the worker entry point, and
   server-only boundaries.
3. **Foundational business modules** (only after later architecture decisions are approved) —
   Organizations, Access Control, Identity, Customers.
4. **Commerce modules** — Catalog, Pricing, Availability, Serviceability, Cart, Checkout.
5. **Transactional operations** — Payments, Orders, Operations, Delivery, Notifications, Audit.

The first code implementation slice after this architecture decision must cover only the
behaviour-preserving repository migration, described in Phase 1 above. It must preserve current
routes, visual design, SEO, static content, assets, and existing live behaviour, and it must not add
commerce functionality.

## Consequences

### Positive

- One language, one repository, and one deployable image keep the platform buildable and
  extensible in coherent, reviewable increments appropriate for a small team, consistent with
  [`architecture-foundation.md`](../architecture-foundation.md#simple-but-scalable).
- Enforced module boundaries and a mandatory dependency direction let commerce, operations, and
  future franchise capability grow without early microservice complexity, while preserving the
  option to extract a module later if justified.
- A mandatory transactional outbox and inbound-event idempotency close a class of correctness risks
  (lost events, duplicate webhooks) before payment and order code is written, rather than retrofitted
  afterward.
- Sharing one Node.js and TypeScript codebase between the web process and worker process avoids a
  cross-language integration layer and matches the shared-image model already accepted in
  [ADR-002](./ADR-002-environments-ci-cd-release-model.md#web-and-worker-deployment).

### Trade-offs accepted

- A single team must maintain architecture-enforcement discipline (tests or lint rules) rather than
  relying on process-level isolation between services; enforcement tooling is not selected yet.
- All business modules share one database and one deployable unit, so a defect or resource
  exhaustion in one module can affect others until module extraction, if ever, is justified.
- The repository-migration phase (moving `app/` into `src/`) must be sequenced before most business
  modules can be built, delaying commerce work until that structural step is complete.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Module boundaries erode over time without independent deployment to force isolation | Mandatory architecture tests enforcing import direction, deep-import prohibition, and circular-dependency prohibition (tooling selection remains open, but the requirement is locked here) |
| Business logic leaks into Route Handlers, Server Actions, or React components | Documented dependency direction and layer responsibilities in this ADR; Route Handlers are explicitly restricted to thin transport-adapter behavior |
| Asynchronous side effects are lost on process restart or partial failure | Mandatory transactional outbox pattern tying business-state writes to outbox-event writes in the same transaction |
| Duplicate external callbacks corrupt payment, order, or refund state | Mandatory inbound-event idempotency for payment, WhatsApp, delivery, and OTP callbacks |
| Repository-migration phase silently expands into adding commerce functionality | Phase 1 is explicitly scoped to behaviour-preserving migration only; commerce modules are sequenced into later phases |

## Explicit Non-Decisions

This decision does not resolve the following, which remain **Open** or **Deferred** and must not be
treated as answered by this ADR:

- Exact Node.js 24 patch version
- ORM
- Migration framework
- Runtime-validation library
- Queue and background-job technology
- Dependency-injection approach
- Architecture-test or lint-enforcement tool
- Unit-test framework
- Integration-test framework
- End-to-end-test framework
- API style and versioning
- Server Action usage policy
- Separate PostgreSQL schemas per module
- Object-storage abstraction implementation
- Realtime communication approach
- Authentication implementation
- OTP provider
- Payment provider
- WhatsApp provider implementation
- Delivery-provider implementation
- Exact worker scheduling and polling model
- Monorepo adoption for future native clients
- Extraction of specialized services

## Rejected or Deferred Alternatives

- **A separate Java backend service** — rejected for V1; would introduce a second language, a
  second deployable unit, and cross-language integration overhead not justified by current scale.
- **A separate Go backend service** — rejected for V1, for the same reasons as Java.
- **A separate NestJS backend service** — rejected for V1; NestJS would still require a second
  Node.js codebase and deployable unit alongside Next.js, without a demonstrated need for that
  separation at current scale.
- **A separate API repository** — rejected for V1; conflicts with the single-repository strategy and
  would require cross-repository versioning and release coordination not justified yet.
- **Independently deployed microservices** — deferred; module boundaries are designed to allow future
  extraction if justified, but no service is independently deployed in V1, consistent with
  [`architecture-foundation.md`](../architecture-foundation.md#modular-monolith).
- **Monorepo workspaces** — deferred until BOBA Bear has genuinely separate clients or independently
  released applications, such as native Android or iOS applications.

## Cross-Reference: ADR-013 Module Persistence

[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#module-table-ownership) makes this
ADR's module boundaries concrete at the database layer. Every table has exactly one owning module,
which owns its schema definition and its repositories; cross-module direct writes remain prohibited
and cross-module reads go through the owning module's application contract. Drizzle stays inside the
infrastructure layer of each module and never becomes a shared data-access layer, a domain model, or
an authorization mechanism, per
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#drizzles-role-and-boundaries). Where
an approved workflow must change state owned by more than one module atomically, it uses the explicit
shared transaction context defined in
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#transaction-abstraction) rather than
ad-hoc cross-module writes. The mandatory transactional outbox fixed here is implemented on
PostgreSQL itself, giving durable asynchronous effects without an external broker, per
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#transactional-outbox-persistence).

## Related Canonical Documents

- [`architecture-foundation.md`](../architecture-foundation.md) — the modular-monolith principle
  and module list this decision implements in detail.
- [ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md) — the persistence decision that
  implements this ADR's table-ownership rule, transaction model, and transactional outbox on
  PostgreSQL, per the cross-reference above.
- [ADR-001](./ADR-001-digitalocean-platform.md) — the cloud hosting foundation this decision's web
  and worker processes deploy onto.
- [ADR-002](./ADR-002-environments-ci-cd-release-model.md) — the environment, CI/CD, release,
  migration, and shared-image model this decision's application codebase is built and deployed
  through.
- [ADR-006](./ADR-006-food-catalog-assortment-availability.md) — the food-catalog, menu, assortment,
  and availability domain decision built on the Catalog and Availability module boundaries fixed here.
- [ADR-008](./ADR-008-serviceability-cart-checkout.md) — the serviceability, cart, and checkout
  domain decision built on the Serviceability, Cart, and Checkout module boundaries fixed here, and
  the specific transactional-outbox-before-provider-call sequencing that extends the general
  transactional-outbox pattern fixed here.
- [ADR-010](./ADR-010-order-lifecycle-operations-console.md) — the order-lifecycle and Operations
  Console domain decision built on the Orders, Operations, Delivery, and Notifications module
  boundaries fixed here.
- [ADR-015](./ADR-015-configuration-secrets-feature-flags.md) — the configuration and secrets
  decision that fixes the central configuration boundary and shared web/worker startup bootstrap
  built on top of the dependency rules and web/worker model fixed here.
- [`roadmap-and-open-decisions.md`](../roadmap-and-open-decisions.md) — the open decisions this ADR
  does not resolve.
- [`decision-register.md`](../decision-register.md) — the structured register entries this ADR locks.
- [`README.md`](../README.md) — the canonical documentation index and update protocol.
