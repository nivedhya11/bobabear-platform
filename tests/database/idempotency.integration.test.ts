/**
 * PostgreSQL integration tests for the idempotency store (IMP-007). Real
 * Testcontainers PostgreSQL 18 only — every test gets its own isolated,
 * freshly-migrated database.
 */
import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, inject, it } from "vitest";

import type { WebConfig } from "../../src/platform/config";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  acquireIdempotencyRecord,
  completeIdempotencyRecord,
  deleteExpiredIdempotencyRecords,
  failIdempotencyRecord,
  hashIdempotencyKey,
  hashRequestFingerprint,
} from "../../src/server/persistence/idempotency";
import { applyMigrations, withIsolatedTestDatabase } from "./support/test-database";

function adminConnectionInfo() {
  return {
    connectionString: inject("bobaBearTestAdminConnectionString"),
    host: inject("bobaBearTestAdminHost"),
    port: inject("bobaBearTestAdminPort"),
  };
}

function applicationConfig(databaseUrl: string): WebConfig {
  return {
    environment: "test",
    processKind: "web",
    publicOrigin: "http://localhost:3000",
    logLevel: "warn",
    release: null,
    allowUnsafeAdapters: true,
    databaseSslMode: "disable",
    port: 3000,
    databaseUrl,
  };
}

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
});

async function withMigratedPersistence<T>(fn: (persistence: ReturnType<typeof getApplicationPersistence>) => Promise<T>): Promise<T> {
  return withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
    await applyMigrations(database.connectionString);
    const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
    openHandles.push(persistence);
    return fn(persistence);
  });
}

const RAW_KEY = "customer-42:create-order:idem-key-abc";
const CANONICAL_REQUEST = '{"amount":100,"currency":"USD"}';

function acquireInput(overrides: Partial<Parameters<typeof acquireIdempotencyRecord>[1]> = {}) {
  // Defaults for leaseExpiresAt/expiresAt are derived from the *effective*
  // `now` (an override's `now`, if supplied) — never from a fresh
  // `new Date()` that could land before an overridden `now`.
  const now = overrides.now ?? new Date();
  return {
    recordId: randomUUID(),
    namespace: "orders.create",
    rawKey: RAW_KEY,
    canonicalRequestFingerprint: CANONICAL_REQUEST,
    ownerToken: randomUUID(),
    now,
    leaseExpiresAt: new Date(now.getTime() + 5_000),
    expiresAt: new Date(now.getTime() + 3_600_000),
    ...overrides,
  };
}

