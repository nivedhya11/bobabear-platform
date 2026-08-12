/**
 * Outlet operating profile, schedule, and control-state mutations (IMP-014).
 *
 * Schedule replacement DELETEs existing interval rows then INSERTs the new set.
 * DELETE is intentionally allowed only on outlet_operating_intervals (config
 * rows replaced atomically); historical schedule changes are audited.
 */
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import {
  isDayOfWeek,
  isValidIanaTimezone,
  OPERATING_INTERVAL_END_MINUTE_MAX,
  OPERATING_INTERVAL_END_MINUTE_MIN,
  OPERATING_INTERVAL_START_MINUTE_MAX,
  OPERATING_INTERVAL_START_MINUTE_MIN,
  type DayOfWeek,
  type OutletControlState,
} from "../../shared/assortment";
import {
  outletOperatingIntervalsTable,
  outletOperatingProfilesTable,
} from "../../platform/database/schema/assortment";
import { requireWorkforcePrincipal } from "../access-control/principal";
import type { PersistenceQueryContext, PersistenceTransactionContext } from "../persistence/types";
import {
  assertApplicationRole,
  assertTransactionContext,
  assertUuid,
  normalizeOptionalNote,
  normalizeOptionalReasonCode,
} from "./assert-role";
import { insertAssortmentAuditEvent } from "./audit";
import {
  requireOperatingScheduleManage,
  requireOperatingStatePause,
  requireOperatingStateSuspend,
} from "./authorize-assortment";
import {
  AssortmentInvalidStateError,
  AssortmentNotFoundError,
  AssortmentValidationError,
} from "./errors";
import type {
  ConfigureOutletOperatingProfileInput,
  OperatingIntervalInput,
  OutletControlMutationInput,
  OutletOperatingInterval,
  OutletOperatingProfile,
  ReplaceOutletOperatingScheduleInput,
} from "./types";

