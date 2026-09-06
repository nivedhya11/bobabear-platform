import { describe, expect, it } from "vitest";

import {
  OPERATIONS_NAV_ITEMS,
  resolveOperationsNavItems,
} from "@/lib/operations/navigation";
import { createRefundRequestId, refundStatusLabel } from "@/lib/operations/refunds";

describe("IMP-036D operations navigation", () => {
  it("exposes locked primary navigation labels", () => {
    expect(OPERATIONS_NAV_ITEMS.map((item) => item.label)).toEqual([
      "Today",
      "Orders",
      "Delivery",
      "Store",
      "Operational Status",
    ]);
  });

  it("derives visibility from capabilities, never role strings", () => {
    const withOrderOnly = resolveOperationsNavItems(
      { "order.read": true },
      "/workforce/operations/",
    );
    expect(withOrderOnly.map((item) => item.label)).toEqual([
      "Today",
      "Orders",
      "Store",
      "Operational Status",
    ]);
    expect(withOrderOnly.find((item) => item.label === "Today")?.current).toBe(true);

    const withDelivery = resolveOperationsNavItems(
      { "order.read": true, "delivery.read": true },
      "/workforce/operations/delivery/",
    );
    expect(withDelivery.some((item) => item.label === "Delivery")).toBe(true);
    expect(withDelivery.find((item) => item.label === "Delivery")?.current).toBe(true);

    const source = OPERATIONS_NAV_ITEMS.map((item) => JSON.stringify(item)).join("\n");
    expect(source).not.toMatch(/STORE_MANAGER|FRANCHISE|role ===/i);
  });
});

describe("IMP-036D refund client helpers", () => {
  it("labels ACCEPTED and INDETERMINATE without claiming provider completion", () => {
    expect(refundStatusLabel("ACCEPTED")).toMatch(/awaiting provider/i);
    expect(refundStatusLabel("INDETERMINATE")).toMatch(/being verified/i);
    expect(refundStatusLabel("PROCESSED")).toMatch(/completed/i);
  });

  it("creates UUID refund request ids", () => {
    const id = createRefundRequestId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
