import { describe, expect, it } from "vitest";

import {
  formatInrFromPaise,
  parseInrToPaise,
} from "../../src/lib/administration/commercial-money";

describe("formatInrFromPaise", () => {
  it("formats integer paise without float math", () => {
    expect(formatInrFromPaise(0)).toBe("₹0.00");
    expect(formatInrFromPaise(1)).toBe("₹0.01");
    expect(formatInrFromPaise(100)).toBe("₹1.00");
    expect(formatInrFromPaise("199")).toBe("₹1.99");
    expect(formatInrFromPaise(BigInt(10_050))).toBe("₹100.50");
    expect(formatInrFromPaise(-250)).toBe("-₹2.50");
  });

  it("returns em dash for nullish or invalid input", () => {
    expect(formatInrFromPaise(null)).toBe("—");
    expect(formatInrFromPaise(undefined)).toBe("—");
    expect(formatInrFromPaise("")).toBe("—");
    expect(formatInrFromPaise("12.3")).toBe("—");
    expect(formatInrFromPaise("not-a-number")).toBe("—");
  });
});

describe("parseInrToPaise", () => {
  it("parses INR rupee strings to integer paise strings", () => {
    expect(parseInrToPaise("0")).toBe("0");
    expect(parseInrToPaise("1")).toBe("100");
    expect(parseInrToPaise("1.5")).toBe("150");
    expect(parseInrToPaise("1.50")).toBe("150");
    expect(parseInrToPaise("₹40.00")).toBe("4000");
    expect(parseInrToPaise("1,234.56")).toBe("123456");
    expect(parseInrToPaise("-2.05")).toBe("-205");
  });

  it("rejects invalid inputs without float coercion", () => {
    expect(parseInrToPaise("")).toBeNull();
    expect(parseInrToPaise("   ")).toBeNull();
    expect(parseInrToPaise("1.234")).toBeNull();
    expect(parseInrToPaise("abc")).toBeNull();
    expect(parseInrToPaise("1.2.3")).toBeNull();
    expect(parseInrToPaise("₹")).toBeNull();
  });
});
