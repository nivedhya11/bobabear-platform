/**
 * Delivery domain constants (IMP-031 / ARCH-G24).
 *
 * Provider-neutral execution and return lifecycles only. No concrete provider
 * enums, operating-mode statuses, or Order mutation codes.
 */

export const DELIVERY_EXECUTION_STATUSES = [
  "REQUESTED",
  "BOOKING_OUTCOME_UNKNOWN",
  "BOOKED",
  "PICKED_UP",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
] as const;

export type DeliveryExecutionStatus = (typeof DELIVERY_EXECUTION_STATUSES)[number];

/** Active for the one-active-Delivery-per-Order invariant. */
export const DELIVERY_ACTIVE_STATUSES = [
  "REQUESTED",
  "BOOKING_OUTCOME_UNKNOWN",
  "BOOKED",
  "PICKED_UP",
] as const;

export type DeliveryActiveStatus = (typeof DELIVERY_ACTIVE_STATUSES)[number];

export const DELIVERY_TERMINAL_STATUSES = [
  "DELIVERED",
  "FAILED",
  "CANCELLED",
] as const;

export type DeliveryTerminalStatus = (typeof DELIVERY_TERMINAL_STATUSES)[number];

export const DELIVERY_RETURN_STATUSES = [
  "RETURN_REQUESTED",
  "RETURNING",
  "RETURNED",
  "RETURN_FAILED",
] as const;

export type DeliveryReturnStatus = (typeof DELIVERY_RETURN_STATUSES)[number];

export const DELIVERY_RETURN_ACTIVE_STATUSES = [
  "RETURN_REQUESTED",
  "RETURNING",
] as const;

export type DeliveryReturnActiveStatus =
  (typeof DELIVERY_RETURN_ACTIVE_STATUSES)[number];

export const DELIVERY_RETURN_TERMINAL_STATUSES = [
  "RETURNED",
  "RETURN_FAILED",
] as const;

export type DeliveryReturnTerminalStatus =
  (typeof DELIVERY_RETURN_TERMINAL_STATUSES)[number];

export const DELIVERY_OBSERVATION_SOURCES = [
  "sync",
  "query",
  "reconciliation",
  "manual",
] as const;

export type DeliveryObservationSource =
  (typeof DELIVERY_OBSERVATION_SOURCES)[number];

/**
 * Provider-neutral normalized observation meanings.
 * Raw provider statuses never become Delivery authority.
 */
export const DELIVERY_OBSERVATION_MEANINGS = [
  "BOOKING_ACTIVE",
  "BOOKING_INACTIVE_FAILED",
  "BOOKING_INACTIVE_CANCELLED",
  "BOOKING_AMBIGUOUS",
  "ASSIGNMENT",
  "PICKED_UP",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
  "UNKNOWN",
] as const;

export type DeliveryObservationMeaning =
  (typeof DELIVERY_OBSERVATION_MEANINGS)[number];

export const DELIVERY_OBSERVATION_DISPOSITIONS = [
  "APPLIED",
  "DUPLICATE",
  "UNAPPLIED_UNKNOWN",
  "UNAPPLIED_CONFLICT",
  "UNAPPLIED_UNSAFE",
  "UNAPPLIED_NO_TRANSITION",
] as const;

export type DeliveryObservationDisposition =
  (typeof DELIVERY_OBSERVATION_DISPOSITIONS)[number];

export const DELIVERY_PROVIDER_COST_KINDS = [
  "estimated",
  "booked",
  "final",
  "cancellation",
  "return",
  "adjustment",
] as const;

export type DeliveryProviderCostKind =
  (typeof DELIVERY_PROVIDER_COST_KINDS)[number];

export const DELIVERY_BOOKING_OUTCOMES = [
  "BOOKED",
  "FAILED",
  "CANCELLED",
  "AMBIGUOUS",
] as const;

export type DeliveryBookingOutcome = (typeof DELIVERY_BOOKING_OUTCOMES)[number];

export const DELIVERY_CURRENCY = "INR" as const;

export const DELIVERY_FAKE_PROVIDER = "fake" as const;

export const DELIVERY_REQUEST_FINGERPRINT_MAX_LENGTH = 128 as const;
export const DELIVERY_REASON_MAX_LENGTH = 500 as const;
export const DELIVERY_REFERENCE_MAX_LENGTH = 256 as const;
export const DELIVERY_OBSERVATION_KEY_MAX_LENGTH = 256 as const;
