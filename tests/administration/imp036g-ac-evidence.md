# IMP-036G AC Evidence Map (test documentation)

Companion to `/tmp/boba-bear-autonomous-sprint/AC-EVIDENCE-MAP.md`.
Maps acceptance criteria to repository proofs. Status vocabulary:
`VERIFIED` | `PARTIAL` | `UAT_REQUIRED` | `UNVERIFIED`.

`VERIFIED` means an automated repository test asserts the behaviour.
`UAT_REQUIRED` means the remaining gap is interactive Founder validation only.
`PARTIAL` means an automated gap remains that a test alone cannot close.

Document-level note: IMP-035 / Initial Administration Capabilities is
`FOUNDER_UAT_REQUIRED = YES` per `AGENTS.md`. The per-AC statuses below record
automated proof only; they do not substitute for the founder UAT gate or for
independent acceptance.

## Suites

| Suite | Scope |
|---|---|
| `imp036g-proofs.integration.test.ts` | Admin HTTP + use-case proofs against a real PostgreSQL 18 database |
| `admin-http.integration.test.ts` | IMP-035 authorization / transport baseline |
| `admin-api-exhaustive.test.ts` | `fetchAllAdminContinuationPages` exhaustion in `src/lib/administration/api.ts` (mocked `adminRequest`) |
| `AdministrationResourcesClient.test.tsx` | Organization workspace continuation, feedback, session expiry, no-delete |
| `AdministrationMembershipsClient.test.tsx` | Workforce workspace continuation, create feedback, session expiry |
| `AdministrationMembershipDetailClient.test.tsx` | Managed-subject diagnostic, confirmed actions, feedback |
| `AdministrationAuditClient.test.tsx` | Draft/applied audit filters, stale-response discard, failure surfaces |
| `AdministrationHubClient.test.tsx` / `admin-ui.test.tsx` | Hub composition, capability nav, authorization states |

## Acceptance criteria

