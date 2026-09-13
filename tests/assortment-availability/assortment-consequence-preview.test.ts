/**
 * IMP-036F F4 correction — Assortment consequence preview truthfulness,
 * shared preview/effect scope validation, and revision parsing.
 */
import { describe, expect, it } from "vitest";

import {
  AssortmentNotFoundError,
  AssortmentValidationError,
  excludeVariantAtScope,
  parseExpectedRuleRevision,
  previewAssortmentConsequence,
} from "../../src/server/assortment";
import {
  activateProduct,
  activateVariant,
  createProduct,
  createVariant,
} from "../../src/server/catalog";
import {
  createActiveStandardVariant,
  includeVariantAtBrand,
  publishBrandProduct,
  withAssortmentDomain,
} from "./support";
import { seedActiveVariantWithModifier } from "../database/support/cart-fixtures";

describe("IMP-036F F4 — Assortment include preview applies existing exclusions", () => {
  it("Brand include leaves an already-excluded outlet excluded", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "incx",
      );
      await persistence.transaction((tx) =>
        excludeVariantAtScope(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          expectedRuleRevision: null,
          scopeType: "outlet",
          outletId: tree.outletA.id,
          variantId: catalog.variantId,
        }),
      );

      const preview = await persistence.withContext((ctx) =>
        previewAssortmentConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          mutationType: "include_variant",
          variantId: catalog.variantId,
        }),
      );
      const outletA = preview.outletConsequences.find((row) => row.outletId === tree.outletA.id);
      const outletB = preview.outletConsequences.find((row) => row.outletId === tree.outletB.id);
      expect(outletA).toMatchObject({
        currentCode: "ASSORTMENT_NOT_INCLUDED",
        proposedIntended: false,
        proposedCode: "ASSORTMENT_EXCLUDED_OUTLET",
      });
      expect(outletB).toMatchObject({
        currentCode: "ASSORTMENT_NOT_INCLUDED",
        proposedIntended: true,
        proposedCode: "AVAILABLE",
      });
    });
  });
});

describe("IMP-036F F4 — territory and organization ancestry", () => {
  it("territory and organization exclusions affect only descendant outlets", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "ancs",
      );
      await includeVariantAtBrand(persistence, brandAdminActor, tree.brand.id, catalog.variantId);

      const territoryPreview = await persistence.withContext((ctx) =>
        previewAssortmentConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          mutationType: "exclude",
          scopeType: "territory",
          territoryId: tree.terrA.id,
          variantId: catalog.variantId,
        }),
      );
      expect(
        territoryPreview.outletConsequences.find((row) => row.outletId === tree.outletA.id),
      ).toMatchObject({
        currentIntended: true,
        proposedIntended: false,
        proposedCode: "ASSORTMENT_EXCLUDED_TERRITORY",
      });
      expect(
        territoryPreview.outletConsequences.find((row) => row.outletId === tree.outletB.id),
      ).toMatchObject({
        currentIntended: true,
        proposedIntended: true,
        proposedCode: "AVAILABLE",
      });

      const organizationPreview = await persistence.withContext((ctx) =>
        previewAssortmentConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          mutationType: "exclude",
          scopeType: "organization",
          organizationId: tree.orgB.id,
          variantId: catalog.variantId,
        }),
      );
      expect(
        organizationPreview.outletConsequences.find((row) => row.outletId === tree.outletB.id),
      ).toMatchObject({
        proposedIntended: false,
        proposedCode: "ASSORTMENT_EXCLUDED_ORGANIZATION",
      });
      expect(
        organizationPreview.outletConsequences.find((row) => row.outletId === tree.outletA.id),
      ).toMatchObject({
        proposedIntended: true,
        proposedCode: "AVAILABLE",
      });
    });
  });
});

