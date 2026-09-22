/**
 * Progressive temporary cooldown helpers (IMP-038).
 *
 * Shared ladder semantics for customer OTP and workforce auth rate limits.
 * Never produces a permanent lockout.
 */
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
  return Object.freeze({
    violationCount,
    blockedUntil,
    challengeRequiredUntil: blockedUntil,
  });
}

export function retryAfterSecondsFrom(until: Date, now: Date): number {
  return Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 1000));
}
