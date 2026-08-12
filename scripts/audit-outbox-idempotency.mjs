#!/usr/bin/env node
/**
 * Transactional outbox / idempotency audit (IMP-007).
 *
 * Docker-independent, Node.js-builtins-only static checks over every
 * tracked *and* untracked file (via `git ls-files --cached --others
 * --exclude-standard`), scoped precisely to the outbox/idempotency modules
 * and their public entry points — never a brittle repository-wide keyword
 * scan.
 *
 * Checks performed:
 *   1. No client-component or public-app-tree import of the outbox or
 *      idempotency modules.
 *   2. Both public entry points (outbox/index.ts, idempotency/index.ts)
 *      carry the `server-only` marker.
 *   3. No direct `pg`/`drizzle-orm/node-postgres` driver import or
 *      `createDatabaseClient` call inside the outbox/idempotency stores.
 *   4. No use of `getMigrationPersistence` inside the outbox/idempotency
 *      modules — runtime stores are application-role only.
 *   5. No bootstrap/admin or generic role-selecting persistence factory
 *      inside the outbox/idempotency modules.
 *   6. No hardcoded postgresql:// URL outside an explicit test fixture.
 *   7. No new NEXT_PUBLIC_* database-shaped variable.
 *   8. No publisher/broker/worker dependency or import (Kafka, AMQP,
 *      RabbitMQ, SQS, SNS, Redis, BullMQ, Temporal, or similar).
 *   9. `enqueueOutboxEvent`'s exported signature names
 *      `PersistenceTransactionContext`, not `PersistenceQueryContext`, for
 *      its first parameter.
 *  10. No outbox/idempotency store function calls
 *      `getApplicationPersistence`/`getMigrationPersistence` itself
 *      (stores must accept a context, never acquire their own handle).
 *  11. No raw `console.*` call in outbox/idempotency production modules.
 *  12. No automatic retry/poll/cron loop construct
 *      (`setInterval`, `setTimeout`, `while (true)`, `cron.schedule`) in
 *      outbox/idempotency production modules.
 *  13. The two sealed migration files (everything already sealed in
 *      drizzle/migration-integrity.json before this slice) still match
 *      their sealed hash — this slice must never hand-edit a previously
 *      sealed migration.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const TEST_FILE_SUFFIXES = [".test.ts", ".test.tsx", ".test.mjs", ".integration.test.ts"];

const OUTBOX_DIR = "src/server/persistence/outbox/";
const IDEMPOTENCY_DIR = "src/server/persistence/idempotency/";
const MODULE_DIRS = [OUTBOX_DIR, IDEMPOTENCY_DIR];

export function isOutboxIdempotencyTestFixture(relativePath) {
  return TEST_FILE_SUFFIXES.some((suffix) => relativePath.endsWith(suffix));
}

export function isOutboxIdempotencyModulePath(relativePath) {
  return MODULE_DIRS.some((prefix) => relativePath.startsWith(prefix));
}

export function isOutboxIdempotencyProductionPath(relativePath) {
  return isOutboxIdempotencyModulePath(relativePath) && !isOutboxIdempotencyTestFixture(relativePath);
}

/** Duplicated (not imported) from audit-persistence.mjs: that module runs
 * its own audit as an unconditional side effect at import time, so
 * importing it here would execute (and print) a second, unrelated audit
 * run. Same rough-but-permissive directive check either way. */
export function hasUseClientDirective(contents) {
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    if (line.startsWith("//")) continue;
    return /^["']use client["'];?$/.test(line);
  }
  return false;
}

