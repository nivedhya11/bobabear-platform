/**
 * Customer Profile ownership / security tests (IMP-017).
 */
import { afterEach, describe, expect, inject, it } from "vitest";

import { PERMISSION_KEYS, ROLE_KEYS } from "../../src/shared/access-control";
import { CustomerProfileError, parseCreateCustomerProfileInput } from "../../src/shared/customer-profiles";
import {
  createOwnCustomerProfile,
  deleteOwnCustomerProfile,
  getOwnCustomerProfile,
  updateOwnCustomerProfile,
} from "../../src/server/customer-profiles";
import { createWorkforcePrincipalFromTrustedIdentity } from "../../src/server/access-control/principal";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  applicationConfig,
  customerActor,
} from "../database/support/customer-profiles-fixtures";
import { applyMigrations, withIsolatedTestDatabase, withTestDatabaseClient } from "../database/support/test-database";

function adminConnectionInfo() {
  return {
    connectionString: inject("bobaBearTestAdminConnectionString"),
    host: inject("bobaBearTestAdminHost"),
    port: inject("bobaBearTestAdminPort"),
  };
}

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
});

async function seedAuthUser(connectionString: string, id: string) {
  await withTestDatabaseClient(connectionString, async (client) => {
    await client.pool.query(
      `insert into app.customer_auth_users
        (id, name, email, email_verified, phone_number, phone_number_verified, created_at, updated_at)
       values ($1, 'Customer', $2, false, null, null, now(), now())`,
      [id, `${id}@example.test`],
    );
  });
}

describe("IMP-017 customer profile security", () => {
  it("Customer A cannot read/update/delete Customer B Profile", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-a");
      await seedAuthUser(database.connectionString, "cust-b");
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      const actorA = customerActor("cust-a");
      const actorB = customerActor("cust-b");

      const profileB = await createOwnCustomerProfile(persistence, actorB, {
        givenName: "Bee",
        email: "bee@example.com",
      });

      expect(await getOwnCustomerProfile(persistence, actorA)).toBeNull();
      await expect(
        updateOwnCustomerProfile(persistence, actorA, { givenName: "Hacked" }),
      ).rejects.toMatchObject({ code: "CUSTOMER_PROFILE_NOT_FOUND" });
      await expect(deleteOwnCustomerProfile(persistence, actorA)).rejects.toMatchObject({
        code: "CUSTOMER_PROFILE_NOT_FOUND",
      });

      const stillB = await getOwnCustomerProfile(persistence, actorB);
      expect(stillB?.id).toBe(profileB.id);
      expect(stillB?.givenName).toBe("Bee");
    });
  });

  it("rejects forged ownership identifiers in mutation payloads", () => {
    for (const payload of [
      { givenName: "A", authUserId: "other" },
      { givenName: "A", customerId: "other" },
      { givenName: "A", profileId: "other" },
      { givenName: "A", phone: "+919999999999" },
    ]) {
      try {
        parseCreateCustomerProfileInput(payload);
        expect.unreachable("expected rejection");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomerProfileError);
        expect((error as CustomerProfileError).code).toBe(
          "CUSTOMER_PROFILE_FIELD_NOT_ALLOWED",
        );
      }
    }
  });

  it("requires trusted CustomerActor for all operations", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      for (const actor of [null, undefined, {}, { kind: "customer", authUserId: "x" }]) {
        await expect(getOwnCustomerProfile(persistence, actor)).rejects.toMatchObject({
          code: "CUSTOMER_AUTH_REQUIRED",
        });
        await expect(
          createOwnCustomerProfile(persistence, actor, { givenName: "A" }),
        ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
        await expect(
          updateOwnCustomerProfile(persistence, actor, { givenName: "A" }),
        ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
        await expect(deleteOwnCustomerProfile(persistence, actor)).rejects.toMatchObject({
          code: "CUSTOMER_AUTH_REQUIRED",
        });
      }
    });
  });

  it("workforce principals cannot satisfy customer self-service authorization", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      const workforce = createWorkforcePrincipalFromTrustedIdentity({
        workforceUserId: "wf-super-admin",
        disabledAt: null,
        passwordChangeRequired: false,
        twoFactorEnabled: true,
      });

      await expect(getOwnCustomerProfile(persistence, workforce)).rejects.toMatchObject({
        code: "CUSTOMER_AUTH_REQUIRED",
      });
      await expect(
        createOwnCustomerProfile(persistence, workforce, { givenName: "Nope" }),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
    });
  });

  it("RBAC inventory remains 51 permissions / 7 roles with no customer profile perms", async () => {
    expect(PERMISSION_KEYS.length).toBe(68);
    expect(ROLE_KEYS.length).toBe(7);
    expect(
      PERMISSION_KEYS.some((k) => /customer|profile/i.test(k)),
    ).toBe(false);

    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const perms = await client.pool.query(
          `select key from app.access_permissions where key ilike '%customer%' or key ilike '%profile%'`,
        );
        expect(perms.rowCount).toBe(0);
        const count = await client.pool.query(
          `select count(*)::int as c from app.access_permissions`,
        );
        expect(count.rows[0]?.c).toBe(68);
        const roles = await client.pool.query(`select count(*)::int as c from app.access_roles`);
        expect(roles.rows[0]?.c).toBe(7);
      });
    });
  });
});
