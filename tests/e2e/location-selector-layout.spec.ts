import { test, expect, type Page } from "@playwright/test";

const VIEWPORTS = [
  { name: "320x568", width: 320, height: 568 },
  { name: "375x667", width: 375, height: 667 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1920x1080", width: 1920, height: 1080 },
] as const;

async function openSelector(page: Page, triggerTestId: string): Promise<void> {
  await page.goto("/order/");
  await page.getByTestId(triggerTestId).click();
  await expect(page.getByTestId("location-selector-dialog")).toBeVisible();
}

async function assertSelectorShell(page: Page): Promise<void> {
  const dialog = page.getByTestId("location-selector-dialog");

  await expect(page.getByRole("heading", { name: /Select delivery location/i })).toBeVisible();
  await expect(page.getByPlaceholder("Search area, street or landmark")).toBeVisible();
  await expect(page.getByRole("button", { name: "Use current location" })).toBeVisible();
  await expect(page.getByText("Enter PIN manually")).toBeVisible();

  const metrics = await page.evaluate(() => {
    const dialogEl = document.querySelector('[data-testid="location-selector-dialog"]');
    const panelEl = document.querySelector('[data-testid="location-selector-panel"]');
    const bodyEl = document.querySelector('[data-testid="location-selector-body"]');
    const dialogRect = dialogEl?.getBoundingClientRect();
    const panelRect = panelEl?.getBoundingClientRect();
    const bodyRect = bodyEl?.getBoundingClientRect();
    return {
      dialogHeight: dialogRect?.height ?? 0,
      panelHeight: panelRect?.height ?? 0,
      bodyHeight: bodyRect?.height ?? 0,
      bodyClientHeight: bodyEl instanceof HTMLElement ? bodyEl.clientHeight : 0,
      bodyScrollHeight: bodyEl instanceof HTMLElement ? bodyEl.scrollHeight : 0,
      inHeader: !!dialogEl?.closest("header"),
      viewportHeight: window.innerHeight,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });

  expect(metrics.inHeader).toBe(false);
  expect(metrics.dialogHeight).toBeGreaterThan(200);
  expect(metrics.panelHeight).toBeGreaterThan(200);
  expect(metrics.bodyHeight).toBeGreaterThan(120);
  expect(metrics.bodyClientHeight).toBeGreaterThan(0);
  expect(metrics.bodyScrollHeight).toBeGreaterThan(metrics.bodyClientHeight / 2);
  expect(metrics.horizontalOverflow).toBe(false);

  await page.getByTestId("location-selector-panel").getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toBeHidden();
}

for (const viewport of VIEWPORTS) {
  test(`location selector layout ${viewport.name} without Maps JS`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const trigger =
      viewport.width >= 1024 ? "deliver-to-header-orientation" : "deliver-to-orientation";
    await openSelector(page, trigger);
    await assertSelectorShell(page);
  });
}

test("location selector layout desktop with mocked Maps capability", async ({ page }) => {
  await page.addInitScript(() => {
    (window as Window & { __BOBA_MAPS_JS_CONFIGURED__?: boolean }).__BOBA_MAPS_JS_CONFIGURED__ =
      true;
  });
  await page.route("**/api/v1/location/status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        configured: true,
        provider: "google_maps",
        status: "CONFIGURED",
      }),
    });
  });
  await page.setViewportSize({ width: 1366, height: 768 });
  await openSelector(page, "deliver-to-header-orientation");
  await assertSelectorShell(page);
});
