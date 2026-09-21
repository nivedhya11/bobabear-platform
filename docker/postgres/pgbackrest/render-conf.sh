#!/usr/bin/env bash
# Render the concrete IMP-037 pgBackRest config to stdout.
# Secrets are required in the environment and are never written into the file.
# Exit non-zero (fail closed) when production-shaped physical Spaces config is incomplete.
# POSIX/local mode is explicit only: BOBA_PGBACKREST_REPO_MODE=posix
set -euo pipefail

mode="${BOBA_PGBACKREST_REPO_MODE:-s3}"
case "${mode}" in
  posix|local) mode="posix" ;;
  s3|"") mode="s3" ;;
  *)
    echo "unsupported BOBA_PGBACKREST_REPO_MODE=${mode}" >&2
    exit 1
    ;;
esac

generation="${BOBA_PGBACKREST_GENERATION:-}"
if ! [[ "${generation}" =~ ^[1-9][0-9]*$ ]]; then
  echo "BOBA_PGBACKREST_GENERATION must be a positive integer" >&2
  exit 1
fi
if [ -z "${PGBACKREST_CIPHER_PASS:-}" ]; then
  echo "PGBACKREST_CIPHER_PASS is required to render pgBackRest config and is not written into the file" >&2
  exit 1
fi

stanza="${BOBA_PGBACKREST_STANZA:-boba}"
pgdata="${PGDATA:-${BOBA_PGBACKREST_PGDATA:-/var/lib/postgresql/data}}"

repo_type="posix"
repo_path="/var/lib/pgbackrest/repo-gen-${generation}"
s3_lines=""

if [ "${mode}" = "s3" ]; then
  bucket="${BOBA_RECOVERY_PHYSICAL_SPACES_BUCKET:-}"
  endpoint="${BOBA_RECOVERY_PHYSICAL_SPACES_ENDPOINT:-}"
  region="${BOBA_RECOVERY_PHYSICAL_SPACES_REGION:-}"
  access_key="${BOBA_PHYSICAL_SPACES_ACCESS_KEY_ID:-}"
  secret_key="${BOBA_PHYSICAL_SPACES_SECRET_ACCESS_KEY:-}"
  if [ -z "${bucket}" ] || [ -z "${endpoint}" ] || [ -z "${region}" ] || [ -z "${access_key}" ] || [ -z "${secret_key}" ]; then
    echo "production-shaped Layer 1 requires physical Spaces bucket, endpoint, region, and distinct BOBA_PHYSICAL_SPACES credentials" >&2
    exit 1
  fi
  logical_key="${BOBA_LOGICAL_SPACES_ACCESS_KEY_ID:-${BOBA_LOGICAL_SPACES_KEY:-}}"
  logical_secret="${BOBA_LOGICAL_SPACES_SECRET_ACCESS_KEY:-${BOBA_LOGICAL_SPACES_SECRET:-}}"
  logical_bucket="${BOBA_RECOVERY_LOGICAL_SPACES_BUCKET:-${BOBA_RECOVERY_SPACES_BUCKET:-}}"
  if { [ -n "${logical_key}" ] && [ "${logical_key}" = "${access_key}" ]; } \
    || { [ -n "${logical_secret}" ] && [ "${logical_secret}" = "${secret_key}" ]; } \
    || { [ -n "${logical_bucket}" ] && [ "${logical_bucket}" = "${bucket}" ]; }; then
    echo "Layer 1 physical Spaces credentials/bucket must be distinct from Layer 2 logical Spaces" >&2
    exit 1
  fi
  endpoint="${endpoint#https://}"
  endpoint="${endpoint#http://}"
  endpoint="${endpoint%/}"
  repo_type="s3"
  repo_path="/repo-gen-${generation}"
  s3_lines="$(printf 'repo1-s3-bucket=%s\nrepo1-s3-endpoint=%s\nrepo1-s3-region=%s\nrepo1-s3-uri-style=path\n' \
    "${bucket}" "${endpoint}" "${region}")"
fi

cat <<EOF
# IMP-037 pgBackRest configuration (generation ${generation})
# Schedule: weekly full + daily differential + continuous WAL
# archive_timeout design bound: 300s (set in postgresql.conf)
# Retention: time-based full >= 35 days (NOT count; NOT differential-count-as-days)
# repo1-retention-diff omitted so count-based differential expiry cannot shorten the recovery window
# repo1-retention-archive-type/archive omitted: archive-type is full|diff|incr, not time;
#   pgBackRest expires WAL earlier than the oldest retained full after full time retention
# Cipher passphrase and Spaces keys are supplied via environment, not this file.

[global]
repo1-type=${repo_type}
repo1-path=${repo_path}
repo1-cipher-type=aes-256-cbc
repo1-retention-full-type=time
repo1-retention-full=35
start-fast=y
compress-type=zst
${s3_lines}
[${stanza}]
pg1-path=${pgdata}
EOF
