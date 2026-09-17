# IMP-036G AC Evidence Map (test documentation)

Companion to `/tmp/boba-bear-autonomous-sprint/AC-EVIDENCE-MAP.md`.
Maps acceptance criteria to repository proofs. Status vocabulary:
`VERIFIED` | `PARTIAL` | `UNVERIFIED`.

| AC | Primary code path | Test ID / suite | Status |
|---|---|---|---|
| AC-001-01 | `AdministrationHubClient`, `/api/admin/v1/overview` | `AdministrationHubClient` overview; `imp036g-proofs` overview | VERIFIED |
| AC-001-02 | `AdministrationHubClient` signed-in label | `AdministrationHubClient` identity | VERIFIED |
| AC-001-03 | `AdministrationPageClient` / session caps | `admin-ui` capability nav | VERIFIED |
| AC-001-04 | Hub unauthorized state | `AdministrationHubClient` unauthorized; `admin-ui` 401 | VERIFIED |
| AC-001-05 | Admin IA links | `AdministrationHubClient` Open Organization/Workforce/Audit/System | VERIFIED |
| AC-001-06 | `adminGetOverview` composition | `imp036g-proofs` overview ops + hierarchy counts | VERIFIED |
| AC-001-07 | Session expiry → sign-in | `admin-ui` / hub unauthorized recovery | PARTIAL |
| AC-001-08 | Overview ops unauthorized without `order.read` | `imp036g-proofs` no-ops overview | VERIFIED |
| AC-002-01…05 | Resource list routes | `imp036g-proofs` brands page; `admin-http` | VERIFIED |
| AC-002-06 | Empty authorized set | list empty path (eligible filter) | PARTIAL |
| AC-002-07 | Forbidden type / cross-scope | `admin-http` cross-scope | VERIFIED |
| AC-002-08 | Not-found detail | admin resource GET not-found | PARTIAL |
| AC-002-09 | Reload browse | UI reload / continuation | PARTIAL |
| AC-002-10 | No false exhaustiveness | `imp036g-proofs` brands `more`; Hub count display | VERIFIED |
| AC-002-11 | Discoverability > page | `imp036g-proofs` brands continuation | VERIFIED |
| AC-003-01…03 | Create/update/activate | `admin-http` / resources client | PARTIAL |
| AC-003-04 | Deactivate + `AdminConfirmDialog` | `AdminConfirmDialog` a11y; ResourcesClient | VERIFIED |
| AC-003-05 | No hard DELETE | ResourcesClient / routes | PARTIAL |
| AC-003-06…08 | Validation / unauthorized / cross-scope | `admin-http` | VERIFIED |
| AC-003-09 | Stale-write CAS | `imp036g-proofs` brand + organization CAS | VERIFIED |
| AC-003-10 | Success feedback | ResourcesClient notice | PARTIAL |
| AC-004-01 | Membership list continuation | membership list + page helper | PARTIAL |
| AC-004-02 | Create membership UI | MembershipsClient + `admin-http` create | VERIFIED |
| AC-004-03…09 | Legal transitions incl. Expire | `imp036g-proofs` expire; `admin-http` active | VERIFIED |
| AC-004-10 | Illegal transitions | domain transition reject | PARTIAL |
| AC-004-11 | Self-membership deny | existing access-control | PARTIAL |
| AC-004-12 | GJ-PERMITTED-OUTLET-ACCESS | `imp036g-proofs` GJ continuity | VERIFIED |
| AC-005-01…03 | List/grant/revoke + confirm | `admin-http`; MembershipDetail + dialog | VERIFIED |
| AC-005-04…08 | Ceiling / self / cross / scope / custom | `admin-http` ceiling deny | VERIFIED |
| AC-005-09 | Stale revoke | assignment revoke conflict path | PARTIAL |
| AC-005-10 | No four-eyes | product/non-goal (absence) | VERIFIED |
| AC-005-11 | Success feedback | MembershipDetail notice | PARTIAL |
| AC-006-01 | Managed-subject EP | `imp036g-proofs` EP + post-grant | VERIFIED |
| AC-006-02 | Empty projection | pre-grant EP without `order.read` | VERIFIED |
| AC-006-03 | Unauthorized EP | `imp036g-proofs` outsider 403 | VERIFIED |
| AC-006-04 | Invalid resource/id | `imp036g-proofs` invalid membership 404 | VERIFIED |
| AC-006-05 | Read-only diagnostic | GET-only EP route | VERIFIED |
| AC-006-06 | Subject ≠ caller label | `imp036g-proofs` subject label assert | VERIFIED |
| AC-006-07 | Post-role-change re-inspect | `imp036g-proofs` grant → order.read | VERIFIED |
| AC-006-08 | Reload diagnostic | MembershipDetail Reload button | PARTIAL |
| AC-007-01 | List authorized audit | `admin-http` platform audit | VERIFIED |
| AC-007-02 | Empty audit (authorized) | authorizeEligibleSet empty | PARTIAL |
| AC-007-03 | Audit >200 discoverability | `imp036g-proofs` pages audit beyond 200 | VERIFIED |
| AC-007-04 | Unauthorized audit DENY | `admin-http` kitchen 403 | VERIFIED |
| AC-007-06 | Server-side actor/action/date filters | `imp036g-proofs` filters | VERIFIED |
| AC-007-08 | Append-only / no rewrite UI | AuditClient read-only | VERIFIED |
| AC-007-09 | Audit network retry | AuditClient Load more / error path | PARTIAL |
| AC-008-01 | Compose Ops status | `loadOperationalStatusProjection` + System client | VERIFIED |
| AC-008-02 | Unauthorized ops status | System forbidden; overview unauthorized | VERIFIED |
| AC-008-03 | Admin ≠ Ops dashboard | System copy / no workflow UI | VERIFIED |
| AC-008-04 | Open Operations when authorized | `AdministrationSystemClient` ready link | VERIFIED |
| AC-008-05 | Open Operations unavailable | System forbidden/error non-link | VERIFIED |
| AC-008-06 | No secrets in status | Ops projection fields only | VERIFIED |
| AC-008-07 | Status reload | System Reload control | VERIFIED |
| AC-008-08 | Error recovery retry | System Retry control | VERIFIED |

AC-007-05 and AC-007-07 are intentionally unused (product definition).
