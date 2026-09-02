import { test, expect, type Page } from "@playwright/test";

type MockGoogleMapsOptions = Readonly<{
  /** Milliseconds before importLibrary becomes available (simulates Google bootstrap race). */
  importLibraryDelayMs?: number;
  /** When true, importLibrary never becomes available. */
  permanentFailure?: boolean;
}>;

async function installMockGoogleMaps(page: Page, options: MockGoogleMapsOptions = {}): Promise<void> {
  const { importLibraryDelayMs = 0, permanentFailure = false } = options;
  await page.addInitScript(
    ({ delayMs, failPermanently }) => {
      const MapMock = function MapMock(
        container: HTMLElement,
        options: { center: { lat: number; lng: number } },
      ) {
        const inner = document.createElement("div");
        inner.className = "gm-style";
        container.appendChild(inner);
        return {
          getCenter: () => ({
            lat: () => options.center.lat,
            lng: () => options.center.lng,
          }),
          setCenter: () => undefined,
          addListener: () => ({ remove: () => undefined }),
        };
      };

      let importLibraryReady = delayMs <= 0 && !failPermanently;
      if (delayMs > 0 && !failPermanently) {
        window.setTimeout(() => {
          importLibraryReady = true;
        }, delayMs);
      }

      const mapsMock: Record<string, unknown> = {
        event: {
          trigger: () => undefined,
        },
      };

      Object.defineProperty(mapsMock, "importLibrary", {
        configurable: true,
        get() {
          if (failPermanently) return undefined;
          if (!importLibraryReady) return undefined;
          return async (name: string) => {
            if (name === "maps") return { Map: MapMock };
            throw new Error(`Unsupported library: ${name}`);
          };
        },
      });

      (window as unknown as { google: { maps: typeof mapsMock } }).google = { maps: mapsMock };

      const prior = (window as Window & { bobaGoogleMapsBootstrapReady?: () => void }).bobaGoogleMapsBootstrapReady;
      (window as Window & { bobaGoogleMapsBootstrapReady?: () => void }).bobaGoogleMapsBootstrapReady = () => {
        prior?.();
      };
    },
    { delayMs: importLibraryDelayMs, failPermanently: permanentFailure },
  );
}

async function openSelector(page: Page): Promise<void> {
  await page.goto("/order/");
  const viewport = page.viewportSize();
  const trigger =
    viewport && viewport.width >= 1024
      ? "deliver-to-header-orientation"
      : "deliver-to-orientation";
  await page.getByTestId(trigger).click();
  await expect(page.getByTestId("location-selector-dialog")).toBeVisible();
}

test("search selection enters map confirmation when Maps JS is configured", async ({ page }) => {
  await installMockGoogleMaps(page);
  await page.addInitScript(() => {
    (window as Window & { __BOBA_MAPS_JS_CONFIGURED__?: boolean }).__BOBA_MAPS_JS_CONFIGURED__ = true;
  });

  await page.route("**/api/v1/location/status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, configured: true, provider: "google_maps", status: "CONFIGURED" }),
    });
  });

  await page.route("**/api/v1/location/autocomplete", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        suggestions: [{ placeId: "place-rajpur", label: "Rajpur Road, Dehradun" }],
      }),
    });
  });

  await page.route("**/api/v1/location/place", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
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
        ok: true,
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

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const container = document.querySelector('[data-testid="delivery-map-container"]');
        return container?.querySelector(".gm-style") !== null;
      }),
    )
    .toBe(true);
});

test("provider readiness race: early ISBT query auto-searches once status resolves", async ({ page }) => {
  await page.addInitScript(() => {
    (window as Window & { __BOBA_MAPS_JS_CONFIGURED__?: boolean }).__BOBA_MAPS_JS_CONFIGURED__ = true;
  });

  let releaseStatus: () => void = () => {};
  const statusGate = new Promise<void>((resolve) => {
    releaseStatus = resolve;
  });

  await page.route("**/api/v1/location/status", async (route) => {
    await statusGate;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, configured: true, provider: "google_maps", status: "CONFIGURED" }),
    });
  });

  await page.route("**/api/v1/location/autocomplete", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        suggestions: [{ placeId: "place-isbt", label: "ISBT, Dehradun, Uttarakhand, India" }],
      }),
    });
  });

  await openSelector(page);
  await page.getByPlaceholder("Search area, street or landmark").fill("ISBT");
  releaseStatus();
  await expect(page.getByTestId("location-search-results")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("option", { name: /ISBT/i })).toBeVisible();
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
      body: JSON.stringify({ ok: true, configured: true, provider: "google_maps", status: "CONFIGURED" }),
    });
  });

  await page.route("**/api/v1/location/reverse-geocode", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
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
        ok: true,
        decision: { status: "SERVICEABLE", evaluatedAt: "2026-09-01T00:00:00.000Z" },
      }),
    });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await openSelector(page);
  await page.getByRole("button", { name: "Use current location" }).click();
  await expect(page.getByTestId("delivery-location-map-confirmation")).toBeVisible({ timeout: 15_000 });
});

