import { describe, expect, it } from "vitest";

import { paymentRecoveryPresentation } from "./payment-recovery-presentation";

describe("paymentRecoveryPresentation", () => {
  it("returns authoritative failure copy with retry CTA", () => {
    expect(paymentRecoveryPresentation("failed", "₹847.00")).toEqual({
      kind: "failed",
      headline: "Payment unsuccessful",
      body: "Your payment wasn't completed. No order has been placed.",
      primaryActionLabel: "Try payment again · ₹847.00",
      primaryTestId: "payment-retry",
    });
  });

  it("returns dismissed copy with continue CTA", () => {
    expect(paymentRecoveryPresentation("dismissed", "₹847.00")).toEqual({
      kind: "dismissed",
      headline: "Payment not completed",
      body: "You closed the payment window before completing payment.",
      primaryActionLabel: "Continue payment · ₹847.00",
      primaryTestId: "payment-continue",
    });
  });

  it("returns unresolved copy with no primary CTA", () => {
    expect(paymentRecoveryPresentation("unresolved", "₹847.00")).toEqual({
      kind: "unresolved",
      headline: "Checking your payment",
      body: "We're confirming the payment status. Please don't pay again yet.",
      primaryActionLabel: null,
      primaryTestId: null,
    });
  });
});
