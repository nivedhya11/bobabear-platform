/**
 * Name and email canonicalization for Customer Profiles (IMP-017).
 *
 * Name pipeline (locked order):
 *   NFC → reject control characters → trim → collapse spacing → length check
 *
 * Email: trim surrounding whitespace; preserve local-part case; lowercase domain.
 */

import {
  CUSTOMER_PROFILE_EMAIL_MAX_LENGTH,
  CUSTOMER_PROFILE_FAMILY_NAME_MAX_LENGTH,
  CUSTOMER_PROFILE_GIVEN_NAME_MAX_LENGTH,
  CUSTOMER_PROFILE_GIVEN_NAME_MIN_LENGTH,
} from "./constants";
import { CustomerProfileError } from "./errors";

/** Cc controls + Unicode line/paragraph separators — never collapsed into spaces. */
const FORBIDDEN_CONTROL_PATTERN =
  /[\u0000-\u001F\u007F-\u009F\u2028\u2029]/u;

function unicodeLength(value: string): number {
  return [...value].length;
}

function rejectControls(value: string, field: "givenName" | "familyName"): void {
  if (FORBIDDEN_CONTROL_PATTERN.test(value)) {
    throw new CustomerProfileError(
      field === "givenName"
        ? "CUSTOMER_PROFILE_GIVEN_NAME_INVALID"
        : "CUSTOMER_PROFILE_FAMILY_NAME_INVALID",
      `${field} contains forbidden control characters.`,
      field,
    );
  }
}

/**
 * Canonicalize a customer name field.
 * Returns `null` only for optional familyName when blank after trim.
 */
export function canonicalizeCustomerName(
  raw: string,
  field: "givenName" | "familyName",
): string | null {
  const nfc = raw.normalize("NFC");
  rejectControls(nfc, field);

  const trimmed = nfc.trim();
  if (trimmed.length === 0) {
    if (field === "familyName") return null;
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_GIVEN_NAME_REQUIRED",
      "givenName is required.",
      "givenName",
    );
  }

  // Collapse runs of ordinary ASCII space only (controls already rejected).
  const collapsed = trimmed.replace(/ {2,}/g, " ");

  const length = unicodeLength(collapsed);
  if (field === "givenName") {
    if (
      length < CUSTOMER_PROFILE_GIVEN_NAME_MIN_LENGTH ||
      length > CUSTOMER_PROFILE_GIVEN_NAME_MAX_LENGTH
    ) {
      throw new CustomerProfileError(
        "CUSTOMER_PROFILE_GIVEN_NAME_INVALID",
        "givenName length is out of range.",
        "givenName",
      );
    }
  } else if (length > CUSTOMER_PROFILE_FAMILY_NAME_MAX_LENGTH) {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_FAMILY_NAME_INVALID",
      "familyName length is out of range.",
      "familyName",
    );
  }

  return collapsed;
}

/**
 * Practical structural email validation — no DNS/MX/network checks.
 * Blank/whitespace-only input becomes null.
 */
export function canonicalizeCustomerEmail(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_EMAIL_INVALID",
      "email must be a string or null.",
      "email",
    );
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_EMAIL_INVALID",
      "email is structurally invalid.",
      "email",
    );
  }

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);

  if (local.length === 0 || domain.length === 0) {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_EMAIL_INVALID",
      "email is structurally invalid.",
      "email",
    );
  }
  if (/\s/.test(local) || /\s/.test(domain)) {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_EMAIL_INVALID",
      "email is structurally invalid.",
      "email",
    );
  }
  if (!domain.includes(".")) {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_EMAIL_INVALID",
      "email is structurally invalid.",
      "email",
    );
  }
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_EMAIL_INVALID",
      "email is structurally invalid.",
      "email",
    );
  }

  const canonical = `${local}@${domain.toLowerCase()}`;
  if (canonical.length > CUSTOMER_PROFILE_EMAIL_MAX_LENGTH) {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_EMAIL_INVALID",
      "email exceeds maximum length.",
      "email",
    );
  }

  // Reject obvious malformed local/domain characters without full RFC parsing.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(canonical)) {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_EMAIL_INVALID",
      "email is structurally invalid.",
      "email",
    );
  }

  return canonical;
}
