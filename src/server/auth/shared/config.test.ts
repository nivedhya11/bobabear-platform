import { describe, expect, it } from "vitest";

import {
  loadAuthFoundationConfig,
  validateCustomerAuthConfig,
  validateWorkforceAuthConfig,
} from "./config";
import { AuthFoundationConfigurationError } from "./errors";
import type { AuthEnvSource } from "./types";

const VALID_CUSTOMER_SECRET = "customer-synthetic-secret-32-characters-minimum";
const VALID_WORKFORCE_SECRET = "workforce-synthetic-secret-32-characters-min";

function source(overrides: Record<string, string | undefined>): AuthEnvSource {
  return {
    CUSTOMER_AUTH_SECRET: VALID_CUSTOMER_SECRET,
    CUSTOMER_AUTH_BASE_URL: "http://localhost:3100",
    WORKFORCE_AUTH_SECRET: VALID_WORKFORCE_SECRET,
    WORKFORCE_AUTH_BASE_URL: "http://localhost:3100",
    ...overrides,
  };
}

function issuesOf(fn: () => unknown): { key: string; message: string }[] {
  try {
    fn();
    throw new Error("Expected an AuthFoundationConfigurationError.");
  } catch (error) {
    if (!(error instanceof AuthFoundationConfigurationError)) throw error;
    return error.issues.map((issue) => ({ ...issue }));
  }
}

describe("loadAuthFoundationConfig — valid configuration", () => {
  it("loads a valid customer config", () => {
    const config = loadAuthFoundationConfig(source({}), "local");
    expect(config.customer.realm).toBe("customer");
    expect(config.customer.basePath).toBe("/api/auth/customer");
    expect(config.customer.cookiePrefix).toBe("boba-customer");
  });

  it("loads a valid workforce config", () => {
    const config = loadAuthFoundationConfig(source({}), "local");
    expect(config.workforce.realm).toBe("workforce");
    expect(config.workforce.basePath).toBe("/api/auth/workforce");
    expect(config.workforce.cookiePrefix).toBe("boba-workforce");
  });

  it("allows same-origin customer/workforce base URLs", () => {
    const config = loadAuthFoundationConfig(source({}), "local");
    expect(config.customer.baseURL.origin).toBe(config.workforce.baseURL.origin);
    expect(config.customer.basePath).not.toBe(config.workforce.basePath);
  });
});

describe("loadAuthFoundationConfig — secret validation", () => {
  it("fails when the customer secret is missing", () => {
    const issues = issuesOf(() =>
      loadAuthFoundationConfig(source({ CUSTOMER_AUTH_SECRET: undefined }), "local"),
    );
    expect(issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "CUSTOMER_AUTH_SECRET" })]),
    );
  });

  it("fails when the workforce secret is missing", () => {
    const issues = issuesOf(() =>
      loadAuthFoundationConfig(source({ WORKFORCE_AUTH_SECRET: undefined }), "local"),
    );
    expect(issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "WORKFORCE_AUTH_SECRET" })]),
    );
  });

  it("fails when a secret is shorter than 32 characters", () => {
    const issues = issuesOf(() =>
      loadAuthFoundationConfig(source({ CUSTOMER_AUTH_SECRET: "short-secret" }), "local"),
    );
    expect(issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "CUSTOMER_AUTH_SECRET" })]),
    );
  });

  it("fails on a known placeholder secret", () => {
    const issues = issuesOf(() =>
      loadAuthFoundationConfig(source({ CUSTOMER_AUTH_SECRET: "change-me" }), "local"),
    );
    expect(issues.some((issue) => issue.key === "CUSTOMER_AUTH_SECRET")).toBe(true);
  });

  it("fails on Better Auth's documented development fallback secret", () => {
    const issues = issuesOf(() =>
      loadAuthFoundationConfig(
        source({ CUSTOMER_AUTH_SECRET: "better-auth-secret-123456789" }),
        "local",
      ),
    );
    expect(issues.some((issue) => issue.key === "CUSTOMER_AUTH_SECRET")).toBe(true);
  });

  it("fails when the two realm secrets are equal", () => {
    const issues = issuesOf(() =>
      loadAuthFoundationConfig(
        source({
          CUSTOMER_AUTH_SECRET: VALID_CUSTOMER_SECRET,
          WORKFORCE_AUTH_SECRET: VALID_CUSTOMER_SECRET,
        }),
        "local",
      ),
    );
    expect(issues.length).toBeGreaterThan(0);
  });

  it("fails on leading/trailing whitespace in a secret", () => {
    const issues = issuesOf(() =>
      loadAuthFoundationConfig(
        source({ CUSTOMER_AUTH_SECRET: ` ${VALID_CUSTOMER_SECRET}` }),
        "local",
      ),
    );
    expect(issues.some((issue) => issue.key === "CUSTOMER_AUTH_SECRET")).toBe(true);
  });

  it("never includes the raw secret value in the thrown error", () => {
    try {
      loadAuthFoundationConfig(source({ CUSTOMER_AUTH_SECRET: "change-me" }), "local");
      throw new Error("Expected to throw");
    } catch (error) {
      if (!(error instanceof AuthFoundationConfigurationError)) throw error;
      expect(error.message).not.toContain(VALID_WORKFORCE_SECRET);
      expect(JSON.stringify(error.toSafeJSON())).not.toContain(VALID_WORKFORCE_SECRET);
      expect(error.stack ?? "").not.toContain(VALID_WORKFORCE_SECRET);
    }
  });
});

