/**
 * IMP-036F F4 correction — scoped PriceBook consequence, modifier materiality,
 * Brand-constrained scope resolution, overlap activation races, revision parsing.
 */
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { priceBooksTable } from "../../src/platform/database/schema/pricing";
import { TAX_CATEGORY_RESTAURANT_SERVICE_ID } from "../../src/shared/pricing";
import { createOutlet } from "../../src/server/organization";
import {
  PricingConflictError,
  PricingNotFoundError,
  PricingValidationError,
  activatePriceBook,
  attachDraftModifierPrice,
  attachDraftVariantPrice,
  createDraftPriceBook,
  inspectBrandPriceBook,
  parseExpectedPriceBookRevision,
  previewPriceBookConsequence,
} from "../../src/server/pricing";
import {
  createActiveStandardVariant,
  withAssortmentDomain,
} from "../assortment-availability/support";
import { seedActiveVariantWithModifier } from "../database/support/cart-fixtures";

const AT = new Date("2026-09-11T12:00:00.000Z");
const FROM = new Date("2026-09-01T00:00:00+05:30");

function assertNoDeadlock(result: PromiseSettledResult<unknown>): void {
  if (result.status === "rejected") {
    const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
    const code =
      typeof result.reason === "object" && result.reason && "code" in result.reason
        ? String((result.reason as { code?: unknown }).code)
        : "";
    expect(message.toLowerCase()).not.toMatch(/deadlock/);
    expect(code).not.toBe("40P01");
  }
}

async function activateBrandBook(
  persistence: Parameters<Parameters<typeof withAssortmentDomain>[0]>[0],
  args: {
    actor: unknown;
    brandId: string;
    variantId: string;
    amountPaise: bigint;
    allowTerritoryOverride?: boolean;
    allowOrganizationOverride?: boolean;
    allowOutletOverride?: boolean;
    modifier?: {
      variantModifierGroupId: string;
      modifierGroupOptionId: string;
      priceDeltaPaise: bigint;
      allowTerritoryOverride?: boolean;
      allowOrganizationOverride?: boolean;
      allowOutletOverride?: boolean;
    };
  },
): Promise<{ id: string }> {
  return persistence.transaction(async (tx) => {
    const book = await createDraftPriceBook(tx, {
      actor: args.actor,
      brandId: args.brandId,
      scopeType: "brand",
      code: `brand-${randomUUID().slice(0, 8)}`,
      name: "Brand baseline",
      effectiveFrom: FROM,
    });
    let revision = book.revision;
    const attached = await attachDraftVariantPrice(tx, {
      actor: args.actor,
      brandId: args.brandId,
      priceBookId: book.id,
      variantId: args.variantId,
      amountPaise: args.amountPaise,
      taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
      allowTerritoryOverride: args.allowTerritoryOverride ?? false,
      allowOrganizationOverride: args.allowOrganizationOverride ?? false,
      allowOutletOverride: args.allowOutletOverride ?? false,
      expectedPriceBookRevision: revision,
    });
    revision = attached.priceBookRevision;
    if (args.modifier) {
      const modifier = await attachDraftModifierPrice(tx, {
        actor: args.actor,
        brandId: args.brandId,
        priceBookId: book.id,
        variantModifierGroupId: args.modifier.variantModifierGroupId,
        modifierGroupOptionId: args.modifier.modifierGroupOptionId,
        priceDeltaPaise: args.modifier.priceDeltaPaise,
        allowTerritoryOverride: args.modifier.allowTerritoryOverride ?? false,
        allowOrganizationOverride: args.modifier.allowOrganizationOverride ?? false,
        allowOutletOverride: args.modifier.allowOutletOverride ?? false,
        expectedPriceBookRevision: revision,
      });
      revision = modifier.priceBookRevision;
    }
    await activatePriceBook(tx, {
      actor: args.actor,
      brandId: args.brandId,
      priceBookId: book.id,
      expectedPriceBookRevision: revision,
    });
    return book;
  });
}

