/**
 * Evidence-based Layer 1 / Layer 2 readiness evaluation.
 * Configuration, credentials, buckets, or timers alone are never success.
 *
 * Schema-valid SUCCEEDED evidence alone is never READY.
 * RECOVERY READY requires qualifying layer-specific recovery proof plus freshness policy.
 *
 * Freshness:
 * - Layer 2 uses the locked daily default when an explicit max-age is omitted.
 * - Layer 1 uses the locked 36-hour health-age default when an explicit max-age is omitted.
 * Missing freshness policy never silently means infinite age.
 */
import {
  LAYER_1_MAX_AGE_MS_DEFAULT,
  LAYER_2_MAX_AGE_MS_DEFAULT,
  OPERATION_STATUS,
  READINESS_LEVEL,
  RECOVERY_LAYER,
  REQUIRED_RECOVERY_LAYERS,
  RPO_TARGET_MS_DEFAULT,
} from "./constants.mjs";
import { evaluateQualifyingRecoveryProof, validateEvidence } from "./evidence.mjs";
import { evaluateRecoveryPointFreshness } from "./freshness.mjs";
import { runIdInstant } from "./run-id.mjs";

/**
 * @typedef {object} ReadinessPolicy
 * @property {string[]} [requiredLayers]
 * @property {number} [layer1MaxAgeMs]
 * @property {number} [layer2MaxAgeMs]
 * @property {number} [rpoTargetMs]
 * @property {string | Date} [now]
 * @property {(evidence: import("./evidence.mjs").RecoveryEvidence, layer: string) => { ok: boolean, reason?: string } | boolean} [qualifyProof]
 */

/**
 * @param {object} input
 * @param {unknown[]} [input.evidenceRecords]
 * @param {{ runId?: string, reason?: string }[]} [input.invalidEvidence]
 * @param {ReadinessPolicy} [input.policy]
 * @param {boolean} [input.configurationPresent]
 * @param {boolean} [input.credentialsPresent]
 * @param {boolean} [input.bucketPresent]
 * @param {boolean} [input.timerPresent]
 */
export function evaluateReadiness(input = {}) {
  const policy = input.policy ?? {};
  const requiredLayers = policy.requiredLayers ?? [...REQUIRED_RECOVERY_LAYERS];
  const now = resolveNow(policy.now);
  const records = Array.isArray(input.evidenceRecords) ? input.evidenceRecords : [];
  const invalidEvidence = Array.isArray(input.invalidEvidence) ? input.invalidEvidence : [];
  const validRecords = [];
  const malformed = [];
  for (const record of records) {
    const parsed = validateEvidence(record);
    if (parsed.ok) validRecords.push(parsed.evidence);
    else malformed.push({ runId: typeof record?.runId === "string" ? record.runId : null, reason: parsed.reason });
  }
  for (const entry of invalidEvidence) {
    malformed.push({
      runId: typeof entry?.runId === "string" ? entry.runId : null,
      reason: typeof entry?.reason === "string" ? entry.reason : "unreadable evidence",
    });
  }

  const layerResults = {};
  for (const layer of requiredLayers) {
    layerResults[layer] = evaluateLayer(layer, validRecords, policy, now);
  }

  const findings = validRecords.flatMap((record) => record.findings ?? []);
  const latestAttempt = latestAttemptFrom(validRecords, malformed);
  const unverifiable = malformed.length > 0;
  const anyRequiredNotReady = requiredLayers.some((layer) => layerResults[layer].readiness !== READINESS_LEVEL.READY);
  const overall =
    unverifiable || anyRequiredNotReady || validRecords.length === 0 ? READINESS_LEVEL.NOT_READY : READINESS_LEVEL.READY;

  return {
    overall,
    layers: layerResults,
    latestAttempt,
    findings,
    malformedCount: malformed.length,
    unverifiableEvidence: malformed,
    configurationOnly:
      Boolean(input.configurationPresent || input.credentialsPresent || input.bucketPresent || input.timerPresent) &&
      validRecords.length === 0 &&
      malformed.length === 0,
    note:
      unverifiable
        ? "Unverifiable or malformed evidence is present and blocks readiness"
        : validRecords.length === 0
          ? "No valid recovery evidence; configuration, credentials, buckets, or timers are not success"
          : anyRequiredNotReady
            ? "One or more required recovery layers lack qualifying recovery proof (schema-valid SUCCEEDED alone is insufficient)"
            : "Required layers have qualifying recovery proof",
  };
}

