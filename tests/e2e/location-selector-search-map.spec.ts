import { test, expect, type Page } from "@playwright/test";

async function openSelector(page: Page): Promise<void> {
  await page.goto("/order/");
  await page.getByTestId("deliver-to-orientation").click();
  await expect(page.getByTestId("location-selector-dialog")).toBeVisible();
}

test("search selection enters map confirmation when Maps JS is configured", async ({ page }) => {
  await page.addInitScript(() => {
    (window as Window & { __BOBA_MAPS_JS_CONFIGURED__?: boolean }).__BOBA_MAPS_JS_CONFIGURED__ = true;
  });

  await page.route("**/api/v1/location/status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ configured: true, provider: "google_maps", status: "CONFIGURED" }),
    });
  });

  await page.route("**/api/v1/location/autocomplete", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        suggestions: [{ placeId: "place-rajpur", label: "Rajpur Road, Dehradun" }],
      }),
    });
  });

  await page.route("**/api/v1/location/place", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        location: {
          displayAddress: "Rajpur Road, Dehradun, Uttarakhand, India",
          postalCode: null,
          pinConfirmed: false,
          locality: "Dehradun",
          administrativeArea: "Uttarakhand",
          stateCode: "IN-UT",
          country: "India",
          countryCode: "IN",
          latitude: "30.3256000",
          longitude: "78.0436000",
        },
      }),
    });
  });

  await page.route("**/api/v1/serviceability/evaluate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        decision: {
          status: "SERVICEABLE",
          evaluatedAt: "2026-09-01T00:00:00.000Z",
          selectedOutletId: "00000000-0000-4000-8000-000000000001",
        },
      }),
    });
  });

  await openSelector(page);
  await page.getByPlaceholder("Search area, street or landmark").fill("Rajpur");
  await expect(page.getByTestId("location-search-results")).toBeVisible();
  await page.getByRole("option", { name: "Rajpur Road, Dehradun" }).click();
  await expect(page.getByTestId("delivery-location-map-confirmation")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Enter PIN manually")).toHaveCount(0);
});

test("current location enters map confirmation on mobile viewport", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 30.3256, longitude: 78.0436 });

  await page.addInitScript(() => {
    (window as Window & { __BOBA_MAPS_JS_CONFIGURED__?: boolean }).__BOBA_MAPS_JS_CONFIGURED__ = true;
  });

  await page.route("**/api/v1/location/status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ configured: true, provider: "google_maps", status: "CONFIGURED" }),
    });
  });

  await page.route("**/api/v1/location/reverse-geocode", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        location: {
          displayAddress: "Rajpur Road, Dehradun, Uttarakhand, India",
          postalCode: null,
          pinConfirmed: false,
          locality: "Dehradun",
          administrativeArea: "Uttarakhand",
          stateCode: "IN-UT",
          country: "India",
          countryCode: "IN",
          latitude: "30.3256000",
          longitude: "78.0436000",
        },
      }),
    });
  });

  await page.route("**/api/v1/serviceability/evaluate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        decision: { status: "SERVICEABLE", evaluatedAt: "2026-09-01T00:00:00.000Z" },
      }),
    });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await openSelector(page);
  await page.getByRole("button", { name: "Use current location" }).click();
  await expect(page.getByTestId("delivery-location-map-confirmation")).toBeVisible({ timeout: 15_000 });
});
