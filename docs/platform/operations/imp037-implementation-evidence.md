# IMP-037 implementation evidence (supporting)

Supporting operations note for **IMP-037**. This file is **not** lifecycle authority.
Canonical lifecycle/acceptance remain in `docs/platform/ROADMAP.md` and
`docs/platform/STATE.md`. Locked architecture semantics are unchanged.

```text
DOCUMENT_ROLE: SUPPORTING_OPS_EVIDENCE
LIFECYCLE_AUTHORITY: NO
ARCHITECTURE_LOCK_CHANGED: NO
IMP037_ACCEPTED: NO
IMP038_ACTIVATED: NO
IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE: NO
IMP037_IMPLEMENTATION_COMPLETE: NO

REPOSITORY_IMPLEMENTATION: MERGED
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

EXTERNAL_RECOVERY_PROOF: NOT_PERFORMED
IMPLEMENTATION_PERFORMED: NO
```

`IMPLEMENTATION_PERFORMED: NO` refers to **required backup/restore/provider proof execution**,
not to absence of repository tooling. Repository Layer 1/Layer 2/restore modules exist and are
merged; live Spaces/provider/host proof has **not** been performed.

## Automated proof performed (repository)

- Recovery module suite under `scripts/recovery/**/*.test.mjs` (CLI, evidence,
  readiness, Layer 1/2 modules, Spaces local store, gate, capacity, flock, redact,
  systemd unit parse/validate, isolation, business integrity).
- CLI wiring for status, evidence validate, target check, backup layer1/layer2,
  restore pitr/logical, drill/rehearsal, high-risk gate, capacity, systemd validate,
  pgbackrest version, rotate-keys (plan only), spaces config-check.
- Layer 1 backup runner defaults to post-backup `pgbackrest verify`.
- systemd unit/timer templates under `docker/recovery/systemd/` (**install not
  performed**).
- Compose postgres image build path `docker/postgres/Dockerfile` pinning
  **pgBackRest 2.56.0** (>= 2.55; Ubuntu stock 2.50 forbidden); archive default off.
- Verified disposable image: `pgBackRest 2.56.0` + `age 1.2.1` in
  `localhost/boba-bear-postgres:local` (podman build).
- Disposable PostgreSQL 18.4 integration: business-integrity validation + Layer 2
  COMPLETE-last chain against local object store (when `age`/`age-keygen` on PATH).

## Explicitly not proven by this packet

```text
REAL_SPACES_INTEGRATION: NOT_PERFORMED
SYSTEMD_HOST_INSTALL: NOT_PERFORMED
RPO_RTO_PROVEN: NO
STORAGE_CAPACITY_VALIDATED: NO
DROPLET_2GIB_RTO_VALIDATED: NO
FOUNDER_UAT: NOT_PERFORMED
PRODUCTION_BACKUP_RESTORE: NOT_PERFORMED
OFF_HOST_SECRET_CUSTODY: DOCUMENTED_NOT_EXECUTED
EXTERNAL_RECOVERY_PROOF: NOT_PERFORMED
```

## Future external-proof campaign

Planning-only (does **not** authorize live action):
[`imp037-external-proof-plan.md`](./imp037-external-proof-plan.md)

## AC coverage classification (repository packet)

Classifications:

- `PROVEN_AUTOMATED` — covered by repository automated tests
- `IMPLEMENTED_NOT_EXTERNALLY_PROVEN` — code/runbook present; needs host/provider/Founder proof
- `NOT_PERFORMED_REQUIRES_PROVIDER` — needs real DigitalOcean Spaces
- `NOT_PERFORMED_REQUIRES_PILOT_ENV` — needs 2 GiB pilot Droplet measurement
- `NOT_PERFORMED_REQUIRES_FOUNDER_UAT` — Founder interactive UAT
- `GAP` — repository implementation gap (none expected after merge)

