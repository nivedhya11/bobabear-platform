---
Status: SUPERSEDED
Superseded By: docs/platform/ROADMAP.md
Historical Roadmap Version: GTM-R1
Do Not Use For Current Implementation Sequencing
Date: 2026-08-03
Last updated: 2026-08-11
---

# BOBA Bear — Implementation Roadmap (HISTORICAL GTM-R1)

> **SUPERSEDED.** Current implementation sequencing authority is
> [`ROADMAP.md`](./ROADMAP.md) (roadmap version **GTM-R2**). This file is retained for provenance
> only. Do **not** use it for current IMP meanings, current/next slice, or GTM boundary.
>
> Historical GTM-R1 future mappings (for example IMP-021=Cashfree, IMP-023=Refund,
> IMP-035=Launch/GTM) are **not** current. Accepted identities IMP-001→IMP-023 and IMP-005A are
> preserved in GTM-R2 with their accepted meanings (IMP-021=Checkout, IMP-022=Payment,
> IMP-023=Order). Public GTM boundary is **IMP-040**.

Execution model recorded historically: **sequential, one slice at a time.**

## Purpose and execution rules (historical)

This document **was** the approved ordered sequence (GTM-R1) for the BOBA Bear direct-order
platform at the time of the architecture readiness review. It is **no longer** the authority for
implementation ordering. Use [`ROADMAP.md`](./ROADMAP.md). ADRs under [`decisions/`](./decisions/)
remain historical rationale; binding status is in [`decision-register.md`](./decision-register.md).

The following rules apply to every slice without exception:

- **The founder is the sole operator.** No parallel implementation tracks are permitted. Exactly one
  slice is in progress at any time.
- **Architecture and product decisions happen before a coding-agent implementation prompt exists.**
  A coding-agent prompt must not ask the agent to choose architecture or product behaviour; any
  open decision listed for a slice is resolved in the planning conversation first, within the
  boundaries of the already-accepted ADRs.
- **Every coding-agent implementation prompt must remain below 50,000 characters.** If a slice's
  prompt would exceed that limit, the slice is split further before a prompt is written. This limit
  is recorded as [D-355](./decision-register.md) in the decision register.
- **Every slice must preserve existing intended work.** A coding agent must check for and preserve
  any in-progress or uncommitted work already present in the repository before making changes.
- **No coding agent may commit, amend, or push unless explicitly instructed** by the founder for
  that specific action.
- **Staging is the local Docker Desktop environment**, unless the founder explicitly changes this
  rule in a future documentation update. All slice validation and evidence is generated against
  that environment.
- **Each slice must be reviewed and accepted by the founder before the next slice begins.** A slice
  is not "done" merely because a coding agent reports completion.
- **No unrelated future decision blocks an earlier, independent slice.** An open decision belonging
  to a later slice (for example, the final Dehradun delivery provider) must never stall an earlier
  slice that does not depend on it.

## Just-in-time decision policy

- Open implementation details are resolved immediately before their dependent implementation slice,
  not speculatively in advance and not deferred past the point where the slice needs them.
- Every such decision must remain within the boundaries already fixed by the fifteen accepted ADRs;
  resolving an open decision must never contradict a Locked item in
  [`decision-register.md`](./decision-register.md).
- Product or architecture decisions are made in the planning conversation before a coding-agent
  prompt is written — never delegated to the coding agent mid-implementation.
- Coding-agent prompts contain only resolved implementation work: concrete schemas, concrete
  library choices, concrete values. They must not ask the agent to choose between architectural or
  product alternatives.
- A slice may be split into two or more smaller slices if its coding-agent prompt would otherwise
  exceed 50,000 characters, or if it bundles genuinely independent work.
- No unrelated future decision should block an earlier independent slice; each slice lists its own
  actual dependencies below, and only those dependencies apply.

## Evidence policy

Every implementation slice requires evidence appropriate to its content, drawn from:

- Commands executed, and their output
- Automated test results (unit, integration, architecture-boundary tests as applicable)
- Staging screenshots, where the slice includes UI
- API request/response evidence, where the slice includes an HTTP boundary
- Database migration evidence (migration files applied, schema state before/after), where the slice
  touches persistence
- Logs or audit evidence, where the slice includes audited operations
- A before/after comparison against the prior behaviour, especially for IMP-001
- Known warnings and remaining limitations, stated explicitly rather than omitted
- Final `git status --short`
- `git diff --check`

All evidence is generated from the approved staging environment — the local Docker Desktop
environment — unless the founder has explicitly changed that rule.

## First implementation slice

