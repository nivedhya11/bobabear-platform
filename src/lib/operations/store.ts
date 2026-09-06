/**
 * Store Operations HTTP client (IMP-036E).
 *
 * Typed wrappers over `/api/operations/v1/outlets/{outletId}/...`.
 * No business rules. No `src/server/**` imports.
 */
import { operationsRequest, type OperationsHttpResult } from "./http";

export type StoreAvailabilityState =
  | "available"
  | "temporarily_unavailable"
  | "sold_out";

export type StoreOutletCapabilities = Readonly<Record<string, boolean>>;

export type StoreAvailabilityItem = Readonly<{
  kind: "variant" | "modifier_option";
  id: string;
  productName?: string;
  variantName?: string;
  code?: string;
  effectiveState: string;
  persistedState: string | null;
  unavailableUntil: string | null;
}>;

export type StoreAssortmentItem = Readonly<{
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  code: string;
  eligible: boolean;
  eligibilityCode: string;
}>;

export type StoreOperatingState = Readonly<{
  controlState: string | null;
  effectiveState: string;
  timezone: string | null;
  pausedUntil: string | null;
  code?: string;
}>;

export type StoreOperatingProfile = Readonly<{
  id?: string;
  outletId?: string;
  timezone: string;
  controlState?: string;
  pausedUntil?: string | null;
  reasonCode?: string | null;
  note?: string | null;
}>;

export type StoreOperatingInterval = Readonly<{
  id?: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
}>;

export type StoreServiceability = Readonly<{
  serviceOriginLatitude: string | null;
  serviceOriginLongitude: string | null;
  maxServiceDistanceMeters: number | null;
  revision: string | null;
  configured: boolean;
  routingPriorityConfigured: boolean;
}>;

function outletPath(outletId: string, suffix: string): string {
  return `/api/operations/v1/outlets/${encodeURIComponent(outletId)}${suffix}`;
}

export async function getStoreCapabilities(
  outletId: string,
): Promise<OperationsHttpResult<{ ok: true; capabilities: StoreOutletCapabilities }>> {
  return operationsRequest(outletPath(outletId, "/capabilities"));
}

export async function getStoreAssortment(
  outletId: string,
): Promise<
  OperationsHttpResult<{ ok: true; outletId: string; items: readonly StoreAssortmentItem[] }>
> {
  return operationsRequest(outletPath(outletId, "/assortment"));
}

export async function listStoreAvailability(
  outletId: string,
): Promise<
  OperationsHttpResult<{ ok: true; outletId: string; items: readonly StoreAvailabilityItem[] }>
> {
  return operationsRequest(outletPath(outletId, "/availability"));
}

export async function setVariantAvailability(
  outletId: string,
  variantId: string,
  body: Readonly<{
    state: StoreAvailabilityState;
    unavailableUntil?: string | null;
    reasonCode?: string | null;
    note?: string | null;
  }>,
): Promise<OperationsHttpResult<{ ok: true; availability: unknown }>> {
  return operationsRequest(
    outletPath(outletId, `/availability/variants/${encodeURIComponent(variantId)}`),
    { method: "POST", body },
  );
}

export async function setModifierOptionAvailability(
  outletId: string,
  modifierOptionId: string,
  body: Readonly<{
    state: StoreAvailabilityState;
    unavailableUntil?: string | null;
    reasonCode?: string | null;
    note?: string | null;
  }>,
): Promise<OperationsHttpResult<{ ok: true; availability: unknown }>> {
  return operationsRequest(
    outletPath(
      outletId,
      `/availability/modifier-options/${encodeURIComponent(modifierOptionId)}`,
    ),
    { method: "POST", body },
  );
}

export async function getStoreOperatingState(
  outletId: string,
): Promise<OperationsHttpResult<{ ok: true } & StoreOperatingState>> {
  return operationsRequest(outletPath(outletId, "/operating-state"));
}

export async function pauseStoreOutlet(
  outletId: string,
  body: Readonly<{
    pausedUntil?: string | null;
    reasonCode?: string | null;
    note?: string | null;
  }> = {},
): Promise<OperationsHttpResult<{ ok: true; profile: unknown }>> {
  return operationsRequest(outletPath(outletId, "/operating-state/pause"), {
    method: "POST",
    body,
  });
}

export async function resumeStoreOutlet(
  outletId: string,
  body: Readonly<{ reasonCode?: string | null; note?: string | null }> = {},
): Promise<OperationsHttpResult<{ ok: true; profile: unknown }>> {
  return operationsRequest(outletPath(outletId, "/operating-state/resume"), {
    method: "POST",
    body,
  });
}

export async function suspendStoreOutlet(
  outletId: string,
  body: Readonly<{ reasonCode?: string | null; note?: string | null }> = {},
): Promise<OperationsHttpResult<{ ok: true; profile: unknown }>> {
  return operationsRequest(outletPath(outletId, "/operating-state/suspend"), {
    method: "POST",
    body,
  });
}

