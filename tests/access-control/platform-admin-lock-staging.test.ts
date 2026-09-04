import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("lockPlatformSuperAdminRoleRow (IMP-036C staging privilege fix)", () => {
  it("uses advisory lock instead of FOR UPDATE on SELECT-only access_roles", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/server/access-control/authorize.ts"),
      "utf8",
    );
    expect(source).toContain("pg_advisory_xact_lock");
    expect(source).toContain("hashtext('platform_super_admin')");
    expect(source).not.toMatch(
      /select key from app\.access_roles\s+where key = 'platform_super_admin'\s+for update/i,
    );
  });
});

describe("persistent staging principal resolution", () => {
  it("serviceability and operating UAT scripts load principal from workforce tables", () => {
    const serviceability = readFileSync(
      path.join(process.cwd(), "scripts/serviceability/set-distance-policy.ts"),
      "utf8",
    );
    const operating = readFileSync(
      path.join(process.cwd(), "scripts/assortment/configure-outlet-operating-uat.ts"),
      "utf8",
    );
    const bootstrap = readFileSync(
      path.join(process.cwd(), "scripts/access/bootstrap-dehradun-business.ts"),
      "utf8",
    );
    for (const source of [serviceability, operating, bootstrap]) {
      expect(source).toContain("resolveWorkforcePrincipalFromDatabase");
      expect(source).not.toMatch(/from ["'].*access-control-fixtures["']/);
      expect(source).not.toMatch(/\bprincipalFor\s*\(/);
    }
  });
});
