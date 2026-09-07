#!/usr/bin/env node
/**
 * Deterministic structural inventory of repository verification surfaces.
 *
 * This tool enumerates tracked test/config/script/workflow facts only.
 * It does NOT claim acceptance evidence, Golden Journey pass/fail, or
 * Product Definition / story coverage.
 *
 * Usage:
 *   node scripts/testing-inventory.mjs
 *   node scripts/testing-inventory.mjs --write
 *   node scripts/testing-inventory.mjs --check
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, "..");
const SNAPSHOT_REL = "docs/platform/testing/test-inventory.json";
const SCHEMA_VERSION = 1;

const GENERATED_PREFIXES = Object.freeze([
  "coverage/",
  "playwright-report/",
  "playwright-report-customer-auth/",
  "playwright-report-workforce-auth/",
  "playwright-report-operations-lifecycle/",
  "test-results/",
  "test-results-customer-auth/",
  "test-results-workforce-auth/",
  "test-results-operations-lifecycle/",
  "artifacts/playwright-report-customer-auth/",
  "artifacts/test-results-customer-auth/",
  ".next/",
  "out/",
  "node_modules/",
]);

const ARCHIVE_PREFIXES = Object.freeze(["archive/"]);

const PROTECTED_EVIDENCE_PREFIXES = Object.freeze([
  "test-results-customer-ordering/",
  "test-results-location-selector-layout/",
]);

const VITEST_CONFIG_BASENAMES = Object.freeze([
  "vitest.config.mts",
  "vitest.database.config.mts",
]);

const PLAYWRIGHT_CONFIG_BASENAMES = Object.freeze([
  "playwright.config.ts",
  "playwright.customer-auth.config.ts",
  "playwright.customer-ordering.config.ts",
  "playwright.location-selector.config.ts",
  "playwright.operations-lifecycle.config.ts",
  "playwright.workforce-auth.config.ts",
]);

const TEST_SUPPORT_SCRIPT_PREFIXES = Object.freeze([
  "scripts/e2e/",
  "scripts/run-vitest.mjs",
  "scripts/lib/vitest-result-validation.mjs",
  "tests/setup/",
  "tests/database/support/",
  "tests/database/global-setup.ts",
  "tests/e2e/support/",
  "tests/customer-auth/support/",
  "tests/customer-commerce/support/",
  "tests/assortment-availability/support.ts",
  "tests/catalog/support.ts",
]);

/**
 * @param {string} root
 * @returns {string[]}
 */
export function listTrackedPaths(root = DEFAULT_ROOT) {
  try {
    const out = execFileSync("git", ["-C", root, "ls-files", "-z"], {
      encoding: "buffer",
      maxBuffer: 64 * 1024 * 1024,
    });
    return normalizePaths(
      out
        .toString("utf8")
        .split("\0")
        .filter(Boolean),
    );
  } catch {
    return normalizePaths(walkFilesystem(root, ""));
  }
}

/**
 * @param {string} root
 * @param {string} rel
 * @returns {string[]}
 */
