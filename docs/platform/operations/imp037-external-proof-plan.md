# IMP-037 external-proof readiness plan (supporting)

Supporting **planning-only** artifact for **IMP-037 — Backup, Restore & Migration Readiness**.

This file is **not** lifecycle authority. ROADMAP / STATE remain sole lifecycle authority.
Locked architecture semantics are unchanged. Product Definition requirements are unchanged.

```text
DOCUMENT_ROLE: SUPPORTING_OPS_PROOF_PLAN
LIFECYCLE_AUTHORITY: NO
ARCHITECTURE_LOCK_CHANGED: NO
PRODUCT_DEFINITION_SEMANTICS_CHANGED: NO

IMP037_REPOSITORY_IMPLEMENTATION: MERGED
IMP037_EXTERNAL_RECOVERY_PROOF: NOT_PERFORMED
IMP037_IMPLEMENTATION_COMPLETE: NO
IMP037_ACCEPTED: NO
IMP037_FOUNDER_UAT: NOT_PERFORMED
FOUNDER_UAT: NOT_PERFORMED
IMP038_ACTIVATED: NO

RPO_RTO_PROVEN: NO
DROPLET_2GIB_RTO_VALIDATED: NO
STORAGE_CAPACITY_VALIDATED: NO
REAL_SPACES: NOT_PERFORMED
SYSTEMD_HOST_INSTALL: NOT_PERFORMED
PRODUCTION_BACKUP_RESTORE: NOT_PERFORMED
OFF_HOST_SECRET_CUSTODY: NOT_PERFORMED

PHASE1_ATTEMPTED: YES
PHASE1_RESULT: BLOCKED
PHASE1_BLOCK_STATUS: BLOCKED_PROVIDER_ACCESS
PHASE1_EVIDENCE: docs/platform/operations/evidence/imp037-phase1-provider-custody-2026-09-21.md

ATTEMPT_1_RESULT: BLOCKED_SECRET_CUSTODY_DECISION
ATTEMPT_1_INDEPENDENT_REVIEW: 5266114565
ATTEMPT_2_RESULT: BLOCKED_PROVIDER_ACCESS
ATTEMPT_2_R3_AUTHORIZATION: 5759893209
ATTEMPT_2_CUSTODY_MODEL: FOUNDER_CONTROLLED_OFFLINE_RECOVERY_KIT

CUSTODY_DECISION_RESOLVED: YES
CUSTODY_MODEL_APPROVED: YES
CUSTODY_EXECUTION: NOT_PERFORMED
OFF_HOST_SECRET_CUSTODY: NOT_PERFORMED

PROVIDER_ACCESS: BLOCKED
PROVIDER_DEPENDENT_PROOF: DEFERRED_PENDING_PROVIDER_ACCESS
PROVIDER_DEFERRAL_HUMAN_EVIDENCE: PR#176/5760581348
REAL_SPACES: NOT_PERFORMED

RESUME_CONDITION:
  DIGITALOCEAN_OPERATOR_ACCESS_AVAILABLE
  +
  FRESH_EXPLICIT_R3_PHASE1_CONTINUATION

DO_NOT_START_PHASE_2
DO_NOT_START_QUALIFYING_PHASE2_PROVIDER_PROOF

NOTE:
  Provider-dependent proof is deferred.
  IMP-037 itself is NOT deferred, NOT accepted, and remains IMPLEMENTATION_IN_PROGRESS.
```

This plan defines the future **explicit R3** proof campaign. It does **not** authorize or
execute any live DigitalOcean mutation, systemd install, production backup/restore, or Founder UAT.

Canonical references:

- Product Definition: [`../product/IMP-037/product-definition.md`](../product/IMP-037/product-definition.md)
- Locked capability: [`../capabilities/IMP-037-backup-restore-migration-readiness.md`](../capabilities/IMP-037-backup-restore-migration-readiness.md)
- Operator runbook: [`imp037-recovery-runbook.md`](./imp037-recovery-runbook.md)
- Repository evidence: [`imp037-implementation-evidence.md`](./imp037-implementation-evidence.md)

---

## Semantic distinction (binding for this plan)

