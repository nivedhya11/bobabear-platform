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
  return `Check your PIN for delivery availability in ${BUSINESS.locality}.`;
}

export function deliverToPinHint(): string {
  return "Enter your PIN to check delivery availability.";
}

export function cartEvaluationCustomerCopy(
  evaluation: CommerceCartEvaluation | null,
  hasPin: boolean,
): string | null {
  if (!evaluation) {
    return hasPin
      ? "We'll confirm this PIN at checkout before you pay."
      : null;
  }

  switch (evaluation.status) {
    case "COMPLETE":
      return "This PIN looks deliverable. Checkout will confirm before you pay.";
    case "REQUIRES_FULFILMENT_CONTEXT":
      return "Add your PIN at checkout to confirm delivery.";
    case "SERVICEABILITY_NOT_SERVICEABLE":
      return "We don't deliver to that PIN yet. You can still browse and update your PIN.";
    case "SERVICEABILITY_TEMPORARILY_UNAVAILABLE":
      return "Delivery isn't available right now for that PIN. Try again later.";
    case "SERVICEABILITY_INDETERMINATE":
    case "EVALUATION_INDETERMINATE":
      return "We couldn't confirm delivery for that PIN. Try again shortly.";
    default:
      return "Delivery is confirmed at checkout.";
  }
}
