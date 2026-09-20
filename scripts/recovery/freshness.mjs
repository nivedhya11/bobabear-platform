/**
 * Freshness helpers for IMP-037 readiness / high-risk gate.
 */
import { RPO_TARGET_MS_DEFAULT } from "./constants.mjs";

/**
 * @param {unknown} recoveryPoint
 * @param {number} [maxAgeMs]
 * @param {Date} [now]
 * @returns {{ ok: boolean, reason: string }}
 */
export function evaluateRecoveryPointFreshness(
  recoveryPoint,
  maxAgeMs = RPO_TARGET_MS_DEFAULT,
  now = new Date(),
) {
  if (typeof recoveryPoint !== "string" || !recoveryPoint.trim()) {
    return { ok: false, reason: "recovery point missing" };
  }
  const trimmed = recoveryPoint.trim();
  const ts = Date.parse(trimmed);
  if (!Number.isFinite(ts) && /^[0-9A-Fa-f]+\/[0-9A-Fa-f]+$/.test(trimmed)) {
    return { ok: false, reason: "LSN recovery point cannot prove wall-clock RPO freshness" };
  }
  if (!Number.isFinite(ts)) {
    return { ok: false, reason: "recovery point is not a parseable timestamp" };
  }
  if (typeof maxAgeMs !== "number" || !Number.isFinite(maxAgeMs) || maxAgeMs < 0) {
    return { ok: false, reason: "RPO freshness policy unavailable" };
  }
  if (now.getTime() - ts > maxAgeMs) {
    return { ok: false, reason: `recovery point older than RPO target (${maxAgeMs}ms)` };
  }
  return { ok: true, reason: "recovery point within RPO" };
}
