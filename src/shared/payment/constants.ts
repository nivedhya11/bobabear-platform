/**
 * Payment domain constants (IMP-022).
 */

export const PAYMENT_STATUSES = [
  "OPEN",
  "PROCESSING",
  "SUCCEEDED",
  "SUPERSEDED",
  "CANCELLED",
  "EXPIRED",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_TERMINAL_STATUSES = [
  "SUCCEEDED",
  "SUPERSEDED",
  "CANCELLED",
  "EXPIRED",
] as const;

export type PaymentTerminalStatus = (typeof PAYMENT_TERMINAL_STATUSES)[number];

export const PAYMENT_ATTEMPT_STATUSES = [
  "CREATED",
  "PENDING",
  "INDETERMINATE",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
] as const;

export type PaymentAttemptStatus = (typeof PAYMENT_ATTEMPT_STATUSES)[number];

export const PAYMENT_ATTEMPT_UNRESOLVED_STATUSES = [
  "CREATED",
  "PENDING",
  "INDETERMINATE",
] as const;

export type PaymentAttemptUnresolvedStatus =
  (typeof PAYMENT_ATTEMPT_UNRESOLVED_STATUSES)[number];

export const PAYMENT_ATTEMPT_TERMINAL_STATUSES = [
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
] as const;

export type PaymentAttemptTerminalStatus =
  (typeof PAYMENT_ATTEMPT_TERMINAL_STATUSES)[number];

export const PROMOTION_REDEMPTION_CLAIM_STATUSES = [
  "RESERVED",
  "CONSUMED",
  "RELEASED",
] as const;

export type PromotionRedemptionClaimStatus =
  (typeof PROMOTION_REDEMPTION_CLAIM_STATUSES)[number];

export const PAYMENT_OPERATION_KINDS = [
  "start_payment",
  "retry_payment",
  "complete_zero_payable",
] as const;

export type PaymentOperationKind = (typeof PAYMENT_OPERATION_KINDS)[number];

export const PAYMENT_PROVIDER_OUTCOMES = [
  "CLIENT_ACTION_REQUIRED",
  "PENDING",
  "SUCCEEDED",
  "DEFINITIVE_FAILURE",
  "DEFINITIVE_CANCELLED",
  "INDETERMINATE",
] as const;

export type PaymentProviderOutcome = (typeof PAYMENT_PROVIDER_OUTCOMES)[number];

export const PAYMENT_OBSERVATION_SOURCES = [
  "sync",
  "webhook",
  "query",
  "reconciliation",
] as const;

export type PaymentObservationSource =
  (typeof PAYMENT_OBSERVATION_SOURCES)[number];

export const PAYMENT_CURRENCY = "INR" as const;

/** Built-in fake/test provider identity — never a production gateway. */
export const PAYMENT_FAKE_PROVIDER = "fake" as const;

/** V1 production payment provider identity (D-361). */
export const PAYMENT_RAZORPAY_PROVIDER = "razorpay" as const;

export const PAYMENT_PROVIDER_SELECTOR_VALUES = ["disabled", "razorpay"] as const;

export type PaymentProviderSelector = (typeof PAYMENT_PROVIDER_SELECTOR_VALUES)[number];

export const RAZORPAY_STANDARD_CHECKOUT_KIND = "razorpay_standard_checkout" as const;

export const RAZORPAY_ORDER_REFERENCE_KIND = "razorpay_order_id" as const;
export const RAZORPAY_PAYMENT_REFERENCE_KIND = "razorpay_payment_id" as const;
export const RAZORPAY_RECEIPT_REFERENCE_KIND = "razorpay_receipt" as const;

/**
 * Minimum interval between secondary provider query reconciliations for one
 * Attempt (D-362). Customer payment-state polls may be more frequent; this
 * bound prevents a provider query storm without inventing a worker.
 */
export const PAYMENT_SECONDARY_RECONCILE_MIN_INTERVAL_MS = 5_000;

export const SUPPORTED_PAYMENT_METHOD_INTENTS = [
  "upi",
  "card",
  "netbanking",
] as const;

export type SupportedPaymentMethodIntent =
  (typeof SUPPORTED_PAYMENT_METHOD_INTENTS)[number];
