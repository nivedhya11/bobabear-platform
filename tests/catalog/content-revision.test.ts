/**
 * IMP-036F ENTITY_CONTENT_REVISION publication tests (F1).
 *
 * Activation only stages a publication candidate: customer effect requires
 * `publishCatalogContentChange`. Every material draft save and every
 * activate/retire advances the Brand envelope, so publishes must always use the
 * envelope value read immediately before the call.
 */
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  catalogContentRevisionsTable,
  catalogModifierGroupsTable,
  catalogModifierOptionsTable,
  catalogProductContentRevisionsTable,
  catalogProductsTable,
  catalogVariantModifierGroupsTable,
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
  loadEffectiveProductContent,
  publishCatalogContentChange,
  saveModifierGroupContentDraft,
  saveProductContentDraft,
  saveVariantContentDraft,
  updateProduct,
  updateVariant,
} from "../../src/server/catalog";
import {
  publishProductEnvelope,
  readBrandContentRevision,
  withCatalogDomain,
} from "./support";

type TestPersistence = Parameters<Parameters<typeof withCatalogDomain>[0]>[0];

/**
 * Create + activate a standard product and its default variant WITHOUT
 * publishing. Leaves the product staged: primary rows active, effective
 * pointers still null, Brand envelope advanced by each activation.
 */
