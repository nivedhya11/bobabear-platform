/**
 * Durable customer OTP rate-limit contracts (IMP-009 / IMP-038).
 */
export const CUSTOMER_OTP_RATE_LIMIT_SCOPES = [
  "otp_send_phone_60s",
  "otp_send_phone_1h",
  "otp_send_ip_10m",
  "otp_verify_ip_10m",
  "otp_send_phone_ip_10m",
  "otp_verify_phone_ip_10m",
  "otp_abuse_phone_1d",
  "otp_abuse_ip_1d",
] as const;

export type CustomerOtpRateLimitScope =
  (typeof CUSTOMER_OTP_RATE_LIMIT_SCOPES)[number];

export type CustomerOtpRateLimitRule = Readonly<{
  scope: CustomerOtpRateLimitScope;
  windowSeconds: number;
  maximumRequests: number;
}>;

export const CUSTOMER_OTP_RATE_LIMIT_RULES: Readonly<
  Record<CustomerOtpRateLimitScope, CustomerOtpRateLimitRule>
> = Object.freeze({
  otp_send_phone_60s: Object.freeze({
    scope: "otp_send_phone_60s",
    windowSeconds: 60,
    maximumRequests: 1,
  }),
  otp_send_phone_1h: Object.freeze({
    scope: "otp_send_phone_1h",
    windowSeconds: 3600,
    maximumRequests: 5,
  }),
  otp_send_ip_10m: Object.freeze({
    scope: "otp_send_ip_10m",
    windowSeconds: 600,
    maximumRequests: 10,
  }),
  otp_verify_ip_10m: Object.freeze({
    scope: "otp_verify_ip_10m",
    windowSeconds: 600,
    maximumRequests: 20,
  }),
  otp_send_phone_ip_10m: Object.freeze({
    scope: "otp_send_phone_ip_10m",
    windowSeconds: 600,
    maximumRequests: 8,
  }),
  otp_verify_phone_ip_10m: Object.freeze({
    scope: "otp_verify_phone_ip_10m",
    windowSeconds: 600,
    maximumRequests: 15,
  }),
  otp_abuse_phone_1d: Object.freeze({
    scope: "otp_abuse_phone_1d",
    windowSeconds: 86400,
    maximumRequests: 20,
  }),
  otp_abuse_ip_1d: Object.freeze({
    scope: "otp_abuse_ip_1d",
    windowSeconds: 86400,
    maximumRequests: 100,
  }),
});

/**
 * Progressive temporary cooldown ladder (seconds). Level 0 = window end only;
 * never permanent lockout.
 */
export const CUSTOMER_OTP_PROGRESSIVE_COOLDOWN_LADDER_SECONDS = Object.freeze([
  0, 300, 900, 3600,
] as const);

export type CustomerOtpRateLimitOutcome =
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

export const CUSTOMER_OTP_RATE_LIMIT_CLEANUP_MAX = 500;
