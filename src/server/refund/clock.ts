import type { RefundClock } from "../../shared/refund";

export type { RefundClock };

export const systemRefundClock: RefundClock = Object.freeze({
  now(): Date {
    return new Date();
  },
});

export function fixedRefundClock(instant: Date): RefundClock {
  if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) {
    throw new Error("fixedRefundClock requires a valid Date.");
  }
  const frozen = new Date(instant.getTime());
  return Object.freeze({
    now(): Date {
      return new Date(frozen.getTime());
    },
  });
}
