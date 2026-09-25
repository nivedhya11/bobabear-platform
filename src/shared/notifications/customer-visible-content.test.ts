/**
 * IMP-036H — pure customer-visible notification wording (AC-036H-029).
 */
import { describe, expect, it } from "vitest";

import {
  renderCustomerVisibleNotificationContent,
  summaryClaimsRiderOrDeliveryProgress,
} from "./customer-visible-content";

describe("renderCustomerVisibleNotificationContent", () => {
  it("ORDER_ACCEPTED Pickup includes Pickup wording and optional location", () => {
    const withoutLocation = renderCustomerVisibleNotificationContent({
      semanticType: "ORDER_ACCEPTED",
      fulfilmentMode: "PICKUP",
    });
    expect(withoutLocation.summary).toBe("Your Pickup order has been accepted.");
    expect(withoutLocation.forbidsRiderOrDeliveryProgressClaims).toBe(true);
    expect(summaryClaimsRiderOrDeliveryProgress(withoutLocation.summary)).toBe(false);

    const withLocation = renderCustomerVisibleNotificationContent({
      semanticType: "ORDER_ACCEPTED",
      fulfilmentMode: "PICKUP",
      pickupLocationDisplayName: "Pickup Counter",
    });
    expect(withLocation.summary).toBe(
      "Your Pickup order has been accepted. Pickup from Pickup Counter.",
    );
    expect(summaryClaimsRiderOrDeliveryProgress(withLocation.summary)).toBe(false);
  });

  it("ORDER_ACCEPTED Delivery stays delivery-neutral without claiming Pickup", () => {
    const content = renderCustomerVisibleNotificationContent({
      semanticType: "ORDER_ACCEPTED",
      fulfilmentMode: "DELIVERY",
    });
    expect(content.summary).toBe("Your order has been accepted.");
    expect(content.summary).not.toMatch(/pickup/i);
    expect(content.forbidsRiderOrDeliveryProgressClaims).toBe(false);
  });

  it("OUT_FOR_DELIVERY / DELIVERED fail closed for PICKUP", () => {
    expect(() =>
      renderCustomerVisibleNotificationContent({
        semanticType: "OUT_FOR_DELIVERY",
        fulfilmentMode: "PICKUP",
      }),
    ).toThrow(/not permitted for PICKUP/i);

    expect(() =>
      renderCustomerVisibleNotificationContent({
        semanticType: "DELIVERED",
        fulfilmentMode: "PICKUP",
      }),
    ).toThrow(/not permitted for PICKUP/i);
  });

  it("Delivery progress types remain available for DELIVERY", () => {
    expect(
      renderCustomerVisibleNotificationContent({
        semanticType: "OUT_FOR_DELIVERY",
        fulfilmentMode: "DELIVERY",
      }).summary,
    ).toBe("Your order is out for delivery.");
    expect(
      renderCustomerVisibleNotificationContent({
        semanticType: "DELIVERED",
        fulfilmentMode: "DELIVERY",
      }).summary,
    ).toBe("Your order has been delivered.");
  });

  it("adds sealed arrival wording for scheduled delivery without a reminder semantic", () => {
    const content = renderCustomerVisibleNotificationContent({
      semanticType: "ORDER_ACCEPTED",
      fulfilmentMode: "DELIVERY",
      fulfilmentTiming: "SCHEDULED",
      scheduledWindowLabel: "18:00–18:30",
      scheduledTimeZone: "Asia/Kolkata",
    });
    expect(content.summary).toContain("Arrival / fulfilment window 18:00–18:30 (Asia/Kolkata)");
    expect(content.summary).not.toMatch(/SCHEDULED_FULFILMENT_REMINDER/);
  });

  it("keeps ASAP wording when timing is omitted", () => {
    expect(
      renderCustomerVisibleNotificationContent({
        semanticType: "ORDER_ACCEPTED",
        fulfilmentMode: "DELIVERY",
      }).summary,
    ).not.toMatch(/Arrival \/ fulfilment window/);
  });
});
