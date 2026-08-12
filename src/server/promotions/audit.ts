/**
 * Append-only promotion audit helper (IMP-016).
 */
import { randomUUID } from "node:crypto";

import {
  PROMOTION_AUDIT_ACTIONS,
  type PromotionAuditAction,
} from "../../shared/promotions";
import { promotionAuditEventsTable } from "../../platform/database/schema/promotions";
import type { PersistenceTransactionContext } from "../persistence/types";
import { assertTransactionContext } from "./assert-role";
import { PromotionValidationError } from "./errors";

export type InsertPromotionAuditEventInput = Readonly<{
  actorWorkforceUserId?: string | null;
  permissionKey?: string | null;
  action: PromotionAuditAction;
  resourceType: string;
  resourceId?: string | null;
  brandId?: string | null;
  territoryId?: string | null;
  organizationId?: string | null;
  outletId?: string | null;
  configurationFingerprint?: string | null;
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

export async function insertPromotionAuditEvent(
  context: PersistenceTransactionContext,
  input: InsertPromotionAuditEventInput,
): Promise<{ id: string }> {
  assertTransactionContext(context, "insertPromotionAuditEvent");

  if (!(PROMOTION_AUDIT_ACTIONS as readonly string[]).includes(input.action)) {
    throw new PromotionValidationError("Unknown audit action.");
  }
  if (typeof input.resourceType !== "string" || input.resourceType.trim().length === 0) {
    throw new PromotionValidationError("resourceType must be a non-empty string.");
  }
  if (!isSafeMetadata(input.metadata)) {
    throw new PromotionValidationError(
      "audit metadata must be a flat object of safe primitive values.",
    );
  }
  // Never persist raw coupon codes in audit metadata.
  if (input.metadata && "canonicalCode" in input.metadata) {
    throw new PromotionValidationError("audit metadata must not include canonicalCode.");
  }

  const id = randomUUID();
  await context.db.insert(promotionAuditEventsTable).values({
    id,
    occurredAt: input.occurredAt ?? new Date(),
    actorWorkforceUserId: input.actorWorkforceUserId ?? null,
    permissionKey: input.permissionKey ?? null,
    action: input.action,
    resourceType: input.resourceType.trim(),
    resourceId: input.resourceId ?? null,
    brandId: input.brandId ?? null,
    territoryId: input.territoryId ?? null,
    organizationId: input.organizationId ?? null,
    outletId: input.outletId ?? null,
    configurationFingerprint: input.configurationFingerprint ?? null,
    metadata: { ...(input.metadata ?? {}) },
  });

  return { id };
}
