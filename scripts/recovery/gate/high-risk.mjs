/**
 * High-risk migration recovery-readiness gate (IMP-037 §15).
 * Evaluates evidence only. Default on missing evidence: BLOCKED.
 * Restore is never recommended as routine rollback.
 *
 * For each evidence class the LATEST attempt is selected first (including
 * FAILED / BLOCKED / RUNNING / incomplete / malformed). Qualification is
 * evaluated only against that latest state — an older success must not win.
 */
import { evaluateQualifyingRecoveryProof } from "../evidence.mjs";
import { evaluateRecoveryPointFreshness } from "../freshness.mjs";
import {
  LAYER_1_MAX_AGE_MS_DEFAULT,
  LAYER_2_MAX_AGE_MS_DEFAULT,
  OPERATION_STATUS,
  OPERATION_TYPE,
  READINESS_LEVEL,
  RECOVERY_LAYER,
  RPO_TARGET_MS_DEFAULT,
} from "../constants.mjs";
import { runIdInstant } from "../run-id.mjs";

export const RESTORE_AS_ROUTINE_ROLLBACK = false;

/**
 * @param {object} input
 * @param {unknown} [input.layer1Evidence]
 * @param {unknown} [input.layer2Evidence]
 * @param {unknown} [input.drillEvidence]
 * @param {unknown} [input.validationEvidence]
 * @param {{ requireDrill?: boolean, requireValidation?: boolean, now?: Date|string, layer1MaxAgeMs?: number, layer2MaxAgeMs?: number, rpoTargetMs?: number }} [input.policy]
 * @returns {{ result: "READY"|"BLOCKED", reasons: string[], reliedOn: object, restoreAsRoutineRollback: false }}
 */
export function evaluateHighRiskMigrationGate(input = {}) {
  /** @type {string[]} */
  const reasons = [];
  const reliedOn = {
    layer1RunId: null,
    layer2RunId: null,
    drillRunId: null,
    validationRunId: null,
  };
  const policy = input.policy ?? {};
  const now = resolveNow(policy.now);

  if (RESTORE_AS_ROUTINE_ROLLBACK !== false) {
    reasons.push("RESTORE_AS_ROUTINE_ROLLBACK invariant violated");
  }

  evaluateLatestLayerAttempt({
    evidence: input.layer1Evidence,
    layer: RECOVERY_LAYER.LAYER_1,
    label: "Layer 1",
    maxAgeMs: policy.layer1MaxAgeMs ?? LAYER_1_MAX_AGE_MS_DEFAULT,
    now,
    rpoTargetMs: policy.rpoTargetMs ?? RPO_TARGET_MS_DEFAULT,
    reasons,
    onReady: (runId) => {
      reliedOn.layer1RunId = runId;
    },
  });

  evaluateLatestLayerAttempt({
    evidence: input.layer2Evidence,
    layer: RECOVERY_LAYER.LAYER_2,
    label: "Layer 2",
    maxAgeMs: policy.layer2MaxAgeMs ?? LAYER_2_MAX_AGE_MS_DEFAULT,
    now,
    rpoTargetMs: null,
    reasons,
    onReady: (runId) => {
      reliedOn.layer2RunId = runId;
    },
  });

  const requireDrill = policy.requireDrill !== false;
  const requireValidation = policy.requireValidation !== false;

  if (requireDrill) {
    if (!input.drillEvidence) {
      reasons.push("missing representative rehearsal/drill evidence");
    } else if (isMalformedAttempt(input.drillEvidence)) {
      reasons.push("latest drill evidence is malformed/unverifiable");
    } else {
      const drill = /** @type {any} */ (input.drillEvidence);
      if (
        drill.status === OPERATION_STATUS.FAILED ||
        drill.status === OPERATION_STATUS.BLOCKED ||
        drill.status === OPERATION_STATUS.RUNNING ||
        drill.incomplete === true
      ) {
        reasons.push(`latest rehearsal/drill attempt is ${drill.status ?? "incomplete"}`);
      } else if (drill.status !== OPERATION_STATUS.SUCCEEDED) {
        reasons.push("representative rehearsal/drill did not succeed");
      } else if (!isFresh(drill, policy.layer2MaxAgeMs ?? LAYER_2_MAX_AGE_MS_DEFAULT, now)) {
        reasons.push("representative rehearsal/drill evidence is stale");
      } else {
        reliedOn.drillRunId = drill.runId ?? null;
      }
    }
  }

  if (requireValidation) {
    if (!input.validationEvidence) {
      reasons.push("missing recovered-state validation evidence");
    } else if (isMalformedAttempt(input.validationEvidence)) {
      reasons.push("latest validation evidence is malformed/unverifiable");
    } else {
      const validation = /** @type {any} */ (input.validationEvidence);
      if (
        validation.status === OPERATION_STATUS.FAILED ||
        validation.status === OPERATION_STATUS.BLOCKED ||
        validation.status === OPERATION_STATUS.RUNNING ||
        validation.incomplete === true
      ) {
        reasons.push(`latest validation attempt is ${validation.status ?? "incomplete"}`);
      } else {
        const codes = new Set(
          (Array.isArray(validation.validationResults) ? validation.validationResults : [])
            .map((entry) => (entry && typeof entry === "object" ? String(entry.code ?? "") : ""))
            .filter(Boolean),
        );
        if (validation.status !== OPERATION_STATUS.SUCCEEDED || !codes.has("BUSINESS_INTEGRITY_VALIDATED")) {
          reasons.push("validation evidence missing BUSINESS_INTEGRITY_VALIDATED success");
        } else {
          reliedOn.validationRunId = validation.runId ?? null;
        }
      }
    }
  }

  const result = reasons.length === 0 ? READINESS_LEVEL.READY : "BLOCKED";
  return {
    result: result === READINESS_LEVEL.READY ? "READY" : "BLOCKED",
    reasons,
    reliedOn,
    restoreAsRoutineRollback: RESTORE_AS_ROUTINE_ROLLBACK,
    note:
      result === READINESS_LEVEL.READY
        ? "High-risk migration recovery readiness READY based on qualifying evidence"
        : "High-risk migration recovery readiness BLOCKED; restore is not routine rollback",
  };
}

