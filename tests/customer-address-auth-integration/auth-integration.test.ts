/**
 * Customer Address ↔ customer-auth integration tests (IMP-018).
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
  clearDefaultOwnAddress,
  createOwnAddress,
  customerActorFromTrustedCustomerAuthSession,
  deleteOwnAddress,
  getOwnAddress,
  listOwnAddresses,
  setDefaultOwnAddress,
  updateOwnAddress,
} from "../../src/server/customer-addresses";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  applicationConfig,
  minimalAddressCreateInput,
} from "../database/support/customer-addresses-fixtures";
import { applyMigrations, withIsolatedTestDatabase, withTestDatabaseClient } from "../database/support/test-database";

const PHONE = "+919876543210" as E164IndianMobileNumber;
const PII_HASH_SECRET = "customer-address-auth-integration-pii-hash-secret-32" as CustomerPiiHashSecret;

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
      CUSTOMER_AUTH_SECRET: "customer-address-auth-integration-secret-32-chars",
      CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
      WORKFORCE_AUTH_SECRET: "workforce-address-auth-integration-secret-32chr",
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

describe("IMP-018 customer-auth integration", () => {
  it("trusted customer-auth identity enables own Address ops without altering auth phone/session", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const addressConfig = applicationConfig(database.connectionString);
      const authPersistenceConfig = applicationConfig(database.connectionString);
      const persistence = getApplicationPersistence(addressConfig);
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
        email: "address-int@phone.invalid",
        name: "Temp",
        emailVerified: false,
      });

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
      const created = await createOwnAddress(
        persistence,
        actor,
        minimalAddressCreateInput({ makeDefault: true }),
      );
      expect(created.recipientName).toBe("Ashutosh Joshi");
      expect(created.isDefault).toBe(true);

      await updateOwnAddress(persistence, actor, created.id, { label: "Home" });
      await setDefaultOwnAddress(persistence, actor, created.id);
      await clearDefaultOwnAddress(persistence, actor);
      expect((await listOwnAddresses(persistence, actor))[0]?.isDefault).toBe(false);

      await deleteOwnAddress(persistence, actor, created.id);
      expect(await listOwnAddresses(persistence, actor)).toEqual([]);

      await withTestDatabaseClient(database.connectionString, async (client) => {
        const auth = await client.pool.query<{ phone_number: string }>(
          `select phone_number from app.customer_auth_users where id = $1`,
          [user.id],
        );
        expect(auth.rows[0]?.phone_number).toBe(PHONE);

        const sessionStill = await adapter.findSession(session.token);
        expect(sessionStill?.user.id).toBe(user.id);

        const workforce = await client.pool.query(
          `select id from app.workforce_auth_users where email = $1`,
          ["address-int@phone.invalid"],
        );
        expect(workforce.rowCount).toBe(0);
      });
    });
  });

  it("denies Address operations without validated customer authentication", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      await expect(
        createOwnAddress(
          persistence,
          { kind: "customer", authUserId: "forged" },
          minimalAddressCreateInput(),
        ),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });

      await expect(
        getOwnAddress(
          persistence,
          { kind: "customer", authUserId: "forged" },
          "00000000-0000-4000-8000-000000000001",
        ),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
    });
  });
});
