/** Operations HTTP response helpers (IMP-029). */
import "server-only";

import type { ServerResponse } from "node:http";

export type SendJsonOptions = Readonly<{
  status: number;
  requestId: string;
}>;

function jsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString(10) : value;
}

export function sendJson(
  res: ServerResponse,
  body: unknown,
  options: SendJsonOptions,
): void {
  if (res.writableEnded) return;

  res.statusCode = options.status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Request-ID", options.requestId);
  res.end(JSON.stringify(body, jsonReplacer));
}

export function sendMethodNotAllowed(
  res: ServerResponse,
  requestId: string,
  allowedMethods: string,
): void {
  res.setHeader("Allow", allowedMethods);
  sendJson(
    res,
    { ok: false, code: "METHOD_NOT_ALLOWED", requestId },
    { status: 405, requestId },
  );
}

export function sendNotFound(res: ServerResponse, requestId: string): void {
  sendJson(
    res,
    { ok: false, code: "NOT_FOUND", requestId },
    { status: 404, requestId },
  );
}
