/**
 * Resource-cleanup and local-Compose-coexistence validation (IMP-005).
 *
 * The Testcontainers PostgreSQL container must use a dynamically-assigned
 * host port distinct from the local Compose database's fixed port (5433),
 * so both can run at the same time, and every isolated test database this
 * suite creates must be gone by the time its callback returns.
 */
import { describe, expect, inject, it } from "vitest";

import { withIsolatedTestDatabase, withTestDatabaseClient } from "./support/test-database";
import { TEST_DATABASE_PREFIX } from "./support/identifiers";

const LOCAL_COMPOSE_HOST_PORT = 5433;

function adminConnectionInfo() {
  return {
    connectionString: inject("bobaBearTestAdminConnectionString"),
    host: inject("bobaBearTestAdminHost"),
    port: inject("bobaBearTestAdminPort"),
  };
}

describe("container and coexistence", () => {
  it("uses a dynamic host port distinct from the local Compose database", () => {
    const { port } = adminConnectionInfo();
    expect(port).not.toBe(LOCAL_COMPOSE_HOST_PORT);
  });
});

describe("database cleanup", () => {
  it("leaves no boba_test_ database behind after the harness runs", async () => {
    const adminInfo = adminConnectionInfo();

    await withIsolatedTestDatabase(adminInfo, async () => {
      // no-op: exercise create + drop only.
    });

    await withTestDatabaseClient(adminInfo.connectionString, async (client) => {
      const stray = await client.pool.query<{ datname: string }>(
        "SELECT datname FROM pg_database WHERE datname LIKE $1",
        [`${TEST_DATABASE_PREFIX}%`],
      );
      expect(stray.rows).toHaveLength(0);
    });
  });
});
