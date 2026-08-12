/**
 * Pure unit tests for trusted workforce principals (IMP-011).
 */
import { describe, expect, it } from "vitest";

import {
  createWorkforcePrincipalFromTrustedIdentity,
  isWorkforcePrincipal,
  requireWorkforcePrincipal,
  WorkforcePrincipalError,
} from "../../src/server/access-control/principal";

describe("createWorkforcePrincipalFromTrustedIdentity", () => {
  it("builds a branded principal for an eligible identity", () => {
    const principal = createWorkforcePrincipalFromTrustedIdentity({
      workforceUserId: "user-1",
      disabledAt: null,
      passwordChangeRequired: false,
      twoFactorEnabled: true,
    });
    expect(principal.workforceUserId).toBe("user-1");
    expect(principal.disabledAt).toBeNull();
    expect(principal.passwordChangeRequired).toBe(false);
    expect(principal.twoFactorEnabled).toBe(true);
    expect(isWorkforcePrincipal(principal)).toBe(true);
  });

  it("rejects disabled, password-change-required, and MFA-not-enabled identities", () => {
    expect(() =>
      createWorkforcePrincipalFromTrustedIdentity({
        workforceUserId: "user-1",
        disabledAt: new Date("2024-01-01T00:00:00.000Z"),
        passwordChangeRequired: false,
        twoFactorEnabled: true,
      }),
    ).toThrow(WorkforcePrincipalError);

    expect(() =>
      createWorkforcePrincipalFromTrustedIdentity({
        workforceUserId: "user-1",
        disabledAt: null,
        passwordChangeRequired: true,
        twoFactorEnabled: true,
      }),
    ).toThrow(/password/i);

    expect(() =>
      createWorkforcePrincipalFromTrustedIdentity({
        workforceUserId: "user-1",
        disabledAt: null,
        passwordChangeRequired: false,
        twoFactorEnabled: false,
      }),
    ).toThrow(/MFA/i);

    expect(() =>
      createWorkforcePrincipalFromTrustedIdentity({
        workforceUserId: "user-1",
        disabledAt: null,
        passwordChangeRequired: false,
        twoFactorEnabled: null,
      }),
    ).toThrow(WorkforcePrincipalError);
  });

  it("rejects missing workforceUserId", () => {
    expect(() =>
      createWorkforcePrincipalFromTrustedIdentity({
        workforceUserId: "",
        disabledAt: null,
        passwordChangeRequired: false,
        twoFactorEnabled: true,
      }),
    ).toThrow(/workforceUserId/i);
  });
});

describe("isWorkforcePrincipal / requireWorkforcePrincipal", () => {
  it("rejects plain untrusted objects even when fields look eligible", () => {
    const forged = {
      workforceUserId: "user-1",
      disabledAt: null,
      passwordChangeRequired: false,
      twoFactorEnabled: true,
    };
    expect(isWorkforcePrincipal(forged)).toBe(false);
    expect(() => requireWorkforcePrincipal(forged)).toThrow(WorkforcePrincipalError);
    expect(() => requireWorkforcePrincipal(forged)).toThrow(/trusted/i);
  });

  it("accepts only brand-created principals", () => {
    const principal = createWorkforcePrincipalFromTrustedIdentity({
      workforceUserId: "user-2",
      disabledAt: null,
      passwordChangeRequired: false,
      twoFactorEnabled: true,
    });
    expect(requireWorkforcePrincipal(principal)).toBe(principal);
    const safe = new WorkforcePrincipalError("untrusted", "x").toSafeJSON();
    expect(safe).toEqual({
      name: "WorkforcePrincipalError",
      message: "x",
      code: "untrusted",
    });
  });
});
