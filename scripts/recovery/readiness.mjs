/**
 * Evidence-based Layer 1 / Layer 2 readiness evaluation.
 * Configuration, credentials, buckets, or timers alone are never success.
 * Policy (freshness) is explicit input; missing policy does not invent overdue semantics.
 */
import { OPERATION_STATUS, READINESS_LEVEL, RECOVERY_LAYER, REQUIRED_RECOVERY_LAYERS } from "./constants.mjs";
import { isSuccessfulLayerEvidence, validateEvidence } from "./evidence.mjs";
import { runIdInstant } from "./run-id.mjs";

/**
 * @typedef {object} ReadinessPolicy
 * @property {string[]} [requiredLayers]
 * @property {number} [layer1MaxAgeMs]
 * @property {number} [layer2MaxAgeMs]
 * @property {string | Date} [now]
 */

/**
 * @param {object} input
 * @param {unknown[]} [input.evidenceRecords]
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
  const validRecords = [];
  const malformed = [];
  for (const record of records) {
    const parsed = validateEvidence(record);
    if (parsed.ok) validRecords.push(parsed.evidence);
    else malformed.push(parsed.reason);
  }

  const layerResults = {};
  for (const layer of requiredLayers) {
    layerResults[layer] = evaluateLayer(layer, validRecords, policy, now);
  }

  const findings = validRecords.flatMap((record) => record.findings ?? []);
  const latestAttempt = latestRecord(validRecords);
  const anyRequiredNotReady = requiredLayers.some((layer) => layerResults[layer].readiness !== READINESS_LEVEL.READY);
  const overall = anyRequiredNotReady || validRecords.length === 0 ? READINESS_LEVEL.NOT_READY : READINESS_LEVEL.READY;

  return {
    overall,
    layers: layerResults,
    latestAttempt: latestAttempt
      ? {
          runId: latestAttempt.runId,
          status: latestAttempt.status,
          recoveryLayer: latestAttempt.recoveryLayer,
          incomplete: latestAttempt.incomplete === true,
          failureBlockReason: latestAttempt.failureBlockReason ?? null,
        }
      : null,
    findings,
    malformedCount: malformed.length,
    configurationOnly:
      Boolean(input.configurationPresent || input.credentialsPresent || input.bucketPresent || input.timerPresent) &&
      validRecords.length === 0,
    note:
      validRecords.length === 0
        ? "No valid recovery evidence; configuration, credentials, buckets, or timers are not success"
        : anyRequiredNotReady
          ? "One or more required recovery layers lack valid successful evidence"
          : "Required layers have valid successful evidence",
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
  if (!isSuccessfulLayerEvidence(latest)) {
    return {
      layer,
      readiness: READINESS_LEVEL.NOT_READY,
      reason: "latest evidence is not a successful recoverable result",
      latestStatus: latest.status,
      runId: latest.runId,
      overdue: false,
    };
  }
  const maxAgeMs = layer === RECOVERY_LAYER.LAYER_1 ? policy.layer1MaxAgeMs : policy.layer2MaxAgeMs;
  if (typeof maxAgeMs === "number" && maxAgeMs >= 0) {
    const ageMs = now.getTime() - Date.parse(latest.endedAt ?? latest.startedAt);
    if (Number.isFinite(ageMs) && ageMs > maxAgeMs) {
      return {
        layer,
        readiness: READINESS_LEVEL.NOT_READY,
        reason: "successful evidence is overdue relative to supplied policy",
        latestStatus: latest.status,
        runId: latest.runId,
        overdue: true,
      };
    }
  }
  return {
    layer,
    readiness: READINESS_LEVEL.READY,
    reason: "valid successful evidence",
    latestStatus: latest.status,
    runId: latest.runId,
    overdue: false,
  };
}

function recordAppliesToLayer(record, layer) {
  if (record.recoveryLayer === layer || record.recoveryLayer === "BOTH") return true;
  return false;
}

function latestRecord(records) {
  if (records.length === 0) return null;
  return [...records].sort((a, b) => compareEvidenceRecency(a, b)).at(-1) ?? null;
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
