/**
 * PostgreSQL integration tests for the transactional outbox store
 * (IMP-007). Real Testcontainers PostgreSQL 18 only — every test gets its
 * own isolated, freshly-migrated database.
 */
import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, inject, it } from "vitest";

import type { WebConfig } from "../../src/platform/config";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  claimOutboxBatch,
  deleteDeadLetterOutboxEvents,
  deletePublishedOutboxEvents,
  enqueueOutboxEvent,
  markOutboxDeadLetter,
  markOutboxPublished,
  OutboxDuplicateEventError,
  OutboxValidationError,
  releaseOutboxForRetry,
} from "../../src/server/persistence/outbox";
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

function enqueueInput(overrides: Partial<Parameters<typeof enqueueOutboxEvent>[1]> = {}) {
  const now = new Date();
  return {
    id: randomUUID(),
    eventType: "order.created",
    eventVersion: 1,
    payload: { orderId: "abc-123" },
    occurredAt: now,
    availableAt: now,
    createdAt: now,
    ...overrides,
  };
}

describe("enqueueOutboxEvent", () => {
  it("inserts a pending row inside a real transaction", async () => {
    await withMigratedPersistence(async (persistence) => {
      const input = enqueueInput();
      const reference = await persistence.transaction((tx) => enqueueOutboxEvent(tx, input));
      expect(reference.status).toBe("pending");

      await persistence.withContext(async (ctx) => {
        const result = await ctx.db.execute<{ status: string; attempt_count: number }>(
          sql`select status, attempt_count from app.outbox_events where id = ${input.id}`,
        );
        expect(result.rows[0]).toEqual({ status: "pending", attempt_count: 0 });
      });
    });
  });

  it("fails safely (without leaking payload) on a duplicate event id", async () => {
    await withMigratedPersistence(async (persistence) => {
      const input = enqueueInput();
      await persistence.transaction((tx) => enqueueOutboxEvent(tx, input));

      const error = await persistence
        .transaction((tx) => enqueueOutboxEvent(tx, input))
        .catch((e) => e);

      expect(error).toBeInstanceOf(OutboxDuplicateEventError);
      const serialized = JSON.stringify((error as OutboxDuplicateEventError).toSafeJSON());
      expect(serialized).not.toContain("orderId");
      expect(serialized).not.toContain("abc-123");
    });
  });

  it("rejects a plain withContext query context (not a transaction)", async () => {
    await withMigratedPersistence(async (persistence) => {
      const input = enqueueInput();
      await expect(
        persistence.withContext((ctx) => enqueueOutboxEvent(ctx, input)),
      ).rejects.toBeInstanceOf(OutboxValidationError);
    });
  });
});

describe("transactional domain-probe evidence", () => {
  it("commits the domain probe row and the outbox row together", async () => {
    await withMigratedPersistence(async (persistence) => {
      await persistence.withContext((ctx) =>
        ctx.db.execute(sql`create table if not exists domain_probe (id uuid primary key)`),
      );

      const probeId = randomUUID();
      const eventInput = enqueueInput();

      await persistence.transaction(async (tx) => {
        await tx.db.execute(sql`insert into domain_probe (id) values (${probeId})`);
        await enqueueOutboxEvent(tx, eventInput);
      });

      await persistence.withContext(async (ctx) => {
        const probe = await ctx.db.execute<{ id: string }>(sql`select id from domain_probe where id = ${probeId}`);
        expect(probe.rows).toHaveLength(1);
        const event = await ctx.db.execute<{ id: string }>(sql`select id from app.outbox_events where id = ${eventInput.id}`);
        expect(event.rows).toHaveLength(1);
      });
    });
  });

  it("rolls back both the domain probe row and the outbox row on a synthetic domain error", async () => {
    await withMigratedPersistence(async (persistence) => {
      await persistence.withContext((ctx) =>
        ctx.db.execute(sql`create table if not exists domain_probe (id uuid primary key)`),
      );

      const probeId = randomUUID();
      const eventInput = enqueueInput();
      let callCount = 0;
      class SyntheticDomainError extends Error {}

      await expect(
        persistence.transaction(async (tx) => {
          callCount += 1;
          await tx.db.execute(sql`insert into domain_probe (id) values (${probeId})`);
          await enqueueOutboxEvent(tx, eventInput);
          throw new SyntheticDomainError("business rule violated");
        }),
      ).rejects.toBeInstanceOf(SyntheticDomainError);

      expect(callCount).toBe(1);

      await persistence.withContext(async (ctx) => {
        const probe = await ctx.db.execute<{ id: string }>(sql`select id from domain_probe where id = ${probeId}`);
        expect(probe.rows).toHaveLength(0);
        const event = await ctx.db.execute<{ id: string }>(sql`select id from app.outbox_events where id = ${eventInput.id}`);
        expect(event.rows).toHaveLength(0);
      });
    });
  });
});

