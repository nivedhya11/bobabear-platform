<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-037",
  "title": "Backup, Restore & Migration Readiness",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "architectureFit": "PASS",
  "architectureFitResult": "PASS",
  "implementationAuthorized": true,
  "implementationStarted": true,
  "implementation": "AUTHORIZED / STARTED",
  "impAccepted": false,
  "founderUatRequired": true,
  "schemaChangeRequired": false,
  "lastReviewed": "2026-09-21",
  "productDefinition": "PD-IMP-037-DRAFT-1",
  "bindingDecisions": ["D-374", "ADR-016", "ADR-002", "ADR-013", "ADR-015"],
  "dependsOn": ["IMP-004", "IMP-005", "IMP-005A", "IMP-036G"],
  "architectureBase": "ARCH-R20"
}
-->

# IMP-037 — Backup, Restore & Migration Readiness

## Capability Architecture — ARCHITECTURE_LOCKED

This document is the **locked capability architecture** for IMP-037. It records a **fresh**
Architecture Fit performed against **ARCH-R20 / D-374 / ADR-016** (cost-optimized pilot
infrastructure: single DigitalOcean Basic Droplet + Docker Engine/Compose + self-hosted
PostgreSQL 18 + DigitalOcean Spaces off-host backups).

Independent (ChatGPT) Architecture Fit review is **PASS** for the architecture-persistence
candidate (distinct from the Fit-evaluated `main` artifact below). Implementation is
**AUTHORIZED** / **STARTED** (`IMPLEMENTATION_IN_PROGRESS`; authorization evidence
PR#171/5743814105; start evidence PR#172/5744869269). Repository recovery tooling — including
Layer 1 pgBackRest runners, Layer 2 pg_dump+age, restore/PITR/logical modules, readiness gate,
capacity, systemd templates, and CLI — has **merged** to `main` via PR #174
(`IMP037_REPOSITORY_IMPLEMENTATION_MERGED: YES`). Merge does **not** complete external recovery
proof, accept IMP-037, or activate IMP-038. Required provider/host backup/restore execution
remains `IMPLEMENTATION_PERFORMED: NO` / `EXTERNAL_RECOVERY_PROOF: NOT_PERFORMED`.

```text
ARCHITECTURE_FIT: PASS
ARCHITECTURE_FIT_EXECUTION: PERFORMED
ARCHITECTURE_FIT_RESULT: PASS
IMP037_ARCHITECTURE_LOCKED: YES
ARCHITECTURE_LOCKED = YES
INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PASS
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_HEAD = d74ca9a30096fb14bca80643b75aa19d33093dde
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_TREE = 09c7e3bd6b7832944d07d527c149752ed3bbeb4d
INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID = 5256273904

IMPLEMENTATION_AUTHORIZED: YES
IMPLEMENTATION_STARTED: YES
IMP037_IMPLEMENTATION_AUTHORIZED: YES
IMP037_STARTED: YES
IMP037_REPOSITORY_IMPLEMENTATION_MERGED: YES
IMP037_IMPLEMENTATION_PR: 174
IMP037_IMPLEMENTATION_REVIEWED_HEAD: ae7328efe1add11a9a4299150251fe14c71b2730
IMP037_IMPLEMENTATION_REVIEWED_TREE: 4ff19a31db947cafadf690cf6bf1b6d2f1de14ac
IMP037_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP037_INDEPENDENT_IMPLEMENTATION_REVIEW_ID: 5265354130
IMP037_IMPLEMENTATION_MERGE_SHA: f77a54819f51ad5648dda8acb3a7c93345cd5d6c
IMP037_IMPLEMENTATION_MERGE_TREE: 4ff19a31db947cafadf690cf6bf1b6d2f1de14ac
IMP037_POST_MERGE_CI: 35587376968
IMP037_POST_MERGE_CI_RESULT: SUCCESS
IMP037_REPOSITORY_IMPLEMENTATION: MERGED
IMP037_EXTERNAL_RECOVERY_PROOF: NOT_PERFORMED
IMP037_IMPLEMENTATION_COMPLETE: NO
IMP037_ACCEPTED: NO
IMP038_ACTIVATED: YES
IMP038_ACTIVATED_BY_IMP037_CAPABILITY: NO
IMP038_ARCHITECTURE_FIT: PASS
IMP038_ARCHITECTURE_LOCKED: YES
IMP038_IMPLEMENTATION_AUTHORIZED: YES
IMP038_STARTED: YES
IMP038_IMPLEMENTATION_COMPLETE: YES
IMP038_HOLD: YES
IMP037_HOLD: YES
IMP038_ACCEPTANCE_BLOCKED_BY_IMP037: YES
CONTINUATION_EXCEPTION: IMP037_PROVIDER_BLOCKED_TO_IMP038
IMP037_PROVIDER_BLOCKED_TO_IMP038: YES
IMP038_ACCEPTANCE_BLOCKED_BY_IMP037: YES
PHASE1_BLOCK_STATUS: BLOCKED_PROVIDER_ACCESS
PROVIDER_DEPENDENT_PROOF: DEFERRED_PENDING_PROVIDER_ACCESS
IMPLEMENTATION_PERFORMED: NO
PRODUCTION_RESOURCES_CREATED: NO
PRODUCTION_RESTORE_AUTHORIZED: NO
PROGRAM_PAUSE: PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED
PROGRAM_PAUSE_AUTHORITY: D-377

FITS_WITHIN_ARCH_R20: YES
D-374_CREATED: YES (already CURRENT; not created by this Fit)
D375_REQUIRED_FOR_LOCK: NO
D-375_CREATED: NO
ARCH_R21_REQUIRED: NO
ARCH_R21_CREATED: NO
NEW_GLOBAL_DECISION_REQUIRED: NO

CANONICAL_ROADMAP_STATE = GTM-R152 / STATE-R150
ARCHITECTURE_BASE = ARCH-R20 / D-374
PRODUCT_DEFINITION = PD-IMP-037-DRAFT-1 (APPROVED; Product Definition Gate PASS)
FOUNDER_UAT_REQUIRED = YES
FOUNDER_UAT_STATUS = NOT_PERFORMED
IMPLEMENTATION_AUTHORIZATION_EVIDENCE = PR#171/5743814105
IMPLEMENTATION_START_EVIDENCE = PR#172/5744869269
```

`CANONICAL_ROADMAP_STATE = GTM-R152 / STATE-R150` is the **CURRENT tip** (IMP-036I Product Definition DRAFT_READY_FOR_GATE under PROGRAM_PAUSE D-377; `currentProductSlice = IMP-036I`; `IMP036I_ACTIVATED: YES`; `acceptedThrough = IMP-036H`; prior tip GTM-R151 / STATE-R149; prior tip GTM-R150 / STATE-R148; prior tip GTM-R150 / STATE-R148 IMP-036I Product Definition DRAFT-2 DRAFT_READY; prior tip GTM-R149 / STATE-R147 IMP-036I Product Definition DRAFT_READY; prior tip GTM-R148 / STATE-R146 IMP-036I Product Definition activation; prior tip GTM-R147 / STATE-R145 IMP-036H COMPLETE_AND_ACCEPTED; prior tip GTM-R146 / STATE-R144 Implementation COMPLETE pending acceptance; prior tip GTM-R145 / STATE-R143 Implementation AUTHORIZED / STARTED; prior tip GTM-R144 / STATE-R142 Implementation AUTHORIZED / NOT_STARTED; prior tip GTM-R143 / STATE-R141 Architecture Fit PASS + architecture lock; prior tip GTM-R142 / STATE-R140 IMP-036H Product Definition Gate PASS under `PROGRAM_PAUSE` D-377; prior tip GTM-R141 / STATE-R139 activation; IMP-037/038 held; `IMP038_IMPLEMENTATION_COMPLETE: YES` without acceptance). Prior tip `GTM-R140 / STATE-R138` remains the **IMP-038 AUTHORIZE + START**
provenance tip. Prior tip `GTM-R139 / STATE-R137` remains the **IMP-038 Architecture Fit PASS /
architecture LOCK** provenance tip. Prior tip `GTM-R138 / STATE-R136` remains the
**controlled-continuation / Product Definition Gate PASS** provenance tip. Prior tip
`GTM-R137 / STATE-R135` remains the **post-merge repository-implementation reconciliation target**
for this artifact. Start provenance remains GTM-R136 / STATE-R134;
authorization provenance remains GTM-R135 / STATE-R133; Architecture Fit/lock provenance remains
GTM-R134 / STATE-R132; Fit evaluation was against GTM-R133 / STATE-R131 / ARCH-R20 / DR-16.
ROADMAP and STATE remain the sole lifecycle authority; this capability document never overrides them.

| Field | Value |
|---|---|
| Capability / title | `IMP-037 — Backup, Restore & Migration Readiness` |
| Authority | `CAPABILITY_ARCHITECTURE` (`CURRENT`) |
| Architecture base | `ARCH-R20` / `D-374` / `ADR-016` (`ARCH-G26`) |
| Architecture lock | `ARCHITECTURE_LOCKED` (independent Architecture Fit review **PASS**) |
| Architecture Fit | **PASS** (performed fresh against ARCH-R20) |
| Product Definition | `PD-IMP-037-DRAFT-1` **APPROVED**; Product Definition Gate **PASS** |
| Formal ROADMAP lifecycle | `IMPLEMENTATION_IN_PROGRESS` (`IMP037_ACTIVATED: YES`) |
| Implementation | **AUTHORIZED** / **STARTED** / **REPOSITORY MERGED** / **NOT COMPLETE** / **EXTERNAL PROOF NOT PERFORMED** (`IMPLEMENTATION_PERFORMED: NO` = backup/restore execution) |
| Accepted | **NO** |
| Founder UAT required | **YES** (`FOUNDER_UAT_STATUS = NOT_PERFORMED`) |
| Application schema change required | **NO** |
| New deployable / always-on service | **NO** |
| New application role / permission | **NO** |
| New D-number required for lock | **NO** (`D375_REQUIRED_FOR_LOCK: NO`) |
| Global ARCH bump required | **NO** (`ARCH_R21_REQUIRED: NO`) |
| Binding decisions | `D-374`, `ADR-016`, `ADR-002`, `ADR-013`, `ADR-015` |
| Depends on | `IMP-004`, `IMP-005`, `IMP-005A`, `IMP-036G` |
| Open mutually exclusive architecture alternatives | **NONE** |

### Required document separation (A–H)

| Block | Content | Sections |
|---|---|---|
| **A** | Binding product requirements | §3 |
| **B** | Existing global architecture constraints | §4 |
| **C** | Architecture Fit decisions | §5 – §16 |
| **D** | Implementation-deferred details | §17 |
| **E** | Explicit prohibitions / safety invariants | §18 |
| **F** | Validation / evidence obligations | §19 |
| **G** | Residual risks | §20 |
| **H** | Lifecycle / gate status | §21 |

---

## 1. Authority / status / provenance

This artifact is CURRENT `CAPABILITY_ARCHITECTURE` for IMP-037. It is the sole CURRENT
capability-architecture authority for this slice and supersedes every earlier IMP-037 Architecture
Fit candidate posture.

### 1.1 Fit-evaluated candidate (exact)

```text
Repository: /home/ajoshi/repos/boba-bear-platform
ARCHITECTURE_FIT_EVALUATED_BRANCH = main
ARCHITECTURE_FIT_EVALUATED_HEAD = 28e6dd15c48b8c19abbc7057c4dc7e0a7d7cc7ea
ARCHITECTURE_FIT_EVALUATED_TREE = 5792c963166e8589751d2ba8c8928728e2c83526
ARCHITECTURE_FIT_EVALUATED_WORKING_TREE_FINGERPRINT = 56fa9b5459fd8acceb2ccc3ab73c5d7d9583dbf4539b10a1ef75553dd5aff8ba
ARCHITECTURE_FIT_DATE = 2026-09-19
ARCHITECTURE_FIT_RESULT = PASS
INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PASS
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_HEAD = d74ca9a30096fb14bca80643b75aa19d33093dde
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_TREE = 09c7e3bd6b7832944d07d527c149752ed3bbeb4d
INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID = 5256273904
```

The persistence commit that records this lock is a **subsequent governance commit** and is **NOT**
the Fit-evaluated candidate above (`lock-persistence commit != Fit-evaluated candidate`). Do not
treat lock-persistence HEAD / tree / fingerprint as the Fit-evaluated artifact. Independent review
PASS applies to the architecture-persistence technical candidate
(`d74ca9a30096fb14bca80643b75aa19d33093dde` / tree `09c7e3bd6b7832944d07d527c149752ed3bbeb4d`;
GitHub review `5256273904`), which is also distinct from the Fit-evaluated `main` candidate.

### 1.2 PR #169 is non-authoritative

```text
PR_169_AUTHORITY: NON_AUTHORITATIVE / SUPERSEDED
```

The earlier IMP-037 Architecture Fit candidate carried on **PR #169** was evaluated against
pre-D-374 infrastructure authority (DigitalOcean App Platform, Managed PostgreSQL, provider-managed
PITR, and a Spaces-based distributed mutex / conditional-create lock design). D-374 / ARCH-R20
removed that infrastructure basis. PR #169 content **MUST NOT** be copied, cited, or relied on as
authority for this Fit, and none of its rejected mechanisms are restored here. This Fit was
performed fresh against ARCH-R20.

### 1.3 Canonical anchors

```text
VISION = VISION-1
ROADMAP = GTM-R133 CURRENT at Fit evaluation; GTM-R134 lock-persistence reconciliation target
STATE = STATE-R131 CURRENT at Fit evaluation; STATE-R132 lock-persistence reconciliation target
ARCHITECTURE = ARCH-R20 (ARCH-G26)
DECISION REGISTER = DR-16 (D-374; ADR-016)
PRODUCT DELIVERY = PD-1
TESTING = TEST-1
PERSONA = PERSONA-1
GOLDEN JOURNEYS = GJ-1
Product Definition = docs/platform/product/IMP-037/product-definition.md (APPROVED; PD-IMP-037-DRAFT-1)
Binding decisions = D-374, ADR-016, ADR-002, ADR-013, ADR-015
Depends on = IMP-004, IMP-005, IMP-005A, IMP-036G
```

---

## 2. Purpose and Product Definition reference

Support the approved IMP-037 business outcome without inventing product behaviour:

> Before public launch, BOBA Bear can demonstrate that production-critical authoritative data can be
> independently backed up, recovered to an appropriate recovery point, restored without overwriting
> the active source, validated as usable after restoration, migrated to a clean compatible
> PostgreSQL target, and recovered safely around high-risk persistence changes through repeatable
> evidence-backed procedures.

Canonical product behaviour authority:

- [`docs/platform/product/IMP-037/product-definition.md`](../product/IMP-037/product-definition.md)
  — `PD-IMP-037-DRAFT-1` **APPROVED** (Product Definition Gate **PASS**, 2026-09-19)

This capability architecture selects **mechanisms only**. It does not restate, narrow, or widen the
approved product requirements, and it does not change any Founder decision `FD-037-01` … `FD-037-07`.

```text
product_semantics_changed = NO
PRODUCT_DEFINITION_GATE = PASS
ARCHITECTURE_FIT: PASS
ARCHITECTURE_LOCKED = YES
IMPLEMENTATION_AUTHORIZED: YES
IMPLEMENTATION_STARTED: YES
```

---

# A. Binding product requirements

## 3. Product requirements this Fit must satisfy

Derived from `PD-IMP-037-DRAFT-1` (8 stories, 50 acceptance scenarios, 30 business rules,
`FD-037-01` … `FD-037-07`). These are **obligations**, not proven results.

```text
RPO_TARGET <= 15 minutes
RTO_TARGET <= 2 hours
```

`RTO_TARGET <= 2 hours` is measured end-to-end and **includes** required application /
business-integrity validation, not merely PostgreSQL socket availability (`FD-037-02`;
`AC-IMP-037-004-08`).

| Requirement | Product authority | Mechanism section |
|---|---|---|
| Two mandatory recovery layers (continuous PITR-capable + independent encrypted logical) | `BR-IMP-037-003`; `FD-037-03` | §6, §7 |
| Measured recovery point within `RPO_TARGET <= 15 minutes` | `FD-037-01`; `AC-IMP-037-004-08` | §6, §19 |
| Measured end-to-end recovery/validation within `RTO_TARGET <= 2 hours` | `FD-037-02`; `AC-IMP-037-004-08` | §11, §19 |
| Independent logical backup at least daily, 35-day rolling retention | `FD-037-03` | §7 |
| Backup artifacts encrypted; plaintext production backup material never the durable result | `BR-IMP-037-006`; `AC-IMP-037-002-03` | §7, §8 |
| Integrity evidence distinguishing complete from corrupt/incomplete artifacts | `AC-IMP-037-002-02`; `BR-IMP-037-029` | §9 |
| Interrupted runs never recorded as `SUCCEEDED` / last-known-good | `AC-IMP-037-005-01`; §13 PD | §9, §12 |
| Repeat runs never silently overwrite retained artifacts | `AC-IMP-037-002-07` | §9, §10 |
| Restore never targets or overwrites the active source | `BR-IMP-037-002/028`; `AC-IMP-037-003-01/02` | §11 |
| Production-classified restored data retains production-appropriate protection | `BR-IMP-037-010`; `AC-IMP-037-003-06` | §11, §12 |
| Restore drill cannot initiate live customer/provider effects | `BR-IMP-037-009`; `AC-IMP-037-003-07` | §12 |
| Later repository migrations applied through existing migration authority | `AC-IMP-037-003-05`; `BR-IMP-037-011/012` | §13 |
| Restored business truth validated across identity, commerce, operations, reliability, financial, authorization state | `AC-IMP-037-004-01` … `07` | §12, §19 |
| Portability to a clean compatible PostgreSQL 18 target | `US-IMP-037-006` | §14 |
| High-risk migration recovery-readiness gate (`READY` / `BLOCKED`) | `US-IMP-037-007`; `BR-IMP-037-014/015` | §15 |
| Backup/restore authority distinct from ordinary application runtime authority | `BR-IMP-037-005`; `AC-IMP-037-002-04` | §8 |
| Secret-safe status, logs, and evidence | `BR-IMP-037-007`; `AC-IMP-037-001-05`; `AC-IMP-037-008-03` | §16 |
| Reproducible, independently reviewable runbook + evidence | `US-IMP-037-008`; `BR-IMP-037-019` | §16, §19 |
| CLI / one-shot tooling + runbook operator experience (no V1 web UI) | `FD-037-06` | §5 |
| No new application role or permission implied by the operator persona | `BR-IMP-037-021` | §8 |
| Readiness never inferred from configuration or an empty storage location | `AC-IMP-037-001-02`; `BR-IMP-037-030` | §16 |
| Failure evidence preserved across later successful reruns | `BR-IMP-037-020`; TEST-1 | §19 |

```text
RPO_RTO_PROVEN: NO
DROPLET_2GIB_RTO_VALIDATED: NO
```

`RPO_TARGET <= 15 minutes` and `RTO_TARGET <= 2 hours` are **binding obligations that require drill
evidence**. This Fit does **not** claim them achieved, and it does **not** claim validated recovery
timing on the 2 GiB / 1 vCPU pilot Droplet size target. Achievement is proven only by executed
restore-drill evidence under TEST-1 after implementation is separately authorized.

---

# B. Existing global architecture constraints

## 4. Constraints inherited from ARCH-R20 / D-374 / ADR-016

This Fit operates **inside** the CURRENT pilot topology. It neither amends nor reopens it.

```text
PILOT_CLOUD_PROVIDER: DigitalOcean
PILOT_PRIMARY_REGION: BLR1 / Bangalore where provider availability permits
PILOT_COMPUTE_MODEL: single Basic Droplet
PILOT_OS: Ubuntu 24.04 LTS
PILOT_CONTAINER_RUNTIME: Docker Engine
PILOT_ORCHESTRATION: Docker Compose
SELF_HOSTED_POSTGRESQL: YES (PostgreSQL 18 on the same Droplet)
OFF_HOST_BACKUP_DESTINATION: DigitalOcean Spaces
KUBERNETES: NO
K3S: NO
MANAGED_POSTGRESQL: NO (CURRENT pilot)
APP_PLATFORM: NO (CURRENT pilot)
PODMAN_PRODUCTION_RUNTIME: NO
PERMANENT_CLOUD_STAGING: NOT_REQUIRED
SINGLE_NODE_FAILURE_DOMAIN: ACCEPTED_FOR_PILOT
HIGH_AVAILABILITY: NOT_PROVIDED
```

| Inherited constraint | Authority | Consequence for IMP-037 |
|---|---|---|
| Single-node pilot Droplet; single failure domain accepted | `ARCH-G26` / D-374 | Off-host Spaces copies are the only survivable recovery source; no HA / failover promise |
| Self-hosted PostgreSQL 18 on the Droplet | `ARCH-G26` / ADR-013 (amended) | Recovery Layer 1 must be self-managed; provider PITR is not available and not CURRENT |
| Managed PostgreSQL / App Platform rejected for pilot | `ARCH-G26` / D-374 | `MANAGED_POSTGRESQL: NO (CURRENT pilot)`, `APP_PLATFORM: NO (CURRENT pilot)`; historical ADR-001/ADR-013 managed topology is HISTORICAL only |
| Kubernetes / DOKS / k3s rejected for pilot | `ARCH-G26` / D-374 | `KUBERNETES: NO`, `K3S: NO`; no operator/CRD-based backup design |
| Permanent always-on cloud staging not required | `ARCH-G26` / ADR-002 (amended) | `PERMANENT_CLOUD_STAGING: NOT_REQUIRED`; drills use ephemeral, uniquely identified targets |
| Recurring infra cost must not grow without demonstrated need | `ARCH-G26` | No always-on recovery service; no paid LB, second Droplet, or managed cluster for backups |
| PostgreSQL 18 / Drizzle / immutable forward-only migrations / role separation | ADR-013 (persistence semantics unchanged) | Post-restore schema reconciliation reuses existing migration authority only |
| Immutable OCI / GHCR / manual production gate / serialized migrations / rollback discipline | ADR-002 (preserved by D-374) | Database restore is never routine release rollback |
| No secrets in repository or OCI images; pilot production secrets = host-local protected files / OS mechanism | ADR-015 (amended by D-374) | Backup, repo-encryption, and object-store credentials live in host-local protected material only |
| Static Next.js export → Nginx; accepted service/process boundaries unchanged | `ARCH-G01` / D-359 / ARCH-R20 | Recovery tooling adds no HTTP surface, no Next.js route, no new façade |
| Business domain authority unchanged by ARCH-R20 | ARCH-R20 §3.1 | No domain, permission, role, or schema authority is created by IMP-037 |
| Managed-provider PITR not CURRENT; IMP-037 must re-Fit self-managed recovery | `ARCH-G26` | This document is that fresh Fit |

Preserved global invariants this Fit does not touch:

```text
NO_SECOND_AUTHORITY = YES
NO_NEW_DEPLOYABLE = YES
NO_NEW_AUTH = YES
NEW_APPLICATION_ROLE: NO
NEW_APPLICATION_PERMISSION: NO
APPLICATION_SCHEMA_CHANGE_REQUIRED: NO
FITS_WITHIN_ARCH_R20: YES
```

---

# C. Architecture Fit decisions

## 5. Execution plane (locked)

```text
EXECUTION_MODEL: one-shot tooling execution plane
NEW_DEPLOYABLE_SERVICE: NO
NEW_ALWAYS_ON_RECOVERY_SERVICE: NO
NEW_HTTP_SURFACE: NO
OPERATOR_SURFACE: CLI / one-shot tooling + documented runbook (FD-037-06)
```

Locked decisions:

1. IMP-037 introduces **no permanently running backup service**. Every backup, restore, validation,
   portability, and readiness operation is a **one-shot tooling execution plane** invocation that
   starts, does bounded work, writes evidence, and exits.
2. `pgBackRest` executes in the **PostgreSQL container context** (same container/namespace as the
   authoritative PostgreSQL 18 process), because physical backup and WAL archiving require direct
   access to `PGDATA` and to the same PostgreSQL binaries/version.
3. Scheduling uses **host systemd timers** that invoke **one-shot Compose operations**
   (`docker compose run --rm` style, or `exec` into the running PostgreSQL service where the
   operation must share `PGDATA`). No in-container cron daemon and no always-on scheduler service is
   introduced.
4. Continuous WAL archiving is performed by PostgreSQL's own `archive_command` inside the PostgreSQL
   container context. It is a property of the running database, **not** a separate service and
   **not** a scheduled job.
5. Logical backup, restore, validation, portability, and readiness tooling run as one-shot
   `tools`-profile style Compose executions consistent with existing repository tooling conventions.

```text
IN_CONTAINER_CRON: NO
ALWAYS_ON_SIDECAR: NO
SCHEDULER_PLANE: host systemd timers -> one-shot Compose operations
PGBACKREST_EXECUTION_CONTEXT: PostgreSQL container context
```

---

## 6. Recovery Layer 1 — continuous PITR-capable physical recovery (locked)

```text
RECOVERY_LAYER_1: self-managed PostgreSQL physical/base backup + continuous WAL archiving to DigitalOcean Spaces
RECOVERY_LAYER_1_TOOL: pgBackRest (version >= 2.55)
RECOVERY_LAYER_1_REPOSITORY: private DigitalOcean Spaces bucket 1 (S3-compatible pgBackRest repo)
RECOVERY_LAYER_1_REPO_ENCRYPTION: AES-256-CBC (pgBackRest repository cipher)
RECOVERY_LAYER_1_SCHEDULE: weekly full + daily differential + continuous WAL
RECOVERY_LAYER_1_WAL_BOUND: archive_timeout = 5 minutes
RECOVERY_LAYER_1_RETENTION: >= 35 days, owned and enforced by pgBackRest
RECOVERY_CRITICAL_ENCRYPTION_SECRET_OFF_HOST_CUSTODY: REQUIRED
PGBACKREST_CIPHER_ROTATION_IN_PLACE: FORBIDDEN
PGBACKREST_KEY_ROTATION_MODEL: NEW_ENCRYPTED_REPOSITORY_GENERATION
```

| Decision | Locked value | Rationale |
|---|---|---|
| Tool | `pgBackRest` | Mature self-managed PITR for self-hosted PostgreSQL; S3-compatible repository support for Spaces; integrity-verified repository format |
| Minimum version | **>= 2.55** | Locked floor for this capability. The Ubuntu 24.04 LTS stock package (2.50) does **not** meet it, so the pilot must obtain pgBackRest **>= 2.55** through a repository-owned, reproducible, version-pinned acquisition path rather than the distribution default |
| Repository encryption | `AES-256-CBC` | pgBackRest-native repository cipher; keeps Layer 1 artifacts unreadable at rest in Spaces independent of provider-side controls |
| Backup cadence | weekly **full** + daily **differential** + **continuous WAL** | Bounds restore cost and repository growth on a small Droplet while preserving continuous recovery-point granularity |
| WAL bound | `archive_timeout = 5 minutes` | Design bound so a low-write period cannot silently stretch the recovery point; supports (but does not by itself prove) `RPO_TARGET <= 15 minutes` |
| Retention | **>= 35 days**, owned by pgBackRest | Single retention authority for Layer 1; expiration is performed by `pgbackrest expire`, never by ad-hoc object deletion |

Locked constraints:

- Continuous WAL archiving MUST remain continuously available. It is **not** a scheduled job and
  MUST NOT be gated by the coarse scheduled-job lock (see §10).
- `archive_timeout = 5 minutes` is a **design bound**, not evidence. The achieved recovery point is
  measured per drill and recorded (§19).
- pgBackRest is the **sole** authority for Layer 1 repository layout, manifests, retention, and
  expiry. No parallel tooling may write into, prune, or reorganize bucket 1.
- Layer 1 `>= 35 days` retention is an infrastructure recovery-window decision. It is **not**
  customer-data, statutory, audit, or financial-record retention policy (`FD-037-03`; IMP-038 owns
  those separately).
- Obtaining pgBackRest **>= 2.55** must be reproducible and version-pinned. The exact acquisition
  mechanism is implementation-deferred (§17); silently accepting the stock 2.50 package is
  **FORBIDDEN**.

---

## 7. Recovery Layer 2 — independent encrypted logical backup (locked)

```text
RECOVERY_LAYER_2: independent PostgreSQL logical backup / pg_dump -Fc / age public-key encryption
RECOVERY_LAYER_2_FREQUENCY: daily (at least)
RECOVERY_LAYER_2_DESTINATION: private DigitalOcean Spaces bucket 2 (separate from the pgBackRest repository)
RECOVERY_LAYER_2_ENCRYPTION: age public-key encryption (RECOVERY_CRITICAL_ENCRYPTION_SECRET_OFF_HOST_CUSTODY: REQUIRED)
RECOVERY_LAYER_2_INTEGRITY: SHA-256
RECOVERY_LAYER_2_RETENTION: 35-day rolling retention (age-based; COMPLETE runs only)
RECOVERY_LAYER_2_RETENTION_ELIGIBILITY: COMPLETE marker required
RECOVERY_LAYER_2_COMPLETION: COMPLETE marker written last
REMOTE_ARTIFACT_VERIFICATION_BEFORE_COMPLETE: REQUIRED
```

| Decision | Locked value | Rationale |
|---|---|---|
| Format | `pg_dump -Fc` (custom format) | Portable, selectively restorable, independent of the physical cluster layout and of pgBackRest |
| Independence | Separate tool, separate credentials path, separate bucket, separate encryption scheme | A defect, misconfiguration, credential compromise, or retention error in Layer 1 must not silently destroy Layer 2 |
| Encryption | **age** public-key encryption | Public-key encryption lets the backup host encrypt without holding decryption authority; private identity must remain recoverable off-host |
| Integrity | `SHA-256` over the encrypted artifact, verified against the **stored remote object** before `COMPLETE` | Distinguishes a complete artifact from a truncated/corrupt one (`AC-IMP-037-002-02`); PUT success alone is insufficient |
| Retention | **35-day rolling retention** (age-based calendar window; `FD-037-03`) | Binding product window is **35 calendar days**, not “keep N run objects.” Extra same-day COMPLETE runs (manual / retry / pre-migration) remain recoverable for the full age window; incomplete runs never count as eligible backups |
| Completion semantics | Remote verification then `COMPLETE` marker written **last** | An artifact becomes last-known-good only after payload + remote SHA-256 verification + metadata are durably stored |

### 7.1 Run identity and completion protocol (locked)

```text
RUN_ID: unique per backup invocation
COMPLETE marker LAST
REMOTE_ARTIFACT_VERIFICATION_BEFORE_COMPLETE: REQUIRED
```

Every Layer 2 invocation follows this exact completion order:

1. Allocates a **unique `RUN_ID`** (`RUN_ID: unique per backup invocation`). Object keys are
   namespaced by run identity, so two runs — including concurrent or retried runs — can never
   collide on a key.
2. Creates a `pg_dump -Fc` logical dump.
3. Encrypts the dump with `age` public-key encryption.
4. Uploads the encrypted artifact to the run-scoped object key in bucket 2.
5. Computes the expected `SHA-256` digest of the encrypted artifact.
6. **Verifies the stored remote artifact** against that expected `SHA-256`
   (`REMOTE_ARTIFACT_VERIFICATION_BEFORE_COMPLETE: REQUIRED`). A successful PUT/upload alone is
   **not** sufficient.
7. Persists required run metadata and integrity evidence (source identity classification, recovery
   point, tool versions, key version / recipient identity reference, sizes, timings, result) with
   no secrets.
8. Writes the `COMPLETE` marker **last**, only after every preceding step — including remote
   stored-object integrity verification — has succeeded.

An artifact becomes last-known-good / retention-eligible / restore-selectable **only after** remote
stored-object integrity has been verified and the `COMPLETE` marker is written last. Restore-time
verification alone does **not** satisfy this completion invariant. The exact remote-verification
mechanism (for example re-GET + digest, or an equivalent provider integrity check that proves the
stored object matches the expected digest) is implementation-deferred (§17); the semantic must not
be weakened.

Consequences:

- An artifact without its `COMPLETE` marker is **never** last-known-good, never counted toward the
  `35-day rolling retention` window, and never selectable for a restore drill
  (`AC-IMP-037-005-01`).
- Retention pruning only ever considers `COMPLETE`-marked runs, so an interrupted run cannot
  displace a valid retained backup (`AC-IMP-037-002-07`).
- Repeat or concurrent invocations write to distinct `RUN_ID` namespaces and therefore cannot
  overwrite each other's payload, checksum, metadata, or evidence (Product Definition §17
  concurrency requirements).

