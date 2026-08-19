import { test, expect, type Page } from "@playwright/test";

import { installRazorpayCheckoutMock } from "./support/razorpay-checkout-mock";

/**
 * IMP-025 / IMP-026B E2E: guest menu → cart → auth → claim → destination → checkout →
 * fake Razorpay Standard Checkout → confirmation → history/detail.
 * Run via `npm run test:e2e:customer-ordering` only.
 *
 * Each scenario that sends an OTP uses its own distinct phone number so the
 * per-phone 60-second resend rate limit never leaks between tests sharing
 * one worker (`fullyParallel: false`, `workers: 1` in the dedicated config).
 */

const FIXED_OTP_CODE = process.env.CUSTOMER_OTP_LOCAL_FIXED_CODE;

const PHONE_NUMBERS = {
  success: "9876500251",
  dismiss: "9876500252",
  providerFailure: "9876500253",
  retry: "9876500254",
  scriptLoadFailure: "9876500255",
} as const;

test.beforeEach(() => {
  test.skip(
    !FIXED_OTP_CODE,
    "CUSTOMER_OTP_LOCAL_FIXED_CODE must be set for the customer-ordering E2E suite.",
  );
});

function phoneField(page: Page) {
  return page.getByLabel("Mobile number", { exact: true });
}

function codeField(page: Page) {
  return page.getByLabel("6-digit code", { exact: true });
}

async function reachReadyForPayment(page: Page, phoneNumber: string): Promise<void> {
  await page.goto("/order/");
    await expect(page.getByRole("heading", { name: /^menu$/i })).toBeVisible();
  await expect(page.getByTestId("deliver-to-orientation")).toBeVisible();
  await expect(page.getByTestId("deliver-to-orientation")).toContainText("Dehradun");
  await expect(page.locator("#main-content")).not.toContainText(/serviceable/i);

  const addButtons = page.getByRole("button", { name: /add .* to cart/i });
  await expect(addButtons.first()).toBeVisible();
  await addButtons.first().click();
  await expect(page.getByRole("link", { name: /cart, 1 item/i })).toBeVisible({ timeout: 15_000 });

  await page.getByRole("link", { name: /cart/i }).first().click();
  await expect(page.getByRole("heading", { name: /your cart/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /checkout/i })).toBeVisible();
  await page.getByRole("button", { name: /checkout/i }).click();

  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
  await phoneField(page).fill(phoneNumber);
  await page.getByRole("button", { name: /send code/i }).click();
  await expect(codeField(page)).toBeVisible();
  await codeField(page).fill(FIXED_OTP_CODE!);
  await page.getByRole("button", { name: /verify code/i }).click();

  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible({ timeout: 20_000 });
  const checkout = page.locator("#main-content");
  await checkout.getByLabel("Recipient name", { exact: true }).fill("E2E Guest");
  await checkout.getByLabel("Mobile number", { exact: true }).fill(`+91${phoneNumber}`);
  await checkout.getByLabel("Address line 1", { exact: true }).fill("12 Mall Road");
  await checkout.getByLabel("City", { exact: true }).fill("Dehradun");
  await checkout.getByRole("combobox", { name: /^State$/i }).selectOption({ label: "Uttarakhand" });
  await checkout.getByLabel("PIN code", { exact: true }).fill("248001");
  await checkout.getByRole("button", { name: /evaluate checkout/i }).click();

  await expect(page.getByTestId("checkout-ready")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/ready for payment/i)).toBeVisible();
  await expect(page.getByText(/total payable/i)).toBeVisible();
  await expect(page.getByTestId("payment-start")).toBeVisible();
}

test("guest can complete owned ordering through Razorpay Standard Checkout and order history", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await installRazorpayCheckoutMock(page, "succeed");
  await reachReadyForPayment(page, PHONE_NUMBERS.success);
  await page.getByTestId("payment-start").click();

  await expect(page.getByTestId("order-confirmation")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("order-status")).toHaveText(/order received/i);
  await page.getByRole("link", { name: /order history/i }).click();
  await expect(page.getByTestId("orders-list")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("link", { name: /ORD-/i }).first().click();
  await expect(page.getByTestId("order-detail")).toBeVisible();
  await expect(page.getByTestId("order-status")).toHaveText(/order received/i);
  await expect(page.getByTestId("order-support")).toBeVisible();
  await expect(page.getByText("E2E Guest", { exact: true })).toBeVisible();
  await expect(page.getByText("12 Mall Road", { exact: true })).toBeVisible();
});

