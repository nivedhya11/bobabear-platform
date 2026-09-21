# IMP-037 local prequalification evidence (2026-09-21)

```text
DOCUMENT_ROLE: SUPPORTING_OPS_EVIDENCE
QUALIFYING_EXTERNAL_PROOF: NO
PROVIDER_ACCESS_DEFERRED: YES
REAL_SPACES: NOT_PERFORMED
RPO_RTO_PROVEN: NO
DROPLET_2GIB_RTO_VALIDATED: NO
STORAGE_CAPACITY_VALIDATED: NO
FOUNDER_UAT: NOT_PERFORMED
IMP037_ACCEPTED: NO
LIFECYCLE_AUTHORITY: NO
```

Supporting **LOCAL_PREQUALIFICATION** evidence only. This is **not** qualifying
external / DigitalOcean Spaces proof.

---

## Provenance

```text
CANONICAL_REPOSITORY_PATH: /home/ajoshi/repos/boba-bear-platform
BASE_BRANCH: main
BASE_SHA: 3d9751c55b0ed82474d6a682601fdf96e92eed2c
BASE_TREE: c421ec45aecd4e819ab0aafd59d4b86f8fa0a732
EXACT_MAIN_CI: 35599957212 = SUCCESS (all 12 jobs)
ROADMAP: GTM-R137
STATE: STATE-R135
IMP-037: IMPLEMENTATION_IN_PROGRESS
IMP037_EXTERNAL_RECOVERY_PROOF: NOT_PERFORMED
IMP037_IMPLEMENTATION_COMPLETE: NO
IMP037_ACCEPTED: NO
IMP038_ACTIVATED: NO
```

## Provider deferral (persisted; not lifecycle advance)

```text
PROVIDER_DEPENDENT_PROOF: DEFERRED_PENDING_PROVIDER_ACCESS
PROVIDER_DEFERRAL_HUMAN_EVIDENCE: PR#176/5760581348
PHASE1_RESULT: BLOCKED
PHASE1_BLOCK_STATUS: BLOCKED_PROVIDER_ACCESS
REAL_SPACES: NOT_PERFORMED
RESUME_CONDITION:
  DIGITALOCEAN_OPERATOR_ACCESS_AVAILABLE
  +
  FRESH_EXPLICIT_R3_PHASE1_CONTINUATION
DO_NOT_START_QUALIFYING_PHASE2_PROVIDER_PROOF: YES
```

Clarification: provider proof is deferred. IMP-037 itself is **not** deferred
and is **not** accepted.

## Execution environment

```text
OPERATOR_HOST: WSL2 Linux workstation
CONTAINER_RUNTIME: podman 4.9.3 (docker CLI present but daemon unreachable; resolveContainerCli → podman)
POSTGRES_IMAGE: boba-bear-postgres:local (from docker/postgres/Dockerfile)
POSTGRES_VERSION: PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2)
PGBACKREST_VERSION: pgBackRest 2.56.0  (floor >= 2.55; stock 2.50 refused)
AGE_VERSION: 1.2.1 (via recovery image; host age absent → TEST-ONLY containerized age seam)
AGE_IDENTITIES: disposable test-only; destroyed in cleanup; NOT Founder custody
```

## Commands executed (summary)

```text
git fetch origin
# Gate 0: origin/main == 3d9751c… / tree c421ec45… / CI 35599957212 SUCCESS
BOBA_RECOVERY_BUILD_POSTGRES=1 / BOBA_RECOVERY_LAYER1_POSIX=1
  node --test scripts/recovery/integration/layer1-pgbackrest.integration.test.mjs
node --test scripts/recovery/integration/postgres18.integration.test.mjs
node --test scripts/recovery/integration/portability-e2e.integration.test.mjs
npm run test:recovery
npm run recovery:systemd:validate
npm run recovery:capacity
npm run project:consistency
node --test scripts/project-consistency.test.mjs
npm run testing:inventory:check
git diff --check
```

## Results

### Baseline `npm run test:recovery`

```text
tests: 139
pass: 137
fail: 0
skipped: 2
```

| Skip | Classification | Reason |
|---|---|---|
| optional postgres image build verifies pgBackRest >= 2.55 | EXPECTED_PROVIDER_SKIP / heavy optional | `BOBA_RECOVERY_BUILD_POSTGRES!=1` in default suite; exercised explicitly with flag |
| local POSIX Layer-1 mechanics | EXPECTED_PROVIDER_SKIP / heavy optional | requires `BOBA_RECOVERY_LAYER1_POSIX=1` or build flag; exercised explicitly with flag |

### Layer 1 local POSIX mechanics

