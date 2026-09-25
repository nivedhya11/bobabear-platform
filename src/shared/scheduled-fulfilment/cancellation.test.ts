import { describe, expect, it } from "vitest";

import {
  evaluatePurchasedScheduledCancellation,
  purchasedCancellationDeadline,
} from "./cancellation";
import {
  SCHEDULED_FULFILMENT_REMINDER_LEAD_MS,
  evaluateScheduledReminderEnqueue,
  evaluateScheduledReminderSendFacts,
  scheduledFulfilmentReminderRef,
  scheduledReminderDueAt,
} from "./reminder";

const START = new Date("2026-09-26T12:30:00.000Z");

describe("purchased scheduled cancellation", () => {
  it("allows only strictly before the sealed deadline", () => {
    const deadline = purchasedCancellationDeadline(START, 30);
    expect(deadline.toISOString()).toBe("2026-09-26T12:00:00.000Z");
    expect(
      evaluatePurchasedScheduledCancellation({
        fulfilmentTiming: "SCHEDULED",
        windowStartAt: START,
        cutoffMinutes: 30,
        now: new Date(deadline.getTime() - 1),
      }).outcome,
    ).toBe("ALLOW");
    expect(
      evaluatePurchasedScheduledCancellation({
        fulfilmentTiming: "SCHEDULED",
        windowStartAt: START,
        cutoffMinutes: 30,
        now: deadline,
      }),
    ).toMatchObject({ outcome: "DENY", reason: "AT_OR_AFTER_CUTOFF" });
    expect(
      evaluatePurchasedScheduledCancellation({
        fulfilmentTiming: "SCHEDULED",
        windowStartAt: START,
        cutoffMinutes: 0,
        now: new Date(START.getTime() - 1),
      }).outcome,
    ).toBe("ALLOW");
    expect(
      evaluatePurchasedScheduledCancellation({
        fulfilmentTiming: "SCHEDULED",
        windowStartAt: START,
        cutoffMinutes: 0,
        now: START,
      }),
    ).toMatchObject({ outcome: "DENY", reason: "AT_OR_AFTER_CUTOFF" });
  });

  it("fails closed on malformed purchased truth and does not treat ASAP as scheduled", () => {
    expect(
      evaluatePurchasedScheduledCancellation({
        fulfilmentTiming: "ASAP",
        windowStartAt: null,
        cutoffMinutes: null,
        now: START,
      }),
    ).toMatchObject({ outcome: "DENY", reason: "NOT_SCHEDULED" });
    expect(
      evaluatePurchasedScheduledCancellation({
        fulfilmentTiming: "SCHEDULED",
        windowStartAt: START,
        cutoffMinutes: null,
        now: START,
      }),
    ).toMatchObject({ outcome: "DENY", reason: "MALFORMED_PURCHASED_TRUTH" });
  });
});

describe("scheduled fulfilment reminder timing", () => {
  it("enqueues only when materialization is strictly before the 30 minute due instant", () => {
    const due = scheduledReminderDueAt(START);
    expect(due.getTime()).toBe(START.getTime() - SCHEDULED_FULFILMENT_REMINDER_LEAD_MS);
    const base = {
      fulfilmentTiming: "SCHEDULED" as const,
      windowStartAt: START,
      windowEndAt: new Date(START.getTime() + 30 * 60 * 1000),
      timeZone: "Asia/Kolkata",
      cutoffMinutes: 60,
    };
    expect(
      evaluateScheduledReminderEnqueue({
        ...base,
        materializedAt: new Date(due.getTime() - 1),
      }),
    ).toMatchObject({ outcome: "ENQUEUE", dueAt: due, expiresAt: START });
    expect(
      evaluateScheduledReminderEnqueue({ ...base, materializedAt: due }),
    ).toMatchObject({ outcome: "SKIP", reason: "INSIDE_REMINDER_WINDOW" });
    expect(
      evaluateScheduledReminderEnqueue({
        ...base,
        fulfilmentTiming: "ASAP",
        windowStartAt: null,
        windowEndAt: null,
        timeZone: null,
        cutoffMinutes: null,
        materializedAt: due,
      }),
    ).toMatchObject({ outcome: "SKIP", reason: "NOT_SCHEDULED" });
    expect(scheduledFulfilmentReminderRef("abc")).toBe(
      "order:abc:scheduled_fulfilment_reminder",
    );
  });

  it("fails closed at send time without using notification rank", () => {
    const now = new Date(START.getTime() - 20 * 60 * 1000);
    const base = {
      orderStatus: "PLACED",
      fulfilmentTiming: "SCHEDULED",
      windowStartAt: START,
      windowEndAt: new Date(START.getTime() + 30 * 60 * 1000),
      timeZone: "Asia/Kolkata",
      cutoffMinutes: 30,
      now,
    };
    expect(evaluateScheduledReminderSendFacts(base)).toBe("CHECK_DELIVERY");
    expect(
      evaluateScheduledReminderSendFacts({ ...base, orderStatus: "CANCELLED" }),
    ).toBe("SUPPRESS");
    expect(
      evaluateScheduledReminderSendFacts({ ...base, orderStatus: "FULFILLED" }),
    ).toBe("SUPPRESS");
    expect(
      evaluateScheduledReminderSendFacts({ ...base, orderStatus: null }),
    ).toBe("SUPPRESS");
    expect(
      evaluateScheduledReminderSendFacts({ ...base, fulfilmentTiming: "ASAP" }),
    ).toBe("SUPPRESS");
    expect(
      evaluateScheduledReminderSendFacts({ ...base, cutoffMinutes: null }),
    ).toBe("SUPPRESS");
    expect(
      evaluateScheduledReminderSendFacts({ ...base, now: START }),
    ).toBe("SUPPRESS");
  });
});
