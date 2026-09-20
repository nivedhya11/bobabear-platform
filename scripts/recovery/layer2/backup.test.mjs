import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  CHECKSUM_INTEGRITY_STATUS,
  OPERATION_STATUS,
  PROOF_CODE,
} from "../constants.mjs";
import { evaluateQualifyingRecoveryProof } from "../evidence.mjs";
import { RECOVERY_LAYER } from "../constants.mjs";
import { createLocalObjectStore } from "../spaces/local.mjs";
import { listCompleteRuns, pruneExpiredCompleteRuns, reconcileLocalCompleteMarker, runLogicalBackup } from "./backup.mjs";
import { generateRunId } from "../run-id.mjs";
import { readRunEvidence } from "../store.mjs";

function tempDirs() {
  const root = mkdtempSync(path.join(os.tmpdir(), "boba-layer2-"));
  return {
    root,
    storeRoot: path.join(root, "store"),
    evidenceDir: path.join(root, "evidence"),
  };
}

test("Layer 2 backup chain writes COMPLETE last and qualifies", async () => {
  const { root, storeRoot, evidenceDir } = tempDirs();
  try {
    const objectStore = createLocalObjectStore({ localRoot: storeRoot });
    const runId = generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 12, 0, 0)), randomHex: "aaaaaaaaaaaaaaaa" });
    const result = await runLogicalBackup({
      runId,
      objectStore,
      evidenceDir,
      recipients: ["age1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3waw4h"],
      sourceIdentity: "prod-db-1",
      sourceClassification: "production",
      candidate: { commitSha: "abc123", tree: "def456", repositoryPath: "/repo" },
      keyVersion: "kv1",
      dumpFn: async () => Buffer.from("PGDUMP-FC-FAKE"),
      encryptFn: async (_opts, plaintext) => {
        const ciphertext = Buffer.concat([Buffer.from("AGEENC:"), plaintext]);
        return { ok: true, ciphertext };
      },
    });
    assert.equal(result.ok, true);
    assert.equal(result.status, OPERATION_STATUS.SUCCEEDED);

    const complete = await objectStore.headObject({ key: `logical/${runId}/COMPLETE` });
    assert.equal(complete.exists, true);
    const artifact = await objectStore.getObject({ key: `logical/${runId}/dump.age` });
    const sha = createHash("sha256").update(artifact.body).digest("hex");
    assert.equal(result.sha256Hex, sha);

    const proof = evaluateQualifyingRecoveryProof(result.evidence, { layer: RECOVERY_LAYER.LAYER_2 });
    assert.equal(proof.ok, true);
    const codes = new Set(result.evidence.validationResults.map((entry) => entry.code));
    assert.equal(codes.has(PROOF_CODE.REMOTE_ARTIFACT_SHA256_VERIFIED), true);
    assert.equal(codes.has(PROOF_CODE.COMPLETE_MARKER_WRITTEN_LAST), true);
    assert.equal(result.evidence.checksumIntegrityStatus, CHECKSUM_INTEGRITY_STATUS.MATCHED);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("PUT success alone does not write COMPLETE when remote verify fails", async () => {
  const { root, storeRoot, evidenceDir } = tempDirs();
  try {
    const objectStore = createLocalObjectStore({ localRoot: storeRoot });
    const broken = {
      ...objectStore,
      async verifyRemoteSha256() {
        return { ok: false, reason: "forced mismatch" };
      },
    };
    const runId = generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 12, 1, 0)), randomHex: "bbbbbbbbbbbbbbbb" });
    const result = await runLogicalBackup({
      runId,
      objectStore: broken,
      evidenceDir,
      recipients: ["age1testrecipient"],
      sourceIdentity: "prod-db-1",
      sourceClassification: "production",
      candidate: { commitSha: "abc" },
      dumpFn: async () => Buffer.from("DUMP"),
      encryptFn: async (_opts, plaintext) => ({ ok: true, ciphertext: plaintext }),
    });
    assert.equal(result.ok, false);
    const complete = await objectStore.headObject({ key: `logical/${runId}/COMPLETE` });
    assert.equal(complete.exists, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("local COMPLETE write failure after remote COMPLETE still succeeds and reconciles", async () => {
  const { root, storeRoot, evidenceDir } = tempDirs();
  try {
    const objectStore = createLocalObjectStore({ localRoot: storeRoot });
    const runId = generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 12, 2, 0)), randomHex: "cccccccccccccccc" });

    // First create a successful backup normally.
    const result = await runLogicalBackup({
      runId,
      objectStore,
      evidenceDir,
      recipients: ["age1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3waw4h"],
      sourceIdentity: "prod-db-1",
      sourceClassification: "production",
      candidate: { commitSha: "abc123", tree: "def456", repositoryPath: "/repo" },
      keyVersion: "kv1",
      dumpFn: async () => Buffer.from("PGDUMP-FC-FAKE"),
      encryptFn: async (_opts, plaintext) => ({
        ok: true,
        ciphertext: Buffer.concat([Buffer.from("AGEENC:"), plaintext]),
      }),
    });
    assert.equal(result.ok, true);
    assert.equal(result.remoteCompleteAuthoritative, true);

    // Simulate crash window: delete local complete-marker after remote COMPLETE exists.
    const markerPath = path.join(evidenceDir, runId, "complete-marker.json");
    if (existsSync(markerPath)) {
      rmSync(markerPath);
    }
    const before = readRunEvidence(evidenceDir, runId);
    assert.equal(before.ok, true);
    if (before.ok) {
      const codes = new Set((before.evidence.validationResults ?? []).map((e) => e.code));
      assert.equal(codes.has(PROOF_CODE.COMPLETE_MARKER_WRITTEN_LAST), false);
    }

    const reconciled = await reconcileLocalCompleteMarker({ evidenceDir, runId, objectStore });
    assert.equal(reconciled.ok, true);
    const after = readRunEvidence(evidenceDir, runId);
    assert.equal(after.ok, true);
    if (after.ok) {
      const codes = new Set((after.evidence.validationResults ?? []).map((e) => e.code));
      assert.equal(codes.has(PROOF_CODE.COMPLETE_MARKER_WRITTEN_LAST), true);
      const proof = evaluateQualifyingRecoveryProof(after.evidence, { layer: RECOVERY_LAYER.LAYER_2 });
      assert.equal(proof.ok, true);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("reconcile refuses tampered remote COMPLETE / missing precomplete / SHA mismatch", async () => {
  const { root, storeRoot, evidenceDir } = tempDirs();
  try {
    const objectStore = createLocalObjectStore({ localRoot: storeRoot });
    const runId = generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 12, 3, 0)), randomHex: "dddddddddddddddd" });
    const result = await runLogicalBackup({
      runId,
      objectStore,
      evidenceDir,
      recipients: ["age1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3waw4h"],
      sourceIdentity: "prod-db-1",
      sourceClassification: "production",
      candidate: { commitSha: "abc123", tree: "def456", repositoryPath: "/repo" },
      keyVersion: "kv1",
      dumpFn: async () => Buffer.from("PGDUMP-FC-FAKE"),
      encryptFn: async (_opts, plaintext) => ({
        ok: true,
        ciphertext: Buffer.concat([Buffer.from("AGEENC:"), plaintext]),
      }),
    });
    assert.equal(result.ok, true);
    const markerPath = path.join(evidenceDir, runId, "complete-marker.json");
    rmSync(markerPath, { force: true });

    const wrongRun = await reconcileLocalCompleteMarker({
      evidenceDir,
      runId,
      objectStore: {
        getObject: async ({ key }) => {
          if (key.endsWith("/COMPLETE")) {
            return {
              body: Buffer.from(
                JSON.stringify({
                  runId: "20260920T120000Z-aaaaaaaaaaaaaaaa",
                  artifactKey: result.artifactKey,
                  sha256Hex: result.sha256Hex,
                }),
              ),
            };
          }
          return objectStore.getObject({ key });
        },
        verifyRemoteSha256: (input) => objectStore.verifyRemoteSha256(input),
      },
    });
    assert.equal(wrongRun.ok, false);
    assert.match(wrongRun.reason ?? "", /runId/i);

    const wrongArtifact = await reconcileLocalCompleteMarker({
      evidenceDir,
      runId,
      objectStore: {
        getObject: async ({ key }) => {
          if (key.endsWith("/COMPLETE")) {
            return {
              body: Buffer.from(
                JSON.stringify({
                  runId,
                  artifactKey: "logical/other/dump.age",
                  sha256Hex: result.sha256Hex,
                }),
              ),
            };
          }
          return objectStore.getObject({ key });
        },
        verifyRemoteSha256: (input) => objectStore.verifyRemoteSha256(input),
      },
    });
    assert.equal(wrongArtifact.ok, false);
    assert.match(wrongArtifact.reason ?? "", /artifactKey/i);

    const wrongSha = await reconcileLocalCompleteMarker({
      evidenceDir,
      runId,
      objectStore: {
        getObject: async ({ key }) => {
          if (key.endsWith("/COMPLETE")) {
            return {
              body: Buffer.from(
                JSON.stringify({
                  runId,
                  artifactKey: result.artifactKey,
                  sha256Hex: "0".repeat(64),
                }),
              ),
            };
          }
          return objectStore.getObject({ key });
        },
        verifyRemoteSha256: (input) => objectStore.verifyRemoteSha256(input),
      },
    });
    assert.equal(wrongSha.ok, false);
    assert.match(wrongSha.reason ?? "", /sha256/i);

    await objectStore.putObject({ key: result.artifactKey, body: Buffer.from("TAMPERED-ARTIFACT") });
    const tampered = await reconcileLocalCompleteMarker({ evidenceDir, runId, objectStore });
    assert.equal(tampered.ok, false);
    assert.match(tampered.reason ?? "", /mismatch|tamper|SHA/i);

    // Restore matching artifact + COMPLETE, then wipe evidence → missing precomplete.
    await objectStore.putObject({
      key: result.artifactKey,
      body: Buffer.concat([Buffer.from("AGEENC:"), Buffer.from("PGDUMP-FC-FAKE")]),
    });
    await objectStore.putObject({
      key: result.completeKey,
      body: Buffer.from(
        JSON.stringify({
          runId,
          artifactKey: result.artifactKey,
          sha256Hex: result.sha256Hex,
        }),
      ),
    });
    rmSync(path.join(evidenceDir, runId), { recursive: true, force: true });
    const missingPre = await reconcileLocalCompleteMarker({ evidenceDir, runId, objectStore });
    assert.equal(missingPre.ok, false);
    assert.match(missingPre.reason ?? "", /pre-COMPLETE|evidence missing/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("retention prunes COMPLETE runs only and refuses coverage-destroying prune", async () => {
  const { root, storeRoot } = tempDirs();
  try {
    const objectStore = createLocalObjectStore({ localRoot: storeRoot });
    const oldId = generateRunId({ now: new Date(Date.UTC(2026, 0, 1)), randomHex: "1111111111111111" });
    const newId = generateRunId({ now: new Date(Date.UTC(2026, 8, 19)), randomHex: "2222222222222222" });
    for (const runId of [oldId, newId]) {
      await objectStore.putObject({ key: `logical/${runId}/dump.age`, body: Buffer.from("x") });
      await objectStore.putObject({
        key: `logical/${runId}/COMPLETE`,
        body: Buffer.from(JSON.stringify({ runId })),
      });
    }
    // Incomplete run without COMPLETE must not be listed.
    await objectStore.putObject({
      key: `logical/${generateRunId({ now: new Date(Date.UTC(2026, 0, 2)), randomHex: "3333333333333333" })}/dump.age`,
      body: Buffer.from("incomplete"),
    });

    const listed = await listCompleteRuns({ objectStore });
    assert.equal(listed.length, 2);

    const pruned = await pruneExpiredCompleteRuns({
      objectStore,
      now: new Date(Date.UTC(2026, 8, 20)),
      retentionDays: 35,
    });
    assert.equal(pruned.ok, true);
    assert.deepEqual(pruned.deleted, [oldId]);
    const after = await listCompleteRuns({ objectStore });
    assert.equal(after.length, 1);
    assert.equal(after[0].runId, newId);

    // Only expired remain → deleting them would leave zero COMPLETE coverage → BLOCKED
    const onlyOldRoot = mkdtempSync(path.join(os.tmpdir(), "boba-layer2-only-"));
    try {
      const onlyStore = createLocalObjectStore({ localRoot: onlyOldRoot });
      await onlyStore.putObject({ key: `logical/${oldId}/dump.age`, body: Buffer.from("x") });
      await onlyStore.putObject({ key: `logical/${oldId}/COMPLETE`, body: Buffer.from("{}") });
      const blocked = await pruneExpiredCompleteRuns({
        objectStore: onlyStore,
        now: new Date(Date.UTC(2026, 8, 20)),
        retentionDays: 35,
      });
      assert.equal(blocked.ok, false);
      assert.equal(blocked.status, OPERATION_STATUS.BLOCKED);
      const still = await listCompleteRuns({ objectStore: onlyStore });
      assert.equal(still.length, 1);
    } finally {
      rmSync(onlyOldRoot, { recursive: true, force: true });
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
