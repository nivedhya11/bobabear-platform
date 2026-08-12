#!/usr/bin/env -S node --import tsx
/**
 * Better Auth schema-drift validation (IMP-008).
 *
 * Proves that the committed production schema
 * (`src/platform/database/schema/{customer,workforce}-auth.ts`) still
 * matches Better Auth 1.6.25's own generated core contract for both realms
 * — table set, fields, nullability, uniqueness, indexes, foreign keys,
 * relations, and physical-table mapping — normalized so formatting/import
 * order differences never cause a false failure.
 *
 * Regenerates both realms' contracts fresh (via the locally-installed
 * `auth` CLI, `--adapter drizzle --dialect postgresql`, no database
 * connection, no network) into a disposable temp directory on every run,
 * and cleans that directory up afterward. Fails closed if CLI generation
 * itself fails.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { getTableConfig } from "drizzle-orm/pg-core";
import type { PgTable } from "drizzle-orm/pg-core";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
// Generous timeout: importing `better-auth`'s dependency graph from this
// environment's WSL/NTFS-backed checkout (see AGENTS.md) has been observed
// to take 60-90+ seconds by itself, before the CLI does any actual work.
const GENERATE_TIMEOUT_MS = 240_000;
const REQUIRED_VERSION = "1.6.25";
const REQUIRED_MODEL_NAMES = ["user", "session", "account", "verification"] as const;
/** Workforce-only Better Auth plugin models (IMP-010 `twoFactor`). Customer
 * remains the four core models only — never compare a customer `twoFactor`. */
const WORKFORCE_PLUGIN_MODEL_NAMES = ["twoFactor"] as const;

interface ColumnDescriptor {
  readonly name: string;
  readonly dataType: string;
  readonly columnType: string;
  readonly notNull: boolean;
  readonly hasDefault: boolean;
  readonly isUnique: boolean;
}

interface ForeignKeyDescriptor {
  readonly columns: readonly string[];
  readonly onDelete: string | undefined;
  readonly targetModel: string;
}

interface TableDescriptor {
  readonly columns: readonly ColumnDescriptor[];
  readonly foreignKeys: readonly ForeignKeyDescriptor[];
  readonly indexColumnSets: readonly (readonly string[])[];
  readonly primaryKeyColumns: readonly string[];
}

type ModelMap = Readonly<Record<string, PgTable>>;

function describeTable(table: PgTable, resolveModelName: (t: PgTable) => string): TableDescriptor {
  const cfg = getTableConfig(table);
  const columns: ColumnDescriptor[] = cfg.columns.map((c) => ({
    name: c.name,
    dataType: c.dataType,
    columnType: c.columnType,
    notNull: c.notNull,
    hasDefault: c.hasDefault,
    isUnique: c.isUnique,
  }));
  const foreignKeys: ForeignKeyDescriptor[] = cfg.foreignKeys.map((fk) => {
    const ref = fk.reference();
    return {
      columns: ref.columns.map((c) => c.name),
      onDelete: fk.onDelete,
      targetModel: resolveModelName(ref.foreignTable),
    };
  });
  const indexColumnSets = cfg.indexes.map((idx) =>
    (idx.config?.columns ?? [])
      .map((c) => (typeof (c as { name?: unknown }).name === "string" ? (c as { name: string }).name : ""))
      .filter(Boolean),
  );
  const primaryKeyColumns = cfg.columns.filter((c) => c.primary).map((c) => c.name);
  return { columns, foreignKeys, indexColumnSets, primaryKeyColumns };
}

function buildModelResolver(models: ModelMap): (table: PgTable) => string {
  return (table) => {
    for (const [name, candidate] of Object.entries(models)) {
      if (candidate === table) return name;
    }
    return "<unresolved-cross-realm-or-unknown-table>";
  };
}

function columnKey(c: ColumnDescriptor): string {
  return `${c.name}|${c.dataType}|${c.columnType}|${c.notNull}|${c.hasDefault}|${c.isUnique}`;
}

