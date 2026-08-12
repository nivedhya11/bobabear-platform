/**
 * Append-only customer address audit helper (IMP-018).
 * Never persists customer-entered Address values.
 */
import { randomUUID } from "node:crypto";

import {
  CUSTOMER_ADDRESS_AUDIT_ACTIONS,
  CustomerAddressError,
  type CustomerAddressAuditAction,
  type CustomerAddressAffectedFieldName,
} from "../../shared/customer-addresses";
import { customerAddressAuditEventsTable } from "../../platform/database/schema/customer-addresses";
import type { PersistenceTransactionContext } from "../persistence/types";
import { assertTransactionContext } from "./assert-role";

export type InsertCustomerAddressAuditEventInput = Readonly<{
  actorId: string;
  addressId: string;
  customerAuthUserId: string;
  action: CustomerAddressAuditAction;
  affectedFields: readonly CustomerAddressAffectedFieldName[] | readonly [];
  previousDefaultAddressId?: string | null;
  occurredAt?: Date;
}>;

export async function insertCustomerAddressAuditEvent(
  context: PersistenceTransactionContext,
  input: InsertCustomerAddressAuditEventInput,
): Promise<{ id: string }> {
  assertTransactionContext(context, "insertCustomerAddressAuditEvent");

  if (!(CUSTOMER_ADDRESS_AUDIT_ACTIONS as readonly string[]).includes(input.action)) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_AUDIT_ERROR",
      "Unknown audit action.",
    );
  }
  if (typeof input.actorId !== "string" || input.actorId.length === 0) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_AUDIT_ERROR",
      "actorId is required.",
    );
  }
  if (typeof input.addressId !== "string" || input.addressId.length === 0) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_AUDIT_ERROR",
      "addressId is required.",
    );
  }
  if (
    typeof input.customerAuthUserId !== "string" ||
    input.customerAuthUserId.length === 0
  ) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_AUDIT_ERROR",
      "customerAuthUserId is required.",
    );
  }
  if (!Array.isArray(input.affectedFields)) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_AUDIT_ERROR",
      "affectedFields must be an array.",
    );
  }

  // Privacy: reject accidental value payloads in affectedFields.
  for (const entry of input.affectedFields) {
    if (typeof entry !== "string") {
      throw new CustomerAddressError(
        "CUSTOMER_ADDRESS_AUDIT_ERROR",
        "affectedFields must contain field names only.",
      );
    }
    if (entry.includes("@") || entry.includes(" ") || /\d{5,}/.test(entry)) {
      throw new CustomerAddressError(
        "CUSTOMER_ADDRESS_AUDIT_ERROR",
        "affectedFields must not contain Address values.",
      );
    }
  }

  const previousDefaultAddressId =
    input.action === "address_default_set"
      ? (input.previousDefaultAddressId ?? null)
      : null;

  if (
    input.action !== "address_default_set" &&
    input.previousDefaultAddressId != null
  ) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_AUDIT_ERROR",
      "previousDefaultAddressId is only valid for address_default_set.",
    );
  }

  const id = randomUUID();
  try {
    await context.db.insert(customerAddressAuditEventsTable).values({
      id,
      occurredAt: input.occurredAt ?? new Date(),
      actorKind: "customer",
      actorId: input.actorId,
      addressId: input.addressId,
      customerAuthUserId: input.customerAuthUserId,
      action: input.action,
      affectedFields: [...input.affectedFields],
      previousDefaultAddressId,
    });
  } catch {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_AUDIT_ERROR",
      "Failed to insert Address audit event.",
    );
  }

  return { id };
}
