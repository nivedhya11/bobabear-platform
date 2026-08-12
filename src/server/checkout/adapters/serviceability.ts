/**
 * Serviceability adapter for Checkout (IMP-021).
 */

import { CheckoutError, type CheckoutDestination } from "../../../shared/checkout";
import type { Persistence } from "../../persistence/types";
import { evaluateServiceability } from "../../serviceability/evaluate";
import type { CheckoutClock } from "../clock";

export type CheckoutServiceabilityResult = Readonly<{
  selectedOutletId: string;
  evaluatedAt: Date;
}>;

export async function resolveCheckoutServiceability(
  persistence: Persistence,
  brandId: string,
  destination: CheckoutDestination,
  clock: CheckoutClock,
): Promise<CheckoutServiceabilityResult> {
  const evaluatedAt = clock.now();
  let result;
  try {
    result = await evaluateServiceability(
      persistence,
      {
        brandId,
        location: {
          postalCode: destination.postalCode,
          coordinates: destination.coordinates,
        },
      },
      { clock },
    );
  } catch {
    throw new CheckoutError(
      "CHECKOUT_DEPENDENCY_INDETERMINATE",
      "Serviceability evaluation failed.",
    );
  }

  if (result.status === "NOT_SERVICEABLE") {
    throw new CheckoutError(
      "CHECKOUT_NOT_SERVICEABLE",
      "Destination is not serviceable.",
    );
  }
  if (result.status === "TEMPORARILY_UNAVAILABLE") {
    throw new CheckoutError(
      "CHECKOUT_SERVICEABILITY_TEMPORARILY_UNAVAILABLE",
      "Serviceability is temporarily unavailable.",
    );
  }
  if (result.status === "INDETERMINATE") {
    throw new CheckoutError(
      "CHECKOUT_SERVICEABILITY_INDETERMINATE",
      "Serviceability could not be determined.",
    );
  }
  if (result.status !== "SERVICEABLE" || !result.selectedOutletId) {
    throw new CheckoutError(
      "CHECKOUT_SERVICEABILITY_INDETERMINATE",
      "Serviceability could not select an Outlet.",
    );
  }

  return Object.freeze({
    selectedOutletId: result.selectedOutletId,
    evaluatedAt,
  });
}
