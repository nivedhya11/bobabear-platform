import { describe, expect, it } from "vitest";

import { CustomerCommerceConfigurationError } from "../../src/server/customer-commerce/errors";
import { loadCustomerCommercePaymentConfig } from "../../src/server/customer-commerce/payment-config";

describe("loadCustomerCommercePaymentConfig", () => {
  it("defaults omitted selector to disabled", () => {
    expect(loadCustomerCommercePaymentConfig({}, "local")).toEqual({ selector: "disabled" });
  });

  it("accepts explicit disabled", () => {
    expect(
      loadCustomerCommercePaymentConfig({ BOBA_BEAR_PAYMENT_PROVIDER: "disabled" }, "production"),
    ).toEqual({ selector: "disabled" });
  });

  it("rejects fake selector in every environment", () => {
    expect(() =>
      loadCustomerCommercePaymentConfig({ BOBA_BEAR_PAYMENT_PROVIDER: "fake" }, "production"),
    ).toThrow(CustomerCommerceConfigurationError);
  });

  it("fails closed when razorpay is selected without secrets", () => {
    expect(() =>
      loadCustomerCommercePaymentConfig(
        { BOBA_BEAR_PAYMENT_PROVIDER: "razorpay" },
        "production",
      ),
    ).toThrow(CustomerCommerceConfigurationError);
  });

  it("loads razorpay secrets when complete", () => {
    const config = loadCustomerCommercePaymentConfig(
      {
        BOBA_BEAR_PAYMENT_PROVIDER: "razorpay",
        BOBA_BEAR_RAZORPAY_KEY_ID: "rzp_test_key_id_xx",
        BOBA_BEAR_RAZORPAY_KEY_SECRET: "test_only_key_secret",
        BOBA_BEAR_RAZORPAY_WEBHOOK_SECRET: "test_only_webhook_secret",
      },
      "staging",
    );
    expect(config).toEqual({
      selector: "razorpay",
      razorpay: {
        keyId: "rzp_test_key_id_xx",
        keySecret: "test_only_key_secret",
        webhookSecret: "test_only_webhook_secret",
      },
    });
  });
});
