/**
 * Menu presentation graph domain tests (IMP-013 / IMP-036F F3A).
 * Depth limits, self-parent rejection, and retirement dependency order.
 */
import { describe, expect, it } from "vitest";

import {
  CatalogInvalidStateError,
  activateProduct,
  activateVariant,
  createProduct,
  createVariant,
  retireProduct,
} from "../../src/server/catalog";
import {
  MenuInvalidStateError,
  MenuValidationError,
  activateMenuEntry,
  activateMenuSection,
  assertSectionDepthAllowed,
  createMenu,
  createMenuEntry,
  createMenuSection,
  findMenuById,
  publishMenuRevision,
  retireMenu,
  retireMenuEntry,
  retireMenuSection,
} from "../../src/server/catalog/menu";
import { withCatalogDomain } from "./support";

describe("menu section depth and parent rules", () => {
  it("allows depth 2 and rejects depth 3", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      let menu = await persistence.transaction((tx) =>
        createMenu(tx, {
          actor,
          brandId: tree.brand.id,
          code: "primary",
          name: "Primary Menu",
        }),
      );

      const root = await persistence.transaction(async (tx) => {
        const current = await findMenuById(tx, menu.id);
        return createMenuSection(tx, {
          actor,
          brandId: tree.brand.id,
          menuId: menu.id,
          code: "root",
          name: "Root",
          position: 0,
          expectedMenuRevision: current!.revision,
        });
      });
      menu = await persistence.withContext((ctx) => findMenuById(ctx, menu.id)).then((m) => m!);

      const child = await persistence.transaction(async (tx) => {
        const current = await findMenuById(tx, menu.id);
        return createMenuSection(tx, {
          actor,
          brandId: tree.brand.id,
          menuId: menu.id,
          parentSectionId: root.id,
          code: "child",
          name: "Child",
          position: 0,
          expectedMenuRevision: current!.revision,
        });
      });
      expect(child.parentSectionId).toBe(root.id);

      menu = await persistence.withContext((ctx) => findMenuById(ctx, menu.id)).then((m) => m!);
      await expect(
        persistence.transaction((tx) =>
          createMenuSection(tx, {
            actor,
            brandId: tree.brand.id,
            menuId: menu.id,
            parentSectionId: child.id,
            code: "grandchild",
            name: "Grandchild",
            position: 0,
            expectedMenuRevision: menu.revision,
          }),
        ),
      ).rejects.toBeInstanceOf(MenuValidationError);
    });
  });

  it("rejects self-parent via assertSectionDepthAllowed", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      let menu = await persistence.transaction((tx) =>
        createMenu(tx, {
          actor,
          brandId: tree.brand.id,
          code: "self-parent-menu",
          name: "Self Parent Menu",
        }),
      );
      const section = await persistence.transaction(async (tx) => {
        const current = await findMenuById(tx, menu.id);
        return createMenuSection(tx, {
          actor,
          brandId: tree.brand.id,
          menuId: menu.id,
          code: "alone",
          name: "Alone",
          position: 0,
          expectedMenuRevision: current!.revision,
        });
      });

      await expect(
        persistence.withContext((ctx) =>
          assertSectionDepthAllowed(ctx, {
            menuId: menu.id,
            brandId: tree.brand.id,
            parentSectionId: section.id,
            sectionId: section.id,
          }),
        ),
      ).rejects.toBeInstanceOf(MenuValidationError);
    });
  });
});

