/**
 * Modifier group / option / binding commands (IMP-012).
 */
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import {
  CATALOG_DESCRIPTION_MAX,
  CATALOG_NAME_MAX,
  CATALOG_QUANTITY_MAX,
  isModifierGroupRequired,
  type CatalogLifecycleStatus,
} from "../../shared/catalog";
import {
  catalogModifierGroupOptionsTable,
  catalogModifierGroupsTable,
  catalogModifierOptionsTable,
  catalogVariantModifierGroupsTable,
} from "../../platform/database/schema/catalog";
import type { PersistenceQueryContext, PersistenceTransactionContext } from "../persistence/types";
import {
  assertNonNegativeInt,
  assertQuantityInRange,
  assertTransactionContext,
  isUniqueViolation,
  normalizeCatalogCode,
  normalizeName,
  normalizeOptionalDescription,
} from "./assert-role";
import { requireCatalogManage } from "./authorize-catalog";
import {
  CatalogConflictError,
  CatalogInvalidStateError,
  CatalogNotFoundError,
  CatalogValidationError,
} from "./errors";
import {
  activationTimestamps,
  assertCanTransition,
  assertUuid,
  retirementTimestamps,
} from "./lifecycle";
import type {
  AddModifierOptionToGroupInput,
  ApplyModifierGroupToVariantInput,
  CatalogModifierGroup,
  CatalogModifierGroupOption,
  CatalogModifierOption,
  CatalogVariantModifierGroup,
  CreateModifierGroupInput,
  CreateModifierOptionInput,
  ModifierGroupLifecycleInput,
  ModifierGroupOptionLifecycleInput,
  ModifierOptionLifecycleInput,
  UpdateModifierGroupInput,
  UpdateModifierGroupOptionInput,
  UpdateModifierOptionInput,
  UpdateVariantModifierGroupInput,
  VariantModifierGroupLifecycleInput,
} from "./types";
import { findVariantById } from "./variants";
import {
  revalidateProductsForModifierGroup,
  revalidateProductsForModifierOption,
  validateActiveProductGraph,
} from "./validation";

function rowToGroup(row: typeof catalogModifierGroupsTable.$inferSelect): CatalogModifierGroup {
  return {
    id: row.id,
    brandId: row.brandId,
    code: row.code,
    name: row.name,
    description: row.description,
    lifecycleStatus: row.lifecycleStatus as CatalogLifecycleStatus,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  };
}

function rowToOption(row: typeof catalogModifierOptionsTable.$inferSelect): CatalogModifierOption {
  return {
    id: row.id,
    brandId: row.brandId,
    code: row.code,
    name: row.name,
    description: row.description,
    lifecycleStatus: row.lifecycleStatus as CatalogLifecycleStatus,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  };
}

function rowToGroupOption(
  row: typeof catalogModifierGroupOptionsTable.$inferSelect,
): CatalogModifierGroupOption {
  return {
    id: row.id,
    brandId: row.brandId,
    modifierGroupId: row.modifierGroupId,
    modifierOptionId: row.modifierOptionId,
    minQuantity: row.minQuantity,
    maxQuantity: row.maxQuantity,
    defaultQuantity: row.defaultQuantity,
    position: row.position,
    lifecycleStatus: row.lifecycleStatus as CatalogLifecycleStatus,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  };
}

function rowToVariantModifierGroup(
  row: typeof catalogVariantModifierGroupsTable.$inferSelect,
): CatalogVariantModifierGroup {
  return {
    id: row.id,
    brandId: row.brandId,
    variantId: row.variantId,
    modifierGroupId: row.modifierGroupId,
    minTotalQuantity: row.minTotalQuantity,
    maxTotalQuantity: row.maxTotalQuantity,
    required: isModifierGroupRequired(row.minTotalQuantity),
    position: row.position,
    lifecycleStatus: row.lifecycleStatus as CatalogLifecycleStatus,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  };
}

