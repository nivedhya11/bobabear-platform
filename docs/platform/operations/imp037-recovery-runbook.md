# IMP-037 recovery operator runbook

Operator runbook for **IMP-037 — Backup, Restore & Migration Readiness**.

This document describes **repository-supported tooling that exists now** and names
**proof that has not been performed**. Do not treat missing production proof as
acceptance.

Canonical product requirements:
[`docs/platform/product/IMP-037/product-definition.md`](../product/IMP-037/product-definition.md)

Locked architecture:
[`docs/platform/capabilities/IMP-037-backup-restore-migration-readiness.md`](../capabilities/IMP-037-backup-restore-migration-readiness.md)

Supporting automated-proof notes (not lifecycle authority):
[`docs/platform/operations/imp037-implementation-evidence.md`](./imp037-implementation-evidence.md)

```text
LIFECYCLE: IN_PROGRESS
IMPLEMENTATION_PERFORMED: repository tooling advanced; production backup/restore NOT performed
RPO_TARGET <= 15 minutes
RTO_TARGET <= 2 hours
RPO_RTO_PROVEN: NO
DROPLET_2GIB_RTO_VALIDATED: NO
STORAGE_CAPACITY_VALIDATED: NO
REAL_SPACES: NOT_PERFORMED
SYSTEMD_INSTALL: NOT_PERFORMED
FOUNDER_UAT: NOT_PERFORMED
```

`IMPLEMENTATION_PERFORMED` here means the repository now contains runnable Layer 1 /
Layer 2 / restore / gate / capacity / systemd **modules and CLI wiring**. It does
**not** mean production backup coverage, Spaces verification, Droplet RTO proof, or
acceptance.

## IMPLEMENTED NOW (repository)

Operator entry point:

```bash
npm run recovery -- help
node scripts/recovery/cli.mjs help
```

Machine-readable JSON: add `--json` to any command.

Exit codes:

| Code | Meaning |
|---|---|
| 0 | ok |
| 1 | failure / NOT_READY |
| 2 | blocked (fail-closed safety) |
| 3 | unavailable (reserved; implemented commands must not use this for “not wired”) |

Missing docker/pgBackRest/credentials exit **BLOCKED** or **FAILURE** with a clear
reason. Commands must **never** emit placeholder `SUCCEEDED`.

No secrets, credentials, URIs with passwords, tokens, age private identities, or
pgBackRest passphrases are printed.

### Status / evidence / target safety

```bash
npm run recovery:status
npm run recovery:evidence:validate -- --evidence-dir DIR
npm run recovery:target:check -- --source ... --target ... --source-class production --target-class recovery
```

`--force-production` remains **forbidden**.

### Layer 1 / Layer 2 backup CLI

```bash
npm run recovery:backup:layer1 -- --type full --generation 1 --evidence-dir DIR
npm run recovery:backup:layer1 -- --type diff --generation 1 --evidence-dir DIR
npm run recovery:backup:layer2 -- --local-store DIR --recipient age1... --evidence-dir DIR
```

Layer 1 does **not** use a host `pgbackrest` binary. Preflight and backup/check/info/verify
all run in the PostgreSQL service:

```bash
docker compose exec -T postgres pgbackrest --config=/etc/pgbackrest/pgbackrest.conf --stanza=boba backup --type=full
```

`npm run recovery -- backup layer1` is that same container backend. systemd full/diff units
call this CLI under the host flock. Continuous WAL archive-push does **not** take that lock.

`BOBA_PGBACKREST_ARCHIVE` defaults to `0` (local/dev unchanged). When it is `1`, the
postgres entrypoint renders `/etc/pgbackrest/pgbackrest.conf` **before** `archive_command`
can fire. Archive-push and scheduled backup use that same file.

The postgres compose service also maps host recovery secrets onto pgBackRest-native
names so **compose-exec** and **archive-push** share the same repository authority:

```text
PGBACKREST_REPO1_CIPHER_PASS       ← PGBACKREST_CIPHER_PASS
PGBACKREST_REPO1_S3_KEY            ← BOBA_PHYSICAL_SPACES_ACCESS_KEY_ID
PGBACKREST_REPO1_S3_KEY_SECRET     ← BOBA_PHYSICAL_SPACES_SECRET_ACCESS_KEY
```

