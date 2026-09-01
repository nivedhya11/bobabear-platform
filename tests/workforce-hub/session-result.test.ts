import { describe, expect, it } from "vitest";

import { classifyPortalSessionResult } from "../../src/lib/workforce-hub/session-result";

describe("portal session outcome classification", () => {
  it("classifies 401 as authentication required", () => {
    expect(classifyPortalSessionResult({ ok: false, status: 401, code: "WORKFORCE_AUTH_REQUIRED" })).toBe(
      "authentication_required",
    );
  });

  it("does not treat transport failure as missing permission", () => {
    expect(classifyPortalSessionResult({ ok: false, status: 500, code: "INVALID_RESPONSE" })).toBe(
      "service_failure",
    );
    expect(classifyPortalSessionResult({ ok: false, status: 0, code: "NETWORK_ERROR" })).toBe("service_failure");
  });
});
