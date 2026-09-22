/**
 * Durable customer OTP rate-limit store (IMP-009 / IMP-038).
 *
 * Atomic PostgreSQL upserts via an application-role transaction context.
 * Never acquires a pool, never uses migration credentials, never stores
 * raw phone or IP values. Progressive cooldown is temporary only.
 */
import "server-only";

import { sql } from "drizzle-orm";

import { customerOtpRateLimitsTable } from "../../../platform/database/schema/customer-otp-rate-limits";
import { isTransactionContext } from "../../persistence/context-kind";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../../persistence/types";
import { CustomerAuthServiceError } from "../errors";
import {
  escalateProgressiveCooldown,
  retryAfterSecondsFrom,
} from "./progressive";
import {
  CUSTOMER_OTP_PROGRESSIVE_COOLDOWN_LADDER_SECONDS,
  CUSTOMER_OTP_RATE_LIMIT_CLEANUP_MAX,
  CUSTOMER_OTP_RATE_LIMIT_RULES,
  type CustomerOtpRateLimitOutcome,
  type CustomerOtpRateLimitRule,
  type CustomerOtpRateLimitScope,
} from "./types";

function assertApplicationRole(context: { readonly role: string }, operation: string): void {
  if (context.role !== "application") {
    throw new CustomerAuthServiceError({
      message: `${operation} requires an application-role persistence context.`,
      code: "CUSTOMER_OTP_RATE_LIMIT_ROLE_INVALID",
      httpStatus: 500,
    });
  }
}

function assertValidRule(rule: CustomerOtpRateLimitRule): void {
  const locked = CUSTOMER_OTP_RATE_LIMIT_RULES[rule.scope];
  if (
    !locked ||
    locked.windowSeconds !== rule.windowSeconds ||
    locked.maximumRequests !== rule.maximumRequests
  ) {
    throw new CustomerAuthServiceError({
      message: "Customer OTP rate-limit rule thresholds are locked.",
      code: "CUSTOMER_OTP_RATE_LIMIT_RULE_INVALID",
      httpStatus: 500,
    });
  }
}

function assertValidNow(now: Date): void {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new CustomerAuthServiceError({
      message: "Customer OTP rate-limit now timestamp is invalid.",
      code: "CUSTOMER_OTP_RATE_LIMIT_TIME_INVALID",
      httpStatus: 500,
    });
  }
}

function assertKeyHash(keyHash: string): void {
  if (!/^[0-9a-f]{64}$/.test(keyHash)) {
    throw new CustomerAuthServiceError({
      message: "Customer OTP rate-limit key hash is invalid.",
      code: "CUSTOMER_OTP_RATE_LIMIT_KEY_INVALID",
      httpStatus: 500,
    });
  }
}

interface RateLimitRow extends Record<string, unknown> {
  request_count: number;
  window_started_at: Date;
  window_seconds: number;
  blocked_until: Date | null;
  challenge_required_until: Date | null;
  violation_count: number;
}

function challengeRequiredAt(
  challengeRequiredUntil: Date | null | undefined,
  now: Date,
): boolean {
  return (
    challengeRequiredUntil instanceof Date &&
    !Number.isNaN(challengeRequiredUntil.getTime()) &&
    challengeRequiredUntil.getTime() > now.getTime()
  );
}

/**
 * Atomically consume one request against a single durable rate-limit rule.
 * Always records the attempt (increments) even when the outcome is limited,
 * unless a progressive cooldown `blocked_until` is still active.
 */
