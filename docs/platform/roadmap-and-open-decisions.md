---
Status: SUPPORTING / HISTORICAL
Current IMP sequence: docs/platform/ROADMAP.md
Last updated: 2026-08-11
---

# BOBA Bear — Roadmap and Open Decisions

## Status

**SUPPORTING / HISTORICAL.** Current IMP identity, sequence, current/next slice, and GTM boundary
are owned exclusively by [`ROADMAP.md`](./ROADMAP.md) (GTM-R2). This document must not be read as a
duplicate current roadmap table.

This document records provisional phased direction notes and explicitly open decisions. Phases
described below express direction, not committed release dates. Do **not** use
[`implementation-roadmap.md`](./implementation-roadmap.md) for sequencing — it is SUPERSEDED
(GTM-R1). Public GTM boundary is **IMP-040**, not historical IMP-035.

Foundational ADR inventory and readiness history: [`architecture-readiness-review.md`](./architecture-readiness-review.md).
Binding decision status: [`decision-register.md`](./decision-register.md). Accepted state:
[`STATE.md`](./STATE.md).

## Future point-of-sale evolution

The Operations Console introduced in [`operating-model.md`](./operating-model.md) is intended to
grow, over time, into a fuller operations and point-of-sale platform. The stages below describe the
intended direction of that growth. **They are not committed release dates**, and no phase beyond
Stage 1 is approved scope for current work.

**Stage 1 — Direct-order operations** *(this is V1 — see [`v1-product-scope.md`](./v1-product-scope.md))*
- Web and WhatsApp orders
- Kitchen status
- Payments and refunds
- Delivery assignment

**Stage 2 — Kitchen management**
- Kitchen display system
- Preparation stations
- Timers
- Printer integration
- Order prioritization
- Product availability controls

**Stage 3 — Counter POS**
- Walk-in billing
- Cash and UPI payments
- Receipts
- Cashier workflows
- Shift management

**Stage 4 — Unified restaurant platform**
- Aggregator integrations
- Inventory
- Recipes and ingredient consumption
- Procurement
- Reporting
- Accounting exports
- Multi-outlet management
- Franchise operations

## Resolved decisions

**Hosting and cloud platform** — Resolved on 2026-08-02. BOBA Bear will use DigitalOcean as the
primary cloud platform: DigitalOcean App Platform in Bangalore for the Next.js modular monolith and
background worker, DigitalOcean Managed PostgreSQL in Bangalore for transactional data, and
DigitalOcean Spaces for object storage. See [ADR-001](./decisions/ADR-001-digitalocean-platform.md)
for the full decision and [`decision-register.md`](./decision-register.md) (D-012, D-015) for the
structured record. This resolves the hosting/cloud-platform item previously listed below; it does
not resolve the other open decisions in this list, several of which (region/data-location detail,
instance and database sizing, backup retention, disaster-recovery targets, infrastructure-as-code
tooling, secret management) are restated as explicit non-decisions in the ADR.

**Environments, CI/CD, release, migration, secrets, and rollback model** — Resolved on 2026-08-02.
BOBA Bear will use four isolated environment types (local, CI, staging, production); trunk-based
development with `main` as the only long-lived branch; credential-free pull-request validation; one
immutable OCI image per accepted `main` commit, published to GitHub Container Registry and promoted
by digest from staging to a manually triggered, tagged production release; immutable,
expand-and-contract database migrations run through a serialized pre-deployment job; a runtime/CI/CD
secrets boundary; a shared web/worker image; serialized per-environment deployments; health and
smoke testing; image-redeploy-or-forward-fix rollback in preference to database restore; and a
staged transition off GitHub Pages at commercial cutover. See
[ADR-002](./decisions/ADR-002-environments-ci-cd-release-model.md) for the full decision and
[`decision-register.md`](./decision-register.md) for the structured record. This does not resolve
the exact implementation tooling (infrastructure-as-code framework, migration framework and ORM,
container-build implementation, extended secret-management tooling, queue/background-job
technology, DNS migration procedure, or incident-response runbook), which remain open or deferred
below and are restated as explicit non-decisions in the ADR.

**Modular-monolith architecture, backend language, repository strategy, and module boundaries** —
Resolved on 2026-08-02. BOBA Bear will build the platform as a modular monolith: one Git repository,
one primary package, one Next.js application, one TypeScript application codebase, one OCI image,
one web process, one background-worker process, and one PostgreSQL database, with business logic
separated into clearly owned modules. The backend language and runtime are Node.js and TypeScript,
with Node.js 24 LTS as the initial production runtime line. Route Handlers are thin transport
adapters; business rules live in application use cases and domain code, organized per module into
domain, application, infrastructure, and UI layers with a mandatory dependency direction; a
transactional outbox is mandatory for durable asynchronous work, and inbound external events must be
processed idempotently. See
[ADR-003](./decisions/ADR-003-modular-monolith-node-typescript.md) for the full decision and
[`decision-register.md`](./decision-register.md) for the structured record. This does not resolve
the exact Node.js patch version, ORM, migration framework, runtime-validation library, queue
technology, dependency-injection approach, architecture-enforcement tool, or test frameworks, which
remain open below and are restated as explicit non-decisions in the ADR.

**Identity, authentication, sessions, verification, MFA, invitation, and recovery architecture** —
Resolved on 2026-08-02. BOBA Bear will use Better Auth as a self-hosted authentication framework
behind a BOBA Bear-owned Identity-module boundary, with authentication data stored in BOBA Bear
PostgreSQL. BOBA Bear uses one human authentication identity per person, which may carry both a
customer profile and workforce memberships. Customers authenticate in V1 using Indian mobile-number
OTP; customers may browse and build a temporary cart anonymously, but authentication is required
before final checkout. Workforce access is invitation-only, using verified email, password, and
mandatory TOTP MFA; shared accounts are prohibited. Sessions are opaque and database-backed, with
distinct customer and workforce session policies and mandatory step-up authentication for sensitive
actions. Better Auth's own organization and role functionality is not used as BOBA Bear's
business-authorization model. See
[ADR-004](./decisions/ADR-004-identity-authentication-sessions.md) for the full decision and
[`decision-register.md`](./decision-register.md) for the structured record. This does not resolve
the OTP/SMS provider, exact session durations, exact invitation lifetime, lost-phone recovery,
account deletion and retention, or several other items, which remain open below and are restated as
explicit non-decisions in the ADR.

**Organization, outlet, and business-authorization architecture** — Resolved on 2026-08-02. BOBA
Bear will use scoped role-based access control with policy conditions and deny-by-default
authorization, spanning platform, brand, organization, territory, and outlet scopes with
downward-only inheritance. Workforce membership and role assignment are separate concepts, so one
person may hold several scoped role assignments at once. V1 exposes six centrally maintained system
roles — Brand Administrator, Outlet Manager, Kitchen Operator, Delivery Coordinator, Support and
Refund Operator, and Finance Viewer — combined under an allow-only permission-union model; custom
franchise-created roles and generic deny roles are both rejected for V1. Delegated administration can
never exceed the assigner's own authority, self-elevation is prohibited, and franchise organizations
are isolated from one another's data. Customers are authorized by resource ownership rather than
workforce role, and customer identity remains brand-owned. Break-glass platform access and support
access are both narrowly scoped, time-limited, and audited; standing unrestricted support access is
rejected. Service identities are separate principals from human workforce members. See
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md) for the full decision and
[`decision-register.md`](./decision-register.md) for the structured record. This does not resolve
the exact authorization database schema, permission catalog, authorization-cache implementation,
refund and monetary delegation limits, guest-order tracking model, break-glass and support-access
workflows, field-level DTO definitions, organization/outlet state transitions, selective PostgreSQL
RLS usage, service-identity credential mechanism, or franchise pricing/promotion/finance authority,
which remain open below and are restated as explicit non-decisions in the ADR.

