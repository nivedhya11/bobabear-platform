/**
 * Append-only catalog mutation audit helper (IMP-036F).
 */
import { randomUUID } from "node:crypto";

import {
  CATALOG_AUDIT_ACTIONS,
  type CatalogAuditAction,
} from "../../shared/catalog";
import { catalogMutationAuditEventsTable } from "../../platform/database/schema/catalog";
import type { PersistenceTransactionContext } from "../persistence/types";
import { assertTransactionContext } from "./assert-role";
import { CatalogValidationError } from "./errors";

export type InsertCatalogMutationAuditEventInput = Readonly<{
  actorWorkforceUserId?: string | null;
  action: CatalogAuditAction;
  brandId: string;
  targetType: string;
  targetId?: string | null;
  previousContentRevision?: bigint | null;
  newContentRevision?: bigint | null;
  previousEnvelopeRevision?: bigint | null;
  newEnvelopeRevision?: bigint | null;
  metadata?: Readonly<Record<string, unknown>>;
  occurredAt?: Date;
}>;

function isSafeMetadata(value: unknown): value is Record<string, unknown> {
  if (value === undefined) return true;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  for (const [key, entry] of Object.entries(value)) {
    if (typeof key !== "string" || key.length === 0) return false;
    const t = typeof entry;
    if (entry !== null && t !== "string" && t !== "number" && t !== "boolean") {
      return false;
    }
  }
  return true;
}

export async function insertCatalogMutationAuditEvent(
  context: PersistenceTransactionContext,
  input: InsertCatalogMutationAuditEventInput,
): Promise<{ id: string }> {
  assertTransactionContext(context, "insertCatalogMutationAuditEvent");

  if (!(CATALOG_AUDIT_ACTIONS as readonly string[]).includes(input.action)) {
    throw new CatalogValidationError({ message: "Unknown catalog audit action." });
  }
  if (typeof input.brandId !== "string" || input.brandId.length === 0) {
    throw new CatalogValidationError({ message: "brandId must be a non-empty string." });
  }
  if (typeof input.targetType !== "string" || input.targetType.trim().length === 0) {
    throw new CatalogValidationError({ message: "targetType must be a non-empty string." });
  }
  if (!isSafeMetadata(input.metadata)) {
    throw new CatalogValidationError({
      message: "audit metadata must be a flat object of safe primitive values.",
    });
  }

  const id = randomUUID();
  const occurredAt = input.occurredAt ?? new Date();

  await context.db.insert(catalogMutationAuditEventsTable).values({
    id,
    occurredAt,
    actorWorkforceUserId: input.actorWorkforceUserId ?? null,
    action: input.action,
    brandId: input.brandId,
    targetType: input.targetType.trim(),
    targetId: input.targetId ?? null,
    previousContentRevision: input.previousContentRevision ?? null,
    newContentRevision: input.newContentRevision ?? null,
    previousEnvelopeRevision: input.previousEnvelopeRevision ?? null,
    newEnvelopeRevision: input.newEnvelopeRevision ?? null,
    metadata: { ...(input.metadata ?? {}) },
  });

  return { id };
}
