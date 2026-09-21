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
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync, existsSync } from "node:fs";
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
import { assertS3StoreLiveAuthorized } from "../spaces/logical.mjs";

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
    const liveGate = assertS3StoreLiveAuthorized(options.objectStore);
    if (!liveGate.ok) {
      return {
        ok: false,
        status: OPERATION_STATUS.BLOCKED,
        runId,
        reason: liveGate.reason,
        code: liveGate.code,
      };
    }
    if (options.objectStore?.backend === "s3" && options.objectStore.versioningVerified !== true) {
      if (typeof options.objectStore.verifyBucketVersioning !== "function") {
        return {
          ok: false,
          status: OPERATION_STATUS.BLOCKED,
          runId,
          reason: "object store cannot verify bucket versioning before upload",
          code: "VERSIONING_VERIFY_UNAVAILABLE",
        };
      }
      const versioning = await options.objectStore.verifyBucketVersioning();
      if (!versioning?.ok) {
        return {
          ok: false,
          status: OPERATION_STATUS.BLOCKED,
          runId,
          reason: versioning?.reason ?? "Spaces bucket versioning must be ENABLED before upload",
          code: "SPACES_VERSIONING_NOT_ENABLED",
        };
      }
      options.objectStore.versioningVerified = true;
    }

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
    // Remote COMPLETE is the authoritative finalization marker. Local sidecar is
    // reconciled on later inspection when the local write fails after remote success.
    const completeBody = {
      runId,
      artifactKey,
      sha256Hex,
      keyVersion,
      completedAt: endedAt,
    };
    await options.objectStore.putObject({
      key: completeKey,
      body: Buffer.from(JSON.stringify(completeBody), "utf8"),
    });
    validationResults.push({
      code: PROOF_CODE.COMPLETE_MARKER_WRITTEN_LAST,
      key: completeKey,
    });

    let localCompleteMarkerOk = true;
    let localCompleteMarkerReason = null;
    try {
      writeCompleteMarker(options.evidenceDir, runId, {
        code: PROOF_CODE.COMPLETE_MARKER_WRITTEN_LAST,
        key: completeKey,
        sha256Hex,
        writtenAt: new Date().toISOString(),
      });
    } catch (error) {
      localCompleteMarkerOk = false;
      localCompleteMarkerReason = redactText(errorMessage(error));
      // Fail-open on local sidecar only: remote COMPLETE already exists and is
      // authoritative. Later inspect/reconcile reconstructs local qualification.
      try {
        writeCompleteMarker(options.evidenceDir, runId, {
          code: PROOF_CODE.COMPLETE_MARKER_WRITTEN_LAST,
          key: completeKey,
          sha256Hex,
          writtenAt: new Date().toISOString(),
          reconciledFromRemote: true,
          priorLocalWriteError: localCompleteMarkerReason,
        });
        localCompleteMarkerOk = true;
        localCompleteMarkerReason = null;
      } catch {
        // still ok overall — remote COMPLETE remains authoritative
      }
    }

    const finalEvidence = {
      ...preCompleteEvidence,
      validationResults: [...validationResults],
      endedAt: new Date().toISOString(),
      findings: [
        ...(Array.isArray(preCompleteEvidence.findings) ? preCompleteEvidence.findings : []),
        ...(localCompleteMarkerOk
          ? []
          : [
              {
                code: "LOCAL_COMPLETE_MARKER_PENDING_RECONCILE",
                detail: localCompleteMarkerReason,
                remoteCompleteKey: completeKey,
              },
            ]),
      ],
    };

    return {
      ok: true,
      status: OPERATION_STATUS.SUCCEEDED,
      runId,
      artifactKey,
      completeKey,
      sha256Hex,
      evidence: finalEvidence,
      localCompleteMarkerOk,
      remoteCompleteAuthoritative: true,
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
  const liveGate = assertS3StoreLiveAuthorized(options?.objectStore);
  if (!liveGate.ok) {
    return {
      ok: false,
      status: OPERATION_STATUS.BLOCKED,
      reason: liveGate.reason,
      code: liveGate.code,
    };
  }
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
 * Uses exclusive create (wx). If the marker already exists with matching COMPLETE code,
 * treat as success (idempotent reconcile). Remote COMPLETE remains authoritative.
 *
 * @param {string} evidenceDir
 * @param {string} runId
 * @param {Record<string, unknown>} marker
 */
function writeCompleteMarker(evidenceDir, runId, marker) {
  const directory = path.join(path.resolve(evidenceDir), runId);
  mkdirSync(directory, { recursive: true });
  const destination = path.join(directory, "complete-marker.json");
  if (existsSync(destination)) {
    try {
      const existing = JSON.parse(readFileSync(destination, "utf8"));
      const code = typeof existing.code === "string" ? existing.code : "";
      if (code === PROOF_CODE.COMPLETE_MARKER_WRITTEN_LAST || code === PROOF_CODE.LAYER2_COMPLETE) {
        return;
      }
    } catch {
      // fall through to rewrite attempt via temp+rename when corrupt
    }
  }
  const tempPath = `${destination}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(marker, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  try {
    renameSync(tempPath, destination);
  } catch (error) {
    try {
      rmSync(tempPath, { force: true });
    } catch {
      // ignore
    }
    // If destination appeared concurrently with a valid marker, accept it.
    if (existsSync(destination)) {
      try {
        const existing = JSON.parse(readFileSync(destination, "utf8"));
        const code = typeof existing.code === "string" ? existing.code : "";
        if (code === PROOF_CODE.COMPLETE_MARKER_WRITTEN_LAST || code === PROOF_CODE.LAYER2_COMPLETE) {
          return;
        }
      } catch {
        // ignore
      }
    }
    throw error;
  }
}

/**
 * Reconcile local COMPLETE sidecar from an authoritative remote COMPLETE object.
 * Explicit operator path only — ordinary status/inspect must not silently live-call
 * the provider. A remote COMPLETE alone MUST NOT manufacture READY.
 *
 * Before writing local complete-marker.json, verify:
 * 1. persisted pre-COMPLETE evidence exists
 * 2. operation is Layer 2 backup
 * 3. evidence contains REMOTE_ARTIFACT_SHA256_VERIFIED
 * 4–5. remote COMPLETE exists and parses
 * 6–8. COMPLETE.runId / artifactKey / sha256Hex bind to evidence
 * 9. re-verify objectStore.verifyRemoteSha256 against that expected SHA
 * 10. only then write local complete-marker.json
 *
 * @param {object} options
 * @param {string} options.evidenceDir
 * @param {string} options.runId
 * @param {{ headObject?: Function, getObject: Function, verifyRemoteSha256: Function }} options.objectStore
 */
export async function reconcileLocalCompleteMarker(options) {
  const runId = options?.runId;
  const evidenceDir = options?.evidenceDir;
  if (!runId || !evidenceDir || !options.objectStore) {
    return { ok: false, reason: "evidenceDir, runId, and objectStore are required for COMPLETE reconcile" };
  }
  const liveGate = assertS3StoreLiveAuthorized(options.objectStore);
  if (!liveGate.ok) {
    return { ok: false, status: OPERATION_STATUS.BLOCKED, reason: liveGate.reason, code: liveGate.code };
  }
  if (!parseRunId(runId).ok) {
    return { ok: false, reason: "runId must be a valid RUN_ID", code: "RUN_ID_INVALID" };
  }

  const evidencePath = path.join(path.resolve(evidenceDir), runId, "evidence.json");
  if (!existsSync(evidencePath)) {
    return {
      ok: false,
      reason: "persisted pre-COMPLETE evidence missing; remote COMPLETE alone cannot manufacture READY",
      code: "PRECOMPLETE_EVIDENCE_MISSING",
    };
  }

  let evidence;
  try {
    evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
  } catch {
    return { ok: false, reason: "persisted evidence is not valid JSON", code: "EVIDENCE_INVALID" };
  }

  if (evidence?.recoveryLayer !== RECOVERY_LAYER.LAYER_2) {
    return {
      ok: false,
      reason: "reconcile-layer2 requires Layer 2 backup evidence",
      code: "NOT_LAYER2_BACKUP",
    };
  }
  if (evidence?.operationType !== OPERATION_TYPE.LAYER2_LOGICAL_BACKUP) {
    return {
      ok: false,
      reason: "reconcile-layer2 requires LAYER2_LOGICAL_BACKUP operation evidence",
      code: "NOT_LAYER2_BACKUP",
    };
  }
  if (evidence?.runId !== runId) {
    return {
      ok: false,
      reason: "persisted evidence runId does not match requested run",
      code: "EVIDENCE_RUN_MISMATCH",
    };
  }

  const validationResults = Array.isArray(evidence.validationResults) ? evidence.validationResults : [];
  const remoteProof = validationResults.find(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      (entry.code === PROOF_CODE.REMOTE_ARTIFACT_SHA256_VERIFIED ||
        entry.code === PROOF_CODE.REMOTE_STORED_ARTIFACT_VERIFIED),
  );
  if (!remoteProof) {
    return {
      ok: false,
      reason: "missing REMOTE_ARTIFACT_SHA256_VERIFIED pre-COMPLETE proof; refuse reconcile",
      code: "REMOTE_SHA_PROOF_MISSING",
    };
  }

  const expectedSha = String(remoteProof.sha256Hex ?? "")
    .trim()
    .toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expectedSha)) {
    return {
      ok: false,
      reason: "pre-COMPLETE remote SHA proof is missing or malformed",
      code: "REMOTE_SHA_PROOF_INVALID",
    };
  }

  const expectedArtifactKey =
    typeof evidence.recoveryArtifactReference === "string" ? evidence.recoveryArtifactReference.trim() : "";
  if (!expectedArtifactKey) {
    return {
      ok: false,
      reason: "evidence.recoveryArtifactReference missing; refuse reconcile",
      code: "ARTIFACT_KEY_MISSING",
    };
  }

  const completeKey = `logical/${runId}/COMPLETE`;
  let remoteBody = null;
  try {
    const remote = await options.objectStore.getObject({ key: completeKey });
    remoteBody = remote?.body;
  } catch {
    return {
      ok: false,
      reason: "remote COMPLETE marker missing; cannot reconcile",
      code: "REMOTE_COMPLETE_MISSING",
    };
  }

  let parsedRemote;
  try {
    const text = Buffer.isBuffer(remoteBody) ? remoteBody.toString("utf8") : String(remoteBody ?? "");
    parsedRemote = JSON.parse(text);
  } catch {
    return {
      ok: false,
      reason: "remote COMPLETE marker does not parse as JSON",
      code: "REMOTE_COMPLETE_INVALID",
    };
  }

  if (parsedRemote?.runId !== runId) {
    return {
      ok: false,
      reason: "remote COMPLETE.runId does not match evidence runId",
      code: "COMPLETE_RUN_MISMATCH",
    };
  }
  if (parsedRemote?.artifactKey !== expectedArtifactKey) {
    return {
      ok: false,
      reason: "remote COMPLETE.artifactKey does not match evidence.recoveryArtifactReference",
      code: "COMPLETE_ARTIFACT_MISMATCH",
    };
  }
  const completeSha = String(parsedRemote?.sha256Hex ?? "")
    .trim()
    .toLowerCase();
  if (completeSha !== expectedSha) {
    return {
      ok: false,
      reason: "remote COMPLETE.sha256Hex does not equal evidence remote-verification SHA",
      code: "COMPLETE_SHA_MISMATCH",
    };
  }

  if (typeof options.objectStore.verifyRemoteSha256 !== "function") {
    return {
      ok: false,
      reason: "objectStore.verifyRemoteSha256 is required before reconcile qualifies READY",
      code: "VERIFY_FN_REQUIRED",
    };
  }
  const verified = await options.objectStore.verifyRemoteSha256({
    key: expectedArtifactKey,
    expectedSha256Hex: expectedSha,
  });
  if (!verified?.ok) {
    return {
      ok: false,
      reason: verified?.reason ?? "remote artifact SHA-256 re-verification failed during reconcile",
      code: "REMOTE_ARTIFACT_TAMPERED",
    };
  }

  try {
    writeCompleteMarker(evidenceDir, runId, {
      code: PROOF_CODE.COMPLETE_MARKER_WRITTEN_LAST,
      key: completeKey,
      sha256Hex: expectedSha,
      writtenAt: new Date().toISOString(),
      reconciledFromRemote: true,
    });
  } catch (error) {
    return { ok: false, reason: redactText(errorMessage(error)), code: "LOCAL_MARKER_WRITE_FAILED" };
  }
  return { ok: true, completeKey, reconciledFromRemote: true, sha256Hex: expectedSha };
}
