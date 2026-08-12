#!/usr/bin/env bash
# BOBA Bear local PostgreSQL bootstrap (IMP-004).
#
# Runs exactly once, automatically, the first time the named
# `postgres-data` volume is initialized (docker-entrypoint-initdb.d
# semantics — see https://hub.docker.com/_/postgres). It never runs again
# against an already-initialized volume, so changing .env.docker.local
# after the first `db:up` does NOT change credentials already stored inside
# Postgres; use `npm run db:reset` if you need to start over.
#
# This is a shell script (not a plain .sql file) because the generated
# local passwords must flow in from the container environment without ever
# being embedded as literal text in a committed file. Passwords are passed
# to `psql` as bound variables (`-v name=value`, referenced as `:'name'`)
# rather than interpolated into the SQL text, so a password containing a
# quote or other SQL-meaningful character cannot corrupt the statement.
#
# Exits non-zero (via `set -eu` and `psql -v ON_ERROR_STOP=1`) on any
# failure — a partially-bootstrapped database must not be treated as ready.
set -eu

for var in POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB POSTGRES_MIGRATOR_PASSWORD POSTGRES_APP_PASSWORD; do
  # Indirect expansion; intentionally does not print the value.
  if [ -z "${!var:-}" ]; then
    echo "001-bootstrap.sh: required environment variable ${var} is not set." >&2
    exit 1
  fi
done

echo "001-bootstrap.sh: creating boba_bear_migrator / boba_bear_app roles and boba_bear_local database..."

# Step 1: roles + database. Runs against the bootstrap admin's default
# connection database (POSTGRES_DB, expected to be "postgres").
psql -v ON_ERROR_STOP=1 \
  --username "${POSTGRES_USER}" \
  --dbname "${POSTGRES_DB}" \
  -v migrator_password="${POSTGRES_MIGRATOR_PASSWORD}" \
  -v app_password="${POSTGRES_APP_PASSWORD}" \
  <<-'SQL'
	CREATE ROLE boba_bear_migrator WITH
	  LOGIN
	  PASSWORD :'migrator_password'
	  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;

	CREATE ROLE boba_bear_app WITH
	  LOGIN
	  PASSWORD :'app_password'
	  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;

	CREATE DATABASE boba_bear_local OWNER boba_bear_migrator;

	REVOKE ALL ON DATABASE boba_bear_local FROM PUBLIC;
	GRANT CONNECT ON DATABASE boba_bear_local TO boba_bear_migrator;
	GRANT CONNECT ON DATABASE boba_bear_local TO boba_bear_app;

	ALTER ROLE boba_bear_migrator IN DATABASE boba_bear_local SET search_path = app, public;
	ALTER ROLE boba_bear_app IN DATABASE boba_bear_local SET search_path = app, public;
SQL

echo "001-bootstrap.sh: configuring app/drizzle schemas and privileges in boba_bear_local..."

# Step 2: schemas + privileges. Runs *inside* the new database, because
# schema-scoped GRANT/REVOKE/DEFAULT PRIVILEGES statements are per-database.
psql -v ON_ERROR_STOP=1 \
  --username "${POSTGRES_USER}" \
  --dbname "boba_bear_local" \
  <<-'SQL'
	-- Retained for PostgreSQL compatibility only; BOBA Bear tables never
	-- live here (see AGENTS.md). Revoking CREATE keeps it inert.
	REVOKE CREATE ON SCHEMA public FROM PUBLIC;

	-- Application object schema. The Drizzle-managed baseline migration
	-- (drizzle/0000_database-foundation.sql) also creates this schema so
	-- that Drizzle's own migration history is the source of truth for it;
	-- creating it here too (IF NOT EXISTS-equivalent via ownership check)
	-- keeps bootstrap and migration idempotent with respect to each other.
	CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION boba_bear_migrator;
	REVOKE ALL ON SCHEMA app FROM PUBLIC;
	GRANT USAGE ON SCHEMA app TO boba_bear_app;

	-- Drizzle migration-history schema. Never accessible to the runtime
	-- application role.
	CREATE SCHEMA IF NOT EXISTS drizzle AUTHORIZATION boba_bear_migrator;
	REVOKE ALL ON SCHEMA drizzle FROM PUBLIC;

	-- Future objects created by the migrator inside `app` automatically
	-- grant the runtime role DML only — never DDL, never ownership.
	ALTER DEFAULT PRIVILEGES FOR ROLE boba_bear_migrator IN SCHEMA app
	  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO boba_bear_app;

	ALTER DEFAULT PRIVILEGES FOR ROLE boba_bear_migrator IN SCHEMA app
	  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO boba_bear_app;

	ALTER DEFAULT PRIVILEGES FOR ROLE boba_bear_migrator IN SCHEMA app
	  GRANT EXECUTE ON FUNCTIONS TO boba_bear_app;
SQL

echo "001-bootstrap.sh: bootstrap complete."
