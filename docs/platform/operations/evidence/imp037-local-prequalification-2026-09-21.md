# IMP-037 local prequalification evidence (2026-09-21)

```text
DOCUMENT_ROLE: SUPPORTING_OPS_EVIDENCE
QUALIFYING_EXTERNAL_PROOF: NO
PROVIDER_ACCESS_DEFERRED: YES
REAL_SPACES: NOT_PERFORMED
PHASE1_PASS: NO
RPO_RTO_PROVEN: NO
DROPLET_2GIB_RTO_VALIDATED: NO
STORAGE_CAPACITY_VALIDATED: NO
FOUNDER_UAT: NOT_PERFORMED
IMP037_ACCEPTED: NO
IMP038_ACTIVATED: NO
LIFECYCLE_AUTHORITY: NO
```

Supporting **LOCAL_PREQUALIFICATION** evidence only. This is **not** qualifying
external / DigitalOcean Spaces proof.

Remediation packet (PR #177 review findings): pg_restore nonzero fail-closed,
run-owned internal-network isolation proof, Founder UAT checklist provenance.

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
npm run test:recovery
BOBA_RECOVERY_BUILD_POSTGRES=1 node --test scripts/recovery/integration/layer1-pgbackrest.integration.test.mjs
node --test scripts/recovery/integration/postgres18.integration.test.mjs
node --test scripts/recovery/integration/portability-e2e.integration.test.mjs
npm run recovery:systemd:validate
npm run project:consistency
node --test scripts/project-consistency.test.mjs
npm run testing:inventory:check
git diff --check
# plus targeted unit tests for pg_restore exit handling + network ownership/proof
```

## Results

### Baseline `npm run test:recovery`

```text
tests: 153
pass: 151
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
full_backup: PASS
wal_mutation_and_archive: PASS (local posix; not Spaces)
differential: PASS
info_json: PASS
verify: PASS
local_restore_or_pitr: NOT_PERFORMED_IN_THIS_PACKET (logical/portability path covered separately)
source_unchanged: PASS (disposable container identity retained through backup ops)
```

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

### Portability + real migration authority + runtime isolation

```text
LOCAL_REAL_MIGRATION_AFTER_RESTORE: PASS
fresh_pg18: PASS
decrypt: PASS
pg_restore: PASS (in-container as migrator; --exit-on-error; exit status authoritative)
real_migration_authority: PASS (scripts/database/migrate.ts / BOBA_BEAR_DATABASE_MIGRATION_URL)
business_validation: PASS (BUSINESS_INTEGRITY_VALIDATED)
source_unchanged: PASS (post-dump source-only marker retained)
cleanup: PASS (run-owned target + run-owned internal network removed)
```

#### Isolation / provider suppression (runtime-proven)

```text
internal_network_created: YES (unique RUN_ID-owned Podman network, --internal)
network_internal_verified: YES (podman network inspect → Internal/internal = true)
network_proof_source: provisionLogicalTarget inspectNetworkInternal after create + after attach; E2E re-inspect
loopback_host_publish: YES (127.0.0.1::5432 for migration authority / validation)
production_credentials_absent_verified: YES (controlled env strips forbidden provider keys; assertProductionProviderCredentialsAbsent)
production_dns_absent: YES (provisioner introduces no production DNS/host mapping; productionDnsAbsentVerified=true)
networkIsolated_derived_from_runtime_proof: YES (not hard-coded true)
LOCAL_PROVIDER_SUPPRESSION: PASS
```

Unit fail-closed coverage also proves:

- internal verified → isolation eligible
- default/non-internal network → BLOCKED
- missing network proof → BLOCKED
- wrong/unowned network cannot be removed
- target cleanup removes only its own network

### pg_restore exit handling (remediation)

```text
exit_on_error: YES (--exit-on-error on in-container and host invocations)
nonzero_fails: YES (process exit status authoritative; no stderr WARNING→success path)
warning_status1_test: PASS (status=1 WARNING-only → FAIL)
mixed_warning_error_test: PASS (status=1 WARNING+ERROR → FAIL)
error_status1_test: PASS
migration_after_failed_restore_prevented: PASS
secret_redaction: PASS
```

### Negative paths / readiness

Covered by existing unit suite under `npm run test:recovery` (source==target refuse,
target reuse, interruption, COMPLETE absent on failure, failure evidence retained,
high-risk READY-shaped local fixtures + BLOCKED missing/stale/newer-failure/failed-rehearsal).

```text
LOCAL_GATE_MECHANICS_READY: YES
PRODUCTION_HIGH_RISK_READINESS: NOT_PROVEN
```

### Systemd

```text
SYSTEMD_TEMPLATE_VALIDATION: PASS (6 unit files OK)
SYSTEMD_HOST_INSTALL: NOT_PERFORMED
```

### Non-qualifying local observations

```text
NON_QUALIFYING_LOCAL_TIMING_OBSERVATIONS:
  layer1_full_ms: ~8627
  layer1_diff_ms: ~2837
  source_migration_ms: ~18310
  logical_backup_ms: ~1036
  full_portability_rehearsal_ms: ~103718–110735
RPO_RTO_PROVEN: NO
DROPLET_2GIB_RTO_VALIDATED: NO

LOCAL_CAPACITY_OBSERVATION:
  recovery:capacity → total=0B projected35d=0B (no live Spaces/repo observation)
STORAGE_CAPACITY_VALIDATED: NO
```

### Founder UAT preparation

Checklist updated:

`docs/platform/operations/imp037-founder-uat-checklist.md`

Mandatory merged-main / PODMAN_WSL / `boba-staging` / exact-git-tree build /
fresh-image / running-image verification preconditions encoded. Conditional
“UAT deployment (if required)” wording removed.

```text
FOUNDER_UAT: NOT_PERFORMED
FOUNDER_UAT_REQUIRED: YES
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