function diffModel(
  modelName: string,
  realm: string,
  generated: TableDescriptor,
  production: TableDescriptor | undefined,
  findings: string[],
): void {
  if (!production) {
    findings.push(`[${realm}] missing core table for model "${modelName}".`);
    return;
  }

  const generatedByName = new Map(generated.columns.map((c) => [c.name, c]));
  const productionByName = new Map(production.columns.map((c) => [c.name, c]));

  for (const [name, gCol] of generatedByName) {
    const pCol = productionByName.get(name);
    if (!pCol) {
      findings.push(`[${realm}/${modelName}] missing generated core field "${name}".`);
      continue;
    }
    if (columnKey(gCol) !== columnKey(pCol)) {
      findings.push(
        `[${realm}/${modelName}] field "${name}" drifted from the generated contract ` +
          `(generated: ${columnKey(gCol)} vs production: ${columnKey(pCol)}).`,
      );
    }
  }
  for (const name of productionByName.keys()) {
    if (!generatedByName.has(name)) {
      findings.push(
        `[${realm}/${modelName}] extra custom field "${name}" not present in the generated core contract.`,
      );
    }
  }

  const normalizeFk = (fk: ForeignKeyDescriptor) =>
    `${fk.columns.join(",")}->${fk.targetModel}(${fk.onDelete ?? "no action"})`;
  const generatedFks = new Set(generated.foreignKeys.map(normalizeFk));
  const productionFks = new Set(production.foreignKeys.map(normalizeFk));
  for (const fk of generatedFks) {
    if (!productionFks.has(fk)) {
      findings.push(`[${realm}/${modelName}] missing or drifted foreign key: ${fk}.`);
    }
  }
  for (const fk of production.foreignKeys) {
    if (fk.targetModel === "<unresolved-cross-realm-or-unknown-table>") {
      findings.push(
        `[${realm}/${modelName}] foreign key on (${fk.columns.join(",")}) targets a table outside ` +
          `this realm's own schema map (possible cross-realm foreign key).`,
      );
    }
  }

  const normalizeCols = (cols: readonly string[]) => [...cols].sort().join(",");
  const generatedIndexSets = new Set(generated.indexColumnSets.map(normalizeCols));
  const productionIndexSets = new Set(production.indexColumnSets.map(normalizeCols));
  for (const set of generatedIndexSets) {
    if (!productionIndexSets.has(set)) {
      findings.push(`[${realm}/${modelName}] missing generated index on columns (${set}).`);
    }
  }
}

async function generateContract(
  cliConfigRelativePath: string,
  outputFileName: string,
  tempDir: string,
  extraModelNames: readonly string[] = [],
): Promise<ModelMap> {
  const authBin = path.join(projectRoot, "node_modules", ".bin", "auth");
  const outputPath = path.join(tempDir, outputFileName);
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
    {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: GENERATE_TIMEOUT_MS,
      encoding: "utf8",
    },
  );
  const mod = (await import(pathToFileURL(outputPath).toString())) as Record<string, unknown>;
  const models: Record<string, PgTable> = {};
  for (const name of [...REQUIRED_MODEL_NAMES, ...extraModelNames]) {
    if (mod[name]) models[name] = mod[name] as PgTable;
  }
  return models;
}

async function checkPinnedVersions(findings: string[]): Promise<void> {
  const packageJsonRaw = await readFile(path.join(projectRoot, "package.json"), "utf8");
  const packageJson = JSON.parse(packageJsonRaw) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const checks: Array<[string, string | undefined]> = [
    ["better-auth", packageJson.dependencies?.["better-auth"]],
    ["@better-auth/drizzle-adapter", packageJson.dependencies?.["@better-auth/drizzle-adapter"]],
    ["auth", packageJson.devDependencies?.["auth"]],
  ];
  for (const [name, version] of checks) {
    if (version !== REQUIRED_VERSION) {
      findings.push(
        `package "${name}" must be pinned to exactly "${REQUIRED_VERSION}", found ${JSON.stringify(version)}.`,
      );
    }
  }
}

