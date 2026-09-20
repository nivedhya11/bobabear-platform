#!/usr/bin/env bash
# Host-local flock wrapper for IMP-037 scheduled recovery oneshots.
# Continuous WAL archive-push MUST NOT use this wrapper.
set -euo pipefail

LOCK_PATH="${BOBA_RECOVERY_HEAVY_LOCK_PATH:-/var/lock/boba-recovery-heavy.lock}"
mkdir -p "$(dirname "${LOCK_PATH}")"

if ! command -v flock >/dev/null 2>&1; then
  echo "flock CLI is required for scheduled recovery ops" >&2
  exit 1
fi

exec flock -n "${LOCK_PATH}" "$@"
