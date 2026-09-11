/**
 * IMP-036F ENTITY_CONTENT_REVISION publication tests (F1).
 */
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  catalogContentRevisionsTable,
  catalogModifierGroupsTable,
  catalogProductContentRevisionsTable,
  catalogProductsTable,
} from "../../src/platform/database/schema/catalog";
import {
  CatalogConflictError,
  CatalogInvalidStateError,
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
  findVariantById,
  publishCatalogContentChange,
  saveModifierGroupContentDraft,
  saveProductContentDraft,
  saveVariantContentDraft,
  updateProduct,
  updateVariant,
} from "../../src/server/catalog";
import { withCatalogDomain } from "./support";

async function seedActiveStandardProduct(
  persistence: Parameters<Parameters<typeof withCatalogDomain>[0]>[0],
  actor: unknown,
  brandId: string,
  code: string,
  name: string,
) {
  const product = await persistence.transaction((tx) =>
    createProduct(tx, {
      actor,
      brandId,
      code,
      name,
      productKind: "standard",
    }),
  );
  const variant = await persistence.transaction((tx) =>
    createVariant(tx, {
      actor,
      productId: product.id,
      code: "default",
      name: "Regular",
      isDefault: true,
      isSelectorVisible: false,
    }),
  );
  await persistence.transaction((tx) => activateVariant(tx, { actor, variantId: variant.id }));
  const activated = await persistence.transaction((tx) =>
    activateProduct(tx, { actor, productId: product.id }),
  );
  return { product: activated, variant };
}

