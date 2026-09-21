/**
 * Portability rehearsal: Layer 2 artifact → decrypt → fresh PG18 → pg_restore →
 * existing migration authority → business validation against THAT SAME target.
 *
 * Missing migration authority FAILS CLOSED (never defaults to success).
 * Injected restoreFn/queryFn/migrateFn remain appropriate for unit tests only.
 */
import { spawnSync } from "node:child_process";
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
import { cleanupProvisionedTarget } from "../restore/provision.mjs";
import { createRestoreTargetId, assertFreshTarget } from "../restore/target.mjs";
import { runPostRestoreMigrations } from "../migrate/post-restore.mjs";
import {
  assertMigrationAuthorityPresent,
  createExistingMigrationAuthority,
} from "../migrate/authority.mjs";
import { runBusinessIntegrityValidation } from "../validate/business-integrity.mjs";
import { evaluateProviderSuppression } from "../validate/isolation.mjs";

/**
 * @param {object} options
 */
export async function runPortabilityRehearsal(options) {
  const runId = options.runId ?? generateRunId({ now: options.now });
  const startedAt = (options.now instanceof Date ? options.now : new Date()).toISOString();
  let targetIdentity = options.targetIdentity ?? createRestoreTargetId(runId);

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

  /** @type {import("../restore/provision.mjs").ProvisionedLogicalTarget | null} */
  let provisioned = null;
  let restoreOk = false;
  let restoreReason = "logical restore not executed";
  let databaseUrl = typeof options.databaseUrl === "string" ? options.databaseUrl.trim() : "";

  if (typeof options.restoreStepFn === "function") {
    const step = await options.restoreStepFn({ runId, targetIdentity });
    restoreOk = step?.ok === true;
    restoreReason = step?.reason ?? restoreReason;
    if (typeof step?.databaseUrl === "string") databaseUrl = step.databaseUrl;
    if (step?.provisioned) provisioned = step.provisioned;
    if (typeof step?.targetIdentity === "string" && step.targetIdentity.trim()) {
      targetIdentity = step.targetIdentity.trim();
    }
  } else if (options.objectStore && options.runIdToRestore && options.identityFile) {
    const nestedRunId = generateRunId({ now: options.now });
    const restored = await runLogicalRestore({
      runId: nestedRunId,
      runIdToRestore: options.runIdToRestore,
      objectStore: options.objectStore,
      identityFile: options.identityFile,
      sourceIdentity: options.sourceIdentity,
      sourceClassification: options.sourceClassification,
      sourceDatabaseUrl: options.sourceDatabaseUrl,
      targetIdentity,
      databaseUrl: databaseUrl || undefined,
      // Default production path provisions a fresh PG18 target when no URL/restoreFn given.
      provisionTarget: options.provisionTarget !== false && !databaseUrl && !options.restoreFn,
      decryptFn: options.decryptFn,
      restoreFn: options.restoreFn,
      ageBin: options.ageBin,
      image: options.image,
      containerExecFn: options.containerExecFn,
      forceProduction: false,
    });
    restoreOk = restored.ok === true;
    restoreReason = restored.reason ?? restoreReason;
    if (restored.databaseUrl) databaseUrl = restored.databaseUrl;
    if (restored.provisioned) provisioned = restored.provisioned;
    if (restored.targetIdentity) {
      // Authoritative target identity is the actual restored/provisioned target —
      // never retain an outer synthetic label as evidence/migration/cleanup authority.
      targetIdentity = restored.targetIdentity;
    }
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
    if (provisioned) cleanupProvisionedTarget(provisioned);
    return interrupt(options, runId, startedAt, targetIdentity, restoreReason);
  }

  if (options.interruptAfterRestore === true) {
    if (provisioned) cleanupProvisionedTarget(provisioned);
    return interrupt(options, runId, startedAt, targetIdentity, "rehearsal interrupted after restore");
  }

  // Migration authority: injected migrateFn for unit tests only; production path uses existing authority.
  let migrateFn = options.migrateFn;
  if (typeof migrateFn !== "function") {
    const present = assertMigrationAuthorityPresent();
    if (!present.ok) {
      if (provisioned) cleanupProvisionedTarget(provisioned);
      return interrupt(options, runId, startedAt, targetIdentity, present.reason);
    }
    const migrationUrl =
      (typeof options.migrationDatabaseUrl === "string" && options.migrationDatabaseUrl.trim()) ||
      (typeof provisioned?.migratorDatabaseUrl === "string" && provisioned.migratorDatabaseUrl.trim()) ||
      databaseUrl;
    if (!migrationUrl) {
      if (provisioned) cleanupProvisionedTarget(provisioned);
      return interrupt(
        options,
        runId,
        startedAt,
        targetIdentity,
        "fresh target databaseUrl required to invoke existing migration authority",
      );
    }
    migrateFn = createExistingMigrationAuthority({
      databaseUrl: migrationUrl,
      env: options.env,
      execFn: options.migrateExecFn,
    });
  }

  const migrated = await runPostRestoreMigrations({
    migrateFn,
    targetIdentity,
    sourceAuthoritative: true,
  });
  if (!migrated.ok) {
    if (provisioned) cleanupProvisionedTarget(provisioned);
    return interrupt(options, runId, startedAt, targetIdentity, migrated.reason ?? "post-restore migration failed");
  }

  let queryFn = options.queryFn;
  if (typeof queryFn !== "function") {
    if (!databaseUrl && !provisioned?.containerName) {
      if (provisioned) cleanupProvisionedTarget(provisioned);
      return interrupt(options, runId, startedAt, targetIdentity, "queryFn or target databaseUrl required for business validation");
    }
    queryFn = createTargetQueryFn(databaseUrl, options.env, provisioned);
  }

  const validation = await runBusinessIntegrityValidation({ queryFn });
  if (!validation.ok) {
    if (provisioned) cleanupProvisionedTarget(provisioned);
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
    recoveryPoint: options.runIdToRestore ?? null,
    checksumIntegrityStatus: CHECKSUM_INTEGRITY_STATUS.MATCHED,
    validationResults: validation.results,
    findings: [
      {
        code: "PORTABILITY_REHEARSAL_OK",
        targetIdentity,
        volumeOrPathId: provisioned?.volumeOrPathId ?? null,
        databaseUrlBound: Boolean(databaseUrl),
      },
    ],
  });
  if (options.evidenceDir) persistEvidence(options.evidenceDir, evidence);

  // Cleanup run-owned disposable target after successful evidence persistence unless caller retains it.
  if (provisioned && options.retainTarget !== true) {
    cleanupProvisionedTarget(provisioned);
  }

  return {
    ok: true,
    status: OPERATION_STATUS.SUCCEEDED,
    runId,
    targetIdentity,
    databaseUrl: databaseUrl || null,
    provisioned: options.retainTarget === true ? provisioned : null,
    evidence,
    validation,
  };
}

