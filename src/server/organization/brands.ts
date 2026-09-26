/**
 * Brand repository + commands (IMP-011 / IMP-036G revision CAS).
 */
import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { brandsTable } from "../../platform/database/schema/organizations";
import { insertAccessAuditEvent } from "../access-control/audit";
import type { PersistenceQueryContext, PersistenceTransactionContext } from "../persistence/types";
import {
  assertApplicationRole,
  assertTransactionContext,
  isUniqueViolation,
  normalizeNonEmptyCode,
  normalizeNonEmptyName,
} from "./assert-role";
import { OrganizationConflictError, OrganizationNotFoundError, OrganizationValidationError } from "./errors";
import type { Brand, CreateBrandInput, UpdateBrandInput } from "./types";

function rowToBrand(row: typeof brandsTable.$inferSelect): Brand {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    status: row.status as Brand["status"],
    revision: row.revision,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function staleBrandRevision(): never {
  throw new OrganizationConflictError({ message: "Brand revision is stale." });
}

/**
 * Existing Brand-row lock. Payment bind holds this row while it re-reads
 * purchasable truth. Commercial, assortment, tax, and topology writers take
 * the same row before their own locks so they cannot commit in that window.
 */
export async function lockBrandRowForUpdate(
  context: PersistenceTransactionContext,
  brandId: string,
): Promise<void> {
  assertTransactionContext(context, "lockBrandRowForUpdate");
  const rows = await context.db
    .select({ id: brandsTable.id })
    .from(brandsTable)
    .where(eq(brandsTable.id, brandId))
    .for("update")
    .limit(1);
  if (!rows[0]) throw new OrganizationNotFoundError("brand");
}

export async function findBrandById(
  context: PersistenceQueryContext,
  brandId: string,
): Promise<Brand | null> {
  assertApplicationRole(context, "findBrandById");
  if (typeof brandId !== "string" || brandId.length === 0) {
    throw new OrganizationValidationError({ message: "brandId must be a non-empty string." });
  }
  const rows = await context.db.select().from(brandsTable).where(eq(brandsTable.id, brandId)).limit(1);
  const row = rows[0];
  return row ? rowToBrand(row) : null;
}

export async function createBrand(
  context: PersistenceTransactionContext,
  input: CreateBrandInput,
): Promise<Brand> {
  assertTransactionContext(context, "createBrand");
  const code = normalizeNonEmptyCode(input.code, "code");
  const name = normalizeNonEmptyName(input.name, "name");
  const status = input.status ?? "active";
  if (status !== "active" && status !== "inactive") {
    throw new OrganizationValidationError({ message: "status must be active or inactive." });
  }

  const now = new Date();
  const id = randomUUID();
  try {
    await context.db.insert(brandsTable).values({
      id,
      code,
      name,
      status,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new OrganizationConflictError({ message: "Brand code already exists." });
    }
    throw error;
  }

  await insertAccessAuditEvent(context, {
    actorWorkforceUserId: input.actorWorkforceUserId ?? null,
    action: "brand.created",
    targetType: "brand",
    targetId: id,
    scopeType: "brand",
    brandId: id,
    metadata: { code },
  });

  const created = await findBrandById(context, id);
  if (!created) {
    throw new OrganizationValidationError({ message: "Brand create failed to persist." });
  }
  return created;
}

export async function updateBrand(
  context: PersistenceTransactionContext,
  input: UpdateBrandInput,
): Promise<Brand> {
  assertTransactionContext(context, "updateBrand");
  if (typeof input.brandId !== "string" || input.brandId.length === 0) {
    throw new OrganizationValidationError({ message: "brandId must be a non-empty string." });
  }
  if (typeof input.expectedRevision !== "bigint") {
    throw new OrganizationValidationError({ message: "expectedRevision must be a bigint." });
  }
  if (input.name === undefined && input.status === undefined) {
    throw new OrganizationValidationError({ message: "updateBrand requires name and/or status." });
  }

  const existing = await findBrandById(context, input.brandId);
  if (!existing) {
    throw new OrganizationNotFoundError("brand");
  }
  if (existing.revision !== input.expectedRevision) {
    staleBrandRevision();
  }

  const name = input.name !== undefined ? normalizeNonEmptyName(input.name, "name") : existing.name;
  const status = input.status ?? existing.status;
  if (status !== "active" && status !== "inactive") {
    throw new OrganizationValidationError({ message: "status must be active or inactive." });
  }

  const now = new Date();
  const nextRevision = existing.revision + BigInt(1);
  const updatedRows = await context.db
    .update(brandsTable)
    .set({ name, status, revision: nextRevision, updatedAt: now })
    .where(and(eq(brandsTable.id, input.brandId), eq(brandsTable.revision, input.expectedRevision)))
    .returning();
  if (!updatedRows[0]) {
    staleBrandRevision();
  }

  await insertAccessAuditEvent(context, {
    actorWorkforceUserId: input.actorWorkforceUserId ?? null,
    action: "brand.updated",
    targetType: "brand",
    targetId: input.brandId,
    scopeType: "brand",
    brandId: input.brandId,
    metadata: {},
  });

  const updated = await findBrandById(context, input.brandId);
  if (!updated) {
    throw new OrganizationNotFoundError("brand");
  }
  return updated;
}
