/**
 * Customer-facing payment recovery copy for Checkout Payment (IMP-036C).
 * Presentation only — Payment-domain status remains authoritative.
 */

export type PaymentRecoveryKind = "failed" | "dismissed" | "unresolved";

export type PaymentRecoveryPresentation = Readonly<{
  kind: PaymentRecoveryKind;
  headline: string;
  body: string;
  primaryActionLabel: string | null;
  primaryTestId: string | null;
  secondaryActionLabel: string | null;
  secondaryTestId: string | null;
}>;

export function paymentRecoveryPresentation(
  kind: PaymentRecoveryKind,
  payableLabel: string,
): PaymentRecoveryPresentation {
  switch (kind) {
    case "failed":
      return Object.freeze({
        kind,
        headline: "Payment unsuccessful",
        body: "Your payment wasn't completed. No order has been placed.",
        primaryActionLabel: `Try payment again · ${payableLabel}`,
        primaryTestId: "payment-retry",
        secondaryActionLabel: "Start a new order",
        secondaryTestId: "payment-start-new-order",
      });
    case "dismissed":
      return Object.freeze({
        kind,
        headline: "Payment not completed",
        body: "You closed the payment window before completing payment.",
        primaryActionLabel: `Continue payment · ${payableLabel}`,
        primaryTestId: "payment-continue",
        secondaryActionLabel: null,
        secondaryTestId: null,
      });
    case "unresolved":
      return Object.freeze({
        kind,
        headline: "Checking your payment",
        body: "We're confirming the payment status. Please don't pay again yet.",
        primaryActionLabel: null,
        primaryTestId: null,
        secondaryActionLabel: null,
        secondaryTestId: null,
      });
  }
}
