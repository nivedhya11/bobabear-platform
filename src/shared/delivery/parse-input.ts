/**
 * Delivery command parsing (IMP-031).
 */
import {
  DELIVERY_CURRENCY,
  DELIVERY_OBSERVATION_KEY_MAX_LENGTH,
  DELIVERY_OBSERVATION_MEANINGS,
  DELIVERY_OBSERVATION_SOURCES,
  DELIVERY_PROVIDER_COST_KINDS,
  DELIVERY_REASON_MAX_LENGTH,
  DELIVERY_REFERENCE_MAX_LENGTH,
  DELIVERY_REQUEST_FINGERPRINT_MAX_LENGTH,
  DELIVERY_RETURN_STATUSES,
  type DeliveryObservationMeaning,
  type DeliveryObservationSource,
  type DeliveryProviderCostKind,
  type DeliveryReturnStatus,
} from "./constants";
import { DeliveryError } from "./errors";
import { validateHttpsTrackingUrl } from "./tracking-url";
import type {
  AdvanceReturnInput,
  ArrangeDeliveryInput,
  BeginBookingInput,
  BeginReturnInput,
  CancelDeliveryInput,
  ConfirmDeliveryWithFulfilInput,
  ConfirmManualBookingInput,
  ConfirmPickupInput,
  CreateDeliveryInput,
  FailDeliveryInput,
  RecordAssignmentInput,
  RecordBookingOutcomeInput,
  RecordProofAndDeliverInput,
  RecordProviderCostFactInput,
  RecordProviderObservationInput,
  ReconcileAmbiguousBookingInput,
  ResolveManualBookingCancellationInput,
  ResolveManualBookingFailureInput,
  RetryFulfilForDeliveredInput,
  UpdateTrackingReferenceInput,
} from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireObject(input: unknown, label: string): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new DeliveryError("DELIVERY_INVALID_INPUT", `${label} is invalid.`);
  }
  return input as Record<string, unknown>;
}

function requireUuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new DeliveryError("DELIVERY_INVALID_INPUT", `${field} must be a UUID.`, {
      field,
    });
  }
  return value;
}

function requireOptionalUuid(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return requireUuid(value, field);
}

function requireRevision(value: unknown, field = "expectedRevision"): bigint {
  let revision: bigint;
  if (typeof value === "bigint") revision = value;
  else if (typeof value === "number" && Number.isInteger(value)) {
    revision = BigInt(value);
  } else if (typeof value === "string" && /^-?\d+$/.test(value)) {
    revision = BigInt(value);
  } else {
    throw new DeliveryError(
      "DELIVERY_INVALID_INPUT",
      `${field} must be a positive integer.`,
      { field },
    );
  }
  if (revision <= BigInt(0)) {
    throw new DeliveryError(
      "DELIVERY_INVALID_INPUT",
      `${field} must be greater than zero.`,
      { field },
    );
  }
  return revision;
}

function requireNonEmpty(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new DeliveryError("DELIVERY_INVALID_INPUT", `${field} is required.`, {
      field,
    });
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    throw new DeliveryError(
      "DELIVERY_INVALID_INPUT",
      `${field} must be 1–${maxLength} characters.`,
      { field },
    );
  }
  return trimmed;
}

function requireAmountPaise(value: unknown): bigint {
  let amount: bigint;
  if (typeof value === "bigint") amount = value;
  else if (typeof value === "number" && Number.isInteger(value)) {
    amount = BigInt(value);
  } else if (typeof value === "string" && /^-?\d+$/.test(value)) {
    amount = BigInt(value);
  } else {
    throw new DeliveryError(
      "DELIVERY_INVALID_INPUT",
      "amountPaise must be a positive integer.",
      { field: "amountPaise" },
    );
  }
  if (amount <= BigInt(0)) {
    throw new DeliveryError(
      "DELIVERY_INVALID_INPUT",
      "amountPaise must be greater than zero.",
      { field: "amountPaise" },
    );
  }
  return amount;
}

function optionalNonEmpty(
  value: unknown,
  field: string,
  maxLength: number,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return requireNonEmpty(value, field, maxLength);
}

export function parseCreateDeliveryInput(input: unknown): CreateDeliveryInput {
  const record = requireObject(input, "Create delivery request");
  const prior = requireOptionalUuid(record.priorDeliveryId, "priorDeliveryId");
  return Object.freeze({
    orderId: requireUuid(record.orderId, "orderId"),
    requestFingerprint: requireNonEmpty(
      record.requestFingerprint,
      "requestFingerprint",
      DELIVERY_REQUEST_FINGERPRINT_MAX_LENGTH,
    ),
    ...(prior !== undefined ? { priorDeliveryId: prior } : {}),
  });
}

