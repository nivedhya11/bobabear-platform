/**
 * Server-only RefundStatutoryDecision boundary (IMP-028 / D-366).
 *
 * PENDING ensure/load, operator-assisted BRANCH_FINALIZED seal, and
 * atomic RFV/CN ISSUED association. No HTTP, no automatic classification,
 * no signing. Missing-PENDING catch-up is D-362-style operator recovery.
 */
import "server-only";

export {
  RefundStatutoryDecisionError,
  buildRefundStatutoryReversalLogicalKey,
} from "../../shared/refund-statutory-decision";
export type {
  FinalizeRefundStatutoryDecisionCommand,
  IssueRefundStatutoryReversalCommand,
  IssueRefundStatutoryReversalResult,
  RefundStatutoryDecision,
  RefundStatutoryDecisionStatus,
  RefundStatutoryDisposition,
} from "../../shared/refund-statutory-decision";

export { finalizeRefundStatutoryDecision } from "./finalize";
export { issueRefundStatutoryReversal } from "./issue";
export type { IssueRefundStatutoryReversalOptions } from "./issue";

export {
  ensureRefundStatutoryDecisionPending,
  findProcessedRefundIdsMissingStatutoryDecision,
  findRefundStatutoryDecisionById,
  findRefundStatutoryDecisionByRefundId,
  loadRefundStatutoryDecisionById,
  loadRefundStatutoryDecisionByRefundId,
  lockRefundStatutoryDecisionForUpdate,
  mapRefundStatutoryDecisionRow,
  newRefundStatutoryDecisionId,
  sealRefundStatutoryDecisionBranch,
  sealRefundStatutoryDecisionIssued,
  type RefundStatutoryDecisionRow,
} from "./repository";

export {
  ensurePendingForProcessedRefund,
  recoverMissingRefundStatutoryDecisionsBatch,
} from "./from-processed-refund";
export type {
  RecoverMissingRefundStatutoryDecisionsOptions,
  RefundStatutoryDecisionRecoveryBatchResult,
  RefundStatutoryDecisionRecoveryItemResult,
} from "./from-processed-refund";
