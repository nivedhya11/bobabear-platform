#!/usr/bin/env -S node --import tsx
/**
 * Repository migration-runner CLI (IMP-004).
 *
 * Loads repository-root environment files using Next.js-compatible
 * precedence, loads the central configuration as process kind "migration",
 * applies every pending repository migration in ./drizzle, and exits.
 *
 * Never runs automatically from the web/worker process or from Next.js
 * instrumentation — this is a deliberate, explicit, human- or CI-triggered
 * action only.
 *
 * Usage: tsx scripts/database/migrate.ts
 * Exits 0 on success, non-zero otherwise. Never prints a connection string
 * or password.
 */
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

import { loadEnvConfig } from "@next/env";

import { ConfigurationError } from "../../src/platform/config/config-error";
import { loadConfig } from "../../src/platform/config/load-config";
import { runMigrations } from "../../src/platform/database/migrate";

async function main(): Promise<void> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(scriptDir, "..", "..");

  loadEnvConfig(projectRoot, true);

  try {
    const config = loadConfig({ processKind: "migration", source: process.env });
    await runMigrations(config);
    console.log("db:migrate: migrations applied successfully.");
    process.exitCode = 0;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error(error.message);
    } else if (error instanceof Error) {
      console.error(`db:migrate: ${error.message}`);
    } else {
      console.error("db:migrate: migration failed.");
    }
    process.exitCode = 1;
  }
}

main();