---

## 8. Credentials, roles, and key management (locked)

```text
NEW_APPLICATION_ROLE: NO
NEW_APPLICATION_PERMISSION: NO
LOGICAL_BACKUP_DB_ROLE: capability-scoped read-only logical-backup database role
PHYSICAL_BACKUP_AUTHORITY: PostgreSQL superuser/replication authority available only inside the PostgreSQL container context
APPLICATION_RUNTIME_AS_BACKUP_AUTHORITY: FORBIDDEN
```

| Concern | Locked posture |
|---|---|
| Logical backup database authority | A **capability-scoped read-only logical-backup database role** used only by Layer 2. It is not an application runtime role and is not reusable for application traffic |
| Physical backup authority | pgBackRest uses PostgreSQL-native backup/replication authority within the PostgreSQL container context; it is never exposed to application services |
| Application runtime credentials | Never used as privileged backup authority (`BR-IMP-037-005`; `AC-IMP-037-002-04`) |
| Object-store credentials | Two distinct credential sets, one per bucket, host-local protected material under ADR-015 (as amended by D-374); never in repository, OCI image, or evidence |
| Application RBAC | Unchanged. The Platform Operator persona creates **no** application role or permission (`BR-IMP-037-021`) |

### 8.1 Off-host recovery custody for encryption secrets (locked)

