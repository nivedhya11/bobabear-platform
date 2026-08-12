/**
 * Public entry point for the BOBA Bear configuration boundary.
 *
 * Application code (outside `src/platform/config/**` and
 * `src/instrumentation.ts`) should import from here, not from the
 * individual modules, and must never read `process.env` directly.
 */
export type {
  AppConfig,
  AppEnvironment,
  BaseConfig,
  ConfigFor,
  DatabaseSslMode,
  EnvSource,
  LogLevel,
  MigrationConfig,
  ProcessKind,
  WebConfig,
  WorkerConfig,
} from "./types";
export {
  APP_ENVIRONMENTS,
  DATABASE_SSL_MODES,
  LOG_LEVELS,
  PROCESS_KINDS,
} from "./types";

export { ConfigurationError } from "./config-error";
export type { SafeConfigIssue } from "./config-error";

export { loadConfig } from "./load-config";
export { getRuntimeConfig, resetRuntimeConfigForTests } from "./runtime-config";

export {
  PUBLIC_ALLOWLIST,
  resolvePublicConfig,
} from "./public-config";
export type {
  PublicConfig,
  PublicConfigIssue,
  ResolvePublicConfigResult,
} from "./public-config";

export { formatSafeSummary, toSafeSummary } from "./summary";
export type { SafeConfigSummary } from "./summary";

export { isSensitiveKey, redactRecord, redactValue, REDACTED } from "./redaction";
