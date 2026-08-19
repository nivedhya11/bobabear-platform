/**
 * Persistence role/context guards for RefundStatutoryDecision (D-366).
 */
import { RefundStatutoryDecisionError } from "../../shared/refund-statutory-decision";
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
    throw new RefundStatutoryDecisionError(
      "REFUND_STATUTORY_DECISION_INVALID_INPUT",
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
    throw new RefundStatutoryDecisionError(
      "REFUND_STATUTORY_DECISION_INVALID_INPUT",
      `${operation} requires a transaction context from Persistence.transaction().`,
    );
  }
}
