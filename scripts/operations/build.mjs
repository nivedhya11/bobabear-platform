#!/usr/bin/env node
// Operations service build (IMP-029).
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");
const outDir = path.join(projectRoot, "dist-operations");
const REWRITABLE_SPECIFIER = /^(?:@\/|\.\.?\/)/;
const SPECIFIER_PATTERN = /\b(?:from|import)\s*\(?\s*(["'])((?:\.\.?\/|@\/)[^"']*)\1/g;

function listJsFilesRecursive(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJsFilesRecursive(full));
    else if (entry.isFile() && entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}
function fileExists(candidate) { try { return statSync(candidate).isFile(); } catch { return false; } }
function resolveRewrittenSpecifier(fileAbsolutePath, specifier) {
  // Leave JSON (and other non-JS assets) alone — tsc emit with resolveJsonModule
  // keeps the `.json` specifier and may copy the asset beside the graph.
  if (/\.(json|css|svg|png|jpg|jpeg|webp|gif)$/i.test(specifier)) {
    return specifier;
  }
  const targetBase = specifier.startsWith("@/") ? path.join(outDir, specifier.slice(2)) : path.resolve(path.dirname(fileAbsolutePath), specifier);
  const resolved = [`${targetBase}.js`, path.join(targetBase, "index.js")].find(fileExists);
  if (!resolved) throw new Error(`operations build: unresolved emitted import "${specifier}".`);
  let relative = path.relative(path.dirname(fileAbsolutePath), resolved).split(path.sep).join("/");
  if (!relative.startsWith(".")) relative = `./${relative}`;
  return relative;
}
function main() {
  rmSync(outDir, { recursive: true, force: true });
  execFileSync(process.execPath, [path.join(projectRoot, "node_modules", "typescript", "bin", "tsc"), "-p", "tsconfig.operations.json"], { cwd: projectRoot, stdio: "inherit" });
  const files = listJsFilesRecursive(outDir);
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    // Node 22+ requires `with { type: "json" }` for ESM JSON imports.
    const withJsonAttributes = source.replace(
      /\b(from|import)\s*\(?\s*(["'])((?:\.\.?\/|@\/)[^"']+\.json)\2(?!\s*with\s*\{)/g,
      (match, keyword, quote, specifier) =>
        match.includes(" with {") ? match : match.replace(`${quote}${specifier}${quote}`, `${quote}${specifier}${quote} with { type: "json" }`),
    );
    const rewritten = withJsonAttributes.replace(SPECIFIER_PATTERN, (match, quote, specifier) => {
      if (!REWRITABLE_SPECIFIER.test(specifier)) return match;
      if (/\.json$/i.test(specifier)) return match;
      return match.replace(`${quote}${specifier}${quote}`, `${quote}${resolveRewrittenSpecifier(file, specifier)}${quote}`);
    });
    if (rewritten !== source) writeFileSync(file, rewritten, "utf8");
  }
  writeFileSync(path.join(outDir, "package.json"), `${JSON.stringify({ type: "module" }, null, 2)}\n`, "utf8");
  console.log(`operations/build: compiled and rewrote ${files.length} file(s) into dist-operations/.`);
}
if (import.meta.url === `file://${process.argv[1]}`) main();
