/**
 * Lazy Maps JavaScript API loader — confirmation UI only (IMP-036B UAT).
 *
 * Resolves only after `google.maps.importLibrary("maps")` yields a usable Map
 * constructor. Script `load` / bare `window.google.maps` presence is not treated
 * as readiness when using `loading=async`.
 */
import { getMapsBrowserKey } from "./maps-js-config";

const MAPS_SCRIPT_ID = "boba-google-maps-js";
const MAPS_BOOTSTRAP_CALLBACK = "bobaGoogleMapsBootstrapReady";

/** Bounded readiness window for transient Google bootstrap / importLibrary delays. */
const READINESS_TIMEOUT_MS = 5_000;
const READINESS_POLL_MIN_MS = 50;
const READINESS_POLL_MAX_MS = 150;

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
let bootstrapReadyPromise: Promise<void> | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pollDelay(attempt: number): number {
  const step = attempt % 3;
  return Math.min(READINESS_POLL_MIN_MS + step * 50, READINESS_POLL_MAX_MS);
}

function isMapConstructorReady(value: unknown): value is typeof google.maps.Map {
  return typeof value === "function";
}

function isAuthorizationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /invalid.*key|api.*key|auth|referer|permission|denied/i.test(message);
}

type ResolveAttempt =
  | { ok: true; library: LoadedGoogleMapsLibrary }
  | { ok: false; transient: true }
  | { ok: false; transient: false; reason: MapsLoaderFailureReason };

async function tryResolveMapsLibraryOnce(): Promise<ResolveAttempt> {
  const importLibrary = window.google?.maps?.importLibrary;
  if (typeof importLibrary !== "function") {
    return { ok: false, transient: true };
  }

  try {
    const mapsLib = (await importLibrary.call(window.google!.maps, "maps")) as {
      Map?: typeof google.maps.Map;
    };
    if (!isMapConstructorReady(mapsLib?.Map)) {
      return { ok: false, transient: false, reason: "MAP_CONSTRUCTOR_FAILED" };
    }
    return Object.freeze({
      ok: true,
      library: Object.freeze({
        Map: mapsLib.Map,
        event: window.google!.maps.event,
      }),
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return { ok: false, transient: false, reason: "MAP_AUTHORIZATION_FAILED" };
    }
    return { ok: false, transient: true };
  }
}

async function resolveMapsLibraryWithRetry(): Promise<LoadedGoogleMapsLibrary | null> {
  const deadline = Date.now() + READINESS_TIMEOUT_MS;
  let attempt = 0;

  while (Date.now() < deadline) {
    const result = await tryResolveMapsLibraryOnce();
    if (result.ok) {
      lastFailureReason = null;
      return result.library;
    }
    if (!result.transient) {
      lastFailureReason = result.reason;
      return null;
    }
    attempt += 1;
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await sleep(Math.min(pollDelay(attempt), remaining));
  }

  lastFailureReason = "MAP_LIBRARY_NOT_READY";
  return null;
}

function cleanupBootstrapCallback(): void {
  const w = window as unknown as Record<string, unknown>;
  if (w[MAPS_BOOTSTRAP_CALLBACK] !== undefined) {
    delete w[MAPS_BOOTSTRAP_CALLBACK];
  }
}

function ensureBootstrapReadyPromise(): Promise<void> {
  if (!bootstrapReadyPromise) {
    bootstrapReadyPromise = new Promise<void>((resolve) => {
      const w = window as unknown as Record<string, (() => void) | undefined>;
      const prior = w[MAPS_BOOTSTRAP_CALLBACK];
      w[MAPS_BOOTSTRAP_CALLBACK] = () => {
        prior?.();
        cleanupBootstrapCallback();
        resolve();
      };
    });
  }
  return bootstrapReadyPromise;
}

async function waitForBootstrapReady(): Promise<boolean> {
  if (typeof window.google?.maps?.importLibrary === "function") {
    return true;
  }

  const ready = ensureBootstrapReadyPromise();
  const raced = await Promise.race([
    ready.then(() => true),
    sleep(READINESS_TIMEOUT_MS).then(() => false),
  ]);

  // importLibrary may still attach shortly after the callback.
  if (raced && typeof window.google?.maps?.importLibrary === "function") {
    return true;
  }

  const deadline = Date.now() + READINESS_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (typeof window.google?.maps?.importLibrary === "function") {
      return true;
    }
    await sleep(pollDelay(0));
  }

  return typeof window.google?.maps?.importLibrary === "function";
}

function waitForExistingScript(_script: HTMLScriptElement): Promise<void> {
  if (typeof window.google?.maps?.importLibrary === "function") {
    return Promise.resolve();
  }
  return waitForBootstrapReady().then(() => undefined);
}

function injectMapsScript(apiKey: string): Promise<void> {
  const existing = document.getElementById(MAPS_SCRIPT_ID);
  if (existing instanceof HTMLScriptElement) {
    return waitForExistingScript(existing);
  }

  ensureBootstrapReadyPromise();

  const script = document.createElement("script");
  script.id = MAPS_SCRIPT_ID;
  script.async = true;
  script.defer = true;
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&callback=${MAPS_BOOTSTRAP_CALLBACK}`;
  script.addEventListener("error", () => {
    lastFailureReason = "MAP_LIBRARY_NOT_READY";
  }, { once: true });
  document.head.appendChild(script);

  return waitForBootstrapReady().then(() => undefined);
}

async function loadMapsLibraryInternal(): Promise<LoadedGoogleMapsLibrary | null> {
  const apiKey = getMapsBrowserKey();
  if (!apiKey || typeof window === "undefined") return null;

  if (loadedLibrary) return loadedLibrary;

  try {
    if (typeof window.google?.maps?.importLibrary !== "function") {
      await injectMapsScript(apiKey);
    }
    const library = await resolveMapsLibraryWithRetry();
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
  bootstrapReadyPromise = null;
  cleanupBootstrapCallback();
  document.getElementById(MAPS_SCRIPT_ID)?.remove();
}
