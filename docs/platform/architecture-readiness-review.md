---
Status: HISTORICAL readiness review
Review date: 2026-08-03
Last updated: 2026-08-11
Current GTM sequencing: docs/platform/ROADMAP.md (GTM boundary IMP-040)
---

# BOBA Bear — Architecture Readiness Review

> **HISTORICAL.** This review confirmed foundational ADRs were ready for implementation as of
> 2026-08-03. It is **not** a current roadmap or GTM-boundary authority. Current IMP sequence,
> accepted-through position, and public GTM boundary (**IMP-040**) live in
> [`ROADMAP.md`](./ROADMAP.md) / [`STATE.md`](./STATE.md). ADR binding status lives in
> [`decision-register.md`](./decision-register.md). Historical references below to
> `implementation-roadmap.md` or to IMP numbers with GTM-R1 meanings (for example IMP-021–023 as
> Cashfree/webhooks/refund, IMP-035 as launch/GTM) are superseded.

## A. Executive conclusion

Foundational architecture for the BOBA Bear direct-order platform was judged **ready for
implementation** as of this review date. ADR-001 through ADR-015 were present and sequentially
numbered. Subsequent governance (2026-08-11) installed CURRENT authorities and amended/superseded
specific ADR readings (notably ADR-014 transport host → D-356; ADR-010 Order lifecycle reading →
D-357).

