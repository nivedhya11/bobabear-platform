/**
 * Validation rules for the BOBA Bear application configuration boundary.
 *
 * This module owns environment parsing. It is deliberately hand-written
 * (rather than one big `z.object().refine()`) so that every rule in
 * ADR-015 has one obvious, testable home, and so that failures can be
 * collected as a full list of safe `{ key, message }` issues instead of
 * bailing out on the first problem.
 *
 * `zod` is used for the shape of the base object below; the environment-
 * specific business rules (origin format, release requirements, adapter
 * safeguards, ...) are expressed as small pure functions because they
 * depend on cross-field state (the selected `AppEnvironment`) that a single
 * declarative zod schema would make harder to read and to keep secret-safe.
 */
import { z } from "zod";

import type { SafeConfigIssue } from "./config-error";
import {
  APP_ENVIRONMENTS,
  DATABASE_SSL_MODES,
  LOG_LEVELS,
  type AppConfig,
  type AppEnvironment,
  type DatabaseSslMode,
  type EnvSource,
  type LogLevel,
  type ProcessKind,
} from "./types";

export const PAYMENT_PROVIDER_SELECTORS = ["disabled", "razorpay"] as const;
export type PaymentProviderSelector = (typeof PAYMENT_PROVIDER_SELECTORS)[number];

/** The complete, approved `BOBA_BEAR_*` variable catalogue for this slice. */
export const APPROVED_BOBA_BEAR_KEYS: ReadonlySet<string> = new Set([
  "BOBA_BEAR_ENV",
  "BOBA_BEAR_PUBLIC_ORIGIN",
  "BOBA_BEAR_LOG_LEVEL",
  "BOBA_BEAR_RELEASE",
  "BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS",
  "BOBA_BEAR_DATABASE_URL",
  "BOBA_BEAR_DATABASE_MIGRATION_URL",
  "BOBA_BEAR_DATABASE_SSL_MODE",
  "BOBA_BEAR_PAYMENT_PROVIDER",
  "BOBA_BEAR_RAZORPAY_KEY_ID",
  "BOBA_BEAR_RAZORPAY_KEY_SECRET",
  "BOBA_BEAR_RAZORPAY_WEBHOOK_SECRET",
]);

const STAGING_OR_PRODUCTION: ReadonlySet<AppEnvironment> = new Set([
  "staging",
  "production",
]);

const DEFAULT_LOG_LEVEL: Readonly<Record<AppEnvironment, LogLevel>> = {
  local: "debug",
  test: "warn",
  ci: "info",
  staging: "info",
  production: "info",
};

const DEFAULT_ALLOW_UNSAFE_ADAPTERS: Readonly<Record<AppEnvironment, boolean>> =
  {
    local: true,
    test: true,
    ci: false,
    staging: false,
    production: false,
  };

const DEFAULT_DATABASE_SSL_MODE: Readonly<Record<AppEnvironment, DatabaseSslMode>> =
  {
    local: "disable",
    test: "disable",
    ci: "disable",
    staging: "verify-full",
    production: "verify-full",
  };

type FieldResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly message: string };

function ok<T>(value: T): FieldResult<T> {
  return { ok: true, value };
}

function fail<T>(message: string): FieldResult<T> {
  return { ok: false, message };
}

/** Every `BOBA_BEAR_*` key present in `source` that is not approved. */
export function findUnknownBobaBearKeys(source: EnvSource): string[] {
  return Object.keys(source)
    .filter((key) => key.startsWith("BOBA_BEAR_"))
    .filter((key) => !APPROVED_BOBA_BEAR_KEYS.has(key))
    .sort();
}

function validateEnvironment(raw: string | undefined): FieldResult<AppEnvironment> {
  if (raw === undefined || raw.length === 0) {
    return fail(
      `Required. Must be one of: ${APP_ENVIRONMENTS.join(", ")}.`,
    );
  }
  if (!(APP_ENVIRONMENTS as readonly string[]).includes(raw)) {
    return fail(
      `Must be one of: ${APP_ENVIRONMENTS.join(", ")}. Aliases (e.g. "dev", "prod", "stage") are not accepted.`,
    );
  }
  return ok(raw as AppEnvironment);
}

const originShape = z.string().url();

/** Parse and normalize `BOBA_BEAR_PUBLIC_ORIGIN`, applying stricter rules
 * in staging/production. Returns the canonical `scheme://host[:port]`
 * string — never a mutable `URL` instance. */
