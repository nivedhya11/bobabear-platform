/**
 * IMP-032 manual Dehradun delivery operating mode tests.
 */
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import {
  beginManualBooking,
  confirmDeliveryWithFulfilCoordination,
  confirmManualBooking,
  confirmPickup,
  createDelivery,
  getOrderLifecycleSnapshot,
  recordProviderCostFact,
  resolveManualBookingFailure,
  retryFulfilForDeliveredDelivery,
} from "../../src/server/delivery";
import { acceptOrder } from "../../src/server/order";
import { PERMISSION_KEYS, ROLE_PERMISSION_MAPPINGS } from "../../src/shared/access-control";
import {
  projectCustomerDeliveryStatusLabel,
  tryCustomerTrackingUrl,
  validateHttpsTrackingUrl,
} from "../../src/shared/delivery";
import { closeTrackedPersistenceHandles } from "../database/support/cart-fixtures";
import {
  type CompletedOrderHarness,
  withCompletedPositiveOrderHarness,
} from "../database/support/order-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

const PROVIDER = "dehradun-courier";

async function arrangeAndBeginManual(h: CompletedOrderHarness) {
  const delivery = await createDelivery(h.persistence, {
    orderId: h.order.id,
    requestFingerprint: `manual-${randomUUID()}`,
  });
  return beginManualBooking(h.persistence, {
    deliveryId: delivery.id,
    expectedRevision: delivery.revision,
    provider: PROVIDER,
  });
}

describe("IMP-032 manual booking safety", () => {
  it("commits UNKNOWN before any external booking instruction path", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const unknown = await arrangeAndBeginManual(h);
      expect(unknown.status).toBe("BOOKING_OUTCOME_UNKNOWN");
      expect(unknown.bookingCorrelationId).toBeTruthy();
      expect(unknown.provider).toBe(PROVIDER);
    });
  });

  it("rejects repeated beginManualBooking", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const unknown = await arrangeAndBeginManual(h);
      await expect(
        beginManualBooking(h.persistence, {
          deliveryId: unknown.id,
          expectedRevision: unknown.revision,
          provider: PROVIDER,
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_STATE_CONFLICT" });
    });
  });

  it("rejects stale revision on beginManualBooking", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-stale-begin",
      });
      await expect(
        beginManualBooking(h.persistence, {
          deliveryId: delivery.id,
          expectedRevision: delivery.revision + BigInt(1),
          provider: PROVIDER,
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_REVISION_CONFLICT" });
    });
  });

  it("confirmManualBooking performs no provider I/O and preserves correlation", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const unknown = await arrangeAndBeginManual(h);
      const correlation = unknown.bookingCorrelationId!;
      const booked = await confirmManualBooking(h.persistence, {
        deliveryId: unknown.id,
        expectedRevision: unknown.revision,
        externalBookingReference: "EXT-123",
        trackingUrl: "https://track.example.com/abc",
      });
      expect(booked.status).toBe("BOOKED");
      expect(booked.bookingCorrelationId).toBe(correlation);
      expect(booked.provider).toBe(PROVIDER);
    });
  });

  it("failure resolution requires inactiveBookingConfirmed", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const unknown = await arrangeAndBeginManual(h);
      await expect(
        resolveManualBookingFailure(h.persistence, {
          deliveryId: unknown.id,
          expectedRevision: unknown.revision,
          failureCode: "NO_BOOKING",
          failureReason: "Courier unavailable",
          inactiveBookingConfirmed: false,
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_INVALID_INPUT" });
    });
  });

  it("pickup requires BOOKED", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const unknown = await arrangeAndBeginManual(h);
      await expect(
        confirmPickup(h.persistence, {
          deliveryId: unknown.id,
          expectedRevision: unknown.revision,
          handoffReference: "HO-1",
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_TRANSITION_NOT_ALLOWED" });
    });
  });

  it("delivery proof requires PICKED_UP and structured proof reference", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const unknown = await arrangeAndBeginManual(h);
      const booked = await confirmManualBooking(h.persistence, {
        deliveryId: unknown.id,
        expectedRevision: unknown.revision,
      });
      await expect(
        confirmDeliveryWithFulfilCoordination(
          h.persistence,
          h.workforce.delivery,
          {
            deliveryId: booked.id,
            expectedRevision: booked.revision,
            proofReference: "https://track.example.com/not-proof-alone",
          },
        ),
      ).rejects.toMatchObject({ code: "DELIVERY_TRANSITION_NOT_ALLOWED" });
    });
  });

  it("tracking URL alone is rejected as invalid proof path at pickup/delivery gates", async () => {
    expect(() => validateHttpsTrackingUrl("javascript:alert(1)")).toThrow();
    expect(() => validateHttpsTrackingUrl("http://insecure.example")).toThrow();
    expect(tryCustomerTrackingUrl("not-a-url")).toBeNull();
  });

  it("provider cost does not mutate order commercial charge", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const unknown = await arrangeAndBeginManual(h);
      const orderBefore = await getOrderLifecycleSnapshot(h.persistence, h.order.id);
      await recordProviderCostFact(h.persistence, {
        deliveryId: unknown.id,
        kind: "booked",
        amountPaise: BigInt(4500),
        provider: PROVIDER,
      });
      const orderAfter = await getOrderLifecycleSnapshot(h.persistence, h.order.id);
      expect(orderAfter.status).toBe(orderBefore.status);
      expect(orderAfter.revision).toBe(orderBefore.revision);
    });
  });

  it("DELIVERED leaves order unchanged when fulfil fails eligibility", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const unknown = await arrangeAndBeginManual(h);
      let booked = await confirmManualBooking(h.persistence, {
        deliveryId: unknown.id,
        expectedRevision: unknown.revision,
      });
      booked = await confirmPickup(h.persistence, {
        deliveryId: booked.id,
        expectedRevision: booked.revision,
        handoffReference: "HO-REF-1",
      });
      const result = await confirmDeliveryWithFulfilCoordination(
        h.persistence,
        h.workforce.delivery,
        {
          deliveryId: booked.id,
          expectedRevision: booked.revision,
          proofReference: "POD-REF-1",
        },
      );
      expect(result.delivery.status).toBe("DELIVERED");
      expect(result.fulfilAttempted).toBe(false);
      const order = await getOrderLifecycleSnapshot(h.persistence, h.order.id);
      expect(order.status).toBe("PLACED");
    });
  });

  it("fulfil retry works after order accepted", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const unknown = await arrangeAndBeginManual(h);
      let booked = await confirmManualBooking(h.persistence, {
        deliveryId: unknown.id,
        expectedRevision: unknown.revision,
      });
      booked = await confirmPickup(h.persistence, {
        deliveryId: booked.id,
        expectedRevision: booked.revision,
        handoffReference: "HO-REF-2",
      });
      await confirmDeliveryWithFulfilCoordination(h.persistence, h.workforce.delivery, {
        deliveryId: booked.id,
        expectedRevision: booked.revision,
        proofReference: "POD-REF-2",
      });
      const accepted = await acceptOrder(h.persistence, h.workforce.outletManager, {
        orderId: h.order.id,
        expectedOrderRevision: h.order.revision,
      });
      const retry = await retryFulfilForDeliveredDelivery(h.persistence, h.workforce.delivery, {
        deliveryId: booked.id,
        expectedOrderRevision: accepted.revision,
      });
      expect(retry.fulfilSucceeded).toBe(true);
      expect(retry.orderStatus).toBe("FULFILLED");
    });
  });
});

