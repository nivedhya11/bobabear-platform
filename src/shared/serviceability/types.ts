/**
 * Shared Serviceability domain types (IMP-019).
 *
 * Revision is TypeScript `bigint` — never round-trip through unsafe number.
 * Coordinates reuse IMP-018 exact decimal-string semantics when supplied.
 */

import type {
  ServiceabilityAuditAction,
  ServiceabilityIndeterminateReason,
  ServiceabilityStatus,
} from "./constants";

/** Exact coordinate pair — decimal strings at 7 fractional digits, or null. */
export type ServiceabilityCoordinates = Readonly<{
  latitude: string;
  longitude: string;
}>;

/** Minimal location evidence for runtime evaluation. */
export type ServiceabilityLocationEvidence = Readonly<{
  postalCode: string;
  coordinates?: ServiceabilityCoordinates | null;
}>;

export type OutletServiceabilityConfiguration = Readonly<{
  outletId: string;
  routingPriority: number | null;
  postalCodes: readonly string[];
  revision: bigint | null;
  serviceOriginLatitude: string | null;
  serviceOriginLongitude: string | null;
  maxServiceDistanceMeters: number | null;
}>;

export type ServiceabilityDistancePolicy = Readonly<{
  serviceOriginLatitude: string;
  serviceOriginLongitude: string;
  maxServiceDistanceMeters: number;
}>;

export type ServiceabilityDecision =
  | Readonly<{
      status: "SERVICEABLE";
      evaluatedAt: Date;
      selectedOutletId: string;
    }>
  | Readonly<{
      status: "NOT_SERVICEABLE";
      evaluatedAt: Date;
    }>
  | Readonly<{
      status: "TEMPORARILY_UNAVAILABLE";
      evaluatedAt: Date;
    }>
  | Readonly<{
      status: "INDETERMINATE";
      evaluatedAt: Date;
      reason: ServiceabilityIndeterminateReason;
    }>;

export type ServiceabilityCandidate = Readonly<{
  outletId: string;
  routingPriority: number;
  distancePolicy: ServiceabilityDistancePolicy | null;
}>;

export type ServiceabilityAuditEvent = Readonly<{
  id: string;
  occurredAt: Date;
  actorKind: "workforce";
  actorId: string;
  outletId: string;
  action: ServiceabilityAuditAction;
  previousRevision: bigint | null;
  newRevision: bigint;
  previousRoutingPriority: number | null;
  newRoutingPriority: number | null;
  addedPostalCodes: readonly string[];
  removedPostalCodes: readonly string[];
}>;

export type ServiceabilityStatusValue = ServiceabilityStatus;
