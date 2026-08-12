/**
 * Public OTP provider boundary (IMP-009).
 *
 * Deliberately does not re-export the test-only capture seam from `local.ts`.
 */
import "server-only";

export {
  assertProductionCustomerOtpProviderReady,
  createCustomerOtpProvider,
} from "./factory";
export type {
  CreateCustomerOtpProviderInput,
  CustomerOtpProviderKind,
} from "./factory";
export type {
  CustomerOtpCheckResult,
  CustomerOtpProvider,
  CustomerOtpStartResult,
} from "./types";
export {
  CUSTOMER_OTP_ALLOWED_ATTEMPTS,
  CUSTOMER_OTP_EXPIRES_IN_SECONDS,
  CUSTOMER_OTP_LENGTH,
} from "./types";
