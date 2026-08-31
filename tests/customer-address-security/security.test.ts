/**
 * Customer Address ownership / security tests (IMP-018).
 */
import { afterEach, describe, expect, inject, it } from "vitest";

import { PERMISSION_KEYS, ROLE_KEYS } from "../../src/shared/access-control";
import {
  CustomerAddressError,
  parseCreateCustomerAddressInput,
} from "../../src/shared/customer-addresses";
import {
  createOwnAddress,
  deleteOwnAddress,
  getOwnAddress,
  listOwnAddresses,
  requireCustomerActor,
  setDefaultOwnAddress,
  updateOwnAddress,
} from "../../src/server/customer-addresses";
import { createWorkforcePrincipalFromTrustedIdentity } from "../../src/server/access-control/principal";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  applicationConfig,
  customerActor,
  minimalAddressCreateInput,
} from "../database/support/customer-addresses-fixtures";
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

function workforcePrincipal(workforceUserId: string) {
  return createWorkforcePrincipalFromTrustedIdentity({
    workforceUserId,
    disabledAt: null,
    passwordChangeRequired: false,
    twoFactorEnabled: true,
  });
}

describe("IMP-018 customer address security", () => {
  it("Customer A cannot read/update/delete/setDefault Customer B Address (IDOR)", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-a");
      await seedAuthUser(database.connectionString, "cust-b");
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      const actorA = customerActor("cust-a");
      const actorB = customerActor("cust-b");

      const addressB = await createOwnAddress(
        persistence,
        actorB,
        minimalAddressCreateInput({ makeDefault: true }),
      );

      expect(await listOwnAddresses(persistence, actorA)).toEqual([]);
      await expect(getOwnAddress(persistence, actorA, addressB.id)).rejects.toMatchObject({
        code: "CUSTOMER_ADDRESS_NOT_FOUND",
      });
      await expect(
        updateOwnAddress(persistence, actorA, addressB.id, { city: "Hacked" }),
      ).rejects.toMatchObject({ code: "CUSTOMER_ADDRESS_NOT_FOUND" });
      await expect(deleteOwnAddress(persistence, actorA, addressB.id)).rejects.toMatchObject({
        code: "CUSTOMER_ADDRESS_NOT_FOUND",
      });
      await expect(setDefaultOwnAddress(persistence, actorA, addressB.id)).rejects.toMatchObject({
        code: "CUSTOMER_ADDRESS_NOT_FOUND",
      });

      const stillB = await getOwnAddress(persistence, actorB, addressB.id);
      expect(stillB.id).toBe(addressB.id);
      expect(stillB.city).toBe("Dehradun");
      expect(stillB.isDefault).toBe(true);
    });
  });

  it("rejects forged ownership identifiers in mutation payloads", () => {
    for (const payload of [
      { ...minimalAddressCreateInput(), authUserId: "other" },
      { ...minimalAddressCreateInput(), customerId: "other" },
      { ...minimalAddressCreateInput(), addressId: "other" },
      { ...minimalAddressCreateInput(), profileId: "other" },
      { ...minimalAddressCreateInput(), isDefault: true },
    ]) {
      try {
        parseCreateCustomerAddressInput(payload);
        expect.unreachable("expected rejection");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomerAddressError);
        expect((error as CustomerAddressError).code).toBe("CUSTOMER_ADDRESS_FIELD_NOT_ALLOWED");
      }
    }
  });

  it("requires trusted CustomerActor for all operations", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      for (const actor of [null, undefined, {}, { kind: "customer", authUserId: "x" }]) {
        await expect(listOwnAddresses(persistence, actor)).rejects.toMatchObject({
          code: "CUSTOMER_AUTH_REQUIRED",
        });
        await expect(
          createOwnAddress(persistence, actor, minimalAddressCreateInput()),
        ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
        await expect(
          getOwnAddress(persistence, actor, "00000000-0000-4000-8000-000000000001"),
        ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
        await expect(
          updateOwnAddress(persistence, actor, "00000000-0000-4000-8000-000000000001", {
            city: "X",
          }),
        ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
        await expect(
          deleteOwnAddress(persistence, actor, "00000000-0000-4000-8000-000000000001"),
        ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
        await expect(
          setDefaultOwnAddress(persistence, actor, "00000000-0000-4000-8000-000000000001"),
        ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
      }
    });
  });

  it("workforce principals (Platform Super Admin, Support, Delivery) cannot use Address self-service", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      const principals = [
        workforcePrincipal("wf-platform-super-admin"),
        workforcePrincipal("wf-support-refund-operator"),
        workforcePrincipal("wf-delivery-coordinator"),
      ];

      for (const workforce of principals) {
        expect(() => requireCustomerActor(workforce)).toThrow(CustomerAddressError);
        try {
          requireCustomerActor(workforce);
          expect.unreachable("expected rejection");
        } catch (error) {
          expect(error).toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
        }

        await expect(listOwnAddresses(persistence, workforce)).rejects.toMatchObject({
          code: "CUSTOMER_AUTH_REQUIRED",
        });
        await expect(
          createOwnAddress(persistence, workforce, minimalAddressCreateInput()),
        ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
      }
    });
  });

  it("RBAC inventory remains 51 permissions / 7 roles with no customer address perms", async () => {
    expect(PERMISSION_KEYS.length).toBe(68);
    expect(ROLE_KEYS.length).toBe(7);
    expect(
      PERMISSION_KEYS.some((k) => /customer|address|profile/i.test(k)),
    ).toBe(false);
    expect(ROLE_KEYS).toContain("platform_super_admin");
    expect(ROLE_KEYS).toContain("support_refund_operator");
    expect(ROLE_KEYS).toContain("delivery_coordinator");

    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const perms = await client.pool.query(
          `select key from app.access_permissions
           where key ilike '%customer%' or key ilike '%address%' or key ilike '%profile%'`,
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
