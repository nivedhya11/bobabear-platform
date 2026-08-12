# Boba Bear — Landing Page

Marketing landing page for **Boba Bear**, Dehradun's boba-tea bar and Korean street-food kitchen
(*S-Tier Sips · K-Street Drip*). A single long-scroll page: hero video, signature-drop countdown,
full menu (drinks / K-street plates / sweets), merch teaser, artists collab teaser, and an
"access the drop" ordering section (Zomato / Swiggy / WhatsApp).

## Platform documentation

This repository currently ships the marketing site described below. BOBA Bear's broader
direct-ordering platform documentation lives under [`docs/platform/`](docs/platform/README.md).
Start with the CURRENT authority stack there: `VISION.md`, `ARCHITECTURE.md`,
`decision-register.md`, `ROADMAP.md`, and `STATE.md` (plus root `AGENTS.md` for agent rules).
Anyone planning platform-level work should read that stack before writing a specification or code;
it takes precedence over older planning documents, wireframes, and design-system drafts elsewhere
in this repository.

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5, React 19 |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion 12 |
| Icons | lucide-react |

## Prerequisites

- **Node.js 20+** and npm.

## Getting started

```bash
npm install      # install dependencies
npm run dev      # start the dev server → http://localhost:3000
```

The page hot-reloads as you edit.

## Build & run in production

```bash
npm run build    # static export → out/
npm run lint     # ESLint
```

> `output: "export"` is always enabled; the site is a fully static export. `npm run start` is not
> used — serve `out/` with any static host or `npx serve out` locally.

## Testing & quality gates

| Command | What it runs |
|---|---|
| `npm test` | Unit + component tests (Vitest, jsdom, React Testing Library) — runs once and exits. |
| `npm run test:watch` | Same suite, in watch mode. |
| `npm run test:coverage` | Unit + component tests with V8 coverage (`text`, `json`, `lcov`, `html` → `coverage/`). |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run test:e2e` | Builds the site, then runs the Playwright Test suite (`tests/e2e/`) against the static export. |
| `npm run check` | `lint` + `typecheck` + `config:check` + `test` + `test:scripts` + audits (including `audit:access-control` + `audit:catalog`) + `auth:schema:check` + `db:migrations:check` + `db:schema:check` — the fast local gate. Does not require Docker. |
| `npm run audit:catalog` | Docker-free static audit of the IMP-012 canonical catalog boundary (migration seal, no pricing/availability/menu/HTTP/Docker surface). Part of `npm run check`. |
| `npm run test:database:catalog` | Canonical catalog PostgreSQL integration suite (schema integrity, privileges, FKs). **Requires Docker.** |
| `npm run test:catalog` | Catalog domain/service suite (activation, modifiers, bundles, authz). **Requires Docker.** |
| `npm run verify` | `check` + `test:e2e` + `test:e2e:customer-auth` — the complete local gate; run before pushing. **The `test:e2e:customer-auth` step requires Docker** (Testcontainers). |
| `npm run test:database` | PostgreSQL 18 database integration tests (Testcontainers), including the IMP-009 slice. **Requires Docker.** Never runs as part of `check`/`verify`. |
| `npm run verify:database` | `db:migrations:check` + `db:schema:check` + `test:database` + `db:verify` — the complete database-assurance gate. **Requires Docker** and the local Compose database running (`db:up`). |
| `npm run test:customer-auth:http` | Real-HTTP integration tests against a live `CustomerAuthService` instance and a disposable Testcontainers database (IMP-009). **Requires Docker.** |
| `npm run test:e2e:customer-auth` | Playwright E2E for the phone-OTP login flow, against a local ephemeral harness (Testcontainers database + the compiled customer-auth service). **Requires Docker.** Run `PLAYWRIGHT_TARGET=docker npm run test:e2e:customer-auth` instead to target an already-running `npm run docker:up` stack. |

`npm test` and `npm run test:coverage` run through a repository-owned wrapper
(`scripts/run-vitest.mjs`) instead of invoking Vitest directly. Vitest's own exit code isn't
trusted alone — under memory pressure its worker process can time out and report zero executed
test files while still exiting successfully. The wrapper independently validates Vitest's `json`
reporter output and fails the command (non-zero exit) unless at least one test file and one test
actually ran and all executed tests passed. `npm run test:watch` is unaffected — it stays
interactive and runs Vitest directly.

Unit/component tests are colocated with the code they test (`src/**/*.test.ts(x)`). E2E specs live
in `tests/e2e/`, which Playwright drives against a small static file server
(`scripts/serve-static-export.mjs`) serving `out/` — not the dev server — so the suite exercises the
actual production artifact. The Playwright browser gate currently covers two Chromium projects only
(`desktop-chromium`, `mobile-chromium`); Firefox and WebKit are deferred to a later slice.

Install the Chromium browser Playwright needs before running `test:e2e` or `verify`:

```bash
npx playwright install chromium
```

`coverage/`, `playwright-report/`, and `test-results/` are generated output — gitignored, safe to
delete, regenerated on the next test run.

## Local Docker runtime

Runs the static site and PostgreSQL together through **Docker Desktop**, exactly as a second,
containerized way to validate the site — the site itself is unchanged: still `output: "export"`,
still no database access from any page or build step. This section requires a **native WSL2
repository checkout** and a running Docker Desktop; none of it is required for ordinary
development (`npm run dev`, `npm run check`, `npm run verify` all work without Docker).

**Why the app container has no database credentials.** The `app` service is Nginx serving the
static export (`out/`) — it never runs Node, never imports `pg`/Drizzle, and never opens a database
connection. Database connectivity is proven separately, from dedicated one-shot Node "tooling"
containers (`migrate`, `db-check`, `db-check-migration`) built from a different Dockerfile stage.
Splitting it this way means the artifact you'd actually deploy (a read-only, non-root Nginx image)
never holds a secret it doesn't need.

**Ports**: app on `8080` (host, overridable via `BOBA_BEAR_APP_HOST_PORT`), PostgreSQL on `5433`
(unchanged from IMP-004).

### One-time setup

```bash
npm run db:env:init       # generates .env.docker.local + .env.local database keys (IMP-004)
npm run docker:env:init   # generates .env.runtime.docker.local + .env.migration.docker.local
                          # + .env.customer-auth.docker.local (IMP-009 auth/OTP secrets)
