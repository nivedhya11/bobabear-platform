/**
 * Order domain constants (IMP-023).
 */

export const ORDER_STATUSES = [
  "PLACED",
  "ACCEPTED",
  "FULFILLED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_TERMINAL_STATUSES = ["FULFILLED", "CANCELLED"] as const;

export type OrderTerminalStatus = (typeof ORDER_TERMINAL_STATUSES)[number];

export const ORDER_PAYMENT_PROVENANCE_KINDS = [
  "PAYMENT",
  "NO_PAYMENT_REQUIRED",
] as const;

export type OrderPaymentProvenanceKind =
  (typeof ORDER_PAYMENT_PROVENANCE_KINDS)[number];

export const ORDER_CANCELLATION_REASON_CODES = [
  "CUSTOMER_REQUESTED",
  "ITEM_UNAVAILABLE",
  "OUTLET_UNABLE_TO_FULFIL",
  "OPERATIONAL_DISRUPTION",
  "BUSINESS_DECISION",
] as const;

export type OrderCancellationReasonCode =
  (typeof ORDER_CANCELLATION_REASON_CODES)[number];

export const ORDER_CART_FINALIZATION_DISPOSITIONS = [
  "CLEARED",
  "PRESERVED_CHANGED",
  "PRESERVED_UNAVAILABLE",
] as const;

export type OrderCartFinalizationDisposition =
  (typeof ORDER_CART_FINALIZATION_DISPOSITIONS)[number];

export const ORDER_MATERIALIZATION_DISPOSITIONS = [
  "CREATED",
  "ALREADY_EXISTS",
] as const;

export type OrderMaterializationDisposition =
  (typeof ORDER_MATERIALIZATION_DISPOSITIONS)[number];

export const ORDER_RECOVERY_DISPOSITIONS = [
  "CREATED",
  "ALREADY_EXISTS",
  "ANOMALY",
  "RETRYABLE_FAILURE",
] as const;

export type OrderRecoveryDisposition =
  (typeof ORDER_RECOVERY_DISPOSITIONS)[number];

/** Customer-visible financial satisfaction projection. */
export const ORDER_CUSTOMER_PAYMENT_SATISFACTION = [
  "PAID",
  "NO_PAYMENT_REQUIRED",
] as const;

export type OrderCustomerPaymentSatisfaction =
  (typeof ORDER_CUSTOMER_PAYMENT_SATISFACTION)[number];

export const ORDER_NUMBER_PREFIX = "ORD-" as const;

/** Crockford Base32 alphabet (no I, L, O, U). */
export const ORDER_NUMBER_CROCKFORD_ALPHABET =
  "0123456789ABCDEFGHJKMNPQRSTVWXYZ" as const;

export const ORDER_NUMBER_BODY_LENGTH = 12 as const;

export const ORDER_NUMBER_PATTERN = /^ORD-[0-9A-HJKMNP-TV-Z]{12}$/;

export const DEFAULT_ORDER_LIST_LIMIT = 20 as const;
export const MAX_ORDER_LIST_LIMIT = 100 as const;

export const BIGINT_MAX = BigInt("9223372036854775807");
