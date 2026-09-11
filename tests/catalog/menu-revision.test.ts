/**
 * IMP-036F F3A — VERSIONED_MENU_GRAPH / MENU_REVISION proof suite.
 *
 * Customer truth: ACTIVE Menu → effective MenuVersion graph only.
 * Draft mutations are invisible until publishMenuRevision (or first activateMenu).
 */
import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  menuEntriesTable,
  menuMutationAuditEventsTable,
  menusTable,
  menuSectionsTable,
  menuSectionVersionsTable,
  menuVersionsTable,
} from "../../src/platform/database/schema/menu";
import {
  activateProduct,
  activateVariant,
  createProduct,
  createVariant,
  findProductById,
  saveProductContentDraft,
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
  loadVersionGraph,
  materialGraphFingerprint,
  moveMenuEntry,
  publishMenuRevision,
  reorderMenuEntries,
  reorderMenuSections,
  retireMenuEntry,
  updateMenuEntryDisplay,
  updateMenuSection,
} from "../../src/server/catalog/menu";
import { projectCustomerMenu } from "../../src/server/customer-commerce/menu/project-customer-menu";
import {
  activatePriceBook,
  attachDraftVariantPrice,
  createDraftPriceBook,
} from "../../src/server/pricing";
import { CustomerMenuError } from "../../src/shared/customer-menu/errors";
import { TAX_CATEGORY_RESTAURANT_SERVICE_ID } from "../../src/shared/pricing";
import { publishProductEnvelope, withCatalogDomain } from "./support";

type TestPersistence = Parameters<Parameters<typeof withCatalogDomain>[0]>[0];
type CatalogActor = Parameters<Parameters<typeof withCatalogDomain>[0]>[1]["brandAdminActor"];

const AT = new Date("2026-09-11T12:00:00.000Z");
const IMAGE = "/assets/menu/Bangkok_Thai_Tea_Boba.jpeg";

