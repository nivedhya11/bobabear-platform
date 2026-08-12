---
Status: Accepted
Decision date: 2026-08-02
Last updated: 2026-08-02
---

# ADR-002: Environments, CI/CD, Release, Migration, Secrets, and Rollback Model

## Status

Accepted

## Decision Date

2026-08-02

## Decision Owners

BOBA Bear founder and product leadership

## Context

[ADR-001](./ADR-001-digitalocean-platform.md) established DigitalOcean as the platform's cloud
foundation: DigitalOcean App Platform in Bangalore for the Next.js modular monolith and background
worker, DigitalOcean Managed PostgreSQL in Bangalore for transactional data, DigitalOcean Spaces for
object storage, Docker-based local development, and separate staging and production environments.
That decision fixed the hosting provider and topology but left open how code moves from a
developer's machine to production safely and repeatably: environment isolation, source control and
review process, pull-request validation, how deployable artifacts are built and promoted, which
container registry is used, how and when staging and production are deployed, how secrets are
scoped and stored, how database schema changes are made and evolved, how the shared web/worker
image is operated, how concurrent deployments are prevented from colliding, how deployment health is
verified, and how a bad release is recovered from.

BOBA Bear operates with a sole founder-operator today but is building toward customer accounts,
payments, and order fulfilment — domains where an uncontrolled or unrepeatable release process
creates direct business and customer risk. This ADR resolves the environment, CI/CD, release,
migration, secrets, and rollback model so that implementation work can proceed against a fixed,
predictable process rather than ad hoc or per-change decisions.

## Decision Summary

BOBA Bear will use four environment types — local, CI, staging, and production — with strict
isolation of credentials, data, and configuration between them. Development follows trunk-based
practice: short-lived branches merge into `main` through pull requests validated by automated,
credential-free checks. Every accepted `main` commit produces exactly one immutable OCI image,
published to GitHub Container Registry and tagged with the full Git commit SHA; staging deploys
that exact image automatically after merge, and production deploys the same image digest only
through a manually triggered, tagged release. Database changes use immutable, repository-controlled
migrations following an expand-and-contract evolution pattern, run through a serialized
pre-deployment migration job; database down-migrations are rejected as the routine rollback
mechanism. Runtime secrets and CI/CD secrets are stored and scoped separately, with production
secrets withheld from staging jobs and vice versa. The web application and background worker deploy
from the same image with different startup commands. Deployments are serialized per environment,
health is verified through liveness/readiness endpoints and smoke tests, and rollback favors
redeploying a known-good image or a forward corrective migration over database restore. The
existing GitHub Pages production site remains active and authoritative until an explicit, validated
cutover to the DigitalOcean-hosted production environment.

