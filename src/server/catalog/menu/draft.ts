/**
 * Menu draft graph mutation helpers (IMP-036F F3A).
 *
 * Material edits write the DRAFT MenuVersion graph and mirror legacy rows for
 * admin LWW. Customer effect requires publishMenuRevision (or first activateMenu
 * promotion when no effective pointer yet).
 */
import { eq } from "drizzle-orm";

import {
  MENU_DESCRIPTION_MAX,
  MENU_IMAGE_PATH_MAX,
  MENU_NAME_MAX,
} from "../../../shared/catalog/menu";
import {
  menuEntriesTable,
  menuEntryVersionsTable,
  menuSectionsTable,
  menuSectionVersionsTable,
} from "../../../platform/database/schema/menu";
import { requireWorkforcePrincipal } from "../../access-control/principal";
import type { PersistenceTransactionContext } from "../../persistence/types";
import {
  assertNonNegativeInt,
  assertTransactionContext,
  normalizeName,
  normalizeOptionalDescription,
} from "../assert-role";
import { assertUuid } from "../lifecycle";
import { insertMenuMutationAuditEvent } from "./audit";
import { requireMenuManage } from "./authorize-menu";
import { MenuNotFoundError, MenuValidationError } from "./errors";
import type {
  MoveMenuEntryInput,
  ReorderMenuEntriesInput,
  ReorderMenuSectionsInput,
  UpdateMenuEntryDisplayInput,
  UpdateMenuSectionInput,
} from "./types";
import {
  advanceMenuRevision,
  ensureDraftMenuVersion,
  lockMenuForUpdate,
  upsertDraftEntryVersion,
  upsertDraftSectionVersion,
} from "./versions";
import {
  assertSectionDepthAllowed,
  loadEntryById,
  loadSectionById,
} from "./validation";

function actorId(actor: unknown): string {
  return requireWorkforcePrincipal(actor).workforceUserId;
}

function normalizeOptionalImagePath(
  value: string | null | undefined,
  field: string,
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new MenuValidationError({ message: `${field} must be a string or null.` });
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (
    trimmed.length > MENU_IMAGE_PATH_MAX ||
    !trimmed.startsWith("/") ||
    trimmed.includes("..") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    throw new MenuValidationError({
      message: `${field} must be a local public path without .. or remote schemes.`,
    });
  }
  return trimmed;
}

async function afterMaterialDraftChange(
  context: PersistenceTransactionContext,
  input: Readonly<{
    menuId: string;
    brandId: string;
    actorWorkforceUserId: string;
    action: "menu.section_changed" | "menu.entry_changed";
    targetType: string;
    targetId: string;
    menuVersionId: string;
    previousRevision: bigint;
    at: Date;
  }>,
): Promise<bigint> {
  const locked = await lockMenuForUpdate(context, input.menuId);
  const advanced = await advanceMenuRevision(context, locked, input.at);
  await insertMenuMutationAuditEvent(context, {
    actorWorkforceUserId: input.actorWorkforceUserId,
    action: input.action,
    brandId: input.brandId,
    menuId: input.menuId,
    menuVersionId: input.menuVersionId,
    targetType: input.targetType,
    targetId: input.targetId,
    previousMenuRevision: input.previousRevision,
    newMenuRevision: advanced.revision,
  });
  return advanced.revision;
}

