/**
 * Tax profile + GST calculation tests (IMP-015).
 */
import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  CHARGE_DEFINITION_PACKAGING_ID,
  TAX_CATEGORY_RESTAURANT_SERVICE_ID,
  taxExclusivePaise,
  taxInclusiveSplit,
} from "../../src/shared/pricing";
import {
  activatePriceBook,
  assignOutletTaxProfile,
  attachDraftVariantPrice,
  buildDirectPricingQuote,
  calculateTax,
  createDraftPriceBook,
  createLegalEntityTaxProfile,
} from "../../src/server/pricing";
import {
  createActiveStandardVariant,
  withAssortmentDomain,
} from "../assortment-availability/support";

const AT = new Date("2026-08-08T12:00:00+05:30");
/** Structurally valid GSTIN for Karnataka (29). */
const GSTIN_KA = "29AAAAA0000A1Z5";
/** Structurally valid GSTIN for Delhi UT (07). */
const GSTIN_DL = "07AAAAA0000A1Z5";

async function seedBrandPriceAndTaxProfile(
  persistence: Parameters<Parameters<typeof withAssortmentDomain>[0]>[0],
  args: {
    actor: unknown;
    brandId: string;
    organizationId: string;
    legalEntityId: string;
    outletId: string;
    variantId: string;
    amountPaise: bigint;
    stateCode: string;
    registrationStatus: "registered" | "unregistered";
    gstin: string | null;
    taxInclusionMode?: "exclusive" | "inclusive";
  },
): Promise<void> {
  await persistence.transaction(async (tx) => {
    const book = await createDraftPriceBook(tx, {
      actor: args.actor,
      brandId: args.brandId,
      scopeType: "brand",
      code: `tax-${randomUUID().slice(0, 8)}`,
      name: "Tax book",
      taxInclusionMode: args.taxInclusionMode ?? "exclusive",
      effectiveFrom: new Date("2026-08-08T00:00:00+05:30"),
    });
    await attachDraftVariantPrice(tx, {
      actor: args.actor,
      priceBookId: book.id,
      brandId: args.brandId,
      variantId: args.variantId,
      amountPaise: args.amountPaise,
      taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
    });
    await activatePriceBook(tx, {
      actor: args.actor,
      priceBookId: book.id,
      brandId: args.brandId,
    });

    const profile = await createLegalEntityTaxProfile(tx, {
      actorWorkforceUserId: null,
      legalEntityId: args.legalEntityId,
      brandId: args.brandId,
      organizationId: args.organizationId,
      stateCode: args.stateCode,
      registrationStatus: args.registrationStatus,
      gstin: args.gstin,
      validFrom: new Date("2026-01-01T00:00:00+05:30"),
    });
    await assignOutletTaxProfile(tx, {
      actorWorkforceUserId: null,
      outletId: args.outletId,
      legalEntityTaxProfileId: profile.id,
      effectiveFrom: new Date("2026-01-01T00:00:00+05:30"),
    });
  });
}

