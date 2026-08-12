#!/usr/bin/env -S node --import tsx
/**
 * Better Auth schema-generation helper (IMP-008).
 *
 * Regenerates both realms' Better Auth 1.6.25 core contracts via the
 * locally-installed `auth` CLI (`--adapter drizzle --dialect postgresql`,
 * no database connection, no network) for manual inspection.
 *
 * Fail-safe by default: writes into a disposable directory under the OS
 * temp dir and prints its path, unless `--output <dir>` is given. Never
 * overwrites `src/platform/database/schema/**` — that requires editing the
 * production schema files by hand (see AGENTS.md's IMP-008 section) after
 * reviewing the difference, not an automatic overwrite.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const GENERATE_TIMEOUT_MS = 240_000;

function parseOutputDir(): string {
  const flagIndex = process.argv.indexOf("--output");
  if (flagIndex !== -1 && process.argv[flagIndex + 1]) {
    return path.resolve(process.argv[flagIndex + 1]);
  }
  return mkdtempSync(path.join(tmpdir(), "boba-bear-auth-schema-generate-"));
}

function generate(cliConfigRelativePath: string, outputPath: string): void {
  const authBin = path.join(projectRoot, "node_modules", ".bin", "auth");
  execFileSync(
    authBin,
    [
      "generate",
      "--config",
      cliConfigRelativePath,
      "--output",
      outputPath,
      "--adapter",
      "drizzle",
      "--dialect",
      "postgresql",
      "--yes",
    ],
    { cwd: projectRoot, stdio: ["ignore", "inherit", "inherit"], timeout: GENERATE_TIMEOUT_MS },
  );
}

function main(): void {
  const outputDir = parseOutputDir();
  const customerPath = path.join(outputDir, "customer.generated.ts");
  const workforcePath = path.join(outputDir, "workforce.generated.ts");

  generate("scripts/auth/schema-contract/customer-auth.cli.ts", customerPath);
  generate("scripts/auth/schema-contract/workforce-auth.cli.ts", workforcePath);

  console.log(`Generated customer contract: ${customerPath}`);
  console.log(`Generated workforce contract: ${workforcePath}`);
  console.log("Review these against src/platform/database/schema/{customer,workforce}-auth.ts by hand.");
}

main();
