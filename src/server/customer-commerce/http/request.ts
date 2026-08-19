/**
 * Strict JSON request-body reading for customer-commerce (IMP-024).
 */
import "server-only";

import type { IncomingMessage } from "node:http";

export const MAX_JSON_BODY_BYTES = 64 * 1024;
const BODY_READ_TIMEOUT_MS = 5_000;
const JSON_CONTENT_TYPE_PATTERN = /^application\/json(?:\s*;.*)?$/i;

export type ReadJsonObjectBodyFailureReason =
  | "content_type_invalid"
  | "too_large"
  | "malformed_json"
  | "invalid_shape"
  | "timeout";

export type ReadJsonObjectBodyResult =
  | Readonly<{ ok: true; value: Readonly<Record<string, unknown>> }>
  | Readonly<{ ok: false; reason: ReadJsonObjectBodyFailureReason }>;

function firstHeaderValue(value: string | readonly string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

function containsDisallowedControlCharacters(raw: string): boolean {
  for (let i = 0; i < raw.length; i += 1) {
    const code = raw.charCodeAt(i);
    if (code === 0x09 || code === 0x0a || code === 0x0d) continue;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Read a JSON object body. When `allowedFields` is provided, unknown
 * top-level fields are rejected. When omitted, any object shape is accepted
 * (application parsers enforce field allowlists).
 */
export function readJsonObjectBody(
  req: IncomingMessage,
  allowedFields?: readonly string[],
): Promise<ReadJsonObjectBodyResult> {
  const contentType = firstHeaderValue(req.headers["content-type"]);
  if (!contentType || !JSON_CONTENT_TYPE_PATTERN.test(contentType)) {
    return Promise.resolve({ ok: false, reason: "content_type_invalid" });
  }

  return new Promise<ReadJsonObjectBodyResult>((resolve) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;

    function finish(result: ReadJsonObjectBodyResult): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    }

    const timer = setTimeout(() => {
      req.destroy();
      finish({ ok: false, reason: "timeout" });
    }, BODY_READ_TIMEOUT_MS);

    req.on("data", (chunk: Buffer) => {
      if (settled) return;
      totalBytes += chunk.length;
      if (totalBytes > MAX_JSON_BODY_BYTES) {
        req.destroy();
        finish({ ok: false, reason: "too_large" });
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (settled) return;
      const raw = Buffer.concat(chunks).toString("utf8");

      if (containsDisallowedControlCharacters(raw)) {
        finish({ ok: false, reason: "malformed_json" });
        return;
      }

      let parsed: unknown;
      try {
        parsed = raw.length === 0 ? undefined : JSON.parse(raw);
      } catch {
        finish({ ok: false, reason: "malformed_json" });
        return;
      }

      if (
        parsed === undefined ||
        parsed === null ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        finish({ ok: false, reason: "invalid_shape" });
        return;
      }

      const record = parsed as Record<string, unknown>;
      if (allowedFields) {
        for (const key of Object.keys(record)) {
          if (!allowedFields.includes(key)) {
            finish({ ok: false, reason: "invalid_shape" });
            return;
          }
        }
      }

      finish({ ok: true, value: Object.freeze({ ...record }) });
    });

    req.on("error", () => {
      finish({ ok: false, reason: "malformed_json" });
    });
  });
}

export type ReadRawBodyResult =
  | Readonly<{ ok: true; value: Uint8Array }>
  | Readonly<{ ok: false; reason: ReadJsonObjectBodyFailureReason }>;

/**
 * Read exact raw body bytes for provider signature verification.
 * Does not parse JSON and does not alter bytes after read.
 */
export function readRawBody(
  req: IncomingMessage,
  maxBytes: number = MAX_JSON_BODY_BYTES,
): Promise<ReadRawBodyResult> {
  return new Promise<ReadRawBodyResult>((resolve) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;

    function finish(result: ReadRawBodyResult): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    }

    const timer = setTimeout(() => {
      req.destroy();
      finish({ ok: false, reason: "timeout" });
    }, BODY_READ_TIMEOUT_MS);

    req.on("data", (chunk: Buffer) => {
      if (settled) return;
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        req.destroy();
        finish({ ok: false, reason: "too_large" });
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (settled) return;
      finish({ ok: true, value: new Uint8Array(Buffer.concat(chunks)) });
    });

    req.on("error", () => {
      finish({ ok: false, reason: "malformed_json" });
    });
  });
}

export function readOptionalJsonObjectBody(
  req: IncomingMessage,
  allowedFields?: readonly string[],
): Promise<ReadJsonObjectBodyResult | Readonly<{ ok: true; value: null }>> {
  const contentLength = firstHeaderValue(req.headers["content-length"]);
  if (contentLength === "0" || contentLength === undefined) {
    const contentType = firstHeaderValue(req.headers["content-type"]);
    if (!contentType) {
      return Promise.resolve({ ok: true, value: null });
    }
  }
  return readJsonObjectBody(req, allowedFields);
}
