import { describe, expect, it } from "vitest";

import {
  NOTIFICATION_MAX_ATTEMPTS_CEILING,
  isManualNotificationResendPermitted,
} from "./resend-eligibility";

describe("isManualNotificationResendPermitted", () => {
  it("permits FAILED and REVIEW_REQUIRED below the hard ceiling", () => {
    expect(
      isManualNotificationResendPermitted({
        status: "FAILED",
        attemptCount: BigInt(1),
        maxAttempts: BigInt(3),
      }),
    ).toBe(true);
    expect(
      isManualNotificationResendPermitted({
        status: "REVIEW_REQUIRED",
        attemptCount: BigInt(2),
        maxAttempts: BigInt(3),
      }),
    ).toBe(true);
  });

  it("denies when the hard attempt ceiling is exhausted", () => {
    expect(
      isManualNotificationResendPermitted({
        status: "FAILED",
        attemptCount: NOTIFICATION_MAX_ATTEMPTS_CEILING,
        maxAttempts: NOTIFICATION_MAX_ATTEMPTS_CEILING,
      }),
    ).toBe(false);
  });

  it("denies non-resendable statuses even with remaining attempts", () => {
    expect(
      isManualNotificationResendPermitted({
        status: "ACCEPTED",
        attemptCount: BigInt(0),
        maxAttempts: BigInt(3),
      }),
    ).toBe(false);
  });
});
