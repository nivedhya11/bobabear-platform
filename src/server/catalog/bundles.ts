/**
 * Bundle group / option commands (IMP-012).
 */
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import {
  CATALOG_NAME_MAX,
  CATALOG_QUANTITY_MAX,
  type CatalogLifecycleStatus,
} from "../../shared/catalog";
import {
  catalogBundleGroupOptionsTable,
  catalogBundleGroupsTable,
} from "../../platform/database/schema/catalog";
import type { PersistenceQueryContext, PersistenceTransactionContext } from "../persistence/types";
import {
  assertNonNegativeInt,
  assertQuantityInRange,
  assertTransactionContext,
  isUniqueViolation,
  normalizeCatalogCode,
  normalizeName,
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
  AddBundleOptionInput,
  BundleGroupLifecycleInput,
  BundleOptionLifecycleInput,
  CatalogBundleGroup,
  CatalogBundleGroupOption,
  CreateBundleGroupInput,
  UpdateBundleGroupInput,
  UpdateBundleOptionInput,
} from "./types";
import { findVariantById } from "./variants";
import { validateActiveProductGraph } from "./validation";

function rowToBundleGroup(row: typeof catalogBundleGroupsTable.$inferSelect): CatalogBundleGroup {
  return {
    id: row.id,
    brandId: row.brandId,
    bundleVariantId: row.bundleVariantId,
    parentProductKind: "bundle",
    code: row.code,
    name: row.name,
    minSelections: row.minSelections,
    maxSelections: row.maxSelections,
    position: row.position,
    lifecycleStatus: row.lifecycleStatus as CatalogLifecycleStatus,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  };
}

function rowToBundleOption(
  row: typeof catalogBundleGroupOptionsTable.$inferSelect,
): CatalogBundleGroupOption {
  return {
    id: row.id,
    brandId: row.brandId,
    bundleGroupId: row.bundleGroupId,
    componentVariantId: row.componentVariantId,
    componentProductKind: "standard",
    quantity: row.quantity,
    isDefault: row.isDefault,
    position: row.position,
    lifecycleStatus: row.lifecycleStatus as CatalogLifecycleStatus,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  };
}

function assertSelectionRange(minSelections: number, maxSelections: number): void {
  if (minSelections > maxSelections) {
    throw new CatalogValidationError({ message: "minSelections must be <= maxSelections." });
  }
}

async function productIdForBundleGroup(
  context: PersistenceQueryContext,
  bundleGroup: CatalogBundleGroup,
): Promise<string | null> {
  const variant = await findVariantById(context, bundleGroup.bundleVariantId);
  return variant?.productId ?? null;
}

export async function findBundleGroupById(
  context: PersistenceQueryContext,
  bundleGroupId: string,
): Promise<CatalogBundleGroup | null> {
  const id = assertUuid(bundleGroupId, "bundleGroupId");
  const rows = await context.db
    .select()
    .from(catalogBundleGroupsTable)
    .where(eq(catalogBundleGroupsTable.id, id))
    .limit(1);
  const row = rows[0];
  return row ? rowToBundleGroup(row) : null;
}

export async function findBundleGroupOptionById(
  context: PersistenceQueryContext,
  bundleGroupOptionId: string,
): Promise<CatalogBundleGroupOption | null> {
  const id = assertUuid(bundleGroupOptionId, "bundleGroupOptionId");
  const rows = await context.db
    .select()
    .from(catalogBundleGroupOptionsTable)
    .where(eq(catalogBundleGroupOptionsTable.id, id))
    .limit(1);
  const row = rows[0];
  return row ? rowToBundleOption(row) : null;
}

