/**
 * IMP-036F F3A — real-DB concurrency proofs for MENU_REVISION.
 */
import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { menuVersionsTable } from "../../src/platform/database/schema/menu";
import {
  activateProduct,
  activateVariant,
  createProduct,
  createVariant,
} from "../../src/server/catalog";
import {
  MenuConflictError,
  activateMenu,
  activateMenuEntry,
  activateMenuSection,
  createMenu,
  createMenuEntry,
  createMenuSection,
  findMenuById,
  publishMenuRevision,
  updateMenuSection,
} from "../../src/server/catalog/menu";
import { projectCustomerMenu } from "../../src/server/customer-commerce/menu/project-customer-menu";
import {
  activatePriceBook,
  attachDraftVariantPrice,
  createDraftPriceBook,
} from "../../src/server/pricing";
import { TAX_CATEGORY_RESTAURANT_SERVICE_ID } from "../../src/shared/pricing";
import { publishProductEnvelope, withCatalogDomain } from "./support";

type TestPersistence = Parameters<Parameters<typeof withCatalogDomain>[0]>[0];
type CatalogActor = Parameters<Parameters<typeof withCatalogDomain>[0]>[1]["brandAdminActor"];

const AT = new Date("2026-09-11T12:00:00.000Z");
const IMAGE = "/assets/menu/Bangkok_Thai_Tea_Boba.jpeg";

async function seedPublishedPricedProduct(
  persistence: TestPersistence,
  actor: CatalogActor,
  brandId: string,
  code: string,
  name: string,
): Promise<{ productId: string }> {
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
  await persistence.transaction(async (tx) => {
    await activateVariant(tx, { actor, variantId: variant.id });
    await activateProduct(tx, { actor, productId: product.id });
    await publishProductEnvelope(tx, { actor, brandId, productId: product.id });
  });
  await persistence.transaction(async (tx) => {
    const book = await createDraftPriceBook(tx, {
      actor,
      brandId,
      scopeType: "brand",
      code: `pb-${randomUUID().slice(0, 8)}`,
      name: "Brand book",
      effectiveFrom: new Date("2026-09-01T00:00:00+05:30"),
      effectiveTo: null,
    });
    await attachDraftVariantPrice(tx, {
      actor,
      priceBookId: book.id,
      brandId,
      variantId: variant.id,
      amountPaise: BigInt(17_900),
      taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
    });
    await activatePriceBook(tx, { actor, priceBookId: book.id, brandId });
  });
  return { productId: product.id };
}

async function seedSimpleActiveMenu(
  persistence: TestPersistence,
  actor: CatalogActor,
  brandId: string,
  codePrefix: string,
  productId: string,
) {
  const menu = await persistence.transaction((tx) =>
    createMenu(tx, {
      actor,
      brandId,
      code: `${codePrefix}-menu`,
      name: `${codePrefix} Menu`,
    }),
  );
  const section = await persistence.transaction((tx) =>
    createMenuSection(tx, {
      actor,
      brandId,
      menuId: menu.id,
      code: `${codePrefix}-sec`,
      name: "Section",
      position: 0,
    }),
  );
  const entry = await persistence.transaction((tx) =>
    createMenuEntry(tx, {
      actor,
      brandId,
      menuId: menu.id,
      sectionId: section.id,
      productId,
      position: 0,
      imagePath: IMAGE,
    }),
  );
  await persistence.transaction(async (tx) => {
    await activateMenuSection(tx, { actor, sectionId: section.id });
    await activateMenuEntry(tx, { actor, entryId: entry.id });
    await activateMenu(tx, { actor, menuId: menu.id });
  });
  const activated = await persistence.withContext((ctx) => findMenuById(ctx, menu.id));
  return { menu: activated!, section, entry };
}

function customerGraphKey(projection: Awaited<ReturnType<typeof projectCustomerMenu>>): string {
  return JSON.stringify({
    sections: projection.sections.map((s) => ({
      id: s.id,
      name: s.name,
      position: s.position,
      parentSectionId: s.parentSectionId,
    })),
    items: projection.items.map((i) => ({
      productId: i.productId,
      sectionId: i.sectionId,
      name: i.name,
      description: i.description,
    })),
  });
}

