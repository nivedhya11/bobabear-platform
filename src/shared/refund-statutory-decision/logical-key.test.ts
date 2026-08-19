import { describe, expect, it } from "vitest";

import { RefundStatutoryDecisionError } from "./errors";
import {
  assertRefundStatutoryReversalLogicalKey,
  buildRefundStatutoryReversalLogicalKey,
} from "./logical-key";

describe("RefundStatutoryDecision logical key", () => {
  const refundId = "a4d146c0-4363-4c83-8b0d-b8b6b7be9938";

  it("builds refund:<refundId>:STATUTORY_REVERSAL", () => {
    expect(buildRefundStatutoryReversalLogicalKey(refundId)).toBe(
      `refund:${refundId}:STATUTORY_REVERSAL`,
    );
  });

  it("rejects non-UUID refundId", () => {
    expect(() => buildRefundStatutoryReversalLogicalKey("not-a-uuid")).toThrow(
      RefundStatutoryDecisionError,
    );
  });

  it("asserts exact logical key match", () => {
    expect(
      assertRefundStatutoryReversalLogicalKey(
        refundId,
        `refund:${refundId}:STATUTORY_REVERSAL`,
      ),
    ).toBe(`refund:${refundId}:STATUTORY_REVERSAL`);
    expect(() =>
      assertRefundStatutoryReversalLogicalKey(
        refundId,
        `refund:${refundId}:CREDIT_NOTE`,
      ),
    ).toThrow(RefundStatutoryDecisionError);
  });
});
