/**
 * Menu section commands (IMP-013 / IMP-036F F3A).
 *
 * Material graph edits route through DRAFT MenuVersion authority and mirror
 * legacy rows for admin LWW.
 */
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import {
  MENU_DESCRIPTION_MAX,
  MENU_NAME_MAX,
  type MenuLifecycleStatus,
} from "../../../shared/catalog/menu";
import { menuSectionsTable } from "../../../platform/database/schema/menu";
import { requireWorkforcePrincipal } from "../../access-control/principal";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../../persistence/types";
import {
  assertNonNegativeInt,
  assertTransactionContext,
  isUniqueViolation,
  normalizeCatalogCode,
  normalizeName,
  normalizeOptionalDescription,
} from "../assert-role";
import {
  activationTimestamps,
  assertCanTransition,
  assertUuid,
  retirementTimestamps,
} from "../lifecycle";
import { insertMenuMutationAuditEvent } from "./audit";
import { requireMenuManage } from "./authorize-menu";
import { MenuConflictError, MenuNotFoundError, MenuValidationError } from "./errors";
import { findMenuById } from "./menus";
import type { CreateMenuSectionInput, MenuSection, MenuSectionLifecycleInput } from "./types";
import {
  assertNoActiveChildrenForSection,
  assertNoActiveEntriesForSection,
  assertSectionDepthAllowed,
  loadSectionById,
} from "./validation";
import {
  advanceMenuRevision,
  ensureDraftMenuVersion,
  lockMenuForUpdate,
  upsertDraftSectionVersion,
} from "./versions";

function actorId(actor: unknown): string {
  return requireWorkforcePrincipal(actor).workforceUserId;
}

export async function findMenuSectionById(
  context: PersistenceQueryContext,
  sectionId: string,
): Promise<MenuSection | null> {
  return loadSectionById(context, sectionId);
}

export async function createMenuSection(
  context: PersistenceTransactionContext,
  input: CreateMenuSectionInput,
): Promise<MenuSection> {
  assertTransactionContext(context, "createMenuSection");
  await requireMenuManage(context, input.actor, input.brandId);

  const menuId = assertUuid(input.menuId, "menuId");
  const brandId = assertUuid(input.brandId, "brandId");
  const menu = await findMenuById(context, menuId);
  if (!menu) throw new MenuNotFoundError("menu");
  if (menu.brandId !== brandId) {
    throw new MenuValidationError({ message: "Section brandId must match the menu brand." });
  }

  const parentSectionId =
    input.parentSectionId === undefined || input.parentSectionId === null
      ? null
      : assertUuid(input.parentSectionId, "parentSectionId");

  await assertSectionDepthAllowed(context, {
    menuId,
    brandId,
    parentSectionId,
  });

  if (parentSectionId !== null) {
    const parent = await findMenuSectionById(context, parentSectionId);
    if (!parent) throw new MenuNotFoundError("menu_section");
    if (parent.menuId !== menuId || parent.brandId !== brandId) {
      throw new MenuValidationError({
        message: "Parent section must belong to the same brand and menu.",
      });
    }
  }

  const code = normalizeCatalogCode(input.code, "code");
  const name = normalizeName(input.name, "name", MENU_NAME_MAX.section);
  const description = normalizeOptionalDescription(
    input.description,
    "description",
    MENU_DESCRIPTION_MAX.section,
  );
  const position = assertNonNegativeInt(input.position ?? 0, "position");
  const id = input.id ? assertUuid(input.id, "id") : randomUUID();
  const now = new Date();
  const workforceUserId = actorId(input.actor);

  try {
    await context.db.insert(menuSectionsTable).values({
      id,
      brandId,
      menuId,
      parentSectionId,
      code,
      name,
      description,
      position,
      lifecycleStatus: "draft",
      createdAt: now,
      updatedAt: now,
      activatedAt: null,
      retiredAt: null,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new MenuConflictError({ message: "Menu section code already exists for this menu." });
    }
    throw error;
  }

  const { menu: lockedMenu, draft } = await ensureDraftMenuVersion(context, {
    menuId,
    actorWorkforceUserId: workforceUserId,
    at: now,
  });

  await upsertDraftSectionVersion(context, {
    menuVersionId: draft.id,
    menuId,
    brandId,
    sectionId: id,
    parentSectionId,
    code,
    name,
    description,
    position,
    lifecycleStatus: "draft",
  });

  const advanced = await advanceMenuRevision(
    context,
    await lockMenuForUpdate(context, menuId),
    now,
  );

  await insertMenuMutationAuditEvent(context, {
    actorWorkforceUserId: workforceUserId,
    action: "menu.section_changed",
    brandId,
    menuId,
    menuVersionId: draft.id,
    targetType: "menu_section",
    targetId: id,
    previousMenuRevision: lockedMenu.revision,
    newMenuRevision: advanced.revision,
    metadata: { op: "create" },
  });

  const created = await findMenuSectionById(context, id);
  if (!created) throw new MenuNotFoundError("menu_section");
  return created;
}

export async function activateMenuSection(
  context: PersistenceTransactionContext,
  input: MenuSectionLifecycleInput,
): Promise<MenuSection> {
  assertTransactionContext(context, "activateMenuSection");
  const sectionId = assertUuid(input.sectionId, "sectionId");
  const existing = await findMenuSectionById(context, sectionId);
  if (!existing) throw new MenuNotFoundError("menu_section");
  await requireMenuManage(context, input.actor, existing.brandId);

  const menu = await findMenuById(context, existing.menuId);
  if (!menu) throw new MenuNotFoundError("menu");

  // Version-graph authoring: parent must be active in legacy mirror (admin LWW).
  // Menu aggregate need not be active when staging the first draft graph.
  if (existing.parentSectionId !== null) {
    const parent = await findMenuSectionById(context, existing.parentSectionId);
    if (!parent || parent.lifecycleStatus !== "active") {
      throw new MenuValidationError({
        message: "Cannot activate a child section unless its parent is active.",
      });
    }
  }

  assertCanTransition(existing.lifecycleStatus, "active");
  const stamps = activationTimestamps();
  const workforceUserId = actorId(input.actor);

  await context.db
    .update(menuSectionsTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
    })
    .where(eq(menuSectionsTable.id, sectionId));

  const { menu: lockedMenu, draft } = await ensureDraftMenuVersion(context, {
    menuId: existing.menuId,
    actorWorkforceUserId: workforceUserId,
    at: stamps.updatedAt,
  });

  await upsertDraftSectionVersion(context, {
    menuVersionId: draft.id,
    menuId: existing.menuId,
    brandId: existing.brandId,
    sectionId,
    parentSectionId: existing.parentSectionId,
    code: existing.code,
    name: existing.name,
    description: existing.description,
    position: existing.position,
    lifecycleStatus: "active",
  });

  // When menu already has an effective pointer, draft-only change advances revision.
  // Pre-first-effective staging also advances so reviews stay coherent.
  const advanced = await advanceMenuRevision(
    context,
    await lockMenuForUpdate(context, existing.menuId),
    stamps.updatedAt,
  );

  await insertMenuMutationAuditEvent(context, {
    actorWorkforceUserId: workforceUserId,
    action: "menu.section_changed",
    brandId: existing.brandId,
    menuId: existing.menuId,
    menuVersionId: draft.id,
    targetType: "menu_section",
    targetId: sectionId,
    previousMenuRevision: lockedMenu.revision,
    newMenuRevision: advanced.revision,
    metadata: { op: "activate" },
  });

  const updated = await findMenuSectionById(context, sectionId);
  if (!updated) throw new MenuNotFoundError("menu_section");
  return updated;
}

