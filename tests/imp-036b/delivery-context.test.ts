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
      source: "manual_pin",
    });
  });

  it("persists manual PIN context", () => {
    writeDeliveryContextPin("248001");
    expect(readDeliveryContext()).toMatchObject({
      postalCode: "248001",
      displayLabel: "248001",
      source: "manual_pin",
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
