/**
 * Durable customer OTP rate-limit contracts (IMP-009).
 */
export const CUSTOMER_OTP_RATE_LIMIT_SCOPES = [
  "otp_send_phone_60s",
  "otp_send_phone_1h",
  "otp_send_ip_10m",
  "otp_verify_ip_10m",
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
});

export type CustomerOtpRateLimitOutcome =
  | Readonly<{
      outcome: "allowed";
      remaining: number;
    }>
  | Readonly<{
      outcome: "limited";
      retryAfterSeconds: number;
    }>;

export const CUSTOMER_OTP_RATE_LIMIT_CLEANUP_MAX = 500;
