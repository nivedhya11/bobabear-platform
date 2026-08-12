/**
 * Database connection option builders.
 *
 * This module turns an already-validated connection string and SSL mode
 * (from the IMP-003 configuration boundary) into `pg.PoolConfig` options.
 * It does not parse environment variables itself — that remains the
 * config boundary's job (see AGENTS.md / src/platform/config).
 */
import type { PoolConfig } from "pg";

import type { DatabaseSslMode } from "../config";

export interface CreateConnectionOptionsInput {
  /** Canonical `postgresql://` connection string. Never logged. */
  readonly connectionString: string;
  readonly sslMode: DatabaseSslMode;
  /** Reported to Postgres as `application_name` for diagnostics. Must be a
   * short, safe, static identifier — never a value derived from user input
   * or from the connection string itself. */
  readonly applicationName: string;
  /** Defaults to 1 — safe for one-shot CLI scripts. Long-lived pools (a
   * later slice's request-serving pool) should pass an explicit value. */
  readonly poolSize?: number;
  readonly connectionTimeoutMillis?: number;
  readonly idleTimeoutMillis?: number;
}

const DEFAULT_POOL_SIZE = 1;
const DEFAULT_CONNECTION_TIMEOUT_MILLIS = 5000;
const DEFAULT_IDLE_TIMEOUT_MILLIS = 1000;

const SAFE_APPLICATION_NAME_PATTERN = /^[A-Za-z0-9._-]{1,63}$/;

/** Validate that an application_name is a short, static, safe identifier —
 * never something that could carry secret-shaped content into Postgres's
 * process list / logs. */
export function assertSafeApplicationName(applicationName: string): void {
  if (!SAFE_APPLICATION_NAME_PATTERN.test(applicationName)) {
    throw new Error(
      "Invalid application_name: must be 1-63 characters of letters, digits, '.', '_' or '-'.",
    );
  }
}

/**
 * Build `pg.PoolConfig` from a validated connection string and SSL mode.
 *
 * `disable` never enables TLS. `verify-full` enables full certificate
 * verification (`rejectUnauthorized: true`) and never sets
 * `rejectUnauthorized: false`.
 */
export function createConnectionOptions(
  input: CreateConnectionOptionsInput,
): PoolConfig {
  assertSafeApplicationName(input.applicationName);

  const poolConfig: PoolConfig = {
    connectionString: input.connectionString,
    application_name: input.applicationName,
    max: input.poolSize ?? DEFAULT_POOL_SIZE,
    connectionTimeoutMillis:
      input.connectionTimeoutMillis ?? DEFAULT_CONNECTION_TIMEOUT_MILLIS,
    idleTimeoutMillis: input.idleTimeoutMillis ?? DEFAULT_IDLE_TIMEOUT_MILLIS,
  };

  if (input.sslMode === "verify-full") {
    poolConfig.ssl = { rejectUnauthorized: true };
  }
  // "disable" leaves `ssl` unset entirely — no TLS is negotiated.

  return poolConfig;
}

/** A safe, redacted projection of connection options suitable for logging
 * or CLI diagnostics — never includes the connection string itself. */
export interface SafeConnectionOptionsSummary {
  readonly applicationName: string;
  readonly sslEnabled: boolean;
  readonly poolSize: number;
  readonly connectionTimeoutMillis: number;
  readonly idleTimeoutMillis: number;
}

export function toSafeConnectionOptionsSummary(
  input: CreateConnectionOptionsInput,
): SafeConnectionOptionsSummary {
  return {
    applicationName: input.applicationName,
    sslEnabled: input.sslMode === "verify-full",
    poolSize: input.poolSize ?? DEFAULT_POOL_SIZE,
    connectionTimeoutMillis:
      input.connectionTimeoutMillis ?? DEFAULT_CONNECTION_TIMEOUT_MILLIS,
    idleTimeoutMillis: input.idleTimeoutMillis ?? DEFAULT_IDLE_TIMEOUT_MILLIS,
  };
}
