import { test, expect, type Page } from "@playwright/test";

/**
 * IMP-025 E2E: guest menu → cart → auth → claim → destination → checkout →
 * fake-provider Payment → confirmation → history/detail.
 * Run via `npm run test:e2e:customer-ordering` only.
 */

const FIXED_OTP_CODE = process.env.CUSTOMER_OTP_LOCAL_FIXED_CODE;
const PHONE = "9876500251";

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

test("guest can complete owned ordering through payment and order history", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/order/");
  await expect(page.getByRole("heading", { name: /order with boba bear/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /cart · \d+/i })).toBeVisible({ timeout: 20_000 });

  const addButtons = page.getByRole("button", { name: /add to cart/i });
  await expect(addButtons.first()).toBeVisible();
  await addButtons.first().click();
  await expect(page.getByRole("link", { name: /cart · 1/i })).toBeVisible({ timeout: 15_000 });

  await page.getByRole("link", { name: /cart/i }).first().click();
  await expect(page.getByRole("heading", { name: /your cart/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /checkout/i })).toBeVisible();
  await page.getByRole("button", { name: /checkout/i }).click();

  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
  await phoneField(page).fill(PHONE);
  await page.getByRole("button", { name: /send code/i }).click();
  await expect(codeField(page)).toBeVisible();
  await codeField(page).fill(FIXED_OTP_CODE!);
  await page.getByRole("button", { name: /verify code/i }).click();

  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible({ timeout: 20_000 });
  const checkout = page.locator("#main-content");
  await checkout.getByLabel("Recipient name", { exact: true }).fill("E2E Guest");
  await checkout.getByLabel("Mobile number", { exact: true }).fill("+919876500251");
  await checkout.getByLabel("Address line 1", { exact: true }).fill("12 Mall Road");
  await checkout.getByLabel("City", { exact: true }).fill("Dehradun");
  await checkout.getByRole("combobox", { name: /^State$/i }).selectOption({ label: "Uttarakhand" });
  await checkout.getByLabel("PIN code", { exact: true }).fill("248001");
  await checkout.getByRole("button", { name: /evaluate checkout/i }).click();

  await expect(page.getByTestId("checkout-ready")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/ready for payment/i)).toBeVisible();
  await expect(page.getByText(/total payable/i)).toBeVisible();
  await page.getByTestId("payment-start").click();

  await expect(page.getByTestId("order-confirmation")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("order-status")).toHaveText(/order placed/i);
  await page.getByRole("link", { name: /order history/i }).click();
  await expect(page.getByTestId("orders-list")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("link", { name: /ORD-/i }).first().click();
  await expect(page.getByTestId("order-detail")).toBeVisible();
  await expect(page.getByTestId("order-status")).toHaveText(/order placed/i);
  await expect(page.getByText("E2E Guest", { exact: true })).toBeVisible();
  await expect(page.getByText("12 Mall Road", { exact: true })).toBeVisible();
});
