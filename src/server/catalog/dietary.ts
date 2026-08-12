/**
 * Dietary tag and assignment commands (IMP-012).
 */
import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";

import {
  CATALOG_NAME_MAX,
  isDietaryTagKind,
  type CatalogLifecycleStatus,
  type DietaryTagKind,
} from "../../shared/catalog";
import {
  catalogDietaryTagsTable,
  catalogModifierOptionDietaryTagsTable,
  catalogVariantDietaryTagsTable,
} from "../../platform/database/schema/catalog";
import type { PersistenceQueryContext, PersistenceTransactionContext } from "../persistence/types";
import {
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
import { findModifierOptionById } from "./modifiers";
import type {
  AssignDietaryTagInput,
  CatalogDietaryAssignment,
  CatalogDietaryTag,
  CreateDietaryTagInput,
  DietaryTagLifecycleInput,
  RetireDietaryAssignmentInput,
  UpdateDietaryTagInput,
} from "./types";
import { findVariantById } from "./variants";

function rowToTag(row: typeof catalogDietaryTagsTable.$inferSelect): CatalogDietaryTag {
  return {
    id: row.id,
    brandId: row.brandId,
    code: row.code,
    name: row.name,
    kind: row.kind as DietaryTagKind,
    lifecycleStatus: row.lifecycleStatus as CatalogLifecycleStatus,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  };
}

function rowToVariantAssignment(
  row: typeof catalogVariantDietaryTagsTable.$inferSelect,
): CatalogDietaryAssignment {
  return {
    id: row.id,
    brandId: row.brandId,
    targetType: "variant",
    targetId: row.targetId,
    dietaryTagId: row.dietaryTagId,
    assignedAt: new Date(row.assignedAt),
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  };
}

function rowToOptionAssignment(
  row: typeof catalogModifierOptionDietaryTagsTable.$inferSelect,
): CatalogDietaryAssignment {
  return {
    id: row.id,
    brandId: row.brandId,
    targetType: "modifier_option",
    targetId: row.targetId,
    dietaryTagId: row.dietaryTagId,
    assignedAt: new Date(row.assignedAt),
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  };
}

export async function findDietaryTagById(
  context: PersistenceQueryContext,
  dietaryTagId: string,
): Promise<CatalogDietaryTag | null> {
  const id = assertUuid(dietaryTagId, "dietaryTagId");
  const rows = await context.db
    .select()
    .from(catalogDietaryTagsTable)
    .where(eq(catalogDietaryTagsTable.id, id))
    .limit(1);
  const row = rows[0];
  return row ? rowToTag(row) : null;
}

async function countActiveAssignments(
  context: PersistenceQueryContext,
  dietaryTagId: string,
): Promise<number> {
  const variantRows = await context.db
    .select({ id: catalogVariantDietaryTagsTable.id })
    .from(catalogVariantDietaryTagsTable)
    .where(
      and(
        eq(catalogVariantDietaryTagsTable.dietaryTagId, dietaryTagId),
        isNull(catalogVariantDietaryTagsTable.retiredAt),
      ),
    );
  const optionRows = await context.db
    .select({ id: catalogModifierOptionDietaryTagsTable.id })
    .from(catalogModifierOptionDietaryTagsTable)
    .where(
      and(
        eq(catalogModifierOptionDietaryTagsTable.dietaryTagId, dietaryTagId),
        isNull(catalogModifierOptionDietaryTagsTable.retiredAt),
      ),
    );
  return variantRows.length + optionRows.length;
}

export async function createDietaryTag(
  context: PersistenceTransactionContext,
  input: CreateDietaryTagInput,
): Promise<CatalogDietaryTag> {
  assertTransactionContext(context, "createDietaryTag");
  await requireCatalogManage(context, input.actor, input.brandId);

  if (!isDietaryTagKind(input.kind)) {
    throw new CatalogValidationError({ message: "kind must be dietary or allergen." });
  }

  const brandId = assertUuid(input.brandId, "brandId");
  const code = normalizeCatalogCode(input.code, "code");
  const name = normalizeName(input.name, "name", CATALOG_NAME_MAX.dietaryTag);
  const now = new Date();
  const id = randomUUID();

  try {
    await context.db.insert(catalogDietaryTagsTable).values({
      id,
      brandId,
      code,
      name,
      kind: input.kind,
      lifecycleStatus: "draft",
      createdAt: now,
      updatedAt: now,
      activatedAt: null,
      retiredAt: null,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new CatalogConflictError({
        message: "Dietary tag code already exists for this brand.",
      });
    }
    throw error;
  }

  const created = await findDietaryTagById(context, id);
  if (!created) throw new CatalogValidationError({ message: "Dietary tag create failed." });
  return created;
}

export async function updateDietaryTag(
  context: PersistenceTransactionContext,
  input: UpdateDietaryTagInput,
): Promise<CatalogDietaryTag> {
  assertTransactionContext(context, "updateDietaryTag");
  const existing = await findDietaryTagById(context, input.dietaryTagId);
  if (!existing) throw new CatalogNotFoundError("dietary_tag");
  if (existing.lifecycleStatus === "retired") {
    throw new CatalogInvalidStateError({ message: "Cannot update a retired dietary tag." });
  }
  await requireCatalogManage(context, input.actor, existing.brandId);

  if (input.name === undefined) {
    throw new CatalogValidationError({ message: "updateDietaryTag requires name." });
  }

  const name = normalizeName(input.name, "name", CATALOG_NAME_MAX.dietaryTag);
  await context.db
    .update(catalogDietaryTagsTable)
    .set({ name, updatedAt: new Date() })
    .where(eq(catalogDietaryTagsTable.id, existing.id));

  const updated = await findDietaryTagById(context, existing.id);
  if (!updated) throw new CatalogNotFoundError("dietary_tag");
  return updated;
}

export async function activateDietaryTag(
  context: PersistenceTransactionContext,
  input: DietaryTagLifecycleInput,
): Promise<CatalogDietaryTag> {
  assertTransactionContext(context, "activateDietaryTag");
  const existing = await findDietaryTagById(context, input.dietaryTagId);
  if (!existing) throw new CatalogNotFoundError("dietary_tag");
  await requireCatalogManage(context, input.actor, existing.brandId);

  assertCanTransition(existing.lifecycleStatus, "active");
  const stamps = activationTimestamps();
  await context.db
    .update(catalogDietaryTagsTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
    })
    .where(eq(catalogDietaryTagsTable.id, existing.id));

  const updated = await findDietaryTagById(context, existing.id);
  if (!updated) throw new CatalogNotFoundError("dietary_tag");
  return updated;
}

export async function retireDietaryTag(
  context: PersistenceTransactionContext,
  input: DietaryTagLifecycleInput,
): Promise<CatalogDietaryTag> {
  assertTransactionContext(context, "retireDietaryTag");
  const existing = await findDietaryTagById(context, input.dietaryTagId);
  if (!existing) throw new CatalogNotFoundError("dietary_tag");
  await requireCatalogManage(context, input.actor, existing.brandId);

  assertCanTransition(existing.lifecycleStatus, "retired");

  const activeAssignments = await countActiveAssignments(context, existing.id);
  if (activeAssignments > 0) {
    throw new CatalogInvalidStateError({
      message: "Cannot retire a dietary tag that still has active assignments.",
    });
  }

  const stamps = retirementTimestamps(existing.lifecycleStatus, existing.activatedAt);
  await context.db
    .update(catalogDietaryTagsTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
    })
    .where(eq(catalogDietaryTagsTable.id, existing.id));

  const updated = await findDietaryTagById(context, existing.id);
  if (!updated) throw new CatalogNotFoundError("dietary_tag");
  return updated;
}