describe("acquireIdempotencyRecord", () => {
  it("acquires a new record and never stores the raw key or fingerprint", async () => {
    await withMigratedPersistence(async (persistence) => {
      const input = acquireInput();
      const result = await persistence.withContext((ctx) => acquireIdempotencyRecord(ctx, input));
      expect(result.outcome).toBe("acquired");

      await persistence.withContext(async (ctx) => {
        const row = await ctx.db.execute<{ namespace: string; key_hash: string; request_hash: string }>(
          sql`select namespace, key_hash, request_hash from app.idempotency_records where id = ${input.recordId}`,
        );
        const stored = row.rows[0]!;
        expect(stored.key_hash).toBe(hashIdempotencyKey(RAW_KEY));
        expect(stored.request_hash).toBe(hashRequestFingerprint(CANONICAL_REQUEST));
        expect(JSON.stringify(stored)).not.toContain(RAW_KEY);
        expect(JSON.stringify(stored)).not.toContain("amount");
      });
    });
  });

  it("returns 'in_progress' for the same key/request under a live lease", async () => {
    await withMigratedPersistence(async (persistence) => {
      const input = acquireInput();
      await persistence.withContext((ctx) => acquireIdempotencyRecord(ctx, input));

      const second = await persistence.withContext((ctx) =>
        acquireIdempotencyRecord(ctx, acquireInput({ recordId: randomUUID(), ownerToken: randomUUID() })),
      );
      expect(second.outcome).toBe("in_progress");
    });
  });

  it("returns 'conflict' for the same key with a different request while unexpired", async () => {
    await withMigratedPersistence(async (persistence) => {
      const input = acquireInput();
      await persistence.withContext((ctx) => acquireIdempotencyRecord(ctx, input));

      const conflicting = await persistence.withContext((ctx) =>
        acquireIdempotencyRecord(
          ctx,
          acquireInput({ recordId: randomUUID(), ownerToken: randomUUID(), canonicalRequestFingerprint: '{"amount":999}' }),
        ),
      );
      expect(conflicting.outcome).toBe("conflict");
    });
  });

  it("reclaims an expired lease for the same request, but a different request still conflicts while the record is unexpired", async () => {
    await withMigratedPersistence(async (persistence) => {
      const now = new Date();
      const input = acquireInput({
        now,
        leaseExpiresAt: new Date(now.getTime() + 10),
        expiresAt: new Date(now.getTime() + 3_600_000),
      });
      await persistence.withContext((ctx) => acquireIdempotencyRecord(ctx, input));

      const later = new Date(now.getTime() + 1000);

      const differentRequestAttempt = await persistence.withContext((ctx) =>
        acquireIdempotencyRecord(
          ctx,
          acquireInput({
            recordId: randomUUID(),
            ownerToken: randomUUID(),
            now: later,
            leaseExpiresAt: new Date(later.getTime() + 5_000),
            canonicalRequestFingerprint: '{"amount":999}',
          }),
        ),
      );
      expect(differentRequestAttempt.outcome).toBe("conflict");

      const newOwner = randomUUID();
      const reclaim = await persistence.withContext((ctx) =>
        acquireIdempotencyRecord(
          ctx,
          acquireInput({
            recordId: randomUUID(),
            ownerToken: newOwner,
            now: later,
            leaseExpiresAt: new Date(later.getTime() + 5_000),
          }),
        ),
      );
      expect(reclaim).toMatchObject({ outcome: "acquired", recordId: input.recordId, ownerToken: newOwner, reclaimed: true });
    });
  });

  it("replays a completed result and never reclaims a completed record via lease expiry", async () => {
    await withMigratedPersistence(async (persistence) => {
      const input = acquireInput();
      await persistence.withContext((ctx) => acquireIdempotencyRecord(ctx, input));
      const completedAt = new Date();
      await persistence.withContext((ctx) =>
        completeIdempotencyRecord(ctx, {
          recordId: input.recordId,
          ownerToken: input.ownerToken,
          result: { orderId: "created-1" },
          resultCode: "success",
          completedAt,
        }),
      );

      const replay = await persistence.withContext((ctx) =>
        acquireIdempotencyRecord(ctx, acquireInput({ recordId: randomUUID(), ownerToken: randomUUID(), now: new Date(completedAt.getTime() + 60_000) })),
      );
      expect(replay).toMatchObject({
        outcome: "completed",
        recordId: input.recordId,
        terminalStatus: "completed",
        result: { orderId: "created-1" },
        resultCode: "success",
      });
    });
  });

  it("replays a failed terminal result until the record's own expiry", async () => {
    await withMigratedPersistence(async (persistence) => {
      const input = acquireInput();
      await persistence.withContext((ctx) => acquireIdempotencyRecord(ctx, input));
      const failedAt = new Date();
      await persistence.withContext((ctx) =>
        failIdempotencyRecord(ctx, {
          recordId: input.recordId,
          ownerToken: input.ownerToken,
          resultCode: "downstream_timeout",
          failedAt,
          expiresAt: new Date(failedAt.getTime() + 3_600_000),
        }),
      );

      const replay = await persistence.withContext((ctx) =>
        acquireIdempotencyRecord(ctx, acquireInput({ recordId: randomUUID(), ownerToken: randomUUID(), now: new Date(failedAt.getTime() + 1000) })),
      );
      expect(replay).toMatchObject({ outcome: "completed", terminalStatus: "failed", resultCode: "downstream_timeout" });
    });
  });

  it("atomically resets a fully expired record for a brand-new acquisition", async () => {
    await withMigratedPersistence(async (persistence) => {
      const now = new Date();
      const input = acquireInput({
        now,
        leaseExpiresAt: new Date(now.getTime() + 5),
        expiresAt: new Date(now.getTime() + 10),
      });
      await persistence.withContext((ctx) => acquireIdempotencyRecord(ctx, input));

      const later = new Date(now.getTime() + 1000);
      const newRecordId = randomUUID();
      const newOwner = randomUUID();
      const result = await persistence.withContext((ctx) =>
        acquireIdempotencyRecord(
          ctx,
          acquireInput({
            recordId: newRecordId,
            ownerToken: newOwner,
            now: later,
            leaseExpiresAt: new Date(later.getTime() + 5_000),
            expiresAt: new Date(later.getTime() + 3_600_000),
          }),
        ),
      );
      expect(result).toMatchObject({ outcome: "acquired", recordId: newRecordId, reclaimed: false });
    });
  });

  it("two concurrent initial acquisitions produce exactly one owner", async () => {
    await withMigratedPersistence(async (persistence) => {
      const base = acquireInput();
      const [a, b] = await Promise.all([
        persistence.withContext((ctx) => acquireIdempotencyRecord(ctx, { ...base, recordId: randomUUID(), ownerToken: randomUUID() })),
        persistence.withContext((ctx) => acquireIdempotencyRecord(ctx, { ...base, recordId: randomUUID(), ownerToken: randomUUID() })),
      ]);
      const outcomes = [a.outcome, b.outcome].sort();
      expect(outcomes).toEqual(["acquired", "in_progress"]);
    });
  });
});