function rowToProfile(
  row: typeof outletOperatingProfilesTable.$inferSelect,
): OutletOperatingProfile {
  return {
    id: row.id,
    brandId: row.brandId,
    organizationId: row.organizationId,
    territoryId: row.territoryId,
    outletId: row.outletId,
    timezone: row.timezone,
    controlState: row.controlState as OutletControlState,
    pausedUntil: row.pausedUntil ? new Date(row.pausedUntil) : null,
    reasonCode: row.reasonCode,
    note: row.note,
    updatedByWorkforceUserId: row.updatedByWorkforceUserId,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function rowToInterval(
  row: typeof outletOperatingIntervalsTable.$inferSelect,
): OutletOperatingInterval {
  return {
    id: row.id,
    brandId: row.brandId,
    organizationId: row.organizationId,
    territoryId: row.territoryId,
    outletId: row.outletId,
    dayOfWeek: row.dayOfWeek as DayOfWeek,
    startMinute: row.startMinute,
    endMinute: row.endMinute,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export function validateOperatingSchedule(
  intervals: readonly OperatingIntervalInput[],
): void {
  if (!Array.isArray(intervals) || intervals.length === 0) {
    throw new AssortmentValidationError({
      message: "Schedule must include at least one operating interval.",
    });
  }

  const byDay = new Map<number, OperatingIntervalInput[]>();
  for (const interval of intervals) {
    if (!isDayOfWeek(interval.dayOfWeek)) {
      throw new AssortmentValidationError({ message: "dayOfWeek must be an integer 0–6." });
    }
    if (
      !Number.isInteger(interval.startMinute) ||
      interval.startMinute < OPERATING_INTERVAL_START_MINUTE_MIN ||
      interval.startMinute > OPERATING_INTERVAL_START_MINUTE_MAX
    ) {
      throw new AssortmentValidationError({
        message: "startMinute must be an integer in [0, 1439].",
      });
    }
    if (
      !Number.isInteger(interval.endMinute) ||
      interval.endMinute < OPERATING_INTERVAL_END_MINUTE_MIN ||
      interval.endMinute > OPERATING_INTERVAL_END_MINUTE_MAX
    ) {
      throw new AssortmentValidationError({
        message: "endMinute must be an integer in [1, 1440].",
      });
    }
    if (interval.startMinute >= interval.endMinute) {
      throw new AssortmentValidationError({
        message: "startMinute must be less than endMinute (no cross-midnight rows).",
      });
    }
    const list = byDay.get(interval.dayOfWeek) ?? [];
    list.push(interval);
    byDay.set(interval.dayOfWeek, list);
  }

  for (const [, dayIntervals] of byDay) {
    const sorted = [...dayIntervals].sort((a, b) => a.startMinute - b.startMinute);
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i]!.startMinute < sorted[i - 1]!.endMinute) {
        throw new AssortmentValidationError({
          message: "Operating intervals must not overlap on the same day.",
        });
      }
    }
  }
}

export async function findOutletOperatingProfile(
  context: PersistenceQueryContext,
  outletId: string,
): Promise<OutletOperatingProfile | null> {
  assertApplicationRole(context, "findOutletOperatingProfile");
  const id = assertUuid(outletId, "outletId");
  const rows = await context.db
    .select()
    .from(outletOperatingProfilesTable)
    .where(eq(outletOperatingProfilesTable.outletId, id))
    .limit(1);
  return rows[0] ? rowToProfile(rows[0]) : null;
}

export async function listOutletOperatingIntervals(
  context: PersistenceQueryContext,
  outletId: string,
): Promise<readonly OutletOperatingInterval[]> {
  assertApplicationRole(context, "listOutletOperatingIntervals");
  const id = assertUuid(outletId, "outletId");
  const rows = await context.db
    .select()
    .from(outletOperatingIntervalsTable)
    .where(eq(outletOperatingIntervalsTable.outletId, id));
  return rows.map(rowToInterval);
}

export async function configureOutletOperatingProfile(
  context: PersistenceTransactionContext,
  input: ConfigureOutletOperatingProfileInput,
): Promise<OutletOperatingProfile> {
  assertTransactionContext(context, "configureOutletOperatingProfile");
  const outletId = assertUuid(input.outletId, "outletId");
  // Configuring timezone uses schedule.manage (profile is schedule config).
  const outlet = await requireOperatingScheduleManage(context, input.actor, outletId);
  const principal = requireWorkforcePrincipal(input.actor);

  const timezone = typeof input.timezone === "string" ? input.timezone.trim() : "";
  if (!isValidIanaTimezone(timezone)) {
    throw new AssortmentValidationError({
      message: "timezone must be a valid IANA timezone identifier.",
    });
  }

  const reasonCode = normalizeOptionalReasonCode(input.reasonCode);
  const note = normalizeOptionalNote(input.note);
  const now = new Date();

  const existing = await findOutletOperatingProfile(context, outletId);
  let id: string;
  if (existing) {
    id = existing.id;
    await context.db
      .update(outletOperatingProfilesTable)
      .set({
        timezone,
        reasonCode,
        note,
        updatedByWorkforceUserId: principal.workforceUserId,
        updatedAt: now,
      })
      .where(eq(outletOperatingProfilesTable.id, id));
  } else {
    id = randomUUID();
    await context.db.insert(outletOperatingProfilesTable).values({
      id,
      brandId: outlet!.brandId,
      organizationId: outlet!.organizationId,
      territoryId: outlet!.territoryId,
      outletId,
      timezone,
      controlState: "accepting",
      pausedUntil: null,
      reasonCode,
      note,
      updatedByWorkforceUserId: principal.workforceUserId,
      createdAt: now,
      updatedAt: now,
    });
  }

  await insertAssortmentAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    action: "outlet.operating_state_changed",
    brandId: outlet!.brandId,
    territoryId: outlet!.territoryId,
    organizationId: outlet!.organizationId,
    outletId,
    targetType: "outlet",
    targetId: outletId,
    metadata: { timezone, profileId: id, mutation: "configure_profile" },
    occurredAt: now,
  });

  const profile = await findOutletOperatingProfile(context, outletId);
  if (!profile) throw new AssortmentNotFoundError("outlet_operating_profile");
  return profile;
}

export async function replaceOutletOperatingSchedule(
  context: PersistenceTransactionContext,
  input: ReplaceOutletOperatingScheduleInput,
): Promise<readonly OutletOperatingInterval[]> {
  assertTransactionContext(context, "replaceOutletOperatingSchedule");
  const outletId = assertUuid(input.outletId, "outletId");
  const outlet = await requireOperatingScheduleManage(context, input.actor, outletId);
  const principal = requireWorkforcePrincipal(input.actor);

  validateOperatingSchedule(input.intervals);

  const profile = await findOutletOperatingProfile(context, outletId);
  if (!profile) {
    throw new AssortmentInvalidStateError({
      message: "Configure an operating profile before replacing the schedule.",
    });
  }

  const now = new Date();

  // Atomic full replacement: DELETE then INSERT (intervals are replaceable config).
  await context.db
    .delete(outletOperatingIntervalsTable)
    .where(eq(outletOperatingIntervalsTable.outletId, outletId));

  const createdIds: string[] = [];
  for (const interval of input.intervals) {
    const id = randomUUID();
    createdIds.push(id);
    await context.db.insert(outletOperatingIntervalsTable).values({
      id,
      brandId: outlet!.brandId,
      organizationId: outlet!.organizationId,
      territoryId: outlet!.territoryId,
      outletId,
      dayOfWeek: interval.dayOfWeek,
      startMinute: interval.startMinute,
      endMinute: interval.endMinute,
      createdAt: now,
      updatedAt: now,
    });
  }

  await insertAssortmentAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    action: "outlet.operating_schedule_changed",
    brandId: outlet!.brandId,
    territoryId: outlet!.territoryId,
    organizationId: outlet!.organizationId,
    outletId,
    targetType: "outlet",
    targetId: outletId,
    metadata: { intervalCount: input.intervals.length },
    occurredAt: now,
  });

  return listOutletOperatingIntervals(context, outletId);
}

