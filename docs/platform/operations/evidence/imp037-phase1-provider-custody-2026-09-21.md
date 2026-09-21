# IMP-037 Phase 1 evidence — provider + secret-custody preconditions

```text
DOCUMENT_ROLE: SUPPORTING_OPS_EVIDENCE
LIFECYCLE_AUTHORITY: NO
ARCHITECTURE_LOCK_CHANGED: NO
PRODUCT_DEFINITION_SEMANTICS_CHANGED: NO

PHASE: IMP-037 EXTERNAL PROOF PHASE 1
PHASE1_RESULT: BLOCKED
STATUS: BLOCKED_PROVIDER_ACCESS
ATTEMPT_1: BLOCKED_SECRET_CUSTODY_DECISION
ATTEMPT_2: BLOCKED_PROVIDER_ACCESS

IMP037_LIFECYCLE: IMPLEMENTATION_IN_PROGRESS
IMP037_REPOSITORY_IMPLEMENTATION: MERGED
IMP037_EXTERNAL_RECOVERY_PROOF: NOT_PERFORMED
IMP037_IMPLEMENTATION_COMPLETE: NO
IMP037_ACCEPTED: NO
IMP037_FOUNDER_UAT: NOT_PERFORMED
IMP038_ACTIVATED: NO
RPO_RTO_PROVEN: NO
STORAGE_CAPACITY_VALIDATED: NO
PRODUCTION_BACKUP_RESTORE: NOT_PERFORMED

NO SECRET VALUES INCLUDED
```

---

## ATTEMPT_1 — historical blocked result (preserved)

```text
ATTEMPT_1 = BLOCKED_SECRET_CUSTODY_DECISION
ATTEMPT_1_RECORDED_AT_UTC: 2026-09-21T11:18:48Z
ATTEMPT_1_HEAD: 87ecf7be3f2b075f30e84311fcf8481df273507a (evidence commits on PR #176)
R3_AUTHORIZATION_ATTEMPT_1: PR #175 issue comment 5759504746 (PHASE 1 ONLY)
INDEPENDENT_BLOCKED_RESULT_REVIEW: 5266114565 / PR #176 review on head 87ecf7be…
```

### Attempt 1 provenance

```text
CANONICAL_REPOSITORY_PATH: /home/ajoshi/repos/boba-bear-platform
BRANCH_AT_GATE0: main
MAIN_SHA: 6e5553257fbd2498a606cda27b9ec9c6aebda7f9
MAIN_TREE: f693da868541738a97168600f85d518868dbb053
POST_MERGE_CI_RUN: 35592155769
POST_MERGE_CI_STATUS: completed
POST_MERGE_CI_CONCLUSION: success
POST_MERGE_CI_HEAD_SHA: 6e5553257fbd2498a606cda27b9ec9c6aebda7f9
ROADMAP_VERSION: GTM-R137
STATE_VERSION: STATE-R135
ARCHITECTURE_VERSION: ARCH-R20
DECISION: D-374 / ADR-016
PRODUCT_DEFINITION: PD-IMP-037-DRAFT-1
LOCKED_CAPABILITY: docs/platform/capabilities/IMP-037-backup-restore-migration-readiness.md
OPERATOR_ENVIRONMENT: WSL2 Linux workstation (Ashutosh-PC)
OPERATOR_CLASSIFICATION: local development / coding-agent execution host
WORKTREE_AT_GATE0: CLEAN
```

Gate 0 (exact-main CI) **PASS** for Attempt 1. All observed required CI jobs on run
`35592155769` were `completed` / `success` on the expected head SHA. No DigitalOcean
mutation was performed.

### Attempt 1 control results

| Control | Result | Notes |
|---|---|---|
| Exact-main CI SUCCESS | PASS | run `35592155769` / head `6e555325…` |
| Inventory-first (no blind creation) | BLOCKED | No DigitalOcean API/CLI credentials available |
| Two distinct private Spaces buckets | BLOCKED | Not verified; not created |
| Versioning ENABLED on both | BLOCKED | Not verified; not mutated |
| Separate physical/logical credentials | BLOCKED | Not verified; not created |
| Limited credential scope | BLOCKED | Not verified |
| Layer 1 passphrase off-host custody | BLOCKED | No approved off-host custody mechanism under CURRENT authority at Attempt 1 |
| Layer 2 age private identity off-host custody | BLOCKED | Same custody decision gap |
| Secret-safe evidence | PASS | No secret material |

```text
SPACES_VERSIONING = NOT_VERIFIED
SPACES_VERSIONING_IS_IMMUTABILITY = NO
SPACES_OBJECT_LOCK_WORM_REQUIRED = NO
```

### Attempt 1 provider

```text
physical_bucket: NOT_VERIFIED
physical_private: NOT_VERIFIED
physical_versioning: NOT_VERIFIED
logical_bucket: NOT_VERIFIED
logical_private: NOT_VERIFIED
logical_versioning: NOT_VERIFIED
distinct_buckets: NOT_VERIFIED
region: NOT_VERIFIED

doctl_present: NO
aws_cli_present: NO
DIGITALOCEAN_ACCESS_TOKEN: UNSET
DIGITALOCEAN_TOKEN: UNSET
Spaces access-key env names for recovery: ABSENT on operator host
repository_.env_recovery_keys: ABSENT (payment/maps keys only; not used)
```

