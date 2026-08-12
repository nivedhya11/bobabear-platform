import { describe, expect, it, vi } from "vitest";

import { brandAsTransactionContext } from "../context-kind";
import type { PersistenceQueryContext, PersistenceTransactionContext } from "../types";
import { OutboxDuplicateEventError, OutboxValidationError } from "./errors";
import {
  claimOutboxBatch,
  deleteDeadLetterOutboxEvents,
  deletePublishedOutboxEvents,
  enqueueOutboxEvent,
  markOutboxDeadLetter,
  markOutboxPublished,
  releaseOutboxForRetry,
} from "./store";

const VALID_UUID = "11111111-1111-1111-1111-111111111111";
const OTHER_UUID = "22222222-2222-2222-2222-222222222222";

function fakeQueryContext(overrides: Partial<{ execute: ReturnType<typeof vi.fn> }> = {}): PersistenceQueryContext {
  return {
    role: "application",
    db: {
      execute: overrides.execute ?? vi.fn().mockResolvedValue({ rows: [] }),
    } as unknown as PersistenceQueryContext["db"],
  };
}

function fakeTransactionContext(
  role: "application" | "migration" = "application",
  insertValues: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue(undefined),
): PersistenceTransactionContext {
  const context = {
    role,
    db: {
      insert: vi.fn(() => ({ values: insertValues })),
    } as unknown as PersistenceTransactionContext["db"],
  };
  return brandAsTransactionContext(context);
}

function validEnqueueInput() {
  return {
    id: VALID_UUID,
    eventType: "order.created",
    eventVersion: 1,
    payload: { orderId: "abc" },
    occurredAt: new Date("2024-01-01T00:00:00Z"),
    availableAt: new Date("2024-01-01T00:00:00Z"),
    createdAt: new Date("2024-01-01T00:00:00Z"),
  };
}