export async function updateMenuSection(
  context: PersistenceTransactionContext,
  input: UpdateMenuSectionInput,
): Promise<{ sectionId: string; menuRevision: bigint }> {
  assertTransactionContext(context, "updateMenuSection");
  const sectionId = assertUuid(input.sectionId, "sectionId");
  const existing = await loadSectionById(context, sectionId);
  if (!existing) throw new MenuNotFoundError("menu_section");
  await requireMenuManage(context, input.actor, existing.brandId);

  if (
    input.name === undefined &&
    input.description === undefined &&
    input.parentSectionId === undefined
  ) {
    throw new MenuValidationError({
      message: "updateMenuSection requires name, description, and/or parentSectionId.",
    });
  }

  const parentSectionId =
    input.parentSectionId === undefined
      ? existing.parentSectionId
      : input.parentSectionId === null
        ? null
        : assertUuid(input.parentSectionId, "parentSectionId");

  await assertSectionDepthAllowed(context, {
    menuId: existing.menuId,
    brandId: existing.brandId,
    parentSectionId,
    sectionId,
  });

  const name =
    input.name !== undefined
      ? normalizeName(input.name, "name", MENU_NAME_MAX.section)
      : existing.name;
  const description =
    input.description !== undefined
      ? normalizeOptionalDescription(
          input.description,
          "description",
          MENU_DESCRIPTION_MAX.section,
        )
      : existing.description;

  const at = new Date();
  const workforceUserId = actorId(input.actor);
  const { menu, draft } = await ensureDraftMenuVersion(context, {
    menuId: existing.menuId,
    actorWorkforceUserId: workforceUserId,
    at,
  });

  await upsertDraftSectionVersion(context, {
    menuVersionId: draft.id,
    menuId: existing.menuId,
    brandId: existing.brandId,
    sectionId,
    parentSectionId,
    code: existing.code,
    name,
    description,
    position: existing.position,
    lifecycleStatus: existing.lifecycleStatus,
  });

  await context.db
    .update(menuSectionsTable)
    .set({
      parentSectionId,
      name,
      description,
      updatedAt: at,
    })
    .where(eq(menuSectionsTable.id, sectionId));

  const menuRevision = await afterMaterialDraftChange(context, {
    menuId: existing.menuId,
    brandId: existing.brandId,
    actorWorkforceUserId: workforceUserId,
    action: "menu.section_changed",
    targetType: "menu_section",
    targetId: sectionId,
    menuVersionId: draft.id,
    previousRevision: menu.revision,
    at,
  });

  return { sectionId, menuRevision };
}

export async function reorderMenuSections(
  context: PersistenceTransactionContext,
  input: ReorderMenuSectionsInput,
): Promise<{ menuId: string; menuRevision: bigint }> {
  assertTransactionContext(context, "reorderMenuSections");
  const menuId = assertUuid(input.menuId, "menuId");
  const menuLocked = await lockMenuForUpdate(context, menuId);
  await requireMenuManage(context, input.actor, menuLocked.brandId);

  if (!Array.isArray(input.orderedSectionIds) || input.orderedSectionIds.length === 0) {
    throw new MenuValidationError({
      message: "orderedSectionIds must be a non-empty array.",
    });
  }

  const at = new Date();
  const workforceUserId = actorId(input.actor);
  const { menu, draft } = await ensureDraftMenuVersion(context, {
    menuId,
    actorWorkforceUserId: workforceUserId,
    at,
  });

  const draftSections = await context.db
    .select()
    .from(menuSectionVersionsTable)
    .where(eq(menuSectionVersionsTable.menuVersionId, draft.id));
  const byId = new Map(draftSections.map((s) => [s.sectionId, s]));

  if (input.orderedSectionIds.length !== byId.size) {
    throw new MenuValidationError({
      message: "orderedSectionIds must include every section in the draft graph exactly once.",
    });
  }
  for (const id of input.orderedSectionIds) {
    if (!byId.has(assertUuid(id, "sectionId"))) {
      throw new MenuValidationError({
        message: "orderedSectionIds contains an unknown section for this menu draft.",
      });
    }
  }

  for (let position = 0; position < input.orderedSectionIds.length; position += 1) {
    const sectionId = input.orderedSectionIds[position]!;
    const row = byId.get(sectionId)!;
    await context.db
      .update(menuSectionVersionsTable)
      .set({ position })
      .where(eq(menuSectionVersionsTable.id, row.id));
    await context.db
      .update(menuSectionsTable)
      .set({ position, updatedAt: at })
      .where(eq(menuSectionsTable.id, sectionId));
  }

  const menuRevision = await afterMaterialDraftChange(context, {
    menuId,
    brandId: menu.brandId,
    actorWorkforceUserId: workforceUserId,
    action: "menu.section_changed",
    targetType: "menu",
    targetId: menuId,
    menuVersionId: draft.id,
    previousRevision: menu.revision,
    at,
  });

  return { menuId, menuRevision };
}

