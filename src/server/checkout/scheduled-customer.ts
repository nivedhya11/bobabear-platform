/**
 * Customer transport for Scheduled fulfilment (IMP-036I Tranche 3).
 *
 * Eligibility is computed on the server. The browser cannot author a window.
 */
import "server-only";

import {
  CheckoutError,
  isLogicallyExpired,
  type Checkout,
  type FulfilmentMode,
} from "../../shared/checkout";
import {
  addCalendarDays,
  outletLocalDate,
  type ScheduledWindow,
} from "../../shared/scheduled-fulfilment/windows";
import { formatOutletLocalWindowLabel } from "../../shared/scheduled-fulfilment/presentation";
import { requireCustomerActor } from "../cart/actor";
import type { Persistence } from "../persistence/types";
import { resolveScheduledDeliveryOutlet } from "./adapters/serviceability";
import { systemCheckoutClock } from "./clock";
import { setCheckoutFulfilmentTiming } from "./fulfilment";
import type { CheckoutOperationOptions } from "./operations";
import {
  findCheckoutRowById,
  loadCheckoutAggregate,
} from "./repository";
import {
  listServerScheduledWindows,
  sealEligibleScheduledWindow,
} from "./scheduled-eligibility";
import { resolveBrandScheduledFulfilmentPolicy } from "../scheduled-fulfilment/foundations";

export type ScheduledWindowAvailability =
  | "AVAILABLE"
  | "NO_TIMES"
  | "DESTINATION_REQUIRED"
  | "OUTLET_REQUIRED"
  | "UNAVAILABLE";

export type CustomerScheduledWindow = Readonly<{
  startAt: Date;
  endAt: Date;
  localDate: string;
  day: "TODAY" | "TOMORROW";
  timeZone: string;
  label: string;
}>;

export type ListCheckoutScheduledWindowsResult = Readonly<{
  availability: ScheduledWindowAvailability;
  message: string | null;
  timeZone: string | null;
  todayLocalDate: string | null;
  tomorrowLocalDate: string | null;
  cancellationCutoffMinutes: number | null;
  windows: readonly CustomerScheduledWindow[];
}>;

function emptyResult(
  availability: ScheduledWindowAvailability,
  message: string | null,
): ListCheckoutScheduledWindowsResult {
  return Object.freeze({
    availability,
    message,
    timeZone: null,
    todayLocalDate: null,
    tomorrowLocalDate: null,
    cancellationCutoffMinutes: null,
    windows: Object.freeze([]),
  });
}

function presentWindows(
  windows: readonly ScheduledWindow[],
  timeZone: string,
  now: Date,
): readonly CustomerScheduledWindow[] {
  const today = outletLocalDate(now, timeZone);
  return Object.freeze(
    windows.map((window) =>
      Object.freeze({
        startAt: window.startAt,
        endAt: window.endAt,
        localDate: window.localDate,
        day: window.localDate === today ? ("TODAY" as const) : ("TOMORROW" as const),
        timeZone,
        label: formatOutletLocalWindowLabel(window.startAt, window.endAt, timeZone),
      }),
    ),
  );
}

function parseInstant(value: unknown, field: string): Date {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new CheckoutError("CHECKOUT_INVALID_INPUT", `${field} must be an ISO timestamp.`, {
      field,
    });
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new CheckoutError("CHECKOUT_INVALID_INPUT", `${field} must be an ISO timestamp.`, {
      field,
    });
  }
  return date;
}

