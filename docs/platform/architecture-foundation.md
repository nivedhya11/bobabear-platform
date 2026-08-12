---
Status: SUPPORTING / partially superseded on transport
Canonical CURRENT architecture: docs/platform/ARCHITECTURE.md
Transport decision: D-356 in docs/platform/decision-register.md
Last updated: 2026-08-11
---

# BOBA Bear — Architecture Foundation

## Status

**SUPPORTING.** CURRENT durable global architecture is [`ARCHITECTURE.md`](./ARCHITECTURE.md).
Binding decision status is [`decision-register.md`](./decision-register.md).

**Transport amendment (2026-08-11):** statements in this document that assert the static site must
become a dynamic Next.js Route-Handler host, or that Route Handlers are the canonical product HTTP
boundary, are **historical** and superseded by **D-356** / `ARCHITECTURE.md`:

```text
public frontend remains static Next.js export → Nginx
dynamic backend transport remains outside dynamic Next.js execution
```

Exact IMP-024 topology remains undecided. Historical ADR-linked rationale below may remain for
provenance but must not override CURRENT authorities.

## Historical locked-principles narrative (provenance)

The following long-form narrative from the pre-governance architecture foundation is retained for
provenance. Prefer [`ARCHITECTURE.md`](./ARCHITECTURE.md) and [`decision-register.md`](./decision-register.md)
for CURRENT binding reads. In particular, ADR-014 Route Handler host claims in the text below are
superseded by D-356.

### Legacy status paragraph (historical)

The cloud hosting platform was recorded as a Locked decision — DigitalOcean
([ADR-001](./decisions/ADR-001-digitalocean-platform.md)) — with subsequent ADR-002 through ADR-015
locking environments, modular monolith, identity, authorization, catalog, pricing, serviceability /
cart / checkout, payments, order/operations, delivery, notifications, persistence, HTTP contracts,
and configuration. Delivery-provider abstraction, dispatch, and fulfilment architecture for the
Delivery module (ADR-011), notifications / WhatsApp (ADR-012), HTTP API / Route Handler contracts
(ADR-014 — **host claim SUPERSEDED by D-356**), and configuration (ADR-015) were included in that
historical lock set. Specific technologies, providers, sizes, and migrations remain Open where noted
in supporting docs, or are out of scope for documentation-only work.

## Architecture principles

## Simple but scalable

The platform should remain:

- Economical to run.
- Operationally simple for a small team.
- Friendly to sequential, agentic development — i.e., buildable and extensible in coherent,
  reviewable increments rather than requiring large coordinated rewrites.
- Scalable across outlets and cities without a foundational redesign.
- Preferably hosted with transactional data and core services located in India, given the
  business's current market and likely regulatory expectations.

