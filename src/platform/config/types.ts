/**
 * Typed configuration shapes for the BOBA Bear application boundary.
 *
 * These types describe the *application-facing* configuration surface only.
 * They intentionally do not mirror environment-variable names — the schema
 * module (`schema.ts`) owns the mapping from raw environment variables to
 * these fields.
 */

export const APP_ENVIRONMENTS = [
  "local",
  "test",
  "ci",
  "staging",
  "production",
] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

export const PROCESS_KINDS = ["web", "worker", "migration"] as const;

export type ProcessKind = (typeof PROCESS_KINDS)[number];

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

export const DATABASE_SSL_MODES = ["disable", "verify-full"] as const;

export type DatabaseSslMode = (typeof DATABASE_SSL_MODES)[number];

/** Fields shared by every process kind. */
export interface BaseConfig {
  readonly environment: AppEnvironment;
  readonly processKind: ProcessKind;
  readonly publicOrigin: string;
  readonly logLevel: LogLevel;
  readonly release: string | null;
  readonly allowUnsafeAdapters: boolean;
  readonly databaseSslMode: DatabaseSslMode;
}

export interface WebConfig extends BaseConfig {
  readonly processKind: "web";
  readonly port: number;
  /** Canonical `postgresql://` connection string for the runtime
   * application role. Never logged, never included in safe summaries. */
  readonly databaseUrl: string;
}

export interface WorkerConfig extends BaseConfig {
  readonly processKind: "worker";
  /** Canonical `postgresql://` connection string for the runtime
   * application role. Never logged, never included in safe summaries. */
  readonly databaseUrl: string;
}

export interface MigrationConfig extends BaseConfig {
  readonly processKind: "migration";
  /** Canonical `postgresql://` connection string for the migration role.
   * Never logged, never included in safe summaries. */
  readonly databaseMigrationUrl: string;
}

/** Discriminated union of every process-specific configuration shape. */
export type AppConfig = WebConfig | WorkerConfig | MigrationConfig;

/** Narrow an `AppConfig` to the shape for a specific process kind. */
export type ConfigFor<K extends ProcessKind> = Extract<
  AppConfig,
  { processKind: K }
>;

/** Raw environment source. Deliberately just a string-keyed record —
 * consumers must not assume this is `process.env` itself. */
export type EnvSource = Readonly<Record<string, string | undefined>>;