**[IMP-001 — Behaviour-preserving `src/` migration](#imp-001-behaviour-preserving-src-migration)**
is the first implementation slice. It must not include product changes, architecture changes,
database work, authentication, new API routes, UI redesign, provider integration, or any new
customer-visible behaviour. The first coding-agent prompt is prepared only after this roadmap and
[`architecture-readiness-review.md`](./architecture-readiness-review.md) are reviewed and accepted
by the founder.

## Slice template

Every slice below states: Slice ID, Name, Goal, Dependencies, Governing ADRs, Included scope,
Explicit exclusions, Open decisions that must be resolved before the slice, Required implementation
work, Required tests, Staging validation, Evidence required, Rollback/recovery considerations, and
Completion criteria.

---

## Phase 0 — Repository and quality foundation

### IMP-001 — Behaviour-preserving `src/` migration

- **Goal** — Move the existing Next.js application into the approved `src/` structure without
  changing customer-visible behaviour.
- **Dependencies** — None. First slice.
- **Governing ADRs** — [ADR-003](./decisions/ADR-003-modular-monolith-node-typescript.md) (target
  repository structure).
- **Included scope** — Move application source into `src/`; preserve routes, styling, assets,
  metadata, static export behaviour, and custom-domain behaviour; update path references and
  configuration only as necessary to preserve current behaviour.
- **Explicit exclusions** — Database, authentication, API design implementation, new business
  features, UI redesign.
- **Open decisions before this slice** — None.
- **Required implementation work** — File moves, import-path updates, build/config updates limited
  to what the move requires.
- **Required tests** — Existing build/export commands must succeed unchanged; visual/manual
  comparison of rendered pages.
- **Staging validation** — Run the local build and static export in Docker Desktop; browse the
  resulting site.
- **Evidence required** — Before/after route list and screenshots; build output; final
  `git status --short`.
- **Rollback/recovery** — Pure file-move commit; revertible with `git revert` if the founder
  rejects it.
- **Completion criteria** — Site behaves identically to pre-migration state; no customer-visible
  regression; founder accepts the diff.

### IMP-002 — Test and quality-tooling foundation

- **Goal** — Establish the minimum test and validation foundation before business implementation.
- **Dependencies** — IMP-001.
- **Governing ADRs** — [ADR-003](./decisions/ADR-003-modular-monolith-node-typescript.md).
- **Included scope** — Unit-test runner; component/rendering-test direction where needed; type
  checking; lint validation; formatting policy if not already present; a baseline smoke test;
  CI-safe commands.
- **Explicit exclusions** — Full end-to-end test platform; business-module tests not yet
  implemented; provider sandbox integration.
- **Open decisions before this slice** — Exact test-runner and lint/format tool versions (within
  the Node.js/TypeScript boundary already fixed by ADR-003).
- **Required implementation work** — Add test runner and config; add lint/format config if absent;
  add a smoke test covering the current site.
- **Required tests** — The smoke test itself; `typecheck`/`lint`/`test` commands must run cleanly.
- **Staging validation** — Run all new commands against the Docker Desktop environment.
- **Evidence required** — Command output for typecheck/lint/test/build; final `git status --short`.
- **Rollback/recovery** — Tooling-only change; revertible independently of IMP-001.
- **Completion criteria** — `typecheck`, `lint`, and `test` commands exist, run in CI-safe form, and
  pass against current code.

### IMP-003 — Configuration and startup foundation

- **Goal** — Implement ADR-015's typed configuration boundary before database and provider code
  spreads raw environment access.
- **Dependencies** — IMP-001, IMP-002.
- **Governing ADRs** — [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md).
- **Included scope** — Central configuration schema; process-specific configuration subsets;
  environment identity distinct from `NODE_ENV`; safe startup validation; `.env.example`;
  secret-safe error messages; initial production safeguards; shared web/worker bootstrap.
- **Explicit exclusions** — Real provider credentials; admin configuration UI; feature-flag database
  overrides; external secret manager.
- **Open decisions before this slice** — Exact configuration-library choice, within the typed-schema
  boundary already fixed by ADR-015.
- **Required implementation work** — Configuration schema and loader; environment-identity
  resolution; fail-fast startup validation; `.env.example`; redaction-safe error paths.
- **Required tests** — Unit tests for schema validation (valid/invalid/missing cases); a startup
  test that fails fast on missing required configuration.
- **Staging validation** — Boot the application in Docker Desktop with a valid and an intentionally
  invalid configuration; confirm fail-fast behaviour.
- **Evidence required** — Test output; startup logs for both valid and invalid configuration;
  `.env.example` diff; final `git status --short`.
- **Rollback/recovery** — Configuration boundary is additive; safe to revert without affecting
  IMP-001/IMP-002.
- **Completion criteria** — All configuration access in application code goes through the typed
  boundary; startup fails fast and safely on invalid configuration.

---

## Phase 1 — PostgreSQL and persistence foundation

### IMP-004 — Local PostgreSQL 18 and Drizzle setup

- **Goal** — Establish local PostgreSQL 18, Drizzle, `pg`, migration tooling, and approved schema
  namespaces.
- **Dependencies** — IMP-003.
- **Governing ADRs** — [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md).
- **Included scope** — Dependencies (Drizzle, `node-postgres`); local Docker PostgreSQL 18; Drizzle
  configuration; database connection boundary; `auth`, `app`, `platform`, and `drizzle` schemas;
  first reviewed migration; runtime/migration connection separation.
- **Explicit exclusions** — Business tables; Better Auth implementation; provider-event tables.
- **Open decisions before this slice** — Exact Drizzle/driver package versions.
- **Required implementation work** — Docker Compose PostgreSQL 18 service; Drizzle config; schema
  creation migration; connection-pool boundary module.
- **Required tests** — A migration-apply test against the local database.
- **Staging validation** — `docker compose up` the database; apply migrations; connect from the
  application.
- **Evidence required** — Migration output; `psql \dn` schema listing; final `git status --short`.
- **Rollback/recovery** — Migration is additive (schema creation only); drop-and-recreate the local
  container is safe in local/staging.
- **Completion criteria** — Local PostgreSQL 18 runs in Docker with the four approved schemas;
  application connects successfully through the typed configuration boundary.

### IMP-005 — Database test and migration validation

- **Goal** — Establish Testcontainers PostgreSQL 18 testing and migration verification.
- **Dependencies** — IMP-004.
- **Governing ADRs** — [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md).
- **Included scope** — Empty-to-head migration test; repository integration-test harness;
  PostgreSQL-specific constraint test; CI-ready database test commands; migration-history
  validation.
- **Explicit exclusions** — Full CI deployment; business repositories.
- **Open decisions before this slice** — None beyond IMP-004's tooling choice.
- **Required implementation work** — Testcontainers setup; empty-to-head migration test; a
  constraint test proving a PostgreSQL-specific behaviour (for example a named `CHECK` constraint).
- **Required tests** — The migration test itself, run against a real PostgreSQL 18 container.
- **Staging validation** — Run the database test suite in Docker Desktop.
- **Evidence required** — Test output; container logs; final `git status --short`.
- **Rollback/recovery** — Test-only change; no production impact.
- **Completion criteria** — Migrations apply cleanly from empty to head inside a disposable
  Testcontainers-managed PostgreSQL 18 instance, verified by an automated test.

### IMP-006 — Shared persistence primitives

- **Goal** — Implement approved database transaction, error, identifier, timestamp, and
  optimistic-concurrency foundations.
- **Dependencies** — IMP-005.
- **Governing ADRs** — [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md).
- **Included scope** — Transaction abstraction; database error mapping; UUIDv7 default identifiers;
  common persistence types (`timestamptz`, integer paise); version-conflict handling; module
  schema-export convention.
- **Explicit exclusions** — Generic base repository; cross-module CRUD service; business tables
  beyond narrowly required technical tables.
- **Open decisions before this slice** — None.
- **Required implementation work** — Transaction-boundary helper; typed database-error mapper;
  UUIDv7 generator/default; shared column-type helpers; optimistic-concurrency version-check helper.
- **Required tests** — Unit tests for error mapping and version-conflict detection; an integration
  test proving a transaction rollback.
- **Staging validation** — Run the persistence-primitive test suite against local PostgreSQL 18.
- **Evidence required** — Test output; final `git status --short`.
- **Rollback/recovery** — Additive primitives; safe to revert independently.
- **Completion criteria** — Every later module can perform a transaction, map a database error, and
  detect an optimistic-concurrency conflict through this shared foundation, without importing raw
  `pg`/Drizzle error types directly.

### IMP-007 — Transactional outbox and idempotency

- **Goal** — Implement PostgreSQL-backed outbox and shared idempotency foundations.
- **Dependencies** — IMP-006.
- **Governing ADRs** — [ADR-003](./decisions/ADR-003-modular-monolith-node-typescript.md),
  [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md).
- **Included scope** — Platform tables and migrations; claiming with
  `FOR UPDATE SKIP LOCKED`; leases; retry and dead-letter state; idempotency-key acquisition and
  fingerprinting; worker-processing foundation; concurrency and recovery tests.
- **Explicit exclusions** — Cashfree, delivery, or WhatsApp provider adapters; external queue;
  business notification templates.
- **Open decisions before this slice** — Exact claim batch size, lease duration, and retry backoff
  (roadmap item 26 area), within the outbox model already fixed by ADR-013.
- **Required implementation work** — Outbox and idempotency-record tables/migrations; claiming
  query; worker loop; retry/dead-letter transition logic.
- **Required tests** — A concurrency test proving two workers never claim the same row; a recovery
  test proving a crashed worker's lease expires and is reclaimed.
- **Staging validation** — Run two worker processes against local PostgreSQL 18 and confirm
  exactly-once claiming under concurrent load.
- **Evidence required** — Concurrency-test output; worker logs showing claim/lease/retry behaviour;
  final `git status --short`.
- **Rollback/recovery** — New platform tables only; safe to revert without affecting business
  modules, none of which exist yet.
- **Completion criteria** — A durable outbox record can be enqueued, claimed exactly once under
  concurrency, retried on failure, and dead-lettered after exhausting retries; an idempotency key can
  be acquired exactly once.

---

## Phase 2 — Identity and access foundation

### IMP-008 — Better Auth persistence and session foundation

- **Goal** — Implement the approved self-hosted Better Auth database and session foundation.
- **Dependencies** — IMP-007.
- **Governing ADRs** — [ADR-004](./decisions/ADR-004-identity-authentication-sessions.md).
- **Included scope** — `auth` schema; Better Auth integration; opaque sessions; customer and
  workforce identity foundations; a safe authentication route; basic session revocation.
- **Explicit exclusions** — Full organization authorization; production OTP provider; social login;
  final lost-phone recovery workflow.
- **Open decisions before this slice** — Exact Better Auth and adapter versions; session durations;
  cookie names and security settings; initial OTP transport strategy for local/staging testing
  (roadmap items 2, 41).
- **Required implementation work** — Better Auth configuration against the `auth` schema; session
  cookie configuration; a minimal sign-in route proving session issuance and revocation.
- **Required tests** — Integration tests for session creation, validation, and revocation.
- **Staging validation** — Sign in and out through the local staging environment; inspect session
  cookies and database rows.
- **Evidence required** — Test output; session-table before/after evidence; final
  `git status --short`.
- **Rollback/recovery** — New `auth` schema tables only; revertible via down-migration in local
  environments.
- **Completion criteria** — A session can be created, validated, and revoked against real
  PostgreSQL 18, using Better Auth, with no plaintext credential stored.

### IMP-009 — Customer OTP authentication

- **Goal** — Implement customer phone-number OTP sign-in under ADR-004.
- **Dependencies** — IMP-008.
- **Governing ADRs** — [ADR-004](./decisions/ADR-004-identity-authentication-sessions.md).
- **Included scope** — OTP request; OTP verification; rate limits; attempt limits; session creation;
  abuse/enumeration protection; a staging-safe OTP adapter (for example a logged or fixed-code
  adapter, not a real SMS provider).
- **Explicit exclusions** — Production SMS provider unless separately approved; WhatsApp
  authentication; social login.
- **Open decisions before this slice** — Bot-protection/CAPTCHA provider and exact OTP cooldown
  duration (roadmap item 46), if not already resolved at IMP-008.
- **Required implementation work** — OTP request/verify endpoints; rate/attempt-limit enforcement;
  staging OTP adapter.
- **Required tests** — Integration tests for correct OTP, incorrect OTP, expired OTP, and
  rate-limit exhaustion.
- **Staging validation** — Complete a full customer sign-in via phone number and OTP in the local
  staging environment.
- **Evidence required** — Test output; request/response evidence for the OTP endpoints; final
  `git status --short`.
- **Rollback/recovery** — Additive endpoints; disable via feature flag if a defect is found after
  acceptance.
- **Completion criteria** — A customer can sign in with an Indian mobile number and OTP in staging,
  with rate limiting and abuse protection verified by tests.

### IMP-010 — Workforce authentication and MFA

- **Goal** — Implement workforce invitation, password authentication, and TOTP MFA.
- **Dependencies** — IMP-008.
- **Governing ADRs** — [ADR-004](./decisions/ADR-004-identity-authentication-sessions.md).
- **Included scope** — Workforce invite lifecycle; password policy; TOTP enrollment; the recovery
  controls approved for this slice; session revocation; audit records.
- **Explicit exclusions** — Full role administration UI; customer impersonation; shared accounts.
- **Open decisions before this slice** — Exact workforce invitation lifetime; exact MFA
  recovery-code policy and shared-device kitchen procedure (roadmap items 43, 45).
- **Required implementation work** — Invitation issuance/acceptance; password-policy enforcement;
  TOTP enrollment and verification; audit records for authentication events.
- **Required tests** — Integration tests for invite → accept → password set → TOTP enroll → sign in;
  a test proving shared-account prevention.
- **Staging validation** — Complete a full workforce onboarding flow in staging.
- **Evidence required** — Test output; audit-record evidence; final `git status --short`.
- **Rollback/recovery** — Additive; workforce accounts created in staging can be deleted without
  affecting customer authentication.
- **Completion criteria** — A workforce member can be invited, set a password, enroll TOTP, and sign
  in with MFA enforced, with the flow fully audited.

### IMP-011 — Organization, outlet, and RBAC foundation

- **Goal** — Implement brand, organization, legal entity, territory, outlet, membership, roles, and
  permission checks.
- **Dependencies** — IMP-008, IMP-010.
- **Governing ADRs** — [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md).
- **Included scope** — Core tables (brand, organization, legal entity, territory, outlet); scoped
  memberships; the six V1 system roles; permission registry; a central `authorize(...)` boundary;
  scoped repositories; session re-evaluation on role change; audit records.
- **Explicit exclusions** — Custom roles; broad RLS; franchise settlement.
- **Open decisions before this slice** — Exact authorization database schema, permission catalog,
  authorization-cache implementation, refund/monetary delegation limits, guest-order tracking model,
  break-glass and support-access workflow, selective RLS scope (see
  [`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md), items 116–121).
- **Required implementation work** — Organization/outlet schema and migrations; membership and role
  tables; permission registry; `authorize(...)` use-case boundary; architecture test forbidding
  Route-Handler-level or UI-level final authorization checks.
- **Required tests** — Permission-evaluation unit tests for each V1 system role; an architecture
  test enforcing the `authorize(...)` boundary; an audit test for denial logging.
- **Staging validation** — Exercise each of the six system roles against a protected action in
  staging and confirm allow/deny behaviour matches the permission catalog.
- **Evidence required** — Test output; permission-matrix evidence per role; final
  `git status --short`.
- **Rollback/recovery** — New schema only, no dependent business data yet; safe to iterate before
  acceptance.
- **Completion criteria** — Every one of the six V1 system roles produces the expected allow/deny
  result for a representative set of permissions, enforced inside application use cases and covered
  by an architecture test.

---

## Phase 3 — Catalog and commercial foundation

### IMP-012 — Canonical catalog model

- **Goal** — Implement products, variants, modifiers, bundles, lifecycle, and immutable revisions.
- **Dependencies** — IMP-011.
- **Governing ADRs** — [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md).
- **Included scope** — Tables and migrations; domain model; repositories; validation; architecture
  tests; initial API contracts where required.
- **Explicit exclusions** — Pricing; inventory; Petpooja synchronization.
- **Open decisions before this slice** — Exact catalog database schema/table names; exact stable
  catalog identifier format (roadmap items 49–50).
- **Required implementation work** — Product/variant/modifier/bundle tables; draft/active/retired
  lifecycle enforcement; stable-identifier generation.
- **Required tests** — Domain-model unit tests for lifecycle transitions; a repository integration
  test for stable-identifier stability across a revision.
- **Staging validation** — Create, publish, and retire a sample product through the domain layer in
  staging.
- **Evidence required** — Test output; sample product lifecycle evidence; final
  `git status --short`.
- **Rollback/recovery** — New schema only; no production catalog data exists yet.
- **Completion criteria** — A product with at least one variant can move through the full
  draft/active/retired lifecycle with a stable identifier that survives revision.

### IMP-013 — Existing menu import

- **Goal** — Move the existing static menu into the canonical catalog through a controlled,
  repeatable import.
- **Dependencies** — IMP-012.
- **Governing ADRs** — [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md).
- **Included scope** — Mapping of the current 74 menu items; stable identifiers; default variants;
  existing images and descriptions; import validation; comparison evidence against the current
  site.
- **Explicit exclusions** — Automatic external menu synchronization; ingredient inventory.
- **Open decisions before this slice** — None beyond IMP-012's schema.
- **Required implementation work** — An idempotent import script/tool that reads the current menu
  content and creates canonical catalog entries.
- **Required tests** — A test proving the import is idempotent (re-running it does not duplicate
  entries); a count-reconciliation test (74 items in, 74 canonical entries out).
- **Staging validation** — Run the import against local staging; render the resulting catalog and
  compare against the live marketing site menu.
- **Evidence required** — Import run output; before/after item-count comparison; screenshot
  comparison against the current site; final `git status --short`.
- **Rollback/recovery** — Import is re-runnable against an emptied catalog table in staging; no
  production data affected.
- **Completion criteria** — All 74 current menu items exist as canonical catalog entries with
  correct names, descriptions, and images, verified against the live site.

### IMP-014 — Assortment and operational availability

- **Goal** — Implement brand-to-outlet assortment narrowing and operational availability.
- **Dependencies** — IMP-013.
- **Governing ADRs** — [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md).
- **Included scope** — Inheritance; outlet narrowing; available/temporarily-unavailable/sold-out
  states; outlet accepting/paused/closed controls; deterministic menu projection.
- **Explicit exclusions** — Ingredient-derived availability; automatic stock depletion.
- **Open decisions before this slice** — None beyond IMP-012's schema.
- **Required implementation work** — Assortment tables; availability-state machine; deterministic
  effective-menu query for a given outlet.
- **Required tests** — Unit tests for each availability-state transition; an integration test
  proving deterministic menu projection for a paused outlet.
- **Staging validation** — Toggle outlet accepting/paused/closed state in staging and confirm the
  projected menu changes accordingly.
- **Evidence required** — Test output; before/after menu-projection evidence; final
  `git status --short`.
- **Rollback/recovery** — New schema only; independently revertible from IMP-013.
- **Completion criteria** — The effective menu for the single V1 outlet reflects its
  accepting/paused/closed state and per-item availability deterministically.

### IMP-015 — Pricing, charges, and tax foundation

- **Goal** — Implement versioned price books, packaging, delivery-charge representation, tax
  policy, and immutable quote calculations.
- **Dependencies** — IMP-014.
- **Governing ADRs** — [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md).
- **Included scope** — Integer-paise calculation; numeric rates; price hierarchy; effective dates;
  quote snapshots; calculation tests.
- **Explicit exclusions** — Promotions; provider delivery cost; accounting integration.
- **Open decisions before this slice** — Final GST treatment validation; tax display mode; rounding
  rule; packaging tax treatment; delivery-charge tax treatment (roadmap item 9 and the GST-specific
  items under ADR-007's Explicit Non-Decisions).
- **Required implementation work** — Price-book tables and effective-dating; decimal-safe tax
  calculation; immutable quote-snapshot generation.
- **Required tests** — Calculation tests covering rounding edge cases and effective-date boundaries.
- **Staging validation** — Generate a quote for a representative cart in staging and manually verify
  the tax/total calculation against the accountant-validated rule.
- **Evidence required** — Calculation-test output; sample quote evidence; final
  `git status --short`.
- **Rollback/recovery** — New schema only; independently revertible from catalog slices.
- **Completion criteria** — A quote for a representative order produces a correct, reproducible,
  integer-paise total consistent with the validated GST treatment.

### IMP-016 — Promotions foundation

- **Goal** — Implement initial automatic and coupon promotions with deterministic allocation.
- **Dependencies** — IMP-015.
- **Governing ADRs** — [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md).
- **Included scope** — Automatic and coupon promotion types approved for launch; a compatibility
  matrix; redemption limits; approval authority for creating promotions.
- **Explicit exclusions** — Loyalty points; gift cards; wallets; campaign automation.
- **Open decisions before this slice** — Initial promotion types; compatibility matrix; redemption
  limits; approval authority (all within ADR-007's promotion model).
- **Required implementation work** — Promotion definition and redemption tables; deterministic
  discount-allocation logic; compatibility-rule enforcement.
- **Required tests** — Allocation tests for compatible/incompatible promotion combinations;
  redemption-limit enforcement tests.
- **Staging validation** — Apply an approved promotion to a representative cart in staging.
- **Evidence required** — Test output; sample discounted-quote evidence; final
  `git status --short`.
- **Rollback/recovery** — Feature-flaggable; can be disabled without affecting base pricing.
- **Completion criteria** — An approved promotion type produces a correct, deterministic discount on
  a representative order, with redemption limits enforced.

---

## Phase 4 — Customer ordering foundation

### IMP-017 — Customer profile and saved addresses

- **Goal** — Implement customer profile and structured saved-address management.
- **Dependencies** — IMP-009, IMP-011.
- **Governing ADRs** — [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md),
  [ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md).
- **Included scope** — Structured addresses; manual entry; archival; ownership; sensitive-data
  controls.
- **Explicit exclusions** — Final geocoder integration; device location; serviceability zones.
- **Open decisions before this slice** — None beyond IMP-011's schema.
- **Required implementation work** — Customer profile and address tables; ownership-scoped
  repositories; archival (soft-delete) behaviour.
- **Required tests** — Ownership-boundary tests (a customer cannot read another customer's saved
  address).
- **Staging validation** — Create, edit, and archive a saved address as a signed-in customer in
  staging.
- **Evidence required** — Test output; final `git status --short`.
- **Rollback/recovery** — New tables only; independently revertible.
- **Completion criteria** — A signed-in customer can manage saved addresses, with ownership
  enforced and archived addresses excluded from active use.

### IMP-018 — Serviceability and outlet resolution

- **Goal** — Implement Dehradun serviceability and deterministic outlet selection.
- **Dependencies** — IMP-017.
- **Governing ADRs** — [ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md).
- **Included scope** — Zone model; address-coordinate validation; outcome codes; outlet resolution;
  expiry and revalidation; admin-managed zones.
- **Explicit exclusions** — Multi-city optimization; customer outlet selection; route optimization.
- **Open decisions before this slice** — PostGIS versus non-PostGIS geometry implementation; initial
  Dehradun zones; manual-fallback policy; serviceability TTL (roadmap item 6).
- **Required implementation work** — Service-zone tables; coordinate-in-zone validation; outlet
  resolution for a serviceable address; serviceability-result expiry.
- **Required tests** — Zone-boundary tests (inside/outside/edge cases); an outlet-resolution test for
  the single V1 outlet.
- **Staging validation** — Validate a serviceable and a non-serviceable Dehradun address in staging.
- **Evidence required** — Test output; sample serviceability-check evidence; final
  `git status --short`.
- **Rollback/recovery** — New tables only; independently revertible.
- **Completion criteria** — A Dehradun address inside an admin-defined zone resolves deterministically
  to the correct outlet; an address outside all zones is correctly marked unserviceable.

### IMP-019 — Server-authoritative cart

- **Goal** — Implement anonymous and authenticated single-outlet carts.
- **Dependencies** — IMP-014, IMP-018.
- **Governing ADRs** — [ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md).
- **Included scope** — Opaque anonymous access; cart lifecycle; lines, variants, modifiers, and
  instructions; optimistic concurrency; idempotent mutations; attach-on-login; same-outlet conflict
  handling; pricing projection.
- **Explicit exclusions** — Inventory reservation; cross-outlet merge; checkout confirmation.
- **Open decisions before this slice** — None beyond IMP-018's zone model.
- **Required implementation work** — Cart and cart-line tables; opaque anonymous-cart token;
  optimistic-concurrency version column; idempotent mutation endpoints; attach-on-login merge logic.
- **Required tests** — Concurrency tests for conflicting simultaneous mutations; a same-outlet
  conflict test; an attach-on-login test.
- **Staging validation** — Build a cart anonymously, sign in, and confirm correct attach-on-login
  behaviour in staging.
- **Evidence required** — Test output; sample cart-state evidence before/after attach; final
  `git status --short`.
- **Rollback/recovery** — New tables only; independently revertible.
- **Completion criteria** — An anonymous cart can be built, survives sign-in via attach-on-login, and
  rejects a same-outlet conflict deterministically.

### IMP-020 — Checkout orchestration

- **Goal** — Implement checkout sessions and complete pre-payment validation.
- **Dependencies** — IMP-015, IMP-016, IMP-019.
- **Governing ADRs** — [ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md).
- **Included scope** — Address confirmation; serviceability; availability; pricing; tax; delivery
  quote; customer confirmation; cart locking; pre-payment order creation; outbox event.
- **Explicit exclusions** — Cashfree provider calls; kitchen visibility; production delivery
  booking.
- **Open decisions before this slice** — Quote lifetimes; checkout lifetime; customer-confirmation
  rules; initial delivery-quote fallback (within ADR-008's checkout-orchestration model).
- **Required implementation work** — Checkout-session orchestration calling serviceability,
  availability, pricing, and a delivery-quote stub in sequence; cart locking; pre-payment order
  creation inside a single transaction; an outbox event on order creation.
- **Required tests** — An end-to-end orchestration test covering the full revalidation sequence;
  a test proving a pending-payment order is excluded from any kitchen-facing query.
- **Staging validation** — Complete checkout orchestration for a representative cart through to
  pre-payment order creation in staging.
- **Evidence required** — Test output; sample pre-payment order evidence; outbox-event evidence;
  final `git status --short`.
- **Rollback/recovery** — New tables only; independently revertible from IMP-019.
- **Completion criteria** — A pre-payment order is created transactionally only after serviceability,
  availability, pricing, and customer confirmation all succeed, and is provably excluded from
  kitchen-facing views.

---

## Phase 5 — Payments and operations

### IMP-021 — Cashfree payment adapter

- **Goal** — Implement Cashfree Hosted Checkout behind the Payments module.
- **Dependencies** — IMP-020.
- **Governing ADRs** — [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md).
- **Included scope** — Payment intent; provider order; attempts; idempotent creation; Hosted
  Checkout handoff; safe browser return; sandbox validation.
- **Explicit exclusions** — Production activation; refund automation; settlement import.
- **Open decisions before this slice** — Exact Cashfree API version; sandbox account; provider order
  expiry; allowed payment methods; credential references.
- **Required implementation work** — Payment-intent/attempt tables; Cashfree sandbox adapter behind
  the provider-neutral Payments interface; idempotent provider-order creation; browser-return
  handler that never treats the redirect itself as payment truth.
- **Required tests** — Idempotency tests for provider-order creation; a test proving browser return
  alone does not confirm payment.
- **Staging validation** — Complete a full Cashfree sandbox checkout from staging.
- **Evidence required** — Sandbox request/response evidence; test output; final
  `git status --short`.
- **Rollback/recovery** — Sandbox-only; safe to iterate before production credentials exist.
- **Completion criteria** — A sandbox Cashfree payment can be initiated idempotently and the browser
  return path is proven not to be treated as payment authority.

### IMP-022 — Payment webhooks and verification

- **Goal** — Implement durable verified Cashfree events and payment-success acceptance.
- **Dependencies** — IMP-021.
- **Governing ADRs** — [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md).
- **Included scope** — Raw webhook verification; provider-event persistence; deduplication;
  out-of-order handling; server-query reconciliation; first-success-wins; review states; order
  confirmation activation.
- **Explicit exclusions** — Production credentials; settlement reconciliation; refunds.
- **Open decisions before this slice** — None beyond IMP-021's sandbox setup.
- **Required implementation work** — Webhook signature verification; provider-event table with
  deduplication; first-success-wins acceptance logic; review-state transition for
  duplicate/mismatched success; order confirmation on verified success.
- **Required tests** — A duplicate-webhook-delivery test; an out-of-order-delivery test; a
  mismatched-amount review-state test.
- **Staging validation** — Trigger a real sandbox webhook delivery (including a replayed duplicate)
  against staging.
- **Evidence required** — Webhook payload/response evidence; test output; final
  `git status --short`.
- **Rollback/recovery** — Additive event-ingestion path; safe to iterate before production webhook
  registration.
- **Completion criteria** — A verified sandbox webhook confirms the order exactly once; a duplicate
  or mismatched webhook is provably routed to review instead of double-confirming.

### IMP-023 — Refund foundation

- **Goal** — Implement full and partial refund records and Cashfree refund adapter.
- **Dependencies** — IMP-022.
- **Governing ADRs** — [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md).
- **Included scope** — Refund balance; provider request; webhook/query reconciliation; audit;
  customer status projection.
- **Explicit exclusions** — None beyond what is listed in the goal.
- **Open decisions before this slice** — Refund approval thresholds; automatic-refund policies;
  refund retention and operator authority.
- **Required implementation work** — Refund-record tables and balance tracking; Cashfree sandbox
  refund adapter; reconciliation of refund status via webhook or query.
- **Required tests** — A partial-refund balance test; a reconciliation test for a refund confirmed
  only via query (webhook missed).
- **Staging validation** — Issue a full and a partial sandbox refund from staging.
- **Evidence required** — Sandbox refund request/response evidence; test output; final
  `git status --short`.
- **Rollback/recovery** — Sandbox-only; independently revertible from IMP-022.
- **Completion criteria** — A full and a partial refund can be issued, reconciled, and audited, with
  the customer-facing refund status correctly reflecting the internal durable record.

### IMP-024 — Order lifecycle and Operations Console API

- **Goal** — Implement commercial and fulfilment lifecycles and authorized operational commands.
- **Dependencies** — IMP-011, IMP-022.
- **Governing ADRs** — [ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md).
- **Included scope** — Confirmed-paid order activation; acceptance; rejection; preparation; ready
  state; handoff preconditions; exceptions; timers; audit; versioned commands.
- **Explicit exclusions** — Delivery-provider booking; full POS; KDS/printer integration.
- **Open decisions before this slice** — Exact cancellation policy; exact refund policy beyond the
  domain model already fixed (roadmap items 7–8).
- **Required implementation work** — Order-lifecycle state machine with separate commercial and
  fulfilment dimensions; operational-command endpoints enforcing `authorize(...)`; timer-driven
  exception raising (no silent mutation).
- **Required tests** — State-machine tests for every valid and invalid transition; a timer test
  proving an overdue order raises an exception rather than auto-cancelling.
- **Staging validation** — Move a confirmed order through accept → prepare → ready → handoff in
  staging using an authorized workforce session.
- **Evidence required** — Test output; state-transition audit evidence; final
  `git status --short`.
- **Rollback/recovery** — New tables only; independently revertible from payments slices.
- **Completion criteria** — A confirmed-paid order can be moved through the full forward-only
  fulfilment workflow by an authorized role, with every transition audited and every exception
  explicit.

### IMP-025 — Operations Console UI

- **Goal** — Implement the mobile/tablet-friendly fulfilment-focused workforce console.
- **Dependencies** — IMP-024.
- **Governing ADRs** — [ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md).
- **Included scope** — Incoming, accepted, preparing, ready, handoff, exceptions, completed, and
  cancelled views.
- **Explicit exclusions** — Counter billing; aggregator queue unification; inventory; advanced
  reporting.
- **Open decisions before this slice** — None beyond IMP-024's API.
- **Required implementation work** — Console UI screens calling the IMP-024 API; role-gated action
  buttons matching the permission catalog.
- **Required tests** — Component tests for each view's action-button availability per role.
- **Staging validation** — Operate a full order lifecycle from the Operations Console UI on a
  tablet-width viewport in staging.
- **Evidence required** — Staging screenshots of each view; test output; final
  `git status --short`.
- **Rollback/recovery** — UI-only; independently revertible from IMP-024's API.
- **Completion criteria** — An authorized workforce member can operate the full order lifecycle
  through the console UI alone, on a representative tablet viewport.

---

## Phase 6 — Delivery and communication

### IMP-026 — Provider-neutral delivery foundation

- **Goal** — Implement delivery requests, lifecycle, assignments, events, proof, failure, return,
  and cost records.
- **Dependencies** — IMP-024.
- **Governing ADRs** — [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md).
- **Included scope** — API, dashboard, and manual modes; idempotent booking abstraction; pickup
  verification abstraction; handoff transaction; delivery-status mapping; failure/review states;
  cost-reconciliation model.
- **Explicit exclusions** — Final provider adapter; owned fleet; dynamic provider bidding.
- **Open decisions before this slice** — None beyond ADR-011's already-fixed provider-neutral model.
- **Required implementation work** — Delivery-request tables and state machine; a provider-neutral
  booking interface with a manual-mode implementation for testing; pickup-verification abstraction.
- **Required tests** — State-machine tests for the delivery lifecycle; an idempotent-booking test.
- **Staging validation** — Run a full manual-mode delivery lifecycle in staging.
- **Evidence required** — Test output; sample delivery-lifecycle evidence; final
  `git status --short`.
- **Rollback/recovery** — New tables only; independently revertible from IMP-024.
- **Completion criteria** — A delivery request can be created, assigned, tracked through pickup and
  handoff, and completed using the manual operating mode, through a provider-neutral interface that
  a real provider adapter can later implement without a redesign.

### IMP-027 — Dehradun delivery operating mode

- **Goal** — Implement the approved first delivery operating mode after commercial validation.
- **Dependencies** — IMP-026.
- **Governing ADRs** — [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md).
- **Included scope** — Only the approved provider integration or controlled manual workflow, per
  the founder's commercial-validation outcome.
- **Explicit exclusions** — Any provider or mode not explicitly approved for this slice.
- **Open decisions before this slice** — Final provider; API versus dashboard/manual mode; dispatch
  timing; pickup verification; proof policy; customer-unavailable process; cost model (roadmap
  items 4–5).
- **Required implementation work** — Depends entirely on the approved mode; scoped once the open
  decisions above are resolved.
- **Required tests** — Depends on the approved mode; must at minimum cover dispatch, handoff, and
  failure/return paths.
- **Staging validation** — Run the approved mode end-to-end in staging (sandbox credentials if
  API-integrated).
- **Evidence required** — Provider request/response or manual-workflow evidence; test output; final
  `git status --short`.
- **Rollback/recovery** — Built on IMP-026's provider-neutral interface; the manual mode remains
  available as a fallback if the approved provider integration fails validation.
- **Completion criteria** — The founder-approved Dehradun delivery mode is functional end-to-end in
  staging, using the provider-neutral interface from IMP-026.

### IMP-028 — Notification foundation

- **Goal** — Implement provider-neutral notification requests, attempts, templates, consent,
  preferences, retries, and provider events.
- **Dependencies** — IMP-024.
- **Governing ADRs** — [ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md).
- **Included scope** — Template registry; typed variables; locale foundation; deduplication;
  ordering; expiry; stale-message suppression; in-app notification projection; consent and opt-out
  records.
- **Explicit exclusions** — Meta production activation; marketing campaigns; full support console.
- **Open decisions before this slice** — None beyond ADR-012's already-fixed model.
- **Required implementation work** — Notification-request and message-attempt tables; template
  registry with typed variables; a stub channel adapter (no real WhatsApp send yet) for testing
  ordering/expiry/dedup logic.
- **Required tests** — Deduplication tests; a stale-message-suppression test; an ordering test.
- **Staging validation** — Trigger a representative notification event in staging and confirm
  correct request/attempt records via the stub adapter.
- **Evidence required** — Test output; sample notification-request evidence; final
  `git status --short`.
- **Rollback/recovery** — New tables only; independently revertible from IMP-024.
- **Completion criteria** — A notification request can be created, deduplicated, ordered, and
  suppressed when stale, entirely through the stub channel adapter, before any real WhatsApp
  integration exists.

### IMP-029 — Meta WhatsApp Cloud API adapter

- **Goal** — Implement transactional WhatsApp messaging and inbound event ingestion.
- **Dependencies** — IMP-028.
- **Governing ADRs** — [ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md).
- **Included scope** — Outbound utility messages; delivery/read/failure events; inbound messages;
  cancellation-request routing; safe links; opt-out processing; human-escalation hooks.
- **Explicit exclusions** — Full conversational ordering; autonomous refunds; marketing automation.
- **Open decisions before this slice** — Meta API version; WABA and phone setup; initial approved
  templates; launch locales; retry policy; retention; credential references.
- **Required implementation work** — Meta Cloud API adapter behind the IMP-028 channel interface;
  webhook ingestion for delivery/read/failure/inbound events; inbound-message classification
  routing a cancellation request to a request-only record, never a direct state mutation.
- **Required tests** — A test proving an inbound cancellation message creates a request record only,
  never mutates order state directly; webhook-event ingestion tests.
- **Staging validation** — Send and receive a real WhatsApp test message through Meta's sandbox/test
  number from staging.
- **Evidence required** — Meta webhook/API request-response evidence; test output; final
  `git status --short`.
- **Rollback/recovery** — Built on IMP-028's provider-neutral interface; the stub adapter remains
  available if the Meta integration must be paused.
- **Completion criteria** — A real transactional WhatsApp message can be sent and its delivery/read
  status ingested, and an inbound cancellation message is proven to create a request only.

---

## Phase 7 — Administration and operational readiness

### IMP-030 — Initial administration capabilities

- **Goal** — Implement minimum authorized administration for launch.
- **Dependencies** — IMP-011, IMP-014, IMP-015, IMP-026.
- **Governing ADRs** — [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md),
  [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md).
- **Included scope** — Catalog, availability, pricing, outlets, provider-account metadata,
  operational configuration, feature flags, kill switches, and workforce-access administration
  only.
- **Explicit exclusions** — General-purpose administration framework; secret display; advanced
  reporting; custom roles.
- **Open decisions before this slice** — Exact admin configuration UX and approval thresholds
  (roadmap item 113).
- **Required implementation work** — Admin screens/endpoints for the listed capabilities only, each
  behind the existing `authorize(...)` boundary.
- **Required tests** — Permission tests proving only authorized roles can reach each admin
  capability.
- **Staging validation** — Perform a representative administration task (for example toggling a
  feature flag) end-to-end in staging.
- **Evidence required** — Test output; staging screenshots; final `git status --short`.
- **Rollback/recovery** — UI/endpoint-only additions on top of already-existing tables.
- **Completion criteria** — Every listed administration capability is reachable only by an
  authorized role and produces the correct effect in staging.

### IMP-031 — Observability and operational controls

- **Goal** — Implement required logs, metrics, alerts, health, queues, and operational review
  surfaces.
- **Dependencies** — IMP-007, IMP-022, IMP-026, IMP-029.
- **Governing ADRs** — [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md),
  [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md).
- **Included scope** — Request and trace IDs; error monitoring; database and pool metrics; outbox
  backlog; payment review; delivery review; notification failure; provider health; audit
  visibility.
- **Explicit exclusions** — None beyond what is listed in the goal.
- **Open decisions before this slice** — Observability provider; alert thresholds; retention;
  on-call ownership.
- **Required implementation work** — Instrumentation for the listed surfaces; a review dashboard or
  admin view surfacing payment/delivery/notification review queues.
- **Required tests** — Tests proving trace/request IDs propagate through a representative request.
- **Staging validation** — Trigger a representative failure (for example a mismatched-payment
  review case) and confirm it surfaces in the review view in staging.
- **Evidence required** — Test output; staging screenshots of the review surfaces; final
  `git status --short`.
- **Rollback/recovery** — Additive observability only; no behavioural change to business logic.
- **Completion criteria** — A payment, delivery, or notification failure surfaces in an operator-
  visible review queue in staging, with request/trace correlation intact.

### IMP-032 — Backup, restore, and migration readiness

- **Goal** — Validate production-grade database recovery and migration operations.
- **Dependencies** — IMP-004, IMP-005.
- **Governing ADRs** — [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md).
- **Included scope** — Managed-backup verification; logical backup process; restore drill; migration
  runbook; emergency-DDL policy; recovery evidence.
- **Explicit exclusions** — None beyond what is listed in the goal.
- **Open decisions before this slice** — None beyond ADR-013's already-fixed backup model.
- **Required implementation work** — A documented backup/restore procedure and a migration runbook;
  no application code change expected.
- **Required tests** — A restore drill performed against a staging copy of the database.
- **Staging validation** — Execute the restore drill in Docker Desktop and confirm data integrity
  after restore.
- **Evidence required** — Restore-drill logs and before/after row-count comparison; final
  `git status --short`.
- **Rollback/recovery** — This slice validates recovery; it is itself low-risk (read/backup
  operations against a staging copy).
- **Completion criteria** — A documented restore drill has been performed successfully against a
  staging database copy, with evidence of data integrity after restore.

### IMP-033 — Security and privacy hardening

- **Goal** — Complete launch security controls not already embedded in prior slices.
- **Dependencies** — IMP-014, IMP-030, IMP-031.
- **Governing ADRs** — [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md),
  [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md).
- **Included scope** — CSRF; CORS validation; rate-limit review; secret scan; dependency scan; data-
  exposure review; permission review; production-bypass rejection.
- **Explicit exclusions** — None beyond what is listed in the goal.
- **Open decisions before this slice** — CSP; retention schedules; data deletion/anonymization;
  security-header policy; incident-response process.
- **Required implementation work** — CSP and security-header configuration; a secret/dependency scan
  run and remediation of findings; a permission review against the ADR-005 catalog.
- **Required tests** — A test proving a known production-bypass configuration is rejected at
  startup (extending IMP-003).
- **Staging validation** — Run the security scans against staging and confirm the production-
  safeguard rejection tests pass.
- **Evidence required** — Scan output; test output; final `git status --short`.
- **Rollback/recovery** — Hardening changes are reviewed individually; any header/policy change that
  breaks a feature is revertible independently.
- **Completion criteria** — Secret and dependency scans are clean or have documented, accepted
  findings; CSP/security headers are in place; production-bypass configurations are proven rejected.

### IMP-034 — Production infrastructure and release pipeline

- **Goal** — Provision and validate production-ready DigitalOcean and release infrastructure close
  to GTM.
- **Dependencies** — IMP-001 through IMP-033 (all prior slices validated in staging).
- **Governing ADRs** — [ADR-001](./decisions/ADR-001-digitalocean-platform.md),
  [ADR-002](./decisions/ADR-002-environments-ci-cd-release-model.md).
- **Included scope** — App Platform; Managed PostgreSQL; PgBouncer; Spaces; runtime secrets;
  staging/production separation; immutable image promotion; migration job; deployment approval;
  smoke checks.
- **Explicit exclusions** — Premature paid production provisioning before approved timing.
- **Open decisions before this slice** — Application instance sizes, database size, storage
  capacity, backup retention, and disaster-recovery targets; infrastructure-as-code tooling and
  secret-management implementation; final production HA date and commercial-launch capacity
  (roadmap items 22–24).
- **Required implementation work** — Provision the approved DigitalOcean resources; wire the
  release pipeline for immutable-image build, promotion, and migration execution; configure runtime
  secrets.
- **Required tests** — A smoke-check suite run against the provisioned staging/production
  environments.
- **Staging validation** — A full deploy-and-smoke-check cycle against the newly provisioned
  environments, gated by founder approval before promoting to production.
- **Evidence required** — Deployment logs; smoke-check output; final `git status --short`.
- **Rollback/recovery** — Immutable-image promotion model supports rollback to the prior image
  digest; document the rollback procedure as part of this slice's evidence.
- **Completion criteria** — Staging and production environments are provisioned, isolated, and
  reachable via the immutable-image release pipeline, with a documented and tested rollback
  procedure.

### IMP-035 — Launch validation and cutover

- **Goal** — Validate the complete direct-order journey before public release.
- **Dependencies** — IMP-034 and every functional slice it depends on.
- **Governing ADRs** — All fifteen ADRs, as the final end-to-end check.
- **Included scope** — Customer registration; address; serviceability; menu; cart; checkout;
  payment; operations; delivery; notifications; refund; recovery; support; monitoring; rollback;
  existing static-site cutover.
- **Explicit exclusions** — Any capability explicitly deferred per
  [Section E of the readiness review](./architecture-readiness-review.md#e-deferred-capabilities).
- **Open decisions before this slice** — All outstanding launch validations in
  [Section F of the readiness review](./architecture-readiness-review.md#f-known-launch-validations)
  must be resolved before this slice completes.
- **Required implementation work** — None expected beyond fixes surfaced by end-to-end validation;
  this slice is primarily verification.
- **Required tests** — A full end-to-end customer journey executed manually and, where feasible,
  through automated tests, against production or a production-equivalent environment.
- **Staging validation** — Complete the full journey in the production-equivalent environment
  before cutover.
- **Evidence required** — Full journey evidence (screenshots, logs, request/response traces) for
  every included-scope item; documented known warnings and remaining limitations; final
  `git status --short`.
- **Rollback/recovery** — The existing GitHub Pages marketing site remains the fallback until
  cutover is explicitly approved; document the cutover and rollback sequence as evidence.
- **Completion criteria** — The founder has reviewed complete end-to-end evidence for every
  included-scope item and explicitly accepts cutover from the existing static site to the direct-
  order platform.

## Related documents

- [`architecture-readiness-review.md`](./architecture-readiness-review.md) — confirms foundational
  architecture readiness ahead of this roadmap
- [`README.md`](./README.md) — canonical documentation index
- [`decision-register.md`](./decision-register.md) — structured decision log, including D-355
- [`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md) — the complete open-decisions
  list referenced throughout the slices above
