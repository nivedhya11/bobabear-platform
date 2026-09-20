import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CHECKSUM_INTEGRITY_STATUS,
  LAYER_2_MAX_AGE_MS_DEFAULT,
  OPERATION_STATUS,
  READINESS_LEVEL,
  RECOVERY_LAYER,
} from "./constants.mjs";
import { createEvidence, evaluateQualifyingRecoveryProof } from "./evidence.mjs";
import { evaluateReadiness } from "./readiness.mjs";
import { generateRunId } from "./run-id.mjs";

function layerEvidence(layer, status, extra = {}) {
  const ended = extra.endedAt ?? (status === OPERATION_STATUS.RUNNING ? null : new Date().toISOString());
  return createEvidence({
    runId: extra.runId ?? generateRunId(),
    operationType: extra.operationType ?? "status",
    recoveryLayer: layer,
    status,
    endedAt: ended,
    incomplete: extra.incomplete,
    findings: extra.findings,
    failureBlockReason: extra.failureBlockReason,
    startedAt: extra.startedAt,
    recoveryPoint: extra.recoveryPoint,
    recoveryArtifactReference: extra.recoveryArtifactReference,
    checksumIntegrityStatus: extra.checksumIntegrityStatus,
    candidate: extra.candidate,
    sourceEnvironmentClassification: extra.sourceEnvironmentClassification,
    sourceIdentityMarker: extra.sourceIdentityMarker,
    validationResults: extra.validationResults,
  });
}

/** Test-only injected qualifier representing future validated Layer proof — not production evidence. */
function acceptInjectedProof() {
  return { ok: true, reason: "injected future qualifying recovery proof fixture" };
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

test("generic LAYER_1 SUCCEEDED record is NOT_READY", () => {
  const layer1 = layerEvidence(RECOVERY_LAYER.LAYER_1, OPERATION_STATUS.SUCCEEDED, {
    runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 2, 0, 0)), randomHex: "aaaaaaaaaaaaaaaa" }),
  });
  const result = evaluateReadiness({ evidenceRecords: [layer1] });
  assert.equal(result.layers.LAYER_1.readiness, READINESS_LEVEL.NOT_READY);
  assert.match(result.layers.LAYER_1.reason, /cannot establish|qualifying|foundation|status/i);
  assert.equal(result.overall, READINESS_LEVEL.NOT_READY);
  assert.equal(evaluateQualifyingRecoveryProof(layer1, { layer: RECOVERY_LAYER.LAYER_1 }).ok, false);
});

test("generic LAYER_2 SUCCEEDED record is NOT_READY", () => {
  const layer2 = layerEvidence(RECOVERY_LAYER.LAYER_2, OPERATION_STATUS.SUCCEEDED, {
    runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 3, 0, 0)), randomHex: "bbbbbbbbbbbbbbbb" }),
  });
  const result = evaluateReadiness({ evidenceRecords: [layer2] });
  assert.equal(result.layers.LAYER_2.readiness, READINESS_LEVEL.NOT_READY);
  assert.match(result.layers.LAYER_2.reason, /cannot establish|qualifying|foundation|status/i);
  assert.equal(result.overall, READINESS_LEVEL.NOT_READY);
});

test("generic SUCCEEDED for both layers aggregates to overall NOT_READY", () => {
  const layer1 = layerEvidence(RECOVERY_LAYER.LAYER_1, OPERATION_STATUS.SUCCEEDED, {
    runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 4, 0, 0)), randomHex: "cccccccccccccccc" }),
  });
  const layer2 = layerEvidence(RECOVERY_LAYER.LAYER_2, OPERATION_STATUS.SUCCEEDED, {
    runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 4, 1, 0)), randomHex: "dddddddddddddddd" }),
  });
  const result = evaluateReadiness({ evidenceRecords: [layer1, layer2] });
  assert.equal(result.overall, READINESS_LEVEL.NOT_READY);
  assert.equal(result.layers.LAYER_1.readiness, READINESS_LEVEL.NOT_READY);
  assert.equal(result.layers.LAYER_2.readiness, READINESS_LEVEL.NOT_READY);
  assert.match(result.note, /qualifying recovery proof|schema-valid SUCCEEDED alone is insufficient/i);
});

