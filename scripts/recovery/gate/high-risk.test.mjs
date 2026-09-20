import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CHECKSUM_INTEGRITY_STATUS,
  OPERATION_STATUS,
  PROOF_CODE,
  RECOVERY_LAYER,
} from "../constants.mjs";
import { createEvidence } from "../evidence.mjs";
import { generateRunId } from "../run-id.mjs";
import { evaluateHighRiskMigrationGate, RESTORE_AS_ROUTINE_ROLLBACK } from "./high-risk.mjs";

function layer1Proof() {
  return createEvidence({
    runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 10, 0, 0)), randomHex: "aaaaaaaaaaaaaaaa" }),
    operationType: "layer1-backup",
    recoveryLayer: RECOVERY_LAYER.LAYER_1,
    status: OPERATION_STATUS.SUCCEEDED,
    endedAt: new Date().toISOString(),
    recoveryPoint: "2026-09-20T10:00:00Z",
    validationResults: [
      { code: PROOF_CODE.PGBACKREST_INFO_OK },
      { code: PROOF_CODE.LAYER1_RECOVERY_POINT, recoveryPoint: "2026-09-20T10:00:00Z" },
      { code: PROOF_CODE.REPOSITORY_GENERATION, repositoryGeneration: "1", keyVersion: "repo-gen-1" },
    ],
  });
}

function layer2Proof() {
  return createEvidence({
    runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 10, 1, 0)), randomHex: "bbbbbbbbbbbbbbbb" }),
    operationType: "layer2-logical-backup",
    recoveryLayer: RECOVERY_LAYER.LAYER_2,
    status: OPERATION_STATUS.SUCCEEDED,
    endedAt: new Date().toISOString(),
    recoveryPoint: "2026-09-20T10:01:00Z",
    recoveryArtifactReference: "logical/run/dump.age",
    checksumIntegrityStatus: CHECKSUM_INTEGRITY_STATUS.MATCHED,
    candidate: { commitSha: "abc" },
    sourceEnvironmentClassification: "production",
    sourceIdentityMarker: "prod-db-1",
    validationResults: [
      { code: PROOF_CODE.REMOTE_ARTIFACT_SHA256_VERIFIED },
      { code: PROOF_CODE.COMPLETE_MARKER_WRITTEN_LAST },
    ],
  });
}

test("RESTORE_AS_ROUTINE_ROLLBACK remains false", () => {
  assert.equal(RESTORE_AS_ROUTINE_ROLLBACK, false);
});

test("high-risk gate READY on positive evidence path", () => {
  const gate = evaluateHighRiskMigrationGate({
    layer1Evidence: layer1Proof(),
    layer2Evidence: layer2Proof(),
    drillEvidence: createEvidence({
      runId: generateRunId(),
      operationType: "portability-rehearsal",
      status: OPERATION_STATUS.SUCCEEDED,
      endedAt: new Date().toISOString(),
    }),
    validationEvidence: createEvidence({
      runId: generateRunId(),
      operationType: "portability-rehearsal",
      status: OPERATION_STATUS.SUCCEEDED,
      endedAt: new Date().toISOString(),
      validationResults: [{ code: PROOF_CODE.BUSINESS_INTEGRITY_VALIDATED, ok: true }],
    }),
  });
  assert.equal(gate.result, "READY");
  assert.equal(gate.restoreAsRoutineRollback, false);
  assert.equal(gate.reasons.length, 0);
});

test("high-risk gate BLOCKED when Layer evidence is stale", () => {
  const stale = evaluateHighRiskMigrationGate({
    layer1Evidence: createEvidence({
      ...layer1Proof(),
      endedAt: "2020-01-01T00:00:00.000Z",
      startedAt: "2020-01-01T00:00:00.000Z",
    }),
    layer2Evidence: layer2Proof(),
    drillEvidence: createEvidence({
      runId: generateRunId(),
      operationType: "portability-rehearsal",
      status: OPERATION_STATUS.SUCCEEDED,
      endedAt: new Date().toISOString(),
    }),
    validationEvidence: createEvidence({
      runId: generateRunId(),
      operationType: "portability-rehearsal",
      status: OPERATION_STATUS.SUCCEEDED,
      endedAt: new Date().toISOString(),
      validationResults: [{ code: PROOF_CODE.BUSINESS_INTEGRITY_VALIDATED, ok: true }],
    }),
  });
  assert.equal(stale.result, "BLOCKED");
  assert.match(stale.reasons.join(" "), /stale/i);
});

test("high-risk gate BLOCKED on missing or failed evidence", () => {
  const missing = evaluateHighRiskMigrationGate({});
  assert.equal(missing.result, "BLOCKED");
  assert.ok(missing.reasons.length > 0);

  const failedDrill = evaluateHighRiskMigrationGate({
    layer1Evidence: layer1Proof(),
    layer2Evidence: layer2Proof(),
    drillEvidence: createEvidence({
      runId: generateRunId(),
      operationType: "portability-rehearsal",
      status: OPERATION_STATUS.FAILED,
      endedAt: new Date().toISOString(),
      failureBlockReason: "drill failed",
    }),
    validationEvidence: createEvidence({
      runId: generateRunId(),
      operationType: "portability-rehearsal",
      status: OPERATION_STATUS.SUCCEEDED,
      endedAt: new Date().toISOString(),
      validationResults: [{ code: PROOF_CODE.BUSINESS_INTEGRITY_VALIDATED }],
    }),
  });
  assert.equal(failedDrill.result, "BLOCKED");
  assert.match(failedDrill.note, /not routine rollback/i);
});
