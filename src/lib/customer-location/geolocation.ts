/**
 * Browser geolocation helper (IMP-036B).
 */

export type GeolocationFailureReason =
  | "unsupported"
  | "permission_denied"
  | "unavailable"
  | "timeout";

export type GeolocationResult =
  | Readonly<{
      ok: true;
      coordinates: Readonly<{ latitude: string; longitude: string }>;
    }>
  | Readonly<{
      ok: false;
      reason: GeolocationFailureReason;
    }>;

const DEFAULT_TIMEOUT_MS = 12_000;

function formatCoordinate(value: number): string {
  return value.toFixed(7);
}

export async function getDeviceCoordinates(options?: {
  timeoutMs?: number;
}): Promise<GeolocationResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { ok: false, reason: "unsupported" };
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      resolve({ ok: false, reason: "timeout" });
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(timer);
        resolve({
          ok: true,
          coordinates: {
            latitude: formatCoordinate(position.coords.latitude),
            longitude: formatCoordinate(position.coords.longitude),
          },
        });
      },
      (error) => {
        window.clearTimeout(timer);
        if (error.code === error.PERMISSION_DENIED) {
          resolve({ ok: false, reason: "permission_denied" });
          return;
        }
        if (error.code === error.TIMEOUT) {
          resolve({ ok: false, reason: "timeout" });
          return;
        }
        resolve({ ok: false, reason: "unavailable" });
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: timeoutMs },
    );
  });
}
