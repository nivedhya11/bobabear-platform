/**
 * Bounded location-provider errors. Codes are customer-commerce envelope codes.
 * Messages are internal-only and must not be returned to the browser.
 */
export type LocationErrorCode =
  | "LOCATION_INVALID_INPUT"
  | "LOCATION_PROVIDER_UNAVAILABLE"
  | "LOCATION_RATE_LIMITED"
  | "LOCATION_NO_RESULTS";

export class LocationError extends Error {
  readonly code: LocationErrorCode;
  readonly field?: string;

  constructor(code: LocationErrorCode, message: string, field?: string) {
    super(message);
    this.name = "LocationError";
    this.code = code;
    this.field = field;
  }
}
