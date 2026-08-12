/**
 * Active menu-graph validation (IMP-013).
 *
 * Fail closed — no silent repair. Max section depth is 2 (root + one child).
 */
import { and, eq, ne } from "drizzle-orm";

import { MENU_SECTION_MAX_DEPTH } from "../../../shared/catalog/menu";
import {
  menuEntriesTable,
  menusTable,
  menuSectionsTable,
} from "../../../platform/database/schema/menu";
import { catalogProductsTable } from "../../../platform/database/schema/catalog";
import type { PersistenceQueryContext } from "../../persistence/types";
import { assertApplicationRole } from "../assert-role";
import { MenuInvalidStateError, MenuNotFoundError, MenuValidationError } from "./errors";
import type { Menu, MenuEntry, MenuSection } from "./types";

function rowToMenu(row: typeof menusTable.$inferSelect): Menu {
  return {
    id: row.id,
    brandId: row.brandId,
    code: row.code,
    name: row.name,
    lifecycleStatus: row.lifecycleStatus as Menu["lifecycleStatus"],
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  };
}

function rowToSection(row: typeof menuSectionsTable.$inferSelect): MenuSection {
  return {
    id: row.id,
    brandId: row.brandId,
    menuId: row.menuId,
    parentSectionId: row.parentSectionId,
    code: row.code,
    name: row.name,
    description: row.description,
    position: row.position,
    lifecycleStatus: row.lifecycleStatus as MenuSection["lifecycleStatus"],
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  };
}

function rowToEntry(row: typeof menuEntriesTable.$inferSelect): MenuEntry {
  return {
    id: row.id,
    brandId: row.brandId,
    menuId: row.menuId,
    sectionId: row.sectionId,
    productId: row.productId,
    displayName: row.displayName,
    displayDescription: row.displayDescription,
    imagePath: row.imagePath,
    position: row.position,
    lifecycleStatus: row.lifecycleStatus as MenuEntry["lifecycleStatus"],
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  };
}

export async function loadMenuById(
  context: PersistenceQueryContext,
  menuId: string,
): Promise<Menu | null> {
  assertApplicationRole(context, "loadMenuById");
  const rows = await context.db
    .select()
    .from(menusTable)
    .where(eq(menusTable.id, menuId))
    .limit(1);
  const row = rows[0];
  return row ? rowToMenu(row) : null;
}

export async function loadSectionById(
  context: PersistenceQueryContext,
  sectionId: string,
): Promise<MenuSection | null> {
  assertApplicationRole(context, "loadSectionById");
  const rows = await context.db
    .select()
    .from(menuSectionsTable)
    .where(eq(menuSectionsTable.id, sectionId))
    .limit(1);
  const row = rows[0];
  return row ? rowToSection(row) : null;
}

export async function loadEntryById(
  context: PersistenceQueryContext,
  entryId: string,
): Promise<MenuEntry | null> {
  assertApplicationRole(context, "loadEntryById");
  const rows = await context.db
    .select()
    .from(menuEntriesTable)
    .where(eq(menuEntriesTable.id, entryId))
    .limit(1);
  const row = rows[0];
  return row ? rowToEntry(row) : null;
}

/**
 * Depth of a section: root = 1, child of root = 2.
 * Rejects cycles and depth greater than MENU_SECTION_MAX_DEPTH.
 */
export async function assertSectionDepthAllowed(
  context: PersistenceQueryContext,
  input: Readonly<{
    menuId: string;
    brandId: string;
    parentSectionId: string | null;
    sectionId?: string;
  }>,
): Promise<number> {
  assertApplicationRole(context, "assertSectionDepthAllowed");
  if (input.parentSectionId === null) {
    return 1;
  }
  if (input.sectionId !== undefined && input.parentSectionId === input.sectionId) {
    throw new MenuValidationError({ message: "A section cannot be its own parent." });
  }

  const visited = new Set<string>();
  if (input.sectionId) visited.add(input.sectionId);

  let currentId: string | null = input.parentSectionId;
  let depth = 1;
  while (currentId !== null) {
    if (visited.has(currentId)) {
      throw new MenuValidationError({ message: "Menu section parent cycle is not allowed." });
    }
    visited.add(currentId);
    depth += 1;
    if (depth > MENU_SECTION_MAX_DEPTH) {
      throw new MenuValidationError({
        message: `Menu section hierarchy depth must be at most ${MENU_SECTION_MAX_DEPTH}.`,
      });
    }
    const parent = await loadSectionById(context, currentId);
    if (!parent) {
      throw new MenuNotFoundError("menu_section");
    }
    if (parent.menuId !== input.menuId || parent.brandId !== input.brandId) {
      throw new MenuValidationError({
        message: "Parent section must belong to the same brand and menu.",
      });
    }
    currentId = parent.parentSectionId;
  }
  return depth;
}