| Marker | Meaning | Current |
|---|---|---|
| `REPOSITORY_IMPLEMENTATION` | Recovery tooling code/templates merged to `main` | `MERGED` |
| `EXTERNAL_RECOVERY_PROOF` | Real provider/host backup + isolated restore + measurements | `NOT_PERFORMED` |
| `IMPLEMENTATION_PERFORMED` | Same sense as capability: actual backup/restore/proof execution | `NO` |
| `IMPLEMENTATION_COMPLETE` | Qualifying proof done; ready for independent technical acceptance | `NO` |
| `ACCEPTED` / `IMP037_ACCEPTED` | Formal lifecycle acceptance | `NO` |
| `FOUNDER_UAT` | Founder interactive UAT of exact accepted technical candidate | `NOT_PERFORMED` |

Do **not** conflate repository merge with proof, completion, or acceptance.

---

## PHASE 1 — PROVIDER / CUSTODY PRECONDITIONS

Future explicit **R3 only**. No live action from this plan.

Required before Phase 2:

- Two distinct private DigitalOcean Spaces buckets
  - physical / pgBackRest repository bucket (Layer 1)
  - logical backup bucket (Layer 2)
- Bucket versioning confirmed **ENABLED** on both
- Separate limited credentials for each bucket (no shared over-privileged key)
- Layer 1 encryption passphrase recoverable **off-host**
- Layer 2 age private identity recoverable **off-host**
- Old-generation / old-identity custody requirements retained through the required window
- Explicit non-claims retained:
  - no WORM / object-lock claim (`SPACES_VERSIONING_IS_IMMUTABILITY: NO`)
  - versioning ≠ immutability

Exit criteria (planning): custody checklist completed under R3 authorization; credentials/secrets
never committed to the repository; evidence paths record presence/absence without secret material.

### Phase 1 attempts (2026-09-21) — BLOCKED

Secret-safe evidence (authoritative detail):

[`evidence/imp037-phase1-provider-custody-2026-09-21.md`](./evidence/imp037-phase1-provider-custody-2026-09-21.md)

```text
PHASE1_ATTEMPTED: YES
PHASE1_RESULT: BLOCKED
PHASE1_BLOCK_STATUS: BLOCKED_PROVIDER_ACCESS
DO_NOT_START_PHASE_2
```

#### Attempt 1 (historical) — `BLOCKED_SECRET_CUSTODY_DECISION`

Under R3 authorization PR #175 comment `5759504746`, Gate 0 exact-main CI run
`35592155769` on `6e5553257fbd2498a606cda27b9ec9c6aebda7f9` was verified **SUCCESS**.

```text
ATTEMPT_1_RESULT: BLOCKED_SECRET_CUSTODY_DECISION
ATTEMPT_1_INDEPENDENT_REVIEW: 5266114565
BLOCKED_SECRET_CUSTODY_DECISION: YES
  (historical — off-host custody mechanism was still deferred under ADR-015 /
   locked §8.1 at Attempt 1; no existing approved custody_reference found;
   none invented)
SECONDARY: ENVIRONMENT_BLOCKER
  (no DigitalOcean API/Spaces credentials or doctl/aws CLI on operator host;
   Spaces inventory/create/versioning/credential isolation NOT_VERIFIED)
LIVE_MUTATIONS: NONE
BACKUP_RESTORE: NOT_PERFORMED
```

#### Attempt 2 — `BLOCKED_PROVIDER_ACCESS` (current)

Human R3 continuation authorization PR #176 comment `5759893209` resolved the
custody decision and approved `FOUNDER_CONTROLLED_OFFLINE_RECOVERY_KIT`.

```text
ATTEMPT_2_RESULT: BLOCKED_PROVIDER_ACCESS
ATTEMPT_2_R3_AUTHORIZATION: 5759893209
ATTEMPT_2_CUSTODY_MODEL: FOUNDER_CONTROLLED_OFFLINE_RECOVERY_KIT

CUSTODY_DECISION_RESOLVED: YES
CUSTODY_MODEL_APPROVED: YES
CUSTODY_EXECUTION: NOT_PERFORMED
OFF_HOST_SECRET_CUSTODY: NOT_PERFORMED
  (no custody kits created; no Layer 1 passphrase generated;
   no Layer 2 age identity generated)

PROVIDER_ACCESS: BLOCKED
REAL_SPACES: NOT_PERFORMED
  (no provider inventory; no provider mutations)
CURRENT_BLOCKER: DigitalOcean operator access unavailable on the operator host
LIVE_MUTATIONS: NONE
BACKUP_RESTORE: NOT_PERFORMED
```