function assertQuantityTriple(
  minQuantity: number,
  maxQuantity: number,
  defaultQuantity: number,
): void {
  if (minQuantity > maxQuantity) {
    throw new CatalogValidationError({ message: "minQuantity must be <= maxQuantity." });
  }
  if (defaultQuantity < minQuantity || defaultQuantity > maxQuantity) {
    throw new CatalogValidationError({
      message: "defaultQuantity must be between minQuantity and maxQuantity.",
    });
  }
}

function assertTotalRange(minTotal: number, maxTotal: number): void {
  if (minTotal > maxTotal) {
    throw new CatalogValidationError({
      message: "minTotalQuantity must be <= maxTotalQuantity.",
    });
  }
}

export async function findModifierGroupById(
  context: PersistenceQueryContext,
  modifierGroupId: string,
): Promise<CatalogModifierGroup | null> {
  const id = assertUuid(modifierGroupId, "modifierGroupId");
  const rows = await context.db
    .select()
    .from(catalogModifierGroupsTable)
    .where(eq(catalogModifierGroupsTable.id, id))
    .limit(1);
  const row = rows[0];
  return row ? rowToGroup(row) : null;
}

export async function findModifierOptionById(
  context: PersistenceQueryContext,
  modifierOptionId: string,
): Promise<CatalogModifierOption | null> {
  const id = assertUuid(modifierOptionId, "modifierOptionId");
  const rows = await context.db
    .select()
    .from(catalogModifierOptionsTable)
    .where(eq(catalogModifierOptionsTable.id, id))
    .limit(1);
  const row = rows[0];
  return row ? rowToOption(row) : null;
}

export async function findModifierGroupOptionById(
  context: PersistenceQueryContext,
  modifierGroupOptionId: string,
): Promise<CatalogModifierGroupOption | null> {
  const id = assertUuid(modifierGroupOptionId, "modifierGroupOptionId");
  const rows = await context.db
    .select()
    .from(catalogModifierGroupOptionsTable)
    .where(eq(catalogModifierGroupOptionsTable.id, id))
    .limit(1);
  const row = rows[0];
  return row ? rowToGroupOption(row) : null;
}

export async function findVariantModifierGroupById(
  context: PersistenceQueryContext,
  variantModifierGroupId: string,
): Promise<CatalogVariantModifierGroup | null> {
  const id = assertUuid(variantModifierGroupId, "variantModifierGroupId");
  const rows = await context.db
    .select()
    .from(catalogVariantModifierGroupsTable)
    .where(eq(catalogVariantModifierGroupsTable.id, id))
    .limit(1);
  const row = rows[0];
  return row ? rowToVariantModifierGroup(row) : null;
}

