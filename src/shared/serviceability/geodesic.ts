/**
 * Deterministic geodesic distance (Haversine) for Serviceability V1.
 * Straight-line distance in meters — not road distance.
 */

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Returns geodesic distance in meters between two WGS84 points. */
export function geodesicDistanceMeters(input: Readonly<{
  originLatitude: number;
  originLongitude: number;
  pointLatitude: number;
  pointLongitude: number;
}>): number {
  const φ1 = toRadians(input.originLatitude);
  const φ2 = toRadians(input.pointLatitude);
  const Δφ = toRadians(input.pointLatitude - input.originLatitude);
  const Δλ = toRadians(input.pointLongitude - input.originLongitude);
  const sinHalfΔφ = Math.sin(Δφ / 2);
  const sinHalfΔλ = Math.sin(Δλ / 2);
  const a =
    sinHalfΔφ * sinHalfΔφ +
    Math.cos(φ1) * Math.cos(φ2) * sinHalfΔλ * sinHalfΔλ;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export function parseServiceabilityCoordinate(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** True when origin lat/lng and max distance are all configured. */
export function isDistancePolicyConfigured(input: Readonly<{
  serviceOriginLatitude: string | null | undefined;
  serviceOriginLongitude: string | null | undefined;
  maxServiceDistanceMeters: number | null | undefined;
}>): boolean {
  return (
    typeof input.serviceOriginLatitude === "string" &&
    input.serviceOriginLatitude.length > 0 &&
    typeof input.serviceOriginLongitude === "string" &&
    input.serviceOriginLongitude.length > 0 &&
    typeof input.maxServiceDistanceMeters === "number" &&
    input.maxServiceDistanceMeters > 0
  );
}
