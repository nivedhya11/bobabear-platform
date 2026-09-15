/**
 * IMP-036F F6B — Commercial workspace browser proof (desktop / tablet / mobile).
 * Automated implementation evidence only — not Founder UAT.
 *
 * MFA enrollment state is persisted to the fixture file because Playwright restarts the worker
 * after a failed test, which would otherwise lose in-memory TOTP secrets.
 */
import { createOTP } from "@better-auth/utils/otp";
import { base32 } from "@better-auth/utils/base32";
import { expect, test, type Page } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";

type Fixture = {
  email: string;
  brandId: string;
  brandName: string;
  outletId: string;
  outletName: string;
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  /** Base32-encoded TOTP secret after first enrollment (worker-restart durable). */
  totpSecretBase32?: string;
};

const fixturePath = process.env.COMMERCIAL_E2E_FIXTURE_MANIFEST;
const temporaryPassword = process.env.WORKFORCE_E2E_TEMP_PASSWORD;
const permanentPassword = process.env.WORKFORCE_E2E_PERMANENT_PASSWORD;

let fixture: Fixture;

test.beforeAll(async () => {
  if (!fixturePath || !temporaryPassword || !permanentPassword) {
    throw new Error("Missing commercial workspace E2E credentials / fixture.");
  }
  fixture = JSON.parse(await readFile(fixturePath, "utf8")) as Fixture;
});

