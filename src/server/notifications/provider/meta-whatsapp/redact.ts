/**
 * Redact sensitive fields from Meta webhook / Graph payloads before persistence
 * or logging (IMP-034). Never store access tokens, app secrets, or full media URLs.
 */
const SENSITIVE_KEY_PATTERN =
  /^(access_token|app_secret|authorization|password|secret|token|otp|pin|cvv)$/i;

const MEDIA_URL_KEYS = new Set([
  "url",
  "media_url",
  "link",
  "href",
  "download_url",
  "file_url",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return "[REDACTED]";
  }
  if (MEDIA_URL_KEYS.has(key.toLowerCase()) && typeof value === "string") {
    // Keep scheme+host shape only when it looks like a URL; otherwise drop.
    try {
      const parsed = new URL(value);
      return `${parsed.protocol}//${parsed.host}/[REDACTED_PATH]`;
    } catch {
      return "[REDACTED_URL]";
    }
  }
  return redactUnknown(value);
}

export function redactUnknown(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactUnknown(item));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    out[key] = redactValue(key, nested);
  }
  return out;
}

export function redactWebhookPayload(
  payload: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return Object.freeze(redactUnknown(payload) as Record<string, unknown>);
}

/** Truncate inbound body text for durable preview storage. */
export function truncateBodyPreview(text: string | null | undefined, max = 280): string | null {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
}
