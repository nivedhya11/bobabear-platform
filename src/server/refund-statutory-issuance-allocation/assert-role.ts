/**
 * Persistence role/context guards for RefundStatutoryIssuanceAllocation (D-366 Slice 3A).
 */
import { RefundStatutoryIssuanceAllocationError } from "../../shared/refund-statutory-issuance-allocation";
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
    throw new RefundStatutoryIssuanceAllocationError(
      "REFUND_STATUTORY_ISSUANCE_ALLOCATION_INVALID_INPUT",
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
    throw new RefundStatutoryIssuanceAllocationError(
      "REFUND_STATUTORY_ISSUANCE_ALLOCATION_INVALID_INPUT",
      `${operation} requires a transaction context from Persistence.transaction().`,
    );
  }
}