```text
RECOVERY_CRITICAL_ENCRYPTION_SECRET_OFF_HOST_CUSTODY: REQUIRED
```

Droplet loss must **not** destroy the only copy of any secret required to decrypt retained recovery
artifacts. Exact custody mechanism remains implementation-deferred under ADR-015 (host-local
protected files / OS mechanism for on-host material; approved off-host recovery custody for
recoverable copies). This Fit does **not** invent a new SaaS secret manager or global architecture
service.

| Layer | Binding custody rule |
|---|---|
| Layer 1 | The pgBackRest repository cipher passphrase **MUST** have a recoverable **off-host** custody copy. The production Droplet must not be the sole location of the repository decryption secret. |
| Layer 2 | Normal backup creation uses `age` **recipient / public-key** material on the backup host. The `age` **private identity MUST NOT** depend solely on the production Droplet; private decryption identity must be retained in approved off-host recovery custody. |

Old Layer 1 passphrases and old Layer 2 private identities **MUST** remain available in off-host
recovery custody for as long as retained artifacts depend on them.

### 8.2 Encryption key versioning and rotation (locked)

```text
ENCRYPTION_KEY_VERSIONING: REQUIRED
RETIRED_KEYS_MUST_REMAIN_RESOLVABLE_FOR_RETAINED_ARTIFACTS: YES
PGBACKREST_CIPHER_ROTATION_IN_PLACE: FORBIDDEN
PGBACKREST_KEY_ROTATION_MODEL: NEW_ENCRYPTED_REPOSITORY_GENERATION
```

