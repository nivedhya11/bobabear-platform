/**
 * Fixed existing-menu-v1 importer integration tests (IMP-013).
 * Real Testcontainers PostgreSQL 18 — dry-run / apply / conflict / preserve.
 */
import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, inject, it } from "vitest";

import type { WebConfig } from "../../src/platform/config";
import { catalogProductsTable } from "../../src/platform/database/schema/catalog";
import {
  menuEntriesTable,
  menusTable,
  menuSectionsTable,
} from "../../src/platform/database/schema/menu";
import { brandsTable } from "../../src/platform/database/schema/organizations";
import {
  MenuImportError,
  rejectArbitraryManifestPath,
  runExistingMenuImport,
} from "../../src/server/catalog/menu-import";
import { createBrand } from "../../src/server/organization";
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

async function withMigratedPersistence<T>(
  fn: (persistence: ReturnType<typeof getApplicationPersistence>) => Promise<T>,
): Promise<T> {
  return withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
    await applyMigrations(database.connectionString);
    const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
    openHandles.push(persistence);
    return fn(persistence);
  });
}

async function countRows(
  persistence: ReturnType<typeof getApplicationPersistence>,
  table: "catalog_products" | "menus" | "menu_sections" | "menu_entries" | "brands",
): Promise<number> {
  return persistence.withContext(async (ctx) => {
    const result = await ctx.db.execute<{ count: string }>(
      sql.raw(`select count(*)::text as count from app.${table}`),
    );
    return Number(result.rows[0]?.count ?? 0);
  });
}