### Attempt 1 custody finding (historical)

Authority search at Attempt 1: locked capability §8.1 requires recoverable off-host copies;
ADR-015 / D-374 / ADR-016 host-local runtime secrets do not name an approved off-host
recovery-custody mechanism. Stop status at Attempt 1:

```text
BLOCKED_SECRET_CUSTODY_DECISION
```

```text
OFF_HOST_CUSTODY_PRESENT = NO
custody_reference = NONE
layer1_passphrase_off_host = NO
layer2_age_private_identity_off_host = NO
```

### Attempt 1 live actions

```text
buckets_created: NO
versioning_changed: NO
credentials_created_or_changed: NO
secret_values_exposed: NO
backup_executed: NO
restore_executed: NO
systemd_installed: NO
stanza_create: NO
pg_dump: NO
real_spaces_upload: NO
```

### Attempt 1 findings (preserved)

1. Gate 0 exact-main CI SUCCESS — provider work was CI-eligible.
2. Off-host custody mechanism was undefined → `BLOCKED_SECRET_CUSTODY_DECISION`.
3. Operator environment lacked DigitalOcean API/Spaces credentials and `doctl`/`aws`
   tooling (secondary environment blocker).
4. No WORM/object-lock claims. Versioning not verified.

Independent review of Attempt 1 blocked result: PASS as failure/blocker evidence
(PR #176 review; review id referenced in continuation authorization context as
`5266114565`).

---

## ATTEMPT_2 — R3 continuation after custody decision

```text
ATTEMPT_2 = BLOCKED_PROVIDER_ACCESS
ATTEMPT_2_RECORDED_AT_UTC: 2026-09-21T11:44:42Z
R3_CONTINUATION_AUTHORIZATION: PR #176 issue comment 5759893209
APPROVED_CUSTODY_MODEL: IMP037_OFF_HOST_CUSTODY_V1 = FOUNDER_CONTROLLED_OFFLINE_RECOVERY_KIT
D_375: NOT_CREATED
ARCH_R21: NOT_CREATED
ADR_015_D374_ADR_016: UNCHANGED
```

### Gate 0 revalidation (Attempt 2)

```text
origin/main: 6e5553257fbd2498a606cda27b9ec9c6aebda7f9
main_tree: f693da868541738a97168600f85d518868dbb053
PR_176_base: 6e5553257fbd2498a606cda27b9ec9c6aebda7f9
PR_176_head_at_start: 87ecf7be3f2b075f30e84311fcf8481df273507a
exact_main_CI_run: 35592155769 = SUCCESS
PR_176_CI_run_at_start: 35594028344 = SUCCESS (head 87ecf7be…)
BASE_MOVED: NO
GATE0_RESULT: PASS
```

### Gate 1 — operator authority (Attempt 2)

Out-of-band DigitalOcean API / Spaces administration authority was re-probed without
printing or requesting secret values.

Sources checked (presence only):

```text
env DIGITALOCEAN_ACCESS_TOKEN / DIGITALOCEAN_TOKEN / DO_API_TOKEN / DO_TOKEN / DO_ACCESS_TOKEN: UNSET
env SPACES_* / AWS_ACCESS_KEY_ID for recovery: UNSET
doctl binary: ABSENT (PATH + common install locations)
aws CLI: ABSENT
s3cmd: ABSENT
~/.config/doctl: ABSENT
Windows doctl config (/mnt/c/Users/sdsaj/...): ABSENT
repository .env* recovery/DO/Spaces key names: ABSENT
~/.cursor/secrets: ABSENT
shell profile DO exports: ABSENT
```

```text
GATE1_RESULT: FAIL
STOP: BLOCKED_PROVIDER_ACCESS
```

No DigitalOcean inventory, bucket create/reuse, versioning mutation, or Spaces credential
create/reuse was performed. Scope was not broadened. Broad account credentials were not
substituted.

### Custody model status after Attempt 2

Human R3 decision (comment `5759893209`) approved:

```text
IMP037_OFF_HOST_CUSTODY_V1 = FOUNDER_CONTROLLED_OFFLINE_RECOVERY_KIT
```

Required semantics acknowledged (non-secret summary only):

- two tamper-evident recovery copies
- physically separate Founder-controlled secure locations
- each copy: Layer 1 pgBackRest cipher passphrase + Layer 2 age private recovery
  identity + non-secret generation/identity labels
- break-glass recovery only; NOT runtime secret storage
- no SaaS/external secret manager; no secrets in Git/chat/evidence/logs/tickets
- evidence stores only non-secret custody references
- old Layer 1 generations / Layer 2 identities retained while artifacts depend on them
- destruction later recorded with non-secret metadata only

```text
CUSTODY_MODEL_APPROVED: YES
CUSTODY_KITS_CREATED: NO
layer1_passphrase_generated: NO
layer2_age_identity_generated: NO
offline_kit_A_reference: NOT_CREATED
offline_kit_B_reference: NOT_CREATED
physically_separate: NOT_VERIFIED
layer1_off_host_custody: NO
layer2_off_host_custody: NO
```

