import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetRuntimeConfigForTests } from "../config/runtime-config";
import { bootstrapApplication, getStartupStatus, resetStartupForTests } from "./bootstrap";

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

describe("bootstrapApplication", () => {
  beforeEach(() => {
    resetStartupForTests();
    resetRuntimeConfigForTests();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    resetStartupForTests();
    resetRuntimeConfigForTests();
    process.env = { ...ORIGINAL_ENV };
  });

  it("starts in the not_started phase", () => {
    expect(getStartupStatus().phase).toBe("not_started");
  });

  it("reaches the ready phase on valid configuration", async () => {
    setEnv({
      BOBA_BEAR_ENV: "test",
      BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000",
      BOBA_BEAR_DATABASE_URL: "postgresql://boba_bear_app@127.0.0.1:5433/boba_bear_local",
    });
    const config = await bootstrapApplication("web");
    expect(config.environment).toBe("test");
    expect(getStartupStatus().phase).toBe("ready");
    expect(getStartupStatus().summary?.processKind).toBe("web");
  });

  it("is idempotent across repeated sequential calls", async () => {
    setEnv({
      BOBA_BEAR_ENV: "test",
      BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000",
      BOBA_BEAR_DATABASE_URL: "postgresql://boba_bear_app@127.0.0.1:5433/boba_bear_local",
    });
    const first = await bootstrapApplication("web");
    const second = await bootstrapApplication("web");
    expect(second).toBe(first);
  });

  it("shares one initialization across concurrent callers", async () => {
    setEnv({
      BOBA_BEAR_ENV: "test",
      BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000",
      BOBA_BEAR_DATABASE_URL: "postgresql://boba_bear_app@127.0.0.1:5433/boba_bear_local",
    });
    const [a, b, c] = await Promise.all([
      bootstrapApplication("web"),
      bootstrapApplication("web"),
      bootstrapApplication("web"),
    ]);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("rejects and records a safe failed status on invalid configuration", async () => {
    setEnv({ BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000" }); // missing BOBA_BEAR_ENV

    await expect(bootstrapApplication("web")).rejects.toThrow(
      /Invalid application configuration/,
    );

    const status = getStartupStatus();
    expect(status.phase).toBe("failed");
    expect(status.failure?.code).toBe("invalid_configuration");
    expect(status.summary).toBeNull();
  });

  it("does not swallow the failure on repeated calls", async () => {
    setEnv({ BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000" });
    await expect(bootstrapApplication("web")).rejects.toThrow();
    await expect(bootstrapApplication("web")).rejects.toThrow();
  });

  it("throws when re-bootstrapped as a different process kind", async () => {
    setEnv({
      BOBA_BEAR_ENV: "test",
      BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000",
      BOBA_BEAR_DATABASE_URL: "postgresql://boba_bear_app@127.0.0.1:5433/boba_bear_local",
    });
    await bootstrapApplication("web");
    await expect(bootstrapApplication("worker")).rejects.toThrow(
      /already bootstrapped/i,
    );
  });

  it("keeps startup state free of raw environment values", async () => {
    const SENTINEL = "DO_NOT_LEAK_THIS_SECRET_74291";
    setEnv({
      BOBA_BEAR_ENV: "test",
      BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000",
      BOBA_BEAR_SECRET_TOKEN: SENTINEL,
    });
    await expect(bootstrapApplication("web")).rejects.toThrow();
    const status = getStartupStatus();
    expect(JSON.stringify(status)).not.toContain(SENTINEL);
  });
});
