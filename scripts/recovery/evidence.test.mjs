import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { CHECKSUM_INTEGRITY_STATUS, OPERATION_STATUS, RECOVERY_LAYER } from "./constants.mjs";
import {
  createEvidence,
  evaluateQualifyingRecoveryProof,
  isSuccessfulLayerEvidence,
  validateEvidence,
} from "./evidence.mjs";
import { generateRunId } from "./run-id.mjs";
import { inspectEvidence, listEvidence, persistEvidence, readRunEvidence } from "./store.mjs";

function tempRoot() {
  return mkdtempSync(path.join(os.tmpdir(), "boba-recovery-evidence-"));
}

test("valid evidence is accepted and incomplete evidence is not success", () => {
  const valid = createEvidence({
    runId: generateRunId(),
    operationType: "status",
    recoveryLayer: RECOVERY_LAYER.LAYER_2,
    status: OPERATION_STATUS.SUCCEEDED,
    endedAt: new Date().toISOString(),
    candidate: { commitSha: "abc123", tree: "def456" },
    migrationSchemaContext: "0029_refund_statutory_issuance_allocation",
    sourceEnvironmentClassification: "production",
    sourceIdentityMarker: "prod-db-1",
    recoveryArtifactReference: "logical-bucket/run/artifact",
    recoveryPoint: "2026-09-20T00:00:00Z",
  });
  assert.equal(validateEvidence(valid).ok, true);
  assert.equal(isSuccessfulLayerEvidence(valid), true);
  // Schema-valid SUCCEEDED is not qualifying recovery proof.
  assert.equal(evaluateQualifyingRecoveryProof(valid, { layer: RECOVERY_LAYER.LAYER_2 }).ok, false);

  const running = createEvidence({
    runId: generateRunId(),
    operationType: "status",
    status: OPERATION_STATUS.RUNNING,
    incomplete: true,
  });
  assert.equal(validateEvidence(running).ok, true);
  assert.equal(isSuccessfulLayerEvidence(running), false);

  assert.equal(validateEvidence({ schemaVersion: "nope" }).ok, false);
  assert.equal(
    validateEvidence({
      ...valid,
      status: OPERATION_STATUS.SUCCEEDED,
      incomplete: true,
    }).ok,
    false,
  );
});

test("generic SUCCEEDED and NOT_CHECKED checksum never qualify as recovery proof", () => {
  const generic = createEvidence({
    runId: generateRunId(),
    operationType: "status",
    recoveryLayer: RECOVERY_LAYER.LAYER_1,
    status: OPERATION_STATUS.SUCCEEDED,
    endedAt: new Date().toISOString(),
  });
  assert.equal(validateEvidence(generic).ok, true);
  assert.equal(isSuccessfulLayerEvidence(generic), true);
  assert.equal(evaluateQualifyingRecoveryProof(generic, { layer: RECOVERY_LAYER.LAYER_1 }).ok, false);

  const unchecked = createEvidence({
    runId: generateRunId(),
    operationType: "layer2-logical-backup",
    recoveryLayer: RECOVERY_LAYER.LAYER_2,
    status: OPERATION_STATUS.SUCCEEDED,
    endedAt: new Date().toISOString(),
    recoveryPoint: "2026-09-20T00:00:00Z",
    recoveryArtifactReference: "bucket/a",
    checksumIntegrityStatus: CHECKSUM_INTEGRITY_STATUS.NOT_CHECKED,
    candidate: { commitSha: "abc" },
    sourceEnvironmentClassification: "production",
    validationResults: [{ code: "UPLOAD_OK" }],
  });
  const proof = evaluateQualifyingRecoveryProof(unchecked, { layer: RECOVERY_LAYER.LAYER_2 });
  assert.equal(proof.ok, false);
  assert.match(proof.reason, /NOT_CHECKED/);
});

