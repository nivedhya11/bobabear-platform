/**
 * Customer OTP provider contracts (IMP-009).
 *
 * Provider-managed verification only — never return provider request IDs,
 * raw provider responses, credentials, OTP values, phone numbers, or
 * delivery payloads.
 */
import type { E164IndianMobileNumber } from "../../../shared/customer-auth/phone";

export type CustomerOtpStartResult =
  | Readonly<{ outcome: "accepted" }>
  | Readonly<{ outcome: "unavailable" }>;

export type CustomerOtpCheckResult =
  | Readonly<{ outcome: "approved" }>
  | Readonly<{ outcome: "invalid" }>
  | Readonly<{ outcome: "expired" }>
  | Readonly<{ outcome: "too_many_attempts" }>
  | Readonly<{ outcome: "unavailable" }>;

export interface CustomerOtpProvider {
  readonly kind: "local" | "production";

  startVerification(
    input: Readonly<{
      phoneNumber: E164IndianMobileNumber;
      generatedCode: string;
      now: Date;
      expiresAt: Date;
    }>,
  ): Promise<CustomerOtpStartResult>;

  checkVerification(
    input: Readonly<{
      phoneNumber: E164IndianMobileNumber;
      code: string;
      now: Date;
    }>,
  ): Promise<CustomerOtpCheckResult>;

  checkReadiness(): Promise<void>;
  close(): Promise<void>;
}

export const CUSTOMER_OTP_LENGTH = 6;
export const CUSTOMER_OTP_EXPIRES_IN_SECONDS = 300;
export const CUSTOMER_OTP_ALLOWED_ATTEMPTS = 3;
