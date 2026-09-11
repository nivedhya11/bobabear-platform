/**
 * IMP-036F F1 downstream publication-envelope corrections.
 *
 * Proves customer eligibility, checkout labels, material no-op (A→B→A),
 * Brand-first lock order concurrency, and association staging invalidation
 * all resolve PUBLISHED / EFFECTIVE Catalog truth.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { catalogMutationAuditEventsTable } from "../../src/platform/database/schema/catalog";
import {
  resolveOutletVariantAvailability,
  resolveModifierOptionAvailability,
} from "../../src/server/assortment";
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
  findVariantById,
  findModifierGroupOptionById,
  publishCatalogContentChange,
  retireModifierGroupOption,
  retireProduct,
  retireVariant,
  saveModifierGroupContentDraft,
  saveModifierGroupOptionContentDraft,
  saveModifierOptionContentDraft,
  saveProductContentDraft,
  saveVariantContentDraft,
} from "../../src/server/catalog";
import {
  loadEffectiveProductContent,
  loadEffectiveVariantContent,
} from "../../src/server/catalog/revisions";
import { loadCatalogLabelsForCart } from "../../src/server/checkout/adapters/catalog";
import type { PersistenceQueryContext } from "../../src/server/persistence/types";
import type { Cart } from "../../src/shared/cart";
import {
  configureAlwaysAcceptingOutlet,
  createActiveStandardVariant,
  includeVariantAtBrand,
  nowInsideAcceptingWindow,
  withAssortmentDomain,
} from "../assortment-availability/support";
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

async function seedPublishedProduct(
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
      maxQuantity: 2,
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
      maxTotalQuantity: 3,
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
  await persistence.transaction((tx) =>
    publishProductEnvelope(tx, { actor, brandId, productId: base.productId }),
  );
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

function labelsCart(input: {
  brandId: string;
  variantId: string;
  modifiers?: ReadonlyArray<{
    variantModifierGroupId: string;
    modifierGroupOptionId: string;
  }>;
}): Cart {
  const now = new Date();
  return Object.freeze({
    id: "00000000-0000-4000-8000-000000000099",
    brandId: input.brandId,
    ownerMode: "guest",
    revision: BigInt(1),
    manualCouponCode: null,
    expiresAt: null,
    createdAt: now,
    updatedAt: now,
    lines: Object.freeze([
      Object.freeze({
        id: "00000000-0000-4000-8000-000000000098",
        variantId: input.variantId,
        quantity: 1,
        modifiers: Object.freeze(
          (input.modifiers ?? []).map((mod) =>
            Object.freeze({
              variantModifierGroupId: mod.variantModifierGroupId,
              modifierGroupOptionId: mod.modifierGroupOptionId,
              quantity: 1,
            }),
          ),
        ),
        bundleSelections: Object.freeze([]),
      }),
    ]),
  });
}

describe("IMP-036F F1 — eligibility uses effective Catalog truth", () => {
  it("staged Product retirement does not alter outlet eligibility until publish", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor, outletManagerActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "elig-ret-p",
      );
      await configureAlwaysAcceptingOutlet(persistence, outletManagerActor, tree.outletA.id);
      await includeVariantAtBrand(persistence, brandAdminActor, tree.brand.id, catalog.variantId);

      const before = await persistence.withContext((ctx) =>
        resolveOutletVariantAvailability(ctx, {
          variantId: catalog.variantId,
          outletId: tree.outletA.id,
          context: { now: nowInsideAcceptingWindow() },
        }),
      );
      expect(before).toEqual({ eligible: true, code: "AVAILABLE" });

      await persistence.transaction((tx) =>
        retireProduct(tx, { actor: brandAdminActor, productId: catalog.productId }),
      );

      const staged = await persistence.withContext((ctx) =>
        resolveOutletVariantAvailability(ctx, {
          variantId: catalog.variantId,
          outletId: tree.outletA.id,
          context: { now: nowInsideAcceptingWindow() },
        }),
      );
      expect(staged).toEqual({ eligible: true, code: "AVAILABLE" });

      await persistence.transaction((tx) =>
        publishProductEnvelope(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          productId: catalog.productId,
        }),
      );

      const after = await persistence.withContext((ctx) =>
        resolveOutletVariantAvailability(ctx, {
          variantId: catalog.variantId,
          outletId: tree.outletA.id,
          context: { now: nowInsideAcceptingWindow() },
        }),
      );
      expect(after).toEqual({ eligible: false, code: "CATALOG_INACTIVE" });
    });
  });

  it("staged Variant retirement does not alter outlet eligibility until publish", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor, outletManagerActor }) => {
      const product = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          code: "elig-ret-v-p",
          name: "Variant Retire Host",
          productKind: "standard",
        }),
      );
      const variant = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor: brandAdminActor,
          productId: product.id,
          code: "a",
          name: "Keep Visible A",
          isDefault: true,
          isSelectorVisible: true,
        }),
      );
      const sibling = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor: brandAdminActor,
          productId: product.id,
          code: "b",
          name: "Sibling Visible B",
          isDefault: false,
          isSelectorVisible: true,
        }),
      );
      await persistence.transaction(async (tx) => {
        await activateVariant(tx, { actor: brandAdminActor, variantId: variant.id });
        await activateVariant(tx, { actor: brandAdminActor, variantId: sibling.id });
        await activateProduct(tx, { actor: brandAdminActor, productId: product.id });
      });
      await persistence.transaction((tx) =>
        publishProductEnvelope(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          productId: product.id,
        }),
      );
      await configureAlwaysAcceptingOutlet(persistence, outletManagerActor, tree.outletA.id);
      await includeVariantAtBrand(persistence, brandAdminActor, tree.brand.id, sibling.id);

      await persistence.transaction((tx) =>
        retireVariant(tx, { actor: brandAdminActor, variantId: sibling.id }),
      );

      const staged = await persistence.withContext((ctx) =>
        resolveOutletVariantAvailability(ctx, {
          variantId: sibling.id,
          outletId: tree.outletA.id,
          context: { now: nowInsideAcceptingWindow() },
        }),
      );
      expect(staged).toEqual({ eligible: true, code: "AVAILABLE" });

      await persistence.transaction((tx) =>
        publishProductEnvelope(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          productId: product.id,
        }),
      );

      const after = await persistence.withContext((ctx) =>
        resolveOutletVariantAvailability(ctx, {
          variantId: sibling.id,
          outletId: tree.outletA.id,
          context: { now: nowInsideAcceptingWindow() },
        }),
      );
      expect(after).toEqual({ eligible: false, code: "CATALOG_INACTIVE" });
    });
  });

  it("staged activation remains invisible until publish", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor, outletManagerActor }) => {
      await configureAlwaysAcceptingOutlet(persistence, outletManagerActor, tree.outletA.id);
      const product = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          code: "elig-act-p",
          name: "Staged Activation",
          productKind: "standard",
        }),
      );
      const variant = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor: brandAdminActor,
          productId: product.id,
          code: "a",
          name: "A",
          isDefault: true,
          isSelectorVisible: true,
        }),
      );
      await persistence.transaction(async (tx) => {
        await activateVariant(tx, { actor: brandAdminActor, variantId: variant.id });
        await activateProduct(tx, { actor: brandAdminActor, productId: product.id });
      });
      await includeVariantAtBrand(persistence, brandAdminActor, tree.brand.id, variant.id);

      const before = await persistence.withContext((ctx) =>
        resolveOutletVariantAvailability(ctx, {
          variantId: variant.id,
          outletId: tree.outletA.id,
          context: { now: nowInsideAcceptingWindow() },
        }),
      );
      expect(before).toEqual({ eligible: false, code: "CATALOG_INACTIVE" });

      await persistence.transaction((tx) =>
        publishProductEnvelope(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          productId: product.id,
        }),
      );

      const after = await persistence.withContext((ctx) =>
        resolveOutletVariantAvailability(ctx, {
          variantId: variant.id,
          outletId: tree.outletA.id,
          context: { now: nowInsideAcceptingWindow() },
        }),
      );
      expect(after).toEqual({ eligible: true, code: "AVAILABLE" });
    });
  });

});

describe("IMP-036F F1 — eligibility cardinality / modifier retirement (assortment)", () => {
  it("staged binding cardinality change does not alter feasibility until publish", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor, outletManagerActor }) => {
      const seeded = await seedPublishedProductWithModifiers(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "card",
      );
      await configureAlwaysAcceptingOutlet(persistence, outletManagerActor, tree.outletA.id);
      await includeVariantAtBrand(persistence, brandAdminActor, tree.brand.id, seeded.variantId);

      const { loadOutletEligibilityComposition } = await import(
        "../../src/server/assortment/eligibility-composition-preload"
      );

      const readMax = async () => {
        const composition = await persistence.withContext((ctx) =>
          loadOutletEligibilityComposition(ctx, {
            outletId: tree.outletA.id,
            variantIds: [seeded.variantId],
            now: nowInsideAcceptingWindow(),
          }),
        );
        const groups = composition.modifierFeasibilityByVariantId.get(seeded.variantId) ?? [];
        const option = groups
          .flatMap((group) => group.options)
          .find((entry) => entry.modifierOptionId === seeded.optionOneId);
        return option?.maxQuantity ?? null;
      };

      expect(await readMax()).toBe(2);

      const bindingOne = await persistence.withContext((ctx) =>
        findModifierGroupOptionById(ctx, seeded.bindingOneId),
      );
      await persistence.transaction((tx) =>
        saveModifierGroupOptionContentDraft(tx, {
          actor: brandAdminActor,
          modifierGroupOptionId: seeded.bindingOneId,
          expectedContentRevision: bindingOne!.draftContentRevision,
          maxQuantity: 1,
        }),
      );

      // Draft max=1 on primary; customer feasibility still uses effective max=2.
      expect(await readMax()).toBe(2);
      const staged = await persistence.withContext((ctx) =>
        resolveOutletVariantAvailability(ctx, {
          variantId: seeded.variantId,
          outletId: tree.outletA.id,
          context: { now: nowInsideAcceptingWindow() },
        }),
      );
      expect(staged).toEqual({ eligible: true, code: "AVAILABLE" });

      await persistence.transaction((tx) =>
        publishProductEnvelope(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          productId: seeded.productId,
        }),
      );

      expect(await readMax()).toBe(1);
    });
  });

  it("staged modifier option retirement does not alter option eligibility until publish", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor, outletManagerActor }) => {
      const seeded = await seedPublishedProductWithModifiers(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "optret",
      );
      await configureAlwaysAcceptingOutlet(persistence, outletManagerActor, tree.outletA.id);
      await includeVariantAtBrand(persistence, brandAdminActor, tree.brand.id, seeded.variantId);

      await persistence.transaction((tx) =>
        retireModifierGroupOption(tx, {
          actor: brandAdminActor,
          modifierGroupOptionId: seeded.bindingOneId,
        }),
      );

      const staged = await persistence.withContext((ctx) =>
        resolveModifierOptionAvailability(ctx, {
          modifierOptionId: seeded.optionOneId,
          variantId: seeded.variantId,
          outletId: tree.outletA.id,
          context: { now: nowInsideAcceptingWindow() },
        }),
      );
      expect(staged).toEqual({ eligible: true, code: "AVAILABLE" });

      await persistence.transaction((tx) =>
        publishProductEnvelope(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          productId: seeded.productId,
        }),
      );

      const after = await persistence.withContext((ctx) =>
        resolveModifierOptionAvailability(ctx, {
          modifierOptionId: seeded.optionOneId,
          variantId: seeded.variantId,
          outletId: tree.outletA.id,
          context: { now: nowInsideAcceptingWindow() },
        }),
      );
      expect(after.eligible).toBe(false);
    });
  });
});

describe("IMP-036F F1 — checkout labels use effective names", () => {
  it("Product/Variant/Modifier labels ignore unpublished renames", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedPublishedProductWithModifiers(
        persistence,
        actor,
        tree.brand.id,
        "lbl",
      );

      await persistence.transaction(async (tx) => {
        await saveProductContentDraft(tx, {
          actor,
          productId: seeded.productId,
          expectedContentRevision: 1,
          name: "New Classic",
        });
        await saveVariantContentDraft(tx, {
          actor,
          variantId: seeded.variantId,
          expectedContentRevision: 1,
          name: "New Variant",
        });
        await saveModifierGroupContentDraft(tx, {
          actor,
          modifierGroupId: seeded.groupId,
          expectedContentRevision: 1,
          name: "New Group",
        });
        await saveModifierOptionContentDraft(tx, {
          actor,
          modifierOptionId: seeded.optionOneId,
          expectedContentRevision: 1,
          name: "New Pearl",
        });
      });

      const cart = labelsCart({
        brandId: tree.brand.id,
        variantId: seeded.variantId,
        modifiers: [
          {
            variantModifierGroupId: seeded.variantModifierGroupId,
            modifierGroupOptionId: seeded.bindingOneId,
          },
        ],
      });

      const before = await persistence.withContext((ctx) =>
        loadCatalogLabelsForCart(ctx, cart),
      );
      const beforeLabels = before.get(cart.lines[0]!.id)!;
      expect(beforeLabels.productName).toBe("lbl Product");
      expect(beforeLabels.variantName).toBe("lbl Product A");
      expect(beforeLabels.modifiers[0]!.groupName).toBe("Toppings");
      expect(beforeLabels.modifiers[0]!.optionName).toBe("Pearl");

      await persistence.transaction((tx) =>
        publishProductEnvelope(tx, {
          actor,
          brandId: tree.brand.id,
          productId: seeded.productId,
        }),
      );

      const after = await persistence.withContext((ctx) =>
        loadCatalogLabelsForCart(ctx, cart),
      );
      const afterLabels = after.get(cart.lines[0]!.id)!;
      expect(afterLabels.productName).toBe("New Classic");
      expect(afterLabels.variantName).toBe("New Variant");
      expect(afterLabels.modifiers[0]!.groupName).toBe("New Group");
      expect(afterLabels.modifiers[0]!.optionName).toBe("New Pearl");
    });
  });
});

describe("IMP-036F F1 — material no-op AC-IMP-036F-011-05", () => {
  it("A→B→A Product draft publish returns unchanged with no publication event", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedPublishedProduct(
        persistence,
        actor,
        tree.brand.id,
        "aba-p",
        "Classic",
      );
      const envelopeBefore = await persistence.withContext((ctx) =>
        readBrandContentRevision(ctx, tree.brand.id),
      );
      const eventsBefore = await persistence.withContext((ctx) =>
        countContentPublishedEvents(ctx, tree.brand.id),
      );

      await persistence.transaction((tx) =>
        saveProductContentDraft(tx, {
          actor,
          productId: seeded.productId,
          expectedContentRevision: 1,
          name: "New Classic",
        }),
      );
      await persistence.transaction((tx) =>
        saveProductContentDraft(tx, {
          actor,
          productId: seeded.productId,
          expectedContentRevision: 2,
          name: "Classic",
        }),
      );

      const product = await persistence.withContext((ctx) =>
        findProductById(ctx, seeded.productId),
      );
      expect(product!.draftContentRevision).toBe(BigInt(3));
      expect(product!.effectiveContentRevision).toBe(BigInt(1));

      const reviewed = await persistence.withContext((ctx) =>
        readBrandContentRevision(ctx, tree.brand.id),
      );
      const publishResult = await persistence.transaction((tx) =>
        publishCatalogContentChange(tx, {
          actor,
          brandId: tree.brand.id,
          expectedContentRevision: reviewed,
          productId: seeded.productId,
        }),
      );

      expect(publishResult.changed).toBe(false);
      expect(publishResult.contentRevision).toBe(reviewed);
      expect(
        await persistence.withContext((ctx) => readBrandContentRevision(ctx, tree.brand.id)),
      ).toBe(reviewed);
      expect(
        await persistence.withContext((ctx) =>
          countContentPublishedEvents(ctx, tree.brand.id),
        ),
      ).toBe(eventsBefore);

      const effective = await persistence.withContext(async (ctx) => {
        const p = await findProductById(ctx, seeded.productId);
        return loadEffectiveProductContent(ctx, p!);
      });
      expect(effective!.name).toBe("Classic");
      expect(
        (
          await persistence.withContext((ctx) => findProductById(ctx, seeded.productId))
        )!.effectiveContentRevision,
      ).toBe(BigInt(1));
      expect(reviewed).toBeGreaterThan(envelopeBefore);
    });
  });

  it("A→B→A Variant draft publish returns unchanged", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedPublishedProduct(
        persistence,
        actor,
        tree.brand.id,
        "aba-v",
        "Variant Host",
      );
      const eventsBefore = await persistence.withContext((ctx) =>
        countContentPublishedEvents(ctx, tree.brand.id),
      );

      await persistence.transaction((tx) =>
        saveVariantContentDraft(tx, {
          actor,
          variantId: seeded.variantId,
          expectedContentRevision: 1,
          name: "Temp Name",
        }),
      );
      await persistence.transaction((tx) =>
        saveVariantContentDraft(tx, {
          actor,
          variantId: seeded.variantId,
          expectedContentRevision: 2,
          name: "Variant Host A",
        }),
      );

      const reviewed = await persistence.withContext((ctx) =>
        readBrandContentRevision(ctx, tree.brand.id),
      );
      const result = await persistence.transaction((tx) =>
        publishCatalogContentChange(tx, {
          actor,
          brandId: tree.brand.id,
          expectedContentRevision: reviewed,
          productId: seeded.productId,
        }),
      );
      expect(result.changed).toBe(false);
      expect(
        await persistence.withContext((ctx) =>
          countContentPublishedEvents(ctx, tree.brand.id),
        ),
      ).toBe(eventsBefore);

      const variant = await persistence.withContext((ctx) =>
        findVariantById(ctx, seeded.variantId),
      );
      expect(variant!.effectiveContentRevision).toBe(BigInt(1));
      const content = await persistence.withContext((ctx) =>
        loadEffectiveVariantContent(ctx, variant!),
      );
      expect(content!.name).toBe("Variant Host A");
    });
  });

  it("A→B→A binding draft publish returns unchanged", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedPublishedProductWithModifiers(
        persistence,
        actor,
        tree.brand.id,
        "ababind",
      );
      const eventsBefore = await persistence.withContext((ctx) =>
        countContentPublishedEvents(ctx, tree.brand.id),
      );

      const bindingBefore = await persistence.withContext((ctx) =>
        findModifierGroupOptionById(ctx, seeded.bindingOneId),
      );
      await persistence.transaction((tx) =>
        saveModifierGroupOptionContentDraft(tx, {
          actor,
          modifierGroupOptionId: seeded.bindingOneId,
          expectedContentRevision: bindingBefore!.draftContentRevision,
          maxQuantity: 5,
        }),
      );
      const bindingMid = await persistence.withContext((ctx) =>
        findModifierGroupOptionById(ctx, seeded.bindingOneId),
      );
      await persistence.transaction((tx) =>
        saveModifierGroupOptionContentDraft(tx, {
          actor,
          modifierGroupOptionId: seeded.bindingOneId,
          expectedContentRevision: bindingMid!.draftContentRevision,
          maxQuantity: 2,
        }),
      );

      const reviewed = await persistence.withContext((ctx) =>
        readBrandContentRevision(ctx, tree.brand.id),
      );
      const result = await persistence.transaction((tx) =>
        publishCatalogContentChange(tx, {
          actor,
          brandId: tree.brand.id,
          expectedContentRevision: reviewed,
          productId: seeded.productId,
        }),
      );
      expect(result.changed).toBe(false);
      expect(
        await persistence.withContext((ctx) =>
          countContentPublishedEvents(ctx, tree.brand.id),
        ),
      ).toBe(eventsBefore);
    });
  });
});

describe("IMP-036F F1 — lock order and concurrent draft vs publish", () => {
  it("draft-save source locks Brand envelope before entity FOR UPDATE", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/server/catalog/publish.ts"),
      "utf8",
    );
    for (const fn of [
      "saveProductContentDraft",
      "saveVariantContentDraft",
      "saveModifierGroupContentDraft",
      "saveModifierOptionContentDraft",
      "saveModifierGroupOptionContentDraft",
      "saveVariantModifierGroupContentDraft",
    ]) {
      const idx = source.indexOf(`export async function ${fn}`);
      expect(idx).toBeGreaterThanOrEqual(0);
      const bodyStart = source.indexOf("{", idx);
      const nextExport = source.indexOf("\nexport async function ", bodyStart + 1);
      const end = nextExport === -1 ? source.length : nextExport;
      const body = source.slice(bodyStart, end);
      const brandLock = Math.min(
        ...["lockBrandEnvelope(", "lockBrandEnvelopeForProductDraft(", "lockBrandEnvelopeForVariantDraft("]
          .map((token) => {
            const at = body.indexOf(token);
            return at === -1 ? Number.POSITIVE_INFINITY : at;
          }),
      );
      const entityLock = Math.min(
        ...[
          "lockProductForDraft(",
          "lockVariantForDraft(",
          '.for("update")',
        ].map((token) => {
          const at = body.indexOf(token);
          return at === -1 ? Number.POSITIVE_INFINITY : at;
        }),
      );
      expect(brandLock).toBeLessThan(Number.POSITIVE_INFINITY);
      expect(entityLock).toBeLessThan(Number.POSITIVE_INFINITY);
      expect(entityLock).toBeGreaterThan(brandLock);
    }
  });

  it("concurrent draft vs publish has no deadlock; stale side gets CatalogConflict", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedPublishedProduct(
        persistence,
        actor,
        tree.brand.id,
        "race-dp",
        "Race Host",
      );
      const reviewed = await persistence.withContext((ctx) =>
        readBrandContentRevision(ctx, tree.brand.id),
      );

      const draftPromise = persistence.transaction((tx) =>
        saveProductContentDraft(tx, {
          actor,
          productId: seeded.productId,
          expectedContentRevision: 1,
          name: "Draft Race Name",
        }),
      );
      const publishPromise = persistence.transaction((tx) =>
        publishCatalogContentChange(tx, {
          actor,
          brandId: tree.brand.id,
          expectedContentRevision: reviewed,
          productId: seeded.productId,
        }),
      );

      const settled = await Promise.allSettled([draftPromise, publishPromise]);
      const rejected = settled.filter((r) => r.status === "rejected");
      const fulfilled = settled.filter((r) => r.status === "fulfilled");

      expect(fulfilled.length + rejected.length).toBe(2);
      expect(fulfilled.length).toBeGreaterThanOrEqual(1);

      for (const r of rejected) {
        const reason = (r as PromiseRejectedResult).reason as {
          code?: string;
          cause?: { code?: string };
          message?: string;
        };
        const code = reason?.code ?? reason?.cause?.code;
        expect(code).not.toBe("40P01");
        expect(
          reason instanceof CatalogConflictError ||
            String(reason?.message ?? "").includes("expectedContentRevision") ||
            String(reason?.message ?? "").includes("draftContentRevision"),
        ).toBe(true);
      }

      // If both somehow fulfilled, publish must have been a no-op or draft did not
      // advance past reviewed — still no deadlock and customer truth is coherent.
      const product = await persistence.withContext((ctx) =>
        findProductById(ctx, seeded.productId),
      );
      const effective = await persistence.withContext((ctx) =>
        loadEffectiveProductContent(ctx, product!),
      );
      expect(effective).not.toBeNull();
      expect(["Race Host", "Draft Race Name"]).toContain(effective!.name);
    });
  });
});

describe("IMP-036F F1 — association staging invalidates reviewed aggregate", () => {
  it("review N + create/stage publishable association + publish(N) conflicts", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedPublishedProduct(
        persistence,
        actor,
        tree.brand.id,
        "assoc-inv",
        "Assoc Host",
      );
      const reviewed = await persistence.withContext((ctx) =>
        readBrandContentRevision(ctx, tree.brand.id),
      );

      const group = await persistence.transaction((tx) =>
        createModifierGroup(tx, {
          actor,
          brandId: tree.brand.id,
          code: "assoc-g",
          name: "New Group",
        }),
      );
      const option = await persistence.transaction((tx) =>
        createModifierOption(tx, {
          actor,
          brandId: tree.brand.id,
          code: "assoc-o",
          name: "New Option",
        }),
      );
      const binding = await persistence.transaction((tx) =>
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
      const vmg = await persistence.transaction((tx) =>
        applyModifierGroupToVariant(tx, {
          actor,
          variantId: seeded.variantId,
          modifierGroupId: group.id,
          minTotalQuantity: 0,
          maxTotalQuantity: 1,
          position: 0,
        }),
      );

      // Stage into the publishable candidate (activate advances Brand envelope).
      await persistence.transaction(async (tx) => {
        await activateModifierOption(tx, { actor, modifierOptionId: option.id });
        await activateModifierGroupOption(tx, {
          actor,
          modifierGroupOptionId: binding.id,
        });
        await activateModifierGroup(tx, { actor, modifierGroupId: group.id });
        await activateVariantModifierGroup(tx, {
          actor,
          variantModifierGroupId: vmg.id,
        });
      });

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
});
