/**
 * BRANCH_FINALIZED → ISSUED RFV/CN command (IMP-028 / D-366 final).
 *
 * Caller supplies only the decision identity and issuance timestamp.
 * Source document, arithmetic, and statutory type are resolved from sealed
 * repository authority — never from arbitrary caller UUID mixes.
 */
import type { FinancialDocument } from "../financial-document";
import { RefundStatutoryDecisionError } from "./errors";
import { assertRefundStatutoryUuid } from "./logical-key";
import type { RefundStatutoryDecision } from "./types";

export type IssueRefundStatutoryReversalCommand = Readonly<{
  decisionId: string;
  now: Date;
}>;

export type ParsedIssueRefundStatutoryReversalCommand = Readonly<{
  decisionId: string;
  now: Date;
}>;

export type IssueRefundStatutoryReversalResult = Readonly<{
  decision: RefundStatutoryDecision;
  financialDocument: FinancialDocument;
}>;

export function parseIssueRefundStatutoryReversalCommand(
  command: IssueRefundStatutoryReversalCommand,
): ParsedIssueRefundStatutoryReversalCommand {
  const decisionId = assertRefundStatutoryUuid(command.decisionId, "decisionId");
  if (!(command.now instanceof Date) || Number.isNaN(command.now.getTime())) {
    throw new RefundStatutoryDecisionError(
      "REFUND_STATUTORY_DECISION_INVALID_INPUT",
      "now must be a valid Date.",
      { field: "now" },
    );
  }
  return Object.freeze({
    decisionId,
    now: command.now,
  });
}
