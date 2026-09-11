/**
 * Menu commands (IMP-013 / IMP-036F F3A).
 */
import { randomUUID } from "node:crypto";

import { and, eq, ne } from "drizzle-orm";

import {
  MENU_NAME_MAX,
  type MenuLifecycleStatus,
} from "../../../shared/catalog/menu";
import { menusTable, menuVersionsTable } from "../../../platform/database/schema/menu";
import { requireWorkforcePrincipal } from "../../access-control/principal";
import type { PersistenceQueryContext, PersistenceTransactionContext } from "../../persistence/types";
import {
  assertTransactionContext,
  isUniqueViolation,
  normalizeCatalogCode,
  normalizeName,
} from "../assert-role";
import {
  activationTimestamps,
  assertCanTransition,
  assertUuid,
  retirementTimestamps,
} from "../lifecycle";
import { insertMenuMutationAuditEvent } from "./audit";
import { requireMenuManage } from "./authorize-menu";
import { MenuConflictError, MenuInvalidStateError, MenuNotFoundError } from "./errors";
import type { CreateMenuInput, Menu, MenuLifecycleInput } from "./types";
import {
  assertMenuGraphReady,
  assertNoActiveSectionsForMenu,
  loadMenuById,
} from "./validation";
import {
  ensureDraftMenuVersion,
  lockMenuForUpdate,
  lockMenuVersionForUpdate,
  rowToMenu,
} from "./versions";

function actorId(actor: unknown): string {
  return requireWorkforcePrincipal(actor).workforceUserId;
}

export async function findMenuById(
  context: PersistenceQueryContext,
  menuId: string,
): Promise<Menu | null> {
  return loadMenuById(context, menuId);
}

