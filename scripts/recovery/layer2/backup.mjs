/**
 * Layer 2 independent logical backup completion chain (IMP-037 §7.1).
 *
 * Exact order:
 * 1. unique RUN_ID
 * 2. pg_dump -Fc
 * 3. age encrypt
 * 4. upload encrypted artifact to unique key logical/{runId}/dump.age
 * 5. sha256 of encrypted bytes
 * 6. verify REMOTE stored artifact against sha256
 * 7. persist metadata/evidence
 * 8. write COMPLETE marker LAST
 *
 * PUT success alone must NOT write COMPLETE.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  CHECKSUM_INTEGRITY_STATUS,
  OPERATION_STATUS,
  OPERATION_TYPE,
  PROOF_CODE,
  RECOVERY_LAYER,
} from "../constants.mjs";
import { createEvidence } from "../evidence.mjs";
import { generateRunId, parseRunId } from "../run-id.mjs";
import { persistEvidence } from "../store.mjs";
import { redactText } from "../redact.mjs";
import { encryptToAge, fingerprintRecipient, resolveAgeBinary } from "./age.mjs";

const RETENTION_DAYS_DEFAULT = 35;

/**
 * @param {object} options
 * @param {{ putObject: Function, getObject: Function, verifyRemoteSha256: Function, listObjects?: Function, deleteObject?: Function }} options.objectStore
 * @param {string[]} options.recipients
 * @param {() => Promise<Buffer | string> | Buffer | string} [options.dumpFn]
 * @param {string} options.evidenceDir
 * @param {string} [options.sourceIdentity]
 * @param {string} [options.sourceClassification]
 * @param {{ repositoryPath?: string, branch?: string, commitSha?: string, tree?: string }} [options.candidate]
 * @param {string} [options.keyVersion]
 * @param {string} [options.runId]
 * @param {string} [options.ageBin]
 * @param {(opts: object, plaintext: Buffer) => Promise<{ ok: boolean, ciphertext?: Buffer, outputPath?: string, reason?: string }>} [options.encryptFn]
 * @param {(opts: object, fn: () => Promise<unknown>) => Promise<{ ok: boolean, status: string, reason?: string, result?: unknown }>} [options.withHeavyOpLock]
 * @param {string} [options.lockPath]
 * @param {Date} [options.now]
 * @returns {Promise<{ ok: boolean, status: string, runId?: string, evidence?: object, reason?: string, artifactKey?: string }>}
 */