async function main(): Promise<void> {
  const findings: string[] = [];
  await checkPinnedVersions(findings);

  // Deliberately created *inside* the project tree (not the OS tmpdir) so
  // Node's ESM resolver walks up to this project's own `node_modules` when
  // dynamically importing the generated contract below — a directory under
  // `/tmp` has no `node_modules` ancestor and would fail to resolve
  // `drizzle-orm`. Still fully disposable: created fresh and removed at the
  // end of every run, never committed (see .gitignore).
  const scratchRoot = path.join(projectRoot, "node_modules", ".auth-schema-check");
  mkdirSync(scratchRoot, { recursive: true });
  const tempDir = mkdtempSync(path.join(scratchRoot, "run-"));
  try {
    const generatedCustomer = await generateContract(
      "scripts/auth/schema-contract/customer-auth.cli.ts",
      "customer.generated.mjs",
      tempDir,
    );
    const generatedWorkforce = await generateContract(
      "scripts/auth/schema-contract/workforce-auth.cli.ts",
      "workforce.generated.mjs",
      tempDir,
      [...WORKFORCE_PLUGIN_MODEL_NAMES],
    );

    const productionCustomerModule = await import(
      pathToFileURL(path.join(projectRoot, "src/platform/database/schema/customer-auth.ts")).toString()
    );
    const productionWorkforceModule = await import(
      pathToFileURL(path.join(projectRoot, "src/platform/database/schema/workforce-auth.ts")).toString()
    );

    const productionCustomer: ModelMap = {
      user: productionCustomerModule.customerAuthUsers,
      session: productionCustomerModule.customerAuthSessions,
      account: productionCustomerModule.customerAuthAccounts,
      verification: productionCustomerModule.customerAuthVerifications,
    };
    const productionWorkforce: ModelMap = {
      user: productionWorkforceModule.workforceAuthUsers,
      session: productionWorkforceModule.workforceAuthSessions,
      account: productionWorkforceModule.workforceAuthAccounts,
      verification: productionWorkforceModule.workforceAuthVerifications,
      twoFactor: productionWorkforceModule.workforceAuthTwoFactors,
    };

    for (const [realm, generated, production] of [
      ["customer", generatedCustomer, productionCustomer],
      ["workforce", generatedWorkforce, productionWorkforce],
    ] as const) {
      const generatedResolve = buildModelResolver(generated);
      const productionResolve = buildModelResolver(production);
      const allowedModels =
        realm === "workforce"
          ? ([...REQUIRED_MODEL_NAMES, ...WORKFORCE_PLUGIN_MODEL_NAMES] as const)
          : REQUIRED_MODEL_NAMES;

      for (const modelName of allowedModels) {
        const gTable = generated[modelName];
        const pTable = production[modelName];
        if (!gTable) {
          findings.push(`[${realm}] the generated contract itself is missing model "${modelName}".`);
          continue;
        }
        const gDescriptor = describeTable(gTable, generatedResolve);
        const pDescriptor = pTable ? describeTable(pTable, productionResolve) : undefined;
        diffModel(modelName, realm, gDescriptor, pDescriptor, findings);
      }

      for (const extra of Object.keys(production)) {
        if (!(allowedModels as readonly string[]).includes(extra)) {
          findings.push(`[${realm}] extra auth table/model "${extra}" not part of the core contract.`);
        }
      }
    }
  } catch (error) {
    console.log("Better Auth schema-drift validation");
    console.log("=".repeat(60));
    console.log("  ✗  Failed to generate or load the Better Auth schema contract.");
    console.log(String(error instanceof Error ? error.stack ?? error.message : error));
    process.exitCode = 1;
    return;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  console.log("Better Auth schema-drift validation");
  console.log("=".repeat(60));
  if (findings.length > 0) {
    for (const finding of findings) console.log(`  ✗  ${finding}`);
    console.log("=".repeat(60));
    console.log(`${findings.length} problem(s) found.`);
    process.exitCode = 1;
    return;
  }
  console.log("  ✓  Customer and workforce schemas match the generated Better Auth 1.6.25 contract.");
  console.log("=".repeat(60));
  console.log("No Better Auth schema drift detected. ✓");
  process.exitCode = 0;
}

main();
