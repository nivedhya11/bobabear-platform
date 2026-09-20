/**
 * High-risk migration recovery-readiness gate (IMP-037 §15).
 * Evaluates evidence only. Default on missing evidence: BLOCKED.
 * Restore is never recommended as routine rollback.
 */
import { evaluateQualifyingRecoveryProof } from "../evidence.mjs";
import {
  LAYER_1_MAX_AGE_MS_DEFAULT,
  LAYER_2_MAX_AGE_MS_DEFAULT,
  READINESS_LEVEL,
  RECOVERY_LAYER,
} from "../constants.mjs";

export const RESTORE_AS_ROUTINE_ROLLBACK = false;

/**
 * @param {object} input
 * @param {unknown} [input.layer1Evidence]
 * @param {unknown} [input.layer2Evidence]
 * @param {unknown} [input.drillEvidence]
 * @param {unknown} [input.validationEvidence]
 * @param {{ requireDrill?: boolean, requireValidation?: boolean, now?: Date|string, layer1MaxAgeMs?: number, layer2MaxAgeMs?: number }} [input.policy]
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

  const layer1 = input.layer1Evidence;
  const layer2 = input.layer2Evidence;
  if (!layer1) {
    reasons.push("missing Layer 1 health / recovery-point evidence");
  } else {
    const proof = evaluateQualifyingRecoveryProof(layer1, { layer: RECOVERY_LAYER.LAYER_1 });
    if (!proof.ok) {
      reasons.push(`Layer 1 evidence not qualifying: ${proof.reason}`);
    } else if (!isFresh(layer1, policy.layer1MaxAgeMs ?? LAYER_1_MAX_AGE_MS_DEFAULT, now)) {
      reasons.push("Layer 1 evidence is stale relative to freshness policy");
    } else {
      reliedOn.layer1RunId = /** @type {any} */ (layer1).runId ?? null;
    }
  }

  if (!layer2) {
    reasons.push("missing Layer 2 COMPLETE evidence");
  } else {
    const proof = evaluateQualifyingRecoveryProof(layer2, { layer: RECOVERY_LAYER.LAYER_2 });
    if (!proof.ok) {
      reasons.push(`Layer 2 evidence not qualifying: ${proof.reason}`);
    } else if (!isFresh(layer2, policy.layer2MaxAgeMs ?? LAYER_2_MAX_AGE_MS_DEFAULT, now)) {
      reasons.push("Layer 2 evidence is stale relative to freshness policy");
    } else {
      reliedOn.layer2RunId = /** @type {any} */ (layer2).runId ?? null;
    }
  }

  const requireDrill = policy.requireDrill !== false;
  const requireValidation = policy.requireValidation !== false;

  if (requireDrill) {
    if (!input.drillEvidence) {
      reasons.push("missing representative rehearsal/drill evidence");
    } else {
      const drill = /** @type {any} */ (input.drillEvidence);
      if (drill.status !== "SUCCEEDED" || drill.incomplete === true) {
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
    } else {
      const validation = /** @type {any} */ (input.validationEvidence);
      const codes = new Set(
        (Array.isArray(validation.validationResults) ? validation.validationResults : [])
          .map((entry) => (entry && typeof entry === "object" ? String(entry.code ?? "") : ""))
          .filter(Boolean),
      );
      if (validation.status !== "SUCCEEDED" || !codes.has("BUSINESS_INTEGRITY_VALIDATED")) {
        reasons.push("validation evidence missing BUSINESS_INTEGRITY_VALIDATED success");
      } else {
        reliedOn.validationRunId = validation.runId ?? null;
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
