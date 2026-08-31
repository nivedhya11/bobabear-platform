/**
 * Notification deduplication identity (IMP-033).
 *
 * At-least-once outbox delivery means the same domain event can be handed to
 * the notification processor more than once. The dedup key is the durable
 * uniqueness authority (enforced by a UNIQUE index), so redelivery converges
 * on exactly one notification request instead of a duplicate customer message.
 */
import {
  NOTIFICATION_DEDUP_KEY_MAX_LENGTH,
  type NotificationChannel,
  type NotificationSemanticType,
} from "./constants";
import { NotificationError } from "./errors";

const DEDUP_SEPARATOR = "|";

export type NotificationDedupKeyInput = Readonly<{
  customerId: string;
  semanticType: NotificationSemanticType;
  domainEventRef: string;
  channel: NotificationChannel;
}>;

function requireDedupComponent(value: string, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new NotificationError(
      "NOTIFICATION_INVALID_INPUT",
      `${field} must be a non-empty string.`,
      { field },
    );
  }
  if (value.includes(DEDUP_SEPARATOR)) {
    // A component containing the separator would make the key ambiguous.
    throw new NotificationError(
      "NOTIFICATION_INVALID_INPUT",
      `${field} must not contain "${DEDUP_SEPARATOR}".`,
      { field },
    );
  }
  return value.trim();
}

export function computeNotificationDedupKey(
  input: NotificationDedupKeyInput,
): string {
  const key = [
    requireDedupComponent(input.customerId, "customerId"),
    requireDedupComponent(input.semanticType, "semanticType"),
    requireDedupComponent(input.domainEventRef, "domainEventRef"),
    requireDedupComponent(input.channel, "channel"),
  ].join(DEDUP_SEPARATOR);

  if (key.length > NOTIFICATION_DEDUP_KEY_MAX_LENGTH) {
    throw new NotificationError(
      "NOTIFICATION_INVALID_INPUT",
      `Notification dedup key exceeds ${NOTIFICATION_DEDUP_KEY_MAX_LENGTH} characters.`,
      { field: "domainEventRef" },
    );
  }
  return key;
}
