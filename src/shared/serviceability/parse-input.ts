/**
 * Strict input parsers for Serviceability admin and runtime (IMP-019).
 */
import {
  assertPositiveRoutingPriority,
  assertUuid,
  canonicalizeDistancePolicyFields,
  canonicalizePostalCodeSet,
  canonicalizeServiceabilityCoordinates,
  canonicalizeOptionalServiceabilityPostalCode,
  canonicalizeServiceabilityPostalCode,
  parseExpectedRevision,
} from "./canonicalize";
import { ServiceabilityError } from "./errors";
import type {
  ServiceabilityCoordinates,
  ServiceabilityLocationEvidence,
} from "./types";

function rejectUnknownFields(
  raw: Record<string, unknown>,
  allowed: ReadonlySet<string>,
): void {
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      throw new ServiceabilityError(
        "SERVICEABILITY_FORBIDDEN_FIELD",
        `Unknown or forbidden field: ${key}.`,
        key,
      );
    }
  }
}

const ADMIN_BASE_FORBIDDEN = new Set([
  "actorId",
  "brandId",
  "territoryId",
  "organizationId",
  "customerId",
  "deliveryFee",
  "outletStatus",
  "revisionToWrite",
  "occurredAt",
  "performedBy",
  "revision",
]);

export type SetRoutingPriorityInput = Readonly<{
  outletId: string;
  routingPriority: number;
  expectedRevision: bigint | null;
}>;

export type SetDistancePolicyInput = Readonly<{
  outletId: string;
  expectedRevision: bigint | null;
  serviceOriginLatitude: string | null;
  serviceOriginLongitude: string | null;
  maxServiceDistanceMeters: number | null;
}>;

export type PinMutationInput = Readonly<{
  outletId: string;
  postalCodes: readonly string[];
  expectedRevision: bigint | null;
}>;

export type EvaluateServiceabilityInput = Readonly<{
  brandId: string;
  location: ServiceabilityLocationEvidence;
}>;

export function parseSetRoutingPriorityInput(
  raw: unknown,
): SetRoutingPriorityInput {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ServiceabilityError(
      "SERVICEABILITY_VALIDATION_ERROR",
      "Input must be an object.",
    );
  }
  const obj = raw as Record<string, unknown>;
  rejectUnknownFields(
    obj,
    new Set(["outletId", "routingPriority", "expectedRevision"]),
  );
  for (const key of Object.keys(obj)) {
    if (ADMIN_BASE_FORBIDDEN.has(key)) {
      throw new ServiceabilityError(
        "SERVICEABILITY_FORBIDDEN_FIELD",
        `Forbidden field: ${key}.`,
        key,
      );
    }
  }
  return Object.freeze({
    outletId: assertUuid(obj.outletId, "outletId"),
    routingPriority: assertPositiveRoutingPriority(obj.routingPriority),
    expectedRevision: parseExpectedRevision(obj.expectedRevision),
  });
}

function parsePinMutationInput(raw: unknown): PinMutationInput {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ServiceabilityError(
      "SERVICEABILITY_VALIDATION_ERROR",
      "Input must be an object.",
    );
  }
  const obj = raw as Record<string, unknown>;
  rejectUnknownFields(
    obj,
    new Set(["outletId", "postalCodes", "expectedRevision"]),
  );
  for (const key of Object.keys(obj)) {
    if (ADMIN_BASE_FORBIDDEN.has(key)) {
      throw new ServiceabilityError(
        "SERVICEABILITY_FORBIDDEN_FIELD",
        `Forbidden field: ${key}.`,
        key,
      );
    }
  }
  return Object.freeze({
    outletId: assertUuid(obj.outletId, "outletId"),
    postalCodes: canonicalizePostalCodeSet(obj.postalCodes),
    expectedRevision: parseExpectedRevision(obj.expectedRevision),
  });
}

