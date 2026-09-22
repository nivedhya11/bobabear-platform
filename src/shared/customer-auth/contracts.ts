/**
 * Shared JSON-safe customer-auth façade contracts (IMP-009).
 *
 * Safe for both the static browser client and the dedicated customer-auth
 * Node service. Never includes secrets, OTP values, phone numbers, session
 * tokens, temporary emails, or temporary names.
 */

export const CUSTOMER_AUTH_PUBLIC_PATHS = Object.freeze({
  sendOtp: "/api/customer-auth/send-otp",
  verifyOtp: "/api/customer-auth/verify-otp",
  session: "/api/customer-auth/session",
  signOut: "/api/customer-auth/sign-out",
} as const);

export type CustomerAuthSendOtpRequest = Readonly<{
  phoneNumber: string;
  /** Cloudflare Turnstile token when challengeRequired was signaled. */
  turnstileToken?: string;
}>;

export type CustomerAuthVerifyOtpRequest = Readonly<{
  phoneNumber: string;
  code: string;
  /** Cloudflare Turnstile token when challengeRequired was signaled. */
  turnstileToken?: string;
}>;

export type CustomerAuthSendOtpSuccess = Readonly<{
  ok: true;
  code: "OTP_REQUEST_ACCEPTED";
  retryAfterSeconds: number;
  challengeRequired?: boolean;
}>;

export type CustomerAuthSendOtpRateLimited = Readonly<{
  ok: false;
  code: "OTP_RATE_LIMITED";
  retryAfterSeconds: number;
  challengeRequired?: boolean;
}>;

export type CustomerAuthSendOtpChallengeRequired = Readonly<{
  ok: false;
  code: "OTP_CHALLENGE_REQUIRED";
  challengeRequired: true;
}>;

export type CustomerAuthSendOtpUnavailable = Readonly<{
  ok: false;
  code: "OTP_DELIVERY_UNAVAILABLE";
}>;

export type CustomerAuthSendOtpInvalidPhone = Readonly<{
  ok: false;
  code: "INVALID_PHONE_NUMBER";
}>;

export type CustomerAuthSendOtpResponse =
  | CustomerAuthSendOtpSuccess
  | CustomerAuthSendOtpRateLimited
  | CustomerAuthSendOtpChallengeRequired
  | CustomerAuthSendOtpUnavailable
  | CustomerAuthSendOtpInvalidPhone;

export type CustomerAuthVerifyOtpSuccess = Readonly<{
  authenticated: true;
}>;

export type CustomerAuthVerifyOtpFailure = Readonly<{
  authenticated: false;
  code:
    | "OTP_INVALID_OR_EXPIRED"
    | "OTP_ATTEMPTS_EXHAUSTED"
    | "OTP_RATE_LIMITED"
    | "OTP_CHALLENGE_REQUIRED"
    | "OTP_DELIVERY_UNAVAILABLE"
    | "INVALID_PHONE_NUMBER"
    | "INVALID_REQUEST";
  retryAfterSeconds?: number;
  challengeRequired?: boolean;
}>;

export type CustomerAuthVerifyOtpResponse =
  | CustomerAuthVerifyOtpSuccess
  | CustomerAuthVerifyOtpFailure;

export type CustomerAuthSessionUnauthenticated = Readonly<{
  authenticated: false;
}>;

export type CustomerAuthSessionAuthenticated = Readonly<{
  authenticated: true;
  user: Readonly<{
    id: string;
  }>;
}>;

export type CustomerAuthSessionResponse =
  | CustomerAuthSessionUnauthenticated
  | CustomerAuthSessionAuthenticated;

export type CustomerAuthSignOutResponse = Readonly<{
  authenticated: false;
}>;
