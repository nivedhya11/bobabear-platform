/**
 * `http.RequestListener` factory wiring the router into a Node HTTP server
 * (IMP-010).
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
  routeWorkforceAuthRequest,
  type WorkforceAuthRouteDependencies,
  type WorkforceAuthRouteOutcome,
} from "./router";

export type WorkforceAuthRequestEvent = Readonly<{
  requestId: string;
  operation: string;
  safeOutcomeCode: string;
  httpStatus: number;
  durationMs: number;
  rateLimitScope?: string;
}>;

export type WorkforceAuthAppHooks = Readonly<{
  onRequestStart?: () => void;
  onRequestComplete?: (event: WorkforceAuthRequestEvent) => void;
}>;

const UNHANDLED_ERROR_OUTCOME: WorkforceAuthRouteOutcome = Object.freeze({
  operation: "unknown",
  safeOutcomeCode: "INTERNAL_ERROR",
  httpStatus: 500,
});

function durationSinceMs(startedAtNs: bigint): number {
  return Number(process.hrtime.bigint() - startedAtNs) / 1_000_000;
}

/**
 * Build a Node `http.RequestListener`. Every request gets a fresh request
 * ID, is dispatched through `routeWorkforceAuthRequest`, and always resolves
 * to a response — an unexpected thrown error becomes a generic `500` that
 * never carries the underlying error's message.
 */
export function createWorkforceAuthRequestListener(
  deps: WorkforceAuthRouteDependencies,
  hooks: WorkforceAuthAppHooks = {},
): RequestListener {
  return function workforceAuthRequestListener(
    req: IncomingMessage,
    res: ServerResponse,
  ): void {
    const requestId = generateRequestId();
    const startedAtNs = process.hrtime.bigint();
    hooks.onRequestStart?.();

    routeWorkforceAuthRequest(req, res, deps, requestId)
      .catch((): WorkforceAuthRouteOutcome => {
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
