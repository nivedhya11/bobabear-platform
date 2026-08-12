/**
 * Append-only assortment/availability audit helper (IMP-014).
 */
import { randomUUID } from "node:crypto";

import {
  ASSORTMENT_AUDIT_ACTIONS,
  type AssortmentAuditAction,
} from "../../shared/assortment";
import { assortmentAvailabilityAuditEventsTable } from "../../platform/database/schema/assortment";
import type { PersistenceTransactionContext } from "../persistence/types";
import { assertTransactionContext } from "./assert-role";
import { AssortmentValidationError } from "./errors";

export type InsertAssortmentAuditEventInput = Readonly<{
  actorWorkforceUserId?: string | null;
  action: AssortmentAuditAction;
  brandId: string;
  territoryId?: string | null;
  organizationId?: string | null;
  outletId?: string | null;
  targetType: string;
  targetId?: string | null;
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

export async function insertAssortmentAuditEvent(
  context: PersistenceTransactionContext,
  input: InsertAssortmentAuditEventInput,
): Promise<{ id: string }> {
  assertTransactionContext(context, "insertAssortmentAuditEvent");

  if (!(ASSORTMENT_AUDIT_ACTIONS as readonly string[]).includes(input.action)) {
    throw new AssortmentValidationError({ message: "Unknown audit action." });
  }
  if (typeof input.brandId !== "string" || input.brandId.length === 0) {
    throw new AssortmentValidationError({ message: "brandId must be a non-empty string." });
  }
  if (typeof input.targetType !== "string" || input.targetType.trim().length === 0) {
    throw new AssortmentValidationError({ message: "targetType must be a non-empty string." });
  }
  if (!isSafeMetadata(input.metadata)) {
    throw new AssortmentValidationError({
      message: "audit metadata must be a flat object of safe primitive values.",
    });
  }

  const id = randomUUID();
  const occurredAt = input.occurredAt ?? new Date();

  await context.db.insert(assortmentAvailabilityAuditEventsTable).values({
    id,
    occurredAt,
    actorWorkforceUserId: input.actorWorkforceUserId ?? null,
    action: input.action,
    brandId: input.brandId,
    territoryId: input.territoryId ?? null,
    organizationId: input.organizationId ?? null,
    outletId: input.outletId ?? null,
    targetType: input.targetType.trim(),
    targetId: input.targetId ?? null,
    metadata: { ...(input.metadata ?? {}) },
  });

  return { id };
}
