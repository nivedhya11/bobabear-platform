/**
 * Durable workforce-auth rate-limit store (IMP-010).
 *
 * Atomic PostgreSQL upserts via an application-role transaction context.
 * Never acquires a pool, never uses migration credentials, never stores
 * raw email or IP values.
 */
import "server-only";

import { sql } from "drizzle-orm";

import { workforceAuthRateLimitsTable } from "../../../platform/database/schema/workforce-auth-rate-limits";
import { isTransactionContext } from "../../persistence/context-kind";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../../persistence/types";
import { WorkforceAuthServiceError } from "../errors";
import {
  WORKFORCE_AUTH_RATE_LIMIT_CLEANUP_MAX,
  WORKFORCE_AUTH_RATE_LIMIT_RULES,
  type WorkforceAuthRateLimitOutcome,
  type WorkforceAuthRateLimitRule,
  type WorkforceAuthRateLimitScope,
} from "./types";

function assertApplicationRole(context: { readonly role: string }, operation: string): void {
  if (context.role !== "application") {
    throw new WorkforceAuthServiceError({
      message: `${operation} requires an application-role persistence context.`,
      code: "WORKFORCE_AUTH_RATE_LIMIT_ROLE_INVALID",
      httpStatus: 500,
    });
  }
}

function assertValidRule(rule: WorkforceAuthRateLimitRule): void {
  const locked = WORKFORCE_AUTH_RATE_LIMIT_RULES[rule.scope];
  if (
    !locked ||
    locked.windowSeconds !== rule.windowSeconds ||
    locked.maximumRequests !== rule.maximumRequests
  ) {
    throw new WorkforceAuthServiceError({
      message: "Workforce auth rate-limit rule thresholds are locked.",
      code: "WORKFORCE_AUTH_RATE_LIMIT_RULE_INVALID",
      httpStatus: 500,
    });
  }
}

function assertValidNow(now: Date): void {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new WorkforceAuthServiceError({
      message: "Workforce auth rate-limit now timestamp is invalid.",
      code: "WORKFORCE_AUTH_RATE_LIMIT_TIME_INVALID",
      httpStatus: 500,
    });
  }
}

function assertKeyHash(keyHash: string): void {
  if (!/^[0-9a-f]{64}$/.test(keyHash)) {
    throw new WorkforceAuthServiceError({
      message: "Workforce auth rate-limit key hash is invalid.",
      code: "WORKFORCE_AUTH_RATE_LIMIT_KEY_INVALID",
      httpStatus: 500,
    });
  }
}

interface ConsumeRow extends Record<string, unknown> {
  request_count: number;
  window_started_at: Date;
  window_seconds: number;
  maximum_requests: number;
}

/**
 * Atomically consume one request against a single durable rate-limit rule.
 * Always records the attempt (increments) even when the outcome is limited.
 */
export async function consumeWorkforceAuthRateLimit(
  transactionContext: PersistenceTransactionContext,
  input: Readonly<{
    rule: WorkforceAuthRateLimitRule;
    keyHash: string;
    now: Date;
  }>,
): Promise<WorkforceAuthRateLimitOutcome> {
  assertApplicationRole(transactionContext, "consumeWorkforceAuthRateLimit");
  if (!isTransactionContext(transactionContext)) {
    throw new WorkforceAuthServiceError({
      message: "consumeWorkforceAuthRateLimit requires a persistence transaction context.",
      code: "WORKFORCE_AUTH_RATE_LIMIT_CONTEXT_INVALID",
      httpStatus: 500,
    });
  }
  assertValidRule(input.rule);
  assertKeyHash(input.keyHash);
  assertValidNow(input.now);

  const { rule, keyHash, now } = input;
  const t = workforceAuthRateLimitsTable;

  const rows = await transactionContext.db.execute<ConsumeRow>(sql`
    with upserted as (
      insert into ${t} (
        scope,
        key_hash,
        window_started_at,
        window_seconds,
        request_count,
        blocked_until,
        created_at,
        updated_at
      ) values (
        ${rule.scope},
        ${keyHash},
        ${now},
        ${rule.windowSeconds},
        1,
        null,
        ${now},
        ${now}
      )
      on conflict (scope, key_hash) do update set
        window_started_at = case
          when ${t.windowStartedAt} + make_interval(secs => ${t.windowSeconds}) <= excluded.window_started_at
            then excluded.window_started_at
          else ${t.windowStartedAt}
        end,
        window_seconds = excluded.window_seconds,
        request_count = case
          when ${t.windowStartedAt} + make_interval(secs => ${t.windowSeconds}) <= excluded.window_started_at
            then 1
          else ${t.requestCount} + 1
        end,
        blocked_until = case
          when ${t.windowStartedAt} + make_interval(secs => ${t.windowSeconds}) <= excluded.window_started_at
            then null
          when ${t.requestCount} + 1 > ${rule.maximumRequests}
            then ${t.windowStartedAt} + make_interval(secs => ${t.windowSeconds})
          else ${t.blockedUntil}
        end,
        updated_at = excluded.updated_at
      returning
        ${t.requestCount} as request_count,
        ${t.windowStartedAt} as window_started_at,
        ${t.windowSeconds} as window_seconds
    )
    select
      request_count,
      window_started_at,
      window_seconds,
      ${rule.maximumRequests}::integer as maximum_requests
    from upserted
  `);

  const row = rows.rows[0];
  if (!row) {
    throw new WorkforceAuthServiceError({
      message: "Workforce auth rate-limit consume returned no row.",
      code: "WORKFORCE_AUTH_RATE_LIMIT_CONSUME_FAILED",
      httpStatus: 500,
    });
  }

  const requestCount = Number(row.request_count);
  const windowStartedAt = new Date(row.window_started_at);
  const windowSeconds = Number(row.window_seconds);
  const maximumRequests = Number(row.maximum_requests);

  if (requestCount > maximumRequests) {
    const windowEndsAtMs = windowStartedAt.getTime() + windowSeconds * 1000;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowEndsAtMs - now.getTime()) / 1000),
    );
    return { outcome: "limited", retryAfterSeconds };
  }

  return {
    outcome: "allowed",
    remaining: Math.max(0, maximumRequests - requestCount),
  };
}

