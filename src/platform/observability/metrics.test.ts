import { describe, expect, it } from "vitest";

import { createCounterRegistry, getMetricsSnapshot, incrementCounter } from "./metrics";

describe("metrics", () => {
  it("increments counters and returns snapshots", () => {
    const registry = createCounterRegistry();
    registry.increment("http.requests.total");
    registry.increment("http.requests.total", 2);
    incrementCounter("http.requests.total");

    expect(registry.getSnapshot()).toEqual({ "http.requests.total": 3 });
    expect(getMetricsSnapshot()["http.requests.total"]).toBeGreaterThanOrEqual(3);
  });
});
