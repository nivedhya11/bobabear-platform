/**
 * Runtime Serviceability evaluation (IMP-019 + IMP-036B outlet-distance V1).
 *
 * Read-only. Coordinate-authoritative geographic model with server-side Haversine.
 * Postal/PIN codes are address metadata only — never geographic authority.
 */
import {
  geodesicDistanceMeters,
  parseServiceabilityCoordinate,
  parseEvaluateServiceabilityInput,
  parseServiceabilityLocationEvidence,
  ServiceabilityError,
  assertUuid,
  type ServiceabilityCandidate,
  type ServiceabilityDecision,
  type ServiceabilityLocationEvidence,
} from "../../shared/serviceability";
import { resolveOutletOperatingState } from "../assortment/resolve-operating";
import type { Persistence, PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole } from "./assert-role";
import {
  systemServiceabilityClock,
  type ServiceabilityClock,
} from "./clock";
import {
  findServiceabilityCandidateForOutlet,
  findServiceabilityCandidates,
} from "./repository";

export type EvaluateServiceabilityOptions = Readonly<{
  clock?: ServiceabilityClock;
}>;

function isAuthoritativelyEligible(code: string): boolean {
  return code === "AVAILABLE";
}

function isAuthoritativelyUnavailable(code: string): boolean {
  return (
    code === "OUTLET_INACTIVE" ||
    code === "OUTLET_SUSPENDED" ||
    code === "OUTLET_PAUSED" ||
    code === "OUTLET_CLOSED_BY_SCHEDULE" ||
    code === "OPERATING_CONFIGURATION_MISSING"
  );
}

function isGeographicallyEligible(
  candidate: ServiceabilityCandidate,
  coordinates: Readonly<{ latitude: string; longitude: string }>,
): boolean {
  const policy = candidate.distancePolicy;
  if (policy === null) return false;
  const originLat = parseServiceabilityCoordinate(policy.serviceOriginLatitude);
  const originLng = parseServiceabilityCoordinate(policy.serviceOriginLongitude);
  const pointLat = parseServiceabilityCoordinate(coordinates.latitude);
  const pointLng = parseServiceabilityCoordinate(coordinates.longitude);
  if (
    originLat === null ||
    originLng === null ||
    pointLat === null ||
    pointLng === null
  ) {
    return false;
  }
  const distanceMeters = geodesicDistanceMeters({
    originLatitude: originLat,
    originLongitude: originLng,
    pointLatitude: pointLat,
    pointLongitude: pointLng,
  });
  return distanceMeters <= policy.maxServiceDistanceMeters;
}

/**
 * Shared candidate evaluation rules for Brand-wide and Outlet-scoped reads.
 * Does not invent separate sellability rules.
 */
/**
 * Scheduled horizon still uses the same geographic candidates.
 * Current PAUSED and closed-by-schedule do not remove a geographically
 * serviceable Outlet; future windows are filtered separately.
 * Inactive, suspended, and missing operating configuration stay unavailable.
 */
function isSelectableForScheduledHorizon(code: string): boolean {
  return (
    code === "AVAILABLE" ||
    code === "OUTLET_PAUSED" ||
    code === "OUTLET_CLOSED_BY_SCHEDULE"
  );
}

async function evaluateServiceabilityCandidates(
  ctx: PersistenceQueryContext,
  candidates: readonly ServiceabilityCandidate[],
  coordinates: Readonly<{ latitude: string; longitude: string }>,
  evaluatedAt: Date,
  horizon: "current" | "scheduled" = "current",
): Promise<ServiceabilityDecision> {
  if (candidates.length === 0) {
    return Object.freeze({
      status: "INDETERMINATE" as const,
      evaluatedAt,
      reason: "CONFIGURATION_INCONSISTENT" as const,
    });
  }

  let sawAuthoritativeUnavailable = false;
  let sawGeographicallyIneligible = false;

  for (const candidate of candidates) {
    if (!isGeographicallyEligible(candidate, coordinates)) {
      sawGeographicallyIneligible = true;
      continue;
    }

    let operating;
    try {
      operating = await resolveOutletOperatingState(ctx, {
        outletId: candidate.outletId,
        context: { now: evaluatedAt },
      });
    } catch {
      return Object.freeze({
        status: "INDETERMINATE" as const,
        evaluatedAt,
        reason: "OPERATIONAL_EVALUATION_FAILED" as const,
      });
    }

    if (operating.code === "ERROR") {
      return Object.freeze({
        status: "INDETERMINATE" as const,
        evaluatedAt,
        reason: "OPERATIONAL_EVALUATION_FAILED" as const,
      });
    }

    const selectable =
      horizon === "scheduled"
        ? isSelectableForScheduledHorizon(operating.code)
        : isAuthoritativelyEligible(operating.code);
    if (selectable) {
      return Object.freeze({
        status: "SERVICEABLE" as const,
        evaluatedAt,
        selectedOutletId: candidate.outletId,
      });
    }

    if (isAuthoritativelyUnavailable(operating.code)) {
      sawAuthoritativeUnavailable = true;
      continue;
    }

    return Object.freeze({
      status: "INDETERMINATE" as const,
      evaluatedAt,
      reason: "DEPENDENCY_FAILURE" as const,
    });
  }

  if (sawAuthoritativeUnavailable) {
    return Object.freeze({
      status: "TEMPORARILY_UNAVAILABLE" as const,
      evaluatedAt,
    });
  }

  if (sawGeographicallyIneligible) {
    return Object.freeze({
      status: "NOT_SERVICEABLE" as const,
      evaluatedAt,
    });
  }

  return Object.freeze({
    status: "INDETERMINATE" as const,
    evaluatedAt,
    reason: "CONFIGURATION_INCONSISTENT" as const,
  });
}

