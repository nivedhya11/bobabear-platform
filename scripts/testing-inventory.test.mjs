import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  buildTestingInventory,
  checkInventorySnapshot,
  inventoryWorkflowValidationSteps,
  isExecutableTestPath,
  isExcludedGeneratedOrArchive,
  listTrackedPaths,
  normalizePaths,
  serializeInventory,
  writeInventorySnapshot,
} from "./testing-inventory.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("normalizePaths is deterministic, POSIX, and unique", () => {
  const input = ["b/a.ts", "./a/z.ts", "a\\z.ts", "b/a.ts", "a/z.ts"];
  const once = normalizePaths(input);
  const twice = normalizePaths([...input].reverse());
  assert.deepEqual(once, ["a/z.ts", "b/a.ts"]);
  assert.deepEqual(once, twice);
  assert.equal(new Set(once).size, once.length);
});

test("generated reports and archive paths are excluded from executable classification", () => {
  assert.equal(isExcludedGeneratedOrArchive("coverage/lcov.info"), true);
  assert.equal(isExcludedGeneratedOrArchive("playwright-report/index.html"), true);
  assert.equal(isExcludedGeneratedOrArchive("archive/design-history/README.md"), true);
  assert.equal(isExecutableTestPath("coverage/foo.test.ts"), false);
  assert.equal(isExecutableTestPath("archive/design-history/x.test.ts"), false);
});

test("protected customer-ordering evidence is not executable source", () => {
  const evidence =
    "test-results-customer-ordering/customer-ordering-Razorpay-a5096-ss-does-not-create-an-Order-desktop-chromium/error-context.md";
  assert.equal(isExcludedGeneratedOrArchive(evidence), true);
  assert.equal(isExecutableTestPath(evidence), false);
  assert.equal(
    isExecutableTestPath("test-results-location-selector-layout/.last-run.json"),
    false,
  );
});

test("repository inventory discovers expected categories", () => {
  const inventory = buildTestingInventory(repoRoot);
  assert.ok(inventory.sourceTestFiles.length > 0, "src tests");
  assert.ok(inventory.testsTreeExecutableFiles.length > 0, "tests/ tree");
  assert.ok(inventory.scriptTestFiles.length > 0, "script tests");
  assert.ok(inventory.playwrightSpecs.includes("tests/e2e/customer-ordering.spec.ts"));
  assert.ok(inventory.vitestConfigs.includes("vitest.config.mts"));
  assert.ok(inventory.vitestConfigs.includes("vitest.database.config.mts"));
  assert.ok(inventory.playwrightConfigs.includes("playwright.config.ts"));
  assert.ok(inventory.playwrightConfigs.includes("playwright.customer-ordering.config.ts"));
  assert.ok(inventory.packageCommands.test.includes("test"));
  assert.ok(inventory.packageCommands.test.includes("test:scripts"));
  assert.ok(inventory.packageCommands.coverage.includes("test:coverage"));
  assert.ok(inventory.packageCommands.audit.includes("audit:payment"));
  assert.ok(inventory.packageCommands.e2e.includes("test:e2e:customer-ordering"));
  assert.ok(inventory.packageCommands.inventory.includes("testing:inventory"));
  assert.ok(inventory.packageCommands.inventory.includes("testing:inventory:check"));
  assert.equal(
    inventory.executableRecords.length,
    inventory.counts.executableTestFiles,
  );
  const paths = inventory.executableRecords.map((r) => r.path);
  assert.deepEqual(paths, normalizePaths(paths));
  assert.equal(new Set(paths).size, paths.length);
});

test("current CI workflow is inventoried with validation steps", () => {
  const inventory = buildTestingInventory(repoRoot);
  const ci = inventory.ciWorkflows.find((w) => w.path === ".github/workflows/ci.yml");
  assert.ok(ci, "ci.yml present");
  assert.ok(ci.validationSteps.length >= 8, "validation steps present");
  const runs = ci.validationSteps.map((s) => s.run).join("\n");
  assert.match(runs, /npm run typecheck/);
  assert.match(runs, /npm run lint/);
  assert.match(runs, /npm run test:catalog/);
  assert.match(runs, /npm run project:consistency/);
  assert.match(runs, /npm run governance:fingerprint/);
  assert.match(runs, /npm run build/);
});

