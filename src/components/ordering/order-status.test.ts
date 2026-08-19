import { describe, expect, it } from "vitest";

import { isCustomerOrderStatus, orderStatusLabel } from "./order-status";

describe("D-357 order status presentation", () => {
  it("maps only authoritative Order states", () => {
    expect(orderStatusLabel("PLACED")).toBe("Order received");
    expect(orderStatusLabel("ACCEPTED")).toBe("Order accepted");
    expect(orderStatusLabel("FULFILLED")).toBe("Order fulfilled");
    expect(orderStatusLabel("CANCELLED")).toBe("Order cancelled");
  });

  it("does not invent kitchen or delivery states", () => {
    expect(isCustomerOrderStatus("PREPARING")).toBe(false);
    expect(isCustomerOrderStatus("READY")).toBe(false);
    expect(isCustomerOrderStatus("OUT_FOR_DELIVERY")).toBe(false);
    expect(isCustomerOrderStatus("DELIVERED")).toBe(false);
    expect(orderStatusLabel("PREPARING")).toBe("PREPARING");
  });
});
