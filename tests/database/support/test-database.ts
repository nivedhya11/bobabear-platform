/**
 * Fresh, isolated PostgreSQL databases for individual database integration
 * tests (IMP-005). Every test that needs a database gets its own, created
 * through the Testcontainers administrator connection and always dropped in
 * `finally` — no database is ever retained between tests.
 */
import { createDatabaseClient, runMigrations, type DatabaseClient } from "../../../src/platform/database";
import type { MigrationConfig } from "../../../src/platform/config";
import { quoteIdentifier, generateTestDatabaseName } from "./identifiers";
import type { AdminConnectionInfo } from "./test-container";

export interface IsolatedTestDatabase {
  readonly databaseName: string;
  /** Full `postgresql://` connection string for this isolated database,
   * using the Testcontainers administrator role. Never printed. */
  readonly connectionString: string;
}

function withDatabaseName(adminConnectionInfo: AdminConnectionInfo, databaseName: string): string {
  const url = new URL(adminConnectionInfo.connectionString);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

async function withAdminClient<T>(
  adminConnectionInfo: AdminConnectionInfo,
  fn: (client: DatabaseClient) => Promise<T>,
): Promise<T> {
  const client = createDatabaseClient({
    connectionString: adminConnectionInfo.connectionString,
    sslMode: "disable",
    applicationName: "boba-bear-db-test-admin",
    poolSize: 1,
  });
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}

/**
 * Create a uniquely-named, empty database, hand a connection string for it
 * to `callback`, then unconditionally terminate any remaining connections
 * and drop it — even if `callback` throws.
 */
export async function withIsolatedTestDatabase<T>(
  adminConnectionInfo: AdminConnectionInfo,
  callback: (database: IsolatedTestDatabase) => Promise<T>,
): Promise<T> {
  const databaseName = generateTestDatabaseName();
  const connectionString = withDatabaseName(adminConnectionInfo, databaseName);

  await withAdminClient(adminConnectionInfo, async (admin) => {
    await admin.pool.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
  });

  try {
    return await callback({ databaseName, connectionString });
  } finally {
    await withAdminClient(adminConnectionInfo, async (admin) => {
      await admin.pool.query(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
        [databaseName],
      );
      await admin.pool.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`);
    });
  }
}

/**
 * Apply every committed repository migration (drizzle/) against
 * `connectionString`, using the same shared migration-runner implementation
 * (`src/platform/database`) that `db:migrate` uses in production — no
 * second migration engine.
 */
export async function applyMigrations(connectionString: string): Promise<void> {
  const config: MigrationConfig = {
    environment: "test",
    processKind: "migration",
    publicOrigin: "http://localhost:3000",
    logLevel: "warn",
    release: null,
    allowUnsafeAdapters: true,
    databaseSslMode: "disable",
    databaseMigrationUrl: connectionString,
  };
  await runMigrations(config);
}

/** Open a short-lived client against an isolated test database. Callers
 * must close it (or use {@link withTestDatabaseClient}). */
export function createTestDatabaseClient(connectionString: string): DatabaseClient {
  return createDatabaseClient({
    connectionString,
    sslMode: "disable",
    applicationName: "boba-bear-db-test",
    poolSize: 1,
  });
}

export async function withTestDatabaseClient<T>(
  connectionString: string,
  fn: (client: DatabaseClient) => Promise<T>,
): Promise<T> {
  const client = createTestDatabaseClient(connectionString);
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}
