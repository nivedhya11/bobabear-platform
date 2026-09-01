/**
 * PostgreSQL integration tests for Serviceability schema (IMP-019).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, inject, it } from "vitest";

import { PERMISSION_KEYS, ROLE_KEYS } from "../../src/shared/access-control";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  applicationConfig,
  closeTrackedPersistenceHandles,
  trackPersistenceHandle,
} from "./support/serviceability-fixtures";
import {
  createEligibleWorkforceUser,
  seedBrandTree,
} from "./support/access-control-fixtures";
import { applyMigrations, withIsolatedTestDatabase } from "./support/test-database";

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
  "drizzle/0012_customer_addresses.sql":
    "6a9318ab7841ef4be7f2768a399c26e221d19d0b1836c74a975a694385c0ee73",
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

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-019 serviceability migration", () => {
  it("keeps 0000–0012 sealed, seals 0013, includes 0035 distance policy migration", () => {
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
      (m) => m.path === "drizzle/0013_serviceability.sql",
    );
    expect(entry).toBeDefined();
    expect(entry!.sha256).toBe(sha256File("drizzle/0013_serviceability.sql"));
    const cartEntry = integrity.migrations.find(
      (m) => m.path === "drizzle/0014_cart.sql",
    );
    expect(cartEntry).toBeDefined();
    expect(cartEntry!.sha256).toBe(sha256File("drizzle/0014_cart.sql"));
    expect(
      integrity.migrations.find((m) => m.path === "drizzle/0015_checkout.sql"),
    ).toBeDefined();
    const distancePolicyEntry = integrity.migrations.find(
      (m) => m.path === "drizzle/0035_serviceability_distance_policy.sql",
    );
    expect(distancePolicyEntry).toBeDefined();
    expect(distancePolicyEntry!.sha256).toBe(
      sha256File("drizzle/0035_serviceability_distance_policy.sql"),
    );
  });

  it("creates exactly 3 serviceability tables with distance-policy columns", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await applyMigrations(database.connectionString);

      const persistence = getApplicationPersistence(
        applicationConfig(database.connectionString),
      );
      trackPersistenceHandle(persistence);

      await persistence.withContext(async (ctx) => {
        const svcTables = await ctx.db.execute(sql`
          select count(*)::text as count
          from information_schema.tables
          where table_schema = 'app'
            and table_name in (
              'outlet_serviceability_configs',
              'outlet_serviceability_pins',
              'outlet_serviceability_audit_events'
            )
        `);
        expect(svcTables.rows[0]?.count).toBe("3");

        const appTables = await ctx.db.execute(sql`
          select count(*)::text as count
          from information_schema.tables
          where table_schema = 'app' and table_type = 'BASE TABLE'
        `);
        expect(Number(appTables.rows[0]?.count)).toBeGreaterThanOrEqual(85);

        const permissions = await ctx.db.execute(
          sql`select count(*)::text as count from app.access_permissions`,
        );
        expect(Number(permissions.rows[0]?.count)).toBeGreaterThanOrEqual(51);
        expect(PERMISSION_KEYS.length).toBeGreaterThanOrEqual(68);
        expect(ROLE_KEYS.length).toBe(7);

        const empty = await ctx.db.execute(sql`
          select
            (select count(*)::text from app.outlet_serviceability_configs) as configs,
            (select count(*)::text from app.outlet_serviceability_pins) as pins,
            (select count(*)::text from app.outlet_serviceability_audit_events) as audits
        `);
        expect(empty.rows[0]?.configs).toBe("0");
        expect(empty.rows[0]?.pins).toBe("0");
        expect(empty.rows[0]?.audits).toBe("0");

        const newPerms = await ctx.db.execute(sql`
          select key from app.access_permissions
          where key in ('serviceability.read', 'serviceability.manage')
          order by key
        `);
        expect(newPerms.rows.map((r) => r.key)).toEqual([
          "serviceability.manage",
          "serviceability.read",
        ]);
      });
    });
  });

  it("enforces one config per outlet, positive priority/revision, real outlet FK", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(
        applicationConfig(database.connectionString),
      );
      trackPersistenceHandle(persistence);

      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "scfg"));

      await persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          insert into app.outlet_serviceability_configs (outlet_id, routing_priority, revision)
          values (${tree.outletA.id}::uuid, 10, 1)
        `);
        await ctx.db.execute(sql`
          insert into app.outlet_serviceability_configs (outlet_id, routing_priority, revision)
          values (${tree.outletB.id}::uuid, 10, 1)
        `);

        await expect(
          ctx.db.execute(sql`
            insert into app.outlet_serviceability_configs (outlet_id, routing_priority, revision)
            values (${tree.outletA.id}::uuid, 5, 1)
          `),
        ).rejects.toThrow();

        await expect(
          ctx.db.execute(sql`
            insert into app.outlet_serviceability_configs (outlet_id, routing_priority, revision)
            values ('00000000-0000-4000-8000-000000000099'::uuid, 1, 1)
          `),
        ).rejects.toThrow();

        await expect(
          ctx.db.execute(sql`
            insert into app.outlet_serviceability_configs (outlet_id, routing_priority, revision)
            values (${tree.outletA.id}::uuid, 0, 1)
          `),
        ).rejects.toThrow();

        await expect(
          ctx.db.execute(sql`
            update app.outlet_serviceability_configs
            set revision = 0 where outlet_id = ${tree.outletA.id}::uuid
          `),
        ).rejects.toThrow();
      });
    });
  });

  it("PIN text check, composite PK, multi-outlet same PIN, config FK, empty coverage valid", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(
        applicationConfig(database.connectionString),
      );
      trackPersistenceHandle(persistence);

      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "spin"));

      await persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          insert into app.outlet_serviceability_configs (outlet_id, routing_priority, revision)
          values
            (${tree.outletA.id}::uuid, 1, 1),
            (${tree.outletB.id}::uuid, 2, 1)
        `);

        // Empty coverage (config without pins) is valid.
        const pinCount = await ctx.db.execute(sql`
          select count(*)::text as c from app.outlet_serviceability_pins
          where outlet_id = ${tree.outletA.id}::uuid
        `);
        expect(pinCount.rows[0]?.c).toBe("0");

        await ctx.db.execute(sql`
          insert into app.outlet_serviceability_pins (outlet_id, postal_code)
          values
            (${tree.outletA.id}::uuid, '248001'),
            (${tree.outletB.id}::uuid, '248001')
        `);

        await expect(
          ctx.db.execute(sql`
            insert into app.outlet_serviceability_pins (outlet_id, postal_code)
            values (${tree.outletA.id}::uuid, '248001')
          `),
        ).rejects.toThrow();

        await expect(
          ctx.db.execute(sql`
            insert into app.outlet_serviceability_pins (outlet_id, postal_code)
            values (${tree.outletA.id}::uuid, '048001')
          `),
        ).rejects.toThrow();

        await expect(
          ctx.db.execute(sql`
            insert into app.outlet_serviceability_pins (outlet_id, postal_code)
            values ('00000000-0000-4000-8000-000000000099'::uuid, '110001')
          `),
        ).rejects.toThrow();
      });
    });
  });

  it("postal_outlet index exists", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(
        applicationConfig(database.connectionString),
      );
      trackPersistenceHandle(persistence);

      await persistence.withContext(async (ctx) => {
        const idx = await ctx.db.execute(sql`
          select indexname from pg_indexes
          where schemaname = 'app'
            and indexname = 'outlet_serviceability_pins_postal_outlet_idx'
        `);
        expect(idx.rows).toHaveLength(1);
      });
    });
  });

  it("audit (outlet_id, new_revision) unique; append-only REVOKE when boba_bear_app exists", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(
        applicationConfig(database.connectionString),
      );
      trackPersistenceHandle(persistence);

      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "saud"));
      const user = await createEligibleWorkforceUser(persistence);

      await persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          insert into app.outlet_serviceability_audit_events (
            id, occurred_at, actor_kind, actor_id, outlet_id, action,
            previous_revision, new_revision, previous_routing_priority, new_routing_priority,
            added_postal_codes, removed_postal_codes
          ) values (
            gen_random_uuid(), now(), 'workforce', ${user.id}, ${tree.outletA.id}::uuid,
            'serviceability_routing_priority_set', null, 1, null, 5, '{}', '{}'
          )
        `);

        await expect(
          ctx.db.execute(sql`
            insert into app.outlet_serviceability_audit_events (
              id, occurred_at, actor_kind, actor_id, outlet_id, action,
              previous_revision, new_revision, previous_routing_priority, new_routing_priority,
              added_postal_codes, removed_postal_codes
            ) values (
              gen_random_uuid(), now(), 'workforce', ${user.id}, ${tree.outletA.id}::uuid,
              'serviceability_routing_priority_set', null, 1, null, 6, '{}', '{}'
            )
          `),
        ).rejects.toThrow();

        const roleExists = await ctx.db.execute(sql`
          select exists(select 1 from pg_roles where rolname = 'boba_bear_app') as e
        `);
        if (roleExists.rows[0]?.e === true) {
          const privs = await ctx.db.execute(sql`
            select
              has_table_privilege('boba_bear_app', 'app.outlet_serviceability_audit_events', 'UPDATE') as can_update,
              has_table_privilege('boba_bear_app', 'app.outlet_serviceability_audit_events', 'DELETE') as can_delete,
              has_table_privilege('boba_bear_app', 'app.outlet_serviceability_configs', 'DELETE') as can_delete_config,
              has_table_privilege('boba_bear_app', 'app.outlet_serviceability_pins', 'DELETE') as can_delete_pins
          `);
          expect(privs.rows[0]?.can_update).toBe(false);
          expect(privs.rows[0]?.can_delete).toBe(false);
          expect(privs.rows[0]?.can_delete_config).toBe(false);
          expect(privs.rows[0]?.can_delete_pins).toBe(true);
        }
      });
    });
  });

  it("rejects forbidden serviceability columns (zones, fees, soft-delete, coords on tables)", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(
        applicationConfig(database.connectionString),
      );
      trackPersistenceHandle(persistence);

      await persistence.withContext(async (ctx) => {
        const columns = await ctx.db.execute(sql`
          select table_name, column_name
          from information_schema.columns
          where table_schema = 'app'
            and table_name like 'outlet_serviceability%'
        `);
        const names = columns.rows.map(
          (r) => `${r.table_name}.${r.column_name}`,
        );
        const forbidden = names.filter((n) => {
          if (
            n === "outlet_serviceability_configs.service_origin_latitude" ||
            n === "outlet_serviceability_configs.service_origin_longitude" ||
            n === "outlet_serviceability_configs.max_service_distance_meters" ||
            n.startsWith("outlet_serviceability_audit_events.previous_service_origin_") ||
            n.startsWith("outlet_serviceability_audit_events.new_service_origin_") ||
            n === "outlet_serviceability_audit_events.previous_max_service_distance_meters" ||
            n === "outlet_serviceability_audit_events.new_max_service_distance_meters"
          ) {
            return false;
          }
          return /is_serviceable|zone|radius|polygon|delivery_fee|latitude|longitude|deleted_at|retired_at|is_deleted|geocod|postgis|geometry|geography|customer/i.test(
            n,
          );
        });
        expect(forbidden).toEqual([]);

        expect(names).toContain("outlet_serviceability_configs.outlet_id");
        expect(names).toContain("outlet_serviceability_configs.routing_priority");
        expect(names).toContain("outlet_serviceability_configs.revision");
        expect(names).toContain("outlet_serviceability_configs.service_origin_latitude");
        expect(names).toContain("outlet_serviceability_configs.max_service_distance_meters");
        expect(names).toContain("outlet_serviceability_pins.postal_code");
      });
    });
  });
});