async function activateOverrideBook(
  persistence: Parameters<Parameters<typeof withAssortmentDomain>[0]>[0],
  args: {
    actor: unknown;
    brandId: string;
    scopeType: "territory" | "organization" | "outlet";
    territoryId?: string | null;
    organizationId?: string | null;
    outletId?: string | null;
    variantId: string;
    amountPaise: bigint;
    modifier?: {
      variantModifierGroupId: string;
      modifierGroupOptionId: string;
      priceDeltaPaise: bigint;
    };
  },
): Promise<{ id: string }> {
  return persistence.transaction(async (tx) => {
    const book = await createDraftPriceBook(tx, {
      actor: args.actor,
      brandId: args.brandId,
      scopeType: args.scopeType,
      territoryId: args.territoryId,
      organizationId: args.organizationId,
      outletId: args.outletId,
      code: `${args.scopeType}-${randomUUID().slice(0, 8)}`,
      name: `Live ${args.scopeType}`,
      effectiveFrom: FROM,
    });
    let revision = book.revision;
    const attached = await attachDraftVariantPrice(tx, {
      actor: args.actor,
      brandId: args.brandId,
      priceBookId: book.id,
      variantId: args.variantId,
      amountPaise: args.amountPaise,
      taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
      expectedPriceBookRevision: revision,
    });
    revision = attached.priceBookRevision;
    if (args.modifier) {
      const modifier = await attachDraftModifierPrice(tx, {
        actor: args.actor,
        brandId: args.brandId,
        priceBookId: book.id,
        variantModifierGroupId: args.modifier.variantModifierGroupId,
        modifierGroupOptionId: args.modifier.modifierGroupOptionId,
        priceDeltaPaise: args.modifier.priceDeltaPaise,
        expectedPriceBookRevision: revision,
      });
      revision = modifier.priceBookRevision;
    }
    await activatePriceBook(tx, {
      actor: args.actor,
      brandId: args.brandId,
      priceBookId: book.id,
      expectedPriceBookRevision: revision,
    });
    return book;
  });
}

