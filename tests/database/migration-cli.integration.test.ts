/**
 * Real migration CLI validation (IMP-005): `scripts/database/migrate.ts` is
 * spawned as an actual child process (not imported and invoked in-process)
 * against an isolated Testcontainers database, with an explicit, controlled
 * environment. The developer's real `.env.local` must never be consulted —
 * explicit child-process values take precedence over anything `@next/env`
 * would otherwise load.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, inject, it } from "vitest";

import { MIGRATIONS_SCHEMA, MIGRATIONS_TABLE } from "../../src/platform/database";
import { withIsolatedTestDatabase, withTestDatabaseClient } from "./support/test-database";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function adminConnectionInfo() {
  return {
    connectionString: inject("bobaBearTestAdminConnectionString"),
    host: inject("bobaBearTestAdminHost"),
    port: inject("bobaBearTestAdminPort"),
  };
}

function runMigrateCli(databaseMigrationUrl: string): { exitCode: number; output: string } {
  try {
    const output = execFileSync("npx", ["tsx", "scripts/database/migrate.ts"], {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: 60_000,
      env: {
        PATH: process.env.PATH,
        BOBA_BEAR_ENV: "test",
        NODE_ENV: "test",
        BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000",
        BOBA_BEAR_DATABASE_MIGRATION_URL: databaseMigrationUrl,
        BOBA_BEAR_DATABASE_SSL_MODE: "disable",
      },
    });
    return { exitCode: 0, output };
  } catch (error) {
    const execError = error as { status: number | null; stdout?: string; stderr?: string };
    return {
      exitCode: execError.status ?? 1,
      output: `${execError.stdout ?? ""}${execError.stderr ?? ""}`,
    };
  }
}

describe("migration CLI", () => {
  it("applies migrations on first run and is a safe no-op on the second", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      const first = runMigrateCli(database.connectionString);
      expect(first.exitCode).toBe(0);
      expect(first.output).not.toMatch(/postgresql:\/\//);
      expect(first.output).not.toContain(new URL(database.connectionString).password);

      const countAfterFirst = await withTestDatabaseClient(database.connectionString, async (client) => {
        const result = await client.pool.query(`SELECT COUNT(*) AS count FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}`);
        return Number(result.rows[0]?.count);
      });

      const second = runMigrateCli(database.connectionString);
      expect(second.exitCode).toBe(0);
      expect(second.output).not.toMatch(/postgresql:\/\//);
      expect(second.output).not.toContain(new URL(database.connectionString).password);

      const countAfterSecond = await withTestDatabaseClient(database.connectionString, async (client) => {
        const result = await client.pool.query(`SELECT COUNT(*) AS count FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}`);
        return Number(result.rows[0]?.count);
      });

      expect(countAfterSecond).toBe(countAfterFirst);
    });
  });
});
