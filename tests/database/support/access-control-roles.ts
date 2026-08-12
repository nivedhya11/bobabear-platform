/**
 * A restricted PostgreSQL role shaped like IMP-011's tightened
 * `boba_bear_app` privilege model (catalog SELECT-only, audit append-only,
 * org/membership/assignment no-DELETE, full DML on workforce auth fixtures).
 *
 * Mirrors `auth-foundation-roles.ts` — used to prove runtime privilege
 * denial against a real migrated database (Testcontainers has no
 * `boba_bear_app` role, so migration REVOKEs are a no-op there).
 */
import { randomBytes } from "node:crypto";

import { assertSafeIdentifier, quoteIdentifier } from "./identifiers";
import { withTestDatabaseClient } from "./test-database";

const CATALOG_TABLES = [
  "access_permissions",
  "access_roles",
  "access_role_allowed_scopes",
  "access_role_permissions",
] as const;

const AUDIT_TABLE = "access_control_audit_events";

const MUTABLE_NO_DELETE_TABLES = [
  "brands",
  "organizations",
  "territories",
  "legal_entities",
  "outlets",
  "access_memberships",
  "access_role_assignments",
] as const;

const WORKFORCE_FIXTURE_TABLES = [
  "workforce_auth_users",
  "workforce_auth_sessions",
  "workforce_auth_accounts",
  "workforce_auth_verifications",
  "workforce_auth_two_factors",
  "workforce_auth_rate_limits",
] as const;

export interface AccessControlRoleFixture {
  readonly applicationConnectionString: string;
}

function withCredentials(connectionString: string, username: string, password: string): string {
  const url = new URL(connectionString);
  url.username = encodeURIComponent(username);
  url.password = encodeURIComponent(password);
  return url.toString();
}

function qualify(tables: readonly string[]): string {
  return tables.map((t) => `app.${t}`).join(", ");
}

/**
 * Create a randomly-named role with IMP-011 privilege shape inside an
 * already-isolated, already-migrated database, then drop it after the
 * callback. Never touches the local Compose database.
 */
export async function withAccessControlRoleFixture<T>(
  databaseName: string,
  connectionString: string,
  callback: (fixture: AccessControlRoleFixture) => Promise<T>,
): Promise<T> {
  const suffix = randomBytes(6).toString("hex");
  const role = `boba_test_ac_app_${suffix}`;
  assertSafeIdentifier(role);
  const password = randomBytes(24).toString("hex");

  await withTestDatabaseClient(connectionString, async (admin) => {
    await admin.pool.query(
      `CREATE ROLE ${quoteIdentifier(role)} WITH LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`,
    );
    await admin.pool.query(
      `GRANT CONNECT ON DATABASE ${quoteIdentifier(databaseName)} TO ${quoteIdentifier(role)}`,
    );
    await admin.pool.query(`GRANT USAGE ON SCHEMA app TO ${quoteIdentifier(role)}`);
    await admin.pool.query(
      `GRANT SELECT ON ${qualify(CATALOG_TABLES)} TO ${quoteIdentifier(role)}`,
    );
    await admin.pool.query(
      `GRANT SELECT, INSERT ON app.${AUDIT_TABLE} TO ${quoteIdentifier(role)}`,
    );
    await admin.pool.query(
      `GRANT SELECT, INSERT, UPDATE ON ${qualify(MUTABLE_NO_DELETE_TABLES)} TO ${quoteIdentifier(role)}`,
    );
    await admin.pool.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ${qualify(WORKFORCE_FIXTURE_TABLES)} TO ${quoteIdentifier(role)}`,
    );
  });

  try {
    return await callback({
      applicationConnectionString: withCredentials(connectionString, role, password),
    });
  } finally {
    await withTestDatabaseClient(connectionString, async (admin) => {
      await admin.pool.query(`DROP OWNED BY ${quoteIdentifier(role)}`);
      await admin.pool.query(`DROP ROLE ${quoteIdentifier(role)}`);
    });
  }
}
