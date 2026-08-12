/**
 * Human-text, postal-code, and coordinate canonicalization (IMP-018).
 *
 * Text pipeline (locked order):
 *   NFC → reject control characters → trim → collapse spacing → length check
 *
 * Coordinates are authoritative decimal strings at exactly 7 fractional places.
 */

import {
  CUSTOMER_ADDRESS_CITY_MAX_LENGTH,
  CUSTOMER_ADDRESS_CITY_MIN_LENGTH,
  CUSTOMER_ADDRESS_COORDINATE_FRACTIONAL_DIGITS,
  CUSTOMER_ADDRESS_LABEL_MAX_LENGTH,
  CUSTOMER_ADDRESS_LANDMARK_MAX_LENGTH,
  CUSTOMER_ADDRESS_LINE_1_MAX_LENGTH,
  CUSTOMER_ADDRESS_LINE_1_MIN_LENGTH,
  CUSTOMER_ADDRESS_LINE_2_MAX_LENGTH,
  CUSTOMER_ADDRESS_LOCALITY_MAX_LENGTH,
  CUSTOMER_ADDRESS_RECIPIENT_NAME_MAX_LENGTH,
  CUSTOMER_ADDRESS_RECIPIENT_NAME_MIN_LENGTH,
} from "./constants";
import { CustomerAddressError } from "./errors";
import {
  isIndiaSubdivisionCode,
  type IndiaSubdivisionCode,
} from "./india-states";
import type { CustomerAddressCoordinates } from "./types";
import { normalizeIndianMobileNumber } from "../customer-auth/phone";

/** Cc controls + Unicode line/paragraph separators — never collapsed into spaces. */
const FORBIDDEN_CONTROL_PATTERN =
  /[\u0000-\u001F\u007F-\u009F\u2028\u2029]/u;

const POSTAL_CODE_PATTERN = /^[1-9][0-9]{5}$/;

type TextField =
  | "recipientName"
  | "addressLine1"
  | "addressLine2"
  | "landmark"
  | "locality"
  | "city"
  | "label";

function unicodeLength(value: string): number {
  return [...value].length;
}

function textErrorCode(
  field: TextField,
):
  | "CUSTOMER_ADDRESS_RECIPIENT_NAME_INVALID"
  | "CUSTOMER_ADDRESS_LINE1_INVALID"
  | "CUSTOMER_ADDRESS_LINE1_REQUIRED"
  | "CUSTOMER_ADDRESS_LINE2_INVALID"
  | "CUSTOMER_ADDRESS_LANDMARK_INVALID"
  | "CUSTOMER_ADDRESS_LOCALITY_INVALID"
  | "CUSTOMER_ADDRESS_CITY_INVALID"
  | "CUSTOMER_ADDRESS_LABEL_INVALID" {
  switch (field) {
    case "recipientName":
      return "CUSTOMER_ADDRESS_RECIPIENT_NAME_INVALID";
    case "addressLine1":
      return "CUSTOMER_ADDRESS_LINE1_INVALID";
    case "addressLine2":
      return "CUSTOMER_ADDRESS_LINE2_INVALID";
    case "landmark":
      return "CUSTOMER_ADDRESS_LANDMARK_INVALID";
    case "locality":
      return "CUSTOMER_ADDRESS_LOCALITY_INVALID";
    case "city":
      return "CUSTOMER_ADDRESS_CITY_INVALID";
    case "label":
      return "CUSTOMER_ADDRESS_LABEL_INVALID";
  }
}

function fieldLimits(field: TextField): { min: number; max: number; required: boolean } {
  switch (field) {
    case "recipientName":
      return {
        min: CUSTOMER_ADDRESS_RECIPIENT_NAME_MIN_LENGTH,
        max: CUSTOMER_ADDRESS_RECIPIENT_NAME_MAX_LENGTH,
        required: true,
      };
    case "addressLine1":
      return {
        min: CUSTOMER_ADDRESS_LINE_1_MIN_LENGTH,
        max: CUSTOMER_ADDRESS_LINE_1_MAX_LENGTH,
        required: true,
      };
    case "addressLine2":
      return { min: 1, max: CUSTOMER_ADDRESS_LINE_2_MAX_LENGTH, required: false };
    case "landmark":
      return { min: 1, max: CUSTOMER_ADDRESS_LANDMARK_MAX_LENGTH, required: false };
    case "locality":
      return { min: 1, max: CUSTOMER_ADDRESS_LOCALITY_MAX_LENGTH, required: false };
    case "city":
      return {
        min: CUSTOMER_ADDRESS_CITY_MIN_LENGTH,
        max: CUSTOMER_ADDRESS_CITY_MAX_LENGTH,
        required: true,
      };
    case "label":
      return { min: 1, max: CUSTOMER_ADDRESS_LABEL_MAX_LENGTH, required: false };
  }
}

