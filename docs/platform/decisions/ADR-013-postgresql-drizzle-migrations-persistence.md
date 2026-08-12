---
Status: Accepted
Decision date: 2026-08-02
Last updated: 2026-08-02
---

# ADR-013: Persistence, PostgreSQL, and Drizzle

## Status

Accepted

## Decision Date

2026-08-02

## Decision Owners

BOBA Bear founder and product leadership

## Context

Twelve accepted architecture decision records already depend on a relational database that nobody
has yet specified in concrete terms. [ADR-001](./ADR-001-digitalocean-platform.md) selected
DigitalOcean Managed PostgreSQL in Bangalore as the platform's transactional database and
DigitalOcean Spaces as its object store, without fixing a major version, an access-control model, a
connection-pooling model, or a backup-validation practice.
[ADR-002](./ADR-002-environments-ci-cd-release-model.md#migration-strategy) locked immutable,
repository-controlled migrations, a serialized pre-deployment migration job, an expand-and-contract
evolution pattern, and the rejection of routine down-migrations — but explicitly left "the exact
migration framework and ORM" open.
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#database-ownership) locked one PostgreSQL
database for the modular monolith, exactly one owning module per table, and the rule that other
modules read through the owner's application interface rather than writing to its tables; it also
locked a mandatory [transactional outbox](./ADR-003-modular-monolith-node-typescript.md#transactional-outbox)
and [idempotent inbound-event processing](./ADR-003-modular-monolith-node-typescript.md#inbound-event-idempotency)
while leaving "queue and polling technology" and the "exact inbox or event-record implementation"
open, and left separate schemas per module as an open implementation choice.
[ADR-004](./ADR-004-identity-authentication-sessions.md) selected Better Auth, self-hosted, with
authentication data in BOBA Bear's own PostgreSQL database, and left its schema mapping open.
[ADR-005](./ADR-005-organization-outlet-authorization.md#repository-and-data-scoping-rules) locked
scoped repositories and trusted server-side resource resolution as the primary V1 data-boundary
mechanism, and
[deferred PostgreSQL Row-Level Security](./ADR-005-organization-outlet-authorization.md#postgresql-row-level-security-position)
as a selective defence-in-depth option rather than the primary authorization layer.
[ADR-007](./ADR-007-pricing-tax-charges-promotions.md#currency-and-monetary-representation) locked
integer minor-unit monetary representation and forbade floating-point money.
[ADR-008](./ADR-008-serviceability-cart-checkout.md#optimistic-cart-concurrency) locked optimistic
cart concurrency, idempotent cart mutations, and checkout idempotency without fixing how any of
those are stored. [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#durable-provider-event-record),
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#durable-provider-event-records), and
[ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md#durable-provider-event-record) each
require a durable, deduplicated provider-event record and each assume the transactional outbox
already exists as a real, claimable, retryable store.
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#optimistic-concurrency) locked optimistic
concurrency and command idempotency for operational commands.

The result is a documented platform whose most load-bearing shared mechanism — the database itself —
is the least specified. This ADR closes that gap. It fixes the persistence stack, the database
version policy, the schema and ownership model, the source-of-truth model for schema change, naming
and type conventions (identifiers, time, money, business state), constraint, foreign-key, index, and
JSONB policy, deletion and lifecycle policy, repository and raw-SQL rules, the transaction,
isolation, retry, and optimistic-concurrency model, the migration tooling and deployment workflow,
database roles and connection pooling, the concrete PostgreSQL-backed transactional outbox and shared
idempotency store, the shared provider-event and audit storage conventions, the integration-test
strategy, schema-drift and backup/restore policy, observability, and the capabilities explicitly
deferred.

This ADR is a documentation-only architecture decision. It does not add application code, schema
files, migrations, seed scripts, Docker services, a migration runner, repository implementations, or
tests, and it does not install or pin any dependency. Nothing described here is built by this
decision; everything described here is what a future implementation slice must build against.

### A note on current database and tooling-capability assumptions

This ADR references PostgreSQL, DigitalOcean Managed PostgreSQL, Drizzle ORM, Drizzle Kit,
node-postgres, Better Auth, and Testcontainers capabilities as officially documented **as of this
decision's date**. Exact package versions, exact image patch levels and digests, exact provider plan
names, exact configuration option names, and exact command syntax are implementation detail that
changes over time with each project's own release cycle. This ADR does not pin a version, reproduce
vendor documentation, or fabricate specific numbers, and every such detail must be re-verified at
implementation time against current official sources — postgresql.org, digitalocean.com/docs,
orm.drizzle.team, node-postgres.com, better-auth.com, and the official Testcontainers documentation —
never against blogs, community tutorials, unofficial benchmarks, AI-generated summaries, or
third-party comparison pages. Where this ADR names a capability (for example, a built-in UUIDv7
generation function, a pooler pool mode, or a migration-history check command), the architecture
decision is the *requirement*; the exact syntax that satisfies it is implementation-pinned.

## Approved-Stack and Implementation-Detail Boundary

This ADR distinguishes three categories of content, and no reader should collapse them:

1. **Locked persistence architecture** — the stack selection, database version policy, schema and
   ownership model, source-of-truth model, type and naming conventions, constraint/index/JSONB
   policy, repository and transaction rules, migration workflow and deployment discipline, role and
   pooling model, outbox and idempotency persistence, provider-event and audit storage conventions,
   test strategy, drift policy, and backup/restore requirements. These are approved and final.
2. **Open implementation detail** — exact package versions, image digests, `GRANT` statements, pool
   sizes, timeout values, retry counts, retention periods, backup schedules, and drill cadences.
   These are deliberately left open so they can be set against measured behaviour rather than guessed
   here. See [Explicit Non-Decisions](#explicit-non-decisions).
3. **Explicitly deferred capabilities** — Redis, external queues, CDC, event sourcing,
   database-per-module, database-per-tenant, read replicas, sharding, partitioning, broad Row-Level
   Security, and the rest of the list in
   [Explicitly Deferred Capabilities](#explicitly-deferred-capabilities). These must not be built as
   part of V1 work.

A reader must not treat an open item as answered, and must not treat a deferred capability as
merely unbuilt-but-approved.

## Decision Summary

> BOBA Bear persists all transactional platform data in a single DigitalOcean Managed PostgreSQL 18
> database, accessed through Drizzle ORM over node-postgres, with schema change flowing exclusively
> through reviewed, committed SQL migrations generated by Drizzle Kit. Concerns are separated by
> explicit PostgreSQL schemas (`auth`, `app`, `platform`, `drizzle`), every table has exactly one
> owning module, and durable asynchronous work and cross-cutting idempotency are implemented on
> PostgreSQL itself — no Redis, RabbitMQ, Kafka, or external queue is introduced for V1.

```text
Drizzle TypeScript schema definitions  (desired state, in code)
        ↓  drizzle-kit generate
Committed SQL migrations               (authorized transition history, in Git)
        ↓  reviewed, then applied by the serialized migration job (ADR-002)
Deployed PostgreSQL 18 database        (must match applied migration history)
        ↓
Runtime access via PgBouncer transaction-mode pool → node-postgres pools → Drizzle → module repositories
        ↓
platform.outbox_events  (claimed with FOR UPDATE SKIP LOCKED by the background worker)
        ↓
External side effects (payments, delivery, WhatsApp, email) — always after commit, never inside a transaction
```

The approved stack is **DigitalOcean Managed PostgreSQL 18, Standard Edition**, with PostgreSQL 18
used identically across local development, CI, staging, and production; **Drizzle ORM** as the
primary persistence toolkit; **node-postgres** as the driver; **Drizzle Kit** for versioned SQL
migration generation and migration-history management; the **Better Auth Drizzle adapter** for
authentication persistence, version-pinned at implementation; and **Testcontainers with PostgreSQL
18** for persistence integration tests. Runtime traffic reaches the database through DigitalOcean's
managed **PgBouncer pool in transaction mode**; migrations, administrative tasks, logical backups,
and restores use **direct PostgreSQL connections**. The transactional outbox required by
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#transactional-outbox) and assumed by
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md),
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md), and
[ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md) is fixed here as a
**PostgreSQL-backed table claimed with `SELECT ... FOR UPDATE SKIP LOCKED`**, and the idempotency
guarantees required by
[ADR-008](./ADR-008-serviceability-cart-checkout.md#checkout-and-order-idempotency),
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#refund-idempotency), and
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#command-idempotency) are fixed here as a
**shared PostgreSQL idempotency table whose uniqueness constraint is the final concurrency
authority**.

This is an accepted, final decision for BOBA Bear's persistence architecture — not a proposal, not a
technology evaluation, and not an invitation to re-compare ORMs. It does not fix exact versions,
grants, pool sizes, timeouts, retry parameters, retention periods, backup schedules, or the PostGIS
adoption decision — see [Explicit Non-Decisions](#explicit-non-decisions).

## Approved Persistence Stack

| Concern | Approved choice |
| --- | --- |
| Managed database | DigitalOcean Managed PostgreSQL, Standard Edition for initial production, per [ADR-001](./ADR-001-digitalocean-platform.md) |
| Database engine | PostgreSQL 18, identical major version in local, CI, staging, and production |
| Persistence toolkit | Drizzle ORM |
| Driver | node-postgres |
| Migration tooling | Drizzle Kit, generating versioned SQL migration files |
| Authentication persistence | Better Auth's Drizzle adapter, version-pinned at implementation, per [ADR-004](./ADR-004-identity-authentication-sessions.md) |
| Persistence integration tests | Testcontainers with PostgreSQL 18 |
| Runtime pooling | DigitalOcean's managed PgBouncer pool in transaction mode |
| Migration, admin, backup, restore | Direct PostgreSQL connections, never the transaction-mode pool |
| Durable asynchronous work | PostgreSQL-backed transactional outbox |
| Cross-cutting idempotency | PostgreSQL-backed idempotency records |
| External queue or broker | None in V1 — no Redis, RabbitMQ, Kafka, or managed queue service |

## Database Version Policy

PostgreSQL 18 is the initial major version, and the **same major version runs in every environment**:
a developer's container, CI, staging, and production. Beta and release-candidate builds are never
used for any BOBA Bear environment. A major-version upgrade is a separate, tested operational change
with its own plan, staging rehearsal, and rollback position — never a side effect of a routine
release, and never introduced by changing a container tag. DigitalOcean's Standard Edition tier is
the approved starting point for production; whether a higher tier is later warranted is a capacity
decision, not a persistence-architecture decision. The exact patch version and image digest used for
local development and CI remain open and must be pinned at implementation time, consistent with the
immutable-artifact discipline already locked in
[ADR-002](./ADR-002-environments-ci-cd-release-model.md#immutable-artifact-model).

## Drizzle's Role and Boundaries

Drizzle is **a typed query toolkit, a schema-definition system, a transaction API, and a SQL
migration-generation tool**. It is deliberately nothing more than that.

Drizzle is **not**:

```text
The domain model                      → domain types are owned by each module, per ADR-003
The authorization layer               → authorization is Access Control's, per ADR-005
A substitute for database constraints → invariants live in the database, see Database Constraints
A substitute for reviewed SQL         → generated SQL is reviewed, see Migration Tooling and Workflow
A reason to hide module ownership     → every table has one owner, see Module Table Ownership
A reason to avoid Postgres features   → SKIP LOCKED, partial indexes, and ON CONFLICT are first-class
```

Drizzle schema definitions must never become a shared "data layer" that other modules import in
order to reach into another module's tables. Persistence code is infrastructure, and it obeys the
dependency direction already locked in
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#dependency-rules): domain and application
code declare ports; infrastructure implements them; a module's schema and repositories live inside
that module's own `infrastructure` layer and are reached only through the module's public interface,
per [ADR-003](./ADR-003-modular-monolith-node-typescript.md#module-structure). A generated type from
Drizzle is a row shape, not a domain entity; repositories map between the two, per
[Repository Rules](#repository-rules).

## Alternatives Not Selected

These are recorded for completeness. This ADR does not reopen or re-evaluate them, and a future
change of mind requires a superseding ADR, not a discussion in a pull request.

- **Prisma** — not selected. BOBA Bear's persistence needs are constraint-heavy and lock-aware:
  named check constraints, partial unique indexes, hand-written corrective migrations, explicit row
  locking, `FOR UPDATE SKIP LOCKED` outbox claiming, and provider-event deduplication through
  `ON CONFLICT`. The platform prefers direct, SQL-oriented control over exactly those mechanisms.
- **Kysely** — not selected as the primary persistence toolkit.
- **Raw node-postgres only** — not selected as the primary approach. Parameterized raw SQL remains
  explicitly allowed through controlled infrastructure boundaries, per
  [Raw SQL Policy](#raw-sql-policy); it is simply not the default way BOBA Bear expresses ordinary
  queries and schema.
- **Database per module** — deferred; see
  [Explicitly Deferred Capabilities](#explicitly-deferred-capabilities).
- **Database per tenant** — deferred.

## One Database, Explicit Schemas

The modular monolith uses **one PostgreSQL database**, per
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#database-ownership), with concerns separated
by explicit PostgreSQL schemas rather than by naming convention alone:

```text
auth       → Better Auth-owned authentication persistence
app        → BOBA Bear business domain tables
platform   → shared technical infrastructure tables
drizzle    → migration metadata
```

**`auth`** holds Better Auth's own tables — identity records, linked accounts, sessions,
verification records, MFA/TOTP data, and any auth plugin tables — under the Identity-module boundary
locked in [ADR-004](./ADR-004-identity-authentication-sessions.md). Placing Better Auth's tables in a
non-`public` PostgreSQL schema through its Drizzle adapter is **an implementation assumption that
must be validated empirically at implementation time**; the decision recorded here is the separation
of authentication persistence from business persistence, and if the adapter cannot be configured to a
custom schema, that separation is achieved by another approved means rather than by abandoning it.
The `auth` schema is *never* the
source of business authorization: role assignments, memberships, permissions, and scopes belong to
Access Control in `app`, per
[ADR-005](./ADR-005-organization-outlet-authorization.md#authentication-and-authorization-separation).
Nothing outside the Identity module writes to `auth`.

**`app`** holds BOBA Bear's business domain tables: customers, organizations and outlets, access
control, catalog, pricing, availability, serviceability, cart, checkout, orders, payments,
operations, delivery, notifications, and audit. **Module ownership inside `app` is enforced by
architecture and code review, not by one PostgreSQL schema per module.** Splitting `app` into a
dozen schemas would add operational friction (grants, search paths, cross-schema joins, migration
noise) without adding any guarantee that module-boundary enforcement and repository discipline do
not already provide.

**`platform`** holds shared technical infrastructure: the transactional outbox, shared idempotency
records, worker leases, and shared technical metadata. It is deliberately narrow. **Provider
business records stay owned by their modules** — Payments' provider events live in `app` under
Payments, not in `platform`, even though every provider-event table follows the same shared
convention, per [Provider-Event Storage](#provider-event-storage).

**`drizzle`** holds migration metadata only. No application code reads or writes it; it belongs to
the migration tooling.

**No BOBA Bear application table is created in `public`.** Production privileges should be
configured so that no runtime or migration role can create objects freely in `public`; the exact
`GRANT`/`REVOKE` statements that achieve this remain open, per
[Database Roles](#database-roles) and [Explicit Non-Decisions](#explicit-non-decisions).

## Module Table Ownership

Every table in the database has **exactly one owning module**, extending the ownership rule locked
in [ADR-003](./ADR-003-modular-monolith-node-typescript.md#database-ownership) to the concrete
schema layout above. The rules:

- The owning module owns all writes to its tables.
- Cross-module direct writes are prohibited — no module issues an `INSERT`, `UPDATE`, or `DELETE`
  against another module's table under any circumstance.
- A cross-module read requires an approved application contract on the owning module (a use case or
  query interface exposed through its `index.ts`), not an ad hoc join written from the outside.
- Shared technical tables (outbox, idempotency, worker leases) belong to the **platform
  infrastructure boundary**, not to whichever module happens to write to them most.
- Authentication tables remain under the Identity/Better Auth boundary and are never treated as a
  general-purpose user table for business queries.

Two anti-patterns are explicitly rejected. First, **a generic "shared persistence" or "core data"
module that owns unrelated business tables** — ownership must follow the domain, not convenience.
Second, **moving a module-owned table into `platform` merely because several modules reference it** —
being widely read is not shared ownership; it is a signal that the owning module needs a clear read
contract.

## Source-of-Truth Model

Three artifacts are related but not interchangeable, and confusing them is the most common way a
database drifts:

```text
Drizzle TypeScript schema definitions  →  the desired state
Committed SQL migrations               →  the authorized transition history
The deployed database                  →  must match the applied migration history
```

**Reviewed, committed SQL migrations are the only authorized mechanism for changing a shared
database.** Three consequences follow, and all three are binding:

1. Changing a TypeScript schema definition alone does not change any database. It expresses intent;
   a generated, reviewed, committed migration enacts it.
2. A manual change applied directly to a database never becomes canonical merely by existing in an
   environment. Reality diverging from history is drift, not a new source of truth — see
   [Schema-Drift Policy](#schema-drift-policy).
3. The deployed database's applied-migration history must match the repository's committed
   migrations. A mismatch is a release-blocking condition, not a warning.

This is the persistence-layer expression of the same principle already locked in
[ADR-002](./ADR-002-environments-ci-cd-release-model.md#migration-strategy): migrations are
immutable, repository-controlled, and serialized.

## Recommended Repository Structure

The following is the **target** structure for a future implementation slice, expressed within the
`src/` layout already locked in
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#target-source-structure). None of it is
built by this ADR.

```text
src/shared/database/
    connection            → pool construction, runtime vs direct connection strings
    transaction           → the application transaction abstraction
    errors                → PostgreSQL error-code mapping to safe internal errors
    types                 → shared column helpers and type utilities
    schema                → re-export of module schemas, for tooling only

src/modules/<module>/infrastructure/database/
    schema                → the module's own Drizzle table definitions
    repository            → the module's repositories
    queries               → purpose-specific read queries
    mappings              → row ↔ domain type mapping

db/migrations/            → canonical, committed SQL migrations
db/seeds/                 → separated reference, development, and test seed data
db/backfills/             → versioned, restartable data-backfill scripts
db/scripts/               → operational database scripts
drizzle.config.ts         → Drizzle Kit configuration
```

**Modules own their schema files.** The shared schema re-export exists so migration tooling can see
every table in one place; it is a *tooling aggregation point, not an ownership location*, and a table
defined under a module does not become shared merely by appearing in that re-export. Repositories
stay module-owned and module-scoped. A generic `BaseRepository`, or any shared abstraction offering
unrestricted CRUD across arbitrary tables, is rejected — see [Repository Rules](#repository-rules).

## Naming Conventions

Database identifiers use `snake_case`; TypeScript properties use `camelCase`, with the mapping
handled in the schema definition and repository layer rather than by scattering conversions through
application code. Table names are plural. Constraints and significant indexes are **explicitly
named**, never left to the database's default naming, so that migrations, error messages, and
operational queries all refer to the same stable identifier.

Illustrative table names:

```text
app.orders
app.order_items
app.payment_attempts
app.delivery_requests
platform.outbox_events
platform.idempotency_records
auth.sessions
```

Illustrative constraint names:

```text
orders_customer_id_fk
orders_public_number_uk
orders_status_ck
payment_attempts_provider_payment_id_uk
```

Avoid: mixed-case quoted identifiers; unexplained abbreviations; generic column names such as
`data`, `value`, or `type` without a qualifying context (`payload_type` and `event_type` are fine,
a bare `type` is not); provider names embedded in general domain tables (an order table has no
`cashfree_` columns — provider detail belongs in provider-scoped tables per
[External Provider Identifiers](#external-provider-identifiers)); and environment names embedded in
table names (`orders_staging` is never correct — environments are separated by database, per
[ADR-002](./ADR-002-environments-ci-cd-release-model.md#environment-model)).

Exact final table, column, and constraint names are subject to implementation review; the
conventions above are what that review enforces.

## Primary Identifiers

BOBA Bear-owned entities use **PostgreSQL UUID primary keys, generated as UUIDv7 by default** — for
example, `id uuid primary key default uuidv7()`. UUIDv7's time-ordered prefix keeps index locality
close to a sequential key while retaining the non-enumerable, globally unique properties the platform
needs for public references and cross-system correlation. Built-in UUIDv7 generation is documented
as an official PostgreSQL 18 UUID function as of this decision's date; **the exact function name and
signature must nonetheless be re-verified against official PostgreSQL documentation at
implementation time**, and if built-in generation is unavailable in the deployed version, an
equivalent approved generation mechanism is used without changing the `uuid`-typed, time-ordered
decision itself.

This applies to, at minimum: customers, organizations, legal entities, territories, outlets, catalog
entities, carts, checkout sessions, orders, payment intents and attempts, refunds, fulfilment
workflows, delivery requests, notification requests, operational exceptions, outbox events, and
idempotency records.

**Link-table exception.** A pure relationship table with no independent lifecycle, no public
reference, and no audit identity of its own may use a composite primary key over its foreign keys
instead of a surrogate UUID. If the relationship acquires its own lifecycle (its own states,
timestamps, or audit history), it is no longer a pure link table and takes a UUID.

**A UUID primary key never replaces required business uniqueness.** Natural keys and business
invariants are enforced with explicit unique constraints — a UUID guarantees only that two rows are
distinct, not that the business rule they encode is satisfied. Likewise, **public order and invoice
numbers, and external provider identifiers, remain separate columns from the internal UUID**: the
public order number is a customer-facing identifier governed by
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#public-order-number), and provider
identifiers are governed by [External Provider Identifiers](#external-provider-identifiers). An
internal UUID is never exposed as the public reference, and a public reference is never used as the
primary key.

## External Provider Identifiers

Identifiers issued by Cashfree, a delivery provider, Meta/WhatsApp, or any other external system are
stored in **text-compatible columns**, never coerced into `uuid` or a numeric type, and never used as
a BOBA Bear primary key. This extends the identifier separation already locked in
[ADR-006](./ADR-006-food-catalog-assortment-availability.md) for catalog external IDs to every
provider integration.

Uniqueness for an external identifier is scoped by, at minimum:

```text
provider + provider_account_id + environment + external_object_id
```

Global uniqueness must **never** be assumed. The same identifier value can legitimately recur across
sandbox and production, across multiple merchant accounts, delivery accounts, or WhatsApp Business
Accounts, across different providers, and across different legal entities. A uniqueness constraint
that omits provider account or environment will eventually collide or, worse, silently link a staging
record to a production one — precisely the cross-environment contamination
[ADR-002](./ADR-002-environments-ci-cd-release-model.md#environment-model) forbids.

External identifiers are also **never used directly as authorization credentials**. Knowing a
provider payment identifier, delivery task identifier, or WhatsApp message identifier grants no
access to anything, consistent with
[ADR-005](./ADR-005-organization-outlet-authorization.md#customer-authorization). Exact column
lengths and any provider-specific format validation remain open.

## Time and Date Types

Every column recording a **real-world instant** uses `timestamptz`. This includes at minimum:
`created_at` and `updated_at`; order confirmation, payment, acceptance, pickup, and delivery times;
expiry times for quotes, carts, checkout sessions, OTPs, and idempotency records; the distinction
between a provider event's *occurrence* time and BOBA Bear's *receipt* time; and consent grant and
withdrawal times.

Rules:

- Stored instants are treated as UTC. Presentation-layer conversion to a business-local time is a
  display concern, never a storage concern.
- **The database's `now()` is the authoritative timestamp for persistence.** Application-supplied
  clocks are used only where the value has independent business meaning.
- A provider's reported occurrence time is preserved **separately** from BOBA Bear's receipt time,
  per the durable provider-event conventions in
  [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#durable-provider-event-record),
  [ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#durable-provider-event-records), and
  [ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md#durable-provider-event-record).
  Neither overwrites the other.
- **Browser-supplied timestamps are never authoritative**, consistent with the browser-result
  boundary locked in
  [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#browser-result-boundary).
- Instants are never stored as unzoned strings or as `timestamp without time zone`.
- Where a business-local interpretation is required, an **IANA timezone identifier** is stored
  alongside the data, never a fixed UTC offset.

**Business-local recurring schedules are a distinct case.** An outlet's recurring opening hours or a
menu's daypart schedule, per
[ADR-006](./ADR-006-food-catalog-assortment-availability.md), express "every day at 09:00 local",
not "every day at one fixed UTC instant". These are modelled as a local date/time plus an IANA
timezone identifier plus effective-from/effective-to dates, so a daylight-saving or policy change
does not silently shift an outlet's hours.

## Monetary Persistence

Final monetary amounts are stored as **integer paise in `bigint`**, implementing the integer
minor-unit representation locked in
[ADR-007](./ADR-007-pricing-tax-charges-promotions.md#currency-and-monetary-representation). This
applies to item, line, discount, tax, packaging, delivery-charge, refund, settlement, and
messaging-cost amounts alike.

- TypeScript's `bigint` requires **explicit DTO serialization** at API boundaries; it is never
  implicitly coerced, and monetary values are never exposed as raw JavaScript numbers anywhere
  precision could be lost, consistent with the DTO boundary in
  [ADR-003](./ADR-003-modular-monolith-node-typescript.md#dto-and-api-boundaries).
- **Rates and intermediate precision use `numeric`** — tax rates, discount percentages, allocation
  ratios, and provider fee rates. `real`, `double precision`, and JavaScript floating-point
  arithmetic are prohibited for any authoritative financial calculation, per ADR-007's rounding and
  allocation rules.
- Exact `numeric` precision and scale per column remain open and are set at implementation review.

## Business State Columns

**Native PostgreSQL enum types are not the default representation for business lifecycle states.**
The approved representation is a `text` column with a named `CHECK` constraint enumerating the
permitted values — for example:

```text
status text not null
constraint orders_status_ck check (status in ( ... ))
```

Reasons, in order of weight:

- The permitted set is still enforced by the database, not merely by the application.
- Every change to the permitted set appears explicitly in migration history as a readable constraint
  change.
- Expanding a state set is a controlled, reviewable migration rather than a type alteration with its
  own operational characteristics.
- Data repair and backfill are simpler against `text` than against a native enum's ordinal
  representation.
- The schema is not coupled to native-enum value-removal behaviour: PostgreSQL documents that
  existing enum values cannot be removed, and that their sort ordering cannot be changed, short of
  dropping and re-creating the type — materially more awkward than replacing a check constraint.

**Reference tables remain appropriate** for administrator-managed business data — a list of
territories, tax policies, or delivery-provider configurations that operators maintain — as distinct
from code-defined lifecycle states, which are part of the application's own logic and belong in a
check constraint.

The **actual state values** for each lifecycle are governed by their owning ADRs, not by this one:
commercial order and fulfilment states by
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#commercial-order-lifecycle), payment-intent
and payment-attempt states by
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#payment-intent-lifecycle), delivery
states by
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#normalized-delivery-lifecycle),
notification states by
[ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md#notification-lifecycle), and cart and
checkout states by [ADR-008](./ADR-008-serviceability-cart-checkout.md#cart-lifecycle). This ADR
fixes only how they are stored.

## Database Constraints

Structural invariants are enforced **in the database**, mandatorily. Application validation is a
usability and error-messaging layer, not the guarantee. Required constraint mechanisms:

- Primary keys on every table.
- Unique constraints for every business-natural key (public order number, provider payment
  identifier within its provider/account/environment scope, and so on).
- Foreign keys for real structural relationships, per [Foreign-Key Policy](#foreign-key-policy).
- `NOT NULL` wherever a value is genuinely required.
- Named `CHECK` constraints for value sets, valid ranges, non-negative quantities, and non-negative
  monetary amounts.
- Partial unique indexes for conditional uniqueness — for example, at most one active record of a
  kind per parent.
- Exclusion constraints where a genuine overlap invariant justifies one.
- Provider-event uniqueness, per [Provider-Event Storage](#provider-event-storage).
- Idempotency uniqueness, per [Idempotency Acquisition](#idempotency-acquisition).

**"The application checks it" is never sufficient** for an invariant whose violation would corrupt
commercial, payment, or fulfilment data.

Equally, **not every rule belongs in a check constraint.** Dynamic, cross-table, time-dependent, or
policy-driven rules — promotion eligibility, cancellation eligibility, scope-based authorization —
are enforced by some combination of application use-case validation, an explicit transaction, a row
lock, a supporting unique constraint, a coordinated repository query, and a human review workflow.
Attempting to encode all of them as constraints produces a schema that is both unreadable and
impossible to evolve.

## Foreign-Key Policy

Foreign keys are used for **real structural relationships**: order → customer, order → outlet, cart →
customer, checkout → cart, payment intent → order, refund → payment, fulfilment → order, delivery
request → order, and notification request → customer and related resource.

Rules:

- **Index foreign-key columns** that are used for lookup, filtering, or joining. An unindexed FK
  column is a predictable source of slow queries and lock contention.
- **Name FK constraints explicitly**, per [Naming Conventions](#naming-conventions).
- **Avoid broad cross-module cascading deletion.** Prefer `RESTRICT` or `NO ACTION` across module
  boundaries; a delete that silently propagates through another module's data violates the ownership
  rule in [Module Table Ownership](#module-table-ownership).
- `CASCADE` is permitted only for tightly owned dependent records with no independent lifecycle — an
  order's line items, a cart's lines — and only within the owning module.
- **Never cascade-delete** orders, payments, refunds, delivery records, provider events, or audit
  history. These are historical and financial records, and their destruction is not a routine
  operation, consistent with the historical-immutability rule in
  [ADR-010](./ADR-010-order-lifecycle-operations-console.md#historical-immutability).
- **Snapshot records must remain interpretable** when the records they reference become inactive,
  retired, or archived. An order's catalog and pricing snapshots, per
  [ADR-006](./ADR-006-food-catalog-assortment-availability.md) and
  [ADR-007](./ADR-007-pricing-tax-charges-promotions.md#immutable-order-monetary-snapshots), carry
  their own copied values precisely so a later catalog change cannot rewrite history; an FK to the
  current record is a convenience, never the source of the snapshot's meaning.

Exact `ON DELETE` and `ON UPDATE` actions require table-by-table review at implementation time.

## Index Policy

Indexes are added because a **specific access pattern justifies them**, and each one is justified by
at least one of: a known query pattern; queue claiming; a uniqueness requirement; operational-state
filtering; expiry processing; sorting; scope filtering (customer, outlet, organization, territory);
or reconciliation.

Illustrative patterns:

```text
orders            (customer_id, created_at desc)      → a customer's order history
orders            (outlet_id, fulfilment_status)      → the Operations Console queue
payment_attempts  (payment_intent_id, created_at)     → attempt history for an intent
delivery_requests (order_id)                          → delivery lookup by order
```

The outbox claim index is a partial index, because only pending rows are ever claimed:

```sql
create index outbox_events_pending_idx
  on platform.outbox_events (available_at, id)
  where status = 'PENDING';
```

**Speculative indexing is rejected.** Indexing every column, or every plausible filter, imposes real
storage cost, write amplification, migration duration, vacuum and maintenance overhead, and
operational surface area. Index requirements are validated against **actual query plans** at
implementation time, not assumed from the schema alone. An index that cannot be tied to a real
access pattern is removed.

## JSONB Policy

`jsonb` is used **only** for data that is genuinely variable, provider-specific, externally shaped,
snapshot-oriented, rarely queried by its internal fields, or a versioned event payload. Approved uses:

```text
Provider webhook payloads (raw, as received)
Provider error metadata
Outbox event payloads
Audit metadata
Rendered notification metadata
Pricing/calculation explanation detail
Variable operational context on an exception record
```

`jsonb` is **never** used in place of a structured column for: order, payment, or delivery status;
an amount or currency; a customer or outlet identifier; an authorization scope; a queue timestamp; an
idempotency key; a provider account; or any field that appears in a common query predicate. If a
field is filtered, joined, sorted, or constrained on, it is a column.

Additional rules:

- Any field important enough to search is promoted to a normal column, indexed per
  [Index Policy](#index-policy).
- Every JSON payload carries an explicit **schema version or event version**, so consumers can
  evolve safely — see [Outbox Payload Policy](#outbox-payload-policy).
- **Secrets are prohibited in JSON payloads** — no tokens, OTPs, webhook secrets, or payment
  credentials, consistent with
  [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#payment-data-minimization) and
  [ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md#customer-data-minimization).
- Payloads containing sensitive customer data require an explicit retention and access policy.
- Large retained payloads may later be moved to DigitalOcean Spaces, per
  [ADR-001](./ADR-001-digitalocean-platform.md), with the database retaining a reference — the same
  pattern already approved for catalog media and inbound WhatsApp media.

## Deletion, Archival, and Lifecycle

**There is no generic `deleted_at` column on every table.** A blanket soft-delete flag hides
meaningfully different business situations behind one ambiguous field and quietly breaks every query
that forgets to filter it.

Instead, lifecycle is expressed with **explicit, meaningful concepts**: `archived_at`, `disabled_at`,
`revoked_at`, `closed_at`, an explicit business lifecycle state (per
[Business State Columns](#business-state-columns)), or a retention-specific purge process. Each says
what actually happened.

**Hard deletion** is permitted only for records that are all of: ephemeral; carrying no audit
requirement; carrying no commercial or financial requirement; not referenced by immutable history;
and permitted to be deleted by the applicable privacy and retention policy.

**Never hard-deleted, and never generically soft-deleted**, are: historical orders; payments;
refunds; settlement evidence; delivery events; provider events; audit records; consent evidence; and
immutable snapshots. These follow the historical-immutability rules already locked in
[ADR-006](./ADR-006-food-catalog-assortment-availability.md),
[ADR-007](./ADR-007-pricing-tax-charges-promotions.md#original-order-immutability),
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md), and
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#historical-immutability).

Exact retention periods and any anonymization policy remain open, pending a dedicated privacy and
data-retention decision.

## Creation and Update Timestamps

Mutable records generally carry:

```text
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

The **application explicitly sets `updated_at`** as part of each update, alongside the optimistic
version increment described in [Optimistic Concurrency](#optimistic-concurrency). There is **no
single global trigger** auto-updating `updated_at` across every table: a hidden, universal trigger
obscures which code actually changed a row, interacts awkwardly with backfills, and makes
concurrency behaviour harder to reason about.

Append-only records — outbox events, provider events, audit records, timeline entries — may not need
`updated_at` at all, since they are not updated in the ordinary sense; where they carry processing
state, that state's own timestamps are explicit and named.

A narrowly justified trigger is not forbidden outright, but requires a **separately reviewed
migration and a documented invariant** explaining what it guarantees and why application code cannot.

## Repository Rules

A repository:

- **Belongs to exactly one module** and lives in that module's `infrastructure/database` layer.
- **Enforces module ownership** — it never writes to another module's tables.
- Uses **parameterized Drizzle queries** or parameterized SQL, per
  [Raw SQL Policy](#raw-sql-policy).
- **Returns application or domain types**, not raw database rows. Row shapes stay inside
  infrastructure.
- **Applies customer, outlet, organization, and territory scope** derived from trusted server-side
  context, per
  [ADR-005](./ADR-005-organization-outlet-authorization.md#repository-and-data-scoping-rules) — never
  from client input.
- **Exposes purpose-specific operations**, named for what the business is doing.
- **Accepts an explicit transaction context** where it participates in one, per
  [Transaction Abstraction](#transaction-abstraction).
- **Avoids unrestricted generic filter APIs.**

Preferred method shapes:

```text
findCartForUpdate
saveOrderTransition
claimPendingOutboxEvents
findCustomerOrders
reservePromotionRedemption
findPaymentIntentForUpdate
```

Rejected method shapes:

```text
getByAnyFilter
updateAnyFields
deleteAnything
executeArbitraryQuery
```

**No generic base repository.** A shared `BaseRepository<T>` offering `findAll`, `updateById`, and
`deleteById` across every table erases the ownership, scoping, and locking discipline that the rest
of this ADR depends on, and turns every table into an unrestricted CRUD surface.

## Raw SQL Policy

Parameterized raw SQL is **explicitly allowed** where Drizzle's abstractions are insufficient or
where using them would obscure critical PostgreSQL behaviour. Legitimate cases include:

```text
SELECT ... FOR UPDATE / FOR UPDATE SKIP LOCKED
Partial index definitions
Custom constraint definitions
Complex reporting or aggregation queries
Optimized batch operations
PostgreSQL function invocation
Advisory locks
Custom migration steps
Provider-event conflict handling (INSERT ... ON CONFLICT)
```

Every raw statement must be: **parameterized** (never assembled by concatenating untrusted values);
**scoped to the infrastructure layer** of its owning module; **named and documented** so its purpose
is discoverable; **reviewed**; **tested** against real PostgreSQL per
[PostgreSQL Integration-Test Strategy](#postgresql-integration-test-strategy); and **consistent with
module ownership** per [Module Table Ownership](#module-table-ownership).

Raw SQL is **not permission to bypass repository boundaries**. It is a tool for expressing a query
precisely, inside a repository, not a route around one.

## Transaction Abstraction

Transactions use Drizzle's transaction API over node-postgres, wrapped in an **explicit application
transaction abstraction** — conceptually:

```text
transaction.run(async (tx) => {
    // repositories participate by receiving tx explicitly
})
```

This abstraction is **not implemented by this ADR**; it is the shape a future implementation slice
must build. The binding rules:

- **All statements in one transaction share the same checked-out client.** A transaction that
  silently spans two connections is not a transaction.
- **Transaction context is passed explicitly** to every participating repository. Ambient or
  implicitly-discovered transaction context is rejected.
- **Repositories must not silently create an independent transaction** when an outer transaction is
  required. Doing so produces work that commits or rolls back separately from the business
  transaction it was meant to be part of.
- **Transaction creation is not hidden inside every repository method.** A repository method that
  always opens its own transaction cannot participate in a larger one.
- **Never wait for user input inside a transaction.** Customer confirmation is a separate step, per
  [ADR-008](./ADR-008-serviceability-cart-checkout.md#explicit-customer-confirmation).
- **Never call an external provider inside a transaction** — no payment, delivery, WhatsApp, email,
  or any other provider call while a transaction is open. This is the persistence-layer statement of
  the outbox rule already locked in
  [ADR-003](./ADR-003-modular-monolith-node-typescript.md#transactional-outbox),
  [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#webhook-processing-transaction),
  [ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#provider-event-processing-transaction),
  and
  [ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md#transactional-outbox-boundary), and
  of the internal-transaction-boundary rule in
  [ADR-008](./ADR-008-serviceability-cart-checkout.md#internal-transaction-boundary-before-provider-call).
- **Transactions stay bounded and short.** Long transactions hold locks, block vacuum, and consume
  pool capacity.
- **Outbox events are inserted in the same transaction as the business state change** they describe.
  That atomicity is the entire point of the pattern.

## Transaction Isolation

**`READ COMMITTED` is the default isolation level** for BOBA Bear's transactions. Most invariants are
protected not by a stronger isolation level but by explicit mechanisms: row locks (`FOR UPDATE`),
unique constraints, check constraints, optimistic concurrency, and idempotency records.

Illustrative workflows protected this way:

```text
Cart conversion at checkout
Checkout confirmation
Payment-success acceptance
Refund balance validation
Promotion redemption reservation
Order acceptance by an outlet
Delivery handoff
Notification deduplication
Idempotency-record acquisition
```

**`SERIALIZABLE` is reserved** for specific workflows where simpler locking and constraints cannot
safely preserve an invariant — typically where the invariant depends on a predicate over rows that
do not yet exist. Which workflows those are remains open and is determined at implementation time
against real behaviour, not assumed here.

Where `SERIALIZABLE` is used, **serialization-failure retry** must: retry the *complete* transaction,
not a fragment; use a bounded number of attempts; apply jitter to avoid synchronized retry storms;
preserve the same external idempotency context across attempts so a retry cannot produce a second
business outcome; **never repeat an external side effect** (there are none inside a transaction, per
[Transaction Abstraction](#transaction-abstraction)); and surface a safe failure to the caller once
attempts are exhausted, rather than retrying indefinitely.

## Deadlock and Serialization Handling

Bounded, jittered retry is applied to exactly two PostgreSQL error conditions:

```text
40001  serialization_failure
40P01  deadlock_detected
```

Deadlocks are prevented, not merely retried, by: **deterministic lock ordering** (rows are always
locked in a consistent, documented order — for example, by identifier); short transactions; indexed
lock-selection queries, so locking a row does not require scanning many; avoiding broad locking
scans; never holding a lock while calling a provider; and avoiding unnecessary nested transactions.

**Blind retry is prohibited** for: unique-constraint violations; check-constraint violations;
foreign-key violations; invalid state transitions; authorization failures; permanent provider
failures; and validation failures. Retrying these produces the same failure with extra load and, in
the worst case, masks a genuine data or logic defect. Exact retry attempt counts, base delays, and
jitter parameters remain open.

## Optimistic Concurrency

Mutable aggregate roots carry a version column:

```text
version bigint not null default 1
```

Updates use an expected-version predicate, conceptually:

```sql
update app.orders
   set ..., version = version + 1, updated_at = now()
 where id = $1
   and version = $2;
```

**Zero updated rows means a concurrency conflict**, not a missing row — the caller must re-read and
either retry against fresh state or surface a conflict to the user. This implements, at the
persistence layer, the optimistic concurrency already locked for carts in
[ADR-008](./ADR-008-serviceability-cart-checkout.md#optimistic-cart-concurrency) and for operational
commands in [ADR-010](./ADR-010-order-lifecycle-operations-console.md#optimistic-concurrency).

Likely aggregate roots: cart, checkout session, order, fulfilment, payment intent, refund, delivery
request, support conversation, and operational exception.

**Version columns are not added to immutable, append-only records** — outbox events, provider events,
audit records, and timeline entries — unless a specific field on them is genuinely independently
mutable (for example, an outbox event's processing state, which is instead protected by claim leases
per [Outbox Claiming](#outbox-claiming)).

## Migration Tooling and Workflow

Migrations are generated by **Drizzle Kit** from Drizzle schema definitions, reviewed as SQL,
supplemented with custom SQL where required, applied by a controlled migration runner, and validated
for migration-history consistency using Drizzle Kit's history-checking capability. The canonical
location is `db/migrations/`; migration metadata lives in the `drizzle` schema.

The approved developer workflow:

1. Change the module's Drizzle schema definition.
2. Generate a **named** migration with Drizzle Kit.
3. **Review the generated SQL** in full.
4. Edit or supplement the migration where the generator's output is insufficient — custom
   constraints, partial indexes, data transformations, or a safer statement ordering.
5. Run the migration-history consistency validation.
6. Apply the migration to a **clean local database** from empty.
7. Apply the migration to a **populated database restored from the current released schema**, to
   test the upgrade path rather than only the greenfield path.
8. Run persistence and application tests.
9. **Commit the schema change and the migration together**, in one change set.

Binding rules:

- **Generated SQL is never accepted without review.** The generator proposes; the engineer decides.
- **Every migration is meaningfully named** — a name that says what it does, not a bare timestamp.
- **Applied migrations are immutable**, per
  [ADR-002](./ADR-002-environments-ci-cd-release-model.md#migration-strategy).
- **Never edit an applied migration to repair production.** Create a new, forward corrective
  migration.
- **Never reorder migration history.**
- **Never delete migration metadata** to "fix" a mismatch.
- **Never reconstruct a manual production change from memory afterwards.** If an emergency change was
  made, its exact SQL was recorded at the time, per [Schema-Drift Policy](#schema-drift-policy).

## Push-Command Policy

Drizzle Kit's `push` command applies a schema diff directly to a database without producing a
reviewable migration file. **This restriction is BOBA Bear policy, not a vendor limitation** — the
tool itself is documented as suitable for a range of workflows. BOBA Bear prohibits it because it
would bypass the reviewed-migration source-of-truth rule in
[Source-of-Truth Model](#source-of-truth-model) and the immutable-migration requirement in
[ADR-002](./ADR-002-environments-ci-cd-release-model.md#migration-strategy). It is **prohibited**
against:

```text
The CI canonical schema
Any shared development database
Staging
Production
Any release-validation database
```

It may be used **only against a disposable, personal, local scratch database** during exploration.
Anything retained beyond that experiment must be re-expressed as a committed, reviewed SQL migration
before it can reach any shared environment. **`push` is never used to repair schema drift** — drift
is repaired by a forward corrective migration, per [Schema-Drift Policy](#schema-drift-policy).

## Migration Deployment

Migrations are applied by the **serialized pre-deployment migration job** already locked in
[ADR-002](./ADR-002-environments-ci-cd-release-model.md#migration-strategy) and
[ADR-002](./ADR-002-environments-ci-cd-release-model.md#deployment-concurrency). This ADR fixes its
persistence-layer requirements:

```text
Acquire an advisory lock (or equivalent serialization)
        ↓
Validate migration history against the repository
        ↓
Apply pending migrations
        ↓
Verify the resulting schema state
        ↓
Release the lock
        ↓
Deploy the compatible web and worker processes
```

- A **dedicated migration database role** is used — never the runtime role, never the DigitalOcean
  default administrative account. See [Database Roles](#database-roles).
- Migrations connect **directly to PostgreSQL**, not through the transaction-mode PgBouncer pool.
- **Only one migration runner may execute at a time** per environment, enforced by an advisory lock
  or equivalent.
- A **failed migration fails the deployment**. Incompatible application code must never start after
  a migration failure.
- The release record retains the image digest, the migration identity applied, and the outcome, per
  [ADR-002](./ADR-002-environments-ci-cd-release-model.md#immutable-artifact-model).
- **Destructive down-migrations are never run automatically**, consistent with ADR-002's rejection
  of routine down-migrations as a rollback mechanism.

The exact migration-runner wrapper implementation remains open.

## Expand-and-Contract Evolution

Schema evolution follows the expand-and-contract pattern locked in
[ADR-002](./ADR-002-environments-ci-cd-release-model.md#migration-strategy), stated here in
persistence terms:

**Expand** — add a nullable column, a new compatible table, or a new index; add support for a new
state value; introduce dual read/write where justified. Both the old and new application versions
work.

**Migrate** — backfill data, validate it, monitor the process, then migrate readers and writers to
the new shape.

**Contract** — stop using the old field, tighten the constraint (for example, `NOT NULL` once the
backfill is complete and verified), and drop the old index or column **in a later deployment**.

**All three phases must not be combined into one release** whenever old and new application versions
may overlap during a rolling deployment — which, under
[ADR-002](./ADR-002-environments-ci-cd-release-model.md#deployment-concurrency), is the normal case.

## Transactional and Non-Transactional DDL

Migrations run **transactionally by default**, so a failure leaves no partially applied schema
change.

Any step that must run outside a transaction requires, before it is approved: a documented reason;
a lock analysis (what it locks, and for how long); a runtime-impact analysis; a timeout strategy;
a restart and recovery procedure if it fails partway; evidence from a staging execution against
representative data volume; explicit production approval; and post-execution verification.

The exact implementation and wrapper syntax for non-transactional steps remains open.

## Data Migrations and Backfills

**Schema migrations** carry data changes only when the change is small, bounded, deterministic, and
fast: required reference-data updates, constraint preparation, and simple in-place transforms.

**Versioned backfill scripts under `db/backfills/`** handle everything larger: large
transformations, long-running updates, provider data imports, the eventual migration of the existing
static menu, bulk customer or order processing, and large snapshot recalculations.

Backfill scripts require: **batching**; **checkpoints** so progress survives interruption;
**restartability**; **idempotency** so a rerun does not double-apply; **progress reporting**; a
**dry-run mode** where useful; an **audit record** of what ran, when, and with what outcome;
**bounded transaction sizes**; and an **explicit completion verification** step rather than an
assumption of success.

Two prohibitions: **no external API calls inside a schema migration**, and **no unbounded table
update during a production deployment** without a separately reviewed plan.

## Seed-Data Policy

Six categories of data are kept strictly separate and never conflated:

```text
Schema migrations          → structure only
Required reference data    → business data the platform cannot start without
Development fixtures       → local convenience data
Test fixtures              → deterministic per-test data
Demo data                  → sales/demo environments only
Production business data   → entered through the application by real operators
```

Production reference seeds must be **versioned, idempotent, reviewed, environment-aware, and
explicitly executed** — never applied as an implicit side effect of a schema migration.

**No fake customers, payments, orders, or demo data may ever appear in a production migration or
seed.**

The existing static menu in this repository (`data/menu.json`) should eventually move into the
platform through a **controlled catalog import or seed workflow** governed by
[ADR-006](./ADR-006-food-catalog-assortment-availability.md). The exact import mechanism is not
decided here and remains open.

## Database Roles

Four distinct roles, each with the narrowest privileges its job requires:

| Role | Purpose and limits |
| --- | --- |
| **Runtime** | `SELECT`, `INSERT`, `UPDATE`, approved `DELETE`, sequence access, and function execution on the approved schemas. **No** DDL, role or database creation, extension administration, migration administration, or unrestricted cross-schema privileges. |
| **Migration** | May create and alter approved schemas, tables, constraints, and indexes, and apply migrations. Used only by the pre-deployment migration job. |
| **Read-only** | Reserved for future reporting, support, and operational access. **Never** the main application role. |
| **Administrative** | Restricted to infrastructure, recovery, and emergency work. **Application processes must never use the DigitalOcean default administrative account.** |

The exact `GRANT` and `REVOKE` statements implementing each role remain open and must be written and
reviewed at implementation time. This role separation extends the least-privilege principle already
locked in [ADR-005](./ADR-005-organization-outlet-authorization.md) and the credential-scoping model
in [ADR-002](./ADR-002-environments-ci-cd-release-model.md#secrets-model) to database access itself.

## Runtime Connection Pooling

Runtime traffic reaches PostgreSQL through **DigitalOcean's managed PgBouncer pool in transaction
mode**, with **small node-postgres pools** inside each web and worker process behind it. Required
configuration:

- An **explicit total connection budget**, per [Connection Budget](#connection-budget).
- **Separate connection strings** for runtime (pooled) and direct administrative access, held as
  separate secrets per [ADR-002](./ADR-002-environments-ci-cd-release-model.md#secrets-model).
- **TLS validation** on every connection.
- Connection-acquisition, statement, lock, and idle-in-transaction **timeouts**, per
  [Database Timeouts](#database-timeouts).

**Transaction-mode pooling constrains what application code may assume.** A pooled connection is
returned to the pool at the end of each transaction, so application code must not rely on:

```text
Session-local state persisting across requests
Temporary tables persisting across transactions
Session-level advisory locks held across requests
SET values surviving between transactions
Named prepared statements requiring a stable backend session
```

Any of these may only be used if explicitly tested against the deployed pooler configuration and
documented as such. This constraint follows from how transaction-mode pooling works rather than from
any driver-level restriction — DigitalOcean's own pooling guidance directs applications that depend
on prepared statements or session-level features toward session mode instead. BOBA Bear's decision is
transaction mode plus code that does not depend on session state; adopting session mode instead would
be a separate capacity decision.

**Migrations, logical backups, restores, and administrative tasks use direct connections**, never the
transaction-mode pool. Exact pool sizes remain open.

## Connection Budget

The platform maintains an explicit, written connection budget:

```text
(web instances × web pool max)
  + (worker instances × worker pool max)
  + migration and administrative allowance
  ≤ approved database connection budget
```

Rules:

- **App Platform scaling must not silently exceed database capacity.** Adding instances changes the
  left-hand side of the equation, and the scaling configuration must be evaluated against it.
- **Web and worker pools are sized separately** — their concurrency profiles differ.
- **Migration and recovery connections are reserved**, so an incident never finds the database
  saturated by application traffic.
- **Pool wait time is observable**, per [Database Observability](#database-observability).
- The smallest available database plan must not be selected without first validating the expected
  connection count against it.

Exact plan sizing and exact pool sizes remain open, consistent with the capacity non-decisions in
[ADR-001](./ADR-001-digitalocean-platform.md).

## Transactional Outbox Persistence

[ADR-003](./ADR-003-modular-monolith-node-typescript.md#transactional-outbox) locked the transactional
outbox as mandatory; [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md),
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#notifications-boundary),
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md), and
[ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md#transactional-outbox-boundary) each
build on it. **This ADR is where it is concretely fixed at the persistence layer.**

**PostgreSQL is the V1 durable outbox.** No Redis, RabbitMQ, Kafka, external managed queue, or
change-data-capture pipeline is introduced for V1.

An outbox event record conceptually includes:

```text
id                  (uuid, UUIDv7)
owning_module
aggregate_type
aggregate_id
event_type
event_version
payload             (jsonb)
metadata / headers  (jsonb)
correlation_id
causation_id
occurred_at         (timestamptz)
available_at        (timestamptz)
status
attempt_count
lease_expires_at
lease_owner
last_error
published_at
created_at
```

Lifecycle:

```text
PENDING → PROCESSING → PUBLISHED
                    ↘  DEAD
```

**The business state change and its outbox event are inserted in the same transaction.** That is the
guarantee the entire pattern exists to provide, and no code path may weaken it.

## Outbox Claiming

Workers claim work with a **bounded, non-blocking claim query**:

```sql
select ...
  from platform.outbox_events
 where status = 'PENDING'
   and available_at <= now()
 order by available_at, id
   for update skip locked
 limit $1;
```

The approved process:

```text
Begin a short transaction
        ↓
Select a bounded batch with FOR UPDATE SKIP LOCKED
        ↓
Mark the batch PROCESSING with a lease owner and lease expiry
        ↓
Commit
        ↓
Execute downstream and external work OUTSIDE the claim transaction
        ↓
Mark success, or schedule a retry, in a later transaction
```

Rules:

- **Multiple workers must never process the same active claim concurrently.** `SKIP LOCKED` plus the
  lease is what guarantees this.
- **Stale `PROCESSING` leases are reclaimable** — a worker that crashes mid-flight must not strand
  its events forever.
- **Claim transactions stay short.** They exist only to take ownership.
- **No provider call occurs while claim locks are held**, per
  [Transaction Abstraction](#transaction-abstraction).
- **Batch size is configurable**, not hard-coded; the exact value remains open.

## Outbox Delivery Semantics

The outbox provides **at-least-once delivery, not exactly-once**, for external effects. This is a
deliberate, permanent property of the design, and every consumer is built accordingly:

- **Every consumer must be idempotent.**
- **Provider idempotency keys are used wherever the provider supports them**, per
  [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#refund-idempotency) and
  [ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#delivery-request-idempotency).
- **Duplicate delivery must be safe.** A crash after an external call succeeds but before the
  internal completion commits will cause a replay; that replay must not produce a second customer
  message, a second delivery booking, or a second refund.
- **Retry scheduling uses `available_at`**, so a failed event becomes eligible again later rather
  than being retried in a tight loop.
- **Poison events eventually reach `DEAD`** rather than retrying forever.
- **Manual replay of a `DEAD` event requires an explicit permission, a recorded reason, and an audit
  event**, consistent with the manual-action discipline in
  [ADR-005](./ADR-005-organization-outlet-authorization.md#v1-system-roles) and
  [ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md#review-and-manual-resend).
- **Outbox history supports operational investigation** — it is not deleted immediately on success.

**PostgreSQL polling remains authoritative.** `LISTEN`/`NOTIFY` may later be introduced purely as a
low-latency wake-up hint to reduce polling delay; it must never become the durable store, because it
provides no durability guarantee across a listener disconnect.

## Outbox Payload Policy

An outbox payload is **versioned, minimal, and stable**:

- It carries a **schema/event version**, so consumers can evolve independently.
- It carries **stable identifiers** and the **immutable values consumers genuinely need** — enough
  for the consumer to process the event idempotently without re-deriving context it cannot trust.
- It **avoids serializing an entire aggregate** without a specific justification.
- It **excludes credentials, OTPs, and payment secrets** outright, per
  [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#payment-data-minimization) and
  [ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md#payment-credential-prohibition).
- It **minimizes customer data**, per
  [ADR-005](./ADR-005-organization-outlet-authorization.md#customer-data-minimization).

Events therefore carry **references plus the necessary immutable fields**. A consumer must not assume
that mutable current state is unchanged when the event's meaning is historical: if a notification
must describe the order as it was at acceptance, the event carries those values; it does not
re-read the order and hope nothing moved, which is the failure mode
[ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md#semantic-ordering) already guards
against on the sending side.

## Shared Idempotency Persistence

Cross-cutting idempotency — the guarantee required by
[ADR-008](./ADR-008-serviceability-cart-checkout.md#checkout-and-order-idempotency),
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#refund-idempotency),
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#command-idempotency), and
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#delivery-request-idempotency) — is
implemented as a **shared PostgreSQL idempotency table** in the `platform` schema.

An idempotency record conceptually includes:

```text
id
scope                       (e.g. the module or bounded context)
operation                   (e.g. confirm-checkout, request-refund)
actor / customer / service scope
idempotency_key_hash
request_fingerprint
state
resource_type
resource_id
response_snapshot / reference   (safe to return, no sensitive data)
created_at
completed_at
expires_at
lease_expires_at
last_error_metadata             (safe, non-sensitive)
```

Lifecycle:

```text
IN_PROGRESS → COMPLETED
           ↘  FAILED_FINAL
           ↘  EXPIRED
```

These state names may be refined at implementation; the lifecycle they express may not.

## Idempotency Acquisition

**The database uniqueness constraint is the final concurrency authority** — not an application-level
check, not a distributed lock, not an in-memory guard. Uniqueness is enforced over:

```text
scope + operation + actor scope + idempotency_key_hash
```

Acquisition uses an atomic insert-or-conflict workflow built on PostgreSQL's `INSERT ... ON CONFLICT`
(exact clause and semantics to be confirmed against official PostgreSQL documentation at
implementation time). The required behaviours:

- **Same key, same request fingerprint** → the original result is returned; the operation does not
  run twice.
- **Same key, different request fingerprint** → the request fails. A reused key with different
  content is a client error, not a retry.
- **Concurrent identical requests** → at most one operation is performed, and at most one resource is
  created.
- **Abandoned `IN_PROGRESS` work is recoverable** through the lease policy, so a crashed request does
  not block its key forever.
- **Terminal business failures may be replayed consistently** — a request that legitimately failed
  returns the same failure, not a new attempt.
- **A temporary infrastructure failure must never be stored as a false success.** When in doubt, the
  record does not reach `COMPLETED`.
- **Keys may be stored hashed**, and sensitive request or response data is not retained in the
  record.

The exact table shape, hashing approach, and acquisition query remain open.

## Idempotency Retention

Retention varies by operation class, because the business risk of forgetting differs:

| Operation class | Retention posture |
| --- | --- |
| Cart mutation | Shorter |
| Checkout confirmation | Medium |
| Payment, refund, delivery booking | Longer |
| Provider events | Driven by provider, dispute, and audit needs |

**An expired record must not be removed while it is still required** for payment or refund
reconciliation, a delivery claim, a provider dispute, audit, legal retention, or a support
investigation — extending the reconciliation and dispute requirements in
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#refund-reconciliation) and
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#provider-claims). Exact retention
periods per operation remain open.

## Provider-Event Storage

[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#durable-provider-event-record),
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#durable-provider-event-records), and
[ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md#durable-provider-event-record) each
require a durable provider-event record. **This ADR fixes the shared persistence convention behind
all three.**

**Payments, Delivery, and Notifications each own a separate provider-event table.** There is **no
universal polymorphic event table** holding every provider's events for every module: a shared table
would blur module ownership, force lowest-common-denominator constraints, and make provider-specific
uniqueness impossible to express correctly.

The shared convention each table follows:

```text
provider
provider_account_id
environment
external_event_id
external_object_id
event_type
raw_payload (jsonb) or a Spaces reference
signature / authenticity verification result
provider_occurred_at   (timestamptz)
received_at            (timestamptz)
processing_state
processing_attempts
correlation_id
last_error
retention metadata
```

Rules:

- **Uniqueness is provider-specific and scoped by provider account and environment**, per
  [External Provider Identifiers](#external-provider-identifiers).
- **The provider's original status string is preserved** alongside BOBA Bear's normalized
  interpretation, per
  [ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#provider-status-normalization).
- Where a provider supplies **no stable event identifier**, a documented deterministic fingerprint is
  used for deduplication, and the fingerprint's definition is recorded rather than left implicit.
- **Module-owned processors retain business responsibility.** Shared storage shape does not mean
  shared processing: what a payment event *means* remains Payments' decision.
- **Payloads must exclude or protect sensitive information**, per
  [JSONB Policy](#jsonb-policy) and the data-minimization rules in ADR-009, ADR-011, and ADR-012.

## Audit Persistence

The general audit requirement is already locked in
[`architecture-foundation.md`](../architecture-foundation.md#audit-requirements) (D-031) and detailed
per module in [ADR-005](./ADR-005-organization-outlet-authorization.md#audit-requirements),
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#audit-requirements),
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#operational-audit-requirements),
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#audit-requirements), and
[ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md#audit-requirements). **This ADR fixes
the shared storage shape.**

Audit storage is **append-only**. A correction creates a **new** audit record explaining the
correction; an existing audit record is never overwritten, edited, or deleted.

An audit record conceptually includes:

```text
id                      (stable)
actor / service identity
actor scope
action
resource_type
resource_id
before / after summary  (where retention policy permits)
reason
correlation_id
occurred_at             (timestamptz)
source
retention_category
```

**Never stored in an audit record**: passwords or password hashes, login or delivery OTPs, TOTP
secrets, access tokens, webhook secrets, UPI PINs, card credentials, or full sensitive addresses —
unless a specific, approved requirement demands it and the retention policy explicitly covers it.
The exact audit schema and per-category retention remain open.

## PostgreSQL Integration-Test Strategy

Persistence integration tests run against **real PostgreSQL 18 provisioned by Testcontainers for
Node.js**, locally and in CI. This is the primary mechanism; official Testcontainers PostgreSQL
module support should be re-confirmed against current official documentation at implementation time.

**SQLite, PGlite, and in-memory fakes are not an authoritative substitute.** They cannot prove the
behaviours this architecture actually depends on:

```text
Row locking and FOR UPDATE SKIP LOCKED semantics
Partial index behaviour
Check-constraint enforcement
UUIDv7 column defaults
Transaction isolation behaviour
Advisory locks
Custom SQL correctness
PgBouncer transaction-mode compatibility
PostgreSQL error codes (23505, 40001, 40P01, ...)
```

They may be used for isolated experiments that make no claim to database-integration coverage. A
test suite that claims to verify outbox claiming, idempotency acquisition, or concurrency behaviour
must run against real PostgreSQL.

## Test Categories

| Category | Runs against | Covers |
| --- | --- | --- |
| **Unit** | No database | Domain logic, mapping functions, pure validation |
| **Repository** | Real PostgreSQL 18, real migrations | Row ↔ domain mapping, constraint enforcement, scoped queries |
| **Transaction** | Real PostgreSQL 18 | Rollback, concurrent update, row locks, isolation behaviour, retry, cross-repository participation in one transaction |
| **Migration** | Real PostgreSQL 18 | Empty-to-head, released-version-to-head, constraint and index verification, data-migration verification, history consistency |
| **Worker** | Real PostgreSQL 18 | Outbox claiming, concurrent claiming, lease recovery, retry, dead-lettering, idempotent duplicate processing |
| **End-to-end** | Staging application + staging PostgreSQL | Real process boundaries, provider sandboxes or approved fakes |

These sit inside the testing structure already locked in
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#testing-structure).

## Test Isolation

Each suite or parallel worker gets a **fresh database**, with migrations applied before tests run,
deterministic fixtures, safe parallel execution, and cleanup afterwards.

**Transaction-rollback isolation** (wrapping each test in a transaction that is rolled back) is
permitted **only** for tests that: use a single connection; do not test worker visibility; do not
require committed state; and do not test cross-connection concurrency.

Tests involving **outbox workers, multiple database clients, webhook processing, concurrent commands,
commit visibility, or provider-event processing must use genuinely committed data** and real database
isolation and cleanup — a rolled-back transaction is invisible to a second connection, which is
precisely what those tests need to observe.

The exact database-per-worker implementation remains open.

## CI Database Validation

The following CI checks are the **target** for a future implementation slice; none are built by this
ADR. They extend the credential-free pull-request validation already locked in
[ADR-002](./ADR-002-environments-ci-cd-release-model.md#pull-request-validation):

- Migration-history consistency check.
- Apply **all** migrations to an empty PostgreSQL 18 database.
- Verify there is **no uncommitted pending generated schema change** — that is, the committed
  migrations fully express the committed schema definitions.
- Repository integration tests.
- Transaction and concurrency tests.
- Outbox and idempotency tests.
- Required-constraint validation.
- Required-index validation.
- Application startup against the migrated schema.
- Detection of any modification to a previously committed migration file.

## Schema-Drift Policy

**Staging and production schemas change only through repository migrations.**

Manual production DDL is **prohibited**, with one narrow exception: emergency recovery. An emergency
change requires **all** of: an incident reference; an authorized actor; a record of the **exact SQL
executed**; before-and-after evidence; an **immediate corrective migration** bringing the repository
back into agreement with reality; a drift validation confirming agreement; and an audit record. A
change that skips any of these is drift, not recovery.

The deployment process should eventually verify: the applied migration list matches the expected
latest; there are no unknown entries in the applied history; there are no missing migrations; and no
historical migration file has been edited. The exact automated drift-detection tooling remains open.

## Backup and Recovery

**First layer: DigitalOcean's managed automated backups and point-in-time recovery** for the managed
PostgreSQL cluster, per [ADR-001](./ADR-001-digitalocean-platform.md). DigitalOcean documents
automated daily cluster backups with a bounded retention window and point-in-time recovery within
that window; **the exact retention window, recovery granularity, and any edition-specific
differences must be confirmed against current official DigitalOcean documentation** and configured
deliberately rather than assumed. Where BOBA Bear's own recovery-point objective exceeds the managed
window, the independent logical backup below is what closes the gap.

**Second layer: an independent logical backup**, required before broad public launch:

- Taken with `pg_dump` over a **direct** PostgreSQL connection — never through the transaction-mode
  PgBouncer pool.
- Using **restricted backup credentials**, distinct from the runtime role, per
  [Database Roles](#database-roles).
- Stored **encrypted in DigitalOcean Spaces**, per [ADR-001](./ADR-001-digitalocean-platform.md).
- With a **defined retention policy**.
- With **restore verification**, per [Restore Validation](#restore-validation).
- With **backup observability** — a silent backup failure is indistinguishable from no backup at all.

**Before any high-risk migration**, the following are required: verify managed-backup health; confirm
the recovery point; confirm backup storage; record the recovery steps that would be taken; test the
migration in staging against representative data; and validate the assumptions the restoration would
depend on.

The exact logical-backup schedule and retention remain open.

## Restore Validation

**A backup is not adequate until a restoration has been tested.** Before public launch, a restore
drill must:

1. Restore into a **separate** database or cluster.
2. Apply any migrations released after the backup's recovery point.
3. Start the application against the restored data.
4. Validate identity and session data; customer data; orders; payments; refunds; pricing snapshots;
   delivery records; notification records; outbox events; and idempotency records.
5. Record the measured recovery time and every finding.

**A restore drill must never overwrite the active source database.** The recurring drill cadence
after launch remains open.

## Database Observability

The following must be observable, extending the observability requirements in
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#operational-metrics-and-alerts),
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#operational-metrics),
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#metrics-and-alerts), and
[ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md#operational-metrics-and-alerts) to
the database itself:

```text
Active connections
PgBouncer pool utilization
Pool acquisition wait time
Query latency
Slow queries
Transaction duration
Idle-in-transaction connections
Lock waits
Deadlocks
Serialization retries
Constraint failures
CPU, memory, storage, and cache-hit ratio
Outbox pending count, oldest pending age, dead count
Idempotency conflicts
Migration duration
Backup status
Restore-test status
```

The exact observability provider remains open, consistent with the existing open decision.

## Query Logging

Production query logging records: the query or operation name; duration; owning module; correlation
identifier; and row count where useful.

It must **avoid**: raw credentials; OTPs; full payment data; full addresses; raw provider payloads;
and unrestricted logging of SQL parameters. This applies the data-minimization rules already locked
in [ADR-005](./ADR-005-organization-outlet-authorization.md#customer-data-minimization),
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#payment-data-minimization), and
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#customer-data-minimization) to database
logging specifically.

**Verbose development-mode ORM logging must not be enabled in production** without a deliberate,
reviewed decision — it is a straightforward route to logging exactly the data the rules above
prohibit. The exact slow-query threshold remains open.

## Database Timeouts

The following timeouts are required and observable:

```text
Connection acquisition
Statement
Lock
Idle in transaction
Migration
Worker lease
Worker claim
```

Principles:

- **A customer request must never leave indefinite database work running** behind it.
- **Reporting and analytical queries must not run through unrestricted customer transaction paths.**
- **A timed-out operation must never be treated as successful** without reconciliation — the same
  discipline already applied to provider timeouts in
  [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#timeout-recovery) and
  [ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#provider-timeout-recovery).

Exact timeout values remain open.

## PostgreSQL Extensions

**No extension is enabled by default.** An extension is enabled only when an approved capability
requires it, and every extension must be: supported by DigitalOcean Managed PostgreSQL; enabled
through a migration; version-reviewed; required by an approved feature (not enabled speculatively);
tested locally and in staging; and included in backup and restore validation.

Potential future candidates, neither approved here:

- **PostGIS** — for the polygon service zones described in
  [ADR-008](./ADR-008-serviceability-cart-checkout.md#explicit-service-zones). Whether the initial
  Dehradun serviceability implementation uses PostGIS or a simpler representation **remains open**.
- **`pg_trgm`** — for catalog search, if a future search capability requires it.

## Partitioning, Replicas, and Scaling

**No table partitioning is introduced without measured evidence** that it is needed. Plausible future
candidates, listed so the option is not forgotten: audit events, provider events, notification
attempts, order events, and outbox history.

**No read replica is introduced initially**, and customer-facing reads are not routed to a replica
before replication lag and its consistency implications are understood and measured — a customer
reading their own just-placed order from a lagging replica is a correctness problem, not a
performance optimization.

Deferred outright: sharding, multi-region writes, active-active PostgreSQL, database per module,
database per tenant, automated partition management, and read-replica routing.

## Row-Level Security Position

[ADR-005](./ADR-005-organization-outlet-authorization.md#postgresql-row-level-security-position)
(D-081) already deferred PostgreSQL Row-Level Security as a **selective defence-in-depth option**
rather than a rejected one. This ADR restates that position at the persistence layer and does not
change it.

The primary V1 authorization controls remain: application use-case authorization; scoped
repositories; explicit SQL predicates derived from trusted server context; database constraints; and
audit — per
[ADR-005](./ADR-005-organization-outlet-authorization.md#repository-and-data-scoping-rules).

Any future introduction of RLS must first validate: **PgBouncer transaction-mode compatibility**
(session-scoped role or context settings do not survive transaction pooling as one might assume);
background-worker context, which has no end-user identity; migration behaviour; administrative
access; incident-recovery access; and connection-context safety when a pooled connection is reused.
**No broad RLS is introduced by this ADR.**

## Required Future Tests

None of these exist yet. They are what a future implementation slice must deliver.

**Schema tests** — the approved schemas exist; no unintended tables exist in `public`; required
constraints exist; required indexes exist; foreign-key actions match
[Foreign-Key Policy](#foreign-key-policy); monetary columns use integer paise in `bigint`; rate
columns use appropriate `numeric` precision; real-world instants use `timestamptz`; UUIDv7 defaults
generate as expected; and provider uniqueness is scoped by provider account and environment.

**Transaction tests** — rollback removes both the business change and its outbox event; concurrent
aggregate mutations conflict safely rather than silently overwriting; all transaction participants
share the same client; no provider call occurs before commit; deadlock and serialization retries are
bounded; and business state plus outbox event persist atomically.

**Outbox tests** — two workers never double-claim the same event; a stale lease is recovered; a
failed event is retried; a dead event stops retrying; duplicate processing is safe; claim ordering is
deterministic; and provider side effects are idempotent.

**Idempotency tests** — same key with the same payload returns the same result; same key with a
different payload fails; concurrent identical requests create exactly one resource; expired records
follow the retention policy; sensitive response data is not persisted; and abandoned leases recover
safely.

**Migration tests** — empty-to-head succeeds; released-version-to-head succeeds; applied history is
immutable; expand-and-contract phases are compatible with an overlapping old application version; a
failed migration blocks the release; the advisory lock prevents parallel runners; and a custom SQL
migration is reproducible.

**Pooling tests** — runtime traffic works correctly through PgBouncer transaction mode; one
transaction uses exactly one client; no code path depends on session persistence across
transactions; migrations and backups use direct connections; and pool exhaustion fails safely and
observably rather than hanging.

## Explicitly Deferred Capabilities

The following are **out of scope for V1** and must not be implemented as part of V1 work:

- Redis
- RabbitMQ
- Kafka
- Any external managed queue service
- Change data capture (CDC)
- Full event sourcing
- Database per module
- Database per tenant
- Read replicas
- Sharding
- Table partitioning
- Broad PostgreSQL Row-Level Security
- Multi-region writes
- Active-active database topology
- A data warehouse
- An analytical data lake
- A separate general-ledger database
- An automated index adviser
- Zero-downtime major-version upgrade tooling
- An automated anonymization engine
- An automatic database autoscaling policy

## Consequences

### Positive

- Every ADR from ADR-003 onward that assumed "the transactional outbox" now has a concrete, testable
  implementation target, so the outbox stops being a shared assumption and becomes a shared
  mechanism with defined claim, lease, retry, and dead-letter semantics.
- Enforcing structural invariants in the database — unique constraints, named check constraints,
  partial unique indexes, foreign keys — means a bug in one module's application code cannot silently
  corrupt orders, payments, or refunds owned by another.
- Making reviewed, committed SQL migrations the only authorized path to schema change gives the
  platform an auditable history of every structural change, which is exactly what
  [ADR-002](./ADR-002-environments-ci-cd-release-model.md#migration-strategy) needs to serialize and
  what incident investigation needs to reconstruct.
- Choosing PostgreSQL for the outbox and idempotency store keeps V1's operational surface to one
  managed database rather than a database plus a broker plus a cache, each with its own failure
  modes, credentials, backups, and on-call burden — a decisive advantage for a small team.
- Testing against real PostgreSQL 18 via Testcontainers means the behaviours the architecture
  depends on most (`SKIP LOCKED`, partial indexes, constraint violations, isolation, error codes) are
  actually verified rather than approximated by a fake that cannot express them.
- Fixing type conventions once — UUIDv7 identifiers, `timestamptz` instants, integer paise in
  `bigint`, `numeric` rates, `text` plus named `CHECK` for business state — removes a whole class of
  per-table debates and per-module inconsistency.

### Trade-offs accepted

- A PostgreSQL-backed outbox polled by a worker has higher latency and lower throughput ceiling than
  a purpose-built broker, accepted because BOBA Bear's V1 volume is far below that ceiling and the
  operational simplicity is worth more than the headroom.
- At-least-once delivery pushes idempotency work onto every consumer, accepted because exactly-once
  external delivery is not achievable in general and pretending otherwise produces worse bugs than
  designing for duplicates.
- Explicit transaction-context passing is more verbose than an ambient or implicit transaction
  mechanism, accepted because implicit transaction discovery is the single easiest way to produce a
  "transaction" that silently spans two connections.
- Rejecting a generic base repository means more hand-written, purpose-specific repository methods,
  accepted because unrestricted CRUD across every table would dissolve the module ownership and
  scoping rules that ADR-003 and ADR-005 depend on.
- Transaction-mode pooling constrains what application code may assume about session state, accepted
  in exchange for connection efficiency on a small managed database plan.
- Enforcing invariants in the database makes some schema changes slower and more deliberate (a
  constraint change is a reviewed migration, not a code edit), accepted because the alternative is
  discovering the invariant was violated by reading a corrupted order.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| A schema change reaches a shared environment without review | Reviewed, committed SQL migrations are the only authorized change mechanism, and `drizzle-kit push` is prohibited outside a disposable personal database, per [Source-of-Truth Model](#source-of-truth-model) and [Push-Command Policy](#push-command-policy) |
| Production schema silently drifts from the repository | Manual DDL is prohibited except in audited emergency recovery, which requires an immediate corrective migration, plus deployment-time history validation, per [Schema-Drift Policy](#schema-drift-policy) |
| Two workers process the same outbox event and duplicate an external side effect | Bounded `FOR UPDATE SKIP LOCKED` claiming with leases, plus mandatory consumer idempotency and provider idempotency keys, per [Outbox Claiming](#outbox-claiming) and [Outbox Delivery Semantics](#outbox-delivery-semantics) |
| A crash between an external success and the internal completion causes a replayed side effect | At-least-once semantics are stated explicitly and every consumer is required to be idempotent, per [Outbox Delivery Semantics](#outbox-delivery-semantics) |
| A duplicate customer request creates two orders, payments, or refunds | The shared idempotency table's uniqueness constraint is the final concurrency authority, not an application check, per [Idempotency Acquisition](#idempotency-acquisition) |
| A staging provider event is matched to a production record | Provider-identifier uniqueness is scoped by provider, provider account, and environment, per [External Provider Identifiers](#external-provider-identifiers) |
| Money is corrupted by floating-point arithmetic | Final amounts are integer paise in `bigint`, rates are `numeric`, and floats are prohibited for authoritative financial calculation, per [Monetary Persistence](#monetary-persistence) |
| A long transaction or provider call inside a transaction exhausts the connection pool | No provider calls inside transactions, bounded short transactions, explicit timeouts, and an explicit connection budget, per [Transaction Abstraction](#transaction-abstraction), [Database Timeouts](#database-timeouts), and [Connection Budget](#connection-budget) |
| App Platform scaling silently exceeds the database connection limit | An explicit written connection budget that scaling configuration must be evaluated against, with migration and recovery connections reserved, per [Connection Budget](#connection-budget) |
| Code assumes session state that transaction-mode pooling does not preserve | The prohibited assumptions are enumerated, and pooling behaviour is covered by required future tests, per [Runtime Connection Pooling](#runtime-connection-pooling) and [Required Future Tests](#required-future-tests) |
| A concurrent update silently overwrites another actor's change | Version-column optimistic concurrency on mutable aggregate roots, where zero updated rows means conflict, per [Optimistic Concurrency](#optimistic-concurrency) |
| A blind retry loop masks a genuine constraint or logic defect | Retry is bounded and restricted to `40001` and `40P01`; constraint, authorization, and validation failures are never retried, per [Deadlock and Serialization Handling](#deadlock-and-serialization-handling) |
| Backups exist but cannot actually be restored | A backup is not considered adequate until a restore drill has been executed and its recovery time recorded, per [Restore Validation](#restore-validation) |
| A destructive migration runs during a rolling deployment while old code is still live | Expand-and-contract phases are separated across deployments, and destructive down-migrations are never automatic, per [Expand-and-Contract Evolution](#expand-and-contract-evolution) and [Migration Deployment](#migration-deployment) |
| Sensitive data leaks through JSON payloads, query logs, or audit records | Secrets are prohibited in payloads, parameter and payload logging is restricted, and audit records enumerate what must never be stored, per [JSONB Policy](#jsonb-policy), [Query Logging](#query-logging), and [Audit Persistence](#audit-persistence) |
| A test suite claims database coverage it does not have | Real PostgreSQL 18 via Testcontainers is required for any test asserting locking, isolation, constraint, or worker behaviour, per [PostgreSQL Integration-Test Strategy](#postgresql-integration-test-strategy) |
| A pinned version assumption in this document silently becomes wrong | Exact versions, digests, and provider capabilities are deliberately left open and must be re-verified against official sources at implementation time, per [Explicit Non-Decisions](#explicit-non-decisions) |

## Explicit Non-Decisions

This decision does not resolve the following, which remain **Open**, and must not be treated as
answered by this ADR:

- Exact PostgreSQL image patch version or digest for local development and CI
- Exact Drizzle ORM version
- Exact Drizzle Kit version
- Exact Better Auth version and Drizzle-adapter configuration
- Exact node-postgres version
- Exact Testcontainers module and version
- Exact `GRANT` and `REVOKE` statements for the runtime, migration, read-only, and administrative
  database roles
- Exact connection-pool sizes per process (web and worker)
- Exact statement, lock, and idle-in-transaction timeout values
- Exact retry counts, backoff, and jitter parameters for serialization and deadlock retry
- Exact idempotency-retention periods per operation class
- Exact logical-backup schedule and retention
- Exact restore-drill cadence after launch
- Exact observability provider and slow-query threshold
- Exact PostGIS and `pg_trgm` adoption decision
- Exact migration-runner wrapper implementation
- Exact non-transactional-DDL tooling support
- Exact static-menu catalog import mechanism
- Exact `numeric` precision and scale per rate column
- Exact outbox claim batch size and lease duration
- Exact database plan sizing and connection-limit budget
- Exact table, column, and constraint names, subject to implementation review
- Exact workflows requiring `SERIALIZABLE` isolation
- Exact database-per-worker test-isolation implementation
- Exact automated schema-drift-detection tooling

## Rejected and Deferred Alternatives

- **Prisma as the persistence toolkit** — not selected, per
  [Alternatives Not Selected](#alternatives-not-selected).
- **Kysely as the persistence toolkit** — not selected.
- **Raw node-postgres only, with no query builder or schema toolkit** — not selected as the primary
  approach; parameterized raw SQL remains allowed inside infrastructure boundaries.
- **Native PostgreSQL enum types as the default business-state representation** — rejected in favour
  of `text` plus a named `CHECK` constraint, per [Business State Columns](#business-state-columns).
- **A generic `deleted_at` soft-delete column on every table** — rejected in favour of explicit
  lifecycle columns and states, per [Deletion, Archival, and Lifecycle](#deletion-archival-and-lifecycle).
- **A generic base repository with unrestricted CRUD** — rejected, per
  [Repository Rules](#repository-rules).
- **A single global `updated_at` trigger across all tables** — rejected, per
  [Creation and Update Timestamps](#creation-and-update-timestamps).
- **A universal polymorphic provider-event table shared by all modules** — rejected, per
  [Provider-Event Storage](#provider-event-storage).
- **One PostgreSQL schema per module inside `app`** — rejected; module ownership is enforced by
  architecture and review, per [One Database, Explicit Schemas](#one-database-explicit-schemas).
- **`drizzle-kit push` against any shared environment** — rejected outright, per
  [Push-Command Policy](#push-command-policy).
- **Redis, RabbitMQ, Kafka, or any external managed queue for V1** — deferred, per
  [Explicitly Deferred Capabilities](#explicitly-deferred-capabilities).
- **Change data capture as the outbox mechanism** — deferred.
- **`LISTEN`/`NOTIFY` as the durable outbox store** — rejected; it may later serve only as a
  low-latency wake-up hint alongside authoritative polling, per
  [Outbox Delivery Semantics](#outbox-delivery-semantics).
- **Full event sourcing** — deferred.
- **Database per module and database per tenant** — deferred.
- **Read replicas and replica read-routing** — deferred.
- **Table partitioning** — deferred pending measured evidence.
- **Sharding, multi-region writes, and active-active PostgreSQL** — deferred.
- **Broad PostgreSQL Row-Level Security as the primary V1 authorization mechanism** — remains
  deferred, restating [ADR-005](./ADR-005-organization-outlet-authorization.md#postgresql-row-level-security-position)
  (D-081) rather than changing it.
- **SQLite, PGlite, or in-memory fakes as the authoritative persistence-test substrate** — rejected,
  per [PostgreSQL Integration-Test Strategy](#postgresql-integration-test-strategy).
- **A separate data warehouse, analytical lake, or general-ledger database** — deferred.

## Related Canonical Documents

- [`README.md`](../README.md) — the canonical documentation index and update protocol.
- [`architecture-foundation.md`](../architecture-foundation.md) — the modular-monolith principle, the
  relational transactional data model, the transactional outbox, the database-ownership rule, and the
  audit requirement this decision implements in detail.
- [`order-payment-delivery-model.md`](../order-payment-delivery-model.md) — the order, payment, and
  delivery entities and snapshots this decision's storage conventions must carry.
- [`organization-outlet-access-model.md`](../organization-outlet-access-model.md) — the organizational
  and access entities whose scoping this decision's repository rules enforce.
- [`v1-product-scope.md`](../v1-product-scope.md) — the release scope this persistence foundation must
  support.
- [`roadmap-and-open-decisions.md`](../roadmap-and-open-decisions.md) — the open decisions this ADR
  does not resolve.
- [`decision-register.md`](../decision-register.md) — the structured register entries this ADR locks.
- [ADR-001](./ADR-001-digitalocean-platform.md) — the DigitalOcean Managed PostgreSQL and Spaces
  foundation this decision's version, pooling, backup, and object-storage-offload requirements build
  on.
- [ADR-002](./ADR-002-environments-ci-cd-release-model.md) — the environment isolation, immutable
  migration, serialized pre-deployment migration job, expand-and-contract, secrets, and rollback
  decision this decision's migration workflow and deployment requirements implement at the database
  layer.
- [ADR-003](./ADR-003-modular-monolith-node-typescript.md) — the modular-monolith, dependency-rule,
  database-ownership, transactional-outbox, and inbound-event-idempotency decision this decision
  makes concrete in PostgreSQL.
- [ADR-004](./ADR-004-identity-authentication-sessions.md) — the Better Auth decision whose
  persistence this decision places in the `auth` schema behind the Identity-module boundary.
- [ADR-005](./ADR-005-organization-outlet-authorization.md) — the scoped-repository, data-boundary,
  and Row-Level-Security-deferral decision this decision's repository rules and RLS position restate
  at the persistence layer.
- [ADR-007](./ADR-007-pricing-tax-charges-promotions.md) — the monetary-representation decision this
  decision's integer-paise and `numeric`-rate storage conventions implement.
- [ADR-008](./ADR-008-serviceability-cart-checkout.md) — the cart-concurrency, idempotent-mutation,
  checkout-idempotency, and pre-provider-call transaction-boundary decision this decision's
  optimistic-concurrency, idempotency, and transaction rules support.
- [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md) — the durable provider-event
  record, webhook idempotency, and payment-transaction decision whose shared persistence conventions
  this decision fixes.
- [ADR-010](./ADR-010-order-lifecycle-operations-console.md) — the order-lifecycle,
  optimistic-concurrency, command-idempotency, append-only-timeline, and historical-immutability
  decision this decision's state, concurrency, and deletion policies serve.
- [ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md) — the delivery provider-event,
  idempotency, and normalization decision whose provider-event storage convention this decision
  fixes.
- [ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md) — the notifications and
  outbox-consumer decision whose durable provider-event and outbox assumptions this decision
  implements.
- [ADR-014](./ADR-014-http-api-route-handlers-contracts.md) — the HTTP API decision whose
  `Idempotency-Key`, `ETag`/`If-Match`, and PostgreSQL-backed rate-limiting contracts are built on
  the shared idempotency store, optimistic-concurrency column, and transactional outbox this
  decision fixes.
- [ADR-015](./ADR-015-configuration-secrets-feature-flags.md) — the configuration and secrets
  decision whose operational-configuration, feature-flag-override, and configuration-audit sections
  are built on the schema model, optimistic-concurrency column, and audit-persistence shape this
  decision fixes; application tables never store raw provider credentials, consistent with the
  secret-reference model fixed there.