async function seedPublishedPricedProducts(
  persistence: TestPersistence,
  actor: CatalogActor,
  brandId: string,
  specs: ReadonlyArray<Readonly<{ code: string; name: string }>>,
): Promise<Array<{ productId: string; variantId: string }>> {
  const seeded: Array<{ productId: string; variantId: string }> = [];
  for (const spec of specs) {
    const product = await persistence.transaction((tx) =>
      createProduct(tx, {
        actor,
        brandId,
        code: spec.code,
        name: spec.name,
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
    seeded.push({ productId: product.id, variantId: variant.id });
  }

  // One brand-scoped book for all variants — overlapping active books are rejected.
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
    for (const row of seeded) {
      await attachDraftVariantPrice(tx, {
        actor,
        priceBookId: book.id,
        brandId,
        variantId: row.variantId,
        amountPaise: BigInt(17_900),
        taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
      });
    }
    await activatePriceBook(tx, { actor, priceBookId: book.id, brandId });
  });

  return seeded;
}

async function seedPublishedPricedProduct(
  persistence: TestPersistence,
  actor: CatalogActor,
  brandId: string,
  code: string,
  name: string,
): Promise<{ productId: string; variantId: string }> {
  const [only] = await seedPublishedPricedProducts(persistence, actor, brandId, [
    { code, name },
  ]);
  return only!;
}

/**
 * Representative graph: root + child section, two products, display override.
 * Activates sections/entries first, then Menu (promotes EFFECTIVE — mirrors backfill).
 */
async function seedActivatedRepresentativeMenu(
  persistence: TestPersistence,
  actor: CatalogActor,
  brandId: string,
  codePrefix: string,
  productIds: Readonly<{ productA: string; productB: string }>,
) {
  const menu = await persistence.transaction((tx) =>
    createMenu(tx, {
      actor,
      brandId,
      code: `${codePrefix}-menu`,
      name: `${codePrefix} Menu`,
    }),
  );
  const root = await persistence.transaction((tx) =>
    createMenuSection(tx, {
      actor,
      brandId,
      menuId: menu.id,
      code: `${codePrefix}-root`,
      name: "Root Section",
      position: 0,
    }),
  );
  const child = await persistence.transaction((tx) =>
    createMenuSection(tx, {
      actor,
      brandId,
      menuId: menu.id,
      parentSectionId: root.id,
      code: `${codePrefix}-child`,
      name: "Child Section",
      position: 1,
    }),
  );
  const entryA = await persistence.transaction((tx) =>
    createMenuEntry(tx, {
      actor,
      brandId,
      menuId: menu.id,
      sectionId: root.id,
      productId: productIds.productA,
      position: 0,
      displayName: "Override A",
      displayDescription: "Display override for A",
      imagePath: IMAGE,
    }),
  );
  const entryB = await persistence.transaction((tx) =>
    createMenuEntry(tx, {
      actor,
      brandId,
      menuId: menu.id,
      sectionId: child.id,
      productId: productIds.productB,
      position: 0,
      imagePath: IMAGE,
    }),
  );

  await persistence.transaction(async (tx) => {
    await activateMenuSection(tx, { actor, sectionId: root.id });
    await activateMenuSection(tx, { actor, sectionId: child.id });
    await activateMenuEntry(tx, { actor, entryId: entryA.id });
    await activateMenuEntry(tx, { actor, entryId: entryB.id });
    await activateMenu(tx, { actor, menuId: menu.id });
  });

  const activated = await persistence.withContext((ctx) => findMenuById(ctx, menu.id));
  return {
    menu: activated!,
    root,
    child,
    entryA,
    entryB,
  };
}

async function countActiveMenus(
  persistence: TestPersistence,
  brandId: string,
): Promise<number> {
  return persistence.withContext(async (ctx) => {
    const rows = await ctx.db
      .select({ id: menusTable.id })
      .from(menusTable)
      .where(
        and(eq(menusTable.brandId, brandId), eq(menusTable.lifecycleStatus, "active")),
      );
    return rows.length;
  });
}

async function legacyFingerprint(
  persistence: TestPersistence,
  menuId: string,
): Promise<string> {
  return persistence.withContext(async (ctx) => {
    const sections = await ctx.db
      .select()
      .from(menuSectionsTable)
      .where(eq(menuSectionsTable.menuId, menuId));
    const entries = await ctx.db
      .select()
      .from(menuEntriesTable)
      .where(eq(menuEntriesTable.menuId, menuId));
    return materialGraphFingerprint(
      sections.map((s) => ({
        sectionId: s.id,
        parentSectionId: s.parentSectionId,
        code: s.code,
        name: s.name,
        description: s.description,
        position: s.position,
        lifecycleStatus: s.lifecycleStatus,
      })),
      entries.map((e) => ({
        entryId: e.id,
        sectionId: e.sectionId,
        productId: e.productId,
        displayName: e.displayName,
        displayDescription: e.displayDescription,
        imagePath: e.imagePath,
        position: e.position,
        lifecycleStatus: e.lifecycleStatus,
      })),
    );
  });
}

async function effectiveFingerprint(
  persistence: TestPersistence,
  menuVersionId: string,
): Promise<string> {
  return persistence.withContext(async (ctx) => {
    const graph = await loadVersionGraph(ctx, menuVersionId);
    return materialGraphFingerprint(graph.sections, graph.entries);
  });
}

async function customerProjectionFingerprint(
  persistence: TestPersistence,
  brandId: string,
): Promise<string> {
  const projection = await persistence.withContext((ctx) =>
    projectCustomerMenu(ctx, { brandId, at: AT }),
  );
  return JSON.stringify({
    sections: projection.sections.map((s) => ({
      id: s.id,
      parentSectionId: s.parentSectionId,
      name: s.name,
      position: s.position,
    })),
    items: projection.items.map((i) => ({
      sectionId: i.sectionId,
      productId: i.productId,
      name: i.name,
      description: i.description,
      imagePath: i.imagePath,
    })),
  });
}

describe("IMP-036F F3A — migration / backfill parity", () => {
  it("activateMenu establishes EFFECTIVE pointer with hierarchy, placement, overrides, and legacy parity", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const brandId = tree.brand.id;
      const [a, b] = await seedPublishedPricedProducts(persistence, actor, brandId, [
        { code: "f3a-a", name: "Product A" },
        { code: "f3a-b", name: "Product B" },
      ]);

      const seeded = await seedActivatedRepresentativeMenu(
        persistence,
        actor,
        brandId,
        "parity",
        { productA: a.productId, productB: b.productId },
      );

      // 1. ACTIVE menu gets EFFECTIVE version pointer
      expect(seeded.menu.lifecycleStatus).toBe("active");
      expect(seeded.menu.effectiveMenuVersionId).toBeTruthy();
      expect(seeded.menu.draftMenuVersionId).toBeNull();

      const version = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select()
          .from(menuVersionsTable)
          .where(eq(menuVersionsTable.id, seeded.menu.effectiveMenuVersionId!));
        return rows[0]!;
      });
      expect(version.lifecycleStatus).toBe("EFFECTIVE");

      const graph = await persistence.withContext((ctx) =>
        loadVersionGraph(ctx, seeded.menu.effectiveMenuVersionId!),
      );

      // 2. sections preserve hierarchy/order
      const rootV = graph.sections.find((s) => s.sectionId === seeded.root.id)!;
      const childV = graph.sections.find((s) => s.sectionId === seeded.child.id)!;
      expect(rootV.parentSectionId).toBeNull();
      expect(rootV.position).toBe(0);
      expect(rootV.name).toBe("Root Section");
      expect(childV.parentSectionId).toBe(seeded.root.id);
      expect(childV.position).toBe(1);
      expect(childV.name).toBe("Child Section");

      // 3. entries preserve product placement/order
      const entryAV = graph.entries.find((e) => e.entryId === seeded.entryA.id)!;
      const entryBV = graph.entries.find((e) => e.entryId === seeded.entryB.id)!;
      expect(entryAV.sectionId).toBe(seeded.root.id);
      expect(entryAV.productId).toBe(a.productId);
      expect(entryAV.position).toBe(0);
      expect(entryBV.sectionId).toBe(seeded.child.id);
      expect(entryBV.productId).toBe(b.productId);

      // 4. display overrides preserved
      expect(entryAV.displayName).toBe("Override A");
      expect(entryAV.displayDescription).toBe("Display override for A");

      // 5. legacy projection fields match versioned graph fingerprint
      const legacyFp = await legacyFingerprint(persistence, seeded.menu.id);
      const versionFp = await effectiveFingerprint(
        persistence,
        seeded.menu.effectiveMenuVersionId!,
      );
      expect(versionFp).toBe(legacyFp);
    });
  });

  it("exactly-one-active Menu after activate (second activate retires first)", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const brandId = tree.brand.id;
      const product = await seedPublishedPricedProduct(
        persistence,
        actor,
        brandId,
        "one-active-p",
        "One Active Product",
      );

      const first = await persistence.transaction((tx) =>
        createMenu(tx, {
          actor,
          brandId,
          code: "first-menu",
          name: "First Menu",
        }),
      );
      const firstSection = await persistence.transaction((tx) =>
        createMenuSection(tx, {
          actor,
          brandId,
          menuId: first.id,
          code: "first-sec",
          name: "First Sec",
          position: 0,
        }),
      );
      const firstEntry = await persistence.transaction((tx) =>
        createMenuEntry(tx, {
          actor,
          brandId,
          menuId: first.id,
          sectionId: firstSection.id,
          productId: product.productId,
          position: 0,
          imagePath: IMAGE,
        }),
      );
      await persistence.transaction(async (tx) => {
        await activateMenuSection(tx, { actor, sectionId: firstSection.id });
        await activateMenuEntry(tx, { actor, entryId: firstEntry.id });
        await activateMenu(tx, { actor, menuId: first.id });
      });
      expect(await countActiveMenus(persistence, brandId)).toBe(1);

      const second = await persistence.transaction((tx) =>
        createMenu(tx, {
          actor,
          brandId,
          code: "second-menu",
          name: "Second Menu",
        }),
      );
      const secondSection = await persistence.transaction((tx) =>
        createMenuSection(tx, {
          actor,
          brandId,
          menuId: second.id,
          code: "second-sec",
          name: "Second Sec",
          position: 0,
        }),
      );
      const secondEntry = await persistence.transaction((tx) =>
        createMenuEntry(tx, {
          actor,
          brandId,
          menuId: second.id,
          sectionId: secondSection.id,
          productId: product.productId,
          position: 0,
          imagePath: IMAGE,
        }),
      );
      await persistence.transaction(async (tx) => {
        await activateMenuSection(tx, { actor, sectionId: secondSection.id });
        await activateMenuEntry(tx, { actor, entryId: secondEntry.id });
        await activateMenu(tx, { actor, menuId: second.id });
      });

      expect(await countActiveMenus(persistence, brandId)).toBe(1);
      const firstAfter = await persistence.withContext((ctx) => findMenuById(ctx, first.id));
      const secondAfter = await persistence.withContext((ctx) => findMenuById(ctx, second.id));
      expect(firstAfter!.lifecycleStatus).toBe("retired");
      expect(secondAfter!.lifecycleStatus).toBe("active");
      expect(secondAfter!.effectiveMenuVersionId).toBeTruthy();
    });
  });
});

