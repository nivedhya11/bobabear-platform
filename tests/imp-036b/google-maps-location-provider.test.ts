import { describe, expect, it, vi } from "vitest";

import { normalizeLocationEvidence } from "@/shared/customer-location/normalize";
import {
  completeLocationSearchSession,
  sessionTokenForAutocomplete,
  sessionTokenForPlaceDetails,
  startLocationSearchSession,
} from "@/lib/customer-location/search-session";
import { createLocationSearchSessionToken } from "@/shared/customer-location/session-token";
import { loadCustomerCommerceLocationConfig } from "@/server/customer-commerce/location/config";
import {
  AUTOCOMPLETE_FIELD_MASK,
  DEHRADUN_LOCATION_BIAS,
  PLACE_DETAILS_FIELD_MASK,
  createGoogleMapsLocationProvider,
  createLocationSearchProviderFromConfig,
} from "@/server/customer-commerce/location/google-maps-provider";
import { LocationError } from "@/server/customer-commerce/location/errors";
import { createLocationRateLimiter } from "@/server/customer-commerce/location/rate-limit";

const SESSION = "11111111-1111-4111-8111-111111111111";
const API_KEY = "test-google-maps-server-key-fixture";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("normalizeLocationEvidence", () => {
  it("extracts India PIN and state from Place Details components", () => {
    const evidence = normalizeLocationEvidence({
      formattedAddress: "Clock Tower, Dehradun, Uttarakhand 248001, India",
      postalAddress: { postalCode: "248001", locality: "Dehradun", administrativeArea: "Uttarakhand", regionCode: "IN" },
      addressComponents: [
        { longText: "248001", types: ["postal_code"] },
        { longText: "Dehradun", types: ["locality"] },
        { longText: "Uttarakhand", shortText: "UK", types: ["administrative_area_level_1"] },
        { longText: "India", shortText: "IN", types: ["country"] },
      ],
      location: { latitude: 30.3256, longitude: 78.0436 },
      source: "place_details",
    });
    expect(evidence.pinConfirmed).toBe(true);
    expect(evidence.postalCode).toBe("248001");
    expect(evidence.country).toBe("India");
    expect(evidence.countryCode).toBe("IN");
    expect(evidence.stateCode).toBe("IN-UT");
    expect(evidence.latitude).toBe("30.3256000");
  });

  it("does not fabricate a PIN when components omit postal_code", () => {
    const evidence = normalizeLocationEvidence({
      formattedAddress: "Rajpur Road, Dehradun, India",
      addressComponents: [
        { longText: "Dehradun", types: ["locality"] },
        { longText: "India", shortText: "IN", types: ["country"] },
      ],
      location: { latitude: 30.33, longitude: 78.04 },
      source: "reverse_geocode",
    });
    expect(evidence.pinConfirmed).toBe(false);
    expect(evidence.postalCode).toBeNull();
  });
});

