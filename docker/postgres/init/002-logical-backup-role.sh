#!/usr/bin/env bash
# BOBA Bear — capability-scoped read-only logical-backup database role (IMP-037).
#
# Creates boba_bear_logical_backup with SELECT-only access for Layer 2 pg_dump.
# This is NOT an application runtime role and MUST NOT reuse application credentials.
#
# Optional: runs on init when POSTGRES_LOGICAL_BACKUP_PASSWORD is set.
# Safe to skip when the variable is absent (local/dev without Layer 2).
#
# Passwords use psql -v / :'name' binding (same pattern as 001-bootstrap.sh).
# Do NOT use DO $$ blocks: psql does not interpolate :'vars' inside dollar-quotes.
#
# Must be executable so docker-entrypoint *runs* it in a subprocess. Non-executable
# `.sh` files are *sourced*; an early `exit` would then terminate the entrypoint and
# leave Postgres exited after init (Nightly operations/commercial E2E failure mode).
set -eu

if [ -z "${POSTGRES_LOGICAL_BACKUP_PASSWORD:-}" ]; then
  echo "002-logical-backup-role.sh: POSTGRES_LOGICAL_BACKUP_PASSWORD unset; skipping logical-backup role."
  exit 0
fi

echo "002-logical-backup-role.sh: creating boba_bear_logical_backup role..."

psql -v ON_ERROR_STOP=1 \
  --username "${POSTGRES_USER}" \
  --dbname "${POSTGRES_DB}" \
  -v logical_backup_password="${POSTGRES_LOGICAL_BACKUP_PASSWORD}" \
  <<-'SQL'
	CREATE ROLE boba_bear_logical_backup WITH
	  LOGIN
	  PASSWORD :'logical_backup_password'
	  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
SQL

psql -v ON_ERROR_STOP=1 \
  --username "${POSTGRES_USER}" \
  --dbname "boba_bear_local" \
  -v logical_backup_password="${POSTGRES_LOGICAL_BACKUP_PASSWORD}" \
  <<-'SQL'
	ALTER ROLE boba_bear_logical_backup WITH PASSWORD :'logical_backup_password';
	GRANT CONNECT ON DATABASE boba_bear_local TO boba_bear_logical_backup;
	GRANT USAGE ON SCHEMA app TO boba_bear_logical_backup;
	GRANT SELECT ON ALL TABLES IN SCHEMA app TO boba_bear_logical_backup;
	GRANT SELECT ON ALL SEQUENCES IN SCHEMA app TO boba_bear_logical_backup;
	GRANT USAGE ON ALL SEQUENCES IN SCHEMA app TO boba_bear_logical_backup;
	ALTER DEFAULT PRIVILEGES FOR ROLE boba_bear_migrator IN SCHEMA app
	  GRANT SELECT ON TABLES TO boba_bear_logical_backup;
	ALTER DEFAULT PRIVILEGES FOR ROLE boba_bear_migrator IN SCHEMA app
	  GRANT SELECT, USAGE ON SEQUENCES TO boba_bear_logical_backup;
	ALTER ROLE boba_bear_logical_backup IN DATABASE boba_bear_local SET search_path = app, public;
SQL

echo "002-logical-backup-role.sh: logical-backup role ready."