function resolveEvaluatedAt(clock: ServiceabilityClock): Date {
  const evaluatedAt = clock.now();
  if (!(evaluatedAt instanceof Date) || Number.isNaN(evaluatedAt.getTime())) {
    throw new ServiceabilityError(
      "SERVICEABILITY_VALIDATION_ERROR",
      "Trusted evaluation clock returned an invalid instant.",
    );
  }
  return evaluatedAt;
}

/**
 * Evaluate current Serviceability for trusted Brand + location evidence.
 * Does not require a workforce session. Never writes.
 */
export async function evaluateServiceability(
  persistence: Persistence,
  input: unknown,
  options: EvaluateServiceabilityOptions = {},
): Promise<ServiceabilityDecision> {
  const parsed = parseEvaluateServiceabilityInput(input);
  const clock = options.clock ?? systemServiceabilityClock;
  const evaluatedAt = resolveEvaluatedAt(clock);

  const coordinates = parsed.location.coordinates ?? undefined;
  if (!coordinates) {
    return Object.freeze({
      status: "INDETERMINATE" as const,
      evaluatedAt,
      reason: "LOCATION_COORDINATES_REQUIRED" as const,
    });
  }

  return persistence.withContext(async (ctx) => {
    assertApplicationRole(ctx, "evaluateServiceability");

    const candidates = await findServiceabilityCandidates(ctx, {
      brandId: parsed.brandId,
    });

    return evaluateServiceabilityCandidates(
      ctx,
      candidates,
      coordinates,
      evaluatedAt,
    );
  });
}

/**
 * Geographic Delivery serviceability for a future Scheduled window.
 * Does not treat current pause or current closed-by-schedule as a refusal.
 */
export async function evaluateScheduledHorizonServiceability(
  persistence: Persistence,
  input: unknown,
  options: EvaluateServiceabilityOptions = {},
): Promise<ServiceabilityDecision> {
  const parsed = parseEvaluateServiceabilityInput(input);
  const clock = options.clock ?? systemServiceabilityClock;
  const evaluatedAt = resolveEvaluatedAt(clock);

  const coordinates = parsed.location.coordinates ?? undefined;
  if (!coordinates) {
    return Object.freeze({
      status: "INDETERMINATE" as const,
      evaluatedAt,
      reason: "LOCATION_COORDINATES_REQUIRED" as const,
    });
  }

  return persistence.withContext((ctx) =>
    evaluateScheduledHorizonServiceabilityInContext(ctx, {
      brandId: parsed.brandId,
      coordinates,
      evaluatedAt,
    }),
  );
}

/**
 * Same read as {@link evaluateScheduledHorizonServiceability}, on a caller-
 * supplied context so a binding transaction can re-read while it holds locks.
 */
/**
 * Current (ASAP) geographic serviceability on a caller-supplied context so a
 * binding transaction can re-read while it holds Outlet locks.
 */
export async function evaluateCurrentServiceabilityInContext(
  context: PersistenceQueryContext,
  input: Readonly<{
    brandId: string;
    coordinates: Readonly<{ latitude: string; longitude: string }>;
    evaluatedAt: Date;
  }>,
): Promise<ServiceabilityDecision> {
  assertApplicationRole(context, "evaluateCurrentServiceabilityInContext");
  const candidates = await findServiceabilityCandidates(context, {
    brandId: input.brandId,
  });
  return evaluateServiceabilityCandidates(
    context,
    candidates,
    input.coordinates,
    input.evaluatedAt,
    "current",
  );
}

export async function evaluateScheduledHorizonServiceabilityInContext(
  context: PersistenceQueryContext,
  input: Readonly<{
    brandId: string;
    coordinates: Readonly<{ latitude: string; longitude: string }>;
    evaluatedAt: Date;
  }>,
): Promise<ServiceabilityDecision> {
  assertApplicationRole(context, "evaluateScheduledHorizonServiceabilityInContext");
  const candidates = await findServiceabilityCandidates(context, {
    brandId: input.brandId,
  });
  return evaluateServiceabilityCandidates(
    context,
    candidates,
    input.coordinates,
    input.evaluatedAt,
    "scheduled",
  );
}

export type EvaluateOutletServiceabilityInput = Readonly<{
  brandId: string;
  outletId: string;
  location: ServiceabilityLocationEvidence;
}>;

/**
 * Evaluate Serviceability for exactly one Brand Outlet + location evidence.
 * Uses the same geographic + operating rules as Brand-wide evaluation, but never
 * considers sibling outlets. Read-only; no workforce session required.
 */
export async function evaluateOutletServiceability(
  persistence: Persistence,
  input: EvaluateOutletServiceabilityInput,
  options: EvaluateServiceabilityOptions = {},
): Promise<ServiceabilityDecision> {
  const brandId = assertUuid(input.brandId, "brandId");
  const outletId = assertUuid(input.outletId, "outletId");
  // Same canonical location validation as Brand-wide evaluateServiceability.
  const location = parseServiceabilityLocationEvidence(input.location);
  const clock = options.clock ?? systemServiceabilityClock;
  const evaluatedAt = resolveEvaluatedAt(clock);

  const coordinates = location.coordinates ?? undefined;
  if (!coordinates) {
    return Object.freeze({
      status: "INDETERMINATE" as const,
      evaluatedAt,
      reason: "LOCATION_COORDINATES_REQUIRED" as const,
    });
  }

  return persistence.withContext(async (ctx) => {
    assertApplicationRole(ctx, "evaluateOutletServiceability");

    const candidate = await findServiceabilityCandidateForOutlet(ctx, {
      brandId,
      outletId,
    });

    return evaluateServiceabilityCandidates(
      ctx,
      candidate ? [candidate] : [],
      coordinates,
      evaluatedAt,
    );
  });
}
