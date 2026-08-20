/**
 * Best-effort RefundStatutoryDecision PENDING ensure after Refund PROCESSED
 * (IMP-028 / D-366).
 *
 * Invoked outside the Refund commercial transaction. Never fails Refund
 * money/provider truth. Uses dynamic import to avoid Refund↔statutory
 * hard cycles at module load.
 */
import type { Persistence } from "../persistence/types";

/**
 * Attempt to ensure PENDING RefundStatutoryDecision for a PROCESSED Refund.
 * Swallows all errors — Refund PROCESSED must remain durable.
 */
export async function tryEnsureRefundStatutoryDecisionPendingAfterProcessed(
  persistence: Persistence,
  refundId: string,
  now: Date,
): Promise<void> {
  try {
    const { ensurePendingForProcessedRefund } = await import(
      "../refund-statutory-decision/from-processed-refund"
    );
    await ensurePendingForProcessedRefund(persistence, refundId, now);
  } catch {
    // Recoverable gap: Refund PROCESSED + RefundStatutoryDecision absent.
    // Durable catch-up: recoverMissingRefundStatutoryDecisionsBatch.
  }
}
