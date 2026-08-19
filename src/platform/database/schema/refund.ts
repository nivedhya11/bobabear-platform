/**
 * Drizzle schema for Refund persistence (IMP-027 / D-364).
 *
 * Refund is first-class financial-reversal authority. Payment SUCCEEDED remains
 * original collection truth. No Payment REFUNDED status. No invoice/credit-note
 * tables. Amounts are integer paise — never floating point.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { checkoutSnapshotsTable } from "./checkout";
import { appSchema } from "./index";
import { ordersTable } from "./order";
import { paymentsTable } from "./payment";
import { workforceAuthUsers } from "./workforce-auth";

/** Money column helper — INR paise, exact integer, never floating point. */
function paise(name: string) {
  return bigint(name, { mode: "bigint" });
}

export const refundsTable = appSchema.table(
  "refunds",
  {
    id: uuid("id").primaryKey(),
    paymentId: uuid("payment_id").notNull(),
    checkoutId: uuid("checkout_id"),
    checkoutSnapshotId: uuid("checkout_snapshot_id"),
    orderId: uuid("order_id"),
    amountPaise: paise("amount_paise").notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull(),
    provider: text("provider").notNull(),
    providerIdempotencyKey: text("provider_idempotency_key").notNull(),
    providerRefundId: text("provider_refund_id"),
    providerPaymentId: text("provider_payment_id"),
    providerStatusCode: text("provider_status_code"),
    failureCode: text("failure_code"),
    failureReason: text("failure_reason"),
    acquirerReference: text("acquirer_reference"),
    reason: text("reason").notNull(),
    operatorNote: text("operator_note"),
    initiatedByActorKind: text("initiated_by_actor_kind").notNull(),
    initiatedByActorId: text("initiated_by_actor_id").notNull(),
    authorizedPermission: text("authorized_permission").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull(),
    pendingAt: timestamp("pending_at", { withTimezone: true }),
    indeterminateAt: timestamp("indeterminate_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "refunds_payment_fk",
      columns: [table.paymentId],
      foreignColumns: [paymentsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "refunds_checkout_snapshot_ownership_fk",
      columns: [table.checkoutSnapshotId, table.checkoutId],
      foreignColumns: [
        checkoutSnapshotsTable.id,
        checkoutSnapshotsTable.checkoutId,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "refunds_order_fk",
      columns: [table.orderId],
      foreignColumns: [ordersTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "refunds_initiated_by_workforce_user_fk",
      columns: [table.initiatedByActorId],
      foreignColumns: [workforceAuthUsers.id],
    }).onDelete("restrict"),
    uniqueIndex("refunds_provider_idempotency_key_uidx").on(table.providerIdempotencyKey),
    uniqueIndex("refunds_provider_refund_id_uidx")
      .on(table.provider, table.providerRefundId)
      .where(sql`${table.providerRefundId} is not null`),
    index("refunds_payment_id_idx").on(table.paymentId),
    index("refunds_nonterminal_idx")
      .on(table.paymentId, table.status)
      .where(sql`${table.status} in ('ACCEPTED', 'PENDING', 'INDETERMINATE')`),
    check("refunds_amount_positive_check", sql`${table.amountPaise} > 0`),
    check(
      "refunds_currency_nonempty_check",
      sql`length(trim(${table.currency})) > 0`,
    ),
    check(
      "refunds_status_check",
      sql`${table.status} in ('ACCEPTED', 'PENDING', 'INDETERMINATE', 'PROCESSED', 'FAILED')`,
    ),
    check(
      "refunds_provider_nonempty_check",
      sql`length(trim(${table.provider})) > 0`,
    ),
    check(
      "refunds_provider_idempotency_key_nonempty_check",
      sql`length(trim(${table.providerIdempotencyKey})) > 0`,
    ),
    check(
      "refunds_reason_length_check",
      sql`char_length(${table.reason}) between 1 and 500`,
    ),
    check(
      "refunds_operator_note_length_check",
      sql`${table.operatorNote} is null or char_length(${table.operatorNote}) between 1 and 1000`,
    ),
    check(
      "refunds_actor_kind_check",
      sql`${table.initiatedByActorKind} = 'workforce'`,
    ),
    check(
      "refunds_authorized_permission_check",
      sql`${table.authorizedPermission} = 'payment.refund'`,
    ),
    check(
      "refunds_processed_state_check",
      sql`(${table.status} = 'PROCESSED' and ${table.processedAt} is not null)
        or (${table.status} <> 'PROCESSED' and ${table.processedAt} is null)`,
    ),
    check(
      "refunds_failed_state_check",
      sql`(${table.status} = 'FAILED' and ${table.failedAt} is not null)
        or (${table.status} <> 'FAILED' and ${table.failedAt} is null)`,
    ),
    check(
      "refunds_pending_state_check",
      sql`(${table.status} = 'PENDING' and ${table.pendingAt} is not null)
        or (${table.status} <> 'PENDING')`,
    ),
    check(
      "refunds_indeterminate_state_check",
      sql`(${table.status} = 'INDETERMINATE' and ${table.indeterminateAt} is not null)
        or (${table.status} <> 'INDETERMINATE')`,
    ),
    check(
      "refunds_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
  ],
);

export const refundProviderReferencesTable = appSchema.table(
  "refund_provider_references",
  {
    id: uuid("id").primaryKey(),
    refundId: uuid("refund_id").notNull(),
    provider: text("provider").notNull(),
    referenceKind: text("reference_kind").notNull(),
    referenceValue: text("reference_value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "refund_provider_references_refund_fk",
      columns: [table.refundId],
      foreignColumns: [refundsTable.id],
    }).onDelete("restrict"),
    uniqueIndex("refund_provider_references_provider_kind_value_uidx").on(
      table.provider,
      table.referenceKind,
      table.referenceValue,
    ),
    index("refund_provider_references_refund_idx").on(table.refundId),
    check(
      "refund_provider_references_provider_nonempty_check",
      sql`length(trim(${table.provider})) > 0`,
    ),
    check(
      "refund_provider_references_kind_nonempty_check",
      sql`length(trim(${table.referenceKind})) > 0`,
    ),
    check(
      "refund_provider_references_value_nonempty_check",
      sql`length(trim(${table.referenceValue})) > 0`,
    ),
  ],
);

export const refundProviderObservationsTable = appSchema.table(
  "refund_provider_observations",
  {
    id: uuid("id").primaryKey(),
    refundId: uuid("refund_id").notNull(),
    observationSource: text("observation_source").notNull(),
    provider: text("provider").notNull(),
    providerEventId: text("provider_event_id"),
    normalizedOutcome: text("normalized_outcome").notNull(),
    observedAmountPaise: paise("observed_amount_paise"),
    observedCurrency: text("observed_currency"),
    providerStatusCode: text("provider_status_code"),
    payloadDigest: text("payload_digest"),
    reconciliationAnomaly: text("reconciliation_anomaly"),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "refund_provider_observations_refund_fk",
      columns: [table.refundId],
      foreignColumns: [refundsTable.id],
    }).onDelete("restrict"),
    uniqueIndex("refund_provider_observations_provider_event_uidx")
      .on(table.provider, table.providerEventId)
      .where(sql`${table.providerEventId} is not null`),
    index("refund_provider_observations_refund_idx").on(table.refundId),
    check(
      "refund_provider_observations_source_check",
      sql`${table.observationSource} in ('sync', 'webhook', 'query', 'reconciliation')`,
    ),
    check(
      "refund_provider_observations_outcome_check",
      sql`${table.normalizedOutcome} in (
        'PENDING',
        'PROCESSED',
        'FAILED',
        'INDETERMINATE',
        'ANOMALY',
        'UNSUPPORTED'
      )`,
    ),
    check(
      "refund_provider_observations_currency_check",
      sql`${table.observedCurrency} is null or length(trim(${table.observedCurrency})) > 0`,
    ),
    check(
      "refund_provider_observations_amount_positive_check",
      sql`${table.observedAmountPaise} is null or ${table.observedAmountPaise} > 0`,
    ),
    check(
      "refund_provider_observations_payload_digest_check",
      sql`${table.payloadDigest} is null or ${table.payloadDigest} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);