The cloud platform satisfying these principles is **DigitalOcean**: the Next.js modular monolith
and background worker run on DigitalOcean App Platform in Bangalore, transactional data uses
DigitalOcean Managed PostgreSQL in Bangalore, and object storage uses DigitalOcean Spaces. See
[ADR-001](./decisions/ADR-001-digitalocean-platform.md) for the full decision, deployment topology,
environment model, and rollout stages. Specific instance sizes, database sizing, and several
adjacent implementation choices remain **Open** — see
[`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md) and the
[decision register](./decision-register.md) (historical inventory:
[`decision-register-historical.md`](./decision-register-historical.md)).

## Modular monolith

The initial architecture is a **modular monolith** rather than a microservices architecture: one
Git repository, one primary package, one Next.js application, one TypeScript application codebase,
one OCI image, one web process, one background-worker process, and one PostgreSQL database, with
business logic internally separated into clearly owned modules. This is a **Locked** decision,
recorded in full in [ADR-003](./decisions/ADR-003-modular-monolith-node-typescript.md). Microservices
and container-orchestration platforms (for example, Kubernetes) are explicitly **Deferred** — see
[`v1-product-scope.md`](./v1-product-scope.md).

The backend language and runtime are **Node.js** and **TypeScript**, with **Node.js 24 LTS** as the
initial production runtime line — see [ADR-003](./decisions/ADR-003-modular-monolith-node-typescript.md)
for the full rationale. A separate Java backend, Go backend, NestJS service, or independently
deployed API repository are not selected for V1.

"Modular monolith" means the codebase enforces clear internal module boundaries even though it
deploys as one unit. Each module is organized into `domain/`, `application/`, `infrastructure/`, and
`ui/` layers with a public entry point, and modules may depend only in one direction — UI and
transport adapters call application use cases, application use cases call domain rules, and
infrastructure adapters implement application or domain ports. Cross-module deep imports and
circular module dependencies are prohibited. See
[ADR-003](./decisions/ADR-003-modular-monolith-node-typescript.md) for the complete dependency
rules, target source structure, and module-by-module ownership. Expected logical modules include:

| Module | Responsibility |
|---|---|
| Identity | Authentication and identity for customers, staff, and service accounts, built on the self-hosted Better Auth framework behind a BOBA Bear-owned adapter boundary — see [ADR-004](./decisions/ADR-004-identity-authentication-sessions.md) |
| Customer profile | Customer account data, saved addresses, address lifecycle, and preferences, per [ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md#customer-address-ownership) |
| Organization | Brand, organization, legal-entity, and territory records |
| Outlet | Outlet records, configuration, and operational status |
| Catalog | Brand-owned canonical food and beverage products, categories, variants, modifier groups and options, bundles, menu publication, and product media, per [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md) |
| Pricing | Price books, effective-price resolution, tax policies, packaging and delivery charges, promotions, pricing quotes, discount allocation, and order monetary snapshots — kept strictly separate from Catalog's product identity, per [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md) |
| Availability | Territory/organization/outlet assortment inheritance, operational availability, outlet-ordering pause, and effective-menu resolution, per [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md) |
| Serviceability | Explicit service-zone configuration, coordinate-based serviceability validation, and deterministic outlet resolution, kept distinct from delivery quoting, per [ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md#serviceability-model) |
| Cart | Server-side authoritative single-outlet cart contents, anonymous-cart access, optimistic concurrency, and idempotent mutation, per [ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md#server-side-authoritative-cart) |
| Checkout | Cross-module orchestration of address confirmation, serviceability, cart revalidation, delivery and pricing quotes, customer confirmation, and idempotent pre-payment order creation, per [ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md#checkout-module-responsibility) |
| Payment | Provider-neutral payment initiation, webhook verification, refund, and reconciliation handling — Cashfree is the V1 infrastructure adapter behind this boundary, per [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md) |
| Order | Commercial order records, commercial order state, cancellation requests, the public order number, the append-only order event timeline, and order history, per [ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md) |
| Kitchen operations | Direct-order fulfilment workflow, outlet acceptance, operational exceptions, timers, and the Operations Console — separate from commercial order state and delivery state, per [ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md) |
| Delivery | Provider-neutral delivery accounts, provider adapters, delivery quotes, dispatch policy, delivery requests, provider bookings, courier assignment, pickup verification, package handoff, delivery progression, proof of delivery, delivery failures, returns, provider events, and provider-cost reconciliation, kept distinct from Operations' fulfilment state, per [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md) |
| Notification | Provider-neutral customer- and staff-facing notifications across WhatsApp, email, SMS, in-app, and future push channels, reachable only through the transactional outbox, owning consent, templates, locale resolution, deduplication, retry, and the WhatsApp inbound/outbound provider-event record, per [ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md) |
| Access Control | Scoped role-based business authorization — workforce memberships, role assignments, permissions, scope resolution, delegation, and franchise isolation — behind a central authorization boundary, per [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md) |
| Administration | Staff, role, and permission management |
| Audit | Durable audit events for sensitive actions |
| Integration adapters | Boundaries around external systems (payment providers, delivery providers, WhatsApp, and any future aggregator-facing integration) |

These module boundaries are a design requirement even for a single-application, single-database
deployment. They exist so that a future move toward independently deployable services — if ever
needed — would follow existing seams rather than requiring a rewrite. No decision to eventually
split these modules into separate services has been made; the boundaries exist for maintainability
and optionality, not as a roadmap commitment.

### Identity, authentication, and sessions

The Identity module is built on **Better Auth**, a self-hosted authentication framework running
inside this same Node.js, TypeScript, Next.js application, with authentication data stored in the
DigitalOcean Managed PostgreSQL database described above. Better Auth is an infrastructure
component behind a BOBA Bear-owned Identity-module adapter boundary; other modules depend on that
boundary, never on Better Auth directly. Authentication uses **opaque, database-backed sessions**,
never long-lived self-contained JWTs, so that session validation, revocation, and current-membership
authorization evaluation always occur at the application-use-case boundary rather than being
embedded in a token. BOBA Bear uses one human authentication identity per person, which may carry
both a customer profile and one or more workforce memberships at once. Authentication (who is this
person, and is their session valid) remains strictly separate from business authorization (what may
this person do), which continues to be owned by the Access Control module. See
[ADR-004](./decisions/ADR-004-identity-authentication-sessions.md) for the full decision, including
customer mobile-OTP authentication, workforce invitation-only email/password/TOTP authentication,
session-policy separation, and identity lifecycle.

### Access Control and business authorization

Business authorization is owned by the **Access Control module** and uses **scoped role-based
access control with policy conditions and deny-by-default authorization**: an action is authorized
only when an active identity, active workforce membership, active scoped role assignment, required
permission, and covering scope all hold, together with applicable resource and business-state
conditions — otherwise it is denied. Authorization is evaluated at the **application-use-case
boundary**, never trusted from the client and never left to Route Handlers or UI components alone,
consistent with the dependency rules in
[ADR-003](./decisions/ADR-003-modular-monolith-node-typescript.md#dependency-rules). Supported scopes
are platform, brand, organization, territory, and outlet, with inheritance flowing downward only;
franchise organizations are isolated from one another's data by construction. Scoped repositories —
not ad hoc query filters — are the primary data-boundary enforcement mechanism, requiring trusted
membership and assignment context rather than client-supplied identifiers. PostgreSQL Row-Level
Security is deferred as selective defense-in-depth for high-risk data sets, not mandated for all V1
data. See [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md) for the full
authorization model, scope inheritance, delegation limits, franchise isolation, customer
authorization, break-glass and support-access controls, and required test coverage.

### Food catalog, assortment, and availability

The **Catalog module** owns the brand's canonical food and beverage catalog — product identity,
variants, modifier groups and options, bundles, menu publication, and product media — while the
**Availability module** owns territory/organization/outlet assortment inheritance and operational
availability. These remain distinct from **Pricing**, whose price books, effective-price resolution,
tax policies, packaging and delivery charges, promotions, immutable pricing quotes, and order
monetary snapshots are fixed by
[ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md); Catalog entities never own
authoritative monetary values. The customer-facing effective menu is resolved by intersecting the
published menu with active catalog entities, inherited assortment, outlet availability, active
schedule, and visibility policy, and the same effective-menu resolution logic serves both the BOBA
Bear PWA and WhatsApp-assisted ordering. Checkout must always authoritatively revalidate catalog,
assortment, modifier, bundle, and outlet-availability state — client-side or cached state is never
authoritative — and every order retains an immutable catalog snapshot so that later catalog changes
never alter historical order meaning. See
[ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md) for the full decision.

### Pricing, tax, charges, and promotions

The **Pricing module** is the single authoritative source of monetary calculation for BOBA Bear
direct orders — it determines price, discount, packaging charge, delivery charge, and tax for a
specific outlet, legal entity, customer, channel, cart, delivery context, and date/time, and is used
identically by the PWA, WhatsApp-assisted ordering, future native apps, the Operations Console, a
future counter POS, customer support, and financial reconciliation. Final authoritative monetary
values persist as integer minor units (paise for INR); intermediate calculations use decimal
arithmetic; JavaScript floating-point arithmetic must never be used for authoritative money.
Pricing is expressed through effective-dated price books, arranged brand → territory → organization →
outlet, and effective-dated tax policies that keep GST rates and classifications out of hard-coded
application logic — including BOBA Bear's provisional initial restaurant-service GST profile, which
remains subject to legal and accountant validation before commercial launch. Delivery charge and
delivery-provider cost are tracked as separate values, with any merchant-funded subsidy explicit.
Checkout produces an immutable pricing quote, revalidated before payment with mandatory customer
reconfirmation if the payable total changes, and every order retains an immutable monetary snapshot
that later pricing, tax, or promotion changes must never alter. Promotion reservation and redemption
are atomic to prevent duplicate or over-limit discount use. See
[ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md) for the full decision.

### Serviceability, cart, and checkout orchestration

The **Serviceability module** determines whether a customer location can be served and resolves the
responsible outlet, using explicitly configured service zones and coordinate-based validation, kept
strictly separate from delivery quoting. The **Cart module** owns the server-side authoritative,
single-outlet cart, including anonymous-cart access, optimistic concurrency (version-checked
mutation), and idempotent mutation replay; cart-stage additions never reserve inventory, kitchen
capacity, delivery capacity, price, or promotion redemption. The **Checkout module** is the
cross-module orchestrator that coordinates address confirmation, serviceability, cart and catalog
revalidation, delivery and pricing quotes, promotion reservation, and explicit customer confirmation,
without duplicating rules owned by Customers, Catalog, Availability, Serviceability, Pricing,
Delivery, Orders, Payments, or Access Control. Checkout creates exactly one idempotent pre-payment
order — in a `PENDING_PAYMENT` state, never kitchen-visible and never counted as fulfilled revenue —
before handing it to the Payments module. All required internal state, including a transactional
outbox event for payment-initiation work, is committed in one PostgreSQL transaction before any
external payment-provider call; provider calls never occur inside that transaction. See
[ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md) for the full decision, including the
service-zone model, deterministic outlet resolution, cart-ownership and merge rules, the checkout
orchestration sequence and lifecycle, quote-expiry handling, and the idempotency and
transactional-boundary requirements.

### Payments

The **Payments module** is provider-neutral at the application boundary: Checkout, Orders, Pricing,
Customers, Operations, Delivery, Notifications, and Audit depend only on Payments-module interfaces,
never on a payment provider's SDK directly. **Cashfree Payment Gateway with Cashfree Hosted
Checkout** is the V1 infrastructure adapter behind that boundary, approved for V1 subject to
launch-readiness validation, per
[ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md). One BOBA Bear payment
intent exists per immutable pre-payment order created by Checkout, mapping to one Cashfree provider
order; multiple customer payment attempts may exist under that same payment intent and provider
order without prematurely failing the whole payment. Provider-order creation occurs only after
Checkout's internal transaction commits, using a synchronous provider call with transactional-outbox
recovery on timeout, crash, or lost response, and a stable idempotency key that must never produce a
duplicate provider order merely because an earlier response was uncertain. Browser redirects and
client-side payment results are customer-experience signals only — payment success requires a
verified Cashfree webhook or an authenticated server-to-server status query, never a client-trusted
state. Webhook ingestion is durable and idempotent: the first verified successful payment for a
payment intent wins, duplicate or out-of-order events must never duplicate order activation or
kitchen release, and amount, currency, or account mismatches force a payment into review rather than
activating an order. Scheduled reconciliation and status polling recover from delayed or lost
webhooks. Payment success and settlement are treated as separate concepts, so kitchen work may begin
on verified payment success without waiting for settlement. Refunds are owned by the Payments module
as immutable internal records that reuse the original order's pricing and tax allocations from
[ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#immutable-order-monetary-snapshots)
rather than recalculating them, and are submitted to the provider idempotently. See
[ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md) for the full payment,
webhook, refund, and reconciliation decision.

### Order lifecycle and Operations Console

The **Order** module and the **Kitchen operations** module are separate but coordinated: Order owns
commercial order state, cancellation requests, the public order number, and the append-only order
event timeline, while Operations owns fulfilment state, outlet acceptance, operational exceptions,
timers, and the Operations Console — kept distinct from Delivery's own delivery state and Payments'
own refund state, so that no single field is overloaded with every order concern. A direct order
becomes operational only after Payments commits a verified payment success and publishes a
transactional outbox event; Orders then confirms the commercial order and Operations releases the
fulfilment workflow to the correct outlet, never twice for the same payment event and never inferred
from live serviceability data at release time. V1 uses manual outlet acceptance, forward-only
fulfilment progression, and a dedicated, audited correction command for any backward state change —
routine backward mutation is prohibited. The V1 Operations Console is a fulfilment-focused tool, not a
full point-of-sale system, exposing role-minimized, outlet-scoped views. Every operational command
carries an expected order version, expected state, idempotency key, actor, and reason where required,
enforced through optimistic concurrency and idempotent replay, consistent with the transactional
outbox and cart-mutation concurrency principles above. Realtime Operations Console transport is a
non-authoritative convenience; PostgreSQL and version-checked mutation remain authoritative regardless
of transport. See [ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md) for the full
decision, including the commercial and fulfilment lifecycles, cancellation/refund separation, the
exception model, customer-tracking projection, the append-only timeline, and the post-commit
notifications boundary.

### Delivery, dispatch, and provider abstraction

The **Delivery module** is provider-neutral: Checkout, Orders, Operations, Pricing, Customers, and
Notifications depend only on Delivery-module interfaces, never on a delivery-provider SDK directly.
Delivery supports three operating modes — **API-integrated**, **business-dashboard**, and
**controlled manual local provider** — so BOBA Bear can launch Dehradun delivery through whichever
combination of provider capability actually proves available; no provider is production-approved by
this documentation, and Rapido is only the first commercial-validation candidate. A checkout delivery
quote never itself creates or dispatches a courier booking: a real delivery request is created only
after verified payment success and outlet acceptance, using preparation-aware dispatch timing, and is
idempotent so a provider timeout can never silently create a duplicate booking. Provider-specific
statuses are normalized by provider adapters into one BOBA Bear delivery lifecycle, and pickup
requires a bound verification mechanism beyond the public order number, with Operations and Delivery
handoff coordinated in one transaction. Provider callbacks are durably persisted, deduplicated, and
reconciled against duplicate, delayed, and out-of-order delivery, and delivery cost is tracked and
reconciled separately from the customer delivery charge fixed by
[ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#delivery-charge-and-provider-cost).
See [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md) for the full decision,
including delivery-account ownership, courier assignment and reassignment, proof of delivery,
delivery failure and return handling, provider claims, and delivery-specific audit and metrics
requirements.

### Notifications, WhatsApp, and assisted commerce

The **Notification module** is provider-neutral: Orders, Payments, Operations, Delivery, and
Identity depend only on Notifications-module interfaces, never on a messaging-provider SDK directly,
and are reachable only through the transactional outbox — a domain module never calls WhatsApp,
email, or SMS directly, and notification failure never rolls back a domain transition. **Meta
WhatsApp Cloud API** is the V1 WhatsApp channel adapter behind that boundary, reached through a
single **brand-owned** WhatsApp Business Account rather than a personal staff number. Supported
channel adapters are `WHATSAPP`, `EMAIL`, `SMS`, `IN_APP`, and `PUSH`; WhatsApp is the primary V1
transactional channel and the PWA's `IN_APP` tracking projection is the authoritative fallback of
record. Notification requests and provider message attempts are separate, deduplicated, idempotent
records — mirroring the payment-intent/payment-attempt and delivery-request/provider-event
separations already fixed by [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md)
and [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md) — so that a duplicate
domain event never duplicates a customer message and a stale intermediate notification is suppressed
once a later state has already been communicated. Consent is modeled per purpose (order updates,
delivery updates, support messages, marketing messages, authentication messages), kept strictly
separate from marketing consent, and template resolution, locale fallback, and retry policy are all
owned by Notifications rather than scattered across domain modules. Both inbound WhatsApp messages
and outbound delivery/read-status events are ingested through durable, verified, deduplicated
webhook processing; delivery and read-status events are locked as non-authoritative telemetry that
must never mutate order, payment, delivery, refund, or consent state. See
[ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md) for the full decision,
including the consent-purpose and template-registry model, the notification and message-attempt
lifecycles, inbound-message classification, the cancellation-request boundary for inbound WhatsApp
messages, and the assisted-commerce boundary that excludes full conversational ordering, autonomous
checkout, and payment-credential collection in chat.

### Web and worker model

The web application and background worker deploy from the same immutable OCI image and the same
Node.js and TypeScript codebase, differing only in startup command, per
[ADR-002](./decisions/ADR-002-environments-ci-cd-release-model.md#web-and-worker-deployment) and
[ADR-003](./decisions/ADR-003-modular-monolith-node-typescript.md). The web process serves the
Next.js application and its Route Handlers; the worker process consumes durable asynchronous work
such as notification delivery, payment reconciliation, and delivery-provider retries.

### HTTP boundary and API contracts

Next.js App Router Route Handlers, under a versioned `/api/v1` namespace split into `public`,
`customer`, `operations`, and `admin` areas, are BOBA Bear's canonical HTTP boundary; Route Handlers
remain thin transport adapters that validate boundary data with Zod 4, invoke exactly one
application use case, and map results through a shared success envelope and an RFC 9457 Problem
Details error contract. Server Components call authorized application query services directly and
never make loopback HTTP requests to the application's own API; Client Components call `/api/v1`
through a typed first-party client. Cookie-authenticated unsafe methods require CSRF protection;
CORS is disabled by default; sensitive operations are rate-limited using PostgreSQL-backed counters;
effectful mutations support `Idempotency-Key` replay; concurrency-sensitive mutations support
`ETag`/`If-Match`; unbounded lists use opaque cursor pagination; and provider webhooks (Cashfree,
delivery providers, Meta) use their own authenticity, replay, and idempotency controls under a
separate `/api/integrations/*` namespace rather than customer sessions or CSRF tokens. See
[ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md) for the full decision, including
the request-validation, error-contract, correlation, health-check, and client/server
data-fetching architecture this summary does not repeat.

### Configuration, secrets, and feature flags

BOBA Bear uses a **centralized, immutable, typed configuration boundary**: static technical
configuration and secrets come from validated runtime environment variables resolved once, at
process startup, by a single shared configuration loader validated with Zod 4; application modules
never read `process.env` directly. Non-secret operational configuration and feature-flag overrides
are stored in PostgreSQL, scoped by environment, brand, organization, territory, or outlet, and
raw secret values are never stored in BOBA Bear application tables — provider-account records hold
only logical credential references, resolved through an allowlisted secret resolver. BOBA Bear
defines an explicit application environment (`LOCAL`/`TEST`/`CI`/`STAGING`/`PRODUCTION`), distinct
from framework-controlled `NODE_ENV`, so the same promoted OCI image can run correctly in more than
one deployment context, consistent with
[ADR-002](./decisions/ADR-002-environments-ci-cd-release-model.md#immutable-artifact-model).
Feature flags are typed, code-defined, boolean for V1, evaluated server-authoritatively, and are
never a substitute for the authorization checks owned by Access Control; kill switches are explicit,
capability-scoped initiation controls that stop new checkout, payment, delivery, or WhatsApp work
without automatically stopping inbound provider events, reconciliation, or in-flight fulfilment. Web
and worker startup share one bootstrap that validates configuration, enforces production safeguards
and environment matching, and feeds the configuration-aware readiness endpoint fixed by
[ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md#health-endpoints). See
[ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md) for the full decision.

### Transactional outbox

Durable asynchronous work must use a **transactional outbox**: business state and an outbox event
are saved in the same database transaction, and the worker processes committed outbox events to
perform the external side effect. This is mandatory so that a payment capture, order acceptance, or
refund can never silently lose its downstream notification, retry, or delivery request. External
callbacks (payment webhooks, WhatsApp callbacks, delivery-provider events, OTP callbacks) must be
persisted and processed idempotently so duplicates cannot create duplicate orders, double-capture
payment, or repeat state transitions. See
[ADR-003](./decisions/ADR-003-modular-monolith-node-typescript.md#transactional-outbox) for the full
model, and
[ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#transactional-outbox-persistence)
for the concrete PostgreSQL-backed outbox, its claiming and delivery semantics, and the shared
idempotency store that implements it.

### Database ownership and cross-module dependencies

One physical PostgreSQL database backs the modular monolith. Each table or logical data set has
exactly one owning module; only the owning module writes its data, and other modules use the
owner's application API rather than writing to its tables directly. UI and transport adapters may
call only application use cases; application use cases may call only their own domain and declared
ports; infrastructure implements those ports. Cross-module imports must go through a module's public
`index.ts`, and circular module dependencies are prohibited. See
[ADR-003](./decisions/ADR-003-modular-monolith-node-typescript.md#database-ownership) and
[ADR-003 § Dependency Rules](./decisions/ADR-003-modular-monolith-node-typescript.md#dependency-rules)
for the complete rules.

## Evolution of the existing application

The current Next.js 16 / React 19 / TypeScript / Tailwind CSS v4 / Framer Motion application and
its design system should evolve in place where practical, rather than being discarded and rebuilt.
The marketing content, visual language, and component patterns already shipped represent real,
validated product investment.

The current deployment model — a fully static export (`output: "export"` in `next.config.ts`)
published to GitHub Pages — cannot host the transactional platform described in this documentation
set: it has no server runtime, no database connectivity, and no capacity for authenticated,
stateful requests. The deployment architecture will change to support customer accounts, carts,
checkout, payments, and order management: the application will run as a standard Node.js
application on DigitalOcean App Platform, backed by DigitalOcean Managed PostgreSQL, per
[ADR-001](./decisions/ADR-001-digitalocean-platform.md). This document does not prescribe the
migration sequence or exact timing of that change, and the current GitHub Pages deployment is not
altered as part of recording this decision — see
[`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md) for what remains open.

## Environments, CI/CD, and release process

[ADR-002](./decisions/ADR-002-environments-ci-cd-release-model.md) locks the process by which code
and schema changes move from a developer's machine into production. In summary:

- Four isolated environment types — local, CI, staging, and production — with staging and
  production kept fully separate in credentials, data, and configuration.
- Trunk-based development: short-lived branches merge into `main` through pull requests validated
  by credential-free automated checks.
- One immutable OCI image per accepted `main` commit, published to GitHub Container Registry and
  tagged with the full Git commit SHA; staging deploys automatically, production deploys the same
  image digest only through a manually triggered, tagged release.
- The web application and background worker deploy from that same image, differing only in startup
  command.
- Database changes use immutable, repository-controlled migrations run through a serialized
  pre-deployment migration job, following an expand-and-contract evolution pattern; routine
  down-migrations are rejected as the rollback mechanism.
- Runtime secrets (DigitalOcean App Platform environment variables) and CI/CD secrets (GitHub
  environments) are stored and scoped separately, with production secrets withheld from staging.
- Rollback favors redeploying a known-good image or a forward corrective migration over database
  restore.

See [ADR-002](./decisions/ADR-002-environments-ci-cd-release-model.md) for the full decision; this
summary does not restate its detail.

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

The concrete persistence architecture that model will be built on — PostgreSQL 18 and Drizzle ORM,
the database schema layout and table-ownership rules, the migration source-of-truth model, and the
identifier, time, money, and business-state storage conventions — is fixed by
[ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md).

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

- [ADR-001](./decisions/ADR-001-digitalocean-platform.md) — the accepted DigitalOcean hosting decision, deployment topology, and environment model.
- [ADR-002](./decisions/ADR-002-environments-ci-cd-release-model.md) — the accepted environment, CI/CD, release, migration, secrets, and rollback model.
- [ADR-003](./decisions/ADR-003-modular-monolith-node-typescript.md) — the accepted modular-monolith architecture, Node.js/TypeScript backend, repository structure, module boundaries, dependency rules, and asynchronous-reliability model.
- [ADR-004](./decisions/ADR-004-identity-authentication-sessions.md) — the accepted identity, authentication, session, verification, MFA, invitation, and recovery decision for the Identity module.
- [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md) — the accepted scoped role-based access control, deny-by-default authorization, scope inheritance, franchise-isolation, and Access Control module decision.
- [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md) — the accepted food-catalog, menu, assortment, and availability decision for the Catalog and Availability modules, including effective-menu resolution and checkout revalidation.
- [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md) — the accepted pricing, tax, charge, and promotion decision for the Pricing module, including monetary representation, price books, tax policies, immutable pricing quotes, and order monetary snapshots.
- [ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md) — the accepted customer-address, serviceability, service-zone, outlet-resolution, cart, anonymous-cart, checkout-orchestration, quote-expiry, customer-confirmation, pre-payment-order, idempotency, and transactional-boundary decision for the Serviceability, Cart, and Checkout modules.
- [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md) — the accepted payment-provider selection, provider-neutral Payments-module boundary, payment-intent and payment-attempt lifecycle, webhook ingestion, refund, and reconciliation decision for the Payments module.
- [ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md) — the accepted direct-order lifecycle, fulfilment workflow, outlet acceptance, Operations Console, operational command, timer, cancellation, exception, customer-tracking, order-timeline, and operational-audit decision for the Order, Kitchen operations, Delivery, and Notification modules.
- [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md) — the accepted delivery-provider abstraction, operating-mode, dispatch, courier-assignment, pickup-verification, proof-of-delivery, provider-event, return, and delivery-cost-reconciliation decision for the Delivery module.
- [ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md) — the accepted notifications, WhatsApp, and assisted-commerce decision for the Notification module, including the provider-neutral Notifications module, consent and template governance, the notification and message-attempt lifecycles, and the assisted-commerce boundary.
- [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md) — the accepted PostgreSQL and Drizzle persistence decision, including the database version and schema model, module table ownership, the reviewed-migration source-of-truth rule, identifier, time, money, and business-state storage conventions, transaction and concurrency rules, connection pooling and database roles, the PostgreSQL-backed transactional outbox and shared idempotency store, and backup, restore, and schema-drift policy.
- [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md) — the accepted HTTP API, Route Handler, request-validation, error-contract, CSRF, CORS, rate-limiting, idempotency, optimistic-concurrency, pagination, caching, correlation, webhook, health-check, and client/server data-fetching decision this document's HTTP-boundary summary is built on.
- [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md) — the accepted configuration, secrets, environment-validation, operational-configuration, feature-flag, kill-switch, startup-validation, and configuration-audit decision this document's configuration summary is built on.
- [`v1-product-scope.md`](./v1-product-scope.md) — the release scope these principles must support.
- [`organization-outlet-access-model.md`](./organization-outlet-access-model.md) — the entities and access model built on the relational data model described here.
- [`order-payment-delivery-model.md`](./order-payment-delivery-model.md) — the order, payment, and delivery entities and integrity requirements.
- [`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md) — provider choices and implementation details that remain open.
- [`decision-register.md`](./decision-register.md) — structured record of the architectural decisions summarized here.
