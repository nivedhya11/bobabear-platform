/**
 * PostgreSQL single-use Turnstile token redemption ledger (IMP-038).
 *
 * Persists only sha256(token) hex digests — never raw tokens or IPs.
 */
import "server-only";

import { createHash } from "node:crypto";

import { sql } from "drizzle-orm";

import { turnstileTokenRedemptionsTable } from "../../../platform/database/schema/turnstile-token-redemptions";
import { isTransactionContext } from "../../persistence/context-kind";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../../persistence/types";
import {
  TURNSTILE_TOKEN_TTL_SECONDS,
  TurnstileServiceError,
  type TurnstileVerifyFailureReason,
} from "./types";

export type TurnstileRedemptionClaimResult =
  | Readonly<{ claimed: true; tokenHash: string }>
  | Readonly<{ claimed: false; reason: Extract<TurnstileVerifyFailureReason, "token_replay"> }>;

function assertApplicationRole(context: { readonly role: string }, operation: string): void {
  if (context.role !== "application") {
    throw new TurnstileServiceError({
      message: `${operation} requires an application-role persistence context.`,
      code: "TURNSTILE_REDEMPTION_ROLE_INVALID",
      httpStatus: 500,
    });
  }
}

function assertValidNow(now: Date): void {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TurnstileServiceError({
      message: "Turnstile redemption now timestamp is invalid.",
      code: "TURNSTILE_REDEMPTION_TIME_INVALID",
      httpStatus: 500,
    });
  }
}

export function hashTurnstileToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * Claim a token hash for single-use redemption. Inserts a failure-row first;
 * callers update the outcome after siteverify. Conflict ⇒ replay.
 */
export async function claimTurnstileTokenRedemption(
  transactionContext: PersistenceTransactionContext,
  input: Readonly<{
    token: string;
    now: Date;
  }>,
): Promise<TurnstileRedemptionClaimResult> {
  assertApplicationRole(transactionContext, "claimTurnstileTokenRedemption");
  if (!isTransactionContext(transactionContext)) {
    throw new TurnstileServiceError({
      message: "claimTurnstileTokenRedemption requires a persistence transaction context.",
      code: "TURNSTILE_REDEMPTION_CONTEXT_INVALID",
      httpStatus: 500,
    });
  }
  assertValidNow(input.now);

  const tokenHash = hashTurnstileToken(input.token);
  const expiresAt = new Date(
    input.now.getTime() + TURNSTILE_TOKEN_TTL_SECONDS * 1000,
  );
  const t = turnstileTokenRedemptionsTable;

  const rows = await transactionContext.db.execute<{ token_hash: string }>(sql`
    insert into ${t} (
      token_hash,
      redeemed_at,
      expires_at,
      outcome
    ) values (
      ${tokenHash},
      ${input.now},
      ${expiresAt},
      'failure'
    )
    on conflict (token_hash) do nothing
    returning ${t.tokenHash} as token_hash
  `);

  if (!rows.rows[0]) {
    return Object.freeze({ claimed: false, reason: "token_replay" as const });
  }

  return Object.freeze({ claimed: true, tokenHash });
}

export async function markTurnstileTokenRedemptionOutcome(
  transactionContext: PersistenceTransactionContext,
  input: Readonly<{
    tokenHash: string;
    outcome: "success" | "failure";
    now: Date;
  }>,
): Promise<void> {
  assertApplicationRole(transactionContext, "markTurnstileTokenRedemptionOutcome");
  if (!isTransactionContext(transactionContext)) {
    throw new TurnstileServiceError({
      message:
        "markTurnstileTokenRedemptionOutcome requires a persistence transaction context.",
      code: "TURNSTILE_REDEMPTION_CONTEXT_INVALID",
      httpStatus: 500,
    });
  }
  if (!/^[0-9a-f]{64}$/.test(input.tokenHash)) {
    throw new TurnstileServiceError({
      message: "Turnstile token hash is invalid.",
      code: "TURNSTILE_REDEMPTION_HASH_INVALID",
      httpStatus: 500,
    });
  }
  assertValidNow(input.now);

  const t = turnstileTokenRedemptionsTable;
  await transactionContext.db.execute(sql`
    update ${t}
    set outcome = ${input.outcome}
    where ${t.tokenHash} = ${input.tokenHash}
  `);
}

export async function deleteExpiredTurnstileTokenRedemptions(
  queryContext: PersistenceQueryContext,
  cutoff: Date,
  limit: number,
): Promise<{ readonly deleted: number }> {
  assertApplicationRole(queryContext, "deleteExpiredTurnstileTokenRedemptions");
  assertValidNow(cutoff);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new TurnstileServiceError({
      message: "Cleanup limit must be an integer between 1 and 500.",
      code: "TURNSTILE_REDEMPTION_CLEANUP_LIMIT_INVALID",
      httpStatus: 500,
    });
  }

  const t = turnstileTokenRedemptionsTable;
  const result = await queryContext.db.execute(sql`
    with victims as (
      select token_hash
      from ${t}
      where expires_at < ${cutoff}
      order by expires_at asc, token_hash asc
      limit ${limit}
    )
    delete from ${t} as target
    using victims
    where target.token_hash = victims.token_hash
  `);

  return { deleted: result.rowCount ?? 0 };
}
