/**
 * Response helpers for customer-commerce (IMP-024).
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