export function parseBeginBookingInput(input: unknown): BeginBookingInput {
  const record = requireObject(input, "Begin booking request");
  const correlation = requireOptionalUuid(
    record.bookingCorrelationId,
    "bookingCorrelationId",
  );
  return Object.freeze({
    deliveryId: requireUuid(record.deliveryId, "deliveryId"),
    expectedRevision: requireRevision(record.expectedRevision),
    provider: requireNonEmpty(record.provider, "provider", DELIVERY_REFERENCE_MAX_LENGTH),
    ...(correlation !== undefined && correlation !== null
      ? { bookingCorrelationId: correlation }
      : {}),
  });
}

export function parseRecordBookingOutcomeInput(
  input: unknown,
): RecordBookingOutcomeInput {
  const record = requireObject(input, "Record booking outcome request");
  const evidenceRaw = requireObject(record.evidence, "evidence");
  const outcome = evidenceRaw.outcome;
  if (
    outcome !== "BOOKED" &&
    outcome !== "FAILED" &&
    outcome !== "CANCELLED" &&
    outcome !== "AMBIGUOUS"
  ) {
    throw new DeliveryError("DELIVERY_INVALID_INPUT", "evidence.outcome is invalid.", {
      field: "evidence.outcome",
    });
  }
  return Object.freeze({
    deliveryId: requireUuid(record.deliveryId, "deliveryId"),
    expectedRevision: requireRevision(record.expectedRevision),
    evidence: Object.freeze({
      outcome,
      provider: requireNonEmpty(
        evidenceRaw.provider,
        "evidence.provider",
        DELIVERY_REFERENCE_MAX_LENGTH,
      ),
      bookingCorrelationId: requireUuid(
        evidenceRaw.bookingCorrelationId,
        "evidence.bookingCorrelationId",
      ),
      externalBookingReference:
        optionalNonEmpty(
          evidenceRaw.externalBookingReference,
          "evidence.externalBookingReference",
          DELIVERY_REFERENCE_MAX_LENGTH,
        ) ?? null,
      providerStatusCode:
        optionalNonEmpty(
          evidenceRaw.providerStatusCode,
          "evidence.providerStatusCode",
          DELIVERY_REFERENCE_MAX_LENGTH,
        ) ?? null,
      providerTimestamp:
        evidenceRaw.providerTimestamp instanceof Date
          ? evidenceRaw.providerTimestamp
          : null,
      failureCode:
        optionalNonEmpty(
          evidenceRaw.failureCode,
          "evidence.failureCode",
          DELIVERY_REFERENCE_MAX_LENGTH,
        ) ?? null,
      failureReason:
        optionalNonEmpty(
          evidenceRaw.failureReason,
          "evidence.failureReason",
          DELIVERY_REASON_MAX_LENGTH,
        ) ?? null,
    }),
  });
}

export function parseReconcileAmbiguousBookingInput(
  input: unknown,
): ReconcileAmbiguousBookingInput {
  const record = requireObject(input, "Reconcile ambiguous booking request");
  return Object.freeze({
    deliveryId: requireUuid(record.deliveryId, "deliveryId"),
    expectedRevision: requireRevision(record.expectedRevision),
  });
}