function evaluateLayer(layer, records, policy, now) {
  const layerRecords = records.filter((record) => recordAppliesToLayer(record, layer));
  const latest = latestRecord(layerRecords);
  if (!latest) {
    return {
      layer,
      readiness: READINESS_LEVEL.NOT_READY,
      reason: "no valid evidence",
      latestStatus: null,
      runId: null,
      overdue: false,
    };
  }
  if (latest.status === OPERATION_STATUS.FAILED || latest.status === OPERATION_STATUS.BLOCKED) {
    return {
      layer,
      readiness: READINESS_LEVEL.NOT_READY,
      reason: "latest attempt is not successful",
      latestStatus: latest.status,
      runId: latest.runId,
      failureBlockReason: latest.failureBlockReason ?? null,
      overdue: false,
    };
  }
  if (latest.incomplete === true || latest.status === OPERATION_STATUS.RUNNING) {
    return {
      layer,
      readiness: READINESS_LEVEL.NOT_READY,
      reason: "interrupted or incomplete evidence is not success",
      latestStatus: latest.status,
      runId: latest.runId,
      overdue: false,
    };
  }

  const qualification = evaluateQualifyingRecoveryProof(latest, {
    layer,
    qualifyProof: policy.qualifyProof,
  });
  if (!qualification.ok) {
    return {
      layer,
      readiness: READINESS_LEVEL.NOT_READY,
      reason: qualification.reason,
      latestStatus: latest.status,
      runId: latest.runId,
      overdue: false,
    };
  }

  const maxAgeMs = resolveMaxAgeMs(layer, policy);
  if (maxAgeMs == null) {
    return {
      layer,
      readiness: READINESS_LEVEL.NOT_READY,
      reason:
        layer === RECOVERY_LAYER.LAYER_1
          ? "qualifying Layer 1 freshness/health proof unavailable"
          : "required freshness policy unavailable; layer cannot be READY",
      latestStatus: latest.status,
      runId: latest.runId,
      overdue: false,
    };
  }

  const ageMs = now.getTime() - Date.parse(latest.endedAt ?? latest.startedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return {
      layer,
      readiness: READINESS_LEVEL.NOT_READY,
      reason: "required freshness policy unavailable; evidence age is unverifiable",
      latestStatus: latest.status,
      runId: latest.runId,
      overdue: false,
    };
  }
  if (ageMs > maxAgeMs) {
    return {
      layer,
      readiness: READINESS_LEVEL.NOT_READY,
      reason: "successful evidence is overdue relative to freshness policy",
      latestStatus: latest.status,
      runId: latest.runId,
      overdue: true,
    };
  }

  if (layer === RECOVERY_LAYER.LAYER_1) {
    const rpoTargetMs =
      typeof policy.rpoTargetMs === "number" && Number.isFinite(policy.rpoTargetMs) && policy.rpoTargetMs >= 0
        ? policy.rpoTargetMs
        : RPO_TARGET_MS_DEFAULT;
    const rpo = evaluateRecoveryPointFreshness(latest.recoveryPoint, rpoTargetMs, now);
    if (!rpo.ok) {
      return {
        layer,
        readiness: READINESS_LEVEL.NOT_READY,
        reason: `Layer 1 recovery point violates RPO freshness: ${rpo.reason}`,
        latestStatus: latest.status,
        runId: latest.runId,
        overdue: true,
      };
    }
  }

  return {
    layer,
    readiness: READINESS_LEVEL.READY,
    reason: "qualifying recovery proof within freshness policy",
    latestStatus: latest.status,
    runId: latest.runId,
    overdue: false,
  };
}

/**
 * @param {string} layer
 * @param {ReadinessPolicy} policy
 * @returns {number | null}
 */
function resolveMaxAgeMs(layer, policy) {
  if (layer === RECOVERY_LAYER.LAYER_1) {
    const explicit = policy.layer1MaxAgeMs;
    if (typeof explicit === "number" && Number.isFinite(explicit) && explicit >= 0) return explicit;
    return LAYER_1_MAX_AGE_MS_DEFAULT;
  }
  if (layer === RECOVERY_LAYER.LAYER_2) {
    const explicit = policy.layer2MaxAgeMs;
    if (typeof explicit === "number" && Number.isFinite(explicit) && explicit >= 0) return explicit;
    // Locked product requirement: independent logical backup at least daily.
    return LAYER_2_MAX_AGE_MS_DEFAULT;
  }
  return null;
}

function recordAppliesToLayer(record, layer) {
  if (record.recoveryLayer === layer || record.recoveryLayer === "BOTH") return true;
  return false;
}

function latestRecord(records) {
  if (records.length === 0) return null;
  return [...records].sort((a, b) => compareEvidenceRecency(a, b)).at(-1) ?? null;
}

function latestAttemptFrom(validRecords, malformed) {
  /** @type {{ runId: string | null, status: string, recoveryLayer?: string, incomplete?: boolean, failureBlockReason?: string | null, recency: number }[]} */
  const candidates = [];
  for (const record of validRecords) {
    candidates.push({
      runId: record.runId,
      status: record.status,
      recoveryLayer: record.recoveryLayer,
      incomplete: record.incomplete === true,
      failureBlockReason: record.failureBlockReason ?? null,
      recency: timestampOf(record),
    });
  }
  for (const entry of malformed) {
    candidates.push({
      runId: entry.runId,
      status: "UNVERIFIABLE",
      failureBlockReason: entry.reason,
      recency: entry.runId ? timestampOf({ runId: entry.runId }) : 0,
    });
  }
  if (candidates.length === 0) return null;
  const latest = candidates.sort((a, b) => {
    if (a.recency !== b.recency) return a.recency - b.recency;
    return String(a.runId ?? "").localeCompare(String(b.runId ?? ""));
  }).at(-1);
  if (!latest) return null;
  return {
    runId: latest.runId,
    status: latest.status,
    recoveryLayer: latest.recoveryLayer ?? null,
    incomplete: latest.incomplete === true,
    failureBlockReason: latest.failureBlockReason ?? null,
  };
}

function compareEvidenceRecency(a, b) {
  const aTime = timestampOf(a);
  const bTime = timestampOf(b);
  if (aTime !== bTime) return aTime - bTime;
  return a.runId.localeCompare(b.runId);
}

function timestampOf(record) {
  const iso = Date.parse(record.endedAt ?? record.startedAt);
  if (Number.isFinite(iso)) return iso;
  try {
    return runIdInstant(record.runId).getTime();
  } catch {
    return 0;
  }
}

function resolveNow(value) {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed);
  }
  return new Date();
}