export async function createBundleGroup(
  context: PersistenceTransactionContext,
  input: CreateBundleGroupInput,
): Promise<CatalogBundleGroup> {
  assertTransactionContext(context, "createBundleGroup");
  const variant = await findVariantById(context, input.bundleVariantId);
  if (!variant) throw new CatalogNotFoundError("variant");
  if (variant.productKind !== "bundle") {
    throw new CatalogValidationError({
      message: "Bundle groups may only be created on bundle variants.",
    });
  }
  if (variant.lifecycleStatus === "retired") {
    throw new CatalogInvalidStateError({ message: "Cannot add a bundle group to a retired variant." });
  }
  await requireCatalogManage(context, input.actor, variant.brandId);

  const code = normalizeCatalogCode(input.code, "code");
  const name = normalizeName(input.name, "name", CATALOG_NAME_MAX.bundleGroup);
  const minSelections = assertNonNegativeInt(input.minSelections ?? 0, "minSelections");
  const maxSelections = assertQuantityInRange(
    input.maxSelections,
    "maxSelections",
    1,
    CATALOG_QUANTITY_MAX,
  );
  assertSelectionRange(minSelections, maxSelections);
  const position = assertNonNegativeInt(input.position ?? 0, "position");
  const now = new Date();
  const id = randomUUID();

  try {
    await context.db.insert(catalogBundleGroupsTable).values({
      id,
      brandId: variant.brandId,
      bundleVariantId: variant.id,
      parentProductKind: "bundle",
      code,
      name,
      minSelections,
      maxSelections,
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
        message: "Bundle group code already exists for this variant.",
      });
    }
    throw error;
  }

  await validateActiveProductGraph(context, variant.productId);

  const created = await findBundleGroupById(context, id);
  if (!created) throw new CatalogValidationError({ message: "Bundle group create failed." });
  return created;
}

export async function updateBundleGroup(
  context: PersistenceTransactionContext,
  input: UpdateBundleGroupInput,
): Promise<CatalogBundleGroup> {
  assertTransactionContext(context, "updateBundleGroup");
  const existing = await findBundleGroupById(context, input.bundleGroupId);
  if (!existing) throw new CatalogNotFoundError("bundle_group");
  if (existing.lifecycleStatus === "retired") {
    throw new CatalogInvalidStateError({ message: "Cannot update a retired bundle group." });
  }
  await requireCatalogManage(context, input.actor, existing.brandId);

  if (
    input.name === undefined &&
    input.minSelections === undefined &&
    input.maxSelections === undefined &&
    input.position === undefined
  ) {
    throw new CatalogValidationError({
      message: "updateBundleGroup requires at least one mutable field.",
    });
  }

  const name =
    input.name !== undefined
      ? normalizeName(input.name, "name", CATALOG_NAME_MAX.bundleGroup)
      : existing.name;
  const minSelections =
    input.minSelections !== undefined
      ? assertNonNegativeInt(input.minSelections, "minSelections")
      : existing.minSelections;
  const maxSelections =
    input.maxSelections !== undefined
      ? assertQuantityInRange(input.maxSelections, "maxSelections", 1, CATALOG_QUANTITY_MAX)
      : existing.maxSelections;
  assertSelectionRange(minSelections, maxSelections);
  const position =
    input.position !== undefined
      ? assertNonNegativeInt(input.position, "position")
      : existing.position;

  await context.db
    .update(catalogBundleGroupsTable)
    .set({
      name,
      minSelections,
      maxSelections,
      position,
      updatedAt: new Date(),
    })
    .where(eq(catalogBundleGroupsTable.id, existing.id));

  const productId = await productIdForBundleGroup(context, existing);
  if (productId) await validateActiveProductGraph(context, productId);

  const updated = await findBundleGroupById(context, existing.id);
  if (!updated) throw new CatalogNotFoundError("bundle_group");
  return updated;
}