function parseTimingInput(input: Readonly<Record<string, unknown>>): Readonly<{
  fulfilmentTiming: "ASAP" | "SCHEDULED";
  startAt: Date | null;
  endAt: Date | null;
}> {
  const timing = input.fulfilmentTiming;
  if (timing !== "ASAP" && timing !== "SCHEDULED") {
    throw new CheckoutError(
      "CHECKOUT_INVALID_INPUT",
      "fulfilmentTiming must be ASAP or SCHEDULED.",
      { field: "fulfilmentTiming" },
    );
  }
  const hasStart = input.scheduledWindowStartAt !== undefined && input.scheduledWindowStartAt !== null;
  const hasEnd = input.scheduledWindowEndAt !== undefined && input.scheduledWindowEndAt !== null;
  if (timing === "ASAP") {
    if (hasStart || hasEnd) {
      throw new CheckoutError(
        "CHECKOUT_INVALID_INPUT",
        "ASAP cannot carry a scheduled window.",
        { field: "scheduledWindowStartAt" },
      );
    }
    return { fulfilmentTiming: "ASAP", startAt: null, endAt: null };
  }
  if (!hasStart || !hasEnd) {
    throw new CheckoutError(
      "CHECKOUT_INVALID_INPUT",
      "Scheduled timing requires a server-eligible window.",
      { field: "scheduledWindowStartAt" },
    );
  }
  return {
    fulfilmentTiming: "SCHEDULED",
    startAt: parseInstant(input.scheduledWindowStartAt, "scheduledWindowStartAt"),
    endAt: parseInstant(input.scheduledWindowEndAt, "scheduledWindowEndAt"),
  };
}

async function resolveSchedulingOutlet(
  persistence: Persistence,
  checkout: Checkout,
  mode: FulfilmentMode,
  clock: NonNullable<CheckoutOperationOptions["clock"]>,
): Promise<
  | Readonly<{ kind: "outlet"; outletId: string }>
  | Readonly<{ kind: "empty"; result: ListCheckoutScheduledWindowsResult }>
> {
  if (mode === "PICKUP") {
    if (!checkout.pickupOutletId) {
      return {
        kind: "empty",
        result: emptyResult(
          "OUTLET_REQUIRED",
          "Choose a pickup location before choosing a scheduled time.",
        ),
      };
    }
    return { kind: "outlet", outletId: checkout.pickupOutletId };
  }
  if (!checkout.destination) {
    return {
      kind: "empty",
      result: emptyResult(
        "DESTINATION_REQUIRED",
        "Add a delivery address before choosing a scheduled time.",
      ),
    };
  }
  try {
    const serviceability = await resolveScheduledDeliveryOutlet(
      persistence,
      checkout.brandId,
      checkout.destination,
      clock,
    );
    return { kind: "outlet", outletId: serviceability.selectedOutletId };
  } catch (error) {
    if (error instanceof CheckoutError) {
      return {
        kind: "empty",
        result: emptyResult(
          "UNAVAILABLE",
          "Delivery is not available for that address right now.",
        ),
      };
    }
    throw error;
  }
}

export async function listCheckoutScheduledWindows(
  persistence: Persistence,
  actor: unknown,
  input: Readonly<{ checkoutId: string }>,
  options: CheckoutOperationOptions = {},
): Promise<ListCheckoutScheduledWindowsResult> {
  const customer = requireCustomerActor(actor);
  const clock = options.clock ?? systemCheckoutClock;
  const now = clock.now();
  const checkout = await persistence.withContext(async (ctx) => {
    const row = await findCheckoutRowById(ctx, input.checkoutId);
    if (!row || row.customerAuthUserId !== customer.authUserId) return null;
    return loadCheckoutAggregate(ctx, row);
  });
  if (!checkout) {
    throw new CheckoutError("CHECKOUT_NOT_FOUND", "Checkout not found.");
  }
  const mode = checkout.fulfilmentMode;
  const resolved = await resolveSchedulingOutlet(persistence, checkout, mode, clock);
  if (resolved.kind === "empty") return resolved.result;

  let listed;
  try {
    listed = await persistence.withContext((ctx) =>
      listServerScheduledWindows(ctx, {
        outletId: resolved.outletId,
        mode,
        now,
      }),
    );
  } catch (error) {
    if (error instanceof CheckoutError) {
      return emptyResult(
        "NO_TIMES",
        "No scheduled times are available right now. You can still choose as soon as possible.",
      );
    }
    throw error;
  }

  const policy = await persistence.withContext((ctx) =>
    resolveBrandScheduledFulfilmentPolicy(ctx, checkout.brandId),
  );
  const cutoff =
    mode === "PICKUP"
      ? policy.pickupCancellationCutoffMinutes
      : policy.deliveryCancellationCutoffMinutes;
  const windows = presentWindows(listed.windows, listed.timeZone, now);
  const today = outletLocalDate(now, listed.timeZone);
  return Object.freeze({
    availability: windows.length === 0 ? "NO_TIMES" : "AVAILABLE",
    message:
      windows.length === 0
        ? "No scheduled times are available right now. You can still choose as soon as possible."
        : null,
    timeZone: listed.timeZone,
    todayLocalDate: today,
    tomorrowLocalDate: addCalendarDays(today, 1),
    cancellationCutoffMinutes: cutoff,
    windows,
  });
}

