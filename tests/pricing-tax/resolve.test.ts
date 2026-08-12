/**
 * Pricing resolution hierarchy tests (IMP-015).
 */
import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  priceBookBundleOptionPricesTable,
  priceBookModifierPricesTable,
} from "../../src/platform/database/schema/pricing";
import { TAX_CATEGORY_RESTAURANT_SERVICE_ID } from "../../src/shared/pricing";
import {
  PricingConflictError,
  activatePriceBook,
  attachDraftVariantPrice,
  createDraftPriceBook,
  resolveBundleOptionPriceDelta,
  resolveModifierPriceDelta,
  resolveOutletVariantPrice,
} from "../../src/server/pricing";
import {
  activateBundleGroup,
  activateBundleOption,
  activateModifierGroup,
  activateModifierGroupOption,
  activateModifierOption,
  activateProduct,
  activateVariant,
  activateVariantModifierGroup,
  addBundleOption,
  addModifierOptionToGroup,
  applyModifierGroupToVariant,
  createBundleGroup,
  createModifierGroup,
  createModifierOption,
  createProduct,
  createVariant,
} from "../../src/server/catalog";
import {
  createActiveStandardVariant,
  withAssortmentDomain,
} from "../assortment-availability/support";

const AT = new Date("2026-08-08T12:00:00+05:30");

async function activateBrandBaseline(
  persistence: Parameters<Parameters<typeof withAssortmentDomain>[0]>[0],
  args: {
    actor: unknown;
    brandId: string;
    variantId: string;
    amountPaise: bigint;
    allowTerritoryOverride?: boolean;
    allowOrganizationOverride?: boolean;
    allowOutletOverride?: boolean;
    floorPaise?: bigint | null;
    ceilingPaise?: bigint | null;
    effectiveFrom?: Date;
    effectiveTo?: Date | null;
    taxInclusionMode?: "exclusive" | "inclusive";
    code?: string;
  },
): Promise<{ id: string }> {
  return persistence.transaction(async (tx) => {
    const book = await createDraftPriceBook(tx, {
      actor: args.actor,
      brandId: args.brandId,
      scopeType: "brand",
      code: args.code ?? `brand-${randomUUID().slice(0, 8)}`,
      name: "Brand book",
      taxInclusionMode: args.taxInclusionMode,
      effectiveFrom: args.effectiveFrom ?? new Date("2026-08-08T00:00:00+05:30"),
      effectiveTo: args.effectiveTo ?? null,
    });
    await attachDraftVariantPrice(tx, {
      actor: args.actor,
      priceBookId: book.id,
      brandId: args.brandId,
      variantId: args.variantId,
      amountPaise: args.amountPaise,
      taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
      allowTerritoryOverride: args.allowTerritoryOverride ?? false,
      allowOrganizationOverride: args.allowOrganizationOverride ?? false,
      allowOutletOverride: args.allowOutletOverride ?? false,
      floorPaise: args.floorPaise ?? null,
      ceilingPaise: args.ceilingPaise ?? null,
    });
    await activatePriceBook(tx, {
      actor: args.actor,
      priceBookId: book.id,
      brandId: args.brandId,
    });
    return book;
  });
}

