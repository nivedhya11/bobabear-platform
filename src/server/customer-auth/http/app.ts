/**
 * `http.RequestListener` factory wiring the router into a Node HTTP server
 * (IMP-009).
 *
 * Deliberately never calls `console.*` — only the service layer
 * (`../service.ts`) logs, and only with the allowlisted safe fields it
 * receives via `onRequestComplete`.
 */
import "server-only";

import process from "node:process";
import type { IncomingMessage, RequestListener, ServerResponse } from "node:http";

import { generateRequestId, sendJson } from "./response";
import {
  routeCustomerAuthRequest,
  type CustomerAuthRouteDependencies,
  type CustomerAuthRouteOutcome,
} from "./router";

export type CustomerAuthRequestEvent = Readonly<{
  requestId: string;
  operation: string;
  safeOutcomeCode: string;
  httpStatus: number;
  durationMs: number;
  rateLimitScope?: string;
}>;

export type CustomerAuthAppHooks = Readonly<{
  onRequestStart?: () => void;
  onRequestComplete?: (event: CustomerAuthRequestEvent) => void;
}>;

const UNHANDLED_ERROR_OUTCOME: CustomerAuthRouteOutcome = Object.freeze({
  operation: "unknown",
  safeOutcomeCode: "INTERNAL_ERROR",
  httpStatus: 500,
});

function durationSinceMs(startedAtNs: bigint): number {
  return Number(process.hrtime.bigint() - startedAtNs) / 1_000_000;
}

/**
 * Build a Node `http.RequestListener`. Every request gets a fresh request
 * ID, is dispatched through `routeCustomerAuthRequest`, and always resolves
 * to a response — an unexpected thrown error becomes a generic `500` that
 * never carries the underlying error's message.
 */
export function createCustomerAuthRequestListener(
  deps: CustomerAuthRouteDependencies,
  hooks: CustomerAuthAppHooks = {},
): RequestListener {
  return function customerAuthRequestListener(
    req: IncomingMessage,
    res: ServerResponse,
  ): void {
    const requestId = generateRequestId();
    const startedAtNs = process.hrtime.bigint();
    hooks.onRequestStart?.();

    routeCustomerAuthRequest(req, res, deps, requestId)
      .catch((): CustomerAuthRouteOutcome => {
        if (!res.writableEnded) {
          sendJson(res, { ok: false, code: "INTERNAL_ERROR" }, { status: 500, requestId });
        }
        return UNHANDLED_ERROR_OUTCOME;
      })
      .then((outcome) => {
        hooks.onRequestComplete?.({
          requestId,
          operation: outcome.operation,
          safeOutcomeCode: outcome.safeOutcomeCode,
          httpStatus: outcome.httpStatus,
          durationMs: durationSinceMs(startedAtNs),
          rateLimitScope: outcome.rateLimitScope,
        });
      })
      .catch(() => {
        // The hooks themselves must never be able to crash the process —
        // there is nowhere safe left to report a failure at this point.
      });
  };
}