**Layer 1 (pgBackRest repository cipher):**

- Once an encrypted pgBackRest repository/stanza has been initialized, repository encryption
  configuration **cannot** be changed in place. Therefore
  `PGBACKREST_CIPHER_ROTATION_IN_PLACE: FORBIDDEN`.
- A Layer 1 passphrase change creates a **new encrypted repository / repository generation**
  (`PGBACKREST_KEY_ROTATION_MODEL: NEW_ENCRYPTED_REPOSITORY_GENERATION`). Exact repository
  numbering, path, or stanza mechanics remain implementation-deferred (§17).
- The previous repository remains readable and retained for its required retention / evidence
  window; its old passphrase remains available in off-host recovery custody for the same period.
- New backups/WAL transition onto the new generation only under a controlled migration procedure
  that preserves recovery coverage; rotation must not create a gap in RPO / recovery evidence.
- A recorded Layer 1 "**key version**" is **BOBA capability / recovery metadata** associated with
  the encrypted repository generation. This Fit does **not** claim that pgBackRest natively
  provides per-object encryption-key versioning.

**Layer 2 (`age` recipients):**

- New backups may use a new recipient / public key.
- Old private identities remain available in off-host recovery custody while retained artifacts
  require them (`RETIRED_KEYS_MUST_REMAIN_RESOLVABLE_FOR_RETAINED_ARTIFACTS: YES`).

Shared rules:

- Every encrypted artifact records the **key version** (Layer 1: repository-generation metadata;
  Layer 2: `age` recipient identity reference) used to encrypt it.
- Readiness output MUST treat "retained artifact whose key version is no longer resolvable" as a
  recovery-coverage defect, not as healthy coverage.
- Key material itself is never written to evidence, logs, or status output (`BR-IMP-037-007`).

---

## 9. Storage layout, integrity, and artifact identity (locked)

```text
SPACES_BUCKETS: TWO private DigitalOcean Spaces buckets
BUCKET_1: pgBackRest repository (Layer 1) — AES-256-CBC repo encryption
BUCKET_2: independent logical backups (Layer 2) — age-encrypted artifacts + SHA-256 + metadata + COMPLETE marker
PUBLIC_ACCESS: NONE (both buckets private)
CROSS_LAYER_WRITE: FORBIDDEN
SPACES_VERSIONING: ENABLED
SPACES_VERSIONING_IS_IMMUTABILITY: NO
SPACES_OBJECT_LOCK_WORM_REQUIRED: NO
```

Locked constraints:

- **TWO private DigitalOcean Spaces buckets** with separate credentials. Layer 1 tooling never writes
  to bucket 2; Layer 2 tooling never writes to bucket 1.
- **`SPACES_VERSIONING: ENABLED` for BOTH recovery buckets.** Versioning is an architecture
  requirement for later infrastructure realization. Purpose: recover from accidental
  overwrite/delete, preserve prior object versions, and provide an additional recovery defense.
- **`SPACES_VERSIONING_IS_IMMUTABILITY: NO`.** Spaces versioning is **not** immutability,
  **not** WORM, and **not** tamper-proof storage. `SPACES_OBJECT_LOCK_WORM_REQUIRED: NO`. Do not
  claim Object Lock / WORM semantics.
- Layer 1 integrity is pgBackRest-native (repository manifests and checksums plus
  `pgbackrest verify`). Layer 2 integrity is `SHA-256` over the stored encrypted artifact, with
  remote verification required before `COMPLETE` (§7.1).
- Artifact identity is run-scoped (`RUN_ID: unique per backup invocation`); no "latest" object is
  ever mutated in place to represent the current good backup.
- Deletion authority is narrow: pgBackRest `expire` for bucket 1, and retention pruning limited to
  `COMPLETE`-marked expired runs for bucket 2. No broad object-deletion capability is wired into
  routine tooling.

### 9.1 Provider lifecycle boundary (locked)

**Layer 1:**

- pgBackRest owns **CURRENT** repository object retention and dependency semantics.
- Provider lifecycle rules **MUST NOT** independently expire current pgBackRest repository objects.
- Safe provider lifecycle uses may include:
  - abandoned / incomplete multipart-upload cleanup
  - bounded cleanup of **non-current** object versions
  only when they cannot invalidate required recovery evidence.

**Layer 2:**

- Capability-owned age-based **35-day** `COMPLETE`-run retention remains authoritative.
- Non-current version cleanup may be separately bounded without shortening the required recovery
  window.

---

## 10. Serialization and concurrency (locked)

