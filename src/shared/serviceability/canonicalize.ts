/**
 * PIN / coordinate / input canonicalization for Serviceability (IMP-019).
 *
 * Reuses Customer Address coordinate semantics; PIN uses the same Indian
 * structural rule without depending on Address domain error codes.
 */
import {
  CUSTOMER_ADDRESS_COORDINATE_FRACTIONAL_DIGITS,
  canonicalizeCoordinates,
  canonicalizePostalCode,
  CustomerAddressError,
  type CustomerAddressCoordinates,
} from "../customer-addresses";
import {
  INDIAN_POSTAL_CODE_PATTERN,
  SERVICEABILITY_COORDINATE_FRACTIONAL_DIGITS,
} from "./constants";
import { ServiceabilityError } from "./errors";
import type { ServiceabilityCoordinates } from "./types";

if (
  SERVICEABILITY_COORDINATE_FRACTIONAL_DIGITS !==
  CUSTOMER_ADDRESS_COORDINATE_FRACTIONAL_DIGITS
) {
  throw new Error(
    "Serviceability coordinate precision must match Customer Address precision.",
  );
}

export function canonicalizeServiceabilityPostalCode(raw: unknown): string {
  if (raw === undefined || raw === null) {
    throw new ServiceabilityError(
      "SERVICEABILITY_POSTAL_CODE_INVALID",
      "postalCode is required.",
      "postalCode",
    );
  }
  try {
    const canonical = canonicalizePostalCode(raw);
    if (!INDIAN_POSTAL_CODE_PATTERN.test(canonical)) {
      throw new ServiceabilityError(
        "SERVICEABILITY_POSTAL_CODE_INVALID",
        "postalCode must be a six-digit Indian PIN.",
        "postalCode",
      );
    }
    return canonical;
  } catch (error) {
    if (error instanceof ServiceabilityError) throw error;
    if (error instanceof CustomerAddressError) {
      throw new ServiceabilityError(
        "SERVICEABILITY_POSTAL_CODE_INVALID",
        "postalCode must be a six-digit Indian PIN.",
        "postalCode",
      );
    }
    throw error;
  }
}

export function canonicalizeServiceabilityCoordinates(
  raw: unknown,
): ServiceabilityCoordinates | null {
  if (raw === undefined || raw === null) {
    return null;
  }
  try {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new ServiceabilityError(
        "SERVICEABILITY_COORDINATES_INVALID",
        "coordinates must be a valid latitude/longitude pair.",
        "coordinates",
      );
    }
    const coords: CustomerAddressCoordinates | null =
      canonicalizeCoordinates(raw as CustomerAddressCoordinates);
    if (coords === null) return null;
    return Object.freeze({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
  } catch (error) {
    if (error instanceof ServiceabilityError) throw error;
    if (error instanceof CustomerAddressError) {
      throw new ServiceabilityError(
        "SERVICEABILITY_COORDINATES_INVALID",
        "coordinates must be a valid latitude/longitude pair.",
        "coordinates",
      );
    }
    throw error;
  }
}

/** Deduplicate and sort PIN codes ascending (set semantics). */
export function canonicalizePostalCodeSet(
  raw: unknown,
): readonly string[] {
  if (!Array.isArray(raw)) {
    throw new ServiceabilityError(
      "SERVICEABILITY_VALIDATION_ERROR",
      "postalCodes must be an array.",
      "postalCodes",
    );
  }
  const set = new Set<string>();
  for (const item of raw) {
    set.add(canonicalizeServiceabilityPostalCode(item));
  }
  return Object.freeze([...set].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
}

export function assertPositiveRoutingPriority(raw: unknown): number {
  if (
    typeof raw !== "number" ||
    !Number.isInteger(raw) ||
    raw <= 0 ||
    !Number.isSafeInteger(raw)
  ) {
    throw new ServiceabilityError(
      "SERVICEABILITY_ROUTING_PRIORITY_INVALID",
      "routingPriority must be a positive integer.",
      "routingPriority",
    );
  }
  return raw;
}

export function parseExpectedRevision(raw: unknown): bigint | null {
  if (raw === undefined || raw === null) {
    return null;
  }
  if (typeof raw === "bigint") {
    if (raw <= BigInt(0)) {
      throw new ServiceabilityError(
        "SERVICEABILITY_VALIDATION_ERROR",
        "expectedRevision must be a positive bigint when provided.",
        "expectedRevision",
      );
    }
    return raw;
  }
  // Reject unsafe number round-trips and strings — exact bigint only.
  throw new ServiceabilityError(
    "SERVICEABILITY_VALIDATION_ERROR",
    "expectedRevision must be bigint or null.",
    "expectedRevision",
  );
}

export function assertUuid(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new ServiceabilityError(
      "SERVICEABILITY_VALIDATION_ERROR",
      `${field} must be a UUID.`,
      field,
    );
  }
  return value.toLowerCase();
}
