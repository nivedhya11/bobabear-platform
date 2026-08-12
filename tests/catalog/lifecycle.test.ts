import { describe, expect, it } from "vitest";

import { CatalogInvalidStateError } from "../../src/server/catalog/errors";
import {
  activationTimestamps,
  assertCanTransition,
  retirementTimestamps,
} from "../../src/server/catalog/lifecycle";

describe("catalog lifecycle helpers", () => {
  it("allows draft→active→retired and rejects retired transitions", () => {
    expect(() => assertCanTransition("draft", "active")).not.toThrow();
    expect(() => assertCanTransition("active", "retired")).not.toThrow();
    expect(() => assertCanTransition("draft", "retired")).not.toThrow();
    expect(() => assertCanTransition("retired", "active")).toThrow(CatalogInvalidStateError);
    expect(() => assertCanTransition("active", "draft")).toThrow(CatalogInvalidStateError);
    expect(() => assertCanTransition("draft", "draft")).toThrow(CatalogInvalidStateError);
  });

  it("builds activation and retirement timestamps", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const active = activationTimestamps(now);
    expect(active).toEqual({
      lifecycleStatus: "active",
      activatedAt: now,
      retiredAt: null,
      updatedAt: now,
    });

    const fromActive = retirementTimestamps("active", now, new Date("2026-02-01T00:00:00.000Z"));
    expect(fromActive.lifecycleStatus).toBe("retired");
    expect(fromActive.activatedAt).toEqual(now);
    expect(fromActive.retiredAt).toEqual(new Date("2026-02-01T00:00:00.000Z"));

    const fromDraft = retirementTimestamps("draft", null, now);
    expect(fromDraft.activatedAt).toBeNull();
    expect(fromDraft.retiredAt).toEqual(now);
  });

  it("exposes stable invalid_state error codes", () => {
    expect(new CatalogInvalidStateError({ message: "x" }).catalogErrorCode).toBe("invalid_state");
  });
});
