/**
 * Customer-commerce Payment provider runtime configuration (IMP-026A).
 *
 * Explicit selector. Fake is never a production fallback.
 * Razorpay secrets are server-only and have no insecure defaults.
 */
import "server-only";

import type { AppEnvironment } from "../../platform/config";
import {
  PAYMENT_PROVIDER_SELECTORS,
  type PaymentProviderSelector,
} from "../../platform/config/schema";
import type { CustomerCommerceEnvSource } from "./config";
import { CustomerCommerceConfigurationError } from "./errors";

export type RazorpayRuntimeSecrets = Readonly<{
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}>;

export type CustomerCommercePaymentConfig =
  | Readonly<{ selector: "disabled" }>
  | Readonly<{ selector: "razorpay"; razorpay: RazorpayRuntimeSecrets }>;

function requireSecret(
  key: string,
  raw: string | undefined,
  issues: Array<{ key: string; message: string }>,
): string | null {
  if (raw === undefined || raw.length === 0) {
    issues.push({
      key,
      message: "Required when BOBA_BEAR_PAYMENT_PROVIDER=razorpay.",
    });
    return null;
  }
  if (raw.trim() !== raw || /\s/.test(raw)) {
    issues.push({
      key,
      message: "Must not contain surrounding or internal whitespace.",
    });
    return null;
  }
  if (raw.length < 8) {
    issues.push({
      key,
      message: "Must be at least 8 characters.",
    });
    return null;
  }
  return raw;
}

export function loadCustomerCommercePaymentConfig(
  source: CustomerCommerceEnvSource,
  environmentType: AppEnvironment,
): CustomerCommercePaymentConfig {
  void environmentType;
  const rawSelector = source.BOBA_BEAR_PAYMENT_PROVIDER;
  const selector: PaymentProviderSelector =
    rawSelector === undefined || rawSelector.length === 0
      ? "disabled"
      : (rawSelector as PaymentProviderSelector);

  if (!(PAYMENT_PROVIDER_SELECTORS as readonly string[]).includes(selector)) {
    throw new CustomerCommerceConfigurationError([
      {
        key: "BOBA_BEAR_PAYMENT_PROVIDER",
        message: 'Must be exactly "disabled" or "razorpay". Fake is never a production selector.',
      },
    ]);
  }

  if (selector === "disabled") {
    return Object.freeze({ selector: "disabled" });
  }

  const issues: Array<{ key: string; message: string }> = [];
  const keyId = requireSecret(
    "BOBA_BEAR_RAZORPAY_KEY_ID",
    source.BOBA_BEAR_RAZORPAY_KEY_ID,
    issues,
  );
  const keySecret = requireSecret(
    "BOBA_BEAR_RAZORPAY_KEY_SECRET",
    source.BOBA_BEAR_RAZORPAY_KEY_SECRET,
    issues,
  );
  const webhookSecret = requireSecret(
    "BOBA_BEAR_RAZORPAY_WEBHOOK_SECRET",
    source.BOBA_BEAR_RAZORPAY_WEBHOOK_SECRET,
    issues,
  );

  if (issues.length > 0) {
    throw new CustomerCommerceConfigurationError(issues);
  }

  return Object.freeze({
    selector: "razorpay",
    razorpay: Object.freeze({
      keyId: keyId!,
      keySecret: keySecret!,
      webhookSecret: webhookSecret!,
    }),
  });
}
