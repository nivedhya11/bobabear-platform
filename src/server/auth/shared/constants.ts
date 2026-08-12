/**
 * Locked realm constants and session policy for the Better Auth foundation
 * (IMP-008). These are technical application constants, not environment
 * configuration — they never come from the runtime environment.
 */

export const CUSTOMER_REALM = "customer" as const;
export const WORKFORCE_REALM = "workforce" as const;

export const CUSTOMER_AUTH_BASE_PATH = "/api/auth/customer" as const;
export const WORKFORCE_AUTH_BASE_PATH = "/api/auth/workforce" as const;

export const CUSTOMER_AUTH_COOKIE_PREFIX = "boba-customer" as const;
export const WORKFORCE_AUTH_COOKIE_PREFIX = "boba-workforce" as const;

/**
 * Shared initial Better Auth session policy (ADR-004-adjacent decision for
 * IMP-008): 7 day expiry, 24 hour refresh, 5 minute freshness window,
 * database-persisted sessions, refresh enabled, cookie cache disabled, no
 * secondary storage, no stateless/JWT/JWE session mode.
 */
export const AUTH_SESSION_POLICY = Object.freeze({
  expiresIn: 60 * 60 * 24 * 7,
  updateAge: 60 * 60 * 24,
  freshAge: 60 * 5,
  disableSessionRefresh: false,
  storeSessionInDatabase: true,
  cookieCache: Object.freeze({
    enabled: false,
  }),
});

export const MIN_AUTH_SECRET_LENGTH = 32;

/**
 * Known placeholder/fallback secrets that must always be rejected, including
 * Better Auth 1.6.25's own documented development fallback
 * ("better-auth-secret-123456789", from `@better-auth/core`'s
 * `BetterAuthOptions.secret` doc comment).
 */
export const KNOWN_PLACEHOLDER_AUTH_SECRETS: ReadonlySet<string> = new Set([
  "change-me",
  "changeme",
  "secret",
  "customer-secret",
  "workforce-secret",
  "better-auth-secret-12345678901234567890",
  "better-auth-secret-123456789",
]);

export const LOOPBACK_AUTH_HOSTNAMES: ReadonlySet<string> = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
]);