describe("IMP-036F F4 — Product and ModifierOption target consequences", () => {
  it("Product exclusion enumerates affected Variants at outlets", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const product = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          code: "pex-p",
          name: "Pex",
          productKind: "standard",
        }),
      );
      const vDefault = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor: brandAdminActor,
          productId: product.id,
          code: "default",
          name: "Default",
          isDefault: true,
          isSelectorVisible: true,
        }),
      );
      const vAlt = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor: brandAdminActor,
          productId: product.id,
          code: "alt",
          name: "Alt",
          isDefault: false,
          isSelectorVisible: true,
        }),
      );
      await persistence.transaction(async (tx) => {
        await activateVariant(tx, { actor: brandAdminActor, variantId: vDefault.id });
        await activateVariant(tx, { actor: brandAdminActor, variantId: vAlt.id });
        await activateProduct(tx, { actor: brandAdminActor, productId: product.id });
      });
      await publishBrandProduct(persistence, brandAdminActor, tree.brand.id, product.id);
      await includeVariantAtBrand(persistence, brandAdminActor, tree.brand.id, vDefault.id);
      await includeVariantAtBrand(persistence, brandAdminActor, tree.brand.id, vAlt.id);

      const preview = await persistence.withContext((ctx) =>
        previewAssortmentConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          mutationType: "exclude",
          scopeType: "brand",
          productId: product.id,
        }),
      );
      expect([...preview.affectedVariantIds].sort()).toEqual([vAlt.id, vDefault.id].sort());
      expect(preview.outletConsequences.length).toBeGreaterThan(0);
      expect(
        preview.outletConsequences.filter((row) => row.variantId === vDefault.id),
      ).not.toHaveLength(0);
      expect(
        preview.outletConsequences.filter((row) => row.variantId === vAlt.id),
      ).not.toHaveLength(0);
      expect(
        preview.outletConsequences.every((row) => row.proposedCode === "ASSORTMENT_EXCLUDED_BRAND"),
      ).toBe(true);
    });
  });

  it("ModifierOption exclusion reports authoritative outlet consequence for Catalog consumers", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await seedActiveVariantWithModifier(
        persistence,
        tree.brand.id,
        brandAdminActor,
        "mopt",
      );
      await includeVariantAtBrand(persistence, brandAdminActor, tree.brand.id, catalog.variantId);

      const preview = await persistence.withContext((ctx) =>
        previewAssortmentConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          mutationType: "exclude",
          scopeType: "brand",
          modifierOptionId: catalog.modifierOptionId,
        }),
      );
      expect(preview.affectedVariantIds).toContain(catalog.variantId);
      expect(preview.outletConsequences.length).toBeGreaterThan(0);
      expect(
        preview.outletConsequences.every(
          (row) =>
            row.modifierOptionId === catalog.modifierOptionId &&
            row.proposedIntended === false &&
            row.proposedCode === "ASSORTMENT_EXCLUDED_BRAND",
        ),
      ).toBe(true);
    });
  });
});

describe("IMP-036F F4 — retirement preserves remaining exclusions", () => {
  it("retiring one exclusion leaves the other applicable exclusion in force", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "retx",
      );
      await includeVariantAtBrand(persistence, brandAdminActor, tree.brand.id, catalog.variantId);
      const brandExclude = await persistence.transaction((tx) =>
        excludeVariantAtScope(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          expectedRuleRevision: null,
          scopeType: "brand",
          variantId: catalog.variantId,
        }),
      );
      const outletExclude = await persistence.transaction((tx) =>
        excludeVariantAtScope(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          expectedRuleRevision: null,
          scopeType: "outlet",
          outletId: tree.outletA.id,
          variantId: catalog.variantId,
        }),
      );

      const retireOutlet = await persistence.withContext((ctx) =>
        previewAssortmentConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          mutationType: "retire_rule",
          ruleId: outletExclude.id,
        }),
      );
      expect(
        retireOutlet.outletConsequences.find((row) => row.outletId === tree.outletA.id),
      ).toMatchObject({
        proposedIntended: false,
        proposedCode: "ASSORTMENT_EXCLUDED_BRAND",
      });
      expect(
        retireOutlet.outletConsequences.find((row) => row.outletId === tree.outletB.id),
      ).toMatchObject({
        proposedIntended: false,
        proposedCode: "ASSORTMENT_EXCLUDED_BRAND",
      });

      const retireBrand = await persistence.withContext((ctx) =>
        previewAssortmentConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          mutationType: "retire_rule",
          ruleId: brandExclude.id,
        }),
      );
      expect(
        retireBrand.outletConsequences.find((row) => row.outletId === tree.outletA.id),
      ).toMatchObject({
        proposedIntended: false,
        proposedCode: "ASSORTMENT_EXCLUDED_OUTLET",
      });
      expect(
        retireBrand.outletConsequences.find((row) => row.outletId === tree.outletB.id),
      ).toMatchObject({
        proposedIntended: true,
        proposedCode: "AVAILABLE",
      });
    });
  });
});

