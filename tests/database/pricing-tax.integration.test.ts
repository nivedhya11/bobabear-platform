/**
 * PostgreSQL integration tests for pricing / charges / tax (IMP-015).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, inject, it } from "vitest";

import type { WebConfig } from "../../src/platform/config";
import {
  PERMISSION_KEYS,
  ROLE_KEYS,
} from "../../src/shared/access-control";
import {
  TAX_CATEGORY_RESTAURANT_SERVICE_ID,
  TAX_POLICY_RESTAURANT_SERVICE_V1_ID,
} from "../../src/shared/pricing";
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

describe("IMP-015 pricing migration", () => {
  it("keeps 0000–0008 sealed hashes unchanged and seals 0009", () => {
    for (const [rel, expected] of Object.entries(PRIOR_MIGRATION_HASHES)) {
      expect(sha256File(rel)).toBe(expected);
    }
    const integrity = JSON.parse(
      readFileSync(path.join(process.cwd(), "drizzle/migration-integrity.json"), "utf8"),
    ) as { migrations: Array<{ path: string; sha256: string }> };
    const entry = integrity.migrations.find((m) => m.path === "drizzle/0009_pricing_charges_tax.sql");
    expect(entry).toBeDefined();
    expect(entry!.sha256).toBe(sha256File("drizzle/0009_pricing_charges_tax.sql"));
    expect(sha256File("drizzle/0009_pricing_charges_tax.sql").length).toBe(64);
  });

  it("replays migrations, creates 12 tables, seeds system tax/charges, 49 permissions after IMP-016", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await applyMigrations(database.connectionString); // second migrate no-op

      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      await persistence.withContext(async (ctx) => {
        const count = await ctx.db.execute(sql`
          select count(*)::text as count
          from information_schema.tables
          where table_schema = 'app'
            and table_name in (
              'price_books','price_book_variant_prices','price_book_modifier_prices',
              'price_book_bundle_option_prices','charge_definitions','price_book_charge_prices',
              'tax_categories','tax_policies','tax_policy_components',
              'legal_entity_tax_profiles','outlet_tax_profiles','pricing_tax_audit_events'
            )
        `);
        expect(count.rows[0]?.count).toBe("12");

        const permissions = await ctx.db.execute(
          sql`select count(*)::text as count from app.access_permissions`,
        );
        expect(permissions.rows[0]?.count).toBe("51");
        expect(PERMISSION_KEYS.length).toBe(68);
        expect(ROLE_KEYS.length).toBe(7);

        const roleMaps = await ctx.db.execute(sql`
          select role_key, permission_key
          from app.access_role_permissions
          where permission_key in (
            'pricing.read','pricing.manage','charges.read','charges.manage',
            'tax.read','tax.manage','pricing.audit.read'
          )
          order by role_key, permission_key
        `);
        const byRole = new Map<string, string[]>();
        for (const row of roleMaps.rows as Array<{ role_key: string; permission_key: string }>) {
          const list = byRole.get(row.role_key) ?? [];
          list.push(row.permission_key);
          byRole.set(row.role_key, list);
        }
        expect(byRole.get("brand_admin")).toEqual([
          "charges.manage",
          "charges.read",
          "pricing.audit.read",
          "pricing.manage",
          "pricing.read",
          "tax.manage",
          "tax.read",
        ]);
        expect(byRole.get("outlet_manager")).toEqual([
          "charges.manage",
          "charges.read",
          "pricing.audit.read",
          "pricing.manage",
          "pricing.read",
          "tax.read",
        ]);
        expect(byRole.get("outlet_manager")).not.toContain("tax.manage");
        expect(byRole.get("finance_viewer")).toEqual([
          "charges.read",
          "pricing.audit.read",
          "pricing.read",
          "tax.read",
        ]);
        expect(byRole.get("support_refund_operator")).toEqual([
          "charges.read",
          "pricing.audit.read",
          "pricing.read",
          "tax.read",
        ]);

        const category = await ctx.db.execute(sql`
          select code, place_of_supply_method
          from app.tax_categories
          where id = ${TAX_CATEGORY_RESTAURANT_SERVICE_ID}::uuid
        `);
        expect(category.rows[0]?.code).toBe("restaurant_service");

        const policy = await ctx.db.execute(sql`
          select total_rate_bps, itc_allowed, sales_channel
          from app.tax_policies
          where id = ${TAX_POLICY_RESTAURANT_SERVICE_V1_ID}::uuid
        `);
        expect(policy.rows[0]?.total_rate_bps).toBe(500);
        expect(policy.rows[0]?.itc_allowed).toBe(false);
        expect(policy.rows[0]?.sales_channel).toBe("direct");

        const charges = await ctx.db.execute(
          sql`select count(*)::text as count from app.charge_definitions`,
        );
        expect(charges.rows[0]?.count).toBe("2");

        const prices = await ctx.db.execute(
          sql`select count(*)::text as count from app.price_book_variant_prices`,
        );
        expect(prices.rows[0]?.count).toBe("0");

        const moneyType = await ctx.db.execute(sql`
          select data_type
          from information_schema.columns
          where table_schema = 'app'
            and table_name = 'price_book_variant_prices'
            and column_name = 'amount_paise'
        `);
        expect(moneyType.rows[0]?.data_type).toBe("bigint");
      });
    });
  });
});
