# IMP-037 Phase 1 evidence — provider + secret-custody preconditions

```text
DOCUMENT_ROLE: SUPPORTING_OPS_EVIDENCE
LIFECYCLE_AUTHORITY: NO
ARCHITECTURE_LOCK_CHANGED: NO
PRODUCT_DEFINITION_SEMANTICS_CHANGED: NO

PHASE: IMP-037 EXTERNAL PROOF PHASE 1
PHASE1_RESULT: BLOCKED
STATUS: BLOCKED_SECRET_CUSTODY_DECISION
SECONDARY_BLOCKER: ENVIRONMENT_BLOCKER (no DigitalOcean operator credentials)

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

## Provenance

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
R3_AUTHORIZATION: PR #175 issue comment 5759504746 (PHASE 1 ONLY)
EVIDENCE_RECORDED_AT_UTC: 2026-09-21T11:18:48Z
OPERATOR_ENVIRONMENT: WSL2 Linux workstation (Ashutosh-PC)
OPERATOR_CLASSIFICATION: local development / coding-agent execution host
WORKTREE_AT_GATE0: CLEAN
```

Gate 0 (exact-main CI) **PASS**. All observed required CI jobs on run `35592155769`
were `completed` / `success` on the expected head SHA. No DigitalOcean mutation was
performed before or after that verification.

Alignment against CURRENT authorities (AGENTS.md, ROADMAP, STATE, ARCH-R20, D-374 /
ADR-016, ADR-015, IMP-037 Product Definition, locked IMP-037 capability, recovery
runbook, external-proof plan): semantic position matches expected GTM-R137 /
STATE-R135 / IMP-037 `IMPLEMENTATION_IN_PROGRESS` with external proof
`NOT_PERFORMED`. **Gate Result: PASS** for authority identity; Phase 1 execution
still **BLOCKED** on custody + provider access (below).

## Control results

| Control | Result | Notes |
|---|---|---|
| Exact-main CI SUCCESS | PASS | run `35592155769` / head `6e555325…` |
| Inventory-first (no blind creation) | BLOCKED | No DigitalOcean API/CLI credentials available in operator environment; inventory not possible |
| Two distinct private Spaces buckets | BLOCKED | Not verified; not created |
| Versioning ENABLED on both | BLOCKED | Not verified; not mutated |
| Separate physical/logical credentials | BLOCKED | Not verified; not created |
| Limited credential scope | BLOCKED | Not verified |
| Layer 1 passphrase off-host custody | BLOCKED | No approved off-host custody mechanism under CURRENT authority |
| Layer 2 age private identity off-host custody | BLOCKED | Same custody decision gap |
| Secret-safe evidence | PASS | This artifact contains no secret material |

```text
SPACES_VERSIONING = NOT_VERIFIED
SPACES_VERSIONING_IS_IMMUTABILITY = NO
SPACES_OBJECT_LOCK_WORM_REQUIRED = NO
```

## Provider

```text
physical_bucket: NOT_VERIFIED
physical_private: NOT_VERIFIED
physical_versioning: NOT_VERIFIED
logical_bucket: NOT_VERIFIED
logical_private: NOT_VERIFIED
logical_versioning: NOT_VERIFIED
distinct_buckets: NOT_VERIFIED
region: NOT_VERIFIED (locked topology remains DigitalOcean Spaces under D-374 / ARCH-R20; no region mutation introduced)

doctl_present: NO
aws_cli_present: NO
DIGITALOCEAN_ACCESS_TOKEN: UNSET
DIGITALOCEAN_TOKEN: UNSET
Spaces access-key env names for recovery: ABSENT on operator host
repository_.env_recovery_keys: ABSENT (payment/maps keys only; not used)
```

Inventory conclusion: **no live Spaces mutation authorized path is executable from this
operator environment** until a Founder/operator supplies DigitalOcean API authority
out-of-band (not via chat / not into the repository).

## Credential authority

```text
physical_credential_separate: NOT_VERIFIED
logical_credential_separate: NOT_VERIFIED
physical_scope: NOT_VERIFIED
logical_scope: NOT_VERIFIED
runtime_app_credentials_reused: NO (none used; none created)
```

## Custody

Authority search (CURRENT):