**Food catalog, menu, assortment, and availability architecture** — Resolved on 2026-08-02. BOBA Bear
will own one canonical brand-level food and beverage catalog, with catalog, menu, assortment,
availability, and pricing kept as five distinct concerns. Every orderable product requires at least
one variant, including a hidden default variant; every catalog entity uses a stable internal
identifier, independent of display name, slug, or external system identifiers; products, variants, and
modifiers follow a draft/active/retired lifecycle behind a draft-and-publish workflow; and historically
referenced catalog entities are never hard deleted. Customer customization uses structured modifier
groups and options with mandatory server-side validation; free-text instructions are separate and
non-authoritative; standard products and bundles are both supported, with nested bundles rejected for
V1. Dietary, allergen, and media metadata are brand-owned. Downstream assortment scopes may narrow but
never broaden an upstream exclusion, using `INHERIT`, `INCLUDED`, and `EXCLUDED` states. Operational
availability and outlet-wide ordering pause are distinct from catalog lifecycle and assortment; the
same effective-menu resolution logic serves the PWA and WhatsApp; and checkout must always
authoritatively revalidate catalog, assortment, availability, modifier, bundle, and outlet state, with
no silent substitution and an immutable order catalog snapshot. See
[ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md) for the full decision and
[`decision-register.md`](./decision-register.md) for the structured record. This does not resolve the
exact catalog database schema, stable identifier format, catalog-revision and publication-storage
model, media-processing pipeline, search implementation, localization implementation, allergen
approval workflow, visibility-policy configuration, or whether configurable bundles are required for
the initial launch, which remain open below and are restated as explicit non-decisions in the ADR.
Pricing was, at the time this decision was recorded, entirely open, deferred to a future ARCH-07
pricing architecture decision — since resolved by ADR-007 below.

**Pricing, tax, charges, and promotions architecture** — Resolved on 2026-08-02. BOBA Bear will use a
Pricing module, distinct from Catalog, that resolves an authoritative price for a specific outlet,
legal entity, customer, channel, cart, delivery context, and date/time. The initial platform currency
is INR; every monetary record carries currency; final authoritative monetary values persist as
integer paise; intermediate calculations use decimal arithmetic; JavaScript floating-point arithmetic
is rejected for authoritative money. Pricing is expressed through effective-dated price books
arranged brand → territory → organization → outlet, with explicit lock, floor, ceiling, and override
policy, and outlet-level price editing disabled by default. Tax treatment uses effective-dated tax
policies rather than a hard-coded rate; BOBA Bear's initial restaurant-service GST profile is
provisionally 5% (CGST 2.5% + SGST 2.5%) without input tax credit, explicitly not production-approved
until legal, GST-registration, and accountant validation occurs before commercial launch. Packaging
charges and delivery charges are explicit monetary lines; delivery charge and delivery-provider cost
are tracked as separate values with any subsidy explicit; V1 supports no generic platform or
convenience fee. A versioned, deterministic calculation order combines catalog prices, promotions,
packaging, delivery, and tax into a final payable total, with deterministic discount allocation and
rounding. Promotions support automatic and coupon-based discounts with explicit compatibility rules
and atomic reservation/redemption. Checkout produces an immutable pricing quote, revalidated before
payment with mandatory customer reconfirmation of any revised total, and every order retains an
immutable monetary snapshot that later pricing, tax, or promotion changes must never alter.
Cancellations and refunds reuse the original order's allocations. BOBA Bear's Pricing module governs
direct-order calculations only; aggregator-channel totals remain outside its scope. See
[ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md) for the full decision and
[`decision-register.md`](./decision-register.md) for the structured record. This does not resolve
the final GST classification or rate, the exact decimal library, rounding mode, packaging amount and
tax category, delivery-charge tax category, exact delivery-pricing policy, exact launch promotion
compatibility matrix, exact franchise pricing/promotion authority, exact refund limits, invoice
numbering, or payment-provider selection, which remain open below and are restated as explicit
non-decisions in the ADR.

**Serviceability, cart, and checkout architecture** — Resolved on 2026-08-02. BOBA Bear will resolve
serviceability and the responsible outlet through explicitly configured, authorized service zones
(polygon or radius) with coordinate-based final validation, kept strictly separate from delivery
quoting; outlet resolution is deterministic and, in V1, fully automatic. Customer delivery addresses
are owned by the Customers module, always support manual entry, and require customer confirmation of
the resolved location; a saved-address edit never mutates a historical order's immutable snapshot.
Carts are server-side authoritative, single-outlet resources, with anonymous-cart access through a
protected opaque token, optimistic concurrency, idempotent mutation, and no cart-stage reservation of
inventory, capacity, price, or promotion. Silent cross-outlet or conflicting-cart merging is
prohibited. The Checkout module is the cross-module orchestrator, with an explicit lifecycle,
actionable validation findings, cart locking on confirmation, and mandatory revalidation before
payment; serviceability decisions, delivery quotes, pricing quotes, promotion reservations, and the
checkout session itself are all time-limited, and any material change invalidates prior customer
confirmation. Checkout creates exactly one idempotent pre-payment order, in a `PENDING_PAYMENT` state
and never kitchen-visible, before handing it to the Payments module; all required internal state,
including a transactional outbox event, is committed in one database transaction before any external
payment-provider call. See
[ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md) for the full decision and
[`decision-register.md`](./decision-register.md) for the structured record. This does not resolve the
geocoding or map provider, the exact service-zone persistence model, exact cart, quote, or checkout
lifetimes, the same-outlet merge experience, or detailed payment execution, which remain open below
or are restated as explicit non-decisions in the ADR.

**Payments, webhooks, refunds, and reconciliation architecture** — Resolved on 2026-08-02. BOBA Bear
will use Cashfree Payment Gateway with Cashfree Hosted Checkout as the V1 payment provider, approved
subject to launch-readiness validation, integrated behind a provider-neutral Payments module so that
Checkout, Orders, Pricing, Customers, Operations, Delivery, Notifications, and Audit never depend on
Cashfree-specific concepts directly. V1 enables UPI, domestic credit cards, domestic debit cards, and
net banking, using immediate capture, with a payment account resolved from the order's selling legal
entity. One payment intent exists per immutable pre-payment order, mapping to one Cashfree provider
order, with multiple payment attempts tracked separately; provider-order creation occurs only after
Checkout's internal transaction commits, using a synchronous call with transactional-outbox recovery
and a stable idempotency key that must never produce a duplicate provider order on an uncertain
timeout. Browser results are customer-experience signals only — payment success requires a verified
Cashfree webhook or an authenticated server-to-server status query. Webhook ingestion is durable and
idempotent, applying first-verified-success-wins, forcing amount/currency/account mismatches and
duplicate successes into review, and never discarding a late payment success. Scheduled
reconciliation and status polling recover from delayed or lost webhooks; payment success and
settlement are treated as separate concepts. Refunds are immutable internal records that reuse the
original order's pricing and tax allocations, submitted to Cashfree idempotently, supporting full and
partial refunds; emergency Cashfree-dashboard refunds are reconciled, not treated as authoritative on
their own. Disputes and chargebacks are durably ingested for review. See
[ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md) for the full decision and
[`decision-register.md`](./decision-register.md) for the structured record. This does not resolve
the exact Cashfree API version, exact payment or refund expiry durations, exact reconciliation
cadence, exact automatic-refund cases, exact refund approval limits, exact settlement-import method,
or Cashfree's production approval itself (which requires separate launch-readiness validation),
which remain open below or are restated as explicit non-decisions in the ADR.

