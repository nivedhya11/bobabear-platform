/**
 * Outlet-local Scheduled window presentation (AC-036I-031).
 * Labels are derived from sealed instants and the sealed IANA timezone.
 */

import { outletLocalDate } from "./windows";

export function formatOutletLocalWindowLabel(
  startAt: Date,
  endAt: Date,
  timeZone: string,
): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `${formatter.format(startAt)}–${formatter.format(endAt)}`;
}

export type ScheduledWindowPresentation = Readonly<{
  startAt: Date;
  endAt: Date;
  timeZone: string;
  localDate: string;
  label: string;
}>;

export function presentScheduledWindow(input: Readonly<{
  startAt: Date;
  endAt: Date;
  timeZone: string;
}>): ScheduledWindowPresentation {
  return Object.freeze({
    startAt: input.startAt,
    endAt: input.endAt,
    timeZone: input.timeZone,
    localDate: outletLocalDate(input.startAt, input.timeZone),
    label: formatOutletLocalWindowLabel(input.startAt, input.endAt, input.timeZone),
  });
}
