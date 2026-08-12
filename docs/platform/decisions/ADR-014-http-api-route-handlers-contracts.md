---
Status: SUPERSEDED
Governance status: SUPERSEDED
Superseded by: D-356 (docs/platform/decision-register.md)
Decision date: 2026-08-03
Last updated: 2026-08-11
---

# ADR-014: HTTP API, Route Handlers, and Request/Response Contracts

## Status

**SUPERSEDED** (2026-08-11) for the claim that Next.js App Router Route Handlers are BOBA Bear's
canonical HTTP boundary / product HTTP host.

Superseded by **[D-356](../decision-register.md)**: the public frontend remains a static Next.js
export served by Nginx; dynamic ordering/business transport must live outside dynamic Next.js
execution. Exact IMP-024 transport topology is deliberately undecided here.

This ADR body is preserved as historical rationale. Contract patterns (envelopes, idempotency
headers, Problem Details, etc.) may inform future transport architecture without restoring Route
Handlers as CURRENT host authority.

## Decision Date

2026-08-03

## Decision Owners

BOBA Bear founder and product leadership

## Context

[ADR-003](./ADR-003-modular-monolith-node-typescript.md) fixed that Route Handlers are thin HTTP
transport adapters, that domain and application code must never import React, Next.js, or database
clients, and left "API style and versioning," "Server Action usage policy," and the runtime-validation
library open. [ADR-008](./ADR-008-serviceability-cart-checkout.md) through
[ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md) each assume, without fixing in
detail, how a customer or workforce request reaches an application use case, how optimistic
concurrency and idempotency are expressed at the HTTP boundary, and how a webhook differs from a
customer-facing endpoint. [ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md) fixed the
PostgreSQL-backed transactional outbox and shared idempotency store that an HTTP idempotency contract
must sit on top of.

BOBA Bear is about to move from a statically exported marketing site to a transactional platform with
real customer accounts, payments, and workforce operations. Before any Route Handler, validation
schema, or API client is written, the platform needs one fixed answer for: what technology carries
HTTP traffic; how routes are namespaced and versioned; how thin a Route Handler must remain; when a
Server Component may query directly versus when a Client Component must call `/api/v1`; how requests
are validated; what a success response, an error response, and a field-validation error look like;
how CSRF, CORS, rate limiting, idempotency, optimistic concurrency, pagination, and caching are
expressed at the HTTP boundary; how correlation and trace context propagate; how provider webhooks
differ from customer/workforce endpoints; and what health endpoints exist. This ADR fixes those
answers so that implementation can proceed against one boundary rather than ad hoc, per-endpoint
decisions.

This ADR is documentation only. It does not implement any Route Handler, validation schema,
middleware, security control, or client.

## Decision Summary

> **Governance note (2026-08-11):** The Route-Handler-as-canonical-HTTP-host claim in this summary
> is **SUPERSEDED** by [D-356](../decision-register.md). Preserve the text below as historical
> rationale only.

Next.js App Router Route Handlers, using the standard Web `Request` and `Response`, are BOBA Bear's
canonical HTTP boundary, exposed as versioned JSON contracts under `/api/v1/{public,customer,
operations,admin}`, with a separate `/api/integrations/*` namespace for provider webhooks and
`/health/live` and `/health/ready` outside the versioned product API. Route Handlers remain thin
transport adapters that validate boundary data with Zod 4, invoke exactly one application use case,
and map the result through a shared success envelope, RFC 9457 Problem Details error contract, and
central error mapper. Server Components call authorized application query services directly and must
never make loopback HTTP requests to the application's own API; Client Components call `/api/v1`
through a typed first-party client. Cookie-authenticated unsafe methods require CSRF protection; CORS
is disabled by default; sensitive operations are rate-limited using PostgreSQL-backed counters per
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md); effectful mutations support
`Idempotency-Key` replay; concurrency-sensitive mutations support `ETag`/`If-Match`; unbounded lists
use opaque cursor pagination; authenticated responses are generally `Cache-Control: private, no-store`;
every request carries a BOBA Bear request ID and supports W3C Trace Context; and provider webhooks use
their own authenticity, replay, and idempotency controls rather than customer sessions or CSRF tokens.

