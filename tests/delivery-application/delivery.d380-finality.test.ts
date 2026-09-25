/**
 * D-380: DELIVERED is successful-completion truth.
 * FAILED and CANCELLED replacement stay on the previously accepted path.
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  beginBooking,
  cancelDelivery,
  confirmPickup,
  createDelivery,
  createFakeDeliveryProvider,
  failDelivery,
  recordProofAndDeliver,
} from "../../src/server/delivery";
import { closeTrackedPersistenceHandles } from "../database/support/cart-fixtures";
import { withCompletedPositiveOrderHarness } from "../database/support/order-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-036I D-380 delivery successful-completion finality", () => {
  it("rejects normal replacement after a DELIVERED predecessor", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const created = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-d380-delivered",
      });
      const booked = await beginBooking(
        h.persistence,
        {
          deliveryId: created.id,
          expectedRevision: created.revision,
          provider: provider.name,
        },
        { provider },
      );
      const picked = await confirmPickup(h.persistence, {
        deliveryId: booked.delivery.id,
        expectedRevision: booked.delivery.revision,
        handoffReference: "handoff-d380",
      });
      const delivered = await recordProofAndDeliver(h.persistence, {
        deliveryId: picked.id,
        expectedRevision: picked.revision,
        proofReference: "proof-d380",
      });
      expect(delivered.status).toBe("DELIVERED");

      await expect(
        createDelivery(h.persistence, {
          orderId: h.order.id,
          requestFingerprint: "fp-d380-replace",
          priorDeliveryId: delivered.id,
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_STATE_CONFLICT" });

      await expect(
        createDelivery(h.persistence, {
          orderId: h.order.id,
          requestFingerprint: "fp-d380-create",
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_STATE_CONFLICT" });
    });
  });

  it("still permits replacement after FAILED when no DELIVERED row exists", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const first = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-d380-fail",
      });
      const failed = await failDelivery(h.persistence, {
        deliveryId: first.id,
        expectedRevision: first.revision,
        failureCode: "UNABLE",
        failureReason: "Could not book.",
      });
      expect(failed.status).toBe("FAILED");

      const replacement = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-d380-fail-replace",
        priorDeliveryId: failed.id,
      });
      expect(replacement.status).toBe("REQUESTED");
      expect(replacement.priorDeliveryId).toBe(failed.id);
    });
  });

  it("still permits replacement after CANCELLED when no DELIVERED row exists", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const first = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-d380-cancel",
      });
      const cancelled = await cancelDelivery(h.persistence, {
        deliveryId: first.id,
        expectedRevision: first.revision,
        cancellationCode: "OPS_CANCEL",
        cancellationReason: "Operator cancelled before booking.",
      });
      expect(cancelled.status).toBe("CANCELLED");

      const replacement = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-d380-cancel-replace",
        priorDeliveryId: cancelled.id,
      });
      expect(replacement.status).toBe("REQUESTED");
      expect(replacement.priorDeliveryId).toBe(cancelled.id);
    });
  });

  it("still blocks replacement while a picked-up Delivery is active", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const created = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-d380-picked",
      });
      const booked = await beginBooking(
        h.persistence,
        {
          deliveryId: created.id,
          expectedRevision: created.revision,
          provider: provider.name,
        },
        { provider },
      );
      const picked = await confirmPickup(h.persistence, {
        deliveryId: booked.delivery.id,
        expectedRevision: booked.delivery.revision,
        handoffReference: "handoff-d380-active",
      });
      expect(picked.status).toBe("PICKED_UP");

      await expect(
        createDelivery(h.persistence, {
          orderId: h.order.id,
          requestFingerprint: "fp-d380-picked-replace",
          priorDeliveryId: picked.id,
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_ACTIVE_EXISTS" });
    });
  });
});