Custody kit creation and Layer 1/Layer 2 secret generation were **not** executed on this
attempt because Gate 1 provider authority failed first; Phase 1 remains blocked and no
orphan recovery secrets were introduced into operator custody without a completable
provider path.

### Attempt 2 provider / credentials (unchanged — not verified)

```text
physical_bucket: NOT_VERIFIED
physical_private: NOT_VERIFIED
physical_versioning: NOT_VERIFIED
logical_bucket: NOT_VERIFIED
logical_private: NOT_VERIFIED
logical_versioning: NOT_VERIFIED
distinct_buckets: NOT_VERIFIED
region: NOT_VERIFIED

physical_credential_reference: NONE
logical_credential_reference: NONE
physical_credential_separate: NOT_VERIFIED
logical_credential_separate: NOT_VERIFIED
physical_scope: NOT_VERIFIED
logical_scope: NOT_VERIFIED
runtime_app_credentials_reused: NO
credential_scope_acceptable: NOT_VERIFIED
```

```text
SPACES_VERSIONING = NOT_VERIFIED
SPACES_VERSIONING_IS_IMMUTABILITY = NO
SPACES_OBJECT_LOCK_WORM_REQUIRED = NO
```

### Attempt 2 live actions

```text
buckets_created: NO
versioning_changed: NO
credentials_created_or_changed: NO
custody_kits_created: NO
secret_values_exposed: NO
backup_executed: NO
restore_executed: NO
systemd_installed: NO
stanza_create: NO
pg_dump: NO
real_spaces_upload: NO
```

### Phase 1 PASS criteria evaluation (Attempt 2)

```text
physical_bucket_verified = NO
physical_private = NO
physical_versioning = NOT_ENABLED_VERIFIED
logical_bucket_verified = NO
logical_private = NO
logical_versioning = NOT_ENABLED_VERIFIED
distinct_buckets = NO
physical_credential_separate = NO
logical_credential_separate = NO
runtime_credentials_reused = NO
credential_scope_acceptable = NO
layer1_off_host_custody = NO
layer2_off_host_custody = NO
two_separate_offline_kits = NO
secret_values_exposed = NO

PHASE1_RESULT = BLOCKED
PHASE1_PASS = NO
```

### Configuration map (secret-safe; Phase 2 prep — values NOT populated)

Layer 1 expected names only:

```text
BOBA_RECOVERY_PHYSICAL_SPACES_BUCKET
BOBA_RECOVERY_PHYSICAL_SPACES_ENDPOINT
BOBA_RECOVERY_PHYSICAL_SPACES_REGION
physical credential reference (name only — not present)
BOBA_PGBACKREST_GENERATION
Layer1 custody references (not present)
```

Layer 2 expected names only:

```text
BOBA_RECOVERY_LOGICAL_SPACES_BUCKET
BOBA_RECOVERY_LOGICAL_SPACES_ENDPOINT
BOBA_RECOVERY_LOGICAL_SPACES_REGION
logical credential reference (name only — not present)
age public recipient safe identifier (not present)
Layer2 custody references (not present)
```

No access-key secrets, passphrase, private age identity, tokens, or signed URLs were
committed.

### Attempt 2 findings

1. Gate 0 revalidation PASS; main has not moved semantically from the authorized base.
2. Custody decision gap from Attempt 1 is **resolved by human R3** as
   `FOUNDER_CONTROLLED_OFFLINE_RECOVERY_KIT` (comment `5759893209`). No D-375 / ARCH-R21.
3. Gate 1 fails: no out-of-band DigitalOcean API/Spaces administration authority is
   available on the operator host. Stop = `BLOCKED_PROVIDER_ACCESS`.
4. No live Spaces inventory/create/versioning/credential work and no custody-kit sealing
   were performed on Attempt 2.
5. Phase 2 remains forbidden without a separate explicit R3 authorization.

### Explicit non-claims

```text
PHASE1_PASS: NO
REAL_SPACES: NOT_PERFORMED
OFF_HOST_SECRET_CUSTODY_EXECUTED: NO
RPO_RTO_PROVEN: NO
STORAGE_CAPACITY_VALIDATED: NO
PRODUCTION_BACKUP_RESTORE: NOT_PERFORMED
FOUNDER_UAT: NOT_PERFORMED
IMP037_ACCEPTED: NO
IMP038_ACTIVATED: NO
```

### Next gate

```text
CHATGPT_PHASE1_FINAL_INDEPENDENT_REVIEW
HUMAN_ACTION_REQUIRED: supply DigitalOcean API / Spaces administration authority
  out-of-band to the operator environment (env / protected local credential file /
  authenticated provider CLI / other approved operator-local mechanism)
THEN: re-run Phase 1 inventory → buckets → versioning → separated credentials →
  Founder offline recovery-kit copies under an explicit Phase-1 R3 continuation if required
DO_NOT_START_PHASE_2
DO_NOT_MERGE_WITHOUT_EXPLICIT_R3
```

```text
NO SECRET VALUES INCLUDED
```
