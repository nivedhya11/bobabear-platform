/**
 * Append-only access-control audit helper (IMP-011).
 *
 * Importable from organization commands without pulling authorize/membership
 * (avoids circular imports). Does not authorize — callers decide.
 */
import { randomUUID } from "node:crypto";

import {
  ACCESS_AUDIT_ACTIONS,
  type AccessAuditAction,
  type AccessScopeType,
} from "../../shared/access-control";
import { accessControlAuditEventsTable } from "../../platform/database/schema/access-control";
import type { PersistenceTransactionContext } from "../persistence/types";
import { assertTransactionContext } from "./assert-role";
import { AccessControlValidationError } from "./errors";

export type InsertAccessAuditEventInput = Readonly<{
  actorWorkforceUserId?: string | null;
  action: AccessAuditAction;
  targetType: string;
  targetId: string;
  scopeType?: AccessScopeType | null;
  brandId?: string | null;
  organizationId?: string | null;
  territoryId?: string | null;
  outletId?: string | null;
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

export async function insertAccessAuditEvent(
  context: PersistenceTransactionContext,
  input: InsertAccessAuditEventInput,
): Promise<{ id: string }> {
  assertTransactionContext(context, "insertAccessAuditEvent");

  if (!(ACCESS_AUDIT_ACTIONS as readonly string[]).includes(input.action)) {
    throw new AccessControlValidationError({ message: "Unknown audit action." });
  }
  if (typeof input.targetType !== "string" || input.targetType.trim().length === 0) {
    throw new AccessControlValidationError({ message: "targetType must be a non-empty string." });
  }
  if (typeof input.targetId !== "string" || input.targetId.trim().length === 0) {
    throw new AccessControlValidationError({ message: "targetId must be a non-empty string." });
  }
  if (!isSafeMetadata(input.metadata)) {
    throw new AccessControlValidationError({
      message: "audit metadata must be a flat object of safe primitive values.",
    });
  }

  const id = randomUUID();
  const occurredAt = input.occurredAt ?? new Date();

  await context.db.insert(accessControlAuditEventsTable).values({
    id,
    occurredAt,
    actorWorkforceUserId: input.actorWorkforceUserId ?? null,
    action: input.action,
    targetType: input.targetType.trim(),
    targetId: input.targetId.trim(),
    scopeType: input.scopeType ?? null,
    brandId: input.brandId ?? null,
    organizationId: input.organizationId ?? null,
    territoryId: input.territoryId ?? null,
    outletId: input.outletId ?? null,
    metadata: { ...(input.metadata ?? {}) },
  });

  return { id };
}
