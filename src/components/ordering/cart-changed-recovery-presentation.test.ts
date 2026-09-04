import { describe, expect, it } from "vitest";

import { cartChangedRecoveryPresentation } from "./cart-changed-recovery-presentation";

describe("cartChangedRecoveryPresentation", () => {
  it("returns unresolved copy with no pay/start CTA", () => {
    expect(cartChangedRecoveryPresentation("unresolved")).toEqual({
      kind: "unresolved",
      headline: "Checking your previous payment",
      body: "We're confirming the payment status before you can start checkout again. Please don't pay again yet.",
      primaryActionLabel: null,
      primaryTestId: null,
      secondaryActionLabel: "Back to cart",
      secondaryTestId: "cart-changed-back-to-cart",
      secondaryHref: "/order/cart/",
    });
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
