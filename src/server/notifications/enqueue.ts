/**
 * Domain → Notification enqueue seam (IMP-033).
 *
 * Called from inside an existing domain transaction, immediately after the
 * domain state mutation, so the notification intent commits atomically with
 * the fact it describes: no committed order transition without its queued
 * notification, and no notification for a rolled-back transition.
 *
 * These helpers must never widen a domain failure. They only SELECT (to resolve
 * the customer identity) and INSERT one outbox row, and they return without
 * enqueuing when the identity cannot be resolved — a Postgres transaction
 * cannot swallow a failed statement without a savepoint, so an unresolvable
 * identity is skipped rather than risked.
 */
import "server-only";

import { randomUUID } from "node:crypto";

import type { NotificationSemanticType } from "../../shared/notifications";
import { enqueueOutboxEvent } from "../persistence/outbox";
import type { PersistenceTransactionContext } from "../persistence/types";
import { findCustomerIdForOrder } from "./repository";
import {
  NOTIFICATION_OUTBOX_AGGREGATE_TYPE,
  NOTIFICATION_OUTBOX_EVENT_VERSION,
  notificationDomainEventRef,
  outboxEventTypeFor,
  toOutboxPayloadJson,
} from "./outbox-events";

export type EnqueueNotificationIntentInput = Readonly<{
  customerId: string;
  semanticType: NotificationSemanticType;
  domainEventRef: string;
  orderId?: string | null;
  paymentId?: string | null;
  deliveryId?: string | null;
  occurredAt: Date;
}>;

export async function enqueueNotificationIntent(
  context: PersistenceTransactionContext,
  input: EnqueueNotificationIntentInput,
): Promise<void> {
  const payload = toOutboxPayloadJson({
    customerId: input.customerId,
    orderId: input.orderId ?? null,
    paymentId: input.paymentId ?? null,
    deliveryId: input.deliveryId ?? null,
    domainEventRef: input.domainEventRef,
    semanticType: input.semanticType,
    occurredAt: input.occurredAt.toISOString(),
  });

  await enqueueOutboxEvent(context, {
    id: randomUUID(),
    eventType: outboxEventTypeFor(input.semanticType),
    eventVersion: NOTIFICATION_OUTBOX_EVENT_VERSION,
    aggregateType: NOTIFICATION_OUTBOX_AGGREGATE_TYPE,
    aggregateId: input.orderId ?? input.deliveryId ?? input.paymentId ?? null,
    payload,
    occurredAt: input.occurredAt,
    availableAt: input.occurredAt,
    createdAt: input.occurredAt,
  });
}

export async function enqueueOrderReceivedNotification(
  context: PersistenceTransactionContext,
  input: Readonly<{ customerId: string; orderId: string; occurredAt: Date }>,
): Promise<void> {
  await enqueueNotificationIntent(context, {
    customerId: input.customerId,
    semanticType: "ORDER_RECEIVED",
    domainEventRef: notificationDomainEventRef.orderReceived(input.orderId),
    orderId: input.orderId,
    occurredAt: input.occurredAt,
  });
}

export async function enqueuePaymentConfirmedNotification(
  context: PersistenceTransactionContext,
  input: Readonly<{ customerId: string; paymentId: string; occurredAt: Date }>,
): Promise<void> {
  await enqueueNotificationIntent(context, {
    customerId: input.customerId,
    semanticType: "PAYMENT_CONFIRMED",
    domainEventRef: notificationDomainEventRef.paymentConfirmed(input.paymentId),
    paymentId: input.paymentId,
    occurredAt: input.occurredAt,
  });
}

/**
 * Order lifecycle enqueue. The Order table has no customer column, so the
 * identity is resolved through the bound Checkout snapshot inside the same
 * transaction.
 */
export async function enqueueOrderLifecycleNotification(
  context: PersistenceTransactionContext,
  input: Readonly<{
    orderId: string;
    semanticType: Extract<NotificationSemanticType, "ORDER_ACCEPTED" | "ORDER_CANCELLED">;
    revision: bigint;
    occurredAt: Date;
  }>,
): Promise<void> {
  const customerId = await findCustomerIdForOrder(context, input.orderId);
  if (!customerId) return;

  const domainEventRef =
    input.semanticType === "ORDER_ACCEPTED"
      ? notificationDomainEventRef.orderAccepted(input.orderId, input.revision)
      : notificationDomainEventRef.orderCancelled(input.orderId, input.revision);

  await enqueueNotificationIntent(context, {
    customerId,
    semanticType: input.semanticType,
    domainEventRef,
    orderId: input.orderId,
    occurredAt: input.occurredAt,
  });
}

export async function enqueueDeliveryProgressNotification(
  context: PersistenceTransactionContext,
  input: Readonly<{
    deliveryId: string;
    orderId: string;
    semanticType: Extract<NotificationSemanticType, "OUT_FOR_DELIVERY" | "DELIVERED">;
    occurredAt: Date;
  }>,
): Promise<void> {
  const customerId = await findCustomerIdForOrder(context, input.orderId);
  if (!customerId) return;

  const domainEventRef =
    input.semanticType === "OUT_FOR_DELIVERY"
      ? notificationDomainEventRef.deliveryOutForDelivery(input.deliveryId)
      : notificationDomainEventRef.deliveryDelivered(input.deliveryId);

  await enqueueNotificationIntent(context, {
    customerId,
    semanticType: input.semanticType,
    domainEventRef,
    orderId: input.orderId,
    deliveryId: input.deliveryId,
    occurredAt: input.occurredAt,
  });
}
