/**
 * Customer Address concurrency hard-gate tests (IMP-018).
 *
 * Uses real concurrent transactions via Promise.all. PostgreSQL serializes on the
 * per-customer FOR UPDATE lock acquired first in every Address write transaction.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, inject, it } from "vitest";

import {
  createOwnAddress,
  deleteOwnAddress,
  getOwnAddress,
  listOwnAddresses,
  lockCustomerAuthUserForAddressMutation,
  setDefaultOwnAddress,
  updateOwnAddress,
} from "../../src/server/customer-addresses";
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

async function seedAuthUser(
  connectionString: string,
  id: string,
  phone = "+919876543210",
): Promise<void> {
  await withTestDatabaseClient(connectionString, async (client) => {
    await client.pool.query(
      `insert into app.customer_auth_users
        (id, name, email, email_verified, phone_number, phone_number_verified, created_at, updated_at)
       values ($1, 'Customer', $2, false, $3, true, now(), now())`,
      [id, `${id}@example.test`, phone],
    );
  });
}

function dualPersistence(connectionString: string) {
  const a = getApplicationPersistence(applicationConfig(connectionString));
  const b = getApplicationPersistence(applicationConfig(connectionString));
  openHandles.push(a, b);
  return { a, b };
}

describe("IMP-018 customer address concurrency", () => {
  it("lock order places customer auth-user FOR UPDATE first in every write path", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/server/customer-addresses/addresses.ts"),
      "utf8",
    );
    for (const fn of [
      "createOwnAddress",
      "updateOwnAddress",
      "deleteOwnAddress",
      "setDefaultOwnAddress",
      "clearDefaultOwnAddress",
    ]) {
      const idx = source.indexOf(`export async function ${fn}`);
      expect(idx).toBeGreaterThanOrEqual(0);
      const bodyStart = source.indexOf("{", idx);
      const lockIdx = source.indexOf("lockCustomerAuthUserForAddressMutation", bodyStart);
      const nextExport = source.indexOf("\nexport async function ", bodyStart + 1);
      const end = nextExport === -1 ? source.length : nextExport;
      expect(lockIdx).toBeGreaterThan(bodyStart);
      expect(lockIdx).toBeLessThan(end);

      const beforeLock = source.slice(bodyStart, lockIdx);
      expect(beforeLock).not.toMatch(
        /insertCustomerAddress|updateCustomerAddress|deleteCustomerAddress|findAddressRow|findDefaultAddress/,
      );
    }
    expect(typeof lockCustomerAuthUserForAddressMutation).toBe("function");
  });

  it("concurrent setDefault A/B yields exactly one default", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-race-default");
      const { a, b } = dualPersistence(database.connectionString);
      const actor = customerActor("cust-race-default");

      const addrA = await createOwnAddress(a, actor, minimalAddressCreateInput({ label: "A" }));
      const addrB = await createOwnAddress(b, actor, minimalAddressCreateInput({ label: "B" }));

      const results = await Promise.allSettled([
        setDefaultOwnAddress(a, actor, addrA.id),
        setDefaultOwnAddress(b, actor, addrB.id),
      ]);
      expect(results.every((r) => r.status === "fulfilled")).toBe(true);

      const list = await listOwnAddresses(a, actor);
      expect(list.filter((x) => x.isDefault)).toHaveLength(1);

      await withTestDatabaseClient(database.connectionString, async (client) => {
        const defaults = await client.pool.query(
          `select id from app.customer_addresses where is_default = true`,
        );
        expect(defaults.rowCount).toBe(1);
      });
    });
  });

  it("concurrent create makeDefault creates both addresses with exactly one default", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-race-create");
      const { a, b } = dualPersistence(database.connectionString);
      const actor = customerActor("cust-race-create");

      const results = await Promise.allSettled([
        createOwnAddress(
          a,
          actor,
          minimalAddressCreateInput({ label: "A", makeDefault: true, addressLine1: "One" }),
        ),
        createOwnAddress(
          b,
          actor,
          minimalAddressCreateInput({ label: "B", makeDefault: true, addressLine1: "Two" }),
        ),
      ]);

      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
      const list = await listOwnAddresses(a, actor);
      expect(list).toHaveLength(2);
      expect(list.filter((x) => x.isDefault)).toHaveLength(1);
    });
  });

  it("delete vs setDefault on the same address serializes to a valid end state", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-race-same");
      const { a, b } = dualPersistence(database.connectionString);
      const actor = customerActor("cust-race-same");

      const target = await createOwnAddress(a, actor, minimalAddressCreateInput({ label: "T" }));

      const results = await Promise.allSettled([
        deleteOwnAddress(a, actor, target.id),
        setDefaultOwnAddress(b, actor, target.id),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      expect(fulfilled.length + rejected.length).toBe(2);
      expect(fulfilled.length).toBeGreaterThanOrEqual(1);

      const list = await listOwnAddresses(a, actor);
      if (list.length === 0) {
        expect(rejected).toHaveLength(1);
        expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
          code: "CUSTOMER_ADDRESS_NOT_FOUND",
        });
      } else {
        expect(list).toHaveLength(1);
        expect(list[0]?.id).toBe(target.id);
        expect(list[0]?.isDefault).toBe(true);
      }
    });
  });

  it("delete default vs setDefault other serializes to a valid end state", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-race-swap");
      const { a, b } = dualPersistence(database.connectionString);
      const actor = customerActor("cust-race-swap");

      const def = await createOwnAddress(
        a,
        actor,
        minimalAddressCreateInput({ label: "Def", makeDefault: true, addressLine1: "Default" }),
      );
      const other = await createOwnAddress(
        a,
        actor,
        minimalAddressCreateInput({ label: "Other", addressLine1: "Other" }),
      );

      await Promise.allSettled([
        deleteOwnAddress(a, actor, def.id),
        setDefaultOwnAddress(b, actor, other.id),
      ]);

      const list = await listOwnAddresses(a, actor);
      expect(list.filter((x) => x.isDefault)).toHaveLength(
        list.some((x) => x.isDefault) ? 1 : 0,
      );
      // Either: only other remains (possibly default), or both remain with at most one default.
      expect(list.length === 1 || list.length === 2).toBe(true);
      if (list.length === 1) {
        expect(list[0]?.id).toBe(other.id);
      } else {
        expect(list.map((x) => x.id).sort()).toEqual([def.id, other.id].sort());
      }
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const d = await client.pool.query(
          `select count(*)::int as c from app.customer_addresses where is_default = true`,
        );
        expect(d.rows[0]?.c).toBeLessThanOrEqual(1);
      });
    });
  });

  it("update vs delete serializes to a valid end state", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-race-upd");
      const { a, b } = dualPersistence(database.connectionString);
      const actor = customerActor("cust-race-upd");

      const target = await createOwnAddress(a, actor, minimalAddressCreateInput());

      const results = await Promise.allSettled([
        updateOwnAddress(a, actor, target.id, { city: "Mussoorie" }),
        deleteOwnAddress(b, actor, target.id),
      ]);

      expect(results.filter((r) => r.status === "fulfilled").length).toBeGreaterThanOrEqual(1);
      const list = await listOwnAddresses(a, actor);
      if (list.length === 0) {
        await expect(getOwnAddress(a, actor, target.id)).rejects.toMatchObject({
          code: "CUSTOMER_ADDRESS_NOT_FOUND",
        });
      } else {
        expect(list).toHaveLength(1);
        expect(list[0]?.city).toBe("Mussoorie");
      }
    });
  });

  it("different customers are not globally serialized", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-race-x", "+919811111111");
      await seedAuthUser(database.connectionString, "cust-race-y", "+919822222222");
      const { a, b } = dualPersistence(database.connectionString);
      const actorX = customerActor("cust-race-x");
      const actorY = customerActor("cust-race-y");

      const started = Date.now();
      const [x, y] = await Promise.all([
        createOwnAddress(
          a,
          actorX,
          minimalAddressCreateInput({
            recipientPhone: "9811111111",
            makeDefault: true,
            addressLine1: "X-1",
          }),
        ),
        createOwnAddress(
          b,
          actorY,
          minimalAddressCreateInput({
            recipientPhone: "9822222222",
            makeDefault: true,
            addressLine1: "Y-1",
          }),
        ),
      ]);
      const elapsed = Date.now() - started;

      expect(x.isDefault).toBe(true);
      expect(y.isDefault).toBe(true);
      expect(x.id).not.toBe(y.id);
      // Parallel customer locks should complete quickly (not multi-second serialized waits).
      expect(elapsed).toBeLessThan(15_000);

      await withTestDatabaseClient(database.connectionString, async (client) => {
        const defaults = await client.pool.query(
          `select customer_auth_user_id from app.customer_addresses where is_default = true
           order by customer_auth_user_id`,
        );
        expect(defaults.rows.map((r) => r.customer_auth_user_id)).toEqual([
          "cust-race-x",
          "cust-race-y",
        ]);
      });
    });
  });
});
