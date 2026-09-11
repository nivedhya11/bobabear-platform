/**
 * IMP-036F F1 publication invariants.
 *
 * These tests pin the properties the ENTITY_CONTENT_REVISION model exists to
 * guarantee: a reviewed Brand envelope can never publish content the reviewer
 * did not see, staged lifecycle is invisible to customers until publication,
 * publication is atomic, and a missing effective revision fails closed rather
 * than falling back to the mutable primary draft row.
 */
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  catalogModifierGroupOptionsTable,
  catalogModifierGroupsTable,
  catalogModifierOptionsTable,
  catalogMutationAuditEventsTable,
  catalogProductContentRevisionsTable,
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
  findModifierGroupById,
  findModifierGroupOptionById,
  findProductById,
  findVariantById,
  loadEffectiveProductContent,
  loadEffectiveVariantContent,
  publishCatalogContentChange,
  retireModifierGroupOption,
  retireProduct,
  saveModifierGroupContentDraft,
  saveProductContentDraft,
  saveVariantContentDraft,
  updateModifierGroup,
  updateProduct,
  updateVariant,
} from "../../src/server/catalog";
import {
  loadEffectiveModifierGroupContent,
  loadEffectiveModifierGroupOptionContent,
  loadEffectiveModifierOptionContent,
  loadEffectiveVariantModifierGroupContent,
} from "../../src/server/catalog/revisions";
import type { PersistenceQueryContext } from "../../src/server/persistence/types";
import {
  publishProductEnvelope,
  readBrandContentRevision,
  withCatalogDomain,
} from "./support";

type TestPersistence = Parameters<Parameters<typeof withCatalogDomain>[0]>[0];

const CONTENT_PUBLISHED_ACTION = "catalog.content_published";

async function countContentPublishedEvents(
  context: PersistenceQueryContext,
  brandId: string,
): Promise<number> {
  const rows = await context.db
    .select()
    .from(catalogMutationAuditEventsTable)
    .where(
      and(
        eq(catalogMutationAuditEventsTable.brandId, brandId),
        eq(catalogMutationAuditEventsTable.action, CONTENT_PUBLISHED_ACTION),
      ),
    );
  return rows.length;
}

/**
 * Published single-variant standard product. `isSelectorVisible` is on so the
 * same seed can grow a second variant without tripping multi-variant graph
 * validation.
 */
async function seedPublishedProduct(
  persistence: TestPersistence,
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
  return {
    productId: product.id,
    variantId: variant.id,
    envelopeAfterPublish: await persistence.withContext((ctx) =>
      readBrandContentRevision(ctx, brandId),
    ),
  };
}

/**
 * Published product whose default variant carries one modifier group with two
 * active option bindings, so a single binding can be retired without breaking
 * active-graph validation.
 */