| AC | Classification |
|---|---|
| AC-IMP-037-001-01 | PROVEN_AUTOMATED |
| AC-IMP-037-001-02 | PROVEN_AUTOMATED |
| AC-IMP-037-001-03 | PROVEN_AUTOMATED |
| AC-IMP-037-001-04 | PROVEN_AUTOMATED |
| AC-IMP-037-001-05 | PROVEN_AUTOMATED |
| AC-IMP-037-002-01 | PROVEN_AUTOMATED (Layer2 local COMPLETE chain; Layer1 via image+runner) |
| AC-IMP-037-002-02 | PROVEN_AUTOMATED |
| AC-IMP-037-002-03 | PROVEN_AUTOMATED |
| AC-IMP-037-002-04 | IMPLEMENTED_NOT_EXTERNALLY_PROVEN (logical-backup role bootstrap) |
| AC-IMP-037-002-05 | PROVEN_AUTOMATED |
| AC-IMP-037-002-06 | PROVEN_AUTOMATED |
| AC-IMP-037-002-07 | PROVEN_AUTOMATED |
| AC-IMP-037-003-01 | PROVEN_AUTOMATED |
| AC-IMP-037-003-02 | PROVEN_AUTOMATED |
| AC-IMP-037-003-03 | IMPLEMENTED_NOT_EXTERNALLY_PROVEN (restore modules + disposable path) |
| AC-IMP-037-003-04 | PROVEN_AUTOMATED |
| AC-IMP-037-003-05 | IMPLEMENTED_NOT_EXTERNALLY_PROVEN (post-restore migrate wrapper) |
| AC-IMP-037-003-06 | PROVEN_AUTOMATED (isolation/classification) |
| AC-IMP-037-003-07 | PROVEN_AUTOMATED (provider suppression fail-closed) |
| AC-IMP-037-004-01 | IMPLEMENTED_NOT_EXTERNALLY_PROVEN |
| AC-IMP-037-004-02 | PROVEN_AUTOMATED (schema presence categories) |
| AC-IMP-037-004-03 | PROVEN_AUTOMATED |
| AC-IMP-037-004-04 | PROVEN_AUTOMATED |
| AC-IMP-037-004-05 | PROVEN_AUTOMATED |
| AC-IMP-037-004-06 | PROVEN_AUTOMATED |
| AC-IMP-037-004-07 | PROVEN_AUTOMATED |
| AC-IMP-037-004-08 | IMPLEMENTED_NOT_EXTERNALLY_PROVEN (instrumentation present; RPO/RTO not claimed proven) |
| AC-IMP-037-005-01 | PROVEN_AUTOMATED |
| AC-IMP-037-005-02 | PROVEN_AUTOMATED |
| AC-IMP-037-005-03 | PROVEN_AUTOMATED |
| AC-IMP-037-005-04 | PROVEN_AUTOMATED |
| AC-IMP-037-005-05 | PROVEN_AUTOMATED |
| AC-IMP-037-005-06 | PROVEN_AUTOMATED |
| AC-IMP-037-006-01 | IMPLEMENTED_NOT_EXTERNALLY_PROVEN |
| AC-IMP-037-006-02 | IMPLEMENTED_NOT_EXTERNALLY_PROVEN |
| AC-IMP-037-006-03 | IMPLEMENTED_NOT_EXTERNALLY_PROVEN |
| AC-IMP-037-006-04 | IMPLEMENTED_NOT_EXTERNALLY_PROVEN |
| AC-IMP-037-006-05 | PROVEN_AUTOMATED (interruption evidence paths) |
| AC-IMP-037-006-06 | PROVEN_AUTOMATED |
| AC-IMP-037-007-01 | PROVEN_AUTOMATED |
| AC-IMP-037-007-02 | PROVEN_AUTOMATED |
| AC-IMP-037-007-03 | IMPLEMENTED_NOT_EXTERNALLY_PROVEN |
| AC-IMP-037-007-04 | PROVEN_AUTOMATED |
| AC-IMP-037-007-05 | PROVEN_AUTOMATED |
| AC-IMP-037-007-06 | PROVEN_AUTOMATED |
| AC-IMP-037-008-01 | IMPLEMENTED_NOT_EXTERNALLY_PROVEN (runbook) |
| AC-IMP-037-008-02 | PROVEN_AUTOMATED |
| AC-IMP-037-008-03 | PROVEN_AUTOMATED |
| AC-IMP-037-008-04 | PROVEN_AUTOMATED |
| AC-IMP-037-008-05 | IMPLEMENTED_NOT_EXTERNALLY_PROVEN |

Provider / pilot / Founder overlays that apply in addition to the table above:

- Spaces provider verification of both buckets → `NOT_PERFORMED_REQUIRES_PROVIDER`
- 2 GiB Droplet RTO measurement → `NOT_PERFORMED_REQUIRES_PILOT_ENV`
- Founder UAT of recovery drill → `NOT_PERFORMED_REQUIRES_FOUNDER_UAT`

Full 50-AC proof-campaign matrix (including qualifying evidence artifacts):
[`imp037-external-proof-plan.md`](./imp037-external-proof-plan.md#50-ac-proof-matrix).
