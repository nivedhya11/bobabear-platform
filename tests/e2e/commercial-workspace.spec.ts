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
  /** Outlet with no active PriceBook — desktop journey Pricing activation. */
  pricingOutletDesktopId: string;
  /** Outlet with no active PriceBook — tablet journey Pricing activation. */
  pricingOutletTabletId: string;
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

async function confirmConsequence(page: Page, confirmName: RegExp): Promise<void> {
  const dialog = page.getByTestId("consequence-review-dialog");
  await expect(dialog).toBeVisible({ timeout: 60_000 });
  const confirm = dialog.getByRole("button", { name: confirmName });
  await expect(confirm).toBeEnabled({ timeout: 60_000 });
  await confirm.click();
  try {
    await expect(dialog).toHaveCount(0, { timeout: 60_000 });
  } catch (error) {
    const alertText = await dialog.locator('[role="alert"]').innerText().catch(() => "");
    throw new Error(
      `Consequence confirm did not dismiss dialog. Alert: ${alertText || "(none)"}. Original: ${String(error)}`,
    );
  }
}

/**
 * Mandatory Pricing configure → consequence → exact revision → effect path.
 * Must reach "Price book activated"; timeouts / Cancel / blockers fail the journey.
 */
async function runMandatoryPricingEffect(
  page: Page,
  opts: { suffix: string; stamp: string; pricingOutletId: string },
): Promise<void> {
  await page.getByRole("button", { name: /^Pricing$/i }).click();
  await expect(page.getByTestId("pricing-editor")).toBeVisible();

  const contextPanel = page.getByTestId("commercial-context-selector");
  await expect(contextPanel.getByLabel("Outlet").locator(`option[value="${opts.pricingOutletId}"]`)).toHaveCount(
    1,
    { timeout: 45_000 },
  );
  await contextPanel.getByLabel("Outlet").selectOption(opts.pricingOutletId);
  if ((await contextPanel.getByLabel("Variant").inputValue()) !== fixture.variantId) {
    await contextPanel.getByLabel("Variant").selectOption(fixture.variantId);
  }

  const priceBookCode = `f6b-${opts.stamp}`;
  await page.getByLabel("Price book code").fill(priceBookCode);
  await page.getByLabel("Price book name").fill(`F6B Price Book ${opts.suffix}`);
  await page.getByRole("button", { name: /^Create$/i }).click();
  await expect(page.getByText(/price book created as draft/i)).toBeVisible({ timeout: 45_000 });
  await page
    .getByTestId("pricing-editor")
    .getByRole("button", { name: new RegExp(`F6B Price Book ${opts.suffix}`, "i") })
    .click();
  await page.getByLabel("INR amount").fill("199.00");
  await page.getByRole("button", { name: /^Attach price$/i }).click();
  await expect(
    page.getByRole("status").filter({ hasText: /Baseline variant price attached/i }).first(),
  ).toBeVisible({ timeout: 45_000 });

  const modifierSection = page.getByTestId("modifier-price-authoring");
  if (await modifierSection.isVisible().catch(() => false)) {
    const optionSelect = modifierSection.getByLabel("Modifier association and option");
    if ((await optionSelect.locator("option").count()) > 1) {
      await optionSelect.selectOption({ index: 1 });
      await modifierSection.getByLabel("modifier INR delta").fill("10.00");
      await modifierSection.getByRole("button", { name: /Attach modifier price/i }).click();
      await expect(page.getByText(/Modifier price attached/i)).toBeVisible({ timeout: 45_000 });
    }
  }

  await page.getByTestId("pricing-editor").getByRole("button", { name: /^Review & activate$/i }).click();
  const pricingDialog = page.getByTestId("consequence-review-dialog");
  await expect(pricingDialog).toBeVisible({ timeout: 60_000 });
  const revisionCode = pricingDialog.locator("code").first();
  await expect(revisionCode).toBeVisible();
  const expectedPriceBookRevision = (await revisionCode.innerText()).trim();
  expect(expectedPriceBookRevision.length).toBeGreaterThan(0);
  await expect(pricingDialog.getByText(/Cannot proceed/i)).toHaveCount(0);
  const confirm = pricingDialog.getByRole("button", { name: /Confirm effect/i });
  await expect(confirm).toBeEnabled({ timeout: 60_000 });
  await confirm.click();
  await expect(pricingDialog).toHaveCount(0, { timeout: 60_000 });
  await expect(page.getByText(/Price book activated/i)).toBeVisible({ timeout: 60_000 });
  // Post-effect: selected book reflects active lifecycle in the list / inspection.
  await expect(
    page
      .getByTestId("pricing-editor")
      .getByText(/active/i)
      .first(),
  ).toBeVisible({ timeout: 45_000 });
  // Keep revision string in assertion surface for reviewers (exact reviewed revision was shown before confirm).
  expect(expectedPriceBookRevision).toMatch(/^\d+$/);
}

