/**
 * Serviceability / deliver-to customer copy — projection only, no domain authority.
 */

import { BUSINESS } from "@/lib/site";
import type {
  CommerceCartEvaluation,
  CommerceServiceabilityDecision,
} from "@/lib/customer-commerce";

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

export function deliveryServiceabilityCustomerCopy(
  decision: CommerceServiceabilityDecision | null | undefined,
  hasLocation: boolean,
): string | null {
  if (!hasLocation) return null;
  if (!decision) {
    return "We'll check this location before you pay.";
  }
  switch (decision.status) {
    case "SERVICEABLE":
      return "This location looks deliverable.";
    case "NOT_SERVICEABLE":
      return "We don't deliver to that location yet. You can still browse and choose another.";
    case "TEMPORARILY_UNAVAILABLE":
      return "Delivery isn't available right now for that location. Try again later.";
    case "INDETERMINATE":
      return "We couldn't confirm delivery for that location. Try again shortly.";
    default:
      return "Please check this location again.";
  }
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
    case "CART_INVALID":
      return "Some items in your cart aren't available right now. Update or remove them to continue.";
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

/**
 * Checkout may continue without a location (address selection later).
 * Known blocking evaluations with location must not look ready to order.
 */
export function isCartCheckoutBlocked(
  evaluation: CommerceCartEvaluation | null,
): boolean {
  if (!evaluation) return false;
  switch (evaluation.status) {
    case "COMPLETE":
    case "REQUIRES_FULFILMENT_CONTEXT":
      return false;
    case "CART_INVALID":
    case "SERVICEABILITY_NOT_SERVICEABLE":
    case "SERVICEABILITY_TEMPORARILY_UNAVAILABLE":
    case "SERVICEABILITY_INDETERMINATE":
    case "EVALUATION_INDETERMINATE":
      return true;
    default:
      return true;
  }
}
