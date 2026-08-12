import { isTransactionContext } from "../persistence/context-kind";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { PaymentError } from "../../shared/payment";

export function assertApplicationRole(
  context: { readonly role: string },
  operation: string,
): void {
  if (context.role !== "application") {
    throw new PaymentError(
      "PAYMENT_INVALID_INPUT",
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
    throw new PaymentError(
      "PAYMENT_INVALID_INPUT",
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
  return driverCode(error) === "23505";
}