/**
 * Consume multiple rate-limit rules in one transaction. Every applicable
 * counter records the attempt; the returned retry interval is the maximum
 * among limited outcomes.
 */
export async function consumeWorkforceAuthRateLimits(
  transactionContext: PersistenceTransactionContext,
  input: Readonly<{
    rules: readonly WorkforceAuthRateLimitRule[];
    keyHashes: Readonly<Partial<Record<WorkforceAuthRateLimitScope, string>>>;
    now: Date;
  }>,
): Promise<WorkforceAuthRateLimitOutcome> {
  let limitedRetryAfter = 0;
  let allowedRemaining = Number.POSITIVE_INFINITY;

  for (const rule of input.rules) {
    const keyHash = input.keyHashes[rule.scope];
    if (typeof keyHash !== "string") {
      throw new WorkforceAuthServiceError({
        message: "Workforce auth rate-limit key hash is missing for a requested scope.",
        code: "WORKFORCE_AUTH_RATE_LIMIT_KEY_INVALID",
        httpStatus: 500,
      });
    }
    const outcome = await consumeWorkforceAuthRateLimit(transactionContext, {
      rule,
      keyHash,
      now: input.now,
    });
    if (outcome.outcome === "limited") {
      limitedRetryAfter = Math.max(limitedRetryAfter, outcome.retryAfterSeconds);
    } else {
      allowedRemaining = Math.min(allowedRemaining, outcome.remaining);
    }
  }

  if (limitedRetryAfter > 0) {
    return { outcome: "limited", retryAfterSeconds: limitedRetryAfter };
  }

  return {
    outcome: "allowed",
    remaining:
      allowedRemaining === Number.POSITIVE_INFINITY ? 0 : allowedRemaining,
  };
}

export async function deleteExpiredWorkforceAuthRateLimits(
  queryContext: PersistenceQueryContext,
  cutoff: Date,
  limit: number,
): Promise<{ readonly deleted: number }> {
  assertApplicationRole(queryContext, "deleteExpiredWorkforceAuthRateLimits");
  assertValidNow(cutoff);
  if (!Number.isInteger(limit) || limit < 1 || limit > WORKFORCE_AUTH_RATE_LIMIT_CLEANUP_MAX) {
    throw new WorkforceAuthServiceError({
      message: `Cleanup limit must be an integer between 1 and ${WORKFORCE_AUTH_RATE_LIMIT_CLEANUP_MAX}.`,
      code: "WORKFORCE_AUTH_RATE_LIMIT_CLEANUP_LIMIT_INVALID",
      httpStatus: 500,
    });
  }

  const t = workforceAuthRateLimitsTable;
  const result = await queryContext.db.execute(sql`
    with victims as (
      select scope, key_hash
      from ${t}
      where window_started_at + make_interval(secs => window_seconds) < ${cutoff}
      order by window_started_at asc, scope asc, key_hash asc
      limit ${limit}
    )
    delete from ${t} as target
    using victims
    where target.scope = victims.scope
      and target.key_hash = victims.key_hash
  `);

  return { deleted: result.rowCount ?? 0 };
}
