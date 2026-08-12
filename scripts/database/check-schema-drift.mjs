#!/usr/bin/env node
/**
 * Schema-drift validation (IMP-005).
 *
 * Proves that running `drizzle-kit generate` against the real Drizzle
 * schema right now would produce *no* new migration and *no* modification
 * to any committed migration/snapshot/journal file — i.e. the committed
 * migration history is fully caught up with `src/platform/database/schema`.
 *
 * Operates entirely inside an OS temporary directory (a copy of `drizzle/`);
 * the real `drizzle/` directory is never touched. Requires no database
 * connection and never prints credentials. Non-interactive: stdin is closed
 * and the generate command is bounded by a timeout, so it fails rather than
 * hangs if Drizzle Kit would otherwise prompt for input.
 */
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");
const realDrizzleDir = path.join(projectRoot, "drizzle");
const GENERATE_TIMEOUT_MS = 60_000;

/** Recursively list `dir` as a map of relative path -> file contents, for
 * comparing two migration-history trees byte-for-byte. Pure I/O helper. */
function snapshotTree(dir) {
  const files = new Map();
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        files.set(path.relative(dir, full).split(path.sep).join("/"), readFileSync(full, "utf8"));
      }
    }
  };
  walk(dir);
  return files;
}

function diffTrees(before, after) {
  const findings = [];
  for (const [file, contents] of after) {
    if (!before.has(file)) {
      findings.push(`drizzle-kit generate would create a new file: ${file}`);
    } else if (before.get(file) !== contents) {
      findings.push(`drizzle-kit generate would modify an existing file: ${file}`);
    }
  }
  for (const file of before.keys()) {
    if (!after.has(file)) {
      findings.push(`drizzle-kit generate would remove an existing file: ${file}`);
    }
  }
  return findings;
}

function main() {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "boba-bear-schema-drift-"));
  const tempDrizzleDir = path.join(tempRoot, "drizzle");

  try {
    cpSync(realDrizzleDir, tempDrizzleDir, { recursive: true });
    const before = snapshotTree(tempDrizzleDir);

    const tempConfigPath = path.join(tempRoot, "drizzle.config.mjs");
    const schemaGlob = path.join(projectRoot, "src/platform/database/schema/**/*.ts").split(path.sep).join("/");
    // A plain object literal, not `defineConfig(...)` — the temp file lives
    // outside the repository's node_modules resolution chain, so importing
    // "drizzle-kit" from here would fail. `defineConfig` is only an identity
    // helper for type-checking; Drizzle Kit accepts a plain default export.
    // `out` is deliberately a *relative* path ("drizzle"), resolved against
    // `cwd: tempRoot` below — mirroring the repository's own
    // drizzle.config.ts (which also uses a relative `out: "drizzle"`).
    // Drizzle Kit does not reliably re-read an existing meta/snapshot tree
    // when `out` is given as an absolute path: it can silently fail to
    // detect real schema changes (reporting no drift when drift exists)
    // instead of throwing. Do not "simplify" this back to an absolute path
    // without first re-proving drift detection against a non-empty,
    // pre-populated `out` directory.
    writeFileSync(
      tempConfigPath,
      [
        "export default {",
        "  dialect: \"postgresql\",",
        `  schema: ${JSON.stringify(schemaGlob)},`,
        "  out: \"drizzle\",",
        "  migrations: { schema: \"drizzle\", table: \"__drizzle_migrations\" },",
        "};",
      ].join("\n"),
    );

    // Invoke the repository's own locally-installed drizzle-kit binary by
    // absolute path rather than `npx drizzle-kit` — `cwd` below is the
    // temporary directory (required so the relative `out: "drizzle"` above
    // resolves correctly), which has no node_modules of its own, so `npx`
    // would otherwise try to download a fresh, potentially mismatched
    // drizzle-kit from the registry instead of using the pinned local one.
    const localDrizzleKitBin = path.join(projectRoot, "node_modules", ".bin", "drizzle-kit");

    let generateOutput = "";
    try {
      generateOutput = execFileSync(
        localDrizzleKitBin,
        ["generate", `--config=${tempConfigPath}`],
        {
          cwd: tempRoot,
          stdio: ["ignore", "pipe", "pipe"],
          timeout: GENERATE_TIMEOUT_MS,
          encoding: "utf8",
        },
      );
    } catch (error) {
      console.log("Schema-drift validation");
      console.log("=".repeat(60));
      console.log("  ✗  drizzle-kit generate failed, timed out, or required interactive input.");
      if (error.stdout) console.log(error.stdout.toString());
      if (error.stderr) console.log(error.stderr.toString());
      process.exitCode = 1;
      return;
    }

    const after = snapshotTree(tempDrizzleDir);
    const findings = diffTrees(before, after);

    console.log("Schema-drift validation");
    console.log("=".repeat(60));
    if (findings.length > 0) {
      for (const finding of findings) console.log(`  ✗  ${finding}`);
      console.log("=".repeat(60));
      console.log(`${findings.length} problem(s) found. Generate a migration with "npm run db:generate".`);
      if (generateOutput) console.log(generateOutput);
      process.exitCode = 1;
      return;
    }

    console.log("  ✓  No new migration would be generated.");
    console.log("  ✓  No committed snapshot or journal entry would change.");
    console.log("=".repeat(60));
    console.log("No schema drift detected. ✓");
    process.exitCode = 0;
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

main();