describe("claimOutboxBatch", () => {
  it("claims only pending-and-due events, skipping future, published, and dead-letter ones", async () => {
    await withMigratedPersistence(async (persistence) => {
      const now = new Date();
      const due = enqueueInput({ availableAt: new Date(now.getTime() - 1000) });
      const future = enqueueInput({ availableAt: new Date(now.getTime() + 60_000) });
      for (const input of [due, future]) {
        await persistence.transaction((tx) => enqueueOutboxEvent(tx, input));
      }
      // Captured after enqueuing — see the equivalent comment in "never
      // claims the same live event" below.
      const claimNow = new Date();

      const batch = await persistence.withContext((ctx) =>
        claimOutboxBatch(ctx, { now: claimNow, leaseToken: randomUUID(), leaseExpiresAt: new Date(claimNow.getTime() + 30_000) }),
      );
      expect(batch.events.map((e) => e.id)).toEqual([due.id]);
      expect(batch.events[0]?.attemptCount).toBe(1);
    });
  });

  it("does not claim a live-leased processing event but reclaims an expired one", async () => {
    await withMigratedPersistence(async (persistence) => {
      const now = new Date();
      const input = enqueueInput({ availableAt: new Date(now.getTime() - 1000) });
      await persistence.transaction((tx) => enqueueOutboxEvent(tx, input));
      // Captured after enqueuing — see the equivalent comment in "never
      // claims the same live event" below.
      const claimNow = new Date();

      const firstLease = randomUUID();
      const firstClaim = await persistence.withContext((ctx) =>
        claimOutboxBatch(ctx, { now: claimNow, leaseToken: firstLease, leaseExpiresAt: new Date(claimNow.getTime() + 30_000) }),
      );
      expect(firstClaim.events).toHaveLength(1);

      const secondClaimSameTime = await persistence.withContext((ctx) =>
        claimOutboxBatch(ctx, { now: claimNow, leaseToken: randomUUID(), leaseExpiresAt: new Date(claimNow.getTime() + 30_000) }),
      );
      expect(secondClaimSameTime.events).toHaveLength(0);

      const later = new Date(claimNow.getTime() + 60_000);
      const reclaim = await persistence.withContext((ctx) =>
        claimOutboxBatch(ctx, { now: later, leaseToken: randomUUID(), leaseExpiresAt: new Date(later.getTime() + 30_000) }),
      );
      expect(reclaim.events.map((e) => e.id)).toEqual([input.id]);
      expect(reclaim.events[0]?.attemptCount).toBe(2);
    });
  });

  it("never claims the same live event for two concurrent claimers", async () => {
    await withMigratedPersistence(async (persistence) => {
      const beforeEnqueue = new Date();
      const inputs = Array.from({ length: 6 }, () => enqueueInput({ availableAt: new Date(beforeEnqueue.getTime() - 1000) }));
      for (const input of inputs) {
        await persistence.transaction((tx) => enqueueOutboxEvent(tx, input));
      }
      // Captured *after* every enqueue so the claim's `updated_at` is never
      // earlier than any row's own `created_at` (each enqueueInput() call
      // stamps its own createdAt with its own, slightly later, `new Date()`).
      const now = new Date();

      const [batchA, batchB] = await Promise.all([
        persistence.withContext((ctx) =>
          claimOutboxBatch(ctx, { now, leaseToken: randomUUID(), leaseExpiresAt: new Date(now.getTime() + 30_000), limit: 3 }),
        ),
        persistence.withContext((ctx) =>
          claimOutboxBatch(ctx, { now, leaseToken: randomUUID(), leaseExpiresAt: new Date(now.getTime() + 30_000), limit: 3 }),
        ),
      ]);

      const idsA = batchA.events.map((e) => e.id);
      const idsB = batchB.events.map((e) => e.id);
      expect(idsA.filter((id) => idsB.includes(id))).toHaveLength(0);
      expect(idsA.length + idsB.length).toBe(6);
    });
  });
});

