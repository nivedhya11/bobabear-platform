/**
 * Application-shaped role for Customer Address tables (IMP-018).
 * Addresses: SELECT/INSERT/UPDATE/DELETE. Audit: SELECT/INSERT only.
 * customer_auth_users: SELECT/UPDATE (FOR UPDATE lock).
 * customer_profiles: SELECT/INSERT/UPDATE/DELETE (profile-independence tests).
 */
import { randomBytes } from "node:crypto";

import { assertSafeIdentifier, quoteIdentifier } from "./identifiers";
import { withTestDatabaseClient } from "./test-database";

export interface CustomerAddressRoleFixture {
  readonly applicationConnectionString: string;
}

function withCredentials(connectionString: string, username: string, password: string): string {
  const url = new URL(connectionString);
  url.username = encodeURIComponent(username);
  url.password = encodeURIComponent(password);
  return url.toString();
}

export async function withCustomerAddressRoleFixture<T>(
  databaseName: string,
  connectionString: string,
  callback: (fixture: CustomerAddressRoleFixture) => Promise<T>,
): Promise<T> {
  const suffix = randomBytes(6).toString("hex");
  const role = `boba_test_caddr_app_${suffix}`;
  assertSafeIdentifier(role);
  const password = randomBytes(24).toString("hex");

  await withTestDatabaseClient(connectionString, async (admin) => {
    await admin.pool.query(
      `CREATE ROLE ${quoteIdentifier(role)} WITH LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`,
    );
    await admin.pool.query(
      `GRANT CONNECT ON DATABASE ${quoteIdentifier(databaseName)} TO ${quoteIdentifier(role)}`,
    );
    await admin.pool.query(`GRANT USAGE ON SCHEMA app TO ${quoteIdentifier(role)}`);
    await admin.pool.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON app.customer_addresses TO ${quoteIdentifier(role)}`,
    );
    await admin.pool.query(
      `GRANT SELECT, INSERT ON app.customer_address_audit_events TO ${quoteIdentifier(role)}`,
    );
    await admin.pool.query(
      `GRANT SELECT, UPDATE ON app.customer_auth_users TO ${quoteIdentifier(role)}`,
    );
    await admin.pool.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON app.customer_profiles TO ${quoteIdentifier(role)}`,
    );
    await admin.pool.query(
      `GRANT SELECT, INSERT ON app.customer_profile_audit_events TO ${quoteIdentifier(role)}`,
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
