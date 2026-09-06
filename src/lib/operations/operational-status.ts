/**
 * Operational Status client (IMP-036 / IMP-036D).
 */
import { operationsRequest, type OperationsHttpResult } from "./http";

export type OperationsOperationalStatus = Readonly<{
  service: string;
  uptimeSeconds: number;
  metrics?: unknown;
  workers?: unknown;
  queues?: unknown;
}>;

type Envelope = Readonly<{
  ok: true;
  service?: string;
  uptimeSeconds?: number;
  metrics?: unknown;
  workers?: unknown;
  queues?: unknown;
}>;

export async function getOperationalStatus(): Promise<
  OperationsHttpResult<OperationsOperationalStatus>
> {
  const result = await operationsRequest<Envelope>("/api/operations/v1/operational-status");
  if (!result.ok) return result;
  return {
    ok: true,
    status: result.status,
    data: {
      service: typeof result.data.service === "string" ? result.data.service : "operations",
      uptimeSeconds:
        typeof result.data.uptimeSeconds === "number" ? result.data.uptimeSeconds : 0,
      metrics: result.data.metrics,
      workers: result.data.workers,
      queues: result.data.queues,
    },
  };
}
