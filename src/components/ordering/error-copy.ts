/**
 * Customer-facing copy for accepted commerce/auth error codes.
 * Does not invent backend codes.
 */

const COPY: Readonly<Record<string, string>> = Object.freeze({
  CUSTOMER_AUTH_REQUIRED: "Sign in to continue checkout.",
  CART_NOT_FOUND: "We couldn't find that cart. Add an item to start again.",
  CART_EXPIRED: "Your guest cart expired. Add your items again.",
  CART_CONFLICT: "Your cart changed. Refresh and try again.",
  CART_LINE_NOT_FOUND: "That item is no longer in your cart.",
  CART_INVALID_INPUT: "That cart update wasn't valid. Try again.",
  CART_ITEM_NOT_ORDERABLE: "That item can't be ordered right now.",
  CART_RECONCILIATION_CONFLICT: "Choose which cart to keep before continuing.",
  CART_DEPENDENCY_UNAVAILABLE: "Ordering is temporarily unavailable. Try again shortly.",
  CHECKOUT_NOT_FOUND: "We couldn't find that checkout.",
  CHECKOUT_CONFLICT: "Checkout changed. Refresh and try again.",
  CHECKOUT_EXPIRED: "Checkout expired. Start checkout again.",
  CHECKOUT_STATE_CONFLICT: "Checkout isn't in a state that can continue.",
  CHECKOUT_CART_CHANGED: "Your cart changed. Review it and start checkout again.",
  CHECKOUT_DESTINATION_REQUIRED: "Add a delivery address to continue.",
  CHECKOUT_EMPTY_CART: "Your cart is empty.",
  CHECKOUT_NOT_SERVICEABLE: "We don't deliver to that address yet.",
  CHECKOUT_SERVICEABILITY_TEMPORARILY_UNAVAILABLE:
    "Delivery availability is temporarily unavailable. Try again shortly.",
  CHECKOUT_SERVICEABILITY_INDETERMINATE:
    "We couldn't confirm delivery for that address. Try again shortly.",
  CHECKOUT_INVALID_INPUT: "That checkout update wasn't valid. Try again.",
  CUSTOMER_ADDRESS_INPUT_INVALID: "Check the address details and try again.",
  CUSTOMER_ADDRESS_RECIPIENT_NAME_INVALID: "Enter a valid recipient name.",
  CUSTOMER_ADDRESS_RECIPIENT_PHONE_INVALID: "Enter a valid Indian mobile number.",
  CUSTOMER_ADDRESS_LINE1_REQUIRED: "Address line 1 is required.",
  CUSTOMER_ADDRESS_CITY_INVALID: "Enter a valid city.",
  CUSTOMER_ADDRESS_STATE_CODE_INVALID: "Choose a valid state.",
  CUSTOMER_ADDRESS_POSTAL_CODE_INVALID: "Enter a valid 6-digit PIN code.",
  PAYMENT_NOT_FOUND: "We couldn't find that payment.",
  PAYMENT_EXPIRED: "Payment expired. Start checkout again.",
  PAYMENT_TERMINAL: "This payment can no longer continue.",
  PAYMENT_ALREADY_PROCESSING: "Payment is already in progress.",
  PAYMENT_IDEMPOTENCY_CONFLICT: "That payment request conflicted. Try again.",
  PAYMENT_STATE_CONFLICT: "Payment already started for this checkout.",
  PAYMENT_CONFLICT: "Checkout changed. Refresh and try again.",
  PAYMENT_CHECKOUT_NOT_READY: "Checkout isn't ready for payment yet.",
  PAYMENT_ZERO_PAYABLE_INVALID: "This checkout still requires payment.",
  PAYMENT_NEGATIVE_PAYABLE: "This checkout total isn't valid for payment.",
  PAYMENT_INVALID_INPUT: "That payment request wasn't valid. Try again.",
  PAYMENT_UNSUPPORTED_METHOD: "That payment method isn't supported.",
  PAYMENT_PROVIDER_EVIDENCE_INVALID: "Payment confirmation could not be verified. Checking status…",
  PAYMENT_PROVIDER_INDETERMINATE:
    "We're still checking your payment. Don't pay again yet.",
  ORDER_NOT_FOUND: "We couldn't find that order.",
  ORDER_INVALID_INPUT: "That order request wasn't valid. Try again.",
  NETWORK_ERROR: "Network problem. Check your connection and try again.",
  INVALID_RESPONSE: "Something went wrong. Please try again.",
});

export function commerceErrorCopy(code: string | undefined): string {
  if (!code) return COPY.INVALID_RESPONSE!;
  return COPY[code] ?? "Something went wrong. Please try again.";
}
