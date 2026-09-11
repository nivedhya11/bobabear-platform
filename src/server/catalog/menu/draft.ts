/**
 * Menu draft graph mutation helpers (IMP-036F F3A).
 *
 * Material edits write the DRAFT MenuVersion graph and mirror legacy rows for
 * admin LWW. Customer effect requires publishMenuRevision.
 */
import { and, eq } from "drizzle-orm";

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
  beginMaterialMenuDraftMutation,
  loadDraftEntryVersion,
  loadDraftSectionVersion,
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

export async function updateMenuSection(
  context: PersistenceTransactionContext,
  input: UpdateMenuSectionInput,
): Promise<{ sectionId: string; menuRevision: bigint }> {
  assertTransactionContext(context, "updateMenuSection");
  const sectionId = assertUuid(input.sectionId, "sectionId");
  const identity = await loadSectionById(context, sectionId);
  if (!identity) throw new MenuNotFoundError("menu_section");
  const workforceUserId = actorId(input.actor);

  if (
    input.name === undefined &&
    input.description === undefined &&
    input.parentSectionId === undefined
  ) {
    throw new MenuValidationError({
      message: "updateMenuSection requires name, description, and/or parentSectionId.",
    });
  }

  const { menu, draft, expected, at } = await beginMaterialMenuDraftMutation(context, {
    actor: input.actor,
    menuId: identity.menuId,
    expectedMenuRevision: input.expectedMenuRevision,
    actorWorkforceUserId: workforceUserId,
    authorize: (brandId) => requireMenuManage(context, input.actor, brandId),
  });

  const existing = await loadDraftSectionVersion(context, draft.id, sectionId);
  if (!existing) throw new MenuNotFoundError("menu_section");

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

  const advanced = await advanceMenuRevision(context, menu, at);
  await insertMenuMutationAuditEvent(context, {
    actorWorkforceUserId: workforceUserId,
    action: "menu.section_changed",
    brandId: existing.brandId,
    menuId: existing.menuId,
    menuVersionId: draft.id,
    targetType: "menu_section",
    targetId: sectionId,
    previousMenuRevision: expected,
    newMenuRevision: advanced.revision,
  });

  return { sectionId, menuRevision: advanced.revision };
}

