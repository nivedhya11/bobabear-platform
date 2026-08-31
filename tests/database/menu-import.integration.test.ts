/**
 * PostgreSQL integration tests for existing menu import schema (IMP-013).
 * Real Testcontainers PostgreSQL 18 — migration replay, privileges, constraints.
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

const MENU_TABLES = ["menus", "menu_sections", "menu_entries"] as const;

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

describe("IMP-013 migration replay and seal", () => {
  it("creates exactly 3 menu tables and seeds menu permissions (49 / 7 after IMP-016)", async () => {
    await withMigratedPersistence(async (persistence) => {
      await persistence.withContext(async (ctx) => {
        const tables = await ctx.db.execute<{ relname: string }>(sql`
          select c.relname
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'app'
            and c.relkind = 'r'
            and c.relname in ('menus', 'menu_sections', 'menu_entries')
          order by c.relname
        `);
        expect(tables.rows.map((r) => r.relname)).toEqual([...MENU_TABLES].sort());
        expect(tables.rows.length).toBe(3);

        const permissions = await ctx.db.execute<{ count: string }>(
          sql`select count(*)::text as count from app.access_permissions`,
        );
        expect(permissions.rows[0]?.count).toBe("51");
        expect(PERMISSION_KEYS.length).toBe(68);

        const roles = await ctx.db.execute<{ count: string }>(
          sql`select count(*)::text as count from app.access_roles`,
        );
        expect(roles.rows[0]?.count).toBe("7");
        expect(ROLE_KEYS.length).toBe(7);

        const menuPerms = await ctx.db.execute<{ key: string }>(
          sql`select key from app.access_permissions where key in ('menu.read', 'menu.manage') order by key`,
        );
        expect(menuPerms.rows.map((r) => r.key)).toEqual(["menu.manage", "menu.read"]);

        const psaMappings = await ctx.db.execute<{ permission_key: string }>(sql`
          select permission_key from app.access_role_permissions
          where role_key = 'platform_super_admin'
            and permission_key in ('menu.read', 'menu.manage')
          order by permission_key
        `);
        expect(psaMappings.rows.map((r) => r.permission_key)).toEqual([
          "menu.manage",
          "menu.read",
        ]);

        const brandMappings = await ctx.db.execute<{ permission_key: string }>(sql`
          select permission_key from app.access_role_permissions
          where role_key = 'brand_admin'
            and permission_key in ('menu.read', 'menu.manage')
          order by permission_key
        `);
        expect(brandMappings.rows.map((r) => r.permission_key)).toEqual([
          "menu.manage",
          "menu.read",
        ]);

        const otherManage = await ctx.db.execute<{ role_key: string }>(sql`
          select role_key from app.access_role_permissions
          where permission_key = 'menu.manage'
            and role_key not in ('platform_super_admin', 'brand_admin')
        `);
        expect(otherManage.rows).toEqual([]);

        expect(ROLE_PERMISSION_MAPPINGS.some((m) => m.permissionKey === "menu.read")).toBe(true);
        expect(ROLE_PERMISSION_MAPPINGS.some((m) => m.permissionKey === "menu.manage")).toBe(true);
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
      const sealed0007 = integrity.migrations.find((m) => m.tag === "0007_existing_menu_import");
      expect(sealed0007).toBeTruthy();
      const fileHash = createHash("sha256")
        .update(readFileSync(path.join(process.cwd(), "drizzle/0007_existing_menu_import.sql")))
        .digest("hex");
      expect(sealed0007?.sha256).toBe(fileHash);
    });
  });

  it("menu schema has no price/tax/outlet/availability/provider columns", async () => {
    await withMigratedPersistence(async (persistence) => {
      await persistence.withContext(async (ctx) => {
        const cols = await ctx.db.execute<{ column_name: string; table_name: string }>(sql`
          select table_name, column_name
          from information_schema.columns
          where table_schema = 'app'
            and table_name in ('menus', 'menu_sections', 'menu_entries')
        `);
        const names = cols.rows.map((r) => r.column_name);
        for (const forbidden of [
          "price",
          "amount",
          "currency",
          "gst",
          "tax",
          "discount",
          "promotion_id",
          "organization_id",
          "territory_id",
          "outlet_id",
          "is_available",
          "sold_out",
          "temporarily_unavailable",
          "stock_quantity",
          "petpooja_id",
          "zomato_id",
          "swiggy_id",
          "provider_item_id",
        ]) {
          expect(names).not.toContain(forbidden);
        }
      });
    });
  });
});

describe("menu constraints", () => {
  it("rejects self-parent, negative position, and duplicate menu codes", async () => {
    await withMigratedPersistence(async (persistence) => {
      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "menu"));
      const now = new Date().toISOString();
      const menuId = randomUUID();
      const sectionId = randomUUID();

      await persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          insert into app.menus (
            id, brand_id, code, name, lifecycle_status, created_at, updated_at
          ) values (
            ${menuId}::uuid, ${tree.brand.id}::uuid, 'primary', 'Primary',
            'draft', ${now}::timestamptz, ${now}::timestamptz
          )
        `);

        await expect(
          ctx.db.execute(sql`
            insert into app.menus (
              id, brand_id, code, name, lifecycle_status, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, 'primary', 'Dup',
              'draft', ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        ).rejects.toThrow();

        await ctx.db.execute(sql`
          insert into app.menu_sections (
            id, brand_id, menu_id, parent_section_id, code, name, position,
            lifecycle_status, created_at, updated_at
          ) values (
            ${sectionId}::uuid, ${tree.brand.id}::uuid, ${menuId}::uuid, null,
            'root', 'Root', 0, 'draft', ${now}::timestamptz, ${now}::timestamptz
          )
        `);

        // Self-parent CHECK.
        await expect(
          ctx.db.execute(sql`
            update app.menu_sections
            set parent_section_id = ${sectionId}::uuid
            where id = ${sectionId}::uuid
          `),
        ).rejects.toThrow();

        // Negative position CHECK.
        await expect(
          ctx.db.execute(sql`
            insert into app.menu_sections (
              id, brand_id, menu_id, parent_section_id, code, name, position,
              lifecycle_status, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${menuId}::uuid, null,
              'bad-pos', 'Bad', -1, 'draft', ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        ).rejects.toThrow();

        // Duplicate section code within menu.
        await expect(
          ctx.db.execute(sql`
            insert into app.menu_sections (
              id, brand_id, menu_id, parent_section_id, code, name, position,
              lifecycle_status, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${menuId}::uuid, null,
              'root', 'Root Dup', 1, 'draft', ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        ).rejects.toThrow();
      });
    });
  });

  it("rejects cross-brand product entry via composite FK", async () => {
    await withMigratedPersistence(async (persistence) => {
      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "mxa"));
      const otherBrand = await persistence.transaction((tx) =>
        createBrand(tx, { code: `mxb-${randomUUID().slice(0, 8)}`, name: "Other" }),
      );
      const now = new Date().toISOString();
      const menuId = randomUUID();
      const sectionId = randomUUID();
      const productId = randomUUID();

      await persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          insert into app.menus (
            id, brand_id, code, name, lifecycle_status, created_at, updated_at
          ) values (
            ${menuId}::uuid, ${tree.brand.id}::uuid, 'primary', 'Primary',
            'draft', ${now}::timestamptz, ${now}::timestamptz
          )
        `);
        await ctx.db.execute(sql`
          insert into app.menu_sections (
            id, brand_id, menu_id, parent_section_id, code, name, position,
            lifecycle_status, created_at, updated_at
          ) values (
            ${sectionId}::uuid, ${tree.brand.id}::uuid, ${menuId}::uuid, null,
            'root', 'Root', 0, 'draft', ${now}::timestamptz, ${now}::timestamptz
          )
        `);
        await ctx.db.execute(sql`
          insert into app.catalog_products (
            id, brand_id, code, name, product_kind, lifecycle_status, created_at, updated_at
          ) values (
            ${productId}::uuid, ${otherBrand.id}::uuid, 'cross', 'Cross', 'standard',
            'draft', ${now}::timestamptz, ${now}::timestamptz
          )
        `);

        await expect(
          ctx.db.execute(sql`
            insert into app.menu_entries (
              id, brand_id, menu_id, section_id, product_id, position,
              lifecycle_status, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${menuId}::uuid,
              ${sectionId}::uuid, ${productId}::uuid, 0,
              'draft', ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        ).rejects.toThrow();
      });
    });
  });
});

describe("menu privilege REVOKE", () => {
  it("denies DELETE/TRUNCATE on menu tables for an app-shaped role", async () => {
    await withMigratedPersistence(async (persistence, database) => {
      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "mpriv"));
      const menuId = randomUUID();
      const now = new Date().toISOString();

      await persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          insert into app.menus (
            id, brand_id, code, name, lifecycle_status, created_at, updated_at
          ) values (
            ${menuId}::uuid, ${tree.brand.id}::uuid, 'primary', 'Primary',
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
              ctx.db.execute(sql`delete from app.menus where id = ${menuId}::uuid`),
            );
            await expectPermissionDenied(ctx.db.execute(sql`truncate app.menus`));
            await expectPermissionDenied(ctx.db.execute(sql`truncate app.menu_sections`));
            await expectPermissionDenied(ctx.db.execute(sql`truncate app.menu_entries`));
          });
        },
      );
    });
  });
});
