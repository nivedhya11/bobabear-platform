import { describe, expect, it } from "vitest";

import {
  SCHEDULED_DUE_SOON_BEFORE_WINDOW_MS,
  deriveScheduledOperationalCue,
} from "@/shared/scheduled-fulfilment/operational-cues";

const START = new Date("2026-09-25T12:30:00.000Z");
const END = new Date("2026-09-25T13:00:00.000Z");

describe("derived scheduled operational cues", () => {
  it("keeps due-soon as a named implementation constant, not an order status", () => {
    expect(SCHEDULED_DUE_SOON_BEFORE_WINDOW_MS).toBe(30 * 60 * 1000);
    expect(
      deriveScheduledOperationalCue({
        fulfilmentTiming: "SCHEDULED",
        windowStartAt: START,
        windowEndAt: END,
        now: new Date(START.getTime() - SCHEDULED_DUE_SOON_BEFORE_WINDOW_MS),
        orderStatus: "PLACED",
      }),
    ).toBe("DUE_SOON");
    expect(
      deriveScheduledOperationalCue({
        fulfilmentTiming: "SCHEDULED",
        windowStartAt: START,
        windowEndAt: END,
        now: new Date(START.getTime() - SCHEDULED_DUE_SOON_BEFORE_WINDOW_MS - 1),
        orderStatus: "ACCEPTED",
      }),
    ).toBe("SCHEDULED");
    expect(
      deriveScheduledOperationalCue({
        fulfilmentTiming: "SCHEDULED",
        windowStartAt: START,
        windowEndAt: END,
        now: END,
        orderStatus: "PLACED",
      }),
    ).toBe("OVERDUE");
    expect(
      deriveScheduledOperationalCue({
        fulfilmentTiming: "SCHEDULED",
        windowStartAt: START,
        windowEndAt: END,
        now: END,
        orderStatus: "FULFILLED",
      }),
    ).toBeNull();
    expect(
      deriveScheduledOperationalCue({
        fulfilmentTiming: "ASAP",
        windowStartAt: null,
        windowEndAt: null,
        now: END,
        orderStatus: "PLACED",
      }),
    ).toBeNull();
  });
});
