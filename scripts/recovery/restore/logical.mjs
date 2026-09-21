/**
 * Layer 2 logical restore: download COMPLETE artifact only → age decrypt → pg_restore to fresh target.
 *
 * Prefer repository-provisioned disposable PostgreSQL 18 targets.
 * External --database-url requires a provisioner-issued ownership descriptor and a
 * resolved source endpoint. Arbitrary URLs without positive ownership proof are BLOCKED.
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
import {
  assertOwnedLogicalTarget,
  cleanupProvisionedTarget,
  provisionLogicalTarget,
  targetEvidenceFields,
} from "./provision.mjs";
import { assertFreshTarget, createRestoreTargetId } from "./target.mjs";

/**
 * @param {object} options
 * @param {string} options.runIdToRestore
 * @param {{ getObject: Function, headObject?: Function }} options.objectStore
 * @param {string} options.identityFile
 * @param {string} options.sourceIdentity
 * @param {string} [options.targetIdentity]
 * @param {string} [options.databaseUrl]
 * @param {string} [options.sourceDatabaseUrl]
 * @param {object | string} [options.targetOwnership]
 * @param {boolean} [options.provisionTarget]
 * @param {string} [options.evidenceDir]
 * @param {Function} [options.restoreFn]
 * @param {Function} [options.decryptFn]
 * @param {Date} [options.now]
 */