describe("location search session tokens", () => {
  it("creates a UUID v4 and reuses it until completion", () => {
    const session = startLocationSearchSession();
    expect(session.token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(sessionTokenForAutocomplete(session)).toBe(session.token);
    expect(sessionTokenForPlaceDetails(session)).toBe(session.token);
    const completed = completeLocationSearchSession(session);
    expect(sessionTokenForAutocomplete(completed)).toBeNull();
    expect(sessionTokenForPlaceDetails(completed)).toBeNull();
    const next = startLocationSearchSession();
    expect(next.token).not.toBe(session.token);
  });

  it("rejects non-v4 tokens", () => {
    expect(() => createLocationSearchSessionToken(() => "not-a-uuid")).toThrow();
  });
});

describe("loadCustomerCommerceLocationConfig", () => {
  it("starts NOT_CONFIGURED when the Google key is absent", () => {
    const config = loadCustomerCommerceLocationConfig({}, "local");
    expect(config.selector).toBe("google_maps_platform");
    expect(config.configured).toBe(false);
    expect(config.googleMapsApiKey).toBeNull();
  });

  it("configures google_maps_platform when a server key is present", () => {
    const config = loadCustomerCommerceLocationConfig(
      { BOBA_BEAR_GOOGLE_MAPS_API_KEY: API_KEY },
      "local",
    );
    expect(config.configured).toBe(true);
    if (!config.configured) throw new Error("expected configured");
    expect(config.googleMapsApiKey).toBe(API_KEY);
  });
});

describe("GoogleMapsLocationProvider", () => {
  it("sends India restriction, Dehradun bias, session token, and autocomplete field mask", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.includedRegionCodes).toEqual(["in"]);
      expect(body.sessionToken).toBe(SESSION);
      expect(body.locationBias.circle.center.latitude).toBe(DEHRADUN_LOCATION_BIAS.latitude);
      expect(body.includeQueryPredictions).toBeUndefined();
      const headers = init?.headers as Record<string, string>;
      expect(headers["X-Goog-Api-Key"]).toBe(API_KEY);
      expect(headers["X-Goog-FieldMask"]).toBe(AUTOCOMPLETE_FIELD_MASK);
      expect(JSON.stringify(init)).not.toContain("NEXT_PUBLIC");
      return jsonResponse({
        suggestions: [
          { placePrediction: { placeId: "ChIJ1", text: { text: "Clock Tower, Dehradun" } } },
        ],
      });
    });
    const provider = createGoogleMapsLocationProvider({ apiKey: API_KEY, fetchImpl });
    const results = await provider.autocomplete({ query: "clock tower", sessionToken: SESSION });
    expect(results).toEqual([{ placeId: "ChIJ1", label: "Clock Tower, Dehradun" }]);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("/v1/places:autocomplete");
  });

  it("does not call the provider below the minimum query length", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}));
    const provider = createGoogleMapsLocationProvider({ apiKey: API_KEY, fetchImpl });
    await expect(provider.autocomplete({ query: "ab", sessionToken: SESSION })).rejects.toMatchObject({
      code: "LOCATION_INVALID_INPUT",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps timeout and rate-limit without leaking provider payloads", async () => {
    const timeoutProvider = createGoogleMapsLocationProvider({
      apiKey: API_KEY,
      timeoutMs: 20,
      fetchImpl: (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    });
    await expect(
      timeoutProvider.autocomplete({ query: "dehradun", sessionToken: SESSION }),
    ).rejects.toBeInstanceOf(LocationError);

    const limited = createGoogleMapsLocationProvider({
      apiKey: API_KEY,
      fetchImpl: async () => jsonResponse({ error: { status: "RESOURCE_EXHAUSTED" } }, 429),
    });
    await expect(
      limited.autocomplete({ query: "dehradun", sessionToken: SESSION }),
    ).rejects.toMatchObject({ code: "LOCATION_RATE_LIMITED" });
  });

  it("returns no results as an empty list", async () => {
    const provider = createGoogleMapsLocationProvider({
      apiKey: API_KEY,
      fetchImpl: async () => jsonResponse({ suggestions: [] }),
    });
    await expect(
      provider.autocomplete({ query: "zzzzzz", sessionToken: SESSION }),
    ).resolves.toEqual([]);
  });

  it("rejects malformed autocomplete JSON", async () => {
    const provider = createGoogleMapsLocationProvider({
      apiKey: API_KEY,
      fetchImpl: async () => jsonResponse({ unexpected: true }),
    });
    await expect(
      provider.autocomplete({ query: "dehradun", sessionToken: SESSION }),
    ).rejects.toMatchObject({ code: "LOCATION_PROVIDER_UNAVAILABLE" });
  });

  it("calls Place Details with the same session token and minimum field mask", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toContain("/v1/places/ChIJ1");
      expect(url).toContain(`sessionToken=${SESSION}`);
      const headers = init?.headers as Record<string, string>;
      expect(headers["X-Goog-FieldMask"]).toBe(PLACE_DETAILS_FIELD_MASK);
      expect(headers["X-Goog-FieldMask"]).not.toMatch(/rating|review|photo|website|nationalPhoneNumber/i);
      return jsonResponse({
        id: "ChIJ1",
        formattedAddress: "Clock Tower, Dehradun, Uttarakhand 248001, India",
        postalAddress: { postalCode: "248001", locality: "Dehradun", regionCode: "IN" },
        addressComponents: [
          { longText: "248001", types: ["postal_code"] },
          { longText: "India", shortText: "IN", types: ["country"] },
        ],
        location: { latitude: 30.3256, longitude: 78.0436 },
      });
    });
    const provider = createGoogleMapsLocationProvider({ apiKey: API_KEY, fetchImpl });
    const evidence = await provider.resolvePlace({ placeId: "ChIJ1", sessionToken: SESSION });
    expect(evidence.postalCode).toBe("248001");
    expect(evidence.pinConfirmed).toBe(true);
    expect(JSON.stringify(evidence)).not.toContain(API_KEY);
    expect(JSON.stringify(evidence)).not.toContain("reviews");
  });

  it("normalizes missing PIN from Place Details without fabricating coverage", async () => {
    const provider = createGoogleMapsLocationProvider({
      apiKey: API_KEY,
      fetchImpl: async () =>
        jsonResponse({
          formattedAddress: "Some landmark, Dehradun",
          addressComponents: [{ longText: "Dehradun", types: ["locality"] }],
          location: { latitude: 30.3, longitude: 78.0 },
        }),
    });
    const evidence = await provider.resolvePlace({ placeId: "ChIJ2", sessionToken: SESSION });
    expect(evidence.pinConfirmed).toBe(false);
    expect(evidence.postalCode).toBeNull();
  });

  it("reverse geocodes valid coordinates and rejects invalid ones", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      const parsed = new URL(url);
      expect(parsed.searchParams.get("latlng")).toBe("30.3165,78.0322");
      expect(parsed.searchParams.get("key")).toBe(API_KEY);
      expect(parsed.searchParams.get("region")).toBe("in");
      return jsonResponse({
        status: "OK",
        results: [
          {
            formatted_address: "Dehradun, Uttarakhand 248001, India",
            address_components: [
              { long_name: "248001", types: ["postal_code"] },
              { long_name: "India", short_name: "IN", types: ["country"] },
            ],
            geometry: { location: { lat: 30.3165, lng: 78.0322 } },
          },
        ],
      });
    });
    const provider = createGoogleMapsLocationProvider({ apiKey: API_KEY, fetchImpl });
    const evidence = await provider.reverseGeocode({ latitude: 30.3165, longitude: 78.0322 });
    expect(evidence.postalCode).toBe("248001");
    await expect(provider.reverseGeocode({ latitude: 100, longitude: 0 })).rejects.toMatchObject({
      code: "LOCATION_INVALID_INPUT",
    });
  });

  it("maps ZERO_RESULTS reverse geocode", async () => {
    const provider = createGoogleMapsLocationProvider({
      apiKey: API_KEY,
      fetchImpl: async () => jsonResponse({ status: "ZERO_RESULTS", results: [] }),
    });
    await expect(
      provider.reverseGeocode({ latitude: 30.3, longitude: 78.0 }),
    ).rejects.toMatchObject({ code: "LOCATION_NO_RESULTS" });
  });

  it("does not serialize the API key onto the unconfigured provider", () => {
    const provider = createLocationSearchProviderFromConfig({
      selector: "google_maps_platform",
      configured: false,
      googleMapsApiKey: null,
    });
    expect(provider.configured).toBe(false);
    expect(JSON.stringify(provider)).not.toContain(API_KEY);
  });
});

describe("location rate limiter", () => {
  it("allows a bounded burst then rejects", () => {
    const limiter = createLocationRateLimiter({ windowMs: 60_000, maxRequests: 2 });
    expect(limiter.consume("ip", 0).allowed).toBe(true);
    expect(limiter.consume("ip", 1).allowed).toBe(true);
    expect(limiter.consume("ip", 2).allowed).toBe(false);
  });
});

describe("serviceability PIN authority vs coordinates", () => {
  it("coordinates without a PIN cannot be treated as serviceable evidence", () => {
    const evidence = normalizeLocationEvidence({
      formattedAddress: "A ridge above Dehradun",
      location: { latitude: 30.45, longitude: 78.08 },
      source: "place_details",
    });
    expect(evidence.pinConfirmed).toBe(false);
    expect(evidence.postalCode).toBeNull();
  });
});
