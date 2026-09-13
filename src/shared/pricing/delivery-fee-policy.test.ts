import { describe, expect, it } from "vitest";

import {
  parseDeliveryFeeBands,
  resolveDeliveryFeeFromBands,
  validateDeliveryFeeBands,
  validateFreeDeliveryThresholdPaise,
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

describe("delivery fee policy validation (IMP-036F F5)", () => {
  it("accepts strictly increasing integer bands", () => {
    const result = validateDeliveryFeeBands([
      { maxDistanceMeters: 3000, amountPaise: 2500 },
      { maxDistanceMeters: 9000, amountPaise: 6000 },
    ]);
    expect(result.ok).toBe(true);
  });

  it("rejects overlapping or unordered distances", () => {
    const result = validateDeliveryFeeBands([
      { maxDistanceMeters: 9000, amountPaise: 6000 },
      { maxDistanceMeters: 3000, amountPaise: 2500 },
    ]);
    expect(result.ok).toBe(false);
  });

  it("rejects non-integer distances and negative fees", () => {
    expect(validateDeliveryFeeBands([{ maxDistanceMeters: 10.5, amountPaise: 1 }]).ok).toBe(false);
    expect(validateDeliveryFeeBands([{ maxDistanceMeters: 1000, amountPaise: -1 }]).ok).toBe(false);
  });

  it("accepts null, zero, and positive free-delivery thresholds", () => {
    expect(validateFreeDeliveryThresholdPaise(null)).toEqual({ ok: true, thresholdPaise: null });
    expect(validateFreeDeliveryThresholdPaise(0)).toEqual({ ok: true, thresholdPaise: BigInt(0) });
    expect(validateFreeDeliveryThresholdPaise("50000")).toEqual({
      ok: true,
      thresholdPaise: BigInt(50_000),
    });
  });

  it("rejects invalid free-delivery amounts", () => {
    expect(validateFreeDeliveryThresholdPaise(-1).ok).toBe(false);
    expect(validateFreeDeliveryThresholdPaise("01").ok).toBe(false);
  });
});
