/**
 * Checkout policy helpers (IMP-021).
 */

import {
  requireCheckoutTtlMs,
  type CheckoutPolicy,
} from "../../shared/checkout";

export { requireCheckoutTtlMs };

export type CheckoutOperationOptions = Readonly<{
  clock?: import("./clock").CheckoutClock;
  policy?: CheckoutPolicy;
}>;
