/**
 * Server-authoritative Scheduled window eligibility (IMP-036I Tranche 2).
 *
 * Composes IMP-036E hours, CLOSED_FULL_DAY exceptions, and the Outlet
 * scheduling profile. No slot capacity, reservation, or client-authored windows.
 */
import "server-only";

import { and, eq } from "drizzle-orm";

import { outletsTable } from "../../platform/database/schema/organizations";
import { CheckoutError, type FulfilmentMode } from "../../shared/checkout";
import {
  findExactScheduledWindow,
  listEligibleScheduledWindows,
  type ScheduledWindow,
} from "../../shared/scheduled-fulfilment/windows";
import { isValidIanaTimezone } from "../../shared/assortment";
import {
  findOutletOperatingProfile,
  listOutletOperatingIntervals,
} from "../assortment/operating";
import { loadOutletAncestry } from "../assortment/assortment-reads";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole } from "./assert-role";
import { loadOutletPickupProfileByOutletId } from "../outlet-pickup-profile/repository";
import {
  listOutletClosedFullDayDates,
  loadOutletSchedulingProfile,
  resolveBrandScheduledFulfilmentPolicy,
} from "../scheduled-fulfilment/foundations";

export type ScheduledSnapshotSeal = Readonly<{
  fulfilmentTiming: "SCHEDULED";
  scheduledWindowStartAt: Date;
  scheduledWindowEndAt: Date;
  scheduledTimezone: string;
  scheduledCancellationCutoffMinutes: number;
}>;

function unavailable(message: string): never {
  throw new CheckoutError("CHECKOUT_STATE_CONFLICT", message, {
    field: "scheduledWindowStartAt",
  });
}

export async function assertScheduledPickupProfile(
  context: PersistenceQueryContext,
  input: Readonly<{ brandId: string; outletId: string }>,
): Promise<void> {
  assertApplicationRole(context, "assertScheduledPickupProfile");
  const outletRows = await context.db
    .select({
      id: outletsTable.id,
      status: outletsTable.status,
      brandId: outletsTable.brandId,
    })
    .from(outletsTable)
    .where(
      and(
        eq(outletsTable.id, input.outletId),
        eq(outletsTable.brandId, input.brandId),
      ),
    )
    .limit(1);
  const outlet = outletRows[0];
  if (!outlet || outlet.status !== "active") {
    throw new CheckoutError(
      "PICKUP_OUTLET_NOT_ELIGIBLE",
      "Selected pickup outlet is not eligible.",
      { field: "pickupOutletId" },
    );
  }
  const profile = await loadOutletPickupProfileByOutletId(context, outlet.id);
  if (!profile || !profile.enabled) {
    throw new CheckoutError(
      "PICKUP_OUTLET_NOT_ELIGIBLE",
      "Selected pickup outlet is not eligible.",
      { field: "pickupOutletId" },
    );
  }
  const operating = await findOutletOperatingProfile(context, outlet.id);
  if (!operating || operating.controlState === "suspended") {
    throw new CheckoutError(
      "PICKUP_OUTLET_NOT_ELIGIBLE",
      "Selected pickup outlet is not eligible.",
      { field: "pickupOutletId" },
    );
  }
}

export async function listServerScheduledWindows(
  context: PersistenceQueryContext,
  input: Readonly<{
    outletId: string;
    mode: FulfilmentMode;
    now: Date;
  }>,
): Promise<
  Readonly<{
    timeZone: string;
    windows: readonly ScheduledWindow[];
  }>
> {
  assertApplicationRole(context, "listServerScheduledWindows");
  let ancestry;
  try {
    ancestry = await loadOutletAncestry(context, input.outletId);
  } catch {
    unavailable("Selected Outlet cannot accept Scheduled fulfilment.");
  }
  if (ancestry.status !== "active") {
    unavailable("Selected Outlet cannot accept Scheduled fulfilment.");
  }

  const operating = await findOutletOperatingProfile(context, input.outletId);
  if (!operating || !isValidIanaTimezone(operating.timezone)) {
    unavailable("Scheduled fulfilment requires an Outlet timezone.");
  }
  if (operating.controlState === "suspended") {
    unavailable("Selected Outlet cannot accept Scheduled fulfilment.");
  }

  const profile = await loadOutletSchedulingProfile(context, input.outletId);
  if (!profile) {
    unavailable(
      "Scheduled fulfilment is not configured for this Outlet.",
    );
  }

  const intervals = await listOutletOperatingIntervals(context, input.outletId);
  const closedDates = await listOutletClosedFullDayDates(context, input.outletId);
  const minLeadMinutes =
    input.mode === "PICKUP"
      ? profile.pickupMinLeadMinutes
      : profile.deliveryMinLeadMinutes;
  const windows = listEligibleScheduledWindows({
    now: input.now,
    timeZone: operating.timezone,
    intervals,
    closedLocalDates: new Set(closedDates),
    minLeadMinutes,
  });
  return Object.freeze({
    timeZone: operating.timezone,
    windows,
  });
}

export async function sealEligibleScheduledWindow(
  context: PersistenceQueryContext,
  input: Readonly<{
    brandId: string;
    outletId: string;
    mode: FulfilmentMode;
    now: Date;
    startAt: Date | null;
    endAt: Date | null;
  }>,
): Promise<ScheduledSnapshotSeal> {
  if (!input.startAt || !input.endAt) {
    unavailable("Scheduled Checkout requires a server-eligible window.");
  }
  const listed = await listServerScheduledWindows(context, {
    outletId: input.outletId,
    mode: input.mode,
    now: input.now,
  });
  const matched = findExactScheduledWindow(
    listed.windows,
    input.startAt,
    input.endAt,
  );
  if (!matched) {
    unavailable("Selected scheduled window is not eligible.");
  }
  const policy = await resolveBrandScheduledFulfilmentPolicy(
    context,
    input.brandId,
  );
  const cutoff =
    input.mode === "PICKUP"
      ? policy.pickupCancellationCutoffMinutes
      : policy.deliveryCancellationCutoffMinutes;
  return Object.freeze({
    fulfilmentTiming: "SCHEDULED",
    scheduledWindowStartAt: matched.startAt,
    scheduledWindowEndAt: matched.endAt,
    scheduledTimezone: listed.timeZone,
    scheduledCancellationCutoffMinutes: cutoff,
  });
}
