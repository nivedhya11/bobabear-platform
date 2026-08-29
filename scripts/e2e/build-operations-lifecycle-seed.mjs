#!/usr/bin/env node
/** Compile the IMP-030 E2E seed into a caller-owned disposable ESM graph. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const temporaryRoot = realpathSync(os.tmpdir());
const entryRelativePath = path.join("scripts", "e2e", "seed-operations-lifecycle.js");
const rewritableSpecifier = /^(?:@\/|\.\.?\/)/;

const FIXED_RUNTIME_ASSETS = Object.freeze([
  "data/platform/imports/existing-menu-v1.json",
  "data/platform/pricing/existing-menu-pricing-v1.json",
  "src/data/menu.json",
  "src/lib/menuImages.ts",
  "src/types/menu.ts",
]);

const MENU_JSON_RELATIVE = "src/data/menu.json";
const MANIFEST_RELATIVE = "data/platform/imports/existing-menu-v1.json";
const PUBLIC_MENU_PREFIX = "public/assets/menu/";
const EXPECTED_PUBLIC_UNIQUE = 74;
const EXPECTED_TOTAL_RUNTIME_ASSETS = 79;

const ALLOWED_TEMP_PREFIXES = ["imp030e2e_", "imp030-runtime-asset-repair-"];

function isAllowedTempDirectory(name) {
  return ALLOWED_TEMP_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function isPathContainedWithin(base, target) {
  const relative = path.relative(base, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertSafeOutputRoot(outputRoot) {
  if (typeof outputRoot !== "string" || !path.isAbsolute(outputRoot)) {
    throw new Error("operations lifecycle seed build: outputRoot must be an absolute disposable path.");
  }
  const resolvedParent = realpathSync(path.dirname(outputRoot));
  const relative = path.relative(temporaryRoot, path.join(resolvedParent, path.basename(outputRoot)));
  if (
    relative === "" ||
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    !isAllowedTempDirectory(relative.split(path.sep)[0] ?? "")
  ) {
    throw new Error("operations lifecycle seed build: outputRoot must be below an approved /tmp disposable directory.");
  }
  if (existsSync(outputRoot)) {
    throw new Error("operations lifecycle seed build: caller must provide a new disposable outputRoot.");
  }
}

function listJsFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listJsFiles(file));
    else if (entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".mjs"))) files.push(file);
  }
  return files;
}

function moduleSpecifiers(source, file) {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
  const specifiers = [];
  const add = (node, owner, kind) => {
    if (node && ts.isStringLiteral(node)) specifiers.push({ node, owner, kind });
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node)) add(node.moduleSpecifier, node, "static");
    if (ts.isExportDeclaration(node)) add(node.moduleSpecifier, node, "export");
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) add(node.arguments[0], node, "dynamic");
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  return specifiers;
}

function hasJsonAttribute(owner, sourceFile) {
  const attributes = owner.attributes ?? owner.assertClause;
  if (!attributes) return false;
  const elements = attributes.elements ?? [];
  if (elements.length !== 1 || elements[0].name.text !== "type" || elements[0].value.text !== "json") {
    throw new Error(`operations lifecycle seed build: incompatible JSON import attributes in ${sourceFile.fileName}.`);
  }
  return true;
}

function resolveSpecifier(file, specifier, outputRoot) {
  const target = specifier.startsWith("@/")
    ? path.join(outputRoot, "src", specifier.slice(2))
    : path.resolve(path.dirname(file), specifier);
  const candidates = path.extname(specifier)
    ? [target]
    : [`${target}.js`, path.join(target, "index.js")];
  const resolved = candidates.find((candidate) => existsSync(candidate) && lstatSync(candidate).isFile());
  if (!resolved) throw new Error(`operations lifecycle seed build: unresolved emitted import "${specifier}" in ${path.relative(outputRoot, file)}.`);
  let relative = path.relative(path.dirname(file), resolved).split(path.sep).join("/");
  if (!relative.startsWith(".")) relative = `./${relative}`;
  return relative;
}

function rewriteSpecifiers(file, outputRoot) {
  const source = readFileSync(file, "utf8");
  const replacements = moduleSpecifiers(source, file).flatMap(({ node, owner, kind }) => {
    if (!rewritableSpecifier.test(node.text)) return [];
    const resolved = resolveSpecifier(file, node.text, outputRoot);
    const replacements = [];
    if (resolved !== node.text) replacements.push({ start: node.getStart() + 1, end: node.getEnd() - 1, value: resolved });
    if (!resolved.endsWith(".json")) return replacements;
    if (kind === "dynamic") {
      if (owner.arguments.length !== 1) throw new Error(`operations lifecycle seed build: incompatible JSON dynamic import attributes in ${file}.`);
      replacements.push({ start: owner.getEnd() - 1, end: owner.getEnd() - 1, value: ", { with: { type: \"json\" } }" });
    } else if (!hasJsonAttribute(owner, owner.getSourceFile())) {
      replacements.push({ start: node.getEnd(), end: node.getEnd(), value: " with { type: \"json\" }" });
    }
    return replacements;
  });
  const rewritten = replacements.reverse().reduce((result, replacement) => result.slice(0, replacement.start) + replacement.value + result.slice(replacement.end), source);
  if (rewritten !== source) writeFileSync(file, rewritten, "utf8");
}

function validateOutput(outputRoot, files) {
  const entryPath = path.join(outputRoot, entryRelativePath);
  if (!existsSync(entryPath)) throw new Error("operations lifecycle seed build: compiled seed entry is missing.");
  if (!existsSync(path.join(outputRoot, "package.json"))) throw new Error("operations lifecycle seed build: ESM package marker is missing.");
  const json = { total: 0, attributed: 0, missing: 0, dynamicUnsupported: 0, targetsReferenced: 0, targetsPresent: 0, targetsMissing: 0, targetsOutsideRoot: 0 };
  const validation = { unresolvedLocalImports: 0, aliasImportsRemain: 0, executableTsSourceImports: 0 };
  for (const file of files) {
    for (const { node, owner, kind } of moduleSpecifiers(readFileSync(file, "utf8"), file)) {
      if (node.text.startsWith("@/")) {
        validation.aliasImportsRemain += 1;
        throw new Error(`operations lifecycle seed build: alias import remains in ${path.relative(outputRoot, file)}.`);
      }
      if (node.text.endsWith(".ts")) validation.executableTsSourceImports += 1;
      if (!rewritableSpecifier.test(node.text)) continue;
      let target;
      try { target = resolveSpecifier(file, node.text, outputRoot); } catch (error) { validation.unresolvedLocalImports += 1; throw error; }
      if (!node.text.endsWith(".json")) continue;
      json.total += 1;
      json.targetsReferenced += 1;
      const resolvedTarget = path.resolve(path.dirname(file), target);
      const relativeTarget = path.relative(outputRoot, resolvedTarget);
      if (relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) json.targetsOutsideRoot += 1;
      if (!existsSync(resolvedTarget)) json.targetsMissing += 1;
      else json.targetsPresent += 1;
      if (kind === "dynamic") {
        if (owner.arguments.length !== 2) json.dynamicUnsupported += 1;
      } else if (hasJsonAttribute(owner, owner.getSourceFile())) json.attributed += 1;
      else json.missing += 1;
    }
  }
  if (json.missing || json.dynamicUnsupported || json.targetsMissing || json.targetsOutsideRoot || validation.executableTsSourceImports) throw new Error(`operations lifecycle seed build: validation failed (${JSON.stringify({ json, validation })}).`);
  return { entryPath, json, validation };
}

function hashAndSize(filePath) {
  const bytes = readFileSync(filePath);
  return {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    size: bytes.length,
  };
}

function assertCompiledRootContainment(compiledRoot, destinationPath) {
  const resolvedCompiledRoot = realpathSync(compiledRoot);
  const resolvedDestination = path.resolve(destinationPath);
  if (!isPathContainedWithin(resolvedCompiledRoot, resolvedDestination)) {
    throw new Error(`operations lifecycle seed build: runtime asset destination escapes compiled root (${path.relative(compiledRoot, destinationPath)}).`);
  }
}

function assertRegularRepositorySource(sourcePath, permittedRoot) {
  if (!existsSync(sourcePath)) {
    throw new Error(`operations lifecycle seed build: missing runtime asset source ${path.relative(root, sourcePath)}.`);
  }
  const stat = lstatSync(sourcePath);
  if (stat.isSymbolicLink()) {
    throw new Error(`operations lifecycle seed build: runtime asset source must not be a symlink (${path.relative(root, sourcePath)}).`);
  }
  if (!stat.isFile()) {
    throw new Error(`operations lifecycle seed build: runtime asset source must be a regular file (${path.relative(root, sourcePath)}).`);
  }
  const resolvedPermittedRoot = realpathSync(permittedRoot);
  const resolvedSource = realpathSync(sourcePath);
  if (!isPathContainedWithin(resolvedPermittedRoot, resolvedSource)) {
    throw new Error(`operations lifecycle seed build: runtime asset source escapes repository root (${path.relative(root, sourcePath)}).`);
  }
}

function assertFixedAssetDestinationAllowed(relativePath, destinationPath) {
  if (relativePath === MENU_JSON_RELATIVE) return;
  if (relativePath.endsWith(".ts")) {
    if (existsSync(destinationPath) && lstatSync(destinationPath).isFile()) {
      throw new Error(`operations lifecycle seed build: unexpected fixed runtime asset collision at ${relativePath}.`);
    }
    return;
  }
  if (existsSync(destinationPath)) {
    throw new Error(`operations lifecycle seed build: unexpected fixed runtime asset collision at ${relativePath}.`);
  }
}

function normalizeManifestPublicRelativePath(imagePath, entrySourceKey) {
  if (typeof imagePath !== "string" || imagePath.length === 0) {
    throw new Error(`operations lifecycle seed build: manifest entry ${entrySourceKey} has an empty image_path.`);
  }
  if (imagePath.includes("\0")) {
    throw new Error(`operations lifecycle seed build: manifest entry ${entrySourceKey} image_path contains NUL.`);
  }
  if (path.isAbsolute(imagePath) && !imagePath.startsWith("/")) {
    throw new Error(`operations lifecycle seed build: manifest entry ${entrySourceKey} image_path is an absolute filesystem path.`);
  }
  const trimmed = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
  if (trimmed.includes("..") || path.isAbsolute(trimmed)) {
    throw new Error(`operations lifecycle seed build: manifest entry ${entrySourceKey} image_path contains traversal.`);
  }
  if (!trimmed.startsWith("assets/menu/")) {
    throw new Error(`operations lifecycle seed build: manifest entry ${entrySourceKey} image_path is outside public/assets/menu/.`);
  }
  const relativePath = path.posix.join("public", trimmed);
  if (relativePath.endsWith("/")) {
    throw new Error(`operations lifecycle seed build: manifest entry ${entrySourceKey} image_path refers to a directory.`);
  }
  return relativePath.split(path.sep).join("/");
}

function derivePublicAssetRelativePaths() {
  const manifestAbsolute = path.join(root, MANIFEST_RELATIVE);
  const manifest = JSON.parse(readFileSync(manifestAbsolute, "utf8"));
  const entries = manifest.entries;
  if (!Array.isArray(entries)) {
    throw new Error("operations lifecycle seed build: manifest entries must be an array.");
  }
  const normalizedToRaw = new Map();
  for (const entry of entries) {
    const normalized = normalizeManifestPublicRelativePath(entry.image_path, entry.source_key ?? "unknown");
    const previous = normalizedToRaw.get(normalized);
    if (previous !== undefined && previous !== entry.image_path) {
      throw new Error(`operations lifecycle seed build: ambiguous duplicate public asset path ${normalized}.`);
    }
    normalizedToRaw.set(normalized, entry.image_path);
  }
  const relativePaths = [...normalizedToRaw.keys()].sort();
  if (entries.length !== EXPECTED_PUBLIC_UNIQUE || relativePaths.length !== EXPECTED_PUBLIC_UNIQUE) {
    throw new Error(`operations lifecycle seed build: expected ${EXPECTED_PUBLIC_UNIQUE} unique public assets, found ${relativePaths.length} (${entries.length} manifest references).`);
  }
  for (const relativePath of relativePaths) {
    if (!relativePath.startsWith(PUBLIC_MENU_PREFIX)) {
      throw new Error(`operations lifecycle seed build: derived public asset outside allowlist (${relativePath}).`);
    }
  }
  return { relativePaths, publicReferences: entries.length, publicUnique: relativePaths.length };
}

function copyRuntimeAsset(relativePath, compiledRoot, destinationPaths) {
  const sourcePath = path.join(root, relativePath);
  const destinationPath = path.join(compiledRoot, relativePath);
  assertRegularRepositorySource(sourcePath, root);
  assertCompiledRootContainment(compiledRoot, destinationPath);
  if (destinationPaths.has(destinationPath)) {
    throw new Error(`operations lifecycle seed build: duplicate runtime asset destination ${relativePath}.`);
  }
  destinationPaths.add(destinationPath);
  mkdirSync(path.dirname(destinationPath), { recursive: true, mode: 0o700 });
  const sourceMeta = hashAndSize(sourcePath);
  copyFileSync(sourcePath, destinationPath);
  const destinationMeta = hashAndSize(destinationPath);
  if (sourceMeta.size !== destinationMeta.size || sourceMeta.sha256 !== destinationMeta.sha256) {
    throw new Error(`operations lifecycle seed build: runtime asset hash mismatch for ${relativePath}.`);
  }
  return { relativePath, bytes: sourceMeta.size, sourceSha256: sourceMeta.sha256, destinationSha256: destinationMeta.sha256 };
}

function packageRuntimeAssets(compiledRoot) {
  const destinationPaths = new Set();
  const copied = [];
  let totalBytes = 0;

  for (const relativePath of FIXED_RUNTIME_ASSETS) {
    const destinationPath = path.join(compiledRoot, relativePath);
    assertFixedAssetDestinationAllowed(relativePath, destinationPath);
    const result = copyRuntimeAsset(relativePath, compiledRoot, destinationPaths);
    copied.push(result);
    totalBytes += result.bytes;
  }

  const { relativePaths, publicReferences, publicUnique } = derivePublicAssetRelativePaths();
  for (const relativePath of relativePaths) {
    if (existsSync(path.join(compiledRoot, relativePath))) {
      throw new Error(`operations lifecycle seed build: unexpected public asset collision at ${relativePath}.`);
    }
    const result = copyRuntimeAsset(relativePath, compiledRoot, destinationPaths);
    copied.push(result);
    totalBytes += result.bytes;
  }

  const packaging = {
    fixedDeclared: FIXED_RUNTIME_ASSETS.length,
    fixedCopied: FIXED_RUNTIME_ASSETS.length,
    publicReferences,
    publicUnique,
    publicCopied: relativePaths.length,
    totalRequired: EXPECTED_TOTAL_RUNTIME_ASSETS,
    totalCopied: copied.length,
    totalBytes,
    missing: EXPECTED_TOTAL_RUNTIME_ASSETS - copied.length,
    hashMismatches: 0,
    pathEscapes: 0,
    duplicateDestinations: 0,
    forbiddenAssets: 0,
  };

  if (packaging.totalCopied !== EXPECTED_TOTAL_RUNTIME_ASSETS || packaging.missing !== 0) {
    throw new Error(`operations lifecycle seed build: runtime asset closure incomplete (${JSON.stringify(packaging)}).`);
  }

  return {
    runtimeAssetCount: packaging.totalCopied,
    runtimeAssetBytes: packaging.totalBytes,
    packaging,
    copied,
  };
}

export function buildOperationsLifecycleSeed({ outputRoot }) {
  assertSafeOutputRoot(outputRoot);
  mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
  execFileSync(process.execPath, [path.join(root, "node_modules", "typescript", "bin", "tsc"), "-p", "tsconfig.operations-lifecycle-e2e-seed.json", "--outDir", outputRoot], { cwd: root, stdio: "inherit" });
  symlinkSync(path.join(root, "node_modules"), path.join(outputRoot, "node_modules"), "dir");
  const files = listJsFiles(outputRoot);
  for (const file of files) rewriteSpecifiers(file, outputRoot);
  writeFileSync(path.join(outputRoot, "package.json"), `${JSON.stringify({ type: "module" })}\n`, "utf8");
  const validation = validateOutput(outputRoot, files);
  const runtimeAssets = packageRuntimeAssets(outputRoot);
  return { ...validation, emittedFileCount: files.length, ...runtimeAssets };
}
