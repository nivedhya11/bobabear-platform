/**
 * Legal entity repository + commands (IMP-011).
 */
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { legalEntitiesTable } from "../../platform/database/schema/organizations";
import { insertAccessAuditEvent } from "../access-control/audit";
import type { PersistenceQueryContext, PersistenceTransactionContext } from "../persistence/types";
import {
  assertApplicationRole,
  assertTransactionContext,
  isForeignKeyViolation,
  isUniqueViolation,
  normalizeNonEmptyCode,
  normalizeNonEmptyName,
} from "./assert-role";
import { OrganizationConflictError, OrganizationNotFoundError, OrganizationValidationError } from "./errors";
import { findOrganizationById } from "./organizations";
import type { CreateLegalEntityInput, LegalEntity, UpdateLegalEntityInput } from "./types";

function rowToLegalEntity(row: typeof legalEntitiesTable.$inferSelect): LegalEntity {
  return {
    id: row.id,
    brandId: row.brandId,
    organizationId: row.organizationId,
    code: row.code,
    name: row.name,
    status: row.status as LegalEntity["status"],
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export async function findLegalEntityById(
  context: PersistenceQueryContext,
  legalEntityId: string,
): Promise<LegalEntity | null> {
  assertApplicationRole(context, "findLegalEntityById");
  if (typeof legalEntityId !== "string" || legalEntityId.length === 0) {
    throw new OrganizationValidationError({
      message: "legalEntityId must be a non-empty string.",
    });
  }
  const rows = await context.db
    .select()
    .from(legalEntitiesTable)
    .where(eq(legalEntitiesTable.id, legalEntityId))
    .limit(1);
  const row = rows[0];
  return row ? rowToLegalEntity(row) : null;
}

export async function createLegalEntity(
  context: PersistenceTransactionContext,
  input: CreateLegalEntityInput,
): Promise<LegalEntity> {
  assertTransactionContext(context, "createLegalEntity");
  const code = normalizeNonEmptyCode(input.code, "code");
  const name = normalizeNonEmptyName(input.name, "name");
  const status = input.status ?? "active";
  if (status !== "active" && status !== "inactive") {
    throw new OrganizationValidationError({ message: "status must be active or inactive." });
  }

  const organization = await findOrganizationById(context, input.organizationId);
  if (!organization) {
    throw new OrganizationNotFoundError("organization");
  }
  if (organization.brandId !== input.brandId) {
    throw new OrganizationValidationError({
      message: "legal entity brandId must match organization brandId.",
    });
  }

  const now = new Date();
  const id = randomUUID();
  try {
    await context.db.insert(legalEntitiesTable).values({
      id,
      brandId: input.brandId,
      organizationId: input.organizationId,
      code,
      name,
      status,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new OrganizationConflictError({
        message: "Legal entity code already exists for organization.",
      });
    }
    if (isForeignKeyViolation(error)) {
      throw new OrganizationNotFoundError("organization");
    }
    throw error;
  }

  await insertAccessAuditEvent(context, {
    actorWorkforceUserId: input.actorWorkforceUserId ?? null,
    action: "legal_entity.created",
    targetType: "legal_entity",
    targetId: id,
    scopeType: "organization",
    brandId: input.brandId,
    organizationId: input.organizationId,
    metadata: { code },
  });

  const created = await findLegalEntityById(context, id);
  if (!created) {
    throw new OrganizationValidationError({ message: "Legal entity create failed to persist." });
  }
  return created;
}

export async function updateLegalEntity(
  context: PersistenceTransactionContext,
  input: UpdateLegalEntityInput,
): Promise<LegalEntity> {
  assertTransactionContext(context, "updateLegalEntity");
  if (typeof input.legalEntityId !== "string" || input.legalEntityId.length === 0) {
    throw new OrganizationValidationError({
      message: "legalEntityId must be a non-empty string.",
    });
  }
  if (input.name === undefined && input.status === undefined) {
    throw new OrganizationValidationError({
      message: "updateLegalEntity requires name and/or status.",
    });
  }

  const existing = await findLegalEntityById(context, input.legalEntityId);
  if (!existing) {
    throw new OrganizationNotFoundError("legal_entity");
  }

  const name = input.name !== undefined ? normalizeNonEmptyName(input.name, "name") : existing.name;
  const status = input.status ?? existing.status;
  if (status !== "active" && status !== "inactive") {
    throw new OrganizationValidationError({ message: "status must be active or inactive." });
  }

  const now = new Date();
  await context.db
    .update(legalEntitiesTable)
    .set({ name, status, updatedAt: now })
    .where(eq(legalEntitiesTable.id, input.legalEntityId));

  await insertAccessAuditEvent(context, {
    actorWorkforceUserId: input.actorWorkforceUserId ?? null,
    action: "legal_entity.updated",
    targetType: "legal_entity",
    targetId: input.legalEntityId,
    scopeType: "organization",
    brandId: existing.brandId,
    organizationId: existing.organizationId,
    metadata: {},
  });

  const updated = await findLegalEntityById(context, input.legalEntityId);
  if (!updated) {
    throw new OrganizationNotFoundError("legal_entity");
  }
  return updated;
}
