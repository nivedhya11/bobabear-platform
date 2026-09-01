import { test, expect, type Page } from "@playwright/test";

const INSIDE = { latitude: 30.3256, longitude: 78.0436 };

async function openSelector(page: Page, mobile: boolean): Promise<void> {
  await page.goto("/order/");
  const trigger = mobile ? "deliver-to-orientation" : "deliver-to-header-orientation";
  await page.getByTestId(trigger).click();
  await expect(page.getByTestId("location-selector-dialog")).toBeVisible();
}

async function assertNoManualPin(page: Page): Promise<void> {
  await expect(page.getByText("Enter PIN manually")).toHaveCount(0);
  await expect(page.getByText(/missing PIN/i)).toHaveCount(0);
}

async function searchInsideRadiusToMap(page: Page): Promise<void> {
  await page.getByPlaceholder("Search area, street or landmark").fill("Clock Tower Dehradun");
  await expect(page.getByTestId("location-search-results")).toBeVisible({ timeout: 30_000 });
  const option = page.getByRole("option").filter({ hasText: /Chukkuwala/i }).first();
  await expect(option).toBeVisible({ timeout: 15_000 });
  await option.click();
  await expect(page.getByTestId("delivery-location-map-confirmation")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("delivery-map-container")).toBeVisible({ timeout: 45_000 });
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const container = document.querySelector('[data-testid="delivery-map-container"]');
        const rect = container?.getBoundingClientRect();
        const gmStyle = container?.querySelector(".gm-style");
        return Boolean(gmStyle && rect && rect.width > 0 && rect.height > 0);
      }),
    )
    .toBe(true);
}

for (const viewport of [
  { name: "desktop", width: 1440, height: 900, mobile: false },
  { name: "mobile", width: 390, height: 844, mobile: true },
] as const) {
  test(`IMP-036B UAT precert ${viewport.name}: search → map → serviceable`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openSelector(page, viewport.mobile);
    await assertNoManualPin(page);
    await searchInsideRadiusToMap(page);
    await assertNoManualPin(page);
    if (!viewport.mobile) {
      const panelWidth = await page.evaluate(() => {
        const panel = document.querySelector('[data-testid="location-selector-panel"]');
        return panel?.getBoundingClientRect().width ?? 0;
      });
      expect(panelWidth).toBeGreaterThan(400);
      expect(panelWidth).toBeLessThan(700);
    }
    await expect(page.getByText("Great — we deliver here.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /Confirm location/i })).toBeEnabled({
      timeout: 30_000,
    });
  });
}

test("IMP-036B UAT precert: pan beyond 9km blocks confirmation", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSelector(page, false);
  await searchInsideRadiusToMap(page);
  await expect(page.getByText("Great — we deliver here.")).toBeVisible({ timeout: 30_000 });

  // Programmatically re-center the live map far outside the 9km radius, then wait for idle reverse-geocode.
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const start = Date.now();
      const tick = (): void => {
        const g = (window as Window & { google?: typeof google }).google;
        const container = document.querySelector<HTMLElement>('[data-testid="delivery-map-container"]');
        const inner = container?.querySelector<HTMLElement>("div");
        const mapCandidate = inner as HTMLElement & { __gm?: { map?: google.maps.Map } };
        const map = mapCandidate?.__gm?.map;
        if (g?.maps && map) {
          map.setCenter({ lat: 30.5, lng: 78.2 });
          g.maps.event.trigger(map, "idle");
          resolve();
          return;
        }
        if (Date.now() - start > 20_000) resolve();
        window.setTimeout(tick, 250);
      };
      tick();
    });
  });

  await expect(page.getByText(/don't deliver/i)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: /Confirm location/i })).toBeDisabled();
});

test("IMP-036B UAT precert: outside-radius search is not serviceable", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSelector(page, false);
  await page.getByPlaceholder("Search area, street or landmark").fill("Mussoorie Mall Road");
  await expect(page.getByTestId("location-search-results")).toBeVisible({ timeout: 30_000 });
  const option = page.getByRole("option").first();
  await expect(option).toBeVisible({ timeout: 15_000 });
  await option.click();
  await expect(page.getByTestId("delivery-location-map-confirmation")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/don't deliver/i)).toBeVisible({ timeout: 45_000 });
});

test("IMP-036B UAT precert: current location → map → serviceable", async ({ page, context }) => {
  test.setTimeout(180_000);
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(INSIDE);
  await page.setViewportSize({ width: 390, height: 844 });
  await openSelector(page, true);
  await assertNoManualPin(page);
  await page.getByRole("button", { name: "Use current location" }).click();
  await expect(page.getByTestId("delivery-location-map-confirmation")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("delivery-map-container")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Great — we deliver here.")).toBeVisible({ timeout: 45_000 });
});

test("IMP-036B UAT precert: header orientation is human-readable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/order/");
  const header = page.getByTestId("deliver-to-header-orientation");
  await expect(header).toBeVisible();
  await expect(header).toContainText(/Dehradun/i);
  await expect(header).not.toContainText(/SERVICEABLE|NOT_SERVICEABLE|INDETERMINATE/i);
});
