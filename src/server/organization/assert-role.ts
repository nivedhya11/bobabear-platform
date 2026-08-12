import { isTransactionContext } from "../persistence/context-kind";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { OrganizationValidationError } from "./errors";

export function assertApplicationRole(
  context: { readonly role: string },
  operation: string,
): void {
  if (context.role !== "application") {
    throw new OrganizationValidationError({
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
    throw new OrganizationValidationError({
      message: `${operation} requires a transaction context from Persistence.transaction().`,
    });
  }
}

export function normalizeNonEmptyCode(value: string, field: string): string {
  if (typeof value !== "string") {
    throw new OrganizationValidationError({ message: `${field} must be a non-empty string.` });
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new OrganizationValidationError({ message: `${field} must be a non-empty string.` });
  }
  return trimmed;
}

export function normalizeNonEmptyName(value: string, field: string): string {
  return normalizeNonEmptyCode(value, field);
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
