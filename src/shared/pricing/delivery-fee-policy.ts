/**
 * Outlet delivery fee policy (IMP-036C).
 *
 * Distance bands and free-delivery thresholds are business configuration.
 * Customer charge is computed server-side at checkout evaluation.
 */

export type DeliveryFeeBand = Readonly<{
  maxDistanceMeters: number;
  amountPaise: number;
}>;

export type OutletDeliveryFeePolicy = Readonly<{
  bands: readonly DeliveryFeeBand[];
  freeDeliverySubtotalThresholdPaise: bigint | null;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseBand(raw: unknown): DeliveryFeeBand | null {
  if (!isRecord(raw)) return null;
  const maxDistanceMeters = raw.maxDistanceMeters;
  const amountPaise = raw.amountPaise;
  if (
    typeof maxDistanceMeters !== "number" ||
    !Number.isFinite(maxDistanceMeters) ||
    maxDistanceMeters <= 0
  ) {
    return null;
  }
  if (
    typeof amountPaise !== "number" ||
    !Number.isFinite(amountPaise) ||
    amountPaise < 0
  ) {
    return null;
  }
  return Object.freeze({
    maxDistanceMeters: Math.floor(maxDistanceMeters),
    amountPaise: Math.floor(amountPaise),
  });
}

export function parseDeliveryFeeBands(raw: unknown): readonly DeliveryFeeBand[] {
  if (!Array.isArray(raw)) return Object.freeze([]);
  const bands: DeliveryFeeBand[] = [];
  for (const entry of raw) {
    const band = parseBand(entry);
    if (band) bands.push(band);
  }
  bands.sort((a, b) => a.maxDistanceMeters - b.maxDistanceMeters);
  return Object.freeze(bands);
}

export function resolveDeliveryFeeFromBands(
  distanceMeters: number,
  bands: readonly DeliveryFeeBand[],
): bigint | null {
  if (bands.length === 0) return null;
  for (const band of bands) {
    if (distanceMeters <= band.maxDistanceMeters) {
      return BigInt(band.amountPaise);
    }
  }
  return null;
}