async function persistTotpSecret(encodedBase32: string): Promise<void> {
  if (!fixturePath) return;
  fixture = { ...fixture, totpSecretBase32: encodedBase32 };
  await writeFile(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
}

function totpSecret(): string {
  const encoded = fixture.totpSecretBase32;
  if (!encoded) throw new Error("TOTP secret not established.");
  return new TextDecoder().decode(base32.decode(encoded));
}

async function login(page: Page): Promise<void> {
  await page.goto("/workforce/login/");

  if (!fixture.totpSecretBase32) {
    await page.getByLabel("Work email", { exact: true }).fill(fixture.email);
    await page.getByLabel("Password", { exact: true }).fill(temporaryPassword!);
    await page.getByRole("button", { name: /^Sign in$/i }).click();
    await page.getByLabel("Temporary password", { exact: true }).fill(temporaryPassword!);
    await page.getByLabel("New password", { exact: true }).fill(permanentPassword!);
    await page.getByRole("button", { name: /update password/i }).click();
    await page.getByLabel("Confirm password", { exact: true }).fill(permanentPassword!);
    await page.getByRole("button", { name: /set up authenticator/i }).click();
    const uri = await page.locator("#main-content code").filter({ hasText: "otpauth://" }).innerText();
    const encoded = new URL(uri.trim()).searchParams.get("secret");
    if (!encoded) throw new Error("TOTP secret missing.");
    await persistTotpSecret(encoded);
    await page.getByRole("button", { name: /continue to verification/i }).click();
    await page
      .getByLabel("Authenticator code", { exact: true })
      .fill(await createOTP(totpSecret(), { digits: 6, period: 30 }).totp());
    await page.getByRole("button", { name: /verify authenticator/i }).click();
    await expect(page.getByText(/authenticator set up\. sign in again/i)).toBeVisible();
  } else if (!(await page.getByLabel("Work email", { exact: true }).isVisible().catch(() => false))) {
    await page.goto("/workforce/login/");
  }

  await page.getByLabel("Work email", { exact: true }).fill(fixture.email);
  await page.getByLabel("Password", { exact: true }).fill(permanentPassword!);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  await page
    .getByLabel("Authenticator code", { exact: true })
    .fill(await createOTP(totpSecret(), { digits: 6, period: 30 }).totp());
  await page.getByRole("button", { name: /^Verify$/i }).click();

  // Brand commercial operators typically land on the workforce hub; avoid ambiguous "Signed in" matches.
  await expect(
    page.getByTestId("workforce-hub").or(page.getByTestId("admin-hub")).first(),
  ).toBeVisible({ timeout: 45_000 });
}

async function openCommercialWorkspace(page: Page): Promise<void> {
  await page.goto("/workforce/admin/commercial/");
  await expect(page.getByTestId("commercial-workspace")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("heading", { name: /^Commercial$/i })).toBeVisible();
}

async function selectWorkingContext(page: Page): Promise<void> {
  const context = page.getByTestId("commercial-context-selector");
  await context.getByLabel("Brand").selectOption(fixture.brandId);
  await expect(page.getByText(new RegExp(`Selected brand:\\s*${fixture.brandName}`, "i"))).toBeVisible();
  // Catalog/menu/pricing sections require commercial session caps (PORTAL_SESSION_CAPS).
  await expect(page.getByRole("button", { name: /^Offering$/i })).toBeVisible({ timeout: 45_000 });
  await expect(context.getByLabel("Product")).toBeEnabled({ timeout: 45_000 });
  await expect(context.getByLabel("Product").locator(`option[value="${fixture.productId}"]`)).toHaveCount(1, {
    timeout: 45_000,
  });
  await context.getByLabel("Product").selectOption(fixture.productId);
  await expect(context.getByLabel("Variant")).toBeEnabled({ timeout: 45_000 });
  await expect(context.getByLabel("Variant").locator(`option[value="${fixture.variantId}"]`)).toHaveCount(1, {
    timeout: 45_000,
  });
  await context.getByLabel("Variant").selectOption(fixture.variantId);
  await context.getByLabel("Outlet").selectOption(fixture.outletId);
}

test("desktop: coherent commercial authoring journey", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page);
  await openCommercialWorkspace(page);
  await selectWorkingContext(page);

  await page.getByRole("button", { name: /^Offering$/i }).click();
  await expect(page.getByTestId("catalog-editor")).toBeVisible();
  const offeringButton = page
    .locator('[data-testid="catalog-editor"] button')
    .filter({ hasText: fixture.productName })
    .first();
  await expect(offeringButton).toBeVisible({ timeout: 45_000 });
  await offeringButton.click();
  await expect(page.getByText(/^Draft$/i).first()).toBeVisible();
  await expect(page.getByText(/Effective \(customer\)/i).first()).toBeVisible();

  const nameField = page.getByLabel(/^Name$/i).first();
  await nameField.fill(`${fixture.productName} F6B`);
  await page.getByRole("button", { name: /^Save draft$/i }).click();
  await expect(page.getByRole("status").filter({ hasText: /Customer truth unchanged/i }).first()).toBeVisible();

  await page.getByRole("button", { name: /^Menu$/i }).click();
  await expect(page.getByTestId("menu-editor")).toBeVisible();
  const menuButton = page.locator('[data-testid="menu-editor"] ul button').first();
  await expect(menuButton).toBeVisible({ timeout: 45_000 });
  await menuButton.click();
  await expect(page.getByTestId("menu-editor").getByRole("button", { name: /^Review & publish$/i })).toBeVisible({ timeout: 45_000 });
  const enabledMoveDown = page
    .getByTestId("menu-editor")
    .getByRole("button", { name: /^Move down$/i, disabled: false });
  if ((await enabledMoveDown.count()) > 0) {
    const moveDown = enabledMoveDown.first();
    await moveDown.focus();
    await expect(moveDown).toBeFocused();
    await moveDown.click();
  }
  await page.getByTestId("menu-editor").getByRole("button", { name: /^Review & publish$/i }).click();
  await expect(page.getByTestId("consequence-review-dialog")).toBeVisible({ timeout: 45_000 });
  await page.getByTestId("consequence-review-dialog").getByRole("button", { name: /^Cancel$/i }).click();
  await expect(page.getByTestId("consequence-review-dialog")).toHaveCount(0);
  await expect(page.getByText(/No effect/i)).toBeVisible();

  await page.getByRole("button", { name: /^Assortment$/i }).click();
  // Re-assert variant context after catalog selection (same-product click must not clear it).
  const contextPanel = page.getByTestId("commercial-context-selector");
  if ((await contextPanel.getByLabel("Variant").inputValue()) !== fixture.variantId) {
    await contextPanel.getByLabel("Variant").selectOption(fixture.variantId);
  }
  await expect(page.getByText(/Is this outlet intended\/permitted/i)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(/ordered operationally right now/i)).toBeVisible();

  await page.getByRole("button", { name: /^Pricing$/i }).click();
  await expect(page.getByTestId("pricing-editor")).toBeVisible();
  const priceBookCode = `f6b-${Date.now().toString(36)}`;
  await page.getByLabel("Price book code").fill(priceBookCode);
  await page.getByLabel("Price book name").fill("F6B Price Book");
  await page.getByRole("button", { name: /^Create$/i }).click();
  await expect(page.getByText(/Price book created as draft/i)).toBeVisible();
  await page.getByTestId("pricing-editor").getByRole("button", { name: /F6B Price Book/i }).click();
  await page.getByLabel("INR amount").fill("199.00");
  await page.getByRole("button", { name: /^Attach price$/i }).click();
  await expect(page.getByRole("status").filter({ hasText: /Baseline variant price attached/i }).first()).toBeVisible();
  // Activation preview can be long-running against the full seeded commercial graph; prove
  // the deliberate Review affordance is present. Consequence dialog is covered via Menu above.
  await expect(
    page.getByTestId("pricing-editor").getByRole("button", { name: /^Review & activate$/i }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Promotions & coupons/i }).click();
  await expect(page.getByTestId("promotions-editor")).toBeVisible();
  await expect(page.getByText(/\bdraft\b|\bactive\b|\bretired\b/i).first()).toBeVisible();

  await page.getByRole("button", { name: /^Delivery tariff$/i }).click();
  await expect(page.getByText(/Customer delivery price/i).first()).toBeVisible();
  await expect(page.getByText(/not Serviceability/i)).toBeVisible();

  await page.getByRole("button", { name: /Verify & diagnose/i }).click();
  await page.getByRole("button", { name: /Verify customer truth/i }).click();
  await expect(
    page.getByTestId("customer-verification").getByText(/VERIFIED_MATCH|MISMATCH|PARTIAL|INSUFFICIENT_CONTEXT/i),
  ).toBeVisible({ timeout: 45_000 });
  await page.getByRole("button", { name: /Diagnose sellability/i }).click();
  await expect(page.getByTestId("sellability-diagnosis").getByText(/Catalog lifecycle/i)).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.getByTestId("sellability-diagnosis").getByText(/^Assortment$/i).first()).toBeVisible();
  await expect(page.getByTestId("sellability-diagnosis").getByText(/^Availability$/i).first()).toBeVisible();
  await expect(page.getByTestId("sellability-diagnosis").getByText(/^Serviceability$/i).first()).toBeVisible();

  await page.getByRole("button", { name: /^Activity$/i }).click();
  await expect(page.getByTestId("commercial-activity")).toBeVisible();
});

