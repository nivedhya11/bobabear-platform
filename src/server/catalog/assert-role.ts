import {
  CATALOG_CODE_MAX_LENGTH,
  CATALOG_CODE_MIN_LENGTH,
  CATALOG_CODE_PATTERN,
} from "../../shared/catalog";
import { isTransactionContext } from "../persistence/context-kind";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { CatalogValidationError } from "./errors";

export function assertApplicationRole(
  context: { readonly role: string },
  operation: string,
): void {
  if (context.role !== "application") {
    throw new CatalogValidationError({
      message: `${operation} requires an application-role persistence context, got role "${context.role}".`,
    });
  }
}

export function assertTransactionContext(
  context: PersistenceQueryContext,
  operation: string,
): asserts context is PersistenceTransactionContext {
  assertApplicationRole(context, operation);
  if (!isTransactionContext(context)) {
    throw new CatalogValidationError({
      message: `${operation} requires a transaction context from Persistence.transaction().`,
    });
  }
}

/** Normalize a catalog code: trim, lowercase, enforce `^[a-z0-9][a-z0-9_-]*$` (1–64). */
export function normalizeCatalogCode(value: string, field: string): string {
  if (typeof value !== "string") {
    throw new CatalogValidationError({ message: `${field} must be a non-empty string.` });
  }
  const normalized = value.trim().toLowerCase();
  if (
    normalized.length < CATALOG_CODE_MIN_LENGTH ||
    normalized.length > CATALOG_CODE_MAX_LENGTH ||
    !CATALOG_CODE_PATTERN.test(normalized)
  ) {
    throw new CatalogValidationError({
      message: `${field} must match ^[a-z0-9][a-z0-9_-]*$ and be 1–64 characters.`,
    });
  }
  return normalized;
}

export function normalizeName(value: string, field: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw new CatalogValidationError({ message: `${field} must be a non-empty string.` });
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new CatalogValidationError({ message: `${field} must be a non-empty string.` });
  }
  if (trimmed.length > maxLength) {
    throw new CatalogValidationError({
      message: `${field} must be at most ${maxLength} characters.`,
    });
  }
  return trimmed;
}

export function normalizeOptionalDescription(
  value: string | null | undefined,
  field: string,
  maxLength: number,
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new CatalogValidationError({ message: `${field} must be a string or null.` });
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > maxLength) {
    throw new CatalogValidationError({
      message: `${field} must be at most ${maxLength} characters.`,
    });
  }
  return trimmed;
}

export function driverCode(error: unknown): unknown {
  if (typeof error !== "object" || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  if (code !== undefined) return code;
  const cause = (error as { cause?: unknown }).cause;
  return typeof cause === "object" && cause !== null
    ? (cause as { code?: unknown }).code
    : undefined;
}

export function isUniqueViolation(error: unknown): boolean {
  return driverCode(error) === "23505";
}

export function isForeignKeyViolation(error: unknown): boolean {
  return driverCode(error) === "23503";
}

export function assertNonNegativeInt(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new CatalogValidationError({ message: `${field} must be a non-negative integer.` });
  }
  return value;
}

export function assertQuantityInRange(
  value: unknown,
  field: string,
  min: number,
  max: number,
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new CatalogValidationError({
      message: `${field} must be an integer between ${min} and ${max}.`,
    });
  }
  return value;
}