describe("IMP-036F F3A — draft isolation", () => {
  it("draft section rename / reorder / move / display / retire are invisible to customers; revision advances", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const brandId = tree.brand.id;
      const [a, b] = await seedPublishedPricedProducts(persistence, actor, brandId, [
        { code: "draft-a", name: "Draft Product A" },
        { code: "draft-b", name: "Draft Product B" },
      ]);
      const seeded = await seedActivatedRepresentativeMenu(
        persistence,
        actor,
        brandId,
        "draft-iso",
        { productA: a.productId, productB: b.productId },
      );
      const beforeRevision = seeded.menu.revision;
      const beforeCustomer = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId, at: AT }),
      );
      const beforeFp = await customerProjectionFingerprint(persistence, brandId);

      // 7. section rename
      await persistence.transaction((tx) =>
        updateMenuSection(tx, {
          actor,
          sectionId: seeded.root.id,
          name: "Renamed Draft Root",
        }),
      );

      // 8. section reorder
      await persistence.transaction((tx) =>
        reorderMenuSections(tx, {
          actor,
          menuId: seeded.menu.id,
          orderedSectionIds: [seeded.child.id, seeded.root.id],
        }),
      );

      // 9. product move/reorder
      await persistence.transaction((tx) =>
        moveMenuEntry(tx, {
          actor,
          entryId: seeded.entryA.id,
          targetSectionId: seeded.child.id,
          position: 1,
        }),
      );
      await persistence.transaction((tx) =>
        reorderMenuEntries(tx, {
          actor,
          sectionId: seeded.child.id,
          orderedEntryIds: [seeded.entryB.id, seeded.entryA.id],
        }),
      );

      // 10. display override
      await persistence.transaction((tx) =>
        updateMenuEntryDisplay(tx, {
          actor,
          entryId: seeded.entryA.id,
          displayName: "Draft Display Name",
          displayDescription: "Draft display description",
        }),
      );

      // 11. visibility — retire entry in draft
      await persistence.transaction((tx) =>
        retireMenuEntry(tx, { actor, entryId: seeded.entryB.id }),
      );

      const afterCustomer = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId, at: AT }),
      );
      const afterFp = await customerProjectionFingerprint(persistence, brandId);
      expect(afterFp).toBe(beforeFp);
      expect(afterCustomer.sections.map((s) => s.name)).toEqual(
        beforeCustomer.sections.map((s) => s.name),
      );
      expect(afterCustomer.items.map((i) => i.name)).toEqual(
        beforeCustomer.items.map((i) => i.name),
      );
      expect(afterCustomer.items).toHaveLength(2);

      // 12. draft mutation increments Menu.revision
      const afterMenu = await persistence.withContext((ctx) =>
        findMenuById(ctx, seeded.menu.id),
      );
      expect(afterMenu!.revision).toBeGreaterThan(beforeRevision);
      expect(afterMenu!.draftMenuVersionId).toBeTruthy();
      expect(afterMenu!.effectiveMenuVersionId).toBe(seeded.menu.effectiveMenuVersionId);
    });
  });
});

