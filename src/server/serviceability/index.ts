/**
 * Public entry point for the Serviceability module (IMP-019).
 *
 * Owns Outlet delivery-coverage configuration and ephemeral Serviceability
 * evaluation. Never owns Cart, Pricing, Customer Addresses, or delivery fees.
 */
import "server-only";

export {
  ServiceabilityError,
  SERVICEABILITY_AUDIT_ACTIONS,
  SERVICEABILITY_ERROR_CODES,
  SERVICEABILITY_INDETERMINATE_REASONS,
  SERVICEABILITY_STATUSES,
  type OutletServiceabilityConfiguration,
  type ServiceabilityAuditAction,
  type ServiceabilityCandidate,
  type ServiceabilityCoordinates,
  type ServiceabilityDecision,
  type ServiceabilityErrorCode,
  type ServiceabilityIndeterminateReason,
  type ServiceabilityLocationEvidence,
  type ServiceabilityStatus,
} from "../../shared/serviceability";

export {
  addOutletServiceabilityPins,
  getOutletServiceabilityConfiguration,
  removeOutletServiceabilityPins,
  replaceOutletServiceabilityPins,
  setOutletServiceabilityRoutingPriority,
  setOutletServiceabilityDistancePolicy,
} from "./administration";

export {
  evaluateServiceability,
  type EvaluateServiceabilityOptions,
} from "./evaluate";

export {
  fixedServiceabilityClock,
  systemServiceabilityClock,
  type ServiceabilityClock,
} from "./clock";

export { findServiceabilityCandidates } from "./repository";
