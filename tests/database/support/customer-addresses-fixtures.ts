/**
 * Shared fixtures for Customer Address tests (IMP-018).
 */
import type { WebConfig } from "../../../src/platform/config";
import { createCustomerActorFromTrustedAuthIdentity } from "../../../src/server/customer-addresses";
import type { CustomerAddressCreateInput } from "../../../src/shared/customer-addresses";

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

/** Valid minimal Address create input (canonical Dehradun example). */
export function minimalAddressCreateInput(
  overrides: Partial<CustomerAddressCreateInput> = {},
): CustomerAddressCreateInput {
  return {
    recipientName: "Ashutosh Joshi",
    recipientPhone: "+919876543210",
    addressLine1: "Flat 204, Block-B",
    city: "Dehradun",
    stateCode: "IN-UT",
    postalCode: "248001",
    ...overrides,
  };
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
