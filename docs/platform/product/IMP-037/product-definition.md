<!-- governance-meta
{
  "status": "APPROVED",
  "authority": "PRODUCT_DEFINITION",
  "capability": "IMP-037",
  "productDefinitionVersion": "PD-IMP-037-DRAFT-1",
  "process": "PD-1",
  "verificationPolicy": "TEST-1",
  "lastReviewed": "2026-09-19",
  "productDefinitionGateExecution": "PERFORMED",
  "productDefinitionGateResult": "PASS",
  "architectureFitExecution": "PERFORMED",
  "architectureFit": "PASS",
  "architectureLocked": "YES",
  "implementationAuthorized": "YES",
  "implementationStarted": "YES",
  "impAccepted": "NO",
  "imp037Activated": "YES",
  "founderUatRequired": "YES",
  "founderUatStatus": "NOT_PERFORMED",
  "productDecisions": 7,
  "unresolvedProductDecisions": 0,
  "preGateDraft": "NO"
}
-->

# IMP-037 — Backup, Restore & Migration Readiness

## Product Definition (APPROVED — Product Definition Gate PASS)

```text
CURRENT_READ_AMENDMENT (D-374 / ADR-016 / ARCH-R20 — 2026-09-22; CURRENT tip GTM-R138 / STATE-R136 controlled continuation IMP037_PROVIDER_BLOCKED_TO_IMP038; prior tip GTM-R137 / STATE-R135 post-merge reconciliation; implementation start provenance GTM-R136 / STATE-R134; authorization GTM-R135 / STATE-R133; Fit lock GTM-R134 / STATE-R132):
  Managed DigitalOcean PostgreSQL hosting and provider-managed PITR are no longer CURRENT
  pilot-production infrastructure authority (HISTORICAL under pre-D-374 ADR-013 only).
  Product recovery targets remain binding:
    RPO_TARGET <= 15 minutes
    RTO_TARGET <= 2 hours
    independent encrypted logical backup (daily / 35-day retention / off-host)
  RECOVERY_LAYER_1: PITR-capable continuous recovery — Architecture Fit PASS selected
    pgBackRest >= 2.55 (AES-256-CBC repo encryption; continuous WAL to Spaces physical bucket).
  RECOVERY_LAYER_2: independent encrypted logical backup — Architecture Fit PASS selected
    PostgreSQL 18 pg_dump -Fc + age public-key encryption to separate Spaces logical bucket.
  Product Definition remains APPROVED; Product Definition Gate remains PASS.
  Architecture Fit = PASS; architecture LOCKED (independent Architecture Fit review PASS).
  Implementation Authorization = GRANTED (PR#171/5743814105); Implementation Start = YES / PERFORMED (PR#172/5744869269).
  Repository recovery tooling MERGED to main (PR #174; IMP037_REPOSITORY_IMPLEMENTATION: MERGED);
    external recovery proof remains NOT_PERFORMED
    (IMPLEMENTATION_PERFORMED: NO; IMP037_EXTERNAL_RECOVERY_PROOF: NOT_PERFORMED;
    IMP037_IMPLEMENTATION_COMPLETE: NO; IMP037_ACCEPTED: NO;
    PHASE1_BLOCK_STATUS: BLOCKED_PROVIDER_ACCESS;
    PROVIDER_DEPENDENT_PROOF: DEFERRED_PENDING_PROVIDER_ACCESS).
  GTM-R138 / STATE-R136 records NEW controlled continuation
    CONTINUATION_EXCEPTION: IMP037_PROVIDER_BLOCKED_TO_IMP038
    CONTINUATION_EXCEPTION_AUTHORITY: PR#179/5771367844
    HISTORICAL_IMP026_TO_IMP028_CONTINUATION: CLOSED
    IMP037_PROVIDER_BLOCKED_TO_IMP038: YES
    IMP038_ACTIVATED: YES (Product Definition APPROVED / Gate PASS; PD-IMP-038-DRAFT-2; Fit NOT_PERFORMED)
    IMP038_ACCEPTANCE_BLOCKED_BY_IMP037: YES
    currentProductSlice: IMP-038; nextProductSlice: IMP-039; acceptedThrough: IMP-036G
  This does NOT accept IMP-037, complete IMP-037, perform IMP-038 Architecture Fit, lock
  IMP-038 architecture, authorize IMP-038 implementation, or activate IMP-039.
  Stories readiness = IMPLEMENTATION_IN_PROGRESS (coding started; stories not complete).
  Locked capability architecture:
    docs/platform/capabilities/IMP-037-backup-restore-migration-readiness.md
  Founder product decisions / stories / ACs are unchanged by continuation persistence.
  Do not treat historical ADR-013 managed-PITR prose or PR #169 as competing CURRENT authority.
```

```text
Document status: APPROVED
PRODUCT_DEFINITION_VERSION: PD-IMP-037-DRAFT-1
PRE-GATE DRAFT: NO
CAPABILITY: IMP-037
TITLE: Backup, Restore & Migration Readiness
AUTHORITY: PRODUCT_DEFINITION
PROCESS: PD-1
VERIFICATION_POLICY: TEST-1

PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
ARCHITECTURE_FIT_EXECUTION: PERFORMED
ARCHITECTURE_FIT: PASS
ARCHITECTURE_FIT_RESULT: PASS
ARCHITECTURE_LOCKED: YES
IMP037_ARCHITECTURE_LOCKED: YES
IMP037_ACTIVATED: YES
IMPLEMENTATION_AUTHORIZED: YES
IMPLEMENTATION_STARTED: YES
IMP037_IMPLEMENTATION_AUTHORIZED: YES
IMP037_STARTED: YES
IMP037_REPOSITORY_IMPLEMENTATION: MERGED
IMP037_EXTERNAL_RECOVERY_PROOF: NOT_PERFORMED
IMP037_IMPLEMENTATION_COMPLETE: NO
IMPLEMENTATION_PERFORMED: NO
IMP037_ACCEPTED: NO
IMP038_ACTIVATED: YES
IMP038_ACCEPTANCE_BLOCKED_BY_IMP037: YES
CONTINUATION_EXCEPTION: IMP037_PROVIDER_BLOCKED_TO_IMP038
FOUNDER_UAT_REQUIRED: YES
FOUNDER_UAT_STATUS: NOT_PERFORMED
IMPLEMENTATION_AUTHORIZATION_EVIDENCE: PR#171/5743814105
IMPLEMENTATION_START_EVIDENCE: PR#172/5744869269
INDEPENDENT_ARCHITECTURE_FIT_REVIEW: PASS
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_HEAD: d74ca9a30096fb14bca80643b75aa19d33093dde
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_TREE: 09c7e3bd6b7832944d07d527c149752ed3bbeb4d
INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID: 5256273904
ARCHITECTURE_FIT_EVALUATED_HEAD = 28e6dd15c48b8c19abbc7057c4dc7e0a7d7cc7ea
ARCHITECTURE_FIT_EVALUATED_TREE = 5792c963166e8589751d2ba8c8928728e2c83526
ARCHITECTURE_FIT_EVALUATED_WORKING_TREE_FINGERPRINT = 56fa9b5459fd8acceb2ccc3ab73c5d7d9583dbf4539b10a1ef75553dd5aff8ba

PRODUCT_DECISIONS: 7
UNRESOLVED_PRODUCT_DECISIONS: 0
```