```text
HOST_LOCAL_FLOCK_SERIALIZATION: REQUIRED (for scheduled/heavy ops)
SERIALIZATION_MECHANISM: host-local flock + systemd unit/timer semantics
CONTINUOUS_WAL_NOT_BLOCKED_BY_SCHEDULED_JOB_LOCK: YES
DISTRIBUTED_SPACES_LOCK: FORBIDDEN
SPACES_CONDITIONAL_CREATE_MUTEX: FORBIDDEN
```

| Decision | Locked value |
|---|---|
| Scope of serialization | Scheduled and heavy operations only: full/differential physical backups, logical backups, retention/expire, restore drills, portability rehearsals, readiness evaluations |
| Mechanism | **Host-local `flock`** plus systemd unit/timer serialization on the single pilot Droplet |
| Rationale | The pilot is a **single-node** failure domain (`ARCH-G26`); a host-local mutex is sufficient, observable, debuggable, and free |
| Continuous WAL archiving | **Explicitly excluded** from the coarse scheduled-job lock. `CONTINUOUS_WAL_NOT_BLOCKED_BY_SCHEDULED_JOB_LOCK: YES` — WAL archiving must continue during a running base/differential/logical backup, retention pass, or drill, or the recovery point silently degrades |
| Lock contention behaviour | A blocked scheduled run reports an explicit skipped/deferred outcome with reason; it never reports `SUCCEEDED`, and never proceeds by force |
| Distributed locking | **FORBIDDEN**. No Spaces-object distributed mutex, no conditional-create lock object, no lease/heartbeat object protocol |

The rejected Spaces distributed mutex / conditional-create lock design from the non-authoritative
PR #169 is **not** restored. Under ARCH-R20 there is exactly one production host, so a distributed
mutex would add object-store dependency, failure modes, and stale-lock recovery complexity with no
corresponding correctness benefit.

---

## 11. Restore target model and source protection (locked)

```text
RESTORE_TO_ACTIVE_SOURCE: FORBIDDEN
RESTORE_TARGET_MODEL: fresh, uniquely identified restore target only
RESTORE_INTO_PRODUCTION_PGDATA: FORBIDDEN
FORCE_PRODUCTION_FLAG: FORBIDDEN (no --force-production or equivalent override)
IDENTITY_PROTECTION: fail-closed
PRODUCTION_RESTORE_AUTHORIZED: NO
```

Locked constraints:

1. Every restore, drill, and portability rehearsal provisions a **fresh, uniquely identified restore
   target** (its own data directory / volume / database identity / container identity). Restores
   never reuse, adopt, or repair an existing target in place.
2. Restoring into the **production `PGDATA`** — or into any path, volume, container, or connection
   that resolves to the active authoritative database — is **FORBIDDEN** without a separate explicit
   R3 human authorization outside this capability lock. `PRODUCTION_RESTORE_AUTHORIZED: NO`.
3. There is **no escape hatch**: no `--force-production` flag, no environment-variable override, no
   "I know what I am doing" bypass is provided by the tooling.
4. Target identity protection is **fail-closed**. If the tooling cannot positively prove the target
   is distinct from the active source — ambiguous path, unresolvable identity, missing identity
   marker, ambiguous connection — the operation is **refused before any destructive work begins**
   (`AC-IMP-037-003-02`).
5. Cleanup obeys the same fail-closed identity rule: the exact target and consequence are shown, and
   an ambiguous target can never be selected for destruction (`AC-IMP-037-005-05`).
6. A partially completed restore yields `FAILED` with the target marked not-ready; the source remains
   unchanged and authoritative (`AC-IMP-037-003-04`; `BR-IMP-037-016/028`).

---

## 12. Recovered-instance validation environment (locked)

```text
VALIDATION_NETWORK: isolated Docker network (no route to production services)
PRODUCTION_CREDENTIALS_IN_VALIDATION: FORBIDDEN
PRODUCTION_DNS_IN_VALIDATION: FORBIDDEN
OUTBOUND_PROVIDER_INITIATION: DISABLED
PROVIDER_SUPPRESSION_MODE: fail-closed
PERMANENT_CLOUD_STAGING: NOT_REQUIRED
```

Locked constraints:

- The recovered application candidate used for business-integrity validation runs on an **isolated
  Docker network** with no route to production services.
- The validation context receives **no production provider credentials** and **no production DNS**
  resolution for provider endpoints.
- `OUTBOUND_PROVIDER_INITIATION: DISABLED` — the recovered instance must not be able to initiate
  live payments, refunds, notifications, WhatsApp messages, delivery dispatches, or any other real
  external effect (`AC-IMP-037-003-07`; `BR-IMP-037-009`).
- Suppression is **fail-closed**: if provider suppression cannot be positively established, the
  validation run is refused rather than proceeding with a possibly live outbound path. Absent
  configuration is treated as unsafe, never as "no provider configured, therefore safe".
- Transactional outbox and idempotency records are validated as **structurally present and usable**
  without uncontrolled replay of external effects (`AC-IMP-037-004-05`).
- Production-classified restored data keeps production-appropriate protection and does not silently
  become ordinary staging data (`AC-IMP-037-003-06`; `BR-IMP-037-010`).
- `PERMANENT_CLOUD_STAGING: NOT_REQUIRED` — validation uses ephemeral, uniquely identified,
  destroy-after-use targets. IMP-037 does **not** require a permanent cloud staging environment, and
  this Fit does not create one.

---

## 13. Post-restore schema reconciliation (locked)

Existing repository migration authority is the **only** mechanism used to reconcile a recovered
target with the application candidate's required schema.

```text
MIGRATION_AUTHORITY: existing repository migrations (ADR-013; forward-only, immutable)
EDIT_HISTORICAL_MIGRATIONS: FORBIDDEN
MANUAL_SCHEMA_SURGERY: FORBIDDEN
APPLICATION_SCHEMA_CHANGE_REQUIRED: NO
```

- When a selected recovery point predates migrations required by the application candidate, those
  migrations are applied through the existing migration path before application validation
  (`AC-IMP-037-003-05`).
- Applied-migration history is never repaired by editing historical committed migrations
  (`BR-IMP-037-012`).
- IMP-037 introduces **no application schema change**: no new business table, column, enum, or
  constraint in the application schema. `APPLICATION_SCHEMA_CHANGE_REQUIRED: NO`.
- Recovery evidence is recorded as durable operator evidence artifacts (files/objects), not as new
  application-schema tables.

---

## 14. Migration portability rehearsal (locked)

```text
PORTABILITY_SOURCE_ARTIFACT: Layer 2 pg_dump -Fc artifact (age-decrypted for the rehearsal)
PORTABILITY_TARGET: clean compatible PostgreSQL 18 target, freshly provisioned and uniquely identified
PORTABILITY_VALIDATION: same required restored-state validations as the restore drill
VENDOR_IDENTITY_IN_BUSINESS_DATA: NONE required
```

- Portability is proven with the **independent logical** artifact, because it is the layer that does
  not depend on the physical cluster layout, the pgBackRest repository, or the pilot host.
- The target is a clean, compatible PostgreSQL 18 instance, provisioned fresh for the rehearsal and
  subject to the same fresh-unique-target and fail-closed identity rules as §11.
- Business entities must retain meaning without DigitalOcean resource identifiers
  (`AC-IMP-037-006-04`).
- An interrupted or failed rehearsal leaves the target **not ready**, with the source remaining
  authoritative (`AC-IMP-037-006-05`).

---

## 15. High-risk migration readiness gate (locked)

```text
READINESS_RESULTS: READY | BLOCKED
READINESS_INPUTS: Layer 1 health + identifiable recovery point; Layer 2 COMPLETE evidence freshness;
                  documented recovery procedure; representative rehearsal result
DEFAULT_RESULT_ON_MISSING_EVIDENCE: BLOCKED
RESTORE_AS_ROUTINE_ROLLBACK: FORBIDDEN
```

- The readiness gate evaluates **evidence**, never configuration. A configured schedule, an existing
  bucket, or a present credential never produces `READY` (`BR-IMP-037-030`).
- Missing, stale, unverifiable, or key-unresolvable evidence yields `BLOCKED` (`AC-IMP-037-007-04`).
- A failed representative rehearsal yields `BLOCKED` even when the migration SQL itself executed
  successfully (`AC-IMP-037-007-05`).
- Readiness output identifies the **exact** backup/recovery evidence it relied on, so a later
  reviewer can reconstruct the decision.
- Database restore is never presented as the normal rollback mechanism for an ordinary bad
  application release; compatible image rollback or forward correction remains the release recovery
  discipline (`AC-IMP-037-007-06`; ADR-002).

---

## 16. Observability, status, and evidence (locked)

```text
STATUS_SOURCE: recorded run evidence only (never configuration presence)
EMPTY_DESTINATION_AS_HEALTHY: FORBIDDEN
SECRETS_IN_EVIDENCE: FORBIDDEN
EVIDENCE_FORMAT: human-readable report + machine-readable record (FD-037-06)
FAILURE_EVIDENCE: preserved; later success never erases the first failure
STORAGE_CAPACITY_VALIDATED: NO
CAPACITY_COST_OBSERVATION: REQUIRED
```

Locked constraints:

- Readiness reports each applicable layer separately — the continuous PITR-capable layer and the
  independent logical layer — with its most recent verified status, and never claims more coverage
  than the evidence proves (`AC-IMP-037-001-01`).
- No valid independent backup evidence ⇒ `NOT_READY`. An empty bucket, a present credential, or a
  configured timer is never success (`AC-IMP-037-001-02`).
- A failed most-recent attempt is visible with safe actionable context and emits no success claim
  (`AC-IMP-037-001-03`). A passed schedule interval without a successful run is visibly overdue /
  degraded (`AC-IMP-037-001-04`).
- No database URI, password, storage credential, token, key material, or unnecessary customer
  payload appears in status, logs, or evidence (`AC-IMP-037-001-05`; `AC-IMP-037-008-03`).
- Evidence identifies the application/repository candidate, migration/schema context, source
  environment classification, recovery artifact and recovery point (`AC-IMP-037-008-02`).
- Drill findings remain visible in evidence after a later successful rerun (`BR-IMP-037-020`;
  TEST-1).