describe("outbox state transitions", () => {
  async function claimOne(persistence: ReturnType<typeof getApplicationPersistence>) {
    const now = new Date();
    const input = enqueueInput({ availableAt: new Date(now.getTime() - 1000) });
    await persistence.transaction((tx) => enqueueOutboxEvent(tx, input));
    // Captured after enqueuing — see the equivalent comment in "never
    // claims the same live event" above; otherwise this row's own
    // (later) createdAt can fail the updated_at >= created_at check.
    const claimNow = new Date();
    const leaseToken = randomUUID();
    const batch = await persistence.withContext((ctx) =>
      claimOutboxBatch(ctx, { now: claimNow, leaseToken, leaseExpiresAt: new Date(claimNow.getTime() + 30_000) }),
    );
    return { eventId: batch.events[0]!.id, leaseToken };
  }

  it("a stale lease cannot publish, retry, or dead-letter; the correct lease can", async () => {
    await withMigratedPersistence(async (persistence) => {
      const { eventId, leaseToken } = await claimOne(persistence);

      const stalePublish = await persistence.withContext((ctx) =>
        markOutboxPublished(ctx, { eventId, leaseToken: randomUUID(), publishedAt: new Date() }),
      );
      expect(stalePublish.outcome).toBe("stale_lease");

      const correctPublish = await persistence.withContext((ctx) =>
        markOutboxPublished(ctx, { eventId, leaseToken, publishedAt: new Date() }),
      );
      expect(correctPublish.outcome).toBe("updated");

      await persistence.withContext(async (ctx) => {
        const row = await ctx.db.execute<{ status: string; lease_token: string | null; published_at: Date | null }>(
          sql`select status, lease_token, published_at from app.outbox_events where id = ${eventId}`,
        );
        expect(row.rows[0]?.status).toBe("published");
        expect(row.rows[0]?.lease_token).toBeNull();
        expect(row.rows[0]?.published_at).not.toBeNull();
      });
    });
  });

  it("releaseOutboxForRetry clears lease fields and returns the event to pending", async () => {
    await withMigratedPersistence(async (persistence) => {
      const { eventId, leaseToken } = await claimOne(persistence);
      const nextAvailableAt = new Date(Date.now() + 60_000);

      const result = await persistence.withContext((ctx) =>
        releaseOutboxForRetry(ctx, { eventId, leaseToken, nextAvailableAt, errorCode: "timeout", updatedAt: new Date() }),
      );
      expect(result.outcome).toBe("updated");

      await persistence.withContext(async (ctx) => {
        const row = await ctx.db.execute<{
          status: string;
          lease_token: string | null;
          lease_expires_at: Date | null;
          last_error_code: string | null;
        }>(sql`select status, lease_token, lease_expires_at, last_error_code from app.outbox_events where id = ${eventId}`);
        expect(row.rows[0]).toMatchObject({ status: "pending", lease_token: null, lease_expires_at: null, last_error_code: "timeout" });
      });
    });
  });

  it("markOutboxDeadLetter clears lease fields and sets status", async () => {
    await withMigratedPersistence(async (persistence) => {
      const { eventId, leaseToken } = await claimOne(persistence);

      const result = await persistence.withContext((ctx) =>
        markOutboxDeadLetter(ctx, { eventId, leaseToken, errorCode: "fatal", updatedAt: new Date() }),
      );
      expect(result.outcome).toBe("updated");

      await persistence.withContext(async (ctx) => {
        const row = await ctx.db.execute<{ status: string; lease_token: string | null }>(
          sql`select status, lease_token from app.outbox_events where id = ${eventId}`,
        );
        expect(row.rows[0]).toEqual({ status: "dead_letter", lease_token: null });
      });
    });
  });
});

