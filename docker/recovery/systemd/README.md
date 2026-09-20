# IMP-037 recovery systemd unit/timer templates

These files are **templates** for operator-controlled host scheduling of Layer 1
and Layer 2 backup oneshots. They are **not** installed, enabled, or started by
the IMP-037 repository implementation packet.

```text
INSTALL_PERFORMED_BY_PACKET: NO
R3_OPERATOR_ACTION_REQUIRED: YES
```

## Units

| Unit | Schedule |
|---|---|
| `boba-recovery-layer1-full.timer` | weekly `Sun *-*-* 02:15:00` + `RandomizedDelaySec=15m` |
| `boba-recovery-layer1-diff.timer` | daily `*-*-* 02:45:00` |
| `boba-recovery-layer2-logical.timer` | daily `*-*-* 03:15:00` |

Each `.service` is `Type=oneshot`, uses `WorkingDirectory=%h/boba-bear-platform`,
optional `EnvironmentFile=-%h/boba-bear-platform/.env.recovery.local`, and runs
through `scripts/recovery/systemd/run-with-flock.sh` so heavy ops share the
host-local flock. Continuous WAL archive-push must **never** use that flock.

Alternative ExecStart (documented; swap if preferred):

```text
/usr/bin/docker compose -f compose.yaml -f compose.recovery.yaml run --rm recovery-layer1-backup
```

## Operator install (R3 only — do not automate from CI)

1. Confirm repository path matches `WorkingDirectory` / `%h/boba-bear-platform`.
2. Copy or symlink units into `/etc/systemd/system/` (or user systemd).
3. `systemctl daemon-reload`
4. `systemctl enable --now boba-recovery-layer1-full.timer` (and sibling timers)
5. Validate: `npm run recovery:systemd:validate`

## Validation without install

```bash
npm run recovery:systemd:validate
node scripts/recovery/cli.mjs systemd validate --json
```

When `systemd-analyze` is absent, validation falls back to required-key parsing.
