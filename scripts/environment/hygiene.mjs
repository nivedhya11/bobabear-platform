#!/usr/bin/env node
/** Audit (default) or remove (--apply) only label-proven BOBA Testcontainers PostgreSQL resources. */
import { spawnSync } from "node:child_process";
import process from "node:process";

const apply = process.argv.slice(2).join(" ") === "--apply";
if (!apply && process.argv.length > 2) {
  console.error("Usage: npm run env:hygiene [-- --apply]");
  process.exit(1);
}
const listed = spawnSync("podman", ["ps", "-a", "--filter", "label=org.testcontainers=true", "--format", "{{.ID}}|{{.Names}}|{{.Image}}"], { encoding: "utf8" });
if (listed.status !== 0) process.exit(listed.status ?? 1);
const resources = listed.stdout.trim().split("\n").filter(Boolean).map((line) => line.split("|"));
console.log(`EPHEMERAL_TEST ${resources.length}`);
for (const [id, name, image] of resources) console.log(`${apply ? "REMOVE" : "KEEP_UNTIL_APPLY"} ${id} ${name} ${image}`);
console.log("FOUNDER_STAGING 0 (excluded by label policy)");
console.log("OTHER_REQUIRED and UNKNOWN resources are never selected by this command.");
if (!apply) process.exit(0);
for (const [id] of resources) {
  const removed = spawnSync("podman", ["rm", "-f", "--volumes", id], { stdio: "inherit" });
  if (removed.status !== 0) process.exitCode = 1;
}
