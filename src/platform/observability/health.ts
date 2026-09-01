import type { Persistence } from "../../server/persistence/types";
import type { WorkerHealthReporter } from "./worker-health";
import { workerHealthCheckStatus } from "./worker-health";

export type ReadinessCheckStatus = "ok" | "failed" | "stopped";

export type ReadinessChecks = Readonly<Record<string, ReadinessCheckStatus>>;

export type ReadinessResult = Readonly<{
  ok: boolean;
  checks: ReadinessChecks;
}>;

export async function evaluateReadiness(options: {
  persistence: Persistence;
  workers?: readonly WorkerHealthReporter[];
}): Promise<ReadinessResult> {
  const checks: Record<string, ReadinessCheckStatus> = {};

  try {
    const availability = await options.persistence.checkAvailability();
    checks.database = availability.ok ? "ok" : "failed";
  } catch {
    checks.database = "failed";
  }

  for (const worker of options.workers ?? []) {
    const snapshot = worker.getHealthSnapshot();
    checks[`worker:${snapshot.name}`] = workerHealthCheckStatus(snapshot);
  }

  const ok = Object.values(checks).every((status) => status === "ok");
  return { ok, checks: Object.freeze(checks) };
}
