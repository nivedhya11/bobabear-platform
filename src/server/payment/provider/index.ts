/**
 * Payment provider boundary (IMP-022).
 */

import { PaymentError } from "../../../shared/payment";
import {
  createFakePaymentProvider,
  FAKE_PAYMENT_SIGNATURE_HEADER,
  FAKE_PAYMENT_WEBHOOK_SECRET,
  type FakePaymentOutcome,
  type FakePaymentProvider,
  type FakeRefundOutcome,
} from "./fake";
import type {
  PaymentProvider,
  PaymentProviderCancelExecutionInput,
  PaymentProviderCreateExecutionInput,
  PaymentProviderCreateRefundInput,
  PaymentProviderQueryExecutionInput,
  PaymentProviderQueryRefundInput,
  PaymentProviderVerifyClientEvidenceInput,
  PaymentProviderVerifyWebhookInput,
} from "./types";

export type {
  PaymentProvider,
  PaymentProviderCancelExecutionInput,
  PaymentProviderCreateExecutionInput,
  PaymentProviderCreateRefundInput,
  PaymentProviderQueryExecutionInput,
  PaymentProviderQueryRefundInput,
  PaymentProviderVerifyClientEvidenceInput,
  PaymentProviderVerifyWebhookInput,
  PaymentProviderWebhookEvidence,
} from "./types";

export {
  createFakePaymentProvider,
  FAKE_PAYMENT_SIGNATURE_HEADER,
  FAKE_PAYMENT_WEBHOOK_SECRET,
  type FakePaymentOutcome,
  type FakePaymentProvider,
  type FakeRefundOutcome,
};

export {
  createRazorpayPaymentProvider,
  razorpayReceiptFromExecutionIdentity,
  type RazorpayProviderConfig,
} from "./razorpay";

/**
 * Default provider when callers omit `options.provider`.
 * Always fails closed — tests must inject the fake provider.
 */
export const disabledPaymentProvider: PaymentProvider = Object.freeze({
  name: "disabled",

  async createExecution(
    _input: PaymentProviderCreateExecutionInput,
  ): Promise<never> {
    throw new PaymentError(
      "PAYMENT_PROVIDER_INDETERMINATE",
      "Payment provider is disabled; inject a test or configured provider.",
    );
  },

  async queryExecution(
    _input: PaymentProviderQueryExecutionInput,
  ): Promise<never> {
    throw new PaymentError(
      "PAYMENT_PROVIDER_INDETERMINATE",
      "Payment provider is disabled; inject a test or configured provider.",
    );
  },

  async cancelExecution(
    _input: PaymentProviderCancelExecutionInput,
  ): Promise<never> {
    throw new PaymentError(
      "PAYMENT_PROVIDER_INDETERMINATE",
      "Payment provider is disabled; inject a test or configured provider.",
    );
  },

  async verifyWebhook(
    _input: PaymentProviderVerifyWebhookInput,
  ): Promise<never> {
    throw new PaymentError(
      "PAYMENT_PROVIDER_INDETERMINATE",
      "Payment provider is disabled; inject a test or configured provider.",
    );
  },

  async verifyClientEvidence(
    _input: PaymentProviderVerifyClientEvidenceInput,
  ): Promise<never> {
    throw new PaymentError(
      "PAYMENT_PROVIDER_INDETERMINATE",
      "Payment provider is disabled; inject a test or configured provider.",
    );
  },

  async createRefund(
    _input: PaymentProviderCreateRefundInput,
  ): Promise<never> {
    throw new PaymentError(
      "PAYMENT_PROVIDER_INDETERMINATE",
      "Refund provider is disabled; inject a test or configured provider.",
    );
  },

  async queryRefund(
    _input: PaymentProviderQueryRefundInput,
  ): Promise<never> {
    throw new PaymentError(
      "PAYMENT_PROVIDER_INDETERMINATE",
      "Refund provider is disabled; inject a test or configured provider.",
    );
  },
});