/**
 * Select the latest attempt per evidence class WITHOUT prefiltering to successes.
 *
 * @param {unknown[]} records
 * @param {{ invalid?: { runId?: string, reason?: string }[] }} [options]
 * @returns {{ layer1: any, layer2: any, drill: any, validation: any }}
 */
export function selectLatestAttemptEvidence(records, options = {}) {
  const list = Array.isArray(records) ? records : [];
  const invalid = Array.isArray(options.invalid) ? options.invalid : [];

  /** @type {any[]} */
  const layer1Candidates = [];
  /** @type {any[]} */
  const layer2Candidates = [];
  /** @type {any[]} */
  const drillCandidates = [];
  /** @type {any[]} */
  const validationCandidates = [];

  for (const record of list) {
    const evidence = /** @type {any} */ (record);
    if (!evidence || typeof evidence !== "object") continue;

    if (evidence.recoveryLayer === RECOVERY_LAYER.LAYER_1) {
      layer1Candidates.push(evidence);
    }
    if (
      evidence.recoveryLayer === RECOVERY_LAYER.LAYER_2 &&
      evidence.operationType === OPERATION_TYPE.LAYER2_LOGICAL_BACKUP
    ) {
      layer2Candidates.push(evidence);
    }
    if (evidence.operationType === OPERATION_TYPE.PORTABILITY_REHEARSAL) {
      drillCandidates.push(evidence);
      validationCandidates.push(evidence);
    }
    const codes = new Set(
      (Array.isArray(evidence.validationResults) ? evidence.validationResults : [])
        .map((entry) => (entry && typeof entry === "object" ? String(entry.code ?? "") : ""))
        .filter(Boolean),
    );
    if (codes.has("BUSINESS_INTEGRITY_VALIDATED")) {
      validationCandidates.push(evidence);
    }
  }

  for (const entry of invalid) {
    const malformed = {
      runId: entry.runId ?? null,
      status: "UNVERIFIABLE",
      incomplete: true,
      failureBlockReason: entry.reason ?? "malformed evidence",
      __malformed: true,
      endedAt: null,
      startedAt: null,
    };
    // Unclassifiable malformed evidence blocks every class as a conservative fail-closed default
    // when it is newer than the current class selection (by RUN_ID timestamp when available).
    layer1Candidates.push(malformed);
    layer2Candidates.push(malformed);
    drillCandidates.push(malformed);
    validationCandidates.push(malformed);
  }

  return {
    layer1: latestOf(layer1Candidates),
    layer2: latestOf(layer2Candidates),
    drill: latestOf(drillCandidates),
    validation: latestOf(validationCandidates),
  };
}