This artifact is the **gate-passed Product Definition** for candidate `PD-IMP-037-DRAFT-1`.
Product Definition Gate = PASS (2026-09-19; Founder / product governance human authority after
independent pre-gate review PASS). It persists Founder-approved product requirements for IMP-037
(`APPROVE_ALL_7_RECOMMENDATIONS`, 2026-09-17). Architecture Fit is **PASS** and architecture is **LOCKED** (independent Architecture Fit review PASS).
Implementation authorization is **YES** / **GRANTED** (evidence PR#171/5743814105). Implementation
start is **YES** (evidence PR#172/5744869269). Formal lifecycle is `IMPLEMENTATION_IN_PROGRESS`.
This is **not** implementation complete, acceptance, or Founder UAT. The later
gate-persistence commit is **not** the gate-evaluated artifact
(`gate-persistence commit != gate-evaluated candidate`). The later architecture-lock persistence
commit is **not** the Fit-evaluated candidate
(`architecture-lock persistence commit != Architecture Fit evaluated candidate`).
Authorization persistence does not start coding.

```text
PRODUCT REQUIREMENT
  = what recovery readiness BOBA Bear promises and must prove

ARCHITECTURE MECHANISM
  = how Fit/implementation satisfies those requirements within ADR-001 / ADR-002 /
    ADR-013 / ADR-015 / ADR-016 / D-374 / ARCH-R20

This Product Definition defines PRODUCT REQUIREMENTS only.
It does not invent or lock Architecture Fit mechanisms.
```

```text
PRODUCT_DELIVERY_PROCESS_EFFECTIVE_FROM = IMP-036F
HISTORICAL_ACCEPTED_IMPS_REWRITTEN = NO
IMP036E_LIFECYCLE_CHANGED = NO
PD1_DID_NOT_ACTIVATE_IMP036F_AT_ADOPTION = YES
```

Lifecycle truth remains ROADMAP/STATE only (CURRENT tip: `GTM-R138` / `STATE-R136` controlled
continuation `IMP037_PROVIDER_BLOCKED_TO_IMP038`; prior tip `GTM-R137` / `STATE-R135` post-merge
repository-implementation reconciliation; start provenance `GTM-R136` / `STATE-R134`;
authorization provenance GTM-R135 / STATE-R133; Product Definition Gate PASS provenance remains
GTM-R132 / STATE-R130; D-374 provenance GTM-R133 / STATE-R131; Fit/lock provenance GTM-R134 /
STATE-R132):
`acceptedThrough = IMP-036G`; `currentProductSlice = IMP-038` (controlled continuation);
`pendingAcceptance = NONE`; `nextProductSlice = IMP-039` (`IMP039_ACTIVATED: NO`);
`IMP038_ACTIVATED: YES`; `IMP038_ACCEPTANCE_BLOCKED_BY_IMP037: YES`. Formal IMP-037 lifecycle is
`IMPLEMENTATION_IN_PROGRESS` with `IMP037_ACTIVATED: YES` (unresolved predecessor; provider-blocked).
Product Definition remains **APPROVED** (`Gate PASS`; Architecture Fit PASS; architecture LOCKED;
implementation AUTHORIZED / STARTED; repository tooling MERGED; external recovery proof
NOT_PERFORMED; independent Architecture Fit review PASS).

---

## 1. Identity / version / status

| Field | Definition |
|---|---|
| Capability / title | `IMP-037 — Backup, Restore & Migration Readiness` |
| Product Definition version / document status | `PD-IMP-037-DRAFT-1`; **Document status: APPROVED**; **PRE-GATE DRAFT: NO** |
| Product owner / approval evidence | Founder / product governance human authority; Founder decisions FD-037-01…07 **APPROVED** via `APPROVE_ALL_7_RECOMMENDATIONS` (2026-09-17). Product Definition Gate **PASS** on 2026-09-19 after independent pre-gate review **PASS** of exact candidate head `fccdf7ef606ca906bcdcd706a6de97f693bb88b4` / tree `1477d12b5c5b3b0ccb8d488757516d5b6e637674` (gate-persistence commit is a subsequent revision and is **not** the evaluated artifact). |
| Process / verification policy | `PD-1` / `TEST-1` |
| Canonical anchors | VISION-1; ROADMAP GTM-R138 (CURRENT tip; IMP-038 controlled continuation + Product Definition Gate PASS); STATE STATE-R136 (CURRENT tip); ARCH-R20; DR-16; PD-1; TEST-1; PERSONA-1; GJ-1. Locked capability: `capabilities/IMP-037-backup-restore-migration-readiness.md`. Prior tip GTM-R137 / STATE-R135 post-merge; start provenance GTM-R136 / STATE-R134; authorization provenance GTM-R135 / STATE-R133; Fit/lock provenance GTM-R134 / STATE-R132; Gate PASS provenance remains GTM-R132 / STATE-R130 for the evaluated PD candidate. |
| Repository candidate | Gate-evaluated candidate: canonical path `/home/ajoshi/repos/boba-bear-platform`; branch `main`; **GATE_EVALUATED_HEAD** `fccdf7ef606ca906bcdcd706a6de97f693bb88b4`; **GATE_EVALUATED_TREE** `1477d12b5c5b3b0ccb8d488757516d5b6e637674`; **GATE_EVALUATED_PRODUCT_DEFINITION_BLOB** `eb792d02dbfede862a0bb104a754d14d875141aa`; **GATE_EVALUATED_WORKING_TREE_FINGERPRINT** `9be2a43fe3881ccd28f169f60209cef3c78c991524e5e9d34a8b657e1b1f0c19` (content-sensitive; reconstructed from clean exact gate-evaluated HEAD/tree via `npm run working-tree:fingerprint`). Historical draft-creation provenance (not the gate-evaluated candidate): base `origin/main` `ee82a8cb783cc618f6f1f521964e72deaad677a0` / tree `1b1eaf138667e65bf4573988d62e176bb8be5949`; draft branch `governance/imp037-pre-gate-product-definition`. Historical pre-activation base: GTM-R130 / STATE-R128 (`6b1f2344d0184e29403b99adfea85c2e5dc8bf9a` / tree `5471ea8f72c635a365e9a78ea1394ec212dcad69`). Activation result: GTM-R131 / STATE-R129. Later merged activated main / Product Definition gate-evaluated candidate: `fccdf7ef606ca906bcdcd706a6de97f693bb88b4` / tree `1477d12b5c5b3b0ccb8d488757516d5b6e637674`. CURRENT_PR_HEAD / GATE_PERSISTENCE_COMMITS differ from the gate-evaluated candidate (`gate-persistence commit != gate-evaluated candidate`) and are **not** the artifact that received Gate PASS. |
| Capability lifecycle / authorization | ROADMAP/STATE: IMP-037 remains unresolved predecessor `IMPLEMENTATION_IN_PROGRESS` (**IMP037_ACTIVATED: YES**); Product Definition APPROVED; Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED (PR#171/5743814105; PR#172/5744869269); repository tooling MERGED (PR #174); external recovery proof NOT_PERFORMED; IMP037_ACCEPTED: NO; PHASE1_BLOCK_STATUS: BLOCKED_PROVIDER_ACCESS. Under CONTINUATION_EXCEPTION IMP037_PROVIDER_BLOCKED_TO_IMP038 (PR#179/5771367844), `currentProductSlice = IMP-038` (`IMP038_ACTIVATED: YES`; PD APPROVED / Gate PASS; Fit NOT_PERFORMED; `IMP038_ACCEPTANCE_BLOCKED_BY_IMP037: YES`); `nextProductSlice = IMP-039` (`IMP039_ACTIVATED: NO`). `acceptedThrough` remains IMP-036G. |
| Relevant capability architecture / ADRs | ADR-001 (AMENDED by D-374 for pilot hosting); ADR-002 (AMENDED by D-374 for pilot production/staging target); ADR-013 (PostgreSQL 18 / Drizzle / migrations preserved; Managed PostgreSQL hosting + provider PITR amended by D-374); ADR-015 (AMENDED by D-374 for pilot secrets storage); ADR-016 / D-374 CURRENT pilot topology; ARCH-R20. Persistence application semantics are **not** reopened; pilot hosting/recovery Fit is. |
| Founder UAT applicability | `FOUNDER_UAT_REQUIRED = YES`; `FOUNDER_UAT_STATUS = NOT_PERFORMED` — launch-critical, high-consequence recovery capability. UAT must use isolated recovery rehearsal of the exact candidate; **never** the active production/source DB as drill target. |

Behaviour classification vocabulary:

```text
CURRENT_SUPPORTED
PLANNED_IMP037
FOLLOW_UP
DEFERRED
NOT_SUPPORTED
ARCHITECTURE_FIT_REQUIRED
PRODUCT_DECISION_REQUIRED
UNRESOLVED_DECISION_REQUIRED
```

Architecture Fit conclusions (LOCKED against ARCH-R20 / D-374; independent Architecture Fit review PASS):

```text
NEW_SERVICE: NO
NEW_APP_ROLE: NO
NEW_PERMISSION: NO
D375_REQUIRED_FOR_LOCK: NO
ARCH_R21_REQUIRED: NO
FITS_WITHIN_ARCH_R20: YES
```

---

## 2. Business outcome

Before public launch, BOBA Bear can demonstrate that production-critical authoritative data can be
independently backed up, recovered to an appropriate recovery point, restored without overwriting
the active source, validated as usable after restoration, migrated to a clean compatible PostgreSQL
target, and recovered safely around high-risk persistence changes through repeatable evidence-backed
procedures.

Observable success measure: **PROVEN RECOVERABILITY** (backup → restore → validate → migration
readiness with measured RPO/RTO evidence) — **not** merely that a backup file exists.

Links VISION production operability / launch readiness and ADR-001 / ADR-013 recovery requirements.

---

## 3. Problem statement

**Who:** `PERSONA-PLATFORM-OPERATOR` (persona ≠ role ≠ permission ≠ authorization).

**Problem:** BOBA Bear has mature PostgreSQL persistence, migration validation, schema-drift checks,
immutable migrations and staging deployment controls. Current runtime/tooling does not yet provide a
complete, repeatable productized path for:

- producing the independent logical backup required for launch;
- proving that a backup can actually be restored;
- verifying restored application/business truth;
- measuring recovery performance against RPO/RTO targets;
- detecting missing/stale/failed backup evidence;
- rehearsing data portability to a clean PostgreSQL target;
- proving recovery readiness before a high-risk migration;
- producing durable, secret-safe operator evidence.

**VERIFIED gap note:** The existing staging PostgreSQL recovery command repairs a particular
container/bind-mount condition while preserving the existing persistent volume. It is **not**
evidence that BOBA Bear can recover from data loss.

---

## 4. Primary personas

| Persona ID | Responsibility / goal in this slice | Context / evidence |
|---|---|---|
| `PERSONA-PLATFORM-OPERATOR` (primary) | Keep production backup and recovery controls dependable; execute backup/restore/migration-readiness procedures; interpret readiness and evidence without false success | [personas.md](../personas.md) PERSONA-1; VISION production operability. **Persona ≠ role ≠ permission ≠ authorization.** IMP-037 must not invent a new application role/permission merely because an operator performs recovery work. Architecture Fit determines exact trusted execution authority. |

No new persona is created.

---

## 5. Current-state journey

| Journey ID / evidence | Entry / preconditions | Activities today | Existing outcome / gap |
|---|---|---|---|
| PITR-capable continuous recovery layer (Layer 1) | self-hosted PostgreSQL 18 under D-374 / ARCH-R20 | Architecture Fit PASS selected **pgBackRest >= 2.55** (Spaces physical repo; continuous WAL; AES-256-CBC). Product targets remain obligations requiring drill evidence (`RPO_RTO_PROVEN: NO`) | Managed-provider PITR is **HISTORICAL** / no longer CURRENT after D-374; PR #169 NON_AUTHORITATIVE |
| Independent logical backup (ADR-013 second layer) | Required before broad public launch | Exact schedule/retention were open pending Founder decision; tooling path incomplete | `PLANNED_IMP037` — FD-037-03 now sets daily / 35-day product policy |
| Staging DB volume repair command | Staging container/bind-mount failure | Repair preserving existing volume | **Not** data-loss recovery evidence |
| High-risk migration prerequisites (ADR-013) | Before high-risk persistence change | Verify PITR-capable recovery-layer health; recovery point; independent backup evidence; storage; recovery steps / rehearsal | Procedure authority exists; productized readiness gate / rehearsal evidence `PLANNED_IMP037` |

---

## 6. Desired-state journey

| Journey ID | Entry / context | Ordered activities | Success / downstream outcome | Alternate / recovery paths |
|---|---|---|---|---|
| `JOURNEY-037-BACKUP-READINESS` | Authorized platform operator needs truthful recovery coverage | inspect backup posture → distinguish PITR-capable continuous recovery vs independent logical backup coverage → identify last successful evidence → identify overdue/failed/unverified → understand next operator action | Operator determines recovery readiness without raw cloud/DB internals or credential exposure | No evidence → NOT_READY; failed/overdue → visible degraded; secret-safe always |
| `JOURNEY-037-INDEPENDENT-BACKUP` | Scheduled/manual independent backup due or required before high-risk op | preflight source/credentials → create consistent logical backup → encrypt/persist approved artifact → verify integrity → record safe evidence | Usable independent backup exists **or** operation visibly fails; false success prohibited | Source/destination failure → FAILED; interrupted → incomplete not last-known-good; repeat runs do not silently overwrite retained artifacts |
| `JOURNEY-037-RESTORE-DRILL` | Prove recoverability without risking active DB | select recovery point/artifact → provision/select isolated target → restore → apply later repository migrations where required → start compatible application → validate critical authority → measure recovery → record findings | Restored data proven operationally usable; measured RPO <= 15m and RTO <= 2h (RTO includes application/business-integrity validation) required for recovery-readiness PASS; threshold breach → BLOCKED / NOT_READY / FAILED | Source protection refuse; restore/validation FAILED; RPO/RTO threshold exceeded → readiness cannot PASS; provider side-effects suppressed; findings preserved |
| `JOURNEY-037-MIGRATION-READINESS` | Prove PostgreSQL portability | produce portable recovery artifact → restore/import into clean compatible PostgreSQL 18 target → reconcile migration/schema state → start compatible application → validate authoritative business state → record findings | Portability demonstrated without provider-specific business truth | Interrupted → target not ready; source remains authoritative |
| `JOURNEY-037-HIGH-RISK-MIGRATION` | High-risk persistence change proposed | verify recovery health → identify valid recovery point → confirm independent backup evidence → review recovery procedure → rehearse against representative data → verify post-migration state → READY or BLOCKED | High-risk migration cannot be production-ready when recovery assumptions unproven | Missing/stale backup → BLOCKED; failed rehearsal → BLOCKED; restore ≠ routine app rollback |

---

## 7. Story map

| Business outcome | Persona | Journey | Activity | Story IDs | Slice classification |
|---|---|---|---|---|---|
| Truthful recovery readiness | `PERSONA-PLATFORM-OPERATOR` | `JOURNEY-037-BACKUP-READINESS` | Inspect backup posture / evidence | `US-IMP-037-001` | `V1_ACCEPTANCE_SLICE` |
| Independent recoverable backup | `PERSONA-PLATFORM-OPERATOR` | `JOURNEY-037-INDEPENDENT-BACKUP` | Produce encrypted independent backup | `US-IMP-037-002` | `V1_ACCEPTANCE_SLICE` |
| Isolated restore | `PERSONA-PLATFORM-OPERATOR` | `JOURNEY-037-RESTORE-DRILL` | Restore without source risk | `US-IMP-037-003` | `V1_ACCEPTANCE_SLICE` |
| Business integrity after restore | `PERSONA-PLATFORM-OPERATOR` | `JOURNEY-037-RESTORE-DRILL` | Validate critical restored state | `US-IMP-037-004` | `V1_ACCEPTANCE_SLICE` |
| Safe failure handling | `PERSONA-PLATFORM-OPERATOR` | Backup/restore journeys | Detect/recover from failures | `US-IMP-037-005` | `V1_ACCEPTANCE_SLICE` |
| PostgreSQL portability | `PERSONA-PLATFORM-OPERATOR` | `JOURNEY-037-MIGRATION-READINESS` | Clean-target migration rehearsal | `US-IMP-037-006` | `V1_ACCEPTANCE_SLICE` |
| High-risk migration gate | `PERSONA-PLATFORM-OPERATOR` | `JOURNEY-037-HIGH-RISK-MIGRATION` | Recovery-readiness gate | `US-IMP-037-007` | `V1_ACCEPTANCE_SLICE` |
| Reproducible evidence | `PERSONA-PLATFORM-OPERATOR` | All recovery journeys | Runbook + reviewable evidence | `US-IMP-037-008` | `V1_ACCEPTANCE_SLICE` |

---

## 8. Acceptance slice

| Slice | Mandatory story IDs | Mandatory AC IDs | Required Golden Journeys | Observable acceptance boundary |
|---|---|---|---|---|
| `V1_ACCEPTANCE_SLICE` | `US-IMP-037-001` … `US-IMP-037-008` | All 50 ACs listed in §10 (50 total) | Protect continuity of `GJ-FIRST-ORDER`, `GJ-PERMITTED-OUTLET-ACCESS`, `GJ-PAYMENT-RECOVERY` via safe recovery validation (no new customer GJ) | Proven backup → isolated restore → business validation → portability rehearsal → high-risk readiness → runbook/evidence; measured RPO <= 15m and RTO <= 2h required for recovery-readiness PASS (threshold breach blocks acceptance); Founder UAT on isolated rehearsal |
| `FOLLOW_UP` | Production scheduler realization; HA provisioning; live cutover | N/A for IMP-037 acceptance | N/A | Owned by IMP-039 / IMP-040 |
| `DEFERRED` | General backup/restore web UI; automatic failover; multi-region; major-version automation | N/A | N/A | Explicit non-goals §15 / §24 |

Mandatory V1 product scope:

```text
backup workflow
backup-health evidence
backup failure visibility
isolated restore workflow
restore validation
recovery-point evidence
recovery-time evidence
PostgreSQL portability rehearsal
high-risk migration readiness
operator runbook
reviewable evidence
```

IMP-039 / IMP-040 boundary (FD-037-07):

```text
IMP-037 — PROVE recovery and migration readiness
IMP-039 — REALIZE production infrastructure and release pipeline
IMP-040 — VALIDATE live launch and cutover
```

IMP-037 acceptance must not falsely claim IMP-039/040 work is complete.

---

## 9. User stories

### US-IMP-037-001 — Understand backup readiness

```text
Story ID: US-IMP-037-001
As a PERSONA-PLATFORM-OPERATOR
I want a truthful view of current backup/recovery readiness
so that I know whether recovery coverage is healthy before relying on it.

Journey / activity: JOURNEY-037-BACKUP-READINESS
Preconditions: Authorized operator context; repository-supported recovery tooling/runbook per Architecture Fit; isolated targets for restore/migration drills; no active/source overwrite.
Acceptance scenarios: `AC-IMP-037-001-01`, `AC-IMP-037-001-02`, `AC-IMP-037-001-03`, `AC-IMP-037-001-04`, `AC-IMP-037-001-05`
Business rules: See §11 (applicable BR-IMP-037-* invariants)
UX states: CLI/operator tooling state matrix §13 (Ready / Running / Succeeded / Failed / NOT_READY / BLOCKED)
Permission / resource context: Infrastructure/operator trusted execution authority — Architecture Fit; PERSONA ≠ ROLE ≠ PERMISSION ≠ AUTHORIZATION; no new app role/permission invented by this PD
Error / recovery: Explicit FAILED / NOT_READY / BLOCKED; interrupted ops never SUCCEEDED; findings preserved (BR-IMP-037-020)
Dependencies: ADR-001 / ADR-002 / ADR-013 / ADR-015 / ADR-016 / D-374 / ARCH-R20 / TEST-1; IMP-039/040 boundary for production realization/cutover
Explicit non-goals: See §15 / §24
Data implications: Authoritative PostgreSQL state including current signed-artifact bytes; no invented object-store recovery for CURRENT statutory artifacts
Security implications: Encrypted independent backups; secret-safe evidence; provider side-effect suppression; production-classified restore protection
Architecture fit / applicable invariants: ADR-013 backup/restore layers; direct DB connections for backup/restore; Fit questions §16 remain open (mechanisms)
Open material decisions: NONE (FD-037-01…07 APPROVED)
Readiness: IMPLEMENTATION_IN_PROGRESS (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED; story not complete)
```

#### Acceptance scenarios

**AC-IMP-037-001-01 — Healthy evidence**

Story: `US-IMP-037-001`

Given applicable backup layers have valid successful evidence
When the operator checks backup readiness
Then each applicable layer reports its most recent verified status and the overall result does not claim more coverage than the evidence proves.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-001-02 — No backup evidence**

Story: `US-IMP-037-001`

Given no valid independent backup evidence exists
When readiness is checked
Then the capability reports NOT_READY rather than treating configuration or an empty storage location as success.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-001-03 — Failed backup**

Story: `US-IMP-037-001`

Given the most recent backup attempt failed
When readiness is inspected
Then failure is visible with safe actionable context and no backup-success claim is emitted.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-001-04 — Overdue backup**

Story: `US-IMP-037-001`

Given the approved schedule has passed without a successful backup
When readiness is inspected
Then the independent-backup layer is visibly overdue/degraded.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-001-05 — Secret-safe status**

Story: `US-IMP-037-001`

Given readiness is displayed or recorded
Then no database URI, password, storage credential, token, raw secret, or sensitive customer payload appears.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)

### US-IMP-037-002 — Produce an independent recoverable backup

```text
Story ID: US-IMP-037-002
As a PERSONA-PLATFORM-OPERATOR
I want to produce an independent protected backup
so that recovery does not rely solely on the PITR-capable continuous recovery layer.

Journey / activity: JOURNEY-037-INDEPENDENT-BACKUP
Preconditions: Authorized operator context; repository-supported recovery tooling/runbook per Architecture Fit; isolated targets for restore/migration drills; no active/source overwrite.
Acceptance scenarios: `AC-IMP-037-002-01`, `AC-IMP-037-002-02`, `AC-IMP-037-002-03`, `AC-IMP-037-002-04`, `AC-IMP-037-002-05`, `AC-IMP-037-002-06`, `AC-IMP-037-002-07`
Business rules: See §11 (applicable BR-IMP-037-* invariants)
UX states: CLI/operator tooling state matrix §13 (Ready / Running / Succeeded / Failed / NOT_READY / BLOCKED)
Permission / resource context: Infrastructure/operator trusted execution authority — Architecture Fit; PERSONA ≠ ROLE ≠ PERMISSION ≠ AUTHORIZATION; no new app role/permission invented by this PD
Error / recovery: Explicit FAILED / NOT_READY / BLOCKED; interrupted ops never SUCCEEDED; findings preserved (BR-IMP-037-020)
Dependencies: ADR-001 / ADR-002 / ADR-013 / ADR-015 / ADR-016 / D-374 / ARCH-R20 / TEST-1; IMP-039/040 boundary for production realization/cutover
Explicit non-goals: See §15 / §24
Data implications: Authoritative PostgreSQL state including current signed-artifact bytes; no invented object-store recovery for CURRENT statutory artifacts
Security implications: Encrypted independent backups; secret-safe evidence; provider side-effect suppression; production-classified restore protection
Architecture fit / applicable invariants: ADR-013 backup/restore layers; direct DB connections for backup/restore; Fit questions §16 remain open (mechanisms)
Open material decisions: NONE (FD-037-01…07 APPROVED)
Readiness: IMPLEMENTATION_IN_PROGRESS (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED; story not complete)
```

#### Acceptance scenarios

**AC-IMP-037-002-01 — Successful backup**

Story: `US-IMP-037-002`

Given a valid authorized source and backup destination
When a backup is run
Then a complete recovery artifact is created and receives verified success evidence.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-002-02 — Integrity evidence**

Story: `US-IMP-037-002`

Given backup generation completes
When the artifact is finalized
Then the workflow verifies sufficient integrity evidence to distinguish a complete artifact from a corrupted/incomplete one.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-002-03 — Encryption**

Story: `US-IMP-037-002`

Given an independent backup artifact is persisted
Then it is protected according to the accepted encrypted-backup architecture and plaintext production backup material is not left as the durable result.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-002-04 — Restricted credentials**

Story: `US-IMP-037-002`

Given the backup workflow runs
Then it does not use ordinary application runtime authority as privileged backup authority and does not expose its recovery credentials.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-002-05 — Source unavailable**

Story: `US-IMP-037-002`

Given the authoritative database cannot be safely read
When backup execution begins or loses source access
Then it fails explicitly and produces no successful-backup record.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-002-06 — Destination failure**

Story: `US-IMP-037-002`

Given backup data cannot be safely stored at the approved destination
Then the workflow reports failure and does not label the backup usable.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-002-07 — Repeat execution**

Story: `US-IMP-037-002`

Given multiple legitimate backup runs occur
Then prior retained recovery artifacts are not silently overwritten by a later run.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)

### US-IMP-037-003 — Restore without risking the source

```text
Story ID: US-IMP-037-003
As a PERSONA-PLATFORM-OPERATOR
I want to restore a selected recovery point into an isolated target
so that I can prove recovery without overwriting live authority.

Journey / activity: JOURNEY-037-RESTORE-DRILL
Preconditions: Authorized operator context; repository-supported recovery tooling/runbook per Architecture Fit; isolated targets for restore/migration drills; no active/source overwrite.
Acceptance scenarios: `AC-IMP-037-003-01`, `AC-IMP-037-003-02`, `AC-IMP-037-003-03`, `AC-IMP-037-003-04`, `AC-IMP-037-003-05`, `AC-IMP-037-003-06`, `AC-IMP-037-003-07`
Business rules: See §11 (applicable BR-IMP-037-* invariants)
UX states: CLI/operator tooling state matrix §13 (Ready / Running / Succeeded / Failed / NOT_READY / BLOCKED)
Permission / resource context: Infrastructure/operator trusted execution authority — Architecture Fit; PERSONA ≠ ROLE ≠ PERMISSION ≠ AUTHORIZATION; no new app role/permission invented by this PD
Error / recovery: Explicit FAILED / NOT_READY / BLOCKED; interrupted ops never SUCCEEDED; findings preserved (BR-IMP-037-020)
Dependencies: ADR-001 / ADR-002 / ADR-013 / ADR-015 / ADR-016 / D-374 / ARCH-R20 / TEST-1; IMP-039/040 boundary for production realization/cutover
Explicit non-goals: See §15 / §24
Data implications: Authoritative PostgreSQL state including current signed-artifact bytes; no invented object-store recovery for CURRENT statutory artifacts
Security implications: Encrypted independent backups; secret-safe evidence; provider side-effect suppression; production-classified restore protection
Architecture fit / applicable invariants: ADR-013 backup/restore layers; direct DB connections for backup/restore; Fit questions §16 remain open (mechanisms)
Open material decisions: NONE (FD-037-01…07 APPROVED)
Readiness: IMPLEMENTATION_IN_PROGRESS (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED; story not complete)
```

#### Acceptance scenarios

**AC-IMP-037-003-01 — Separate target**

Story: `US-IMP-037-003`

Given a valid backup/recovery point
When a restore drill begins
Then the destination is a separate recovery database/cluster and the active source remains unchanged.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-003-02 — Active source protection**

Story: `US-IMP-037-003`

Given the requested restore destination resolves to the active/source database or cannot be safely distinguished from it
Then restore is refused before destructive work begins.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-003-03 — Restore success**

Story: `US-IMP-037-003`

Given a valid recovery artifact and valid isolated target
When restoration completes
Then the restored data is available for subsequent validation.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-003-04 — Restore failure**

Story: `US-IMP-037-003`

Given restoration fails part-way
Then the result is FAILED rather than usable/successful and the source remains unchanged.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-003-05 — Later migrations**

Story: `US-IMP-037-003`

Given the selected recovery point predates one or more compatible repository migrations required by the application candidate
When the recovery procedure requires them
Then those migrations are applied through existing migration authority before application validation.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-003-06 — Environment isolation**

Story: `US-IMP-037-003`

Given production-classified data is restored
Then the recovery target uses an appropriately protected recovery context and is not silently copied into ordinary staging contrary to environment/data-isolation policy.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-003-07 — Provider side-effect isolation**

Story: `US-IMP-037-003`

Given the restored application is started for validation
Then the drill cannot accidentally initiate real customer notifications, payments, refunds, deliveries, or other live external effects.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)

