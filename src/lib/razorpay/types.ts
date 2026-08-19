/**
 * Minimal Razorpay Checkout.js browser surface actually used by IMP-026B.
 * Not a vendor SDK dump.
 */

export const RAZORPAY_CHECKOUT_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js" as const;

export const RAZORPAY_STANDARD_CHECKOUT_KIND = "razorpay_standard_checkout" as const;

/** Documented origins for a future CSP. Not applied: static export currently has no CSP. */
export const RAZORPAY_CHECKOUT_DOCUMENTED_ORIGINS = Object.freeze({
  scriptSrc: Object.freeze(["https://checkout.razorpay.com"]),
  frameSrc: Object.freeze(["https://api.razorpay.com", "https://checkout.razorpay.com"]),
  connectSrc: Object.freeze([
    "https://api.razorpay.com",
    "https://lumberjack.razorpay.com",
    "https://checkout.razorpay.com",
  ]),
});

export type RazorpayCheckoutHandlerResponse = Readonly<{
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}>;

export type RazorpayCheckoutOptions = Readonly<{
  key: string;
  amount: string | number;
  currency: string;
  order_id: string;
  name?: string;
  description?: string;
  image?: string;
  prefill?: Readonly<{
    name?: string;
    email?: string;
    contact?: string;
  }>;
  retry?: Readonly<{ enabled: boolean }>;
  handler: (response: RazorpayCheckoutHandlerResponse) => void;
  modal?: Readonly<{
    ondismiss?: () => void;
  }>;
}>;

export type RazorpayCheckoutInstance = {
  open: () => void;
  on: (event: "payment.failed", handler: (response: unknown) => void) => void;
  close?: () => void;
};

export type RazorpayConstructor = new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;

export type RazorpayStandardCheckoutAction = Readonly<{
  keyId: string;
  razorpayOrderId: string;
  amountPaise: string;
  currency: string;
  paymentId: string;
  attemptId: string;
}>;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}
