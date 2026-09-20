/**
 * Layer 1 PITR restore to a fresh uniquely identified target.
 * Fail closed. Never restores into source / production PGDATA.
 */
import { spawnSync } from "node:child_process";
import { OPERATION_STATUS, OPERATION_TYPE, RECOVERY_LAYER } from "../constants.mjs";
import { createEvidence } from "../evidence.mjs";
import { generateRunId } from "../run-id.mjs";
import { persistEvidence } from "../store.mjs";
import { redactText } from "../redact.mjs";
import { assertFreshTarget, createRestoreTargetId } from "./target.mjs";

/**
 * @param {object} options
 * @param {{ type: "time"|"lsn"|"name", value: string }} options.target
 * @param {string} options.sourceIdentity
 * @param {string} [options.targetIdentity]
 * @param {string} [options.sourceClassification]
 * @param {string} [options.targetPgdataPath]
 * @param {string} [options.evidenceDir]
 * @param {string} [options.stanza]
 * @param {Function} [options.execFn]
 * @param {boolean} [options.forceProduction]
 * @param {Date} [options.now]
 */
export async function runPitrRestore(options) {
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
    reuseExistingTarget: options.reuseExistingTarget,
  });
  if (!fresh.ok) {
    return fail(options, runId, startedAt, targetIdentity, fresh.reason, fresh.code);
  }

  const target = options.target;
  if (!target || !["time", "lsn", "name"].includes(target.type) || typeof target.value !== "string" || !target.value.trim()) {
    return fail(options, runId, startedAt, targetIdentity, "PITR target must be time, lsn, or name with a non-empty value");
  }

  if (!options.targetPgdataPath || typeof options.targetPgdataPath !== "string" || !options.targetPgdataPath.trim()) {
    return fail(
      options,
      runId,
      startedAt,
      targetIdentity,
      "isolated --target-pgdata is required for PITR; refusing stanza default PGDATA (active source)",
      "TARGET_PGDATA_REQUIRED",
    );
  }

  if (options.sourcePgdataPath && options.targetPgdataPath && options.sourcePgdataPath === options.targetPgdataPath) {
    return fail(options, runId, startedAt, targetIdentity, "PITR must never target source PGDATA");
  }

  const stanza = options.stanza ?? "boba";
  const typeFlag =
    target.type === "time"
      ? `--type=time`
      : target.type === "lsn"
        ? `--type=lsn`
        : `--type=name`;
  const targetFlag =
    target.type === "time"
      ? `--target=${target.value}`
      : target.type === "lsn"
        ? `--target=${target.value}`
        : `--target=${target.value}`;

  const execFn =
    options.execFn ??
    ((command, args) => {
      const result = spawnSync(command, args, { encoding: "utf8" });
      return {
        status: typeof result.status === "number" ? result.status : 1,
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
      };
    });

  const restoreResult = execFn("pgbackrest", [
    `--stanza=${stanza}`,
    "restore",
    typeFlag,
    targetFlag,
    `--pg1-path=${options.targetPgdataPath}`,
  ]);
  if (restoreResult.status !== 0) {
    return fail(
      options,
      runId,
      startedAt,
      targetIdentity,
      redactText(restoreResult.stderr || `pgbackrest restore exited ${restoreResult.status}`),
    );
  }

  const endedAt = new Date().toISOString();
  const evidence = createEvidence({
    runId,
    operationType: OPERATION_TYPE.RESTORE_PITR,
    recoveryLayer: RECOVERY_LAYER.LAYER_1,
    status: OPERATION_STATUS.SUCCEEDED,
    startedAt,
    endedAt,
    sourceIdentityMarker: options.sourceIdentity,
    targetIdentityMarker: targetIdentity,
    recoveryPoint: target.value,
    findings: [{ code: "PITR_RESTORE", targetType: target.type }],
  });
  if (options.evidenceDir) persistEvidence(options.evidenceDir, evidence);
  return { ok: true, status: OPERATION_STATUS.SUCCEEDED, runId, targetIdentity, evidence };
}

function fail(options, runId, startedAt, targetIdentity, reason, code) {
  const evidence = createEvidence({
    runId,
    operationType: OPERATION_TYPE.RESTORE_PITR,
    recoveryLayer: RECOVERY_LAYER.LAYER_1,
    status: OPERATION_STATUS.FAILED,
    startedAt,
    endedAt: new Date().toISOString(),
    sourceIdentityMarker: options.sourceIdentity ?? null,
    targetIdentityMarker: targetIdentity,
    failureBlockReason: redactText(reason),
    findings: [{ code: code ?? "PITR_RESTORE_FAILED", detail: redactText(reason) }],
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