### US-IMP-037-004 — Prove restored business integrity

```text
Story ID: US-IMP-037-004
As a PERSONA-PLATFORM-OPERATOR
I want a restored environment to prove meaningful platform state
so that “restore completed” cannot mask unusable or corrupted business truth.

Journey / activity: JOURNEY-037-RESTORE-DRILL
Preconditions: Authorized operator context; repository-supported recovery tooling/runbook per Architecture Fit; isolated targets for restore/migration drills; no active/source overwrite.
Acceptance scenarios: `AC-IMP-037-004-01`, `AC-IMP-037-004-02`, `AC-IMP-037-004-03`, `AC-IMP-037-004-04`, `AC-IMP-037-004-05`, `AC-IMP-037-004-06`, `AC-IMP-037-004-07`, `AC-IMP-037-004-08`
Business rules: See §11 (applicable BR-IMP-037-* invariants)
UX states: CLI/operator tooling state matrix §13 (Ready / Running / Succeeded / Failed / NOT_READY / BLOCKED)
Permission / resource context: Infrastructure/operator trusted execution authority — Architecture Fit; PERSONA ≠ ROLE ≠ PERMISSION ≠ AUTHORIZATION; no new app role/permission invented by this PD
Error / recovery: Explicit FAILED / NOT_READY / BLOCKED; interrupted ops never SUCCEEDED; findings preserved (BR-IMP-037-020)
Dependencies: ADR-001 / ADR-002 / ADR-013 / ADR-015 / ADR-016 / D-374 / ARCH-R20 / TEST-1; IMP-039/040 boundary for production realization/cutover
Explicit non-goals: See §15 / §24
Data implications: Authoritative PostgreSQL state including current signed-artifact bytes; no invented object-store recovery for CURRENT statutory artifacts
Security implications: Encrypted independent backups; secret-safe evidence; provider side-effect suppression; production-classified restore protection
Architecture fit / applicable invariants: ADR-013 backup/restore layers; direct DB connections for backup/restore; Fit questions §16 remain open (mechanisms)
Open material decisions: NONE (FD-037-01…07 APPROVED)
Readiness: IMPLEMENTATION_IN_PROGRESS (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED; story not complete)
```