function validatePublicOrigin(
  raw: string | undefined,
  environment: AppEnvironment,
): FieldResult<string> {
  if (raw === undefined || raw.length === 0) {
    return fail("Required. Must be an absolute http(s) origin.");
  }

  const shapeResult = originShape.safeParse(raw);
  if (!shapeResult.success) {
    return fail(
      "Must be an absolute http(s) origin (e.g. https://example.com).",
    );
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return fail(
      "Must be an absolute http(s) origin (e.g. https://example.com).",
    );
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
  const isLoopback =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]";

  if (STAGING_OR_PRODUCTION.has(environment)) {
    if (url.protocol !== "https:") {
      return fail("HTTPS is required in staging and production.");
    }
    if (isLoopback) {
      return fail("Loopback hosts are prohibited in staging and production.");
    }
  }

  return ok(`${url.protocol}//${url.host}`);
}

function validateLogLevel(
  raw: string | undefined,
  environment: AppEnvironment,
): FieldResult<LogLevel> {
  if (raw === undefined || raw.length === 0) {
    return ok(DEFAULT_LOG_LEVEL[environment]);
  }
  if (!(LOG_LEVELS as readonly string[]).includes(raw)) {
    return fail(`Must be one of: ${LOG_LEVELS.join(", ")}.`);
  }
  return ok(raw as LogLevel);
}

function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

function validateRelease(
  raw: string | undefined,
  environment: AppEnvironment,
): FieldResult<string | null> {
  const required = STAGING_OR_PRODUCTION.has(environment);
  if (raw === undefined || raw.length === 0) {
    if (required) {
      return fail("Required in staging and production.");
    }
    return ok(null);
  }
  if (raw.length > 128) {
    return fail("Must be at most 128 characters.");
  }
  if (/\s/.test(raw)) {
    return fail("Must not contain whitespace.");
  }
  if (hasControlCharacter(raw)) {
    return fail("Must not contain control characters.");
  }
  return ok(raw);
}

function validateAllowUnsafeAdapters(
  raw: string | undefined,
  environment: AppEnvironment,
): FieldResult<boolean> {
  if (raw === undefined || raw.length === 0) {
    return ok(DEFAULT_ALLOW_UNSAFE_ADAPTERS[environment]);
  }
  if (raw !== "true" && raw !== "false") {
    return fail('Must be exactly "true" or "false" (no "1"/"0"/"yes"/"no").');
  }
  const value = raw === "true";
  if (value && STAGING_OR_PRODUCTION.has(environment)) {
    return fail("Must not be \"true\" in staging or production.");
  }
  return ok(value);
}

function validateDatabaseSslMode(
  raw: string | undefined,
  environment: AppEnvironment,
): FieldResult<DatabaseSslMode> {
  if (raw === undefined || raw.length === 0) {
    return ok(DEFAULT_DATABASE_SSL_MODE[environment]);
  }
  if (!(DATABASE_SSL_MODES as readonly string[]).includes(raw)) {
    return fail(`Must be one of: ${DATABASE_SSL_MODES.join(", ")}.`);
  }
  const value = raw as DatabaseSslMode;
  if (STAGING_OR_PRODUCTION.has(environment) && value !== "verify-full") {
    return fail('Must be "verify-full" in staging and production.');
  }
  return ok(value);
}

const LOOPBACK_HOSTNAMES: ReadonlySet<string> = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
]);

/**
 * Validate a `postgresql://` connection string, returning the canonical,
 * re-serialized URL string as an opaque secret field.
 *
 * This never returns (or includes in an issue message) the raw input —
 * only a short, value-free description of what was wrong with it.
 */
function validateDatabaseUrl(
  raw: string | undefined,
  environment: AppEnvironment,
  sslMode: DatabaseSslMode,
): FieldResult<string> {
  if (raw === undefined || raw.length === 0) {
    return fail("Required. Must be a postgresql:// connection string.");
  }
  if (/\s/.test(raw) || hasControlCharacter(raw)) {
    return fail("Must not contain whitespace or control characters.");
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return fail("Must be a valid postgresql:// connection string.");
  }

  if (url.protocol !== "postgresql:") {
    return fail('Scheme must be exactly "postgresql:" (not "postgres:").');
  }
  if (url.hostname === "") {
    return fail("Must include a hostname.");
  }
  if (url.username === "") {
    return fail("Must include a username.");
  }
  const pathSegments = url.pathname.split("/").filter((segment) => segment.length > 0);
  if (pathSegments.length === 0) {
    return fail("Must include a database name.");
  }
  if (pathSegments.length > 1) {
    return fail("Must not include more than one path component.");
  }
  if (url.search !== "") {
    const params = new URLSearchParams(url.search);
    const sslParam = params.get("sslmode");
    if (sslParam !== null) {
      return fail(
        "Must not embed sslmode in the connection string; use BOBA_BEAR_DATABASE_SSL_MODE instead.",
      );
    }
    return fail("Must not include a query string.");
  }
  if (url.hash !== "") {
    return fail("Must not include a fragment.");
  }

  const hostname = url.hostname.toLowerCase();
  const isLoopback = LOOPBACK_HOSTNAMES.has(hostname);

  if (STAGING_OR_PRODUCTION.has(environment)) {
    if (isLoopback) {
      return fail("Loopback database hosts are prohibited in staging and production.");
    }
    if (url.password === "") {
      return fail("Must include a password in staging and production.");
    }
    if (sslMode !== "verify-full") {
      // Already reported against BOBA_BEAR_DATABASE_SSL_MODE, but a
      // connection string is not trustworthy without it either.
      return fail("Requires verify-full SSL mode in staging and production.");
    }
  }

  return ok(url.toString());
}

