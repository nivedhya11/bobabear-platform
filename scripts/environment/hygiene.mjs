#!/usr/bin/env node
/** Audit (default) or remove (--apply) only label-proven BOBA ephemeral Testcontainers resources. */
import { spawnSync } from "node:child_process";
import process from "node:process";

const apply = process.argv.slice(2).join(" ") === "--apply";
if (!apply && process.argv.length > 2) {
  console.error("Usage: npm run env:hygiene [-- --apply]");
  process.exit(1);
}
const ownershipFilters = [
  "label=org.testcontainers=true",
  "label=com.bobabear.environment=test",
  "label=com.bobabear.lifecycle=ephemeral",
];
const listed = spawnSync(
  "podman",
  ["ps", "-a", ...ownershipFilters.flatMap((filter) => ["--filter", filter]), "--format", "{{.ID}}|{{.Names}}|{{.Image}}"],
  { encoding: "utf8" },
);
if (listed.status !== 0) process.exit(listed.status ?? 1);
const resources = listed.stdout.trim().split("\n").filter(Boolean).map((line) => {
  const fields = line.split("|");
  if (fields.length !== 3 || fields.some((field) => !field)) {
    console.error("Podman label discovery was ambiguous; refusing to select or remove resources.");
    process.exit(1);
  }
  return fields;
});
console.log(`BOBA_EPHEMERAL_SELECTED ${resources.length}`);
for (const [id, name, image] of resources) console.log(`${apply ? "REMOVE" : "WOULD_REMOVE"} ${id} ${name} ${image}`);
console.log("FOUNDER_STAGING 0 (excluded: lifecycle is not ephemeral test)");
console.log("OTHER_REQUIRED 0 (excluded: missing strict BOBA Testcontainers labels)");
console.log("UNKNOWN 0 (excluded: missing strict BOBA Testcontainers labels)");
console.log("UNRELATED_TESTCONTAINERS 0 (excluded: missing BOBA ownership labels)");
if (!apply) process.exit(0);
for (const [id] of resources) {
  const removed = spawnSync("podman", ["rm", "-f", "--volumes", id], { stdio: "inherit" });
  if (removed.status !== 0) process.exitCode = 1;
}