export async function unsuspendStoreOutlet(
  outletId: string,
  body: Readonly<{ reasonCode?: string | null; note?: string | null }> = {},
): Promise<OperationsHttpResult<{ ok: true; profile: unknown }>> {
  return operationsRequest(outletPath(outletId, "/operating-state/unsuspend"), {
    method: "POST",
    body,
  });
}

export async function getStoreOperatingProfile(
  outletId: string,
): Promise<OperationsHttpResult<{ ok: true; profile: StoreOperatingProfile | null }>> {
  return operationsRequest(outletPath(outletId, "/operating-profile"));
}

export async function setStoreOperatingProfile(
  outletId: string,
  body: Readonly<{
    timezone: string;
    reasonCode?: string | null;
    note?: string | null;
  }>,
): Promise<OperationsHttpResult<{ ok: true; profile: StoreOperatingProfile }>> {
  return operationsRequest(outletPath(outletId, "/operating-profile"), {
    method: "POST",
    body,
  });
}

export async function getStoreOperatingSchedule(
  outletId: string,
): Promise<
  OperationsHttpResult<{ ok: true; intervals: readonly StoreOperatingInterval[] }>
> {
  return operationsRequest(outletPath(outletId, "/operating-schedule"));
}

export async function setStoreOperatingSchedule(
  outletId: string,
  intervals: readonly Readonly<{
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
  }>[],
): Promise<
  OperationsHttpResult<{ ok: true; intervals: readonly StoreOperatingInterval[] }>
> {
  return operationsRequest(outletPath(outletId, "/operating-schedule"), {
    method: "POST",
    body: { intervals },
  });
}

export async function getStoreServiceability(
  outletId: string,
): Promise<OperationsHttpResult<{ ok: true; serviceability: StoreServiceability }>> {
  return operationsRequest(outletPath(outletId, "/serviceability"));
}

export async function setStoreDistancePolicy(
  outletId: string,
  body: Readonly<{
    expectedRevision: string | null;
    serviceOriginLatitude: string | null;
    serviceOriginLongitude: string | null;
    maxServiceDistanceMeters: number | null;
  }>,
): Promise<OperationsHttpResult<{ ok: true; serviceability: StoreServiceability }>> {
  // Path outletId is authoritative; do not send outletId in body (forged-authority reject).
  return operationsRequest(outletPath(outletId, "/serviceability/distance-policy"), {
    method: "POST",
    body: {
      expectedRevision: body.expectedRevision,
      serviceOriginLatitude: body.serviceOriginLatitude,
      serviceOriginLongitude: body.serviceOriginLongitude,
      maxServiceDistanceMeters: body.maxServiceDistanceMeters,
    },
  });
}

export function availabilityStateLabel(state: string): string {
  if (state === "available") return "Available";
  if (state === "temporarily_unavailable") return "Temporarily unavailable";
  if (state === "sold_out") return "Sold out";
  return state;
}

export function operatingStateLabel(state: string): string {
  if (state === "accepting") return "Accepting orders";
  if (state === "paused") return "Paused";
  if (state === "suspended") return "Suspended";
  if (state === "closed_by_schedule") return "Closed by schedule";
  return state;
}

export function dayOfWeekLabel(day: number): string {
  const labels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return labels[day] ?? `Day ${day}`;
}

export function formatMinuteAsTime(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseTimeToMinute(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 24 || minutes < 0 || minutes > 59) return null;
  if (hours === 24 && minutes !== 0) return null;
  return hours * 60 + minutes;
}

export function validateScheduleIntervals(
  intervals: readonly Readonly<{
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
  }>[],
): string | null {
  if (intervals.length === 0) {
    return "Add at least one open interval, or mark days closed by leaving them without intervals.";
  }
  const byDay = new Map<number, Array<{ startMinute: number; endMinute: number }>>();
  for (const interval of intervals) {
    if (!Number.isInteger(interval.dayOfWeek) || interval.dayOfWeek < 0 || interval.dayOfWeek > 6) {
      return "Each interval needs a valid day of the week.";
    }
    if (
      !Number.isInteger(interval.startMinute) ||
      interval.startMinute < 0 ||
      interval.startMinute > 1439
    ) {
      return "Opening time must be between 00:00 and 23:59.";
    }
    if (
      !Number.isInteger(interval.endMinute) ||
      interval.endMinute < 1 ||
      interval.endMinute > 1440
    ) {
      return "Closing time must be between 00:01 and 24:00.";
    }
    if (interval.startMinute >= interval.endMinute) {
      return "Opening time must be earlier than closing time on the same day (overnight spans are not supported).";
    }
    const list = byDay.get(interval.dayOfWeek) ?? [];
    list.push(interval);
    byDay.set(interval.dayOfWeek, list);
  }
  for (const [, dayIntervals] of byDay) {
    const sorted = [...dayIntervals].sort((a, b) => a.startMinute - b.startMinute);
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i]!.startMinute < sorted[i - 1]!.endMinute) {
        return "Intervals on the same day must not overlap.";
      }
    }
  }
  return null;
}
