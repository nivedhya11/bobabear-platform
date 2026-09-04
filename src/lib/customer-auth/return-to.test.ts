import { describe, expect, it } from "vitest";

import {
  loginUrlWithReturn,
  parseSafeReturnPath,
  resolveCustomerPostAuthHref,
  signInHrefForPath,
  withTrailingSlash,
} from "./return-to";

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

  it("resolves post-auth destination to returnTo or /order/", () => {
    expect(resolveCustomerPostAuthHref("/order/cart/")).toBe("/order/cart/");
    expect(resolveCustomerPostAuthHref("/order/checkout")).toBe("/order/checkout/");
    expect(resolveCustomerPostAuthHref(null)).toBe("/order/");
    expect(resolveCustomerPostAuthHref("https://evil.example/phish")).toBe("/order/");
    expect(resolveCustomerPostAuthHref("//evil.example")).toBe("/order/");
    expect(resolveCustomerPostAuthHref("/login/")).toBe("/order/");
    expect(resolveCustomerPostAuthHref("/login")).toBe("/order/");
  });

  it("builds Nav Sign In href with returnTo for customer commerce routes", () => {
    expect(signInHrefForPath("/order/")).toBe("/login?returnTo=%2Forder%2F");
    expect(signInHrefForPath("/order/cart/")).toBe("/login?returnTo=%2Forder%2Fcart%2F");
    expect(signInHrefForPath("/order/checkout/")).toBe(
      "/login?returnTo=%2Forder%2Fcheckout%2F",
    );
    expect(signInHrefForPath("/account/profile/")).toBe(
      "/login?returnTo=%2Faccount%2Fprofile%2F",
    );
    expect(signInHrefForPath("/")).toBe("/login/");
    expect(signInHrefForPath("/login/")).toBe("/login/");
    expect(signInHrefForPath("/privacy/")).toBe("/login/");
  });
});
