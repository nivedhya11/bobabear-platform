/**
 * Progressive temporary cooldown ladder unit tests (IMP-038).
 * Deterministic — no database, no network.
 */
import { describe, expect, it } from "vitest";

import {
  escalateProgressiveCooldown,
  retryAfterSecondsFrom,
} from "./progressive";
import { CUSTOMER_OTP_PROGRESSIVE_COOLDOWN_LADDER_SECONDS } from "./types";

const NOW = new Date("2026-09-22T12:00:00.000Z");
const WINDOW_END = new Date("2026-09-22T12:01:00.000Z"); // +60s

describe("escalateProgressiveCooldown", () => {
  it("level 0 uses window end only (ladder[0]=0)", () => {
    const result = escalateProgressiveCooldown({
      ladderSeconds: CUSTOMER_OTP_PROGRESSIVE_COOLDOWN_LADDER_SECONDS,
      previousViolationCount: 0,
      now: NOW,
      windowEndsAt: WINDOW_END,
    });
    expect(result.violationCount).toBe(1);
    expect(result.blockedUntil.toISOString()).toBe(WINDOW_END.toISOString());
    // Challenge must linger after cooldown so Siteverify is reachable.
    expect(result.challengeRequiredUntil.getTime()).toBe(
      result.blockedUntil.getTime() + 300_000,
    );
  });

  it("keeps challengeRequiredUntil after blockedUntil so Turnstile can run", () => {
    const result = escalateProgressiveCooldown({
      ladderSeconds: CUSTOMER_OTP_PROGRESSIVE_COOLDOWN_LADDER_SECONDS,
      previousViolationCount: 1,
      now: NOW,
      windowEndsAt: WINDOW_END,
    });
    expect(result.blockedUntil.getTime()).toBe(NOW.getTime() + 300_000);
    expect(result.challengeRequiredUntil.getTime()).toBeGreaterThan(
      result.blockedUntil.getTime(),
    );
  });

  it("escalates through 5m, 15m, then 1h — never permanent", () => {
    const first = escalateProgressiveCooldown({
      ladderSeconds: CUSTOMER_OTP_PROGRESSIVE_COOLDOWN_LADDER_SECONDS,
      previousViolationCount: 1,
      now: NOW,
      windowEndsAt: WINDOW_END,
    });
    expect(first.violationCount).toBe(2);
    expect(first.blockedUntil.getTime()).toBe(NOW.getTime() + 300_000);

    const second = escalateProgressiveCooldown({
      ladderSeconds: CUSTOMER_OTP_PROGRESSIVE_COOLDOWN_LADDER_SECONDS,
      previousViolationCount: 2,
      now: NOW,
      windowEndsAt: WINDOW_END,
    });
    expect(second.violationCount).toBe(3);
    expect(second.blockedUntil.getTime()).toBe(NOW.getTime() + 900_000);

    const third = escalateProgressiveCooldown({
      ladderSeconds: CUSTOMER_OTP_PROGRESSIVE_COOLDOWN_LADDER_SECONDS,
      previousViolationCount: 3,
      now: NOW,
      windowEndsAt: WINDOW_END,
    });
    expect(third.violationCount).toBe(4);
    expect(third.blockedUntil.getTime()).toBe(NOW.getTime() + 3_600_000);

    const capped = escalateProgressiveCooldown({
      ladderSeconds: CUSTOMER_OTP_PROGRESSIVE_COOLDOWN_LADDER_SECONDS,
      previousViolationCount: 99,
      now: NOW,
      windowEndsAt: WINDOW_END,
    });
    expect(capped.violationCount).toBe(4);
    expect(capped.blockedUntil.getTime()).toBe(NOW.getTime() + 3_600_000);
  });

  it("never sets blocked_until behind the window end", () => {
    const farWindowEnd = new Date("2026-09-22T14:00:00.000Z");
    const result = escalateProgressiveCooldown({
      ladderSeconds: CUSTOMER_OTP_PROGRESSIVE_COOLDOWN_LADDER_SECONDS,
      previousViolationCount: 0,
      now: NOW,
      windowEndsAt: farWindowEnd,
    });
    expect(result.blockedUntil.getTime()).toBe(farWindowEnd.getTime());
  });
});

describe("retryAfterSecondsFrom", () => {
  it("returns at least 1 second", () => {
    expect(retryAfterSecondsFrom(NOW, NOW)).toBe(1);
  });

  it("ceils remaining seconds", () => {
    const until = new Date(NOW.getTime() + 1500);
    expect(retryAfterSecondsFrom(until, NOW)).toBe(2);
  });
});
