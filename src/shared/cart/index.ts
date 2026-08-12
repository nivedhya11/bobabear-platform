/**
 * Shared Cart boundary (IMP-020).
 */

export {
  CART_ADD_LINE_INPUT_FIELDS,
  CART_BUNDLE_SELECTION_INPUT_FIELDS,
  CART_ERROR_CODES,
  CART_EVALUATION_STATUSES,
  CART_LINE_PROBLEM_CODES,
  CART_MODIFIER_SELECTION_INPUT_FIELDS,
  CART_RECONCILIATION_RESOLUTIONS,
  type CartErrorCode,
  type CartEvaluationStatus,
  type CartLineProblemCode,
  type CartReconciliationResolution,
} from "./constants";

export { CartError } from "./errors";

export type {
  CanonicalCartBundleSelection,
  CanonicalCartLineConfiguration,
  CanonicalCartModifierSelection,
  Cart,
  CartBundleModifierSelection,
  CartBundleSelection,
  CartBundleSelectionInput,
  CartEvaluationResult,
  CartLine,
  CartLineConfigurationInput,
  CartLineProblem,
  CartModifierSelection,
  CartModifierSelectionInput,
  CartMutationResult,
  CartOwnerMode,
  CartPolicy,
  CartReconciliationConflict,
} from "./types";

export {
  assertUuid,
  canonicalConfigurationsEqual,
  canonicalizeLineConfiguration,
  parseExpectedRevision,
  parsePositiveIntegerQuantity,
  requireGuestCartTtlMs,
} from "./canonicalize";

export {
  parseAddCartLineInput,
  parseApplyCartCouponInput,
  parseClearCartInput,
  parseLineConfigurationInput,
  parseReconciliationResolution,
  parseRemoveCartCouponInput,
  parseRemoveCartLineInput,
  parseSetCartLineQuantityInput,
  parseUpdateCartLineConfigurationInput,
  type ParsedAddCartLineInput,
} from "./parse-input";
