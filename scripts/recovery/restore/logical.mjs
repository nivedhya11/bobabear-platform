/**
 * Layer 2 logical restore: download COMPLETE artifact only → age decrypt → pg_restore to fresh target.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { OPERATION_STATUS, OPERATION_TYPE, RECOVERY_LAYER } from "../constants.mjs";
import { createEvidence } from "../evidence.mjs";
import { decryptFromAge } from "../layer2/age.mjs";
import { generateRunId, isValidRunId } from "../run-id.mjs";
import { persistEvidence } from "../store.mjs";
import { redactText } from "../redact.mjs";
import { assertFreshTarget, createRestoreTargetId } from "./target.mjs";

/**
 * @param {object} options
 * @param {string} options.runIdToRestore
 * @param {{ getObject: Function, headObject?: Function }} options.objectStore
 * @param {string} options.identityFile
 * @param {string} options.sourceIdentity
 * @param {string} [options.targetIdentity]
 * @param {string} [options.evidenceDir]
 * @param {Function} [options.restoreFn]
 * @param {Function} [options.decryptFn]
 * @param {Date} [options.now]
 */
export async function runLogicalRestore(options) {
  const runId = options.runId ?? generateRunId({ now: options.now });
  const startedAt = (options.now instanceof Date ? options.now : new Date()).toISOString();
  const targetIdentity = options.targetIdentity ?? createRestoreTargetId(runId);

  const fresh = assertFreshTarget({
    sourceIdentity: options.sourceIdentity,
    targetIdentity,
    sourceClassification: options.sourceClassification,
    targetClassification: "recovery",
    targetPgdataPath: options.targetPgdataPath,
    forceProduction: options.forceProduction,
  });
  if (!fresh.ok) {
    return fail(options, runId, startedAt, targetIdentity, fresh.reason);
  }

  const sourceRunId = options.runIdToRestore;
  if (!isValidRunId(sourceRunId)) {
    return fail(options, runId, startedAt, targetIdentity, "runIdToRestore must be a valid RUN_ID");
  }

  const completeKey = `logical/${sourceRunId}/COMPLETE`;
  const artifactKey = `logical/${sourceRunId}/dump.age`;

  if (typeof options.objectStore?.headObject === "function") {
    const head = await options.objectStore.headObject({ key: completeKey });
    if (!head?.exists) {
      return fail(options, runId, startedAt, targetIdentity, "COMPLETE marker missing; refuse incomplete Layer 2 artifact");
    }
  } else {
    try {
      await options.objectStore.getObject({ key: completeKey });
    } catch {
      return fail(options, runId, startedAt, targetIdentity, "COMPLETE marker missing; refuse incomplete Layer 2 artifact");
    }
  }

  const remote = await options.objectStore.getObject({ key: artifactKey });
  const ciphertext = Buffer.isBuffer(remote.body) ? remote.body : Buffer.from(String(remote.body ?? ""), "utf8");

  let plaintext;
  if (typeof options.decryptFn === "function") {
    const decrypted = await options.decryptFn({ ciphertext, identityFile: options.identityFile });
    if (!decrypted?.ok || !decrypted.plaintext) {
      return fail(options, runId, startedAt, targetIdentity, decrypted?.reason ?? "age decrypt failed");
    }
    plaintext = decrypted.plaintext;
  } else {
    const decrypted = await decryptFromAge({
      ciphertext,
      identityFile: options.identityFile,
      ageBin: options.ageBin,
    });
    if (!decrypted.ok) {
      return fail(options, runId, startedAt, targetIdentity, decrypted.reason);
    }
    plaintext = decrypted.plaintext;
  }

  const dumpPath = path.join(tmpdir(), `boba-restore-${runId}.dump`);
  writeFileSync(dumpPath, plaintext);
  try {
    const restoreFn =
      options.restoreFn ??
      ((filePath) => {
        const result = spawnSync("pg_restore", ["-d", options.databaseUrl ?? "postgresql://localhost/postgres", filePath], {
          encoding: "utf8",
        });
        return {
          ok: result.status === 0,
          reason: result.status === 0 ? undefined : redactText(result.stderr || `pg_restore exited ${result.status}`),
        };
      });
    const restored = await restoreFn(dumpPath);
    if (!restored?.ok) {
      return fail(options, runId, startedAt, targetIdentity, restored?.reason ?? "pg_restore failed");
    }
  } finally {
    try {
      if (existsSync(dumpPath)) unlinkSync(dumpPath);
    } catch {
      // ignore
    }
  }

  const evidence = createEvidence({
    runId,
    operationType: OPERATION_TYPE.RESTORE_LOGICAL,
    recoveryLayer: RECOVERY_LAYER.LAYER_2,
    status: OPERATION_STATUS.SUCCEEDED,
    startedAt,
    endedAt: new Date().toISOString(),
    sourceIdentityMarker: options.sourceIdentity,
    targetIdentityMarker: targetIdentity,
    recoveryArtifactReference: artifactKey,
    recoveryPoint: sourceRunId,
    findings: [{ code: "LOGICAL_RESTORE", completeKey, artifactKey }],
  });
  if (options.evidenceDir) persistEvidence(options.evidenceDir, evidence);
  return { ok: true, status: OPERATION_STATUS.SUCCEEDED, runId, targetIdentity, evidence };
}

function fail(options, runId, startedAt, targetIdentity, reason) {
  const evidence = createEvidence({
    runId,
    operationType: OPERATION_TYPE.RESTORE_LOGICAL,
    recoveryLayer: RECOVERY_LAYER.LAYER_2,
    status: OPERATION_STATUS.FAILED,
    startedAt,
    endedAt: new Date().toISOString(),
    sourceIdentityMarker: options.sourceIdentity ?? null,
    targetIdentityMarker: targetIdentity,
    failureBlockReason: redactText(reason),
  });
  if (options.evidenceDir) {
    try {
      persistEvidence(options.evidenceDir, evidence);
    } catch {
      // ignore
    }
  }
  return { ok: false, status: OPERATION_STATUS.FAILED, runId, targetIdentity, reason: redactText(reason), evidence };
}
