#!/usr/bin/env node
// Fail-closed Vitest execution wrapper.
//
// Vitest's own exit code cannot be trusted alone: under memory pressure,
// worker-start timeouts have been observed to leave a run reporting zero
// executed test files/tests while still producing output. This wrapper
// requires Vitest's `json` reporter result to independently prove that at
// least one test file and one test actually ran and passed, in addition to
// checking the process exit code.
//
// Usage:
//   node scripts/run-vitest.mjs run [-- <extra vitest args>]
//   node scripts/run-vitest.mjs coverage [-- <extra vitest args>]

import { spawn } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import process from "node:process";
import { parseResultJson, validateVitestResult } from "./lib/vitest-result-validation.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const [mode, ...rest] = process.argv.slice(2);
const extraArgs = rest[0] === "--" ? rest.slice(1) : rest;

if (mode !== "run" && mode !== "coverage") {
  console.error(`Usage: node scripts/run-vitest.mjs <run|coverage> [-- <extra vitest args>]`);
  process.exit(1);
}

const vitestBin = path.join(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "vitest.cmd" : "vitest",
);

const resultFile = path.join(
  os.tmpdir(),
  `vitest-result-${process.pid}-${Math.random().toString(36).slice(2)}.json`,
);

const vitestArgs = [
  "run",
  "--reporter=default",
  "--reporter=json",
  `--outputFile.json=${resultFile}`,
  ...(mode === "coverage" ? ["--coverage"] : []),
  ...extraArgs,
];

function fail(reason) {
  console.error(`\nVitest execution rejected: ${reason}.`);
  process.exitCode = 1;
}

async function main() {
  const child = spawn(vitestBin, vitestArgs, {
    cwd: repoRoot,
    stdio: "inherit",
  });

  const forward = (signal) => {
    if (!child.killed) child.kill(signal);
  };
  process.on("SIGINT", forward);
  process.on("SIGTERM", forward);

  const exitCode = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  }).catch((error) => {
    fail(`failed to start Vitest (${error.message})`);
    return null;
  });

  process.off("SIGINT", forward);
  process.off("SIGTERM", forward);

  if (exitCode === null) return;

  let raw;
  try {
    raw = await readFile(resultFile, "utf8");
  } catch {
    fail("machine-readable result was not produced");
    return;
  }

  const parsed = parseResultJson(raw);
  if (!parsed.ok) {
    fail(parsed.reason);
    return;
  }

  const validated = validateVitestResult(parsed.value);
  if (!validated.ok) {
    fail(validated.reason);
    return;
  }

  if (exitCode !== 0) {
    fail(`Vitest exited with code ${exitCode} despite a nominally valid result`);
    return;
  }

  const { testFiles, tests, passed } = validated.summary;
  console.log(
    `\nVitest execution accepted: ${testFiles} test file(s), ${tests} test(s) executed, ${passed} passed.`,
  );
  process.exitCode = 0;
}

main().finally(() => rm(resultFile, { force: true }));
