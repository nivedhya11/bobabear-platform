/**
 * Deterministic compact delivery-context labels for customer chrome (IMP-036B UAT).
 *
 * Full geographic context belongs in selector/detail screens; the global header
 * shows a short, deduplicated label such as "Ghanta Ghar, Dehradun".
 */
import { INDIA_SUBDIVISIONS } from "@/shared/customer-addresses/india-states";

const INDIA_PATTERN = /^india$/i;
const PIN_ONLY_PATTERN = /^\d{6}$/;
const STATE_WITH_PIN_PATTERN = /^(.+?)\s+\d{6}$/;
const ADMINISTRATIVE_AREA_NAMES = new Set(
  INDIA_SUBDIVISIONS.flatMap((entry) => [entry.name.toLowerCase(), entry.code.toLowerCase()]),
);

function dedupeParts(parts: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length === 0) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function stripAdministrativeTail(parts: readonly string[]): string[] {
  return parts.filter((part) => {
    if (INDIA_PATTERN.test(part)) return false;
    if (PIN_ONLY_PATTERN.test(part)) return false;
    if (STATE_WITH_PIN_PATTERN.test(part)) return false;
    return true;
  });
}

function splitAddressParts(input: string): string[] {
  return dedupeParts(
    input
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0),
  );
}

function isAdministrativeAreaName(part: string): boolean {
  const normalized = part.trim().toLowerCase();
  if (normalized.length === 0) return false;
  return ADMINISTRATIVE_AREA_NAMES.has(normalized);
}

function pickCityPart(parts: readonly string[]): string | null {
  if (parts.length === 0) return null;
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index]!;
    if (!isAdministrativeAreaName(part)) return part;
  }
  return parts[parts.length - 1] ?? null;
}

function compactGeographicParts(parts: readonly string[]): string {
  const meaningful = stripAdministrativeTail(parts);
  if (meaningful.length === 0) return parts.join(", ");
  if (meaningful.length === 1) return meaningful[0]!;
  const primary = meaningful[0]!;
  const city = pickCityPart(meaningful);
  if (!city || primary.toLowerCase() === city.toLowerCase()) return primary;
  return `${primary}, ${city}`;
}

function compactSavedAddressLabel(input: string): string {
  const segments = input.split(" · ").map((part) => part.trim()).filter(Boolean);
  if (segments.length < 2) return compactGeographicParts(splitAddressParts(input));
  const label = segments[0]!;
  const pin = segments[segments.length - 1]!;
  if (!PIN_ONLY_PATTERN.test(pin)) return compactGeographicParts(splitAddressParts(input));
  const middle = segments.slice(1, -1).join(", ");
  const compactMiddle = middle.length > 0 ? compactGeographicParts(splitAddressParts(middle)) : pin;
  if (compactMiddle === pin) return `${label} · ${pin}`;
  return `${label} · ${compactMiddle}`;
}

export type CompactLocationInput = Readonly<{
  displayAddress: string;
  locality: string | null;
  administrativeArea?: string | null;
}>;

/** Compact customer-facing label from normalized provider evidence. */
export function compactNormalizedLocationLabel(input: CompactLocationInput): string {
  const parts = splitAddressParts(input.displayAddress);
  const meaningful = stripAdministrativeTail(parts);
  const primary =
    meaningful.find((part) => !isAdministrativeAreaName(part)) ??
    meaningful[0] ??
    input.displayAddress.split(",")[0]?.trim() ??
    "Selected location";
  const city =
    input.locality?.trim() ||
    pickCityPart(meaningful.filter((part) => part.toLowerCase() !== primary.toLowerCase()));
  if (!city || primary.toLowerCase() === city.toLowerCase()) return primary;
  return `${primary}, ${city}`;
}

/** Compact header label from a full display string or saved-address label. */
export function compactDeliveryDisplayLabel(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) return "";
  if (trimmed.includes(" · ")) return compactSavedAddressLabel(trimmed);
  if (PIN_ONLY_PATTERN.test(trimmed)) return trimmed;
  return compactGeographicParts(splitAddressParts(trimmed));
}

/** Two-line header: title + compact context. */
export function deliveryHeaderContext(displayLabel: string, fallbackLocality: string): Readonly<{
  title: string;
  context: string;
}> {
  const compact = compactDeliveryDisplayLabel(displayLabel);
  return Object.freeze({
    title: "Delivering to",
    context: compact.length > 0 ? compact : fallbackLocality,
  });
}