**Order lifecycle and Operations Console architecture** — Resolved on 2026-08-02. BOBA Bear will keep
commercial order state, payment state, fulfilment state, delivery state, cancellation request and
decision, refund state, and the customer-visible tracking projection as separate, independently owned
dimensions rather than one overloaded status field. A verified payment success releases the order to
Operations through a durable transactional outbox event; a pending, failed, expired, mismatched, or
under-review payment never enters the normal kitchen queue. V1 uses manual outlet acceptance for every
paid order, with automatic acceptance deferred; rejection is available only before acceptance,
requires a structured reason, and routes a paid rejection into cancellation and refund handling. No
staff action may silently substitute a confirmed order's product, variant, modifier, quantity,
instruction, address, or fulfilment outlet. Normal fulfilment progression is forward-only; backward
movement requires a dedicated, audited correction command. The V1 Operations Console is a fulfilment
console, not a full point-of-sale system, with role-minimized outlet-scoped views for Kitchen
Operator, Outlet Manager, Delivery Coordinator, and Support/Refund Operator. Every operational command
carries trusted context — order, expected version, expected state, idempotency key, actor, and reason
where required — enforced through optimistic concurrency and idempotent replay. Operational timers
derive from persisted timestamps and escalate rather than silently cancel or refund on breach. Queue
ordering is deterministic; manual reprioritization is permissioned and audited. Outlet pause blocks new
orders but preserves existing paid-order obligations. Cancellation request is separate from
cancellation decision, and cancellation state is separate from refund state. Operational exceptions
are first-class, auditable records with their own OPEN/ACKNOWLEDGED/IN_PROGRESS/RESOLVED/CLOSED
lifecycle. Customers see only a safe, derived tracking projection, addressed through a public order
number that is never itself an access credential. An append-only order event timeline supports audit,
tracking, and reconciliation alongside PostgreSQL's authoritative current state. Notifications are
emitted only after a state transition commits, through the transactional outbox, and realtime Console
transport is a non-authoritative convenience. Delivery completion normally drives commercial order
completion, and historical order, fulfilment, cancellation, refund, exception, and tracking data
remain immutable. See
[ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md) for the full decision and
[`decision-register.md`](./decision-register.md) for the structured record. This does not resolve
exact order-state and fulfilment-state enum names, exact timer thresholds, the exact customer
cancellation window and automatic cancellation/refund policy, the exact post-payment
order-modification policy, the exact preparation-estimate algorithm, the exact public order-number
format, the exact realtime transport, exact notification templates and cadence, exact exception
severity and blocking rules, or exact manual-completion authority, which remain open below and are
restated as explicit non-decisions in the ADR.

**Delivery-provider abstraction, dispatch, and fulfilment architecture** — Resolved on 2026-08-02.
BOBA Bear will use a provider-neutral Delivery module supporting API-integrated, business-dashboard,
and controlled manual-local-provider operating modes; manual local delivery is a controlled, audited,
supported mode, not a workaround. A checkout delivery quote does not itself dispatch a courier
booking; a real delivery request is created only after verified payment success and outlet
acceptance, using preparation-aware dispatch timing, and delivery-request creation is idempotent with
explicit provider-timeout recovery so a duplicate booking is never silently created. Provider-specific
statuses are normalized by provider adapters into one BOBA Bear delivery lifecycle; an order has at
most one active delivery booking by default, and provider switching after courier assignment is an
exception, prohibited outright after pickup. Pickup requires verification beyond the public order
number, and Operations/Delivery handoff is coordinated in one transaction. Proof of delivery is
provider-neutral, preferring a customer OTP or provider PIN, with manual confirmation reserved as an
exceptional path; delivery confirmation normally drives commercial order completion. Provider
callbacks are durable, idempotent, and reconciled against duplicate, delayed, and out-of-order
delivery. Delivery cancellation is separate from commercial order cancellation; delivery failure and
returns use explicit resolution workflows, and returned food does not automatically return to
saleable stock. Provider cost is tracked separately from the customer delivery charge fixed by
ADR-007 and reconciled on its own schedule; customer and rider data shared with providers is
minimized. Rapido is the first commercial-validation candidate, not an approved integration — no
production delivery provider is selected. See
[ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md) for the full decision and
[`decision-register.md`](./decision-register.md) for the structured record. This does not resolve the
final Dehradun provider, Rapido's actual availability and capability, exact dispatch lead time, exact
pickup-verification method, exact proof-of-delivery policy, exact delivery-OTP parameters, exact
customer-unavailable and return policy, exact provider-cost variance tolerance, or exact
provider-specific callback and API contracts, which remain open below and are restated as explicit
non-decisions in the ADR.

**Notifications, WhatsApp, and assisted-commerce architecture** — Resolved on 2026-08-02. BOBA Bear
will use a provider-neutral Notifications module, reachable only through the transactional outbox,
with Meta WhatsApp Cloud API as the approved V1 WhatsApp channel adapter behind a single brand-owned
WhatsApp Business Account — never a personal staff number. Supported channels are WHATSAPP, EMAIL,
SMS, IN_APP, and PUSH; WhatsApp is the primary V1 transactional channel and in-app PWA tracking is
the authoritative fallback. WhatsApp messages are classified using Meta's
UTILITY/MARKETING/AUTHENTICATION/SERVICE template categories. Consent is modeled per purpose
(ORDER_UPDATES, DELIVERY_UPDATES, SUPPORT_MESSAGES, MARKETING_MESSAGES, AUTHENTICATION_MESSAGES),
kept structurally separate from marketing consent, with evidence-backed
GRANTED/WITHDRAWN/EXPIRED/SUPPRESSED states that staff cannot silently override. A provider-neutral
template registry resolves a semantic notification type to an internal key, locale, version, and
channel/provider template reference, with typed variable validation and no machine translation at
send time. Notification requests and provider message attempts are separate, deduplicated, idempotent
records; duplicate domain events never duplicate a customer message, and stale intermediate messages
are suppressed once a later state has already been communicated. WhatsApp inbound messages and
delivery/read-status events are ingested through durable, verified, deduplicated webhooks;
delivery/read-status events never mutate order, payment, delivery, refund, or consent state. Inbound
messages are classified (including CANCELLATION_REQUEST, which creates a cancellation request only,
never a direct cancellation) and routed through conversation threads with human escalation for
ambiguous or sensitive cases; AI classification may only propose classification and trigger safe,
reversible actions, never autonomously approve a refund, cancellation, or payment action. WhatsApp in
V1 supports transactional notifications, customer-initiated support, and bounded, server-revalidated
interactive confirmations — not full conversational ordering, an AI shopping agent, autonomous
checkout, or payment-credential collection in chat, which always remains inside Cashfree Hosted
Checkout. See
[ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md) for the full decision and
[`decision-register.md`](./decision-register.md) for the structured record. This does not resolve the
exact Meta Graph API version, the exact V1 transactional template set and wording, the exact launch
locales, the exact retry counts and intervals, the exact channel-fallback matrix, or Meta's own
production approval of BOBA Bear's WhatsApp Business Account (business verification, WABA ownership,
phone-number registration, template approval, and billing setup), which remain open below or are
restated as explicit non-decisions in the ADR.