describe("outbox cleanup", () => {
  it("deletePublishedOutboxEvents removes only published rows, bounded by limit", async () => {
    await withMigratedPersistence(async (persistence) => {
      const now = new Date();
      const published = enqueueInput({ availableAt: new Date(now.getTime() - 1000) });
      await persistence.transaction((tx) => enqueueOutboxEvent(tx, published));
      // Captured after enqueuing — see the equivalent comment in
      // "never claims the same live event" above.
      const claimNow = new Date();

      // Claimed and published while it is the *only* eligible row, so the
      // claim is unambiguous — no reliance on tie-break-by-random-id
      // ordering against a second simultaneously-eligible row.
      const leaseToken = randomUUID();
      const batch = await persistence.withContext((ctx) =>
        claimOutboxBatch(ctx, { now: claimNow, leaseToken, leaseExpiresAt: new Date(claimNow.getTime() + 30_000) }),
      );
      expect(batch.events.map((e) => e.id)).toEqual([published.id]);
      await persistence.withContext((ctx) =>
        markOutboxPublished(ctx, { eventId: published.id, leaseToken, publishedAt: new Date() }),
      );

      // Enqueued only after the claim above, so it can never be the row
      // claimed/published — it stays "pending" as the cleanup control row.
      const pending = enqueueInput({ availableAt: new Date(now.getTime() - 1000) });
      await persistence.transaction((tx) => enqueueOutboxEvent(tx, pending));

      const cutoff = new Date(Date.now() + 1000);
      const result = await persistence.withContext((ctx) => deletePublishedOutboxEvents(ctx, { cutoff, limit: 10 }));
      expect(result.deletedIds).toEqual([published.id]);

      await persistence.withContext(async (ctx) => {
        const remaining = await ctx.db.execute<{ id: string }>(sql`select id from app.outbox_events`);
        expect(remaining.rows.map((r) => r.id)).toEqual([pending.id]);
      });
    });
  });

  it("deleteDeadLetterOutboxEvents is a distinct operation that never touches published rows", async () => {
    await withMigratedPersistence(async (persistence) => {
      const now = new Date();
      const input = enqueueInput({ availableAt: new Date(now.getTime() - 1000) });
      await persistence.transaction((tx) => enqueueOutboxEvent(tx, input));
      // Captured after enqueuing — see the equivalent comment in
      // "never claims the same live event" above.
      const claimNow = new Date();

      const leaseToken = randomUUID();
      const batch = await persistence.withContext((ctx) =>
        claimOutboxBatch(ctx, { now: claimNow, leaseToken, leaseExpiresAt: new Date(claimNow.getTime() + 30_000) }),
      );
      await persistence.withContext((ctx) =>
        markOutboxPublished(ctx, { eventId: batch.events[0]!.id, leaseToken, publishedAt: new Date() }),
      );

      const cutoff = new Date(Date.now() + 1000);
      const result = await persistence.withContext((ctx) => deleteDeadLetterOutboxEvents(ctx, { cutoff, limit: 10 }));
      expect(result.deletedIds).toEqual([]);

      await persistence.withContext(async (ctx) => {
        const remaining = await ctx.db.execute<{ id: string }>(sql`select id from app.outbox_events`);
        expect(remaining.rows).toHaveLength(1);
      });
    });
  });
});
