import { describe, expect, it } from "vitest";

import { AuthFoundationConfigurationError } from "../auth/shared/errors";
import { loadOperationsConfig, OperationsConfigurationError } from "./config";

const SECRET = "operations-workforce-auth-secret-at-least-32";
const source = (overrides: Record<string, string | undefined> = {}) => ({
  WORKFORCE_AUTH_SECRET: SECRET,
  WORKFORCE_AUTH_BASE_URL: "https://workforce.example.test",
  ...overrides,
});

describe("loadOperationsConfig", () => {
  it("reuses workforce validation and derives only the configured trusted origin", () => {
    const config = loadOperationsConfig(source(), "test");
    expect(config.auth.realm).toBe("workforce");
    expect(config.trustedOrigin).toBe(config.auth.baseURL.origin);
    expect(config.serviceHost).toBe("0.0.0.0");
    expect(config.servicePort).toBe(8084);
  });

  it("accepts custom valid host and port without customer auth configuration", () => {
    const config = loadOperationsConfig(source({ OPERATIONS_SERVICE_HOST: "127.0.0.1", OPERATIONS_SERVICE_PORT: "9090" }), "test");
    expect(config.serviceHost).toBe("127.0.0.1");
    expect(config.servicePort).toBe(9090);
  });

  it("rejects invalid workforce configuration through the shared validator", () => {
    expect(() => loadOperationsConfig(source({ WORKFORCE_AUTH_SECRET: "short" }), "test")).toThrow(AuthFoundationConfigurationError);
  });

  it.each([
    { OPERATIONS_SERVICE_HOST: " host" },
    { OPERATIONS_SERVICE_HOST: "host " },
    { OPERATIONS_SERVICE_PORT: "abc" },
    { OPERATIONS_SERVICE_PORT: "0" },
    { OPERATIONS_SERVICE_PORT: "65536" },
  ])("rejects invalid Operations listener configuration", (overrides) => {
    expect(() => loadOperationsConfig(source(overrides), "test")).toThrow(OperationsConfigurationError);
  });

  it("never includes secret values in its errors", () => {
    const secret = "operations-secret-that-must-not-leak";
    try {
      loadOperationsConfig(source({ WORKFORCE_AUTH_SECRET: secret, OPERATIONS_SERVICE_PORT: "0" }), "test");
      expect.unreachable("expected a configuration error");
    } catch (error) {
      expect((error as Error).message).not.toContain(secret);
    }
  });
});