describe("IMP-036F F4 — preview and effect share Brand-constrained scope validation", () => {
  it("malformed scope and foreign vs missing references fail equivalently before consequence", async () => {
    await withAssortmentDomain(async (persistence, { tree, otherTree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "scval",
      );
      await includeVariantAtBrand(persistence, brandAdminActor, tree.brand.id, catalog.variantId);
      const missing = "00000000-0000-4000-8000-000000000000";

      await expect(
        persistence.withContext((ctx) =>
          previewAssortmentConsequence(ctx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            mutationType: "exclude",
            scopeType: "brand",
            outletId: tree.outletA.id,
            variantId: catalog.variantId,
          }),
        ),
      ).rejects.toBeInstanceOf(AssortmentValidationError);

      await expect(
        persistence.withContext((ctx) =>
          previewAssortmentConsequence(ctx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            mutationType: "exclude",
            scopeType: "territory",
            variantId: catalog.variantId,
          }),
        ),
      ).rejects.toBeInstanceOf(AssortmentValidationError);

      await expect(
        persistence.withContext((ctx) =>
          previewAssortmentConsequence(ctx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            mutationType: "exclude",
            scopeType: "organization",
            organizationId: tree.orgA.id,
            territoryId: tree.terrA.id,
            variantId: catalog.variantId,
          }),
        ),
      ).rejects.toBeInstanceOf(AssortmentValidationError);

      const missingPreview = persistence.withContext((ctx) =>
        previewAssortmentConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          mutationType: "exclude",
          scopeType: "territory",
          territoryId: missing,
          variantId: catalog.variantId,
        }),
      );
      const foreignPreview = persistence.withContext((ctx) =>
        previewAssortmentConsequence(ctx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          mutationType: "exclude",
          scopeType: "territory",
          territoryId: otherTree.terrA.id,
          variantId: catalog.variantId,
        }),
      );
      await expect(missingPreview).rejects.toBeInstanceOf(AssortmentNotFoundError);
      await expect(foreignPreview).rejects.toBeInstanceOf(AssortmentNotFoundError);
      await expect(missingPreview).rejects.toMatchObject({ resourceType: "territory" });
      await expect(foreignPreview).rejects.toMatchObject({ resourceType: "territory" });

      await expect(
        persistence.transaction((tx) =>
          excludeVariantAtScope(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            expectedRuleRevision: null,
            scopeType: "brand",
            outletId: tree.outletA.id,
            variantId: catalog.variantId,
          }),
        ),
      ).rejects.toBeInstanceOf(AssortmentValidationError);
    });
  });
});

describe("IMP-036F F4 — Assortment revision parsing", () => {
  it("rejects unsafe JS integers while accepting decimal strings, bigint, and safe integers", () => {
    expect(parseExpectedRuleRevision(null)).toBeNull();
    expect(parseExpectedRuleRevision(1)).toBe(BigInt(1));
    expect(parseExpectedRuleRevision("2")).toBe(BigInt(2));
    expect(parseExpectedRuleRevision(BigInt(3))).toBe(BigInt(3));
    expect(() => parseExpectedRuleRevision(Number.MAX_SAFE_INTEGER + 1)).toThrow(
      AssortmentValidationError,
    );
    expect(() => parseExpectedRuleRevision(1.5)).toThrow(AssortmentValidationError);
  });
});
