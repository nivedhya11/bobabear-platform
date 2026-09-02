#!/usr/bin/env node
/** Non-destructive staging provenance/status tool. Deployment remains a separately authorized phase. */
import { execFileSync } from "node:child_process";
import process from "node:process";

const command = process.argv[2];
if (command !== "status" && command !== "deploy-dry-run") {
  console.error("Usage: npm run env:staging:status | npm run env:staging:deploy:dry-run");
  process.exit(1);
}
const git = (args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const branch = git(["branch", "--show-current"]);
const head = git(["rev-parse", "HEAD"]);
const originMain = git(["rev-parse", "origin/main"]);
const fingerprint = execFileSync("npm", ["run", "working-tree:fingerprint"], { encoding: "utf8" })
  .match(/WORKING_TREE_FINGERPRINT\s+([a-f0-9]+)/)?.[1] ?? "UNAVAILABLE";
const trackedDirty = git(["status", "--porcelain", "--untracked-files=no"]);
console.log("STAGING_PROJECT boba-staging");
console.log(`BRANCH ${branch}`);
console.log(`MERGED_GIT_SHA ${head}`);
console.log(`ORIGIN_MAIN ${originMain}`);
console.log(`WORKING_TREE_FINGERPRINT ${fingerprint}`);
console.log(`TRACKED_SOURCE_CLEAN ${trackedDirty.length === 0 ? "YES" : "NO"}`);
console.log("STAGING_ARTIFACT_SOURCE EXACT_MERGED_GIT_TREE");
console.log("FUTURE_EXACT_GIT_TREE_MECHANISM git archive HEAD to isolated temporary build context");
console.log("LIVE_UNTRACKED_CONTENT_CAN_AFFECT_STAGING_ARTIFACT NO (when the planned isolated Git-tree context is used)");
if (command === "deploy-dry-run") {
  if (branch !== "main" || head !== originMain || trackedDirty.length !== 0) {
    console.error("Staging deployment requires clean tracked source at exact origin/main.");
    process.exit(1);
  }
  console.log("DEPLOYMENT DRY RUN ONLY — no image, container, network, volume, or migration was created.");
  console.log("Future deployment provenance: isolated Git-tree context, BOBA_BUILD_SHA, and org.opencontainers.image.revision use MERGED_GIT_SHA.");
}
