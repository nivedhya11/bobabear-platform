import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  readDeliveryContext,
  writeDeliveryContext,
  writeDeliveryContextPin,
  deliveryContextTriggerLabel,
} from "@/lib/customer-location/delivery-context";

describe("delivery-context", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("starts empty", () => {
    expect(readDeliveryContext()).toEqual({
      postalCode: "",
      displayLabel: "",
      source: "location_search",
      coordinates: null,
    });
  });

  it("persists coordinate-backed location context", () => {
    writeDeliveryContext({
      displayLabel: "Rajpur Road, Dehradun",
      coordinates: { latitude: "30.3256000", longitude: "78.0436000" },
      source: "location_search",
    });
    expect(readDeliveryContext()).toMatchObject({
      displayLabel: "Rajpur Road, Dehradun",
      source: "location_search",
      coordinates: { latitude: "30.3256000", longitude: "78.0436000" },
    });
  });

  it("persists saved-address selections", () => {
    writeDeliveryContext({
      postalCode: "248001",
      displayLabel: "Home · Rajpur Road · 248001",
      source: "saved_address",
      savedAddressId: "addr-1",
    });
    expect(readDeliveryContext()).toMatchObject({
      postalCode: "248001",
      displayLabel: "Home · Rajpur Road · 248001",
      source: "saved_address",
      savedAddressId: "addr-1",
    });
  });

  it("uses compact display label for trigger copy", () => {
    const label = deliveryContextTriggerLabel({
      postalCode: "248001",
      displayLabel: "Ghanta Ghar, Ghanta Ghar, Chukkuwala, Dehradun, Uttarakhand 248001, India",
      source: "location_search",
    });
    expect(label).toBe("Ghanta Ghar, Dehradun");
  });

  it("migrates legacy PIN storage", () => {
    window.sessionStorage.setItem("boba.delivery-pin.v1", "248001");
    expect(readDeliveryContext().postalCode).toBe("248001");
  });
});