test("persistEvidence never overwrites and preserves earlier failures after later success", () => {
  const root = tempRoot();
  try {
    const failedId = generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 1, 0, 0)), randomHex: "1111111111111111" });
    const successId = generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 1, 1, 0)), randomHex: "2222222222222222" });
    persistEvidence(root, {
      runId: failedId,
      operationType: "status",
      recoveryLayer: RECOVERY_LAYER.LAYER_1,
      status: OPERATION_STATUS.FAILED,
      endedAt: new Date().toISOString(),
      findings: [{ code: "BACKUP_FAILED", detail: "first failure" }],
      failureBlockReason: "pgBackRest not implemented in this tranche",
    });
    persistEvidence(root, {
      runId: successId,
      operationType: "status",
      recoveryLayer: RECOVERY_LAYER.LAYER_1,
      status: OPERATION_STATUS.SUCCEEDED,
      endedAt: new Date().toISOString(),
    });
    const failed = readRunEvidence(root, failedId);
    assert.equal(failed.ok, true);
    if (failed.ok) {
      assert.equal(failed.evidence.status, OPERATION_STATUS.FAILED);
      assert.equal(failed.evidence.findings[0].code, "BACKUP_FAILED");
    }
    assert.throws(
      () =>
        persistEvidence(root, {
          runId: failedId,
          operationType: "status",
          status: OPERATION_STATUS.SUCCEEDED,
          endedAt: new Date().toISOString(),
        }),
      /overwrite is forbidden/,
    );
    const listed = listEvidence(root);
    assert.equal(listed.length, 2);
    assert.equal(listed.some((record) => record.status === OPERATION_STATUS.FAILED), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("malformed on-disk JSON is not listed as valid evidence", () => {
  const root = tempRoot();
  try {
    const runId = generateRunId();
    mkdirSync(path.join(root, runId));
    writeFileSync(path.join(root, runId, "evidence.json"), "{not-json", "utf8");
    assert.equal(readRunEvidence(root, runId).ok, false);
    assert.equal(listEvidence(root).length, 0);
    const inspected = inspectEvidence(root);
    assert.equal(inspected.valid.length, 0);
    assert.equal(inspected.invalid.length, 1);
    assert.equal(inspected.invalid[0].runId, runId);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Layer 2 qualifies when remote+COMPLETE markers and chain fields are present", () => {
  const evidence = createEvidence({
    runId: generateRunId(),
    operationType: "layer2-logical-backup",
    recoveryLayer: RECOVERY_LAYER.LAYER_2,
    status: OPERATION_STATUS.SUCCEEDED,
    endedAt: new Date().toISOString(),
    recoveryPoint: "2026-09-20T00:00:00Z",
    recoveryArtifactReference: "logical/run/dump.age",
    checksumIntegrityStatus: CHECKSUM_INTEGRITY_STATUS.MATCHED,
    candidate: { commitSha: "abc", tree: "def" },
    sourceEnvironmentClassification: "production",
    sourceIdentityMarker: "prod-db-1",
    validationResults: [
      { code: "REMOTE_ARTIFACT_SHA256_VERIFIED" },
      { code: "COMPLETE_MARKER_WRITTEN_LAST" },
    ],
  });
  const proof = evaluateQualifyingRecoveryProof(evidence, { layer: RECOVERY_LAYER.LAYER_2 });
  assert.equal(proof.ok, true);
});

test("Layer 1 qualifies with health + recovery point + repository generation proof", () => {
  const evidence = createEvidence({
    runId: generateRunId(),
    operationType: "layer1-backup",
    recoveryLayer: RECOVERY_LAYER.LAYER_1,
    status: OPERATION_STATUS.SUCCEEDED,
    endedAt: new Date().toISOString(),
    recoveryPoint: "2026-09-20T00:00:00Z",
    validationResults: [
      { code: "PGBACKREST_INFO_OK" },
      { code: "LAYER1_RECOVERY_POINT" },
      { code: "REPOSITORY_GENERATION", repositoryGeneration: "1", keyVersion: "repo-gen-1" },
    ],
  });
  const proof = evaluateQualifyingRecoveryProof(evidence, { layer: RECOVERY_LAYER.LAYER_1 });
  assert.equal(proof.ok, true);
});

test("synthetic magic-only markers without chain fields still fail Layer 2", () => {
  const evidence = createEvidence({
    runId: generateRunId(),
    operationType: "layer2-logical-backup",
    recoveryLayer: RECOVERY_LAYER.LAYER_2,
    status: OPERATION_STATUS.SUCCEEDED,
    endedAt: new Date().toISOString(),
    checksumIntegrityStatus: CHECKSUM_INTEGRITY_STATUS.MATCHED,
    validationResults: [
      { code: "REMOTE_ARTIFACT_SHA256_VERIFIED" },
      { code: "COMPLETE_MARKER_WRITTEN_LAST" },
    ],
  });
  const proof = evaluateQualifyingRecoveryProof(evidence, { layer: RECOVERY_LAYER.LAYER_2 });
  assert.equal(proof.ok, false);
  assert.match(proof.reason, /recovery point|artifact|context/i);
});
