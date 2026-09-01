/**
 * Operations operational status API (IMP-036).
 *
 * Read-only projection for authorized workforce operators. No business-state
 * mutation and no secret-bearing fields in responses.
 */
import "server-only";

import type { IncomingMessage, ServerResponse } from "node:http";

import { getMetricsSnapshot } from "../../../platform/observability";
import type { WorkerHealthReporter } from "../../../platform/observability/worker-health";
import { actorHasOrderCapability } from "../../order/authorize";
import type { WorkforceAuthRuntime } from "../../auth/workforce";
import type { Persistence } from "../../persistence";
import { loadOperationalQueueBacklog } from "../../persistence/operational-counts";
import { resolveOperationsWorkforcePrincipal } from "./auth";
import { sendJson, sendMethodNotAllowed } from "./response";

export type OperationalStatusRouteDependencies = Readonly<{
  runtime: WorkforceAuthRuntime;
  persistence: Persistence;
  serviceName?: string;
  startedAt?: Date;
  workers?: readonly WorkerHealthReporter[];
}>;

export type OperationalStatusRouteOutcome = Readonly<{
  operation: string;
  safeOutcomeCode: string;
  httpStatus: number;
}>;

export async function handleOperationalStatusRequest(
  req: IncomingMessage,
  res: ServerResponse,
  deps: OperationalStatusRouteDependencies,
  requestId: string,
): Promise<OperationalStatusRouteOutcome> {
  const operation = "operational_status";
  const method = (req.method ?? "GET").toUpperCase();
  if (method !== "GET") {
    sendMethodNotAllowed(res, requestId, "GET");
    return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
  }

  const principal = await resolveOperationsWorkforcePrincipal(deps.runtime, req.headers);
  if (!principal) {
    sendJson(res, { ok: false, code: "WORKFORCE_AUTH_REQUIRED", requestId }, { status: 401, requestId });
    return { operation, safeOutcomeCode: "WORKFORCE_AUTH_REQUIRED", httpStatus: 401 };
  }

  const authorized = await deps.persistence.withContext((ctx) =>
    actorHasOrderCapability(ctx, principal, "order.read"),
  );
  if (!authorized) {
    sendJson(res, { ok: false, code: "ORDER_UNAUTHORIZED", requestId }, { status: 403, requestId });
    return { operation, safeOutcomeCode: "ORDER_UNAUTHORIZED", httpStatus: 403 };
  }

  const [queues, metrics] = await Promise.all([
    loadOperationalQueueBacklog(deps.persistence),
    Promise.resolve(getMetricsSnapshot()),
  ]);

  const startedAt = deps.startedAt ?? new Date();
  const serviceName = deps.serviceName ?? "operations";

  sendJson(
    res,
    {
      ok: true,
      service: serviceName,
      uptimeSeconds: Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000)),
      metrics,
      workers: (deps.workers ?? []).map((worker) => worker.getHealthSnapshot()),
      queues,
    },
    { status: 200, requestId },
  );
  return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
}