export async function createMenu(
  context: PersistenceTransactionContext,
  input: CreateMenuInput,
): Promise<Menu> {
  assertTransactionContext(context, "createMenu");
  await requireMenuManage(context, input.actor, input.brandId);

  const code = normalizeCatalogCode(input.code, "code");
  const name = normalizeName(input.name, "name", MENU_NAME_MAX.menu);
  const brandId = assertUuid(input.brandId, "brandId");
  const id = input.id ? assertUuid(input.id, "id") : randomUUID();
  const now = new Date();

  try {
    await context.db.insert(menusTable).values({
      id,
      brandId,
      code,
      name,
      lifecycleStatus: "draft",
      revision: BigInt(1),
      effectiveMenuVersionId: null,
      draftMenuVersionId: null,
      createdAt: now,
      updatedAt: now,
      activatedAt: null,
      retiredAt: null,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new MenuConflictError({ message: "Menu code already exists for this brand." });
    }
    throw error;
  }

  const created = await findMenuById(context, id);
  if (!created) throw new MenuNotFoundError("menu");
  return created;
}

/**
 * Activate Menu aggregate lifecycle with exclusive one-active-per-brand.
 * When no effective version yet, promotes the current DRAFT version to EFFECTIVE.
 * Does not toggle Menu lifecycle on subsequent publishMenuRevision calls.
 */
export async function activateMenu(
  context: PersistenceTransactionContext,
  input: MenuLifecycleInput,
): Promise<Menu> {
  assertTransactionContext(context, "activateMenu");
  const menuId = assertUuid(input.menuId, "menuId");
  const workforceUserId = actorId(input.actor);
  let menu = await lockMenuForUpdate(context, menuId);
  await requireMenuManage(context, input.actor, menu.brandId);

  assertCanTransition(menu.lifecycleStatus, "active");
  const stamps = activationTimestamps();
  const now = stamps.updatedAt;

  // Exclusive activate: retire other brand actives (one-effective customer boundary).
  const otherActives = await context.db
    .select()
    .from(menusTable)
    .where(
      and(
        eq(menusTable.brandId, menu.brandId),
        eq(menusTable.lifecycleStatus, "active"),
        ne(menusTable.id, menuId),
      ),
    )
    .for("update");

  for (const other of otherActives) {
    const retireStamps = retirementTimestamps(
      other.lifecycleStatus as MenuLifecycleStatus,
      other.activatedAt,
    );
    await context.db
      .update(menusTable)
      .set({
        lifecycleStatus: retireStamps.lifecycleStatus,
        activatedAt: retireStamps.activatedAt,
        retiredAt: retireStamps.retiredAt,
        updatedAt: retireStamps.updatedAt,
      })
      .where(eq(menusTable.id, other.id));
  }

  // Ensure a draft graph exists, then promote to EFFECTIVE if needed.
  const ensured = await ensureDraftMenuVersion(context, {
    menuId,
    actorWorkforceUserId: workforceUserId,
    at: now,
  });
  menu = ensured.menu;
  const candidate = ensured.draft;

  await assertMenuGraphReady(context, menuId, { menuVersionId: candidate.id });

  if (menu.effectiveMenuVersionId == null) {
    const priorEffective = await context.db
      .select()
      .from(menuVersionsTable)
      .where(
        and(
          eq(menuVersionsTable.menuId, menuId),
          eq(menuVersionsTable.lifecycleStatus, "EFFECTIVE"),
        ),
      )
      .for("update");
    for (const prior of priorEffective) {
      await context.db
        .update(menuVersionsTable)
        .set({ lifecycleStatus: "SUPERSEDED", supersededAt: now })
        .where(eq(menuVersionsTable.id, prior.id));
    }

    await context.db
      .update(menuVersionsTable)
      .set({
        lifecycleStatus: "EFFECTIVE",
        effectiveAt: now,
        supersededAt: null,
      })
      .where(eq(menuVersionsTable.id, candidate.id));

    await context.db
      .update(menusTable)
      .set({
        lifecycleStatus: stamps.lifecycleStatus,
        activatedAt: stamps.activatedAt,
        retiredAt: stamps.retiredAt,
        updatedAt: now,
        effectiveMenuVersionId: candidate.id,
        draftMenuVersionId: null,
      })
      .where(eq(menusTable.id, menuId));

    await insertMenuMutationAuditEvent(context, {
      actorWorkforceUserId: workforceUserId,
      action: "menu.published",
      brandId: menu.brandId,
      menuId,
      menuVersionId: candidate.id,
      targetType: "menu",
      targetId: menuId,
      previousMenuRevision: menu.revision,
      newMenuRevision: menu.revision,
      metadata: { via: "activateMenu", firstEffective: true },
    });
  } else {
    // Menu already has effective pointer — only flip aggregate lifecycle.
    // Ensure draft remains for further authoring; do not switch effective here.
    await lockMenuVersionForUpdate(context, menu.effectiveMenuVersionId);
    await context.db
      .update(menusTable)
      .set({
        lifecycleStatus: stamps.lifecycleStatus,
        activatedAt: stamps.activatedAt,
        retiredAt: stamps.retiredAt,
        updatedAt: now,
      })
      .where(eq(menusTable.id, menuId));
  }

  const updated = await findMenuById(context, menuId);
  if (!updated) throw new MenuNotFoundError("menu");
  if (updated.effectiveMenuVersionId == null) {
    throw new MenuInvalidStateError({
      message: "Activated menu must have an effective MenuVersion pointer.",
    });
  }
  return updated;
}

export async function retireMenu(
  context: PersistenceTransactionContext,
  input: MenuLifecycleInput,
): Promise<Menu> {
  assertTransactionContext(context, "retireMenu");
  const menuId = assertUuid(input.menuId, "menuId");
  const existing = await findMenuById(context, menuId);
  if (!existing) throw new MenuNotFoundError("menu");
  await requireMenuManage(context, input.actor, existing.brandId);

  assertCanTransition(existing.lifecycleStatus, "retired");
  await assertNoActiveSectionsForMenu(context, menuId);

  const stamps = retirementTimestamps(
    existing.lifecycleStatus as MenuLifecycleStatus,
    existing.activatedAt,
  );
  await context.db
    .update(menusTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
    })
    .where(eq(menusTable.id, menuId));

  const updated = await findMenuById(context, menuId);
  if (!updated) throw new MenuNotFoundError("menu");
  return updated;
}

export { rowToMenu };