describe("IMP-036F F4 — scoped current price consequence", () => {
  it("territory replacement to Brand-equivalent amount still reports a customer change", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "tscope",
      );
      await activateBrandBook(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(10_000),
        allowTerritoryOverride: true,
      });
      await persistence.transaction(async (tx) => {
        const live = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "territory",
          territoryId: tree.terrA.id,
          code: `terr-live-${randomUUID().slice(0, 8)}`,
          name: "Live territory",
          effectiveFrom: FROM,
        });
        const attached = await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: live.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(12_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: live.revision,
        });
        await activatePriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: live.id,
          expectedPriceBookRevision: attached.priceBookRevision,
        });
      });

      const draft = await persistence.transaction(async (tx) => {
        const book = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "territory",
          territoryId: tree.terrA.id,
          code: `terr-draft-${randomUUID().slice(0, 8)}`,
          name: "Replacement territory",
          effectiveFrom: new Date("2026-10-01T00:00:00+05:30"),
        });
        await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: book.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(10_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: book.revision,
        });
        return book;
      });

      const preview = await persistence.withContext((ctx) =>
        previewPriceBookConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: draft.id,
          at: AT,
        }),
      );
      expect(preview.wouldChangeCustomerPricing).toBe(true);
      const change = preview.variantPriceChanges.find(
        (row) => row.variantId === catalog.variantId && row.outletId === tree.outletA.id,
      );
      expect(change).toMatchObject({
        currentAmountPaise: "12000",
        proposedAmountPaise: "10000",
      });
      const other = preview.variantPriceChanges.find((row) => row.outletId === tree.outletB.id);
      expect(other).toBeUndefined();

      const inspection = await persistence.withContext((ctx) =>
        inspectBrandPriceBook(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: draft.id,
          at: AT,
        }),
      );
      expect(
        inspection.customerEffective.some(
          (row) =>
            row.variantId === catalog.variantId &&
            row.outletId === tree.outletA.id &&
            row.amountPaise === "12000",
        ),
      ).toBe(true);
    });
  });

  it("organization and outlet scopes resolve current customer price in their ancestry", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "oscope",
      );
      await activateBrandBook(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(10_000),
        allowOrganizationOverride: true,
        allowOutletOverride: true,
      });

      const orgDraft = await persistence.transaction(async (tx) => {
        const live = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "organization",
          organizationId: tree.orgA.id,
          code: `org-live-${randomUUID().slice(0, 8)}`,
          name: "Live org",
          effectiveFrom: FROM,
        });
        const attached = await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: live.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(13_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: live.revision,
        });
        await activatePriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: live.id,
          expectedPriceBookRevision: attached.priceBookRevision,
        });
        const draft = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "organization",
          organizationId: tree.orgA.id,
          code: `org-draft-${randomUUID().slice(0, 8)}`,
          name: "Replacement org",
          effectiveFrom: new Date("2026-10-01T00:00:00+05:30"),
        });
        await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: draft.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(10_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: draft.revision,
        });
        return draft;
      });

      const orgPreview = await persistence.withContext((ctx) =>
        previewPriceBookConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: orgDraft.id,
          at: AT,
        }),
      );
      expect(orgPreview.wouldChangeCustomerPricing).toBe(true);
      expect(
        orgPreview.variantPriceChanges.some(
          (row) =>
            row.outletId === tree.outletA.id &&
            row.currentAmountPaise === "13000" &&
            row.proposedAmountPaise === "10000",
        ),
      ).toBe(true);
      expect(orgPreview.variantPriceChanges.some((row) => row.outletId === tree.outletB.id)).toBe(
        false,
      );

      const outletDraft = await persistence.transaction(async (tx) => {
        const live = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "outlet",
          outletId: tree.outletA.id,
          code: `out-live-${randomUUID().slice(0, 8)}`,
          name: "Live outlet",
          effectiveFrom: FROM,
        });
        const attached = await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: live.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(14_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: live.revision,
        });
        await activatePriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: live.id,
          expectedPriceBookRevision: attached.priceBookRevision,
        });
        const draft = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "outlet",
          outletId: tree.outletA.id,
          code: `out-draft-${randomUUID().slice(0, 8)}`,
          name: "Replacement outlet",
          effectiveFrom: new Date("2026-10-01T00:00:00+05:30"),
        });
        await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: draft.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(10_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: draft.revision,
        });
        return draft;
      });

      const outletPreview = await persistence.withContext((ctx) =>
        previewPriceBookConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: outletDraft.id,
          at: AT,
        }),
      );
      expect(outletPreview.wouldChangeCustomerPricing).toBe(true);
      expect(outletPreview.variantPriceChanges).toEqual([
        expect.objectContaining({
          outletId: tree.outletA.id,
          currentAmountPaise: "14000",
          proposedAmountPaise: "10000",
        }),
      ]);
    });
  });

  it("Brand-scope preview still uses Brand current price", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "bscope",
      );
      await activateBrandBook(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(10_000),
      });
      const draft = await persistence.transaction(async (tx) => {
        const book = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "brand",
          code: `brand-d-${randomUUID().slice(0, 8)}`,
          name: "Same amount",
          effectiveFrom: new Date("2026-10-01T00:00:00+05:30"),
        });
        await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: book.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(10_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: book.revision,
        });
        return book;
      });
      const preview = await persistence.withContext((ctx) =>
        previewPriceBookConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: draft.id,
          at: AT,
        }),
      );
      expect(preview.wouldChangeCustomerPricing).toBe(false);
      expect(preview.variantPriceChanges[0]).toMatchObject({
        outletId: null,
        currentAmountPaise: "10000",
        proposedAmountPaise: "10000",
      });
    });
  });
});

