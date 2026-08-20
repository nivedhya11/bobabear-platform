---
Status: SUPPORTING
Authority: Accepted foundation operating constraints (not roadmap/state)
Canonical sequence: docs/platform/ROADMAP.md
Canonical accepted state: docs/platform/STATE.md
Canonical architecture: docs/platform/ARCHITECTURE.md
Last updated: 2026-08-18
---

# Accepted foundation operating constraints

This document preserves slice-specific operating rules from the pre-governance `AGENTS.md`
body so unique accepted evidence is not destroyed. It is **SUPPORTING**, not an independent
roadmap, state, or architecture authority.

For CURRENT IMP sequence and acceptance, use `ROADMAP.md` and `STATE.md`.

---

## Configuration and startup foundation (ADR-015 / IMP-003)

`src/platform/config/` is the single centralized, typed, environment-aware configuration boundary
for BOBA Bear platform code (as distinct from the two pre-existing `NEXT_PUBLIC_*` marketing-site
overrides described in the README, which predate this boundary and are an explicit, documented
exception below). `src/platform/startup/` builds on it with an idempotent process-startup bootstrap,
wired into Next.js via `src/instrumentation.ts`.

- **Add configuration through the central schema** (`src/platform/config/schema.ts`), not ad hoc.
  Every new variable needs: a schema entry, a default (if optional) per `AppEnvironment`, an entry
  in both `.env.example` and `.env.test`, tests covering it (valid/invalid/default cases), and this
  file updated if it changes a rule described here.
- **Do not read `process.env` in application modules.** Only `src/platform/config/**` and
  `src/instrumentation.ts` may. This is enforced by an ESLint `no-restricted-properties` rule and by
  `npm run audit:config` (`scripts/audit-config-boundary.mjs`). Tests use explicit source objects
  instead of mutating the real environment.
- **Do not expose values through `NEXT_PUBLIC_*` without approval.** The allowlist
  (`src/platform/config/public-config.ts`) is empty by default. Adding a browser-visible value
  requires a schema entry, an allowlist entry, tests, documentation, and a security review of its
  build-time exposure — all before the variable is used, not after.
  `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_GA_MEASUREMENT_ID` (`src/lib/site.ts`,
  `src/components/Analytics.tsx`, `.github/workflows/deploy.yml`) predate this boundary and are
  deliberately *not* migrated into it or into the new catalogue — they are out of scope for a given
  platform-foundation slice unless that slice's task explicitly says otherwise. Treat any other
  direct `NEXT_PUBLIC_*`/`process.env` usage you find outside the boundary as a blocker to report,
  not something to silently fix.
- **Never log environment sources or secrets.** Use `ConfigurationError` (safe issue lists only) and
  `formatSafeSummary()`/`toSafeSummary()` (an explicit allowlist of fields) for anything printed to a
  log or CLI. Never `console.log(process.env)`, `JSON.stringify(config)`, or attach a raw Zod error
  to output.
- **Update `.env.example`, `.env.test`, tests, and audit rules together when adding a variable.**
  A variable that exists in the schema but not in both env files (or vice versa) is a bug.
- **Process-specific variables belong only to their process schema.** `PORT` is web-only; do not
  read it for `worker` or `migration`. Future worker/migration-specific variables follow the same
  rule — extend that process kind's schema, not the shared base.
- **Do not weaken production safeguards.** `staging`/`production` require HTTPS + non-loopback
  `BOBA_BEAR_PUBLIC_ORIGIN`, a `BOBA_BEAR_RELEASE`, and `BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS=false`. Do
  not add a bypass, default-to-permissive fallback, or environment alias that weakens these.
- **Work from the WSL Linux filesystem** (`/home/.../repos/boba-bear-platform`, not a `/mnt/c/...`
  mount) — Turbopack/webpack module resolution and file-watching are unreliable across the WSL/NTFS
  boundary.

## Local PostgreSQL and Drizzle foundation (IMP-004)

`src/platform/database/` is the single centralized database boundary (schema declaration, client
factory, connection options, migration runner, connectivity checks). `compose.yaml` and
`docker/postgres/init/` provide a local-only PostgreSQL 18.4 instance. This is infrastructure only —
no business-domain table exists yet.

- **All tables belong to an explicitly approved schema.** Business tables live in `app`
  (`src/platform/database/schema/index.ts`, via `appSchema`), never in `public`, and never directly
  through the bare Drizzle `pgTable` helper.
- **Business tables require their own implementation slice.** IMP-004 is infrastructure-only —
  do not add a users/customers/tenants/outlets/orders/products/menu/auth/audit/feature-flag/job table
  here or in any migration this slice produces.
- **Never use the bootstrap administrator (`boba_bear_admin`) from application code.** It exists only
  for the Postgres container's own initialization scripts.
- **Runtime code must not use migration credentials.** The web/worker processes only ever read
  `BOBA_BEAR_DATABASE_URL` (the `boba_bear_app` role); only `scripts/database/migrate.ts` and
  `db:generate` use `BOBA_BEAR_DATABASE_MIGRATION_URL` (the `boba_bear_migrator` role).
- **Migrations are generated SQL committed to the repository** (`./drizzle/*.sql`, via
  `npm run db:generate`). Never hand-edit a migration that has already been applied anywhere; add a
  new one instead.
- **Never use `drizzle-kit push`.** Schema changes always ship as committed, reviewed SQL migrations
  — `npm run audit:database` fails the build if `push` appears in any package script.
- **Never run migrations automatically during web startup.** `src/instrumentation.ts` must not call
  `runMigrations()`. Migrations are a separate, explicit, human- or CI-triggered command.
- **Never log connection URLs.** Use `DatabaseError`/`toSafeDatabaseError()` (safe messages/codes
  only) and the safe connection-options summary. Never attach a connection string to an error object,
  a log line, or a CLI success message.
- **Never commit local database env files.** `.env.docker.local` is git-ignored and holds generated
  local credentials; only `.env.docker.example` (placeholders only) is committed.
- **Never reset a database without explicit confirmation.** `npm run db:reset` requires
  `-- --confirm=RESET_BOBA_BEAR_LOCAL_DATABASE` verbatim and refuses to run against a non-local
  `BOBA_BEAR_ENV`.
- **Work from the WSL Linux filesystem** for this too — Docker bind-mount performance and
  file-permission semantics are unreliable across the WSL/NTFS boundary.
- **Keep database access inside the platform database boundary.** No application module outside
  `src/platform/database/**` may import `pg` or `drizzle-orm/node-postgres`, construct a `Pool`, or
  read `BOBA_BEAR_DATABASE_*` via `process.env` directly — enforced by ESLint restrictions and
  `npm run audit:database` (`scripts/audit-database.mjs`).

## Database test and migration validation (IMP-005)

`tests/database/` is the PostgreSQL integration-test harness (Testcontainers, `postgres:18.4-trixie`)
and `scripts/database/check-migration-history.mjs` / `check-schema-drift.mjs` / `seal-migrations.mjs`
are the migration-integrity tooling built on top of IMP-004. No business-domain table exists yet.

- **PostgreSQL integration tests are authoritative.** Do not substitute SQLite, PGlite, or a mocked
  database for anything claiming database-integration coverage — always a real, disposable
  PostgreSQL 18 instance provisioned by Testcontainers.
- **Every migration must replay cleanly on a fresh PostgreSQL 18 database.** `npm run test:database`
  proves this from an empty database, not by assuming previously-applied state.
- **Historical sealed migration SQL is immutable.** Once a migration's hash is sealed in
  `drizzle/migration-integrity.json`, its SQL file must never change; add a new migration instead of
  editing an applied one (this restates the IMP-004 rule above with an enforced hash check).
- **New migrations must pass all three gates before merge:** `npm run db:migrations:check` (journal +
  integrity manifest), `npm run db:schema:check` (no drift vs. the current schema), and
  `npm run test:database` (real Testcontainers replay).
- **New migrations must be sealed explicitly.** `npm run db:migrations:seal -- --confirm=SEAL_NEW_BOBA_BEAR_MIGRATIONS`
  — sealing is never automatic on generation, and the confirmation token must match exactly.
- **Integration tests must use isolated databases.** Every test that touches PostgreSQL creates its
  own uniquely-named database (`tests/database/support/test-database.ts`) and drops it afterward —
  never share state across tests.
- **Never use the developer's local Compose database for automated integration tests.** Testcontainers
  always provisions its own container on a dynamically-assigned port, distinct from the local
  Compose database's fixed port 5433.
- **Never silently skip Docker-backed validation.** If Docker is unavailable, `npm run test:database`
  must fail non-zero — never skip, warn, or fall back to an in-memory/mocked database.
- **Do not introduce Testcontainers into production source or outside `tests/database/**`.** It is a
  development-only dependency; `npm run audit:database` enforces the import boundary.
- **Never use `drizzle-kit push`** here either — restates the IMP-004 rule; the migration-history
  checker (`check-migration-history.mjs`) also scans committed migration SQL for it.
- **No business table may be added outside its own approved implementation slice** — IMP-005 is test
  and migration-assurance tooling only.

## Dockerized local application runtime (IMP-005A)

`Dockerfile`, `docker/nginx/`, and the `app`/`migrate`/`db-check`/`db-check-migration` Compose
services provide a local Docker Desktop runtime for the existing static site alongside the IMP-004
PostgreSQL foundation. This is a packaging slice — the application is still `output: "export"`,
still has no HTTP API, and still has no business-domain table.

- **Docker Desktop is the approved local container runtime** for this slice's validation. It does
  not replace `npm run dev`/`npm run check`/`npm run verify`, which remain Docker-independent.
- **Work from the native WSL Linux filesystem**, not a `/mnt/c/...` mount — restates the IMP-003/
  IMP-004 rule above; Docker builds, bind mounts, and (separately) Vitest's jsdom worker startup are
  all measurably slower or unreliable across the WSL/NTFS boundary.
- **The `app` (Nginx) container must never receive database credentials while it stays static.** No
  `env_file`, no `BOBA_BEAR_DATABASE_*`, no `POSTGRES_*` variable, ever, on that service. Database
  connectivity is proven only from the separate `tooling` image's one-shot containers.
- **Migrations run only in the `migrate` Compose service** (`docker compose run --rm migrate`,
  `npm run docker:migrate`). Never run a migration from Nginx startup, never add an automatic
  migration step to the `app` service, and never run one from `src/instrumentation.ts` — restates
  the IMP-004 rule for the new container context.
- **Never bind-mount repository source into the `app` container.** It runs the image's already-built
  static export (`/usr/share/nginx/html`, copied at build time) — no `./src`, `./public`, or `./out`
  volume mount, in development or otherwise.
- **Never copy a local env file into an image.** `.env.local`, `.env.docker.local`,
  `.env.runtime.docker.local`, and `.env.migration.docker.local` are excluded by `.dockerignore` and
  are never named in a `COPY` instruction. Runtime/migration credentials reach a tooling container
  only via Compose `env_file` at `docker compose run` time.