```text
LOCAL_LAYER1_MECHANICS: PASS
REAL_SPACES_LAYER1: NOT_PERFORMED
REAL_SPACES: NOT_PERFORMED
image_build: PASS (pgBackRest 2.56.0)
stanza_create: PASS
check: PASS
full_backup: PASS (~28–33s local)
wal_mutation_and_archive: PASS (local posix; not Spaces)
differential: PASS (~3–4s local)
info_json: PASS
verify: PASS
local_restore_or_pitr: NOT_PERFORMED_IN_THIS_PACKET (logical/portability path covered separately)
source_unchanged: PASS (disposable container identity retained through backup ops)
```

Defect fixed in-scope: entrypoint left `umask 077` after rendering pgBackRest
conf, which blocked PostgreSQL 18 PGDATA mkdir under archive mode. Restored
`umask 022` after secret-safe conf write.

### Layer 2 local COMPLETE chain

```text
LOCAL_LAYER2_COMPLETE_CHAIN: PASS
REAL_SPACES_LAYER2: NOT_PERFORMED
restricted_role: PASS (exercised in portability E2E; NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOREPLICATION)
pg_dump_fc: PASS
age_encrypt: PASS (containerized disposable identity)
local_object_upload: PASS
checksum_verify: PASS
complete_last: PASS
```

### Portability + real migration authority

```text
LOCAL_REAL_MIGRATION_AFTER_RESTORE: PASS
fresh_pg18: PASS
decrypt: PASS
pg_restore: PASS (in-container as migrator)
real_migration_authority: PASS (scripts/database/migrate.ts / BOBA_BEAR_DATABASE_MIGRATION_URL)
business_validation: PASS (BUSINESS_INTEGRITY_VALIDATED)
provider_suppression: PASS (networkIsolated + DNS/credentials absent invariants)
source_unchanged: PASS (post-dump source-only marker retained)
cleanup: PASS (run-owned target removed)
```

Defects fixed in-scope:

- Migration authority now binds `BOBA_BEAR_DATABASE_MIGRATION_URL` (was incorrectly
  only `DATABASE_URL`, which would not retarget `migrate.ts`).
- Disposable target bootstrap grants `CREATE ON DATABASE` to migrator and exposes
  `migratorDatabaseUrl`.
- Logical restore uses provisioned container `pg_restore` (host client absent) as
  migrator when available.
- Stable `pg_isready` wait (consecutive successes) to avoid PostgreSQL 18 init race.
- Containerized age tools when host `age`/`age-keygen` absent (uses recovery image).

### Negative paths / readiness / isolation

Covered by existing unit suite under `npm run test:recovery` (source==target refuse,
target reuse, interruption, COMPLETE absent on failure, failure evidence retained,
high-risk READY-shaped local fixtures + BLOCKED missing/stale/newer-failure/failed-rehearsal).

```text
LOCAL_GATE_MECHANICS_READY: YES
PRODUCTION_HIGH_RISK_READINESS: NOT_PROVEN
LOCAL_PROVIDER_SUPPRESSION: PASS
```

### Systemd

```text
SYSTEMD_TEMPLATE_VALIDATION: PASS (6 unit files OK)
SYSTEMD_HOST_INSTALL: NOT_PERFORMED
```

### Non-qualifying local observations

```text
NON_QUALIFYING_LOCAL_TIMING_OBSERVATIONS:
  layer1_full_ms: ~28228–32795
  layer1_diff_ms: ~3260–3788
  source_migration_ms: ~20054
  logical_backup_ms: ~1300
  full_portability_rehearsal_ms: ~136538
RPO_RTO_PROVEN: NO
DROPLET_2GIB_RTO_VALIDATED: NO

LOCAL_CAPACITY_OBSERVATION:
  recovery:capacity → total=0B projected35d=0B (no live Spaces/repo observation)
STORAGE_CAPACITY_VALIDATED: NO
```

### Founder UAT preparation

Checklist updated/created:

`docs/platform/operations/imp037-founder-uat-checklist.md`

```text
FOUNDER_UAT: NOT_PERFORMED
```

### Cleanup / secret scan

```text
CLEANUP: run-owned disposable containers/networks/tmp age wrappers removed
SECRET_SCAN: PASS (no Founder custody identities, Spaces secrets, or private keys in evidence)
NO SECRET VALUES INCLUDED
```

## Explicit non-claims

```text
QUALIFYING_EXTERNAL_PROOF: NO
REAL_SPACES: NOT_PERFORMED
PHASE1_PASS: NO
RPO_RTO_PROVEN: NO
DROPLET_2GIB_RTO_VALIDATED: NO
STORAGE_CAPACITY_VALIDATED: NO
FOUNDER_UAT: NOT_PERFORMED
IMP037_IMPLEMENTATION_COMPLETE: NO
IMP037_ACCEPTED: NO
IMP038_ACTIVATED: NO
PRODUCTION_HIGH_RISK_READINESS: NOT_PROVEN
```
