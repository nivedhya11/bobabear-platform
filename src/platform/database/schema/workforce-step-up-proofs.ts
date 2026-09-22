/**
 * Drizzle schema for workforce step-up proofs (IMP-038 / D-375 / ADR-004 § step-up).
 *
 * Short-lived, session-bound, single-use proofs for high-consequence actions.
 * Never stores raw session tokens, passwords, or TOTP codes.
 */
import { sql } from "drizzle-orm";
import { check, index, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appSchema } from "./index";
import { workforceAuthUsers } from "./workforce-auth";

export const WORKFORCE_STEP_UP_ACTION_CLASS_VALUES = [
  "CLASS_ACCESS_MUTATION",
  "CLASS_CREDENTIAL_SECURITY",
  "CLASS_PRIVACY_DESTRUCTIVE",
  "CLASS_FINANCIAL_REVERSAL",
] as const;

export const WORKFORCE_STEP_UP_GRANT_METHOD_VALUES = [
  "totp",
  "password",
  "password_and_totp",
] as const;

export const WORKFORCE_STEP_UP_AUDIT_EVENT_TYPE_VALUES = [
  "grant",
  "consume",
  "deny",
] as const;

export const workforceStepUpProofsTable = appSchema.table(
  "workforce_step_up_proofs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    sessionTokenHash: text("session_token_hash").notNull(),
    workforceUserId: text("workforce_user_id")
      .notNull()
      .references(() => workforceAuthUsers.id, { onDelete: "cascade" }),
    actionClass: text("action_class").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    grantMethod: text("grant_method").notNull(),
  },
  (table) => [
    check(
      "workforce_step_up_proofs_session_token_hash_hex_check",
      sql`${table.sessionTokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "workforce_step_up_proofs_action_class_check",
      sql`${table.actionClass} in (
        'CLASS_ACCESS_MUTATION',
        'CLASS_CREDENTIAL_SECURITY',
        'CLASS_PRIVACY_DESTRUCTIVE',
        'CLASS_FINANCIAL_REVERSAL'
      )`,
    ),
    check(
      "workforce_step_up_proofs_grant_method_check",
      sql`${table.grantMethod} in ('totp', 'password', 'password_and_totp')`,
    ),
    check(
      "workforce_step_up_proofs_expires_after_created_check",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    check(
      "workforce_step_up_proofs_consumed_after_created_check",
      sql`${table.consumedAt} is null or ${table.consumedAt} >= ${table.createdAt}`,
    ),
    index("workforce_step_up_proofs_session_class_expires_idx").on(
      table.sessionTokenHash,
      table.actionClass,
      table.expiresAt,
    ),
    index("workforce_step_up_proofs_expires_at_idx").on(table.expiresAt),
  ],
);

export const workforceStepUpAuditEventsTable = appSchema.table(
  "workforce_step_up_audit_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    eventType: text("event_type").notNull(),
    proofId: uuid("proof_id"),
    actionClass: text("action_class").notNull(),
    workforceUserId: text("workforce_user_id").notNull(),
    sessionTokenHash: text("session_token_hash").notNull(),
    reasonCode: text("reason_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check(
      "workforce_step_up_audit_events_event_type_check",
      sql`${table.eventType} in ('grant', 'consume', 'deny')`,
    ),
    check(
      "workforce_step_up_audit_events_action_class_check",
      sql`${table.actionClass} in (
        'CLASS_ACCESS_MUTATION',
        'CLASS_CREDENTIAL_SECURITY',
        'CLASS_PRIVACY_DESTRUCTIVE',
        'CLASS_FINANCIAL_REVERSAL'
      )`,
    ),
    check(
      "workforce_step_up_audit_events_session_token_hash_hex_check",
      sql`${table.sessionTokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    index("workforce_step_up_audit_events_created_at_idx").on(table.createdAt),
    index("workforce_step_up_audit_events_user_created_idx").on(
      table.workforceUserId,
      table.createdAt,
    ),
  ],
);
