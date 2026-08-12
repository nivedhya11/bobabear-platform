/**
 * Controllable clock for Payment retry horizon and transitions (IMP-022).
 */

import type { PaymentClock } from "../../shared/payment";

export type { PaymentClock };

export const systemPaymentClock: PaymentClock = Object.freeze({
  now(): Date {
    return new Date();
  },
});

export function fixedPaymentClock(instant: Date): PaymentClock {
  if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) {
    throw new Error("fixedPaymentClock requires a valid Date.");
  }
  const frozen = new Date(instant.getTime());
  return Object.freeze({
    now(): Date {
      return new Date(frozen.getTime());
    },
  });
}
