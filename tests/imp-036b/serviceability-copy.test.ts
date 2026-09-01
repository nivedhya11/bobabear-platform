import { describe, expect, it } from "vitest";

import {
  geolocationFailureCopy,
  serviceabilityStatusCopy,
} from "@/components/location/serviceability-copy";

describe("location serviceability copy", () => {
  it("maps all serviceability statuses", () => {
    expect(serviceabilityStatusCopy("SERVICEABLE")).toMatch(/available/i);
    expect(serviceabilityStatusCopy("NOT_SERVICEABLE")).toMatch(/don't deliver/i);
    expect(serviceabilityStatusCopy("TEMPORARILY_UNAVAILABLE")).toMatch(/right now/i);
    expect(serviceabilityStatusCopy("INDETERMINATE")).toMatch(/couldn't confirm/i);
  });

  it("maps geolocation failures", () => {
    expect(geolocationFailureCopy("permission_denied")).toMatch(/denied/i);
    expect(geolocationFailureCopy("timeout")).toMatch(/too long/i);
  });
});
