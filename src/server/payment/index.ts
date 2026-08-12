/**
 * Server-only Payment domain boundary (IMP-022).
 *
 * Public Payment HTTP exposure is intentionally disabled in this slice —
 * domain module only. Reuses Cart CustomerActor trust chain; never mints
 * authority from a raw customer-auth user id.
 */
import "server-only";

export { PaymentError } from "../../shared/payment";
export type {
  NormalizedProviderEvidence,
  Payment,
  PaymentAttempt,
  PaymentPolicy,
  PaymentStartResult,
  PaymentStateView,
  VerifiedProviderEvent,
  ZeroPayableResult,
} from "../../shared/payment";

export {
  isCustomerActor,
  requireCustomerActor,
  type CustomerActor,
} from "../cart/actor";

export {
  systemPaymentClock,
  fixedPaymentClock,
  type PaymentClock,
} from "./clock";

export {
  startPayment,
  completeZeroPayableCheckout,
  retryPayment,
  cancelPayment,
  getPayment,
  getPaymentState,
  reconcilePaymentAttempt,
  processVerifiedProviderEvent,
  supersedePayment,
  type PaymentOperationOptions,
} from "./operations";

export type { PaymentProvider } from "./provider/types";

// Intentionally NOT re-exported: sealVerifiedProviderEvent — public barrel
// must not mint trusted provider evidence.
