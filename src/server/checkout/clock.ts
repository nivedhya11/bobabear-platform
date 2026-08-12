/**
 * Controllable clock for Checkout expiry and evaluation (IMP-021).
 */

export type CheckoutClock = Readonly<{
  now(): Date;
}>;

export const systemCheckoutClock: CheckoutClock = Object.freeze({
  now(): Date {
    return new Date();
  },
});

export function fixedCheckoutClock(instant: Date): CheckoutClock {
  if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) {
    throw new Error("fixedCheckoutClock requires a valid Date.");
  }
  const frozen = new Date(instant.getTime());
  return Object.freeze({
    now(): Date {
      return new Date(frozen.getTime());
    },
  });
}
