export type MetricSnapshot = Readonly<Record<string, number>>;

type CounterRegistry = {
  increment(name: string, delta?: number): void;
  getSnapshot(): MetricSnapshot;
};

const counters = new Map<string, number>();

function normalizeDelta(delta: number | undefined): number {
  if (delta === undefined) return 1;
  if (!Number.isFinite(delta) || delta <= 0) return 0;
  return delta;
}

export function incrementCounter(name: string, delta = 1): void {
  const amount = normalizeDelta(delta);
  if (amount === 0) return;
  counters.set(name, (counters.get(name) ?? 0) + amount);
}

export function getMetricsSnapshot(): MetricSnapshot {
  const snapshot: Record<string, number> = {};
  for (const [name, value] of counters.entries()) {
    snapshot[name] = value;
  }
  return Object.freeze(snapshot);
}

export function createCounterRegistry(): CounterRegistry {
  const local = new Map<string, number>();
  return {
    increment(name: string, delta = 1) {
      const amount = normalizeDelta(delta);
      if (amount === 0) return;
      local.set(name, (local.get(name) ?? 0) + amount);
      incrementCounter(name, amount);
    },
    getSnapshot() {
      const snapshot: Record<string, number> = {};
      for (const [name, value] of local.entries()) {
        snapshot[name] = value;
      }
      return Object.freeze(snapshot);
    },
  };
}