export function parseRecordProviderObservationInput(
  input: unknown,
): RecordProviderObservationInput {
  const record = requireObject(input, "Record provider observation request");
  if (
    typeof record.observationKey !== "string" ||
    record.observationKey.trim().length === 0
  ) {
    throw new DeliveryError(
      "DELIVERY_OBSERVATION_KEY_REQUIRED",
      "observationKey is required and must be non-empty.",
      { field: "observationKey" },
    );
  }
  const source = record.observationSource;
  if (
    typeof source !== "string" ||
    !(DELIVERY_OBSERVATION_SOURCES as readonly string[]).includes(source)
  ) {
    throw new DeliveryError(
      "DELIVERY_INVALID_INPUT",
      "observationSource is invalid.",
      { field: "observationSource" },
    );
  }
  const meaning = record.normalizedMeaning;
  if (
    typeof meaning !== "string" ||
    !(DELIVERY_OBSERVATION_MEANINGS as readonly string[]).includes(meaning)
  ) {
    throw new DeliveryError(
      "DELIVERY_INVALID_INPUT",
      "normalizedMeaning is invalid.",
      { field: "normalizedMeaning" },
    );
  }
  return Object.freeze({
    deliveryId: requireUuid(record.deliveryId, "deliveryId"),
    expectedRevision: requireRevision(record.expectedRevision),
    provider: requireNonEmpty(record.provider, "provider", DELIVERY_REFERENCE_MAX_LENGTH),
    observationSource: source as DeliveryObservationSource,
    observationKey: requireNonEmpty(
      record.observationKey,
      "observationKey",
      DELIVERY_OBSERVATION_KEY_MAX_LENGTH,
    ),
    providerEventId:
      optionalNonEmpty(
        record.providerEventId,
        "providerEventId",
        DELIVERY_REFERENCE_MAX_LENGTH,
      ) ?? null,
    normalizedMeaning: meaning as DeliveryObservationMeaning,
    payloadDigest:
      optionalNonEmpty(record.payloadDigest, "payloadDigest", 64) ?? null,
    ...(record.observedAt instanceof Date ? { observedAt: record.observedAt } : {}),
    assignmentKey: optionalNonEmpty(
      record.assignmentKey,
      "assignmentKey",
      DELIVERY_REFERENCE_MAX_LENGTH,
    ),
    courierReference: optionalNonEmpty(
      record.courierReference,
      "courierReference",
      DELIVERY_REFERENCE_MAX_LENGTH,
    ),
    externalBookingReference: optionalNonEmpty(
      record.externalBookingReference,
      "externalBookingReference",
      DELIVERY_REFERENCE_MAX_LENGTH,
    ),
    proofReference: optionalNonEmpty(
      record.proofReference,
      "proofReference",
      DELIVERY_REFERENCE_MAX_LENGTH,
    ),
    failureCode: optionalNonEmpty(
      record.failureCode,
      "failureCode",
      DELIVERY_REFERENCE_MAX_LENGTH,
    ),
    failureReason: optionalNonEmpty(
      record.failureReason,
      "failureReason",
      DELIVERY_REASON_MAX_LENGTH,
    ),
    cancellationCode: optionalNonEmpty(
      record.cancellationCode,
      "cancellationCode",
      DELIVERY_REFERENCE_MAX_LENGTH,
    ),
    cancellationReason: optionalNonEmpty(
      record.cancellationReason,
      "cancellationReason",
      DELIVERY_REASON_MAX_LENGTH,
    ),
  });
}

export function parseRecordAssignmentInput(input: unknown): RecordAssignmentInput {
  const record = requireObject(input, "Record assignment request");
  return Object.freeze({
    deliveryId: requireUuid(record.deliveryId, "deliveryId"),
    expectedRevision: requireRevision(record.expectedRevision),
    provider: requireNonEmpty(record.provider, "provider", DELIVERY_REFERENCE_MAX_LENGTH),
    assignmentKey: requireNonEmpty(
      record.assignmentKey,
      "assignmentKey",
      DELIVERY_REFERENCE_MAX_LENGTH,
    ),
    courierReference: optionalNonEmpty(
      record.courierReference,
      "courierReference",
      DELIVERY_REFERENCE_MAX_LENGTH,
    ),
    ...(record.observedAt instanceof Date ? { observedAt: record.observedAt } : {}),
  });
}

export function parseConfirmPickupInput(input: unknown): ConfirmPickupInput {
  const record = requireObject(input, "Confirm pickup request");
  return Object.freeze({
    deliveryId: requireUuid(record.deliveryId, "deliveryId"),
    expectedRevision: requireRevision(record.expectedRevision),
    handoffReference: requireNonEmpty(
      record.handoffReference,
      "handoffReference",
      DELIVERY_REFERENCE_MAX_LENGTH,
    ),
  });
}

export function parseRecordProofAndDeliverInput(
  input: unknown,
): RecordProofAndDeliverInput {
  const record = requireObject(input, "Record proof and deliver request");
  return Object.freeze({
    deliveryId: requireUuid(record.deliveryId, "deliveryId"),
    expectedRevision: requireRevision(record.expectedRevision),
    proofReference: requireNonEmpty(
      record.proofReference,
      "proofReference",
      DELIVERY_REFERENCE_MAX_LENGTH,
    ),
  });
}