describe("calculateTax GST components", () => {
  it("fails closed when Outlet tax profile mapping is missing", async () => {
    await withAssortmentDomain(async (persistence, { tree }) => {
      await expect(
        persistence.withContext((ctx) =>
          calculateTax(ctx, {
            outletId: tree.outletA.id,
            at: AT,
            taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
            taxInclusionMode: "exclusive",
            lines: [{ lineId: "l1", amountPaise: BigInt(17900), entityId: randomUUID() }],
          }),
        ),
      ).rejects.toMatchObject({ pricingErrorCode: "TAX_CONFIGURATION_MISSING" });
    });
  });

  it("computes exclusive CGST+SGST for a registered non-UT Legal Entity", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "cgst",
      );
      await seedBrandPriceAndTaxProfile(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        organizationId: tree.orgA.id,
        legalEntityId: tree.leA.id,
        outletId: tree.outletA.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(17900),
        stateCode: "29",
        registrationStatus: "registered",
        gstin: GSTIN_KA,
      });

      const tax = await persistence.withContext((ctx) =>
        calculateTax(ctx, {
          outletId: tree.outletA.id,
          at: AT,
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          taxInclusionMode: "exclusive",
          lines: [{ lineId: "l1", amountPaise: BigInt(17900), entityId: catalog.variantId }],
        }),
      );

      expect(tax.taxPaise).toBe(BigInt(895));
      expect(tax.taxablePaise).toBe(BigInt(17900));
      expect(tax.components.map((c) => c.taxType).sort()).toEqual(["cgst", "sgst"]);
      expect(tax.components.reduce((a, c) => a + c.amountPaise, BigInt(0))).toBe(BigInt(895));
      expect(taxExclusivePaise(BigInt(17900), 500)).toBe(BigInt(895));
    });
  });

  it("computes exclusive CGST+UTGST for a registered Union Territory profile", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "utgst",
      );
      await seedBrandPriceAndTaxProfile(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        organizationId: tree.orgA.id,
        legalEntityId: tree.leA.id,
        outletId: tree.outletA.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(22900),
        stateCode: "07",
        registrationStatus: "registered",
        gstin: GSTIN_DL,
      });

      const tax = await persistence.withContext((ctx) =>
        calculateTax(ctx, {
          outletId: tree.outletA.id,
          at: AT,
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          taxInclusionMode: "exclusive",
          lines: [{ lineId: "l1", amountPaise: BigInt(22900), entityId: catalog.variantId }],
        }),
      );

      expect(tax.taxPaise).toBe(BigInt(1145));
      expect(tax.components.map((c) => c.taxType).sort()).toEqual(["cgst", "utgst"]);
    });
  });

  it("computes IGST when forceApplicability is inter_state", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "igst",
      );
      await seedBrandPriceAndTaxProfile(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        organizationId: tree.orgA.id,
        legalEntityId: tree.leA.id,
        outletId: tree.outletA.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(17900),
        stateCode: "29",
        registrationStatus: "registered",
        gstin: GSTIN_KA,
      });

      const tax = await persistence.withContext((ctx) =>
        calculateTax(ctx, {
          outletId: tree.outletA.id,
          at: AT,
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          taxInclusionMode: "exclusive",
          forceApplicability: "inter_state",
          lines: [{ lineId: "l1", amountPaise: BigInt(17900), entityId: catalog.variantId }],
        }),
      );

      expect(tax.applicability).toBe("inter_state");
      expect(tax.components).toHaveLength(1);
      expect(tax.components[0]?.taxType).toBe("igst");
      expect(tax.taxPaise).toBe(BigInt(895));
    });
  });

  it("returns zero tax for an unregistered Legal Entity tax profile", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "unreg",
      );
      await seedBrandPriceAndTaxProfile(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        organizationId: tree.orgA.id,
        legalEntityId: tree.leA.id,
        outletId: tree.outletA.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(17900),
        stateCode: "29",
        registrationStatus: "unregistered",
        gstin: null,
      });

      const tax = await persistence.withContext((ctx) =>
        calculateTax(ctx, {
          outletId: tree.outletA.id,
          at: AT,
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          taxInclusionMode: "exclusive",
          lines: [{ lineId: "l1", amountPaise: BigInt(17900), entityId: catalog.variantId }],
        }),
      );
      expect(tax.taxPaise).toBe(BigInt(0));
      expect(tax.components).toEqual([]);
      expect(tax.taxablePaise).toBe(BigInt(17900));
    });
  });

  it("rejects Outlet tax profile whose Legal Entity does not match the Outlet", async () => {
    await withAssortmentDomain(async (persistence, { tree }) => {
      await expect(
        persistence.transaction(async (tx) => {
          const profile = await createLegalEntityTaxProfile(tx, {
            actorWorkforceUserId: null,
            legalEntityId: tree.leB.id,
            brandId: tree.brand.id,
            organizationId: tree.orgB.id,
            stateCode: "29",
            registrationStatus: "registered",
            gstin: GSTIN_KA,
            validFrom: new Date("2026-01-01T00:00:00+05:30"),
          });
          await assignOutletTaxProfile(tx, {
            actorWorkforceUserId: null,
            outletId: tree.outletA.id,
            legalEntityTaxProfileId: profile.id,
            effectiveFrom: new Date("2026-01-01T00:00:00+05:30"),
          });
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining("Legal Entity"),
      });
    });
  });

  it("honors tax-policy effective dating and inclusive GST end-to-end", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "incl",
      );
      await seedBrandPriceAndTaxProfile(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        organizationId: tree.orgA.id,
        legalEntityId: tree.leA.id,
        outletId: tree.outletA.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(18800),
        stateCode: "29",
        registrationStatus: "registered",
        gstin: GSTIN_KA,
        taxInclusionMode: "inclusive",
      });

      await expect(
        persistence.withContext((ctx) =>
          calculateTax(ctx, {
            outletId: tree.outletA.id,
            at: new Date("2020-01-01T00:00:00+05:30"),
            taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
            taxInclusionMode: "inclusive",
            lines: [{ lineId: "l1", amountPaise: BigInt(18800), entityId: catalog.variantId }],
          }),
        ),
      ).rejects.toMatchObject({ pricingErrorCode: "TAX_CONFIGURATION_MISSING" });

      const tax = await persistence.withContext((ctx) =>
        calculateTax(ctx, {
          outletId: tree.outletA.id,
          at: AT,
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          taxInclusionMode: "inclusive",
          lines: [{ lineId: "l1", amountPaise: BigInt(18800), entityId: catalog.variantId }],
        }),
      );
      const split = taxInclusiveSplit(BigInt(18800), 500);
      expect(tax.taxablePaise).toBe(split.taxablePaise);
      expect(tax.taxPaise).toBe(split.taxPaise);
      expect(tax.taxablePaise + tax.taxPaise).toBe(BigInt(18800));

      const quote = await persistence.withContext((ctx) =>
        buildDirectPricingQuote(ctx, {
          outletId: tree.outletA.id,
          at: AT,
          lines: [{ lineId: "q1", variantId: catalog.variantId, quantity: 1 }],
        }),
      );
      expect(quote.taxInclusionMode).toBe("inclusive");
      expect(quote.taxPaise).toBe(split.taxPaise);
      expect(quote.grandTotalPaise).toBe(BigInt(18800));
    });
  });

  it("allocates residual paise deterministically across multiple lines", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "resid",
      );
      await seedBrandPriceAndTaxProfile(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        organizationId: tree.orgA.id,
        legalEntityId: tree.leA.id,
        outletId: tree.outletA.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(100),
        stateCode: "29",
        registrationStatus: "registered",
        gstin: GSTIN_KA,
      });

      const tax = await persistence.withContext((ctx) =>
        calculateTax(ctx, {
          outletId: tree.outletA.id,
          at: AT,
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          taxInclusionMode: "exclusive",
          lines: [
            { lineId: "a", amountPaise: BigInt(100), entityId: "e1" },
            { lineId: "b", amountPaise: BigInt(100), entityId: "e2" },
            { lineId: "c", amountPaise: BigInt(100), entityId: "e3" },
          ],
        }),
      );

      const lineTaxSum = tax.lineAllocations.reduce((a, l) => a + l.taxPaise, BigInt(0));
      expect(lineTaxSum).toBe(tax.taxPaise);
      expect(tax.taxPaise).toBe(taxExclusivePaise(BigInt(300), 500));
      const componentSum = tax.components.reduce((a, c) => a + c.amountPaise, BigInt(0));
      expect(componentSum).toBe(tax.taxPaise);
    });
  });
});

