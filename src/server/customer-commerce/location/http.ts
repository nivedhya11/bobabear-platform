/**
 * Location HTTP handlers for customer-commerce (IMP-036B Google Maps amendment).
 */
import "server-only";

import type { IncomingMessage, ServerResponse } from "node:http";

import { LocationError } from "./errors";
import type { LocationRateLimiter } from "./rate-limit";
import type { LocationSearchProvider } from "./google-maps-provider";
import { readJsonObjectBody } from "../http/request";
import { mapInvalidRequest } from "../http/error-map";
import {
  sendJson,
  sendMethodNotAllowed,
} from "../http/response";

export type LocationRouteOutcome = Readonly<{
  operation: string;
  safeOutcomeCode: string;
  httpStatus: number;
}>;

function outcome(
  operation: string,
  httpStatus: number,
  safeOutcomeCode: string,
): LocationRouteOutcome {
  return Object.freeze({ operation, safeOutcomeCode, httpStatus });
}

function clientKey(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim().length > 0) {
    return forwarded.split(",")[0]!.trim();
  }
  return req.socket.remoteAddress ?? "unknown";
}

function projectEvidence(evidence: Awaited<ReturnType<LocationSearchProvider["resolvePlace"]>>) {
  return Object.freeze({
    displayAddress: evidence.displayAddress,
    postalCode: evidence.postalCode,
    pinConfirmed: evidence.pinConfirmed,
    locality: evidence.locality,
    administrativeArea: evidence.administrativeArea,
    stateCode: evidence.stateCode,
    country: evidence.country,
    countryCode: evidence.countryCode,
    // Coordinates may be returned transiently for reverse-geocode UX; clients
    // must not persist them beyond current delivery-context rules.
    latitude: evidence.latitude,
    longitude: evidence.longitude,
  });
}

function mapLocationError(
  error: unknown,
  requestId: string,
  res: ServerResponse,
): LocationRouteOutcome {
  if (error instanceof LocationError) {
    const status =
      error.code === "LOCATION_RATE_LIMITED"
        ? 429
        : error.code === "LOCATION_INVALID_INPUT"
          ? 400
          : error.code === "LOCATION_NO_RESULTS"
            ? 404
            : 503;
    sendJson(
      res,
      {
        ok: false,
        code: error.code,
        requestId,
        ...(error.field ? { field: error.field } : {}),
      },
      { status, requestId },
    );
    return outcome("location", status, error.code);
  }
  sendJson(res, { ok: false, code: "INTERNAL_ERROR", requestId }, { status: 500, requestId });
  return outcome("location", 500, "INTERNAL_ERROR");
}

async function readBody(
  req: IncomingMessage,
  requestId: string,
  res: ServerResponse,
  allowedFields: readonly string[],
): Promise<Readonly<Record<string, unknown>> | null> {
  const result = await readJsonObjectBody(req, allowedFields);
  if (!result.ok) {
    const mapped = mapInvalidRequest(requestId);
    sendJson(res, mapped.body, { status: mapped.status, requestId });
    return null;
  }
  return result.value;
}

function enforceRateLimit(
  req: IncomingMessage,
  res: ServerResponse,
  requestId: string,
  limiter: LocationRateLimiter | undefined,
): LocationRouteOutcome | null {
  if (!limiter) return null;
  const limited = limiter.consume(clientKey(req));
  if (limited.allowed) return null;
  sendJson(
    res,
    { ok: false, code: "LOCATION_RATE_LIMITED", requestId },
    { status: 429, requestId },
  );
  return outcome("location", 429, "LOCATION_RATE_LIMITED");
}

export async function handleLocationStatus(
  req: IncomingMessage,
  res: ServerResponse,
  deps: Readonly<{ locationProvider?: LocationSearchProvider | null }>,
  requestId: string,
): Promise<LocationRouteOutcome> {
  if (req.method !== "GET") {
    sendMethodNotAllowed(res, ["GET"], requestId);
    return outcome("location_status", 405, "METHOD_NOT_ALLOWED");
  }
  const configured = deps.locationProvider?.configured === true;
  sendJson(
    res,
    {
      ok: true,
      configured,
      provider: "google_maps",
      status: configured ? "CONFIGURED" : "NOT_CONFIGURED",
    },
    { status: 200, requestId },
  );
  return outcome("location_status", 200, "OK");
}

