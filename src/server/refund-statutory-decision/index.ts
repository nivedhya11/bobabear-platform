/**
 * Server-only RefundStatutoryDecision boundary (IMP-028 / D-366).
 *
 * PENDING ensure/load, operator-assisted BRANCH_FINALIZED seal, and
 * atomic RFV/CN ISSUED association. No HTTP/CLI, no automatic
 * classification, no signing.
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
