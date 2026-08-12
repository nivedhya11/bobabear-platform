/**
 * Validation for the Better Auth foundation's four server-only environment
 * variables (IMP-008): `CUSTOMER_AUTH_SECRET`, `CUSTOMER_AUTH_BASE_URL`,
 * `WORKFORCE_AUTH_SECRET`, `WORKFORCE_AUTH_BASE_URL`.
 *
 * Deliberately a second, narrow config boundary alongside
 * `src/platform/config` rather than folded into `AppConfig`/`WebConfig`: these
 * four variables are not `BOBA_BEAR_*`-prefixed, are orthogonal to process
 * kind (web/worker/migration), and are validated once per realm rather than
 * once per process. This module never reads the real environment itself —
 * callers pass an explicit `AuthEnvSource` and the caller's already-validated
 * `AppEnvironment`, keeping the static build environment-variable-free (no
 * auth secret is required to run `npm run build`).
 */
import type { AppEnvironment } from "../../../platform/config";
import {
  CUSTOMER_AUTH_BASE_PATH,
  CUSTOMER_AUTH_COOKIE_PREFIX,
  CUSTOMER_REALM,
  KNOWN_PLACEHOLDER_AUTH_SECRETS,
  LOOPBACK_AUTH_HOSTNAMES,
  MIN_AUTH_SECRET_LENGTH,
  WORKFORCE_AUTH_BASE_PATH,
  WORKFORCE_AUTH_COOKIE_PREFIX,
  WORKFORCE_REALM,
} from "./constants";
import { AuthFoundationConfigurationError } from "./errors";
import type {
  AuthEnvSource,
  AuthFoundationConfig,
  CustomerAuthConfig,
  CustomerAuthSecret,
  WorkforceAuthConfig,
  WorkforceAuthSecret,
} from "./types";

const STAGING_OR_PRODUCTION: ReadonlySet<AppEnvironment> = new Set([
  "staging",
  "production",
]);

type FieldResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly message: string };

function ok<T>(value: T): FieldResult<T> {
  return { ok: true, value };
}

function fail<T>(message: string): FieldResult<T> {
  return { ok: false, message };
}

function validateAuthSecret(
  raw: string | undefined,
  otherSecret: string | undefined,
): FieldResult<string> {
  if (raw === undefined || raw.length === 0) {
    return fail(`Required. Must be at least ${MIN_AUTH_SECRET_LENGTH} characters.`);
  }
  if (raw.trim() !== raw) {
    return fail("Must not contain leading or trailing whitespace.");
  }
  if (raw.length < MIN_AUTH_SECRET_LENGTH) {
    return fail(`Must be at least ${MIN_AUTH_SECRET_LENGTH} characters.`);
  }
  if (KNOWN_PLACEHOLDER_AUTH_SECRETS.has(raw)) {
    return fail("Must not be a known placeholder or fallback secret value.");
  }
  if (otherSecret !== undefined && raw === otherSecret) {
    return fail("Must not equal the other realm's secret.");
  }
  return ok(raw);
}

function validateAuthBaseUrl(
  raw: string | undefined,
  environment: AppEnvironment,
): FieldResult<URL> {
  if (raw === undefined || raw.length === 0) {
    return fail("Required. Must be an absolute http(s) origin.");
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return fail("Must be an absolute http(s) origin (e.g. https://example.com).");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return fail("Scheme must be http or https.");
  }
  if (url.username !== "" || url.password !== "") {
    return fail("Must not contain a username or password.");
  }
  if (url.pathname !== "/" && url.pathname !== "") {
    return fail("Must not contain a path other than the root.");
  }
  if (url.search !== "") {
    return fail("Must not contain a query string.");
  }
  if (url.hash !== "") {
    return fail("Must not contain a fragment.");
  }

  const hostname = url.hostname.toLowerCase();
  const isLoopback = LOOPBACK_AUTH_HOSTNAMES.has(hostname);

  if (STAGING_OR_PRODUCTION.has(environment)) {
    if (url.protocol !== "https:") {
      return fail("HTTPS is required in staging and production.");
    }
    if (isLoopback) {
      return fail("Loopback hosts are prohibited in staging and production.");
    }
  }

  return ok(new URL(`${url.protocol}//${url.host}`));
}

