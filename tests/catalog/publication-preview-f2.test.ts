/**
 * IMP-036F F2 review corrections — domain-level regressions (R1/R2/R3).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  CatalogConflictError,
  activateModifierGroup,
  activateModifierGroupOption,
  activateModifierOption,
  activateProduct,
  activateVariant,
  activateVariantModifierGroup,
  addModifierOptionToGroup,
  applyModifierGroupToVariant,
  createModifierGroup,
  createModifierOption,
  createProduct,
  createVariant,
  findProductById,
  findModifierGroupById,
  findVariantModifierGroupById,
  loadEffectiveProductContent,
  previewCatalogPublicationConsequence,
  publishCatalogContentChange,
  retireVariantModifierGroup,
  saveModifierGroupContentDraft,
  saveProductContentDraft,
  saveVariantModifierGroupContentDraft,
} from "../../src/server/catalog";
import * as catalogValidation from "../../src/server/catalog/validation";
import {
  publishProductEnvelope,
  withCatalogDomain,
} from "./support";

async function seedPublishedProduct(
  persistence: Parameters<Parameters<typeof withCatalogDomain>[0]>[0],
  actor: unknown,
  brandId: string,
  code: string,
  name: string,
) {
  const product = await persistence.transaction((tx) =>
    createProduct(tx, { actor, brandId, code, name, productKind: "standard" }),
  );
  const variant = await persistence.transaction((tx) =>
    createVariant(tx, {
      actor,
      productId: product.id,
      code: "a",
      name: `${name} A`,
      isDefault: true,
      isSelectorVisible: true,
    }),
  );
  await persistence.transaction((tx) => activateVariant(tx, { actor, variantId: variant.id }));
  await persistence.transaction((tx) => activateProduct(tx, { actor, productId: product.id }));
  await persistence.transaction((tx) =>
    publishProductEnvelope(tx, { actor, brandId, productId: product.id }),
  );
  return { productId: product.id, variantId: variant.id };
}

describe("IMP-036F F2 — preview revision binding (R1)", () => {
  it("preview source locks Brand envelope before candidate graph read", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/server/catalog/publication-preview.ts"),
      "utf8",
    );
    const lockIdx = source.indexOf("await lockBrandEnvelope(");
    const graphIdx = source.indexOf("await getBrandCatalogProductGraph(");
    expect(lockIdx).toBeGreaterThan(-1);
    expect(graphIdx).toBeGreaterThan(lockIdx);
  });

  it("concurrent preview+draft never publishes unseen B with A-bound token", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedPublishedProduct(
        persistence,
        actor,
        tree.brand.id,
        "r1-race",
        "Name A",
      );

      const before = await persistence.withContext((ctx) => findProductById(ctx, seeded.productId));
      await persistence.transaction((tx) =>
        saveProductContentDraft(tx, {
          actor,
          productId: seeded.productId,
          expectedContentRevision: before!.draftContentRevision,
          name: "Name A staged",
        }),
      );

      const staged = await persistence.withContext((ctx) => findProductById(ctx, seeded.productId));
      const draftRev = staged!.draftContentRevision;

      const previewPromise = persistence.transaction((tx) =>
        previewCatalogPublicationConsequence(tx, {
          actor,
          brandId: tree.brand.id,
          productId: seeded.productId,
        }),
      );
      const draftPromise = persistence.transaction((tx) =>
        saveProductContentDraft(tx, {
          actor,
          productId: seeded.productId,
          expectedContentRevision: draftRev,
          name: "Name B secret",
        }),
      );

      const settled = await Promise.allSettled([previewPromise, draftPromise]);
      const previewSettled = settled[0]!;
      expect(previewSettled.status).toBe("fulfilled");
      if (previewSettled.status !== "fulfilled") throw new Error("preview failed");
      const preview = previewSettled.value;

      const proposedNames = preview.changes
        .flatMap((c) => c.changedFields ?? [])
        .filter((f) => f.field === "name")
        .map((f) => f.proposedValue);

      const publishSettled = await Promise.allSettled([
        persistence.transaction((tx) =>
          publishCatalogContentChange(tx, {
            actor,
            brandId: tree.brand.id,
            productId: seeded.productId,
            expectedContentRevision: preview.expectedContentRevision,
          }),
        ),
      ]);

      const product = await persistence.withContext((ctx) => findProductById(ctx, seeded.productId));
      const effective = await persistence.withContext((ctx) =>
        loadEffectiveProductContent(ctx, product!),
      );

      const published = publishSettled[0]!;
      if (published.status === "fulfilled" && published.value.changed) {
        expect(proposedNames).toContain(effective?.name);
      } else if (published.status === "rejected") {
        expect(published.reason).toBeInstanceOf(CatalogConflictError);
        expect(effective?.name).toBe("Name A");
      }

      // Absolute invariant: never apply secret B unless preview disclosed it.
      if (effective?.name === "Name B secret") {
        expect(proposedNames).toContain("Name B secret");
      }
    });
  });
});

describe("IMP-036F F2 — unexpected preview failures (R2)", () => {
  it("rethrows unexpected validation failures (not swallowed into blockers)", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedPublishedProduct(
        persistence,
        actor,
        tree.brand.id,
        "r2-err",
        "R2 Product",
      );

      const spy = vi
        .spyOn(catalogValidation, "assertProductGraphReady")
        .mockRejectedValueOnce(new Error("simulated ECONNRESET from driver"));

      try {
        await expect(
          persistence.transaction((tx) =>
            previewCatalogPublicationConsequence(tx, {
              actor,
              brandId: tree.brand.id,
              productId: seeded.productId,
            }),
          ),
        ).rejects.toThrow(/ECONNRESET/);
      } finally {
        spy.mockRestore();
      }
    });
  });
});

describe("IMP-036F F2 — shared modifier blast radius (R3)", () => {
  it("preview through Product A discloses Product B sharing the ModifierGroup", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const brandId = tree.brand.id;

      const productA = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId,
          code: "share-a",
          name: "Product A",
          productKind: "standard",
        }),
      );
      const variantA = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor,
          productId: productA.id,
          code: "va",
          name: "A Default",
          isDefault: true,
          isSelectorVisible: true,
        }),
      );
      const productB = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId,
          code: "share-b",
          name: "Product B",
          productKind: "standard",
        }),
      );
      const variantB = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor,
          productId: productB.id,
          code: "vb",
          name: "B Default",
          isDefault: true,
          isSelectorVisible: true,
        }),
      );

      const group = await persistence.transaction((tx) =>
        createModifierGroup(tx, { actor, brandId, code: "shared-top", name: "Toppings" }),
      );
      const option = await persistence.transaction((tx) =>
        createModifierOption(tx, { actor, brandId, code: "pearl", name: "Pearl" }),
      );
      const groupOption = await persistence.transaction((tx) =>
        addModifierOptionToGroup(tx, {
          actor,
          modifierGroupId: group.id,
          modifierOptionId: option.id,
          minQuantity: 0,
          maxQuantity: 1,
          defaultQuantity: 0,
          position: 0,
        }),
      );
      const vmgA = await persistence.transaction((tx) =>
        applyModifierGroupToVariant(tx, {
          actor,
          variantId: variantA.id,
          modifierGroupId: group.id,
          minTotalQuantity: 0,
          maxTotalQuantity: 1,
          position: 0,
        }),
      );
      const vmgB = await persistence.transaction((tx) =>
        applyModifierGroupToVariant(tx, {
          actor,
          variantId: variantB.id,
          modifierGroupId: group.id,
          minTotalQuantity: 0,
          maxTotalQuantity: 1,
          position: 0,
        }),
      );

      await persistence.transaction(async (tx) => {
        await activateVariant(tx, { actor, variantId: variantA.id });
        await activateVariant(tx, { actor, variantId: variantB.id });
        await activateProduct(tx, { actor, productId: productA.id });
        await activateProduct(tx, { actor, productId: productB.id });
        await activateModifierGroup(tx, { actor, modifierGroupId: group.id });
        await activateModifierOption(tx, { actor, modifierOptionId: option.id });
        await activateModifierGroupOption(tx, { actor, modifierGroupOptionId: groupOption.id });
        await activateVariantModifierGroup(tx, { actor, variantModifierGroupId: vmgA.id });
        await activateVariantModifierGroup(tx, { actor, variantModifierGroupId: vmgB.id });
      });

      await persistence.transaction((tx) =>
        publishProductEnvelope(tx, { actor, brandId, productId: productA.id }),
      );
      await persistence.transaction((tx) =>
        publishProductEnvelope(tx, { actor, brandId, productId: productB.id }),
      );

      const groupFresh = await persistence.withContext((ctx) =>
        findModifierGroupById(ctx, group.id),
      );
      await persistence.transaction((tx) =>
        saveModifierGroupContentDraft(tx, {
          actor,
          modifierGroupId: group.id,
          expectedContentRevision: groupFresh!.draftContentRevision,
          name: "Toppings Deluxe",
        }),
      );

      const preview = await persistence.transaction((tx) =>
        previewCatalogPublicationConsequence(tx, {
          actor,
          brandId,
          productId: productA.id,
        }),
      );

      const groupChange = preview.changes.find(
        (c) => c.entityKind === "modifier_group" && c.entityId === group.id,
      );
      expect(groupChange).toBeTruthy();
      expect(groupChange!.draftDiffersFromEffective).toBe(true);
      expect(groupChange!.changedFields?.some((f) => f.field === "name")).toBe(true);
      const nameField = groupChange!.changedFields?.find((f) => f.field === "name");
      expect(nameField?.effectiveValue).toBe("Toppings");
      expect(nameField?.proposedValue).toBe("Toppings Deluxe");

      const scopeProductIds = new Set((groupChange!.affectedScope ?? []).map((s) => s.productId));
      expect(scopeProductIds.has(productA.id)).toBe(true);
      expect(scopeProductIds.has(productB.id)).toBe(true);

      const scopeVariantIds = new Set((groupChange!.affectedScope ?? []).map((s) => s.variantId));
      expect(scopeVariantIds.has(variantA.id)).toBe(true);
      expect(scopeVariantIds.has(variantB.id)).toBe(true);

      const bScope = (groupChange!.affectedScope ?? []).find((s) => s.productId === productB.id);
      expect(bScope?.relationship).toBe("shared_modifier_group");
      expect(bScope?.customerTruthAffected).toBe(true);

      const pub = await persistence.transaction((tx) =>
        publishCatalogContentChange(tx, {
          actor,
          brandId,
          productId: productA.id,
          expectedContentRevision: preview.expectedContentRevision,
        }),
      );
      expect(pub.changed).toBe(true);

      // Shared group effective content now Deluxe for both product graphs.
      const previewB = await persistence.transaction((tx) =>
        previewCatalogPublicationConsequence(tx, {
          actor,
          brandId,
          productId: productB.id,
        }),
      );
      const leftover = previewB.changes.find(
        (c) =>
          c.entityKind === "modifier_group" &&
          c.entityId === group.id &&
          c.changedFields?.some((f) => f.field === "name" && f.proposedValue === "Toppings Deluxe"),
      );
      expect(leftover).toBeUndefined();
    });
  });

  it("staged consumer retirement still reports customerTruthAffected until published", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const brandId = tree.brand.id;

      const productA = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId,
          code: "retire-a",
          name: "Product A",
          productKind: "standard",
        }),
      );
      const variantA = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor,
          productId: productA.id,
          code: "va",
          name: "A Default",
          isDefault: true,
          isSelectorVisible: true,
        }),
      );
      const productB = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId,
          code: "retire-b",
          name: "Product B",
          productKind: "standard",
        }),
      );
      const variantB = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor,
          productId: productB.id,
          code: "vb",
          name: "B Default",
          isDefault: true,
          isSelectorVisible: true,
        }),
      );

      const group = await persistence.transaction((tx) =>
        createModifierGroup(tx, { actor, brandId, code: "shared-retire", name: "Toppings" }),
      );
      const option = await persistence.transaction((tx) =>
        createModifierOption(tx, { actor, brandId, code: "pearl-r", name: "Pearl" }),
      );
      const groupOption = await persistence.transaction((tx) =>
        addModifierOptionToGroup(tx, {
          actor,
          modifierGroupId: group.id,
          modifierOptionId: option.id,
          minQuantity: 0,
          maxQuantity: 1,
          defaultQuantity: 0,
          position: 0,
        }),
      );
      const vmgA = await persistence.transaction((tx) =>
        applyModifierGroupToVariant(tx, {
          actor,
          variantId: variantA.id,
          modifierGroupId: group.id,
          minTotalQuantity: 0,
          maxTotalQuantity: 1,
          position: 0,
        }),
      );
      const vmgB = await persistence.transaction((tx) =>
        applyModifierGroupToVariant(tx, {
          actor,
          variantId: variantB.id,
          modifierGroupId: group.id,
          minTotalQuantity: 0,
          maxTotalQuantity: 1,
          position: 0,
        }),
      );

      await persistence.transaction(async (tx) => {
        await activateVariant(tx, { actor, variantId: variantA.id });
        await activateVariant(tx, { actor, variantId: variantB.id });
        await activateProduct(tx, { actor, productId: productA.id });
        await activateProduct(tx, { actor, productId: productB.id });
        await activateModifierGroup(tx, { actor, modifierGroupId: group.id });
        await activateModifierOption(tx, { actor, modifierOptionId: option.id });
        await activateModifierGroupOption(tx, { actor, modifierGroupOptionId: groupOption.id });
        await activateVariantModifierGroup(tx, { actor, variantModifierGroupId: vmgA.id });
        await activateVariantModifierGroup(tx, { actor, variantModifierGroupId: vmgB.id });
      });

      await persistence.transaction((tx) =>
        publishProductEnvelope(tx, { actor, brandId, productId: productA.id }),
      );
      await persistence.transaction((tx) =>
        publishProductEnvelope(tx, { actor, brandId, productId: productB.id }),
      );

      // Stage B binding retirement without publishing — customer still consumes.
      await persistence.transaction((tx) =>
        retireVariantModifierGroup(tx, { actor, variantModifierGroupId: vmgB.id }),
      );

      const groupFresh = await persistence.withContext((ctx) =>
        findModifierGroupById(ctx, group.id),
      );
      await persistence.transaction((tx) =>
        saveModifierGroupContentDraft(tx, {
          actor,
          modifierGroupId: group.id,
          expectedContentRevision: groupFresh!.draftContentRevision,
          name: "Toppings Staged Retire",
        }),
      );

      const previewStaged = await persistence.transaction((tx) =>
        previewCatalogPublicationConsequence(tx, {
          actor,
          brandId,
          productId: productA.id,
        }),
      );
      const groupChangeStaged = previewStaged.changes.find(
        (c) => c.entityKind === "modifier_group" && c.entityId === group.id,
      );
      expect(groupChangeStaged).toBeTruthy();
      const bScopeStaged = (groupChangeStaged!.affectedScope ?? []).find(
        (s) => s.productId === productB.id,
      );
      expect(bScopeStaged?.customerTruthAffected).toBe(true);

      // Publish B retirement via B's envelope — customer no longer consumes.
      const previewBRetire = await persistence.transaction((tx) =>
        previewCatalogPublicationConsequence(tx, {
          actor,
          brandId,
          productId: productB.id,
        }),
      );
      await persistence.transaction((tx) =>
        publishCatalogContentChange(tx, {
          actor,
          brandId,
          productId: productB.id,
          expectedContentRevision: previewBRetire.expectedContentRevision,
        }),
      );

      const groupAfter = await persistence.withContext((ctx) =>
        findModifierGroupById(ctx, group.id),
      );
      await persistence.transaction((tx) =>
        saveModifierGroupContentDraft(tx, {
          actor,
          modifierGroupId: group.id,
          expectedContentRevision: groupAfter!.draftContentRevision,
          name: "Toppings After Retire Publish",
        }),
      );

      const previewPublished = await persistence.transaction((tx) =>
        previewCatalogPublicationConsequence(tx, {
          actor,
          brandId,
          productId: productA.id,
        }),
      );
      const groupChangePublished = previewPublished.changes.find(
        (c) => c.entityKind === "modifier_group" && c.entityId === group.id,
      );
      expect(groupChangePublished).toBeTruthy();
      const bScopePublished = (groupChangePublished!.affectedScope ?? []).find(
        (s) => s.productId === productB.id,
      );
      expect(bScopePublished?.customerTruthAffected).toBe(false);
    });
  });

  it("VMG cardinality change scopes only the changed binding variant", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const brandId = tree.brand.id;

      const productA = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId,
          code: "vmg-a",
          name: "Product A",
          productKind: "standard",
        }),
      );
      const variantA = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor,
          productId: productA.id,
          code: "va",
          name: "A Default",
          isDefault: true,
          isSelectorVisible: true,
        }),
      );
      const productB = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId,
          code: "vmg-b",
          name: "Product B",
          productKind: "standard",
        }),
      );
      const variantB = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor,
          productId: productB.id,
          code: "vb",
          name: "B Default",
          isDefault: true,
          isSelectorVisible: true,
        }),
      );

      const group = await persistence.transaction((tx) =>
        createModifierGroup(tx, { actor, brandId, code: "shared-vmg", name: "Toppings" }),
      );
      const option = await persistence.transaction((tx) =>
        createModifierOption(tx, { actor, brandId, code: "pearl-v", name: "Pearl" }),
      );
      const groupOption = await persistence.transaction((tx) =>
        addModifierOptionToGroup(tx, {
          actor,
          modifierGroupId: group.id,
          modifierOptionId: option.id,
          minQuantity: 0,
          maxQuantity: 1,
          defaultQuantity: 0,
          position: 0,
        }),
      );
      const vmgA = await persistence.transaction((tx) =>
        applyModifierGroupToVariant(tx, {
          actor,
          variantId: variantA.id,
          modifierGroupId: group.id,
          minTotalQuantity: 0,
          maxTotalQuantity: 1,
          position: 0,
        }),
      );
      const vmgB = await persistence.transaction((tx) =>
        applyModifierGroupToVariant(tx, {
          actor,
          variantId: variantB.id,
          modifierGroupId: group.id,
          minTotalQuantity: 0,
          maxTotalQuantity: 1,
          position: 0,
        }),
      );

      await persistence.transaction(async (tx) => {
        await activateVariant(tx, { actor, variantId: variantA.id });
        await activateVariant(tx, { actor, variantId: variantB.id });
        await activateProduct(tx, { actor, productId: productA.id });
        await activateProduct(tx, { actor, productId: productB.id });
        await activateModifierGroup(tx, { actor, modifierGroupId: group.id });
        await activateModifierOption(tx, { actor, modifierOptionId: option.id });
        await activateModifierGroupOption(tx, { actor, modifierGroupOptionId: groupOption.id });
        await activateVariantModifierGroup(tx, { actor, variantModifierGroupId: vmgA.id });
        await activateVariantModifierGroup(tx, { actor, variantModifierGroupId: vmgB.id });
      });

      await persistence.transaction((tx) =>
        publishProductEnvelope(tx, { actor, brandId, productId: productA.id }),
      );
      await persistence.transaction((tx) =>
        publishProductEnvelope(tx, { actor, brandId, productId: productB.id }),
      );

      const vmgAFresh = await persistence.withContext((ctx) =>
        findVariantModifierGroupById(ctx, vmgA.id),
      );
      await persistence.transaction((tx) =>
        saveVariantModifierGroupContentDraft(tx, {
          actor,
          variantModifierGroupId: vmgA.id,
          expectedContentRevision: vmgAFresh!.draftContentRevision,
          maxTotalQuantity: 3,
        }),
      );

      const preview = await persistence.transaction((tx) =>
        previewCatalogPublicationConsequence(tx, {
          actor,
          brandId,
          productId: productA.id,
        }),
      );

      const vmgChange = preview.changes.find(
        (c) => c.entityKind === "variant_modifier_group" && c.entityId === vmgA.id,
      );
      expect(vmgChange).toBeTruthy();
      expect(vmgChange!.changedFields?.some((f) => f.field === "maxTotalQuantity")).toBe(true);

      const scopeVariantIds = (vmgChange!.affectedScope ?? []).map((s) => s.variantId);
      expect(scopeVariantIds).toEqual([variantA.id]);
      expect(scopeVariantIds).not.toContain(variantB.id);

      const aScope = (vmgChange!.affectedScope ?? []).find((s) => s.variantId === variantA.id);
      expect(aScope?.customerTruthAffected).toBe(true);
    });
  });
});
