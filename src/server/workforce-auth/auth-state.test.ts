/**
 * Unit tests for workforce auth lifecycle state mapping (IMP-010).
 */
import { describe, expect, it } from "vitest";

import {
  isFullyAuthenticated,
  resolveWorkforceAuthLifecycle,
  type WorkforceAuthLifecycleUser,
} from "./auth-state";

const baseUser: WorkforceAuthLifecycleUser = {
  id: "user-1",
  disabledAt: null,
  passwordChangeRequired: false,
  twoFactorEnabled: true,
};

describe("resolveWorkforceAuthLifecycle", () => {
  it("returns UNAUTHENTICATED when no session is present", () => {
    expect(
      resolveWorkforceAuthLifecycle({ sessionPresent: false, user: baseUser }),
    ).toBe("UNAUTHENTICATED");
  });

  it("returns UNAUTHENTICATED when the user is missing", () => {
    expect(
      resolveWorkforceAuthLifecycle({ sessionPresent: true, user: null }),
    ).toBe("UNAUTHENTICATED");
  });

  it("returns UNAUTHENTICATED when disabledAt is set", () => {
    expect(
      resolveWorkforceAuthLifecycle({
        sessionPresent: true,
        user: { ...baseUser, disabledAt: new Date("2026-01-01T00:00:00.000Z") },
      }),
    ).toBe("UNAUTHENTICATED");
  });

  it("returns PASSWORD_CHANGE_REQUIRED before MFA enrollment", () => {
    expect(
      resolveWorkforceAuthLifecycle({
        sessionPresent: true,
        user: {
          ...baseUser,
          passwordChangeRequired: true,
          twoFactorEnabled: false,
        },
      }),
    ).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it("returns MFA_ENROLLMENT_REQUIRED when password is OK but MFA is off", () => {
    expect(
      resolveWorkforceAuthLifecycle({
        sessionPresent: true,
        user: { ...baseUser, twoFactorEnabled: false },
      }),
    ).toBe("MFA_ENROLLMENT_REQUIRED");
  });

  it("returns MFA_CHALLENGE_REQUIRED when twoFactorChallengePending is set", () => {
    expect(
      resolveWorkforceAuthLifecycle({
        sessionPresent: false,
        user: null,
        twoFactorChallengePending: true,
      }),
    ).toBe("MFA_CHALLENGE_REQUIRED");
  });

  it("returns AUTHENTICATED only when fully ready", () => {
    expect(
      resolveWorkforceAuthLifecycle({ sessionPresent: true, user: baseUser }),
    ).toBe("AUTHENTICATED");
  });
});

describe("isFullyAuthenticated", () => {
  it("is true only for AUTHENTICATED", () => {
    expect(isFullyAuthenticated("AUTHENTICATED")).toBe(true);
    expect(isFullyAuthenticated("MFA_ENROLLMENT_REQUIRED")).toBe(false);
  });
});
