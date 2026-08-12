import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runProjectConsistency } from "./project-consistency.mjs";

describe("project:consistency", () => {
  it("passes against the repository governance baseline", () => {
    const findings = runProjectConsistency();
    const failures = findings.filter((f) => !f.ok);
    assert.equal(
      failures.length,
      0,
      failures.map((f) => `[${f.code}] ${f.message}`).join("\n"),
    );
  });

  it("emits at least one OK finding", () => {
    const findings = runProjectConsistency();
    assert.ok(findings.some((f) => f.ok));
  });
});