export async function setCustomerCheckoutFulfilmentTiming(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: CheckoutOperationOptions = {},
): Promise<Checkout> {
  const customer = requireCustomerActor(actor);
  if (typeof input !== "object" || input === null) {
    throw new CheckoutError("CHECKOUT_INVALID_INPUT", "Checkout timing input is required.");
  }
  const body = input as Record<string, unknown>;
  const checkoutId = body.checkoutId;
  if (typeof checkoutId !== "string") {
    throw new CheckoutError("CHECKOUT_INVALID_INPUT", "checkoutId is required.", {
      field: "checkoutId",
    });
  }
  const expectedRaw = body.expectedCheckoutRevision;
  let expectedCheckoutRevision: bigint;
  if (typeof expectedRaw === "bigint") {
    expectedCheckoutRevision = expectedRaw;
  } else if (typeof expectedRaw === "string" && /^\d+$/.test(expectedRaw)) {
    expectedCheckoutRevision = BigInt(expectedRaw);
  } else {
    throw new CheckoutError(
      "CHECKOUT_INVALID_INPUT",
      "expectedCheckoutRevision must be a non-negative integer.",
      { field: "expectedCheckoutRevision" },
    );
  }
  const parsed = parseTimingInput(body);
  const clock = options.clock ?? systemCheckoutClock;
  const now = clock.now();

  if (parsed.fulfilmentTiming === "SCHEDULED") {
    const checkout = await persistence.withContext(async (ctx) => {
      const row = await findCheckoutRowById(ctx, checkoutId);
      if (!row || row.customerAuthUserId !== customer.authUserId) return null;
      if (isLogicallyExpired(row.expiresAt, now)) {
        throw new CheckoutError("CHECKOUT_EXPIRED", "Checkout has expired.");
      }
      return loadCheckoutAggregate(ctx, row);
    });
    if (!checkout) {
      throw new CheckoutError("CHECKOUT_NOT_FOUND", "Checkout not found.");
    }
    const resolved = await resolveSchedulingOutlet(
      persistence,
      checkout,
      checkout.fulfilmentMode,
      clock,
    );
    if (resolved.kind === "empty") {
      throw new CheckoutError(
        "CHECKOUT_STATE_CONFLICT",
        resolved.result.message ?? "Scheduled fulfilment is not available.",
        { field: "scheduledWindowStartAt" },
      );
    }
    await persistence.withContext((ctx) =>
      sealEligibleScheduledWindow(ctx, {
        brandId: checkout.brandId,
        outletId: resolved.outletId,
        mode: checkout.fulfilmentMode,
        now,
        startAt: parsed.startAt,
        endAt: parsed.endAt,
      }),
    );
  }

  return setCheckoutFulfilmentTiming(
    persistence,
    actor,
    {
      checkoutId,
      expectedCheckoutRevision,
      fulfilmentTiming: parsed.fulfilmentTiming,
      scheduledWindowStartAt: parsed.startAt,
      scheduledWindowEndAt: parsed.endAt,
    },
    options,
  );
}