export async function createModifierGroup(
  context: PersistenceTransactionContext,
  input: CreateModifierGroupInput,
): Promise<CatalogModifierGroup> {
  assertTransactionContext(context, "createModifierGroup");
  await requireCatalogManage(context, input.actor, input.brandId);

  const brandId = assertUuid(input.brandId, "brandId");
  const code = normalizeCatalogCode(input.code, "code");
  const name = normalizeName(input.name, "name", CATALOG_NAME_MAX.modifierGroup);
  const description = normalizeOptionalDescription(
    input.description,
    "description",
    CATALOG_DESCRIPTION_MAX.modifierGroup,
  );
  const now = new Date();
  const id = randomUUID();

  try {
    await context.db.insert(catalogModifierGroupsTable).values({
      id,
      brandId,
      code,
      name,
      description,
      lifecycleStatus: "draft",
      createdAt: now,
      updatedAt: now,
      activatedAt: null,
      retiredAt: null,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new CatalogConflictError({
        message: "Modifier group code already exists for this brand.",
      });
    }
    throw error;
  }

  const created = await findModifierGroupById(context, id);
  if (!created) throw new CatalogValidationError({ message: "Modifier group create failed." });
  return created;
}

export async function updateModifierGroup(
  context: PersistenceTransactionContext,
  input: UpdateModifierGroupInput,
): Promise<CatalogModifierGroup> {
  assertTransactionContext(context, "updateModifierGroup");
  const existing = await findModifierGroupById(context, input.modifierGroupId);
  if (!existing) throw new CatalogNotFoundError("modifier_group");
  if (existing.lifecycleStatus === "retired") {
    throw new CatalogInvalidStateError({ message: "Cannot update a retired modifier group." });
  }
  await requireCatalogManage(context, input.actor, existing.brandId);

  if (input.name === undefined && input.description === undefined) {
    throw new CatalogValidationError({
      message: "updateModifierGroup requires name and/or description.",
    });
  }

  const name =
    input.name !== undefined
      ? normalizeName(input.name, "name", CATALOG_NAME_MAX.modifierGroup)
      : existing.name;
  const description =
    input.description !== undefined
      ? normalizeOptionalDescription(
          input.description,
          "description",
          CATALOG_DESCRIPTION_MAX.modifierGroup,
        )
      : existing.description;

  await context.db
    .update(catalogModifierGroupsTable)
    .set({ name, description, updatedAt: new Date() })
    .where(eq(catalogModifierGroupsTable.id, existing.id));

  const updated = await findModifierGroupById(context, existing.id);
  if (!updated) throw new CatalogNotFoundError("modifier_group");
  return updated;
}

export async function activateModifierGroup(
  context: PersistenceTransactionContext,
  input: ModifierGroupLifecycleInput,
): Promise<CatalogModifierGroup> {
  assertTransactionContext(context, "activateModifierGroup");
  const existing = await findModifierGroupById(context, input.modifierGroupId);
  if (!existing) throw new CatalogNotFoundError("modifier_group");
  await requireCatalogManage(context, input.actor, existing.brandId);

  assertCanTransition(existing.lifecycleStatus, "active");
  const stamps = activationTimestamps();
  await context.db
    .update(catalogModifierGroupsTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
    })
    .where(eq(catalogModifierGroupsTable.id, existing.id));

  await revalidateProductsForModifierGroup(context, existing.id);

  const updated = await findModifierGroupById(context, existing.id);
  if (!updated) throw new CatalogNotFoundError("modifier_group");
  return updated;
}

export async function retireModifierGroup(
  context: PersistenceTransactionContext,
  input: ModifierGroupLifecycleInput,
): Promise<CatalogModifierGroup> {
  assertTransactionContext(context, "retireModifierGroup");
  const existing = await findModifierGroupById(context, input.modifierGroupId);
  if (!existing) throw new CatalogNotFoundError("modifier_group");
  await requireCatalogManage(context, input.actor, existing.brandId);

  assertCanTransition(existing.lifecycleStatus, "retired");
  const stamps = retirementTimestamps(existing.lifecycleStatus, existing.activatedAt);
  await context.db
    .update(catalogModifierGroupsTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
    })
    .where(eq(catalogModifierGroupsTable.id, existing.id));

  await revalidateProductsForModifierGroup(context, existing.id);

  const updated = await findModifierGroupById(context, existing.id);
  if (!updated) throw new CatalogNotFoundError("modifier_group");
  return updated;
}

