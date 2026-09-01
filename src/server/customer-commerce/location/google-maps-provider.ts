/**
 * Location search provider port + Google Maps Platform V1 adapter (IMP-036B).
 */
import "server-only";

import {
  geocodingComponentsToLocationComponents,
  normalizeLocationEvidence,
  type NormalizedLocationEvidence,
} from "../../../shared/customer-location/normalize";
import { isLocationSearchSessionToken } from "../../../shared/customer-location/session-token";
import type { CustomerCommerceLocationConfig } from "./config";
import { LocationError } from "./errors";

export const LOCATION_AUTOCOMPLETE_MIN_CHARS = 3;
export const LOCATION_AUTOCOMPLETE_MAX_CHARS = 120;
export const LOCATION_AUTOCOMPLETE_MAX_RESULTS = 8;
export const LOCATION_PROVIDER_TIMEOUT_MS = 4_000;

export const PLACE_DETAILS_FIELD_MASK =
  "id,formattedAddress,addressComponents,postalAddress,location" as const;

export const AUTOCOMPLETE_FIELD_MASK =
  "suggestions.placePrediction.place,suggestions.placePrediction.placeId,suggestions.placePrediction.text" as const;

/** Soft Dehradun operating bias — not delivery authority. */
export const DEHRADUN_LOCATION_BIAS = Object.freeze({
  latitude: 30.3164945,
  longitude: 78.0321918,
  radiusMeters: 40_000,
});

export type LocationAutocompleteSuggestion = Readonly<{
  placeId: string;
  label: string;
}>;

export type LocationSearchProvider = Readonly<{
  configured: boolean;
  autocomplete(input: Readonly<{
    query: string;
    sessionToken: string;
  }>): Promise<readonly LocationAutocompleteSuggestion[]>;
  resolvePlace(input: Readonly<{
    placeId: string;
    sessionToken: string;
  }>): Promise<NormalizedLocationEvidence>;
  reverseGeocode(input: Readonly<{
    latitude: number;
    longitude: number;
  }>): Promise<NormalizedLocationEvidence>;
}>;

export type GoogleMapsFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

type GoogleMapsLocationProviderOptions = Readonly<{
  apiKey: string;
  fetchImpl?: GoogleMapsFetch;
  timeoutMs?: number;
  placesBaseUrl?: string;
  geocodingBaseUrl?: string;
}>;

function assertSessionToken(sessionToken: string): void {
  if (!isLocationSearchSessionToken(sessionToken)) {
    throw new LocationError(
      "LOCATION_INVALID_INPUT",
      "sessionToken must be a UUID v4.",
      "sessionToken",
    );
  }
}

function assertQuery(query: string): string {
  const trimmed = query.trim();
  if (trimmed.length < LOCATION_AUTOCOMPLETE_MIN_CHARS) {
    throw new LocationError(
      "LOCATION_INVALID_INPUT",
      "query is below the minimum useful length.",
      "query",
    );
  }
  if (trimmed.length > LOCATION_AUTOCOMPLETE_MAX_CHARS) {
    throw new LocationError(
      "LOCATION_INVALID_INPUT",
      "query exceeds the maximum length.",
      "query",
    );
  }
  return trimmed;
}

function assertCoordinates(latitude: number, longitude: number): void {
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new LocationError(
      "LOCATION_INVALID_INPUT",
      "latitude/longitude are out of range.",
      "coordinates",
    );
  }
}

