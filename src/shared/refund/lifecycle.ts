/**
 * BOBA Refund lifecycle transitions (IMP-027 §20).
 *
 * PROCESSED never regresses. FAILED → PROCESSED is allowed only with
 * same-provider-refund-id processed evidence (enforced by application).
 */
import type { RefundStatus } from "./constants";

const ALLOWED: Readonly<Record<RefundStatus, readonly RefundStatus[]>> = {
  ACCEPTED: ["PENDING", "INDETERMINATE", "PROCESSED", "FAILED"],
  PENDING: ["PROCESSED", "FAILED", "INDETERMINATE"],
  INDETERMINATE: ["PENDING", "PROCESSED", "FAILED"],
  PROCESSED: [],
  FAILED: ["PROCESSED"],
};

export function isAllowedRefundTransition(
  from: RefundStatus,
  to: RefundStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED[from].includes(to);
}

export function refundStatusFromProviderOutcome(
  outcome: "PENDING" | "PROCESSED" | "FAILED" | "INDETERMINATE",
): RefundStatus {
  return outcome;
}
