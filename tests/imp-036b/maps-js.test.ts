import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    process.env.NEXT_PUBLIC_BOBA_BEAR_GOOGLE_MAPS_BROWSER_KEY = "browser-key-fixture";
  });

  afterEach(() => {
    resetMapsJsLoaderForTests();
    document.getElementById("boba-google-maps-js")?.remove();
    delete (window as { google?: unknown }).google;
    vi.useRealTimers();
  });

  function MapCtorMock() {
    return {};
  }

  function installImportLibrary(importLibrary: (...args: unknown[]) => Promise<{ Map: typeof MapCtorMock }>) {
    (window as unknown as { google?: { maps: { importLibrary: typeof importLibrary; event: typeof google.maps.event } } }).google = {
      maps: {
        importLibrary,
        event: { trigger: vi.fn() },
      },
    };
  }

  function fireBootstrapCallback(): void {
    const callback = (window as Window & { bobaGoogleMapsBootstrapReady?: () => void }).bobaGoogleMapsBootstrapReady;
    callback?.();
  }

  it("returns null when browser key is absent", async () => {
    delete process.env.NEXT_PUBLIC_BOBA_BEAR_GOOGLE_MAPS_BROWSER_KEY;
    await expect(loadGoogleMapsJs()).resolves.toBeNull();
  });

  it("scenario A: waits for importLibrary after bootstrap, then succeeds", async () => {
    const importLibrary = vi.fn(async () => ({ Map: MapCtorMock }));
    const appendSpy = vi.spyOn(document.head, "appendChild");

    const promise = loadGoogleMapsJs();
    const script = appendSpy.mock.calls.find(
      (call) => (call[0] as HTMLElement).id === "boba-google-maps-js",
    )?.[0] as HTMLScriptElement | undefined;

    expect(script?.src).toContain("callback=bobaGoogleMapsBootstrapReady");
    expect(script?.src).toContain("loading=async");

    fireBootstrapCallback();
    await vi.advanceTimersByTimeAsync(100);
    installImportLibrary(importLibrary);

    const library = await promise;
    expect(library?.Map).toBe(MapCtorMock);
    expect(typeof library?.Map).toBe("function");
    expect(importLibrary).toHaveBeenCalledWith("maps");
  });

  it("scenario B: retries transient importLibrary rejection within bounded window", async () => {
    const importLibrary = vi
      .fn()
      .mockRejectedValueOnce(new Error("not ready"))
      .mockResolvedValueOnce({ Map: MapCtorMock });
    installImportLibrary(importLibrary);

    const promise = loadGoogleMapsJs();
    await vi.advanceTimersByTimeAsync(100);
    const library = await promise;

    expect(library?.Map).toBe(MapCtorMock);
    expect(importLibrary.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("scenario C: times out when importLibrary never becomes usable", async () => {
    const appendSpy = vi.spyOn(document.head, "appendChild");
    const promise = loadGoogleMapsJs();
    const script = appendSpy.mock.calls.find(
      (call) => (call[0] as HTMLElement).id === "boba-google-maps-js",
    )?.[0] as HTMLScriptElement | undefined;

    (window as unknown as { google?: { maps: Record<string, never> } }).google = { maps: {} };
    fireBootstrapCallback();

    const timeout = promise.then((value) => ({ value }));
    await vi.advanceTimersByTimeAsync(6_000);
    const result = await timeout;

    expect(result.value).toBeNull();
    expect(getMapsLoaderFailureReason()).toBe("MAP_LIBRARY_NOT_READY");
    expect(script).toBeDefined();
  });

  it("scenario D: shares one bootstrap and readiness flow across concurrent callers", async () => {
    const importLibrary = vi.fn(async () => ({ Map: MapCtorMock }));
    installImportLibrary(importLibrary);

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

  it("scenario E: returns cached library immediately after success", async () => {
    const importLibrary = vi.fn(async () => ({ Map: MapCtorMock }));
    installImportLibrary(importLibrary);

    const first = await loadGoogleMapsJs();
    const second = await loadGoogleMapsJs();

    expect(first).toBe(second);
    expect(importLibrary).toHaveBeenCalledTimes(1);
  });

  it("resolves only after importLibrary yields a Map constructor", async () => {
    const importLibrary = vi.fn(async () => ({ Map: MapCtorMock }));
    installImportLibrary(importLibrary);

    const library = await loadGoogleMapsJs();
    expect(importLibrary).toHaveBeenCalledWith("maps");
    expect(library?.Map).toBe(MapCtorMock);
    expect(typeof library?.Map).toBe("function");
  });

  it("does not treat bare window.google.maps object presence as readiness", async () => {
    const appendSpy = vi.spyOn(document.head, "appendChild");
    (window as unknown as { google?: { maps: Record<string, never> } }).google = { maps: {} };

    const promise = loadGoogleMapsJs();
    fireBootstrapCallback();
    const outcome = promise.then((value) => ({ value }));
    await vi.advanceTimersByTimeAsync(6_000);
    const result = await outcome;

    expect(result.value).toBeNull();
    expect(getMapsLoaderFailureReason()).toBe("MAP_LIBRARY_NOT_READY");
    expect(
      appendSpy.mock.calls.some((call) => (call[0] as HTMLElement).id === "boba-google-maps-js"),
    ).toBe(true);
  });

  it("allows explicit retry after a final failed readiness attempt", async () => {
    const importLibrary = vi
      .fn()
      .mockRejectedValue(new Error("network"));

    installImportLibrary(importLibrary);

    const firstPromise = loadGoogleMapsJs();
    await vi.advanceTimersByTimeAsync(6_000);
    await expect(firstPromise).resolves.toBeNull();

    importLibrary.mockReset();
    importLibrary.mockResolvedValue({ Map: MapCtorMock });

    const library = await loadGoogleMapsJs();
    expect(library?.Map).toBe(MapCtorMock);
  });

  it("does not inject duplicate Maps scripts when a script tag already exists", async () => {
    const importLibrary = vi.fn(async () => ({ Map: MapCtorMock }));
    const existing = document.createElement("script");
    existing.id = "boba-google-maps-js";
    document.head.appendChild(existing);

    const appendSpy = vi.spyOn(document.head, "appendChild");
    (window as unknown as { google?: { maps: Record<string, never> } }).google = { maps: {} };

    const promise = loadGoogleMapsJs();
    fireBootstrapCallback();
    await vi.advanceTimersByTimeAsync(50);
    installImportLibrary(importLibrary);
    await vi.advanceTimersByTimeAsync(100);
    await promise;

    const scriptCalls = appendSpy.mock.calls.filter(
      (call) => (call[0] as HTMLElement).id === "boba-google-maps-js",
    );
    expect(scriptCalls).toHaveLength(0);
  });
});
