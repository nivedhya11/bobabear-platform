/**
 * Drizzle schema for `app.customer_otp_rate_limits` (IMP-009).
 *
 * Technical rate-limit counters only. Never stores raw phone, raw IP, OTP,
 * session token, cookie, temporary email, user ID, or provider responses.
 */
import { sql } from "drizzle-orm";
import { check, integer, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

import { appSchema } from "./index";

export const customerOtpRateLimitsTable = appSchema.table(
  "customer_otp_rate_limits",
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
    primaryKey({ columns: [table.scope, table.keyHash], name: "customer_otp_rate_limits_pkey" }),
    check(
      "customer_otp_rate_limits_key_hash_hex_check",
      sql`${table.keyHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "customer_otp_rate_limits_window_seconds_positive_check",
      sql`${table.windowSeconds} > 0`,
    ),
    check(
      "customer_otp_rate_limits_request_count_non_negative_check",
      sql`${table.requestCount} >= 0`,
    ),
    check(
      "customer_otp_rate_limits_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    check(
      "customer_otp_rate_limits_blocked_until_check",
      sql`${table.blockedUntil} is null or ${table.blockedUntil} >= ${table.windowStartedAt}`,
    ),
    check(
      "customer_otp_rate_limits_scope_check",
      sql`${table.scope} in (
        'otp_send_phone_60s',
        'otp_send_phone_1h',
        'otp_send_ip_10m',
        'otp_verify_ip_10m'
      )`,
    ),
  ],
);
