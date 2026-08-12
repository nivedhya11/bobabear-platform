import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getRuntimeConfig, resetRuntimeConfigForTests } from "./runtime-config";

const ORIGINAL_ENV = { ...process.env };

function setEnv(overrides: Record<string, string | undefined>): void {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("BOBA_BEAR_") || key === "PORT" || key === "NODE_ENV") {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue;
    process.env[key] = value;
  }
}

describe("getRuntimeConfig", () => {
  beforeEach(() => {
    resetRuntimeConfigForTests();
    setEnv({
      BOBA_BEAR_ENV: "test",
      BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000",
      BOBA_BEAR_DATABASE_URL: "postgresql://boba_bear_app@127.0.0.1:5433/boba_bear_local",
    });
  });

  afterEach(() => {
    resetRuntimeConfigForTests();
    process.env = { ...ORIGINAL_ENV };
  });

  it("validates once and caches the result", () => {
    const first = getRuntimeConfig("web");
    // Mutating process.env after the first call must not change the
    // already-cached, already-validated configuration.
    process.env.BOBA_BEAR_LOG_LEVEL = "error";
    const second = getRuntimeConfig("web");
    expect(second).toBe(first);
    expect(second.logLevel).not.toBe("error");
  });

  it("rejects re-initialization as a different process kind", () => {
    getRuntimeConfig("web");
    expect(() => getRuntimeConfig("worker")).toThrow(/already initialized/i);
  });

  it("returns an immutable configuration", () => {
    const config = getRuntimeConfig("web");
    expect(Object.isFrozen(config)).toBe(true);
  });
});
