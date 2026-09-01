import { describe, expect, it, vi } from "vitest";

import { evaluateReadiness } from "./health";

describe("evaluateReadiness", () => {
  it("returns 503-shaped readiness when database check fails", async () => {
    const persistence = {
      checkAvailability: vi.fn(async () => { throw new Error("db down"); }),
    };

    const result = await evaluateReadiness({ persistence: persistence as never });
    expect(result.ok).toBe(false);
    expect(result.checks.database).toBe("failed");
  });
});
