/**
 * Menu section commands (IMP-013 / IMP-036F F3A).
 *
 * Material graph edits route through DRAFT MenuVersion authority and mirror
 * legacy rows for admin LWW. Aggregate CAS via expectedMenuRevision.
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
import type { CreateMenuSectionInput, MenuSection, MenuSectionLifecycleInput } from "./types";
import {
  assertNoActiveChildrenForSection,
  assertNoActiveEntriesForSection,
  assertSectionDepthAllowed,
  loadSectionById,
} from "./validation";
import {
  advanceMenuRevision,
  beginMaterialMenuDraftMutation,
  loadDraftSectionVersion,
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
  const menuId = assertUuid(input.menuId, "menuId");
  const brandId = assertUuid(input.brandId, "brandId");
  const workforceUserId = actorId(input.actor);

  const { menu, draft, expected, at } = await beginMaterialMenuDraftMutation(context, {
    actor: input.actor,
    menuId,
    expectedMenuRevision: input.expectedMenuRevision,
    actorWorkforceUserId: workforceUserId,
    authorize: async (lockedBrandId) => {
      await requireMenuManage(context, input.actor, lockedBrandId);
      if (lockedBrandId !== brandId) {
        throw new MenuValidationError({ message: "Section brandId must match the menu brand." });
      }
    },
  });

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
    const parent = await loadDraftSectionVersion(context, draft.id, parentSectionId);
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
      createdAt: at,
      updatedAt: at,
      activatedAt: null,
      retiredAt: null,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new MenuConflictError({ message: "Menu section code already exists for this menu." });
    }
    throw error;
  }

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

  const advanced = await advanceMenuRevision(context, menu, at);

  await insertMenuMutationAuditEvent(context, {
    actorWorkforceUserId: workforceUserId,
    action: "menu.section_changed",
    brandId,
    menuId,
    menuVersionId: draft.id,
    targetType: "menu_section",
    targetId: id,
    previousMenuRevision: expected,
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
  const identity = await findMenuSectionById(context, sectionId);
  if (!identity) throw new MenuNotFoundError("menu_section");
  const workforceUserId = actorId(input.actor);

  const { menu, draft, expected } = await beginMaterialMenuDraftMutation(context, {
    actor: input.actor,
    menuId: identity.menuId,
    expectedMenuRevision: input.expectedMenuRevision,
    actorWorkforceUserId: workforceUserId,
    authorize: (brandId) => requireMenuManage(context, input.actor, brandId),
  });

  const existing = await loadDraftSectionVersion(context, draft.id, sectionId);
  if (!existing) throw new MenuNotFoundError("menu_section");

  if (existing.parentSectionId !== null) {
    const parent = await loadDraftSectionVersion(context, draft.id, existing.parentSectionId);
    if (!parent || parent.lifecycleStatus !== "active") {
      throw new MenuValidationError({
        message: "Cannot activate a child section unless its parent is active.",
      });
    }
  }

  assertCanTransition(existing.lifecycleStatus as MenuLifecycleStatus, "active");
  const stamps = activationTimestamps();

  await context.db
    .update(menuSectionsTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
    })
    .where(eq(menuSectionsTable.id, sectionId));

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

  const advanced = await advanceMenuRevision(context, menu, stamps.updatedAt);

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
  const identity = await findMenuSectionById(context, sectionId);
  if (!identity) throw new MenuNotFoundError("menu_section");
  const workforceUserId = actorId(input.actor);

  const { menu, draft, expected } = await beginMaterialMenuDraftMutation(context, {
    actor: input.actor,
    menuId: identity.menuId,
    expectedMenuRevision: input.expectedMenuRevision,
    actorWorkforceUserId: workforceUserId,
    authorize: (brandId) => requireMenuManage(context, input.actor, brandId),
  });

  const existing = await loadDraftSectionVersion(context, draft.id, sectionId);
  if (!existing) throw new MenuNotFoundError("menu_section");

  assertCanTransition(existing.lifecycleStatus as MenuLifecycleStatus, "retired");
  await assertNoActiveChildrenForSection(context, sectionId);
  await assertNoActiveEntriesForSection(context, sectionId);

  const stamps = retirementTimestamps(
    existing.lifecycleStatus as MenuLifecycleStatus,
    identity.activatedAt,
  );

  await context.db
    .update(menuSectionsTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
    })
    .where(eq(menuSectionsTable.id, sectionId));

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

  const advanced = await advanceMenuRevision(context, menu, stamps.updatedAt);

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
    metadata: { op: "retire" },
  });

  const updated = await findMenuSectionById(context, sectionId);
  if (!updated) throw new MenuNotFoundError("menu_section");
  return updated;
}
