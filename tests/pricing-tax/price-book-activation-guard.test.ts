/**
 * IMP-036I Founder UAT finding 001 — activation must reject an illegal
 * hierarchical PriceBook before it can poison customer pricing.
 */
import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  priceBooksTable,
  pricingTaxAuditEventsTable,
} from "../../src/platform/database/schema/pricing";
import { TAX_CATEGORY_RESTAURANT_SERVICE_ID } from "../../src/shared/pricing";
import {
  activatePriceBook,
  attachDraftModifierPrice,
  attachDraftVariantPrice,
  createDraftPriceBook,
  previewPriceBookConsequence,
  resolveModifierDisplayPriceDeltas,
  resolveOutletVariantPrice,
} from "../../src/server/pricing";
import {
  createActiveStandardVariant,
  withAssortmentDomain,
} from "../assortment-availability/support";
import { seedActiveVariantWithModifier } from "../database/support/cart-fixtures";

const AT = new Date("2026-09-20T12:00:00.000Z");
const FROM = new Date("2026-09-01T00:00:00.000Z");

async function bookStatus(
  persistence: Parameters<Parameters<typeof withAssortmentDomain>[0]>[0],
  priceBookId: string,
) {
  return persistence.withContext(async (ctx) => {
    const rows = await ctx.db
      .select({
        lifecycleStatus: priceBooksTable.lifecycleStatus,
        revision: priceBooksTable.revision,
        activatedAt: priceBooksTable.activatedAt,
      })
      .from(priceBooksTable)
      .where(eq(priceBooksTable.id, priceBookId))
      .limit(1);
    return rows[0];
  });
}

async function activationAudits(
  persistence: Parameters<Parameters<typeof withAssortmentDomain>[0]>[0],
  priceBookId: string,
) {
  return persistence.withContext(async (ctx) =>
    ctx.db
      .select({ id: pricingTaxAuditEventsTable.id })
      .from(pricingTaxAuditEventsTable)
      .where(
        and(
          eq(pricingTaxAuditEventsTable.targetId, priceBookId),
          eq(pricingTaxAuditEventsTable.action, "price_book.activated"),
        ),
      ),
  );
}

