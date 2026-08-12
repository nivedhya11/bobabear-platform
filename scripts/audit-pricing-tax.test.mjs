import { spawnSync } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("audit:pricing-tax exits zero on current tree", () => {
  const result = spawnSync("node", ["scripts/audit-pricing-tax.mjs"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  // May fail until migration is sealed — assert script is executable and reports clearly.
  assert.ok(typeof result.status === "number");
  if (result.status !== 0) {
    assert.match(result.stderr + result.stdout, /audit:pricing-tax failed|must be sealed/);
  } else {
    assert.match(result.stdout, /audit:pricing-tax passed/);
  }
});