### 16.1 Storage capacity / cost observation (locked; D-374)

`CAPACITY_COST_OBSERVATION: REQUIRED`. The capability must measure and report:

- Layer 1 physical / base backup storage
- Retained WAL / archive storage
- Layer 2 logical backup storage
- Material version-history storage (from `SPACES_VERSIONING: ENABLED`)
- Projected 35-day retained footprint

```text
STORAGE_CAPACITY_VALIDATED: NO
```

The included Spaces allowance is **not** assumed sufficient. Exceeding the included storage
allowance is an **operating-cost / capacity observation**; it does **not** automatically invalidate
this architecture. Material capacity overrun must be surfaced before production / public reliance
where relevant. Do **not** hardcode provider pricing into timeless architectural invariants;
pricing remains time-sensitive operating evidence under D-374.

---

# D. Implementation-deferred details

## 17. Implementation-deferred (inside this lock, not reopened by it)

These are bounded implementation choices. They must be made **within** the locked decisions above
and must not alter any locked semantic. None of them is an open architecture alternative, and none
requires a new decision record.

| Deferred detail | Bound it must respect |
|---|---|
| Exact pgBackRest **>= 2.55** acquisition/pinning path (upstream repo, vendored build, or pinned image layer) | Reproducible, version-pinned, verifiable; stock Ubuntu 24.04 2.50 is not acceptable |
| Exact `pgbackrest.conf` stanza name, process-max, compression type/level, bundling options | Must preserve weekly full + daily differential + continuous WAL, `AES-256-CBC` repo encryption, and `>= 35 days` pgBackRest-owned retention |
| Exact object key naming and prefix scheme in both buckets | Run-scoped, unique per `RUN_ID`, no in-place mutation of a "latest" pointer |
| Exact `age` recipient set, key storage mechanism, and rotation runbook steps | `ENCRYPTION_KEY_VERSIONING: REQUIRED`; `RECOVERY_CRITICAL_ENCRYPTION_SECRET_OFF_HOST_CUSTODY: REQUIRED`; retired keys resolvable for retained artifacts; no key material in evidence; no new SaaS secret-manager service |
| Exact Layer 1 repository-generation / stanza path mechanics for cipher rotation | `PGBACKREST_CIPHER_ROTATION_IN_PLACE: FORBIDDEN`; `PGBACKREST_KEY_ROTATION_MODEL: NEW_ENCRYPTED_REPOSITORY_GENERATION`; prior repository + passphrase retained through required window; no RPO gap |
| Exact remote stored-object SHA-256 verification mechanism before Layer 2 `COMPLETE` | `REMOTE_ARTIFACT_VERIFICATION_BEFORE_COMPLETE: REQUIRED`; PUT/upload success alone insufficient |
| Exact Spaces versioning enablement and safe provider lifecycle rule configuration | `SPACES_VERSIONING: ENABLED` on both buckets; `SPACES_VERSIONING_IS_IMMUTABILITY: NO`; provider lifecycle must not expire current pgBackRest objects |
| Exact capacity / cost observation reporting format | Measure Layer 1 base, WAL/archive, Layer 2 logical, material version-history, projected 35-day footprint; `STORAGE_CAPACITY_VALIDATED: NO`; no hardcoded pricing invariants |
| Exact systemd unit/timer names, calendar expressions, and jitter | Host systemd timers invoking one-shot Compose operations; scheduled/heavy ops under host-local `flock`; WAL archiving unaffected |
| Exact `flock` lock-file paths and lock granularity within "scheduled/heavy ops" | Continuous WAL must remain unblocked; contention reports skipped/deferred, never `SUCCEEDED` |
| Exact CLI command names, flags, and output formatting | CLI / one-shot tooling + runbook; no web UI; secret-safe output |
| Exact evidence file layout and machine-readable schema | Human-readable + machine-readable; secret-free; findings preserved |
| Exact restore-target naming scheme and identity-marker implementation | Fresh uniquely identified target; fail-closed identity protection; no production-PGDATA path |
| Exact isolated-network and provider-suppression implementation details | Isolated Docker network; no production credentials/DNS; fail-closed suppression |
| Exact critical-state validation query set per domain | Must cover identity/customer, commerce, operational, reliability, financial-document/signed-artifact bytes, and authorization state per `AC-IMP-037-004-01` … `07` |
| Exact drill timing instrumentation | Must measure achieved recovery point and end-to-end recovery/validation time including business validation |
| Exact retention-pruning implementation for bucket 2 | Counts only `COMPLETE`-marked runs; `35-day rolling retention`; never deletes a valid retained artifact to make room |
| Exact runbook document location and structure | Reproducible without undocumented manual database edits; independently reviewable |

---

# E. Explicit prohibitions / safety invariants

## 18. Prohibitions (binding under this lock)

```text
RESTORE_TO_ACTIVE_SOURCE: FORBIDDEN
RESTORE_INTO_PRODUCTION_PGDATA: FORBIDDEN
FORCE_PRODUCTION_FLAG: FORBIDDEN
DISTRIBUTED_SPACES_LOCK: FORBIDDEN
SPACES_CONDITIONAL_CREATE_MUTEX: FORBIDDEN
OUTBOUND_PROVIDER_INITIATION: DISABLED
MANAGED_POSTGRESQL: NO (CURRENT pilot)
APP_PLATFORM: NO (CURRENT pilot)
KUBERNETES: NO
K3S: NO
PERMANENT_CLOUD_STAGING: NOT_REQUIRED
NEW_DEPLOYABLE_SERVICE: NO
NEW_ALWAYS_ON_RECOVERY_SERVICE: NO
APPLICATION_SCHEMA_CHANGE_REQUIRED: NO
NEW_APPLICATION_PERMISSION: NO
NEW_APPLICATION_ROLE: NO
PRODUCTION_RESTORE_AUTHORIZED: NO
PR_169_AUTHORITY: NON_AUTHORITATIVE / SUPERSEDED
SPACES_VERSIONING_IS_IMMUTABILITY: NO
SPACES_OBJECT_LOCK_WORM_REQUIRED: NO
PGBACKREST_CIPHER_ROTATION_IN_PLACE: FORBIDDEN
```

| Prohibition | Reason |
|---|---|
| Restoring onto the active source / production `PGDATA`; any `--force-production`-style override | `BR-IMP-037-002/028`; fail-closed identity protection is the only safe posture for a single-node pilot |
| Spaces distributed mutex or conditional-create lock object | Single-node pilot; host-local `flock` is sufficient; rejected PR #169 design must not be restored |
| Blocking continuous WAL archiving behind the scheduled-job lock | Silently degrades the recovery point and would undermine `RPO_TARGET <= 15 minutes` |
| Provider-managed PITR, Managed PostgreSQL, App Platform as CURRENT | `ARCH-G26` / D-374; historical ADR-001/ADR-013 topology is HISTORICAL only |
| Kubernetes / DOKS / k3s / Podman production runtime for recovery tooling | `ARCH-G26` / D-374 |
| A permanently running backup service, daemon, sidecar, or in-container cron | `ARCH-G26` cost constraint; one-shot tooling execution plane is locked |
| Treating Spaces versioning as immutable / WORM / tamper-proof | `SPACES_VERSIONING_IS_IMMUTABILITY: NO`; `SPACES_OBJECT_LOCK_WORM_REQUIRED: NO`; overstating durability would be false safety evidence |
| Provider lifecycle independently expiring current pgBackRest repository objects | pgBackRest owns CURRENT repository retention/dependency semantics |
| In-place pgBackRest repository cipher / passphrase rotation | `PGBACKREST_CIPHER_ROTATION_IN_PLACE: FORBIDDEN`; rotation requires a new encrypted repository generation |
| Declaring Layer 2 `COMPLETE` after PUT/upload success without remote SHA-256 verification | `REMOTE_ARTIFACT_VERIFICATION_BEFORE_COMPLETE: REQUIRED` |
| Keeping the only Layer 1 passphrase or Layer 2 private identity solely on the production Droplet | `RECOVERY_CRITICAL_ENCRYPTION_SECRET_OFF_HOST_CUSTODY: REQUIRED` |
| Describing an existing configuration, timer, bucket, or credential as recovery coverage | `BR-IMP-037-030`; readiness must be evidence-based |
| Declaring an artifact usable before its `COMPLETE` marker is written last | `AC-IMP-037-005-01`; prevents false last-known-good |
| Plaintext production backup material as the durable result | `BR-IMP-037-006`; `AC-IMP-037-002-03` |
| Using application runtime credentials as backup authority | `BR-IMP-037-005`; `AC-IMP-037-002-04` |
| Live outbound provider effects from a recovered instance | `BR-IMP-037-009`; `AC-IMP-037-003-07` |
| Editing historical committed migrations to reconcile a recovered target | `BR-IMP-037-012`; ADR-013 immutability |
| Database restore as routine application rollback | `BR-IMP-037-013`; `AC-IMP-037-007-06`; ADR-002 |
| Introducing Redis / Kafka / RabbitMQ / CDC / data warehouse / secondary database for recovery | `BR-IMP-037-027`; ARCH-R20 |
| Claiming IMP-039 / IMP-040 scope (production scheduling realization, HA, cutover) via IMP-037 | `BR-IMP-037-023/024/025`; `FD-037-07` |

---

# F. Validation / evidence obligations

## 19. Evidence required before IMP-037 can be accepted

```text
RPO_RTO_PROVEN: NO
DROPLET_2GIB_RTO_VALIDATED: NO
STORAGE_CAPACITY_VALIDATED: NO
IMPLEMENTATION_PERFORMED: NO
```

Nothing below has been executed. These are the obligations this lock creates for a future
authorized IMPLEMENT / PROVE phase under [TEST-1](../TESTING.md).

