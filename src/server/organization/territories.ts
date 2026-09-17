/**
 * Territory repository + commands (IMP-011).
 */
import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { territoriesTable } from "../../platform/database/schema/organizations";
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
import { findBrandById } from "./brands";
import { OrganizationConflictError, OrganizationNotFoundError, OrganizationValidationError } from "./errors";
import type { CreateTerritoryInput, Territory, UpdateTerritoryInput } from "./types";

function rowToTerritory(row: typeof territoriesTable.$inferSelect): Territory {
  return {
    id: row.id,
    brandId: row.brandId,
    code: row.code,
    name: row.name,
    status: row.status as Territory["status"],
    revision: row.revision,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function staleTerritoryRevision(): never {
  throw new OrganizationConflictError({ message: "Territory revision is stale." });
}

export async function findTerritoryById(
  context: PersistenceQueryContext,
  territoryId: string,
): Promise<Territory | null> {
  assertApplicationRole(context, "findTerritoryById");
  if (typeof territoryId !== "string" || territoryId.length === 0) {
    throw new OrganizationValidationError({ message: "territoryId must be a non-empty string." });
  }
  const rows = await context.db
    .select()
    .from(territoriesTable)
    .where(eq(territoriesTable.id, territoryId))
    .limit(1);
  const row = rows[0];
  return row ? rowToTerritory(row) : null;
}

export async function createTerritory(
  context: PersistenceTransactionContext,
  input: CreateTerritoryInput,
): Promise<Territory> {
  assertTransactionContext(context, "createTerritory");
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
    await context.db.insert(territoriesTable).values({
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
      throw new OrganizationConflictError({ message: "Territory code already exists for brand." });
    }
    if (isForeignKeyViolation(error)) {
      throw new OrganizationNotFoundError("brand");
    }
    throw error;
  }

  await insertAccessAuditEvent(context, {
    actorWorkforceUserId: input.actorWorkforceUserId ?? null,
    action: "territory.created",
    targetType: "territory",
    targetId: id,
    scopeType: "territory",
    brandId: input.brandId,
    territoryId: id,
    metadata: { code },
  });

  const created = await findTerritoryById(context, id);
  if (!created) {
    throw new OrganizationValidationError({ message: "Territory create failed to persist." });
  }
  return created;
}

export async function updateTerritory(
  context: PersistenceTransactionContext,
  input: UpdateTerritoryInput,
): Promise<Territory> {
  assertTransactionContext(context, "updateTerritory");
  if (typeof input.territoryId !== "string" || input.territoryId.length === 0) {
    throw new OrganizationValidationError({ message: "territoryId must be a non-empty string." });
  }
  if (typeof input.expectedRevision !== "bigint") {
    throw new OrganizationValidationError({ message: "expectedRevision must be a bigint." });
  }
  if (input.name === undefined && input.status === undefined) {
    throw new OrganizationValidationError({
      message: "updateTerritory requires name and/or status.",
    });
  }

  const existing = await findTerritoryById(context, input.territoryId);
  if (!existing) {
    throw new OrganizationNotFoundError("territory");
  }
  if (existing.revision !== input.expectedRevision) {
    staleTerritoryRevision();
  }

  const name = input.name !== undefined ? normalizeNonEmptyName(input.name, "name") : existing.name;
  const status = input.status ?? existing.status;
  if (status !== "active" && status !== "inactive") {
    throw new OrganizationValidationError({ message: "status must be active or inactive." });
  }

  const now = new Date();
  const nextRevision = existing.revision + BigInt(1);
  const updatedRows = await context.db
    .update(territoriesTable)
    .set({ name, status, revision: nextRevision, updatedAt: now })
    .where(
      and(
        eq(territoriesTable.id, input.territoryId),
        eq(territoriesTable.revision, input.expectedRevision),
      ),
    )
    .returning();
  if (!updatedRows[0]) {
    staleTerritoryRevision();
  }

  await insertAccessAuditEvent(context, {
    actorWorkforceUserId: input.actorWorkforceUserId ?? null,
    action: "territory.updated",
    targetType: "territory",
    targetId: input.territoryId,
    scopeType: "territory",
    brandId: existing.brandId,
    territoryId: input.territoryId,
    metadata: {},
  });

  const updated = await findTerritoryById(context, input.territoryId);
  if (!updated) {
    throw new OrganizationNotFoundError("territory");
  }
  return updated;
}
