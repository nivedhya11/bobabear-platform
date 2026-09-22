import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { verifyOriginTrustContracts } from "./verify-contracts.mjs";

describe("origin-trust verify-contracts (lab/config)", () => {
  it("validates repository nginx + fixtures and records PRODUCTION_REALIZATION_PENDING", () => {
    const result = verifyOriginTrustContracts();
    assert.equal(result.ok, true);
    assert.equal(result.PRODUCTION_REALIZATION_PENDING, true);
    assert.equal(result.IMP039_ACTIVATED, false);
    assert.ok(result.checks.length >= 8);
    assert.ok(
      result.checks.some((c) => c.includes("XFF replace")),
      "expected XFF replace check",
    );
    assert.ok(
      result.checks.some((c) => c.includes("ssl_verify_client")),
      "expected AOP fixture check",
    );
    assert.ok(
      result.checks.some((c) => c.includes("negative probe")),
      "expected firewall negative probe",
    );
  });
});