describe("IMP-036F F3A — publication", () => {
  it("valid publish switches pointer atomically; customer sees new graph; lifecycle stays ACTIVE", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const brandId = tree.brand.id;
      const [a, b] = await seedPublishedPricedProducts(persistence, actor, brandId, [
        { code: "pub-a", name: "Pub Product A" },
        { code: "pub-b", name: "Pub Product B" },
      ]);
      const seeded = await seedActivatedRepresentativeMenu(
        persistence,
        actor,
        brandId,
        "pub",
        { productA: a.productId, productB: b.productId },
      );
      const previousEffectiveId = seeded.menu.effectiveMenuVersionId!;

      await persistence.transaction((tx) =>
        updateMenuSection(tx, {
          actor,
          sectionId: seeded.root.id,
          name: "Published Root",
        }),
      );
      const beforePublish = await persistence.withContext((ctx) =>
        findMenuById(ctx, seeded.menu.id),
      );

      // 13. valid publish switches pointer atomically
      const published = await persistence.transaction((tx) =>
        publishMenuRevision(tx, {
          actor,
          menuId: seeded.menu.id,
          expectedMenuRevision: beforePublish!.revision,
        }),
      );
      expect(published.changed).toBe(true);
      expect(published.previousEffectiveMenuVersionId).toBe(previousEffectiveId);
      expect(published.effectiveMenuVersionId).not.toBe(previousEffectiveId);

      const after = await persistence.withContext((ctx) => findMenuById(ctx, seeded.menu.id));
      expect(after!.effectiveMenuVersionId).toBe(published.effectiveMenuVersionId);
      expect(after!.draftMenuVersionId).toBeNull();

      const oldVersion = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select()
          .from(menuVersionsTable)
          .where(eq(menuVersionsTable.id, previousEffectiveId));
        return rows[0]!;
      });
      const newVersion = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select()
          .from(menuVersionsTable)
          .where(eq(menuVersionsTable.id, published.effectiveMenuVersionId!));
        return rows[0]!;
      });
      expect(oldVersion.lifecycleStatus).toBe("SUPERSEDED");
      expect(newVersion.lifecycleStatus).toBe("EFFECTIVE");

      // 14. customer sees new graph after publish
      const customer = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId, at: AT }),
      );
      expect(customer.sections.find((s) => s.id === seeded.root.id)?.name).toBe(
        "Published Root",
      );

      // 17. Menu lifecycle remains ACTIVE during version publish
      expect(after!.lifecycleStatus).toBe("active");
    });
  });

  it("stale expectedMenuRevision → MENU_STALE_REVISION with zero customer effect", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const brandId = tree.brand.id;
      const [a, b] = await seedPublishedPricedProducts(persistence, actor, brandId, [
        { code: "stale-a", name: "Stale A" },
        { code: "stale-b", name: "Stale B" },
      ]);
      const seeded = await seedActivatedRepresentativeMenu(
        persistence,
        actor,
        brandId,
        "stale",
        { productA: a.productId, productB: b.productId },
      );
      const beforeFp = await customerProjectionFingerprint(persistence, brandId);
      const pointerBefore = seeded.menu.effectiveMenuVersionId;

      await persistence.transaction((tx) =>
        updateMenuSection(tx, {
          actor,
          sectionId: seeded.root.id,
          name: "Should Not Publish",
        }),
      );

      // 15. stale CAS
      let caught: unknown;
      try {
        await persistence.transaction((tx) =>
          publishMenuRevision(tx, {
            actor,
            menuId: seeded.menu.id,
            expectedMenuRevision: seeded.menu.revision,
          }),
        );
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(MenuConflictError);
      expect((caught as MenuConflictError).menuErrorCode).toBe("MENU_STALE_REVISION");

      const after = await persistence.withContext((ctx) => findMenuById(ctx, seeded.menu.id));
      expect(after!.effectiveMenuVersionId).toBe(pointerBefore);
      expect(await customerProjectionFingerprint(persistence, brandId)).toBe(beforeFp);
      const customer = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId, at: AT }),
      );
      expect(customer.sections.find((s) => s.id === seeded.root.id)?.name).toBe(
        "Root Section",
      );
    });
  });

  it("material no-op publish: changed=false, no menu.published, pointer unchanged", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const brandId = tree.brand.id;
      const [a, b] = await seedPublishedPricedProducts(persistence, actor, brandId, [
        { code: "noop-a", name: "Noop A" },
        { code: "noop-b", name: "Noop B" },
      ]);
      const seeded = await seedActivatedRepresentativeMenu(
        persistence,
        actor,
        brandId,
        "noop",
        { productA: a.productId, productB: b.productId },
      );

      // Domain write with identical name still creates a DRAFT copy of EFFECTIVE.
      await persistence.transaction((tx) =>
        updateMenuSection(tx, {
          actor,
          sectionId: seeded.root.id,
          name: "Root Section",
        }),
      );

      const beforeNoop = await persistence.withContext((ctx) =>
        findMenuById(ctx, seeded.menu.id),
      );
      const pointerBefore = beforeNoop!.effectiveMenuVersionId;
      expect(beforeNoop!.draftMenuVersionId).toBeTruthy();

      const publishedCountBefore = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select({ id: menuMutationAuditEventsTable.id })
          .from(menuMutationAuditEventsTable)
          .where(
            and(
              eq(menuMutationAuditEventsTable.menuId, seeded.menu.id),
              eq(menuMutationAuditEventsTable.action, "menu.published"),
            ),
          );
        return rows.length;
      });

      // 16. material no-op
      const noop = await persistence.transaction((tx) =>
        publishMenuRevision(tx, {
          actor,
          menuId: seeded.menu.id,
          expectedMenuRevision: beforeNoop!.revision,
        }),
      );
      expect(noop.changed).toBe(false);
      expect(noop.effectiveMenuVersionId).toBe(pointerBefore);

      const afterNoop = await persistence.withContext((ctx) =>
        findMenuById(ctx, seeded.menu.id),
      );
      expect(afterNoop!.effectiveMenuVersionId).toBe(pointerBefore);

      const publishedCountAfter = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select({ id: menuMutationAuditEventsTable.id })
          .from(menuMutationAuditEventsTable)
          .where(
            and(
              eq(menuMutationAuditEventsTable.menuId, seeded.menu.id),
              eq(menuMutationAuditEventsTable.action, "menu.published"),
            ),
          );
        return rows.length;
      });
      expect(publishedCountAfter).toBe(publishedCountBefore);
    });
  });

  it("exactly-one-active Menu after repeated publish", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const brandId = tree.brand.id;
      const [a, b] = await seedPublishedPricedProducts(persistence, actor, brandId, [
        { code: "rep-a", name: "Rep A" },
        { code: "rep-b", name: "Rep B" },
      ]);
      const seeded = await seedActivatedRepresentativeMenu(
        persistence,
        actor,
        brandId,
        "rep",
        { productA: a.productId, productB: b.productId },
      );

      for (const name of ["Pub One", "Pub Two", "Pub Three"]) {
        await persistence.transaction((tx) =>
          updateMenuSection(tx, {
            actor,
            sectionId: seeded.root.id,
            name,
          }),
        );
        const current = await persistence.withContext((ctx) =>
          findMenuById(ctx, seeded.menu.id),
        );
        await persistence.transaction((tx) =>
          publishMenuRevision(tx, {
            actor,
            menuId: seeded.menu.id,
            expectedMenuRevision: current!.revision,
          }),
        );
      }

      // 18.
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

describe("IMP-036F F3A — customer truth", () => {
  it("customer reads effective only; missing pointer fails closed without draft fallback", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const brandId = tree.brand.id;
      const [a, b] = await seedPublishedPricedProducts(persistence, actor, brandId, [
        { code: "cust-a", name: "Customer A" },
        { code: "cust-b", name: "Customer B" },
      ]);
      const seeded = await seedActivatedRepresentativeMenu(
        persistence,
        actor,
        brandId,
        "cust",
        { productA: a.productId, productB: b.productId },
      );

      await persistence.transaction((tx) =>
        updateMenuSection(tx, {
          actor,
          sectionId: seeded.root.id,
          name: "Draft Only Name",
        }),
      );

      // 19. customer reads effective only
      const customer = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId, at: AT }),
      );
      expect(customer.sections.find((s) => s.id === seeded.root.id)?.name).toBe(
        "Root Section",
      );
      expect(customer.sections.find((s) => s.id === seeded.root.id)?.name).not.toBe(
        "Draft Only Name",
      );

      // 20 + 21. null effective pointer fails closed; never falls back to draft
      await persistence.transaction(async (tx) => {
        await tx.db
          .update(menusTable)
          .set({ effectiveMenuVersionId: null, updatedAt: new Date() })
          .where(eq(menusTable.id, seeded.menu.id));
      });
      const afterNull = await persistence.withContext((ctx) =>
        findMenuById(ctx, seeded.menu.id),
      );
      expect(afterNull!.draftMenuVersionId).toBeTruthy();
      expect(afterNull!.effectiveMenuVersionId).toBeNull();

      await expect(
        persistence.withContext((ctx) => projectCustomerMenu(ctx, { brandId, at: AT })),
      ).rejects.toBeInstanceOf(CustomerMenuError);
    });
  });

  it("catalog draft remains invisible through Menu publication", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const brandId = tree.brand.id;
      const [a, b] = await seedPublishedPricedProducts(persistence, actor, brandId, [
        { code: "cat-a", name: "Catalog Name A" },
        { code: "cat-b", name: "Catalog Name B" },
      ]);
      const seeded = await seedActivatedRepresentativeMenu(
        persistence,
        actor,
        brandId,
        "cat-iso",
        { productA: a.productId, productB: b.productId },
      );

      // 22. save product draft B, publish menu placement — customer still sees catalog A
      await persistence.transaction((tx) =>
        saveProductContentDraft(tx, {
          actor,
          productId: a.productId,
          expectedContentRevision: 1,
          name: "Catalog Name B Draft",
        }),
      );
      const productAfterDraft = await persistence.withContext((ctx) =>
        findProductById(ctx, a.productId),
      );
      expect(productAfterDraft!.name).toBe("Catalog Name B Draft");

      await persistence.transaction((tx) =>
        updateMenuEntryDisplay(tx, {
          actor,
          entryId: seeded.entryA.id,
          // Clear override so customer would show product effective name
          displayName: null,
        }),
      );
      const beforeMenuPub = await persistence.withContext((ctx) =>
        findMenuById(ctx, seeded.menu.id),
      );
      await persistence.transaction((tx) =>
        publishMenuRevision(tx, {
          actor,
          menuId: seeded.menu.id,
          expectedMenuRevision: beforeMenuPub!.revision,
        }),
      );

      const customer = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId, at: AT }),
      );
      const itemA = customer.items.find((i) => i.productId === a.productId)!;
      expect(itemA.name).toBe("Catalog Name A");
      expect(itemA.name).not.toBe("Catalog Name B Draft");
    });
  });
});