async function activateStandardProduct(
  persistence: TestPersistence,
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

/**
 * Activate and then publish, so the product/variant are customer-effective.
 * `envelopeAfterPublish` is the Brand revision a later publish must expect.
 */
async function seedActiveStandardProduct(
  persistence: TestPersistence,
  actor: unknown,
  brandId: string,
  code: string,
  name: string,
) {
  const staged = await activateStandardProduct(persistence, actor, brandId, code, name);
  await persistence.transaction((tx) =>
    publishProductEnvelope(tx, { actor, brandId, productId: staged.product.id }),
  );
  const product = await persistence.withContext((ctx) =>
    findProductById(ctx, staged.product.id),
  );
  const variant = await persistence.withContext((ctx) =>
    findVariantById(ctx, staged.variant.id),
  );
  const envelopeAfterPublish = await persistence.withContext((ctx) =>
    readBrandContentRevision(ctx, brandId),
  );
  return { product: product!, variant: variant!, envelopeAfterPublish };
}

describe("catalog content revisions (IMP-036F F1)", () => {
  it("activation alone does not establish effective content", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const { product, variant } = await activateStandardProduct(
        persistence,
        actor,
        tree.brand.id,
        "rev-activate-only",
        "Activation Tea",
      );

      expect(product.lifecycleStatus).toBe("active");
      expect(product.effectiveContentRevision).toBeNull();
      expect(product.draftContentRevision).toBe(BigInt(1));

      const variantAfter = await persistence.withContext((ctx) =>
        findVariantById(ctx, variant.id),
      );
      expect(variantAfter!.lifecycleStatus).toBe("active");
      expect(variantAfter!.effectiveContentRevision).toBeNull();

      // Fail-closed customer read: no effective pointer means no content.
      const effectiveContent = await persistence.withContext((ctx) =>
        loadEffectiveProductContent(ctx, product),
      );
      expect(effectiveContent).toBeNull();

      // Each activation invalidates any previously reviewed envelope.
      const envelope = await persistence.withContext((ctx) =>
        readBrandContentRevision(ctx, tree.brand.id),
      );
      expect(envelope).toBeGreaterThan(BigInt(1));
    });
  });

  it("publish after activation establishes effective revision 1 matching content", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const { product, envelopeAfterPublish } = await seedActiveStandardProduct(
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

      const effectiveContent = await persistence.withContext((ctx) =>
        loadEffectiveProductContent(ctx, product),
      );
      expect(effectiveContent).toEqual({ name: "Activation Tea", description: null });

      const envelope = await persistence.transaction(async (tx) => {
        const rows = await tx.db
          .select()
          .from(catalogContentRevisionsTable)
          .where(eq(catalogContentRevisionsTable.brandId, tree.brand.id));
        return rows[0];
      });
      expect(envelope?.contentRevision).toBe(envelopeAfterPublish);
      expect(envelopeAfterPublish).toBeGreaterThan(BigInt(1));
    });
  });

  it("draft save isolates from effective / customer content until publish", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const { product, envelopeAfterPublish } = await seedActiveStandardProduct(
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

      // The draft invalidated the envelope reviewers saw at publish time.
      const envelopeAfterDraft = await persistence.withContext((ctx) =>
        readBrandContentRevision(ctx, tree.brand.id),
      );
      expect(envelopeAfterDraft).toBe(envelopeAfterPublish + BigInt(1));

      const effectiveRow = await persistence.transaction(async (tx) => {
        const rows = await tx.db
          .select()
          .from(catalogProductContentRevisionsTable)
          .where(eq(catalogProductContentRevisionsTable.productId, product.id));
        return rows.find((r) => r.contentRevision === BigInt(1));
      });
      expect(effectiveRow!.name).toBe("Original Name");

      const customerContent = await persistence.withContext((ctx) =>
        loadEffectiveProductContent(ctx, afterDraft!),
      );
      expect(customerContent!.name).toBe("Original Name");
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

      const reviewed = await persistence.withContext((ctx) =>
        readBrandContentRevision(ctx, tree.brand.id),
      );
      const published = await persistence.transaction((tx) =>
        publishCatalogContentChange(tx, {
          actor,
          brandId: tree.brand.id,
          expectedContentRevision: reviewed,
          productId: product.id,
        }),
      );
      expect(published.changed).toBe(true);
      expect(published.contentRevision).toBe(reviewed + BigInt(1));

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

      // Reviewed envelope N; the first publish consumes it.
      const reviewed = await persistence.withContext((ctx) =>
        readBrandContentRevision(ctx, tree.brand.id),
      );
      await persistence.transaction((tx) =>
        publishCatalogContentChange(tx, {
          actor,
          brandId: tree.brand.id,
          expectedContentRevision: reviewed,
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
            expectedContentRevision: reviewed, // stale
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
      // Nothing has advanced the envelope yet, so 1 is the current revision:
      // the rejection must come from graph readiness, not from CAS.
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

  it("modifier activation and draft do not leak until product-envelope publish", async () => {
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

      const envelopeBeforeActivations = await persistence.withContext((ctx) =>
        readBrandContentRevision(ctx, tree.brand.id),
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

      // Each modifier activation advances the Brand envelope...
      const envelopeAfterActivations = await persistence.withContext((ctx) =>
        readBrandContentRevision(ctx, tree.brand.id),
      );
      expect(envelopeAfterActivations).toBeGreaterThan(envelopeBeforeActivations);

      // ...but none of them is customer-effective yet.
      const stagedModifiers = await persistence.transaction(async (tx) => {
        const groupRow = (
          await tx.db
            .select()
            .from(catalogModifierGroupsTable)
            .where(eq(catalogModifierGroupsTable.id, group.id))
        )[0]!;
        const optionRow = (
          await tx.db
            .select()
            .from(catalogModifierOptionsTable)
            .where(eq(catalogModifierOptionsTable.id, option.id))
        )[0]!;
        const vmgRow = (
          await tx.db
            .select()
            .from(catalogVariantModifierGroupsTable)
            .where(eq(catalogVariantModifierGroupsTable.id, vmg.id))
        )[0]!;
        return { groupRow, optionRow, vmgRow };
      });
      expect(stagedModifiers.groupRow.lifecycleStatus).toBe("active");
      expect(stagedModifiers.groupRow.effectiveContentRevision).toBeNull();
      expect(stagedModifiers.optionRow.effectiveContentRevision).toBeNull();
      expect(stagedModifiers.vmgRow.effectiveContentRevision).toBeNull();

      await persistence.transaction((tx) =>
        saveModifierGroupContentDraft(tx, {
          actor,
          modifierGroupId: group.id,
          expectedContentRevision: 1,
          name: "Sweetness",
        }),
      );

      // Before publish the product keeps its previously published revision.
      const beforePublish = await persistence.transaction(async (tx) => {
        const rows = await tx.db
          .select()
          .from(catalogProductsTable)
          .where(eq(catalogProductsTable.id, product.id));
        return rows[0]!;
      });
      expect(beforePublish.effectiveContentRevision).toBe(BigInt(1));

      await persistence.transaction((tx) =>
        publishProductEnvelope(tx, {
          actor,
          brandId: tree.brand.id,
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
