/**
 * Serviceability role / transaction guards (IMP-019).
 */
import { ServiceabilityError } from "../../shared/serviceability";
import { isTransactionContext } from "../persistence/context-kind";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";

export function assertApplicationRole(
  context: { readonly role: string },
  operation: string,
): void {
  if (context.role !== "application") {
    throw new ServiceabilityError(
      "SERVICEABILITY_PERSISTENCE_ERROR",
      `${operation} requires an application-role persistence context.`,
    );
  }
}

export function assertTransactionContext(
  context: PersistenceQueryContext,
  operation: string,
): asserts context is PersistenceTransactionContext {
  assertApplicationRole(context, operation);
  if (!isTransactionContext(context)) {
    throw new ServiceabilityError(
      "SERVICEABILITY_PERSISTENCE_ERROR",
      `${operation} requires a transaction context from Persistence.transaction().`,
    );
  }
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
  if (driverCode(error) === "23505") return true;
  if (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "23505"
  ) {
    return true;
  }
  return false;
}