- **Never use a floating image tag.** `Dockerfile` and `compose.yaml` pin exact versions
  (`node:22.23.1-bookworm-slim`, `nginx:1.30.4-alpine3.24`, `postgres:18.4-trixie`) — no `latest`, no
  bare `node`/`nginx`/`postgres`. `npm run audit:docker` enforces this statically.
- **Never expose the Docker socket or run a container privileged.** No service mounts
  `/var/run/docker.sock`, sets `privileged: true`, or uses `network_mode: host`.
- **`npm run docker:down` must preserve PostgreSQL data.** It runs
  `docker compose down --remove-orphans` only — never `--volumes`. Destroying the local database is
  the pre-existing, separate, explicit `npm run db:reset -- --confirm=RESET_BOBA_BEAR_LOCAL_DATABASE`
  action (IMP-004), never something a Docker lifecycle command does on your behalf.
- **Tooling services (`migrate`, `db-check`, `db-check-migration`) use the Compose `tools` profile**
  and must never start with a plain `docker compose up` — only via `docker compose run --rm
  <service>` or the corresponding `npm run docker:*` script.
- **No business table or HTTP API may be added in this slice** — IMP-005A is local runtime and
  packaging only.

## Shared persistence primitives (IMP-006)

`src/server/persistence/` is the reusable, typed, server-only persistence boundary that future
repository modules build on. It is infrastructure only — no business-domain table exists yet, and
no new migration ships with it.

- **`getApplicationPersistence(config)`** (accepts a `WebConfig` or `WorkerConfig` from
  `src/platform/config`) and **`getMigrationPersistence(config)`** (accepts a `MigrationConfig`) are
  the only two public factories. There is no generic `getPersistence(role, config)`, no factory that
  accepts a raw connection string, and no bootstrap/admin factory anywhere in this module. Passing
  the wrong configuration shape (e.g. a `MigrationConfig` to `getApplicationPersistence`) throws a
  secret-safe `PersistenceConfigurationError` at runtime — `processKind` is checked, not just typed.
- **Reuses `src/platform/database`'s existing `pg`/Drizzle client factory.** `src/server/persistence`
  never imports `pg` or `drizzle-orm/node-postgres` itself — it is not a second database boundary,
  just a lazy, role-scoped wrapper around the existing one.
- **Lazy and shared.** Calling a factory never opens a socket. The underlying pool is created on the
  first `withContext`/`transaction`/`checkAvailability` call, and the same configuration *object*
  (by identity, via a per-role `WeakMap`) reuses the same handle and pool — a structurally identical
  but different configuration object gets its own handle.
- **Explicit shutdown.** `await persistence.close()` is idempotent, safe before first use, and safe
  to call twice. After closing, requesting persistence again for the same configuration object
  creates a fresh handle. Nothing here registers a process-wide signal handler; callers (tests,
  worker shutdown, tooling) must call `close()` themselves.
- **Typed contexts, not a raw pool.** `withContext`/`transaction` callbacks receive a
  `PersistenceQueryContext`/`PersistenceTransactionContext` — a role tag plus a typed Drizzle
  executor. A future repository should accept one of these as a parameter rather than importing a
  persistence factory itself; this is what lets a repository run inside a transaction its caller
  started, without ever touching a pool directly. `transaction` is intentionally not part of that
  context's type, so accepting a context does not, at the type level, invite starting a *nested*
  transaction — nested transactions are unsupported in this slice, and there is no automatic retry.
- **Errors never carry a connection string, password, host, or raw driver message.** Every thrown
  error is one of `PersistenceConfigurationError` / `PersistenceUnavailableError` /
  `PersistenceClosedError` / `PersistenceOperationError`, each with only a safe message, an optional
  Postgres SQLSTATE, and a `transient` flag.
- **`import "server-only"`** on `src/server/persistence/index.ts` keeps this boundary out of any
  client bundle, matching the enforcement `src/platform/database` already has for `pg`. Because the
  real `server-only` package throws unless the `react-server` resolver condition is active (which
  only Next.js's server compilation sets), plain Node consumers of this boundary need that condition
  explicitly: `scripts/database/check.ts` is invoked as `node --conditions=react-server --import tsx
  ...` (see its `db:check`/`db:check:migration` package scripts), and Vitest aliases `server-only` to
  a no-op stub (`tests/setup/server-only-stub.ts`) for tests only — the real Next.js client-bundle
  guard is untouched by that alias.
- **`npm run audit:persistence`** (`scripts/audit-persistence.mjs`) is a Docker-independent static
  check, wired into `npm run check`, that scans every tracked *and* untracked file (via `git
  ls-files --cached --others --exclude-standard`) for: a `"use client"` module or `src/app/**`/
  `src/components/**` module importing the persistence boundary; a missing `server-only` marker on
  the entry point; a bootstrap/admin or generic role-selecting factory; a hardcoded
  `postgresql://` URL outside a test fixture; a new `NEXT_PUBLIC_*` database variable; or application
  code referencing the migration-role factory.
- **First consumer:** `scripts/database/check.ts` (`db:check` / `db:check:migration` /
  `docker:db:check` / `docker:db:check:migration`) now obtains its client through
  `getApplicationPersistence`/`getMigrationPersistence` instead of calling the low-level database
  client factory directly, and always closes its persistence handle before exiting. The migration
  execution CLI (`scripts/database/migrate.ts`) is unchanged — it never imports this boundary.
- **No repository framework.** This slice supplies primitives only — no generic CRUD repository, no
  base repository class, no unit-of-work/service-locator abstraction. A *future* repository module
  would look roughly like:

  ```ts
  import type { PersistenceQueryContext } from "@/server/persistence";

  export async function findWidgetById(ctx: PersistenceQueryContext, id: number) {
    // ctx.db is the typed Drizzle executor; ctx never came from a global pool.
  }
  ```

  (`Widget` is a placeholder — no such table or repository exists; business-domain persistence is
  its own future implementation slice.)

## Transactional outbox and idempotency (IMP-007)

`app.outbox_events` and `app.idempotency_records` are two technical persistence tables — a
transactional outbox and a hashed-key deduplication store — built on the IMP-006 persistence
boundary. This slice is infrastructure only: no domain event, publisher, worker, or business-domain
table is introduced. Delivery is **at-least-once**, never exactly-once — a claimed-but-never-published
outbox event is reclaimable once its lease expires, so any future consumer of this table must be
idempotent (that is exactly what the idempotency store exists for).

- **`src/server/persistence/outbox/`** enqueues, claims, transitions, and cleans up outbox events.
  `enqueueOutboxEvent(transactionContext, input)` requires a context from `Persistence.transaction()`
  — never a plain `withContext` query context, never a migration-role context — so a domain change and
  its outbox row commit or roll back atomically. Because IMP-006's `PersistenceTransactionContext` and
  `PersistenceQueryContext` are the same type (deliberately — see IMP-006 above), that requirement is
  enforced by `src/server/persistence/context-kind.ts`, a small runtime brand attached only inside
  `createPersistenceHandle`'s `transaction()` path (`handle.ts`) — invisible to `JSON.stringify`,
  object spreads, and every existing IMP-006 test, and checked (not merely typed) by
  `enqueueOutboxEvent`. `claimOutboxBatch` claims eligible events (`pending` and due, or `processing`
  with an expired lease) with one atomic `FOR UPDATE SKIP LOCKED` statement, so two concurrent
  claimers never receive the same live-leased event; `markOutboxPublished` /
  `releaseOutboxForRetry` / `markOutboxDeadLetter` each compare `id` + `status = 'processing'` +
  `lease_token` in their own single `UPDATE`, so a stale lease can never mutate a record. Retry timing
  and backoff are entirely caller-decided — this module never retries or schedules anything itself.
  `deletePublishedOutboxEvents` / `deleteDeadLetterOutboxEvents` are explicit, bounded (max 500),
  caller-invoked cleanup operations — nothing here runs on a timer.
- **`src/server/persistence/idempotency/`** deduplicates future command/request execution by hashed
  key. `hashIdempotencyKey`/`hashRequestFingerprint` (`node:crypto` `sha256`, hex) are the only place a
  raw idempotency key or raw canonical request material may be touched — only their digests ever
  reach `acquireIdempotencyRecord`, `completeIdempotencyRecord`, `failIdempotencyRecord`, and
  `deleteExpiredIdempotencyRecords`, and neither raw value is ever stored, logged, or returned.
  `acquireIdempotencyRecord` is one atomic `INSERT ... ON CONFLICT (namespace, key_hash) DO UPDATE
  ... WHERE ...` statement (plus, only on that statement's no-op path, one classification `SELECT` —
  never load-bearing for correctness) that returns exactly one of four outcomes: `acquired`
  (fresh, or a reclaimed expired-lease `in_progress` record — `reclaimed: true`/`false`
  distinguishes them), `in_progress` (another owner's lease is still live), `completed` (a terminal
  `completed`/`failed` result, replayed), or `conflict` (the same key with different request material,
  while unexpired). A terminal `failed` result remains replayable through the `completed` outcome
  until the record's own `expires_at` — callers decide whether/how to retry, this module only records
  outcomes.
- **Server-only, application-role only.** Both modules' `index.ts` carry `import "server-only"`, same
  as `src/server/persistence`. Every operation accepts an IMP-006 application-role context — never
  imports `pg`/`drizzle-orm/node-postgres` directly, never calls `createDatabaseClient`, never
  acquires its own persistence handle, never uses the migration-role factory.
- **`npm run audit:outbox-idempotency`** (`scripts/audit-outbox-idempotency.mjs`), wired into `npm run
  check`, is the IMP-007-specific complement to `audit:persistence`: it additionally checks that
  `enqueueOutboxEvent`'s exported signature names `PersistenceTransactionContext` (not a plain query
  context), that no outbox/idempotency production module logs (`console.*`) or contains an automatic
  retry/poll/cron construct (`setInterval`, `setTimeout`, `while (true)`, `cron.schedule`), that no
  broker/publisher/worker dependency or import exists (Kafka, AMQP, RabbitMQ, SQS/SNS, Redis, BullMQ,
  Temporal, node-cron, or similar), and that every previously-sealed migration's hash is unchanged.
- **Schema:** `src/platform/database/schema/outbox-events.ts` and `idempotency-records.ts` declare the
  two tables through `appSchema.table(...)` (never the bare `pgTable` helper), each with named `CHECK`
  constraints enforcing per-status field consistency (e.g. an `outbox_events` row cannot be
  `processing` without a lease, or `published` without `published_at`), plus the indexes needed for
  claim/lookup/cleanup and — for `idempotency_records` — a `UNIQUE` index on `(namespace, key_hash)`
  (a `CREATE UNIQUE INDEX`, not a formal `ALTER TABLE ... ADD CONSTRAINT`; Postgres does not require
  the latter for `ON CONFLICT` to target it). `drizzle/0001_transactional_outbox_idempotency.sql` is
  the one generated migration; it does **not** hardcode a `GRANT ... TO boba_bear_app` — that role
  does not exist in a bare Testcontainers-provisioned database, and this migration must replay
  cleanly there too. The real `boba_bear_app` role's SELECT/INSERT/UPDATE/DELETE access comes from the
  `ALTER DEFAULT PRIVILEGES` statement already in `docker/postgres/init/001-bootstrap.sh` (IMP-004),
  which applies automatically to every future table the migrator creates in `app`.