export async function consumeCustomerOtpRateLimit(
  transactionContext: PersistenceTransactionContext,
  input: Readonly<{
    rule: CustomerOtpRateLimitRule;
    keyHash: string;
    now: Date;
  }>,
): Promise<CustomerOtpRateLimitOutcome> {
  assertApplicationRole(transactionContext, "consumeCustomerOtpRateLimit");
  if (!isTransactionContext(transactionContext)) {
    throw new CustomerAuthServiceError({
      message: "consumeCustomerOtpRateLimit requires a persistence transaction context.",
      code: "CUSTOMER_OTP_RATE_LIMIT_CONTEXT_INVALID",
      httpStatus: 500,
    });
  }
  assertValidRule(input.rule);
  assertKeyHash(input.keyHash);
  assertValidNow(input.now);

  const { rule, keyHash, now } = input;
  const t = customerOtpRateLimitsTable;

  const existingRows = await transactionContext.db.execute<RateLimitRow>(sql`
    select
      ${t.requestCount} as request_count,
      ${t.windowStartedAt} as window_started_at,
      ${t.windowSeconds} as window_seconds,
      ${t.blockedUntil} as blocked_until,
      ${t.challengeRequiredUntil} as challenge_required_until,
      ${t.violationCount} as violation_count
    from ${t}
    where ${t.scope} = ${rule.scope}
      and ${t.keyHash} = ${keyHash}
    for update
  `);

  const existing = existingRows.rows[0];

  if (existing) {
    const blockedUntil = existing.blocked_until
      ? new Date(existing.blocked_until)
      : null;
    if (blockedUntil && blockedUntil.getTime() > now.getTime()) {
      const challengeUntil = existing.challenge_required_until
        ? new Date(existing.challenge_required_until)
        : null;
      return {
        outcome: "limited",
        retryAfterSeconds: retryAfterSecondsFrom(blockedUntil, now),
        challengeRequired: challengeRequiredAt(challengeUntil, now),
      };
    }
  }

  let requestCount: number;
  let windowStartedAt: Date;
  let windowSeconds: number;
  let violationCount: number;
  let challengeRequiredUntil: Date | null;

  if (!existing) {
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
        ${now},
        ${rule.windowSeconds},
        1,
        null,
        0,
        null,
        ${now},
        ${now}
      )
    `);
    requestCount = 1;
    windowStartedAt = now;
    windowSeconds = rule.windowSeconds;
    violationCount = 0;
    challengeRequiredUntil = null;
  } else {
    const priorWindowStartedAt = new Date(existing.window_started_at);
    const priorWindowSeconds = Number(existing.window_seconds);
    const priorViolationCount = Number(existing.violation_count);
    const windowExpired =
      priorWindowStartedAt.getTime() + priorWindowSeconds * 1000 <= now.getTime();

    if (windowExpired) {
      await transactionContext.db.execute(sql`
        update ${t}
        set
          window_started_at = ${now},
          window_seconds = ${rule.windowSeconds},
          request_count = 1,
          blocked_until = null,
          challenge_required_until = null,
          updated_at = ${now}
        where ${t.scope} = ${rule.scope}
          and ${t.keyHash} = ${keyHash}
      `);
      requestCount = 1;
      windowStartedAt = now;
      windowSeconds = rule.windowSeconds;
      violationCount = priorViolationCount;
      challengeRequiredUntil = null;
    } else {
      const nextCount = Number(existing.request_count) + 1;
      await transactionContext.db.execute(sql`
        update ${t}
        set
          window_seconds = ${rule.windowSeconds},
          request_count = ${nextCount},
          updated_at = ${now}
        where ${t.scope} = ${rule.scope}
          and ${t.keyHash} = ${keyHash}
      `);
      requestCount = nextCount;
      windowStartedAt = priorWindowStartedAt;
      windowSeconds = rule.windowSeconds;
      violationCount = priorViolationCount;
      challengeRequiredUntil = existing.challenge_required_until
        ? new Date(existing.challenge_required_until)
        : null;
    }
  }

  if (requestCount > rule.maximumRequests) {
    const windowEndsAt = new Date(windowStartedAt.getTime() + windowSeconds * 1000);
    const escalated = escalateProgressiveCooldown({
      ladderSeconds: CUSTOMER_OTP_PROGRESSIVE_COOLDOWN_LADDER_SECONDS,
      previousViolationCount: violationCount,
      now,
      windowEndsAt,
    });
    await transactionContext.db.execute(sql`
      update ${t}
      set
        violation_count = ${escalated.violationCount},
        blocked_until = ${escalated.blockedUntil},
        challenge_required_until = ${escalated.challengeRequiredUntil},
        updated_at = ${now}
      where ${t.scope} = ${rule.scope}
        and ${t.keyHash} = ${keyHash}
    `);
    return {
      outcome: "limited",
      retryAfterSeconds: retryAfterSecondsFrom(escalated.blockedUntil, now),
      challengeRequired: true,
    };
  }

  return {
    outcome: "allowed",
    remaining: Math.max(0, rule.maximumRequests - requestCount),
    challengeRequired: challengeRequiredAt(challengeRequiredUntil, now),
  };
}

/**
 * Consume multiple rate-limit rules in one transaction. Every applicable
 * counter records the attempt; the returned retry interval is the maximum
 * among limited outcomes.
 */
export async function consumeCustomerOtpRateLimits(
  transactionContext: PersistenceTransactionContext,
  input: Readonly<{
    rules: readonly CustomerOtpRateLimitRule[];
    keyHashes: Readonly<Partial<Record<CustomerOtpRateLimitScope, string>>>;
    now: Date;
  }>,
): Promise<CustomerOtpRateLimitOutcome> {
  let limitedRetryAfter = 0;
  let allowedRemaining = Number.POSITIVE_INFINITY;
  let challengeRequired = false;

  for (const rule of input.rules) {
    const keyHash = input.keyHashes[rule.scope];
    if (typeof keyHash !== "string") {
      throw new CustomerAuthServiceError({
        message: "Customer OTP rate-limit key hash is missing for a requested scope.",
        code: "CUSTOMER_OTP_RATE_LIMIT_KEY_INVALID",
        httpStatus: 500,
      });
    }
    const outcome = await consumeCustomerOtpRateLimit(transactionContext, {
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
    return {
      outcome: "limited",
      retryAfterSeconds: limitedRetryAfter,
      challengeRequired,
    };
  }

  return {
    outcome: "allowed",
    remaining:
      allowedRemaining === Number.POSITIVE_INFINITY ? 0 : allowedRemaining,
    challengeRequired,
  };
}

export async function deleteExpiredCustomerOtpRateLimits(
  queryContext: PersistenceQueryContext,
  cutoff: Date,
  limit: number,
): Promise<{ readonly deleted: number }> {
  assertApplicationRole(queryContext, "deleteExpiredCustomerOtpRateLimits");
  assertValidNow(cutoff);
  if (!Number.isInteger(limit) || limit < 1 || limit > CUSTOMER_OTP_RATE_LIMIT_CLEANUP_MAX) {
    throw new CustomerAuthServiceError({
      message: `Cleanup limit must be an integer between 1 and ${CUSTOMER_OTP_RATE_LIMIT_CLEANUP_MAX}.`,
      code: "CUSTOMER_OTP_RATE_LIMIT_CLEANUP_LIMIT_INVALID",
      httpStatus: 500,
    });
  }

  const t = customerOtpRateLimitsTable;
  const result = await queryContext.db.execute(sql`
    with victims as (
      select scope, key_hash
      from ${t}
      where window_started_at + make_interval(secs => window_seconds) < ${cutoff}
        and (blocked_until is null or blocked_until < ${cutoff})
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
