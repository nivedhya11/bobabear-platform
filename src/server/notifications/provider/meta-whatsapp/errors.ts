/**
 * Map Meta Graph API HTTP errors to NotificationRetryCategory (IMP-034).
 *
 * Raw Meta codes never become retry authority on their own — they normalize
 * into the IMP-033 vocabulary exactly once.
 */
import type { NotificationRetryCategory } from "../../../../shared/notifications";

/** Recipient / user-unreachable style Graph codes. */
const RECIPIENT_UNAVAILABLE_CODES = new Set([
  131026, // Message undeliverable
  131047, // Re-engagement message
  131051, // Unsupported message type (treat as recipient/channel issue)
  130472, // User's number is part of an experiment
  131000, // Something went wrong (sometimes recipient)
]);

/** Template / message-template Graph codes (132000-ish family). */
const TEMPLATE_FAILURE_CODES = new Set([
  132000, // Template param count mismatch
  132001, // Template does not exist
  132005, // Template hydrated text too long
  132007, // Template format character policy
  132012, // Template parameter format mismatch
  132015, // Template paused
  132016, // Template disabled
]);

function extractGraphErrorCode(json: unknown): number | null {
  if (typeof json !== "object" || json === null) return null;
  const error = (json as Record<string, unknown>).error;
  if (typeof error !== "object" || error === null) return null;
  const code = (error as Record<string, unknown>).code;
  return typeof code === "number" && Number.isFinite(code) ? code : null;
}

function extractGraphErrorMessage(json: unknown): string | null {
  if (typeof json !== "object" || json === null) return null;
  const error = (json as Record<string, unknown>).error;
  if (typeof error !== "object" || error === null) return null;
  const message = (error as Record<string, unknown>).message;
  if (typeof message !== "string") return null;
  const trimmed = message.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, 500);
}

export type MappedMetaWhatsAppFailure = Readonly<{
  category: NotificationRetryCategory;
  code: string;
  detail: string | null;
}>;

export function mapMetaWhatsAppHttpError(
  status: number,
  json: unknown,
): MappedMetaWhatsAppFailure {
  const graphCode = extractGraphErrorCode(json);
  const detail = extractGraphErrorMessage(json);
  const code =
    graphCode !== null ? `META_GRAPH_${graphCode}` : `META_HTTP_${status}`;

  if (status === 401 || status === 403) {
    return Object.freeze({
      category: "AUTHENTICATION_FAILURE",
      code,
      detail,
    });
  }
  if (status === 429) {
    return Object.freeze({
      category: "RATE_LIMITED",
      code,
      detail,
    });
  }

  if (graphCode !== null) {
    if (TEMPLATE_FAILURE_CODES.has(graphCode) || (graphCode >= 132000 && graphCode < 133000)) {
      return Object.freeze({
        category: "TEMPLATE_FAILURE",
        code,
        detail,
      });
    }
    if (RECIPIENT_UNAVAILABLE_CODES.has(graphCode)) {
      return Object.freeze({
        category: "RECIPIENT_UNAVAILABLE",
        code,
        detail,
      });
    }
  }

  if (status >= 500) {
    return Object.freeze({
      category: "TRANSIENT",
      code,
      detail,
    });
  }

  if (status >= 400 && status < 500) {
    return Object.freeze({
      category: "PERMANENT_FAILURE",
      code,
      detail,
    });
  }

  return Object.freeze({
    category: "UNKNOWN",
    code,
    detail,
  });
}
