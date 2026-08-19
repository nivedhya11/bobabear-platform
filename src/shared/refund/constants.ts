/**
 * Refund domain constants (IMP-027 / D-364).
 */

export const REFUND_STATUSES = [
  "ACCEPTED",
  "PENDING",
  "INDETERMINATE",
  "PROCESSED",
  "FAILED",
] as const;

export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const REFUND_RESERVED_STATUSES = [
  "ACCEPTED",
  "PENDING",
  "INDETERMINATE",
] as const;

export type RefundReservedStatus = (typeof REFUND_RESERVED_STATUSES)[number];

export const REFUND_TERMINAL_STATUSES = ["PROCESSED", "FAILED"] as const;

export type RefundTerminalStatus = (typeof REFUND_TERMINAL_STATUSES)[number];

export const REFUND_OBSERVATION_SOURCES = [
  "sync",
  "webhook",
  "query",
  "reconciliation",
] as const;

export type RefundObservationSource = (typeof REFUND_OBSERVATION_SOURCES)[number];

export const REFUND_OBSERVATION_OUTCOMES = [
  "PENDING",
  "PROCESSED",
  "FAILED",
  "INDETERMINATE",
  "ANOMALY",
  "UNSUPPORTED",
] as const;

export type RefundObservationOutcome = (typeof REFUND_OBSERVATION_OUTCOMES)[number];

export const REFUND_PROVIDER_OUTCOMES = [
  "PENDING",
  "PROCESSED",
  "FAILED",
  "INDETERMINATE",
] as const;

export type RefundProviderOutcome = (typeof REFUND_PROVIDER_OUTCOMES)[number];

export const REFUND_ACTOR_KIND_WORKFORCE = "workforce" as const;

export const REFUND_INITIATE_PERMISSION = "payment.refund" as const;
export const REFUND_READ_PERMISSION = "payment.refund.read" as const;

export const REFUND_REASON_MAX_LENGTH = 500;
export const REFUND_OPERATOR_NOTE_MAX_LENGTH = 1000;

export const RAZORPAY_REFUND_REFERENCE_KIND = "razorpay_refund_id" as const;
export const RAZORPAY_REFUND_PAYMENT_REFERENCE_KIND = "razorpay_payment_id" as const;

export const REFUND_CURRENCY = "INR" as const;

export const REFUND_IDEMPOTENCY_PREFIX = "boba_rfnd_" as const;