describe("charge calculation in quotes", () => {
  it("applies fixed_per_order and per_item_quantity charges exactly", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "chg",
      );
      await seedBrandPriceAndTaxProfile(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        organizationId: tree.orgA.id,
        legalEntityId: tree.leA.id,
        outletId: tree.outletA.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(17900),
        stateCode: "29",
        registrationStatus: "unregistered",
        gstin: null,
      });

      const fixedUnit = BigInt(500);
      const perItemUnit = BigInt(200);
      const quantity = 3;
      const quote = await persistence.withContext((ctx) =>
        buildDirectPricingQuote(ctx, {
          outletId: tree.outletA.id,
          at: AT,
          lines: [{ lineId: "l1", variantId: catalog.variantId, quantity }],
          charges: [
            {
              chargeDefinitionId: CHARGE_DEFINITION_PACKAGING_ID,
              calculationMode: "fixed_per_order",
              amountPaise: fixedUnit,
              taxCategoryId: null,
            },
            {
              chargeDefinitionId: CHARGE_DEFINITION_PACKAGING_ID,
              calculationMode: "per_item_quantity",
              amountPaise: perItemUnit * BigInt(quantity),
              taxCategoryId: null,
            },
          ],
        }),
      );

      expect(quote.basePaise).toBe(BigInt(17900) * BigInt(quantity));
      expect(quote.chargesPaise).toBe(fixedUnit + perItemUnit * BigInt(quantity));
      expect(quote.chargeLines).toHaveLength(2);
      expect(quote.promotionDiscountPaise).toBe(BigInt(0));
      expect(quote.appliedPromotions).toEqual([]);
      expect(quote.promotionAllocations).toEqual([]);
      expect(quote.submittedCouponResult).toBeNull();
    });
  });
});
