/**
 * Machine-readable IMP-037 recovery evidence model (foundation).
 * Status is never SUCCEEDED merely because a command started.
 */
import {
  CHECKSUM_INTEGRITY_STATUS,
  EVIDENCE_SCHEMA_VERSION,
  OPERATION_STATUS,
  READINESS_LEVEL,
  RECOVERY_LAYER,
} from "./constants.mjs";
import { isValidRunId } from "./run-id.mjs";
import { redactValue } from "./redact.mjs";

const OPERATION_STATUSES = new Set(Object.values(OPERATION_STATUS));
const READINESS_LEVELS = new Set(Object.values(READINESS_LEVEL));
const RECOVERY_LAYERS = new Set([...Object.values(RECOVERY_LAYER), "NONE", "BOTH"]);
const CHECKSUM_STATUSES = new Set(Object.values(CHECKSUM_INTEGRITY_STATUS));

/**
 * @typedef {object} RecoveryEvidence
 * @property {string} schemaVersion
 * @property {string} runId
 * @property {string} operationType
 * @property {string} recoveryLayer
 * @property {string} status
 * @property {string | null} [readiness]
 * @property {string} startedAt
 * @property {string | null} [endedAt]
 * @property {{ repositoryPath?: string, branch?: string, commitSha?: string, tree?: string }} [candidate]
 * @property {string | null} [migrationSchemaContext]
 * @property {string | null} [sourceEnvironmentClassification]
 * @property {string | null} [sourceIdentityMarker]
 * @property {string | null} [targetIdentityMarker]
 * @property {string | null} [recoveryArtifactReference]
 * @property {string | null} [recoveryPoint]
 * @property {string | null} [checksumIntegrityStatus]
 * @property {Record<string, number | string> | null} [timings]
 * @property {Array<Record<string, unknown>>} [findings]
 * @property {string | null} [failureBlockReason]
 * @property {Array<Record<string, unknown>>} [validationResults]
 * @property {boolean} [incomplete]
 */

/**
 * @param {Partial<RecoveryEvidence> & { runId: string, operationType: string, status: string }} input
 * @returns {RecoveryEvidence}
 */
export function createEvidence(input) {
  const startedAt = input.startedAt ?? new Date().toISOString();
  /** @type {RecoveryEvidence} */
  const evidence = {
    schemaVersion: input.schemaVersion ?? EVIDENCE_SCHEMA_VERSION,
    runId: input.runId,
    operationType: input.operationType,
    recoveryLayer: input.recoveryLayer ?? "NONE",
    status: input.status,
    readiness: input.readiness ?? null,
    startedAt,
    endedAt: input.endedAt ?? null,
    candidate: input.candidate ?? {},
    migrationSchemaContext: input.migrationSchemaContext ?? null,
    sourceEnvironmentClassification: input.sourceEnvironmentClassification ?? null,
    sourceIdentityMarker: input.sourceIdentityMarker ?? null,
    targetIdentityMarker: input.targetIdentityMarker ?? null,
    recoveryArtifactReference: input.recoveryArtifactReference ?? null,
    recoveryPoint: input.recoveryPoint ?? null,
    checksumIntegrityStatus: input.checksumIntegrityStatus ?? CHECKSUM_INTEGRITY_STATUS.NOT_CHECKED,
    timings: input.timings ?? null,
    findings: Array.isArray(input.findings) ? input.findings : [],
    failureBlockReason: input.failureBlockReason ?? null,
    validationResults: Array.isArray(input.validationResults) ? input.validationResults : [],
    incomplete: input.incomplete === true,
  };
  return /** @type {RecoveryEvidence} */ (redactValue(evidence));
}

/**
 * @param {unknown} value
 * @returns {{ ok: true, evidence: RecoveryEvidence } | { ok: false, reason: string }}
 */
export function validateEvidence(value) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "evidence must be an object" };
  }
  const evidence = /** @type {Record<string, unknown>} */ (value);
  if (evidence.schemaVersion !== EVIDENCE_SCHEMA_VERSION) {
    return { ok: false, reason: "evidence schemaVersion is missing or unsupported" };
  }
  if (!isValidRunId(evidence.runId)) {
    return { ok: false, reason: "evidence runId is missing or malformed" };
  }
  if (typeof evidence.operationType !== "string" || evidence.operationType.length === 0) {
    return { ok: false, reason: "evidence operationType is required" };
  }
  if (!RECOVERY_LAYERS.has(String(evidence.recoveryLayer))) {
    return { ok: false, reason: "evidence recoveryLayer is invalid" };
  }
  if (!OPERATION_STATUSES.has(String(evidence.status))) {
    return { ok: false, reason: "evidence status is invalid" };
  }
  if (evidence.readiness != null && !READINESS_LEVELS.has(String(evidence.readiness))) {
    return { ok: false, reason: "evidence readiness is invalid" };
  }
  if (typeof evidence.startedAt !== "string" || Number.isNaN(Date.parse(evidence.startedAt))) {
    return { ok: false, reason: "evidence startedAt must be an ISO-8601 timestamp" };
  }
  if (evidence.endedAt != null && (typeof evidence.endedAt !== "string" || Number.isNaN(Date.parse(evidence.endedAt)))) {
    return { ok: false, reason: "evidence endedAt must be an ISO-8601 timestamp when present" };
  }
  if (evidence.checksumIntegrityStatus != null && !CHECKSUM_STATUSES.has(String(evidence.checksumIntegrityStatus))) {
    return { ok: false, reason: "evidence checksumIntegrityStatus is invalid" };
  }
  if (evidence.findings != null && !Array.isArray(evidence.findings)) {
    return { ok: false, reason: "evidence findings must be an array when present" };
  }
  if (evidence.validationResults != null && !Array.isArray(evidence.validationResults)) {
    return { ok: false, reason: "evidence validationResults must be an array when present" };
  }
  if (evidence.status === OPERATION_STATUS.RUNNING && evidence.incomplete !== true) {
    return { ok: false, reason: "RUNNING evidence must be marked incomplete" };
  }
  if (evidence.status === OPERATION_STATUS.SUCCEEDED && evidence.incomplete === true) {
    return { ok: false, reason: "incomplete evidence cannot be SUCCEEDED" };
  }
  if (evidence.status === OPERATION_STATUS.SUCCEEDED && evidence.endedAt == null) {
    return { ok: false, reason: "SUCCEEDED evidence must record endedAt" };
  }
  return { ok: true, evidence: /** @type {RecoveryEvidence} */ (evidence) };
}

/**
 * Interrupted / incomplete records are never successful coverage.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isSuccessfulLayerEvidence(value) {
  const parsed = validateEvidence(value);
  if (!parsed.ok) return false;
  const evidence = parsed.evidence;
  if (evidence.status !== OPERATION_STATUS.SUCCEEDED) return false;
  if (evidence.incomplete === true) return false;
  if (evidence.readiness === READINESS_LEVEL.NOT_READY) return false;
  return true;
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isCompleteEvidence(value) {
  const parsed = validateEvidence(value);
  if (!parsed.ok) return false;
  return parsed.evidence.incomplete !== true && parsed.evidence.status !== OPERATION_STATUS.RUNNING;
}
