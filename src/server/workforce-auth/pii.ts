/**
 * Workforce PII hashing and service-host configuration (IMP-010).
 *
 * HMAC digests of normalized email and canonical IP only — never store or
 * log the raw values. Secrets are validated against known placeholders and
 * against every other auth/PII secret in the process.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import type { AppEnvironment } from "../../platform/config";
import { MIN_AUTH_SECRET_LENGTH } from "../auth/shared/constants";
import type { NormalizedWorkforceEmail } from "../../shared/workforce-auth/email";
import {
  WorkforceAuthConfigurationError,
  type WorkforceAuthSafeIssue,
} from "./errors";

declare const workforcePiiHashSecretBrand: unique symbol;

export type WorkforcePiiHashSecret = string & {
  readonly [workforcePiiHashSecretBrand]: "WorkforcePiiHashSecret";
};

const KNOWN_PLACEHOLDER_PII_SECRETS: ReadonlySet<string> = new Set([
  "change-me",
  "changeme",
  "secret",
  "pii-secret",
  "workforce-pii-secret",
  "workforce-auth-pii-hash-secret",
  "customer-auth-pii-hash-secret",
  "better-auth-secret-123456789",
  "better-auth-secret-12345678901234567890",
]);

function validatePiiHashSecret(
  raw: string | undefined,
  related: Readonly<{
    workforceAuthSecret?: string;
    customerAuthSecret?: string;
    customerPiiHashSecret?: string;
  }>,
): { ok: true; value: WorkforcePiiHashSecret } | { ok: false; message: string } {
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
  if (related.workforceAuthSecret !== undefined && raw === related.workforceAuthSecret) {
    return { ok: false, message: "Must not equal WORKFORCE_AUTH_SECRET." };
  }
  if (related.customerAuthSecret !== undefined && raw === related.customerAuthSecret) {
    return { ok: false, message: "Must not equal CUSTOMER_AUTH_SECRET." };
  }
  if (related.customerPiiHashSecret !== undefined && raw === related.customerPiiHashSecret) {
    return { ok: false, message: "Must not equal CUSTOMER_AUTH_PII_HASH_SECRET." };
  }
  return { ok: true, value: raw as WorkforcePiiHashSecret };
}

export function hashWorkforceEmailKey(
  secret: WorkforcePiiHashSecret,
  email: NormalizedWorkforceEmail,
): string {
  return createHmac("sha256", secret)
    .update(`workforce-email:v1:${email}`, "utf8")
    .digest("hex");
}

export function hashWorkforceIpKey(
  secret: WorkforcePiiHashSecret,
  canonicalIp: string,
): string {
  return createHmac("sha256", secret)
    .update(`workforce-ip:v1:${canonicalIp}`, "utf8")
    .digest("hex");
}

export function loadWorkforcePiiHashSecret(
  source: Readonly<Record<string, string | undefined>>,
  relatedSecrets: Readonly<{
    workforceAuthSecret?: string;
    customerAuthSecret?: string;
    customerPiiHashSecret?: string;
  }> = {},
): WorkforcePiiHashSecret {
  const result = validatePiiHashSecret(source.WORKFORCE_AUTH_PII_HASH_SECRET, relatedSecrets);
  if (!result.ok) {
    throw new WorkforceAuthConfigurationError([
      { key: "WORKFORCE_AUTH_PII_HASH_SECRET", message: result.message },
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

export type WorkforceAuthEnvSource = Readonly<Record<string, string | undefined>>;

export type WorkforceAuthServiceHostConfig = Readonly<{
  environmentType: AppEnvironment;
  piiHashSecret: WorkforcePiiHashSecret;
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
  const value = raw === undefined || raw.length === 0 ? "8082" : raw;
  if (!/^\d+$/.test(value)) {
    return { ok: false, message: "Must be an integer between 1 and 65535." };
  }
  const parsed = Number.parseInt(value, 10);
  if (parsed < 1 || parsed > 65535) {
    return { ok: false, message: "Must be an integer between 1 and 65535." };
  }
  return { ok: true, value: parsed };
}

/**
 * Load workforce-auth service host/PII configuration from an explicit source
 * object. Never reads the real environment directly.
 */
export function loadWorkforceAuthServiceHostConfig(
  source: WorkforceAuthEnvSource,
  environmentType: AppEnvironment,
  trustedOrigin: string,
  relatedSecrets: Readonly<{
    workforceAuthSecret?: string;
    customerAuthSecret?: string;
    customerPiiHashSecret?: string;
  }> = {},
): WorkforceAuthServiceHostConfig {
  const issues: WorkforceAuthSafeIssue[] = [];

  const piiResult = validatePiiHashSecret(source.WORKFORCE_AUTH_PII_HASH_SECRET, relatedSecrets);
  if (!piiResult.ok) {
    issues.push({ key: "WORKFORCE_AUTH_PII_HASH_SECRET", message: piiResult.message });
  }

  const hopsResult = parseTrustProxyHops(source.WORKFORCE_AUTH_TRUST_PROXY_HOPS);
  if (!hopsResult.ok) {
    issues.push({
      key: "WORKFORCE_AUTH_TRUST_PROXY_HOPS",
      message: hopsResult.message,
    });
  }

  const portResult = parseServicePort(source.WORKFORCE_AUTH_SERVICE_PORT);
  if (!portResult.ok) {
    issues.push({
      key: "WORKFORCE_AUTH_SERVICE_PORT",
      message: portResult.message,
    });
  }

  const host =
    source.WORKFORCE_AUTH_SERVICE_HOST === undefined ||
    source.WORKFORCE_AUTH_SERVICE_HOST.length === 0
      ? "0.0.0.0"
      : source.WORKFORCE_AUTH_SERVICE_HOST;
  if (host.trim() !== host || host.length === 0) {
    issues.push({
      key: "WORKFORCE_AUTH_SERVICE_HOST",
      message: "Must be a non-empty host without surrounding whitespace.",
    });
  }

  // Fail closed: any test-only TOTP helper env is prohibited outside local/test/ci.
  const testTotpSecret = source.WORKFORCE_AUTH_TOTP_TEST_SECRET;
  if (testTotpSecret !== undefined && testTotpSecret.length > 0) {
    if (environmentType === "staging" || environmentType === "production") {
      issues.push({
        key: "WORKFORCE_AUTH_TOTP_TEST_SECRET",
        message: "Test-only TOTP helpers are prohibited in staging and production.",
      });
    }
  }

  if (issues.length > 0) {
    throw new WorkforceAuthConfigurationError(issues);
  }

  return Object.freeze({
    environmentType,
    piiHashSecret: (piiResult as { ok: true; value: WorkforcePiiHashSecret }).value,
    trustProxyHops: (hopsResult as { ok: true; value: number }).value,
    serviceHost: host,
    servicePort: (portResult as { ok: true; value: number }).value,
    trustedOrigin,
  });
}
