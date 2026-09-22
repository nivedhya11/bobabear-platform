/**
 * Durable workforce-auth rate-limit contracts (IMP-010 / IMP-038).
 */
export const WORKFORCE_AUTH_RATE_LIMIT_SCOPES = [
  "workforce_sign_in_email_15m",
  "workforce_sign_in_ip_10m",
  "workforce_mfa_ip_10m",
  "workforce_security_change_ip_10m",
  "workforce_sign_in_email_ip_15m",
  "workforce_abuse_email_1d",
  "workforce_abuse_ip_1d",
] as const;

export type WorkforceAuthRateLimitScope =
  (typeof WORKFORCE_AUTH_RATE_LIMIT_SCOPES)[number];

export type WorkforceAuthRateLimitRule = Readonly<{
  scope: WorkforceAuthRateLimitScope;
  windowSeconds: number;
  maximumRequests: number;
}>;

export const WORKFORCE_AUTH_RATE_LIMIT_RULES: Readonly<
  Record<WorkforceAuthRateLimitScope, WorkforceAuthRateLimitRule>
> = Object.freeze({
  workforce_sign_in_email_15m: Object.freeze({
    scope: "workforce_sign_in_email_15m",
    windowSeconds: 900,
    maximumRequests: 5,
  }),
  workforce_sign_in_ip_10m: Object.freeze({
    scope: "workforce_sign_in_ip_10m",
    windowSeconds: 600,
    maximumRequests: 20,
  }),
  workforce_mfa_ip_10m: Object.freeze({
    scope: "workforce_mfa_ip_10m",
    windowSeconds: 600,
    maximumRequests: 30,
  }),
  workforce_security_change_ip_10m: Object.freeze({
    scope: "workforce_security_change_ip_10m",
    windowSeconds: 600,
    maximumRequests: 10,
  }),
  workforce_sign_in_email_ip_15m: Object.freeze({
    scope: "workforce_sign_in_email_ip_15m",
    windowSeconds: 900,
    maximumRequests: 8,
  }),
  workforce_abuse_email_1d: Object.freeze({
    scope: "workforce_abuse_email_1d",
    windowSeconds: 86400,
    maximumRequests: 30,
  }),
  workforce_abuse_ip_1d: Object.freeze({
    scope: "workforce_abuse_ip_1d",
    windowSeconds: 86400,
    maximumRequests: 200,
  }),
});

/**
 * Progressive temporary cooldown ladder (seconds). Level 0 = window end only;
 * never permanent lockout.
 */
export const WORKFORCE_AUTH_PROGRESSIVE_COOLDOWN_LADDER_SECONDS = Object.freeze([
  0, 300, 900, 3600,
] as const);

export type WorkforceAuthRateLimitOutcome =
  | Readonly<{
      outcome: "allowed";
      remaining: number;
      challengeRequired: boolean;
    }>
  | Readonly<{
      outcome: "limited";
      retryAfterSeconds: number;
      challengeRequired: boolean;
    }>;

export const WORKFORCE_AUTH_RATE_LIMIT_CLEANUP_MAX = 500;