function encodePlaceResource(placeId: string): string {
  const trimmed = placeId.trim();
  if (trimmed.length === 0 || trimmed.length > 256) {
    throw new LocationError("LOCATION_INVALID_INPUT", "placeId is invalid.", "placeId");
  }
  if (trimmed.includes("/") && !trimmed.startsWith("places/")) {
    throw new LocationError("LOCATION_INVALID_INPUT", "placeId is invalid.", "placeId");
  }
  const resource = trimmed.startsWith("places/") ? trimmed : `places/${trimmed}`;
  return resource
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function mapProviderHttpFailure(status: number): never {
  if (status === 429) {
    throw new LocationError("LOCATION_RATE_LIMITED", "Provider rate limited.");
  }
  throw new LocationError("LOCATION_PROVIDER_UNAVAILABLE", "Provider request failed.");
}

export function createUnconfiguredLocationProvider(): LocationSearchProvider {
  const unavailable = async (): Promise<never> => {
    throw new LocationError(
      "LOCATION_PROVIDER_UNAVAILABLE",
      "Location provider is not configured.",
    );
  };
  return Object.freeze({
    configured: false,
    autocomplete: unavailable,
    resolvePlace: unavailable,
    reverseGeocode: unavailable,
  });
}

export function createGoogleMapsLocationProvider(
  options: GoogleMapsLocationProviderOptions,
): LocationSearchProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? LOCATION_PROVIDER_TIMEOUT_MS;
  const placesBaseUrl = options.placesBaseUrl ?? "https://places.googleapis.com";
  const geocodingBaseUrl =
    options.geocodingBaseUrl ?? "https://maps.googleapis.com/maps/api/geocode/json";
  const apiKey = options.apiKey;

  async function placesFetch(
    path: string,
    init: RequestInit & { fieldMask?: string },
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchImpl(`${placesBaseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          ...(init.headers ?? {}),
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          ...(init.fieldMask ? { "X-Goog-FieldMask": init.fieldMask } : {}),
        },
      });
    } catch (error) {
      if (error instanceof LocationError) throw error;
      throw new LocationError("LOCATION_PROVIDER_UNAVAILABLE", "Provider request timed out.");
    } finally {
      clearTimeout(timer);
    }
  }

  async function geocodeFetch(url: URL): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchImpl(url.toString(), { method: "GET", signal: controller.signal });
    } catch {
      throw new LocationError("LOCATION_PROVIDER_UNAVAILABLE", "Provider request failed.");
    } finally {
      clearTimeout(timer);
    }
  }

  return Object.freeze({
    configured: true,

    async autocomplete(input) {
      assertSessionToken(input.sessionToken);
      const query = assertQuery(input.query);
      const response = await placesFetch("/v1/places:autocomplete", {
        method: "POST",
        fieldMask: AUTOCOMPLETE_FIELD_MASK,
        body: JSON.stringify({
          input: query,
          includedRegionCodes: ["in"],
          languageCode: "en",
          regionCode: "IN",
          sessionToken: input.sessionToken,
          locationBias: {
            circle: {
              center: {
                latitude: DEHRADUN_LOCATION_BIAS.latitude,
                longitude: DEHRADUN_LOCATION_BIAS.longitude,
              },
              radius: DEHRADUN_LOCATION_BIAS.radiusMeters,
            },
          },
        }),
      });
      if (!response.ok) mapProviderHttpFailure(response.status);
      const body = (await readJson(response)) as {
        suggestions?: readonly {
          placePrediction?: {
            place?: string;
            placeId?: string;
            text?: { text?: string };
          };
        }[];
      } | null;
      if (!body || !Array.isArray(body.suggestions)) {
        throw new LocationError("LOCATION_PROVIDER_UNAVAILABLE", "Malformed autocomplete response.");
      }
      const suggestions: LocationAutocompleteSuggestion[] = [];
      for (const suggestion of body.suggestions) {
        const prediction = suggestion.placePrediction;
        if (!prediction) continue;
        const placeId = prediction.placeId ?? prediction.place?.replace(/^places\//, "");
        const label = prediction.text?.text?.trim();
        if (!placeId || !label) continue;
        suggestions.push(Object.freeze({ placeId, label }));
        if (suggestions.length >= LOCATION_AUTOCOMPLETE_MAX_RESULTS) break;
      }
      return Object.freeze(suggestions);
    },

    async resolvePlace(input) {
      assertSessionToken(input.sessionToken);
      const resource = encodePlaceResource(input.placeId);
      const url = `/v1/${resource}?languageCode=en&sessionToken=${encodeURIComponent(input.sessionToken)}`;
      const response = await placesFetch(url, {
        method: "GET",
        fieldMask: PLACE_DETAILS_FIELD_MASK,
      });
      if (!response.ok) mapProviderHttpFailure(response.status);
      const body = (await readJson(response)) as {
        formattedAddress?: string;
        addressComponents?: readonly {
          longText?: string;
          shortText?: string;
          types?: readonly string[];
        }[];
        postalAddress?: {
          postalCode?: string;
          locality?: string;
          administrativeArea?: string;
          regionCode?: string;
          addressLines?: readonly string[];
        };
        location?: { latitude?: number; longitude?: number };
      } | null;
      if (!body) {
        throw new LocationError("LOCATION_PROVIDER_UNAVAILABLE", "Malformed place details response.");
      }
      return normalizeLocationEvidence({
        formattedAddress: body.formattedAddress,
        addressComponents: body.addressComponents,
        postalAddress: body.postalAddress,
        location: body.location,
        source: "place_details",
      });
    },

    async reverseGeocode(input) {
      assertCoordinates(input.latitude, input.longitude);
      const url = new URL(geocodingBaseUrl);
      url.searchParams.set("latlng", `${input.latitude},${input.longitude}`);
      url.searchParams.set("language", "en");
      url.searchParams.set("region", "in");
      url.searchParams.set("key", apiKey);

      let response: Response;
      try {
        response = await geocodeFetch(url);
      } catch {
        response = await geocodeFetch(url);
      }
      if (!response.ok && response.status >= 500) {
        response = await geocodeFetch(url);
      }
      if (!response.ok) mapProviderHttpFailure(response.status);
      const body = (await readJson(response)) as {
        status?: string;
        results?: readonly {
          formatted_address?: string;
          address_components?: readonly {
            long_name?: string;
            short_name?: string;
            types?: readonly string[];
          }[];
          geometry?: { location?: { lat?: number; lng?: number } };
        }[];
      } | null;
      if (!body || typeof body.status !== "string") {
        throw new LocationError("LOCATION_PROVIDER_UNAVAILABLE", "Malformed geocode response.");
      }
      if (body.status === "ZERO_RESULTS" || !body.results || body.results.length === 0) {
        throw new LocationError("LOCATION_NO_RESULTS", "No reverse geocode result.");
      }
      if (body.status !== "OK") {
        if (body.status === "OVER_QUERY_LIMIT" || body.status === "REQUEST_DENIED") {
          throw new LocationError("LOCATION_PROVIDER_UNAVAILABLE", "Geocode provider denied.");
        }
        throw new LocationError("LOCATION_PROVIDER_UNAVAILABLE", "Geocode provider error.");
      }
      const top = body.results[0]!;
      return normalizeLocationEvidence({
        formattedAddress: top.formatted_address,
        addressComponents: geocodingComponentsToLocationComponents(top.address_components ?? []),
        location: {
          latitude: top.geometry?.location?.lat ?? input.latitude,
          longitude: top.geometry?.location?.lng ?? input.longitude,
        },
        source: "reverse_geocode",
      });
    },
  });
}

export function createLocationSearchProviderFromConfig(
  config: CustomerCommerceLocationConfig,
  options?: Omit<GoogleMapsLocationProviderOptions, "apiKey">,
): LocationSearchProvider {
  if (!config.configured || config.googleMapsApiKey === null) {
    return createUnconfiguredLocationProvider();
  }
  return createGoogleMapsLocationProvider({
    apiKey: config.googleMapsApiKey,
    ...options,
  });
}