describe("loadAuthFoundationConfig — base URL validation", () => {
  it("fails on a base URL with embedded credentials", () => {
    const issues = issuesOf(() =>
      loadAuthFoundationConfig(
        source({ CUSTOMER_AUTH_BASE_URL: "http://user:pass@localhost:3100" }),
        "local",
      ),
    );
    expect(issues.some((issue) => issue.key === "CUSTOMER_AUTH_BASE_URL")).toBe(true);
  });

  it("fails on a base URL with a path component", () => {
    const issues = issuesOf(() =>
      loadAuthFoundationConfig(
        source({ CUSTOMER_AUTH_BASE_URL: "http://localhost:3100/auth" }),
        "local",
      ),
    );
    expect(issues.some((issue) => issue.key === "CUSTOMER_AUTH_BASE_URL")).toBe(true);
  });

  it("fails on a base URL with a query string", () => {
    const issues = issuesOf(() =>
      loadAuthFoundationConfig(
        source({ CUSTOMER_AUTH_BASE_URL: "http://localhost:3100/?x=1" }),
        "local",
      ),
    );
    expect(issues.some((issue) => issue.key === "CUSTOMER_AUTH_BASE_URL")).toBe(true);
  });

  it("fails on an http base URL in production", () => {
    const issues = issuesOf(() =>
      loadAuthFoundationConfig(
        source({
          CUSTOMER_AUTH_BASE_URL: "http://customer.thebobabear.in",
          WORKFORCE_AUTH_BASE_URL: "https://workforce.thebobabear.in",
        }),
        "production",
      ),
    );
    expect(issues.some((issue) => issue.key === "CUSTOMER_AUTH_BASE_URL")).toBe(true);
  });

  it("fails on a localhost base URL in production", () => {
    const issues = issuesOf(() =>
      loadAuthFoundationConfig(
        source({
          CUSTOMER_AUTH_BASE_URL: "https://localhost",
          WORKFORCE_AUTH_BASE_URL: "https://workforce.thebobabear.in",
        }),
        "production",
      ),
    );
    expect(issues.some((issue) => issue.key === "CUSTOMER_AUTH_BASE_URL")).toBe(true);
  });

  it("accepts an https production base URL for both realms", () => {
    const config = loadAuthFoundationConfig(
      source({
        CUSTOMER_AUTH_BASE_URL: "https://customer.thebobabear.in",
        WORKFORCE_AUTH_BASE_URL: "https://workforce.thebobabear.in",
      }),
      "production",
    );
    expect(config.customer.baseURL.protocol).toBe("https:");
    expect(config.workforce.baseURL.protocol).toBe("https:");
  });
});

describe("loadAuthFoundationConfig — immutability and brands", () => {
  it("freezes the returned configuration objects", () => {
    const config = loadAuthFoundationConfig(source({}), "local");
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.customer)).toBe(true);
    expect(Object.isFrozen(config.workforce)).toBe(true);
  });

  it("tags the customer config with realm \"customer\" and workforce with \"workforce\"", () => {
    const config = loadAuthFoundationConfig(source({}), "local");
    expect(config.customer.realm).toBe("customer");
    expect(config.workforce.realm).toBe("workforce");
  });

  it("validateCustomerAuthConfig rejects issues independently of the workforce realm", () => {
    const result = validateCustomerAuthConfig(
      source({ CUSTOMER_AUTH_SECRET: undefined }),
      "local",
    );
    expect(result.ok).toBe(false);
  });

  it("validateWorkforceAuthConfig rejects issues independently of the customer realm", () => {
    const result = validateWorkforceAuthConfig(
      source({ WORKFORCE_AUTH_SECRET: undefined }),
      "local",
    );
    expect(result.ok).toBe(false);
  });
});
