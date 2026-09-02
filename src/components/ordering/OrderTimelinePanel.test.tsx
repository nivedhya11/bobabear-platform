import { describe, expect, it } from "vitest";

import { buildOrderTimeline } from "@/components/ordering/OrderTimelinePanel";

describe("OrderTimelinePanel", () => {
  it("shows placed → accepted → fulfilled milestones for active orders", () => {
    const milestones = buildOrderTimeline({
      status: "ACCEPTED",
      createdAt: "2026-09-01T10:00:00.000Z",
      acceptedAt: "2026-09-01T10:05:00.000Z",
      fulfilledAt: null,
      cancelledAt: null,
    });
    expect(milestones.map((m) => m.status)).toEqual(["PLACED", "ACCEPTED", "FULFILLED"]);
    expect(milestones[0]?.reached).toBe(true);
    expect(milestones[1]?.reached).toBe(true);
    expect(milestones[2]?.reached).toBe(false);
  });

  it("shows cancelled milestone for cancelled orders", () => {
    const milestones = buildOrderTimeline({
      status: "CANCELLED",
      createdAt: "2026-09-01T10:00:00.000Z",
      acceptedAt: null,
      fulfilledAt: null,
      cancelledAt: "2026-09-01T11:00:00.000Z",
    });
    expect(milestones.map((m) => m.status)).toEqual(["PLACED", "CANCELLED"]);
  });
});