This conclusion covered **architecture readiness**, not **launch readiness**. Provider onboardings
and launch validations remain outstanding — see [Section F](#f-known-launch-validations). Current
sequencing is in [`ROADMAP.md`](./ROADMAP.md), not
[`implementation-roadmap.md`](./implementation-roadmap.md) (SUPERSEDED GTM-R1).

## B. ADR inventory

| ADR | Area | Historical review status | Current governance note |
|---|---|---|---|
| [ADR-001](./decisions/ADR-001-digitalocean-platform.md) | DigitalOcean platform | Accepted | CURRENT |
| [ADR-002](./decisions/ADR-002-environments-ci-cd-release-model.md) | Environments, CI/CD, secrets, and release | Accepted | CURRENT |
| [ADR-003](./decisions/ADR-003-modular-monolith-node-typescript.md) | Modular monolith and TypeScript architecture | Accepted | AMENDED by D-356 on HTTP host |
| [ADR-004](./decisions/ADR-004-identity-authentication-sessions.md) | Identity, authentication, and sessions | Accepted | CURRENT |
| [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md) | Organization, outlet, and authorization | Accepted | AMENDED by D-358 on role inventory |
| [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md) | Catalog, assortment, and availability | Accepted | CURRENT |
| [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md) | Pricing, tax, charges, and promotions | Accepted | CURRENT; invoice impl = IMP-028 |
| [ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md) | Serviceability, cart, and checkout | Accepted | AMENDED vs accepted IMP-018–021 |
| [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md) | Payments, webhooks, refunds, and reconciliation | Accepted | AMENDED; Payment domain = IMP-022 accepted; Cashfree GTM/Refund future |
| [ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md) | Order lifecycle and Operations Console | Accepted | AMENDED by D-357; Ops Console = IMP-029/030 |
| [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md) | Delivery providers, dispatch, and fulfilment | Accepted | Future ROADMAP IMP-031+ |
| [ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md) | Notifications, WhatsApp, and assisted commerce | Accepted | Future ROADMAP IMP-033+ |
| [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md) | PostgreSQL, Drizzle, migrations, and persistence | Accepted | CURRENT |
| [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md) | HTTP APIs, Route Handlers, and contracts | Accepted | SUPERSEDED host claim by D-356 |
| [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md) | Configuration, secrets, feature flags, and startup controls | Accepted | CURRENT |

Historical note: ADR index linking and decision-register references from the readiness-era docs are
superseded by the CURRENT authority stack in [`README.md`](./README.md).

## C. Cross-cutting readiness

**Product scope** — Ready. The documentation set consistently states a direct-order platform, a
mobile-first PWA initial launch, food ordering as V1 transactional scope, Dehradun as the first
market, COCO as the initial operating model, aggregator orders remaining in Petpooja, direct orders
routed through the BOBA Bear Operations Console (not a full POS in V1), PWA and WhatsApp as
customer-communication channels with full conversational WhatsApp ordering deferred, native
applications deferred, and franchise/multi-outlet foundations present without requiring full
franchise functionality in V1.

**Platform** — Ready. DigitalOcean (Bangalore) is the consistent hosting foundation; web and worker
share one immutable OCI image; staging and production are isolated with the same image digest
promoted between them; DigitalOcean Managed PostgreSQL 18 Standard Edition and DigitalOcean Spaces
are the approved database and object-storage direction; DigitalOcean encrypted variables and
narrowly scoped GitHub Actions deployment secrets are the secrets model; local development uses
Docker; paid production infrastructure remains deferred until GTM readiness.

**Application architecture** — Ready (historical). The modular monolith, module table ownership,
framework-independent business logic, transactional outbox, and at-least-once/idempotent-consumer
processing remain foundational. The historical ADR-014 Route-Handler host claim is superseded by
D-356 (static public frontend + external dynamic transport).

**Identity and authorization** — Ready. Self-hosted Better Auth, Indian phone/OTP customer
authentication, email/password/TOTP workforce authentication, one identity spanning customer and
workforce contexts, opaque revocable sessions, scoped deny-by-default RBAC enforced inside
application use cases, and distinct platform/brand/organization/territory/outlet scopes are all
fixed. Feature flags and database roles are explicitly non-substitutes for authorization; RLS is
deferred and selective.

**Catalog and pricing** — Ready. Catalog, assortment, availability, and pricing are kept as
distinct concerns; the brand canonical catalog is inherited and narrowed downstream; stable
identifiers, immutable order snapshots, checkout-time availability revalidation, and a
no-silent-substitution rule are fixed. Money is integer paise with precision-safe decimal rates;
pricing and tax are effective-dated; direct and aggregator prices are kept separate. GST treatment
is explicitly provisional pending accountant validation — this is a documented launch validation,
not an unresolved architecture question.

**Checkout and payments** — Ready. Manual address entry is always available with device location
optional; serviceability uses explicit zones; the cart is server-authoritative and single-outlet
with protected anonymous access; authentication is required before final checkout; checkout
revalidates serviceability, availability, pricing, delivery, and customer confirmation before
creating a pre-payment order hidden from kitchen operations. Cashfree Hosted Checkout sits behind a
provider-neutral Payments module; browser return is never payment authority; verified webhook or
server query establishes truth; first verified success wins; refunds are durable and reconciled;
payment credentials are never requested in WhatsApp. Production Cashfree use remains a launch
validation.

**Operations and delivery** — Ready. Commercial, payment, fulfilment, delivery, cancellation, and
refund states are kept separate; outlet acceptance is manual in V1; fulfilment is forward-only with
explicit, audited exceptions; timers raise exceptions rather than silently mutating orders. Delivery
is provider-neutral, supporting API-integrated, dashboard, and controlled-manual operating modes;
Rapido is a commercial-validation candidate, not an assumed integration; dispatch follows payment
and outlet acceptance; pickup requires verification; delivery completion normally drives order
completion; customer delivery charge is kept separate from provider cost.

**Notifications** — Ready. The Notifications module is provider-neutral with Meta WhatsApp Cloud
API as the first provider direction; BOBA Bear owns the WhatsApp identity and templates; WhatsApp is
the primary transactional channel with PWA tracking remaining authoritative; marketing consent is
separate from transactional messaging; inbound cancellation requests never mutate order state
directly; stale messages are suppressed; full conversational commerce and autonomous
payment/refund/cancellation are explicitly deferred.

**Persistence** — Ready. PostgreSQL 18 is used identically across local, CI, staging, and
production behind Drizzle and `node-postgres`; migrations are reviewed and immutable;
`drizzle-kit push` is prohibited in shared environments; schemas are `auth`, `app`, `platform`, and
`drizzle` (never `public`); UUIDv7, `timestamptz`, integer paise, and named constraints are
required; PgBouncer transaction-mode pooling is used at runtime with direct connections reserved for
migrations and backup; Testcontainers with real PostgreSQL 18 is the authoritative integration-test
strategy (SQLite and PGlite are explicitly not substitutes); backup and restore validation is a
documented launch requirement, not yet performed.

**HTTP APIs** — Ready. App Router Route Handlers are canonical under `/api/v1`, with public,
customer, operations, admin, and provider-integration namespaces kept separate; Zod 4 validates
structural boundaries distinct from business validation; RFC 9457 Problem Details is the error
foundation; CSRF applies to unsafe cookie-authenticated mutations; CORS is disabled by default;
sensitive rate-limit state uses PostgreSQL in V1; `Idempotency-Key`, `ETag`, and `If-Match` are
supported where applicable; cursor pagination is preferred for unbounded lists; request IDs and
trace context are required; health endpoints are `/health/live` and `/health/ready`.

**Configuration and secrets** — Ready. A centralized typed configuration boundary restricts raw
`process.env` access to bootstrap and tooling; `LOCAL`, `TEST`, `CI`, `STAGING`, and `PRODUCTION`
are explicit environments distinct from `NODE_ENV`; secrets are prohibited from browser bundles and
`NEXT_PUBLIC_`; PostgreSQL stores only secret references; operational configuration and boolean
feature flags are registered, versioned, scoped, and audited with server-authoritative evaluation;
kill switches carry capability-specific semantics that do not block inbound provider events or
reconciliation; startup validates required configuration and production safeguards without
ordinarily blocking on temporary provider unavailability; liveness and readiness are kept separate;
environment-variable changes require restart or deployment.

## D. Remaining open decisions

Open decisions are intentionally deferred to just before the implementation slice that depends on
them, per the [just-in-time decision policy](#g-implementation-start-decision). They are grouped
below by the slice that first requires them; the full, authoritative list is
[`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md#open-decisions).

- **IMP-003 (configuration foundation)** — exact package/adapter versions are not yet a blocker;
  configuration schema shape is already fixed by ADR-015.
- **IMP-008–IMP-010 (identity)** — OTP/SMS provider, exact session durations, cookie settings,
  invitation lifetime, recovery process, bot-protection provider (roadmap items 2, 41–48).
- **IMP-011 (organization/outlet/RBAC)** — exact authorization database schema, permission catalog,
  authorization-cache implementation, refund/monetary delegation limits, guest-order tracking
  model, break-glass and support-access workflow, selective RLS scope, custom-role timing, and
  customer-impersonation design (roadmap items 116–122).
- **IMP-015–IMP-016 (pricing/promotions)** — final GST treatment validation, tax display mode,
  rounding rule, packaging/delivery tax treatment, initial promotion types and redemption limits
  (roadmap items 9, 30–40, 91–92 area).
- **IMP-018 (serviceability)** — PostGIS versus non-PostGIS geometry, initial Dehradun zones,
  manual-fallback policy, serviceability TTL, geocoding/map provider (roadmap item 6).
- **IMP-020 (checkout orchestration)** — quote and checkout lifetimes, customer-confirmation rules,
  initial delivery-quote fallback.
- **Historical GTM-R1 payment slices (now superseded numbering)** — Cashfree API version, sandbox,
  refund thresholds, etc. remain launch validations; current ROADMAP maps Payment domain to
  accepted IMP-022 and Cashfree productionization / Refund to IMP-026 / IMP-027.
- **Delivery / WhatsApp / observability / security launch validations** — still required before
  GTM; current slice IDs live in [`ROADMAP.md`](./ROADMAP.md) (not GTM-R1 numbering below).

Historical GTM-R1 labels retained only as provenance for older notes:
`IMP-027` delivery mode, `IMP-029` WhatsApp, `IMP-031` observability, `IMP-033` security — see
current [`ROADMAP.md`](./ROADMAP.md) for GTM-R2 IDs.

None of these items are foundational architecture blockers. Each sits inside an already-accepted
ADR boundary and is scoped to resolve immediately before its dependent slice, not before
implementation begins.

## E. Deferred capabilities

The following are intentionally excluded from V1 and must not appear in any implementation slice
unless this documentation set is amended first: native applications; full POS (counter billing,
cash drawer, shift settlement); dine-in; cash on delivery; scheduled orders; multi-outlet carts;
full conversational commerce and autonomous chat checkout/refund/cancellation; loyalty; wallets;
gift cards; subscriptions; merchandise fulfilment; an owned rider fleet; advanced inventory
(ingredient-level depletion, procurement, recipe costing); a general ledger/accounting integration;
an external message queue (Redis, RabbitMQ, Kafka, managed queue, CDC pipeline); PostgreSQL
sharding; GraphQL/tRPC/gRPC as a canonical API; and a public third-party developer API. See
[`v1-product-scope.md`](./v1-product-scope.md#explicitly-deferred-capabilities) and each ADR's own
"Explicit Non-Decisions" / "Rejected or Deferred Alternatives" sections for the authoritative list.

## F. Known launch validations

The following must be completed before public commercial launch, independent of architecture
readiness:

- **GST and accountant validation** — final GST classification, rate, invoice numbering, and
  rounding rule for direct orders (ADR-007).
- **Cashfree onboarding and production validation** — merchant onboarding, commercial pricing,
  contract terms, and success-rate validation before production payment activation (ADR-009).
- **Delivery-provider commercial and technical validation** — Rapido or an alternative partner's
  Dehradun coverage, API/dashboard availability, and commercial terms (ADR-011).
- **Meta WhatsApp production onboarding** — WhatsApp Business Account approval, template approval,
  and production phone-number activation (ADR-012).
- **Backup and restore validation** — a documented restore drill against DigitalOcean Managed
  PostgreSQL before broad public launch (ADR-013).
- **Security and operational readiness** — CSP, security headers, dependency/secret scanning, and
  incident-response process sign-off (ADR-014, ADR-015).

None of these validations are foundational architecture questions; they are provider-facing or
regulatory confirmations that occur just in time, ahead of the relevant future slices in
[`ROADMAP.md`](./ROADMAP.md) (GTM-R2). Do not use [`implementation-roadmap.md`](./implementation-roadmap.md)
(SUPERSEDED GTM-R1) for current sequencing.

## G. Implementation start decision

No additional foundational ADR was required before implementation began. Remaining open decisions
are resolved just in time before their dependent implementation slice, within the approved
architecture boundaries. Current position: see [`STATE.md`](./STATE.md) / [`ROADMAP.md`](./ROADMAP.md).

## Related documents

- [`README.md`](./README.md) — canonical documentation index and reading order
- [`ROADMAP.md`](./ROADMAP.md) — CURRENT implementation sequence (GTM-R2)
- [`implementation-roadmap.md`](./implementation-roadmap.md) — SUPERSEDED historical GTM-R1
- [`decision-register.md`](./decision-register.md) — CURRENT decision authority
- [`decision-register-historical.md`](./decision-register-historical.md) — historical D-001–D-355
- [`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md) — supporting open-decisions notes
