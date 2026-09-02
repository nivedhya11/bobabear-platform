/**
 * Vitest global setup for database integration tests (IMP-005).
 *
 * Starts exactly one disposable PostgreSQL 18 Testcontainers container for
 * the entire `npm run test:database` run, confirms it reports PostgreSQL
 * 18.4, and hands its (secret) administrator connection details to test
 * workers through Vitest's `provide`/`inject` mechanism — never through an
 * in-memory global that would not cross the worker boundary, and never
 * printed. The container is always stopped on teardown, including when a
 * test fails.
 *
 * If Docker is unavailable, container startup throws and this file's setup
 * throws too — Vitest fails the whole run non-zero rather than silently
 * skipping database tests.
 */
import { createDatabaseClient } from "../../src/platform/database";
import { startPostgresTestContainer } from "./support/test-container";

interface GlobalSetupContext {
  provide<T>(key: string, value: T): void;
}

export default async function setup({ provide }: GlobalSetupContext): Promise<() => Promise<void>> {
  const handle = await startPostgresTestContainer();
  let stopped = false;
  const stop = async (): Promise<void> => {
    if (stopped) return;
    stopped = true;
    await handle.stop();
  };
  const terminate = (signal: NodeJS.Signals): void => {
    void stop().finally(() => process.exit(signal === "SIGINT" ? 130 : 143));
  };
  const onSigint = () => terminate("SIGINT");
  const onSigterm = () => terminate("SIGTERM");
  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);

  const verifyClient = createDatabaseClient({
    connectionString: handle.adminConnectionInfo.connectionString,
    sslMode: "disable",
    applicationName: "boba-bear-db-test-setup",
    poolSize: 1,
  });
  try {
    const result = await verifyClient.pool.query<{ server_version: string }>("SHOW server_version");
    const version = result.rows[0]?.server_version;
    if (!version || !version.startsWith("18.4")) {
      throw new Error(
        `Database integration-test container must report PostgreSQL 18.4, got "${version ?? "unknown"}".`,
      );
    }
  } finally {
    await verifyClient.close();
  }

  provide("bobaBearTestAdminConnectionString", handle.adminConnectionInfo.connectionString);
  provide("bobaBearTestAdminHost", handle.adminConnectionInfo.host);
  provide("bobaBearTestAdminPort", handle.adminConnectionInfo.port);

  return async () => {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
    await stop();
  };
}