export async function assertMenuGraphReady(
  context: PersistenceQueryContext,
  menuId: string,
): Promise<void> {
  assertApplicationRole(context, "assertMenuGraphReady");
  const menu = await loadMenuById(context, menuId);
  if (!menu) throw new MenuNotFoundError("menu");
  if (menu.lifecycleStatus !== "active") {
    throw new MenuInvalidStateError({
      message: "Active menu graph validation requires an active menu.",
    });
  }

  const sections = await context.db
    .select()
    .from(menuSectionsTable)
    .where(
      and(
        eq(menuSectionsTable.menuId, menuId),
        eq(menuSectionsTable.lifecycleStatus, "active"),
      ),
    );
  const sectionById = new Map(sections.map((s) => [s.id, rowToSection(s)]));

  for (const section of sectionById.values()) {
    if (section.parentSectionId !== null) {
      const parent = sectionById.get(section.parentSectionId);
      if (!parent || parent.lifecycleStatus !== "active") {
        throw new MenuInvalidStateError({
          message: "Active child section requires an active parent section.",
        });
      }
      await assertSectionDepthAllowed(context, {
        menuId,
        brandId: menu.brandId,
        parentSectionId: section.parentSectionId,
        sectionId: section.id,
      });
    }
  }

  const entries = await context.db
    .select()
    .from(menuEntriesTable)
    .where(
      and(eq(menuEntriesTable.menuId, menuId), eq(menuEntriesTable.lifecycleStatus, "active")),
    );

  for (const entryRow of entries) {
    const entry = rowToEntry(entryRow);
    const section = sectionById.get(entry.sectionId);
    if (!section || section.lifecycleStatus !== "active") {
      throw new MenuInvalidStateError({
        message: "Active menu entry requires an active section.",
      });
    }
    const productRows = await context.db
      .select({
        brandId: catalogProductsTable.brandId,
        lifecycleStatus: catalogProductsTable.lifecycleStatus,
      })
      .from(catalogProductsTable)
      .where(eq(catalogProductsTable.id, entry.productId))
      .limit(1);
    const product = productRows[0];
    if (!product || product.lifecycleStatus !== "active") {
      throw new MenuInvalidStateError({
        message: "Active menu entry requires an active product.",
      });
    }
    if (product.brandId !== menu.brandId) {
      throw new MenuInvalidStateError({
        message: "Menu entry product must belong to the same brand as the menu.",
      });
    }
  }
}

export async function assertNoActiveSectionsForMenu(
  context: PersistenceQueryContext,
  menuId: string,
): Promise<void> {
  const rows = await context.db
    .select({ id: menuSectionsTable.id })
    .from(menuSectionsTable)
    .where(
      and(
        eq(menuSectionsTable.menuId, menuId),
        eq(menuSectionsTable.lifecycleStatus, "active"),
      ),
    )
    .limit(1);
  if (rows[0]) {
    throw new MenuInvalidStateError({
      message: "Cannot retire a menu while active sections exist.",
    });
  }
}

export async function assertNoActiveChildrenForSection(
  context: PersistenceQueryContext,
  sectionId: string,
): Promise<void> {
  const rows = await context.db
    .select({ id: menuSectionsTable.id })
    .from(menuSectionsTable)
    .where(
      and(
        eq(menuSectionsTable.parentSectionId, sectionId),
        eq(menuSectionsTable.lifecycleStatus, "active"),
      ),
    )
    .limit(1);
  if (rows[0]) {
    throw new MenuInvalidStateError({
      message: "Cannot retire a section while active child sections exist.",
    });
  }
}

export async function assertNoActiveEntriesForSection(
  context: PersistenceQueryContext,
  sectionId: string,
): Promise<void> {
  const rows = await context.db
    .select({ id: menuEntriesTable.id })
    .from(menuEntriesTable)
    .where(
      and(
        eq(menuEntriesTable.sectionId, sectionId),
        eq(menuEntriesTable.lifecycleStatus, "active"),
      ),
    )
    .limit(1);
  if (rows[0]) {
    throw new MenuInvalidStateError({
      message: "Cannot retire a section while active menu entries exist.",
    });
  }
}

export async function assertNoActiveEntriesForProduct(
  context: PersistenceQueryContext,
  productId: string,
): Promise<void> {
  assertApplicationRole(context, "assertNoActiveEntriesForProduct");
  const rows = await context.db
    .select({ id: menuEntriesTable.id })
    .from(menuEntriesTable)
    .where(
      and(
        eq(menuEntriesTable.productId, productId),
        eq(menuEntriesTable.lifecycleStatus, "active"),
      ),
    )
    .limit(1);
  if (rows[0]) {
    throw new MenuInvalidStateError({
      message: "Cannot retire a product while active menu entries reference it.",
    });
  }
}

export async function countActiveEntriesForProduct(
  context: PersistenceQueryContext,
  productId: string,
): Promise<number> {
  assertApplicationRole(context, "countActiveEntriesForProduct");
  const rows = await context.db
    .select({ id: menuEntriesTable.id })
    .from(menuEntriesTable)
    .where(
      and(
        eq(menuEntriesTable.productId, productId),
        ne(menuEntriesTable.lifecycleStatus, "retired"),
      ),
    );
  return rows.length;
}

/** Trusted internal: product exists and is same brand (for entry create). */
export async function assertProductEligibleForEntry(
  context: PersistenceQueryContext,
  productId: string,
  brandId: string,
): Promise<void> {
  const productRows = await context.db
    .select({
      id: catalogProductsTable.id,
      brandId: catalogProductsTable.brandId,
      lifecycleStatus: catalogProductsTable.lifecycleStatus,
    })
    .from(catalogProductsTable)
    .where(eq(catalogProductsTable.id, productId))
    .limit(1);
  const product = productRows[0];
  if (!product) {
    throw new MenuNotFoundError("product");
  }
  if (product.brandId !== brandId) {
    throw new MenuValidationError({
      message: "Menu entry product must belong to the same brand as the menu.",
    });
  }
}

export { rowToEntry, rowToMenu, rowToSection };