export function validateCustomerAuthConfig(
  source: AuthEnvSource,
  environmentType: AppEnvironment,
): { ok: true; config: CustomerAuthConfig } | { ok: false; issues: SafeIssue[] } {
  const issues: SafeIssue[] = [];

  const secretResult = validateAuthSecret(
    source.CUSTOMER_AUTH_SECRET,
    source.WORKFORCE_AUTH_SECRET,
  );
  if (!secretResult.ok) {
    issues.push({ key: "CUSTOMER_AUTH_SECRET", message: secretResult.message });
  }

  const baseUrlResult = validateAuthBaseUrl(source.CUSTOMER_AUTH_BASE_URL, environmentType);
  if (!baseUrlResult.ok) {
    issues.push({ key: "CUSTOMER_AUTH_BASE_URL", message: baseUrlResult.message });
  }

  if (issues.length > 0) return { ok: false, issues };

  const config: CustomerAuthConfig = Object.freeze({
    realm: CUSTOMER_REALM,
    secret: (secretResult as { ok: true; value: string }).value as CustomerAuthSecret,
    baseURL: (baseUrlResult as { ok: true; value: URL }).value,
    basePath: CUSTOMER_AUTH_BASE_PATH,
    cookiePrefix: CUSTOMER_AUTH_COOKIE_PREFIX,
    environmentType,
  });
  return { ok: true, config };
}

export function validateWorkforceAuthConfig(
  source: AuthEnvSource,
  environmentType: AppEnvironment,
): { ok: true; config: WorkforceAuthConfig } | { ok: false; issues: SafeIssue[] } {
  const issues: SafeIssue[] = [];

  const secretResult = validateAuthSecret(
    source.WORKFORCE_AUTH_SECRET,
    source.CUSTOMER_AUTH_SECRET,
  );
  if (!secretResult.ok) {
    issues.push({ key: "WORKFORCE_AUTH_SECRET", message: secretResult.message });
  }

  const baseUrlResult = validateAuthBaseUrl(source.WORKFORCE_AUTH_BASE_URL, environmentType);
  if (!baseUrlResult.ok) {
    issues.push({ key: "WORKFORCE_AUTH_BASE_URL", message: baseUrlResult.message });
  }

  if (issues.length > 0) return { ok: false, issues };

  const config: WorkforceAuthConfig = Object.freeze({
    realm: WORKFORCE_REALM,
    secret: (secretResult as { ok: true; value: string }).value as WorkforceAuthSecret,
    baseURL: (baseUrlResult as { ok: true; value: URL }).value,
    basePath: WORKFORCE_AUTH_BASE_PATH,
    cookiePrefix: WORKFORCE_AUTH_COOKIE_PREFIX,
    environmentType,
  });
  return { ok: true, config };
}

interface SafeIssue {
  readonly key: string;
  readonly message: string;
}

/**
 * Load and validate both realms' configuration at once, throwing a single
 * {@link AuthFoundationConfigurationError} (safe issue list only) if either
 * realm is invalid.
 */
export function loadAuthFoundationConfig(
  source: AuthEnvSource,
  environmentType: AppEnvironment,
): AuthFoundationConfig {
  const customerResult = validateCustomerAuthConfig(source, environmentType);
  const workforceResult = validateWorkforceAuthConfig(source, environmentType);

  const issues: SafeIssue[] = [
    ...(customerResult.ok ? [] : customerResult.issues),
    ...(workforceResult.ok ? [] : workforceResult.issues),
  ];
  if (issues.length > 0) {
    throw new AuthFoundationConfigurationError(issues);
  }

  return Object.freeze({
    customer: (customerResult as { ok: true; config: CustomerAuthConfig }).config,
    workforce: (workforceResult as { ok: true; config: WorkforceAuthConfig }).config,
  });
}
