import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outputDirectory = path.join(projectRoot, "dist-customer-commerce");

function listJavaScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listJavaScriptFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".js") ? [fullPath] : [];
  });
}

test("customer-commerce production build excludes legacy menu JSON from the runtime graph", () => {
  execFileSync(process.execPath, ["scripts/customer-commerce/build.mjs"], {
    cwd: projectRoot,
    stdio: "inherit",
  });

  const output = listJavaScriptFiles(outputDirectory)
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  assert.doesNotMatch(output, /(?:data\/)?menu\.json/);

  const result = spawnSync(
    process.execPath,
    ["--conditions=react-server", "dist-customer-commerce/server/customer-commerce/main.js"],
    { cwd: projectRoot, encoding: "utf8", timeout: 10_000 },
  );
  assert.doesNotMatch(`${result.stdout}${result.stderr}`, /ERR_IMPORT_ATTRIBUTE_MISSING/);
});