async function seedPublishedProductWithModifiers(
  persistence: TestPersistence,
  actor: unknown,
  brandId: string,
  codePrefix: string,
) {
  const base = await seedPublishedProduct(
    persistence,
    actor,
    brandId,
    `${codePrefix}-p`,
    `${codePrefix} Product`,
  );

  const group = await persistence.transaction((tx) =>
    createModifierGroup(tx, {
      actor,
      brandId,
      code: `${codePrefix}-g`,
      name: "Toppings",
    }),
  );
  const optionOne = await persistence.transaction((tx) =>
    createModifierOption(tx, { actor, brandId, code: `${codePrefix}-o1`, name: "Pearl" }),
  );
  const optionTwo = await persistence.transaction((tx) =>
    createModifierOption(tx, { actor, brandId, code: `${codePrefix}-o2`, name: "Jelly" }),
  );
  const bindingOne = await persistence.transaction((tx) =>
    addModifierOptionToGroup(tx, {
      actor,
      modifierGroupId: group.id,
      modifierOptionId: optionOne.id,
      minQuantity: 0,
      maxQuantity: 1,
      defaultQuantity: 0,
      position: 0,
    }),
  );
  const bindingTwo = await persistence.transaction((tx) =>
    addModifierOptionToGroup(tx, {
      actor,
      modifierGroupId: group.id,
      modifierOptionId: optionTwo.id,
      minQuantity: 0,
      maxQuantity: 1,
      defaultQuantity: 0,
      position: 1,
    }),
  );
  const vmg = await persistence.transaction((tx) =>
    applyModifierGroupToVariant(tx, {
      actor,
      variantId: base.variantId,
      modifierGroupId: group.id,
      minTotalQuantity: 0,
      maxTotalQuantity: 2,
      position: 0,
    }),
  );

  await persistence.transaction(async (tx) => {
    await activateModifierOption(tx, { actor, modifierOptionId: optionOne.id });
    await activateModifierOption(tx, { actor, modifierOptionId: optionTwo.id });
    await activateModifierGroupOption(tx, { actor, modifierGroupOptionId: bindingOne.id });
    await activateModifierGroupOption(tx, { actor, modifierGroupOptionId: bindingTwo.id });
    await activateModifierGroup(tx, { actor, modifierGroupId: group.id });
    await activateVariantModifierGroup(tx, { actor, variantModifierGroupId: vmg.id });
  });

  return {
    ...base,
    groupId: group.id,
    optionOneId: optionOne.id,
    optionTwoId: optionTwo.id,
    bindingOneId: bindingOne.id,
    bindingTwoId: bindingTwo.id,
    variantModifierGroupId: vmg.id,
  };
}

