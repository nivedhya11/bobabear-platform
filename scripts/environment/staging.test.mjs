import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

test("staging status declares an exact merged Git-tree artifact source", () => {
  const result = spawnSync(process.execPath, [path.resolve("scripts/environment/staging.mjs"), "status"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /STAGING_ARTIFACT_SOURCE EXACT_MERGED_GIT_TREE/);
  assert.match(result.stdout, /EXACT_GIT_TREE_MECHANISM git archive HEAD to isolated temporary build context/);
  assert.match(result.stdout, /LIVE_UNTRACKED_CONTENT_CAN_AFFECT_STAGING_ARTIFACT NO/);
});

test("staging deploy passes the rootless Podman project to the customer-auth smoke", () => {
  const source = readFileSync(path.resolve("scripts/environment/staging.mjs"), "utf8");
  assert.match(source, /--compose-provider[\s\S]*podman-compose/);
  assert.match(source, /--compose-project[\s\S]*STAGING_PROJECT/);
  assert.match(source, /--compose-file[\s\S]*compose\.yaml/);
});

test("staging deploy retains the current-main Podman hardening safeguards", () => {
  const source = readFileSync(path.resolve("scripts/environment/staging.mjs"), "utf8");
  assert.match(source, /git -C .* archive .* \| tar -x -C/);
  assert.match(source, /podman-compose", \["-f", "compose\.yaml", "-p", STAGING_PROJECT/);
  assert.match(source, /\["up", "-d", "--force-recreate", \.\.\.services\]/);
  assert.doesNotMatch(source, /--wait/);
  assert.match(source, /State\.Health\.Status/);
  assert.match(source, /boba-bear_app_1/);
  assert.match(source, /PERSISTENT_DB_VOLUME \$\{STAGING_PROJECT\}_postgres-data/);
  assert.doesNotMatch(source, /postgres-data.*rmSync|rmSync.*postgres-data/);
});