describe("IMP-036F F4 — post-effect Pricing projection", () => {
  it("territory candidate masked by organization override does not change that outlet; sibling without override does", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "tmask",
      );
      await activateBrandBook(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(10_000),
        allowTerritoryOverride: true,
        allowOrganizationOverride: true,
      });
      await activateOverrideBook(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        scopeType: "organization",
        organizationId: tree.orgA.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(13_000),
      });
      const sibling = await persistence.transaction((tx) =>
        createOutlet(tx, {
          brandId: tree.brand.id,
          organizationId: tree.orgB.id,
          territoryId: tree.terrA.id,
          legalEntityId: tree.leB.id,
          code: `sib-org-${randomUUID().slice(0, 8)}`,
          name: "Sibling terrA orgB",
        }),
      );
      const draft = await persistence.transaction(async (tx) => {
        const book = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "territory",
          territoryId: tree.terrA.id,
          code: `terr-mask-${randomUUID().slice(0, 8)}`,
          name: "Territory candidate",
          effectiveFrom: FROM,
        });
        await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: book.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(12_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: book.revision,
        });
        return book;
      });

      const preview = await persistence.withContext((ctx) =>
        previewPriceBookConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: draft.id,
          at: AT,
        }),
      );
      const masked = preview.variantPriceChanges.find((row) => row.outletId === tree.outletA.id);
      const siblingChange = preview.variantPriceChanges.find((row) => row.outletId === sibling.id);
      expect(masked).toMatchObject({
        currentAmountPaise: "13000",
        proposedAmountPaise: "13000",
      });
      expect(siblingChange).toMatchObject({
        currentAmountPaise: "10000",
        proposedAmountPaise: "12000",
      });
      expect(preview.draftCandidate).toEqual([
        expect.objectContaining({ variantId: catalog.variantId, amountPaise: "12000" }),
      ]);
      expect(preview.wouldChangeCustomerPricing).toBe(true);
    });
  });

  it("territory candidate masked by organization override reports no customer change when every affected outlet is masked", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "tonly",
      );
      await activateBrandBook(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(10_000),
        allowTerritoryOverride: true,
        allowOrganizationOverride: true,
      });
      await activateOverrideBook(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        scopeType: "organization",
        organizationId: tree.orgA.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(13_000),
      });
      const draft = await persistence.transaction(async (tx) => {
        const book = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "territory",
          territoryId: tree.terrA.id,
          code: `terr-only-${randomUUID().slice(0, 8)}`,
          name: "Territory masked only",
          effectiveFrom: FROM,
        });
        await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: book.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(12_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: book.revision,
        });
        return book;
      });
      const preview = await persistence.withContext((ctx) =>
        previewPriceBookConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: draft.id,
          at: AT,
        }),
      );
      expect(preview.variantPriceChanges).toEqual([
        expect.objectContaining({
          outletId: tree.outletA.id,
          currentAmountPaise: "13000",
          proposedAmountPaise: "13000",
        }),
      ]);
      expect(preview.wouldChangeCustomerPricing).toBe(false);
    });
  });

  it("territory candidate masked by outlet override does not change that outlet; sibling without override does", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "tout",
      );
      await activateBrandBook(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(10_000),
        allowTerritoryOverride: true,
        allowOutletOverride: true,
      });
      await activateOverrideBook(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        scopeType: "outlet",
        outletId: tree.outletA.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(14_000),
      });
      const sibling = await persistence.transaction((tx) =>
        createOutlet(tx, {
          brandId: tree.brand.id,
          organizationId: tree.orgB.id,
          territoryId: tree.terrA.id,
          legalEntityId: tree.leB.id,
          code: `sib-out-${randomUUID().slice(0, 8)}`,
          name: "Sibling terrA no outlet override",
        }),
      );
      const draft = await persistence.transaction(async (tx) => {
        const book = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "territory",
          territoryId: tree.terrA.id,
          code: `terr-out-${randomUUID().slice(0, 8)}`,
          name: "Territory vs outlet",
          effectiveFrom: FROM,
        });
        await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: book.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(12_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: book.revision,
        });
        return book;
      });
      const preview = await persistence.withContext((ctx) =>
        previewPriceBookConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: draft.id,
          at: AT,
        }),
      );
      expect(
        preview.variantPriceChanges.find((row) => row.outletId === tree.outletA.id),
      ).toMatchObject({
        currentAmountPaise: "14000",
        proposedAmountPaise: "14000",
      });
      expect(preview.variantPriceChanges.find((row) => row.outletId === sibling.id)).toMatchObject({
        currentAmountPaise: "10000",
        proposedAmountPaise: "12000",
      });
      expect(preview.wouldChangeCustomerPricing).toBe(true);
    });
  });

  it("organization candidate masked by outlet override does not change that outlet; sibling without override does", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "omask",
      );
      await activateBrandBook(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(10_000),
        allowOrganizationOverride: true,
        allowOutletOverride: true,
      });
      await activateOverrideBook(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        scopeType: "outlet",
        outletId: tree.outletA.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(14_000),
      });
      const sibling = await persistence.transaction((tx) =>
        createOutlet(tx, {
          brandId: tree.brand.id,
          organizationId: tree.orgA.id,
          territoryId: tree.terrB.id,
          legalEntityId: tree.leA.id,
          code: `sib-oa-${randomUUID().slice(0, 8)}`,
          name: "Sibling orgA no outlet override",
        }),
      );
      const draft = await persistence.transaction(async (tx) => {
        const book = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "organization",
          organizationId: tree.orgA.id,
          code: `org-mask-${randomUUID().slice(0, 8)}`,
          name: "Organization vs outlet",
          effectiveFrom: FROM,
        });
        await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: book.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(13_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: book.revision,
        });
        return book;
      });
      const preview = await persistence.withContext((ctx) =>
        previewPriceBookConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: draft.id,
          at: AT,
        }),
      );
      expect(
        preview.variantPriceChanges.find((row) => row.outletId === tree.outletA.id),
      ).toMatchObject({
        currentAmountPaise: "14000",
        proposedAmountPaise: "14000",
      });
      expect(preview.variantPriceChanges.find((row) => row.outletId === sibling.id)).toMatchObject({
        currentAmountPaise: "10000",
        proposedAmountPaise: "13000",
      });
      expect(preview.wouldChangeCustomerPricing).toBe(true);
    });
  });

  it("territory modifier candidate is masked by organization/outlet overrides; sibling without override reports the candidate", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await seedActiveVariantWithModifier(
        persistence,
        tree.brand.id,
        brandAdminActor,
        "mproj",
      );
      await activateBrandBook(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(10_000),
        allowTerritoryOverride: true,
        allowOrganizationOverride: true,
        allowOutletOverride: true,
        modifier: {
          variantModifierGroupId: catalog.variantModifierGroupId,
          modifierGroupOptionId: catalog.modifierGroupOptionId,
          priceDeltaPaise: BigInt(0),
          allowTerritoryOverride: true,
          allowOrganizationOverride: true,
          allowOutletOverride: true,
        },
      });
      await activateOverrideBook(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        scopeType: "organization",
        organizationId: tree.orgA.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(10_000),
        modifier: {
          variantModifierGroupId: catalog.variantModifierGroupId,
          modifierGroupOptionId: catalog.modifierGroupOptionId,
          priceDeltaPaise: BigInt(2_000),
        },
      });
      await activateOverrideBook(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        scopeType: "outlet",
        outletId: tree.outletA.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(10_000),
        modifier: {
          variantModifierGroupId: catalog.variantModifierGroupId,
          modifierGroupOptionId: catalog.modifierGroupOptionId,
          priceDeltaPaise: BigInt(2_500),
        },
      });
      const sibling = await persistence.transaction((tx) =>
        createOutlet(tx, {
          brandId: tree.brand.id,
          organizationId: tree.orgB.id,
          territoryId: tree.terrA.id,
          legalEntityId: tree.leB.id,
          code: `sib-mod-${randomUUID().slice(0, 8)}`,
          name: "Sibling terrA modifier",
        }),
      );
      const draft = await persistence.transaction(async (tx) => {
        const book = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "territory",
          territoryId: tree.terrA.id,
          code: `terr-mod-${randomUUID().slice(0, 8)}`,
          name: "Territory modifier candidate",
          effectiveFrom: FROM,
        });
        const variant = await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: book.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(10_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: book.revision,
        });
        await attachDraftModifierPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: book.id,
          variantModifierGroupId: catalog.variantModifierGroupId,
          modifierGroupOptionId: catalog.modifierGroupOptionId,
          priceDeltaPaise: BigInt(1_500),
          expectedPriceBookRevision: variant.priceBookRevision,
        });
        return book;
      });
      const preview = await persistence.withContext((ctx) =>
        previewPriceBookConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: draft.id,
          at: AT,
        }),
      );
      expect(
        preview.modifierPriceChanges.find((row) => row.outletId === tree.outletA.id),
      ).toMatchObject({
        currentPriceDeltaPaise: "2500",
        proposedPriceDeltaPaise: "2500",
      });
      expect(preview.modifierPriceChanges.find((row) => row.outletId === sibling.id)).toMatchObject({
        currentPriceDeltaPaise: "0",
        proposedPriceDeltaPaise: "1500",
      });
      expect(preview.modifierDraftCandidate).toEqual([
        expect.objectContaining({
          variantModifierGroupId: catalog.variantModifierGroupId,
          modifierGroupOptionId: catalog.modifierGroupOptionId,
          priceDeltaPaise: "1500",
        }),
      ]);
      expect(preview.wouldChangeCustomerPricing).toBe(true);
    });
  });
});

