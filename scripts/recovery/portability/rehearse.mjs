/**
 * Portability rehearsal: Layer 2 artifact → decrypt → pg_restore fresh PG18 → migrations → business validation.
 */
import {
  CHECKSUM_INTEGRITY_STATUS,
  OPERATION_STATUS,
  OPERATION_TYPE,
  RECOVERY_LAYER,
} from "../constants.mjs";
import { createEvidence } from "../evidence.mjs";
import { generateRunId } from "../run-id.mjs";
import { persistEvidence } from "../store.mjs";
import { redactText } from "../redact.mjs";
import { runLogicalRestore } from "../restore/logical.mjs";
import { createRestoreTargetId, assertFreshTarget } from "../restore/target.mjs";
import { runPostRestoreMigrations } from "../migrate/post-restore.mjs";
import { runBusinessIntegrityValidation } from "../validate/business-integrity.mjs";
import { evaluateProviderSuppression } from "../validate/isolation.mjs";

/**
 * @param {object} options
 */
export async function runPortabilityRehearsal(options) {
  const runId = options.runId ?? generateRunId({ now: options.now });
  const startedAt = (options.now instanceof Date ? options.now : new Date()).toISOString();
  const targetIdentity = options.targetIdentity ?? createRestoreTargetId(runId);

  const fresh = assertFreshTarget({
    sourceIdentity: options.sourceIdentity,
    targetIdentity,
    sourceClassification: options.sourceClassification,
    targetClassification: "recovery",
    forceProduction: options.forceProduction,
  });
  if (!fresh.ok) {
    return interrupt(options, runId, startedAt, targetIdentity, fresh.reason);
  }

  const suppression = evaluateProviderSuppression({
    env: options.env,
    networkIsolated: options.networkIsolated === true,
    productionDnsAbsent: options.productionDnsAbsent === true,
    productionCredentialsAbsent: options.productionCredentialsAbsent === true,
  });
  if (!suppression.ok) {
    return interrupt(options, runId, startedAt, targetIdentity, suppression.reason);
  }

  if (options.interruptBeforeRestore === true) {
    return interrupt(options, runId, startedAt, targetIdentity, "rehearsal interrupted before restore");
  }

  let restoreOk = false;
  let restoreReason = "logical restore not executed";
  if (typeof options.restoreStepFn === "function") {
    const step = await options.restoreStepFn({ runId, targetIdentity });
    restoreOk = step?.ok === true;
    restoreReason = step?.reason ?? restoreReason;
  } else if (options.objectStore && options.runIdToRestore && options.identityFile) {
    const nestedRunId = generateRunId({ now: options.now });
    const restored = await runLogicalRestore({
      runId: nestedRunId,
      runIdToRestore: options.runIdToRestore,
      objectStore: options.objectStore,
      identityFile: options.identityFile,
      sourceIdentity: options.sourceIdentity,
      targetIdentity,
      decryptFn: options.decryptFn,
      restoreFn: options.restoreFn,
      ageBin: options.ageBin,
    });
    restoreOk = restored.ok === true;
    restoreReason = restored.reason ?? restoreReason;
  } else {
    return interrupt(
      options,
      runId,
      startedAt,
      targetIdentity,
      "restoreStepFn or (objectStore + runIdToRestore + identityFile) is required",
    );
  }

  if (!restoreOk) {
    return interrupt(options, runId, startedAt, targetIdentity, restoreReason);
  }

  if (options.interruptAfterRestore === true) {
    return interrupt(options, runId, startedAt, targetIdentity, "rehearsal interrupted after restore");
  }

  const migrated = await runPostRestoreMigrations({
    migrateFn: options.migrateFn ?? (async () => ({ ok: true })),
    targetIdentity,
    sourceAuthoritative: true,
  });
  if (!migrated.ok) {
    return interrupt(options, runId, startedAt, targetIdentity, migrated.reason ?? "post-restore migration failed");
  }

  if (typeof options.queryFn !== "function") {
    return interrupt(options, runId, startedAt, targetIdentity, "queryFn is required for business validation");
  }

  const validation = await runBusinessIntegrityValidation({ queryFn: options.queryFn });
  if (!validation.ok) {
    return interrupt(
      options,
      runId,
      startedAt,
      targetIdentity,
      "business integrity validation failed",
      validation.results,
    );
  }

  const evidence = createEvidence({
    runId,
    operationType: OPERATION_TYPE.PORTABILITY_REHEARSAL,
    recoveryLayer: RECOVERY_LAYER.LAYER_2,
    status: OPERATION_STATUS.SUCCEEDED,
    startedAt,
    endedAt: new Date().toISOString(),
    sourceIdentityMarker: options.sourceIdentity,
    targetIdentityMarker: targetIdentity,
    recoveryArtifactReference: options.runIdToRestore
      ? `logical/${options.runIdToRestore}/dump.age`
      : null,
    recoveryPoint: options.runIdToRestore ?? startedAt,
    checksumIntegrityStatus: CHECKSUM_INTEGRITY_STATUS.MATCHED,
    validationResults: validation.results,
    findings: [{ code: "PORTABILITY_REHEARSAL_OK", targetIdentity }],
  });
  if (options.evidenceDir) persistEvidence(options.evidenceDir, evidence);
  return { ok: true, status: OPERATION_STATUS.SUCCEEDED, runId, targetIdentity, evidence, validation };
}

function interrupt(options, runId, startedAt, targetIdentity, reason, validationResults = []) {
  const evidence = createEvidence({
    runId,
    operationType: OPERATION_TYPE.PORTABILITY_REHEARSAL,
    recoveryLayer: RECOVERY_LAYER.LAYER_2,
    status: OPERATION_STATUS.FAILED,
    startedAt,
    endedAt: new Date().toISOString(),
    incomplete: false,
    sourceIdentityMarker: options.sourceIdentity ?? null,
    targetIdentityMarker: targetIdentity,
    failureBlockReason: redactText(reason),
    validationResults,
    findings: [{ code: "PORTABILITY_REHEARSAL_INTERRUPTED", detail: redactText(reason) }],
  });
  if (options.evidenceDir) {
    try {
      persistEvidence(options.evidenceDir, evidence);
    } catch {
      // ignore
    }
  }
  return {
    ok: false,
    status: OPERATION_STATUS.FAILED,
    runId,
    targetIdentity,
    reason: redactText(reason),
    evidence,
  };
}