Phase 1 did **not** PASS. Current blocker is provider access, not the custody
decision. Do **not** start Phase 2 until Phase 1 PASS is recorded under a
subsequent R3 gate.

---

## PHASE 2 — REAL BACKUP PROOF

Future explicit **R3**. Uses real provider destinations prepared in Phase 1.

### Layer 1 (pgBackRest)

- Initialize positively bound repository generation
- `stanza-create`
- `check`
- Full backup
- Differential backup
- Continuous WAL evidence
- `info --output=json`
- `verify`

### Layer 2 (logical)

- Restricted logical-backup role
- `pg_dump -Fc`
- age encryption
- Real logical Spaces upload
- Remote SHA verification
- Evidence persisted
- `COMPLETE` marker written **last**
- Decryptability proof

Exit criteria: both layers produce independently reviewable evidence artifacts with no secrets
leaked; `COMPLETE` never precedes remote verification for Layer 2.

---

## PHASE 3 — ISOLATED RECOVERY / PORTABILITY DRILL

Must **never** restore into the authoritative source.

Exercise:

- Fresh recovery target
- PITR to a selected point
- Logical restore path
- Later repository migrations where applicable
- Application startup on recovered target
- Business-integrity validation
- Provider suppression (no live payment/message/webhook/provider side effects)
- Clean PostgreSQL 18 portability rehearsal
- Source remains authoritative / unmodified
- Failed / interrupted paths
- Repeated execution
- Retained findings (first failure remains visible after later success)

Exit criteria: source protection demonstrated; isolated target validated; interruption and
repeatability evidence retained.

---

## PHASE 4 — MEASUREMENTS

Capture (do **not** claim PASS until measured under R3):

| Metric | Target | Current claim |
|---|---|---|
| Achieved RPO | `<= 15 minutes` | `RPO_RTO_PROVEN: NO` |
| Achieved end-to-end RTO (restore + migration + application startup + business validation) | `<= 2 hours` | `RPO_RTO_PROVEN: NO` |
| Pilot-size environment | Actual pilot Droplet | `DROPLET_2GIB_RTO_VALIDATED: NO` |
| 2 GiB / 1 vCPU result | Recorded | `NO` |
| Layer 1 base usage | Recorded | `STORAGE_CAPACITY_VALIDATED: NO` |
| WAL / archive usage | Recorded | `NO` |
| Layer 2 usage | Recorded | `NO` |
| Version-history usage | Recorded | `NO` |
| Projected 35-day footprint | Recorded | `NO` |

---

## PHASE 5 — READINESS GATE

Demonstrate:

- Healthy `READY` case
- Stale / missing backup ⇒ `BLOCKED`
- Newer failure ⇒ `BLOCKED`
- Failed recovery rehearsal ⇒ `BLOCKED`
- No restore-as-routine-rollback
- Retained evidence independently reviewable

---

## PHASE 6 — FOUNDER UAT (planning only)

```text
FOUNDER_UAT: NOT_PERFORMED
```

Founder UAT MUST use the **exact** independently technically accepted candidate produced after
qualifying proof (canonical path, branch, `HEAD`, `WORKING_TREE_FINGERPRINT`).

Operator checklist (preparation only — do **not** execute UAT from this plan):

See [`imp037-founder-uat-checklist.md`](./imp037-founder-uat-checklist.md).

Founder should be able to verify at minimum:

1. Exact candidate / provenance
2. Current recovery status
3. Finalized recovery artifact / point
4. Isolated recovery target
5. Source protection
6. Restored application / business validation result
7. Measured RPO
8. Measured RTO
9. High-risk readiness result
10. Failure / blocked evidence behavior
11. Evidence contains no secrets
12. No live payment / message / webhook / provider side effects