This is an accepted, final decision for BOBA Bear's HTTP API architecture — not a recommendation. It
fixes structure, contracts, and boundary rules; it does not select exact package versions, exact
Route Handler helper APIs, exact thresholds, or exact encodings — see
[Explicit Non-Decisions](#explicit-non-decisions).

## Approved HTTP Principle

Next.js App Router Route Handlers are BOBA Bear's canonical HTTP boundary. Route files remain thin
adapters. Server Components call authorized application query services directly and do not make
loopback HTTP requests to the same application, per the Next.js official documentation on Route
Handlers and Server Components (Route Handlers use the standard Web `Request`/`Response`, and Server
Components render on the server without an HTTP round trip to the application's own API).

**Canonical browser or external-client flow:**

```text
Browser or future client
        ↓
Next.js Route Handler
        ↓
Request context and authentication
        ↓
Boundary validation
        ↓
Application use case
        ↓
Domain and repositories
        ↓
HTTP response mapper
```

**Canonical server-rendered read flow:**

```text
Server Component
        ↓
Authorized application query service
        ↓
Scoped repository
        ↓
Rendered server output
```

**Rejected pattern:**

```text
Server Component
        ↓
HTTP request to its own /api endpoint
        ↓
Same application
```

## Canonical HTTP Technology

- Next.js App Router Route Handlers, using the standard Web `Request` and `Response` — confirmed by
  current Next.js documentation as the supported request/response model for Route Handlers, which
  support `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS`.
- Versioned JSON HTTP contracts under `/api/v1`.
- Zod 4 for boundary validation.
- RFC 9457 Problem Details for errors.
- Legacy Pages Router API Routes are not used for new BOBA Bear APIs.
- Server Actions are not the canonical V1 business API.
- Core use cases remain reachable through versioned Route Handlers so future clients (native apps,
  WhatsApp-adjacent tooling) can use the same contracts.

## Target Route Organization

Target structure only — no files are created by this ADR:

```text
src/app/
├── api/
│   ├── v1/
│   │   ├── public/
│   │   ├── customer/
│   │   ├── operations/
│   │   └── admin/
│   ├── auth/
│   │   └── [...better-auth]/
│   └── integrations/
│       ├── cashfree/
│       ├── delivery/
│       └── meta/
│
├── health/
│   ├── live/
│   └── ready/
│
├── (customer)/
├── (operations)/
└── (admin)/
```

The exact Better Auth catch-all route remains implementation-pinned.

## API Namespaces

- **Public** (`/api/v1/public/*`) — intentionally anonymous information: public catalog
  presentation, public menu data, limited serviceability pre-checks, public PWA configuration. Still
  requires validation, rate limiting, data minimization, explicit cache policy, and abuse monitoring.
- **Customer** (`/api/v1/customer/*`) — authenticated customer operations: addresses, cart,
  checkout, orders, tracking, cancellation requests, refund status, communication preferences.
- **Operations** (`/api/v1/operations/*`) — authorized workforce operations: incoming order queue,
  acceptance and rejection, preparation, handoff, delivery coordination, operational exceptions,
  cancellation decisions, corrections.
- **Administration** (`/api/v1/admin/*`) — permission-controlled administration: catalog,
  availability, pricing, organizations, outlets, access assignments, provider configuration. The
  namespace does not grant authority by itself; the scoped, permission-based authorization fixed by
  [ADR-005](./ADR-005-organization-outlet-authorization.md) still applies to every request.
- **Provider integrations** (`/api/integrations/*`) — Cashfree, delivery-provider, Meta, and similar
  callbacks, using provider-specific authenticity, replay, environment, and idempotency controls
  rather than customer or workforce sessions.
- **Health** (`/health/live`, `/health/ready`) — outside the versioned product API.

## Thin Route Handlers

A Route Handler may: establish request context; enforce content-type and request-size policy;
resolve authentication; parse path, query, headers, and body; validate boundary data; invoke one
application use case; map the result to the standard response contract; map expected failures
through the central error mapper; record safe metrics and logs.

A Route Handler must not: implement business rules; decide tax, pricing, availability, or
serviceability; implement state machines; write SQL; write another module's tables; call Cashfree,
delivery providers, or Meta directly; send notifications directly; treat route namespace as
sufficient authorization; contain large workflow branches. Domain and application modules must not
construct `NextResponse` or HTTP-specific errors, consistent with the layer boundaries already fixed
by [ADR-003](./ADR-003-modular-monolith-node-typescript.md#dependency-rules).

## Server and Client Data Access

**Server Components** are used for initial page rendering, SEO-sensitive catalog rendering,
authenticated server-side reads, and data needed only during server rendering. They call application
query services directly and must still enforce authentication, authorization, ownership, outlet or
organization scope, and data minimization — server execution does not automatically imply
authorization.

**Client Components** are used only when browser interactivity is required: cart controls, checkout
progression, address interaction, Operations Console controls, realtime display, interactive maps
and forms. They use a typed first-party HTTP client calling `/api/v1` and must not have unnecessary
sensitive server data serialized into their props — anything sent to a Client Component is
browser-visible.

## Server Actions

Server Actions are not used as the canonical interface for cart mutations, checkout confirmation,
payment initiation, order acceptance, order cancellation, refund requests, delivery handoff, or
provider configuration. Server Actions may later be considered for narrow UI-local or
progressive-enhancement flows; they must never become the only interface to a core business use
case.

## HTTP Method Conventions

| Method | Purpose |
| --- | --- |
| `GET` | Read without business mutation |
| `POST` | Create a resource or execute an explicit command |
| `PATCH` | Partial mutation of an existing resource |
| `PUT` | Complete replacement only where appropriate |
| `DELETE` | Actual deletion only where retention policy permits |
| `HEAD` | Metadata where explicitly required |
| `OPTIONS` | CORS preflight where cross-origin access is approved |

`GET` and `HEAD` never cause business mutations. `DELETE` is not used for business cancellation.
Lifecycle actions use explicit command endpoints; generic `/execute` or arbitrary action endpoints
are avoided. For example:

```text
POST /api/v1/customer/cart/items
PATCH /api/v1/customer/cart/items/{lineId}

POST /api/v1/customer/orders/{orderId}/cancellation-requests

POST /api/v1/operations/orders/{orderId}/accept
POST /api/v1/operations/orders/{orderId}/reject
POST /api/v1/operations/orders/{orderId}/start-preparation
POST /api/v1/operations/orders/{orderId}/mark-ready
POST /api/v1/operations/orders/{orderId}/handoff
```

## API Versioning

Path-based major versioning (`/api/v1/*`) is the primary and only approved versioning approach;
query-string, date-based, and custom-header versioning are not used as the primary mechanism.
Additive, backward-compatible fields may be added within V1; a V1 field is never removed, never
changes type or meaning, and is never reused for another concept. Breaking changes require a new
major version. Clients must ignore unknown additive fields. Internal refactoring does not require a
new HTTP version. Provider webhook versions follow provider contracts. Exact deprecation and sunset
policy remains open.

## Zod Validation

Zod 4 validates path parameters, query parameters, headers, and request body separately, using
strict mutation schemas that normally reject unknown fields — Zod 4 is confirmed current and stable
by its official documentation and includes built-in JSON Schema conversion, which the future
OpenAPI-compatible documentation direction (see [Contract Documentation](#contract-documentation))
may build on. Explicit string-length limits, array limits, identifier syntax, date-time validation,
safe-integer validation, allowed enum values, URL validation, and content-type validation are
applied. Zod does not silently coerce arbitrary values, accept unlimited arrays or strings, treat
database-dependent business rules as Zod refinements, or reuse raw database schemas as public API
schemas.

### Structural versus Business Validation

Zod owns **structural** validation: required field, UUID format, string length, array size,
date-time syntax, request enum, object shape. Authorized use cases and, where required, database
transactions own **business** validation: customer owns order, outlet is permitted, cart version is
current, payment is confirmed, order can be cancelled, refund balance remains, delivery has not
passed handoff, product remains orderable. This mirrors the structural/business separation already
implicit in [ADR-006](./ADR-006-food-catalog-assortment-availability.md) and
[ADR-008](./ADR-008-serviceability-cart-checkout.md).

## Content Types and Request Sizes

JSON endpoints require `Content-Type: application/json`. `415 Unsupported Media Type` is used for
unsupported content type, `400 Bad Request` for malformed JSON, and `422 Unprocessable Content` for
schema-invalid JSON. Provider webhooks may require raw body preservation for authenticity
verification. Every endpoint requires a body-size policy, with categories such as `SMALL_JSON`,
`STANDARD_JSON`, `PROVIDER_WEBHOOK`, and `MULTIPART_METADATA`. Bodies default to bounded small JSON;
oversized bodies are rejected before expensive parsing where possible; large media is never passed
through ordinary JSON endpoints; provider limits are provider-specific; oversized request bodies are
never logged. Exact limits remain open.

## Success Response Contract

```json
{
  "data": { "id": "..." },
  "meta": { "requestId": "..." }
}
```

List response:

```json
{
  "data": [],
  "page": { "nextCursor": "...", "hasMore": true },
  "meta": { "requestId": "..." }
}
```

`204 No Content` is used when no representation is required. No undefined or undocumented metadata
fields are included.

## JSON Representations

Identifiers are strings. Timestamps are RFC 3339-compatible UTC strings, consistent with the
`timestamptz` storage convention fixed by
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#time-and-date-types). Money is
represented as:

```json
{ "amountMinor": "24900", "currency": "INR" }
```

`amountMinor` is a decimal string representing integer paise, mirroring the integer-paise storage
convention already fixed by
[ADR-007](./ADR-007-pricing-tax-charges-promotions.md#currency-and-monetary-representation) and
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#monetary-persistence); authoritative
money is never exposed as binary floating-point JSON. Nullable fields use `null` only where the
contract explicitly defines its meaning, never alternating unpredictably between omitted and `null`.
Aggregate versions are exposed in a safe integer or decimal-string representation; the exact
large-version representation remains open.

## HTTP Status Conventions

| Status | Meaning |
| -----: | --- |
| `200` | Successful read or command |
| `201` | Resource created |
| `202` | Asynchronous work accepted |
| `204` | Success with no body |
| `400` | Malformed request |
| `401` | Authentication required or invalid |
| `403` | Authenticated but unauthorized |
| `404` | Resource absent or intentionally concealed |
| `409` | Business or idempotency conflict |
| `412` | Stale `If-Match` precondition |
| `415` | Unsupported content type |
| `422` | Validation or semantic input failure |
| `428` | Required precondition missing |
| `429` | Rate limit exceeded |
| `500` | Unexpected internal failure |
| `502` | Invalid or failed upstream response |
| `503` | Temporary service or dependency unavailability |

HTTP `200` is never returned with an error object.

## Error Contract

RFC 9457 Problem Details, `application/problem+json`, is the error contract for every `/api/v1` and
`/api/integrations` error response. RFC 9457 defines every member (`type`, `title`, `status`,
`detail`, `instance`) as optional, with `type` defaulting to `about:blank` and `status` advisory
only; BOBA Bear additionally always populates its own stable `code`, a `requestId`, and a `retryable`
flag as documented extension members, which RFC 9457 explicitly permits:

```json
{
  "type": "https://errors.thebobabear.in/cart/version-conflict",
  "title": "Cart version conflict",
  "status": 409,
  "detail": "The cart changed after this request was prepared.",
  "instance": "/api/v1/customer/cart",
  "code": "cart.version_conflict",
  "requestId": "019...",
  "retryable": false,
  "errors": []
}
```

The exact problem-type URI host remains open. Stable, machine-readable error codes are used, such as
`request.malformed_json`, `request.validation_failed`, `auth.authentication_required`,
`auth.permission_denied`, `resource.not_found`, `cart.version_conflict`,
`checkout.quote_expired`, `order.invalid_transition`, `payment.review_required`,
`delivery.no_provider_available`, and `rate_limit.exceeded`. Stack traces, SQL errors, class names,
provider secrets, raw provider errors, internal fraud rules, and full sensitive values are never
exposed; this extends the safe-failure-normalization principle already fixed by
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#payment-failure-normalization).
Unexpected failures use a generic public error while logs retain the internal exception and request
ID.

### Field Validation Errors

```json
{
  "errors": [
    { "path": "address.postalCode", "code": "invalid_format", "message": "Enter a valid postal code." }
  ]
}
```

Public API field paths are used, never table or internal property names; complete sensitive values
are never echoed; messages may be localized later; stable codes remain language-independent.

### Central Error Mapper

One shared HTTP error-mapping boundary handles validation, authentication, authorization, resource
absence, version conflict, idempotency conflict, invalid lifecycle transition, rate limiting,
dependency failure, and unexpected failure. HTTP mapping remains outside domain modules, consistent
with the dependency rules fixed by
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#dependency-rules).

## Actor and Authentication Context

Supported actor categories are Anonymous, Customer, Workforce, Service, and Provider. Actor IDs are
never trusted from request bodies; outlet, organization, role, or customer scope supplied by the
client is never trusted; current permissions are resolved for every protected use case; route
namespace does not grant authorization; customer ownership is validated in the use case; workforce
permissions use current scoped memberships; provider identity comes from verified provider
credentials and context; provider callbacks do not impersonate human users. This restates, at the
HTTP boundary, the authorization model already fixed by
[ADR-005](./ADR-005-organization-outlet-authorization.md).

## CSRF Protection

Cookie-authenticated unsafe methods (`POST`, `PUT`, `PATCH`, `DELETE`) require explicit CSRF
protection: a session-bound CSRF token, a custom header such as `X-CSRF-Token`, strict origin
validation, approved content type, secure session-cookie configuration, and no state mutation
through safe methods. This follows OWASP's Cross-Site Request Forgery Prevention Cheat Sheet, whose
primary defense is the synchronizer token pattern — a session-bound, unpredictable token checked on
every unsafe request — with `SameSite` cookies and origin/referer checks treated as secondary,
defense-in-depth controls rather than the sole control. The token must be unpredictable,
session-bound, absent from URLs, invalidated or rotated with the session, and checked safely. The
exact synchronizer-token mechanism remains open. Provider webhooks, health endpoints, and service
callbacks are exempt from browser CSRF tokens but use their own authenticity and replay controls.

## CORS Policy

Customer, operations, and administration APIs are same-origin in V1: no CORS allow headers are sent
by default, and wildcard credentialed CORS is never configured. Future cross-origin browser access
requires an explicit approved origin allowlist, no wildcard subdomain matching, a credentials policy,
correct preflight handling, `Vary: Origin`, and security review. Native mobile support does not
require enabling broad browser CORS; native-client authentication remains deferred.

## Trusted Origin and Proxy Handling

Origin and host validation accounts for DigitalOcean's trusted proxy path fixed by
[ADR-001](./ADR-001-digitalocean-platform.md): forwarding headers are trusted only from known
infrastructure, arbitrary `X-Forwarded-For` is never trusted, the canonical public origin is resolved
from configuration, normalized complete origins are compared, malformed origins are rejected, and
substring or unsafe suffix matching is never used. Wildcard domains require a separate decision. The
exact trusted-proxy configuration remains open.

## Rate Limiting

Route-specific, layered rate limiting is used across dimensions such as IP, customer, workforce
identity, session, phone number, outlet, provider account, endpoint, and business operation. Strict
policies are required for OTP requests, authentication attempts, address or serviceability lookup,
cart mutation abuse, checkout confirmation, payment initiation, cancellation, refund requests,
provider webhook failures, administrative export, and support messaging. Because V1 has no Redis, per
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#explicitly-deferred-capabilities),
authoritative sensitive-operation counters use shared PostgreSQL persistence, following the same
shared-idempotency-table pattern fixed by
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#shared-idempotency-persistence);
process-local limiting may be an additional layer only. Rate-limited responses return
`429 Too Many Requests` with `Retry-After: <value>` and never expose sensitive thresholds. Exact
algorithms, thresholds, windows, retention, and failure behaviour remain open.

## Idempotency

`Idempotency-Key` is used for effectful mutations: checkout confirmation, payment-session creation,
refund request, order acceptance, order rejection, delivery handoff, delivery booking, manual
delivery completion, and provider-configuration mutation. Server scope includes authenticated actor
or service, use case or operation, key hash, and request fingerprint.
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#shared-idempotency-persistence)'s
PostgreSQL idempotency records and uniqueness constraints remain authoritative.

Same key and same fingerprint returns the original result without repeating the business effect,
preserving the original resource reference and status where practical; an optional
`Idempotency-Replayed: true` response header may indicate replay. Same key with a different
fingerprint returns `409 Conflict`. Provider webhooks use provider-event identities rather than
customer idempotency headers, per
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#provider-event-storage). Exact key
syntax and length remain open.

## Optimistic HTTP Concurrency

Applicable aggregate versions are exposed through `ETag: "7"`, with `If-Match: "7"` required for
concurrency-sensitive mutations. A missing required precondition returns `428`; a stale version
returns `412`; a current version executes the use case. This complements the `version bigint`
optimistic-concurrency column already fixed by
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#optimistic-concurrency). ETags are
not authorization credentials. Exact endpoint coverage remains open.

## Pagination

Opaque cursor pagination is used for unbounded or changing lists: customer order history, operations
queues, audit history, payment attempts, refund history, delivery events, and support conversations.

```text
GET /api/v1/customer/orders?limit=20&cursor=<opaque>
```

```json
{ "data": [], "page": { "nextCursor": "opaque-value", "hasMore": true }, "meta": { "requestId": "..." } }
```

Cursors are opaque, tamper-evident, versioned, bound to sort, bound to relevant filters, free from
sensitive information, and deterministic. Every query requires a stable unique sort, such as
`created_at DESC, id DESC`. Offset pagination is allowed only for bounded, low-change cases after
review. Exact page sizes remain open.

### Filtering and Sorting

Every list endpoint explicitly declares allowed filters, allowed sort values, default sort, maximum
page size, and cursor compatibility. Unknown filters are rejected. Arbitrary SQL filters, arbitrary
column sort, generic relation inclusion, and generic query languages are never exposed. Filter and
sort names are public API contracts.

## Caching

Authenticated APIs (cart, checkout, orders, payments, refunds, delivery, operations, administration)
generally use `Cache-Control: private, no-store`. Public catalog endpoints may use explicit caching
only when the data is public, no customer state is included, invalidation is defined, staleness is
acceptable, and pricing and availability freshness requirements are satisfied — consistent with
current Next.js Route Handler behaviour, where `GET` handlers are dynamic (not cached) by default
unless an explicit `revalidate` segment configuration opts into caching. Provider webhooks are never
cached. Authentication, authorization, and sensitive error responses are never cached. Exact public
catalog caching and revalidation remain open.

## Typed Client API

Client Components use an endpoint-specific typed first-party client supporting base URL, JSON
serialization, CSRF header, idempotency key, `If-Match`, request ID, standard success responses,
Problem Details parsing, `AbortSignal`, and safe retry classification, using functions such as
`addCartItem()`, `confirmCheckout()`, `requestOrderCancellation()`, `acceptOrder()`, and
`markOrderReady()` rather than one unrestricted generic fetch abstraction that hides endpoint
semantics. Exact browser query/cache library remains open.

### Client Retry Policy

Mutations are not blindly retried. Mutation retry requires the operation to be safely idempotent, the
same idempotency key to be retained, the failure to be transient, the request to remain valid,
customer confirmation to remain valid, and retry policy to allow it. Validation errors, authorization
errors, version conflicts, idempotency fingerprint conflicts, and invalid state transitions are never
automatically retried. Safe `GET` requests may use bounded retry.

## Request and Trace Context

A BOBA Bear request ID is generated for every inbound request and returned as
`X-Request-Id: <opaque-id>`; a client-supplied value is never trusted as the authoritative request
ID. Request context may include request ID, trace context, actor, session, correlation ID, IP
context, user agent, locale, origin, start time, idempotency key, and environment. W3C Trace Context,
including `traceparent`, is supported per the W3C Trace Context recommendation, which defines
`traceparent` as `version-trace_id-parent_id-trace_flags` and requires that a valid inbound header be
propagated and an invalid or absent header cause a new trace to be started. Inbound trace headers are
validated; new context is generated when invalid or absent; approved trace context propagates to
provider calls; correlation and causation IDs carry into outbox events fixed by
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#transactional-outbox-persistence); no
PII is placed in trace baggage. Exact observability SDK remains open.

### Safe Request Logging

Structured fields such as request ID, trace ID, route template, method, status, duration, actor
type, authorized scope where appropriate, stable error code, idempotency replay, and rate-limit
outcome are logged. Session cookies, authorization headers, CSRF tokens, OTPs, payment credentials,
full request bodies, full addresses, webhook secrets, raw sensitive provider payloads, and complete
unmasked phone numbers are never logged, consistent with the payment-data-minimization principle
already fixed by
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#payment-data-minimization).

## Provider Webhook Boundary

Provider webhook handlers enforce a provider-specific request-size policy; preserve the raw body
where required; resolve provider account and environment; verify signature or authenticity; validate
timestamp and replay controls; persist the event durably; deduplicate the event; return prompt
provider acknowledgment; and process business effects asynchronously where appropriate. They do not
use customer CSRF tokens, customer sessions, browser CORS, or generic customer rate limits. They
still use request IDs, safe logging, metrics, provider-specific limits, provider-event idempotency,
and environment separation. This restates, at the HTTP boundary, the durable provider-event and
webhook-idempotency architecture already fixed by
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#durable-provider-event-record),
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#provider-callbacks-and-webhooks), and
[ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md#whatsapp-webhooks).

## Media Handling

Large media is not accepted through ordinary JSON business endpoints. The future approved flow is:
client requests upload authorization → server validates purpose and metadata → client uploads to
DigitalOcean Spaces, per [ADR-001](./ADR-001-digitalocean-platform.md) → completion reference is
submitted → server validates the stored object. Upload authorization is short-lived, purpose-scoped,
size-limited, content-type-limited, and customer- or workforce-scoped. Exact upload, scanning,
retention, and validation mechanisms remain open.

## Health Endpoints

`GET /health/live` confirms the process is running and must not perform expensive dependency checks.
`GET /health/ready` may check required configuration, database connectivity, migration
compatibility, and critical process readiness, using bounded timeouts, never exposing credentials or
topology, and never returning raw database errors. Infrastructure may stop routing new traffic when
readiness fails; web and worker readiness may differ. Exact response bodies remain open.

## Contract Documentation

All `/api/v1` endpoints require documented contracts. Zod schemas are one source for request
validation; public response DTOs remain explicit; domain models remain separate from API schemas,
consistent with the DTO-and-API-boundary principle already fixed by
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#dto-and-api-boundaries);
OpenAPI-compatible documentation will be introduced later, potentially building on Zod 4's built-in
JSON Schema conversion; not every transformed Zod schema can be assumed exportable automatically;
contract validation belongs in CI after tooling is selected. Exact OpenAPI version and generation
library remain open.

## Security Headers

Security headers are configured centrally where applicable, including `X-Content-Type-Options:
nosniff`, cache restrictions, referrer policy, framing restrictions, and Content Security Policy for
rendered pages. Exact CSP and complete browser-hardening configuration remain for a future
security-hardening slice.

## Required Future Tests

Future test coverage must address:

- **Route contracts** — methods, status codes, success envelope, Problem Details, content type,
  request ID, cache headers, unsupported methods.
- **Validation** — malformed JSON, unsupported content type, unknown fields, invalid
  path/query/header/body, oversized body, oversized arrays, unsafe integers, invalid timestamps, safe
  field-error mapping.
- **Authentication and authorization** — anonymous protected request, cross-customer access,
  cross-outlet access, suspended membership, revoked session, invalid provider authenticity.
- **CSRF and CORS** — missing CSRF token, invalid token, wrong origin, cross-origin request,
  provider webhook exemption, no wildcard credentialed CORS.
- **Idempotency** — same key and same body, same key and different body, concurrent duplicates,
  original result replay, no duplicate effects.
- **Concurrency** — missing `If-Match`, stale `If-Match`, current `If-Match`, concurrent cart
  update, concurrent order acceptance.
- **Pagination** — stable ordering, cursor tampering, filter mismatch, duplicate sort values,
  intervening archival, maximum page size.
- **Error safety** — no stack trace, no SQL details, no provider secrets, no sensitive value echo,
  stable error code, request ID present.
- **Client/server boundary** — Server Component avoids loopback HTTP, Client Component uses the
  versioned API, server query applies authorization, sensitive data is not serialized to browser
  props.

## Consequences

### Positive

- One fixed HTTP boundary lets Checkout, Payments, Operations, Delivery, and Notifications expose
  consistent, versioned contracts to the PWA, WhatsApp-adjacent tooling, and future native clients
  without renegotiating conventions per endpoint.
- Thin Route Handlers keep business rules inside application use cases, testable independently of
  the HTTP framework, consistent with [ADR-003](./ADR-003-modular-monolith-node-typescript.md).
- A single error contract, success envelope, and central error mapper prevent ad hoc, inconsistent
  failure shapes from leaking internal detail across dozens of endpoints.
- Fixing CSRF, CORS, idempotency, and concurrency conventions before endpoints are built prevents a
  security or correctness gap from being discovered per-endpoint, after the fact.

### Trade-offs Accepted

- Every endpoint must implement the shared envelope, Problem Details, CSRF, and idempotency
  conventions even where an endpoint's own risk might seem to justify a shortcut.
- Provider-neutral webhook handling requires more upfront structure (durable events, dedup,
  provider-specific authenticity) than a minimal signature check would.
- Deferring exact thresholds, encodings, and tooling to implementation time means some of this ADR's
  guarantees (rate-limit thresholds, cursor encoding, CSP) are not yet enforceable until those
  follow-on decisions are made.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| A Route Handler accretes business logic over time | Thin-handler rules and layer boundaries fixed here and in [ADR-003](./ADR-003-modular-monolith-node-typescript.md); architecture tests remain open tooling |
| A Server Component makes a loopback HTTP call out of habit from other frameworks | Explicitly rejected pattern recorded in this ADR; Server Components call application query services directly |
| CSRF or CORS misconfiguration exposes cookie-authenticated mutation endpoints | Synchronizer-token requirement, same-origin-by-default CORS, and required security review before any cross-origin allowlist change |
| A retried or duplicated client request produces a duplicate business effect | Mandatory `Idempotency-Key` for effectful mutations, backed by the PostgreSQL shared idempotency store fixed by ADR-013 |
| A stale client overwrites newer state on a concurrency-sensitive resource | Mandatory `ETag`/`If-Match` for concurrency-sensitive mutations, backed by the `version` column fixed by ADR-013 |
| An error response leaks stack traces, SQL, or provider secrets | Central error mapper, RFC 9457 Problem Details, and stable error codes required for every endpoint |

## Explicit Non-Decisions

This decision does not resolve the following, which remain **Open** and must not be treated as
answered by this ADR:

- Exact Zod version beyond "Zod 4"
- Exact Route Handler helper APIs
- Exact Better Auth catch-all route
- Exact Problem Details URI host
- Exact CSRF token implementation (synchronizer-token mechanics)
- Exact trusted-proxy configuration
- Exact rate-limit algorithms, thresholds, windows, and failure behaviour
- Exact rate-limit storage schema
- Exact request-size limits
- Exact idempotency-key syntax and length
- Exact endpoints requiring `If-Match`
- Exact cursor encoding
- Default and maximum page sizes
- Exact public catalog caching and revalidation
- Exact client-side query/cache library
- Exact client retry policy values
- Exact observability SDK
- Exact OpenAPI version and generation tooling
- Exact security-header and CSP configuration
- Exact upload and scanning mechanism
- Exact health-endpoint response shape
- Exact API deprecation and sunset policy
- Native-client authentication

## Rejected or Deferred Alternatives

- **New Pages Router API Routes** — rejected; Route Handlers under the App Router are the sole
  canonical HTTP boundary for new BOBA Bear APIs.
- **Business logic in Route Handlers** — rejected; business rules live in application use cases and
  domain code, per [ADR-003](./ADR-003-modular-monolith-node-typescript.md).
- **Server-side loopback HTTP** (a Server Component calling its own `/api` endpoint) — rejected;
  Server Components call authorized application query services directly.
- **Server Actions as the only core API** — rejected for V1 core workflows (cart, checkout, payment,
  order acceptance, cancellation, refund, delivery handoff, provider configuration); may be
  considered later for narrow, non-core, progressive-enhancement flows only.
- **Unversioned core APIs** — rejected; every core endpoint is versioned under `/api/v1`.
- **HTTP `200` error responses** — rejected; errors always use a non-2xx status with RFC 9457
  Problem Details.
- **Custom ad hoc error shapes** — rejected in favor of RFC 9457 Problem Details with stable BOBA
  Bear extension members.
- **Wildcard credentialed CORS** — rejected; CORS is disabled by default and any future cross-origin
  access requires an explicit allowlist and security review.
- **`SameSite`-cookie-only CSRF defence** — rejected as the sole control; `SameSite` and origin
  checks are defence in depth alongside a required synchronizer token, per OWASP guidance.
- **Process-local-only sensitive rate limits** — rejected as the sole mechanism for sensitive
  operations; authoritative counters use shared PostgreSQL persistence per
  [ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md).
- **Arbitrary filters or SQL-driven sorting exposed to clients** — rejected; list endpoints declare
  an explicit, closed set of filters and sort values.
- **Blind mutation retries** — rejected; retry requires safe idempotency, an unchanged idempotency
  key, transient failure, and continued request and confirmation validity.
- **Large media through ordinary JSON endpoints** — rejected; media uses a separate
  upload-authorization flow against DigitalOcean Spaces.
- **A public third-party developer API** — deferred.
- **GraphQL, tRPC (as the canonical API), and gRPC** — deferred.
- **Native mobile authentication** — deferred.

## Explicitly Deferred Capabilities

Consistent with the rejections above, the following remain deferred and out of scope for V1: a
public third-party developer API, OAuth client-credentials issuance, native mobile authentication,
GraphQL, tRPC as the canonical API, gRPC, cross-origin customer-frontend support, Server Actions for
core workflows, a generic API gateway, external WAF selection, Redis-backed rate limiting, WebSocket
protocol support, SSE protocol support, automatic SDK generation, a developer portal, a bulk export
API, and a general-purpose query language.

## Cross-Reference: Prior ADRs

This ADR fixes the HTTP boundary that several prior ADRs assumed without specifying. Cookie-
authenticated cart and checkout mutations fixed by
[ADR-008](./ADR-008-serviceability-cart-checkout.md) now carry the CSRF, `Idempotency-Key`, and
`ETag`/`If-Match` conventions fixed here. Cashfree webhook ingestion fixed by
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#webhook-signature-verification-and-acceptance),
delivery-provider callbacks fixed by
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#provider-callbacks-and-webhooks), and
WhatsApp webhooks fixed by
[ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md#whatsapp-webhooks) all sit behind the
`/api/integrations/*` namespace and provider-webhook boundary fixed here, rather than behind customer
sessions or CSRF tokens. Operational commands fixed by
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#operational-command-model) carry their
expected version, idempotency key, actor, and reason through the `Idempotency-Key` and `If-Match`
conventions fixed here. The PostgreSQL-backed shared idempotency store, transactional outbox, and
optimistic-concurrency column fixed by
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md) are the persistence layer this
ADR's `Idempotency-Key` and `ETag`/`If-Match` contracts are built on.

## Related Canonical Documents

- [`architecture-foundation.md`](../architecture-foundation.md) — the modular-monolith principle,
  thin-Route-Handler rule, and module boundaries this decision implements in detail at the HTTP
  layer.
- [ADR-003](./ADR-003-modular-monolith-node-typescript.md) — the module boundaries, dependency
  rules, DTO/API boundary, and open API-style/versioning and Server-Action-policy questions this ADR
  resolves.
- [ADR-005](./ADR-005-organization-outlet-authorization.md) — the scoped, permission-based
  authorization model this ADR's actor-and-authentication-context section restates at the HTTP
  boundary.
- [ADR-008](./ADR-008-serviceability-cart-checkout.md) — the cart optimistic-concurrency,
  idempotent-mutation, and checkout-idempotency decision this ADR's `Idempotency-Key` and
  `ETag`/`If-Match` contracts expose over HTTP.
- [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md) — the durable provider-event and
  webhook-idempotency decision this ADR's provider-webhook boundary applies to Cashfree specifically.
- [ADR-010](./ADR-010-order-lifecycle-operations-console.md) — the operational-command,
  optimistic-concurrency, and idempotent-replay decision this ADR's `Idempotency-Key` and
  `ETag`/`If-Match` contracts expose over HTTP for the Operations Console.
- [ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md) — the delivery-provider callback
  decision this ADR's provider-webhook boundary applies to delivery providers specifically.
- [ADR-012](./ADR-012-notifications-whatsapp-assisted-commerce.md) — the WhatsApp webhook decision
  this ADR's provider-webhook boundary applies to Meta specifically.
- [ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md) — the PostgreSQL-backed
  transactional outbox, shared idempotency store, and optimistic-concurrency column this ADR's
  `Idempotency-Key`, `ETag`/`If-Match`, and rate-limiting contracts are built on.
- [ADR-015](./ADR-015-configuration-secrets-feature-flags.md) — the configuration and secrets
  decision that fixes what `/health/live` and `/health/ready` actually validate, and the shared
  startup bootstrap, invoked through Next.js `instrumentation.ts`, that runs before either endpoint
  can report a ready process.
- [`v1-product-scope.md`](../v1-product-scope.md) — the V1 customer and operations experience this
  HTTP boundary must support.
- [`roadmap-and-open-decisions.md`](../roadmap-and-open-decisions.md) — the open decisions this ADR
  does not resolve.
- [`decision-register.md`](../decision-register.md) — the structured register entries this ADR
  locks.
- [`README.md`](../README.md) — the canonical documentation index and update protocol.