function walkFilesystem(root, rel) {
  const abs = rel ? path.join(root, rel) : root;
  /** @type {string[]} */
  const out = [];
  let entries;
  try {
    entries = readdirSync(abs, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    const posix = childRel.split(path.sep).join("/");
    if (
      startsWithAny(posix, GENERATED_PREFIXES) ||
      posix === "node_modules" ||
      posix.startsWith("node_modules/") ||
      posix === ".git" ||
      posix.startsWith(".git/")
    ) {
      continue;
    }
    if (entry.isDirectory()) {
      out.push(...walkFilesystem(root, childRel));
    } else if (entry.isFile()) {
      out.push(posix);
    }
  }
  return out;
}

/**
 * @param {string[]} paths
 * @returns {string[]}
 */
export function normalizePaths(paths) {
  const unique = new Set();
  for (const raw of paths) {
    const posix = String(raw).replace(/\\/g, "/").replace(/^\.\//, "");
    if (!posix || posix.includes("\0")) continue;
    unique.add(posix);
  }
  return [...unique].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * @param {string} pathRel
 * @param {readonly string[]} prefixes
 */
function startsWithAny(pathRel, prefixes) {
  return prefixes.some((p) => pathRel === p.slice(0, -1) || pathRel.startsWith(p));
}

/**
 * @param {string} pathRel
 */
export function isExcludedGeneratedOrArchive(pathRel) {
  return (
    startsWithAny(pathRel, GENERATED_PREFIXES) ||
    startsWithAny(pathRel, ARCHIVE_PREFIXES) ||
    startsWithAny(pathRel, PROTECTED_EVIDENCE_PREFIXES)
  );
}

/**
 * @param {string} pathRel
 */
export function isExecutableTestPath(pathRel) {
  if (isExcludedGeneratedOrArchive(pathRel)) return false;
  if (/\.test\.(ts|tsx|js|mjs|mts)$/.test(pathRel)) return true;
  if (/\.spec\.(ts|tsx|js|mjs)$/.test(pathRel)) return true;
  return false;
}

/**
 * @param {string} pathRel
 */
export function isPlaywrightSpecPath(pathRel) {
  return pathRel.startsWith("tests/e2e/") && /\.spec\.(ts|tsx)$/.test(pathRel);
}

/**
 * @param {string} pathRel
 */
export function classifyRunner(pathRel) {
  if (pathRel.endsWith(".test.mjs") && pathRel.startsWith("scripts/")) {
    return "node:test";
  }
  if (isPlaywrightSpecPath(pathRel)) {
    return "playwright";
  }
  if (/\.test\.(ts|tsx)$/.test(pathRel) || pathRel.startsWith("tests/")) {
    return "vitest";
  }
  if (/\.spec\.(ts|tsx)$/.test(pathRel)) {
    return "playwright";
  }
  return "UNKNOWN";
}

/**
 * @param {string} pathRel
 */
export function inferDbRequired(pathRel) {
  if (pathRel.includes("vitest.database.config")) return "YES";
  if (
    pathRel.startsWith("tests/database/") ||
    pathRel.includes(".integration.test.") ||
    /\/(cart|checkout|order|payment|serviceability|catalog|assortment|customer-address|customer-profile|menu-import|pricing-tax|promotions?|refund|delivery|workforce-auth|customer-auth|customer-commerce|access-control\/cli)(-|\/)/.test(
      pathRel,
    ) ||
    /-(concurrency|security|auth-integration|crash|idempotency|promotions|provider|reconciliation|razorpay|webhook|application|manual)\//.test(
      pathRel,
    )
  ) {
    // Many of these suites use vitest.database.config; treat as YES when path strongly indicates DB.
    if (
      pathRel.startsWith("tests/database/") ||
      pathRel.includes(".integration.test.") ||
      /-(concurrency|security|auth-integration|crash|idempotency)\//.test(pathRel) ||
      pathRel.startsWith("tests/cart/") ||
      pathRel.startsWith("tests/checkout/") ||
      pathRel.startsWith("tests/order/") ||
      pathRel.startsWith("tests/payment") ||
      pathRel.startsWith("tests/serviceability") ||
      pathRel.startsWith("tests/catalog") ||
      pathRel.startsWith("tests/assortment") ||
      pathRel.startsWith("tests/customer-address") ||
      pathRel.startsWith("tests/customer-profile") ||
      pathRel.startsWith("tests/customer-auth/") ||
      pathRel.startsWith("tests/customer-commerce/") ||
      pathRel.startsWith("tests/workforce-auth/") ||
      pathRel.startsWith("tests/menu-import/") ||
      pathRel.startsWith("tests/pricing-tax/") ||
      pathRel.startsWith("tests/pricing-bootstrap/") ||
      pathRel.startsWith("tests/refund-") ||
      pathRel.startsWith("tests/delivery-") ||
      pathRel.startsWith("tests/access-control/cli/")
    ) {
      return "YES";
    }
  }
  if (pathRel.startsWith("src/") && /\.test\.(ts|tsx)$/.test(pathRel)) return "NO";
  if (
    pathRel.startsWith("tests/access-control/") ||
    pathRel.startsWith("tests/menu-parity/") ||
    pathRel.startsWith("tests/pricing-parity/") ||
    pathRel.startsWith("tests/promotions/") ||
    pathRel.startsWith("tests/promotion-") ||
    pathRel.startsWith("tests/ordering-catalog/") ||
    pathRel.startsWith("tests/refund-architecture/") ||
    pathRel.startsWith("tests/operations/") ||
    pathRel.startsWith("tests/workforce-hub/") ||
    pathRel.startsWith("tests/enterprise/") ||
    pathRel.startsWith("tests/imp-036") ||
    pathRel.startsWith("tests/administration/") && !pathRel.includes("integration")
  ) {
    return "NO";
  }
  if (pathRel.startsWith("scripts/") && pathRel.endsWith(".test.mjs")) return "NO";
  if (isPlaywrightSpecPath(pathRel)) return "UNKNOWN";
  return "UNKNOWN";
}

/**
 * @param {string} pathRel
 */
export function inferBrowserRequired(pathRel) {
  if (isPlaywrightSpecPath(pathRel)) return "YES";
  if (pathRel.endsWith(".test.tsx")) return "NO"; // jsdom component tests, not real browser
  return "NO";
}

/**
 * @param {string} pathRel
 * @returns {string[]}
 */
export function inferTest1Layers(pathRel) {
  /** @type {Set<string>} */
  const layers = new Set();
  if (pathRel.endsWith(".test.tsx") && (pathRel.startsWith("src/components/") || pathRel.includes("/Client.test.") || pathRel.includes("Client.test"))) {
    layers.add("2-component");
  }
  if (pathRel.endsWith(".test.tsx") && pathRel.startsWith("tests/")) {
    layers.add("2-component");
  }
  if (pathRel.includes("/concurrency/") || pathRel.includes(".concurrency.")) {
    layers.add("8-concurrency");
  }
  if (
    pathRel.includes("idempot") ||
    pathRel.includes("recovery") ||
    pathRel.includes(".crash.") ||
    pathRel.includes("reconciliation") ||
    pathRel.includes("webhook")
  ) {
    layers.add("9-recovery-idempotency");
  }
  if (
    pathRel.includes("security") ||
    pathRel.includes("access-control") ||
    pathRel.includes("auth-integration") ||
    pathRel.includes("realm-isolation")
  ) {
    layers.add("7-authorization-security");
  }
  if (pathRel.includes(".integration.test.") || pathRel.startsWith("tests/database/")) {
    layers.add("5-database-integration");
    layers.add("4-integration");
  }
  if (pathRel.includes("http.integration") || pathRel.includes("http.test") || pathRel.includes("admin-http") || pathRel.includes("admin-transport")) {
    layers.add("6-http-api-contract");
  }
  if (isPlaywrightSpecPath(pathRel)) {
    layers.add("11-e2e-browser-ui");
  }
  if (
    pathRel.includes("/domain.") ||
    pathRel.startsWith("src/server/") ||
    pathRel.startsWith("src/shared/") ||
    pathRel.includes("domain.service") ||
    pathRel.includes(".domain.")
  ) {
    layers.add("3-domain-use-case");
  }
  if (
    pathRel.startsWith("src/") &&
    /\.test\.(ts|tsx)$/.test(pathRel) &&
    !pathRel.endsWith(".test.tsx")
  ) {
    layers.add("1-unit");
  }
  if (
    pathRel.startsWith("tests/") &&
    /\.test\.ts$/.test(pathRel) &&
    !pathRel.includes("integration") &&
    !pathRel.includes("concurrency") &&
    !pathRel.includes("security") &&
    !isPlaywrightSpecPath(pathRel)
  ) {
    if (![...layers].some((l) => l.startsWith("5-") || l.startsWith("8-") || l.startsWith("7-"))) {
      layers.add("1-unit");
    }
  }
  if (pathRel.startsWith("scripts/") && pathRel.endsWith(".test.mjs")) {
    layers.add("1-unit");
  }
  if (layers.size === 0) layers.add("UNKNOWN");
  return [...layers].sort();
}

/**
 * @param {string} pathRel
 */
export function inferDomain(pathRel) {
  const parts = pathRel.split("/");
  if (pathRel.startsWith("tests/e2e/")) return "e2e";
  if (pathRel.startsWith("tests/database/")) {
    const base = path.basename(pathRel).replace(/\.integration\.test\.(ts|tsx)$/, "");
    return `database/${base}`;
  }
  if (pathRel.startsWith("tests/")) return parts[1] || "tests";
  if (pathRel.startsWith("src/")) {
    if (parts[1] === "server" || parts[1] === "shared" || parts[1] === "platform" || parts[1] === "lib" || parts[1] === "components") {
      return parts.slice(1, 3).join("/");
    }
    return parts.slice(1, 2).join("/") || "src";
  }
  if (pathRel.startsWith("scripts/")) return "scripts";
  return "other";
}

/**
 * @param {string} root
 * @returns {Record<string, string>}
 */
export function readPackageScripts(root = DEFAULT_ROOT) {
  const pkgPath = path.join(root, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  return pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {};
}

/**
 * @param {Record<string, string>} scripts
 */
export function selectPackageVerificationCommands(scripts) {
  /** @type {{ test: string[]; audit: string[]; e2e: string[]; check: string[]; coverage: string[]; inventory: string[]; other: string[] }} */
  const groups = {
    test: [],
    audit: [],
    e2e: [],
    check: [],
    coverage: [],
    inventory: [],
    other: [],
  };
  for (const name of Object.keys(scripts).sort()) {
    if (name === "test" || name.startsWith("test:")) {
      if (name.includes("e2e")) groups.e2e.push(name);
      else if (name.includes("coverage")) groups.coverage.push(name);
      else groups.test.push(name);
      continue;
    }
    if (name.startsWith("testing:inventory")) {
      groups.inventory.push(name);
      continue;
    }
    if (name.startsWith("audit:")) {
      groups.audit.push(name);
      continue;
    }
    if (
      name === "check" ||
      name.endsWith(":check") ||
      name.includes("schema:check") ||
      name === "typecheck" ||
      name === "lint" ||
      name === "env:hygiene" ||
      name === "project:consistency" ||
      name === "governance:fingerprint"
    ) {
      groups.check.push(name);
      continue;
    }
  }
  return groups;
}

/**
 * @param {string} root
 * @param {string[]} tracked
 */
export function inventoryWorkflowValidationSteps(root, tracked) {
  const workflowPaths = tracked.filter(
    (p) => p.startsWith(".github/workflows/") && p.endsWith(".yml"),
  );
  /** @type {Array<{ path: string; name: string | null; validationSteps: Array<{ name: string; run: string }> }>} */
  const workflows = [];
  for (const rel of workflowPaths) {
    const abs = path.join(root, rel);
    if (!existsSync(abs) || !statSync(abs).isFile()) continue;
    const text = readFileSync(abs, "utf8");
    const nameMatch = text.match(/^name:\s*(.+)$/m);
    const steps = [];
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const stepName = lines[i].match(/^\s+-\s+name:\s*(.+)\s*$/);
      if (!stepName) continue;
      // Look ahead for run:
      let run = null;
      for (let j = i + 1; j < Math.min(i + 12, lines.length); j++) {
        if (/^\s+-\s+name:\s*/.test(lines[j])) break;
        const runMatch = lines[j].match(/^\s+run:\s*(.+)\s*$/);
        if (runMatch) {
          run = runMatch[1].replace(/^>\-\s*/, "").trim();
          // Collect folded run blocks starting with >-
          if (lines[j].includes(">-") || run === "" || run === ">-") {
            const parts = [];
            for (let k = j + 1; k < lines.length; k++) {
              if (/^\s{0,8}-\s+name:/.test(lines[k]) || /^[a-zA-Z]/.test(lines[k])) break;
              if (/^\s{10,}\S/.test(lines[k]) || /^\s{8}\S/.test(lines[k])) {
                parts.push(lines[k].trim());
              } else if (parts.length && /^\s*$/.test(lines[k])) {
                break;
              } else if (parts.length === 0 && /^\s*$/.test(lines[k])) {
                continue;
              } else if (parts.length) {
                break;
              }
            }
            run = parts.join(" ").trim() || run;
          }
          break;
        }
        const usesMatch = lines[j].match(/^\s+uses:\s*(.+)\s*$/);
        if (usesMatch && !run) {
          // not a shell validation step
          break;
        }
      }
      if (run && run !== ">-") {
        steps.push({ name: stepName[1].trim(), run });
      }
    }
    workflows.push({
      path: rel,
      name: nameMatch ? nameMatch[1].trim() : null,
      validationSteps: steps,
    });
  }
  return workflows;
}

/**
 * @param {string[]} tracked
 * @param {Record<string, string>} scripts
 * @param {ReturnType<typeof selectPackageVerificationCommands>} commands
 */
function matchPackageCommandsForPath(pathRel, scripts, commands) {
  /** @type {string[]} */
  const matched = [];
  const allNames = [
    ...commands.test,
    ...commands.e2e,
    ...commands.audit,
    ...commands.coverage,
    ...commands.check,
  ];
  for (const name of allNames) {
    const body = scripts[name] || "";
    if (!body) continue;
    // Heuristic: command mentions the path or its parent suite directory.
    if (body.includes(pathRel)) {
      matched.push(name);
      continue;
    }
    if (pathRel.startsWith("tests/")) {
      const suite = pathRel.split("/")[1];
      if (suite && (body.includes(`tests/${suite}`) || body.includes(`test:${suite}`))) {
        matched.push(name);
        continue;
      }
    }
    if (pathRel.startsWith("scripts/") && pathRel.endsWith(".test.mjs") && name === "test:scripts") {
      matched.push(name);
      continue;
    }
    if (pathRel.startsWith("src/") && (name === "test" || name === "test:coverage")) {
      // Default vitest include covers most src tests; record only the umbrella commands once callers ask.
      continue;
    }
  }
  if (pathRel.startsWith("src/") && /\.test\.(ts|tsx)$/.test(pathRel)) {
    matched.push("test", "test:coverage");
  }
  if (isPlaywrightSpecPath(pathRel) && !matched.includes("test:e2e")) {
    matched.push("test:e2e");
  }
  return normalizePaths(matched);
}

/**
 * Derive CI inclusion from workflow run strings.
 * @param {ReturnType<typeof inventoryWorkflowValidationSteps>} workflows
 * @param {string} pathRel
 * @param {string[]} packageCommands
 */
function inferCiInclusion(workflows, pathRel, packageCommands) {
  const ciRuns = workflows
    .filter((w) => w.path === ".github/workflows/ci.yml")
    .flatMap((w) => w.validationSteps.map((s) => s.run));
  const haystack = ciRuns.join("\n");
  const hasUnitSuite = ciRuns.some((run) => run.trim() === "npm run test");
  const hasScriptSuite = ciRuns.some((run) => run.trim() === "npm run test:scripts");

  if (haystack.includes(pathRel)) return "YES";
  for (const cmd of packageCommands) {
    if (cmd === "test" || cmd === "test:coverage" || cmd === "test:scripts") continue;
    if (haystack.includes(`npm run ${cmd}`) || haystack.includes(cmd)) return "YES";
  }
  // The Session 3B2 umbrella script job covers every scripts/*.test.mjs file.
  if (pathRel.startsWith("scripts/") && pathRel.endsWith(".test.mjs")) {
    if (hasScriptSuite || haystack.includes(pathRel)) return "YES";
    return "NO";
  }
  // The default Vitest unit/component suite covers src/**/*.test.{ts,tsx}.
  if (pathRel.startsWith("src/") && /\.test\.(ts|tsx)$/.test(pathRel)) {
    if (hasUnitSuite || haystack.includes(pathRel)) return "YES";
    return "NO";
  }
  if (isPlaywrightSpecPath(pathRel)) return "NO";
  return "NO";
}

/**
 * @param {string} [root]
 */
export function buildTestingInventory(root = DEFAULT_ROOT) {
  const tracked = listTrackedPaths(root).filter((p) => !startsWithAny(p, GENERATED_PREFIXES));
  const scripts = readPackageScripts(root);
  const packageCommands = selectPackageVerificationCommands(scripts);
  const workflows = inventoryWorkflowValidationSteps(root, tracked);

  const executableTests = tracked.filter(isExecutableTestPath);
  const sourceTestFiles = executableTests.filter((p) => p.startsWith("src/"));
  const testsTreeExecutable = executableTests.filter((p) => p.startsWith("tests/"));
  const scriptTestFiles = executableTests.filter(
    (p) => p.startsWith("scripts/") && p.endsWith(".test.mjs"),
  );
  const playwrightSpecs = executableTests.filter(isPlaywrightSpecPath);

  const vitestConfigs = tracked.filter((p) => VITEST_CONFIG_BASENAMES.includes(p));
  const playwrightConfigs = tracked.filter((p) => PLAYWRIGHT_CONFIG_BASENAMES.includes(p));

  const testSupportScripts = tracked.filter((p) => {
    if (isExcludedGeneratedOrArchive(p)) return false;
    if (isExecutableTestPath(p)) return false;
    return TEST_SUPPORT_SCRIPT_PREFIXES.some(
      (prefix) => p === prefix || p.startsWith(prefix.endsWith("/") ? prefix : `${prefix}`),
    );
  });

  const protectedEvidenceTracked = tracked.filter((p) =>
    startsWithAny(p, PROTECTED_EVIDENCE_PREFIXES),
  );
  const archiveTracked = tracked.filter((p) => startsWithAny(p, ARCHIVE_PREFIXES));

  const executableRecords = executableTests.map((pathRel) => {
    const packageCommandMatches = matchPackageCommandsForPath(pathRel, scripts, packageCommands);
    const layers = inferTest1Layers(pathRel);
    return {
      path: pathRel,
      runner: classifyRunner(pathRel),
      domain: inferDomain(pathRel),
      testType:
        isPlaywrightSpecPath(pathRel)
          ? "e2e-spec"
          : pathRel.includes(".integration.")
            ? "integration"
            : pathRel.endsWith(".test.tsx")
              ? "component-or-tsx"
              : pathRel.endsWith(".test.mjs")
                ? "script-unit"
                : "unit-or-domain",
      dbRequired: inferDbRequired(pathRel),
      browserRequired: inferBrowserRequired(pathRel),
      externalProviderSubstitute: pathRel.includes("razorpay") || pathRel.includes("payment-provider")
        ? "YES_OR_LIKELY"
        : "UNKNOWN",
      packageCommands: packageCommandMatches,
      ciInclusion: inferCiInclusion(workflows, pathRel, packageCommandMatches),
      test1Layers: layers,
      classificationConfidence:
        layers.includes("UNKNOWN") || inferDbRequired(pathRel) === "UNKNOWN"
          ? "LOW"
          : "HEURISTIC",
    };
  });

  const inventory = {
    schemaVersion: SCHEMA_VERSION,
    generatedBy: "scripts/testing-inventory.mjs",
    purpose:
      "Structural inventory of verification surfaces. Not acceptance evidence. TEST presence != acceptance.",
    exclusions: {
      generatedReportPrefixes: [...GENERATED_PREFIXES],
      archivePrefixes: [...ARCHIVE_PREFIXES],
      protectedEvidencePrefixes: [...PROTECTED_EVIDENCE_PREFIXES],
      note:
        "Protected evidence and generated reports are never classified as executable test source.",
    },
    counts: {
      trackedPathsConsidered: tracked.length,
      executableTestFiles: executableTests.length,
      sourceTestFiles: sourceTestFiles.length,
      testsTreeExecutableFiles: testsTreeExecutable.length,
      scriptTestFiles: scriptTestFiles.length,
      playwrightSpecs: playwrightSpecs.length,
      vitestConfigs: vitestConfigs.length,
      playwrightConfigs: playwrightConfigs.length,
      testSupportScripts: testSupportScripts.length,
      packageTestCommands: packageCommands.test.length,
      packageAuditCommands: packageCommands.audit.length,
      packageE2eCommands: packageCommands.e2e.length,
      packageCheckCommands: packageCommands.check.length,
      packageCoverageCommands: packageCommands.coverage.length,
      packageInventoryCommands: packageCommands.inventory.length,
      ciWorkflowFiles: workflows.length,
      ciValidationSteps: workflows.reduce((n, w) => n + w.validationSteps.length, 0),
      protectedEvidenceTrackedFiles: protectedEvidenceTracked.length,
      archiveTrackedFiles: archiveTracked.length,
    },
    sourceTestFiles,
    testsTreeExecutableFiles: testsTreeExecutable,
    scriptTestFiles,
    playwrightSpecs,
    vitestConfigs,
    playwrightConfigs,
    testSupportScripts,
    packageCommands,
    packageCommandBodies: Object.fromEntries(
      [
        ...packageCommands.test,
        ...packageCommands.audit,
        ...packageCommands.e2e,
        ...packageCommands.coverage,
        ...packageCommands.check,
        ...packageCommands.inventory,
      ]
        .sort()
        .map((name) => [name, scripts[name]]),
    ),
    ciWorkflows: workflows,
    protectedEvidenceTrackedFiles: protectedEvidenceTracked,
    archiveTrackedSample: archiveTracked.slice(0, 20),
    executableRecords,
  };

  return inventory;
}

/**
 * @param {unknown} inventory
 */
export function serializeInventory(inventory) {
  return `${JSON.stringify(inventory, null, 2)}\n`;
}

/**
 * @param {string} [root]
 * @param {unknown} [inventory]
 */
export function writeInventorySnapshot(root = DEFAULT_ROOT, inventory = buildTestingInventory(root)) {
  const rel = SNAPSHOT_REL;
  const abs = path.join(root, rel);
  writeFileSync(abs, serializeInventory(inventory), "utf8");
  return rel;
}

/**
 * @param {string} [root]
 */
export function checkInventorySnapshot(root = DEFAULT_ROOT) {
  const abs = path.join(root, SNAPSHOT_REL);
  if (!existsSync(abs)) {
    return {
      ok: false,
      reason: `missing snapshot ${SNAPSHOT_REL}`,
    };
  }
  const current = serializeInventory(buildTestingInventory(root));
  const onDisk = readFileSync(abs, "utf8");
  if (current !== onDisk) {
    return {
      ok: false,
      reason: `snapshot drift: ${SNAPSHOT_REL} differs from deterministic inventory`,
    };
  }
  return { ok: true };
}

function printSummary(inventory) {
  const c = inventory.counts;
  console.log(`testing-inventory schema=${inventory.schemaVersion}`);
  console.log(`executableTestFiles=${c.executableTestFiles}`);
  console.log(`sourceTestFiles=${c.sourceTestFiles}`);
  console.log(`testsTreeExecutableFiles=${c.testsTreeExecutableFiles}`);
  console.log(`scriptTestFiles=${c.scriptTestFiles}`);
  console.log(`playwrightSpecs=${c.playwrightSpecs}`);
  console.log(`vitestConfigs=${c.vitestConfigs}`);
  console.log(`playwrightConfigs=${c.playwrightConfigs}`);
  console.log(`packageTestCommands=${c.packageTestCommands}`);
  console.log(`packageAuditCommands=${c.packageAuditCommands}`);
  console.log(`packageE2eCommands=${c.packageE2eCommands}`);
  console.log(`ciValidationSteps=${c.ciValidationSteps}`);
}

function main(argv = process.argv.slice(2)) {
  const write = argv.includes("--write");
  const check = argv.includes("--check");
  if (write && check) {
    console.error("Use only one of --write or --check");
    process.exit(2);
  }
  if (check) {
    const result = checkInventorySnapshot();
    if (!result.ok) {
      console.error(result.reason);
      process.exit(1);
    }
    console.log(`OK ${SNAPSHOT_REL}`);
    return;
  }
  const inventory = buildTestingInventory();
  if (write) {
    const rel = writeInventorySnapshot(DEFAULT_ROOT, inventory);
    console.log(`wrote ${rel}`);
  }
  printSummary(inventory);
}

const isDirect =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirect) {
  main();
}
