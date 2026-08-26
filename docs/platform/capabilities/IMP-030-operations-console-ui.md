<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-030",
  "title": "Operations Console UI",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "AUTHORIZED / NOT_STARTED",
  "implementationAuthorized": true,
  "lastReviewed": "2026-08-26",
  "bindingDecisions": ["D-372"],
  "dependsOn": ["IMP-029"]
}
-->

# IMP-030 — Operations Console UI

## Capability Architecture (ARCHITECTURE_LOCKED)

This architecture locks a browser-based workforce Operations Console over the accepted IMP-029
Operations Console API. It provides only Order list/search/filter, Order detail, and ACCEPT,
FULFIL, and CANCEL interactions. The Operations API remains the sole workforce-business boundary;
this UI owns presentation and interaction only.

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Implementation | `AUTHORIZED` / `NOT_STARTED` |
| Implementation authorized | **YES** |
| Depends on | IMP-029 — Operations Console API |
| Binding decision | D-372 — CURRENT |

## 1. Routes and Next.js boundary

The UI routes are `/workforce/operations/` and `/workforce/operations/orders/{orderId}/`, continuing
the established `/workforce/login/` namespace. No `/admin`, `/console`, Next-owned `/api` route,
dynamic Route Handler, or Server Action business authority is created.

Implementation is static Next App Router page shells plus client-side Operations feature components.
Reads and mutations use browser fetch; SSR business reads, dynamic Next execution, Route Handler
proxies, Server Action mutation authority, and Next API routes are excluded. `output: export`
remains binding unless later architecture supersedes it.

## 2. Transport, session, and authority

```text
Browser
  ↓ same-origin, credentials: "same-origin"
/api/operations/v1/*
  ↓ existing Nginx routing
Operations runtime
```

There is no browser secret, service credential, new token, CORS expansion, cookie expansion, Nginx,
Compose, runtime, workforce-auth, or environment change. POST requests naturally retain browser
Origin for the existing trusted-Origin check.

Better Auth remains the workforce session authority through `boba-workforce.session_token`. The UI
must not read, synthesize, persist, transform, or become authoritative for session credentials.
The Operations runtime continues to validate sessions and construct trusted identities, principals,
permissions, and scopes. The UI must never send or trust roles, permissions, memberships,
organization/territory/outlet/scope authority, pre-authorized flags, or principal-shaped objects.

## 3. Accepted Operations API dependency

Exactly these five public routes are used:

```text
GET  /api/operations/v1/orders
GET  /api/operations/v1/orders/{orderId}
POST /api/operations/v1/orders/{orderId}/accept
POST /api/operations/v1/orders/{orderId}/fulfil
POST /api/operations/v1/orders/{orderId}/cancel
```

No sixth route, UI-owned Operations endpoint, or IMP-029 extension is authorized.

## 4. List, detail, and freshness

The list supports only server filters `orderNumber`, `status`, `createdFrom`, `createdTo`, `brandId`,
`outletId`, `cursor`, and `limit`. Unknown filters are not simulated as server authority. Sorting is
`createdAt DESC`, then `id DESC`; there is no user-selectable server sort. Pagination is cursor-based
with default limit 20 and maximum 100, using initial first page, Load more, and manual Refresh.
Background polling, realtime, WebSocket, SSE, and reverse pagination are deferred.

List fields are restricted to accepted summary data: order ID/number, status, revision, timestamps,
grand total/currency, and outlet identity/code/name. Customer summary is not invented. Detail renders
only accepted projection fields: identity, lifecycle/timestamps, outlet, destination recipient/contact/
address, line items/variant/quantity/modifiers/totals, grand total/currency, paymentProvenanceKind,
lifecycle actor/time, and cancellation reason. It excludes customer account profile, provider
transactions/tracking, and generic audit timelines.

Initial browser fetch occurs after page load. Cache is component memory only; persistent browser cache
is prohibited. Manual and post-mutation refresh are required; Operations responses remain no-store.
Destination/contact/address is detail-only operationally sensitive data: no browser persistence,
localStorage/sessionStorage, application PII logging, or unsafe HTML rendering; React text rendering
only.

