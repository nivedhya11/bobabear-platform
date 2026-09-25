/**
 * Server-derived Scheduled windows (IMP-036I / FD-036I-01 / AF-036I-03).
 *
 * 30 real minutes, aligned to Outlet-local :00 and :30.
 * Horizon is the Outlet-local calendar dates TODAY and TOMORROW.
 * A window is included only when it is fully inside one IMP-036E operating
 * interval and its start is not inside the minimum-lead window.
 * Lead boundary: start >= now + leadMinutes (exact equality is eligible).
 * Nonexistent local instants are omitted. Ambiguous local instants use the
 * earlier UTC instant so each local start produces one window.
 */

export const SCHEDULED_WINDOW_MINUTES = 30;
export const SCHEDULED_WINDOW_MS = SCHEDULED_WINDOW_MINUTES * 60 * 1000;

export type ScheduledOperatingInterval = Readonly<{
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
}>;

export type ScheduledWindow = Readonly<{
  startAt: Date;
  endAt: Date;
  localDate: string;
  timeZone: string;
}>;

type WallParts = Readonly<{
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}>;

function wallFormatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function readWallParts(instant: Date, timeZone: string): WallParts {
  const parts = wallFormatter(timeZone).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const year = Number(value("year"));
  const month = Number(value("month"));
  const day = Number(value("day"));
  const hour = Number(value("hour"));
  const minute = Number(value("minute"));
  const second = Number(value("second"));
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    !Number.isInteger(second)
  ) {
    throw new RangeError("Unable to resolve Outlet-local wall time.");
  }
  return { year, month, day, hour, minute, second };
}

export function outletLocalDate(instant: Date, timeZone: string): string {
  const wall = readWallParts(instant, timeZone);
  const month = String(wall.month).padStart(2, "0");
  const day = String(wall.day).padStart(2, "0");
  return `${wall.year}-${month}-${day}`;
}

export function addCalendarDays(isoDate: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    throw new RangeError("local date must be YYYY-MM-DD.");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayOfWeekForLocalDate(isoDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return -1;
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  ).getUTCDay();
}

function wallMatches(instant: Date, timeZone: string, target: WallParts): boolean {
  const wall = readWallParts(instant, timeZone);
  return (
    wall.year === target.year &&
    wall.month === target.month &&
    wall.day === target.day &&
    wall.hour === target.hour &&
    wall.minute === target.minute &&
    wall.second === target.second
  );
}

/**
 * Convert an Outlet-local wall time to UTC.
 * Returns null when that local time does not exist.
 * When the local time occurs twice, returns the earlier UTC instant.
 */
export function zonedWallTimeToUtc(
  timeZone: string,
  isoDate: string,
  minuteOfDay: number,
): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match || !Number.isInteger(minuteOfDay) || minuteOfDay < 0 || minuteOfDay > 1440) {
    return null;
  }
  let year = Number(match[1]);
  let month = Number(match[2]);
  let day = Number(match[3]);
  let minute = minuteOfDay;
  if (minute === 1440) {
    const next = addCalendarDays(isoDate, 1);
    const nextMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(next)!;
    year = Number(nextMatch[1]);
    month = Number(nextMatch[2]);
    day = Number(nextMatch[3]);
    minute = 0;
  }
  const hour = Math.floor(minute / 60);
  const minutePart = minute % 60;
  const target: WallParts = {
    year,
    month,
    day,
    hour,
    minute: minutePart,
    second: 0,
  };
  let utc = Date.UTC(year, month - 1, day, hour, minutePart, 0);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const wall = readWallParts(new Date(utc), timeZone);
    const asUtc = Date.UTC(
      wall.year,
      wall.month - 1,
      wall.day,
      wall.hour,
      wall.minute,
      wall.second,
    );
    const desired = Date.UTC(year, month - 1, day, hour, minutePart, 0);
    const delta = desired - asUtc;
    if (delta === 0) break;
    utc += delta;
  }
  const candidates = [utc - 60 * 60 * 1000, utc, utc + 60 * 60 * 1000];
  const matches = candidates
    .filter((candidate) => wallMatches(new Date(candidate), timeZone, target))
    .sort((a, b) => a - b);
  const earliest = matches[0];
  return earliest === undefined ? null : new Date(earliest);
}

function windowFitsInterval(
  dayOfWeek: number,
  startMinute: number,
  intervals: readonly ScheduledOperatingInterval[],
): boolean {
  const endMinute = startMinute + SCHEDULED_WINDOW_MINUTES;
  return intervals.some(
    (interval) =>
      interval.dayOfWeek === dayOfWeek &&
      interval.startMinute <= startMinute &&
      endMinute <= interval.endMinute,
  );
}

export function listEligibleScheduledWindows(input: {
  now: Date;
  timeZone: string;
  intervals: readonly ScheduledOperatingInterval[];
  closedLocalDates: ReadonlySet<string>;
  minLeadMinutes: number;
}): readonly ScheduledWindow[] {
  if (!Number.isInteger(input.minLeadMinutes) || input.minLeadMinutes <= 0) {
    return Object.freeze([]);
  }
  const today = outletLocalDate(input.now, input.timeZone);
  const dates = [today, addCalendarDays(today, 1)];
  const earliestStart = input.now.getTime() + input.minLeadMinutes * 60 * 1000;
  const windows: ScheduledWindow[] = [];

  for (const localDate of dates) {
    if (input.closedLocalDates.has(localDate)) continue;
    const dayOfWeek = dayOfWeekForLocalDate(localDate);
    for (
      let startMinute = 0;
      startMinute + SCHEDULED_WINDOW_MINUTES <= 1440;
      startMinute += SCHEDULED_WINDOW_MINUTES
    ) {
      if (!windowFitsInterval(dayOfWeek, startMinute, input.intervals)) continue;
      const startAt = zonedWallTimeToUtc(input.timeZone, localDate, startMinute);
      const endAt = zonedWallTimeToUtc(
        input.timeZone,
        localDate,
        startMinute + SCHEDULED_WINDOW_MINUTES,
      );
      if (!startAt || !endAt) continue;
      if (endAt.getTime() - startAt.getTime() !== SCHEDULED_WINDOW_MS) continue;
      if (startAt.getTime() < earliestStart) continue;
      windows.push(
        Object.freeze({
          startAt,
          endAt,
          localDate,
          timeZone: input.timeZone,
        }),
      );
    }
  }

  return Object.freeze(windows);
}

export function findExactScheduledWindow(
  windows: readonly ScheduledWindow[],
  startAt: Date,
  endAt: Date,
): ScheduledWindow | null {
  return (
    windows.find(
      (window) =>
        window.startAt.getTime() === startAt.getTime() &&
        window.endAt.getTime() === endAt.getTime(),
    ) ?? null
  );
}
