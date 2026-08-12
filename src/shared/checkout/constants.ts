/**
 * Shared constants for Checkout (IMP-021).
 */

export const CHECKOUT_ERROR_CODES = [
  "CUSTOMER_AUTH_REQUIRED",
  "CHECKOUT_NOT_FOUND",
  "CHECKOUT_CONFLICT",
  "CHECKOUT_EXPIRED",
  "CHECKOUT_STATE_CONFLICT",
  "CHECKOUT_CART_CHANGED",
  "CHECKOUT_INVALID_INPUT",
  "CHECKOUT_DESTINATION_REQUIRED",
  "CHECKOUT_EMPTY_CART",
  "CHECKOUT_VARIANT_INVALID",
  "CHECKOUT_MODIFIER_INVALID",
  "CHECKOUT_BUNDLE_INVALID",
  "CHECKOUT_NOT_ASSORTED",
  "CHECKOUT_TEMPORARILY_UNAVAILABLE",
  "CHECKOUT_SOLD_OUT",
  "CHECKOUT_NOT_SERVICEABLE",
  "CHECKOUT_SERVICEABILITY_TEMPORARILY_UNAVAILABLE",
  "CHECKOUT_SERVICEABILITY_INDETERMINATE",
  "CHECKOUT_PRICE_UNRESOLVED",
  "CHECKOUT_COUPON_INELIGIBLE",
  "CHECKOUT_PROMOTION_INDETERMINATE",
  "CHECKOUT_TAX_INDETERMINATE",
  "CHECKOUT_REPRICED",
  "CHECKOUT_DEPENDENCY_INDETERMINATE",
] as const;

export type CheckoutErrorCode = (typeof CHECKOUT_ERROR_CODES)[number];

export const CHECKOUT_STATUSES = [
  "DRAFT",
  "READY_FOR_PAYMENT",
  "PAYMENT_PENDING",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
] as const;

export type CheckoutStatus = (typeof CHECKOUT_STATUSES)[number];

export const CHECKOUT_NON_TERMINAL_STATUSES = [
  "DRAFT",
  "READY_FOR_PAYMENT",
  "PAYMENT_PENDING",
] as const;

export type CheckoutNonTerminalStatus =
  (typeof CHECKOUT_NON_TERMINAL_STATUSES)[number];

export const CHECKOUT_TERMINAL_STATUSES = [
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
] as const;

export type CheckoutTerminalStatus = (typeof CHECKOUT_TERMINAL_STATUSES)[number];

export const CHECKOUT_DESTINATION_KINDS = [
  "SAVED_ADDRESS",
  "ONE_TIME_ADDRESS",
] as const;

export type CheckoutDestinationKind =
  (typeof CHECKOUT_DESTINATION_KINDS)[number];

export const CHECKOUT_PROMOTION_EFFECT_KINDS = [
  "monetary_allocation",
  "applied_promotion",
  "bogo_reward",
] as const;

export type CheckoutPromotionEffectKind =
  (typeof CHECKOUT_PROMOTION_EFFECT_KINDS)[number];

export const CHECKOUT_MERCHANDISE_PROBLEM_CODES = [
  "CHECKOUT_VARIANT_INVALID",
  "CHECKOUT_MODIFIER_INVALID",
  "CHECKOUT_BUNDLE_INVALID",
  "CHECKOUT_NOT_ASSORTED",
  "CHECKOUT_TEMPORARILY_UNAVAILABLE",
  "CHECKOUT_SOLD_OUT",
  "CHECKOUT_PRICE_UNRESOLVED",
  "CHECKOUT_COUPON_INELIGIBLE",
] as const;

export type CheckoutMerchandiseProblemCode =
  (typeof CHECKOUT_MERCHANDISE_PROBLEM_CODES)[number];

export const CHECKOUT_START_INPUT_FIELDS = ["cartId"] as const;

export const CHECKOUT_GET_ACTIVE_INPUT_FIELDS = [
  "cartId",
  "checkoutId",
] as const;

export const CHECKOUT_ID_REVISION_INPUT_FIELDS = [
  "checkoutId",
  "expectedCheckoutRevision",
] as const;

export const CHECKOUT_DESTINATION_INPUT_FIELDS = [
  "checkoutId",
  "expectedCheckoutRevision",
  "destination",
] as const;

export const CHECKOUT_SAVED_ADDRESS_DESTINATION_FIELDS = [
  "kind",
  "savedAddressId",
] as const;

export const CHECKOUT_ONE_TIME_ADDRESS_DESTINATION_FIELDS = [
  "kind",
  "recipientName",
  "recipientPhone",
  "addressLine1",
  "addressLine2",
  "landmark",
  "locality",
  "city",
  "stateCode",
  "postalCode",
  "coordinates",
  "label",
] as const;

export const CHECKOUT_COORDINATES_INPUT_FIELDS = [
  "latitude",
  "longitude",
] as const;

export const CHECKOUT_EVALUATE_INPUT_FIELDS = [
  "checkoutId",
  "expectedCheckoutRevision",
] as const;

export const CHECKOUT_CANCEL_INPUT_FIELDS = [
  "checkoutId",
  "expectedCheckoutRevision",
] as const;

export const CHECKOUT_PREPARE_INPUT_FIELDS = [
  "checkoutId",
  "expectedCheckoutRevision",
] as const;