describe("menu retirement dependency order", () => {
  it("requires entry → section → menu order and blocks product retirement while entry active", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const product = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId: tree.brand.id,
          code: "menu-item",
          name: "Menu Item",
          productKind: "standard",
        }),
      );
      const variant = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor,
          productId: product.id,
          code: "default",
          name: "Default",
          isDefault: true,
          isSelectorVisible: false,
        }),
      );
      await persistence.transaction(async (tx) => {
        await activateVariant(tx, { actor, variantId: variant.id });
        await activateProduct(tx, { actor, productId: product.id });
      });

      let menu = await persistence.transaction((tx) =>
        createMenu(tx, {
          actor,
          brandId: tree.brand.id,
          code: "retire-order",
          name: "Retire Order Menu",
        }),
      );
      const root = await persistence.transaction(async (tx) => {
        const current = await findMenuById(tx, menu.id);
        return createMenuSection(tx, {
          actor,
          brandId: tree.brand.id,
          menuId: menu.id,
          code: "root",
          name: "Root",
          position: 0,
          expectedMenuRevision: current!.revision,
        });
      });
      menu = await persistence.withContext((ctx) => findMenuById(ctx, menu.id)).then((m) => m!);

      const entry = await persistence.transaction(async (tx) => {
        const current = await findMenuById(tx, menu.id);
        return createMenuEntry(tx, {
          actor,
          brandId: tree.brand.id,
          menuId: menu.id,
          sectionId: root.id,
          productId: product.id,
          position: 0,
          imagePath: "/assets/menu/Bangkok_Thai_Tea_Boba.jpeg",
          expectedMenuRevision: current!.revision,
        });
      });

      await persistence.transaction(async (tx) => {
        let current = await findMenuById(tx, menu.id);
        await activateMenuSection(tx, {
          actor,
          sectionId: root.id,
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

      await expect(
        persistence.transaction((tx) => retireMenu(tx, { actor, menuId: menu.id })),
      ).rejects.toBeInstanceOf(MenuInvalidStateError);

      menu = await persistence.withContext((ctx) => findMenuById(ctx, menu.id)).then((m) => m!);
      await expect(
        persistence.transaction((tx) =>
          retireMenuSection(tx, {
            actor,
            sectionId: root.id,
            expectedMenuRevision: menu.revision,
          }),
        ),
      ).rejects.toBeInstanceOf(MenuInvalidStateError);

      await expect(
        persistence.transaction((tx) => retireProduct(tx, { actor, productId: product.id })),
      ).rejects.toBeInstanceOf(CatalogInvalidStateError);

      menu = await persistence.withContext((ctx) => findMenuById(ctx, menu.id)).then((m) => m!);
      await persistence.transaction(async (tx) => {
        let current = await findMenuById(tx, menu.id);
        await retireMenuEntry(tx, {
          actor,
          entryId: entry.id,
          expectedMenuRevision: current!.revision,
        });
        current = await findMenuById(tx, menu.id);
        await retireMenuSection(tx, {
          actor,
          sectionId: root.id,
          expectedMenuRevision: current!.revision,
        });
      });

      const beforePublish = await persistence.withContext((ctx) => findMenuById(ctx, menu.id));
      await persistence.transaction((tx) =>
        publishMenuRevision(tx, {
          actor,
          menuId: menu.id,
          expectedMenuRevision: beforePublish!.revision,
        }),
      );

      await persistence.transaction((tx) => retireMenu(tx, { actor, menuId: menu.id }));
      await persistence.transaction((tx) => retireProduct(tx, { actor, productId: product.id }));
    });
  });

  it("rejects retiring a parent section while an active child remains", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      let menu = await persistence.transaction((tx) =>
        createMenu(tx, {
          actor,
          brandId: tree.brand.id,
          code: "parent-child",
          name: "Parent Child Menu",
        }),
      );
      const root = await persistence.transaction(async (tx) => {
        const current = await findMenuById(tx, menu.id);
        return createMenuSection(tx, {
          actor,
          brandId: tree.brand.id,
          menuId: menu.id,
          code: "root",
          name: "Root",
          position: 0,
          expectedMenuRevision: current!.revision,
        });
      });
      menu = await persistence.withContext((ctx) => findMenuById(ctx, menu.id)).then((m) => m!);

      const child = await persistence.transaction(async (tx) => {
        const current = await findMenuById(tx, menu.id);
        return createMenuSection(tx, {
          actor,
          brandId: tree.brand.id,
          menuId: menu.id,
          parentSectionId: root.id,
          code: "child",
          name: "Child",
          position: 0,
          expectedMenuRevision: current!.revision,
        });
      });

      await persistence.transaction(async (tx) => {
        let current = await findMenuById(tx, menu.id);
        await activateMenuSection(tx, {
          actor,
          sectionId: root.id,
          expectedMenuRevision: current!.revision,
        });
        current = await findMenuById(tx, menu.id);
        await activateMenuSection(tx, {
          actor,
          sectionId: child.id,
          expectedMenuRevision: current!.revision,
        });
      });

      menu = await persistence.withContext((ctx) => findMenuById(ctx, menu.id)).then((m) => m!);
      await expect(
        persistence.transaction((tx) =>
          retireMenuSection(tx, {
            actor,
            sectionId: root.id,
            expectedMenuRevision: menu.revision,
          }),
        ),
      ).rejects.toBeInstanceOf(MenuInvalidStateError);

      menu = await persistence.withContext((ctx) => findMenuById(ctx, menu.id)).then((m) => m!);
      await persistence.transaction(async (tx) => {
        let current = await findMenuById(tx, menu.id);
        await retireMenuSection(tx, {
          actor,
          sectionId: child.id,
          expectedMenuRevision: current!.revision,
        });
        current = await findMenuById(tx, menu.id);
        await retireMenuSection(tx, {
          actor,
          sectionId: root.id,
          expectedMenuRevision: current!.revision,
        });
      });
    });
  });
});
