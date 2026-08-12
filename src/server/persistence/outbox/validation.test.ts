import { describe, expect, it } from "vitest";

import { OutboxValidationError } from "./errors";
import { OUTBOX_MAX_BATCH_LIMIT } from "./types";
import {
  assertCleanupLimit,
  assertJsonObject,
  assertLeaseExpiresAfterNow,
  assertNonEmptyBoundedText,
  assertOptionalNonEmptyBoundedText,
  assertPositiveInteger,
  assertSafeErrorCode,
  assertUuid,
  assertValidDate,
  freezeJsonObject,
  normalizeBatchLimit,
} from "./validation";

const VALID_UUID = "11111111-1111-1111-1111-111111111111";

describe("assertUuid", () => {
  it("accepts a well-formed UUID", () => {
    expect(() => assertUuid(VALID_UUID, "id")).not.toThrow();
  });

  it("rejects a malformed value", () => {
    expect(() => assertUuid("not-a-uuid", "id")).toThrow(OutboxValidationError);
  });
});

describe("assertNonEmptyBoundedText", () => {
  it("accepts a normal single-line string", () => {
    expect(() => assertNonEmptyBoundedText("order.created", "eventType")).not.toThrow();
  });

  it("rejects an empty string", () => {
    expect(() => assertNonEmptyBoundedText("", "eventType")).toThrow(OutboxValidationError);
  });

  it("rejects a string containing a newline", () => {
    expect(() => assertNonEmptyBoundedText("a\nb", "eventType")).toThrow(OutboxValidationError);
  });

  it("rejects a string longer than 200 characters", () => {
    expect(() => assertNonEmptyBoundedText("a".repeat(201), "eventType")).toThrow(OutboxValidationError);
  });
});

describe("assertOptionalNonEmptyBoundedText", () => {
  it("allows null and undefined", () => {
    expect(() => assertOptionalNonEmptyBoundedText(null, "aggregateType")).not.toThrow();
    expect(() => assertOptionalNonEmptyBoundedText(undefined, "aggregateType")).not.toThrow();
  });

  it("still validates a supplied value", () => {
    expect(() => assertOptionalNonEmptyBoundedText("", "aggregateType")).toThrow(OutboxValidationError);
  });
});

describe("assertPositiveInteger", () => {
  it("accepts a positive integer", () => {
    expect(() => assertPositiveInteger(1, "eventVersion")).not.toThrow();
  });

  it("rejects zero, negative, and fractional values", () => {
    expect(() => assertPositiveInteger(0, "eventVersion")).toThrow(OutboxValidationError);
    expect(() => assertPositiveInteger(-1, "eventVersion")).toThrow(OutboxValidationError);
    expect(() => assertPositiveInteger(1.5, "eventVersion")).toThrow(OutboxValidationError);
  });
});

describe("assertValidDate", () => {
  it("accepts a valid Date", () => {
    expect(() => assertValidDate(new Date(), "occurredAt")).not.toThrow();
  });

  it("rejects an invalid Date and a non-Date value", () => {
    expect(() => assertValidDate(new Date(NaN), "occurredAt")).toThrow(OutboxValidationError);
    expect(() => assertValidDate("2024-01-01" as unknown as Date, "occurredAt")).toThrow(OutboxValidationError);
  });
});

describe("assertJsonObject", () => {
  it("accepts a JSON-safe object", () => {
    expect(() => assertJsonObject({ a: 1, b: ["x", null, true], c: { d: 2 } }, "payload")).not.toThrow();
  });

  it("rejects arrays at the top level", () => {
    expect(() => assertJsonObject([1, 2, 3], "payload")).toThrow(OutboxValidationError);
  });

  it("rejects undefined values", () => {
    expect(() => assertJsonObject({ a: undefined }, "payload")).toThrow(OutboxValidationError);
  });

  it("rejects a Date value", () => {
    expect(() => assertJsonObject({ a: new Date() }, "payload")).toThrow(OutboxValidationError);
  });

  it("rejects NaN/Infinity", () => {
    expect(() => assertJsonObject({ a: Number.NaN }, "payload")).toThrow(OutboxValidationError);
    expect(() => assertJsonObject({ a: Number.POSITIVE_INFINITY }, "payload")).toThrow(OutboxValidationError);
  });

  it("rejects a function value", () => {
    expect(() => assertJsonObject({ a: () => 1 }, "payload")).toThrow(OutboxValidationError);
  });
});

