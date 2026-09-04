import { describe, expect, it } from "vitest";

import {
  cartChangedRecoveryPresentation,
  PREVIOUS_CHECKOUT_ADDRESS_LOCK_COPY,
  PREVIOUS_CHECKOUT_LOCK_COPY,
} from "./cart-changed-recovery-presentation";

describe("cartChangedRecoveryPresentation", () => {
  it("returns unresolved copy with no pay/start CTA", () => {
    expect(cartChangedRecoveryPresentation("unresolved")).toEqual({
      kind: "unresolved",
      headline: "Previous payment is being checked",
      body: "We're checking payment for your previous checkout. Your cart has changed since that payment started. Please don't pay again yet.",
      primaryActionLabel: null,
      primaryTestId: null,
      secondaryActionLabel: "View current cart",
      secondaryTestId: "cart-changed-back-to-cart",
      secondaryHref: "/order/cart/",
    });
  });

  it("exposes address and checkout lock copy without technical terms", () => {
    expect(PREVIOUS_CHECKOUT_LOCK_COPY).toContain("locked while its payment status is being confirmed");
    expect(PREVIOUS_CHECKOUT_ADDRESS_LOCK_COPY).toContain(
      "Delivery details are locked while this payment is being confirmed.",
    );
    expect(PREVIOUS_CHECKOUT_LOCK_COPY).not.toMatch(/sourceCartRevision|snapshot|aggregate/i);
    expect(PREVIOUS_CHECKOUT_ADDRESS_LOCK_COPY).not.toMatch(/sourceCartRevision|snapshot|aggregate/i);
  });

  it("returns fresh-checkout copy with review and start actions", () => {
    expect(cartChangedRecoveryPresentation("fresh_checkout")).toEqual({
      kind: "fresh_checkout",
      headline: "Your cart changed",
      body: "Your previous checkout no longer matches your cart.",
      primaryActionLabel: "Start checkout with current cart",
      primaryTestId: "cart-changed-start-fresh",
      secondaryActionLabel: "Review cart",
      secondaryTestId: "cart-changed-review-cart",
      secondaryHref: "/order/cart/",
    });
  });
});
