/**
 * Durable workforce-auth rate-limit store (IMP-010 / IMP-038).
 *
 * Atomic PostgreSQL upserts via an application-role transaction context.
 * Never acquires a pool, never uses migration credentials, never stores
 * raw email or IP values. Progressive cooldown is temporary only —
 * permanent attacker-triggered lockout is forbidden.
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
  escalateProgressiveCooldown,
  retryAfterSecondsFrom,
} from "./progressive";
import {
  WORKFORCE_AUTH_PROGRESSIVE_COOLDOWN_LADDER_SECONDS,
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

interface ExistingRow extends Record<string, unknown> {
  scope: string;
  key_hash: string;
  window_started_at: Date;
  window_seconds: number;
  request_count: number;
  blocked_until: Date | null;
  violation_count: number;
  challenge_required_until: Date | null;
}

/**
 * Atomically consume one request against a single durable rate-limit rule.
 * Always records the attempt (increments) even when the outcome is limited,
 * except when already inside an active temporary cooldown.
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

  const existingRows = await transactionContext.db.execute<ExistingRow>(sql`
    select
      scope,
      key_hash,
      window_started_at,
      window_seconds,
      request_count,
      blocked_until,
      violation_count,
      challenge_required_until
    from ${t}
    where scope = ${rule.scope}
      and key_hash = ${keyHash}
    for update
  `);

  const existing = existingRows.rows[0] ?? null;

  if (existing?.blocked_until) {
    const blockedUntil = new Date(existing.blocked_until);
    if (blockedUntil.getTime() > now.getTime()) {
      const challengeUntil = existing.challenge_required_until
        ? new Date(existing.challenge_required_until)
        : null;
      return {
        outcome: "limited",
        retryAfterSeconds: retryAfterSecondsFrom(blockedUntil, now),
        challengeRequired: challengeUntil !== null && challengeUntil.getTime() > now.getTime(),
      };
    }
  }

  const windowExpired =
    !existing ||
    new Date(existing.window_started_at).getTime() + Number(existing.window_seconds) * 1000 <=
      now.getTime();

  const windowStartedAt = windowExpired ? now : new Date(existing!.window_started_at);
  const requestCount = windowExpired ? 1 : Number(existing!.request_count) + 1;
  let violationCount = windowExpired ? 0 : Number(existing!.violation_count ?? 0);
  let blockedUntil: Date | null = null;
  let challengeRequiredUntil: Date | null =
    !windowExpired && existing?.challenge_required_until
      ? new Date(existing.challenge_required_until)
      : null;

  if (challengeRequiredUntil && challengeRequiredUntil.getTime() <= now.getTime()) {
    challengeRequiredUntil = null;
  }

  const limited = requestCount > rule.maximumRequests;
  if (limited) {
    const windowEndsAt = new Date(windowStartedAt.getTime() + rule.windowSeconds * 1000);
    const escalated = escalateProgressiveCooldown({
      ladderSeconds: WORKFORCE_AUTH_PROGRESSIVE_COOLDOWN_LADDER_SECONDS,
      previousViolationCount: violationCount,
      now,
      windowEndsAt,
    });
    violationCount = escalated.violationCount;
    blockedUntil = escalated.blockedUntil;
    challengeRequiredUntil = escalated.challengeRequiredUntil;
  }

  await transactionContext.db.execute(sql`
    insert into ${t} (
      scope,
      key_hash,
      window_started_at,
      window_seconds,
      request_count,
      blocked_until,
      violation_count,
      challenge_required_until,
      created_at,
      updated_at
    ) values (
      ${rule.scope},
      ${keyHash},
      ${windowStartedAt},
      ${rule.windowSeconds},
      ${requestCount},
      ${blockedUntil},
      ${violationCount},
      ${challengeRequiredUntil},
      ${now},
      ${now}
    )
    on conflict (scope, key_hash) do update set
      window_started_at = excluded.window_started_at,
      window_seconds = excluded.window_seconds,
      request_count = excluded.request_count,
      blocked_until = excluded.blocked_until,
      violation_count = excluded.violation_count,
      challenge_required_until = excluded.challenge_required_until,
      updated_at = excluded.updated_at
  `);

  if (limited && blockedUntil) {
    return {
      outcome: "limited",
      retryAfterSeconds: retryAfterSecondsFrom(blockedUntil, now),
      challengeRequired: true,
    };
  }

  return {
    outcome: "allowed",
    remaining: Math.max(0, rule.maximumRequests - requestCount),
    challengeRequired:
      challengeRequiredUntil !== null && challengeRequiredUntil.getTime() > now.getTime(),
  };
}

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
  let challengeRequired = false;

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
    challengeRequired = challengeRequired || outcome.challengeRequired;
    if (outcome.outcome === "limited") {
      limitedRetryAfter = Math.max(limitedRetryAfter, outcome.retryAfterSeconds);
    } else {
      allowedRemaining = Math.min(allowedRemaining, outcome.remaining);
    }
  }

  if (limitedRetryAfter > 0) {
    return { outcome: "limited", retryAfterSeconds: limitedRetryAfter, challengeRequired };
  }

  return {
    outcome: "allowed",
    remaining: allowedRemaining === Number.POSITIVE_INFINITY ? 0 : allowedRemaining,
    challengeRequired,
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
        and (blocked_until is null or blocked_until < ${cutoff})
        and (challenge_required_until is null or challenge_required_until < ${cutoff})
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