describe("IMP-036F F4 — modifier-only consequence", () => {
  it("current delta 0 → draft +1500 is a customer monetary change; identical delta is not", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await seedActiveVariantWithModifier(
        persistence,
        tree.brand.id,
        brandAdminActor,
        "modc",
      );
      await activateBrandBook(persistence, {
        actor: brandAdminActor,
        brandId: tree.brand.id,
        variantId: catalog.variantId,
        amountPaise: BigInt(10_000),
        modifier: {
          variantModifierGroupId: catalog.variantModifierGroupId,
          modifierGroupOptionId: catalog.modifierGroupOptionId,
          priceDeltaPaise: BigInt(0),
        },
      });

      const changed = await persistence.transaction(async (tx) => {
        const book = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "brand",
          code: `mod-d-${randomUUID().slice(0, 8)}`,
          name: "Modifier only change",
          effectiveFrom: new Date("2026-10-01T00:00:00+05:30"),
        });
        const variant = await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: book.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(10_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: book.revision,
        });
        await attachDraftModifierPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: book.id,
          variantModifierGroupId: catalog.variantModifierGroupId,
          modifierGroupOptionId: catalog.modifierGroupOptionId,
          priceDeltaPaise: BigInt(1_500),
          expectedPriceBookRevision: variant.priceBookRevision,
        });
        return book;
      });

      const changedPreview = await persistence.withContext((ctx) =>
        previewPriceBookConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: changed.id,
          at: AT,
        }),
      );
      expect(changedPreview.wouldChangeCustomerPricing).toBe(true);
      expect(changedPreview.modifierPriceChanges).toEqual([
        expect.objectContaining({
          variantModifierGroupId: catalog.variantModifierGroupId,
          modifierGroupOptionId: catalog.modifierGroupOptionId,
          currentPriceDeltaPaise: "0",
          proposedPriceDeltaPaise: "1500",
        }),
      ]);
      expect(changedPreview.customerMonetaryConsequence).toMatch(/modifier/i);

      const same = await persistence.transaction(async (tx) => {
        const book = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "brand",
          code: `mod-s-${randomUUID().slice(0, 8)}`,
          name: "Modifier unchanged",
          effectiveFrom: new Date("2026-11-01T00:00:00+05:30"),
        });
        const variant = await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: book.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(10_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: book.revision,
        });
        await attachDraftModifierPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: book.id,
          variantModifierGroupId: catalog.variantModifierGroupId,
          modifierGroupOptionId: catalog.modifierGroupOptionId,
          priceDeltaPaise: BigInt(0),
          expectedPriceBookRevision: variant.priceBookRevision,
        });
        return book;
      });
      const samePreview = await persistence.withContext((ctx) =>
        previewPriceBookConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: same.id,
          at: AT,
        }),
      );
      expect(samePreview.wouldChangeCustomerPricing).toBe(false);
      expect(samePreview.modifierPriceChanges[0]).toMatchObject({
        currentPriceDeltaPaise: "0",
        proposedPriceDeltaPaise: "0",
      });
    });
  });
});

