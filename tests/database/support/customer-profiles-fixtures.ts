/**
 * Shared fixtures for Customer Profile tests (IMP-017).
 */
import type { WebConfig } from "../../../src/platform/config";
import { createCustomerActorFromTrustedAuthIdentity } from "../../../src/server/customer-profiles";

export function applicationConfig(databaseUrl: string): WebConfig {
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

export function customerActor(authUserId: string) {
  return createCustomerActorFromTrustedAuthIdentity({ authUserId });
}

export async function insertCustomerAuthUser(
  execute: (query: string, params?: unknown[]) => Promise<unknown>,
  id: string,
  email = `${id}@example.test`,
  phone: string | null = null,
): Promise<void> {
  await execute(
    `insert into app.customer_auth_users
      (id, name, email, email_verified, phone_number, phone_number_verified, created_at, updated_at)
     values ($1, $2, $3, false, $4, $5, now(), now())`,
    [id, "Customer", email, phone, phone ? true : null],
  );
}
