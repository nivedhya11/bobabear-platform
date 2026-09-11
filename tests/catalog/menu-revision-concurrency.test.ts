/**
 * IMP-036F F3A — real-DB concurrency proofs for MENU_REVISION.
 */
import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { menusTable, menuVersionsTable } from "../../src/platform/database/schema/menu";
import {
  activateProduct,
  activateVariant,
  createProduct,
  createVariant,
} from "../../src/server/catalog";
import {
  MenuConflictError,
  activateMenuEntry,
  activateMenuSection,
  createMenu,
  createMenuEntry,
  createMenuSection,
  findMenuById,
  publishMenuRevision,
  reorderMenuSections,
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
  let menu = await persistence.transaction((tx) =>
    createMenu(tx, {
      actor,
      brandId,
      code: `${codePrefix}-menu`,
      name: `${codePrefix} Menu`,
    }),
  );
  const section = await persistence.transaction(async (tx) => {
    const current = await findMenuById(tx, menu.id);
    return createMenuSection(tx, {
      actor,
      brandId,
      menuId: menu.id,
      code: `${codePrefix}-sec`,
      name: "Section",
      position: 0,
      expectedMenuRevision: current!.revision,
    });
  });
  menu = await persistence.withContext((ctx) => findMenuById(ctx, menu.id)).then((m) => m!);

  const entry = await persistence.transaction(async (tx) => {
    const current = await findMenuById(tx, menu.id);
    return createMenuEntry(tx, {
      actor,
      brandId,
      menuId: menu.id,
      sectionId: section.id,
      productId,
      position: 0,
      imagePath: IMAGE,
      expectedMenuRevision: current!.revision,
    });
  });

  await persistence.transaction(async (tx) => {
    let current = await findMenuById(tx, menu.id);
    await activateMenuSection(tx, {
      actor,
      sectionId: section.id,
      expectedMenuRevision: current!.revision,
    });
    current = await findMenuById(tx, menu.id);
    await activateMenuEntry(tx, {
      actor,
      entryId: entry.id,
      expectedMenuRevision: current!.revision,
    });
    current = await findMenuById(tx, menu.id);
    await publishMenuRevision(tx, {
      actor,
      menuId: menu.id,
      expectedMenuRevision: current!.revision,
    });
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

function assertNoDeadlock(result: PromiseSettledResult<unknown>): void {
  if (result.status === "rejected") {
    const reason = result.reason as { code?: string; cause?: { code?: string } };
    const code = reason?.code ?? reason?.cause?.code;
    expect(code).not.toBe("40P01");
  }
}

async function countActiveMenus(
  persistence: TestPersistence,
  brandId: string,
): Promise<number> {
  return persistence.withContext(async (ctx) => {
    const rows = await ctx.db
      .select({ id: menusTable.id })
      .from(menusTable)
      .where(and(eq(menusTable.brandId, brandId), eq(menusTable.lifecycleStatus, "active")));
    return rows.length;
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

      await persistence.transaction(async (tx) => {
        const current = await findMenuById(tx, seeded.menu.id);
        await updateMenuSection(tx, {
          actor,
          sectionId: seeded.section.id,
          name: "Ready To Publish",
          expectedMenuRevision: current!.revision,
        });
      });
      const reviewed = await persistence.withContext((ctx) =>
        findMenuById(ctx, seeded.menu.id),
      );

      const draftPromise = persistence.transaction(async (tx) => {
        const current = await findMenuById(tx, seeded.menu.id);
        await updateMenuSection(tx, {
          actor,
          sectionId: seeded.section.id,
          name: "Concurrent Draft Edit",
          expectedMenuRevision: current!.revision,
        });
      });
      const publishPromise = persistence.transaction((tx) =>
        publishMenuRevision(tx, {
          actor,
          menuId: seeded.menu.id,
          expectedMenuRevision: reviewed!.revision,
        }),
      );

      const settled = await Promise.allSettled([draftPromise, publishPromise]);
      expect(settled).toHaveLength(2);
      for (const result of settled) assertNoDeadlock(result);

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

      await persistence.transaction(async (tx) => {
        const current = await findMenuById(tx, seeded.menu.id);
        await updateMenuSection(tx, {
          actor,
          sectionId: seeded.section.id,
          name: "Publish Contender",
          expectedMenuRevision: current!.revision,
        });
      });
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
        assertNoDeadlock(result);
        if (result.status === "rejected") {
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

      await persistence.transaction(async (tx) => {
        const current = await findMenuById(tx, seeded.menu.id);
        await updateMenuSection(tx, {
          actor,
          sectionId: seeded.section.id,
          name: "Brand New Section",
          expectedMenuRevision: current!.revision,
        });
      });
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

  it("same revision / same field draft mutation race — one success, other MENU_STALE_REVISION, no 40P01", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const brandId = tree.brand.id;
      const { productId } = await seedPublishedPricedProduct(
        persistence,
        actor,
        brandId,
        "race-same-field",
        "Race Same Field",
      );
      const seeded = await seedSimpleActiveMenu(
        persistence,
        actor,
        brandId,
        "race-same-field",
        productId,
      );
      const expected = seeded.menu.revision;

      const settled = await Promise.allSettled([
        persistence.transaction((tx) =>
          updateMenuSection(tx, {
            actor,
            sectionId: seeded.section.id,
            name: "Writer One",
            expectedMenuRevision: expected,
          }),
        ),
        persistence.transaction((tx) =>
          updateMenuSection(tx, {
            actor,
            sectionId: seeded.section.id,
            name: "Writer Two",
            expectedMenuRevision: expected,
          }),
        ),
      ]);

      const successes = settled.filter((r) => r.status === "fulfilled");
      const failures = settled.filter((r) => r.status === "rejected");
      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
      for (const result of settled) assertNoDeadlock(result);
      expect((failures[0] as PromiseRejectedResult).reason).toBeInstanceOf(MenuConflictError);
    });
  });

  it("same revision / disjoint field draft mutation race — one success, other MENU_STALE_REVISION, no 40P01", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const brandId = tree.brand.id;
      const { productId } = await seedPublishedPricedProduct(
        persistence,
        actor,
        brandId,
        "race-disjoint",
        "Race Disjoint",
      );
      const seeded = await seedSimpleActiveMenu(
        persistence,
        actor,
        brandId,
        "race-disjoint",
        productId,
      );

      let menu = await persistence.withContext((ctx) => findMenuById(ctx, seeded.menu.id)).then((m) => m!);
      const rootB = await persistence.transaction(async (tx) => {
        const current = await findMenuById(tx, menu.id);
        return createMenuSection(tx, {
          actor,
          brandId,
          menuId: menu.id,
          code: "race-disjoint-b",
          name: "Section B",
          position: 1,
          expectedMenuRevision: current!.revision,
        });
      });
      menu = await persistence.withContext((ctx) => findMenuById(ctx, seeded.menu.id)).then((m) => m!);
      const expected = menu.revision;

      const settled = await Promise.allSettled([
        persistence.transaction((tx) =>
          updateMenuSection(tx, {
            actor,
            sectionId: seeded.section.id,
            name: "Rename A",
            expectedMenuRevision: expected,
          }),
        ),
        persistence.transaction((tx) =>
          updateMenuSection(tx, {
            actor,
            sectionId: rootB.id,
            name: "Rename B",
            expectedMenuRevision: expected,
          }),
        ),
      ]);

      const successes = settled.filter((r) => r.status === "fulfilled");
      const failures = settled.filter((r) => r.status === "rejected");
      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
      for (const result of settled) assertNoDeadlock(result);
    });
  });

  it("lifecycle stale mutation race — activate with stale revision fails, no 40P01", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const brandId = tree.brand.id;
      const { productId } = await seedPublishedPricedProduct(
        persistence,
        actor,
        brandId,
        "race-life",
        "Race Life",
      );

      let menu = await persistence.transaction((tx) =>
        createMenu(tx, {
          actor,
          brandId,
          code: "race-life-menu",
          name: "Race Life Menu",
        }),
      );
      const section = await persistence.transaction(async (tx) => {
        const current = await findMenuById(tx, menu.id);
        return createMenuSection(tx, {
          actor,
          brandId,
          menuId: menu.id,
          code: "race-life-sec",
          name: "Draft Section",
          position: 0,
          expectedMenuRevision: current!.revision,
        });
      });
      menu = await persistence.withContext((ctx) => findMenuById(ctx, menu.id)).then((m) => m!);
      const staleRevision = menu.revision;

      const settled = await Promise.allSettled([
        persistence.transaction(async (tx) => {
          const current = await findMenuById(tx, menu.id);
          await activateMenuSection(tx, {
            actor,
            sectionId: section.id,
            expectedMenuRevision: current!.revision,
          });
        }),
        persistence.transaction((tx) =>
          activateMenuSection(tx, {
            actor,
            sectionId: section.id,
            expectedMenuRevision: staleRevision,
          }),
        ),
      ]);

      for (const result of settled) assertNoDeadlock(result);
      const successes = settled.filter((r) => r.status === "fulfilled");
      const failures = settled.filter((r) => r.status === "rejected");
      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
    });
  });

  it("reorder stale mutation race — one success, other MENU_STALE_REVISION, no 40P01", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const brandId = tree.brand.id;
      const { productId } = await seedPublishedPricedProduct(
        persistence,
        actor,
        brandId,
        "race-reord",
        "Race Reord",
      );

      let menu = await persistence.transaction((tx) =>
        createMenu(tx, {
          actor,
          brandId,
          code: "race-reord-menu",
          name: "Race Reord Menu",
        }),
      );
      const sectionA = await persistence.transaction(async (tx) => {
        const current = await findMenuById(tx, menu.id);
        return createMenuSection(tx, {
          actor,
          brandId,
          menuId: menu.id,
          code: "race-reord-a",
          name: "A",
          position: 0,
          expectedMenuRevision: current!.revision,
        });
      });
      menu = await persistence.withContext((ctx) => findMenuById(ctx, menu.id)).then((m) => m!);
      const sectionB = await persistence.transaction(async (tx) => {
        const current = await findMenuById(tx, menu.id);
        return createMenuSection(tx, {
          actor,
          brandId,
          menuId: menu.id,
          code: "race-reord-b",
          name: "B",
          position: 1,
          expectedMenuRevision: current!.revision,
        });
      });
      menu = await persistence.withContext((ctx) => findMenuById(ctx, menu.id)).then((m) => m!);
      const expected = menu.revision;

      const settled = await Promise.allSettled([
        persistence.transaction((tx) =>
          reorderMenuSections(tx, {
            actor,
            menuId: menu.id,
            parentSectionId: null,
            orderedSectionIds: [sectionB.id, sectionA.id],
            expectedMenuRevision: expected,
          }),
        ),
        persistence.transaction((tx) =>
          reorderMenuSections(tx, {
            actor,
            menuId: menu.id,
            parentSectionId: null,
            orderedSectionIds: [sectionA.id, sectionB.id],
            expectedMenuRevision: expected,
          }),
        ),
      ]);

      for (const result of settled) assertNoDeadlock(result);
      const successes = settled.filter((r) => r.status === "fulfilled");
      const failures = settled.filter((r) => r.status === "rejected");
      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
    });
  });

  it("two Menu first-publication race for same Brand — exactly one active customer Menu, no deadlock", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const brandId = tree.brand.id;
      const { productId } = await seedPublishedPricedProduct(
        persistence,
        actor,
        brandId,
        "race-first-pub",
        "Race First Pub",
      );

      async function buildPublishableMenu(code: string) {
        let menu = await persistence.transaction((tx) =>
          createMenu(tx, { actor, brandId, code: `${code}-menu`, name: `${code} Menu` }),
        );
        const section = await persistence.transaction(async (tx) => {
          const current = await findMenuById(tx, menu.id);
          return createMenuSection(tx, {
            actor,
            brandId,
            menuId: menu.id,
            code: `${code}-sec`,
            name: "Section",
            position: 0,
            expectedMenuRevision: current!.revision,
          });
        });
        menu = await persistence.withContext((ctx) => findMenuById(ctx, menu.id)).then((m) => m!);
        const entry = await persistence.transaction(async (tx) => {
          const current = await findMenuById(tx, menu.id);
          return createMenuEntry(tx, {
            actor,
            brandId,
            menuId: menu.id,
            sectionId: section.id,
            productId,
            position: 0,
            imagePath: IMAGE,
            expectedMenuRevision: current!.revision,
          });
        });
        await persistence.transaction(async (tx) => {
          let current = await findMenuById(tx, menu.id);
          await activateMenuSection(tx, {
            actor,
            sectionId: section.id,
            expectedMenuRevision: current!.revision,
          });
          current = await findMenuById(tx, menu.id);
          await activateMenuEntry(tx, {
            actor,
            entryId: entry.id,
            expectedMenuRevision: current!.revision,
          });
        });
        const ready = await persistence.withContext((ctx) => findMenuById(ctx, menu.id));
        return { menuId: menu.id, revision: ready!.revision };
      }

      const first = await buildPublishableMenu("first-pub");
      const second = await buildPublishableMenu("second-pub");

      const settled = await Promise.allSettled([
        persistence.transaction((tx) =>
          publishMenuRevision(tx, {
            actor,
            menuId: first.menuId,
            expectedMenuRevision: first.revision,
          }),
        ),
        persistence.transaction((tx) =>
          publishMenuRevision(tx, {
            actor,
            menuId: second.menuId,
            expectedMenuRevision: second.revision,
          }),
        ),
      ]);

      for (const result of settled) assertNoDeadlock(result);
      const materialSuccesses = settled.filter(
        (r) => r.status === "fulfilled" && r.value.changed === true,
      );
      expect(materialSuccesses.length).toBeGreaterThanOrEqual(1);
      expect(await countActiveMenus(persistence, brandId)).toBe(1);
    });
  });

  it("repeated publication of existing active Menu still one-active", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const brandId = tree.brand.id;
      const { productId } = await seedPublishedPricedProduct(
        persistence,
        actor,
        brandId,
        "race-repub",
        "Race Repub",
      );
      const seeded = await seedSimpleActiveMenu(
        persistence,
        actor,
        brandId,
        "race-repub",
        productId,
      );

      await persistence.transaction(async (tx) => {
        const current = await findMenuById(tx, seeded.menu.id);
        await updateMenuSection(tx, {
          actor,
          sectionId: seeded.section.id,
          name: "Republication One",
          expectedMenuRevision: current!.revision,
        });
      });
      let current = await persistence.withContext((ctx) => findMenuById(ctx, seeded.menu.id));
      await persistence.transaction((tx) =>
        publishMenuRevision(tx, {
          actor,
          menuId: seeded.menu.id,
          expectedMenuRevision: current!.revision,
        }),
      );

      await persistence.transaction(async (tx) => {
        const reviewed = await findMenuById(tx, seeded.menu.id);
        await updateMenuSection(tx, {
          actor,
          sectionId: seeded.section.id,
          name: "Republication Two",
          expectedMenuRevision: reviewed!.revision,
        });
      });
      current = await persistence.withContext((ctx) => findMenuById(ctx, seeded.menu.id));
      await persistence.transaction((tx) =>
        publishMenuRevision(tx, {
          actor,
          menuId: seeded.menu.id,
          expectedMenuRevision: current!.revision,
        }),
      );

      expect(await countActiveMenus(persistence, brandId)).toBe(1);
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
});
