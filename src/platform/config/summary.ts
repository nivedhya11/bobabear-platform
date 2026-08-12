/**
 * Safe configuration summary for startup logs and CLI output.
 *
 * Only fields explicitly approved for display appear here. This must never
 * be replaced with a generic `JSON.stringify(config)` — that would silently
 * start leaking any field added to `AppConfig` in a later slice before its
 * safety has been reviewed.
 */
import type { AppConfig } from "./types";

export interface SafeConfigSummary {
  readonly environment: string;
  readonly processKind: string;
  readonly publicOrigin: string;
  readonly logLevel: string;
  readonly releasePresent: boolean;
  readonly allowUnsafeAdapters: boolean;
  readonly port?: number;
  /** Whether a database connection string was successfully validated for
   * this process kind. Never the URL itself, never host/port/user/db. */
  readonly databaseConfigured: boolean;
  readonly databaseSslMode: string;
}

/** Project an `AppConfig` down to the fields that are safe to print. */
export function toSafeSummary(config: AppConfig): SafeConfigSummary {
  const summary: SafeConfigSummary = {
    environment: config.environment,
    processKind: config.processKind,
    publicOrigin: config.publicOrigin,
    logLevel: config.logLevel,
    releasePresent: config.release !== null,
    allowUnsafeAdapters: config.allowUnsafeAdapters,
    databaseConfigured:
      config.processKind === "migration"
        ? config.databaseMigrationUrl.length > 0
        : config.databaseUrl.length > 0,
    databaseSslMode: config.databaseSslMode,
  };
  if (config.processKind === "web") {
    return { ...summary, port: config.port };
  }
  return summary;
}

/** Render a safe summary as a single concise line, suitable for one log
 * line per process initialization or one line of CLI success output. */
export function formatSafeSummary(config: AppConfig): string {
  const summary = toSafeSummary(config);
  const parts = [
    `environment=${summary.environment}`,
    `processKind=${summary.processKind}`,
    `publicOrigin=${summary.publicOrigin}`,
    `logLevel=${summary.logLevel}`,
    `release=${summary.releasePresent ? "present" : "absent"}`,
    `allowUnsafeAdapters=${summary.allowUnsafeAdapters}`,
    `databaseConfigured=${summary.databaseConfigured}`,
    `databaseSslMode=${summary.databaseSslMode}`,
  ];
  if (summary.port !== undefined) {
    parts.push(`port=${summary.port}`);
  }
  return `BOBA Bear configuration OK (${parts.join(", ")})`;
}
