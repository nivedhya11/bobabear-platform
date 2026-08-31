/**
 * PostgreSQL integration tests for Customer Profiles (IMP-017).
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, inject, it } from "vitest";

import { PERMISSION_KEYS, ROLE_KEYS } from "../../src/shared/access-control";
import { CustomerProfileError } from "../../src/shared/customer-profiles";
import {
  createOwnCustomerProfile,
  deleteOwnCustomerProfile,
  getOwnCustomerProfile,
  updateOwnCustomerProfile,
} from "../../src/server/customer-profiles";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  applicationConfig,
  customerActor,
} from "./support/customer-profiles-fixtures";
import { withCustomerProfileRoleFixture } from "./support/customer-profiles-roles";
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

describe("IMP-017 customer profiles migration", () => {
  it("keeps 0000–0010 sealed, seals 0011, and allows IMP-018 0012 only", () => {
    const integrity = JSON.parse(
      readFileSync(path.join(process.cwd(), "drizzle/migration-integrity.json"), "utf8"),
    ) as { migrations: Array<{ path: string; sha256: string; tag: string }> };

    for (const [rel, expected] of Object.entries(PRIOR_MIGRATION_HASHES)) {
      if (rel === "drizzle/0010_promotions_coupons.sql") {
        const entry = integrity.migrations.find((m) => m.path === rel);
        expect(entry).toBeDefined();
        expect(sha256File(rel)).toBe(entry!.sha256);
        continue;
      }
      expect(sha256File(rel)).toBe(expected);
    }

    const entry = integrity.migrations.find(
      (m) => m.path === "drizzle/0011_customer_profiles.sql",
    );
    expect(entry).toBeDefined();
    expect(entry!.sha256).toBe(sha256File("drizzle/0011_customer_profiles.sql"));
    expect(integrity.migrations.length).toBeGreaterThanOrEqual(12);
    const tags0012 = integrity.migrations.filter((m) => m.tag.startsWith("0012_"));
    expect(tags0012.length).toBeLessThanOrEqual(1);
    if (tags0012.length === 1) {
      expect(tags0012[0]?.tag).toBe("0012_customer_addresses");
    }
    expect(integrity.migrations.some((m) => m.tag === "0013_serviceability")).toBe(true);
    expect(integrity.migrations.some((m) => m.tag === "0014_cart")).toBe(true);
    expect(integrity.migrations.some((m) => m.tag === "0015_checkout")).toBe(true);
    expect(integrity.migrations).toHaveLength(16);
  });

  it("creates exactly 2 profile tables within the current app table inventory, 51 permissions, 7 roles", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await applyMigrations(database.connectionString);

      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      await persistence.withContext(async (ctx) => {
        const profileTables = await ctx.db.execute(sql`
          select count(*)::text as count
          from information_schema.tables
          where table_schema = 'app'
            and table_name in ('customer_profiles', 'customer_profile_audit_events')
        `);
        expect(profileTables.rows[0]?.count).toBe("2");

        const appTables = await ctx.db.execute(sql`
          select count(*)::text as count
          from information_schema.tables
          where table_schema = 'app' and table_type = 'BASE TABLE'
        `);
        expect(Number(appTables.rows[0]?.count)).toBeGreaterThanOrEqual(65);

        const permissions = await ctx.db.execute(
          sql`select count(*)::text as count from app.access_permissions`,
        );
        expect(permissions.rows[0]?.count).toBe("51");
        expect(PERMISSION_KEYS.length).toBe(68);
        expect(ROLE_KEYS.length).toBe(7);

        const empty = await ctx.db.execute(sql`
          select
            (select count(*)::text from app.customer_profiles) as profiles,
            (select count(*)::text from app.customer_profile_audit_events) as audits
        `);
        expect(empty.rows[0]?.profiles).toBe("0");
        expect(empty.rows[0]?.audits).toBe("0");
      });
    });
  });

  it("customer_profiles has only intended columns and no forbidden categories", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const columns = await client.pool.query<{ column_name: string }>(
          `select column_name from information_schema.columns
           where table_schema = 'app' and table_name = 'customer_profiles'
           order by column_name`,
        );
        expect(columns.rows.map((r) => r.column_name)).toEqual([
          "created_at",
          "customer_auth_user_id",
          "email",
          "family_name",
          "given_name",
          "id",
          "updated_at",
        ]);

        const forbidden = columns.rows.filter((r) =>
          /phone|brand|outlet|territory|organization|status|deleted|retired|verified|consent|loyalty|address|serviceab/i.test(
            r.column_name,
          ),
        );
        expect(forbidden).toEqual([]);
      });
    });
  });

  it("enforces UNIQUE(customer_auth_user_id) and FK to customer_auth_users", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-a");

      await withTestDatabaseClient(database.connectionString, async (client) => {
        const id1 = randomUUID();
        const id2 = randomUUID();
        await client.pool.query(
          `insert into app.customer_profiles
            (id, customer_auth_user_id, given_name, family_name, email, created_at, updated_at)
           values ($1, 'cust-a', 'Ashutosh', null, null, now(), now())`,
          [id1],
        );
        await expect(
          client.pool.query(
            `insert into app.customer_profiles
              (id, customer_auth_user_id, given_name, family_name, email, created_at, updated_at)
             values ($1, 'cust-a', 'Other', null, null, now(), now())`,
            [id2],
          ),
        ).rejects.toThrow(/unique|duplicate/i);

        await expect(
          client.pool.query(
            `insert into app.customer_profiles
              (id, customer_auth_user_id, given_name, family_name, email, created_at, updated_at)
             values ($1, 'missing-user', 'X', null, null, now(), now())`,
            [randomUUID()],
          ),
        ).rejects.toThrow(/foreign key|violates/i);
      });
    });
  });

  it("RESTRICT prevents deleting auth user that owns a Profile", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-restrict");
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      await createOwnCustomerProfile(persistence, customerActor("cust-restrict"), {
        givenName: "Ashutosh",
      });

      await withTestDatabaseClient(database.connectionString, async (client) => {
        await expect(
          client.pool.query(`delete from app.customer_auth_users where id = 'cust-restrict'`),
        ).rejects.toThrow(/foreign key|restrict|violates/i);
      });
    });
  });

  it("supports lazy creation: auth user without Profile", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-lazy");
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      const profile = await getOwnCustomerProfile(persistence, customerActor("cust-lazy"));
      expect(profile).toBeNull();

      await withTestDatabaseClient(database.connectionString, async (client) => {
        const auth = await client.pool.query(
          `select id from app.customer_auth_users where id = 'cust-lazy'`,
        );
        expect(auth.rowCount).toBe(1);
        const profiles = await client.pool.query(`select id from app.customer_profiles`);
        expect(profiles.rowCount).toBe(0);
      });
    });
  });

  it("enforces given_name / family_name / email structural constraints", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-constraints");

      await withTestDatabaseClient(database.connectionString, async (client) => {
        await expect(
          client.pool.query(
            `insert into app.customer_profiles
              (id, customer_auth_user_id, given_name, created_at, updated_at)
             values ($1, 'cust-constraints', '', now(), now())`,
            [randomUUID()],
          ),
        ).rejects.toThrow();

        await expect(
          client.pool.query(
            `insert into app.customer_profiles
              (id, customer_auth_user_id, given_name, family_name, created_at, updated_at)
             values ($1, 'cust-constraints', 'Ok', '', now(), now())`,
            [randomUUID()],
          ),
        ).rejects.toThrow();

        const longEmail = `${"a".repeat(250)}@x.com`;
        await expect(
          client.pool.query(
            `insert into app.customer_profiles
              (id, customer_auth_user_id, given_name, email, created_at, updated_at)
             values ($1, 'cust-constraints', 'Ok', $2, now(), now())`,
            [randomUUID(), longEmail],
          ),
        ).rejects.toThrow();
      });
    });
  });

  it("audit survives Profile hard deletion and is append-only for app-shaped role", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-audit");
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);
      const actor = customerActor("cust-audit");

      const created = await createOwnCustomerProfile(persistence, actor, {
        givenName: "Ashutosh",
        email: "a@example.com",
      });
      await deleteOwnCustomerProfile(persistence, actor);

      await withTestDatabaseClient(database.connectionString, async (client) => {
        const profiles = await client.pool.query(`select id from app.customer_profiles`);
        expect(profiles.rowCount).toBe(0);
        const audits = await client.pool.query<{
          action: string;
          affected_fields: unknown;
          profile_id: string;
        }>(
          `select action, affected_fields, profile_id from app.customer_profile_audit_events order by occurred_at`,
        );
        expect(audits.rows.map((r) => r.action)).toEqual([
          "profile_created",
          "profile_deleted",
        ]);
        expect(audits.rows[0]?.profile_id).toBe(created.id);
        const serialized = JSON.stringify(audits.rows);
        expect(serialized).not.toMatch(/Ashutosh|a@example\.com/i);
      });

      await withCustomerProfileRoleFixture(
        database.databaseName,
        database.connectionString,
        async (fixture) => {
          await withTestDatabaseClient(fixture.applicationConnectionString, async (client) => {
            await client.pool.query(
              `insert into app.customer_profile_audit_events
                (id, occurred_at, actor_kind, actor_id, profile_id, customer_auth_user_id, action, affected_fields)
               values ($1, now(), 'customer', 'cust-audit', $2, 'cust-audit', 'profile_created', '[]'::jsonb)`,
              [randomUUID(), randomUUID()],
            );
            await expect(
              client.pool.query(
                `update app.customer_profile_audit_events set action = 'profile_updated'`,
              ),
            ).rejects.toThrow(/permission denied/i);
            await expect(
              client.pool.query(`delete from app.customer_profile_audit_events`),
            ).rejects.toThrow(/permission denied/i);
          });
        },
      );
    });
  });

  it("concurrent create is race-safe via UNIQUE constraint", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-race");
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);
      const actor = customerActor("cust-race");

      const results = await Promise.allSettled([
        createOwnCustomerProfile(persistence, actor, { givenName: "One" }),
        createOwnCustomerProfile(persistence, actor, { givenName: "Two" }),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(CustomerProfileError);
      expect(((rejected[0] as PromiseRejectedResult).reason as CustomerProfileError).code).toBe(
        "CUSTOMER_PROFILE_ALREADY_EXISTS",
      );

      await withTestDatabaseClient(database.connectionString, async (client) => {
        const profiles = await client.pool.query(`select id from app.customer_profiles`);
        expect(profiles.rowCount).toBe(1);
        const audits = await client.pool.query(
          `select id from app.customer_profile_audit_events where action = 'profile_created'`,
        );
        expect(audits.rowCount).toBe(1);
      });
    });
  });
});
