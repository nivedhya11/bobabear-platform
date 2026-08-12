/**
 * Controllable clock for Cart guest expiry and evaluation (IMP-020).
 */

export type CartClock = Readonly<{
  now(): Date;
}>;

export const systemCartClock: CartClock = Object.freeze({
  now(): Date {
    return new Date();
  },
});

export function fixedCartClock(instant: Date): CartClock {
  if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) {
    throw new Error("fixedCartClock requires a valid Date.");
  }
  const frozen = new Date(instant.getTime());
  return Object.freeze({
    now(): Date {
      return new Date(frozen.getTime());
    },
  });
}