describe("runExistingMenuImport", () => {
  it("dry-run writes nothing", async () => {
    await withMigratedPersistence(async (persistence) => {
      const result = await runExistingMenuImport({
        projectRoot,
        persistence,
        apply: false,
      });
      expect(result.mode).toBe("dry-run");
      expect(result.outcome).toBe("WOULD_CREATE");
      expect(result.counts.created).toBeGreaterThan(0);

      expect(await countRows(persistence, "brands")).toBe(0);
      expect(await countRows(persistence, "catalog_products")).toBe(0);
      expect(await countRows(persistence, "menus")).toBe(0);
      expect(await countRows(persistence, "menu_sections")).toBe(0);
      expect(await countRows(persistence, "menu_entries")).toBe(0);
    });
  });

  it("first apply inserts owned rows; second apply is NO_CHANGES", async () => {
    await withMigratedPersistence(async (persistence) => {
      const first = await runExistingMenuImport({
        projectRoot,
        persistence,
        apply: true,
      });
      expect(first.mode).toBe("apply");
      expect(first.outcome).toBe("APPLIED");
      expect(first.counts.products).toBeGreaterThan(0);
      expect(await countRows(persistence, "catalog_products")).toBe(first.counts.products);
      expect(await countRows(persistence, "menus")).toBe(1);
      expect(await countRows(persistence, "menu_sections")).toBe(first.counts.sections);
      expect(await countRows(persistence, "menu_entries")).toBe(first.counts.entries);

      const second = await runExistingMenuImport({
        projectRoot,
        persistence,
        apply: true,
      });
      expect(second.outcome).toBe("NO_CHANGES");
      expect(second.counts.created).toBe(0);
      expect(second.counts.conflicts).toBe(0);
      expect(await countRows(persistence, "catalog_products")).toBe(first.counts.products);
    });
  });

  it("material conflict raises IMPORT_CONFLICT without overwriting", async () => {
    await withMigratedPersistence(async (persistence) => {
      const applied = await runExistingMenuImport({
        projectRoot,
        persistence,
        apply: true,
      });
      expect(applied.outcome).toBe("APPLIED");

      const targetId = applied.plan.find((p) => p.kind === "product" && p.action === "create")?.id;
      expect(targetId).toBeTruthy();

      await persistence.withContext(async (ctx) => {
        await ctx.db
          .update(catalogProductsTable)
          .set({ name: "TAMPERED-NAME-SHOULD-NOT-BE-OVERWRITTEN" })
          .where(eq(catalogProductsTable.id, targetId!));
      });

      await expect(
        runExistingMenuImport({ projectRoot, persistence, apply: true }),
      ).rejects.toMatchObject({
        name: "MenuImportError",
        code: "IMPORT_CONFLICT",
      });

      const name = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select({ name: catalogProductsTable.name })
          .from(catalogProductsTable)
          .where(eq(catalogProductsTable.id, targetId!))
          .limit(1);
        return rows[0]?.name;
      });
      expect(name).toBe("TAMPERED-NAME-SHOULD-NOT-BE-OVERWRITTEN");
    });
  });

  it("preserves an unknown unrelated product row outside the manifest", async () => {
    await withMigratedPersistence(async (persistence) => {
      const brand = await persistence.transaction((tx) =>
        createBrand(tx, { code: "boba-bear", name: "BOBA Bear" }),
      );
      const unrelatedId = randomUUID();
      const now = new Date();
      await persistence.withContext(async (ctx) => {
        await ctx.db.insert(catalogProductsTable).values({
          id: unrelatedId,
          brandId: brand.id,
          code: "unrelated-legacy-item",
          name: "Unrelated Legacy Item",
          description: "Not in existing-menu-v1",
          productKind: "standard",
          lifecycleStatus: "draft",
          createdAt: now,
          updatedAt: now,
          activatedAt: null,
          retiredAt: null,
        });
      });

      const result = await runExistingMenuImport({
        projectRoot,
        persistence,
        apply: true,
      });
      expect(result.outcome).toBe("APPLIED");

      const stillThere = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select({ id: catalogProductsTable.id, code: catalogProductsTable.code })
          .from(catalogProductsTable)
          .where(eq(catalogProductsTable.id, unrelatedId))
          .limit(1);
        return rows[0];
      });
      expect(stillThere?.code).toBe("unrelated-legacy-item");
      expect(await countRows(persistence, "catalog_products")).toBe(result.counts.products + 1);
    });
  });

  it("rolls back atomically when a conflict occurs mid-apply", async () => {
    await withMigratedPersistence(async (persistence) => {
      // Pre-create brand with conflicting identity so evaluate fails on first owned write path.
      await persistence.withContext(async (ctx) => {
        const now = new Date();
        await ctx.db.insert(brandsTable).values({
          id: randomUUID(),
          code: "boba-bear",
          name: "Wrong Brand Name",
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
      });

      await expect(
        runExistingMenuImport({ projectRoot, persistence, apply: true }),
      ).rejects.toBeInstanceOf(MenuImportError);

      expect(await countRows(persistence, "catalog_products")).toBe(0);
      expect(await countRows(persistence, "menus")).toBe(0);
      expect(await countRows(persistence, "menu_sections")).toBe(0);
      expect(await countRows(persistence, "menu_entries")).toBe(0);
      // Pre-existing conflicting brand remains (it was outside the failed transaction writes).
      expect(await countRows(persistence, "brands")).toBe(1);
    });
  });

  it("rejects arbitrary manifest path flags at the CLI guard", () => {
    expect(() => rejectArbitraryManifestPath(["--file=/tmp/x.json"])).toThrow(MenuImportError);
  });
});

describe("importer owns only manifest IDs", () => {
  it("writes menus/sections/entries under the resolved brand", async () => {
    await withMigratedPersistence(async (persistence) => {
      const result = await runExistingMenuImport({
        projectRoot,
        persistence,
        apply: true,
      });
      expect(result.outcome).toBe("APPLIED");

      await persistence.withContext(async (ctx) => {
        const menus = await ctx.db.select().from(menusTable);
        expect(menus).toHaveLength(1);
        expect(menus[0]?.brandId).toBe(result.brandId);
        expect(menus[0]?.code).toBe("primary");
        expect(menus[0]?.lifecycleStatus).toBe("active");

        const sections = await ctx.db.select().from(menuSectionsTable);
        expect(sections.every((s) => s.brandId === result.brandId)).toBe(true);
        expect(sections.every((s) => s.menuId === menus[0]!.id)).toBe(true);

        const entries = await ctx.db.select().from(menuEntriesTable);
        expect(entries.every((e) => e.brandId === result.brandId)).toBe(true);
        expect(entries.every((e) => e.position >= 0)).toBe(true);
      });
    });
  });
});