describe("IMP-036F F3A — legacy authority", () => {
  it("direct SQL legacy update does not change customer; domain path updates version authority; legacy still readable", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const brandId = tree.brand.id;
      const [a, b] = await seedPublishedPricedProducts(persistence, actor, brandId, [
        { code: "leg-a", name: "Legacy A" },
        { code: "leg-b", name: "Legacy B" },
      ]);
      const seeded = await seedActivatedRepresentativeMenu(
        persistence,
        actor,
        brandId,
        "legacy",
        { productA: a.productId, productB: b.productId },
      );
      const beforeFp = await customerProjectionFingerprint(persistence, brandId);

      // 26. direct SQL update to menu_sections name does NOT change customer projection
      await persistence.transaction(async (tx) => {
        await tx.db
          .update(menuSectionsTable)
          .set({ name: "SQL Hacked Name", updatedAt: new Date() })
          .where(eq(menuSectionsTable.id, seeded.root.id));
      });
      expect(await customerProjectionFingerprint(persistence, brandId)).toBe(beforeFp);
      const afterSql = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId, at: AT }),
      );
      expect(afterSql.sections.find((s) => s.id === seeded.root.id)?.name).toBe(
        "Root Section",
      );

      // 28. legacy rows still readable for forensic parity
      const legacyRow = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select()
          .from(menuSectionsTable)
          .where(eq(menuSectionsTable.id, seeded.root.id));
        return rows[0]!;
      });
      expect(legacyRow.name).toBe("SQL Hacked Name");

      // 27. domain path still updates version authority (draft + publish)
      await persistence.transaction((tx) =>
        updateMenuSection(tx, {
          actor,
          sectionId: seeded.root.id,
          name: "Domain Versioned Name",
        }),
      );
      // Customer still old until publish
      expect(
        (
          await persistence.withContext((ctx) =>
            projectCustomerMenu(ctx, { brandId, at: AT }),
          )
        ).sections.find((s) => s.id === seeded.root.id)?.name,
      ).toBe("Root Section");

      const beforePub = await persistence.withContext((ctx) =>
        findMenuById(ctx, seeded.menu.id),
      );
      await persistence.transaction((tx) =>
        publishMenuRevision(tx, {
          actor,
          menuId: seeded.menu.id,
          expectedMenuRevision: beforePub!.revision,
        }),
      );
      const afterDomain = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId, at: AT }),
      );
      expect(afterDomain.sections.find((s) => s.id === seeded.root.id)?.name).toBe(
        "Domain Versioned Name",
      );

      // Version child matches; legacy mirror also updated by domain path
      const draftOrEffective = await persistence.withContext((ctx) =>
        findMenuById(ctx, seeded.menu.id),
      );
      const versionSection = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select()
          .from(menuSectionVersionsTable)
          .where(
            and(
              eq(
                menuSectionVersionsTable.menuVersionId,
                draftOrEffective!.effectiveMenuVersionId!,
              ),
              eq(menuSectionVersionsTable.sectionId, seeded.root.id),
            ),
          );
        return rows[0]!;
      });
      expect(versionSection.name).toBe("Domain Versioned Name");

      const legacyAfterDomain = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db
          .select()
          .from(menuSectionsTable)
          .where(eq(menuSectionsTable.id, seeded.root.id));
        return rows[0]!;
      });
      expect(legacyAfterDomain.name).toBe("Domain Versioned Name");
    });
  });
});
