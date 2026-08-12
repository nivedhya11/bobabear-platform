/**
 * A restricted PostgreSQL role shaped like IMP-012's tightened
 * `boba_bear_app` privilege model for catalog tables (SELECT/INSERT/UPDATE,
 * no DELETE/TRUNCATE).
 *
 * Testcontainers has no `boba_bear_app` role, so migration REVOKEs are a
 * no-op there — this fixture proves the intended privilege shape live.
 */
import { randomBytes } from "node:crypto";

import { assertSafeIdentifier, quoteIdentifier } from "./identifiers";
import { withTestDatabaseClient } from "./test-database";

const CATALOG_TABLES = [
  "catalog_products",
  "catalog_variants",
  "catalog_modifier_groups",
  "catalog_modifier_options",
  "catalog_modifier_group_options",
  "catalog_variant_modifier_groups",
  "catalog_bundle_groups",
  "catalog_bundle_group_options",
  "catalog_dietary_tags",
  "catalog_variant_dietary_tags",
  "catalog_modifier_option_dietary_tags",
] as const;

/** IMP-013 menu presentation tables — same DML shape (no DELETE/TRUNCATE). */
const MENU_TABLES = ["menus", "menu_sections", "menu_entries"] as const;

/**
 * IMP-014 assortment / availability / operating tables.
 * Soft-lifecycle rows: SELECT/INSERT/UPDATE, no DELETE/TRUNCATE.
 * Intervals keep DELETE for atomic schedule replace (TRUNCATE still revoked).
 * Audit is append-only: SELECT/INSERT only.
 */
const ASSORTMENT_SOFT_TABLES = [
  "assortment_rules",
  "outlet_variant_availability",
  "outlet_modifier_option_availability",
  "outlet_operating_profiles",
] as const;
const ASSORTMENT_INTERVAL_TABLES = ["outlet_operating_intervals"] as const;
const ASSORTMENT_AUDIT_TABLES = ["assortment_availability_audit_events"] as const;

const ACCESS_CATALOG_TABLES = [
  "access_permissions",
  "access_roles",
  "access_role_allowed_scopes",
  "access_role_permissions",
] as const;

const ORG_AND_MEMBERSHIP_TABLES = [
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

export interface CatalogRoleFixture {
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
 * Create a randomly-named role with IMP-012 catalog privilege shape inside an
 * already-isolated, already-migrated database, then drop it after the
 * callback. Never touches the local Compose database.
 */
export async function withCatalogRoleFixture<T>(
  databaseName: string,
  connectionString: string,
  callback: (fixture: CatalogRoleFixture) => Promise<T>,
): Promise<T> {
  const suffix = randomBytes(6).toString("hex");
  const role = `boba_test_cat_app_${suffix}`;
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
      `GRANT SELECT ON ${qualify(ACCESS_CATALOG_TABLES)} TO ${quoteIdentifier(role)}`,
    );
    await admin.pool.query(
      `GRANT SELECT, INSERT ON app.access_control_audit_events TO ${quoteIdentifier(role)}`,
    );
    await admin.pool.query(
      `GRANT SELECT, INSERT, UPDATE ON ${qualify(ORG_AND_MEMBERSHIP_TABLES)} TO ${quoteIdentifier(role)}`,
    );
    await admin.pool.query(
      `GRANT SELECT, INSERT, UPDATE ON ${qualify(CATALOG_TABLES)} TO ${quoteIdentifier(role)}`,
    );
    await admin.pool.query(
      `GRANT SELECT, INSERT, UPDATE ON ${qualify(MENU_TABLES)} TO ${quoteIdentifier(role)}`,
    );
    await admin.pool.query(
      `GRANT SELECT, INSERT, UPDATE ON ${qualify(ASSORTMENT_SOFT_TABLES)} TO ${quoteIdentifier(role)}`,
    );
    await admin.pool.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ${qualify(ASSORTMENT_INTERVAL_TABLES)} TO ${quoteIdentifier(role)}`,
    );
    await admin.pool.query(
      `GRANT SELECT, INSERT ON ${qualify(ASSORTMENT_AUDIT_TABLES)} TO ${quoteIdentifier(role)}`,
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
