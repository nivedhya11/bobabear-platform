/**
 * Test-database isolation validation (IMP-005): data created in one
 * isolated database must never be visible from another, and dropping one
 * must not affect the other.
 */
import { describe, expect, inject, it } from "vitest";

import { withIsolatedTestDatabase, withTestDatabaseClient } from "./support/test-database";

function adminConnectionInfo() {
  return {
    connectionString: inject("bobaBearTestAdminConnectionString"),
    host: inject("bobaBearTestAdminHost"),
    port: inject("bobaBearTestAdminPort"),
  };
}

describe("test database isolation", () => {
  it("keeps two isolated databases fully independent", async () => {
    const adminInfo = adminConnectionInfo();

    await withIsolatedTestDatabase(adminInfo, async (first) => {
      await withTestDatabaseClient(first.connectionString, async (client) => {
        await client.pool.query(
          'CREATE TABLE "__boba_bear_isolation_marker" (id integer PRIMARY KEY, note text NOT NULL)',
        );
        await client.pool.query(
          'INSERT INTO "__boba_bear_isolation_marker" (id, note) VALUES (1, $1)',
          ["isolation-marker"],
        );
      });

      await withIsolatedTestDatabase(adminInfo, async (second) => {
        await withTestDatabaseClient(second.connectionString, async (client) => {
          const tableExists = await client.pool.query<{ exists: boolean }>(
            "SELECT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = $1) AS exists",
            ["__boba_bear_isolation_marker"],
          );
          expect(tableExists.rows[0]?.exists).toBe(false);
        });

        expect(second.databaseName).not.toBe(first.databaseName);
      });

      // The second isolated database has already been dropped (its
      // `withIsolatedTestDatabase` callback returned) — the first must be
      // completely unaffected.
      await withTestDatabaseClient(first.connectionString, async (client) => {
        const markerRow = await client.pool.query<{ note: string }>(
          'SELECT note FROM "__boba_bear_isolation_marker" WHERE id = 1',
        );
        expect(markerRow.rows[0]?.note).toBe("isolation-marker");
      });
    });
  });

  it("removes both isolated databases on cleanup, leaving none behind", async () => {
    const adminInfo = adminConnectionInfo();
    let droppedDatabaseNames: string[] = [];

    await withIsolatedTestDatabase(adminInfo, async (first) => {
      await withIsolatedTestDatabase(adminInfo, async (second) => {
        droppedDatabaseNames = [first.databaseName, second.databaseName];
      });
    });

    await withTestDatabaseClient(adminInfo.connectionString, async (client) => {
      const remaining = await client.pool.query<{ datname: string }>(
        "SELECT datname FROM pg_database WHERE datname = ANY($1)",
        [droppedDatabaseNames],
      );
      expect(remaining.rows).toHaveLength(0);
    });
  });
});
