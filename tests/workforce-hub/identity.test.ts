import { describe, expect, it } from "vitest";

import { isOpaqueWorkforceUserId, resolveSignedInLabel } from "../../src/lib/workforce-hub/identity";

describe("signed-in identity label", () => {
  it("prefers email over workforce user id", () => {
    expect(
      resolveSignedInLabel({
        email: "uat-admin@bobabear.local",
        workforceUserId: "AKC5r0P7Go1dVlg6kpmZthDms1V5SU2h",
      }),
    ).toBe("uat-admin@bobabear.local");
  });

  it("does not present an opaque workforce id as the primary label", () => {
    const label = resolveSignedInLabel({
      workforceUserId: "00000000-0000-4000-8000-00000000psa1",
    });
    expect(label).toBe("Signed in");
    expect(isOpaqueWorkforceUserId("00000000-0000-4000-8000-00000000psa1")).toBe(true);
    expect(isOpaqueWorkforceUserId(label)).toBe(false);
  });
});
