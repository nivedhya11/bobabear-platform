/**
 * PostgreSQL integration tests for Customer Addresses (IMP-018).
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, inject, it } from "vitest";

import { PERMISSION_KEYS, ROLE_KEYS } from "../../src/shared/access-control";
import {
  clearDefaultOwnAddress,
  createOwnAddress,
  deleteOwnAddress,
  listOwnAddresses,
  setDefaultOwnAddress,
} from "../../src/server/customer-addresses";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  applicationConfig,
  customerActor,
  minimalAddressCreateInput,
} from "./support/customer-addresses-fixtures";
import { withCustomerAddressRoleFixture } from "./support/customer-addresses-roles";
import { applyMigrations, withIsolatedTestDatabase, withTestDatabaseClient } from "./support/test-database";

const PRIOR_MIGRATION_HASHES: Record<string, string> = {
  "drizzle/0000_database-foundation.sql":
    "2c9481bca62dd1e856ff8083cb8bcbe9aa25558af78ba40810100c91cdaf99cc",
  "drizzle/0001_transactional_outbox_idempotency.sql":
    "cd5f3a04ff8fbdddcd42e96a7faf8ea7a21a115be1a442d41b09608c5d6a400b",
  "drizzle/0002_better_auth_foundation.sql":
    "c174449d444455d77150a87d60f807d0f7395a2694757086e7a0dcf9991a4a16",
  "drizzle/0003_customer_phone_otp_authentication.sql":
    "37d2e931728daa43dd2f4a085dd569b2c3e45d32810b128533ac34a065ab79b3",
  "drizzle/0004_workforce_authentication_mfa.sql":
    "bcf4ed284fd6ab96df865775e69c42e65e4a8326c96d63201dcb907c55968ddd",
  "drizzle/0005_organization_outlet_rbac_foundation.sql":
    "1dd73c239d1000e3c7b801d69f316474b315fec276e7728fdf1200ebac46b904",
  "drizzle/0006_canonical_catalog_model.sql":
    "db905b5ebe565950925bc96e3a84196897823a8fbb26eafe191a5639de1e4a71",
  "drizzle/0007_existing_menu_import.sql":
    "8b2cf7c95f42c2281efa281031904f0706280c7e7e2282ce64bc4c4ddf35a4d1",
  "drizzle/0008_assortment_operational_availability.sql":
    "89ad947be8ca5eeca85505cada57608a170beafbfb679b54aa478cf564754124",
  "drizzle/0009_pricing_charges_tax.sql":
    "c609d3fec7b47e23211414763d3ed5d42605eb379159cbae28e43c4a0fb7d3e1",
  "drizzle/0010_promotions_coupons.sql":
    "21a1ab243b11245a5f52468f755463740a8ab3b0cedd5bc6b339fb650974df81",
  "drizzle/0011_customer_profiles.sql":
    "5445146cf9cb3519474ac84a969edb97cd31e58b7d039eadc2e0f7b4bb54d7cb",
};

function sha256File(rel: string): string {
  return createHash("sha256")
    .update(readFileSync(path.join(process.cwd(), rel)))
    .digest("hex");
}

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
  phone: string | null = "+919876543210",
): Promise<void> {
  await withTestDatabaseClient(connectionString, async (client) => {
    await client.pool.query(
      `insert into app.customer_auth_users
        (id, name, email, email_verified, phone_number, phone_number_verified, created_at, updated_at)
       values ($1, 'Customer', $2, false, $3, $4, now(), now())`,
      [id, `${id}@example.test`, phone, phone ? true : null],
    );
  });
}

describe("IMP-018 customer addresses migration", () => {
  it("keeps 0000–0011 sealed, seals 0012, allows 0013–0015_checkout, totals 16 migrations", () => {
    const integrity = JSON.parse(
      readFileSync(path.join(process.cwd(), "drizzle/migration-integrity.json"), "utf8"),
    ) as { migrations: Array<{ path: string; sha256: string; tag: string }> };

    for (const [rel, expected] of Object.entries(PRIOR_MIGRATION_HASHES)) {
      expect(sha256File(rel)).toBe(expected);
      const entry = integrity.migrations.find((m) => m.path === rel);
      expect(entry).toBeDefined();
      expect(entry!.sha256).toBe(expected);
    }

    const entry = integrity.migrations.find(
      (m) => m.path === "drizzle/0012_customer_addresses.sql",
    );
    expect(entry).toBeDefined();
    expect(entry!.sha256).toBe(sha256File("drizzle/0012_customer_addresses.sql"));
    expect(integrity.migrations).toHaveLength(16);
    expect(integrity.migrations.some((m) => m.tag === "0013_serviceability")).toBe(true);
    expect(integrity.migrations.some((m) => m.tag === "0014_cart")).toBe(true);
    expect(integrity.migrations.some((m) => m.tag === "0015_checkout")).toBe(true);
  });

  it("creates exactly 2 address tables within 85 app tables, 51 permissions, 7 roles", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await applyMigrations(database.connectionString);

      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      await persistence.withContext(async (ctx) => {
        const addressTables = await ctx.db.execute(sql`
          select count(*)::text as count
          from information_schema.tables
          where table_schema = 'app'
            and table_name in ('customer_addresses', 'customer_address_audit_events')
        `);
        expect(addressTables.rows[0]?.count).toBe("2");

        const appTables = await ctx.db.execute(sql`
          select count(*)::text as count
          from information_schema.tables
          where table_schema = 'app' and table_type = 'BASE TABLE'
        `);
        expect(appTables.rows[0]?.count).toBe("85");

        const permissions = await ctx.db.execute(
          sql`select count(*)::text as count from app.access_permissions`,
        );
        expect(permissions.rows[0]?.count).toBe("51");
        expect(PERMISSION_KEYS.length).toBe(67);
        expect(ROLE_KEYS.length).toBe(7);

        const empty = await ctx.db.execute(sql`
          select
            (select count(*)::text from app.customer_addresses) as addresses,
            (select count(*)::text from app.customer_address_audit_events) as audits
        `);
        expect(empty.rows[0]?.addresses).toBe("0");
        expect(empty.rows[0]?.audits).toBe("0");
      });
    });
  });

  it("customer_addresses has only intended columns, no Profile FK, no forbidden categories", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const columns = await client.pool.query<{ column_name: string }>(
          `select column_name from information_schema.columns
           where table_schema = 'app' and table_name = 'customer_addresses'
           order by column_name`,
        );
        expect(columns.rows.map((r) => r.column_name)).toEqual([
          "address_line_1",
          "address_line_2",
          "city",
          "created_at",
          "customer_auth_user_id",
          "id",
          "is_default",
          "label",
          "landmark",
          "latitude",
          "locality",
          "longitude",
          "postal_code",
          "recipient_name",
          "recipient_phone",
          "state_code",
          "updated_at",
        ]);

        const forbidden = columns.rows.filter((r) =>
          /brand|outlet|territory|organization|profile|status|deleted|retired|serviceab|geocod|delivery_zone|country/i.test(
            r.column_name,
          ),
        );
        expect(forbidden).toEqual([]);

        const fks = await client.pool.query<{
          confrelid_name: string;
          confdeltype: string;
        }>(
          `select c.relname as confrelid_name, r.confdeltype
           from pg_constraint r
           join pg_class t on t.oid = r.conrelid
           join pg_namespace n on n.oid = t.relnamespace
           join pg_class c on c.oid = r.confrelid
           where n.nspname = 'app' and t.relname = 'customer_addresses' and r.contype = 'f'`,
        );
        expect(fks.rowCount).toBe(1);
        expect(fks.rows[0]?.confrelid_name).toBe("customer_auth_users");
        expect(fks.rows[0]?.confdeltype).toBe("r"); // RESTRICT

        const profileFk = await client.pool.query(
          `select 1 from pg_constraint r
           join pg_class t on t.oid = r.conrelid
           join pg_namespace n on n.oid = t.relnamespace
           join pg_class c on c.oid = r.confrelid
           where n.nspname = 'app' and t.relname = 'customer_addresses'
             and c.relname = 'customer_profiles'`,
        );
        expect(profileFk.rowCount).toBe(0);
      });
    });
  });

  it("allows multiple addresses, duplicates, partial unique default, and zero defaults", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-multi");
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);
      const actor = customerActor("cust-multi");

      const a = await createOwnAddress(persistence, actor, minimalAddressCreateInput());
      const b = await createOwnAddress(
        persistence,
        actor,
        minimalAddressCreateInput({ label: "Work" }),
      );
      // Exact duplicate content is allowed.
      const c = await createOwnAddress(persistence, actor, minimalAddressCreateInput());
      expect([a.id, b.id, c.id].length).toBe(3);
      expect((await listOwnAddresses(persistence, actor)).every((x) => !x.isDefault)).toBe(true);

      await setDefaultOwnAddress(persistence, actor, a.id);
      await expect(
        withTestDatabaseClient(database.connectionString, async (client) => {
          await client.pool.query(
            `update app.customer_addresses set is_default = true where id = $1`,
            [b.id],
          );
        }),
      ).rejects.toThrow(/unique|duplicate/i);

      await clearDefaultOwnAddress(persistence, actor);
      const list = await listOwnAddresses(persistence, actor);
      expect(list.every((x) => !x.isDefault)).toBe(true);
      expect(list).toHaveLength(3);
    });
  });

  it("different customers may each hold their own default Address", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-def-a");
      await seedAuthUser(database.connectionString, "cust-def-b", "+919811111111");
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      const addrA = await createOwnAddress(
        persistence,
        customerActor("cust-def-a"),
        minimalAddressCreateInput({ makeDefault: true }),
      );
      const addrB = await createOwnAddress(
        persistence,
        customerActor("cust-def-b"),
        minimalAddressCreateInput({
          recipientPhone: "9811111111",
          makeDefault: true,
        }),
      );
      expect(addrA.isDefault).toBe(true);
      expect(addrB.isDefault).toBe(true);

      await withTestDatabaseClient(database.connectionString, async (client) => {
        const defaults = await client.pool.query(
          `select customer_auth_user_id from app.customer_addresses where is_default = true order by customer_auth_user_id`,
        );
        expect(defaults.rows.map((r) => r.customer_auth_user_id)).toEqual([
          "cust-def-a",
          "cust-def-b",
        ]);
      });
    });
  });

  it("enforces coordinate pair/range/NUMERIC(10,7) and PIN constraints", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-coords");

      await withTestDatabaseClient(database.connectionString, async (client) => {
        const cols = await client.pool.query<{
          column_name: string;
          numeric_precision: number | null;
          numeric_scale: number | null;
        }>(
          `select column_name, numeric_precision, numeric_scale
           from information_schema.columns
           where table_schema = 'app' and table_name = 'customer_addresses'
             and column_name in ('latitude', 'longitude')
           order by column_name`,
        );
        expect(cols.rows).toEqual([
          { column_name: "latitude", numeric_precision: 10, numeric_scale: 7 },
          { column_name: "longitude", numeric_precision: 10, numeric_scale: 7 },
        ]);

        const base = {
          id: randomUUID(),
          user: "cust-coords",
        };

        await expect(
          client.pool.query(
            `insert into app.customer_addresses
              (id, customer_auth_user_id, recipient_name, recipient_phone, address_line_1,
               city, state_code, postal_code, latitude, longitude, is_default, created_at, updated_at)
             values ($1, $2, 'A', '+919876543210', 'Line', 'Dehradun', 'IN-UT', '248001',
                     30.3165000, null, false, now(), now())`,
            [base.id, base.user],
          ),
        ).rejects.toThrow();

        await expect(
          client.pool.query(
            `insert into app.customer_addresses
              (id, customer_auth_user_id, recipient_name, recipient_phone, address_line_1,
               city, state_code, postal_code, latitude, longitude, is_default, created_at, updated_at)
             values ($1, $2, 'A', '+919876543210', 'Line', 'Dehradun', 'IN-UT', '248001',
                     91.0000000, 78.0000000, false, now(), now())`,
            [randomUUID(), base.user],
          ),
        ).rejects.toThrow();

        await expect(
          client.pool.query(
            `insert into app.customer_addresses
              (id, customer_auth_user_id, recipient_name, recipient_phone, address_line_1,
               city, state_code, postal_code, is_default, created_at, updated_at)
             values ($1, $2, 'A', '+919876543210', 'Line', 'Dehradun', 'IN-UT', '048001',
                     false, now(), now())`,
            [randomUUID(), base.user],
          ),
        ).rejects.toThrow();

        await expect(
          client.pool.query(
            `insert into app.customer_addresses
              (id, customer_auth_user_id, recipient_name, recipient_phone, address_line_1,
               city, state_code, postal_code, is_default, created_at, updated_at)
             values ($1, $2, 'A', '+919876543210', 'Line', 'Dehradun', 'IN-UT', '24800',
                     false, now(), now())`,
            [randomUUID(), base.user],
          ),
        ).rejects.toThrow();

        await client.pool.query(
          `insert into app.customer_addresses
            (id, customer_auth_user_id, recipient_name, recipient_phone, address_line_1,
             city, state_code, postal_code, latitude, longitude, is_default, created_at, updated_at)
           values ($1, $2, 'A', '+919876543210', 'Line', 'Dehradun', 'IN-UT', '248001',
                   30.3165000, 78.0322000, false, now(), now())`,
          [randomUUID(), base.user],
        );
      });
    });
  });

  it("RESTRICT prevents deleting auth user that owns an Address", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-restrict");
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      await createOwnAddress(
        persistence,
        customerActor("cust-restrict"),
        minimalAddressCreateInput(),
      );

      await withTestDatabaseClient(database.connectionString, async (client) => {
        await expect(
          client.pool.query(`delete from app.customer_auth_users where id = 'cust-restrict'`),
        ).rejects.toThrow(/foreign key|restrict|violates/i);
      });
    });
  });

  it("audit survives Address hard deletion, has no live Address FK, and is append-only", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-audit");
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);
      const actor = customerActor("cust-audit");

      const created = await createOwnAddress(
        persistence,
        actor,
        minimalAddressCreateInput({ makeDefault: true }),
      );
      await deleteOwnAddress(persistence, actor, created.id);

      await withTestDatabaseClient(database.connectionString, async (client) => {
        const addresses = await client.pool.query(`select id from app.customer_addresses`);
        expect(addresses.rowCount).toBe(0);

        const auditFks = await client.pool.query(
          `select 1 from pg_constraint r
           join pg_class t on t.oid = r.conrelid
           join pg_namespace n on n.oid = t.relnamespace
           where n.nspname = 'app' and t.relname = 'customer_address_audit_events'
             and r.contype = 'f'`,
        );
        expect(auditFks.rowCount).toBe(0);

        const audits = await client.pool.query<{
          action: string;
          affected_fields: unknown;
          address_id: string;
        }>(
          `select action, affected_fields, address_id
           from app.customer_address_audit_events order by occurred_at`,
        );
        expect(audits.rows.map((r) => r.action)).toEqual([
          "address_created",
          "address_default_set",
          "address_deleted",
          "address_default_cleared",
        ]);
        expect(audits.rows[0]?.address_id).toBe(created.id);
        const serialized = JSON.stringify(audits.rows);
        expect(serialized).not.toMatch(/Ashutosh|Flat 204|\+919876543210|248001/i);

        const auditColumns = await client.pool.query<{ column_name: string }>(
          `select column_name from information_schema.columns
           where table_schema = 'app' and table_name = 'customer_address_audit_events'
           order by column_name`,
        );
        expect(auditColumns.rows.map((r) => r.column_name)).toEqual([
          "action",
          "actor_id",
          "actor_kind",
          "address_id",
          "affected_fields",
          "customer_auth_user_id",
          "id",
          "occurred_at",
          "previous_default_address_id",
        ]);
      });

      await withCustomerAddressRoleFixture(
        database.databaseName,
        database.connectionString,
        async (fixture) => {
          await withTestDatabaseClient(fixture.applicationConnectionString, async (client) => {
            await client.pool.query(
              `insert into app.customer_address_audit_events
                (id, occurred_at, actor_kind, actor_id, address_id, customer_auth_user_id, action, affected_fields)
               values ($1, now(), 'customer', 'cust-audit', $2, 'cust-audit', 'address_created', '[]'::jsonb)`,
              [randomUUID(), randomUUID()],
            );
            await expect(
              client.pool.query(
                `update app.customer_address_audit_events set action = 'address_updated'`,
              ),
            ).rejects.toThrow(/permission denied/i);
            await expect(
              client.pool.query(`delete from app.customer_address_audit_events`),
            ).rejects.toThrow(/permission denied/i);
          });
        },
      );
    });
  });

  it("migration seeds no business Address rows", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const addresses = await client.pool.query(`select count(*)::int as c from app.customer_addresses`);
        const audits = await client.pool.query(
          `select count(*)::int as c from app.customer_address_audit_events`,
        );
        expect(addresses.rows[0]?.c).toBe(0);
        expect(audits.rows[0]?.c).toBe(0);
      });

      const sqlText = readFileSync(
        path.join(process.cwd(), "drizzle/0012_customer_addresses.sql"),
        "utf8",
      );
      expect(sqlText).not.toMatch(/Ashutosh|Demo Address|248001|INSERT INTO/i);
    });
  });
});
