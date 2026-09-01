import { describe, expect, it } from "vitest";

import {
  geodesicDistanceMeters,
  isDistancePolicyConfigured,
} from "@/shared/serviceability/geodesic";

describe("serviceability geodesic distance", () => {
  it("returns zero for identical points", () => {
    expect(
      geodesicDistanceMeters({
        originLatitude: 30.3164945,
        originLongitude: 78.0321918,
        pointLatitude: 30.3164945,
        pointLongitude: 78.0321918,
      }),
    ).toBe(0);
  });

  it("computes a deterministic non-zero distance between nearby points", () => {
    const meters = geodesicDistanceMeters({
      originLatitude: 30.3164945,
      originLongitude: 78.0321918,
      pointLatitude: 30.325,
      pointLongitude: 78.04,
    });
    expect(meters).toBeGreaterThan(500);
    expect(meters).toBeLessThan(5_000);
  });

  it("requires a complete distance policy triple", () => {
    expect(
      isDistancePolicyConfigured({
        serviceOriginLatitude: "30.3164945",
        serviceOriginLongitude: "78.0321918",
        maxServiceDistanceMeters: 1000,
      }),
    ).toBe(true);
    expect(
      isDistancePolicyConfigured({
        serviceOriginLatitude: "30.3164945",
        serviceOriginLongitude: null,
        maxServiceDistanceMeters: 1000,
      }),
    ).toBe(false);
  });
});