describe("assertSafeErrorCode", () => {
  it("accepts a short technical code", () => {
    expect(() => assertSafeErrorCode("delivery_timeout", "errorCode")).not.toThrow();
  });

  it("rejects an empty code", () => {
    expect(() => assertSafeErrorCode("", "errorCode")).toThrow(OutboxValidationError);
  });

  it("rejects a code containing a newline", () => {
    expect(() => assertSafeErrorCode("bad\ncode", "errorCode")).toThrow(OutboxValidationError);
  });

  it("rejects a code containing spaces or unsafe characters", () => {
    expect(() => assertSafeErrorCode("bad code!", "errorCode")).toThrow(OutboxValidationError);
  });
});

describe("normalizeBatchLimit", () => {
  it("returns the default when omitted", () => {
    expect(normalizeBatchLimit(undefined, 25)).toBe(25);
  });

  it("accepts an in-range integer", () => {
    expect(normalizeBatchLimit(10, 25)).toBe(10);
  });

  it("rejects zero, negative, fractional, and NaN", () => {
    expect(() => normalizeBatchLimit(0, 25)).toThrow(OutboxValidationError);
    expect(() => normalizeBatchLimit(-5, 25)).toThrow(OutboxValidationError);
    expect(() => normalizeBatchLimit(1.5, 25)).toThrow(OutboxValidationError);
    expect(() => normalizeBatchLimit(Number.NaN, 25)).toThrow(OutboxValidationError);
  });

  it("rejects a limit above the documented maximum", () => {
    expect(() => normalizeBatchLimit(OUTBOX_MAX_BATCH_LIMIT + 1, 25)).toThrow(OutboxValidationError);
  });

  it("accepts exactly the documented maximum", () => {
    expect(normalizeBatchLimit(OUTBOX_MAX_BATCH_LIMIT, 25)).toBe(OUTBOX_MAX_BATCH_LIMIT);
  });
});

describe("assertCleanupLimit", () => {
  it("accepts an in-range integer", () => {
    expect(() => assertCleanupLimit(100, 500)).not.toThrow();
  });

  it("rejects an unbounded (excessive) limit", () => {
    expect(() => assertCleanupLimit(501, 500)).toThrow(OutboxValidationError);
  });

  it("rejects zero and negative limits", () => {
    expect(() => assertCleanupLimit(0, 500)).toThrow(OutboxValidationError);
    expect(() => assertCleanupLimit(-1, 500)).toThrow(OutboxValidationError);
  });
});

describe("assertLeaseExpiresAfterNow", () => {
  it("accepts a lease expiry strictly after now", () => {
    const now = new Date("2024-01-01T00:00:00Z");
    const leaseExpiresAt = new Date("2024-01-01T00:05:00Z");
    expect(() => assertLeaseExpiresAfterNow(leaseExpiresAt, now, "leaseExpiresAt")).not.toThrow();
  });

  it("rejects a lease expiry equal to or before now", () => {
    const now = new Date("2024-01-01T00:00:00Z");
    expect(() => assertLeaseExpiresAfterNow(now, now, "leaseExpiresAt")).toThrow(OutboxValidationError);
    expect(() =>
      assertLeaseExpiresAfterNow(new Date("2023-12-31T23:59:00Z"), now, "leaseExpiresAt"),
    ).toThrow(OutboxValidationError);
  });
});

describe("freezeJsonObject", () => {
  it("returns a frozen shallow copy that does not alias the input", () => {
    const input = { a: 1 };
    const frozen = freezeJsonObject(input);
    expect(frozen).toEqual(input);
    expect(frozen).not.toBe(input);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(() => {
      (frozen as { a: number }).a = 2;
    }).toThrow();
    expect(input.a).toBe(1);
  });
});