export async function reorderMenuEntries(
  context: PersistenceTransactionContext,
  input: ReorderMenuEntriesInput,
): Promise<{ sectionId: string; menuRevision: bigint }> {
  assertTransactionContext(context, "reorderMenuEntries");
  const sectionId = assertUuid(input.sectionId, "sectionId");
  const section = await loadSectionById(context, sectionId);
  if (!section) throw new MenuNotFoundError("menu_section");
  await requireMenuManage(context, input.actor, section.brandId);

  if (!Array.isArray(input.orderedEntryIds) || input.orderedEntryIds.length === 0) {
    throw new MenuValidationError({
      message: "orderedEntryIds must be a non-empty array.",
    });
  }

  const at = new Date();
  const workforceUserId = actorId(input.actor);
  const { menu, draft } = await ensureDraftMenuVersion(context, {
    menuId: section.menuId,
    actorWorkforceUserId: workforceUserId,
    at,
  });

  const draftEntries = await context.db
    .select()
    .from(menuEntryVersionsTable)
    .where(eq(menuEntryVersionsTable.menuVersionId, draft.id));
  const inSection = draftEntries.filter(
    (e) => e.sectionId === sectionId && e.lifecycleStatus !== "retired",
  );
  const byId = new Map(inSection.map((e) => [e.entryId, e]));

  if (input.orderedEntryIds.length !== byId.size) {
    throw new MenuValidationError({
      message:
        "orderedEntryIds must include every non-retired entry in the section exactly once.",
    });
  }
  for (const id of input.orderedEntryIds) {
    if (!byId.has(assertUuid(id, "entryId"))) {
      throw new MenuValidationError({
        message: "orderedEntryIds contains an unknown entry for this section draft.",
      });
    }
  }

  for (let position = 0; position < input.orderedEntryIds.length; position += 1) {
    const entryId = input.orderedEntryIds[position]!;
    const row = byId.get(entryId)!;
    await context.db
      .update(menuEntryVersionsTable)
      .set({ position })
      .where(eq(menuEntryVersionsTable.id, row.id));
    await context.db
      .update(menuEntriesTable)
      .set({ position, updatedAt: at })
      .where(eq(menuEntriesTable.id, entryId));
  }

  const menuRevision = await afterMaterialDraftChange(context, {
    menuId: section.menuId,
    brandId: section.brandId,
    actorWorkforceUserId: workforceUserId,
    action: "menu.entry_changed",
    targetType: "menu_section",
    targetId: sectionId,
    menuVersionId: draft.id,
    previousRevision: menu.revision,
    at,
  });

  return { sectionId, menuRevision };
}

