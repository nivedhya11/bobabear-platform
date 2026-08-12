import { describe, expect, it } from "vitest";

import { loadConfig } from "./load-config";
import { ConfigurationError } from "./config-error";

const SENTINEL = "DO_NOT_LEAK_THIS_SECRET_74291";

describe("ConfigurationError — secret safety", () => {
  it("never includes a sentinel secret-like value in its message", () => {
    let caught: unknown;
    try {
      loadConfig({
        processKind: "web",
        source: {
          BOBA_BEAR_ENV: "local",
          BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000",
          BOBA_BEAR_SECRET_TOKEN: SENTINEL,
        },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ConfigurationError);
    const error = caught as ConfigurationError;

    expect(error.message).not.toContain(SENTINEL);
    expect(error.message).toContain("BOBA_BEAR_SECRET_TOKEN");

    for (const issue of error.issues) {
      expect(issue.key).not.toContain(SENTINEL);
      expect(issue.message).not.toContain(SENTINEL);
    }

    expect(JSON.stringify(error.toSafeJSON())).not.toContain(SENTINEL);
    expect(String(error.stack)).not.toContain(SENTINEL);
  });

  it("identifies the invalid variable name without leaking its value", () => {
    let caught: unknown;
    try {
      loadConfig({
        processKind: "web",
        source: {
          BOBA_BEAR_ENV: "production",
          NODE_ENV: "production",
          BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000",
        },
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ConfigurationError);
    const error = caught as ConfigurationError;
    expect(error.issues.map((i) => i.key)).toContain("BOBA_BEAR_PUBLIC_ORIGIN");
    expect(error.message).not.toContain("http://localhost:3000");
  });

  it("produces a JSON-serializable safe representation", () => {
    const error = new ConfigurationError([
      { key: "BOBA_BEAR_ENV", message: "Required." },
    ]);
    const json = error.toSafeJSON();
    expect(json).toEqual({
      name: "ConfigurationError",
      message: expect.stringContaining("BOBA_BEAR_ENV"),
      issues: [{ key: "BOBA_BEAR_ENV", message: "Required." }],
    });
  });
});
