/**
 * IMP-036H-C — Order projection mode-awareness (AF-036H-10).
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  getCustomerOrder,
  getWorkforceOrder,
} from "../../src/server/order";
import { closeTrackedPersistenceHandles } from "../database/support/cart-fixtures";
import {
  withCompletedPositiveOrderHarness,
  withCompletedPositivePickupOrderHarness,
} from "../database/support/order-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-036H-C order projections — fulfilment mode", () => {
  it("PICKUP customer/workforce detail: mode + pickupLocation; destination and delivery absent", async () => {
    await withCompletedPositivePickupOrderHarness(async (h) => {
      const customer = await getCustomerOrder(h.persistence, h.actor, {
        orderId: h.order.id,
      });
      expect(customer.fulfilmentMode).toBe("PICKUP");
      expect(customer.destination).toBeNull();
      expect(customer.pickupLocation).toMatchObject({
        displayName: "Pickup Counter",
        city: "Dehradun",
        postalCode: "248001",
      });
      expect(customer.delivery).toBeNull();

      const workforce = await getWorkforceOrder(
        h.persistence,
        h.workforce.outletManager,
        { orderId: h.order.id },
      );
      expect(workforce.fulfilmentMode).toBe("PICKUP");
      expect(workforce.destination).toBeNull();
      expect(workforce.pickupLocation?.displayName).toBe("Pickup Counter");
      expect(workforce).not.toHaveProperty("delivery");
    });
  });

  it("DELIVERY customer/workforce detail: mode + destination; pickupLocation absent", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const customer = await getCustomerOrder(h.persistence, h.actor, {
        orderId: h.order.id,
      });
      expect(customer.fulfilmentMode).toBe("DELIVERY");
      expect(customer.destination?.recipientPhone).toBeTruthy();
      expect(customer.pickupLocation ?? null).toBeNull();

      const workforce = await getWorkforceOrder(
        h.persistence,
        h.workforce.outletManager,
        { orderId: h.order.id },
      );
      expect(workforce.fulfilmentMode).toBe("DELIVERY");
      expect(workforce.destination?.addressLine1).toBeTruthy();
      expect(workforce.pickupLocation ?? null).toBeNull();
    });
  });
});
