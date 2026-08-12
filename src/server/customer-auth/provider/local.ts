/**
 * In-process local/test customer OTP provider (IMP-009).
 *
 * Allowed only in local/test/ci. Stores OTP state only in process memory —
 * never PostgreSQL, never logs OTPs, never exposes OTPs over HTTP.
 */
import { timingSafeEqual } from "node:crypto";

import type { AppEnvironment } from "../../../platform/config";
import type { E164IndianMobileNumber } from "../../../shared/customer-auth/phone";
import { CustomerOtpProviderError } from "../errors";
import {
  CUSTOMER_OTP_ALLOWED_ATTEMPTS,
  type CustomerOtpCheckResult,
  type CustomerOtpProvider,
  type CustomerOtpStartResult,
} from "./types";

interface LocalOtpRecord {
  code: string;
  expiresAtMs: number;
  failedAttempts: number;
}

export type LocalCustomerOtpProviderOptions = Readonly<{
  environmentType: AppEnvironment;
  /** Exactly six decimal digits when set; ignores generated codes. */
  fixedCode?: string | null;
}>;

const LOCAL_ALLOWED_ENVIRONMENTS: ReadonlySet<AppEnvironment> = new Set([
  "local",
  "test",
  "ci",
]);

function codesEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function createLocalProviderState(
  options: LocalCustomerOtpProviderOptions,
): {
  provider: CustomerOtpProvider;
  records: Map<string, LocalOtpRecord>;
} {
  if (!LOCAL_ALLOWED_ENVIRONMENTS.has(options.environmentType)) {
    throw new CustomerOtpProviderError(
      "Local customer OTP provider is prohibited outside local/test/ci.",
      "CUSTOMER_OTP_PRODUCTION_PROVIDER_UNAVAILABLE",
    );
  }

  if (
    options.fixedCode !== undefined &&
    options.fixedCode !== null &&
    !/^\d{6}$/.test(options.fixedCode)
  ) {
    throw new CustomerOtpProviderError(
      "Local fixed OTP code must be exactly six decimal digits when set.",
      "CUSTOMER_OTP_LOCAL_FIXED_CODE_INVALID",
    );
  }

  const records = new Map<string, LocalOtpRecord>();
  let closed = false;

  function assertOpen(): void {
    if (closed) {
      throw new CustomerOtpProviderError(
        "Local customer OTP provider has already been closed.",
        "CUSTOMER_OTP_PROVIDER_CLOSED",
      );
    }
  }

  const provider: CustomerOtpProvider = {
    kind: "local",

    async startVerification(input): Promise<CustomerOtpStartResult> {
      assertOpen();
      const code =
        options.fixedCode && options.fixedCode.length === 6
          ? options.fixedCode
          : input.generatedCode;
      if (!/^\d{6}$/.test(code)) {
        return { outcome: "unavailable" };
      }
      records.set(input.phoneNumber, {
        code,
        expiresAtMs: input.expiresAt.getTime(),
        failedAttempts: 0,
      });
      return { outcome: "accepted" };
    },

    async checkVerification(input): Promise<CustomerOtpCheckResult> {
      assertOpen();
      const record = records.get(input.phoneNumber);
      if (!record) return { outcome: "invalid" };
      if (input.now.getTime() >= record.expiresAtMs) {
        records.delete(input.phoneNumber);
        return { outcome: "expired" };
      }
      if (record.failedAttempts >= CUSTOMER_OTP_ALLOWED_ATTEMPTS) {
        records.delete(input.phoneNumber);
        return { outcome: "too_many_attempts" };
      }
      if (!codesEqual(record.code, input.code)) {
        record.failedAttempts += 1;
        if (record.failedAttempts >= CUSTOMER_OTP_ALLOWED_ATTEMPTS) {
          records.delete(input.phoneNumber);
          return { outcome: "too_many_attempts" };
        }
        return { outcome: "invalid" };
      }
      records.delete(input.phoneNumber);
      return { outcome: "approved" };
    },

    async checkReadiness(): Promise<void> {
      assertOpen();
    },

    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      records.clear();
    },
  };

  return { provider, records };
}

export function createLocalCustomerOtpProvider(
  options: LocalCustomerOtpProviderOptions,
): CustomerOtpProvider {
  return createLocalProviderState(options).provider;
}

/**
 * Test-only capture seam. Not exported from the production public provider
 * boundary (`provider/index.ts` / customer-auth public entry points).
 */
export function createLocalCustomerOtpProviderForTests(
  options: LocalCustomerOtpProviderOptions,
): CustomerOtpProvider & {
  readonly __testOnly_getActiveCode: (
    phoneNumber: E164IndianMobileNumber,
  ) => string | null;
} {
  const { provider, records } = createLocalProviderState(options);
  return {
    ...provider,
    __testOnly_getActiveCode(phoneNumber) {
      return records.get(phoneNumber)?.code ?? null;
    },
  };
}
