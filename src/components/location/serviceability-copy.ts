/**
 * Serviceability customer copy for location selector (IMP-036B).
 */
import type { CommerceServiceabilityStatus } from "@/lib/customer-commerce";

export function serviceabilityStatusCopy(status: CommerceServiceabilityStatus): string {
  switch (status) {
    case "SERVICEABLE":
      return "Delivery is available for this PIN.";
    case "NOT_SERVICEABLE":
      return "We don't deliver to that PIN yet. You can still browse and try another location.";
    case "TEMPORARILY_UNAVAILABLE":
      return "Delivery isn't available right now for that PIN. Try again later.";
    case "INDETERMINATE":
      return "We couldn't confirm delivery for that PIN. Try again shortly.";
  }
}

export function geolocationFailureCopy(
  reason: "unsupported" | "permission_denied" | "unavailable" | "timeout",
): string {
  switch (reason) {
    case "unsupported":
      return "This browser doesn't support device location.";
    case "permission_denied":
      return "Location access was denied. Enter a PIN or choose a saved address instead.";
    case "unavailable":
      return "We couldn't read your location. Enter a PIN or choose a saved address instead.";
    case "timeout":
      return "Location took too long. Enter a PIN or choose a saved address instead.";
  }
}
