/**
 * Shared Checkout boundary (IMP-021).
 */

export {
  CHECKOUT_CANCEL_INPUT_FIELDS,
  CHECKOUT_COORDINATES_INPUT_FIELDS,
  CHECKOUT_DESTINATION_INPUT_FIELDS,
  CHECKOUT_DESTINATION_KINDS,
  CHECKOUT_ERROR_CODES,
  CHECKOUT_EVALUATE_INPUT_FIELDS,
  CHECKOUT_GET_ACTIVE_INPUT_FIELDS,
  CHECKOUT_ID_REVISION_INPUT_FIELDS,
  CHECKOUT_MERCHANDISE_PROBLEM_CODES,
  CHECKOUT_NON_TERMINAL_STATUSES,
  CHECKOUT_ONE_TIME_ADDRESS_DESTINATION_FIELDS,
  CHECKOUT_PREPARE_INPUT_FIELDS,
  CHECKOUT_PROMOTION_EFFECT_KINDS,
  CHECKOUT_SAVED_ADDRESS_DESTINATION_FIELDS,
  CHECKOUT_START_INPUT_FIELDS,
  CHECKOUT_STATUSES,
  CHECKOUT_TERMINAL_STATUSES,
  type CheckoutDestinationKind,
  type CheckoutErrorCode,
  type CheckoutMerchandiseProblemCode,
  type CheckoutNonTerminalStatus,
  type CheckoutPromotionEffectKind,
  type CheckoutStatus,
  type CheckoutTerminalStatus,
} from "./constants";

export { CheckoutError, type CheckoutMerchandiseProblem } from "./errors";

export type {
  Checkout,
  CheckoutDestination,
  CheckoutDestinationCoordinates,
  CheckoutDestinationInput,
  CheckoutEvaluationSuccess,
  CheckoutPolicy,
  CheckoutSnapshot,
  CheckoutSnapshotBundleModifierSelection,
  CheckoutSnapshotBundleSelection,
  CheckoutSnapshotCharge,
  CheckoutSnapshotLine,
  CheckoutSnapshotModifierSelection,
  CheckoutSnapshotPromotionEffect,
  CheckoutSnapshotTaxComponent,
  OneTimeAddressDestinationInput,
  SavedAddressDestinationInput,
} from "./types";

export {
  assertUuid,
  compareIsoUuid,
  destinationsEqual,
  isLogicallyExpired,
  parseExpectedCheckoutRevision,
  requireCheckoutTtlMs,
} from "./canonicalize";

export {
  parseCancelCheckoutInput,
  parseClearCheckoutDestinationInput,
  parseEvaluateCheckoutInput,
  parseGetActiveCheckoutInput,
  parsePrepareCheckoutForPaymentInput,
  parseSetCheckoutDestinationInput,
  parseStartCheckoutInput,
  type ParsedCheckoutIdRevisionInput,
  type ParsedGetActiveCheckoutInput,
  type ParsedSetCheckoutDestinationInput,
  type ParsedStartCheckoutInput,
} from "./parse-input";
