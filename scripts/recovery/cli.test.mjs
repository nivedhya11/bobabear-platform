import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { CLI_EXIT, OPERATION_STATUS, RECOVERY_LAYER } from "./constants.mjs";
import { persistEvidence } from "./store.mjs";
import { generateRunId } from "./run-id.mjs";

const cli = path.resolve("scripts/recovery/cli.mjs");

function run(args, extra = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    env: extra.env ?? process.env,
  });
}

test("status human output is NOT_READY with no evidence and non-zero exit", () => {
  const result = run(["status"]);
  assert.equal(result.status, CLI_EXIT.FAILURE);
  assert.match(result.stdout, /NOT_READY/);
  assert.doesNotMatch(result.stdout, /READY_FOR_PRODUCTION|SUCCEEDED/);
});

test("status JSON output is machine-readable and secret-free", () => {
  const secret = "super-secret-db-pass";
  const result = run(["status", "--json"], {
    env: { ...process.env, DATABASE_URL: `postgresql://app:${secret}@postgres:5432/boba` },
  });
  assert.equal(result.status, CLI_EXIT.FAILURE);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.overall, "NOT_READY");
  assert.equal(result.stdout.includes(secret), false);
});

test("evidence validate fails when evidence directory is missing", () => {
  const result = run(["evidence", "validate"]);
  assert.equal(result.status, CLI_EXIT.FAILURE);
  assert.match(`${result.stdout}\n${result.stderr}`, /Evidence directory is required/i);
});

test("evidence validate fails on empty directory", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "boba-recovery-cli-"));
  try {
    const result = run(["evidence", "validate", "--evidence-dir", root]);
    assert.equal(result.status, CLI_EXIT.FAILURE);
    assert.match(result.stdout, /NO valid records|not implemented|NOT_READY|No valid/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("evidence validate accepts persisted records and JSON output", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "boba-recovery-cli-"));
  try {
    const runId = generateRunId();
    persistEvidence(root, {
      runId,
      operationType: "status",
      recoveryLayer: RECOVERY_LAYER.LAYER_1,
      status: OPERATION_STATUS.FAILED,
      endedAt: new Date().toISOString(),
      failureBlockReason: "foundation tranche has no pgBackRest execution",
    });
    const result = run(["evidence", "validate", "--json", "--evidence-dir", root, "--run-id", runId]);
    assert.equal(result.status, CLI_EXIT.OK);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.valid, true);
    assert.equal(payload.runId, runId);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("target check denies source==target with blocked exit code", () => {
  const result = run([
    "target",
    "check",
    "--source",
    "prod-db",
    "--target",
    "prod-db",
    "--source-class",
    "production",
    "--target-class",
    "recovery",
  ]);
  assert.equal(result.status, CLI_EXIT.BLOCKED);
  assert.match(result.stdout, /BLOCKED|equals source/i);
});

test("target check allows isolated recovery target", () => {
  const result = run([
    "target",
    "check",
    "--json",
    "--source",
    "prod-db",
    "--target",
    "recovery-db",
    "--source-class",
    "production",
    "--target-class",
    "recovery",
    "--target-pgdata",
    "/tmp/boba-recovery/pgdata",
  ]);
  assert.equal(result.status, CLI_EXIT.OK);
  assert.equal(JSON.parse(result.stdout).allowed, true);
});

test("unsupported backup command is unavailable rather than success", () => {
  const result = run(["backup"]);
  assert.equal(result.status, CLI_EXIT.UNAVAILABLE);
  assert.match(result.stdout, /UNAVAILABLE|not implemented/);
  assert.doesNotMatch(result.stdout, /\bSUCCEEDED\b/);
});

test("force-production is rejected", () => {
  const result = run([
    "target",
    "check",
    "--source",
    "prod-db",
    "--target",
    "recovery-db",
    "--source-class",
    "production",
    "--target-class",
    "recovery",
    "--force-production",
  ]);
  assert.equal(result.status, CLI_EXIT.BLOCKED);
  assert.match(result.stdout, /force-production/i);
});