export async function activateBundleGroup(
  context: PersistenceTransactionContext,
  input: BundleGroupLifecycleInput,
): Promise<CatalogBundleGroup> {
  assertTransactionContext(context, "activateBundleGroup");
  const existing = await findBundleGroupById(context, input.bundleGroupId);
  if (!existing) throw new CatalogNotFoundError("bundle_group");
  await requireCatalogManage(context, input.actor, existing.brandId);

  assertCanTransition(existing.lifecycleStatus, "active");
  const stamps = activationTimestamps();
  await context.db
    .update(catalogBundleGroupsTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
    })
    .where(eq(catalogBundleGroupsTable.id, existing.id));

  const productId = await productIdForBundleGroup(context, existing);
  if (productId) await validateActiveProductGraph(context, productId);

  const updated = await findBundleGroupById(context, existing.id);
  if (!updated) throw new CatalogNotFoundError("bundle_group");
  return updated;
}

export async function retireBundleGroup(
  context: PersistenceTransactionContext,
  input: BundleGroupLifecycleInput,
): Promise<CatalogBundleGroup> {
  assertTransactionContext(context, "retireBundleGroup");
  const existing = await findBundleGroupById(context, input.bundleGroupId);
  if (!existing) throw new CatalogNotFoundError("bundle_group");
  await requireCatalogManage(context, input.actor, existing.brandId);

  assertCanTransition(existing.lifecycleStatus, "retired");
  const stamps = retirementTimestamps(existing.lifecycleStatus, existing.activatedAt);
  await context.db
    .update(catalogBundleGroupsTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
    })
    .where(eq(catalogBundleGroupsTable.id, existing.id));

  const productId = await productIdForBundleGroup(context, existing);
  if (productId) await validateActiveProductGraph(context, productId);

  const updated = await findBundleGroupById(context, existing.id);
  if (!updated) throw new CatalogNotFoundError("bundle_group");
  return updated;
}

export async function addBundleOption(
  context: PersistenceTransactionContext,
  input: AddBundleOptionInput,
): Promise<CatalogBundleGroupOption> {
  assertTransactionContext(context, "addBundleOption");
  const group = await findBundleGroupById(context, input.bundleGroupId);
  if (!group) throw new CatalogNotFoundError("bundle_group");
  if (group.lifecycleStatus === "retired") {
    throw new CatalogInvalidStateError({ message: "Cannot add options to a retired bundle group." });
  }

  const component = await findVariantById(context, input.componentVariantId);
  if (!component) throw new CatalogNotFoundError("variant");
  if (component.productKind !== "standard") {
    throw new CatalogValidationError({
      message: "Bundle options may only reference standard component variants.",
    });
  }
  if (component.brandId !== group.brandId) {
    throw new CatalogValidationError({
      message: "Bundle component variant must belong to the same brand.",
    });
  }
  if (component.id === group.bundleVariantId) {
    throw new CatalogValidationError({ message: "A bundle variant cannot component itself." });
  }
  await requireCatalogManage(context, input.actor, group.brandId);

  const quantity = assertQuantityInRange(input.quantity ?? 1, "quantity", 1, CATALOG_QUANTITY_MAX);
  const isDefault = input.isDefault ?? false;
  const position = assertNonNegativeInt(input.position ?? 0, "position");
  const now = new Date();
  const id = randomUUID();

  try {
    await context.db.insert(catalogBundleGroupOptionsTable).values({
      id,
      brandId: group.brandId,
      bundleGroupId: group.id,
      componentVariantId: component.id,
      componentProductKind: "standard",
      quantity,
      isDefault,
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
        message: "An active bundle option for this component already exists in the group.",
      });
    }
    throw error;
  }

  const productId = await productIdForBundleGroup(context, group);
  if (productId) await validateActiveProductGraph(context, productId);

  const created = await findBundleGroupOptionById(context, id);
  if (!created) throw new CatalogValidationError({ message: "Bundle option create failed." });
  return created;
}