function evaluateLatestLayerAttempt({ evidence, layer, label, maxAgeMs, now, rpoTargetMs, reasons, onReady }) {
  if (!evidence) {
    reasons.push(
      layer === RECOVERY_LAYER.LAYER_2
        ? "missing Layer 2 COMPLETE evidence"
        : `missing ${label} health / recovery-point evidence`,
    );
    return;
  }
  if (isMalformedAttempt(evidence)) {
    reasons.push(`latest ${label} evidence is malformed/unverifiable`);
    return;
  }
  const record = /** @type {any} */ (evidence);
  if (
    record.status === OPERATION_STATUS.FAILED ||
    record.status === OPERATION_STATUS.BLOCKED ||
    record.status === OPERATION_STATUS.RUNNING ||
    record.incomplete === true
  ) {
    reasons.push(`latest ${label} attempt is ${record.status ?? "incomplete"}`);
    return;
  }
  const proof = evaluateQualifyingRecoveryProof(record, { layer });
  if (!proof.ok) {
    reasons.push(`${label} evidence not qualifying: ${proof.reason}`);
    return;
  }
  if (!isFresh(record, maxAgeMs, now)) {
    reasons.push(`${label} evidence is stale relative to freshness policy`);
    return;
  }
  if (layer === RECOVERY_LAYER.LAYER_1 && rpoTargetMs != null) {
    const rpo = evaluateRecoveryPointFreshness(record.recoveryPoint, rpoTargetMs, now);
    if (!rpo.ok) {
      reasons.push(`${label} recovery point violates RPO freshness: ${rpo.reason}`);
      return;
    }
  }
  onReady(record.runId ?? null);
}

/**
 * @param {unknown} recoveryPoint
 * @param {number} maxAgeMs
 * @param {Date} now
 */
export { evaluateRecoveryPointFreshness } from "../freshness.mjs";

function isMalformedAttempt(evidence) {
  return Boolean(evidence && typeof evidence === "object" && /** @type {any} */ (evidence).__malformed === true);
}

function latestOf(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  return [...candidates].sort(compareRecency).at(-1) ?? null;
}

function resolveNow(value) {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed);
  }
  return new Date();
}

function isFresh(evidence, maxAgeMs, now) {
  if (typeof maxAgeMs !== "number" || !Number.isFinite(maxAgeMs) || maxAgeMs < 0) return false;
  const endedAt = /** @type {any} */ (evidence).endedAt ?? /** @type {any} */ (evidence).startedAt;
  const ts = Date.parse(String(endedAt ?? ""));
  if (!Number.isFinite(ts)) return false;
  return now.getTime() - ts <= maxAgeMs;
}

function compareRecency(a, b) {
  const aTime = timestampOf(a);
  const bTime = timestampOf(b);
  if (aTime !== bTime) return aTime - bTime;
  return String(a?.runId ?? "").localeCompare(String(b?.runId ?? ""));
}

function timestampOf(record) {
  const iso = Date.parse(String(record?.endedAt ?? record?.startedAt ?? ""));
  if (Number.isFinite(iso)) return iso;
  try {
    if (typeof record?.runId === "string") return runIdInstant(record.runId).getTime();
  } catch {
    // ignore
  }
  return 0;
}