describe("IMP-036F F4 — PriceBook overlap activation concurrency", () => {
  it("two overlapping draft books: at most one activates, the other is PRICE_BOOK_OVERLAP, no deadlock", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "racepb",
      );
      const [bookA, bookB] = await persistence.transaction(async (tx) => {
        const a = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "brand",
          code: `race-a-${randomUUID().slice(0, 8)}`,
          name: "Race A",
          effectiveFrom: FROM,
        });
        const b = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "brand",
          code: `race-b-${randomUUID().slice(0, 8)}`,
          name: "Race B",
          effectiveFrom: FROM,
        });
        await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: a.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(11_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: a.revision,
        });
        await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: b.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(12_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: b.revision,
        });
        return [a, b] as const;
      });

      const first = persistence.transaction((tx) =>
        activatePriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: bookA.id,
          expectedPriceBookRevision: BigInt(2),
        }),
      );
      const second = persistence.transaction((tx) =>
        activatePriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: bookB.id,
          expectedPriceBookRevision: BigInt(2),
        }),
      );
      const settled = await Promise.allSettled([first, second]);
      for (const result of settled) assertNoDeadlock(result);
      const fulfilled = settled.filter((result) => result.status === "fulfilled");
      const rejected = settled.filter((result) => result.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(PricingConflictError);
      expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
        pricingErrorCode: "PRICE_BOOK_OVERLAP",
      });

      const rows = await persistence.withContext((ctx) =>
        ctx.db
          .select({
            id: priceBooksTable.id,
            lifecycleStatus: priceBooksTable.lifecycleStatus,
          })
          .from(priceBooksTable)
          .where(eq(priceBooksTable.brandId, tree.brand.id)),
      );
      expect(rows.filter((row) => row.lifecycleStatus === "active")).toHaveLength(1);
    });
  });

  it("non-overlapping concurrent activations both succeed", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "norace",
      );
      const [early, late] = await persistence.transaction(async (tx) => {
        const a = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "brand",
          code: `early-${randomUUID().slice(0, 8)}`,
          name: "Early",
          effectiveFrom: new Date("2026-01-01T00:00:00+05:30"),
          effectiveTo: new Date("2026-06-01T00:00:00+05:30"),
        });
        const b = await createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "brand",
          code: `late-${randomUUID().slice(0, 8)}`,
          name: "Late",
          effectiveFrom: new Date("2026-07-01T00:00:00+05:30"),
        });
        await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: a.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(11_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: a.revision,
        });
        await attachDraftVariantPrice(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          priceBookId: b.id,
          variantId: catalog.variantId,
          amountPaise: BigInt(12_000),
          taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
          expectedPriceBookRevision: b.revision,
        });
        return [a, b] as const;
      });

      const settled = await Promise.allSettled([
        persistence.transaction((tx) =>
          activatePriceBook(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            priceBookId: early.id,
            expectedPriceBookRevision: BigInt(2),
          }),
        ),
        persistence.transaction((tx) =>
          activatePriceBook(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            priceBookId: late.id,
            expectedPriceBookRevision: BigInt(2),
          }),
        ),
      ]);
      for (const result of settled) assertNoDeadlock(result);
      expect(settled.filter((result) => result.status === "fulfilled")).toHaveLength(2);
    });
  });
});

