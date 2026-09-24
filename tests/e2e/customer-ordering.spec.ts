import { test, expect, type Page } from "@playwright/test";

import {
  installLocationProviderMocks,
  installMockGoogleMaps,
} from "./support/maps-location-mocks";
import { installRazorpayCheckoutMock } from "./support/razorpay-checkout-mock";

/**
 * IMP-025 / IMP-026B / IMP-036H E2E: guest menu → cart → auth → claim →
 * fulfilment choice → (Delivery destination | Pickup outlet) → checkout →
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
  pickupSuccess: "9876500256",
  pickupMobile: "9876500257",
} as const;

async function selectCheckoutFulfilmentDelivery(page: Page): Promise<void> {
  const checkout = page.locator("#main-content");
  await expect(checkout.getByTestId("checkout-fulfilment-choice")).toBeVisible({
    timeout: 20_000,
  });
  // AC-036H-041 — Delivery / Pickup are named, pressed-state toggle buttons.
  const delivery = checkout.getByTestId("checkout-fulfilment-delivery");
  const pickup = checkout.getByTestId("checkout-fulfilment-pickup");
  await expect(delivery).toHaveAttribute("aria-pressed", "false");
  await expect(pickup).toHaveAttribute("aria-pressed", "false");
  await delivery.focus();
  await expect(delivery).toBeFocused();
  await delivery.click();
  await expect(delivery).toHaveAttribute("aria-pressed", "true");
}

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

async function completeCheckoutDestination(page: Page, phoneNumber: string): Promise<void> {
  const checkout = page.locator("#main-content");
  await expect(checkout.getByTestId("checkout-destination-select")).toBeVisible({ timeout: 20_000 });
  await checkout.getByRole("button", { name: "Add new address" }).click();

  await expect(checkout.getByTestId("checkout-destination-location")).toBeVisible();
  await checkout.getByPlaceholder("Search area, street or nearby landmark").fill("Rajpur");
  await expect(checkout.getByRole("option", { name: "Rajpur Road, Dehradun" })).toBeVisible({
    timeout: 15_000,
  });
  await checkout.getByRole("option", { name: "Rajpur Road, Dehradun" }).click();

  await expect(page.getByTestId("delivery-location-map-confirmation")).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "Confirm location" }).click();

  await expect(checkout.getByTestId("checkout-destination-details")).toBeVisible({ timeout: 15_000 });
  // Accessible names include FieldLabel " (required)" / " (Optional)" suffixes.
  await checkout.getByRole("textbox", { name: /Flat \/ House \/ Building/i }).fill("12 Mall Road");
  await checkout.getByRole("textbox", { name: /Recipient name/i }).fill("E2E Guest");
  await checkout.getByRole("textbox", { name: /Mobile number/i }).fill(`+91${phoneNumber}`);
  await checkout.getByRole("button", { name: "Save address" }).click();
}

async function reachReadyForPayment(page: Page, phoneNumber: string): Promise<void> {
  await installMockGoogleMaps(page);
  await installLocationProviderMocks(page);

  await page.goto("/order/");
  await expect(page.getByRole("heading", { name: /^the bar$/i, level: 1 })).toBeVisible();
  await expect(page.getByTestId("deliver-to-header-orientation")).toBeVisible();
  await expect(page.getByTestId("deliver-to-header-orientation")).toContainText("Dehradun");
  await expect(page.locator("#main-content")).not.toContainText(/serviceable/i);

  const addButtons = page.locator("#main-content").getByRole("button", { name: /^add .+/i });
  await expect(addButtons.first()).toBeVisible();
  await expect(addButtons.first()).toContainText("Add +");
  await addButtons.first().click();
  const headerCartLink = page
    .locator("header")
    .getByRole("link", { name: /^cart \(1\)$/i });
  await expect(headerCartLink).toBeVisible({ timeout: 15_000 });

  await headerCartLink.click();
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
  // AC-036H-001 / AC-036H-031 — Delivery path must choose Delivery before destination.
  await selectCheckoutFulfilmentDelivery(page);
  await completeCheckoutDestination(page, phoneNumber);

  // Review → payment is an explicit step (checkout-review → Continue to payment → checkout-ready).
  await expect(page.getByTestId("checkout-review")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /Continue to payment/i }).click();

  await expect(page.getByTestId("checkout-ready")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("checkout-line-review")).toBeVisible();
  await expect(page.getByTestId("checkout-ready").getByText(/total payable/i).first()).toBeVisible();
  await expect(page.getByTestId("payment-start")).toBeVisible();
}

/**
 * Guest → menu → cart → auth → Pickup fulfilment → review → payment-ready.
 * Does not install Maps mocks — AC-036H-030 requires no Maps/location APIs.
 */
