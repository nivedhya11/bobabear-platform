/**
 * Response helpers for customer-commerce (IMP-024 / IMP-028 Slice 6).
 *
 * Every response is `Cache-Control: no-store` and carries `X-Request-ID`.
 * Bigint values serialize as base-10 decimal strings — never as Number.
 */
import "server-only";

import { randomUUID } from "node:crypto";
import type { ServerResponse } from "node:http";

export function generateRequestId(): string {
  return randomUUID();
}

export type SendJsonOptions = Readonly<{
  status: number;
  requestId: string;
}>;

export type SendPdfArtifact = Readonly<{
  bytes: Uint8Array;
  byteLength: number;
  suggestedFilename: string;
}>;

/** Slice-4 safe filename shape: no quotes, CR/LF, or control characters. */
const SAFE_ATTACHMENT_FILENAME = /^[A-Za-z0-9._-]+\.pdf$/;

/**
 * Build a Content-Disposition attachment header without concatenating unsafe input.
 * Rejects quotes, CR, LF, backslash, and control characters even if a caller
 * bypasses Slice-4 filename sanitization.
 */
export function buildAttachmentContentDisposition(filename: string): string {
  if (
    typeof filename !== "string" ||
    filename.length === 0 ||
    filename.length > 200 ||
    !SAFE_ATTACHMENT_FILENAME.test(filename)
  ) {
    throw new Error("UNSAFE_CONTENT_DISPOSITION_FILENAME");
  }
  // Proven ASCII token set — safe inside a quoted-string without escaping.
  return `attachment; filename="${filename}"`;
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString(10);
  }
  return value;
}

export function sendJson(res: ServerResponse, body: unknown, options: SendJsonOptions): void {
  if (res.writableEnded) return;

  res.statusCode = options.status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Request-ID", options.requestId);
  res.end(JSON.stringify(body, jsonReplacer));
}

/**
 * Authenticated Financial Document PDF download response (IMP-028 Slice 6).
 * Uses repository-standard `Cache-Control: no-store` (no shared-cache storage).
 */
export function sendPdf(
  res: ServerResponse,
  artifact: SendPdfArtifact,
  options: SendJsonOptions,
): void {
  if (res.writableEnded) return;

  const disposition = buildAttachmentContentDisposition(artifact.suggestedFilename);
  res.statusCode = options.status;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Length", String(artifact.byteLength));
  res.setHeader("Content-Disposition", disposition);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Request-ID", options.requestId);
  res.end(Buffer.from(artifact.bytes));
}

export function sendNoContent(res: ServerResponse, requestId: string): void {
  if (res.writableEnded) return;
  res.statusCode = 204;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Request-ID", requestId);
  res.end();
}

export function sendMethodNotAllowed(
  res: ServerResponse,
  allowedMethods: readonly string[],
  requestId: string,
): void {
  res.setHeader("Allow", allowedMethods.join(", "));
  sendJson(res, { ok: false, code: "METHOD_NOT_ALLOWED" }, { status: 405, requestId });
}

export function sendNotFound(res: ServerResponse, requestId: string): void {
  sendJson(res, { ok: false, code: "NOT_FOUND" }, { status: 404, requestId });
}
