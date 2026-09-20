/**
 * Layer 1 physical backup runner (full / differential) with heavy flock + evidence.
 */
import {
  CHECKSUM_INTEGRITY_STATUS,
  OPERATION_STATUS,
  OPERATION_TYPE,
  RECOVERY_LAYER,
} from "../constants.mjs";
import { createEvidence } from "../evidence.mjs";
import { withHeavyOpLock } from "../flock.mjs";
import { generateRunId } from "../run-id.mjs";
import { persistEvidence } from "../store.mjs";
import { redactText } from "../redact.mjs";
import { backupDiff, backupFull, buildLayer1HealthProof, info, verify } from "./pgbackrest.mjs";

/**
 * @param {object} options
 * @param {"full"|"diff"} options.type
 * @param {string} options.evidenceDir
 * @param {string|number} options.repositoryGeneration
 * @param {string} [options.keyVersion]
 * @param {string} [options.stanza]
 * @param {object} [options.candidate]
 * @param {string} [options.sourceIdentity]
 * @param {string} [options.sourceClassification]
 * @param {string} [options.lockPath]
 * @param {boolean} [options.skipLock]
 * @param {Function} [options.execFn]
 * @param {Function} [options.withHeavyOpLock]
 * @param {Date} [options.now]
 */
export async function runLayer1Backup(options) {
  const type = options?.type === "diff" ? "diff" : options?.type === "full" ? "full" : null;
  if (!type) {
    return { ok: false, status: OPERATION_STATUS.FAILED, reason: "type must be full or diff" };
  }
  const runId = options.runId ?? generateRunId({ now: options.now });
  const startedAt = (options.now instanceof Date ? options.now : new Date()).toISOString();

  const execute = async () => {
    const backupResult = type === "full"
      ? backupFull({ stanza: options.stanza, execFn: options.execFn, env: options.env })
      : backupDiff({ stanza: options.stanza, execFn: options.execFn, env: options.env });
    if (!backupResult.ok) {
      return persistFailure(options, runId, startedAt, backupResult.reason ?? "pgBackRest backup failed");
    }

    const infoResult = info({ stanza: options.stanza, execFn: options.execFn, env: options.env });
    if (!infoResult.ok) {
      return persistFailure(options, runId, startedAt, infoResult.reason ?? "pgBackRest info failed");
    }

    // Default: run verify after backup so Layer 1 health proof includes PGBACKREST_VERIFY_OK.
    // Callers may set skipVerify=true (or verifyOk explicitly) for injectable/unit tests.
    let verifyOk = options.verifyOk === true;
    if (options.verifyOk !== true && options.skipVerify !== true) {
      const verifyResult = verify({ stanza: options.stanza, execFn: options.execFn, env: options.env });
      if (!verifyResult.ok) {
        return persistFailure(options, runId, startedAt, verifyResult.reason ?? "pgBackRest verify failed");
      }
      verifyOk = true;
    }

    const recoveryPoint = extractRecoveryPoint(infoResult.stdout) ?? startedAt;
    const proof = buildLayer1HealthProof({
      infoOutput: infoResult.stdout,
      verifyOk,
      recoveryPoint,
      repositoryGeneration: options.repositoryGeneration,
      keyVersion: options.keyVersion,
    });
    if (!proof.ok) {
      return persistFailure(options, runId, startedAt, proof.reason ?? "Layer 1 health proof incomplete");
    }

    const endedAt = new Date().toISOString();
    const evidence = createEvidence({
      runId,
      operationType: OPERATION_TYPE.LAYER1_BACKUP,
      recoveryLayer: RECOVERY_LAYER.LAYER_1,
      status: OPERATION_STATUS.SUCCEEDED,
      startedAt,
      endedAt,
      candidate: options.candidate ?? {},
      sourceEnvironmentClassification: options.sourceClassification ?? null,
      sourceIdentityMarker: options.sourceIdentity ?? null,
      recoveryPoint,
      recoveryArtifactReference: `repo-gen-${options.repositoryGeneration}`,
      checksumIntegrityStatus: CHECKSUM_INTEGRITY_STATUS.MATCHED,
      validationResults: proof.validationResults,
      findings: [
        {
          code: "LAYER1_BACKUP",
          type,
          repositoryGeneration: String(options.repositoryGeneration),
          keyVersion: options.keyVersion ?? `repo-gen-${options.repositoryGeneration}`,
        },
      ],
    });
    if (typeof options.evidenceDir === "string" && options.evidenceDir.length > 0) {
      persistEvidence(options.evidenceDir, evidence);
    }
    return {
      ok: true,
      status: OPERATION_STATUS.SUCCEEDED,
      runId,
      recoveryPoint,
      evidence,
    };
  };

  if (options.skipLock === true) {
    return execute();
  }

  const lockFn = options.withHeavyOpLock ?? withHeavyOpLock;
  const locked = await lockFn(
    {
      lockPath: options.lockPath,
      waitMs: 0,
      operation: `layer1-backup-${type}`,
    },
    execute,
  );
  if (locked.status === "SKIPPED_LOCK_HELD") {
    return {
      ok: false,
      status: OPERATION_STATUS.BLOCKED,
      runId,
      reason: locked.reason ?? "heavy op lock held",
    };
  }
  if (!locked.ok) {
    return {
      ok: false,
      status: OPERATION_STATUS.FAILED,
      runId,
      reason: locked.reason ?? "heavy op lock failed",
    };
  }
  return /** @type {any} */ (locked.result);
}

/**
 * @param {string} infoOutput
 * @returns {string | null}
 */
function extractRecoveryPoint(infoOutput) {
  const timestamp = /timestamp(?:\s+start)?[^0-9]*([0-9]{4}-[0-9]{2}-[0-9]{2}[ T][0-9:.]+Z?)/i.exec(
    infoOutput,
  );
  if (timestamp) return timestamp[1];
  const lsn = /\b([0-9A-F]+\/[0-9A-F]+)\b/.exec(infoOutput);
  if (lsn) return lsn[1];
  return null;
}

/**
 * @param {object} options
 * @param {string} runId
 * @param {string} startedAt
 * @param {string} reason
 */
function persistFailure(options, runId, startedAt, reason) {
  const evidence = createEvidence({
    runId,
    operationType: OPERATION_TYPE.LAYER1_BACKUP,
    recoveryLayer: RECOVERY_LAYER.LAYER_1,
    status: OPERATION_STATUS.FAILED,
    startedAt,
    endedAt: new Date().toISOString(),
    candidate: options.candidate ?? {},
    sourceEnvironmentClassification: options.sourceClassification ?? null,
    sourceIdentityMarker: options.sourceIdentity ?? null,
    failureBlockReason: redactText(reason),
    findings: [{ code: "LAYER1_BACKUP_FAILED", detail: redactText(reason) }],
  });
  if (typeof options.evidenceDir === "string" && options.evidenceDir.length > 0) {
    try {
      persistEvidence(options.evidenceDir, evidence);
    } catch {
      // ignore persistence races on failure path
    }
  }
  return {
    ok: false,
    status: OPERATION_STATUS.FAILED,
    runId,
    reason: redactText(reason),
    evidence,
  };
}
