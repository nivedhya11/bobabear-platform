/**
 * Testcontainers PostgreSQL container lifecycle for the database
 * integration-test harness (IMP-005). Every database integration test uses
 * exactly `postgres:18.4-trixie`, on a dynamically-assigned host port, with
 * a runtime-only administrator password — never bound to the local Compose
 * database's fixed host port (5433), never reused across runs.
 */
import { randomBytes } from "node:crypto";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";

export const POSTGRES_TEST_IMAGE = "postgres:18.4-trixie";
export const TEST_ADMIN_USERNAME = "boba_bear_test_admin";
export const TEST_ADMIN_DATABASE = "postgres";

export interface AdminConnectionInfo {
  /** Full `postgresql://` connection string for the container's runtime
   * administrator role. Callers must never print this value. */
  readonly connectionString: string;
  readonly host: string;
  readonly port: number;
}

export interface TestContainerHandle {
  readonly adminConnectionInfo: AdminConnectionInfo;
  stop(): Promise<void>;
}

/** `@testcontainers/postgresql` builds connection URIs with the `postgres:`
 * scheme; the BOBA Bear configuration boundary (and `pg`) accept either, but
 * `validateDatabaseUrl` requires exactly `postgresql:` — normalize once here
 * so every downstream consumer (the migration CLI included) sees a scheme
 * the config boundary accepts. */
function toPostgresqlScheme(connectionUri: string): string {
  return connectionUri.replace(/^postgres:\/\//, "postgresql://");
}

/**
 * Start one disposable PostgreSQL 18 Testcontainers container. No fixed
 * name, no `.withReuse()`, no privileged mode, no host networking — a fresh
 * container every run, stopped explicitly by the caller (including on
 * failure).
 */
export async function startPostgresTestContainer(): Promise<TestContainerHandle> {
  // Rootless Podman is the supported local runtime. Ryuk is deliberately not
  // relied on there: every caller owns explicit, idempotent teardown.
  process.env.DOCKER_HOST ??= `unix:///run/user/${process.getuid?.() ?? 1000}/podman/podman.sock`;
  process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";
  const password = randomBytes(24).toString("hex");

  let container: StartedPostgreSqlContainer;
  try {
    container = await new PostgreSqlContainer(POSTGRES_TEST_IMAGE)
      .withUsername(TEST_ADMIN_USERNAME)
      .withPassword(password)
      .withDatabase(TEST_ADMIN_DATABASE)
      .start();
  } catch (error) {
    throw new Error(
      "Could not start the PostgreSQL Testcontainers container. Rootless Podman WSL must be running and " +
        "reachable to run database integration tests.",
      { cause: error },
    );
  }

  return {
    adminConnectionInfo: {
      connectionString: toPostgresqlScheme(container.getConnectionUri()),
      host: container.getHost(),
      port: container.getPort(),
    },
    async stop(): Promise<void> {
      await container.stop();
    },
  };
}