```

Both generators are idempotent and never rotate an existing password — safe to re-run.
`.env.customer-auth.docker.local` holds the `customer-auth` service's own generated
`CUSTOMER_AUTH_SECRET`/`CUSTOMER_AUTH_PII_HASH_SECRET` — git-ignored, never committed, never printed
by any generator or check script.

### Everyday commands

| Command | What it does |
|---|---|
| `npm run docker:build` | Builds the `app` (Nginx) and tooling images. |
| `npm run docker:up` | One-command startup: env init → Compose validation → PostgreSQL healthy → migrate → app healthy → both role connectivity checks → HTTP smoke check. Leaves a healthy stack running. |
| `npm run docker:status` | `docker compose ps`. |
| `npm run docker:logs` | Tails the `app` service's logs. |
| `npm run docker:down` | Stops and removes containers (`docker compose down --remove-orphans`). **Preserves the PostgreSQL volume** — data and migration history survive. |
| `npm run docker:migrate` | Runs the one-shot migration container (`docker compose run --rm migrate`). Idempotent — safe to run twice. |
| `npm run docker:db:check` / `docker:db:check:migration` | One-shot application-role / migration-role connectivity checks from inside the Compose network. |
| `npm run docker:smoke` | HTTP checks against the running `app` container (all public routes, a real 404 for unknown paths, no directory listing, no Nginx version header). |
| `npm run test:e2e:docker` | Runs the existing Playwright suite against the already-running `app` container (no local build, no local static server). |
| `npm run docker:inspect` | Live evidence: non-root user, read-only root filesystem, dropped capabilities, health status, no database env vars — for the image and the running container. |
| `npm run docker:customer-auth:logs` | Tails the `customer-auth` service's logs (IMP-009). |
| `npm run docker:customer-auth:inspect` | Live evidence for the `customer-auth` container: non-root user, read-only root filesystem, dropped capabilities, health status, and that it has no published host port (reachable only through `app`'s Nginx proxy). |
| `npm run docker:customer-auth:smoke` | HTTP checks against the running stack's `/api/customer-auth/*` façade (through the `app`/Nginx proxy) — never logs the OTP or phone number it uses. |
| `npm run docker:verify` | The complete Docker gate: `audit:docker` → build → up → inspect → smoke → `docker:customer-auth:inspect` → `docker:customer-auth:smoke` → `test:e2e:docker`. |

**Destroying local data.** `docker:down` never touches the PostgreSQL volume. To start over with a
fresh database (new schema, new bootstrap credentials), use the existing `npm run db:reset --
--confirm=RESET_BOBA_BEAR_LOCAL_DATABASE` (IMP-004) — this is a separate, explicit, destructive
action, never something `docker:down` or `docker:up` does on your behalf.

**Tooling services and the `tools` profile.** `migrate`, `db-check`, and `db-check-migration` are
one-shot containers under the Compose `tools` profile — they never start with a plain
`docker compose up`, only via `docker compose run --rm <service>` (or the `npm run docker:*`
wrappers above). Each receives only the least-privilege env file its role needs
(`.env.migration.docker.local` or `.env.runtime.docker.local`) — never the other role's file, and
never the PostgreSQL bootstrap-admin credentials in `.env.docker.local`.

### Troubleshooting

- **Port 8080 already in use** — set an alternate host port for one run:
  `BOBA_BEAR_APP_HOST_PORT=18080 docker compose up -d --wait app`.
- **`app` container reports unhealthy** — check `npm run docker:logs`; the health check is a plain
  `wget` against `http://127.0.0.1:8080/` inside the container, so a failure almost always means the
  static export didn't build correctly (rebuild with `npm run docker:build`) rather than a database
  problem — the app never talks to PostgreSQL.
- **A one-shot tooling container fails immediately with a missing-env-file error** — re-run
  `npm run docker:env:init`; nothing it prints or logs ever includes a password or connection
  string.

## Environment variables

The site itself (the marketing page you're editing) runs with **no required environment
variables**. Two optional, pre-existing overrides:

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://thebobabear.in` | Canonical URL used in metadata, `sitemap.xml`, `robots.txt`, and JSON-LD. |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | *(unset — analytics off)* | GA4 Measurement ID (`G-XXXXXXXXXX`). When unset, no analytics scripts load. |

Copy `.env.example` → `.env.local` and fill in if you need to override either of the above.

### BOBA Bear platform configuration (`src/platform/config/`)

Separately, the BOBA Bear direct-order **platform** foundation (see `docs/platform/`) has its own
centralized, typed, environment-aware configuration boundary, introduced in implementation slice
IMP-003 and documented in ADR-015. It does not change anything about the marketing page above; it
exists so later platform slices (accounts, ordering, payments, outlets) have one validated place to
read configuration from instead of scattering `process.env` reads through the codebase.

Copy `.env.example` → `.env.local` (created automatically the first time this is set up, if it
doesn't already exist) and adjust as needed — see the comments in `.env.example` for the full
catalogue. In short:

| Variable | Required? | Notes |
|---|---|---|
| `BOBA_BEAR_ENV` | Yes | One of `local`, `test`, `ci`, `staging`, `production`. No aliases (`dev`/`prod`/`stage` are rejected). Never inferred from `NODE_ENV`. |
| `BOBA_BEAR_PUBLIC_ORIGIN` | Yes | Absolute `http(s)` origin, no path/query/fragment/credentials. HTTPS + non-loopback required in `staging`/`production`. |
| `BOBA_BEAR_LOG_LEVEL` | No | One of `debug`, `info`, `warn`, `error`. Defaults per environment. |
| `BOBA_BEAR_RELEASE` | Only in `staging`/`production` | Any concise, whitespace-free identifier (git SHA, release tag, ...), ≤128 chars. |
| `BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS` | No | Exactly `"true"` or `"false"`. Must be `"false"` in `staging`/`production`. Does not enable anything in this slice — it is a safeguard for later provider-adapter slices. |
| `PORT` | No (web process only) | Integer 1–65535, defaults to `3000`. |

Validate configuration without starting the app:

```bash
npm run config:check            # validates the "web" process (default)
npm run config:check:web
npm run config:check:worker
npm run config:check:migration
```

Rules enforced by the schema (`src/platform/config/schema.ts`), not just documented here:
- Any unrecognized `BOBA_BEAR_*` variable fails validation (catches typos like `BOBA_BEAR_ENVIROMENT`).
- Any undeclared `NEXT_PUBLIC_*` variable fails validation — **the browser-public configuration
  allowlist is currently empty** (`src/platform/config/public-config.ts`). The two pre-existing
  `NEXT_PUBLIC_*` variables above predate this boundary and are an explicit, narrow, documented
  exception (see `AGENTS.md`); anything else new requires a schema entry, an allowlist entry, tests,
  documentation, and a security review before it may reach the browser.
- Application source must never read `process.env` directly — only
  `src/platform/config/**` and `src/instrumentation.ts` may (enforced by an ESLint rule and by
  `npm run audit:config`).
- Configuration errors never include raw environment values, only variable names and safe
  descriptions of what's wrong (`ConfigurationError`).

### Startup bootstrap

`src/instrumentation.ts` calls `bootstrapApplication("web")` (`src/platform/startup/`) once per
Node.js process, via Next.js's [instrumentation
hook](https://nextjs.org/docs/app/guides/instrumentation). It validates configuration once, is safe
to call repeatedly/concurrently, and prints at most one safe summary line per process. It does not
call any provider, database, or background job — that's out of scope for this slice.

Empirically (verified while building this slice): the instrumentation hook runs during `next dev`
and `next start`, but **not** during `next build` for this statically-exported site — a static
build has no live Node.js server process for the hook to attach to. This means the existing GitHub
Pages deploy workflow (which only runs `npm run build`) is unaffected by the new mandatory
`BOBA_BEAR_ENV` requirement.

**Health endpoints** (`/health/live`, `/health/ready`) are intentionally **not** implemented yet —
the site is a static export with no request-serving Node.js process. The startup module exposes a
safe status projection (`getStartupStatus()`) for a later server-capable slice to use.

### Local PostgreSQL / Drizzle foundation (`src/platform/database/`)

IMP-004 adds a local-only PostgreSQL 18.4 database, run through Docker Compose, plus a Drizzle ORM
foundation for later platform slices to build business tables on. Like the configuration boundary
above, this **does not change the marketing site's behavior at all** — nothing in the site's build,
static export, or page rendering opens a database connection. The database is infrastructure-only in
this slice: no business-domain table exists yet.

**Prerequisites:** Docker Desktop (with Compose v2) running, and this repository checked out on a
native Linux/WSL filesystem (not a Windows-mounted `/mnt/c/...` path — Docker bind-mount performance
and file-permission semantics are unreliable there).

**One-time local setup:**

```bash
npm run db:env:init   # generates .env.docker.local (git-ignored) and syncs
                       # BOBA_BEAR_DATABASE_URL / BOBA_BEAR_DATABASE_MIGRATION_URL /
                       # BOBA_BEAR_DATABASE_SSL_MODE into .env.local. Never prints a password.
npm run db:pull        # pull postgres:18.4-trixie
npm run db:up           # start PostgreSQL and wait for it to report healthy
npm run db:migrate      # apply committed SQL migrations from ./drizzle
```

**Day-to-day commands:**

| Command | What it does |
|---|---|
| `npm run db:up` / `db:down` | Start / stop the container. `db:down` **preserves** the named volume (data survives). |
| `npm run db:status` / `db:logs` | Container health/state / recent logs. |
| `npm run db:generate` | Generate a new Drizzle SQL migration from schema changes (never `drizzle-kit push`). |
| `npm run db:migrate` | Apply pending migrations. Idempotent — safe to run repeatedly. |
| `npm run db:check` / `db:check:migration` | Connectivity check as the application / migration role. Prints role, database, schema, server version — never a password or connection string. |
| `npm run db:verify` | Proves the full privilege contract below (18 assertions) against a running database. |
| `npm run db:reset -- --confirm=RESET_BOBA_BEAR_LOCAL_DATABASE` | **Destructive.** Drops and recreates the local volume, re-migrates, re-verifies. Refuses to run without the exact confirmation token, and refuses to run against anything but a local environment. |

**Role separation and schema ownership** (enforced at the database level, not just documented):

| Role | Used by | Privileges |
|---|---|---|
| `boba_bear_admin` | Docker container bootstrap only | Local superuser. Never used by application code; never appears in application configuration. |
| `boba_bear_migrator` | `npm run db:migrate` / `db:generate` only | Owns `boba_bear_local` and the `app`/`drizzle` schemas. Not superuser, cannot create databases/roles. Never used by the web or worker runtime. |
| `boba_bear_app` | Web/worker runtime | `USAGE` (not `CREATE`) on `app`; DML only (`SELECT`/`INSERT`/`UPDATE`/`DELETE`) via the migrator's default privileges; no access to the `drizzle` schema at all. |

Schemas: `app` (application tables — owned by the migrator), `drizzle` (Drizzle's own migration
history, `drizzle.__drizzle_migrations` — never accessible to the runtime role), `public` (retained
for PostgreSQL compatibility only; `CREATE` is revoked from `PUBLIC`; no BOBA Bear table ever lives
here).

**Persistence:** the named Docker volume (`postgres-data`, mounted at `/var/lib/postgresql`) survives
an ordinary `db:down` / `db:up` cycle. Bootstrap (`docker/postgres/init/001-bootstrap.sh`) only runs
once, the first time the volume is created — changing `.env.docker.local` afterward does **not**
change credentials already stored inside Postgres; use `db:reset` to start over.

**Secrecy:** `BOBA_BEAR_DATABASE_URL` / `BOBA_BEAR_DATABASE_MIGRATION_URL` are validated by the same
configuration boundary as everything else in `src/platform/config/`, are treated as secret-sensitive
by the redaction/audit tooling, and are never included in a safe configuration summary (which reports
only `databaseConfigured: true/false` and `databaseSslMode`). `.env.docker.local` is git-ignored and
must never be committed (`.env.docker.example` is the committed, placeholder-only template).

**No automatic migrations:** the web/worker process never runs a migration on startup —
`npm run db:migrate` is a separate, explicit, human- or CI-triggered command
(`scripts/database/migrate.ts`).

### Database integration tests & migration validation (`tests/database/`)

IMP-005 adds a real-PostgreSQL integration-test harness and migration-integrity tooling on top of
the IMP-004 foundation above. It changes nothing about the marketing site's behavior.

**Unit tests vs. database integration tests** — two entirely separate suites:

- `npm test` (Vitest, jsdom, `src/**/*.test.ts(x)`) never touches a database and never starts Docker.
- `npm run test:database` (Vitest, Node environment, `tests/database/**/*.integration.test.ts`)
  starts a real, disposable PostgreSQL 18 container per run and **requires Docker**. It is never
  collected by `npm test`, `npm run check`, or `npm run verify` — those commands stay runnable
  without Docker.

**Why `npm test` doesn't start Docker:** the fast local gate (`check`) is meant to run anywhere,
including machines without Docker installed. Database assurance is a separate, explicit gate
(`verify:database`) that a developer or CI job opts into.

**Testcontainers image:** every database integration test uses exactly `postgres:18.4-trixie` (the
same maintenance version as local Compose), started fresh per test run on a **dynamically-assigned
host port** — never the local Compose database's fixed port 5433, so both can run at the same time.

**Fresh-database isolation model:** one Testcontainers container is shared for the whole
`test:database` run (`tests/database/global-setup.ts`), but every test that needs a database gets
its own uniquely-named, empty database (`tests/database/support/test-database.ts`), created through
the container's administrator connection and always dropped afterward — no database, table, or row
is ever retained between tests.

**Migration immutability and sealing:** `drizzle/migration-integrity.json` pins a SHA-256 hash for
every committed migration SQL file. A historical migration's hash, order, or presence can never
change without failing validation. New migrations must be sealed explicitly:

```bash
npm run db:migrations:check                                   # check-only, no Docker required
npm run db:migrations:seal -- --confirm=SEAL_NEW_BOBA_BEAR_MIGRATIONS   # append newly-generated migrations
```

**Schema-drift validation** (`npm run db:schema:check`) proves that running `drizzle-kit generate`
against the current schema right now would produce no new migration and no modified snapshot —
i.e. the committed migration history is caught up with `src/platform/database/schema`. It runs
entirely inside a temporary directory, never touches the real `drizzle/` directory, and requires no
database connection.

**Docker-unavailable behaviour:** `npm run test:database` fails non-zero (not skipped, not a
warning) if Docker isn't running — database assurance is never silently bypassed.

**Local Compose and Testcontainers coexistence:** both can run at the same time. `test:database`
never reads `BOBA_BEAR_DATABASE_URL`/`.env.docker.local`, never binds its container to port 5433,
and never modifies the local Compose database's data.

**No business tables yet:** like IMP-004, this slice adds test infrastructure only — no
business-domain table exists.

| Command | What it does |
|---|---|
| `npm run test:database` | Run the Testcontainers-backed PostgreSQL integration-test suite. **Requires Docker.** |
| `npm run db:migrations:check` | Static, Docker-free validation of the migration journal, SQL files, snapshots, and the sealed integrity manifest. |
| `npm run db:schema:check` | Static, Docker-free schema-drift check (see above). |
| `npm run db:migrations:seal -- --confirm=SEAL_NEW_BOBA_BEAR_MIGRATIONS` | Seal newly-generated migrations into `drizzle/migration-integrity.json`. Refuses to replace, reorder, or remove a historical entry. |
| `npm run verify:database` | The complete database-assurance gate: `db:migrations:check` + `db:schema:check` + `test:database` + `db:verify`. **Requires Docker** and a running local Compose database. |

### Shared persistence primitives (`src/server/persistence/`)

IMP-006 adds a reusable, typed, server-only persistence boundary that future repository modules
build on top of `src/platform/database` (IMP-004/005) — infrastructure only, no business-domain
table, no new migration.

- **Two factories, nothing else:** `getApplicationPersistence(webOrWorkerConfig)` and
  `getMigrationPersistence(migrationConfig)`. No generic `getPersistence(role, config)`, no raw
  connection-string factory, no bootstrap/admin factory.
- **Lazy, shared, explicitly closed:** creating/retrieving a handle never connects; the pool is
  created on first use and shared across repeated calls with the *same* configuration object; call
  `await persistence.close()` when done (idempotent, safe before or after use, safe twice).
- **Typed contexts, no raw pool:** `persistence.withContext(fn)` and `persistence.transaction(fn)`
  hand `fn` a `PersistenceQueryContext`/`PersistenceTransactionContext` — a role tag plus a typed
  Drizzle executor — never a global pool a repository could reach into directly.
- **Secret-safe errors:** `PersistenceConfigurationError` / `PersistenceUnavailableError` /
  `PersistenceClosedError` / `PersistenceOperationError` — never a connection string, password, or
  raw driver message.
- **`server-only` and the `react-server` condition:** the boundary's public entry point carries
  `import "server-only"`. Because the real package throws unless Node's `react-server` export
  condition is active, the one-shot database-check tooling that consumes this boundary runs as
  `node --conditions=react-server --import tsx ...` (see `db:check` / `db:check:migration` below),
  and Vitest aliases `server-only` to a no-op stub for tests only.
- **`npm run audit:persistence`** statically enforces the client-import boundary (including
  untracked files) and is part of `npm run check`.

| Command | What it does |
|---|---|
| `npm run audit:persistence` | Docker-free static audit of the persistence client-import boundary. Part of `npm run check`. |
| `npm run test:database:persistence` | The persistence-specific slice of the PostgreSQL integration suite (role connectivity, availability, transaction commit/rollback, lifecycle). **Requires Docker.** Also runs as part of `npm run test:database`. |
| `npm run db:check` / `npm run db:check:migration` | Unchanged commands, now implemented on top of `getApplicationPersistence`/`getMigrationPersistence` instead of the low-level client factory directly. |

### Better Auth persistence and sessions (`src/server/auth/`)

IMP-008 adds a server-only, database-backed [Better Auth](https://www.better-auth.com/) 1.6.25
foundation with two fully isolated authentication realms — **customer** and **workforce** — built on
top of the IMP-006 persistence boundary. Infrastructure only: no login UI, no HTTP route, no
credentials flow yet. See AGENTS.md's "Better Auth persistence and sessions (IMP-008)" section for the
full rationale; summary below.

- **Pinned exact versions:** `better-auth@1.6.25`, `@better-auth/drizzle-adapter@1.6.25`, `auth@1.6.25`
  (CLI, dev-only) — never a range, never `@latest`.
- **Two realms, never shared:** separate config, secrets, cookie prefixes (`boba-customer` /
  `boba-workforce`), base paths (`/api/auth/customer` / `/api/auth/workforce`), Drizzle tables, and
  runtime registries. `getCustomerAuthRuntime(config)` / `getWorkforceAuthRuntime(config)` are the only
  entry points — no generic `getAuthRuntime(realm, ...)` a caller could misuse, and a config for the
  wrong realm fails closed at runtime, not only at the type level.
- **Four environment variables**, validated by `src/server/auth/shared/config.ts` (a config boundary
  separate from `src/platform/config`, since these aren't `BOBA_BEAR_*`-prefixed):
  `CUSTOMER_AUTH_SECRET`, `CUSTOMER_AUTH_BASE_URL`, `WORKFORCE_AUTH_SECRET`, `WORKFORCE_AUTH_BASE_URL`.
  None of these are required to run `npm run build` — the static marketing site build has no
  dependency on this foundation.
- **Eight tables** (`customer_auth_{users,sessions,accounts,verifications}`,
  `workforce_auth_{users,sessions,accounts,verifications}`) in the `app` schema, added by the single
  `drizzle/0002_better_auth_foundation.sql` migration. Session policy: 7-day expiry, 24-hour refresh,
  5-minute freshness, database-persisted, no cookie cache, no secondary storage.
- **No authentication method is enabled in this slice** — email/password, social providers, plugins,
  and rate limiting are all off; there is no Better Auth HTTP handler mounted and no browser auth
  client in production source.

| Command | What it does |
|---|---|
| `npm run audit:auth-foundation` | Docker-free static audit of the two-realm boundary, pinned versions, disabled capabilities, and the new migration's table set. Part of `npm run check`. |
| `npm run auth:schema:check` | Regenerates both realms' Better Auth 1.6.25 core contract via the local CLI and diffs it against the production schema. No network, no database. Part of `npm run check`. |
| `npm run auth:schema:generate` | Regenerates both realms' contracts into a disposable directory for manual review. Never overwrites the production schema files. |
| `npm run test:database:auth-foundation` | The auth-foundation slice of the PostgreSQL integration suite (migration, realm-scoped privileges, session lifecycle, cross-realm isolation). **Requires Docker.** Also runs as part of `npm run test:database`. |

### Customer phone OTP authentication (`src/server/customer-auth/`)

IMP-009 adds a standalone customer-facing sign-in flow — an Indian mobile number plus a six-digit
one-time code — on top of the IMP-008 customer realm. **There is no production SMS provider in this
slice**: the only OTP provider is an in-process `local` one, allowed only in `local`/`test`/`ci` and
refused (fail-closed) in staging/production. See AGENTS.md's "Customer phone OTP authentication
(IMP-009)" section for the full rationale; summary below.

- **Pinned exact version:** `libphonenumber-js@1.13.10` — never a range, never `@latest`. India-only
  mobile normalization (`src/shared/customer-auth/phone.ts`) is the one place a phone string becomes
  a validated `E164IndianMobileNumber`.
- **A dedicated Node HTTP service**, not a Next.js API route: `src/server/customer-auth/{service,main}.ts`
  exposes exactly four public JSON endpoints under `/api/customer-auth/` (`send-otp`, `verify-otp`,
  `session`, `sign-out`) plus two unproxied health endpoints. `sendOtp` calls the OTP provider
  directly (never Better Auth's `sendPhoneNumberOTP`); `verifyOtp` calls Better Auth's
  `verifyPhoneNumber` so session/user creation stays inside Better Auth.
- **Nothing sensitive is ever stored or logged.** Phone numbers and client IPs are only ever HMAC-hashed
  (`src/server/customer-auth/pii.ts`) before touching the database or a rate-limit key; the OTP code
  itself is never persisted in plaintext, never echoed back in an HTTP response, and never appears in
  a log line.
- **Durable rate limiting** (`app.customer_otp_rate_limits`, IMP-009's one migration,
  `drizzle/0003_customer_phone_otp_authentication.sql`) — four scopes covering per-phone and per-IP
  send/verify limits, consumed atomically, storing only a scope name and a hashed key.
- **The browser side never persists PII.** `src/lib/customer-auth/client.ts` and the `/login` page keep
  the phone number and OTP code only in React state — never `localStorage`, `sessionStorage`, or the
  URL.

| Command | What it does |
|---|---|
| `npm run audit:customer-phone-auth` | Docker-free static audit of pinned versions, the provider/rate-limit/HTTP boundaries, fail-closed production behaviour, no OTP/phone/PII logging or storage, and the new migration's table set. Part of `npm run check`. |
| `npm run test:database:customer-phone-auth` | The customer-phone-auth slice of the PostgreSQL integration suite (migration, privileges, rate-limit atomicity/concurrency, full local-provider send/verify/session/sign-out flow). **Requires Docker.** Also runs as part of `npm run test:database`. |
| `npm run test:customer-auth:http` | Real-HTTP tests against a live `CustomerAuthService` instance on an ephemeral loopback port and a disposable database. **Requires Docker.** |
| `npm run test:e2e:customer-auth` | Playwright E2E for the `/login` phone-OTP flow — locally via an ephemeral Testcontainers-backed harness (`scripts/e2e/customer-auth-server.ts`), or against the Docker stack via `PLAYWRIGHT_TARGET=docker`. **Requires Docker.** |
| `npm run docker:customer-auth:smoke` / `docker:customer-auth:inspect` / `docker:customer-auth:logs` | Docker-runtime checks for the `customer-auth` Compose service — see the [Local Docker runtime](#local-docker-runtime) section above. |

Running the customer-auth Testcontainers-backed suites (`test:database:customer-phone-auth`,
`test:customer-auth:http`, `test:e2e:customer-auth`) requires Docker but never the local Compose
stack — each test provisions and tears down its own disposable PostgreSQL container. `npm run
test:e2e:customer-auth` additionally requires a fresh `npm run customer-auth:build` (done for you as
part of the script) since its local harness runs the actual compiled service, not `tsx`.

To inspect the Docker-hosted `customer-auth` container directly (after `npm run docker:up`):

```bash
npm run docker:customer-auth:logs      # tail its stdout/stderr
npm run docker:customer-auth:inspect   # non-root user, read-only fs, dropped caps, health, no host port
npm run docker:customer-auth:smoke     # exercise /api/customer-auth/* through the app/Nginx proxy
```

## Editing content (the common changes)

Most day-to-day edits live in just a few places:

| What you want to change | Where |
|---|---|
| **Menu items, prices, descriptions, tags** | [`src/data/menu.json`](src/data/menu.json) |
| **Promo tags on a menu card** (`new`, `limited`, `signature`, `bestseller`) | the `"tags"` array on each item in `src/data/menu.json`, e.g. `"tags": ["new", "limited"]` |
| **Menu item photos** | drop the image in `public/assets/menu/` using the exact filename from [`src/lib/menuImages.ts`](src/lib/menuImages.ts) — no code change needed |
| **Drop date / countdown** | `DROP_DATE` in [`src/components/SignatureDrops.tsx`](src/components/SignatureDrops.tsx) (the countdown auto-flips to a "Drop Now Live" state once it passes) |
| **Hero featured video** | replace `public/assets/video/hero-featured.mp4` |
| **Business info, SEO copy, contact, socials** | [`src/lib/site.ts`](src/lib/site.ts) (single source of truth for metadata + structured data) |
| **Brand colors / design tokens** | the `@theme` / `:root` blocks in [`src/app/globals.css`](src/app/globals.css) |
| **Ordering links** (Zomato / Swiggy / WhatsApp) | `PLATFORMS` in [`src/components/AccessCTA.tsx`](src/components/AccessCTA.tsx) |

### Menu tags

Every item in `src/data/menu.json` has a `tags` field. Leave it `[]` for no tag, or list one or more:

```json
{
  "name": "Wild Berry Dirty Matcha",
  "price": 289,
  "tags": ["new", "limited"]
}
```

Known tags: `signature`, `new`, `bestseller`, `limited`, `staff`. The cards render them as
chips that wrap across the top-left of the image. Unknown values still render as a neutral chip,
so a custom label won't break the layout.

## Project structure

```
src/
  app/               App Router
    layout.tsx       <head>, metadata, JSON-LD, fonts
    page.tsx         the single landing page (composes the sections below)
    globals.css      Tailwind theme + design tokens (colors, type, spacing)
    privacy/         privacy policy page
    dev/             dev-only icon gallery (noindexed via robots.ts)
    robots.ts, sitemap.ts, opengraph-image.tsx
  components/        section components (Hero, SignatureDrops, TheBar, ThePlates,
                     TheSweet, MerchDrop, Artists, AccessCTA, Footer, Nav, …)
                     component tests are colocated as *.test.tsx
    ui/              shared primitives (Button, Tag, Toggle, …)
    motion/          reveal / stagger animation helpers
    icons/           SVG icon components
  data/menu.json     all menu content + per-item tags
  lib/               site.ts (SEO/business constants), menuImages.ts, utils.ts
                     unit tests are colocated as *.test.ts
  types/menu.ts      menu data types (incl. the MenuCardTag union)
