/**
 * India-only mobile-number normalization (IMP-009).
 *
 * Shared by the static login client, the customer-auth HTTP façade, Better
 * Auth's `phoneNumberValidator`, temporary-identity derivation, and
 * rate-limit hashing. The server result is authoritative; the client only
 * pre-normalizes for UX.
 *
 * Authoritative validation uses `libphonenumber-js/mobile` — not a
 * hand-rolled regular expression.
 */
import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/mobile";

declare const e164IndianMobileBrand: unique symbol;

export type E164IndianMobileNumber = string & {
  readonly [e164IndianMobileBrand]: "E164IndianMobileNumber";
};

export type NormalizeIndianMobileResult =
  | Readonly<{ ok: true; phoneNumber: E164IndianMobileNumber }>
  | Readonly<{ ok: false; reason: "invalid_phone_number" }>;

const DEFAULT_COUNTRY: CountryCode = "IN";
const MAX_INPUT_LENGTH = 32;

function hasDisallowedCharacters(input: string): boolean {
  // Allow digits, common phone punctuation, and leading '+'. Reject letters
  // and control characters before invoking libphonenumber.
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  if (/[A-Za-z]/.test(input)) return true;
  return false;
}

/**
 * Normalize a customer-supplied phone string to canonical E.164 Indian
 * mobile form (`+91XXXXXXXXXX`). Returns a branded failure result for any
 * non-Indian, non-mobile, malformed, or extended number.
 */
export function normalizeIndianMobileNumber(
  input: unknown,
): NormalizeIndianMobileResult {
  if (typeof input !== "string") {
    return { ok: false, reason: "invalid_phone_number" };
  }

  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_INPUT_LENGTH) {
    return { ok: false, reason: "invalid_phone_number" };
  }
  if (hasDisallowedCharacters(trimmed)) {
    return { ok: false, reason: "invalid_phone_number" };
  }

  const parsed = parsePhoneNumberFromString(trimmed, DEFAULT_COUNTRY);
  if (!parsed) {
    return { ok: false, reason: "invalid_phone_number" };
  }
  if (!parsed.isValid()) {
    return { ok: false, reason: "invalid_phone_number" };
  }
  if (parsed.country !== "IN") {
    return { ok: false, reason: "invalid_phone_number" };
  }
  if (parsed.countryCallingCode !== "91") {
    return { ok: false, reason: "invalid_phone_number" };
  }
  if (parsed.ext) {
    return { ok: false, reason: "invalid_phone_number" };
  }

  const numberType = parsed.getType();
  if (numberType !== "MOBILE" && numberType !== "FIXED_LINE_OR_MOBILE") {
    return { ok: false, reason: "invalid_phone_number" };
  }

  const e164 = parsed.format("E.164");
  if (!e164.startsWith("+91") || e164.length !== 13) {
    return { ok: false, reason: "invalid_phone_number" };
  }

  // Reject leftover payload that libphonenumber silently ignored (e.g. a
  // second number after a separator that still parsed the first half).
  const significantDigits = trimmed.replace(/[^\d+]/g, "");
  const canonicalDigits = e164.replace(/[^\d+]/g, "");
  // Accept common leading-trunk / country-code prefixes on the input.
  const acceptablePrefixes = [
    canonicalDigits,
    canonicalDigits.slice(1), // without '+'
    `0${canonicalDigits.slice(3)}`, // 0XXXXXXXXXX
    `91${canonicalDigits.slice(3)}`,
    `+91${canonicalDigits.slice(3)}`,
  ];
  if (!acceptablePrefixes.some((prefix) => significantDigits === prefix)) {
    // Allow punctuation-only differences already stripped above; if digit
    // sequences still disagree beyond accepted prefixes, reject.
    const national = canonicalDigits.slice(3);
    const strippedInput = significantDigits.replace(/^\+?91|^0/, "");
    if (strippedInput !== national) {
      return { ok: false, reason: "invalid_phone_number" };
    }
  }

  return {
    ok: true,
    phoneNumber: e164 as E164IndianMobileNumber,
  };
}

/** Synchronous validator shape expected by Better Auth's phone plugin. */
export function isValidIndianMobileNumber(phoneNumber: string): boolean {
  return normalizeIndianMobileNumber(phoneNumber).ok;
}
