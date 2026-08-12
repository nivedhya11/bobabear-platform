/**
 * DB-free service-level coverage for authorization errors and fail-closed
 * helpers (IMP-011). Heavy authorize scenarios live in
 * `tests/database/access-control.integration.test.ts`.
 */
import { describe, expect, it } from "vitest";

import {
  AccessControlConflictError,
  AccessControlInvalidTransitionError,
  AccessControlNotFoundError,
  AccessControlValidationError,
  AuthorizationError,
  BootstrapClosedError,
  BootstrapIneligibleError,
  DelegationCeilingError,
  LastPlatformAdminError,
  SelfElevationError,
} from "../../src/server/access-control/errors";
import { isPermissionKey } from "../../src/shared/access-control";

describe("access-control safe errors", () => {
  it("maps AuthorizationError to DENIED without leaking internals", () => {
    const error = new AuthorizationError();
    expect(error.decisionCode).toBe("DENIED");
    expect(error.accessControlErrorCode).toBe("unauthorized");
    const json = error.toSafeJSON();
    expect(json.decisionCode).toBe("DENIED");
    expect(JSON.stringify(json)).not.toMatch(/postgresql:\/\//i);
  });

  it("exposes stable codes for administration failures", () => {
    expect(new LastPlatformAdminError().accessControlErrorCode).toBe("last_platform_admin");
    expect(new BootstrapClosedError().accessControlErrorCode).toBe("bootstrap_closed");
    expect(new BootstrapIneligibleError().accessControlErrorCode).toBe("bootstrap_ineligible");
    expect(new DelegationCeilingError().accessControlErrorCode).toBe("delegation_ceiling");
    expect(new SelfElevationError().accessControlErrorCode).toBe("self_elevation");
    expect(new AccessControlConflictError({ message: "x" }).accessControlErrorCode).toBe(
      "conflict",
    );
    expect(
      new AccessControlInvalidTransitionError({ message: "x" }).accessControlErrorCode,
    ).toBe("invalid_transition");
    expect(new AccessControlValidationError({ message: "x" }).accessControlErrorCode).toBe(
      "validation",
    );
    expect(new AccessControlNotFoundError("membership").resourceType).toBe("membership");
  });

  it("rejects unknown permission keys before evaluation", () => {
    expect(isPermissionKey("outlet.read")).toBe(true);
    expect(isPermissionKey("not.a.permission")).toBe(false);
    expect(isPermissionKey("platform_super_admin")).toBe(false);
  });
});
