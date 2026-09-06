import { describe, expect, it } from "vitest";

import { RefundError } from "../../shared/refund";
import { throwMappedOrderRefundReplayAuthorizationFailure } from "./replay-authorization";

describe("throwMappedOrderRefundReplayAuthorizationFailure", () => {
  it("preserves REFUND_UNAUTHORIZED", () => {
    const error = new RefundError("REFUND_UNAUTHORIZED", "Not authorized for this Refund operation.");
    expect(() => throwMappedOrderRefundReplayAuthorizationFailure(error)).toThrow(error);
  });

  it("preserves expected REFUND_NOT_FOUND without disclosure changes", () => {
    try {
      throwMappedOrderRefundReplayAuthorizationFailure(
        new RefundError("REFUND_NOT_FOUND", "Refund not found."),
      );
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RefundError);
      expect((error as RefundError).code).toBe("REFUND_NOT_FOUND");
    }
  });

  it("rethrows unexpected RefundError codes", () => {
    const error = new RefundError(
      "REFUND_PROVIDER_UNAVAILABLE",
      "Refund provider capability is unavailable.",
    );
    expect(() => throwMappedOrderRefundReplayAuthorizationFailure(error)).toThrow(error);
  });

  it("rethrows unexpected runtime/programming failures", () => {
    const error = new Error("connection reset");
    expect(() => throwMappedOrderRefundReplayAuthorizationFailure(error)).toThrow(error);
  });
});
