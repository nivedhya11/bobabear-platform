import { afterEach, describe, expect, it, vi } from "vitest";

import { getMapsBrowserKey, isMapsJsConfigured, mapsJsConfigStatus } from "@/lib/customer-location/maps-js-config";
import { loadGoogleMapsJs, resetMapsJsLoaderForTests } from "@/lib/customer-location/maps-js-loader";

describe("maps-js-config", () => {
  const original = process.env.NEXT_PUBLIC_BOBA_BEAR_GOOGLE_MAPS_BROWSER_KEY;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_BOBA_BEAR_GOOGLE_MAPS_BROWSER_KEY;
    } else {
      process.env.NEXT_PUBLIC_BOBA_BEAR_GOOGLE_MAPS_BROWSER_KEY = original;
    }
    resetMapsJsLoaderForTests();
  });

  it("treats placeholder values as unconfigured", () => {
    process.env.NEXT_PUBLIC_BOBA_BEAR_GOOGLE_MAPS_BROWSER_KEY =
      "replace-with-generated-local-maps-js-browser-key";
    expect(isMapsJsConfigured()).toBe(false);
    expect(getMapsBrowserKey()).toBeNull();
  });

  it("reports configured status without exposing key material", () => {
    process.env.NEXT_PUBLIC_BOBA_BEAR_GOOGLE_MAPS_BROWSER_KEY = "browser-key-fixture";
    const status = mapsJsConfigStatus();
    expect(status.configured).toBe(true);
    expect(status.envKey).toBe("NEXT_PUBLIC_BOBA_BEAR_GOOGLE_MAPS_BROWSER_KEY");
    expect(JSON.stringify(status)).not.toContain("browser-key-fixture");
  });
});

describe("maps-js-loader", () => {
  afterEach(() => {
    resetMapsJsLoaderForTests();
    document.getElementById("boba-google-maps-js")?.remove();
    delete (window as { google?: unknown }).google;
  });

  it("returns null when browser key is absent", async () => {
    delete process.env.NEXT_PUBLIC_BOBA_BEAR_GOOGLE_MAPS_BROWSER_KEY;
    await expect(loadGoogleMapsJs()).resolves.toBeNull();
  });

  it("loads maps script lazily when key is present", async () => {
    process.env.NEXT_PUBLIC_BOBA_BEAR_GOOGLE_MAPS_BROWSER_KEY = "browser-key-fixture";
    const appendSpy = vi.spyOn(document.head, "appendChild");
    const promise = loadGoogleMapsJs();
    const script = appendSpy.mock.calls.find(
      (call) => (call[0] as HTMLElement).id === "boba-google-maps-js",
    )?.[0] as HTMLScriptElement | undefined;
    expect(script?.src).toContain("maps.googleapis.com/maps/api/js");
    expect(script?.src).toContain("browser-key-fixture");
    (window as { google?: { maps: typeof google.maps } }).google = {
      maps: {} as typeof google.maps,
    };
    script?.onload?.(new Event("load"));
    await expect(promise).resolves.toBe(window.google!.maps);
  });
});
