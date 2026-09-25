/**
 * Purchased Scheduled cancellation eligibility (IMP-036I / BR-036I-019).
 *
 * Uses only the immutable purchased window start and sealed cutoff minutes.
 * Current Brand policy is not an input. Comparison is exact: allow only while
 * now is strictly before the deadline. No grace period.
 */

const MINUTE_MS = 60 * 1000;
const MAX_CUTOFF_MINUTES = 240;

export type PurchasedScheduledCancellationInput = Readonly<{
  fulfilmentTiming: "ASAP" | "SCHEDULED";
  windowStartAt: Date | null;
  cutoffMinutes: number | null;
  now: Date;
}>;

export type PurchasedScheduledCancellationDecision =
  | Readonly<{ outcome: "ALLOW"; deadlineAt: Date }>
  | Readonly<{
      outcome: "DENY";
      reason: "NOT_SCHEDULED" | "AT_OR_AFTER_CUTOFF" | "MALFORMED_PURCHASED_TRUTH";
    }>;

export function purchasedCancellationDeadline(
  windowStartAt: Date,
  cutoffMinutes: number,
): Date {
  return new Date(windowStartAt.getTime() - cutoffMinutes * MINUTE_MS);
}

function sealedCutoffMinutes(value: number | null): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 0 || value > MAX_CUTOFF_MINUTES) return null;
  return value;
}

export function evaluatePurchasedScheduledCancellation(
  input: PurchasedScheduledCancellationInput,
): PurchasedScheduledCancellationDecision {
  if (input.fulfilmentTiming !== "SCHEDULED") {
    return Object.freeze({ outcome: "DENY", reason: "NOT_SCHEDULED" });
  }
  const cutoffMinutes = sealedCutoffMinutes(input.cutoffMinutes);
  if (
    cutoffMinutes === null ||
    !(input.windowStartAt instanceof Date) ||
    Number.isNaN(input.windowStartAt.getTime()) ||
    Number.isNaN(input.now.getTime())
  ) {
    return Object.freeze({ outcome: "DENY", reason: "MALFORMED_PURCHASED_TRUTH" });
  }
  const deadlineAt = purchasedCancellationDeadline(input.windowStartAt, cutoffMinutes);
  if (input.now.getTime() < deadlineAt.getTime()) {
    return Object.freeze({ outcome: "ALLOW", deadlineAt });
  }
  return Object.freeze({ outcome: "DENY", reason: "AT_OR_AFTER_CUTOFF" });
}
