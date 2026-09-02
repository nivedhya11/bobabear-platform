import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";

test("staging status declares an exact merged Git-tree artifact source", () => {
  const result = spawnSync(process.execPath, [path.resolve("scripts/environment/staging.mjs"), "status"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /STAGING_ARTIFACT_SOURCE EXACT_MERGED_GIT_TREE/);
  assert.match(result.stdout, /FUTURE_EXACT_GIT_TREE_MECHANISM git archive HEAD to isolated temporary build context/);
  assert.match(result.stdout, /LIVE_UNTRACKED_CONTENT_CAN_AFFECT_STAGING_ARTIFACT NO/);
});
