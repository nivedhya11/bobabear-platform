/**
 * Server-only Refund domain boundary (IMP-027 / IMP-036D).
 *
 * No customer HTTP. Operations Console transport is thin and lives under
 * `src/server/operations/http` — this module remains domain authority only.
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
  reserveOrderRefund,
  getOrderRefundSupport,
  getRefund,
  reconcileRefund,
  applyRefundProviderEvidence,
  reconcileNonTerminalRefundsBatch,
  getRefundBalanceForPayment,
  type RefundOperationOptions,
} from "./operations";
export { RefundReconciliationProcessor, REFUND_RECONCILE_POLL_INTERVAL_MS } from "./reconciliation";