#### Acceptance scenarios

**AC-IMP-037-004-01 — Application starts**

Story: `US-IMP-037-004`

Given restoration and required migrations are complete
When the compatible application candidate starts against the recovery target
Then required database/schema compatibility succeeds.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-004-02 — Identity/customer state**

Story: `US-IMP-037-004`

Then representative identity/session and customer authority required by the recovered dataset can be read and validated without cross-environment secret leakage.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-004-03 — Commerce authority**

Story: `US-IMP-037-004`

Then representative order, payment, refund and immutable pricing/checkout authority retains its expected relationships and values.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-004-04 — Operational authority**

Story: `US-IMP-037-004`

Then representative fulfilment, delivery and notification records retain interpretable state.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-004-05 — Reliability state**

Story: `US-IMP-037-004`

Then transactional outbox and idempotency records are present and structurally usable without uncontrolled replay of external effects.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-004-06 — Financial documents**

Story: `US-IMP-037-004`

Then Financial Document and current signed-artifact authority retain required records, exact persisted artifact bytes and integrity relationships.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-004-07 — Authorization data**

Story: `US-IMP-037-004`

Then organization/workforce membership/role authority required to interpret permitted access is recoverable and no foreign data is fabricated.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-004-08 — Recovery metrics**

Story: `US-IMP-037-004`

Given restoration and required application/business-integrity validation are complete
When recovery evidence is evaluated
Then the achieved recovery point is calculated and recorded; the achieved end-to-end recovery/validation time is calculated and recorded (RTO includes required application/business-integrity validation, not merely PostgreSQL availability); recovery-readiness PASS requires measured RPO <= 15 minutes (FD-037-01) and measured RTO <= 2 hours (FD-037-02) for qualifying recovery scenarios; if either threshold is exceeded, the drill/readiness result is BLOCKED / NOT_READY / FAILED for IMP-037 acceptance; measured values and any threshold breach remain visible in evidence; and no PASS may be reported merely because restoration technically succeeded.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)

### US-IMP-037-005 — Detect and recover from backup/restore failures

```text
Story ID: US-IMP-037-005
As a PERSONA-PLATFORM-OPERATOR
I want failed recovery operations to be clear and safely repeatable
so that an interrupted attempt does not create false confidence or require unsafe improvisation.

Journey / activity: JOURNEY-037-RESTORE-DRILL / JOURNEY-037-INDEPENDENT-BACKUP
Preconditions: Authorized operator context; repository-supported recovery tooling/runbook per Architecture Fit; isolated targets for restore/migration drills; no active/source overwrite.
Acceptance scenarios: `AC-IMP-037-005-01`, `AC-IMP-037-005-02`, `AC-IMP-037-005-03`, `AC-IMP-037-005-04`, `AC-IMP-037-005-05`, `AC-IMP-037-005-06`
Business rules: See §11 (applicable BR-IMP-037-* invariants)
UX states: CLI/operator tooling state matrix §13 (Ready / Running / Succeeded / Failed / NOT_READY / BLOCKED)
Permission / resource context: Infrastructure/operator trusted execution authority — Architecture Fit; PERSONA ≠ ROLE ≠ PERMISSION ≠ AUTHORIZATION; no new app role/permission invented by this PD
Error / recovery: Explicit FAILED / NOT_READY / BLOCKED; interrupted ops never SUCCEEDED; findings preserved (BR-IMP-037-020)
Dependencies: ADR-001 / ADR-002 / ADR-013 / ADR-015 / ADR-016 / D-374 / ARCH-R20 / TEST-1; IMP-039/040 boundary for production realization/cutover
Explicit non-goals: See §15 / §24
Data implications: Authoritative PostgreSQL state including current signed-artifact bytes; no invented object-store recovery for CURRENT statutory artifacts
Security implications: Encrypted independent backups; secret-safe evidence; provider side-effect suppression; production-classified restore protection
Architecture fit / applicable invariants: ADR-013 backup/restore layers; direct DB connections for backup/restore; Fit questions §16 remain open (mechanisms)
Open material decisions: NONE (FD-037-01…07 APPROVED)
Readiness: IMPLEMENTATION_IN_PROGRESS (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED; story not complete)
```

#### Acceptance scenarios

**AC-IMP-037-005-01 — Backup interruption**

Story: `US-IMP-037-005`

Given a backup run is interrupted
Then incomplete output cannot be mistaken for the last successful recoverable artifact.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-005-02 — Restore interruption**

Story: `US-IMP-037-005`

Given a restore is interrupted
Then rerun/recovery instructions clearly identify whether the target must be resumed, recreated, or discarded.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-005-03 — Validation failure**

Story: `US-IMP-037-005`

Given data restores but required validation fails
Then the drill result is FAILED/NOT_READY even if the restore command itself succeeded.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-005-04 — Repeatability**

Story: `US-IMP-037-005`

Given the operator follows the documented recovery procedure again
Then repeated execution does not overwrite the live source or manufacture a false successful result.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-005-05 — Cleanup protection**

Story: `US-IMP-037-005`

Given a failed or completed recovery target is to be discarded
Then the operator is shown the exact target/consequence and active source data cannot be selected through an ambiguous cleanup operation.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-005-06 — Findings preserved**

Story: `US-IMP-037-005`

Given a drill encounters a defect
Then its finding remains visible in evidence even after a later successful rerun.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)

### US-IMP-037-006 — Demonstrate database migration portability

```text
Story ID: US-IMP-037-006
As a PERSONA-PLATFORM-OPERATOR
I want BOBA Bear's authoritative data to be portable to a clean compatible PostgreSQL target
so that recovery/migration does not depend on reconstructing the business domain or proprietary database automation.

Journey / activity: JOURNEY-037-MIGRATION-READINESS
Preconditions: Authorized operator context; repository-supported recovery tooling/runbook per Architecture Fit; isolated targets for restore/migration drills; no active/source overwrite.
Acceptance scenarios: `AC-IMP-037-006-01`, `AC-IMP-037-006-02`, `AC-IMP-037-006-03`, `AC-IMP-037-006-04`, `AC-IMP-037-006-05`, `AC-IMP-037-006-06`
Business rules: See §11 (applicable BR-IMP-037-* invariants)
UX states: CLI/operator tooling state matrix §13 (Ready / Running / Succeeded / Failed / NOT_READY / BLOCKED)
Permission / resource context: Infrastructure/operator trusted execution authority — Architecture Fit; PERSONA ≠ ROLE ≠ PERMISSION ≠ AUTHORIZATION; no new app role/permission invented by this PD
Error / recovery: Explicit FAILED / NOT_READY / BLOCKED; interrupted ops never SUCCEEDED; findings preserved (BR-IMP-037-020)
Dependencies: ADR-001 / ADR-002 / ADR-013 / ADR-015 / ADR-016 / D-374 / ARCH-R20 / TEST-1; IMP-039/040 boundary for production realization/cutover
Explicit non-goals: See §15 / §24
Data implications: Authoritative PostgreSQL state including current signed-artifact bytes; no invented object-store recovery for CURRENT statutory artifacts
Security implications: Encrypted independent backups; secret-safe evidence; provider side-effect suppression; production-classified restore protection
Architecture fit / applicable invariants: ADR-013 backup/restore layers; direct DB connections for backup/restore; Fit questions §16 remain open (mechanisms)
Open material decisions: NONE (FD-037-01…07 APPROVED)
Readiness: IMPLEMENTATION_IN_PROGRESS (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED; story not complete)
```

#### Acceptance scenarios

**AC-IMP-037-006-01 — Clean target import**

Story: `US-IMP-037-006`

Given an approved portable backup/export
When it is restored into a clean compatible PostgreSQL 18 target
Then required authoritative data can be reconstructed.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-006-02 — Repository migration compatibility**

