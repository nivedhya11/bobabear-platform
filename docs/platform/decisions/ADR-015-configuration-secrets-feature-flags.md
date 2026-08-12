---
Status: Accepted
Decision date: 2026-08-03
Last updated: 2026-08-03
---

# ADR-015: Configuration, Secrets, and Feature Flags

## Status

Accepted

## Decision Date

2026-08-03

## Decision Owners

BOBA Bear founder/product leadership

## Context

[ADR-002](./ADR-002-environments-ci-cd-release-model.md) fixed the four isolated environment types,
the same-image promotion model, and that DigitalOcean App Platform environment variables and GitHub
environment secrets are stored and scoped separately, but left the concrete configuration-loading
mechanism, environment-variable naming, and secret-storage detail open.
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md) fixed the database roles,
connection pooling, and the PostgreSQL-backed transactional outbox and audit conventions that
runtime configuration and operational configuration sit on top of.
[ADR-014](./ADR-014-http-api-route-handlers-contracts.md) fixed `/health/live` and `/health/ready`
as BOBA Bear's health endpoints, provider-webhook handling, and the Route Handler boundary, but left
open what those endpoints actually validate and how a Route Handler, background worker, or migration
job first obtains trusted, typed configuration.

Every module described in [`architecture-foundation.md`](../architecture-foundation.md) — Identity,
Payments, Delivery, Notifications, Access Control, and the rest — depends on environment-specific
technical configuration (database connections, public origin), on secrets (session secrets, Cashfree
credentials, Meta WhatsApp credentials, delivery-provider credentials), and, increasingly, on
non-secret operational configuration and feature flags that must be able to change without a new
deployment (provider enablement, outlet ordering pause, checkout and payment kill switches). Before
any of that configuration is read by application code, BOBA Bear needs one fixed answer for: where
raw environment variables may be read at all; how they are validated and typed; what is genuinely
build-time versus runtime; what may ever reach the browser; how secrets are stored, classified, and
referenced without being duplicated into PostgreSQL; how non-secret operational configuration and
feature flags are stored, scoped, and evaluated; how kill switches differ from ordinary flags; how
environment mismatches (a staging app resolving a production credential) are prevented; what a safe
production startup must reject; and how startup, liveness, and readiness relate to all of the above.
This ADR fixes those answers so that no module invents its own configuration, secret-handling, or
feature-flag approach.

This ADR is documentation only. It does not implement a configuration loader, a Zod configuration
schema, `instrumentation.ts`, a worker bootstrap, feature-flag code, kill-switch code, PostgreSQL
configuration tables, migrations, an admin configuration UI, a secret resolver, or any provider
credential, DigitalOcean variable, or GitHub secret. No configuration code, environment schema,
feature flag, secret resolver, database table, startup hook, middleware, or admin UI exists in this
repository as a result of this decision.

## Decision Summary