export async function createModifierOption(
  context: PersistenceTransactionContext,
  input: CreateModifierOptionInput,
): Promise<CatalogModifierOption> {
  assertTransactionContext(context, "createModifierOption");
  await requireCatalogManage(context, input.actor, input.brandId);

  const brandId = assertUuid(input.brandId, "brandId");
  const code = normalizeCatalogCode(input.code, "code");
  const name = normalizeName(input.name, "name", CATALOG_NAME_MAX.modifierOption);
  const description = normalizeOptionalDescription(
    input.description,
    "description",
    CATALOG_DESCRIPTION_MAX.modifierOption,
  );
  const now = new Date();
  const id = randomUUID();

  try {
    await context.db.insert(catalogModifierOptionsTable).values({
      id,
      brandId,
      code,
      name,
      description,
      lifecycleStatus: "draft",
      createdAt: now,
      updatedAt: now,
      activatedAt: null,
      retiredAt: null,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new CatalogConflictError({
        message: "Modifier option code already exists for this brand.",
      });
    }
    throw error;
  }

  const created = await findModifierOptionById(context, id);
  if (!created) throw new CatalogValidationError({ message: "Modifier option create failed." });
  return created;
}

export async function updateModifierOption(
  context: PersistenceTransactionContext,
  input: UpdateModifierOptionInput,
): Promise<CatalogModifierOption> {
  assertTransactionContext(context, "updateModifierOption");
  const existing = await findModifierOptionById(context, input.modifierOptionId);
  if (!existing) throw new CatalogNotFoundError("modifier_option");
  if (existing.lifecycleStatus === "retired") {
    throw new CatalogInvalidStateError({ message: "Cannot update a retired modifier option." });
  }
  await requireCatalogManage(context, input.actor, existing.brandId);

  if (input.name === undefined && input.description === undefined) {
    throw new CatalogValidationError({
      message: "updateModifierOption requires name and/or description.",
    });
  }

  const name =
    input.name !== undefined
      ? normalizeName(input.name, "name", CATALOG_NAME_MAX.modifierOption)
      : existing.name;
  const description =
    input.description !== undefined
      ? normalizeOptionalDescription(
          input.description,
          "description",
          CATALOG_DESCRIPTION_MAX.modifierOption,
        )
      : existing.description;

  await context.db
    .update(catalogModifierOptionsTable)
    .set({ name, description, updatedAt: new Date() })
    .where(eq(catalogModifierOptionsTable.id, existing.id));

  const updated = await findModifierOptionById(context, existing.id);
  if (!updated) throw new CatalogNotFoundError("modifier_option");
  return updated;
}

export async function activateModifierOption(
  context: PersistenceTransactionContext,
  input: ModifierOptionLifecycleInput,
): Promise<CatalogModifierOption> {
  assertTransactionContext(context, "activateModifierOption");
  const existing = await findModifierOptionById(context, input.modifierOptionId);
  if (!existing) throw new CatalogNotFoundError("modifier_option");
  await requireCatalogManage(context, input.actor, existing.brandId);

  assertCanTransition(existing.lifecycleStatus, "active");
  const stamps = activationTimestamps();
  await context.db
    .update(catalogModifierOptionsTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
    })
    .where(eq(catalogModifierOptionsTable.id, existing.id));

  await revalidateProductsForModifierOption(context, existing.id);

  const updated = await findModifierOptionById(context, existing.id);
  if (!updated) throw new CatalogNotFoundError("modifier_option");
  return updated;
}

export async function retireModifierOption(
  context: PersistenceTransactionContext,
  input: ModifierOptionLifecycleInput,
): Promise<CatalogModifierOption> {
  assertTransactionContext(context, "retireModifierOption");
  const existing = await findModifierOptionById(context, input.modifierOptionId);
  if (!existing) throw new CatalogNotFoundError("modifier_option");
  await requireCatalogManage(context, input.actor, existing.brandId);

  assertCanTransition(existing.lifecycleStatus, "retired");
  const stamps = retirementTimestamps(existing.lifecycleStatus, existing.activatedAt);
  await context.db
    .update(catalogModifierOptionsTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
    })
    .where(eq(catalogModifierOptionsTable.id, existing.id));

  await revalidateProductsForModifierOption(context, existing.id);

  const updated = await findModifierOptionById(context, existing.id);
  if (!updated) throw new CatalogNotFoundError("modifier_option");
  return updated;
}

