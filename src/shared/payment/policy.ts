/**
 * Payment policy helpers (IMP-022).
 *
 * Payment commercial validity follows Checkout `expires_at` after definitive
 * non-success. There is no separate Payment retry-horizon policy knob.
 */

import type { PaymentPolicy } from "./types";

/** Accept an empty Payment policy object (or omit). Always returns `{}`. */
export function requirePaymentPolicy(
  policy: PaymentPolicy | null | undefined,
): PaymentPolicy {
  void policy;
  return Object.freeze({});
}
