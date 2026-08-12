/**
 * Drizzle schema for `app.idempotency_records` (IMP-007).
 *
 * Stores only SHA-256 hashes of idempotency keys and request fingerprints —
 * never a raw key, raw canonical request material, or a raw request body
 * (see `src/server/persistence/idempotency` and AGENTS.md).
 */
import { sql } from "drizzle-orm";
import { check, index, jsonb, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { appSchema } from "./index";

export const idempotencyRecordsTable = appSchema.table(
  "idempotency_records",
  {
    id: uuid("id").primaryKey(),
    namespace: text("namespace").notNull(),
    keyHash: text("key_hash").notNull(),
    requestHash: text("request_hash").notNull(),
    status: text("status").notNull(),
    ownerToken: uuid("owner_token"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    result: jsonb("result"),
    resultCode: text("result_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check("idempotency_records_status_check", sql`${table.status} in ('in_progress', 'completed', 'failed')`),
    check("idempotency_records_key_hash_format_check", sql`${table.keyHash} ~ '^[0-9a-f]{64}$'`),
    check("idempotency_records_request_hash_format_check", sql`${table.requestHash} ~ '^[0-9a-f]{64}$'`),
    check("idempotency_records_updated_at_after_created_at_check", sql`${table.updatedAt} >= ${table.createdAt}`),
    check("idempotency_records_expires_after_created_at_check", sql`${table.expiresAt} > ${table.createdAt}`),
    check(
      "idempotency_records_in_progress_state_check",
      sql`${table.status} <> 'in_progress' or (${table.ownerToken} is not null and ${table.leaseExpiresAt} is not null and ${table.completedAt} is null)`,
    ),
    check(
      "idempotency_records_completed_state_check",
      sql`${table.status} <> 'completed' or (${table.ownerToken} is null and ${table.leaseExpiresAt} is null and ${table.completedAt} is not null)`,
    ),
    check(
      "idempotency_records_failed_state_check",
      sql`${table.status} <> 'failed' or (${table.ownerToken} is null and ${table.leaseExpiresAt} is null)`,
    ),
    uniqueIndex("idempotency_records_namespace_key_hash_key").on(table.namespace, table.keyHash),
    index("idempotency_records_lease_idx").on(table.status, table.leaseExpiresAt),
    index("idempotency_records_expires_at_idx").on(table.expiresAt),
  ],
);
