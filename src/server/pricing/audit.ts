/**
 * Append-only pricing/tax audit helper (IMP-015).
 */
import { randomUUID } from "node:crypto";

import {
  PRICING_TAX_AUDIT_ACTIONS,
  type PricingTaxAuditAction,
} from "../../shared/pricing";
import { pricingTaxAuditEventsTable } from "../../platform/database/schema/pricing";
import type { PersistenceTransactionContext } from "../persistence/types";
import { assertTransactionContext } from "./assert-role";
import { PricingValidationError } from "./errors";

export type InsertPricingTaxAuditEventInput = Readonly<{
  actorWorkforceUserId?: string | null;
  action: PricingTaxAuditAction;
  brandId?: string | null;
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

export async function insertPricingTaxAuditEvent(
  context: PersistenceTransactionContext,
  input: InsertPricingTaxAuditEventInput,
): Promise<{ id: string }> {
  assertTransactionContext(context, "insertPricingTaxAuditEvent");

  if (!(PRICING_TAX_AUDIT_ACTIONS as readonly string[]).includes(input.action)) {
    throw new PricingValidationError({ message: "Unknown audit action." });
  }
  if (typeof input.targetType !== "string" || input.targetType.trim().length === 0) {
    throw new PricingValidationError({ message: "targetType must be a non-empty string." });
  }
  if (!isSafeMetadata(input.metadata)) {
    throw new PricingValidationError({
      message: "audit metadata must be a flat object of safe primitive values.",
    });
  }

  const id = randomUUID();
  const occurredAt = input.occurredAt ?? new Date();

  await context.db.insert(pricingTaxAuditEventsTable).values({
    id,
    occurredAt,
    actorWorkforceUserId: input.actorWorkforceUserId ?? null,
    action: input.action,
    brandId: input.brandId ?? null,
    territoryId: input.territoryId ?? null,
    organizationId: input.organizationId ?? null,
    outletId: input.outletId ?? null,
    targetType: input.targetType.trim(),
    targetId: input.targetId ?? null,
    metadata: { ...(input.metadata ?? {}) },
  });

  return { id };
}
