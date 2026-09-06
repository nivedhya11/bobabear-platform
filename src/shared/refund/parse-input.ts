/**
 * Refund command parsing (IMP-027 / IMP-036D).
 */
import { PAYMENT_CURRENCY } from "../payment";
import { RefundError } from "./errors";
import { normalizeRefundOperatorNote, normalizeRefundReason } from "./reason";
import type {
  GetRefundInput,
  ReconcileRefundInput,
  RequestRefundInput,
  ReserveOrderRefundInput,
} from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RESERVE_ORDER_REFUND_ALLOWED_KEYS = [
  "refundRequestId",
  "amountPaise",
  "reason",
  "operatorNote",
] as const;

function requireUuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new RefundError("REFUND_INVALID_INPUT", `${field} must be a UUID.`, { field });
  }
  return value;
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  context: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new RefundError(
        "REFUND_INVALID_INPUT",
        `Unknown field '${key}' is not permitted on ${context}.`,
        { field: key },
      );
    }
  }
}

function requireAmountPaise(value: unknown): bigint {
  let amount: bigint;
  if (typeof value === "bigint") amount = value;
  else if (typeof value === "number" && Number.isInteger(value)) amount = BigInt(value);
  else if (typeof value === "string" && /^-?\d+$/.test(value)) amount = BigInt(value);
  else {
    throw new RefundError("REFUND_INVALID_INPUT", "amountPaise must be a positive integer.", {
      field: "amountPaise",
    });
  }
  if (amount <= BigInt(0)) {
    throw new RefundError("REFUND_INVALID_INPUT", "amountPaise must be greater than zero.", {
      field: "amountPaise",
    });
  }
  return amount;
}

export function parseRequestRefundInput(input: unknown): RequestRefundInput {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new RefundError("REFUND_INVALID_INPUT", "Refund request is invalid.");
  }
  const record = input as Record<string, unknown>;
  const reason = normalizeRefundReason(record.reason);
  const operatorNote = normalizeRefundOperatorNote(record.operatorNote);
  let currency: "INR" | undefined;
  if (record.currency !== undefined) {
    if (record.currency !== PAYMENT_CURRENCY) {
      throw new RefundError("REFUND_CURRENCY_MISMATCH", "Refund currency must match Payment currency.", {
        field: "currency",
      });
    }
    currency = PAYMENT_CURRENCY;
  }
  return Object.freeze({
    paymentId: requireUuid(record.paymentId, "paymentId"),
    amountPaise: requireAmountPaise(record.amountPaise),
    ...(currency ? { currency } : {}),
    reason,
    ...(operatorNote !== null ? { operatorNote } : {}),
  });
}

export function parseGetRefundInput(input: unknown): GetRefundInput {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new RefundError("REFUND_INVALID_INPUT", "Refund read request is invalid.");
  }
  const record = input as Record<string, unknown>;
  return Object.freeze({
    refundId: requireUuid(record.refundId, "refundId"),
  });
}

export function parseReconcileRefundInput(input: unknown): ReconcileRefundInput {
  return parseGetRefundInput(input);
}

/**
 * Operations POST /orders/{orderId}/refunds body. Path orderId is supplied separately.
 * Rejects unknown fields and any caller-supplied outlet/payment/provider authority.
 */
export function parseReserveOrderRefundBody(
  orderId: string,
  input: unknown,
): ReserveOrderRefundInput {
  requireUuid(orderId, "orderId");
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new RefundError("REFUND_INVALID_INPUT", "Refund request is invalid.");
  }
  const record = input as Record<string, unknown>;
  rejectUnknownKeys(record, RESERVE_ORDER_REFUND_ALLOWED_KEYS, "order refund request");
  const reason = normalizeRefundReason(record.reason);
  const operatorNote = normalizeRefundOperatorNote(record.operatorNote);
  return Object.freeze({
    orderId,
    refundRequestId: requireUuid(record.refundRequestId, "refundRequestId"),
    amountPaise: requireAmountPaise(record.amountPaise),
    reason,
    ...(operatorNote !== null ? { operatorNote } : {}),
  });
}
