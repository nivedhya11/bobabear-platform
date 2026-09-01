/**
 * Runtime Serviceability evaluation (IMP-019 + IMP-036B hybrid distance V1).
 *
 * Read-only. PIN-required geographic model with optional outlet-distance policy.
 * Coordinates never upgrade an unsupported PIN.
 */
import {
  geodesicDistanceMeters,
  isDistancePolicyConfigured,
  parseServiceabilityCoordinate,
  parseEvaluateServiceabilityInput,
  ServiceabilityError,
  type ServiceabilityDecision,
} from "../../shared/serviceability";
import { resolveOutletOperatingState } from "../assortment/resolve-operating";
import type { Persistence } from "../persistence/types";
import { assertApplicationRole } from "./assert-role";
import {
  systemServiceabilityClock,
  type ServiceabilityClock,
} from "./clock";
import { findServiceabilityCandidates } from "./repository";

export type EvaluateServiceabilityOptions = Readonly<{
  clock?: ServiceabilityClock;
}>;

function isAuthoritativelyEligible(
  code: string,
): boolean {
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
  candidate: Awaited<ReturnType<typeof findServiceabilityCandidates>>[number],
  coordinates: Readonly<{ latitude: string; longitude: string }> | undefined,
): boolean {
  if (!coordinates || candidate.distancePolicy === null) {
    return true;
  }
  const policy = candidate.distancePolicy;
  if (
    !isDistancePolicyConfigured({
      serviceOriginLatitude: policy.serviceOriginLatitude,
      serviceOriginLongitude: policy.serviceOriginLongitude,
      maxServiceDistanceMeters: policy.maxServiceDistanceMeters,
    })
  ) {
    return true;
  }
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
    return true;
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
  const evaluatedAt = clock.now();
  if (!(evaluatedAt instanceof Date) || Number.isNaN(evaluatedAt.getTime())) {
    throw new ServiceabilityError(
      "SERVICEABILITY_VALIDATION_ERROR",
      "Trusted evaluation clock returned an invalid instant.",
    );
  }

  return persistence.withContext(async (ctx) => {
    assertApplicationRole(ctx, "evaluateServiceability");

    const candidates = await findServiceabilityCandidates(ctx, {
      brandId: parsed.brandId,
      postalCode: parsed.location.postalCode,
    });

    const coordinates = parsed.location.coordinates ?? undefined;

    if (candidates.length === 0) {
      return Object.freeze({
        status: "NOT_SERVICEABLE" as const,
        evaluatedAt,
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

      if (isAuthoritativelyEligible(operating.code)) {
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
  });
}