async function reachPickupReadyForPayment(page: Page, phoneNumber: string): Promise<void> {
  const mapsOrPlacesRequests: string[] = [];
  await page.addInitScript(() => {
    const g = globalThis as typeof globalThis & {
      __bobaGeoGetCurrentPositionCalls?: number;
      __bobaGeoWatchPositionCalls?: number;
    };
    g.__bobaGeoGetCurrentPositionCalls = 0;
    g.__bobaGeoWatchPositionCalls = 0;
    const geo = navigator.geolocation;
    if (!geo) return;
    const originalGet = geo.getCurrentPosition.bind(geo);
    const originalWatch = geo.watchPosition.bind(geo);
    geo.getCurrentPosition = ((...args: Parameters<Geolocation["getCurrentPosition"]>) => {
      g.__bobaGeoGetCurrentPositionCalls = (g.__bobaGeoGetCurrentPositionCalls ?? 0) + 1;
      return originalGet(...args);
    }) as Geolocation["getCurrentPosition"];
    geo.watchPosition = ((...args: Parameters<Geolocation["watchPosition"]>) => {
      g.__bobaGeoWatchPositionCalls = (g.__bobaGeoWatchPositionCalls ?? 0) + 1;
      return originalWatch(...args);
    }) as Geolocation["watchPosition"];
  });

  page.on("request", (request) => {
    const url = request.url();
    if (
      /maps\.googleapis\.com|places\.googleapis\.com|maps\.gstatic\.com/i.test(url)
    ) {
      mapsOrPlacesRequests.push(url);
    }
  });

  await page.goto("/order/");
  await expect(page.getByRole("heading", { name: /^the bar$/i, level: 1 })).toBeVisible();

  const addButtons = page.locator("#main-content").getByRole("button", { name: /^add .+/i });
  await expect(addButtons.first()).toBeVisible();
  await addButtons.first().click();
  const headerCartLink = page.locator("header").getByRole("link", { name: /^cart \(1\)$/i });
  await expect(headerCartLink).toBeVisible({ timeout: 15_000 });
  await headerCartLink.click();
  await expect(page.getByRole("heading", { name: /your cart/i })).toBeVisible();
  await page.getByRole("button", { name: /checkout/i }).click();

  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
  await phoneField(page).fill(phoneNumber);
  await page.getByRole("button", { name: /send code/i }).click();
  await expect(codeField(page)).toBeVisible();
  await codeField(page).fill(FIXED_OTP_CODE!);
  await page.getByRole("button", { name: /verify code/i }).click();

  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible({ timeout: 20_000 });
  const checkout = page.locator("#main-content");
  await expect(checkout.getByTestId("checkout-fulfilment-choice")).toBeVisible({ timeout: 20_000 });

  // AC-036H-041 — real keyboard: Tab from Delivery to Pickup, Enter to activate.
  const delivery = checkout.getByTestId("checkout-fulfilment-delivery");
  const pickup = checkout.getByTestId("checkout-fulfilment-pickup");
  await delivery.focus();
  await expect(delivery).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(pickup).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(pickup).toHaveAttribute("aria-pressed", "true");
  await expect(delivery).toHaveAttribute("aria-pressed", "false");
  // Space also activates when focused (toggle stays selected).
  await page.keyboard.press("Space");
  await expect(pickup).toHaveAttribute("aria-pressed", "true");

  await expect(checkout.getByTestId("checkout-pickup-outlet")).toBeVisible({ timeout: 20_000 });
  // Single eligible outlet → AUTO_SELECT (AC-036H-003).
  await expect(checkout.getByTestId("checkout-pickup-outlet-auto")).toBeVisible();
  await expect(checkout.getByTestId("checkout-destination-select")).toHaveCount(0);
  await expect(checkout.getByTestId("checkout-destination-location")).toHaveCount(0);
  await checkout.getByTestId("checkout-pickup-continue").focus();
  await expect(checkout.getByTestId("checkout-pickup-continue")).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("checkout-review")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("checkout-review-pickup")).toBeVisible();
  await expect(page.getByTestId("checkout-review-no-delivery-fee")).toBeVisible();
  await page.getByRole("button", { name: /Continue to payment/i }).click();

  await expect(page.getByTestId("checkout-ready")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("payment-start")).toBeVisible();

  expect(mapsOrPlacesRequests, "Pickup must not call Maps/Places (AC-036H-030)").toEqual([]);
  const geoCounts = await page.evaluate(() => {
    const g = globalThis as typeof globalThis & {
      __bobaGeoGetCurrentPositionCalls?: number;
      __bobaGeoWatchPositionCalls?: number;
    };
    return {
      getCurrentPosition: g.__bobaGeoGetCurrentPositionCalls ?? 0,
      watchPosition: g.__bobaGeoWatchPositionCalls ?? 0,
    };
  });
  expect(geoCounts.getCurrentPosition, "geolocation.getCurrentPosition").toBe(0);
  expect(geoCounts.watchPosition, "geolocation.watchPosition").toBe(0);
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
  // Delivery confirmation still shows destination facts (AC-036H-001).
  await expect(page.getByText("E2E Guest", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: /order history/i }).click();
  await expect(page.getByRole("heading", { name: /My Orders/i, level: 1 })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByTestId("order-history-item").first()).toBeVisible();
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
  await expect(page.getByTestId("payment-recovery-dismissed")).toContainText(
    /Payment not completed/i,
    { timeout: 20_000 },
  );
  await expect(page.getByTestId("payment-recovery-dismissed")).toContainText(
    /closed the payment window before completing payment/i,
  );
  await expect(page.getByTestId("payment-continue")).toBeVisible();
  await expect(page.getByTestId("payment-start")).toHaveCount(0);
  await expect(page.getByTestId("payment-retry")).toHaveCount(0);
  await expect(page.getByTestId("order-confirmation")).toHaveCount(0);
});