test("arbitrary operationType cannot qualify recovery proof", () => {
  const layer2 = layerEvidence(RECOVERY_LAYER.LAYER_2, OPERATION_STATUS.SUCCEEDED, {
    operationType: "invented-backup-op",
    runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 4, 2, 0)), randomHex: "eeeeeeeeeeeeeeee" }),
    checksumIntegrityStatus: CHECKSUM_INTEGRITY_STATUS.NOT_CHECKED,
  });
  const qualification = evaluateQualifyingRecoveryProof(layer2, { layer: RECOVERY_LAYER.LAYER_2 });
  assert.equal(qualification.ok, false);
  assert.match(qualification.reason, /NOT_CHECKED|cannot establish/i);
  const result = evaluateReadiness({ evidenceRecords: [layer2] });
  assert.equal(result.layers.LAYER_2.readiness, READINESS_LEVEL.NOT_READY);
});

test("Layer 2 NOT_CHECKED checksum cannot qualify", () => {
  const layer2 = layerEvidence(RECOVERY_LAYER.LAYER_2, OPERATION_STATUS.SUCCEEDED, {
    operationType: "layer2-logical-backup",
    recoveryPoint: "2026-09-20T00:00:00Z",
    recoveryArtifactReference: "bucket/run/artifact.age",
    checksumIntegrityStatus: CHECKSUM_INTEGRITY_STATUS.NOT_CHECKED,
    candidate: { commitSha: "abc", tree: "def" },
    sourceEnvironmentClassification: "production",
    validationResults: [{ code: "UPLOAD_OK" }],
  });
  const qualification = evaluateQualifyingRecoveryProof(layer2, { layer: RECOVERY_LAYER.LAYER_2 });
  assert.equal(qualification.ok, false);
  assert.match(qualification.reason, /NOT_CHECKED/);
});

test("Layer 2 without remote-verification/COMPLETE proof cannot qualify", () => {
  const layer2 = layerEvidence(RECOVERY_LAYER.LAYER_2, OPERATION_STATUS.SUCCEEDED, {
    operationType: "layer2-logical-backup",
    recoveryPoint: "2026-09-20T00:00:00Z",
    recoveryArtifactReference: "bucket/run/artifact.age",
    checksumIntegrityStatus: CHECKSUM_INTEGRITY_STATUS.MATCHED,
    candidate: { commitSha: "abc", tree: "def" },
    sourceEnvironmentClassification: "production",
    sourceIdentityMarker: "prod-db-1",
    validationResults: [{ code: "PUT_SUCCEEDED" }],
  });
  const qualification = evaluateQualifyingRecoveryProof(layer2, { layer: RECOVERY_LAYER.LAYER_2 });
  assert.equal(qualification.ok, false);
  assert.match(qualification.reason, /remote|COMPLETE/i);
  const result = evaluateReadiness({ evidenceRecords: [layer2] });
  assert.equal(result.layers.LAYER_2.readiness, READINESS_LEVEL.NOT_READY);
});

test("missing recovery point cannot qualify where required", () => {
  const layer1 = layerEvidence(RECOVERY_LAYER.LAYER_1, OPERATION_STATUS.SUCCEEDED, {
    operationType: "layer1-pgbackrest",
    runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 4, 3, 0)), randomHex: "ffffffffffffffff" }),
  });
  const layer1Proof = evaluateQualifyingRecoveryProof(layer1, { layer: RECOVERY_LAYER.LAYER_1 });
  assert.equal(layer1Proof.ok, false);
  assert.match(layer1Proof.reason, /recovery point/i);

  const layer2 = layerEvidence(RECOVERY_LAYER.LAYER_2, OPERATION_STATUS.SUCCEEDED, {
    operationType: "layer2-logical-backup",
    checksumIntegrityStatus: CHECKSUM_INTEGRITY_STATUS.MATCHED,
    recoveryArtifactReference: "bucket/run/artifact.age",
    candidate: { commitSha: "abc" },
    sourceEnvironmentClassification: "production",
    validationResults: [
      { code: "REMOTE_ARTIFACT_SHA256_VERIFIED" },
      { code: "COMPLETE_MARKER_WRITTEN_LAST" },
    ],
  });
  const layer2Proof = evaluateQualifyingRecoveryProof(layer2, { layer: RECOVERY_LAYER.LAYER_2 });
  assert.equal(layer2Proof.ok, false);
  assert.match(layer2Proof.reason, /recovery point/i);
});

test("missing freshness policy cannot produce READY", () => {
  const layer1 = layerEvidence(RECOVERY_LAYER.LAYER_1, OPERATION_STATUS.SUCCEEDED, {
    runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 5, 0, 0)), randomHex: "1111111111111111" }),
    endedAt: "2026-09-20T05:00:00.000Z",
  });
  const layer2 = layerEvidence(RECOVERY_LAYER.LAYER_2, OPERATION_STATUS.SUCCEEDED, {
    runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 5, 1, 0)), randomHex: "2222222222222222" }),
    endedAt: "2026-09-20T05:01:00.000Z",
  });
  const withoutFlags = evaluateReadiness({
    evidenceRecords: [layer1, layer2],
    policy: {
      now: "2026-09-20T05:02:00.000Z",
      qualifyProof: acceptInjectedProof,
    },
  });
  assert.equal(withoutFlags.layers.LAYER_1.readiness, READINESS_LEVEL.NOT_READY);
  assert.match(withoutFlags.layers.LAYER_1.reason, /freshness|health proof unavailable/i);
  assert.equal(withoutFlags.overall, READINESS_LEVEL.NOT_READY);
});

