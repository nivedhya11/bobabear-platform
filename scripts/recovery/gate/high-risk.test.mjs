import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CHECKSUM_INTEGRITY_STATUS,
  OPERATION_STATUS,
  OPERATION_TYPE,
  PROOF_CODE,
  RECOVERY_LAYER,
} from "../constants.mjs";
import { createEvidence } from "../evidence.mjs";
import { generateRunId } from "../run-id.mjs";
import {
  evaluateHighRiskMigrationGate,
  RESTORE_AS_ROUTINE_ROLLBACK,
  selectLatestAttemptEvidence,
} from "./high-risk.mjs";

function layer1Proof(overrides = {}) {
  const nowIso = overrides.endedAt ?? new Date().toISOString();
  return createEvidence({
    runId:
      overrides.runId ??
      generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 10, 0, 0)), randomHex: "aaaaaaaaaaaaaaaa" }),
    operationType: OPERATION_TYPE.LAYER1_BACKUP,
    recoveryLayer: RECOVERY_LAYER.LAYER_1,
    status: OPERATION_STATUS.SUCCEEDED,
    startedAt: nowIso,
    endedAt: nowIso,
    recoveryPoint: overrides.recoveryPoint ?? nowIso,
    validationResults: [
      { code: PROOF_CODE.PGBACKREST_CHECK_OK },
      { code: PROOF_CODE.PGBACKREST_INFO_OK },
      { code: PROOF_CODE.PGBACKREST_VERIFY_OK },
      { code: PROOF_CODE.LAYER1_RECOVERY_POINT, recoveryPoint: overrides.recoveryPoint ?? nowIso },
      { code: PROOF_CODE.REPOSITORY_GENERATION, repositoryGeneration: "1", keyVersion: "repo-gen-1" },
    ],
    ...overrides,
  });
}

function layer2Proof(overrides = {}) {
  const nowIso = overrides.endedAt ?? new Date().toISOString();
  return createEvidence({
    runId:
      overrides.runId ??
      generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 10, 1, 0)), randomHex: "bbbbbbbbbbbbbbbb" }),
    operationType: OPERATION_TYPE.LAYER2_LOGICAL_BACKUP,
    recoveryLayer: RECOVERY_LAYER.LAYER_2,
    status: OPERATION_STATUS.SUCCEEDED,
    startedAt: nowIso,
    endedAt: nowIso,
    recoveryPoint: nowIso,
    recoveryArtifactReference: "logical/run/dump.age",
    checksumIntegrityStatus: CHECKSUM_INTEGRITY_STATUS.MATCHED,
    candidate: { commitSha: "abc" },
    sourceEnvironmentClassification: "production",
    sourceIdentityMarker: "prod-db-1",
    validationResults: [
      { code: PROOF_CODE.REMOTE_ARTIFACT_SHA256_VERIFIED },
      { code: PROOF_CODE.COMPLETE_MARKER_WRITTEN_LAST },
    ],
    ...overrides,
  });
}

function drillProof(overrides = {}) {
  const nowIso = overrides.endedAt ?? new Date().toISOString();
  return createEvidence({
    runId: overrides.runId ?? generateRunId(),
    operationType: OPERATION_TYPE.PORTABILITY_REHEARSAL,
    recoveryLayer: RECOVERY_LAYER.LAYER_2,
    status: OPERATION_STATUS.SUCCEEDED,
    startedAt: nowIso,
    endedAt: nowIso,
    validationResults: [{ code: PROOF_CODE.BUSINESS_INTEGRITY_VALIDATED, ok: true }],
    ...overrides,
  });
}

test("RESTORE_AS_ROUTINE_ROLLBACK remains false", () => {
  assert.equal(RESTORE_AS_ROUTINE_ROLLBACK, false);
});

test("high-risk gate READY on positive evidence path", () => {
  const now = new Date();
  const recoveryPoint = new Date(now.getTime() - 60_000).toISOString();
  const gate = evaluateHighRiskMigrationGate({
    layer1Evidence: layer1Proof({ endedAt: now.toISOString(), recoveryPoint }),
    layer2Evidence: layer2Proof({ endedAt: now.toISOString() }),
    drillEvidence: drillProof({ endedAt: now.toISOString() }),
    validationEvidence: drillProof({ endedAt: now.toISOString() }),
    policy: { now },
  });
  assert.equal(gate.result, "READY");
  assert.equal(gate.restoreAsRoutineRollback, false);
  assert.equal(gate.reasons.length, 0);
});

