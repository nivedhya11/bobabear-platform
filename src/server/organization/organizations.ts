/**
 * Organization repository + commands (IMP-011).
 */
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { organizationsTable } from "../../platform/database/schema/organizations";
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
import { findBrandById } from "./brands";
import type {
  CreateOrganizationInput,
  Organization,
  UpdateOrganizationInput,
} from "./types";

function rowToOrganization(row: typeof organizationsTable.$inferSelect): Organization {
  return {
    id: row.id,
    brandId: row.brandId,
    code: row.code,
    name: row.name,
    status: row.status as Organization["status"],
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export async function findOrganizationById(
  context: PersistenceQueryContext,
  organizationId: string,
): Promise<Organization | null> {
  assertApplicationRole(context, "findOrganizationById");
  if (typeof organizationId !== "string" || organizationId.length === 0) {
    throw new OrganizationValidationError({
      message: "organizationId must be a non-empty string.",
    });
  }
  const rows = await context.db
    .select()
    .from(organizationsTable)
    .where(eq(organizationsTable.id, organizationId))
    .limit(1);
  const row = rows[0];
  return row ? rowToOrganization(row) : null;
}

export async function createOrganization(
  context: PersistenceTransactionContext,
  input: CreateOrganizationInput,
): Promise<Organization> {
  assertTransactionContext(context, "createOrganization");
  const code = normalizeNonEmptyCode(input.code, "code");
  const name = normalizeNonEmptyName(input.name, "name");
  const status = input.status ?? "active";
  if (status !== "active" && status !== "inactive") {
    throw new OrganizationValidationError({ message: "status must be active or inactive." });
  }

  const brand = await findBrandById(context, input.brandId);
  if (!brand) {
    throw new OrganizationNotFoundError("brand");
  }

  const now = new Date();
  const id = randomUUID();
  try {
    await context.db.insert(organizationsTable).values({
      id,
      brandId: input.brandId,
      code,
      name,
      status,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new OrganizationConflictError({ message: "Organization code already exists for brand." });
    }
    if (isForeignKeyViolation(error)) {
      throw new OrganizationNotFoundError("brand");
    }
    throw error;
  }

  await insertAccessAuditEvent(context, {
    actorWorkforceUserId: input.actorWorkforceUserId ?? null,
    action: "organization.created",
    targetType: "organization",
    targetId: id,
    scopeType: "organization",
    brandId: input.brandId,
    organizationId: id,
    metadata: { code },
  });

  const created = await findOrganizationById(context, id);
  if (!created) {
    throw new OrganizationValidationError({ message: "Organization create failed to persist." });
  }
  return created;
}

export async function updateOrganization(
  context: PersistenceTransactionContext,
  input: UpdateOrganizationInput,
): Promise<Organization> {
  assertTransactionContext(context, "updateOrganization");
  if (typeof input.organizationId !== "string" || input.organizationId.length === 0) {
    throw new OrganizationValidationError({
      message: "organizationId must be a non-empty string.",
    });
  }
  if (input.name === undefined && input.status === undefined) {
    throw new OrganizationValidationError({
      message: "updateOrganization requires name and/or status.",
    });
  }

  const existing = await findOrganizationById(context, input.organizationId);
  if (!existing) {
    throw new OrganizationNotFoundError("organization");
  }

  const name = input.name !== undefined ? normalizeNonEmptyName(input.name, "name") : existing.name;
  const status = input.status ?? existing.status;
  if (status !== "active" && status !== "inactive") {
    throw new OrganizationValidationError({ message: "status must be active or inactive." });
  }

  const now = new Date();
  await context.db
    .update(organizationsTable)
    .set({ name, status, updatedAt: now })
    .where(eq(organizationsTable.id, input.organizationId));

  await insertAccessAuditEvent(context, {
    actorWorkforceUserId: input.actorWorkforceUserId ?? null,
    action: "organization.updated",
    targetType: "organization",
    targetId: input.organizationId,
    scopeType: "organization",
    brandId: existing.brandId,
    organizationId: input.organizationId,
    metadata: {},
  });

  const updated = await findOrganizationById(context, input.organizationId);
  if (!updated) {
    throw new OrganizationNotFoundError("organization");
  }
  return updated;
}
