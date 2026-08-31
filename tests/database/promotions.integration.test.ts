/**
 * PostgreSQL integration tests for promotions / coupons (IMP-016).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, inject, it } from "vitest";

import type { WebConfig } from "../../src/platform/config";
import { PERMISSION_KEYS, ROLE_KEYS } from "../../src/shared/access-control";
import { getApplicationPersistence } from "../../src/server/persistence";
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

function applicationConfig(databaseUrl: string): WebConfig {
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

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
});

describe("IMP-016 promotions migration", () => {
  it("keeps 0000–0009 sealed and seals 0010", () => {
    for (const [rel, expected] of Object.entries(PRIOR_MIGRATION_HASHES)) {
      expect(sha256File(rel)).toBe(expected);
    }
    const integrity = JSON.parse(
      readFileSync(path.join(process.cwd(), "drizzle/migration-integrity.json"), "utf8"),
    ) as { migrations: Array<{ path: string; sha256: string }> };
    const entry = integrity.migrations.find(
      (m) => m.path === "drizzle/0010_promotions_coupons.sql",
    );
    expect(entry).toBeDefined();
    expect(entry!.sha256).toBe(sha256File("drizzle/0010_promotions_coupons.sql"));
    expect(integrity.migrations.length).toBeGreaterThanOrEqual(12);
  });

  it("creates 6 promotion tables within current app inventory, 49 permissions, 7 roles", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await applyMigrations(database.connectionString);

      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      await persistence.withContext(async (ctx) => {
        const promoTables = await ctx.db.execute(sql`
          select count(*)::text as count
          from information_schema.tables
          where table_schema = 'app'
            and table_name in (
              'brand_promotion_policies','promotions','promotion_benefits',
              'promotion_targets','promotion_coupons','promotion_audit_events'
            )
        `);
        expect(promoTables.rows[0]?.count).toBe("6");

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
            (select count(*)::text from app.promotions) as promotions,
            (select count(*)::text from app.promotion_coupons) as coupons,
            (select count(*)::text from app.brand_promotion_policies) as policies
        `);
        expect(empty.rows[0]?.promotions).toBe("0");
        expect(empty.rows[0]?.coupons).toBe("0");
        expect(empty.rows[0]?.policies).toBe("0");
      });
    });
  });

  it("enforces promotion scope shape and single benefit", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      await persistence.withContext(async (ctx) => {
        // Need a brand first
        await ctx.db.execute(sql`
          insert into app.brands (id, code, name, status, created_at, updated_at)
          values (
            'a0160000-0000-4000-8000-000000000001',
            'boba-bear-test',
            'Test Brand',
            'active',
            now(),
            now()
          )
        `);

        await expect(
          ctx.db.execute(sql`
            insert into app.promotions (
              id, brand_id, code, display_name, scope_type, territory_id, organization_id, outlet_id,
              sales_channel, status, trigger_type, stacking_policy, priority, starts_at, ends_at,
              created_at, updated_at
            ) values (
              'a0160000-0000-4000-8000-000000000010',
              'a0160000-0000-4000-8000-000000000001',
              'bad-outlet',
              'Bad',
              'outlet',
              'a0160000-0000-4000-8000-000000000099',
              null,
              'a0160000-0000-4000-8000-000000000098',
              'direct', 'draft', 'automatic', 'exclusive', 0, now(), null, now(), now()
            )
          `),
        ).rejects.toThrow();
      });
    });
  });
});