export async function moveMenuEntry(
  context: PersistenceTransactionContext,
  input: MoveMenuEntryInput,
): Promise<{ entryId: string; menuRevision: bigint }> {
  assertTransactionContext(context, "moveMenuEntry");
  const entryId = assertUuid(input.entryId, "entryId");
  const targetSectionId = assertUuid(input.targetSectionId, "targetSectionId");
  const entry = await loadEntryById(context, entryId);
  if (!entry) throw new MenuNotFoundError("menu_entry");
  await requireMenuManage(context, input.actor, entry.brandId);

  const target = await loadSectionById(context, targetSectionId);
  if (!target) throw new MenuNotFoundError("menu_section");
  if (target.menuId !== entry.menuId || target.brandId !== entry.brandId) {
    throw new MenuValidationError({
      message: "Target section must belong to the same brand and menu.",
    });
  }

  const position =
    input.position === undefined
      ? entry.position
      : assertNonNegativeInt(input.position, "position");

  const at = new Date();
  const workforceUserId = actorId(input.actor);
  const { menu, draft } = await ensureDraftMenuVersion(context, {
    menuId: entry.menuId,
    actorWorkforceUserId: workforceUserId,
    at,
  });

  await upsertDraftEntryVersion(context, {
    menuVersionId: draft.id,
    menuId: entry.menuId,
    brandId: entry.brandId,
    entryId,
    sectionId: targetSectionId,
    productId: entry.productId,
    displayName: entry.displayName,
    displayDescription: entry.displayDescription,
    imagePath: entry.imagePath,
    position,
    lifecycleStatus: entry.lifecycleStatus,
  });

  await context.db
    .update(menuEntriesTable)
    .set({ sectionId: targetSectionId, position, updatedAt: at })
    .where(eq(menuEntriesTable.id, entryId));

  const menuRevision = await afterMaterialDraftChange(context, {
    menuId: entry.menuId,
    brandId: entry.brandId,
    actorWorkforceUserId: workforceUserId,
    action: "menu.entry_changed",
    targetType: "menu_entry",
    targetId: entryId,
    menuVersionId: draft.id,
    previousRevision: menu.revision,
    at,
  });

  return { entryId, menuRevision };
}

export async function updateMenuEntryDisplay(
  context: PersistenceTransactionContext,
  input: UpdateMenuEntryDisplayInput,
): Promise<{ entryId: string; menuRevision: bigint }> {
  assertTransactionContext(context, "updateMenuEntryDisplay");
  const entryId = assertUuid(input.entryId, "entryId");
  const entry = await loadEntryById(context, entryId);
  if (!entry) throw new MenuNotFoundError("menu_entry");
  await requireMenuManage(context, input.actor, entry.brandId);

  if (
    input.displayName === undefined &&
    input.displayDescription === undefined &&
    input.imagePath === undefined
  ) {
    throw new MenuValidationError({
      message:
        "updateMenuEntryDisplay requires displayName, displayDescription, and/or imagePath.",
    });
  }

  const displayName =
    input.displayName === undefined
      ? entry.displayName
      : input.displayName === null
        ? null
        : normalizeName(input.displayName, "displayName", MENU_NAME_MAX.entryDisplayName);
  const displayDescription =
    input.displayDescription === undefined
      ? entry.displayDescription
      : normalizeOptionalDescription(
          input.displayDescription,
          "displayDescription",
          MENU_DESCRIPTION_MAX.entryDisplayDescription,
        );
  const imagePath =
    input.imagePath === undefined
      ? entry.imagePath
      : normalizeOptionalImagePath(input.imagePath, "imagePath");

  const at = new Date();
  const workforceUserId = actorId(input.actor);
  const { menu, draft } = await ensureDraftMenuVersion(context, {
    menuId: entry.menuId,
    actorWorkforceUserId: workforceUserId,
    at,
  });

  await upsertDraftEntryVersion(context, {
    menuVersionId: draft.id,
    menuId: entry.menuId,
    brandId: entry.brandId,
    entryId,
    sectionId: entry.sectionId,
    productId: entry.productId,
    displayName,
    displayDescription,
    imagePath,
    position: entry.position,
    lifecycleStatus: entry.lifecycleStatus,
  });

  await context.db
    .update(menuEntriesTable)
    .set({
      displayName,
      displayDescription,
      imagePath,
      updatedAt: at,
    })
    .where(eq(menuEntriesTable.id, entryId));

  const menuRevision = await afterMaterialDraftChange(context, {
    menuId: entry.menuId,
    brandId: entry.brandId,
    actorWorkforceUserId: workforceUserId,
    action: "menu.entry_changed",
    targetType: "menu_entry",
    targetId: entryId,
    menuVersionId: draft.id,
    previousRevision: menu.revision,
    at,
  });

  return { entryId, menuRevision };
}
