/**
 * Shared Serviceability constants and error codes (IMP-019).
 */

export const SERVICEABILITY_STATUSES = [
  "SERVICEABLE",
  "NOT_SERVICEABLE",
  "TEMPORARILY_UNAVAILABLE",
  "INDETERMINATE",
] as const;

export type ServiceabilityStatus = (typeof SERVICEABILITY_STATUSES)[number];

export const SERVICEABILITY_AUDIT_ACTIONS = [
  "serviceability_routing_priority_set",
  "serviceability_pins_added",
  "serviceability_pins_removed",
  "serviceability_pins_replaced",
] as const;

export type ServiceabilityAuditAction =
  (typeof SERVICEABILITY_AUDIT_ACTIONS)[number];

export const SERVICEABILITY_INDETERMINATE_REASONS = [
  "OPERATIONAL_EVALUATION_FAILED",
  "CONFIGURATION_INCONSISTENT",
  "DEPENDENCY_FAILURE",
] as const;

export type ServiceabilityIndeterminateReason =
  (typeof SERVICEABILITY_INDETERMINATE_REASONS)[number];

/** Indian PIN structural rule — same semantics as Customer Addresses. */
export const INDIAN_POSTAL_CODE_PATTERN = /^[1-9][0-9]{5}$/;

export const SERVICEABILITY_ERROR_CODES = [
  "SERVICEABILITY_VALIDATION_ERROR",
  "SERVICEABILITY_POSTAL_CODE_INVALID",
  "SERVICEABILITY_COORDINATES_INVALID",
  "SERVICEABILITY_FORBIDDEN_FIELD",
  "SERVICEABILITY_OUTLET_NOT_FOUND",
  "SERVICEABILITY_CONFIGURATION_CONFLICT",
  "SERVICEABILITY_ROUTING_PRIORITY_REQUIRED",
  "SERVICEABILITY_ROUTING_PRIORITY_INVALID",
  "SERVICEABILITY_UNAUTHORIZED",
  "SERVICEABILITY_UNAUTHENTICATED",
  "SERVICEABILITY_PERSISTENCE_ERROR",
  "SERVICEABILITY_AUDIT_ERROR",
] as const;

export type ServiceabilityErrorCode =
  (typeof SERVICEABILITY_ERROR_CODES)[number];

export const SERVICEABILITY_COORDINATE_FRACTIONAL_DIGITS = 7;
