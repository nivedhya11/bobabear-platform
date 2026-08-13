import { describe, expect, it } from "vitest";

import { isZeroPayableTotal, redirectUrlFromClientAction } from "./client-action";

describe("provider-neutral clientAction", () => {
  it("extracts redirect URLs from the accepted payload shape", () => {
    expect(
      redirectUrlFromClientAction({
        kind: "redirect",
        payload: { url: "https://fake-payments.test/pay/abc" },
      }),
    ).toBe("https://fake-payments.test/pay/abc");
    expect(
      redirectUrlFromClientAction({
        kind: "REDIRECT",
        payload: { url: "/order/payment?paymentId=1" },
      }),
    ).toBe("/order/payment?paymentId=1");
  });

  it("ignores unknown kinds and empty URLs", () => {
    expect(redirectUrlFromClientAction({ kind: "sdk", payload: { token: "x" } })).toBeNull();
    expect(redirectUrlFromClientAction({ kind: "redirect", payload: { url: "  " } })).toBeNull();
    expect(redirectUrlFromClientAction(undefined)).toBeNull();
  });

  it("detects zero-payable totals from snapshot paise strings", () => {
    expect(isZeroPayableTotal("0")).toBe(true);
    expect(isZeroPayableTotal("27195")).toBe(false);
  });
});
