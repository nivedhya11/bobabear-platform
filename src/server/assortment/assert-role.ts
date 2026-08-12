import { isTransactionContext } from "../persistence/context-kind";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { AssortmentValidationError } from "./errors";

export function assertApplicationRole(
  context: { readonly role: string },
  operation: string,
): void {
  if (context.role !== "application") {
    throw new AssortmentValidationError({
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
    throw new AssortmentValidationError({
      message: `${operation} requires a transaction context from Persistence.transaction().`,
    });
  }
}

export function assertUuid(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new AssortmentValidationError({ message: `${field} must be a non-empty string.` });
  }
  return value;
}

export function normalizeOptionalReasonCode(
  value: string | null | undefined,
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new AssortmentValidationError({ message: "reasonCode must be a string or null." });
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 64) {
    throw new AssortmentValidationError({
      message: "reasonCode must be at most 64 characters.",
    });
  }
  return trimmed;
}

export function normalizeOptionalNote(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new AssortmentValidationError({ message: "note must be a string or null." });
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 500) {
    throw new AssortmentValidationError({ message: "note must be at most 500 characters." });
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
