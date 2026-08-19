/**
 * Refund reason / operator-note policy (IMP-027 Appendix A).
 *
 * Internal reason is mandatory canonical audit. Provider notes are not used
 * as BOBA audit authority and are not sent by default.
 */
import { REFUND_OPERATOR_NOTE_MAX_LENGTH, REFUND_REASON_MAX_LENGTH } from "./constants";
import { RefundError } from "./errors";

export function normalizeRefundReason(value: unknown): string {
  if (typeof value !== "string") {
    throw new RefundError("REFUND_REASON_REQUIRED", "Refund reason is required.", {
      field: "reason",
    });
  }
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) {
    throw new RefundError("REFUND_REASON_REQUIRED", "Refund reason is required.", {
      field: "reason",
    });
  }
  if (normalized.length > REFUND_REASON_MAX_LENGTH) {
    throw new RefundError(
      "REFUND_INVALID_INPUT",
      `Refund reason must be at most ${REFUND_REASON_MAX_LENGTH} characters.`,
      { field: "reason" },
    );
  }
  return normalized;
}

export function normalizeRefundOperatorNote(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new RefundError("REFUND_INVALID_INPUT", "Operator note must be text.", {
      field: "operatorNote",
    });
  }
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) return null;
  if (normalized.length > REFUND_OPERATOR_NOTE_MAX_LENGTH) {
    throw new RefundError(
      "REFUND_INVALID_INPUT",
      `Operator note must be at most ${REFUND_OPERATOR_NOTE_MAX_LENGTH} characters.`,
      { field: "operatorNote" },
    );
  }
  return normalized;
}
