import { isSensitiveKey, REDACTED } from "../config/redaction";

const SENSITIVE_VALUE_PATTERNS: readonly RegExp[] = [
  /^Bearer\s+/i,
  /^Basic\s+/i,
];

const MAX_DEPTH = 12;
const MAX_KEYS = 64;

function looksLikeSensitiveValue(value: string): boolean {
  return SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function redactPrimitive(key: string | undefined, value: unknown): unknown {
  if (typeof value === "string") {
    if (key && isSensitiveKey(key)) return REDACTED;
    if (looksLikeSensitiveValue(value)) return REDACTED;
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }
  return REDACTED;
}

/**
 * Deep-redact arbitrary log metadata. Sensitive keys, auth-shaped values, and
 * nested secret fields are replaced with `[REDACTED]`.
 */
export function redactLogObject(
  value: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet(),
): unknown {
  if (depth > MAX_DEPTH) return REDACTED;
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return redactPrimitive(undefined, value);
  if (seen.has(value)) return REDACTED;
  seen.add(value);

  if (Array.isArray(value)) {
    return value.slice(0, MAX_KEYS).map((entry) => redactLogObject(entry, depth + 1, seen));
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).slice(0, MAX_KEYS);
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const entry = record[key];
    if (isSensitiveKey(key)) {
      result[key] = REDACTED;
      continue;
    }
    if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean" || entry === null) {
      result[key] = redactPrimitive(key, entry);
      continue;
    }
    result[key] = redactLogObject(entry, depth + 1, seen);
  }
  return result;
}
