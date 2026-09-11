/**
 * Brand-scoped Menu inspection projections (IMP-036F F3B).
 *
 * Explicit effective vs draft graphs — never force operators to infer customer truth.
 */
import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { menusTable } from "../../../platform/database/schema/menu";
import type { WorkforcePrincipal } from "../../access-control/principal";
import type { PersistenceQueryContext } from "../../persistence/types";
import { assertApplicationRole } from "../assert-role";
import { assertUuid } from "../lifecycle";
import { requireMenuRead } from "./authorize-menu";
import { MenuNotFoundError } from "./errors";
import type { Menu, MenuEntry, MenuSection } from "./types";
import {
  entryVersionToMenuEntry,
  loadVersionGraph,
  materialGraphFingerprint,
  rowToMenu,
  sectionVersionToMenuSection,
} from "./versions";

export type MenuListItem = Readonly<{
  id: string;
  code: string;
  name: string;
  lifecycleStatus: Menu["lifecycleStatus"];
  revision: string;
  hasEffectiveVersion: boolean;
  hasDraftVersion: boolean;
}>;

export type MenuInspectionSection = Readonly<{
  id: string;
  parentSectionId: string | null;
  code: string;
  name: string;
  description: string | null;
  position: number;
  lifecycleStatus: MenuSection["lifecycleStatus"];
}>;

export type MenuInspectionEntry = Readonly<{
  id: string;
  sectionId: string;
  productId: string;
  displayName: string | null;
  displayDescription: string | null;
  imagePath: string | null;
  position: number;
  lifecycleStatus: MenuEntry["lifecycleStatus"];
}>;

export type MenuInspectionVersionGraph = Readonly<{
  versionId: string;
  sections: readonly MenuInspectionSection[];
  entries: readonly MenuInspectionEntry[];
}>;

export type MenuInspection = Readonly<{
  menu: Readonly<{
    id: string;
    brandId: string;
    code: string;
    name: string;
    lifecycleStatus: Menu["lifecycleStatus"];
    revision: string;
    effectiveMenuVersionId: string | null;
    draftMenuVersionId: string | null;
  }>;
  effective: MenuInspectionVersionGraph | null;
  draft: MenuInspectionVersionGraph | null;
  draftDiffersFromEffective: boolean;
}>;

function projectSection(section: MenuSection): MenuInspectionSection {
  return {
    id: section.id,
    parentSectionId: section.parentSectionId,
    code: section.code,
    name: section.name,
    description: section.description,
    position: section.position,
    lifecycleStatus: section.lifecycleStatus,
  };
}

function projectEntry(entry: MenuEntry): MenuInspectionEntry {
  return {
    id: entry.id,
    sectionId: entry.sectionId,
    productId: entry.productId,
    displayName: entry.displayName,
    displayDescription: entry.displayDescription,
    imagePath: entry.imagePath,
    position: entry.position,
    lifecycleStatus: entry.lifecycleStatus,
  };
}

async function loadProjectedGraph(
  context: PersistenceQueryContext,
  menu: Menu,
  menuVersionId: string,
): Promise<MenuInspectionVersionGraph> {
  const graph = await loadVersionGraph(context, menuVersionId);
  const timestamps = { createdAt: menu.createdAt, updatedAt: menu.updatedAt };
  const sections = graph.sections
    .map((row) => projectSection(sectionVersionToMenuSection(row, timestamps)))
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
  const entries = graph.entries
    .map((row) => projectEntry(entryVersionToMenuEntry(row, timestamps)))
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
  return { versionId: menuVersionId, sections, entries };
}

export async function listBrandMenus(
  context: PersistenceQueryContext,
  input: Readonly<{ actor: WorkforcePrincipal; brandId: string }>,
): Promise<readonly MenuListItem[]> {
  assertApplicationRole(context, "listBrandMenus");
  const brandId = assertUuid(input.brandId, "brandId");
  await requireMenuRead(context, input.actor, brandId);

  const rows = await context.db
    .select()
    .from(menusTable)
    .where(eq(menusTable.brandId, brandId))
    .orderBy(asc(menusTable.code), asc(menusTable.id));

  return rows.map((row) => {
    const menu = rowToMenu(row);
    return {
      id: menu.id,
      code: menu.code,
      name: menu.name,
      lifecycleStatus: menu.lifecycleStatus,
      revision: menu.revision.toString(10),
      hasEffectiveVersion: menu.effectiveMenuVersionId != null,
      hasDraftVersion: menu.draftMenuVersionId != null,
    };
  });
}

export async function getBrandMenuInspection(
  context: PersistenceQueryContext,
  input: Readonly<{ actor: WorkforcePrincipal; brandId: string; menuId: string }>,
): Promise<MenuInspection> {
  assertApplicationRole(context, "getBrandMenuInspection");
  const brandId = assertUuid(input.brandId, "brandId");
  const menuId = assertUuid(input.menuId, "menuId");
  await requireMenuRead(context, input.actor, brandId);

  const rows = await context.db
    .select()
    .from(menusTable)
    .where(and(eq(menusTable.id, menuId), eq(menusTable.brandId, brandId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new MenuNotFoundError("menu");
  const menu = rowToMenu(row);

  const effective = menu.effectiveMenuVersionId
    ? await loadProjectedGraph(context, menu, menu.effectiveMenuVersionId)
    : null;
  const draft = menu.draftMenuVersionId
    ? await loadProjectedGraph(context, menu, menu.draftMenuVersionId)
    : null;

  let draftDiffersFromEffective = false;
  if (draft && effective) {
    const draftFp = materialGraphFingerprint(
      draft.sections.map((s) => ({
        sectionId: s.id,
        parentSectionId: s.parentSectionId,
        code: s.code,
        name: s.name,
        description: s.description,
        position: s.position,
        lifecycleStatus: s.lifecycleStatus,
      })),
      draft.entries.map((e) => ({
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
    const effectiveFp = materialGraphFingerprint(
      effective.sections.map((s) => ({
        sectionId: s.id,
        parentSectionId: s.parentSectionId,
        code: s.code,
        name: s.name,
        description: s.description,
        position: s.position,
        lifecycleStatus: s.lifecycleStatus,
      })),
      effective.entries.map((e) => ({
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
    draftDiffersFromEffective = draftFp !== effectiveFp;
  } else if (draft && !effective) {
    draftDiffersFromEffective = draft.sections.length > 0 || draft.entries.length > 0;
  }

  return {
    menu: {
      id: menu.id,
      brandId: menu.brandId,
      code: menu.code,
      name: menu.name,
      lifecycleStatus: menu.lifecycleStatus,
      revision: menu.revision.toString(10),
      effectiveMenuVersionId: menu.effectiveMenuVersionId,
      draftMenuVersionId: menu.draftMenuVersionId,
    },
    effective,
    draft,
    draftDiffersFromEffective,
  };
}