- Locked capability §8.1 requires recoverable **off-host** copies of the Layer 1
  pgBackRest cipher passphrase and the Layer 2 age private identity, and states that
  the **exact custody mechanism remains implementation-deferred under ADR-015**.
- ADR-015 / D-374 / ADR-016 approve **host-local protected files / OS mechanism on the
  production Droplet** for pilot production secrets and explicitly **do not require a
  paid secret manager** for the pilot.
- No CURRENT decision names an approved **off-host** recovery-custody mechanism
  (no password-manager binding, no Vault, no Founder-held sealed process identifier,
  no USB/paper procedure with a non-secret custody reference).

```text
OFF_HOST_CUSTODY_PRESENT = NO
custody_reference = NONE
layer1_passphrase_off_host = NO
layer1_custody_reference = NONE
layer2_age_private_identity_off_host = NO
layer2_custody_reference = NONE
current_generation = NOT_INITIALIZED
prior_generation_retention_requirement = REQUIRED while dependent Layer 1 artifacts exist
prior_identity_retention = REQUIRED while dependent Layer 2 artifacts exist
```

Per Phase 1 contract: **do not invent** repository files, plaintext shared documents,
chat messages, or ad-hoc cloud notes as custody. Stop status:

```text
BLOCKED_SECRET_CUSTODY_DECISION
```

## Live actions

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

## Configuration map (secret-safe; Phase 2 prep — values NOT populated)

Layer 1 expected environment names (names only):

```text
BOBA_RECOVERY_PHYSICAL_SPACES_BUCKET
BOBA_RECOVERY_PHYSICAL_SPACES_ENDPOINT
BOBA_RECOVERY_PHYSICAL_SPACES_REGION
BOBA_PHYSICAL_SPACES_ACCESS_KEY_ID
BOBA_PHYSICAL_SPACES_SECRET_ACCESS_KEY
PGBACKREST_CIPHER_PASS
BOBA_PGBACKREST_GENERATION
```

Layer 2 expected configuration names (names only):

```text
BOBA_RECOVERY_LOGICAL_SPACES_BUCKET
BOBA_RECOVERY_LOGICAL_SPACES_ENDPOINT
BOBA_RECOVERY_LOGICAL_SPACES_REGION
BOBA_LOGICAL_SPACES_ACCESS_KEY_ID
BOBA_LOGICAL_SPACES_SECRET_ACCESS_KEY
age recipient / public key (on-host encrypt authority)
age private identity (off-host recovery custody only — not present)
```

No secret values were written to this repository, evidence, or chat.

## Findings

1. Gate 0 exact-main CI is SUCCESS on the authorized SHA — provider work was eligible
   from the CI precondition alone.
2. CURRENT authority requires off-host encryption-secret custody but **defers the exact
   mechanism**; no existing approved custody reference was found. Phase 1 cannot PASS
   without a human custody decision.
3. Operator environment lacks DigitalOcean API/Spaces credentials and `doctl`/`aws`
   tooling, so Spaces inventory/create/versioning/credential isolation could not be
   evidenced. This is a secondary environment blocker; resolving custody alone is not
   sufficient without operator provider access.
4. No WORM/object-lock claims are made. Versioning was not verified.

## Explicit non-claims

```text
PHASE1_PASS: NO
REAL_SPACES: NOT_PERFORMED
OFF_HOST_SECRET_CUSTODY: NOT_PERFORMED
RPO_RTO_PROVEN: NO
STORAGE_CAPACITY_VALIDATED: NO
PRODUCTION_BACKUP_RESTORE: NOT_PERFORMED
FOUNDER_UAT: NOT_PERFORMED
IMP037_ACCEPTED: NO
IMP038_ACTIVATED: NO
```

## Next gate

```text
CHATGPT_PHASE1_INDEPENDENT_REVIEW
HUMAN_DECISION_REQUIRED: approve an off-host recovery-custody mechanism under ADR-015 /
  D-374 without inventing a new SaaS secret-manager architecture
THEN: supply DigitalOcean operator API / Spaces administration authority out-of-band
THEN: re-run Phase 1 inventory → buckets → versioning → separated credentials → custody
  evidence under a fresh Phase-1 R3 continuation if required
DO_NOT_START_PHASE_2
```

```text
NO SECRET VALUES INCLUDED
```
