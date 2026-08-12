/**
 * Drizzle schema for Payment persistence (IMP-022).
 *
 * Exactly five Payment-owned `app.*` tables. Financial settlement against an
 * immutable Checkout snapshot. No Order / Refund tables. No core JSON authority.
 * No business seed rows. No provider SDK.
 *
 * Expected customer amount/currency live only on the bound Checkout snapshot
 * (`grand_total_paise` / `currency`). Provider observations may record observed
 * money separately for evidence comparison — never as a second expected authority.
 */
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
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
import { customerAuthUsers } from "./customer-auth";
import { appSchema } from "./index";

/** Money column helper — INR paise, exact integer, never floating point. */
function paise(name: string) {
  return bigint(name, { mode: "bigint" });
}

function paymentsIdColumn(): AnyPgColumn {
  return paymentsTable.id;
}
function paymentsCheckoutSnapshotIdColumn(): AnyPgColumn {
  return paymentsTable.checkoutSnapshotId;
}
function paymentAttemptsIdColumn(): AnyPgColumn {
  return paymentAttemptsTable.id;
}
function paymentAttemptsPaymentIdColumn(): AnyPgColumn {
  return paymentAttemptsTable.paymentId;
}

export const paymentsTable = appSchema.table(
  "payments",
  {
    id: uuid("id").primaryKey(),
    checkoutId: uuid("checkout_id").notNull(),
    checkoutSnapshotId: uuid("checkout_snapshot_id").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    succeededAt: timestamp("succeeded_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    expiredAt: timestamp("expired_at", { withTimezone: true }),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
  },
  (table) => [
    // PAY-323: Payment is structurally bound to the exact Checkout + snapshot pair.
    foreignKey({
      name: "payments_checkout_snapshot_ownership_fk",
      columns: [table.checkoutSnapshotId, table.checkoutId],
      foreignColumns: [
        checkoutSnapshotsTable.id,
        checkoutSnapshotsTable.checkoutId,
      ],
    }).onDelete("restrict"),
    uniqueIndex("payments_checkout_snapshot_id_uidx").on(table.checkoutSnapshotId),
    uniqueIndex("payments_id_checkout_snapshot_id_uidx").on(
      table.id,
      table.checkoutSnapshotId,
    ),
    index("payments_checkout_id_idx").on(table.checkoutId),
    check(
      "payments_status_check",
      sql`${table.status} in ('OPEN', 'PROCESSING', 'SUCCEEDED', 'SUPERSEDED', 'CANCELLED', 'EXPIRED')`,
    ),
    check(
      "payments_succeeded_state_check",
      sql`(${table.status} = 'SUCCEEDED' and ${table.succeededAt} is not null)
        or (${table.status} <> 'SUCCEEDED' and ${table.succeededAt} is null)`,
    ),
    check(
      "payments_cancelled_state_check",
      sql`(${table.status} = 'CANCELLED' and ${table.cancelledAt} is not null)
        or (${table.status} <> 'CANCELLED' and ${table.cancelledAt} is null)`,
    ),
    check(
      "payments_expired_state_check",
      sql`(${table.status} = 'EXPIRED' and ${table.expiredAt} is not null)
        or (${table.status} <> 'EXPIRED' and ${table.expiredAt} is null)`,
    ),
    check(
      "payments_superseded_state_check",
      sql`(${table.status} = 'SUPERSEDED' and ${table.supersededAt} is not null)
        or (${table.status} <> 'SUPERSEDED' and ${table.supersededAt} is null)`,
    ),
    check(
      "payments_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
  ],
);

export const paymentAttemptsTable = appSchema.table(
  "payment_attempts",
  {
    id: uuid("id").primaryKey(),
    paymentId: uuid("payment_id").notNull(),
    attemptOrdinal: bigint("attempt_ordinal", { mode: "bigint" }).notNull(),
    provider: text("provider").notNull(),
    methodIntent: text("method_intent").notNull(),
    providerExecutionIdentity: text("provider_execution_identity").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    pendingAt: timestamp("pending_at", { withTimezone: true }),
    indeterminateAt: timestamp("indeterminate_at", { withTimezone: true }),
    succeededAt: timestamp("succeeded_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "payment_attempts_payment_fk",
      columns: [table.paymentId],
      foreignColumns: [paymentsTable.id],
    }).onDelete("restrict"),
    uniqueIndex("payment_attempts_id_payment_id_uidx").on(table.id, table.paymentId),
    uniqueIndex("payment_attempts_payment_ordinal_uidx").on(
      table.paymentId,
      table.attemptOrdinal,
    ),
    uniqueIndex("payment_attempts_provider_execution_identity_uidx").on(
      table.providerExecutionIdentity,
    ),
    uniqueIndex("payment_attempts_one_unresolved_uidx")
      .on(table.paymentId)
      .where(sql`${table.status} in ('CREATED', 'PENDING', 'INDETERMINATE')`),
    check(
      "payment_attempts_ordinal_positive_check",
      sql`${table.attemptOrdinal} > 0`,
    ),
    check(
      "payment_attempts_provider_nonempty_check",
      sql`length(trim(${table.provider})) > 0`,
    ),
    check(
      "payment_attempts_method_intent_nonempty_check",
      sql`length(trim(${table.methodIntent})) > 0`,
    ),
    check(
      "payment_attempts_provider_execution_identity_nonempty_check",
      sql`length(trim(${table.providerExecutionIdentity})) > 0`,
    ),
    check(
      "payment_attempts_status_check",
      sql`${table.status} in ('CREATED', 'PENDING', 'INDETERMINATE', 'SUCCEEDED', 'FAILED', 'CANCELLED')`,
    ),
    check(
      "payment_attempts_succeeded_state_check",
      sql`(${table.status} = 'SUCCEEDED' and ${table.succeededAt} is not null)
        or (${table.status} <> 'SUCCEEDED' and ${table.succeededAt} is null)`,
    ),
    check(
      "payment_attempts_failed_state_check",
      sql`(${table.status} = 'FAILED' and ${table.failedAt} is not null)
        or (${table.status} <> 'FAILED' and ${table.failedAt} is null)`,
    ),
    check(
      "payment_attempts_cancelled_state_check",
      sql`(${table.status} = 'CANCELLED' and ${table.cancelledAt} is not null)
        or (${table.status} <> 'CANCELLED' and ${table.cancelledAt} is null)`,
    ),
    check(
      "payment_attempts_pending_state_check",
      sql`(${table.status} = 'PENDING' and ${table.pendingAt} is not null)
        or (${table.status} <> 'PENDING')`,
    ),
    check(
      "payment_attempts_indeterminate_state_check",
      sql`(${table.status} = 'INDETERMINATE' and ${table.indeterminateAt} is not null)
        or (${table.status} <> 'INDETERMINATE')`,
    ),
    check(
      "payment_attempts_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
  ],
);

/**
 * PAY-333: provider references may be Payment-level (attempt_id NULL) or
 * Attempt-level (attempt_id set). Attempt-scoped rows must belong to the same
 * Payment via the composite FK (MATCH SIMPLE skips when attempt_id is NULL).
 */
export const paymentProviderReferencesTable = appSchema.table(
  "payment_provider_references",
  {
    id: uuid("id").primaryKey(),
    paymentId: uuid("payment_id").notNull(),
    attemptId: uuid("attempt_id"),
    provider: text("provider").notNull(),
    referenceKind: text("reference_kind").notNull(),
    referenceValue: text("reference_value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "payment_provider_references_payment_fk",
      columns: [table.paymentId],
      foreignColumns: [paymentsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "payment_provider_references_attempt_ownership_fk",
      columns: [table.attemptId, table.paymentId],
      foreignColumns: [
        paymentAttemptsIdColumn(),
        paymentAttemptsPaymentIdColumn(),
      ],
    }).onDelete("restrict"),
    uniqueIndex("payment_provider_references_provider_kind_value_uidx").on(
      table.provider,
      table.referenceKind,
      table.referenceValue,
    ),
    index("payment_provider_references_payment_idx").on(table.paymentId),
    index("payment_provider_references_attempt_idx").on(table.attemptId),
    check(
      "payment_provider_references_provider_nonempty_check",
      sql`length(trim(${table.provider})) > 0`,
    ),
    check(
      "payment_provider_references_kind_nonempty_check",
      sql`length(trim(${table.referenceKind})) > 0`,
    ),
    check(
      "payment_provider_references_value_nonempty_check",
      sql`length(trim(${table.referenceValue})) > 0`,
    ),
  ],
);

export const paymentInitiationIdempotencyTable = appSchema.table(
  "payment_initiation_idempotency",
  {
    id: uuid("id").primaryKey(),
    customerAuthUserId: text("customer_auth_user_id").notNull(),
    operationKind: text("operation_kind").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    paymentId: uuid("payment_id"),
    paymentAttemptId: uuid("payment_attempt_id"),
    checkoutId: uuid("checkout_id"),
    zeroPayableCheckoutId: uuid("zero_payable_checkout_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "payment_initiation_idempotency_customer_fk",
      columns: [table.customerAuthUserId],
      foreignColumns: [customerAuthUsers.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "payment_initiation_idempotency_payment_fk",
      columns: [table.paymentId],
      foreignColumns: [paymentsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "payment_initiation_idempotency_attempt_ownership_fk",
      columns: [table.paymentAttemptId, table.paymentId],
      foreignColumns: [
        paymentAttemptsIdColumn(),
        paymentAttemptsPaymentIdColumn(),
      ],
    }).onDelete("restrict"),
    uniqueIndex("payment_initiation_idempotency_scope_uidx").on(
      table.customerAuthUserId,
      table.operationKind,
      table.idempotencyKey,
    ),
    check(
      "payment_initiation_idempotency_operation_kind_check",
      sql`${table.operationKind} in ('start_payment', 'retry_payment', 'complete_zero_payable')`,
    ),
    check(
      "payment_initiation_idempotency_key_nonempty_check",
      sql`length(trim(${table.idempotencyKey})) > 0`,
    ),
    check(
      "payment_initiation_idempotency_fingerprint_sha256_check",
      sql`${table.requestFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "payment_initiation_idempotency_result_shape_check",
      sql`(
        ${table.zeroPayableCheckoutId} is not null
        and ${table.paymentId} is null
        and ${table.paymentAttemptId} is null
      ) or (
        ${table.zeroPayableCheckoutId} is null
        and (
          (${table.paymentId} is null and ${table.paymentAttemptId} is null)
          or (${table.paymentId} is not null and ${table.paymentAttemptId} is not null)
        )
      )`,
    ),
  ],
);

export const paymentProviderObservationsTable = appSchema.table(
  "payment_provider_observations",
  {
    id: uuid("id").primaryKey(),
    attemptId: uuid("attempt_id").notNull(),
    observationSource: text("observation_source").notNull(),
    provider: text("provider").notNull(),
    providerEventId: text("provider_event_id"),
    normalizedOutcome: text("normalized_outcome").notNull(),
    observedAmountPaise: paise("observed_amount_paise"),
    observedCurrency: text("observed_currency"),
    providerStatusCode: text("provider_status_code"),
    providerTimestamp: timestamp("provider_timestamp", { withTimezone: true }),
    payloadDigest: text("payload_digest"),
    reconciliationAnomaly: text("reconciliation_anomaly"),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "payment_provider_observations_attempt_fk",
      columns: [table.attemptId],
      foreignColumns: [paymentAttemptsTable.id],
    }).onDelete("restrict"),
    uniqueIndex("payment_provider_observations_provider_event_uidx")
      .on(table.provider, table.providerEventId)
      .where(sql`${table.providerEventId} is not null`),
    index("payment_provider_observations_attempt_idx").on(table.attemptId),
    check(
      "payment_provider_observations_source_check",
      sql`${table.observationSource} in ('sync', 'webhook', 'query', 'reconciliation')`,
    ),
    check(
      "payment_provider_observations_outcome_check",
      sql`${table.normalizedOutcome} in (
        'CLIENT_ACTION_REQUIRED',
        'PENDING',
        'SUCCEEDED',
        'DEFINITIVE_FAILURE',
        'DEFINITIVE_CANCELLED',
        'INDETERMINATE',
        'UNSUPPORTED',
        'ANOMALY'
      )`,
    ),
    check(
      "payment_provider_observations_currency_check",
      sql`${table.observedCurrency} is null or length(trim(${table.observedCurrency})) > 0`,
    ),
    check(
      "payment_provider_observations_amount_positive_check",
      sql`${table.observedAmountPaise} is null or ${table.observedAmountPaise} > 0`,
    ),
    check(
      "payment_provider_observations_payload_digest_check",
      sql`${table.payloadDigest} is null or ${table.payloadDigest} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);

/** Lazy accessors used by promotion_redemption_claims composite FKs. */
export function paymentIdForClaimsColumn(): AnyPgColumn {
  return paymentsIdColumn();
}
export function paymentCheckoutSnapshotIdForClaimsColumn(): AnyPgColumn {
  return paymentsCheckoutSnapshotIdColumn();
}
export function paymentAttemptIdForClaimsColumn(): AnyPgColumn {
  return paymentAttemptsIdColumn();
}
export function paymentAttemptPaymentIdForClaimsColumn(): AnyPgColumn {
  return paymentAttemptsPaymentIdColumn();
}