- **No worker, publisher, or HTTP API exists yet.** Claiming, publishing, and retrying are all
  caller-invoked function calls — there is no background process, no message broker, and nothing here
  is reachable from the static public app tree (`src/app/**`, `src/components/**`).

## Better Auth persistence and sessions (IMP-008)

`src/server/auth/` is a server-only, database-backed Better Auth 1.6.25 foundation with two fully
isolated authentication realms — **customer** and **workforce**. A person may hold both a customer and
a workforce identity; this slice deliberately does not link them, so the two realms never share a
user, session, secret, or table. This is a persistence/session foundation only — no login UI, no HTTP
route, no credentials flow, no roles/permissions, and no customer/employee profile data.

- **Pinned exact versions:** `better-auth@1.6.25`, `@better-auth/drizzle-adapter@1.6.25`, and the
  `auth` CLI at `1.6.25` — never a caret/tilde range, never `@latest`, never a v1.7 beta. `auth` is a
  devDependency (schema generation only); the other two are runtime dependencies.
- **Realm constants** (`src/server/auth/shared/constants.ts`) are locked, technical constants, not
  environment configuration:
  ```text
  customer:   basePath=/api/auth/customer   cookiePrefix=boba-customer
  workforce:  basePath=/api/auth/workforce  cookiePrefix=boba-workforce
  ```
  The same file declares the shared `AUTH_SESSION_POLICY` (7‑day expiry, 24‑hour refresh, 5‑minute
  freshness, database-persisted sessions, refresh enabled, cookie cache disabled, no secondary
  storage, no stateless/JWT/JWE mode) used by both realms.
- **Configuration boundary** (`src/server/auth/shared/config.ts`) is a second, narrow config boundary
  alongside `src/platform/config` — deliberately *not* folded into `AppConfig`/`WebConfig`, because its
  four variables (`CUSTOMER_AUTH_SECRET`, `CUSTOMER_AUTH_BASE_URL`, `WORKFORCE_AUTH_SECRET`,
  `WORKFORCE_AUTH_BASE_URL`) are not `BOBA_BEAR_*`-prefixed and are orthogonal to process kind. It
  never reads the real environment itself — callers pass an explicit source object and the caller's
  already-validated `AppEnvironment`, so the static site build never needs these four variables (see
  the isolation proof below). Each secret must be ≥32 characters, not a known placeholder or Better
  Auth's own documented development fallback, and not equal to the other realm's secret. Each base URL
  must be a bare http(s) origin (no path/query/fragment/credentials); loopback hosts are rejected in
  staging/production. `loadAuthFoundationConfig(source, environmentType)` returns a frozen
  `AuthFoundationConfig` or throws `AuthFoundationConfigurationError` (a safe `{key, message}` issue
  list only — the raw secret never appears in the message, stack, or `toSafeJSON()`).
- **Database schema:** exactly eight tables in the `app` Postgres schema, declared through
  `appSchema.table(...)` (never the bare `pgTable` helper) in
  `src/platform/database/schema/{customer,workforce}-auth.ts`:
  ```text
  customer_auth_users   customer_auth_sessions   customer_auth_accounts   customer_auth_verifications
  workforce_auth_users  workforce_auth_sessions  workforce_auth_accounts  workforce_auth_verifications
  ```
  Field shapes mirror Better Auth 1.6.25's own generated Drizzle/Postgres contract exactly (only the
  physical table names and realm-scoped relation names differ) — verified by `auth:schema:check`, not
  hand-maintained. `session.user_id`/`account.user_id` foreign keys reference only that same realm's
  `*_auth_users` table with `ON DELETE CASCADE`; no foreign key crosses realms. The two
  `customerBetterAuthSchema`/`workforceBetterAuthSchema` logical-key objects (`{user, session, account,
  verification, ...relations}`) are what get passed to `drizzleAdapter` — never the whole `appSchema`,
  so Better Auth can never see the other realm's tables.
- **`drizzle/0002_better_auth_foundation.sql`** is the one migration this slice adds — generated via
  `npm run db:generate`, never hand-written, and reviewed before sealing
  (`npm run db:migrations:seal -- --confirm=SEAL_NEW_BOBA_BEAR_MIGRATIONS`). It hardcodes no
  `GRANT ... TO boba_bear_app`; that role's SELECT/INSERT/UPDATE/DELETE access on the eight new tables
  comes automatically from the `ALTER DEFAULT PRIVILEGES` statement already in
  `docker/postgres/init/001-bootstrap.sh` (IMP-004) — proven live against the local Compose database by
  `npm run db:verify`, and against a disposable Testcontainers database by
  `npm run test:database:auth-foundation`. `drizzle/0000_database-foundation.sql` and
  `drizzle/0001_transactional_outbox_idempotency.sql` remain byte-for-byte unchanged.
- **Schema-generation workflow.** `scripts/auth/schema-contract/{customer,workforce}-auth.cli.ts` are
  minimal, network-free, database-free Better Auth configs used only so the locally-installed CLI
  (`./node_modules/.bin/auth generate --adapter drizzle --dialect postgresql`) can introspect the
  1.6.25 core contract — synthetic secrets only, never a real one, never printed.
  `npm run auth:schema:generate` regenerates both realms' contracts into a disposable directory for
  manual inspection (never overwrites the production schema files). `npm run auth:schema:check`
  (`scripts/auth-schema-check.ts`), wired into `npm run check`, regenerates both contracts fresh on
  every run and diffs them against the production schema — table set, fields, nullability,
  uniqueness, foreign keys, indexes, physical-table mapping, cross-realm foreign keys, and the pinned
  package/CLI version — using Drizzle's own `getTableConfig` introspection rather than a brittle
  byte-for-byte text comparison. No network, no database connection; fails closed if CLI generation
  itself fails.
- **Server-only runtime** (`src/server/auth/{customer,workforce}/`): `getCustomerAuthRuntime(config)` /
  `getWorkforceAuthRuntime(config)` are the *only* ways to obtain a realm's Better Auth instance —
  there is no `getAuthRuntime(realm, config)` that accepts an unrestricted string. Each accepts
  `{ auth, persistence }` (the realm's validated auth config plus a `WebConfig`/`WorkerConfig` from
  `src/platform/config`) and is checked against the realm's `realm` discriminant *at runtime*, not only
  by TypeScript — a workforce-shaped config passed to `getCustomerAuthRuntime` (or vice versa) throws
  `AuthRealmMismatchError` immediately. Importing these modules or calling the factory opens no
  connection; the realm's `Persistence` handle (via IMP-006's `getApplicationPersistence`) and Better
  Auth instance are created lazily on the first `getAuth()` call and cached by the frozen `config`
  object's identity (a separate `WeakMap` per realm — customer and workforce registries never share
  state). `close()` is idempotent, safe before and after use, and closes only the persistence handle
  this realm runtime itself created — closing customer never affects workforce and vice versa. The
  `config.persistence` object passed in should be dedicated to that realm runtime, since `close()`
  closes it.
- **The Better Auth ↔ persistence bridge** (`src/server/auth/shared/database-adapter.ts`) obtains the
  Drizzle executor exactly once per realm, via `persistence.withContext(({db}) => db)`, and retains it
  only inside that realm's `drizzleAdapter(...)` closure for the runtime handle's lifetime — never
  exported as a general query interface, never a second call to `pg.Pool`/`createDatabaseClient`.
- **Disabled by design in this slice:** `emailAndPassword.enabled: false`, `socialProviders: {}`,
  `plugins: []`, `rateLimit.enabled: false`, `logger.disabled: true`, `telemetry.enabled: false`,
  `experimental.joins: false`. No email/password, OTP, magic-link, passkey, username, anonymous,
  MFA/2FA, organization, admin, or API-key capability exists. No Better Auth HTTP route handler is
  mounted anywhere (`src/app/api/auth/**` does not exist), no `toNextJsHandler`, and no browser
  `createAuthClient`/`useSession` exists in production source — the two Better Auth instances are
  server-side, in-process foundations for a *future* transport slice.
- **Test-only session setup** uses Better Auth's own public `internalAdapter` (via `auth.$context`) —
  `createUser`/`createSession`/`findSession`/`deleteSession`/`deleteSessions` — never a direct Drizzle
  insert into a Better Auth table.
- **`npm run audit:auth-foundation`** (`scripts/audit-auth-foundation.mjs`), wired into `npm run check`,
  statically checks: pinned dependency versions; that both realms' public entry points
  (`src/server/auth/{shared,customer,workforce}/index.ts`) carry `import "server-only"`; that no
  unrestricted generic realm factory exists; that customer/workforce modules never import each other's
  schema; that nothing in `src/server/auth/**` imports `pg` directly, calls `createDatabaseClient`, or
  uses the migration-role persistence factory; that no `options.ts` enables email/password, a
  non-empty plugin/social-provider list, rate limiting, or a non-disabled logger; that no Better Auth
  HTTP handler or browser auth client exists; that no generic `BETTER_AUTH_SECRET`/`AUTH_SECRET` or
  browser-visible auth variable exists; and that the one new migration adds exactly the eight approved
  tables.
