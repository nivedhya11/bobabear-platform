import type { Page } from "@playwright/test";

type MockGoogleMapsOptions = Readonly<{
  /** Milliseconds before importLibrary becomes available (simulates Google bootstrap race). */
  importLibraryDelayMs?: number;
  /** When true, importLibrary never becomes available. */
  permanentFailure?: boolean;
}>;

/**
 * E2E-only Maps JavaScript API stand-in. Product still requires a build-time
 * `NEXT_PUBLIC_BOBA_BEAR_GOOGLE_MAPS_BROWSER_KEY` fixture so `isMapsJsConfigured()`
 * is true; this mock supplies `google.maps.importLibrary` without calling Google.
 */
export async function installMockGoogleMaps(
  page: Page,
  options: MockGoogleMapsOptions = {},
): Promise<void> {
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

      const prior = (window as Window & { bobaGoogleMapsBootstrapReady?: () => void })
        .bobaGoogleMapsBootstrapReady;
      (window as Window & { bobaGoogleMapsBootstrapReady?: () => void }).bobaGoogleMapsBootstrapReady =
        () => {
          prior?.();
        };
    },
    { delayMs: importLibraryDelayMs, failPermanently: permanentFailure },
  );
}

/** Route mocks for Places-backed location APIs used by map-first address flows. */
export async function installLocationProviderMocks(page: Page): Promise<void> {
  await page.route("**/api/v1/location/status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        configured: true,
        provider: "google_maps",
        status: "CONFIGURED",
      }),
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
          postalCode: "248001",
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
}