export async function reorderMenuSections(
  context: PersistenceTransactionContext,
  input: ReorderMenuSectionsInput,
): Promise<{ menuId: string; menuRevision: bigint }> {
  assertTransactionContext(context, "reorderMenuSections");
  const menuId = assertUuid(input.menuId, "menuId");
  const workforceUserId = actorId(input.actor);

  if (!Array.isArray(input.orderedSectionIds) || input.orderedSectionIds.length === 0) {
    throw new MenuValidationError({
      message: "orderedSectionIds must be a non-empty array.",
    });
  }

  const parentSectionId =
    input.parentSectionId === undefined || input.parentSectionId === null
      ? null
      : assertUuid(input.parentSectionId, "parentSectionId");

  const { menu, draft, expected, at } = await beginMaterialMenuDraftMutation(context, {
    actor: input.actor,
    menuId,
    expectedMenuRevision: input.expectedMenuRevision,
    actorWorkforceUserId: workforceUserId,
    authorize: (brandId) => requireMenuManage(context, input.actor, brandId),
  });

  if (parentSectionId !== null) {
    const parent = await loadDraftSectionVersion(context, draft.id, parentSectionId);
    if (!parent) throw new MenuNotFoundError("menu_section");
  }

  const draftSections = await context.db
    .select()
    .from(menuSectionVersionsTable)
    .where(eq(menuSectionVersionsTable.menuVersionId, draft.id));

  const siblings = draftSections.filter(
    (s) =>
      s.parentSectionId === parentSectionId && s.lifecycleStatus !== "retired",
  );
  const byId = new Map(siblings.map((s) => [s.sectionId, s]));

  if (input.orderedSectionIds.length !== byId.size) {
    throw new MenuValidationError({
      message:
        "orderedSectionIds must include every non-retired sibling section in the parent scope exactly once.",
    });
  }
  const seen = new Set<string>();
  for (const id of input.orderedSectionIds) {
    const sectionId = assertUuid(id, "sectionId");
    if (seen.has(sectionId)) {
      throw new MenuValidationError({
        message: "orderedSectionIds must not contain duplicates.",
      });
    }
    seen.add(sectionId);
    if (!byId.has(sectionId)) {
      throw new MenuValidationError({
        message:
          "orderedSectionIds contains a section that is not a non-retired sibling in this parent scope.",
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

  const advanced = await advanceMenuRevision(context, menu, at);
  await insertMenuMutationAuditEvent(context, {
    actorWorkforceUserId: workforceUserId,
    action: "menu.section_changed",
    brandId: menu.brandId,
    menuId,
    menuVersionId: draft.id,
    targetType: "menu",
    targetId: menuId,
    previousMenuRevision: expected,
    newMenuRevision: advanced.revision,
    metadata: {
      op: "reorder_sections",
      parentSectionId: parentSectionId ?? "",
    },
  });

  return { menuId, menuRevision: advanced.revision };
}

export async function reorderMenuEntries(
  context: PersistenceTransactionContext,
  input: ReorderMenuEntriesInput,
): Promise<{ sectionId: string; menuRevision: bigint }> {
  assertTransactionContext(context, "reorderMenuEntries");
  const sectionId = assertUuid(input.sectionId, "sectionId");
  const identity = await loadSectionById(context, sectionId);
  if (!identity) throw new MenuNotFoundError("menu_section");
  const workforceUserId = actorId(input.actor);

  if (!Array.isArray(input.orderedEntryIds) || input.orderedEntryIds.length === 0) {
    throw new MenuValidationError({
      message: "orderedEntryIds must be a non-empty array.",
    });
  }

  const { menu, draft, expected, at } = await beginMaterialMenuDraftMutation(context, {
    actor: input.actor,
    menuId: identity.menuId,
    expectedMenuRevision: input.expectedMenuRevision,
    actorWorkforceUserId: workforceUserId,
    authorize: (brandId) => requireMenuManage(context, input.actor, brandId),
  });

  const section = await loadDraftSectionVersion(context, draft.id, sectionId);
  if (!section) throw new MenuNotFoundError("menu_section");

  const draftEntries = await context.db
    .select()
    .from(menuEntryVersionsTable)
    .where(
      and(
        eq(menuEntryVersionsTable.menuVersionId, draft.id),
        eq(menuEntryVersionsTable.sectionId, sectionId),
      ),
    );
  const inSection = draftEntries.filter((e) => e.lifecycleStatus !== "retired");
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

  const advanced = await advanceMenuRevision(context, menu, at);
  await insertMenuMutationAuditEvent(context, {
    actorWorkforceUserId: workforceUserId,
    action: "menu.entry_changed",
    brandId: section.brandId,
    menuId: section.menuId,
    menuVersionId: draft.id,
    targetType: "menu_section",
    targetId: sectionId,
    previousMenuRevision: expected,
    newMenuRevision: advanced.revision,
  });

  return { sectionId, menuRevision: advanced.revision };
}

export async function moveMenuEntry(
  context: PersistenceTransactionContext,
  input: MoveMenuEntryInput,
): Promise<{ entryId: string; menuRevision: bigint }> {
  assertTransactionContext(context, "moveMenuEntry");
  const entryId = assertUuid(input.entryId, "entryId");
  const targetSectionId = assertUuid(input.targetSectionId, "targetSectionId");
  const identity = await loadEntryById(context, entryId);
  if (!identity) throw new MenuNotFoundError("menu_entry");
  const workforceUserId = actorId(input.actor);

  const { menu, draft, expected, at } = await beginMaterialMenuDraftMutation(context, {
    actor: input.actor,
    menuId: identity.menuId,
    expectedMenuRevision: input.expectedMenuRevision,
    actorWorkforceUserId: workforceUserId,
    authorize: (brandId) => requireMenuManage(context, input.actor, brandId),
  });

  const entry = await loadDraftEntryVersion(context, draft.id, entryId);
  if (!entry) throw new MenuNotFoundError("menu_entry");

  const target = await loadDraftSectionVersion(context, draft.id, targetSectionId);
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

  const advanced = await advanceMenuRevision(context, menu, at);
  await insertMenuMutationAuditEvent(context, {
    actorWorkforceUserId: workforceUserId,
    action: "menu.entry_changed",
    brandId: entry.brandId,
    menuId: entry.menuId,
    menuVersionId: draft.id,
    targetType: "menu_entry",
    targetId: entryId,
    previousMenuRevision: expected,
    newMenuRevision: advanced.revision,
  });

  return { entryId, menuRevision: advanced.revision };
}

export async function updateMenuEntryDisplay(
  context: PersistenceTransactionContext,
  input: UpdateMenuEntryDisplayInput,
): Promise<{ entryId: string; menuRevision: bigint }> {
  assertTransactionContext(context, "updateMenuEntryDisplay");
  const entryId = assertUuid(input.entryId, "entryId");
  const identity = await loadEntryById(context, entryId);
  if (!identity) throw new MenuNotFoundError("menu_entry");
  const workforceUserId = actorId(input.actor);

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

  const { menu, draft, expected, at } = await beginMaterialMenuDraftMutation(context, {
    actor: input.actor,
    menuId: identity.menuId,
    expectedMenuRevision: input.expectedMenuRevision,
    actorWorkforceUserId: workforceUserId,
    authorize: (brandId) => requireMenuManage(context, input.actor, brandId),
  });

  const entry = await loadDraftEntryVersion(context, draft.id, entryId);
  if (!entry) throw new MenuNotFoundError("menu_entry");

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

  const advanced = await advanceMenuRevision(context, menu, at);
  await insertMenuMutationAuditEvent(context, {
    actorWorkforceUserId: workforceUserId,
    action: "menu.entry_changed",
    brandId: entry.brandId,
    menuId: entry.menuId,
    menuVersionId: draft.id,
    targetType: "menu_entry",
    targetId: entryId,
    previousMenuRevision: expected,
    newMenuRevision: advanced.revision,
  });

  return { entryId, menuRevision: advanced.revision };
}
