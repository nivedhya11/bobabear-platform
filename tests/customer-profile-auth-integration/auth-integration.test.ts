/**
 * Customer Profile ↔ customer-auth integration tests (IMP-017).
 */
import { afterEach, describe, expect, inject, it } from "vitest";

import type { E164IndianMobileNumber } from "../../src/shared/customer-auth/phone";
import { createCustomerTemporaryIdentityDeriver, type CustomerPiiHashSecret } from "../../src/server/customer-auth/pii";
import { createLocalCustomerOtpProviderForTests } from "../../src/server/customer-auth/provider/local";
import {
  getCustomerAuthRuntime,
  type CustomerPhoneAuthRuntimeDependencies,
} from "../../src/server/auth/customer/runtime";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import {
  createOwnCustomerProfile,
  customerActorFromTrustedCustomerAuthSession,
  deleteOwnCustomerProfile,
  getOwnCustomerProfile,
  updateOwnCustomerProfile,
} from "../../src/server/customer-profiles";
import { getApplicationPersistence } from "../../src/server/persistence";
import { applicationConfig } from "../database/support/customer-profiles-fixtures";
import { applyMigrations, withIsolatedTestDatabase, withTestDatabaseClient } from "../database/support/test-database";

const PHONE = "+919876543210" as E164IndianMobileNumber;
const PII_HASH_SECRET = "customer-profile-auth-integration-pii-hash-secret-32ch" as CustomerPiiHashSecret;

function adminConnectionInfo() {
  return {
    connectionString: inject("bobaBearTestAdminConnectionString"),
    host: inject("bobaBearTestAdminHost"),
    port: inject("bobaBearTestAdminPort"),
  };
}

function authFoundationConfig() {
  return loadAuthFoundationConfig(
    {
      CUSTOMER_AUTH_SECRET: "customer-profile-auth-integration-secret-32-chars-min",
      CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
      WORKFORCE_AUTH_SECRET: "workforce-profile-auth-integration-secret-32-chars",
      WORKFORCE_AUTH_BASE_URL: "http://localhost:3100",
    },
    "test",
  );
}

type InternalAdapter = {
  createUser: (data: {
    email: string;
    name: string;
    emailVerified: boolean;
  }) => Promise<{ id: string }>;
  createSession: (userId: string) => Promise<{ token: string }>;
  findSession: (token: string) => Promise<{ session: { token: string }; user: { id: string } } | null>;
};

async function internalAdapterFor(runtime: {
  getAuth: () => Promise<{ $context: Promise<unknown> }>;
}): Promise<InternalAdapter> {
  const auth = await runtime.getAuth();
  const context = (await auth.$context) as { internalAdapter: InternalAdapter };
  return context.internalAdapter;
}

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
});

describe("IMP-017 customer-auth integration", () => {
  it("trusted customer-auth identity enables own Profile ops without altering auth phone/session", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const profileConfig = applicationConfig(database.connectionString);
      const authPersistenceConfig = applicationConfig(database.connectionString);
      const persistence = getApplicationPersistence(profileConfig);
      openHandles.push(persistence);

      const otpProvider = createLocalCustomerOtpProviderForTests({ environmentType: "test" });
      const phoneDeps: CustomerPhoneAuthRuntimeDependencies = {
        otpProvider,
        identityDeriver: createCustomerTemporaryIdentityDeriver(PII_HASH_SECRET),
      };
      const runtime = getCustomerAuthRuntime(
        {
          auth: authFoundationConfig().customer,
          persistence: authPersistenceConfig,
        },
        phoneDeps,
      );
      openHandles.push(runtime);

      const adapter = await internalAdapterFor(runtime);
      const user = await adapter.createUser({
        email: "profile-int@phone.invalid",
        name: "Temp",
        emailVerified: false,
      });

      // Attach phone the same way IMP-009 persists it (direct column for integration fixture).
      await withTestDatabaseClient(database.connectionString, async (client) => {
        await client.pool.query(
          `update app.customer_auth_users
           set phone_number = $1, phone_number_verified = true
           where id = $2`,
          [PHONE, user.id],
        );
      });

      const session = await adapter.createSession(user.id);
      const found = await adapter.findSession(session.token);
      expect(found?.user.id).toBe(user.id);

      try {
        customerActorFromTrustedCustomerAuthSession(null);
        expect.unreachable("expected rejection");
      } catch (error) {
        expect(error).toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
      }

      const actor = customerActorFromTrustedCustomerAuthSession({ userId: found!.user.id });
      const created = await createOwnCustomerProfile(persistence, actor, {
        givenName: "Ashutosh",
        email: "ash@example.com",
      });
      expect(created.givenName).toBe("Ashutosh");

      await updateOwnCustomerProfile(persistence, actor, { familyName: "Joshi" });
      await deleteOwnCustomerProfile(persistence, actor);
      expect(await getOwnCustomerProfile(persistence, actor)).toBeNull();

      // Auth phone and session remain intact; no workforce identity created.
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const auth = await client.pool.query<{ phone_number: string }>(
          `select phone_number from app.customer_auth_users where id = $1`,
          [user.id],
        );
        expect(auth.rows[0]?.phone_number).toBe(PHONE);

        const cols = await client.pool.query(
          `select column_name from information_schema.columns
           where table_schema = 'app' and table_name = 'customer_profiles'
             and column_name like '%phone%'`,
        );
        expect(cols.rowCount).toBe(0);

        const sessionStill = await adapter.findSession(session.token);
        expect(sessionStill?.user.id).toBe(user.id);

        const workforce = await client.pool.query(
          `select id from app.workforce_auth_users where email = $1`,
          ["profile-int@phone.invalid"],
        );
        expect(workforce.rowCount).toBe(0);
      });
    });
  });

  it("denies Profile operations without validated customer authentication", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      await expect(
        createOwnCustomerProfile(persistence, { kind: "customer", authUserId: "forged" }, {
          givenName: "Nope",
        }),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
    });
  });
});
