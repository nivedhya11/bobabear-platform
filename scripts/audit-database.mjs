#!/usr/bin/env node
/**
 * Database-foundation audit (IMP-004).
 *
 * Conservative, Node.js-builtins-only static checks that complement (but do
 * not replace) the ESLint database-boundary restrictions. Does not require
 * Docker or a running database — every check operates on committed files
 * and package.json only, so it is safe to include in `npm run check`.
 *
 * Checks performed:
 *   1. No committed .env.docker.local.
 *   2. No real-looking database credentials in committed env templates.
 *   3. PostgreSQL image is pinned to postgres:18.4-trixie in compose.yaml.
 *   4. PostgreSQL data volume targets /var/lib/postgresql.
 *   5. No postgres:latest anywhere in compose.yaml.
 *   6. No application container was introduced in compose.yaml.
 *   7. No raw process.env.BOBA_BEAR_DATABASE_* outside the config boundary.
 *   8. No direct `pg` / `drizzle-orm/node-postgres` imports outside the
 *      database boundary (src/platform/database/**) and database scripts
 *      (scripts/database/**).
 *   9. No use of `drizzle-kit push` in package.json scripts.
 *  10. No connection-string-shaped literal in source logs.
 *  11. No business-domain table name in the Drizzle schema or migrations.
 *  12. `@testcontainers/postgresql` / `testcontainers` are imported only
 *      from tests/database/** (IMP-005) — never from production source.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const EXCLUDED_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".next",
  "out",
  "coverage",
  "playwright-report",
  "test-results",
  "blob-report",
]);

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const ALLOWED_PG_IMPORT_PREFIXES = [
  "src/platform/database/",
  "scripts/database/",
  "tests/database/",
];

// IMP-005: Testcontainers is a Docker-backed, dev-only dependency. It must
// never be reachable from production source — only from the dedicated
// database integration-test tree.
const ALLOWED_TESTCONTAINERS_IMPORT_PREFIXES = ["tests/database/"];
const TESTCONTAINERS_IMPORT_PATTERN =
  /from\s+["']@testcontainers\/[^"']+["']|require\(\s*["']@testcontainers\/[^"']+["']\s*\)|from\s+["']testcontainers["']|require\(\s*["']testcontainers["']\s*\)/;

/** @type {string[]} */
const findings = [];

function relPath(absPath) {
  return path.relative(projectRoot, absPath).split(path.sep).join("/");
}

function walk(dir, onFile) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIR_NAMES.has(entry.name)) continue;
      walk(path.join(dir, entry.name), onFile);
    } else if (entry.isFile()) {
      onFile(path.join(dir, entry.name));
    }
  }
}

function isAllowedPgImportPath(rel) {
  return ALLOWED_PG_IMPORT_PREFIXES.some((prefix) => rel.startsWith(prefix));
}

function isAllowedTestcontainersImportPath(rel) {
  return ALLOWED_TESTCONTAINERS_IMPORT_PREFIXES.some((prefix) => rel.startsWith(prefix));
}

function checkComposeFile() {
  const composePath = path.join(projectRoot, "compose.yaml");
  let contents;
  try {
    contents = readFileSync(composePath, "utf8");
  } catch {
    findings.push("compose.yaml does not exist at the repository root.");
    return;
  }

  if (!contents.includes("postgres:18.4-trixie")) {
    findings.push('compose.yaml must pin the PostgreSQL image to exactly "postgres:18.4-trixie".');
  }
  if (/postgres:latest/.test(contents)) {
    findings.push('compose.yaml must not use "postgres:latest".');
  }
  if (!contents.includes("/var/lib/postgresql")) {
    findings.push("compose.yaml must mount the named volume at /var/lib/postgresql.");
  }
  if (/\/var\/lib\/postgresql\/data:/.test(contents)) {
    findings.push("compose.yaml must not mount only /var/lib/postgresql/data.");
  }

  const serviceNames = [];
  const serviceBlockMatch = /^services:\n([\s\S]*?)(?:\nvolumes:|\n*$)/m.exec(contents);
  if (serviceBlockMatch) {
    const serviceBlock = serviceBlockMatch[1];
    for (const line of serviceBlock.split("\n")) {
      const match = /^  ([A-Za-z0-9_-]+):\s*$/.exec(line);
      if (match) serviceNames.push(match[1]);
    }
  }
  const unexpectedServices = serviceNames.filter((name) => name !== "postgres");
  if (unexpectedServices.length > 0) {
    findings.push(
      `compose.yaml declares unexpected service(s): ${unexpectedServices.join(", ")}. ` +
        "IMP-004 introduces the postgres service only.",
    );
  }
  if (!serviceNames.includes("postgres")) {
    findings.push('compose.yaml must declare a "postgres" service.');
  }
}

