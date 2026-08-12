/**
 * Server-only Checkout domain boundary (IMP-021).
 *
 * Public Checkout HTTP exposure is intentionally disabled in this slice —
 * domain module only. Reuses Cart CustomerActor trust chain; never mints
 * authority from a raw customer-auth user id.
 */
import "server-only";

export { CheckoutError } from "../../shared/checkout";
export type {
  Checkout,
  CheckoutDestination,
  CheckoutEvaluationSuccess,
  CheckoutPolicy,
  CheckoutSnapshot,
} from "../../shared/checkout";

export {
  isCustomerActor,
  requireCustomerActor,
  type CustomerActor,
} from "../cart/actor";

export {
  systemCheckoutClock,
  fixedCheckoutClock,
  type CheckoutClock,
} from "./clock";

export {
  getActiveCheckout,
  startCheckout,
  cancelCheckout,
  type CheckoutOperationOptions,
} from "./operations";

export {
  setCheckoutDestination,
  clearCheckoutDestination,
} from "./destination";

export { evaluateCheckout } from "./evaluate";

/**
 * Internal trusted handoff toward future Payment — does not create Payment.
 * Not a customer/browser mutation API.
 */
export {
  prepareCheckoutForPayment,
  type PrepareCheckoutForPaymentResult,
} from "./prepare";
