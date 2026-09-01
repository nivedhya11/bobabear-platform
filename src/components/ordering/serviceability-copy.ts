/**
 * Serviceability / deliver-to customer copy — projection only, no domain authority.
 */

import { BUSINESS } from "@/lib/site";
import type { CommerceCartEvaluation } from "@/lib/customer-commerce";

export function deliverToOperatingAreaHeading(): string {
  return "Delivering in";
}

export function deliverToOperatingAreaLocality(): string {
  return BUSINESS.locality;
}

export function deliverToOrientationBody(): string {
  return `Choose your delivery location in ${BUSINESS.locality}.`;
}

export function deliverToPinHint(): string {
  return "Choose your delivery location to check availability.";
}

export function cartEvaluationCustomerCopy(
  evaluation: CommerceCartEvaluation | null,
  hasLocation: boolean,
): string | null {
  if (!evaluation) {
    return hasLocation
      ? "We'll check this location before you pay."
      : null;
  }

  switch (evaluation.status) {
    case "COMPLETE":
      return "This location looks deliverable.";
    case "REQUIRES_FULFILMENT_CONTEXT":
      return "Choose your delivery location to check availability.";
    case "SERVICEABILITY_NOT_SERVICEABLE":
      return "We don't deliver to that location yet. You can still browse and choose another.";
    case "SERVICEABILITY_TEMPORARILY_UNAVAILABLE":
      return "Delivery isn't available right now for that location. Try again later.";
    case "SERVICEABILITY_INDETERMINATE":
    case "EVALUATION_INDETERMINATE":
      return "We couldn't confirm delivery for that location. Try again shortly.";
    default:
      return "Please check this location again.";
  }
}
