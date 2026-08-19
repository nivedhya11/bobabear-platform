/**
 * Server-only Refund domain boundary (IMP-027).
 *
 * No customer HTTP. No Operations Console transport.
 */
import "server-only";

export { RefundError } from "../../shared/refund";
export type {
  NormalizedRefundEvidence,
  Refund,
  RefundResult,
} from "../../shared/refund";

export { systemRefundClock, fixedRefundClock, type RefundClock } from "./clock";
export {
  requestRefund,
  getRefund,
  reconcileRefund,
  applyRefundProviderEvidence,
  reconcileNonTerminalRefundsBatch,
  getRefundBalanceForPayment,
  type RefundOperationOptions,
} from "./operations";
export { RefundReconciliationProcessor, REFUND_RECONCILE_POLL_INTERVAL_MS } from "./reconciliation";
