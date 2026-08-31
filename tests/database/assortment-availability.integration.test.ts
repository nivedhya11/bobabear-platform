/**
 * PostgreSQL integration tests for assortment / operational availability (IMP-014).
 * Real Testcontainers PostgreSQL 18 — migration, constraints, privileges, permissions.
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
import {
  createEligibleWorkforceUser,
  seedBrandTree,
} from "./support/access-control-fixtures";
import { withCatalogRoleFixture } from "./support/catalog-roles";
import { applyMigrations, withIsolatedTestDatabase } from "./support/test-database";

const ASSORTMENT_TABLES = [
  "assortment_availability_audit_events",
  "assortment_rules",
  "outlet_modifier_option_availability",
  "outlet_operating_intervals",
  "outlet_operating_profiles",
  "outlet_variant_availability",
] as const;

const NEW_PERMISSIONS = [
  "assortment.read",
  "assortment.manage",
  "availability.read",
  "availability.manage",
  "outlet.operating_state.read",
  "outlet.operating_state.pause",
  "outlet.operating_state.suspend",
  "outlet.operating_schedule.read",
  "outlet.operating_schedule.manage",
  "assortment.audit.read",
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
  "drizzle/0006_canonical_catalog_model.sql":
    "db905b5ebe565950925bc96e3a84196897823a8fbb26eafe191a5639de1e4a71",
  "drizzle/0007_existing_menu_import.sql":
    "8b2cf7c95f42c2281efa281031904f0706280c7e7e2282ce64bc4c4ddf35a4d1",
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

async function expectConstraintFailure(promise: Promise<unknown>): Promise<void> {
  const error = await promise.then(
    () => {
      throw new Error("expected constraint failure");
    },
    (e: unknown) => e,
  );
  expect(errorChainText(error)).toMatch(
    /check constraint|unique constraint|foreign key|23514|23505|23503/i,
  );
}

async function seedCatalogTargets(
  persistence: ReturnType<typeof getApplicationPersistence>,
  brandId: string,
): Promise<{ productId: string; variantId: string; modifierOptionId: string }> {
  const productId = randomUUID();
  const variantId = randomUUID();
  const modifierOptionId = randomUUID();
  const now = new Date().toISOString();
  await persistence.withContext(async (ctx) => {
    await ctx.db.execute(sql`
      insert into app.catalog_products (
        id, brand_id, code, name, product_kind, lifecycle_status, created_at, updated_at
      ) values (
        ${productId}::uuid, ${brandId}::uuid, 'p1', 'P1', 'standard',
        'draft', ${now}::timestamptz, ${now}::timestamptz
      )
    `);
    await ctx.db.execute(sql`
      insert into app.catalog_variants (
        id, brand_id, product_id, code, name, product_kind, is_default,
        is_selector_visible, lifecycle_status, created_at, updated_at
      ) values (
        ${variantId}::uuid, ${brandId}::uuid, ${productId}::uuid, 'default', 'Default',
        'standard', true, false, 'draft', ${now}::timestamptz, ${now}::timestamptz
      )
    `);
    await ctx.db.execute(sql`
      insert into app.catalog_modifier_options (
        id, brand_id, code, name, lifecycle_status, created_at, updated_at
      ) values (
        ${modifierOptionId}::uuid, ${brandId}::uuid, 'opt', 'Opt',
        'draft', ${now}::timestamptz, ${now}::timestamptz
      )
    `);
  });
  return { productId, variantId, modifierOptionId };
}

describe("IMP-014 migration replay and seal", () => {
  it("creates exactly 6 assortment tables; second migrate is a no-op", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await applyMigrations(database.connectionString);

      const persistence = getApplicationPersistence(
        applicationConfig(database.connectionString),
      );
      openHandles.push(persistence);

      await persistence.withContext(async (ctx) => {
        const tables = await ctx.db.execute<{ relname: string }>(sql`
          select c.relname
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'app'
            and c.relkind = 'r'
            and c.relname in (
              'assortment_rules',
              'outlet_variant_availability',
              'outlet_modifier_option_availability',
              'outlet_operating_profiles',
              'outlet_operating_intervals',
              'assortment_availability_audit_events'
            )
          order by c.relname
        `);
        expect(tables.rows.map((r) => r.relname)).toEqual([...ASSORTMENT_TABLES].sort());
        expect(tables.rows.length).toBe(6);
      });
    });
  });

  it("exactly one 0008; 0000–0007 sealed hashes match integrity", async () => {
    for (const [rel, expected] of Object.entries(PRIOR_MIGRATION_HASHES)) {
      const actual = createHash("sha256")
        .update(readFileSync(path.join(process.cwd(), rel)))
        .digest("hex");
      expect(actual).toBe(expected);
    }

    const integrity = JSON.parse(
      readFileSync(path.join(process.cwd(), "drizzle/migration-integrity.json"), "utf8"),
    ) as { migrations: Array<{ tag: string; path: string; sha256: string }> };

    expect(integrity.migrations.filter((m) => m.tag.startsWith("0008")).length).toBe(1);
    // IMP-015 owns 0009 — allow exactly the sealed pricing migration when present.
    const tags0009 = integrity.migrations.filter((m) => m.tag.startsWith("0009"));
    expect(tags0009.length).toBeLessThanOrEqual(1);
    if (tags0009.length === 1) {
      expect(tags0009[0]?.tag).toBe("0009_pricing_charges_tax");
    }
    // IMP-016 owns 0010 — allow exactly the sealed promotions migration when present.
    const tags0010 = integrity.migrations.filter((m) => m.tag.startsWith("0010"));
    expect(tags0010.length).toBeLessThanOrEqual(1);
    if (tags0010.length === 1) {
      expect(tags0010[0]?.tag).toBe("0010_promotions_coupons");
    }
    // IMP-017 owns 0011 — allow exactly the sealed customer-profiles migration when present.
    const tags0011 = integrity.migrations.filter((m) => m.tag.startsWith("0011"));
    expect(tags0011.length).toBeLessThanOrEqual(1);
    if (tags0011.length === 1) {
      expect(tags0011[0]?.tag).toBe("0011_customer_profiles");
    }
    const tags0012 = integrity.migrations.filter((m) => m.tag.startsWith("0012"));
    expect(tags0012.length).toBeLessThanOrEqual(1);
    if (tags0012.length === 1) {
      expect(tags0012[0]?.tag).toBe("0012_customer_addresses");
    }
    // IMP-019 owns 0013 — allow exactly the sealed serviceability migration when present.
    const tags0013 = integrity.migrations.filter((m) => m.tag.startsWith("0013"));
    expect(tags0013.length).toBeLessThanOrEqual(1);
    if (tags0013.length === 1) {
      expect(tags0013[0]?.tag).toBe("0013_serviceability");
    }
    // IMP-020 owns 0014 — allow exactly the sealed cart migration when present.
    const tags0014 = integrity.migrations.filter((m) => m.tag.startsWith("0014"));
    expect(tags0014.length).toBeLessThanOrEqual(1);
    if (tags0014.length === 1) {
      expect(tags0014[0]?.tag).toBe("0014_cart");
    }
    // IMP-021 owns 0015 — allow sealed checkout when present.
    const tags0015 = integrity.migrations.filter((m) => m.tag.startsWith("0015"));
    expect(tags0015.length).toBeLessThanOrEqual(1);
    if (tags0015.length === 1) {
      expect(tags0015[0]?.tag).toBe("0015_checkout");
    }
    expect(integrity.migrations).toHaveLength(16);

    const sealed0008 = integrity.migrations.find(
      (m) => m.tag === "0008_assortment_operational_availability",
    );
    expect(sealed0008).toBeTruthy();
    const fileHash = createHash("sha256")
      .update(
        readFileSync(
          path.join(process.cwd(), "drizzle/0008_assortment_operational_availability.sql"),
        ),
      )
      .digest("hex");
    expect(sealed0008?.sha256).toBe(fileHash);

    for (const prior of Object.keys(PRIOR_MIGRATION_HASHES)) {
      const entry = integrity.migrations.find((m) => m.path === prior);
      expect(entry?.sha256).toBe(PRIOR_MIGRATION_HASHES[prior]);
    }
  });
});

describe("IMP-014 permissions catalog", () => {
  it("seeds 49 permissions / 7 roles with the 10 new assortment permissions mapped", async () => {
    await withMigratedPersistence(async (persistence) => {
      await persistence.withContext(async (ctx) => {
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

        const newPerms = await ctx.db.execute<{ key: string }>(sql`
          select key from app.access_permissions
          where key in (
            'assortment.read', 'assortment.manage',
            'availability.read', 'availability.manage',
            'outlet.operating_state.read', 'outlet.operating_state.pause',
            'outlet.operating_state.suspend',
            'outlet.operating_schedule.read', 'outlet.operating_schedule.manage',
            'assortment.audit.read'
          )
          order by key
        `);
        expect(newPerms.rows.map((r) => r.key).sort()).toEqual([...NEW_PERMISSIONS].sort());

        const psa = await ctx.db.execute<{ permission_key: string }>(sql`
          select permission_key from app.access_role_permissions
          where role_key = 'platform_super_admin'
            and permission_key in (
              'assortment.read', 'assortment.manage',
              'availability.read', 'availability.manage',
              'outlet.operating_state.read', 'outlet.operating_state.pause',
              'outlet.operating_state.suspend',
              'outlet.operating_schedule.read', 'outlet.operating_schedule.manage',
              'assortment.audit.read'
            )
          order by permission_key
        `);
        expect(psa.rows.map((r) => r.permission_key).sort()).toEqual([...NEW_PERMISSIONS].sort());

        const brandAdmin = await ctx.db.execute<{ permission_key: string }>(sql`
          select permission_key from app.access_role_permissions
          where role_key = 'brand_admin'
            and permission_key in (
              'assortment.read', 'assortment.manage',
              'availability.read', 'availability.manage',
              'outlet.operating_state.read', 'outlet.operating_state.pause',
              'outlet.operating_state.suspend',
              'outlet.operating_schedule.read', 'outlet.operating_schedule.manage',
              'assortment.audit.read'
            )
          order by permission_key
        `);
        expect(brandAdmin.rows.map((r) => r.permission_key).sort()).toEqual(
          [...NEW_PERMISSIONS].sort(),
        );

        const outletManager = await ctx.db.execute<{ permission_key: string }>(sql`
          select permission_key from app.access_role_permissions
          where role_key = 'outlet_manager'
            and permission_key in (
              'assortment.read', 'assortment.manage',
              'availability.read', 'availability.manage',
              'outlet.operating_state.read', 'outlet.operating_state.pause',
              'outlet.operating_state.suspend',
              'outlet.operating_schedule.read', 'outlet.operating_schedule.manage',
              'assortment.audit.read'
            )
          order by permission_key
        `);
        expect(outletManager.rows.map((r) => r.permission_key)).toEqual([
          "assortment.audit.read",
          "assortment.manage",
          "assortment.read",
          "availability.manage",
          "availability.read",
          "outlet.operating_schedule.manage",
          "outlet.operating_schedule.read",
          "outlet.operating_state.pause",
          "outlet.operating_state.read",
        ]);
        expect(outletManager.rows.map((r) => r.permission_key)).not.toContain(
          "outlet.operating_state.suspend",
        );

        const kitchen = await ctx.db.execute<{ permission_key: string }>(sql`
          select permission_key from app.access_role_permissions
          where role_key = 'kitchen_operator'
            and permission_key in (
              'assortment.read', 'assortment.manage',
              'availability.read', 'availability.manage',
              'outlet.operating_state.read', 'outlet.operating_state.pause',
              'outlet.operating_state.suspend',
              'outlet.operating_schedule.read', 'outlet.operating_schedule.manage',
              'assortment.audit.read'
            )
          order by permission_key
        `);
        expect(kitchen.rows.map((r) => r.permission_key)).toEqual([
          "assortment.read",
          "availability.manage",
          "availability.read",
          "outlet.operating_schedule.read",
          "outlet.operating_state.pause",
          "outlet.operating_state.read",
        ]);

        for (const key of NEW_PERMISSIONS) {
          expect(ROLE_PERMISSION_MAPPINGS.some((m) => m.permissionKey === key)).toBe(true);
        }
      });
    });
  });
});

describe("assortment_rules constraints", () => {
  it("accepts Brand Variant include; rejects invalid include/exclude shapes and ancestry", async () => {
    await withMigratedPersistence(async (persistence) => {
      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "ar1"));
      const otherBrand = await persistence.transaction((tx) =>
        createBrand(tx, { code: `arx-${randomUUID().slice(0, 8)}`, name: "Other" }),
      );
      const targets = await seedCatalogTargets(persistence, tree.brand.id);
      const otherTargets = await seedCatalogTargets(persistence, otherBrand.id);
      const now = new Date().toISOString();

      await persistence.withContext(async (ctx) => {
        // Brand Variant include succeeds.
        await ctx.db.execute(sql`
          insert into app.assortment_rules (
            id, brand_id, scope_type, territory_id, organization_id, outlet_id,
            target_type, product_id, variant_id, modifier_option_id,
            decision, status, created_at
          ) values (
            ${randomUUID()}::uuid, ${tree.brand.id}::uuid, 'brand', null, null, null,
            'variant', null, ${targets.variantId}::uuid, null,
            'include', 'active', ${now}::timestamptz
          )
        `);

        // Brand Product include rejected (CHECK).
        await expectConstraintFailure(
          ctx.db.execute(sql`
            insert into app.assortment_rules (
              id, brand_id, scope_type, territory_id, organization_id, outlet_id,
              target_type, product_id, variant_id, modifier_option_id,
              decision, status, created_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, 'brand', null, null, null,
              'product', ${targets.productId}::uuid, null, null,
              'include', 'active', ${now}::timestamptz
            )
          `),
        );

        // Brand Modifier Option include rejected.
        await expectConstraintFailure(
          ctx.db.execute(sql`
            insert into app.assortment_rules (
              id, brand_id, scope_type, territory_id, organization_id, outlet_id,
              target_type, product_id, variant_id, modifier_option_id,
              decision, status, created_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, 'brand', null, null, null,
              'modifier_option', null, null, ${targets.modifierOptionId}::uuid,
              'include', 'active', ${now}::timestamptz
            )
          `),
        );

        // Territory / Organization / Outlet include rejected.
        for (const shape of [
          {
            scope: "territory",
            territoryId: tree.terrA.id,
            organizationId: null as string | null,
            outletId: null as string | null,
          },
          {
            scope: "organization",
            territoryId: null,
            organizationId: tree.orgA.id,
            outletId: null,
          },
          {
            scope: "outlet",
            territoryId: tree.terrA.id,
            organizationId: tree.orgA.id,
            outletId: tree.outletA.id,
          },
        ]) {
          await expectConstraintFailure(
            ctx.db.execute(sql`
              insert into app.assortment_rules (
                id, brand_id, scope_type, territory_id, organization_id, outlet_id,
                target_type, product_id, variant_id, modifier_option_id,
                decision, status, created_at
              ) values (
                ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${shape.scope},
                ${shape.territoryId}::uuid, ${shape.organizationId}::uuid, ${shape.outletId}::uuid,
                'variant', null, ${targets.variantId}::uuid, null,
                'include', 'active', ${now}::timestamptz
              )
            `),
          );
        }

        // Valid excludes: Product / Variant / Modifier Option at brand.
        await ctx.db.execute(sql`
          insert into app.assortment_rules (
            id, brand_id, scope_type, territory_id, organization_id, outlet_id,
            target_type, product_id, variant_id, modifier_option_id,
            decision, status, created_at
          ) values
            (${randomUUID()}::uuid, ${tree.brand.id}::uuid, 'brand', null, null, null,
             'product', ${targets.productId}::uuid, null, null,
             'exclude', 'active', ${now}::timestamptz),
            (${randomUUID()}::uuid, ${tree.brand.id}::uuid, 'territory', ${tree.terrA.id}::uuid, null, null,
             'variant', null, ${targets.variantId}::uuid, null,
             'exclude', 'active', ${now}::timestamptz),
            (${randomUUID()}::uuid, ${tree.brand.id}::uuid, 'organization', null, ${tree.orgA.id}::uuid, null,
             'modifier_option', null, null, ${targets.modifierOptionId}::uuid,
             'exclude', 'active', ${now}::timestamptz),
            (${randomUUID()}::uuid, ${tree.brand.id}::uuid, 'outlet',
             ${tree.terrA.id}::uuid, ${tree.orgA.id}::uuid, ${tree.outletA.id}::uuid,
             'product', ${targets.productId}::uuid, null, null,
             'exclude', 'active', ${now}::timestamptz)
        `);

        // Scope-shape CHECK: brand with territory id.
        await expectConstraintFailure(
          ctx.db.execute(sql`
            insert into app.assortment_rules (
              id, brand_id, scope_type, territory_id, organization_id, outlet_id,
              target_type, product_id, variant_id, modifier_option_id,
              decision, status, created_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, 'brand', ${tree.terrA.id}::uuid, null, null,
              'variant', null, ${targets.variantId}::uuid, null,
              'exclude', 'active', ${now}::timestamptz
            )
          `),
        );

        // Target-shape CHECK: variant target with product_id set.
        await expectConstraintFailure(
          ctx.db.execute(sql`
            insert into app.assortment_rules (
              id, brand_id, scope_type, territory_id, organization_id, outlet_id,
              target_type, product_id, variant_id, modifier_option_id,
              decision, status, created_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, 'brand', null, null, null,
              'variant', ${targets.productId}::uuid, ${targets.variantId}::uuid, null,
              'exclude', 'active', ${now}::timestamptz
            )
          `),
        );

        // Cross-Brand target rejected (composite FK).
        await expectConstraintFailure(
          ctx.db.execute(sql`
            insert into app.assortment_rules (
              id, brand_id, scope_type, territory_id, organization_id, outlet_id,
              target_type, product_id, variant_id, modifier_option_id,
              decision, status, created_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, 'brand', null, null, null,
              'variant', null, ${otherTargets.variantId}::uuid, null,
              'include', 'active', ${now}::timestamptz
            )
          `),
        );

        // Outlet ancestry mismatch rejected.
        await expectConstraintFailure(
          ctx.db.execute(sql`
            insert into app.assortment_rules (
              id, brand_id, scope_type, territory_id, organization_id, outlet_id,
              target_type, product_id, variant_id, modifier_option_id,
              decision, status, created_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, 'outlet',
              ${tree.terrB.id}::uuid, ${tree.orgA.id}::uuid, ${tree.outletA.id}::uuid,
              'product', ${targets.productId}::uuid, null, null,
              'exclude', 'active', ${now}::timestamptz
            )
          `),
        );
      });
    });
  });

  it("enforces active-rule uniqueness for brand variant include", async () => {
    await withMigratedPersistence(async (persistence) => {
      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "aru"));
      const targets = await seedCatalogTargets(persistence, tree.brand.id);
      const now = new Date().toISOString();

      await persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          insert into app.assortment_rules (
            id, brand_id, scope_type, territory_id, organization_id, outlet_id,
            target_type, product_id, variant_id, modifier_option_id,
            decision, status, created_at
          ) values (
            ${randomUUID()}::uuid, ${tree.brand.id}::uuid, 'brand', null, null, null,
            'variant', null, ${targets.variantId}::uuid, null,
            'include', 'active', ${now}::timestamptz
          )
        `);
        await expectConstraintFailure(
          ctx.db.execute(sql`
            insert into app.assortment_rules (
              id, brand_id, scope_type, territory_id, organization_id, outlet_id,
              target_type, product_id, variant_id, modifier_option_id,
              decision, status, created_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, 'brand', null, null, null,
              'variant', null, ${targets.variantId}::uuid, null,
              'include', 'active', ${now}::timestamptz
            )
          `),
        );
      });
    });
  });
});

describe("availability and operating constraints", () => {
  it("constrains availability state/expiry, uniqueness, and cross-brand FK", async () => {
    await withMigratedPersistence(async (persistence) => {
      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "av1"));
      const otherBrand = await persistence.transaction((tx) =>
        createBrand(tx, { code: `avx-${randomUUID().slice(0, 8)}`, name: "Other" }),
      );
      const targets = await seedCatalogTargets(persistence, tree.brand.id);
      const otherTargets = await seedCatalogTargets(persistence, otherBrand.id);
      const user = await createEligibleWorkforceUser(persistence);
      const now = new Date().toISOString();

      await persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          insert into app.outlet_variant_availability (
            id, brand_id, organization_id, territory_id, outlet_id, variant_id,
            state, unavailable_until, updated_by_workforce_user_id, created_at, updated_at
          ) values (
            ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${tree.orgA.id}::uuid,
            ${tree.terrA.id}::uuid, ${tree.outletA.id}::uuid, ${targets.variantId}::uuid,
            'available', null, ${user.id}, ${now}::timestamptz, ${now}::timestamptz
          )
        `);

        // Invalid state.
        await expectConstraintFailure(
          ctx.db.execute(sql`
            insert into app.outlet_variant_availability (
              id, brand_id, organization_id, territory_id, outlet_id, variant_id,
              state, unavailable_until, updated_by_workforce_user_id, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${tree.orgA.id}::uuid,
              ${tree.terrA.id}::uuid, ${tree.outletA.id}::uuid, ${targets.variantId}::uuid,
              'closed', null, ${user.id}, ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        );

        // available/sold_out require null expiry — use a different variant via unique pair.
        const variant2 = randomUUID();
        await ctx.db.execute(sql`
          insert into app.catalog_variants (
            id, brand_id, product_id, code, name, product_kind, is_default,
            is_selector_visible, lifecycle_status, created_at, updated_at
          ) values (
            ${variant2}::uuid, ${tree.brand.id}::uuid, ${targets.productId}::uuid, 'v2', 'V2',
            'standard', false, true, 'draft', ${now}::timestamptz, ${now}::timestamptz
          )
        `);
        await expectConstraintFailure(
          ctx.db.execute(sql`
            insert into app.outlet_variant_availability (
              id, brand_id, organization_id, territory_id, outlet_id, variant_id,
              state, unavailable_until, updated_by_workforce_user_id, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${tree.orgA.id}::uuid,
              ${tree.terrA.id}::uuid, ${tree.outletA.id}::uuid, ${variant2}::uuid,
              'sold_out', ${now}::timestamptz, ${user.id}, ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        );

        // Unique outlet+variant.
        await expectConstraintFailure(
          ctx.db.execute(sql`
            insert into app.outlet_variant_availability (
              id, brand_id, organization_id, territory_id, outlet_id, variant_id,
              state, unavailable_until, updated_by_workforce_user_id, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${tree.orgA.id}::uuid,
              ${tree.terrA.id}::uuid, ${tree.outletA.id}::uuid, ${targets.variantId}::uuid,
              'sold_out', null, ${user.id}, ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        );

        // Cross-Brand rejected.
        await expectConstraintFailure(
          ctx.db.execute(sql`
            insert into app.outlet_variant_availability (
              id, brand_id, organization_id, territory_id, outlet_id, variant_id,
              state, unavailable_until, updated_by_workforce_user_id, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${tree.orgA.id}::uuid,
              ${tree.terrA.id}::uuid, ${tree.outletA.id}::uuid, ${otherTargets.variantId}::uuid,
              'available', null, ${user.id}, ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        );

        // Modifier option uniqueness + sold_out expiry.
        await ctx.db.execute(sql`
          insert into app.outlet_modifier_option_availability (
            id, brand_id, organization_id, territory_id, outlet_id, modifier_option_id,
            state, unavailable_until, updated_by_workforce_user_id, created_at, updated_at
          ) values (
            ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${tree.orgA.id}::uuid,
            ${tree.terrA.id}::uuid, ${tree.outletA.id}::uuid, ${targets.modifierOptionId}::uuid,
            'available', null, ${user.id}, ${now}::timestamptz, ${now}::timestamptz
          )
        `);
        await expectConstraintFailure(
          ctx.db.execute(sql`
            insert into app.outlet_modifier_option_availability (
              id, brand_id, organization_id, territory_id, outlet_id, modifier_option_id,
              state, unavailable_until, updated_by_workforce_user_id, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${tree.orgA.id}::uuid,
              ${tree.terrA.id}::uuid, ${tree.outletA.id}::uuid, ${targets.modifierOptionId}::uuid,
              'sold_out', null, ${user.id}, ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        );
      });
    });
  });

  it("constrains operating control states, one profile per outlet, and interval bounds", async () => {
    await withMigratedPersistence(async (persistence) => {
      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "op1"));
      const user = await createEligibleWorkforceUser(persistence);
      const now = new Date().toISOString();

      await persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          insert into app.outlet_operating_profiles (
            id, brand_id, organization_id, territory_id, outlet_id, timezone,
            control_state, paused_until, updated_by_workforce_user_id, created_at, updated_at
          ) values (
            ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${tree.orgA.id}::uuid,
            ${tree.terrA.id}::uuid, ${tree.outletA.id}::uuid, 'Asia/Kolkata',
            'accepting', null, ${user.id}, ${now}::timestamptz, ${now}::timestamptz
          )
        `);

        // closed_by_schedule cannot persist.
        await expectConstraintFailure(
          ctx.db.execute(sql`
            update app.outlet_operating_profiles
            set control_state = 'closed_by_schedule'
            where outlet_id = ${tree.outletA.id}::uuid
          `),
        );

        // One profile per outlet.
        await expectConstraintFailure(
          ctx.db.execute(sql`
            insert into app.outlet_operating_profiles (
              id, brand_id, organization_id, territory_id, outlet_id, timezone,
              control_state, paused_until, updated_by_workforce_user_id, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${tree.orgA.id}::uuid,
              ${tree.terrA.id}::uuid, ${tree.outletA.id}::uuid, 'Asia/Kolkata',
              'paused', null, ${user.id}, ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        );

        // Valid interval.
        await ctx.db.execute(sql`
          insert into app.outlet_operating_intervals (
            id, brand_id, organization_id, territory_id, outlet_id,
            day_of_week, start_minute, end_minute, created_at, updated_at
          ) values (
            ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${tree.orgA.id}::uuid,
            ${tree.terrA.id}::uuid, ${tree.outletA.id}::uuid,
            1, 600, 1200, ${now}::timestamptz, ${now}::timestamptz
          )
        `);

        // day/minute bounds; start < end.
        await expectConstraintFailure(
          ctx.db.execute(sql`
            insert into app.outlet_operating_intervals (
              id, brand_id, organization_id, territory_id, outlet_id,
              day_of_week, start_minute, end_minute, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${tree.orgA.id}::uuid,
              ${tree.terrA.id}::uuid, ${tree.outletA.id}::uuid,
              7, 600, 1200, ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        );
        await expectConstraintFailure(
          ctx.db.execute(sql`
            insert into app.outlet_operating_intervals (
              id, brand_id, organization_id, territory_id, outlet_id,
              day_of_week, start_minute, end_minute, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${tree.orgA.id}::uuid,
              ${tree.terrA.id}::uuid, ${tree.outletA.id}::uuid,
              2, 1200, 600, ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        );

        // Ancestry mismatch.
        await expectConstraintFailure(
          ctx.db.execute(sql`
            insert into app.outlet_operating_intervals (
              id, brand_id, organization_id, territory_id, outlet_id,
              day_of_week, start_minute, end_minute, created_at, updated_at
            ) values (
              ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${tree.orgA.id}::uuid,
              ${tree.terrB.id}::uuid, ${tree.outletA.id}::uuid,
              3, 0, 60, ${now}::timestamptz, ${now}::timestamptz
            )
          `),
        );
      });
    });
  });
});

describe("assortment privilege REVOKE", () => {
  it("denies DELETE/TRUNCATE and audit UPDATE/DELETE for an app-shaped role", async () => {
    await withMigratedPersistence(async (persistence, database) => {
      const tree = await persistence.transaction((tx) => seedBrandTree(tx, "apriv"));
      const targets = await seedCatalogTargets(persistence, tree.brand.id);
      const user = await createEligibleWorkforceUser(persistence);
      const ruleId = randomUUID();
      const availId = randomUUID();
      const auditId = randomUUID();
      const now = new Date().toISOString();

      await persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          insert into app.assortment_rules (
            id, brand_id, scope_type, territory_id, organization_id, outlet_id,
            target_type, product_id, variant_id, modifier_option_id,
            decision, status, created_at
          ) values (
            ${ruleId}::uuid, ${tree.brand.id}::uuid, 'brand', null, null, null,
            'variant', null, ${targets.variantId}::uuid, null,
            'include', 'active', ${now}::timestamptz
          )
        `);
        await ctx.db.execute(sql`
          insert into app.outlet_variant_availability (
            id, brand_id, organization_id, territory_id, outlet_id, variant_id,
            state, unavailable_until, updated_by_workforce_user_id, created_at, updated_at
          ) values (
            ${availId}::uuid, ${tree.brand.id}::uuid, ${tree.orgA.id}::uuid,
            ${tree.terrA.id}::uuid, ${tree.outletA.id}::uuid, ${targets.variantId}::uuid,
            'available', null, ${user.id}, ${now}::timestamptz, ${now}::timestamptz
          )
        `);
        await ctx.db.execute(sql`
          insert into app.assortment_availability_audit_events (
            id, actor_workforce_user_id, action, brand_id, target_type, target_id,
            occurred_at, metadata
          ) values (
            ${auditId}::uuid, ${user.id}, 'assortment.brand_variant_included',
            ${tree.brand.id}::uuid, 'variant', ${targets.variantId}::uuid,
            ${now}::timestamptz, '{}'::jsonb
          )
        `);
        await ctx.db.execute(sql`
          insert into app.outlet_operating_profiles (
            id, brand_id, organization_id, territory_id, outlet_id, timezone,
            control_state, paused_until, updated_by_workforce_user_id, created_at, updated_at
          ) values (
            ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${tree.orgA.id}::uuid,
            ${tree.terrA.id}::uuid, ${tree.outletA.id}::uuid, 'Asia/Kolkata',
            'accepting', null, ${user.id}, ${now}::timestamptz, ${now}::timestamptz
          )
        `);
        await ctx.db.execute(sql`
          insert into app.outlet_operating_intervals (
            id, brand_id, organization_id, territory_id, outlet_id,
            day_of_week, start_minute, end_minute, created_at, updated_at
          ) values (
            ${randomUUID()}::uuid, ${tree.brand.id}::uuid, ${tree.orgA.id}::uuid,
            ${tree.terrA.id}::uuid, ${tree.outletA.id}::uuid,
            0, 0, 1440, ${now}::timestamptz, ${now}::timestamptz
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
              ctx.db.execute(sql`delete from app.assortment_rules where id = ${ruleId}::uuid`),
            );
            await expectPermissionDenied(
              ctx.db.execute(
                sql`delete from app.outlet_variant_availability where id = ${availId}::uuid`,
              ),
            );
            await expectPermissionDenied(ctx.db.execute(sql`truncate app.assortment_rules`));
            await expectPermissionDenied(
              ctx.db.execute(sql`truncate app.outlet_operating_intervals`),
            );
            await expectPermissionDenied(
              ctx.db.execute(sql`
                update app.assortment_availability_audit_events
                set action = 'tampered' where id = ${auditId}::uuid
              `),
            );
            await expectPermissionDenied(
              ctx.db.execute(sql`
                delete from app.assortment_availability_audit_events where id = ${auditId}::uuid
              `),
            );
          });
        },
      );
    });
  });
});