export async function retireMenuSection(
  context: PersistenceTransactionContext,
  input: MenuSectionLifecycleInput,
): Promise<MenuSection> {
  assertTransactionContext(context, "retireMenuSection");
  const sectionId = assertUuid(input.sectionId, "sectionId");
  const existing = await findMenuSectionById(context, sectionId);
  if (!existing) throw new MenuNotFoundError("menu_section");
  await requireMenuManage(context, input.actor, existing.brandId);

  assertCanTransition(existing.lifecycleStatus, "retired");
  await assertNoActiveChildrenForSection(context, sectionId);
  await assertNoActiveEntriesForSection(context, sectionId);

  const stamps = retirementTimestamps(
    existing.lifecycleStatus as MenuLifecycleStatus,
    existing.activatedAt,
  );
  const workforceUserId = actorId(input.actor);

  await context.db
    .update(menuSectionsTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
    })
    .where(eq(menuSectionsTable.id, sectionId));

  const { menu: lockedMenu, draft } = await ensureDraftMenuVersion(context, {
    menuId: existing.menuId,
    actorWorkforceUserId: workforceUserId,
    at: stamps.updatedAt,
  });

  await upsertDraftSectionVersion(context, {
    menuVersionId: draft.id,
    menuId: existing.menuId,
    brandId: existing.brandId,
    sectionId,
    parentSectionId: existing.parentSectionId,
    code: existing.code,
    name: existing.name,
    description: existing.description,
    position: existing.position,
    lifecycleStatus: "retired",
  });

  const advanced = await advanceMenuRevision(
    context,
    await lockMenuForUpdate(context, existing.menuId),
    stamps.updatedAt,
  );

  await insertMenuMutationAuditEvent(context, {
    actorWorkforceUserId: workforceUserId,
    action: "menu.section_changed",
    brandId: existing.brandId,
    menuId: existing.menuId,
    menuVersionId: draft.id,
    targetType: "menu_section",
    targetId: sectionId,
    previousMenuRevision: lockedMenu.revision,
    newMenuRevision: advanced.revision,
    metadata: { op: "retire" },
  });

  const updated = await findMenuSectionById(context, sectionId);
  if (!updated) throw new MenuNotFoundError("menu_section");
  return updated;
}