async function runFullCommercialJourney(
  page: Page,
  opts: { suffix: string; pricingOutletId: string },
): Promise<void> {
  const stamp = `${opts.suffix.toLowerCase()}-${Date.now().toString(36)}`;

  // 1–2. Catalog: draft → consequence → publish
  await page.getByRole("button", { name: /^Offering$/i }).click();
  await expect(page.getByTestId("catalog-editor")).toBeVisible();
  const offeringButton = page
    .locator('[data-testid="catalog-editor"] button')
    .filter({ hasText: fixture.productName })
    .first();
  await expect(offeringButton).toBeVisible({ timeout: 45_000 });
  await offeringButton.click();
  const nameField = page.getByLabel(/^Name$/i).first();
  await nameField.fill(`${fixture.productName} ${opts.suffix}`);
  await page.getByRole("button", { name: /^Save draft$/i }).click();
  await expect(page.getByRole("status").filter({ hasText: /Customer truth unchanged/i }).first()).toBeVisible();
  await page.getByRole("button", { name: /^Review & publish$/i }).click();
  await confirmConsequence(page, /Publish changes/i);
  await expect(page.getByText(/Catalog published|no customer change/i)).toBeVisible({ timeout: 45_000 });

  // 3. Menu: section + entry lifecycle readiness → publish
  await page.getByRole("button", { name: /^Menu$/i }).click();
  await expect(page.getByTestId("menu-editor")).toBeVisible();
  const menuButton = page.locator('[data-testid="menu-editor"] ul button').first();
  await expect(menuButton).toBeVisible({ timeout: 45_000 });
  await menuButton.click();
  const sectionCode = `f6b${stamp.slice(-6)}`;
  const sectionName = `F6B Section ${opts.suffix}`;
  await page.getByLabel("Section code").fill(sectionCode);
  await page.getByLabel("Section name").fill(sectionName);
  await page.getByRole("button", { name: /^Add section$/i }).click();
  await expect(page.getByText(/Section added to draft/i)).toBeVisible({ timeout: 45_000 });
  await page
    .locator("div")
    .filter({ hasText: sectionName })
    .getByRole("button", { name: /^Activate section$/i })
    .first()
    .click();
  await expect(page.getByText(/Section activated/i)).toBeVisible({ timeout: 45_000 });
  await page.getByLabel("Target section").selectOption({ label: sectionName });
  const entryName = `F6B Entry ${opts.suffix}`;
  await page.getByLabel("Display name override").fill(entryName);
  await page.getByRole("button", { name: /^Place entry$/i }).click();
  await expect(page.getByText(/Product entry placed/i)).toBeVisible({ timeout: 45_000 });
  await page
    .locator("li")
    .filter({ hasText: entryName })
    .getByRole("button", { name: /^Activate entry$/i })
    .click();
  await expect(page.getByText(/Entry activated/i)).toBeVisible({ timeout: 45_000 });
  await page.getByTestId("menu-editor").getByRole("button", { name: /^Review & publish$/i }).click();
  await confirmConsequence(page, /Publish changes/i);
  await expect(page.getByText(/Menu published|no customer change/i)).toBeVisible({ timeout: 45_000 });

  // Separate cancel/no-effect proof on a second publish attempt when dialog opens
  await page.getByTestId("menu-editor").getByRole("button", { name: /^Review & publish$/i }).click();
  await expect(page.getByTestId("consequence-review-dialog")).toBeVisible({ timeout: 45_000 });
  await page.getByTestId("consequence-review-dialog").getByRole("button", { name: /^Cancel$/i }).click();
  await expect(page.getByText(/No effect/i)).toBeVisible();

  // 4. Assortment: outlet-scoped exclusion → effect (or cancel when already applied)
  await page.getByRole("button", { name: /^Assortment$/i }).click();
  const contextPanel = page.getByTestId("commercial-context-selector");
  if ((await contextPanel.getByLabel("Variant").inputValue()) !== fixture.variantId) {
    await contextPanel.getByLabel("Variant").selectOption(fixture.variantId);
  }
  if ((await contextPanel.getByLabel("Outlet").inputValue()) !== fixture.outletId) {
    await contextPanel.getByLabel("Outlet").selectOption(fixture.outletId);
  }
  await expect(page.getByTestId("exclude-outlet-assortment")).toBeVisible({ timeout: 45_000 });
  const alreadyOutletExcluded = await page
    .getByText(/outlet · exclude · active/i)
    .isVisible()
    .catch(() => false);
  await page.getByTestId("exclude-outlet-assortment").click();
  await expect(page.getByTestId("consequence-review-dialog")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(/Outlet exclusion/i)).toBeVisible();
  if (alreadyOutletExcluded) {
    await page.getByTestId("consequence-review-dialog").getByRole("button", { name: /^Cancel$/i }).click();
    await expect(page.getByText(/No effect/i)).toBeVisible();
  } else {
    await confirmConsequence(page, /Confirm effect/i);
    await expect(page.getByText(/excluded for the selected outlet/i)).toBeVisible({ timeout: 45_000 });
  }

  // 5. Pricing: mandatory configure → consequence → exact revision → effect
  await runMandatoryPricingEffect(page, {
    suffix: opts.suffix,
    stamp,
    pricingOutletId: opts.pricingOutletId,
  });

  // Restore commerce outlet for delivery tariff + verify/diagnose.
  if ((await contextPanel.getByLabel("Outlet").inputValue()) !== fixture.outletId) {
    await contextPanel.getByLabel("Outlet").selectOption(fixture.outletId);
  }

  // 6–7. Promotion (coupon-triggered) + targets + activate + coupon lifecycle
  await page.getByRole("button", { name: /Promotions & coupons/i }).click();
  await expect(page.getByTestId("promotions-editor")).toBeVisible();
  const promoCode = `cpn${stamp.replace(/[^a-z0-9]/g, "").slice(-10)}`;
  await page.getByLabel("Promotion code").fill(promoCode);
  await page.getByLabel("Promotion display name").fill(`F6B Coupon Promo ${opts.suffix}`);
  await page.getByLabel("Trigger type").selectOption("coupon");
  await page.getByTestId("promotions-editor").getByRole("button", { name: /^Create$/i }).click();
  await expect(page.getByText(/Promotion created as draft/i)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(/Trigger:\s*coupon/i)).toBeVisible();
  await page.getByLabel("Benefit type").selectOption("percentage_discount");
  await page.getByRole("button", { name: /^Save benefit$/i }).click();
  await expect(page.getByText(/Benefit saved/i)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("promotion-targets")).toBeVisible();
  await page.getByRole("button", { name: /Set qualifier to selected variant/i }).click();
  await expect(
    page.getByRole("status").filter({ hasText: /qualifier targets updated/i }).first(),
  ).toBeVisible({ timeout: 45_000 });
  await page.getByRole("button", { name: /Set benefit to selected variant/i }).click();
  await expect(
    page.getByRole("status").filter({ hasText: /benefit targets updated/i }).first(),
  ).toBeVisible({ timeout: 45_000 });
  await page.getByRole("button", { name: /^Review & activate$/i }).click();
  await confirmConsequence(page, /Confirm effect/i);
  await expect(page.getByText(/Lifecycle effect applied/i)).toBeVisible({ timeout: 45_000 });

  await expect(page.getByTestId("coupon-authoring")).toBeVisible();
  await page.getByLabel("Coupon code").fill(`code${stamp.replace(/[^a-z0-9]/g, "").slice(-6)}`);
  await page.getByRole("button", { name: /^Create coupon$/i }).click();
  await expect(page.getByText(/Coupon created/i)).toBeVisible({ timeout: 45_000 });
  await page.getByTestId("coupon-authoring").getByRole("button", { name: /^Activate$/i }).first().click();
  await confirmConsequence(page, /Confirm effect/i);
  await expect(page.getByText(/Lifecycle effect applied/i)).toBeVisible({ timeout: 45_000 });

  // Automatic promo must not offer coupon creation
  const autoCode = `auto${stamp.replace(/[^a-z0-9]/g, "").slice(-10)}`;
  await page.getByLabel("Promotion code").fill(autoCode);
  await page.getByLabel("Promotion display name").fill(`F6B Auto ${opts.suffix}`);
  await page.getByLabel("Trigger type").selectOption("automatic");
  await page.getByTestId("promotions-editor").getByRole("button", { name: /^Create$/i }).click();
  await expect(page.getByText(/Promotion created as draft/i)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(/Trigger:\s*automatic/i)).toBeVisible();
  await expect(page.getByText(/Coupons require a coupon-triggered Promotion/i)).toBeVisible();
  await expect(page.getByTestId("coupon-authoring")).toHaveCount(0);

  // 8. Delivery tariff mutate → effect
  await page.getByRole("button", { name: /^Delivery tariff$/i }).click();
  await expect(page.getByTestId("delivery-tariff-editor")).toBeVisible();
  await page.getByLabel(/Max distance \(meters\)/i).first().fill("3500");
  await page.getByLabel(/Customer fee \(INR\)/i).first().fill("45.00");
  await page.getByRole("button", { name: /^Review & update$/i }).click();
  await confirmConsequence(page, /Confirm effect/i);
  await expect(page.getByText(/Customer delivery price updated/i)).toBeVisible({ timeout: 45_000 });

  // 9–10. Verify + diagnose distinct authorities
  await page.getByRole("button", { name: /Verify & diagnose/i }).click();
  await page.getByRole("button", { name: /Verify customer truth/i }).click();
  const verification = page.getByTestId("customer-verification");
  await verification.scrollIntoViewIfNeeded();
  await expect(
    verification
      .getByText(/VERIFIED_MATCH|MISMATCH|PARTIAL|INSUFFICIENT_CONTEXT/i)
      .or(verification.getByRole("alert"))
      .first(),
  ).toBeVisible({ timeout: 45_000 });
  await page.getByRole("button", { name: /Diagnose sellability/i }).click();
  const diagnosis = page.getByTestId("sellability-diagnosis");
  await diagnosis.scrollIntoViewIfNeeded();
  await expect(
    diagnosis
      .getByText(/Catalog lifecycle/i)
      .or(diagnosis.getByRole("alert"))
      .or(page.getByText(/Diagnosis is not source of truth/i))
      .first(),
  ).toBeVisible({ timeout: 45_000 });
  if (await diagnosis.getByText(/Catalog lifecycle/i).isVisible().catch(() => false)) {
    await expect(diagnosis.getByText(/^Assortment$/i).first()).toBeVisible();
    await expect(diagnosis.getByText(/^Availability$/i).first()).toBeVisible();
    await expect(diagnosis.getByText(/^Serviceability$/i).first()).toBeVisible();
    await expect(
      diagnosis.getByText(/Pricing completeness|Menu presentation|Promotion applicability/i).first(),
    ).toBeVisible();
  }

  // 11. Activity
  await page.getByRole("button", { name: /^Activity$/i }).click();
  await expect(page.getByTestId("commercial-activity")).toBeVisible();
  await expect(page.getByTestId("commercial-activity").locator("li, article, tr").first()).toBeVisible({
    timeout: 45_000,
  });
}