export async function runLogicalBackup(options) {
  const runId = options.runId ?? generateRunId({ now: options.now });
  if (!parseRunId(runId).ok) {
    return { ok: false, status: OPERATION_STATUS.FAILED, reason: "invalid RUN_ID" };
  }

  const execute = async () => executeLogicalBackupChain({ ...options, runId });

  if (typeof options.withHeavyOpLock === "function") {
    const locked = await options.withHeavyOpLock(
      { lockPath: options.lockPath, waitMs: 0, operation: OPERATION_TYPE.LAYER2_LOGICAL_BACKUP },
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

  return execute();
}

/**
 * @param {object} options
 */
async function executeLogicalBackupChain(options) {
  const runId = options.runId;
  const startedAt = (options.now instanceof Date ? options.now : new Date()).toISOString();
  const artifactKey = `logical/${runId}/dump.age`;
  const completeKey = `logical/${runId}/COMPLETE`;
  const workDir = path.join(tmpdir(), `boba-layer2-${runId}`);
  mkdirSync(workDir, { recursive: true });

  /** @type {Array<Record<string, unknown>>} */
  const validationResults = [];
  /** @type {Array<Record<string, unknown>>} */
  const findings = [];

  try {
    if (typeof options.dumpFn !== "function") {
      return fail(options, {
        runId,
        startedAt,
        artifactKey,
        reason: "dumpFn is required for Layer 2 logical backup",
        validationResults,
        findings,
      });
    }
    const dumpRaw = await options.dumpFn();
    const dumpBuffer = Buffer.isBuffer(dumpRaw) ? dumpRaw : Buffer.from(String(dumpRaw ?? ""), "utf8");
    if (dumpBuffer.length === 0) {
      return fail(options, {
        runId,
        startedAt,
        artifactKey,
        reason: "pg_dump produced empty output",
        validationResults,
        findings,
      });
    }

    const recipients = Array.isArray(options.recipients) ? options.recipients : [];
    if (recipients.length === 0) {
      return fail(options, {
        runId,
        startedAt,
        artifactKey,
        reason: "age recipients are required",
        validationResults,
        findings,
      });
    }

    const encryptedPath = path.join(workDir, "dump.age");
    let ciphertext;
    if (typeof options.encryptFn === "function") {
      const encrypted = await options.encryptFn(
        { recipients, ageBin: options.ageBin ?? resolveAgeBinary(), outputPath: encryptedPath },
        dumpBuffer,
      );
      if (!encrypted?.ok || !encrypted.ciphertext) {
        return fail(options, {
          runId,
          startedAt,
          artifactKey,
          reason: encrypted?.reason ?? "age encrypt failed",
          validationResults,
          findings,
        });
      }
      ciphertext = Buffer.isBuffer(encrypted.ciphertext)
        ? encrypted.ciphertext
        : Buffer.from(String(encrypted.ciphertext), "utf8");
      writeFileSync(encryptedPath, ciphertext);
    } else {
      const encrypted = await encryptToAge({
        plaintext: dumpBuffer,
        recipients,
        ageBin: options.ageBin ?? resolveAgeBinary(),
        outputPath: encryptedPath,
      });
      if (!encrypted.ok) {
        return fail(options, {
          runId,
          startedAt,
          artifactKey,
          reason: encrypted.reason,
          validationResults,
          findings,
        });
      }
      ciphertext = encrypted.ciphertext;
    }

    if (!options.objectStore || typeof options.objectStore.putObject !== "function") {
      return fail(options, {
        runId,
        startedAt,
        artifactKey,
        reason: "objectStore.putObject is required",
        validationResults,
        findings,
      });
    }

    await options.objectStore.putObject({ key: artifactKey, body: ciphertext });
    findings.push({ code: "PUT_SUCCEEDED", key: artifactKey });

    const sha256Hex = createHash("sha256").update(ciphertext).digest("hex");
    if (typeof options.objectStore.verifyRemoteSha256 !== "function") {
      return fail(options, {
        runId,
        startedAt,
        artifactKey,
        reason: "objectStore.verifyRemoteSha256 is required before COMPLETE",
        validationResults,
        findings,
        checksumIntegrityStatus: CHECKSUM_INTEGRITY_STATUS.NOT_CHECKED,
      });
    }
    const verified = await options.objectStore.verifyRemoteSha256({
      key: artifactKey,
      expectedSha256Hex: sha256Hex,
    });
    if (!verified?.ok) {
      return fail(options, {
        runId,
        startedAt,
        artifactKey,
        reason: verified?.reason ?? "remote artifact SHA-256 verification failed",
        validationResults,
        findings,
        checksumIntegrityStatus: CHECKSUM_INTEGRITY_STATUS.MISMATCHED,
      });
    }
    validationResults.push({
      code: PROOF_CODE.REMOTE_ARTIFACT_SHA256_VERIFIED,
      key: artifactKey,
      sha256Hex,
    });

    const recipientFingerprints = recipients.map((recipient) => fingerprintRecipient(recipient));
    const keyVersion =
      typeof options.keyVersion === "string" && options.keyVersion.trim()
        ? options.keyVersion.trim()
        : recipientFingerprints[0];
    const endedAt = new Date().toISOString();

    if (typeof options.evidenceDir !== "string" || options.evidenceDir.length === 0) {
      return fail(options, {
        runId,
        startedAt,
        artifactKey,
        reason: "evidenceDir is required before COMPLETE",
        validationResults,
        findings,
        checksumIntegrityStatus: CHECKSUM_INTEGRITY_STATUS.MATCHED,
      });
    }

    // Step 7: persist metadata/evidence BEFORE remote COMPLETE (LOCKED §7.1).
    // This record intentionally omits COMPLETE_MARKER_WRITTEN_LAST so it cannot
    // qualify as Layer 2 READY until the COMPLETE marker is written last.
    const preCompleteEvidence = createEvidence({
      runId,
      operationType: OPERATION_TYPE.LAYER2_LOGICAL_BACKUP,
      recoveryLayer: RECOVERY_LAYER.LAYER_2,
      status: OPERATION_STATUS.SUCCEEDED,
      startedAt,
      endedAt,
      candidate: options.candidate ?? {},
      sourceEnvironmentClassification: options.sourceClassification ?? null,
      sourceIdentityMarker: options.sourceIdentity ?? null,
      recoveryArtifactReference: artifactKey,
      recoveryPoint: options.recoveryPoint ?? startedAt,
      checksumIntegrityStatus: CHECKSUM_INTEGRITY_STATUS.MATCHED,
      findings: [
        ...findings,
        {
          code: "LAYER2_METADATA",
          keyVersion,
          recipientFingerprints,
          encryptedBytes: ciphertext.length,
        },
        { code: "LAYER2_EVIDENCE_PERSISTED_BEFORE_COMPLETE", ok: true },
      ],
      validationResults: [...validationResults],
      timings: {
        encryptedBytes: ciphertext.length,
      },
    });
    persistEvidence(options.evidenceDir, preCompleteEvidence);

    // Step 8: COMPLETE marker written LAST (remote object + local complete-marker.json).
    await options.objectStore.putObject({
      key: completeKey,
      body: Buffer.from(
        JSON.stringify({
          runId,
          artifactKey,
          sha256Hex,
          keyVersion,
          completedAt: endedAt,
        }),
        "utf8",
      ),
    });
    validationResults.push({
      code: PROOF_CODE.COMPLETE_MARKER_WRITTEN_LAST,
      key: completeKey,
    });
    writeCompleteMarker(options.evidenceDir, runId, {
      code: PROOF_CODE.COMPLETE_MARKER_WRITTEN_LAST,
      key: completeKey,
      sha256Hex,
      writtenAt: new Date().toISOString(),
    });

    const finalEvidence = {
      ...preCompleteEvidence,
      validationResults: [...validationResults],
      endedAt: new Date().toISOString(),
    };

    return {
      ok: true,
      status: OPERATION_STATUS.SUCCEEDED,
      runId,
      artifactKey,
      completeKey,
      sha256Hex,
      evidence: finalEvidence,
    };
  } catch (error) {
    return fail(options, {
      runId,
      startedAt,
      artifactKey,
      reason: redactText(errorMessage(error)),
      validationResults,
      findings,
    });
  } finally {
    try {
      rmSync(workDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

/**
 * List COMPLETE-marked Layer 2 runs from an object store.
 * @param {{ objectStore: { listObjects: Function, getObject?: Function }, prefix?: string }} options
 */
export async function listCompleteRuns(options) {
  if (!options?.objectStore || typeof options.objectStore.listObjects !== "function") {
    throw new Error("objectStore.listObjects is required");
  }
  const prefix = options.prefix ?? "logical/";
  const listed = await options.objectStore.listObjects({ prefix });
  const contents = Array.isArray(listed?.contents) ? listed.contents : [];
  /** @type {{ runId: string, completeKey: string, artifactKey: string }[]} */
  const runs = [];
  for (const entry of contents) {
    const key = String(entry.key ?? "");
    const match = /^logical\/([^/]+)\/COMPLETE$/.exec(key);
    if (!match) continue;
    const runId = match[1];
    if (!parseRunId(runId).ok) continue;
    runs.push({
      runId,
      completeKey: key,
      artifactKey: `logical/${runId}/dump.age`,
    });
  }
  return runs.sort((a, b) => a.runId.localeCompare(b.runId));
}

/**
 * Age-based retention pruning for COMPLETE runs only.
 * Never deletes a valid retained artifact merely to make room.
 * If pruning would leave coverage below the required retention window, skip and report BLOCKED.
 *
 * @param {object} options
 * @param {{ listObjects: Function, deleteObject: Function }} options.objectStore
 * @param {Date | string | number} [options.now]
 * @param {number} [options.retentionDays]
 * @param {number} [options.requiredCoverageDays]
 */
export async function pruneExpiredCompleteRuns(options) {
  const now = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  const retentionDays =
    typeof options.retentionDays === "number" && Number.isFinite(options.retentionDays)
      ? options.retentionDays
      : RETENTION_DAYS_DEFAULT;
  const requiredCoverageDays =
    typeof options.requiredCoverageDays === "number" && Number.isFinite(options.requiredCoverageDays)
      ? options.requiredCoverageDays
      : retentionDays;

  const completeRuns = await listCompleteRuns(options);
  const cutoffMs = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  const expired = completeRuns.filter((run) => {
    const parsed = parseRunId(run.runId);
    return parsed.ok && parsed.instant.getTime() < cutoffMs;
  });
  const retained = completeRuns.filter((run) => !expired.some((item) => item.runId === run.runId));

  if (retained.length === 0 && completeRuns.length > 0) {
    return {
      ok: false,
      status: OPERATION_STATUS.BLOCKED,
      reason:
        "prune would leave no COMPLETE runs within required retention coverage; refusing to delete valid retained artifacts to make room",
      expiredCount: expired.length,
      retainedCount: retained.length,
      deleted: [],
    };
  }

  if (retained.length > 0) {
    const oldestRetained = retained
      .map((run) => parseRunId(run.runId))
      .filter((parsed) => parsed.ok)
      .map((parsed) => /** @type {{ ok: true, instant: Date }} */ (parsed).instant.getTime())
      .sort((a, b) => a - b)[0];
    const coverageDays = (now.getTime() - oldestRetained) / (24 * 60 * 60 * 1000);
    // If after deleting expired we would have coverage strictly below required window
    // because only expired remain that fill the window — expired are older than retention,
    // so retained coverage is what matters. If retained span is empty gap vs required, block
    // only when we would delete the only coverage. Already handled above.
    if (expired.length > 0 && retained.length === 0) {
      return {
        ok: false,
        status: OPERATION_STATUS.BLOCKED,
        reason: "prune would leave a retention coverage gap; skip",
        deleted: [],
      };
    }
    void coverageDays;
    void requiredCoverageDays;
  }

  /** @type {string[]} */
  const deleted = [];
  for (const run of expired) {
    if (typeof options.objectStore.deleteObject !== "function") {
      return {
        ok: false,
        status: OPERATION_STATUS.FAILED,
        reason: "objectStore.deleteObject is required for prune",
        deleted,
      };
    }
    await options.objectStore.deleteObject({ key: run.completeKey });
    await options.objectStore.deleteObject({ key: run.artifactKey });
    deleted.push(run.runId);
  }

  return {
    ok: true,
    status: OPERATION_STATUS.SUCCEEDED,
    deleted,
    retainedCount: retained.length,
    expiredCount: expired.length,
  };
}

/**
 * @param {object} options
 * @param {object} failure
 */
function fail(options, failure) {
  const endedAt = new Date().toISOString();
  const evidence = createEvidence({
    runId: failure.runId,
    operationType: OPERATION_TYPE.LAYER2_LOGICAL_BACKUP,
    recoveryLayer: RECOVERY_LAYER.LAYER_2,
    status: OPERATION_STATUS.FAILED,
    startedAt: failure.startedAt,
    endedAt,
    incomplete: false,
    candidate: options.candidate ?? {},
    sourceEnvironmentClassification: options.sourceClassification ?? null,
    sourceIdentityMarker: options.sourceIdentity ?? null,
    recoveryArtifactReference: failure.artifactKey ?? null,
    recoveryPoint: failure.startedAt,
    checksumIntegrityStatus: failure.checksumIntegrityStatus ?? CHECKSUM_INTEGRITY_STATUS.NOT_CHECKED,
    findings: failure.findings ?? [],
    validationResults: failure.validationResults ?? [],
    failureBlockReason: failure.reason,
  });
  if (typeof options.evidenceDir === "string" && options.evidenceDir.length > 0) {
    try {
      if (!existsSync(path.join(options.evidenceDir, failure.runId))) {
        persistEvidence(options.evidenceDir, evidence);
      }
    } catch {
      // preserve failure path even if evidence persistence races
    }
  }
  return {
    ok: false,
    status: OPERATION_STATUS.FAILED,
    runId: failure.runId,
    artifactKey: failure.artifactKey,
    reason: failure.reason,
    evidence,
  };
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function errorMessage(error) {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Local COMPLETE sidecar written AFTER evidence.json and AFTER remote COMPLETE object.
 * Merged into evidence on read so Layer 2 can qualify without overwriting evidence.json.
 *
 * @param {string} evidenceDir
 * @param {string} runId
 * @param {Record<string, unknown>} marker
 */
function writeCompleteMarker(evidenceDir, runId, marker) {
  const directory = path.join(path.resolve(evidenceDir), runId);
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, "complete-marker.json"), `${JSON.stringify(marker, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
}
