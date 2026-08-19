import { afterEach, describe, expect, it, vi } from "vitest";

import {
  RAZORPAY_CHECKOUT_DOCUMENTED_ORIGINS,
  RAZORPAY_CHECKOUT_SCRIPT_URL,
} from "./types";
import { loadRazorpayCheckoutScript, resetRazorpayCheckoutScriptForTests } from "./checkout-script";

afterEach(() => {
  resetRazorpayCheckoutScriptForTests();
  document.querySelectorAll("script[data-boba-razorpay-checkout]").forEach((node) => node.remove());
  document
    .querySelectorAll(`script[src="${RAZORPAY_CHECKOUT_SCRIPT_URL}"]`)
    .forEach((node) => node.remove());
  delete window.Razorpay;
  vi.restoreAllMocks();
});

function installMockRazorpay(): void {
  window.Razorpay = class MockRazorpay {
    open() {}
    on() {}
  } as unknown as typeof window.Razorpay;
}

describe("Razorpay Checkout.js loader", () => {
  it("reuses an already-present Razorpay global without injecting a script", async () => {
    installMockRazorpay();
    const ctor = await loadRazorpayCheckoutScript();
    expect(ctor).toBe(window.Razorpay);
    expect(document.querySelectorAll(`script[src="${RAZORPAY_CHECKOUT_SCRIPT_URL}"]`)).toHaveLength(0);
  });

  it("injects the official script once and reuses in-flight load", async () => {
    const appendSpy = vi.spyOn(document.head, "appendChild");
    const first = loadRazorpayCheckoutScript();
    const second = loadRazorpayCheckoutScript();
    const script = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_CHECKOUT_SCRIPT_URL}"]`);
    expect(script).not.toBeNull();
    expect(script?.getAttribute("src")).toBe(RAZORPAY_CHECKOUT_SCRIPT_URL);
    expect(appendSpy.mock.calls.length).toBe(1);
    installMockRazorpay();
    script?.dispatchEvent(new Event("load"));
    await expect(first).resolves.toBe(window.Razorpay);
    await expect(second).resolves.toBe(window.Razorpay);
    expect(document.querySelectorAll(`script[src="${RAZORPAY_CHECKOUT_SCRIPT_URL}"]`)).toHaveLength(1);
  });

  it("rejects when the script fails and allows a later retry", async () => {
    const pending = loadRazorpayCheckoutScript();
    const script = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_CHECKOUT_SCRIPT_URL}"]`);
    script?.dispatchEvent(new Event("error"));
    await expect(pending).rejects.toThrow(/failed to load/i);
    expect(document.querySelector(`script[src="${RAZORPAY_CHECKOUT_SCRIPT_URL}"]`)).toBeNull();

    const retry = loadRazorpayCheckoutScript();
    const retryScript = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_CHECKOUT_SCRIPT_URL}"]`,
    );
    expect(retryScript).not.toBeNull();
    installMockRazorpay();
    retryScript?.dispatchEvent(new Event("load"));
    await expect(retry).resolves.toBe(window.Razorpay);
  });

  it("rejects when the script loads without window.Razorpay", async () => {
    const pending = loadRazorpayCheckoutScript();
    const script = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_CHECKOUT_SCRIPT_URL}"]`);
    script?.dispatchEvent(new Event("load"));
    await expect(pending).rejects.toThrow(/unavailable/i);
  });

  it("uses the official CDN URL and does not expect secrets in script config", () => {
    expect(RAZORPAY_CHECKOUT_SCRIPT_URL).toBe("https://checkout.razorpay.com/v1/checkout.js");
    expect(RAZORPAY_CHECKOUT_SCRIPT_URL).not.toMatch(/secret/i);
    expect(RAZORPAY_CHECKOUT_DOCUMENTED_ORIGINS.scriptSrc).toEqual(["https://checkout.razorpay.com"]);
    expect(RAZORPAY_CHECKOUT_DOCUMENTED_ORIGINS.scriptSrc.join(" ")).not.toContain("*");
  });
});