**Persistence, PostgreSQL, and Drizzle architecture** — Resolved on 2026-08-02. BOBA Bear will
persist all transactional platform data in a single DigitalOcean Managed PostgreSQL 18 database
(Standard Edition for initial production), with the same major version in local, CI, staging, and
production. Drizzle ORM over node-postgres is the persistence toolkit, Drizzle Kit generates the
versioned SQL migrations, the Better Auth Drizzle adapter holds authentication persistence, and
Testcontainers with PostgreSQL 18 backs persistence integration tests. Concerns are separated by four
explicit PostgreSQL schemas — `auth`, `app`, `platform`, and `drizzle` — with no BOBA Bear
application tables in `public`, and every table has exactly one owning module. Reviewed, committed
SQL migrations are the only authorized way to change a shared database; `drizzle-kit push` is
prohibited outside a disposable personal scratch database, and manual production DDL is prohibited
outside audited emergency recovery. Storage conventions are fixed: UUIDv7 `uuid` primary keys,
`timestamptz` for real-world instants with IANA timezone identifiers for business-local schedules,
integer paise in `bigint` for final amounts with `numeric` for rates, and `text` plus a named `CHECK`
constraint rather than native enums for business lifecycle states. Structural invariants are enforced
by database constraints; repositories are module-owned, scoped, and purpose-specific, with no generic
base repository; parameterized raw SQL remains allowed inside infrastructure boundaries; transactions
use an explicit context-passing abstraction, default to `READ COMMITTED`, never call an external
provider while open, and commit business state together with the outbox event. The transactional
outbox required since ADR-003 is fixed as a PostgreSQL table claimed with `SELECT ... FOR UPDATE SKIP
LOCKED`, delivering at-least-once with mandatory consumer idempotency, and cross-cutting idempotency
uses a shared PostgreSQL table whose uniqueness constraint is the final concurrency authority. No
Redis, RabbitMQ, Kafka, external queue, or CDC pipeline is introduced for V1. Runtime traffic uses
DigitalOcean's PgBouncer transaction-mode pool with an explicit connection budget and four separate
database roles; migrations, backups, and restores use direct connections. Row-Level Security remains
deferred as a selective control, restating D-081. See
[ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md) for the full decision and
[`decision-register.md`](./decision-register.md) for the structured record. This does not resolve the
exact package versions and image digests, exact database-role grants, exact pool sizes and timeout
values, exact retry and backoff parameters, exact idempotency-retention periods, exact backup schedule
and restore-drill cadence, exact observability provider and slow-query threshold, the PostGIS
adoption decision, the exact migration-runner wrapper, or the exact static-menu catalog import
mechanism, which remain open below and are restated as explicit non-decisions in the ADR.

**HTTP API, Route Handlers, and request/response contracts architecture** — Resolved on 2026-08-03.
BOBA Bear will use Next.js App Router Route Handlers, using the standard Web `Request` and
`Response`, as the canonical HTTP boundary, exposed as versioned JSON contracts under
`/api/v1/{public,customer,operations,admin}`, with a separate `/api/integrations/*` namespace for
provider webhooks and `/health/live`/`/health/ready` outside the versioned product API. Route
Handlers remain thin transport adapters that validate boundary data with Zod 4, invoke exactly one
application use case, and map results through a shared success envelope and an RFC 9457 Problem
Details error contract with stable machine-readable error codes; legacy Pages Router API Routes and
Server Actions are both rejected as the canonical V1 business API. Server Components call authorized
application query services directly and never make loopback HTTP requests to the application's own
API; Client Components call `/api/v1` through a typed first-party client. Cookie-authenticated unsafe
methods require synchronizer-token CSRF protection; CORS is disabled by default with no wildcard
credentialed configuration; sensitive operations use layered, PostgreSQL-backed rate limiting;
effectful mutations support `Idempotency-Key` replay; concurrency-sensitive mutations support
`ETag`/`If-Match`; unbounded lists use opaque cursor pagination with a stable unique sort;
authenticated responses are generally `Cache-Control: private, no-store`; every request carries a
BOBA Bear request ID and supports W3C Trace Context; and provider webhooks use their own
authenticity, replay, and idempotency controls rather than customer sessions or CSRF tokens. See
[ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md) for the full decision and
[`decision-register.md`](./decision-register.md) for the structured record. This does not resolve
the exact Zod version, exact Route Handler helper APIs, exact Better Auth route, exact Problem
Details URI host, exact CSRF token mechanics, exact trusted-proxy configuration, exact rate-limit
algorithms and thresholds, exact request-size limits, exact idempotency-key syntax, exact `If-Match`
endpoint coverage, exact cursor encoding and page sizes, exact public caching policy, exact client
query library and retry values, exact observability SDK, exact OpenAPI tooling, exact security-header
and CSP configuration, exact upload mechanism, exact health-response shape, or exact API deprecation
policy, which remain open below and are restated as explicit non-decisions in the ADR.

