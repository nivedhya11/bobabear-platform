/**
 * Authorized menu graph reads (IMP-013).
 */
import { asc, eq } from "drizzle-orm";

import {
  menuEntriesTable,
  menuSectionsTable,
} from "../../../platform/database/schema/menu";
import type { PersistenceQueryContext } from "../../persistence/types";
import { assertUuid } from "../lifecycle";
import { requireMenuRead } from "./authorize-menu";
import { MenuNotFoundError } from "./errors";
import type { MenuEntry, MenuGraph, MenuReadInput, MenuSection } from "./types";
import { loadMenuById, rowToEntry, rowToSection } from "./validation";

export async function getMenuGraph(
  context: PersistenceQueryContext,
  input: MenuReadInput,
): Promise<MenuGraph> {
  const menuId = assertUuid(input.menuId, "menuId");
  const menu = await loadMenuById(context, menuId);
  if (!menu) throw new MenuNotFoundError("menu");
  await requireMenuRead(context, input.actor, menu.brandId);

  const sectionRows = await context.db
    .select()
    .from(menuSectionsTable)
    .where(eq(menuSectionsTable.menuId, menuId))
    .orderBy(asc(menuSectionsTable.position), asc(menuSectionsTable.id));

  const entryRows = await context.db
    .select()
    .from(menuEntriesTable)
    .where(eq(menuEntriesTable.menuId, menuId))
    .orderBy(asc(menuEntriesTable.position), asc(menuEntriesTable.id));

  const sections: MenuSection[] = sectionRows.map(rowToSection);
  const entries: MenuEntry[] = entryRows.map(rowToEntry);

  return { menu, sections, entries };
}

/**
 * Effective customer-facing display for a menu entry against product fields.
 * Null entry overrides mean the product values win.
 */
export function effectiveEntryDisplay(
  entry: Readonly<{
    displayName: string | null;
    displayDescription: string | null;
  }>,
  product: Readonly<{ name: string; description: string | null }>,
): Readonly<{ name: string; description: string | null }> {
  return {
    name: entry.displayName ?? product.name,
    description: entry.displayDescription ?? product.description,
  };
}