This is an accepted, final decision for BOBA Bear's environment, CI/CD, and release model — not a
recommendation or a provisional option. It fixes process and structure; it does not select specific
tools such as an infrastructure-as-code framework, a migration framework, or a secrets manager
beyond DigitalOcean and GitHub's own environment mechanisms — see
[Explicit Non-Decisions](#explicit-non-decisions).

## Environment Model

BOBA Bear uses four distinct environment types:

| Environment | Purpose |
| --- | --- |
| Local | Developer and coding-agent implementation |
| CI | Automated validation using temporary services |
| Staging | Hosted integrated validation before production |
| Production | Live customer and kitchen operations |

Staging and production are isolated from each other across every dimension: separate DigitalOcean
App Platform applications, separate Managed PostgreSQL databases, separate Spaces buckets, separate
domains and subdomains, separate database users and credentials, separate application encryption and
signing secrets, separate OTP, payment-provider, WhatsApp, and delivery-provider credentials,
separate webhook endpoints, separate runtime configuration, separate logs, and separate customer and
operational data. Staging must never connect to the production database, and production customer
data must not be copied into staging unless through an explicitly approved anonymization process.

Local development is Docker-based: a Next.js web application, a background-worker process, a
Docker-based PostgreSQL instance, and local or sandbox substitutes for external services. Local
development must not require access to staging or production DigitalOcean resources. The exact
object-storage emulator and other local provider substitutes remain open (see
[Explicit Non-Decisions](#explicit-non-decisions)).

## Git and Branch Model

BOBA Bear uses trunk-based development with short-lived feature or fix branches:

```text
Short-lived feature or fix branch
        ↓
Pull request
        ↓
Automated validation
        ↓
Merge into main
        ↓
Build immutable release image
        ↓
Automatic deployment to staging
        ↓
Staging validation
        ↓
Approved tagged production release
        ↓
Manual production deployment
```

`main` is the only long-lived development branch. Permanent `develop`, `staging`, `release`, or
`production` branches are not introduced.

The intended repository controls on `main` are: a pull request required before merge, required CI
checks passing, the branch current with `main` before merge, review conversations resolved, linear
history, force pushes disabled, and direct pushes by coding agents prohibited. BOBA Bear currently
has a sole operator, so mandatory second-person approval is not required at this stage; the founder
may review and merge after required automated validation passes.

## Pull-Request Validation

Pull-request validation must not require staging or production credentials. The target validation
pipeline is: repository-policy checks, dependency installation from lockfile, formatting validation,
linting, type checking, unit tests, a temporary PostgreSQL instance, database migration validation,
integration tests, a production application build, and container build validation.

As capabilities are implemented, required validation must expand to cover authorization boundaries,
organization and outlet isolation, database constraints, idempotency, payment-state transitions,
order-state transitions, delivery-state transitions, migration compatibility, API contracts,
accessibility, and critical customer journeys.

Persistent staging deployment must not occur from a pull-request branch. Per-pull-request preview
applications are deferred (see [Explicit Non-Decisions](#explicit-non-decisions)).

## Immutable-Artifact Model

BOBA Bear builds exactly one immutable OCI container image per accepted `main` commit:

```text
Accepted main commit
        ↓
Build one OCI image
        ↓
Tag with full Git commit SHA
        ↓
Publish immutable image
        ↓
Deploy exact image digest to staging
        ↓
Validate staging
        ↓
Promote same image digest to production
```

Staging and production do not independently rebuild the application. The deployed image digest is
authoritative. Mutable tags such as `latest` must not be used as the sole production deployment
reference. A production image may also receive a semantic-version tag, but deployment traceability
must retain the Git commit SHA, the OCI image digest, the release version, the migration version,
and the deployment timestamp.

## Registry Decision

BOBA Bear uses **GitHub Container Registry** (`ghcr.io`) as the initial OCI registry. GitHub Actions
builds and publishes images, tagged with the complete Git commit SHA; staging and production deploy
the same digest; registry credentials use the minimum permissions required. The registry may be
replaced later without affecting the business domain. The registry is not implemented or configured
as part of this documentation decision.

## Application-Specification Boundary

DigitalOcean App Platform configuration will be represented declaratively in the repository, under
an `infra/digitalocean/` structure describing the web component, worker component, pre-deployment
migration job, Bangalore region, OCI image reference, health checks, routing, scaling configuration,
non-secret environment-variable names, and deployment alerts.

Persistent data resources must not be placed under an application-specification lifecycle that could
accidentally destroy them. Application deployment configuration must not automatically create or
destroy production Managed PostgreSQL databases, Spaces buckets, domains, external provider
accounts, or payment accounts. Full infrastructure-as-code management remains deferred. These files
are not created as part of this documentation-only decision.

## Staging Deployment

DigitalOcean App Platform's uncontrolled deploy-on-push behavior is disabled. Deployments are
initiated through GitHub Actions after required checks succeed. A successful merge to `main`
eventually: runs all required CI checks, builds the OCI image, tags it with the full Git commit SHA,
pushes it to GitHub Container Registry, applies the staging App Platform specification, runs the
staging pre-deployment migration job, deploys the immutable image to staging, runs automated staging
smoke tests, records the deployed commit and image digest, and marks the deployment successful or
failed. Staging deployment is automatic after successful `main` validation.

## Production Release

Production does not deploy automatically on every merge. A production release requires: the exact
commit and image digest have successfully run in staging; required staging validation is complete;
an annotated semantic-version Git tag is created; a manually triggered GitHub Actions production
workflow is started; the GitHub `production` environment checkpoint is passed; the exact staged
image digest is confirmed; production migration pre-checks pass; the same staged image digest is
deployed; production smoke tests pass; and release and deployment evidence are recorded. This
checkpoint requires an intentional release action even while BOBA Bear has a sole operator.

## Semantic Versioning

BOBA Bear uses semantic versioning for production releases. Before the first public sellable
release: `v0.1.0`, `v0.2.0`, `v0.3.0`. The first public sellable release is `v1.0.0`. After public
launch: `PATCH` for a backward-compatible defect or security correction, `MINOR` for a
backward-compatible capability, and `MAJOR` for an intentionally incompatible platform contract. Not
every merge to `main` receives a semantic-version tag. Every production deployment must be traceable
to a Git tag, Git commit SHA, OCI image digest, database migration version, deployment time,
deployment operator, release notes, and validation evidence.

## Migration Strategy

Database changes use immutable, repository-controlled migrations. Applied migrations are never
edited; corrections use new migrations. Every migration runs against a fresh database in CI and is
tested against the current schema state. Production migrations run before the new application
version receives traffic; a failed migration blocks deployment. Only one migration process may run
per environment, enforced by an advisory or equivalent lock. Runtime application credentials and
migration credentials are kept separate, and migration output must not expose credentials or
customer data.

Each hosted environment uses a serialized pre-deployment migration job that runs once per
deployment, completes before the new application receives traffic, stops the deployment on failure,
records the migration version, and prevents concurrent migration execution.

Schema evolution follows an expand-and-contract approach:

```text
Release A: add backward-compatible schema
Release B: deploy code that supports and uses it
Release C: stop using obsolete schema
Release D: remove obsolete schema
```

For example: add a nullable column before making it mandatory; add a new table before moving reads
or writes; backfill data through a controlled process; remove obsolete schema only after no deployed
application version depends on it.

Routine database down-migrations are rejected as the primary rollback mechanism. Preferred recovery
is to redeploy a previous compatible application image or apply a forward corrective migration.
Database restore is a disaster-recovery operation, not a normal release rollback.

## Secrets Model

Runtime application secrets are stored as encrypted DigitalOcean App Platform environment variables
— for example, database runtime credentials, authentication secrets, encryption keys, OTP
credentials, payment credentials, WhatsApp credentials, delivery-provider credentials, storage
credentials, and webhook verification secrets. No real values or realistic placeholders are recorded
in this documentation.

GitHub stores only secrets required for build and deployment, such as a DigitalOcean deployment
token, staging and production application identifiers, registry credentials where required, and
CI-only test credentials. Every runtime secret is not duplicated into GitHub.

DigitalOcean deployment tokens use least-privilege custom scopes, allow only required application
deployment actions, avoid database credential visibility, avoid unnecessary console access, have a
defined expiration, are rotated, and are revoked after suspected exposure.

Public, non-sensitive configuration may appear in application specifications. Secrets are never
committed. `.env.example` contains names and safe descriptions only, and local `.env` files remain
gitignored. Server secrets never use the `NEXT_PUBLIC_` prefix, and browser-visible values are never
treated as secrets. Secrets are supplied at runtime rather than embedded in OCI image layers, and
required configuration is validated during application startup; invalid or incomplete critical
configuration fails clearly.

The exact secret-management tooling beyond DigitalOcean and GitHub environments remains open (see
[Explicit Non-Decisions](#explicit-non-decisions)).

## Web and Worker Deployment

The web application and background worker use the same immutable OCI image, differing only in
startup command:

```text
Same immutable image
├── Web startup command
└── Worker startup command
```

The components share domain models, database migrations, integration adapters, validation rules,
configuration conventions, and logging and observability conventions. They differ by startup
command, process lifecycle, operational responsibilities, and scaling configuration. The exact queue
and background-job technology remains open (see [Explicit Non-Decisions](#explicit-non-decisions)).

## Deployment Concurrency

Only one active deployment may modify an environment at a time. A newer staging deployment may
cancel an older queued staging deployment if migration execution has not begun. Production
deployments are serialized and must never be automatically cancelled after their migration phase
begins. Concurrency controls must eventually exist at the GitHub Actions workflow level, the GitHub
environment level, and the database migration-lock level.

## Health and Smoke Testing

The application eventually exposes `/health/live` and `/health/ready`. Liveness confirms the
application process is running and must not fail merely because every external provider is
unavailable. Readiness confirms the instance can safely receive traffic and may verify required
configuration validity, database connectivity, migration compatibility, and critical internal
dependencies. Health endpoints must not expose secrets, customer data, database details, or internal
stack traces.

Initial staging smoke tests verify that the public homepage loads, static assets load, the
customer-login entry point loads, menu retrieval succeeds, the Operations Console login entry point
loads, database-backed readiness succeeds, and no schema or migration mismatch exists. As
implementation progresses, smoke coverage expands to creating or using a test customer, resolving a
serviceable outlet, building a customized cart, performing sandbox checkout, simulating successful
payment, receiving the direct order in the Operations Console, updating preparation status, and
verifying customer order tracking. Production smoke tests must avoid creating uncontrolled real
financial or fulfilment activity.

## Rollback Strategy

Primary application rollback is to redeploy the previous known-good OCI image digest; DigitalOcean
App Platform's own deployment rollback is a secondary emergency capability. Application rollback is
appropriate when the current schema remains backward compatible, the problem is isolated to
application code or configuration, and the prior version can safely operate against the current
database. A forward fix is used instead when a migration is not backward compatible, new data has
been written in a model the prior version cannot interpret, or rollback could corrupt or mis-handle
orders, payments, refunds, or deliveries.

When a production incident threatens order or payment integrity: disable new checkout where
necessary; preserve existing order and payment data; stop unsafe worker processing; record the
incident; deploy a known-good application version or forward correction; reconcile affected payments
and orders; and reopen checkout only after validation. Exact incident-response procedures are
documented in a later operational-resilience slice (see
[Explicit Non-Decisions](#explicit-non-decisions)).

## GitHub Pages Transition

The current GitHub Pages production site remains active while the transactional platform is
developed:

```text
Current production:
thebobabear.in → GitHub Pages

Development:
staging.thebobabear.in → DigitalOcean staging

Pre-launch:
Temporary DigitalOcean production URL or controlled production subdomain

Commercial launch:
thebobabear.in → DigitalOcean production
```

Before production cutover: validate DigitalOcean production independently; reduce DNS
time-to-live before migration; record the final deployment configuration; validate HTTPS,
redirects, SEO metadata, and ordering flows; disable the old GitHub Pages automatic production
publication; retain the former static deployment temporarily as a rollback reference; and prevent
both platforms from independently publishing different production versions. The detailed DNS and
cutover procedure remains open (see [Explicit Non-Decisions](#explicit-non-decisions)).

## Consequences

### Positive

- Every production release is traceable to an exact commit, image digest, migration version, and
  operator, closing the gap left open by ADR-001's deployment topology.
- Staging and production run byte-identical images, eliminating "works in staging, fails in
  production" caused by independent rebuilds.
- Production deployment requires a deliberate, auditable action even with a sole operator, reducing
  the chance of an accidental or unreviewed production change.
- Expand-and-contract migrations and image-based rollback keep the primary recovery paths safe for
  order and payment data.
- Environment and secret isolation limits the blast radius of a staging compromise or misconfiguration
  on production data and credentials.

### Trade-offs accepted

- Production releases require additional manual steps (tagging, environment checkpoint, digest
  confirmation) rather than fully automatic promotion, trading release velocity for release safety.
- Maintaining separate staging and production DigitalOcean resources, credentials, and secrets
  increases operational surface area relative to a single shared environment.
- The pre-deployment migration job and serialized deployment model add build and release pipeline
  complexity that must be implemented and maintained.
- GitHub Container Registry, while adequate as an initial registry, is treated as replaceable rather
  than a permanent commitment, deferring any registry-specific optimization.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| A production deployment is triggered without staging validation | Production release requires confirmation that the exact commit and digest ran successfully in staging, plus a manual environment checkpoint |
| A non-backward-compatible migration blocks a safe application rollback | Expand-and-contract evolution is required; routine down-migrations are rejected as the rollback mechanism in favor of forward fixes or image redeploys |
| Concurrent deployments corrupt migration state or leave an environment inconsistent | Serialized deployment per environment, an advisory or equivalent migration lock, and rules against cancelling a production deployment mid-migration |
| Staging or CI credentials leak into production, or vice versa | Distinct GitHub environments and DigitalOcean applications with environment-scoped secrets; production secrets withheld from staging jobs and vice versa |
| GitHub Pages and DigitalOcean production independently publish different content during transition | Reduced DNS TTL before cutover, disabling GitHub Pages automatic publication at cutover, and an explicit rule against both platforms publishing production simultaneously |
| A deployment token with excessive scope is exposed | Least-privilege custom token scopes, defined expiration, rotation, and revocation after suspected exposure |

## Explicit Non-Decisions

This decision does not resolve the following, which remain **Open** or **Deferred** and must not be
treated as answered by this ADR:

- Customer authentication implementation
- OTP provider
- Queue and background-job technology
- Realtime communication approach
- Observability provider
- Exact DigitalOcean instance sizes
- Exact database size
- Exact storage capacity
- Backup-retention duration
- Disaster-recovery objectives
- Infrastructure-as-code tooling
- Extended secret-management tooling beyond DigitalOcean and GitHub environments
- Per-pull-request preview environments
- Exact DNS migration procedure
- Exact incident-response runbook
- Exact production smoke-test data strategy
- Exact App Platform specification syntax
- Exact migration framework and ORM
- Exact deployment-token scopes
- Exact container-build implementation

## Cross-Reference: ADR-013 Migration Mechanics

[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#migration-deployment) resolves the
"exact migration framework and ORM" left open above. Staging and production schema changes are
applied only by the serialized predeployment migration job fixed by this ADR, and applied migration
history is immutable — a migration that has run in a shared environment is never edited or removed,
and corrections ship as new migrations. `drizzle-kit push` is prohibited for every shared
environment and is permitted only against a disposable personal scratch database, per
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#push-command-policy). The migration
job uses a direct database connection and a dedicated migration role rather than the runtime pooled
connection and runtime role, per
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#database-roles). Schema definitions
and migration files are ordinary repository artefacts and promote through environments inside the
same immutable release artefact this ADR already requires.

## Cross-Reference: ADR-015 Configuration and Secrets

[ADR-015](./ADR-015-configuration-secrets-feature-flags.md) fixes the concrete configuration-loading,
build-time/runtime separation, and secret-classification rules built on top of the environment
isolation, same-image promotion, and DigitalOcean/GitHub secrets model fixed here; it does not
change where runtime secrets or CI/CD secrets are stored.

## Related Canonical Documents

- [ADR-001](./ADR-001-digitalocean-platform.md) — the cloud hosting foundation this decision builds
  the release process on top of.
- [ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md) — the persistence and migration
  decision that fixes the migration toolchain, immutable migration history, push prohibition, and
  migration connection and role model this ADR's release process executes, per the cross-reference
  above.
- [ADR-014](./ADR-014-http-api-route-handlers-contracts.md) — the HTTP API and Route Handler
  decision for the application this release process deploys.
- [ADR-015](./ADR-015-configuration-secrets-feature-flags.md) — the configuration and secrets
  decision that fixes the runtime configuration loader, build/runtime separation, and secret-storage
  detail built on top of the environment isolation and secrets model fixed here, per the
  cross-reference above.
- [`architecture-foundation.md`](../architecture-foundation.md) — the architectural principles this
  decision satisfies.
- [`roadmap-and-open-decisions.md`](../roadmap-and-open-decisions.md) — the open decisions this ADR
  does not resolve.
- [`decision-register.md`](../decision-register.md) — the structured register entries this ADR
  locks.
- [`README.md`](../README.md) — the canonical documentation index and update protocol.
