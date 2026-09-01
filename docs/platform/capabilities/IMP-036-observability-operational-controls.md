<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-036",
  "title": "Observability & Operational Controls",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "AUTHORIZED / STARTED / COMPLETE",
  "implementationAuthorized": true,
  "lastReviewed": "2026-09-01",
  "bindingDecisions": ["D-373"],
  "dependsOn": ["IMP-010", "IMP-029", "IMP-033", "IMP-035"]
}
-->

# IMP-036 — Observability & Operational Controls

## Capability Architecture (ARCHITECTURE_LOCKED — IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE)

This document is the locked capability architecture for **IMP-036 — Observability & Operational
Controls**. Architecture authority reuses accepted workforce authentication (**D-372** / IMP-010),
operations transport (**IMP-029**), notification outbox visibility (**IMP-033**), and administration
trust boundaries (**D-373** / IMP-035). Architecture is **LOCKED**. Implementation is
**AUTHORIZED**, **STARTED**, and **COMPLETE** pending independent acceptance.

Provider-neutral structured logging, in-process metrics, readiness checks, and a read-only
operational status API are in scope. No external observability vendor, no new deployable service, no
schema migration, and no new permissions or roles are introduced.

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Lifecycle | `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` |
| Implementation | `AUTHORIZED` / `STARTED` / `COMPLETE` |
| Implementation authorized | **YES** |
| Implementation complete | **YES** |
| Accepted | **NO** |
| Accepted product through | IMP-035 |
| Current product slice | IMP-036 |
| Pending acceptance | IMP-036 |
| Next product slice | IMP-037 — Backup, Restore & Migration Readiness |
| Governance checkpoint | GTM-R94 / STATE-R92 |
| New CURRENT decision | **NONE** (`D-374` not required) |
| Global architecture revision | **NONE** (`ARCH-R19` / **DR-15** unchanged) |
| Founder UAT required for acceptance | **NO** |

```text
IMP-036: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
IMP-036_ARCHITECTURE: LOCKED
IMP-036_ARCHITECTURE_LOCKED: YES
IMP-036_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-036_IMPLEMENTATION_AUTHORIZED: YES
IMP-036_STARTED: YES
IMP-036_IMPLEMENTATION_COMPLETE: YES
IMP-036_ACCEPTED: NO
COMPLETION IS NOT ACCEPTANCE: YES
FOUNDER_UAT_REQUIRED: NO
FOUNDER_UAT_REQUIRED_FOR_ACCEPTANCE: NO
D374_REQUIRED_FOR_LOCK: NO
D-374_CREATED: NO
ARCH_R20_REQUIRED: NO
schema_change: NO
provider_IO: NO
new_service: NO
new_permissions: NO
new_roles: NO
```

## 1. Purpose

IMP-036 delivers provider-neutral observability and operational controls for launch support:

- structured JSON logging with `BOBA_BEAR_LOG_LEVEL`, safe field allowlists, and shared redaction
- server-issued `X-Request-ID` / `X-Correlation-ID` correlation
- in-process request counters (no external metrics vendor)
- enhanced `/health/ready` checks (`database` plus in-process worker health where present)
- read-only `GET /api/operations/v1/operational-status` on the existing operations process

Observability reads operational state; it does **not** become domain authority.

## 2. Locked module placement

```text
src/platform/observability/          Shared logger, metrics, readiness helpers, redaction
src/server/persistence/operational-counts.ts   Read-only queue backlog SELECT COUNT helpers
src/server/operations/http/operational-status-routes.ts   Workforce-gated status API
docs/platform/operations/observability-runbook.md           Launch support runbook
```

## 3. Transport and authorization

- Operational status is hosted only on the existing **operations** Node process (no new service).
- Workforce session is required via `resolveOperationsWorkforcePrincipal`.
- Read access is gated by existing `order.read` permission; no new permission keys.
- Responses and logs must not include secrets, tokens, cookies, or provider credentials.

## 4. Health and worker visibility

| Surface | Behavior |
|---|---|
| `/health/live` | Process liveness only (`ok: true`) |
| `/health/ready` | `{ ok, checks: { database, worker:*? } }`; `503` when a check fails |
| Operational status API | Service name, uptime, metrics snapshot, worker health, queue backlog counts |

Worker health covers in-process processors already hosted in operations / customer-commerce
(notification outbox, payment inbox, refund reconciliation). No new worker topology.

## 5. Explicit non-goals

- External observability vendors (Datadog, Sentry, etc.)
- Kafka / Redis / external queues
- Schema migrations or new RBAC permissions / roles
- Domain-state mutation from observability endpoints

## 6. Implementation evidence

```text
IMP036_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_036_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
```

Formal acceptance remains a separate reconciliation gate. Do not activate IMP-037 from this
completion.
