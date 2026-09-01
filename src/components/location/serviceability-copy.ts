/**
 * Serviceability customer copy for location selector (IMP-036B).
 */
import type { CommerceServiceabilityStatus } from "@/lib/customer-commerce";

export function serviceabilityStatusCopy(status: CommerceServiceabilityStatus): string {
  switch (status) {
    case "SERVICEABLE":
      return "Great — we deliver here.";
    case "NOT_SERVICEABLE":
      return "We don't deliver to this location yet.";
    case "TEMPORARILY_UNAVAILABLE":
      return "Delivery is temporarily unavailable here.";
    case "INDETERMINATE":
      return "We couldn't confirm delivery right now.";
  }
}

export function serviceabilityRecoveryHint(status: CommerceServiceabilityStatus): string | null {
  switch (status) {
    case "NOT_SERVICEABLE":
      return "Choose another location or enter a PIN manually.";
    case "TEMPORARILY_UNAVAILABLE":
      return "Try again later or choose another location.";
    case "INDETERMINATE":
      return "Retry, choose another location, or enter a PIN manually.";
    default:
      return null;
  }
}

export function locationProviderUnavailableCopy(): string {
  return "Location search isn't available right now. Enter your PIN instead.";
}

export function missingPinCopy(): string {
  return "We found the location but couldn't confirm its PIN code. Enter the PIN to check delivery.";
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