function paymentProductAlert(page: Page) {
  // Scope to product main content so Next.js #__next-route-announcer__ is not matched.
  return page.locator("#main-content").getByRole("alert");
}

function isPaymentStartOrRetryPost(url: string): boolean {
  try {
    const pathname = new URL(url).pathname;
    return (
      pathname === "/api/v1/payments" || /^\/api\/v1\/payments\/[^/]+\/retry$/.test(pathname)
    );
  } catch {
    return false;
  }
}

async function razorpayOrderIdFromClientActionResponse(
  response: Awaited<ReturnType<Page["waitForResponse"]>>,
): Promise<string> {
  const body = (await response.json()) as {
    clientAction?: { kind?: string; payload?: { razorpayOrderId?: string } };
  };
  const orderId = body.clientAction?.payload?.razorpayOrderId;
  expect(body.clientAction?.kind).toBe("razorpay_standard_checkout");
  expect(typeof orderId).toBe("string");
  expect(orderId!.length).toBeGreaterThan(0);
  return orderId!;
}

test("Razorpay modal dismiss does not create an Order", async ({ page }) => {
  test.setTimeout(180_000);
  await installRazorpayCheckoutMock(page, "dismiss");
  await reachReadyForPayment(page, PHONE_NUMBERS.dismiss);
  await page.getByTestId("payment-start").click();
  await expect(paymentProductAlert(page)).toContainText(/Payment window closed\. Not confirmed\./i, {
    timeout: 20_000,
  });
  await expect(page.getByTestId("payment-start")).toBeVisible();
  await expect(page.getByTestId("order-confirmation")).toHaveCount(0);
});

test("Razorpay provider-surface failure does not create an Order", async ({ page }) => {
  test.setTimeout(180_000);
  await installRazorpayCheckoutMock(page, "fail");
  await reachReadyForPayment(page, PHONE_NUMBERS.providerFailure);
  await page.getByTestId("payment-start").click();
  await expect(paymentProductAlert(page)).toContainText(
    /That payment attempt did not complete\./i,
    { timeout: 20_000 },
  );
  await expect(page.getByTestId("order-confirmation")).toHaveCount(0);
});

test("BOBA retry after fake captured-failure uses a new Razorpay Order", async ({ page }) => {
  test.setTimeout(180_000);
  await installRazorpayCheckoutMock(page, "retry");
  await reachReadyForPayment(page, PHONE_NUMBERS.retry);

  // Capture provider Order IDs from authoritative clientAction responses in the
  // test process — page-local Razorpay mock state is destroyed by confirmation navigation.
  const firstStartResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      isPaymentStartOrRetryPost(response.url()) &&
      response.ok(),
  );
  await page.getByTestId("payment-start").click();
  const firstProviderOrderId = await razorpayOrderIdFromClientActionResponse(
    await firstStartResponse,
  );
  await expect(page.getByTestId("payment-retry")).toBeVisible({ timeout: 20_000 });

  const retryResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /^\/api\/v1\/payments\/[^/]+\/retry$/.test(new URL(response.url()).pathname) &&
      response.ok(),
  );
  await page.getByTestId("payment-retry").click();
  const secondProviderOrderId = await razorpayOrderIdFromClientActionResponse(
    await retryResponse,
  );
  expect(secondProviderOrderId).not.toBe(firstProviderOrderId);

  await expect(page.getByTestId("order-confirmation")).toBeVisible({ timeout: 30_000 });
});

test("Razorpay script load failure stays recoverable", async ({ page }) => {
  test.setTimeout(180_000);
  await installRazorpayCheckoutMock(page, "unavailable");
  await reachReadyForPayment(page, PHONE_NUMBERS.scriptLoadFailure);
  await page.getByTestId("payment-start").click();
  await expect(paymentProductAlert(page)).toContainText(
    /Payment checkout couldn't load\. Check your connection\. Don't start a new payment\./i,
    { timeout: 20_000 },
  );
  await expect(page.getByTestId("order-confirmation")).toHaveCount(0);
  await expect(page.getByTestId("payment-reopen-checkout")).toBeVisible();
});