test("high-risk gate BLOCKED when Layer evidence is stale", () => {
  const stale = evaluateHighRiskMigrationGate({
    layer1Evidence: layer1Proof({
      endedAt: "2020-01-01T00:00:00.000Z",
      startedAt: "2020-01-01T00:00:00.000Z",
      recoveryPoint: "2020-01-01T00:00:00.000Z",
    }),
    layer2Evidence: layer2Proof(),
    drillEvidence: drillProof(),
    validationEvidence: drillProof(),
  });
  assert.equal(stale.result, "BLOCKED");
  assert.match(stale.reasons.join(" "), /stale|RPO/i);
});

test("high-risk gate BLOCKED when recovery point violates RPO even if evidence is fresh", () => {
  const now = new Date("2026-09-20T12:00:00.000Z");
  const gate = evaluateHighRiskMigrationGate({
    layer1Evidence: layer1Proof({
      endedAt: now.toISOString(),
      recoveryPoint: "2026-09-20T11:00:00.000Z", // 60 minutes old > 15m RPO
    }),
    layer2Evidence: layer2Proof({ endedAt: now.toISOString() }),
    drillEvidence: drillProof({ endedAt: now.toISOString() }),
    validationEvidence: drillProof({ endedAt: now.toISOString() }),
    policy: { now },
  });
  assert.equal(gate.result, "BLOCKED");
  assert.match(gate.reasons.join(" "), /RPO/i);
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
      operationType: OPERATION_TYPE.PORTABILITY_REHEARSAL,
      status: OPERATION_STATUS.FAILED,
      endedAt: new Date().toISOString(),
      failureBlockReason: "drill failed",
    }),
    validationEvidence: drillProof(),
  });
  assert.equal(failedDrill.result, "BLOCKED");
  assert.match(failedDrill.note, /not routine rollback/i);
});

test("latest attempt precedence: old success + newer failure/blocked/running/malformed => BLOCKED", () => {
  const t1 = "2026-09-20T10:00:00.000Z";
  const t2 = "2026-09-20T11:00:00.000Z";
  const oldSuccess = layer1Proof({
    runId: generateRunId({ now: new Date(t1), randomHex: "1111111111111111" }),
    endedAt: t1,
    startedAt: t1,
    recoveryPoint: t1,
  });
  const cases = [
    {
      label: "failure",
      newer: createEvidence({
        runId: generateRunId({ now: new Date(t2), randomHex: "2222222222222222" }),
        operationType: OPERATION_TYPE.LAYER1_BACKUP,
        recoveryLayer: RECOVERY_LAYER.LAYER_1,
        status: OPERATION_STATUS.FAILED,
        startedAt: t2,
        endedAt: t2,
        failureBlockReason: "boom",
      }),
    },
    {
      label: "blocked",
      newer: createEvidence({
        runId: generateRunId({ now: new Date(t2), randomHex: "3333333333333333" }),
        operationType: OPERATION_TYPE.LAYER1_BACKUP,
        recoveryLayer: RECOVERY_LAYER.LAYER_1,
        status: OPERATION_STATUS.BLOCKED,
        startedAt: t2,
        endedAt: t2,
        failureBlockReason: "lock held",
      }),
    },
    {
      label: "running",
      newer: createEvidence({
        runId: generateRunId({ now: new Date(t2), randomHex: "4444444444444444" }),
        operationType: OPERATION_TYPE.LAYER1_BACKUP,
        recoveryLayer: RECOVERY_LAYER.LAYER_1,
        status: OPERATION_STATUS.RUNNING,
        incomplete: true,
        startedAt: t2,
      }),
    },
  ];

  for (const entry of cases) {
    const selected = selectLatestAttemptEvidence([oldSuccess, entry.newer]);
    assert.equal(selected.layer1?.runId, entry.newer.runId, entry.label);
    const gate = evaluateHighRiskMigrationGate({
      layer1Evidence: selected.layer1,
      layer2Evidence: layer2Proof({ endedAt: t2 }),
      drillEvidence: drillProof({ endedAt: t2 }),
      validationEvidence: drillProof({ endedAt: t2 }),
      policy: { now: new Date(t2) },
    });
    assert.equal(gate.result, "BLOCKED", entry.label);
    assert.match(gate.reasons.join(" "), /latest Layer 1/i, entry.label);
  }

  const selectedMalformed = selectLatestAttemptEvidence([oldSuccess], {
    invalid: [{ runId: generateRunId({ now: new Date(t2), randomHex: "5555555555555555" }), reason: "bad json" }],
  });
  const malformedGate = evaluateHighRiskMigrationGate({
    layer1Evidence: selectedMalformed.layer1,
    layer2Evidence: layer2Proof({ endedAt: t2 }),
    drillEvidence: drillProof({ endedAt: t2 }),
    validationEvidence: drillProof({ endedAt: t2 }),
    policy: { now: new Date(t2) },
  });
  assert.equal(malformedGate.result, "BLOCKED");
  assert.match(malformedGate.reasons.join(" "), /malformed|unverifiable|latest Layer 1/i);
});
