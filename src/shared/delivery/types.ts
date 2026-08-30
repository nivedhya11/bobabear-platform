/**
 * Delivery domain types (IMP-031 / ARCH-G24).
 */
import type {
  DeliveryBookingOutcome,
  DeliveryExecutionStatus,
  DeliveryObservationDisposition,
  DeliveryObservationMeaning,
  DeliveryObservationSource,
  DeliveryProviderCostKind,
  DeliveryReturnStatus,
} from "./constants";

export type DeliveryClock = Readonly<{
  now: () => Date;
}>;

export type Delivery = Readonly<{
  id: string;
  orderId: string;
  priorDeliveryId: string | null;
  requestFingerprint: string;
  status: DeliveryExecutionStatus;
  revision: bigint;
  bookingCorrelationId: string | null;
  externalBookingReference: string | null;
  provider: string | null;
  handoffReference: string | null;
  proofReference: string | null;
  failureCode: string | null;
  failureReason: string | null;
  cancellationCode: string | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  requestedAt: Date;
  bookingOutcomeUnknownAt: Date | null;
  bookedAt: Date | null;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
  failedAt: Date | null;
  cancelledAt: Date | null;
}>;

export type DeliveryAssignment = Readonly<{
  id: string;
  deliveryId: string;
  provider: string;
  assignmentKey: string;
  courierReference: string | null;
  observedAt: Date;
  createdAt: Date;
  supersededAt: Date | null;
}>;

export type DeliveryProviderObservation = Readonly<{
  id: string;
  deliveryId: string;
  provider: string;
  observationSource: DeliveryObservationSource;
  observationKey: string;
  providerEventId: string | null;
  normalizedMeaning: DeliveryObservationMeaning;
  disposition: DeliveryObservationDisposition;
  payloadDigest: string | null;
  observedAt: Date;
  createdAt: Date;
}>;

export type DeliveryProviderReference = Readonly<{
  id: string;
  deliveryId: string;
  provider: string;
  referenceKind: string;
  referenceValue: string;
  createdAt: Date;
}>;

export type DeliveryReturn = Readonly<{
  id: string;
  deliveryId: string;
  status: DeliveryReturnStatus;
  reason: string;
  returnDestination: string;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  requestedAt: Date;
  returningAt: Date | null;
  returnedAt: Date | null;
  returnFailedAt: Date | null;
}>;

export type DeliveryProviderCost = Readonly<{
  id: string;
  deliveryId: string;
  kind: DeliveryProviderCostKind;
  amountPaise: bigint;
  currency: "INR";
  provider: string | null;
  note: string | null;
  createdAt: Date;
}>;

export type NormalizedDeliveryBookingEvidence = Readonly<{
  outcome: DeliveryBookingOutcome;
  provider: string;
  bookingCorrelationId: string;
  externalBookingReference: string | null;
  providerStatusCode: string | null;
  providerTimestamp: Date | null;
  failureCode?: string | null;
  failureReason?: string | null;
  references?: readonly Readonly<{
    kind: string;
    value: string;
  }>[];
}>;

export type CreateDeliveryInput = Readonly<{
  orderId: string;
  requestFingerprint: string;
  priorDeliveryId?: string | null;
}>;

export type BeginBookingInput = Readonly<{
  deliveryId: string;
  expectedRevision: bigint;
  provider: string;
  bookingCorrelationId?: string;
}>;

export type RecordBookingOutcomeInput = Readonly<{
  deliveryId: string;
  expectedRevision: bigint;
  evidence: NormalizedDeliveryBookingEvidence;
}>;

export type ReconcileAmbiguousBookingInput = Readonly<{
  deliveryId: string;
  expectedRevision: bigint;
}>;

export type RecordProviderObservationInput = Readonly<{
  deliveryId: string;
  expectedRevision: bigint;
  provider: string;
  observationSource: DeliveryObservationSource;
  observationKey: string;
  providerEventId?: string | null;
  normalizedMeaning: DeliveryObservationMeaning;
  payloadDigest?: string | null;
  observedAt?: Date;
  assignmentKey?: string | null;
  courierReference?: string | null;
  externalBookingReference?: string | null;
  proofReference?: string | null;
  failureCode?: string | null;
  failureReason?: string | null;
  cancellationCode?: string | null;
  cancellationReason?: string | null;
}>;

export type RecordAssignmentInput = Readonly<{
  deliveryId: string;
  expectedRevision: bigint;
  provider: string;
  assignmentKey: string;
  courierReference?: string | null;
  observedAt?: Date;
}>;

export type ConfirmPickupInput = Readonly<{
  deliveryId: string;
  expectedRevision: bigint;
  handoffReference: string;
}>;

export type RecordProofAndDeliverInput = Readonly<{
  deliveryId: string;
  expectedRevision: bigint;
  proofReference: string;
}>;

export type FailDeliveryInput = Readonly<{
  deliveryId: string;
  expectedRevision: bigint;
  failureCode: string;
  failureReason: string;
}>;

export type CancelDeliveryInput = Readonly<{
  deliveryId: string;
  expectedRevision: bigint;
  cancellationCode: string;
  cancellationReason: string;
}>;

export type BeginReturnInput = Readonly<{
  deliveryId: string;
  reason: string;
  returnDestination: string;
  hadCourierCustody: boolean;
}>;

export type AdvanceReturnInput = Readonly<{
  returnId: string;
  toStatus: Exclude<DeliveryReturnStatus, "RETURN_REQUESTED">;
  failureReason?: string | null;
}>;

export type RecordProviderCostFactInput = Readonly<{
  deliveryId: string;
  kind: DeliveryProviderCostKind;
  amountPaise: bigint;
  currency?: "INR";
  provider?: string | null;
  note?: string | null;
}>;

export type RecordProviderObservationResult = Readonly<{
  delivery: Delivery;
  observation: DeliveryProviderObservation;
  transitionApplied: boolean;
}>;
