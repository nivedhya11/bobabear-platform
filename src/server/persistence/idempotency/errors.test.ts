import { describe, expect, it } from "vitest";

import { IdempotencyStateError, IdempotencyValidationError } from "./errors";

describe("IdempotencyValidationError", () => {
  it("carries only a safe message and code", () => {
    const error = new IdempotencyValidationError({ message: "namespace must be non-empty." });
    expect(error.idempotencyErrorCode).toBe("validation");
    expect(error.toSafeJSON()).toEqual({
      name: "IdempotencyValidationError",
      message: "namespace must be non-empty.",
      idempotencyErrorCode: "validation",
    });
  });

  it("never leaks a raw key or fingerprint even if a caller tries to embed one", () => {
    const secretKey = "raw-idempotency-key-should-never-appear";
    const error = new IdempotencyValidationError({ message: "recordId must be a valid UUID." });
    expect(JSON.stringify(error.toSafeJSON())).not.toContain(secretKey);
  });
});

describe("IdempotencyStateError", () => {
  it("carries only a safe message", () => {
    const error = new IdempotencyStateError({ message: "unexpected internal invariant violation." });
    expect(error.idempotencyErrorCode).toBe("state");
    expect(error.name).toBe("IdempotencyStateError");
  });
});
