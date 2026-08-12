/**
 * Exact paise helpers for promotions (IMP-016).
 */
import { roundHalfUpDivide } from "../pricing/money";
import { PromotionFatalError } from "./errors";

export { roundHalfUpDivide };

export function percentageDiscountPaise(
  eligibleAmountPaise: bigint,
  percentageBps: number,
): bigint {
  if (eligibleAmountPaise < BigInt(0)) {
    throw new PromotionFatalError(
      "PROMOTION_MONEY_OVERFLOW",
      "eligibleAmountPaise must be non-negative.",
    );
  }
  if (!Number.isInteger(percentageBps) || percentageBps <= 0 || percentageBps > 10000) {
    throw new PromotionFatalError(
      "PROMOTION_CONFIGURATION_INVALID",
      "percentageBps must be an integer in 1..10000.",
    );
  }
  return roundHalfUpDivide(eligibleAmountPaise * BigInt(percentageBps), BigInt(10000));
}

/**
 * Deterministic largest-remainder allocation.
 * Tie-break: higher fractional remainder, then lower index.
 */
export function allocateLargestRemainderPaise(
  total: bigint,
  weights: readonly bigint[],
): bigint[] {
  if (weights.length === 0) return [];
  if (total < BigInt(0)) {
    throw new PromotionFatalError(
      "PROMOTION_MONEY_OVERFLOW",
      "allocation total must be non-negative.",
    );
  }
  const weightSum = weights.reduce((a, b) => a + b, BigInt(0));
  if (weightSum === BigInt(0)) {
    return weights.map(() => BigInt(0));
  }
  const exact = weights.map((w, index) => {
    const product = total * w;
    const floor = product / weightSum;
    const frac = product % weightSum;
    return { index, floor, frac };
  });
  const assigned = exact.reduce((a, r) => a + r.floor, BigInt(0));
  let remaining = total - assigned;
  const order = [...exact].sort((a, b) => {
    if (a.frac !== b.frac) return a.frac > b.frac ? -1 : 1;
    return a.index - b.index;
  });
  const result = exact.map((r) => r.floor);
  for (const entry of order) {
    if (remaining <= BigInt(0)) break;
    result[entry.index]! += BigInt(1);
    remaining -= BigInt(1);
  }
  const sum = result.reduce((a, b) => a + b, BigInt(0));
  if (sum !== total) {
    throw new PromotionFatalError(
      "PROMOTION_ALLOCATION_INCONSISTENT",
      "largest-remainder allocation did not reconcile.",
    );
  }
  return result;
}

export function assertNonNegativePaise(value: bigint, field: string): void {
  if (value < BigInt(0)) {
    throw new PromotionFatalError(
      "PROMOTION_MONEY_OVERFLOW",
      `${field} must be non-negative.`,
    );
  }
}

export function safeAddPaise(...values: bigint[]): bigint {
  let sum = BigInt(0);
  for (const v of values) {
    sum += v;
    if (sum < BigInt(0) && values.every((x) => x >= BigInt(0))) {
      throw new PromotionFatalError(
        "PROMOTION_MONEY_OVERFLOW",
        "paise addition overflowed into negative.",
      );
    }
  }
  return sum;
}

export function minPaise(a: bigint, b: bigint): bigint {
  return a <= b ? a : b;
}
