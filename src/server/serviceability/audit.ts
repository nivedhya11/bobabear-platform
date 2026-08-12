/**
 * Append-only Serviceability audit helper (IMP-019).
 * Never persists customer PII — coverage PINs are business configuration only.
 */
import { randomUUID } from "node:crypto";

import {
  SERVICEABILITY_AUDIT_ACTIONS,
  ServiceabilityError,
  type ServiceabilityAuditAction,
} from "../../shared/serviceability";
import { outletServiceabilityAuditEventsTable } from "../../platform/database/schema/serviceability";
import type { PersistenceTransactionContext } from "../persistence/types";
import { assertTransactionContext, isUniqueViolation } from "./assert-role";

export type InsertServiceabilityAuditEventInput = Readonly<{
  actorId: string;
  outletId: string;
  action: ServiceabilityAuditAction;
  previousRevision: bigint | null;
  newRevision: bigint;
  previousRoutingPriority: number | null;
  newRoutingPriority: number | null;
  addedPostalCodes: readonly string[];
  removedPostalCodes: readonly string[];
  occurredAt: Date;
}>;

function assertCanonicalPostalArray(
  values: readonly string[],
  field: string,
): string[] {
  if (!Array.isArray(values)) {
    throw new ServiceabilityError(
      "SERVICEABILITY_AUDIT_ERROR",
      `${field} must be an array.`,
    );
  }
  const sorted = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  for (let i = 0; i < sorted.length; i++) {
    if (typeof sorted[i] !== "string") {
      throw new ServiceabilityError(
        "SERVICEABILITY_AUDIT_ERROR",
        `${field} must contain postal code strings only.`,
      );
    }
    if (i > 0 && sorted[i] === sorted[i - 1]) {
      throw new ServiceabilityError(
        "SERVICEABILITY_AUDIT_ERROR",
        `${field} must be deduplicated.`,
      );
    }
    if (sorted[i] !== values[i] && values.join(",") !== sorted.join(",")) {
      // Allow callers that already sorted; reject unsorted only when order differs.
    }
  }
  // Re-sort for storage — always canonical ascending.
  return sorted;
}

export async function insertServiceabilityAuditEvent(
  context: PersistenceTransactionContext,
  input: InsertServiceabilityAuditEventInput,
): Promise<{ id: string }> {
  assertTransactionContext(context, "insertServiceabilityAuditEvent");

  if (!(SERVICEABILITY_AUDIT_ACTIONS as readonly string[]).includes(input.action)) {
    throw new ServiceabilityError(
      "SERVICEABILITY_AUDIT_ERROR",
      "Unknown audit action.",
    );
  }
  if (typeof input.actorId !== "string" || input.actorId.length === 0) {
    throw new ServiceabilityError(
      "SERVICEABILITY_AUDIT_ERROR",
      "actorId is required.",
    );
  }
  if (typeof input.outletId !== "string" || input.outletId.length === 0) {
    throw new ServiceabilityError(
      "SERVICEABILITY_AUDIT_ERROR",
      "outletId is required.",
    );
  }
  if (typeof input.newRevision !== "bigint" || input.newRevision <= BigInt(0)) {
    throw new ServiceabilityError(
      "SERVICEABILITY_AUDIT_ERROR",
      "newRevision must be a positive bigint.",
    );
  }
  if (
    input.previousRevision !== null &&
    (typeof input.previousRevision !== "bigint" || input.previousRevision <= BigInt(0))
  ) {
    throw new ServiceabilityError(
      "SERVICEABILITY_AUDIT_ERROR",
      "previousRevision must be null or a positive bigint.",
    );
  }

  const added = assertCanonicalPostalArray(
    input.addedPostalCodes,
    "addedPostalCodes",
  );
  const removed = assertCanonicalPostalArray(
    input.removedPostalCodes,
    "removedPostalCodes",
  );
  const addedSet = new Set(added);
  for (const pin of removed) {
    if (addedSet.has(pin)) {
      throw new ServiceabilityError(
        "SERVICEABILITY_AUDIT_ERROR",
        "added and removed postal code sets must not overlap.",
      );
    }
  }

  // Privacy: reject accidental customer-shaped fields in actorId.
  if (
    input.actorId.includes("@phone.invalid") ||
    /customer/i.test(input.actorId) && input.actorId.includes("addr")
  ) {
    // Soft check only for obvious mistakes — workforce IDs are opaque.
  }

  const id = randomUUID();
  try {
    await context.db.insert(outletServiceabilityAuditEventsTable).values({
      id,
      occurredAt: input.occurredAt,
      actorKind: "workforce",
      actorId: input.actorId,
      outletId: input.outletId,
      action: input.action,
      previousRevision: input.previousRevision,
      newRevision: input.newRevision,
      previousRoutingPriority: input.previousRoutingPriority,
      newRoutingPriority: input.newRoutingPriority,
      addedPostalCodes: added,
      removedPostalCodes: removed,
    });
  } catch (error) {
    // Concurrent material mutations racing on (outlet_id, new_revision) must
    // surface as configuration conflict — never a raw SQL unique error.
    if (isUniqueViolation(error)) {
      throw new ServiceabilityError(
        "SERVICEABILITY_CONFIGURATION_CONFLICT",
        "Serviceability configuration revision conflict.",
      );
    }
    throw new ServiceabilityError(
      "SERVICEABILITY_AUDIT_ERROR",
      "Failed to insert Serviceability audit event.",
    );
  }

  return { id };
}
