import { inspect } from "node:util";

import { describe, expect, it, vi } from "vitest";

import type { PersistenceQueryContext } from "../types";
import { IdempotencyValidationError } from "./errors";
import {
  acquireIdempotencyRecord,
  completeIdempotencyRecord,
  deleteExpiredIdempotencyRecords,
  failIdempotencyRecord,
} from "./store";

const VALID_UUID = "11111111-1111-1111-1111-111111111111";
const OTHER_UUID = "22222222-2222-2222-2222-222222222222";

function fakeQueryContext(execute: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue({ rows: [] })): PersistenceQueryContext {
  return { role: "application", db: { execute } as unknown as PersistenceQueryContext["db"] };
}

function validAcquireInput() {
  const now = new Date("2024-01-01T00:00:00Z");
  return {
    recordId: VALID_UUID,
    namespace: "orders.create",
    rawKey: "raw-key-should-never-be-stored",
    canonicalRequestFingerprint: '{"a":1}',
    ownerToken: OTHER_UUID,
    now,
    leaseExpiresAt: new Date("2024-01-01T00:05:00Z"),
    expiresAt: new Date("2024-01-02T00:00:00Z"),
  };
}

describe("acquireIdempotencyRecord", () => {
  it("requires an application-role context", async () => {
    const context = { role: "migration", db: { execute: vi.fn() } } as unknown as PersistenceQueryContext;
    await expect(acquireIdempotencyRecord(context, validAcquireInput())).rejects.toBeInstanceOf(
      IdempotencyValidationError,
    );
  });

  it("validates lease/expiry ordering before querying", async () => {
    const execute = vi.fn();
    const context = fakeQueryContext(execute);
    const input = validAcquireInput();
    await expect(
      acquireIdempotencyRecord(context, { ...input, leaseExpiresAt: input.expiresAt }),
    ).rejects.toBeInstanceOf(IdempotencyValidationError);
    expect(execute).not.toHaveBeenCalled();
  });

  it("never sends the raw key or fingerprint as SQL text — only their hashes", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [{ id: VALID_UUID }] });
    const context = fakeQueryContext(execute);
    await acquireIdempotencyRecord(context, validAcquireInput());
    const sqlChunk = execute.mock.calls[0]?.[0];
    const serialized = inspect(sqlChunk, { depth: 6 });
    expect(serialized).not.toContain("raw-key-should-never-be-stored");
  });

  it("returns 'acquired' with reclaimed=false on a fresh insert", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [{ id: VALID_UUID }] });
    const context = fakeQueryContext(execute);
    const result = await acquireIdempotencyRecord(context, validAcquireInput());
    expect(result).toEqual({
      outcome: "acquired",
      recordId: VALID_UUID,
      ownerToken: OTHER_UUID,
      leaseExpiresAt: validAcquireInput().leaseExpiresAt,
      reclaimed: false,
    });
  });

  it("returns 'acquired' with reclaimed=true when the returned id differs from the input recordId", async () => {
    const existingRecordId = "33333333-3333-3333-3333-333333333333";
    const execute = vi.fn().mockResolvedValue({ rows: [{ id: existingRecordId }] });
    const context = fakeQueryContext(execute);
    const result = await acquireIdempotencyRecord(context, validAcquireInput());
    expect(result).toMatchObject({ outcome: "acquired", recordId: existingRecordId, reclaimed: true });
  });

  it("classifies 'in_progress' when the upsert is a no-op and the existing record is still in progress", async () => {
    const input = validAcquireInput();
    const { hashRequestFingerprint } = await import("./hashing");
    const requestHash = hashRequestFingerprint(input.canonicalRequestFingerprint);
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: VALID_UUID,
            status: "in_progress",
            request_hash: requestHash,
            owner_token: OTHER_UUID,
            lease_expires_at: new Date("2024-01-01T00:05:00Z"),
            result: null,
            result_code: null,
            completed_at: null,
            expires_at: new Date("2024-01-02T00:00:00Z"),
          },
        ],
      });
    const context = fakeQueryContext(execute);
    const result = await acquireIdempotencyRecord(context, input);
    expect(result).toEqual({
      outcome: "in_progress",
      recordId: VALID_UUID,
      leaseExpiresAt: new Date("2024-01-01T00:05:00Z"),
    });
  });

  it("classifies 'conflict' when the existing request hash differs", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: VALID_UUID,
            status: "in_progress",
            request_hash: "a".repeat(64),
            owner_token: OTHER_UUID,
            lease_expires_at: new Date("2024-01-01T00:05:00Z"),
            result: null,
            result_code: null,
            completed_at: null,
            expires_at: new Date("2024-01-02T00:00:00Z"),
          },
        ],
      });
    const context = fakeQueryContext(execute);
    const result = await acquireIdempotencyRecord(context, validAcquireInput());
    expect(result).toEqual({ outcome: "conflict", recordId: VALID_UUID });
  });

  it("classifies 'completed' when the matching-hash existing record is terminal", async () => {
    const input = validAcquireInput();
    const { hashRequestFingerprint } = await import("./hashing");
    const requestHash = hashRequestFingerprint(input.canonicalRequestFingerprint);
    const completedAt = new Date("2024-01-01T00:10:00Z");
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: VALID_UUID,
            status: "completed",
            request_hash: requestHash,
            owner_token: null,
            lease_expires_at: null,
            result: { ok: true },
            result_code: "success",
            completed_at: completedAt,
            expires_at: new Date("2024-01-02T00:00:00Z"),
          },
        ],
      });
    const context = fakeQueryContext(execute);
    const result = await acquireIdempotencyRecord(context, input);
    expect(result).toEqual({
      outcome: "completed",
      recordId: VALID_UUID,
      terminalStatus: "completed",
      result: { ok: true },
      resultCode: "success",
      completedAt,
      expiresAt: new Date("2024-01-02T00:00:00Z"),
    });
  });
});