**Founder alone** supplies `PASS` / `FAIL`. Agents must never pre-fill `FOUNDER_UAT = PASS`.

---

## Explicit non-actions of this artifact

This plan does **not**:

- create Spaces buckets
- mutate Spaces versioning
- create / change credentials
- create / rotate encryption secrets
- initialize a real remote pgBackRest repo
- run a real provider backup
- install / enable systemd on a host
- perform production backup / restore
- run Founder UAT
- claim RPO / RTO PASS
- mark `STORAGE_CAPACITY_VALIDATED=YES`
- change acceptance state
- activate IMP-038

---

## 50-AC proof matrix

All 50 mandatory acceptance scenarios. External columns remain **required / not passed**.
Do not mark external requirements passed from repository merge alone.

Legend for proof columns:

- `REPO` = repository automated proof present (local/CI)
- `PROVIDER` = real DigitalOcean Spaces / provider proof required
- `PILOT` = pilot environment (incl. 2 GiB Droplet) proof required
- `FOUNDER` = Founder UAT required
- `ARTIFACT` = primary qualifying evidence artifact family to collect under R3

| AC | Title | REPO | PROVIDER | PILOT | FOUNDER | QUALIFYING_EVIDENCE_ARTIFACT |
|---|---|---|---|---|---|---|
| AC-IMP-037-001-01 | Healthy evidence | YES | YES | NO | YES | readiness status evidence pack (READY) |
| AC-IMP-037-001-02 | No backup evidence | YES | YES | NO | YES | readiness BLOCKED / NOT_READY empty-evidence run |
| AC-IMP-037-001-03 | Failed backup | YES | YES | NO | YES | failed backup evidence retained |
| AC-IMP-037-001-04 | Overdue backup | YES | YES | NO | YES | stale/overdue readiness evidence |
| AC-IMP-037-001-05 | Secret-safe status | YES | YES | NO | YES | redacted status/logs/evidence review |
| AC-IMP-037-002-01 | Successful backup | PARTIAL | YES | NO | YES | Layer1 full+diff+WAL + Layer2 COMPLETE run |
| AC-IMP-037-002-02 | Integrity evidence | YES | YES | NO | YES | verify / remote SHA evidence |
| AC-IMP-037-002-03 | Encryption | YES | YES | NO | YES | Layer1 cipher + Layer2 age ciphertext proof |
| AC-IMP-037-002-04 | Restricted credentials | PARTIAL | YES | NO | YES | logical-backup role + limited Spaces creds |
| AC-IMP-037-002-05 | Source unavailable | YES | YES | NO | NO | FAILED evidence; no COMPLETE |
| AC-IMP-037-002-06 | Destination failure | YES | YES | NO | NO | FAILED evidence; no COMPLETE |
| AC-IMP-037-002-07 | Repeat execution | YES | YES | NO | NO | retained multi-run artifacts |
| AC-IMP-037-003-01 | Separate target | YES | YES | YES | YES | fresh recovery target identity evidence |
| AC-IMP-037-003-02 | Active source protection | YES | YES | YES | YES | refuse-to-source evidence |
| AC-IMP-037-003-03 | Restore success | PARTIAL | YES | YES | YES | PITR + logical restore success packs |
| AC-IMP-037-003-04 | Restore failure | YES | YES | YES | YES | FAILED restore; source unchanged |
| AC-IMP-037-003-05 | Later migrations | PARTIAL | NO | YES | YES | post-restore migrate evidence |
| AC-IMP-037-003-06 | Environment isolation | YES | NO | YES | YES | isolation classification evidence |
| AC-IMP-037-003-07 | Provider side-effect isolation | YES | NO | YES | YES | provider-suppression evidence |
| AC-IMP-037-004-01 | Application starts | PARTIAL | NO | YES | YES | recovered app startup evidence |
| AC-IMP-037-004-02 | Identity/customer state | YES | NO | YES | YES | business-integrity identity pack |
| AC-IMP-037-004-03 | Commerce authority | YES | NO | YES | YES | business-integrity commerce pack |
| AC-IMP-037-004-04 | Operational authority | YES | NO | YES | YES | business-integrity ops pack |
| AC-IMP-037-004-05 | Reliability state | YES | NO | YES | YES | business-integrity reliability pack |
| AC-IMP-037-004-06 | Financial documents | YES | NO | YES | YES | financial-document + signed bytes pack |
| AC-IMP-037-004-07 | Authorization data | YES | NO | YES | YES | authorization-state pack |
| AC-IMP-037-004-08 | Recovery metrics | PARTIAL | YES | YES | YES | measured RPO/RTO evidence |
| AC-IMP-037-005-01 | Backup interruption | YES | YES | NO | NO | incomplete-run evidence; no COMPLETE |
| AC-IMP-037-005-02 | Restore interruption | YES | YES | YES | YES | interrupted restore FAILED pack |
| AC-IMP-037-005-03 | Validation failure | YES | NO | YES | YES | validation FAILED pack |
| AC-IMP-037-005-04 | Repeatability | YES | YES | YES | NO | multi-run retained artifacts |
| AC-IMP-037-005-05 | Cleanup protection | YES | YES | YES | NO | ambiguous-target refuse evidence |
| AC-IMP-037-005-06 | Findings preserved | YES | YES | YES | YES | first-failure retained after rerun |
| AC-IMP-037-006-01 | Clean target import | PARTIAL | NO | YES | YES | PG18 clean-target import pack |
| AC-IMP-037-006-02 | Repository migration compatibility | PARTIAL | NO | YES | YES | later-migration compatibility pack |
| AC-IMP-037-006-03 | Business validation | PARTIAL | NO | YES | YES | portability business-validation pack |
| AC-IMP-037-006-04 | No core vendor identity | PARTIAL | NO | YES | YES | vendor-identity absence check |
| AC-IMP-037-006-05 | Interrupted migration | YES | NO | YES | NO | interrupted migration FAILED pack |
| AC-IMP-037-006-06 | Migration evidence | YES | NO | YES | YES | migration evidence pack |
| AC-IMP-037-007-01 | Healthy recovery prerequisite | YES | YES | YES | YES | high-risk READY case |
| AC-IMP-037-007-02 | Recovery steps | YES | YES | YES | YES | gate step inventory evidence |
| AC-IMP-037-007-03 | Representative rehearsal | PARTIAL | YES | YES | YES | representative drill pack |
| AC-IMP-037-007-04 | Missing backup | YES | YES | YES | YES | gate BLOCKED missing-backup |
| AC-IMP-037-007-05 | Failed rehearsal | YES | YES | YES | YES | gate BLOCKED failed-rehearsal |
| AC-IMP-037-007-06 | No restore-as-routine-rollback | YES | NO | YES | YES | policy/refuse evidence |
| AC-IMP-037-008-01 | Clean-environment reproducibility | PARTIAL | YES | YES | YES | clean-env reproduction pack |
| AC-IMP-037-008-02 | Provenance | YES | YES | YES | YES | SHA/tree/fingerprint provenance |
| AC-IMP-037-008-03 | Safe evidence | YES | YES | YES | YES | secret-free evidence review |
| AC-IMP-037-008-04 | Pass/fail summary | YES | YES | YES | YES | run summary artifact |
| AC-IMP-037-008-05 | Independent reviewability | PARTIAL | YES | YES | YES | reviewer-usable evidence index |

**Matrix count:** 50

`PARTIAL` under REPO means repository automation/tooling exists but qualifying acceptance still
requires the marked external columns.

---

## Recommended R3 execution order

```text
PHASE 1 (custody/provider preconditions)
  → PHASE 2 (real Layer1 + Layer2 backup proof)
  → PHASE 3 (isolated recovery / portability)
  → PHASE 4 (RPO/RTO + capacity measurements)
  → PHASE 5 (readiness gate READY + BLOCKED cases)
  → independent technical acceptance of exact proof candidate
  → PHASE 6 (Founder UAT of that exact candidate)
  → ACCEPTANCE + RECONCILIATION (separate R3)
```

Stop between phases at each genuine human R3 boundary. Do not invent missing product,
security, payment, or custody decisions.
