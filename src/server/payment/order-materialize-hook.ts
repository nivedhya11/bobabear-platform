/**
 * Best-effort Order materialization after Payment completion (IMP-023).
 *
 * Invoked outside the Payment transaction. Never fails Payment / Checkout.
 * Uses dynamic import to avoid a hard Payment↔Order cycle at module load.
 */

import type { Persistence } from "../persistence/types";

const DEFAULT_ORDER_POLICY = Object.freeze({
  orderNumberMaxAttempts: 8,
  recoveryBatchSize: 25,
});

/**
 * Attempt to materialize an Order for a completed Checkout.
 * Swallows all errors — Payment success must remain durable.
 */
export async function tryMaterializeOrderAfterPaymentCompletion(
  persistence: Persistence,
  checkoutId: string,
): Promise<void> {
  try {
    const { materializeOrderForCompletedCheckout } = await import(
      "../order/materialize"
    );
    await materializeOrderForCompletedCheckout(persistence, checkoutId, {
      policy: DEFAULT_ORDER_POLICY,
    });
  } catch {
    // Recoverable gap: Checkout COMPLETED + Payment SUCCEEDED + Order absent.
  }
}