const PORT_PATTERN = /^\d+$/;

function validatePaymentProviderSelector(
  raw: string | undefined,
): FieldResult<PaymentProviderSelector> {
  if (raw === undefined || raw.length === 0) {
    return ok("disabled");
  }
  if (!(PAYMENT_PROVIDER_SELECTORS as readonly string[]).includes(raw)) {
    return fail('Must be exactly "disabled" or "razorpay". Fake is never a production selector.');
  }
  return ok(raw as PaymentProviderSelector);
}

function validateOptionalNonEmptySecret(
  raw: string | undefined,
): FieldResult<string | null> {
  if (raw === undefined || raw.length === 0) {
    return ok(null);
  }
  if (raw.trim() !== raw || /\s/.test(raw) || hasControlCharacter(raw)) {
    return fail("Must not contain whitespace or control characters.");
  }
  return ok(raw);
}

function validatePort(raw: string | undefined): FieldResult<number> {
  if (raw === undefined || raw.length === 0) {
    return ok(3000);
  }
  if (!PORT_PATTERN.test(raw)) {
    return fail("Must be an integer between 1 and 65535.");
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    return fail("Must be an integer between 1 and 65535.");
  }
  return ok(value);
}

function validateNodeEnvConsistency(
  nodeEnv: string | undefined,
  environment: AppEnvironment,
): SafeConfigIssue | null {
  if (STAGING_OR_PRODUCTION.has(environment) && nodeEnv !== "production") {
    return {
      key: "NODE_ENV",
      message: `Must be "production" when BOBA_BEAR_ENV is "${environment}".`,
    };
  }
  return null;
}

export interface ValidateSourceInput {
  readonly processKind: ProcessKind;
  readonly source: EnvSource;
}

export type ValidateSourceResult =
  | { readonly ok: true; readonly config: AppConfig }
  | { readonly ok: false; readonly issues: readonly SafeConfigIssue[] };

/**
 * Validate an explicit environment source against the full BOBA Bear
 * configuration contract for a given process kind, returning either a
 * fully-typed configuration object or a list of safe issues.
 *
 * This function never throws — callers decide how to surface failure
 * (the pure loader wraps it in `ConfigurationError`; tests can inspect the
 * issue list directly).
 */
