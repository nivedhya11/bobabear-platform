/**
 * Ops-owned operational status projection (IMP-036 / IMP-036G).
 *
 * Shared by GET /api/operations/v1/operational-status and Admin overview
 * composition. Admin must not reimplement queue/metrics loading.
 */
import "server-only";

import { getMetricsSnapshot } from "../../platform/observability";
import type { WorkerHealthReporter } from "../../platform/observability/worker-health";
import type { Persistence } from "../persistence";
import {
  loadOperationalQueueBacklog,
  type OperationalQueueBacklog,
} from "../persistence/operational-counts";

export type OperationalStatusProjection = Readonly<{
  service: string;
  uptimeSeconds: number;
  metrics: ReturnType<typeof getMetricsSnapshot>;
  workers: ReturnType<WorkerHealthReporter["getHealthSnapshot"]>[];
  queues: OperationalQueueBacklog;
}>;

export type LoadOperationalStatusProjectionInput = Readonly<{
  persistence: Persistence;
  serviceName?: string;
  startedAt?: Date;
  workers?: readonly WorkerHealthReporter[];
}>;

/** Load the same safe Ops status projection the operational-status route returns. */
export async function loadOperationalStatusProjection(
  input: LoadOperationalStatusProjectionInput,
): Promise<OperationalStatusProjection> {
  const [queues, metrics] = await Promise.all([
    loadOperationalQueueBacklog(input.persistence),
    Promise.resolve(getMetricsSnapshot()),
  ]);
  const startedAt = input.startedAt ?? new Date();
  const serviceName = input.serviceName ?? "operations";
  return {
    service: serviceName,
    uptimeSeconds: Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000)),
    metrics,
    workers: (input.workers ?? []).map((worker) => worker.getHealthSnapshot()),
    queues,
  };
}
