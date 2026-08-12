/**
 * Workforce email normalization for identity and rate-limit hashing (IMP-010).
 *
 * Trims and lowercases. Rejects empty or obviously invalid shapes without
 * attempting full RFC validation — this is an identity-normalization helper,
 * not a deliverability checker.
 */

declare const normalizedWorkforceEmailBrand: unique symbol;

export type NormalizedWorkforceEmail = string & {
  readonly [normalizedWorkforceEmailBrand]: "NormalizedWorkforceEmail";
};

export type NormalizeWorkforceEmailResult =
  | Readonly<{ ok: true; email: NormalizedWorkforceEmail }>
  | Readonly<{ ok: false; reason: "invalid_email" }>;

const BASIC_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normalize a workforce email for hashing and Better Auth sign-in.
 * Returns `{ ok: false }` for empty, whitespace-only, or basic-shape failures.
 */
export function normalizeWorkforceEmail(raw: unknown): NormalizeWorkforceEmailResult {
  if (typeof raw !== "string") {
    return { ok: false, reason: "invalid_email" };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: "invalid_email" };
  }
  if (trimmed.length > 320) {
    return { ok: false, reason: "invalid_email" };
  }
  const normalized = trimmed.toLowerCase();
  if (!BASIC_EMAIL_PATTERN.test(normalized)) {
    return { ok: false, reason: "invalid_email" };
  }
  if (normalized.includes("..") || normalized.startsWith(".") || normalized.endsWith(".")) {
    return { ok: false, reason: "invalid_email" };
  }
  const atIndex = normalized.indexOf("@");
  const local = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);
  if (local.length === 0 || domain.length === 0 || !domain.includes(".")) {
    return { ok: false, reason: "invalid_email" };
  }
  return { ok: true, email: normalized as NormalizedWorkforceEmail };
}

export function isValidWorkforceEmail(raw: unknown): raw is string {
  return normalizeWorkforceEmail(raw).ok;
}
