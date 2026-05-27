/**
 * audit-menu-images.mjs
 *
 * Checks every image path referenced in lib/menuImages.ts against the files
 * that actually exist in public/assets/menu/.
 *
 * Missing images are expected and handled gracefully — the MenuCard component
 * renders an Aurora-colour fallback for any item without a photo. This script
 * exits 0 so it doesn't break CI; use it to track photography progress.
 *
 * Usage:  node scripts/audit-menu-images.mjs
 *    or:  npm run audit:menu-images
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// ── Parse lib/menuImages.ts ───────────────────────────────────────────────────
// Extract filenames from entries like:  M + "Filename.jpeg"
const src = readFileSync(join(root, "lib/menuImages.ts"), "utf-8");
const fileNames = [...src.matchAll(/M \+ "([^"]+)"/g)].map((m) => m[1]);

if (fileNames.length === 0) {
  console.error("audit-menu-images: no entries found in lib/menuImages.ts — check the regex.");
  process.exit(1);
}

// ── Check each path against public/assets/menu/ ───────────────────────────────
const existing = [];
const missing = [];

for (const name of fileNames) {
  const fullPath = join(root, "public", "assets", "menu", name);
  (existsSync(fullPath) ? existing : missing).push(name);
}

// ── Report ────────────────────────────────────────────────────────────────────
const W = 50; // column width for the header line
console.log("");
console.log("Menu image audit");
console.log("=".repeat(W));
console.log(`  Total referenced : ${fileNames.length}`);
console.log(`  Present          : ${existing.length}`);
console.log(`  Missing          : ${missing.length}`);
console.log("=".repeat(W));

if (missing.length > 0) {
  console.log("\nMissing (will render as Aurora fallback card):");
  for (const name of missing) {
    console.log(`  ✗  ${name}`);
  }
  console.log(
    "\nSee docs/missing-menu-images.md for photography checklist and naming rules.",
  );
} else {
  console.log("\nAll referenced images are present. ✓");
}

console.log("");
process.exit(0);
