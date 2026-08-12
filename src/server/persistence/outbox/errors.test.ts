import { describe, expect, it } from "vitest";

import { OutboxDuplicateEventError, OutboxStateError, OutboxValidationError } from "./errors";

describe("OutboxValidationError", () => {
  it("carries only a safe message and code", () => {
    const error = new OutboxValidationError({ message: "eventType must be non-empty." });
    expect(error.outboxErrorCode).toBe("validation");
    expect(error.toSafeJSON()).toEqual({
      name: "OutboxValidationError",
      message: "eventType must be non-empty.",
      outboxErrorCode: "validation",
    });
  });
});

describe("OutboxDuplicateEventError", () => {
  it("exposes only the event id, never a payload or metadata field", () => {
    const error = new OutboxDuplicateEventError("11111111-1111-1111-1111-111111111111");
    expect(error.eventId).toBe("11111111-1111-1111-1111-111111111111");
    expect(error.outboxErrorCode).toBe("duplicate_event");
    const safe = error.toSafeJSON();
    expect(safe).toEqual({
      name: "OutboxDuplicateEventError",
      message: "An outbox event with this id already exists.",
      outboxErrorCode: "duplicate_event",
      eventId: "11111111-1111-1111-1111-111111111111",
    });
    expect(JSON.stringify(safe)).not.toContain("payload");
  });
});

describe("OutboxStateError", () => {
  it("carries only a safe message", () => {
    const error = new OutboxStateError({ message: "unexpected internal invariant violation." });
    expect(error.outboxErrorCode).toBe("state");
    expect(error.name).toBe("OutboxStateError");
  });
});