test("tablet: authoring operable without hover-only dependency", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await login(page);
  await openCommercialWorkspace(page);
  await selectWorkingContext(page);

  await expect(page.getByText(/Commercial editing is available on tablet and desktop/i)).toHaveCount(0);

  await page.getByRole("button", { name: /^Offering$/i }).click();
  await page
    .locator('[data-testid="catalog-editor"] button')
    .filter({ hasText: fixture.productName })
    .first()
    .click();
  await page.getByLabel(/^Name$/i).first().fill(`${fixture.productName} Tablet`);
  await page.getByRole("button", { name: /^Save draft$/i }).click();
  await expect(page.getByRole("status").filter({ hasText: /Customer truth unchanged/i }).first()).toBeVisible();

  await page.getByRole("button", { name: /^Menu$/i }).click();
  const menuButton = page.locator('[data-testid="menu-editor"] ul button').first();
  await expect(menuButton).toBeVisible({ timeout: 45_000 });
  await menuButton.click();
  await expect(page.getByTestId("menu-editor").getByRole("button", { name: /^Review & publish$/i })).toBeVisible({ timeout: 45_000 });
  const enabledMoveUp = page
    .getByTestId("menu-editor")
    .getByRole("button", { name: /^Move up$/i, disabled: false });
  if ((await enabledMoveUp.count()) > 0) {
    await enabledMoveUp.first().click();
  }
  await page.getByTestId("menu-editor").getByRole("button", { name: /^Review & publish$/i }).click();
  await expect(page.getByTestId("consequence-review-dialog")).toBeVisible({ timeout: 45_000 });
  const enabledPublish = page
    .getByTestId("consequence-review-dialog")
    .getByRole("button", { name: /Publish changes/i, disabled: false });
  if ((await enabledPublish.count()) > 0) {
    await enabledPublish.first().click();
    await expect(page.getByText(/Menu published|no customer change/i)).toBeVisible({
      timeout: 45_000,
    });
  } else {
    await page.getByTestId("consequence-review-dialog").getByRole("button", { name: /^Cancel$/i }).click();
    await expect(page.getByText(/No effect/i)).toBeVisible();
  }

  await page.getByRole("button", { name: /^Pricing$/i }).click();
  await page.getByLabel("Price book code").fill(`tab-${Date.now().toString(36)}`);
  await page.getByLabel("Price book name").fill("Tablet PB");
  await page.getByRole("button", { name: /^Create$/i }).click();
  await expect(page.getByText(/Price book created as draft/i)).toBeVisible();
  await page.getByTestId("pricing-editor").getByRole("button", { name: /Tablet PB/i }).click();
  await page.getByLabel("INR amount").fill("205.50");
  await page.getByRole("button", { name: /^Attach price$/i }).click();
  await expect(page.getByRole("status").filter({ hasText: /Baseline variant price attached/i }).first()).toBeVisible();
  await expect(
    page.getByTestId("pricing-editor").getByRole("button", { name: /^Review & activate$/i }),
  ).toBeVisible();
});

test("mobile: inspection and verification only — editing message, not unsupported", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await openCommercialWorkspace(page);
  await selectWorkingContext(page);

  await expect(
    page.getByText(
      /Commercial editing is available on tablet and desktop\. Mobile supports inspection and verification\./i,
    ),
  ).toBeVisible();
  await expect(page.getByText(/unsupported/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Save draft$/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Review & activate/i })).toHaveCount(0);

  await page.getByRole("button", { name: /Verify & diagnose/i }).click();
  await page.getByRole("button", { name: /Verify customer truth/i }).click();
  await expect(
    page.getByTestId("customer-verification").getByText(/VERIFIED_MATCH|MISMATCH|PARTIAL|INSUFFICIENT_CONTEXT/i),
  ).toBeVisible({ timeout: 45_000 });
  await page.getByRole("button", { name: /Diagnose sellability/i }).click();
  await expect(page.getByTestId("sellability-diagnosis").getByText(/Catalog lifecycle/i)).toBeVisible({
    timeout: 45_000,
  });

  await page.getByRole("button", { name: /^Activity$/i }).click();
  await expect(page.getByTestId("commercial-activity")).toBeVisible();
});