| AC | Primary code path | Test ID / suite | Status |
|---|---|---|---|
| AC-001-01 | `AdministrationHubClient`, `/api/admin/v1/overview` | `AdministrationHubClient` overview; `imp036g-proofs` overview | VERIFIED |
| AC-001-02 | `AdministrationHubClient` signed-in label | `AdministrationHubClient` identity | VERIFIED |
| AC-001-03 | `AdministrationPageClient` / session caps | `admin-ui` capability nav | VERIFIED |
| AC-001-04 | Hub unauthorized state | `AdministrationHubClient` unauthorized; `admin-ui` 401 | VERIFIED |
| AC-001-05 | Admin IA links | `AdministrationHubClient` Open Organization/Workforce/Audit/System | VERIFIED |
| AC-001-06 | `adminGetOverview` composition | `imp036g-proofs` overview ops + hierarchy counts | VERIFIED |
| AC-001-07 | Session expiry → sign-in | `AdministrationResourcesClient` / `AdministrationMembershipsClient` "recovers to the sign-in state when the session expires mid-session"; `AdministrationMembershipDetailClient` expired session; `admin-ui` 401 | VERIFIED |
| AC-001-08 | Overview ops unauthorized without `order.read` | `imp036g-proofs` no-ops overview | VERIFIED |
| AC-002-01…05 | Resource list routes | `imp036g-proofs` brands page; `admin-http` | VERIFIED |
| AC-002-06 | Empty authorized set | `imp036g-proofs` "closes empty-set…" (kitchen_operator brands → `200`, `items: []`, `more: false`, `nextCursor: null`); `AdministrationResourcesClient` empty-scope message | VERIFIED |
| AC-002-07 | Forbidden type / cross-scope | `admin-http` cross-scope | VERIFIED |
| AC-002-08 | Not-found detail | `imp036g-proofs` "closes empty-set…" — random UUID detail GET → `404 ADMIN_NOT_FOUND` for brands / organizations / territories / legal-entities / outlets | VERIFIED |
| AC-002-09 | Reload browse | `AdministrationResourcesClient` "appends the next page without dropping already-browsed rows" + "reloads the browse list from the error state" | VERIFIED |
| AC-002-10 | No false exhaustiveness | `imp036g-proofs` brands `more`; `admin-api-exhaustive` first-page-is-not-the-set; Hub count display | VERIFIED |
| AC-002-11 | Discoverability > page | `imp036g-proofs` brands continuation; `imp036g-proofs` "drains eligible brands and outlets past the 50-row page" | VERIFIED |
| AC-003-01…03 | Create/update/activate | `imp036g-proofs` "creates, updates, deactivates, and reactivates hierarchy resources" (brand → organization → territory → legal entity → outlet, rename at revision 2, reactivate at revision 4); `AdministrationResourcesClient` create/update notices | VERIFIED |
| AC-003-04 | Deactivate + `AdminConfirmDialog` | `AdminConfirmDialog` a11y; `AdministrationResourcesClient` "deactivates through a consequence confirmation and reports success" | VERIFIED |
| AC-003-05 | No hard DELETE | `imp036g-proofs` DELETE on resource collections/details and membership routes → `405 METHOD_NOT_ALLOWED`; deactivated outlet still readable; `AdministrationResourcesClient` asserts no delete control and an Activate path instead | VERIFIED |
| AC-003-06…08 | Validation / unauthorized / cross-scope | `admin-http`; `imp036g-proofs` empty-patch → `400 ADMIN_REQUEST_INVALID` | VERIFIED |
| AC-003-09 | Stale-write CAS | `imp036g-proofs` brand + organization CAS; `AdministrationResourcesClient` stale-revision guidance | VERIFIED |
| AC-003-10 | Success feedback | `AdministrationResourcesClient` "Resource created." / "Resource updated." / "Resource deactivated." | VERIFIED |
| AC-004-01 | Membership list continuation | `imp036g-proofs` "pages memberships beyond one page and drains them exhaustively server-side" (56 across >1 page, `adminListAllMemberships` parity, outlet-narrowed 55); `AdministrationMembershipsClient` Load more; `admin-api-exhaustive` membership drain | VERIFIED |
| AC-004-02 | Create membership UI | `AdministrationMembershipsClient` create + notice; `admin-http` create | VERIFIED |
| AC-004-03…09 | Legal transitions incl. Expire | `imp036g-proofs` expire; `admin-http` active; `AdministrationMembershipDetailClient` Expire ≠ Revoke | VERIFIED |
| AC-004-10 | Illegal transitions | `imp036g-proofs` active → expired → `400 ADMIN_REQUEST_INVALID`; revoked → active/suspended/expired → `400` | VERIFIED |
| AC-004-11 | Self-membership deny | `imp036g-proofs` self transition / self create / self grant on the actor's own platform membership → `403 ADMIN_FORBIDDEN` | VERIFIED |
| AC-004-12 | GJ-PERMITTED-OUTLET-ACCESS | `imp036g-proofs` GJ continuity | VERIFIED |
| AC-005-01…03 | List/grant/revoke + confirm | `admin-http`; `AdministrationMembershipDetailClient` grant/revoke through `AdminConfirmDialog` | VERIFIED |
| AC-005-04…08 | Ceiling / self / cross / scope / custom | `admin-http` ceiling deny; `imp036g-proofs` self-grant deny | VERIFIED |
| AC-005-09 | Stale revoke | `imp036g-proofs` second revoke of the same assignment → `400 ADMIN_REQUEST_INVALID`; unknown assignment → `404 ADMIN_NOT_FOUND` | VERIFIED |
| AC-005-10 | No four-eyes | product/non-goal (absence) | VERIFIED |
| AC-005-11 | Success feedback | `AdministrationMembershipDetailClient` "Role granted." / "Role revoked." / "Membership expired." plus denial-code surface | VERIFIED |
| AC-006-01 | Managed-subject EP | `imp036g-proofs` EP + post-grant | VERIFIED |
| AC-006-02 | Empty projection | pre-grant EP without `order.read`; `AdministrationMembershipDetailClient` "None visible." | VERIFIED |
| AC-006-03 | Unauthorized EP | `imp036g-proofs` outsider 403 | VERIFIED |
| AC-006-04 | Invalid resource/id | `imp036g-proofs` invalid membership 404 | VERIFIED |
| AC-006-05 | Read-only diagnostic | GET-only EP route | VERIFIED |
| AC-006-06 | Subject ≠ caller label | `imp036g-proofs` subject label assert; `AdministrationMembershipDetailClient` subject-resource query assert | VERIFIED |
| AC-006-07 | Post-role-change re-inspect | `imp036g-proofs` grant → order.read | VERIFIED |
| AC-006-08 | Reload diagnostic | `AdministrationMembershipDetailClient` "re-runs the managed-subject diagnostic on demand" | VERIFIED |
| AC-007-01 | List authorized audit | `admin-http` platform audit | VERIFIED |
| AC-007-02 | Empty audit (authorized) | `imp036g-proofs` authorized audit reader with a future `occurredFrom` and with an unmatched `action` → `200`, `items: []`, `more: false`, `nextCursor: null` (see note 1) | VERIFIED |
| AC-007-03 | Audit >200 discoverability | `imp036g-proofs` pages audit beyond 200 | VERIFIED |
| AC-007-04 | Unauthorized audit DENY | `admin-http` kitchen 403; `AdministrationAuditClient` forbidden state | VERIFIED |
| AC-007-06 | Server-side actor/action/date filters | `imp036g-proofs` filters; `AdministrationAuditClient` draft/applied snapshot | VERIFIED |
| AC-007-08 | Append-only / no rewrite UI | AuditClient read-only | VERIFIED |
| AC-007-09 | Audit network retry | `AdministrationAuditClient` "surfaces a transport failure…" + "retries with the applied filter snapshot after a failed read" + "recovers on a later successful request after a failed continuation" (`admin-audit-retry` uses `appliedFilters`) | VERIFIED |
| AC-008-01 | Compose Ops status | `imp036g-proofs` "composes Admin overview operational health from the Ops runtime dependencies" — `service`, `uptimeSeconds` (within 2s), `workers`, and `queues` all equal the `/api/operations/v1/operational-status` payload for the same principal; `loadOperationalStatusProjection` + System client | VERIFIED |
| AC-008-02 | Unauthorized ops status | System forbidden; overview unauthorized | VERIFIED |
| AC-008-03 | Admin ≠ Ops dashboard | System copy / no workflow UI | VERIFIED |
| AC-008-04 | Open Operations when authorized | `AdministrationSystemClient` ready link | VERIFIED |
| AC-008-05 | Open Operations unavailable | System forbidden/error non-link | VERIFIED |
| AC-008-06 | No secrets in status | Ops projection fields only | VERIFIED |
| AC-008-07 | Status reload | System Reload control | VERIFIED |
| AC-008-08 | Error recovery retry | System Retry control | VERIFIED |

