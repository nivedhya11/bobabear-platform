/**
 * Canonical Checkout helpers (IMP-021).
 */

import { CheckoutError } from "./errors";
import type { CheckoutDestination, CheckoutPolicy } from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertUuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new CheckoutError(
      "CHECKOUT_INVALID_INPUT",
      `${field} must be a UUID.`,
      { field },
    );
  }
  return value;
}

export function parseExpectedCheckoutRevision(raw: unknown): bigint {
  if (typeof raw !== "bigint" || raw <= BigInt(0)) {
    throw new CheckoutError(
      "CHECKOUT_INVALID_INPUT",
      "expectedCheckoutRevision must be a positive bigint.",
      { field: "expectedCheckoutRevision" },
    );
  }
  return raw;
}

export function requireCheckoutTtlMs(
  policy: CheckoutPolicy | undefined,
): number {
  const ttl = policy?.checkoutTtlMs;
  if (typeof ttl !== "number" || !Number.isFinite(ttl) || ttl <= 0) {
    throw new CheckoutError(
      "CHECKOUT_INVALID_INPUT",
      "checkoutTtlMs must be a positive finite number.",
      { field: "checkoutTtlMs" },
    );
  }
  return ttl;
}

export function isLogicallyExpired(expiresAt: Date, now: Date): boolean {
  return now.getTime() >= expiresAt.getTime();
}

export function destinationsEqual(
  a: CheckoutDestination,
  b: CheckoutDestination,
): boolean {
  return (
    a.destinationKind === b.destinationKind &&
    a.sourceSavedAddressId === b.sourceSavedAddressId &&
    a.recipientName === b.recipientName &&
    a.recipientPhone === b.recipientPhone &&
    a.addressLine1 === b.addressLine1 &&
    a.addressLine2 === b.addressLine2 &&
    a.landmark === b.landmark &&
    a.locality === b.locality &&
    a.city === b.city &&
    a.stateCode === b.stateCode &&
    a.postalCode === b.postalCode &&
    a.label === b.label &&
    coordinatesEqual(a.coordinates, b.coordinates)
  );
}

function coordinatesEqual(
  a: CheckoutDestination["coordinates"],
  b: CheckoutDestination["coordinates"],
): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.latitude === b.latitude && a.longitude === b.longitude;
}

export function compareIsoUuid(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