test("package test commands are inventoried", () => {
  const inventory = buildTestingInventory(repoRoot);
  assert.ok(inventory.counts.packageTestCommands > 50);
  assert.ok(inventory.packageCommandBodies.test.includes("run-vitest"));
  assert.ok(inventory.packageCommandBodies["test:scripts"].includes("node --test"));
});

test("deterministic inventory serialization is stable across calls", () => {
  const a = serializeInventory(buildTestingInventory(repoRoot));
  const b = serializeInventory(buildTestingInventory(repoRoot));
  assert.equal(a, b);
  assert.ok(a.endsWith("\n"));
});

test("write and check snapshot round-trip in an isolated temp repo layout", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "boba-testing-inventory-"));
  try {
    execFileSync("git", ["init"], { cwd: dir });
    execFileSync("git", ["config", "user.email", "inventory-test@example.com"], { cwd: dir });
    execFileSync("git", ["config", "user.name", "inventory-test"], { cwd: dir });

    mkdirSync(path.join(dir, "src"), { recursive: true });
    mkdirSync(path.join(dir, "tests/e2e"), { recursive: true });
    mkdirSync(path.join(dir, "scripts"), { recursive: true });
    mkdirSync(path.join(dir, ".github/workflows"), { recursive: true });
    mkdirSync(path.join(dir, "docs/platform/testing"), { recursive: true });
    mkdirSync(path.join(dir, "coverage"), { recursive: true });
    mkdirSync(path.join(dir, "archive/design-history"), { recursive: true });
    mkdirSync(path.join(dir, "test-results-customer-ordering/run"), { recursive: true });

    writeFileSync(path.join(dir, "package.json"), JSON.stringify({
      scripts: {
        test: "node scripts/run-vitest.mjs run",
        "test:coverage": "node scripts/run-vitest.mjs coverage",
        "test:scripts": "node --test",
        "test:e2e": "playwright test",
        "audit:payment": "node scripts/audit-payment.mjs",
        typecheck: "tsc --noEmit",
        lint: "eslint",
      },
    }, null, 2));
    writeFileSync(path.join(dir, "vitest.config.mts"), "export default {}\n");
    writeFileSync(path.join(dir, "vitest.database.config.mts"), "export default {}\n");
    writeFileSync(path.join(dir, "playwright.config.ts"), "export default {}\n");
    writeFileSync(path.join(dir, "src/example.test.ts"), "test('x', () => {})\n");
    writeFileSync(path.join(dir, "tests/e2e/sample.spec.ts"), "test('e2e', () => {})\n");
    writeFileSync(path.join(dir, "scripts/tool.test.mjs"), "import { test } from 'node:test'\n");
    writeFileSync(
      path.join(dir, ".github/workflows/ci.yml"),
      "name: CI\non: [push]\njobs:\n  validate:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Typecheck\n        run: npm run typecheck\n      - name: Lint\n        run: npm run lint\n",
    );
    writeFileSync(path.join(dir, "coverage/lcov.info"), "TN:\n");
    writeFileSync(path.join(dir, "archive/design-history/README.md"), "archive\n");
    writeFileSync(
      path.join(dir, "test-results-customer-ordering/run/error-context.md"),
      "evidence\n",
    );

    execFileSync("git", ["add", "."], { cwd: dir });
    execFileSync("git", ["commit", "-m", "seed"], { cwd: dir });

    const inventory = buildTestingInventory(dir);
    assert.ok(inventory.sourceTestFiles.includes("src/example.test.ts"));
    assert.ok(inventory.playwrightSpecs.includes("tests/e2e/sample.spec.ts"));
    assert.ok(inventory.scriptTestFiles.includes("scripts/tool.test.mjs"));
    assert.equal(inventory.executableRecords.some((r) => r.path.startsWith("coverage/")), false);
    assert.equal(
      inventory.executableRecords.some((r) => r.path.startsWith("archive/")),
      false,
    );
    assert.equal(
      inventory.executableRecords.some((r) =>
        r.path.startsWith("test-results-customer-ordering/"),
      ),
      false,
    );
    assert.ok(inventory.ciWorkflows.some((w) => w.path === ".github/workflows/ci.yml"));
    assert.ok(inventory.packageCommands.test.includes("test"));

    writeInventorySnapshot(dir, inventory);
    const ok = checkInventorySnapshot(dir);
    assert.equal(ok.ok, true);

    writeFileSync(path.join(dir, "src/extra.test.ts"), "test('y', () => {})\n");
    execFileSync("git", ["add", "src/extra.test.ts"], { cwd: dir });
    execFileSync("git", ["commit", "-m", "extra"], { cwd: dir });
    const drifted = checkInventorySnapshot(dir);
    assert.equal(drifted.ok, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("listTrackedPaths prefers git listing in this repository", () => {
  const tracked = listTrackedPaths(repoRoot);
  assert.ok(tracked.includes("package.json"));
  assert.ok(tracked.includes(".github/workflows/ci.yml"));
  assert.ok(!tracked.includes("node_modules/vitest/package.json"));
});

test("workflow run block scalars inventory normalized command bodies", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "boba-testing-inventory-run-"));
  try {
    execFileSync("git", ["init"], { cwd: dir });
    execFileSync("git", ["config", "user.email", "inventory-test@example.com"], { cwd: dir });
    execFileSync("git", ["config", "user.name", "inventory-test"], { cwd: dir });
    mkdirSync(path.join(dir, ".github/workflows"), { recursive: true });
    writeFileSync(
      path.join(dir, ".github/workflows/ci.yml"),
      [
        "name: CI",
        "on: [push]",
        "jobs:",
        "  validate:",
        "    runs-on: ubuntu-latest",
        "    steps:",
        "      - name: Literal pipe",
        "        run: |",
        "          echo one",
        "          echo two",
        "      - name: Literal strip",
        "        run: |-",
        "          echo one",
        "          echo two",
        "      - name: Literal keep",
        "        run: |+",
        "          echo one",
        "          echo two",
        "      - name: Folded strip",
        "        run: >-",
        "          npm run something",
        "          --flag value",
        "      - name: Folded plain",
        "        run: >",
        "          echo folded",
        "          echo plain",
        "      - name: Folded keep",
        "        run: >+",
        "          echo folded",
        "          echo keep",
        "      - name: First",
        "        run: |",
        "          echo first",
        "      - name: Second",
        "        run: echo second",
        "      - name: Inline",
        "        run: npm run test",
        "      - name: Checkout",
        "        uses: actions/checkout@v4",
        "",
      ].join("\n"),
    );
    execFileSync("git", ["add", "."], { cwd: dir });
    execFileSync("git", ["commit", "-m", "seed"], { cwd: dir });

    const tracked = listTrackedPaths(dir);
    const [workflow] = inventoryWorkflowValidationSteps(dir, tracked);
    assert.ok(workflow, "workflow inventoried");
    const byName = Object.fromEntries(workflow.validationSteps.map((s) => [s.name, s.run]));

    assert.equal(byName["Literal pipe"], "echo one\necho two");
    assert.notEqual(byName["Literal pipe"], "|");
    assert.match(byName["Literal pipe"], /echo one/);
    assert.match(byName["Literal pipe"], /echo two/);

    assert.equal(byName["Literal strip"], "echo one\necho two");
    assert.notEqual(byName["Literal strip"], "|-");

    assert.equal(byName["Literal keep"], "echo one\necho two");
    assert.notEqual(byName["Literal keep"], "|+");

    assert.match(byName["Folded strip"], /npm run something/);
    assert.match(byName["Folded strip"], /--flag value/);
    assert.notEqual(byName["Folded strip"], ">-");

    assert.match(byName["Folded plain"], /echo folded/);
    assert.match(byName["Folded plain"], /echo plain/);
    assert.notEqual(byName["Folded plain"], ">");

    assert.match(byName["Folded keep"], /echo folded/);
    assert.match(byName["Folded keep"], /echo keep/);
    assert.notEqual(byName["Folded keep"], ">+");

    assert.equal(byName.First, "echo first");
    assert.equal(byName.First.includes("Second"), false);
    assert.equal(byName.First.includes("echo second"), false);
    assert.equal(byName.Second, "echo second");

    assert.equal(byName.Inline, "npm run test");

    assert.equal(byName.Checkout, undefined);
    assert.equal(
      workflow.validationSteps.some((s) => s.name === "Checkout"),
      false,
    );
    for (const step of workflow.validationSteps) {
      assert.notEqual(step.run, "|");
      assert.notEqual(step.run, "|-");
      assert.notEqual(step.run, "|+");
      assert.notEqual(step.run, ">");
      assert.notEqual(step.run, ">-");
      assert.notEqual(step.run, ">+");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Session 3B2 CI umbrellas set ciInclusion without path references or coverage", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "boba-testing-inventory-3b2-"));
  try {
    execFileSync("git", ["init"], { cwd: dir });
    execFileSync("git", ["config", "user.email", "inventory-test@example.com"], { cwd: dir });
    execFileSync("git", ["config", "user.name", "inventory-test"], { cwd: dir });

    mkdirSync(path.join(dir, "src"), { recursive: true });
    mkdirSync(path.join(dir, "scripts"), { recursive: true });
    mkdirSync(path.join(dir, ".github/workflows"), { recursive: true });

    writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          scripts: {
            test: "node scripts/run-vitest.mjs run",
            "test:coverage": "node scripts/run-vitest.mjs coverage",
            "test:scripts": "node --test",
            typecheck: "tsc --noEmit",
          },
        },
        null,
        2,
      ),
    );
    writeFileSync(path.join(dir, "src/example.test.ts"), "test('x', () => {})\n");
    writeFileSync(path.join(dir, "scripts/tool.test.mjs"), "import { test } from 'node:test'\n");
    writeFileSync(
      path.join(dir, ".github/workflows/ci.yml"),
      [
        "name: CI",
        "on: [push]",
        "jobs:",
        "  validate:",
        "    runs-on: ubuntu-latest",
        "    steps:",
        "      - name: Typecheck",
        "        run: npm run typecheck",
        "      - name: Unit tests",
        "        run: npm run test",
        "      - name: Script tests",
        "        run: npm run test:scripts",
        "",
      ].join("\n"),
    );
    writeFileSync(
      path.join(dir, ".github/workflows/nightly-verification.yml"),
      [
        "name: Nightly verification",
        "on:",
        "  schedule:",
        "    - cron: '0 2 * * *'",
        "jobs:",
        "  nightly:",
        "    runs-on: ubuntu-latest",
        "    steps:",
        "      - name: Placeholder",
        "        run: echo nightly",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "."], { cwd: dir });
    execFileSync("git", ["commit", "-m", "seed"], { cwd: dir });

    const inventory = buildTestingInventory(dir);
    const srcRecord = inventory.executableRecords.find((r) => r.path === "src/example.test.ts");
    const scriptRecord = inventory.executableRecords.find(
      (r) => r.path === "scripts/tool.test.mjs",
    );
    assert.ok(srcRecord, "src/example.test.ts inventoried");
    assert.ok(scriptRecord, "scripts/tool.test.mjs inventoried");
    assert.equal(srcRecord.ciInclusion, "YES");
    assert.equal(scriptRecord.ciInclusion, "YES");
    assert.equal(
      inventory.ciWorkflows.some((w) => w.path === ".github/workflows/ci.yml"),
      true,
    );
    assert.equal(
      inventory.ciWorkflows.some((w) => w.path === ".github/workflows/nightly-verification.yml"),
      true,
    );
    const ciRuns = inventory.ciWorkflows
      .find((w) => w.path === ".github/workflows/ci.yml")
      .validationSteps.map((s) => s.run)
      .join("\n");
    assert.equal(ciRuns.includes("src/example.test.ts"), false);
    assert.equal(ciRuns.includes("scripts/tool.test.mjs"), false);
    assert.equal(ciRuns.includes("npm run test:coverage"), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
