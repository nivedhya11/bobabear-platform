import { describe, expect, it } from "vitest";

import {
  addCalendarDays,
  listEligibleScheduledWindows,
  outletLocalDate,
  zonedWallTimeToUtc,
} from "../../src/shared/scheduled-fulfilment/windows";

const ALL_DAY = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  startMinute: 0,
  endMinute: 1440,
}));

const KOLKATA_NOW = new Date("2026-08-09T12:00:00.000Z");

describe("scheduled window generation", () => {
  it("emits exact 30-minute windows on the Outlet-local clock", () => {
    const windows = listEligibleScheduledWindows({
      now: KOLKATA_NOW,
      timeZone: "Asia/Kolkata",
      intervals: ALL_DAY,
      closedLocalDates: new Set(),
      minLeadMinutes: 30,
    });
    expect(windows.length).toBeGreaterThan(0);
    for (const window of windows) {
      expect(window.endAt.getTime() - window.startAt.getTime()).toBe(30 * 60 * 1000);
    }
    expect(windows[0]?.startAt.toISOString()).toBe("2026-08-09T12:30:00.000Z");
    expect(windows[0]?.endAt.toISOString()).toBe("2026-08-09T13:00:00.000Z");
    expect(windows[0]?.localDate).toBe("2026-08-09");
  });

  it("uses TODAY and TOMORROW in the Outlet calendar, including the local midnight boundary", () => {
    const windows = listEligibleScheduledWindows({
      now: KOLKATA_NOW,
      timeZone: "Asia/Kolkata",
      intervals: ALL_DAY,
      closedLocalDates: new Set(),
      minLeadMinutes: 30,
    });
    const dates = new Set(windows.map((window) => window.localDate));
    expect(dates).toEqual(new Set(["2026-08-09", "2026-08-10"]));
    expect(outletLocalDate(KOLKATA_NOW, "Asia/Kolkata")).toBe("2026-08-09");
    expect(addCalendarDays("2026-08-09", 1)).toBe("2026-08-10");
    const lastToday = windows.filter((window) => window.localDate === "2026-08-09").at(-1);
    expect(lastToday?.startAt.toISOString()).toBe("2026-08-09T18:00:00.000Z");
    expect(lastToday?.endAt.toISOString()).toBe("2026-08-09T18:30:00.000Z");
    const firstTomorrow = windows.find((window) => window.localDate === "2026-08-10");
    expect(firstTomorrow?.startAt.toISOString()).toBe("2026-08-09T18:30:00.000Z");
  });

  it("does not use a non-Outlet timezone as the horizon authority", () => {
    const windows = listEligibleScheduledWindows({
      now: new Date("2026-08-09T23:00:00.000Z"),
      timeZone: "Pacific/Kiritimati",
      intervals: ALL_DAY,
      closedLocalDates: new Set(),
      minLeadMinutes: 30,
    });
    expect(outletLocalDate(new Date("2026-08-09T23:00:00.000Z"), "Pacific/Kiritimati")).toBe(
      "2026-08-10",
    );
    expect(new Set(windows.map((window) => window.localDate))).toEqual(
      new Set(["2026-08-10", "2026-08-11"]),
    );
  });

  it("keeps windows inside operating intervals and drops the rest", () => {
    const windows = listEligibleScheduledWindows({
      now: new Date("2026-08-09T04:00:00.000Z"),
      timeZone: "Asia/Kolkata",
      intervals: ALL_DAY.map((interval) => ({
        ...interval,
        startMinute: 10 * 60,
        endMinute: 22 * 60,
      })),
      closedLocalDates: new Set(),
      minLeadMinutes: 30,
    });
    const starts = windows
      .filter((window) => window.localDate === "2026-08-09")
      .map((window) => window.startAt.toISOString());
    expect(starts[0]).toBe("2026-08-09T04:30:00.000Z");
    expect(starts.at(-1)).toBe("2026-08-09T16:00:00.000Z");
    expect(starts).not.toContain("2026-08-09T04:00:00.000Z");
    expect(starts).not.toContain("2026-08-09T16:30:00.000Z");
  });

  it("returns no windows when the lead profile would exclude every slot", () => {
    const windows = listEligibleScheduledWindows({
      now: new Date("2026-08-09T18:15:00.000Z"),
      timeZone: "Asia/Kolkata",
      intervals: ALL_DAY.map((interval) => ({
        ...interval,
        startMinute: 10 * 60,
        endMinute: 12 * 60,
      })),
      closedLocalDates: new Set(["2026-08-10"]),
      minLeadMinutes: 60,
    });
    expect(windows).toEqual([]);
  });

  it("removes both today and tomorrow when CLOSED_FULL_DAY covers that local date", () => {
    const today = listEligibleScheduledWindows({
      now: KOLKATA_NOW,
      timeZone: "Asia/Kolkata",
      intervals: ALL_DAY,
      closedLocalDates: new Set(["2026-08-09"]),
      minLeadMinutes: 30,
    });
    expect(today.every((window) => window.localDate === "2026-08-10")).toBe(true);
    const tomorrow = listEligibleScheduledWindows({
      now: KOLKATA_NOW,
      timeZone: "Asia/Kolkata",
      intervals: ALL_DAY,
      closedLocalDates: new Set(["2026-08-10"]),
      minLeadMinutes: 30,
    });
    expect(tomorrow.every((window) => window.localDate === "2026-08-09")).toBe(true);
  });

  it("treats the lead boundary as inclusive and keeps Pickup and Delivery leads distinct", () => {
    const atBoundary = listEligibleScheduledWindows({
      now: KOLKATA_NOW,
      timeZone: "Asia/Kolkata",
      intervals: ALL_DAY,
      closedLocalDates: new Set(),
      minLeadMinutes: 30,
    });
    expect(atBoundary[0]?.startAt.toISOString()).toBe("2026-08-09T12:30:00.000Z");
    const pastBoundary = listEligibleScheduledWindows({
      now: KOLKATA_NOW,
      timeZone: "Asia/Kolkata",
      intervals: ALL_DAY,
      closedLocalDates: new Set(),
      minLeadMinutes: 31,
    });
    expect(pastBoundary[0]?.startAt.toISOString()).toBe("2026-08-09T13:00:00.000Z");
    const pickup = listEligibleScheduledWindows({
      now: KOLKATA_NOW,
      timeZone: "Asia/Kolkata",
      intervals: ALL_DAY,
      closedLocalDates: new Set(),
      minLeadMinutes: 45,
    });
    const delivery = listEligibleScheduledWindows({
      now: KOLKATA_NOW,
      timeZone: "Asia/Kolkata",
      intervals: ALL_DAY,
      closedLocalDates: new Set(),
      minLeadMinutes: 90,
    });
    expect(pickup[0]?.startAt.toISOString()).toBe("2026-08-09T13:00:00.000Z");
    expect(delivery[0]?.startAt.toISOString()).toBe("2026-08-09T13:30:00.000Z");
  });

  it("omits a local time that does not exist across a DST spring-forward", () => {
    expect(zonedWallTimeToUtc("America/New_York", "2026-03-08", 2 * 60 + 30)).toBeNull();
    const windows = listEligibleScheduledWindows({
      now: new Date("2026-03-08T05:00:00.000Z"),
      timeZone: "America/New_York",
      intervals: ALL_DAY,
      closedLocalDates: new Set(),
      minLeadMinutes: 30,
    });
    const starts = windows
      .filter((window) => window.localDate === "2026-03-08")
      .map((window) => window.startAt.toISOString());
    expect(starts).toContain("2026-03-08T06:00:00.000Z");
    expect(starts).not.toContain("2026-03-08T06:30:00.000Z");
    expect(starts).toContain("2026-03-08T07:00:00.000Z");
  });

  it("does not emit an arbitrary-duration window when local time repeats after DST fall-back", () => {
    expect(zonedWallTimeToUtc("America/New_York", "2026-11-01", 60 + 30)?.toISOString()).toBe(
      "2026-11-01T05:30:00.000Z",
    );
    const windows = listEligibleScheduledWindows({
      now: new Date("2026-11-01T04:00:00.000Z"),
      timeZone: "America/New_York",
      intervals: ALL_DAY,
      closedLocalDates: new Set(),
      minLeadMinutes: 30,
    });
    const onDay = windows.filter((window) => window.localDate === "2026-11-01");
    expect(onDay.every((window) => window.endAt.getTime() - window.startAt.getTime() === 30 * 60 * 1000)).toBe(
      true,
    );
    expect(onDay.map((window) => window.startAt.toISOString())).toContain(
      "2026-11-01T05:00:00.000Z",
    );
    expect(onDay.map((window) => window.startAt.toISOString())).not.toContain(
      "2026-11-01T05:30:00.000Z",
    );
    expect(onDay.map((window) => window.startAt.toISOString())).toContain(
      "2026-11-01T07:00:00.000Z",
    );
  });
});
