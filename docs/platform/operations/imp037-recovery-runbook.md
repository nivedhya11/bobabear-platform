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

Layer 1 requires a reachable `pgbackrest` (local or `boba-bear-postgres:local`) and
`--generation` / `BOBA_PGBACKREST_GENERATION`. After a successful backup, verify runs
by default so health proof can include `PGBACKREST_VERIFY_OK`.

Layer 2 requires age, a dump source (`DATABASE_URL` or compose postgres), recipients,
and `--local-store` for disposable object-store runs. Live Spaces remains
`NOT_PERFORMED` unless separately authorized.

### Restore / drill

```bash
# PITR — provisions a fresh RUN_ID-owned PGDATA under the recovery workspace by default.
# Pass --target-pgdata only for an already-provisioned isolated path; never the active source.
npm run recovery -- restore pitr \
  --source prod-pgdata-1 \
  --source-pgdata /var/lib/postgresql/data \
  --target-time "2026-09-20 12:00:00+00" \
  --workspace-root /var/tmp/boba-recovery-targets \
  --evidence-dir DIR

# Logical restore — provisions a fresh disposable PostgreSQL 18 target by default
# (or bind --database-url to a provisioner-issued recovery database).
npm run recovery -- restore logical \
  --run-id RUN_ID \
  --source prod-db-1 \
  --identity-file PATH \
  --local-store DIR \
  --evidence-dir DIR

# Portability rehearsal — finalized Layer 2 → decrypt → fresh PG18 → pg_restore →
# existing migration authority (npm run db:migrate) → business validation on THAT target.
npm run recovery -- drill \
  --run-id-to-restore RUN_ID \
  --source prod-db-1 \
  --identity-file PATH \
  --local-store DIR \
  --evidence-dir DIR
```

Restore/drill refuse `--force-production`. Missing artifacts, executables, or migration
authority fail closed — they do not fabricate success. Fresh targets are run-owned and
cleaned up after successful disposable rehearsals.

### High-risk gate / capacity / Spaces config / key rotation plans

```bash
npm run recovery:gate -- high-risk --evidence-dir DIR
npm run recovery:capacity -- --json
npm run recovery -- spaces config-check --bucket NAME --local-root DIR --credential-env-prefix BOBA_SPACES
npm run recovery -- rotate-keys layer1 --generation 1 --new-passphrase-present --json
npm run recovery -- rotate-keys layer2 --recipient age1... --old-identities-retained --json
```

Rotation commands print a **plan JSON only** — no production secret mutation.

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
- Overlay: `compose.recovery.yaml` (`recovery-layer1-backup`, `recovery-layer2-backup`,
  tools profile oneshots).

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