/**
 * Canonicalize a human-text Address field.
 * Optional blank fields become null; required blank fields fail.
 */
export function canonicalizeAddressText(
  raw: string,
  field: TextField,
): string | null {
  const nfc = raw.normalize("NFC");
  if (FORBIDDEN_CONTROL_PATTERN.test(nfc)) {
    throw new CustomerAddressError(
      textErrorCode(field),
      `${field} contains forbidden control characters.`,
      field,
    );
  }

  const trimmed = nfc.trim();
  const limits = fieldLimits(field);
  if (trimmed.length === 0) {
    if (!limits.required) return null;
    if (field === "addressLine1") {
      throw new CustomerAddressError(
        "CUSTOMER_ADDRESS_LINE1_REQUIRED",
        "addressLine1 is required.",
        "addressLine1",
      );
    }
    throw new CustomerAddressError(
      textErrorCode(field),
      `${field} is required.`,
      field,
    );
  }

  const collapsed = trimmed.replace(/ {2,}/g, " ");
  const length = unicodeLength(collapsed);
  if (length < limits.min || length > limits.max) {
    throw new CustomerAddressError(
      textErrorCode(field),
      `${field} length is out of range.`,
      field,
    );
  }
  return collapsed;
}

export function canonicalizeRecipientPhone(raw: unknown): string {
  const result = normalizeIndianMobileNumber(raw);
  if (!result.ok) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_RECIPIENT_PHONE_INVALID",
      "recipientPhone is not a valid Indian mobile number.",
      "recipientPhone",
    );
  }
  return result.phoneNumber;
}

export function canonicalizePostalCode(raw: unknown): string {
  if (typeof raw !== "string") {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_POSTAL_CODE_INVALID",
      "postalCode must be a string.",
      "postalCode",
    );
  }
  const trimmed = raw.trim();
  if (!POSTAL_CODE_PATTERN.test(trimmed)) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_POSTAL_CODE_INVALID",
      "postalCode must be a six-digit Indian PIN.",
      "postalCode",
    );
  }
  return trimmed;
}

export function canonicalizeStateCode(raw: unknown): IndiaSubdivisionCode {
  if (typeof raw !== "string") {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_STATE_CODE_INVALID",
      "stateCode must be a canonical ISO 3166-2:IN code.",
      "stateCode",
    );
  }
  const trimmed = raw.trim();
  if (!isIndiaSubdivisionCode(trimmed)) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_STATE_CODE_INVALID",
      "stateCode must be a canonical ISO 3166-2:IN code.",
      "stateCode",
    );
  }
  return trimmed;
}

/**
 * Canonicalize a single decimal coordinate component to exactly 7 fractional digits.
 * Rejects scientific notation, NaN/Infinity, excess precision, and out-of-range values.
 */