export function parseFailDeliveryInput(input: unknown): FailDeliveryInput {
  const record = requireObject(input, "Fail delivery request");
  return Object.freeze({
    deliveryId: requireUuid(record.deliveryId, "deliveryId"),
    expectedRevision: requireRevision(record.expectedRevision),
    failureCode: requireNonEmpty(
      record.failureCode,
      "failureCode",
      DELIVERY_REFERENCE_MAX_LENGTH,
    ),
    failureReason: requireNonEmpty(
      record.failureReason,
      "failureReason",
      DELIVERY_REASON_MAX_LENGTH,
    ),
  });
}

export function parseCancelDeliveryInput(input: unknown): CancelDeliveryInput {
  const record = requireObject(input, "Cancel delivery request");
  return Object.freeze({
    deliveryId: requireUuid(record.deliveryId, "deliveryId"),
    expectedRevision: requireRevision(record.expectedRevision),
    cancellationCode: requireNonEmpty(
      record.cancellationCode,
      "cancellationCode",
      DELIVERY_REFERENCE_MAX_LENGTH,
    ),
    cancellationReason: requireNonEmpty(
      record.cancellationReason,
      "cancellationReason",
      DELIVERY_REASON_MAX_LENGTH,
    ),
  });
}

export function parseBeginReturnInput(input: unknown): BeginReturnInput {
  const record = requireObject(input, "Begin return request");
  if (typeof record.hadCourierCustody !== "boolean") {
    throw new DeliveryError(
      "DELIVERY_INVALID_INPUT",
      "hadCourierCustody must be a boolean.",
      { field: "hadCourierCustody" },
    );
  }
  return Object.freeze({
    deliveryId: requireUuid(record.deliveryId, "deliveryId"),
    reason: requireNonEmpty(record.reason, "reason", DELIVERY_REASON_MAX_LENGTH),
    returnDestination: requireNonEmpty(
      record.returnDestination,
      "returnDestination",
      DELIVERY_REFERENCE_MAX_LENGTH,
    ),
    hadCourierCustody: record.hadCourierCustody,
  });
}

export function parseAdvanceReturnInput(input: unknown): AdvanceReturnInput {
  const record = requireObject(input, "Advance return request");
  const toStatus = record.toStatus;
  if (
    toStatus !== "RETURNING" &&
    toStatus !== "RETURNED" &&
    toStatus !== "RETURN_FAILED"
  ) {
    throw new DeliveryError("DELIVERY_INVALID_INPUT", "toStatus is invalid.", {
      field: "toStatus",
    });
  }
  if (!(DELIVERY_RETURN_STATUSES as readonly string[]).includes(toStatus)) {
    throw new DeliveryError("DELIVERY_INVALID_INPUT", "toStatus is invalid.", {
      field: "toStatus",
    });
  }
  return Object.freeze({
    returnId: requireUuid(record.returnId, "returnId"),
    toStatus: toStatus as Exclude<DeliveryReturnStatus, "RETURN_REQUESTED">,
    failureReason: optionalNonEmpty(
      record.failureReason,
      "failureReason",
      DELIVERY_REASON_MAX_LENGTH,
    ),
  });
}

export function parseRecordProviderCostFactInput(
  input: unknown,
): RecordProviderCostFactInput {
  const record = requireObject(input, "Record provider cost fact request");
  const kind = record.kind;
  if (
    typeof kind !== "string" ||
    !(DELIVERY_PROVIDER_COST_KINDS as readonly string[]).includes(kind)
  ) {
    throw new DeliveryError("DELIVERY_INVALID_INPUT", "kind is invalid.", {
      field: "kind",
    });
  }
  let currency: "INR" | undefined;
  if (record.currency !== undefined) {
    if (record.currency !== DELIVERY_CURRENCY) {
      throw new DeliveryError(
        "DELIVERY_INVALID_INPUT",
        "currency must be INR.",
        { field: "currency" },
      );
    }
    currency = DELIVERY_CURRENCY;
  }
  return Object.freeze({
    deliveryId: requireUuid(record.deliveryId, "deliveryId"),
    kind: kind as DeliveryProviderCostKind,
    amountPaise: requireAmountPaise(record.amountPaise),
    ...(currency ? { currency } : {}),
    provider: optionalNonEmpty(
      record.provider,
      "provider",
      DELIVERY_REFERENCE_MAX_LENGTH,
    ),
    note: optionalNonEmpty(record.note, "note", DELIVERY_REASON_MAX_LENGTH),
  });
}