Story: `US-IMP-037-006`

Given target schema state differs from the application candidate's required state
Then repository-controlled migrations establish the compatible schema through accepted migration discipline.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-006-03 — Business validation**

Story: `US-IMP-037-006`

Then the same required restored-state validations from US-IMP-037-004 succeed against the migrated target.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-006-04 — No core vendor identity**

Story: `US-IMP-037-006`

Then business entities do not require DigitalOcean resource identifiers to retain their meaning.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-006-05 — Interrupted migration**

Story: `US-IMP-037-006`

Given the migration/import is interrupted or fails
Then the target is not declared ready and the source remains authoritative/unmodified.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-006-06 — Migration evidence**

Story: `US-IMP-037-006`

Then source recovery point, target, application/migration identity, elapsed time, result and findings are recorded without credentials.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)

### US-IMP-037-007 — Gate high-risk migrations on recovery readiness

```text
Story ID: US-IMP-037-007
As a PERSONA-PLATFORM-OPERATOR
I want recovery prerequisites checked before high-risk persistence changes
so that a migration is not attempted on assumptions that have never been proven.

Journey / activity: JOURNEY-037-HIGH-RISK-MIGRATION
Preconditions: Authorized operator context; repository-supported recovery tooling/runbook per Architecture Fit; isolated targets for restore/migration drills; no active/source overwrite.
Acceptance scenarios: `AC-IMP-037-007-01`, `AC-IMP-037-007-02`, `AC-IMP-037-007-03`, `AC-IMP-037-007-04`, `AC-IMP-037-007-05`, `AC-IMP-037-007-06`
Business rules: See §11 (applicable BR-IMP-037-* invariants)
UX states: CLI/operator tooling state matrix §13 (Ready / Running / Succeeded / Failed / NOT_READY / BLOCKED)
Permission / resource context: Infrastructure/operator trusted execution authority — Architecture Fit; PERSONA ≠ ROLE ≠ PERMISSION ≠ AUTHORIZATION; no new app role/permission invented by this PD
Error / recovery: Explicit FAILED / NOT_READY / BLOCKED; interrupted ops never SUCCEEDED; findings preserved (BR-IMP-037-020)
Dependencies: ADR-001 / ADR-002 / ADR-013 / ADR-015 / ADR-016 / D-374 / ARCH-R20 / TEST-1; IMP-039/040 boundary for production realization/cutover
Explicit non-goals: See §15 / §24
Data implications: Authoritative PostgreSQL state including current signed-artifact bytes; no invented object-store recovery for CURRENT statutory artifacts
Security implications: Encrypted independent backups; secret-safe evidence; provider side-effect suppression; production-classified restore protection
Architecture fit / applicable invariants: ADR-013 backup/restore layers; direct DB connections for backup/restore; Fit questions §16 remain open (mechanisms)
Open material decisions: NONE (FD-037-01…07 APPROVED)
Readiness: IMPLEMENTATION_IN_PROGRESS (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED; story not complete)
```

#### Acceptance scenarios

**AC-IMP-037-007-01 — Healthy recovery prerequisite**

Story: `US-IMP-037-007`

Given a high-risk migration is proposed
When readiness is assessed
Then applicable PITR-capable recovery-layer health/recovery-point evidence and independent backup evidence are checked.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-007-02 — Recovery steps**

Story: `US-IMP-037-007`

Then the expected recovery procedure is documented and references an identifiable recovery point.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-007-03 — Representative rehearsal**

Story: `US-IMP-037-007`

Then the migration has been rehearsed against representative data in a non-production target with post-migration verification.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-007-04 — Missing backup**

Story: `US-IMP-037-007`

Given required backup/recovery evidence is missing or stale
Then readiness is BLOCKED.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-007-05 — Failed rehearsal**

Story: `US-IMP-037-007`

Given representative migration or recovery validation fails
Then readiness is BLOCKED even if the migration SQL itself executes successfully.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-007-06 — No restore-as-routine-rollback**

Story: `US-IMP-037-007`

Then the workflow does not present database restore as the normal rollback mechanism for an ordinary bad application release; compatible image rollback or forward correction remains the normal release recovery discipline.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)

### US-IMP-037-008 — Produce reproducible recovery evidence

```text
Story ID: US-IMP-037-008
As a PERSONA-PLATFORM-OPERATOR
I want an explicit recovery runbook and evidence package
so that readiness can be independently reviewed and repeated rather than living in one person's memory.

Journey / activity: JOURNEY-037-BACKUP-READINESS / JOURNEY-037-RESTORE-DRILL / JOURNEY-037-MIGRATION-READINESS
Preconditions: Authorized operator context; repository-supported recovery tooling/runbook per Architecture Fit; isolated targets for restore/migration drills; no active/source overwrite.
Acceptance scenarios: `AC-IMP-037-008-01`, `AC-IMP-037-008-02`, `AC-IMP-037-008-03`, `AC-IMP-037-008-04`, `AC-IMP-037-008-05`
Business rules: See §11 (applicable BR-IMP-037-* invariants)
UX states: CLI/operator tooling state matrix §13 (Ready / Running / Succeeded / Failed / NOT_READY / BLOCKED)
Permission / resource context: Infrastructure/operator trusted execution authority — Architecture Fit; PERSONA ≠ ROLE ≠ PERMISSION ≠ AUTHORIZATION; no new app role/permission invented by this PD
Error / recovery: Explicit FAILED / NOT_READY / BLOCKED; interrupted ops never SUCCEEDED; findings preserved (BR-IMP-037-020)
Dependencies: ADR-001 / ADR-002 / ADR-013 / ADR-015 / ADR-016 / D-374 / ARCH-R20 / TEST-1; IMP-039/040 boundary for production realization/cutover
Explicit non-goals: See §15 / §24
Data implications: Authoritative PostgreSQL state including current signed-artifact bytes; no invented object-store recovery for CURRENT statutory artifacts
Security implications: Encrypted independent backups; secret-safe evidence; provider side-effect suppression; production-classified restore protection
Architecture fit / applicable invariants: ADR-013 backup/restore layers; direct DB connections for backup/restore; Fit questions §16 remain open (mechanisms)
Open material decisions: NONE (FD-037-01…07 APPROVED)
Readiness: IMPLEMENTATION_IN_PROGRESS (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED; story not complete)
```

#### Acceptance scenarios

**AC-IMP-037-008-01 — Clean-environment reproducibility**

Story: `US-IMP-037-008`

Given the documented prerequisites are available
When an authorized operator follows the procedure
Then the backup→restore→validate workflow can be reproduced without undocumented manual database edits.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-008-02 — Provenance**

Story: `US-IMP-037-008`

Evidence identifies the relevant application/repository candidate, migration/schema context, source environment classification and recovery artifact/point.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-008-03 — Safe evidence**

Story: `US-IMP-037-008`

Evidence excludes credentials, raw connection URLs, tokens and unnecessarily copied customer payloads.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-008-04 — Pass/fail summary**

Story: `US-IMP-037-008`

The final report clearly identifies successful controls, failed controls, measured recovery results and unresolved findings.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)
**AC-IMP-037-008-05 — Independent reviewability**

Story: `US-IMP-037-008`

A reviewer can determine from the retained evidence whether IMP-037's mandatory recovery scenarios passed without relying solely on the executing operator's statement.

Mandatory in acceptance slice: YES (`V1_ACCEPTANCE_SLICE`)



---

## 10. Acceptance scenarios

All mandatory scenarios are defined under §9. Stable IDs:

`AC-IMP-037-001-01`, `AC-IMP-037-001-02`, `AC-IMP-037-001-03`, `AC-IMP-037-001-04`, `AC-IMP-037-001-05`, `AC-IMP-037-002-01`, `AC-IMP-037-002-02`, `AC-IMP-037-002-03`, `AC-IMP-037-002-04`, `AC-IMP-037-002-05`, `AC-IMP-037-002-06`, `AC-IMP-037-002-07`, `AC-IMP-037-003-01`, `AC-IMP-037-003-02`, `AC-IMP-037-003-03`, `AC-IMP-037-003-04`, `AC-IMP-037-003-05`, `AC-IMP-037-003-06`, `AC-IMP-037-003-07`, `AC-IMP-037-004-01`, `AC-IMP-037-004-02`, `AC-IMP-037-004-03`, `AC-IMP-037-004-04`, `AC-IMP-037-004-05`, `AC-IMP-037-004-06`, `AC-IMP-037-004-07`, `AC-IMP-037-004-08`, `AC-IMP-037-005-01`, `AC-IMP-037-005-02`, `AC-IMP-037-005-03`, `AC-IMP-037-005-04`, `AC-IMP-037-005-05`, `AC-IMP-037-005-06`, `AC-IMP-037-006-01`, `AC-IMP-037-006-02`, `AC-IMP-037-006-03`, `AC-IMP-037-006-04`, `AC-IMP-037-006-05`, `AC-IMP-037-006-06`, `AC-IMP-037-007-01`, `AC-IMP-037-007-02`, `AC-IMP-037-007-03`, `AC-IMP-037-007-04`, `AC-IMP-037-007-05`, `AC-IMP-037-007-06`, `AC-IMP-037-008-01`, `AC-IMP-037-008-02`, `AC-IMP-037-008-03`, `AC-IMP-037-008-04`, `AC-IMP-037-008-05`

**Count: 50**

| Story / AC ID | Required behaviour / risk | Applicable test layers | Planned proof | Actual evidence / candidate / result |
|---|---|---|---|---|
| `AC-IMP-037-001-01` | Healthy evidence — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-001-02` | No backup evidence — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-001-03` | Failed backup — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-001-04` | Overdue backup — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-001-05` | Secret-safe status — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-002-01` | Successful backup — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-002-02` | Integrity evidence — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-002-03` | Encryption — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-002-04` | Restricted credentials — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-002-05` | Source unavailable — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-002-06` | Destination failure — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-002-07` | Repeat execution — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-003-01` | Separate target — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-003-02` | Active source protection — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-003-03` | Restore success — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-003-04` | Restore failure — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-003-05` | Later migrations — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-003-06` | Environment isolation — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-003-07` | Provider side-effect isolation — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-004-01` | Application starts — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-004-02` | Identity/customer state — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-004-03` | Commerce authority — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-004-04` | Operational authority — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-004-05` | Reliability state — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-004-06` | Financial documents — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-004-07` | Authorization data — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-004-08` | Recovery metrics — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-005-01` | Backup interruption — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-005-02` | Restore interruption — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-005-03` | Validation failure — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-005-04` | Repeatability — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-005-05` | Cleanup protection — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-005-06` | Findings preserved — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-006-01` | Clean target import — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-006-02` | Repository migration compatibility — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-006-03` | Business validation — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-006-04` | No core vendor identity — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-006-05` | Interrupted migration — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-006-06` | Migration evidence — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-007-01` | Healthy recovery prerequisite — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-007-02` | Recovery steps — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-007-03` | Representative rehearsal — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-007-04` | Missing backup — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-007-05` | Failed rehearsal — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-007-06` | No restore-as-routine-rollback — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-008-01` | Clean-environment reproducibility — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-008-02` | Provenance — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-008-03` | Safe evidence — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-008-04` | Pass/fail summary — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |
| `AC-IMP-037-008-05` | Independent reviewability — observable recovery readiness behaviour | PostgreSQL integration / operator procedure per TEST-1; Architecture Fit pins exact layers | Planned under IMP-037 PROVE; not yet executed | Planned only — not proven |

