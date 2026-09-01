import { describe, expect, it } from "vitest";

import {
  geolocationFailureCopy,
  locationProviderUnavailableCopy,
  serviceabilityStatusCopy,
} from "@/components/location/serviceability-copy";

describe("location serviceability copy", () => {
  it("maps all serviceability statuses with customer-safe copy", () => {
    expect(serviceabilityStatusCopy("SERVICEABLE")).toMatch(/deliver here/i);
    expect(serviceabilityStatusCopy("NOT_SERVICEABLE")).toMatch(/don't deliver/i);
    expect(serviceabilityStatusCopy("TEMPORARILY_UNAVAILABLE")).toMatch(/temporarily unavailable/i);
    expect(serviceabilityStatusCopy("INDETERMINATE")).toMatch(/couldn't confirm/i);
    expect(serviceabilityStatusCopy("SERVICEABLE")).not.toMatch(/SERVICEABLE/);
  });

  it("maps geolocation failures without PIN fallback language", () => {
    expect(geolocationFailureCopy("permission_denied")).toMatch(/denied/i);
    expect(geolocationFailureCopy("timeout")).toMatch(/too long/i);
    expect(geolocationFailureCopy("permission_denied")).not.toMatch(/enter a PIN/i);
  });

  it("does not name Google APIs in customer fallback copy", () => {
    expect(locationProviderUnavailableCopy()).not.toMatch(/Google|Places|Geocoding/i);
    expect(locationProviderUnavailableCopy()).not.toMatch(/PIN/i);
  });
});