test("delayed Google bootstrap readiness: ISBT map renders without fallback", async ({ page }) => {
  await installMockGoogleMaps(page, { importLibraryDelayMs: 150 });
  await page.route("**/maps.googleapis.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "window.bobaGoogleMapsBootstrapReady && window.bobaGoogleMapsBootstrapReady();",
    });
  });
  await page.addInitScript(() => {
    (window as Window & { __BOBA_MAPS_JS_CONFIGURED__?: boolean }).__BOBA_MAPS_JS_CONFIGURED__ = true;
  });

  await page.route("**/api/v1/location/status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, configured: true, provider: "google_maps", status: "CONFIGURED" }),
    });
  });

  await page.route("**/api/v1/location/autocomplete", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        suggestions: [{ placeId: "place-isbt", label: "ISBT, Dehradun, Uttarakhand, India" }],
      }),
    });
  });

  await page.route("**/api/v1/location/place", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        location: {
          displayAddress: "ISBT, Dehradun, Uttarakhand, India",
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
        ok: true,
        decision: { status: "SERVICEABLE", evaluatedAt: "2026-09-01T00:00:00.000Z" },
      }),
    });
  });

  await openSelector(page);
  await page.getByPlaceholder("Search area, street or landmark").fill("ISBT");
  await expect(page.getByTestId("location-search-results")).toBeVisible();
  await page.getByRole("option", { name: /ISBT/i }).click();
  await expect(page.getByTestId("delivery-location-map-confirmation")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Map preview isn't available/i)).toHaveCount(0);

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const container = document.querySelector('[data-testid="delivery-map-container"]');
        return container?.querySelector(".gm-style") !== null;
      }),
    )
    .toBe(true);
});

test("permanent Maps readiness failure shows safe fallback", async ({ page }) => {
  await installMockGoogleMaps(page, { permanentFailure: true });
  await page.route("**/maps.googleapis.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "window.bobaGoogleMapsBootstrapReady && window.bobaGoogleMapsBootstrapReady();",
    });
  });
  await page.addInitScript(() => {
    (window as Window & { __BOBA_MAPS_JS_CONFIGURED__?: boolean }).__BOBA_MAPS_JS_CONFIGURED__ = true;
  });

  await page.route("**/api/v1/location/status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, configured: true, provider: "google_maps", status: "CONFIGURED" }),
    });
  });

  await page.route("**/api/v1/location/autocomplete", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        suggestions: [{ placeId: "place-isbt", label: "ISBT, Dehradun, Uttarakhand, India" }],
      }),
    });
  });

  await page.route("**/api/v1/location/place", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        location: {
          displayAddress: "ISBT, Dehradun, Uttarakhand, India",
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
        ok: true,
        decision: { status: "SERVICEABLE", evaluatedAt: "2026-09-01T00:00:00.000Z" },
      }),
    });
  });

  await openSelector(page);
  await page.getByPlaceholder("Search area, street or landmark").fill("ISBT");
  await page.getByRole("option", { name: /ISBT/i }).click();
  await expect(page.getByTestId("delivery-location-map-confirmation")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/We couldn't load the map right now/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("delivery-map-init-error")).toHaveText("MAP_LIBRARY_NOT_READY");
});

test("Back from map refreshes autocomplete with a new session token", async ({ page }) => {
  await installMockGoogleMaps(page);
  await page.addInitScript(() => {
    (window as Window & { __BOBA_MAPS_JS_CONFIGURED__?: boolean }).__BOBA_MAPS_JS_CONFIGURED__ = true;
  });

  const autocompleteTokens: string[] = [];
  const placeTokens: string[] = [];

  await page.route("**/api/v1/location/status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, configured: true, provider: "google_maps", status: "CONFIGURED" }),
    });
  });

  await page.route("**/api/v1/location/autocomplete", async (route) => {
    const body = route.request().postDataJSON() as { sessionToken: string };
    autocompleteTokens.push(body.sessionToken);
    const suggestions =
      autocompleteTokens.length === 1
        ? [{ placeId: "place-delhi-a", label: "Delhi, India A" }]
        : [{ placeId: "place-delhi-b", label: "Delhi, India B" }];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, suggestions }),
    });
  });

  await page.route("**/api/v1/location/place", async (route) => {
    const body = route.request().postDataJSON() as { placeId: string; sessionToken: string };
    placeTokens.push(body.sessionToken);
    const label = body.placeId === "place-delhi-a" ? "Delhi, India A" : "Delhi, India B";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        location: {
          displayAddress: `${label}, India`,
          postalCode: null,
          pinConfirmed: false,
          locality: "Delhi",
          administrativeArea: "Delhi",
          stateCode: "IN-DL",
          country: "India",
          countryCode: "IN",
          latitude: "28.6139000",
          longitude: "77.2090000",
        },
      }),
    });
  });

  await page.route("**/api/v1/serviceability/evaluate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        decision: { status: "SERVICEABLE", evaluatedAt: "2026-09-01T00:00:00.000Z" },
      }),
    });
  });

  await openSelector(page);
  const searchInput = page.getByPlaceholder("Search area, street or landmark");
  await searchInput.fill("delhi");
  await expect(page.getByTestId("location-search-results")).toBeVisible();
  await expect(page.getByRole("option", { name: "Delhi, India A" })).toBeVisible();
  expect(autocompleteTokens).toHaveLength(1);
  const firstToken = autocompleteTokens[0]!;

  await page.getByRole("option", { name: "Delhi, India A" }).click();
  await expect(page.getByTestId("delivery-location-map-confirmation")).toBeVisible({ timeout: 15_000 });
  expect(placeTokens).toEqual([firstToken]);

  await page.getByRole("button", { name: "Back" }).click();
  await expect(searchInput).toHaveValue("delhi");
  await expect(page.getByRole("option", { name: "Delhi, India A" })).toHaveCount(0);
  await expect(page.getByText("Finding locations…")).toBeVisible();

  await expect.poll(() => autocompleteTokens.length).toBe(2);
  const secondToken = autocompleteTokens[1]!;
  expect(secondToken).not.toBe(firstToken);

  await expect(page.getByRole("option", { name: "Delhi, India B" })).toBeVisible();
  await page.getByRole("option", { name: "Delhi, India B" }).click();
  await expect(page.getByTestId("delivery-location-map-confirmation")).toBeVisible({ timeout: 15_000 });
  expect(placeTokens).toEqual([firstToken, secondToken]);
});
