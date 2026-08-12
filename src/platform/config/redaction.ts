/**
 * Small, deliberately dumb redaction helper.
 *
 * This is configuration-foundation only — it is not a logging framework
 * and it does not attempt to be a general-purpose secret scanner. It exists
 * so that any future code that must render a key/value pair for diagnostics
 * (startup summaries, CLI output, future health/status projections) has one
 * shared, tested way to avoid leaking secret-shaped values.
 */

/** Case-insensitive substrings that mark a key as secret-sensitive. */
const SENSITIVE_KEY_PATTERNS: readonly string[] = [
  "SECRET",
  "TOKEN",
  "PASSWORD",
  "PASSCODE",
  "PRIVATE",
  "CREDENTIAL",
  "AUTH",
  "COOKIE",
  "SESSION",
  "DATABASE_URL",
  "CONNECTION_STRING",
  "API_KEY",
  "SIGNING_KEY",
];

export const REDACTED = "[REDACTED]" as const;

/** Is this key considered secret-sensitive by name? */
export function isSensitiveKey(key: string): boolean {
  const upper = key.toUpperCase();
  return SENSITIVE_KEY_PATTERNS.some((pattern) => upper.includes(pattern));
}

/**
 * Redact a single value if its key looks secret-sensitive.
 *
 * Non-sensitive values are returned as-is (callers decide whether it is
 * otherwise safe to display a given non-sensitive value).
 */
export function redactValue(key: string, value: string | undefined): string {
  if (value === undefined) return "";
  return isSensitiveKey(key) ? REDACTED : value;
}

/**
 * Redact a flat record of key/value pairs.
 *
 * This intentionally only supports flat, string-keyed, string-valued
 * records — the shape environment sources naturally have. It does not
 * recurse into arbitrary nested objects, so it cannot loop on circular
 * references; callers that need to redact something structurally richer
 * must flatten it first and pass the safe, flat projection through here.
 */
export function redactRecord(
  record: Readonly<Record<string, string | undefined>>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of Object.keys(record)) {
    result[key] = redactValue(key, record[key]);
  }
  return result;
}
