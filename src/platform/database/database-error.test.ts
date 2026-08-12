import { describe, expect, it } from "vitest";

import { DatabaseError, toSafeDatabaseError } from "./database-error";

const SENTINEL = "DO_NOT_LEAK_DATABASE_SECRET_94817";

describe("DatabaseError", () => {
  it("never includes the sentinel in its message", () => {
    const error = new DatabaseError({ message: "Connection failed." });
    expect(error.message).not.toContain(SENTINEL);
  });

  it("never includes the sentinel in its serialized form", () => {
    const error = new DatabaseError({ message: "Connection failed.", code: "ECONNREFUSED" });
    expect(JSON.stringify(error.toSafeJSON())).not.toContain(SENTINEL);
  });
});

describe("toSafeDatabaseError", () => {
  it("never copies a raw driver error's message containing the sentinel", () => {
    const rawError = new Error(`connection to server failed: ${SENTINEL}`);
    const safeError = toSafeDatabaseError(rawError, "Database connectivity check failed.");
    expect(safeError.message).not.toContain(SENTINEL);
    expect(safeError.message).toBe("Database connectivity check failed.");
  });

  it("never includes the sentinel in the safe error's stack", () => {
    const rawError = new Error(`postgresql://user:${SENTINEL}@host/db`);
    const safeError = toSafeDatabaseError(rawError, "Database connectivity check failed.");
    expect(safeError.stack ?? "").not.toContain(SENTINEL);
  });

  it("preserves a safe machine code from a pg-error-like object", () => {
    const pgLikeError = { code: "28P01", message: `password authentication failed: ${SENTINEL}` };
    const safeError = toSafeDatabaseError(pgLikeError, "Authentication failed.");
    expect(safeError.code).toBe("28P01");
    expect(safeError.message).not.toContain(SENTINEL);
    expect(JSON.stringify(safeError.toSafeJSON())).not.toContain(SENTINEL);
  });

  it("returns a DatabaseError unchanged", () => {
    const original = new DatabaseError({ message: "already safe" });
    expect(toSafeDatabaseError(original, "fallback")).toBe(original);
  });

  it("handles a non-object thrown value safely", () => {
    const safeError = toSafeDatabaseError(SENTINEL, "Unexpected failure.");
    expect(safeError.message).toBe("Unexpected failure.");
    expect(JSON.stringify(safeError.toSafeJSON())).not.toContain(SENTINEL);
  });
});
