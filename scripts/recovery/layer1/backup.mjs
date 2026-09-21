/**
 * Layer 1 physical backup runner (full / differential) with heavy flock + evidence.
 *
 * Health proof path (fail closed):
 *   backup → pgbackrest check → info --output=json → derive recovery point → verify
 * Never substitutes wrapper/start/current time as a recovery point.
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
import {
  backupDiff,
  backupFull,
  buildLayer1HealthProof,
  check,
  info,
  parsePgbackrestInfoJson,
  verify,
} from "./pgbackrest.mjs";

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
    const pgOptions = layer1PgbackrestOptions(options);
    const backupResult = type === "full" ? backupFull(pgOptions) : backupDiff(pgOptions);
    if (!backupResult.ok) {
      return persistFailure(options, runId, startedAt, backupResult.reason ?? "pgBackRest backup failed");
    }

    const checkResult = check(pgOptions);
    if (!checkResult.ok) {
      return persistFailure(options, runId, startedAt, checkResult.reason ?? "pgBackRest check failed");
    }

    const infoResult = info(pgOptions);
    if (!infoResult.ok) {
      return persistFailure(options, runId, startedAt, infoResult.reason ?? "pgBackRest info failed");
    }

    const parsedPoint = parsePgbackrestInfoJson(infoResult.stdout);
    if (!parsedPoint.ok) {
      return persistFailure(
        options,
        runId,
        startedAt,
        parsedPoint.reason ?? "unable to derive recovery point from pgBackRest info JSON",
      );
    }

    // Default: run verify after backup so Layer 1 health proof includes PGBACKREST_VERIFY_OK.
    // Callers may set skipVerify=true only for injectable unit tests that still fail closed
    // unless verifyOk is explicitly forced true AND all other proofs are present.
    let verifyOk = options.verifyOk === true;
    if (options.verifyOk !== true && options.skipVerify !== true) {
      const verifyResult = verify(pgOptions);
      if (!verifyResult.ok) {
        return persistFailure(options, runId, startedAt, verifyResult.reason ?? "pgBackRest verify failed");
      }
      verifyOk = true;
    }
    if (!verifyOk) {
      return persistFailure(options, runId, startedAt, "pgBackRest verify is required for Layer 1 health proof");
    }

    const recoveryPoint = parsedPoint.recoveryPoint;
    const proof = buildLayer1HealthProof({
      checkOk: true,
      infoOutput: infoResult.stdout,
      verifyOk: true,
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
          recoveryPointSource: parsedPoint.source,
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
 * Same fields for every Layer 1 pgBackRest invocation in one backup run.
 * @param {object} options
 */
function layer1PgbackrestOptions(options) {
  return {
    stanza: options.stanza,
    execFn: options.execFn,
    env: options.env,
    containerCli: options.containerCli,
    composeFile: options.composeFile,
    cwd: options.cwd,
    composeExecFn: options.composeExecFn,
    service: options.service,
  };
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