**Configuration, secrets, and feature-flag architecture** — Resolved on 2026-08-03. BOBA Bear will
use a centralized, immutable, typed configuration boundary: static technical configuration and
secrets come from validated runtime environment variables resolved once, at process startup, by a
single shared configuration loader validated with Zod 4, with application modules never reading
`process.env` directly; non-secret operational configuration and feature-flag overrides are stored
in PostgreSQL, scoped by environment, brand, organization, territory, or outlet, and raw secret
values are never stored in BOBA Bear application tables. BOBA Bear defines an explicit application
environment (`LOCAL`/`TEST`/`CI`/`STAGING`/`PRODUCTION`), distinct from framework-controlled
`NODE_ENV`; build-time configuration is limited to what the immutable artifact genuinely needs, with
all environment-specific values and secrets read at runtime; `NEXT_PUBLIC_` is restricted to safe,
stable, non-secret constants, with environment-specific browser values served through an explicit
runtime public-configuration allowlist instead. Provider-account records hold logical credential
references, resolved only through an allowlisted secret resolver, never a raw credential. Feature
flags are typed, code-defined, boolean for V1, evaluated server-authoritatively, and are never a
substitute for authorization; kill switches are explicit, capability-scoped initiation controls that
stop new checkout, payment, delivery, or WhatsApp work without automatically stopping inbound
provider events, reconciliation, or in-flight fulfilment. Web and worker startup share one bootstrap
that fails fast on invalid or missing required configuration and on production-safeguard or
environment-matching failures, while remaining tolerant of temporary third-party provider
unavailability, and feeds the configuration-aware `/health/ready` endpoint already fixed by
[ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md#health-endpoints). See
[ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md) for the full decision and
[`decision-register.md`](./decision-register.md) for the structured record. This does not resolve
the exact environment-variable names, exact configuration file structure, exact public-runtime-config
mechanism, exact feature-flag cache duration and invalidation mechanism, exact secret-rotation
runbooks, exact developer secret-distribution mechanism, exact production-safeguard checks, exact
admin configuration UX and approval thresholds, exact redaction library, exact readiness response
shape, or the external secret-manager adoption point, which remain open below and are restated as
explicit non-decisions in the ADR.

## Open decisions

The following decisions are unresolved. They are listed here rather than silently defaulted, and
each has a corresponding row in [`decision-register.md`](./decision-register.md). None of them
should be treated as answered by omission elsewhere in this documentation set or in the
repository's existing code.

1. **Exact India region and data-location requirements** — beyond the general preference for
   India-located transactional data and services. (DigitalOcean App Platform and Managed
   PostgreSQL are now located in Bangalore per [ADR-001](./decisions/ADR-001-digitalocean-platform.md);
   broader data-location and regulatory requirements beyond that region choice remain open.)
2. **OTP/SMS provider** — for customer mobile-number verification, within the customer mobile-OTP
   authentication method accepted in
   [ADR-004](./decisions/ADR-004-identity-authentication-sessions.md#customer-authentication).
3. ~~**Payment gateway** — for direct online payment.~~ Resolved 2026-08-02: Cashfree Payment
   Gateway with Cashfree Hosted Checkout, approved for V1 subject to launch-readiness validation, per
   [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md) and
   [`decision-register.md`](./decision-register.md). Cashfree's own production approval — merchant
   onboarding, commercial pricing, contract terms, and success-rate validation — remains a distinct
   open launch prerequisite; see item 71 below.
4. **Final Dehradun delivery-provider selection** — the provider-neutral Delivery architecture and
   operating modes are now fixed by
   [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md); which specific
   partner(s) BOBA Bear commercially and technically validates, and how multiple partners might be
   supported, remain open. Rapido is the first commercial-validation candidate, not an approved
   integration.
5. **Rapido and other candidate provider capability** — Dehradun coverage, food-delivery suitability,
   business-account availability, API availability, dashboard-booking capability, and commercial
   terms all require direct validation, per
   [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#provider-validation-order);
   a public Rapido delivery API is not assumed to exist.
6. **Exact service-zone persistence and geocoding provider** — explicit polygon/radius service zones
   with coordinate-based validation are now the accepted serviceability model, per
   [ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md#explicit-service-zones); the exact
   database representation, geocoding provider, and map provider for the initial Dehradun zones
   remain open.
7. **Exact cancellation policy** — under what conditions a customer or outlet may cancel, and up
   to what order state, beyond the cancellation-request/decision separation and the customer- and
   outlet-cancellation foundations now fixed by
   [ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md#customer-cancellation-foundation)
   and
   [ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md#outlet-cancellation-foundation).
8. **Exact refund policy** — cancellation eligibility, refund limits, approval thresholds, and
   delivery-refund rules beyond the refund domain model, lifecycle, and idempotency now fixed by
   [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md#refund-validation), and
   beyond the cancellation/refund state-separation principle now fixed by
   [ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md#cancellation-and-refund-separation).
9. **Tax and invoicing requirements** — applicable tax treatment and invoice format for direct
   orders.
10. **Legal entity configuration** — the confirmed legal entity (or entities) responsible for
    direct-order invoicing, tax, and settlement; see the note in
    [`organization-outlet-access-model.md`](./organization-outlet-access-model.md#v1-organizational-configuration).
11. **Payment settlement owner** — which legal entity or account direct-order payments settle to.
12. **Customer-support workflow** — channel, staffing model, and escalation path for direct-order
    support.
13. ~~**Exact WhatsApp capability at launch**~~ Resolved 2026-08-02: the Notifications module,
    supported channels, WhatsApp message categories, consent model, and the assisted-commerce
    boundary (notifications and customer-initiated support, not conversational ordering or autonomous
    checkout) are now fixed by
    [ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md). Meta's own production
    approval of BOBA Bear's WhatsApp Business Account, the exact V1 template set, and exact launch
    locales remain open — see item 85 below.
14. **Shared-cart policy for future food, merchandise, and drops** — whether and how a cart may
    ever span categories; see [`v1-product-scope.md`](./v1-product-scope.md#merchandise-and-gated-drops).
15. **Future point-of-sale milestones** — firm scope and timing for Stages 2–4 above.
16. **Native mobile-app timing** — when Android and iOS applications move from Deferred to
    scoped work.
17. **Multi-city rollout sequence** — which city follows Dehradun, and on what basis.
18. **Franchise settlement model** — how franchise payment settlement, royalty, and deductions
    will work; see [`order-payment-delivery-model.md`](./order-payment-delivery-model.md#payment-and-settlement-foundation).
19. **Franchise pricing authority** — the exact limits of what a franchise organization may price
    independently versus what the brand or territory locks.
20. **Franchise customer-data access** — the precise boundary of customer information a
    franchisee may access beyond what is required to fulfil its own orders; see
    [`organization-outlet-access-model.md`](./organization-outlet-access-model.md#customer-ownership).
21. **Brand-versus-franchise promotion authority** — who may create promotions or discounts at
    each organizational level.
22. **Application instance sizes, database size, storage capacity, backup retention, and
    disaster-recovery targets** — the specific capacity and resilience parameters within the
    DigitalOcean foundation accepted in [ADR-001](./decisions/ADR-001-digitalocean-platform.md).
23. **Infrastructure-as-code tooling and secret-management implementation** — not selected as part
    of the DigitalOcean hosting decision.
24. **Final production high-availability date and final commercial-launch capacity** — timing
    decisions that follow, but are not fixed by, [ADR-001](./decisions/ADR-001-digitalocean-platform.md).
25. **Domain and DNS migration sequence** — when and how `thebobabear.in` moves from the current
    GitHub Pages deployment to the DigitalOcean-hosted application; see
    [ADR-002](./decisions/ADR-002-environments-ci-cd-release-model.md#github-pages-transition).
26. ~~**Queue and background-job technology**~~ Resolved 2026-08-02 for V1: durable asynchronous
    work uses a PostgreSQL-backed transactional outbox claimed with `SELECT ... FOR UPDATE SKIP
    LOCKED`, with no Redis, RabbitMQ, Kafka, external managed queue, or change-data-capture pipeline
    introduced for V1, per
    [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#transactional-outbox-persistence).
    Exact claim batch size, lease duration, and retry backoff remain open — see item 88 below.
27. **Realtime communication approach** — for order-status updates and similar customer-facing
    realtime needs.
28. **Observability provider** — logging, metrics, tracing, and alerting tooling.
29. ~~**Exact migration framework and ORM**~~ Resolved 2026-08-02: Drizzle ORM over node-postgres,
    with Drizzle Kit generating versioned SQL migrations into `db/migrations/` and managing migration
    history, implementing the migration model accepted in
    [ADR-002](./decisions/ADR-002-environments-ci-cd-release-model.md#migration-strategy). See
    [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#approved-persistence-stack) and
    [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#migration-tooling-and-workflow).
    Exact package versions and the exact migration-runner wrapper remain open — see item 86 below.
30. **Exact container-build implementation and App Platform specification syntax** — how the OCI
    image is built and how `infra/digitalocean/` application specifications are authored, within
    the boundaries accepted in [ADR-002](./decisions/ADR-002-environments-ci-cd-release-model.md).
31. **Exact deployment-token scopes** — the specific DigitalOcean token permissions, within the
    least-privilege requirement accepted in [ADR-002](./decisions/ADR-002-environments-ci-cd-release-model.md#secrets-model).
32. **Per-pull-request preview environments** — deferred, may be considered later for selected
    UI-heavy changes; see [ADR-002](./decisions/ADR-002-environments-ci-cd-release-model.md#pull-request-validation).
33. **Exact incident-response runbook** — the detailed ordering-integrity incident procedure
    referenced in [ADR-002](./decisions/ADR-002-environments-ci-cd-release-model.md#rollback-strategy).
34. **Exact production smoke-test data strategy** — how production smoke tests avoid creating
    uncontrolled real financial or fulfilment activity; see
    [ADR-002](./decisions/ADR-002-environments-ci-cd-release-model.md#health-and-smoke-testing).
35. **Exact Node.js 24 patch version** — the specific patch release to pin across local development,
    CI, the OCI image, staging, and production, within the Node.js 24 LTS line accepted in
    [ADR-003](./decisions/ADR-003-modular-monolith-node-typescript.md#backend-language-and-runtime).
36. **Runtime-validation library, dependency-injection approach, and architecture-enforcement
    tool** — the concrete tooling implementing the layer boundaries, DTO validation, and mandatory
    dependency rules accepted in
    [ADR-003](./decisions/ADR-003-modular-monolith-node-typescript.md#dependency-rules).
37. **Unit-, integration-, and end-to-end-test frameworks** — the specific libraries implementing
    the testing structure accepted in
    [ADR-003](./decisions/ADR-003-modular-monolith-node-typescript.md#testing-structure). The
    *substrate* for persistence integration tests is no longer open: as of 2026-08-02 those tests run
    against real PostgreSQL 18 provisioned by Testcontainers, and SQLite, PGlite, and in-memory fakes
    are rejected as the authoritative substitute, per
    [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#postgresql-integration-test-strategy).
    The test-runner and end-to-end libraries themselves, and the test-isolation implementation,
    remain open — see item 90 below.
38. ~~**API style and versioning, and Server Action usage policy**~~ Resolved 2026-08-03: Next.js
    App Router Route Handlers under path-based `/api/v1` versioning are the canonical HTTP boundary
    exposing the DTO and contract boundary accepted in
    [ADR-003](./decisions/ADR-003-modular-monolith-node-typescript.md#dto-and-api-boundaries); Server
    Actions are not the canonical V1 business API, per
    [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md). Exact Route Handler helper
    APIs and several other implementation details remain open — see items 91–106 below.
39. ~~**Separate PostgreSQL schemas per module**~~ Resolved 2026-08-02: module-owned tables are
    *not* isolated by schema. One database carries four explicit PostgreSQL schemas — `auth`, `app`,
    `platform`, and `drizzle` — with all business tables in `app`, no BOBA Bear application tables in
    `public`, and module ownership enforced by code review and repository boundaries rather than by a
    schema-per-module split, per
    [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#one-database-explicit-schemas)
    and
    [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#module-table-ownership).
40. **Exact worker scheduling and polling model** — how the background worker picks up outbox
    events and scheduled work, within the transactional-outbox requirement accepted in
    [ADR-003](./decisions/ADR-003-modular-monolith-node-typescript.md#transactional-outbox). The
    *claiming mechanism* is no longer open: workers claim outbox rows with bounded
    `SELECT ... FOR UPDATE SKIP LOCKED` batches under a lease, per
    [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#outbox-claiming). The
    scheduling cadence, batch size, and lease duration remain open — see item 88 below.
41. **Exact customer and workforce session durations and inactivity timeouts** — the concrete
    absolute and inactivity timeout values within the session-policy separation accepted in
    [ADR-004](./decisions/ADR-004-identity-authentication-sessions.md#customer-and-workforce-session-policy-separation).
42. **Exact recent-authentication lifetime for step-up authentication** — how long a
    recently-authenticated state remains valid before a sensitive action requires
    re-verification, within the step-up requirement accepted in
    [ADR-004](./decisions/ADR-004-identity-authentication-sessions.md#step-up-authentication).
43. **Exact workforce invitation lifetime** — the concrete expiry window within the invitation
    lifecycle accepted in
    [ADR-004](./decisions/ADR-004-identity-authentication-sessions.md#invitation-lifecycle).
44. **Exact lost-phone recovery process, account-deletion process, and data-retention and
    anonymization rules** — the customer-recovery and identity-lifecycle procedures accepted in
    principle in [ADR-004](./decisions/ADR-004-identity-authentication-sessions.md#customer-recovery)
    and [ADR-004](./decisions/ADR-004-identity-authentication-sessions.md#identity-lifecycle), pending
    a dedicated privacy and data-retention architecture slice.
45. **Exact MFA recovery-code policy and shared-device kitchen procedure** — the workforce
    MFA-recovery workflow and the operational procedure for a shared kitchen device, within the
    boundaries accepted in
    [ADR-004](./decisions/ADR-004-identity-authentication-sessions.md#workforce-recovery).
46. **Bot-protection and CAPTCHA provider, and exact OTP cooldown duration** — the concrete
    anti-abuse tooling and cooldown values within the configurable OTP-control policy accepted in
    [ADR-004](./decisions/ADR-004-identity-authentication-sessions.md#otp-security).
47. **Exact service-identity credential technology** — the API-key, signed-request, OAuth,
    mutual-TLS, or service-token implementation for non-human callers, within the service-identity
    boundary accepted in
    [ADR-004](./decisions/ADR-004-identity-authentication-sessions.md#service-identities).
48. **Passkey and social-login timing** — when workforce passkeys and customer social login, both
    deferred in
    [ADR-004](./decisions/ADR-004-identity-authentication-sessions.md#rejected-or-deferred-alternatives),
    might be reconsidered.
49. **Exact catalog database schema and table names** — within the catalog, menu, assortment, and
    availability domain model accepted in
    [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md).
50. **Exact stable catalog identifier format** — the concrete identifier scheme for products,
    variants, modifier groups and options, bundles, menus, and menu sections, within the
    stable-identifier requirement accepted in
    [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md#stable-internal-identifiers).
51. **Exact catalog-revision and publication-storage model, and draft-copy strategy** — how draft and
    published catalog and menu revisions are represented and stored, within the draft-and-publish
    model accepted in
    [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md#draft-and-publication-workflow).
52. **Exact menu-scheduling granularity and channel-specific menu behaviour** — within the menu
    publication model accepted in
    [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md#menu-publication).
53. **Exact assortment persistence structure** — how territory, organization, and outlet assortment
    decisions are stored, within the `INHERIT`/`INCLUDED`/`EXCLUDED` model accepted in
    [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md#assortment-decision-states).
54. **Exact effective-menu caching and cache-invalidation approach, and availability-propagation
    technology** — within the effective-menu resolution and availability-propagation principles
    accepted in
    [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md#availability-propagation).
55. **Exact media-upload process, image-processing pipeline, and CDN behaviour** — within the
    product-media ownership accepted in
    [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md#product-media).
56. **Exact product-search technology and slug policy** — not selected as part of
    [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md).
57. **Exact allergen approval workflow and dietary compliance-review workflow** — within the
    dietary and allergen metadata ownership accepted in
    [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md#dietary-and-allergen-information).
58. **Exact free-text customer-instruction length limits and unsafe-content handling** — within the
    free-text instruction boundary accepted in
    [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md#free-text-customer-instructions).
59. **Exact bundle-upgrade pricing, and whether configurable bundles are required for the initial
    launch** — bundle-upgrade pricing is governed by the Pricing module, per
    [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md); configurable-bundle
    support for the initial launch is **Provisional**, dependent on the confirmed launch menu, per
    [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md#standard-products-and-bundles).
60. **Exact local-product proposal workflow, menu preview workflow, publication approval workflow,
    localization implementation, and visibility-policy configuration** — within the boundaries
    accepted in
    [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md#explicit-non-decisions).
61. **Final GST classification, rate, and input-tax-credit treatment** — BOBA Bear's initial
    restaurant-service profile is provisionally 5% GST without input tax credit, per
    [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#provisional-restaurant-service-profile);
    this remains subject to validation against official GST sources, BOBA Bear's GST registration,
    legal entity, place of supply, invoice model, and accountant or GST-adviser approval before
    commercial launch.
62. **Exact decimal-arithmetic library and rounding mode** — within the mandatory decimal-arithmetic
    and integer-paise requirements accepted in
    [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#currency-and-monetary-representation).
63. **Packaging-charge tax category, exact V1 packaging amount, and packaging calculation basis** —
    within the explicit-packaging-charge requirement accepted in
    [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#packaging-charges).
64. **Delivery-charge tax category and exact delivery-pricing and subsidy policy** — within the
    delivery-charge/provider-cost separation accepted in
    [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#delivery-charge-and-provider-cost).
65. **Merchandise tax categories** — not resolved by [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md),
    which governs food and beverage direct-order pricing and tax only.
66. **Exact launch promotion compatibility matrix, promotion-reservation timeout, and quote-validity
    period** — within the promotion-compatibility and immutable-quote model accepted in
    [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#promotion-compatibility).
67. **Exact franchise pricing authority and franchise promotion authority** — within the price-book
    hierarchy and promotion-funding boundaries accepted in
    [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#price-book-hierarchy) and
    [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#promotion-funding-and-authority).
68. **Exact cancellation policy, refund eligibility, refund limits, approval thresholds, and
    delivery-refund policy** — within the refund-allocation requirements accepted in
    [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#cancellation-and-refund-allocation).
69. **Exact invoice-number sequence, invoice template, and credit-note workflow** — within the
    invoice boundary accepted in
    [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#invoice-and-credit-note-boundary).
70. **Exact tax-policy approval workflow and price-book database schema and publication
    implementation** — within the administration-authority and price-book model accepted in
    [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md).
71. **Cashfree production approval** — merchant onboarding, legal-entity and GST/bank-account
    verification, commercial pricing, contract terms, data-processing terms, and actual transaction
    success rates, within the launch-validation boundary accepted in
    [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md#production-approval-conditions).
72. **Exact Cashfree API version and SDK/REST-client implementation** — within the
    provider-implementation-detail boundary accepted in
    [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md#provider-selection-and-launch-validation-boundary).
73. **Exact payment-intent expiry, provider-order expiry, and late-success grace period** — within
    the payment-expiry and late-success model accepted in
    [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md#payment-expiry) and
    [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md#late-payment-success).
74. **Exact automatic-refund cases, duplicate-success refund timing, refund approval limits, and
    refund approval roles** — within the conservative V1 refund-authority model accepted in
    [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md#automatic-versus-manual-refunds).
75. **Exact reconciliation cadence, polling backoff, and maximum polling duration** — within the
    reconciliation and polling model accepted in
    [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md#scheduled-payment-reconciliation).
76. **Exact settlement-import method and dispute workflow** — within the settlement and dispute
    ingestion model accepted in
    [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md#settlement-records) and
    [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md#disputes-and-chargebacks).
77. **Exact webhook payload-retention period and payment-data retention/masking rules** — pending a
    dedicated privacy and data-retention architecture slice, within the data-minimization boundary
    accepted in
    [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md#payment-data-minimization).
78. **Exact credential rotation procedure and fallback-provider timing** — within the credential
    and provider-neutrality boundaries accepted in
    [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md#credential-and-webhook-secret-controls).
79. **Exact dispatch lead time and automatic-versus-manual dispatch policy by provider** — within the
    preparation-aware dispatch-timing principle accepted in
    [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#dispatch-timing).
80. **Exact pickup-verification method, pickup-code length, and expiry** — within the pickup-code
    model accepted in
    [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#pickup-verification).
81. **Exact proof-of-delivery policy and delivery-OTP length, expiry, and fallback** — within the
    provider-neutral proof-of-delivery model accepted in
    [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#provider-neutral-proof-of-delivery)
    and
    [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#delivery-otp).
82. **Exact customer-unavailable contact attempts, waiting duration, and return and disposal
    procedure** — within the customer-unavailable and return workflows accepted in
    [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#customer-unavailable-workflow)
    and
    [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#return-workflow).
83. **Exact provider-cost variance tolerance and manual-cost approval threshold** — within the
    delivery-cost-reconciliation model accepted in
    [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#delivery-cost-reconciliation).
84. **Exact provider-specific callback contracts, signature-verification models, and claim
    workflows** — within the provider-neutral callback and claims boundaries accepted in
    [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#provider-callbacks-and-webhooks)
    and
    [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#provider-claims).
85. **Meta production approval of BOBA Bear's WhatsApp Business Account, exact Graph API version,
    exact V1 template set and wording, exact launch locales, exact retry counts and intervals, and
    exact channel-fallback matrix** — within the provider-selection and production-validation
    boundary accepted in
    [ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#provider-selection-and-production-validation-boundary)
    and the full explicit non-decisions list in
    [ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#explicit-non-decisions).
86. **Exact persistence package versions and tooling implementation** — the exact PostgreSQL image
    patch version or digest for local development and CI, the exact Drizzle ORM, Drizzle Kit,
    node-postgres, Better Auth, and Testcontainers versions and their configuration, the exact
    migration-runner wrapper, and the exact non-transactional-DDL tooling support, within the
    approved-stack and implementation-detail boundary accepted in
    [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#approved-stack-and-implementation-detail-boundary).
    Every such detail must be pinned against current official vendor documentation at implementation
    time rather than assumed from this documentation set.
87. **Exact database roles, grants, connection-pool sizes, and connection budget** — the precise
    `GRANT` and `REVOKE` statements for the runtime, migration, read-only, and administrative roles,
    the web and worker pool sizes, the database plan sizing, and the approved connection budget,
    within the least-privilege role model and connection-budget requirement accepted in
    [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#database-roles) and
    [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#connection-budget). Related to
    the instance- and database-sizing item 22 above.
88. **Exact database timeout values, retry parameters, and outbox tuning** — the connection-
    acquisition, statement, lock, idle-in-transaction, migration, worker-lease, and worker-claim
    timeout values, the bounded retry counts, backoff, and jitter for `40001`/`40P01` handling, and
    the outbox claim batch size and lease duration, within the timeout, retry, and claiming model
    accepted in
    [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#database-timeouts),
    [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#deadlock-and-serialization-handling),
    and [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#outbox-claiming). The exact
    workflows that require `SERIALIZABLE` isolation also remain open.
89. **Exact idempotency-retention periods, logical-backup schedule and retention, and restore-drill
    cadence** — within the retention, backup, and restore-validation requirements accepted in
    [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#idempotency-retention),
    [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#backup-and-recovery), and
    [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#restore-validation). The exact
    audit and provider-payload retention periods remain open under items 68 and 77 above, pending a
    dedicated privacy and data-retention decision.
90. **Exact PostgreSQL extension adoption, database observability configuration, and static-menu
    catalog import mechanism** — whether PostGIS is adopted for the Dehradun service zones (related
    to item 6 above) and whether `pg_trgm` is adopted for catalog search, the database observability
    provider and slow-query threshold (related to item 28 above), the automated schema-drift-detection
    tooling, the database-per-worker test-isolation implementation, and the controlled workflow by
    which the existing `data/menu.json` static menu is imported into the platform catalog, within the
    extension, observability, drift, testing, and seed-data boundaries accepted in
    [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#postgresql-extensions),
    [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#database-observability),
    [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#schema-drift-policy), and
    [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md#seed-data-policy).
91. **Exact Zod version, Route Handler helper APIs, and Better Auth catch-all route** — the specific
    Zod 4 release, the concrete Route Handler helper utilities, and the exact `/api/auth/[...
    better-auth]` route implementation, within the boundary accepted in
    [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md#explicit-non-decisions).
92. **Exact Problem Details URI host and stable error-code catalog completeness** — the concrete
    `https://errors.thebobabear.in/...` host and the full set of stable error codes beyond the
    illustrative examples accepted in
    [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md#error-contract).
93. **Exact CSRF token mechanics and trusted-proxy configuration** — the concrete synchronizer-token
    implementation and the DigitalOcean trusted-proxy header configuration, within the boundaries
    accepted in
    [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md#csrf-protection) and
    [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md#trusted-origin-and-proxy-handling).
94. **Exact rate-limit algorithms, thresholds, storage schema, and failure behaviour** — within the
    layered, PostgreSQL-backed rate-limiting model accepted in
    [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md#rate-limiting).
95. **Exact request-size limits and idempotency-key syntax and length** — within the body-size-policy
    and `Idempotency-Key` boundaries accepted in
    [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md#content-types-and-request-sizes)
    and
    [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md#idempotency).
96. **Exact `If-Match` endpoint coverage, cursor encoding, and default/maximum page sizes** — within
    the optimistic-concurrency and cursor-pagination models accepted in
    [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md#optimistic-http-concurrency)
    and
    [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md#pagination).
97. **Exact public catalog caching and revalidation policy** — within the caching boundary accepted
    in
    [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md#caching).
98. **Exact client-side query/cache library and client retry policy values** — within the typed-client
    boundary accepted in
    [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md#typed-client-api).
99. **Exact observability SDK, OpenAPI version, and contract-generation tooling** — within the
    correlation and contract-documentation boundaries accepted in
    [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md#request-and-trace-context) and
    [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md#contract-documentation).
100. **Exact security-header and Content-Security-Policy configuration** — within the boundary
     accepted in
     [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md#security-headers).
101. **Exact upload-authorization and media-scanning mechanism** — within the media-handling boundary
     accepted in
     [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md#media-handling).
102. **Exact health-endpoint response shape** — within the health-endpoint boundary accepted in
     [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md#health-endpoints).
103. **Exact API deprecation and sunset policy** — within the versioning boundary accepted in
     [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md#api-versioning).
104. **Native-client authentication over the HTTP API** — how a future native Android or iOS client
     authenticates against `/api/v1`, deferred alongside native-client timing itself (item 16 above),
     within the boundary accepted in
     [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md#explicitly-deferred-capabilities).
105. **Exact environment-variable names and configuration file structure** — the concrete
     `BOBA_APP_ENV`-style variable names, `.env`/schema file layout, and configuration-group file
     names, within the central configuration boundary and application-environment model accepted in
     [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md#central-configuration-boundary)
     and
     [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md#application-environments).
106. **Exact Zod configuration-schema package version and process-specific schema definitions** —
     within the configuration-validation and process-specific-configuration boundaries accepted in
     [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md#configuration-validation)
     and
     [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md#process-specific-configuration).
107. **Exact runtime public-configuration mechanism** — whether environment-specific browser values
     are served through server-rendered values, typed Server Component props, or a same-origin
     public-configuration endpoint, within the public-runtime-configuration boundary accepted in
     [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md#public-runtime-configuration).
108. **Exact DigitalOcean bindable-variable usage and credential-reference syntax** — within the
     DigitalOcean variable-scope and credential-reference boundaries accepted in
     [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md#digitalocean-variable-scopes)
     and
     [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md#credential-references).
109. **Exact feature-flag and kill-switch cache duration and invalidation mechanism** — within the
     bounded in-process caching model accepted in
     [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md#configuration-and-flag-caching).
110. **Exact feature-flag lifecycle state names** — within the `DRAFT`/`ACTIVE`/`ROLLED_OUT`/`RETIRED`
     lifecycle model accepted in
     [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md#feature-flag-lifecycle).
111. **Exact secret-rotation runbooks and developer secret-distribution mechanism** — the
     provider-specific rotation procedures and how developers obtain local secret values, within the
     rotation-sequence and local-environment boundaries accepted in
     [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md#secret-rotation) and
     [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md#local-and-test-environment-policy).
112. **Exact production-safeguard detection rules** — the concrete checks that detect a development
     bypass, placeholder secret, or unsafe production configuration, within the mandatory-but-
     unspecified safeguard boundary accepted in
     [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md#production-safeguards).
113. **Exact admin configuration UX, approval thresholds, and feature-flag administration
     permissions** — within the authority-separation and registered-operational-configuration
     boundaries accepted in
     [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md#authority-separation) and
     [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md#registered-operational-configuration).
114. **Exact redaction library, configuration-inventory tooling, and readiness-response shape** —
     within the redaction, configuration-inventory, and readiness boundaries accepted in
     [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md#redaction-requirements),
     [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md#configuration-inventory),
     and
     [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md#liveness-and-readiness).
115. **External secret-manager adoption point** — when, if ever, BOBA Bear adopts an external secret
     manager behind the credential-reference boundary accepted in
     [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md#secret-classification-and-storage).
116. **Exact authorization database schema, table names, hierarchy-storage model,
     scope-inheritance representation, and permission catalog** — the concrete persistence and
     permission-identifier design within the scoped-RBAC model accepted in
     [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#permission-model).
117. **Exact authorization-cache implementation and cache-invalidation mechanism** — within the
     permission-evaluation boundary accepted in
     [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#permission-evaluation-sequence).
118. **Exact refund approval limits and monetary delegation limits** — the concrete thresholds
     within the delegated-administration boundary accepted in
     [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#delegated-administration)
     and the refund-authority cross-reference in
     [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#cross-reference-adr-009-payment-account-and-refund-authority).
119. **Exact guest-order tracking model** — how an unauthenticated or one-time order is tracked
     without a customer account, within the customer-authorization boundary accepted in
     [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#customer-authorization).
120. **Exact break-glass approval workflow, break-glass technical implementation, and
     support-access approval process** — the concrete procedures within the narrowly-scoped,
     time-limited, and audited access boundaries accepted in
     [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#break-glass-access) and
     [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#support-access).
121. **Exact selective PostgreSQL RLS usage scope** — which tables, if any, adopt Row-Level
     Security as defence-in-depth, within the deferred-by-default position accepted in
     [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#postgresql-row-level-security-position)
     and [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md).
122. **Custom-role timing and customer-impersonation design** — when, if ever, custom
     franchise-created roles are reconsidered, and the design of any workforce
     customer-impersonation capability, both rejected or deferred in
     [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#rejected-or-deferred-alternatives).

## How to use this list

An open decision should be resolved by:

1. Recording the decision in [`decision-register.md`](./decision-register.md) with status
   **Locked** (or **Provisional**, if it is a working assumption rather than a firm commitment).
2. Updating the relevant canonical document(s) to reflect the resolved decision.
3. Removing the corresponding item from the open-decisions list above, or marking it resolved with
   a pointer to the decision register row.

This follows the [documentation update protocol](./README.md#documentation-update-protocol) in the
index document.

## Related documents

- [`v1-product-scope.md`](./v1-product-scope.md) — the release scope these open decisions do not block, because V1 does not depend on resolving most of them.
- [`operating-model.md`](./operating-model.md) — Stage 1 in operational detail.
- [ADR-002](./decisions/ADR-002-environments-ci-cd-release-model.md) — the accepted environment, CI/CD, release, migration, secrets, and rollback decision behind several resolved and open items above.
- [ADR-003](./decisions/ADR-003-modular-monolith-node-typescript.md) — the accepted modular-monolith architecture, Node.js/TypeScript backend, repository structure, and module-boundary decision behind several resolved and open items above.
- [ADR-004](./decisions/ADR-004-identity-authentication-sessions.md) — the accepted identity, authentication, session, verification, MFA, invitation, and recovery decision behind several resolved and open items above.
- [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md) — the accepted organization, outlet, and business-authorization decision behind the franchise-authority, refund-limit, break-glass, and RLS items above.
- [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md) — the accepted food-catalog, menu, assortment, and availability decision behind the catalog-schema, identifier, revision, media, search, and localization items above.
- [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md) — the accepted pricing, tax, charge, and promotion decision behind the GST-validation, rounding, packaging, delivery-pricing, franchise-pricing-authority, refund, and invoice items above.
- [ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md) — the accepted serviceability, service-zone, outlet-resolution, cart, checkout-orchestration, and pre-payment-order decision behind the service-zone-persistence, geocoding-provider, cart/quote/checkout-lifetime, and same-outlet-merge items above.
- [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md) — the accepted payment-provider, payment-execution, webhook, refund, and reconciliation decision behind the Cashfree production-approval, payment/refund-expiry, reconciliation-cadence, settlement-import, and fallback-provider items above.
- [ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md) — the accepted order-lifecycle, outlet-acceptance, Operations Console, cancellation, exception, and customer-tracking decision behind the timer-threshold, cancellation-policy, refund-policy, preparation-estimate, public-order-number, realtime-transport, notification, and manual-completion-authority items above.
- [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md) — the accepted delivery-provider abstraction, operating-mode, dispatch, courier-assignment, pickup-verification, proof-of-delivery, and delivery-cost-reconciliation decision behind the provider-selection, dispatch-lead-time, pickup-verification, proof-of-delivery, customer-unavailable/return, cost-variance, and provider-callback items above.
- [ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md) — the accepted notifications, WhatsApp, and assisted-commerce decision behind the WhatsApp-capability, Meta-production-approval, template, locale, retry, and channel-fallback items above.
- [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md) — the accepted PostgreSQL and Drizzle persistence decision behind the resolved migration-framework/ORM and queue-technology items, and behind the persistence version, grant, pool-size, timeout, retry, retention, backup, observability, extension, and catalog-import items above.
- [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md) — the accepted HTTP API, Route Handler, validation, error-contract, CSRF, CORS, rate-limiting, idempotency, concurrency, pagination, caching, correlation, webhook, and health-check decision behind the resolved API-style-and-versioning item and the Zod-version, Route-Handler-helper, Problem-Details-host, CSRF-mechanics, trusted-proxy, rate-limit, request-size, idempotency-key, `If-Match`-coverage, cursor-encoding, page-size, caching, client-library, observability, OpenAPI, security-header, upload, health-response, deprecation-policy, and native-client-authentication items above.
- [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md) — the accepted configuration, secrets, environment-validation, operational-configuration, feature-flag, kill-switch, startup-validation, readiness, and configuration-audit decision behind the resolved configuration-and-secrets item and the environment-variable-name, schema-implementation, public-runtime-config, cache-duration, secret-distribution, rotation-runbook, production-safeguard, admin-UX, redaction-library, readiness-shape, and external-secret-manager items above.
- [`organization-outlet-access-model.md`](./organization-outlet-access-model.md) — the franchise-related open decisions in structural context.
- [`order-payment-delivery-model.md`](./order-payment-delivery-model.md) — the payment- and delivery-provider open decisions in structural context.
- [`decision-register.md`](./decision-register.md) — the structured, dated record of every decision referenced above.
