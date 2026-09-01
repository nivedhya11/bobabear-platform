import { afterEach, describe, expect, it, vi } from "vitest";

import { getMapsBrowserKey, isMapsJsConfigured, mapsJsConfigStatus } from "@/lib/customer-location/maps-js-config";
import {
  getMapsLoaderFailureReason,
  loadGoogleMapsJs,
  resetMapsJsLoaderForTests,
} from "@/lib/customer-location/maps-js-loader";

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

  it("does not resolve until importLibrary yields a Map constructor", async () => {
    process.env.NEXT_PUBLIC_BOBA_BEAR_GOOGLE_MAPS_BROWSER_KEY = "browser-key-fixture";
    const appendSpy = vi.spyOn(document.head, "appendChild");
    const promise = loadGoogleMapsJs();
    const script = appendSpy.mock.calls.find(
      (call) => (call[0] as HTMLElement).id === "boba-google-maps-js",
    )?.[0] as HTMLScriptElement | undefined;

    (window as unknown as { google?: { maps: { importLibrary?: unknown; event: typeof google.maps.event } } }).google = {
      maps: {
        event: { trigger: vi.fn() },
      },
    };
    script?.dispatchEvent(new Event("load"));
    await expect(promise).resolves.toBeNull();
    expect(getMapsLoaderFailureReason()).toBe("MAP_LIBRARY_NOT_READY");
  });

  it("resolves only after importLibrary yields a Map constructor", async () => {
    process.env.NEXT_PUBLIC_BOBA_BEAR_GOOGLE_MAPS_BROWSER_KEY = "browser-key-fixture";
    const MapCtor = vi.fn(function MapMock() {
      return {};
    });
    const importLibrary = vi.fn(async () => ({ Map: MapCtor }));
    (window as unknown as { google?: { maps: { importLibrary: typeof importLibrary; event: typeof google.maps.event } } }).google = {
      maps: {
        importLibrary,
        event: { trigger: vi.fn() },
      },
    };

    const library = await loadGoogleMapsJs();
    expect(importLibrary).toHaveBeenCalledWith("maps");
    expect(library?.Map).toBe(MapCtor);
    expect(typeof library?.Map).toBe("function");
  });

  it("shares one bootstrap request across concurrent callers", async () => {
    process.env.NEXT_PUBLIC_BOBA_BEAR_GOOGLE_MAPS_BROWSER_KEY = "browser-key-fixture";
    const MapCtor = vi.fn(function MapMock() {
      return {};
    });
    const importLibrary = vi.fn(async () => ({ Map: MapCtor }));
    (window as unknown as { google?: { maps: { importLibrary: typeof importLibrary; event: typeof google.maps.event } } }).google = {
      maps: {
        importLibrary,
        event: { trigger: vi.fn() },
      },
    };

    const appendSpy = vi.spyOn(document.head, "appendChild");
    const first = loadGoogleMapsJs();
    const second = loadGoogleMapsJs();
    const scriptCalls = appendSpy.mock.calls.filter(
      (call) => (call[0] as HTMLElement).id === "boba-google-maps-js",
    );
    expect(scriptCalls).toHaveLength(0);
    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe(b);
    expect(importLibrary).toHaveBeenCalledTimes(1);
  });

  it("does not treat bare window.google.maps object presence as readiness", async () => {
    process.env.NEXT_PUBLIC_BOBA_BEAR_GOOGLE_MAPS_BROWSER_KEY = "browser-key-fixture";
    const appendSpy = vi.spyOn(document.head, "appendChild");
    (window as unknown as { google?: { maps: Record<string, never> } }).google = {
      maps: {},
    };

    const promise = loadGoogleMapsJs();
    const script = appendSpy.mock.calls.find(
      (call) => (call[0] as HTMLElement).id === "boba-google-maps-js",
    )?.[0] as HTMLScriptElement | undefined;
    script?.dispatchEvent(new Event("load"));
    await expect(promise).resolves.toBeNull();
    expect(getMapsLoaderFailureReason()).toBe("MAP_LIBRARY_NOT_READY");
  });

  it("allows retry after a failed load", async () => {
    process.env.NEXT_PUBLIC_BOBA_BEAR_GOOGLE_MAPS_BROWSER_KEY = "browser-key-fixture";
    const MapCtor = vi.fn(function MapMock() {
      return {};
    });
    const importLibrary = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ Map: MapCtor });

    (window as unknown as { google?: { maps: { importLibrary: typeof importLibrary; event: typeof google.maps.event } } }).google = {
      maps: {
        importLibrary,
        event: { trigger: vi.fn() },
      },
    };

    await expect(loadGoogleMapsJs()).resolves.toBeNull();
    const library = await loadGoogleMapsJs();
    expect(library?.Map).toBe(MapCtor);
    expect(importLibrary).toHaveBeenCalledTimes(2);
  });
});
