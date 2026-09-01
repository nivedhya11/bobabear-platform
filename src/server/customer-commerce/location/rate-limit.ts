/**
 * In-process rate limit for location provider endpoints (no Redis/new service).
 */
export type LocationRateLimitOutcome =
  | Readonly<{ allowed: true }>
  | Readonly<{ allowed: false; retryAfterSeconds: number }>;

export type LocationRateLimiter = Readonly<{
  consume(key: string, nowMs?: number): LocationRateLimitOutcome;
}>;

export function createLocationRateLimiter(options?: {
  windowMs?: number;
  maxRequests?: number;
}): LocationRateLimiter {
  const windowMs = options?.windowMs ?? 60_000;
  const maxRequests = options?.maxRequests ?? 40;
  const buckets = new Map<string, { windowStartMs: number; count: number }>();

  return Object.freeze({
    consume(key: string, nowMs = Date.now()): LocationRateLimitOutcome {
      const existing = buckets.get(key);
      if (!existing || nowMs - existing.windowStartMs >= windowMs) {
        buckets.set(key, { windowStartMs: nowMs, count: 1 });
        return { allowed: true };
      }
      if (existing.count >= maxRequests) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((existing.windowStartMs + windowMs - nowMs) / 1000),
        );
        return { allowed: false, retryAfterSeconds };
      }
      existing.count += 1;
      return { allowed: true };
    },
  });
}