Every mandatory AC needs passing evidence under [TEST-1](../../TESTING.md) before IMP-037 acceptance.
Planned is not proven. PostgreSQL integration claims use real PostgreSQL 18 rather than mocks.

---

## 11. Business rules

| Rule ID | User/business rule | Authority / rationale | Story / AC IDs |
|---|---|---|---|
| `BR-IMP-037-001` | A backup is not considered adequate until restoration has been successfully tested. | ADR-013 restore validation; FD-037-04 | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-002` | A restore drill must never overwrite the active/source database. | ADR-013; FD-037-07 Founder UAT isolation | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-003` | Two recovery layers remain mandatory: (1) PITR-capable continuous recovery and (2) independent encrypted logical backup. Under **D-374 / ARCH-R20**, Layer 1 is **self-managed** physical/base backup + WAL archiving to Spaces (not DigitalOcean Managed PostgreSQL provider PITR). Historical ADR-013 managed-PITR wording is not CURRENT pilot hosting authority. | ADR-013 (amended by D-374); ADR-016; FD-037-03 | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-004` | Independent backup failure must never be recorded as success. | ADR-013 backup observability | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-005` | Backup/restore administrative access must remain distinct from ordinary application runtime authority. | ADR-013 database roles / direct connections | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-006` | Independent backup artifacts must be encrypted. | ADR-013 independent encrypted logical backup | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-007` | Secrets and raw database credentials must not appear in backup/restore evidence, logs or user-visible output. | ADR-015; security boundary | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-008` | Recovery validation proves meaningful business state, not only database command exit status; RTO measurement includes that validation, and recovery-readiness PASS also requires measured RPO/RTO within FD-037-01/02 targets (AC-IMP-037-004-08). | FD-037-01; FD-037-02; TEST-1 | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-009` | A restore environment must prevent uncontrolled live provider side effects. | ADR-002 environment isolation | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-010` | Production-classified restored data must retain production-appropriate protection and must not silently become ordinary staging data. | ADR-002 | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-011` | A recovery point older than the application candidate may require later repository migrations before application validation. | ADR-013 migration discipline | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-012` | Applied migration history is not repaired by editing historical committed migrations. | ADR-013 immutable migrations | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-013` | Routine application rollback does not use database restoration. | ADR-002; FD-037-05 | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-014` | High-risk migrations require positive recovery-readiness evidence before production execution. | ADR-013; FD-037-03/07 | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-015` | A failed high-risk migration rehearsal blocks readiness. | FD-037-07 | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-016` | Migration/readiness work must preserve the source as authoritative until the target has passed validation. | FD-037-05 | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-017` | Current authoritative signed statutory artifacts stored in PostgreSQL are part of recovery verification. | Accepted CURRENT storage; FD-037-07 | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-018` | Current provider/business reconciliation evidence stored in PostgreSQL is part of recovery verification; external providers themselves are not "backed up" by BOBA Bear. | Accepted persistence boundary | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-019` | Recovery procedures must be reproducible and independently reviewable. | FD-037-06; TEST-1 | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-020` | Failure evidence is historical evidence; a later successful rerun does not erase the first failure. | TEST-1 | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-021` | No new application role or permission is implied by the Platform Operator persona. | PERSONA != ROLE/PERMISSION/AUTHORIZATION | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-022` | Exact infrastructure/operator authorization is resolved by Architecture Fit using existing infrastructure/security authority unless a genuine new authority is required. | Architecture Fit boundary | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-023` | IMP-037 does not provision the final public-production infrastructure merely to prove readiness. | FD-037-07 | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-024` | IMP-039 owns production infrastructure/release-pipeline realization where applicable. | FD-037-07; ROADMAP | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-025` | IMP-040 owns final live launch/cutover validation. | FD-037-07; ROADMAP | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-026` | Zero-downtime PostgreSQL major-version migration tooling is not introduced by IMP-037. | FD-037-05 | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-027` | No Redis, Kafka, RabbitMQ, CDC, data lake or secondary database is introduced for recovery. | ARCH-R19 / ADR-013 non-goals | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-028` | The active database remains unchanged during a recovery drill. | BR-IMP-037-002 reinforcement | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-029` | Backup artifact integrity and restore usability are separate checks; both matter. | ADR-013 | Applicable US-IMP-037-001…008 / related ACs |
| `BR-IMP-037-030` | An operator must never infer readiness solely because a configured backup schedule exists. | FD-037-04; proven recoverability | Applicable US-IMP-037-001…008 / related ACs |

**Count: 30**

---

## 12. Journey Completeness Matrix

Considered for all five IMP-037 journeys. CLI/tooling operator experience (FD-037-06).

| Journey dimension | Behaviour / applicability or N/A reason | Story / AC references |
|---|---|---|
| ENTRY | Operator invokes readiness/backup/restore/migration tooling or runbook entry with authorized context | US-IMP-037-001, 002, 003, 006, 007, 008 |
| DISCOVERY | Readiness status distinguishes PITR-capable continuous recovery vs independent logical backup layers and last evidence | AC-IMP-037-001-01…05 |
| CONTEXT | Source vs isolated target identity; environment classification; recovery artifact/point | US-IMP-037-003, 006, 008 |
| EMPTY / FIRST USE | No valid independent backup → NOT_READY (never healthy by empty config alone) | AC-IMP-037-001-02, BR-IMP-037-030 |
| HAPPY PATH | Backup succeeds with integrity; isolated restore; validation; portability; high-risk READY | AC-IMP-037-002-01, 003-03, 004-*, 006-01, 007-01…03 |
| ALTERNATE VALID PATHS | On-demand backup before high-risk migration; later migrations after older recovery point | FD-037-03; AC-IMP-037-003-05 |
| VALIDATION FAILURE | Validation fail or RPO/RTO threshold breach → FAILED / NOT_READY / BLOCKED even if restore command succeeded | AC-IMP-037-005-03; AC-IMP-037-004-08; BR-IMP-037-008 |
| AUTHORIZATION | Trusted operator/infrastructure authority only; no new app RBAC invented; Fit resolves exact auth | BR-IMP-037-005, 021, 022 |
| NOT FOUND / STALE REFERENCE | Missing/stale backup evidence → NOT_READY / BLOCKED | AC-IMP-037-001-02/04; AC-IMP-037-007-04 |
| SERVER / NETWORK ERROR | Source unavailable / destination failure → explicit FAILED; no success record | AC-IMP-037-002-05/06 |
| RECOVERY | Interrupted backup/restore guidance; repeatability without source overwrite | US-IMP-037-005 |
| CONCURRENCY | Overlapping ops must not corrupt shared target or overwrite retained backup/evidence (Fit locks mechanism) | §17; Architecture Fit |
| DESTRUCTIVE ACTION | Cleanup identifies exact non-source target; refuse ambiguous source cleanup | AC-IMP-037-005-05; §11 destructive |
| SUCCESS FEEDBACK | Verified artifact/evidence; measured RPO/RTO within FD-037-01/02 targets → READY/VERIFIED; threshold breach → BLOCKED / NOT_READY / FAILED (never PASS on restore-only success) | AC-IMP-037-002-01/02; AC-IMP-037-004-08; AC-IMP-037-008-04 |
| DOWNSTREAM EFFECT | Provider side-effects suppressed; Golden Journey continuity protected without live uncontrolled effects | AC-IMP-037-003-07; §20 |
| REVISIT / RELOAD | Evidence/runbook reproducible; findings preserved across reruns | AC-IMP-037-005-06; AC-IMP-037-008-01 |
| RESPONSIVE / MOBILE | **N/A** — approved V1 operator experience is CLI / one-shot tooling + runbook (FD-037-06), not a responsive web UI | FD-037-06 |
| ACCESSIBILITY | Applies to generated human-readable documentation/reports; if Fit introduces any GUI later, normal accessible interaction becomes mandatory | FD-037-06 |

---

## 13. UX state matrix

Operator surface = CLI / one-shot tooling + runbook + human-readable output (+ machine-readable evidence where useful). No mandatory V1 backup/restore web UI (FD-037-06).

| Surface / state | Entry condition | Visible feedback / available actions | Focus / keyboard behaviour | Next / recovery state | AC ID or N/A reason |
|---|---|---|---|---|---|
| Preconditions missing | Required source/destination/context unavailable | Safe BLOCKED with missing prerequisite | N/A (CLI) | Resolve prerequisites | Operator matrix |
| No backup yet | No valid independent evidence | NOT_READY; never healthy | N/A | Produce backup | AC-IMP-037-001-02 |
| Ready | Context visible without secrets | Source/destination/context; next action | N/A | Run backup/restore | AC-IMP-037-001-01/05 |
| Backup running | Backup started | Running + safe progress | N/A | SUCCEEDED or FAILED | US-IMP-037-002 |
| Backup success | Integrity/finalization OK | Verified recovery artifact/evidence | N/A | Retain / use for drill | AC-IMP-037-002-01/02 |
| Backup failure | Failure during backup | Explicit failure; prior known-good remains identifiable | N/A | Retry / investigate | AC-IMP-037-002-05/06; AC-IMP-037-001-03 |
| Restore running | Drill started | Target clearly ≠ source | N/A | Restore success/failure | AC-IMP-037-003-01 |
| Restore success / validation pending | Import done | Not yet READY | N/A | Run validation | BR-IMP-037-008 |
| Validation success | Critical-state checks pass and measured RPO <= 15m / RTO <= 2h | Measured VERIFIED / PASS; RPO/RTO evidence recorded | N/A | Evidence package | AC-IMP-037-004-08 |
| Validation failure | Checks fail | FAILED / NOT_READY | N/A | Preserve findings; retry | AC-IMP-037-005-03/06 |
| RPO/RTO threshold exceeded | Validation complete but measured RPO > 15m or RTO > 2h | BLOCKED / NOT_READY / FAILED; measured values + breach visible; no restore-only PASS | N/A | Preserve findings; remediate; retry | AC-IMP-037-004-08 |
| Migration rehearsal success | Portability checks pass | Evidence retained | N/A | Record READY evidence | US-IMP-037-006 |
| Migration rehearsal failure | Fail/interrupt | Target not ready; source authoritative | N/A | BLOCKED / retry | AC-IMP-037-006-05; AC-IMP-037-007-05 |
| Cleanup | Discard recovery target | Exact non-source target + consequence; cancel before destroy where meaningful | N/A | Complete cleanup without source risk | AC-IMP-037-005-05 |

Long-running operation states (product requirement; mechanism via Fit):

```text
PREFLIGHT | RUNNING | SUCCEEDED | FAILED
```

Interrupted operations must not appear as `SUCCEEDED`. Backup artifacts must not become last-known-good before integrity/finalization. Restored DBs must not become validated merely because import completed. Migrated targets must not become authoritative merely because connectivity succeeds.

---

## 14. Permissions / resource context

| Action | Existing identity / permission authority | Resource context / server-derived scope | Allowed / denied / cross-scope variants | AC IDs |
|---|---|---|---|---|
| Backup / restore / readiness / migration rehearsal | Infrastructure/operator trusted execution — **Architecture Fit** using existing infra/security authority; **not** a new application RBAC invention | Authoritative PostgreSQL source; isolated recovery target; approved backup destination | Ordinary app runtime must not be privileged backup authority; active/source restore refused; production-classified restore protected | AC-IMP-037-002-04; AC-IMP-037-003-02/06; BR-IMP-037-005/021/022 |

Do not derive authorization from the persona label.

---

## 15. Data implications

