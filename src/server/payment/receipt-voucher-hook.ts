/**
 * Best-effort Receipt Voucher issuance after Payment SUCCEEDED (IMP-028 Slice 8).
 *
 * Invoked outside the Payment transaction. Never fails Payment / Checkout /
 * provider evidence. Uses dynamic import to avoid Payment↔FinancialDocument
 * hard cycles at module load.
 */
import type { Persistence } from "../persistence/types";

/**
 * Attempt automatic RECEIPT_VOUCHER issuance for a succeeded Payment.
 * Swallows all errors — Payment success must remain durable.
 */
export async function tryIssueReceiptVoucherAfterPaymentSuccess(
  persistence: Persistence,
  paymentId: string,
): Promise<void> {
  try {
    const { issueReceiptVoucherForSucceededPayment } = await import(
      "../financial-document/receipt-voucher-from-payment"
    );
    await issueReceiptVoucherForSucceededPayment(persistence, paymentId);
  } catch {
    // Recoverable gap: Payment SUCCEEDED + Receipt Voucher absent.
    // Durable catch-up: recoverMissingReceiptVouchersBatch.
  }
}
