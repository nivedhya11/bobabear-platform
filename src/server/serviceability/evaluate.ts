/**
 * Runtime Serviceability evaluation (IMP-019).
 *
 * Read-only. PIN-only geographic model. Reuses Operational Availability.
 * Coordinates never upgrade/downgrade coverage.
 */
import {
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

    // Coordinates are accepted/validated above but never affect geography.
    void parsed.location.coordinates;

    if (candidates.length === 0) {
      return Object.freeze({
        status: "NOT_SERVICEABLE" as const,
        evaluatedAt,
      });
    }

    let sawAuthoritativeUnavailable = false;

    for (const candidate of candidates) {
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
        // Higher-preference candidate cannot be safely evaluated → INDETERMINATE.
        // Do not skip to a lower-priority outlet.
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

      // Unknown / unexpected code from operational domain → fail closed.
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

    return Object.freeze({
      status: "INDETERMINATE" as const,
      evaluatedAt,
      reason: "CONFIGURATION_INCONSISTENT" as const,
    });
  });
}
