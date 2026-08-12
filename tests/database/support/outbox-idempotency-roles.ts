/**
 * A restricted PostgreSQL role scoped to the real `app.outbox_events` /
 * `app.idempotency_records` tables (IMP-007), for proving the application
 * role actually has DML-only access to these two tables after a real
 * migration replay.
 *
 * Distinct from `persistence-roles.ts` (IMP-006), which creates its own
 * ephemeral probe schema/table unrelated to any committed migration. Here
 * the tables already exist (created by `applyMigrations` against the
 * isolated database's administrator connection, which plays the migrator
 * role in the Testcontainers harness — it has no separate `boba_bear_app`/
 * `boba_bear_migrator` roles at all), and this fixture grants a new,
 * randomly-named restricted role exactly the same DML privileges the real
 * `boba_bear_app` role gets via `ALTER DEFAULT PRIVILEGES` in
 * docker/postgres/init/001-bootstrap.sh.
 */
import { randomBytes } from "node:crypto";

import { assertSafeIdentifier, quoteIdentifier } from "./identifiers";
import { withTestDatabaseClient } from "./test-database";

export interface OutboxIdempotencyRoleFixture {
  readonly applicationConnectionString: string;
}

function withCredentials(connectionString: string, username: string, password: string): string {
  const url = new URL(connectionString);
  url.username = encodeURIComponent(username);
  url.password = encodeURIComponent(password);
  return url.toString();
}

/**
 * Inside the already-isolated, already-migrated database at
 * `connectionString`, create a restricted role with exactly
 * SELECT/INSERT/UPDATE/DELETE on `app.outbox_events` and
 * `app.idempotency_records` (no DDL, no role management), hand back a
 * connection string for it, then drop the role. Never touches the local
 * Compose database.
 */
export async function withOutboxIdempotencyRoleFixture<T>(
  databaseName: string,
  connectionString: string,
  callback: (fixture: OutboxIdempotencyRoleFixture) => Promise<T>,
): Promise<T> {
  const suffix = randomBytes(6).toString("hex");
  const role = `boba_test_outbox_app_${suffix}`;
  assertSafeIdentifier(role);
  const password = randomBytes(24).toString("hex");

  await withTestDatabaseClient(connectionString, async (admin) => {
    await admin.pool.query(
      `CREATE ROLE ${quoteIdentifier(role)} WITH LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`,
    );
    await admin.pool.query(`GRANT CONNECT ON DATABASE ${quoteIdentifier(databaseName)} TO ${quoteIdentifier(role)}`);
    await admin.pool.query(`GRANT USAGE ON SCHEMA app TO ${quoteIdentifier(role)}`);
    await admin.pool.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON app.outbox_events, app.idempotency_records TO ${quoteIdentifier(role)}`,
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
