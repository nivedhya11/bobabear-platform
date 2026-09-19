import assert from "node:assert/strict";
import { test } from "node:test";
import { OPERATION_STATUS, READINESS_LEVEL, RECOVERY_LAYER } from "./constants.mjs";
import { createEvidence } from "./evidence.mjs";
import { evaluateReadiness } from "./readiness.mjs";
import { generateRunId } from "./run-id.mjs";

function layerEvidence(layer, status, extra = {}) {
  const ended = extra.endedAt ?? (status === OPERATION_STATUS.RUNNING ? null : new Date().toISOString());
  return createEvidence({
    runId: extra.runId ?? generateRunId(),
    operationType: "status",
    recoveryLayer: layer,
    status,
    endedAt: ended,
    incomplete: extra.incomplete,
    findings: extra.findings,
    failureBlockReason: extra.failureBlockReason,
    startedAt: extra.startedAt,
  });
}

test("empty evidence is NOT_READY", () => {
  const result = evaluateReadiness({ evidenceRecords: [] });
  assert.equal(result.overall, READINESS_LEVEL.NOT_READY);
  assert.equal(result.layers.LAYER_1.readiness, READINESS_LEVEL.NOT_READY);
  assert.equal(result.layers.LAYER_2.readiness, READINESS_LEVEL.NOT_READY);
});

test("configuration-only state is NOT_READY", () => {
  const result = evaluateReadiness({
    evidenceRecords: [],
    configurationPresent: true,
    credentialsPresent: true,
    bucketPresent: true,
    timerPresent: true,
  });
  assert.equal(result.overall, READINESS_LEVEL.NOT_READY);
  assert.equal(result.configurationOnly, true);
});

test("failed latest attempt is visible and does not yield READY", () => {
  const failed = layerEvidence(RECOVERY_LAYER.LAYER_1, OPERATION_STATUS.FAILED, {
    runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 2, 0, 0)), randomHex: "aaaaaaaaaaaaaaaa" }),
    failureBlockReason: "archive failed",
    findings: [{ code: "LAYER1_FAILED" }],
  });
  const result = evaluateReadiness({ evidenceRecords: [failed] });
  assert.equal(result.overall, READINESS_LEVEL.NOT_READY);
  assert.equal(result.latestAttempt.status, OPERATION_STATUS.FAILED);
  assert.equal(result.latestAttempt.failureBlockReason, "archive failed");
  assert.equal(result.findings[0].code, "LAYER1_FAILED");
});

test("one valid layer and the other required layer absent is not falsely READY", () => {
  const layer2 = layerEvidence(RECOVERY_LAYER.LAYER_2, OPERATION_STATUS.SUCCEEDED, {
    runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 3, 0, 0)), randomHex: "bbbbbbbbbbbbbbbb" }),
  });
  const result = evaluateReadiness({ evidenceRecords: [layer2] });
  assert.equal(result.layers.LAYER_2.readiness, READINESS_LEVEL.READY);
  assert.equal(result.layers.LAYER_1.readiness, READINESS_LEVEL.NOT_READY);
  assert.equal(result.overall, READINESS_LEVEL.NOT_READY);
});

test("interrupted evidence is not success", () => {
  const interrupted = layerEvidence(RECOVERY_LAYER.LAYER_1, OPERATION_STATUS.RUNNING, { incomplete: true });
  const result = evaluateReadiness({ evidenceRecords: [interrupted] });
  assert.equal(result.layers.LAYER_1.readiness, READINESS_LEVEL.NOT_READY);
  assert.match(result.layers.LAYER_1.reason, /incomplete/);
});

test("valid supplied evidence for both layers aggregates to READY", () => {
  const layer1 = layerEvidence(RECOVERY_LAYER.LAYER_1, OPERATION_STATUS.SUCCEEDED, {
    runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 4, 0, 0)), randomHex: "cccccccccccccccc" }),
  });
  const layer2 = layerEvidence(RECOVERY_LAYER.LAYER_2, OPERATION_STATUS.SUCCEEDED, {
    runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 4, 1, 0)), randomHex: "dddddddddddddddd" }),
  });
  const result = evaluateReadiness({ evidenceRecords: [layer1, layer2] });
  assert.equal(result.overall, READINESS_LEVEL.READY);
  assert.equal(result.layers.LAYER_1.readiness, READINESS_LEVEL.READY);
  assert.equal(result.layers.LAYER_2.readiness, READINESS_LEVEL.READY);
});

test("explicit overdue policy marks a layer NOT_READY without inventing a default", () => {
  const old = layerEvidence(RECOVERY_LAYER.LAYER_2, OPERATION_STATUS.SUCCEEDED, {
    runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 1, 0, 0, 0)), randomHex: "eeeeeeeeeeeeeeee" }),
    endedAt: "2026-09-01T00:00:00.000Z",
  });
  const layer1 = layerEvidence(RECOVERY_LAYER.LAYER_1, OPERATION_STATUS.SUCCEEDED, {
    runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 0, 0, 0)), randomHex: "ffffffffffffffff" }),
    endedAt: "2026-09-20T00:00:00.000Z",
  });
  const result = evaluateReadiness({
    evidenceRecords: [old, layer1],
    policy: {
      now: "2026-09-20T00:00:00.000Z",
      layer2MaxAgeMs: 24 * 60 * 60 * 1000,
    },
  });
  assert.equal(result.layers.LAYER_2.overdue, true);
  assert.equal(result.layers.LAYER_2.readiness, READINESS_LEVEL.NOT_READY);
  assert.equal(result.overall, READINESS_LEVEL.NOT_READY);
});
