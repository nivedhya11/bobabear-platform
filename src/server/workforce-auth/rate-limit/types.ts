/**
 * Durable workforce-auth rate-limit contracts (IMP-010).
 */
export const WORKFORCE_AUTH_RATE_LIMIT_SCOPES = [
  "workforce_sign_in_email_15m",
  "workforce_sign_in_ip_10m",
  "workforce_mfa_ip_10m",
  "workforce_security_change_ip_10m",
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
});

export type WorkforceAuthRateLimitOutcome =
  | Readonly<{
      outcome: "allowed";
      remaining: number;
    }>
  | Readonly<{
      outcome: "limited";
      retryAfterSeconds: number;
    }>;

export const WORKFORCE_AUTH_RATE_LIMIT_CLEANUP_MAX = 500;
