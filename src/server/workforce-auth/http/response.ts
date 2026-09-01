/**
 * Shared response helpers for the workforce-auth HTTP service (IMP-010).
 *
 * Every response is `Cache-Control: no-store`, carries an `X-Request-ID`
 * for correlation with the safe structured log line the service layer
 * emits, and forwards multiple `Set-Cookie` values individually (never
 * merged into one header).
 */
import "server-only";

import { generateRequestId as createRequestId } from "../../../platform/observability/request-id";
import type { ServerResponse } from "node:http";

export function generateRequestId(): string {
  return createRequestId();
}

export type SendJsonOptions = Readonly<{
  status: number;
  requestId: string;
  retryAfterSeconds?: number;
  setCookies?: readonly string[];
  varyCookie?: boolean;
}>;

export function sendJson(res: ServerResponse, body: unknown, options: SendJsonOptions): void {
  if (res.writableEnded) return;

  res.statusCode = options.status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Request-ID", options.requestId);
  res.setHeader("X-Correlation-ID", options.requestId);

  if (options.varyCookie) {
    res.setHeader("Vary", "Cookie");
  }
  if (typeof options.retryAfterSeconds === "number") {
    res.setHeader("Retry-After", String(Math.max(0, Math.ceil(options.retryAfterSeconds))));
  }
  if (options.setCookies) {
    for (const cookie of options.setCookies) {
      res.appendHeader("Set-Cookie", cookie);
    }
  }

  res.end(JSON.stringify(body));
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
