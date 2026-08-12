import { describe, expect, it } from "vitest";

import {
  isDriverShapedError,
  PersistenceClosedError,
  PersistenceConfigurationError,
  toSafePersistenceError,
} from "./errors";

const SECRET = "sup3r-secret-password";

describe("PersistenceConfigurationError", () => {
  it("never carries a secret passed in its message context", () => {
    const error = new PersistenceConfigurationError({
      role: "application",
      message: "getApplicationPersistence() requires a web or worker configuration.",
    });
    expect(error.message).not.toContain(SECRET);
    expect(JSON.stringify(error.toSafeJSON())).not.toContain(SECRET);
  });
});

describe("PersistenceClosedError", () => {
  it("is role-specific and secret-safe", () => {
    const error = new PersistenceClosedError("migration");
    expect(error.role).toBe("migration");
    expect(JSON.stringify(error.toSafeJSON())).not.toContain(SECRET);
  });
});

describe("toSafePersistenceError", () => {
  it("never copies a raw driver message containing connection detail", () => {
    const raw = new Error(
      `connection to server at "db.internal" (postgresql://user:${SECRET}@db.internal:5432/app) failed`,
    );
    const safe = toSafePersistenceError("application", raw, "A database operation failed.");

    expect(safe.message).not.toContain(SECRET);
    expect(safe.stack ?? "").not.toContain(SECRET);
    expect(JSON.stringify(safe.toSafeJSON())).not.toContain(SECRET);
    expect(JSON.stringify(safe)).not.toContain(SECRET);
  });

  it("preserves a safe SQLSTATE code and classifies connection-exception codes as transient", () => {
    const raw = Object.assign(new Error("boom"), { code: "08006" });
    const safe = toSafePersistenceError("application", raw, "fallback");
    expect(safe.code).toBe("08006");
    expect(safe.transient).toBe(true);
  });

  it("classifies a non-connection SQLSTATE as non-transient", () => {
    const raw = Object.assign(new Error("boom"), { code: "23505" });
    const safe = toSafePersistenceError("application", raw, "fallback");
    expect(safe.transient).toBe(false);
  });
});

describe("isDriverShapedError", () => {
  it("recognizes a SQLSTATE-shaped code", () => {
    expect(isDriverShapedError(Object.assign(new Error("x"), { code: "23505" }))).toBe(true);
  });

  it("rejects a plain domain error with no code", () => {
    expect(isDriverShapedError(new Error("business rule violated"))).toBe(false);
  });

  it("rejects non-object values", () => {
    expect(isDriverShapedError("just a string")).toBe(false);
    expect(isDriverShapedError(null)).toBe(false);
  });
});
