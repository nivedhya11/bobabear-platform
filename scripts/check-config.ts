#!/usr/bin/env -S node --import tsx
/**
 * Repository-owned configuration-check CLI.
 *
 * Loads repository-root environment files using Next.js-compatible
 * precedence (via `@next/env`) and validates them against the shared
 * BOBA Bear configuration schema — the same schema the application itself
 * uses. This script does not duplicate any validation rule.
 *
 * Usage:
 *   tsx scripts/check-config.ts --process web
 *   tsx scripts/check-config.ts --process worker
 *   tsx scripts/check-config.ts --process migration
 *
 * Exits 0 on valid configuration, non-zero otherwise. Never prints raw
 * `process.env` or secret values.
 */
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

import { loadEnvConfig } from "@next/env";

import { ConfigurationError } from "../src/platform/config/config-error";
import { loadConfig } from "../src/platform/config/load-config";
import { resolvePublicConfig } from "../src/platform/config/public-config";
import { formatSafeSummary } from "../src/platform/config/summary";
import { PROCESS_KINDS, type ProcessKind } from "../src/platform/config/types";

function parseProcessKind(argv: readonly string[]): ProcessKind {
  let raw = "web";
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--process") {
      raw = argv[i + 1] ?? raw;
      i += 1;
    } else if (arg.startsWith("--process=")) {
      raw = arg.slice("--process=".length);
    }
  }
  if (!(PROCESS_KINDS as readonly string[]).includes(raw)) {
    throw new Error(
      `Invalid --process value "${raw}". Must be one of: ${PROCESS_KINDS.join(", ")}.`,
    );
  }
  return raw as ProcessKind;
}

function main(): void {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(scriptDir, "..");

  // Load .env* files with Next.js-compatible precedence. This mutates
  // process.env — acceptable here because this is a repository script, not
  // application source (see scripts/audit-config-boundary.mjs).
  loadEnvConfig(projectRoot, true);

  let processKind: ProcessKind;
  try {
    processKind = parseProcessKind(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid arguments.");
    process.exitCode = 1;
    return;
  }

  try {
    const config = loadConfig({ processKind, source: process.env });

    const publicResult = resolvePublicConfig(process.env);
    if (!publicResult.ok) {
      console.error("Invalid browser-public (NEXT_PUBLIC_*) configuration:");
      for (const issue of publicResult.issues) {
        console.error(`- ${issue.key}: ${issue.message}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log(formatSafeSummary(config));
    process.exitCode = 0;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error(error.message);
    } else {
      console.error("Configuration validation failed.");
    }
    process.exitCode = 1;
  }
}

main();