BOBA Bear uses a centralized, immutable, typed configuration boundary. Static technical
configuration and secrets come from validated runtime environment variables, resolved once at
process startup by a single shared configuration loader and validated with Zod 4
(per [ADR-014](./ADR-014-http-api-route-handlers-contracts.md#zod-validation)) into an immutable
typed object; application modules never read `process.env` directly. Non-secret operational
configuration and feature-flag overrides are stored in PostgreSQL, scoped by environment, brand,
organization, territory, and/or outlet, versioned, effective-dated, permission-controlled, and
audited; raw secret values are never stored in BOBA Bear application tables. BOBA Bear defines an
explicit application environment (`LOCAL`/`TEST`/`CI`/`STAGING`/`PRODUCTION`) distinct from
framework-controlled `NODE_ENV`, so that the same promoted OCI image
(per [ADR-002](./ADR-002-environments-ci-cd-release-model.md)) can run correctly in more than one
deployment context. Build-time values are limited to what the immutable artifact genuinely needs;
all environment-specific and secret values are read at runtime. `NEXT_PUBLIC_` values are restricted
to safe, stable, non-secret constants; environment-specific browser values use an explicit, allow-
listed runtime public-configuration boundary instead. Feature flags are typed, code-defined, boolean
for V1, backed by PostgreSQL overrides, evaluated server-authoritatively, and are never a substitute
for authorization. Kill switches are explicit, capability-scoped initiation controls that stop new
work without automatically stopping inbound provider events, reconciliation, or in-flight
fulfilment. Startup for both the web and worker process follows one shared bootstrap — fail fast on
invalid or missing required configuration, on production safeguard violations, and on environment
mismatches — while remaining tolerant of temporary third-party provider unavailability, consistent
with [ADR-014](./ADR-014-http-api-route-handlers-contracts.md#health-endpoints)'s liveness and
readiness endpoints.

This is an accepted, final decision for BOBA Bear's configuration, secret, and feature-flag
architecture — not a recommendation. It fixes categories, boundaries, and safety rules; it does not
select exact environment-variable names, exact schema files, exact cache durations, or exact
provider runbooks — see [Explicit Non-Decisions](#explicit-non-decisions).

## Configuration Categories

Five categories are kept strictly separate and must never be collapsed into one untyped
environment-variable collection:

| Category | Source | Examples |
| --- | --- | --- |
| Build metadata | Build pipeline | Release version, Git SHA, image digest |
| Runtime technical configuration | Environment variables | Database URL, public origin, pool settings |
| Runtime secrets | Encrypted environment variables | Session secrets, provider credentials |
| Operational configuration | PostgreSQL | Provider enablement, outlet policies |
| Feature flags and kill switches | Code registry plus PostgreSQL overrides | Checkout enablement, payment kill switch |

Domain lifecycle state is never represented as generic configuration. Outlet paused/open state,
order state, payment state, delivery state, customer consent, and catalog availability remain owned
by their respective modules (per [ADR-006](./ADR-006-food-catalog-assortment-availability.md),
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md),
[ADR-010](./ADR-010-order-lifecycle-operations-console.md), and
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md)), not by the configuration system
described here. Likewise, user roles and permissions remain owned by Access Control
(per [ADR-005](./ADR-005-organization-outlet-authorization.md)), never modeled as a configuration
flag.

## Central Configuration Boundary

Only a small, fixed set of call sites may read raw environment variables: the central application
configuration loader, database and migration-tool bootstrap, test bootstrap, and explicit build
tooling. Everywhere else, code receives typed configuration through an approved interface built on
one shared schema model with an immutable validated output. There is no repeated ad hoc parsing of
`process.env` scattered through the application, no direct `process.env` read inside a business
module, and no raw environment object passed into domain or application code. No secret value is
ever serialized to browser code or included in an error response. This directly extends the
dependency-direction and module-boundary rules already fixed by
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#dependency-rules): infrastructure adapters
depend on the typed configuration object, never on the raw environment. Exact file names and helper
APIs remain open.

## Application Environments

BOBA Bear defines an explicit application environment distinct from the framework's own concept:

```text
LOCAL
TEST
CI
STAGING
PRODUCTION
```

Deployment environment is never inferred solely from `NODE_ENV`, which remains framework-controlled
(`development`/`test`/`production`) and is not repurposed as BOBA Bear's environment identity. A
production-built image running in staging may therefore report `NODE_ENV=production` and
`BOBA_APP_ENV=STAGING` simultaneously — this is expected and required by the same-image promotion
model fixed in [ADR-002](./ADR-002-environments-ci-cd-release-model.md#one-immutable-image-per-commit).
The explicit application environment is mandatory; a process must not start without one. The exact
variable name is finalized during implementation.

## Build-Time and Runtime Separation

Build-time configuration is limited to values genuinely required to build the immutable artifact:
release version, source commit, image/build identifier, framework build controls, and
environment-independent public constants. Database passwords, authentication secrets, Cashfree
credentials, WhatsApp credentials, delivery-provider credentials, storage credentials, webhook
secrets, and any production- or staging-specific private configuration are never placed at build
time. Environment-specific server configuration — application environment, database connections,
public origin, authentication secrets, provider credentials, storage credentials, worker settings,
and environment-specific provider accounts — is read at runtime only. This preserves
[ADR-002](./ADR-002-environments-ci-cd-release-model.md#one-immutable-image-per-commit)'s guarantee
that the identical OCI image is promoted from staging to production: the image never bakes in an
environment-specific secret that would make staging and production artifacts diverge.

## Public Runtime Configuration

Next.js embeds `NEXT_PUBLIC_` values into browser JavaScript at build time. BOBA Bear therefore
never stores a secret in a `NEXT_PUBLIC_` variable, avoids environment-specific `NEXT_PUBLIC_`
values, and never embeds staging- or production-specific provider configuration at build time.
`NEXT_PUBLIC_` is reserved for safe values that are intentionally public and stable across every
promoted environment. Secrets and environment-specific runtime values are never placed in
`next.config.*` public environment configuration either. Where the browser genuinely needs an
environment-specific, non-secret value, it is supplied through an explicit runtime public-
configuration boundary — server-rendered values, typed Server Component props, or a same-origin
public-configuration endpoint — gated by an explicit allowlist. Candidate public values include the
public application origin, a browser-safe map identifier, a safe analytics identifier, customer-
visible support information, and evaluated browser-safe feature availability. This boundary never
exposes raw server configuration, environment-variable names or values, database details, provider
secrets, secret references, internal hostnames, workforce configuration, internal feature-targeting
rules, or unreleased operational controls. The exact mechanism (server-rendered value, prop, or
endpoint) remains open.

## Configuration Validation

Configuration is validated with **Zod 4**, already approved by
[ADR-014](./ADR-014-http-api-route-handlers-contracts.md#zod-validation) for HTTP boundary
validation and reused here for the configuration boundary. Configuration is organized into typed
groups — `application`, `release`, `database`, `authentication`, `http`, `payments`, `delivery`,
`notifications`, `storage`, `workers`, `observability` — never as one flat untyped object. Each field
conceptually declares: type, required condition, safe default where permitted, allowed values,
format, secret classification, applicable environment, applicable process, restart requirement, and
browser-exposure policy. Values are classified as:

- **Required** — the process cannot operate safely without it (for example, a database runtime URL).
- **Conditionally required** — required only when a related capability is enabled (for example, a
  Cashfree client secret required when payment-session creation is enabled).
- **Optional** — has an explicit safe behaviour when absent.

Missing secrets never receive insecure placeholder defaults.

## Process-Specific Configuration

Web, worker, and migration processes validate separate configuration subsets through the same
shared configuration system, matching the web/worker split already fixed by
[ADR-002](./ADR-002-environments-ci-cd-release-model.md#web-and-worker-deployment) and
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#web-and-worker-model). The web process
likely requires application environment, public origin, runtime database pool, authentication and
session configuration, customer-facing capability settings, and HTTP configuration. The worker
process likely requires application environment, runtime database pool, outbox configuration
(building on [ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#transactional-outbox-persistence)),
worker concurrency, retry settings, and credentials for enabled outbound providers. The migration
process likely requires application environment, the direct (non-pooled) migration database URL
consistent with [ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#runtime-connection-pooling),
migration role context, and release metadata — and must never require unrelated customer-session,
delivery, or WhatsApp configuration. Exact schemas remain open.

## Local and Test Environment Policy

BOBA Bear uses the repository-root environment-file convention:

```text
.env.example        committed
.env.test           committed only with safe fake values where needed
.env.local          ignored
.env.*.local        ignored
```

`.env.example` documents keys using safe placeholders only; real credentials are never committed.
Test values must never grant access to production providers. Local secret values must never appear
in documentation. A missing local required value fails with a clear, safe message rather than
silently defaulting. `.env` files are never placed inside `src/`. This extends the secrets-model
principle already fixed in
[ADR-002](./ADR-002-environments-ci-cd-release-model.md#secrets-model) that `.env.example` contains
names and safe descriptions only and that server secrets never use the `NEXT_PUBLIC_` prefix. The
exact developer secret-distribution mechanism remains open.

## DigitalOcean Variable Scopes

DigitalOcean App Platform variable scope is used deliberately, on top of the environment isolation
already fixed in [ADR-002](./ADR-002-environments-ci-cd-release-model.md#environment-isolation):

- **App-level variables** — only for values genuinely shared by web and worker (application
  environment, common public origin, shared non-secret release metadata).
- **Component-level variables** — for values owned only by web, worker, the migration job, or a
  scheduled reconciliation job; duplicate keys across components are avoided unless an override is
  intentional and documented.
- **Runtime scope** — for environment-specific application values and secrets.
- **Build scope** — used only where image construction genuinely requires the value.
- **Secret type** — used for sensitive values.

Repository-controlled App Platform specifications may declare variable names, component scope,
runtime/build scope, and bindable references; they never contain plaintext secret values, matching
the "secrets are never committed" principle in
[ADR-002](./ADR-002-environments-ci-cd-release-model.md#secrets-model). Bindable values may be used
only where their ownership is clear, their output matches BOBA Bear's expected connection type,
runtime pooled and direct migration URLs remain distinct
(per [ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#runtime-connection-pooling)),
their use is declared in repository-controlled infrastructure configuration, and startup validation
checks the resulting value. BOBA Bear does not depend on undocumented bindable variables. Exact
bindable usage remains an implementation decision.

## Secret Classification and Storage

Secrets are classified at least as:

```text
DATABASE_SECRET
AUTHENTICATION_SECRET
PAYMENT_SECRET
DELIVERY_SECRET
MESSAGING_SECRET
STORAGE_SECRET
OBSERVABILITY_SECRET
DEPLOYMENT_SECRET
```

Each secret has a logical owner, environment, consuming process, provider account where applicable,
rotation procedure, revocation procedure, incident owner, and last-rotation metadata stored
separately from the value. One general secret is never reused for unrelated security purposes. For
initial V1: DigitalOcean encrypted runtime variables store application runtime secrets
(Authentication per [ADR-004](./ADR-004-identity-authentication-sessions.md), Cashfree per
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#credential-and-webhook-secret-controls),
delivery per [ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md), and WhatsApp per
[ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md)); GitHub Actions secrets store
deployment-authority secrets, per
[ADR-002](./ADR-002-environments-ci-cd-release-model.md#secrets-model); PostgreSQL stores logical
credential references only, never raw provider credentials, in application tables. Logs, traces,
metrics, health endpoints, and audit records never contain secret values. An external secret manager
is not required for V1; the architecture must permit a future secret-manager adapter without
redesigning provider-account domain records.

## Credential References

Provider-account records (Cashfree per
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#payment-account-ownership), delivery
accounts per [ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md), and the WhatsApp
Business Account per
[ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md)) contain a logical credential-set
reference, never a raw credential. The conceptual model is:

```text
Provider account
        ↓
Credential-set reference
        ↓
Allowlisted secret resolver
        ↓
Environment-specific runtime secrets
```

For example, `cashfree.primary.production` is a reference, not a credential. References resolve
only through an allowlisted registry; a staging account can never resolve a production credential,
extending the environment-isolation principle in
[ADR-002](./ADR-002-environments-ci-cd-release-model.md#environment-isolation) and the environment-
matching rules below. The browser never receives a secret reference. Raw arbitrary environment-
variable lookup is prohibited outside the central configuration boundary. A missing reference
disables or fails the applicable capability safely rather than falling back to an insecure default.
Provider-account JSON must never contain raw credentials. Exact reference syntax remains open.

## Secret Rotation

The standard rotation sequence is:

1. Provision a replacement credential.
2. Add or update the relevant encrypted runtime secret.
3. Deploy or restart affected processes.
4. Verify the replacement credential.
5. Revoke the previous credential.
6. Record rotation metadata without recording the secret.

Where a provider supports overlap, adapters may temporarily validate both current and previous
webhook or API credentials during the transition. Environment-secret changes are not live-reloaded —
see [Reload Policy](#reload-policy). Exact provider-specific rotation runbooks remain open.

## Operational Configuration

Non-secret operational configuration is stored in PostgreSQL — never as raw credentials — whenever
it must change without a new image, be scoped by environment, brand, organization, territory, or
outlet (per [ADR-005](./ADR-005-organization-outlet-authorization.md)'s scope model), be
effective-dated, be versioned, be permission-controlled, or be audited. Candidate examples include
provider-account enablement, primary and fallback delivery mode
(per [ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md)), payment-method enablement
(per [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#v1-payment-methods)), outlet
provider selection, customer-notification enablement
(per [ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md)), operational thresholds, and
feature-flag overrides.

## Registered Operational Configuration

Arbitrary, unregistered key/value configuration is not supported. Every dynamic configuration
definition declares a stable key, type, owner, allowed scopes, validation rules, safe default,
environment restrictions, whether restart is required, and whether browser exposure is allowed. A
configuration value conceptually carries a definition key, scope, typed value, version, lifecycle,
effective dates, actor, reason, created/updated timestamps, and an audit correlation identifier.
Updates require scoped authorization, validation, optimistic concurrency
(mirroring [ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#optimistic-concurrency)),
audit, environment checks, and approval where risk requires it.

## Feature Flags

BOBA Bear uses a typed, code-defined feature-flag registry with PostgreSQL-backed overrides, a
server-authoritative evaluation interface, and boolean flags for V1; no external feature-flag
service is used for V1. Every flag definition contains a stable key, purpose, owner, boolean
default, safe fallback, allowed scopes, browser-exposure policy, creation date, review or expiry
date, and removal criteria. Percentage rollout, customer-level targeting, arbitrary rule
expressions, multivariate flags, an external flag SaaS, and real-time flag streaming are all
deferred.

## Feature-Flag Scopes and Precedence

Feature flags may be scoped by:

```text
ENVIRONMENT
BRAND
ORGANIZATION
TERRITORY
OUTLET
```

Precedence is fixed as:

```text
Emergency kill switch
        ↓
Most-specific permitted override
        ↓
Broader scope override
        ↓
Environment override
        ↓
Code-defined default
```

Evaluation is deterministic; PostgreSQL is authoritative for overrides; unknown keys are rejected;
and a downstream override can never bypass an upstream safety restriction. Scope resolution follows
[ADR-005](./ADR-005-organization-outlet-authorization.md#authorization-scopes)'s organization and
outlet boundaries. Browser clients receive only evaluated values for explicitly public flags;
internal rules and overrides remain server-only.

## Feature Flags Are Not Authorization

Feature flags never replace authentication, permission checks, customer ownership, organization
scope, tax rules, compliance rules, payment verification, provider authenticity, required consent,
or order-state validation. Hiding a UI control never protects its underlying API. Every use case
continues to enforce authorization and business policy through the central Access Control interface
already fixed by [ADR-005](./ADR-005-organization-outlet-authorization.md#central-authorization-interface),
regardless of what any feature flag evaluates to.

## Feature-Flag Lifecycle

Flags follow a lifecycle conceptually equivalent to `DRAFT` → `ACTIVE` → `ROLLED_OUT` → `RETIRED`.
Every temporary flag requires an owner, purpose, created date, review date, rollout-completion
condition, and removal task. Retiring a flag requires: confirming final behaviour, removing
conditional application code, removing active overrides, retiring the registry definition, and
preserving historical audit records. Unused flags are not kept indefinitely.

## Kill Switches

High-priority initiation kill switches are defined for capabilities such as:

```text
CHECKOUT_CREATE_NEW_ORDERS
PAYMENTS_CREATE_NEW_SESSIONS
DELIVERY_CREATE_NEW_BOOKINGS
WHATSAPP_SEND_NEW_MESSAGES
MARKETING_SEND_MESSAGES
```

Each switch defines precisely what it blocks. The checkout kill switch stops new checkout
confirmation but never hides existing orders. The payment kill switch stops new payment sessions but
never stops payment webhooks or reconciliation
(per [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#webhook-signature-verification-and-acceptance)).
The delivery kill switch stops new bookings but never abandons active deliveries
(per [ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md)). The WhatsApp outbound kill
switch stops new sends but never stops inbound event recording
(per [ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md#whatsapp-webhooks)). The
marketing kill switch never suppresses required transactional or safety messages. Kill switches
control initiation, not automatically ingestion, reconciliation, or completion.

## Failure and Fallback Behaviour

Every configuration item, feature flag, and kill switch requires an explicit safe fallback: an
experimental feature defaults off; invalid payment configuration disables new payment initiation
while payment webhook ingestion remains enabled where possible; existing paid-order fulfilment
continues when new checkout is paused; and provider-event persistence continues even when outbound
provider calls are disabled. There is no single universal fail-open or fail-closed policy — safety
behaviour is capability-specific.

## Configuration and Flag Caching

Bounded in-process caching is allowed for operational configuration, feature-flag overrides, and
kill-switch evaluation. PostgreSQL remains authoritative; kill-switch cache duration must be short;
unknown or stale state uses the registered safe fallback; a process restart reloads authoritative
state; no Redis is required for V1, consistent with
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#alternatives-not-selected); and
operational changes must become effective within a defined maximum interval. Cache failure must be
observable. Exact cache duration and invalidation mechanism remain open.

## Environment Matching

Consistent environment identity is enforced across the BOBA Bear application, database, provider
account, credential reference, provider callback, storage bucket, and public origin. Examples that
must fail: a `STAGING` app resolving a `PRODUCTION` Cashfree account; a `STAGING` app resolving
`PRODUCTION` WhatsApp credentials; a `PRODUCTION` app connecting to a `STAGING` database; and a
`PRODUCTION` callback matched against a `STAGING` provider event. BOBA Bear does not rely on names
alone where a provider exposes verifiable account or environment information; environment matching
uses trusted server configuration and provider-account metadata, extending the environment-
isolation principle already fixed in
[ADR-002](./ADR-002-environments-ci-cd-release-model.md#environment-isolation).

## Production Safeguards

Production startup and operation reject: development authentication bypasses; fake provider
adapters; test or sandbox credentials where prohibited; placeholder secrets; localhost public
origins; unsafe wildcard origins; disabled webhook authenticity verification
(per [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#webhook-signature-verification-and-acceptance)
and [ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md#whatsapp-webhooks)); debug
logging of sensitive payloads; automatic schema push
(consistent with [ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#push-command-policy));
test database hosts; unapproved staging provider accounts; and weak or malformed cryptographic
secrets. Exact detection rules remain implementation decisions; the safeguards themselves are
mandatory.

## Startup Bootstrap

Web and worker processes use one shared bootstrap design:

```text
Process starts
        ↓
Load raw environment
        ↓
Validate typed configuration
        ↓
Validate environment invariants
        ↓
Initialize required infrastructure
        ↓
Mark process ready
```

For Next.js web startup, the shared bootstrap may be invoked through `instrumentation.ts` and its
`register` function. The worker calls the same shared bootstrap explicitly. Independent, duplicated
configuration parsers for web and worker are not created, consistent with the shared web/worker
model already fixed by
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#web-and-worker-model).

## Fail-Fast Validation

Startup fails when required configuration is missing; a value has an invalid type or format; the
application environment is invalid; a production safeguard fails; an enabled capability lacks
required credentials; database connection configuration is inconsistent; the public origin is
malformed; a provider account and its credential environment conflict; or required cryptographic
material is weak or malformed. Errors may identify a configuration key, configuration group, and
failure category, but never print the value. The process never continues in an unsafe, partially
configured state merely to pass health checks.

## Optional Integration Degradation

A process may start with an optional capability disabled only when the capability is explicitly
optional, its schema permits absence, a safe fallback exists, the disabled state is observable,
readiness remains truthful, and no current legal, commercial, or customer obligation requires it.
Optional analytics may be disabled; WhatsApp outbound sending may be disabled while in-app tracking
(per [ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md)) remains available. Primary
database configuration can never be treated as optional.

## Provider Reachability at Startup

Startup validates configuration presence, format, environment matching, local relationships, and
critical database readiness. Startup does not ordinarily block because Cashfree, Meta, or a delivery
provider is temporarily unreachable — provider availability belongs to operational probes, circuit
breakers, metrics, reconciliation, and provider-specific health monitoring, not process startup. This
avoids preventing deployment of recovery code during a provider outage.

## Liveness and Readiness

[ADR-014](./ADR-014-http-api-route-handlers-contracts.md#health-endpoints) defines `/health/live`
and `/health/ready`. Liveness confirms the process is alive and does not fail solely because an
external provider is unavailable. Readiness may require successfully validated configuration,
completed bootstrap, database reachability, compatible migration state, and required internal
components initialized. Checks are bounded; readiness never exposes configuration values or returns
raw provider or database errors; web and worker readiness may differ; and provider reachability is
not generally required for liveness.

## Reload Policy

Environment-variable changes require redeployment, a process restart, or controlled process
replacement — arbitrary live environment reload is not implemented. Operational configuration may
change without deployment through an authorized application command, validation, an optimistic
version check, audit, and cache refresh. Feature flags and kill switches may change through approved
operational controls without deployment. All such changes must be observable and reversible.

## Authority Separation

Separate permissions govern: viewing non-secret configuration; updating routine operational
configuration; managing feature flags; activating kill switches; managing provider-account metadata;
changing credential references; managing actual DigitalOcean or GitHub secrets; and approving
production configuration changes. Technical platform administration never automatically grants
pricing authority, refund authority, marketing authority, customer-data authority, organization
administration, or raw secret-value visibility, consistent with the permission-based, deny-by-
default model already fixed by
[ADR-005](./ADR-005-organization-outlet-authorization.md#permission-based-authorization). The BOBA
Bear admin application never displays actual secret values.

## Configuration Audit

At minimum, the following are audited: operational configuration creation; configuration update;
configuration activation or retirement; feature-flag override; kill-switch activation; kill-switch
deactivation; provider-account enablement; credential-reference change; secret-rotation metadata;
startup-validation failure category; and production-safeguard rejection. An audit record may contain
a logical key or reference, scope, old non-secret value, new non-secret value, actor, reason,
version, environment, timestamp, and correlation ID — but never a raw secret. This extends the
general audit requirement already fixed in
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#audit-persistence) and
[`architecture-foundation.md`](../architecture-foundation.md#audit-requirements).

## Configuration Inventory

A canonical configuration inventory is maintained during implementation. Each item documents a key
or logical name, category, type, owner, source, secret classification, process scope, environment
scope, required condition, safe default, restart requirement, browser exposure, and rotation or
change procedure. The inventory may later be generated from schemas. Exact tooling remains open.

## Redaction Requirements

Secret and sensitive configuration values never appear in application logs, startup logs, error
responses, audit records, metrics labels, traces, health endpoints, support exports, or browser
bundles. A safe log reads `Missing required configuration: CASHFREE_CLIENT_SECRET`; an unsafe log
that reads `CASHFREE_CLIENT_SECRET=<secret-value>` is never produced. Key-name and category-based
redaction, plus value-pattern protection where appropriate, are both used. Exact redaction library
remains open.

## Required Future Tests

Future test coverage must address:

- **Configuration schemas** — valid complete configuration, missing required value, invalid enum,
  invalid URL, invalid number, conditional requirement, production placeholder rejection, environment
  mismatch, unsafe production adapter, process-specific schema behaviour.
- **Client exposure** — no secret in the browser bundle, no raw server configuration serialization,
  runtime public configuration uses an allowlist, `NEXT_PUBLIC_` usage is explicitly approved.
- **Startup** — invalid required configuration prevents startup, error names the key but not the
  value, web and worker use the shared loader, optional integration disables safely, production
  safeguards reject unsafe settings, a temporary provider outage does not incorrectly fail liveness.
- **Secret references** — a registered reference resolves, an unknown reference fails, staging
  cannot resolve production credentials, a secret is absent from logs, audit, traces, and responses.
- **Feature flags** — code default, environment override, scope precedence, kill-switch precedence,
  unknown-flag rejection, safe fallback during a database failure, the browser sees only public
  evaluated values, authorization remains independent of flag state.
- **Operational configuration** — optimistic version conflict, scope authorization, environment
  restriction, audit creation, effective dates, cache refresh, no raw secret persistence.

## Explicitly Deferred Capabilities

Consistent with the rejections below, the following remain deferred and out of scope for V1: an
external secret manager, an external feature-flag SaaS, OpenFeature adoption, percentage rollout,
customer-level targeting, arbitrary flag-rule expressions, real-time flag streaming, multi-region
configuration replication, automatic secret rotation, live environment-secret reload, an A/B testing
platform, native-app remote configuration, general configuration scripting, and secret display
through the admin UI.

## Consequences

### Positive

- One central, typed configuration boundary lets every module described in
  [`architecture-foundation.md`](../architecture-foundation.md) depend on validated configuration
  rather than reimplementing environment parsing and secret handling.
- Separating build-time from runtime values and restricting `NEXT_PUBLIC_` preserves
  [ADR-002](./ADR-002-environments-ci-cd-release-model.md#one-immutable-image-per-commit)'s
  same-image promotion guarantee without leaking environment-specific secrets into the browser.
- Storing operational configuration and feature-flag overrides in PostgreSQL, rather than requiring
  a redeployment for every provider-enablement or kill-switch change, lets BOBA Bear respond quickly
  to a payment or delivery incident.
- Explicit kill switches that separate initiation from ingestion and reconciliation avoid an
  incident response that accidentally drops in-flight customer orders, deliveries, or payments.
- Fail-fast startup validation and production safeguards catch a missing or unsafe configuration
  value before it reaches customers, rather than surfacing as a runtime failure during checkout.

### Trade-offs Accepted

- Every module must obtain configuration through the shared boundary even where a direct
  `process.env` read might seem like a convenient shortcut during development.
- Operational configuration and feature-flag overrides require additional PostgreSQL schema,
  authorization, and audit work beyond a simple environment variable, in exchange for the ability to
  change them without a deployment.
- Deferring exact environment-variable names, cache durations, and redaction tooling to
  implementation time means some of this ADR's guarantees are not yet enforceable until those
  follow-on decisions are made.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| A module reads `process.env` directly, bypassing validation | Central configuration boundary and dependency rules fixed here and in [ADR-003](./ADR-003-modular-monolith-node-typescript.md#dependency-rules); architecture enforcement remains open tooling |
| A secret or environment-specific value leaks into a `NEXT_PUBLIC_` variable or the browser bundle | `NEXT_PUBLIC_` restricted to safe, stable constants; environment-specific browser values require the explicit, allowlisted public-configuration boundary |
| A staging provider account or credential is accidentally used against production, or vice versa | Environment-matching rules fixed here, verified at startup and against trusted provider-account metadata |
| A kill switch activated during an incident silently drops inbound provider events or in-flight fulfilment | Kill switches are explicitly scoped to initiation only; inbound event ingestion and reconciliation are never gated by the same switch |
| An operational configuration or flag change bypasses authorization or audit | Registered-configuration model requiring scoped authorization, optimistic concurrency, and audit for every update |
| A production process starts with an unsafe placeholder secret, a development bypass, or a test database host | Mandatory production safeguards and fail-fast startup validation fixed here |
| A secret value appears in a log, error response, audit record, or health endpoint | Redaction requirements and the general prohibition on serializing secrets to logs, errors, audit, or health responses |

## Explicit Non-Decisions

This decision does not resolve the following, which remain **Open** and must not be treated as
answered by this ADR:

- Exact environment-variable names
- Exact configuration file structure
- Exact Zod package version
- Exact public-runtime-config mechanism
- Exact DigitalOcean bindable usage
- Exact credential-reference syntax
- Exact feature-flag cache duration
- Exact cache invalidation mechanism
- Exact feature-flag lifecycle names
- Exact secret rotation runbooks
- Exact developer secret-distribution mechanism
- Exact production-safeguard checks
- Exact admin configuration UX
- Exact approval thresholds
- Exact configuration inventory tooling
- Exact redaction library
- Exact readiness response shape
- Exact operational configuration tables
- Exact flag-override tables
- Exact feature-flag administration permissions
- Exact external secret-manager adoption point

## Rejected and Deferred Alternatives

- **Direct `process.env` access throughout modules** — rejected; all configuration flows through the
  central typed boundary.
- **Secrets in `NEXT_PUBLIC_` or browser configuration** — rejected; secrets never reach the
  browser bundle.
- **Environment-specific secrets at build time** — rejected; runtime-specific and secret values are
  read at runtime only, preserving same-image promotion.
- **Plaintext secrets in repository app specifications** — rejected; App Platform specifications
  declare names and scopes only.
- **Raw provider credentials in PostgreSQL** — rejected; application tables store logical credential
  references only.
- **Arbitrary configuration keys** — rejected; every operational configuration and feature-flag
  definition is registered.
- **Feature flags as authorization** — rejected; authorization remains owned exclusively by Access
  Control, per [ADR-005](./ADR-005-organization-outlet-authorization.md).
- **One global fail-open/fail-closed policy** — rejected; safety fallback behaviour is
  capability-specific.
- **One kill switch stopping all provider ingestion and reconciliation** — rejected; kill switches
  control initiation only.
- **Dynamic live environment-secret reload** — rejected; environment-secret changes require
  redeployment or restart.
- **External flag SaaS for V1** — rejected/deferred; V1 uses a code-defined registry with
  PostgreSQL-backed overrides.
- **External secret manager for initial V1** — deferred; may be adopted later behind the same
  credential-reference boundary.
- **Percentage and customer-level rollout** — deferred beyond V1's boolean flags.
- **Automatic secret rotation** — deferred; V1 rotation follows the manual sequence above.

## Cross-Reference: ADR-002 Runtime Secrets and Same-Image Promotion

[ADR-002](./ADR-002-environments-ci-cd-release-model.md) fixed that runtime secrets live in
DigitalOcean App Platform environment variables, CI/CD secrets live in GitHub environment secrets,
and the same immutable image is promoted from staging to production. This ADR fixes the concrete
build-time/runtime separation, `NEXT_PUBLIC_` restriction, and secret-classification rules that keep
that promoted image free of environment-specific secrets, and fixes the shared configuration loader
that resolves those DigitalOcean and GitHub-sourced secrets into typed configuration at runtime.

## Cross-Reference: ADR-005 Authorization and Configuration Authority

[ADR-005](./ADR-005-organization-outlet-authorization.md) fixed scoped, permission-based business
authorization. This ADR's authority-separation section reuses that same permission model for
configuration, feature-flag, and kill-switch administration, and explicitly confirms that a feature
flag can never substitute for the authorization checks ADR-005 requires at the application-use-case
boundary.

## Cross-Reference: ADR-009, ADR-011, ADR-012 Provider Credentials

[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md),
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md), and
[ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md) each fixed that Cashfree, delivery-
provider, and WhatsApp provider-account records hold logical credential references rather than raw
credentials, and that staging and production use separate provider accounts and webhook endpoints.
This ADR fixes the general credential-reference model, secret classification, and environment-
matching rules that those three ADRs' provider-account boundaries are built on.

## Cross-Reference: ADR-013 Operational Configuration and Audit Persistence

[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md) fixed the PostgreSQL schema model,
audit persistence shape, optimistic-concurrency column, and transactional outbox that this ADR's
operational configuration, feature-flag override, and configuration-audit sections are built on; no
new persistence conventions are introduced here beyond what ADR-013 already fixes.

## Cross-Reference: ADR-014 Startup, Health, and Public Configuration

[ADR-014](./ADR-014-http-api-route-handlers-contracts.md) fixed `/health/live` and `/health/ready` as
BOBA Bear's health endpoints and the Route Handler HTTP boundary. This ADR fixes what those readiness
checks actually validate (configuration validity, bootstrap completion, database reachability,
migration compatibility) and fixes the shared startup bootstrap, invoked through Next.js
`instrumentation.ts` for the web process, that runs before either endpoint can report a ready
process.

## Related Canonical Documents

- [`architecture-foundation.md`](../architecture-foundation.md) — the modular-monolith and module-
  boundary principles this decision's central configuration boundary applies configuration access
  to.
- [ADR-001](./ADR-001-digitalocean-platform.md) — the DigitalOcean hosting decision this ADR's
  environment-variable, encrypted-secret, and bindable-variable sections apply App Platform scoping
  rules to.
- [ADR-002](./ADR-002-environments-ci-cd-release-model.md) — the environment isolation, same-image
  promotion, and secrets-model decision this ADR's build/runtime separation and DigitalOcean/GitHub
  secret-storage sections extend, per the cross-reference above.
- [ADR-003](./ADR-003-modular-monolith-node-typescript.md) — the module-boundary, dependency-rule,
  and shared web/worker bootstrap decision this ADR's central configuration boundary and startup
  bootstrap are built on.
- [ADR-004](./ADR-004-identity-authentication-sessions.md) — the authentication-secret and session
  configuration this ADR's `AUTHENTICATION_SECRET` classification covers.
- [ADR-005](./ADR-005-organization-outlet-authorization.md) — the permission-based authorization
  model this ADR's authority-separation and feature-flags-are-not-authorization sections build on,
  per the cross-reference above.
- [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md) — the Cashfree provider-account,
  credential, and payment kill-switch context this ADR's credential-reference and kill-switch
  sections cover, per the cross-reference above.
- [ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md) — the delivery-provider account and
  credential context this ADR's credential-reference and kill-switch sections cover, per the
  cross-reference above.
- [ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md) — the WhatsApp Business Account
  and credential context this ADR's credential-reference and kill-switch sections cover, per the
  cross-reference above.
- [ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md) — the PostgreSQL schema,
  audit-persistence, and optimistic-concurrency decision this ADR's operational-configuration and
  audit sections are built on, per the cross-reference above.
- [ADR-014](./ADR-014-http-api-route-handlers-contracts.md) — the Zod-validation, health-endpoint,
  and Route Handler decision this ADR's configuration-validation and readiness sections are built on,
  per the cross-reference above.
- [`roadmap-and-open-decisions.md`](../roadmap-and-open-decisions.md) — the open decisions this ADR
  does not resolve.
- [`decision-register.md`](../decision-register.md) — the structured register entries this ADR
  locks.
- [`README.md`](../README.md) — the canonical documentation index and update protocol.
