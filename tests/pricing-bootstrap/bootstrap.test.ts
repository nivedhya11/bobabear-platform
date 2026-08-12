/**
 * Pricing bootstrap tests (IMP-015).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import {
  BOOTSTRAP_PRICE_BOOK_ID,
  TAX_CATEGORY_RESTAURANT_SERVICE_ID,
} from "../../src/shared/pricing";
import {
  PricingBootstrapError,
  bootstrapExistingMenuPricing,
  deriveExistingMenuVariantPrices,
  verifyExistingMenuPricing,
} from "../../src/server/pricing";
import { runExistingMenuImport } from "../../src/server/catalog/menu-import";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  legalEntityTaxProfilesTable,
  outletTaxProfilesTable,
  priceBookChargePricesTable,
  priceBookVariantPricesTable,
  priceBooksTable,
} from "../../src/platform/database/schema/pricing";
import {
  adminConnectionInfo,
  applicationConfig,
} from "../assortment-availability/support";
import { applyMigrations, withIsolatedTestDatabase } from "../database/support/test-database";

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
});

describe("pricing bootstrap existing-menu", () => {
  it("derives variant prices from static source without hard-coding 74", () => {
    const derived = deriveExistingMenuVariantPrices(process.cwd());
    const artifact = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "data/platform/pricing/existing-menu-pricing-v1.json"),
        "utf8",
      ),
    ) as { variant_prices: unknown[]; source_inventory_sha256: string };
    expect(derived.length).toBe(artifact.variant_prices.length);
    expect(derived.length).toBeGreaterThan(0);
    // Evidence for current menu size — not a production constant.
    expect(derived.length).toBe(74);

    const menuBytes = readFileSync(path.join(process.cwd(), "src/data/menu.json"));
    // Artifact digest must match the frozen existing-menu-v1 inventory digest, not a live rehash of menu.json alone.
    expect(artifact.source_inventory_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(createHash("sha256").update(menuBytes).digest("hex")).toHaveLength(64);
  });

  it("dry-run writes nothing; apply then NO_CHANGES; verify; no charges/GSTIN", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      await runExistingMenuImport({
        projectRoot: process.cwd(),
        persistence,
        apply: true,
      });

      const dry = await bootstrapExistingMenuPricing({
        projectRoot: process.cwd(),
        persistence,
        apply: false,
      });
      expect(dry.outcome).toBe("WOULD_CREATE");
      expect(dry.derivedVariantPriceCount).toBe(74);

      await persistence.withContext(async (ctx) => {
        const books = await ctx.db.select().from(priceBooksTable);
        expect(books).toHaveLength(0);
      });

      const first = await bootstrapExistingMenuPricing({
        projectRoot: process.cwd(),
        persistence,
        apply: true,
      });
      expect(first.outcome).toBe("APPLIED");

      const verified = await verifyExistingMenuPricing({
        projectRoot: process.cwd(),
        persistence,
      });
      expect(verified.ok).toBe(true);
      expect(verified.matchedVariantPriceCount).toBe(74);

      await persistence.withContext(async (ctx) => {
        const books = await ctx.db
          .select()
          .from(priceBooksTable)
          .where(eq(priceBooksTable.id, BOOTSTRAP_PRICE_BOOK_ID));
        expect(books).toHaveLength(1);
        expect(books[0]?.scopeType).toBe("brand");
        expect(books[0]?.taxInclusionMode).toBe("exclusive");

        const prices = await ctx.db
          .select()
          .from(priceBookVariantPricesTable)
          .where(eq(priceBookVariantPricesTable.priceBookId, BOOTSTRAP_PRICE_BOOK_ID));
        expect(prices).toHaveLength(74);
        for (const row of prices) {
          expect(row.allowTerritoryOverride).toBe(false);
          expect(row.allowOrganizationOverride).toBe(false);
          expect(row.allowOutletOverride).toBe(false);
          expect(row.taxCategoryId).toBe(TAX_CATEGORY_RESTAURANT_SERVICE_ID);
        }

        const charges = await ctx.db.select().from(priceBookChargePricesTable);
        expect(charges).toHaveLength(0);
        const leProfiles = await ctx.db.select().from(legalEntityTaxProfilesTable);
        expect(leProfiles).toHaveLength(0);
        const outletProfiles = await ctx.db.select().from(outletTaxProfilesTable);
        expect(outletProfiles).toHaveLength(0);
      });

      const second = await bootstrapExistingMenuPricing({
        projectRoot: process.cwd(),
        persistence,
        apply: true,
      });
      expect(second.outcome).toBe("NO_CHANGES");
    });
  });

  it("fails closed on bootstrap conflict when a Variant price was manually changed", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);

      await runExistingMenuImport({
        projectRoot: process.cwd(),
        persistence,
        apply: true,
      });
      await bootstrapExistingMenuPricing({
        projectRoot: process.cwd(),
        persistence,
        apply: true,
      });

      await persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select()
          .from(priceBookVariantPricesTable)
          .where(eq(priceBookVariantPricesTable.priceBookId, BOOTSTRAP_PRICE_BOOK_ID))
          .limit(1);
        const row = rows[0]!;
        await ctx.db
          .update(priceBookVariantPricesTable)
          .set({ amountPaise: row.amountPaise + BigInt(1) })
          .where(eq(priceBookVariantPricesTable.id, row.id));
      });

      await expect(
        bootstrapExistingMenuPricing({
          projectRoot: process.cwd(),
          persistence,
          apply: true,
        }),
      ).rejects.toBeInstanceOf(PricingBootstrapError);
      await expect(
        bootstrapExistingMenuPricing({
          projectRoot: process.cwd(),
          persistence,
          apply: true,
        }),
      ).rejects.toMatchObject({ pricingErrorCode: "PRICING_BOOTSTRAP_CONFLICT" });
    });
  });
});
