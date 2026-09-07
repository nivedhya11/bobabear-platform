import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.join(projectRoot, "scripts", "governance-fingerprint.mjs");

/**
 * @returns {{ status: number | null, stdout: string, stderr: string }}
 */
function runFingerprint() {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

/**
 * @param {string} stdout
 * @returns {string[]}
 */
function parseManifest(stdout) {
  const begin = stdout.indexOf("MANIFEST_BEGIN\n");
  const end = stdout.indexOf("\nMANIFEST_END");
  assert.ok(begin >= 0, "MANIFEST_BEGIN missing");
  assert.ok(end > begin, "MANIFEST_END missing");
  const body = stdout.slice(begin + "MANIFEST_BEGIN\n".length, end);
  return body.split("\n").filter(Boolean);
}

/**
 * @param {string} dirRel
 * @returns {string[]}
 */
function trackedMarkdownUnder(dirRel) {
  const listed = spawnSync(
    "git",
    ["-C", projectRoot, "ls-files", "--full-name", "--", dirRel],
    { encoding: "utf8" },
  );
  assert.equal(listed.status, 0, `git ls-files ${dirRel} failed`);
  return listed.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((p) => p.replace(/\\/g, "/"))
    .filter((p) => p.startsWith(`${dirRel}/`) && p.toLowerCase().endsWith(".md"))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

describe("governance fingerprint", () => {
  it("exits 0 and emits PD-1 / TEST-1 / product / history Markdown with deterministic unique paths", () => {
    const { status, stdout, stderr } = runFingerprint();
    assert.equal(status, 0, stderr || stdout);
    assert.match(stdout, /^GOVERNANCE_FINGERPRINT [0-9a-f]{64}\n/m);

    const manifest = parseManifest(stdout);
    assert.ok(manifest.includes("docs/platform/PRODUCT-DELIVERY.md"));
    assert.ok(manifest.includes("docs/platform/TESTING.md"));

    const productMd = trackedMarkdownUnder("docs/platform/product");
    assert.ok(productMd.length >= 4, `expected tracked product Markdown, got ${productMd.length}`);
    for (const rel of productMd) {
      assert.ok(manifest.includes(rel), `missing product path ${rel}`);
    }

    const historyMd = trackedMarkdownUnder("docs/platform/history");
    assert.ok(historyMd.length >= 3, `expected tracked history Markdown, got ${historyMd.length}`);
    for (const rel of [
      "docs/platform/history/README.md",
      "docs/platform/history/ROADMAP-GTM-R113-pre-compression.md",
      "docs/platform/history/STATE-STATE-R111-pre-compression.md",
    ]) {
      assert.ok(manifest.includes(rel), `missing history path ${rel}`);
      assert.ok(historyMd.includes(rel), `history ls-files missing ${rel}`);
    }

    const sorted = [...manifest].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    assert.deepEqual(manifest, sorted, "manifest paths must be sorted deterministically");
    assert.equal(new Set(manifest).size, manifest.length, "manifest paths must be unique");

    const countMatch = stdout.match(/^FILE_COUNT (\d+)$/m);
    assert.ok(countMatch, "FILE_COUNT missing");
    assert.equal(Number(countMatch[1]), manifest.length);
  });
});
