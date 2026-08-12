/**
 * Outlet repository + commands (IMP-011).
 */
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { outletsTable } from "../../platform/database/schema/organizations";
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
import { findLegalEntityById } from "./legal-entities";
import { findOrganizationById } from "./organizations";
import { findTerritoryById } from "./territories";
import type { CreateOutletInput, Outlet, UpdateOutletInput } from "./types";

function rowToOutlet(row: typeof outletsTable.$inferSelect): Outlet {
  return {
    id: row.id,
    brandId: row.brandId,
    organizationId: row.organizationId,
    territoryId: row.territoryId,
    legalEntityId: row.legalEntityId,
    code: row.code,
    name: row.name,
    status: row.status as Outlet["status"],
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export async function findOutletById(
  context: PersistenceQueryContext,
  outletId: string,
): Promise<Outlet | null> {
  assertApplicationRole(context, "findOutletById");
  if (typeof outletId !== "string" || outletId.length === 0) {
    throw new OrganizationValidationError({ message: "outletId must be a non-empty string." });
  }
  const rows = await context.db
    .select()
    .from(outletsTable)
    .where(eq(outletsTable.id, outletId))
    .limit(1);
  const row = rows[0];
  return row ? rowToOutlet(row) : null;
}

export async function createOutlet(
  context: PersistenceTransactionContext,
  input: CreateOutletInput,
): Promise<Outlet> {
  assertTransactionContext(context, "createOutlet");
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
      message: "outlet brandId must match organization brandId.",
    });
  }

  const territory = await findTerritoryById(context, input.territoryId);
  if (!territory) {
    throw new OrganizationNotFoundError("territory");
  }
  if (territory.brandId !== input.brandId) {
    throw new OrganizationValidationError({
      message: "outlet brandId must match territory brandId.",
    });
  }

  const legalEntity = await findLegalEntityById(context, input.legalEntityId);
  if (!legalEntity) {
    throw new OrganizationNotFoundError("legal_entity");
  }
  if (
    legalEntity.brandId !== input.brandId ||
    legalEntity.organizationId !== input.organizationId
  ) {
    throw new OrganizationValidationError({
      message: "outlet legal entity must belong to the same brand and organization.",
    });
  }

  const now = new Date();
  const id = randomUUID();
  try {
    await context.db.insert(outletsTable).values({
      id,
      brandId: input.brandId,
      organizationId: input.organizationId,
      territoryId: input.territoryId,
      legalEntityId: input.legalEntityId,
      code,
      name,
      status,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new OrganizationConflictError({ message: "Outlet code already exists for brand." });
    }
    if (isForeignKeyViolation(error)) {
      throw new OrganizationValidationError({
        message: "outlet ancestry references are invalid.",
      });
    }
    throw error;
  }

  await insertAccessAuditEvent(context, {
    actorWorkforceUserId: input.actorWorkforceUserId ?? null,
    action: "outlet.created",
    targetType: "outlet",
    targetId: id,
    scopeType: "outlet",
    brandId: input.brandId,
    organizationId: input.organizationId,
    territoryId: input.territoryId,
    outletId: id,
    metadata: { code },
  });

  const created = await findOutletById(context, id);
  if (!created) {
    throw new OrganizationValidationError({ message: "Outlet create failed to persist." });
  }
  return created;
}

export async function updateOutlet(
  context: PersistenceTransactionContext,
  input: UpdateOutletInput,
): Promise<Outlet> {
  assertTransactionContext(context, "updateOutlet");
  if (typeof input.outletId !== "string" || input.outletId.length === 0) {
    throw new OrganizationValidationError({ message: "outletId must be a non-empty string." });
  }
  if (input.name === undefined && input.status === undefined) {
    throw new OrganizationValidationError({
      message: "updateOutlet requires name and/or status.",
    });
  }

  const existing = await findOutletById(context, input.outletId);
  if (!existing) {
    throw new OrganizationNotFoundError("outlet");
  }

  const name = input.name !== undefined ? normalizeNonEmptyName(input.name, "name") : existing.name;
  const status = input.status ?? existing.status;
  if (status !== "active" && status !== "inactive") {
    throw new OrganizationValidationError({ message: "status must be active or inactive." });
  }

  const now = new Date();
  await context.db
    .update(outletsTable)
    .set({ name, status, updatedAt: now })
    .where(eq(outletsTable.id, input.outletId));

  await insertAccessAuditEvent(context, {
    actorWorkforceUserId: input.actorWorkforceUserId ?? null,
    action: "outlet.updated",
    targetType: "outlet",
    targetId: input.outletId,
    scopeType: "outlet",
    brandId: existing.brandId,
    organizationId: existing.organizationId,
    territoryId: existing.territoryId,
    outletId: input.outletId,
    metadata: {},
  });

  const updated = await findOutletById(context, input.outletId);
  if (!updated) {
    throw new OrganizationNotFoundError("outlet");
  }
  return updated;
}
