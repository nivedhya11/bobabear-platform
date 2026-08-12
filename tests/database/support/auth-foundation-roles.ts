/**
 * A restricted PostgreSQL role scoped to the Better Auth tables plus the
 * customer OTP rate-limit table (IMP-009) and workforce MFA / rate-limit
 * tables (IMP-010), for proving the application role actually has DML-only
 * access after a real migration replay. Mirrors `outbox-idempotency-roles.ts`
 * (IMP-007) — see that file for the full rationale.
 */
import { randomBytes } from "node:crypto";

import { assertSafeIdentifier, quoteIdentifier } from "./identifiers";
import { withTestDatabaseClient } from "./test-database";

const AUTH_FOUNDATION_TABLES = [
  "customer_auth_users",
  "customer_auth_sessions",
  "customer_auth_accounts",
  "customer_auth_verifications",
  "workforce_auth_users",
  "workforce_auth_sessions",
  "workforce_auth_accounts",
  "workforce_auth_verifications",
  // IMP-009: the customer phone-OTP rate-limit table lives in the same
  // `app` schema and gets the same `boba_bear_app` DML-only privileges via
  // the same `ALTER DEFAULT PRIVILEGES` statement (see AGENTS.md).
  "customer_otp_rate_limits",
  // IMP-010: workforce MFA + durable rate-limit tables.
  "workforce_auth_two_factors",
  "workforce_auth_rate_limits",
];

export interface AuthFoundationRoleFixture {
  readonly applicationConnectionString: string;
}

function withCredentials(connectionString: string, username: string, password: string): string {
  const url = new URL(connectionString);
  url.username = encodeURIComponent(username);
  url.password = encodeURIComponent(password);
  return url.toString();
}

export async function withAuthFoundationRoleFixture<T>(
  databaseName: string,
  connectionString: string,
  callback: (fixture: AuthFoundationRoleFixture) => Promise<T>,
): Promise<T> {
  const suffix = randomBytes(6).toString("hex");
  const role = `boba_test_auth_app_${suffix}`;
  assertSafeIdentifier(role);
  const password = randomBytes(24).toString("hex");
  const tableList = AUTH_FOUNDATION_TABLES.map((t) => `app.${t}`).join(", ");

  await withTestDatabaseClient(connectionString, async (admin) => {
    await admin.pool.query(
      `CREATE ROLE ${quoteIdentifier(role)} WITH LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`,
    );
    await admin.pool.query(`GRANT CONNECT ON DATABASE ${quoteIdentifier(databaseName)} TO ${quoteIdentifier(role)}`);
    await admin.pool.query(`GRANT USAGE ON SCHEMA app TO ${quoteIdentifier(role)}`);
    await admin.pool.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${tableList} TO ${quoteIdentifier(role)}`);
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
