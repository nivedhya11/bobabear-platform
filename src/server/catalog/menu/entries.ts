/**
 * Menu entry commands (IMP-013).
 */
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import {
  MENU_DESCRIPTION_MAX,
  MENU_IMAGE_PATH_MAX,
  MENU_NAME_MAX,
  type MenuLifecycleStatus,
} from "../../../shared/catalog/menu";
import { catalogProductsTable } from "../../../platform/database/schema/catalog";
import { menuEntriesTable } from "../../../platform/database/schema/menu";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../../persistence/types";
import {
  assertNonNegativeInt,
  assertTransactionContext,
  isUniqueViolation,
  normalizeName,
  normalizeOptionalDescription,
} from "../assert-role";
import {
  activationTimestamps,
  assertCanTransition,
  assertUuid,
  retirementTimestamps,
} from "../lifecycle";
import { requireMenuManage } from "./authorize-menu";
import { MenuConflictError, MenuNotFoundError, MenuValidationError } from "./errors";
import { findMenuById } from "./menus";
import { findMenuSectionById } from "./sections";
import type { CreateMenuEntryInput, MenuEntry, MenuEntryLifecycleInput } from "./types";
import {
  assertProductEligibleForEntry,
  loadEntryById,
} from "./validation";

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

export async function findMenuEntryById(
  context: PersistenceQueryContext,
  entryId: string,
): Promise<MenuEntry | null> {
  return loadEntryById(context, entryId);
}

export async function createMenuEntry(
  context: PersistenceTransactionContext,
  input: CreateMenuEntryInput,
): Promise<MenuEntry> {
  assertTransactionContext(context, "createMenuEntry");
  await requireMenuManage(context, input.actor, input.brandId);

  const brandId = assertUuid(input.brandId, "brandId");
  const menuId = assertUuid(input.menuId, "menuId");
  const sectionId = assertUuid(input.sectionId, "sectionId");
  const productId = assertUuid(input.productId, "productId");

  const menu = await findMenuById(context, menuId);
  if (!menu) throw new MenuNotFoundError("menu");
  if (menu.brandId !== brandId) {
    throw new MenuValidationError({ message: "Entry brandId must match the menu brand." });
  }

  const section = await findMenuSectionById(context, sectionId);
  if (!section) throw new MenuNotFoundError("menu_section");
  if (section.menuId !== menuId || section.brandId !== brandId) {
    throw new MenuValidationError({
      message: "Entry section must belong to the same brand and menu.",
    });
  }

  await assertProductEligibleForEntry(context, productId, brandId);

  const displayName =
    input.displayName === undefined || input.displayName === null
      ? null
      : normalizeName(input.displayName, "displayName", MENU_NAME_MAX.entryDisplayName);
  const displayDescription = normalizeOptionalDescription(
    input.displayDescription,
    "displayDescription",
    MENU_DESCRIPTION_MAX.entryDisplayDescription,
  );
  const imagePath = normalizeOptionalImagePath(input.imagePath, "imagePath");
  const position = assertNonNegativeInt(input.position ?? 0, "position");
  const id = input.id ? assertUuid(input.id, "id") : randomUUID();
  const now = new Date();

  try {
    await context.db.insert(menuEntriesTable).values({
      id,
      brandId,
      menuId,
      sectionId,
      productId,
      displayName,
      displayDescription,
      imagePath,
      position,
      lifecycleStatus: "draft",
      createdAt: now,
      updatedAt: now,
      activatedAt: null,
      retiredAt: null,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new MenuConflictError({
        message: "A non-retired menu entry for this product already exists in the section.",
      });
    }
    throw error;
  }

  const created = await findMenuEntryById(context, id);
  if (!created) throw new MenuNotFoundError("menu_entry");
  return created;
}

export async function activateMenuEntry(
  context: PersistenceTransactionContext,
  input: MenuEntryLifecycleInput,
): Promise<MenuEntry> {
  assertTransactionContext(context, "activateMenuEntry");
  const entryId = assertUuid(input.entryId, "entryId");
  const existing = await findMenuEntryById(context, entryId);
  if (!existing) throw new MenuNotFoundError("menu_entry");
  await requireMenuManage(context, input.actor, existing.brandId);

  const section = await findMenuSectionById(context, existing.sectionId);
  if (!section || section.lifecycleStatus !== "active") {
    throw new MenuValidationError({
      message: "Cannot activate a menu entry unless its section is active.",
    });
  }
  await assertProductEligibleForEntry(context, existing.productId, existing.brandId);
  const productRows = await context.db
    .select({ lifecycleStatus: catalogProductsTable.lifecycleStatus })
    .from(catalogProductsTable)
    .where(eq(catalogProductsTable.id, existing.productId))
    .limit(1);
  if (!productRows[0] || productRows[0].lifecycleStatus !== "active") {
    throw new MenuValidationError({
      message: "Cannot activate a menu entry unless its product is active.",
    });
  }

  assertCanTransition(existing.lifecycleStatus, "active");
  const stamps = activationTimestamps();
  await context.db
    .update(menuEntriesTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
    })
    .where(eq(menuEntriesTable.id, entryId));

  const updated = await findMenuEntryById(context, entryId);
  if (!updated) throw new MenuNotFoundError("menu_entry");
  return updated;
}

export async function retireMenuEntry(
  context: PersistenceTransactionContext,
  input: MenuEntryLifecycleInput,
): Promise<MenuEntry> {
  assertTransactionContext(context, "retireMenuEntry");
  const entryId = assertUuid(input.entryId, "entryId");
  const existing = await findMenuEntryById(context, entryId);
  if (!existing) throw new MenuNotFoundError("menu_entry");
  await requireMenuManage(context, input.actor, existing.brandId);

  assertCanTransition(existing.lifecycleStatus, "retired");
  const stamps = retirementTimestamps(
    existing.lifecycleStatus as MenuLifecycleStatus,
    existing.activatedAt,
  );
  await context.db
    .update(menuEntriesTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
    })
    .where(eq(menuEntriesTable.id, entryId));

  const updated = await findMenuEntryById(context, entryId);
  if (!updated) throw new MenuNotFoundError("menu_entry");
  return updated;
}