/**
 * @param {string} databaseUrl
 * @param {NodeJS.ProcessEnv} [env]
 * @param {import("../restore/provision.mjs").ProvisionedLogicalTarget | null} [provisioned]
 */
function createTargetQueryFn(databaseUrl, env, provisioned = null) {
  return async (sql, params = []) => {
    let text = sql;
    for (let i = 0; i < params.length; i += 1) {
      const value = params[i];
      const literal =
        typeof value === "number" ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
      text = text.replace(`$${i + 1}`, literal);
    }

    /** @type {{ status: number | null, stdout?: string, stderr?: string, error?: Error }} */
    let result;
    if (provisioned?.containerName && provisioned?.containerCli) {
      result = spawnSync(
        provisioned.containerCli,
        [
          "exec",
          provisioned.containerName,
          "psql",
          "-U",
          "boba_recovery",
          "-d",
          "boba_recovery",
          "-v",
          "ON_ERROR_STOP=1",
          "-t",
          "-A",
          "-F",
          ",",
          "-c",
          text,
        ],
        { encoding: "utf8", env: env ?? process.env, timeout: 60_000 },
      );
    } else {
      result = spawnSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-t", "-A", "-F", ",", "-c", text], {
        encoding: "utf8",
        env: env ?? process.env,
        timeout: 60_000,
      });
    }
    if (result.error && /ENOENT/i.test(String(result.error.message ?? result.error))) {
      throw new Error("psql unavailable on host and no provisioned container query path");
    }
    if (result.status !== 0) {
      throw new Error(redactText(result.stderr || `psql exited ${result.status}`));
    }
    const lines = String(result.stdout ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return [];
    if (/^\d+$/.test(lines[0])) {
      return [{ count: Number(lines[0]) }];
    }
    return lines.map((line) => ({ ok: line }));
  };
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
