import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "scripts/ci-security-sensitive-paths.mjs");

describe("ci-security-sensitive-paths", () => {
  it("exits 0 and emits security_sensitive=false for identical base/head", () => {
    const result = spawnSync(process.execPath, [script, "--base", "HEAD", "--head", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /security_sensitive=false/);
  });
});
