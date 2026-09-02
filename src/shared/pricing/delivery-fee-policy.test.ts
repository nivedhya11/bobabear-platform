import { describe, expect, it } from "vitest";

import {
  parseDeliveryFeeBands,
  resolveDeliveryFeeFromBands,
} from "./delivery-fee-policy";

describe("delivery fee policy (IMP-036C)", () => {
  it("parses and sorts distance bands", () => {
    const bands = parseDeliveryFeeBands([
      { maxDistanceMeters: 9000, amountPaise: 6000 },
      { maxDistanceMeters: 3000, amountPaise: 2500 },
    ]);
    expect(bands.map((b) => b.maxDistanceMeters)).toEqual([3000, 9000]);
  });

  it("resolves fee from first matching band", () => {
    const bands = parseDeliveryFeeBands([
      { maxDistanceMeters: 3000, amountPaise: 2500 },
      { maxDistanceMeters: 9000, amountPaise: 6000 },
    ]);
    expect(resolveDeliveryFeeFromBands(2500, bands)).toBe(BigInt(2500));
    expect(resolveDeliveryFeeFromBands(8000, bands)).toBe(BigInt(6000));
    expect(resolveDeliveryFeeFromBands(10000, bands)).toBeNull();
  });
});
