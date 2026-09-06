import { describe, expect, it } from "vitest";

import { parseOperatorRefundAmountInrToPaise } from "./refund-amount";

describe("parseOperatorRefundAmountInrToPaise", () => {
  it("converts decimal INR strings to exact paise without floating point", () => {
    expect(parseOperatorRefundAmountInrToPaise("500")).toEqual({
      ok: true,
      amountPaise: "50000",
    });
    expect(parseOperatorRefundAmountInrToPaise("500.00")).toEqual({
      ok: true,
      amountPaise: "50000",
    });
    expect(parseOperatorRefundAmountInrToPaise("500.5")).toEqual({
      ok: true,
      amountPaise: "50050",
    });
    expect(parseOperatorRefundAmountInrToPaise("0.50")).toEqual({
      ok: true,
      amountPaise: "50",
    });
    expect(parseOperatorRefundAmountInrToPaise("0.01")).toEqual({
      ok: true,
      amountPaise: "1",
    });
  });

  it("rejects malformed, zero, and negative values", () => {
    expect(parseOperatorRefundAmountInrToPaise("1.001")).toEqual({
      ok: false,
      reason: "malformed",
    });
    expect(parseOperatorRefundAmountInrToPaise("-1")).toEqual({
      ok: false,
      reason: "malformed",
    });
    expect(parseOperatorRefundAmountInrToPaise("0")).toEqual({
      ok: false,
      reason: "non_positive",
    });
    expect(parseOperatorRefundAmountInrToPaise("abc")).toEqual({
      ok: false,
      reason: "malformed",
    });
  });
});
