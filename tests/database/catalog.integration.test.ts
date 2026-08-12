/**
 * PostgreSQL integration tests for the canonical catalog model (IMP-012).
 * Real Testcontainers PostgreSQL 18 only — every test gets its own isolated,
 * freshly-migrated database.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, inject, it } from "vitest";

import type { WebConfig } from "../../src/platform/config";
import {
  PERMISSION_KEYS,
  ROLE_KEYS,
  ROLE_PERMISSION_MAPPINGS,
} from "../../src/shared/access-control";
import { createBrand } from "../../src/server/organization";
import { getApplicationPersistence } from "../../src/server/persistence";
import { seedBrandTree } from "./support/access-control-fixtures";
import { withCatalogRoleFixture } from "./support/catalog-roles";
import { applyMigrations, withIsolatedTestDatabase } from "./support/test-database";

const CATALOG_TABLES = [
  "catalog_products",
  "catalog_variants",
  "catalog_modifier_groups",
  "catalog_modifier_options",
  "catalog_modifier_group_options",
  "catalog_variant_modifier_groups",
  "catalog_bundle_groups",
  "catalog_bundle_group_options",
  "catalog_dietary_tags",
  "catalog_variant_dietary_tags",
  "catalog_modifier_option_dietary_tags",
] as const;

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
};

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

async function withMigratedPersistence<T>(
  fn: (
    persistence: ReturnType<typeof getApplicationPersistence>,
    database: { databaseName: string; connectionString: string },
  ) => Promise<T>,
): Promise<T> {
  return withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
    await applyMigrations(database.connectionString);
    const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
    openHandles.push(persistence);
    return fn(persistence, database);
  });
}

function errorChainText(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let i = 0; i < 6 && current; i += 1) {
    if (current instanceof Error) {
      parts.push(current.message);
      if ("code" in current && (current as { code?: unknown }).code != null) {
        parts.push(String((current as { code: unknown }).code));
      }
      current = current.cause;
      continue;
    }
    parts.push(String(current));
    break;
  }
  return parts.join("\n");
}

async function expectPermissionDenied(promise: Promise<unknown>): Promise<void> {
  const error = await promise.then(
    () => {
      throw new Error("expected permission denial");
    },
    (e: unknown) => e,
  );
  expect(errorChainText(error)).toMatch(/permission denied|42501/i);
}

describe("IMP-012 migration replay and seal", () => {
  it("creates exactly 11 catalog tables and seeds catalog permissions", async () => {
    await withMigratedPersistence(async (persistence) => {
      await persistence.withContext(async (ctx) => {
        const tables = await ctx.db.execute<{ relname: string }>(sql`
          select c.relname
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'app'
            and c.relkind = 'r'
            and c.relname like 'catalog_%'
          order by c.relname
        `);
        expect(tables.rows.map((r) => r.relname).sort()).toEqual([...CATALOG_TABLES].sort());
        expect(tables.rows.length).toBe(11);

        const permissions = await ctx.db.execute<{ count: string }>(
          sql`select count(*)::text as count from app.access_permissions`,
        );
        // IMP-012 seeded 24; IMP-013 adds menu.*; IMP-014 adds assortment/availability/operating → 43.
        expect(permissions.rows[0]?.count).toBe("51");
        expect(PERMISSION_KEYS.length).toBe(51);

        const roles = await ctx.db.execute<{ count: string }>(
          sql`select count(*)::text as count from app.access_roles`,
        );
        expect(roles.rows[0]?.count).toBe("7");
        expect(ROLE_KEYS.length).toBe(7);

        const catalogPerms = await ctx.db.execute<{ key: string }>(
          sql`select key from app.access_permissions where key in ('catalog.read', 'catalog.manage') order by key`,
        );
        expect(catalogPerms.rows.map((r) => r.key)).toEqual(["catalog.manage", "catalog.read"]);

        const psaMappings = await ctx.db.execute<{ permission_key: string }>(sql`
          select permission_key from app.access_role_permissions
          where role_key = 'platform_super_admin'
            and permission_key in ('catalog.read', 'catalog.manage')
          order by permission_key
        `);
        expect(psaMappings.rows.map((r) => r.permission_key)).toEqual([
          "catalog.manage",
          "catalog.read",
        ]);

        const brandMappings = await ctx.db.execute<{ permission_key: string }>(sql`
          select permission_key from app.access_role_permissions
          where role_key = 'brand_admin'
            and permission_key in ('catalog.read', 'catalog.manage')
          order by permission_key
        `);
        expect(brandMappings.rows.map((r) => r.permission_key)).toEqual([
          "catalog.manage",
          "catalog.read",
        ]);

        const otherManage = await ctx.db.execute<{ role_key: string }>(sql`
          select role_key from app.access_role_permissions
          where permission_key = 'catalog.manage'
            and role_key not in ('platform_super_admin', 'brand_admin')
        `);
        expect(otherManage.rows).toEqual([]);

        expect(ROLE_PERMISSION_MAPPINGS.some((m) => m.permissionKey === "catalog.read")).toBe(true);
        expect(ROLE_PERMISSION_MAPPINGS.some((m) => m.permissionKey === "catalog.manage")).toBe(
          true,
        );
      });
    });
  });

  it("second apply is a safe no-op and prior migrations stay sealed", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await applyMigrations(database.connectionString);

      for (const [rel, expected] of Object.entries(PRIOR_MIGRATION_HASHES)) {
        const actual = createHash("sha256")
          .update(readFileSync(path.join(process.cwd(), rel)))
          .digest("hex");
        expect(actual).toBe(expected);
      }

      const integrity = JSON.parse(
        readFileSync(path.join(process.cwd(), "drizzle/migration-integrity.json"), "utf8"),
      ) as { migrations: Array<{ tag: string; sha256: string }> };
      const sealed0006 = integrity.migrations.find((m) => m.tag === "0006_canonical_catalog_model");
      expect(sealed0006).toBeTruthy();
      const fileHash = createHash("sha256")
        .update(readFileSync(path.join(process.cwd(), "drizzle/0006_canonical_catalog_model.sql")))
        .digest("hex");
      expect(sealed0006?.sha256).toBe(fileHash);
    });
  });

  it("schema has no price/tax/outlet/org/territory/availability/menu columns", async () => {
    await withMigratedPersistence(async (persistence) => {
      await persistence.withContext(async (ctx) => {
        const cols = await ctx.db.execute<{ column_name: string; table_name: string }>(sql`
          select table_name, column_name
          from information_schema.columns
          where table_schema = 'app'
            and table_name like 'catalog_%'
        `);
        const names = cols.rows.map((r) => r.column_name);
        for (const forbidden of [
          "price",
          "amount",
          "currency",
          "tax",
          "organization_id",
          "territory_id",
          "outlet_id",
          "is_available",
          "sold_out",
          "temporarily_unavailable",
          "outlet_enabled",
          "category_id",
          "menu_category",
          "menu_section",
          "menu_sort_order",
          "featured",
          "collection",
        ]) {
          expect(names).not.toContain(forbidden);
        }
      });
    });
  });
});

describe("product / variant integrity", () => {
  it("rejects duplicate codes, cross-brand FK, invalid lifecycle, and dual defaults", async () => {
    await withMigratedPersistence(async (persistence) => {
      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "cat1"));
      const otherBrand = await persistence.transaction((tx) =>
        createBrand(tx, { code: `ob-${randomUUID().slice(0, 8)}`, name: "Other Brand" }),
      );

      const productId = randomUUID();
      const now = new Date().toISOString();

      await persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          insert into app.catalog_products (
            id, brand_id, code, name, product_kind, lifecycle_status, created_at, updated_at
          ) values (
            ${productId}::uuid, ${tree.brand.id}::uuid, 'milk-tea', 'Milk Tea', 'standard',
            'draft', ${now}::timestamptz, ${now}::timestamptz
          )
        `);

        await expect(
          ctx.db.execute(sql`
            insert into app.catalog_products (
              id, brand_id, code, name, product_kind, lifecycle_status, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, 'milk-tea', 'Dup', 'standard',
              'draft', ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        ).rejects.toThrow();

        // Cross-brand variant FK rejection.
        await expect(
          ctx.db.execute(sql`
            insert into app.catalog_variants (
              id, brand_id, product_id, product_kind, code, name,
              is_default, is_selector_visible, lifecycle_status, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${otherBrand.id}::uuid, ${productId}::uuid, 'standard',
              'reg', 'Regular', true, false, 'draft', ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        ).rejects.toThrow();

        // Invalid lifecycle status.
        await expect(
          ctx.db.execute(sql`
            insert into app.catalog_products (
              id, brand_id, code, name, product_kind, lifecycle_status, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, 'bad-life', 'Bad', 'standard',
              'published', ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        ).rejects.toThrow();

        // Immutable kind mismatch via composite FK when inserting variant with wrong kind.
        await expect(
          ctx.db.execute(sql`
            insert into app.catalog_variants (
              id, brand_id, product_id, product_kind, code, name,
              is_default, is_selector_visible, lifecycle_status, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${productId}::uuid, 'bundle',
              'wrong-kind', 'Wrong', true, false, 'draft', ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        ).rejects.toThrow();

        const v1 = randomUUID();
        const v2 = randomUUID();
        await ctx.db.execute(sql`
          insert into app.catalog_variants (
            id, brand_id, product_id, product_kind, code, name,
            is_default, is_selector_visible, lifecycle_status, created_at, updated_at
          ) values (
            ${v1}::uuid, ${tree.brand.id}::uuid, ${productId}::uuid, 'standard',
            '350ml', '350ml', true, false, 'draft', ${now}::timestamptz, ${now}::timestamptz
          )
        `);
        await expect(
          ctx.db.execute(sql`
            insert into app.catalog_variants (
              id, brand_id, product_id, product_kind, code, name,
              is_default, is_selector_visible, lifecycle_status, created_at, updated_at
            ) values (
              ${v2}::uuid, ${tree.brand.id}::uuid, ${productId}::uuid, 'standard',
              '500ml', '500ml', true, true, 'draft', ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        ).rejects.toThrow();
      });
    });
  });
});

describe("modifier integrity", () => {
  it("enforces quantity CHECKs, cross-brand rejection, and duplicate active bindings", async () => {
    await withMigratedPersistence(async (persistence) => {
      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "mod"));
      const otherBrand = await persistence.transaction((tx) =>
        createBrand(tx, { code: `obm-${randomUUID().slice(0, 8)}`, name: "Other" }),
      );
      const now = new Date().toISOString();
      const groupId = randomUUID();
      const optionId = randomUUID();
      const otherGroupId = randomUUID();

      await persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          insert into app.catalog_modifier_groups (
            id, brand_id, code, name, lifecycle_status, created_at, updated_at
          ) values (
            ${groupId}::uuid, ${tree.brand.id}::uuid, 'sugar', 'Sugar',
            'draft', ${now}::timestamptz, ${now}::timestamptz
          )
        `);
        await ctx.db.execute(sql`
          insert into app.catalog_modifier_options (
            id, brand_id, code, name, lifecycle_status, created_at, updated_at
          ) values (
            ${optionId}::uuid, ${tree.brand.id}::uuid, 'less', 'Less',
            'draft', ${now}::timestamptz, ${now}::timestamptz
          )
        `);
        await ctx.db.execute(sql`
          insert into app.catalog_modifier_groups (
            id, brand_id, code, name, lifecycle_status, created_at, updated_at
          ) values (
            ${otherGroupId}::uuid, ${otherBrand.id}::uuid, 'sugar', 'Sugar',
            'draft', ${now}::timestamptz, ${now}::timestamptz
          )
        `);

        await expect(
          ctx.db.execute(sql`
            insert into app.catalog_modifier_group_options (
              id, brand_id, modifier_group_id, modifier_option_id,
              min_quantity, max_quantity, default_quantity, position,
              lifecycle_status, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${groupId}::uuid, ${optionId}::uuid,
              2, 1, 0, 0, 'draft', ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        ).rejects.toThrow();

        // Cross-brand group/option pairing.
        await expect(
          ctx.db.execute(sql`
            insert into app.catalog_modifier_group_options (
              id, brand_id, modifier_group_id, modifier_option_id,
              min_quantity, max_quantity, default_quantity, position,
              lifecycle_status, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${otherGroupId}::uuid, ${optionId}::uuid,
              0, 1, 0, 0, 'draft', ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        ).rejects.toThrow();

        const bindingId = randomUUID();
        await ctx.db.execute(sql`
          insert into app.catalog_modifier_group_options (
            id, brand_id, modifier_group_id, modifier_option_id,
            min_quantity, max_quantity, default_quantity, position,
            lifecycle_status, created_at, updated_at
          ) values (
            ${bindingId}::uuid, ${tree.brand.id}::uuid, ${groupId}::uuid, ${optionId}::uuid,
            0, 1, 0, 0, 'draft', ${now}::timestamptz, ${now}::timestamptz
          )
        `);
        await expect(
          ctx.db.execute(sql`
            insert into app.catalog_modifier_group_options (
              id, brand_id, modifier_group_id, modifier_option_id,
              min_quantity, max_quantity, default_quantity, position,
              lifecycle_status, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${groupId}::uuid, ${optionId}::uuid,
              0, 1, 0, 1, 'draft', ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        ).rejects.toThrow();
      });
    });
  });
});

describe("bundle integrity", () => {
  it("rejects standard owning a bundle group, bundle as component, cross-brand, duplicates", async () => {
    await withMigratedPersistence(async (persistence) => {
      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "bun"));
      const otherBrand = await persistence.transaction((tx) =>
        createBrand(tx, { code: `obb-${randomUUID().slice(0, 8)}`, name: "Other" }),
      );
      const now = new Date().toISOString();

      const stdProduct = randomUUID();
      const stdVariant = randomUUID();
      const bundleProduct = randomUUID();
      const bundleVariant = randomUUID();
      const otherStdProduct = randomUUID();
      const otherStdVariant = randomUUID();

      await persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          insert into app.catalog_products (
            id, brand_id, code, name, product_kind, lifecycle_status, created_at, updated_at
          ) values
            (${stdProduct}::uuid, ${tree.brand.id}::uuid, 'std', 'Std', 'standard', 'draft', ${now}::timestamptz, ${now}::timestamptz),
            (${bundleProduct}::uuid, ${tree.brand.id}::uuid, 'bun', 'Bun', 'bundle', 'draft', ${now}::timestamptz, ${now}::timestamptz),
            (${otherStdProduct}::uuid, ${otherBrand.id}::uuid, 'std', 'Std', 'standard', 'draft', ${now}::timestamptz, ${now}::timestamptz)
        `);
        await ctx.db.execute(sql`
          insert into app.catalog_variants (
            id, brand_id, product_id, product_kind, code, name,
            is_default, is_selector_visible, lifecycle_status, created_at, updated_at
          ) values
            (${stdVariant}::uuid, ${tree.brand.id}::uuid, ${stdProduct}::uuid, 'standard', 'def', 'Def', true, false, 'draft', ${now}::timestamptz, ${now}::timestamptz),
            (${bundleVariant}::uuid, ${tree.brand.id}::uuid, ${bundleProduct}::uuid, 'bundle', 'def', 'Def', true, false, 'draft', ${now}::timestamptz, ${now}::timestamptz),
            (${otherStdVariant}::uuid, ${otherBrand.id}::uuid, ${otherStdProduct}::uuid, 'standard', 'def', 'Def', true, false, 'draft', ${now}::timestamptz, ${now}::timestamptz)
        `);

        // Standard variant cannot own a bundle group (parent_product_kind must be bundle).
        await expect(
          ctx.db.execute(sql`
            insert into app.catalog_bundle_groups (
              id, brand_id, bundle_variant_id, parent_product_kind, code, name,
              min_selections, max_selections, position, lifecycle_status, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${stdVariant}::uuid, 'bundle',
              'pick', 'Pick', 1, 1, 0, 'draft', ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        ).rejects.toThrow();

        const groupId = randomUUID();
        await ctx.db.execute(sql`
          insert into app.catalog_bundle_groups (
            id, brand_id, bundle_variant_id, parent_product_kind, code, name,
            min_selections, max_selections, position, lifecycle_status, created_at, updated_at
          ) values (
            ${groupId}::uuid, ${tree.brand.id}::uuid, ${bundleVariant}::uuid, 'bundle',
            'pick', 'Pick', 1, 1, 0, 'draft', ${now}::timestamptz, ${now}::timestamptz
          )
        `);

        // Bundle variant cannot be a component (component_product_kind must be standard).
        await expect(
          ctx.db.execute(sql`
            insert into app.catalog_bundle_group_options (
              id, brand_id, bundle_group_id, component_variant_id, component_product_kind,
              quantity, is_default, position, lifecycle_status, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${groupId}::uuid, ${bundleVariant}::uuid,
              'standard', 1, true, 0, 'draft', ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        ).rejects.toThrow();

        // Cross-brand component.
        await expect(
          ctx.db.execute(sql`
            insert into app.catalog_bundle_group_options (
              id, brand_id, bundle_group_id, component_variant_id, component_product_kind,
              quantity, is_default, position, lifecycle_status, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${groupId}::uuid, ${otherStdVariant}::uuid,
              'standard', 1, true, 0, 'draft', ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        ).rejects.toThrow();

        await ctx.db.execute(sql`
          insert into app.catalog_bundle_group_options (
            id, brand_id, bundle_group_id, component_variant_id, component_product_kind,
            quantity, is_default, position, lifecycle_status, created_at, updated_at
          ) values (
            ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${groupId}::uuid, ${stdVariant}::uuid,
            'standard', 1, true, 0, 'draft', ${now}::timestamptz, ${now}::timestamptz
          )
        `);
        await expect(
          ctx.db.execute(sql`
            insert into app.catalog_bundle_group_options (
              id, brand_id, bundle_group_id, component_variant_id, component_product_kind,
              quantity, is_default, position, lifecycle_status, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${groupId}::uuid, ${stdVariant}::uuid,
              'standard', 1, false, 1, 'draft', ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        ).rejects.toThrow();
      });
    });
  });
});

describe("dietary integrity", () => {
  it("enforces tag kinds, cross-brand assignment rejection, duplicate active, retirement history", async () => {
    await withMigratedPersistence(async (persistence) => {
      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "diet"));
      const otherBrand = await persistence.transaction((tx) =>
        createBrand(tx, { code: `obd-${randomUUID().slice(0, 8)}`, name: "Other" }),
      );
      const now = new Date().toISOString();
      const productId = randomUUID();
      const variantId = randomUUID();
      const tagId = randomUUID();
      const otherTagId = randomUUID();

      await persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          insert into app.catalog_products (
            id, brand_id, code, name, product_kind, lifecycle_status, created_at, updated_at
          ) values (
            ${productId}::uuid, ${tree.brand.id}::uuid, 'tea', 'Tea', 'standard',
            'draft', ${now}::timestamptz, ${now}::timestamptz
          )
        `);
        await ctx.db.execute(sql`
          insert into app.catalog_variants (
            id, brand_id, product_id, product_kind, code, name,
            is_default, is_selector_visible, lifecycle_status, created_at, updated_at
          ) values (
            ${variantId}::uuid, ${tree.brand.id}::uuid, ${productId}::uuid, 'standard',
            'def', 'Def', true, false, 'draft', ${now}::timestamptz, ${now}::timestamptz
          )
        `);

        await expect(
          ctx.db.execute(sql`
            insert into app.catalog_dietary_tags (
              id, brand_id, code, name, kind, lifecycle_status, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, 'bad', 'Bad', 'spicy',
              'draft', ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        ).rejects.toThrow();

        await ctx.db.execute(sql`
          insert into app.catalog_dietary_tags (
            id, brand_id, code, name, kind, lifecycle_status,
            created_at, updated_at, activated_at
          ) values
            (${tagId}::uuid, ${tree.brand.id}::uuid, 'veg', 'Vegetarian', 'dietary', 'active',
             ${now}::timestamptz, ${now}::timestamptz, ${now}::timestamptz),
            (${otherTagId}::uuid, ${otherBrand.id}::uuid, 'veg', 'Vegetarian', 'dietary', 'active',
             ${now}::timestamptz, ${now}::timestamptz, ${now}::timestamptz)
        `);

        await expect(
          ctx.db.execute(sql`
            insert into app.catalog_variant_dietary_tags (
              id, brand_id, target_id, dietary_tag_id, assigned_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${variantId}::uuid, ${otherTagId}::uuid,
              ${now}::timestamptz
            )
          `),
        ).rejects.toThrow();

        const assignmentId = randomUUID();
        await ctx.db.execute(sql`
          insert into app.catalog_variant_dietary_tags (
            id, brand_id, target_id, dietary_tag_id, assigned_at
          ) values (
            ${assignmentId}::uuid, ${tree.brand.id}::uuid, ${variantId}::uuid, ${tagId}::uuid,
            ${now}::timestamptz
          )
        `);
        await expect(
          ctx.db.execute(sql`
            insert into app.catalog_variant_dietary_tags (
              id, brand_id, target_id, dietary_tag_id, assigned_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${variantId}::uuid, ${tagId}::uuid,
              ${now}::timestamptz
            )
          `),
        ).rejects.toThrow();

        await ctx.db.execute(sql`
          update app.catalog_variant_dietary_tags
          set retired_at = ${now}::timestamptz
          where id = ${assignmentId}::uuid
        `);
        const history = await ctx.db.execute<{ id: string; retired_at: string | null }>(sql`
          select id, retired_at::text as retired_at
          from app.catalog_variant_dietary_tags
          where id = ${assignmentId}::uuid
        `);
        expect(history.rows[0]?.retired_at).toBeTruthy();
      });
    });
  });
});

describe("catalog privilege REVOKE", () => {
  it("denies DELETE on catalog tables for an app-shaped role", async () => {
    await withMigratedPersistence(async (persistence, database) => {
      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "priv"));
      const productId = randomUUID();
      const now = new Date().toISOString();

      await persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          insert into app.catalog_products (
            id, brand_id, code, name, product_kind, lifecycle_status, created_at, updated_at
          ) values (
            ${productId}::uuid, ${tree.brand.id}::uuid, 'priv-p', 'Priv', 'standard',
            'draft', ${now}::timestamptz, ${now}::timestamptz
          )
        `);
      });

      await withCatalogRoleFixture(
        database.databaseName,
        database.connectionString,
        async (fixture) => {
          const appPersistence = getApplicationPersistence(
            applicationConfig(fixture.applicationConnectionString),
          );
          openHandles.push(appPersistence);

          await appPersistence.withContext(async (ctx) => {
            await expectPermissionDenied(
              ctx.db.execute(sql`delete from app.catalog_products where id = ${productId}::uuid`),
            );
            await expectPermissionDenied(
              ctx.db.execute(sql`truncate app.catalog_products`),
            );
          });
        },
      );
    });
  });
});
