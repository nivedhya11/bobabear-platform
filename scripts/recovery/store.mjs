/**
 * Local/disposable IMP-037 evidence persistence.
 * Unique RUN_ID paths, never overwrite, preserve failures, atomic write.
 * Caller owns cleanup of disposable test locations.
 */
import { mkdirSync, renameSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { createEvidence, validateEvidence } from "./evidence.mjs";
import { isValidRunId } from "./run-id.mjs";
import { redactValue, safeJson } from "./redact.mjs";

const EVIDENCE_FILE = "evidence.json";

/**
 * @param {string} evidenceRoot
 * @param {string} runId
 * @returns {string}
 */
export function runEvidenceDirectory(evidenceRoot, runId) {
  if (!isValidRunId(runId)) {
    throw new Error("Cannot persist evidence under a malformed RUN_ID");
  }
  if (typeof evidenceRoot !== "string" || evidenceRoot.length === 0) {
    throw new Error("Evidence root is required");
  }
  return path.join(path.resolve(evidenceRoot), runId);
}

/**
 * @param {string} evidenceRoot
 * @param {import("./evidence.mjs").RecoveryEvidence | Parameters<typeof createEvidence>[0]} evidence
 * @returns {string} written file path
 */
export function persistEvidence(evidenceRoot, evidence) {
  const record = "schemaVersion" in evidence && "status" in evidence && "runId" in evidence
    ? createEvidence(/** @type {any} */ (evidence))
    : createEvidence(/** @type {any} */ (evidence));
  const parsed = validateEvidence(record);
  if (!parsed.ok) {
    throw new Error(parsed.reason);
  }
  const directory = runEvidenceDirectory(evidenceRoot, parsed.evidence.runId);
  if (existsSync(directory)) {
    throw new Error(`Evidence directory already exists for RUN_ID ${parsed.evidence.runId}; overwrite is forbidden`);
  }
  mkdirSync(directory, { recursive: true });
  const destination = path.join(directory, EVIDENCE_FILE);
  const tempPath = `${destination}.${process.pid}.${Date.now()}.tmp`;
  try {
    writeFileSync(tempPath, safeJson(redactValue(parsed.evidence)), { encoding: "utf8", flag: "wx" });
    renameSync(tempPath, destination);
  } catch (error) {
    try {
      rmSync(tempPath, { force: true });
    } catch {
      // ignore temp cleanup
    }
    throw error;
  }
  return destination;
}

/**
 * @param {string} evidenceRoot
 * @param {string} runId
 * @returns {{ ok: true, evidence: import("./evidence.mjs").RecoveryEvidence } | { ok: false, reason: string }}
 */
export function readRunEvidence(evidenceRoot, runId) {
  const filePath = path.join(runEvidenceDirectory(evidenceRoot, runId), EVIDENCE_FILE);
  if (!existsSync(filePath)) {
    return { ok: false, reason: `No evidence file for RUN_ID ${runId}` };
  }
  let parsedJson;
  try {
    parsedJson = JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return { ok: false, reason: `Evidence file for RUN_ID ${runId} is not valid JSON` };
  }
  return validateEvidence(parsedJson);
}

/**
 * @param {string} evidenceRoot
 * @returns {import("./evidence.mjs").RecoveryEvidence[]}
 */
export function listEvidence(evidenceRoot) {
  if (typeof evidenceRoot !== "string" || evidenceRoot.length === 0 || !existsSync(evidenceRoot)) {
    return [];
  }
  const names = readdirSync(evidenceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && isValidRunId(entry.name))
    .map((entry) => entry.name)
    .sort();
  /** @type {import("./evidence.mjs").RecoveryEvidence[]} */
  const records = [];
  for (const runId of names) {
    const result = readRunEvidence(evidenceRoot, runId);
    if (result.ok) records.push(result.evidence);
  }
  return records;
}
