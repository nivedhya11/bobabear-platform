import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { test } from "node:test";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("audit:menu-import exits 0 on the current tree", () => {
  const result = spawnSync(process.execPath, ["scripts/audit-menu-import.mjs"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  assert.equal(
    result.status,
    0,
    `audit:menu-import failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  assert.match(result.stdout, /audit:menu-import OK/);
});