describe("IMP-032 RBAC catalog", () => {
  it("seeds ten delivery.* outlet permissions with approved mappings", () => {
    const deliveryKeys = PERMISSION_KEYS.filter((k) => k.startsWith("delivery."));
    expect(deliveryKeys).toHaveLength(10);
    for (const key of deliveryKeys) {
      expect(ROLE_PERMISSION_MAPPINGS.some((m) => m.roleKey === "delivery_coordinator" && m.permissionKey === key)).toBe(true);
      expect(ROLE_PERMISSION_MAPPINGS.some((m) => m.roleKey === "platform_super_admin" && m.permissionKey === key)).toBe(true);
    }
    expect(ROLE_PERMISSION_MAPPINGS.some((m) => m.roleKey === "outlet_manager" && m.permissionKey === "delivery.read")).toBe(true);
    expect(ROLE_PERMISSION_MAPPINGS.some((m) => m.roleKey === "outlet_manager" && m.permissionKey === "delivery.book")).toBe(false);
  });
});

describe("IMP-032 customer projection labels", () => {
  it("does not show Rider assigned without assignment evidence", () => {
    expect(
      projectCustomerDeliveryStatusLabel({ status: "BOOKED", hasActiveAssignment: false }),
    ).toBe("Delivery booked");
    expect(
      projectCustomerDeliveryStatusLabel({ status: "BOOKED", hasActiveAssignment: true }),
    ).toBe("Rider assigned");
  });
});

describe("IMP-032 migration seed", () => {
  it("data-only migration contains no DDL", async () => {
    const { readFileSync } = await import("node:fs");
    const sql = readFileSync("drizzle/0032_delivery_permissions.sql", "utf8");
    expect(sql.toUpperCase()).not.toMatch(/\bCREATE\b|\bALTER\b|\bDROP\b/);
    expect(sql).toContain("access_permissions");
    expect(sql).toContain("delivery.read");
  });
});
