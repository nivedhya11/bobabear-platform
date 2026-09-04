/**
 * Customer-facing cart-changed checkout recovery copy (IMP-036C).
 * Presentation only — Payment / Checkout domain status remains authoritative.
 */

export type CartChangedRecoveryKind = "unresolved" | "fresh_checkout";

export type CartChangedRecoveryPresentation = Readonly<{
  kind: CartChangedRecoveryKind;
  headline: string;
  body: string;
  primaryActionLabel: string | null;
  primaryTestId: string | null;
  secondaryActionLabel: string | null;
  secondaryTestId: string | null;
  secondaryHref: string | null;
}>;

export const PREVIOUS_CHECKOUT_LOCK_COPY =
  "This checkout is locked while its payment status is being confirmed. Its items and delivery address can't be changed.";

export const PREVIOUS_CHECKOUT_ADDRESS_LOCK_COPY =
  "Delivery details are locked while this payment is being confirmed.";

export function cartChangedRecoveryPresentation(
  kind: CartChangedRecoveryKind,
): CartChangedRecoveryPresentation {
  switch (kind) {
    case "unresolved":
      return Object.freeze({
        kind,
        headline: "Previous payment is being checked",
        body: "We're checking payment for your previous checkout. Your cart has changed since that payment started. Please don't pay again yet.",
        primaryActionLabel: null,
        primaryTestId: null,
        secondaryActionLabel: "View current cart",
        secondaryTestId: "cart-changed-back-to-cart",
        secondaryHref: "/order/cart/",
      });
    case "fresh_checkout":
      return Object.freeze({
        kind,
        headline: "Your cart changed",
        body: "Your previous checkout no longer matches your cart.",
        primaryActionLabel: "Start checkout with current cart",
        primaryTestId: "cart-changed-start-fresh",
        secondaryActionLabel: "Review cart",
        secondaryTestId: "cart-changed-review-cart",
        secondaryHref: "/order/cart/",
      });
  }
}
