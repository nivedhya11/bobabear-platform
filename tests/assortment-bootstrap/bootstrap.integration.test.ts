/**
 * Existing-menu Brand assortment bootstrap tests (IMP-014).
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, inject, it } from "vitest";

import type { WebConfig } from "../../src/platform/config";
import {
  bootstrapExistingMenuAssortment,
} from "../../src/server/assortment/bootstrap";
import { runExistingMenuImport } from "../../src/server/catalog/menu-import";
import { getApplicationPersistence } from "../../src/server/persistence";
import { applyMigrations, withIsolatedTestDatabase } from "../database/support/test-database";

const projectRoot = process.cwd();

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

function loadManifestProductCount(): number {
  const manifest = JSON.parse(
    readFileSync(path.join(projectRoot, "data/platform/imports/existing-menu-v1.json"), "utf8"),
  ) as { products: unknown[] };
  return manifest.products.length;
}

async function withImportedMenu<T>(
  fn: (persistence: ReturnType<typeof getApplicationPersistence>) => Promise<T>,
): Promise<T> {
  return withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
    await applyMigrations(database.connectionString);
    const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
    openHandles.push(persistence);
    await runExistingMenuImport({ projectRoot, persistence, apply: true });
    return fn(persistence);
  });
}

async function countAssortmentRules(
  persistence: ReturnType<typeof getApplicationPersistence>,
): Promise<number> {
  return persistence.withContext(async (ctx) => {
    const result = await ctx.db.execute<{ count: string }>(
      sql`select count(*)::text as count from app.assortment_rules`,
    );
    return Number(result.rows[0]?.count ?? 0);
  });
}

describe("assortment bootstrap existing-menu-v1", () => {
  it("dry-run writes zero assortment_rules", async () => {
    await withImportedMenu(async (persistence) => {
      const before = await countAssortmentRules(persistence);
      const result = await bootstrapExistingMenuAssortment({
        projectRoot,
        persistence,
        apply: false,
      });
      expect(result.mode).toBe("dry-run");
      expect(result.outcome).toBe("WOULD_CREATE");
      expect(result.derivedVariantCount).toBe(loadManifestProductCount());
      expect(result.counts.created).toBe(result.derivedVariantCount);
      expect(await countAssortmentRules(persistence)).toBe(before);
    });
  });

  it("first apply creates derived Brand Variant includes; second apply is NO_CHANGES", async () => {
    await withImportedMenu(async (persistence) => {
      const derived = loadManifestProductCount();
      const first = await bootstrapExistingMenuAssortment({
        projectRoot,
        persistence,
        apply: true,
      });
      expect(first.mode).toBe("apply");
      expect(first.outcome).toBe("APPLIED");
      expect(first.counts.created).toBe(derived);
      expect(await countAssortmentRules(persistence)).toBe(derived);

      await persistence.withContext(async (ctx) => {
        const scopes = await ctx.db.execute<{ scope_type: string; decision: string }>(sql`
          select distinct scope_type, decision from app.assortment_rules
        `);
        expect(scopes.rows).toEqual([{ scope_type: "brand", decision: "include" }]);

        const avail = await ctx.db.execute<{ count: string }>(
          sql`select count(*)::text as count from app.outlet_variant_availability`,
        );
        expect(avail.rows[0]?.count).toBe("0");

        const profiles = await ctx.db.execute<{ count: string }>(
          sql`select count(*)::text as count from app.outlet_operating_profiles`,
        );
        expect(profiles.rows[0]?.count).toBe("0");

        const outlets = await ctx.db.execute<{ count: string }>(
          sql`select count(*)::text as count from app.outlets`,
        );
        expect(outlets.rows[0]?.count).toBe("0");

        const audits = await ctx.db.execute<{ action: string }>(sql`
          select action from app.assortment_availability_audit_events
          where action = 'assortment.existing_menu_bootstrapped'
        `);
        expect(audits.rows.length).toBe(1);
      });

      const second = await bootstrapExistingMenuAssortment({
        projectRoot,
        persistence,
        apply: true,
      });
      expect(second.outcome).toBe("NO_CHANGES");
      expect(second.counts.created).toBe(0);
      expect(second.counts.unchanged).toBe(derived);
      expect(await countAssortmentRules(persistence)).toBe(derived);
    });
  });

  it("conflict when an active brand exclude blocks bootstrap include", async () => {
    await withImportedMenu(async (persistence) => {
      const manifest = JSON.parse(
        readFileSync(path.join(projectRoot, "data/platform/imports/existing-menu-v1.json"), "utf8"),
      ) as { products: Array<{ variant: { id: string } }>; brand: { code: string } };

      const brand = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute<{ id: string }>(
          sql`select id from app.brands where code = ${manifest.brand.code} limit 1`,
        );
        return rows.rows[0]!.id;
      });

      const conflictingVariantId = manifest.products[0]!.variant.id;
      const now = new Date().toISOString();
      await persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          insert into app.assortment_rules (
            id, brand_id, scope_type, territory_id, organization_id, outlet_id,
            target_type, product_id, variant_id, modifier_option_id,
            decision, status, created_at
          ) values (
            ${randomUUID()}::uuid, ${brand}::uuid, 'brand', null, null, null,
            'variant', null, ${conflictingVariantId}::uuid, null,
            'exclude', 'active', ${now}::timestamptz
          )
        `);
      });

      await expect(
        bootstrapExistingMenuAssortment({ projectRoot, persistence, apply: true }),
      ).rejects.toMatchObject({
        name: "AssortmentBootstrapError",
        assortmentErrorCode: "BOOTSTRAP_CONFLICT",
      });
    });
  });

  it("preserves unrelated assortment rows", async () => {
    await withImportedMenu(async (persistence) => {
      const manifest = JSON.parse(
        readFileSync(path.join(projectRoot, "data/platform/imports/existing-menu-v1.json"), "utf8"),
      ) as { brand: { code: string } };

      // Create an unrelated brand + product/variant + include (not from manifest).
      const unrelatedBrandId = randomUUID();
      const productId = randomUUID();
      const variantId = randomUUID();
      const ruleId = randomUUID();
      const now = new Date().toISOString();

      await persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          insert into app.brands (id, code, name, status, created_at, updated_at)
          values (
            ${unrelatedBrandId}::uuid, 'other-brand', 'Other', 'active',
            ${now}::timestamptz, ${now}::timestamptz
          )
        `);
        await ctx.db.execute(sql`
          insert into app.catalog_products (
            id, brand_id, code, name, product_kind, lifecycle_status, created_at, updated_at
          ) values (
            ${productId}::uuid, ${unrelatedBrandId}::uuid, 'u', 'U', 'standard',
            'draft', ${now}::timestamptz, ${now}::timestamptz
          )
        `);
        await ctx.db.execute(sql`
          insert into app.catalog_variants (
            id, brand_id, product_id, code, name, product_kind, is_default,
            is_selector_visible, lifecycle_status, created_at, updated_at
          ) values (
            ${variantId}::uuid, ${unrelatedBrandId}::uuid, ${productId}::uuid, 'default', 'Default',
            'standard', true, false, 'draft', ${now}::timestamptz, ${now}::timestamptz
          )
        `);
        await ctx.db.execute(sql`
          insert into app.assortment_rules (
            id, brand_id, scope_type, territory_id, organization_id, outlet_id,
            target_type, product_id, variant_id, modifier_option_id,
            decision, status, created_at
          ) values (
            ${ruleId}::uuid, ${unrelatedBrandId}::uuid, 'brand', null, null, null,
            'variant', null, ${variantId}::uuid, null,
            'include', 'active', ${now}::timestamptz
          )
        `);
      });

      const result = await bootstrapExistingMenuAssortment({
        projectRoot,
        persistence,
        apply: true,
      });
      expect(result.outcome).toBe("APPLIED");

      const stillThere = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute<{ id: string }>(
          sql`select id from app.assortment_rules where id = ${ruleId}::uuid`,
        );
        return rows.rows.length;
      });
      expect(stillThere).toBe(1);
      expect(await countAssortmentRules(persistence)).toBe(
        loadManifestProductCount() + 1,
      );

      void manifest;
    });
  });
});
