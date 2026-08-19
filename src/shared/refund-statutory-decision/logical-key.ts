/**
 * Logical issuance / decision identity for D-366 statutory reversal.
 *
 * One Refund → at most one statutory reversal purpose:
 *   refund:<refundId>:STATUTORY_REVERSAL
 */
import {
  REFUND_STATUTORY_LOGICAL_KEY_PREFIX,
  REFUND_STATUTORY_REVERSAL_PURPOSE,
} from "./constants";
import { RefundStatutoryDecisionError } from "./errors";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isRefundStatutoryUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function assertRefundStatutoryUuid(
  value: string,
  field: string,
): string {
  const trimmed = value.trim();
  if (!isRefundStatutoryUuid(trimmed)) {
    throw new RefundStatutoryDecisionError(
      "REFUND_STATUTORY_DECISION_INVALID_INPUT",
      `${field} must be a UUID.`,
      { field },
    );
  }
  return trimmed;
}

export function buildRefundStatutoryReversalLogicalKey(refundId: string): string {
  const trimmed = assertRefundStatutoryUuid(refundId, "refundId");
  return `${REFUND_STATUTORY_LOGICAL_KEY_PREFIX}${trimmed}:${REFUND_STATUTORY_REVERSAL_PURPOSE}`;
}

export function assertRefundStatutoryReversalLogicalKey(
  refundId: string,
  logicalIdempotencyKey: string,
): string {
  const expected = buildRefundStatutoryReversalLogicalKey(refundId);
  if (logicalIdempotencyKey !== expected) {
    throw new RefundStatutoryDecisionError(
      "REFUND_STATUTORY_DECISION_IDEMPOTENCY_CONFLICT",
      `Logical idempotency key must be exactly ${expected}.`,
      { field: "logicalIdempotencyKey" },
    );
  }
  return expected;
}