| Obligation | Required evidence | Product authority |
|---|---|---|
| Layer 1 continuous recovery works | pgBackRest full + differential + WAL archiving verified; `pgbackrest verify` clean; PITR restore to a selected point into a fresh target | `BR-IMP-037-003` |
| Layer 2 independent backup works | `pg_dump -Fc` + `age` artifact with remote SHA-256 verification, metadata, and `COMPLETE` marker last; successful decrypt + `pg_restore` into a fresh target | `AC-IMP-037-002-01/02/03` |
| Remote verification before COMPLETE | Layer 2 run refuses `COMPLETE` until stored remote object matches expected SHA-256; PUT-only success is insufficient | §7.1 |
| Off-host encryption-secret custody | Recoverable off-host copy of Layer 1 passphrase and Layer 2 private identity; Droplet-only custody rejected | §8.1 |
| Spaces versioning | Both recovery buckets have versioning enabled; accidental overwrite/delete recoverable via prior versions without claiming WORM | §9 |
| Capacity / cost observation | Measured Layer 1 base, WAL/archive, Layer 2 logical, material version-history, and projected 35-day footprint reported; overrun surfaced as operating cost | §16.1; D-374 |
| Measured recovery point | Achieved RPO recorded per drill; `RPO_TARGET <= 15 minutes` required for qualifying scenarios | `FD-037-01`; `AC-IMP-037-004-08` |
| Measured recovery time | Achieved end-to-end recovery **including** business-integrity validation; `RTO_TARGET <= 2 hours` required | `FD-037-02`; `AC-IMP-037-004-08` |
| Recovery timing on the pilot size target | Drill evidence on the actual pilot Droplet size; **not** claimed validated by this lock | `ARCH-G26`; `FD-037-02` |
| Negative: source protection | Attempted restore to the active source is refused before destructive work | `AC-IMP-037-003-02` |
| Negative: ambiguous target | Unresolvable target identity refused fail-closed | `AC-IMP-037-003-02`; `AC-IMP-037-005-05` |
| Negative: interrupted backup | Incomplete run never last-known-good; no `COMPLETE` marker; retention unaffected | `AC-IMP-037-005-01` |
| Negative: interrupted restore | `FAILED`; source unchanged; explicit resume/recreate/discard guidance | `AC-IMP-037-003-04`; `AC-IMP-037-005-02` |
| Negative: source unavailable / destination failure | Explicit `FAILED`; no success record | `AC-IMP-037-002-05/06` |
| Negative: repeat runs | Retained artifacts not overwritten across runs | `AC-IMP-037-002-07` |
| Negative: provider suppression | Recovered instance cannot initiate live effects; suppression failure refuses the run | `AC-IMP-037-003-07` |
| Negative: secret leakage | Status, logs, evidence contain no credentials, URIs, tokens, or key material | `AC-IMP-037-001-05`; `AC-IMP-037-008-03` |
| Negative: empty/missing/stale evidence | `NOT_READY` / `BLOCKED`, never healthy | `AC-IMP-037-001-02/04`; `AC-IMP-037-007-04` |
| Concurrency | Overlapping scheduled/heavy ops serialized by host-local `flock`; WAL archiving demonstrably continues during a running backup/drill | §10; PD §17 |
| Key versioning / Layer 1 rotation | Layer 1 passphrase change creates a new encrypted repository generation; prior generation + passphrase remain recoverable; Layer 2 recipient rotation keeps old private identities available | §8.2 |
| Restored business integrity | Identity/customer, commerce, operational, reliability, financial-document + signed-artifact bytes, authorization state validated | `AC-IMP-037-004-01` … `07` |
| Post-restore migrations | Later repository migrations applied through existing authority before validation | `AC-IMP-037-003-05` |
| Portability | Clean PostgreSQL 18 target import + same validations + interruption handling + evidence | `AC-IMP-037-006-01` … `06` |
| High-risk readiness | `READY` case and `BLOCKED` cases both demonstrated | `AC-IMP-037-007-01` … `06` |
| Reproducibility / reviewability | Runbook reproducible without undocumented manual database edits; independent reviewer can judge from retained evidence | `AC-IMP-037-008-01` … `05` |
| Failure-evidence preservation | First failure remains visible after a later successful rerun | `BR-IMP-037-020` |

PostgreSQL claims must use real PostgreSQL 18, not mocks (TEST-1). All 50 mandatory acceptance
scenarios (`AC-IMP-037-001-01` … `AC-IMP-037-008-05`) require passing evidence before acceptance.
Planned is not proven.

### 19.1 Golden Journey protection

IMP-037 creates no new customer Golden Journey. `GJ-FIRST-ORDER`, `GJ-PERMITTED-OUTLET-ACCESS`, and
`GJ-PAYMENT-RECOVERY` are protected **through safe recovery validation only** — never through
uncontrolled live payment, delivery, or notification effects (`OUTBOUND_PROVIDER_INITIATION:
DISABLED`).

---

# G. Residual risks

## 20. Residual risks accepted or carried by this lock

| Risk | Status under this lock | Mitigation / carrier |
|---|---|---|
| Single-node failure domain: Droplet loss means recovery from Spaces, with real downtime | **Accepted for pilot** (`ARCH-G26`) | Off-host Layer 1 + Layer 2; RTO proven only by drill evidence; HA is out of scope |
| `RTO_TARGET <= 2 hours` on a 2 GiB / 1 vCPU Droplet is unproven | **Open** — `DROPLET_2GIB_RTO_VALIDATED: NO` | Drill evidence required; `ARCH-G26` first scale action is vertical resize to 4 GiB if evidence demands it |
| `RPO_TARGET <= 15 minutes` is a design bound, not a measurement | **Open** — `RPO_RTO_PROVEN: NO` | `archive_timeout = 5 minutes` + continuous WAL; measured per drill |
| pgBackRest **>= 2.55** exceeds the Ubuntu 24.04 stock package (2.50) | **Carried** | Reproducible pinned acquisition path is implementation-deferred (§17) and must not silently degrade to 2.50 |
| Spaces is not immutable/WORM; a compromised host credential could delete backups | **Carried; not overstated** | `SPACES_VERSIONING: ENABLED` on both buckets for accidental overwrite/delete defense; two buckets, separate credentials, narrow deletion authority, run-scoped keys; `SPACES_VERSIONING_IS_IMMUTABILITY: NO` |
| Encryption-secret custody outside the Droplet is an operational responsibility | **Carried / binding** | `RECOVERY_CRITICAL_ENCRYPTION_SECRET_OFF_HOST_CUSTODY: REQUIRED`; Layer 1 passphrase + Layer 2 private identity must remain recoverable off-host; custody mechanism deferred under ADR-015 |
| Layer 1 cipher rotation cannot be performed in place | **Locked / carried** | `PGBACKREST_KEY_ROTATION_MODEL: NEW_ENCRYPTED_REPOSITORY_GENERATION`; prior repository + passphrase retained through required window |
| Host-local `flock` does not protect against a second host operating on the same buckets | **Accepted for pilot** | Single production host under `ARCH-G26`; revisit only if a genuine multi-host topology is ever decided |
| Continuous WAL archiving failure could silently degrade the recovery point | **Mitigated, must be proven** | Readiness must surface WAL/archive health; drill evidence required |
| Layer 2 retention (`35-day rolling retention`) is not statutory retention | **Explicitly distinct** | `FD-037-03`; IMP-038 / privacy owns statutory, customer, audit, and financial retention |
| Backup/repository storage growth could drift cost above the pilot Spaces allowance | **Carried; observation required** | `CAPACITY_COST_OBSERVATION: REQUIRED`; `STORAGE_CAPACITY_VALIDATED: NO`; exceeding allowance is an operating-cost signal, not automatic architecture invalidation |
| Drill cadence discipline (pre-launch, quarterly, after material change) is procedural | **Carried** | `FD-037-04`; readiness reporting makes staleness visible |
| Production infrastructure realization and live cutover are not proven by IMP-037 | **Out of scope by design** | IMP-039 / IMP-040 (`BR-IMP-037-023/024/025`) |

---

# H. Lifecycle / gate status

## 21. Lifecycle, gates, and next steps

```text
IMP037_ARCHITECTURE_LOCKED: YES
ARCHITECTURE_FIT: PASS
ARCHITECTURE_FIT_EXECUTION: PERFORMED
ARCHITECTURE_FIT_RESULT: PASS
INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PASS
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_HEAD = d74ca9a30096fb14bca80643b75aa19d33093dde
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_TREE = 09c7e3bd6b7832944d07d527c149752ed3bbeb4d
INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID = 5256273904

IMPLEMENTATION_AUTHORIZED: YES
IMPLEMENTATION_STARTED: YES
IMP037_IMPLEMENTATION_AUTHORIZED: YES
IMP037_STARTED: YES
IMP037_REPOSITORY_IMPLEMENTATION_MERGED: YES
IMP037_IMPLEMENTATION_PR: 174
IMP037_IMPLEMENTATION_REVIEWED_HEAD: ae7328efe1add11a9a4299150251fe14c71b2730
IMP037_IMPLEMENTATION_REVIEWED_TREE: 4ff19a31db947cafadf690cf6bf1b6d2f1de14ac
IMP037_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP037_INDEPENDENT_IMPLEMENTATION_REVIEW_ID: 5265354130
IMP037_IMPLEMENTATION_MERGE_SHA: f77a54819f51ad5648dda8acb3a7c93345cd5d6c
IMP037_IMPLEMENTATION_MERGE_TREE: 4ff19a31db947cafadf690cf6bf1b6d2f1de14ac
IMP037_POST_MERGE_CI: 35587376968
IMP037_POST_MERGE_CI_RESULT: SUCCESS
IMP037_REPOSITORY_IMPLEMENTATION: MERGED
IMP037_EXTERNAL_RECOVERY_PROOF: NOT_PERFORMED
IMP037_IMPLEMENTATION_COMPLETE: NO
IMP037_ACCEPTED: NO
IMP038_ACTIVATED: NO
IMPLEMENTATION_PERFORMED: NO
PRODUCTION_RESOURCES_CREATED: NO
PRODUCTION_RESTORE_AUTHORIZED: NO

FOUNDER_UAT_REQUIRED = YES
FOUNDER_UAT_STATUS = NOT_PERFORMED
IMPLEMENTATION_AUTHORIZATION_EVIDENCE = PR#171/5743814105
IMPLEMENTATION_START_EVIDENCE = PR#172/5744869269
```

### 21.1 Decision-surface test (no new global decision)

