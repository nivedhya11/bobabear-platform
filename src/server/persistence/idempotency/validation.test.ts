import { describe, expect, it } from "vitest";

import { IdempotencyValidationError } from "./errors";
import {
  assertAfterNow,
  assertCleanupLimit,
  assertJsonSafeResult,
  assertLeaseBeforeExpiry,
  assertNamespace,
  assertOptionalSafeResultCode,
  assertSafeResultCode,
  assertSha256Hex,
  assertUuid,
  assertValidDate,
} from "./validation";

const VALID_UUID = "11111111-1111-1111-1111-111111111111";
const VALID_HASH = "a".repeat(64);

describe("assertUuid", () => {
  it("accepts a well-formed UUID and rejects a malformed one", () => {
    expect(() => assertUuid(VALID_UUID, "recordId")).not.toThrow();
    expect(() => assertUuid("not-a-uuid", "recordId")).toThrow(IdempotencyValidationError);
  });
});

describe("assertNamespace", () => {
  it("accepts a short technical identifier", () => {
    expect(() => assertNamespace("orders.create")).not.toThrow();
  });

  it("rejects an empty namespace", () => {
    expect(() => assertNamespace("")).toThrow(IdempotencyValidationError);
  });

  it("rejects a namespace containing whitespace", () => {
    expect(() => assertNamespace("orders create")).toThrow(IdempotencyValidationError);
  });
});

describe("assertSha256Hex", () => {
  it("accepts a lowercase 64-character hex digest", () => {
    expect(() => assertSha256Hex(VALID_HASH, "keyHash")).not.toThrow();
  });

  it("rejects a short or uppercase value", () => {
    expect(() => assertSha256Hex("abc", "keyHash")).toThrow(IdempotencyValidationError);
    expect(() => assertSha256Hex("A".repeat(64), "keyHash")).toThrow(IdempotencyValidationError);
  });
});

describe("assertValidDate", () => {
  it("accepts a valid Date and rejects an invalid one", () => {
    expect(() => assertValidDate(new Date(), "now")).not.toThrow();
    expect(() => assertValidDate(new Date(NaN), "now")).toThrow(IdempotencyValidationError);
  });
});

describe("assertJsonSafeResult", () => {
  it("accepts null and JSON-safe values", () => {
    expect(() => assertJsonSafeResult(null, "result")).not.toThrow();
    expect(() => assertJsonSafeResult({ ok: true, items: [1, 2, "x"] }, "result")).not.toThrow();
    expect(() => assertJsonSafeResult("a plain string", "result")).not.toThrow();
  });

  it("rejects a Date value", () => {
    expect(() => assertJsonSafeResult(new Date(), "result")).toThrow(IdempotencyValidationError);
  });

  it("rejects undefined and functions nested in an object", () => {
    expect(() => assertJsonSafeResult({ a: undefined }, "result")).toThrow(IdempotencyValidationError);
    expect(() => assertJsonSafeResult({ a: () => 1 }, "result")).toThrow(IdempotencyValidationError);
  });
});

describe("assertSafeResultCode / assertOptionalSafeResultCode", () => {
  it("accepts a short technical code", () => {
    expect(() => assertSafeResultCode("order_not_found", "resultCode")).not.toThrow();
  });

  it("rejects an empty or multi-line code", () => {
    expect(() => assertSafeResultCode("", "resultCode")).toThrow(IdempotencyValidationError);
    expect(() => assertSafeResultCode("a\nb", "resultCode")).toThrow(IdempotencyValidationError);
  });

  it("allows null/undefined for the optional variant", () => {
    expect(() => assertOptionalSafeResultCode(null, "resultCode")).not.toThrow();
    expect(() => assertOptionalSafeResultCode(undefined, "resultCode")).not.toThrow();
  });
});

describe("assertLeaseBeforeExpiry", () => {
  it("accepts a lease strictly before the overall expiry", () => {
    expect(() =>
      assertLeaseBeforeExpiry(new Date("2024-01-01T00:05:00Z"), new Date("2024-01-02T00:00:00Z")),
    ).not.toThrow();
  });

  it("rejects a lease at or after the overall expiry", () => {
    const t = new Date("2024-01-01T00:00:00Z");
    expect(() => assertLeaseBeforeExpiry(t, t)).toThrow(IdempotencyValidationError);
    expect(() =>
      assertLeaseBeforeExpiry(new Date("2024-01-02T00:00:00Z"), new Date("2024-01-01T00:00:00Z")),
    ).toThrow(IdempotencyValidationError);
  });
});

describe("assertAfterNow", () => {
  it("accepts a value strictly after now and rejects otherwise", () => {
    const now = new Date("2024-01-01T00:00:00Z");
    expect(() => assertAfterNow(new Date("2024-01-01T00:05:00Z"), now, "expiresAt")).not.toThrow();
    expect(() => assertAfterNow(now, now, "expiresAt")).toThrow(IdempotencyValidationError);
  });
});

describe("assertCleanupLimit", () => {
  it("accepts an in-range integer and rejects out-of-range values", () => {
    expect(() => assertCleanupLimit(100, 500)).not.toThrow();
    expect(() => assertCleanupLimit(501, 500)).toThrow(IdempotencyValidationError);
    expect(() => assertCleanupLimit(0, 500)).toThrow(IdempotencyValidationError);
  });
});