describe("IMP-036F F1 — reviewed aggregate revision invalidation", () => {
  it("material Product draft invalidates a previously reviewed Catalog aggregate revision", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedPublishedProduct(
        persistence,
        actor,
        tree.brand.id,
        "inv-prod-draft",
        "Product Draft",
      );

      const reviewed = await persistence.withContext((ctx) =>
        readBrandContentRevision(ctx, tree.brand.id),
      );
      await persistence.transaction((tx) =>
        saveProductContentDraft(tx, {
          actor,
          productId: seeded.productId,
          expectedContentRevision: 1,
          name: "Unreviewed Product Name",
        }),
      );

      const afterDraft = await persistence.withContext((ctx) =>
        readBrandContentRevision(ctx, tree.brand.id),
      );
      expect(afterDraft).toBeGreaterThan(reviewed);

      await expect(
        persistence.transaction((tx) =>
          publishCatalogContentChange(tx, {
            actor,
            brandId: tree.brand.id,
            expectedContentRevision: reviewed,
            productId: seeded.productId,
          }),
        ),
      ).rejects.toBeInstanceOf(CatalogConflictError);
    });
  });

  it("material Variant draft invalidates a previously reviewed Catalog aggregate revision", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedPublishedProduct(
        persistence,
        actor,
        tree.brand.id,
        "inv-var-draft",
        "Variant Draft",
      );

      const reviewed = await persistence.withContext((ctx) =>
        readBrandContentRevision(ctx, tree.brand.id),
      );
      await persistence.transaction((tx) =>
        saveVariantContentDraft(tx, {
          actor,
          variantId: seeded.variantId,
          expectedContentRevision: 1,
          name: "Unreviewed Variant Name",
        }),
      );

      expect(
        await persistence.withContext((ctx) => readBrandContentRevision(ctx, tree.brand.id)),
      ).toBeGreaterThan(reviewed);

      await expect(
        persistence.transaction((tx) =>
          publishCatalogContentChange(tx, {
            actor,
            brandId: tree.brand.id,
            expectedContentRevision: reviewed,
            productId: seeded.productId,
          }),
        ),
      ).rejects.toBeInstanceOf(CatalogConflictError);
    });
  });

  it("material ModifierGroup draft invalidates a previously reviewed aggregate revision", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedPublishedProductWithModifiers(
        persistence,
        actor,
        tree.brand.id,
        "invmg",
      );

      const reviewed = await persistence.withContext((ctx) =>
        readBrandContentRevision(ctx, tree.brand.id),
      );
      await persistence.transaction((tx) =>
        saveModifierGroupContentDraft(tx, {
          actor,
          modifierGroupId: seeded.groupId,
          expectedContentRevision: 1,
          name: "Unreviewed Group Name",
        }),
      );

      expect(
        await persistence.withContext((ctx) => readBrandContentRevision(ctx, tree.brand.id)),
      ).toBeGreaterThan(reviewed);

      await expect(
        persistence.transaction((tx) =>
          publishCatalogContentChange(tx, {
            actor,
            brandId: tree.brand.id,
            expectedContentRevision: reviewed,
            productId: seeded.productId,
          }),
        ),
      ).rejects.toBeInstanceOf(CatalogConflictError);
    });
  });

  it("reviewed N + intervening draft + publish(N) conflicts with zero customer effect", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedPublishedProduct(
        persistence,
        actor,
        tree.brand.id,
        "inv-zero-effect",
        "Zero Effect",
      );

      const reviewed = await persistence.withContext((ctx) =>
        readBrandContentRevision(ctx, tree.brand.id),
      );
      const publishedEventsBefore = await persistence.withContext((ctx) =>
        countContentPublishedEvents(ctx, tree.brand.id),
      );

      await persistence.transaction((tx) =>
        saveProductContentDraft(tx, {
          actor,
          productId: seeded.productId,
          expectedContentRevision: 1,
          name: "Never Published",
        }),
      );
      const envelopeAfterDraft = await persistence.withContext((ctx) =>
        readBrandContentRevision(ctx, tree.brand.id),
      );

      await expect(
        persistence.transaction((tx) =>
          publishCatalogContentChange(tx, {
            actor,
            brandId: tree.brand.id,
            expectedContentRevision: reviewed,
            productId: seeded.productId,
          }),
        ),
      ).rejects.toBeInstanceOf(CatalogConflictError);

      const product = await persistence.withContext((ctx) =>
        findProductById(ctx, seeded.productId),
      );
      expect(product!.effectiveContentRevision).toBe(BigInt(1));
      const customerContent = await persistence.withContext((ctx) =>
        loadEffectiveProductContent(ctx, product!),
      );
      expect(customerContent!.name).toBe("Zero Effect");

      expect(
        await persistence.withContext((ctx) => readBrandContentRevision(ctx, tree.brand.id)),
      ).toBe(envelopeAfterDraft);
      expect(
        await persistence.withContext((ctx) =>
          countContentPublishedEvents(ctx, tree.brand.id),
        ),
      ).toBe(publishedEventsBefore);
    });
  });

  it("child graph mutated in another transaction after review conflicts with zero effect", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedPublishedProduct(
        persistence,
        actor,
        tree.brand.id,
        "inv-child-race",
        "Child Race",
      );

      // Reviewer validated the candidate at N.
      const reviewed = await persistence.withContext((ctx) =>
        readBrandContentRevision(ctx, tree.brand.id),
      );

      // A separate transaction commits a child (Variant) content change first.
      await persistence.transaction((tx) =>
        saveVariantContentDraft(tx, {
          actor,
          variantId: seeded.variantId,
          expectedContentRevision: 1,
          name: "Racing Variant Name",
        }),
      );

      // The publisher still holding N cannot switch effective pointers.
      await expect(
        persistence.transaction((tx) =>
          publishCatalogContentChange(tx, {
            actor,
            brandId: tree.brand.id,
            expectedContentRevision: reviewed,
            productId: seeded.productId,
          }),
        ),
      ).rejects.toBeInstanceOf(CatalogConflictError);

      const variant = await persistence.withContext((ctx) =>
        findVariantById(ctx, seeded.variantId),
      );
      expect(variant!.effectiveContentRevision).toBe(BigInt(1));
      expect(variant!.draftContentRevision).toBe(BigInt(2));
      const variantContent = await persistence.withContext((ctx) =>
        loadEffectiveVariantContent(ctx, variant!),
      );
      expect(variantContent!.name).toBe("Child Race A");
    });
  });
});

