/**
 * Proactive Scheduled fulfilment reminder timing (IMP-036I / ARCH-R23).
 *
 * Lead is exactly 30 minutes before the immutable window start.
 * Enqueue only when the Order is materialized strictly before that due instant.
 * A purchase at or after the due instant does not enqueue a late upcoming reminder.
 */

export const SCHEDULED_FULFILMENT_REMINDER_LEAD_MS = 30 * 60 * 1000;

export const SCHEDULED_FULFILMENT_REMINDER_REF_SUFFIX = "scheduled_fulfilment_reminder";

export function scheduledFulfilmentReminderRef(orderId: string): string {
  return `order:${orderId}:${SCHEDULED_FULFILMENT_REMINDER_REF_SUFFIX}`;
}

export function scheduledReminderDueAt(windowStartAt: Date): Date {
  return new Date(windowStartAt.getTime() - SCHEDULED_FULFILMENT_REMINDER_LEAD_MS);
}

export type ScheduledReminderEnqueueInput = Readonly<{
  fulfilmentTiming: "ASAP" | "SCHEDULED";
  windowStartAt: Date | null;
  windowEndAt: Date | null;
  timeZone: string | null;
  cutoffMinutes: number | null;
  materializedAt: Date;
}>;

export type ScheduledReminderEnqueueDecision =
  | Readonly<{ outcome: "ENQUEUE"; dueAt: Date; expiresAt: Date }>
  | Readonly<{
      outcome: "SKIP";
      reason: "NOT_SCHEDULED" | "INSIDE_REMINDER_WINDOW" | "INCONSISTENT_PURCHASED_TRUTH";
    }>;

function consistentScheduledTruth(
  input: ScheduledReminderEnqueueInput,
): Readonly<{ windowStartAt: Date }> | null {
  if (input.fulfilmentTiming !== "SCHEDULED") return null;
  if (
    !(input.windowStartAt instanceof Date) ||
    Number.isNaN(input.windowStartAt.getTime()) ||
    !(input.windowEndAt instanceof Date) ||
    Number.isNaN(input.windowEndAt.getTime()) ||
    input.windowStartAt.getTime() >= input.windowEndAt.getTime() ||
    typeof input.timeZone !== "string" ||
    input.timeZone.trim().length === 0 ||
    typeof input.cutoffMinutes !== "number" ||
    !Number.isInteger(input.cutoffMinutes) ||
    input.cutoffMinutes < 0 ||
    input.cutoffMinutes > 240 ||
    Number.isNaN(input.materializedAt.getTime())
  ) {
    return null;
  }
  return Object.freeze({ windowStartAt: input.windowStartAt });
}

export function evaluateScheduledReminderEnqueue(
  input: ScheduledReminderEnqueueInput,
): ScheduledReminderEnqueueDecision {
  if (input.fulfilmentTiming !== "SCHEDULED") {
    return Object.freeze({ outcome: "SKIP", reason: "NOT_SCHEDULED" });
  }
  const truth = consistentScheduledTruth(input);
  if (!truth) {
    return Object.freeze({ outcome: "SKIP", reason: "INCONSISTENT_PURCHASED_TRUTH" });
  }
  const dueAt = scheduledReminderDueAt(truth.windowStartAt);
  if (input.materializedAt.getTime() >= dueAt.getTime()) {
    return Object.freeze({ outcome: "SKIP", reason: "INSIDE_REMINDER_WINDOW" });
  }
  return Object.freeze({
    outcome: "ENQUEUE",
    dueAt,
    expiresAt: truth.windowStartAt,
  });
}

/**
 * Send-time facts that do not require Delivery. Pickup stops here.
 * DELIVERY callers still consult Delivery.status after `CHECK_DELIVERY`.
 */
export function evaluateScheduledReminderSendFacts(
  input: Readonly<{
    orderStatus: string | null;
    fulfilmentTiming: string | null;
    windowStartAt: Date | null;
    windowEndAt: Date | null;
    timeZone: string | null;
    cutoffMinutes: number | null;
    now: Date;
  }>,
): "SUPPRESS" | "CHECK_DELIVERY" {
  if (
    input.orderStatus == null ||
    input.orderStatus === "CANCELLED" ||
    input.orderStatus === "FULFILLED" ||
    input.fulfilmentTiming !== "SCHEDULED"
  ) {
    return "SUPPRESS";
  }
  const truth = consistentScheduledTruth({
    fulfilmentTiming: "SCHEDULED",
    windowStartAt: input.windowStartAt,
    windowEndAt: input.windowEndAt,
    timeZone: input.timeZone,
    cutoffMinutes: input.cutoffMinutes,
    materializedAt: input.now,
  });
  if (!truth) return "SUPPRESS";
  if (input.now.getTime() >= truth.windowStartAt.getTime()) return "SUPPRESS";
  return "CHECK_DELIVERY";
}