export function parseSetDistancePolicyInput(raw: unknown): SetDistancePolicyInput {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ServiceabilityError(
      "SERVICEABILITY_VALIDATION_ERROR",
      "Input must be an object.",
    );
  }
  const obj = raw as Record<string, unknown>;
  rejectUnknownFields(
    obj,
    new Set([
      "outletId",
      "expectedRevision",
      "serviceOriginLatitude",
      "serviceOriginLongitude",
      "maxServiceDistanceMeters",
    ]),
  );
  for (const key of Object.keys(obj)) {
    if (ADMIN_BASE_FORBIDDEN.has(key)) {
      throw new ServiceabilityError(
        "SERVICEABILITY_FORBIDDEN_FIELD",
        `Forbidden field: ${key}.`,
        key,
      );
    }
  }
  const policy = canonicalizeDistancePolicyFields({
    serviceOriginLatitude: obj.serviceOriginLatitude,
    serviceOriginLongitude: obj.serviceOriginLongitude,
    maxServiceDistanceMeters: obj.maxServiceDistanceMeters,
  });
  return Object.freeze({
    outletId: assertUuid(obj.outletId, "outletId"),
    expectedRevision: parseExpectedRevision(obj.expectedRevision),
    serviceOriginLatitude: policy?.serviceOriginLatitude ?? null,
    serviceOriginLongitude: policy?.serviceOriginLongitude ?? null,
    maxServiceDistanceMeters: policy?.maxServiceDistanceMeters ?? null,
  });
}

export function parseAddPinsInput(raw: unknown): PinMutationInput {
  const parsed = parsePinMutationInput(raw);
  if (parsed.postalCodes.length === 0) {
    // Empty add is a set-noop after revision match; still valid input shape.
    return parsed;
  }
  return parsed;
}

export const parseRemovePinsInput = parsePinMutationInput;
export const parseReplacePinsInput = parsePinMutationInput;

export function parseGetConfigurationInput(raw: unknown): { outletId: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ServiceabilityError(
      "SERVICEABILITY_VALIDATION_ERROR",
      "Input must be an object.",
    );
  }
  const obj = raw as Record<string, unknown>;
  rejectUnknownFields(obj, new Set(["outletId"]));
  return Object.freeze({
    outletId: assertUuid(obj.outletId, "outletId"),
  });
}

const RUNTIME_FORBIDDEN = new Set([
  "selectedOutletId",
  "routingPriority",
  "isServiceable",
  "evaluatedAt",
  "evaluateAt",
  "timestamp",
  "deliveryFee",
  "customerAuthUserId",
  "customerId",
  "addressId",
  "cartId",
  "actorId",
]);

export function parseEvaluateServiceabilityInput(
  raw: unknown,
): EvaluateServiceabilityInput {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ServiceabilityError(
      "SERVICEABILITY_VALIDATION_ERROR",
      "Input must be an object.",
    );
  }
  const obj = raw as Record<string, unknown>;
  rejectUnknownFields(obj, new Set(["brandId", "location"]));
  for (const key of Object.keys(obj)) {
    if (RUNTIME_FORBIDDEN.has(key)) {
      throw new ServiceabilityError(
        "SERVICEABILITY_FORBIDDEN_FIELD",
        `Forbidden field: ${key}.`,
        key,
      );
    }
  }

  const brandId = assertUuid(obj.brandId, "brandId");
  if (
    typeof obj.location !== "object" ||
    obj.location === null ||
    Array.isArray(obj.location)
  ) {
    throw new ServiceabilityError(
      "SERVICEABILITY_VALIDATION_ERROR",
      "location must be an object.",
      "location",
    );
  }
  const locationObj = obj.location as Record<string, unknown>;
  rejectUnknownFields(locationObj, new Set(["postalCode", "coordinates"]));
  for (const key of Object.keys(locationObj)) {
    if (RUNTIME_FORBIDDEN.has(key)) {
      throw new ServiceabilityError(
        "SERVICEABILITY_FORBIDDEN_FIELD",
        `Forbidden location field: ${key}.`,
        key,
      );
    }
  }

  const postalCode = canonicalizeOptionalServiceabilityPostalCode(
    locationObj.postalCode,
  );
  const coordinates: ServiceabilityCoordinates | null =
    canonicalizeServiceabilityCoordinates(locationObj.coordinates);

  return Object.freeze({
    brandId,
    location: Object.freeze({
      ...(postalCode !== null ? { postalCode } : {}),
      ...(coordinates !== null ? { coordinates } : {}),
    }),
  });
}