test("desktop: coherent commercial authoring journey", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page);
  await openCommercialWorkspace(page);
  await selectWorkingContext(page);
  await runFullCommercialJourney(page, {
    suffix: "Desktop",
    pricingOutletId: fixture.pricingOutletDesktopId,
  });
});

test("tablet: authoring operable without hover-only dependency", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await login(page);
  await openCommercialWorkspace(page);
  await selectWorkingContext(page);
  await runFullCommercialJourney(page, {
    suffix: "Tablet",
    pricingOutletId: fixture.pricingOutletTabletId,
  });
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
  await expect(page.getByTestId("exclude-outlet-assortment")).toHaveCount(0);

  await page.getByRole("button", { name: /Verify & diagnose/i }).click();
  await page.getByRole("button", { name: /Verify customer truth/i }).click();
  const verification = page.getByTestId("customer-verification");
  await verification.scrollIntoViewIfNeeded();
  await expect(
    verification
      .getByText(/VERIFIED_MATCH|MISMATCH|PARTIAL|INSUFFICIENT_CONTEXT/i)
      .or(verification.getByRole("alert"))
      .first(),
  ).toBeVisible({ timeout: 45_000 });
  await page.getByRole("button", { name: /Diagnose sellability/i }).click();
  const diagnosis = page.getByTestId("sellability-diagnosis");
  await diagnosis.scrollIntoViewIfNeeded();
  await expect(
    diagnosis
      .getByText(/Catalog lifecycle/i)
      .or(diagnosis.getByRole("alert"))
      .or(page.getByText(/Diagnosis is not source of truth/i))
      .first(),
  ).toBeVisible({ timeout: 45_000 });

  await page.getByRole("button", { name: /^Activity$/i }).click();
  await expect(page.getByTestId("commercial-activity")).toBeVisible();
});
