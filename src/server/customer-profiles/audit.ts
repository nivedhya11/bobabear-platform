/**
 * Append-only customer profile audit helper (IMP-017).
 * Never persists customer-entered Profile values.
 */
import { randomUUID } from "node:crypto";

import {
  CUSTOMER_PROFILE_AUDIT_ACTIONS,
  CustomerProfileError,
  type CustomerProfileAuditAction,
  type CustomerProfileAffectedFieldName,
} from "../../shared/customer-profiles";
import { customerProfileAuditEventsTable } from "../../platform/database/schema/customer-profiles";
import type { PersistenceTransactionContext } from "../persistence/types";
import { assertTransactionContext } from "./assert-role";

export type InsertCustomerProfileAuditEventInput = Readonly<{
  actorId: string;
  profileId: string;
  customerAuthUserId: string;
  action: CustomerProfileAuditAction;
  affectedFields: readonly CustomerProfileAffectedFieldName[] | readonly [];
  occurredAt?: Date;
}>;

export async function insertCustomerProfileAuditEvent(
  context: PersistenceTransactionContext,
  input: InsertCustomerProfileAuditEventInput,
): Promise<{ id: string }> {
  assertTransactionContext(context, "insertCustomerProfileAuditEvent");

  if (!(CUSTOMER_PROFILE_AUDIT_ACTIONS as readonly string[]).includes(input.action)) {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_AUDIT_ERROR",
      "Unknown audit action.",
    );
  }
  if (typeof input.actorId !== "string" || input.actorId.length === 0) {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_AUDIT_ERROR",
      "actorId is required.",
    );
  }
  if (typeof input.profileId !== "string" || input.profileId.length === 0) {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_AUDIT_ERROR",
      "profileId is required.",
    );
  }
  if (
    typeof input.customerAuthUserId !== "string" ||
    input.customerAuthUserId.length === 0
  ) {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_AUDIT_ERROR",
      "customerAuthUserId is required.",
    );
  }
  if (!Array.isArray(input.affectedFields)) {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_AUDIT_ERROR",
      "affectedFields must be an array.",
    );
  }

  // Privacy: reject accidental value payloads in affectedFields.
  for (const entry of input.affectedFields) {
    if (typeof entry !== "string") {
      throw new CustomerProfileError(
        "CUSTOMER_PROFILE_AUDIT_ERROR",
        "affectedFields must contain field names only.",
      );
    }
    if (entry.includes("@") || entry.includes(" ")) {
      throw new CustomerProfileError(
        "CUSTOMER_PROFILE_AUDIT_ERROR",
        "affectedFields must not contain Profile values.",
      );
    }
  }

  const id = randomUUID();
  try {
    await context.db.insert(customerProfileAuditEventsTable).values({
      id,
      occurredAt: input.occurredAt ?? new Date(),
      actorKind: "customer",
      actorId: input.actorId,
      profileId: input.profileId,
      customerAuthUserId: input.customerAuthUserId,
      action: input.action,
      affectedFields: [...input.affectedFields],
    });
  } catch (error) {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_AUDIT_ERROR",
      "Failed to insert Profile audit event.",
    );
  }

  return { id };
}
