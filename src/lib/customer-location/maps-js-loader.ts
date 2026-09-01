/**
 * Lazy Maps JavaScript API loader — confirmation UI only (IMP-036B UAT).
 */
import { getMapsBrowserKey } from "./maps-js-config";

const MAPS_SCRIPT_ID = "boba-google-maps-js";

let loadPromise: Promise<typeof google.maps | null> | null = null;

export async function loadGoogleMapsJs(): Promise<typeof google.maps | null> {
  const apiKey = getMapsBrowserKey();
  if (!apiKey || typeof window === "undefined") return null;
  if (window.google?.maps) return window.google.maps;

  if (!loadPromise) {
    loadPromise = new Promise<typeof google.maps | null>((resolve) => {
      const finish = (): void => {
        resolve(window.google?.maps ?? null);
      };

      const existing = document.getElementById(MAPS_SCRIPT_ID);
      if (existing) {
        existing.addEventListener("load", finish, { once: true });
        existing.addEventListener("error", () => resolve(null), { once: true });
        if (window.google?.maps) finish();
        return;
      }

      const script = document.createElement("script");
      script.id = MAPS_SCRIPT_ID;
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async`;
      script.onload = finish;
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  }

  return loadPromise;
}

export function resetMapsJsLoaderForTests(): void {
  loadPromise = null;
}