describe("IMP-036F F1 — staged lifecycle stays invisible until publication", () => {
  it("activating a new modifier group/option/binding is not customer-visible before publish", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedPublishedProductWithModifiers(
        persistence,
        actor,
        tree.brand.id,
        "invstage",
      );

      const staged = await persistence.withContext(async (ctx) => {
        const group = (
          await ctx.db
            .select()
            .from(catalogModifierGroupsTable)
            .where(eq(catalogModifierGroupsTable.id, seeded.groupId))
        )[0]!;
        const option = (
          await ctx.db
            .select()
            .from(catalogModifierOptionsTable)
            .where(eq(catalogModifierOptionsTable.id, seeded.optionOneId))
        )[0]!;
        const binding = (
          await ctx.db
            .select()
            .from(catalogModifierGroupOptionsTable)
            .where(eq(catalogModifierGroupOptionsTable.id, seeded.bindingOneId))
        )[0]!;
        const vmg = (
          await ctx.db
            .select()
            .from(catalogVariantModifierGroupsTable)
            .where(eq(catalogVariantModifierGroupsTable.id, seeded.variantModifierGroupId))
        )[0]!;
        return {
          group,
          option,
          binding,
          vmg,
          groupContent: await loadEffectiveModifierGroupContent(ctx, group),
          optionContent: await loadEffectiveModifierOptionContent(ctx, option),
          bindingContent: await loadEffectiveModifierGroupOptionContent(ctx, binding),
          vmgContent: await loadEffectiveVariantModifierGroupContent(ctx, vmg),
        };
      });

      expect(staged.group.lifecycleStatus).toBe("active");
      expect(staged.group.effectiveContentRevision).toBeNull();
      expect(staged.option.effectiveContentRevision).toBeNull();
      expect(staged.binding.effectiveContentRevision).toBeNull();
      expect(staged.vmg.effectiveContentRevision).toBeNull();
      expect(staged.groupContent).toBeNull();
      expect(staged.optionContent).toBeNull();
      expect(staged.bindingContent).toBeNull();
      expect(staged.vmgContent).toBeNull();

      await persistence.transaction((tx) =>
        publishProductEnvelope(tx, {
          actor,
          brandId: tree.brand.id,
          productId: seeded.productId,
        }),
      );

      const published = await persistence.withContext(async (ctx) => {
        const group = await findModifierGroupById(ctx, seeded.groupId);
        const binding = await findModifierGroupOptionById(ctx, seeded.bindingOneId);
        return {
          group,
          binding,
          groupContent: await loadEffectiveModifierGroupContent(ctx, group!),
          bindingContent: await loadEffectiveModifierGroupOptionContent(ctx, binding!),
        };
      });
      expect(published.group!.effectiveContentRevision).toBe(BigInt(1));
      expect(published.groupContent!.name).toBe("Toppings");
      expect(published.bindingContent!.lifecycleStatus).toBe("active");
    });
  });

  it("retiring an effective modifier binding does not clear effective content before publish", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedPublishedProductWithModifiers(
        persistence,
        actor,
        tree.brand.id,
        "invretire",
      );
      await persistence.transaction((tx) =>
        publishProductEnvelope(tx, {
          actor,
          brandId: tree.brand.id,
          productId: seeded.productId,
        }),
      );

      const publishedBinding = await persistence.withContext((ctx) =>
        findModifierGroupOptionById(ctx, seeded.bindingOneId),
      );
      expect(publishedBinding!.effectiveContentRevision).not.toBeNull();

      await persistence.transaction((tx) =>
        retireModifierGroupOption(tx, {
          actor,
          modifierGroupOptionId: seeded.bindingOneId,
        }),
      );

      const staged = await persistence.withContext(async (ctx) => {
        const binding = await findModifierGroupOptionById(ctx, seeded.bindingOneId);
        return {
          binding,
          content: await loadEffectiveModifierGroupOptionContent(ctx, binding!),
        };
      });
      expect(staged.binding!.lifecycleStatus).toBe("retired");
      // Customer graph still serves the previously published ACTIVE revision.
      expect(staged.binding!.effectiveContentRevision).toBe(
        publishedBinding!.effectiveContentRevision,
      );
      expect(staged.content!.lifecycleStatus).toBe("active");

      await persistence.transaction((tx) =>
        publishProductEnvelope(tx, {
          actor,
          brandId: tree.brand.id,
          productId: seeded.productId,
        }),
      );

      const afterPublish = await persistence.withContext(async (ctx) => {
        const binding = await findModifierGroupOptionById(ctx, seeded.bindingOneId);
        return {
          binding,
          content: await loadEffectiveModifierGroupOptionContent(ctx, binding!),
        };
      });
      expect(afterPublish.content).toBeNull();
      expect(afterPublish.binding!.effectiveContentRevision).toBeNull();
    });
  });

  it("lifecycle retirement becomes customer-visible only after a valid publish", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedPublishedProduct(
        persistence,
        actor,
        tree.brand.id,
        "inv-lifecycle",
        "Lifecycle Atomic",
      );

      await persistence.transaction((tx) =>
        retireProduct(tx, { actor, productId: seeded.productId }),
      );

      const staged = await persistence.withContext((ctx) =>
        findProductById(ctx, seeded.productId),
      );
      expect(staged!.lifecycleStatus).toBe("retired");
      expect(staged!.effectiveContentRevision).toBe(BigInt(1));
      const stagedContent = await persistence.withContext((ctx) =>
        loadEffectiveProductContent(ctx, staged!),
      );
      expect(stagedContent!.name).toBe("Lifecycle Atomic");

      const result = await persistence.transaction((tx) =>
        publishProductEnvelope(tx, {
          actor,
          brandId: tree.brand.id,
          productId: seeded.productId,
        }),
      );
      expect(result.changed).toBe(true);

      const cleared = await persistence.withContext((ctx) =>
        findProductById(ctx, seeded.productId),
      );
      expect(cleared!.effectiveContentRevision).toBeNull();
      const clearedContent = await persistence.withContext((ctx) =>
        loadEffectiveProductContent(ctx, cleared!),
      );
      expect(clearedContent).toBeNull();
    });
  });

  it("variant default A→B switches customer-effective default only at publish", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedPublishedProduct(
        persistence,
        actor,
        tree.brand.id,
        "inv-default-switch",
        "Default Switch",
      );

      const variantB = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor,
          productId: seeded.productId,
          code: "b",
          name: "Default Switch B",
          isDefault: false,
          isSelectorVisible: true,
        }),
      );
      await persistence.transaction((tx) =>
        activateVariant(tx, { actor, variantId: variantB.id }),
      );
      await persistence.transaction((tx) =>
        publishProductEnvelope(tx, {
          actor,
          brandId: tree.brand.id,
          productId: seeded.productId,
        }),
      );

      const beforeSwitch = await persistence.withContext(async (ctx) => ({
        a: await loadEffectiveVariantContent(ctx, (await findVariantById(ctx, seeded.variantId))!),
        b: await loadEffectiveVariantContent(ctx, (await findVariantById(ctx, variantB.id))!),
      }));
      expect(beforeSwitch.a!.isDefault).toBe(true);
      expect(beforeSwitch.b!.isDefault).toBe(false);

      // Draft the switch: B claims the default and A is demoted via a revision.
      await persistence.transaction((tx) =>
        saveVariantContentDraft(tx, {
          actor,
          variantId: variantB.id,
          expectedContentRevision: 1,
          isDefault: true,
        }),
      );

      const stagedSwitch = await persistence.withContext(async (ctx) => ({
        a: await loadEffectiveVariantContent(ctx, (await findVariantById(ctx, seeded.variantId))!),
        b: await loadEffectiveVariantContent(ctx, (await findVariantById(ctx, variantB.id))!),
      }));
      expect(stagedSwitch.a!.isDefault).toBe(true);
      expect(stagedSwitch.b!.isDefault).toBe(false);

      await persistence.transaction((tx) =>
        publishProductEnvelope(tx, {
          actor,
          brandId: tree.brand.id,
          productId: seeded.productId,
        }),
      );

      const afterSwitch = await persistence.withContext(async (ctx) => ({
        a: await loadEffectiveVariantContent(ctx, (await findVariantById(ctx, seeded.variantId))!),
        b: await loadEffectiveVariantContent(ctx, (await findVariantById(ctx, variantB.id))!),
      }));
      expect(afterSwitch.a!.isDefault).toBe(false);
      expect(afterSwitch.b!.isDefault).toBe(true);
    });
  });

  it("direct in-place content mutation of published entities remains rejected", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedPublishedProductWithModifiers(
        persistence,
        actor,
        tree.brand.id,
        "invinplace",
      );
      await persistence.transaction((tx) =>
        publishProductEnvelope(tx, {
          actor,
          brandId: tree.brand.id,
          productId: seeded.productId,
        }),
      );

      await expect(
        persistence.transaction((tx) =>
          updateProduct(tx, { actor, productId: seeded.productId, name: "Hacked Product" }),
        ),
      ).rejects.toBeInstanceOf(CatalogInvalidStateError);
      await expect(
        persistence.transaction((tx) =>
          updateVariant(tx, { actor, variantId: seeded.variantId, name: "Hacked Variant" }),
        ),
      ).rejects.toBeInstanceOf(CatalogInvalidStateError);
      await expect(
        persistence.transaction((tx) =>
          updateModifierGroup(tx, {
            actor,
            modifierGroupId: seeded.groupId,
            name: "Hacked Group",
          }),
        ),
      ).rejects.toBeInstanceOf(CatalogInvalidStateError);

      const product = await persistence.withContext((ctx) =>
        findProductById(ctx, seeded.productId),
      );
      expect(product!.name).toBe("invinplace Product");
      expect(product!.effectiveContentRevision).toBe(BigInt(1));
    });
  });
});