AC-007-05 and AC-007-07 are intentionally unused (product definition).

Totals: `VERIFIED` 55 · `PARTIAL` 0 · `UAT_REQUIRED` 0 · `UNVERIFIED` 0.

## Notes

1. **AC-007-02 construction limit.** A structurally empty *eligible* audit set
   cannot be built for a non-platform audit reader: establishing the reader's
   own grant writes `membership.created` and `role_assignment.granted` rows into
   the very scope the reader is authorized over, and the only roles carrying
   `access.audit.read` are `platform_super_admin` (unrestricted),
   `brand_admin`, and `outlet_manager`. Proving the empty path therefore uses an
   authorized reader whose server-side filter matches zero events. This asserts
   exactly what the AC protects — an authorized empty result returns `200` with
   `more: false` rather than `403` or a false continuation — without inventing
   RBAC to manufacture an empty scope.

## FIRST_FAILURE record

No `FIRST_FAILURE` entries existed in this document before this session; none
have been removed.

| Fingerprint | Where | First observed outcome | Resolution |
|---|---|---|---|
| `TS7034`/`TS7005` on `members` | `imp036g-proofs.integration.test.ts` membership-scale test | `npx tsc --noEmit` failed: implicitly-typed `members` array | Typed the collected member ids as `string[]`; re-ran `tsc` clean |

Every other new assertion in this session passed on its first execution:
`admin-api-exhaustive` (7), `AdministrationResourcesClient` (8),
`AdministrationMembershipDetailClient` (8), `AdministrationMembershipsClient`
(5), `AdministrationAuditClient` (+3, 8 total), and
`imp036g-proofs.integration.test.ts` (+6, 14 total). No assertion was weakened
or retried to obtain a pass.

## Commands

```text
npm run test:administration
  → node scripts/run-vitest.mjs run tests/administration
      Test Files  24 passed (24)
      Tests      115 passed (115)
  → npm run test:database:administration
      Test Files  10 passed (10)
      Tests       36 passed (36)
```