describe("enqueueOutboxEvent", () => {
  it("requires an application-role context", async () => {
    const migrationContext = fakeTransactionContext("migration");
    await expect(enqueueOutboxEvent(migrationContext, validEnqueueInput())).rejects.toBeInstanceOf(
      OutboxValidationError,
    );
  });

  it("rejects a plain (unbranded) query context", async () => {
    const plainContext = {
      role: "application",
      db: { insert: vi.fn() },
    } as unknown as PersistenceTransactionContext;
    await expect(enqueueOutboxEvent(plainContext, validEnqueueInput())).rejects.toBeInstanceOf(
      OutboxValidationError,
    );
  });

  it("validates input before ever calling insert", async () => {
    const insertValues = vi.fn().mockResolvedValue(undefined);
    const context = fakeTransactionContext("application", insertValues);
    await expect(
      enqueueOutboxEvent(context, { ...validEnqueueInput(), eventVersion: 0 }),
    ).rejects.toBeInstanceOf(OutboxValidationError);
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("does not mutate the caller's payload/metadata objects", async () => {
    const context = fakeTransactionContext();
    const payload = { orderId: "abc" };
    const metadata = { source: "test" };
    await enqueueOutboxEvent(context, { ...validEnqueueInput(), payload, metadata });
    expect(payload).toEqual({ orderId: "abc" });
    expect(metadata).toEqual({ source: "test" });
  });

  it("defaults metadata to an empty object and returns a pending reference", async () => {
    const context = fakeTransactionContext();
    const result = await enqueueOutboxEvent(context, validEnqueueInput());
    expect(result).toEqual({
      id: VALID_UUID,
      eventType: "order.created",
      eventVersion: 1,
      status: "pending",
      createdAt: validEnqueueInput().createdAt,
    });
  });

  it("normalizes a unique-violation into OutboxDuplicateEventError", async () => {
    const insertValues = vi.fn().mockRejectedValue(Object.assign(new Error("duplicate key"), { code: "23505" }));
    const context = fakeTransactionContext("application", insertValues);
    const error = await enqueueOutboxEvent(context, validEnqueueInput()).catch((e) => e);
    expect(error).toBeInstanceOf(OutboxDuplicateEventError);
    expect((error as OutboxDuplicateEventError).eventId).toBe(VALID_UUID);
  });

  it("re-throws a non-unique-violation error unchanged", async () => {
    const insertValues = vi.fn().mockRejectedValue(new Error("connection reset"));
    const context = fakeTransactionContext("application", insertValues);
    await expect(enqueueOutboxEvent(context, validEnqueueInput())).rejects.toThrow("connection reset");
  });
});

describe("claimOutboxBatch", () => {
  it("requires an application-role context", async () => {
    const context = { role: "migration", db: { execute: vi.fn() } } as unknown as PersistenceQueryContext;
    await expect(
      claimOutboxBatch(context, { now: new Date(), leaseToken: VALID_UUID, leaseExpiresAt: new Date(Date.now() + 1000) }),
    ).rejects.toBeInstanceOf(OutboxValidationError);
  });

  it("rejects an invalid lease token before querying", async () => {
    const execute = vi.fn();
    const context = fakeQueryContext({ execute });
    await expect(
      claimOutboxBatch(context, { now: new Date(), leaseToken: "not-a-uuid", leaseExpiresAt: new Date(Date.now() + 1000) }),
    ).rejects.toBeInstanceOf(OutboxValidationError);
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects a lease that does not expire after now", async () => {
    const now = new Date();
    const context = fakeQueryContext();
    await expect(
      claimOutboxBatch(context, { now, leaseToken: VALID_UUID, leaseExpiresAt: now }),
    ).rejects.toBeInstanceOf(OutboxValidationError);
  });

  it("rejects a batch limit above the documented maximum", async () => {
    const context = fakeQueryContext();
    await expect(
      claimOutboxBatch(context, {
        now: new Date(),
        leaseToken: VALID_UUID,
        leaseExpiresAt: new Date(Date.now() + 1000),
        limit: 101,
      }),
    ).rejects.toBeInstanceOf(OutboxValidationError);
  });

  it("maps and sorts claimed rows deterministically by available_at, occurred_at, id", async () => {
    const rowB = {
      id: "b",
      event_type: "t",
      event_version: 1,
      aggregate_type: null,
      aggregate_id: null,
      payload: {},
      metadata: {},
      occurred_at: new Date("2024-01-01T00:00:01Z"),
      available_at: new Date("2024-01-01T00:00:00Z"),
      attempt_count: 1,
      lease_token: VALID_UUID,
      lease_expires_at: new Date("2024-01-01T00:05:00Z"),
    };
    const rowA = { ...rowB, id: "a", occurred_at: new Date("2024-01-01T00:00:00Z") };
    const execute = vi.fn().mockResolvedValue({ rows: [rowB, rowA] });
    const context = fakeQueryContext({ execute });

    const result = await claimOutboxBatch(context, {
      now: new Date(),
      leaseToken: VALID_UUID,
      leaseExpiresAt: new Date(Date.now() + 1000),
    });

    expect(result.events.map((e) => e.id)).toEqual(["a", "b"]);
    expect(result.leaseToken).toBe(VALID_UUID);
  });
});

describe("markOutboxPublished / releaseOutboxForRetry / markOutboxDeadLetter", () => {
  it("returns 'updated' when the UPDATE affects a row", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [{ id: VALID_UUID }] });
    const context = fakeQueryContext({ execute });
    const result = await markOutboxPublished(context, {
      eventId: VALID_UUID,
      leaseToken: OTHER_UUID,
      publishedAt: new Date(),
    });
    expect(result).toEqual({ outcome: "updated" });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("classifies 'not_found' when no row exists at all", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] }) // the UPDATE affects nothing
      .mockResolvedValueOnce({ rows: [] }); // the classification SELECT finds nothing
    const context = fakeQueryContext({ execute });
    const result = await releaseOutboxForRetry(context, {
      eventId: VALID_UUID,
      leaseToken: OTHER_UUID,
      nextAvailableAt: new Date(),
      errorCode: "timeout",
      updatedAt: new Date(),
    });
    expect(result).toEqual({ outcome: "not_found" });
  });

  it("classifies 'stale_lease' when the row is processing under a different lease", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ status: "processing", lease_token: "different-token" }] });
    const context = fakeQueryContext({ execute });
    const result = await markOutboxDeadLetter(context, {
      eventId: VALID_UUID,
      leaseToken: OTHER_UUID,
      errorCode: "fatal",
      updatedAt: new Date(),
    });
    expect(result).toEqual({ outcome: "stale_lease" });
  });

  it("classifies 'invalid_state' when the row is not processing", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ status: "published", lease_token: null }] });
    const context = fakeQueryContext({ execute });
    const result = await markOutboxPublished(context, {
      eventId: VALID_UUID,
      leaseToken: OTHER_UUID,
      publishedAt: new Date(),
    });
    expect(result).toEqual({ outcome: "invalid_state" });
  });

  it("validates the error code before querying for release/dead-letter", async () => {
    const execute = vi.fn();
    const context = fakeQueryContext({ execute });
    await expect(
      releaseOutboxForRetry(context, {
        eventId: VALID_UUID,
        leaseToken: OTHER_UUID,
        nextAvailableAt: new Date(),
        errorCode: "bad code with spaces",
        updatedAt: new Date(),
      }),
    ).rejects.toBeInstanceOf(OutboxValidationError);
    expect(execute).not.toHaveBeenCalled();
  });
});

describe("cleanup operations", () => {
  it("deletePublishedOutboxEvents rejects a limit above the maximum", async () => {
    const context = fakeQueryContext();
    await expect(
      deletePublishedOutboxEvents(context, { cutoff: new Date(), limit: 501 }),
    ).rejects.toBeInstanceOf(OutboxValidationError);
  });

  it("deletePublishedOutboxEvents returns the deleted ids", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [{ id: "a" }, { id: "b" }] });
    const context = fakeQueryContext({ execute });
    const result = await deletePublishedOutboxEvents(context, { cutoff: new Date(), limit: 10 });
    expect(result).toEqual({ deletedIds: ["a", "b"] });
  });

  it("deleteDeadLetterOutboxEvents returns the deleted ids", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [{ id: "c" }] });
    const context = fakeQueryContext({ execute });
    const result = await deleteDeadLetterOutboxEvents(context, { cutoff: new Date(), limit: 10 });
    expect(result).toEqual({ deletedIds: ["c"] });
  });
});
