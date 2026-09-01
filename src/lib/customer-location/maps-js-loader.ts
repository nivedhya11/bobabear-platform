/**
 * Lazy Maps JavaScript API loader — confirmation UI only (IMP-036B UAT).
 *
 * Resolves only after `google.maps.importLibrary("maps")` yields a usable Map
 * constructor. Script `load` / bare `window.google.maps` presence is not treated
 * as readiness when using `loading=async`.
 */
import { getMapsBrowserKey } from "./maps-js-config";

const MAPS_SCRIPT_ID = "boba-google-maps-js";

export type MapsLoaderFailureReason =
  | "MAP_LIBRARY_NOT_READY"
  | "MAP_CONSTRUCTOR_FAILED"
  | "MAP_AUTHORIZATION_FAILED";

export type LoadedGoogleMapsLibrary = Readonly<{
  Map: typeof google.maps.Map;
  event: typeof google.maps.event;
}>;

let loadPromise: Promise<LoadedGoogleMapsLibrary | null> | null = null;
let loadedLibrary: LoadedGoogleMapsLibrary | null = null;
let lastFailureReason: MapsLoaderFailureReason | null = null;

function isMapConstructorReady(value: unknown): value is typeof google.maps.Map {
  return typeof value === "function";
}

async function resolveMapsLibrary(): Promise<LoadedGoogleMapsLibrary | null> {
  const importLibrary = window.google?.maps?.importLibrary;
  if (typeof importLibrary !== "function") {
    lastFailureReason = "MAP_LIBRARY_NOT_READY";
    return null;
  }

  try {
    const mapsLib = (await importLibrary.call(window.google!.maps, "maps")) as {
      Map?: typeof google.maps.Map;
    };
    if (!isMapConstructorReady(mapsLib?.Map)) {
      lastFailureReason = "MAP_CONSTRUCTOR_FAILED";
      return null;
    }
    lastFailureReason = null;
    return Object.freeze({
      Map: mapsLib.Map,
      event: window.google!.maps.event,
    });
  } catch {
    lastFailureReason = "MAP_LIBRARY_NOT_READY";
    return null;
  }
}

function waitForMapsScript(script: HTMLScriptElement): Promise<void> {
  return new Promise((resolve, reject) => {
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("maps-script-error")), { once: true });
  });
}

function injectMapsScript(apiKey: string): Promise<void> {
  const existing = document.getElementById(MAPS_SCRIPT_ID);
  if (existing instanceof HTMLScriptElement) {
    if (typeof window.google?.maps?.importLibrary === "function") return Promise.resolve();
    return waitForMapsScript(existing);
  }

  const script = document.createElement("script");
  script.id = MAPS_SCRIPT_ID;
  script.async = true;
  script.defer = true;
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async`;
  document.head.appendChild(script);
  return waitForMapsScript(script);
}

async function loadMapsLibraryInternal(): Promise<LoadedGoogleMapsLibrary | null> {
  const apiKey = getMapsBrowserKey();
  if (!apiKey || typeof window === "undefined") return null;

  if (loadedLibrary) return loadedLibrary;

  if (typeof window.google?.maps?.importLibrary === "function") {
    const library = await resolveMapsLibrary();
    if (!library) {
      loadPromise = null;
      return null;
    }
    loadedLibrary = library;
    return library;
  }

  try {
    await injectMapsScript(apiKey);
    const library = await resolveMapsLibrary();
    if (!library) {
      loadPromise = null;
      return null;
    }
    loadedLibrary = library;
    return library;
  } catch {
    lastFailureReason = "MAP_LIBRARY_NOT_READY";
    loadPromise = null;
    return null;
  }
}

export function getMapsLoaderFailureReason(): MapsLoaderFailureReason | null {
  return lastFailureReason;
}

export async function loadGoogleMapsJs(): Promise<LoadedGoogleMapsLibrary | null> {
  const apiKey = getMapsBrowserKey();
  if (!apiKey || typeof window === "undefined") return null;
  if (loadedLibrary) return loadedLibrary;

  if (!loadPromise) {
    loadPromise = loadMapsLibraryInternal();
  }

  return loadPromise;
}

export function resetMapsJsLoaderForTests(): void {
  loadPromise = null;
  loadedLibrary = null;
  lastFailureReason = null;
  document.getElementById(MAPS_SCRIPT_ID)?.remove();
}
