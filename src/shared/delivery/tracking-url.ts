/**
 * Delivery tracking URL validation (IMP-032).
 *
 * HTTPS absolute URLs only; convenience projection — not lifecycle authority.
 */
import { DELIVERY_REFERENCE_MAX_LENGTH } from "./constants";
import { DeliveryError } from "./errors";

const BLOCKED_SCHEMES = ["javascript:", "data:"] as const;

export const DELIVERY_TRACKING_REFERENCE_KIND = "tracking_url" as const;

export function validateHttpsTrackingUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new DeliveryError(
      "DELIVERY_INVALID_INPUT",
      "trackingUrl must be a valid absolute URL.",
      { field: "trackingUrl" },
    );
  }
  const lower = parsed.protocol.toLowerCase();
  if (lower !== "https:") {
    throw new DeliveryError(
      "DELIVERY_INVALID_INPUT",
      "trackingUrl must use HTTPS.",
      { field: "trackingUrl" },
    );
  }
  for (const blocked of BLOCKED_SCHEMES) {
    if (value.trim().toLowerCase().startsWith(blocked)) {
      throw new DeliveryError(
        "DELIVERY_INVALID_INPUT",
        "trackingUrl scheme is not permitted.",
        { field: "trackingUrl" },
      );
    }
  }
  const normalized = parsed.toString();
  if (normalized.length > DELIVERY_REFERENCE_MAX_LENGTH) {
    throw new DeliveryError(
      "DELIVERY_INVALID_INPUT",
      `trackingUrl must be at most ${DELIVERY_REFERENCE_MAX_LENGTH} characters.`,
      { field: "trackingUrl" },
    );
  }
  return normalized;
}

/** Returns validated URL or null when absent/invalid for customer-safe projection. */
export function tryCustomerTrackingUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return validateHttpsTrackingUrl(value);
  } catch {
    return null;
  }
}
