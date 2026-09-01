/**
 * Customer location search HTTP client (IMP-036B).
 *
 * Same-origin `/api/v1/location/*` only. No provider credentials.
 */
import { commerceRequest, type CommerceHttpResult } from "./http";

export type LocationProviderStatus = Readonly<{
  configured: boolean;
  provider: "google_maps";
  status: "CONFIGURED" | "NOT_CONFIGURED";
}>;

export type LocationSuggestion = Readonly<{
  placeId: string;
  label: string;
}>;

export type NormalizedCommerceLocation = Readonly<{
  displayAddress: string;
  postalCode: string | null;
  pinConfirmed: boolean;
  locality: string | null;
  administrativeArea: string | null;
  stateCode: string | null;
  country: "India" | null;
  countryCode: "IN" | null;
  latitude: string | null;
  longitude: string | null;
}>;

export async function getLocationProviderStatus(): Promise<
  CommerceHttpResult<{ configured: boolean; provider: string; status: string }>
> {
  return commerceRequest("/api/v1/location/status", { method: "GET" });
}

export async function autocompleteLocation(
  input: Readonly<{ query: string; sessionToken: string }>,
  signal?: AbortSignal,
): Promise<CommerceHttpResult<{ suggestions: readonly LocationSuggestion[] }>> {
  return commerceRequest("/api/v1/location/autocomplete", {
    method: "POST",
    body: { query: input.query, sessionToken: input.sessionToken },
    signal,
  });
}

export async function resolveLocationPlace(
  input: Readonly<{ placeId: string; sessionToken: string }>,
): Promise<CommerceHttpResult<{ location: NormalizedCommerceLocation }>> {
  return commerceRequest("/api/v1/location/place", {
    method: "POST",
    body: { placeId: input.placeId, sessionToken: input.sessionToken },
  });
}

export async function reverseGeocodeLocation(
  input: Readonly<{ latitude: number; longitude: number }>,
  signal?: AbortSignal,
): Promise<CommerceHttpResult<{ location: NormalizedCommerceLocation }>> {
  return commerceRequest("/api/v1/location/reverse-geocode", {
    method: "POST",
    body: { latitude: input.latitude, longitude: input.longitude },
    signal,
  });
}
