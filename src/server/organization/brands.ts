/**
 * Brand repository + commands (IMP-011).
 */
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

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
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
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
  if (input.name === undefined && input.status === undefined) {
    throw new OrganizationValidationError({ message: "updateBrand requires name and/or status." });
  }

  const existing = await findBrandById(context, input.brandId);
  if (!existing) {
    throw new OrganizationNotFoundError("brand");
  }

  const name = input.name !== undefined ? normalizeNonEmptyName(input.name, "name") : existing.name;
  const status = input.status ?? existing.status;
  if (status !== "active" && status !== "inactive") {
    throw new OrganizationValidationError({ message: "status must be active or inactive." });
  }

  const now = new Date();
  await context.db
    .update(brandsTable)
    .set({ name, status, updatedAt: now })
    .where(eq(brandsTable.id, input.brandId));

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