export function validateSource({
  processKind,
  source,
}: ValidateSourceInput): ValidateSourceResult {
  const issues: SafeConfigIssue[] = [];

  for (const key of findUnknownBobaBearKeys(source)) {
    issues.push({ key, message: "Unknown BOBA_BEAR_* variable." });
  }

  const environmentResult = validateEnvironment(source.BOBA_BEAR_ENV);
  if (!environmentResult.ok) {
    issues.push({ key: "BOBA_BEAR_ENV", message: environmentResult.message });
    // Every remaining rule depends on knowing the environment, so bail out
    // early with just this issue rather than guessing defaults.
    return { ok: false, issues };
  }
  const environment = environmentResult.value;

  const nodeEnvIssue = validateNodeEnvConsistency(source.NODE_ENV, environment);
  if (nodeEnvIssue) issues.push(nodeEnvIssue);

  const originResult = validatePublicOrigin(
    source.BOBA_BEAR_PUBLIC_ORIGIN,
    environment,
  );
  if (!originResult.ok) {
    issues.push({
      key: "BOBA_BEAR_PUBLIC_ORIGIN",
      message: originResult.message,
    });
  }

  const logLevelResult = validateLogLevel(source.BOBA_BEAR_LOG_LEVEL, environment);
  if (!logLevelResult.ok) {
    issues.push({ key: "BOBA_BEAR_LOG_LEVEL", message: logLevelResult.message });
  }

  const releaseResult = validateRelease(source.BOBA_BEAR_RELEASE, environment);
  if (!releaseResult.ok) {
    issues.push({ key: "BOBA_BEAR_RELEASE", message: releaseResult.message });
  }

  const allowUnsafeAdaptersResult = validateAllowUnsafeAdapters(
    source.BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS,
    environment,
  );
  if (!allowUnsafeAdaptersResult.ok) {
    issues.push({
      key: "BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS",
      message: allowUnsafeAdaptersResult.message,
    });
  }

  const paymentProviderResult = validatePaymentProviderSelector(
    source.BOBA_BEAR_PAYMENT_PROVIDER,
  );
  if (!paymentProviderResult.ok) {
    issues.push({
      key: "BOBA_BEAR_PAYMENT_PROVIDER",
      message: paymentProviderResult.message,
    });
  }

  const razorpayKeyIdResult = validateOptionalNonEmptySecret(
    source.BOBA_BEAR_RAZORPAY_KEY_ID,
  );
  if (!razorpayKeyIdResult.ok) {
    issues.push({
      key: "BOBA_BEAR_RAZORPAY_KEY_ID",
      message: razorpayKeyIdResult.message,
    });
  }
  const razorpayKeySecretResult = validateOptionalNonEmptySecret(
    source.BOBA_BEAR_RAZORPAY_KEY_SECRET,
  );
  if (!razorpayKeySecretResult.ok) {
    issues.push({
      key: "BOBA_BEAR_RAZORPAY_KEY_SECRET",
      message: razorpayKeySecretResult.message,
    });
  }
  const razorpayWebhookSecretResult = validateOptionalNonEmptySecret(
    source.BOBA_BEAR_RAZORPAY_WEBHOOK_SECRET,
  );
  if (!razorpayWebhookSecretResult.ok) {
    issues.push({
      key: "BOBA_BEAR_RAZORPAY_WEBHOOK_SECRET",
      message: razorpayWebhookSecretResult.message,
    });
  }

  let portResult: FieldResult<number> | null = null;
  if (processKind === "web") {
    portResult = validatePort(source.PORT);
    if (!portResult.ok) {
      issues.push({ key: "PORT", message: portResult.message });
    }
  }

  const sslModeResult = validateDatabaseSslMode(
    source.BOBA_BEAR_DATABASE_SSL_MODE,
    environment,
  );
  if (!sslModeResult.ok) {
    issues.push({
      key: "BOBA_BEAR_DATABASE_SSL_MODE",
      message: sslModeResult.message,
    });
  }
  const sslMode: DatabaseSslMode = sslModeResult.ok ? sslModeResult.value : "disable";

  let databaseUrlResult: FieldResult<string> | null = null;
  if (processKind === "web" || processKind === "worker") {
    databaseUrlResult = validateDatabaseUrl(
      source.BOBA_BEAR_DATABASE_URL,
      environment,
      sslMode,
    );
    if (!databaseUrlResult.ok) {
      issues.push({
        key: "BOBA_BEAR_DATABASE_URL",
        message: databaseUrlResult.message,
      });
    }
  }

  let databaseMigrationUrlResult: FieldResult<string> | null = null;
  if (processKind === "migration") {
    databaseMigrationUrlResult = validateDatabaseUrl(
      source.BOBA_BEAR_DATABASE_MIGRATION_URL,
      environment,
      sslMode,
    );
    if (!databaseMigrationUrlResult.ok) {
      issues.push({
        key: "BOBA_BEAR_DATABASE_MIGRATION_URL",
        message: databaseMigrationUrlResult.message,
      });
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const base = {
    environment,
    processKind,
    publicOrigin: (originResult as { ok: true; value: string }).value,
    logLevel: (logLevelResult as { ok: true; value: LogLevel }).value,
    release: (releaseResult as { ok: true; value: string | null }).value,
    allowUnsafeAdapters: (
      allowUnsafeAdaptersResult as { ok: true; value: boolean }
    ).value,
    databaseSslMode: sslMode,
  };

  if (processKind === "web") {
    const port = (portResult as { ok: true; value: number }).value;
    const databaseUrl = (databaseUrlResult as { ok: true; value: string }).value;
    return {
      ok: true,
      config: { ...base, processKind: "web", port, databaseUrl },
    };
  }
  if (processKind === "worker") {
    const databaseUrl = (databaseUrlResult as { ok: true; value: string }).value;
    return {
      ok: true,
      config: { ...base, processKind: "worker", databaseUrl },
    };
  }
  const databaseMigrationUrl = (
    databaseMigrationUrlResult as { ok: true; value: string }
  ).value;
  return {
    ok: true,
    config: { ...base, processKind: "migration", databaseMigrationUrl },
  };
}
