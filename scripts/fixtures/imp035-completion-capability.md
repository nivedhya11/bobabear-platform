<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-035",
  "title": "Initial Administration Capabilities",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "AUTHORIZED / STARTED / COMPLETE",
  "implementationAuthorized": true,
  "lastReviewed": "2026-09-01",
  "bindingDecisions": ["ADR-005", "D-358", "D-372", "D-373"],
  "dependsOn": ["IMP-011", "IMP-010", "IMP-029", "IMP-030"]
}
-->

# IMP-035 — Initial Administration Capabilities

## Capability Architecture (ARCHITECTURE_LOCKED — IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE)

This document is the locked capability architecture for **IMP-035 — Initial Administration
Capabilities**. Architecture authority derives from accepted
[ADR-005](../decisions/ADR-005-organization-outlet-authorization.md), **D-358**, **D-372**, and
binding **D-373**. Architecture is **LOCKED**. Implementation is **AUTHORIZED**, **STARTED**, and
**COMPLETE**. Formal acceptance is **not** claimed.

Completion is **not** acceptance. Founder UAT is **required** before `COMPLETE_AND_ACCEPTED`.
This gate does **not** authorize or start IMP-036, invent custom roles, or redesign access control.

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Lifecycle | `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` |
| Implementation | `AUTHORIZED` / `STARTED` / `COMPLETE` |
| Implementation authorized | **YES** |
| Implementation complete | **YES** |
| Accepted | **NO** |
| Accepted product through | IMP-034 |
| Current product slice | IMP-035 |
| Pending acceptance | IMP-035 |
| Next product slice | IMP-036 — Observability & Operational Controls |
| Governance checkpoint | GTM-R92 / STATE-R90 |
| Binding decision | **D-373** |
| Global architecture revision | **ARCH-R19** / **ARCH-G25** |
| Decision register | **DR-15** |
| Founder UAT required for acceptance | **YES** |

```text
IMP-035: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
IMP-035_ARCHITECTURE: LOCKED
IMP-035_ARCHITECTURE_LOCKED: YES
IMP-035_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-035_IMPLEMENTATION_AUTHORIZED: YES
IMP-035_STARTED: YES
IMP-035_IMPLEMENTATION_COMPLETE: YES
IMP-035_ACCEPTED: NO
FOUNDER_UAT_REQUIRED: YES
FOUNDER_UAT_REQUIRED_FOR_ACCEPTANCE: YES
IMP-035_FOUNDER_UAT_REQUIRED: YES
IMP-035_FOUNDER_UAT: NOT_CLAIMED
D373_REQUIRED_FOR_LOCK: YES
D-373_CREATED: YES
ARCH_R19_REQUIRED: YES
schema_change: NO
provider_IO: NO
new_service: NO
new_permissions: NO
new_roles: NO
COMPLETION_IS_NOT_ACCEPTANCE: YES
```

## 1. Purpose

IMP-035 delivers the first usable workforce administration surface over **existing** Access Control
and Organization authorities (IMP-011), workforce session/principal (IMP-010 / D-372), and the
static workforce UI pattern (IMP-030). It does **not** redesign RBAC, invent a second auth model,
or create a new deployable service.

## 2. Preserved authorities

| Authority | Preservation |
|---|---|
| ADR-005 / IMP-011 | Permission catalog, roles, memberships, role assignments, authorize(), audit write |
| D-358 | Seven system roles; role inventory remains STATE/code |
| D-372 | Trusted workforce session → principal; Origin mutation protection; no caller-forged authority |
| D-373 | Dedicated `/api/admin/v1/*` admin transport on existing operations process |
| ARCH-G08 / ARCH-G23 / ARCH-G25 | Scope forgery prohibition; workforce transport separation |
| IMP-030 | Static export UI shells; same-origin fetch; robots noindex |

## 3. Locked module placement

```text
src/server/administration/                 Authorized admin use-cases (thin orchestration)
src/server/access-control/                 Existing mutations + new authorized list/read helpers
src/server/organization/                   Existing resource commands (authorized by admin layer)
src/server/operations/http/admin-*.ts      Thin /api/admin/v1/* transport on operations process
docker/nginx/nginx.conf                    Proxy /api/admin/v1/ → operations:8084
src/app/workforce/admin/                   Static export admin UI shells
src/components/administration/             Client UI
src/lib/administration/                    Same-origin admin HTTP client
```

