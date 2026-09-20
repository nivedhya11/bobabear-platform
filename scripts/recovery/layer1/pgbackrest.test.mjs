import assert from "node:assert/strict";
import { test } from "node:test";
import { PROOF_CODE } from "../constants.mjs";
import {
  buildLayer1HealthProof,
  isLayer1QualifyingProofCodes,
  parsePgbackrestInfoJson,
} from "./pgbackrest.mjs";

const SAMPLE_INFO_JSON = JSON.stringify([
  {
    name: "boba",
    status: {
      code: 0,
      message: "ok",
      backup: "2026-09-20 10:00:00+00",
      archive: "000000010000000000000010",
    },
    backup: [
      {
        type: "full",
        label: "20260920-100000F",
        timestamp: { start: 1726826400, stop: 1726826500 },
        lsn: { start: "0/1000000", stop: "0/2000000" },
        archive: { start: "000000010000000000000001", stop: "000000010000000000000010" },
      },
    ],
    archive: [{ min: "000000010000000000000001", max: "000000010000000000000010" }],
  },
]);

test("parsePgbackrestInfoJson derives recovery point from real JSON (fail closed on empty)", () => {
  const parsed = parsePgbackrestInfoJson(SAMPLE_INFO_JSON);
  assert.equal(parsed.ok, true);
  assert.ok(parsed.recoveryPoint);
  assert.notEqual(parsed.recoveryPoint, "");

  assert.equal(parsePgbackrestInfoJson("").ok, false);
  assert.equal(parsePgbackrestInfoJson("not-json").ok, false);
  assert.equal(parsePgbackrestInfoJson("[]").ok, false);
});

test("buildLayer1HealthProof requires check + info + verify + recovery point + generation", () => {
  const ok = buildLayer1HealthProof({
    checkOk: true,
    infoOutput: SAMPLE_INFO_JSON,
    verifyOk: true,
    recoveryPoint: "2026-09-20T10:01:40.000Z",
    repositoryGeneration: 1,
  });
  assert.equal(ok.ok, true);
  assert.equal(isLayer1QualifyingProofCodes(ok.validationResults), true);
  const codes = new Set(ok.validationResults.map((entry) => entry.code));
  assert.equal(codes.has(PROOF_CODE.PGBACKREST_CHECK_OK), true);
  assert.equal(codes.has(PROOF_CODE.PGBACKREST_INFO_OK), true);
  assert.equal(codes.has(PROOF_CODE.PGBACKREST_VERIFY_OK), true);
  assert.equal(codes.has(PROOF_CODE.LAYER1_RECOVERY_POINT), true);
  assert.equal(codes.has(PROOF_CODE.REPOSITORY_GENERATION), true);

  assert.equal(
    buildLayer1HealthProof({
      checkOk: false,
      infoOutput: SAMPLE_INFO_JSON,
      verifyOk: true,
      recoveryPoint: "2026-09-20T10:01:40.000Z",
      repositoryGeneration: 1,
    }).ok,
    false,
  );
  assert.equal(
    buildLayer1HealthProof({
      checkOk: true,
      infoOutput: SAMPLE_INFO_JSON,
      verifyOk: false,
      recoveryPoint: "2026-09-20T10:01:40.000Z",
      repositoryGeneration: 1,
    }).ok,
    false,
  );
  assert.equal(
    buildLayer1HealthProof({
      checkOk: true,
      infoOutput: SAMPLE_INFO_JSON,
      verifyOk: true,
      recoveryPoint: "",
      repositoryGeneration: 1,
    }).ok,
    false,
  );
});

test("absence of any required proof code makes Layer 1 NOT qualifying", () => {
  const full = buildLayer1HealthProof({
    checkOk: true,
    infoOutput: SAMPLE_INFO_JSON,
    verifyOk: true,
    recoveryPoint: "2026-09-20T10:01:40.000Z",
    repositoryGeneration: 1,
  }).validationResults;

  for (const required of [
    PROOF_CODE.PGBACKREST_CHECK_OK,
    PROOF_CODE.PGBACKREST_INFO_OK,
    PROOF_CODE.PGBACKREST_VERIFY_OK,
    PROOF_CODE.LAYER1_RECOVERY_POINT,
    PROOF_CODE.REPOSITORY_GENERATION,
  ]) {
    const stripped = full.filter((entry) => entry.code !== required);
    assert.equal(isLayer1QualifyingProofCodes(stripped), false, `missing ${required} must not qualify`);
  }
});
