/**
 * Machine-readable IMP-037 recovery evidence model (foundation).
 * Status is never SUCCEEDED merely because a command started.
 *
 * Evidence-schema validity and recovery-readiness qualification are separate:
 *   schema valid != recovery proof valid
 *   operation SUCCEEDED != recovery layer READY
 */
import {
  CHECKSUM_INTEGRITY_STATUS,
  EVIDENCE_SCHEMA_VERSION,
  NON_QUALIFYING_FOUNDATION_OPERATION_TYPES,
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
const FOUNDATION_NON_QUALIFYING_OPS = new Set(NON_QUALIFYING_FOUNDATION_OPERATION_TYPES);

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
 * Schema-valid operational SUCCEEDED record (not interrupted).
 * This is NOT qualifying recovery proof and MUST NOT establish Layer READY alone.
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
 * @typedef {object} QualifyingProofResult
 * @property {boolean} ok
 * @property {string} reason
 */

/**
 * Qualifying recovery-proof predicate.
 *
 * Schema-valid SUCCEEDED evidence may be operationally valid and still fail this predicate.
 * Foundation / status / evidence-validation records never establish Layer 1 or Layer 2 READY.
 *
 * Later Layer 1 (pgBackRest) / Layer 2 (pg_dump + age + remote SHA + COMPLETE-last) producers
 * plug in via `options.qualifyProof` without weakening the default fail-closed posture.
 *
 * @param {unknown} value
 * @param {{ layer?: string, qualifyProof?: (evidence: import("./evidence.mjs").RecoveryEvidence, layer: string) => QualifyingProofResult | boolean }} [options]
 * @returns {QualifyingProofResult}
 */
export function evaluateQualifyingRecoveryProof(value, options = {}) {
  const parsed = validateEvidence(value);
  if (!parsed.ok) {
    return { ok: false, reason: parsed.reason };
  }
  const evidence = parsed.evidence;
  const layer = options.layer ?? String(evidence.recoveryLayer);

  if (evidence.status !== OPERATION_STATUS.SUCCEEDED) {
    return { ok: false, reason: "operation SUCCEEDED is required for recovery proof qualification" };
  }
  if (evidence.incomplete === true) {
    return { ok: false, reason: "incomplete evidence cannot qualify as recovery proof" };
  }
  if (evidence.readiness === READINESS_LEVEL.NOT_READY) {
    return { ok: false, reason: "evidence readiness is NOT_READY" };
  }

  if (typeof options.qualifyProof === "function") {
    const injected = options.qualifyProof(evidence, layer);
    if (injected && typeof injected === "object" && "ok" in injected) {
      return {
        ok: injected.ok === true,
        reason:
          typeof injected.reason === "string" && injected.reason.length > 0
            ? injected.reason
            : injected.ok
              ? "injected qualifying recovery proof accepted"
              : "injected qualifying recovery proof rejected",
      };
    }
    return {
      ok: Boolean(injected),
      reason: injected
        ? "injected qualifying recovery proof accepted"
        : "injected qualifying recovery proof rejected",
    };
  }

  if (FOUNDATION_NON_QUALIFYING_OPS.has(String(evidence.operationType))) {
    return {
      ok: false,
      reason:
        "generic/foundation/status/evidence-validation records cannot establish Layer 1 or Layer 2 READY",
    };
  }

  if (layer === RECOVERY_LAYER.LAYER_1) {
    return evaluateLayer1QualifyingProof(evidence);
  }
  if (layer === RECOVERY_LAYER.LAYER_2) {
    return evaluateLayer2QualifyingProof(evidence);
  }
  if (layer === "BOTH") {
    const layer1 = evaluateLayer1QualifyingProof(evidence);
    if (!layer1.ok) return layer1;
    return evaluateLayer2QualifyingProof(evidence);
  }

  return {
    ok: false,
    reason: "arbitrary or unrecognized recovery layer cannot establish qualifying recovery proof",
  };
}

/**
 * @param {unknown} value
 * @param {{ layer?: string, qualifyProof?: (evidence: import("./evidence.mjs").RecoveryEvidence, layer: string) => QualifyingProofResult | boolean }} [options]
 * @returns {boolean}
 */
export function isQualifyingRecoveryProof(value, options = {}) {
  return evaluateQualifyingRecoveryProof(value, options).ok;
}

/**
 * Layer 1 qualifies only when ALL required proof codes are present:
 *   PGBACKREST_CHECK_OK
 *   PGBACKREST_INFO_OK
 *   LAYER1_RECOVERY_POINT (+ non-empty recoveryPoint field)
 *   REPOSITORY_GENERATION (or equivalent generation metadata)
 *   PGBACKREST_VERIFY_OK
 *
 * Absence of any required proof fails closed (NOT_READY).
 *
 * @param {import("./evidence.mjs").RecoveryEvidence} evidence
 * @returns {QualifyingProofResult}
 */
function evaluateLayer1QualifyingProof(evidence) {
  const codes = validationCodes(evidence);
  const hasCheck = codes.has("PGBACKREST_CHECK_OK");
  const hasInfo = codes.has("PGBACKREST_INFO_OK");
  const hasVerify = codes.has("PGBACKREST_VERIFY_OK");
  const hasRecoveryPointCode = codes.has("LAYER1_RECOVERY_POINT");
  const hasRecoveryPointField = hasNonEmptyString(evidence.recoveryPoint);
  const hasGenerationCode = codes.has("REPOSITORY_GENERATION");
  const hasGenerationMeta = hasLayer1GenerationMetadata(evidence);

  if (!hasCheck) {
    return {
      ok: false,
      reason: "qualifying Layer 1 recovery proof unavailable (missing PGBACKREST_CHECK_OK)",
    };
  }
  if (!hasInfo) {
    return {
      ok: false,
      reason: "qualifying Layer 1 recovery proof unavailable (missing PGBACKREST_INFO_OK)",
    };
  }
  if (!hasVerify) {
    return {
      ok: false,
      reason: "qualifying Layer 1 recovery proof unavailable (missing PGBACKREST_VERIFY_OK)",
    };
  }
  if (!hasRecoveryPointCode || !hasRecoveryPointField) {
    return {
      ok: false,
      reason: "missing recovery point cannot establish Layer 1 recovery readiness",
    };
  }
  if (!hasGenerationCode && !hasGenerationMeta) {
    return {
      ok: false,
      reason:
        "qualifying Layer 1 recovery proof unavailable (missing REPOSITORY_GENERATION or keyVersion/repositoryGeneration metadata)",
    };
  }
  return {
    ok: true,
    reason: "Layer 1 qualifying recovery/health proof accepted",
  };
}

/**
 * Layer 2 qualifies when field checks pass AND remote SHA verification + COMPLETE-last markers
 * are present in validationResults. Synthetic magic-only records without the required chain
 * fields still fail closed.
 *
 * @param {import("./evidence.mjs").RecoveryEvidence} evidence
 * @returns {QualifyingProofResult}
 */
function evaluateLayer2QualifyingProof(evidence) {
  const checksum = evidence.checksumIntegrityStatus ?? CHECKSUM_INTEGRITY_STATUS.NOT_CHECKED;
  if (checksum === CHECKSUM_INTEGRITY_STATUS.NOT_CHECKED) {
    return {
      ok: false,
      reason:
        "checksumIntegrityStatus NOT_CHECKED cannot establish qualifying Layer 2 recovery proof",
    };
  }
  if (checksum !== CHECKSUM_INTEGRITY_STATUS.MATCHED) {
    return {
      ok: false,
      reason: "Layer 2 checksumIntegrityStatus must be MATCHED for qualifying recovery proof",
    };
  }
  if (!hasNonEmptyString(evidence.recoveryPoint)) {
    return {
      ok: false,
      reason: "missing recovery point cannot establish Layer 2 recovery readiness",
    };
  }
  if (!hasNonEmptyString(evidence.recoveryArtifactReference)) {
    return {
      ok: false,
      reason: "missing recovery artifact reference cannot establish Layer 2 recovery readiness",
    };
  }
  if (!hasRequiredLayer2Context(evidence)) {
    return {
      ok: false,
      reason:
        "missing required candidate/source/artifact/validation context cannot establish Layer 2 recovery readiness",
    };
  }
  if (!hasLayer2RemoteCompleteProof(evidence)) {
    return {
      ok: false,
      reason:
        "Layer 2 cannot qualify without remote stored-artifact verification and COMPLETE marker written last",
    };
  }
  return {
    ok: true,
    reason: "Layer 2 qualifying finalization-chain proof accepted",
  };
}

/**
 * @param {import("./evidence.mjs").RecoveryEvidence} evidence
 * @returns {boolean}
 */
function hasRequiredLayer2Context(evidence) {
  const candidate = evidence.candidate ?? {};
  const hasCandidate =
    hasNonEmptyString(candidate.commitSha) || hasNonEmptyString(candidate.tree) || hasNonEmptyString(candidate.repositoryPath);
  const hasSource =
    hasNonEmptyString(evidence.sourceEnvironmentClassification) ||
    hasNonEmptyString(evidence.sourceIdentityMarker);
  const hasValidation = Array.isArray(evidence.validationResults) && evidence.validationResults.length > 0;
  return hasCandidate && hasSource && hasValidation;
}

/**
 * Detects Layer 2 remote-verification + COMPLETE-last proof markers when present.
 * Absence fails closed.
 *
 * @param {import("./evidence.mjs").RecoveryEvidence} evidence
 * @returns {boolean}
 */
function hasLayer2RemoteCompleteProof(evidence) {
  const codes = validationCodes(evidence);
  const hasRemoteVerification =
    codes.has("REMOTE_ARTIFACT_SHA256_VERIFIED") || codes.has("REMOTE_STORED_ARTIFACT_VERIFIED");
  const hasCompleteLast = codes.has("COMPLETE_MARKER_WRITTEN_LAST") || codes.has("LAYER2_COMPLETE");
  return hasRemoteVerification && hasCompleteLast;
}

/**
 * @param {import("./evidence.mjs").RecoveryEvidence} evidence
 * @returns {Set<string>}
 */
function validationCodes(evidence) {
  const results = Array.isArray(evidence.validationResults) ? evidence.validationResults : [];
  return new Set(
    results
      .map((entry) => (entry && typeof entry === "object" ? String(entry.code ?? entry.check ?? "") : ""))
      .filter((code) => code.length > 0),
  );
}

/**
 * @param {import("./evidence.mjs").RecoveryEvidence} evidence
 * @returns {boolean}
 */
function hasLayer1GenerationMetadata(evidence) {
  const findings = Array.isArray(evidence.findings) ? evidence.findings : [];
  for (const entry of findings) {
    if (!entry || typeof entry !== "object") continue;
    const record = /** @type {Record<string, unknown>} */ (entry);
    if (hasNonEmptyString(record.repositoryGeneration) || hasNonEmptyString(record.keyVersion)) {
      return true;
    }
    if (record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)) {
      const meta = /** @type {Record<string, unknown>} */ (record.metadata);
      if (hasNonEmptyString(meta.repositoryGeneration) || hasNonEmptyString(meta.keyVersion)) {
        return true;
      }
    }
  }
  for (const entry of Array.isArray(evidence.validationResults) ? evidence.validationResults : []) {
    if (!entry || typeof entry !== "object") continue;
    const record = /** @type {Record<string, unknown>} */ (entry);
    if (hasNonEmptyString(record.repositoryGeneration) || hasNonEmptyString(record.keyVersion)) {
      return true;
    }
    if (record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)) {
      const meta = /** @type {Record<string, unknown>} */ (record.metadata);
      if (hasNonEmptyString(meta.repositoryGeneration) || hasNonEmptyString(meta.keyVersion)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function hasNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
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