export async function assignDietaryTag(
  context: PersistenceTransactionContext,
  input: AssignDietaryTagInput,
): Promise<CatalogDietaryAssignment> {
  assertTransactionContext(context, "assignDietaryTag");
  const tag = await findDietaryTagById(context, input.dietaryTagId);
  if (!tag) throw new CatalogNotFoundError("dietary_tag");
  if (tag.lifecycleStatus === "retired") {
    throw new CatalogInvalidStateError({ message: "Cannot assign a retired dietary tag." });
  }

  if (input.targetType !== "variant" && input.targetType !== "modifier_option") {
    throw new CatalogValidationError({
      message: "targetType must be variant or modifier_option.",
    });
  }

  const targetId = assertUuid(input.targetId, "targetId");
  let brandId = tag.brandId;

  if (input.targetType === "variant") {
    const variant = await findVariantById(context, targetId);
    if (!variant) throw new CatalogNotFoundError("variant");
    if (variant.brandId !== tag.brandId) {
      throw new CatalogValidationError({ message: "Dietary tag and variant must share a brand." });
    }
    brandId = variant.brandId;
  } else {
    const option = await findModifierOptionById(context, targetId);
    if (!option) throw new CatalogNotFoundError("modifier_option");
    if (option.brandId !== tag.brandId) {
      throw new CatalogValidationError({
        message: "Dietary tag and modifier option must share a brand.",
      });
    }
    brandId = option.brandId;
  }

  await requireCatalogManage(context, input.actor, brandId);

  const now = new Date();
  const id = randomUUID();

  try {
    if (input.targetType === "variant") {
      await context.db.insert(catalogVariantDietaryTagsTable).values({
        id,
        brandId,
        targetId,
        dietaryTagId: tag.id,
        assignedAt: now,
        retiredAt: null,
      });
    } else {
      await context.db.insert(catalogModifierOptionDietaryTagsTable).values({
        id,
        brandId,
        targetId,
        dietaryTagId: tag.id,
        assignedAt: now,
        retiredAt: null,
      });
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new CatalogConflictError({
        message: "An active assignment for this target and dietary tag already exists.",
      });
    }
    throw error;
  }

  if (input.targetType === "variant") {
    const rows = await context.db
      .select()
      .from(catalogVariantDietaryTagsTable)
      .where(eq(catalogVariantDietaryTagsTable.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) throw new CatalogValidationError({ message: "Dietary assignment create failed." });
    return rowToVariantAssignment(row);
  }

  const rows = await context.db
    .select()
    .from(catalogModifierOptionDietaryTagsTable)
    .where(eq(catalogModifierOptionDietaryTagsTable.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) throw new CatalogValidationError({ message: "Dietary assignment create failed." });
  return rowToOptionAssignment(row);
}

export async function retireDietaryAssignment(
  context: PersistenceTransactionContext,
  input: RetireDietaryAssignmentInput,
): Promise<CatalogDietaryAssignment> {
  assertTransactionContext(context, "retireDietaryAssignment");
  const assignmentId = assertUuid(input.assignmentId, "assignmentId");

  if (input.targetType === "variant") {
    const rows = await context.db
      .select()
      .from(catalogVariantDietaryTagsTable)
      .where(eq(catalogVariantDietaryTagsTable.id, assignmentId))
      .limit(1);
    const row = rows[0];
    if (!row) throw new CatalogNotFoundError("dietary_assignment");
    if (row.retiredAt !== null) {
      throw new CatalogInvalidStateError({ message: "Dietary assignment is already retired." });
    }
    await requireCatalogManage(context, input.actor, row.brandId);
    const now = new Date();
    await context.db
      .update(catalogVariantDietaryTagsTable)
      .set({ retiredAt: now })
      .where(eq(catalogVariantDietaryTagsTable.id, assignmentId));
    return rowToVariantAssignment({ ...row, retiredAt: now });
  }

  if (input.targetType === "modifier_option") {
    const rows = await context.db
      .select()
      .from(catalogModifierOptionDietaryTagsTable)
      .where(eq(catalogModifierOptionDietaryTagsTable.id, assignmentId))
      .limit(1);
    const row = rows[0];
    if (!row) throw new CatalogNotFoundError("dietary_assignment");
    if (row.retiredAt !== null) {
      throw new CatalogInvalidStateError({ message: "Dietary assignment is already retired." });
    }
    await requireCatalogManage(context, input.actor, row.brandId);
    const now = new Date();
    await context.db
      .update(catalogModifierOptionDietaryTagsTable)
      .set({ retiredAt: now })
      .where(eq(catalogModifierOptionDietaryTagsTable.id, assignmentId));
    return rowToOptionAssignment({ ...row, retiredAt: now });
  }

  throw new CatalogValidationError({
    message: "targetType must be variant or modifier_option.",
  });
}
