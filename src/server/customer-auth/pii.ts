/**
 * HMAC-derived temporary Better Auth identity helpers (IMP-009).
 *
 * Better Auth still requires an email column when a verified phone creates
 * a new user. The temporary email is an internal compatibility field only —
 * it must never contain the raw phone number and must never be shown in the
 * UI.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import type { AppEnvironment } from "../../platform/config";
import { MIN_AUTH_SECRET_LENGTH } from "../auth/shared/constants";
import type { E164IndianMobileNumber } from "../../shared/customer-auth/phone";
import {
  CustomerAuthConfigurationError,
  type CustomerAuthSafeIssue,
} from "./errors";

declare const customerPiiHashSecretBrand: unique symbol;

export type CustomerPiiHashSecret = string & {
  readonly [customerPiiHashSecretBrand]: "CustomerPiiHashSecret";
};

export const CUSTOMER_TEMPORARY_DISPLAY_NAME = "BOBA Bear Customer" as const;

const KNOWN_PLACEHOLDER_PII_SECRETS: ReadonlySet<string> = new Set([
  "change-me",
  "changeme",
  "secret",
  "pii-secret",
  "customer-pii-secret",
  "customer-auth-pii-hash-secret",
  "better-auth-secret-123456789",
  "better-auth-secret-12345678901234567890",
]);

export type CustomerTemporaryIdentityDeriver = Readonly<{
  deriveTempEmail(phoneNumber: E164IndianMobileNumber): string;
  deriveTempName(phoneNumber: E164IndianMobileNumber): typeof CUSTOMER_TEMPORARY_DISPLAY_NAME;
}>;

function validatePiiHashSecret(
  raw: string | undefined,
  customerAuthSecret: string | undefined,
  workforceAuthSecret: string | undefined,
): { ok: true; value: CustomerPiiHashSecret } | { ok: false; message: string } {
  if (raw === undefined || raw.length === 0) {
    return {
      ok: false,
      message: `Required. Must be at least ${MIN_AUTH_SECRET_LENGTH} characters.`,
    };
  }
  if (raw.trim() !== raw) {
    return { ok: false, message: "Must not contain leading or trailing whitespace." };
  }
  if (raw.length < MIN_AUTH_SECRET_LENGTH) {
    return {
      ok: false,
      message: `Must be at least ${MIN_AUTH_SECRET_LENGTH} characters.`,
    };
  }
  if (KNOWN_PLACEHOLDER_PII_SECRETS.has(raw)) {
    return {
      ok: false,
      message: "Must not be a known placeholder or fallback secret value.",
    };
  }
  if (customerAuthSecret !== undefined && raw === customerAuthSecret) {
    return { ok: false, message: "Must not equal CUSTOMER_AUTH_SECRET." };
  }
  if (workforceAuthSecret !== undefined && raw === workforceAuthSecret) {
    return { ok: false, message: "Must not equal WORKFORCE_AUTH_SECRET." };
  }
  return { ok: true, value: raw as CustomerPiiHashSecret };
}

export function createCustomerTemporaryIdentityDeriver(
  secret: CustomerPiiHashSecret,
): CustomerTemporaryIdentityDeriver {
  return Object.freeze({
    deriveTempEmail(phoneNumber: E164IndianMobileNumber): string {
      const digest = createHmac("sha256", secret)
        .update(`customer-temp-email:v1:${phoneNumber}`, "utf8")
        .digest("hex");
      return `u_${digest}@phone.invalid`;
    },
    deriveTempName(
      _phone: E164IndianMobileNumber,
    ): typeof CUSTOMER_TEMPORARY_DISPLAY_NAME {
      void _phone;
      return CUSTOMER_TEMPORARY_DISPLAY_NAME;
    },
  });
}

export function loadCustomerPiiHashSecret(
  source: Readonly<Record<string, string | undefined>>,
  relatedSecrets: Readonly<{
    customerAuthSecret?: string;
    workforceAuthSecret?: string;
  }> = {},
): CustomerPiiHashSecret {
  const result = validatePiiHashSecret(
    source.CUSTOMER_AUTH_PII_HASH_SECRET,
    relatedSecrets.customerAuthSecret,
    relatedSecrets.workforceAuthSecret,
  );
  if (!result.ok) {
    throw new CustomerAuthConfigurationError([
      { key: "CUSTOMER_AUTH_PII_HASH_SECRET", message: result.message },
    ]);
  }
  return result.value;
}

export function assertSecretAbsentFromText(
  text: string,
  secret: string,
  label: string,
): void {
  if (secret.length === 0) return;
  const haystack = Buffer.from(text, "utf8");
  const needle = Buffer.from(secret, "utf8");
  if (haystack.length < needle.length) return;
  for (let i = 0; i <= haystack.length - needle.length; i += 1) {
    const slice = haystack.subarray(i, i + needle.length);
    if (timingSafeEqual(slice, needle)) {
      throw new Error(`${label} must never appear in error or log output.`);
    }
  }
}

export type CustomerPhoneAuthEnvSource = Readonly<Record<string, string | undefined>>;

export type CustomerPhoneAuthServiceConfig = Readonly<{
  environmentType: AppEnvironment;
  piiHashSecret: CustomerPiiHashSecret;
  identityDeriver: CustomerTemporaryIdentityDeriver;
  otpProviderKind: "local" | "disabled";
  localFixedCode: string | null;
  trustProxyHops: number;
  serviceHost: string;
  servicePort: number;
  trustedOrigin: string;
}>;

function parseTrustProxyHops(
  raw: string | undefined,
): { ok: true; value: number } | { ok: false; message: string } {
  const value = raw === undefined || raw.length === 0 ? "0" : raw;
  if (!/^\d+$/.test(value)) {
    return { ok: false, message: "Must be an integer between 0 and 2 inclusive." };
  }
  const parsed = Number.parseInt(value, 10);
  if (parsed < 0 || parsed > 2) {
    return { ok: false, message: "Must be an integer between 0 and 2 inclusive." };
  }
  return { ok: true, value: parsed };
}

function parseServicePort(
  raw: string | undefined,
): { ok: true; value: number } | { ok: false; message: string } {
  const value = raw === undefined || raw.length === 0 ? "8081" : raw;
  if (!/^\d+$/.test(value)) {
    return { ok: false, message: "Must be an integer between 1 and 65535." };
  }
  const parsed = Number.parseInt(value, 10);
  if (parsed < 1 || parsed > 65535) {
    return { ok: false, message: "Must be an integer between 1 and 65535." };
  }
  return { ok: true, value: parsed };
}

function parseLocalFixedCode(
  raw: string | undefined,
  environmentType: AppEnvironment,
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (raw === undefined || raw.length === 0) {
    return { ok: true, value: null };
  }
  if (environmentType === "staging" || environmentType === "production") {
    return {
      ok: false,
      message: "Fixed local OTP codes are prohibited in staging and production.",
    };
  }
  if (!/^\d{6}$/.test(raw)) {
    return { ok: false, message: "Must be exactly six decimal digits when set." };
  }
  return { ok: true, value: raw };
}

function parseOtpProviderKind(
  raw: string | undefined,
  environmentType: AppEnvironment,
):
  | { ok: true; value: "local" | "disabled" }
  | { ok: false; message: string; code?: string } {
  const value = raw === undefined || raw.length === 0 ? "disabled" : raw;
  if (value !== "local" && value !== "disabled") {
    return {
      ok: false,
      message: 'Must be exactly "local" or "disabled".',
    };
  }
  if (value === "local" && (environmentType === "staging" || environmentType === "production")) {
    return {
      ok: false,
      message: "Local OTP provider is prohibited in staging and production.",
      code: "CUSTOMER_OTP_PRODUCTION_PROVIDER_UNAVAILABLE",
    };
  }
  if (
    value === "disabled" &&
    (environmentType === "staging" || environmentType === "production")
  ) {
    return {
      ok: false,
      message:
        "No approved production customer OTP provider adapter is configured.",
      code: "CUSTOMER_OTP_PRODUCTION_PROVIDER_UNAVAILABLE",
    };
  }
  return { ok: true, value };
}

/**
 * Load customer-phone-auth service configuration from an explicit source
 * object. Never reads the real environment directly. Staging/production
 * fail closed when no approved production provider exists.
 */