Mandatory recovery covers all authoritative PostgreSQL state required to preserve current BOBA Bear
platform truth, including as applicable:

```text
authentication / identity persistence
customer data
organization / outlet / access-control state
catalog / menu / assortment / pricing state
cart / checkout authority
orders
payments
refunds
financial documents
current durable signed-artifact bytes
operations / fulfilment
delivery records
notification records
provider-event evidence
audit evidence
transactional outbox
idempotency state
technical persistence required to interpret the database correctly
```

Exact physical schema/table enumeration belongs to Architecture Fit.

**Current signed artifacts:** CURRENT accepted statutory signed-artifact storage is PostgreSQL-backed.
Those bytes and integrity/authority records are part of mandatory database recovery validation.
If a future accepted capability moves authoritative mutable artifacts to a separate durable store,
launch recovery coverage must be revisited — do **not** invent separate object-store recovery
requirements for CURRENT signed statutory artifacts.

**Not ordinary backup payload:** plaintext secrets; production provider credentials; database
passwords; TOTP secrets exported separately from authoritative encrypted persistence; deployment
tokens; source repository; OCI image registry; DNS configuration; cloud-account credentials.
Restore environments obtain environment-specific configuration through existing ADR-015 authority.

**Retention distinction (FD-037-03):** 35-day independent logical backup rolling retention is **not**
customer-data / statutory / audit / financial-record retention policy. IMP-038 / privacy may govern
those separately.

---

## 16. Security/privacy

- Independent backup artifacts encrypted (BR-IMP-037-006).
- Secret-safe status/evidence (BR-IMP-037-007; AC-IMP-037-001-05; AC-IMP-037-008-03).
- Restricted backup credentials ≠ app runtime (BR-IMP-037-005).
- Provider side-effect suppression in restore drills (BR-IMP-037-009; AC-IMP-037-003-07).
- Production-classified restored data protection (BR-IMP-037-010).
- Positive and negative ACs covering failure, interruption, and false-success prohibition.

Unresolved mechanism details (encryption implementation, Spaces integration, credential model) are
**Architecture Fit inputs**, not product decisions.

---

## 17. Concurrency/recovery

Product requirements (mechanism via Fit):

```text
two overlapping recovery operations must not corrupt a shared target
a duplicate operator invocation must not overwrite a valid retained backup
one run must not overwrite another run's evidence
high-risk migration readiness must identify the exact backup/recovery evidence it relies on
```

Failure evidence is historical; later success does not erase first failure (BR-IMP-037-020; TEST-1).

---

## 18. Accessibility/responsive expectations

- Responsive/mobile interaction matrix: **N/A** with rationale — FD-037-06 approves CLI / one-shot
  tooling + runbook, not a V1 web UI.
- Accessibility still applies to any generated human-readable documentation/report.
- If Architecture Fit later introduces a GUI, normal accessible interaction requirements become mandatory.
- General backup/restore web UI remains **NOT_REQUIRED** for V1 and outside IMP-037 acceptance.

---

## 19. Observability/supportability

Operators must identify backup overdue/failed/unverified conditions, restore/validation failures, and
high-risk BLOCKED readiness from safe human-readable output and reviewable evidence (US-IMP-037-001,
005, 007, 008). Silent backup failure is forbidden (ADR-013; BR-IMP-037-004). Exact status/observability
mechanism is Architecture Fit.

---

## 20. Golden Journeys affected

IMP-037 does **not** invent a new customer Golden Journey.

| GJ ID / registry status | Affected steps / downstream behaviour | Mandatory for this acceptance? | Related story / AC IDs | Required proof / actual evidence |
|---|---|---|---|---|
| `GJ-FIRST-ORDER` / registry GJ-1 | Recovery validation must protect continuity of first-order commerce authority in restored state | YES — protect via safe recovery validation | US-IMP-037-004; AC-IMP-037-004-03 | Safe recovery-environment validation; **not** uncontrolled live payment/delivery/notification effects; exact TEST-1 evidence via later Fit/testing design |
| `GJ-PERMITTED-OUTLET-ACCESS` / registry GJ-1 | Organization/membership/role authority recoverable | YES — protect | AC-IMP-037-004-07 | Same safe-validation rule |
| `GJ-PAYMENT-RECOVERY` / registry GJ-1 | Payment/refund/reconciliation evidence recoverable without uncontrolled live provider effects | YES — protect | AC-IMP-037-004-03/05; AC-IMP-037-003-07 | Same safe-validation rule |

---

## 21. Dependencies

