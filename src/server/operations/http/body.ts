/** Strict bounded JSON object reading for Operations mutations (IMP-029). */
import "server-only";

import type { IncomingMessage } from "node:http";

export const MAX_OPERATIONS_JSON_BODY_BYTES = 64 * 1024;
const BODY_READ_TIMEOUT_MS = 5_000;
const JSON_CONTENT_TYPE_PATTERN = /^application\/json(?:\s*;.*)?$/i;

export type ReadOperationsJsonObjectBodyResult =
  | Readonly<{ ok: true; value: Readonly<Record<string, unknown>> }>
  | Readonly<{ ok: false }>;

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

export function readOperationsJsonObjectBody(req: IncomingMessage): Promise<ReadOperationsJsonObjectBodyResult> {
  const contentType = firstHeaderValue(req.headers["content-type"]);
  if (!contentType || !JSON_CONTENT_TYPE_PATTERN.test(contentType)) return Promise.resolve({ ok: false });

  return new Promise<ReadOperationsJsonObjectBodyResult>((resolve) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;
    function finish(result: ReadOperationsJsonObjectBodyResult): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    }
    const timer = setTimeout(() => {
      req.destroy();
      finish({ ok: false });
    }, BODY_READ_TIMEOUT_MS);
    req.on("data", (chunk: Buffer) => {
      if (settled) return;
      totalBytes += chunk.length;
      if (totalBytes > MAX_OPERATIONS_JSON_BODY_BYTES) {
        // Keep the socket usable so the router can deliver its safe 400 JSON.
        finish({ ok: false });
        req.resume();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (settled) return;
      const raw = Buffer.concat(chunks).toString("utf8");
      if (containsDisallowedControlCharacters(raw)) return finish({ ok: false });
      let parsed: unknown;
      try { parsed = raw.length === 0 ? undefined : JSON.parse(raw); } catch { return finish({ ok: false }); }
      if (parsed === undefined || parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return finish({ ok: false });
      finish({ ok: true, value: Object.freeze({ ...(parsed as Record<string, unknown>) }) });
    });
    req.on("error", () => finish({ ok: false }));
  });
}
