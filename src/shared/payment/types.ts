/**
 * Payment domain types (IMP-022).
 */

import type {
  PaymentAttemptStatus,
  PaymentObservationSource,
  PaymentOperationKind,
  PaymentProviderOutcome,
  PaymentStatus,
  PromotionRedemptionClaimStatus,
  SupportedPaymentMethodIntent,
} from "./constants";

/**
 * Payment has no separate commercial-validity clock. After definitive
 * non-success, retry eligibility follows the bound Checkout `expires_at`.
 * Kept as an empty marker so call sites can still pass `policy: {}`.
 */
export type PaymentPolicy = Readonly<Record<string, never>>;

export type PaymentClock = Readonly<{
  now: () => Date;
}>;

/**
 * Customer-facing Payment projection. `expectedAmountPaise` / `currency` are
 * derived from the bound immutable Checkout snapshot — never independent
 * Payment columns.
 */
export type Payment = Readonly<{
  id: string;
  checkoutId: string;
  checkoutSnapshotId: string;
  expectedAmountPaise: bigint;
  currency: "INR";
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
  succeededAt: Date | null;
  cancelledAt: Date | null;
  expiredAt: Date | null;
  supersededAt: Date | null;
}>;

export type PaymentAttempt = Readonly<{
  id: string;
  paymentId: string;
  attemptOrdinal: bigint;
  provider: string;
  methodIntent: string;
  providerExecutionIdentity: string;
  status: PaymentAttemptStatus;
  createdAt: Date;
  updatedAt: Date;
  pendingAt: Date | null;
  indeterminateAt: Date | null;
  succeededAt: Date | null;
  failedAt: Date | null;
  cancelledAt: Date | null;
}>;

export type PaymentProviderReference = Readonly<{
  id: string;
  paymentId: string;
  attemptId: string | null;
  provider: string;
  referenceKind: string;
  referenceValue: string;
  createdAt: Date;
}>;

export type PaymentProviderObservation = Readonly<{
  id: string;
  attemptId: string;
  observationSource: PaymentObservationSource;
  provider: string;
  providerEventId: string | null;
  normalizedOutcome: string;
  observedAmountPaise: bigint | null;
  observedCurrency: string | null;
  providerStatusCode: string | null;
  providerTimestamp: Date | null;
  payloadDigest: string | null;
  reconciliationAnomaly: string | null;
  observedAt: Date;
}>;

export type PromotionRedemptionClaim = Readonly<{
  id: string;
  promotionId: string;
  checkoutSnapshotId: string;
  paymentId: string | null;
  paymentAttemptId: string | null;
  redemptionUnits: bigint;
  status: PromotionRedemptionClaimStatus;
  createdAt: Date;
  consumedAt: Date | null;
  releasedAt: Date | null;
}>;

export type PaymentStateView = Readonly<{
  payment: Payment | null;
  attempt: PaymentAttempt | null;
  attempts: readonly PaymentAttempt[];
  checkoutId: string;
  checkoutStatus: string;
  checkoutRevision: bigint;
  zeroPayableCompleted: boolean;
  clientAction?: Readonly<{
    kind: string;
    payload: Readonly<Record<string, string>>;
  }>;
}>;

export type StartPaymentInput = Readonly<{
  checkoutId: string;
  expectedCheckoutRevision: bigint;
  paymentMethodIntent: SupportedPaymentMethodIntent;
  idempotencyKey: string;
}>;

export type RetryPaymentInput = Readonly<{
  paymentId: string;
  expectedCheckoutRevision: bigint;
  paymentMethodIntent: SupportedPaymentMethodIntent;
  idempotencyKey: string;
}>;

export type CancelPaymentInput = Readonly<{
  paymentId: string;
  expectedCheckoutRevision: bigint;
}>;

export type GetPaymentInput = Readonly<{
  paymentId: string;
}>;

export type ReconcilePaymentAttemptInput = Readonly<{
  paymentId: string;
  attemptId: string;
}>;

export type SubmitPaymentClientEvidenceInput = Readonly<{
  paymentId: string;
  kind: string;
  payload: Readonly<Record<string, string>>;
}>;

export type CompleteZeroPayableInput = Readonly<{
  checkoutId: string;
  expectedCheckoutRevision: bigint;
  idempotencyKey: string;
}>;

export type PaymentStartResult = Readonly<{
  kind: "payment_started";
  payment: Payment;
  attempt: PaymentAttempt;
  checkoutId: string;
  checkoutRevision: bigint;
  clientAction?: Readonly<{
    kind: string;
    payload: Readonly<Record<string, string>>;
  }>;
}>;

export type ZeroPayableResult = Readonly<{
  kind: "zero_payable_completed";
  checkoutId: string;
  checkoutRevision: bigint;
  snapshotId: string;
}>;

export type NormalizedProviderEvidence = Readonly<{
  outcome: PaymentProviderOutcome | "UNSUPPORTED" | "ANOMALY";
  provider: string;
  providerExecutionIdentity: string;
  observedAmountPaise: bigint | null;
  observedCurrency: string | null;
  providerStatusCode: string | null;
  providerTimestamp: Date | null;
  providerEventId: string | null;
  payloadDigest: string | null;
  references?: readonly Readonly<{
    kind: string;
    value: string;
  }>[];
  clientAction?: Readonly<{
    kind: string;
    payload: Readonly<Record<string, string>>;
  }>;
  anomalyCode?: string;
}>;

/**
 * Structural shape only — runtime authority requires the server-side sealed
 * brand from `src/server/payment/verified-event.ts` (not exported here).
 */
export type VerifiedProviderEvent = Readonly<{
  provider: string;
  rawBody: Uint8Array;
  headers: Readonly<Record<string, string>>;
  evidence: NormalizedProviderEvidence;
}>;

export type PaymentOperationKindAlias = PaymentOperationKind;
