/**
 * Drizzle schema for `app.turnstile_token_redemptions` (IMP-038).
 *
 * Single-use Turnstile token ledger. Persists only sha256(token) hex digests —
 * never raw tokens, IPs, or PII.
 */
import { sql } from "drizzle-orm";
import { check, index, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

import { appSchema } from "./index";

export const TURNSTILE_TOKEN_REDEMPTION_OUTCOMES = ["success", "failure"] as const;

export type TurnstileTokenRedemptionOutcome =
  (typeof TURNSTILE_TOKEN_REDEMPTION_OUTCOMES)[number];

export const turnstileTokenRedemptionsTable = appSchema.table(
  "turnstile_token_redemptions",
  {
    tokenHash: text("token_hash").notNull(),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    outcome: text("outcome").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.tokenHash],
      name: "turnstile_token_redemptions_pkey",
    }),
    check(
      "turnstile_token_redemptions_token_hash_hex_check",
      sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "turnstile_token_redemptions_outcome_check",
      sql`${table.outcome} in ('success', 'failure')`,
    ),
    check(
      "turnstile_token_redemptions_expires_at_after_redeemed_at_check",
      sql`${table.expiresAt} >= ${table.redeemedAt}`,
    ),
    index("turnstile_token_redemptions_expires_at_idx").on(table.expiresAt),
  ],
);
