/**
 * Notification outbox event contract (IMP-033).
 *
 * These are internal notification-intent events carried by the existing
 * PostgreSQL transactional outbox (`app.outbox_events`). They are not domain
 * events, not a public contract, and not an alternative source of Order /
 * Payment / Delivery truth — a payload only says "notify this customer about
 * this already-committed fact".
 */
import {
  NOTIFICATION_DOMAIN_EVENT_REF_MAX_LENGTH,
  isNotificationSemanticType,
  type NotificationSemanticType,
} from "../../shared/notifications";
import type { JsonObject } from "../persistence/outbox/types";

export const NOTIFICATION_OUTBOX_EVENT_VERSION = 1 as const;

export const NOTIFICATION_OUTBOX_AGGREGATE_TYPE = "notification" as const;

export const NOTIFICATION_OUTBOX_EVENT_TYPES = [
  "notification.domain.order_received",
  "notification.domain.payment_confirmed",
  "notification.domain.order_accepted",
  "notification.domain.order_cancelled",
  "notification.domain.out_for_delivery",
  "notification.domain.delivered",
] as const;

export type NotificationOutboxEventType =
  (typeof NOTIFICATION_OUTBOX_EVENT_TYPES)[number];

const EVENT_TYPE_BY_SEMANTIC_TYPE: Readonly<
  Record<NotificationSemanticType, NotificationOutboxEventType>
> = Object.freeze({
  ORDER_RECEIVED: "notification.domain.order_received",
  PAYMENT_CONFIRMED: "notification.domain.payment_confirmed",
  ORDER_ACCEPTED: "notification.domain.order_accepted",
  ORDER_CANCELLED: "notification.domain.order_cancelled",
  OUT_FOR_DELIVERY: "notification.domain.out_for_delivery",
  DELIVERED: "notification.domain.delivered",
});

const SEMANTIC_TYPE_BY_EVENT_TYPE: Readonly<
  Record<NotificationOutboxEventType, NotificationSemanticType>
> = Object.freeze({
  "notification.domain.order_received": "ORDER_RECEIVED",
  "notification.domain.payment_confirmed": "PAYMENT_CONFIRMED",
  "notification.domain.order_accepted": "ORDER_ACCEPTED",
  "notification.domain.order_cancelled": "ORDER_CANCELLED",
  "notification.domain.out_for_delivery": "OUT_FOR_DELIVERY",
  "notification.domain.delivered": "DELIVERED",
});

export type NotificationOutboxPayload = Readonly<{
  customerId: string;
  orderId: string | null;
  paymentId: string | null;
  deliveryId: string | null;
  domainEventRef: string;
  semanticType: NotificationSemanticType;
  occurredAt: string;
}>;

export function outboxEventTypeFor(
  semanticType: NotificationSemanticType,
): NotificationOutboxEventType {
  return EVENT_TYPE_BY_SEMANTIC_TYPE[semanticType];
}

export function isNotificationOutboxEventType(
  eventType: string,
): eventType is NotificationOutboxEventType {
  return (NOTIFICATION_OUTBOX_EVENT_TYPES as readonly string[]).includes(eventType);
}

export function semanticTypeForOutboxEventType(
  eventType: NotificationOutboxEventType,
): NotificationSemanticType {
  return SEMANTIC_TYPE_BY_EVENT_TYPE[eventType];
}

export function toOutboxPayloadJson(payload: NotificationOutboxPayload): JsonObject {
  return Object.freeze({
    customerId: payload.customerId,
    orderId: payload.orderId,
    paymentId: payload.paymentId,
    deliveryId: payload.deliveryId,
    domainEventRef: payload.domainEventRef,
    semanticType: payload.semanticType,
    occurredAt: payload.occurredAt,
  });
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Parse an outbox payload defensively. Returns null instead of throwing so the
 * processor can dead-letter a malformed event rather than crash the poll loop.
 */
export function parseNotificationOutboxPayload(
  payload: JsonObject,
): NotificationOutboxPayload | null {
  const customerId = optionalString(payload.customerId);
  const domainEventRef = optionalString(payload.domainEventRef);
  const semanticType = optionalString(payload.semanticType);
  const occurredAt = optionalString(payload.occurredAt);

  if (!customerId || !domainEventRef || !semanticType || !occurredAt) return null;
  if (!isNotificationSemanticType(semanticType)) return null;
  if (domainEventRef.length > NOTIFICATION_DOMAIN_EVENT_REF_MAX_LENGTH) return null;
  if (Number.isNaN(new Date(occurredAt).getTime())) return null;

  return Object.freeze({
    customerId,
    orderId: optionalString(payload.orderId),
    paymentId: optionalString(payload.paymentId),
    deliveryId: optionalString(payload.deliveryId),
    domainEventRef,
    semanticType,
    occurredAt,
  });
}

/** Stable domain event references. Same committed fact → same reference →
 * same dedup key, so redelivery converges instead of duplicating. */
export const notificationDomainEventRef = Object.freeze({
  orderReceived: (orderId: string) => `order:${orderId}:received`,
  paymentConfirmed: (paymentId: string) => `payment:${paymentId}:confirmed`,
  orderAccepted: (orderId: string, revision: bigint) =>
    `order:${orderId}:accepted:${revision.toString()}`,
  orderCancelled: (orderId: string, revision: bigint) =>
    `order:${orderId}:cancelled:${revision.toString()}`,
  deliveryOutForDelivery: (deliveryId: string) => `delivery:${deliveryId}:picked_up`,
  deliveryDelivered: (deliveryId: string) => `delivery:${deliveryId}:delivered`,
});
