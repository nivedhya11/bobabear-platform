/**
 * `http.RequestListener` factory for customer-commerce (IMP-024).
 */
import "server-only";

import process from "node:process";
import type { IncomingMessage, RequestListener, ServerResponse } from "node:http";

import { generateRequestId, sendJson } from "./response";
import {
  routeCustomerCommerceRequest,
  type CustomerCommerceRouteDependencies,
  type CustomerCommerceRouteOutcome,
} from "./router";

export type CustomerCommerceRequestEvent = Readonly<{
  requestId: string;
  operation: string;
  safeOutcomeCode: string;
  httpStatus: number;
  durationMs: number;
}>;

export type CustomerCommerceAppHooks = Readonly<{
  onRequestStart?: () => void;
  onRequestComplete?: (event: CustomerCommerceRequestEvent) => void;
}>;

const UNHANDLED_ERROR_OUTCOME: CustomerCommerceRouteOutcome = Object.freeze({
  operation: "unknown",
  safeOutcomeCode: "INTERNAL_ERROR",
  httpStatus: 500,
});

function durationSinceMs(startedAtNs: bigint): number {
  return Number(process.hrtime.bigint() - startedAtNs) / 1_000_000;
}

export function createCustomerCommerceRequestListener(
  deps: CustomerCommerceRouteDependencies,
  hooks: CustomerCommerceAppHooks = {},
): RequestListener {
  return function customerCommerceRequestListener(
    req: IncomingMessage,
    res: ServerResponse,
  ): void {
    const requestId = generateRequestId();
    const startedAtNs = process.hrtime.bigint();
    hooks.onRequestStart?.();

    routeCustomerCommerceRequest(req, res, deps, requestId)
      .catch((): CustomerCommerceRouteOutcome => {
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
        });
      })
      .catch(() => {
        // Hooks must never crash the process.
      });
  };
}