export async function addModifierOptionToGroup(
  context: PersistenceTransactionContext,
  input: AddModifierOptionToGroupInput,
): Promise<CatalogModifierGroupOption> {
  assertTransactionContext(context, "addModifierOptionToGroup");
  const group = await findModifierGroupById(context, input.modifierGroupId);
  if (!group) throw new CatalogNotFoundError("modifier_group");
  if (group.lifecycleStatus === "retired") {
    throw new CatalogInvalidStateError({ message: "Cannot bind options to a retired modifier group." });
  }
  const option = await findModifierOptionById(context, input.modifierOptionId);
  if (!option) throw new CatalogNotFoundError("modifier_option");
  if (option.brandId !== group.brandId) {
    throw new CatalogValidationError({ message: "Modifier group and option must share a brand." });
  }
  await requireCatalogManage(context, input.actor, group.brandId);

  const minQuantity = assertNonNegativeInt(input.minQuantity ?? 0, "minQuantity");
  const maxQuantity = assertQuantityInRange(input.maxQuantity, "maxQuantity", 1, CATALOG_QUANTITY_MAX);
  const defaultQuantity = assertNonNegativeInt(input.defaultQuantity ?? 0, "defaultQuantity");
  assertQuantityTriple(minQuantity, maxQuantity, defaultQuantity);
  const position = assertNonNegativeInt(input.position ?? 0, "position");
  const now = new Date();
  const id = randomUUID();

  try {
    await context.db.insert(catalogModifierGroupOptionsTable).values({
      id,
      brandId: group.brandId,
      modifierGroupId: group.id,
      modifierOptionId: option.id,
      minQuantity,
      maxQuantity,
      defaultQuantity,
      position,
      lifecycleStatus: "draft",
      createdAt: now,
      updatedAt: now,
      activatedAt: null,
      retiredAt: null,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new CatalogConflictError({
        message: "An active binding for this modifier group and option already exists.",
      });
    }
    throw error;
  }

  await revalidateProductsForModifierGroup(context, group.id);

  const created = await findModifierGroupOptionById(context, id);
  if (!created) throw new CatalogValidationError({ message: "Modifier group-option create failed." });
  return created;
}

export async function updateModifierGroupOption(
  context: PersistenceTransactionContext,
  input: UpdateModifierGroupOptionInput,
): Promise<CatalogModifierGroupOption> {
  assertTransactionContext(context, "updateModifierGroupOption");
  const existing = await findModifierGroupOptionById(context, input.modifierGroupOptionId);
  if (!existing) throw new CatalogNotFoundError("modifier_group_option");
  if (existing.lifecycleStatus === "retired") {
    throw new CatalogInvalidStateError({ message: "Cannot update a retired modifier group-option." });
  }
  await requireCatalogManage(context, input.actor, existing.brandId);

  if (
    input.minQuantity === undefined &&
    input.maxQuantity === undefined &&
    input.defaultQuantity === undefined &&
    input.position === undefined
  ) {
    throw new CatalogValidationError({
      message: "updateModifierGroupOption requires at least one mutable field.",
    });
  }

  const minQuantity =
    input.minQuantity !== undefined
      ? assertNonNegativeInt(input.minQuantity, "minQuantity")
      : existing.minQuantity;
  const maxQuantity =
    input.maxQuantity !== undefined
      ? assertQuantityInRange(input.maxQuantity, "maxQuantity", 1, CATALOG_QUANTITY_MAX)
      : existing.maxQuantity;
  const defaultQuantity =
    input.defaultQuantity !== undefined
      ? assertNonNegativeInt(input.defaultQuantity, "defaultQuantity")
      : existing.defaultQuantity;
  assertQuantityTriple(minQuantity, maxQuantity, defaultQuantity);
  const position =
    input.position !== undefined
      ? assertNonNegativeInt(input.position, "position")
      : existing.position;

  await context.db
    .update(catalogModifierGroupOptionsTable)
    .set({
      minQuantity,
      maxQuantity,
      defaultQuantity,
      position,
      updatedAt: new Date(),
    })
    .where(eq(catalogModifierGroupOptionsTable.id, existing.id));

  await revalidateProductsForModifierGroup(context, existing.modifierGroupId);

  const updated = await findModifierGroupOptionById(context, existing.id);
  if (!updated) throw new CatalogNotFoundError("modifier_group_option");
  return updated;
}

export async function activateModifierGroupOption(
  context: PersistenceTransactionContext,
  input: ModifierGroupOptionLifecycleInput,
): Promise<CatalogModifierGroupOption> {
  assertTransactionContext(context, "activateModifierGroupOption");
  const existing = await findModifierGroupOptionById(context, input.modifierGroupOptionId);
  if (!existing) throw new CatalogNotFoundError("modifier_group_option");
  await requireCatalogManage(context, input.actor, existing.brandId);

  assertCanTransition(existing.lifecycleStatus, "active");
  const stamps = activationTimestamps();
  try {
    await context.db
      .update(catalogModifierGroupOptionsTable)
      .set({
        lifecycleStatus: stamps.lifecycleStatus,
        activatedAt: stamps.activatedAt,
        retiredAt: stamps.retiredAt,
        updatedAt: stamps.updatedAt,
      })
      .where(eq(catalogModifierGroupOptionsTable.id, existing.id));
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new CatalogConflictError({
        message: "An active binding for this modifier group and option already exists.",
      });
    }
    throw error;
  }

  await revalidateProductsForModifierGroup(context, existing.modifierGroupId);

  const updated = await findModifierGroupOptionById(context, existing.id);
  if (!updated) throw new CatalogNotFoundError("modifier_group_option");
  return updated;
}

