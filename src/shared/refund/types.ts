/**
 * Refund domain types (IMP-027 / D-364).
 */
import type {
  RefundObservationOutcome,
  RefundObservationSource,
  RefundProviderOutcome,
  RefundStatus,
} from "./constants";

export type RefundClock = Readonly<{
  now: () => Date;
}>;

export type Refund = Readonly<{
  id: string;
  paymentId: string;
  checkoutId: string | null;
  checkoutSnapshotId: string | null;
  orderId: string | null;
  amountPaise: bigint;
  currency: "INR";
  status: RefundStatus;
  provider: string;
  providerIdempotencyKey: string;
  providerRefundId: string | null;
  providerPaymentId: string | null;
  providerStatusCode: string | null;
  failureCode: string | null;
  failureReason: string | null;
  acquirerReference: string | null;
  reason: string;
  operatorNote: string | null;
  initiatedByActorKind: "workforce";
  initiatedByActorId: string;
  authorizedPermission: "payment.refund";
  createdAt: Date;
  updatedAt: Date;
  acceptedAt: Date;
  pendingAt: Date | null;
  indeterminateAt: Date | null;
  processedAt: Date | null;
  failedAt: Date | null;
}>;

export type RefundProviderReference = Readonly<{
  id: string;
  refundId: string;
  provider: string;
  referenceKind: string;
  referenceValue: string;
  createdAt: Date;
}>;

export type RefundProviderObservation = Readonly<{
  id: string;
  refundId: string;
  observationSource: RefundObservationSource;
  provider: string;
  providerEventId: string | null;
  normalizedOutcome: RefundObservationOutcome;
  observedAmountPaise: bigint | null;
  observedCurrency: string | null;
  providerStatusCode: string | null;
  payloadDigest: string | null;
  reconciliationAnomaly: string | null;
  observedAt: Date;
}>;

export type RequestRefundInput = Readonly<{
  paymentId: string;
  amountPaise: bigint;
  currency?: "INR";
  reason: string;
  operatorNote?: string | null;
}>;

/** Operations workforce Refund reservation (IMP-036D). */
export type ReserveOrderRefundInput = Readonly<{
  orderId: string;
  refundRequestId: string;
  amountPaise: bigint;
  reason: string;
  operatorNote?: string | null;
}>;

export type GetRefundInput = Readonly<{
  refundId: string;
}>;

export type ReconcileRefundInput = Readonly<{
  refundId: string;
}>;

export type NormalizedRefundEvidence = Readonly<{
  family: "refund";
  outcome: RefundProviderOutcome | "ANOMALY" | "UNSUPPORTED";
  provider: string;
  providerRefundId: string | null;
  providerPaymentId: string | null;
  observedAmountPaise: bigint | null;
  observedCurrency: string | null;
  providerStatusCode: string | null;
  providerTimestamp: Date | null;
  providerEventId: string | null;
  payloadDigest: string | null;
  failureCode?: string | null;
  failureReason?: string | null;
  acquirerReference?: string | null;
  anomalyCode?: string;
  references?: readonly Readonly<{
    kind: string;
    value: string;
  }>[];
}>;

export type RefundBalanceView = Readonly<{
  capturedAmount: bigint;
  successfulRefundedAmount: bigint;
  reservedRefundAmount: bigint;
  remainingRefundableAmount: bigint;
  fullyRefunded: boolean;
}>;

export type RefundResult = Readonly<{
  refund: Refund;
  balance: RefundBalanceView;
  paymentStatus: string;
}>;