describe("resolveOutletVariantPrice", () => {
  it("fails closed when Brand baseline is missing", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "noprice",
      );

      await expect(
        persistence.withContext((ctx) =>
          resolveOutletVariantPrice(ctx, {
            variantId: catalog.variantId,
            outletId: tree.outletA.id,
            at: AT,
          }),
        ),
      ).rejects.toMatchObject({ pricingErrorCode: "PRICE_MISSING" });
    });
  });

  it("resolves Brand baseline and rejects locked Outlet override", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor, outletManagerActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "priced",
      );

      const brandBook = await activateBrandBaseline(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(17900),
      });

      const resolved = await persistence.withContext((ctx) =>
        resolveOutletVariantPrice(ctx, {
          variantId: catalog.variantId,
          outletId: tree.outletA.id,
          at: AT,
        }),
      );
      expect(resolved.amountPaise).toBe(BigInt(17900));
      expect(resolved.brandPriceBookId).toBe(brandBook.id);
      expect(resolved.overrideScope).toBe("brand");

      await persistence.transaction(async (tx) => {
        const outletBook = await createDraftPriceBook(tx, {
          actor: outletManagerActor,
          brandId: tree.brand.id,
          scopeType: "outlet",
          territoryId: tree.terrA.id,
          organizationId: tree.orgA.id,
          outletId: tree.outletA.id,
          code: `outlet-${randomUUID().slice(0, 8)}`,
          name: "Outlet book",
          effectiveFrom: new Date("2026-08-08T00:00:00+05:30"),
        });
        await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          priceBookId: outletBook.id,
          brandId: tree.brand.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(19900),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
        });
        await activatePriceBook(tx, {
          actor: brandAdminActor,
          priceBookId: outletBook.id,
          brandId: tree.brand.id,
        });
      });

      await expect(
        persistence.withContext((ctx) =>
          resolveOutletVariantPrice(ctx, {
            variantId: catalog.variantId,
            outletId: tree.outletA.id,
            at: AT,
          }),
        ),
      ).rejects.toMatchObject({ pricingErrorCode: "OVERRIDE_NOT_PERMITTED" });
    });
  });

  it("permits Territory override when Brand delegates", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "terr-ok",
      );
      await activateBrandBaseline(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(17900),
        allowTerritoryOverride: true,
        floorPaise: BigInt(15000),
        ceilingPaise: BigInt(22000),
      });
      await persistence.transaction(async (tx) => {
        const book = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "territory",
          territoryId: tree.terrA.id,
          code: `terr-${randomUUID().slice(0, 8)}`,
          name: "Territory book",
          effectiveFrom: new Date("2026-08-08T00:00:00+05:30"),
        });
        await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          priceBookId: book.id,
          brandId: tree.brand.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(18900),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
        });
        await activatePriceBook(tx, {
          actor: brandAdminActor,
          priceBookId: book.id,
          brandId: tree.brand.id,
        });
      });

      const resolved = await persistence.withContext((ctx) =>
        resolveOutletVariantPrice(ctx, {
          variantId: catalog.variantId,
          outletId: tree.outletA.id,
          at: AT,
        }),
      );
      expect(resolved.amountPaise).toBe(BigInt(18900));
      expect(resolved.overrideScope).toBe("territory");
    });
  });

  it("rejects Territory override when Brand does not delegate", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "terr-no",
      );
      await activateBrandBaseline(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(17900),
        allowTerritoryOverride: false,
      });
      await persistence.transaction(async (tx) => {
        const book = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "territory",
          territoryId: tree.terrA.id,
          code: `terr-${randomUUID().slice(0, 8)}`,
          name: "Territory book",
          effectiveFrom: new Date("2026-08-08T00:00:00+05:30"),
        });
        await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          priceBookId: book.id,
          brandId: tree.brand.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(18900),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
        });
        await activatePriceBook(tx, {
          actor: brandAdminActor,
          priceBookId: book.id,
          brandId: tree.brand.id,
        });
      });

      await expect(
        persistence.withContext((ctx) =>
          resolveOutletVariantPrice(ctx, {
            variantId: catalog.variantId,
            outletId: tree.outletA.id,
            at: AT,
          }),
        ),
      ).rejects.toMatchObject({ pricingErrorCode: "OVERRIDE_NOT_PERMITTED" });
    });
  });

  it("lets Organization override win over Territory when both are permitted", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "org-win",
      );
      await activateBrandBaseline(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(17900),
        allowTerritoryOverride: true,
        allowOrganizationOverride: true,
        floorPaise: BigInt(10000),
        ceilingPaise: BigInt(30000),
      });
      await persistence.transaction(async (tx) => {
        const terr = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "territory",
          territoryId: tree.terrA.id,
          code: `terr-${randomUUID().slice(0, 8)}`,
          name: "Territory",
          effectiveFrom: new Date("2026-08-08T00:00:00+05:30"),
        });
        await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          priceBookId: terr.id,
          brandId: tree.brand.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(18500),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
        });
        await activatePriceBook(tx, {
          actor: brandAdminActor,
          priceBookId: terr.id,
          brandId: tree.brand.id,
        });

        const org = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "organization",
          organizationId: tree.orgA.id,
          code: `org-${randomUUID().slice(0, 8)}`,
          name: "Organization",
          effectiveFrom: new Date("2026-08-08T00:00:00+05:30"),
        });
        await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          priceBookId: org.id,
          brandId: tree.brand.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(19500),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
        });
        await activatePriceBook(tx, {
          actor: brandAdminActor,
          priceBookId: org.id,
          brandId: tree.brand.id,
        });
      });

      const resolved = await persistence.withContext((ctx) =>
        resolveOutletVariantPrice(ctx, {
          variantId: catalog.variantId,
          outletId: tree.outletA.id,
          at: AT,
        }),
      );
      expect(resolved.amountPaise).toBe(BigInt(19500));
      expect(resolved.overrideScope).toBe("organization");
    });
  });

  it("lets Outlet override win when Brand permits", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor, outletManagerActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "out-win",
      );
      await activateBrandBaseline(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(17900),
        allowOrganizationOverride: true,
        allowOutletOverride: true,
        floorPaise: BigInt(10000),
        ceilingPaise: BigInt(30000),
      });
      await persistence.transaction(async (tx) => {
        const org = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "organization",
          organizationId: tree.orgA.id,
          code: `org-${randomUUID().slice(0, 8)}`,
          name: "Organization",
          effectiveFrom: new Date("2026-08-08T00:00:00+05:30"),
        });
        await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          priceBookId: org.id,
          brandId: tree.brand.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(19000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
        });
        await activatePriceBook(tx, {
          actor: brandAdminActor,
          priceBookId: org.id,
          brandId: tree.brand.id,
        });

        const outlet = await createDraftPriceBook(tx, {
          actor: outletManagerActor,
          brandId: tree.brand.id,
          scopeType: "outlet",
          territoryId: tree.terrA.id,
          organizationId: tree.orgA.id,
          outletId: tree.outletA.id,
          code: `outlet-${randomUUID().slice(0, 8)}`,
          name: "Outlet",
          effectiveFrom: new Date("2026-08-08T00:00:00+05:30"),
        });
        await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          priceBookId: outlet.id,
          brandId: tree.brand.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(20500),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
        });
        await activatePriceBook(tx, {
          actor: brandAdminActor,
          priceBookId: outlet.id,
          brandId: tree.brand.id,
        });
      });

      const resolved = await persistence.withContext((ctx) =>
        resolveOutletVariantPrice(ctx, {
          variantId: catalog.variantId,
          outletId: tree.outletA.id,
          at: AT,
        }),
      );
      expect(resolved.amountPaise).toBe(BigInt(20500));
      expect(resolved.overrideScope).toBe("outlet");
    });
  });

  it("enforces Brand floor and ceiling on overrides", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "bounds",
      );
      await activateBrandBaseline(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(17900),
        allowTerritoryOverride: true,
        floorPaise: BigInt(17000),
        ceilingPaise: BigInt(19000),
      });

      await persistence.transaction(async (tx) => {
        const low = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "territory",
          territoryId: tree.terrA.id,
          code: `low-${randomUUID().slice(0, 8)}`,
          name: "Too low",
          effectiveFrom: new Date("2026-08-08T00:00:00+05:30"),
        });
        await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          priceBookId: low.id,
          brandId: tree.brand.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(16000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
        });
        await activatePriceBook(tx, {
          actor: brandAdminActor,
          priceBookId: low.id,
          brandId: tree.brand.id,
        });
      });
      await expect(
        persistence.withContext((ctx) =>
          resolveOutletVariantPrice(ctx, {
            variantId: catalog.variantId,
            outletId: tree.outletA.id,
            at: AT,
          }),
        ),
      ).rejects.toMatchObject({ pricingErrorCode: "OVERRIDE_OUT_OF_BOUNDS" });
    });

    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "ceil",
      );
      await activateBrandBaseline(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(17900),
        allowTerritoryOverride: true,
        floorPaise: BigInt(17000),
        ceilingPaise: BigInt(19000),
      });
      await persistence.transaction(async (tx) => {
        const high = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "territory",
          territoryId: tree.terrA.id,
          code: `high-${randomUUID().slice(0, 8)}`,
          name: "Too high",
          effectiveFrom: new Date("2026-08-08T00:00:00+05:30"),
        });
        await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          priceBookId: high.id,
          brandId: tree.brand.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(20000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
        });
        await activatePriceBook(tx, {
          actor: brandAdminActor,
          priceBookId: high.id,
          brandId: tree.brand.id,
        });
      });
      await expect(
        persistence.withContext((ctx) =>
          resolveOutletVariantPrice(ctx, {
            variantId: catalog.variantId,
            outletId: tree.outletA.id,
            at: AT,
          }),
        ),
      ).rejects.toMatchObject({ pricingErrorCode: "OVERRIDE_OUT_OF_BOUNDS" });
    });
  });

  it("resolves a future-effective Brand book only at/after effectiveFrom", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "future",
      );
      await activateBrandBaseline(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(22900),
        effectiveFrom: new Date("2026-09-01T00:00:00+05:30"),
      });

      await expect(
        persistence.withContext((ctx) =>
          resolveOutletVariantPrice(ctx, {
            variantId: catalog.variantId,
            outletId: tree.outletA.id,
            at: AT,
          }),
        ),
      ).rejects.toMatchObject({ pricingErrorCode: "PRICE_MISSING" });

      const resolved = await persistence.withContext((ctx) =>
        resolveOutletVariantPrice(ctx, {
          variantId: catalog.variantId,
          outletId: tree.outletA.id,
          at: new Date("2026-09-01T12:00:00+05:30"),
        }),
      );
      expect(resolved.amountPaise).toBe(BigInt(22900));
    });
  });

  it("rejects overlapping active Price Books at the same scope", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "overlap",
      );
      await activateBrandBaseline(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(17900),
        effectiveFrom: new Date("2026-08-01T00:00:00+05:30"),
        effectiveTo: new Date("2026-09-01T00:00:00+05:30"),
      });

      await expect(
        persistence.transaction(async (tx) => {
          const book = await createDraftPriceBook(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            scopeType: "brand",
            code: `overlap-${randomUUID().slice(0, 8)}`,
            name: "Overlap",
            effectiveFrom: new Date("2026-08-15T00:00:00+05:30"),
            effectiveTo: new Date("2026-10-01T00:00:00+05:30"),
          });
          await attachDraftVariantPrice(tx, {
            actor: brandAdminActor,
            priceBookId: book.id,
            brandId: tree.brand.id,
            variantId: catalog.variantId,
            amountPaise: BigInt(18900),
            taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          });
          await activatePriceBook(tx, {
            actor: brandAdminActor,
            priceBookId: book.id,
            brandId: tree.brand.id,
          });
        }),
      ).rejects.toBeInstanceOf(PricingConflictError);
    });
  });
});

