/**
 * Payment initiation idempotency binding (IMP-022).
 *
 * Scope: authenticated customer + operation kind + idempotency key.
 * Same key + same fingerprint → replay original resource.
 * Same key + different fingerprint → PAYMENT_IDEMPOTENCY_CONFLICT.
 */

import { PaymentError, type PaymentOperationKind } from "../../shared/payment";
import type { PersistenceTransactionContext } from "../persistence/types";
import { assertTransactionContext, isUniqueViolation } from "./assert-role";
import {
  findIdempotencyRecord,
  insertIdempotencyRecord,
  lockIdempotencyRecord,
  newIdempotencyRecordId,
  type PaymentIdempotencyRow,
} from "./repository";

export type IdempotencyBindInput = Readonly<{
  customerAuthUserId: string;
  operationKind: PaymentOperationKind;
  idempotencyKey: string;
  requestFingerprint: string;
  now: Date;
  paymentId: string | null;
  paymentAttemptId: string | null;
  checkoutId: string | null;
  zeroPayableCheckoutId: string | null;
}>;

export type IdempotencyLookupResult =
  | Readonly<{ kind: "miss" }>
  | Readonly<{ kind: "replay"; record: PaymentIdempotencyRow }>
  | Readonly<{ kind: "conflict"; record: PaymentIdempotencyRow }>;

/**
 * Look up an existing idempotency record under a row lock (when present).
 */
export async function lookupInitiationIdempotency(
  context: PersistenceTransactionContext,
  input: {
    customerAuthUserId: string;
    operationKind: PaymentOperationKind;
    idempotencyKey: string;
    requestFingerprint: string;
  },
): Promise<IdempotencyLookupResult> {
  assertTransactionContext(context, "lookupInitiationIdempotency");
  const locked = await lockIdempotencyRecord(context, input);
  if (!locked) {
    return Object.freeze({ kind: "miss" as const });
  }
  if (locked.requestFingerprint !== input.requestFingerprint) {
    return Object.freeze({ kind: "conflict" as const, record: locked });
  }
  return Object.freeze({ kind: "replay" as const, record: locked });
}

/**
 * Insert/bind the initiation idempotency record in the same transaction as
 * Payment / Attempt / Checkout / claims.
 */
export async function bindInitiationIdempotency(
  context: PersistenceTransactionContext,
  input: IdempotencyBindInput,
): Promise<PaymentIdempotencyRow> {
  assertTransactionContext(context, "bindInitiationIdempotency");

  const existing = await lookupInitiationIdempotency(context, {
    customerAuthUserId: input.customerAuthUserId,
    operationKind: input.operationKind,
    idempotencyKey: input.idempotencyKey,
    requestFingerprint: input.requestFingerprint,
  });

  if (existing.kind === "conflict") {
    throw new PaymentError(
      "PAYMENT_IDEMPOTENCY_CONFLICT",
      "Idempotency key was reused with a different payment request.",
      { field: "idempotencyKey" },
    );
  }

  if (existing.kind === "replay") {
    return existing.record;
  }

  try {
    return await insertIdempotencyRecord(context, {
      id: newIdempotencyRecordId(),
      customerAuthUserId: input.customerAuthUserId,
      operationKind: input.operationKind,
      idempotencyKey: input.idempotencyKey,
      requestFingerprint: input.requestFingerprint,
      paymentId: input.paymentId,
      paymentAttemptId: input.paymentAttemptId,
      checkoutId: input.checkoutId,
      zeroPayableCheckoutId: input.zeroPayableCheckoutId,
      now: input.now,
      completedAt: input.now,
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const raced = await findIdempotencyRecord(context, {
      customerAuthUserId: input.customerAuthUserId,
      operationKind: input.operationKind,
      idempotencyKey: input.idempotencyKey,
    });
    if (!raced) throw error;
    if (raced.requestFingerprint !== input.requestFingerprint) {
      throw new PaymentError(
        "PAYMENT_IDEMPOTENCY_CONFLICT",
        "Idempotency key was reused with a different payment request.",
        { field: "idempotencyKey" },
      );
    }
    return raced;
  }
}

export function assertIdempotencyConflict(
  record: PaymentIdempotencyRow,
  requestFingerprint: string,
): void {
  if (record.requestFingerprint !== requestFingerprint) {
    throw new PaymentError(
      "PAYMENT_IDEMPOTENCY_CONFLICT",
      "Idempotency key was reused with a different payment request.",
      { field: "idempotencyKey" },
    );
  }
}