export async function retireModifierGroupOption(
  context: PersistenceTransactionContext,
  input: ModifierGroupOptionLifecycleInput,
): Promise<CatalogModifierGroupOption> {
  assertTransactionContext(context, "retireModifierGroupOption");
  const existing = await findModifierGroupOptionById(context, input.modifierGroupOptionId);
  if (!existing) throw new CatalogNotFoundError("modifier_group_option");
  await requireCatalogManage(context, input.actor, existing.brandId);

  assertCanTransition(existing.lifecycleStatus, "retired");
  const stamps = retirementTimestamps(existing.lifecycleStatus, existing.activatedAt);
  await context.db
    .update(catalogModifierGroupOptionsTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
    })
    .where(eq(catalogModifierGroupOptionsTable.id, existing.id));

  await revalidateProductsForModifierGroup(context, existing.modifierGroupId);

  const updated = await findModifierGroupOptionById(context, existing.id);
  if (!updated) throw new CatalogNotFoundError("modifier_group_option");
  return updated;
}

export async function applyModifierGroupToVariant(
  context: PersistenceTransactionContext,
  input: ApplyModifierGroupToVariantInput,
): Promise<CatalogVariantModifierGroup> {
  assertTransactionContext(context, "applyModifierGroupToVariant");
  const variant = await findVariantById(context, input.variantId);
  if (!variant) throw new CatalogNotFoundError("variant");
  if (variant.lifecycleStatus === "retired") {
    throw new CatalogInvalidStateError({ message: "Cannot apply modifiers to a retired variant." });
  }
  const group = await findModifierGroupById(context, input.modifierGroupId);
  if (!group) throw new CatalogNotFoundError("modifier_group");
  if (group.brandId !== variant.brandId) {
    throw new CatalogValidationError({ message: "Variant and modifier group must share a brand." });
  }
  await requireCatalogManage(context, input.actor, variant.brandId);

  const minTotalQuantity = assertNonNegativeInt(input.minTotalQuantity ?? 0, "minTotalQuantity");
  const maxTotalQuantity = assertQuantityInRange(
    input.maxTotalQuantity,
    "maxTotalQuantity",
    1,
    CATALOG_QUANTITY_MAX,
  );
  assertTotalRange(minTotalQuantity, maxTotalQuantity);
  const position = assertNonNegativeInt(input.position ?? 0, "position");
  const now = new Date();
  const id = randomUUID();

  try {
    await context.db.insert(catalogVariantModifierGroupsTable).values({
      id,
      brandId: variant.brandId,
      variantId: variant.id,
      modifierGroupId: group.id,
      minTotalQuantity,
      maxTotalQuantity,
      position,
      lifecycleStatus: "draft",
      createdAt: now,
      updatedAt: now,
      activatedAt: null,
      retiredAt: null,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new CatalogConflictError({
        message: "An active modifier group binding for this variant already exists.",
      });
    }
    throw error;
  }

  await validateActiveProductGraph(context, variant.productId);

  const created = await findVariantModifierGroupById(context, id);
  if (!created) {
    throw new CatalogValidationError({ message: "Variant modifier group create failed." });
  }
  return created;
}

export async function updateVariantModifierGroup(
  context: PersistenceTransactionContext,
  input: UpdateVariantModifierGroupInput,
): Promise<CatalogVariantModifierGroup> {
  assertTransactionContext(context, "updateVariantModifierGroup");
  const existing = await findVariantModifierGroupById(context, input.variantModifierGroupId);
  if (!existing) throw new CatalogNotFoundError("variant_modifier_group");
  if (existing.lifecycleStatus === "retired") {
    throw new CatalogInvalidStateError({
      message: "Cannot update a retired variant modifier group binding.",
    });
  }
  await requireCatalogManage(context, input.actor, existing.brandId);

  if (
    input.minTotalQuantity === undefined &&
    input.maxTotalQuantity === undefined &&
    input.position === undefined
  ) {
    throw new CatalogValidationError({
      message: "updateVariantModifierGroup requires at least one mutable field.",
    });
  }

  const minTotalQuantity =
    input.minTotalQuantity !== undefined
      ? assertNonNegativeInt(input.minTotalQuantity, "minTotalQuantity")
      : existing.minTotalQuantity;
  const maxTotalQuantity =
    input.maxTotalQuantity !== undefined
      ? assertQuantityInRange(input.maxTotalQuantity, "maxTotalQuantity", 1, CATALOG_QUANTITY_MAX)
      : existing.maxTotalQuantity;
  assertTotalRange(minTotalQuantity, maxTotalQuantity);
  const position =
    input.position !== undefined
      ? assertNonNegativeInt(input.position, "position")
      : existing.position;

  await context.db
    .update(catalogVariantModifierGroupsTable)
    .set({
      minTotalQuantity,
      maxTotalQuantity,
      position,
      updatedAt: new Date(),
    })
    .where(eq(catalogVariantModifierGroupsTable.id, existing.id));

  const variant = await findVariantById(context, existing.variantId);
  if (variant) await validateActiveProductGraph(context, variant.productId);

  const updated = await findVariantModifierGroupById(context, existing.id);
  if (!updated) throw new CatalogNotFoundError("variant_modifier_group");
  return updated;
}

export async function activateVariantModifierGroup(
  context: PersistenceTransactionContext,
  input: VariantModifierGroupLifecycleInput,
): Promise<CatalogVariantModifierGroup> {
  assertTransactionContext(context, "activateVariantModifierGroup");
  const existing = await findVariantModifierGroupById(context, input.variantModifierGroupId);
  if (!existing) throw new CatalogNotFoundError("variant_modifier_group");
  await requireCatalogManage(context, input.actor, existing.brandId);

  assertCanTransition(existing.lifecycleStatus, "active");
  const stamps = activationTimestamps();
  try {
    await context.db
      .update(catalogVariantModifierGroupsTable)
      .set({
        lifecycleStatus: stamps.lifecycleStatus,
        activatedAt: stamps.activatedAt,
        retiredAt: stamps.retiredAt,
        updatedAt: stamps.updatedAt,
      })
      .where(eq(catalogVariantModifierGroupsTable.id, existing.id));
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new CatalogConflictError({
        message: "An active modifier group binding for this variant already exists.",
      });
    }
    throw error;
  }

  const variant = await findVariantById(context, existing.variantId);
  if (variant) await validateActiveProductGraph(context, variant.productId);

  const updated = await findVariantModifierGroupById(context, existing.id);
  if (!updated) throw new CatalogNotFoundError("variant_modifier_group");
  return updated;
}

export async function retireVariantModifierGroup(
  context: PersistenceTransactionContext,
  input: VariantModifierGroupLifecycleInput,
): Promise<CatalogVariantModifierGroup> {
  assertTransactionContext(context, "retireVariantModifierGroup");
  const existing = await findVariantModifierGroupById(context, input.variantModifierGroupId);
  if (!existing) throw new CatalogNotFoundError("variant_modifier_group");
  await requireCatalogManage(context, input.actor, existing.brandId);

  assertCanTransition(existing.lifecycleStatus, "retired");
  const stamps = retirementTimestamps(existing.lifecycleStatus, existing.activatedAt);
  await context.db
    .update(catalogVariantModifierGroupsTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
    })
    .where(eq(catalogVariantModifierGroupsTable.id, existing.id));

  const variant = await findVariantById(context, existing.variantId);
  if (variant) await validateActiveProductGraph(context, variant.productId);

  const updated = await findVariantModifierGroupById(context, existing.id);
  if (!updated) throw new CatalogNotFoundError("variant_modifier_group");
  return updated;
}
