/**
 * Unit-level money and tax allocation tests (IMP-015).
 * Exact integer arithmetic — no floating point.
 */
import { describe, expect, it } from "vitest";

import {
  MoneyParseError,
  parseRupeeToPaise,
  roundHalfUpDivide,
  taxExclusivePaise,
  taxInclusiveSplit,
} from "../../src/shared/pricing";
import { allocateLargestRemainder } from "../../src/server/pricing/tax";

describe("parseRupeeToPaise", () => {
  it("parses integers and two-decimal strings exactly", () => {
    expect(parseRupeeToPaise(179)).toBe(BigInt(17900));
    expect(parseRupeeToPaise(179.5)).toBe(BigInt(17950));
    expect(parseRupeeToPaise("179.50")).toBe(BigInt(17950));
    expect(parseRupeeToPaise("0.50")).toBe(BigInt(50));
    expect(parseRupeeToPaise(0)).toBe(BigInt(0));
  });

  it("rejects more than two decimal places", () => {
    expect(() => parseRupeeToPaise("179.501")).toThrow(MoneyParseError);
  });
});

describe("tax exclusive / inclusive", () => {
  it("computes 5% on ₹179 exclusive exactly", () => {
    expect(taxExclusivePaise(BigInt(17900), 500)).toBe(BigInt(895));
  });

  it("computes 5% on ₹229 exclusive exactly", () => {
    expect(taxExclusivePaise(BigInt(22900), 500)).toBe(BigInt(1145));
  });

  it("splits inclusive gross without float drift", () => {
    const { taxablePaise, taxPaise } = taxInclusiveSplit(BigInt(18800), 500);
    expect(taxablePaise + taxPaise).toBe(BigInt(18800));
    expect(taxExclusivePaise(taxablePaise, 500)).toBe(taxPaise);
  });

  it("round-half-up divides with residual", () => {
    expect(roundHalfUpDivide(BigInt(5), BigInt(2))).toBe(BigInt(3));
    expect(roundHalfUpDivide(BigInt(4), BigInt(2))).toBe(BigInt(2));
  });
});

describe("largest-remainder allocation", () => {
  it("preserves bucket total with no lost paise", () => {
    const allocated = allocateLargestRemainder(BigInt(10), [BigInt(3), BigInt(3), BigInt(3)]);
    expect(allocated.reduce((a, b) => a + b, BigInt(0))).toBe(BigInt(10));
  });

  it("tie-breaks by earlier index", () => {
    const allocated = allocateLargestRemainder(BigInt(1), [BigInt(1), BigInt(1), BigInt(1)]);
    expect(allocated).toEqual([BigInt(1), BigInt(0), BigInt(0)]);
  });
});