public/assets/
  menu/              product photos (one per menu item)
  logos/             brand logos and favicon
  drops/             signature-drop artwork
  merch/             merch product shots (tee, bottle, cup, tote)
  artists/           artists-section hero image
  video/             hero video (hero-featured.mp4)
scripts/             tooling (audit-menu-images.mjs, audit-assets.mjs,
                     serve-static-export.mjs — used by the E2E suite)
tests/
  setup/             Vitest setup (jsdom API stubs, RTL cleanup)
  e2e/               Playwright Test specs
docs/                project documentation (missing-menu-images.md)
```

Page section order is defined in [`src/app/page.tsx`](src/app/page.tsx).

## Menu images

Product photos live in `public/assets/menu/`. The mapping from menu item name to filename is in
[`src/lib/menuImages.ts`](src/lib/menuImages.ts). Any item without a matching file renders as a coloured
**Aurora fallback card** — this is intentional and handled in [`src/components/MenuCard.tsx`](src/components/MenuCard.tsx).

```bash
npm run audit:menu-images   # lists which photos are present vs still missing
```

To add a photo: drop the correctly-named file into `public/assets/menu/` and rebuild. No code
changes needed. See [`docs/missing-menu-images.md`](docs/missing-menu-images.md) for the full
checklist of missing images, naming rules, and aspect-ratio guidelines.

## Asset management rules

- **Add production images under `public/assets/`** — never in `Boba_Bear_Images/` (archived) or `out/`.
  - Menu photos → `public/assets/menu/`
  - Logos / favicons → `public/assets/logos/`
  - Drop artwork → `public/assets/drops/`
  - Video assets → `public/assets/video/`
- **Do not edit `out/` manually.** It is generated by `npm run build` and overwritten on every build.
- **To fix an image on the live site**: update the source file in `public/assets/` (and `src/lib/menuImages.ts` if a mapping needs changing), then rebuild and redeploy.
- Run `npm run audit:assets` to verify no stale references and that all asset directories are in order.
- Run `npm run build` to regenerate `out/`. GitHub Pages deploys the generated `out/` via the deploy workflow.

## Google Analytics (GA4)

1. Create a GA4 property at [analytics.google.com](https://analytics.google.com) if you don't have one.
2. Go to **Admin → Data Streams → your web stream → Measurement ID** — it looks like `G-XXXXXXXXXX`.
3. Add it as a GitHub repository variable: **Settings → Secrets and variables → Actions → Variables → New repository variable**:
   - Name: `NEXT_PUBLIC_GA_MEASUREMENT_ID`
   - Value: `G-XXXXXXXXXX`
4. Locally: copy `.env.example` → `.env.local` and fill in the value.
5. When the variable is set the deploy workflow injects it into the build automatically.
6. To verify: open the live site, then check **GA4 → Reports → Realtime** for active users.

Custom events tracked:
- `zomato_click`, `swiggy_click`, `whatsapp_click` — ordering link taps
- `contact_form_mailto_opened` — email submitted from the footer form

## Newsletter / community signup

The footer "Join" form routes based on what the user enters:
- **Email address** → opens the user's mail client with a pre-filled message to `bobabear.unbothered@gmail.com`.
- **Mobile number or anything else** → opens WhatsApp with a pre-filled order message.

No server API is used — the site is a fully static export.

Free alternatives for real inbox submissions (implement if needed):
- **[Formspree](https://formspree.io)** (free tier: 50 submissions/month) — simplest drop-in, works on GitHub Pages.
- **[Google Forms](https://forms.google.com)** — zero cost, results in a spreadsheet.
- **[EmailJS](https://emailjs.com)** free tier — client-side only, exposes service ID in source.

## Deploy

The site is configured as a **static export** (`output: "export"` in [`next.config.ts`](next.config.ts))
and deployed to **GitHub Pages** via the [deploy workflow](.github/workflows/deploy.yml). Every push
to `main` triggers a build and deploys the `out/` directory to the `gh-pages` branch. The custom
domain `thebobabear.in` is set via the `CNAME` file.

Baseline security headers (HSTS, X-Frame-Options, etc.) are defined in `next.config.ts`; they are
applied on Vercel or any Node host but are no-ops on GitHub Pages (static files only).

## Design & iteration resources

Kept in the repo so the design can be re-iterated in Figma or rebuilt with Claude Code:

- `figma-sync/` — script + section screenshots for syncing to Figma.
- `Boba_Bear_Design_System_Updated/`, `boba-bear-design-system.md`,
  `Updated_BOBA BEAR_ DESIGN SYSTEM (V1.1).md` — the design-system spec (color, type, components, voice).
- `Boba Bear Landing Page Wireframe Updated/` — the build guide / wireframes.
- `Boba_Bear_Images/` (deprecated/archived — do not use as a production source) and the root `*.png` files — design reference screenshots. Production images live in `public/assets/`.
- `AGENTS.md` / `CLAUDE.md` — notes for AI-assisted edits.

These are reference/tooling only — they are not imported by the app and do not ship in the build.