export async function runLogicalRestore(options) {
  const runId = options.runId ?? generateRunId({ now: options.now });
  const startedAt = (options.now instanceof Date ? options.now : new Date()).toISOString();

  /** @type {import("./provision.mjs").ProvisionedLogicalTarget | null} */
  let provisioned = null;
  let targetIdentity = options.targetIdentity ?? createRestoreTargetId(runId);
  let databaseUrl = typeof options.databaseUrl === "string" ? options.databaseUrl.trim() : "";

  const shouldProvision = options.provisionTarget === true || (!databaseUrl && !options.restoreFn);
  if (shouldProvision && !options.restoreFn) {
    const provisionedResult = await provisionLogicalTarget({
      runId,
      sourceIdentity: options.sourceIdentity,
      sourceClassification: options.sourceClassification,
      sourceDatabaseUrl: options.sourceDatabaseUrl,
      image: options.image,
      execFn: options.containerExecFn,
    });
    if (!provisionedResult.ok) {
      return fail(options, runId, startedAt, targetIdentity, provisionedResult.reason);
    }
    provisioned = provisionedResult.target;
    targetIdentity = provisioned.targetIdentity;
    databaseUrl = provisioned.databaseUrl;
  } else if (databaseUrl) {
    const owned = assertOwnedLogicalTarget({
      runId,
      databaseUrl,
      sourceDatabaseUrl: options.sourceDatabaseUrl,
      ownershipDescriptor: options.targetOwnership,
      targetIdentity: options.targetIdentity,
      sourceIdentity: options.sourceIdentity,
      sourceClassification: options.sourceClassification,
    });
    if (!owned.ok) {
      return fail(options, runId, startedAt, targetIdentity, owned.reason);
    }
    targetIdentity = owned.targetIdentity;
  } else if (options.restoreFn) {
    // Injected restoreFn is a unit/integration seam only — still refuse production force.
    const fresh = assertFreshTarget({
      sourceIdentity: options.sourceIdentity,
      targetIdentity,
      sourceClassification: options.sourceClassification,
      targetClassification: "recovery",
      forceProduction: options.forceProduction,
    });
    if (!fresh.ok) {
      return fail(options, runId, startedAt, targetIdentity, fresh.reason);
    }
  }

  const sourceRunId = options.runIdToRestore;
  if (!isValidRunId(sourceRunId)) {
    if (provisioned) await cleanupProvisionedTarget(provisioned);
    return fail(options, runId, startedAt, targetIdentity, "runIdToRestore must be a valid RUN_ID");
  }

  const completeKey = `logical/${sourceRunId}/COMPLETE`;
  const artifactKey = `logical/${sourceRunId}/dump.age`;

  if (typeof options.objectStore?.headObject === "function") {
    const head = await options.objectStore.headObject({ key: completeKey });
    if (!head?.exists) {
      if (provisioned) await cleanupProvisionedTarget(provisioned);
      return fail(options, runId, startedAt, targetIdentity, "COMPLETE marker missing; refuse incomplete Layer 2 artifact");
    }
  } else {
    try {
      await options.objectStore.getObject({ key: completeKey });
    } catch {
      if (provisioned) await cleanupProvisionedTarget(provisioned);
      return fail(options, runId, startedAt, targetIdentity, "COMPLETE marker missing; refuse incomplete Layer 2 artifact");
    }
  }

  const remote = await options.objectStore.getObject({ key: artifactKey });
  const ciphertext = Buffer.isBuffer(remote.body) ? remote.body : Buffer.from(String(remote.body ?? ""), "utf8");

  let plaintext;
  if (typeof options.decryptFn === "function") {
    const decrypted = await options.decryptFn({ ciphertext, identityFile: options.identityFile });
    if (!decrypted?.ok || !decrypted.plaintext) {
      if (provisioned) await cleanupProvisionedTarget(provisioned);
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
      if (provisioned) await cleanupProvisionedTarget(provisioned);
      return fail(options, runId, startedAt, targetIdentity, decrypted.reason);
    }
    plaintext = decrypted.plaintext;
  }

  if (!options.restoreFn && !databaseUrl) {
    if (provisioned) await cleanupProvisionedTarget(provisioned);
    return fail(
      options,
      runId,
      startedAt,
      targetIdentity,
      "logical restore requires a provisioned fresh recovery database (or owned --database-url with ownership descriptor)",
    );
  }

  if (databaseUrl && isForbiddenActiveDatabaseUrl(databaseUrl)) {
    if (provisioned) await cleanupProvisionedTarget(provisioned);
    return fail(
      options,
      runId,
      startedAt,
      targetIdentity,
      "databaseUrl resolves to a forbidden active/default endpoint; refuse restore",
    );
  }

  const dumpPath = path.join(tmpdir(), `boba-restore-${runId}.dump`);
  writeFileSync(dumpPath, plaintext);
  try {
    const restoreFn =
      options.restoreFn ??
      ((filePath) => {
        // Prefer in-container restore against a provisioned disposable target
        // when host pg_restore is absent (common on agent workstations).
        if (provisioned?.containerName && provisioned?.containerCli) {
          const remoteDump = `/tmp/boba-restore-${runId}.dump`;
          const copy = spawnSync(
            provisioned.containerCli,
            ["cp", filePath, `${provisioned.containerName}:${remoteDump}`],
            { encoding: "utf8", timeout: 120_000 },
          );
          if (copy.status !== 0) {
            return {
              ok: false,
              reason: redactText(copy.stderr || "failed to copy dump into recovery target container"),
            };
          }
          // Prefer migrator role when provisioned so restored objects are owned by the
          // same repository migration authority used for post-restore migrate.ts.
          let restoreUser = "boba_recovery";
          let restorePassword = null;
          if (typeof provisioned.migratorDatabaseUrl === "string" && provisioned.migratorDatabaseUrl.trim()) {
            try {
              const parsed = new URL(provisioned.migratorDatabaseUrl);
              if (parsed.username) restoreUser = decodeURIComponent(parsed.username);
              if (parsed.password) restorePassword = decodeURIComponent(parsed.password);
            } catch {
              // keep boba_recovery fallback
            }
          }
          const execEnv = ["exec"];
          if (restorePassword) {
            execEnv.push("-e", `PGPASSWORD=${restorePassword}`);
          }
          execEnv.push(
            provisioned.containerName,
            "pg_restore",
            "-U",
            restoreUser,
            "-d",
            "boba_recovery",
            "--exit-on-error",
            "--clean",
            "--if-exists",
            "--no-owner",
            "--no-acl",
            remoteDump,
          );
          const result = spawnSync(provisioned.containerCli, execEnv, {
            encoding: "utf8",
            timeout: 300_000,
          });
          return evaluatePgRestoreResult(result);
        }
        const result = spawnSync(
          "pg_restore",
          ["-d", databaseUrl, "--exit-on-error", "--clean", "--if-exists", filePath],
          {
            encoding: "utf8",
          },
        );
        return evaluatePgRestoreResult(result);
      });
    const restored = await restoreFn(dumpPath);
    if (!restored?.ok) {
      if (provisioned) await cleanupProvisionedTarget(provisioned);
      return fail(options, runId, startedAt, targetIdentity, restored?.reason ?? "pg_restore failed");
    }
  } finally {
    try {
      if (existsSync(dumpPath)) unlinkSync(dumpPath);
    } catch {
      // ignore
    }
  }

  const provisionFields = provisioned ? targetEvidenceFields(provisioned) : { findings: [] };
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
    findings: [
      {
        code: "LOGICAL_RESTORE",
        completeKey,
        artifactKey,
        volumeOrPathId: provisioned?.volumeOrPathId ?? null,
      },
      ...(provisionFields.findings ?? []),
    ],
  });
  if (options.evidenceDir) persistEvidence(options.evidenceDir, evidence);
  return {
    ok: true,
    status: OPERATION_STATUS.SUCCEEDED,
    runId,
    targetIdentity,
    databaseUrl: databaseUrl || null,
    provisioned,
    evidence,
  };
}

/**
 * Process exit status is authoritative for pg_restore.
 * status == 0 → success; every nonzero status → failure.
 * Never infer restore success from stderr wording (WARNING / ERROR / FATAL).
 *
 * @param {{ status?: number | null, stdout?: string, stderr?: string }} result
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function evaluatePgRestoreResult(result) {
  const status = typeof result?.status === "number" ? result.status : 1;
  if (status === 0) {
    return { ok: true };
  }
  const errText = String(result?.stderr || result?.stdout || "");
  return {
    ok: false,
    reason: redactText(errText || `pg_restore exited ${status}`),
  };
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

/**
 * @param {string} databaseUrl
 * @returns {boolean}
 */
function isForbiddenActiveDatabaseUrl(databaseUrl) {
  const normalized = databaseUrl.trim().toLowerCase();
  if (!normalized) return true;
  // Fail closed on ambiguous localhost defaults that may hit an active cluster.
  if (/\/\/([^/@]*@)?(localhost|127\.0\.0\.1)(:|\/|$)/.test(normalized) && /\/postgres(\?|$)/.test(normalized)) {
    return true;
  }
  return false;
}