async function updateControlState(
  context: PersistenceTransactionContext,
  input: OutletControlMutationInput,
  next: {
    controlState: OutletControlState;
    pausedUntil: Date | null;
    permission: "pause" | "suspend";
  },
): Promise<OutletOperatingProfile> {
  assertTransactionContext(context, "updateOutletControlState");
  const outletId = assertUuid(input.outletId, "outletId");
  const outlet =
    next.permission === "pause"
      ? await requireOperatingStatePause(context, input.actor, outletId)
      : await requireOperatingStateSuspend(context, input.actor, outletId);
  const principal = requireWorkforcePrincipal(input.actor);

  const profile = await findOutletOperatingProfile(context, outletId);
  if (!profile) {
    throw new AssortmentInvalidStateError({
      message: "Configure an operating profile before changing control state.",
    });
  }

  const reasonCode = normalizeOptionalReasonCode(input.reasonCode);
  const note = normalizeOptionalNote(input.note);
  const now = new Date();

  await context.db
    .update(outletOperatingProfilesTable)
    .set({
      controlState: next.controlState,
      pausedUntil: next.pausedUntil,
      reasonCode,
      note,
      updatedByWorkforceUserId: principal.workforceUserId,
      updatedAt: now,
    })
    .where(eq(outletOperatingProfilesTable.id, profile.id));

  await insertAssortmentAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    action: "outlet.operating_state_changed",
    brandId: outlet!.brandId,
    territoryId: outlet!.territoryId,
    organizationId: outlet!.organizationId,
    outletId,
    targetType: "outlet",
    targetId: outletId,
    metadata: {
      controlState: next.controlState,
      previousControlState: profile.controlState,
    },
    occurredAt: now,
  });

  const updated = await findOutletOperatingProfile(context, outletId);
  if (!updated) throw new AssortmentNotFoundError("outlet_operating_profile");
  return updated;
}

export async function pauseOutlet(
  context: PersistenceTransactionContext,
  input: OutletControlMutationInput,
): Promise<OutletOperatingProfile> {
  const profile = await findOutletOperatingProfile(
    context,
    assertUuid(input.outletId, "outletId"),
  );
  if (profile?.controlState === "suspended") {
    throw new AssortmentInvalidStateError({
      message: "Cannot pause a suspended outlet; unsuspend first.",
    });
  }
  const pausedUntil =
    input.pausedUntil === undefined ? null : input.pausedUntil;
  if (pausedUntil !== null && !(pausedUntil instanceof Date)) {
    throw new AssortmentValidationError({
      message: "pausedUntil must be a Date or null.",
    });
  }
  return updateControlState(context, input, {
    controlState: "paused",
    pausedUntil,
    permission: "pause",
  });
}

export async function resumeOutlet(
  context: PersistenceTransactionContext,
  input: OutletControlMutationInput,
): Promise<OutletOperatingProfile> {
  const profile = await findOutletOperatingProfile(
    context,
    assertUuid(input.outletId, "outletId"),
  );
  if (!profile) {
    throw new AssortmentInvalidStateError({
      message: "Configure an operating profile before resuming.",
    });
  }
  if (profile.controlState === "suspended") {
    throw new AssortmentInvalidStateError({
      message: "Cannot resume a suspended outlet; unsuspend is required.",
    });
  }
  if (profile.controlState !== "paused") {
    throw new AssortmentInvalidStateError({
      message: "Outlet is not paused.",
    });
  }
  return updateControlState(context, input, {
    controlState: "accepting",
    pausedUntil: null,
    permission: "pause",
  });
}

export async function suspendOutlet(
  context: PersistenceTransactionContext,
  input: OutletControlMutationInput,
): Promise<OutletOperatingProfile> {
  return updateControlState(context, input, {
    controlState: "suspended",
    pausedUntil: null,
    permission: "suspend",
  });
}

export async function unsuspendOutlet(
  context: PersistenceTransactionContext,
  input: OutletControlMutationInput,
): Promise<OutletOperatingProfile> {
  const profile = await findOutletOperatingProfile(
    context,
    assertUuid(input.outletId, "outletId"),
  );
  if (!profile) {
    throw new AssortmentInvalidStateError({
      message: "Configure an operating profile before unsuspending.",
    });
  }
  if (profile.controlState !== "suspended") {
    throw new AssortmentInvalidStateError({
      message: "Outlet is not suspended.",
    });
  }
  return updateControlState(context, input, {
    controlState: "accepting",
    pausedUntil: null,
    permission: "suspend",
  });
}