describe("IMP-036F F4 — Brand-constrained PriceBook scope resolution", () => {
  it("foreign and missing territory/organization/outlet references are equivalent not-found", async () => {
    await withAssortmentDomain(async (persistence, { tree, otherTree, brandAdminActor }) => {
      const missing = "00000000-0000-4000-8000-000000000000";
      const from = FROM;

      const missingTerr = persistence.transaction((tx) =>
        createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "territory",
          territoryId: missing,
          code: `t-miss-${randomUUID().slice(0, 8)}`,
          name: "Missing terr",
          effectiveFrom: from,
        }),
      );
      const foreignTerr = persistence.transaction((tx) =>
        createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "territory",
          territoryId: otherTree.terrA.id,
          code: `t-for-${randomUUID().slice(0, 8)}`,
          name: "Foreign terr",
          effectiveFrom: from,
        }),
      );
      await expect(missingTerr).rejects.toBeInstanceOf(PricingNotFoundError);
      await expect(foreignTerr).rejects.toBeInstanceOf(PricingNotFoundError);
      await expect(missingTerr).rejects.toMatchObject({ resourceType: "territory" });
      await expect(foreignTerr).rejects.toMatchObject({ resourceType: "territory" });

      await expect(
        persistence.transaction((tx) =>
          createDraftPriceBook(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            scopeType: "organization",
            organizationId: missing,
            code: `o-miss-${randomUUID().slice(0, 8)}`,
            name: "Missing org",
            effectiveFrom: from,
          }),
        ),
      ).rejects.toMatchObject({ resourceType: "organization" });
      await expect(
        persistence.transaction((tx) =>
          createDraftPriceBook(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            scopeType: "organization",
            organizationId: otherTree.orgA.id,
            code: `o-for-${randomUUID().slice(0, 8)}`,
            name: "Foreign org",
            effectiveFrom: from,
          }),
        ),
      ).rejects.toMatchObject({ resourceType: "organization" });

      await expect(
        persistence.transaction((tx) =>
          createDraftPriceBook(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            scopeType: "outlet",
            outletId: missing,
            code: `u-miss-${randomUUID().slice(0, 8)}`,
            name: "Missing outlet",
            effectiveFrom: from,
          }),
        ),
      ).rejects.toMatchObject({ resourceType: "outlet" });
      await expect(
        persistence.transaction((tx) =>
          createDraftPriceBook(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            scopeType: "outlet",
            outletId: otherTree.outletA.id,
            code: `u-for-${randomUUID().slice(0, 8)}`,
            name: "Foreign outlet",
            effectiveFrom: from,
          }),
        ),
      ).rejects.toMatchObject({ resourceType: "outlet" });
    });
  });

  it("malformed scope shapes return bounded validation errors", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      await expect(
        persistence.transaction((tx) =>
          createDraftPriceBook(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            scopeType: "brand",
            outletId: tree.outletA.id,
            code: `bad-brand-${randomUUID().slice(0, 8)}`,
            name: "Brand plus outlet",
            effectiveFrom: FROM,
          }),
        ),
      ).rejects.toBeInstanceOf(PricingValidationError);

      await expect(
        persistence.transaction((tx) =>
          createDraftPriceBook(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            scopeType: "territory",
            code: `bad-terr-${randomUUID().slice(0, 8)}`,
            name: "Territory without id",
            effectiveFrom: FROM,
          }),
        ),
      ).rejects.toBeInstanceOf(PricingValidationError);

      await expect(
        persistence.transaction((tx) =>
          createDraftPriceBook(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            scopeType: "organization",
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            code: `bad-org-${randomUUID().slice(0, 8)}`,
            name: "Org plus territory",
            effectiveFrom: FROM,
          }),
        ),
      ).rejects.toBeInstanceOf(PricingValidationError);

      const derived = await persistence.transaction((tx) =>
        createDraftPriceBook(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "outlet",
          outletId: tree.outletA.id,
          code: `out-ok-${randomUUID().slice(0, 8)}`,
          name: "Derived ancestry",
          effectiveFrom: FROM,
        }),
      );
      const row = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db.select().from(priceBooksTable).where(eq(priceBooksTable.id, derived.id));
        return rows[0];
      });
      expect(row?.territoryId).toBe(tree.terrA.id);
      expect(row?.organizationId).toBe(tree.orgA.id);
      expect(row?.outletId).toBe(tree.outletA.id);
    });
  });
});

describe("IMP-036F F4 — PriceBook revision parsing", () => {
  it("rejects unsafe JS integers while accepting decimal strings and safe integers", () => {
    expect(parseExpectedPriceBookRevision(1)).toBe(BigInt(1));
    expect(parseExpectedPriceBookRevision("2")).toBe(BigInt(2));
    expect(parseExpectedPriceBookRevision(BigInt(3))).toBe(BigInt(3));
    expect(() => parseExpectedPriceBookRevision(Number.MAX_SAFE_INTEGER + 1)).toThrow(
      PricingValidationError,
    );
    expect(() => parseExpectedPriceBookRevision(1.5)).toThrow(PricingValidationError);
  });
});
