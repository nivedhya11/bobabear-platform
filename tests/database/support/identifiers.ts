/**
 * Safe PostgreSQL identifier generation, validation, and quoting for the
 * database integration-test harness (IMP-005). Test code must never
 * interpolate an unvalidated identifier into SQL — every identifier used to
 * create or drop a test database goes through this module.
 */
import { randomBytes } from "node:crypto";

export const TEST_DATABASE_PREFIX = "boba_test_";

/** PostgreSQL's unquoted-identifier limit is 63 bytes. */
const MAX_IDENTIFIER_LENGTH = 63;
const SAFE_IDENTIFIER_PATTERN = /^[a-z_][a-z0-9_]*$/;

export class UnsafeIdentifierError extends Error {
  constructor(identifier: string) {
    super(`Refusing to use unsafe PostgreSQL identifier: ${JSON.stringify(identifier)}`);
    this.name = "UnsafeIdentifierError";
  }
}

/** Throws {@link UnsafeIdentifierError} unless `identifier` is a lowercase
 * ASCII identifier within PostgreSQL's length limit. This is the single
 * validation boundary every generated/derived identifier must pass through
 * before it is ever concatenated into a SQL statement. */
export function assertSafeIdentifier(identifier: string): void {
  if (
    typeof identifier !== "string" ||
    identifier.length === 0 ||
    identifier.length > MAX_IDENTIFIER_LENGTH ||
    !SAFE_IDENTIFIER_PATTERN.test(identifier)
  ) {
    throw new UnsafeIdentifierError(identifier);
  }
}

/** Double-quote a validated identifier for interpolation into SQL DDL that
 * has no parameterized-identifier form (e.g. `CREATE DATABASE`). */
export function quoteIdentifier(identifier: string): string {
  assertSafeIdentifier(identifier);
  return `"${identifier}"`;
}

/** Generate a unique, safe test-database name — never accepts caller input,
 * so arbitrary identifiers can never reach a test database name. */
export function generateTestDatabaseName(): string {
  const suffix = randomBytes(8).toString("hex");
  const name = `${TEST_DATABASE_PREFIX}${suffix}`;
  assertSafeIdentifier(name);
  return name;
}