Secrets remain environment-only (never in `pgbackrest.conf`, logs, or evidence).

### Fresh repository generation bootstrap

A new pgBackRest repository generation requires `stanza-create` before check/backup/archive.
This is an **explicit operator / live-provider** action — do **not** auto-run it in CI against
real Spaces.

```bash
# 1. Render/start configured postgres (archive on + generation + physical Spaces env)
# 2. Initialize stanza for that generation (compose postgres backend):
npm run recovery -- pgbackrest init --generation N --json
#    → prove ACTIVE postgres BOBA_PGBACKREST_GENERATION + repo1-path bind to N (else BLOCKED)
#    → docker compose exec -T postgres pgbackrest \
#         --config=/etc/pgbackrest/pgbackrest.conf --stanza=boba stanza-create
#    → then pgbackrest ... check  (fail closed if either fails)
# 3. Enable/confirm scheduled backup operation
npm run recovery:backup:layer1 -- --type full --generation N --evidence-dir DIR
```

Key rotation to a **new** repository generation uses the same initialization path after
rendering/starting postgres for `repo-gen-{N}` (`rotate-keys layer1` prints the plan only).

Production-shaped Layer 1 (the default when archive is on) is physical Spaces:

```text
BOBA_PGBACKREST_GENERATION
BOBA_RECOVERY_PHYSICAL_SPACES_BUCKET
BOBA_RECOVERY_PHYSICAL_SPACES_ENDPOINT
BOBA_RECOVERY_PHYSICAL_SPACES_REGION
BOBA_PHYSICAL_SPACES_ACCESS_KEY_ID
BOBA_PHYSICAL_SPACES_SECRET_ACCESS_KEY
PGBACKREST_CIPHER_PASS
```

Those credentials are **not** the Layer 2 logical Spaces keys. Missing physical config
fail-closes (PostgreSQL will not start with archive enabled). Secrets are environment-only
and are not written into the conf file or this repository.

Disposable local Layer 1 tests must opt in explicitly:

```text
BOBA_PGBACKREST_REPO_MODE=posix
```

Layer 2 disposable runs use `--local-store`. Production-shaped Layer 2 uses logical Spaces
env and does **not** require copying artifacts onto a local disk first. It performs **no**
provider network request unless `BOBA_RECOVERY_REAL_SPACES=1`, and then only after bucket
versioning is confirmed `ENABLED`. Real Spaces proof remains `NOT_PERFORMED`.

### Restore / drill

Disposable local rehearsal (no provider):

```bash
# PITR — provisions a fresh RUN_ID-owned PGDATA under the recovery workspace by default.
# Pass --target-pgdata only for an already-provisioned isolated path; never the active source.
npm run recovery -- restore pitr \
  --source prod-pgdata-1 \
  --source-pgdata /var/lib/postgresql/data \
  --target-time "2026-09-20 12:00:00+00" \
  --workspace-root /var/tmp/boba-recovery-targets \
  --evidence-dir DIR

# Logical restore into a fresh disposable PostgreSQL 18 target.
# The target password is crypto-random (not derived from RUN_ID) and is not printed.
# The published port is bound to 127.0.0.1 only.
npm run recovery -- restore logical \
  --run-id RUN_ID \
  --source prod-db-1 \
  --identity-file PATH \
  --local-store DIR \
  --evidence-dir DIR

# Portability rehearsal. runDrill() refuses the run without the suppression flags.
npm run recovery -- drill \
  --run-id-to-restore RUN_ID \
  --source prod-db-1 \
  --identity-file PATH \
  --local-store DIR \
  --network-isolated \
  --production-dns-absent \
  --production-credentials-absent \
  --evidence-dir DIR
```

Production-shaped Spaces path (explicit live authorization required). This runbook does
**not** claim a real DigitalOcean call was performed:

```bash
# Set logical Spaces env (distinct from physical/pgBackRest credentials), then:
BOBA_RECOVERY_REAL_SPACES=1 npm run recovery -- restore logical \
  --run-id RUN_ID \
  --source prod-db-1 \
  --identity-file PATH \
  --evidence-dir DIR

BOBA_RECOVERY_REAL_SPACES=1 npm run recovery -- drill \
  --run-id-to-restore RUN_ID \
  --source prod-db-1 \
  --identity-file PATH \
  --network-isolated \
  --production-dns-absent \
  --production-credentials-absent \
  --evidence-dir DIR

BOBA_RECOVERY_REAL_SPACES=1 npm run recovery -- evidence reconcile-layer2 \
  --run-id RUN_ID \
  --evidence-dir DIR
```

Without `BOBA_RECOVERY_REAL_SPACES=1` those commands are **BLOCKED** and issue zero
Spaces requests. With the flag, backup verifies bucket versioning `ENABLED` before upload.
Restore still requires a COMPLETE artifact, decryptable payload, verified integrity, and a
fresh owned target. It does not restore into the source.

`--force-production` remains forbidden.

### High-risk gate / capacity / Spaces config / key rotation plans

```bash
npm run recovery:gate -- high-risk --evidence-dir DIR
npm run recovery:capacity -- --json
npm run recovery -- spaces config-check --bucket NAME --local-root DIR --credential-env-prefix BOBA_SPACES
npm run recovery -- rotate-keys layer1 --generation 1 --new-passphrase-present --json
npm run recovery -- rotate-keys layer2 --recipient age1... --old-identities-retained --json
npm run recovery -- pgbackrest init --generation N --json
```

Rotation commands print a **plan JSON only** — no production secret mutation.
After rotating Layer 1 to a new generation, follow the fresh-repository bootstrap
(`pgbackrest init`) before enabling scheduled backups.

### systemd templates (install NOT performed)

Templates live under `docker/recovery/systemd/`. Validate:

```bash
npm run recovery:systemd:validate
```

Installing/enabling timers is an **operator R3** action and is **not** performed by
this packet. See `docker/recovery/systemd/README.md`.

### Compose

- `compose.yaml` postgres builds `docker/postgres/Dockerfile` → image
  `boba-bear-postgres:local`, with optional `pgbackrest-repo` volume.
- `BOBA_PGBACKREST_ARCHIVE` defaults to `0` (existing local/dev unchanged).
- When archive is `1`, missing physical Spaces config fail-closes unless
  `BOBA_PGBACKREST_REPO_MODE=posix`.
- Overlay: `compose.recovery.yaml` documents container-context Layer 1
  (`docker compose exec -T postgres pgbackrest`) and the Layer 2 tools-profile oneshot.
  There is no Layer 1 backup sidecar.

## Safety boundaries (locked; still binding)

```text
RESTORE_TO_ACTIVE_SOURCE: FORBIDDEN
RESTORE_INTO_PRODUCTION_PGDATA: FORBIDDEN
FORCE_PRODUCTION_FLAG: FORBIDDEN
SECRETS_IN_EVIDENCE: FORBIDDEN
CONTINUOUS_WAL_NOT_BLOCKED_BY_SCHEDULED_JOB_LOCK: YES
```

## Explicitly NOT performed / NOT proven

| Marker | Status |
|---|---|
| Real DigitalOcean Spaces provider run | `NOT_PERFORMED` |
| Production PostgreSQL backup/restore | `NOT_PERFORMED` |
| systemd timer install/enable | `NOT_PERFORMED` |
| `RPO_RTO_PROVEN` | `NO` |
| `STORAGE_CAPACITY_VALIDATED` | `NO` |
| `DROPLET_2GIB_RTO_VALIDATED` | `NO` |
| `FOUNDER_UAT` | `NOT_PERFORMED` |
| Lifecycle acceptance | **not claimed** (`IN_PROGRESS`) |

## Tests

```bash
npm run test:recovery
```

Unit tests do not require cloud credentials. Integration tests skip gracefully when
docker/age/image build flags are absent. Optional heavy build:

```bash
BOBA_RECOVERY_BUILD_POSTGRES=1 npm run test:recovery
```
