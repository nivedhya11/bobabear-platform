/**
 * Session-only OTP provider stub for customer-commerce (IMP-024).
 *
 * Commerce never sends or verifies OTPs — it only validates existing
 * customer sessions via Better Auth. This stub satisfies the phone-plugin
 * dependency required to construct the customer auth runtime.
 */
import "server-only";

import type { CustomerOtpProvider } from "../customer-auth/provider/types";

export function createSessionOnlyOtpProvider(): CustomerOtpProvider {
  return Object.freeze({
    kind: "local",
    async startVerification() {
      return Object.freeze({ outcome: "unavailable" as const });
    },
    async checkVerification() {
      return Object.freeze({ outcome: "unavailable" as const });
    },
    async checkReadiness() {
      // Session validation does not depend on OTP delivery readiness.
    },
    async close() {
      // no-op
    },
  });
}
