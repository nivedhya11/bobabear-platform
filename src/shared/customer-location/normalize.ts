/**
 * Deterministic BOBA location-evidence normalization (IMP-036B Google Maps amendment).
 *
 * Used by Place Details, reverse geocoding, saved-address projection, and manual PIN.
 * Structured postal/address components win over formatted-address parsing.
 * Never fabricates a PIN.
 */
import { INDIA_SUBDIVISIONS, type IndiaSubdivisionCode } from "../customer-addresses/india-states";

export const INDIAN_PIN_PATTERN = /^[1-9][0-9]{5}$/;

export type LocationEvidenceSource =
  | "place_details"
  | "reverse_geocode"
  | "saved_address"
  | "manual_pin";

export type LocationAddressComponent = Readonly<{
  longText?: string;
  shortText?: string;
  types?: readonly string[];
}>;

export type LocationEvidenceInput = Readonly<{
  formattedAddress?: string;
  postalAddress?: Readonly<{
    postalCode?: string;
    locality?: string;
    administrativeArea?: string;
    regionCode?: string;
    addressLines?: readonly string[];
  }>;
  addressComponents?: readonly LocationAddressComponent[];
  location?: Readonly<{ latitude?: number; longitude?: number }>;
  source: LocationEvidenceSource;
}>;

export type NormalizedLocationEvidence = Readonly<{
  displayAddress: string;
  postalCode: string | null;
  pinConfirmed: boolean;
  locality: string | null;
  administrativeArea: string | null;
  stateCode: IndiaSubdivisionCode | null;
  country: "India" | null;
  countryCode: "IN" | null;
  latitude: string | null;
  longitude: string | null;
  source: LocationEvidenceSource;
}>;

function componentText(
  component: LocationAddressComponent,
  prefer: "long" | "short" = "long",
): string {
  const longText = component.longText?.trim() ?? "";
  const shortText = component.shortText?.trim() ?? "";
  if (prefer === "short") return shortText || longText;
  return longText || shortText;
}

function firstComponent(
  components: readonly LocationAddressComponent[],
  type: string,
): LocationAddressComponent | undefined {
  return components.find((component) => component.types?.includes(type));
}

export function tryIndianPostalCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return INDIAN_PIN_PATTERN.test(trimmed) ? trimmed : null;
}

function mapStateCode(nameOrCode: string | null): IndiaSubdivisionCode | null {
  if (!nameOrCode) return null;
  const trimmed = nameOrCode.trim();
  if (trimmed === "IN-UT" || trimmed.toLowerCase() === "uk") return "IN-UT";
  const upper = trimmed.toUpperCase();
  if (upper.startsWith("IN-")) {
    const match = INDIA_SUBDIVISIONS.find((entry) => entry.code === upper);
    return match?.code ?? null;
  }
  const lowered = trimmed.toLowerCase();
  const byName = INDIA_SUBDIVISIONS.find((entry) => entry.name.toLowerCase() === lowered);
  return byName?.code ?? null;
}

function formatCoordinate(value: number | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (Math.abs(value) > 180) return null;
  return value.toFixed(7);
}

function resolveCountry(
  components: readonly LocationAddressComponent[],
  postalRegionCode: string | undefined,
): { country: "India" | null; countryCode: "IN" | null } {
  const region = postalRegionCode?.trim().toUpperCase();
  if (region === "IN") return { country: "India", countryCode: "IN" };
  const countryComponent = firstComponent(components, "country");
  if (!countryComponent) return { country: null, countryCode: null };
  const shortText = componentText(countryComponent, "short").toUpperCase();
  const longText = componentText(countryComponent, "long").toLowerCase();
  if (shortText === "IN" || longText === "india") {
    return { country: "India", countryCode: "IN" };
  }
  return { country: null, countryCode: null };
}

export function normalizeLocationEvidence(input: LocationEvidenceInput): NormalizedLocationEvidence {
  const components = input.addressComponents ?? [];
  const postalFromAddress = tryIndianPostalCode(input.postalAddress?.postalCode);
  const postalFromComponents = tryIndianPostalCode(
    componentText(firstComponent(components, "postal_code") ?? {}),
  );
  const postalCode = postalFromAddress ?? postalFromComponents;

  const locality =
    input.postalAddress?.locality?.trim() ||
    componentText(firstComponent(components, "locality") ?? {}) ||
    componentText(firstComponent(components, "sublocality") ?? {}) ||
    componentText(firstComponent(components, "sublocality_level_1") ?? {}) ||
    null;

  const administrativeArea =
    input.postalAddress?.administrativeArea?.trim() ||
    componentText(firstComponent(components, "administrative_area_level_1") ?? {}) ||
    null;

  const displayAddress =
    input.formattedAddress?.trim() ||
    [input.postalAddress?.addressLines?.join(", "), locality, administrativeArea, postalCode]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(", ");

  const { country, countryCode } = resolveCountry(components, input.postalAddress?.regionCode);

  return Object.freeze({
    displayAddress,
    postalCode,
    pinConfirmed: postalCode !== null,
    locality: locality && locality.length > 0 ? locality : null,
    administrativeArea: administrativeArea && administrativeArea.length > 0 ? administrativeArea : null,
    stateCode: mapStateCode(administrativeArea),
    country,
    countryCode,
    latitude: formatCoordinate(input.location?.latitude),
    longitude: formatCoordinate(input.location?.longitude),
    source: input.source,
  });
}

export function geocodingComponentsToLocationComponents(
  components: readonly Readonly<{
    long_name?: string;
    short_name?: string;
    types?: readonly string[];
  }>[],
): LocationAddressComponent[] {
  return components.map((component) =>
    Object.freeze({
      longText: component.long_name,
      shortText: component.short_name,
      types: component.types,
    }),
  );
}
