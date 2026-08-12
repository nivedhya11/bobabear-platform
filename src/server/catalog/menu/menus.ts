/**
 * Menu commands (IMP-013).
 */
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import {
  MENU_NAME_MAX,
  type MenuLifecycleStatus,
} from "../../../shared/catalog/menu";
import { menusTable } from "../../../platform/database/schema/menu";
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
import { requireMenuManage } from "./authorize-menu";
import { MenuConflictError, MenuNotFoundError } from "./errors";
import type { CreateMenuInput, Menu, MenuLifecycleInput } from "./types";
import {
  assertMenuGraphReady,
  assertNoActiveSectionsForMenu,
  loadMenuById,
  rowToMenu,
} from "./validation";

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

export async function activateMenu(
  context: PersistenceTransactionContext,
  input: MenuLifecycleInput,
): Promise<Menu> {
  assertTransactionContext(context, "activateMenu");
  const menuId = assertUuid(input.menuId, "menuId");
  const existing = await findMenuById(context, menuId);
  if (!existing) throw new MenuNotFoundError("menu");
  await requireMenuManage(context, input.actor, existing.brandId);

  assertCanTransition(existing.lifecycleStatus, "active");
  const stamps = activationTimestamps();
  await context.db
    .update(menusTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
    })
    .where(eq(menusTable.id, menuId));

  await assertMenuGraphReady(context, menuId);

  const updated = await findMenuById(context, menuId);
  if (!updated) throw new MenuNotFoundError("menu");
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
