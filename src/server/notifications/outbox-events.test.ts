/**
 * Notification outbox event contract tests (IMP-033).
 */
import { describe, expect, it } from "vitest";

import { NOTIFICATION_SEMANTIC_TYPES } from "../../shared/notifications";
import {
  isNotificationOutboxEventType,
  notificationDomainEventRef,
  NOTIFICATION_OUTBOX_EVENT_TYPES,
  outboxEventTypeFor,
  parseNotificationOutboxPayload,
  semanticTypeForOutboxEventType,
  toOutboxPayloadJson,
} from "./outbox-events";

const ORDER_ID = "5f4a1c2e-0000-4000-8000-00000000000a";
const CUSTOMER_ID = "5f4a1c2e-0000-4000-8000-00000000000b";

describe("notification outbox event types", () => {
  it("round-trips every semantic type through its event type", () => {
    for (const semanticType of NOTIFICATION_SEMANTIC_TYPES) {
      const eventType = outboxEventTypeFor(semanticType);
      expect(isNotificationOutboxEventType(eventType)).toBe(true);
      expect(semanticTypeForOutboxEventType(eventType)).toBe(semanticType);
    }
    expect(NOTIFICATION_OUTBOX_EVENT_TYPES).toHaveLength(
      NOTIFICATION_SEMANTIC_TYPES.length,
    );
  });

  it("does not claim unrelated event types", () => {
    expect(isNotificationOutboxEventType("payment.succeeded")).toBe(false);
    expect(isNotificationOutboxEventType("notification.domain.unknown")).toBe(false);
  });
});

describe("notification outbox payload parsing", () => {
  const valid = {
    customerId: CUSTOMER_ID,
    orderId: ORDER_ID,
    paymentId: null,
    deliveryId: null,
    domainEventRef: `order:${ORDER_ID}:accepted:3`,
    semanticType: "ORDER_ACCEPTED",
    occurredAt: "2026-08-31T12:00:00.000Z",
  };

  it("round-trips a well-formed payload", () => {
    const parsed = parseNotificationOutboxPayload(toOutboxPayloadJson(valid as never));
    expect(parsed).toEqual(valid);
  });

  it("returns null for malformed payloads so the processor can dead-letter them", () => {
    expect(parseNotificationOutboxPayload({})).toBeNull();
    expect(
      parseNotificationOutboxPayload({ ...valid, customerId: "" }),
    ).toBeNull();
    expect(
      parseNotificationOutboxPayload({ ...valid, semanticType: "ORDER_TELEPORTED" }),
    ).toBeNull();
    expect(
      parseNotificationOutboxPayload({ ...valid, occurredAt: "not-a-date" }),
    ).toBeNull();
    expect(
      parseNotificationOutboxPayload({ ...valid, domainEventRef: "r".repeat(300) }),
    ).toBeNull();
  });
});

describe("notification domain event references", () => {
  it("is stable for the same committed fact and distinct across facts", () => {
    expect(notificationDomainEventRef.orderReceived(ORDER_ID)).toBe(
      notificationDomainEventRef.orderReceived(ORDER_ID),
    );
    expect(notificationDomainEventRef.orderAccepted(ORDER_ID, BigInt(3))).toBe(
      `order:${ORDER_ID}:accepted:3`,
    );
    expect(notificationDomainEventRef.orderAccepted(ORDER_ID, BigInt(3))).not.toBe(
      notificationDomainEventRef.orderAccepted(ORDER_ID, BigInt(4)),
    );
    expect(notificationDomainEventRef.orderCancelled(ORDER_ID, BigInt(3))).not.toBe(
      notificationDomainEventRef.orderAccepted(ORDER_ID, BigInt(3)),
    );
    expect(notificationDomainEventRef.deliveryDelivered(ORDER_ID)).not.toBe(
      notificationDomainEventRef.deliveryOutForDelivery(ORDER_ID),
    );
  });

  it("never embeds the dedup separator", () => {
    const refs = [
      notificationDomainEventRef.orderReceived(ORDER_ID),
      notificationDomainEventRef.paymentConfirmed(ORDER_ID),
      notificationDomainEventRef.orderAccepted(ORDER_ID, BigInt(1)),
      notificationDomainEventRef.orderCancelled(ORDER_ID, BigInt(1)),
      notificationDomainEventRef.deliveryOutForDelivery(ORDER_ID),
      notificationDomainEventRef.deliveryDelivered(ORDER_ID),
    ];
    for (const ref of refs) expect(ref).not.toContain("|");
  });
});
