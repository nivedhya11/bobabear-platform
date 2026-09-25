/**
 * Clean-database migration replay, idempotency, and reproducible-schema
 * validation (IMP-005) against a real, disposable PostgreSQL 18 database
 * provisioned by Testcontainers (see global-setup.ts).
 */
import { describe, expect, inject, it } from "vitest";

import { MIGRATIONS_SCHEMA, MIGRATIONS_TABLE } from "../../src/platform/database";
import { applyMigrations, withIsolatedTestDatabase, withTestDatabaseClient } from "./support/test-database";
import { captureNormalizedSchema, fingerprintSchema } from "./support/schema-introspection";

function adminConnectionInfo() {
  return {
    connectionString: inject("bobaBearTestAdminConnectionString"),
    host: inject("bobaBearTestAdminHost"),
    port: inject("bobaBearTestAdminPort"),
  };
}

describe("clean migration replay", () => {
  it("applies every committed migration to a fresh, empty database", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const preMigration = await client.pool.query<{ nspname: string }>(
          "SELECT nspname FROM pg_namespace WHERE nspname IN ('app', 'drizzle')",
        );
        expect(preMigration.rows).toHaveLength(0);
      });

      await applyMigrations(database.connectionString);

      await withTestDatabaseClient(database.connectionString, async (client) => {
        const schemas = await client.pool.query<{ nspname: string }>(
          "SELECT nspname FROM pg_namespace WHERE nspname IN ('app', 'drizzle') ORDER BY nspname",
        );
        expect(schemas.rows.map((row) => row.nspname)).toEqual(["app", "drizzle"]);

        const migrationTable = await client.pool.query<{ exists: boolean }>(
          "SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = $1 AND tablename = $2) AS exists",
          [MIGRATIONS_SCHEMA, MIGRATIONS_TABLE],
        );
        expect(migrationTable.rows[0]?.exists).toBe(true);

        const journalCount = 46; // drizzle/meta/_journal.json — kept in lockstep with the committed journal
        const historyRows = await client.pool.query<{ count: string }>(
          `SELECT COUNT(*) AS count FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}`,
        );
        expect(Number(historyRows.rows[0]?.count)).toBe(journalCount);

        const appSchemaComment = await client.pool.query<{ comment: string | null }>(
          "SELECT obj_description('app'::regnamespace, 'pg_namespace') AS comment",
        );
        expect(appSchemaComment.rows[0]?.comment).toBe("BOBA Bear application schema");

        // IMP-038 tables must exist after migrations 0042–0043. Full inventory
        // equality is maintained by migrations.integration historical checks
        // elsewhere; this assertion stays presence-focused so later IMPs do
        // not force brittle full-list rewrites here.
        const tables = await client.pool.query<{ table_name: string }>(
          "SELECT table_name FROM information_schema.tables WHERE table_schema IN ('app', 'public') ORDER BY table_name",
        );
        const names = tables.rows.map((r) => r.table_name);
        expect(names).toContain("customer_otp_rate_limits");
        expect(names).toContain("workforce_auth_rate_limits");
        expect(names).toContain("turnstile_token_redemptions");
        expect(names).toContain("workforce_step_up_proofs");
        expect(names).toContain("workforce_step_up_audit_events");
        expect(names).toContain("financial_documents");
        expect(names).toContain("orders");
      });
    });
  });
});

describe("migration idempotency", () => {
  it("applying every migration a second time is a safe no-op", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);

      const first = await withTestDatabaseClient(database.connectionString, async (client) => {
        const historyRows = await client.pool.query(
          `SELECT hash, created_at FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} ORDER BY id`,
        );
        return { history: historyRows.rows, schema: await captureNormalizedSchema(client) };
      });

      await applyMigrations(database.connectionString);

      const second = await withTestDatabaseClient(database.connectionString, async (client) => {
        const historyRows = await client.pool.query(
          `SELECT hash, created_at FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} ORDER BY id`,
        );
        return { history: historyRows.rows, schema: await captureNormalizedSchema(client) };
      });

      expect(second.history).toEqual(first.history);
      expect(fingerprintSchema(second.schema)).toBe(fingerprintSchema(first.schema));
    });
  });
});

describe("reproducible schema", () => {
  it("two independently-migrated databases produce an identical normalized schema", async () => {
    const adminInfo = adminConnectionInfo();

    const fingerprintOf = () =>
      withIsolatedTestDatabase(adminInfo, async (database) => {
        await applyMigrations(database.connectionString);
        return withTestDatabaseClient(database.connectionString, async (client) =>
          fingerprintSchema(await captureNormalizedSchema(client)),
        );
      });

    const [fingerprintA, fingerprintB] = await Promise.all([fingerprintOf(), fingerprintOf()]);
    expect(fingerprintB).toBe(fingerprintA);
  });
});
