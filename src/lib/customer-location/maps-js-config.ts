/**
 * Browser Maps JavaScript API key (IMP-036B UAT correction).
 *
 * Intentionally browser-visible and restricted to Maps JavaScript API only.
 * Never use the server Places/Geocoding key here.
 */
const MAPS_BROWSER_KEY_ENV = "NEXT_PUBLIC_BOBA_BEAR_GOOGLE_MAPS_BROWSER_KEY";

export function getMapsBrowserKey(): string | null {
  const raw = process.env[MAPS_BROWSER_KEY_ENV]?.trim();
  if (!raw || raw.length === 0) return null;
  if (raw.startsWith("replace-with")) return null;
  return raw;
}

export function isMapsJsConfigured(): boolean {
  return getMapsBrowserKey() !== null;
}

/** Diagnostics without exposing key material. */
export function mapsJsConfigStatus(): Readonly<{ configured: boolean; envKey: string }> {
  return Object.freeze({
    configured: isMapsJsConfigured(),
    envKey: MAPS_BROWSER_KEY_ENV,
  });
}
