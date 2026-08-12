/**
 * Drizzle schema for `app.outbox_events` (IMP-007).
 *
 * Technical persistence only — this is not a domain event. It records that
 * *some future* domain event must eventually be delivered at least once; it
 * carries no publisher, no worker, and no delivery guarantee stronger than
 * at-least-once (see `src/server/persistence/outbox` and AGENTS.md).
 */
import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appSchema } from "./index";

export const outboxEventsTable = appSchema.table(
  "outbox_events",
  {
    id: uuid("id").primaryKey(),
    eventType: text("event_type").notNull(),
    eventVersion: integer("event_version").notNull(),
    aggregateType: text("aggregate_type"),
    aggregateId: text("aggregate_id"),
    payload: jsonb("payload").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    status: text("status").notNull().default("pending"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    leaseToken: uuid("lease_token"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    lastErrorCode: text("last_error_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check("outbox_events_status_check", sql`${table.status} in ('pending', 'processing', 'published', 'dead_letter')`),
    check("outbox_events_event_version_positive_check", sql`${table.eventVersion} > 0`),
    check("outbox_events_attempt_count_non_negative_check", sql`${table.attemptCount} >= 0`),
    check("outbox_events_updated_at_after_created_at_check", sql`${table.updatedAt} >= ${table.createdAt}`),
    check(
      "outbox_events_pending_state_check",
      sql`${table.status} <> 'pending' or (${table.leaseToken} is null and ${table.leaseExpiresAt} is null and ${table.publishedAt} is null)`,
    ),
    check(
      "outbox_events_processing_state_check",
      sql`${table.status} <> 'processing' or (${table.leaseToken} is not null and ${table.leaseExpiresAt} is not null and ${table.publishedAt} is null)`,
    ),
    check(
      "outbox_events_published_state_check",
      sql`${table.status} <> 'published' or (${table.leaseToken} is null and ${table.leaseExpiresAt} is null and ${table.publishedAt} is not null)`,
    ),
    check(
      "outbox_events_dead_letter_state_check",
      sql`${table.status} <> 'dead_letter' or (${table.leaseToken} is null and ${table.leaseExpiresAt} is null and ${table.publishedAt} is null)`,
    ),
    index("outbox_events_claim_idx").on(table.status, table.availableAt, table.occurredAt, table.id),
    index("outbox_events_aggregate_idx").on(table.aggregateType, table.aggregateId, table.occurredAt),
    index("outbox_events_expired_lease_idx")
      .on(table.leaseExpiresAt)
      .where(sql`${table.status} = 'processing'`),
  ],
);
