/**
 * Notification clock (IMP-033).
 */
import type { NotificationClock } from "../../shared/notifications";

export type { NotificationClock };

export const systemNotificationClock: NotificationClock = Object.freeze({
  now: () => new Date(),
});

export function fixedNotificationClock(at: Date): NotificationClock {
  return Object.freeze({
    now: () => new Date(at.getTime()),
  });
}