const OUTBOX_IMPORT_PATTERN = /from\s+["']([^"']*\bserver\/persistence\/outbox[^"']*)["']/;
const IDEMPOTENCY_IMPORT_PATTERN = /from\s+["']([^"']*\bserver\/persistence\/idempotency[^"']*)["']/;
const PG_IMPORT_PATTERN = /from\s+["']pg["']|require\(\s*["']pg["']\s*\)/;
const DRIZZLE_RUNTIME_IMPORT_PATTERN =
  /from\s+["']drizzle-orm\/node-postgres[^"']*["']|require\(\s*["']drizzle-orm\/node-postgres[^"']*["']\s*\)/;
const CREATE_DATABASE_CLIENT_PATTERN = /\bcreateDatabaseClient\s*\(/;
const CONNECTION_STRING_LITERAL_PATTERN = /postgresql:\/\/[^\s"'`]*:[^\s"'`]*@/;
const MIGRATION_FACTORY_USAGE_PATTERN = /getMigrationPersistence\s*\(/;
const GLOBAL_PERSISTENCE_ACQUISITION_PATTERN =
  /\b(getApplicationPersistence|getMigrationPersistence)\s*\(/;
const ADMIN_FACTORY_PATTERN =
  /\b(getAdminPersistence|getBootstrapPersistence|AdminPersistenceConfig|BootstrapPersistenceConfig)\b/;
const GENERIC_ROLE_FACTORY_PATTERN =
  /export\s+(?:async\s+)?function\s+getPersistence\s*\(|export\s+const\s+getPersistence\s*=/;
const NEXT_PUBLIC_DATABASE_PATTERN = /NEXT_PUBLIC_[A-Z0-9_]*DATABASE[A-Z0-9_]*/;
const CONSOLE_CALL_PATTERN = /console\.(log|error|warn|info|debug|trace)\s*\(/;
const RETRY_LOOP_PATTERN = /\bsetInterval\s*\(|\bsetTimeout\s*\(|while\s*\(\s*true\s*\)|cron\.schedule\s*\(/;
const BROKER_KEYWORD_PATTERN =
  /\b(kafka|kafkajs|amqplib|amqp|rabbitmq|aws-sdk\/clients\/sqs|@aws-sdk\/client-sqs|@aws-sdk\/client-sns|ioredis|redis|bullmq|temporalio|node-cron)\b/i;
const BROKER_PACKAGE_NAME_PATTERN =
  /^(kafkajs|amqplib|amqp-connection-manager|rabbitmq-client|ioredis|redis|bullmq|@temporalio\/|node-cron|@aws-sdk\/client-sqs|@aws-sdk\/client-sns)/i;

/** @type {string[]} */
const findings = [];

function listAllFiles() {
  const output = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    { cwd: projectRoot, encoding: "utf8" },
  );
  return output.split("\n").map((line) => line.trim()).filter(Boolean);
}

function readTextFile(relativePath) {
  try {
    return readFileSync(path.join(projectRoot, relativePath), "utf8");
  } catch {
    return null;
  }
}

function checkEntryPointsAreServerOnly() {
  for (const rel of [`${OUTBOX_DIR}index.ts`, `${IDEMPOTENCY_DIR}index.ts`]) {
    const contents = readTextFile(rel);
    if (contents === null) {
      findings.push(`${rel} does not exist — a required public entry point is missing.`);
      continue;
    }
    if (!/^\s*import\s+["']server-only["'];?\s*$/m.test(contents)) {
      findings.push(`${rel} must start with \`import "server-only";\`.`);
    }
  }
}

function checkEnqueueRequiresTransactionContext() {
  const rel = `${OUTBOX_DIR}store.ts`;
  const contents = readTextFile(rel);
  if (contents === null) {
    findings.push(`${rel} does not exist — enqueueOutboxEvent is missing.`);
    return;
  }
  const match = /export\s+async\s+function\s+enqueueOutboxEvent\s*\(([^)]*)\)/s.exec(contents);
  if (!match) {
    findings.push(`${rel}: does not export an \`enqueueOutboxEvent\` function.`);
    return;
  }
  const signature = match[1];
  if (!/PersistenceTransactionContext/.test(signature)) {
    findings.push(
      `${rel}: enqueueOutboxEvent's first parameter must be typed as PersistenceTransactionContext, not a plain query context.`,
    );
  }
}

function checkNewPublicDatabaseEnvVar(files) {
  for (const rel of [".env.example", "src/platform/config/public-config.ts"]) {
    if (!files.includes(rel)) continue;
    const contents = readTextFile(rel);
    if (contents === null) continue;
    const match = NEXT_PUBLIC_DATABASE_PATTERN.exec(contents);
    if (match) {
      findings.push(`${rel}: introduces a new browser-visible database variable "${match[0]}".`);
    }
  }
}

function checkPackageJsonForBrokerDependencies() {
  const pkg = JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8"));
  const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  for (const name of Object.keys(allDeps)) {
    if (BROKER_PACKAGE_NAME_PATTERN.test(name)) {
      findings.push(`package.json: declares a broker/publisher dependency "${name}", which is prohibited in this slice.`);
    }
  }
}

function checkSealedMigrationsUnchanged() {
  const manifestPath = path.join(projectRoot, "drizzle/migration-integrity.json");
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    // No manifest yet, or unreadable — db:migrations:check already covers
    // this more thoroughly; nothing further to assert here.
    return;
  }
  for (const entry of manifest.migrations ?? []) {
    if (entry.tag === "0001_transactional_outbox_idempotency") continue; // this slice's own migration
    const contents = readTextFile(entry.path);
    if (contents === null) {
      findings.push(`${entry.path}: previously sealed migration is missing.`);
      continue;
    }
    const actualHash = createHash("sha256").update(contents).digest("hex");
    if (actualHash !== entry.sha256) {
      findings.push(`${entry.path}: previously sealed migration content has changed — this must never happen.`);
    }
  }
}

function scanSourceTree(files) {
  for (const rel of files) {
    const ext = path.extname(rel);
    if (!SOURCE_EXTENSIONS.has(ext)) continue;

    const contents = readTextFile(rel);
    if (contents === null) continue;
    const lines = contents.split("\n");
    const isClientModule = hasUseClientDirective(contents);
    const isPublicAppTree = rel.startsWith("src/app/") || rel.startsWith("src/components/");
    const isModulePath = isOutboxIdempotencyModulePath(rel);
    const isModuleProductionPath = isOutboxIdempotencyProductionPath(rel);
    const isTestFixture = isOutboxIdempotencyTestFixture(rel);

    lines.forEach((line, index) => {
      const lineNo = index + 1;

      const outboxImportMatch = OUTBOX_IMPORT_PATTERN.exec(line);
      const idempotencyImportMatch = IDEMPOTENCY_IMPORT_PATTERN.exec(line);
      if (outboxImportMatch || idempotencyImportMatch) {
        if (isPublicAppTree) {
          findings.push(
            `${rel}:${lineNo}: imports the outbox/idempotency boundary from the public application tree (src/app/**, src/components/**).`,
          );
        } else if (isClientModule) {
          findings.push(
            `${rel}:${lineNo}: a "use client" module imports the outbox/idempotency boundary — it must never reach a browser bundle.`,
          );
        }
      }

      if (isModuleProductionPath) {
        if (PG_IMPORT_PATTERN.test(line) || DRIZZLE_RUNTIME_IMPORT_PATTERN.test(line)) {
          findings.push(`${rel}:${lineNo}: imports "pg" or "drizzle-orm/node-postgres" directly — reuse the IMP-006 persistence boundary instead.`);
        }
        if (CREATE_DATABASE_CLIENT_PATTERN.test(line)) {
          findings.push(`${rel}:${lineNo}: calls createDatabaseClient() directly — reuse the IMP-006 persistence boundary instead.`);
        }
        if (MIGRATION_FACTORY_USAGE_PATTERN.test(line)) {
          findings.push(`${rel}:${lineNo}: references getMigrationPersistence — outbox/idempotency runtime stores are application-role only.`);
        }
        if (GLOBAL_PERSISTENCE_ACQUISITION_PATTERN.test(line)) {
          findings.push(`${rel}:${lineNo}: acquires a persistence handle internally — store functions must accept a context, never acquire their own.`);
        }
        if (ADMIN_FACTORY_PATTERN.test(line)) {
          findings.push(`${rel}:${lineNo}: references a bootstrap/admin persistence factory, which is prohibited.`);
        }
        if (GENERIC_ROLE_FACTORY_PATTERN.test(line)) {
          findings.push(`${rel}:${lineNo}: declares a generic, unrestricted role-selecting persistence factory, which is prohibited.`);
        }
        if (CONSOLE_CALL_PATTERN.test(line)) {
          findings.push(`${rel}:${lineNo}: contains a raw console.* call — outbox/idempotency primitives must never log.`);
        }
        if (RETRY_LOOP_PATTERN.test(line)) {
          findings.push(`${rel}:${lineNo}: contains an automatic retry/poll/cron construct, which is prohibited in this slice.`);
        }
        if (BROKER_KEYWORD_PATTERN.test(line)) {
          findings.push(`${rel}:${lineNo}: references a message-broker/worker integration, which is prohibited in this slice.`);
        }
      }

      if (isModulePath && !isTestFixture && CONNECTION_STRING_LITERAL_PATTERN.test(line)) {
        findings.push(`${rel}:${lineNo}: contains a hardcoded postgresql:// connection string.`);
      }
    });
  }
}

const files = listAllFiles();

checkEntryPointsAreServerOnly();
checkEnqueueRequiresTransactionContext();
checkNewPublicDatabaseEnvVar(files);
checkPackageJsonForBrokerDependencies();
checkSealedMigrationsUnchanged();
scanSourceTree(files);

console.log("Outbox/idempotency audit");
console.log("=".repeat(60));

if (findings.length > 0) {
  for (const finding of findings) {
    console.log(`  ✗  ${finding}`);
  }
  console.log("=".repeat(60));
  console.log(`${findings.length} problem(s) found.`);
  process.exitCode = 1;
} else {
  console.log("  ✓  Both public entry points carry the server-only marker.");
  console.log("  ✓  No client-component or public-app-tree import.");
  console.log("  ✓  enqueueOutboxEvent requires a transaction context.");
  console.log("  ✓  No direct driver/pool/admin/migration-role use in the stores.");
  console.log("  ✓  No hardcoded connection string; no new NEXT_PUBLIC_* database variable.");
  console.log("  ✓  No broker/publisher/worker dependency or import.");
  console.log("  ✓  No raw logging or automatic retry/poll/cron construct.");
  console.log("  ✓  Previously sealed migrations are unchanged.");
  console.log("=".repeat(60));
  console.log("All checks passed. ✓");
}
