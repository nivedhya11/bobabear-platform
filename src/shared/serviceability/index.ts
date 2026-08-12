/**
 * Shared Serviceability boundary (IMP-019) — safe for browser and server.
 */

export {
  INDIAN_POSTAL_CODE_PATTERN,
  SERVICEABILITY_AUDIT_ACTIONS,
  SERVICEABILITY_COORDINATE_FRACTIONAL_DIGITS,
  SERVICEABILITY_ERROR_CODES,
  SERVICEABILITY_INDETERMINATE_REASONS,
  SERVICEABILITY_STATUSES,
  type ServiceabilityAuditAction,
  type ServiceabilityErrorCode,
  type ServiceabilityIndeterminateReason,
  type ServiceabilityStatus,
} from "./constants";

export { ServiceabilityError, isServiceabilityErrorCode } from "./errors";

export type {
  OutletServiceabilityConfiguration,
  ServiceabilityAuditEvent,
  ServiceabilityCandidate,
  ServiceabilityCoordinates,
  ServiceabilityDecision,
  ServiceabilityLocationEvidence,
  ServiceabilityStatusValue,
} from "./types";

export type {
  EvaluateServiceabilityInput,
  PinMutationInput,
  SetRoutingPriorityInput,
} from "./parse-input";

export {
  assertPositiveRoutingPriority,
  assertUuid,
  canonicalizePostalCodeSet,
  canonicalizeServiceabilityCoordinates,
  canonicalizeServiceabilityPostalCode,
  parseExpectedRevision,
} from "./canonicalize";

export {
  parseAddPinsInput,
  parseEvaluateServiceabilityInput,
  parseGetConfigurationInput,
  parseRemovePinsInput,
  parseReplacePinsInput,
  parseSetRoutingPriorityInput,
} from "./parse-input";
