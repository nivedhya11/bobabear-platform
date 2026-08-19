import { afterEach, describe, expect, it, vi } from "vitest";

import {
  openRazorpayStandardCheckout,
  parseRazorpayStandardCheckoutAction,
  readRazorpayHandlerEvidence,
} from "./standard-checkout";
import type { RazorpayCheckoutOptions, RazorpayCheckoutInstance } from "./types";

const validAction = {
  kind: "razorpay_standard_checkout" as const,
  payload: {
    keyId: "rzp_test_key",
    razorpayOrderId: "order_abc",
    amountPaise: "27195",
    currency: "INR",
    paymentId: "11111111-1111-4111-8111-111111111111",
    attemptId: "22222222-2222-4222-8222-222222222222",
  },
};

afterEach(() => {
  delete window.Razorpay;
  vi.restoreAllMocks();
});

describe("parseRazorpayStandardCheckoutAction", () => {
  it("accepts the IMP-026A browser-safe payload", () => {
    const parsed = parseRazorpayStandardCheckoutAction(validAction);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value).toEqual({
      keyId: "rzp_test_key",
      razorpayOrderId: "order_abc",
      amountPaise: "27195",
      currency: "INR",
      paymentId: "11111111-1111-4111-8111-111111111111",
      attemptId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("rejects malformed, unsupported, and secret-bearing payloads", () => {
    expect(parseRazorpayStandardCheckoutAction(undefined).ok).toBe(false);

    const unsupported = parseRazorpayStandardCheckoutAction({ kind: "redirect", payload: { url: "/" } });
    expect(unsupported.ok).toBe(false);
    if (!unsupported.ok) expect(unsupported.reason).toBe("unsupported");

    const emptyAmount = parseRazorpayStandardCheckoutAction({
      kind: "razorpay_standard_checkout",
      payload: { ...validAction.payload, amountPaise: "" },
    });
    expect(emptyAmount.ok).toBe(false);
    if (!emptyAmount.ok) expect(emptyAmount.reason).toBe("malformed");

    const wrongCurrency = parseRazorpayStandardCheckoutAction({
      kind: "razorpay_standard_checkout",
      payload: { ...validAction.payload, currency: "USD" },
    });
    expect(wrongCurrency.ok).toBe(false);
    if (!wrongCurrency.ok) expect(wrongCurrency.reason).toBe("malformed");

    const keySecret = parseRazorpayStandardCheckoutAction({
      kind: "razorpay_standard_checkout",
      payload: { ...validAction.payload, keySecret: "should-never-appear" },
    });
    expect(keySecret.ok).toBe(false);
    if (!keySecret.ok) expect(keySecret.reason).toBe("secret");

    const webhookSecret = parseRazorpayStandardCheckoutAction({
      kind: "razorpay_standard_checkout",
      payload: { ...validAction.payload, webhookSecret: "should-never-appear" },
    });
    expect(webhookSecret.ok).toBe(false);
    if (!webhookSecret.ok) expect(webhookSecret.reason).toBe("secret");
  });
});

describe("openRazorpayStandardCheckout", () => {
  it("opens Checkout with authoritative fields, retry disabled, and handlers", () => {
    const opened: RazorpayCheckoutOptions[] = [];
    const failHandlers: Array<(response: unknown) => void> = [];
    window.Razorpay = class MockRazorpay implements RazorpayCheckoutInstance {
      constructor(options: RazorpayCheckoutOptions) {
        opened.push(options);
      }
      open() {}
      on(event: "payment.failed", handler: (response: unknown) => void) {
        if (event === "payment.failed") failHandlers.push(handler);
      }
    } as unknown as typeof window.Razorpay;

    const onHandler = vi.fn();
    const onDismiss = vi.fn();
    const onProviderFailure = vi.fn();
    const parsed = parseRazorpayStandardCheckoutAction(validAction);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    openRazorpayStandardCheckout({
      action: parsed.value,
      display: { name: "Boba Bear", image: "/assets/logos/boba-bear-full-logo.svg" },
      prefill: { name: "A", contact: "+919876543210" },
      onHandler,
      onDismiss,
      onProviderFailure,
    });

    expect(opened).toHaveLength(1);
    const options = opened[0]!;
    expect(options.key).toBe("rzp_test_key");
    expect(options.order_id).toBe("order_abc");
    expect(options.amount).toBe("27195");
    expect(options.currency).toBe("INR");
    expect(options.retry).toEqual({ enabled: false });
    expect(typeof options.handler).toBe("function");
    expect(typeof options.modal?.ondismiss).toBe("function");
    expect(failHandlers).toHaveLength(1);

    options.handler({
      razorpay_payment_id: "pay_1",
      razorpay_order_id: "order_abc",
      razorpay_signature: "sig_1",
    });
    expect(onHandler).toHaveBeenCalledWith({
      razorpay_payment_id: "pay_1",
      razorpay_order_id: "order_abc",
      razorpay_signature: "sig_1",
    });
    options.modal?.ondismiss?.();
    expect(onDismiss).toHaveBeenCalledTimes(1);
    failHandlers[0]!({ error: { description: "failed" } });
    expect(onProviderFailure).toHaveBeenCalledTimes(1);
  });

  it("does not invoke handler with incomplete evidence", () => {
    let options: RazorpayCheckoutOptions | undefined;
    window.Razorpay = class MockRazorpay implements RazorpayCheckoutInstance {
      constructor(input: RazorpayCheckoutOptions) {
        options = input;
      }
      open() {}
      on() {}
    } as unknown as typeof window.Razorpay;
    const onHandler = vi.fn();
    const parsed = parseRazorpayStandardCheckoutAction(validAction);
    if (!parsed.ok) return;
    openRazorpayStandardCheckout({
      action: parsed.value,
      onHandler,
      onDismiss: () => undefined,
      onProviderFailure: () => undefined,
    });
    options?.handler({
      razorpay_payment_id: "pay_1",
      razorpay_order_id: "",
      razorpay_signature: "sig",
    } as never);
    expect(onHandler).not.toHaveBeenCalled();
  });
});

describe("readRazorpayHandlerEvidence", () => {
  it("requires the three Razorpay handler fields", () => {
    expect(readRazorpayHandlerEvidence(undefined)).toBeNull();
    expect(
      readRazorpayHandlerEvidence({
        razorpay_payment_id: "pay_1",
        razorpay_order_id: "order_1",
        razorpay_signature: "sig",
      }),
    ).toEqual({
      razorpay_payment_id: "pay_1",
      razorpay_order_id: "order_1",
      razorpay_signature: "sig",
    });
  });
});
