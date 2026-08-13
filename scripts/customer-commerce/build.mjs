#!/usr/bin/env node
// Customer-commerce service build (IMP-024).
//
// Compiles `src/server/customer-commerce/main.ts` and the E2E-only
// `e2e-fake-main.ts` (and everything they import — auth/customer,
// cart/checkout/payment/order domains, persistence, config)
// to plain ESM JavaScript under `dist-customer-commerce/`, then rewrites every
// emitted `@/...` alias import to a relative specifier — `tsc` resolves
// `paths` only for type-checking, never at emit time, so the compiled
// output would otherwise still contain unresolvable `from "@/..."`
// specifiers. Nothing here executes application code; it only compiles
// TypeScript and edits the resulting text.
//
// Usage: node scripts/customer-commerce/build.mjs
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");
const outDir = path.join(projectRoot, "dist-customer-commerce");

// Specifiers this rewrite step ever touches — a bare package import (e.g.
// "server-only", "drizzle-orm", "node:crypto") is always left untouched.
const REWRITABLE_SPECIFIER = /^(?:@\/|\.\.?\/)/;
const SPECIFIER_PATTERN = /\b(?:from|import)\s*\(?\s*(["'])((?:\.\.?\/|@\/)[^"']*)\1/g;

function listJsFilesRecursive(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listJsFilesRecursive(full));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      out.push(full);
    }
  }
  return out;
}

function fileExists(candidate) {
  try {
    return statSync(candidate).isFile();
  } catch {
    return false;
  }
}

/**
 * Resolve a compiled specifier (`@/...`, `./...`, or `../...`) found inside
 * `fileAbsolutePath` to the on-disk compiled `.js` file it must point at,
 * then return the relative specifier text (always `./` or `../`-prefixed,
 * forward slashes only) `fileAbsolutePath` should use instead.
 */
export function resolveRewrittenSpecifier(fileAbsolutePath, specifier, outDirAbsolutePath) {
  // Leave JSON (and other non-JS assets) alone — tsc emit with resolveJsonModule
  // keeps the `.json` specifier and may copy the asset beside the graph.
  if (/\.(json|css|svg|png|jpg|jpeg|webp|gif)$/i.test(specifier)) {
    return specifier;
  }

  const targetBase = specifier.startsWith("@/")
    ? path.join(outDirAbsolutePath, specifier.slice(2))
    : path.resolve(path.dirname(fileAbsolutePath), specifier);

  const candidates = [`${targetBase}.js`, path.join(targetBase, "index.js")];
  const resolved = candidates.find(fileExists);
  if (!resolved) {
    throw new Error(
      `customer-commerce build: could not resolve "${specifier}" imported from ` +
        `${path.relative(outDirAbsolutePath, fileAbsolutePath)} — expected one of: ` +
        candidates.map((c) => path.relative(outDirAbsolutePath, c)).join(", "),
    );
  }

  let relative = path.relative(path.dirname(fileAbsolutePath), resolved).split(path.sep).join("/");
  if (!relative.startsWith(".")) relative = `./${relative}`;
  return relative;
}

/** Rewrite every `@/...`/`./...`/`../...` import specifier in `source`
 * (the text of one compiled `.js` file at `fileAbsolutePath`) to a resolved
 * relative specifier. Pure string transform — exported for unit testing. */
export function rewriteFileSpecifiers(source, fileAbsolutePath, outDirAbsolutePath) {
  return source.replace(SPECIFIER_PATTERN, (match, quote, specifier) => {
    if (!REWRITABLE_SPECIFIER.test(specifier)) return match;
    const rewritten = resolveRewrittenSpecifier(fileAbsolutePath, specifier, outDirAbsolutePath);
    return match.replace(`${quote}${specifier}${quote}`, `${quote}${rewritten}${quote}`);
  });
}

function runTsc() {
  const tscBin = path.join(projectRoot, "node_modules", "typescript", "bin", "tsc");
  execFileSync(process.execPath, [tscBin, "-p", "tsconfig.customer-commerce.json"], {
    cwd: projectRoot,
    stdio: "inherit",
  });
}

function rewriteAllSpecifiers() {
  const jsFiles = listJsFilesRecursive(outDir);
  for (const file of jsFiles) {
    const original = readFileSync(file, "utf8");
    const rewritten = rewriteFileSpecifiers(original, file, outDir);
    if (rewritten !== original) {
      writeFileSync(file, rewritten, "utf8");
    }
  }
  return jsFiles.length;
}

/** Node only treats `.js` files as ESM when the nearest `package.json`
 * declares `"type": "module"` — `tsc` never emits this file itself. */
function writeEsmPackageMarker() {
  writeFileSync(path.join(outDir, "package.json"), `${JSON.stringify({ type: "module" }, null, 2)}\n`, "utf8");
}

function main() {
  rmSync(outDir, { recursive: true, force: true });
  runTsc();
  const rewrittenCount = rewriteAllSpecifiers();
  writeEsmPackageMarker();
  console.log(`customer-commerce/build: compiled and rewrote ${rewrittenCount} file(s) into dist-customer-commerce/.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