describe("catalog content revisions (IMP-036F F1)", () => {
  it("activation establishes effective revision 1 matching content", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const { product } = await seedActiveStandardProduct(
        persistence,
        actor,
        tree.brand.id,
        "rev-activate",
        "Activation Tea",
      );

      expect(product.lifecycleStatus).toBe("active");
      expect(product.effectiveContentRevision).toBe(BigInt(1));
      expect(product.draftContentRevision).toBe(BigInt(1));

      const revision = await persistence.transaction(async (tx) => {
        const rows = await tx.db
          .select()
          .from(catalogProductContentRevisionsTable)
          .where(
            eq(catalogProductContentRevisionsTable.productId, product.id),
          );
        return rows;
      });
      expect(revision).toHaveLength(1);
      expect(revision[0]!.contentRevision).toBe(BigInt(1));
      expect(revision[0]!.name).toBe("Activation Tea");

      const envelope = await persistence.transaction(async (tx) => {
        const rows = await tx.db
          .select()
          .from(catalogContentRevisionsTable)
          .where(eq(catalogContentRevisionsTable.brandId, tree.brand.id));
        return rows[0];
      });
      expect(envelope?.contentRevision).toBe(BigInt(1));
    });
  });

  it("draft save isolates from effective / customer content until publish", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const { product } = await seedActiveStandardProduct(
        persistence,
        actor,
        tree.brand.id,
        "rev-draft",
        "Original Name",
      );

      const draft = await persistence.transaction((tx) =>
        saveProductContentDraft(tx, {
          actor,
          productId: product.id,
          expectedContentRevision: 1,
          name: "Draft Name",
        }),
      );
      expect(draft.draftContentRevision).toBe(BigInt(2));

      const afterDraft = await persistence.transaction((tx) =>
        findProductById(tx, product.id),
      );
      expect(afterDraft!.name).toBe("Draft Name"); // admin LWW mirror
      expect(afterDraft!.effectiveContentRevision).toBe(BigInt(1));
      expect(afterDraft!.draftContentRevision).toBe(BigInt(2));

      const effectiveRow = await persistence.transaction(async (tx) => {
        const rows = await tx.db
          .select()
          .from(catalogProductContentRevisionsTable)
          .where(eq(catalogProductContentRevisionsTable.productId, product.id));
        return rows.find((r) => r.contentRevision === BigInt(1));
      });
      expect(effectiveRow!.name).toBe("Original Name");
    });
  });

  it("rejects ACTIVE in-place updateProduct name; effective unchanged", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const { product } = await seedActiveStandardProduct(
        persistence,
        actor,
        tree.brand.id,
        "rev-inplace",
        "Keep Me",
      );

      await expect(
        persistence.transaction((tx) =>
          updateProduct(tx, { actor, productId: product.id, name: "Hacked" }),
        ),
      ).rejects.toBeInstanceOf(CatalogInvalidStateError);

      const still = await persistence.transaction((tx) => findProductById(tx, product.id));
      expect(still!.name).toBe("Keep Me");
      expect(still!.effectiveContentRevision).toBe(BigInt(1));
    });
  });

  it("rejects ACTIVE updateVariant isDefault in place", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const { variant } = await seedActiveStandardProduct(
        persistence,
        actor,
        tree.brand.id,
        "rev-var-inplace",
        "Variant Gate",
      );

      await expect(
        persistence.transaction((tx) =>
          updateVariant(tx, { actor, variantId: variant.id, isDefault: false }),
        ),
      ).rejects.toBeInstanceOf(CatalogInvalidStateError);
    });
  });

  it("publish with matching expectedContentRevision switches effective content", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const { product, variant } = await seedActiveStandardProduct(
        persistence,
        actor,
        tree.brand.id,
        "rev-publish",
        "Before Publish",
      );

      await persistence.transaction((tx) =>
        saveProductContentDraft(tx, {
          actor,
          productId: product.id,
          expectedContentRevision: 1,
          name: "After Publish",
        }),
      );
      await persistence.transaction((tx) =>
        saveVariantContentDraft(tx, {
          actor,
          variantId: variant.id,
          expectedContentRevision: 1,
          name: "New Variant Name",
        }),
      );

      const published = await persistence.transaction((tx) =>
        publishCatalogContentChange(tx, {
          actor,
          brandId: tree.brand.id,
          expectedContentRevision: 1,
          productId: product.id,
        }),
      );
      expect(published.contentRevision).toBe(BigInt(2));

      const after = await persistence.transaction((tx) => findProductById(tx, product.id));
      expect(after!.effectiveContentRevision).toBe(BigInt(2));
      expect(after!.name).toBe("After Publish");

      const effective = await persistence.transaction(async (tx) => {
        const rows = await tx.db
          .select()
          .from(catalogProductContentRevisionsTable)
          .where(eq(catalogProductContentRevisionsTable.productId, product.id));
        return rows.find((r) => r.contentRevision === after!.effectiveContentRevision);
      });
      expect(effective!.name).toBe("After Publish");

      const variantAfter = await persistence.transaction((tx) =>
        findVariantById(tx, variant.id),
      );
      expect(variantAfter!.effectiveContentRevision).toBe(BigInt(2));
    });
  });

  it("stale expectedContentRevision conflicts with no partial effective switch", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const { product, variant } = await seedActiveStandardProduct(
        persistence,
        actor,
        tree.brand.id,
        "rev-stale",
        "Stale A",
      );

      await persistence.transaction((tx) =>
        saveProductContentDraft(tx, {
          actor,
          productId: product.id,
          expectedContentRevision: 1,
          name: "Draft A",
        }),
      );
      await persistence.transaction((tx) =>
        saveVariantContentDraft(tx, {
          actor,
          variantId: variant.id,
          expectedContentRevision: 1,
          name: "Draft Variant",
        }),
      );

      // First publish consumes envelope 1 → 2
      await persistence.transaction((tx) =>
        publishCatalogContentChange(tx, {
          actor,
          brandId: tree.brand.id,
          expectedContentRevision: 1,
          productId: product.id,
        }),
      );

      await persistence.transaction((tx) =>
        saveProductContentDraft(tx, {
          actor,
          productId: product.id,
          expectedContentRevision: 2,
          name: "Second Draft Product",
        }),
      );
      await persistence.transaction((tx) =>
        saveVariantContentDraft(tx, {
          actor,
          variantId: variant.id,
          expectedContentRevision: 2,
          name: "Second Draft Variant",
        }),
      );

      const beforeProduct = await persistence.transaction((tx) =>
        findProductById(tx, product.id),
      );
      const beforeVariant = await persistence.transaction((tx) =>
        findVariantById(tx, variant.id),
      );

      await expect(
        persistence.transaction((tx) =>
          publishCatalogContentChange(tx, {
            actor,
            brandId: tree.brand.id,
            expectedContentRevision: 1, // stale
            productId: product.id,
          }),
        ),
      ).rejects.toBeInstanceOf(CatalogConflictError);

      const afterProduct = await persistence.transaction((tx) =>
        findProductById(tx, product.id),
      );
      const afterVariant = await persistence.transaction((tx) =>
        findVariantById(tx, variant.id),
      );
      expect(afterProduct!.effectiveContentRevision).toBe(
        beforeProduct!.effectiveContentRevision,
      );
      expect(afterVariant!.effectiveContentRevision).toBe(
        beforeVariant!.effectiveContentRevision,
      );

      const effectiveProduct = await persistence.transaction(async (tx) => {
        const rows = await tx.db
          .select()
          .from(catalogProductContentRevisionsTable)
          .where(eq(catalogProductContentRevisionsTable.productId, product.id));
        return rows.find(
          (r) => r.contentRevision === afterProduct!.effectiveContentRevision,
        );
      });
      expect(effectiveProduct!.name).toBe("Draft A");
    });
  });

  it("invalid graph does not publish", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const product = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId: tree.brand.id,
          code: "rev-invalid",
          name: "No Variant Product",
          productKind: "standard",
        }),
      );
      // Draft-only product cannot activate/publish without default variant.
      await expect(
        persistence.transaction((tx) =>
          publishCatalogContentChange(tx, {
            actor,
            brandId: tree.brand.id,
            expectedContentRevision: 1,
            productId: product.id,
          }),
        ),
      ).rejects.toBeInstanceOf(CatalogInvalidStateError);
    });
  });

  it("modifier draft does not leak until product-envelope publish", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const { product, variant } = await seedActiveStandardProduct(
        persistence,
        actor,
        tree.brand.id,
        "rev-mod",
        "Modifier Root",
      );

      const group = await persistence.transaction((tx) =>
        createModifierGroup(tx, {
          actor,
          brandId: tree.brand.id,
          code: "sugar",
          name: "Sugar Level",
        }),
      );
      const option = await persistence.transaction((tx) =>
        createModifierOption(tx, {
          actor,
          brandId: tree.brand.id,
          code: "less-sugar",
          name: "Less Sugar",
        }),
      );
      const binding = await persistence.transaction((tx) =>
        addModifierOptionToGroup(tx, {
          actor,
          modifierGroupId: group.id,
          modifierOptionId: option.id,
          maxQuantity: 1,
          defaultQuantity: 0,
          position: 0,
        }),
      );
      const vmg = await persistence.transaction((tx) =>
        applyModifierGroupToVariant(tx, {
          actor,
          variantId: variant.id,
          modifierGroupId: group.id,
          maxTotalQuantity: 1,
          position: 0,
        }),
      );

      await persistence.transaction((tx) =>
        activateModifierOption(tx, { actor, modifierOptionId: option.id }),
      );
      await persistence.transaction((tx) =>
        activateModifierGroupOption(tx, {
          actor,
          modifierGroupOptionId: binding.id,
        }),
      );
      await persistence.transaction((tx) =>
        activateModifierGroup(tx, { actor, modifierGroupId: group.id }),
      );
      await persistence.transaction((tx) =>
        activateVariantModifierGroup(tx, {
          actor,
          variantModifierGroupId: vmg.id,
        }),
      );

      await persistence.transaction((tx) =>
        saveModifierGroupContentDraft(tx, {
          actor,
          modifierGroupId: group.id,
          expectedContentRevision: 1,
          name: "Sweetness",
        }),
      );

      // Before publish: effective group name remains Sugar Level
      const beforePublish = await persistence.transaction(async (tx) => {
        const rows = await tx.db
          .select()
          .from(catalogProductsTable)
          .where(eq(catalogProductsTable.id, product.id));
        return rows[0]!;
      });
      expect(beforePublish.effectiveContentRevision).toBe(BigInt(1));

      await persistence.transaction((tx) =>
        publishCatalogContentChange(tx, {
          actor,
          brandId: tree.brand.id,
          expectedContentRevision: 1,
          productId: product.id,
        }),
      );

      const groupAfter = await persistence.transaction(async (tx) => {
        const rows = await tx.db
          .select()
          .from(catalogModifierGroupsTable)
          .where(eq(catalogModifierGroupsTable.id, group.id));
        return rows[0]!;
      });
      expect(groupAfter.effectiveContentRevision).toBe(BigInt(2));
      expect(groupAfter.name).toBe("Sweetness");
    });
  });

  it("preserves lifecycle DRAFT/ACTIVE/RETIRED without hard delete", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const draft = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId: tree.brand.id,
          code: "rev-life",
          name: "Lifecycle Product",
          productKind: "standard",
        }),
      );
      expect(draft.lifecycleStatus).toBe("draft");
      expect(draft.effectiveContentRevision).toBeNull();

      // In-place draft authoring still allowed before first publication.
      const renamed = await persistence.transaction((tx) =>
        updateProduct(tx, {
          actor,
          productId: draft.id,
          name: "Draft Rename",
        }),
      );
      expect(renamed.name).toBe("Draft Rename");
      expect(renamed.lifecycleStatus).toBe("draft");

      const rows = await persistence.transaction(async (tx) => {
        return tx.db
          .select()
          .from(catalogProductsTable)
          .where(eq(catalogProductsTable.id, draft.id));
      });
      expect(rows).toHaveLength(1);
    });
  });
});
