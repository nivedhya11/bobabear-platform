/**
 * Staging baseline decision helpers (pure; no database access).
 * Used by staging.mjs and unit tests.
 */

export const STAGING_BASELINE_STATES = Object.freeze([
  "FRESH_EMPTY",
  "COMPLETE_COMPATIBLE",
  "PARTIAL_OR_INCOMPATIBLE",
]);

export const STAGING_BOOTSTRAP_ACTIONS = Object.freeze(["APPLY", "PRESERVE", "BLOCK"]);

/**
 * @param {string} state
 * @returns {"APPLY"|"PRESERVE"|"BLOCK"}
 */
export function resolveStagingBootstrapAction(state) {
  if (state === "FRESH_EMPTY") return "APPLY";
  if (state === "COMPLETE_COMPATIBLE") return "PRESERVE";
  if (state === "PARTIAL_OR_INCOMPATIBLE") return "BLOCK";
  throw new Error(`Unknown staging baseline state: ${state}`);
}

/**
 * Parse classifier stdout for the authoritative baseline state marker.
 * @param {string} output
 * @returns {"FRESH_EMPTY"|"COMPLETE_COMPATIBLE"|"PARTIAL_OR_INCOMPATIBLE"}
 */
export function parseStagingBaselineState(output) {
  const match = String(output).match(/^STAGING_BASELINE_STATE\s+(FRESH_EMPTY|COMPLETE_COMPATIBLE|PARTIAL_OR_INCOMPATIBLE)\s*$/m);
  if (!match) {
    throw new Error("Staging baseline classify did not emit STAGING_BASELINE_STATE.");
  }
  return match[1];
}

/**
 * @param {string} state
 * @returns {string[]}
 */
export function stagingBaselineDecisionLogLines(state) {
  const action = resolveStagingBootstrapAction(state);
  const lines = [
    `STAGING_BASELINE_STATE ${state}`,
    `STAGING_BOOTSTRAP_ACTION ${action}`,
  ];
  if (action === "PRESERVE") {
    lines.push("STAGING_PERSISTENT_BUSINESS_STATE_PRESERVED YES");
  }
  return lines;
}
