/**
 * Durable Payment provider webhook inbox (IMP-026A / D-363).
 *
 * Received / pending processing authority. Not `payment_provider_observations`.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { appSchema } from "./index";

export const paymentProviderEventInboxTable = appSchema.table(
  "payment_provider_event_inbox",
  {
    id: uuid("id").primaryKey(),
    provider: text("provider").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    providerExecutionIdentity: text("provider_execution_identity"),
    processingState: text("processing_state").notNull(),
    processingAttemptCount: bigint("processing_attempt_count", { mode: "bigint" }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    claimLeaseExpiresAt: timestamp("claim_lease_expires_at", { withTimezone: true }),
    claimToken: uuid("claim_token"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    lastErrorCode: text("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    evidenceJson: text("evidence_json").notNull(),
  },
  (table) => [
    uniqueIndex("payment_provider_event_inbox_provider_event_uidx").on(
      table.provider,
      table.providerEventId,
    ),
    index("payment_provider_event_inbox_claim_idx").on(
      table.processingState,
      table.availableAt,
      table.receivedAt,
      table.id,
    ),
    index("payment_provider_event_inbox_expired_lease_idx")
      .on(table.claimLeaseExpiresAt)
      .where(sql`${table.processingState} = 'processing'`),
    check(
      "payment_provider_event_inbox_provider_nonempty_check",
      sql`length(trim(${table.provider})) > 0`,
    ),
    check(
      "payment_provider_event_inbox_event_id_nonempty_check",
      sql`length(trim(${table.providerEventId})) > 0`,
    ),
    check(
      "payment_provider_event_inbox_state_check",
      sql`${table.processingState} in ('pending', 'processing', 'processed', 'poison')`,
    ),
    check(
      "payment_provider_event_inbox_attempt_count_check",
      sql`${table.processingAttemptCount} >= 0`,
    ),
    check(
      "payment_provider_event_inbox_evidence_nonempty_check",
      sql`length(trim(${table.evidenceJson})) > 0`,
    ),
    check(
      "payment_provider_event_inbox_pending_state_check",
      sql`${table.processingState} <> 'pending' or (
        ${table.claimToken} is null
        and ${table.claimLeaseExpiresAt} is null
        and ${table.processedAt} is null
      )`,
    ),
    check(
      "payment_provider_event_inbox_processing_state_check",
      sql`${table.processingState} <> 'processing' or (
        ${table.claimToken} is not null
        and ${table.claimLeaseExpiresAt} is not null
        and ${table.processedAt} is null
      )`,
    ),
    check(
      "payment_provider_event_inbox_processed_state_check",
      sql`${table.processingState} <> 'processed' or (
        ${table.claimToken} is null
        and ${table.claimLeaseExpiresAt} is null
        and ${table.processedAt} is not null
      )`,
    ),
    check(
      "payment_provider_event_inbox_poison_state_check",
      sql`${table.processingState} <> 'poison' or (
        ${table.claimToken} is null
        and ${table.claimLeaseExpiresAt} is null
        and ${table.processedAt} is null
      )`,
    ),
  ],
);
