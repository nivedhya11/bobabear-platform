/**
 * PostgreSQL integration tests for the shared persistence primitives
 * (IMP-006). Real Testcontainers PostgreSQL 18 only — no mock, no
 * SQLite/PGlite substitute. Every test gets its own isolated database (via
 * `withIsolatedTestDatabase`) plus its own unprivileged, role-separated
 * "app" and "migrator" roles (via `withPersistenceRoleFixture`) — never the
 * local Compose database, never a committed migration.
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, inject, it } from "vitest";

import type { MigrationConfig, WebConfig } from "../../src/platform/config";
import {
  getApplicationPersistence,
  getMigrationPersistence,
  PersistenceUnavailableError,
} from "../../src/server/persistence";
import { withPersistenceRoleFixture } from "./support/persistence-roles";
import { withIsolatedTestDatabase } from "./support/test-database";

interface ProbeRow extends Record<string, unknown> {
  id: number;
  value: string;
}

function adminConnectionInfo() {
  return {
    connectionString: inject("bobaBearTestAdminConnectionString"),
    host: inject("bobaBearTestAdminHost"),
    port: inject("bobaBearTestAdminPort"),
  };
}

function applicationConfig(databaseUrl: string): WebConfig {
  return {
    environment: "test",
    processKind: "web",
    publicOrigin: "http://localhost:3000",
    logLevel: "warn",
    release: null,
    allowUnsafeAdapters: true,
    databaseSslMode: "disable",
    port: 3000,
    databaseUrl,
  };
}

function migrationConfigFor(databaseMigrationUrl: string): MigrationConfig {
  return {
    environment: "test",
    processKind: "migration",
    publicOrigin: "http://localhost:3000",
    logLevel: "warn",
    release: null,
    allowUnsafeAdapters: true,
    databaseSslMode: "disable",
    databaseMigrationUrl,
  };
}

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
});

describe("persistence: role connectivity and availability", () => {
  it("connects and checks availability as the application role", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async ({ databaseName, connectionString }) => {
      await withPersistenceRoleFixture(databaseName, connectionString, async (fixture) => {
        const persistence = getApplicationPersistence(
          applicationConfig(fixture.applicationConnectionString),
        );
        openHandles.push(persistence);
        await expect(persistence.checkAvailability()).resolves.toEqual({ ok: true });
        await persistence.close();
      });
    });
  });

  it("connects and checks availability as the migration role", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async ({ databaseName, connectionString }) => {
      await withPersistenceRoleFixture(databaseName, connectionString, async (fixture) => {
        const persistence = getMigrationPersistence(
          migrationConfigFor(fixture.migrationConnectionString),
        );
        openHandles.push(persistence);
        await expect(persistence.checkAvailability()).resolves.toEqual({ ok: true });
        await persistence.close();
      });
    });
  });
});

describe("persistence: application-role privilege restriction", () => {
  it("cannot create a table in the migrator-owned schema", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async ({ databaseName, connectionString }) => {
      await withPersistenceRoleFixture(databaseName, connectionString, async (fixture) => {
        const persistence = getApplicationPersistence(
          applicationConfig(fixture.applicationConnectionString),
        );
        openHandles.push(persistence);

        const probeSchemaIdentifier = sql.identifier(fixture.probeSchema);
        await expect(
          persistence.withContext((ctx) =>
            ctx.db.execute(
              sql`create table ${probeSchemaIdentifier}.forbidden (id int)`,
            ),
          ),
        ).rejects.toThrow();

        await persistence.close();
      });
    });
  });

  it("cannot create a new role (no bootstrap/admin access)", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async ({ databaseName, connectionString }) => {
      await withPersistenceRoleFixture(databaseName, connectionString, async (fixture) => {
        const persistence = getApplicationPersistence(
          applicationConfig(fixture.applicationConnectionString),
        );
        openHandles.push(persistence);

        await expect(
          persistence.withContext((ctx) =>
            ctx.db.execute(sql`create role boba_test_escalation login`),
          ),
        ).rejects.toThrow();

        await persistence.close();
      });
    });
  });
});

describe("persistence: transactions", () => {
  it("commits an insert so it is visible afterward, and returns the callback's result", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async ({ databaseName, connectionString }) => {
      await withPersistenceRoleFixture(databaseName, connectionString, async (fixture) => {
        const persistence = getApplicationPersistence(
          applicationConfig(fixture.applicationConnectionString),
        );
        openHandles.push(persistence);

        const probeTable = sql`${sql.identifier(fixture.probeSchema)}.${sql.identifier(fixture.probeTable)}`;

        const insertedId = await persistence.transaction(async (tx) => {
          const result = await tx.db.execute<ProbeRow>(
            sql`insert into ${probeTable} (value) values (${"committed-value"}) returning id`,
          );
          return result.rows[0]?.id;
        });
        expect(typeof insertedId).toBe("number");

        const rows = await persistence.withContext(async (ctx) => {
          const result = await ctx.db.execute<ProbeRow>(
            sql`select value from ${probeTable} where id = ${insertedId}`,
          );
          return result.rows;
        });
        expect(rows).toEqual([{ value: "committed-value" }]);

        await persistence.close();
      });
    });
  });

  it("rolls back an insert when the callback throws, and does not run the callback more than once", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async ({ databaseName, connectionString }) => {
      await withPersistenceRoleFixture(databaseName, connectionString, async (fixture) => {
        const persistence = getApplicationPersistence(
          applicationConfig(fixture.applicationConnectionString),
        );
        openHandles.push(persistence);

        const probeTable = sql`${sql.identifier(fixture.probeSchema)}.${sql.identifier(fixture.probeTable)}`;
        let callCount = 0;
        class DomainError extends Error {}

        await expect(
          persistence.transaction(async (tx) => {
            callCount += 1;
            await tx.db.execute(
              sql`insert into ${probeTable} (value) values (${"rolled-back-value"})`,
            );
            throw new DomainError("business rule violated");
          }),
        ).rejects.toBeInstanceOf(DomainError);

        expect(callCount).toBe(1);

        const rows = await persistence.withContext(async (ctx) => {
          const result = await ctx.db.execute<ProbeRow>(
            sql`select value from ${probeTable} where value = ${"rolled-back-value"}`,
          );
          return result.rows;
        });
        expect(rows).toEqual([]);

        await persistence.close();
      });
    });
  });
});

describe("persistence: unavailable database", () => {
  it("normalizes a connection failure without leaking the connection string or password", async () => {
    const SECRET = "s3cret-pw-should-not-leak";
    const unreachableConfig = applicationConfig(
      `postgresql://probe_user:${SECRET}@127.0.0.1:59999/does_not_matter`,
    );
    const persistence = getApplicationPersistence(unreachableConfig);
    openHandles.push(persistence);

    let caught: unknown;
    try {
      await persistence.checkAvailability();
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(PersistenceUnavailableError);
    const message = (caught as Error).message;
    const stack = (caught as Error).stack ?? "";
    const safeJson = JSON.stringify((caught as PersistenceUnavailableError).toSafeJSON());
    expect(message).not.toContain(SECRET);
    expect(stack).not.toContain(SECRET);
    expect(safeJson).not.toContain(SECRET);
    expect(message).not.toContain("59999");

    await persistence.close();
  }, 20_000);
});

describe("persistence: lifecycle against a real pool", () => {
  it("close() is idempotent and a fresh handle can be acquired for the same config after closing", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async ({ databaseName, connectionString }) => {
      await withPersistenceRoleFixture(databaseName, connectionString, async (fixture) => {
        const config = applicationConfig(fixture.applicationConnectionString);

        const first = getApplicationPersistence(config);
        await first.checkAvailability();
        await first.close();
        await first.close();

        const second = getApplicationPersistence(config);
        expect(second).not.toBe(first);
        await expect(second.checkAvailability()).resolves.toEqual({ ok: true });
        await second.close();
      });
    });
  });
});
