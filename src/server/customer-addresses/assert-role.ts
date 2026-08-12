import { isTransactionContext } from "../persistence/context-kind";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { CustomerAddressError } from "../../shared/customer-addresses";

export function assertApplicationRole(
  context: { readonly role: string },
  operation: string,
): void {
  if (context.role !== "application") {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_PERSISTENCE_ERROR",
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
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_PERSISTENCE_ERROR",
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

export function isForeignKeyViolation(error: unknown): boolean {
  return driverCode(error) === "23503";
}