## 4. Transport and trust boundary (D-373)

```text
Static Next.js export → Nginx
  /api/admin/v1/*  → operations:8084  (same process as /api/operations/v1/*; no new service)
```

- Distinct from customer `/api/v1/*` and public `/api/workforce-auth/*`.
- Reuses `boba-workforce.session_token` and `resolveOperationsWorkforcePrincipal`.
- Mutations require trusted Origin / reject cross-site (same model as operations).
- Request bodies never forge actor, permission, role, membership, or scope authority.
- Collections authorize first; caller filters may only narrow within authorized scope.

## 5. V1 product surface (minimum coherent)

### Resources (hierarchy)

List / get / create / update for brand, organization, territory, legal entity, outlet using existing
Organization commands after `brand.*` / `organization.*` / `territory.*` / `legal_entity.*` /
`outlet.*` permission checks. Soft lifecycle only (`active`/`inactive`). No destructive delete
unless already explicitly canonical (not in V1).

### Memberships

Create membership; list/filter; transition lifecycle (`invited|active|suspended|revoked|expired`)
via existing `createMembership` / `transitionMembership` with `access.membership.*`.

### Role assignments

List assignments for a membership; grant; revoke via existing `grantRole` / `revokeRole` with
`access.role_assignment.*`. Delegation ceiling and self-elevation denial remain domain-enforced.

### Effective permissions

Project `getEffectivePermissions` for a server-derived resource after
`access.effective_permissions.read`.

### Audit

Read append-only `access_control_audit_events` after `access.audit.read` with scope filtering.
Write path remains existing `insertAccessAuditEvent` only.

### UI

Workforce routes under `/workforce/admin/` (hub, resources, memberships, membership detail, audit)
with permission-gated controls and clear unauthorized/error states. UI hiding is convenience only.

## 6. Explicit non-goals / deferrals

| Deferred | Owner |
|---|---|
| Custom roles / permission-editor UI / arbitrary permission grants | Not authorized |
| New auth/session/tenancy model | Not authorized |
| Customer-account administration | Deferred |
| Meta/provider credential administration / secrets console | Deferred / IMP-038 adjacency |
| Observability & operational controls | IMP-036 |
| Security & privacy hardening beyond admin authz invariants | IMP-038 |
| Catalog/menu/pricing/promotions admin screens | Later / not this slice |
| New deployable service | Prohibited (`new_service: NO`) |
| New permissions or roles | Prohibited (`new_permissions: NO`, `new_roles: NO`) |
| Schema migration | Not required (`schema_change: NO`) |

## 7. Security invariants

1. Every admin read/mutation uses server-derived session/principal + permission + trusted resource scope.
2. Lower-scope administrators cannot administer outside effective scope.
3. Role grant cannot escalate beyond actor's authorized administrative ceiling (existing domain).
4. Same-origin/CSRF Origin checks on mutations.
5. Server authorization is authoritative; UI gating is not.

## 8. Testing (locked evidence)

Focused tests must cover at least: unauthorized access; cross-scope denial; body/scope forgery
denial; membership lifecycle authorization; role grant/revoke authorization; privilege-escalation
prevention; effective-permission projection; audit access; same-origin mutation enforcement; UI
permission gating/error handling. Plus typecheck, lint, build, project consistency, governance
fingerprint, and `git diff --check`.

## 9. Founder UAT

```text
IMP-035_FOUNDER_UAT_REQUIRED: YES
IMP-035_FOUNDER_UAT: NOT_CLAIMED
```

Founder UAT must exercise the exact merged candidate (path, branch, HEAD, working-tree fingerprint)
on the local Compose/Podman deployment. Agents must not self-declare UAT PASS.

## 10. Acceptance posture

```text
IMP035_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_035_INDEPENDENT_IMPLEMENTATION_REVIEW: NOT_CLAIMED
IMP035_INDEPENDENT_ACCEPTANCE_EVIDENCE: NOT_CLAIMED
IMP035_FORMAL_ACCEPTANCE: NOT_CLAIMED
COMPLETION_IS_NOT_ACCEPTANCE: YES
```

Formal acceptance requires independent technical acceptance **and** Founder UAT PASS, then a
separate reconciliation gate. Do not activate IMP-036 from this completion.