## 5. Mutations, revision, and errors

Mutations are pessimistic and server-confirmed: ACCEPT is `PLACED → ACCEPTED`, FULFIL is
`ACCEPTED → FULFILLED`, and CANCEL is `PLACED|ACCEPTED → CANCELLED`. Each includes the current
`expectedOrderRevision`; CANCEL also includes `cancellationReasonCode` from the exact API contract.
There is no caller idempotency key or automatic blind retry. Only one mutation per Order may be in
flight, and that Order’s lifecycle controls remain disabled while pending.

The server revision is authoritative. On `ORDER_CONFLICT`/stale revision, the UI claims no success,
refetches detail, presents actionable stale-data feedback, and recalculates actions from fresh state.
After success it uses the confirmed result, refetches current detail, and refreshes the first list
page. Network ambiguity requires user-directed recovery/refetch; API-owned natural replay semantics
remain unchanged. Visual lifecycle gating is usability only, never authorization.

Explicit states cover loading, empty/list/detail failure, 401, 403, non-disclosing 404, 409, action
in progress/success/failure, and unexpected network/500 failures. A 401 presents sign-in required
with fixed `/workforce/login/`; no unvalidated return URL is constructed. A 404 must not disclose
whether an Order exists but is inaccessible.

## 6. Accessibility, component boundary, and tests

Minimum accessibility: semantic main and headings, labelled filters, native links/buttons, visible
focus, keyboard-operable controls, accessible confirmation dialog with Escape/focus trap/restoration,
live status announcements, `role=alert` errors, color-independent status, and meaningful mobile
reading order/touch targets. Desktop may use semantically headed tables; mobile uses a linear
list/card representation. No design-system replacement or visual redesign is locked.

Capability-local responsibilities are operations client/adapter, list, detail, lifecycle actions,
status indicator, and loading/empty/error states. The client is browser transport only and must not
import Drizzle, repositories, Order services/mutation authority, principal constructors, or
access-control internals.

Future evidence must cover unit eligibility/filter-cursor/error/pending behavior; component
list/detail/auth/loading/error/conflict/confirmation/focus/live regions; client exact routes,
credentials, request bodies/revisions, safe parsing; Operations authorization/lifecycle/revision/
replay/non-disclosure integration; same-origin Nginx E2E login/list/detail/actions; and keyboard,
focus, labels, dialogs, announcements, and responsive accessibility. DB-backed tests, when needed,
use `DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock` and
`TESTCONTAINERS_RYUK_DISABLED=true`, not Docker Desktop.

## 7. Non-goals and D-372 preservation

Deferred: polling/realtime, custom sorting, reverse pagination, customer list summary, payment or
delivery provider detail/tracking, new Operations actions, refund, financial/statutory documents,
generic audit, delivery/notification/administration management, new lifecycle states, and new public
Operations routes.

```text
IMP-030_IMPLEMENTATION_AUTHORIZED: YES
IMP-030_STARTED: NO
IMP-030_IMPLEMENTATION_COMPLETE: NO
IMP-030_ACCEPTED: NO
AUTHORIZATION IS NOT IMPLEMENTATION START: YES
```

```text
DEDICATED WORKFORCE-BUSINESS TRANSPORT: PRESERVED
SHARED BETTER AUTH SESSION AUTHORITY: PRESERVED
EXISTING ORDER AUTHORITY: PRESERVED
CALLER ROLE AUTHORITY: NONE
CALLER SCOPE AUTHORITY: NONE
HTTP AUTH HOP TO WORKFORCE-AUTH: NONE
TRUSTED ORIGIN: PRESERVED
OPERATIONS PUBLIC ROUTES: EXACT FIVE
DYNAMIC NEXT BUSINESS AUTHORITY: NONE
CORS CHANGE: NONE
COOKIE CHANGE: NONE
D-372: CURRENT / UNCHANGED
ARCH-R17: UNCHANGED
DR-14: UNCHANGED
D-373: NOT_CREATED
GLOBAL ARCHITECTURE CHANGE: NO
GLOBAL DECISION REQUIRED: NO
```

## Open Questions

(none)
