/**
 * Drizzle schema for `app.workforce_auth_rate_limits` (IMP-010).
 *
 * Technical rate-limit counters only. Never stores raw email, raw IP,
 * password, TOTP, backup code, session token, cookie, or user ID.
 */
import { sql } from "drizzle-orm";
import { check, integer, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

import { appSchema } from "./index";

export const workforceAuthRateLimitsTable = appSchema.table(
  "workforce_auth_rate_limits",
  {
    scope: text("scope").notNull(),
    keyHash: text("key_hash").notNull(),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
    windowSeconds: integer("window_seconds").notNull(),
    requestCount: integer("request_count").notNull(),
    blockedUntil: timestamp("blocked_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.scope, table.keyHash], name: "workforce_auth_rate_limits_pkey" }),
    check(
      "workforce_auth_rate_limits_key_hash_hex_check",
      sql`${table.keyHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "workforce_auth_rate_limits_window_seconds_positive_check",
      sql`${table.windowSeconds} > 0`,
    ),
    check(
      "workforce_auth_rate_limits_request_count_non_negative_check",
      sql`${table.requestCount} >= 0`,
    ),
    check(
      "workforce_auth_rate_limits_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    check(
      "workforce_auth_rate_limits_blocked_until_check",
      sql`${table.blockedUntil} is null or ${table.blockedUntil} >= ${table.windowStartedAt}`,
    ),
    check(
      "workforce_auth_rate_limits_scope_check",
      sql`${table.scope} in (
        'workforce_sign_in_email_15m',
        'workforce_sign_in_ip_10m',
        'workforce_mfa_ip_10m',
        'workforce_security_change_ip_10m'
      )`,
    ),
  ],
);
