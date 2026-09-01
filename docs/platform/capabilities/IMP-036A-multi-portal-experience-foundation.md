<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-036A",
  "title": "Multi-Portal Experience Foundation",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
  "implementationAuthorized": true,
  "lastReviewed": "2026-09-01",
  "bindingDecisions": ["D-372", "D-373"],
  "dependsOn": ["IMP-030", "IMP-035", "IMP-036"]
}
-->

# IMP-036A — Multi-Portal Experience Foundation

## Capability Architecture (ARCHITECTURE_LOCKED — IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE)

This document is the locked capability architecture for **IMP-036A — Multi-Portal Experience
Foundation**. It separates Customer, Workforce, and Administration presentation shells over the
existing static Next.js export, workforce session authority, RBAC/effective-permission projection,
and accepted Operations/Administration transports.

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Lifecycle | `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` |
| Implementation | `AUTHORIZED` / `STARTED` / `COMPLETE` |
| Implementation authorized | **YES** |
| Implementation complete | **YES** |
| Accepted | **NO** |
| Accepted product through | IMP-036 |
| Current product slice | IMP-036A |
| Pending acceptance | IMP-036A |
| Next product slice | IMP-036B |
| Governance checkpoint | GTM-R97 / STATE-R95 |
| Founder UAT required for acceptance | **YES** |

```text
IMP-036A: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
IMP-036A_ARCHITECTURE: LOCKED
IMP-036A_ARCHITECTURE_LOCKED: YES
IMP-036A_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-036A_IMPLEMENTATION_AUTHORIZED: YES
IMP-036A_STARTED: YES
IMP-036A_IMPLEMENTATION_COMPLETE: YES
IMP-036A_ACCEPTED: NO
FOUNDER_UAT_REQUIRED: YES
FOUNDER_UAT_REQUIRED_FOR_ACCEPTANCE: YES
IMP-036A_FOUNDER_UAT_REQUIRED: YES
schema_change: NO
provider_IO: NO
new_service: NO
new_auth_model: NO
new_roles: NO
new_permissions: NO
microfrontend: NO
IMP036A_IMPLEMENTATION_EVIDENCE: COMPLETE
COMPLETION IS NOT ACCEPTANCE: YES
```

## 1. Purpose

IMP-036A delivers three recognizable application experiences without changing domain authority:

- **Customer** — existing BOBA customer chrome, metadata, and ordering/auth behaviour.
- **Workforce** — enterprise shell, `/workforce/` permission-aware hub, Operations entry.
- **Administration** — distinct enterprise shell around accepted IMP-035 capabilities.

## 2. Preserved authorities

| Authority | Preservation |
|---|---|
| IMP-010 / D-372 | One canonical workforce authentication/session authority |
| IMP-011 / ADR-005 | Effective permissions remain server-authoritative |
| IMP-030 | Operations routes and API boundary unchanged |
| IMP-035 / D-373 | Administration transport and business authority unchanged |
| Static export | `output: "export"`, `trailingSlash: true` preserved |

## 3. Locked module placement

```text
src/app/layout.tsx                         Minimal root HTML/fonts only
src/app/(customer)/layout.tsx              Customer chrome + SEO metadata
src/app/workforce/(portal)/layout.tsx      Workforce enterprise shell
src/app/workforce/(portal)/page.tsx        Permission-aware workforce hub
src/app/workforce/(administration)/layout.tsx Administration enterprise shell
src/components/enterprise/                 Shared enterprise primitives
src/components/workforce/                    Workforce shell + hub client
src/components/administration/AdministrationAppShell.tsx
src/lib/workforce-hub/destinations.ts      Permission-driven destination registry
src/server/administration/use-cases.ts     Portal session projection (+ order.read)
```

## 4. Route and shell contract

| Surface | Prefix | Shell |
|---|---|---|
| Customer | `/`, `/login/`, `/order/*`, `/privacy/`, `/dev/*` | Ticker + Nav + Footer + restaurant SEO |
| Workforce hub/login/operations | `/workforce/`, `/workforce/login/`, `/workforce/operations/*` | Workforce enterprise shell |
| Administration | `/workforce/admin/*` | Administration enterprise shell |

Customer chrome, ticker, footer, and restaurant/customer SEO metadata must not render on workforce
or administration routes.

## 5. Workforce hub navigation authority

- Hub destination visibility is derived from effective permission projection, not role names.
- Implemented destinations only:
  - **Operations** when `order.read` is effective.
  - **Administration** when any administration entry permission is effective.
- Future IMP-036D/E/F/G destinations must not appear until implemented.
- Successful workforce authentication resolves to `/workforce/` or a single authorized destination.
- UI visibility is convenience only; direct URLs and APIs remain independently authorized.

## 6. Portal session projection

`/api/admin/v1/session` continues as the workforce portal session transport. The session projection
adds `order.read` to the returned capability map for hub navigation. No new permission catalog
entries are created.

## 7. Explicit non-goals

| Deferred | Owner |
|---|---|
| Customer commerce V2 redesign | IMP-036C |
| Store/commercial management shells | IMP-036E / IMP-036F |
| Administration console V2 | IMP-036G |
| New auth model / roles / permissions | Out of scope |
| Micro-frontends / new deployable services | Out of scope |

## 8. Acceptance evidence targets

- Customer pages retain customer-only presentation.
- Workforce/admin pages exclude customer chrome and customer SEO metadata.
- Workforce login uses workforce presentation and redirects to hub/default destination.
- Hub exposes only authorized, implemented destinations.
- Lower-authority principals do not receive unauthorized Administration navigation.
- Static export/build succeeds.
- Founder UAT required before `COMPLETE_AND_ACCEPTED`.

## 9. Founder UAT correction — cross-application navigation and foundation UX

IMP-036A owns coherent switching among real authorized applications. `WORKFORCE_DESTINATIONS` is the
canonical presentation registry. Current real applications are Operations and Administration only.

- Workforce hub `/workforce/` is the application chooser when a principal has more than one authorized
  destination.
- Neutral login (no `returnTo`): 0 destinations → `/workforce/` empty/no-access state; 1 destination →
  that destination; 2+ destinations → `/workforce/`.
- Explicit safe `returnTo` may return the user to that route after server-side authorization; shell
  navigation must still allow switching to other authorized applications.
- Administration shell must permanently expose Applications and Operations (when `order.read` is
  effective) in primary navigation. Do not rely solely on a TopBar secondary action.
- Operations/workforce shell exposes Administration only when an administration entry permission is
  effective.
- Direct URL/API authorization remains authoritative. Destination visibility is permission-derived,
  not role-name hard-coding.
- Human-facing shells must not present opaque `workforceUserId` as primary identity. Prefer the
  authenticated user's email from the existing workforce-auth user row as `signedInLabel`, or a
  neutral “Signed in” treatment.
- Administration chrome uses scope-neutral language (“Access & organization”), not an implication of
  platform-wide authority for every administrator.
- Customer GA Analytics belongs only on the customer surface. Workforce/admin layouts must not inherit
  it from the root layout.
- Session/capability service failure must surface as retryable error, not as empty capabilities or
  “you do not have access”.
- Mobile side navigation must have a complete baseline keyboard/focus relationship (open/close,
  Escape, backdrop, focus return, unique desktop vs mobile nav ids).

`outlet_manager` retains canonical outlet-scoped access permissions. Kitchen `outlet.read` may also
qualify Administration entry; that is permission projection, not a RBAC change.

This correction does not accept IMP-036A, activate IMP-036B, or implement IMP-036D–G.
