/**
 * Delivery clock (IMP-031).
 */

import type { DeliveryClock } from "../../shared/delivery";

export type { DeliveryClock };

export const systemDeliveryClock: DeliveryClock = Object.freeze({
  now: () => new Date(),
});

export function fixedDeliveryClock(at: Date): DeliveryClock {
  return Object.freeze({
    now: () => new Date(at.getTime()),
  });
}
