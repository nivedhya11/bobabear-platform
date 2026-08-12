import { test, expect, type Page } from "@playwright/test";

/**
 * E2E coverage for the customer phone-OTP login flow (IMP-009). Run only via
 * `npm run test:e2e:customer-auth` / `playwright.customer-auth.config.ts` —
 * never `npm run test:e2e` (see that config's `testIgnore`).
 *
 * The six-digit code is read once from `CUSTOMER_OTP_LOCAL_FIXED_CODE` (the
 * same env var both the local harness and the Docker `customer-auth`
 * service use for their local OTP provider) and never logged, asserted into
 * a test title, or otherwise printed by this file.
 *
 * Each test that sends an OTP uses its own distinct phone number so the
 * per-phone 60-second resend rate limit never leaks between tests sharing
 * one worker (`fullyParallel: false`, `workers: 1` in the dedicated config).
 */

const FIXED_OTP_CODE = process.env.CUSTOMER_OTP_LOCAL_FIXED_CODE;

test.beforeEach(() => {
  test.skip(
    !FIXED_OTP_CODE,
    "CUSTOMER_OTP_LOCAL_FIXED_CODE must be set for the customer-auth E2E suite.",
  );
});

const PHONE_NUMBERS = {
  invalid: "12345",
  sendOnly: "9876543211",
  fullFlow: "9876543212",
  reload: "9876543213",
  storageCheck: "9876543214",
} as const;

// Scoped to the login form's own `<main id="main-content">` — the site
// footer's newsletter widget also has an `aria-live="polite"` status line
// on every page (including /login), which would otherwise collide with an
// unscoped lookup.
function statusText(page: Page) {
  return page.locator('#main-content [aria-live="polite"]');
}

// `exact: true` matters here: the site footer's newsletter signup input
// carries an accessible name of "Mobile number or email to join the Boba
// Bear community" on every page (including /login), which would otherwise
// also match a substring `getByLabel("Mobile number")` lookup.
function phoneField(page: Page) {
  return page.getByLabel("Mobile number", { exact: true });
}

function codeField(page: Page) {
  return page.getByLabel("6-digit code", { exact: true });
}

async function submitPhone(page: Page, phoneNumber: string): Promise<void> {
  await phoneField(page).fill(phoneNumber);
  await page.getByRole("button", { name: /send code/i }).click();
}

async function submitCode(page: Page, code: string): Promise<void> {
  await codeField(page).fill(code);
  await page.getByRole("button", { name: /verify code/i }).click();
}

test.describe("customer login — page and validation", () => {
  test("/login loads into the phone entry screen", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
    await expect(phoneField(page)).toBeVisible();
    await expect(page.getByRole("button", { name: /send code/i })).toBeVisible();
  });

  test("rejects an invalid phone number without calling the server", async ({ page }) => {
    await page.goto("/login");
    await submitPhone(page, PHONE_NUMBERS.invalid);

    await expect(statusText(page)).toHaveText(/valid indian mobile number/i);
    // Still on the phone screen — an invalid number never reaches send-otp.
    await expect(phoneField(page)).toBeVisible();
    await expect(codeField(page)).toHaveCount(0);
  });
});

test.describe("customer login — send/verify OTP flow", () => {
  test("sends an OTP and advances to the code entry screen", async ({ page }) => {
    await page.goto("/login");
    await submitPhone(page, PHONE_NUMBERS.sendOnly);

    await expect(codeField(page)).toBeVisible();
    await expect(statusText(page)).toHaveText(/code sent/i);
  });

  test("verifies the correct code and signs the customer in", async ({ page }) => {
    await page.goto("/login");
    await submitPhone(page, PHONE_NUMBERS.fullFlow);
    await expect(codeField(page)).toBeVisible();

    await submitCode(page, FIXED_OTP_CODE!);

    await expect(page.getByText(/signed in\./i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
  });

  test("rejects an incorrect code and stays on the code screen", async ({ page }) => {
    await page.goto("/login");
    await submitPhone(page, "9000000002");
    await expect(codeField(page)).toBeVisible();

    // Deliberately wrong — never derived from or equal to the real fixed code.
    const wrongCode = FIXED_OTP_CODE === "000001" ? "000002" : "000001";
    await submitCode(page, wrongCode);

    await expect(statusText(page)).toHaveText(/incorrect or has expired/i);
    await expect(codeField(page)).toBeVisible();
  });
});

test.describe("customer login — session persistence and sign-out", () => {
  test("the session survives a full page reload", async ({ page }) => {
    await page.goto("/login");
    await submitPhone(page, PHONE_NUMBERS.reload);
    await submitCode(page, FIXED_OTP_CODE!);
    await expect(page.getByText(/signed in\./i)).toBeVisible();

    await page.reload();

    await expect(page.getByText(/signed in\./i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
  });

  test("signing out returns to the phone entry screen and clears the session", async ({ page }) => {
    await page.goto("/login");
    await submitPhone(page, "9000000003");
    await submitCode(page, FIXED_OTP_CODE!);
    await expect(page.getByText(/signed in\./i)).toBeVisible();

    await page.getByRole("button", { name: /sign out/i }).click();

    await expect(phoneField(page)).toBeVisible();
    await expect(statusText(page)).toHaveText(/signed out/i);

    await page.reload();
    await expect(phoneField(page)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign out/i })).toHaveCount(0);
  });
});

test.describe("customer login — no OTP/phone leakage into browser-visible state", () => {
  test("the phone number and OTP never appear in the URL or in localStorage/sessionStorage", async ({
    page,
  }) => {
    await page.goto("/login");
    await submitPhone(page, PHONE_NUMBERS.storageCheck);
    await expect(codeField(page)).toBeVisible();
    await submitCode(page, FIXED_OTP_CODE!);
    await expect(page.getByText(/signed in\./i)).toBeVisible();

    expect(page.url()).not.toContain(PHONE_NUMBERS.storageCheck);
    expect(page.url()).not.toContain(FIXED_OTP_CODE!);

    const storageDump = await page.evaluate(() => ({
      local: JSON.stringify(window.localStorage),
      session: JSON.stringify(window.sessionStorage),
    }));
    expect(storageDump.local).not.toContain(PHONE_NUMBERS.storageCheck);
    expect(storageDump.local).not.toContain(FIXED_OTP_CODE!);
    expect(storageDump.session).not.toContain(PHONE_NUMBERS.storageCheck);
    expect(storageDump.session).not.toContain(FIXED_OTP_CODE!);

    const cookies = await page.context().cookies();
    for (const cookie of cookies) {
      expect(cookie.value).not.toContain(PHONE_NUMBERS.storageCheck);
      expect(cookie.value).not.toContain(FIXED_OTP_CODE!);
    }
  });
});