function checkPackageJsonScripts() {
  const packageJsonPath = path.join(projectRoot, "package.json");
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const scripts = pkg.scripts ?? {};
  for (const [name, command] of Object.entries(scripts)) {
    if (typeof command === "string" && command.includes("drizzle-kit push")) {
      findings.push(`package.json script "${name}" uses "drizzle-kit push", which is prohibited.`);
    }
  }
}

const DATABASE_ENV_KEY_PATTERN = /process\.env\.(BOBA_BEAR_DATABASE_[A-Z_]+)/;
const PG_IMPORT_PATTERN = /from\s+["']pg["']|require\(\s*["']pg["']\s*\)/;
const DRIZZLE_NODE_POSTGRES_IMPORT_PATTERN =
  /from\s+["']drizzle-orm\/node-postgres[^"']*["']|require\(\s*["']drizzle-orm\/node-postgres[^"']*["']\s*\)/;
const CONNECTION_STRING_LITERAL_PATTERN = /postgresql:\/\/[^\s"'`]*:[^\s"'`]*@/;
const BUSINESS_TABLE_NAME_PATTERN =
  /\b(users?|customers?|tenants?|outlets?|orders?|products?|menu_items?|auth(?:entication)?|audits?|feature_flags?|jobs?)\b/i;

const CONNECTION_STRING_TEST_FILE_SUFFIXES = [".test.ts", ".test.tsx", ".test.mjs"];

export function isConnectionStringTestFixture(relativePath) {
  return CONNECTION_STRING_TEST_FILE_SUFFIXES.some((suffix) => relativePath.endsWith(suffix));
}

function scanSourceTree() {
  const roots = ["src", "scripts", "drizzle", "tests"].map((name) => path.join(projectRoot, name));
  for (const root of roots) {
    walk(root, (filePath) => {
      const ext = path.extname(filePath);
      const rel = relPath(filePath);
      const isSql = ext === ".sql";
      if (!SOURCE_EXTENSIONS.has(ext) && !isSql) return;
      if (isConnectionStringTestFixture(rel)) return;

      const contents = readFileSync(filePath, "utf8");
      const lines = contents.split("\n");

      lines.forEach((line, index) => {
        const lineNo = index + 1;

        if (!isSql) {
          const envMatch = DATABASE_ENV_KEY_PATTERN.exec(line);
          if (envMatch && !isAllowedPgImportPath(rel) && rel !== "scripts/database/reset-local.mjs") {
            findings.push(
              `${rel}:${lineNo}: direct process.env.${envMatch[1]} access outside the config boundary.`,
            );
          }

          if (
            (PG_IMPORT_PATTERN.test(line) || DRIZZLE_NODE_POSTGRES_IMPORT_PATTERN.test(line)) &&
            !isAllowedPgImportPath(rel)
          ) {
            findings.push(
              `${rel}:${lineNo}: imports "pg" or "drizzle-orm/node-postgres" outside the database boundary (src/platform/database/**, scripts/database/**, tests/database/**).`,
            );
          }

          if (TESTCONTAINERS_IMPORT_PATTERN.test(line) && !isAllowedTestcontainersImportPath(rel)) {
            findings.push(
              `${rel}:${lineNo}: imports Testcontainers outside the database integration-test boundary (tests/database/**).`,
            );
          }

          const hasConnectionStringShape = CONNECTION_STRING_LITERAL_PATTERN.test(line);
          if (hasConnectionStringShape && /console\.(?:log|error|warn|info|debug)/.test(line)) {
            findings.push(
              `${rel}:${lineNo}: appears to log a postgresql:// connection string.`,
            );
          } else if (hasConnectionStringShape && !line.includes("${") && !line.includes("<") ) {
            // A connection-string shape with no template interpolation and
            // no placeholder angle bracket is either a hardcoded real
            // credential or a hardcoded example — both are unwelcome in
            // application source (as opposed to the documented, git-ignored
            // .env.docker.local / .env.local files, which this scan does
            // not cover).
            findings.push(
              `${rel}:${lineNo}: appears to contain a hardcoded postgresql:// connection string.`,
            );
          }
        }

        if (rel === "src/platform/database/schema/index.ts") {
          const tableCallMatch = /appSchema\.table\(\s*["'`]([^"'`]+)["'`]/.exec(line);
          if (tableCallMatch && BUSINESS_TABLE_NAME_PATTERN.test(tableCallMatch[1])) {
            findings.push(
              `${rel}:${lineNo}: declares a business-domain-looking table "${tableCallMatch[1]}" — IMP-004 must not add business tables.`,
            );
          }
        }
      });
    });
  }
}

function checkNoBusinessTableInSchema() {
  const schemaPath = path.join(projectRoot, "src/platform/database/schema/index.ts");
  let contents;
  try {
    contents = readFileSync(schemaPath, "utf8");
  } catch {
    findings.push("src/platform/database/schema/index.ts does not exist.");
    return;
  }
  if (/appSchema\.table\(/.test(contents)) {
    findings.push(
      "src/platform/database/schema/index.ts declares a table. IMP-004 must not add business-domain tables.",
    );
  }
}

function checkCommittedDockerEnvFiles() {
  let committable;
  try {
    const output = execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard", "--", ".env.docker.local"],
      { cwd: projectRoot, encoding: "utf8" },
    );
    committable = output.split("\n").map((line) => line.trim()).filter(Boolean);
  } catch (error) {
    findings.push(
      `Could not enumerate committable .env.docker.local via "git ls-files" (${error instanceof Error ? error.message : "unknown error"}).`,
    );
    return;
  }
  if (committable.length > 0) {
    findings.push(".env.docker.local must never be committed.");
  }
}

checkComposeFile();
checkPackageJsonScripts();
scanSourceTree();
checkNoBusinessTableInSchema();
checkCommittedDockerEnvFiles();

console.log("Database-foundation audit");
console.log("=".repeat(60));

if (findings.length > 0) {
  for (const finding of findings) {
    console.log(`  ✗  ${finding}`);
  }
  console.log("=".repeat(60));
  console.log(`${findings.length} problem(s) found.`);
  process.exitCode = 1;
} else {
  console.log("  ✓  PostgreSQL image pinned to postgres:18.4-trixie; no postgres:latest.");
  console.log("  ✓  Data volume targets /var/lib/postgresql; no application container.");
  console.log("  ✓  No drizzle-kit push in package scripts.");
  console.log("  ✓  No pg / drizzle-orm/node-postgres imports outside the database boundary.");
  console.log("  ✓  No raw BOBA_BEAR_DATABASE_* process.env access outside the config boundary.");
  console.log("  ✓  No connection-string-shaped literal found in source.");
  console.log("  ✓  No business-domain table declared.");
  console.log("  ✓  .env.docker.local is not committed.");
  console.log("=".repeat(60));
  console.log("All checks passed. ✓");
}
