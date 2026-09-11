/**
 * Authorized menu graph reads (IMP-013 / IMP-036F F3A).
 *
 * Prefer draft version graph when present, else effective, else legacy seed.
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
import {
  entryVersionToMenuEntry,
  loadVersionGraph,
  sectionVersionToMenuSection,
} from "./versions";
import { loadMenuById, rowToEntry, rowToSection } from "./validation";

export async function getMenuGraph(
  context: PersistenceQueryContext,
  input: MenuReadInput,
): Promise<MenuGraph> {
  const menuId = assertUuid(input.menuId, "menuId");
  const menu = await loadMenuById(context, menuId);
  if (!menu) throw new MenuNotFoundError("menu");
  await requireMenuRead(context, input.actor, menu.brandId);

  const versionId = menu.draftMenuVersionId ?? menu.effectiveMenuVersionId ?? null;
  if (versionId) {
    const graph = await loadVersionGraph(context, versionId);
    const timestamps = {
      createdAt: menu.createdAt,
      updatedAt: menu.updatedAt,
    };
    const sections: MenuSection[] = graph.sections
      .map((row) => sectionVersionToMenuSection(row, timestamps))
      .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
    const entries: MenuEntry[] = graph.entries
      .map((row) => entryVersionToMenuEntry(row, timestamps))
      .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
    return {
      menu,
      sections,
      entries,
      source: menu.draftMenuVersionId ? "draft" : "effective",
      menuVersionId: versionId,
    };
  }

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

  return {
    menu,
    sections: sectionRows.map(rowToSection),
    entries: entryRows.map(rowToEntry),
    source: "legacy",
    menuVersionId: null,
  };
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