```text
FITS_WITHIN_ARCH_R20: YES
NEW_GLOBAL_DECISION_REQUIRED: NO
D-374_CREATED: YES (already CURRENT; not created by this Fit)
D375_REQUIRED_FOR_LOCK: NO
D-375_CREATED: NO
ARCH_R21_REQUIRED: NO
ARCH_R21_CREATED: NO
```

| Decision-surface question | Answer | Reason |
|---|---|---|
| New deployable service or always-on process? | **NO** | One-shot tooling execution plane; pgBackRest in the PostgreSQL container context |
| New global topology? | **NO** | Single Droplet + Compose + self-hosted PostgreSQL 18 + Spaces, exactly as `ARCH-G26` already binds |
| New auth model, application role, or permission? | **NO** | Capability-scoped read-only logical-backup database role is a database role inside existing persistence-role separation, not application RBAC |
| Application schema or data-contract change? | **NO** | Evidence is operator artifacts; no application-schema change |
| New persistence authority or concurrency semantics for business data? | **NO** | Recovery tooling reads and restores; it does not arbitrate business truth |
| New provider policy? | **NO** | DigitalOcean + Spaces already CURRENT under D-374 / ADR-016 |
| Does anything require a new binding decision? | **NO** | Every locked choice is an in-boundary mechanism selection under ARCH-R20 / D-374 |

### 21.2 What has **not** happened

- **Required external backup/restore proof has not been performed.** `IMPLEMENTATION_PERFORMED: NO`
  / `EXTERNAL_RECOVERY_PROOF: NOT_PERFORMED`. Repository tooling for Layer 1 pgBackRest, Layer 2
  pg_dump+age, restore, readiness, capacity, and systemd **templates** has **merged**
  (`IMP037_REPOSITORY_IMPLEMENTATION: MERGED`); real Spaces buckets, live provider backups,
  production restore, systemd **host install**, and off-host custody **execution** were **not**
  performed by this reconciliation.
- **No production resources were created.** `PRODUCTION_RESOURCES_CREATED: NO`. No Droplet, no
  Spaces bucket, no credential, no key, no schedule exists as a result of this document.
- **No production restore is authorized.** `PRODUCTION_RESTORE_AUTHORIZED: NO`.
- **No RPO/RTO claim is proven.** `RPO_RTO_PROVEN: NO`; `DROPLET_2GIB_RTO_VALIDATED: NO`.
- **No new decision or architecture revision was created.** `D-375_CREATED: NO`;
  `ARCH_R21_CREATED: NO`.
- **IMP-038 was not activated by this IMP-037 capability.** Controlled continuation may set `IMP038_ACTIVATED: YES` for pre-gate PD only (`IMP038_ACTIVATED_BY_IMP037_CAPABILITY: NO`).
- **PR #169 was not reused as authority.** `PR_169_AUTHORITY: NON_AUTHORITATIVE / SUPERSEDED`.

### 21.3 Gate sequence from here

```text
1. ARCHITECTURE_FIT (performed) .................... PASS  [Fit-evaluated main candidate]
2. INDEPENDENT_ARCHITECTURE_FIT_REVIEW ............. PASS
   REVIEWED_HEAD = d74ca9a30096fb14bca80643b75aa19d33093dde
   REVIEWED_TREE = 09c7e3bd6b7832944d07d527c149752ed3bbeb4d
   REVIEW_ID = 5256273904
3. ARCHITECTURE LOCK MERGE ......................... PERFORMED (PR #171)
4. IMPLEMENTATION_AUTHORIZATION .................... GRANTED (PR#171/5743814105)
5. IMPLEMENTATION START ............................ YES (PR#172/5744869269)
6. REPOSITORY IMPLEMENT / MERGE .................... MERGED (PR #174 / f77a5481… / CI 35587376968)
   INDEPENDENT_IMPLEMENTATION_REVIEW ............... PASS (5265354130)
7. EXTERNAL RECOVERY PROOF (R3) .................... NOT_PERFORMED
8. UAT_DEPLOYMENT + FOUNDER_UAT .................... NOT_PERFORMED (FOUNDER_UAT_REQUIRED = YES)
9. ACCEPTANCE + RECONCILIATION (R3) ................ NOT_PERFORMED
```

Implementation is **AUTHORIZED** / **STARTED** / **REPOSITORY MERGED**
(`IMPLEMENTATION_IN_PROGRESS`; authorization evidence PR#171/5743814105; start evidence
PR#172/5744869269; merge evidence PR#174). Repository merge does **not** complete external proof,
accept IMP-037, or activate IMP-038. Next gate is ChatGPT batch review of this reconciliation +
external-proof readiness plan, then explicit R3 external proof — **not** acceptance.

```text
MERGED != COMPLETE
MERGED != ACCEPTED
MERGED != EXTERNAL_RECOVERY_PROOF
IMPLEMENTATION_PERFORMED: NO
IMP037_IMPLEMENTATION_COMPLETE: NO
```

### 21.4 Founder UAT applicability

```text
FOUNDER_UAT_REQUIRED = YES
FOUNDER_UAT_STATUS = NOT_PERFORMED
```

IMP-037 is launch-critical and high-consequence. Future Founder UAT must exercise the **exact**
implementation candidate that passed independent technical acceptance (canonical repository path,
branch, `HEAD`, and content-sensitive `WORKING_TREE_FINGERPRINT`), and must use an **isolated
recovery rehearsal**. The active production/source database must **never** be a drill destination
(`RESTORE_TO_ACTIVE_SOURCE: FORBIDDEN`). No agent may self-declare `FOUNDER_UAT = PASS`.

---

## End matter

```text
IMP-037: IMPLEMENTATION_IN_PROGRESS / AUTHORIZED / STARTED / REPOSITORY_MERGED / NOT_ACCEPTED
IMP-037_ARCHITECTURE: LOCKED (independent Architecture Fit review PASS)
IMP037_ARCHITECTURE_LOCKED: YES
ARCHITECTURE_FIT: PASS
ARCHITECTURE_FIT_EXECUTION: PERFORMED
ARCHITECTURE_FIT_RESULT: PASS
IMPLEMENTATION_AUTHORIZED: YES
IMPLEMENTATION_STARTED: YES
IMP037_IMPLEMENTATION_AUTHORIZED: YES
IMP037_STARTED: YES
IMP037_REPOSITORY_IMPLEMENTATION_MERGED: YES
IMP037_REPOSITORY_IMPLEMENTATION: MERGED
IMP037_EXTERNAL_RECOVERY_PROOF: NOT_PERFORMED
IMP037_IMPLEMENTATION_COMPLETE: NO
IMP037_ACCEPTED: NO
IMP038_ACTIVATED: NO
IMPLEMENTATION_PERFORMED: NO
PRODUCTION_RESOURCES_CREATED: NO
PRODUCTION_RESTORE_AUTHORIZED: NO
RPO_RTO_PROVEN: NO
DROPLET_2GIB_RTO_VALIDATED: NO
STORAGE_CAPACITY_VALIDATED: NO
SPACES_VERSIONING: ENABLED
SPACES_VERSIONING_IS_IMMUTABILITY: NO
SPACES_OBJECT_LOCK_WORM_REQUIRED: NO
RECOVERY_CRITICAL_ENCRYPTION_SECRET_OFF_HOST_CUSTODY: REQUIRED
REMOTE_ARTIFACT_VERIFICATION_BEFORE_COMPLETE: REQUIRED
CAPACITY_COST_OBSERVATION: REQUIRED
PGBACKREST_CIPHER_ROTATION_IN_PLACE: FORBIDDEN
PGBACKREST_KEY_ROTATION_MODEL: NEW_ENCRYPTED_REPOSITORY_GENERATION
FITS_WITHIN_ARCH_R20: YES
D375_REQUIRED_FOR_LOCK: NO
D-375_CREATED: NO
ARCH_R21_REQUIRED: NO
ARCH_R21_CREATED: NO
APPLICATION_SCHEMA_CHANGE_REQUIRED: NO
NEW_DEPLOYABLE_SERVICE: NO
NEW_ALWAYS_ON_RECOVERY_SERVICE: NO
NEW_APPLICATION_ROLE: NO
NEW_APPLICATION_PERMISSION: NO
PR_169_AUTHORITY: NON_AUTHORITATIVE / SUPERSEDED
CANONICAL_ROADMAP_STATE = GTM-R136 / STATE-R134
IMPLEMENTATION_AUTHORIZATION_EVIDENCE = PR#171/5743814105
IMPLEMENTATION_START_EVIDENCE = PR#172/5744869269
ARCHITECTURE_FIT_EVALUATED_HEAD = 28e6dd15c48b8c19abbc7057c4dc7e0a7d7cc7ea
ARCHITECTURE_FIT_EVALUATED_TREE = 5792c963166e8589751d2ba8c8928728e2c83526
ARCHITECTURE_FIT_EVALUATED_WORKING_TREE_FINGERPRINT = 56fa9b5459fd8acceb2ccc3ab73c5d7d9583dbf4539b10a1ef75553dd5aff8ba
INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PASS
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_HEAD = d74ca9a30096fb14bca80643b75aa19d33093dde
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_TREE = 09c7e3bd6b7832944d07d527c149752ed3bbeb4d
INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID = 5256273904
STOP = Do not accept IMP-037 or activate IMP-038; STARTED != COMPLETE; STARTED != ACCEPTED
```

| Marker | Value |
|---|---|
| Capability | IMP-037 — Backup, Restore & Migration Readiness |
| Authority | `CAPABILITY_ARCHITECTURE` |
| Status | `CURRENT` |
| Architecture base | `ARCH-R20` / `D-374` / `ADR-016` (`ARCH-G26`) |
| Architecture | `ARCHITECTURE_LOCKED` (independent Architecture Fit review **PASS**) |
| Implementation | `AUTHORIZED` / `STARTED` / `NOT_PERFORMED` (backup/restore execution) |
| Accepted | **NO** |
| Product Definition | `PD-IMP-037-DRAFT-1` |
| Binding decisions | D-374, ADR-016, ADR-002, ADR-013, ADR-015 |
| Open mutually exclusive architecture alternatives | **NONE** |