export async function handleLocationAutocomplete(
  req: IncomingMessage,
  res: ServerResponse,
  deps: Readonly<{
    locationProvider?: LocationSearchProvider | null;
    locationRateLimiter?: LocationRateLimiter;
  }>,
  requestId: string,
): Promise<LocationRouteOutcome> {
  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"], requestId);
    return outcome("location_autocomplete", 405, "METHOD_NOT_ALLOWED");
  }
  const limited = enforceRateLimit(req, res, requestId, deps.locationRateLimiter);
  if (limited) return { ...limited, operation: "location_autocomplete" };
  if (!deps.locationProvider?.configured) {
    sendJson(
      res,
      { ok: false, code: "LOCATION_PROVIDER_UNAVAILABLE", requestId },
      { status: 503, requestId },
    );
    return outcome("location_autocomplete", 503, "LOCATION_PROVIDER_UNAVAILABLE");
  }
  const body = await readBody(req, requestId, res, ["query", "sessionToken"]);
  if (!body) return outcome("location_autocomplete", 400, "INVALID_REQUEST");
  try {
    const suggestions = await deps.locationProvider.autocomplete({
      query: typeof body.query === "string" ? body.query : "",
      sessionToken: typeof body.sessionToken === "string" ? body.sessionToken : "",
    });
    sendJson(res, { ok: true, suggestions }, { status: 200, requestId });
    return outcome("location_autocomplete", 200, "OK");
  } catch (error) {
    const mapped = mapLocationError(error, requestId, res);
    return { ...mapped, operation: "location_autocomplete" };
  }
}

export async function handleLocationPlace(
  req: IncomingMessage,
  res: ServerResponse,
  deps: Readonly<{
    locationProvider?: LocationSearchProvider | null;
    locationRateLimiter?: LocationRateLimiter;
  }>,
  requestId: string,
): Promise<LocationRouteOutcome> {
  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"], requestId);
    return outcome("location_place", 405, "METHOD_NOT_ALLOWED");
  }
  const limited = enforceRateLimit(req, res, requestId, deps.locationRateLimiter);
  if (limited) return { ...limited, operation: "location_place" };
  if (!deps.locationProvider?.configured) {
    sendJson(
      res,
      { ok: false, code: "LOCATION_PROVIDER_UNAVAILABLE", requestId },
      { status: 503, requestId },
    );
    return outcome("location_place", 503, "LOCATION_PROVIDER_UNAVAILABLE");
  }
  const body = await readBody(req, requestId, res, ["placeId", "sessionToken"]);
  if (!body) return outcome("location_place", 400, "INVALID_REQUEST");
  try {
    const evidence = await deps.locationProvider.resolvePlace({
      placeId: typeof body.placeId === "string" ? body.placeId : "",
      sessionToken: typeof body.sessionToken === "string" ? body.sessionToken : "",
    });
    sendJson(
      res,
      { ok: true, location: projectEvidence(evidence) },
      { status: 200, requestId },
    );
    return outcome("location_place", 200, "OK");
  } catch (error) {
    const mapped = mapLocationError(error, requestId, res);
    return { ...mapped, operation: "location_place" };
  }
}

export async function handleLocationReverseGeocode(
  req: IncomingMessage,
  res: ServerResponse,
  deps: Readonly<{
    locationProvider?: LocationSearchProvider | null;
    locationRateLimiter?: LocationRateLimiter;
  }>,
  requestId: string,
): Promise<LocationRouteOutcome> {
  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"], requestId);
    return outcome("location_reverse_geocode", 405, "METHOD_NOT_ALLOWED");
  }
  const limited = enforceRateLimit(req, res, requestId, deps.locationRateLimiter);
  if (limited) return { ...limited, operation: "location_reverse_geocode" };
  if (!deps.locationProvider?.configured) {
    sendJson(
      res,
      { ok: false, code: "LOCATION_PROVIDER_UNAVAILABLE", requestId },
      { status: 503, requestId },
    );
    return outcome("location_reverse_geocode", 503, "LOCATION_PROVIDER_UNAVAILABLE");
  }
  const body = await readBody(req, requestId, res, ["latitude", "longitude"]);
  if (!body) return outcome("location_reverse_geocode", 400, "INVALID_REQUEST");
  try {
    const latitude = typeof body.latitude === "number" ? body.latitude : Number.NaN;
    const longitude = typeof body.longitude === "number" ? body.longitude : Number.NaN;
    const evidence = await deps.locationProvider.reverseGeocode({ latitude, longitude });
    sendJson(
      res,
      { ok: true, location: projectEvidence(evidence) },
      { status: 200, requestId },
    );
    return outcome("location_reverse_geocode", 200, "OK");
  } catch (error) {
    const mapped = mapLocationError(error, requestId, res);
    return { ...mapped, operation: "location_reverse_geocode" };
  }
}
