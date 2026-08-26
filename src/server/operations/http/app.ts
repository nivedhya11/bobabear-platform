/** Operations Node request-listener boundary (IMP-029). */
import "server-only";

import process from "node:process";
import type { IncomingMessage, RequestListener, ServerResponse } from "node:http";

import { generateRequestId, sendJson } from "./response";
import {
  routeOperationsRequest,
  type OperationsRouteDependencies,
  type OperationsRouteOutcome,
} from "./router";

export type OperationsRequestEvent = Readonly<{
  requestId: string;
  operation: string;
  safeOutcomeCode: string;
  httpStatus: number;
  durationMs: number;
}>;

export type OperationsAppHooks = Readonly<{
  onRequestStart?: () => void;
  onRequestComplete?: (event: OperationsRequestEvent) => void;
}>;

const UNHANDLED_ERROR_OUTCOME: OperationsRouteOutcome = Object.freeze({
  operation: "unknown",
  safeOutcomeCode: "INTERNAL_ERROR",
  httpStatus: 500,
});

function durationSinceMs(startedAtNs: bigint): number {
  return Number(process.hrtime.bigint() - startedAtNs) / 1_000_000;
}

export function createOperationsRequestListener(
  deps: OperationsRouteDependencies,
  hooks: OperationsAppHooks = {},
): RequestListener {
  return function operationsRequestListener(req: IncomingMessage, res: ServerResponse): void {
    const requestId = generateRequestId();
    const startedAtNs = process.hrtime.bigint();
    hooks.onRequestStart?.();

    routeOperationsRequest(req, res, deps, requestId)
      .catch((): OperationsRouteOutcome => {
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
        // Completion hooks must not destabilize the service process.
      });
  };
}
