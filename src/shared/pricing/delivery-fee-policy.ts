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

export function validateDeliveryFeeBands(
  raw: unknown,
): { ok: true; bands: readonly DeliveryFeeBand[] } | { ok: false; issues: readonly string[] } {
  if (!Array.isArray(raw)) {
    return { ok: false, issues: Object.freeze(["deliveryFeeBands must be an array."]) };
  }
  const issues: string[] = [];
  const bands: DeliveryFeeBand[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const entry = raw[i];
    if (!isRecord(entry)) {
      issues.push(`deliveryFeeBands[${i}] must be an object.`);
      continue;
    }
    const maxDistanceMeters = entry.maxDistanceMeters;
    const amountPaise = entry.amountPaise;
    if (
      typeof maxDistanceMeters !== "number" ||
      !Number.isInteger(maxDistanceMeters) ||
      maxDistanceMeters <= 0
    ) {
      issues.push(`deliveryFeeBands[${i}].maxDistanceMeters must be a positive integer.`);
    }
    if (
      typeof amountPaise !== "number" ||
      !Number.isInteger(amountPaise) ||
      amountPaise < 0
    ) {
      issues.push(`deliveryFeeBands[${i}].amountPaise must be a non-negative integer.`);
    }
    if (
      typeof maxDistanceMeters === "number" &&
      Number.isInteger(maxDistanceMeters) &&
      maxDistanceMeters > 0 &&
      typeof amountPaise === "number" &&
      Number.isInteger(amountPaise) &&
      amountPaise >= 0
    ) {
      bands.push(
        Object.freeze({
          maxDistanceMeters,
          amountPaise,
        }),
      );
    }
  }
  if (issues.length > 0) {
    return { ok: false, issues: Object.freeze(issues) };
  }
  for (let i = 1; i < bands.length; i += 1) {
    if (bands[i]!.maxDistanceMeters <= bands[i - 1]!.maxDistanceMeters) {
      issues.push("deliveryFeeBands must be strictly increasing by maxDistanceMeters with no overlap.");
      break;
    }
  }
  if (issues.length > 0) {
    return { ok: false, issues: Object.freeze(issues) };
  }
  return { ok: true, bands: Object.freeze(bands) };
}

export function validateFreeDeliveryThresholdPaise(
  value: unknown,
): { ok: true; thresholdPaise: bigint | null } | { ok: false; issues: readonly string[] } {
  if (value === null) {
    return { ok: true, thresholdPaise: null };
  }
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < 0) {
      return {
        ok: false,
        issues: Object.freeze(["freeDeliverySubtotalThresholdPaise must be a non-negative integer or null."]),
      };
    }
    return { ok: true, thresholdPaise: BigInt(value) };
  }
  if (typeof value === "bigint") {
    if (value < BigInt(0)) {
      return {
        ok: false,
        issues: Object.freeze(["freeDeliverySubtotalThresholdPaise must be a non-negative integer or null."]),
      };
    }
    return { ok: true, thresholdPaise: value };
  }
  if (typeof value === "string" && /^(0|[1-9]\d*)$/.test(value)) {
    return { ok: true, thresholdPaise: BigInt(value) };
  }
  return {
    ok: false,
    issues: Object.freeze(["freeDeliverySubtotalThresholdPaise must be a non-negative integer or null."]),
  };
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
