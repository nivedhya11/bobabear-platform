<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-029",
  "title": "Operations Console API",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "NOT_AUTHORIZED / NOT_STARTED",
  "implementationAuthorized": false,
  "lastReviewed": "2026-08-24",
  "bindingDecisions": ["D-357", "D-358", "D-372"],
  "dependsOn": ["IMP-023"]
}
-->

# IMP-029 — Operations Console API

## Capability Architecture (ARCHITECTURE_LOCKED)

This document is the locked capability architecture for IMP-029 — Operations Console API.

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Implementation | `NOT_AUTHORIZED` / `NOT_STARTED` |
| Implementation authorized | **NO** |
| Accepted product through | IMP-028D |
| Current product slice | IMP-029 |
| Next product slice | IMP-030 — Operations Console UI |
| Binding decision | **D-372** |

This lock does not authorize implementation. It creates no route, process, container, schema,
migration, permission catalog, cookie, deployment, or UI change.

## 1. Objective and scope

IMP-029 introduces the architecture for a workforce Order Operations API: search/list Orders, get
Order detail, and issue ACCEPT, FULFIL, and CANCEL commands. It is a thin transport façade over the
existing Order application/domain authorities: `searchWorkforceOrders`, `getWorkforceOrder`,
`acceptOrder`, `fulfilOrder`, and `cancelOrder`. It does not create a second Order model, lifecycle,
repository, mutation authority, or scope authority.

## 2. Non-goals and deferred domains

IMP-029 V1 excludes Refund transport, Financial Document transport, RefundStatutoryDecision
transport, SignatureArtifact/signing transport, generic workforce-business audit, delivery,
notifications, new administration capabilities, and Operations Console UI. Existing Refund,
Financial Document, RefundStatutoryDecision, and SignatureArtifact authorities under D-364 through
D-367 remain unchanged. IMP-030 owns the Operations Console UI.

## 3. Transport and trust boundary

The dedicated dynamic Node workforce-business façade is `/api/operations/v1/*`. It is distinct from
customer `/api/v1/*` and public workforce authentication `/api/workforce-auth/*`. No dynamic Next.js
Route Handler, Server Action, SSR, or other dynamic Next.js execution becomes business API authority.
Customer and workforce are separately authenticated trust realms even where internal modules are
reused.

The existing workforce cookie is `boba-workforce.session_token`, scoped at `Path=/`; it naturally
reaches `/api/operations/...`. Cookie/session validation remains server-side. For state-changing
requests, implementation must validate trusted Origin and reject cross-site request context
consistent with the existing workforce-auth same-origin protection model. Session evidence and
resource authority are never accepted from request bodies.

## 4. Workforce session and principal construction

The Operations API does not create a second authentication system and need not make an internal HTTP
request to workforce-auth merely to validate an existing workforce session. A shared trusted
server-side adapter is the selected boundary:

```text
HTTP request
  ↓
boba-workforce.session_token
  ↓
shared trusted workforce session resolver
  ↓
server-loaded workforce lifecycle identity
  ↓
eligibility validation
  ↓
createWorkforcePrincipalFromTrustedIdentity(...)
  ↓
existing Order application operation
  ↓
authorize(permission, server-derived resource)
  ↓
existing Order authority
```

Eligibility preserves existing requirements: valid session; workforce user exists; user is not
disabled; password-change requirement is cleared; and MFA/two-factor is enabled. A principal is
constructed only from server-loaded trusted identity. A forged `WorkforcePrincipal`-shaped object,
or caller-supplied role, permission, membership, organization, territory, outlet, scope,
pre-authorized boolean, or other asserted authority, is not trusted.

## 5. Permission and scope authorization

Authorization remains permission-based through existing persisted memberships, role assignments,
role-permission mappings, allowed scopes, server-loaded resource ancestry, and
`authorize()` / `requireAuthorization()`. Role names are never authorization bypasses.

Required permissions are `order.read` for list/detail, `order.accept`, `order.fulfil`, and
`order.cancel` for the corresponding commands. Existing catalog evidence grants outlet_manager all
four permissions and kitchen_operator `order.read`, `order.accept`, and `order.fulfil`, but not
`order.cancel`; those mappings do not bypass permission-plus-trusted-scope authorization.

Collections derive accessible outlets/resources from trusted authorization first; caller filters
may only narrow results. For a specific Order, outlet/resource ancestry is derived from persisted
Order/Checkout/Outlet authority, never caller input. Inaccessible specific resources use
non-disclosing transport behavior consistent with existing error conventions.

## 6. V1 API operations

```text
GET  /api/operations/v1/orders
GET  /api/operations/v1/orders/{orderId}

POST /api/operations/v1/orders/{orderId}/accept
POST /api/operations/v1/orders/{orderId}/fulfil
POST /api/operations/v1/orders/{orderId}/cancel
```

No other operation is locked by IMP-029 V1.

## 7. Order lifecycle, concurrency, replay, and attribution

The existing lifecycle remains authoritative:

```text
PLACED → ACCEPTED → FULFILLED

PLACED → CANCELLED
ACCEPTED → CANCELLED
```

No PREPARING, READY, OUT_FOR_DELIVERY, kitchen-specific, or delivery-specific state is introduced.
Mutating commands require the existing `expectedOrderRevision` semantic precondition. Existing Order
row lock, revision comparison/increment, and stale-revision conflict remain the sole concurrency
authority. Existing natural replay semantics for already-ACCEPTED, already-FULFILLED, and
same-reason cancellation replay remain binding. IMP-029 introduces no caller idempotency-key
contract.

Existing durable lifecycle attribution remains: accepting, fulfilling, and cancelling actors;
corresponding timestamps; and cancellation reason where applicable. Request IDs may remain
transport/log correlation only. A broader generic workforce-business audit authority is deferred.

## 8. Implementation constraints and verification

Future authorized implementation must preserve D-372 and ARCH-G23, reuse the established session,
principal, authorization, scope, and Order authorities, and prove non-disclosing access control,
same-origin protection, revision conflicts, and existing replay/attribution semantics. It must not
add routes for deferred domains or activate IMP-030. This architecture lock is not implementation,
acceptance, or implementation authorization.
