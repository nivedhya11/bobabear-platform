/**
 * Menu presentation graph domain tests (IMP-013).
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
  activateMenu,
  activateMenuEntry,
  activateMenuSection,
  assertSectionDepthAllowed,
  createMenu,
  createMenuEntry,
  createMenuSection,
  retireMenu,
  retireMenuEntry,
  retireMenuSection,
} from "../../src/server/catalog/menu";
import { withCatalogDomain } from "./support";

describe("menu section depth and parent rules", () => {
  it("allows depth 2 and rejects depth 3", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const menu = await persistence.transaction((tx) =>
        createMenu(tx, {
          actor,
          brandId: tree.brand.id,
          code: "primary",
          name: "Primary Menu",
        }),
      );

      const root = await persistence.transaction((tx) =>
        createMenuSection(tx, {
          actor,
          brandId: tree.brand.id,
          menuId: menu.id,
          code: "root",
          name: "Root",
          position: 0,
        }),
      );

      const child = await persistence.transaction((tx) =>
        createMenuSection(tx, {
          actor,
          brandId: tree.brand.id,
          menuId: menu.id,
          parentSectionId: root.id,
          code: "child",
          name: "Child",
          position: 0,
        }),
      );
      expect(child.parentSectionId).toBe(root.id);

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
          }),
        ),
      ).rejects.toBeInstanceOf(MenuValidationError);
    });
  });

  it("rejects self-parent via assertSectionDepthAllowed", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const menu = await persistence.transaction((tx) =>
        createMenu(tx, {
          actor,
          brandId: tree.brand.id,
          code: "self-parent-menu",
          name: "Self Parent Menu",
        }),
      );
      const section = await persistence.transaction((tx) =>
        createMenuSection(tx, {
          actor,
          brandId: tree.brand.id,
          menuId: menu.id,
          code: "alone",
          name: "Alone",
          position: 0,
        }),
      );

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

      const menu = await persistence.transaction((tx) =>
        createMenu(tx, {
          actor,
          brandId: tree.brand.id,
          code: "retire-order",
          name: "Retire Order Menu",
        }),
      );
      const root = await persistence.transaction((tx) =>
        createMenuSection(tx, {
          actor,
          brandId: tree.brand.id,
          menuId: menu.id,
          code: "root",
          name: "Root",
          position: 0,
        }),
      );
      const entry = await persistence.transaction((tx) =>
        createMenuEntry(tx, {
          actor,
          brandId: tree.brand.id,
          menuId: menu.id,
          sectionId: root.id,
          productId: product.id,
          position: 0,
          imagePath: "/assets/menu/Bangkok_Thai_Tea_Boba.jpeg",
        }),
      );

      await persistence.transaction(async (tx) => {
        await activateMenu(tx, { actor, menuId: menu.id });
        await activateMenuSection(tx, { actor, sectionId: root.id });
        await activateMenuEntry(tx, { actor, entryId: entry.id });
      });

      await expect(
        persistence.transaction((tx) => retireMenu(tx, { actor, menuId: menu.id })),
      ).rejects.toBeInstanceOf(MenuInvalidStateError);

      await expect(
        persistence.transaction((tx) => retireMenuSection(tx, { actor, sectionId: root.id })),
      ).rejects.toBeInstanceOf(MenuInvalidStateError);

      await expect(
        persistence.transaction((tx) => retireProduct(tx, { actor, productId: product.id })),
      ).rejects.toBeInstanceOf(CatalogInvalidStateError);

      await persistence.transaction((tx) => retireMenuEntry(tx, { actor, entryId: entry.id }));
      await persistence.transaction((tx) => retireMenuSection(tx, { actor, sectionId: root.id }));
      await persistence.transaction((tx) => retireMenu(tx, { actor, menuId: menu.id }));
      await persistence.transaction((tx) => retireProduct(tx, { actor, productId: product.id }));
    });
  });

  it("rejects retiring a parent section while an active child remains", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const menu = await persistence.transaction((tx) =>
        createMenu(tx, {
          actor,
          brandId: tree.brand.id,
          code: "parent-child",
          name: "Parent Child Menu",
        }),
      );
      const root = await persistence.transaction((tx) =>
        createMenuSection(tx, {
          actor,
          brandId: tree.brand.id,
          menuId: menu.id,
          code: "root",
          name: "Root",
          position: 0,
        }),
      );
      const child = await persistence.transaction((tx) =>
        createMenuSection(tx, {
          actor,
          brandId: tree.brand.id,
          menuId: menu.id,
          parentSectionId: root.id,
          code: "child",
          name: "Child",
          position: 0,
        }),
      );

      await persistence.transaction(async (tx) => {
        await activateMenu(tx, { actor, menuId: menu.id });
        await activateMenuSection(tx, { actor, sectionId: root.id });
        await activateMenuSection(tx, { actor, sectionId: child.id });
      });

      await expect(
        persistence.transaction((tx) => retireMenuSection(tx, { actor, sectionId: root.id })),
      ).rejects.toBeInstanceOf(MenuInvalidStateError);

      await persistence.transaction((tx) => retireMenuSection(tx, { actor, sectionId: child.id }));
      await persistence.transaction((tx) => retireMenuSection(tx, { actor, sectionId: root.id }));
    });
  });
});
