/**
 * Derived Scheduled operational cues (IMP-036I / FD-036I-12 / AC-036I-043).
 *
 * Presentation only. These values are not Order lifecycle statuses, are not
 * persisted, are not a customer promise, and are not Slot or capacity policy.
 *
 * SCHEDULED_DUE_SOON_BEFORE_WINDOW_MS is an implementation constant because
 * no canonical operational urgency threshold exists in the repository.
 * Changing it does not change Order status, cancellation rights, or eligibility.
 */

export const SCHEDULED_DUE_SOON_BEFORE_WINDOW_MS = 30 * 60 * 1000;

export type ScheduledOperationalCue = "SCHEDULED" | "DUE_SOON" | "OVERDUE";

export function deriveScheduledOperationalCue(input: Readonly<{
  fulfilmentTiming: "ASAP" | "SCHEDULED";
  windowStartAt: Date | null;
  windowEndAt: Date | null;
  now: Date;
  orderStatus: string;
}>): ScheduledOperationalCue | null {
  if (input.fulfilmentTiming !== "SCHEDULED") return null;
  if (input.orderStatus === "FULFILLED" || input.orderStatus === "CANCELLED") {
    return null;
  }
  if (!input.windowStartAt || !input.windowEndAt) return null;
  if (input.now.getTime() >= input.windowEndAt.getTime()) return "OVERDUE";
  const dueSoonAt =
    input.windowStartAt.getTime() - SCHEDULED_DUE_SOON_BEFORE_WINDOW_MS;
  if (input.now.getTime() >= dueSoonAt) return "DUE_SOON";
  return "SCHEDULED";
}
