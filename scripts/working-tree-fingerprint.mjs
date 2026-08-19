#!/usr/bin/env node
/**
 * Content-sensitive repository working-tree fingerprint.
 *
 * Usage:
 *   node scripts/working-tree-fingerprint.mjs
 *   node scripts/working-tree-fingerprint.mjs --json
 *   node scripts/working-tree-fingerprint.mjs --cwd <repo>
 *
 * WORKING_TREE_FINGERPRINT is SHA-256 over a canonical record stream of:
 *   - logical git index entries (`git ls-files --stage`; staged content identity)
 *   - worktree bytes of every tracked path that currently exists as a file
 *   - worktree bytes of every non-ignored untracked file
 *   - a missing marker for tracked paths absent from the worktree
 *
 * Paths are repository-relative. Enumeration is sorted with locale-independent
 * UTF-8 byte order. Ignored paths (`.gitignore`) are excluded. `.git` object
 * database bytes, `node_modules`, and other ignored outputs are not hashed.
 *
 * Default `git status --porcelain` is not an exact-content authority: an
 * untracked directory is one status line, so edits underneath it do not change
 * a porcelain-only hash.
 */
import { createHash } from "node:crypto";
import { closeSync, lstatSync, openSync, readSync, readlinkSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export const WORKING_TREE_FINGERPRINT_ALGORITHM = "boba-bear-working-tree-fingerprint-v1";

const NUL = Buffer.from([0]);
const HASH_READ_SIZE = 64 * 1024;
const GIT_MAX_BUFFER = 64 * 1024 * 1024;

/**
 * Locale-independent UTF-8 byte order.
 * @param {string} a
 * @param {string} b
 */
export function compareUtf8Bytes(a, b) {
  return Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

/**
 * @param {string} rel
 */
function normalizeRepoPath(rel) {
  return rel.replace(/\\/g, "/");
}

/**
 * @param {string} repoRoot
 * @param {string[]} args
 */
function gitOut(repoRoot, args) {
  const result = spawnSync("git", ["-C", repoRoot, "-c", "core.quotepath=false", ...args], {
    encoding: "buffer",
    maxBuffer: GIT_MAX_BUFFER,
  });
  if (result.status !== 0) {
    const err = result.stderr?.toString("utf8").trim() || `exit ${result.status}`;
    throw new Error(`git ${args.join(" ")} failed: ${err}`);
  }
  return result.stdout ?? Buffer.alloc(0);
}

/**
 * @param {Buffer} buf
 * @returns {string[]}
 */
function splitZ(buf) {
  const parts = [];
  let start = 0;
  for (let i = 0; i < buf.length; i += 1) {
    if (buf[i] === 0) {
      if (i > start) parts.push(buf.subarray(start, i).toString("utf8"));
      start = i + 1;
    }
  }
  if (start < buf.length) {
    const last = buf.subarray(start).toString("utf8");
    if (last) parts.push(last);
  }
  return parts;
}

/**
 * @param {string} repoRoot
 * @returns {{ mode: string, object: string, stage: string, path: string }[]}
 */
export function listIndexEntries(repoRoot) {
  const records = splitZ(gitOut(repoRoot, ["ls-files", "--stage", "-z"]));
  const parsed = [];
  for (const rec of records) {
    const tab = rec.indexOf("\t");
    if (tab < 0) {
      throw new Error(`malformed git ls-files --stage record: ${rec}`);
    }
    const meta = rec.slice(0, tab);
    const rel = normalizeRepoPath(rec.slice(tab + 1));
    const match = /^([0-7]{6}) ([0-9a-f]+) ([0-3])$/.exec(meta);
    if (!match) {
      throw new Error(`malformed git ls-files --stage meta: ${meta}`);
    }
    parsed.push({ mode: match[1], object: match[2], stage: match[3], path: rel });
  }
  parsed.sort((a, b) => compareUtf8Bytes(a.path, b.path) || compareUtf8Bytes(a.stage, b.stage));
  return parsed;
}

/**
 * Non-ignored untracked repository-relative paths.
 * @param {string} repoRoot
 * @returns {string[]}
 */
export function listUntrackedNonIgnored(repoRoot) {
  const paths = splitZ(gitOut(repoRoot, ["ls-files", "-z", "--others", "--exclude-standard"])).map(
    normalizeRepoPath,
  );
  paths.sort(compareUtf8Bytes);
  return paths;
}

/**
 * Stream SHA-256 of a regular file without loading it as a single argv/string.
 * @param {string} abs
 */
function hashRegularFile(abs) {
  const hash = createHash("sha256");
  const fd = openSync(abs, "r");
  try {
    const buf = Buffer.alloc(HASH_READ_SIZE);
    let n;
    while ((n = readSync(fd, buf, 0, buf.length, null)) > 0) {
      hash.update(buf.subarray(0, n));
    }
  } finally {
    closeSync(fd);
  }
  return hash.digest("hex");
}

/**
 * @param {string} repoRoot
 * @param {string} rel
 * @returns {{ kind: "file" | "symlink" | "missing", payload: string }}
 */
function worktreeRecord(repoRoot, rel) {
  const abs = path.join(repoRoot, rel);
  let st;
  try {
    st = lstatSync(abs);
  } catch {
    return { kind: "missing", payload: "" };
  }
  if (st.isSymbolicLink()) {
    return { kind: "symlink", payload: readlinkSync(abs, { encoding: "buffer" }).toString("utf8") };
  }
  if (st.isFile()) {
    return { kind: "file", payload: hashRegularFile(abs) };
  }
  return { kind: "missing", payload: "" };
}

/**
 * @param {string} [repoRoot]
 */
export function computeWorkingTreeFingerprint(repoRoot) {
  const root = path.resolve(repoRoot ?? defaultRepoRoot());
  const indexEntries = listIndexEntries(root);
  const untracked = listUntrackedNonIgnored(root);
  const worktreePaths = [...new Set([...indexEntries.map((e) => e.path), ...untracked])];
  worktreePaths.sort(compareUtf8Bytes);

  const files = [];
  const hash = createHash("sha256");
  hash.update(WORKING_TREE_FINGERPRINT_ALGORITHM);
  hash.update(NUL);

  hash.update("INDEX");
  hash.update(NUL);
  for (const entry of indexEntries) {
    hash.update(entry.mode);
    hash.update(NUL);
    hash.update(entry.object);
    hash.update(NUL);
    hash.update(entry.stage);
    hash.update(NUL);
    hash.update(entry.path);
    hash.update(NUL);
  }

  hash.update("WORKTREE");
  hash.update(NUL);
  for (const rel of worktreePaths) {
    const rec = worktreeRecord(root, rel);
    hash.update(rel);
    hash.update(NUL);
    hash.update(rec.kind);
    hash.update(NUL);
    hash.update(rec.payload);
    hash.update(NUL);
    files.push({ path: rel, kind: rec.kind });
  }

  return {
    algorithm: WORKING_TREE_FINGERPRINT_ALGORITHM,
    digest: hash.digest("hex"),
    indexEntryCount: indexEntries.length,
    worktreePathCount: worktreePaths.length,
    files,
  };
}

function defaultRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

function parseArgs(argv) {
  const opts = { json: false, cwd: defaultRepoRoot() };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") opts.json = true;
    else if (arg === "--cwd") {
      const value = argv[i + 1];
      if (!value) throw new Error("--cwd requires a path");
      opts.cwd = path.resolve(value);
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      opts.help = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    process.stdout.write(
      "Usage: node scripts/working-tree-fingerprint.mjs [--json] [--cwd <repo>]\n",
    );
    return;
  }
  const result = computeWorkingTreeFingerprint(opts.cwd);
  if (opts.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(`WORKING_TREE_FINGERPRINT ${result.digest}\n`);
  process.stdout.write(`ALGORITHM ${result.algorithm}\n`);
  process.stdout.write(`INDEX_ENTRY_COUNT ${result.indexEntryCount}\n`);
  process.stdout.write(`WORKTREE_PATH_COUNT ${result.worktreePathCount}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(2);
  }
}
