import { describe, expect, it } from "vitest";

import { loginUrlWithReturn, parseSafeReturnPath, withTrailingSlash } from "./return-to";

describe("customer auth return-to", () => {
  it("accepts local ordering return paths", () => {
    expect(parseSafeReturnPath("/order/checkout")).toBe("/order/checkout");
    expect(parseSafeReturnPath("/order/cart")).toBe("/order/cart");
    expect(parseSafeReturnPath("/order")).toBe("/order");
    expect(parseSafeReturnPath("/order/checkout?step=destination")).toBe(
      "/order/checkout?step=destination",
    );
    expect(loginUrlWithReturn("/order/checkout")).toBe(
      "/login?returnTo=%2Forder%2Fcheckout%2F",
    );
    expect(withTrailingSlash("/order/checkout")).toBe("/order/checkout/");
    expect(withTrailingSlash("/order/confirmation?orderId=1")).toBe(
      "/order/confirmation/?orderId=1",
    );
  });

  it("rejects unsafe return destinations", () => {
    expect(parseSafeReturnPath("https://evil.example/phish")).toBeNull();
    expect(parseSafeReturnPath("//evil.example/phish")).toBeNull();
    expect(parseSafeReturnPath("/\\evil.example")).toBeNull();
    expect(parseSafeReturnPath("javascript:alert(1)")).toBeNull();
    expect(parseSafeReturnPath("")).toBeNull();
    expect(parseSafeReturnPath(null)).toBeNull();
  });
});
