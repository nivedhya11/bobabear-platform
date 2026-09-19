# IMP-037 recovery operator runbook

Operator runbook for **IMP-037 — Backup, Restore & Migration Readiness**.

This document describes **repository-supported tooling that exists now** and names
**work that is not yet implemented**. Do not treat unimplemented commands as working.

Canonical product requirements:
[`docs/platform/product/IMP-037/product-definition.md`](../product/IMP-037/product-definition.md)

Locked architecture:
[`docs/platform/capabilities/IMP-037-backup-restore-migration-readiness.md`](../capabilities/IMP-037-backup-restore-migration-readiness.md)

```text
RPO_TARGET <= 15 minutes
RTO_TARGET <= 2 hours
RPO_RTO_PROVEN: NO
DROPLET_2GIB_RTO_VALIDATED: NO
STORAGE_CAPACITY_VALIDATED: NO
IMPLEMENTATION_PERFORMED: NO
```

`IMPLEMENTATION_PERFORMED: NO` remains truthful for backup/restore/pgBackRest/age/Spaces
execution. This runbook covers the **recovery foundation** only (status, evidence, identity
safety). Implementation start does not mean Layer 1 or Layer 2 backup coverage exists.

## IMPLEMENTED NOW

Operator entry point:

```bash
npm run recovery -- help
node scripts/recovery/cli.mjs help
```

Machine-readable JSON: add `--json` to any implemented command.

Exit codes:

| Code | Meaning |
|---|---|
| 0 | ok |
| 1 | failure / NOT_READY |
| 2 | blocked (fail-closed safety) |
| 3 | command not implemented |

No secrets, credentials, URIs with passwords, tokens, age private identities, or pgBackRest
passphrases are printed. Do not pass raw environment dumps into this tooling.

### Status / readiness foundation

```bash
npm run recovery:status
npm run recovery:status -- --json --evidence-dir /path/to/disposable-evidence
```

Semantics:

- Layer 1 (pgBackRest / continuous WAL) and Layer 2 (logical dump) are evaluated independently.
- No valid evidence ⇒ `NOT_READY`.
- Configuration, credentials, buckets, or timers alone are never success.
- Interrupted / `RUNNING` / malformed evidence is never success.
- A later success does not erase a prior failed run (runs are unique `RUN_ID` directories).
- Overall `READY` requires valid successful evidence for **every required applicable layer**.

A clean repository with no qualifying evidence **must** report `NOT_READY`. That is the
expected foundation result until Layer 1 and Layer 2 execution exist.

Optional freshness policy (explicit flags only; no invented default overdue window):

```bash
npm run recovery:status -- --evidence-dir DIR --layer1-max-age-ms 900000 --layer2-max-age-ms 86400000
```

### Evidence inspection / validation

```bash
npm run recovery:evidence:validate -- --evidence-dir DIR
npm run recovery:evidence:validate -- --json --evidence-dir DIR --run-id 20260920T010203Z-aaaaaaaaaaaaaaaa
```

Validates the machine-readable evidence schema (`imp037-evidence-v1`). Incomplete or
malformed files are not success.

Local evidence layout (disposable / test / later remote-backed operations):

```text
<evidence-dir>/<RUN_ID>/evidence.json
```

Rules: unique `RUN_ID` path; never overwrite; preserve failed evidence; atomic write;
caller owns cleanup. This is **not** the production Spaces object layout and does **not**
claim provider verification or Layer 2 `COMPLETE` markers.

### Source / target identity safety check

```bash
npm run recovery:target:check -- \
  --source prod-postgres-volume \
  --target recovery-postgres-volume \
  --source-class production \
  --target-class recovery \
  --target-pgdata /tmp/boba-recovery/pgdata
```

Fail-closed. Refuses:

- target identity equal to source identity
- missing target identity
- unresolved / ambiguous environment classification
- production / authoritative target (recovery target required)
- known production `PGDATA` paths when supplied

There is **no** `--force-production` override. This check does **not** restore anything.

Allowed target classification for this foundation: `recovery` only.

## NOT YET IMPLEMENTED

The following are **unavailable**. The CLI exits non-zero (`3`) rather than reporting
placeholder success:

- pgBackRest Layer 1 install/configure/backup
- continuous WAL archival (`archive_command` / `archive_timeout`)
- Layer 2 `pg_dump -Fc` + age upload
- remote Spaces SHA-256 verification
- `COMPLETE`-last backup finalization
- actual restore
- PITR selection
- migration rehearsal
- high-risk migration gate
- systemd scheduling / timers
- capacity / cost collection
- key rotation
- real DigitalOcean Spaces / production database provider integration

Do not run those operations from this runbook. Do not create Spaces buckets, mutate
production PostgreSQL, install production age keys, or deploy from this document.

## Safety invariants (locked; still binding)

```text
RESTORE_TO_ACTIVE_SOURCE: FORBIDDEN
RESTORE_INTO_PRODUCTION_PGDATA: FORBIDDEN
FORCE_PRODUCTION_FLAG: FORBIDDEN
SECRETS_IN_EVIDENCE: FORBIDDEN
```

## Tests

```bash
npm run test:recovery
```

No cloud credentials and no live network are required for the foundation suite.
