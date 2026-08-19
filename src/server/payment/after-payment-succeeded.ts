/**
 * Post-commit Payment SUCCEEDED side effects (IMP-028 Slice 8).
 *
 * Single application seam after durable Payment success authority:
 *   Order materialization (best-effort) + Receipt Voucher issuance (best-effort).
 * Never invoked inside the Payment success transaction.
 */
import type { Persistence } from "../persistence/types";
import { tryMaterializeOrderAfterPaymentCompletion } from "./order-materialize-hook";
import { tryIssueReceiptVoucherAfterPaymentSuccess } from "./receipt-voucher-hook";

export async function afterPaymentSucceeded(
  persistence: Persistence,
  input: Readonly<{ checkoutId: string; paymentId: string }>,
): Promise<void> {
  await tryMaterializeOrderAfterPaymentCompletion(
    persistence,
    input.checkoutId,
  );
  await tryIssueReceiptVoucherAfterPaymentSuccess(
    persistence,
    input.paymentId,
  );
}
