import { describe, expect, it } from "vitest";

import { shouldOfferWelcome, welcomeUrlWithReturn } from "@/lib/customer-commerce/welcome-flow";

describe("welcome-flow", () => {
  it("offers welcome when there is no return path", () => {
    expect(shouldOfferWelcome(null)).toBe(true);
  });

  it("skips welcome for commerce checkout, cart, and payment paths", () => {
    expect(shouldOfferWelcome("/order/checkout/")).toBe(false);
    expect(shouldOfferWelcome("/order/cart/")).toBe(false);
    expect(shouldOfferWelcome("/order/payment/?checkoutId=abc")).toBe(false);
  });

  it("offers welcome for menu and account paths", () => {
    expect(shouldOfferWelcome("/order/")).toBe(true);
    expect(shouldOfferWelcome("/account/profile/")).toBe(true);
  });

  it("builds welcome URL with normalized returnTo", () => {
    expect(welcomeUrlWithReturn("/order/")).toBe("/account/welcome/?returnTo=%2Forder%2F");
    expect(welcomeUrlWithReturn(null)).toBe("/account/welcome/");
  });
});
