import { describe, expect, it } from "vitest";

import { RefundStatutoryDecisionError } from "./errors";
import { parseIssueRefundStatutoryReversalCommand } from "./issuance-command";

const DECISION_ID = "11111111-1111-4111-8111-111111111111";

describe("D-366 RFV/CN issuance command parsing", () => {
  it("parses decisionId and issuance timestamp", () => {
    const now = new Date("2026-08-09T12:00:00.000Z");
    const parsed = parseIssueRefundStatutoryReversalCommand({
      decisionId: DECISION_ID,
      now,
    });
    expect(parsed.decisionId).toBe(DECISION_ID);
    expect(parsed.now).toBe(now);
  });

  it("rejects non-UUID decisionId and invalid now", () => {
    expect(() =>
      parseIssueRefundStatutoryReversalCommand({
        decisionId: "not-a-uuid",
        now: new Date(),
      }),
    ).toThrow(RefundStatutoryDecisionError);
    expect(() =>
      parseIssueRefundStatutoryReversalCommand({
        decisionId: DECISION_ID,
        now: new Date("invalid"),
      }),
    ).toThrow(RefundStatutoryDecisionError);
  });
});
