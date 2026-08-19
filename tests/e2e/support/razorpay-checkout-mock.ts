import type { Page } from "@playwright/test";

export type RazorpayE2EMode = "succeed" | "fail" | "dismiss" | "retry" | "unavailable";

/**
 * E2E-only Razorpay Checkout.js stand-in. Never used in production.
 * Blocks the real CDN so tests do not call Razorpay.
 */
export async function installRazorpayCheckoutMock(
  page: Page,
  mode: RazorpayE2EMode = "succeed",
): Promise<void> {
  await page.addInitScript((nextMode: RazorpayE2EMode) => {
    const state = {
      mode: nextMode,
      opened: [] as string[],
      openCount: 0,
    };
    (
      window as unknown as { __BOBA_E2E_RAZORPAY?: typeof state }
    ).__BOBA_E2E_RAZORPAY = state;
    if (nextMode === "unavailable") return;

    class FakeRazorpay {
      options: Record<string, unknown>;
      failHandler: ((response: unknown) => void) | null = null;
      constructor(options: Record<string, unknown>) {
        this.options = options;
      }
      on(event: string, handler: (response: unknown) => void) {
        if (event === "payment.failed") this.failHandler = handler;
      }
      open() {
        state.openCount += 1;
        state.opened.push(String(this.options.order_id ?? ""));
        const modal = this.options.modal as { ondismiss?: () => void } | undefined;
        const handler = this.options.handler as
          | ((response: Record<string, string>) => void)
          | undefined;
        queueMicrotask(() => {
          if (state.mode === "dismiss") {
            modal?.ondismiss?.();
            return;
          }
          if (state.mode === "fail") {
            this.failHandler?.({ error: { description: "simulated failure" } });
            return;
          }
          const paymentId =
            state.mode === "retry" && state.openCount === 1 ? "pay_e2e_fail" : "pay_e2e_ok";
          handler?.({
            razorpay_payment_id: paymentId,
            razorpay_order_id: String(this.options.order_id ?? ""),
            razorpay_signature: "sig_e2e_fake",
          });
        });
      }
    }
    (window as unknown as { Razorpay?: unknown }).Razorpay = FakeRazorpay;
  }, mode);

  await page.route("https://checkout.razorpay.com/**", async (route) => {
    if (mode === "unavailable") {
      await route.abort();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "/* e2e razorpay checkout stub */",
    });
  });
}