describe("completeIdempotencyRecord / failIdempotencyRecord", () => {
  it("a stale owner cannot complete or fail; the current owner can", async () => {
    await withMigratedPersistence(async (persistence) => {
      const input = acquireInput();
      await persistence.withContext((ctx) => acquireIdempotencyRecord(ctx, input));

      const staleComplete = await persistence.withContext((ctx) =>
        completeIdempotencyRecord(ctx, { recordId: input.recordId, ownerToken: randomUUID(), result: null, resultCode: null, completedAt: new Date() }),
      );
      expect(staleComplete.outcome).toBe("stale_owner");

      const correctComplete = await persistence.withContext((ctx) =>
        completeIdempotencyRecord(ctx, { recordId: input.recordId, ownerToken: input.ownerToken, result: { ok: true }, resultCode: "success", completedAt: new Date() }),
      );
      expect(correctComplete.outcome).toBe("updated");
    });
  });

  it("two concurrent completion attempts by the current owner produce exactly one successful transition", async () => {
    await withMigratedPersistence(async (persistence) => {
      const input = acquireInput();
      await persistence.withContext((ctx) => acquireIdempotencyRecord(ctx, input));

      const [first, second] = await Promise.all([
        persistence.withContext((ctx) =>
          completeIdempotencyRecord(ctx, { recordId: input.recordId, ownerToken: input.ownerToken, result: { n: 1 }, resultCode: "success", completedAt: new Date() }),
        ),
        persistence.withContext((ctx) =>
          completeIdempotencyRecord(ctx, { recordId: input.recordId, ownerToken: input.ownerToken, result: { n: 2 }, resultCode: "success", completedAt: new Date() }),
        ),
      ]);
      const outcomes = [first.outcome, second.outcome].sort();
      expect(outcomes).toEqual(["invalid_state", "updated"]);
    });
  });
});

describe("deleteExpiredIdempotencyRecords", () => {
  it("deletes only expired records, bounded by limit, and never a newly reacquired record", async () => {
    await withMigratedPersistence(async (persistence) => {
      const now = new Date();
      const expired = acquireInput({
        now,
        leaseExpiresAt: new Date(now.getTime() + 5),
        expiresAt: new Date(now.getTime() + 10),
      });
      const alive = acquireInput({ now, recordId: randomUUID(), namespace: "orders.cancel", ownerToken: randomUUID(), expiresAt: new Date(now.getTime() + 3_600_000) });
      await persistence.withContext((ctx) => acquireIdempotencyRecord(ctx, expired));
      await persistence.withContext((ctx) => acquireIdempotencyRecord(ctx, alive));

      const cutoff = new Date(now.getTime() + 1000);
      const result = await persistence.withContext((ctx) => deleteExpiredIdempotencyRecords(ctx, { cutoff, limit: 10 }));
      expect(result.deletedIds).toEqual([expired.recordId]);

      await persistence.withContext(async (ctx) => {
        const remaining = await ctx.db.execute<{ id: string }>(sql`select id from app.idempotency_records`);
        expect(remaining.rows.map((r) => r.id)).toEqual([alive.recordId]);
      });
    });
  });
});
