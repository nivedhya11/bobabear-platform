/**
 * Effective outlet operating-state resolver (IMP-014).
 */
import { getLocalWallClockParts, type EligibilityDecisionCode } from "../../shared/assortment";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole, assertUuid } from "./assert-role";
import { loadOutletAncestry } from "./assortment-reads";
import {
  findOutletOperatingProfile,
  listOutletOperatingIntervals,
} from "./operating";
import type {
  ResolveOperatingStateInput,
  ResolveOutletOperatingStateResult,
} from "./types";

export async function resolveOutletOperatingState(
  context: PersistenceQueryContext,
  input: ResolveOperatingStateInput,
): Promise<ResolveOutletOperatingStateResult> {
  assertApplicationRole(context, "resolveOutletOperatingState");
  const outletId = assertUuid(input.outletId, "outletId");
  const now = input.context.now;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    return {
      effectiveState: "suspended",
      code: "ERROR",
      timezone: null,
      controlState: null,
    };
  }

  try {
    const ancestry = await loadOutletAncestry(context, outletId);
    if (ancestry.status !== "active") {
      return {
        effectiveState: "suspended",
        code: "OUTLET_INACTIVE",
        timezone: null,
        controlState: null,
      };
    }

    const profile = await findOutletOperatingProfile(context, outletId);
    const intervals = await listOutletOperatingIntervals(context, outletId);
    if (!profile || intervals.length === 0) {
      return {
        effectiveState: "suspended",
        code: "OPERATING_CONFIGURATION_MISSING",
        timezone: profile?.timezone ?? null,
        controlState: profile?.controlState ?? null,
      };
    }

    if (profile.controlState === "suspended") {
      return {
        effectiveState: "suspended",
        code: "OUTLET_SUSPENDED",
        timezone: profile.timezone,
        controlState: profile.controlState,
      };
    }

    if (profile.controlState === "paused") {
      const pauseActive =
        profile.pausedUntil === null || profile.pausedUntil.getTime() > now.getTime();
      if (pauseActive) {
        return {
          effectiveState: "paused",
          code: "OUTLET_PAUSED",
          timezone: profile.timezone,
          controlState: profile.controlState,
        };
      }
      // Expired pause falls through to schedule without mutating.
    }

    let local: { dayOfWeek: number; minuteOfDay: number };
    try {
      local = getLocalWallClockParts(now, profile.timezone);
    } catch {
      return {
        effectiveState: "suspended",
        code: "OPERATING_CONFIGURATION_MISSING",
        timezone: profile.timezone,
        controlState: profile.controlState,
      };
    }

    const inSchedule = intervals.some(
      (interval) =>
        interval.dayOfWeek === local.dayOfWeek &&
        interval.startMinute <= local.minuteOfDay &&
        local.minuteOfDay < interval.endMinute,
    );

    if (!inSchedule) {
      return {
        effectiveState: "closed_by_schedule",
        code: "OUTLET_CLOSED_BY_SCHEDULE",
        timezone: profile.timezone,
        controlState: profile.controlState,
      };
    }

    return {
      effectiveState: "accepting",
      code: "AVAILABLE" satisfies EligibilityDecisionCode,
      timezone: profile.timezone,
      controlState: profile.controlState,
    };
  } catch {
    return {
      effectiveState: "suspended",
      code: "ERROR",
      timezone: null,
      controlState: null,
    };
  }
}