export async function updateBundleOption(
  context: PersistenceTransactionContext,
  input: UpdateBundleOptionInput,
): Promise<CatalogBundleGroupOption> {
  assertTransactionContext(context, "updateBundleOption");
  const existing = await findBundleGroupOptionById(context, input.bundleGroupOptionId);
  if (!existing) throw new CatalogNotFoundError("bundle_group_option");
  if (existing.lifecycleStatus === "retired") {
    throw new CatalogInvalidStateError({ message: "Cannot update a retired bundle option." });
  }
  await requireCatalogManage(context, input.actor, existing.brandId);

  if (
    input.quantity === undefined &&
    input.isDefault === undefined &&
    input.position === undefined
  ) {
    throw new CatalogValidationError({
      message: "updateBundleOption requires at least one mutable field.",
    });
  }

  const quantity =
    input.quantity !== undefined
      ? assertQuantityInRange(input.quantity, "quantity", 1, CATALOG_QUANTITY_MAX)
      : existing.quantity;
  const isDefault = input.isDefault ?? existing.isDefault;
  const position =
    input.position !== undefined
      ? assertNonNegativeInt(input.position, "position")
      : existing.position;

  await context.db
    .update(catalogBundleGroupOptionsTable)
    .set({ quantity, isDefault, position, updatedAt: new Date() })
    .where(eq(catalogBundleGroupOptionsTable.id, existing.id));

  const group = await findBundleGroupById(context, existing.bundleGroupId);
  if (group) {
    const productId = await productIdForBundleGroup(context, group);
    if (productId) await validateActiveProductGraph(context, productId);
  }

  const updated = await findBundleGroupOptionById(context, existing.id);
  if (!updated) throw new CatalogNotFoundError("bundle_group_option");
  return updated;
}

export async function activateBundleOption(
  context: PersistenceTransactionContext,
  input: BundleOptionLifecycleInput,
): Promise<CatalogBundleGroupOption> {
  assertTransactionContext(context, "activateBundleOption");
  const existing = await findBundleGroupOptionById(context, input.bundleGroupOptionId);
  if (!existing) throw new CatalogNotFoundError("bundle_group_option");
  await requireCatalogManage(context, input.actor, existing.brandId);

  assertCanTransition(existing.lifecycleStatus, "active");
  const stamps = activationTimestamps();
  try {
    await context.db
      .update(catalogBundleGroupOptionsTable)
      .set({
        lifecycleStatus: stamps.lifecycleStatus,
        activatedAt: stamps.activatedAt,
        retiredAt: stamps.retiredAt,
        updatedAt: stamps.updatedAt,
      })
      .where(eq(catalogBundleGroupOptionsTable.id, existing.id));
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new CatalogConflictError({
        message: "An active bundle option for this component already exists in the group.",
      });
    }
    throw error;
  }

  const group = await findBundleGroupById(context, existing.bundleGroupId);
  if (group) {
    const productId = await productIdForBundleGroup(context, group);
    if (productId) await validateActiveProductGraph(context, productId);
  }

  const updated = await findBundleGroupOptionById(context, existing.id);
  if (!updated) throw new CatalogNotFoundError("bundle_group_option");
  return updated;
}

export async function retireBundleOption(
  context: PersistenceTransactionContext,
  input: BundleOptionLifecycleInput,
): Promise<CatalogBundleGroupOption> {
  assertTransactionContext(context, "retireBundleOption");
  const existing = await findBundleGroupOptionById(context, input.bundleGroupOptionId);
  if (!existing) throw new CatalogNotFoundError("bundle_group_option");
  await requireCatalogManage(context, input.actor, existing.brandId);

  assertCanTransition(existing.lifecycleStatus, "retired");
  const stamps = retirementTimestamps(existing.lifecycleStatus, existing.activatedAt);
  await context.db
    .update(catalogBundleGroupOptionsTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
    })
    .where(eq(catalogBundleGroupOptionsTable.id, existing.id));

  const group = await findBundleGroupById(context, existing.bundleGroupId);
  if (group) {
    const productId = await productIdForBundleGroup(context, group);
    if (productId) await validateActiveProductGraph(context, productId);
  }

  const updated = await findBundleGroupOptionById(context, existing.id);
  if (!updated) throw new CatalogNotFoundError("bundle_group_option");
  return updated;
}