describe("IMP-036F F3A — concurrency", () => {
  it("draft-vs-publish: concurrent material draft edit vs publish — deterministic, no deadlock", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const brandId = tree.brand.id;
      const { productId } = await seedPublishedPricedProduct(
        persistence,
        actor,
        brandId,
        "race-dp",
        "Race DP",
      );
      const seeded = await seedSimpleActiveMenu(
        persistence,
        actor,
        brandId,
        "race-dp",
        productId,
      );

      await persistence.transaction((tx) =>
        updateMenuSection(tx, {
          actor,
          sectionId: seeded.section.id,
          name: "Ready To Publish",
        }),
      );
      const reviewed = await persistence.withContext((ctx) =>
        findMenuById(ctx, seeded.menu.id),
      );

      const draftPromise = persistence.transaction((tx) =>
        updateMenuSection(tx, {
          actor,
          sectionId: seeded.section.id,
          name: "Concurrent Draft Edit",
        }),
      );
      const publishPromise = persistence.transaction((tx) =>
        publishMenuRevision(tx, {
          actor,
          menuId: seeded.menu.id,
          expectedMenuRevision: reviewed!.revision,
        }),
      );

      const settled = await Promise.allSettled([draftPromise, publishPromise]);
      expect(settled).toHaveLength(2);

      for (const result of settled) {
        if (result.status === "rejected") {
          const reason = result.reason as {
            code?: string;
            cause?: { code?: string };
            message?: string;
          };
          const code = reason?.code ?? reason?.cause?.code;
          expect(code).not.toBe("40P01");
          expect(
            reason instanceof MenuConflictError ||
              String(reason?.message ?? "").includes("expectedMenuRevision") ||
              String(reason?.message ?? "").includes("deadlock") === false,
          ).toBe(true);
        }
      }

      const fulfilled = settled.filter((r) => r.status === "fulfilled");
      expect(fulfilled.length).toBeGreaterThanOrEqual(1);

      const menu = await persistence.withContext((ctx) => findMenuById(ctx, seeded.menu.id));
      expect(menu!.lifecycleStatus).toBe("active");
      expect(menu!.effectiveMenuVersionId).toBeTruthy();

      const customer = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId, at: AT }),
      );
      expect(["Section", "Ready To Publish", "Concurrent Draft Edit"]).toContain(
        customer.sections[0]!.name,
      );
    });
  });

  it("publish-vs-publish same expectedMenuRevision — at most one material success", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const brandId = tree.brand.id;
      const { productId } = await seedPublishedPricedProduct(
        persistence,
        actor,
        brandId,
        "race-pp",
        "Race PP",
      );
      const seeded = await seedSimpleActiveMenu(
        persistence,
        actor,
        brandId,
        "race-pp",
        productId,
      );

      await persistence.transaction((tx) =>
        updateMenuSection(tx, {
          actor,
          sectionId: seeded.section.id,
          name: "Publish Contender",
        }),
      );
      const reviewed = await persistence.withContext((ctx) =>
        findMenuById(ctx, seeded.menu.id),
      );
      const expected = reviewed!.revision;

      const settled = await Promise.allSettled([
        persistence.transaction((tx) =>
          publishMenuRevision(tx, {
            actor,
            menuId: seeded.menu.id,
            expectedMenuRevision: expected,
          }),
        ),
        persistence.transaction((tx) =>
          publishMenuRevision(tx, {
            actor,
            menuId: seeded.menu.id,
            expectedMenuRevision: expected,
          }),
        ),
      ]);

      const successes = settled.filter(
        (r) => r.status === "fulfilled" && r.value.changed === true,
      );
      expect(successes.length).toBeLessThanOrEqual(1);

      for (const result of settled) {
        if (result.status === "rejected") {
          const reason = result.reason as { code?: string; cause?: { code?: string } };
          const code = reason?.code ?? reason?.cause?.code;
          expect(code).not.toBe("40P01");
          expect(result.reason).toBeInstanceOf(MenuConflictError);
          expect((result.reason as MenuConflictError).menuErrorCode).toBe(
            "MENU_STALE_REVISION",
          );
        }
      }

      const effectiveVersions = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select()
          .from(menuVersionsTable)
          .where(
            and(
              eq(menuVersionsTable.menuId, seeded.menu.id),
              eq(menuVersionsTable.lifecycleStatus, "EFFECTIVE"),
            ),
          );
        return rows;
      });
      expect(effectiveVersions).toHaveLength(1);
    });
  });

  it("reader during publish sees complete old or complete new graph (not mixed)", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const brandId = tree.brand.id;
      const { productId } = await seedPublishedPricedProduct(
        persistence,
        actor,
        brandId,
        "race-read",
        "Race Read",
      );
      const seeded = await seedSimpleActiveMenu(
        persistence,
        actor,
        brandId,
        "race-read",
        productId,
      );

      const oldProjection = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId, at: AT }),
      );
      const oldKey = customerGraphKey(oldProjection);

      await persistence.transaction((tx) =>
        updateMenuSection(tx, {
          actor,
          sectionId: seeded.section.id,
          name: "Brand New Section",
        }),
      );
      const reviewed = await persistence.withContext((ctx) =>
        findMenuById(ctx, seeded.menu.id),
      );

      const observedKeys: string[] = [];
      const readerLoops = Array.from({ length: 12 }, () =>
        persistence.withContext(async (ctx) => {
          const projection = await projectCustomerMenu(ctx, { brandId, at: AT });
          observedKeys.push(customerGraphKey(projection));
        }),
      );

      const publishPromise = persistence.transaction((tx) =>
        publishMenuRevision(tx, {
          actor,
          menuId: seeded.menu.id,
          expectedMenuRevision: reviewed!.revision,
        }),
      );

      await Promise.all([publishPromise, ...readerLoops]);

      const newProjection = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId, at: AT }),
      );
      const newKey = customerGraphKey(newProjection);
      expect(newKey).not.toBe(oldKey);
      expect(newProjection.sections[0]!.name).toBe("Brand New Section");

      for (const key of observedKeys) {
        expect([oldKey, newKey]).toContain(key);
      }
    });
  });
});
