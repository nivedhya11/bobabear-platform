import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  assertDecisionRegisterGlobalTableColumnCounts,
  countDecisionRegisterTableColumns,
} from "./project-consistency.mjs";

describe("decision-register Current Global Decisions column count", () => {
  it("counts unescaped pipes only (\\| inside cells is content)", () => {
    const row =
      "| D-357 | lifecycle is PLACED \\| ACCEPTED \\| FULFILLED \\| CANCELLED | Order | CURRENT | record | — | — | ARCH-G07 |";
    assert.equal(countDecisionRegisterTableColumns(row), 8);
  });

  it("detects truncated rows (too few columns)", () => {
    const row = "| D-375 | Title only | Security | CURRENT |";
    assert.equal(countDecisionRegisterTableColumns(row), 4);
  });

  it("detects accidental blank Record shifting fields (too many columns)", () => {
    const row =
      "| D-376 | Title | Scope | CURRENT | | Record leaked | Supersedes | — | Governs |";
    assert.equal(countDecisionRegisterTableColumns(row), 9);
  });

  it("fails assert helper when a D-* row has the wrong column count", () => {
    const failures = [];
    const text = [
      "## 2. Current Global Decisions",
      "",
      "| ID | Title | Scope | Status | Record | Supersedes | Superseded By | Governs |",
      "|---|---|---|---|---|---|---|---|",
      "| D-375 | Title | Scope | CURRENT |",
      "",
      "## 3. Current Capability / Cross-Capability Decisions",
    ].join("\n");
    const result = assertDecisionRegisterGlobalTableColumnCounts(text, {
      fail: (code, message) => failures.push({ code, message }),
      note: () => {},
    });
    assert.equal(result.badCount, 1);
    assert.equal(failures.length, 1);
    assert.equal(failures[0].code, "DECISION_REGISTER_COLUMN_COUNT");
    assert.match(failures[0].message, /D-375/);
  });

  it("accepts the live decision-register Current Global Decisions table", () => {
    const text = readFileSync(new URL("../docs/platform/decision-register.md", import.meta.url), "utf8");
    const failures = [];
    const result = assertDecisionRegisterGlobalTableColumnCounts(text, {
      fail: (code, message) => failures.push({ code, message }),
      note: () => {},
    });
    assert.deepEqual(failures, []);
    assert.equal(result.badCount, 0);
    assert.ok(result.rowCount >= 20);
  });
});
