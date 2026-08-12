/**
 * Migration-level PostgreSQL integration tests for IMP-007
 * (`app.outbox_events` / `app.idempotency_records`). Real Testcontainers
 * PostgreSQL 18 only — every test gets its own isolated, freshly-migrated
 * database.
 */
import { sql } from "drizzle-orm";
import { describe, expect, inject, it } from "vitest";

import type { WebConfig } from "../../src/platform/config";
import { getApplicationPersistence } from "../../src/server/persistence";
import { withOutboxIdempotencyRoleFixture } from "./support/outbox-idempotency-roles";
import { applyMigrations, withIsolatedTestDatabase, withTestDatabaseClient } from "./support/test-database";

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

describe("IMP-007 migration: tables, constraints, indexes", () => {
  it("clean replay creates both tables with their columns", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        // Scoped to IMP-007's own two tables — the `app` schema also holds
        // IMP-008's Better Auth tables (see
        // tests/database/auth-foundation-migration.integration.test.ts),
        // which are this suite's concern, not this one's.
        const tables = await client.pool.query<{ table_name: string }>(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'app' AND table_name IN ('idempotency_records', 'outbox_events') ORDER BY table_name",
        );
        expect(tables.rows.map((r) => r.table_name)).toEqual(["idempotency_records", "outbox_events"]);
      });
    });
  });

  it("has the required outbox_events indexes", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const indexes = await client.pool.query<{ indexname: string }>(
          "SELECT indexname FROM pg_indexes WHERE schemaname = 'app' AND tablename = 'outbox_events'",
        );
        const names = indexes.rows.map((r) => r.indexname);
        expect(names).toContain("outbox_events_claim_idx");
        expect(names).toContain("outbox_events_aggregate_idx");
        expect(names).toContain("outbox_events_expired_lease_idx");
      });
    });
  });

  it("has the required idempotency_records unique constraint and indexes", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const indexes = await client.pool.query<{ indexname: string }>(
          "SELECT indexname FROM pg_indexes WHERE schemaname = 'app' AND tablename = 'idempotency_records'",
        );
        const names = indexes.rows.map((r) => r.indexname);
        expect(names).toContain("idempotency_records_namespace_key_hash_key");
        expect(names).toContain("idempotency_records_lease_idx");
        expect(names).toContain("idempotency_records_expires_at_idx");

        // This uniqueness is enforced via a `CREATE UNIQUE INDEX` (drizzle's
        // `uniqueIndex()` builder), not a named `ALTER TABLE ... ADD
        // CONSTRAINT UNIQUE` — so it appears in pg_indexes, not in
        // information_schema.table_constraints. A unique index is exactly
        // what `ON CONFLICT (namespace, key_hash)` in acquireIdempotencyRecord
        // requires; Postgres does not require a formal constraint for that.
        const uniqueIndex = await client.pool.query<{ indexdef: string }>(
          `SELECT indexdef FROM pg_indexes
           WHERE schemaname = 'app' AND tablename = 'idempotency_records'
             AND indexname = 'idempotency_records_namespace_key_hash_key'`,
        );
        expect(uniqueIndex.rows[0]?.indexdef).toContain("CREATE UNIQUE INDEX");
      });
    });
  });

  it("has the required check constraints on both tables", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const checks = await client.pool.query<{ constraint_name: string }>(
          `SELECT cc.constraint_name FROM information_schema.check_constraints cc
           JOIN information_schema.table_constraints tc
             ON tc.constraint_name = cc.constraint_name AND tc.constraint_schema = cc.constraint_schema
           WHERE tc.table_schema = 'app' AND tc.table_name IN ('outbox_events', 'idempotency_records')`,
        );
        const names = checks.rows.map((r) => r.constraint_name);
        expect(names).toContain("outbox_events_status_check");
        expect(names).toContain("outbox_events_event_version_positive_check");
        expect(names).toContain("outbox_events_pending_state_check");
        expect(names).toContain("outbox_events_processing_state_check");
        expect(names).toContain("outbox_events_published_state_check");
        expect(names).toContain("outbox_events_dead_letter_state_check");
        expect(names).toContain("idempotency_records_status_check");
        expect(names).toContain("idempotency_records_key_hash_format_check");
        expect(names).toContain("idempotency_records_request_hash_format_check");
      });
    });
  });

  it("enforces the outbox_events status check constraint", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withTestDatabaseClient(database.connectionString, async (client) => {
        await expect(
          client.pool.query(
            `insert into app.outbox_events (id, event_type, event_version, payload, metadata, status, occurred_at, available_at, created_at, updated_at)
             values (gen_random_uuid(), 't', 1, '{}', '{}', 'bogus_status', now(), now(), now(), now())`,
          ),
        ).rejects.toThrow();
      });
    });
  });
});

describe("IMP-007 migration: application-role privileges", () => {
  it("grants exactly SELECT/INSERT/UPDATE/DELETE, and forbids DDL and role creation", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await withOutboxIdempotencyRoleFixture(database.databaseName, database.connectionString, async (fixture) => {
        const persistence = getApplicationPersistence(applicationConfig(fixture.applicationConnectionString));
        try {
          const insertedId = await persistence.withContext(async (ctx) => {
            const result = await ctx.db.execute<{ id: string }>(sql`
              insert into app.outbox_events (id, event_type, event_version, payload, metadata, status, occurred_at, available_at, created_at, updated_at)
              values (gen_random_uuid(), 't', 1, '{}'::jsonb, '{}'::jsonb, 'pending', now(), now(), now(), now())
              returning id
            `);
            return result.rows[0]?.id;
          });
          expect(typeof insertedId).toBe("string");

          await expect(
            persistence.withContext((ctx) => ctx.db.execute(sql`alter table app.outbox_events add column bogus text`)),
          ).rejects.toThrow();

          await expect(
            persistence.withContext((ctx) => ctx.db.execute(sql`drop table app.outbox_events`)),
          ).rejects.toThrow();

          await expect(
            persistence.withContext((ctx) => ctx.db.execute(sql`create role boba_test_escalation login`)),
          ).rejects.toThrow();
        } finally {
          await persistence.close();
        }
      });
    });
  });
});