test("Razorpay provider-surface failure does not create an Order", async ({ page }) => {
  test.setTimeout(180_000);
  await installRazorpayCheckoutMock(page, "fail");
  await reachReadyForPayment(page, PHONE_NUMBERS.providerFailure);
  await page.getByTestId("payment-start").click();
  // Browser payment.failed is not authoritative FAILED — stay on checking, no retry CTA.
  await expect(page.getByTestId("payment-checking")).toContainText(/Checking your payment/i, {
    timeout: 20_000,
  });
  await expect(page.getByTestId("payment-checking")).toContainText(/don't pay again yet/i);
  await expect(page.getByTestId("payment-retry")).toHaveCount(0);
  await expect(page.getByTestId("payment-continue")).toHaveCount(0);
  await expect(page.getByText(/Payment window closed/i)).toHaveCount(0);
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

test("guest can complete ASAP Pickup journey without Maps (AC-036H-002/030/041)", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile-chromium",
    "Desktop Pickup evidence; mobile has a focused counterpart",
  );
  test.setTimeout(180_000);
  await installRazorpayCheckoutMock(page, "succeed");
  await reachPickupReadyForPayment(page, PHONE_NUMBERS.pickupSuccess);

  await expect(page.getByTestId("payment-start")).toBeVisible();
  await expect(page.getByTestId("payment-start")).toBeEnabled();

  await page.getByTestId("payment-start").click();

  await expect(page.getByTestId("order-confirmation")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("order-fulfilment")).toBeVisible();
  await expect(page.getByTestId("order-fulfilment-mode")).toContainText(/pickup/i);
  await expect(page.getByTestId("order-pickup-location")).toBeVisible();
  await expect(page.getByTestId("order-delivery")).toHaveCount(0);
  await expect(page.getByTestId("order-delivery-track")).toHaveCount(0);

  await page.getByRole("link", { name: /order history/i }).click();
  await expect(page.getByRole("heading", { name: /My Orders/i, level: 1 })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("link", { name: /ORD-/i }).first().click();
  await expect(page.getByTestId("order-detail")).toBeVisible();
  await expect(page.getByTestId("order-fulfilment-mode")).toContainText(/pickup/i);
  await expect(page.getByTestId("order-pickup-location")).toBeVisible();
  await expect(page.getByTestId("order-delivery")).toHaveCount(0);
});

test("mobile: ASAP Pickup happy path remains usable (AC-036H mobile evidence)", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile-chromium",
    "Mobile viewport evidence only",
  );
  test.setTimeout(180_000);
  const viewport = page.viewportSize();
  expect(viewport, "persist mobile viewport identity").toEqual({
    width: 390,
    height: 844,
  });
  await installRazorpayCheckoutMock(page, "succeed");
  await reachPickupReadyForPayment(page, PHONE_NUMBERS.pickupMobile);
  await page.getByTestId("payment-start").click();
  await expect(page.getByTestId("order-confirmation")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("order-fulfilment-mode")).toContainText(/pickup/i);
  await expect(page.getByTestId("order-pickup-location")).toBeVisible();
});
