/**
 * Failure and secret-redaction validation (IMP-005).
 *
 * `DO_NOT_LEAK_DATABASE_SECRET_94817` is used only as controlled test data
 * (a fake password embedded in deliberately-broken connection strings) —
 * never in production configuration. Every assertion here proves the
 * sentinel, and the connection string itself, never appears in an error
 * message, child-process stdout/stderr, or a safe error serialization.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, inject, it } from "vitest";

import { createDatabaseClient, toSafeDatabaseError } from "../../src/platform/database";

const SENTINEL = "DO_NOT_LEAK_DATABASE_SECRET_94817";
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function adminConnectionInfo() {
  return {
    connectionString: inject("bobaBearTestAdminConnectionString"),
    host: inject("bobaBearTestAdminHost"),
    port: inject("bobaBearTestAdminPort"),
  };
}

describe("connection failures never leak secrets", () => {
  it("redacts an unreachable-database failure", async () => {
    const { host } = adminConnectionInfo();
    const unreachableUrl = `postgresql://${SENTINEL}:${SENTINEL}@${host}:1/postgres`;

    const client = createDatabaseClient({
      connectionString: unreachableUrl,
      sslMode: "disable",
      applicationName: "boba-bear-db-test-unreachable",
      poolSize: 1,
      connectionTimeoutMillis: 2000,
    });

    try {
      let caught: unknown;
      try {
        await client.pool.query("SELECT 1");
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeDefined();
      const safeError = toSafeDatabaseError(caught, "Database connectivity check failed.");
      const serialized = JSON.stringify(safeError.toSafeJSON());
      expect(serialized).not.toContain(SENTINEL);
      expect(serialized).not.toContain(unreachableUrl);
    } finally {
      await client.close();
    }
  });

  it("redacts an invalid-credentials failure", async () => {
    const adminInfo = adminConnectionInfo();
    const url = new URL(adminInfo.connectionString);
    url.password = SENTINEL;
    url.username = "boba-bear-invalid-test-user";

    const client = createDatabaseClient({
      connectionString: url.toString(),
      sslMode: "disable",
      applicationName: "boba-bear-db-test-invalid-creds",
      poolSize: 1,
      connectionTimeoutMillis: 5000,
    });

    try {
      let caught: unknown;
      try {
        await client.pool.query("SELECT 1");
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeDefined();
      const safeError = toSafeDatabaseError(caught, "Database connectivity check failed.");
      const serialized = JSON.stringify(safeError.toSafeJSON());
      expect(serialized).not.toContain(SENTINEL);
    } finally {
      await client.close();
    }
  });
});

function runMigrateCliWithMalformedUrl(): { exitCode: number; output: string } {
  try {
    const output = execFileSync("npx", ["tsx", "scripts/database/migrate.ts"], {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: 30_000,
      env: {
        PATH: process.env.PATH,
        BOBA_BEAR_ENV: "test",
        NODE_ENV: "test",
        BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000",
        BOBA_BEAR_DATABASE_MIGRATION_URL: `not-a-postgres-url-${SENTINEL}`,
        BOBA_BEAR_DATABASE_SSL_MODE: "disable",
      },
    });
    return { exitCode: 0, output };
  } catch (error) {
    const execError = error as { status: number | null; stdout?: string; stderr?: string };
    return { exitCode: execError.status ?? 1, output: `${execError.stdout ?? ""}${execError.stderr ?? ""}` };
  }
}

describe("migration CLI configuration failure never leaks secrets", () => {
  it("rejects a malformed migration URL without printing it", () => {
    const result = runMigrateCliWithMalformedUrl();
    expect(result.exitCode).not.toBe(0);
    expect(result.output).not.toContain(SENTINEL);
  });
});
