import { describe, expect, it } from "vitest";

import {
  OPERATIONS_NAV_ITEMS,
  resolveOperationsNavItems,
} from "@/lib/operations/navigation";
import { createRefundRequestId, refundStatusLabel } from "@/lib/operations/refunds";
import {
  STORE_COARSE_NAV_PERMISSIONS,
  appendOutletId,
  resolveStoreSubnavItems,
  sortOutletsByCodeThenId,
} from "@/lib/operations/store-navigation";
import { validateScheduleIntervals } from "@/lib/operations/store";

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

  it("shows Store from Store coarse keys, not order.read alone", () => {
    const storeItem = OPERATIONS_NAV_ITEMS.find((item) => item.id === "store");
    expect(storeItem?.requiredAnyPermission).toEqual([...STORE_COARSE_NAV_PERMISSIONS]);
    expect(storeItem?.requiredAnyPermission).not.toContain("order.read");

    const orderOnly = resolveOperationsNavItems(
      { "order.read": true },
      "/workforce/operations/store/",
    );
    expect(orderOnly.some((item) => item.label === "Store")).toBe(false);

    const availabilityOnly = resolveOperationsNavItems(
      { "availability.read": true },
      "/workforce/operations/store/",
    );
    expect(availabilityOnly.some((item) => item.label === "Store")).toBe(true);
  });
});

describe("IMP-036E store navigation helpers", () => {
  it("preserves outletId on subnav hrefs", () => {
    expect(appendOutletId("/workforce/operations/store/hours/", "out-1")).toBe(
      "/workforce/operations/store/hours/?outletId=out-1",
    );
    const items = resolveStoreSubnavItems(
      {
        "outlet.read": true,
        "availability.read": true,
        "outlet.operating_state.read": true,
      },
      "/workforce/operations/store/availability/",
      "out-9",
    );
    expect(items.every((item) => item.href.includes("outletId=out-9"))).toBe(true);
    expect(items.find((item) => item.id === "availability")?.current).toBe(true);
  });

  it("hides suspend-dependent section when capability false and never uses role names", () => {
    const items = resolveStoreSubnavItems(
      { "outlet.operating_state.read": true },
      "/workforce/operations/store/operating-status/",
      "o1",
    );
    expect(items.some((item) => item.id === "operating-status")).toBe(true);
    const source = JSON.stringify(items);
    expect(source).not.toMatch(/OUTLET_MANAGER|roleKey|role ===/i);
  });

  it("sorts outlets deterministically by code then id", () => {
    const sorted = sortOutletsByCodeThenId([
      { id: "b", code: "ZZ" },
      { id: "a", code: "AA" },
      { id: "c", code: "AA" },
    ]);
    expect(sorted.map((o) => o.id)).toEqual(["a", "c", "b"]);
  });
});

describe("IMP-036E hours validation messaging", () => {
  it("returns user-language overlap and order errors", () => {
    expect(
      validateScheduleIntervals([
        { dayOfWeek: 1, startMinute: 600, endMinute: 700 },
        { dayOfWeek: 1, startMinute: 650, endMinute: 800 },
      ]),
    ).toMatch(/overlap/i);
    expect(
      validateScheduleIntervals([{ dayOfWeek: 1, startMinute: 700, endMinute: 600 }]),
    ).toMatch(/earlier than closing/i);
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
