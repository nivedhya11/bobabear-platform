/**
 * Progressive temporary cooldown helpers (IMP-038).
 *
 * Shared ladder semantics for workforce auth rate limits.
 * Never produces a permanent lockout.
 */

/**
 * Challenge linger after cooldown ends so Turnstile can actually be verified.
 * Matches Turnstile token TTL band (capability §9 / siteverify short TTL).
 */
export const AUTH_ABUSE_CHALLENGE_LINGER_SECONDS = 300 as const;

export function escalateProgressiveCooldown(input: Readonly<{
  ladderSeconds: readonly number[];
  previousViolationCount: number;
  now: Date;
  windowEndsAt: Date;
}>): Readonly<{
  violationCount: number;
  blockedUntil: Date;
  challengeRequiredUntil: Date;
}> {
  const ladderLength = input.ladderSeconds.length;
  if (ladderLength < 1) {
    throw new Error("Progressive cooldown ladder must not be empty.");
  }
  const violationCount = Math.min(input.previousViolationCount + 1, ladderLength);
  const level = Math.min(violationCount - 1, ladderLength - 1);
  const ladderSeconds = input.ladderSeconds[level] ?? 0;
  const blockedUntilMs = Math.max(
    input.windowEndsAt.getTime(),
    input.now.getTime() + ladderSeconds * 1000,
  );
  const blockedUntil = new Date(blockedUntilMs);
  // Challenge must outlive cooldown: while blocked, routers return 429 before
  // Siteverify; after cooldown lifts, challengeRequiredUntil must still be
  // future so the next allowed request requires Turnstile.
  const challengeRequiredUntil = new Date(
    Math.max(blockedUntil.getTime(), input.now.getTime()) +
      AUTH_ABUSE_CHALLENGE_LINGER_SECONDS * 1000,
  );
  return Object.freeze({
    violationCount,
    blockedUntil,
    challengeRequiredUntil,
  });
}

export function retryAfterSecondsFrom(until: Date, now: Date): number {
  return Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 1000));
}