export function loadCustomerPhoneAuthServiceConfig(
  source: CustomerPhoneAuthEnvSource,
  environmentType: AppEnvironment,
  trustedOrigin: string,
  relatedSecrets: Readonly<{
    customerAuthSecret?: string;
    workforceAuthSecret?: string;
  }> = {},
): CustomerPhoneAuthServiceConfig {
  const issues: CustomerAuthSafeIssue[] = [];
  let failCode = "CUSTOMER_AUTH_CONFIGURATION_INVALID";

  const piiResult = validatePiiHashSecret(
    source.CUSTOMER_AUTH_PII_HASH_SECRET,
    relatedSecrets.customerAuthSecret,
    relatedSecrets.workforceAuthSecret,
  );
  if (!piiResult.ok) {
    issues.push({ key: "CUSTOMER_AUTH_PII_HASH_SECRET", message: piiResult.message });
  }

  const providerResult = parseOtpProviderKind(
    source.CUSTOMER_OTP_PROVIDER,
    environmentType,
  );
  if (!providerResult.ok) {
    issues.push({ key: "CUSTOMER_OTP_PROVIDER", message: providerResult.message });
    if (providerResult.code) failCode = providerResult.code;
  }

  const fixedCodeResult = parseLocalFixedCode(
    source.CUSTOMER_OTP_LOCAL_FIXED_CODE,
    environmentType,
  );
  if (!fixedCodeResult.ok) {
    issues.push({
      key: "CUSTOMER_OTP_LOCAL_FIXED_CODE",
      message: fixedCodeResult.message,
    });
  }

  const hopsResult = parseTrustProxyHops(source.CUSTOMER_AUTH_TRUST_PROXY_HOPS);
  if (!hopsResult.ok) {
    issues.push({
      key: "CUSTOMER_AUTH_TRUST_PROXY_HOPS",
      message: hopsResult.message,
    });
  }

  const portResult = parseServicePort(source.CUSTOMER_AUTH_SERVICE_PORT);
  if (!portResult.ok) {
    issues.push({
      key: "CUSTOMER_AUTH_SERVICE_PORT",
      message: portResult.message,
    });
  }

  const host =
    source.CUSTOMER_AUTH_SERVICE_HOST === undefined ||
    source.CUSTOMER_AUTH_SERVICE_HOST.length === 0
      ? "0.0.0.0"
      : source.CUSTOMER_AUTH_SERVICE_HOST;
  if (host.trim() !== host || host.length === 0) {
    issues.push({
      key: "CUSTOMER_AUTH_SERVICE_HOST",
      message: "Must be a non-empty host without surrounding whitespace.",
    });
  }

  if (issues.length > 0) {
    throw new CustomerAuthConfigurationError(issues, failCode);
  }

  const piiHashSecret = (piiResult as { ok: true; value: CustomerPiiHashSecret }).value;

  return Object.freeze({
    environmentType,
    piiHashSecret,
    identityDeriver: createCustomerTemporaryIdentityDeriver(piiHashSecret),
    otpProviderKind: (providerResult as { ok: true; value: "local" | "disabled" }).value,
    localFixedCode: (fixedCodeResult as { ok: true; value: string | null }).value,
    trustProxyHops: (hopsResult as { ok: true; value: number }).value,
    serviceHost: host,
    servicePort: (portResult as { ok: true; value: number }).value,
    trustedOrigin,
  });
}