describe("completeIdempotencyRecord", () => {
  it("returns 'updated' when the UPDATE affects a row", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [{ id: VALID_UUID }] });
    const context = fakeQueryContext(execute);
    const result = await completeIdempotencyRecord(context, {
      recordId: VALID_UUID,
      ownerToken: OTHER_UUID,
      result: { ok: true },
      resultCode: "success",
      completedAt: new Date(),
    });
    expect(result).toEqual({ outcome: "updated" });
  });

  it("classifies 'stale_owner' when the owner token no longer matches", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ status: "in_progress", owner_token: "different-owner" }] });
    const context = fakeQueryContext(execute);
    const result = await completeIdempotencyRecord(context, {
      recordId: VALID_UUID,
      ownerToken: OTHER_UUID,
      result: null,
      resultCode: null,
      completedAt: new Date(),
    });
    expect(result).toEqual({ outcome: "stale_owner" });
  });

  it("rejects a non-JSON-safe result before querying", async () => {
    const execute = vi.fn();
    const context = fakeQueryContext(execute);
    await expect(
      completeIdempotencyRecord(context, {
        recordId: VALID_UUID,
        ownerToken: OTHER_UUID,
        result: new Date() as never,
        resultCode: null,
        completedAt: new Date(),
      }),
    ).rejects.toBeInstanceOf(IdempotencyValidationError);
    expect(execute).not.toHaveBeenCalled();
  });
});

describe("failIdempotencyRecord", () => {
  it("returns 'updated' and requires expiresAt after failedAt", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [{ id: VALID_UUID }] });
    const context = fakeQueryContext(execute);
    const failedAt = new Date("2024-01-01T00:00:00Z");
    const result = await failIdempotencyRecord(context, {
      recordId: VALID_UUID,
      ownerToken: OTHER_UUID,
      resultCode: "downstream_failure",
      failedAt,
      expiresAt: new Date("2024-01-02T00:00:00Z"),
    });
    expect(result).toEqual({ outcome: "updated" });
  });

  it("rejects expiresAt not after failedAt", async () => {
    const execute = vi.fn();
    const context = fakeQueryContext(execute);
    const failedAt = new Date("2024-01-01T00:00:00Z");
    await expect(
      failIdempotencyRecord(context, {
        recordId: VALID_UUID,
        ownerToken: OTHER_UUID,
        resultCode: "downstream_failure",
        failedAt,
        expiresAt: failedAt,
      }),
    ).rejects.toBeInstanceOf(IdempotencyValidationError);
    expect(execute).not.toHaveBeenCalled();
  });

  it("classifies 'not_found' when no record exists", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const context = fakeQueryContext(execute);
    const result = await failIdempotencyRecord(context, {
      recordId: VALID_UUID,
      ownerToken: OTHER_UUID,
      resultCode: "downstream_failure",
      failedAt: new Date("2024-01-01T00:00:00Z"),
      expiresAt: new Date("2024-01-02T00:00:00Z"),
    });
    expect(result).toEqual({ outcome: "not_found" });
  });
});

describe("deleteExpiredIdempotencyRecords", () => {
  it("rejects a limit above the maximum", async () => {
    const context = fakeQueryContext();
    await expect(
      deleteExpiredIdempotencyRecords(context, { cutoff: new Date(), limit: 501 }),
    ).rejects.toBeInstanceOf(IdempotencyValidationError);
  });

  it("returns the deleted ids", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [{ id: "a" }, { id: "b" }] });
    const context = fakeQueryContext(execute);
    const result = await deleteExpiredIdempotencyRecords(context, { cutoff: new Date(), limit: 10 });
    expect(result).toEqual({ deletedIds: ["a", "b"] });
  });
});
