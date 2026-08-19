/**
 * Production Payment provider composition for customer-commerce (IMP-026A).
 *
 * Fake provider is never a production fallback.
 */
import "server-only";

import { disabledPaymentProvider, type PaymentProvider } from "../payment/provider";
import { createRazorpayPaymentProvider } from "../payment/provider/razorpay";
import type { CustomerCommercePaymentConfig } from "./payment-config";

export type ComposedCustomerCommercePayment = Readonly<{
  provider: PaymentProvider;
  enableInboxProcessor: boolean;
}>;

export function composeCustomerCommercePayment(
  config: CustomerCommercePaymentConfig,
): ComposedCustomerCommercePayment {
  if (config.selector === "razorpay") {
    return Object.freeze({
      provider: createRazorpayPaymentProvider({
        keyId: config.razorpay.keyId,
        keySecret: config.razorpay.keySecret,
        webhookSecret: config.razorpay.webhookSecret,
      }),
      enableInboxProcessor: true,
    });
  }
  return Object.freeze({
    provider: disabledPaymentProvider,
    enableInboxProcessor: false,
  });
}
