/**
 * audit-menu-images.mjs
 *
 * Reports:
 *  - total menu items vs total mapped images
 *  - mapped images present / missing
 *  - images in public/assets/menu/ that are unused by any mapping
 *  - duplicate image mappings (two items → same file)
 *  - stale mapping keys (in menuImages.ts but not in menu.json)
 *  - unmapped menu items (in menu.json but missing from menuImages.ts)
 *  - suspicious mappings with low token overlap between item name and filename
 *
 * Exits 0 always — missing images are expected while photography is in progress.
 *
 * Usage:  node scripts/audit-menu-images.mjs
 *    or:  npm run audit:menu-images
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname, basename, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// ── Parse src/lib/menuImages.ts ───────────────────────────────────────────────
const src = readFileSync(join(root, "src/lib/menuImages.ts"), "utf-8");

// Extract   "Item Name": M + "Filename.ext"  pairs
const mappings = new Map(); // itemName → filename
for (const [, key, file] of src.matchAll(/"([^"]+)"\s*:\s*M \+ "([^"]+)"/g)) {
  mappings.set(key, file);
}

if (mappings.size === 0) {
  console.error("audit-menu-images: no entries found in src/lib/menuImages.ts — check the regex.");
  process.exit(1);
}

// ── Parse src/data/menu.json ───────────────────────────────────────────────────
const menuData = JSON.parse(readFileSync(join(root, "src/data/menu.json"), "utf-8"));
const menuItems = new Set();

function collectItems(node) {
  if (Array.isArray(node)) { node.forEach(collectItems); return; }
  if (node && typeof node === "object") {
    if (typeof node.name === "string" && node.price !== undefined) {
      menuItems.add(node.name);
    }
    for (const v of Object.values(node)) collectItems(v);
  }
}
collectItems(menuData);

// ── Scan public/assets/menu/ ──────────────────────────────────────────────────
const menuDir = join(root, "public", "assets", "menu");
const physicalFiles = new Set(
  existsSync(menuDir) ? readdirSync(menuDir) : []
);

// ── Analysis ──────────────────────────────────────────────────────────────────

// 1. Present / missing
const present = [];
const missing = [];
for (const [item, file] of mappings) {
  (existsSync(join(menuDir, file)) ? present : missing).push({ item, file });
}

// 2. Unused public images (not referenced by any mapping)
const referencedFiles = new Set(mappings.values());
const unused = [...physicalFiles].filter((f) => !referencedFiles.has(f)).sort();

// 3. Duplicate image paths
const fileUsage = new Map(); // file → [itemNames]
for (const [item, file] of mappings) {
  if (!fileUsage.has(file)) fileUsage.set(file, []);
  fileUsage.get(file).push(item);
}
const duplicates = [...fileUsage.entries()].filter(([, items]) => items.length > 1);

// 4. Stale keys (in mappings but not in menu.json)
const staleKeys = [...mappings.keys()].filter((k) => !menuItems.has(k));

// 5. Unmapped menu items (in menu.json but not mapped)
const unmapped = [...menuItems].filter((k) => !mappings.has(k)).sort();

// 6. Suspicious mappings: low token overlap
function tokenise(str) {
  const skip = new Set(["the", "a", "an", "and", "or", "of", "in", "on"]);
  return str
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !skip.has(t));
}

function overlap(a, b) {
  const ta = new Set(tokenise(a));
  const tb = new Set(tokenise(b));
  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  const union = new Set([...ta, ...tb]).size;
  return union === 0 ? 1 : common / union;
}

const suspicious = [];
for (const [item, file] of mappings) {
  const stem = basename(file, extname(file));
  const score = overlap(item, stem);
  if (score < 0.4) suspicious.push({ item, file, score: score.toFixed(2) });
}
suspicious.sort((a, b) => a.score - b.score);

// ── Report ────────────────────────────────────────────────────────────────────
const W = 56;
const SEP = "=".repeat(W);
const sep = "-".repeat(W);

console.log();
console.log("Menu image audit");
console.log(SEP);
console.log(`  Menu items (src/data/menu.json) : ${menuItems.size}`);
console.log(`  Mapped items (menuImages.ts)  : ${mappings.size}`);
console.log(`  Mapped images present         : ${present.length}`);
console.log(`  Mapped images missing         : ${missing.length}`);
console.log(`  Physical files in assets/menu : ${physicalFiles.size}`);
console.log(`  Unused physical files         : ${unused.length}`);
console.log(`  Duplicate image paths         : ${duplicates.length}`);
console.log(`  Stale mapping keys            : ${staleKeys.length}`);
console.log(`  Unmapped menu items           : ${unmapped.length}`);
console.log(SEP);

if (missing.length > 0) {
  console.log(`\nMissing images (${missing.length}) — render as Aurora fallback:`);
  for (const { item, file } of missing) {
    console.log(`  ✗  ${file.padEnd(48)}  ← "${item}"`);
  }
}

if (staleKeys.length > 0) {
  console.log(`\n${sep}`);
  console.log(`Stale keys — in menuImages.ts but NOT in menu.json (${staleKeys.length}):`);
  for (const k of staleKeys) {
    console.log(`  ⚠  "${k}"  →  ${mappings.get(k)}`);
  }
}

if (unmapped.length > 0) {
  console.log(`\n${sep}`);
  console.log(`Unmapped menu items — no entry in menuImages.ts (${unmapped.length}):`);
  for (const k of unmapped) {
    console.log(`  –  ${k}`);
  }
}

if (unused.length > 0) {
  console.log(`\n${sep}`);
  console.log(`Unused images in public/assets/menu/ (${unused.length}):`);
  for (const f of unused) {
    console.log(`  📁  ${f}`);
  }
}

if (duplicates.length > 0) {
  console.log(`\n${sep}`);
  console.log(`Duplicate image paths (${duplicates.length}):`);
  for (const [file, items] of duplicates) {
    console.log(`  ⚡  ${file}`);
    for (const i of items) console.log(`       ↳ "${i}"`);
  }
}

if (suspicious.length > 0) {
  console.log(`\n${sep}`);
  console.log(`Suspicious mappings — low name↔filename similarity (${suspicious.length}):`);
  for (const { item, file, score } of suspicious) {
    console.log(`  ?  [${score}]  "${item}"  →  ${file}`);
  }
}

if (missing.length > 0 || staleKeys.length > 0) {
  console.log(
    "\nSee docs/missing-menu-images.md for photography checklist and naming rules.",
  );
} else {
  console.log("\nAll referenced images are present and mappings are clean. ✓");
}

console.log();
process.exit(0);
