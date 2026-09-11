/**
 * Menu commands (IMP-013 / IMP-036F F3A).
 */
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import {
  MENU_NAME_MAX,
  type MenuLifecycleStatus,
} from "../../../shared/catalog/menu";
import { menusTable } from "../../../platform/database/schema/menu";
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
import { requireMenuManage } from "./authorize-menu";
import { MenuConflictError, MenuInvalidStateError, MenuNotFoundError } from "./errors";
import type { CreateMenuInput, Menu, MenuLifecycleInput } from "./types";
import {
  assertNoActiveSectionsForMenu,
  loadMenuById,
} from "./validation";
import {
  lockBrandForUpdate,
  lockBrandMenusForUpdate,
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
 * Activate Menu aggregate lifecycle only (exclusive one-active-per-brand).
 *
 * Does NOT publish: no DRAFT→EFFECTIVE promotion, no effectiveMenuVersionId
 * switch, no menu.published. First customer cutover requires publishMenuRevision.
 */
export async function activateMenu(
  context: PersistenceTransactionContext,
  input: MenuLifecycleInput,
): Promise<Menu> {
  assertTransactionContext(context, "activateMenu");
  const menuId = assertUuid(input.menuId, "menuId");
  void actorId(input.actor);

  const soft = await findMenuById(context, menuId);
  if (!soft) throw new MenuNotFoundError("menu");

  await lockBrandForUpdate(context, soft.brandId);
  const brandMenus = await lockBrandMenusForUpdate(context, soft.brandId);
  const menu = brandMenus.find((row) => row.id === menuId);
  if (!menu) throw new MenuNotFoundError("menu");

  await requireMenuManage(context, input.actor, menu.brandId);
  assertCanTransition(menu.lifecycleStatus, "active");

  if (menu.effectiveMenuVersionId == null) {
    throw new MenuInvalidStateError({
      message:
        "Cannot activate a menu without an effective MenuVersion; use publishMenuRevision for first customer cutover.",
    });
  }

  await lockMenuVersionForUpdate(context, menu.effectiveMenuVersionId);

  const stamps = activationTimestamps();
  const now = stamps.updatedAt;

  for (const other of brandMenus) {
    if (other.id === menuId || other.lifecycleStatus !== "active") continue;
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

  await context.db
    .update(menusTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: now,
    })
    .where(eq(menusTable.id, menuId));

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
