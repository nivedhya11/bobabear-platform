import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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

test("CLI default status remains NOT_READY even with generic SUCCEEDED evidence and no freshness flags", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "boba-recovery-cli-status-"));
  try {
    persistEvidence(root, {
      runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 7, 0, 0)), randomHex: "aaaaaaaaaaaaaaaa" }),
      operationType: "status",
      recoveryLayer: RECOVERY_LAYER.LAYER_1,
      status: OPERATION_STATUS.SUCCEEDED,
      endedAt: "2026-09-20T07:00:00.000Z",
    });
    persistEvidence(root, {
      runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 7, 1, 0)), randomHex: "bbbbbbbbbbbbbbbb" }),
      operationType: "status",
      recoveryLayer: RECOVERY_LAYER.LAYER_2,
      status: OPERATION_STATUS.SUCCEEDED,
      endedAt: "2026-09-20T07:01:00.000Z",
    });
    const result = run(["status", "--json", "--evidence-dir", root]);
    assert.equal(result.status, CLI_EXIT.FAILURE);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.overall, "NOT_READY");
    assert.equal(payload.layers.LAYER_1.readiness, "NOT_READY");
    assert.equal(payload.layers.LAYER_2.readiness, "NOT_READY");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
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

test("evidence validate fails closed when malformed evidence is present", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "boba-recovery-cli-"));
  try {
    const validId = generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 5, 0, 0)), randomHex: "1111111111111111" });
    persistEvidence(root, {
      runId: validId,
      operationType: "status",
      recoveryLayer: RECOVERY_LAYER.LAYER_1,
      status: OPERATION_STATUS.SUCCEEDED,
      endedAt: "2026-09-20T05:00:00.000Z",
    });
    const badId = generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 5, 1, 0)), randomHex: "2222222222222222" });
    mkdirSync(path.join(root, badId));
    writeFileSync(path.join(root, badId, "evidence.json"), "{truncated", "utf8");
    const validate = run(["evidence", "validate", "--json", "--evidence-dir", root]);
    assert.equal(validate.status, CLI_EXIT.FAILURE);
    const payload = JSON.parse(validate.stdout);
    assert.equal(payload.valid, false);
    assert.equal(payload.invalidCount >= 1, true);
    const status = run(["status", "--json", "--evidence-dir", root]);
    assert.equal(status.status, CLI_EXIT.FAILURE);
    const statusPayload = JSON.parse(status.stdout);
    assert.equal(statusPayload.overall, "NOT_READY");
    assert.equal(statusPayload.latestAttempt.runId, badId);
    assert.equal(statusPayload.latestAttempt.status, "UNVERIFIABLE");
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