function canonicalizeCoordinateComponent(
  raw: unknown,
  kind: "latitude" | "longitude",
): string {
  if (typeof raw !== "string") {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_COORDINATES_INVALID",
      "coordinates members must be decimal strings.",
      "coordinates",
    );
  }

  const trimmed = raw.trim();
  // Ordinary base-10 decimal only — no scientific notation, hex, or empty.
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(trimmed)) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_COORDINATES_INVALID",
      "coordinates must be ordinary base-10 decimals.",
      "coordinates",
    );
  }
  if (/[eE]/.test(trimmed)) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_COORDINATES_INVALID",
      "coordinates must not use scientific notation.",
      "coordinates",
    );
  }

  const negative = trimmed.startsWith("-");
  const unsigned = trimmed.replace(/^[+-]/, "");
  const [intPartRaw, fracRaw = ""] = unsigned.split(".");
  const intPart = intPartRaw === "" ? "0" : intPartRaw.replace(/^0+(?=\d)/, "") || "0";

  // Harmless trailing zeros beyond 7 may canonicalize away; non-zero excess fails.
  if (fracRaw.length > CUSTOMER_ADDRESS_COORDINATE_FRACTIONAL_DIGITS) {
    const excess = fracRaw.slice(CUSTOMER_ADDRESS_COORDINATE_FRACTIONAL_DIGITS);
    if (/[1-9]/.test(excess)) {
      throw new CustomerAddressError(
        "CUSTOMER_ADDRESS_COORDINATES_INVALID",
        "coordinates exceed 7 fractional decimal places.",
        "coordinates",
      );
    }
  }

  const frac =
    (fracRaw + "0000000").slice(0, CUSTOMER_ADDRESS_COORDINATE_FRACTIONAL_DIGITS);
  let canonical = `${intPart}.${frac}`;

  // Normalize signed zero.
  if (/^0+(?:\.0+)?$/.test(canonical)) {
    canonical = `0.${"0".repeat(CUSTOMER_ADDRESS_COORDINATE_FRACTIONAL_DIGITS)}`;
  } else if (negative) {
    canonical = `-${canonical}`;
  }

  const min = kind === "latitude" ? "-90.0000000" : "-180.0000000";
  const max = kind === "latitude" ? "90.0000000" : "180.0000000";
  if (compareDecimalStrings(canonical, min) < 0 || compareDecimalStrings(canonical, max) > 0) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_COORDINATES_INVALID",
      `${kind} is out of range.`,
      "coordinates",
    );
  }

  return canonical;
}

/** Decimal-string comparison without floating-point conversion. */
export function compareDecimalStrings(a: string, b: string): number {
  const norm = (value: string): { neg: boolean; int: string; frac: string } => {
    const neg = value.startsWith("-");
    const body = neg ? value.slice(1) : value;
    const [i, f = ""] = body.split(".");
    return { neg, int: i.replace(/^0+(?=\d)/, "") || "0", frac: f };
  };
  const left = norm(a);
  const right = norm(b);
  if (left.neg !== right.neg) {
    // -0 and +0 already normalized away for coordinates; still handle generally.
    if (left.int === "0" && right.int === "0" && /^0*$/.test(left.frac) && /^0*$/.test(right.frac)) {
      return 0;
    }
    return left.neg ? -1 : 1;
  }
  const sign = left.neg ? -1 : 1;
  if (left.int.length !== right.int.length) {
    return sign * (left.int.length < right.int.length ? -1 : 1);
  }
  if (left.int !== right.int) {
    return sign * (left.int < right.int ? -1 : 1);
  }
  const fracLen = Math.max(left.frac.length, right.frac.length);
  const lf = left.frac.padEnd(fracLen, "0");
  const rf = right.frac.padEnd(fracLen, "0");
  if (lf === rf) return 0;
  return sign * (lf < rf ? -1 : 1);
}

export function canonicalizeCoordinates(
  raw: CustomerAddressCoordinates | null | undefined,
): CustomerAddressCoordinates | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_COORDINATES_INVALID",
      "coordinates must be null or { latitude, longitude }.",
      "coordinates",
    );
  }
  const record = raw as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== 2 || !("latitude" in record) || !("longitude" in record)) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_COORDINATES_INVALID",
      "coordinates must include both latitude and longitude only.",
      "coordinates",
    );
  }
  return Object.freeze({
    latitude: canonicalizeCoordinateComponent(record.latitude, "latitude"),
    longitude: canonicalizeCoordinateComponent(record.longitude, "longitude"),
  });
}

/**
 * Normalize a NUMERIC driver value to the canonical 7-decimal domain string
 * without range re-validation beyond what the DB already enforces.
 */
export function normalizeStoredCoordinate(value: string): string {
  const trimmed = value.trim();
  const negative = trimmed.startsWith("-");
  const unsigned = trimmed.replace(/^[+-]/, "");
  const [intPartRaw, fracRaw = ""] = unsigned.split(".");
  const intPart = intPartRaw === "" ? "0" : intPartRaw.replace(/^0+(?=\d)/, "") || "0";
  const frac = (fracRaw + "0000000").slice(0, CUSTOMER_ADDRESS_COORDINATE_FRACTIONAL_DIGITS);
  let canonical = `${intPart}.${frac}`;
  if (/^0+(?:\.0+)?$/.test(canonical)) {
    return `0.${"0".repeat(CUSTOMER_ADDRESS_COORDINATE_FRACTIONAL_DIGITS)}`;
  }
  if (negative) canonical = `-${canonical}`;
  return canonical;
}