describe("modifier and bundle option prices", () => {
  it("accepts explicit zero Modifier price and fails closed when missing", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const product = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          code: "mod-p",
          name: "Mod Product",
          productKind: "standard",
        }),
      );
      const variant = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor: brandAdminActor,
          productId: product.id,
          code: "default",
          name: "Default",
          isDefault: true,
          isSelectorVisible: false,
        }),
      );
      const group = await persistence.transaction((tx) =>
        createModifierGroup(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          code: "top",
          name: "Top",
        }),
      );
      const option = await persistence.transaction((tx) =>
        createModifierOption(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          code: "pearl",
          name: "Pearl",
        }),
      );
      const binding = await persistence.transaction((tx) =>
        addModifierOptionToGroup(tx, {
          actor: brandAdminActor,
          modifierGroupId: group.id,
          modifierOptionId: option.id,
          minQuantity: 0,
          maxQuantity: 1,
          defaultQuantity: 0,
        }),
      );
      const vmg = await persistence.transaction((tx) =>
        applyModifierGroupToVariant(tx, {
          actor: brandAdminActor,
          variantId: variant.id,
          modifierGroupId: group.id,
          minTotalQuantity: 0,
          maxTotalQuantity: 1,
        }),
      );
      await persistence.transaction(async (tx) => {
        await activateModifierOption(tx, { actor: brandAdminActor, modifierOptionId: option.id });
        await activateModifierGroupOption(tx, {
          actor: brandAdminActor,
          modifierGroupOptionId: binding.id,
        });
        await activateModifierGroup(tx, { actor: brandAdminActor, modifierGroupId: group.id });
        await activateVariantModifierGroup(tx, {
          actor: brandAdminActor,
          variantModifierGroupId: vmg.id,
        });
        await activateVariant(tx, { actor: brandAdminActor, variantId: variant.id });
        await activateProduct(tx, { actor: brandAdminActor, productId: product.id });
      });

      const brandBook = await activateBrandBaseline(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        variantId: variant.id,
        amountPaise: BigInt(17900),
      });

      await expect(
        persistence.withContext((ctx) =>
          resolveModifierPriceDelta(ctx, {
            outletId: tree.outletA.id,
            variantModifierGroupId: vmg.id,
            modifierGroupOptionId: binding.id,
            quantity: 1,
            at: AT,
          }),
        ),
      ).rejects.toMatchObject({ pricingErrorCode: "MODIFIER_PRICE_MISSING" });

      await persistence.transaction(async (tx) => {
        await tx.db.insert(priceBookModifierPricesTable).values({
          id: randomUUID(),
          brandId: tree.brand.id,
          priceBookId: brandBook.id,
          variantModifierGroupId: vmg.id,
          modifierGroupOptionId: binding.id,
          priceDeltaPaise: BigInt(0),
          allowTerritoryOverride: false,
          allowOrganizationOverride: false,
          allowOutletOverride: false,
          createdAt: new Date(),
        });
      });

      const zero = await persistence.withContext((ctx) =>
        resolveModifierPriceDelta(ctx, {
          outletId: tree.outletA.id,
          variantModifierGroupId: vmg.id,
          modifierGroupOptionId: binding.id,
          quantity: 2,
          at: AT,
        }),
      );
      expect(zero.priceDeltaPaise).toBe(BigInt(0));
      expect(zero.totalPaise).toBe(BigInt(0));
    });
  });

  it("resolves Bundle Option price adjustments", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const standard = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "comp",
      );
      const bundleProduct = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          code: "bundle-p",
          name: "Bundle Product",
          productKind: "bundle",
        }),
      );
      const bundleVariant = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor: brandAdminActor,
          productId: bundleProduct.id,
          code: "default",
          name: "Default",
          isDefault: true,
          isSelectorVisible: false,
        }),
      );
      const group = await persistence.transaction((tx) =>
        createBundleGroup(tx, {
          actor: brandAdminActor,
          bundleVariantId: bundleVariant.id,
          code: "choose",
          name: "Choose",
          minSelections: 1,
          maxSelections: 1,
          position: 0,
        }),
      );
      const option = await persistence.transaction((tx) =>
        addBundleOption(tx, {
          actor: brandAdminActor,
          bundleGroupId: group.id,
          componentVariantId: standard.variantId,
          quantity: 1,
          isDefault: true,
          position: 0,
        }),
      );
      await persistence.transaction(async (tx) => {
        await activateBundleOption(tx, { actor: brandAdminActor, bundleGroupOptionId: option.id });
        await activateBundleGroup(tx, { actor: brandAdminActor, bundleGroupId: group.id });
        await activateVariant(tx, { actor: brandAdminActor, variantId: bundleVariant.id });
        await activateProduct(tx, { actor: brandAdminActor, productId: bundleProduct.id });
      });

      const brandBook = await activateBrandBaseline(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        variantId: bundleVariant.id,
        amountPaise: BigInt(29900),
      });
      await persistence.transaction(async (tx) => {
        await tx.db.insert(priceBookBundleOptionPricesTable).values({
          id: randomUUID(),
          brandId: tree.brand.id,
          priceBookId: brandBook.id,
          bundleGroupOptionId: option.id,
          priceDeltaPaise: BigInt(1500),
          allowTerritoryOverride: false,
          allowOrganizationOverride: false,
          allowOutletOverride: false,
          createdAt: new Date(),
        });
      });

      const delta = await persistence.withContext((ctx) =>
        resolveBundleOptionPriceDelta(ctx, {
          outletId: tree.outletA.id,
          bundleGroupOptionId: option.id,
          quantity: 3,
          at: AT,
        }),
      );
      expect(delta.priceDeltaPaise).toBe(BigInt(1500));
      expect(delta.totalPaise).toBe(BigInt(4500));
    });
  });
});