describe("price book activation hierarchy guard", () => {
  it("blocks a prohibited outlet variant override before it can poison checkout pricing", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor, outletManagerActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "hkmt",
      );
      await persistence.transaction(async (tx) => {
        const brand = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "brand",
          code: `brand-${randomUUID().slice(0, 8)}`,
          name: "Brand baseline",
          effectiveFrom: FROM,
        });
        const attached = await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: brand.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(23900),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          allowOutletOverride: false,
          expectedPriceBookRevision: brand.revision,
        });
        await activatePriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: brand.id,
          expectedPriceBookRevision: attached.priceBookRevision,
        });
      });

      const before = await persistence.withContext((ctx) =>
        resolveOutletVariantPrice(ctx, {
          variantId: catalog.variantId,
          outletId: tree.outletA.id,
          at: AT,
        }),
      );
      expect(before.amountPaise).toBe(BigInt(23900));
      expect(before.overrideScope).toBe("brand");

      const draft = await persistence.transaction(async (tx) => {
        const book = await createDraftPriceBook(tx, {
          actor: outletManagerActor,
          brandId: tree.brand.id,
          scopeType: "outlet",
          territoryId: tree.terrA.id,
          organizationId: tree.orgA.id,
          outletId: tree.outletA.id,
          code: `outlet-${randomUUID().slice(0, 8)}`,
          name: "Outlet override",
          effectiveFrom: FROM,
        });
        const attached = await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: book.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(24100),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: book.revision,
        });
        return { id: book.id, revision: attached.priceBookRevision };
      });

      const preview = await persistence.withContext((ctx) =>
        previewPriceBookConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: draft.id,
          at: AT,
        }),
      );
      expect(preview.referenceBlockers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "OVERRIDE_NOT_PERMITTED",
            message: expect.stringContaining("Outlet override is not permitted"),
          }),
        ]),
      );
      expect(preview.variantPriceChanges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            variantId: catalog.variantId,
            outletId: tree.outletA.id,
            currentAmountPaise: "23900",
            proposedAmountPaise: null,
          }),
        ]),
      );
      expect(
        preview.variantPriceChanges.some((row) => row.proposedAmountPaise === "24100"),
      ).toBe(false);

      await expect(
        persistence.transaction((tx) =>
          activatePriceBook(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            priceBookId: draft.id,
            expectedPriceBookRevision: draft.revision,
          }),
        ),
      ).rejects.toMatchObject({ pricingErrorCode: "OVERRIDE_NOT_PERMITTED" });

      const status = await bookStatus(persistence, draft.id);
      expect(status?.lifecycleStatus).toBe("draft");
      expect(status?.revision).toBe(draft.revision);
      expect(status?.activatedAt).toBeNull();
      expect(await activationAudits(persistence, draft.id)).toEqual([]);

      const after = await persistence.withContext((ctx) =>
        resolveOutletVariantPrice(ctx, {
          variantId: catalog.variantId,
          outletId: tree.outletA.id,
          at: AT,
        }),
      );
      expect(after.amountPaise).toBe(BigInt(23900));
      expect(after.overrideScope).toBe("brand");
    });
  });

  it("activates a permitted in-envelope outlet override and lets that price win", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor, outletManagerActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "okovr",
      );
      await persistence.transaction(async (tx) => {
        const brand = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "brand",
          code: `brand-${randomUUID().slice(0, 8)}`,
          name: "Brand baseline",
          effectiveFrom: FROM,
        });
        const attached = await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: brand.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(23900),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          allowOutletOverride: true,
          floorPaise: BigInt(20000),
          ceilingPaise: BigInt(26000),
          expectedPriceBookRevision: brand.revision,
        });
        await activatePriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: brand.id,
          expectedPriceBookRevision: attached.priceBookRevision,
        });
      });

      const draft = await persistence.transaction(async (tx) => {
        const book = await createDraftPriceBook(tx, {
          actor: outletManagerActor,
          brandId: tree.brand.id,
          scopeType: "outlet",
          territoryId: tree.terrA.id,
          organizationId: tree.orgA.id,
          outletId: tree.outletA.id,
          code: `outlet-${randomUUID().slice(0, 8)}`,
          name: "Permitted outlet",
          effectiveFrom: FROM,
        });
        const attached = await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: book.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(25000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: book.revision,
        });
        return { id: book.id, revision: attached.priceBookRevision };
      });

      const preview = await persistence.withContext((ctx) =>
        previewPriceBookConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: draft.id,
          at: AT,
        }),
      );
      const blockerCodes = preview.referenceBlockers.map((blocker) => blocker.code);
      expect(blockerCodes).not.toContain("OVERRIDE_NOT_PERMITTED");
      expect(blockerCodes).not.toContain("OVERRIDE_OUT_OF_BOUNDS");
      expect(preview.variantPriceChanges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            proposedAmountPaise: "25000",
          }),
        ]),
      );

      await persistence.transaction((tx) =>
        activatePriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: draft.id,
          expectedPriceBookRevision: draft.revision,
        }),
      );

      const status = await bookStatus(persistence, draft.id);
      expect(status?.lifecycleStatus).toBe("active");
      expect(await activationAudits(persistence, draft.id)).toHaveLength(1);

      const resolved = await persistence.withContext((ctx) =>
        resolveOutletVariantPrice(ctx, {
          variantId: catalog.variantId,
          outletId: tree.outletA.id,
          at: AT,
        }),
      );
      expect(resolved.amountPaise).toBe(BigInt(25000));
      expect(resolved.overrideScope).toBe("outlet");
    });
  });

  it("rejects an outlet override outside the brand envelope and leaves the draft unchanged", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor, outletManagerActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "env",
      );
      await persistence.transaction(async (tx) => {
        const brand = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "brand",
          code: `brand-${randomUUID().slice(0, 8)}`,
          name: "Brand baseline",
          effectiveFrom: FROM,
        });
        const attached = await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: brand.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(23900),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          allowOutletOverride: true,
          floorPaise: BigInt(20000),
          ceilingPaise: BigInt(24000),
          expectedPriceBookRevision: brand.revision,
        });
        await activatePriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: brand.id,
          expectedPriceBookRevision: attached.priceBookRevision,
        });
      });

      const draft = await persistence.transaction(async (tx) => {
        const book = await createDraftPriceBook(tx, {
          actor: outletManagerActor,
          brandId: tree.brand.id,
          scopeType: "outlet",
          territoryId: tree.terrA.id,
          organizationId: tree.orgA.id,
          outletId: tree.outletA.id,
          code: `outlet-${randomUUID().slice(0, 8)}`,
          name: "Above ceiling",
          effectiveFrom: FROM,
        });
        const attached = await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: book.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(24100),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: book.revision,
        });
        return { id: book.id, revision: attached.priceBookRevision };
      });

      const preview = await persistence.withContext((ctx) =>
        previewPriceBookConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: draft.id,
          at: AT,
        }),
      );
      expect(preview.referenceBlockers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "OVERRIDE_OUT_OF_BOUNDS" }),
        ]),
      );

      await expect(
        persistence.transaction((tx) =>
          activatePriceBook(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            priceBookId: draft.id,
            expectedPriceBookRevision: draft.revision,
          }),
        ),
      ).rejects.toMatchObject({ pricingErrorCode: "OVERRIDE_OUT_OF_BOUNDS" });

      const status = await bookStatus(persistence, draft.id);
      expect(status?.lifecycleStatus).toBe("draft");
      expect(status?.activatedAt).toBeNull();
      expect(await activationAudits(persistence, draft.id)).toEqual([]);
    });
  });

  it("rejects a prohibited outlet modifier override and does not activate the book", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor, outletManagerActor }) => {
      const catalog = await seedActiveVariantWithModifier(
        persistence,
        tree.brand.id,
        brandAdminActor,
        "modovr",
      );
      await persistence.transaction(async (tx) => {
        const brand = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "brand",
          code: `brand-${randomUUID().slice(0, 8)}`,
          name: "Brand baseline",
          effectiveFrom: FROM,
        });
        const variant = await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: brand.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(23900),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          allowOutletOverride: false,
          expectedPriceBookRevision: brand.revision,
        });
        const modifier = await attachDraftModifierPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: brand.id,
          variantModifierGroupId: catalog.variantModifierGroupId,
          modifierGroupOptionId: catalog.modifierGroupOptionId,
          priceDeltaPaise: BigInt(500),
          allowOutletOverride: false,
          expectedPriceBookRevision: variant.priceBookRevision,
        });
        await activatePriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: brand.id,
          expectedPriceBookRevision: modifier.priceBookRevision,
        });
      });

      const draft = await persistence.transaction(async (tx) => {
        const book = await createDraftPriceBook(tx, {
          actor: outletManagerActor,
          brandId: tree.brand.id,
          scopeType: "outlet",
          territoryId: tree.terrA.id,
          organizationId: tree.orgA.id,
          outletId: tree.outletA.id,
          code: `outlet-${randomUUID().slice(0, 8)}`,
          name: "Modifier override",
          effectiveFrom: FROM,
        });
        const attached = await attachDraftModifierPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: book.id,
          variantModifierGroupId: catalog.variantModifierGroupId,
          modifierGroupOptionId: catalog.modifierGroupOptionId,
          priceDeltaPaise: BigInt(900),
          expectedPriceBookRevision: book.revision,
        });
        return { id: book.id, revision: attached.priceBookRevision };
      });

      const preview = await persistence.withContext((ctx) =>
        previewPriceBookConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: draft.id,
          at: AT,
        }),
      );
      expect(preview.referenceBlockers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "OVERRIDE_NOT_PERMITTED",
            message: expect.stringContaining("Outlet modifier override is not permitted"),
          }),
        ]),
      );
      expect(preview.modifierPriceChanges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            proposedPriceDeltaPaise: null,
          }),
        ]),
      );

      await expect(
        persistence.transaction((tx) =>
          activatePriceBook(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            priceBookId: draft.id,
            expectedPriceBookRevision: draft.revision,
          }),
        ),
      ).rejects.toMatchObject({ pricingErrorCode: "OVERRIDE_NOT_PERMITTED" });

      const status = await bookStatus(persistence, draft.id);
      expect(status?.lifecycleStatus).toBe("draft");
      expect(await activationAudits(persistence, draft.id)).toEqual([]);

      const deltas = await persistence.withContext((ctx) =>
        resolveModifierDisplayPriceDeltas(ctx, {
          brandId: tree.brand.id,
          outletId: tree.outletA.id,
          keys: [
            {
              variantModifierGroupId: catalog.variantModifierGroupId,
              modifierGroupOptionId: catalog.modifierGroupOptionId,
            },
          ],
          at: AT,
        }),
      );
      expect(deltas.get(`${catalog.variantModifierGroupId}:${catalog.modifierGroupOptionId}`)).toBe(
        BigInt(500),
      );
    });
  });
});
