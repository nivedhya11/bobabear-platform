import { createOTP } from "@better-auth/utils/otp";
import { base32 } from "@better-auth/utils/base32";
import { test, expect, type Page } from "@playwright/test";

/**
 * E2E coverage for the workforce email/password + MFA login flow (IMP-010).
 * Run only via `npm run test:e2e:workforce-auth` /
 * `playwright.workforce-auth.config.ts` — never `npm run test:e2e`.
 *
 * Credentials come from WORKFORCE_E2E_* env vars (set by
 * `scripts/e2e/run-workforce-auth-e2e.mjs`) and are never logged or asserted
 * into a test title.
 */

const EMAIL = process.env.WORKFORCE_E2E_EMAIL;
const TEMP_PASSWORD = process.env.WORKFORCE_E2E_TEMP_PASSWORD;
const PERMANENT_PASSWORD = process.env.WORKFORCE_E2E_PERMANENT_PASSWORD;

test.beforeEach(() => {
  test.skip(
    !EMAIL || !TEMP_PASSWORD || !PERMANENT_PASSWORD,
    "WORKFORCE_E2E_EMAIL / TEMP_PASSWORD / PERMANENT_PASSWORD must be set.",
  );
});

function statusText(page: Page) {
  return page.locator('#main-content [aria-live="polite"]');
}

function emailField(page: Page) {
  return page.getByLabel("Work email", { exact: true });
}

function passwordField(page: Page) {
  return page.getByLabel("Password", { exact: true });
}

async function totpFromSetupUri(page: Page): Promise<{ secret: string; backupCodes: string[] }> {
  const uri = await page.locator("#main-content code").filter({ hasText: "otpauth://" }).innerText();
  const encoded = new URL(uri.trim()).searchParams.get("secret");
  if (!encoded) throw new Error("Could not parse TOTP secret from setup URI");
  const secret = new TextDecoder().decode(base32.decode(encoded));
  const backupCodes = await page
    .locator("#main-content")
    .getByText("Backup codes", { exact: true })
    .locator("xpath=ancestor::div[1]//ul/li")
    .allTextContents();
  expect(backupCodes.length).toBe(10);
  return { secret, backupCodes: backupCodes.map((c) => c.trim()) };
}

async function currentTotp(secret: string): Promise<string> {
  return createOTP(secret, { digits: 6, period: 30 }).totp();
}

test.describe("workforce login — page load and customer coexistence", () => {
  test("/workforce/login loads into the email/password screen", async ({ page }) => {
    const response = await page.goto("/workforce/login");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
    await expect(emailField(page)).toBeVisible();
    await expect(passwordField(page)).toBeVisible();
  });

  test("customer /login still loads", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
    await expect(page.getByLabel("Mobile number", { exact: true })).toBeVisible();
  });

  test("menu/home link still loads", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("workforce login — invalid credentials", () => {
  test("rejects an invalid password with a generic error", async ({ page }) => {
    await page.goto("/workforce/login");
    await emailField(page).fill(EMAIL!);
    await passwordField(page).fill("wrong-password-15xx");
    await page.getByRole("button", { name: /^Sign in$/i }).click();
    await expect(statusText(page)).toHaveText(/email or password is incorrect/i);
  });
});

test.describe("workforce login — full temporary-password → MFA lifecycle", () => {
  test("completes password change, MFA enroll, reauth, TOTP, reload, backup, and sign-out", async ({
    page,
  }) => {
    await page.goto("/workforce/login");
    await emailField(page).fill(EMAIL!);
    await passwordField(page).fill(TEMP_PASSWORD!);
    await page.getByRole("button", { name: /^Sign in$/i }).click();

    await expect(page.getByLabel("Temporary password", { exact: true })).toBeVisible();
    await page.getByLabel("Temporary password", { exact: true }).fill(TEMP_PASSWORD!);
    await page.getByLabel("New password", { exact: true }).fill(PERMANENT_PASSWORD!);
    await page.getByRole("button", { name: /update password/i }).click();

    await expect(page.getByLabel("Confirm password", { exact: true })).toBeVisible();
    await page.getByLabel("Confirm password", { exact: true }).fill(PERMANENT_PASSWORD!);
    await page.getByRole("button", { name: /set up authenticator/i }).click();

    await expect(page.getByText(/manual authenticator setup/i)).toBeVisible();
    await expect(page.getByText("Backup codes", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: /qr code/i })).toBeVisible({ timeout: 15_000 });

    const { secret, backupCodes } = await totpFromSetupUri(page);
    const firstBackup = backupCodes[0]!;

    await page.getByRole("button", { name: /continue to verification/i }).click();
    await page.getByLabel("Authenticator code", { exact: true }).fill(await currentTotp(secret));
    await page.getByRole("button", { name: /verify authenticator/i }).click();

    await expect(statusText(page)).toHaveText(/authenticator set up\. sign in again/i);
    await expect(emailField(page)).toBeVisible();

    await emailField(page).fill(EMAIL!);
    await passwordField(page).fill(PERMANENT_PASSWORD!);
    await page.getByRole("button", { name: /^Sign in$/i }).click();

    await expect(page.getByLabel("Authenticator code", { exact: true })).toBeVisible();
    await page.getByLabel("Authenticator code", { exact: true }).fill("000000");
    await page.getByRole("button", { name: /verify/i }).click();
    await expect(statusText(page)).toHaveText(/incorrect/i);

    await page.getByLabel("Authenticator code", { exact: true }).fill(await currentTotp(secret));
    await page.getByRole("button", { name: /verify/i }).click();
    await expect(page.getByText(/you.?re signed in/i)).toBeVisible();

    await page.reload();
    await expect(page.getByText(/you.?re signed in/i)).toBeVisible();

    // Sign out, then prove backup-code login and replay rejection.
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(emailField(page)).toBeVisible();

    await emailField(page).fill(EMAIL!);
    await passwordField(page).fill(PERMANENT_PASSWORD!);
    await page.getByRole("button", { name: /^Sign in$/i }).click();
    await expect(page.getByLabel("Authenticator code", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /use a backup code/i }).click();
    await page.getByLabel("Backup code", { exact: true }).fill(firstBackup);
    await page.getByRole("button", { name: /verify backup code/i }).click();
    await expect(page.getByText(/you.?re signed in/i)).toBeVisible();

    await page.getByRole("button", { name: /sign out/i }).click();
    await emailField(page).fill(EMAIL!);
    await passwordField(page).fill(PERMANENT_PASSWORD!);
    await page.getByRole("button", { name: /^Sign in$/i }).click();
    await page.getByRole("button", { name: /use a backup code/i }).click();
    await page.getByLabel("Backup code", { exact: true }).fill(firstBackup);
    await page.getByRole("button", { name: /verify backup code/i }).click();
    await expect(statusText(page)).toHaveText(/incorrect/i);

    // Sensitive material must not leak into URL / storage.
    expect(page.url()).not.toContain(EMAIL!);
    expect(page.url()).not.toContain(secret);
    expect(page.url()).not.toContain(firstBackup);
    const storageDump = await page.evaluate(() => ({
      local: JSON.stringify(window.localStorage),
      session: JSON.stringify(window.sessionStorage),
    }));
    expect(storageDump.local).not.toContain(EMAIL!);
    expect(storageDump.local).not.toContain(secret);
    expect(storageDump.session).not.toContain(EMAIL!);
    expect(storageDump.session).not.toContain(secret);
  });
});