| Dependency | Authority / verified state | Required before which story or gate? | Unresolved impact |
|---|---|---|---|
| ADR-001 / ADR-002 / ADR-013 / ADR-015 / ADR-016 / D-374 / ARCH-R20 | CURRENT accepted | All IMP-037 stories | NONE for product decisions |
| IMP-036G completion / sequencing | IMP-036G `COMPLETE_AND_ACCEPTED`; IMP-037 activation satisfied (`currentProductSlice = IMP-037`; `IMP037_ACTIVATED: YES`) | SATISFIED — no remaining sequencing blocker | NONE for activation sequencing; Product Definition Gate PASS / SATISFIED; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED |
| Product Definition Gate | PASS / SATISFIED | Satisfied before Architecture Fit | NONE — gate complete; Architecture Fit PASS / architecture LOCKED; implementation authorization GRANTED |
| Architecture Fit / lock | PASS / LOCKED (independent Architecture Fit review PASS) | Satisfied before implementation authorization | NONE for Fit/lock — implementation authorization GRANTED |
| Implementation authorization | ROADMAP/STATE (PR#171/5743814105) | Before coding / implementation start | YES / PERFORMED / AUTHORIZED |
| Implementation start | ROADMAP/STATE (PR#172/5744869269) | Coding / implementation in progress | YES / PERFORMED / STARTED |
| IMP-039 | ROADMAP future | Production scheduler/HA/credentials realization | Not required for IMP-037 acceptance |
| IMP-040 | ROADMAP future | Live launch/cutover | Not required for IMP-037 acceptance |
| IMP-038 privacy/retention | Future | Broader retention policy | Backup retention ≠ statutory retention |

---

## 22. Supported now

| Behaviour | Existing verified or V1 acceptance commitment? | Story / AC IDs / source |
|---|---|---|
| Self-managed PITR-capable recovery (physical/base + WAL → Spaces) under D-374 / ARCH-R20 | **PLANNED_IMP037** Fit/implementation commitment (replaces Managed PostgreSQL provider PITR as CURRENT pilot Layer 1) | ADR-016 / D-374; ADR-013 amended; US-IMP-037-001…008 |
| Historical Managed PostgreSQL automated backups / PITR (provider layer) | **HISTORICAL** under ADR-013; **not** CURRENT pilot production authority after D-374 | ADR-013 (amended); ADR-016 |
| PostgreSQL 18 + Drizzle migration authority | CURRENT accepted | ADR-013 |
| Staging volume-repair command | CURRENT — **not** data-loss recovery proof | Problem statement |
| Independent logical backup + restore drill + validation + portability + high-risk gate + runbook | **PLANNED_IMP037** V1 acceptance commitment (this PD) | US-IMP-037-001…008 |

Proposed IMP-037 behaviour has Product Definition Gate **PASS**, Architecture Fit **PASS**
(architecture LOCKED; independent Architecture Fit review PASS), Implementation Authorization
**GRANTED**, and Implementation Start **YES**. Behaviour remains unaccepted. Repository recovery
tooling (Layer 1/Layer 2 backup/restore modules, Spaces wiring, pgBackRest, age, systemd templates,
CLI) is **MERGED** to `main` (`IMP037_REPOSITORY_IMPLEMENTATION: MERGED`); external provider/host
backup, restore, and Founder UAT remain `NOT_PERFORMED` (`IMPLEMENTATION_PERFORMED: NO`;
`IMP037_EXTERNAL_RECOVERY_PROOF: NOT_PERFORMED`; `IMP037_IMPLEMENTATION_COMPLETE: NO`;
`IMP037_ACCEPTED: NO`; `IMP037_FOUNDER_UAT: NOT_PERFORMED`). Merge does
not complete stories or prove RPO/RTO.

---

## 23. Explicitly deferred

| `EXPLICITLY_DEFERRED` behaviour | FOLLOW_UP or DEFERRED | Reason / consequence | Revisit dependency / decision owner |
|---|---|---|---|
| Final production backup scheduler deployed | FOLLOW_UP (IMP-039) | IMP-037 proves readiness; IMP-039 realizes production infrastructure | ROADMAP IMP-039 |
| Production HA / credentials / public cutover | FOLLOW_UP (IMP-039/040) | FD-037-07 boundary | ROADMAP |
| General backup/restore web UI | DEFERRED | FD-037-06 — not V1 | Future product decision if frequency/team justifies |
| Broader privacy/statutory retention policy | DEFERRED (IMP-038+) | FD-037-03 retention distinction | IMP-038 |

---

## 24. Not supported by design

| `NOT_SUPPORTED_BY_DESIGN` behaviour | Reason / authority | User-visible boundary / relevant AC |
|---|---|---|
| Production web-based database administration / backup-restore console | FD-037-06 | CLI/runbook only for V1 |
| Customer-facing or workforce self-service backup controls | Non-goal | Outside IMP-037 |
| Automatic production disaster failover | Non-goal | Outside IMP-037 |
| Zero-downtime live provider exit; DNS/traffic switching; active-active; multi-region DB migration; automated PostgreSQL major-version migration | FD-037-05 | Migration readiness = portability proof only |
| Redis / Kafka / RabbitMQ / CDC / data warehouse / database-per-module / database-per-tenant | ADR-013 / ARCH-R19 | BR-IMP-037-027 |
| Routine database restore as application rollback | ADR-002; FD-037-05 | AC-IMP-037-007-06 |
| Generic production cloning service; automatic anonymization engine | Non-goal | Outside IMP-037 |
| Destructive source replacement during drills | BR-IMP-037-002/028 | AC-IMP-037-003-02 |
| Claiming IMP-039/040 completion via IMP-037 acceptance | FD-037-07 | BR-IMP-037-023/024/025 |

---

## 25. Unresolved / decision required

| `UNRESOLVED_DECISION_REQUIRED` item | Material user/business impact | Decision owner / evidence needed | Affected stories / gate |
|---|---|---|---|
| NONE | Founder product decisions FD-037-01…07 are APPROVED; `UNRESOLVED_PRODUCT_DECISIONS = 0` | N/A | Product-decision prerequisite SATISFIED; Architecture Fit PASS / architecture LOCKED; next gate = independent architecture review then implementation authorization |

### Founder decisions (APPROVED) — product requirements

```text
FD-037-01: APPROVED
RPO_TARGET <= 15 minutes
(target, not universal zero-data-loss guarantee; achievement proven by mechanisms + evidence)

FD-037-02: APPROVED
RTO_TARGET <= 2 hours
Recovery incomplete until required application/business-integrity validation completes
(not merely database socket available). Restore drills measure achieved recovery time.

FD-037-03: APPROVED
INDEPENDENT_LOGICAL_BACKUP_FREQUENCY: at least daily
ROLLING_RETENTION: 35 days
HIGH_RISK_MIGRATION: fresh recovery evidence when applicable
Backup retention ≠ statutory/customer/audit/financial retention policy (IMP-038 separate).

FD-037-04: APPROVED
PRE_PUBLIC_LAUNCH: successful full restore drill mandatory
POST_LAUNCH: at least quarterly
REPEAT_AFTER: material backup/restore mechanism change; material persistence change affecting recovery;
              material database/platform recovery change
Ordinary application releases do not independently require a full restore drill.

FD-037-05: APPROVED
IMP-037 proves PostgreSQL portability/recovery readiness
EXCLUDE: live production/cloud cutover; DNS/traffic switching; zero-downtime provider exit;
         active-active/multi-region migration; automated PostgreSQL major-version migration
Production infrastructure/cutover remain IMP-039 / IMP-040.

FD-037-06: APPROVED
V1_OPERATOR_EXPERIENCE = CLI / one-shot tooling + documented runbook + safe human-readable output
                         + machine-readable evidence where useful
WEB BACKUP/RESTORE UI = NOT_REQUIRED for V1 / outside IMP-037 acceptance

FD-037-07: APPROVED
IMP-037 acceptance = repository-supported proven backup→restore→validate→migration-readiness
                     + evidence + independent review + Founder UAT
Does NOT claim final production scheduling, HA, production credentials, or public cutover complete
FOUNDER_UAT_REQUIRED = YES
IMP-039 = production infrastructure / release realization
IMP-040 = live launch / cutover validation
```

**Founder decision interpretation (unchanged decisions; acceptance binding):**

```text
MEASURED_RPO <= 15m AND MEASURED_RTO <= 2h → recovery objective PASS (qualifying scenarios)
either threshold exceeded → readiness BLOCKED / NOT_READY → IMP-037 acceptance cannot PASS
  on that evidence (AC-IMP-037-004-08)
RPO/RTO remain targets for qualifying recovery scenarios, not a universal zero-data-loss
  or universal-availability guarantee (FD-037-01 / FD-037-02)
RTO timing includes required application/business-integrity validation
  (not merely PostgreSQL availability)
```

### Architecture Fit inputs (RESOLVED by locked capability architecture — not product decisions)

Architecture Fit against ARCH-R20 / D-374 is **PASS**. Locked mechanism selections live in
[`docs/platform/capabilities/IMP-037-backup-restore-migration-readiness.md`](../../capabilities/IMP-037-backup-restore-migration-readiness.md).
The following were Fit inputs; they are no longer unresolved product or Fit blockers. Bounded
engineering detail remains implementation-deferred inside that lock:

```text
backup execution location → one-shot tooling + host systemd timers / Compose (locked)
restricted direct DB credential model → capability-scoped read-only logical-backup role (locked; grants deferred)
logical backup encryption implementation → age public-key (locked)
Spaces integration → two private buckets; no distributed mutex (locked)
local/CI/staging validation substitute → synthetic/disposable + provider integration + Founder drill tiers (locked)
artifact identity/checksum → RUN_ID + SHA-256 + COMPLETE-last (locked)
backup finalization lifecycle → COMPLETE marker last (locked)
restore target safety mechanism → fresh unique targets; RESTORE_TO_ACTIVE_SOURCE FORBIDDEN (locked)
source-target identity protection → fail-closed (locked)
provider-side-effect suppression → fail-closed isolated network (locked)
post-restore migration compatibility → ADR-002/013 forward-only; Layer 2 portability (locked)
critical-state verification / signed-artifact / observability → evidence obligations (locked; syntax deferred)
production scheduling boundary → host timers; no always-on backup service (locked)
retention-enforcement mechanism → Layer 1 pgBackRest-owned; Layer 2 age-based 35-day rolling COMPLETE runs (locked)
parallel-run serialization → host-local flock for scheduled/heavy ops; WAL not blocked (locked)
schema-change / new-service / application RBAC → NO (locked)
D-374 / ARCH-R20 → already CURRENT; D375/ARCH-R21 not required (locked)
```

Do not create D-375 / ARCH-R21 merely to document IMP-037 details. Implementation details remain
deferred without reopening product decisions.

---

## 26. Definition of Ready

| Story ID | Applicable fields complete / evidence | Open material decisions | Readiness / blocker |
|---|---|---|---|
| `US-IMP-037-001` | Complete in §9 | NONE | Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; IMPLEMENTATION_IN_PROGRESS because implementation AUTHORIZED / STARTED; story not complete |
| `US-IMP-037-002` | Complete in §9 | NONE | Same |
| `US-IMP-037-003` | Complete in §9 | NONE | Same |
| `US-IMP-037-004` | Complete in §9 | NONE | Same |
| `US-IMP-037-005` | Complete in §9 | NONE | Same |
| `US-IMP-037-006` | Complete in §9 | NONE | Same |
| `US-IMP-037-007` | Complete in §9 | NONE | Same |
| `US-IMP-037-008` | Complete in §9 | NONE | Same |

---

## 27. Product Definition Gate record

```text
PRODUCT_DEFINITION_GATE
Capability: IMP-037 — Backup, Restore & Migration Readiness
Product Definition Version: PD-IMP-037-DRAFT-1
Business Outcome: Proven recoverability before public launch (§2)
Primary Personas: PERSONA-PLATFORM-OPERATOR
Journeys Defined: YES (5)
Story Map Complete: YES (8 stories)
Acceptance Slice Defined: YES
Happy Paths Defined: YES
Alternate Paths Defined: YES
Empty / First-Use States Defined: YES
Error / Recovery Paths Defined: YES
Authorization Variants Defined: YES (infra/operator; Fit for exact auth)
Cross-Scope Scenarios Defined: YES (source vs target; environment isolation)
Concurrency Considered: YES (§17)
Destructive Actions Defined: YES
UX State Matrix Complete: YES (CLI/operator)
Accessibility Considered: YES (docs/reports; responsive N/A with rationale)
Golden Journeys Identified: YES (protect GJ-FIRST-ORDER / GJ-PERMITTED-OUTLET-ACCESS / GJ-PAYMENT-RECOVERY)
Explicit Deferrals Recorded: YES (§23–24)
Unresolved Product Decisions: 0
Architecture Conflicts: NONE identified against ADR-001/002/013/015/016 / D-374 / ARCH-R20 for product requirements
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
```

Product Definition Gate execution was performed on 2026-09-19 against exact candidate
`PD-IMP-037-DRAFT-1`. Human Founder / product governance authority authorized Gate Result = PASS
after independent pre-gate review PASS. The later gate-persistence commit is **not** the
evaluated artifact (`gate-persistence commit != gate-evaluated candidate`).

```text
GATE_EVALUATED_HEAD = fccdf7ef606ca906bcdcd706a6de97f693bb88b4
GATE_EVALUATED_TREE = 1477d12b5c5b3b0ccb8d488757516d5b6e637674
GATE_EVALUATED_PRODUCT_DEFINITION_BLOB = eb792d02dbfede862a0bb104a754d14d875141aa
GATE_EVALUATED_WORKING_TREE_FINGERPRINT = 9be2a43fe3881ccd28f169f60209cef3c78c991524e5e9d34a8b657e1b1f0c19
GATE_DATE = 2026-09-19
GATE_APPROVAL_AUTHORITY = Founder / product governance human authority
INDEPENDENT_PRE_GATE_REVIEW = PASS
EXACT_MAIN_CI = 35382560066 SUCCESS
GATE_PERSISTENCE_COMMIT = subsequent commit after this gate-pass persistence revision
  (this persistence revision is NOT the artifact evaluated by the gate)
CURRENT_PR_HEAD / GATE_PERSISTENCE_COMMITS = later persistence/correction commits on the PR branch;
  they are NOT the candidate that received Product Definition Gate PASS
```

---

## 28. Acceptance proof (TEST-1)

Under TEST-1, IMP-037 requires meaningful proof of:

```text
backup success
backup failure
artifact-integrity failure
destination/storage failure
no-secret evidence
source protection
isolated restore
restore interruption
migration application after recovery point
application startup against recovered state
critical domain-state validation
signed-artifact recovery
outbox/idempotency recovery
provider-side-effect suppression
measured recovery point/time against RPO <= 15m / RTO <= 2h targets
(RTO includes application/business-integrity validation; either threshold exceeded →
 readiness BLOCKED / NOT_READY / FAILED — IMP-037 acceptance cannot PASS on that evidence;
 technical restore success alone is insufficient)
portable clean-target migration
migration interruption
high-risk-migration readiness PASS
high-risk-migration readiness BLOCK
repeatability
independent evidence review
```

PostgreSQL integration claims use real PostgreSQL 18 rather than mocks. Preserve first failure;
later success does not erase it.

---

## 29. Founder UAT

```text
FOUNDER_UAT_REQUIRED = YES
FOUNDER_UAT_STATUS = NOT_PERFORMED
```

Rationale: launch-critical, high-consequence recovery capability.

Expected future Founder UAT (isolated rehearsal of exact candidate):

```text
isolated backup
restore
application validation
critical-state checks
measured recovery evidence (RPO <= 15m and RTO <= 2h required for PASS;
  threshold breach remains visible and blocks acceptance)
operator runbook usability
```

**Never** use the active production/source database as the drill destination.

---

## 30. Current readiness status

```text
ANCHOR: COMPLETE
DISCOVER: COMPLETE
STORY_MAP: COMPLETE
STORIES: 8
ACCEPTANCE_SCENARIOS: 50
BUSINESS_RULES: 30
PRODUCT_DECISIONS: 7
UNRESOLVED_PRODUCT_DECISIONS: 0

PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
PRODUCT_DEFINITION: APPROVED
ARCHITECTURE_FIT_EXECUTION: PERFORMED
ARCHITECTURE_FIT: PASS
ARCHITECTURE_FIT_RESULT: PASS
ARCHITECTURE_LOCKED: YES
IMP037_ARCHITECTURE_LOCKED: YES
IMP037_ACTIVATED: YES
IMPLEMENTATION_AUTHORIZED: YES
IMPLEMENTATION_STARTED: YES
IMP037_IMPLEMENTATION_AUTHORIZED: YES
IMP037_STARTED: YES
IMP037_ACCEPTED: NO
IMP038_ACTIVATED: YES
IMP038_ACCEPTANCE_BLOCKED_BY_IMP037: YES
CONTINUATION_EXCEPTION: IMP037_PROVIDER_BLOCKED_TO_IMP038
IMPLEMENTATION_AUTHORIZATION_EVIDENCE: PR#171/5743814105
IMPLEMENTATION_START_EVIDENCE: PR#172/5744869269
INDEPENDENT_ARCHITECTURE_FIT_REVIEW: PASS
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_HEAD: d74ca9a30096fb14bca80643b75aa19d33093dde
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_TREE: 09c7e3bd6b7832944d07d527c149752ed3bbeb4d
INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID: 5256273904
```

Next phase for IMP-037: **continued external/provider recovery proof when operator access exists**,
then independent acceptance — **not** waived by controlled continuation.
`IMP037_ACTIVATED: YES` remains; under continuation `currentProductSlice = IMP-038`
(`acceptedThrough` IMP-036G; IMP-037 formal lifecycle IMPLEMENTATION_IN_PROGRESS; provider-blocked).
Product Definition Gate = PASS; Architecture Fit PASS; architecture LOCKED;
implementation AUTHORIZED / STARTED (authorization evidence PR#171/5743814105; start evidence
PR#172/5744869269). Stories are not complete.
IMP-038 is activated with Product Definition APPROVED / Gate PASS (`IMP038_ACTIVATED: YES`;
`PD-IMP-038-DRAFT-2` APPROVED; Gate PASS; Architecture Fit NOT_PERFORMED; implementation NOT_AUTHORIZED / NOT_STARTED;
`IMP038_ACCEPTANCE_BLOCKED_BY_IMP037: YES`).
