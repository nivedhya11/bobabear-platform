export type WorkerHealthSnapshot = Readonly<{
  name: string;
  running: boolean;
  stopped: boolean;
  lastTickAt?: string;
}>;

export interface WorkerHealthReporter {
  getHealthSnapshot(): WorkerHealthSnapshot;
}

export function workerHealthCheckStatus(
  snapshot: WorkerHealthSnapshot,
): "ok" | "stopped" | "failed" {
  if (snapshot.stopped) return "stopped";
  return "ok";
}
