/**
 * Order clock (IMP-023).
 */

import type { OrderClock } from "../../shared/order";

export type { OrderClock };

export const systemOrderClock: OrderClock = Object.freeze({
  now: () => new Date(),
});

export function fixedOrderClock(at: Date): OrderClock {
  return Object.freeze({
    now: () => new Date(at.getTime()),
  });
}