export function parseConfirmManualBookingInput(
  input: unknown,
): ConfirmManualBookingInput {
  const record = requireObject(input, "Confirm manual booking request");
  return Object.freeze({
    deliveryId: requireUuid(record.deliveryId, "deliveryId"),
    expectedRevision: requireRevision(record.expectedRevision),
    externalBookingReference:
      optionalNonEmpty(
        record.externalBookingReference,
        "externalBookingReference",
        DELIVERY_REFERENCE_MAX_LENGTH,
      ) ?? null,
    trackingUrl:
      record.trackingUrl === undefined || record.trackingUrl === null
        ? null
        : validateHttpsTrackingUrl(
            requireNonEmpty(record.trackingUrl, "trackingUrl", DELIVERY_REFERENCE_MAX_LENGTH),
          ),
  });
}

export function parseResolveManualBookingFailureInput(
  input: unknown,
): ResolveManualBookingFailureInput {
  const record = requireObject(input, "Resolve manual booking failure request");
  if (record.inactiveBookingConfirmed !== true) {
    throw new DeliveryError(
      "DELIVERY_INVALID_INPUT",
      "inactiveBookingConfirmed must be true for manual failure resolution.",
      { field: "inactiveBookingConfirmed" },
    );
  }
  return Object.freeze({
    deliveryId: requireUuid(record.deliveryId, "deliveryId"),
    expectedRevision: requireRevision(record.expectedRevision),
    failureCode: requireNonEmpty(
      record.failureCode,
      "failureCode",
      DELIVERY_REFERENCE_MAX_LENGTH,
    ),
    failureReason: requireNonEmpty(
      record.failureReason,
      "failureReason",
      DELIVERY_REASON_MAX_LENGTH,
    ),
    inactiveBookingConfirmed: true,
  });
}

export function parseResolveManualBookingCancellationInput(
  input: unknown,
): ResolveManualBookingCancellationInput {
  const record = requireObject(input, "Resolve manual booking cancellation request");
  if (record.inactiveBookingConfirmed !== true) {
    throw new DeliveryError(
      "DELIVERY_INVALID_INPUT",
      "inactiveBookingConfirmed must be true for manual cancellation resolution.",
      { field: "inactiveBookingConfirmed" },
    );
  }
  return Object.freeze({
    deliveryId: requireUuid(record.deliveryId, "deliveryId"),
    expectedRevision: requireRevision(record.expectedRevision),
    cancellationCode: requireNonEmpty(
      record.cancellationCode,
      "cancellationCode",
      DELIVERY_REFERENCE_MAX_LENGTH,
    ),
    cancellationReason: requireNonEmpty(
      record.cancellationReason,
      "cancellationReason",
      DELIVERY_REASON_MAX_LENGTH,
    ),
    inactiveBookingConfirmed: true,
  });
}

export function parseUpdateTrackingReferenceInput(
  input: unknown,
): UpdateTrackingReferenceInput {
  const record = requireObject(input, "Update tracking reference request");
  return Object.freeze({
    deliveryId: requireUuid(record.deliveryId, "deliveryId"),
    expectedRevision: requireRevision(record.expectedRevision),
    trackingUrl: validateHttpsTrackingUrl(
      requireNonEmpty(record.trackingUrl, "trackingUrl", DELIVERY_REFERENCE_MAX_LENGTH),
    ),
  });
}

export function parseArrangeDeliveryInput(input: unknown): ArrangeDeliveryInput {
  const record = requireObject(input, "Arrange delivery request");
  const prior = requireOptionalUuid(record.priorDeliveryId, "priorDeliveryId");
  return Object.freeze({
    orderId: requireUuid(record.orderId, "orderId"),
    requestFingerprint: requireNonEmpty(
      record.requestFingerprint,
      "requestFingerprint",
      DELIVERY_REQUEST_FINGERPRINT_MAX_LENGTH,
    ),
    ...(prior !== undefined ? { priorDeliveryId: prior } : {}),
  });
}

export function parseConfirmDeliveryWithFulfilInput(
  input: unknown,
): ConfirmDeliveryWithFulfilInput {
  return parseRecordProofAndDeliverInput(input);
}

export function parseRetryFulfilForDeliveredInput(
  input: unknown,
): RetryFulfilForDeliveredInput {
  const record = requireObject(input, "Retry fulfil for delivered request");
  return Object.freeze({
    deliveryId: requireUuid(record.deliveryId, "deliveryId"),
    expectedOrderRevision: requireRevision(record.expectedOrderRevision, "expectedOrderRevision"),
  });
}