test("stale otherwise-qualifying evidence is NOT_READY", () => {
  const stale = layerEvidence(RECOVERY_LAYER.LAYER_2, OPERATION_STATUS.SUCCEEDED, {
    runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 1, 0, 0, 0)), randomHex: "3333333333333333" }),
    endedAt: "2026-09-01T00:00:00.000Z",
  });
  const result = evaluateReadiness({
    evidenceRecords: [stale],
    policy: {
      requiredLayers: [RECOVERY_LAYER.LAYER_2],
      now: "2026-09-20T00:00:00.000Z",
      qualifyProof: acceptInjectedProof,
    },
  });
  assert.equal(result.layers.LAYER_2.overdue, true);
  assert.equal(result.layers.LAYER_2.readiness, READINESS_LEVEL.NOT_READY);
  assert.equal(result.overall, READINESS_LEVEL.NOT_READY);
  assert.equal(LAYER_2_MAX_AGE_MS_DEFAULT, 24 * 60 * 60 * 1000);
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

test("interrupted evidence is not success", () => {
  const interrupted = layerEvidence(RECOVERY_LAYER.LAYER_1, OPERATION_STATUS.RUNNING, { incomplete: true });
  const result = evaluateReadiness({ evidenceRecords: [interrupted] });
  assert.equal(result.layers.LAYER_1.readiness, READINESS_LEVEL.NOT_READY);
  assert.match(result.layers.LAYER_1.reason, /incomplete/);
});

test("malformed latest evidence blocks READY and remains visible", () => {
  const layer1 = layerEvidence(RECOVERY_LAYER.LAYER_1, OPERATION_STATUS.SUCCEEDED, {
    runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 4, 0, 0)), randomHex: "aaaaaaaaaaaaaaaa" }),
    endedAt: "2026-09-20T04:00:00.000Z",
  });
  const layer2 = layerEvidence(RECOVERY_LAYER.LAYER_2, OPERATION_STATUS.SUCCEEDED, {
    runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 4, 1, 0)), randomHex: "bbbbbbbbbbbbbbbb" }),
    endedAt: "2026-09-20T04:01:00.000Z",
  });
  const malformedId = generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 4, 2, 0)), randomHex: "cccccccccccccccc" });
  const result = evaluateReadiness({
    evidenceRecords: [layer1, layer2],
    invalidEvidence: [{ runId: malformedId, reason: "Evidence file is not valid JSON" }],
  });
  assert.equal(result.overall, READINESS_LEVEL.NOT_READY);
  assert.equal(result.latestAttempt.runId, malformedId);
  assert.equal(result.latestAttempt.status, "UNVERIFIABLE");
  assert.equal(result.malformedCount, 1);
});

test("injected future qualifier can READY only with freshness; production default stays fail-closed", () => {
  const layer1 = layerEvidence(RECOVERY_LAYER.LAYER_1, OPERATION_STATUS.SUCCEEDED, {
    runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 6, 0, 0)), randomHex: "4444444444444444" }),
    endedAt: "2026-09-20T06:00:00.000Z",
  });
  const layer2 = layerEvidence(RECOVERY_LAYER.LAYER_2, OPERATION_STATUS.SUCCEEDED, {
    runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 6, 1, 0)), randomHex: "5555555555555555" }),
    endedAt: "2026-09-20T06:01:00.000Z",
  });
  const withFixture = evaluateReadiness({
    evidenceRecords: [layer1, layer2],
    policy: {
      now: "2026-09-20T06:02:00.000Z",
      layer1MaxAgeMs: 15 * 60 * 1000,
      qualifyProof: acceptInjectedProof,
    },
  });
  assert.equal(withFixture.overall, READINESS_LEVEL.READY);
  assert.equal(withFixture.layers.LAYER_1.readiness, READINESS_LEVEL.READY);
  assert.equal(withFixture.layers.LAYER_2.readiness, READINESS_LEVEL.READY);

  const productionDefault = evaluateReadiness({
    evidenceRecords: [layer1, layer2],
    policy: { now: "2026-09-20T06:02:00.000Z" },
  });
  assert.equal(productionDefault.overall, READINESS_LEVEL.NOT_READY);
});
