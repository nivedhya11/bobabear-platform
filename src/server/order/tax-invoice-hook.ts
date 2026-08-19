/**
 * Best-effort Tax Invoice issuance after Order FULFILLED (IMP-028 Slice 9).
 *
 * Invoked outside the Order fulfillment transaction. Never fails Order
 * fulfillment truth. Uses dynamic import to avoid Order↔FinancialDocument
 * hard cycles at module load.
 */
import type { Persistence } from "../persistence/types";

/**
 * Attempt automatic TAX_INVOICE issuance for a fulfilled Order.
 * Swallows all errors — Order FULFILLED must remain durable.
 */
export async function tryIssueTaxInvoiceAfterOrderFulfilled(
  persistence: Persistence,
  orderId: string,
): Promise<void> {
  try {
    const { issueTaxInvoiceForFulfilledOrder } = await import(
      "../financial-document/tax-invoice-from-order"
    );
    await issueTaxInvoiceForFulfilledOrder(persistence, orderId);
  } catch {
    // Recoverable gap: Order FULFILLED + Tax Invoice absent.
    // Durable catch-up: recoverMissingTaxInvoicesBatch.
  }
}
