/**
 * Persistence role/context guards for Financial Document foundation.
 */
import { FinancialDocumentError } from "../../shared/financial-document";
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
    throw new FinancialDocumentError(
      "UPSTREAM_REFERENCE_INVALID",
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
    throw new FinancialDocumentError(
      "UPSTREAM_REFERENCE_INVALID",
      `${operation} requires a transaction context from Persistence.transaction().`,
    );
  }
}