describe("IMP-036F F1 — unchanged publish is a no-op", () => {
  it("returns changed:false without bumping the envelope or emitting a publication event", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedPublishedProduct(
        persistence,
        actor,
        tree.brand.id,
        "inv-noop",
        "No Op",
      );

      const envelopeBefore = await persistence.withContext((ctx) =>
        readBrandContentRevision(ctx, tree.brand.id),
      );
      const eventsBefore = await persistence.withContext((ctx) =>
        countContentPublishedEvents(ctx, tree.brand.id),
      );

      const result = await persistence.transaction((tx) =>
        publishCatalogContentChange(tx, {
          actor,
          brandId: tree.brand.id,
          expectedContentRevision: envelopeBefore,
          productId: seeded.productId,
        }),
      );

      expect(result.changed).toBe(false);
      expect(result.contentRevision).toBe(envelopeBefore);
      expect(result.previousContentRevision).toBe(envelopeBefore);

      expect(
        await persistence.withContext((ctx) => readBrandContentRevision(ctx, tree.brand.id)),
      ).toBe(envelopeBefore);
      expect(
        await persistence.withContext((ctx) =>
          countContentPublishedEvents(ctx, tree.brand.id),
        ),
      ).toBe(eventsBefore);
      expect(seeded.envelopeAfterPublish).toBe(envelopeBefore);
    });
  });
});

