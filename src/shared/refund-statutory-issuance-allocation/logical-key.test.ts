import { describe, expect, it } from "vitest";

import { RefundStatutoryIssuanceAllocationError } from "./errors";
import { buildRefundStatutoryIssuanceAllocationLogicalKey } from "./logical-key";

describe("RefundStatutoryIssuanceAllocation logical key", () => {
  const decisionId = "a4d146c0-4363-4c83-8b0d-b8b6b7be9938";

  it("builds refund-statutory-decision:<decisionId>:ISSUANCE_ALLOCATION", () => {
    expect(buildRefundStatutoryIssuanceAllocationLogicalKey(decisionId)).toBe(
      `refund-statutory-decision:${decisionId}:ISSUANCE_ALLOCATION`,
    );
  });

  it("rejects non-UUID decisionId", () => {
    expect(() =>
      buildRefundStatutoryIssuanceAllocationLogicalKey("not-a-uuid"),
    ).toThrow(RefundStatutoryIssuanceAllocationError);
  });
});
