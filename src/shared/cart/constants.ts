/**
 * Shared constants for Cart (IMP-020).
 */

export const CART_ERROR_CODES = [
  "CUSTOMER_AUTH_REQUIRED",
  "CART_NOT_FOUND",
  "CART_EXPIRED",
  "CART_CONFLICT",
  "CART_LINE_NOT_FOUND",
  "CART_INVALID_INPUT",
  "CART_CONFIGURATION_INVALID",
  "CART_ITEM_NOT_ORDERABLE",
  "CART_COUPON_UNKNOWN",
  "CART_RECONCILIATION_CONFLICT",
  "CART_DEPENDENCY_UNAVAILABLE",
  "CART_PERSISTENCE_ERROR",
  "CART_POLICY_INVALID",
] as const;

export type CartErrorCode = (typeof CART_ERROR_CODES)[number];

export const CART_EVALUATION_STATUSES = [
  "COMPLETE",
  "REQUIRES_FULFILMENT_CONTEXT",
  "CART_INVALID",
  "SERVICEABILITY_NOT_SERVICEABLE",
  "SERVICEABILITY_TEMPORARILY_UNAVAILABLE",
  "SERVICEABILITY_INDETERMINATE",
  "EVALUATION_INDETERMINATE",
] as const;

export type CartEvaluationStatus = (typeof CART_EVALUATION_STATUSES)[number];

export const CART_LINE_PROBLEM_CODES = [
  "LINE_VARIANT_UNAVAILABLE",
  "LINE_CONFIGURATION_INVALID",
  "LINE_REQUIRED_SELECTION_UNAVAILABLE",
  "LINE_NOT_IN_ASSORTMENT",
  "COUPON_CURRENTLY_INELIGIBLE",
  "COUPON_EXPIRED",
  "PRICE_UNAVAILABLE",
  "PROMOTION_EVALUATION_UNAVAILABLE",
] as const;

export type CartLineProblemCode = (typeof CART_LINE_PROBLEM_CODES)[number];

export const CART_RECONCILIATION_RESOLUTIONS = [
  "KEEP_GUEST",
  "KEEP_CUSTOMER",
] as const;

export type CartReconciliationResolution =
  (typeof CART_RECONCILIATION_RESOLUTIONS)[number];

export const CART_ADD_LINE_INPUT_FIELDS = [
  "variantId",
  "quantity",
  "modifiers",
  "bundleSelections",
  "expectedRevision",
] as const;

export const CART_MODIFIER_SELECTION_INPUT_FIELDS = [
  "variantModifierGroupId",
  "modifierGroupOptionId",
  "quantity",
] as const;

export const CART_BUNDLE_SELECTION_INPUT_FIELDS = [
  "bundleGroupOptionId",
  "quantity",
  "modifiers",
] as const;