describe("IMP-036F F1 — fail-closed customer reads", () => {
  it("a missing effective revision row cannot leak mutable primary draft content", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedPublishedProduct(
        persistence,
        actor,
        tree.brand.id,
        "inv-missing-rev",
        "Published Name",
      );

      await persistence.transaction((tx) =>
        saveProductContentDraft(tx, {
          actor,
          productId: seeded.productId,
          expectedContentRevision: 1,
          name: "Unpublished Draft Name",
        }),
      );

      // Simulate a lost / unreadable effective revision row.
      await persistence.transaction((tx) =>
        tx.db
          .delete(catalogProductContentRevisionsTable)
          .where(
            and(
              eq(catalogProductContentRevisionsTable.productId, seeded.productId),
              eq(catalogProductContentRevisionsTable.contentRevision, BigInt(1)),
            ),
          ),
      );

      const product = await persistence.withContext((ctx) =>
        findProductById(ctx, seeded.productId),
      );
      expect(product!.effectiveContentRevision).toBe(BigInt(1));
      expect(product!.name).toBe("Unpublished Draft Name"); // mutable primary mirror

      const content = await persistence.withContext((ctx) =>
        loadEffectiveProductContent(ctx, product!),
      );
      expect(content).toBeNull();
    });
  });

  it("a stale publish retains the previous complete customer graph", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedPublishedProductWithModifiers(
        persistence,
        actor,
        tree.brand.id,
        "invstale",
      );
      await persistence.transaction((tx) =>
        publishProductEnvelope(tx, {
          actor,
          brandId: tree.brand.id,
          productId: seeded.productId,
        }),
      );

      const before = await persistence.withContext(async (ctx) => ({
        product: await findProductById(ctx, seeded.productId),
        variant: await findVariantById(ctx, seeded.variantId),
        group: await findModifierGroupById(ctx, seeded.groupId),
        bindingOne: await findModifierGroupOptionById(ctx, seeded.bindingOneId),
        bindingTwo: await findModifierGroupOptionById(ctx, seeded.bindingTwoId),
      }));

      const reviewed = await persistence.withContext((ctx) =>
        readBrandContentRevision(ctx, tree.brand.id),
      );
      await persistence.transaction((tx) =>
        saveModifierGroupContentDraft(tx, {
          actor,
          modifierGroupId: seeded.groupId,
          expectedContentRevision: 1,
          name: "Unreviewed Group",
        }),
      );

      await expect(
        persistence.transaction((tx) =>
          publishCatalogContentChange(tx, {
            actor,
            brandId: tree.brand.id,
            expectedContentRevision: reviewed,
            productId: seeded.productId,
          }),
        ),
      ).rejects.toBeInstanceOf(CatalogConflictError);

      const after = await persistence.withContext(async (ctx) => ({
        product: await findProductById(ctx, seeded.productId),
        variant: await findVariantById(ctx, seeded.variantId),
        group: await findModifierGroupById(ctx, seeded.groupId),
        bindingOne: await findModifierGroupOptionById(ctx, seeded.bindingOneId),
        bindingTwo: await findModifierGroupOptionById(ctx, seeded.bindingTwoId),
      }));

      expect(after.product!.effectiveContentRevision).toBe(
        before.product!.effectiveContentRevision,
      );
      expect(after.variant!.effectiveContentRevision).toBe(
        before.variant!.effectiveContentRevision,
      );
      expect(after.group!.effectiveContentRevision).toBe(
        before.group!.effectiveContentRevision,
      );
      expect(after.bindingOne!.effectiveContentRevision).toBe(
        before.bindingOne!.effectiveContentRevision,
      );
      expect(after.bindingTwo!.effectiveContentRevision).toBe(
        before.bindingTwo!.effectiveContentRevision,
      );

      const groupContent = await persistence.withContext((ctx) =>
        loadEffectiveModifierGroupContent(ctx, after.group!),
      );
      expect(groupContent!.name).toBe("Toppings");
    });
  });
});
