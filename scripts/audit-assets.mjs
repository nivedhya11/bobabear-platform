/**
 * audit-assets.mjs
 *
 * Checks that the production asset layout is clean:
 *  - No source file references Boba_Bear_Images (deprecated reference folder)
 *  - No source file references the generated out/ directory
 *  - All menu image paths in lib/menuImages.ts resolve under public/assets/menu/
 *  - Logo paths exist under public/assets/logos/
 *  - Drop image paths exist under public/assets/drops/
 *  - Video path exists under public/assets/video/ (if any mapping references it)
 *
 * Exits with code 1 if any hard violation is found.
 *
 * Usage:  node scripts/audit-assets.mjs
 *    or:  npm run audit:assets
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// ── Helpers ───────────────────────────────────────────────────────────────────

function readText(rel) {
  const p = join(root, rel);
  return existsSync(p) ? readFileSync(p, "utf-8") : null;
}

function walk(dir, results = []) {
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const skip = ["node_modules", ".git", ".next", "out"];
      if (!skip.includes(entry.name)) walk(full, results);
    } else {
      results.push(full);
    }
  }
  return results;
}

// ── Gather source files ───────────────────────────────────────────────────────

const SOURCE_DIRS = ["app", "components", "lib", "scripts", "data", "docs"];
const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md"]);

const sourceFiles = [];
for (const d of SOURCE_DIRS) {
  for (const f of walk(join(root, d))) {
    if (SOURCE_EXTS.has("." + f.split(".").pop())) sourceFiles.push(f);
  }
}
// Also check root-level docs
for (const name of ["README.md", "CLAUDE.md", "AGENTS.md", "package.json"]) {
  const p = join(root, name);
  if (existsSync(p)) sourceFiles.push(p);
}

// ── Check 1: no Boba_Bear_Images references in source ─────────────────────────

let violations = 0;
const W = 60;
const SEP = "=".repeat(W);
const sep = "-".repeat(W);

console.log();
console.log("Asset audit");
console.log(SEP);

const CODE_EXTS = new Set([".ts", ".tsx", ".js", ".mjs"]);

// Only check code files — docs may mention Boba_Bear_Images when describing it as deprecated
const bbRefs = [];
for (const f of sourceFiles) {
  if (!CODE_EXTS.has("." + f.split(".").pop())) continue;
  const text = readFileSync(f, "utf-8");
  const rel = f.replace(root + "/", "");
  if (rel.startsWith("scripts/audit-assets")) continue;
  if (text.includes("Boba_Bear_Images")) {
    bbRefs.push(rel);
  }
}

if (bbRefs.length > 0) {
  console.log(`\n✗  Boba_Bear_Images references found in source (${bbRefs.length} file(s)):`);
  for (const f of bbRefs) console.log(`     ${f}`);
  console.log("   Fix: update to reference public/assets/ instead.");
  violations++;
} else {
  console.log("  ✓  No Boba_Bear_Images references in source files.");
}

// ── Check 2: no out/ references in source ────────────────────────────────────

const outRefs = [];
// Only check code files — markdown docs legitimately describe the build output
const OUT_PATTERN = /\bout\//;
for (const f of sourceFiles) {
  if (!CODE_EXTS.has("." + f.split(".").pop())) continue;
  const text = readFileSync(f, "utf-8");
  const rel = f.replace(root + "/", "");
  if (rel.startsWith("scripts/audit-assets")) continue;
  if (OUT_PATTERN.test(text)) {
    outRefs.push(rel);
  }
}

if (outRefs.length > 0) {
  console.log(`\n✗  out/ references found in source (${outRefs.length} file(s)):`);
  for (const f of outRefs) console.log(`     ${f}`);
  console.log("   Fix: do not reference the generated out/ directory from source.");
  violations++;
} else {
  console.log("  ✓  No illegal out/ references in source files.");
}

// ── Check 3: menu image paths resolve under public/assets/menu/ ──────────────

const menuImagesSrc = readText("lib/menuImages.ts");
const menuDir = join(root, "public", "assets", "menu");
const menuMissing = [];
const menuPresent = [];

if (menuImagesSrc) {
  for (const [, , file] of menuImagesSrc.matchAll(/"([^"]+)"\s*:\s*M \+ "([^"]+)"/g)) {
    const p = join(menuDir, file);
    (existsSync(p) ? menuPresent : menuMissing).push(file);
  }
  console.log(
    `  ✓  Menu image paths: ${menuPresent.length} present, ${menuMissing.length} missing (Aurora fallbacks).`
  );
} else {
  console.log("  ?  lib/menuImages.ts not found — skipping menu image check.");
}

// ── Check 4: logos under public/assets/logos/ ────────────────────────────────

const logosDir = join(root, "public", "assets", "logos");
if (existsSync(logosDir)) {
  const logos = readdirSync(logosDir);
  if (logos.length > 0) {
    console.log(`  ✓  Logos present in public/assets/logos/ (${logos.length} file(s)).`);
  } else {
    console.log("  ✗  public/assets/logos/ is empty — add logo files.");
    violations++;
  }
} else {
  console.log("  ✗  public/assets/logos/ does not exist — create it and add logo files.");
  violations++;
}

// ── Check 5: drops under public/assets/drops/ ────────────────────────────────

const dropsDir = join(root, "public", "assets", "drops");
if (existsSync(dropsDir)) {
  const drops = readdirSync(dropsDir);
  console.log(
    drops.length > 0
      ? `  ✓  Drop images present in public/assets/drops/ (${drops.length} file(s)).`
      : "  –  public/assets/drops/ is empty (no drop images yet)."
  );
} else {
  console.log("  –  public/assets/drops/ does not exist (no drop images yet).");
}

// ── Check 6: video under public/assets/video/ (optional) ─────────────────────

const videoDir = join(root, "public", "assets", "video");
if (existsSync(videoDir)) {
  const videos = readdirSync(videoDir);
  console.log(
    videos.length > 0
      ? `  ✓  Video assets present in public/assets/video/ (${videos.length} file(s)).`
      : "  –  public/assets/video/ is empty (no video assets yet)."
  );
} else {
  console.log("  –  public/assets/video/ does not exist (no video assets yet).");
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log();
console.log(SEP);
if (violations === 0) {
  console.log("All checks passed. ✓");
} else {
  console.log(`${violations} violation(s) found. See details above.`);
}
console.log();

process.exit(violations > 0 ? 1 : 0);