- **`npm run test:database:auth-foundation`** (Testcontainers PostgreSQL 18, real Better Auth, no
  mocks) proves, against a disposable database: the eight-table migration replay; realm-scoped foreign
  keys; the same synthetic email existing once in each realm without conflict; `boba_bear_app`-shaped
  DML-only privileges; full customer and workforce session create/retrieve/revoke lifecycles; session
  survival across runtime close/recreate; and cross-realm isolation (a token created in one realm is
  never resolvable through the other realm's runtime, and closing one realm's runtime never disturbs
  the other's).
- **Static build isolation.** None of the four auth environment variables are required to run
  `npm run build` — the static marketing site build has no dependency on this foundation.

## Customer phone OTP authentication (IMP-009)

`src/server/customer-auth/` is a dedicated, standalone Node HTTP service (never a Next.js API
route) that lets a customer sign in with only an Indian mobile number and a six-digit one-time
code, built on IMP-008's customer realm. **No production SMS/OTP delivery provider exists in this
slice** — the only provider is an in-process `local` one, allowed only in `local`/`test`/`ci`, and
both the provider factory and the service config fail closed (throw
`CUSTOMER_OTP_PRODUCTION_PROVIDER_UNAVAILABLE`) in staging/production. Shipping real SMS delivery is
future work, not something to approximate or stub into this slice.

- **Pinned exact version:** `libphonenumber-js@1.13.10` — never a caret/tilde range, never
  `@latest`. No alternate phone-parsing library (`google-libphonenumber`, `phone`,
  `awesome-phonenumber`, …), SMS/OTP provider SDK (Twilio, MSG91, Exotel, SNS, …), or third-party
  HTTP framework (Express, Fastify, Koa, …) dependency exists; `better-auth` /
  `@better-auth/drizzle-adapter` / `auth` stay pinned to the IMP-008 `1.6.25`.
- **India-only phone normalization** (`src/shared/customer-auth/phone.ts`) is the one authoritative
  place a phone string becomes a branded `E164IndianMobileNumber` — via `libphonenumber-js/mobile`,
  never a hand-rolled regular expression. `normalizeIndianMobileNumber` rejects anything not a
  10-digit Indian **mobile** number in every common input shape (leading `0`, `+91`/`91` prefix,
  spaces/hyphens/parens, extensions, non-Indian numbers, landline-only numbers). Shared by the login
  UI, the HTTP façade, Better Auth's `phoneNumberValidator`, temporary-identity derivation, and
  rate-limit hashing — there is no second copy of this logic.
- **Shared façade contracts** (`src/shared/customer-auth/contracts.ts`) declare the exact four public
  paths (`CUSTOMER_AUTH_PUBLIC_PATHS`: `send-otp`, `verify-otp`, `session`, `sign-out`, all under
  `/api/customer-auth/`) and every JSON request/response shape — safe for both the browser bundle and
  the service, and never including a secret, OTP, phone number, session token, or temporary
  email/name.
- **PII-hash boundary** (`src/server/customer-auth/pii.ts`): `CUSTOMER_AUTH_PII_HASH_SECRET`
  (≥32 chars, not a placeholder, not equal to either realm's Better Auth secret) is the only key used
  to (a) HMAC-derive a phone number's deterministic `u_<hex>@phone.invalid` temporary email — Better
  Auth still requires an email column on sign-up, but the raw phone number is never interpolated into
  it outside the HMAC digest — and (b) hash rate-limit keys (`rate-limit/hashing.ts`). The raw phone
  number and raw client IP are never stored anywhere; only their salted digests are.
- **OTP provider boundary** (`src/server/customer-auth/provider/`): `CustomerOtpProvider` is a small
  `startVerification`/`checkVerification`/`checkReadiness`/`close` interface. `createCustomerOtpProvider`
  (the only public factory, from `provider/index.ts`) accepts exactly `"local"` (in-process,
  memory-only, timing-safe code comparison) or `"disabled"` — the `CustomerOtpProviderKind` union
  never grows a third "available in production" value in this slice. `provider/local.ts`'s
  `createLocalCustomerOtpProviderForTests` test-capture seam (reads back the active code without
  touching HTTP or a log line) is never re-exported from the public provider boundary.
- **Durable, hashed-key rate limiting** (`src/server/customer-auth/rate-limit/`, table
  `app.customer_otp_rate_limits`, migration below): four independent scopes —
  `otp_send_phone_60s` (1 request/60s), `otp_send_phone_1h` (5/hour), `otp_send_ip_10m` (10/10min),
  `otp_verify_ip_10m` (20/10min) — consumed atomically inside the same `Persistence.transaction()` as
  the request it's guarding. The table (declared via `appSchema.table(...)`, never the bare `pgTable`
  helper) stores only `scope`, a 64-hex-character HMAC `key_hash`, and technical window/count
  columns — never a raw phone number, IP address, OTP, cookie, session token, or user ID column.
- **The HTTP service** (`src/server/customer-auth/http/`, `service.ts`, `main.ts`) is a plain Node
  `http.Server` — no Express/Fastify/Koa, no Next.js API route (`src/app/api/auth/**` does not
  exist), no Better Auth `toNextJsHandler`/catch-all handler mounted anywhere. Exactly six endpoints:
  the four public façade paths plus `/health/live`/`/health/ready` (never proxied externally — see
  `docker/nginx/nginx.conf`). Origin-checked, exact-path routing (`http/origin.ts`, `http/router.ts`);
  `sendOtp` generates the code and calls the provider's `startVerification` **directly** — it never
  calls Better Auth's own `auth.api.sendPhoneNumberOTP` — while `verifyOtp` calls
  `auth.api.verifyPhoneNumber` so Better Auth still owns session/user creation. Every outcome that
  reaches an HTTP response is a fixed, allowlisted status literal; the server-generated OTP code is
  never echoed back in a response body. `service.ts` is the only module that logs per-request events,
  and only the small safe field set in `SAFE_LOG_FIELDS` (never a phone number, IP, OTP, cookie,
  session token, email, request body, or user ID); `main.ts` separately logs only its own
  process-lifecycle start/shutdown/fatal-error lines, same accepted pattern as
  `scripts/database/migrate.ts`.
- **Better Auth customer-realm plugin.** `src/server/auth/customer/options.ts` is the only place the
  `phoneNumber` plugin from `better-auth/plugins/phone-number` is enabled — never on the workforce
  realm. `updatePhoneNumber`/`removePhoneNumber`/password/MFA endpoints are never exposed publicly;
  `phoneNumberValidator` delegates to `isValidIndianMobileNumber`; `sendOTP`/`verifyOTP` delegate to
  the injected `CustomerOtpProvider` rather than Better Auth's own internal OTP storage.
- **Browser façade and login UI never touch storage.** `src/lib/customer-auth/client.ts` (a typed
  `fetch` wrapper, same-origin `credentials: "same-origin"` only, never cross-origin) and
  `src/app/login/CustomerLoginClient.tsx` keep the phone number and OTP code only in React component
  state — never `localStorage`, `sessionStorage`, the URL, or an analytics event. The session cookie
  itself is opaque to this component; the browser and the customer-auth service manage it entirely.
- **`drizzle/0003_customer_phone_otp_authentication.sql`** is the one migration this slice adds beyond
  IMP-008's sealed three — generated via `npm run db:generate`, reviewed before sealing
  (`npm run db:migrations:seal -- --confirm=SEAL_NEW_BOBA_BEAR_MIGRATIONS`). It adds nullable, unique
  `phone_number`/`phone_number_verified` columns only to `customer_auth_users` (never
  `workforce_auth_users`) and creates `customer_otp_rate_limits`. It hardcodes no
  `GRANT ... TO boba_bear_app`; that access comes automatically from the same
  `ALTER DEFAULT PRIVILEGES` statement as every earlier slice (IMP-004).
  `drizzle/0000_database-foundation.sql`, `drizzle/0001_transactional_outbox_idempotency.sql`, and
  `drizzle/0002_better_auth_foundation.sql` remain byte-for-byte unchanged.
- **`npm run audit:customer-phone-auth`** (`scripts/audit-customer-phone-auth.mjs`), wired into
  `npm run check`, is the IMP-009-specific complement to `audit-auth-foundation.mjs`: pinned
  dependency versions and forbidden-library checks; no Better Auth catch-all/HTTP-route escape and no
  published customer-auth host port or Nginx `/health/*` proxy; no phone-update/removal/password/MFA
  public surface; the temp-email deriver never leaks the raw phone number outside its HMAC digest; no
  stray `console.*` logging outside the two allowlisted call sites; the rate-limit schema never
  declares a raw PII-shaped column; no outbox usage; no `localStorage`/`sessionStorage` of phone/OTP;
  no customer-auth-related `NEXT_PUBLIC_*` variable; no direct `pg`/`createDatabaseClient`/migration-role
  usage in the service; the local provider and service config fail closed in staging/production; the
  HTTP router never echoes an OTP code back; the test-only provider capture seam stays off the public
  boundary; exactly one new migration exists and the three previously-sealed ones are unchanged; and
  every required module/entry point exists.
- **`npm run test:database:customer-phone-auth`** (Testcontainers PostgreSQL 18, real Better Auth, no
  mocks — `tests/database/customer-phone-auth.integration.test.ts`) proves, against a disposable
  database: the migration replay (phone columns, uniqueness, the rate-limit table, no separate OTP
  history table, workforce schema untouched); `boba_bear_app`-shaped DML-only privileges on the new
  columns/table (no DDL); atomic rate-limit consume/limited/cleanup behaviour under concurrency, and
  that only hashed keys are ever stored; and a full local-provider send → `verifyPhoneNumber` →
  session → sign-out flow that never leaves a raw OTP in `customer_auth_verifications`, never creates
  a duplicate user for the same phone under concurrent first-time verification, and never calls
  `auth.api.sendPhoneNumberOTP`.
- **`npm run test:customer-auth:http`** (`tests/customer-auth/http.integration.test.ts`, same shared
  Testcontainers container as `tests/database/**`) starts a real `CustomerAuthService` object
  (`tests/customer-auth/support/service-harness.ts` — never `main.ts`, which only reads the real
  environment) on an OS-assigned loopback port with `trustProxyHops: 0`, and exercises every endpoint,
  origin enforcement, rate limiting, and the full send/verify/session/sign-out cycle over real HTTP —
  asserting the raw phone number, OTP, and database connection string never appear in any response
  body.
- **`npm run test:e2e:customer-auth`** (`tests/e2e/customer-auth.spec.ts`,
  `playwright.customer-auth.config.ts`) is a separate Playwright config/script from
  `npm run test:e2e` (which excludes this one spec — it needs a real backend, not just static files).
  Locally, its `webServer` is `scripts/e2e/customer-auth-server.ts`: a disposable Testcontainers
  database plus the *actual compiled* `dist-customer-auth/server/customer-auth/main.js` (built by the
  script's `customer-auth:build` prerequisite — never `CustomerAuthService` instantiated directly
  in-process, both for realism and because this project has no top-level `"type": "module"`, so
  requiring `libphonenumber-js/mobile` through `tsx`'s default CommonJS resolution hits a real bug in
  its bundled metadata wiring that the compiled ESM output does not) behind one combined static-file +
  `/api/customer-auth/` reverse-proxy server, mirroring `docker/nginx/nginx.conf`'s proxy prefix. The
  fixed six-digit code travels only through `CUSTOMER_OTP_LOCAL_FIXED_CODE` (set once, identically, by
  the npm script) — never printed by the harness, the service, or the spec. Against the already-up
  Docker stack instead, run `PLAYWRIGHT_TARGET=docker npm run test:e2e:customer-auth` after
  `npm run docker:up`, which targets the real `customer-auth` Compose service through Nginx exactly
  like `test:e2e:docker` does for the rest of the site.
- **No new HTTP surface beyond the four façade paths.** No phone-update/removal endpoint, no
  password/MFA capability, and no route reachable outside `/api/customer-auth/{send-otp,verify-otp,
  session,sign-out}` and the two unproxied health endpoints exists in this slice.

## Workforce authentication and MFA (IMP-010)

`src/server/workforce-auth/` is a dedicated, standalone Node HTTP service (never a Next.js API
route) that authenticates workforce operators with email + password + mandatory TOTP MFA, built on
IMP-008's workforce realm. Authorization (roles/outlets/organizations) is explicitly out of scope —
that is IMP-011.

- **Pinned exact versions:** `better-auth@1.6.25`, `@better-auth/drizzle-adapter@1.6.25`, `auth@1.6.25`,
  and client-side `qrcode@1.5.4` (local QR rendering of `otpauth://` URIs only — never an external QR
  service). No Admin/Organization/phone/SMS/magic-link/social/SSO/passkey plugins on the workforce
  realm; the customer `phoneNumber` plugin must never appear in workforce options.
- **Session policy** (`src/server/auth/shared/workforce-session-policy.ts`) is intentionally stricter
  than the customer seven-day policy: 12-hour absolute expiry, sliding refresh disabled, 5-minute
  freshness, cookie cache disabled. Cookie prefix remains `boba-workforce`.
- **Password policy:** length 15–128, no composition rules. Public self-registration is disabled
  (`emailAndPassword.disableSignUp: true`). Operator provisioning uses Better Auth's supported
  `password.hash` + `internalAdapter.createUser` + `linkAccount` path — never the Admin plugin, never
  hand-rolled credential rows.
- **Mandatory TOTP MFA** via Better Auth's `twoFactor` plugin only on workforce: issuer `BOBA Bear`,
  6 digits / 30s, 10 backup codes of length 12, account lockout 5 failures / 15 minutes,
  `trustDeviceMaxAge: 0`, and every public MFA verify forces `trustDevice: false` (backup-code verify
  also forces `disableSession: false`). Better Auth 1.6.25 stores TOTP secrets and backup codes with
  XChaCha20-Poly1305 encryption (no hashed backup-code mode exists) — plaintext persistence is
  forbidden and proven by PostgreSQL integration tests.
- **Lifecycle fields** on `app.workforce_auth_users` only: `two_factor_enabled` (Better Auth),
  `password_change_required`, `disabled_at` (BOBA Bear; `input: false` / `returned: false`). Table
  `app.workforce_auth_two_factors` is the realm-scoped Better Auth `twoFactor` model. Fully usable
  workforce auth requires a valid session AND `disabled_at IS NULL` AND
  `password_change_required = false` AND `two_factor_enabled = true`. First MFA enrollment completion
  must revoke all workforce sessions and force reauthentication.
- **Durable rate limits** (`app.workforce_auth_rate_limits`): scopes
  `workforce_sign_in_email_15m` (5/15m), `workforce_sign_in_ip_10m` (20/10m),
  `workforce_mfa_ip_10m` (30/10m), `workforce_security_change_ip_10m` (10/10m). Keys are HMAC-SHA256
  digests under `WORKFORCE_AUTH_PII_HASH_SECRET` with domain prefixes `workforce-email:v1:` /
  `workforce-ip:v1:` — never raw email/IP.
- **HTTP service** (`src/server/workforce-auth/`, port 8082, no host port): eight public façade paths
  under `/api/workforce-auth/` plus unproxied `/health/live` and `/health/ready`. Nginx proxies only
  the façade prefix. Static UI at `/workforce/login` (export only). Operator CLIs:
  `npm run workforce:user:{create,disable,enable,reset-password,reset-mfa}`.
- **`drizzle/0004_workforce_authentication_mfa.sql`** is the one migration this slice adds; 0000–0003
  remain byte-for-byte unchanged. Sealed via `npm run db:migrations:seal`.
- **`npm run audit:workforce-auth`**, `test:database:workforce-auth`, `test:workforce-auth:http`,
  `test:e2e:workforce-auth`, `docker:workforce-auth:smoke`, and `docker:workforce-auth:inspect` are
  the IMP-010 validation surface.

## Organizations, outlets, roles and permissions (IMP-011)

`src/server/organization/` and `src/server/access-control/` implement the business organization
resource model and scoped RBAC foundation. Better Auth remains identity/session only — never the
source of business authorization. No public HTTP routes, UI, Nginx proxy, or Docker service are
added in this slice.

- **Organization resources:** `app.brands`, `app.organizations`, `app.territories`, `app.legal_entities`,
  `app.outlets` — soft lifecycle `active|inactive` only; composite FKs prevent cross-brand /
  cross-organization ancestry mismatches. No business seed rows in migration SQL.
- **Access Control tables:** `app.access_memberships`, `app.access_permissions`, `app.access_roles`,
  `app.access_role_allowed_scopes`, `app.access_role_permissions`, `app.access_role_assignments`,
  `app.access_control_audit_events`. Membership and role assignment are separate. System catalogs
  are runtime SELECT-only; audit is INSERT+SELECT append-only; history tables forbid DELETE for
  `boba_bear_app` (REVOKEs in migration when the role exists).
- **Catalog:** exactly 22 permissions and 7 system roles seeded in migration `0005` and mirrored in
  `src/shared/access-control/catalog.ts` (IMP-012 later extends the permission catalog to **24** with
  `catalog.read` / `catalog.manage`). No runtime auto-seeding. Business code checks permission
  keys, never role names. Inheritance is explicit (`exact`|`descendants`). Multi-role = allow-only
  union. No deny roles, Redis, session permission cache, or broad PostgreSQL RLS.
- **Authorization:** `authorize` / `requireAuthorization` / `getEffectivePermissions` consume a
  trusted `WorkforcePrincipal` and authoritative resource ancestry from PostgreSQL. Fail closed.
- **Administration:** delegation ceiling, self-elevation DENY, last Platform Super Admin protection
  (transaction + row lock). Access-control mutations authorize inside the same transaction.
- **Bootstrap:** `npm run access:bootstrap-platform-admin` (`--user-id` or `--email`) is the only
  unauthenticated admin exception; closes after the first effective Platform Super Admin.
- **Migration:** `drizzle/0005_organization_outlet_rbac_foundation.sql` only; `0000`–`0004` unchanged.
- **Validation:** `npm run audit:access-control`, `test:database:access-control`, `test:access-control`,
  `test:access-control:cli`. Do not start IMP-012 from this slice.

## Canonical catalog model (IMP-012)

`src/server/catalog/` and `src/shared/catalog/` implement the Brand-owned canonical food catalog —
products, variants, modifiers, bundles, and dietary tags — as a soft-lifecycle domain
(`draft|active|retired`). Product, Menu, Assortment, Availability, and Pricing remain separate
concerns. No public HTTP routes, catalog admin UI, Nginx proxy, Docker service, menu import, or
pricing/availability columns are added in this slice.

- **Canonical separation:** Catalog roots belong to `app.brands` only — never
  `organization_id` / `territory_id` / `outlet_id`. No price/amount/currency/tax fields, no
  operational availability (`is_available`, `sold_out`, …), and no menu-presentation fields
  (`category_id`, `menu_section`, `featured`, …). Nested bundles are forbidden; bundle components
  must be Standard variants.
- **Eleven tables** in `src/platform/database/schema/catalog.ts`, created by the single migration
  `drizzle/0006_canonical_catalog_model.sql` (0000–0005 remain byte-for-byte unchanged). Soft
  lifecycle only — app runtime must not hard-delete catalog rows; migration REVOKEs DELETE/TRUNCATE
  for `boba_bear_app` when that role exists. No business catalog seed rows in `0006`.
- **Permissions:** `catalog.read` and `catalog.manage` (total **24** permissions at IMP-012 close;
  IMP-013 extends to **26** with `menu.read` / `menu.manage`; roles remain **7**),
  granted to Platform Super Admin and Brand Admin only. Authorization uses permission keys via
  `requireAuthorization` against the authoritative Brand — never role-name checks.
- **Domain surface:** `src/server/catalog/` (server-only) exposes create/update/activate/retire and
  graph-read commands. Active graphs fail closed on structural corruption (last default, required
  modifier cardinality, active bundle components, dietary tags with live assignments).
- **Out of scope at IMP-012 close (see IMP-013+):** menu import from static `menu.json`, menu
  categories/images/display overrides, assortment & operational availability, pricing/tax, catalog
  admin UI, public catalog HTTP API, Petpooja/POS sync, nested bundles, `is_orderable`.
- **Validation:** `npm run audit:catalog`, `test:database:catalog`, `test:catalog`.

## Existing menu import (IMP-013)

Import the current customer-visible static menu into the accepted canonical catalog **and** a new
menu-presentation model — in parallel with the unchanged website. The public site does **not** cut
over to PostgreSQL in this slice.

- **Authoritative static source (read-only inputs):** `src/data/menu.json`, `src/lib/menuImages.ts`,
  `src/types/menu.ts`. IMP-013 must leave them byte-for-byte unchanged. Audit
  `npm run audit:menu-import` guards their digests. Current prices and promo `tags` remain
  static-only; tags are **not** dietary metadata.
- **Parallel DB import:** fixed checked-in manifest `data/platform/imports/existing-menu-v1.json`
  (`import_id=existing-menu-v1`, `version=1`, `source_inventory_sha256`). Stable UUIDs/codes are
  frozen in the manifest. Runtime apply must not regenerate mappings. Source digest mismatch →
  `SOURCE_DRIFT` (fail closed; do not auto-adapt).
- **No UI cutover:** menu components continue reading the static source. No public menu API, no
  Next.js Route Handler/Server Action, no admin UI, no new Docker service.
- **Canonical mapping (reviewed v1 source):** each customer-visible card → one `standard` Product →
  one hidden default Variant (`code=default`, `is_default=true`, `is_selector_visible=false`).
  Meals/Combos are opaque standard SKUs — do **not** invent Bundle composition from prose. No
  live modifiers, no multi-Variant inference, no dietary inference from names/tags/descriptions.
- **Menu presentation:** exactly three tables — `app.menus`, `app.menu_sections`, `app.menu_entries`
  (`src/platform/database/schema/menu.ts`). Max section hierarchy depth **2**. Menu Entry references
  Product (not Variant). Positions are **zero-based** within each parent. No price/tax/currency/
  assortment/availability/provider-ID columns.
- **Importer CLIs:** `npm run menu:inventory-existing` (read-only), `npm run menu:import-existing`
  (dry-run default; writes only with `--apply`), `npm run menu:verify-existing` (read-only). Fixed
  manifest path only — no `--file` / URL / stdin. Apply is one atomic transaction; second identical
  apply is a no-op. Material conflict → `IMPORT_CONFLICT`. Unknown unrelated rows are preserved.
  Docker wrappers: `docker:menu:import-existing`, `docker:menu:verify-existing`.
- **Brand bootstrap exception:** may create exactly Brand `boba-bear` / `BOBA Bear` when absent;
  reuse exact match; fail on conflicting identity. Creates no Organization/Territory/Legal Entity/
  Outlet.
- **Permissions:** `menu.read` / `menu.manage` (final **26** permissions; roles remain **7**), mapped
  to Platform Super Admin and Brand Admin only. Product retirement rejects active Menu Entry
  references (retire Entry first).
- **Migration:** exactly one — `drizzle/0007_existing_menu_import.sql` (tables + constraints +
  permission seed + REVOKE DELETE/TRUNCATE). **No** business Product/Menu rows in migration SQL.
  Migrations `0000`–`0006` remain byte-for-byte unchanged. No `0008`.
- **Validation:** `npm run audit:menu-import`, `test:menu-import`, `test:menu-parity`,
  `test:database:menu-import`, plus existing catalog/access-control suites.
- **Out of scope at IMP-013 close (see IMP-014+):** assortment & operational availability
  (IMP-014); pricing/tax (IMP-015); promotions; inventory; Petpooja/POS sync; catalog/menu admin
  UI; database-backed public menu; cart/checkout.

## Assortment and operational availability (IMP-014)

`src/server/assortment/` and `src/shared/assortment/` answer whether a catalog item can
operationally participate at an Outlet right now. Pricing, serviceability, inventory quantities,
`isOrderable`, public HTTP eligibility APIs, and a database-backed public menu cutover are out of
scope. The static website remains unchanged.

- **Six tables** via `appSchema.table(...)` in `src/platform/database/schema/assortment.ts`, created
  by the single migration `drizzle/0008_assortment_operational_availability.sql` (0000–0007 remain
  byte-for-byte unchanged): `assortment_rules`, `outlet_variant_availability`,
  `outlet_modifier_option_availability`, `outlet_operating_profiles`, `outlet_operating_intervals`,
  `assortment_availability_audit_events`. Soft rule lifecycle `active|retired` only. No business
  assortment/outlet seed rows in migration SQL. App runtime must not hard-delete soft-lifecycle
  assortment rows; schedule interval rows may be DELETE+INSERT on full replace. Audit is append-only.
- **Brand positive include, exclude-only downstream:** an active Variant is not assortment-eligible
  without an active Brand `include` (Variant target only). Territory / Organization / Outlet may only
  `exclude`. Never re-enable by lower-scope include. Fail closed.
- **Availability states:** `available` | `temporarily_unavailable` | `sold_out` on Outlet×Variant and
  Outlet×Modifier Option. Missing row → effectively available. `sold_out` never auto-expires;
  `temporarily_unavailable` may have null or future `unavailable_until`.
- **Operating state:** persisted control `accepting|paused|suspended` only — `closed_by_schedule` is
  derived. Precedence: inactive outlet → missing profile/schedule → suspended → pause → weekly
  schedule → accepting. One profile per outlet; IANA timezone required; intervals are same-day
  `[start, end)` with no overlap / no cross-midnight rows (split overnight across days).
- **No `isOrderable`:** use eligibility / availability decision codes only. No pricing/tax/currency /
  inventory / provider columns.
- **Permissions:** ten new keys (`assortment.*`, `availability.*`, `outlet.operating_*`,
  `assortment.audit.read`) — final **36** permissions; roles remain **7**. Authorization uses
  permission keys via `requireAuthorization` against Brand or Outlet resources as appropriate.
- **Bootstrap:** `npm run assortment:bootstrap-existing-menu` (dry-run default; `--apply` writes) and
  `assortment:verify-existing-menu` — fixed `existing-menu-v1` manifest only. Creates Brand Variant
  includes for imported Variants; no Territory/Org/Outlet rules, availability, or outlets. Docker
  wrappers: `docker:assortment:bootstrap-existing-menu`, `docker:assortment:verify-existing-menu`.
- **Validation:** `npm run audit:assortment-availability`, `test:database:assortment-availability`,
  `test:assortment-availability`, `test:assortment-bootstrap`.
- **Out of scope at IMP-014 close (see IMP-015+):** pricing/tax (IMP-015); promotions; inventory;
  Petpooja/POS sync; assortment/availability admin UI; public eligibility HTTP; database-backed
  public menu; cart/checkout.

## Pricing, charges and tax foundation (IMP-015)

`src/server/pricing/` and `src/shared/pricing/` establish authoritative direct-order pricing,
scoped overrides, charges, and effective-dated GST calculation. The static website remains
unchanged. Promotions (IMP-016), cart/checkout, invoices, and aggregator pricing are out of scope.

- **Twelve tables** via `appSchema.table(...)` in `src/platform/database/schema/pricing.ts`, created
  by the single migration `drizzle/0009_pricing_charges_tax.sql` (0000–0008 remain byte-for-byte
  unchanged): `price_books`, `price_book_variant_prices`, `price_book_modifier_prices`,
  `price_book_bundle_option_prices`, `charge_definitions`, `price_book_charge_prices`,
  `tax_categories`, `tax_policies`, `tax_policy_components`, `legal_entity_tax_profiles`,
  `outlet_tax_profiles`, `pricing_tax_audit_events`. Money is INR integer paise (`bigint`). Migration
  seeds system tax category/policy/components and packaging/delivery charge definitions only — never
  BOBA Bear prices, GSTIN, outlet tax profiles, or charge amounts.
- **Hierarchy:** Brand → Territory → Organization → Outlet overrides; Brand baseline required;
  missing Brand price → `PRICE_MISSING`. Initial Brand prices locked (`allow_*_override = false`).
  Explicit zero required for Modifier/Bundle Option prices.
- **Tax:** effective-dated `restaurant_service` policy at 500 bps without ITC; place of supply =
  Outlet performance location; exclusive/inclusive exact integer arithmetic; deterministic
  largest-remainder allocation.
- **Permissions:** seven new keys (`pricing.*`, `charges.*`, `tax.*`, `pricing.audit.read`) — at
  IMP-015 close **43** permissions; roles remain **7** (IMP-016 extends to **49**).
- **Bootstrap:** `npm run pricing:bootstrap-existing-menu` (dry-run default; `--apply` writes) from
  fixed `existing-menu-v1` + `data/platform/pricing/existing-menu-pricing-v1.json`.
- **Validation:** `npm run audit:pricing-tax`, `test:database:pricing-tax`, `test:pricing-tax`,
  `test:pricing-bootstrap`, `test:pricing-parity`.
- **Out of scope at IMP-015 close (see IMP-016+):** promotions; cart/checkout/order/invoice;
  serviceability; aggregator pricing; provider delivery cost; public pricing HTTP/UI; new Docker
  service.

## IMP-028C canonical modifier content bootstrap (Slice 4)

Fixed checked-in artifact `data/platform/catalog/imp028c-hong-kong-modifiers-v1.json` binds one
representative modifier group to **Hong Kong Milk Tea Boba** / `default` through the Catalog service
lifecycle. Modifier price rows on `direct-primary-v1` are seeded by the same bootstrap (explicit
₹0 required for free options). `docker:up` does **not** install business content automatically.

Fresh UAT / local commerce content order after migrations:

1. `npm run docker:up`
2. `npm run docker:menu:import-existing -- --apply`
3. `npm run docker:assortment:bootstrap-existing-menu -- --apply`
4. `npm run docker:pricing:bootstrap-existing-menu -- --apply`
5. `npm run docker:catalog:bootstrap-imp028c-modifiers -- --apply`

CLI: `npm run catalog:bootstrap-imp028c-modifiers` (dry-run default; `--apply` writes). Docker
wrapper: `docker:catalog:bootstrap-imp028c-modifiers`. Validation:
`npm run test:catalog-imp028c-modifiers`. Bootstrap owns only artifact-declared modifier records;
second identical apply is a no-op; unknown unrelated rows are preserved; menu re-import does not
delete additive modifier content.

## Promotions, coupons, allocation and pricing integration (IMP-016)

`src/server/promotions/` and `src/shared/promotions/` implement framework-independent Promotion and
Coupon infrastructure with allocation before GST via the existing IMP-015 quote path. The static
website remains unchanged. Cart/checkout/order redemption persistence and public Promotion APIs are
out of scope.

- **Six tables** via `appSchema.table(...)` in `src/platform/database/schema/promotions.ts`, created
  by the single migration `drizzle/0010_promotions_coupons.sql` (0000–0009 remain byte-for-byte
  unchanged): `brand_promotion_policies`, `promotions`, `promotion_benefits`, `promotion_targets`,
  `promotion_coupons`, `promotion_audit_events`. No business campaign/coupon seed rows.
- **Benefits:** `percentage_discount`, `fixed_amount_discount`, `buy_x_get_y` (BOGO exclusive V1).
  Stacking `exclusive`|`combinable`; best post-tax payable wins; combinable uses max-flow capacity
  allocation; exact largest-remainder component allocation; channel `direct` only.
- **Permissions:** six new keys (`promotions.read`/`manage`/`activate`, `coupons.read`/`manage`,
  `promotions.audit.read`) — final **49** permissions; roles remain **7**.
- **Validation:** `npm run audit:promotions`, `test:database:promotions`, `test:promotions`,
  `test:promotion-coupons`, `test:promotion-pricing-parity`.
- **Out of scope (IMP-017+):** cart/checkout/order; redemption reservation/consumption; public
  Promotion API/UI; invoice/credit notes; aggregator promotions; new Docker service/scheduler.

## Customer Profiles (IMP-017) and Customer Addresses (IMP-018)

IMP-017 and IMP-018 are complete and accepted. Customer Profiles and Saved Addresses are
customer-owned domains with append-only audit. They do not add workforce permissions.
Addresses store optional coordinates and Indian PIN codes but do **not** decide Serviceability.

## Serviceability (IMP-019)

`src/server/serviceability/` and `src/shared/serviceability/` implement Outlet delivery-coverage
configuration and ephemeral Serviceability evaluation. The static website remains unchanged. Cart,
checkout, delivery-fee calculation, and public Serviceability HTTP/UI are out of scope.

- **Three tables** via `appSchema.table(...)` in `src/platform/database/schema/serviceability.ts`,
  created by the single migration `drizzle/0013_serviceability.sql` (0000–0012 remain byte-for-byte
  unchanged): `outlet_serviceability_configs`, `outlet_serviceability_pins`,
  `outlet_serviceability_audit_events`. No business PIN/coverage seed rows.
- **V1 geography:** explicit per-Outlet Indian PIN positive list only (`^[1-9][0-9]{5}$`). No
  radius/polygon/PostGIS. Coordinates on evaluation input are validated but never affect coverage.
- **Runtime statuses:** `SERVICEABLE` | `NOT_SERVICEABLE` | `TEMPORARILY_UNAVAILABLE` |
  `INDETERMINATE`. `selectedOutletId` only on `SERVICEABLE`. Reuses
  `resolveOutletOperatingState` — never duplicate operating-schedule logic. Brand-scoped candidate
  query; routing `priority ASC, outlet_id ASC`. Higher-priority unknown → `INDETERMINATE` (no skip).
- **Admin ops:** `getOutletServiceabilityConfiguration`, `setOutletServiceabilityRoutingPriority`,
  `addOutletServiceabilityPins`, `removeOutletServiceabilityPins`, `replaceOutletServiceabilityPins`.
  Optimistic concurrency via exact `bigint` revision / `expectedRevision`. Material mutation =
  state + revision + one audit event in one transaction. Outlet row `FOR UPDATE` serialization.
- **Permissions:** `serviceability.read` / `serviceability.manage` (outlet target) — final **51**
  permissions; roles remain **7**. Grants: Platform Super Admin, Brand Admin, Outlet Manager only.
- **Validation:** `npm run audit:serviceability`, `test:database:serviceability`,
  `test:serviceability`, `test:serviceability-security`, `test:serviceability-auth-integration`,
  `test:serviceability-concurrency`.
- **Out of scope (IMP-020+):** cart/checkout; delivery fee; public Serviceability API/UI; map
  picker; new Docker service.

## Cart core persistence and domain (IMP-020)

`src/server/cart/` and `src/shared/cart/` implement server-authoritative Cart purchase-intent
persistence and domain operations. The static website remains unchanged. Public Cart HTTP, Checkout,
and workforce Cart permissions are out of scope.

- **Five tables** via `appSchema.table(...)` in `src/platform/database/schema/cart.ts`, created by
  the single migration `drizzle/0014_cart.sql` (0000–0013 remain byte-for-byte unchanged): `carts`,
  `cart_lines`, `cart_line_modifier_selections`, `cart_line_bundle_selections`,
  `cart_line_bundle_modifier_selections`. No outlet/address/price/tax/serviceability columns. No
  configuration JSON authority. No business Cart seed rows.
- **Owner XOR (DB CHECKs):** customer (`customer_auth_user_id` NOT NULL, guest verifier NULL,
  `expires_at` NULL) XOR guest (customer NULL, guest verifier NOT NULL, `expires_at` NOT NULL).
  Partial UNIQUE `(customer_auth_user_id, brand_id)`; guest verifier UNIQUE when non-null
  (SHA-256 hex of raw token). `revision` BIGINT > 0 starting at 1.
- **Domain ops only:** `getActiveCart`, `addCartLine`, `setCartLineQuantity`,
  `updateCartLineConfiguration`, `removeCartLine`, `clearCart`, `applyCartCoupon`,
  `removeCartCoupon`, `claimGuestCart`, `reconcileGuestCartWithCustomer`, `evaluateCart`. No
  generic create/update/patch/delete/save Cart exports. Lazy create on first material add.
- **Concurrency:** ordinary mutations lock Cart `FOR UPDATE` then lines by id ASC; ownership
  claim/reconcile lock `customer_auth_users` first, then carts by id ASC. `expectedRevision`
  required for existing-Cart mutations; stale → `CART_CONFLICT`. Canonical no-ops do not bump
  revision. Guest material mutations extend `expiresAt` via Controllable clock + required
  `guestCartTtlMs` policy option (not a new `BOBA_BEAR_*` env var).
- **Evaluation:** read-only composition of Serviceability + assortment/availability +
  `buildDirectPricingQuote` (bundle options may include nested modifiers). Statuses: `COMPLETE` |
  `REQUIRES_FULFILMENT_CONTEXT` | `CART_INVALID` | `SERVICEABILITY_*` | `EVALUATION_INDETERMINATE`.
- **Permissions:** unchanged at **51**; roles remain **7**. No new Docker service / Next API routes /
  public UI.
- **Validation:** `npm run audit:cart`, `test:database:cart`, `test:cart`, `test:cart-security`,
  `test:cart-auth-integration`, `test:cart-concurrency`.
- **Out of scope (IMP-021+):** Checkout orchestration; public Cart HTTP; cart UI; payment.

## Checkout domain (IMP-021)

`src/server/checkout/` and `src/shared/checkout/` implement authenticated-customer Checkout as a
short-lived, revision-controlled purchase-attempt aggregate bound to one customer-owned Cart.
Reuses Cart `CustomerActor` (no Checkout-specific actor). The static website remains unchanged.
Public Checkout HTTP, Payment, and Order are out of scope.

- **Ten tables** via `appSchema.table(...)` in `src/platform/database/schema/checkout.ts`, created by
  the single migration `drizzle/0015_checkout.sql` (0000–0014 remain byte-for-byte unchanged):
  `checkouts`, `checkout_delivery_destinations`, `checkout_snapshots`, `checkout_snapshot_lines`,
  `checkout_snapshot_line_modifier_selections`, `checkout_snapshot_line_bundle_selections`,
  `checkout_snapshot_line_bundle_modifier_selections`, `checkout_snapshot_charges`,
  `checkout_snapshot_promotion_effects`, `checkout_snapshot_tax_components`. No Payment/Order tables.
  No core JSON authority. No business Checkout seed rows.
- **Lifecycle:** `DRAFT` | `READY_FOR_PAYMENT` | `PAYMENT_PENDING` | `COMPLETED` | `CANCELLED` |
  `EXPIRED`. Partial UNIQUE one non-terminal Checkout per Cart. Status↔`active_snapshot_id`
  enforced by DB CHECK. Money is INR integer paise (`bigint`).
- **Domain ops only:** `getActiveCheckout`, `startCheckout`, `setCheckoutDestination`,
  `clearCheckoutDestination`, `evaluateCheckout`, `cancelCheckout`, plus internal
  `prepareCheckoutForPayment` (no Payment execution). No generic CRUD/status setters.
- **Concurrency:** when Cart and Checkout both lock, always Cart then Checkout.
  `expectedCheckoutRevision` required for mutations; stale → `CHECKOUT_CONFLICT`. TTL via
  Controllable clock + required `checkoutTtlMs` policy option.
- **Permissions:** unchanged at **51**; roles remain **7**. No new Docker service / Next API routes /
  public UI.
- **Validation:** `npm run audit:checkout`, `test:database:checkout`, `test:checkout`,
  `test:checkout-security`, `test:checkout-auth-integration`, `test:checkout-concurrency`.
- **Out of scope at IMP-021 close (see IMP-022+):** Payment execution; Order; public Checkout HTTP;
  checkout UI.

## Payment (IMP-022)

`src/server/payment/` and `src/shared/payment/` implement financial settlement against an accepted
immutable Checkout snapshot. The static website remains unchanged. Public Payment HTTP, Order, and
Refunds are out of scope. No provider SDK is installed — provider-neutral port + fake/test adapter
only.

- **Six tables** via `appSchema.table(...)` — five Payment-owned in
  `src/platform/database/schema/payment.ts` plus Promotions-owned
  `promotion_redemption_claims` in `src/platform/database/schema/promotions.ts` — created by the
  single migration `drizzle/0016_payment.sql` (0000–0015 remain byte-for-byte unchanged):
  `payments`, `payment_attempts`, `payment_provider_references`, `payment_initiation_idempotency`,
  `payment_provider_observations`, `promotion_redemption_claims`. No Order/Refund/inventory tables.
  No business Payment seed rows. Money is INR integer paise (`bigint`); positive Payments only
  (bound Checkout snapshot `grand_total_paise > 0`); zero-payable Checkouts
  create no Payment row. Expected amount/currency live only on the snapshot.
- **Lifecycle:** Payment `OPEN` | `PROCESSING` | `SUCCEEDED` | `SUPERSEDED` | `CANCELLED` |
  `EXPIRED`. Attempt `CREATED` | `PENDING` | `INDETERMINATE` | `SUCCEEDED` | `FAILED` |
  `CANCELLED`. At most one Payment per Checkout snapshot; at most one unresolved Attempt per
  Payment (partial UNIQUE). Provider I/O never holds PostgreSQL locks.
- **Domain ops only:** `startPayment`, `completeZeroPayableCheckout`, `retryPayment`,
  `cancelPayment`, `getPayment` / `getPaymentState`, `reconcilePaymentAttempt`,
  `processVerifiedProviderEvent`, `supersedePayment`. No generic CRUD/status setters. Reuses Cart
  `CustomerActor` trust chain; never raw customer-id authority.
- **Promotion claims:** Payment orchestrates RESERVED→CONSUMED/RELEASED (or direct CONSUMED for
  zero-payable) against `app.promotions.id`; limits remain on `promotion_coupons`.
- **Permissions:** unchanged at **51**; roles remain **7**. Default Docker services remain **4**.
  Runtime dependency delta **0**.
- **Validation:** `npm run audit:payment`, `test:database:payment`, `test:payment`,
  `test:payment-security`, `test:payment-auth-integration`, `test:payment-concurrency`,
  `test:payment-idempotency`, `test:payment-provider`, `test:payment-reconciliation`,
  `test:payment-promotions`.
- **Out of scope (IMP-023+):** Order creation; Refunds; public Payment HTTP/UI; concrete provider
  SDK; webhook transport service.

## Order core (IMP-023)

`src/server/order/` and `src/shared/order/` implement post-purchase Order materialization and
high-level fulfilment lifecycle against a financially satisfied Checkout. The static website
remains unchanged. Public Order HTTP, Refunds, inventory, and notifications are out of scope.

- **One table** via `appSchema.table(...)` in `src/platform/database/schema/order.ts`, created by
  the single migration `drizzle/0017_order.sql` (0000–0016 remain byte-for-byte unchanged):
  `orders`. No Order lines/snapshots/events/refund/inventory tables. No business Order seed rows.
  Commercial truth remains on the Checkout snapshot; Payment is financial provenance only.
- **Lifecycle:** `PLACED` | `ACCEPTED` | `FULFILLED` | `CANCELLED`. Materialization → PLACED;
  PLACED→ACCEPTED|CANCELLED; ACCEPTED→FULFILLED|CANCELLED. Revision BIGINT starts at 1; +1 per
  material transition with `expectedOrderRevision`. Payment provenance `PAYMENT` |
  `NO_PAYMENT_REQUIRED`. Cancellation reasons:
  `CUSTOMER_REQUESTED` | `ITEM_UNAVAILABLE` | `OUTLET_UNABLE_TO_FULFIL` |
  `OPERATIONAL_DISRUPTION` | `BUSINESS_DECISION`.
- **Domain ops only:** `materializeOrderForCompletedCheckout`, `recoverMissingOrdersBatch`,
  `findCompletedCheckoutsMissingOrder`, `getCustomerOrder`, `listCustomerOrders`,
  `getWorkforceOrder`, `searchWorkforceOrders`, `acceptOrder`, `fulfilOrder`, `cancelOrder`.
  No generic CRUD/status setters. Reuses Cart `CustomerActor` and access-control
  `WorkforcePrincipal`; never raw-ID authority. Cart finalization via
  `finalizeCartAfterOrderMaterialization` (clear only when snapshot `sourceCartRevision` matches).
- **Payment hooks:** after successful completion commits (`completeZeroPayableCheckout`,
  `processVerifiedProviderEvent`, reconcile/sync success paths), best-effort materialize outside
  the Payment transaction — never fails Payment.
- **Permissions:** `order.read` / `order.accept` / `order.fulfil` / `order.cancel` (outlet target)
  — final **55** permissions; roles remain **7**. Kitchen: read/accept/fulfil; delivery:
  read/fulfil; support: read/cancel; finance: read.
- **Validation:** `npm run audit:order`, `test:database:order`, `test:order`,
  `test:order-security`, `test:order-auth-integration`, `test:order-concurrency`.
- **Out of scope (IMP-024+):** Refunds; public Order HTTP/UI; inventory; kitchen workflow detail;
  notifications; new Docker service.

## Razorpay productionization server foundation (IMP-026A / D-361–D-363)

Server-only Razorpay adapter inside existing `customer-commerce`. No new deployable service.
Fake provider is never a production fallback. Refund remains IMP-027. Browser Checkout.js is
IMP-026B.

- **Config:** `BOBA_BEAR_PAYMENT_PROVIDER=disabled|razorpay` plus server-only
  `BOBA_BEAR_RAZORPAY_KEY_ID`, `BOBA_BEAR_RAZORPAY_KEY_SECRET`,
  `BOBA_BEAR_RAZORPAY_WEBHOOK_SECRET`. Not `NEXT_PUBLIC_*`. Staging/production fail closed when
  Razorpay is selected and any required secret is missing.
- **Webhook:** `POST /api/integrations/payments/razorpay/webhook` — verify signature, durable
  inbox insert, then 2xx. Payment transitions run asynchronously in-process.
- **Inbox:** `app.payment_provider_event_inbox` (migration `drizzle/0018_payment_provider_event_inbox.sql`).
- **Webhook age:** no hard five-minute rejection. `RAZORPAY_WEBHOOK_AGE_POLICY: GTM_PROVIDER_CONFIRMATION_REQUIRED`.
- **Missing-Order recovery (D-362):** existing `recoverMissingOrdersBatch` only. Operator invocation:

```text
npm run order:recover-missing
npm run order:recover-missing -- --cursor=<checkoutId>
```

Uses application-role `BOBA_BEAR_*` database config. Prints safe counts/identities (checkoutId,
orderId, orderNumber). Repeated invocation is idempotent. Not scheduled automatically in IMP-026A.

## Razorpay Standard Checkout browser integration (IMP-026B / D-361)

Isolated browser adapter under `src/lib/razorpay/`. Generic Payment UX remains provider-neutral.
Checkout.js is loaded from the official Razorpay CDN only (not vendored, not an npm SDK).
`retry.enabled = false`. Client evidence is `POST /api/v1/payments/{paymentId}/client-evidence`.
Browser handler success is not Payment success. Refund remains IMP-027.
`RAZORPAY_WEBHOOK_AGE_POLICY: GTM_PROVIDER_CONFIRMATION_REQUIRED` — no hard five-minute rejection.
Fake `razorpay_standard_checkout` E2E outcome exists only on `e2e-fake-main` and cannot activate in
production composition.

## Financial Document / refund statutory / signing operating constraints (IMP-028 / D-365–D-367)

SUPPORTING operating facts for the locked IMP-028 capability. Binding architecture remains
[`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md)
and **D-365** / **D-366** / **D-367**. Formal `acceptedThrough` is IMP-028. Formal
`IMP-028_IMPLEMENTATION_COMPLETE` is **YES**. Formal `IMP-028_ACCEPTED` is **YES**. Do not treat
this section as authorization to start IMP-029.

- **MVP posture:** compliance-correct, operationally manual, automation-ready. Operators may
  classify refunds and sign PDFs at low volume; statutory immutability, numbering, and auditability
  are not weakened.
- **Current implemented issuance policy variant:** `uninvoiced_advance`. Payment `SUCCEEDED` →
  `RECEIPT_VOUCHER` after the Payment commit; Order `FULFILLED` → `TAX_INVOICE` after the Order
  commit. Statutory/signing failure never rolls back Payment/Order/Refund commercial truth.
- **Money:** integer paise and integer basis points only. Nested `Persistence.transaction()` remains
  unsupported. D-366 RFV/CN issuance composes D-365 via
  `issueFinancialDocument(..., { transactionContext })` in one PostgreSQL transaction.
- **Recovery (not scheduled):**

```text
npm run financial-document:recover-missing-receipt-vouchers
npm run financial-document:recover-missing-tax-invoices
npm run fd:signing -- pending
npm run fd:signing -- export --financial-document-id <id> --out <path>
npm run fd:signing -- upload --financial-document-id <id> --file <path> \
  --signer-profile-id <id> --signed-at <ISO> --signature-profile <value> \
  --attest-signed-artifact
```

- **Manual signing MVP:** BOBA does not cryptographically sign. Authorised humans sign externally.
  PostgreSQL BYTEA stores exact signed bytes. SHA-256 integrity and PDF-container checks are not
  cryptographic signature verification. Production signing provider is intentionally not configured.
- **Deployment gates (not code defects):** production `AuthorisedSignerProfile`, issuer profile, and
  statutory numbering must be supplied as explicit deployment inputs. Do not fabricate values to
  make acceptance green.
- **Customer access:** exact ownership proof; unknown/unauthorized converge to `DOCUMENT_NOT_FOUND`
  (non-oracle). Required-document PDF is unavailable until `SignatureArtifact.status=SIGNED`.
- **Out of scope here:** IMP-029; unattended DSC/eSign/HSM; ESP integration; automatic RFV/CN/NSD
  classification; proportional partial allocator; scheduler/queue/worker for these flows.

## Founder UAT and Docker Desktop exact-candidate deployment gate

SUPPORTING operational rule for future capability acceptance where interactive founder UAT is
required. Canonical IMP sequence and accepted state remain owned by `ROADMAP.md` and `STATE.md`.
This section does not itself mark any capability accepted.

- **Applicability rule:** record `FOUNDER_UAT_REQUIRED = YES | NO` for the relevant capability
  acceptance gate. Docker/founder UAT is mandatory when the capability materially changes
  customer-visible behavior, materially changes operator-visible behavior requiring interactive
  validation, the acceptance plan explicitly marks UAT required, or the founder requests UAT.
  Governance-only, documentation-only, architecture-definition, repository-maintenance, and internal
  tooling tasks with no interactive acceptance surface do not automatically require Docker UAT.
- **Separate gate:** independent technical acceptance and founder UAT are distinct gates. For
  `FOUNDER_UAT_REQUIRED = YES`, final lifecycle is:

```text
IMPLEMENTATION_COMPLETE
→ INDEPENDENT_TECHNICAL_ACCEPTANCE
→ UAT_DEPLOYMENT
→ FOUNDER_UAT
→ ACCEPTANCE_RECONCILIATION
```

  `COMPLETE_AND_ACCEPTED` must not be claimed, and `acceptedThrough` must not advance through that
  capability, until all required UAT gates pass and reconciliation records them.
- **Exact candidate identity:** founder UAT must validate the exact implementation candidate that
  passed independent technical acceptance. Minimum required candidate identity:

```text
CANONICAL_REPOSITORY_PATH
BRANCH
HEAD
WORKING_TREE_FINGERPRINT
```

  `WORKING_TREE_FINGERPRINT` is mandatory because BOBA validation may intentionally include
  authorized uncommitted working-tree content. `HEAD` alone is insufficient provenance.
- **Pre-deployment verification:** before UAT deployment verify canonical repository,
  `main`, exact `HEAD`, and exact content-sensitive working-tree fingerprint; confirm they match the
  independently accepted candidate. If fingerprint or relevant source differs, UAT deployment must
  stop. The modified candidate must return through the applicable validation / technical-acceptance
  gates before founder UAT.
- **Docker Desktop deployment surface:** when founder UAT is required, use the repository's existing
  Docker Desktop / Compose architecture from `/home/ajoshi/repos/boba-bear-platform`. Build from the
  exact accepted working tree, including authorized uncommitted changes. Do not deploy from an older
  clone, from `/mnt/c`, from remote Git `HEAD` alone, or from a stale already-running image as UAT
  evidence.
- **Fresh build rule:** do not treat a plain `docker compose up` against an unknown pre-existing
  image as sufficient UAT evidence. Rebuild the required image from current source during the UAT
  deployment operation, using the repository's actual Docker/Compose commands. Where provenance
  would otherwise be ambiguous, prefer the repository-supported equivalent of a fresh/no-cache
  rebuild for UAT. Do not destroy persistent application data unless the UAT plan explicitly
  requires a fresh database, and do not destroy unrelated Docker resources.
- **Image and container provenance:** each UAT deployment return must record as much provenance as
  current tooling allows:

```text
UAT_SOURCE_REPOSITORY
UAT_SOURCE_BRANCH
UAT_SOURCE_HEAD
UAT_SOURCE_FINGERPRINT
UAT_IMAGE
UAT_IMAGE_ID
UAT_IMAGE_DIGEST
UAT_CONTAINER
UAT_DEPLOYMENT_STATUS
UAT_URL
```

  If the image does not embed Git/fingerprint metadata, recording the exact source fingerprint plus
  the resulting image ID is sufficient initial evidence. Do not introduce runtime changes solely to
  embed provenance unless a later capability authorizes that work.
- **Deployed-candidate verification:** after deployment, verify the running service is using the
  newly built image rather than a previous image/container. Return:

```text
EXPECTED_SOURCE_FINGERPRINT
ACTUAL_DEPLOYED_IMAGE_ID
RUNNING_CONTAINER_IMAGE_ID
MATCH = YES | NO
```

  If the new image is not actually running, classify deployment as `FAIL_STALE_CONTAINER` and do
  not invite founder UAT.
- **Founder handoff:** when deployment succeeds, provide the founder a concise manual UAT handoff
  containing the exact URL, prerequisite login/state if any, the exact customer/operator journey to
  test, expected visible behavior, known accepted limitations, and how to report `PASS`, `FAIL`, or
  defects. Do not bury founder UAT in internal implementation detail.
- **Founder verdict boundary:** only the founder/user may provide the final interactive UAT verdict.
  Allowed outcomes are `UAT = PASS | FAIL | BLOCKED`. An implementation agent must never
  self-declare `FOUNDER_UAT = PASS`.
- **Failure and retest loop:** if founder UAT fails, preserve the failed UAT evidence, classify the
  defects, reopen the bounded capability, fix the defects, rerun applicable tests, generate a new
  working-tree fingerprint, obtain/reconfirm technical acceptance for the new candidate,
  rebuild/redeploy, and repeat founder UAT. Never treat UAT of an older image as validation of a
  newer fingerprint.
- **IMP-028B applicability (historical):** `IMP-028B — Customer Menu Projection + Discovery` was
  `FOUNDER_UAT_REQUIRED = YES` before `COMPLETE_AND_ACCEPTED` because it materially changes customer
  `/order`, Menu serving, category navigation, product-card/display-price presentation, and the Add
  / Cart flow. The required sequence was completed before its accepted lifecycle was reconciled:

```text
1. independent technical acceptance of AC-01–AC-12
2. Docker Desktop UAT deployment of that exact accepted fingerprint
3. founder manual UAT
4. acceptance reconciliation only after UAT PASS
```
